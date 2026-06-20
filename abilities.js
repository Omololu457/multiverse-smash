// abilities.js
// Central ability system — specials, ultimates, transformations, projectiles, summons.
// Each of the 7 starter characters has a fully implemented unique kit.

import { characters } from "./characters.js"
import { moveset }    from "./moveset.js"
import { sound }      from "./sound.js"
import { activateDomain } from "./domains.js"   // domains.js doesn't import abilities.js → no cycle
import { activeSummons, spawnSummon as spawnAssistSummon } from "./summons.js"
import {
  applyTransformation,
  updateTransformations,
  applyMahoraga
} from "./transformations.js"

export const activeProjectiles = []

// Frame-counted deferred spawns (replaces setTimeout, which used wall-clock time
// and ignored pause/hitstop/round-reset). Ticked by updatePendingSpawns() from
// the game loop; cleared by clearAbilityState() on round reset.
const pendingSpawns = []
export function schedulePendingSpawn(framesLeft, fn) {
  if (typeof fn === "function") pendingSpawns.push({ framesLeft: Math.max(1, framesLeft | 0), fn })
}
export function updatePendingSpawns() {
  for (let i = pendingSpawns.length - 1; i >= 0; i--) {
    const s = pendingSpawns[i]
    if (--s.framesLeft <= 0) {
      pendingSpawns.splice(i, 1)
      try { s.fn() } catch (_) {}
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const WORLD_WIDTH_FALLBACK  = 3200
const WORLD_HEIGHT_FALLBACK = 1600
const COMMAND_INPUT_MAX_AGE = 700
// Brief CHARGE windup (frames) before a charge→release special fires. The charge
// sprite strip plays during this window, then the projectile/attack spawns and the
// cast/fire strip plays. Ticked by the pending-spawn list (updatePendingSpawns).
const SPRITE_CHARGE_FRAMES = 8

// ─────────────────────────────────────────────────────────────────
// UTIL
// ─────────────────────────────────────────────────────────────────
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getAttackDuration(base, fighter) {
  return Math.max(8, Math.floor(base / (fighter?.attackSpeedMultiplier || 1)))
}

function canSpendEnergy(fighter, cost = 0) {
  if (!cost) return true
  if (fighter?.infiniteEnergy) return true   // Infinite Energy binding vow
  return (fighter?.energy || 0) >= cost
}

function spendEnergy(fighter, cost = 0) {
  if (!fighter || !cost) return true
  if (fighter.infiniteEnergy) return true   // vow: fire freely, never deduct
  if (!canSpendEnergy(fighter, cost)) return false
  fighter.energy = Math.max(0, (fighter.energy || 0) - cost)
  return true
}

// Domain expansions cost the FULL bar: require a 100%-full meter, then drain to 0.
// Combined with the 50% round-start energy, a domain can NEVER open at round start
// and only returns once the meter has fully refilled. Returns false if not full.
function spendFullBarForDomain(fighter) {
  if (!fighter) return false
  if (fighter.infiniteEnergy) return true   // vow keeps the bar full; don't zero it
  if ((fighter.energy || 0) < (fighter.maxEnergy || 0)) return false
  fighter.energy = 0
  return true
}

function isSpecialDisabled(fighter, moveName) {
  if (!fighter || !moveName) return false
  return Array.isArray(fighter.disabledSpecials) && fighter.disabledSpecials.includes(moveName)
}

function getTargetResolver(context) {
  if (typeof context?.getOpponent === "function") return context.getOpponent
  return (fighter) => (fighter?.side === "p1" ? context?.p2 : context?.p1)
}

function getWorldWidth(context) {
  return context?.worldWidth || WORLD_WIDTH_FALLBACK
}

function focusCameraOnAction(context, fighter, target, zoom = 1, frames = 10) {
  if (target && context?.camera?.focusBetween) {
    context.camera.focusBetween(fighter, target, zoom, frames)
  } else if (context?.camera?.focusOnFighter) {
    context.camera.focusOnFighter(fighter, zoom, frames)
  }
}

function shakeCamera(context, amount = 10, frames = 10) {
  if (context?.camera?.shake) context.camera.shake(amount, frames)
}

function setAttackState(fighter, attack, cooldownBase) {
  fighter.currentAttack  = attack
  fighter.attacking      = true
  fighter.currentMove    = attack.name
  fighter.currentMoveData = attack
  fighter.moveTimer      = 0
  fighter.movePhase      = "startup"
  fighter.hasHitThisMove = false
  fighter.attackCooldown = getAttackDuration(cooldownBase, fighter)
}

function createAttackFromMove(fighter, moveName, moveData = {}, fallback = {}) {
  const startup  = moveData.startup  || fallback.startup  || 10
  const active   = moveData.active   || fallback.active   || 5
  const recovery = moveData.recovery || fallback.recovery || 18
  const total    = getAttackDuration(startup + active + recovery, fighter)

  return {
    name:       moveName,
    damage:     moveData.damage || fallback.damage || 90,
    total,
    timer:      total,
    activeStart: Math.max(fallback.minActiveStart || 5, startup),
    activeEnd:   Math.max(fallback.minActiveEnd   || 9, startup + active),
    rangeX:     moveData.rangeX    || fallback.rangeX    || 85,
    rangeY:     moveData.rangeY    || fallback.rangeY    || 50,
    hitstun:    moveData.hitstun   || fallback.hitstun   || 26,
    pushX:      moveData.knockbackX || fallback.pushX    || 7,
    launchY:    moveData.knockbackY ?? fallback.launchY  ?? -8,
    launcher:   !!moveData.launcher,
    spike:      !!moveData.spike,
    hasHit:     false
  }
}

// ─────────────────────────────────────────────────────────────────
// DIRECTION / MOTION INPUT HELPERS
// ─────────────────────────────────────────────────────────────────
function normalizeMotionToken(token) {
  const t = String(token || "").trim().toLowerCase()
  if (t === "u" || t === "up")      return "U"
  if (t === "d" || t === "down")    return "D"
  if (t === "f" || t === "forward") return "F"
  if (t === "b" || t === "back")    return "B"
  return null
}

function endsWithPattern(list, pattern) {
  if (!Array.isArray(list) || list.length < pattern.length) return false
  // FORGIVING match (not pixel-frame-perfect): the pattern must appear IN ORDER
  // within the last (pattern.length + 1) recent inputs — tolerating ONE stray or
  // diagonal input so motions register reliably. Order is still required (D before
  // B/F), which keeps Blue (neutral) / Red (D,F) / Hollow Purple (D,B) distinct
  // and avoids false triggers from plain walking.
  const window = list.slice(-(pattern.length + 1))
  let pi = 0
  for (let i = 0; i < window.length && pi < pattern.length; i++) {
    if (window[i] === pattern[pi]) pi++
  }
  return pi === pattern.length
}

function getRelativeDirections(fighter, maxAge = COMMAND_INPUT_MAX_AGE) {
  if (!fighter) return []
  const now    = performance.now()
  const recent = (fighter.directionHistory || []).filter(d => now - d.time <= maxAge)
  return recent.map(d => {
    if (d.dir === "U" || d.dir === "D") return d.dir
    return (fighter.facing || 1) === 1
      ? (d.dir === "R" ? "F" : "B")
      : (d.dir === "L" ? "F" : "B")
  })
}

// ─────────────────────────────────────────────────────────────────
// PROJECTILE SPAWNING
// ─────────────────────────────────────────────────────────────────
export function spawnProjectile(attacker, type, moveData = {}, context = {}) {
  if (!attacker) return null

  const lower  = String(type || "").toLowerCase()
  const width  = moveData.w || moveData.width || (lower.includes("purple") ? 30 : 16)
  const height = moveData.h || moveData.height || width
  const speed  = moveData.speed || (lower.includes("purple") ? 14 : 11)

  const proj = {
    owner:      attacker,
    ownerId:    attacker.side,
    name:       type,
    x:          attacker.facing === 1 ? attacker.x + attacker.w + 4 : attacker.x - width - 4,
    y:          attacker.y + (attacker.h || 100) * 0.4,
    vx:         attacker.facing * speed,
    vy:         moveData.vy || 0,
    w:          width,
    h:          height,
    width,
    height,
    radius:     width / 2,
    damage:     moveData.damage || 90,
    hitstun:    moveData.hitstun || 18,
    knockbackX: moveData.knockbackX || 5,
    knockbackY: moveData.knockbackY || -2,
    lifetime:   moveData.lifetime || 110,
    color:      moveData.color || attacker.color || "#ffd166",
    // OPTIONAL projectile sprite (Task 3) — null until the user adds art. When a
    // `sheet` is set, ui.drawProjectiles animates it instead of the colored shape.
    sheet:        moveData.sheet        || null,
    spriteKey:    moveData.spriteKey    || null,
    spriteFrames: moveData.spriteFrames || 1,
    spriteW:      moveData.spriteW      || null,
    spriteH:      moveData.spriteH      || null,
    spriteSpeed:  moveData.spriteSpeed  || 4,
    spriteScale:  moveData.spriteScale  || 1
  }

  activeProjectiles.push(proj)
  return proj
}

export function spawnProjectileFromMove(fighter, moveName, moveData, context = {}) {
  return spawnProjectile(fighter, moveName, moveData, context)
}

// ─────────────────────────────────────────────────────────────────
// SUMMON SPAWNING
// ─────────────────────────────────────────────────────────────────
export function spawnCharacterSummon(fighter, moveName, moveData, context = {}) {
  if (!fighter || fighter.summonCooldown > 0) return false

  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)
  if (!target) return false

  spawnAssistSummon(
    fighter,
    { ...moveData, summon: true, summonId: moveData.summonId || moveName, damage: moveData.damage || 50 },
    target
  )

  fighter.summonCooldown = moveData.cooldown
    ? Math.ceil(moveData.cooldown / 4)
    : 45

  return true
}

// ─────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
//  CHARACTER-SPECIFIC SPECIAL EXECUTION
//  Each character has their own executeSpecial function that
//  properly implements their unique kit.
// ══════════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────

// ── GOKU ──────────────────────────────────────────────────────────
// Specials: Dragon Fist (melee rush), Kamehameha (projectile)
// Ultimate: Super Saiyan Blue (transformation stat boost)
function executeGokuSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  // QCF (D→F) = Kamehameha projectile
  if (endsWithPattern(dirs, ["D", "F"])) {
    if (!spendEnergy(fighter, 30)) return false
    spawnProjectile(fighter, "kamehameha", {
      damage: 120, speed: 13, lifetime: 130,
      hitstun: 22, knockbackX: 8, knockbackY: -2,
      color: "#60d0ff", w: 20, h: 20
    }, context)
    fighter.attackCooldown = getAttackDuration(28, fighter)
    focusCameraOnAction(context, fighter, target, 1.0, 8)
    return true
  }

  // Default = Dragon Fist — melee rush
  if (!spendEnergy(fighter, 40)) return false
  const attack = createAttackFromMove(fighter, "dragonFist", {
    damage: 150, startup: 10, active: 6, recovery: 22,
    hitstun: 28, knockbackX: 12, knockbackY: -6,
    rangeX: 95, rangeY: 55
  })
  setAttackState(fighter, attack, 26)
  fighter.vx = fighter.facing * 7
  focusCameraOnAction(context, fighter, target, 0.98, 10)
  shakeCamera(context, 8, 8)
  return true
}

function executeGokuUltimate(fighter, context) {
  if (!spendEnergy(fighter, 100)) return false
  // Trigger SSJ Blue transformation
  const nextFormIndex = (fighter.transformIndex || 0) + 1
  const order = fighter.transformationOrder || []
  if (nextFormIndex < order.length) {
    fighter.transformIndex = nextFormIndex
    const formKey  = order[nextFormIndex]
    const formData = fighter.transformations?.[formKey]
    if (formData) {
      applyTransformation(fighter, formKey)
      fighter.currentForm     = formKey
      fighter.currentFormData = formData
      fighter.teleportFlash   = 20
      fighter.attackCooldown  = 24
      shakeCamera(context, 12, 14)
      focusCameraOnAction(context, fighter, null, 0.96, 16)
    }
  }
  return true
}

// ── NARUTO ────────────────────────────────────────────────────────
// Specials: Rasengan (melee close-range), Shadow Clone Blast (summon)
// Ultimate: Sage Mode (transformation)
function executeNarutoSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  // B→F = Shadow Clone — projectile that chases
  if (endsWithPattern(dirs, ["B", "F"])) {
    if (!spendEnergy(fighter, 25)) return false
    spawnProjectile(fighter, "shadowClone", {
      damage: 80, speed: 9, lifetime: 90,
      hitstun: 18, knockbackX: 6, knockbackY: -1,
      color: "#ffd166", w: 18, h: 18
    }, context)
    // Spawn a second clone ~5 frames later (frame-counted, pause/reset-safe).
    schedulePendingSpawn(5, () => {
      if (activeProjectiles.length < 20) {
        spawnProjectile(fighter, "shadowClone2", {
          damage: 80, speed: 9, lifetime: 90, vy: -1,
          hitstun: 18, knockbackX: 6, knockbackY: -1,
          color: "#ffd166", w: 18, h: 18
        }, context)
      }
    })
    fighter.attackCooldown = getAttackDuration(22, fighter)
    return true
  }

  // Default = Rasengan — close-range high damage melee
  if (!spendEnergy(fighter, 35)) return false
  const attack = createAttackFromMove(fighter, "rasengan", {
    damage: 140, startup: 10, active: 5, recovery: 20,
    hitstun: 24, knockbackX: 10, knockbackY: -4,
    rangeX: 80, rangeY: 50
  })
  setAttackState(fighter, attack, 24)
  fighter.vx = fighter.facing * 5
  focusCameraOnAction(context, fighter, target, 0.99, 8)
  shakeCamera(context, 6, 6)
  return true
}

