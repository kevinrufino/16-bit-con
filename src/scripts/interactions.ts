export {};
const grid = document.querySelector<HTMLElement>("#pixel-grid")!;
const pixels = [...grid.querySelectorAll<HTMLButtonElement>("[data-pixel]")];
const blank = "#fffaeb";
let selected = "#0d5500";
let colorName = "Leaf green";
const colors = Array<string>(256).fill(blank);
const paintStatus = document.querySelector<HTMLElement>("#paint-status")!;
// A flower is a small invitation to remix Vega's organic brand language.
const flower = [
  "0000000000000000",
  "0000000000000000",
  "0000000110000000",
  "0000001111000000",
  "0000111111110000",
  "0001111221111000",
  "0001112222111000",
  "0000111221110000",
  "0000001111000000",
  "0000000110000000",
  "0000000330000000",
  "0000033330000000",
  "0000000333300000",
  "0000000330000000",
  "0000000000000000",
  "0000000000000000",
];
const seed = [blank, "#ffd11b", "#001400", "#0d5500"];
function paint(index: number, color = selected, name = colorName) {
  colors[index] = color;
  pixels[index].style.backgroundColor = color;
  pixels[index].setAttribute(
    "aria-label",
    `Row ${Math.floor(index / 16) + 1}, column ${(index % 16) + 1}, ${color === blank ? "blank" : name}`,
  );
}
flower
  .join("")
  .split("")
  .forEach((v, i) => {
    if (v !== "0")
      paint(
        i,
        seed[Number(v)],
        ["blank", "Florets yellow", "Deep green", "Leaf green"][Number(v)],
      );
  });
let drawing = false;
grid.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-pixel]",
  );
  if (!target) return;
  drawing = true;
  paint(Number(target.dataset.pixel));
});
grid.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const target = document
    .elementFromPoint(e.clientX, e.clientY)
    ?.closest<HTMLButtonElement>("[data-pixel]");
  if (target && grid.contains(target)) paint(Number(target.dataset.pixel));
});
window.addEventListener("pointerup", () => (drawing = false));
window.addEventListener("pointercancel", () => (drawing = false));
pixels.forEach((pixel, i) => {
  pixel.addEventListener("click", () => paint(i));
  pixel.addEventListener("focus", () => {
    pixels.forEach((p) => (p.tabIndex = -1));
    pixel.tabIndex = 0;
  });
  pixel.addEventListener("keydown", (e) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -16,
      ArrowDown: 16,
    };
    if (e.key in moves) {
      e.preventDefault();
      const next = i + moves[e.key];
      if (next >= 0 && next < 256) pixels[next].focus();
    }
  });
});
document.querySelectorAll<HTMLButtonElement>("[data-color]").forEach((button) =>
  button.addEventListener("click", () => {
    selected = button.dataset.color!;
    colorName = button.getAttribute("aria-label")!;
    document
      .querySelectorAll("[data-color]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    paintStatus.textContent = `${colorName.toUpperCase()} SELECTED`;
  }),
);
document.querySelector("#clear-art")!.addEventListener("click", () => {
  pixels.forEach((_, i) => paint(i, blank, "blank"));
  paintStatus.textContent = "A FRESH START. ALL YOURS.";
});
function download(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = filename;
    link.href = url;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, "image/png");
}

document.querySelector("#save-art")!.addEventListener("click", () => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d")!;
  colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect((i % 16) * 32, Math.floor(i / 16) * 32, 32, 32);
  });
  download(canvas, "16-bit-con-my-pixels.png");
  paintStatus.textContent = "YOUR MASTERPIECE, SAVED.";
});
const dialog = document.querySelector<HTMLDialogElement>("#pass-dialog")!;
const form = document.querySelector<HTMLFormElement>("#pass-form")!;
document
  .querySelectorAll("[data-open-pass]")
  .forEach((b) => b.addEventListener("click", () => dialog.showModal()));
dialog
  .querySelector(".close-dialog")!
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
let player = "";
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.querySelector<HTMLInputElement>("#player-name")!;
  player = input.value.trim();
  if (!player) {
    input.setCustomValidity("Enter a player name.");
    input.reportValidity();
    return;
  }
  form.hidden = true;
  document.querySelector<HTMLElement>("#pass-result")!.hidden = false;
  document.querySelector("#pass-message")!.textContent =
    `Player ${player}, you’re ready. Your souvenir pass is unlocked.`;
  document.querySelector<HTMLButtonElement>("#download-pass")!.focus();
});
document
  .querySelector("#player-name")!
  .addEventListener("input", (e) =>
    (e.target as HTMLInputElement).setCustomValidity(""),
  );
document
  .querySelector("#download-pass")!
  .addEventListener("click", async () => {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 650;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffd11b";
    ctx.fillRect(0, 0, 1200, 650);
    ctx.fillStyle = "#001400";
    ctx.font = '24px "Geist Mono"';
    ctx.fillText("VEGA PRESENTS / ALL ACCESS", 60, 70);
    ctx.font = '150px "PP Mondwest"';
    ctx.fillText("16-Bit Con", 55, 240);
    ctx.font = "40px Geist";
    ctx.fillText(player, 60, 340);
    ctx.font = '22px "Geist Mono"';
    ctx.fillText("OCT 24, 2026 / BROOKLYN, NY", 60, 420);
    ctx.fillText("SOUVENIR PASS • FICTIONAL EVENT", 60, 580);
    ctx.fillRect(930, 60, 3, 520);
    for (let i = 0; i < 34; i++)
      ctx.fillRect(980 + i * 4, 100, i % 3 === 0 ? 3 : 1, 400);
    download(canvas, "16-bit-con-souvenir-pass.png");
  });
