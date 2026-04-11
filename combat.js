// combat.js
import { checkCollision } from "./collision.js"
import { physics } from "./physics.js"
import { performUltimate } from "./abilities.js"

const GOJO_INFINITY_RADIUS = 260

function getAttackDuration(base, fighter) {
  return Math.max(8, Math.floor(base / (fighter?.attackSpeedMultiplier || 1)))
}

function getBasicAttacks(fighter) {
  return fighter?.basic_attacks || {}
}

function getMoveData(fighter, moveKey) {
  const basic = getBasicAttacks(fighter)
  switch (moveKey) {
    case "light": return basic.light || null
    case "heavy": return basic.heavy || null
    case "up": return basic.upAttack || basic.up || null
    case "air": return basic.airAttack || basic.air || null
    case "down_air": return basic.downAir || basic.down_air || null
    case "grab": return basic.grab || { damage: 30, hitstun: 18, throw_force_x: 5, throw_force_y: -4 }
    default: return null
  }
}

function ensureCombatState(fighter) {
  if (!fighter) return
  if (fighter.attacking == null) fighter.attacking = false
  if (fighter.currentMove == null) fighter.currentMove = null
  if (fighter.currentMoveData == null) fighter.currentMoveData = null
  if (fighter.currentAttack == null) fighter.currentAttack = null
  if (fighter.moveTimer == null) fighter.moveTimer = 0
  if (fighter.movePhase == null) fighter.movePhase = "idle"
  if (fighter.hasHitThisMove == null) fighter.hasHitThisMove = false
  if (fighter.attackCooldown == null) fighter.attackCooldown = 0
  if (fighter.hitstun == null) fighter.hitstun = 0
  if (fighter.blockstun == null) fighter.blockstun = 0
  if (fighter.hitstop == null) fighter.hitstop = 0 
  if (fighter.isGrabbed == null) fighter.isGrabbed = false
  if (fighter.invulnTimer == null) fighter.invulnTimer = 0
  if (fighter.comboCounter == null) fighter.comboCounter = 0
  if (fighter.comboTimer == null) fighter.comboTimer = 0
  if (fighter.airHits == null) fighter.airHits = 0
  if (fighter.maxAirHits == null) fighter.maxAirHits = 3
  if (fighter.colorFlash == null) fighter.colorFlash = 0
  if (fighter.attackMultiplier == null) fighter.attackMultiplier = 1
  if (fighter.damageMultiplier == null) fighter.damageMultiplier = 1
  if (fighter.defenseMultiplier == null) fighter.defenseMultiplier = 1
}

export function getComboScale(fighter) {
  if (!fighter || fighter.comboCounter <= 1) return 1
  if (fighter.comboCounter === 2) return 0.92
  if (fighter.comboCounter === 3) return 0.84
  if (fighter.comboCounter === 4) return 0.76
  return 0.68
}

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
  if (atk.name === "up") { y = fighter.y - 30 } 
  else if (atk.name === "downAir" || atk.name === "down_air") { y = fighter.y + 30 }
  return { x, y, w: width, h: height }
}

export function getHurtbox(fighter) {
  if (!fighter) return null
  return {
    x: fighter.x + 6, y: fighter.y + 6,
    w: Math.max(1, fighter.w - 12), h: Math.max(1, fighter.h - 6)
  }
}

export function rectsOverlap(a, b) {
  return ( !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y )
}

export function checkCombatCollision(fighter, opponent) {
  const hitbox = getAttackHitbox(fighter)
  const hurtbox = getHurtbox(opponent)
  return rectsOverlap(hitbox, hurtbox) || checkCollision(hitbox, hurtbox)
}

export function shouldGojoAutoDodge(defender) {
  if (!defender?.currentFormData?.autoDodge) return false
  const kiCost = defender.currentFormData.autoDodgeKiCost || 5
  if ((defender.energy || 0) < kiCost) return false
  defender.energy -= kiCost
  defender.teleportFlash = 8
  return true
}

export function applyUltraEgoReaction(defender) {
  if (!defender?.currentFormData?.rageHealOnHit) return
  const kiCost = defender.currentFormData.healCostPerHitKi || 4
  if ((defender.energy || 0) < kiCost) return
  defender.energy -= kiCost
  defender.health = Math.min(defender.maxHealth || defender.health, defender.health + defender.currentFormData.rageHealOnHit)
}

