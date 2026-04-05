// abilities.js
// Cleaned central ability system for specials, ultimates, projectiles,
// summons, teleports, transformations, passive systems, and regen.

import { characters } from "./characters.js"
import { moveset } from "./moveset.js"
import { activeSummons, spawnSummon as spawnAssistSummon } from "./summons.js"
import {
  applyTransformation,
  updateTransformations,
  applyMahoraga
} from "./transformations.js"

export const activeProjectiles = []

const WORLD_WIDTH_FALLBACK = 3200
const WORLD_HEIGHT_FALLBACK = 1600
const COMMAND_INPUT_MAX_AGE = 700

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getFighterMoveSet(fighter) {
  if (!fighter) return null

  if (fighter.rosterKey && moveset[fighter.rosterKey]) {
    return moveset[fighter.rosterKey]
  }

  const fallbackKey = String(fighter.name || "")
    .replace(/\s+/g, "")
    .toLowerCase()

  for (const key of Object.keys(moveset)) {
    if (key.toLowerCase() === fallbackKey) {
      return moveset[key]
    }
  }

  return null
}

function getSpecialEntries(fighter) {
  const set = getFighterMoveSet(fighter)
  const fromMoveset = Object.entries(set?.specials || {})
  if (fromMoveset.length) return fromMoveset
  return Object.entries(fighter?.specials || {})
}

function getUltimateEntries(fighter) {
  const set = getFighterMoveSet(fighter)
  const fromMoveset = Object.entries(set?.ultimate || {})
  if (fromMoveset.length) return fromMoveset
  return Object.entries(fighter?.ultimate || {})
}

function canSpendEnergy(fighter, cost = 0) {
  return (fighter?.energy || 0) >= cost
}

function spendEnergy(fighter, cost = 0) {
  if (!fighter) return false
  if (!canSpendEnergy(fighter, cost)) return false

  fighter.energy = Math.max(0, (fighter.energy || 0) - cost)
  return true
}

function isSpecialDisabled(fighter, moveName) {
  if (!fighter || !moveName) return false
  return Array.isArray(fighter.disabledSpecials) && fighter.disabledSpecials.includes(moveName)
}

function getAttackDuration(base, fighter) {
  return Math.max(8, Math.floor(base / (fighter?.attackSpeedMultiplier || 1)))
}

function normalizeMotionToken(token) {
  const t = String(token || "").trim().toLowerCase()

  if (t === "u" || t === "up") return "U"
  if (t === "d" || t === "down") return "D"
  if (t === "f" || t === "forward") return "F"
  if (t === "b" || t === "back") return "B"

  return null
}

function endsWithPattern(list, pattern) {
  if (list.length < pattern.length) return false

  for (let i = 0; i < pattern.length; i++) {
    if (list[list.length - pattern.length + i] !== pattern[i]) {
      return false
    }
  }

  return true
}

function getRelativeDirections(fighter, maxAge = COMMAND_INPUT_MAX_AGE) {
  if (!fighter) return []

  const now = performance.now()
  const recent = (fighter.directionHistory || []).filter((d) => now - d.time <= maxAge)

  return recent.map((d) => {
    if (d.dir === "U" || d.dir === "D") return d.dir
    if ((fighter.facing || 1) === 1) return d.dir === "R" ? "F" : "B"
    return d.dir === "L" ? "F" : "B"
  })
}

function motionMatches(fighter, moveData) {
  if (!moveData?.input?.motions?.length) return false

  const pattern = moveData.input.motions
    .map(normalizeMotionToken)
    .filter(Boolean)

  if (!pattern.length) return false

  const dirs = getRelativeDirections(fighter)
  return endsWithPattern(dirs, pattern)
}

function getCommandMatchedSpecial(fighter) {
  const specials = getSpecialEntries(fighter)
  if (!specials.length) return null

  for (const [moveName, moveData] of specials) {
    if (moveData?.input?.motions?.length && motionMatches(fighter, moveData)) {
      return [moveName, moveData]
    }
  }

  return null
}

function getFallbackSpecialMove(fighter) {
  const specials = getSpecialEntries(fighter)
  if (!specials.length) return null

  const dirs = getRelativeDirections(fighter)

  if (endsWithPattern(dirs, ["F", "F"])) return specials[1] || specials[0]
  if (endsWithPattern(dirs, ["B", "F"])) return specials[2] || specials[0]
  if (endsWithPattern(dirs, ["D", "F"])) return specials[0]
  if (endsWithPattern(dirs, ["F", "B"])) return specials[2] || specials[1] || specials[0]

  return specials[0]
}

