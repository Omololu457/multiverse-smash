#!/usr/bin/env python3
"""mine_blobs.py — Ranger ultimate pre-rolls commit helper: write HEAD + ONLY the pre-roll hunks of abilities.js (which also holds
other sessions' uncommitted work) to <out>/abilities.js. With --apply, applies the same hunks to the working file. The working tree
is never touched otherwise.
  python3 -I tools/rangercine/mine_blobs.py <repo> <out dir> [--apply]"""
import os, sys, subprocess
ROOT, OUT = sys.argv[1], sys.argv[2]
APPLY = '--apply' in sys.argv
EDITS = {
 'abilities.js': [
  ('import { startDemonSlayerPreroll } from "./demonSlayerCinematics.js"   // DS-ULT-CINE (Zenitsu / Nezuko ultimate pre-rolls; no cycle)\n',
   'import { startDemonSlayerPreroll } from "./demonSlayerCinematics.js"   // DS-ULT-CINE (Zenitsu / Nezuko ultimate pre-rolls; no cycle)\nimport { rangerUltPreroll } from "./rangerUltCinematics.js"   // RANGER-ULT-CINE: Demon Slayer-style pre-roll before the Rangers\' ultimates (no cycle)\n'),
  ('  activateRedRangerPowerSwordCinematic(fighter, opp, (cineCtx) => applyRedRangerPowerSwordDamage(fighter, opp, cineCtx))\n',
   '  rangerUltPreroll("red_ranger_mmpr", fighter, opp, () => activateRedRangerPowerSwordCinematic(fighter, opp, (cineCtx) => applyRedRangerPowerSwordDamage(fighter, opp, cineCtx)))   // RANGER-ULT-CINE\n'),
  ('  activateSamuraiFlameSmasherCinematic(fighter, opp, (cineCtx) => applySamuraiUltimateDamage(fighter, opp, cineCtx))\n',
   '  rangerUltPreroll("samurai_red_ranger", fighter, opp, () => activateSamuraiFlameSmasherCinematic(fighter, opp, (cineCtx) => applySamuraiUltimateDamage(fighter, opp, cineCtx)))   // RANGER-ULT-CINE\n'),
  ('  activateSamuraiFlameSmasherCinematic(fighter, opp, (cineCtx) => applyGoldSamuraiUltimateDamage(fighter, opp, cineCtx))\n',
   '  rangerUltPreroll("gold_samurai_ranger", fighter, opp, () => activateSamuraiFlameSmasherCinematic(fighter, opp, (cineCtx) => applyGoldSamuraiUltimateDamage(fighter, opp, cineCtx)))   // RANGER-ULT-CINE\n'),
  ('  activateSamuraiFlameSmasherCinematic(fighter, opp, (cineCtx) => applyGreenSamuraiUltimateDamage(fighter, opp, cineCtx))\n',
   '  rangerUltPreroll("green_samurai_ranger", fighter, opp, () => activateSamuraiFlameSmasherCinematic(fighter, opp, (cineCtx) => applyGreenSamuraiUltimateDamage(fighter, opp, cineCtx)))   // RANGER-ULT-CINE\n'),
 ],
}
def patch(s, eds, where):
    for a, b in eds:
        if b in s: continue
        if s.count(a) != 1: raise SystemExit(f'{where}: anchor not unique: {a[:70]!r}')
        s = s.replace(a, b)
    return s
for f, eds in EDITS.items():
    if APPLY:
        p = os.path.join(ROOT, f)
        src = open(p).read()                        # read FIRST (opening for 'w' truncates)
        if len(src) < 1000: raise SystemExit(f'{f}: working file looks empty — refusing to write')
        out = patch(src, eds, 'worktree ' + f)
        if len(out) < len(src): raise SystemExit(f'{f}: patched text is shorter than the source — refusing to write')
        tmp = p + '.rangercine.tmp'; open(tmp, 'w').write(out)
        with open(p, 'r+') as fh: fh.seek(0); fh.write(out); fh.truncate()   # in place (keeps hard links)
        os.remove(tmp); print(f, 'applied')
    s = subprocess.run(['git', '-C', ROOT, 'show', f'HEAD:{f}'], capture_output=True, text=True, check=True).stdout
    s = patch(s, eds, 'HEAD ' + f)
    os.makedirs(OUT, exist_ok=True); open(os.path.join(OUT, f), 'w').write(s); print(f, 'blob ok')
