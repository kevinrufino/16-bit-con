# 16 Bit Con — mole character kit

Version 3: reference-driven continuous body silhouette, fuller projecting belly, tiny tucked feet, taller wraparound goggles, and sprite-view comparison.

Six original 3D interpretations of the supplied pixel-art references, sharing an eight-bone skeleton and thirteen animations. Made for small, stylized convention crowds and toon/pixel rendering.

## Deliverables

- `16-bit-con-moles.blend`: editable Blender 5.2 source, all six characters arranged on a lit preview stage, with goggles enabled by default. Each character has its own collection. Body, eyewear, clothes, and accessories remain separate editable objects; the head and torso are now a single mesh.
- `../../public/mole-kit/*.glb`: six standalone, animated, web-ready characters wearing goggles. `../../public/mole-kit/eyewear/` contains the other 24 character/eyewear combinations; all 30 GLBs include the complete animation set. Each export joins the geometry into one mesh with material primitives, preserving skinning.
- `../../public/mole-kit/index.html`: local character lab with orbit controls, character and animation selection, eyewear selection, toon shading, pixel size, outline strength, speed, pause, and download controls. Downloads follow the selected character and eyewear. Uses bundled Three.js 0.180.0; no CDN or network dependency.
- `../../public/mole-kit/lineup.png`: rendered character lineup.
- `build_moles.py`: reproducible model, rig, animation, export, and render generation.
- `validation.json`: Khronos glTF Validator results for all 30 exports.

## Characters

| File | Character | Features | Triangles |
| --- | --- | --- | ---: |
| classic.glb | Classic | Cyan strapped goggles, red nose, golden paws | 6,244 |
| propeller.glb | Propeller | Red/white cap, animated yellow propeller | 7,184 |
| superfan.glb | Superfan | Flower beanie, white shirt, jeans, heart tote | 8,480 |
| crew.glb | Crew | Purple shirt, convention badge, headset/mic | 8,112 |
| gamer.glb | Gamer | Dark shirt, purple headphones and backpack | 8,136 |
| artist.glb | Artist | Beret, green shirt, sketchbook, pencil | 7,276 |

The superfan is a simplified interpretation of the detailed reference; tiny jewelry, lettering, and the dangling plush are omitted to keep the silhouette legible at low resolution.

## Animations

All exports contain the same exact clip names, including a static ReferencePose for comparison. Time is in seconds at 24 fps.

| Clip | Duration | Usage |
| --- | ---: | --- |
| ReferencePose | 1 | Near paw held forward to compare with the supplied classic sprite |
| Idle | 3 | Subtle breathing and head movement; loops |
| Walk | 1 | In-place walk; move the scene root in your app; loops |
| SitDown | 1.25 | Standing to sitting; play once, then switch to Sitting |
| Sitting | 3 | Seated idle; loops |
| Sleep | 4 | Seated dozing, lowered head, breathing; loops |
| Chat | 3 | Conversational arm and head gestures; loops |
| Wave | 2 | Raised-paw greeting; loops |
| Cheer | 2 | Raised arms and gentle bounce; loops |
| Dance | 2 | Side-to-side convention dance; loops |
| Point | 2.5 | Directional pose for booths/signage; loops |
| InspectBadge | 3 | Looks down toward the lanyard; loops |
| Clap | 1.5 | Paws meet in front of the chest, two beats per loop |

Crossfade loops over roughly 0.2–0.3 seconds. `SitDown` should use `LoopOnce` and clamp at the end. `Sitting` and `Sleep` are already seated; do not add another vertical offset. The viewer includes a separate chair for context; the chair is not part of any GLB. The propeller spins in every clip for the propeller variant.

## Preview

From the project root:

```sh
python3 -m http.server 4178 --bind 127.0.0.1 --directory public
```

Open http://127.0.0.1:4178/mole-kit/. The viewer must be served over HTTP rather than opened as a file. It also works at `/mole-kit/` through the existing Astro dev server. No application dependencies or existing landing-page files were changed.

## Blender

Open the `.blend`. Each character starts with its Idle NLA track enabled. To preview another animation:

1. Select the character's `Mole_<variant>` armature in its collection.
2. Open the Nonlinear Animation editor.
3. Mute Idle and unmute exactly one desired track (or solo that track).
4. Play frames 1–97; set the end frame to that strip's end for exact loop playback.

To change eyewear in Blender, expand a character collection and its `eyewear / ...` subcollections. Disable the current eyewear collection for both viewport and render, then enable one alternative. The `bare` option has no accessory geometry; turn all eyewear collections off to use it. The source keeps each option editable.

