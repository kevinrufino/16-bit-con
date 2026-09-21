import { revealPixels, stopPixelReveal } from "./pixel-reveal";
import { initCalendarMole } from "./calendar-mole";
const schedule = document.querySelector<HTMLElement>(".scroll-schedule");
if (schedule) {
  const stops = [...schedule.querySelectorAll<HTMLElement>("[data-stop]")];
  const tiles = [...schedule.querySelectorAll<HTMLElement>("[data-tile]")];
  const current = schedule.querySelector<HTMLElement>(".map-current")!;
  const toggle = schedule.querySelector<HTMLButtonElement>(".motion-toggle")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let animated = -1;
  let revealTimers: number[] = [];
  // A stop reveals once. Scrolling back up past a stop must not replay it.
  const revealed = new Set<number>();
  const revealElements = (stop: HTMLElement) => [
    ...stop.querySelectorAll<HTMLElement>(
      ".stop-time,.stop-type,h3,.story-copy p",
    ),
  ];
  function cancelReveals() {
    revealTimers.forEach(clearTimeout);
    revealTimers = [];
    stops.forEach((stop, i) =>
      revealElements(stop).forEach((element) => {
        stopPixelReveal(element);
        // A cancelled stagger must not leave the rest of a reached stop hidden.
        if (revealed.has(i)) element.classList.add("shown");
      }),
    );
  }
  // Copy starts hidden so the words are never legible ahead of their reveal.
  // Marking an element shown is what makes it visible, with or without motion.
  function showCopy(index: number) {
    revealed.add(index);
    revealElements(stops[index]).forEach((element) =>
      element.classList.add("shown"),
    );
  }
  let paused = reduced.matches;
  let visible = false;
  const videos = tiles.map((tile) =>
    tile.querySelector<HTMLVideoElement>("video"),
  );
  function syncScenes() {
    videos.forEach((video) => {
      if (!video) return;
      if (!paused && visible) {
        if (video.paused) void video.play().catch(() => {});
      } else video.pause();
    });
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncScenes();
  }).observe(schedule);
  const setBackgroundPaused = initCalendarMole(schedule, paused);
  function setMotion() {
    setBackgroundPaused(paused);
    syncScenes();
    if (paused) {
      cancelReveals();
      // Without motion there is no reveal to wait for: show what has been reached.
      stops.forEach((_, i) => {
        if (i <= animated) showCopy(i);
      });
    }
    schedule!.dataset.motion = paused ? "paused" : "playing";
    toggle.textContent = paused ? "Play motion" : "Pause motion";
    toggle.setAttribute("aria-pressed", String(paused));
  }
  setMotion();
  toggle.addEventListener("click", () => {
    paused = !paused;
    setMotion();
  });
  reduced.addEventListener("change", () => {
    paused = reduced.matches;
    setMotion();
  });
  function update() {
    frame = 0;
    const mobile = innerWidth <= 760;
    const target = mobile
      ? (schedule!.querySelector<HTMLElement>(".map-sticky")!.offsetHeight +
          innerHeight) /
        2
      : innerHeight * 0.5;
    let nearest = 0;
    let distance = Infinity;
    stops.forEach((stop, i) => {
      const rect = stop.getBoundingClientRect();
      const delta = Math.abs(rect.top + rect.height / 2 - target);
      if (delta < distance) {
        distance = delta;
        nearest = i;
      }
    });
    stops.forEach((stop, i) => stop.classList.toggle("active", i === nearest));
    tiles.forEach((tile, i) => {
      tile.classList.toggle("active", i === nearest);
      if (i <= nearest) tile.classList.add("revealed");
      if (i === nearest) tile.setAttribute("aria-current", "true");
      else tile.removeAttribute("aria-current");
    });
    const rect = stops[nearest].getBoundingClientRect();
    if (
      !revealed.has(nearest) &&
      rect.top < innerHeight * 0.85 &&
      rect.bottom > target
    ) {
      cancelReveals();
      animated = nearest;
      // Anything skipped over (fast scroll, in-page anchor) is simply shown.
      stops.forEach((_, i) => {
        if (i < nearest && !revealed.has(i)) showCopy(i);
      });
      if (paused) showCopy(nearest);
      else {
        revealed.add(nearest);
        const patterns = [
          "scan",
          "bayer",
          stops[nearest].dataset.pattern!,
          nearest % 2 ? "rise" : "diagonal",
        ];
        revealElements(stops[nearest]).forEach((element, i) => {
          revealTimers.push(
            window.setTimeout(() => {
              element.classList.add("shown");
              if (!paused && animated === nearest)
                void revealPixels(element, patterns[i]);
            }, i * 85),
          );
        });
      }
    }
    current.textContent = `${stops[nearest].querySelector(".stop-time")!.textContent} / ${stops[nearest].querySelector(".stop-type")!.textContent!.split(" / ")[0]}`;
    schedule!.style.setProperty(
      "--day-progress",
      `${((nearest + 1) / stops.length) * 100}%`,
    );
  }
  function queueUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  schedule.classList.add("enhanced");
  update();
  window.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);
  window.addEventListener("page-scroll-end", queueUpdate);
}
