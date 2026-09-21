import * as THREE from "three";
import { mergeGeometries } from "./vendor/BufferGeometryUtils.js";
import { WiggleBone } from "./vendor/wiggle.mjs";

// Share geometry across attendees, but give every attendee its own real skeleton.
export function prepareSkin(gltf) {
  gltf.scene.updateMatrixWorld(true);
  const parts = [];
  let skeleton;
  gltf.scene.traverse((mesh) => {
    if (!mesh.isSkinnedMesh) return;
    skeleton ??= mesh.skeleton;
    const g = mesh.geometry.clone();
    g.applyMatrix4(mesh.bindMatrix);
    for (const name of Object.keys(g.attributes))
      if (!["position", "normal", "skinIndex", "skinWeight"].includes(name))
        g.deleteAttribute(name);
    const colors = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < colors.length; i += 3)
      mesh.material.color.toArray(colors, i);
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    parts.push(g);
  });
  if (!skeleton || !parts.length)
    throw new Error("Expected a weighted mole skeleton");
  const geometry = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return { gltf, skeleton, geometry };
}

export function createSkin(template, material) {
  const root = template.gltf.scene.clone(true);
  const remove = [];
  root.traverse((o) => {
    if (o.isMesh) remove.push(o);
  });
  remove.forEach((o) => o.removeFromParent());
  const bones = template.skeleton.bones.map((b) =>
    root.getObjectByName(b.name),
  );
  const skeleton = new THREE.Skeleton(
    bones,
    template.skeleton.boneInverses.map((m) => m.clone()),
  );
  const mesh = new THREE.SkinnedMesh(template.geometry, material);
  mesh.frustumCulled = false;
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(skeleton, new THREE.Matrix4());
  const joints = new Map();
  // Parent first: each joint keeps its authored rest transform in a driver.
  for (const name of [
    "root",
    "body",
    "head",
    "armL",
    "armR",
    "legL",
    "legR",
    "prop",
  ]) {
    const bone = bones.find((b) => b.name.replaceAll(".", "") === name);
    if (!bone) continue;
    const driver = new THREE.Group();
    driver.position.copy(bone.position);
    driver.quaternion.copy(bone.quaternion);
    driver.scale.copy(bone.scale);
    bone.parent.add(driver);
    driver.add(bone);
    bone.position.set(0, 0, 0);
    bone.quaternion.identity();
    bone.scale.setScalar(1);
    let spring = null;
    // Legs follow their animation drivers directly; only the upper body gets lag.
    if (name !== "root" && name !== "prop" && !name.startsWith("leg")) {
      const length =
        name === "body"
          ? 0.75
          : name === "head"
            ? 0.7
            : name.startsWith("arm")
              ? 0.59
              : 0.38;
      bone.position.y = length;
      // Wiggle uses a local +Y endpoint. The actual weighted bone remains at
      // the joint, while its authored orientation lives on the driver above.
      spring = new WiggleBone(bone, { velocity: 0.65 });
      const wrapper = bone.parent;
      for (const child of [...wrapper.children])
        if (child !== bone) wrapper.remove(child);
      wrapper.position.set(0, 0, 0);
      wrapper.quaternion.identity();
      bone.position.set(0, 0, 0);
    }
    joints.set(bone.name, { bone, driver, spring, name });
  }
  const clips = new Map(
    template.gltf.animations.map((clip) => [
      clip.name,
      {
        duration: clip.duration,
        tracks: clip.tracks
          .map((t) => {
            const split = t.name.lastIndexOf(".");
            return {
              joint: joints.get(t.name.slice(0, split)),
              property: t.name.slice(split + 1),
              sample: t.createInterpolant(),
            };
          })
          .filter((t) => t.joint),
      },
    ]),
  );
  const poseQuaternion = new THREE.Quaternion(),
    poseVector = new THREE.Vector3();
  const identity = new THREE.Quaternion();
  return {
    root,
    mesh,
    joints,
    reset() {
      for (const { spring, bone } of joints.values()) {
        if (spring) spring.reset();
        bone.position.set(0, 0, 0);
        bone.quaternion.identity();
      }
    },
    update(
      dt,
      gait,
      walking,
      held,
      time,
      motion,
      activity = "Idle",
      activityTime = time,
      headPush = null,
      hoverClip = null,
      hoverTime = 0,
    ) {
      const clip =
        clips.get(walking && !held ? "Walk" : held ? "Idle" : activity) ||
        clips.get("Idle");
      const phase =
        walking && !held
          ? ((gait / (Math.PI * 2)) * clip.duration) % clip.duration
          : (motion ? activityTime : 0) % clip.duration;
      const blend = motion ? 1 - Math.exp(-dt * 12) : 1;
      for (const t of clip.tracks) {
        const value = t.sample.evaluate(phase);
        if (t.property === "quaternion")
          t.joint.driver.quaternion.slerp(
            poseQuaternion.fromArray(value),
            blend,
          );
        else
          t.joint.driver[t.property].lerp(poseVector.fromArray(value), blend);
      }
      // Layer upper-body reactions over walking instead of replacing the gait.
      if (hoverClip && motion && !held) {
        const reaction = clips.get(hoverClip);
        if (reaction)
          for (const t of reaction.tracks) {
            if (!["head", "armL", "armR"].includes(t.joint.name)) continue;
            const value = t.sample.evaluate(hoverTime % reaction.duration);
            if (t.property === "quaternion")
              t.joint.driver.quaternion.slerp(
                poseQuaternion.fromArray(value),
                0.7,
              );
          }
      }
      for (const j of joints.values()) {
        if (held && j.name.startsWith("arm")) {
          j.driver.rotateX(
            motion
              ? Math.sin(time * 14 + (j.name.endsWith("L") ? 0 : 2)) * 0.35
              : 0.2,
          );
          j.driver.rotateZ((j.name.endsWith("L") ? 1 : -1) * 0.3);
        }
        if (held && j.name.startsWith("leg"))
          j.driver.rotateX(
            motion
              ? Math.sin(time * 17 + (j.name.endsWith("L") ? 0 : 2)) * 0.4
              : 0.15,
          );
      }
      root.updateMatrixWorld(true);
      let maxAngle = 0;
      for (const j of joints.values()) {
        if (!j.spring) continue;
        if (!motion) {
          j.bone.quaternion.identity();
          continue;
        }
        j.spring.options.velocity = held
          ? j.name === "body"
            ? 0.095
            : j.name === "head"
              ? 0.07
              : 0.055
          : 0.65;
        const pushed =
          !held &&
          headPush &&
          headPush.lengthSq() > 0.0001 &&
          (j.name === "head" || j.name === "body");
        if (pushed) {
          j.spring.options.velocity = j.name === "head" ? 0.13 : 0.3;
          j.spring.oldBoneWorldPosition.addScaledVector(
            headPush,
            dt * (j.name === "head" ? 8 : 1),
          );
        }
        j.spring.update(dt);
        const angle = j.bone.quaternion.angleTo(identity);
        const limit = held
          ? j.name === "body"
            ? 0.55
            : j.name === "head"
              ? 0.65
              : 0.95
          : pushed
            ? j.name === "head"
              ? Math.PI / 3
              : 0.18
            : 0.07;
        if (angle > limit) j.bone.quaternion.slerp(identity, 1 - limit / angle);
        maxAngle = Math.max(maxAngle, Math.min(angle, limit));
        j.bone.updateMatrixWorld(true);
      }
      return maxAngle;
    },
  };
}