function executeNarutoUltimate(fighter, context) {
  if (!spendEnergy(fighter, 100)) return false
  // Enter Sage Mode (next transformation)
  const nextIdx = Math.min((fighter.transformIndex || 0) + 1, (fighter.transformationOrder?.length || 1) - 1)
  const formKey = fighter.transformationOrder?.[nextIdx]
  if (formKey && fighter.transformations?.[formKey]) {
    applyTransformation(fighter, formKey)
    fighter.transformIndex  = nextIdx
    fighter.currentForm     = formKey
    fighter.currentFormData = fighter.transformations[formKey]
    fighter.teleportFlash   = 18
    fighter.attackCooldown  = 22
    shakeCamera(context, 10, 12)
  }
  return true
}

// ── GOJO SATORU ───────────────────────────────────────────────────
// Specials: Blue (attract), Red (repel), Hollow Purple (convergence beam)
// Ultimate: Unlimited Void domain expansion
function executeGojoSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  // UP + Special = Teleport blink BEHIND the opponent (space-time contraction).
  // Cheap, short cooldown; usable on defense and to start combos. Checked FIRST
  // and via a strict last-input test so it stays distinct from neutral Blue, and
  // it uses its OWN cooldown so it never blocks Blue/Red/Hollow Purple.
  if (dirs.length > 0 && dirs[dirs.length - 1] === "U") {
    if ((fighter.teleportCooldown || 0) > 0) return false
    if (!spendEnergy(fighter, 8)) return false
    if (target) {
      const sw = context?.worldWidth || 3200
      fighter.x = (fighter.x < target.x) ? target.x + target.w + 8 : target.x - fighter.w - 8
      fighter.x = Math.max(0, Math.min(sw - fighter.w, fighter.x))
      fighter.y = target.y
      fighter.facing = (target.x >= fighter.x) ? 1 : -1   // face the opponent
      fighter.vx = 0; fighter.vy = 0                       // zero residual velocity
    }
    fighter.teleportFlash    = 16
    fighter.teleportCooldown = 120          // ~2s
    fighter.attackCooldown   = getAttackDuration(8, fighter)
    focusCameraOnAction(context, fighter, target, 1.0, 8)
    return true
  }

  // D→B = Hollow Purple — wide slow convergence beam. CHARGE → RELEASE (Task 1b).
  if (endsWithPattern(dirs, ["D", "B"])) {
    if (isSpecialDisabled(fighter, "hollowPurple")) return false   // binding vow (Limitless Sacrifice)
    if (!spendEnergy(fighter, 70)) return false
    fighter._spriteCastMove  = "hollow_purple_charge"   // CHARGE strip (gojo_hollowpurple_charge)
    fighter._spriteCastTimer = SPRITE_CHARGE_FRAMES
    fighter.attackCooldown   = getAttackDuration(38 + SPRITE_CHARGE_FRAMES, fighter)
    schedulePendingSpawn(SPRITE_CHARGE_FRAMES, () => {
      spawnProjectile(fighter, "hollowPurple", {
        damage: 200, speed: 10, lifetime: 150,
        hitstun: 32, knockbackX: 14, knockbackY: -4,
        color: "#c084fc", w: 32, h: 32
      }, context)
      fighter._spriteCastMove  = "hollowPurple"   // RELEASE → hollow_purple_cast strip
      fighter._spriteCastTimer = 36
      shakeCamera(context, 14, 12)
    })
    focusCameraOnAction(context, fighter, target, 0.93, 18)
    return true
  }

  // D+L (forward) = Red — repulsion burst. CHARGE → RELEASE (Task 1b). Checked AFTER
  // Hollow Purple (S,A+L = D,B) so the longer motion isn't shadowed by this one.
  if (endsWithPattern(dirs, ["F"])) {
    if (isSpecialDisabled(fighter, "red")) return false   // binding vow (Limitless Sacrifice)
    if (!spendEnergy(fighter, 40)) return false
    fighter._spriteCastMove  = "red_charge"             // CHARGE strip (gojo_ctr_charge)
    fighter._spriteCastTimer = SPRITE_CHARGE_FRAMES
    fighter.attackCooldown   = getAttackDuration(SPRITE_CHARGE_FRAMES + 2, fighter)
    schedulePendingSpawn(SPRITE_CHARGE_FRAMES, () => {
      const attack = createAttackFromMove(fighter, "red", {
        damage: 130, startup: 12, active: 5, recovery: 22,
        hitstun: 26, knockbackX: 12, knockbackY: -3,
        rangeX: 90, rangeY: 60
      })
      setAttackState(fighter, attack, 26)   // currentMove="red" → red_cast strip
      fighter._spriteCastMove  = null        // hand off to currentMove
      fighter._spriteCastTimer = 0
    })
    focusCameraOnAction(context, fighter, target, 0.98, 10)
    return true
  }

  // Default = Blue — attraction pull projectile. CHARGE → RELEASE (Task 1b).
  if (isSpecialDisabled(fighter, "blue")) return false   // binding vow (Limitless Sacrifice)
  if (!spendEnergy(fighter, 30)) return false
  fighter._spriteCastMove  = "blue_charge"   // CHARGE strip (gojo_lapse_blue)
  fighter._spriteCastTimer = SPRITE_CHARGE_FRAMES
  fighter.attackCooldown   = getAttackDuration(22 + SPRITE_CHARGE_FRAMES, fighter)
  schedulePendingSpawn(SPRITE_CHARGE_FRAMES, () => {
    spawnProjectile(fighter, "blue", {
      damage: 110, speed: 12, lifetime: 110,
      hitstun: 20, knockbackX: -6, knockbackY: -1, // negative = pulls toward Gojo
      color: "#60a5fa", w: 18, h: 18
    }, context)
    fighter._spriteCastMove  = "blue"   // RELEASE → blue_cast strip
    fighter._spriteCastTimer = 24
  })
  focusCameraOnAction(context, fighter, target, 1.0, 8)
  return true
}

