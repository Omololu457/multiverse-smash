#!/usr/bin/env python3
"""MSV1-GOJO (gojo_shinjuku): idempotent, narrow registration hooks in shared files (Higuruma/Megumi pattern).
Each hook = (file, anchor, op, text, marker[, count]). The anchor must occur exactly `count` times (default 1);
'after_line' inserts `text` after the line holding the anchor; 'replace' substitutes anchor -> text. A hook whose marker
is already present is skipped, so re-running is a no-op. Other writers' lines are never touched.
Apply to the worktree AND to a HEAD copy (--root DIR) so a private-index commit carries only these hunks.
Usage: apply_hooks.py [--check] [--root DIR] [--only FILE ...] [--phase N]"""
import sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  gojo_shinjuku: { work: 'Satoru Gojo (Shinjuku Arc) — Jump Ultimate Stars-style sprite sheet', artists: ['FinhJ', 'ZebrasBlack (credit)', 'R0B4N (credit)'],\n"
  "    source: 'Satoru Gojo (Shinjuku Arc) sprites by FinhJ, credits ZebrasBlack and R0B4N. Supplied sheet \"satoru_gojo_shinjuku_arc_jus_sprite_sheet_by_finhj_by_finhj_dhxrc7c.png\" (SHA-256 9e865da6…; kept in assets/incoming/gojo_shinjuku/). Indigo background RGB(33,31,63) chroma-keyed; header, row labels, dividers and box borders excluded; nearest-neighbour integer scaling only (docs/msv1/gojo/LEDGER.md, tools/gojoshinjuku/slice.py). Skins: precomputed region recolours (tools/gojoskins/).',\n"
  "    files: ['assets/gojo_shinjuku/**'] },")
# phase tags let one script grow phase by phase; a hook is applied when its phase <= --phase (default: all)
HOOKS = [
  (1, 'characters.js', "import { higuruma } from './higurumaData.js'", 'after_line',
   "import { gojo_shinjuku } from './gojoShinjukuData.js'   // MSV1-GOJO Satoru Gojo (Shinjuku Arc, FinhJ sheet) — a NEW fighter beside the old `gojo` (untouched); gojoShinjuku*.js + limitless.js", "from './gojoShinjukuData.js'"),
  (1, 'characters.js', "  gojo, sukuna,", 'replace', "  gojo, gojo_shinjuku, sukuna,", "gojo, gojo_shinjuku,"),
  (1, 'spritesheets.js', "  higuruma: { actions: { idle: './assets/higuruma/idle.png' } },", 'after_line',
   "  gojo_shinjuku: { actions: { idle: './assets/gojo_shinjuku/idle.png' } },", "assets/gojo_shinjuku/idle.png"),
  (1, 'credits.js', "    files: ['assets/higuruma/**'] },", 'after_line', CREDIT, "assets/gojo_shinjuku/**"),
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