export function canStartMove(fighter, moveData) {
  if (!fighter || !moveData) return false
  if (fighter.attacking || fighter.attackCooldown > 0 || fighter.hitstun > 0 || fighter.blockstun > 0 || fighter.isGrabbed) return false
  if (moveData.airOK === false && !fighter.grounded) return false
  if (moveData.groundOK === false && fighter.grounded) return false
  return true
}

function buildBaseAttack({ fighter, name, startup, active, recovery, damage, rangeX, rangeY, hitstun, pushX, launchY, hitstop = 4 }) {
  const total = getAttackDuration(startup + active + recovery, fighter)
  return { name, damage, total, timer: total, activeStart: Math.max(1, startup), activeEnd: Math.max(startup + 1, startup + active), rangeX, rangeY, hitstun, hitstop, pushX, launchY, hasHit: false }
}

export function buildAttackConfig(fighter, moveKey, moveData) {
  if (!moveData) return null
  if (moveKey === "light") return buildBaseAttack({ fighter, name: "light", startup: moveData.startup || 4, active: moveData.active || 3, recovery: moveData.recovery || 10, damage: moveData.damage || 35, rangeX: moveData.rangeX || 55, rangeY: moveData.rangeY || 40, hitstun: moveData.hitstun || 14, hitstop: moveData.hitstop || 3, pushX: moveData.knockbackX || 3, launchY: moveData.knockbackY ?? -2 })
  if (moveKey === "heavy") return buildBaseAttack({ fighter, name: "heavy", startup: moveData.startup || 7, active: moveData.active || 4, recovery: moveData.recovery || 15, damage: moveData.damage || 60, rangeX: moveData.rangeX || 70, rangeY: moveData.rangeY || 45, hitstun: moveData.hitstun || 20, hitstop: moveData.hitstop || 6, pushX: moveData.knockbackX || 6, launchY: moveData.knockbackY ?? -4 })
  if (moveKey === "up") {
    const atk = buildBaseAttack({ fighter, name: "up", startup: moveData.startup || 6, active: moveData.active || 4, recovery: moveData.recovery || 16, damage: moveData.damage || 55, rangeX: moveData.rangeX || 44, rangeY: moveData.rangeY || 72, hitstun: moveData.hitstun || 18, hitstop: moveData.hitstop || 5, pushX: moveData.knockbackX || 2, launchY: moveData.knockbackY ?? -12 })
    atk.launcher = true; atk.selfLift = moveData.selfLift ?? -8; return atk
  }
  if (moveKey === "air") return buildBaseAttack({ fighter, name: "air", startup: moveData.startup || 5, active: moveData.active || 4, recovery: moveData.recovery || 10, damage: moveData.damage || 45, rangeX: moveData.rangeX || 56, rangeY: moveData.rangeY || 40, hitstun: moveData.hitstun || 14, hitstop: moveData.hitstop || 4, pushX: moveData.knockbackX || 3, launchY: moveData.knockbackY ?? -2 })
  if (moveKey === "down_air") {
    const atk = buildBaseAttack({ fighter, name: "down_air", startup: moveData.startup || 7, active: moveData.active || 5, recovery: moveData.recovery || 14, damage: moveData.damage || 60, rangeX: moveData.rangeX || 48, rangeY: moveData.rangeY || 50, hitstun: moveData.hitstun || 18, hitstop: moveData.hitstop || 7, pushX: moveData.knockbackX || 2, launchY: moveData.knockbackY ?? 10 })
    atk.spike = true; atk.spikeForce = moveData.spike || moveData.knockbackY || 14; return atk
  }
  if (moveKey === "grab") {
    const total = getAttackDuration(22, fighter)
    return { name: "grab", damage: moveData.damage || 30, total, timer: total, activeStart: Math.max(3, Math.floor(total * 0.2)), activeEnd: Math.max(6, Math.floor(total * 0.45)), rangeX: moveData.rangeX || 36, rangeY: moveData.rangeY || 42, hitstun: moveData.hitstun || moveData.stun || 18, hitstop: 0, pushX: moveData.throw_force_x || 5, launchY: moveData.throw_force_y || -4, isGrab: true, hasHit: false }
  }
  return null
}

export function startMove(fighter, moveKey, moveData) {
  const attackConfig = buildAttackConfig(fighter, moveKey, moveData)
  if (!attackConfig) return false
  fighter.attacking = true
  fighter.currentMove = moveKey
  fighter.currentMoveData = moveData
  fighter.moveTimer = 0
  fighter.movePhase = "startup"
  fighter.hasHitThisMove = false
  fighter.currentAttack = attackConfig
  fighter.attackCooldown = Math.max(1, Math.floor((moveData.recovery || attackConfig.total) / (fighter.attackSpeedMultiplier || 1)))
  return true
}

