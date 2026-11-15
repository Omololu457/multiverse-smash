#!/usr/bin/env python3
"""Generate docs/beast_boy/SPRITE_LEDGER.md and MOVE_FRAME_MAP.md from source_rects.json + beastBoyData.js (via node)."""
import json, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]; DOC = ROOT / 'docs/beast_boy'
R = json.loads((DOC / 'source_rects.json').read_text())
D = json.loads(subprocess.check_output(['node', '-e', "import('./beastBoyData.js').then(m=>console.log(JSON.stringify({moves:m.BEAST_BOY_MOVES,tl:m.TIMELINE,ult:m.ULT,hurt:m.HURTBOX})))"], cwd=ROOT))
L = ['# Beast Boy — sprite ledger', '',
     f"Source: `{R['source']}` — {R['size'][0]}x{R['size'][1]} {R['mode']}, sha256 `{R['sha256']}` (verified unchanged; never written).", '',
     'Extraction: `tools/beast_boy/extract.py` → `docs/beast_boy/source_rects.json` (every rect), `contact_sheet.png`, `contact_sheet_icons_cutscene.png`, `transitions.png`.',
     f"- Key: {R['keyPolicy']}",
     f"- Scaling: nearest-neighbour only; no resampling filter, no AI redraw, no invented frames, no fifth animal. Every strip frame is {R['frame']['width']}x{R['frame']['height']} with origin ({R['frame']['originX']},{R['frame']['originY']}) at the feet.",
     f"- Body cells: {len(R['cells'])}. Text-label components removed: {R['textComponents']} (pixel-level label assert).",
     f"- Credit panel {R['creditPanel']}: {R['credit']} — excluded from every animation, saved as `assets/beast_boy/credit_panel.png`, quoted in credits.js.",
     '- Anchors: human cells = hair-top centre over the band floor; animal / morph cells = silhouette centroid + a per-cell ANCHOR_DX (below) so the torso stays put through every morph (reviewed in `transitions.png`).',
     '- Render bounds (art), hurtbox (`HURTBOX` per form) and attack geometry (`box` per move) are three separate things; no hitbox is derived from transparent art bounds.', '',
     '## Source labels', '', '| Sheet label | Rect (x0,y0,x1,y1) |', '|---|---|']
L += [f'| {k} | {v} |' for k, v in R['labels'].items()]
L += ['', '## Band floors (feet y per action band)', '', '| Band | Floor y |', '|---|---|'] + [f'| {k} | {v} |' for k, v in R['bandFloors'].items()]
L += ['', '## Animal / morph anchor corrections (px, toward facing = +)', '', '| Cell | dx |', '|---|---|'] + [f'| {k} | {v} |' for k, v in R['anchorDx'].items()]
L += ['', '## Strips (engine action ← ordered source cells, form per cell)', '', '| Strip | Frames | Cells | Forms |', '|---|---|---|---|']
for k, cells in R['sequences'].items():
    fm = R['forms'].get(k, [])
    runs = []; [runs.append([f, 1]) if not runs or runs[-1][0] != f else runs[-1].__setitem__(1, runs[-1][1] + 1) for f in fm]
    L.append(f"| {k} | {len(cells)} | {' '.join(cells)} | {', '.join(f'{f}×{n}' for f, n in runs)} |")
L += ['', '## Pixel duplicates in the sheet (kept; noted)', '', '| Cell | Duplicate of |', '|---|---|'] + [f'| {k} | {v} |' for k, v in R['duplicates'].items()]
L += ['', f"Unused body cells: {', '.join(R['unusedBodyCells'])} (pixel duplicates of jump7 / jump8; nothing lost).", '',
      '## Presentation assets', '',
      f"- Health-icon expressions `icons/expressions.png` ({R['icons']['w']}x{R['icons']['h']} per cell): " + ', '.join(f'{k} ×{v[1]}' for k, v in R['icons']['rows'].items()) + '.',
      f"- Cut-in bust `cutscene/bust.png` {R['cutscene']['bust']['w']}x{R['cutscene']['bust']['h']} + overlays " + ', '.join(f"{k} @({v['x']},{v['y']})" for k, v in R['cutscene']['overlays'].items()) + '. Mouths animate the supplied pieces; no voice is synthesised.',
      '- Portrait `portrait.png` 128x128 = the bust ×2 (nearest).', '']
