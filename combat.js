/**
 * COMBAT ENGINE — merged clean version
 * Features:
 * - hitstop scaling
 * - parry
 * - clash
 * - grab / throw
 * - super armor flashes
 * - chip damage
 * - wall bounce flag
 * - damage number emission
 * - projectile hit resolution
 */

import { physics } from "./physics.js"
import { sound, SFX } from "./sound.js"

// ========================
// HITSTOP TABLES
// ========================

const HITSTOP = {
  light: 4,
  air: 4,
  grab: 6,
  heavy: 8,
  launcher: 8,
  spike: 8,
  special: 12,
  ultimate: 20,
  parry: 14,
  clash: 14,
  default: 4
}

// ========================
// HELPERS
// ========================

function _catFromName(n) {
  n = (n || "").toLowerCase()
  if (n === "light" || n === "air") return "light"
  if (n === "heavy") return "heavy"
  if (n === "up" || n.includes("launch")) return "launcher"
  if (n === "down_air" || n.includes("spike")) return "spike"
  if (n === "grab") return "grab"
  return "light"
}

function _dur(base, fighter) {
  return Math.max(8, Math.floor(base / (fighter?.attackSpeedMultiplier || 1)))
}

function _getMD(fighter, key) {
  const b = fighter?.basic_attacks || {}
  switch (key) {
    case "light": return b.light || null
    case "heavy": return b.heavy || null
    case "up": return b.upAttack || b.up || null
    case "air": return b.airAttack || b.air || null
    case "down_air": return b.downAir || b.down_air || null
    case "grab": return b.grab || { damage: 30, hitstun: 18, throwForceX: 5, throwForceY: -4 }
    default: return b[key] || fighter?.specials?.[key] || { damage: 40, hitstun: 20 }
  }
}

function _hitSound(atk, blocking) {
  if (blocking) return SFX?.BLOCK || "block"
  if (!atk) return SFX?.HIT_LIGHT || "hit_light"
  if (atk.isUltimate) return SFX?.HIT_ULTIMATE || "hit_ultimate"
  if (atk.isSpecial) return SFX?.HIT_SPECIAL || "hit_special"

  const c = atk.category || _catFromName(atk.name)
  if (c === "heavy" || c === "launcher" || c === "spike") {
    return SFX?.HIT_HEAVY || "hit_heavy"
  }
  return SFX?.HIT_LIGHT || "hit_light"
}

// ========================
// STATE INIT
// ========================

export function ensureCombatState(fighter) {
  if (!fighter) return

  const D = {
    attacking: false,
    currentMove: null,
    currentMoveData: null,
    currentAttack: null,
    moveTimer: 0,
    movePhase: "idle",
    hasHitThisMove: false,
    attackCooldown: 0,
    hitstun: 0,
    blockstun: 0,
    hitstop: 0,
    isGrabbed: false,
    invulnTimer: 0,
    comboCounter: 0,
    comboTimer: 0,
    airHits: 0,
    maxAirHits: 3,
    colorFlash: 0,
    attackMultiplier: 1,
    damageMultiplier: 1,
    defenseMultiplier: 1,
    energy: 0,
    maxEnergy: 100,
    wasInStartup: false,
    grabTimer: 0,
    grabInputBuffer: 0,
    knockdownState: false,
    knockdownTimer: 0,
    techRoll: null,
    wallBounce: false,
    parryFlash: 0,
    armorFlash: 0,
    clashFlash: 0,
    _parryInputBuffer: 0
  }

  for (const k in D) {
    if (fighter[k] == null) fighter[k] = D[k]
  }
}

// ========================
// COMBO SCALE
// ========================

export function getComboScale(fighter) {
  if (!fighter || fighter.comboCounter <= 1) return 1
  const s = [1, 0.92, 0.84, 0.76, 0.70, 0.65]
  return s[Math.min(fighter.comboCounter - 1, s.length - 1)]
}

// ========================
// ATTACK PHASE
// ========================

