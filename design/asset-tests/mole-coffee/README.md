# Mole coffee — first calendar asset test

For the 9 am Doors open tile in 16-Bit Con. This is an isolated review asset; the live schedule is unchanged.

## Art direction / image prompt

Built-in image generation, using `public/mole-kit/references/classic.png` for character identity. A friendly round brown mole with cyan rectangular goggles and a pink nose cradles a cream coffee mug at a wooden bakery counter. Kiki's Delivery Service / Hayao Miyazaki inspired cozy bakery atmosphere and tender everyday magic, translated into low-resolution 16-bit pixel art. Waist-up three-quarter composition, warm morning light, honey brown and cream, sage shadows, blue window. Character and mug dominate the frame. No text or other characters. Resting pose for a subtle breathing and steam loop.

Generated concept is preserved as concept.png. PixelLab unzoom with 32-color quantization produced first-frame.png; nearest-neighbor delivery resizing produced input-128.png. Animation uses PixelLab animate-with-text-v3, 8 frames, seed 42, identical first/last guides. Exact animation prompt and request are in generate.py.

## Budget

Authorized: free trial allowance only. Opening balance: 40 trial generations, USD credits 0. No purchases or top-ups. Unzoom used 0.1 trial generation. Final balance recorded after animation completion.

## Review

Open preview.html through a local HTTP server. Compare enlarged preview, 96px desktop tile, and 48px mobile tile. Check goggles and mug consistency, seam, stable background, steam readability. The image generator produced more background detail than requested; this is a style test, not a pixel-perfect finished asset.

## Result

PixelLab returned 9 images for the 8-frame request (endpoint guidance included). The review loop uses frames 00–07, 180ms per frame, 1.44 seconds total; all raw returned frames are retained. Exports: mole-coffee.gif (512px nearest-neighbor preview), spritesheet.png (8 × 128px horizontal frames), preview.html (pause control and multiple display sizes).

Final balance: 37.9 / 40 trial generations. Total consumption: 2.1 trial generations. USD credit balance remains 0; no cash spent.
