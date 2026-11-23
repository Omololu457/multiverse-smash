#!/usr/bin/env python3
"""MSV1-OMNIMAN (omniman_viltrum): idempotent, narrow registration hooks in shared files (Gojo / Sukuna Shinjuku pattern;
most anchors are Sukuna Shinjuku's own hook lines, so this fighter's lines sit right after his). Each hook =
(phase, file, anchor, op, text, marker[, count]). A hook whose marker is present is skipped (re-run = no-op).
The OLD Omni-Man (`omniman`) is never touched: every line here is gated on rosterKey === 'omniman_viltrum' / isOmv(),
or on a profile key only he has (flight.js `momentum`).
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...] [--phase N]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  omniman_viltrum: { work: 'Omni-Man (Nolan Grayson, Invincible) — sprite sheet', artists: ['imhomiejaydev'],\n"
  "    source: 'Omni-Man sprites from the supplied sheet \"omni_man_sprites_reupload_from_my_lost_acc__by_imhomiejaydev\" (kept as assets/incoming/omniman/omniman.png; no credit text on the sheet itself — the artist is named in the file name). Purple background RGB(140,70,130) keyed with an exact match; nearest-neighbour integer scaling only (docs/msv1/omniman/LEDGER.md, tools/omnimanviltrum/slice.py). Skins: precomputed region recolours (tools/omnimanskins/).',\n"
  "    files: ['assets/omniman_viltrum/**'] },")
CREDITS_TXT = ("\nOmni-Man (Nolan Grayson, Invincible) sprites by imhomiejaydev\n"
  "  (the new `omniman_viltrum` fighter; the old `omniman` is unchanged; supplied sheet\n"
  "  omni_man_sprites_reupload_from_my_lost_acc__by_imhomiejaydev_deqbeyy.png)\n"
  "Source files: assets/omniman_viltrum/**  (ledger: docs/msv1/omniman/LEDGER.md)")
HOOKS = [
  (1, 'characters.js', "import { sukuna_shinjuku } from './sukunaShinjukuData.js'", 'after_line',
   "import { omniman_viltrum } from './omnimanViltrumData.js'   // MSV1-OMNIMAN Omni-Man (Viltrumite) — a NEW fighter beside the old `omniman` (untouched); omnimanViltrum*.js", "from './omnimanViltrumData.js'"),
  (1, 'characters.js', "  omniman: omniMan,", 'replace', "  omniman: omniMan, omniman_viltrum,   // omniman_viltrum: MSV1-OMNIMAN", "omniman_viltrum,   // omniman_viltrum: MSV1-OMNIMAN"),
  (1, 'spritesheets.js', "  sukuna_shinjuku: { actions: { idle: './assets/sukuna_shinjuku/idle.png' } },", 'after_line',
   "  omniman_viltrum: { actions: { idle: './assets/omniman_viltrum/idle.png' } },", "assets/omniman_viltrum/idle.png"),
  (1, 'credits.js', "    files: ['assets/sukuna_shinjuku/**'] },", 'after_line', CREDIT, "assets/omniman_viltrum/**"),
  (1, 'CREDITS.txt', "Source files: assets/sukuna_shinjuku/**  (ledger: docs/msv1/sukuna/LEDGER.md)", 'after_line', CREDITS_TXT, "omniman_viltrum` fighter"),
]

HOOKS += [
  (1, 'tools/edoskin/eligibility.json', '  "omega_ranger": "MASKED",', 'after_line', '  "omniman_viltrum": "HUMAN",', '"omniman_viltrum": "HUMAN"'),
  (1, 'tools/edoskin/portraits.json', ' "sukuna_shinjuku": "assets/sukuna_shinjuku/portrait.png",', 'after_line', ' "omniman_viltrum": "assets/omniman_viltrum/portrait.png",', '"omniman_viltrum": "assets/omniman_viltrum/portrait.png"'),
  (1, 'edoSkinKeys.js', '  "omega_ranger",', 'after_line', '  "omniman_viltrum",', '"omniman_viltrum",'),
]


def main():
  a = sys.argv[1:]; check = '--check' in a
  root = a[a.index('--root') + 1] if '--root' in a else ROOT
  phase = int(a[a.index('--phase') + 1]) if '--phase' in a else 99
  only = None
  if '--only' in a:
    only = set(x for x in a[a.index('--only') + 1:] if not x.startswith('--') and not x.isdigit())
  hooks = [h[1:] for h in HOOKS if h[0] <= phase]
  bad = 0
  for fn in sorted({h[0] for h in hooks}):
    if only and fn not in only: continue
    p = os.path.join(root, fn); src = open(p, encoding='utf-8').read(); out = src
    for h in hooks:
      f, anchor, op, text, marker = h[:5]; want = h[5] if len(h) > 5 else 1
      if f != fn: continue
      if marker in out: print(f'  skip  {fn}: {marker[:50]!r} present'); continue
      n = out.count(anchor)
      if n != want: print(f'  FAIL  {fn}: anchor x{n} (want {want}): {anchor[:70]!r}'); bad += 1; continue
      if op == 'replace': out = out.replace(anchor, text)
      elif op == 'before_line':
        k = 0
        for _ in range(want):
          i = out.index(anchor, k); i = out.rfind('\n', 0, i) + 1
          out = out[:i] + text + '\n' + out[i:]; k = i + len(text) + 1 + len(anchor)
      else:
        k = 0
        for _ in range(want):
          i = out.index(anchor, k); j = out.find('\n', i + len(anchor)); j = len(out) if j < 0 else j
          out = out[:j] + '\n' + text + out[j:]; k = j + 1 + len(text)
      print(f'  {"would" if check else "apply"} {fn}: {marker[:50]!r}')
    if out != src and not check:
      if open(p, encoding='utf-8').read() != src: print(f'  FAIL  {fn} changed during patch; not written'); bad += 1; continue
      open(p, 'w', encoding='utf-8').write(out)
  sys.exit(1 if bad else 0)

main()