export function getHitstopFrames(atk) {
  if (!atk) return HITSTOP.default
  if (atk.isUltimate) return HITSTOP.ultimate
  if (atk.isSpecial) return HITSTOP.special

  const c = atk.category || _catFromName(atk.name)
  return HITSTOP[c] ?? HITSTOP.default
}

export function getSparkCategory(atk) {
  if (!atk) return "light"
  if (atk.isUltimate) return "ultimate"
  if (atk.isSpecial) return "special"

  const c = atk.category || _catFromName(atk.name)
  if (c === "heavy" || c === "launcher" || c === "spike") return "heavy"
  return "light"
}

export function attackIsActive(attack) {
  if (!attack) return false
  const e = attack.total - attack.timer
  return e >= attack.activeStart && e <= attack.activeEnd
}

export function getAttackPhase(fighter) {
  if (!fighter?.currentAttack) return "idle"
  const a = fighter.currentAttack
  const e = a.total - a.timer
  if (e < a.activeStart) return "startup"
  if (e <= a.activeEnd) return "active"
  return "recovery"
}

// ========================
// HITBOX / HURTBOX
// ========================

export function getAttackHitbox(fighter) {
  const a = fighter?.currentAttack
  if (!fighter || !a) return null

  const w = a.rangeX || 50
  const h = a.rangeY || 40
  const x = fighter.facing === 1 ? fighter.x + fighter.w : fighter.x - w
  let y = fighter.y + 20

  if (a.name === "up") y = fighter.y - 30
  if (a.name === "down_air") y = fighter.y + 30

  return { x, y, w, h }
}

export function getHurtbox(fighter) {
  if (!fighter) return null
  return {
    x: fighter.x + 6,
    y: fighter.y + 6,
    w: Math.max(1, fighter.w - 12),
    h: Math.max(1, fighter.h - 6)
  }
}

export function rectsOverlap(a, b) {
  return !!a && !!b &&
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
}

// ========================
// SPECIAL TRAITS
// ========================

export function shouldGojoAutoDodge(defender) {
  if (!defender?.currentFormData?.autoDodge) return false
  const c = defender.currentFormData.autoDodgeKiCost || 5
  if ((defender.energy || 0) < c) return false
  defender.energy -= c
  defender.teleportFlash = 8
  return true
}

export function applyUltraEgoReaction(defender) {
  if (!defender?.currentFormData?.rageHealOnHit) return
  const c = defender.currentFormData.healCostPerHitKi || 4
  if ((defender.energy || 0) < c) return
  defender.energy -= c
  defender.health = Math.min(
    defender.maxHealth || 1000,
    defender.health + defender.currentFormData.rageHealOnHit
  )
}

// ========================
// PARRY / CLASH / GRAB
// ========================

export function checkParry(defender, attacker, hitSparks) {
  if (!defender || !attacker || !attacker.currentAttack) return false
  if (getAttackPhase(attacker) !== "startup") return false
  if (attacker.currentAttack.timer > 5) return false
  if (!(defender._parryInputBuffer > 0)) return false

  attacker.hitstun = 28
  attacker.vx = -attacker.facing * 6
  attacker.attacking = false
  attacker.currentAttack = null

  defender.parryFlash = 12
  defender.invulnTimer = 10
  defender.attackCooldown = 0

  const mx = ((attacker.x + attacker.w / 2) + (defender.x + defender.w / 2)) / 2
  const my = ((attacker.y + attacker.h / 2) + (defender.y + defender.h / 2)) / 2

  if (Array.isArray(hitSparks)) {
    hitSparks.push({
      x: mx,
      y: my,
      timer: 20,
      maxTimer: 20,
      category: "parry",
      color: "#38bdf8",
      lines: 12,
      radius: 32
    })
  }

  try { sound?.play?.(SFX?.COUNTER_HIT) } catch (_) {}
  return true
}