function executeGojoUltimate(fighter, context) {
  if (!spendFullBarForDomain(fighter)) return false   // needs a FULL meter; drains to 0

  // Unlimited Void — create the ONE shared-array domain. activateDomain sets
  // rosterKey (so the void/video bg + in-range lock match), the white-flash,
  // camera shake, video restart, and domainBuff/activeDomainTimer. 30s.
  // cost:0 because energy was already spent above.
  // range: 1e5 makes the domain cover the ENTIRE map — the sure-hit zone
  // (updateDomains in-range branch) then applies to the opponent anywhere on the
  // stage, not just a circle around the caster. drawDomains skips the world ring
  // for gojo/sukuna so this huge radius isn't drawn.
  activateDomain(fighter, { cost: 0, duration: 30, range: 1e5 }, context)

  fighter.infinityActive   = true   // auto-dodge for the domain's duration
  fighter.attackCooldown   = getAttackDuration(44, fighter)
  fighter._spriteCastMove  = "domain"   // play the hand-sign 'domain' strip (BUG_8)
  fighter._spriteCastTimer = 40
  focusCameraOnAction(context, fighter, null, 0.88, 24)
  return true
}

// ── MEGUMI FUSHIGURO ──────────────────────────────────────────────
// Specials: 5 shadow summons (Divine Dogs, Nue, Toad, Rabbit Escape, Max Elephant)
// Ultimate: Mahoraga Ritual — permanent transformation for rest of match
function executeMegumiSpecial(fighter, context) {
  if (fighter.summonCooldown > 0) return false

  const dirs = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  let summonId  = "divineDogs"  // default
  let moveCost  = 20

  // D→F = Divine Dogs
  if (endsWithPattern(dirs, ["D", "F"]))  { summonId = "divineDogs";   moveCost = 20 }
  // F→D→F (DP) = Nue
  else if (endsWithPattern(dirs, ["F", "D", "F"])) { summonId = "nue";    moveCost = 25 }
  // B→F = Toad
  else if (endsWithPattern(dirs, ["B", "F"]))       { summonId = "toad";   moveCost = 20 }
  // D→U = Rabbit Escape
  else if (endsWithPattern(dirs, ["D", "U"]))       { summonId = "rabbitEscape"; moveCost = 15 }
  // D→B = Max Elephant
  else if (endsWithPattern(dirs, ["D", "B"]))       { summonId = "maxElephant";  moveCost = 35 }

  if (isSpecialDisabled(fighter, summonId)) return false
  if (!spendEnergy(fighter, moveCost)) return false

  const summonData = {
    divineDogs:   { damage: 95,  cooldown: 120, color: "#d1fae5" },
    nue:          { damage: 110, cooldown: 160, color: "#fde68a" },
    toad:         { damage: 70,  cooldown: 140, color: "#86efac" },
    rabbitEscape: { damage: 20,  cooldown: 180, color: "#f8fafc" },
    maxElephant:  { damage: 145, cooldown: 240, color: "#93c5fd" }
  }

  const data = summonData[summonId] || summonData.divineDogs

  spawnAssistSummon(
    fighter,
    { summonId, damage: data.damage, color: data.color },
    target
  )

  fighter.summonCooldown = Math.ceil(data.cooldown / 4)
  fighter.attackCooldown = getAttackDuration(18, fighter)
  // Play the summon-motion cast strip (MOVE_TO_ACTION maps the summonId to its
  // action key, e.g. divineDogs→divine_dogs). Same mechanism as Gojo's casts.
  fighter._spriteCastMove  = summonId
  fighter._spriteCastTimer = 30
  return true
}

