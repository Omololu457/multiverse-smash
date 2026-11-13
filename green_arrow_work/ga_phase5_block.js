
// ═══════════════════════════════════════════════════════════════════════════════
// GREEN ARROW — OLIVER'S MOVESET: trick arrows + bow-slash command normal + synergies
// (feat/green-arrow, Phase 5). Arrows fire on MOTION + attack button (qcf/qcb/dd + L/H/Up)
// via updateGreenArrowCommandCombat (the command-normal interception); a bare button stays the
// normal. Status: ice reuses Superman's _supFrozen (shorter), fire uses the projectile `dot`,
// EMP sets _gaDisabled (gates summons/drones). Tech hit-income (+4 arrow / +2 drone, capped
// +12/s) is granted in tickGreenArrowTimers off the projectile hitFlag. No Math.random/gameRng.
// ═══════════════════════════════════════════════════════════════════════════════

// ── arrow spawn helper (tags hitFlag for Tech income; homing + tagged bonuses) ──
function _gaArrow(fighter, context, o) {
  const opp = _gaOpp(fighter, context)
  const tagged = opp && (opp._gaTagged || 0) > 0
  let dmg = o.damage
  // AEGIS synergy: an arrow that passes through a friendly Aegis becomes "charged" (+15%).
  if (_gaArrowCrossesAegis(fighter, o.spawnX ?? fighter.x, o.spawnY ?? fighter.y, o.vx)) { dmg = Math.round(dmg * 1.15); o.color = "#9fe8ff"; o.charged = true }
  // TAGGED: +10% damage from Oliver's arrows.
  if (tagged) dmg = Math.round(dmg * 1.10)
  const face = fighter.facing || 1
  const md = {
    damage: dmg, w: o.w || 18, h: o.h || 8, radius: o.radius || 9,
    vx: o.vx != null ? o.vx : face * (o.speed || 18), vy: o.vy || 0, speed: o.speed || 18,
    lifetime: o.lifetime || 150, color: o.color || "#c7a24a",
    knockbackX: (o.knockbackX != null ? o.knockbackX : face * 4), knockbackY: o.knockbackY ?? -1,
    hitstun: o.hitstun || 16, piercing: !!o.piercing, piercesMulti: !!o.piercing,
    spawnX: o.spawnX ?? (fighter.x + face * 42), spawnY: o.spawnY ?? (fighter.y + (fighter.h || 100) * 0.42),
    sheet: o.sheet || "./green_arrow_plainarrow.png", spriteFrames: o.spriteFrames || 1,
    isSpecial: true, impact: o.impact || null, dot: o.dot || null,
  }
  // TAGGED: arrows aim at the tagged target (approximates the homing lock-on).
  if (tagged && opp) md.aimAt = { x: (opp.x || 0) + (opp.w || 60) / 2, y: (opp.y || 0) + (opp.h || 100) * 0.4 }
  const p = spawnProjectile(fighter, o.type || "gaArrow", md, context)
  if (p) {
    p.hitFlag = "_gaArrowHit"            // → owner._gaArrowHit on clean hit (Tech income)
    p._gaArrow = o.kind || "plain"
    if (tagged) { p._gaHoming = true; p._gaTarget = opp }   // slight homing toward the tagged foe
    if (o.onHit) p._gaOnHit = o.onHit
  }
  return p
}

// Aegis pass-through test: is a friendly Aegis roughly in front of the shot's path?
function _gaArrowCrossesAegis(fighter, sx, sy, vx) {
  for (const d of getActiveDrones()) {
    if (d.owner !== fighter || d.type !== "aegis" || d.dying) continue
    if (Math.sign((d.x - sx)) === Math.sign(vx || fighter.facing) && Math.abs(d.y - sy) < 90) return true
  }
  return false
}
function _gaOppUnderKestrelFire2(fighter, opp) {
  if (!opp) return false
  for (const d of getActiveDrones()) {
    if (d.owner !== fighter || d.type !== "kestrel" || d.dying) continue
    if (d.data?.sustain && Math.abs((opp.x || 0) - d.x) < 360) return true
  }
  return false
}
function _gaHasBulwark(fighter) { for (const d of getActiveDrones()) if (d.owner === fighter && d.type === "bulwark" && !d.dying) return d; return null }
function _gaHasSkyhook(fighter) { for (const d of getActiveDrones()) if (d.owner === fighter && d.type === "skyhook" && !d.dying) return d; return null }