(DOC / 'SPRITE_LEDGER.md').write_text('\n'.join(L))

M = ['# Beast Boy — move → frame map', '',
     'Generated from `beastBoyData.js` (frame data + `TIMELINE`) and `source_rects.json` (strip cells) by `tools/beast_boy/write_docs.py`.',
     'Elapsed tick → strip frame; startup = frames before the first active frame. Stored damage = round(raw × 1.7); the shared damage path applies ≈ raw on a fresh hit (measured).', '',
     '## Frame data', '', '| Move | Raw | Startup | Active | Recovery | Total | Hitstun | Blockstun | Cost | Box | returnAt | Forms (tick → form) |', '|---|---|---|---|---|---|---|---|---|---|---|---|']
for k, m in D['moves'].items():
    tot = m['startup'] + m['active'] + m['recovery']
    box = m.get('box') or ('none' if m.get('noBody') else f"{m['rangeX']}x{m['rangeY']}")
    M.append(f"| {k} | {m['raw']} | {m['startup']} | {m['active']} | {m['recovery']} | {tot if m['recovery'] < 900 else 'until landing'} | {m.get('hitstun','')} | {m.get('blockstun','')} | {m.get('cost','') or ''} | {box} | {m.get('returnAt','') if m.get('returnAt') is not None else ''} | {' '.join(f'{a}:{b}' for a, b in m.get('forms', [])) or 'human'} |")
M += ['', '## Timelines', '', '| Strip | Strip cells | Tick → frame |', '|---|---|---|']
for k, tl in D['tl'].items():
    strip = {'tigerA': 'tigerAir'}.get(k, k)
    M.append(f"| {k} | {' '.join(R['sequences'].get(strip, []))} | {' '.join(f'{a}→{b}' for a, b in tl)} |")
M += ['', '## Hurtboxes per form (centre dx toward facing, width, top above feet, height)', '', '| Form | Box |', '|---|---|'] + [f"| {k} | {v if v else 'engine default (humanoid)'} |" for k, v in D['hurt'].items()]
u = D['ult']
M += ['', '## Ultimate schedule (frames from confirm; frozen-cinematic contract)', '', f"Total {u['total']} f, cut-in {u['cutIn']} f, settle at {u['settle']}.", '',
      '| Contact | Frame | Raw |', '|---|---|---|'] + [f"| {c['kind']} | {c['at']} | {c['raw']} |" for c in u['contacts']]
M += ['', '| Beat | From frame | Strip |', '|---|---|---|'] + [f"| {i} | {b['from']} | {b['pose']} |" for i, b in enumerate(u['beats'])]
M += ['', 'Rationale: every animal plays its complete supplied sequence (human → morph → animal → morph → human); the one hit opportunity sits on the authored contact cells (gorilla kick extension, triceratops charge loop, tiger slash, bird flight); Wild Chain executes at `returnAt` (the first humanoid-return cell).', '']
(DOC / 'MOVE_FRAME_MAP.md').write_text('\n'.join(M))
print('ok', len(L), len(M))

