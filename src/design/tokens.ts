import definitions from "./tokens.json";
export function token(name: keyof typeof definitions): string {
  let value: string = definitions[name];
  while (value.startsWith("var(--"))
    value = definitions[value.slice(6, -1) as keyof typeof definitions];
  return value;
}
export const paintColors = [
  { c: token("color-pixel-leaf"), n: "Leaf green" },
  { c: token("color-pixel-flower"), n: "Florets yellow" },
  { c: token("color-pixel-lime"), n: "Lime green" },
  { c: token("color-pixel-dark"), n: "Outline black" },
  { c: token("color-pixel-light"), n: "Daisy white" },
  { c: "", n: "Eraser" },
];
export const ticketPapers = [
  "color-ticket-day",
  "color-ticket-score",
  "color-ticket-night",
].map((name) => token(name as keyof typeof definitions));
