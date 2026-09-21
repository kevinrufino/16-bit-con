import { readFileSync, writeFileSync } from "node:fs";
const tokens = JSON.parse(
  readFileSync(new URL("../src/design/tokens.json", import.meta.url)),
);
writeFileSync(
  new URL("../src/styles/tokens.css", import.meta.url),
  "/* Generated from src/design/tokens.json. Run npm run tokens. */\n:root {\n" +
    Object.entries(tokens)
      .map(([key, value]) => `  --${key}: ${value};`)
      .join("\n") +
    "\n}\n",
);

function resolve(key) {
  const value = tokens[key];
  return value.startsWith("var(--") ? resolve(value.slice(6, -1)) : value;
}
writeFileSync(
  new URL("../public/design-tokens.js", import.meta.url),
  "// Generated from src/design/tokens.json.\nexport const palette = " +
    JSON.stringify(
      Object.fromEntries(
        Object.keys(tokens)
          .filter((key) => key.startsWith("color-"))
          .map((key) => [key, resolve(key)]),
      ),
      null,
      2,
    ) +
    ";\n",
);
