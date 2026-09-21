import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "../public/mole-kit/vendor/GLTFLoader.js";
import { prepareSkin, createSkin } from "../public/mole-kit/skinned-crowd.js";

for (const variant of [
  "classic",
  "propeller",
  "superfan",
  "gamer",
  "artist",
  "crew",
]) {
  test(`${variant}: weighted rest pose, independent skeleton, shake and settle`, async () => {
    const bytes = await readFile(
      new URL(`../public/mole-kit/${variant}.glb`, import.meta.url),
    );
    const gltf = await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
    const template = prepareSkin(gltf);
    const a = createSkin(template, new THREE.MeshBasicMaterial());
    const b = createSkin(template, a.mesh.material);
    a.root.updateMatrixWorld(true);
    a.mesh.skeleton.update();
    // In the rest pose all skin transforms must be identity: adapters must not
    // shift joints or stretch the original bind pose.
    for (let i = 0; i < a.mesh.skeleton.bones.length; i++) {
      const m = new THREE.Matrix4().multiplyMatrices(
        a.mesh.skeleton.bones[i].matrixWorld,
        a.mesh.skeleton.boneInverses[i],
      );
      assert.ok(
        m.elements.every((n, j) => Math.abs(n - (j % 5 === 0 ? 1 : 0)) < 1e-5),
      );
      assert.notEqual(a.mesh.skeleton.bones[i], b.mesh.skeleton.bones[i]);
    }
    assert.equal([...a.joints.values()].filter((j) => j.spring).length, 4);
    let peak = 0;
    for (let f = 0; f < 120; f++) {
      a.root.position.set(Math.sin(f / 5) * 1.2, 2, 0);
      peak = Math.max(peak, a.update(1 / 60, 0, false, true, f / 60, true));
    }
    for (const joint of a.joints.values()) if (joint.name.startsWith('leg')) {
      assert.equal(joint.spring, null);
      assert.ok(joint.bone.quaternion.angleTo(new THREE.Quaternion()) < 1e-8, 'legs stay firm while the upper body shakes');
    }
    assert.ok(peak > 0.3, `Expected visible joint lag, got ${peak}`);
    for (let f = 0; f < 180; f++)
      a.update(1 / 60, 0, false, false, 2 + f / 60, true);
    for (const { bone, spring } of a.joints.values())
      if (spring) {
        assert.ok(bone.quaternion.angleTo(new THREE.Quaternion()) < 0.001);
        assert.ok(bone.position.length() < 1e-8);
      }
    const push = new THREE.Vector3(0.65, 0, 0.15);
    for (let f = 0; f < 60; f++)
      a.update(
        1 / 60,
        0,
        false,
        false,
        0,
        true,
        "Idle",
        0,
        push,
        "Wave",
        f / 60,
      );
    const head = [...a.joints.values()].find((j) => j.name === "head");
    assert.ok(
      head.bone.quaternion.angleTo(new THREE.Quaternion()) > 0.08,
      "cursor force must move the weighted head bone",
    );
    for (let f = 0; f < 180; f++)
      a.update(1 / 60, 0, false, false, 0, true, "Idle", 0);
    assert.ok(
      head.bone.quaternion.angleTo(new THREE.Quaternion()) < 0.001,
      "head settles after cursor leaves",
    );
    for (const activity of [
      "Chat",
      "Wave",
      "InspectBadge",
      "Cheer",
      "Point",
      "Idle",
    ]) {
      for (let f = 0; f < 30; f++)
        a.update(1 / 60, 0, false, false, f / 60, true, activity, f / 60);
      assert.ok(
        a.mesh.skeleton.bones.every((bone) =>
          bone.matrixWorld.elements.every(Number.isFinite),
        ),
        activity,
      );
    }
    assert.ok(
      b.mesh.skeleton.bones.every((bone) =>
        bone.position.toArray().every(Number.isFinite),
      ),
    );
  });
}
