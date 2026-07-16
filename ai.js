// ai.js
// CPU controller logic for Easy / Adaptive / Impossible difficulty.
// Returns simple per-frame action intent objects that game.js can use
// for movement and combat without hardcoding AI behavior in the main loop.
//
// Behavior layers built on top of the base plan system (choosePlan /
// chooseAttackAction) — all data-driven off each fighter's own move data:
//   • ZONING     — characters whose neutral special is ranged/summon hold space
//                  and throw it at mid range instead of always closing (analyzeArsenal).
//   • SITUATIONAL — meter-full ultimates/domains at the right moment, and Gojo-style
//                  Infinity auto-dodge toggled ON when low/pressured (decideSituational).
//   • ADAPT      — getRepeatedAction is now actually COUNTERED (getCounterBias):
//                  jump-spam → anti-air, zoning → close in, turtle → grab/pressure,
//                  mash → space & whiff-punish.
//   • STRINGS    — in range the AI chains light→heavy→special instead of single pokes.
// Difficulty scales every layer (see the extra profile fields below).

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
    blockChance: 0,       // base chance/frame to hold guard vs an incoming attack (boosted vs special/ultimate)
    desiredRange: 120,
    aggression: 0,
    // ── new behavior tuning ──
    zoningChance: 0,      // propensity to hold space + throw a ranged tool
    adaptStrength: 0,     // how strongly repeated-pattern counters kick in (0..1)
    maxStringLen: 0,      // longest attack string it will chain
    stringChance: 0,      // chance to start a string vs a single poke
    situationalIQ: 0,     // quality/likelihood of Infinity/ultimate/domain timing (0..1)
    whiffPunish: 0        // chance to punish opponent recovery/whiff
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
    blockChance: 0.18,
    desiredRange: 145,
    aggression: 0.42,
    zoningChance: 0.22,
    adaptStrength: 0.20,
    maxStringLen: 2,
    stringChance: 0.30,
    situationalIQ: 0.20,
    whiffPunish: 0.18
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
    blockChance: 0.45,
    desiredRange: 125,
    aggression: 0.64,
    zoningChance: 0.50,
    adaptStrength: 0.62,
    maxStringLen: 3,
    stringChance: 0.60,
    situationalIQ: 0.62,
    whiffPunish: 0.55
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
    blockChance: 0.75,
    desiredRange: 105,
    aggression: 0.88,
    zoningChance: 0.70,
    adaptStrength: 0.95,
    maxStringLen: 4,
    stringChance: 0.90,
    situationalIQ: 0.95,
    whiffPunish: 0.85
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
    down: false,     // hold to crouch/guard (game maps to c.down → fighter.isBlocking)
    jump: false,
    lightAttack: false,
    heavyAttack: false,
    upAttack: false,
    downAir: false,
    ultimate: false,
    special1: false,
    special2: false,
    grab: false,     // throw — used to crack turtles (game maps to c.grab)
    toggle: false    // one-frame tap of c.charge → Gojo Infinity on/off
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

// ─────────────────────────────────────────────────────────────────
// ARSENAL ANALYSIS (data-driven, read from the fighter's own move data)
// ─────────────────────────────────────────────────────────────────
// Ranged intent is inferred from a special's subtype OR its effect text so we
// never hardcode a character. Melee/close specials stay for point-blank use.
const RANGED_KEYWORDS = /(projectile|beam|blast|ki blast|thrown|shuriken|rasengan|wave|needle|shockwave|orb|sphere|zone|ranged|portal|energy|singularity|convergence|bolt|shot|missile|fireball|breath)/i
const MELEE_HINT      = /(punch|slash(?!.*ranged)|claw|kick|smash|lunge|pounce|rush|dash|strike|cleave|step|charging)/i

// Classify a single special as usable at range. Summons count as "mid-range"
// pressure (they act away from the caster) so summoners can zone too.
function classifySpecialRange(sp) {
  if (!sp || typeof sp !== "object") return "melee"
  if (sp.subtype === "projectile") return "ranged"
  if (sp.subtype === "summon") return "mid"
  if (sp.subtype === "mobility") return "melee"     // gap-closer → wants to be in
  if (sp.subtype === "counter") return "melee"
  const fx = String(sp.effect || "")
  if (RANGED_KEYWORDS.test(fx)) return "ranged"
  return "melee"
}

