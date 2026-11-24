#!/usr/bin/env python3
"""mine_blobs.py — MSV1-MEGAZORD commit helper: write HEAD + ONLY the Megazord hunks of the shared files that also hold other
sessions' uncommitted work (combat.js, game.js), to <out>/<file>. The working tree is never touched.
  python3 -I tools/megazord/mine_blobs.py <repo> <out dir>"""
import os, sys, subprocess
ROOT, OUT = sys.argv[1], sys.argv[2]
EDITS = {
 'combat.js': [
  ("import { isLuffy, luffyHit, absorbLuffyStrike, prepareLuffyAttack, clearLuffy, luffyInterrupted, luffyLimbHurtbox } from './luffyState.js'\n",
   "import { isLuffy, luffyHit, absorbLuffyStrike, prepareLuffyAttack, clearLuffy, luffyInterrupted, luffyLimbHurtbox } from './luffyState.js'\nimport { MZ_HOOK } from './megazordHook.js'   // MSV1-MEGAZORD (leaf, no imports)\n"),
  ("  const dealt = Math.floor(raw * scale)\n  const before = target.health || 0",
   "  let dealt = Math.floor(raw * scale)\n  if (target._mzOn && MZ_HOOK.absorb) { const _mz = MZ_HOOK.absorb(target, dealt, opts); if (_mz != null) dealt = _mz }   // MSV1-MEGAZORD: the Thunder Megazord's ARMOR takes the hit (gated: _mzOn)\n  const before = target.health || 0"),
  ("    const kevinArmored = kevinArmor(defender, atk)\n",
   "    const kevinArmored = kevinArmor(defender, atk) || !!(defender._mzOn && MZ_HOOK.armored?.(defender, atk, cat))   // + MSV1-MEGAZORD super armor (gated: _mzOn)\n"),
  ("  if (gsGrabGate(defender, attacker)) { attacker.attackCooldown = 18; return false }   // Satoru Gojo (Shinjuku): Infinity cannot be grabbed; gojo_shinjuku-gated\n",
   "  if (gsGrabGate(defender, attacker)) { attacker.attackCooldown = 18; return false }   // Satoru Gojo (Shinjuku): Infinity cannot be grabbed; gojo_shinjuku-gated\n  if (defender._mzOn) { attacker.attackCooldown = 18; return false }   // MSV1-MEGAZORD: the Thunder Megazord cannot be grabbed (gated: _mzOn)\n"),
 ],
 'game.js': [
  ("  cinematic: () => _rewindUnsafeNow(),\n}\nfunction handleOmnitrixSwitch",
   "  cinematic: () => _rewindUnsafeNow(),\n  startMove: (f, key, md) => startMove(f, key, md),   // the Thunder Megazord's moves (megazord.js) run through the engine's own startMove\n}\nfunction handleOmnitrixSwitch"),
 ],
}
for f, eds in EDITS.items():
    s = subprocess.run(['git', '-C', ROOT, 'show', f'HEAD:{f}'], capture_output=True, text=True, check=True).stdout
    w = open(os.path.join(ROOT, f)).read()
    for a, b in eds:
        if s.count(a) != 1: raise SystemExit(f'{f}: HEAD anchor not unique: {a[:60]!r}')
        if b not in w: raise SystemExit(f'{f}: working tree lacks the hunk: {b[:60]!r}')
        s = s.replace(a, b)
    os.makedirs(os.path.dirname(os.path.join(OUT, f)) or OUT, exist_ok=True)
    open(os.path.join(OUT, f), 'w').write(s)
    print(f, 'ok')
