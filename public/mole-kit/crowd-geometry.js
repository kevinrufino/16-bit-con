import * as THREE from "three";
import { mergeGeometries } from "./vendor/BufferGeometryUtils.js";

// Bake each wardrobe once, with vertex colors. One draw per wardrobe instead of
// one draw per accessory per attendee; the original animated GLBs stay intact.
export function bakeCrowdGeometry(gltf) {
  const mixer = new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(gltf.animations.find((a) => a.name === "Idle")).play();
  mixer.setTime(0);
  gltf.scene.updateMatrixWorld(true);
  const parts = [],
    p = new THREE.Vector3();
  gltf.scene.traverse((mesh) => {
    if (!mesh.isMesh) return;
    mesh.skeleton?.update();
    const source = mesh.geometry;
    const positions = new Float32Array(source.attributes.position.count * 3);
    const colors = new Float32Array(positions.length);
    const limbs = new Float32Array(source.attributes.position.count);
    const arms = new Float32Array(source.attributes.position.count);
    const color = mesh.material.color;
    for (let i = 0; i < source.attributes.position.count; i++) {
      mesh.getVertexPosition(i, p).applyMatrix4(mesh.matrixWorld);
      p.toArray(positions, i * 3);
      color.toArray(colors, i * 3);
      if (mesh.skeleton && source.attributes.skinIndex) {
        for (let j = 0; j < 4; j++) {
          const bone =
            mesh.skeleton.bones[source.attributes.skinIndex.getComponent(i, j)];
          const weight = source.attributes.skinWeight.getComponent(i, j);
          if (/^leg/i.test(bone.name))
            limbs[i] += (/L$/i.test(bone.name) ? 1 : -1) * weight;
          if (/^arm/i.test(bone.name))
            arms[i] += (/L$/i.test(bone.name) ? 1 : -1) * weight;
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("crowdLimb", new THREE.BufferAttribute(limbs, 1));
    geometry.setAttribute("crowdArm", new THREE.BufferAttribute(arms, 1));
    geometry.setIndex(source.index.clone());
    geometry.computeVertexNormals();
    parts.push(geometry);
  });
  const result = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  mixer.stopAllAction();
  mixer.uncacheRoot(gltf.scene);
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  return result;
}

// Continuous bend keeps the silhouette attached at the feet. The same hook is
// used by the color AND normal pass so outlines follow the deformed surface.
export function bendMaterial(material) {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
      #ifdef USE_INSTANCING
      attribute vec2 crowdLean;
      attribute vec2 crowdStep;
      attribute float crowdLimb;
      attribute float crowdArm;
      attribute vec2 crowdHeld;
      #endif`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <beginnormal_vertex>",
      `#include <beginnormal_vertex>
      #ifdef USE_INSTANCING
      float armAngle = crowdArm * crowdHeld.y * (0.65 + sin(crowdHeld.x + crowdArm * 1.2) * 0.45);
      mat2 armRotation = mat2(cos(armAngle), sin(armAngle), -sin(armAngle), cos(armAngle));
      objectNormal.xy = armRotation * objectNormal.xy;
      float slope = max(position.y - 0.18, 0.0) * 0.7;
      objectNormal.y -= dot(crowdLean, objectNormal.xz) * slope;
      objectNormal = normalize(objectNormal);
      #endif`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float stride = sin(crowdStep.x) * crowdLimb * crowdStep.y;
      transformed.z += stride * 0.32;
      transformed.y += max(0.0, stride) * 0.16;
      float kick = sin(crowdHeld.x + crowdLimb * 1.5) * crowdLimb * crowdHeld.y;
      transformed.z += kick * 0.30;
      transformed.y += abs(kick) * 0.12;
      vec2 shoulder = vec2(sign(crowdArm) * 0.55, 1.65);
      transformed.xy = shoulder + armRotation * (transformed.xy - shoulder);
      transformed.z += sin(crowdHeld.x * 1.2) * abs(crowdArm) * crowdHeld.y * 0.10;
      float height = max(position.y - 0.18, 0.0);
      transformed.xz += crowdLean * height * height * 0.35;
      #endif`,
    );
  };
  material.customProgramCacheKey = () => "crowd-gentle-walk-pickup-v3";
  return material;
}
