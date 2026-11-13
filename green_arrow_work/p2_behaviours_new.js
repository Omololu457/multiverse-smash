// ── BEHAVIOURS (PASS2 P2: PROTECTOR default + STRIKE mode) ───────────────────
// Input: Special+dir = PROTECTOR; Heavy-held+Special+dir = STRIKE (+5 Tech); ↑↑ = Payload Carpet
// Run; ↓↓ = Swarm. d.mode is sim state set at spawn. Strike drones are hittable BEFORE impact — a
// drone killed in flight plays DEATH only (its contact-damage lives in the behaviour, which does not
// run once dying). No Math.random. Explosions/rings are render-only (visualOnly projectile + flashes).
function _gaExplosionFx(owner, x, y, scale, context) {
  return spawnProjectile(owner, "gaBlast", { damage: 0, visualOnly: true, w: 48 * scale, h: 48 * scale,
    radius: 24 * scale, spawnX: x, spawnY: y, vx: 0, vy: 0, lifetime: 24,
    sheet: "./green_arrow_explosion_uniform.png", spriteFrames: 4, spriteOnce: true, spriteScale: scale, color: "#ff8a3c" }, context)
}
function _gaHitsOpp(d, opp, pad = 0) {
  if (!opp || opp.eliminated) return false
  const ocx = (opp.x || 0) + (opp.w || 60) / 2, ocy = (opp.y || 0) + (opp.h || 100) / 2
  return Math.abs(ocx - d.x) < ((opp.w || 60) / 2 + (d.profile.hurtbox?.w || 40) / 2 + pad)
      && Math.abs(ocy - d.y) < ((opp.h || 100) / 2 + 36)
}
function _gaDie(d) {
  d.dying = true; d.anim = "death"; d.frame = 0; d.animTimer = 0
  d.deathTimer = (d.profile.sprites?.death?.frames || 6) * 5 + 6
  if (typeof sound !== "undefined") sound.play?.("ga_drone_death")
}

// OVERWATCH ───────────────────────────────────────────────────────────────────
registerBehaviour("recon", (d, { frame }) => {
  const o = d.owner; if (!o) return
  const opp = d._opp || (d._opp = d.target)
  if (d.mode === "strike") return _gaStunDrone(d, o, opp)       // STRIKE "Stun Drone"
  // PROTECTOR "Sentinel": tag + EARLY WARNING auto-guard
  d.tx = (o.x || 0) + (-(o.facing || 1)) * 85
  d.ty = _gaFloor(o) - (d.profile.hoverHeight || 160)
  d.data.scanT = (d.data.scanT || 0) + 1
  const inCone = opp && !opp.eliminated && Math.abs((opp.x || 0) - d.x) < 520 && Math.abs((opp.y || 0) - d.y) < 300
  if (d.data.scanT % 180 < 48) { d.anim = inCone ? "walkscan" : "scan"; if (inCone && d.data.scanT % 180 === 24) _gaTagReticle(opp, 360) }
  else d.anim = inCone ? "walk" : "idle"
  if (d.data.warnCd > 0) d.data.warnCd--
  const oppAtk = opp && opp.attacking && !d.data.oppWasAtk
  d.data.oppWasAtk = !!(opp && opp.attacking)
  if (oppAtk && (d.data.warnCd || 0) <= 0 && opp && Math.abs((opp.x || 0) - (o.x || 0)) < GA_SCR_W * 0.30) {
    d.data.warnCd = 360                 // 6s cooldown, once-per-summon-style
    o.invulnTimer = Math.max(o.invulnTimer || 0, 18)   // free AUTO-GUARD (brief i-frames)
    o._gaGuardPing = 16; d._pingFx = 16
    if (typeof sound !== "undefined") sound.play?.("ga_overwatch_tag")
  }
})
function _gaStunDrone(d, o, opp) {
  d.anim = "walk"
  if (!opp || opp.eliminated) { d.tx = o.x; d.ty = _gaFloor(o) - 120; return }
  d.tx = (opp.x || 0) + (opp.w || 60) / 2; d.ty = (opp.y || 0) + (opp.h || 100) * 0.4
  if (_gaHitsOpp(d, opp, 10)) {
    applyScaledDamage(opp, 30, { source: "ability", attacker: o, move: "stunDrone" })
    opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = 0; opp._gaStunRing = 20   // 0.5s shock stun
    _gaExplosionFx(o, d.x, d.y, 0.7, d._ctx); _gaDie(d)
  }
}