function getSpecialMoveByPattern(fighter) {
  return getCommandMatchedSpecial(fighter) || getFallbackSpecialMove(fighter)
}

function getCommandMatchedUltimate(fighter) {
  const ultimates = getUltimateEntries(fighter)
  if (!ultimates.length) return null

  for (const [moveName, moveData] of ultimates) {
    if (moveData?.input?.motions?.length && motionMatches(fighter, moveData)) {
      return [moveName, moveData]
    }
  }

  return null
}

function getTargetResolver(context) {
  if (typeof context?.getOpponent === "function") {
    return context.getOpponent
  }

  return (fighter) => (fighter?.side === "p1" ? context?.p2 : context?.p1)
}

function getWorldWidth(context) {
  return context?.worldWidth || WORLD_WIDTH_FALLBACK
}

function focusCameraOnAction(context, fighter, target, zoom = 1, frames = 10) {
  if (target && context?.camera?.focusBetween) {
    context.camera.focusBetween(fighter, target, zoom, frames)
    return
  }

  if (context?.camera?.focusOnFighter) {
    context.camera.focusOnFighter(fighter, zoom, frames)
  }
}

function shakeCamera(context, amount = 10, frames = 10) {
  if (context?.camera?.shake) {
    context.camera.shake(amount, frames)
  }
}

function setAttackState(fighter, attack, cooldownBase) {
  fighter.currentAttack = attack
  fighter.attacking = true
  fighter.currentMove = attack.name
  fighter.currentMoveData = attack
  fighter.moveTimer = 0
  fighter.movePhase = "startup"
  fighter.hasHitThisMove = false
  fighter.attackCooldown = getAttackDuration(cooldownBase, fighter)
}

function lowerName(moveName) {
  return String(moveName || "").toLowerCase()
}

function isProjectileLikeMove(name, moveData) {
  const lower = lowerName(name)

  return (
    moveData.projectile ||
    lower.includes("beam") ||
    lower.includes("blast") ||
    lower.includes("gun") ||
    lower.includes("purple") ||
    lower.includes("arrow") ||
    lower.includes("wave") ||
    lower.includes("flash") ||
    lower.includes("ball") ||
    lower.includes("laser") ||
    lower.includes("bullet") ||
    lower.includes("kame")
  )
}

function isTeleportLikeMove(name, moveData) {
  const lower = lowerName(name)

  return (
    moveData.teleport ||
    lower.includes("teleport") ||
    lower.includes("transmission") ||
    lower.includes("step") ||
    lower.includes("dash")
  )
}

function isMahoragaTransform(name, moveData) {
  const lower = lowerName(name)

  return (
    moveData.permanentTransform === "mahoraga" ||
    moveData.lockedForm === "mahoraga" ||
    moveData.subtype === "ritual" ||
    moveData.oneWay ||
    lower.includes("mahoraga")
  )
}

function createAttackFromMove(fighter, moveName, moveData = {}, fallback = {}) {
  const startup = moveData.startup || fallback.startup || 10
  const active = moveData.active || fallback.active || 5
  const recovery = moveData.recovery || fallback.recovery || 18
  const total = getAttackDuration(startup + active + recovery, fighter)

  return {
    name: moveName,
    damage: moveData.damage || fallback.damage || 90,
    total,
    timer: total,
    activeStart: Math.max(
      fallback.minActiveStart || 5,
      moveData.startup || Math.floor(total * (fallback.activeStartRatio || 0.28))
    ),
    activeEnd: Math.max(
      fallback.minActiveEnd || 9,
      startup + active
    ),
    rangeX: moveData.rangeX || fallback.rangeX || 85,
    rangeY: moveData.rangeY || fallback.rangeY || 50,
    hitstun: moveData.hitstun || fallback.hitstun || 26,
    pushX: moveData.knockbackX || fallback.pushX || 7,
    launchY: moveData.knockbackY ?? fallback.launchY ?? -8,
    launcher: !!moveData.launcher,
    spike: !!moveData.spike,
    spikeForce: moveData.spike || fallback.spikeForce || 14,
    hasHit: false
  }
}

