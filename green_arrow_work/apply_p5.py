#!/usr/bin/env python3
"""Phase 5: Oliver's trick-arrow moveset.
 - abilities.js: append the Phase-5 block; expand tickGreenArrowTimers (Tech income + cd ticks
   + ice-hook/emp synergy + homing).
 - game.js: import + wire updateGreenArrowCommandCombat into the command-normal section.
 - combat.js: ice/emp on-hit status (gated on proj._gaArrow) + _gaDisabled ticker.
 - drones.js + summons.js: EMP disable gate on spawn."""
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

# 1) append Phase-5 block
block = io.open("green_arrow_work/ga_phase5_block.js", encoding="utf-8").read()
s = io.open("abilities.js", encoding="utf-8").read()
if "OLIVER'S MOVESET" not in s:
    io.open("abilities.js", "w", encoding="utf-8").write(s + "\n" + block + "\n")
    print("  appended Phase-5 block to abilities.js")
else:
    print("  SKIP append P5")

# 2) expand tickGreenArrowTimers (replace the Phase-4 stub)
OLD = ('''export function tickGreenArrowTimers(fighter) {
  if ((fighter.rosterKey || "").toLowerCase() !== "green_arrow") return
  if ((fighter._gaTechLock || 0) > 0) fighter._gaTechLock--
  if ((fighter._gaTagReticle || 0) > 0) fighter._gaTagReticle--
}''')
NEW = ('''export function tickGreenArrowTimers(fighter) {
  if ((fighter.rosterKey || "").toLowerCase() !== "green_arrow") return
  if ((fighter._gaTechLock || 0) > 0) fighter._gaTechLock--
  if ((fighter._gaTagReticle || 0) > 0) fighter._gaTagReticle--
  if ((fighter._gaIceCd || 0) > 0) fighter._gaIceCd--
  if ((fighter._gaEmpCd || 0) > 0) fighter._gaEmpCd--
  // TECH hit-income, capped at +12/s (budget resets every 60 frames) — drones can't self-fund forever.
  fighter._gaSecTick = (fighter._gaSecTick || 0) + 1
  if (fighter._gaTechBudget == null || fighter._gaSecTick >= 60) { fighter._gaSecTick = 0; fighter._gaTechBudget = 12 }
  if (fighter._gaArrowHit) { const g = Math.min(4, fighter._gaTechBudget); fighter.energy = Math.min(fighter.maxEnergy || 100, (fighter.energy || 0) + g); fighter._gaTechBudget -= g; fighter._gaArrowHit = false }
  if (fighter._gaDroneHit) { const g = Math.min(2, fighter._gaTechBudget); fighter.energy = Math.min(fighter.maxEnergy || 100, (fighter.energy || 0) + g); fighter._gaTechBudget -= g; fighter._gaDroneHit = false }
  // ICE-HOOK + EMP synergies (combat.js stamps the victim on the owner on a clean hit)
  if (fighter._gaIceHookHit) { const opp = fighter._gaIceHookHit; fighter._gaIceHookHit = null; const sky = _gaHasSkyhook(fighter); if (sky && opp && !opp.eliminated) { sky.state = "hookEnemy"; sky.data.hookT = 0; sky.target = opp; opp._gaHooked = true } }
  if (fighter._gaEmpHit) { const opp = fighter._gaEmpHit; fighter._gaEmpHit = null; if (opp) { try { recallDrones(opp) } catch (_) {} const k = (opp.rosterKey || "").toLowerCase(); if (/ben10|vilgax|albedo|iron_man|cyborg/.test(k) || opp.traits?.energyType === "tech") opp.energy = Math.max(0, (opp.energy || 0) - 20) } }
  // slight HOMING on tagged arrows (<= ~6 deg/frame toward the Overwatch-tagged target)
  for (const p of activeProjectiles) {
    if (!p._gaHoming || !p._gaTarget || p._gaTarget.eliminated) continue
    const tx = (p._gaTarget.x || 0) + (p._gaTarget.w || 60) / 2, ty = (p._gaTarget.y || 0) + (p._gaTarget.h || 100) * 0.4
    const ang = Math.atan2(p.vy || 0, p.vx || 0.0001), want = Math.atan2(ty - p.y, tx - p.x)
    let d = want - ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
    const max = 0.105; d = Math.max(-max, Math.min(max, d))
    const sp = Math.hypot(p.vx || 0, p.vy || 0) || 1; const na = ang + d
    p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp
  }
}''')
# direct OLD -> NEW replace (expand the Phase-4 stub in-place)
s = io.open("abilities.js", encoding="utf-8").read()
if "_gaTechBudget" in s:
    print("  SKIP tick expand (already done)")
