#!/usr/bin/env python3
"""Writes docs/msv1/gojo/LEDGER.md from docs/msv1/gojo/slice_report.json (tools/gojoshinjuku/slice.py output).
Every source rect is listed as sheet pixels y0,x0 → y1,x1 (the sheet is 790 wide × 1780 tall, rows run downward)."""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
R = json.load(open(os.path.join(ROOT, 'docs/msv1/gojo/slice_report.json')))

SHEET_ROWS = [  # (sheet label, strip, use in game)
  ('Intro', 'intro', 'round intro ("Don\'t worry. I\'m the strongest.")'),
  ('Win', 'win', 'win pose; RCT hold pose (frame 1)'),
  ('Stand', 'idle', 'idle loop; select portrait (frame 0 head, ×4 nearest)'),
  ('Walk', 'walk', 'walk forward / back; run (faster)'),
  ('Dash', 'dash', 'dash glide; Blue Step travel frame'),
  ('Crouch', 'crouch', 'crouch / land; Sweep (frames 2–3)'),
  ('Jump', 'jump', 'jump rise / fall; Jump Attack (frames 2–3)'),
  ('Guard', 'guard', 'block; Falling Blossom Emotion stance'),
  ('Hit', 'hit', 'hurt (0–1), knockdown / lose / get-up (2–5)'),
  ('Ultimate Action', 'ultAction', 'the generic ultimate pose; first 3 frames of both Purples'),
  ('A', 'a', 'A string (A1 = 0–1, A2 = 2–3, A3 = 4–5)'),
  ('B', 'b', 'B; Blue Fist (same strip); throw wind-up / release (0, 1, 4)'),
  ('C', 'c', 'C high-kick launcher'),
  ('Red', 'red', 'Reversal Red / Delayed Red (fingertip burst)'),
  ('Red Rush (lunge)', 'redRush', 'Red Rush travel frames'),
  ('Red Rush (boxed)', 'redRushBox', 'Red Rush impact (5th frame); box border removed'),
  ('Lapse: Blue', 'lapseBlue', 'Lapse Blue cast'),
  ('Maximum Output: Blue', 'maxBlue', 'Maximum Output Blue cast (frame 4 = the split pose, orb separated into fx/blueOrb.png)'),
  ('Domain', 'domain', 'Unlimited Void hand sign (the 4 domain frames)'),
  ('200% Purple (poses)', 'purple200', 'chant poses, one per incantation line'),
  ('200% Purple (boxed fire)', 'purple200Fire', 'the 200% fire frame; purple box border removed'),
  ('Hollow Purple (poses)', 'purple', 'Hollow Purple: hands apart → Blue + Red raised'),
  ('Hollow Purple (boxed raise)', 'purpleRaise', 'both orbs raised high; red box border removed'),
  ('Hollow Purple (fire)', 'purpleFire', 'the push / release'),
  ('Hollow Purple (end)', 'purpleEnd', 'the recovery pose'),
]
COMPOSED = {
  'hurt': 'Hit 0–1', 'knockdown': 'Hit 2–4', 'getup': 'Hit 5', 'lose': 'Hit 3–4 (lying)', 'jumpRise': 'Jump 0–1', 'fall': 'Jump 1',
  'crouchDown': 'Crouch 0–2', 'throw': 'B 0, 1, 4', 'redRushFull': 'Red Rush lunge 0–3 + boxed impact',
  'blueStep': 'Max Output Blue gesture + Dash', 'purpleFull': 'Ultimate Action 0–2 + Purple 0–5 + boxed raise + fire 0–2 + end',
  'purple200Full': 'Ultimate Action 0–2 + 200% poses 0–5 + boxed fire',
}
rect = lambda s: f'{s[0]},{s[1]} → {s[2]},{s[3]}'
out = ['# MSV1-GOJO — Sprite ledger (Satoru Gojo, Shinjuku Arc)', '',
  f'Source: `{R["source"]}` ({R["size"][0]}×{R["size"][1]}, the FinhJ "Satoru Gojo Shinjuku Arc" JUS-style sheet; credits ZebrasBlack and R0B4N).',
  f'Background RGB{tuple(R["bg"])} chroma-keyed (summed channel distance > 18 = opaque). Nearest-neighbour only; no pixel is redrawn except the',
  'one orb half noted below. Rects are sheet pixels **y0,x0 → y1,x1** (the sheet is tall: rows run down the page).',
  'Regenerate: `python3 tools/gojoshinjuku/slice.py && python3 tools/gojoshinjuku/compare.py && python3 tools/gojoshinjuku/ledger.py`.', '',
  '## Real frame counts (as drawn on the sheet)', '',
  '| Sheet section | Strip | Frames | Cell (w×h) | Used for |', '|---|---|---:|---|---|']
