#!/usr/bin/env python3
"""Syndrome: write docs/syndrome/SPRITE_MAP.md from the extractor's own tables (tools/syndrome/extract.py) and the exact
source rectangles it recorded (docs/syndrome/source_rects.json). Usage: python3 tools/syndrome/sprite_map_md.py"""
from pathlib import Path
import json, re, hashlib
ROOT = Path(__file__).resolve().parents[2]
src = (ROOT / 'tools/syndrome/extract.py').read_text()
rects = json.loads((ROOT / 'docs/syndrome/source_rects.json').read_text())
FILES = {'Syndrome': 'Game Boy Advance - The Incredibles - Non-Playable Characters - Syndrome.png', 'Drone': 'Game Boy Advance - The Incredibles - Enemies & Bosses - Drone.png',
         'Spinner': 'Game Boy Advance - The Incredibles - Enemies & Bosses - Spinner.png', 'Turrets': 'Game Boy Advance - The Incredibles - Enemies & Bosses - Turrets.png',
         'Velocipod': 'Game Boy Advance - The Incredibles - Enemies & Bosses - Velocipod.png', 'Omnidroid 10': 'Game Boy Advance - The Incredibles - Enemies & Bosses - Omnidroid 10.png'}
BG = {'Syndrome': '(173, 82, 173) lilac', 'Drone': '(255, 0, 255) magenta', 'Spinner': '(255, 0, 255) magenta', 'Turrets': '(255, 0, 255) magenta', 'Velocipod': '(255, 0, 255) magenta', 'Omnidroid 10': '(255, 0, 255) magenta'}
SHEET = {'D': 'Drone', 'P': 'Spinner', 'T': 'Turrets', 'V': 'Velocipod', 'O': 'Omnidroid 10'}
mach = re.findall(r"'(\w+)': \((\w+)\(([A-Z]),.*?, (True|False), '(\w+)', '([^']*)'\)", src)
body = re.findall(r"'(\w+)': \((R\('[A-F]'.*?)\), (\d+), (True|False)\),\s*(#.*)?", src)
out = ['# Syndrome — sprite map', '',
 'Every pixel comes from the six supplied sheets in `syndrome/` (preserved byte-identical in `assets/syndrome/source/`).',
 'Nothing was guessed from a grid: every frame was located by connected-component segmentation inside an explicit band',
 '(or an explicit fixed / column rectangle where segmentation merges neighbours), inspected on enlarged contact sheets',
 '(`docs/syndrome/contact_*.png`) and recorded with its exact source rectangle in `docs/syndrome/source_rects.json`.',
 'Extraction: `python3 tools/syndrome/extract.py` (hash-checks every source first).', '',
 '## Sources and backgrounds', '', '| Sheet | File | SHA-256 | Background removed (exact key, per sheet) |', '|---|---|---|---|']
for k, f in FILES.items():
    p = ROOT / 'syndrome' / f
    h = hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else 'missing'
    out.append(f'| {k} | `{f}` | `{h[:16]}…` | {BG[k]} |')
out += ['', 'Each sheet\'s own background colour is keyed out independently (exact RGB match — the GBA art is indexed, so no',
 'antialias fringe exists to decontaminate). Integer nearest-neighbour scaling only (Syndrome ×2, every machine ×2).', '',
 '## Excluded from extraction', '',
 '- UI portraits / face icons, oval health bars and the green digit glyphs printed on the Drone, Turrets, Velocipod and',
 '  Omnidroid sheets (outside every extraction band).',
 '- The duplicate second explosion set and the duplicate missile-turret emergence row (the gun-turret emergence `gunEmerge`',
 '  is reused for every turret family).',
 '- No sheet label, credit text or watermark pixel is used.', '',
 '## Syndrome body (sheet rows inspected at source resolution)', '',
 '| Row | y-range | Content |', '|---|---|---|',
 '| A | 0–68 | 4 side hover / ready poses (fist forward, cape streaming; face LEFT → mirrored) |',
 '| B | 72–143 | 20 front-facing idle / expression loop (hands on hips) |',
 '| C | 147–215 | 4 front-facing grin variations |', '| D | 222–294 | 4 front-facing laugh variations |',
 '| E | 294–354 | E0–2 raised-arm turned gestures, E3 arms-crossed upright turn, E4–9 hunched remote steps (mirrored) |',
 '| F | 357–416 | 4 lower running strides (mirrored) |', '',
 'All 31 body strips share ONE 75×70 cell with the feet origin at (27, 69), so swapping strips never shifts the body.', '',
 '| Strip | Frames (row, index) | ticks/frame | loop | note |', '|---|---|---|---|---|']
for n, refs, spd, loop, note in body:
    fr = ' '.join(f"{r[0]}{r[1]}" for r in [(x['ref'][0], x['ref'][1]) for x in rects.get('body/' + n, [])])
    out.append(f'| `{n}` | {fr} | {spd} | {loop} | {(note or "").lstrip("# ")} |')
out += ['', '### Honest fallbacks (no fabricated art)', '',
 '- The GBA Syndrome sheet has **no** walk cycle, hurt, knockdown, crouch, guard or get-up frames. `walk` reuses the hunched',
 '  remote steps E4–9, `hurt` = E0–1, `knockdown` = E2 (a held recoil pose — the engine lays the fighter flat; no lying sprite',
 '  exists), `crouch` = E9, `guard` / `land` = E3, `lose` = E2,1,0. These are documented reuses of supplied poses, not new art.',
 '- `portrait.png` = row C0 (grin), top 40 rows.', '',
 '## Machines (92 strips)', '', '| Strip | Sheet | Frames | Mirrored | Anchor | Content |', '|---|---|---|---|---|---|']
for n, fn, sh, mir, anc, desc in mach:
    k = 'machines/' + n; out.append(f'| `{n}` | {SHEET[sh]} | {len(rects.get(k, []))} | {mir} | {anc} | {desc} |')
out += ['', 'Anchors: `feet` = bottom-centre on the floor, `center` = visual centre, `attach` = the socket end of a limb (its',
 'per-frame `tips[]` record where the claw / foot lands — the hit point), `rect` = top-left (shell halves).',
 'The Omnidroid is assembled from these components at runtime — see `OMNIDROID_ASSEMBLY.md`.', '']
(ROOT / 'docs/syndrome/SPRITE_MAP.md').write_text('\n'.join(out))
print(len(mach), 'machine strips;', len(body), 'body strips')