else:
    assert s.count(OLD) == 1, f"tickGreenArrowTimers stub count {s.count(OLD)} != 1"
    s = s.replace(OLD, NEW)
    io.open("abilities.js", "w", encoding="utf-8").write(s)
    print("  expanded tickGreenArrowTimers")

# 3) game.js — import updateGreenArrowCommandCombat
patch("game.js",
      '  updateGokuCommandCombat,    // Goku "Meteor Combination" rush chain (Fwd+Heavy 3-stage rekka: lunge-punch → flurry hook → roundhouse crescent launcher, cancel-on-hit)\n',
      '  updateGreenArrowCommandCombat,   // GREEN ARROW: trick-arrow motions (qcf/qcb/dd + L/H/Up) on the attack buttons + →+Heavy bow slash\n',
      where="after", must_absent="updateGreenArrowCommandCombat,")

# 4) game.js — command-normal interception (after the Naruto Seventh block)
patch("game.js",
      '  if ((fighter.rosterKey || "").toLowerCase() === "naruto_seventh" && !charging &&\n'
      '      updateNarutoSeventhCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return\n',
      '\n  // GREEN ARROW: trick-arrow MOTIONS on the attack buttons (qcf/qcb/dd + L/H/Up) fire arrows; a bare\n'
      '  // L/H/Up stays the normal (jab/straight/kick). →+Heavy = bow slash. Consumes only when an arrow fires.\n'
      '  if ((fighter.rosterKey || "").toLowerCase() === "green_arrow" && !charging &&\n'
      '      updateGreenArrowCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return\n',
      where="after", must_absent="updateGreenArrowCommandCombat(fighter, inputState")

# 5) combat.js — ice/emp on-hit status (after the onHitBlind block)
patch("combat.js",
      '      if (!fighter.isBlocking && proj.onHitBlind && (fighter.health || 0) > 0) { fighter.obscured = true; fighter.obscuredTimer = Math.max(fighter.obscuredTimer || 0, 90) }\n',
      '      // GREEN ARROW trick-arrow on-hit status (gated on proj._gaArrow kind; only GA arrows set it).\n'
      '      if (!fighter.isBlocking && proj._gaArrow === "ice" && (fighter.health || 0) > 0) { fighter._supFrozen = 42; fighter._supFrozenMax = 42; fighter.hitstun = Math.max(fighter.hitstun || 0, 42); fighter.vx = 0; if (proj.owner) proj.owner._gaIceHookHit = fighter }\n'
      '      if (!fighter.isBlocking && proj._gaArrow === "emp" && (fighter.health || 0) > 0) { fighter._gaDisabled = 180; if (proj.owner) proj.owner._gaEmpHit = fighter }\n',
      where="after", must_absent='proj._gaArrow === "ice"')

# 6) combat.js — tick _gaDisabled down for the victim (beside the _supFrozen tick; no-op for others)
patch("combat.js",
      '  if ((fighter._supFrozen || 0) > 0) { fighter._supFrozen--; if (fighter.hitstun < fighter._supFrozen) fighter.hitstun = fighter._supFrozen; fighter.vx = 0 }\n',
      '  if ((fighter._gaDisabled || 0) > 0) fighter._gaDisabled--   // GREEN ARROW EMP: summon/drone lockout countdown (only GA\'s EMP sets it)\n',
      where="after", must_absent="fighter._gaDisabled--")

# 7) drones.js — EMP gate on spawn
patch("drones.js",
      "  if (droneTypeOnCooldown(owner, type)) return null\n",
      "  if ((owner._gaDisabled || 0) > 0) return null       // EMP lockout — no new drones while disabled\n",
      where="after", must_absent="EMP lockout")

# 8) summons.js — EMP gate on spawn
patch("summons.js",
      "export function spawnSummon(owner, summonData, target) {\n",
      "  if (owner && (owner._gaDisabled || 0) > 0) return null   // GREEN ARROW EMP: summons disabled (no-op unless EMP'd)\n",
      where="after", must_absent="GREEN ARROW EMP: summons disabled")

print("Phase 5 wiring applied.")