export function executeAttack(attacker, target, moveName, context = {}) {
  if (!attacker || !target) return false

  let move = null
  let isUltimateMove = false

  if (attacker.basic_attacks && attacker.basic_attacks[moveName]) {
    move = attacker.basic_attacks[moveName]
  } else if (attacker.specials && attacker.specials[moveName]) {
    move = attacker.specials[moveName]
    if (!spendEnergy(attacker, move.cost || 0)) return false
  } else if (attacker.ultimate && attacker.ultimate.name === moveName) {
    move = attacker.ultimate
    isUltimateMove = true
    if (!spendEnergy(attacker, move.cost || 0)) return false
  } else {
    return false
  }

  target.health = Math.max(0, target.health - (move.damage || 0))

  if (move.effect) {
    handleEffect(attacker, target, move.effect, context)
  }

  if (isUltimateMove) {
    activateUltimate(attacker)
  }

  return true
}

function handleEffect(attacker, target, effect, context = {}) {
  switch (effect) {
    case "launch":
      target.vy = -12
      attacker.vy = -8
      attacker.airHits = 0
      break

    case "spike":
      target.vy = 15
      break

    case "heal":
      attacker.health = Math.min(attacker.maxHealth || attacker.health, attacker.health + 50)
      break

    case "energy_boost":
      attacker.energy = Math.min(attacker.maxEnergy || 9999, (attacker.energy || 0) + 30)
      break

    case "piercing":
      target.health = Math.max(0, target.health - 20)
      break

    default:
      if (
        String(effect).includes("ki") ||
        String(effect).includes("blast") ||
        String(effect).includes("beam") ||
        String(effect).includes("ball") ||
        String(effect).includes("laser")
      ) {
        spawnProjectile(attacker, effect, {}, context)
      }
      break
  }
}

export function spawnProjectile(attacker, type, moveData = {}, context = {}) {
  if (!attacker) return null

  const lower = lowerName(type)
  const width = moveData.w || moveData.width || (lower.includes("purple") ? 28 : 18)
  const height = moveData.h || moveData.height || width
  const speed = moveData.speed || (lower.includes("purple") ? 13 : 10)

  const projectile = {
    owner: attacker,
    name: type,
    x: (attacker.facing || 1) === 1 ? attacker.x + attacker.w + 4 : attacker.x - width - 4,
    y: attacker.y + 30,
    vx: (attacker.facing || 1) * speed,
    vy: moveData.vy || 0,
    w: width,
    h: height,
    width,
    height,
    damage: moveData.damage || 90,
    life: moveData.life || 120,
    color: moveData.color || attacker.color || "yellow"
  }

  activeProjectiles.push(projectile)
  return projectile
}

export function spawnProjectileFromMove(fighter, moveName, moveData, context = {}) {
  return spawnProjectile(fighter, moveName, moveData, context)
}

export function spawnCharacterSummon(fighter, moveName, moveData, context = {}) {
  if (!fighter || fighter.summonCooldown > 0) return false

  const getOpponent = getTargetResolver(context)
  const target = getOpponent(fighter)
  if (!target) return false

  spawnAssistSummon(
    fighter,
    {
      ...moveData,
      summon: true,
      summonId: moveData.summonId || moveName,
      damage: moveData.damage || 50
    },
    target
  )

  fighter.summonCooldown = moveData.cooldown
    ? Math.ceil(moveData.cooldown / 4)
    : 45

  return true
}

export function doTeleportOrRush(fighter, moveName, moveData, context = {}) {
  if (!fighter || !moveData) return false

  const getOpponent = getTargetResolver(context)
  const target = getOpponent(fighter)
  if (!target) return false

  const worldWidth = getWorldWidth(context)

  if (isTeleportLikeMove(moveName, moveData) && !moveData.rushOnly) {
    if (fighter.x < target.x) {
      fighter.x = target.x - fighter.w - 10
    } else {
      fighter.x = target.x + target.w + 10
    }

    fighter.x = clamp(fighter.x, 0, worldWidth - fighter.w)
    fighter.y = target.y
    fighter.vx = 0
    fighter.vy = 0
    fighter.teleportFlash = 12
    fighter.attackCooldown = getAttackDuration(18, fighter)

    focusCameraOnAction(context, fighter, target, 1.0, 10)
    return true
  }

  const attack = createAttackFromMove(
    fighter,
    moveName,
    moveData,
    {
      startup: 4,
      active: 6,
      recovery: 12,
      damage: 80,
      rangeX: 80,
      rangeY: 45,
      hitstun: 22,
      pushX: 8,
      launchY: -6,
      minActiveStart: 3,
      minActiveEnd: 7,
      activeStartRatio: 0.2
    }
  )

  setAttackState(fighter, attack, 20)
  fighter.vx = (fighter.facing || 1) * 10
  focusCameraOnAction(context, fighter, target, 0.99, 10)

  return true
}