// BULWARK ──────────────────────────────────────────────────────────────────────
registerBehaviour("planted", (d, { frame }) => {
  const o = d.owner, opp = d.target
  if (d.mode === "strike") return _gaMine(d, o, opp)           // STRIKE "Mine"
  d.ty = _gaFloor(o)
  if (d.state === "enter") { d.anim = d.frameAge < 30 ? "capsule" : "drop"; d.tx = d.x; if (d.frameAge > 60) { d.state = "planted"; d.data.fireT = 0 }; return }
  // PROTECTOR "Bodyguard": plant BETWEEN Oliver and the opponent; fire point-blank within 20% of Oliver.
  if (opp && !opp.eliminated) {
    d.tx = (o.x || 0) + Math.sign((opp.x || 0) - (o.x || 0)) * GA_SCR_W * 0.14   // just in front of Oliver (never on him)
    d.facing = ((opp.x || 0) < d.x) ? -1 : 1
    d.data.fireT = (d.data.fireT || 0) + 1
    if (Math.abs((opp.x || 0) - (o.x || 0)) < GA_SCR_W * 0.20 && d.data.fireT >= 45) {
      d.data.fireT = 0; const dir = ((opp.x || 0) < d.x) ? -1 : 1
      _gaDroneShot(o, d._ctx, { type: "gaBulwarkMissile", damage: 18, vx: dir * 11, spawnX: d.x, spawnY: d.y - 6, w: 20, h: 10, lifetime: Math.round(GA_SCR_W * 0.22 / 11), knockbackX: dir * 3, color: "#ff7a3c", sheet: "./ga_payload_bombs_sheet.png", spriteFrames: 2 })
      if (typeof sound !== "undefined") sound.play?.("ga_bulwark_fire")
    }
  } else d.tx = d.x
  d.anim = "walk2"
})
function _gaMine(d, o, opp) {
  d.ty = _gaFloor(o)
  if (d.state === "enter") {
    d.tx = (o.x || 0) + Math.sign(((opp && opp.x) || (o.x || 0) + 1) - (o.x || 0)) * GA_SCR_W * 0.11   // lob in front of Oliver
    d.anim = d.frameAge < 36 ? "capsule" : "drop"; if (d.frameAge > 48) d.state = "armed"; return
  }
  d.tx = d.x; d.anim = "walk2"
  if (opp && !opp.eliminated && Math.abs((opp.x || 0) - d.x) < GA_SCR_W * 0.12 && Math.abs((opp.y || 0) - d.y) < 130) {
    applyScaledDamage(opp, 70, { source: "ability", attacker: o, move: "bulwarkMine" })
    opp.vy = -16; opp.isLaunched = true; opp.hitstun = Math.max(opp.hitstun || 0, 28)
    _gaExplosionFx(o, d.x, d.y, 1.1, d._ctx); _gaDie(d)
  }
}

