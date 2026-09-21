import * as THREE from "three";
import { GLTFLoader } from "/drafts/convention-hero/vendor/GLTFLoader.js";
import { PixelOutlineRenderer } from "/drafts/convention-hero/PixelOutlineRenderer.js";

const host = document.getElementById("con-world");
if (host)
  boot().catch((error) => {
    console.error("Convention scene:", error);
    document.getElementById("con-world-note").textContent =
      "Our little crew is here. The interactive scene couldn’t load.";
    document.getElementById("con-fallback").hidden = false;
    host.querySelector("canvas")?.remove();
  });
async function boot() {
  const $ = (id) => document.getElementById(id);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let motion = !reduced.matches,
    visible = true,
    ready = false,
    elapsed = 0,
    partyUntil = 0,
    selected = null,
    hovered = null,
    ambientAt = 9;
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.BasicShadowMap;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#fffaeb");
  const camera = new THREE.OrthographicCamera(-10, 10, 4, -4, 0.1, 60);
  const aim = new THREE.Vector3(0, 0.55, 0),
    baseCamera = new THREE.Vector3(10, 10, 16);
  camera.position.copy(baseCamera);
  camera.lookAt(aim);
  const pixel = new PixelOutlineRenderer(renderer, scene, camera);
  pixel.material.uniforms.creaseStrength.value = 0.2;
  const sun = new THREE.DirectionalLight(0xfff3df, 2.6);
  sun.position.set(-6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(512, 512);
  Object.assign(sun.shadow.camera, {
    left: -10,
    right: 10,
    top: 8,
    bottom: -8,
    near: 0.1,
    far: 35,
  });
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xfffaeb, 0x71744d, 0.8));
  const ramp = new THREE.DataTexture(
    new Uint8Array([55, 145, 255]),
    3,
    1,
    THREE.RedFormat,
  );
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const materials = new Map();
  function material(color) {
    const key = color instanceof THREE.Color ? color.getHex() : color;
    if (!materials.has(key))
      materials.set(
        key,
        new THREE.MeshToonMaterial({ color, gradientMap: ramp }),
      );
    return materials.get(key);
  }
  function box(x, y, z, w, h, d, color, parent = scene) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function sign(text, x, y, z, w, bg = "#0d5500", fg = "#fffaeb") {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 40;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 128, 40);
    ctx.fillStyle = fg;
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 64, 21);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(w, (w * 40) / 128),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    plane.position.set(x, y, z);
    scene.add(plane);
    return plane;
  }
  // A small convention plaza, built in world units so the characters actually inhabit it.
  box(0, -0.23, 0, 13, 0.45, 6.7, 0x477344);
  box(0, 0.015, 0, 13.04, 0.07, 6.74, 0xe5e8c4);
  box(0, 0.059, 0.9, 11.4, 0.012, 1.05, 0xf7d653);
  for (let i = -5; i <= 5; i++)
    for (let j = -2; j <= 2; j++)
      if ((i + j) % 2 === 0 && j !== 1)
        box(i * 1.05, 0.057, j * 1.12, 0.97, 0.008, 1.02, 0xdce2b9);
  box(0, -0.31, 3.45, 3.4, 0.23, 0.42, 0x658d4d);
  box(0, -0.46, 3.78, 3.8, 0.15, 0.3, 0x8aa563);
  for (const x of [-5.65, 5.65]) {
    box(x, 0.17, -2.35, 0.78, 0.32, 0.78, 0xe6bc71);
    box(x, 0.7, -2.35, 0.18, 1, 0.18, 0x926b39);
    box(x, 1.45, -2.35, 1.12, 0.75, 0.9, 0x508845);
    box(x, 1.88, -2.35, 0.77, 0.35, 0.68, 0x79a450);
    box(x, 1.44, -2.47, 0.95, 0.6, 0.85, 0x5d963d);
  }
  const arcadeScreens = [];
  for (const [x, color] of [
    [3.6, 0x8061a4],
    [4.65, 0x297e68],
  ]) {
    box(x, 0.79, -1.85, 0.88, 1.58, 0.68, color);
    box(x, 1.6, -1.78, 0.96, 0.18, 0.8, 0xf6cc3b);
    box(x, 1.15, -1.492, 0.65, 0.58, 0.025, 0x102821);
    const screen = box(x, 1.16, -1.469, 0.52, 0.42, 0.015, 0x8dcaff);
    screen.material = new THREE.MeshBasicMaterial({ color: 0x8dcaff });
    arcadeScreens.push(screen);
    box(x, 0.73, -1.38, 0.87, 0.12, 0.4, color);
    box(x - 0.2, 0.84, -1.32, 0.06, 0.16, 0.06, 0x183b27);
    box(x + 0.17, 0.81, -1.32, 0.13, 0.035, 0.1, 0xff7850);
    sign("PLAY", x, 1.62, -1.36, 0.6, "#ffd11b", "#183b27");
  }
  // Bench and a makers' table.
  box(-4.25, 0.38, -1.8, 1.85, 0.15, 0.68, 0xb2c58c);
  box(-4.25, 0.88, -2.06, 1.85, 0.8, 0.12, 0x8da96e);
  for (const x of [-4.95, -3.55])
    box(x, 0.17, -1.8, 0.13, 0.38, 0.48, 0x5e7d4e);
  box(-3.5, 0.78, -0.55, 1.35, 0.14, 0.65, 0xefb782);
  for (const x of [-4, -3]) box(x, 0.4, -0.55, 0.09, 0.75, 0.42, 0x9f764f);
  box(-3.5, 0.88, -0.55, 0.42, 0.065, 0.31, 0xfffaeb);
  box(-3.14, 0.9, -0.5, 0.12, 0.17, 0.13, 0x9166ba);
  // Pixel sculpture and low convention signage.
  const star = new THREE.Group();
  scene.add(star);
  star.position.set(0.05, 1.35, -2.15);
  const pattern = ["00100", "01110", "11111", "01110", "00100"];
  pattern.forEach((row, r) =>
    [...row].forEach((bit, c) => {
      if (bit === "1")
        box(
          (c - 2) * 0.22,
          (2 - r) * 0.22,
          0,
          0.22,
          0.22,
          0.24,
          0xffd11b,
          star,
        );
    }),
  );
  box(0.05, 0.38, -2.15, 1.15, 0.72, 0.65, 0x1c6648);
  sign("16 BIT", 0.05, 0.43, -1.813, 0.83);
  for (const [x, label, color] of [
    [-2.65, "MAKE", "#8dcaff"],
    [2.3, "PLAY", "#ffd11b"],
  ]) {
    box(x, 1.1, -2.9, 0.055, 2.2, 0.055, 0x446334);
    sign(label, x + 0.45, 1.98, -2.88, 0.95, color, "#153b26");
  }
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    mouse = new THREE.Vector2();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.37, 0.45, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd11b, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.082;
  ring.visible = false;
  scene.add(ring);
  const destination = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.22, 12),
    new THREE.MeshBasicMaterial({ color: 0x0d5500, side: THREE.DoubleSide }),
  );
  destination.rotation.x = -Math.PI / 2;
  destination.position.y = 0.085;
  destination.visible = false;
  scene.add(destination);
  const specs = [
    {
      id: "classic",
      name: "Pico",
      pos: [-1.1, 0, 0.65],
      angle: 1.2,
      idle: "Chat",
      line: "Oh hey, player one!",
      reply: "Player two, reporting in.",
      react: "Wave",
    },
    {
      id: "crew",
      name: "Chip",
      pos: [0.45, 0, 0.65],
      angle: -1.2,
      idle: "Chat",
      line: "You’re on the list.",
      reply: "Best guest list ever.",
      react: "Point",
    },
    {
      id: "propeller",
      name: "Dot",
      pos: [2.35, 0, 1.72],
      angle: -0.5,
      idle: "Walk",
      line: "Tiny hat. Huge energy.",
      reply: "Save some pixels for us!",
      react: "Cheer",
    },
    {
      id: "superfan",
      name: "Patch",
      pos: [-3.2, 0, 1.7],
      angle: 0.6,
      idle: "Idle",
      line: "New best friend unlocked.",
      reply: "See you at the arcade?",
      react: "Wave",
    },
    {
      id: "gamer",
      name: "Byte",
      pos: [3.58, 0, -0.48],
      angle: Math.PI,
      idle: "Idle",
      line: "NEW HIGH SCORE!",
      reply: "That deserves a round of applause.",
      react: "Cheer",
    },
    {
      id: "artist",
      name: "Pip",
      pos: [-4.35, 0.26, -1.74],
      angle: 0.2,
      idle: "Sleep",
      line: "I was… rendering.",
      reply: "Take your time, little pixel.",
      react: "Wave",
    },
  ];
  const actors = [],
    bubbles = [],
    met = new Set();
  const loader = new GLTFLoader();
  const gltfs = await Promise.all(
    specs.map((a) => loader.loadAsync("/drafts/convention-hero/" + a.id + ".glb")),
  );
  for (let i = 0; i < specs.length; i++) {
    const a = {
      ...specs[i],
      root: new THREE.Group(),
      until: 0,
      goal: null,
      home: new THREE.Vector3(...specs[i].pos),
      current: null,
    };
    const gltf = gltfs[i];
    a.model = gltf.scene;
    a.model.scale.setScalar(0.67);
    a.root.add(a.model);
    a.root.position.copy(a.home);
    a.root.rotation.y = a.angle;
    scene.add(a.root);
    a.model.traverse((o) => {
      if (o.isMesh) {
        o.material = material(o.material.color);
        o.castShadow = true;
        o.receiveShadow = false;
        o.userData.actor = a;
      }
    });
    a.mixer = new THREE.AnimationMixer(a.model);
    a.actions = Object.fromEntries(
      gltf.animations.map((c) => [c.name, a.mixer.clipAction(c)]),
    );
    actors.push(a);
    play(a, a.idle);
    a.mixer.update(i * 0.21);
  }
  function play(a, name) {
    const next = a.actions[name] || a.actions.Idle;
    if (next === a.current) return;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    if (a.current) next.crossFadeFrom(a.current, 0.22, false);
    a.current = next;
  }
  function face(a, p) {
    a.root.rotation.y = Math.atan2(
      p.x - a.root.position.x,
      p.z - a.root.position.z,
    );
  }
  function say(a, text, seconds = 3.5) {
    const old = bubbles.find((b) => b.actor === a);
    if (old) {
      old.el.remove();
      bubbles.splice(bubbles.indexOf(old), 1);
    }
    const el = document.createElement("div");
    el.className = "con-bubble";
    el.textContent = text;
    $("con-bubbles").append(el);
    bubbles.push({ el, actor: a, until: elapsed + seconds });
  }
  const particles = [];
  const particleGeometry = new THREE.BoxGeometry(0.055, 0.055, 0.055);
  const particleMats = [0xffd11b, 0x8dcaff, 0xe87964, 0x538b4a, 0xa37bc2].map(
    (c) => new THREE.MeshBasicMaterial({ color: c }),
  );
  function burst(position, count = 18) {
    if (!motion) return;
    for (let i = 0; i < count && particles.length < 100; i++) {
      const p = new THREE.Mesh(particleGeometry, particleMats[i % 5]);
      p.position.copy(position).add(new THREE.Vector3(0, 1.2, 0));
      scene.add(p);
      particles.push({
        mesh: p,
        v: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          2 + Math.random() * 1.8,
          (Math.random() - 0.5) * 2,
        ),
        life: 1.7 + Math.random() * 0.5,
      });
    }
  }
  function meet(id) {
    if (!ready) return;
    const a = actors.find((a) => a.id === id);
    selected = a;
    met.add(id);
    document.querySelectorAll("[data-meet]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.meet === id));
      b.dataset.met = String(met.has(b.dataset.meet));
      b.querySelector(".local-check").textContent = met.has(b.dataset.meet)
        ? "✓"
        : "+";
    });
    $("con-progress").textContent =
      met.size === 6
        ? "6 / 6 — you found your people!"
        : `${met.size} / 6 friends met`;
    a.goal = null;
    destination.visible = false;
    face(a, camera.position);
    play(a, a.react);
    a.until = elapsed + 4.5;
    say(a, a.line);
    const friend = actors
      .filter((b) => b !== a && b.id !== "artist")
      .sort(
        (b, c) =>
          b.root.position.distanceTo(a.root.position) -
          c.root.position.distanceTo(a.root.position),
      )[0];
    face(friend, a.root.position);
    friend.goal = null;
    play(friend, id === "gamer" ? "Clap" : "Wave");
    friend.until = elapsed + 4.5;
    say(friend, a.reply, 4);
    $("con-response").textContent = `${a.name}: ${a.line}`;
    burst(a.root.position, id === "gamer" ? 28 : 14);
    if (id === "gamer")
      arcadeScreens.forEach((s) => s.material.color.set(0xffd11b));
    if (!motion) {
      a.mixer.update(0.4);
      friend.mixer.update(0.4);
    }
    if (met.size === 6 && !host.dataset.allMet) {
      host.dataset.allMet = "true";
      party();
      $("con-response").textContent =
        "All six friends found. This party is for you.";
    }
  }
  function party() {
    if (!ready) return;
    partyUntil = elapsed + 7;
    destination.visible = false;
    actors.forEach((a, i) => {
      a.goal = null;
      face(a, camera.position);
      play(a, i % 2 ? "Dance" : "Cheer");
      a.until = partyUntil;
      burst(a.root.position, 13);
      if (!motion) a.mixer.update(0.4);
    });
    say(actors[0], "Everybody, do the pixel shuffle!", 4);
    say(actors[2], "My time has come.", 4.7);
    $("con-response").textContent = motion
      ? "A little less small talk. A little more pixel shuffle."
      : "Everybody’s in their party pose. Enable motion to see them dance.";
    $("con-party").setAttribute("aria-pressed", "true");
  }
  function pick(event) {
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - r.left) / r.width) * 2 - 1,
      (-(event.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    return ray
      .intersectObjects(
        actors.map((a) => a.model),
        true,
      )
      .find((hit) => hit.object.userData.actor)?.object.userData.actor;
  }
  let pointerStart = null;
  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (e.isPrimary && e.button === 0)
      pointerStart = { x: e.clientX, y: e.clientY };
  });
  renderer.domElement.addEventListener(
    "pointercancel",
    () => (pointerStart = null),
  );
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (!pointerStart) return;
    const moved = Math.hypot(
      e.clientX - pointerStart.x,
      e.clientY - pointerStart.y,
    );
    pointerStart = null;
    if (moved > 8) return;
    const hit = pick(e);
    if (hit) {
      meet(hit.id);
      return;
    }
    const p = ray.ray.intersectPlane(ground, new THREE.Vector3());
    if (!p || Math.abs(p.x) > 5.4 || p.z < 0.1 || p.z > 2.7) return;
    const a =
      selected && selected.id !== "artist"
        ? selected
        : actors.find((a) => a.id === "propeller");
    selected = a;
    a.until = 0;
    a.goal = new THREE.Vector3(
      THREE.MathUtils.clamp(p.x, -5, 5),
      a.home.y,
      THREE.MathUtils.clamp(p.z, 0.2, 2.5),
    );
    destination.position.set(a.goal.x, 0.085, a.goal.z);
    destination.visible = true;
    play(a, "Walk");
    face(a, a.goal);
    $("con-response").textContent =
      `${a.name} is coming over. Good company, one tiny step at a time.`;
    if (!motion) {
      a.root.position.copy(a.goal);
      a.goal = null;
      play(a, "Wave");
      a.mixer.update(0.4);
      destination.visible = false;
    }
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    hovered = pick(e) || null;
    renderer.domElement.style.cursor = hovered ? "pointer" : "crosshair";
    const r = host.getBoundingClientRect();
    mouse.set(
      (e.clientX - r.left) / r.width - 0.5,
      (e.clientY - r.top) / r.height - 0.5,
    );
  });
  renderer.domElement.addEventListener("pointerleave", () => {
    hovered = null;
    mouse.set(0, 0);
    pointerStart = null;
  });
  document.querySelectorAll("[data-meet]").forEach((b) => {
    b.disabled = false;
    b.addEventListener("click", () => meet(b.dataset.meet));
  });
  $("con-party").disabled = false;
  $("con-party").addEventListener("click", party);
  function motionUI() {
    $("con-motion").innerHTML = motion
      ? '<span aria-hidden="true">Ⅱ</span> Pause'
      : '<span aria-hidden="true">▷</span> Play';
    $("con-motion").setAttribute(
      "aria-label",
      motion ? "Pause scene motion" : "Play scene motion",
    );
    $("con-motion").setAttribute("aria-pressed", String(!motion));
  }
  $("con-motion").disabled = false;
  $("con-motion").addEventListener("click", () => {
    motion = !motion;
    motionUI();
  });
  reduced.addEventListener("change", (e) => {
    motion = !e.matches;
    motionUI();
  });
  motionUI();
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    const pixels = w < 600 ? 2 : 2.5;
    const rw = Math.floor(w / pixels),
      rh = Math.floor(h / pixels);
    renderer.setSize(rw, rh, false);
    pixel.setSize(rw, rh);
    const halfWidth = w < 600 ? 7.8 : 10.2;
    const halfHeight = (halfWidth * h) / w;
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
    },
    { rootMargin: "80px" },
  ).observe(host);
  function project(position) {
    const p = position.clone().project(camera);
    return {
      x: (p.x * 0.5 + 0.5) * host.clientWidth,
      y: (-p.y * 0.5 + 0.5) * host.clientHeight,
    };
  }
  function overlays() {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if (elapsed > b.until) {
        b.el.remove();
        bubbles.splice(i, 1);
        continue;
      }
      const p = project(
        b.actor.root.position.clone().add(new THREE.Vector3(0, 2.2, 0)),
      );
      b.el.style.left =
        Math.max(90, Math.min(host.clientWidth - 90, p.x)) + "px";
      b.el.style.top = Math.max(45, p.y) + "px";
    }
    const a = hovered || selected;
    ring.visible = !!a;
    if (a) ring.position.set(a.root.position.x, 0.083, a.root.position.z);
    const tooltip = $("con-tooltip");
    tooltip.hidden = !hovered;
    if (hovered) {
      const p = project(
        hovered.root.position.clone().add(new THREE.Vector3(0, 2.32, 0)),
      );
      tooltip.textContent = `${hovered.name} · Say hello`;
      tooltip.style.left =
        Math.max(70, Math.min(host.clientWidth - 70, p.x)) + "px";
      tooltip.style.top = Math.max(36, p.y) + "px";
    }
  }
  ready = true;
  $("con-fallback").hidden = true;
  $("con-world-note").textContent =
    "Six little personalities. A few happy accidents.";
  // The live region only changes after input; ambient dialogue remains visual.
  let lastRender = 0;
  renderer.setAnimationLoop((now) => {
    if (!visible || document.hidden || now - lastRender < 32) return;
    const step = Math.min((now - lastRender) / 1000, 0.066);
    lastRender = now;
    elapsed += step;
    if (motion) {
      for (const a of actors) {
        if (a.goal && elapsed > partyUntil) {
          const delta = a.goal.clone().sub(a.root.position);
          if (delta.length() < 0.06) {
            a.home.copy(a.root.position);
            a.goal = null;
            destination.visible = false;
            play(a, "Wave");
            a.until = elapsed + 2;
            say(a, "Hey, good spot.", 2);
          } else {
            a.root.position.addScaledVector(delta.normalize(), step * 1.3);
            face(a, a.goal);
          }
        } else if (a.until && elapsed > a.until) {
          a.until = 0;
          play(a, a.idle);
          a.root.rotation.y = a.angle;
          if (a.id === "gamer")
            arcadeScreens.forEach((s) => s.material.color.set(0x8dcaff));
        }
        if (
          a.id === "propeller" &&
          !a.until &&
          !a.goal &&
          elapsed > partyUntil
        ) {
          a.root.position.x = a.home.x + Math.sin(elapsed * 0.32) * 0.63;
          a.root.position.z = a.home.z + Math.cos(elapsed * 0.32) * 0.24;
          a.root.rotation.y = Math.atan2(
            Math.cos(elapsed * 0.32) * 0.63,
            -Math.sin(elapsed * 0.32) * 0.24,
          );
        }
        a.mixer.update(step);
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= step;
        p.v.y -= step * 4;
        p.mesh.position.addScaledVector(p.v, step);
        p.mesh.rotation.x += step * 3;
        p.mesh.rotation.z += step * 2;
        if (p.life < 0 || p.mesh.position.y < 0.08) {
          scene.remove(p.mesh);
          particles.splice(i, 1);
        }
      }
      const target = baseCamera
        .clone()
        .add(new THREE.Vector3(mouse.x * 0.42, mouse.y * 0.16, 0));
      camera.position.lerp(target, 0.035);
      camera.lookAt(aim);
      if (elapsed > ambientAt && elapsed > partyUntil) {
        ambientAt = elapsed + 12;
        const sleepy = actors.find((a) => a.id === "artist");
        if (!sleepy.until && !sleepy.goal) say(sleepy, "z z z", 3);
        else say(actors[0], "Have you tried the arcade?", 3);
      }
    }
    if (partyUntil && elapsed > partyUntil) {
      partyUntil = 0;
      $("con-party").setAttribute("aria-pressed", "false");
    }
    overlays();
    pixel.render();
  });
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    $("con-fallback").hidden = false;
    $("con-world-note").textContent =
      "The scene paused. Reload to bring the moles back.";
    renderer.setAnimationLoop(null);
  });
  // Small read-only diagnostics are useful when checking the integration locally.
  host.dataset.loaded = "true";
}
