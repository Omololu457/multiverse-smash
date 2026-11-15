#!/usr/bin/env python3
"""Writes docs/elastigirl/SPRITE_LEDGER.md from docs/elastigirl/source_rects.json: every extracted frame → the
animation strip(s) that use it → the move / state that plays it. Fails if any frame is unused.
Usage: python3 tools/elastigirl/ledger.py"""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[2]
D = json.loads((ROOT / 'docs/elastigirl/source_rects.json').read_text())
MOVE = {
    'idle': 'Idle stance (R2)', 'walk': 'Walk forward', 'walk_back': 'Walk back (R3 reversed)', 'run': 'Run (R3, faster cadence)',
    'dash': 'Dash (R5.1 low run pose)', 'crouch': 'Crouch — no dedicated crouch frame on the sheet: reuses R4.1 (jump crouch)',
    'jump': 'Jump: rise + flips (R4.2–R4.8)', 'fall': 'Fall (R4.9)', 'land': 'Landing (jump / Slingshot / Parachute)',
    'guard': 'Block stance (R17.1 stretch guard pose)', 'hurt': 'hit_flash (R19.1 white silhouette) → light hit react',
    'hurt2': 'Heavy hit react', 'hurt_air': 'Air hit react (R18.2 fly back)', 'knockdown': 'hit_flash (R18.1) → knockdown, lie',
    'getup': 'Get up (R18.6–R18.10)', 'lose': 'Lose pose (lying)', 'win': 'Win poses (R20)', 'intro': 'Round intro (R17 stretch → R2 idle)',
    'taunt': 'Taunt (R17 tall stretch)', 'grab': 'Throw (Long Arm extension frames)',
    'light': 'JAB 6f/20/0 (R6.1–6.3, spark = active)', 'heavy': 'HEAVY 14f/54/−5 (R6.4–6.6)', 'eLow': 'LOW stretch sweep 8f/28/−4 (R15)',
    'up': 'LAUNCHER 12f/48/−9 (R11 diagonal reach)', 'air': 'AIR 7f/30/+2 (R16)',
    'eLongArm': 'Special LONG ARM — extend (R8)', 'eLongWhiff': 'LONG ARM whiff wobble (R9)', 'eLongPull': 'LONG ARM on hit — retract/pull (R10.1–10.3)',
    'eLongRecover': 'LONG ARM recovery (R10.4–10.7); also the FAMILY RAFT 100 f lockout pose (alias eUltRecover)',
    'eWhirl': 'Special WHIRL KICK (R7, slash arcs kept)', 'eDome': 'Special PARACHUTE DROP grounded (R5: hop → dome → recover)',
    'eDomeFloat': 'PARACHUTE DROP air float (R5.3–R5.6 — the sheet\'s "repeat" bracket marks this loop)',
    'eDomeSlam': 'PARACHUTE DROP slam (R5.6 dome) + landing (R5.7–5.8, alias eDomeLand)',
    'eWhip': 'Special OVERHEAD WHIP (R14 vertical whip)', 'eSling': 'SLINGSHOT anchor / pendulum swing (R12)',
    'eSlingRelease': 'SLINGSHOT release / recovery (R13)', 'eGuard': 'Defense STRETCH GUARD parry (R17)',
    'eBounce': 'Defense BOUNCE BACK (R4 flips + landing)', 'eUltWindup': 'ULTIMATE FAMILY RAFT windup (R14.1–14.5; alias eUlt)',
    'eRaft': 'ULTIMATE FAMILY RAFT surge (R21–R24: Helen + Dash + Violet as ONE sprite, ultimate only)',
}
rows = {}
for c in D['cells']: rows.setdefault(c['row'], []).append(c)
out = ['# Elastigirl — SPRITE LEDGER', '',
       f"Source: `{D['source']}` · SHA-256 `{D['sha256']}` · {D['size'][0]}×{D['size'][1]}.",
       f"Background (0,128,128) keyed exactly (tolerance 0). Excluded: {D['excluded']['annotationPixels(255,0,0)']} px of the red \"repeat\" bracket + label under the dome row, "
       f"{D['excluded']['creditTextPixels']} px of the \"Ripped by redblueyellow. No credit needed.\" text. Kept: white slash FX, white hit-flash silhouettes, grey shadow ovals.",
       'Frames are 8-connected component unions; detached limb pieces (≤6 px) join the body frame to their left. Anchor = feet baseline + torso centre (gold belt/emblem pixels), never the limb.',
       'Contact sheet with row.frame labels: `docs/elastigirl/contact_sheet.png`. Real frames win over the brief\'s best-effort inventory — differences are listed at the end.', '',
       '| Frame | Sheet rect (x, y, w, h) | Anchor | Animation strip(s) | Move / state |', '|---|---|---|---|---|']
unused = []
for r in sorted(rows, key=int):
    for c in rows[r]:
        anims = [u for u in c['usedIn']]
        moves = '; '.join(MOVE.get(a, a) for a in anims)
        if not anims: unused.append(c['name'])
        label = f"R{c['row']}.{c['frame']}"
        out.append(f"| {label} | {tuple(c['rect'])} | {tuple(c['anchor'])} ({c['anchorFrom']}) | {', '.join('`'+a+'`' for a in anims)} | {moves} |")
assert not unused, unused
out += ['', '## Strips (engine animation → frames in play order)', '', '| Strip | Frames | Move / state |', '|---|---|---|']
for k, v in D['sequences'].items():
    out.append(f"| `{k}` | {', '.join('R' + n[1:].replace('_', '.') for n in v)} | {MOVE.get(k, k)} |")
out += ['', '## Inventory vs real sheet', '',
        '- R4 has 11 body frames + **6** grey shadow ovals (brief: shadow ovals listed under R5). The ovals sit on the R4 band (y 192–201); used as the Parachute Drop ground shadow (FX layer, largest → smallest as she rises).',
        '- R5 = 8 frames: run-crouch, flatten, **4 domes** (the red "repeat" bracket under them marks the float loop), flatten, stand.',
        '- R7 Whirl Kick = 4 frames, each with its own scattered white slash arcs (split by fixed columns 0/135/296/408).',
        '- R13 has 7 frames (brief ~6); R14 has 14 (brief ~16); R20 has 7 (brief 8); R21–R24 = 3+3+3+8 = 17 raft frames.',
        '- R17.2 includes a detached raised forearm (2 px right of the body) per the ≤6 px merge rule.',
        '- No dedicated crouch frame exists: crouch reuses R4.1 (the jump-start crouch).',
        '- Missing poses reuse the closest frame: dash = R5.1, land = R4.10–4.11, Bounce Back = R4 flips, Long Arm grab/throw = R8.1–8.2 + R10.1, ultimate lockout = R10.4–10.7.']
(ROOT / 'docs/elastigirl/SPRITE_LEDGER.md').write_text('\n'.join(out) + '\n')
print('ledger rows', sum(len(v) for v in rows.values()), 'strips', len(D['sequences']))
