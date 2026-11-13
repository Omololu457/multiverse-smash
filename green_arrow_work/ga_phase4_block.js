
// ═══════════════════════════════════════════════════════════════════════════════
// GREEN ARROW — DRONE ROSTER + "ARROWSTORM PROTOCOL" SUPER (feat/green-arrow, Phase 4).
// Drone profiles + behaviours registered into the generic drones.js. Behaviours live here
// (not in drones.js) so drones.js stays character-agnostic; they close over spawnProjectile.
// All drone STATE lives in activeDrones (GAME_STATE). No Math.random/gameRng — the generic
// module hashes (seed,frame,slot). Gated on rosterKey "green_arrow"; zero effect on others.
// ═══════════════════════════════════════════════════════════════════════════════
const GA_SCR_W = 1280   // nominal screen width for "% of screen" ranges

function _gaOpp(fighter, context) {
  try { return (context?.getOpponent?.(fighter)) || getTargetResolver(context)(fighter) || null } catch (_) { return null }
}
function _gaFloor(f) { return (f && (f.groundY != null ? f.groundY : (f.y || 0) + (f.h || 100))) }
function _gaTagReticle(opp, frames) { if (opp) { opp._gaTagged = Math.max(opp._gaTagged || 0, frames); opp._gaTagReticle = Math.max(opp._gaTagReticle || 0, frames) } }

// ── DRONE PROFILES ────────────────────────────────────────────────────────────
registerDroneProfile("overwatch", {
  sprites: { idle: { sheet: "./ga_overwatch_idle_sheet.png", frames: 4 }, scan: { sheet: "./ga_overwatch_scan_sheet.png", frames: 8 }, walk: { sheet: "./ga_overwatch_walk_sheet.png", frames: 4 }, walkscan: { sheet: "./ga_overwatch_walkscan_sheet.png", frames: 8 }, death: { sheet: "./ga_overwatch_death_sheet.png", frames: 6 } },
  hp: 70, accel: 1.6, maxH: 11, maxV: 9, drag: 0.86, reverseBrake: 0.7, overspeedDrag: 0.9,
  hoverHeight: 165, bobAmp: 4, leash: 360, behaviour: "recon", cooldownOnDeath: 300,
  techCost: 20, hurtbox: { w: 54, h: 30 }, scale: 2.0, frontFacing: true,
})
registerDroneProfile("bulwark", {
  sprites: { capsule: { sheet: "./ga_bulwark_capsule_sheet.png", frames: 6 }, drop: { sheet: "./ga_bulwark_drop_sheet.png", frames: 6 }, walk: { sheet: "./ga_bulwark_walk_sheet.png", frames: 4 }, walk2: { sheet: "./ga_bulwark_walk2_sheet.png", frames: 4 }, idle: { sheet: "./ga_bulwark_walk2_sheet.png", frames: 4 }, death: { sheet: "./ga_bulwark_drop_sheet.png", frames: 6 } },
  hp: 130, accel: 0.9, maxH: 3.2, maxV: 8, drag: 0.8, reverseBrake: 0.7, overspeedDrag: 0.9,
  hoverHeight: 0, bobAmp: 0, leash: 520, behaviour: "planted", cooldownOnDeath: 360,
  techCost: 25, hurtbox: { w: 46, h: 30 }, scale: 2.0, frontFacing: false,
  lifetime: 720, expireMode: "death",
})
registerDroneProfile("aegis", {
  sprites: { idle: { sheet: "./ga_aegis_idle_sheet.png", frames: 4 }, walk: { sheet: "./ga_aegis_walk_sheet.png", frames: 5 }, death: { sheet: "./ga_aegis_death_sheet.png", frames: 6 } },
  hp: 150, accel: 1.4, maxH: 8, maxV: 8, drag: 0.85, reverseBrake: 0.7, overspeedDrag: 0.9,
  hoverHeight: 70, bobAmp: 2, leash: 220, behaviour: "guard", cooldownOnDeath: 300,
  techCost: 20, hurtbox: { w: 52, h: 40 }, scale: 2.2, frontFacing: true,
  absorbsProjectiles: true, lifetime: 600, expireMode: "retire",
})
registerDroneProfile("kestrel", {
  sprites: { idle: { sheet: "./ga_kestrel_idle_sheet.png", frames: 4 }, forward: { sheet: "./ga_kestrel_forward_sheet.png", frames: 4 }, back: { sheet: "./ga_kestrel_back_sheet.png", frames: 4 }, fire1: { sheet: "./ga_kestrel_fire1_sheet.png", frames: 11 }, fire2: { sheet: "./ga_kestrel_fire2_sheet.png", frames: 11 }, death: { sheet: "./ga_kestrel_death_sheet.png", frames: 9 }, walk: { sheet: "./ga_kestrel_forward_sheet.png", frames: 4 } },
  hp: 90, accel: 1.8, maxH: 13, maxV: 10, drag: 0.88, reverseBrake: 0.7, overspeedDrag: 0.9,
  hoverHeight: 210, bobAmp: 3, leash: 760, behaviour: "strafe", cooldownOnDeath: 330,
  techCost: 30, hurtbox: { w: 60, h: 24 }, scale: 2.2, frontFacing: false,
})
registerDroneProfile("skyhook", {
  sprites: { idle: { sheet: "./ga_skyhook_idle_sheet.png", frames: 4 }, landing: { sheet: "./ga_skyhook_landing_sheet.png", frames: 8 }, walk: { sheet: "./ga_skyhook_walk_sheet.png", frames: 4 }, death: { sheet: "./ga_skyhook_death_sheet.png", frames: 6 } },
  hp: 110, accel: 1.5, maxH: 9, maxV: 10, drag: 0.86, reverseBrake: 0.7, overspeedDrag: 0.9,
  hoverHeight: 190, bobAmp: 3, leash: 420, behaviour: "hook", cooldownOnDeath: 330,
  techCost: 25, hurtbox: { w: 70, h: 46 }, scale: 1.9, frontFacing: true,
})
registerDroneProfile("payload", {
  sprites: { drop: { sheet: "./ga_payload_drop_sheet.png", frames: 6 }, idle: { sheet: "./ga_payload_drop_sheet.png", frames: 6 }, death: { sheet: "./ga_payload_drop_sheet.png", frames: 6 } },
  hp: 999, accel: 2.0, maxH: 14, maxV: 6, drag: 0.95, reverseBrake: 0.7, overspeedDrag: 0.95,
  hoverHeight: 300, bobAmp: 0, leash: 2000, behaviour: "bomber", cooldownOnDeath: 0,
  techCost: 0, hurtbox: { w: 120, h: 40 }, scale: 2.2, frontFacing: false,
  lifetime: 150, expireMode: "retire",
})

