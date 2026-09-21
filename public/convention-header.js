import { palette } from "/design-tokens.js";
import { advanceLifecycle } from "/mole-kit/queue-lifecycle.js";
import * as THREE from "three";
import { createQueueLife, queueAdvances } from "/mole-kit/queue-life.js";
import { queuePoint, QUEUE_LENGTH } from "/mole-kit/queue-path.js";
import { GLTFLoader } from "/mole-kit/vendor/GLTFLoader.js";
import { mergeGeometries } from "/mole-kit/vendor/BufferGeometryUtils.js";
import { PixelOutlineRenderer } from "/mole-kit/PixelOutlineRenderer.js";
import { prepareSkin, createSkin } from "/mole-kit/skinned-crowd.js";

const host = document.getElementById("con-world");
if (host)
  boot().catch((error) => {
    console.error("Conveyor scene:", error);
    document.getElementById("con-fallback").hidden = false;
    document.getElementById("con-world-note").textContent =
      "The crew is here. The interactive queue couldn’t load.";
    host.querySelector("canvas")?.remove();
  });

async function boot() {
  const $ = (id) => document.getElementById(id);
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  // Fixed population for the session. Never allocate new attendees in the loop.
  const count = 20,
    spacing = QUEUE_LENGTH / count;
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.info.autoReset = false;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
  const camera = new THREE.OrthographicCamera(-12, 12, 5, -5, 0.1, 80);
  camera.position.set(-8, 10.5, 23);
  camera.lookAt(-0.6, 1.8, 0);
  const pixel = new PixelOutlineRenderer(renderer, scene, camera);
  pixel.material.uniforms.outlineStrength.value = 1.0;
  pixel.material.uniforms.creaseStrength.value = 0.3;
  renderer.localClippingEnabled = true;
  const groundClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  pixel.normalMaterial.clippingPlanes = [groundClip];
  const ramp = new THREE.DataTexture(
    new Uint8Array([75, 160, 255]),
    3,
    1,
    THREE.RedFormat,
  );
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const toon = new THREE.MeshToonMaterial({
    vertexColors: true,
    gradientMap: ramp,
  });
  const moleMaterial = toon.clone();
  moleMaterial.clippingPlanes = [groundClip];
  scene.add(new THREE.HemisphereLight(palette["color-surface"], palette["color-illustration-shadow"], 1.25));
  const sun = new THREE.DirectionalLight(palette["color-illustration-light"], 2.4);
  sun.position.set(-5, 12, 8);
  scene.add(sun);

  // Only low rope barriers inhabit the cream background. No floor or entrance.
  const rails = [];
  function addRailGeometry(g, color) {
    const c = new THREE.Color(color),
      a = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < a.length; i += 3) c.toArray(a, i);
    g.setAttribute("color", new THREE.BufferAttribute(a, 3));
    g.deleteAttribute("uv");
    rails.push(g);
  }
  function post(x, z) {
    const stem = new THREE.CylinderGeometry(0.035, 0.05, 0.68, 8);
    stem.translate(x, 0.34, z);
    addRailGeometry(stem, palette["color-illustration-rail"]);
    const foot = new THREE.CylinderGeometry(0.15, 0.19, 0.055, 8);
    foot.translate(x, 0.03, z);
    addRailGeometry(foot, palette["color-heading"]);
    const cap = new THREE.SphereGeometry(0.085, 8, 5);
    cap.translate(x, 0.71, z);
    addRailGeometry(cap, palette["color-accent"]);
  }
  function rope(points) {
    const curve = new THREE.CatmullRomCurve3(points);
    addRailGeometry(
      new THREE.TubeGeometry(
        curve,
        Math.max(8, points.length * 5),
        0.047,
        5,
        false,
      ),
      palette["color-heading"],
    );
  }
  // Rope dividers terminate before each U-turn, leaving a continuous walking path.
  for (const [z, left, right] of [
    [-3.3, -7.6, 7],
    [-1.2, -7.6, 6.5],
    [1.2, -6.5, 7.6],
    [3.3, -7, 7.6],
  ]) {
    for (let x = left; x < right - 0.1; x += 2.4) {
      const next = Math.min(x + 2.4, right);
      post(x, z);
      rope([
        new THREE.Vector3(x, 0.7, z),
        new THREE.Vector3((x + next) / 2, 0.54, z),
        new THREE.Vector3(next, 0.7, z),
      ]);
    }
    post(right, z);
  }
  for (const [cx, cz, sign] of [
    [7, -1.2, 1],
    [-7, 1.2, -1],
  ]) {
    const points = [];
    for (let i = 0; i <= 12; i++) {
      const t = (i / 12) * Math.PI;
      points.push(
        new THREE.Vector3(
          cx + sign * 2.1 * Math.sin(t),
          0.68,
          cz - 2.1 * Math.cos(t),
        ),
      );
    }
    rope(points);
    post(cx + sign * 2.1, cz);
  }
  const railGeometry = mergeGeometries(rails, false);
  rails.forEach((g) => g.dispose());
  scene.add(new THREE.Mesh(railGeometry, toon));
  const names = ["classic", "propeller", "superfan", "gamer", "artist", "crew"];
  const sources = await Promise.all(
    names.map((name) =>
      new GLTFLoader().loadAsync("/mole-kit/" + name + ".glb"),
    ),
  );
  const templates = sources.map(prepareSkin);
  const actors = [];
  for (let i = 0; i < count; i++) {
    const skin = createSkin(templates[i % 6], moleMaterial);
    const anchor = skin.root;
    scene.add(anchor);
    const p = queuePoint((i + 0.25) * spacing);
    anchor.position.set(p.x, 0, p.z);
    anchor.updateMatrixWorld(true);
    actors.push({
      anchor,
      skin,
      emerge: 2,
      celebrateStart: -100,
      celebrateUntil: 0,
      exitAge: null,
      gap: 1.2 + Math.random() * 0.28,
      hoverUntil: 0,
      hoverCooldown: 0,
      hoverClip: "Wave",
      headPush: new THREE.Vector3(),
      lingerUntil: 0,
      burrow: null,
      dirtStarted: true,
      activity: "Idle",
      activityStart: 0,
      activityUntil: 0,
      partner: -1,
      facing: p.yaw,
      wiggle: skin,
      s: (i + 0.25) * spacing,
      target: (i + 0.25) * spacing,
      x: p.x,
      z: p.z,
      yaw: p.yaw,
      dx: 0,
      dz: 0,
      vx: 0,
      vz: 0,
      lift: 0,
      vy: 0,
      leanX: 0,
      leanZ: 0,
      gait: 0,
      walking: false,
      scale: 0.6 + (i % 3) * 0.025,
    });
  }
  // Start already packed; personal spacing persists as the queue advances.
  let initialSlot = QUEUE_LENGTH - 1.5;
  for (let i = actors.length - 1; i >= 0; i--) {
    const a = actors[i],
      p = queuePoint(initialSlot);
    a.s = a.target = initialSlot;
    a.x = p.x;
    a.z = p.z;
    a.yaw = a.facing = p.yaw;
    a.anchor.position.set(p.x, 0, p.z);
    a.skin.reset();
    initialSlot -= actors[Math.max(0, i - 1)].gap;
  }
  const queueLife = createQueueLife();
  let queueState = { moving: false, velocity: 0, remaining: 5.5 },
    nextGesture = 0,
    gestureIndex = 0,
    chatsScheduled = false;
  const dirtPool = Array.from({ length: 160 }, () => ({
    born: -100,
    x: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    size: 0,
  }));
  let dirtCursor = 0;
  const dirt = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshToonMaterial({ color: palette["color-illustration-fur"], gradientMap: ramp }),
    dirtPool.length,
  );
  dirt.frustumCulled = false;
  dirt.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(dirt);
  const holeGeometry = new THREE.CircleGeometry(1, 16);
  holeGeometry.rotateX(-Math.PI / 2);
  const holes = new THREE.InstancedMesh(
    holeGeometry,
    new THREE.MeshBasicMaterial({ color: palette["color-illustration-burrow"], side: THREE.DoubleSide }),
    count,
  );
  holes.count = 0;
  holes.frustumCulled = false;
  holes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(holes);
  const dirtPose = new THREE.Object3D();
  function burst(a) {
    for (let j = 0; j < 14; j++) {
      const p = dirtPool[dirtCursor++ % dirtPool.length],
        angle = Math.random() * Math.PI * 2;
      Object.assign(p, {
        born: time,
        x: a.x + a.dx,
        z: a.z + a.dz,
        vx: Math.cos(angle) * (1 + Math.random()),
        vz: Math.sin(angle) * (1 + Math.random()),
        vy: 1.6 + Math.random() * 2,
        size: 0.12 + Math.random() * 0.18,
      });
    }
  }
  function clearActivity(a) {
    a.activity = "Idle";
    a.partner = -1;
    a.activityUntil = 0;
  }
  const exchanges = [
    ["First time at 16-Bit?", "Yep. Already found my people."],
    ["What’s your superpower?", "Perfect pixel placement."],
    ["You brought a controller?", "I brought a spare."],
    ["See you at the arcade?", "Loser buys the snacks."],
    ["Is that a rare pin?", "Traded three snacks for it."],
    ["What are you making?", "A very tiny adventure."],
    ["One more game later?", "You mean twelve more?"],
    ["Nice goggles!", "Thanks. +16 charisma."],
  ];
  const thoughts = [
    "Did I save my game…?",
    "Inventory: mostly snacks.",
    "Imagine all the tiny pixels.",
    "Must. Collect. Every. Pin.",
    "Probably time for a side quest.",
    "This counts as multiplayer.",
  ];
  let messages = [],
    nextThought = 5,
    exchangeIndex = Math.floor(Math.random() * exchanges.length);
  const bubbleNodes = Array.from({ length: 2 }, () => {
    const node = document.createElement("div");
    node.className = "mole-bubble";
    node.hidden = true;
    $("con-bubbles").append(node);
    return node;
  });
  function say(actor, text, kind = "speech", delay = 0, duration = 2.8) {
    messages = messages.filter((m) => m.end > time).slice(-5);
    messages.push({
      actor,
      text,
      kind,
      start: time + delay,
      end: time + delay + duration,
    });
  }
  function startChats() {
    const candidates = actors
      .map((a, i) => i)
      .filter(
        (i) => i !== held && actors[i].emerge >= 1.6 && !actors[i].burrow,
      );
    let pairs = 0;
    const pairLimit = 1 + Math.floor(Math.random() * 2);
    for (const i of candidates.sort(() => Math.random() - 0.5)) {
      if (pairs >= pairLimit || actors[i].partner >= 0) continue;
      const a = actors[i];
      const j = candidates.find(
        (j) =>
          j !== i &&
          actors[j].partner < 0 &&
          Math.abs(a.s - actors[j].s) < 1.8 &&
          Math.hypot(a.x - actors[j].x, a.z - actors[j].z) < 3,
      );
      if (j === undefined) continue;
      for (const [who, other] of [
        [i, j],
        [j, i],
      ])
        Object.assign(actors[who], {
          activity: "Chat",
          activityStart: time + (who === i ? 0 : -0.5),
          activityUntil: time + queueState.remaining,
          partner: other,
        });
      if (pairs === 0) {
        const lines = exchanges[exchangeIndex++ % exchanges.length];
        say(i, lines[0], "speech", 0.15, 1.8);
        say(j, lines[1], "speech", 1.95, 2.5);
      }
      pairs++;
    }
  }
  let motion = !media.matches,
    visible = true,
    dirty = true,
    speed = 1,
    time = 0,
    last = 0,
    lastRender = 0,
    accumulator = 0;
  let held = -1,
    hovered = -1,
    selected = 0,
    pointerId = null;
  let renderFrames = 0,
    pendingCpu = 0,
    intervals = [],
    pulseUntil = 0;
  const pointer = { x: 0, z: 0, active: false },
    dragTarget = new THREE.Vector3(),
    dragPlane = new THREE.Plane(),
    dragOffset = new THREE.Vector3();
  const ray = new THREE.Raycaster(),
    ndc = new THREE.Vector2(),
    hit = new THREE.Vector3(),
    normal = new THREE.Vector3(),
    flat = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.45);
  const projection = new THREE.Vector3();
  const metrics = {
    population: count,
    physics: "weighted skeleton / WiggleBone",
    simulatedBones: count * 4,
    pixelSize: 5,
    outlineStrength: pixel.material.uniforms.outlineStrength.value,
    drawCalls: 0,
    triangles: 0,
    walkingCount: 0,
    pickups: 0,
    held: -1,
    maxBend: 0,
    maxLift: 0,
    renderFrames: 0,
  };
  function setRay(e) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      1 - ((e.clientY - r.top) / r.height) * 2,
    );
    ray.setFromCamera(ndc, camera);
  }
  function pick(e) {
    const r = renderer.domElement.getBoundingClientRect();
    let closest = Infinity,
      result = -1;
    for (let i = 0; i < count; i++) {
      const a = actors[i];
      if (a.s >= QUEUE_LENGTH || a.burrow || a.emerge < 1.2) continue;
      projection.set(a.x + a.dx, a.lift + 0.9, a.z + a.dz).project(camera);
      const x = (projection.x * 0.5 + 0.5) * r.width + r.left,
        y = (-projection.y * 0.5 + 0.5) * r.height + r.top;
      const d = Math.hypot(e.clientX - x, e.clientY - y);
      if (d < Math.max(18, Math.min(42, r.width * 0.027)) && d < closest) {
        closest = d;
        result = i;
      }
    }
    return result;
  }
  function pickupReaction(index) {
    const a = actors[index];
    if (a.burrow) return;
    const nearby = actors
      .map((b, i) => ({
        b,
        i,
        distance: Math.hypot(b.x + b.dx - a.x - a.dx, b.z + b.dz - a.z - a.dz),
      }))
      .filter(({ b, i }) => i !== index && !b.burrow && b.emerge >= 1.6)
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearby)
      say(
        nearby.i,
        [
          "Whoa! They can fly?!",
          "Whoa! You okay up there?",
          "That’s one way to skip the line.",
        ][Math.floor(Math.random() * 3)],
        "speech",
        0,
        3,
      );
    a.lingerUntil = 0;
  }
  function release() {
    if (held < 0) return;
    const released = actors[held];
    released.burrow = { start: time, dirt: false };
    released.lingerUntil = 0;
    clearActivity(released);
    say(held, "Nobody saw that. Right?", "thought", 0, 1.4);
    if (!motion) {
      released.burrow.start = time - 3.5;
      const a = actors[held];
      a.dx = a.dz = a.lift = a.leanX = a.leanZ = 0;
    }
    held = -1;
    metrics.held = -1;
    pointer.active = false;
    if (pointerId !== null && renderer.domElement.hasPointerCapture(pointerId))
      renderer.domElement.releasePointerCapture(pointerId);
    pointerId = null;
    renderer.domElement.style.touchAction = "none";
    $("con-response").textContent =
      "Too embarrassed. They’re taking the underground route.";
    dirty = true;
  }
  let pendingPress = null;
  function celebrate(index) {
    const a = actors[index];
    if (a.burrow || a.emerge < 1.6) return;
    clearActivity(a);
    metrics.celebrations = (metrics.celebrations || 0) + 1;
    a.celebrateStart = time;
    a.celebrateUntil = time + 1.6;
    a.activity = "Cheer";
    a.activityStart = time;
    a.activityUntil = time + 1.6;
    say(
      index,
      ["Bonus joy!", "16-Bit! Let’s go!", "Achievement unlocked!"][
        Math.floor(Math.random() * 3)
      ],
    );
    $("con-response").textContent = "A little jump for joy!";
    dirty = true;
  }
  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || e.button !== 0) return;
    const i = pick(e);
    if (i < 0) return;
    selected = i;
    pendingPress = { index: i, x: e.clientX, y: e.clientY };
    pointerId = e.pointerId;
    renderer.domElement.setPointerCapture(e.pointerId);
    renderer.domElement.style.touchAction = "none";
    const a = actors[i];
    setRay(e);
    camera.getWorldDirection(normal);
    dragPlane.setFromNormalAndCoplanarPoint(
      normal,
      new THREE.Vector3(a.x + a.dx, a.lift + 0.9, a.z + a.dz),
    );
    ray.ray.intersectPlane(dragPlane, hit);
    dragOffset.set(a.x + a.dx, a.lift, a.z + a.dz).sub(hit);
    dragTarget.set(a.x + a.dx, 1.0, a.z + a.dz);
    dirty = true;
  });
  renderer.domElement.addEventListener("pointermove", (e) => {
    setRay(e);
    if (
      pendingPress &&
      Math.hypot(e.clientX - pendingPress.x, e.clientY - pendingPress.y) > 6
    ) {
      held = pendingPress.index;
      pendingPress = null;
      actors[held].celebrateUntil = 0;
      pickupReaction(held);
      metrics.pickups++;
      metrics.held = held;
      $("con-response").textContent = "You’ve got one! Give them a wiggle.";
    }
    if (held >= 0) {
      if (ray.ray.intersectPlane(dragPlane, hit)) {
        dragTarget.copy(hit).add(dragOffset);
        dragTarget.y = THREE.MathUtils.clamp(dragTarget.y + 1.0, 0.6, 3.2);
        dragTarget.x = THREE.MathUtils.clamp(dragTarget.x, -9, 9);
        dragTarget.z = THREE.MathUtils.clamp(dragTarget.z, -4, 4);
      }
      dirty = true;
      return;
    }
    hovered = pick(e);
    selected = hovered >= 0 ? hovered : selected;
    if (ray.ray.intersectPlane(flat, hit)) {
      pointer.x = hit.x;
      pointer.z = hit.z;
      pointer.active = true;
      if (hovered >= 0 && motion) {
        const a = actors[hovered];
        if (time > a.hoverCooldown && !a.burrow && a.emerge >= 1.6) {
          a.hoverClip = ["Wave", "Cheer", "Point", "InspectBadge"][
            Math.floor(Math.random() * 4)
          ];
          a.hoverUntil = time + 1.8;
          a.hoverCooldown = time + 4;
        }
      }
      pulseUntil = 0;
    }
    dirty = true;
  });
  renderer.domElement.addEventListener("pointerup", () => {
    const click = pendingPress;
    pendingPress = null;
    if (click) {
      celebrate(click.index);
      if (
        pointerId !== null &&
        renderer.domElement.hasPointerCapture(pointerId)
      )
        renderer.domElement.releasePointerCapture(pointerId);
      pointerId = null;
    } else release();
  });
  const cancelPress = () => {
    pendingPress = null;
    release();
  };
  renderer.domElement.addEventListener("pointercancel", cancelPress);
  renderer.domElement.addEventListener("lostpointercapture", cancelPress);
  renderer.domElement.addEventListener("pointerleave", () => {
    if (held < 0) {
      pointer.active = false;
      hovered = -1;
      dirty = true;
    }
  });
  function nudge() {
    const a = actors[selected];
    pointer.x = a.x;
    pointer.z = a.z;
    pointer.active = true;
    pulseUntil = time + 1.0;
    say(
      selected,
      [
        "Whoa! Bonus wiggle!",
        "My pixels are ticklish!",
        "New dance move unlocked.",
      ][Math.floor(Math.random() * 3)],
    );
    if (motion && !queueState.moving && a.partner < 0)
      Object.assign(a, {
        activity: "Dance",
        activityStart: time,
        activityUntil: time + 2,
      });
    a.vz += 0.45;
    a.vx -= 0.2;
    if (!motion) {
      a.leanZ = 0.05;
      a.dx = 0.03;
    }
    $("con-response").textContent = "A little wobble goes a long way.";
    dirty = true;
  }
  host.addEventListener("keydown", (e) => {
    if (e.target !== host) return;
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        " ",
        "Escape",
        "Enter",
      ].includes(e.key)
    )
      return;
    e.preventDefault();
    if (e.key === "Escape") {
      release();
      pointer.active = false;
      hovered = -1;
      dirty = true;
      return;
    }
    if (e.key === "Enter") {
      if (held >= 0) release();
      else {
        if (actors[selected].burrow || actors[selected].emerge < 1.2) return;
        held = selected;
        pickupReaction(held);
        const a = actors[held];
        dragTarget.set(a.x + a.dx, 1.2, a.z + a.dz);
        metrics.pickups++;
        metrics.held = held;
        $("con-response").textContent =
          "Mole picked up. Use arrow keys to wiggle; Enter to put them down.";
      }
      dirty = true;
      return;
    }
    if (e.key === " ") {
      nudge();
      return;
    }
    if (held >= 0) {
      dragTarget.x +=
        e.key === "ArrowRight" ? 0.5 : e.key === "ArrowLeft" ? -0.5 : 0;
      dragTarget.y = THREE.MathUtils.clamp(
        dragTarget.y +
          (e.key === "ArrowUp" ? 0.35 : e.key === "ArrowDown" ? -0.35 : 0),
        0.6,
        3.2,
      );
    } else {
      selected =
        (selected +
          (e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 1) +
          count) %
        count;
      hovered = selected;
      const a = actors[selected];
      pointer.x = a.x;
      pointer.z = a.z;
      pointer.active = true;
    }
    dirty = true;
  });
  function motionUI() {
    $("con-motion").textContent = motion ? "Ⅱ Pause" : "▷ Play";
    $("con-motion").setAttribute(
      "aria-label",
      motion ? "Pause queue motion" : "Play queue motion",
    );
    $("con-motion").setAttribute("aria-pressed", String(!motion));
    dirty = true;
  }
  $("con-motion").disabled = false;
  $("con-motion").addEventListener("click", () => {
    motion = !motion;
    release();
    motionUI();
  });
  media.addEventListener("change", (e) => {
    motion = !e.matches;
    release();
    motionUI();
  });
  motionUI();
  function resize() {
    const quality = matchMedia("(max-width: 600px)").matches
      ? 2
      : matchMedia("(max-width: 1000px)").matches
        ? 4
        : 5;
    metrics.pixelSize = quality;
    const w = host.clientWidth,
      h = host.clientHeight,
      rw = Math.min(900, Math.round(w / quality)),
      rh = Math.round((rw * h) / w);
    // Both black outlines and the one-pixel yellow border share the scene grid.
    renderer.setSize(rw, rh, false);
    pixel.setSize(rw, rh);
    metrics.resolution = [rw, rh];
    const hw = w < 600 ? 10.1 : 10.5,
      hh = (hw * h) / w;
    camera.position.set(0, 15, 24);
    camera.lookAt(0, 0.7, 0);
    camera.left = -hw;
    camera.right = hw;
    // Keep the queue in its original lower band while allowing picked-up moles
    // to render throughout the full hero, including the heading area.
    const stage = host.closest(".con-hero").querySelector(".con-stage");
    const shift = ((h - stage.clientHeight) * hw) / w;
    camera.top = hh + shift;
    camera.bottom = -hh + shift;
    camera.updateProjectionMatrix();
    dirty = true;
  }
  new ResizeObserver(resize).observe(host);
  resize();
  function resetTime() {
    last = 0;
    lastRender = 0;
    accumulator = 0;
    intervals = [];
    for (const a of actors) a.wiggle.reset();
    dirty = true;
  }
  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) release();
      resetTime();
    },
    { rootMargin: "40px" },
  ).observe(host);
  document.addEventListener("visibilitychange", () => {
    release();
    resetTime();
  });
  function physics(dt) {
    if (motion) {
      time += dt;
      queueState = queueLife.update(dt);
      if (queueState.changed) {
        for (const a of actors) {
          const partner = a.partner >= 0 ? actors[a.partner] : null;
          if (queueState.moving && partner && a.s > partner.s && !a.burrow) {
            a.lingerUntil = time + 1.3 + Math.random() * 0.9;
            a.activityUntil = a.lingerUntil;
          } else clearActivity(a);
        }
        chatsScheduled = false;
      }
      if (!queueState.moving && queueState.velocity === 0 && !chatsScheduled) {
        startChats();
        chatsScheduled = true;
        nextGesture = time + 0.25;
      }
      if (time >= nextThought) {
        nextThought = time + 7 + Math.random() * 7;
        const candidates = actors
          .map((a, i) => i)
          .filter(
            (i) =>
              i !== held && actors[i].partner < 0 && actors[i].emerge > 1.6,
          );
        if (candidates.length && !messages.some((m) => m.end > time))
          say(
            candidates[Math.floor(Math.random() * candidates.length)],
            thoughts[Math.floor(Math.random() * thoughts.length)],
            "thought",
            0,
            3.5,
          );
      }
      if (
        time >= nextGesture &&
        !queueState.moving &&
        queueState.velocity === 0 &&
        queueState.remaining > 3.1
      ) {
        nextGesture = time + 3.8;
        // Choose two readable silhouettes, including someone in the front row.
        const free = actors
          .map((a, i) => ({ a, i }))
          .filter(
            ({ a, i }) =>
              i !== held &&
              a.partner < 0 &&
              a.emerge > 1.6 &&
              !a.burrow &&
              a.activity === "Idle",
          );
        const front = free.filter(({ a }) => a.z > 1);
        const first = (front.length ? front : free)[
          Math.floor(Math.random() * (front.length || free.length))
        ];
        const others = free.filter((candidate) => candidate !== first);
        const chosen = [
          first,
          others[Math.floor(Math.random() * others.length)],
        ].filter(Boolean);
        for (const { a, i } of chosen) {
          const activity = ["Wave", "Dance", "Cheer", "Clap", "Point"][
            gestureIndex++ % 5
          ];
          Object.assign(a, {
            activity,
            activityStart: time,
            activityUntil: time + 3,
          });
          if (!messages.some((m) => m.end > time))
            say(
              i,
              activity === "Dance"
                ? "Queue dance break!"
                : activity === "Cheer" || activity === "Clap"
                  ? "Let’s go, 16-Bit!"
                  : activity === "Point"
                    ? "I think I see the arcade!"
                    : "Hey! You made it!",
            );
        }
      }
    }
    if (pulseUntil && time > pulseUntil) {
      pointer.active = false;
      pulseUntil = 0;
    }
    // A distracted attendee blocks only the people behind them; spacing keeps
    // the released queue from collapsing into the people still ahead.
    const blockers = actors.filter(
      (a) =>
        !a.burrow &&
        (a.lingerUntil > time ||
          a.celebrateUntil > time ||
          (!queueState.moving && a.activity !== "Idle")),
    );
    const blockAt = blockers.length
      ? Math.max(...blockers.map((a) => a.s))
      : -1;
    const advances = queueAdvances(
      actors,
      dt * 0.85 * speed * queueState.velocity,
      blockAt,
      spacing,
      blockers,
      motion ? dt * 0.9 : 0,
    );
    metrics.heldUp = actors.filter((a) => !a.burrow && a.s <= blockAt).length;
    metrics.burrowing = actors.filter((a) => a.burrow).length;
    for (let i = 0; i < count; i++) {
      const a = actors[i];
      if (a.emerge >= 0 && !a.dirtStarted && motion) {
        burst(a);
        a.dirtStarted = true;
      }
      if (
        a.activityUntil <= time ||
        held === i ||
        (a.partner >= 0 && held === a.partner)
      )
        clearActivity(a);
      if (a.burrow) {
        const age = time - a.burrow.start;
        a.walking = false;
        if (motion) {
          a.lift *= Math.exp(-dt * 8);
          if (age > 1.05 && !a.burrow.dirt) {
            burst(a);
            a.burrow.dirt = true;
          }
          if (age > 4) {
            const back = Math.min(
              ...actors.filter((b) => b !== a && !b.burrow).map((b) => b.s),
            );
            if (back > a.gap) {
              a.s = back - a.gap;
              const entry = queuePoint(a.s);
              a.x = entry.x;
              a.z = entry.z;
              a.yaw = a.facing = entry.yaw;
              a.dx = a.dz = a.vx = a.vz = a.lift = 0;
              a.emerge = 0;
              a.exitAge = null;
              a.dirtStarted = false;
              a.burrow = null;
              a.skin.reset();
            }
          }
        }
        a.leanX = a.skin.update(
          dt,
          a.gait,
          false,
          false,
          time,
          motion,
          "Clap",
          Math.max(0, age - 0.5) * 2,
        );
        continue;
      }
      const step = motion ? advances.get(a) || 0 : 0;
      const oldX = a.x,
        oldZ = a.z;
      const before = a.s;
      const recycled = motion
        ? advanceLifecycle(a, step, dt, QUEUE_LENGTH, held === i)
        : false;
      const wrapped = recycled || a.s < before;
      a.walking =
        !wrapped &&
        a.exitAge == null &&
        a.emerge >= 1.6 &&
        step > 0.0001 &&
        held !== i;
      if (a.walking) a.gait += step * 13;
      const p = queuePoint(a.s);
      a.x = p.x;
      a.z = p.z;
      a.yaw = p.yaw;
      if (wrapped && held !== i) {
        a.emerge = 0;
        a.dirtStarted = false;
        clearActivity(a);
      }
      if (wrapped) {
        if (held === i) {
          a.dx += oldX - a.x;
          a.dz += oldZ - a.z;
        } else {
          a.dx = a.dz = a.vx = a.vz = 0;
        }
        a.anchor.position.set(a.x, 0, a.z);
        a.wiggle.reset();
      }
      let tx = 0,
        tz = 0,
        ty = 0,
        fx = 0,
        fz = 0;
      a.headPush.multiplyScalar(Math.exp(-dt * 10));
      if (held === i) {
        tx = dragTarget.x - a.x;
        tz = dragTarget.z - a.z;
        ty = dragTarget.y;
      } else if (pointer.active && motion) {
        const px = a.x + a.dx - pointer.x,
          pz = a.z + a.dz - pointer.z,
          d = Math.hypot(px, pz);
        if (d < 1.5 && !a.burrow && a.emerge >= 1.6) {
          const strength = 1 - d / 1.5;
          if (d < 0.9 && time > a.hoverCooldown && held < 0) {
            a.hoverClip = ["Wave", "Cheer", "Point", "InspectBadge"][
              Math.floor(Math.random() * 4)
            ];
            a.hoverUntil = time + 1.8;
            a.hoverCooldown = time + 4;
          }
          a.headPush.x +=
            ((Math.abs(px) < 0.02 ? 0.25 : px / Math.max(d, 0.1)) * strength -
              a.headPush.x) *
            Math.min(1, dt * 14);
          a.headPush.z +=
            ((Math.abs(pz) < 0.02 ? 0.15 : pz / Math.max(d, 0.1)) * strength -
              a.headPush.z) *
            Math.min(1, dt * 14);
          const f = (1 - d / 1.5) * 4;
          fx =
            (Math.abs(px) < 0.05 ? (i % 2 ? 1 : -1) : px / Math.max(d, 0.2)) *
            f;
          fz =
            (Math.abs(pz) < 0.05 ? (i % 2 ? -1 : 1) : pz / Math.max(d, 0.2)) *
            f;
        }
      }
      if (!motion) {
        if (held === i) {
          a.dx = tx;
          a.dz = tz;
          a.lift = ty;
          a.leanX = 0.02;
          a.leanZ = 0.02;
        } else {
          a.lift = 0;
        }
        continue;
      }
      a.vx += ((tx - a.dx) * 44 + fx - a.vx * 12) * dt;
      a.vz += ((tz - a.dz) * 44 + fz - a.vz * 12) * dt;
      a.vy += ((ty - a.lift) * 65 - a.vy * 10) * dt;
      a.dx += a.vx * dt;
      a.dz += a.vz * dt;
      a.lift = Math.max(0, a.lift + a.vy * dt);
      const partner = a.partner >= 0 ? actors[a.partner] : null;
      const facing =
        partner && (!queueState.moving || a.lingerUntil > time)
          ? Math.atan2(partner.x - a.x, partner.z - a.z)
          : !queueState.moving && a.activity !== "Idle" && a.activity !== "Chat"
            ? 0
            : a.yaw;
      a.facing +=
        Math.atan2(Math.sin(facing - a.facing), Math.cos(facing - a.facing)) *
        (1 - Math.exp(-dt * 5));
      a.anchor.position.set(
        a.x + a.dx,
        a.lift + (a.walking ? Math.abs(Math.sin(a.gait)) * 0.045 : 0),
        a.z + a.dz,
      );
      a.anchor.rotation.set(0, a.facing, 0);
      a.anchor.scale.setScalar(a.scale);
      a.leanX = a.skin.update(
        dt,
        a.gait,
        a.walking,
        held === i,
        time,
        motion,
        a.emerge < 1.6
          ? "Idle"
          : time < a.celebrateUntil
            ? "Cheer"
            : a.activity,
        time - (time < a.celebrateUntil ? a.celebrateStart : a.activityStart),
        a.headPush,
        time < a.hoverUntil && held !== i ? a.hoverClip : null,
        Math.max(0, time - (a.hoverUntil - 1.8)),
      );
      a.leanZ = 0;
    }
  }
  function draw() {
    let maxBend = 0,
      maxLift = 0,
      walkers = 0;
    for (let i = 0; i < count; i++) {
      const a = actors[i];
      const rise = THREE.MathUtils.smoothstep(a.emerge, 0, 1.6);
      const sink =
        a.exitAge == null ? 0 : THREE.MathUtils.smoothstep(a.exitAge, 0, 0.85);
      const bury = a.burrow
        ? THREE.MathUtils.smoothstep(time - a.burrow.start, 1.05, 2.5)
        : 0;
      const underground =
        held === i ? 0 : -2.25 * Math.max(1 - rise, sink, bury);
      // Tip around the torso, rather than rotating around the feet. The head
      // enters first; the inverted feet remain above the hole during descent.
      const dive = a.burrow
        ? Math.PI *
          THREE.MathUtils.smoothstep(time - a.burrow.start, 0.35, 1.15)
        : 0;
      const jumpAge = time - a.celebrateStart;
      const jump =
        motion && !a.burrow && held !== i && jumpAge >= 0 && jumpAge < 0.85
          ? Math.sin((jumpAge / 0.85) * Math.PI) * 0.8
          : 0;
      const pivot = a.scale * 1.5;
      const forwardOffset = -pivot * Math.sin(dive);
      a.anchor.position.set(
        a.x + a.dx + Math.sin(a.facing) * forwardOffset,
        underground +
          a.lift +
          jump +
          pivot * (1 - Math.cos(dive)) +
          (a.walking ? Math.abs(Math.sin(a.gait)) * 0.045 : 0),
        a.z + a.dz + Math.cos(a.facing) * forwardOffset,
      );
      a.anchor.rotation.set(dive, a.facing, 0, "YXZ");
      a.anchor.scale.setScalar(a.scale);
      if (!motion)
        a.skin.update(1 / 60, a.gait, false, held === i, time, false);
      maxBend = Math.max(maxBend, Math.hypot(a.leanX, a.leanZ));
      maxLift = Math.max(maxLift, a.lift);
      if (a.walking) walkers++;
    }
    let holeCount = 0;
    for (const a of actors) {
      if (!a.burrow) continue;
      const age = time - a.burrow.start;
      const radius =
        0.55 *
        THREE.MathUtils.smoothstep(age, 0.5, 1.2) *
        (1 - THREE.MathUtils.smoothstep(age, 2.5, 3.4));
      if (radius <= 0) continue;
      dirtPose.position.set(a.x + a.dx, 0.015, a.z + a.dz);
      dirtPose.rotation.set(0, 0, 0);
      dirtPose.scale.set(radius, 1, radius * 0.72);
      dirtPose.updateMatrix();
      holes.setMatrixAt(holeCount++, dirtPose.matrix);
    }
    holes.count = holeCount;
    holes.instanceMatrix.needsUpdate = true;
    let activeDirt = 0;
    for (const p of dirtPool) {
      const age = time - p.born;
      if (age < 0 || age > 1.1) continue;
      const y = 0.1 + p.vy * age - 4.9 * age * age;
      if (y < 0) continue;
      dirtPose.position.set(p.x + p.vx * age, y, p.z + p.vz * age);
      dirtPose.rotation.set(age * 4, age * 3, age);
      dirtPose.scale.setScalar(p.size * (1 - age / 1.1));
      dirtPose.updateMatrix();
      dirt.setMatrixAt(activeDirt++, dirtPose.matrix);
    }
    dirt.count = activeDirt;
    dirt.instanceMatrix.needsUpdate = true;
    metrics.particles = activeDirt;
    metrics.queueState = queueState.moving ? "moving" : "waiting";
    metrics.chatting = actors.filter((a) => a.partner >= 0).length;
    metrics.emerging = actors.filter((a) => !a.burrow && a.emerge < 1.6).length;
    metrics.exiting = actors.filter((a) => a.exitAge != null).length;
    metrics.hoverReactions = actors.filter((a) => a.hoverUntil > time).length;
    metrics.headPush = +Math.max(
      ...actors.map((a) => a.headPush.length()),
    ).toFixed(3);
    metrics.gestures = actors.filter(
      (a) => !["Idle", "Chat"].includes(a.activity),
    ).length;
    messages = messages.filter((m) => m.end > time);
    const activeMessages = messages
      .filter(
        (m) =>
          m.start <= time && actors[m.actor].emerge >= 1.6 && m.actor !== held,
      )
      .slice(-(matchMedia("(max-width: 600px)").matches ? 1 : 2));
    const placed = [];
    for (let i = 0; i < bubbleNodes.length; i++) {
      const node = bubbleNodes[i],
        message = activeMessages[i];
      node.hidden = !message;
      if (!message) continue;
      const a = actors[message.actor];
      projection.set(a.x + a.dx, a.lift + 2.25, a.z + a.dz).project(camera);
      const rawX = (projection.x * 0.5 + 0.5) * host.clientWidth;
      const halfWidth = matchMedia("(max-width: 600px)").matches ? 69 : 82;
      const x = THREE.MathUtils.clamp(
        rawX,
        halfWidth + 5,
        host.clientWidth - halfWidth - 5,
      );
      let y = Math.max(100, (-projection.y * 0.5 + 0.5) * host.clientHeight);
      if (
        placed.some(
          (p) =>
            Math.abs(p.x - x) < halfWidth * 2 + 10 && Math.abs(p.y - y) < 76,
        )
      )
        y = Math.max(100, y - 80);
      placed.push({ x, y });
      node.textContent = message.text;
      node.className =
        "mole-bubble" + (message.kind === "thought" ? " thought" : "");
      node.style.left = x + "px";
      node.style.top = y + "px";
      node.style.setProperty(
        "--tail",
        THREE.MathUtils.clamp(rawX - x + halfWidth, 12, halfWidth * 2 - 18) +
          "px",
      );
    }
    metrics.bubbles = activeMessages.length;
    metrics.activeAnimations = actors
      .filter((a) => !["Idle", "Chat"].includes(a.activity))
      .map((a) => a.activity);
    const tooltip = $("con-tooltip"),
      index = held >= 0 ? held : hovered;
    tooltip.hidden = index < 0 || activeMessages.length > 0 || (index >= 0 && (actors[index].burrow || actors[index].emerge < 1.6));
    if (index >= 0) {
      const a = actors[index];
      projection.set(a.x + a.dx, a.lift + 2.2, a.z + a.dz).project(camera);
      tooltip.style.left =
        THREE.MathUtils.clamp(
          (projection.x * 0.5 + 0.5) * host.clientWidth,
          85,
          host.clientWidth - 85,
        ) + "px";
      tooltip.style.top =
        Math.max(45, (-projection.y * 0.5 + 0.5) * host.clientHeight) + "px";
      tooltip.textContent =
        held >= 0 ? "Look, no ground!" : "Click to cheer · drag to lift";
    }
    pixel.selected =
      hovered >= 0 && !actors[hovered].burrow && actors[hovered].emerge >= 1.6
        ? actors[hovered].skin.mesh
        : null;
    metrics.celebrating = actors.filter((a) => a.celebrateUntil > time).length;
    renderer.domElement.style.cursor =
      held >= 0 ? "grabbing" : hovered >= 0 ? "grab" : "default";
    metrics.walkingCount = walkers;
    metrics.maxBend = +maxBend.toFixed(3);
    metrics.maxLift = +maxLift.toFixed(3);
    metrics.held = held;
    metrics.limbShakeActive = held >= 0 && motion;
  }
  $("con-fallback").hidden = true;
  $("con-world-note").textContent = "A little shuffle. A little conversation.";
  host.dataset.loaded = "true";
  renderer.setAnimationLoop((now) => {
    if (!visible || document.hidden) {
      last = 0;
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
    last = now;
    const begin = performance.now();
    if (motion || held >= 0) {
      accumulator += dt;
      for (let n = 0; accumulator >= 1 / 60 && n < 3; n++) {
        physics(1 / 60);
        accumulator -= 1 / 60;
      }
      dirty = true;
    }
    pendingCpu += performance.now() - begin;
    if (!dirty || now - lastRender < 1000 / 30 - 1) return;
    const renderStart = performance.now();
    if (lastRender && motion) {
      intervals.push(now - lastRender);
      if (intervals.length > 60) intervals.shift();
      metrics.renderFps = +(
        1000 /
        (intervals.reduce((a, b) => a + b, 0) / intervals.length)
      ).toFixed(1);
    }
    lastRender = now;
    draw();
    renderer.info.reset();
    pixel.render();
    dirty = false;
    metrics.frameCpuMs = +(
      pendingCpu +
      performance.now() -
      renderStart
    ).toFixed(2);
    pendingCpu = 0;
    metrics.drawCalls = renderer.info.render.calls;
    metrics.triangles = renderer.info.render.triangles;
    metrics.renderFrames = ++renderFrames;
    metrics.motion = motion;

    if (renderFrames % 15 === 1 || !motion)
      host.dataset.metrics = JSON.stringify(metrics);
  });
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    release();
    renderer.setAnimationLoop(null);
    $("con-fallback").hidden = false;
    $("con-world-note").textContent =
      "The queue is resting. Reload to bring it back.";
    $("con-motion").disabled = true;
  });
}
