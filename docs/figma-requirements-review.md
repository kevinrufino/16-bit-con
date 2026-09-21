# 16-Bit Con — Figma requirements review

## Latest user direction

Restored the original seven-stop day map and original mole clothing colors on the main site. Removed the separate Booth 630 section so the souvenir studio is the single closing CTA. The previous three-session design, pixel reveals, extra CTA, and recolored hero are preserved at `/drafts/guided-lineup`. Earlier resolution notes below describe that archived exploration.

## Resolution after the design-system update

- Added a distinct “Find us on the floor” CTA with Booth 630, the venue/date, a downloadable calendar event, and copyable booth details. The souvenir editor is now the separate creative section.
- Aligned main-site event copy with October 3–5, 2026 and Javits Center, New York; updated visible/exported tickets and metadata.
- Replaced the seven-stop scroll journey with a compact agenda and three guided full-screen sessions from the sample copy. Matched the scene illustrations with a consistent editable pixel system.
- Removed blue foreground/UI usage; added semantic tokens, a live design-system page, and shared canvas/Three.js palette output.
- Published all 107 raster process studies from `design/asset-tests` in the raw-exploration gallery, plus conveyor notes. Historical draft routes remain available.
- Verified that `https://sixteen-bit-con.vercel.app` responds publicly and that the linked repository exists. **The GitHub repository is private**: reviewers still need repository access or an authorized visibility change. No visibility or collaborator permissions were changed.
- The original 4–6 hour time budget is historical and cannot be retroactively fixed or independently verified. This expanded follow-up is additional requested work.

Validation: production build succeeds; Astro checks report zero errors and warnings; all 19 tests pass. Browser checks cover desktop and mobile layouts, word hover reset, reduced motion, whole-session wheel/touch/keyboard navigation, schedule exits, ticket painting/deselection, and full-footer canvas bounds. The changes are prepared for the user-requested main-branch production deployment.

The original review below is preserved as the before-state; implemented findings are described above.


Reviewed the current local main site after the hero update against the supplied Figma file. The linked node `301:2` is the cover page; requirements were read from **🗓️ Instructions**, **🎨 Brand Guidlines**, and **🏠 Copy**. This is a review, not authorization to change event details or implement the findings below.

## Highest-priority differences

| Priority | Finding | Evidence and implication | Suggested action |
| --- | --- | --- | --- |
| High | The final CTA is a souvenir editor, not the requested event action. | The brief requires a register, RSVP, or “find us on the floor” section. `PassStudio.astro` and `pass-studio.ts` collect a player name and export a PNG; the dialog explicitly identifies a fictional souvenir. There is no RSVP action or booth information. The creative editor is strong, but its purpose differs from the requested CTA. | Keep the editor as the creative section and make the final action clearly event-oriented. A fictional registration confirmation or booth-finding action would satisfy the intent without requiring a real registration backend. |
| High | Blue is used outside the brand’s stated sky/background role. | The Blue guidelines explicitly restrict blue to sky backgrounds/illustrations. The High score ticket uses blue as its paper color, and the palette lets users paint blue foreground pixels. Schedule tiles also use blue as a general tile color. | Use yellow, green, and cream for ticket paper and foreground UI. Reserve sky blue for illustrated skies/backgrounds. The primary palette also calls Sky Blue an accent, so the file contains some ambiguity; the specific sky-only rule is the stricter interpretation. |
| Medium | The timeline is much more elaborate than the requested simple schedule. | Seven story stops each have a minimum height of 65vh, in addition to the introduction; a sticky map, animated scenes, progressive reveals, and curtain scrolling add complexity. The timeline exists, so this is a usability/scope concern rather than a missing required element. | Offer a compact, readable agenda or shorten the scroll journey while retaining the map as an enhancement. |
| Medium | The drafts directory is curated, while the brief asks for all raw explorations. | `/drafts` now includes the landscape version, convention hero, character lab, original CTA, and workbook. Files under `design/asset-tests/` and `design/conveyor-exploration.md` are not directly surfaced there. I cannot verify that every exploration is represented. | Add an exploration/contact-sheet gallery and short notes explaining the choices and rejected directions. |
| Medium | The live-link deliverable is not verified. | The brief asks for a hosted site and repository link. The Git remote is `https://github.com/kevinrufino/sixteen-bit-con.git`; the reviewed site is localhost and README does not list a deployment URL. This does not establish that no deployment exists. Repository public accessibility was not checked. | Confirm the public deployment and repository access, and put both URLs in the handoff/README. |

