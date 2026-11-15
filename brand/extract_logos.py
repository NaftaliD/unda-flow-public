"""Extract transparent PNG logos from the two raster brand boards in brand/reference/.

The boards are PNGs embedded in SVG wrappers (see brand/README.md). Each logo variant sits on
its own flat-ish brand background, so it can be keyed out to transparency: alpha is how far a pixel
is from the background colour, and the foreground colour is un-mixed from the background so edges
carry no halo. A variant must therefore be used on its own background colour:

  *-light  = cream artwork, for the olive app bar (and any dark surface)
  *-dark   = dark olive artwork, for cream / warm-cream surfaces and print

Run (needs Pillow and NumPy; this is a dev-time tool, not part of the app build):

  python brand/extract_logos.py

Output goes to public/brand/. Re-run only if the reference boards change. When the designer
supplies real vector files, delete this script and the PNGs.
"""

import base64
import io
import re
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / 'brand' / 'reference'
OUT = ROOT / 'public' / 'brand'

CREAM = (248, 242, 233)  # app background, used to flatten the favicon / touch icon


def load_board(name: str) -> Image.Image:
    svg = (REF / name).read_text(encoding='utf-8')
    b64 = re.search(r'data:image/png;base64,([A-Za-z0-9+/=\s]+)"', svg).group(1)
    return Image.open(io.BytesIO(base64.b64decode(re.sub(r'\s', '', b64)))).convert('RGB')


def key(crop: Image.Image) -> Image.Image:
    """RGBA image: background removed, foreground un-mixed from the local background colour."""
    a = np.asarray(crop).astype(float)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    alpha = np.clip((dist - 12) / 90, 0, 1)
    fg = np.clip(bg + (a - bg) / np.maximum(alpha[..., None], 0.05), 0, 255)
    return Image.fromarray(np.dstack([fg, alpha * 255]).astype('uint8'), 'RGBA')


def trim(img: Image.Image, pad: int = 4) -> Image.Image:
    """Crop to the visible pixels plus a little padding."""
    box = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
    l, t, r, b = box
    return img.crop((max(l - pad, 0), max(t - pad, 0), min(r + pad, img.width), min(b + pad, img.height)))


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / name, optimize=True)
    print(f'{name:34s} {img.width}x{img.height}')


board = load_board('UNDA_Brand_Identity_Board.svg')  # 1312 x 1199
grid = load_board('UNDA_Submark_Logo_Grid.svg')  # 1774 x 887

# (left, top, right, bottom) of the secondary (horizontal) logo cell in each background column.
HORIZONTAL = {'dark': (150, 350, 415, 480), 'light': (1015, 350, 1300, 480)}
# Submark (icon) cells on the grid, first row.
SUBMARK = {'dark': (240, 40, 570, 350), 'light': (1370, 40, 1710, 350)}

for tone, box in HORIZONTAL.items():
    full = trim(key(board.crop(box)))
    save(full, f'logo-horizontal-{tone}.png')
    # Compact lockup for small sizes: drop the tagline row (the lowest ~25% of the artwork).
    compact = full.crop((0, 0, full.width, int(full.height * 0.74)))
    save(trim(compact), f'logo-compact-{tone}.png')

for tone, box in SUBMARK.items():
    save(trim(key(grid.crop(box))), f'submark-{tone}.png')

# Tab / home-screen icons: the dark submark flattened on cream (works in light and dark tabs).
sub = Image.open(OUT / 'submark-dark.png')
for size, name, inset in ((48, 'favicon-48.png', 0.04), (180, 'apple-touch-icon.png', 0.14)):
    canvas = Image.new('RGB', (size, size), CREAM)
    inner = int(size * (1 - 2 * inset))
    scaled = sub.copy()
    scaled.thumbnail((inner, inner), Image.LANCZOS)
    canvas.paste(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2), scaled)
    save(canvas, name)
