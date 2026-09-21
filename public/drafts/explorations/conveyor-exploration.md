# Winding queue exploration

Branch: `codex/mole-conveyor-wiggle`. This iteration replaces the earlier conveyor with a long, three-row serpentine queue. There is no floor, belt, or building; green ropes and small yellow-capped stanchions define the line against the cream page.

Twenty attendees use all six mole variations and advance together along an arc-length path, easing between randomized 3.5–8.5 second runs and 5–8 second stops. One or two available adjacent pairs turn toward each other and chat once deceleration reaches a full stop; isolated gestures are scheduled sparsely. Each attendee keeps its own gait phase. A picked-up mole reserves a slot that continues moving with the line, returning to that slot on release. Path wrapping resets the spring history; a held mole stays at the drag position even when its reserved slot wraps.

## Interaction

Hover applies a subtle sway. Ground joint deflection is limited to 0.07 radians. Pickup enables softer body/head/limb springs with limits of 0.55/0.65/0.95 radians, respectively. The arms wave and feet kick while inertia from dragging bends the actual joints. Release returns the mole to its moving slot. Pointer cancellation, lost capture, Escape, hidden-tab transitions, and offscreen transitions also release it.

Keyboard controls: arrows select, Enter picks up/releases, arrows reposition a held mole, Space nudges, Escape releases. Reduced motion starts paused and uses direct static pickup poses. Paused release returns the mole immediately. Scene touch gestures are reserved for pickup and dragging; scrolling remains available outside the canvas.

## Rendering

The unchanged MIT-licensed `wiggle@0.0.17` module now drives six actual weighted bones per attendee: body, head, two arms, and two legs (120 springs total). Rest-transform adapters preserve the original bind matrices while supplying Wiggle's local +Y endpoint convention. Geometry and vertex colors are merged once per wardrobe; each attendee gets one SkinnedMesh and an independent skeleton. Original Walk, Idle, Chat, Wave, InspectBadge, Cheer, and Point clips are sampled and blended into pose drivers before secondary physics. Both color and normal passes use standard Three.js skinning, keeping outlines aligned.

Held characters can pass through ropes and one another: this is secondary skeletal motion, not collision simulation. Original GLBs remain unchanged. The earlier proxy-bone deformation shader is no longer used by the hero.

Performance controls: capped 30 fps rendering, fixed 60 Hz physics, shared geometry/materials, merged rope geometry, no shadow maps, capped low-resolution pixel output, offscreen/hidden-tab suspension, and rendering only on change while paused. Pixel size is 6 CSS px on desktop, 4 CSS px at viewport widths of 601–1000px, and 2 CSS px at 600px or below, recalculated on resize; outline and crease strength remain at 100%.

Local measurements in the 610px app panel: 43 total draw calls, 318,042 triangles across both scene passes and composite, 71 × 43 internal resolution at 8 CSS px per pixel, approximately 30 rendered fps. Sampled steady CPU work was around 2 ms per rendered frame after shader compilation. These are local observations, not low-end mobile or GPU completion benchmarks. Numeric diagnostics live in `#con-world`'s `data-metrics` attribute.

## Verification

- Pointer drag pickup and release checked in the browser.
- Keyboard pickup, lift, sideways shake, release, and paused release checked.
- Metrics confirmed lifted bodies, subtle body bend, 20 walkers normally / 19 while one is held, and active pickup limb animation.
- Desktop and mobile layout inspected.
- Path tests check bend continuity, constant speed, and periodic sampling.
- Astro check and production build pass; no console errors during interaction checks.

## Files

- `src/components/ConventionHero.astro`: header and accessible controls.
- `public/convention-header.js`: queue scheduling, physics, pickup, ropes, rendering.
- `public/mole-kit/queue-path.js`: arc-length serpentine path.
- `public/mole-kit/skinned-crowd.js`: shared weighted geometry, independent skeletons, pose drivers and joint physics.
- `tests/queue-path.test.mjs`: path continuity and periodicity checks.
- `public/mole-kit/vendor/wiggle.mjs`, `WIGGLE-LICENSE`: pinned upstream library.

Reference: https://wiggle.three.tools/docs/reference/wiggle-bone

Rig regression checks (all six variants): `node --experimental-loader ./tests/three-loader.mjs --test tests/skinned-crowd.test.mjs tests/queue-path.test.mjs`. Checks unchanged bind poses, independent skeletons, visible shake response, and settling without joint drift.

## Arrivals and queue life

The initial crowd starts above ground. Only recycled newcomers rise over 1.6 seconds, using a below-ground clipping plane in both render passes. Recycled attendees sink at the path end and emerge at the start rather than scaling into existence. A fixed pool of 160 instanced dirt cubes provides ballistic bursts, adding only two scene-pass draws while active. Reduced-motion loading starts with everyone above ground and no particle burst.

