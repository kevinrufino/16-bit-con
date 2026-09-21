# Schedule animation studies

Seven 128 × 128 calendar loops for 16-Bit Con, with the user-approved cozy pixel-art direction. The original coffee scene is retained. Subsequent direction: varied mole characters, some object-led scenes, and clearly different backgrounds.

| Slot | Scene | Setting |
| --- | --- | --- |
| 9 am | Blue-goggled mole with coffee | Bakery |
| 10 am | Vintage computer with mole sprite | Old lecture hall |
| 11 am | Ivory mole, apron and beret, painting | Greenhouse studio |
| 1 pm | Blue-goggled mole playing | Neon underground arcade |
| 2 pm | Two moles, cyan goggles and amber spectacles | Garden discussion stage |
| 3 pm | Homemade brass-and-cream mole robot | Basement workshop |
| 4 pm | Charcoal mole with red scarf, keyboard | Rooftop at dusk |

## Files

Open `preview.html` via a local server for the full gallery (port 8777 in the current session). Each scene folder contains the original concept, 128px input, generated frames, animated GIF, horizontal sprite sheet and animation metadata. Eight playback frames at 180ms each create a 1.44-second loop. PixelLab can return a ninth endpoint guide; that is retained but excluded from the repeated loop.

## Creation

Art and background edits use built-in image generation. Exact final image prompts and motion directions are saved in schedule-scenes.json and each scene's prompts.json/motion.txt. PixelLab unzoom converts the image grid with a 32-color palette, then ffmpeg resizes with nearest-neighbor to 128px. PixelLab animate-with-text-v3 generates motion using identical start/end guides. No generated media is wired into the production schedule yet.

## Budget

Free trial allowance only; no top-ups, purchases or paid credits. Opening balance for these six scenes: 37.9 generations and USD 0. The runner checks trial status, remaining generations and zero dollar credits before each generation. Final balance is in schedule-generation-balance.json.

These are review assets. Watch for generated shape drift and background changes, especially at the 48px mobile size, before choosing the final animations.

## Completed batch

All six new loops finished. Used 12.6 trial generations for this batch (0.6 cleanup + 12 animation). Final balance: 25.3 trial generations, USD credit balance 0. No cash spent. `schedule-overview.gif` presents the six new animations in schedule order, left-to-right across two rows. All outputs checked for eight present playback frames, actual frame variation, matching endpoint guides, GIF and sprite-sheet exports.
