import { token } from "../design/tokens";
import { drawEnvironment } from "./calendar-environment";
import { createDitherPass } from "./dither-pass";
// Adapted from the user's mole-hero-assets live colored-block preview.
// Keep video and processing local; no generation service or runtime dependency.
export function initCalendarMole(root: HTMLElement, initiallyPaused: boolean) {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-calendar-art]")!;
  const video = root.querySelector<HTMLVideoElement>("[data-calendar-video]")!;
  // Foreground mosaic uses brand greens/yellows; blue is reserved for sky.
  const colors = [
    token("color-accent"),
    token("color-accent"),
    token("color-pixel-lime"),
    token("color-heading"),
    token("color-dark"),
    token("color-inverse"),
  ];
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

  // The silhouettes are vector paths, so they stay on a 2D surface — but it is
  // a grid-sized one (roughly 90x72), which costs ~0.03ms. What used to be
  // expensive was scaling the full 1284x716 video down on the CPU and reading
  // the result back with getImageData. The shader samples both surfaces
  // directly instead, so neither the video frame nor the grid crosses to JS.
  const scenery = document.createElement("canvas");
  const sceneryCtx = scenery.getContext("2d")!;

  const pass = createDitherPass(
    canvas,
    `uniform sampler2D video;
     uniform sampler2D scenery;
     uniform vec2 grid;
     uniform vec4 videoRect;  // x, y, w, h of the video inside the canvas, 0-1
     uniform float videoLod;  // mip level matching the old CPU downscale
     uniform float gap;       // gap between blocks, in canvas pixels
     uniform vec3 palette[6];

     // Bit-for-bit the same hash the CPU path used, so every cell keeps the
     // colour it had. Math.imul is a 32-bit wrapping multiply, which is what
     // uint arithmetic does here.
     uint hashCell(uint x, uint y) {
       uint n = ((x + 71u) * 374761393u) ^ ((y + 113u) * 668265263u);
       n = (n ^ (n >> 13u)) * 1274126177u;
       return n ^ (n >> 16u);
     }

     void main() {
       vec2 n = vec2(uv.x, 1.0 - uv.y);        // css space, y down
       vec2 cell = floor(n * grid);
       vec2 cellUv = (cell + 0.5) / grid;
       float lum = texture(scenery, cellUv).r;
       // The video covers part of the canvas; multiply it over the scenery
       // exactly where it lands, leaving the silhouettes intact elsewhere.
       vec2 vUv = (cellUv - videoRect.xy) / videoRect.zw;
       if (all(greaterThanEqual(vUv, vec2(0.0))) &&
           all(lessThanEqual(vUv, vec2(1.0))))
         lum *= textureLod(video, vUv, videoLod).r;
       if (lum > 0.65) discard;
       // Carve the gap so the blocks read as separate tiles.
       vec2 cellPx = resolution / grid;
       vec2 inCell = fract(n * grid) * cellPx;
       if (any(lessThan(inCell, vec2(gap * 0.5))) ||
           any(greaterThan(inCell, cellPx - gap * 0.5))) discard;
       uint index = hashCell(uint(cell.x), uint(cell.y)) % 6u;
       vec3 color = palette[0];
       for (int i = 1; i < 6; i++)
         if (int(index) == i) color = palette[i];
       frag = vec4(color, 1.0);
     }`,
  );

  // Fallback surfaces, only created when WebGL2 is unavailable.
  const ctx = pass ? null : canvas.getContext("2d")!;
  const sample = pass ? null : document.createElement("canvas");
  const sampleCtx = pass
    ? null
    : sample!.getContext("2d", { willReadFrequently: true })!;

  let paused = initiallyPaused;
  let visible = false;
  let frame = 0;
  let lastTime = -1;
  let colorGrid: string[] = [];
  let cols = 0;
  let rows = 0;
  video.muted = true;

  function hash(x: number, y: number) {
    let n = Math.imul(x + 71, 374761393) ^ Math.imul(y + 113, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n ^ (n >>> 16)) >>> 0;
  }
  function geometry() {
    const scale = Math.min(
      canvas.width / video.videoWidth,
      canvas.height / video.videoHeight,
    );
    const w = video.videoWidth * scale;
    const h = video.videoHeight * scale;
    return {
      scale,
      w,
      h,
      x0: canvas.width - w,
      y0: (canvas.height - h) / 2,
      // One grid covers the entire environment; all silhouettes share its origin.
      cols: Math.ceil(canvas.width / (17.5 * scale)),
      rows: Math.ceil(canvas.height / (10 * scale)),
    };
  }
  function phase() {
    return (video.currentTime / (video.duration || 23.0417)) * Math.PI * 2;
  }
  function draw() {
    if (video.readyState < 2 || !canvas.width || !video.videoWidth) return;
    const g = geometry();
    if (pass) {
      if (scenery.width !== g.cols || scenery.height !== g.rows) {
        scenery.width = g.cols;
        scenery.height = g.rows;
      }
      sceneryCtx.fillStyle = "#fff";
      sceneryCtx.fillRect(0, 0, g.cols, g.rows);
      drawEnvironment(sceneryCtx, g.cols, g.rows, phase());
      // How many video texels fall in one grid cell decides the mip level.
      const cellsAcrossVideo = (g.w / canvas.width) * g.cols;
      pass.draw({
        video: { texture: video, unit: 0, mipmap: true },
        scenery: { texture: scenery, unit: 1 },
        grid: [g.cols, g.rows],
        videoRect: [
          g.x0 / canvas.width,
          g.y0 / canvas.height,
          g.w / canvas.width,
          g.h / canvas.height,
        ],
        videoLod: Math.max(
          0,
          Math.log2(video.videoWidth / Math.max(1, cellsAcrossVideo)),
        ),
        gap: 3 * g.scale,
        ...Object.fromEntries(
          colors.map((hex, i) => [`palette[${i}]`, rgb(hex)]),
        ),
      });
      return;
    }
    // ---- CPU fallback: unchanged from the original implementation ----
    cols = g.cols;
    rows = g.rows;
    if (sample!.width !== cols || sample!.height !== rows) {
      sample!.width = cols;
      sample!.height = rows;
      colorGrid = Array.from(
        { length: cols * rows },
        (_, i) => colors[hash(i % cols, Math.floor(i / cols)) % colors.length],
      );
    }
    sampleCtx!.fillStyle = "#fff";
    sampleCtx!.fillRect(0, 0, cols, rows);
    drawEnvironment(sampleCtx!, cols, rows, phase());
    // White video background leaves the environmental silhouettes intact.
    sampleCtx!.globalCompositeOperation = "multiply";
    sampleCtx!.drawImage(
      video,
      (g.x0 / canvas.width) * cols,
      (g.y0 / canvas.height) * rows,
      (g.w / canvas.width) * cols,
      (g.h / canvas.height) * rows,
    );
    sampleCtx!.globalCompositeOperation = "source-over";
    const pixels = sampleCtx!.getImageData(0, 0, cols, rows).data;
    const cw = canvas.width / cols,
      ch = canvas.height / rows,
      gap = 3 * g.scale;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0, i = 0; y < rows; y++)
      for (let x = 0; x < cols; x++, i++) {
        if (pixels[i * 4] > 255 * 0.65) continue;
        ctx!.fillStyle = colorGrid[i];
        ctx!.fillRect(
          x * cw + gap / 2,
          y * ch + gap / 2,
          Math.max(0.5, cw - gap),
          Math.max(0.5, ch - gap),
        );
      }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (pass) pass.resize(w, h);
    else {
      canvas.width = w;
      canvas.height = h;
    }
    draw();
  }
  function tick() {
    frame = 0;
    if (video.paused) return;
    if (video.currentTime !== lastTime) {
      draw();
      lastTime = video.currentTime;
    }
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    if (paused || !visible || document.hidden) {
      video.pause();
      cancelAnimationFrame(frame);
      frame = 0;
    } else {
      void video
        .play()
        .then(() => {
          if (paused || !visible || document.hidden) {
            video.pause();
            return;
          }
          if (!frame) frame = requestAnimationFrame(tick);
        })
        .catch(() => {
          draw();
        });
    }
  }
  video.addEventListener("loadeddata", () => {
    resize();
    sync();
  });
  video.addEventListener("seeked", draw);
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(canvas);
  document.addEventListener("visibilitychange", sync);
  resize();
  return (value: boolean) => {
    paused = value;
    sync();
  };
}