// AEGIS ─────────────────────────────────────────────────────────────────────────
registerBehaviour("guard", (d) => {
  const o = d.owner; if (!o) return
  if (d.mode === "strike") return _gaShieldBash(d, o, d.target)  // STRIKE "Shield Bash"
  // PROTECTOR "Guardian": absorb projectiles (collision) + intercept ONE melee hit for Oliver.
  d.tx = (o.x || 0) + (o.facing || 1) * 62
  d.ty = _gaFloor(o) - (d.profile.hoverHeight || 70)
  d.anim = (Math.abs(d.x - d.tx) > 20) ? "walk" : "idle"
  const opp = d.target
  if (!d.data.usedIntercept && opp && opp.attacking && opp.currentAttack && !opp.currentAttack._gaIntercepted
      && Math.abs((opp.x || 0) - (o.x || 0)) < 115 && (o.invulnTimer || 0) <= 0) {
    d.data.usedIntercept = true; opp.currentAttack._gaIntercepted = true
    o.invulnTimer = Math.max(o.invulnTimer || 0, 16)            // the melee hit is negated
    o.vx = -(o.facing || 1) * 6                                  // Oliver pushed back
    d.hp -= 40; d._hitFlash = 8; d._shieldFlash = 14            // drone loses HP + shield flash
    if (d.hp <= 0) _gaDie(d)
    if (typeof sound !== "undefined") sound.play?.("ga_drone_deploy")
  }
})
function _gaShieldBash(d, o, opp) {
  d.anim = "walk"
  if (!opp || opp.eliminated) { d.tx = o.x; d.ty = _gaFloor(o) - 70; return }
  d.tx = (opp.x || 0) + (opp.w || 60) / 2; d.ty = (opp.y || 0) + (opp.h || 100) * 0.4
  if (_gaHitsOpp(d, opp, 10) && !d.data.bashed) {
    d.data.bashed = true
    applyScaledDamage(opp, 40, { source: "ability", attacker: o, move: "shieldBash" })
    opp.vx = ((opp.x || 0) < d.x ? -1 : 1) * 10; opp.hitstun = Math.max(opp.hitstun || 0, 18)
    d.hp = Math.max(1, Math.round(d.hp * 0.5)); d._shieldFlash = 14; d.mode = "protector"   // survives → reverts to Guardian
    if (typeof sound !== "undefined") sound.play?.("ga_drone_deploy")
  }
}

// KESTREL ────────────────────────────────────────────────────────────────────────
registerBehaviour("strafe", (d, { frame }) => {
  const o = d.owner, opp = d.target
  if (d.mode === "strike") return _gaKamikaze(d, o, opp)        // STRIKE "Kamikaze"
  // PROTECTOR "Escort": hover above Oliver; suppression burst when he is in trouble or the foe is near.
  d.tx = (o.x || 0); d.ty = _gaFloor(o) - (d.profile.hoverHeight || 210); d.anim = "idle"
  if (d.data.burstCd > 0) d.data.burstCd--
  const trouble = (o.hitstun || 0) > 0 || (o.blockstun || 0) > 0 || (opp && !opp.eliminated && Math.abs((opp.x || 0) - (o.x || 0)) < GA_SCR_W * 0.20)
  if (trouble && (d.data.burstCd || 0) <= 0 && opp && !opp.eliminated) { d.data.burstCd = 90; d.data.firing = 5; d.data.ftick = 0 }
  if ((d.data.firing || 0) > 0) {
    d.anim = "fire1"; d.data.ftick = (d.data.ftick || 0) + 1
    if (d.data.ftick % 4 === 0) {
      d.data.firing--; const dir = opp ? ((opp.x || 0) < d.x ? -1 : 1) : (o.facing || 1)
      d.facing = dir
      _gaDroneShot(o, d._ctx, { type: "gaKestrelShot", damage: 8, vx: dir * 13, vy: 4, spawnX: d.x, spawnY: d.y, w: 14, h: 8, lifetime: 40, color: "#ffd166" })
      if (typeof sound !== "undefined" && d.data.ftick % 8 === 0) sound.play?.("ga_kestrel")
    }
  }
})
function _gaKamikaze(d, o, opp) {
  d.anim = "forward"
  if (!opp || opp.eliminated) { d.ty = _gaFloor(o); d.tx = d.x + (d.facing || 1) * 60; if (d.y >= _gaFloor(o) - 8) _gaKamiBlast(d, o); return }
  d.tx = (opp.x || 0) + (opp.w || 60) / 2; d.ty = (opp.y || 0) + (opp.h || 100) * 0.4
  d.facing = ((opp.x || 0) < d.x) ? -1 : 1
  if (_gaHitsOpp(d, opp, 10)) {
    applyScaledDamage(opp, 90, { source: "ability", attacker: o, move: "kamikaze" })
    opp.hitstun = Math.max(opp.hitstun || 0, 26); opp.vx = ((opp.x || 0) < d.x ? -1 : 1) * 8
    _gaKamiBlast(d, o)
  } else if (d.y >= _gaFloor(o) - 8) _gaKamiBlast(d, o)          // ground impact on a miss (no fighter damage)
}
function _gaKamiBlast(d, o) {
  _gaExplosionFx(o, d.x, d.y, 1.2, d._ctx)
  if (o) { o._gaDroneCd = o._gaDroneCd || {}; o._gaDroneCd["kestrel"] = d.profile.cooldownOnDeath || 330 }
  _gaDie(d)
}