export function checkClash(p1, p2, hitSparks, camera) {
  if (!p1 || !p2) return false
  if (!attackIsActive(p1.currentAttack) || !attackIsActive(p2.currentAttack)) return false

  const h1 = getAttackHitbox(p1)
  const h2 = getAttackHitbox(p2)
  if (!rectsOverlap(h1, h2)) return false

  const c1 = p1.currentAttack.isUltimate ? "ultimate"
    : p1.currentAttack.isSpecial ? "special"
    : (p1.currentAttack.category || "light")

  const c2 = p2.currentAttack.isUltimate ? "ultimate"
    : p2.currentAttack.isSpecial ? "special"
    : (p2.currentAttack.category || "light")

  const s1 = c1 === "special" || c1 === "ultimate"
  const s2 = c2 === "special" || c2 === "ultimate"

  const hs = HITSTOP.clash

  if (s1 && !s2) {
    p2.hitstun = 14
    p2.vx = -p2.facing * 4
    p2.hitstop = hs
    p2.attacking = false
    p2.currentAttack = null
    p2.clashFlash = 10
  } else if (s2 && !s1) {
    p1.hitstun = 14
    p1.vx = -p1.facing * 4
    p1.hitstop = hs
    p1.attacking = false
    p1.currentAttack = null
    p1.clashFlash = 10
  } else {
    for (const f of [p1, p2]) {
      f.vx = -f.facing * 4
      f.hitstop = hs
      f.attacking = false
      f.currentAttack = null
      f.clashFlash = 10
    }
  }

  const mx = ((p1.x + p1.w / 2) + (p2.x + p2.w / 2)) / 2
  const my = ((p1.y + p1.h / 2) + (p2.y + p2.h / 2)) / 2

  if (Array.isArray(hitSparks)) {
    hitSparks.push({
      x: mx,
      y: my,
      timer: 25,
      maxTimer: 25,
      category: "clash",
      color: "#ffffff",
      lines: 20,
      radius: 48
    })
  }

  try { camera?.shake?.(12, 10) } catch (_) {}
  return true
}

export function resolveGrab(attacker, defender, context = {}) {
  if (!attacker || !defender) return false
  if (!attacker.onGround || !defender.onGround) return false
  if (attacker.comboCounter > 0) return false

  const aCX = attacker.x + attacker.w / 2
  const dCX = defender.x + defender.w / 2
  if (Math.abs(aCX - dCX) > 75) return false

  const canTech = !(defender.hitstun > 0 || defender.blockstun > 0)
  if (canTech && (defender.grabInputBuffer || 0) > 0) {
    attacker.attackCooldown = 18
    defender.attackCooldown = 18
    attacker.vx = -attacker.facing * 3
    defender.vx = attacker.facing * 3
    return false
  }

  defender.isGrabbed = true
  defender.grabTimer = 28
  defender.hitstun = 28
  defender.vx = 0
  defender.vy = 0
  defender.colorFlash = 4

  attacker.attacking = false
  attacker.currentAttack = null
  attacker.attackCooldown = 28
  return true
}

export function updateGrab(attacker, defender) {
  if (!defender?.isGrabbed) return

  defender.vx = 0
  defender.vy = 0
  defender.grabTimer--

  if (defender.grabTimer <= 0) {
    defender.isGrabbed = false
    defender.vy = -14
    defender.vx = (attacker?.facing || 1) * 9
    defender.onGround = false
    defender.isLaunched = true
    defender.health = Math.max(0, (defender.health || 0) - 90)
    defender.hitstun = 20
    defender.colorFlash = 8

    try { sound?.play?.(SFX?.HIT_HEAVY) } catch (_) {}
    if (defender.health <= 0) {
      try { sound?.play?.(SFX?.KO) } catch (_) {}
    }
  }
}

// ========================
// MOVE START
// ========================

