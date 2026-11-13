#!/usr/bin/env python3
"""Phase 3: wire drones.js into game.js — import, per-frame update+collisions (beside
updateActiveSummons), render (beside drawActiveSummons), and match reset (beside
clearAbilityState). All additive + no-op when no drones are active."""
import io, sys

def patch(path, anchor, insert, where="after", must_absent=None, count=1):
    s = io.open(path, encoding="utf-8").read()
    if must_absent and must_absent in s:
        print(f"  SKIP {path}: {must_absent!r} present"); return
    n = s.count(anchor)
    if n != count:
        print(f"  !! {path}: anchor count {n} != {count}: {anchor!r}"); sys.exit(1)
    rep = (insert + anchor) if where == "before" else (anchor + insert)
    s = s.replace(anchor, rep)
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  patched {path} ({where})")

# 1) import drones.js (after the full flight-module import line, comment included)
patch("game.js",
      'import { flightToggleInput, flightTakeoff, tickFlightDriver, resetFlight, isFlying as isFlightModuleFlying, getFlightProfile } from "./flight.js"   // FLIGHT MODULE (Homelander + future flyers): charge-edge toggle + takeoff (Superman Flight Escape) + per-frame driver + round reset + profile (HUD gauge max)\n',
      'import { updateDrones, updateDroneCollisions, drawDrones, resetDrones, activeDrones } from "./drones.js"   // GREEN ARROW deployable-drone module (generic; reset/tick/collide/draw)\n',
      where="after", must_absent='from "./drones.js"', count=1)

# 2) per-frame update + collisions (after the 1v1 summon tick)
patch("game.js", "  updateActiveSummons()\n",
      "  // GREEN ARROW drones — tick movement/behaviour + hittable collisions (no-op when none active).\n"
      "  if (activeDrones.length || p1?._gaDroneCd || p2?._gaDroneCd) {\n"
      "    updateDrones([p1, p2], globalFrameCount, { leftWall: 0, rightWall: getStageWorldWidth(), ceilingY: -200 })\n"
      "    updateDroneCollisions([p1, p2], activeProjectiles)\n"
      "  }\n",
      where="after", must_absent="updateDrones([p1, p2]", count=1)

# 3) render (after the 1v1 summon draw)
patch("game.js", "  drawActiveSummons(ctx)\n",
      "  drawDrones(ctx, globalFrameCount, camera)   // GREEN ARROW drones — world space, over fighters\n",
      where="after", must_absent="drawDrones(ctx, globalFrameCount", count=1)

# 4) match reset (both clearAbilityState sites)
patch("game.js",
      "  clearAbilityState()                                  // activeProjectiles (shared) + summons + pending clones\n",
      "  resetDrones()                                        // GREEN ARROW drones cleared with summons/projectiles\n",
      where="after", must_absent="resetDrones()                                        // GREEN ARROW", count=1)
patch("game.js",
      "  clearAbilityState()      // activeProjectiles (shared), activeSummons, pending Naruto clones\n",
      "  resetDrones()            // GREEN ARROW drones cleared with summons/projectiles\n",
      where="after", must_absent="resetDrones()            // GREEN ARROW", count=1)

print("Phase 3 game.js wiring applied.")