Sources: [required sections](https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/?node-id=7518-123), [blue restriction](https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/?node-id=7605-820), [explorations guideline](https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/?node-id=7518-124), [deliverables](https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/?node-id=7545-4).

## Supplied copy versus current copy

The copy page explicitly allows adaptation. These are differences, not automatic failures:

| Item | Figma sample | Current site |
| --- | --- | --- |
| Event name | 16-Bit Con | Matches |
| Tagline | The retro gaming convention for people who never stopped playing. | Matches |
| Date | October 3–5, 2026 | October 24, 2026 |
| Venue | Javits Center, New York | Jarvis Center, NY — retained from the user’s explicit instruction |
| Agenda | 10:00 opening keynote; 2:00 pixel-art/AI panel; 6:00 Vega after-party at Booth 630 | Seven invented sessions from 9 am to 4 pm |
| CTA | Register now / Find us at Booth 630 | Get your pass / Make this my pass; creates a souvenir |

If matching the sample event is desired, date, venue, schedule, visible ticket details, exported pass text, and metadata should be changed together. The venue spelling in Figma is **Javits**, not **Jarvis**. No event facts were changed as part of this review.

Source: [adaptable sample copy](https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/?node-id=7545-12).

## Brand and design interpretation

- **Tone:** The guidelines call for an intentional, bold, irreverent Gen-Z edge. “A little nostalgia. A lot of possibility,” “Make your mark,” and “Built for the love of what’s next” are gentler and more generic. This is a creative judgment, not a mechanical compliance failure.
- **Illustration cohesion:** The guidelines emphasize precise pixels, clear silhouettes, and mostly top-down game-world scenes. The site combines a rendered 3D mole queue, illustrated schedule videos, and a 16×16 ticket editor. All are retro-inspired, but their perspectives and pixel scales differ. A shared perspective and pixel scale would make the system more cohesive. “Mostly top-down” is a direction, not an absolute ban on other views.
- **Hero CTA placement:** The single “Get your pass” action is in the header and remains visible with the hero on desktop and mobile. The hero body has no action. This meets the first-view conversion intent, but a literal reading of “Hero section … clear CTA” favors moving that one action into the hero instead of adding a duplicate.
- **Typography and foundation:** PP Mondwest headlines, Geist body, Geist Mono details, the supplied logo, and the four principal brand colors are present. These are aligned with the brand foundation.

Sources: [tone](https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/?node-id=7605-984), [illustration direction](https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/?node-id=7531-3607), [brand guidelines](https://www.figma.com/design/IOaTIe2PBjpjxujIvQX5aT/?node-id=37-2).

## Requirements already represented

- A single landing page with event name, date, location, first-view CTA, schedule, and an additional experience section.
- An original interactive creative element: the mole queue and editable souvenir tickets provide more than one.
- Astro implementation, which earns the framework preference in the brief.
- A duplicated working Figma file and a separate drafts route, documented in README.
- Responsive hero layout, keyboard-operated ticket editing, and reduced-motion handling.

The brief also gives a **4–6 hour limit**. Actual elapsed project time is not verifiable from the site or the current changes. The custom 3D interaction, seven animated schedule scenes, ticket drawing, tear animation, and export flow suggest a broader scope than the minimum brief; that is an inference, not evidence that the limit was exceeded.

## Changes made in this task

- Preserved the landscape hero and its side-column text in `/drafts/landscape-hero`, linked from `/drafts`. Its hero component and queue script are copied; the lower-page components and model assets remain shared.
- Removed the landscape from the main hero.
- Matched the referenced convention-hero draft’s text hierarchy: metadata row, wide single-line title, and supporting copy below. Kept the requested current copy, venue/date, one header CTA, and current interactive queue.
- Left the other review findings as notes for a subsequent decision.
