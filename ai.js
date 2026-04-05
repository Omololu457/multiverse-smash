// ai.js
// CPU controller logic for Easy / Adaptive / Impossible difficulty.
// Returns simple per-frame action intent objects that game.js can use
// for movement and combat without hardcoding AI behavior in the main loop.

export const AI_DIFFICULTIES = {
  dummy: {
    name: "Dummy",
    reactionFrames: 999999,
    attackChance: 0,
    heavyChance: 0,
    specialChance: 0,
    ultimateChance: 0,
    jumpChance: 0,
    retreatChance: 0,
    comboChance: 0,
    antiAirChance: 0,
    desiredRange: 120,
    aggression: 0
  },
  easy: {
    name: "Easy",
    reactionFrames: 18,
    attackChance: 0.32,
    heavyChance: 0.16,
    specialChance: 0.10,
    ultimateChance: 0.03,
    jumpChance: 0.05,
    retreatChance: 0.22,
    comboChance: 0.28,
    antiAirChance: 0.16,
    desiredRange: 145,
    aggression: 0.42
  },
  adaptive: {
    name: "Adaptive",
    reactionFrames: 10,
    attackChance: 0.52,
    heavyChance: 0.26,
    specialChance: 0.22,
    ultimateChance: 0.08,
    jumpChance: 0.10,
    retreatChance: 0.14,
    comboChance: 0.58,
    antiAirChance: 0.48,
    desiredRange: 125,
    aggression: 0.64
  },
  impossible: {
    name: "Impossible",
    reactionFrames: 4,
    attackChance: 0.84,
    heavyChance: 0.42,
    specialChance: 0.34,
    ultimateChance: 0.16,
    jumpChance: 0.14,
    retreatChance: 0.06,
    comboChance: 0.86,
    antiAirChance: 0.78,
    desiredRange: 105,
    aggression: 0.88
  }
}

function rand() {
  return Math.random()
}