function executeMegumiUltimate(fighter, context) {
  // Mahoraga Ritual — permanent one-way transformation
  if (isSpecialDisabled(fighter, "mahoragaRitual")) return false
  if (!spendEnergy(fighter, 100)) return false
  fighter._spriteCastMove  = "mahoragaRitual"   // MOVE_TO_ACTION → "ultimate" (makora strip)
  fighter._spriteCastTimer = 36
  return transformIntoMahoraga(fighter, context)
}

// ── SUKUNA ────────────────────────────────────────────────────────
// Specials: Cleave (wide melee), Dismantle (ranged slashing projectile)
// Ultimate: Malevolent Shrine domain expansion
function executeSukunaSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  // S,A+L (down→back) = Dismantle — ranged slash. LONGEST motion → checked first.
  if (endsWithPattern(dirs, ["D", "B"])) {
    if (isSpecialDisabled(fighter, "dismantle")) return false   // binding vow (Flame Focus)
    if (!spendEnergy(fighter, 35)) return false
    spawnProjectile(fighter, "dismantle", {
      damage: 140, speed: 13, lifetime: 100,
      hitstun: 24, knockbackX: 9, knockbackY: -2,
      color: "#f87171", w: 40, h: 22   // larger so the ranged slash actually reads on screen
    }, context)
    // BROKEN LINK FIX: play Sukuna's slash on the CASTER. spawnProjectile alone
    // left him idle while the projectile flew, so the move "didn't show". This
    // mirrors Gojo's projectile-special cast hook (_spriteCastTimer is ticked in
    // game.js updateMiscTimers; MOVE_TO_ACTION maps dismantle→dismantle strip).
    fighter._spriteCastMove  = "dismantle"
    fighter._spriteCastTimer = 24
    fighter.attackCooldown = getAttackDuration(24, fighter)
    return true
  }

  // D+L (forward) = Flame Arrow — explosive projectile (TASK 3). Checked after the
  // longer Dismantle motion so it isn't shadowed.
  if (endsWithPattern(dirs, ["F"])) {
    if (isSpecialDisabled(fighter, "flameArrow")) return false   // binding vow (True King)
    if (!spendEnergy(fighter, 35)) return false
    fighter._spriteCastMove  = "flame_arrow_charge"   // CHARGE strip (sukuna_firearrow_charge)
    fighter._spriteCastTimer = SPRITE_CHARGE_FRAMES
    fighter.attackCooldown   = getAttackDuration(26 + SPRITE_CHARGE_FRAMES, fighter)
    schedulePendingSpawn(SPRITE_CHARGE_FRAMES, () => {
      spawnProjectile(fighter, "flameArrow", {
        damage: 140, speed: 11, lifetime: 110,
        hitstun: 26, knockbackX: 11, knockbackY: -4,
        color: "#fb923c", w: 30, h: 24   // orange explosive bolt
      }, context)
      fighter._spriteCastMove  = "flame_arrow_fire"   // FIRE strip (sukuna_firearrow_fire)
      fighter._spriteCastTimer = 24
      shakeCamera(context, 8, 6)
    })
    return true
  }

  // Default = Cleave — wide melee slash
  if (!spendEnergy(fighter, 40)) return false
  const attack = createAttackFromMove(fighter, "cleave", {
    damage: 160, startup: 10, active: 6, recovery: 20,
    hitstun: 28, knockbackX: 11, knockbackY: -3,
    rangeX: 110, rangeY: 65  // extra wide hitbox
  })
  setAttackState(fighter, attack, 24)
  focusCameraOnAction(context, fighter, target, 0.97, 8)
  shakeCamera(context, 10, 8)
  return true
}