// SKYHOOK ────────────────────────────────────────────────────────────────────────
registerBehaviour("hook", (d, { frame }) => {
  const o = d.owner, opp = d.target
  if (d.mode === "protector") return _gaRescue(d, o)           // PROTECTOR "Rescue"
  // STRIKE "Tow": the original hook grab on the opponent (unchanged).
  if (d.state === "enter") {
    d.anim = "landing"; d.tx = (o.x || 0); d.ty = _gaFloor(o) - (d.profile.hoverHeight || 190)
    if (d.frameAge > 36) { d.state = "seek"; d.data.seekT = 0 }
    return
  }
  if (d.state === "seek") {
    d.anim = "walk"; d.data.seekT++
    if (opp && !opp.eliminated) { d.tx = (opp.x || 0); if (Math.abs((opp.x || 0) - d.x) < 70) { d.state = "hookEnemy"; d.data.hookT = 0; opp.hitstun = Math.max(opp.hitstun || 0, 60); opp._gaHooked = true } }
    if (d.data.seekT > 60) { d.state = "hookSelf"; d.data.hookT = 0; if (o) { o.invulnTimer = Math.max(o.invulnTimer || 0, 20); o.vy = -14 } }
    return
  }
  if (d.state === "hookEnemy") {
    d.anim = "walk"; d.data.hookT++
    if (opp) {
      opp._gaHooked = true
      if (d.data.hookT <= 40) { opp.y = (d.y) + 20; opp.vy = 0; opp.vx = 0; opp.hitstun = Math.max(opp.hitstun || 0, 6) }
      else if (d.data.hookT <= 70) { const corner = (o.x || 0) - (o.facing || 1) * 400; opp.x += Math.sign(corner - opp.x) * 6; opp.y = d.y + 20; opp.hitstun = Math.max(opp.hitstun || 0, 6) }
      else { opp._gaHooked = false; opp.vy = 10; applyScaledDamage(opp, 90, { source: "ability", attacker: o, move: "skyhookDrop" }); opp.isLaunched = true; opp.hitstun = Math.max(opp.hitstun || 0, 24); d._retiring = "expire" }
    } else d._retiring = "expire"
    d.tx = d.x; d.ty = d.y
    return
  }
  if (d.state === "hookSelf") {
    d.anim = "walk"; d.data.hookT++
    if (o) { d.tx = o.x; d.ty = _gaFloor(o) - 230 }
    if (d.data.hookT > 20) d._retiring = "expire"
  }
})
function _gaRescue(d, o) {
  d.anim = "idle"; d.tx = (o.x || 0); d.ty = _gaFloor(o) - (d.profile.hoverHeight || 190)
  if (!d.data.rescued && o && (o.isLaunched || (o.hitstun || 0) > 12 || o.knockdownState)) {
    d.data.rescued = true
    o.isLaunched = false; o.hitstun = 0; o.knockdownState = false; o.knockdownTimer = 0
    o.vy = -6; o.vx = 0; o.invulnTimer = Math.max(o.invulnTimer || 0, 20); o._gaAirRecover = 14
    d._retiring = "expire"                   // consumed after the catch
    if (typeof sound !== "undefined") sound.play?.("ga_recall")
  }
}

