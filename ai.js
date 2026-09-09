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

import { gameRng } from "./rng.js"   // Stage 11A: seeded gameplay RNG — all AI rolls route through rand()
import { templateForCharacter, applyTemplateToProfile } from "./aiTemplates.js"   // Part 2: per-character behavior templates

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

// ── PASSIVITY FLOOR ──────────────────────────────────────────────
// Deterministic anti-turtle. If the OPPONENT does nothing meaningful — no attack,
// grounded (not airborne), velocity ~0 — for a sustained streak of frames, the AI is
// FORCED to close distance and attack: no chance()/aggression/attackChance roll. The
// TRIGGER is identical for every combat tier (easy/adaptive/impossible) — same frame
// threshold, same guarantee; only the opener's QUALITY scales by tier once it fires
// (single light poke vs a real string, see PASSIVITY_STRING_MIN). Retune here.
const PASSIVITY_FLOOR_FRAMES  = 60    // consecutive idle frames before the floor engages (~1s @ 60fps)
const PASSIVITY_MOVE_VELOCITY = 1.0   // |vx| at/above this = a real move (walk), not friction residue → resets the streak
const PASSIVITY_STRIKE_RANGE  = 100   // within this horizontal gap the floor presses the attack; beyond it, it approaches
const PASSIVITY_STRING_MIN    = 0.5   // tiers with stringChance >= this open with a forced STRING; below → a single light

// ── SIGNATURE MOVES (Gojo only, for now) ─────────────────────────
// After decideSignatureMove commits to a plan, block it from re-triggering for this many
// frames so signatures don't fire back-to-back (reads as skillful, not janky/spammy).
const SIGNATURE_COOLDOWN_FRAMES = 90   // ~1.5s @ 60fps

// ── SIGNATURE MOTION ENABLER (generic, all characters) ───────────
// The move-recognition system (abilities.executeXSpecial → getRelativeDirections +
// endsWithPattern) picks WHICH special fires from the fighter's directionHistory. AI fighters
// never populate that history (game.js feeds it only from real p1 keydowns), so an AI special
// press always falls through to the NEUTRAL variant. This table maps a chosen _sigTarget to the
// exact RELATIVE motion (F/B/U/D — the same frame getRelativeDirections resolves to) that the
// move requires; applySignatureMotion() writes it into directionHistory the frame the special is
// pressed, so the game reads it as if a human input the motion. Empty [] = the NEUTRAL special
// (no directional prefix). GENERIC: add a target here for any future character; no per-character
// branching in the enabler itself. Motions verified against abilities.js executeXSpecial:
//   Gojo   — blue [] (neutral) | red F | hollowPurple D,B
//   Sukuna — cleave [] (neutral) | dismantle D,B | flameArrow F
//   Naruto — rasengan [] (neutral) | shadowClone D,F | chakraArm F,F   (forward-compat; layer TBD)
const SIGNATURE_MOTIONS = {
  blue: [],        red: ["F"],       hollowPurple: ["D", "B"],
  cleave: [],      dismantle: ["D", "B"], flameArrow: ["F"],
  rasengan: [],    shadowClone: ["D", "F"], chakraArm: ["F", "F"],
  ultimate: []     // fires on the dedicated ultimate key — no motion needed
}
const SIGNATURE_MOTION_FRAME_MS = 1000 / 60   // ~16.7ms — one frame of spacing between synthesized inputs

// Convert a RELATIVE direction (F/B/U/D) to the RAW key direction (L/R/U/D) that directionHistory
// stores, honoring the fighter's current facing — the exact inverse of getRelativeDirections.
function relToRaw(rel, facing) {
  if (rel === "U" || rel === "D") return rel
  if (rel === "F") return (facing || 1) >= 0 ? "R" : "L"
  return (facing || 1) >= 0 ? "L" : "R"   // "B"
}