export function activateUltimate(fighter) {
  if (!fighter || !fighter.ultimate) return

  fighter.isUltimateActive = true
  fighter.ultimateTimer = (fighter.ultimate.duration || 5) * 60

  const effect = fighter.ultimate.effect || ""

  fighter.attackMultiplier = 1
  fighter.speedMultiplier = 1
  fighter.energyRegenBoost = false

  if (String(effect).includes("attack")) {
    fighter.attackMultiplier = 2
  }
  if (String(effect).includes("speed")) {
    fighter.speedMultiplier = 1.5
  }
  if (String(effect).includes("ki") || String(effect).includes("energy")) {
    fighter.energyRegenBoost = true
  }
}

export function updateUltimates(fighter) {
  if (!fighter?.isUltimateActive) return

  fighter.ultimateTimer--

  if (fighter.ultimateTimer <= 0) {
    fighter.isUltimateActive = false
    fighter.attackMultiplier = 1
    fighter.speedMultiplier = 1
    fighter.energyRegenBoost = false
  }
}

export function executeUltimateMove(fighter, moveName, moveData, context = {}) {
  if (!fighter || !moveData) return false
  if (isSpecialDisabled(fighter, moveName)) return false
  if (!spendEnergy(fighter, moveData.cost || 0)) return false

  if (isMahoragaTransform(moveName, moveData)) {
    return transformIntoMahoraga(fighter, context)
  }

  const attack = createAttackFromMove(
    fighter,
    moveName,
    {
      ...moveData,
      damage: Math.floor((moveData.damage || 180) * 1.2),
      knockbackX: moveData.knockbackX || 10,
      knockbackY: moveData.knockbackY ?? -10,
      hitstun: moveData.hitstun || 36
    },
    {
      startup: 18,
      active: 8,
      recovery: 28,
      damage: 180,
      rangeX: 105,
      rangeY: 62,
      hitstun: 36,
      pushX: 10,
      launchY: -10,
      minActiveStart: 8,
      minActiveEnd: 14
    }
  )

  setAttackState(fighter, attack, 42)

  const getOpponent = getTargetResolver(context)
  const target = getOpponent(fighter)

  focusCameraOnAction(context, fighter, target, 0.95, 18)
  shakeCamera(context, 12, 10)

  return true
}

export function performUltimate(fighter, context = {}) {
  if (!fighter) return false

  const commandUltimate = getCommandMatchedUltimate(fighter)
  if (commandUltimate) {
    const [moveName, moveData] = commandUltimate
    if (executeUltimateMove(fighter, moveName, moveData, context)) {
      return true
    }
  }

  if (fighter.domain && fighter.energy >= Math.min(100, fighter.maxEnergy || 100)) {
    spendEnergy(fighter, Math.min(100, fighter.maxEnergy || 100))

    if (Array.isArray(context?.activeDomains)) {
      context.activeDomains.push({
        owner: fighter,
        name: fighter.domain.name,
        priority: fighter.domain.priority || 1,
        timer: 300,
        background: fighter.domain.background || null
      })
    }

    fighter.activeDomainTimer = 300
    fighter.domainBuff = true
    fighter.attackCooldown = getAttackDuration(40, fighter)

    const getOpponent = getTargetResolver(context)
    const target = getOpponent(fighter)

    focusCameraOnAction(context, fighter, target, 0.9, 28)
    shakeCamera(context, 14, 12)

    return true
  }

  const setUltimates = getUltimateEntries(fighter).filter(
    ([name]) => !isSpecialDisabled(fighter, name)
  )

  if (setUltimates.length) {
    const strongestUltimate = [...setUltimates].sort(
      (a, b) => (b[1].damage || 180) - (a[1].damage || 180)
    )[0]

    if (strongestUltimate) {
      return executeUltimateMove(fighter, strongestUltimate[0], strongestUltimate[1], context)
    }
  }

  const specials = getSpecialEntries(fighter).filter(
    ([name]) => !isSpecialDisabled(fighter, name)
  )

  if (!specials.length) return false

  const strongest = [...specials].sort(
    (a, b) => (b[1].damage || 0) - (a[1].damage || 0)
  )[0]

  if (!strongest) return false

  const [moveName, moveData] = strongest
  if (!spendEnergy(fighter, moveData.cost || 0)) return false

  const attack = createAttackFromMove(
    fighter,
    moveName,
    {
      ...moveData,
      damage: Math.floor((moveData.damage || 140) * 1.25),
      knockbackX: moveData.knockbackX || 10,
      knockbackY: moveData.knockbackY ?? -10,
      hitstun: 34
    },
    {
      startup: 10,
      active: 8,
      recovery: 18,
      damage: 140,
      rangeX: 100,
      rangeY: 60,
      hitstun: 34,
      pushX: 10,
      launchY: -10,
      minActiveStart: 8,
      minActiveEnd: 14
    }
  )

  setAttackState(fighter, attack, 42)

  const getOpponent = getTargetResolver(context)
  const target = getOpponent(fighter)

  focusCameraOnAction(context, fighter, target, 0.95, 18)
  shakeCamera(context, 12, 10)

  return true
}