// Malevolent Dash (TASK 3): fast forward dash strike that BREAKS incoming
// projectiles and starts combos. Bound to double-tap-toward (game.js), so it's a
// movement-tech entry, not a triggerSpecial branch — hence its own cooldown field.
export function executeSukunaMalevolentDash(fighter) {
  if (!fighter || (fighter.malevolentDashCooldown || 0) > 0) return false
  if (!spendEnergy(fighter, 15)) return false
  // Break enemy projectiles near Sukuna as he dashes through.
  const cx = (fighter.x || 0) + (fighter.w || 0) / 2
  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const p = activeProjectiles[i]
    if (p && p.owner !== fighter && Math.abs((p.x ?? cx) - cx) < 170) activeProjectiles.splice(i, 1)
  }
  const attack = createAttackFromMove(fighter, "malevolentDash", {
    damage: 80, startup: 3, active: 5, recovery: 9,
    hitstun: 18, knockbackX: 7, knockbackY: -2, rangeX: 92, rangeY: 52
  })
  setAttackState(fighter, attack, 10)
  fighter.vx = (fighter.facing || 1) * 13      // fast forward burst
  fighter.malevolentDashCooldown = 48          // short cd (~0.8s) so it isn't an infinite
  fighter.teleportFlash = 8
  return true
}

function executeSukunaUltimate(fighter, context) {
  if (!spendFullBarForDomain(fighter)) return false   // needs a FULL meter; drains to 0

  // Malevolent Shrine — create the ONE shared-array domain. activateDomain sets
  // rosterKey (so the shrine bg + in-range chip/lock match), the white-flash,
  // camera shake, domainBuff/activeDomainTimer, AND Sukuna's bespoke voice line
  // + looping theme (its rosterKey==='sukuna' branch). 30s. Per-frame chip
  // damage is applied by updateDomains' sukuna branch. cost:0 (spent above).
  // range: 1e5 makes the domain cover the ENTIRE map — the sure-hit zone
  // (updateDomains in-range branch) then applies to the opponent anywhere on the
  // stage, not just a circle around the caster. drawDomains skips the world ring
  // for gojo/sukuna so this huge radius isn't drawn.
  activateDomain(fighter, { cost: 0, duration: 30, range: 1e5 }, context)

  fighter.attackCooldown   = getAttackDuration(44, fighter)
  fighter._spriteCastMove  = "domain"   // play the hand-sign 'domain' strip (BUG_8)
  fighter._spriteCastTimer = 40
  focusCameraOnAction(context, fighter, null, 0.85, 28)
  return true
}

// ── OMOLOLU ───────────────────────────────────────────────────────
// Specials: Analysis Strike (reads opponent, deals bonus damage based on combo count)
// Ultimate: Full Analysis (stacks damage multiplier each hit during window)
function executeOmoluSpecial(fighter, context) {
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)
  if (!spendEnergy(fighter, 30)) return false

  // Damage scales with how long the fight has gone (combo counter acts as analysis depth)
  const analysisBonus = Math.min(fighter.comboCounter || 0, 8) * 8
  const attack = createAttackFromMove(fighter, "analysisStrike", {
    damage:     130 + analysisBonus,
    startup:    10, active: 5, recovery: 20,
    hitstun:    22, knockbackX: 8, knockbackY: -2,
    rangeX: 88, rangeY: 52
  })
  setAttackState(fighter, attack, 22)
  focusCameraOnAction(context, fighter, target, 0.99, 8)
  return true
}

function executeOmoluUltimate(fighter, context) {
  if (!spendEnergy(fighter, 100)) return false

  // Full Analysis — 8 second window where each hit stacks damage multiplier
  fighter.isUltimateActive  = true
  fighter.ultimateTimer     = 480  // 8 seconds @ 60fps
  fighter.damageMultiplier  = (fighter.damageMultiplier || 1) * 1.2
  fighter.analysisStacking  = true  // flag checked in updateUltimates

  fighter.teleportFlash  = 12
  fighter.attackCooldown = getAttackDuration(28, fighter)
  shakeCamera(context, 8, 10)
  return true
}

