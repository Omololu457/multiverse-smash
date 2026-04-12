/**
 * COMBAT ENGINE
 * Combined melee + projectile + special traits engine.
 * Handles move phases, hit detection, damage scaling, hitstop, sounds,
 * spark categories, counter-hits, blocking, and special fighter traits.
 */

import { physics } from "./physics.js"
import { performUltimate } from "./abilities.js"
import { sound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// HITSTOP TABLE — frames both fighters freeze on connect
// ─────────────────────────────────────────────────────────────────
const HITSTOP = {
  light: 4,
  air: 4,
  grab: 6,
  heavy: 8,
  launcher: 8,
  spike: 8,
  special: 12,
  ultimate: 20,
  default: 4
}

function getHitstopFrames(atk) {
  if (!atk) return HITSTOP.default
  if (atk.isUltimate) return HITSTOP.ultimate
  if (atk.isSpecial) return HITSTOP.special
  if (atk.launcher) return HITSTOP.launcher
  if (atk.spike) return HITSTOP.spike

  const n = (atk.name || "").toLowerCase()
  if (n === "heavy") return HITSTOP.heavy
  if (n === "grab") return HITSTOP.grab
  return HITSTOP.light
}

function getHitSoundId(atk, isBlocking) {
  if (isBlocking) return SFX.BLOCK
  if (!atk) return SFX.HIT_LIGHT
  if (atk.isUltimate) return SFX.HIT_ULTIMATE
  if (atk.isSpecial) return SFX.HIT_SPECIAL

  const n = (atk.name || "").toLowerCase()
  if (n === "heavy" || n === "up" || n === "down_air") return SFX.HIT_HEAVY
  return SFX.HIT_LIGHT
}

export function getSparkCategory(atk) {
  if (!atk) return "light"
  if (atk.isUltimate) return "ultimate"
  if (atk.isSpecial) return "special"

  const n = (atk.name || "").toLowerCase()
  if (n === "heavy" || n === "up" || n === "down_air") return "heavy"
  return "light"
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function getAttackDuration(base, fighter) {
  return Math.max(8, Math.floor(base / (fighter?.attackSpeedMultiplier || 1)))
}

function getBasicAttacks(fighter) {
  return fighter?.basic_attacks || {}
}

function getMoveData(fighter, moveKey) {
  const basic = getBasicAttacks(fighter)

  switch (moveKey) {
    case "light":
      return basic.light || null
    case "heavy":
      return basic.heavy || null
    case "up":
      return basic.upAttack || basic.up || null
    case "air":
      return basic.airAttack || basic.air || null
    case "down_air":
      return basic.downAir || basic.down_air || null
    case "grab":
      return (
        basic.grab || {
          damage: 30,
          hitstun: 18,
          throwForceX: 5,
          throwForceY: -4,
          throw_force_x: 5,
          throw_force_y: -4
        }
      )
    default:
      return basic[moveKey] || fighter?.specials?.[moveKey] || { damage: 40, hitstun: 20 }
  }
}

function getMoveKnockbackX(moveData) {
  return moveData.knockbackX ?? moveData.throwForceX ?? moveData.throw_force_x ?? 4
}

function getMoveKnockbackY(moveData) {
  return moveData.knockbackY ?? moveData.throwForceY ?? moveData.throw_force_y ?? -2
}

function buildBaseAttack({
  fighter,
  name,
  startup,
  active,
  recovery,
  damage,
  rangeX,
  rangeY,
  hitstun,
  pushX,
  launchY,
  hitstop
}) {
  const total = getAttackDuration(startup + active + recovery, fighter)

  return {
    name,
    damage,
    total,
    timer: total,
    activeStart: startup,
    activeEnd: startup + active,
    rangeX,
    rangeY,
    hitstun,
    hitstop,
    pushX,
    launchY,
    launcher: name === "up",
    spike: name === "down_air",
    hasHit: false
  }
}

// ─────────────────────────────────────────────────────────────────
// COMBAT STATE INIT
// ─────────────────────────────────────────────────────────────────
export function ensureCombatState(fighter) {
  if (!fighter) return

  const defaults = {
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
    wasInStartup: false
  }

  for (const key in defaults) {
    if (fighter[key] == null) fighter[key] = defaults[key]
  }
}

// ─────────────────────────────────────────────────────────────────
// COMBO SCALING
// ─────────────────────────────────────────────────────────────────
export function getComboScale(fighter) {
  if (!fighter || fighter.comboCounter <= 1) return 1
  const scales = [1, 0.92, 0.84, 0.76, 0.70, 0.65]
  return scales[Math.min(fighter.comboCounter - 1, scales.length - 1)]
}

// ─────────────────────────────────────────────────────────────────
// ATTACK PHASE
// ─────────────────────────────────────────────────────────────────
export function attackIsActive(attack) {
  if (!attack) return false
  const elapsed = attack.total - attack.timer
  return elapsed >= attack.activeStart && elapsed <= attack.activeEnd
}

export function getAttackPhase(fighter) {
  if (!fighter?.currentAttack) return "idle"

  const atk = fighter.currentAttack
  const elapsed = atk.total - atk.timer

  if (elapsed < atk.activeStart) return "startup"
  if (elapsed <= atk.activeEnd) return "active"
  return "recovery"
}

export function getAttackHitbox(fighter) {
  const atk = fighter?.currentAttack
  if (!fighter || !atk) return null

  const width = atk.rangeX || 50
  const height = atk.rangeY || 40
  const x = fighter.facing === 1 ? fighter.x + fighter.w : fighter.x - width
  let y = fighter.y + 20

  if (atk.name === "up") y = fighter.y - 30
  else if (atk.name === "down_air") y = fighter.y + 30

  return { x, y, w: width, h: height }
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
  return (
    !!a &&
    !!b &&
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  )
}

// ─────────────────────────────────────────────────────────────────
// SPECIAL TRAITS
// ─────────────────────────────────────────────────────────────────
export function shouldGojoAutoDodge(defender) {
  if (!defender?.currentFormData?.autoDodge) return false
  const cost = defender.currentFormData.autoDodgeKiCost || 5
  if ((defender.energy || 0) < cost) return false

  defender.energy -= cost
  defender.teleportFlash = 8
  return true
}

export function applyUltraEgoReaction(defender) {
  if (!defender?.currentFormData?.rageHealOnHit) return
  const cost = defender.currentFormData.healCostPerHitKi || 4
  if ((defender.energy || 0) < cost) return

  defender.energy -= cost
  defender.health = Math.min(
    defender.maxHealth || 1000,
    defender.health + defender.currentFormData.rageHealOnHit
  )
}

// ─────────────────────────────────────────────────────────────────
// MOVE START
// ─────────────────────────────────────────────────────────────────
export function startMove(fighter, moveKey, moveData) {
  if (!fighter || !moveData) return false
  if (fighter.attacking || fighter.hitstun > 0 || fighter.attackCooldown > 0) return false

  const startup = moveData.startup || 5
  const active = moveData.active || 4
  const recovery = moveData.recovery || 10

  const config = buildBaseAttack({
    fighter,
    name: moveKey,
    startup,
    active,
    recovery,
    damage: moveData.damage || 40,
    rangeX: moveData.rangeX || 60,
    rangeY: moveData.rangeY || 40,
    hitstun: moveData.hitstun || 15,
    pushX: getMoveKnockbackX(moveData),
    launchY: getMoveKnockbackY(moveData),
    hitstop: getHitstopFrames({
      name: moveKey,
      isSpecial: !!moveData.isSpecial,
      isUltimate: !!moveData.isUltimate,
      launcher: moveKey === "up",
      spike: moveKey === "down_air"
    })
  })

  config.isSpecial = !!moveData.isSpecial
  config.isUltimate = !!moveData.isUltimate

  fighter.attacking = true
  fighter.currentAttack = config
  fighter.currentMove = moveKey
  fighter.currentMoveData = moveData
  fighter.wasInStartup = true

  return true
}

// ─────────────────────────────────────────────────────────────────
// RESOLVE HIT
// ─────────────────────────────────────────────────────────────────
function applyNormalHitReaction(attacker, defender, atk) {
  defender.hitstun = Math.max(defender.hitstun || 0, atk.hitstun || 0)
  defender.vx = (attacker.facing || 1) * (atk.pushX || 4)

  const hs = atk.hitstop ?? getHitstopFrames(atk)
  attacker.hitstop = hs
  defender.hitstop = hs

  if (atk.launcher) {
    physics.launcherAttack(attacker, defender, atk.launchY ?? -12, -22)
  } else if (atk.spike) {
    physics.downAirSpike(attacker, defender, 30)
  } else {
    defender.vy = atk.launchY ?? -2
  }
}

export function resolveAttackHit(attacker, defender, hitEffects = null) {
  if (!attacker?.currentAttack || attacker.currentAttack.hasHit) return
  if (!attackIsActive(attacker.currentAttack)) return

  const hitbox = getAttackHitbox(attacker)
  const hurtbox = getHurtbox(defender)
  if (!rectsOverlap(hitbox, hurtbox)) return

  if (shouldGojoAutoDodge(defender)) {
    attacker.currentAttack.hasHit = true
    sound?.play?.(SFX.BLOCK)
    return
  }

  const atk = attacker.currentAttack
  const isCounterHit = !!(defender.wasInStartup && getAttackPhase(defender) === "startup")

  let damage = Math.floor(
    (atk.damage || 40) *
      getComboScale(attacker) *
      (attacker.damageMultiplier || 1) *
      (attacker.attackMultiplier || 1) /
      Math.max(0.5, defender.defenseMultiplier || 1)
  )

  if (isCounterHit) {
    damage = Math.floor(damage * 1.25)
    sound?.play?.(SFX.COUNTER_HIT)
  }

  if (defender.isBlocking) {
    damage = Math.floor(damage * 0.2)
    defender.blockstun = 10
    sound?.play?.(SFX.BLOCK)
  } else {
    applyNormalHitReaction(attacker, defender, atk)
    if (!isCounterHit) sound?.play?.(getHitSoundId(atk, false))
  }

  defender.health = Math.max(0, (defender.health || 0) - damage)
  defender.colorFlash = atk.isUltimate ? 12 : atk.isSpecial ? 9 : 6

  attacker.currentAttack.hasHit = true
  attacker.comboCounter++
  attacker.comboTimer = 90
  attacker.wasInStartup = false

  sound?.playCombo?.(attacker.comboCounter)

  if (defender.health <= 0) sound?.play?.(SFX.KO)

  applyUltraEgoReaction(defender)

  if (Array.isArray(hitEffects)) {
    hitEffects.push({
      x: hitbox.x + hitbox.w / 2,
      y: hitbox.y + hitbox.h / 2,
      timer: atk.isUltimate
        ? 24
        : atk.isSpecial
          ? 18
          : atk.launcher || atk.spike
            ? 18
            : 12,
      size: atk.isUltimate ? 30 : atk.isSpecial ? 24 : 20,
      category: getSparkCategory(atk),
      color: atk.isSpecial || atk.isUltimate ? attacker.color || "#ffd166" : "#fff1a8",
      damage,
      isCounterHit,
      isBlocking: !!defender.isBlocking
    })
  }
}

// ─────────────────────────────────────────────────────────────────
// MAIN UPDATE
// ─────────────────────────────────────────────────────────────────
export function updateCombat(fighter, opponent, controls = {}, options = {}) {
  if (!fighter || !opponent) return
  ensureCombatState(fighter)

  if (fighter.hitstop > 0) {
    fighter.hitstop--
    return
  }

  if (fighter.hitstun > 0) fighter.hitstun--
  if (fighter.blockstun > 0) fighter.blockstun--
  if (fighter.comboTimer > 0) fighter.comboTimer--
  else fighter.comboCounter = 0
  if (fighter.attackCooldown > 0) fighter.attackCooldown--

  fighter.wasInStartup = !!(
    fighter.attacking &&
    fighter.currentAttack &&
    getAttackPhase(fighter) === "startup"
  )

  if (!fighter.attacking && !fighter.hitstun) {
    if (controls.upAttack) startMove(fighter, "up", getMoveData(fighter, "up"))
    else if (controls.grab) startMove(fighter, "grab", getMoveData(fighter, "grab"))
    else if (controls.air) startMove(fighter, "air", getMoveData(fighter, "air"))
    else if (controls.downAir) startMove(fighter, "down_air", getMoveData(fighter, "down_air"))
    else if (controls.light) startMove(fighter, "light", getMoveData(fighter, "light"))
    else if (controls.heavy) startMove(fighter, "heavy", getMoveData(fighter, "heavy"))
  }

  if (fighter.attacking && fighter.currentAttack) {
    fighter.currentAttack.timer--

    if (getAttackPhase(fighter) === "active") {
      resolveAttackHit(fighter, opponent, options.hitEffects)
    }

    if (fighter.currentAttack.timer <= 0) {
      fighter.attacking = false
      fighter.currentAttack = null
      fighter.currentMove = null
      fighter.currentMoveData = null
      fighter.attackCooldown = 10
      fighter.wasInStartup = false
    }
  }

  if ((fighter.energy || 0) < (fighter.maxEnergy || 0)) {
    fighter.energy += 0.1
  }
}

// ─────────────────────────────────────────────────────────────────
// PROJECTILES
// ─────────────────────────────────────────────────────────────────
export function updateProjectiles(projectiles = [], stageWidth = 3200, fighters = []) {
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

    const outOfBounds =
      p.x < -200 ||
      p.x > stageWidth + 200 ||
      p.y < -400 ||
      p.y > 2000

    const expired = p.lifetime != null && p.lifetime <= 0

    if (outOfBounds || expired) {
      projectiles.splice(i, 1)
    }
  }
}

export function resolveProjectileHits(projectiles = [], p1, p2, hitEffects = []) {
  if (!Array.isArray(projectiles)) return

  const fighters = [p1, p2].filter(Boolean)

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i]
    if (!proj) continue

    for (const fighter of fighters) {
      if (proj.owner === fighter || proj.ownerId === fighter.side) continue
      if ((fighter.invulnTimer || 0) > 0) continue

      const hurtbox = getHurtbox(fighter)
      const r = proj.radius || proj.size || 10
      const projBox = {
        x: proj.x - r,
        y: proj.y - r,
        w: r * 2,
        h: r * 2
      }

      if (!rectsOverlap(projBox, hurtbox)) continue

      let damage = proj.damage || 30

      if (fighter.isBlocking) {
        damage *= 0.15
        fighter.blockstun = 12
        sound?.play?.(SFX.BLOCK)
      } else {
        fighter.hitstun = proj.hitstun || 18
        fighter.vx = (proj.vx > 0 ? 1 : -1) * (proj.knockbackX || 5)
        fighter.vy = proj.knockbackY || -3
        fighter.colorFlash = 6
        sound?.play?.(SFX.HIT_PROJECTILE)
      }

      fighter.health = Math.max(0, (fighter.health || 0) - Math.floor(damage))
      if (fighter.health <= 0) sound?.play?.(SFX.KO)

      if (Array.isArray(hitEffects)) {
        hitEffects.push({
          x: proj.x,
          y: proj.y,
          timer: 14,
          size: 20,
          category: "special",
          color: proj.color || "#ffd166",
          damage: Math.floor(damage)
        })
      }

      projectiles.splice(i, 1)
      break
    }
  }
}
