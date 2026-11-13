
// ═══════════════════════════════════════════════════════════════════════════════
// GREEN ARROW — PASS2 P3: QUIVER + new control arrows (Net / Flash / Beacon / Grapple).
// The four new arrows share ONE input (the quiver) so they don't crowd the motion inputs; the
// existing fire/ice/explosive/EMP/trick arrows keep their direct motions (combos unchanged).
// Inputs (in updateGreenArrowCommandCombat): ↓↓+Up = CYCLE quiver · ↓↙←+Up = FIRE selected arrow.
// Statuses are applied in combat.js (gated on proj._gaArrow); beacon drop / grapple pull / net-hook
// synergy resolve from tickGreenArrowTimers. No Math.random/gameRng. All state in GAME_STATE.
// ═══════════════════════════════════════════════════════════════════════════════
const GA_QUIVER = ["net", "flash", "beacon", "grapple"]
export function greenArrowQuiverSel(fighter) { return GA_QUIVER[(fighter?._gaQuiver || 0) % GA_QUIVER.length] }
export function greenArrowCycleQuiver(fighter) { fighter._gaQuiver = ((fighter._gaQuiver || 0) + 1) % GA_QUIVER.length; return greenArrowQuiverSel(fighter) }
export function fireGAQuiver(fighter, context) {
  const sel = greenArrowQuiverSel(fighter)
  if (sel === "net") return fireGANet(fighter, context)
  if (sel === "flash") return fireGAFlash(fighter, context)
  if (sel === "beacon") return fireGABeacon(fighter, context)
  return fireGAGrapple(fighter, context)
}

// NET ARROW — 20 Tech, 6s cd. On hit: NETTED 1.0s; a FLYING foe is force-grounded 1.2s (counters
// Superman/Homelander). A netted foe can be Skyhook-hooked from anywhere, and a Kamikaze on a netted
// foe gets +25% (resolved in the behaviours / tick). The net render is procedural (drawGreenArrowFx).
function fireGANet(fighter, context) {
  if ((fighter._gaNetCd || 0) > 0) return false
  if (!spendEnergy(fighter, 20)) return false
  _gaArrow(fighter, context, { kind: "net", type: "gaNetArrow", damage: 0, speed: 17, w: 24, h: 16, color: "#cfe8ff", sheet: "./green_arrow_plainarrow.png", spriteScale: 2.4 })
  fighter._gaNetCd = 360
  fighter._spriteCastMove = "draw"; fighter._spriteCastTimer = 16
  if (typeof sound !== "undefined") sound.play?.("ga_arrow_release")
  return true
}
// FLASH ARROW — 12 Tech, 20 dmg. 0.5s dazzle stun on hit + a render-only white burst.
function fireGAFlash(fighter, context) {
  if (!spendEnergy(fighter, 12)) return false
  _gaArrow(fighter, context, { kind: "flash", type: "gaFlashArrow", damage: 20, speed: 18, w: 20, h: 10, color: "#fff7cf", sheet: "./green_arrow_plainarrow.png", spriteScale: 2.2 })
  fighter._spriteCastMove = "draw"; fighter._spriteCastTimer = 14
  if (typeof sound !== "undefined") sound.play?.("ga_emp")
  return true
}
// BEACON ARROW — 15 Tech. Sticks where it lands; 20 frames later the equipped drone (default Bulwark)
// drops there directly (no fly-in) and counts against the cap. Resolved in tickGreenArrowTimers.
function fireGABeacon(fighter, context) {
  if (!spendEnergy(fighter, 15)) return false
  const face = fighter.facing || 1
  fighter._gaBeacons = fighter._gaBeacons || []
  fighter._gaBeacons.push({ x: (fighter.x || 0) + face * 250, y: (fighter.groundY != null ? fighter.groundY : (fighter.y || 0) + (fighter.h || 100)), t: 0, type: fighter._gaBeaconDrone || "bulwark", ctx: context })
  _gaArrow(fighter, context, { kind: "beacon", type: "gaBeaconArrow", damage: 0, speed: 16, vx: face * 16, vy: -4, w: 18, h: 10, color: "#39d353", sheet: "./green_arrow_plainarrow.png", spriteScale: 2.0, lifetime: 40 })
  fighter._spriteCastMove = "draw"; fighter._spriteCastTimer = 14
  if (typeof sound !== "undefined") sound.play?.("ga_drone_deploy")
  return true
}
// GRAPPLE ARROW — 10 Tech, 4s cd. Pulls Oliver to an anchor (toward the foe, or a forward spot) using
// the flight.js accel/drag helpers — mobility + escape. Resolved in tickGreenArrowTimers.
function fireGAGrapple(fighter, context) {
  if ((fighter._gaGrappleCd || 0) > 0) return false
  if (!spendEnergy(fighter, 10)) return false
  const opp = _gaOpp(fighter, context), face = fighter.facing || 1
  const ax = (opp && !opp.eliminated) ? ((opp.x || 0) - face * 70) : ((fighter.x || 0) + face * 360)
  fighter._gaGrapple = { tx: ax, ty: (fighter.y || 0) - 10, t: 26, vx: 0, vy: 0 }
  fighter._gaGrappleCd = 240
  _gaArrow(fighter, context, { kind: "grapple", type: "gaGrappleArrow", damage: 0, speed: 22, w: 16, h: 8, color: "#b79bff", sheet: "./green_arrow_plainarrow.png", spriteScale: 1.8, lifetime: 30 })
  fighter._spriteCastMove = "draw"; fighter._spriteCastTimer = 12
  if (typeof sound !== "undefined") sound.play?.("ga_arrow_release")
  return true
}