// ── a drone-fired projectile (credited to Oliver's side; tagged so Tech hit-income can see it) ──
function _gaDroneShot(owner, context, opts) {
  const p = spawnProjectile(owner, opts.type || "gaDroneShot", {
    damage: opts.damage, w: opts.w || 16, h: opts.h || 10, radius: opts.radius || 9,
    vx: opts.vx, vy: opts.vy || 0, speed: Math.abs(opts.vx) || 8,
    lifetime: opts.lifetime || 70, color: opts.color || "#ffb347",
    knockbackX: opts.knockbackX || 3, knockbackY: opts.knockbackY || -1,
    hitstun: opts.hitstun || 12, spawnX: opts.spawnX, spawnY: opts.spawnY,
    sheet: opts.sheet || null, spriteFrames: opts.spriteFrames || 1,
    isSpecial: true, blockable: true,
  }, context)
  if (p) { p._gaDroneShot = true; p.hitFlag = "_gaDroneHit" }
  return p
}

// ── BEHAVIOURS ──────────────────────────────────────────────────────────────
// recon (Overwatch): hover above+behind; scan every 3s; tag opponent in cone (6s). Never attacks.
registerBehaviour("recon", (d, { frame }) => {
  const o = d.owner; if (!o) return
  const opp = d._opp || (d._opp = d.target)
  d.tx = (o.x || 0) + (-(o.facing || 1)) * 85
  d.ty = _gaFloor(o) - (d.profile.hoverHeight || 160)
  d.data.scanT = (d.data.scanT || 0) + 1
  const inCone = opp && !opp.eliminated && Math.abs((opp.x || 0) - d.x) < 520 && Math.abs((opp.y || 0) - d.y) < 300
  if (d.data.scanT % 180 < 48) {                       // 0.8s scan burst every 3s
    d.anim = inCone ? "walkscan" : "scan"
    if (inCone && d.data.scanT % 180 === 24) _gaTagReticle(opp, 360)   // TAG 6s
  } else {
    d.anim = inCone ? "walk" : "idle"
  }
})

