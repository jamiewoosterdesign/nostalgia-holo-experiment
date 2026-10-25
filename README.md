# HOLO/ARCHIVE

A personal nostalgia gallery built with Three.js: real collectible scans, angle-dependent print finishes, transparent acetate, and an off-axis room you can look into.

## Run locally

```sh
npm install
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173. Build with `npm run build`; serve the build with `npm run preview`. Vercel builds this Vite project from `main` and serves `dist`.

## The collection

| Exhibit | Artwork and finish |
|---|---|
| Hulk | 1994 Marvel Masterpieces Silver Holofoil, fine silver microflakes with dense ink over the figure |
| Wolverine | Suspended Animation front and reverse supplied by the owner, printed on a genuinely transmissive purple/amber acetate surface |
| Spider-Man #50 | September 1994 cover, with a diffraction mask confined to the two Holo-Grafx eyes |
| U.S.S. Enterprise | Original period-inspired Star Trek packaging, printed space backdrop, holographic title lettering, clear blister and unpackable model |
| Bartman W2 | Two photographed poses from the 1994 SkyBox Wiggle card, selected by viewing angle, plus its real puzzle reverse |
| Upper Deck pack | Real silver/red 1994–95 Hobby wrapper and 12 real card fronts and backs, including Jordan Holojam, a checklist and a Special Edition foil |

The pack is a curated 1991–94 selection inside a period wrapper, not a reconstruction of factory collation. Hulk and the comic have clearly labelled archive display reverses because original reverse scans are not included. The toy packaging is a new mockup, not a scan of a historical retail package.

## Controls

| Action | Input |
|---|---|
| Look into the room | Move the mouse, or enable optional head tracking |
| Move closer / further | Scroll wheel, or lean with tracking enabled |
| Inspect | Click an object, or keys `1`–`6` |
| Tilt | Drag the selected object |
| Flip | `F`, double-click, or the Flip button |
| Unpack / repack the ship | `U` |
| Open / reseal basketball pack | `O` |
| Browse the open pack | Left / Right arrow keys or Previous / Next card |
| Return to gallery | `Esc` or click empty space |
| Calibration and quality | Gear button |

Bloom starts enabled at a restrained strength. Floor reflections and depth of field can also be toggled. Quality preferences persist locally. Head tracking requires camera permission and either localhost or HTTPS; mouse interaction works without a camera.

## Sources and implementation

See [ASSET_SOURCES.md](ASSET_SOURCES.md) and the JSON provenance files under `public/assets/`. Original source photos remain unchanged on disk. The renderer crops and perspective-corrects them, applies separate finish masks, and recreates the physical substrates. Texture canvas dimensions do not imply additional source detail. Bartman's photographs retain some optical ghosting; better scans of both poses can replace them later.

- `src/exhibits/realCatalog.js`: the six exhibits and their material settings.
- `src/exhibits/basketballPack.js`: opening, browsing and flipping all 12 cards.
- `src/exhibits/wolverine.js`: independent front/reverse ink masks and transparent substrate.
- `src/art/simpsonsFrames.js`: perspective rectification and the two-pose lenticular atlas.
- `src/art/toyPackaging.js`: editable canvas artwork and title-only foil masks.
- `src/materials/holoMaterial.js`: view-dependent diffraction, metallic ink, microflakes and lenticular lenses.
- `src/render/offAxisCamera.js` and `src/tracking/`: room projection and optional face tracking.

To use a custom ship, put a GLB in `public/models/` and set `VITE_TOY_MODEL_URL=/models/toy.glb` in the build environment. Without that setting, the built-in model is used without requesting a missing file.