export function triggerSpecial(fighter, context = {}) {
  if (!fighter) return false
  if (fighter.attackCooldown > 0 || fighter.hitstun > 0 || fighter.blockstun > 0) return false

  const picked = getSpecialMoveByPattern(fighter)
  if (!picked) return false

  const [moveName, moveData] = picked

  if (isSpecialDisabled(fighter, moveName)) return false
  if (!spendEnergy(fighter, moveData.cost || 0)) return false

  if (isMahoragaTransform(moveName, moveData)) {
    return transformIntoMahoraga(fighter, context)
  }

  if (moveData.summon || moveData.subtype === "summon" || moveData.assist || moveData.summonId) {
    const ok = spawnCharacterSummon(fighter, moveName, moveData, context)
    if (ok) {
      fighter.attackCooldown = 20
      focusCameraOnAction(context, fighter, null, 1.02, 10)
    }
    return ok
  }

  if (isTeleportLikeMove(moveName, moveData)) {
    return doTeleportOrRush(fighter, moveName, moveData, context)
  }

  if (isProjectileLikeMove(moveName, moveData)) {
    spawnProjectileFromMove(fighter, moveName, moveData, context)
    fighter.attackCooldown = getAttackDuration(26, fighter)
    focusCameraOnAction(context, fighter, null, 1.02, 8)
    return true
  }

  const attack = createAttackFromMove(
    fighter,
    moveName,
    moveData,
    {
      startup: 10,
      active: 5,
      recovery: 18,
      damage: 90,
      rangeX: 85,
      rangeY: 50,
      hitstun: 26,
      pushX: 7,
      launchY: -8
    }
  )

  setAttackState(fighter, attack, 24)
  focusCameraOnAction(context, fighter, null, 1.01, 8)

  return true
}

export function triggerUltimate(fighter, context = {}) {
  if (!fighter) return false
  if (fighter.attackCooldown > 0 || fighter.hitstun > 0 || fighter.blockstun > 0) return false
  return performUltimate(fighter, context)
}

export function transformIntoMahoraga(fighter, context = {}) {
  if (!fighter) return false

  const replacementData = characters.mahoraga
  if (!replacementData) return false

  const applied = applyTransformation(fighter, "mahoraga")
  if (!applied) return false

  applyMahoraga(fighter, replacementData)
  fighter.pendingCharacterSwap = "mahoraga"
  fighter.attackCooldown = 28
  fighter.teleportFlash = 20

  focusCameraOnAction(context, fighter, null, 0.98, 18)
  shakeCamera(context, 12, 10)

  return true
}

export function performCharacterSwap(fighter, createFighter) {
  if (!fighter?.pendingCharacterSwap || typeof createFighter !== "function") {
    return fighter
  }

  const swapKey = fighter.pendingCharacterSwap
  const replacementData = characters[swapKey]
  if (!replacementData) return fighter

  const controls = fighter.controls
  const side = fighter.side
  const x = fighter.x
  const y = fighter.y
  const facing = fighter.facing
  const healthRatio = Math.max(0.05, fighter.health / Math.max(1, fighter.maxHealth))

  const transformed = createFighter(swapKey, replacementData, x, facing, controls, side)
  transformed.y = y
  transformed.health = Math.floor(transformed.maxHealth * healthRatio)
  transformed.energy = 0
  transformed.teleportFlash = 20
  transformed.currentForm = "mahoraga"
  transformed.currentFormData = fighter.currentFormData || transformed.currentFormData
  transformed.transformIndex = transformed.transformationOrder
    ? Math.max(0, transformed.transformationOrder.indexOf("mahoraga"))
    : 0
  transformed.permanentForm = true
  transformed.oneWayTransformation = true
  transformed.deathRitual = true
  transformed.ritualActive = true
  transformed.disabledSpecials = [
    "divineDogs",
    "nue",
    "toad",
    "rabbitEscape",
    "maxElephant",
    "shadowStep"
  ]

  return transformed
}

