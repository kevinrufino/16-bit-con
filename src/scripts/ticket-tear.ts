// One connected paper mesh follows a moving cylindrical fold.
// The pass component supplies its own self-hosted renderer import map.
const rendererPath = "pass-three";
const rendererModule = import(/* @vite-ignore */ rendererPath).catch(
  () => null,
);

export function tearTicket(
  stub: HTMLElement,
  card: HTMLElement,
  dialog: HTMLDialogElement,
  reduced: boolean,
  options: { preview?: boolean; initialPeel?: number } = {},
) {
  const paper = card.querySelector<HTMLElement>(".pass-paper")!;
  const source = stub.getBoundingClientRect(),
    bounds = paper.getBoundingClientRect();
  const dest = dialog.getBoundingClientRect(),
    seam = source.top - bounds.top;
  const preview = options.preview === true;
  const paperColor = preview
    ? getComputedStyle(card).getPropertyValue("--paper").trim()
    : getComputedStyle(dialog).getPropertyValue("--ticket-paper").trim();
  const paperMask = getComputedStyle(paper);
  const mask = {
    image: paperMask.maskImage,
    size: paperMask.maskSize,
    position: paperMask.maskPosition,
    repeat: paperMask.maskRepeat,
  };
  let frame = 0,
    done = false,
    renderer: any,
    geometry: any,
    material: any,
    texture: any;
  const canvas = document.createElement("canvas");
  canvas.className = "ticket-curl-surface";
  if (preview) canvas.classList.add("ticket-curl-preview");
  canvas.setAttribute("aria-hidden", "true");
  let resolve!: () => void;
  const finished = new Promise<void>((r) => (resolve = r));
  function cut() {
    if (preview) {
      // Masking removes the original ink and paper without removing its hit area.
      paper.style.maskImage = `linear-gradient(to bottom,#000 ${seam}px,transparent ${seam}px),${mask.image}`;
      paper.style.maskSize = `100% 100%,${mask.size}`;
      paper.style.maskPosition = `0 0,${mask.position}`;
      paper.style.maskRepeat = `no-repeat,${mask.repeat}`;
      paper.style.maskComposite = "intersect,add,add,add";
      return;
    }
    const edge = Array.from(
      { length: 41 },
      (_, i) => `${100 - i * 2.5}% ${seam + (i % 2 ? 2 : 0)}px`,
    ).join(",");
    paper.style.setProperty("--torn-outline", `polygon(0 0,100% 0,${edge})`);
    card.dataset.detached = "true";
  }
  function cleanup() {
    cancelAnimationFrame(frame);
    canvas.remove();
    geometry?.dispose();
    material?.dispose();
    texture?.dispose();
    renderer?.dispose();
    if (preview) {
      for (const key of [
        "mask-image",
        "mask-size",
        "mask-position",
        "mask-repeat",
        "mask-composite",
      ])
        paper.style.removeProperty(key);
    }
  }
  function finish() {
    if (done) return;
    done = true;
    cut();
    cleanup();
    resolve();
  }
  function cancel() {
    if (done) return;
    done = true;
    cleanup();
    resolve();
  }
  if (reduced) {
    finish();
    return { finished, finish, cancel };
  }

  // Rasterize only the live stub: its actual colors, text positions, and barcode.
  const image = document.createElement("canvas");
  image.width = Math.ceil(source.width * 2);
  image.height = Math.ceil(source.height * 2);
  const ctx = image.getContext("2d")!;
  ctx.scale(2, 2);
  ctx.fillStyle = getComputedStyle(stub).backgroundColor;
  ctx.fillRect(0, 0, source.width, source.height);
  const walker = document.createTreeWalker(stub, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.textContent || "";
    if (!text.trim()) continue;
    const style = getComputedStyle(node.parentElement!);
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.fillStyle = style.color;
    ctx.textBaseline = "alphabetic";
    // Character ranges preserve line breaks and measured font positioning.
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i])) continue;
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getBoundingClientRect();
      const metrics = ctx.measureText(text[i]);
      const ascent =
        metrics.fontBoundingBoxAscent || parseFloat(style.fontSize) * 0.8;
      const descent =
        metrics.fontBoundingBoxDescent || parseFloat(style.fontSize) * 0.2;
      ctx.fillText(
        text[i],
        r.left - source.left,
        r.top - source.top + (r.height - ascent - descent) / 2 + ascent,
      );
    }
  }
  const bar = stub.querySelector<HTMLElement>(".pass-barcode");
  if (bar) {
    const r = bar.getBoundingClientRect();
    ctx.fillStyle = getComputedStyle(bar).color;
    for (let x = 0; x < r.width; x += 15) {
      for (const [a, b] of [
        [0, 2],
        [4, 1],
        [8, 4],
      ])
        ctx.fillRect(
          r.left - source.left + x + a,
          r.top - source.top,
          Math.min(b, r.width - x - a),
          r.height,
        );
    }
  }
  // Preserve the small square perforations along the free paper edge.
  for (let x = 0; x < source.width; x += 18)
    ctx.clearRect(x, source.height - 6, 8, 6);

  void rendererModule
    .then((THREE: any) => {
      if (done) return;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          alpha: true,
          antialias: true,
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(innerWidth, innerHeight);
        renderer.setClearColor(0, 0);
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(
          0,
          innerWidth,
          innerHeight,
          0,
          0.1,
          2000,
        );
        camera.position.z = 1000;
        geometry = new THREE.PlaneGeometry(
          source.width,
          source.height,
          120,
          48,
        );
        const positions = geometry.attributes.position;
        const original = Float32Array.from(positions.array);
        texture = new THREE.CanvasTexture(image);
        texture.minFilter = THREE.LinearFilter;
        material = new THREE.ShaderMaterial({
          uniforms: {
            front: { value: texture },
            shine: { value: -1 },
            back: { value: new THREE.Color(paperColor).convertLinearToSRGB() },
          },
          side: THREE.DoubleSide,
          transparent: true,
          vertexShader: `varying vec2 vUv; varying float vBend; attribute float bend;
          void main(){vUv=uv;vBend=bend;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `uniform sampler2D front; uniform vec3 back; uniform float shine; varying vec2 vUv; varying float vBend;
          void main(){vec4 ink=texture2D(front,vUv);if(ink.a<.1)discard;
          float shade=1.-.24*sin(vBend);vec3 paper=back;
          vec3 color=gl_FrontFacing?ink.rgb:paper;
          float glint=shine<0.?0.:pow(max(0.,1.-abs(vUv.x+vUv.y*.3-shine*1.9+.3)/.16),2.)*.3;
          gl_FragColor=vec4(mix(color*shade,vec3(1.),glint),ink.a);}`,
        });
        const bend = new Float32Array(positions.count);
        geometry.setAttribute("bend", new THREE.BufferAttribute(bend, 1));
        const mesh = new THREE.Mesh(geometry, material);
        mesh.frustumCulled = false;
        scene.add(mesh);
        (preview ? document.body : dialog).append(canvas);
        cut();
        const nx = 0.88,
          ny = Math.sqrt(1 - nx * nx),
          radius = Math.min(28, source.height * 0.21);
        const min = (-source.width / 2) * nx - (source.height / 2) * ny;
        const max = -min;
        const clamp = (v: number) => Math.max(0, Math.min(1, v));
        const smooth = (v: number) => v * v * (3 - 2 * v);
        const start = performance.now();
        function render(now: number) {
          if (done) return;
          const t = clamp((now - start) / (preview ? 360 : 1450));
          // Finish the continuous fold before the detached reverse moves to center.
          const peel = preview
            ? 0.145 * smooth(t)
            : (options.initialPeel || 0) +
              (1 - (options.initialPeel || 0)) * smooth(clamp(t / 0.69));
          const flight = preview ? 0 : smooth(clamp((t - 0.69) / 0.31));
          const fold = min + (max - min + Math.PI * radius) * peel;
          for (let i = 0; i < positions.count; i++) {
            const x = original[i * 3],
              y = original[i * 3 + 1];
            const s = x * nx + y * ny,
              d = Math.max(0, fold - s),
              angle = Math.min(Math.PI, d / radius);
            const folded =
              d <= Math.PI * radius
                ? fold - radius * Math.sin(angle)
                : fold + d - Math.PI * radius;
            const delta = d > 0 ? folded - s : 0;
            const px = source.left + source.width / 2 + x + nx * delta;
            const py =
              innerHeight - source.top - source.height / 2 + y + ny * delta;
            const z = radius * (1 - Math.cos(angle));
            const u = x / source.width + 0.5,
              v = y / source.height + 0.5;
            // Mirrored X retains the reverse-facing winding when the sheet flattens.
            const tx = dest.right - u * dest.width,
              ty = innerHeight - dest.bottom + v * dest.height;
            positions.setXYZ(
              i,
              px + (tx - px) * flight,
              py + (ty - py) * flight,
              z * (1 - flight),
            );
            bend[i] = angle;
          }
          positions.needsUpdate = true;
          geometry.attributes.bend.needsUpdate = true;
          material.uniforms.shine.value = preview ? t : -1;
          renderer.render(scene, camera);
          if (t >= 1) {
            if (!preview) finish();
          } else frame = requestAnimationFrame(render);
        }
        render(start);
      } catch {
        finish();
      }
    })
    .catch(finish);
  return { finished, finish, cancel };
}