total = 0
for label, k, use in SHEET_ROWS:
  a = R['anims'][k]; total += a['frames']
  out.append(f'| {label} | `{k}.png` | {a["frames"]} | {a["cell"][0]}×{a["cell"][1]} | {use} |')
out += ['', f'**{total} unique body frames** on the sheet, plus 3 effect sprites and 4 chant strips (below).', '',
  '## Composed game strips (re-ordered copies of the frames above — no new art)', '',
  '| Strip | Frames | Built from |', '|---|---:|---|']
for k, src in COMPOSED.items():
  out.append(f'| `{k}.png` | {R["anims"][k]["frames"]} | {src} |')
out += ['', '## Effect sprites (`assets/gojo_shinjuku/fx/`)', '', '| Sprite | Source rect | Size | Use |', '|---|---|---|---|']
use = {'blueOrb': 'Blue fields (Lapse point, Maximum Output orb), Blue Step dot', 'mergeCircles': 'Hollow Purple merge (Blue + Red meeting)', 'dome': 'Hollow Purple / 200% impact dome'}
for k, v in R['fx'].items():
  out.append(f'| `{k}.png` | {rect(v["src"])} | {v["size"][1]}×{v["size"][0]} | {use[k]} |')
out += ['', '## Chant strips (`fx/chant1..4.png`) — kept opaque (purple caption box + letters)', '',
  'Transcribed exactly as printed on the sheet. These are the 200% Purple incantation captions; lines 1–3 each carry a',
  'timing press, line 4 is the technique name shown as it fires.', '', '| Strip | Source rect | Text on the sheet | Role |', '|---|---|---|---|']
for i, c in enumerate(R['chant']):
  out.append(f'| `{c["file"]}` | {rect(c["src"])} | **{c["text"]}** | {"line " + str(i + 1) + " (press window)" if i < 3 else "final name (fires)"} |')
out += ['', '## Frame-by-frame source rects', '']
for label, k, _ in SHEET_ROWS:
  a = R['anims'][k]
  out.append(f'* **{k}** ({label}): ' + '; '.join(f'#{c["cell"]} {rect(c["src"])}' for c in a['cells']))
out += ['', '## Excluded (and only these)', '',
  f'* Header banner: everything above y = {R["excluded"]["header"][3]} (title / credits banner).',
  '* Row labels: the white "Intro:", "Win:", "Stand:" … captions (removed by the component / top-row rule).',
  '* Dividers: ' + '; '.join(rect(d) for d in R['excluded']['dividers']) + '.',
  '* Box borders: the coloured frames around the boxed frames — '
  + '; '.join(f'{k} RGB{tuple(v["border"])} at {rect(v["outer"])}' for k, v in R['boxes'].items())
  + '. Only the 1–2 px border is dropped; the pose inside is used.',
  '* A 3-pixel stray speck at about y 790, x 214, beside the Guard row. It is not a frame (no body, no outline) and is ignored.', '',
  '## Hand fixes (stated, minimal)', '',
  f'* **Maximum Output Blue orb.** On the sheet the orb touches Gojo\'s fingertip in the last Max Output frame. The pose',
  f'  and the orb were split (column {R["maxBlueSplitColumn"]} plus a circle fit). The orb\'s **left half was rebuilt by mirroring its',
  '  clean right half** (axis at the orb centre), so `fx/blueOrb.png` is symmetric with a ~2 px doubled centre sparkle.',
  '  The pose keeps its own pixels; the fingertip stays on the pose.',
  '* Jump frame 0 had a label pixel touching the hair; the label component is removed, the hair is not.', '',
  '## Anchoring', '',
  '* Every strip uses a symmetric cell: `originX` = cell centre, `originY` = feet row, so mirroring keeps the feet still.',
  '* Standing frames are aligned on the head (top 14 rows); lying frames (knockdown / lose) on the feet.',
  '* Drawn at `spriteScale` 2 (integer nearest-neighbour): the stand frame is ~63 px → ~126 px on screen, the old Gojo is ~112 px.', '',
  '## Derived art', '',
  '* Select portrait `portrait.png` (128×96): the stand frame\'s head, ×4 nearest.',
  '* Blood map `data/bloodmaps/gojo_shinjuku.json` (tools/bloodmap/build.py, HUMAN).',
  '* Edo Tensei skin: `<strip>__edo.png` beside every strip + `portrait__edo.png` (tools/edoskin/gen.py, HUMAN).',
  '* `docs/msv1/gojo/compare.png`: every strip at ×2 with its cell grid and origin mark, beside the sheet.', '']
open(os.path.join(ROOT, 'docs/msv1/gojo/LEDGER.md'), 'w').write('\n'.join(out))
print('LEDGER.md', total, 'frames')