export function triggerTransformation(fighter, context = {}) {
  if (!fighter?.transformations || !fighter.transformationOrder?.length) return false
  if (fighter.attackCooldown > 0 || fighter.hitstun > 0 || fighter.blockstun > 0) return false
  if (fighter.permanentForm || fighter.oneWayTransformation || fighter.deathRitual) return false
  if (fighter.transformIndex >= fighter.transformationOrder.length - 1) return false

  fighter.transformIndex++
  const nextForm = fighter.transformationOrder[fighter.transformIndex]
  const ok = applyTransformation(fighter, nextForm)

  if (!ok) {
    fighter.transformIndex--
    return false
  }

  fighter.currentForm = nextForm
  fighter.currentFormData = fighter.transformations[fighter.currentForm]
  fighter.teleportFlash = 10
  fighter.attackCooldown = 18

  focusCameraOnAction(context, fighter, null, 1.02, 14)

  return true
}

export function updateTransformationState(fighter, context = {}) {
  if (!fighter) return fighter

  updateTransformations(fighter, context.deltaMs || 1000 / 60)

  if (fighter.currentFormData) {
    const form = fighter.currentFormData

    fighter.attackMultiplier = form.attackMultiplier || 1
    fighter.damageMultiplier = form.damageMultiplier || 1
    fighter.speedMultiplier = form.speedMultiplier || 1
    fighter.defenseMultiplier = form.defenseMultiplier || 1
  } else {
    fighter.attackMultiplier = fighter.attackMultiplier || 1
    fighter.damageMultiplier = fighter.damageMultiplier || 1
    fighter.speedMultiplier = fighter.speedMultiplier || 1
    fighter.defenseMultiplier = fighter.defenseMultiplier || 1
  }

  if (
    fighter.pendingCharacterSwap === "mahoraga" &&
    fighter.rosterKey !== "mahoraga" &&
    typeof context.createFighter === "function"
  ) {
    return performCharacterSwap(fighter, context.createFighter)
  }

  return fighter
}

export function doEnergyCharge(fighter) {
  if (!fighter?.maxEnergy) return
  if (fighter.hitstun > 0 || fighter.blockstun > 0) return

  fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + 0.45)
}

export function applyGojoPassiveSystems(fighter) {
  if (!fighter || fighter.name !== "Satoru Gojo") return

  if (fighter.infinityActive) {
    if ((fighter.energy || 0) > 0) {
      fighter.energy = Math.max(0, fighter.energy - 0.12)
    } else {
      fighter.health = Math.max(0, fighter.health - 0.2)
    }
  }
}

export function regenEnergy(fighter) {
  if (!fighter?.maxEnergy) return

  let regen = 0.08

  if (fighter.universe === "dragon_ball") regen += 0.02
  if (fighter.universe === "naruto") regen += 0.02
  if (fighter.universe === "jujutsu_kaisen") regen += 0.01
  if (fighter.domainBuff) regen += 0.04
  if (fighter.energyRegenBoost) regen += 0.06

  fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + regen)
}

export function updateProjectiles(
  worldWidth = WORLD_WIDTH_FALLBACK,
  worldHeight = WORLD_HEIGHT_FALLBACK
) {
  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const p = activeProjectiles[i]

    p.x += p.vx || 0
    p.y += p.vy || 0
    p.life--

    if (
      p.life <= 0 ||
      p.x < -50 ||
      p.x > worldWidth + 50 ||
      p.y < -100 ||
      p.y > worldHeight + 100
    ) {
      activeProjectiles.splice(i, 1)
    }
  }
}

export function drawProjectiles(ctx) {
  for (const p of activeProjectiles) {
    ctx.fillStyle = p.color || "yellow"
    ctx.fillRect(p.x, p.y, p.w || p.width || 20, p.h || p.height || 20)
  }
}

export function clearAbilityState() {
  activeProjectiles.length = 0
  activeSummons.length = 0
}