The rig has `root`, `body`, `head`, `arm.L`, `arm.R`, `leg.L`, `leg.R`, and `prop`. The body is one continuous lofted mesh with blended body/head weights and smooth normals. Arms, feet, and accessories use rigid weights. This is an intentionally simple FK rig with mitten paws: no finger articulation, IK, facial blendshapes, or lip sync. Chat is gestural; Sleep is a seated doze behind opaque glasses. There is no separate head sphere or neck seam. The body profile is defined by explicit cross-sections in `BODY_PROFILE`, making silhouette edits reproducible.

## Web integration

```js
const gltf = await new GLTFLoader().loadAsync('/mole-kit/superfan.glb');
scene.add(gltf.scene);
const mixer = new THREE.AnimationMixer(gltf.scene);
const clips = Object.fromEntries(gltf.animations.map(clip => [clip.name, clip]));
mixer.clipAction(clips.Chat).play();
// In your render loop:
mixer.update(deltaSeconds);
```

Move/rotate the **whole loaded scene**, preserving the skeleton with the meshes. glTF uses Y up and +Z forward; Blender source uses Z up and -Y forward. Resting height is about 2.8 units (3.1 with the propeller). Resize the whole loaded scene for your environment. To duplicate a character with a separate skeleton, use Three.js `SkeletonUtils.clone` and an independent mixer.

## Reference comparison

The default **Sprite view** uses a nearly level orthographic camera, six-screen-pixel sampling, a flat background, and the static `ReferencePose`. It removes the display plinth and minimizes lighting changes that were making the first models look like separate rounded toys. Switch to **3D stage** to inspect the assets in a conventional lit scene. Orbiting remains available in both modes.

Enable **Compare with original** for a side-by-side view. Original supplied PNGs are included unchanged in `public/mole-kit/references/`. Classic, propeller, and superfan use their respective references; the other outfits use the classic body reference. Pose, projection, and hand-authored pixel placement differ between the supplied images, so this is a visual comparison rather than a verified numerical similarity score. The profile-facing classic sprite was the primary body-shape target.

The continuous upper body, fuller forward belly, small tucked feet, broad tapered muzzle, short mitten hands, and lowered wraparound goggles replace the v1/v2 proportions. Clothing and badges are refitted to that contour. The classic goggles export is approximately 6,000 triangles; see the manifest for exact counts by combination.

## Eyewear and pixel rendering

Every character has five choices: **strapped goggles** (default), square glasses, round spectacles, arcade visor, and no eyewear. Default goggles preserve the chunky cyan shape from the references with deep eyecups, rubber seals, a dark wraparound band, and side buckles. Round spectacles have open frames so you can see the eyes. The top-level character GLBs always use goggles; the manifest maps all other filenames.

Materials use flat color and roughness without external textures. The preview replaces them with two-tone toon materials using the supplied sprite palette and restrained warm shadows, and uses an orthographic camera. `PixelOutlineRenderer.js` then renders color/depth and skinned normals at low resolution, detects silhouette/occlusion boundaries and sharp creases, composites nearly black exterior outlines, color-relative interior edges, and subtle light edges, quantizes the output palette to 5 bits per channel, and upscales with nearest-neighbor filtering. It also draws hard-edged cast shadows. The outline-strength slider runs from 0 to 100%; the pixel-size slider controls resolution.

The edge renderer requires an **orthographic camera** because its depth comparison is linear. The thresholds are tuned to these models' original units; keep that scale or adjust the thresholds if resizing assets. See `viewer.js` for `toonMaterial`, shadow settings, render-loop integration, and resize handling. Call `PixelOutlineRenderer.dispose()` when removing a preview. Outlines are generated at runtime, not baked into GLB materials.

Exports use one mesh and eight bones each, with material primitives. For a large crowd, profile on target mobile devices, share geometry/materials, stagger animation updates, and consider distant sprite/LOD representations. The supplied character set has not been benchmarked as a large instanced crowd.

## Rebuild and verify

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python design/mole-kit/build_moles.py
```

Rebuild overwrites this kit's generated `.blend`, GLBs, manifest, and lineup image. Hand-edited work should be saved under another name before rebuilding. Blender may create a `.blend1` backup.

For structural validation, install the official `gltf-validator` package in a temporary tools folder and run:

```sh
NODE_PATH=/path/to/tools/node_modules node design/mole-kit/validate_glbs.cjs
```

This checks each GLB against the glTF specification and checks the expected skeleton and animation counts. See `validation.json` for the actual results. Clapping is also checked independently in the Blender source (`check_clap.py`) and in the exported GLBs using Three.js (`check_exported_clap.mjs`). Both sample all 37 frames for each character, asserting that the paw centers stay ahead of the torso and that their separation closes and opens. Results are saved in `clap-validation.json` and `exported-clap-validation.json`. The corrected animation uses the rig's actual bone bases instead of assuming Euler rotations act in world space. No Mixamo assets are used.

The interactive preview is also checked for eyewear switching, shader output, animation playback, and character loading.
