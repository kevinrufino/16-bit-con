# 16-Bit Con

A fictional retro gaming convention built with Astro and Vega’s supplied brand system.

- Live site: https://sixteen-bit-con.vercel.app
- Repository: https://github.com/kevinrufino/sixteen-bit-con
- The repository is **private**. Reviewers need GitHub access; the live site is publicly reachable.
- Working Figma: https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/
- Original Figma: https://www.figma.com/design/ZfsnvhcUscelCq2PTmJ17k/

Production is deployed from the main project to the live URL above. For local development, run the main checkout at `http://localhost:4321`.

## Run and verify

Node 22.12+ is required; Node 24 is recommended.

```sh
npm install
npm run dev
npm run tokens
npm run check
npm test
npm run build
```

## Routes

- `/`: convention landing page, Experience, seven-stop day map and souvenir studio.
- `/design-system`: color, typography, spacing, motion, control, and token specimens.
- `/drafts`: exploration directory.
- `/drafts/guided-lineup`: archived three-session scroll-lock design, Booth 630 CTA, and recolored moles.
- `/drafts/explorations`: raw concept art, contact sheets, animation frames, and conveyor notes.
- `/drafts/landscape-hero`: archived landscape hero with the side-column title.
- `/drafts/convention-hero`: earlier interactive convention scene.
- `/drafts/original-cta` and `/drafts/workbook`: earlier editor, artwork, and visual directions.
- `/mole-kit/`: source character workshop.

## Design and motion

The main site keeps the original seven-session schedule and souvenir CTA. The separate Booth 630 CTA and three-session interpretation are preserved in `/drafts/guided-lineup`. There is no real booking, account, or registration backend.

The header separates “16,” “Bit,” and “Con” for a 480ms font cycle through Redaction variants before returning to PP Mondwest. The interactive queue keeps its real skinned models, picking, dragging, keyboard controls, and motion toggle. The hero canvas spans the entire hero so held characters can rise above the queue. Its rectangular CTA emits a short pixel sparkle on hover/focus. The Experience section occupies a viewport, rolls its counters on entry, and shares the word-based Redaction hover treatment on its numbers.

The lineup keeps the original sticky day map, seven story stops, and animated mole scenes. The main page uses native, freely interruptible scrolling without snapping or section locks. Calendar tiles reveal progressively as their items enter view; all seven videos run together while the schedule is visible. Staggered pixel-text reveals animate the time, metadata, heading, and description of each active item. Extra space after the last item delays the ticket curtain. Cream, green, and yellow tokens style the schedule and mosaic. The pause control and reduced-motion preference disable animations. The earlier scroll-lock exploration remains isolated in the guided-lineup draft.

The souvenir editor supports painting, keyboard navigation, undo, reset, clear, PNG export, and deselection by Escape, outside click, or the toolbar control. Yellow, cream, and green passes follow the brand’s restriction of blue to sky/background illustration. Its canvas spans the complete CTA/footer area.

## Shared design system

`src/design/tokens.json` is the source of truth. `npm run tokens` generates CSS variables and the public palette module; builds run this automatically. Components consume semantic roles. Canvas exports and the Three.js hero share the same definitions. See [the system guide](docs/design-system.md) and [the requirements review/resolution](docs/figma-requirements-review.md).

Brand logo, PP Mondwest, Geist, and Geist Mono were supplied or sourced from Vega’s public brand site; they retain their owners’ rights. Redaction fonts are self-hosted with OFL license files. Motion references: https://craft.gustavofior.com/, https://pixel-text-reveal.vercel.app/, and https://interfaces.dev/cheat-sheet. The pixel reveal is an original Astro/Canvas implementation; no third-party application bundle is embedded.

Historical explorations retain their original palettes and artwork to show the design process. Deployment artifacts are static; no credentials are included in browser code.
