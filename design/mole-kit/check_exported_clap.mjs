// Usage: node check_exported_clap.mjs /absolute/path/to/node_modules/three
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const three = process.argv[2];
if (!three) throw Error("Pass the installed Three.js package directory");
const THREE = await import(
  pathToFileURL(path.join(three, "build/three.module.js"))
);
const { GLTFLoader } = await import(
  pathToFileURL(path.join(three, "examples/jsm/loaders/GLTFLoader.js"))
);
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, "../../public/mole-kit");
const manifest = JSON.parse(
  await fs.readFile(path.join(dir, "manifest.json"), "utf8"),
);
const results = [];
for (const c of manifest.characters) {
  const bytes = await fs.readFile(path.join(dir, c.file));
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  gltf.scene.updateMatrixWorld(true);
  let skeleton;
  gltf.scene.traverse((o) => {
    if (o.isSkinnedMesh) skeleton = o.skeleton;
  });
  const indices = ["L", "R"].map((s) =>
    skeleton.bones.findIndex(
      (b) => b.name === "arm" + s || b.name === "arm." + s,
    ),
  );
  if (indices.some((i) => i < 0)) throw Error("Missing arm bone");
  const mixer = new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(gltf.animations.find((a) => a.name === "Clap")).play();
  const poses = [];
  for (let frame = 0; frame <= 36; frame++) {
    mixer.setTime(frame / 24);
    gltf.scene.updateMatrixWorld(true);
    const paws = indices.map((i, n) =>
      new THREE.Vector3(n === 0 ? 0.75 : -0.75, 1.1, 0.1)
        .applyMatrix4(skeleton.boneInverses[i])
        .applyMatrix4(skeleton.bones[i].matrixWorld),
    );
    if (paws.some((p) => p.z < 0.85 || p.y < 1.3 || p.y > 1.7))
      throw Error(
        "Exported paw left the front-of-chest region: " +
          c.id +
          " frame " +
          frame,
      );
    poses.push({
      frame,
      gap: paws[0].distanceTo(paws[1]),
      minimumForward: Math.min(...paws.map((p) => p.z)),
    });
  }
  const min = Math.min(...poses.map((p) => p.gap)),
    max = Math.max(...poses.map((p) => p.gap));
  if (min >= 0.4 || max <= 0.85) throw Error("Paws do not clap: " + c.id);
  results.push({
    file: c.file,
    framesTested: 37,
    minPawCenterDistance: min,
    maxPawCenterDistance: max,
    minimumForward: Math.min(...poses.map((p) => p.minimumForward)),
    result: "PASS",
  });
}
await fs.writeFile(
  path.join(here, "exported-clap-validation.json"),
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
