#!/usr/bin/env python3
"""crop.py SHEET x y w h scale OUT — nearest-neighbour enlarged crop for inspection (background kept)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from blobs import SHEETS, SRC
from PIL import Image
k, x, y, w, h, s, out = sys.argv[1], *map(int, sys.argv[2:7]), sys.argv[7]
im = Image.open(os.path.join(SRC, SHEETS[k][0])).convert('RGBA').crop((x, y, x + w, y + h))
im.resize((w * s, h * s), Image.NEAREST).save(out)
