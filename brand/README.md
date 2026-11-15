# Brand reference

Unda Pilates brand material kept for reference. **Not served by the app** (this folder is outside `public/`).

These files are the brand's property and are **not covered by the code licence** (see the README at the repo root): all rights reserved.

## `reference/`

| File                            | What it is                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UNDA_Brand_Identity_Board.svg` | Overview board: primary (vertical), secondary (horizontal), submark, stamp and logo-in-circle variants on the four brand backgrounds, plus the colour palette. |
| `UNDA_Submark_Logo_Grid.svg`    | The circled "U" submark and the stamp variant on each background.                                                                                              |

**Note:** despite the `.svg` extension, each file is a single raster PNG embedded in an SVG wrapper (the artwork was AI-generated, so there are no original vectors). They are presentation boards, not production logos.

## Logos used by the app (`public/brand/`)

`brand/extract_logos.py` keys each logo variant out of its own coloured background on the boards and writes transparent PNGs (needs Pillow and NumPy; a dev-time tool, not part of the build):

| File                                                             | Use                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `logo-compact-light.png`                                         | App bar (olive background). Tagline dropped for small sizes. |
| `logo-horizontal-dark.png` / `-light.png`                        | Login screen and print header (full lockup with tagline).    |
| `logo-compact-dark.png`, `submark-light.png`, `submark-dark.png` | Spare variants for later (install icons, teach view).        |
| `favicon-48.png`, `apple-touch-icon.png`                         | Dark submark flattened on cream.                             |

**Each tone must stay on its own background:** `light` artwork (cream) only on olive/dark surfaces, `dark` artwork only on cream surfaces and print. Keyed this way the result is clean; mixing them leaves halos.

Limits of raster logos: native height is about 70 to 95 px, so keep display heights at or below roughly half of that for sharp screens (the app uses 28 to 96 px CSS height), and print is slightly soft. A 512 px install icon would need upscaling; ask for a larger or vector version before Increment 4's install work, or regenerate the submark at higher resolution.

## If the designer later supplies vectors

Replace the PNGs, keep the file names or update `src/components/Logo.tsx` (its API stays), and delete `extract_logos.py`.

## Colours stated on the board

Cream `#F8F2E9`, Warm Cream `#EADFD3`, Sage `#A7B097`, Olive Mist `#596554`, Terracotta `#C76F54`.
The app theme (`src/app/theme.css`) uses Terracotta `#C76F56`; the board says `#C76F54`. Confirm which is canonical before Increment 4.
