#!/usr/bin/env python3
"""PASS2 P3 abilities.js — Quiver + Net/Flash/Beacon/Grapple. Run on worktree + base2."""
import io, sys
BLOCK = io.open("green_arrow_work/p3_arrows_block.js", encoding="utf-8").read()

IMP_A = 'import { registerDroneProfile, registerBehaviour, spawnDrone, recallDrones, countDrones, getActiveDrones, DRONE_PROFILES } from "./drones.js"'
IMP_N = IMP_A + '\nimport { flightAxisStep, flightSoftLimit } from "./flight.js"   // GREEN ARROW Grapple pull reuses the flight accel/drag helpers (flight.js is a leaf → no cycle)'

QUIV_A = '  if (qcf && lightEdge)  { inputState.light = false; fighter._gaCharging = true; fighter._gaChargeT = 0; return true }  // plain shot (charge)\n'
QUIV_N = ('  if (dd && upEdge)      { inputState.upAttack = false; greenArrowCycleQuiver(fighter); return true }   // ↓↓+Up = CYCLE quiver\n'
          '  if (qcb && upEdge)     { inputState.upAttack = false; return fireGAQuiver(fighter, context) }          // ↓↙←+Up = FIRE selected quiver arrow\n'
          + QUIV_A)

TICK_A = '''    p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp
  }
}'''
TICK_N = '''    p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp
  }
  _gaTickNewArrows(fighter)   // PASS2 P3: Net/Grapple cd, Beacon drop, Grapple pull, Net-hook synergy
}'''

KAMI_A = 'applyScaledDamage(opp, 90, { source: "ability", attacker: o, move: "kamikaze" })'
KAMI_N = 'applyScaledDamage(opp, 90 * ((opp._gaNetted || 0) > 0 ? 1.25 : 1), { source: "ability", attacker: o, move: "kamikaze" })'   # +25% on a NETTED foe

def apply(path):
    s = io.open(path, encoding="utf-8").read()
    if "PASS2 P3: QUIVER" in s:
        print(f"  SKIP {path}"); return
    io.open(path, "w", encoding="utf-8").write(s + "\n" + BLOCK + "\n")   # append block first
    s = io.open(path, encoding="utf-8").read()
    for a, n, lbl in [(IMP_A, IMP_N, "import"), (QUIV_A, QUIV_N, "quiver"), (TICK_A, TICK_N, "tick"), (KAMI_A, KAMI_N, "kamikaze")]:
        c = s.count(a)
        if c != 1:
            print(f"  !! {path}: {lbl} anchor {c} != 1"); sys.exit(1)
        s = s.replace(a, n)
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  {path}: block + import + quiver + tick + kamikaze applied")

for p in sys.argv[1:]:
    apply(p)
