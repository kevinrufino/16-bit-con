// Run: NODE_PATH=/path/to/node_modules node design/mole-kit/validate_glbs.cjs
const fs = require("fs"),
  path = require("path"),
  validator = require("gltf-validator");
const dir = path.resolve(__dirname, "../../public/mole-kit");
(async () => {
  const reports = [];
  for (const id of JSON.parse(
    fs.readFileSync(path.join(dir, "manifest.json"), "utf8"),
  ).characters.flatMap((c) =>
    c.eyewear.map((e) => e.file.replace(/\.glb$/, "")),
  )) {
    const bytes = fs.readFileSync(path.join(dir, id + ".glb"));
    const doc = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
    const report = await validator.validateBytes(new Uint8Array(bytes), {
      uri: id + ".glb",
    });
    if (
      doc.animations.length !== 13 ||
      doc.skins.length !== 1 ||
      doc.skins[0].joints.length !== 8
    )
      throw Error("Incorrect rig or clip count: " + id);
    const row = {
      file: id + ".glb",
      bytes: bytes.length,
      meshCount: doc.meshes.length,
      primitives: doc.meshes.reduce((s, m) => s + m.primitives.length, 0),
      clips: doc.animations.map((a) => a.name),
      errors: report.issues.numErrors,
      warnings: report.issues.numWarnings,
      messages: report.issues.messages,
    };
    reports.push(row);
    console.log(
      id,
      bytes.length + " bytes",
      row.errors + " errors",
      row.warnings + " warnings",
    );
  }
  fs.writeFileSync(
    path.join(__dirname, "validation.json"),
    JSON.stringify(reports, null, 2),
  );
  if (reports.some((r) => r.errors)) process.exitCode = 1;
})();
