# HOLO/ARCHIVE: Gallery 01, Foil & Light

An experiment in holographic print finishes and off-axis "window" depth, built with Three.js.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click **Enable head tracking**. Browsers only allow camera access on `localhost` or HTTPS.

The mouse stands in for your head until a face is found, and again whenever you leave the frame.

## Controls

| Action | Input |
|---|---|
| Look into the room | Move your head, or the mouse when tracking is off |
| Move closer or further | Lean in, or use the scroll wheel |
| Inspect an exhibit | Click it |
| Tilt it | Drag |
| Flip it | Double-click or `F` |
| Unpack the blister | `U` |
| Return it | `Esc`, or click empty space |
| Calibration and quality | The ⚙ button |

**Calibration tips.** Set *Screen height* to your display's physical height: a 14" MacBook Pro is about 19.5 cm and a 16" is about 22.5 cm. If the room feels swimmy, lower *Parallax*. If tracking jitters, raise *Smoothing*.

## How it works

- **Off-axis projection** (`src/render/offAxisCamera.js`). The screen is a fixed window at z = 0, and moving the eye skews the frustum instead of rotating the camera. That is what makes the screen read as a window.
- **Head tracking** (`src/tracking/`). MediaPipe Face Landmarker finds the iris centres. Distance comes from the inter-pupil gap, and a One-Euro filter smooths the result. With several faces in view, it locks onto one and keeps following that person.
- **HoloMaterial** (`src/materials/holoMaterial.js`). A `MeshPhysicalMaterial` with a print and foil stage injected before lighting. The foil changes base colour, metalness, roughness and the shading normal, so the rainbows are real reflections of the room. A mask texture says where each finish goes:
  - **R:** prismatic foil (linear, concentric, starburst, diamond or cracked-ice diffraction)
  - **G:** sparkle flakes. Each Voronoi cell gets its own random tilt, so cells glint independently.
  - **B:** metallic ink. The art colour becomes tinted metal.
  - A **height map** adds embossing, `brush` adds brushed-metal streaks, `crinkle` adds film creases, and `lenticular` picks animation frames by viewing angle under ridged lenses.
- **Shared environment** (`src/render/environment.js`). Soft window-shaped light panels are baked into the environment map, so the same reflection slides across every surface.
- **Floor mirror** (`src/render/mirror.js`). A planar reflection that stays correct under the skewed off-axis frustum, blurred by mip level.
- **Ships** (`src/ships/`). Two original procedural models: an explorer cruiser and a battered freighter. The studio renders them into the card art and into the 16-frame motion-card atlas.

## Swapping in generated art

Drop PNGs into `public/art/` and reload. See `src/art/overrides.js` for exactly where each one lands.

| File | Where it goes | Aspect |
|---|---|---|
| `selective.png` | Card 01 art window | ~0.88 : 1 portrait |
| `selective-foil.png` | Optional greyscale mask: white = foil, black = matte | same |
| `refractor.png` | Card 02 art window | ~0.87 : 1 |
| `comic.png` | Comic cover, below the masthead | ~0.83 : 1 |
| `blister.png` | Blister backing window | ~1.1 : 1 |
| `packet.png` | Centre panel of the foil packet | ~1.75 : 1 landscape |

Suggested prompts. They are deliberately original, with the right era and no existing characters:

1. **selective.png:** "1990s trading card illustration, a sleek white explorer starship with a large elliptical saucer and two long glowing blue engine nacelles, banking over a ringed coral-pink planet, deep indigo-to-magenta nebula, scattered bright stars, painterly airbrush style, dramatic lighting, no text, no border"
2. **selective-foil.png:** "the same composition as a pure black-and-white mask: stars, nebula wisps and planet ring in white, the starship and planet body in solid black, no grey"
3. **refractor.png:** "1990s chrome trading card art, an original cyborg sentinel head and shoulders with a glowing red visor slit, polished chrome plating, synthwave sun and neon grid behind, radial light rays, airbrushed, no text"
4. **comic.png:** "early-90s comic book cover art, a battered round freighter spaceship with forward mandibles swooping past the camera through radiating speed lines, teal planet in the lower right, halftone dots, bold inks and flat colours, dynamic angle, no text or logo"
5. **blister.png:** "toy packaging backdrop, blueprint grid on a bright blue-to-violet gradient with a soft white glow in the centre, 1990s action-figure card style, no text"
6. **packet.png:** "abstract 1990s trading-card pack graphic, bold diagonal stripes of electric blue, violet, hot pink and orange with starbursts and lightning shapes, no text"