// ── arrow fire functions ──────────────────────────────────────────────────────
function fireGAPlain(fighter, context, charge = 0) {
  const face = fighter.facing || 1
  const pierce = charge >= 1
  _gaArrow(fighter, context, { kind: "plain", type: "gaPlainArrow", damage: pierce ? 70 : 45,
    speed: 20, piercing: pierce, w: 18 + charge * 2, h: 8, sheet: "./green_arrow_plainarrow.png" })
  fighter._spriteCastMove = "draw"; fighter._spriteCastTimer = 16
  fighter.attackCooldown = getAttackDuration(10, fighter)
  if (typeof sound !== "undefined") sound.play?.("ga_arrow_release")
  return true
}
function fireGAAntiAir(fighter, context) {
  const face = fighter.facing || 1
  _gaArrow(fighter, context, { kind: "antiair", type: "gaAntiAirArrow", damage: 45, speed: 17,
    vx: face * 12, vy: -16, w: 18, h: 8, lifetime: 90, sheet: "./green_arrow_plainarrow.png" })
  fighter._spriteCastMove = "antiair"; fighter._spriteCastTimer = 16
  fighter.attackCooldown = getAttackDuration(12, fighter)
  if (typeof sound !== "undefined") sound.play?.("ga_arrow_release")
  return true
}
function fireGAFire(fighter, context) {
  if (!spendEnergy(fighter, 15)) return false
  const opp = _gaOpp(fighter, context)
  // IGNITION synergy: fire arrow on a foe under Kestrel FIRE2 → +30 burst.
  const ignition = _gaOppUnderKestrelFire2(fighter, opp)
  _gaArrow(fighter, context, { kind: "fire", type: "gaFireArrow", damage: 60 + (ignition ? 30 : 0), speed: 17,
    w: 22, h: 12, color: "#ff7a2a", sheet: "./green_arrow_firearrow_uniform.png", spriteFrames: 5,
    impact: "explosion", dot: { ticks: 6, interval: 20, dmg: 3 } })   // burn 3/20f for 2s
  fighter._spriteCastMove = "firecast"; fighter._spriteCastTimer = 18
  fighter.attackCooldown = getAttackDuration(14, fighter)
  if (typeof sound !== "undefined") sound.play?.("ga_fire_arrow")
  return true
}
function fireGAIce(fighter, context) {
  if ((fighter._gaIceCd || 0) > 0) return false
  if (!spendEnergy(fighter, 20)) return false
  const p = _gaArrow(fighter, context, { kind: "ice", type: "gaIceArrow", damage: 40, speed: 16,
    w: 20, h: 10, color: "#6fd0ff", sheet: "./green_arrow_icearrow_uniform.png", spriteFrames: 5,
    onHit: "freeze" })
  fighter._gaIceCd = 420            // 7s cooldown — can't loop
  fighter._spriteCastMove = "icecast"; fighter._spriteCastTimer = 18
  fighter.attackCooldown = getAttackDuration(14, fighter)
  if (typeof sound !== "undefined") sound.play?.("ga_ice_arrow")
  return true
}
function fireGAExplosive(fighter, context) {
  if (!spendEnergy(fighter, 25)) return false
  const face = fighter.facing || 1
  _gaArrow(fighter, context, { kind: "explosive", type: "gaExplosiveArrow", damage: 80, speed: 13,
    vx: face * 11, vy: -7, w: 20, h: 16, radius: 20, color: "#ff8a3c",
    sheet: "./green_arrow_dive_uniform.png", spriteFrames: 4, impact: "explosion", onHit: "otg" })
  // BULWARK synergy: an explosive near a friendly Bulwark → the turret fires a 3-missile salvo.
  const bulwark = _gaHasBulwark(fighter)
  if (bulwark) bulwark.data.salvo = 3
  fighter._spriteCastMove = "dive"; fighter._spriteCastTimer = 18
  fighter.attackCooldown = getAttackDuration(16, fighter)
  if (typeof sound !== "undefined") sound.play?.("ga_fire_arrow")
  return true
}
function fireGAEmp(fighter, context) {
  if ((fighter._gaEmpCd || 0) > 0) return false
  if (!spendEnergy(fighter, 20)) return false
  _gaArrow(fighter, context, { kind: "emp", type: "gaEmpArrow", damage: 25, speed: 16,
    w: 20, h: 10, color: "#f4f0a0", sheet: "./green_arrow_emparrow_uniform.png", spriteFrames: 5,
    onHit: "emp" })
  fighter._gaEmpCd = 600            // 10s cooldown
  fighter._spriteCastMove = "icecast"; fighter._spriteCastTimer = 18
  if (typeof sound !== "undefined") sound.play?.("ga_emp")
  return true
}
function fireGATrick(fighter, context) {
  if (!spendEnergy(fighter, 20)) return false
  const face = fighter.facing || 1
  for (const vy of [-5, 0, 5]) {    // 3-arrow fan
    _gaArrow(fighter, context, { kind: "trick", type: "gaTrickArrow", damage: 30, speed: 17,
      vx: face * 15, vy, w: 18, h: 8, lifetime: 80, sheet: "./green_arrow_plainarrow.png" })
  }
  fighter._spriteCastMove = "airdraw"; fighter._spriteCastTimer = 14
  if (typeof sound !== "undefined") sound.play?.("ga_arrow_release")
  return true
}
function fireGABowSlash(fighter, context) {
  const face = fighter.facing || 1
  const attack = createAttackFromMove(fighter, "gaBowSlash", {
    damage: 75, startup: 9, active: 4, recovery: 16, hitstun: 20, knockbackX: face * 8, knockbackY: -2,
    rangeX: 120, rangeY: 70,
  })
  setAttackState(fighter, attack, 29)
  fighter.vx = face * 3
  fighter._spriteCastMove = "bowslash"; fighter._spriteCastTimer = 29
  if (typeof sound !== "undefined") sound.play?.("ga_arrow_release")
  return true
}