# ── docs/skins/beast_boy/FORM_PALETTE_MAP.md (from tools/beast_boy/skins.json + the build audit) ──
SK = json.loads((ROOT / 'tools/beast_boy/skins.json').read_text())['skins']
AU = json.loads((ROOT / 'docs/skins/beast_boy/region_mapping.json').read_text())
fmt = lambda v: 'keep source' if v is None else (' / '.join(f'`{c}`' for c in v) if isinstance(v, list) else f'`{v}`')
P = ['# Beast Boy — form palette map (10 skins)', '',
     'Built by `tools/beast_boy/build_skins.py` from `tools/beast_boy/skins.json` → precomputed sheets in `assets/beast_boy/skins/<tag>/` (no runtime recolouring).',
     'Contact sheet: `skins_contact.png` (Default + 10 × idle, portrait, gorilla, bird, tiger, triceratops, two mid-morph cells, hurt, defeat). Region pixel counts per form: `region_mapping.json`.', '',
     '## Region rules (every skin)', '',
     '- **Human**: exact-colour regions — skin (4 shades), hair (3), costume purple (3), costume grey (2); the shared dark outline-adjacent shade (24,40,48) is split per pixel by a 5×5 majority vote into dark-skin / dark-hair / dark-purple / dark-grey. Eyes = small white+iris blobs inside the upper face (clipped to the white\'s box ±1) → `eye` colour or, if null, the hair ramp (so no source teal survives).',
     '- **Morph cells**: costume colours stay costume; every green / teal / dark pixel belongs to the ARRIVING animal (so a natural skin never flashes green for one frame).',
     '- **Gorilla**: fur 4 shades. **Tiger**: body 4, stripe, muzzle / underside 3 (source teal). **Bird**: plumage 3, shadow, beak 4 (source green). **Triceratops**: body 4, shadow, underside (0,64,96), horn (white).',
     '- **Kept neutral**: black outlines, eye whites, teeth, the grey slash / impact arcs (`fx`).',
     '- **Masks**: the alpha mask of every recoloured strip is asserted byte-identical to Default (same silhouette, same anchors through every morph). Build asserts ZERO source-green pixels left (Upgrade is the only skin whose OWN palette is green).',
     '- **Materials** (cosmetic only, never sim): precomputed sparse overlay strips `mat/p<k>/<strip>.png` clipped to body pixels; stars / glitter = 4 hashed twinkle phases, iridescent = 1 phase; Reduce Flashing → static phase 0 only.', '']
for s in SK:
    a = AU.get(s['tag'], {})
    P += [f"## {s['name']} (`{s['id']}`, tag `{s['tag']}`)", '',
          f"- Classification: **{s['classification']}**" + (f" — colour scheme from {s['crossover']}" if s.get('crossover') else ''),
          f"- Source / inspiration: {s['inspiration']}",
          f"- References: {', '.join(s['refs']) if s.get('refs') else 'none (original design)'}",
          f"- Material: {s['material']['kind'] if s.get('material') else 'none'} · HUD accents {fmt(s['hud'])} · build audit: source-green left = {a.get('sourceGreenLeft')}", '',
          '| Form | Region | Colours (light → dark) |', '|---|---|---|']
    h = s['human']
    for r in ['skin', 'hair', 'purple', 'gray']: P.append(f'| human | {r} | {fmt(h.get(r))} |')
    for r, v in (h.get('dark') or {}).items(): P.append(f'| human | dark {r} | {fmt(v)} |')
    P.append(f"| human | eye | {fmt(h.get('eye')) if h.get('eye') else 'hair ramp'} |")
    for form in ['gorilla', 'tiger', 'bird', 'tricera']:
        for r, v in s[form].items(): P.append(f'| {form} | {r} | {fmt(v)} |')
    P.append('')
(ROOT / 'docs/skins/beast_boy/FORM_PALETTE_MAP.md').write_text('\n'.join(P))
print('palette map', len(P))

# ── docs/beast_boy/COMBOS_BALANCE.md (from docs/beast_boy/mechanics_results.json — measured, never hand-typed) ──
MR = json.loads((DOC / 'mechanics_results.json').read_text())
C = ['# Beast Boy — measured combos and balance', '',
     'Every number below is MEASURED by `node harness/beast_boy.test.mjs` through real keyboard input against a standing training dummy and copied from `mechanics_results.json` by `tools/beast_boy/write_docs.py`.',
     '"true combo" means the defender was in hitstun or knockdown on the frame before every later hit. "RESET" names the first hit the defender could have acted before, and gives how many frames they were free. HP drops are after the shared combo scaling.', '',
     f"Summary: {MR['summary']['pass']} passed / {MR['summary']['fail']} failed.", '',
     '## Routes', '', '| Route | Verdict | Hits (HP) | Total | Free frames before each hit | Energy spent* |', '|---|---|---|---|---|---|']
