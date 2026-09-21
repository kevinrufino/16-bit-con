import { token } from "../design/tokens";
const section = document.querySelector<HTMLElement>(".experience");
if (section) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let played = false;
  const animations: Animation[] = [];
  const finish = () => animations.forEach((animation) => animation.finish());
  new IntersectionObserver(
    ([entry], observer) => {
      if (!entry.isIntersecting || played) return;
      played = true;
      observer.disconnect();
      if (reduced.matches) return;
      const pieces = section.querySelectorAll<HTMLElement>(
        ".section-marker,.experience-copy,.experience-stats,.experience-next",
      );
      pieces.forEach((piece, i) =>
        animations.push(
          piece.animate(
            [
              {
                opacity: 0,
                transform: "translateY(28px)",
                clipPath: "inset(0 0 100% 0)",
              },
              { opacity: 1, transform: "translateY(0)", clipPath: "inset(0)" },
            ],
            {
              duration: parseFloat(token("motion-reveal")),
              delay: i * parseFloat(token("motion-stagger")),
              easing: token("ease-out"),
              fill: "backwards",
            },
          ),
        ),
      );
      section
        .querySelectorAll<HTMLElement>("[data-roll]")
        .forEach((number, index) => {
          const value = Number(number.dataset.roll);
          const text = String(value).padStart(2, "0");
          const visual = number.querySelector("span")!;
          visual.textContent = "";
          [...text].forEach((digit, column) => {
            const viewport = document.createElement("span");
            viewport.className = "roll-digit";
            const strip = document.createElement("span");
            strip.className = "roll-strip";
            const end = 10 + Number(digit);
            for (let i = 0; i <= end; i++) {
              const item = document.createElement("i");
              item.textContent = String(i % 10);
              strip.append(item);
            }
            viewport.append(strip);
            visual.append(viewport);
            strip.style.transform = `translateY(-${end}em)`;
            animations.push(
              strip.animate(
                [
                  { transform: "translateY(0)" },
                  { transform: `translateY(-${end}em)` },
                ],
                {
                  duration:
                    parseFloat(token("motion-counter")) +
                    column * parseFloat(token("motion-counter-column")),
                  delay:
                    parseFloat(token("motion-counter-delay")) +
                    index * parseFloat(token("motion-counter-stagger")),
                  easing: token("ease-out"),
                  fill: "backwards",
                },
              ),
            );
          });
        });
    },
    { threshold: 0.3 },
  ).observe(section);
  reduced.addEventListener("change", () => {
    if (reduced.matches) finish();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) finish();
  });
}
