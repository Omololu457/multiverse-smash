#!/usr/bin/env python3
"""Phase 4: wire the Green Arrow drone roster + ARROWSTORM super into abilities.js + game.js.
 - abilities.js: import drones.js fns; append the Phase-4 block; add triggerSpecial +
   triggerUltimate switch cases.
 - game.js: import applyGreenArrowArrowstorm/tickGreenArrowTimers; call them per-frame.
All additive + gated on rosterKey green_arrow."""
import io, sys

def patch(path, anchor, insert, where="after", must_absent=None, count=1):
    s = io.open(path, encoding="utf-8").read()
    if must_absent and must_absent in s:
        print(f"  SKIP {path}: {must_absent!r} present"); return
    n = s.count(anchor)
    if n != count:
        print(f"  !! {path}: anchor count {n} != {count}: {anchor!r}"); sys.exit(1)
    s = s.replace(anchor, (insert + anchor) if where == "before" else (anchor + insert))
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  patched {path} ({where})")

# 1) abilities.js — import drones.js functions (after motionInput import; no cycle)
patch("abilities.js",
      'import { detectMotion, clearMotionHistory } from "./motionInput.js"   // classic motion-input engine (Naruto-universe elevated specials; motionInput.js imports nothing → no cycle)\n',
      'import { registerDroneProfile, registerBehaviour, spawnDrone, recallDrones, countDrones, getActiveDrones } from "./drones.js"   // GREEN ARROW generic drone system (drones.js imports only flight.js → no cycle)\n',
      where="after", must_absent='from "./drones.js"')

# 2) abilities.js — append the Phase-4 block at end of file
block = io.open("green_arrow_work/ga_phase4_block.js", encoding="utf-8").read()
s = io.open("abilities.js", encoding="utf-8").read()
if "ARROWSTORM PROTOCOL" not in s:
    io.open("abilities.js", "w", encoding="utf-8").write(s + "\n" + block + "\n")
    print("  appended Phase-4 block to abilities.js")
else:
    print("  SKIP append: block already present")

# 3) abilities.js — triggerSpecial case
patch("abilities.js",
      '    case "superman": return executeSupermanSpecial(fighter, context)   // Heat Vision (neutral/down eye-beam projectile) / Super Flying Punch (fwd charged dash-strike)\n',
      '    case "green_arrow": return executeGreenArrowSpecial(fighter, context)   // DRONES by held dir (↑Skyhook/→Kestrel/←Aegis/↓Bulwark/neutral Overwatch); dbl-tap=recall; ↓↘→↓↘→=Super\n',
      where="after", must_absent='case "green_arrow": return executeGreenArrowSpecial')

# 4) abilities.js — triggerUltimate case
patch("abilities.js",
      '      case "superman": cast = executeSupermanUltimate(fighter, context); break   // Solar Overload: green energy-surge → particle-dissolve detonation freeze cinematic\n',
      '      case "green_arrow": cast = executeGreenArrowUltimate(fighter, context); break   // ARROWSTORM PROTOCOL: drones fire + Payload carpet-bomb + closing explosive volley\n',
      where="after", must_absent='case "green_arrow": cast = executeGreenArrowUltimate')

# 5) game.js — import GA appliers
patch("game.js",
      '  applySupermanHeatVision,   // Superman HEAT VISION: sustained auto-aim hitscan beam while Special is HELD (tap = single shot)\n',
      '  applyGreenArrowArrowstorm, tickGreenArrowTimers,   // GREEN ARROW: ARROWSTORM super per-frame driver + Tech-lock/tag timers\n',
      where="after", must_absent="applyGreenArrowArrowstorm,")

# 6) game.js — per-frame call (beside Superman's ult driver)
patch("game.js",
      "  applySupermanWoC(updated, getAbilityContext())   // Superman ULTIMATE \"World of Cardboard\": scripted multi-hit state machine\n",
      "  applyGreenArrowArrowstorm(updated, getAbilityContext())   // GREEN ARROW ARROWSTORM: scripted drones-fire → Payload bombing → closing volley (no-op unless active)\n"
      "  tickGreenArrowTimers(updated)   // GREEN ARROW: Tech-lockout + tag-reticle countdowns\n",
      where="after", must_absent="applyGreenArrowArrowstorm(updated")

print("Phase 4 wiring applied.")
