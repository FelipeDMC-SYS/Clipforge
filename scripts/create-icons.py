"""Generate installation icons from the existing ClipForge vector bolt.

No generated artwork: the polygon is the exact i-bolt path from the studio.
Run with Python + Pillow; outputs are checked in and need no runtime dependency.
"""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1] / 'dist'
icons = root / 'icons'
icons.mkdir(exist_ok=True)
green, black = '#53fc18', '#081204'
bolt = [(13, 2), (4, 14), (11, 14), (10, 22), (20, 9), (13, 9)]
root.joinpath('favicon.svg').write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    f'<rect width="64" height="64" rx="18" fill="{green}"/>'
    f'<path d="m13 2-9 12h7l-1 8 10-13h-7z" transform="translate(8 8) scale(2)" fill="{black}"/>'
    '</svg>\n'
)

def make(size, *, maskable=False, square=False):
    scale = size * 4 / 64
    image = Image.new('RGBA', (size * 4, size * 4), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((0, 0, size * 4 - 1, size * 4 - 1),
                           radius=0 if maskable or square else 18 * scale, fill=green)
    # Keep the entire bolt inside the central 80% safe circle for maskable icons.
    factor, inset = (5 / 3, 12) if maskable else (2, 8)
    draw.polygon([((x * factor + inset) * scale, (y * factor + inset) * scale)
                  for x, y in bolt], fill=black)
    return image.resize((size, size), Image.Resampling.LANCZOS)

for size in (192, 512):
    make(size).save(icons / f'clipforge-green-{size}.png')
    make(size, maskable=True).save(icons / f'clipforge-green-maskable-{size}.png')
make(180, square=True).save(icons / 'apple-touch-icon-green.png')
make(256).save(root / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print('ClipForge SVG, ICO, Apple, PNG and maskable icons generated.')
