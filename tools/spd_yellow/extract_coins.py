#!/usr/bin/env python3
"""S.P.D. Yellow — TACTICAL COIN art. COINS ONLY from the supplied MMPR: The Movie (Genesis) "HUD & Coins" sheet.

Imported: the 10-frame spin row (y=172) and the 6 coin faces (y=198). NOT imported: portraits, HP bars, fonts, scores,
lives, PRESS START / CREDIT / CONTINUE labels, the life-bar colour key, the ripper credit box (kept in docs only).
Background RGB(187,187,187) is keyed only where 4-connected to each coin rect border (no tolerance, NN only).

Spin progression VERIFIED by pixel width + inspection (docs/spd_yellow/COINS.md):
  spin0 face(24w) -> spin1 oval(15) -> spin2 edge(7) -> spin3 edge(7) -> spin4 oval(15) -> spin5 white FLASH face(24)
  -> spin6 oval(15) -> spin7 edge(7) -> spin8 edge(7) -> spin9 oval(15) -> (spin0)
These are cosmetic MMPR-source coin graphics repurposed as an ORIGINAL "Tactical Coin" resource — not S.P.D. canon.
Usage: python3 tools/spd_yellow/extract_coins.py
"""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Miscellaneous - HUD & Coins.png'
SHA = '980948652397308b27a15c82c3418b72a9688817b8d7d3675afa120648b266a3'
OUT = ROOT / 'assets/spd_yellow/coins'
DOC = ROOT / 'docs/spd_yellow'
BG = (187, 187, 187)
SPIN = [(4, 172, 24, 22), (32, 172, 15, 22), (51, 172, 7, 22), (62, 172, 7, 22), (73, 172, 15, 22),
        (92, 172, 24, 22), (120, 172, 15, 22), (139, 172, 7, 22), (150, 172, 7, 22), (161, 172, 15, 22)]
SPIN_KIND = ['face', 'oval', 'edge', 'edge', 'oval', 'flash', 'oval', 'edge', 'edge', 'oval']
FACES = [(4 + 28 * i, 198, 24, 22) for i in range(6)]
FACE_NOTE = ['tyrannosaurus (same art as spin0)', 'mastodon', 'triceratops', 'sabre-tooth tiger', 'pterodactyl', 'falcon/thunder emblem']
EXCLUDED = {'hudBlock': [0, 0, 266, 168], 'lifeBarKeyAndCredit': [183, 187, 83, 41], 'creditText': [0, 225, 140, 27]}


def key(im):
    w, h = im.size; p = im.load(); seen = set()
    st = [(a, b) for a in range(w) for b in (0, h - 1)] + [(a, b) for b in range(h) for a in (0, w - 1)]
    while st:
        a, b = st.pop()
        if (a, b) in seen or not (0 <= a < w and 0 <= b < h) or p[a, b][:3] != BG:
            continue
        seen.add((a, b)); p[a, b] = (0, 0, 0, 0); st += [(a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)]
    left = sum(1 for a in range(w) for b in range(h) if p[a, b][3] and p[a, b][:3] == BG)
    assert left == 0, ('background colour inside a coin', left)
    return im, len(seen)


def main():
    assert hashlib.sha256(SRC.read_bytes()).hexdigest() == SHA, 'source hash changed'
    src = Image.open(SRC).convert('RGBA')
    assert src.size == (266, 252)
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {'source': SRC.name, 'sha256': SHA, 'policy': 'coins only; background keyed by border flood', 'excluded': EXCLUDED,
            'credit': 'Ripped by Sid Starkiller (credit box on the sheet; documentation only, excluded from runtime)', 'spin': [], 'faces': []}
    frames = []
    for i, r in enumerate(SPIN):
        x, y, w, h = r
        im, k = key(src.crop((x, y, x + w, y + h)))
        im.save(OUT / f'spin{i}.png'); frames.append(im)
        meta['spin'].append({'name': f'spin{i}', 'rect': list(r), 'kind': SPIN_KIND[i], 'keyed': k})
    for i, r in enumerate(FACES):
        x, y, w, h = r
        im, k = key(src.crop((x, y, x + w, y + h)))
        im.save(OUT / f'face{i}.png')
        meta['faces'].append({'name': f'face{i}', 'rect': list(r), 'note': FACE_NOTE[i], 'keyed': k})
    # verify: spin0 == face0 (same tyrannosaurus coin), widths follow the face->oval->edge progression
    import PIL.ImageChops as C
    meta['spin0EqualsFace0'] = C.difference(Image.open(OUT / 'spin0.png'), Image.open(OUT / 'face0.png')).getbbox() is None
    meta['widths'] = [r[2] for r in SPIN]
    # Runtime strip: 10 spin frames, each centred in a 24x22 cell (fixed pivot = coin centre).
    strip = Image.new('RGBA', (24 * 10, 22))
    for i, im in enumerate(frames):
        strip.paste(im, (24 * i + (24 - im.width) // 2, 0), im)
    strip.save(OUT / 'spin.png')
    faces = Image.new('RGBA', (24 * 6, 22))
    for i in range(6):
        im = Image.open(OUT / f'face{i}.png'); faces.paste(im, (24 * i, 0), im)
    faces.save(OUT / 'faces.png')
    DOC.mkdir(parents=True, exist_ok=True)
    (DOC / 'coin_rects.json').write_text(json.dumps(meta, indent=2) + '\n')
    S = 6; sheet = Image.new('RGB', (24 * S * 10 + 110, 22 * S * 2 + 80), (38, 43, 54)); d = ImageDraw.Draw(sheet)
    for i, im in enumerate(frames):
        big = Image.open(OUT / 'spin.png').crop((24 * i, 0, 24 * i + 24, 22)).resize((24 * S, 22 * S), Image.Resampling.NEAREST)
        sheet.paste(big, (10 + i * (24 * S + 10), 24), big); d.text((10 + i * (24 * S + 10), 6), f'spin{i} {SPIN_KIND[i]}', fill='white')
    for i in range(6):
        big = Image.open(OUT / f'face{i}.png').resize((24 * S, 22 * S), Image.Resampling.NEAREST)
        sheet.paste(big, (10 + i * (24 * S + 10), 22 * S + 56), big); d.text((10 + i * (24 * S + 10), 22 * S + 38), f'face{i}', fill='white')
    sheet.save(DOC / 'coin_contact_sheet.png')
    print('spin0==face0', meta['spin0EqualsFace0'], 'widths', meta['widths'])


if __name__ == '__main__':
    main()
