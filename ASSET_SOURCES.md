# Artwork provenance

This file records the original imagery and the digital material treatments used in the personal collection.

## Active sources

- **Basketball:** 12 original card fronts and backs, plus the 1994–95 Upper Deck Series One Hobby wrapper. `public/assets/basketball/catalog.json` is the runtime manifest, including crop coordinates. `sources.json` and `wrapper.json` in the same folder record source pages, original image URLs and native sizes. Cards are a curated selection across years, not factory pack odds or collation.
- **Spider-Man #50:** user-supplied cover image, `public/assets/marvel/spider-man-50-reference.png` (1078 × 1616). The cover stays intact; the two eye areas receive a separate view-dependent foil mask. The reflection depicts Grim Hunter, Kraven's son. The reverse is labelled as an archive display reverse.
- **Hulk Silver Holofoil:** user-supplied image, `public/assets/marvel/hulk-silver-reference.png` (1198 × 1600). The app crops to the card and adds fine angle-dependent flakes. The source already contains photographed foil colour. The reverse is labelled as an archive display reverse.
- **Wolverine Suspended Animation:** the user's two original photographs, `wolverine-user-front.jpg` and `wolverine-user-back.jpg`, each 960 × 1280. See `public/assets/marvel/wolverine-user-sources.json`. Printed artwork is opaque; clear regions are rendered as tinted transmissive plastic rather than carrying the photographed tabletop. The card prints a 1994 copyright; the Suspended Animation set is catalogued as 1995 Fleer Ultra X-Men.
- **Bartman W2:** original physical-card photographs from two angles and a reverse puzzle photo. See `public/assets/simpsons/sources.json`. Two authentic optical poses are available. The flexed pose has roughly 468 × 659 pixels of usable artwork; the other pose is larger. Runtime perspective correction and optical blending do not create new original frames or new detail.
- **Wall posters:** original Terminator 2 and Jurassic Park poster photographs/scans, 1187 × 1750 and 1019 × 1500 respectively. See `public/assets/posters/sources.json` for source URLs.
- **Star Trek packaging:** new canvas artwork in `src/art/toyPackaging.js`, rendered at 2048 × 2920. Navy printed starfield, planet limb, chart marks and restrained LCARS-like accents, with separate foil masks for the title lettering. It is a period-inspired mockup. The existing procedural ship model is preserved.

## Rendering notes

Downloaded and supplied photographs are stored unchanged. Crop coordinates, perspective transforms, ink masks, diffraction and transparency are applied at runtime. Some physical wear, photographic lighting and lenticular ghosting remain. Additional source candidates in the asset folders are retained with provenance but are not all used in the gallery. No generated replacement illustrations are active.

The original fictional display images have been removed from the deployable public directory. Private attachment folders and local QA captures are excluded from Git.
