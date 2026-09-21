import * as THREE from "three";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import { PixelOutlineRenderer } from "./PixelOutlineRenderer.js";
const $ = (id) => document.getElementById(id);
const stage = $("stage"),
  scene = new THREE.Scene();
scene.background = new THREE.Color("#fff2cd");
const camera = new THREE.OrthographicCamera(-3, 3, 2.3, -2.3, 0.1, 30);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
stage.appendChild(renderer.domElement);
renderer.domElement.setAttribute(
  "aria-label",
  "Mole character. Drag to rotate the view.",
);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minZoom = 0.65;
controls.maxZoom = 1.8;
controls.maxPolarAngle = Math.PI / 2 + 0.05;
controls.target.set(0, 1.35, 0);
function reset() {
  const sprite = $("view").value === "sprite";
  camera.position.set(...(sprite ? [-8, 1.6, 5.8] : [4.3, 3.4, 7]));
  camera.zoom = 1;
  camera.updateProjectionMatrix();
  controls.target.set(0, $("view").value === "sprite" ? 1.55 : 1.5, 0);
  controls.update();
}
reset();
scene.add(new THREE.HemisphereLight(0xfff4db, 0x71516e, 0.65));
const sun = new THREE.DirectionalLight(0xffefd5, 2.2);
sun.position.set(-3, 7, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
sun.shadow.camera.left = -3;
sun.shadow.camera.right = 3;
sun.shadow.camera.top = 4;
sun.shadow.camera.bottom = -3;
sun.shadow.normalBias = 0.035;
sun.shadow.bias = -0.0001;
scene.add(sun);
const ramp = new THREE.DataTexture(
  new Uint8Array([30, 105, 220]),
  3,
  1,
  THREE.RedFormat,
);
ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
ramp.needsUpdate = true;
function toonMaterial(color) {
  const material = new THREE.MeshToonMaterial({ color, gradientMap: ramp });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;",
      `float illumination=dot(reflectedLight.directDiffuse,vec3(.2126,.7152,.0722))/max(.001,dot(diffuseColor.rgb,vec3(.2126,.7152,.0722)));
       vec3 band=illumination>.19?vec3(1.0):vec3(.54,.40,.32);
       vec3 outgoingLight=diffuseColor.rgb*band+totalEmissiveRadiance;`,
    );
  };
  material.customProgramCacheKey = () => "16bit-sprite-palette-v3";
  return material;
}
const floor = new THREE.Mesh(
  new THREE.BoxGeometry(3.5, 0.14, 3.5),
  toonMaterial(0xefb080),
);
floor.position.y = -0.08;
floor.receiveShadow = true;
scene.add(floor);
const pixelRenderer = new PixelOutlineRenderer(renderer, scene, camera);
// A seat provides context for the seated clips; it is not part of the exported character.
const seat = new THREE.Group();
const seatMat = toonMaterial(0x98708d);
function seatBox(x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), seatMat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  seat.add(m);
}
seatBox(0, 0.42, -0.15, 1.2, 0.13, 0.8);
seatBox(0, 0.97, -0.51, 1.2, 0.94, 0.12);
for (const x of [-0.48, 0.48])
  for (const z of [-0.4, 0.12]) seatBox(x, 0.19, z, 0.1, 0.4, 0.1);
scene.add(seat);
seat.visible = false;

let character = "classic",
  eyewear = "goggles";
let manifest,
  model,
  mixer,
  actions = {},
  active,
  paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
  serial = 0;
const cache = new Map(),
  loader = new GLTFLoader();
