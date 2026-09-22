import { scrollPage, anchorTop } from "./page-scroll";

// Keep tall panels fully reachable while the schedule covers/reveals them.
const panels = document.querySelectorAll<HTMLElement>(
  ".hero-curtain, .footer-curtain",
);
const sizePanels = new ResizeObserver((entries) => {
  for (const { target } of entries) {
    const panel = target as HTMLElement;
    panel.style.setProperty("--panel-height", `${panel.offsetHeight}px`);
  }
});
panels.forEach((panel) => sizePanels.observe(panel));

const curtain = document.querySelector<HTMLElement>(".schedule-curtain")!;
const footer = document.querySelector<HTMLElement>(".footer-curtain")!;
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const hero = document.querySelector<HTMLElement>(".hero-curtain");
const heroWorld = document.getElementById("con-world");
function revealFooter() {
  const visible =
    reduced.matches ||
    curtain.getBoundingClientRect().bottom <= window.innerHeight;
  footer.style.visibility = visible ? "visible" : "hidden";
  footer.inert = !visible;
}
// The hero panel is sticky, so its own IntersectionObserver reports it as
// on-screen at every scroll position — including where the schedule has
// scrolled fully over it. Publish the real state so the WebGL queue can idle
// instead of rendering 318k triangles behind an opaque panel.
function markHeroCovered() {
  if (!hero || !heroWorld) return;
  const covered = curtain.getBoundingClientRect().top <= 0;
  if (covered === (heroWorld.dataset.covered === "true")) return;
  heroWorld.dataset.covered = String(covered);
  heroWorld.dispatchEvent(
    new CustomEvent("hero-covered", { detail: { covered } }),
  );
}
function onViewportChange() {
  revealFooter();
  markHeroCovered();
}
window.addEventListener("scroll", onViewportChange, { passive: true });
window.addEventListener("resize", onViewportChange);
reduced.addEventListener("change", onViewportChange);
onViewportChange();

// Sticky panel rectangles describe their pinned position, not their place in
// the document. Resolve footer anchors against the end of the curtain.
document.addEventListener("click", (event) => {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  const link = (event.target as Element).closest<HTMLAnchorElement>(
    'a[href^="#"]',
  );
  if (!link || link.hash.length < 2) return;
  const target = document.getElementById(
    decodeURIComponent(link.hash.slice(1)),
  );
  if (!target) return;
  event.preventDefault();
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  void scrollPage(anchorTop(target) - margin).then(() => {
    if (target.matches("[data-stop]")) target.focus({ preventScroll: true });
  });
  history.pushState(null, "", link.hash);
});

function restoreFooterAnchor() {
  const target = document.getElementById(
    decodeURIComponent(location.hash.slice(1)),
  );
  if (!target || !footer.contains(target)) return;
  void scrollPage(anchorTop(target), true);
  revealFooter();
}
window.addEventListener("popstate", restoreFooterAnchor);
if (document.readyState === "complete")
  requestAnimationFrame(restoreFooterAnchor);
else window.addEventListener("load", restoreFooterAnchor, { once: true });