function chance(value) {
  return rand() < value
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function sign(value) {
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}

function getCenterX(entity) {
  return (entity?.x || 0) + (entity?.width || 0) * 0.5
}

function getCenterY(entity) {
  return (entity?.y || 0) + (entity?.height || 0) * 0.5
}

function getHorizontalDistance(a, b) {
  return Math.abs(getCenterX(a) - getCenterX(b))
}

function getVerticalDistance(a, b) {
  return Math.abs(getCenterY(a) - getCenterY(b))
}

function isAirborne(entity) {
  return entity ? !entity.grounded : false
}

function isBusy(entity) {
  if (!entity) return false

  return !!(
    entity.hitstun > 0 ||
    entity.stun > 0 ||
    entity.recovery > 0 ||
    entity.attackRecovery > 0 ||
    entity.locked ||
    entity.isFrozen
  )
}

function getEnergy(entity) {
  return entity?.energy ?? entity?.mana ?? entity?.meter ?? 0
}

function getMaxEnergy(entity) {
  return entity?.maxEnergy ?? entity?.maxMana ?? entity?.maxMeter ?? 100
}

function getHealthRatio(entity) {
  const max = entity?.maxHealth || 100
  const hp = entity?.health ?? max
  return max > 0 ? hp / max : 1
}

function buildNeutralInput() {
  return {
    left: false,
    right: false,
    jump: false,
    lightAttack: false,
    heavyAttack: false,
    upAttack: false,
    downAir: false,
    ultimate: false,
    special1: false,
    special2: false
  }
}

function clearInput(input) {
  Object.keys(input).forEach((key) => {
    input[key] = false
  })
  return input
}

function press(input, action) {
  if (action in input) input[action] = true
}

function moveToward(input, fighter, opponent) {
  if (!fighter || !opponent) return

  const fighterX = getCenterX(fighter)
  const opponentX = getCenterX(opponent)

  if (fighterX < opponentX) {
    input.right = true
  } else if (fighterX > opponentX) {
    input.left = true
  }
}

function moveAway(input, fighter, opponent) {
  if (!fighter || !opponent) return

  const fighterX = getCenterX(fighter)
  const opponentX = getCenterX(opponent)

  if (fighterX < opponentX) {
    input.left = true
  } else if (fighterX > opponentX) {
    input.right = true
  }
}

function getFacingTowardOpponent(fighter, opponent) {
  return getCenterX(fighter) <= getCenterX(opponent)
}

function inferOpponentAction(opponent) {
  if (!opponent) return "idle"

  if (opponent.currentMove?.type === "projectile") return "projectile"
  if (opponent.currentMove?.type === "special") return "special"
  if (opponent.currentMove?.type === "ultimate") return "ultimate"
  if (opponent.currentMove?.type === "attack") return "attack"
  if (opponent.isAttacking) return "attack"
  if (isAirborne(opponent)) return "airborne"
  if (Math.abs(opponent.vx || 0) > 1.5) return "moving"
  return "idle"
}

function recordOpponentPattern(controller, opponent) {
  if (!controller || !opponent) return

  const action = inferOpponentAction(opponent)
  const last = controller.memory.lastObservedAction

  if (last !== action) {
    controller.memory.lastObservedAction = action
    controller.memory.observedActions.push(action)

    if (controller.memory.observedActions.length > 20) {
      controller.memory.observedActions.shift()
    }
  }
}

function getRepeatedAction(controller) {
  if (!controller) return null

  const counts = {}
  controller.memory.observedActions.forEach((action) => {
    counts[action] = (counts[action] || 0) + 1
  })

  let bestAction = null
  let bestCount = 0

  Object.entries(counts).forEach(([action, count]) => {
    if (count > bestCount) {
      bestAction = action
      bestCount = count
    }
  })

  return bestCount >= 4 ? bestAction : null
}

function getProfile(difficulty) {
  return AI_DIFFICULTIES[difficulty] || AI_DIFFICULTIES.easy
}

export function createAIController(difficulty = "easy") {
  return {
    enabled: true,
    difficulty,
    profile: getProfile(difficulty),
    frameCounter: 0,
    decisionCooldown: 0,
    currentPlan: "approach",
    lastInput: buildNeutralInput(),
    memory: {
      observedActions: [],
      lastObservedAction: null,
      comboBias: 0,
      zoningBias: 0,
      aggressionBias: 0
    }
  }
}

export function resetAIController(controller) {
  if (!controller) return createAIController()

  controller.frameCounter = 0
  controller.decisionCooldown = 0
  controller.currentPlan = "approach"
  controller.lastInput = buildNeutralInput()
  controller.memory = {
    observedActions: [],
    lastObservedAction: null,
    comboBias: 0,
    zoningBias: 0,
    aggressionBias: 0
  }

  return controller
}

export function setAIDifficulty(controller, difficulty) {
  if (!controller) return createAIController(difficulty)

  controller.difficulty = difficulty
  controller.profile = getProfile(difficulty)
  return controller
}

export function getAIDifficultyProfile(difficulty) {
  return getProfile(difficulty)
}

function chooseAdaptiveRange(controller, baseRange) {
  const repeatedAction = getRepeatedAction(controller)

  if (repeatedAction === "projectile") {
    return baseRange - 18
  }

  if (repeatedAction === "attack") {
    return baseRange + 12
  }

  return baseRange
}

function choosePlan(controller, fighter, opponent, world = {}) {
  const profile = controller.profile
  const distanceX = getHorizontalDistance(fighter, opponent)
  const distanceY = getVerticalDistance(fighter, opponent)
  const fighterAir = isAirborne(fighter)
  const opponentAir = isAirborne(opponent)
  const opponentBusy = isBusy(opponent)
  const fighterEnergy = getEnergy(fighter)
  const fighterMaxEnergy = getMaxEnergy(fighter)
  const energyRatio = fighterMaxEnergy > 0 ? fighterEnergy / fighterMaxEnergy : 0
  const healthRatio = getHealthRatio(fighter)

  let desiredRange = profile.desiredRange

  if (controller.difficulty === "adaptive") {
    desiredRange = chooseAdaptiveRange(controller, desiredRange)
  }

  if (controller.difficulty === "impossible" && opponentBusy && distanceX < 150) {
    return "pressure"
  }

  if (!fighterAir && opponentAir && distanceY < 130 && distanceX < 120 && chance(profile.antiAirChance)) {
    return "antiAir"
  }

  if (fighterAir && getCenterY(fighter) < getCenterY(opponent) - 20 && distanceX < 120) {
    return "airPressure"
  }

  if (!opponentBusy && distanceX > desiredRange + 70) {
    return "approach"
  }

  if (!opponentBusy && distanceX < desiredRange - 55 && chance(profile.retreatChance)) {
    return "retreat"
  }

  if (energyRatio > 0.85 && healthRatio < 0.55 && chance(profile.ultimateChance * 1.4)) {
    return "ultimate"
  }

  if (energyRatio > 0.35 && distanceX >= 90 && distanceX <= 220 && chance(profile.specialChance)) {
    return "special"
  }

  if (distanceX <= desiredRange + 20) {
    return opponentBusy ? "pressure" : "attack"
  }

  return "hold"
}

function applyMovementPlan(input, plan, fighter, opponent, profile) {
  switch (plan) {
    case "approach":
      moveToward(input, fighter, opponent)
      if (chance(profile.jumpChance * 0.35) && !isAirborne(fighter)) {
        press(input, "jump")
      }
      break

    case "retreat":
      moveAway(input, fighter, opponent)
      if (chance(profile.jumpChance * 0.55) && !isAirborne(fighter)) {
        press(input, "jump")
      }
      break

    case "hold":
      if (chance(profile.jumpChance * 0.18) && !isAirborne(fighter)) {
        press(input, "jump")
      }
      break

    case "pressure":
      moveToward(input, fighter, opponent)
      break

    case "airPressure":
      if (chance(0.6)) {
        moveToward(input, fighter, opponent)
      }
      break

    case "antiAir":
      break

    case "attack":
      if (chance(profile.aggression * 0.35)) {
        moveToward(input, fighter, opponent)
      }
      break

    case "special":
      if (chance(0.45)) {
        moveToward(input, fighter, opponent)
      }
      break

    default:
      break
  }
}

function chooseAttackAction(controller, fighter, opponent, input) {
  const profile = controller.profile
  const distanceX = getHorizontalDistance(fighter, opponent)
  const fighterAir = isAirborne(fighter)
  const opponentAir = isAirborne(opponent)
  const opponentBusy = isBusy(opponent)
  const energyRatio = getMaxEnergy(fighter) > 0 ? getEnergy(fighter) / getMaxEnergy(fighter) : 0

  if (controller.currentPlan === "ultimate" && energyRatio > 0.4) {
    press(input, "ultimate")
    return
  }

  if (controller.currentPlan === "antiAir" && !fighterAir) {
    press(input, "upAttack")
    return
  }

  if (controller.currentPlan === "special" && energyRatio > 0.1) {
    if (distanceX > 140 || chance(0.5)) {
      press(input, "special1")
    } else {
      press(input, "special2")
    }
    return
  }

  if (fighterAir) {
    if (getCenterY(fighter) < getCenterY(opponent) - 12 && distanceX < 110 && chance(0.44)) {
      press(input, "downAir")
      return
    }

    if (distanceX < 120 && chance(profile.attackChance)) {
      press(input, "lightAttack")
      return
    }
  }

  if (distanceX < 92) {
    if (opponentBusy && chance(profile.comboChance)) {
      if (chance(profile.heavyChance)) {
        press(input, "heavyAttack")
      } else {
        press(input, "lightAttack")
      }
      return
    }

    if (chance(profile.attackChance)) {
      if (chance(profile.heavyChance * 0.8) && !opponentAir) {
        press(input, "heavyAttack")
      } else {
        press(input, "lightAttack")
      }
      return
    }
  }

  if (distanceX >= 92 && distanceX <= 180 && energyRatio > 0.14 && chance(profile.specialChance * 0.8)) {
    press(input, "special1")
    return
  }

  if (!fighterAir && opponentAir && distanceX < 105 && chance(profile.antiAirChance * 0.8)) {
    press(input, "upAttack")
  }
}

function maybeJump(controller, fighter, opponent, input) {
  const profile = controller.profile
  const distanceX = getHorizontalDistance(fighter, opponent)

  if (isAirborne(fighter)) return
  if (input.jump) return

  if (distanceX > 180 && chance(profile.jumpChance * 0.35)) {
    press(input, "jump")
    return
  }

  if (distanceX < 90 && chance(profile.jumpChance * 0.12)) {
    press(input, "jump")
  }
}

function applyFacing(fighter, opponent) {
  if (!fighter || !opponent) return
  fighter.facingRight = getFacingTowardOpponent(fighter, opponent)
}

export function updateAIController(controller, fighter, opponent, world = {}) {
  if (!controller) controller = createAIController()
  if (!fighter || !opponent || !controller.enabled) {
    return buildNeutralInput()
  }

  const input = buildNeutralInput()

  controller.frameCounter += 1
  recordOpponentPattern(controller, opponent)
  applyFacing(fighter, opponent)

  if (isBusy(fighter)) {
    controller.lastInput = input
    return input
  }

  controller.decisionCooldown -= 1

  if (controller.decisionCooldown <= 0) {
    controller.currentPlan = choosePlan(controller, fighter, opponent, world)
    controller.decisionCooldown = controller.profile.reactionFrames
  }

  if (controller.difficulty === "dummy") {
    controller.lastInput = input
    return input
  }

  applyMovementPlan(input, controller.currentPlan, fighter, opponent, controller.profile)
  maybeJump(controller, fighter, opponent, input)
  chooseAttackAction(controller, fighter, opponent, input)

  controller.lastInput = input
  return input
}

export function getAIInput(controller, fighter, opponent, world = {}) {
  return updateAIController(controller, fighter, opponent, world)
}

export function getAIDifficultyLabel(difficulty) {
  return getProfile(difficulty).name
}