// ── TOJI ──────────────────────────────────────────────────────────
// Specials: Inventory Smash (pure melee, no energy cost), Heavenly Restriction Dash
// Ultimate: Heavenly Restriction — speed/damage surge, no energy needed
// Toji has NO energy — all abilities cost 0 and rely on raw speed
function executeToji_Special(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  // F→F = Rapid dash strike — fast low damage
  if (endsWithPattern(dirs, ["F", "F"])) {
    const attack = createAttackFromMove(fighter, "rapidStrike", {
      damage: 65, startup: 4, active: 4, recovery: 10,
      hitstun: 14, knockbackX: 5, knockbackY: -1,
      rangeX: 72, rangeY: 44
    })
    setAttackState(fighter, attack, 14)
    fighter.vx = fighter.facing * 9  // anime-style speed burst
    return true
  }

  // Default = Inventory Smash — powerful melee
  const attack = createAttackFromMove(fighter, "inventorySmash", {
    damage: 155, startup: 8, active: 5, recovery: 18,
    hitstun: 26, knockbackX: 10, knockbackY: -3,
    rangeX: 90, rangeY: 55
  })
  setAttackState(fighter, attack, 22)
  fighter.vx = fighter.facing * 5
  focusCameraOnAction(context, fighter, target, 0.98, 8)
  shakeCamera(context, 8, 8)
  return true
}

// Toji's teleport-dash follow-up: the quick strike fired the instant he blinks
// behind the enemy (the blink/reposition is done by teleportBehindTarget in
// game.js). Movement tech, NOT an energy special — no cursed-energy cost.
export function tojiTeleportStrike(fighter) {
  if (!fighter) return false
  const attack = createAttackFromMove(fighter, "rapidStrike", {
    damage: 60, startup: 3, active: 4, recovery: 10,
    hitstun: 16, knockbackX: 5, knockbackY: -1,
    rangeX: 78, rangeY: 46
  })
  setAttackState(fighter, attack, 12)
  fighter.vx = fighter.facing * 4
  return true
}

// Toji ultimate — no energy cost
function executeToji_Ultimate(fighter, context) {
  // Heavenly Restriction surge — temporary extreme speed + damage
  fighter.isUltimateActive  = true
  fighter.ultimateTimer     = 480  // 8 seconds
  fighter.speedMultiplier   = (fighter.speedMultiplier || 1) * 1.8
  fighter.damageMultiplier  = (fighter.damageMultiplier || 1) * 1.6
  fighter.invulnTimer       = 30  // brief invulnerability on activation
  fighter.teleportFlash     = 20
  fighter.attackCooldown    = getAttackDuration(22, fighter)
  shakeCamera(context, 14, 16)
  focusCameraOnAction(context, fighter, null, 0.94, 18)
  return true
}

// ─────────────────────────────────────────────────────────────────
// MAHORAGA TRANSFORMATION (Megumi's Ultimate)
// ─────────────────────────────────────────────────────────────────
export function transformIntoMahoraga(fighter, context = {}) {
  if (!fighter) return false

  // Get Mahoraga's data from characters.js but DON'T replace the fighter object
  // Instead we apply Mahoraga's stats ON TOP of Megumi
  const mahoragaData = characters.mahoraga
  if (!mahoragaData) return false

  // Store original identity so HUD still shows correctly
  fighter.preTransformName = fighter.name

  // Apply Mahoraga's stats
  fighter.name             = "Mahoraga"
  fighter.maxHealth        = Math.max(fighter.health, 1600)
  fighter.damageMultiplier = 1.5
  fighter.speedMultiplier  = 0.9
  fighter.defenseMultiplier = 1.35
  fighter.color            = "#7c3aed"

  // Lock Megumi's summons
  fighter.disabledSpecials = ["divineDogs", "nue", "toad", "rabbitEscape", "maxElephant"]

  // Permanent flags
  fighter.permanentForm        = true
  fighter.oneWayTransformation = true
  fighter.deathRitual          = true
  fighter.ritualActive         = true
  fighter.currentForm          = "mahoraga"
  fighter.isMahoraga           = true

  // Mahoraga's adaptation system
  fighter.adaptationLevels = { melee: 0, projectile: 0, special: 0, domain: 0 }
  fighter.maxAdaptationLevel = 3

  fighter.teleportFlash  = 28
  fighter.attackCooldown = 32
  fighter.invulnTimer    = 45  // briefly invincible during ritual

  shakeCamera(context, 20, 24)
  focusCameraOnAction(context, fighter, null, 0.88, 28)

  return true
}

// ─────────────────────────────────────────────────────────────────
// MAHORAGA SPECIALS (used when isMahoraga = true)
// ─────────────────────────────────────────────────────────────────
function executeMahoragaSpecial(fighter, context) {
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)
  const dirs        = getRelativeDirections(fighter)

  // Wheel Rotation — wide powerful melee
  const adaptBonus = Object.values(fighter.adaptationLevels || {}).reduce((a, b) => a + b, 0) * 15
  const attack = createAttackFromMove(fighter, "wheelRotation", {
    damage:   180 + adaptBonus,
    startup:  16, active: 6, recovery: 26,
    hitstun:  28, knockbackX: 12, knockbackY: -4,
    rangeX:   115, rangeY: 70
  })
  setAttackState(fighter, attack, 30)
  shakeCamera(context, 12, 10)
  focusCameraOnAction(context, fighter, target, 0.96, 10)
  return true
}

function executeMahoragaUltimate(fighter, context) {
  // Adaptation — increase resistance to the last attack type received
  const levels = fighter.adaptationLevels || {}
  const types  = Object.keys(levels)
  let lowestType = types[0]
  types.forEach(t => { if ((levels[t] || 0) < (levels[lowestType] || 0)) lowestType = t })
  levels[lowestType] = Math.min((levels[lowestType] || 0) + 1, fighter.maxAdaptationLevel || 3)
  fighter.adaptationLevels = levels

  fighter.defenseMultiplier = (fighter.defenseMultiplier || 1) + 0.1
  fighter.teleportFlash     = 16
  fighter.attackCooldown    = getAttackDuration(24, fighter)
  shakeCamera(context, 8, 8)
  return true
}

// ─────────────────────────────────────────────────────────────────
// MAIN DISPATCH — triggerSpecial & triggerUltimate
// ─────────────────────────────────────────────────────────────────

export function triggerSpecial(fighter, context = {}) {
  if (!fighter) return false
  if (fighter.attackCooldown > 0 || fighter.hitstun > 0 || fighter.blockstun > 0) return false
  if (fighter.attacking) return false

  const key = (fighter.rosterKey || fighter.id || "").toLowerCase()

  // Mahoraga overrides Megumi when transformed
  if (fighter.isMahoraga) return executeMahoragaSpecial(fighter, context)

  switch (key) {
    case "goku":    return executeGokuSpecial(fighter, context)
    case "naruto":  return executeNarutoSpecial(fighter, context)
    case "gojo":    return executeGojoSpecial(fighter, context)
    case "megumi":  return executeMegumiSpecial(fighter, context)
    case "sukuna":  return executeSukunaSpecial(fighter, context)
    case "omololu": return executeOmoluSpecial(fighter, context)
    case "toji":    return executeToji_Special(fighter, context)
    default:        return executeFallbackSpecial(fighter, context)
  }
}