export function endMove(fighter) {
  if (!fighter) return
  fighter.attacking = false; fighter.currentMove = null; fighter.currentMoveData = null; fighter.moveTimer = 0; fighter.movePhase = "idle"; fighter.hasHitThisMove = false; fighter.currentAttack = null
}

export function updateStunTimers(fighter) {
  if (!fighter) return
  if (fighter.hitstop > 0) return 
  if (fighter.hitstun > 0) fighter.hitstun--
  if (fighter.blockstun > 0) fighter.blockstun--
  if (fighter.hitstun <= 0) fighter.isGrabbed = false
}

export function beginMoveFromInput(fighter, controls) {
  if (!fighter || !controls) return false
  if (controls.upAttack) { const moveData = getMoveData(fighter, "up"); if (canStartMove(fighter, moveData)) return startMove(fighter, "up", moveData) }
  if (controls.grab) { const moveData = getMoveData(fighter, "grab"); if (canStartMove(fighter, moveData)) return startMove(fighter, "grab", moveData) }
  if (controls.downAir) { const moveData = getMoveData(fighter, "down_air"); if (canStartMove(fighter, moveData)) return startMove(fighter, "down_air", moveData) }
  if (controls.air) { const moveData = getMoveData(fighter, "air"); if (canStartMove(fighter, moveData)) return startMove(fighter, "air", moveData) }
  if (controls.light) { const moveData = getMoveData(fighter, "light"); if (canStartMove(fighter, moveData)) return startMove(fighter, "light", moveData) }
  if (controls.heavy) { const moveData = getMoveData(fighter, "heavy"); if (canStartMove(fighter, moveData)) return startMove(fighter, "heavy", moveData) }
  return false
}

function pushHitEffect(hitEffects, effect) {
  if (Array.isArray(hitEffects)) hitEffects.push(effect)
}

function applyBlockReaction(attacker, defender, atk) {
  defender.blockstun = Math.max(defender.blockstun || 0, 10)
  defender.vx = (attacker.facing || 1) * 2
  const stopFrames = Math.max(2, Math.floor((atk.hitstop || 4) * 0.75))
  attacker.hitstop = stopFrames
  defender.hitstop = stopFrames
}

function applyNormalHitReaction(attacker, defender, atk) {
  defender.hitstun = Math.max(defender.hitstun || 0, atk.hitstun || 16)
  defender.vx = (attacker.facing || 1) * (atk.pushX || 3)
  const stopFrames = atk.hitstop || 4
  attacker.hitstop = stopFrames
  defender.hitstop = stopFrames

  if (atk.isGrab) {
      defender.isGrabbed = true; defender.vx = 0; defender.vy = 0
  }

  if (atk.launcher) {
    defender.vy = atk.launchY || -36
    attacker.vy = atk.selfLift || -22
    defender.isLaunched = true; attacker.isLaunched = true; attacker.airHits = 0
    if (physics?.launcherAttack) physics.launcherAttack(attacker, defender, atk.launchY || -36, atk.selfLift || -22)
    return
  }

  if (atk.spike) {
    defender.vy = atk.spikeForce || 30
    if (physics?.downAirSpike) physics.downAirSpike(attacker, defender, atk.spikeForce || 30)
    return
  }

  if (atk.name === "air") {
    attacker.airHits = (attacker.airHits || 0) + 1
    if (attacker.airHits <= (attacker.maxAirHits || 3)) {
      if (physics?.airCombo) physics.airCombo(attacker, defender, atk.launchY || -18)
      else defender.vy = atk.launchY || -18
    } else defender.vy += 4
    return
  }
  if (!atk.isGrab) defender.vy = atk.launchY || -2
}