// Read the WHOLE kit once (cached until the character/form changes). We care
// most about the NEUTRAL special (first entry) because pressing the special key
// fires that one — so the AI only commits to a "zone" plan when the neutral tool
// actually reaches. Directional-variant ranged tools (e.g. Sukuna's dismantle)
// don't flip a melee character into a zoner; those characters brawl instead.
function analyzeArsenal(controller, fighter) {
  const key = `${fighter?.rosterKey || fighter?.id || "?"}:${fighter?.currentForm || "base"}`
  if (controller.memory._arsenalKey === key && controller.memory._arsenal) {
    return controller.memory._arsenal
  }

  const specials = fighter?.specials && typeof fighter.specials === "object"
    ? Object.values(fighter.specials)
    : []
  const neutral = specials[0] || null
  const neutralRange = classifySpecialRange(neutral)

  let hasRanged = false, hasSummon = false, hasMobility = false
  let rangedCost = Infinity
  for (const sp of specials) {
    const r = classifySpecialRange(sp)
    if (r === "ranged" || r === "mid") { hasRanged = true; rangedCost = Math.min(rangedCost, sp.cost ?? 0) }
    if (sp?.subtype === "summon")   hasSummon = true
    if (sp?.subtype === "mobility") hasMobility = true
  }

  // Ultimate / domain classification from its effect text.
  const ult = fighter?.ultimate || null
  let ultKind = "none", ultCost = Infinity
  if (ult) {
    ultCost = ult.cost ?? 0
    const fx = String(ult.effect || "") + " " + String(ult.name || "")
    if (/auto-dodge|infinity/i.test(fx))            ultKind = "defensive"
    else if (/domain/i.test(fx))                    ultKind = "domain"
    else if (/transformation|triggers next|next ssj|form/i.test(fx)) ultKind = "buff"
    else if (/boost|surge|multiplier|speed|damage|regen|crit|mastery|might/i.test(fx)) ultKind = "buff"
    else ultKind = "buff"
  }

  // Infinity = Gojo's charge-tap auto-dodge toggle (also flagged by ult text).
  const hasInfinity = fighter?.rosterKey === "gojo" ||
                      /auto-dodge|infinity/i.test(String(ult?.effect || ""))

  const arsenal = {
    // zoner = the neutral (pressable) special is itself ranged/summon.
    zoner: neutralRange === "ranged" || neutralRange === "mid",
    hasRanged, hasSummon, hasMobility,
    rangedCost: rangedCost === Infinity ? 0 : rangedCost,
    neutralCost: neutral?.cost ?? 0,
    ultKind, ultCost,
    hasInfinity
  }

  controller.memory._arsenalKey = key
  controller.memory._arsenal    = arsenal
  return arsenal
}

// ─────────────────────────────────────────────────────────────────
// OPPONENT READING  (fixed: real runtime fields, cross-referenced to kit data)
// ─────────────────────────────────────────────────────────────────
function inferOpponentAction(opponent) {
  if (!opponent) return "idle"

  // Attacking: distinguish a thrown/ranged special from a melee poke by looking
  // up the move name in the opponent's OWN specials data. currentMove is a string
  // (e.g. "red", "rasengan"), not an object — the old `.type` check never fired.
  if (opponent.attacking || opponent.currentMove) {
    const moveName = opponent.currentMove
    const sp = moveName && opponent.specials ? opponent.specials[moveName] : null
    if (sp) return classifySpecialRange(sp) === "ranged" ? "projectile" : "special"
    if (opponent.attacking) return "attack"
  }
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

// Translate the dominant opponent habit into a concrete counter bias. Strength
// scales with difficulty (adaptStrength), so Easy barely reacts and Impossible
// hard-counters. Returns adjustments consumed by choosePlan/chooseAttackAction.
function getCounterBias(controller) {
  const strength = controller.profile.adaptStrength || 0
  const repeated = strength > 0 ? getRepeatedAction(controller) : null
  const bias = { repeated, rangeAdj: 0, antiAir: 0, closeIn: 0, pressure: 0, spaceOut: 0 }
  if (!repeated || !chance(strength)) return bias

  switch (repeated) {
    case "airborne":                 // they keep jumping → sit under them and anti-air
      bias.antiAir = strength; bias.rangeAdj = 10
      break
    case "projectile":               // they zone → get in and stay in
      bias.closeIn = strength; bias.rangeAdj = -60
      break
    case "idle":                     // they turtle → walk up and open them with grab/pressure
      bias.pressure = strength; bias.rangeAdj = -30
      break
    case "attack":                   // they mash → back off and whiff-punish
      bias.spaceOut = strength; bias.rangeAdj = 24
      break
    default:
      break
  }
  return bias
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
    toggleCooldown: 0,          // debounce for the Infinity tap
    infinityDesired: false,
    lastInput: buildNeutralInput(),
    memory: {
      observedActions: [],
      lastObservedAction: null,
      comboBias: 0,
      zoningBias: 0,
      aggressionBias: 0,
      stringQueue: [],          // queued attack-string actions (chained pokes)
      _arsenalKey: null,
      _arsenal: null
    }
  }
}