export function triggerUltimate(fighter, context = {}) {
  if (!fighter) return false
  if (fighter.attackCooldown > 0 || fighter.hitstun > 0 || fighter.blockstun > 0) return false
  if (fighter.attacking) return false
  if (isSpecialDisabled(fighter, "ultimate")) return false   // binding vow (Limitless Sacrifice / Assassin's Oath)

  const key = (fighter.rosterKey || fighter.id || "").toLowerCase()

  if (fighter.isMahoraga) return executeMahoragaUltimate(fighter, context)

  switch (key) {
    case "goku":    return executeGokuUltimate(fighter, context)
    case "naruto":  return executeNarutoUltimate(fighter, context)
    case "gojo":    return executeGojoUltimate(fighter, context)
    case "megumi":  return executeMegumiUltimate(fighter, context)
    case "sukuna":  return executeSukunaUltimate(fighter, context)
    case "omololu": return executeOmoluUltimate(fighter, context)
    case "toji":    return executeToji_Ultimate(fighter, context)
    default:        return executeFallbackUltimate(fighter, context)
  }
}

// ─────────────────────────────────────────────────────────────────
// FALLBACK (for any character not in the 7-character starter list)
// ─────────────────────────────────────────────────────────────────
function executeFallbackSpecial(fighter, context) {
  const specials = Object.entries(fighter?.specials || {})
  if (!specials.length) return false

  // Direction-selected specials, so EVERY character can reach all of their
  // specials (not just the first). Mirrors how the 7 starter characters work:
  //   neutral Special        → special #1
  //   Down  + Special        → special #2
  //   Forward + Special      → special #3  (usually the mobility move)
  //   Back  + Special        → special #4  (if present)
  const dirs = getRelativeDirections(fighter)
  let index = 0
  if      (endsWithPattern(dirs, ["B"]) && specials[3]) index = 3
  else if (endsWithPattern(dirs, ["F"]) && specials[2]) index = 2
  else if (endsWithPattern(dirs, ["D"]) && specials[1]) index = 1

  const [moveName, moveData] = specials[index]
  if (!spendEnergy(fighter, moveData.cost || 0)) return false

  if (moveData.subtype === "summon" || moveData.summonId) {
    return spawnCharacterSummon(fighter, moveName, moveData, context)
  }

  // Mobility-flavoured specials lunge the user forward for a reposition.
  if (moveData.subtype === "mobility") {
    fighter.vx = (fighter.facing || 1) * (moveData.dashSpeed || 22)
    fighter.teleportFlash = 8
  }

  const attack = createAttackFromMove(fighter, moveName, moveData, {
    startup: moveData.startup ?? 10, active: moveData.active ?? 5,
    recovery: moveData.recovery ?? 18, damage: moveData.damage ?? 90,
    rangeX: moveData.rangeX ?? 85, rangeY: moveData.rangeY ?? 50,
    hitstun: moveData.hitstun ?? 26, pushX: moveData.knockbackX ?? 7,
    launchY: moveData.knockbackY ?? -8
  })
  setAttackState(fighter, attack, 24)
  return true
}

function executeFallbackUltimate(fighter, context) {
  const ultimates = Object.entries(
    typeof fighter?.ultimate === "object" && !fighter.ultimate.name
      ? fighter.ultimate
      : { ultimate: fighter?.ultimate || {} }
  )
  if (!ultimates.length) return false

  const [moveName, moveData] = ultimates[0]
  if (!spendEnergy(fighter, moveData.cost || 100)) return false

  const attack = createAttackFromMove(fighter, moveName, moveData, {
    startup: 18, active: 8, recovery: 28, damage: 180,
    rangeX: 105, rangeY: 62, hitstun: 36, pushX: 10, launchY: -10
  })
  setAttackState(fighter, attack, 42)
  shakeCamera(context, 12, 10)
  return true
}

// ─────────────────────────────────────────────────────────────────
// TRANSFORMATION STATE UPDATE (called every frame per fighter)
// ─────────────────────────────────────────────────────────────────
export function triggerTransformation(fighter, context = {}) {
  if (!fighter?.transformations || !fighter.transformationOrder?.length) return false
  if (fighter.attackCooldown > 0 || fighter.hitstun > 0 || fighter.blockstun > 0) return false
  if (fighter.permanentForm || fighter.oneWayTransformation || fighter.deathRitual) return false

  const maxIdx = fighter.transformationOrder.length - 1
  if ((fighter.transformIndex || 0) >= maxIdx) return false

  fighter.transformIndex = (fighter.transformIndex || 0) + 1
  const nextForm = fighter.transformationOrder[fighter.transformIndex]

  // Opt-in ENERGY COST to enter a form (Adult Gon etc.). Existing forms set no
  // `cost`, so they transform for free exactly as before.
  const cost = fighter.transformations?.[nextForm]?.cost || 0
  if (cost > 0 && (fighter.energy || 0) < cost) {
    fighter.transformIndex--
    return false
  }

  const ok = applyTransformation(fighter, nextForm)

  if (!ok) {
    fighter.transformIndex--
    return false
  }

  if (cost > 0) fighter.energy = Math.max(0, (fighter.energy || 0) - cost)

  fighter.currentForm     = nextForm
  fighter.currentFormData = fighter.transformations?.[nextForm]
  fighter.teleportFlash   = 10
  fighter.attackCooldown  = 18

  focusCameraOnAction(context, fighter, null, 1.02, 14)
  return true
}

export function updateTransformationState(fighter, context = {}) {
  if (!fighter) return fighter

  updateTransformations(fighter, context.deltaMs || 1000 / 60)

  // Apply form stat multipliers
  if (fighter.currentFormData) {
    const form = fighter.currentFormData
    fighter.attackMultiplier  = form.attackMultiplier  || form.damageMultiplier || 1
    fighter.damageMultiplier  = form.damageMultiplier  || form.attackMultiplier || 1
    fighter.speedMultiplier   = form.speedMultiplier   || 1
    fighter.defenseMultiplier = form.defenseMultiplier || 1
  }

  return fighter
}