const labels = {
  classic: "Classic",
  propeller: "Propeller",
  superfan: "Superfan",
  crew: "Crew",
  gamer: "Gamer",
  artist: "Artist",
};
const names = {
  ReferencePose: "Reference pose",
  Idle: "Idle",
  Walk: "Walking",
  SitDown: "Sit down",
  Sitting: "Sitting",
  Sleep: "Sleeping",
  Chat: "Chatting",
  Wave: "Waving",
  Cheer: "Cheering",
  Dance: "Dancing",
  Point: "Pointing",
  InspectBadge: "Check badge",
  Clap: "Clapping",
};
function shading() {
  model?.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = false;
    if (!o.userData.original) {
      o.userData.original = o.material;
      o.userData.toon = toonMaterial(o.material.color);
    }
    o.material = $("toon").checked ? o.userData.toon : o.userData.original;
  });
}
function play(name) {
  if (!actions[name]) return;
  const next = actions[name];
  if (active === next) {
    next.reset();
    return;
  }
  next.reset();
  next.setLoop(
    name === "SitDown" ? THREE.LoopOnce : THREE.LoopRepeat,
    Infinity,
  );
  next.clampWhenFinished = true;
  next.enabled = true;
  next.setEffectiveWeight(1);
  next.play();
  if (active) next.crossFadeFrom(active, 0.22, true);
  active = next;
  seat.visible = ["SitDown", "Sitting", "Sleep"].includes(name);
}
async function choose(id, style = eyewear) {
  character = id;
  $("reference-image").src =
    "./references/" +
    (["propeller", "superfan"].includes(id) ? id : "classic") +
    ".png";
  eyewear = style;
  const ticket = ++serial;
  const key = id + ":" + style;
  const item = manifest.characters.find((c) => c.id === id);
  const option = item.eyewear.find((e) => e.id === style);
  $("status").textContent = "Loading " + labels[id] + "…";
  try {
    let gltf = cache.get(key);
    if (!gltf) {
      gltf = await loader.loadAsync("./" + option.file + "?v=3");
      cache.set(key, gltf);
    }
    if (ticket !== serial) return;
    if (model) {
      scene.remove(model);
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    }
    model = gltf.scene;
    scene.add(model);
    mixer = new THREE.AnimationMixer(model);
    actions = Object.fromEntries(
      gltf.animations.map((a) => [a.name, mixer.clipAction(a)]),
    );
    active = null;
    shading();
    play($("animation").value);
    mixer.update(0);
    mixer.addEventListener("finished", (e) => {
      if (e.action === actions.SitDown) {
        $("animation").value = "Sitting";
        play("Sitting");
      }
    });
    document
      .querySelectorAll("[data-character]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.character === id)),
      );
    $("download").href = option.file;
    $("download").textContent = "Download " + id + " / " + style;
    $("status").textContent =
      `${option.triangles.toLocaleString()} triangles · ${gltf.animations.length} clips · 8 bones`;
    window.moleLab = {
      model,
      mixer,
      actions,
      scene,
      renderer,
      pixelRenderer,
      camera,
      choose,
      play,
    };
  } catch (e) {
    $("status").textContent =
      "Could not load this character. Reload the preview or serve this folder over HTTP.";
    console.error(e);
  }
}
function size() {
  const w = stage.clientWidth * ($("compare").checked ? 0.5 : 1),
    h = stage.clientHeight,
    p = Number($("pixels").value);
  const rw = Math.max(1, Math.floor(w / p)),
    rh = Math.max(1, Math.floor(h / p));
  renderer.setSize(rw, rh, false);
  pixelRenderer.setSize(rw, rh);
  const halfHeight = $("view").value === "sprite" ? 2.1 : 2.3;
  camera.left = (-halfHeight * w) / h;
  camera.right = (halfHeight * w) / h;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
}
function viewMode() {
  floor.visible = $("view").value === "stage";
  stage.classList.toggle("comparing", $("compare").checked);
  renderer.domElement.style.width = $("compare").checked ? "50%" : "100%";
  reset();
  size();
}
$("view").onchange = viewMode;
$("compare").onchange = viewMode;
viewMode();
new ResizeObserver(size).observe(stage);
$("pixels").addEventListener("input", () => {
  $("pixel-value").value = $("pixels").value + " px";
  size();
});
$("toon").addEventListener("change", shading);
$("eyewear").onchange = () => choose(character, $("eyewear").value);
$("outline").oninput = () => {
  pixelRenderer.material.uniforms.outlineStrength.value = Number(
    $("outline").value,
  );
  $("outline-value").value = Math.round(Number($("outline").value) * 100) + "%";
};
$("reset").onclick = reset;
$("animation").onchange = () => play($("animation").value);
$("speed").oninput = () => {
  $("speed-value").value = $("speed").value + "×";
};
function pauseUI() {
  $("pause").textContent = paused ? "Play" : "Pause";
  $("pause").setAttribute("aria-pressed", String(paused));
}
pauseUI();
$("pause").onclick = () => {
  paused = !paused;
  pauseUI();
};
let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!paused) {
    mixer?.update(dt * Number($("speed").value));
    if ($("rotate").checked && model) model.rotation.y += dt * 0.3;
  }
  controls.update();
  pixelRenderer.render();
});
try {
  const response = await fetch("./manifest.json", { cache: "no-store" });
  if (!response.ok) throw Error("Manifest unavailable");
  manifest = await response.json();
  for (const a of manifest.animations) {
    const o = document.createElement("option");
    o.value = a.name;
    o.textContent = names[a.name];
    $("animation").append(o);
  }
  for (const c of manifest.characters) {
    const b = document.createElement("button");
    b.textContent = labels[c.id];
    b.dataset.character = c.id;
    b.setAttribute("aria-pressed", "false");
    b.onclick = () => choose(c.id);
    $("characters").append(b);
  }
  await choose("classic");
} catch (e) {
  $("status").textContent =
    "Preview files could not load. Serve the mole-kit folder over HTTP.";
  console.error(e);
}
