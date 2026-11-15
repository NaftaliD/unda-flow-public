# Brand reference

Unda Pilates brand material kept for reference. **Not served by the app** (this folder is outside `public/`).

These files are the brand's property and are **not covered by the code licence** (see the README at the repo root): all rights reserved.

## `reference/`

| File                            | What it is                                                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UNDA_Brand_Identity_Board.svg` | Overview board: primary (vertical), secondary (horizontal), submark, stamp and logo-in-circle variants on the four brand backgrounds, plus the colour palette. |
| `UNDA_Submark_Logo_Grid.svg`    | The circled "U" submark and the stamp variant on each background.                                                                                              |

**Important:** despite the `.svg` extension, each file is a single raster PNG embedded in an SVG wrapper. They are presentation boards, not production logos: the artwork sits on opaque coloured backgrounds, is not scalable, and must not be used as the app logo or favicon.

## Still needed from the designer

Original **vector** SVGs (transparent background), per PLAN.md section 3 and `public/brand/README.md`:

- horizontal logo (app bar and login screen), plus a light-on-dark variant for the olive app bar
- circled "U" submark (favicon and PWA icon)

Never redraw, trace or approximate the logo in code. Until the vectors arrive, `src/components/Logo.tsx` stays a text placeholder.

## Colours stated on the board

Cream `#F8F2E9`, Warm Cream `#EADFD3`, Sage `#A7B097`, Olive Mist `#596554`, Terracotta `#C76F54`.
The app theme (`src/app/theme.css`) uses Terracotta `#C76F56`; the board says `#C76F54`. Confirm which is canonical before Increment 4.
