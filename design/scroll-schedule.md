# Scroll schedule exploration

Branch: `explore/scroll-schedule`. Based on committed main (`1e9fa01`), leaving in-progress hero and mole work in the original checkout.

## Direction

Use the existing Vega palette: Daisy White #fffaeb, Leaf Green #0d5500, Deep Green #001400, Florets Yellow #ffd11b, Sky Blue #8dcaff. PP Mondwest carries the time and headlines; Geist carries descriptions; Geist Mono labels times and venues.

Desktop: [sticky day map, about two-thirds width] [scrolling narrative, one-third]. Mobile: a compact sticky map above the narrative. Text is left aligned. The day map is the expressive element; the narrative stays simple.

The grid represents discrete agenda slots, not equal elapsed time: 9, 10, 11 am, then 1, 2, 3, 4 pm. Venue lanes keep the scattered layout meaningful and repeatable. No runtime randomness. Event copy and the 3 pm open demo are exploration content.

The direct video reference was inspected in the browser after the web fetch returned 403. Its defining composition is a continuous animated line drawing behind a calendar with scattered, edge-to-edge animated scenes. The second pass uses an original mole line drawing behind the grid and flush scene cells.

## Motion and assets

`ScrollSchedule.astro` owns the grid, slot content, venue rows, and background illustration. `ScheduleScene.astro` contains seven lightweight animated SVG stand-ins. Replace its scene output with the eventual animated artwork; keep the surrounding tile links, accessible names, and scroll states. The background art can replace `.map-landscape` without changing grid placement.

The active timeline stop is selected by proximity to the reading position in the viewport. Its tile highlights, earlier tiles stay revealed, and future tiles stay transparent, exposing the drawing underneath. Scrolling backwards reverses the reveal. Both time headers and tiles are anchor links. A pause control stops ambient motion. Reduced motion shows all scenes and readable text without animation; without JavaScript all schedule content stays visible.

## Running

`npm run dev -- --port 4325`, then visit `http://localhost:4325/#schedule`.

This worktree uses the original checkout's installed dependencies via a node_modules symlink. For independent dependency installs, remove only the symlink and run `npm ci`.

Validation: Astro check (zero errors/warnings) and production build pass. Desktop and 390px mobile layouts inspected. Verified 4 pm reveals seven scenes, reverse navigation to 10 am reveals two, and pause stops all scene and background animations. Mobile document width equals viewport width (390px). No browser console errors observed.

## Colored-block background

Replaced the line drawing with the user's live colored-block mole renderer from `mole-hero-assets`. The original 23-second H.264 loop is copied into `public/video/calendar-mole.mp4` (2.3 MB); no dependency on the server at port 8765. `calendar-mole.ts` uses a predominantly yellow-and-blue palette (five of six swatches, with a soft green accent), 17.5×10 source-pixel blocks (2.5× larger), 3 source-pixel spacing, and 35% silhouette threshold. The video is right-aligned and contained without stretching, and white pixels are transparent over the calendar paper. The source preview's headline and editor controls are omitted.

The existing pause control also pauses the video. Playback suspends when the calendar is offscreen or the document is hidden. Reduced motion starts with a static frame. Verified loaded video playback, pause/resume, timeline overlays, desktop layout, and no overflow at the compact browser width. Astro check and production build pass.

## Animated environment

`CalendarEnvironment.astro` adds three stepped flower silhouettes based on the existing Vega-inspired pixel playground, with independently phased stem sway and flower-head motion. Three pale blue clouds drift at different speeds. The SVG sits behind the transparent mole canvas, below the calendar grid and session tiles. No new video or generated asset is needed. All environment animations honor the shared pause control and reduced-motion preference. Desktop and 390px mobile inspected; no horizontal overflow. Pause verified for both environment and mole. Build and type checks pass.

## Unified mosaic pass

The separate SVG layer is now replaced by canvas silhouette drawing in `calendar-environment.ts`. Flowers and clouds are composited with the video into a single sampling surface before thresholding, coloring, and drawing blocks. All scenery shares one grid origin, block dimensions, spacing, and yellow/blue palette. Motion uses the video clock so pause, reduced motion, and visibility suspension apply to the entire scene. Desktop appearance and shared pause verified; build and type checks pass.