// PAYLOAD ────────────────────────────────────────────────────────────────────────
registerBehaviour("bomber", (d, { frame }) => {
  const o = d.owner
  d.anim = "drop"; d.ty = (_gaFloor(o) - 360); d.tx = d.x + d.facing * 600
  const maxB = d.maxBombs || 6, spacing = d.bombSpacing || 22
  d.data.dropT = (d.data.dropT || 0) + 1
  if (d.data.dropT % spacing === 0 && (d.data.bombs || 0) < maxB) {
    d.data.bombs = (d.data.bombs || 0) + 1
    _gaDroneShot(o, d._ctx, { type: "gaPayloadBomb", damage: d.bombDmg || 35, vx: d.facing * 2, vy: 7, spawnX: d.x, spawnY: d.y + 20, w: 16, h: 16, radius: 20, lifetime: 80, knockbackY: -6, color: "#ff6a2a", sheet: "./ga_payload_bombs_sheet.png", spriteFrames: 6, impact: "explosion" })
  }
})

// SWARM (4 mini-Overwatch scouts, one slot) ───────────────────────────────────────
registerBehaviour("swarm", (d, { frame }) => {
  const o = d.owner, opp = d.target
  if (d.data.scouts == null) d.data.scouts = Math.max(1, Math.round(d.hp / 20))
  d.data.scouts = Math.max(0, Math.round(d.hp / 20))           // HP (80) → 4 scouts; absorbing a hit loses one
  if (d.mode === "strike") {                                   // STRIKE: 4 rammers
    d.anim = "idle"
    if (!opp || opp.eliminated) { d.tx = o.x; d.ty = _gaFloor(o) - 150; return }
    d.tx = (opp.x || 0) + (opp.w || 60) / 2; d.ty = (opp.y || 0) + (opp.h || 100) * 0.4
    d.data.rushTick = (d.data.rushTick || 0) + 1
    if (_gaHitsOpp(d, opp, 30) && d.data.scouts > 0 && d.data.rushTick % 9 === 0) {
      d.hp = Math.max(0, d.hp - 20)                            // a scout rams + explodes
      applyScaledDamage(opp, 20, { source: "ability", attacker: o, move: "swarmRam" })
      opp.hitstun = Math.max(opp.hitstun || 0, 10)
      _gaExplosionFx(o, d.x + ((d.data.scouts % 2) ? 20 : -20), d.y, 0.5, d._ctx)
      if (d.hp <= 0) _gaDie(d)
    }
  } else {                                                     // PROTECTOR: orbit Oliver as a shield bubble, 5s
    d.anim = "idle"; d.tx = (o.x || 0); d.ty = _gaFloor(o) - 120
    d.data.life = (d.data.life == null ? 300 : d.data.life - 1)
    if (d.data.life <= 0 || d.data.scouts <= 0) d._retiring = "expire"
  }
})

registerDroneProfile("swarm", {
  sprites: { idle: { sheet: "./ga_overwatch_idle_sheet.png", frames: 4 }, scan: { sheet: "./ga_overwatch_scan_sheet.png", frames: 8 }, death: { sheet: "./ga_overwatch_death_sheet.png", frames: 6 } },
  hp: 80, accel: 1.8, maxH: 12, maxV: 10, drag: 0.86, reverseBrake: 0.7, overspeedDrag: 0.9,
  hoverHeight: 120, bobAmp: 3, leash: 420, behaviour: "swarm", cooldownOnDeath: 360,
  techCost: 40, hurtbox: { w: 90, h: 70 }, scale: 1.0, frontFacing: true, nativeFacing: "front",
  swarm: true,
})