// ─────────────────────────────────────────────────────────────────
// ULTIMATE TIMER UPDATE (called every frame)
// ─────────────────────────────────────────────────────────────────
export function updateUltimates(fighter) {
  if (!fighter?.isUltimateActive) return

  fighter.ultimateTimer--

  // Omololu analysis stacking — each 60 frames increases multiplier
  if (fighter.analysisStacking && fighter.ultimateTimer % 60 === 0 && fighter.ultimateTimer > 0) {
    fighter.damageMultiplier = Math.min((fighter.damageMultiplier || 1) + 0.05, 2.5)
  }

  if (fighter.ultimateTimer <= 0) {
    fighter.isUltimateActive  = false
    fighter.analysisStacking  = false

    // Toji revert speed/damage (don't fully reset — keep some bonus)
    if ((fighter.rosterKey || "").toLowerCase() === "toji") {
      fighter.speedMultiplier  = Math.max(1, (fighter.speedMultiplier  || 1) / 1.8)
      fighter.damageMultiplier = Math.max(1, (fighter.damageMultiplier || 1) / 1.6)
    }

    // Omololu revert (keep a small permanent stack as reward for landing it)
    if ((fighter.rosterKey || "").toLowerCase() === "omololu") {
      fighter.damageMultiplier = Math.max(1, (fighter.damageMultiplier || 1) * 0.85)
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// PASSIVE SYSTEMS
// ─────────────────────────────────────────────────────────────────
export function applyGojoPassiveSystems(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "gojo") return

  if (fighter.infinityActive) {
    // Infinity drains energy while active
    if ((fighter.energy || 0) > 0) {
      fighter.energy = Math.max(0, fighter.energy - 0.14)
    } else {
      // Energy ran out → Infinity drops. TASK 5: depleting CE while Infinity is up
      // backlashes — a one-time small health penalty + a brief vulnerable stagger
      // (this branch runs only on the frame infinityActive flips off, so it's once).
      fighter.infinityActive = false
      if (!fighter.infiniteEnergy) {
        fighter.health  = Math.max(1, (fighter.health || 0) - (fighter.maxHealth || 1000) * 0.05)
        fighter.hitstun = Math.max(fighter.hitstun || 0, 18)   // briefly vulnerable
        fighter.teleportFlash = 12
      }
    }
  }
}

export function applyOmoluPassiveSystems(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "omololu") return

  // Passive: every 300 frames of combat, gain a small permanent atk boost (ramp mechanic)
  fighter._omoluTimer = (fighter._omoluTimer || 0) + 1
  if (fighter._omoluTimer >= 300) {
    fighter._omoluTimer     = 0
    fighter.damageMultiplier = Math.min((fighter.damageMultiplier || 1) + 0.02, 1.5)
  }
}

export function applyToji_Passive(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "toji") return

  // Toji: no energy but gains bonus speed when health drops below 50%
  if (!fighter._tojiHealthBoostApplied && (fighter.health || 0) < (fighter.maxHealth || 1000) * 0.5) {
    fighter.speedMultiplier         = Math.min((fighter.speedMultiplier || 1) + 0.15, 2.0)
    fighter._tojiHealthBoostApplied = true
  }
}

export function applyMahoragaPassive(fighter) {
  if (!fighter?.isMahoraga) return

  // Mahoraga: slowly adapt when taking hits (adaptation tracked externally in combat.js)
  // Each unique attack type that hits raises defense vs that type
  if (fighter.lastHitType && fighter.adaptationLevels) {
    const type = fighter.lastHitType
    if (fighter.adaptationLevels[type] != null) {
      fighter.adaptationLevels[type] = Math.min(
        (fighter.adaptationLevels[type] || 0) + 0.01,
        fighter.maxAdaptationLevel || 3
      )
    }
    fighter.lastHitType = null
  }
}

// ─────────────────────────────────────────────────────────────────
// ENERGY CHARGE (C key)
// ─────────────────────────────────────────────────────────────────
export function doEnergyCharge(fighter) {
  if (!fighter?.maxEnergy) return
  if (fighter.hitstun > 0 || fighter.blockstun > 0) return
  // Charging is slower than regen but intentional
  fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + 0.5)
}

// ─────────────────────────────────────────────────────────────────
// ENERGY REGEN (passive, per frame)
// ─────────────────────────────────────────────────────────────────
export function regenEnergy(fighter) {
  if (!fighter?.maxEnergy || fighter.maxEnergy <= 0) return
  if (fighter.infiniteEnergy) return   // vow: don't clamp the meter back down

  let regen = 0.06

  const key = (fighter.rosterKey || "").toLowerCase()
  if (key === "goku"   || key === "naruto") regen += 0.02
  if (key === "gojo"   || key === "megumi" || key === "sukuna") regen += 0.01
  if (key === "omololu") regen += 0.015
  if (fighter.domainBuff)      regen += 0.04
  if (fighter.energyRegenBoost) regen += 0.06

  fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + regen)
}

// ─────────────────────────────────────────────────────────────────
// PROJECTILE UPDATE (called each frame from game.js)
// ─────────────────────────────────────────────────────────────────
export function updateProjectiles(
  worldWidth  = WORLD_WIDTH_FALLBACK,
  worldHeight = WORLD_HEIGHT_FALLBACK
) {
  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const p = activeProjectiles[i]
    p.x += p.vx || 0
    p.y += p.vy || 0
    p.lifetime--

    if (
      p.lifetime <= 0 ||
      p.x < -80 || p.x > worldWidth + 80 ||
      p.y < -200 || p.y > worldHeight + 100
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

// ─────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────
export function clearAbilityState() {
  activeProjectiles.length = 0
  activeSummons.length     = 0
  pendingSpawns.length     = 0   // cancel any deferred spawns on round reset
}

// ─────────────────────────────────────────────────────────────────
// LEGACY EXPORTS (kept so game.js imports don't break)
// ─────────────────────────────────────────────────────────────────
export function performUltimate(fighter, context = {}) {
  return triggerUltimate(fighter, context)
}

export function executeAttack(attacker, target, moveName, context = {}) {
  // Thin wrapper used by older call sites
  if (!attacker || !target) return false
  return triggerSpecial(attacker, context)
}

export function activateUltimate(fighter) {
  if (!fighter) return
  fighter.isUltimateActive = true
  fighter.ultimateTimer    = (fighter.ultimate?.duration || 8) * 60
}
