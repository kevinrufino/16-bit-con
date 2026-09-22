import { token, ticketPapers } from "../design/tokens";
import { tearTicket } from "./ticket-tear";
import { createDitherPass, ditherThreshold } from "./dither-pass";
const names = ["Daydream", "High score", "After hours"];
const papers = ticketPapers;
const ink = token("color-text");
const cream = token("color-surface");
const cards = [...document.querySelectorAll<HTMLElement>("[data-pass]")];
const grids = cards.map((card) =>
  card.querySelector<HTMLElement>("[data-grid]")!,
);
const cells = grids.map((grid) => [
  ...grid.querySelectorAll<HTMLButtonElement>("[data-pixel]"),
]);
const status = document.querySelector<HTMLElement>("#paint-status")!;
let active = -1;
const editor = document.querySelector<HTMLElement>("#pass-tools")!;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
let selected = token("color-pixel-leaf");
let drawing = false;
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
const alien = [
  "0000000000000000",
  "0000000000000000",
  "0001000000001000",
  "0000100000010000",
  "0001111111111000",
  "0011101111011100",
  "0111111111111110",
  "0101111111111010",
  "0101000000001010",
  "0000110011000000",
  "0000000000000000",
  "0000002222000000",
  "0000022222200000",
  "0000002222000000",
  "0000000000000000",
  "0000000000000000",
];
const star = [
  "0000000000000000",
  "0000000100000000",
  "0000001110000000",
  "0000001110000000",
  "0000011111000000",
  "0011111111111000",
  "0001111111110000",
  "0000111111100000",
  "0000111111100000",
  "0001111011110000",
  "0001110001110000",
  "0011100000111000",
  "0000000000000000",
  "0000200000020000",
  "0000000000000000",
  "0000000000000000",
];
const palettes = [
  ["", token("color-pixel-light"), ink, token("color-pixel-leaf")],
  ["", token("color-pixel-leaf"), token("color-pixel-flower")],
  ["", token("color-pixel-flower"), token("color-pixel-lime")],
];
const seeds = [flower, alien, star].map((pattern, p) =>
  pattern
    .join("")
    .split("")
    .map((v) => palettes[p][Number(v)]),
);
let art = seeds.map((seed) => [...seed]);
const history: string[][][] = [[], [], []];
function render(p: number) {
  cells[p].forEach((cell, i) => {
    cell.style.backgroundColor = art[p][i] || "transparent";
    cell.setAttribute(
      "aria-label",
      `Row ${Math.floor(i / 16) + 1}, column ${(i % 16) + 1}, ${art[p][i] || "blank"}`,
    );
  });
}
function select(p: number) {
  active = p;
  cards.forEach((card, i) => {
    card.dataset.active = String(i === p);
    cells[i].forEach((cell, j) => {
      cell.disabled = i !== p;
      cell.tabIndex = i === p && j === 0 ? 0 : -1;
    });
    card.setAttribute(
      "aria-label",
      `${names[i]} pass${i === p ? ", selected" : ""}`,
    );
  });
  editor.hidden = p < 0;
  if (p < 0) return;
  focusAura(p);
  document.querySelector<HTMLButtonElement>("#undo-art")!.disabled =
    !history[p].length;
}
function deselect() {
  if (active < 0 || document.querySelector("dialog[open]")) return;
  const previous = active;
  const restoreFocus =
    cards[previous].contains(document.activeElement) ||
    editor.contains(document.activeElement);
  stop();
  select(-1);
  targetX = 0.5;
  targetY = 0.48;
  targetColor = hues[1];
  requestAura();
  status.textContent =
    "Ticket deselected. Your artwork is saved while you browse.";
  if (restoreFocus) cards[previous].focus({ preventScroll: true });
}
document.querySelector("#deselect-pass")!.addEventListener("click", deselect);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !document.querySelector("dialog[open]"))
    deselect();
});
document.addEventListener("click", (event) => {
  if (!(event.target as Element).closest("[data-pass], #pass-tools, dialog"))
    deselect();
});
function snapshot() {
  history[active].push([...art[active]]);
  if (history[active].length > 40) history[active].shift();
  document.querySelector<HTMLButtonElement>("#undo-art")!.disabled = false;
}
function paint(p: number, i: number) {
  art[p][i] = selected;
  render(p);
}
function stop() {
  drawing = false;
  cards.forEach((card) => delete card.dataset.drawing);
}
const stage = document.querySelector<HTMLElement>(".pass-stage")!;
const auraHost = document.querySelector<HTMLElement>(".footer-curtain")!;
const aura = document.querySelector<HTMLCanvasElement>(".pass-aura")!;
// Same field, same dither, on the GPU. The CPU path below stays as the
// fallback for browsers without WebGL2 — getContext is one-shot per canvas,
// so which context we hold is decided here, once.
const auraPass = createDitherPass(
  aura,
  `uniform vec2 aura, cursor, host;
   uniform float cursorOpacity;
   uniform vec3 color;
   void main() {
     vec2 n = vec2(uv.x, 1.0 - uv.y);
     float dx = (n.x - aura.x) / 0.36;
     float dy = (n.y - aura.y) / min(0.5, 650.0 / host.y);
     float distance = dx * dx + dy * dy;
     float wave = sin(n.x * 22.0 + n.y * 13.0) * 0.08
                + cos(n.y * 25.0 - n.x * 8.0) * 0.08;
     float cx = ((n.x - cursor.x) * host.x) / 110.0;
     float cy = ((n.y - cursor.y) * host.y) / 85.0;
     float cloud = 1.0 - cx * cx - cy * cy
                 + sin(cx * 5.0 + cy * 3.0) * 0.16
                 + cos(cy * 6.0 - cx * 2.0) * 0.12;
     float density = max(0.0, max(min(0.85, 1.0 - distance + wave),
                                  min(0.8, cloud) * cursorOpacity));
     vec2 pixel = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y);
     if (density <= ditherThreshold(pixel)) discard;
     float alpha = 0.12 + density * 0.36;
     frag = vec4(color * alpha, alpha);
   }`,
);
const auraCtx = auraPass ? null : aura.getContext("2d");
let auraX = 0.5,
  auraY = 0.48,
  targetX = 0.5,
  targetY = 0.48;