export function startMove(fighter, moveKey, moveData) {
  if (!fighter || !moveData) return false
  if (fighter.attacking || fighter.hitstun > 0 || fighter.attackCooldown > 0) return false

  const st = moveData.startup || 5
  const ac = moveData.active || 4
  const rc = moveData.recovery || 10
  const total = _dur(st + ac + rc, fighter)

  fighter.attacking = true
  fighter.currentAttack = {
    name: moveKey,
    category: moveData.category || _catFromName(moveKey),
    damage: moveData.damage || 40,
    total,
    timer: total,
    activeStart: st,
    activeEnd: st + ac,
    rangeX: moveData.rangeX || 60,
    rangeY: moveData.rangeY || 40,
    hitstun: moveData.hitstun || 15,
    pushX: moveData.knockbackX || 4,
    launchY: moveData.knockbackY ?? -2,
    launcher: moveKey === "up",
    spike: moveKey === "down_air",
    superArmor: !!moveData.superArmor,
    isSpecial: !!moveData.isSpecial,
    isUltimate: !!moveData.isUltimate,
    hasHit: false
  }

  fighter.wasInStartup = true
  return true
}

// ========================
// HIT RESOLUTION
// ========================

export function resolveAttackHit(attacker, defender, hitEffects = null, options = {}) {
  const { stageWidth = 3200, damageNumbers = null } = options

  if (!attacker?.currentAttack || attacker.currentAttack.hasHit) return
  if (!attackIsActive(attacker.currentAttack)) return

  if (checkParry(defender, attacker, hitEffects)) return

  const hitbox = getAttackHitbox(attacker)
  const hurtbox = getHurtbox(defender)
  if (!rectsOverlap(hitbox, hurtbox)) return

  if (attacker.currentAttack?.superArmor) attacker.armorFlash = 8

  if (shouldGojoAutoDodge(defender)) {
    attacker.currentAttack.hasHit = true
    try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
    return
  }

  const atk = attacker.currentAttack
  const cat = atk.isUltimate ? "ultimate"
    : atk.isSpecial ? "special"
    : (atk.category || _catFromName(atk.name || ""))

  const isCounter = !!(defender.wasInStartup && getAttackPhase(defender) === "startup")

  let dmg = Math.floor(
    (atk.damage || 40) *
    getComboScale(attacker) *
    (attacker.damageMultiplier || 1) *
    (attacker.attackMultiplier || 1) /
    Math.max(0.5, defender.defenseMultiplier || 1)
  )

  if (isCounter) {
    dmg = Math.floor(dmg * 1.25)
    try { sound?.play?.(SFX?.COUNTER_HIT) } catch (_) {}
  }

  if (defender.isBlocking) {
    const chip = cat === "special" || cat === "ultimate"
    const chipDmg = Math.floor(dmg * (chip ? 0.12 : 0.20))

    defender.health = Math.max(chip ? 1 : 0, (defender.health || 0) - chipDmg)
    defender.blockstun = 10 + (cat === "special" ? 4 : 0)

    try { sound?.play?.(SFX?.BLOCK) } catch (_) {}

    if (Array.isArray(hitEffects)) {
      hitEffects.push({
        x: hitbox.x + hitbox.w / 2,
        y: hitbox.y + hitbox.h / 2,
        timer: 8,
        maxTimer: 8,
        category: "light",
        color: null,
        damage: chipDmg,
        isBlocking: true,
        lines: 6,
        radius: 14
      })
    }
  } else {
    const hs = getHitstopFrames(atk)
    attacker.hitstop = hs
    defender.hitstop = hs

    defender.hitstun = Math.max(defender.hitstun || 0, atk.hitstun || 0)
    defender.vx = (attacker.facing || 1) * (atk.pushX || 4)

    if (atk.launcher) {
      physics.launcherAttack(attacker, defender, atk.launchY ?? -12, -22)
    } else if (atk.spike) {
      physics.downAirSpike(attacker, defender, 30)
    } else {
      defender.vy = atk.launchY ?? -2
    }

    if (cat === "heavy" || cat === "special" || cat === "ultimate") {
      const proj = defender.x + defender.vx * 8
      if (proj <= 0 || proj >= stageWidth - (defender.w || 60)) {
        defender.wallBounce = true
      }
    }

    if (!isCounter) {
      try { sound?.play?.(_hitSound(atk, false)) } catch (_) {}
    }

    defender.health = Math.max(0, (defender.health || 0) - dmg)
    defender.colorFlash = cat === "ultimate" ? 12 : cat === "special" ? 9 : 6

    const persist =
      cat === "ultimate" ? 30 :
      cat === "special" ? 22 :
      (cat === "heavy" || atk.launcher || atk.spike) ? 18 : 10

    if (Array.isArray(hitEffects)) {
      hitEffects.push({
        x: hitbox.x + hitbox.w / 2,
        y: hitbox.y + hitbox.h / 2,
        timer: persist,
        maxTimer: persist,
        category: cat,
        color: (cat === "special" || cat === "ultimate") ? (attacker.color || "#ffd166") : null,
        lines: cat === "ultimate" ? 16 : cat === "special" ? 10 : cat === "heavy" ? 8 : 6,
        radius: cat === "ultimate" ? 40 : cat === "special" ? 28 : cat === "heavy" ? 22 : 14,
        damage: dmg,
        isCounterHit: isCounter
      })
    }

    if (Array.isArray(damageNumbers)) {
      const cmap = {
        light: "#ffffff",
        heavy: "#fbbf24",
        special: "#f97316",
        ultimate: "#ef4444"
      }

      damageNumbers.push({
        value: dmg,
        text: String(dmg),
        x: hitbox.x + hitbox.w / 2,
        y: hitbox.y,
        timer: 45,
        maxTimer: 45,
        opacity: 1,
        category: cat,
        color: cmap[cat] || "#ffffff",
        fontSize: Math.min(38, 22 + Math.floor(dmg / 20))
      })
    }

    if (defender.health <= 0) {
      try { sound?.play?.(SFX?.KO) } catch (_) {}
    }
  }

  attacker.currentAttack.hasHit = true
  attacker.comboCounter++
  attacker.comboTimer = 90
  attacker.wasInStartup = false

  try { sound?.playCombo?.(attacker.comboCounter) } catch (_) {}

  applyUltraEgoReaction(defender)
}