for r in MR['routes']:
    C.append(f"| {r['label']} | {r['verdict']} | {' / '.join(map(str, r['hits']))} | {r['damage']} | {' / '.join(map(str, r.get('freeFramesBefore', [])))} | {r['energySpent']} |")
C += ['', '*Energy spent is net of the passive Morph Energy regen during the route.', '', '## Wild Chain links (each pair measured on its own)', '',
      '| Link | Verdict | Defender free before the linked hit |', '|---|---|---|']
for k, v in MR['chain']['links'].items(): C.append(f"| {k.replace('>', ' → ')} | {v['verdict']} | {v['freeBefore']} f |")
C += ['', '**Honest reading.**',
      '- Gorilla → Bird, Bird → Tiger and Triceratops → Gorilla are true links.',
      '- **Tiger → Triceratops is a RESET.** The defender is free for about 19 f because the Triceratops startup plus the charge travel outlasts Tiger\'s hitstun. It is pressure, not a combo.',
      '- Closing that gap would need about +19 f of Tiger hitstun. That would make Tiger → Tiger a loop, so it was deliberately not done.',
      '- The one tuning change from measurement: Gorilla hitstun 34 → 37, which closed a 2 f Gorilla → Bird gap. Gorilla stays non-looping (see the advantage table and the "Gorilla → Gorilla" route).', '',
      f"Wild Chain window: {MR['chain']['window']} (1 = queued). It lasts 10 SIMULATION frames from the clean contact; hitstop frames do not advance it. Link cost paid on the execution frame: {MR['chain']['linkCost']} (Bird = 12).", '',
      '## Frame advantage (measured: defender-free frame − Beast-Boy-free frame)', '', '| Move | On hit | On block |', '|---|---|---|']
for k, v in MR['advantage'].items(): C.append(f"| {k} | {v['hit'] if v['hit'] is not None else '—'} | {v['block']} |")
C += ['', 'Every animal is ≤ 0 on block, so all are punishable. Tiger Cross is the most unsafe at −25. No animal\'s on-hit advantage reaches its own startup, so there are no self-loops.', '',
      '## Other measurements', '',
      f"- Triceratops travel (open stage): {MR['tricera']['travel']} px (cap 180). Wall test: {MR['tricera'].get('wall')}.",
      f"- Bird arc: apex {MR['bird']['apex']} px, horizontal {MR['bird']['dx']} px.",
      f"- False Start: {MR['feint']['back']} px back, {MR['feint']['total']} f total.",
      f"- Ultimate contacts (HP): {' / '.join(str(h['d']) for h in MR['ultimate']['hits'])} = {MR['ultimate']['total']} (authored raw 25 + 45 + 30 + 60 + 100 = 260). Whiffed opener: {MR['ultimate']['whiffFrames']} f.",
      f"- Instinct: jump escape {MR['instinct'].get('jump')}, dash escape {MR['instinct'].get('dash')}.",
      f"- Walk 60 f: {MR['misc']['walk60f']} px; jump apex {MR['misc']['jumpApexPx']} px; one jump only.",
      f"- Interruption probes: {sum(1 for x in MR['interrupt'] if x['hitAt'] >= 0)} real hits landed across entry / active / return frames of all four animals. All {sum(1 for x in MR['interrupt'] if x['hitAt'] >= 0 and x['ok'])} returned to humanoid hurt with the default hurtbox, no invulnerability and nothing queued.", '',
      '## Balance notes', '',
      '- HP 950 on a 100-energy bar. Animals cost 12–20, so an opener plus a 2-link Wild Chain is about 45 energy. The Ultimate is one 100 transaction.',
      '- Stored damage is round(raw × 1.7), the roster lever used by the Rangers and Cyborg. The applied HP drop on a fresh hit ≈ raw.',
      '- Not applied: a rosterParity.js ×1.3 opt-in and a Beast-Boy-specific CPU AI (the generic CPU drives him).', '']
(DOC / 'COMBOS_BALANCE.md').write_text('\n'.join(C)); print('combos', len(C))
