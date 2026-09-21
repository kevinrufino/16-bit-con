import { token } from "../design/tokens";
const playing = new WeakMap<HTMLElement, () => void>();
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
export function stopPixelReveal(element: HTMLElement) {
  playing.get(element)?.();
}
/** Original canvas rendition of the reference's coarse-pixel-to-live-type handoff. */
export async function revealPixels(element: HTMLElement, pattern: string) {
  playing.get(element)?.();
  if (reduced.matches) return;
  await document.fonts.ready;
  if (reduced.matches || !element.isConnected) return;
  const style = getComputedStyle(element),
    bounds = element.getBoundingClientRect();
  const width = Math.ceil(bounds.width),
    height = Math.ceil(bounds.height);
  if (!width || !height) return;
  const source = document.createElement("span");
  source.className = "pixel-reveal-source";
  while (element.firstChild) source.append(element.firstChild);
  element.append(source);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const sample = document.createElement("canvas");
  const ink = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx || !ink) {
    source.replaceWith(...source.childNodes);
    return;
  }
  sample.width = canvas.width = width;
  sample.height = canvas.height = height;
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "pixel-reveal-canvas";
  Object.assign(canvas.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  });
  ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  ink.letterSpacing = style.letterSpacing;
  ink.textBaseline = "alphabetic";
  ink.fillStyle = style.color;
  // Range positions preserve the browser's actual wrapping and word spacing.
  const text = source.firstChild;
  if (!text || text.nodeType !== Node.TEXT_NODE) {
    source.replaceWith(...source.childNodes);
    return;
  }
  const words = [...text.textContent!.matchAll(/\S+/g)];
  for (const word of words) {
    const range = document.createRange();
    range.setStart(text, word.index!);
    range.setEnd(text, word.index! + word[0].length);
    const r = range.getBoundingClientRect();
    ink.fillText(
      word[0],
      r.left - bounds.left,
      r.top - bounds.top + parseFloat(style.fontSize) * 0.8,
    );
  }
  const pixels = ink.getImageData(0, 0, width, height).data;
  element.append(canvas);
  source.style.opacity = "0";
  let frame = 0,
    start = 0;
  const cleanup = () => {
    cancelAnimationFrame(frame);
    canvas.remove();
    source.style.opacity = "";
    if (source.parentNode) source.replaceWith(...source.childNodes);
    playing.delete(element);
    reduced.removeEventListener("change", onReduced);
  };
  const onReduced = () => {
    if (reduced.matches) cleanup();
  };
  reduced.addEventListener("change", onReduced);
  playing.set(element, cleanup);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function draw(time: number) {
    if (!start) start = time;
    const progress = Math.min(
      1,
      (time - start) / parseFloat(token("motion-reveal")),
    );
    if (progress >= 1 || document.hidden) {
      cleanup();
      return;
    }
    ctx!.clearRect(0, 0, width, height);
    const size = progress < 0.35 ? 8 : progress < 0.65 ? 4 : 2;
    for (let y = 0; y < height; y += size)
      for (let x = 0; x < width; x += size) {
        const sampleIndex =
          (Math.min(height - 1, y + Math.floor(size / 2)) * width +
            Math.min(width - 1, x + Math.floor(size / 2))) *
          4;
        if (pixels[sampleIndex + 3] < 48) continue;
        const noise =
          bayer[(Math.floor(y / size) % 4) * 4 + (Math.floor(x / size) % 4)] /
          16;
        const front =
          pattern === "scan"
            ? x / width
            : pattern === "reverse"
              ? 1 - x / width
              : pattern === "rise"
                ? 1 - y / height
                : pattern === "fall"
                  ? y / height
                  : pattern === "diagonal"
                    ? (x / width + y / height) / 2
                    : pattern === "radiate"
                      ? Math.abs(x / width - 0.5) * 2
                      : noise;
        if (progress * 1.5 < front * 0.8 + noise * 0.2) continue;
        ctx!.fillStyle =
          progress < 0.55 && noise > 0.45 ? token("color-accent") : style.color;
        ctx!.fillRect(x, y, size, size);
      }
    if (progress > 0.8) {
      source.style.opacity = String((progress - 0.8) / 0.2);
      canvas.style.opacity = String((1 - progress) / 0.2);
    }
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
}
