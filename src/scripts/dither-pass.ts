/**
 * One renderer for the site's block-dither effects.
 *
 * The aura, the calendar mosaic and the hero outline all compute the same
 * thing: quantise a source to a grid, threshold it against an ordered dither
 * matrix, emit coloured blocks. That is a fragment shader's day job, so this
 * module owns the boilerplate — context, fullscreen triangle, Bayer table,
 * uniform plumbing — and each effect supplies only its density function.
 *
 * createDitherPass returns null when WebGL2 is unavailable. Callers are
 * expected to keep their CPU path for that case rather than fail.
 */

/** The 4x4 ordered dither matrix shared by every effect on the site. */
export const BAYER_4X4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Threshold for a pixel, matching the GLSL `ditherThreshold` helper below. */
export function ditherThreshold(x: number, y: number) {
  return (BAYER_4X4[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
}

export type Uniforms = Record<
  string,
  | number
  | readonly number[]
  | { texture: TexSource; unit: number; mipmap?: boolean }
>;
type TexSource = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement;

export type DitherPass = {
  /** Render one frame. Uniform names must match those declared in `fragment`. */
  draw(uniforms: Uniforms): void;
  /** Resize the drawing buffer; a no-op when the size is unchanged. */
  resize(width: number, height: number): void;
  dispose(): void;
};

const PRELUDE = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 frag;
uniform vec2 resolution;
const float bayer[16] = float[16](
  0.,8.,2.,10., 12.,4.,14.,6., 3.,11.,1.,9., 15.,7.,13.,5.);
float ditherThreshold(vec2 pixel) {
  ivec2 p = ivec2(mod(pixel, 4.0));
  return (bayer[p.y * 4 + p.x] + 0.5) / 16.0;
}
`;

const VERTEX = `#version 300 es
in vec2 position;
out vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`dither-pass shader: ${log}`);
  }
  return shader;
}

export function createDitherPass(
  canvas: HTMLCanvasElement,
  fragment: string,
): DitherPass | null {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
  } catch {
    return null;
  }
  if (!gl) return null;
  const ctx = gl;

  let program: WebGLProgram;
  try {
    program = ctx.createProgram()!;
    ctx.attachShader(program, compile(ctx, ctx.VERTEX_SHADER, VERTEX));
    ctx.attachShader(
      program,
      compile(ctx, ctx.FRAGMENT_SHADER, PRELUDE + fragment),
    );
    ctx.linkProgram(program);
    if (!ctx.getProgramParameter(program, ctx.LINK_STATUS))
      throw new Error(ctx.getProgramInfoLog(program) || "link failed");
  } catch (error) {
    console.warn(error);
    return null;
  }
  ctx.useProgram(program);

  // A single oversized triangle covers the viewport with no vertex overdraw.
  const buffer = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
  ctx.bufferData(
    ctx.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    ctx.STATIC_DRAW,
  );
  const position = ctx.getAttribLocation(program, "position");
  ctx.enableVertexAttribArray(position);
  ctx.vertexAttribPointer(position, 2, ctx.FLOAT, false, 0, 0);

  ctx.enable(ctx.BLEND);
  ctx.blendFunc(ctx.ONE, ctx.ONE_MINUS_SRC_ALPHA);

  const locations = new Map<string, WebGLUniformLocation | null>();
  const location = (name: string) => {
    if (!locations.has(name))
      locations.set(name, ctx.getUniformLocation(program, name));
    return locations.get(name)!;
  };

  const textures = new Map<number, WebGLTexture>();
  function upload(unit: number, source: TexSource, mipmap = false) {
    let texture = textures.get(unit);
    if (!texture) {
      texture = ctx.createTexture()!;
      textures.set(unit, texture);
      ctx.activeTexture(ctx.TEXTURE0 + unit);
      ctx.bindTexture(ctx.TEXTURE_2D, texture);
      ctx.texParameteri(
        ctx.TEXTURE_2D,
        ctx.TEXTURE_MIN_FILTER,
        mipmap ? ctx.LINEAR_MIPMAP_LINEAR : ctx.LINEAR,
      );
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    } else {
      ctx.activeTexture(ctx.TEXTURE0 + unit);
      ctx.bindTexture(ctx.TEXTURE_2D, texture);
    }
    // The video path never round-trips through the CPU: the frame goes
    // straight from the decoder to a texture.
    ctx.texImage2D(
      ctx.TEXTURE_2D,
      0,
      ctx.RGBA,
      ctx.RGBA,
      ctx.UNSIGNED_BYTE,
      source,
    );
    // Sampling a full-resolution video at grid centres would point-sample and
    // shimmer. Mipmaps let the shader read an averaged level instead, which is
    // what a CPU downscale produced.
    if (mipmap) ctx.generateMipmap(ctx.TEXTURE_2D);
  }

  let lost = false;
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
  });

  return {
    resize(width, height) {
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
    },
    draw(uniforms) {
      if (lost || !canvas.width || !canvas.height) return;
      ctx.useProgram(program);
      ctx.viewport(0, 0, canvas.width, canvas.height);
      ctx.uniform2f(location("resolution"), canvas.width, canvas.height);
      for (const [name, value] of Object.entries(uniforms)) {
        if (typeof value === "number") ctx.uniform1f(location(name), value);
        else if (Array.isArray(value)) {
          if (value.length === 2)
            ctx.uniform2f(location(name), value[0], value[1]);
          else if (value.length === 3)
            ctx.uniform3f(location(name), value[0], value[1], value[2]);
          else if (value.length === 4)
            ctx.uniform4f(
              location(name),
              value[0],
              value[1],
              value[2],
              value[3],
            );
        } else if (value && typeof value === "object" && "texture" in value) {
          upload(value.unit, value.texture, value.mipmap);
          ctx.uniform1i(location(name), value.unit);
        }
      }
      ctx.clearColor(0, 0, 0, 0);
      ctx.clear(ctx.COLOR_BUFFER_BIT);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    },
    dispose() {
      textures.forEach((texture) => ctx.deleteTexture(texture));
      textures.clear();
      ctx.deleteBuffer(buffer);
      ctx.deleteProgram(program);
      ctx.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