// Write the motion for `target` into the AI fighter's directionHistory. Clears first (the AI's
// history is owned solely by this enabler — game.js only feeds real p1 input) so ONLY the intended
// motion is present, then stamps each entry ONE FRAME apart within the 700ms command window (newest
// last), so it reads as a real multi-frame motion in the correct order — not a same-instant dump.
function applySignatureMotion(fighter, target) {
  if (!fighter) return
  if (!Array.isArray(fighter.directionHistory)) fighter.directionHistory = []
  const seq = SIGNATURE_MOTIONS[target] || []
  fighter.directionHistory.length = 0            // neutral ([]) → empty history → the neutral special fires
  const now = (typeof performance !== "undefined" ? performance.now() : 0)
  const facing = fighter.facing || 1
  for (let i = 0; i < seq.length; i++) {
    const age = (seq.length - 1 - i) * SIGNATURE_MOTION_FRAME_MS   // oldest first; newest entry has age 0
    fighter.directionHistory.push({ dir: relToRaw(seq[i], facing), time: now - age })
  }
}

// Stage 11A: all AI decision rolls flow through the seeded gameplay RNG (not Math.random) so a match
// reproduces bit-identically from its seed. rand() is the single choke-point — chance() and every
// caller inherit determinism from it. (Voice picks stay on Math.random by design; see rng.js.)
function rand() {
  return gameRng.next()
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
    down: false,     // hold to crouch / down-motion (game maps to c.down; no longer guards)
    block: false,    // hold the dedicated GUARD input (game maps to c.block → fighter.isBlocking) — MK-feel Stage 1c
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

// PASSIVITY FLOOR — rolling streak of consecutive frames the OPPONENT has done nothing.
// Increments while they're idle; RESETS to 0 the instant they do anything meaningful:
// attack, leave the ground (jump), or move with real velocity. (A directional tap always
// shows up as velocity, so "no direction change" is covered by the velocity test — and we
// deliberately do NOT key off `facing`, which the engine auto-flips based on our own
// position and would false-reset as the AI crosses over.) Runs every frame, independent
// of the AI's own busy state, so the count reflects the opponent alone.
function updatePassivityStreak(controller, opponent) {
  if (!controller || !opponent) return
  const m = controller.memory
  const attacking = !!(opponent.attacking || opponent.currentMove)
  const airborne  = isAirborne(opponent)
  const moving     = Math.abs(opponent.vx || 0) >= PASSIVITY_MOVE_VELOCITY
  const meaningful = attacking || airborne || moving
  m.passiveStreak = meaningful ? 0 : (m.passiveStreak || 0) + 1
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
    templateKey: null,          // PART 2: per-character behavior template (set by applyAiTemplate)
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
      passiveStreak: 0,         // PASSIVITY FLOOR: consecutive idle-opponent frames
      _passivityForce: false,   // PASSIVITY FLOOR: floor engaged AND in strike range → guarantee the hit
      _sigCooldown: 0,          // SIGNATURE: frames until a signature move can fire again
      _sigTarget: null,         // SIGNATURE: chosen move id → drives motion synthesis (SIGNATURE_MOTIONS)
      _sigActive: false,        // SIGNATURE: current plan came from a signature layer this decision (gates motion synth)
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
    passiveStreak: 0,           // PASSIVITY FLOOR: consecutive idle-opponent frames
    _passivityForce: false,     // PASSIVITY FLOOR: floor engaged AND in strike range → guarantee the hit
    _sigCooldown: 0,            // SIGNATURE: frames until a signature move can fire again
    _sigTarget: null,           // SIGNATURE: chosen move id → drives motion synthesis (SIGNATURE_MOTIONS)
    _sigActive: false,          // SIGNATURE: current plan came from a signature layer this decision (gates motion synth)
    _arsenalKey: null,
    _arsenal: null
  }

  return controller
}

export function setAIDifficulty(controller, difficulty) {
  if (!controller) return createAIController(difficulty)

  controller.difficulty = difficulty
  // A per-character template (if one was applied) is layered on top of the difficulty profile so a
  // difficulty change keeps the character's fighting personality. "dummy" stays inert either way.
  if (controller.templateKey && difficulty !== "dummy") {
    controller.profile = applyTemplateToProfile(getProfile(difficulty), controller.templateKey)
  } else {
    controller.profile = getProfile(difficulty)
  }
  return controller
}

