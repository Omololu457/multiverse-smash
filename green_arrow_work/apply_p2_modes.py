#!/usr/bin/env python3
"""PASS2 P2 — drone Protector/Strike modes + Swarm. Replaces the behaviour block, updates the
Special dispatcher (mode + strike cost + ↑↑ Carpet Run + ↓↓ Swarm), imports DRONE_PROFILES.
Run on BOTH the worktree abilities.js (test) and base2/abilities.js (commit)."""
import io, sys

NEWBLOCK = io.open("green_arrow_work/p2_behaviours_new.js", encoding="utf-8").read()

IMPORT_OLD = 'import { registerDroneProfile, registerBehaviour, spawnDrone, recallDrones, countDrones, getActiveDrones } from "./drones.js"'
IMPORT_NEW = 'import { registerDroneProfile, registerBehaviour, spawnDrone, recallDrones, countDrones, getActiveDrones, DRONE_PROFILES } from "./drones.js"'

DISP_OLD = '''  fighter._gaLastSpecialFrame = now
  const dir = fighter._specialHeldDir || null
  const type = GA_DRONE_BY_DIR[dir] || "overwatch"
  const opp = _gaOpp(fighter, context)
  const sustain = (type === "kestrel") && !!fighter.isCharging
  const d = spawnDrone(fighter, type, { frame: now, target: opp,
    spendTech: (o, c) => spendEnergy(o, c) })
  if (d) {
    d._ctx = context; d._opp = opp
    if (sustain) d.data.sustain = true
    if (typeof sound !== "undefined") sound.play?.("ga_drone_deploy")
    fighter._spriteCastMove = "draw"; fighter._spriteCastTimer = 14
    return true
  }
  return false
}'''
DISP_NEW = '''  fighter._gaLastSpecialFrame = now
  const strike = !!fighter._gaStrikeMod                            // Heavy-held when Special pressed
  const _dbl = (tok) => { let c = 0; for (const x of dirs.slice(-3)) if (x === tok) c++; return c >= 2 }
  const opp = _gaOpp(fighter, context)
  let type, mode = strike ? "strike" : "protector", techCost
  if (_dbl("U")) { type = "payload"; mode = "protector"; techCost = 30 }        // ↑↑ Payload Carpet Run
  else if (_dbl("D")) { type = "swarm"; techCost = 40 }                         // ↓↓ Swarm
  else {
    const dir = fighter._specialHeldDir || null
    type = GA_DRONE_BY_DIR[dir] || "overwatch"
    techCost = (DRONE_PROFILES[type]?.techCost || 0) + (strike ? 5 : 0)         // STRIKE variants cost +5 Tech
  }
  const d = spawnDrone(fighter, type, { frame: now, target: opp, mode, techCost,
    spendTech: (o, c) => spendEnergy(o, c) })
  if (d) {
    d._ctx = context; d._opp = opp
    if (type === "payload") { d.maxBombs = 3; d.bombDmg = 35; d.x = (fighter.x || 0) - (fighter.facing || 1) * 640; d.facing = fighter.facing || 1 }
    if (type === "kestrel" && d.mode === "protector" && fighter.isCharging) d.data.sustain = true
    if (typeof sound !== "undefined") sound.play?.(type === "payload" ? "ga_payload_bomb" : "ga_drone_deploy")
    fighter._spriteCastMove = "draw"; fighter._spriteCastTimer = 14
    return true
  }
  return false
}'''

def apply(path):
    s = io.open(path, encoding="utf-8").read()
    if "PASS2 P2: PROTECTOR default" in s:
        print(f"  SKIP {path} (already applied)"); return
    # 1) behaviour block replace (BEHAVIOURS header .. just before SPECIAL dispatch)
    a = s.index("// ── BEHAVIOURS ──")
    b = s.index("// ── SPECIAL dispatch: drones by held direction")
    s = s[:a] + NEWBLOCK + s[b:]
    # 2) import DRONE_PROFILES
    assert s.count(IMPORT_OLD) == 1, f"import anchor {s.count(IMPORT_OLD)}"
    s = s.replace(IMPORT_OLD, IMPORT_NEW)
    # 3) dispatcher
    assert s.count(DISP_OLD) == 1, f"dispatcher anchor {s.count(DISP_OLD)}"
    s = s.replace(DISP_OLD, DISP_NEW)
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  {path}: behaviours + dispatcher + import applied")

for p in sys.argv[1:]:
    apply(p)
