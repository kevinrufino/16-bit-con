// Native scrolling only: no wheel interception, forced stops, or snapping.
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
let pending: (() => void) | undefined;
export let scrolling = false;
export function scrollPage(top: number, immediate = false): Promise<void> {
  pending?.();
  const target = Math.max(
    0,
    Math.min(top, document.documentElement.scrollHeight - innerHeight),
  );
  if (immediate || reduced.matches) {
    window.scrollTo({ top: target, behavior: "instant" });
    return Promise.resolve();
  }
  scrolling = true;
  return new Promise((resolve) => {
    let timer = 0;
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener("scrollend", done);
      window.removeEventListener("wheel", done);
      window.removeEventListener("touchstart", done);
      window.removeEventListener("keydown", done);
      scrolling = false;
      pending = undefined;
      resolve();
      window.dispatchEvent(new Event("page-scroll-end"));
    };
    pending = done;
    window.addEventListener("scrollend", done, { once: true });
    window.addEventListener("wheel", done, { once: true, passive: true });
    window.addEventListener("touchstart", done, { once: true, passive: true });
    window.addEventListener("keydown", done, { once: true });
    timer = window.setTimeout(done, 1200);
    window.scrollTo({ top: target, behavior: "smooth" });
  });
}
export function anchorTop(target: HTMLElement): number {
  const footer = document.querySelector<HTMLElement>(".footer-curtain");
  const curtain = document.querySelector<HTMLElement>(".schedule-curtain");
  if (footer?.contains(target) && curtain)
    return (
      curtain.getBoundingClientRect().bottom +
      scrollY +
      target.getBoundingClientRect().top -
      footer.getBoundingClientRect().top
    );
  return target.getBoundingClientRect().top + scrollY;
}

// Readiness depends on layout, not off-screen video downloads. Waiting for load
// left the guide inactive during early interaction and restored a stale hash later.
export const navigationReady = document.fonts.ready
  .then(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  .then(async () => {
    const target = document.getElementById(
      decodeURIComponent(location.hash.slice(1)),
    );
    if (target)
      await scrollPage(
        anchorTop(target) -
          (parseFloat(getComputedStyle(target).scrollMarginTop) || 0),
        true,
      );
  });
