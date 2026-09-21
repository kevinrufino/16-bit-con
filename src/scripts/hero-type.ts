import { token } from "../design/tokens";
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const sequence = [
  "font-redaction",
  "font-redaction35",
  "font-redaction50",
  "font-redaction70",
  "font-redaction50",
  "font-redaction35",
];
const fonts = Promise.all(
  ["Redaction", "Redaction 35", "Redaction 50", "Redaction 70"].map((font) =>
    document.fonts.load(`80px "${font}"`),
  ),
);
document.querySelectorAll<HTMLElement>("[data-font-word]").forEach((word) => {
  const frame = word.querySelector<HTMLElement>(".font-frame")!;
  let timers: number[] = [],
    running = false;
  const reset = () => {
    timers.forEach(clearTimeout);
    timers = [];
    running = false;
    word.classList.remove("font-running");
    frame.className = "font-frame";
    frame.style.transform = "";
  };
  async function play() {
    if (reduced.matches || running) return;
    running = true;
    await fonts.catch(() => {});
    if (reduced.matches || !running) return;
    word.classList.add("font-running");
    const step = parseFloat(token("motion-font-step"));
    sequence.forEach((font, i) =>
      timers.push(
        window.setTimeout(() => {
          frame.className = `font-frame ${font}`;
          frame.style.transform = "";
          const width = frame.scrollWidth;
          if (width > word.clientWidth)
            frame.style.transform = `scaleX(${word.clientWidth / width})`;
        }, i * step),
      ),
    );
    timers.push(window.setTimeout(reset, sequence.length * step));
  }
  word.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") void play();
  });
  word.addEventListener("focus", () => void play());
  reduced.addEventListener("change", () => {
    if (reduced.matches) reset();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
});
