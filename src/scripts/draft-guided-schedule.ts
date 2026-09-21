import { token } from "../design/tokens";
import {
  scrollPage,
  scrolling,
  anchorTop,
  navigationReady,
} from "./page-scroll";
import { nextStop, nearestStop } from "./scroll-guide.mjs";
import { revealPixels } from "./pixel-reveal";
const schedule = document.querySelector<HTMLElement>(".scroll-schedule");
if (schedule) {
  const stops = [...schedule.querySelectorAll<HTMLElement>("[data-stop]")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const status = schedule.querySelector<HTMLElement>("#schedule-status")!;
  let ready = false;
  let current = -1,
    busy = false,
    gesture = false,
    wheelSum = 0,
    idle = 0,
    settle = 0;
  const anchors = () =>
    stops.map((stop) => stop.getBoundingClientRect().top + scrollY);
  const enabled = () =>
    ready &&
    !reduced.matches &&
    innerHeight > 620 &&
    stops.every((stop) => stop.offsetHeight <= innerHeight + 4) &&
    !document.querySelector("dialog[open]");
  const within = () => {
    const a = anchors();
    return scrollY >= a[0] - 4 && scrollY <= a[a.length - 1] + 4;
  };
  const interactive = (target: EventTarget | null) =>
    target instanceof Element &&
    !!target.closest('input,textarea,select,button,[contenteditable="true"]');
  async function move(direction: number) {
    if (busy) return;
    const a = anchors();
    const before = anchorTop(schedule!);
    const footer = document.querySelector<HTMLElement>("#register");
    const after = footer ? anchorTop(footer) : a[a.length - 1] + innerHeight;
    const target = nextStop(scrollY, direction, a, before, after);
    busy = true;
    await scrollPage(target);
    busy = false;
  }
  window.addEventListener(
    "wheel",
    (event) => {
      if (
        !enabled() ||
        !within() ||
        event.ctrlKey ||
        event.metaKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        interactive(event.target)
      )
        return;
      event.preventDefault();
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        gesture = false;
        wheelSum = 0;
      }, 180);
      if (busy || scrolling || gesture) return;
      wheelSum +=
        event.deltaY *
        (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (Math.abs(wheelSum) < 24) return;
      gesture = true;
      void move(Math.sign(wheelSum));
      wheelSum = 0;
    },
    { passive: false },
  );
  window.addEventListener("keydown", (event) => {
    if (
      !enabled() ||
      !within() ||
      busy ||
      scrolling ||
      interactive(event.target) ||
      event.altKey ||
      event.metaKey ||
      event.ctrlKey
    )
      return;
    if (
      event.target instanceof Element &&
      event.target.closest("a") &&
      ["Enter", " "].includes(event.key)
    )
      return;
    const down = ["ArrowDown", "PageDown", " "].includes(event.key);
    const up =
      ["ArrowUp", "PageUp"].includes(event.key) ||
      (event.key === " " && event.shiftKey);
    if (!down && !up) return;
    event.preventDefault();
    void move(up ? -1 : 1);
  });
  let touchStart = 0,
    touchTracking = false,
    touchMoved = false;
  window.addEventListener(
    "touchstart",
    (event) => {
      touchTracking =
        enabled() &&
        within() &&
        event.touches.length === 1 &&
        !interactive(event.target);
      touchMoved = false;
      touchStart = event.touches[0]?.clientY ?? 0;
    },
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    (event) => {
      if (!touchTracking || event.touches.length !== 1) return;
      event.preventDefault();
      const delta = touchStart - event.touches[0].clientY;
      if (!touchMoved && !busy && !scrolling && Math.abs(delta) > 40) {
        touchMoved = true;
        void move(Math.sign(delta));
      }
    },
    { passive: false },
  );
  window.addEventListener(
    "touchend",
    () => {
      touchTracking = false;
    },
    { passive: true },
  );
  function update() {
    const a = anchors();
    const nearest = nearestStop(scrollY, a);
    const index = a.indexOf(nearest);
    if (
      ready &&
      scrollY >= a[0] - innerHeight * 0.55 &&
      scrollY <= a[a.length - 1] + innerHeight * 0.6 &&
      index !== current
    ) {
      current = index;
      const stop = stops[index];
      stops.forEach((s, i) => s.classList.toggle("active", i === index));
      status.textContent = `Session ${index + 1} of ${stops.length}: ${stop.querySelector("h3")!.textContent}`;
      void revealPixels(
        stop.querySelector<HTMLElement>("[data-pixel-reveal]")!,
        stop.dataset.pattern!,
      );
      if (!reduced.matches)
        stop.querySelector(".session-visual")!.animate(
          [
            { opacity: 0.3, transform: "scale(.96)" },
            { opacity: 1, transform: "scale(1)" },
          ],
          {
            duration: parseFloat(token("motion-art")),
            easing: token("ease-out"),
          },
        );
    }
    clearTimeout(settle);
    // Scrollbar drags, native touch entry, and small wheel gestures settle too.
    if (enabled() && !busy && !scrolling && within())
      settle = window.setTimeout(() => {
        if (!enabled() || busy || scrolling || touchTracking) return;
        const closest = nearestStop(scrollY, anchors());
        if (Math.abs(closest - scrollY) > 3) {
          busy = true;
          void scrollPage(closest).then(() => {
            busy = false;
          });
        }
      }, 180);
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  reduced.addEventListener("change", () => {
    clearTimeout(settle);
    busy = false;
    gesture = false;
    update();
  });
  void navigationReady.then(() => {
    ready = true;
    update();
  });
}