// ========================
// MAIN UPDATE
// ========================

export function updateCombat(fighter, opponent, controls = {}, options = {}) {
  if (!fighter || !opponent) return

  ensureCombatState(fighter)

  if ((fighter.grabInputBuffer || 0) > 0) fighter.grabInputBuffer--
  if ((fighter._parryInputBuffer || 0) > 0) fighter._parryInputBuffer--
  if ((fighter.parryFlash || 0) > 0) fighter.parryFlash--
  if ((fighter.armorFlash || 0) > 0) fighter.armorFlash--
  if ((fighter.clashFlash || 0) > 0) fighter.clashFlash--
  if ((fighter.invulnTimer || 0) > 0) fighter.invulnTimer--

  if (fighter.hitstop > 0) {
    fighter.hitstop--
    return
  }

  if (fighter.hitstun > 0) fighter.hitstun--
  if (fighter.blockstun > 0) fighter.blockstun--
  if (fighter.comboTimer > 0) fighter.comboTimer--
  else fighter.comboCounter = 0
  if (fighter.attackCooldown > 0) fighter.attackCooldown--

  if (fighter.isGrabbed) {
    updateGrab(opponent, fighter)
    return
  }

  if (fighter.knockdownState) {
    if ((fighter.knockdownTimer || 0) > 0) {
      fighter.knockdownTimer--
      if (fighter.knockdownTimer <= 8) {
        if (controls.left) fighter.techRoll = "left"
        if (controls.right) fighter.techRoll = "right"
      }
    }

    if (fighter.knockdownTimer <= 0) {
      fighter.knockdownState = false
      if (fighter.techRoll) {
        const d = fighter.techRoll === "right" ? 1 : -1
        fighter.vx = d * 7
        fighter._techDash = 12
        fighter.invulnTimer = 18
        fighter.colorFlash = 18
        fighter.techRoll = null
      }
    }
    return
  }

  fighter.wasInStartup = !!(
    fighter.attacking &&
    fighter.currentAttack &&
    getAttackPhase(fighter) === "startup"
  )

  if (!fighter.attacking && !fighter.hitstun) {
    if (controls.upAttack) {
      startMove(fighter, "up", _getMD(fighter, "up"))
    } else if (controls.grab) {
      fighter.grabInputBuffer = 6
      resolveGrab(fighter, opponent, options)
    } else if (controls.air) {
      startMove(fighter, "air", _getMD(fighter, "air"))
    } else if (controls.downAir) {
      startMove(fighter, "down_air", _getMD(fighter, "down_air"))
    } else if (controls.light) {
      startMove(fighter, "light", _getMD(fighter, "light"))
    } else if (controls.heavy) {
      fighter._parryInputBuffer = 5
      startMove(fighter, "heavy", _getMD(fighter, "heavy"))
    }
  }

  if (fighter.attacking && fighter.currentAttack) {
    fighter.currentAttack.timer--

    if (getAttackPhase(fighter) === "active") {
      resolveAttackHit(fighter, opponent, options.hitEffects, {
        stageWidth: options.stageWidth,
        damageNumbers: options.damageNumbers
      })
    }

    if (fighter.currentAttack.timer <= 0) {
      fighter.attacking = false
      fighter.currentAttack = null
      fighter.currentMove = null
      fighter.attackCooldown = 10
    }
  }

  if ((fighter.energy || 0) < (fighter.maxEnergy || 0)) {
    fighter.energy += 0.1
  }
}