// planted (Bulwark): drop → plant → creep to range → fire a micro-missile every 75f.
registerBehaviour("planted", (d, { frame }) => {
  const o = d.owner, opp = d.target
  d.ty = _gaFloor(o)                                   // on the ground
  if (d.state === "enter") {
    d.anim = d.frameAge < 30 ? "capsule" : "drop"
    d.tx = d.x                                         // stay where it landed
    if (d.frameAge > 60) { d.state = "planted"; d.data.fireT = 0 }
    return
  }
  // creep toward ideal range (~30% screen from the opponent)
  if (opp && !opp.eliminated) {
    const ideal = (opp.x || 0) - Math.sign((opp.x || 0) - d.x) * GA_SCR_W * 0.30
    d.tx = ideal
    d.facing = ((opp.x || 0) < d.x) ? -1 : 1
  } else d.tx = d.x
  d.anim = "walk2"                                     // lowered = firing stance
  d.data.fireT = (d.data.fireT || 0) + 1
  if (d.data.fireT >= 75 && opp && !opp.eliminated) {
    d.data.fireT = 0
    const dir = ((opp.x || 0) < d.x) ? -1 : 1
    _gaDroneShot(o, d._ctx, { type: "gaBulwarkMissile", damage: 22, vx: dir * 10, spawnX: d.x, spawnY: d.y - 6,
      w: 22, h: 10, lifetime: Math.round(GA_SCR_W * 0.30 / 10), knockbackX: dir * 4, color: "#ff7a3c",
      sheet: "./ga_payload_bombs_sheet.png", spriteFrames: 2 })
    if (typeof sound !== "undefined") sound.play?.("ga_bulwark_fire")
  }
})

// guard (Aegis): sit in front of the owner at chest height; absorbs projectiles (collision layer).
registerBehaviour("guard", (d) => {
  const o = d.owner; if (!o) return
  d.tx = (o.x || 0) + (o.facing || 1) * 62
  d.ty = _gaFloor(o) - (d.profile.hoverHeight || 70)
  d.anim = (Math.abs(d.x - d.tx) > 20) ? "walk" : "idle"
})

// strafe (Kestrel): enter from edge → fly toward opponent at ~70% height → 5-shot burst (or
// sustained FIRE2 if d.data.sustain) → pass → turn (back) → return. Leaves after 2 passes.
registerBehaviour("strafe", (d, { frame }) => {
  const o = d.owner, opp = d.target
  if (!opp) { d.anim = "idle"; d.tx = o ? o.x : d.x; return }
  if (d.state === "enter" || d.state === "pass") {
    d.anim = d.data.sustain ? "fire2" : (d.state === "pass" ? "forward" : "fire1")
    d.tx = (opp.x || 0) + (d.data.pass ? ((d.facing) * 420) : 0)
    d.ty = _gaFloor(o) - 215
    d.facing = ((opp.x || 0) < d.x) ? -1 : 1
    // fire while sweeping over the opponent
    d.data.fireT = (d.data.fireT || 0) + 1
    if (Math.abs((opp.x || 0) - d.x) < 360) {
      if (d.data.sustain) {                            // FIRE2 sustained suppression (4/tick, pushback)
        if (d.data.fireT % 6 === 0) { _gaDroneShot(o, d._ctx, { type: "gaKestrelStream", damage: 4, vx: d.facing * 14, vy: 3, spawnX: d.x, spawnY: d.y, w: 18, h: 8, lifetime: 30, knockbackX: d.facing * 2, color: "#5fe0ff" }); if (opp) opp.vx = (opp.vx || 0) + d.facing * 0.6 }
      } else if (d.data.fireT % 7 === 0 && (d.data.shots || 0) < 5) {   // FIRE1 5-shot burst, angled down
        d.data.shots = (d.data.shots || 0) + 1
        _gaDroneShot(o, d._ctx, { type: "gaKestrelShot", damage: 8, vx: d.facing * 13, vy: 4, spawnX: d.x, spawnY: d.y, w: 14, h: 8, lifetime: 40, color: "#ffd166" })
      }
    }
    if (Math.abs((opp.x || 0) - d.x) > 300 && d.frameAge > 30) { d.state = "return"; d.data.pass = (d.data.pass || 0) }
  } else if (d.state === "return") {
    d.anim = "back"
    d.tx = (o.x || 0) - (o.facing || 1) * 300
    d.ty = _gaFloor(o) - 215
    if (Math.abs(d.x - d.tx) < 60) {
      d.data.passes = (d.data.passes || 0) + 1
      if (d.data.passes >= 2) { d._retiring = "expire" }
      else { d.state = "pass"; d.data.shots = 0; d.frameAge = 0; d.data.pass = 1 }
    }
  }
})