Queue timing is independent of rendering (`queue-life.js`). Pause freezes behavior and particles. Pickup interrupts that mole's conversation, and movement resumes the Walk clip with blended pose transitions. Nine tests cover queue timing/speed bounds, path continuity, rig stability, and finite transforms across every behavior clip.

## Crowd dialogue

One chatting pair per stop gets a short question-and-answer exchange, with staggered speaker bubbles. Quiet intervals can show an occasional thought (7–14 second scheduling intervals, only when no dialogue is pending). Gestures sometimes get a line, and nudges trigger a playful reply plus a brief dance when stopped and available. Dialogue cycles through eight exchanges; thoughts and reactions vary randomly.

Two reusable DOM bubbles follow projected character positions without extra WebGL draws. They stay legible above the pixelated render, avoid basic overlap, and are capped at one on mobile. Thought bubbles use a dashed border and dotted tail. All bubbles ignore pointer events, so pickup still works. Ambient dialogue is hidden from screen readers to avoid continuous announcements; the existing status region remains for user-triggered actions. Pause freezes ambient timing, and reduced-motion startup suppresses automatic dialogue.

Gesture visibility update: each complete stop schedules two available non-chatting moles for three-second actions, prioritizing a front-row attendee. They face the viewer and cycle through Wave, Dance, Cheer, Clap, and Point. Scheduling waits for a full stop and sufficient remaining pause time, so moving intervals no longer consume gesture opportunities. The opening pause is 5.5 seconds.

## Social hold-ups and embarrassed exits

On restart, the forward member of each chatting pair lingers facing backward for 1.3–2.2 seconds. Only the queue behind that attendee waits; front-to-back movement constraints preserve spacing when movement resumes. Pickup chooses the nearest visible, available neighbor for a surprised spoken reaction. Release triggers an embarrassed thought, landing, digging/clapping motion, pooled dirt, a temporary ground hole, and below-ground clipping. After disappearing, the attendee waits for space and re-emerges at the back. Burrowing attendees cannot be picked up and do not block the queue. Reduced-motion mode skips the moving exit. Ten tests now include hold-up propagation, recovery spacing, and excluding underground attendees.

Head-first exit: after landing, the mole tips 180 degrees around its torso (0.35–1.15 seconds), then descends (1.05–2.5 seconds). Dirt fires as the head enters; the inverted feet disappear last. The hole closes afterward.

## Asymmetric hero revision

The existing cream (#fffaeb), forest green, yellow (#ffd11b), and brown mole palette remains. The pixel display type carries a two-line, left-aligned title; body text and a single CTA are centered vertically beside the scene. The scene is one hero-width wide, positioned at left:40%, so 40% is clipped by the viewport. Mobile stacks the text above the cropped scene. This keeps the character queue as the main visual feature without the earlier control panel. Only an accessible Pause link remains; keyboard interactions and status announcements are preserved.

Desktop rendering now uses 5px pixels, tablet 4px, mobile 2px. Walking base speed increases from 0.8 to 1.35 world units/second. Followers temporarily accelerate to fill excess gaps and clamp at minimum spacing; distracted chat partners remain blockers. Regression tests cover catch-up as well as no-overlap behavior.

## Personal space, reliable emergence, and head interaction

Initial attendees are already packed with persistent random 1.20–1.48 world-unit spacing preferences. Catch-up also operates while the queue waits (except for attendees actively gesturing/chatting), and respects each follower's minimum gap. Rejoining attendees use their own spacing preference. Spawn resets now depend on crossing the path's end, not a large positional jump; emergence time caps at two seconds and uses the neutral Idle clip rather than looping Cheer under the ground plane.

Cursor proximity is evaluated on a head-height plane, including empty space near a mole. World-space cursor repulsion perturbs the existing WiggleBone simulation for actual weighted head/body bones with bounded angles, and decays when the cursor leaves. Wave, Cheer, Point, and InspectBadge hover reactions affect the upper body while preserving the walking gait, with per-mole cooldowns. Tests verify varied stationary gap-closing and force response/settling of real head bones across all six variants.

## Spawn stall regression fix

End-of-line sinking previously depended on queue distance, which left attendees half submerged when the queue stopped. `queue-lifecycle.js` now owns a timed 0.85-second exit followed by a 1.6-second emergence, independent of queue movement (global Pause still freezes all motion). Emerging actors cannot advance until they finish. Regression tests reproduce stopping mid-exit, catch-up during emergence, and hundreds of stop/start transitions. All 14 tests pass.

## Click celebration and hover outline

Pointer-down is pending until the cursor travels more than 6 CSS pixels. Pointer-up before that threshold triggers a Cheer and a short jump, never the pickup/drop burrow. Crossing the threshold starts pickup; dropping afterward retains the head-first embarrassed exit. Cancelled pending presses do not celebrate. A depth-tested selection mask highlights the hovered skinned silhouette in gold at the pixel-render resolution, costing one extra character draw only while selected. Speech takes priority over hover tooltips.
