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

## Art and model slots

Everything is built from images in `public/art/` (png, jpg or webp). Swap any of them for your own scans or photos, reload, and the print shop in `src/art/era.js` re-separates the foil automatically.

| File | Exhibit | How the finish is derived |
|---|---|---|
| `dunk.png` | 01 Prism parallel card | Dark shadows in the photo go prismatic; gold name is embossed metallic ink |
| `drive.png` | 02 Holoview insert | Transparent PNG or green screen: the figure prints matte over a full diamond-foil background |
| `comic.png` | 03 Chromium comic | Whole cover over foil; highlights flare, sparkle in the hottest whites; bright saturated masthead is embossed metal |
| `blister.png` | 04 Blister backing window | Cracked-ice foil under the art |
| `flicker.png` | 05 Lenticular card | Three frames side by side; each is cropped to the lens window |
| `pack.png` | 06 Wax pack wrapper | Metallised film everywhere except near-white areas (opaque white ink) |
| `poster-1.png`, `poster-2.png` | Wall laser posters | Holographic film with transparent inks, sparkle in highlights |

Optional: drop a `public/models/toy.glb` and it replaces the procedural ship inside the blister pack (auto-centred and scaled).