// hook (Skyhook): descend over owner; if opponent is under the hook within 1s → HOOK them
// (lift/carry/drop, 90 dmg); else hook OLIVER (grappling escape: yank up, 20 invuln).
registerBehaviour("hook", (d, { frame }) => {
  const o = d.owner, opp = d.target
  if (d.state === "enter") {
    d.anim = "landing"; d.tx = (o.x || 0); d.ty = _gaFloor(o) - (d.profile.hoverHeight || 190)
    if (d.frameAge > 36) { d.state = "seek"; d.data.seekT = 0 }
    return
  }
  if (d.state === "seek") {
    d.anim = "walk"; d.data.seekT++
    if (opp && !opp.eliminated) { d.tx = (opp.x || 0); if (Math.abs((opp.x || 0) - d.x) < 70 && !(opp._gaTagged > 0 ? false : false)) { d.state = "hookEnemy"; d.data.hookT = 0; opp.hitstun = Math.max(opp.hitstun || 0, 60); opp._gaHooked = true } }
    if (d.data.seekT > 60) { d.state = "hookSelf"; d.data.hookT = 0; if (o) { o.invulnTimer = Math.max(o.invulnTimer || 0, 20); o.vy = -14 } }
    return
  }
  if (d.state === "hookEnemy") {
    d.anim = "walk"; d.data.hookT++
    if (opp) {
      opp._gaHooked = true
      if (d.data.hookT <= 40) { opp.y = (d.y) + 20; opp.vy = 0; opp.vx = 0; opp.hitstun = Math.max(opp.hitstun || 0, 6) }  // lift
      else if (d.data.hookT <= 70) { const corner = (o.x || 0) - (o.facing || 1) * 400; opp.x += Math.sign(corner - opp.x) * 6; opp.y = d.y + 20; opp.hitstun = Math.max(opp.hitstun || 0, 6) }  // carry toward corner
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

// bomber (Payload, Super only): fly across the full screen at ~85% height, drop 6 bombs.
registerBehaviour("bomber", (d, { frame }) => {
  const o = d.owner
  d.anim = "drop"
  d.ty = (_gaFloor(o) - 360)
  d.tx = d.x + d.facing * 600
  d.data.dropT = (d.data.dropT || 0) + 1
  if (d.data.dropT % 22 === 0 && (d.data.bombs || 0) < 6) {
    d.data.bombs = (d.data.bombs || 0) + 1
    _gaDroneShot(o, d._ctx, { type: "gaPayloadBomb", damage: 35, vx: d.facing * 2, vy: 7, spawnX: d.x, spawnY: d.y + 20,
      w: 16, h: 16, radius: 20, lifetime: 80, knockbackY: -6, color: "#ff6a2a",
      sheet: "./ga_payload_bombs_sheet.png", spriteFrames: 6, impact: "explosion" })
  }
})

// ── SPECIAL dispatch: drones by held direction; double-tap Special = recall; doubleQcf = Super ──
const GA_DRONE_BY_DIR = { U: "skyhook", F: "kestrel", B: "aegis", D: "bulwark", null: "overwatch" }

export function greenArrowRecallDrones(fighter) { recallDrones(fighter); if (typeof sound !== "undefined") sound.play?.("ga_recall") }

export function executeGreenArrowSpecial(fighter, context) {
  if ((fighter.rosterKey || "").toLowerCase() !== "green_arrow") return false
  if (fighter._gaArrowstormActive || (fighter._gaTechLock || 0) > 0) return false
  // Super on ↓↘→↓↘→+Special (full meter)
  const dirs = getRelativeDirections(fighter)
  if ((fighter.energy || 0) >= 100 && endsWithPattern(dirs, ["D", "F", "D", "F"])) {
    return executeGreenArrowUltimate(fighter, context)
  }
  // double-tap Special → recall all drones
  const now = (context?.frame != null) ? context.frame : 0
  if (fighter._gaLastSpecialFrame != null && (now - fighter._gaLastSpecialFrame) <= 14 && countDrones(fighter) > 0) {
    fighter._gaLastSpecialFrame = now
    greenArrowRecallDrones(fighter); return true
  }
  fighter._gaLastSpecialFrame = now
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
}

// ── SUPER: ARROWSTORM PROTOCOL ──────────────────────────────────────────────
const GA_ULT = { cost: 100, bombDmg: 35, volleyDmg: 45 }
export function executeGreenArrowUltimate(fighter, context) {
  if ((fighter.rosterKey || "").toLowerCase() !== "green_arrow") return false
  if (fighter._gaArrowstormActive || (fighter._gaTechLock || 0) > 0) return false
  if (!spendEnergy(fighter, GA_ULT.cost)) return false
  fighter.vx = 0
  fighter._gaSuperActive = true
  fighter._gaArrowstormActive = { phase: "startup", t: 20, volley: 0, volleyT: 0 }
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 24)
  fighter._spriteCastMove = "skyward"; fighter._spriteCastTimer = 20
  fighter._gaBadgeFlash = 40
  if (typeof sound !== "undefined") sound.play?.("ga_super")
  return true
}

export function applyGreenArrowArrowstorm(fighter, context) {
  const s = fighter && fighter._gaArrowstormActive
  if (!s) return
  if ((fighter.rosterKey || "").toLowerCase() !== "green_arrow") return
  const opp = _gaOpp(fighter, context)
  fighter.vx = 0
  if (s.phase === "startup") {
    fighter._spriteCastMove = "skyward"; fighter._spriteCastTimer = 4
    fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 2)
    if (--s.t <= 0) {
      // 2. every live drone fires at once
      for (const d of getActiveDrones()) {
        if (d.owner !== fighter || d.dying) continue
        d._ctx = context; d.target = opp
        if (d.type === "aegis" && opp) applyScaledDamage(opp, 40, { source: "ability", attacker: fighter, move: "aegisRam" })
        if (d.type === "kestrel") d.data.sustain = true
        if (d.type === "overwatch") _gaTagReticle(opp, 300)
        if (d.type === "bulwark") d.data.fireT = 75   // force an immediate salvo
      }
      // 3. Payload bomber flyover
      const face = fighter.facing || 1
      const bomber = spawnDrone(fighter, "payload", { frame: context?.frame || 0, target: opp, spendTech: () => true })
      if (bomber) { bomber._ctx = context; bomber.x = (fighter.x || 0) - face * 640; bomber.facing = face }
      s.phase = "volley"; s.t = 90; s.volleyT = 0
    }
    return
  }
  if (s.phase === "volley") {
    fighter._spriteCastMove = "draw"; fighter._spriteCastTimer = 4
    // 4. closing explosive-arrow volley: 3 arrows
    s.volleyT++
    if (s.volleyT % 18 === 0 && s.volley < 3) {
      s.volley++
      const face = fighter.facing || 1
      _gaDroneShot(fighter, context, { type: "gaArrowstormArrow", damage: GA_ULT.volleyDmg, vx: face * 16,
        spawnX: (fighter.x || 0) + face * 40, spawnY: (fighter.y || 0) + 30, w: 22, h: 10, radius: 16,
        lifetime: 90, color: "#ff8a3c", sheet: "./green_arrow_firearrow_uniform.png", spriteFrames: 5, impact: "explosion" })
    }
    if (--s.t <= 0 && s.volley >= 3) {
      fighter._gaArrowstormActive = null
      fighter._gaSuperActive = false
      fighter._gaTechLock = 180          // 3s Tech lockout
      recallDrones(fighter)              // all drones recalled
      fighter.attackCooldown = getAttackDuration(16, fighter)
    }
    return
  }
}

// tick the Tech lockout (called from regen path indirectly via per-frame apply)
export function tickGreenArrowTimers(fighter) {
  if ((fighter.rosterKey || "").toLowerCase() !== "green_arrow") return
  if ((fighter._gaTechLock || 0) > 0) fighter._gaTechLock--
  if ((fighter._gaTagReticle || 0) > 0) fighter._gaTagReticle--
}
