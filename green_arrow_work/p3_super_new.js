export function applyGreenArrowArrowstorm(fighter, context) {
  const s = fighter && fighter._gaArrowstormActive
  if (!s) return
  if ((fighter.rosterKey || "").toLowerCase() !== "green_arrow") return
  const opp = _gaOpp(fighter, context)
  const frame = context?.frame || 0
  const seed = (fighter._matchSeed | 0) || 1
  const worldW = context?.stageWidth || context?.worldWidth || 2000
  const left = (context?.stageLeft || 0) + 120, right = (context?.stageLeft || 0) + worldW - 120, span = Math.max(200, right - left)
  const groundY = (context?.groundY != null) ? context.groundY : ((fighter.groundY != null) ? fighter.groundY : 500)
  const planeY = groundY - 360
  fighter.vx = 0; fighter._gaBadgeFlash = Math.max(fighter._gaBadgeFlash || 0, 6)

  // 1. OPENING — R16 bow-skyward pose, badge flash, 20-frame freeze, then the drone volley fires.
  if (s.phase === "startup") {
    fighter._spriteCastMove = "skyward"; fighter._spriteCastTimer = 4
    fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 2)
    if (--s.t <= 0) {
      for (const d of getActiveDrones()) {
        if (d.owner !== fighter || d.dying) continue
        d._ctx = context; d.target = opp
        if (d.type === "aegis" && opp) applyScaledDamage(opp, 40, { source: "ability", attacker: fighter, move: "aegisRam" })
        if (d.type === "kestrel") d.data.sustain = true
        if (d.type === "overwatch") _gaTagReticle(opp, 400)
        if (d.type === "bulwark") d.data.fireT = 75
      }
      const face = fighter.facing || 1
      const bomber = spawnDrone(fighter, "payload", { frame, target: opp, spendTech: () => true })
      if (bomber) { bomber._ctx = context; bomber.x = left - 200; bomber.facing = 1; bomber.maxBombs = 0 }   // visual only; the super spawns the carpet
      s._bomber = bomber || null
      s.phase = "carpet"; s.t = 76; s.dropped = 0
    }
    return
  }
  // WAVE 1 — CARPET LINE: a ROW of 14 bombs at fixed spacing (~10% stage) along the floor.
  if (s.phase === "carpet") {
    if (s._bomber) { s._bomber.x = left - 200 + (76 - s.t) / 76 * (span + 400); s._bomber.y = planeY }
    if (s.t % 5 === 0 && s.dropped < 14) {
      const bx = left + s.dropped * (span / 13)
      spawnMunition(fighter, "dumb", { x: bx, y: planeY, vx: 0, vy: 2, damage: 18, target: opp })
      s.dropped++
    }
    if (--s.t <= 0) { s.phase = "hunters"; s.ht = 0; s.hunters = 0; s.volley = 0 }
    return
  }
  // WAVE 2 — HUNTERS: 4 GUIDED bombs that target the opponent, staggered; Oliver's arrow volley starts.
  if (s.phase === "hunters") {
    if (s._bomber) { s._bomber.facing = -1; s._bomber.x = right + 150 - (s.ht / 60) * (span); s._bomber.y = planeY }
    s.ht++
    if (s.ht % 12 === 1 && s.hunters < 4 && opp) {
      spawnMunition(fighter, "guided", { x: (opp.x || 0) + (opp.w || 60) / 2, y: planeY, vx: ((opp.x || 0) < fighter.x ? -4 : 4), vy: 2, damage: 45, target: opp })
      s.hunters++
    }
    if (s.ht % 22 === 0 && s.volley < 2) { _gaArrowstormVolley(fighter, context, opp); s.volley++ }
    if (s.hunters >= 4 && s.ht > 64) { s.phase = "scatter"; s.st = 0; s.clusters = 0 }
    return
  }
  // WAVE 3 — SCATTER: 3 CLUSTER bombs across the stage, hash-offset; arrow volley continues.
  if (s.phase === "scatter") {
    s.st++
    if (s.st % 14 === 1 && s.clusters < 3) {
      const h = hashRandom(seed, frame, fighter.playerNumber * 31 + s.clusters)
      spawnMunition(fighter, "cluster", { x: left + h * span, y: planeY, vx: 0, vy: 2, damage: 30, target: opp })
      s.clusters++
    }
    if (s.st % 26 === 0 && s.volley < 3) { _gaArrowstormVolley(fighter, context, opp); s.volley++ }
    if (s.clusters >= 3 && s.st > 48) { s.phase = "lastlight"; s.lt = 0 }
    return
  }
  // FINALE — "LAST LIGHT": 40 frames of silence + a cyan reticle on the tagged foe, then ONE big bomb.
  if (s.phase === "lastlight") {
    s.lt++
    if (opp) opp._gaLastLightReticle = 10
    if (s.lt === 40 && opp) {
      spawnMunition(fighter, "big", { x: (opp.x || 0) + (opp.w || 60) / 2, y: planeY - 60, vx: 0, vy: 3, damage: 220, target: opp })
      if (typeof sound !== "undefined") sound.play?.("ga_super")
    }
    if (s.lt > 110) {
      fighter._gaArrowstormActive = null
      fighter._gaSuperActive = false
      fighter._gaTechLock = 180          // 3s Tech lockout
      recallDrones(fighter)              // all drones recalled
      fighter.attackCooldown = getAttackDuration(16, fighter)
    }
    return
  }
}
// Oliver's closing explosive-arrow (fired during waves 2 and 3).
function _gaArrowstormVolley(fighter, context, opp) {
  const face = (opp && (opp.x || 0) < fighter.x) ? -1 : (fighter.facing || 1)
  _gaDroneShot(fighter, context, { type: "gaArrowstormArrow", damage: 55, vx: face * 16,
    spawnX: (fighter.x || 0) + face * 40, spawnY: (fighter.y || 0) + 30, w: 22, h: 10, radius: 16,
    lifetime: 90, color: "#ff8a3c", sheet: "./green_arrow_firearrow_uniform.png", spriteFrames: 5 })
  fighter._spriteCastMove = "draw"; fighter._spriteCastTimer = 6
}
