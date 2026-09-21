import { token } from "../design/tokens";
import { drawEnvironment } from "./calendar-environment";
// Adapted from the user's mole-hero-assets live colored-block preview.
// Keep video and processing local; no generation service or runtime dependency.
export function initCalendarMole(root: HTMLElement, initiallyPaused: boolean) {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-calendar-art]")!;
  const video = root.querySelector<HTMLVideoElement>("[data-calendar-video]")!;
  const ctx = canvas.getContext("2d")!;
  const sample = document.createElement("canvas");
  const sampleCtx = sample.getContext("2d", { willReadFrequently: true })!;
  // Foreground mosaic uses brand greens/yellows; blue is reserved for sky.
  const colors = [
    token("color-accent"),
    token("color-accent"),
    token("color-pixel-lime"),
    token("color-heading"),
    token("color-dark"),
    token("color-inverse"),
  ];
  let paused = initiallyPaused;
  let visible = false;
  let frame = 0;
  let lastTime = -1;
  let colorGrid: string[] = [];
  video.muted = true;

  function hash(x: number, y: number) {
    let n = Math.imul(x + 71, 374761393) ^ Math.imul(y + 113, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n ^ (n >>> 16)) >>> 0;
  }
  function draw() {
    if (video.readyState < 2 || !canvas.width || !video.videoWidth) return;
    const scale = Math.min(
      canvas.width / video.videoWidth,
      canvas.height / video.videoHeight,
    );
    const w = video.videoWidth * scale;
    const h = video.videoHeight * scale;
    const x0 = canvas.width - w;
    const y0 = (canvas.height - h) / 2;
    // One grid covers the entire environment; all silhouettes share its origin.
    const cols = Math.ceil(canvas.width / (17.5 * scale));
    const rows = Math.ceil(canvas.height / (10 * scale));
    if (sample.width !== cols || sample.height !== rows) {
      sample.width = cols;
      sample.height = rows;
      colorGrid = Array.from(
        { length: cols * rows },
        (_, i) => colors[hash(i % cols, Math.floor(i / cols)) % colors.length],
      );
    }
    sampleCtx.fillStyle = "#fff";
    sampleCtx.fillRect(0, 0, cols, rows);
    drawEnvironment(
      sampleCtx,
      cols,
      rows,
      (video.currentTime / (video.duration || 23.0417)) * Math.PI * 2,
    );
    // White video background leaves the environmental silhouettes intact.
    sampleCtx.globalCompositeOperation = "multiply";
    sampleCtx.drawImage(
      video,
      (x0 / canvas.width) * cols,
      (y0 / canvas.height) * rows,
      (w / canvas.width) * cols,
      (h / canvas.height) * rows,
    );
    sampleCtx.globalCompositeOperation = "source-over";
    const pixels = sampleCtx.getImageData(0, 0, cols, rows).data;
    const cw = canvas.width / cols,
      ch = canvas.height / rows,
      gap = 3 * scale;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0, i = 0; y < rows; y++)
      for (let x = 0; x < cols; x++, i++) {
        if (pixels[i * 4] > 255 * 0.65) continue;
        ctx.fillStyle = colorGrid[i];
        ctx.fillRect(
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
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
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