export function resetAIController(controller) {
  if (!controller) return createAIController()

  controller.frameCounter = 0
  controller.decisionCooldown = 0
  controller.currentPlan = "approach"
  controller.toggleCooldown = 0
  controller.infinityDesired = false
  controller.lastInput = buildNeutralInput()
  controller.memory = {
    observedActions: [],
    lastObservedAction: null,
    comboBias: 0,
    zoningBias: 0,
    aggressionBias: 0,
    stringQueue: [],
    _arsenalKey: null,
    _arsenal: null
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

// ─────────────────────────────────────────────────────────────────
// SITUATIONAL / SIGNATURE MOVES  (ultimates, domains, Infinity)
// ─────────────────────────────────────────────────────────────────
// Decides once per reaction window whether this is the moment for a big tool.
// Sets controller.currentPlan = "ultimate" and/or controller.infinityDesired.
// Returns true if it claimed the plan (so choosePlan can early-out).
function decideSituational(controller, fighter, opponent, arsenal) {
  const profile = controller.profile
  const iq = profile.situationalIQ || 0
  if (iq <= 0) return false

  const energy = getEnergy(fighter)
  const distanceX = getHorizontalDistance(fighter, opponent)
  const selfHp = getHealthRatio(fighter)
  const oppHp = getHealthRatio(opponent)
  const opponentBusy = isBusy(opponent)
  const underPressure = (!!opponent?.attacking && distanceX < 150) ||
                        getRepeatedAction(controller) === "attack"

  // 1) Infinity — Gojo's defensive toggle. ON when hurt or pressured; OFF once
  //    healthy AND wanting to hard-commit offense point-blank.
  if (arsenal.hasInfinity) {
    const hpGate = 0.30 + iq * 0.28              // smarter AI turns it on earlier
    const wantOn = selfHp < hpGate || underPressure
    const wantOff = selfHp > 0.75 && distanceX < 80 && !underPressure && chance(0.4)
    controller.infinityDesired = wantOn && !wantOff
  }

  // 2) Ultimate / domain — needs meter, good timing, and IQ roll.
  if (arsenal.ultKind !== "none" && energy >= arsenal.ultCost && chance(iq)) {
    let go = false
    if (arsenal.ultKind === "defensive") {
      go = selfHp < 0.5 || underPressure              // survive / swing momentum
    } else if (arsenal.ultKind === "domain") {
      go = (opponentBusy || oppHp < 0.5 || selfHp > 0.6) && distanceX < 240
    } else { // buff / transformation — snowball while you can act
      go = distanceX < 260 && (selfHp > 0.35 || oppHp < 0.5)
    }
    if (go) { controller.currentPlan = "ultimate"; return true }
  }

  return false
}

function chooseAdaptiveRange(controller, baseRange, counter) {
  return baseRange + (counter?.rangeAdj || 0)
}

function choosePlan(controller, fighter, opponent, world = {}) {
  const profile = controller.profile
  const arsenal = analyzeArsenal(controller, fighter)
  const counter = getCounterBias(controller)
  const distanceX = getHorizontalDistance(fighter, opponent)
  const distanceY = getVerticalDistance(fighter, opponent)
  const fighterAir = isAirborne(fighter)
  const opponentAir = isAirborne(opponent)
  const opponentBusy = isBusy(opponent)
  const fighterEnergy = getEnergy(fighter)
  const fighterMaxEnergy = getMaxEnergy(fighter)
  const energyRatio = fighterMaxEnergy > 0 ? fighterEnergy / fighterMaxEnergy : 0
  const healthRatio = getHealthRatio(fighter)

  // Signature/situational tools get first refusal (data-driven per character).
  if (decideSituational(controller, fighter, opponent, arsenal)) {
    return controller.currentPlan   // "ultimate"
  }

  // Counter bias shifts the spacing the AI wants to keep.
  let desiredRange = chooseAdaptiveRange(controller, profile.desiredRange, counter)

  if (controller.difficulty === "impossible" && opponentBusy && distanceX < 150) {
    return "pressure"
  }

  // Anti-air: reinforced when they've been jump-happy (counter.antiAir).
  const antiAirRoll = clamp(profile.antiAirChance + counter.antiAir * 0.4, 0, 1)
  if (!fighterAir && opponentAir && distanceY < 140 && distanceX < 130 && chance(antiAirRoll)) {
    return "antiAir"
  }

  if (fighterAir && getCenterY(fighter) < getCenterY(opponent) - 20 && distanceX < 120) {
    return "airPressure"
  }

  // DEFENSE — hold block against an incoming attack. Reactive ONLY: the opponent must
  // be actively attacking and in range, so it stays baitable/punishable rather than a
  // permanent turtle (when they're idle the AI never blocks). Telegraphed specials/
  // ultimates get a boosted roll so higher-tier AI won't eat them for free. The re-
  // decision cadence (reactionFrames) already makes higher difficulty react faster.
  // Grounded only — air defense stays movement-based.
  if (!fighterAir && opponent?.attacking && distanceX < 170) {
    const atk = opponent.currentAttack
    let blockRoll = profile.blockChance
    if (atk?.isUltimate)     blockRoll = clamp(blockRoll * 1.8, 0, 0.98)
    else if (atk?.isSpecial) blockRoll = clamp(blockRoll * 1.4, 0, 0.95)
    if (chance(blockRoll)) return "block"
  }

  // If the opponent is zoning us, close in / jump in rather than sit at range.
  if (counter.closeIn > 0 && distanceX > desiredRange && !opponentBusy) {
    return "approach"
  }

  // ZONE: only when our neutral special actually reaches, we have the meter, and
  // we're not being told to close in. Keeps distance and throws it.
  if (arsenal.zoner && !counter.closeIn &&
      fighterEnergy >= arsenal.neutralCost &&
      distanceX >= 150 && distanceX <= 380 &&
      chance(profile.zoningChance)) {
    return "zone"
  }

  if (!opponentBusy && distanceX > desiredRange + 70) {
    return "approach"
  }

  if (!opponentBusy && distanceX < desiredRange - 55 && chance(profile.retreatChance + counter.spaceOut * 0.3)) {
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
  const distanceX = getHorizontalDistance(fighter, opponent)

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

    case "block":
      // Hold Down to guard (game.js maps aiInput.down → keys[c.down] → fighter.isBlocking).
      // Stand still — no move/attack/jump inputs — so the guard isn't cancelled;
      // chooseAttackAction and maybeJump both bail out on the "block" plan.
      press(input, "down")
      break

    case "zone":
      // Maintain throwing distance: drift back if they close, hold otherwise.
      if (distanceX < 170) {
        moveAway(input, fighter, opponent)
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

    case "ultimate":
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

// ─────────────────────────────────────────────────────────────────
// ATTACK STRINGS  (chain pokes instead of single-hit-and-reset)
// ─────────────────────────────────────────────────────────────────
const STRING_TEMPLATES = [
  ["lightAttack", "lightAttack", "heavyAttack"],
  ["lightAttack", "heavyAttack", "special1"],
  ["lightAttack", "heavyAttack"],
  ["heavyAttack", "special1"],
  ["lightAttack", "lightAttack", "heavyAttack", "special1"]
]

function startString(controller, energyOk) {
  const maxLen = controller.profile.maxStringLen || 0
  if (maxLen <= 0) return
  let tpl = STRING_TEMPLATES[Math.floor(rand() * STRING_TEMPLATES.length)].slice(0, maxLen)
  if (!energyOk) tpl = tpl.filter(a => a !== "special1")   // drop the special ender if no meter
  controller.memory.stringQueue = tpl
}

// Pop and press the next queued string action. Returns true if it acted.
function advanceString(controller, input, inRange, energyOk) {
  const q = controller.memory.stringQueue
  if (!q || q.length === 0) return false
  if (!inRange) { controller.memory.stringQueue = []; return false }
  let next = q.shift()
  if (next === "special1" && !energyOk) next = "heavyAttack"
  press(input, next)
  return true
}

function chooseAttackAction(controller, fighter, opponent, input) {
  if (controller.currentPlan === "block") return   // committed to guarding — no attacks this frame
  const profile = controller.profile
  const arsenal = analyzeArsenal(controller, fighter)
  const counter = controller.memory._counter || { antiAir: 0, pressure: 0, spaceOut: 0 }
  const distanceX = getHorizontalDistance(fighter, opponent)
  const fighterAir = isAirborne(fighter)
  const opponentAir = isAirborne(opponent)
  const opponentBusy = isBusy(opponent)
  const energyRatio = getMaxEnergy(fighter) > 0 ? getEnergy(fighter) / getMaxEnergy(fighter) : 0
  const closeRange = distanceX < 96

  if (controller.currentPlan === "ultimate" && getEnergy(fighter) >= (arsenal.ultCost || 0)) {
    press(input, "ultimate")
    return
  }

  if (controller.currentPlan === "antiAir" && !fighterAir) {
    press(input, "upAttack")
    return
  }

  // ZONE: fire the neutral special from range (best-effort ranged tool).
  if (controller.currentPlan === "zone" && !fighterAir) {
    if (getEnergy(fighter) >= arsenal.neutralCost) {
      press(input, "special1")
    } else if (closeRange && chance(profile.attackChance)) {
      press(input, "lightAttack")   // out of meter but they got in — poke
    }
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

  // Continue an in-progress string before deciding anything new.
  if (advanceString(controller, input, closeRange || distanceX < 120, energyRatio > 0.14)) {
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

  // Anti-turtle: when they hold still and we're on top of them, mix in a grab.
  if (closeRange && counter.pressure > 0 && !opponentBusy && chance(counter.pressure * 0.5)) {
    press(input, "grab")
    return
  }

  // Whiff-punish: they committed to an attack and we're spaced to counter → heavy.
  if (!closeRange && distanceX < 150 && !fighterAir && counter.spaceOut > 0 &&
      opponent?.attacking && chance(profile.whiffPunish)) {
    press(input, "heavyAttack")
    return
  }

  if (closeRange) {
    // In range: prefer to START A STRING (chained pokes) over a lone hit.
    if (chance(profile.stringChance) && !fighterAir) {
      startString(controller, energyRatio > 0.14)
      if (advanceString(controller, input, true, energyRatio > 0.14)) return
    }

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
  if (controller.currentPlan === "zone") return    // don't hop out of our throw stance
  if (controller.currentPlan === "block") return   // don't hop out of our guard

  if (distanceX > 180 && chance(profile.jumpChance * 0.35)) {
    press(input, "jump")
    return
  }

  if (distanceX < 90 && chance(profile.jumpChance * 0.12)) {
    press(input, "jump")
  }
}

// Edge-triggered Infinity toggle: pulse c.charge for ONE frame when our desired
// state differs from the live state, then debounce so it reads as a tap not a hold.
function maybeToggleInfinity(controller, fighter, input) {
  controller.toggleCooldown -= 1
  const arsenal = controller.memory._arsenal
  if (!arsenal?.hasInfinity) return
  if (controller.toggleCooldown > 0) return
  if (!!fighter.infinityActive !== controller.infinityDesired) {
    press(input, "toggle")
    controller.toggleCooldown = 40
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
    controller.memory._counter = getCounterBias(controller)   // refresh counter read
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
  maybeToggleInfinity(controller, fighter, input)

  controller.lastInput = input
  return input
}

export function getAIInput(controller, fighter, opponent, world = {}) {
  return updateAIController(controller, fighter, opponent, world)
}

export function getAIDifficultyLabel(difficulty) {
  return getProfile(difficulty).name
}
