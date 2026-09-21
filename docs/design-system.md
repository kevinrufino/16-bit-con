# Vega / 16-Bit Con design system

The code system is derived from the supplied Figma brand guidelines. View the live specimens at `/design-system`.

## One source, three consumers

- `src/design/tokens.json`: brand primitives, semantic colors, typography, spacing, layout, hit areas, motion, and elevation.
- `npm run tokens`: generates `src/styles/tokens.css` and `public/design-tokens.js`. It runs automatically before builds.
- Astro/CSS components use semantic CSS custom properties. `src/design/tokens.ts` resolves the same values for the editor, canvas, and exported passes. The Three.js hero imports the generated public palette.

Use semantic roles such as `--color-text`, `--color-accent`, and `--color-ticket-score` in components. Brand primitives belong in the token definitions. Historical drafts retain their original artwork/layouts as evidence of exploration; their shared layout receives the foundation tokens. Authored image assets and SVG path geometry are not CSS design tokens. Natural character fur/lighting colors have explicit illustration roles; main-site characters retain their original clothing colors at the user’s request; the recolored exploration is archived.

## Brand rules

Yellow #FFD11B, Leaf Green #0D5500, Daisy White #FFFAEB, and Outline Black #151514 form the UI. Sky Blue #8DCAFF is reserved for sky backgrounds. Lime #D5FB19 comes from the extended Figma greens and is available in the pixel palette. The High score ticket is cream, not blue.

PP Mondwest remains the display font, Geist the body face, and Geist Mono the metadata face. Redaction/35/50/70 are an explicitly requested, transient hover treatment; they return to Mondwest after 480 ms. The font files are WOFF2 and retain the package OFL license texts in `public/fonts/`.

The main site uses the restored seven-stop day map with native scrolling and seven pixel-text patterns (scan, dither, radial, reverse, rise, diagonal, fall). Its foreground mosaic and UI use the cream, green, and yellow token palette; original character artwork stays intact. The guided three-session schedule described below is preserved in `/drafts/guided-lineup`, along with the separate booth CTA.

The main page has no scroll locking or snapping. Tiles reveal progressively and schedule text reveals on entry. The hero CTA retains its rectangular button styling with pixel sparkles.

## Layout and behavior

- 4px spacing foundation, fluid gutters, 1440px maximum content width.
- 44px control targets, native links/buttons, visible focus rings, labeled inputs, status announcements, and decorative canvas layers excluded from interaction/accessibility.
- Scene travel: 680ms; word steps: 80ms; text materialization: 720ms; button press: 180ms.
- Experience: one viewport tall, with room to grow on short screens. Numbers roll to 03 days, 03 sessions, and Booth 630.
- Schedule: three one-viewport scenes, compact agenda, previous/next links, and direct time links. Wheel, touch, and keyboard gestures move one scene at a time. Scrollbar releases settle to the nearest scene. Users can exit before the first and after the last. No mandatory guidance in reduced-motion mode or when content cannot fit.
- Pixel reveal is an original Canvas 2D implementation inspired by the supplied reference, not a copied bundle. It keeps native heading text accessible, makes no draw calls after the effect ends, and varies between scan, ordered dither, and radial reveal.
- Hover cycling is limited to devices with mouse input, with focus as an equivalent trigger. Reduced motion bypasses cycling, counters, reveal effects, and scroll pinning.

## Reference-specific decisions

Applied the Interfaces checklist where it fits this brand: semantic tokens, numeric stability, explicit transition properties, restrained button press feedback, WOFF2, grouped spacing, descriptive labels, correct native elements, focus-visible, larger targets, and reduced motion. Kept sharp pixel geometry instead of adding rounded corners indiscriminately. Did not add an unrelated theme switch or subscription flow.

Sources: [Figma brand foundation](https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/?node-id=37-2), [Craft hover reference](https://craft.gustavofior.com/), [pixel reveal reference](https://pixel-text-reveal.vercel.app/), [Interfaces checklist](https://interfaces.dev/cheat-sheet), [Redaction typeface](https://www.redaction.us/).