let auraColor = token("color-pixel-lime")
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16)),
  targetColor = [...auraColor];
let auraFrame = 0;
const rgb = (hex: string) =>
  [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
const hues = [
  token("color-accent"),
  token("color-pixel-lime"),
  token("color-heading"),
].map(rgb);
// The pointer contributes a second cloud to the existing background field.
let cursorX = 0.5,
  cursorY = 0.5,
  cursorTargetX = 0.5,
  cursorTargetY = 0.5,
  cursorOpacity = 0,
  cursorTargetOpacity = 0;
auraHost.addEventListener("pointermove", (e) => {
  if (
    e.pointerType !== "mouse" ||
    (e.target as Element).closest("[data-pass],#pass-tools,button,a,input") ||
    document.querySelector("dialog[open]")
  ) {
    cursorTargetOpacity = 0;
    requestAura();
    return;
  }
  const r = auraHost.getBoundingClientRect();
  cursorTargetX = (e.clientX - r.left) / r.width;
  cursorTargetY = (e.clientY - r.top) / r.height;
  if (cursorOpacity < 0.01) {
    cursorX = cursorTargetX;
    cursorY = cursorTargetY;
  }
  cursorTargetOpacity = 1;
  requestAura();
});
function hideCursorCloud() {
  cursorTargetOpacity = 0;
  requestAura();
}
auraHost.addEventListener("pointerleave", hideCursorCloud);
window.addEventListener("scroll", hideCursorCloud, { passive: true });
// The guard above swallows updates while the footer is covered; repaint once
// it is revealed so the field is correct the moment it becomes visible.
new MutationObserver(() => {
  if (!auraHost.inert) requestAura();
}).observe(auraHost, { attributes: true, attributeFilter: ["inert", "style"] });
window.addEventListener("blur", hideCursorCloud);
function paintAura() {
  const w = aura.width,
    h = aura.height;
  if (!w || !h) return;
  if (auraPass) {
    auraPass.draw({
      aura: [auraX, auraY],
      cursor: [cursorX, cursorY],
      host: [auraHost.clientWidth, auraHost.clientHeight],
      cursorOpacity,
      color: auraColor.map((c) => Math.round(c) / 255),
    });
    return;
  }
  if (!auraCtx) return;
  auraCtx.clearRect(0, 0, w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const nx = x / w,
        ny = y / h;
      const distance =
        ((nx - auraX) / 0.36) ** 2 +
        ((ny - auraY) / Math.min(0.5, 650 / auraHost.clientHeight)) ** 2;
      const wave =
        Math.sin(nx * 22 + ny * 13) * 0.08 + Math.cos(ny * 25 - nx * 8) * 0.08;
      const cx = ((nx - cursorX) * auraHost.clientWidth) / 110;
      const cy = ((ny - cursorY) * auraHost.clientHeight) / 85;
      const cloud =
        1 -
        cx * cx -
        cy * cy +
        Math.sin(cx * 5 + cy * 3) * 0.16 +
        Math.cos(cy * 6 - cx * 2) * 0.12;
      const density = Math.max(
        0,
        Math.min(0.85, 1 - distance + wave),
        Math.min(0.8, cloud) * cursorOpacity,
      );
      if (density > ditherThreshold(x, y)) {
        auraCtx.fillStyle = `rgba(${auraColor.map(Math.round).join(",")},${0.12 + density * 0.36})`;
        auraCtx.fillRect(x, y, 1, 1);
      }
    }
}
function drawAura() {
  auraFrame = 0;
  const still = reducedMotion.matches;
  auraX += (targetX - auraX) * (still ? 1 : 0.14);
  auraY += (targetY - auraY) * (still ? 1 : 0.14);
  auraColor = auraColor.map(
    (c, i) => c + (targetColor[i] - c) * (still ? 1 : 0.14),
  );
  cursorX += (cursorTargetX - cursorX) * (still ? 1 : 0.18);
  cursorY += (cursorTargetY - cursorY) * (still ? 1 : 0.18);
  cursorOpacity += (cursorTargetOpacity - cursorOpacity) * (still ? 1 : 0.18);
  paintAura();
  if (
    !still &&
    (Math.abs(cursorOpacity - cursorTargetOpacity) > 0.005 ||
      Math.abs(cursorX - cursorTargetX) > 0.001 ||
      Math.abs(cursorY - cursorTargetY) > 0.001 ||
      Math.abs(targetX - auraX) > 0.001 ||
      Math.abs(targetY - auraY) > 0.001 ||
      auraColor.some((c, i) => Math.abs(c - targetColor[i]) > 0.5))
  )
    auraFrame = requestAnimationFrame(drawAura);
}
function requestAura() {
  // curtains.ts parks the footer at visibility:hidden + inert until the
  // schedule scrolls clear. A global scroll listener feeds this function, so
  // without the guard the field repaints for every scroll of the whole page
  // while its canvas is not on screen.
  if (auraHost.inert) return;
  if (!auraFrame) auraFrame = requestAnimationFrame(drawAura);
}
function focusAura(p: number) {
  const r = cards[p].getBoundingClientRect(),
    s = auraHost.getBoundingClientRect();
  targetX = (r.left + r.width / 2 - s.left) / s.width;
  targetY = (r.top + r.height / 2 - s.top) / s.height;
  targetColor = hues[p];
  requestAura();
}
new ResizeObserver(() => {
  const w = Math.ceil(auraHost.clientWidth / 8);
  const h = Math.ceil(auraHost.clientHeight / 8);
  if (auraPass) auraPass.resize(w, h);
  else {
    aura.width = w;
    aura.height = h;
  }
  if (active >= 0) focusAura(active);
  requestAura();
}).observe(auraHost);
cards.forEach((card, p) => {
  card.addEventListener("pointerenter", () => focusAura(p));
  card.addEventListener("pointermove", (e) => {
    if (reducedMotion.matches) return;
    const r = auraHost.getBoundingClientRect();
    targetX = (e.clientX - r.left) / r.width;
    targetY = (e.clientY - r.top) / r.height;
    targetColor = hues[p];
    requestAura();
  });
  card.addEventListener("pointerleave", () => {
    if (active >= 0) focusAura(active);
  });
});
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) lifting?.finish();
  requestAura();
});
cards.forEach((card, p) => {
  render(p);
  card.addEventListener("click", (event) => {
    if (active !== p) select(p);
    else if (!(event.target as Element).closest("[data-grid], button"))
      deselect();
  });
  card.addEventListener("keydown", (e) => {
    if (e.target !== card || !["Enter", " "].includes(e.key)) return;
    e.preventDefault();
    if (active === p) deselect();
    else {
      select(p);
      cells[p][0].focus({ preventScroll: true });
    }
  });
  card.addEventListener("pointermove", (e) => {
    if (
      e.pointerType !== "mouse" ||
      drawing ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const r = card.getBoundingClientRect();
    card.style.setProperty(
      "--rx",
      `${(-(e.clientY - r.top - r.height / 2) / r.height) * 16}deg`,
    );
    card.style.setProperty(
      "--ry",
      `${((e.clientX - r.left - r.width / 2) / r.width) * 20}deg`,
    );
  });
  card.addEventListener("pointerleave", () => {
    card.style.removeProperty("--rx");
    card.style.removeProperty("--ry");
  });
  grids[p].addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || active !== p) return;
    const target = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-pixel]",
    );
    if (!target) return;
    snapshot();
    drawing = true;
    card.dataset.drawing = "true";
    paint(p, Number(target.dataset.pixel));
    grids[p].setPointerCapture(e.pointerId);
  });
  grids[p].addEventListener("pointermove", (e) => {
    if (!drawing || p !== active) return;
    const target = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLButtonElement>("[data-pixel]");
    if (target && grids[p].contains(target))
      paint(p, Number(target.dataset.pixel));
  });
  cells[p].forEach((cell, i) => {
    cell.addEventListener("click", (e) => {
      if (e.detail === 0 && active === p) {
        snapshot();
        paint(p, i);
      }
    });
    cell.addEventListener("focus", () => {
      cells[p].forEach((c) => (c.tabIndex = -1));
      cell.tabIndex = 0;
    });
    cell.addEventListener("keydown", (e) => {
      const move: Record<string, number> = {
        ArrowLeft: -1,
        ArrowRight: 1,
        ArrowUp: -16,
        ArrowDown: 16,
      };
      if (!(e.key in move)) return;
      e.preventDefault();
      if (
        (e.key === "ArrowLeft" && i % 16 === 0) ||
        (e.key === "ArrowRight" && i % 16 === 15)
      )
        return;
      cells[p][i + move[e.key]]?.focus();
    });
  });
});
window.addEventListener("pointerup", stop);
window.addEventListener("pointercancel", stop);
window.addEventListener("blur", stop);
document.querySelectorAll<HTMLButtonElement>("[data-color]").forEach((button) =>
  button.addEventListener("click", () => {
    selected = button.dataset.color!;
    grids.forEach((grid) => {
      grid.style.setProperty("--brush", selected || "transparent");
      grid.dataset.erase = String(!selected);
    });
    document
      .querySelectorAll("[data-color]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    status.textContent = `${button.getAttribute("aria-label")} selected.`;
  }),
);
document.querySelector("#undo-art")!.addEventListener("click", () => {
  const previous = history[active].pop();
  if (previous) {
    art[active] = previous;
    render(active);
    select(active);
    status.textContent = "Last stroke undone.";
  }
});
document.querySelector("#clear-art")!.addEventListener("click", () => {
  snapshot();
  art[active] = Array(256).fill("");
  render(active);
  status.textContent = "A fresh canvas. Undo brings your pixels back.";
});
document.querySelector("#reset-art")!.addEventListener("click", () => {
  snapshot();
  art[active] = [...seeds[active]];
  render(active);
  status.textContent = "Original artwork restored.";
});

const dialog = document.querySelector<HTMLDialogElement>("#pass-dialog")!;
const form = document.querySelector<HTMLFormElement>("#pass-form")!;
const input = document.querySelector<HTMLInputElement>("#player-name")!;
let player = "";
let exportPass = 0;
let lifting: ReturnType<typeof tearTicket> | null = null;
let sourceStub: HTMLButtonElement | null = null;
let liftGeneration = 0;
new IntersectionObserver(
  (entries) => {
    editor.dataset.onscreen = String(entries[0].isIntersecting);
  },
  { threshold: 0 },
).observe(stage);
cards.forEach((card, p) =>
  card
    .querySelector<HTMLButtonElement>("[data-confirm]")!
    .addEventListener("click", async (e) => {
      e.stopPropagation();
      if (dialog.open) return;
      if (active !== p) {
        select(p);
        return;
      }
      stop();
      card.dataset.peeling = "true";
      exportPass = p;
      sourceStub = e.currentTarget as HTMLButtonElement;
      form.hidden = false;
      document.querySelector<HTMLElement>("#pass-result")!.hidden = true;
      dialog.style.setProperty("--ticket-paper", papers[p]);
      dialog.style.setProperty("--ticket-ink", p === 2 ? cream : ink);
      document.querySelector("#modal-edition")!.textContent =
        `16-BIT CON / ${names[p].toUpperCase()} / ALL ACCESS`;
      const generation = ++liftGeneration;
      dialog.dataset.lifting = "true";
      const content = dialog.querySelector<HTMLElement>(
        ".ticket-modal-content",
      )!;
      content.inert = true;
      editor.hidden = true;
      dialog.showModal();
      lifting = tearTicket(sourceStub, card, dialog, reducedMotion.matches);
      await lifting.finished;
      if (generation !== liftGeneration || !dialog.open) return;
      lifting = null;
      delete dialog.dataset.lifting;
      content.inert = false;
      if (!reducedMotion.matches)
        content.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
      input.focus();
    }),
);
dialog.addEventListener("close", () => {
  liftGeneration++;
  lifting?.cancel();
  lifting = null;
  delete dialog.dataset.lifting;
  dialog.querySelector<HTMLElement>(".ticket-modal-content")!.inert = false;
  cards.forEach((card) => {
    delete card.dataset.detached;
    delete card.dataset.peeling;
    card
      .querySelector<HTMLElement>(".pass-paper")!
      .style.removeProperty("--torn-outline");
  });
  editor.hidden = active < 0;
  sourceStub?.focus();
});
dialog
  .querySelector(".close-dialog")!
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (e) => {
  if (e.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom
  )
    dialog.close();
});
input.addEventListener("input", () => input.setCustomValidity(""));
form.addEventListener("submit", (e) => {
  e.preventDefault();
  player = input.value.trim();
  if (!player) {
    input.setCustomValidity("Enter a player name.");
    input.reportValidity();
    return;
  }
  form.hidden = true;
  document.querySelector<HTMLElement>("#pass-result")!.hidden = false;
  document.querySelector("#pass-message")!.textContent =
    `${player}, your ${names[exportPass]} pass is ready, pixels and all.`;
  document.querySelector<HTMLButtonElement>("#download-pass")!.focus();
});
document
  .querySelector("#download-pass")!
  .addEventListener("click", async () => {
    await document.fonts.ready;
    const p = exportPass;
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1120;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = papers[p];
    ctx.fillRect(0, 0, 720, 1120);
    // Square perforations keep the souvenir in the same pixel language as the live pass.
    for (let y = 0; y < 1120; y += 36) {
      ctx.clearRect(0, y, 12, 16);
      ctx.clearRect(708, y, 12, 16);
    }
    for (let x = 0; x < 720; x += 36) {
      ctx.clearRect(x, 0, 16, 12);
      ctx.clearRect(x, 1108, 16, 12);
    }
    if (p === 1) ctx.clearRect(314, 24, 92, 12);
    if (p === 2) {
      for (const [x, y] of [
        [0, 0],
        [672, 0],
        [0, 1072],
        [672, 1072],
      ]) {
        ctx.clearRect(x, y, 48, 24);
        ctx.clearRect(x + (x === 0 ? 0 : 24), y + (y === 0 ? 24 : -24), 24, 48);
      }
    }
    const foreground = p === 2 ? cream : ink;
    ctx.fillStyle = foreground;
    ctx.font = `20px ${token("font-mono")}`;
    ctx.fillText("VEGA PRESENTS / ALL ACCESS", 48, 66);
    ctx.font = `92px ${token("font-display")}`;
    ctx.fillText("16-Bit Con", 44, 175);
    ctx.font = `18px ${token("font-mono")}`;
    ctx.fillText("3–5 OCT 2026 / JAVITS CENTER, NY", 48, 220);
    art[p].forEach((color, i) => {
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(104 + (i % 16) * 32, 266 + Math.floor(i / 16) * 32, 32, 32);
    });
    ctx.fillStyle = foreground;
    ctx.font = `52px ${token("font-display")}`;
    ctx.fillText(names[p], 48, 850);
    ctx.font = `30px ${token("font-body")}`;
    while (ctx.measureText(player).width > 620) {
      const size = Number(ctx.font.split("px")[0]) - 1;
      ctx.font = `${size}px ${token("font-body")}`;
    }
    ctx.fillText(player, 48, 900);
    for (let x = 12; x < 708; x += 22) ctx.fillRect(x, 937, 12, 2);
    ctx.clearRect(0, 923, 20, 30);
    ctx.clearRect(700, 923, 20, 30);
    for (let i = 0; i < 70; i++)
      ctx.fillRect(48 + i * 4, 974, i % 3 === 0 ? 3 : 1, 55);
    ctx.font = `15px ${token("font-mono")}`;
    ctx.fillText("SOUVENIR PASS / FICTIONAL EVENT", 48, 1070);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `16-bit-con-${names[p].toLowerCase().replaceAll(" ", "-")}-pass.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, "image/png");
  });