// ========================
// PROJECTILES
// ========================

export function updateProjectiles(projectiles = [], stageWidth = 3200) {
  if (!Array.isArray(projectiles)) return

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]
    if (!p) {
      projectiles.splice(i, 1)
      continue
    }

    p.x += p.vx || 0
    p.y += p.vy || 0
    if (p.lifetime != null) p.lifetime--

    if (
      p.x < -200 || p.x > stageWidth + 200 ||
      p.y < -400 || p.y > 2000 ||
      (p.lifetime != null && p.lifetime <= 0)
    ) {
      projectiles.splice(i, 1)
    }
  }
}

export function resolveProjectileHits(projectiles = [], p1, p2, hitEffects = [], damageNumbers = []) {
  if (!Array.isArray(projectiles)) return

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i]
    if (!proj) continue

    for (const fighter of [p1, p2].filter(Boolean)) {
      if (proj.owner === fighter || proj.ownerId === fighter.side) continue
      if ((fighter.invulnTimer || 0) > 0) continue

      const hurtbox = getHurtbox(fighter)
      const r = proj.radius || proj.size || 10
      const pb = { x: proj.x - r, y: proj.y - r, w: r * 2, h: r * 2 }

      if (!rectsOverlap(pb, hurtbox)) continue

      let dmg = proj.damage || 30

      if (fighter.isBlocking) {
        dmg *= 0.15
        fighter.blockstun = 12
        try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
      } else {
        fighter.hitstun = proj.hitstun || 18
        fighter.vx = (proj.vx > 0 ? 1 : -1) * (proj.knockbackX || 5)
        fighter.vy = proj.knockbackY || -3
        fighter.colorFlash = 6
        try { sound?.play?.(SFX?.HIT_PROJECTILE) } catch (_) {}
      }

      fighter.health = Math.max(0, (fighter.health || 0) - Math.floor(dmg))

      if (fighter.health <= 0) {
        try { sound?.play?.(SFX?.KO) } catch (_) {}
      }

      if (Array.isArray(hitEffects)) {
        hitEffects.push({
          x: proj.x,
          y: proj.y,
          timer: 14,
          maxTimer: 14,
          category: "special",
          color: proj.color || "#ffd166",
          lines: 10,
          radius: 24,
          damage: Math.floor(dmg)
        })
      }

      if (Array.isArray(damageNumbers)) {
        damageNumbers.push({
          value: Math.floor(dmg),
          text: String(Math.floor(dmg)),
          x: proj.x,
          y: proj.y - 20,
          timer: 45,
          maxTimer: 45,
          opacity: 1,
          category: "special",
          color: "#f97316",
          fontSize: Math.min(38, 22 + Math.floor(dmg / 20))
        })
      }

      projectiles.splice(i, 1)
      break
    }
  }
}