export function resolveAttackHit(attacker, defender, hitEffects = null) {
  if (!attacker?.currentAttack || !defender || attacker.currentAttack.hasHit || !attackIsActive(attacker.currentAttack) || (defender.invulnTimer || 0) > 0) return false
  const hitbox = getAttackHitbox(attacker)
  const hurtbox = getHurtbox(defender)
  if (!rectsOverlap(hitbox, hurtbox)) return false

  if (shouldGojoAutoDodge(defender)) {
    attacker.currentAttack.hasHit = true; attacker.hasHitThisMove = true
    pushHitEffect(hitEffects, { x: defender.x + defender.w / 2, y: defender.y + defender.h / 2, timer: 12, color: "#ffffff" })
    return true
  }

  const atk = attacker.currentAttack
  let damage = Math.max(8, Math.floor((atk.damage || 0) * getComboScale(attacker)))
  damage = Math.floor(damage * (attacker.attackMultiplier || 1))
  damage = Math.floor(damage * (attacker.damageMultiplier || 1))
  if (attacker.domainBuff) damage = Math.floor(damage * 1.15)
  damage = Math.floor(damage / (defender.defenseMultiplier || 1))

  if (defender.isBlocking && !atk.launcher && !atk.spike && !atk.isGrab) {
    damage = Math.floor(damage * 0.25)
    applyBlockReaction(attacker, defender, atk)
    defender.health = Math.max(1, defender.health - damage) 
  } else {
    applyNormalHitReaction(attacker, defender, atk)
    defender.health = Math.max(0, defender.health - damage)
  }

  applyUltraEgoReaction(defender)
  defender.colorFlash = 6
  attacker.currentAttack.hasHit = true; attacker.hasHitThisMove = true
  attacker.comboCounter = (attacker.comboCounter || 0) + 1; attacker.comboTimer = 90
  pushHitEffect(hitEffects, { x: defender.x + defender.w / 2, y: defender.y + defender.h / 2, timer: 18, color: "#ffd700" })
  return true
}

export function updateActiveMove(fighter, opponent, hitEffects = null) {
  if (!fighter) return
  if (fighter.hitstop > 0) return; 

  const moveData = fighter.currentMoveData
  const atk = fighter.currentAttack
  if (!moveData || !atk) { endMove(fighter); return }

  fighter.moveTimer++; atk.timer--
  const phase = getAttackPhase(fighter)
  fighter.movePhase = phase

  if (phase === "active") resolveAttackHit(fighter, opponent, hitEffects)
  if (atk.timer <= 0) endMove(fighter)
}

export function updateProjectiles(projectiles, worldWidth, infinityUsers = []) {
  if (!Array.isArray(projectiles)) return
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]
    p.x += p.vx || 0; p.y += p.vy || 0; p.life = (p.life ?? 0) - 1

    for (const gojo of infinityUsers) {
      if (!gojo || p.owner === gojo || !gojo.infinityActive) continue
      const pw = p.w ?? p.width ?? 20; const ph = p.h ?? p.height ?? 20
      const dx = p.x + pw / 2 - (gojo.x + gojo.w / 2); const dy = p.y + ph / 2 - (gojo.y + gojo.h / 2)
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < GOJO_INFINITY_RADIUS) {
        const ratio = Math.max(0.015, dist / GOJO_INFINITY_RADIUS)
        const slow = ratio * ratio
        p.vx *= slow; p.vy *= Math.max(0.22, slow)
      }
    }
    if (p.life <= 0 || p.x < -50 || p.x > worldWidth + 50) projectiles.splice(i, 1)
  }
}

export function updateCombat(fighter, opponent, controls = {}, options = {}) {
  if (!fighter || !opponent) return
  ensureCombatState(fighter); ensureCombatState(opponent)
  const hitEffects = options.hitEffects || null
  const abilityContext = options.abilityContext || {}

  if (fighter.hitstop > 0) fighter.hitstop--

  updateStunTimers(fighter)
  if (fighter.comboTimer > 0) fighter.comboTimer--
  else fighter.comboCounter = 0

  if (fighter.colorFlash > 0) fighter.colorFlash--
  if (fighter.invulnTimer > 0) fighter.invulnTimer--
  if (fighter.attackCooldown > 0) fighter.attackCooldown--

  if (fighter.grounded) fighter.airHits = 0
  if (opponent.grounded && opponent.hitstun <= 0) opponent.comboCounter = 0

  if (!fighter.attacking) beginMoveFromInput(fighter, controls)
  else updateActiveMove(fighter, opponent, hitEffects)

  if (controls.ultimate && !fighter.attacking && fighter.hitstun <= 0 && (fighter.energy || 0) >= (fighter.ultimate?.cost || 0)) {
    performUltimate(fighter, abilityContext)
  }

  if (fighter.energyType !== 'none' && (fighter.maxEnergy || 0) > 0 && fighter.energy < fighter.maxEnergy) {
    fighter.energy += 0.2
    if (fighter.energy > fighter.maxEnergy) fighter.energy = fighter.maxEnergy
  }

  fighter.health = Math.max(0, fighter.health)
  opponent.health = Math.max(0, opponent.health)
}