// (ice-FREEZE + emp-DISABLE are stamped on the victim in combat.js resolveProjectileHitsMulti,
// gated on proj._gaArrow; the Ice-Hook / EMP-recall / tech-drain SYNERGIES are resolved from the
// per-frame tick — tickGreenArrowTimers — where getActiveDrones/recallDrones are in scope.)

// ── COMMAND-COMBAT interception: motion + attack button → arrow; bare button → normal ─────
export function updateGreenArrowCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "green_arrow" || !inputState) return false
  if ((fighter._gaTechLock || 0) > 0 && false) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? true
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  const lightEdge = !!inputState.light && !fighter._gaPrevLight
  const heavyEdge = !!inputState.heavy && !fighter._gaPrevHeavy
  const upEdge = !!inputState.upAttack && !fighter._gaPrevUp
  const prevLight = fighter._gaPrevLight
  fighter._gaPrevLight = !!inputState.light; fighter._gaPrevHeavy = !!inputState.heavy; fighter._gaPrevUp = !!inputState.upAttack

  // CHARGED PLAIN SHOT — qcf+Light starts a charge; hold Light to charge, release to fire (tap = fast 45).
  if (fighter._gaCharging) {
    fighter._spriteCastMove = "aim"; fighter._spriteCastTimer = 4
    fighter._gaChargeT = (fighter._gaChargeT || 0) + 1
    if (!inputState.light) {   // release → fire, charge level by hold frames (>=40f = piercing 70)
      const lvl = fighter._gaChargeT >= 40 ? 1 : 0
      fighter._gaCharging = false; fighter._gaChargeT = 0
      return fireGAPlain(fighter, context, lvl)
    }
    return true   // keep consuming Light while charging
  }

  const dirs = getRelativeDirections(fighter)
  const qcf = endsWithPattern(dirs, ["D", "F"])
  const qcb = endsWithPattern(dirs, ["D", "B"])
  const dd = endsWithPattern(dirs, ["D", "D"])
  const forward = fighter.facing === 1 ? !!inputState.right : !!inputState.left

  if (!canStart) return false

  // AIR: qcf+Heavy = TRICK SHOT (3-arrow fan); plain air normal stays normal.
  if (!grounded) {
    if (qcf && heavyEdge) { inputState.heavy = false; return fireGATrick(fighter, context) }
    return false
  }
  // GROUND trick-arrow motions
  if (qcf && lightEdge)  { inputState.light = false; fighter._gaCharging = true; fighter._gaChargeT = 0; return true }  // plain shot (charge)
  if (qcf && upEdge)     { inputState.upAttack = false; return fireGAAntiAir(fighter, context) }
  if (qcf && heavyEdge)  { inputState.heavy = false; return fireGAFire(fighter, context) }
  if (qcb && lightEdge)  { inputState.light = false; return fireGAIce(fighter, context) }
  if (qcb && heavyEdge)  { inputState.heavy = false; return fireGAEmp(fighter, context) }
  if (dd && heavyEdge)   { inputState.heavy = false; return fireGAExplosive(fighter, context) }
  // BOW SLASH — →+Heavy command normal (neutral heavy stays the straight).
  if (forward && heavyEdge) { inputState.heavy = false; return fireGABowSlash(fighter, context) }
  return false
}