// PART 2 — apply a per-character behavior template. Resolves the template from the fighter's roster
// key + its own archetype data (aiTemplates.templateForCharacter), stores it on the controller, and
// rebuilds controller.profile as a CLONE of the current difficulty profile with the template's deltas
// applied (never mutates the shared AI_DIFFICULTIES object). No-op on the "dummy" training target.
export function applyAiTemplate(controller, rosterKey, charData) {
  if (!controller) return controller
  if (controller.difficulty === "dummy") { controller.templateKey = null; return controller }
  const key = templateForCharacter(rosterKey, charData)
  controller.templateKey = key
  controller.profile = applyTemplateToProfile(getProfile(controller.difficulty), key)
  return controller
}

export function getAiTemplateKey(controller) {
  return controller?.templateKey || null
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

// ─────────────────────────────────────────────────────────────────
// SIGNATURE-MOVE DECISION LAYER  (GOJO ONLY)
// ─────────────────────────────────────────────────────────────────
// Called from choosePlan ONLY when fighter.rosterKey === "gojo" (never invoked for anyone
// else → zero behavior change for other characters). Returns a plan string that OVERRIDES
// the normal plan for this decision, or null to fall through to the normal logic unchanged.
//
// GATE: one chance(situationalIQ) roll up front — fail → null immediately (so Dummy/Easy
// rarely engage this layer, Impossible engages often). If it passes, a prioritized checklist
// runs (first match wins), each branch ALSO rolling its own IQ-scaled probability.
//
// USES EXISTING SIGNALS (design note): energy via the shared getEnergy/getMaxEnergy helpers
// (same ones decideSituational/choosePlan use), distance via getHorizontalDistance, the
// per-character costs straight off fighter.specials (single source = characters.js). The
// scoped branches are range/energy/combo-driven, so they don't need the getCounterBias
// zoning/repeated read — but controller.memory._counter is there if a future branch wants it.
function decideSignatureMove(controller, fighter, opponent) {
  if ((controller.memory._sigCooldown || 0) > 0) return null   // COOLDOWN: no back-to-back signatures
  const profile = controller.profile
  const iq = profile.situationalIQ || 0
  if (iq <= 0) return null

  // TOP-LEVEL GATE — one roll. Fail → normal plan logic runs exactly as it does today.
  if (!chance(iq)) return null

  const arsenal   = analyzeArsenal(controller, fighter)
  const distanceX = getHorizontalDistance(fighter, opponent)
  const energy    = getEnergy(fighter)
  const maxEnergy = getMaxEnergy(fighter)
  const sp        = fighter.specials || {}
  const blueCost   = sp.blue?.cost         ?? 30
  const redCost    = sp.red?.cost          ?? 40
  const purpleCost = sp.hollowPurple?.cost ?? 70
  // "A domain is up": Gojo's own ult active, or either fighter trapped/frozen by a domain.
  // (decideSignatureMove's fixed signature has no `world`, so this reads per-fighter flags —
  // a proxy for the activeDomains array the AI isn't handed; flagged in the task report.)
  const domainActive = !!(fighter.isUltimateActive || fighter.domainFrozen || opponent.domainFrozen)
  // "mid-combo-on-Gojo": Gojo is in hitstun, or the opponent has a live combo counter running
  // (i.e. they're comboing us) — so we don't throw a slow special straight into a punish.
  const beingComboed = (fighter.hitstun || 0) > 0 || (opponent.comboCounter || 0) > 0

  // (a) DOMAIN ULTIMATE — energy maxed AND no domain currently active. Deliberately RARE
  //     even at high IQ (iq*0.3) since it's a huge commitment. Returns "ultimate", reusing
  //     the existing downstream ultimate/domain path (chooseAttackAction presses it).
  if (energy >= maxEnergy && !domainActive && chance(iq * 0.3)) {
    controller.memory._sigTarget = "ultimate"
    return "ultimate"
  }

  // (b) BLINK — opponent mid-attack & close (<150) OR lots of open space (>300); roll iq*0.5.
  //     SKIPPED (no roll consumed): Gojo HAS a blink — Up+Special = teleport, plus the
  //     double-tap `dashTeleport` movement — but NEITHER is reachable by the AI input model
  //     (the AI has no directionHistory and can't emit a timed double-tap), so there is no
  //     AI-usable blink to hook into today. Documented so the future input-pipeline task can
  //     wire it; for now we fall straight through to the special checklist. (See task report.)

  // (c) HOLLOW PURPLE — mid/far (150–300), enough meter, and NOT being comboed on. Roll iq*0.6.
  if (distanceX >= 150 && distanceX <= 300 && energy >= purpleCost && !beingComboed && chance(iq * 0.6)) {
    controller.memory._sigTarget = "hollowPurple"
    return "special"
  }

  // (d) RED — close-to-medium (<200) and enough meter for Red. Roll iq*0.5.
  if (distanceX < 200 && energy >= redCost && chance(iq * 0.5)) {
    controller.memory._sigTarget = "red"
    return "special"
  }

  // (e) BLUE (default) — any workable range with at least some meter. Roll iq*0.4.
  if (distanceX <= 380 && energy >= blueCost && chance(iq * 0.4)) {
    controller.memory._sigTarget = "blue"
    return "special"
  }

  // (f) nothing matched → fall through to normal logic.
  return null
}

// ─────────────────────────────────────────────────────────────────
// SIGNATURE-MOVE DECISION LAYER  (SUKUNA ONLY)
// ─────────────────────────────────────────────────────────────────
// Parallel to Gojo's decideSignatureMove — SAME architecture (cooldown → IQ gate →
// prioritized IQ-scaled menu, first match wins), SAME shared _sigCooldown constant.
// Called from choosePlan ONLY when fighter.rosterKey === "sukuna". Gojo's function above is
// left 100% untouched. Returns a plan string to override the plan, or null to fall through.
function decideSukunaSignatureMove(controller, fighter, opponent) {
  if ((controller.memory._sigCooldown || 0) > 0) return null   // shared COOLDOWN (same as Gojo)
  const profile = controller.profile
  const iq = profile.situationalIQ || 0
  if (iq <= 0) return null

  // TOP-LEVEL GATE — one roll (mirror of Gojo). Fail → normal plan logic runs unchanged.
  if (!chance(iq)) return null

  const distanceX = getHorizontalDistance(fighter, opponent)
  const energy    = getEnergy(fighter)
  const maxEnergy = getMaxEnergy(fighter)
  const sp        = fighter.specials || {}
  const cleaveCost    = sp.cleave?.cost    ?? 40
  const dismantleCost = sp.dismantle?.cost ?? 35
  const flameCost     = 35   // Flame Arrow (Fuga) isn't in specials{}; executeSukunaSpecial spends 35 inline
  const domainActive  = !!(fighter.isUltimateActive || fighter.domainFrozen || opponent.domainFrozen)
  // REUSE getCounterBias's repeated-action detection via the already-computed counter (refreshed
  // in updateAIController) — do NOT recompute it. "closeIn"/repeated "projectile" == opponent zoning.
  const counter   = controller.memory._counter || {}
  const oppZoning = (counter.closeIn || 0) > 0 || counter.repeated === "projectile"

  // (a) DOMAIN ULTIMATE (Malevolent Shrine) — energy maxed AND no domain up. Rare (iq*0.3),
  //     same weighting as Gojo. Returns "ultimate", reusing the existing domain path.
  if (energy >= maxEnergy && !domainActive && chance(iq * 0.3)) {
    controller.memory._sigTarget = "ultimate"
    return "ultimate"
  }

  // (b) CLOSE-DISTANCE DASH (Malevolent Dash) — condition: opponent far (>300) OR reading as
  //     zoning (oppZoning); would roll iq*0.5. SKIPPED (no roll consumed): executeSukunaMalevolentDash
  //     EXISTS, but it's a double-tap-toward teleport-strike wired ONLY for p1
  //     (detectDoubleTapDashTeleport(p1,…)) and needs keydown timing the AI can't emit — so, exactly
  //     like Gojo's blink last time, there is NO AI-reachable dash to hook into. Documented; we fall
  //     straight through to the special checklist. (oppZoning shown to prove the signal is wired.)
  void oppZoning

  // (c) MID-LONG RANGE SPECIAL — Dismantle (nearer) vs Flame Arrow / Fuga (farther) by spacing.
  //     Band 150–340; midpoint ~245 splits closer→Dismantle, farther→Flame Arrow. Roll iq*0.5.
  if (distanceX >= 150 && distanceX <= 340 && energy >= Math.min(dismantleCost, flameCost) && chance(iq * 0.5)) {
    controller.memory._sigTarget = (distanceX <= 245) ? "dismantle" : "flameArrow"
    return "special"
  }

  // (d) CLEAVE (default melee) — close range, enough meter for Cleave. Roll iq*0.4.
  if (distanceX < 200 && energy >= cleaveCost && chance(iq * 0.4)) {
    controller.memory._sigTarget = "cleave"
    return "special"
  }

  // (e) nothing matched → fall through to normal logic.
  return null
}

function choosePlan(controller, fighter, opponent, world = {}) {
  controller.memory._sigActive = false   // reset each decision; a signature layer below sets it true if it fires
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

  // GOJO-ONLY signature-move layer — a NEW step between the situational-tool refusal and the
  // normal plan logic. Invoked ONLY for Gojo (never even called for anyone else). On a hit it
  // arms the signature cooldown and overrides the plan; on null, normal logic runs unchanged.
  if (fighter.rosterKey === "gojo") {
    const sigPlan = decideSignatureMove(controller, fighter, opponent)
    if (sigPlan) {
      controller.memory._sigCooldown = SIGNATURE_COOLDOWN_FRAMES
      controller.memory._sigActive   = true   // gates motion synthesis for this signature cast
      return sigPlan
    }
  }

  // SUKUNA-ONLY signature-move layer — same shape/step as Gojo's above, separate function so
  // Gojo's checklist is untouched. Invoked ONLY for Sukuna; shares the same _sigCooldown constant.
  if (fighter.rosterKey === "sukuna") {
    const sigPlan = decideSukunaSignatureMove(controller, fighter, opponent)
    if (sigPlan) {
      controller.memory._sigCooldown = SIGNATURE_COOLDOWN_FRAMES
      controller.memory._sigActive   = true
      return sigPlan
    }
  }

  // Counter bias shifts the spacing the AI wants to keep.
  let desiredRange = chooseAdaptiveRange(controller, profile.desiredRange, counter)

  // TRICKSTER TEMPLATE (Part 2): occasionally throw out a deliberately non-optimal plan — a feint,
  // a random hop-back or dash-in — so the character reads as unpredictable rather than solving the
  // neutral cleanly. Gated so it stays a spice, not the whole diet. Skipped when airborne/pressured.
  if (profile._suboptimalChance > 0 && !fighterAir && !opponentBusy && chance(profile._suboptimalChance)) {
    const feints = ["retreat", "approach", "hold", "special"]
    return feints[Math.floor(rand() * feints.length)]
  }

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

  // BRUISER TEMPLATE (Part 2): "doesn't respect spacing" — never voluntarily gives ground. It presses
  // instead of retreating when crowded, so it reads as relentless forward pressure.
  if (!opponentBusy && distanceX < desiredRange - 55 && !profile._neverRetreat &&
      chance(profile.retreatChance + counter.spaceOut * 0.3)) {
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
      // Hold the dedicated GUARD input (MK-feel Stage 1c: game.js maps aiInput.block → keys[c.block] →
      // fighter.isBlocking; guarding is no longer on Down). Stand still — no move/attack/jump inputs —
      // so the guard isn't cancelled; chooseAttackAction and maybeJump both bail out on the "block" plan.
      press(input, "block")
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

  // ── PASSIVITY FLOOR — guaranteed opener ──────────────────────────
  // Set by the override in updateAIController only when the idle streak has crossed the
  // threshold AND we're in strike range. Fires with NO chance() gate. Quality scales by
  // tier: string-capable tiers (stringChance >= PASSIVITY_STRING_MIN) force a REAL string
  // via the existing startString/advanceString path; lower tiers throw a single light.
  // Continues an in-progress string first so a fresh string isn't re-queued mid-combo.
  if (controller.memory._passivityForce && !fighterAir) {
    const energyOk = energyRatio > 0.14
    if (advanceString(controller, input, closeRange || distanceX < 120, energyOk)) return
    if ((profile.stringChance || 0) >= PASSIVITY_STRING_MIN && (profile.maxStringLen || 0) > 0) {
      startString(controller, energyOk)
      if (advanceString(controller, input, true, energyOk)) return
    }
    press(input, "lightAttack")
    return
  }

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
  updatePassivityStreak(controller, opponent)   // PASSIVITY FLOOR: track opponent idleness every frame
  applyFacing(fighter, opponent)

  if (isBusy(fighter)) {
    controller.lastInput = input
    return input
  }

  controller.decisionCooldown -= 1
  if ((controller.memory._sigCooldown || 0) > 0) controller.memory._sigCooldown -= 1   // Gojo signature-move cooldown

  if (controller.decisionCooldown <= 0) {
    controller.memory._counter = getCounterBias(controller)   // refresh counter read
    controller.currentPlan = choosePlan(controller, fighter, opponent, world)
    controller.decisionCooldown = controller.profile.reactionFrames
  }

  if (controller.difficulty === "dummy") {
    controller.lastInput = input
    return input
  }

  // ── PASSIVITY FLOOR ──────────────────────────────────────────────
  // Deterministic override: once the opponent has been idle for the threshold streak,
  // FORCE the plan every frame — approach until in strike range, then attack — replacing
  // whatever probabilistic plan choosePlan produced. The trigger is identical for every
  // tier (only `passiveStreak` and the fixed threshold gate it); tier only affects the
  // opener's quality in chooseAttackAction via `_passivityForce`. The "dummy" training
  // target already returned above, so it is never dragged into this.
  if ((controller.memory.passiveStreak || 0) >= PASSIVITY_FLOOR_FRAMES) {
    const distanceX     = getHorizontalDistance(fighter, opponent)
    const inStrikeRange = distanceX <= PASSIVITY_STRIKE_RANGE && !isAirborne(fighter)
    controller.currentPlan       = inStrikeRange ? "attack" : "approach"
    controller.memory._passivityForce = inStrikeRange
  } else {
    controller.memory._passivityForce = false
  }

  applyMovementPlan(input, controller.currentPlan, fighter, opponent, controller.profile)
  maybeJump(controller, fighter, opponent, input)
  chooseAttackAction(controller, fighter, opponent, input)
  maybeToggleInfinity(controller, fighter, input)

  // SIGNATURE MOTION ENABLER — if this frame's action is a signature-driven special press,
  // synthesize the target move's motion into directionHistory BEFORE the input is handed back
  // (game.js applies the keys, then combat reads directionHistory this same frame), so the game
  // casts the SPECIFIC special (Hollow Purple/Red/Dismantle/…) rather than the neutral fallback.
  // Only fires for a signature special press (_sigActive) — normal special presses are untouched.
  if (controller.memory._sigActive && (input.special1 || input.special2)) {
    applySignatureMotion(fighter, controller.memory._sigTarget)
  }

  controller.lastInput = input
  return input
}

export function getAIInput(controller, fighter, opponent, world = {}) {
  return updateAIController(controller, fighter, opponent, world)
}

export function getAIDifficultyLabel(difficulty) {
  return getProfile(difficulty).name
}
