"""Find a local font for the optional asset generators on common desktop OSes."""
import os
from pathlib import Path
from PIL import ImageFont


def load_font(size, bold=False):
    dejavu = 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf'
    arial = 'arialbd.ttf' if bold else 'arial.ttf'
    mac_arial = 'Arial Bold.ttf' if bold else 'Arial.ttf'
    candidates = [
        Path('/usr/share/fonts/truetype/dejavu') / dejavu,
        Path(os.environ.get('WINDIR', 'C:/Windows')) / 'Fonts' / arial,
        Path('/System/Library/Fonts/Supplemental') / mac_arial,
        Path('/Library/Fonts') / mac_arial,
        dejavu,
        arial,
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(str(candidate), size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)