// Per-frame resolution for the new arrows (called from tickGreenArrowTimers).
function _gaTickNewArrows(fighter) {
  if ((fighter._gaNetCd || 0) > 0) fighter._gaNetCd--
  if ((fighter._gaGrappleCd || 0) > 0) fighter._gaGrappleCd--
  // BEACON — after 20 frames, drop the equipped drone directly at the beacon (no fly-in).
  if (fighter._gaBeacons && fighter._gaBeacons.length) {
    for (let i = fighter._gaBeacons.length - 1; i >= 0; i--) {
      const bk = fighter._gaBeacons[i]
      if (++bk.t >= 20) {
        const d = spawnDrone(fighter, bk.type, { frame: bk.t, target: _gaOpp(fighter, bk.ctx), mode: "protector", spendTech: () => true })
        if (d) { d._ctx = bk.ctx; d.x = bk.x; d.tx = bk.x; d.state = "planted"; d.data.fireT = 0; d.frameAge = 99 }
        fighter._gaBeacons.splice(i, 1)
      }
    }
  }
  // GRAPPLE — glide Oliver to the anchor with flight.js accel/drag (overrides physics while active).
  if (fighter._gaGrapple) {
    const g = fighter._gaGrapple
    const prof = { accel: 4, drag: 0.82, reverseBrake: 0.7, overspeedDrag: 0.9 }
    const dx = g.tx - (fighter.x || 0), dy = g.ty - (fighter.y || 0)
    g.vx = flightSoftLimit(flightAxisStep(g.vx || 0, Math.abs(dx) < 8 ? 0 : Math.sign(dx), prof), 30, prof)
    g.vy = flightSoftLimit(flightAxisStep(g.vy || 0, Math.abs(dy) < 8 ? 0 : Math.sign(dy), prof), 22, prof)
    fighter.x += g.vx; fighter.y += g.vy; fighter.vx = 0; fighter.vy = 0
    if (--g.t <= 0 || (Math.abs(dx) < 24 && Math.abs(dy) < 24)) fighter._gaGrapple = null
  }
  // NET → SKYHOOK synergy: a netted foe can be hooked from anywhere (combat.js stamps _gaNetHit).
  if (fighter._gaNetHit) {
    const opp = fighter._gaNetHit; fighter._gaNetHit = null
    const sky = _gaHasSkyhook(fighter)
    if (sky && opp && !opp.eliminated) { sky.state = "hookEnemy"; sky.data.hookT = 0; sky.target = opp; opp._gaHooked = true }
  }
}
