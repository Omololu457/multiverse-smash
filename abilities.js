// abilities.js
// Central ability system — specials, ultimates, transformations, projectiles, summons.
// Each of the 7 starter characters has a fully implemented unique kit.

import { characters } from "./characters.js"
import { moveset }    from "./moveset.js"
import { sound }      from "./sound.js"
import { activateDomain } from "./domains.js"   // domains.js doesn't import abilities.js → no cycle
import { activateKuramaUltimate } from "./kurama.js"   // Naruto ult cinematic (kurama.js imports neither → no cycle)
import { resolveGrab } from "./combat.js"   // shared grab pipeline (combat.js doesn't import abilities.js → no cycle)
import {
  activeSummons, spawnSummon as spawnAssistSummon,
  summonShadowClone, dispelShadowClones, countShadowClones,
  spawnClonePuff,        // cosmetic smoke poof (reused by Kawarimi — no clone involvement)
  consumeShadowClones    // pop N clones for the multi-clone combo tier (lossy share)
} from "./summons.js"
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
// Universal ultimate cooldown (frames @60fps): after ANY character's ultimate fires,
// the ultimate input is dead until this drains, so a refilled meter can't instantly
// recast. Set in triggerUltimate, ticked down in game.updateMiscTimers. Retune here.
const ULTIMATE_COOLDOWN_FRAMES = 1200   // 20s @ 60fps
// Brief CHARGE windup (frames) before a charge→release special fires. The charge
// sprite strip plays during this window, then the projectile/attack spawns and the
// cast/fire strip plays. Ticked by the pending-spawn list (updatePendingSpawns).
const SPRITE_CHARGE_FRAMES = 8
// Charge phase length per Gojo special = the FULL play length of its charge strip
// (frames × speed) so the windup ANIMATION completes before the release spawns.
// (blue_charge 4×4=16 · red_charge 5×4=20 · hollow_purple_charge 7×4=28.)
const GOJO_CHARGE = { blue: 16, red: 20, hollowPurple: 28 }

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
    spriteScale:  moveData.spriteScale  || 1,
    // OPTIONAL lingering damage-over-time stamped on the target when this projectile
    // connects (resolveProjectileHits) — e.g. Naruto Rasenshuriken's wind-chip.
    dot:        moveData.dot        || null,
    // Pure-visual projectiles (e.g. an in-place AOE ring bloom): skipped by hit
    // resolution so they never stun/despawn on contact — they fade out via lifetime.
    visualOnly: moveData.visualOnly || false
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
// Naruto's chakra is a SHARED POOL split evenly across all live bodies (himself +
// clones). His usable SHARE = energy / bodyCount, so an ability costing C requires
// energy >= C * bodyCount; the pool is then charged the single cost C. More clones
// → less usable chakra each (the "cost" of running clones).
function narutoBodyCount(fighter) { return 1 + countShadowClones(fighter) }
function spendNarutoChakra(fighter, cost) {
  const bodies = narutoBodyCount(fighter)
  if ((fighter.energy || 0) < cost * bodies) return false   // share must cover the cost
  return spendEnergy(fighter, cost)
}

// 3-WAY CHAKRA SPLIT for multi-clone COMBO casts (#16-18). The cost is shared evenly
// across every live body, so the pool is charged baseCost / (cloneCount + 1). With 2
// clones out that's Naruto + 2 clones = a 3-way split → he pays a THIRD of the nominal
// cost. This is the established `energy / (cloneCount + 1)` share model.
function spendCloneComboChakra(fighter, baseCost) {
  const bodies = narutoBodyCount(fighter)            // Naruto + N clones (= cloneCount + 1)
  const share  = Math.ceil(baseCost / bodies)        // baseCost / (cloneCount + 1)
  if ((fighter.energy || 0) < share) return false
  return spendEnergy(fighter, share)
}

// A GUARANTEED clone-combo hit: spawn `type`'s orb ALREADY overlapping the target so
// combat.resolveProjectileHits connects it the same frame (no spacing/whiff), running the
// normal damage pipeline (global scale, hit sparks, damage numbers). Reuses the Rasengan
// orb FX. `dirSign` sets which side the hit knocks toward; `offsetX` places it front/back.
function spawnGuaranteedCloneHit(fighter, target, type, opts = {}, context = {}) {
  if (!target) return null
  const proj = spawnProjectile(fighter, type, {
    speed: 0, lifetime: opts.lifetime || 16,
    damage: opts.damage || 60, hitstun: opts.hitstun || 18,
    knockbackX: opts.knockbackX || 6, knockbackY: opts.knockbackY ?? -3,
    color: opts.color || "#38bdf8", w: opts.w || 28, h: opts.h || 28,
    sheet: "./naruto_kcm_fx_rasengan_sphere.png",
    spriteFrames: 4, spriteW: 64, spriteH: 85, spriteSpeed: 4, spriteScale: opts.spriteScale || 0.55
  }, context)
  if (proj) {
    proj.x  = target.x + (target.w || 0) / 2 + (opts.offsetX || 0)   // overlap the target
    proj.y  = target.y + (target.h || 100) * 0.4
    proj.vx = (opts.dirSign || 1) * 0.01   // sign only (resolveProjectileHits reads proj.vx>0 for knockback dir)
  }
  return proj
}

// #21 CLONE RENDAN STORM — taijutsu-string extension. Called from game.js each time Naruto's
// BASIC light-string hit connects while clones are alive: every live clone (up to 3) piles on
// with a quick guaranteed follow-up, chaining extra flurry hits onto the J,J,J string — more
// clones alive → more hits. Reuses the same schedulePendingSpawn + spawnGuaranteedCloneHit
// pattern the special-tier combos use. Clones are NOT consumed (they keep joining the string
// until popped) and there is NO meter cost — this is a basic-string extension, not a cast.
// Returns how many flurry hits were queued.
export function applyCloneRendanStorm(fighter, target, context = {}) {
  if (!fighter || !target) return 0
  const n = Math.min(countShadowClones(fighter), 3)   // one flurry hit per live clone, cap 3
  for (let i = 0; i < n; i++) {
    schedulePendingSpawn(4 + i * 5, () => {            // staggered so they read as a chained flurry
      spawnGuaranteedCloneHit(fighter, target, "rasengan", {
        damage: 22, hitstun: 12, knockbackX: 3, knockbackY: -1,
        dirSign: fighter.facing, offsetX: (i - 1) * 10, w: 24, h: 24, spriteScale: 0.4
      }, context)
      shakeCamera(context, 3, 3)
    })
  }
  return n
}

// Rasengan-family charge tuning. Holding P (charge) then pressing Special reads the
// SAME held-charge state Gojo/Ben use — fighter.isCharging + fighter._chargeDownTime,
// both set in game.updateMovementInput EARLIER in the same frame (before triggerSpecial
// runs in updatePlayerCombat). All four moves are meter-cost solo specials (spendEnergy);
// none touch the shadow-clone pool / chakra-split math (spendNarutoChakra left unused).
const NARUTO_FULL_CHARGE_MS  = 600   // hold P ≥ this while pressing Special → Rasenshuriken
const NARUTO_BIGBALL_WINDUP  = 14    // scripted growth windup before Big Ball fires
const NARUTO_SHURIKEN_WINDUP = 20    // longer spin-up windup before Rasenshuriken releases

function executeNarutoSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  // D→F = SHADOW CLONE spawn (Down-Forward + Special). Cap 3; over cap → no-op.
  // No upfront chakra cost — the cost is the pool split (summons.js). Puff on spawn.
  // UNCHANGED — shadow-clone mechanic, outside this task's scope.
  if (endsWithPattern(dirs, ["D", "F"])) {
    // Audio/visual sequencing lives in summonShadowClone: first press = clip + short camera
    // beat + poof-synced delayed spawn; repeats within the window spawn silently. Cap/chakra
    // unchanged (returns false only when a FIRST press is already at cap).
    if (!summonShadowClone(fighter, target, { onFocus: () => focusCameraOnAction(context, fighter, null, 1.02, 12) })) return false
    fighter.attackCooldown = getAttackDuration(16, fighter)
    shakeCamera(context, 5, 5)
    return true
  }

  // D→B = DISPEL all clones (Down-Back + Special). Each lost share is gone for good.
  // UNCHANGED — shadow-clone mechanic, outside this task's scope.
  if (endsWithPattern(dirs, ["D", "B"])) {
    if (!dispelShadowClones(fighter)) return false            // no clones → nothing
    fighter.attackCooldown = getAttackDuration(10, fighter)
    return true
  }

  // CHAKRA ARM GRAB (shroud-gated) — F→F (double-tap toward the opponent) + Special, ONLY
  // at shroud stage 3+ (deep shroud, when Kurama's chakra arms manifest). Reuses the SHARED
  // grab pipeline: combat.resolveGrab sets the grab state and the standard updateGrab() (run
  // each frame in game.js) does the pop-up-and-drop throw — the ONLY difference is a longer
  // reach (NARUTO_CHAKRA_ARM_RANGE vs the default 75px). Below stage 3 this input falls
  // through to the normal Rasengan handling. A whiff (out of range / teched) still commits
  // recovery so it isn't a free spam.
  if ((fighter.shroudStage || 0) >= 3 && endsWithPattern(dirs, ["F", "F"])) {
    const NARUTO_CHAKRA_ARM_RANGE = 170
    const grabbed = resolveGrab(fighter, target, context, NARUTO_CHAKRA_ARM_RANGE)
    fighter._spriteCastMove  = "rasengan_cast"   // reach pose (no dedicated arm-grab strip)
    fighter._spriteCastTimer = 24
    // Chakra-arm reach FX toward the target (Kurama fox-arm art; visualOnly so it never hits).
    const arm = spawnProjectile(fighter, "chakraArm", {
      damage: 0, speed: 0, lifetime: 20, w: 60, h: 40, visualOnly: true, color: "#f97316",
      sheet: fighter.facing >= 0 ? "./naruto_kcm_fx_fox_right.png" : "./naruto_kcm_fx_fox_left.png",
      spriteFrames: 1, spriteScale: 0.7
    }, context)
    if (arm) {
      arm.x = target ? (fighter.x + fighter.w / 2 + target.x + target.w / 2) / 2 : fighter.x + fighter.facing * 60
      arm.y = fighter.y + (fighter.h || 100) * 0.4
    }
    if (!grabbed) fighter.attackCooldown = getAttackDuration(20, fighter)   // whiff recovery
    focusCameraOnAction(context, fighter, target, 0.98, 10)
    shakeCamera(context, 6, 6)
    return true
  }

  // ── RASENGAN FAMILY — solo specials, meter-cost only, ZERO clone involvement ──

  // HOLD-CHARGE branch: player is holding P (charge) as they press Special. The held
  // duration selects the move — full charge → Rasenshuriken (can't release early);
  // anything short of that → a Big Ball Rasengan whose size + damage scale with charge.
  if (fighter.isCharging) {
    // #20 TEAM CHAKRA-ORB ASSIST / COMBINED RASENGAN — needs 3 clones. Holding charge with
    // all 3 clones out, Naruto + the 3 clones form the KOMA 5A "team orb" pose and lift ONE
    // large combined sphere, thrown as a SINGLE big hit (vs #19's three separate orbs). Gated
    // AHEAD of Rasenshuriken/Big Ball so a full-team hold becomes the combined orb; with 0-2
    // clones this whole branch is skipped and the normal charge specials fire unchanged.
    // Consumes all 3 clones; pays the 4-way chakra split (Naruto + 3 clones).
    // FLAG: intended team-pose art (naruto_kcm_5_koma_special_a_body/_scene/_arms_big +
    // fx_5_koma_special_a_orb) not yet on disk → the orb reuses the Rasengan sphere sheet
    // (scaled up), same fallback convention as Dark Rasengan's ring bloom.
    if (countShadowClones(fighter) >= 3) {
      if (!spendCloneComboChakra(fighter, 40)) return false
      consumeShadowClones(fighter, 3)                 // whole team commits to the one orb
      fighter._spriteCastMove  = "rasengan_cast"      // team-lift pose (no dedicated 5A strip on disk)
      fighter._spriteCastTimer = 28
      fighter.attackCooldown   = getAttackDuration(30, fighter)
      schedulePendingSpawn(6, () => {                 // brief windup, then the combined sphere lands
        spawnGuaranteedCloneHit(fighter, target, "rasengan", {
          damage: 200, hitstun: 30, knockbackX: 12, knockbackY: -6, dirSign: fighter.facing,
          w: 60, h: 60, spriteScale: 1.1            // one BIG orb (single hit, not a barrage)
        }, context)
        sound.playSfxFile("naruto_rasengan.mp3", null)
        shakeCamera(context, 11, 9)
      })
      focusCameraOnAction(context, fighter, target, 0.97, 12)
      return true
    }

    const heldMs = performance.now() - (fighter._chargeDownTime || performance.now())

    // RASENSHURIKEN — FULL charge required. Strongest non-clone special: high cost,
    // high damage, PLUS a lingering wind-chip DOT applied on hit (see resolveProjectileHits).
    if (heldMs >= NARUTO_FULL_CHARGE_MS) {
      if (!spendEnergy(fighter, 80)) return false
      fighter._spriteCastMove  = "rasenshuriken_cast"   // 6-koma body spin-up on the caster
      fighter._spriteCastTimer = NARUTO_SHURIKEN_WINDUP + 18
      fighter.attackCooldown   = getAttackDuration(NARUTO_SHURIKEN_WINDUP + 30, fighter)
      schedulePendingSpawn(NARUTO_SHURIKEN_WINDUP, () => {
        spawnProjectile(fighter, "rasenshuriken", {
          damage: 260, speed: 14, lifetime: 130,
          hitstun: 34, knockbackX: 15, knockbackY: -3,
          color: "#7dd3fc", w: 40, h: 36,
          sheet: "./naruto_kcm_fx_rasenshuriken.png",
          spriteFrames: 2, spriteW: 186, spriteH: 106, spriteSpeed: 2, spriteScale: 0.85,
          // lingering wind-chip DOT: 5 extra ticks of 8 dmg, one every 12 frames after the hit.
          dot: { ticks: 5, interval: 12, dmg: 8 }
        }, context)
        sound.playSfxFile("naruto_rasenshuriken.mp3", null)   // release/throw cue (same beat as its FX)
        shakeCamera(context, 8, 8)
      })
      focusCameraOnAction(context, fighter, target, 0.98, 10)
      return true
    }

    // BIG BALL RASENGAN — released before full charge. Steps through the sphere-growth
    // strip during the windup; size + damage scale with how long P was held, capped.
    if (!spendEnergy(fighter, 55)) return false
    const chargeT = Math.min(heldMs / NARUTO_FULL_CHARGE_MS, 1)   // 0..1 partial charge
    const dmg  = Math.round(150 + 60 * chargeT)   // 150 → 210 damage
    const size = Math.round(34 + 26 * chargeT)    // 34 → 60 px sphere (visual)
    fighter._spriteCastMove  = "rasengan_cast"     // 4-koma body while the sphere grows
    fighter._spriteCastTimer = NARUTO_BIGBALL_WINDUP + 12
    fighter.attackCooldown   = getAttackDuration(NARUTO_BIGBALL_WINDUP + 22, fighter)
    // Big Ball is STILL a close-range rush — just a bigger, charged ram (never thrown).
    // The growth windup plays, then on release Naruto lunges in and connects a MELEE hitbox
    // (bigger reach/knockback than base). Deferred setAttackState = same as Gojo Red's release.
    schedulePendingSpawn(NARUTO_BIGBALL_WINDUP, () => {
      const attack = createAttackFromMove(fighter, "bigBallRasengan", {
        damage: dmg, startup: 2, active: 6, recovery: 20,
        hitstun: 30, knockbackX: 13, knockbackY: -4,
        rangeX: 78 + Math.round(24 * chargeT), rangeY: 62   // reach grows a touch with charge
      })
      setAttackState(fighter, attack, 22)
      fighter.vx = fighter.facing * 7              // dash in to ram it home
      const orb = spawnProjectile(fighter, "bigBallRasenganOrb", {
        damage: 0, speed: 0, lifetime: 22, w: size, h: size, visualOnly: true,
        color: "#38bdf8", sheet: "./naruto_kcm_fx_rasengan_sphere.png",
        spriteFrames: 4, spriteW: 64, spriteH: 85, spriteSpeed: 3, spriteScale: 0.6 + 0.5 * chargeT
      }, context)
      if (orb) {
        orb.x  = fighter.x + (fighter.facing >= 0 ? fighter.w : 0)
        orb.y  = fighter.y + (fighter.h || 100) * 0.4
        orb.vx = fighter.facing * 7
      }
      sound.playSfxFile("naruto_rasengan.mp3", null)   // ram cue (same Rasengan sound as base)
      shakeCamera(context, 6 + Math.round(4 * chargeT), 6)
    })
    focusCameraOnAction(context, fighter, target, 0.99, 8)
    return true
  }

  // #18 / #22 SUBSTITUTION CHAIN — Block+Special during an INCOMING attack WHILE clones are
  // in reserve: a clone takes Naruto's place (no-sell) instead of spending meter. Pops ONE
  // clone per use, so the SAME input scales with the reserve — 2 clones = Double Substitution
  // Chain (#18, two no-sells), 3 clones = TRIPLE SUBSTITUTION WALL (#22, three separate taps
  // no-selling three separate incoming hits). No cap beyond the live clone count; once the
  // clones run out the SAME input falls through to the meter-cost Kawarimi below (untouched).
  // Reuses the Clone-Substitution idea: consume the swing + brief i-frames. Checked BEFORE
  // Kawarimi so clone-shares are spent first while any remain.
  if (fighter.isBlocking && countShadowClones(fighter) >= 1) {
    const t = target && target.currentAttack
    const incoming = !!(t && target.attacking && !t.hasHit &&
      ((t.total || 0) - (t.timer || 0)) <= (t.activeEnd || 0))
    if (incoming) {
      consumeShadowClones(fighter, 1)                 // a clone eats the hit (pop, lose its share)
      t.hasHit = true                                  // the swing whiffs, guaranteed — no damage
      fighter.invulnTimer   = Math.max(fighter.invulnTimer || 0, 12)
      fighter.teleportFlash = 14
      spawnClonePuff(fighter.x + fighter.w / 2, fighter.y + (fighter.h || 100) / 2)
      fighter.vx = -fighter.facing * 4                 // light hop back (lighter than Kawarimi's teleport)
      fighter.attackCooldown = getAttackDuration(14, fighter)
      focusCameraOnAction(context, fighter, target, 1.0, 8)
      return true
    }
    // blocking with clones but nothing incoming → fall through (Kawarimi window is also closed).
  }

  // BLOCK + SPECIAL, during a WHIFF-PUNISH WINDOW = KAWARIMI SUBSTITUTION — defensive
  // teleport-swap. Only usable while the opponent has an active/about-to-land attack
  // (not a free anytime button); with no incoming attack this falls through to Dark
  // Rasengan (both are Down+Special — block = holding Down). Meter cost, NOT a clone
  // share. On success the incoming swing is CONSUMED (whiffs cleanly, no damage) using
  // the same hasHit pattern the domain / Gojo auto-dodge escapes use, then Naruto poofs
  // out (reusing the exact clone smoke FX) and re-appears behind the opponent.
  if (fighter.isBlocking) {
    const threat = target && target.currentAttack
    // Window = from the attack's startup through the end of its active frames
    // (elapsed = total - timer ≤ activeEnd), and it hasn't already connected.
    const incoming = !!(threat && target.attacking && !threat.hasHit &&
      ((threat.total || 0) - (threat.timer || 0)) <= (threat.activeEnd || 0))
    if (incoming) {
      if (!spendEnergy(fighter, 25)) return false
      threat.hasHit = true                                        // the swing whiffs, guaranteed
      fighter.invulnTimer   = Math.max(fighter.invulnTimer || 0, 14)  // also covers stray projectiles
      fighter.teleportFlash = 16
      spawnClonePuff(fighter.x + fighter.w / 2, fighter.y + (fighter.h || 100) / 2)   // poof OUT
      // WINDUP (startup) → re-appear behind the opponent (reposition math = Gojo's
      // Up+Special blink) with a second poof. attackCooldown = startup + recovery gives
      // it a real recovery tail (same frame-shape all Naruto specials use) so it's a
      // committed defensive tool, not a zero-downside panic button.
      const KAWARIMI_STARTUP = 6
      fighter.attackCooldown = getAttackDuration(KAWARIMI_STARTUP + 20, fighter)
      schedulePendingSpawn(KAWARIMI_STARTUP, () => {
        if (target) {
          const sw = context?.worldWidth || 3200
          fighter.x = (fighter.x < target.x) ? target.x + target.w + 8 : target.x - fighter.w - 8
          fighter.x = Math.max(0, Math.min(sw - fighter.w, fighter.x))
          fighter.y = target.y
          fighter.facing = (target.x >= fighter.x) ? 1 : -1
          fighter.vx = 0; fighter.vy = 0
        }
        spawnClonePuff(fighter.x + fighter.w / 2, fighter.y + (fighter.h || 100) / 2)   // poof IN
      })
      focusCameraOnAction(context, fighter, target, 1.0, 8)
      return true
    }
    // block+special with nothing incoming → not a valid Kawarimi; fall through below.
  }

  // TOAD SUMMON (Gamakichi-style) — B→F (Back→Forward + Special). A summoned toad leaps in,
  // lands ONE strike, then curls up and vanishes. This is a SUMMON, NOT a shadow clone: it
  // costs normal energy (spendEnergy) with NO chakra-split / clone-share, and reuses Megumi's
  // shikigami summon-entity path (spawnAssistSummon → summons.js narutoToad template: spawn →
  // brief lifetime → one action → despawn). B→F is unused by every other Naruto special
  // (D,F / D,B / F,F / B,U / *,D are all taken), so it never collides. Placed after the
  // charge/block-gated branches (same as the other pure-motion specials) and before the
  // neutral clone barrages / base Rasengan so the motion is honoured first.
  if (endsWithPattern(dirs, ["B", "F"])) {
    if (!spendEnergy(fighter, 35)) return false
    spawnAssistSummon(fighter, "narutoToad", target)
    fighter._spriteCastMove  = "rasengan_cast"   // brief summon-gesture pose (no dedicated summon strip)
    fighter._spriteCastTimer = 20
    fighter.attackCooldown   = getAttackDuration(22, fighter)
    focusCameraOnAction(context, fighter, target, 0.98, 10)
    shakeCamera(context, 5, 6)
    return true
  }

  // #17 PINCER RENDAN — needs 2 clones. B→U (Back→Up + Special): one clone strikes from the
  // FRONT, one from BEHIND the opponent — two GUARANTEED juggle hits (strong upward launch,
  // opposite offsets) that pop the opponent up so Naruto's own B-up follow-up can connect.
  // Consumes both clones (pop after use); pays the 3-way chakra split.
  if (endsWithPattern(dirs, ["B", "U"]) && countShadowClones(fighter) >= 2) {
    if (!spendCloneComboChakra(fighter, 35)) return false
    consumeShadowClones(fighter, 2)   // pop both clones
    const halfW = (target?.w || 40) * 0.4
    schedulePendingSpawn(2, () => {   // FRONT clone (Naruto's facing side)
      spawnGuaranteedCloneHit(fighter, target, "rasengan",
        { damage: 60, hitstun: 24, knockbackX: 3, knockbackY: -11, dirSign: fighter.facing, offsetX: halfW, spriteScale: 0.5 }, context)
      shakeCamera(context, 5, 6)
    })
    schedulePendingSpawn(8, () => {   // BACK clone (opposite side)
      spawnGuaranteedCloneHit(fighter, target, "rasengan",
        { damage: 60, hitstun: 24, knockbackX: 3, knockbackY: -10, dirSign: -fighter.facing, offsetX: -halfW, spriteScale: 0.5 }, context)
      shakeCamera(context, 5, 6)
    })
    fighter._spriteCastMove = "rasengan_cast"; fighter._spriteCastTimer = 24
    fighter.attackCooldown = getAttackDuration(26, fighter)
    focusCameraOnAction(context, fighter, target, 0.96, 12)
    return true
  }

  // Down + Special = DARK RASENGAN / Compressed TBB — close-range AOE that DETONATES
  // IN PLACE (does not travel). A stationary createAttackFromMove hitbox bubbles around
  // Naruto (wide rangeX/rangeY), plus a damage-less ring-bloom visual centred on him.
  if (dirs.length > 0 && dirs[dirs.length - 1] === "D") {
    if (!spendEnergy(fighter, 45)) return false
    fighter._spriteCastMove  = "rasengan_cast"
    fighter._spriteCastTimer = 20
    const attack = createAttackFromMove(fighter, "darkRasengan", {
      damage: 180, startup: 12, active: 8, recovery: 22,
      hitstun: 28, knockbackX: 10, knockbackY: -6,
      rangeX: 95, rangeY: 85          // wide + tall = a burst bubble at close range only
    })
    setAttackState(fighter, attack, 42)
    // In-place ring bloom — stationary (speed 0), damage-less, flagged visualOnly so it
    // never collides; re-centred on Naruto (spawnProjectile places it in front by default).
    // BUG FIX: was pointing at naruto_kcm_fx_tbb_dark_sphere_growth.png (a solid BLACK ORB
    // — the TBB growth sphere), so the detonation drew a dark ball instead of the ring
    // burst. The intended koma_special_b "orange_rings" sheet isn't on disk; the real
    // orange ring-burst is the tbb shockwave set — shockwave_2 reads as an expanding ring.
    const rings = spawnProjectile(fighter, "darkRasenganRings", {
      damage: 0, speed: 0, lifetime: 22, w: 150, h: 150, visualOnly: true,
      color: "#f59e0b",
      sheet: "./naruto_kcm_fx_tbb_shockwave_2.png",
      spriteFrames: 1, spriteScale: 0.9
    }, context)
    if (rings) {
      rings.x = fighter.x + fighter.w / 2
      rings.y = fighter.y + (fighter.h || 100) * 0.45
    }
    focusCameraOnAction(context, fighter, target, 0.97, 12)
    shakeCamera(context, 10, 8)
    return true
  }

  // #19 FULL RASENGAN BARRAGE — needs 3 clones. Neutral Special with ALL 3 clones out: the
  // full-barrage escalation of #16 — Naruto throws his own orb and each of the 3 clones hurls
  // one in rapid sequence → THREE guaranteed extra hits stacked onto his throw. Checked BEFORE
  // the 2-clone case so a full team fires the bigger barrage. Consumes all 3 clones; pays the
  // 4-way chakra split (Naruto + 3 clones).
  // FLAG: intended KOMA 5B clone-burst art (fx_5_koma_special_b_mid_strip.png cluster) not yet
  // on disk → the orbs reuse the Rasengan sphere sheet, same convention as #16.
  if (countShadowClones(fighter) >= 3) {
    if (!spendCloneComboChakra(fighter, 30)) return false
    consumeShadowClones(fighter, 3)   // pop all three clones
    fighter.vx = fighter.facing * 5   // Naruto's own orb — the combo anchor (normal traveling shot)
    spawnProjectile(fighter, "rasengan", {
      damage: 90, speed: 10, lifetime: 55, hitstun: 20, knockbackX: 7, knockbackY: -2,
      color: "#38bdf8", w: 28, h: 28,
      sheet: "./naruto_kcm_fx_rasengan_sphere.png",
      spriteFrames: 4, spriteW: 64, spriteH: 85, spriteSpeed: 4, spriteScale: 0.55
    }, context)
    ;[4, 11, 18].forEach((delay) => schedulePendingSpawn(delay, () => {   // 3 clone orbs, rapid sequence
      spawnGuaranteedCloneHit(fighter, target, "rasengan",
        { damage: 70, hitstun: 18, knockbackX: 6, knockbackY: -2, dirSign: fighter.facing, spriteScale: 0.5 }, context)
      shakeCamera(context, 4, 4)
    }))
    fighter._spriteCastMove = "rasengan_cast"; fighter._spriteCastTimer = 24
    fighter.attackCooldown = getAttackDuration(26, fighter)
    focusCameraOnAction(context, fighter, target, 0.98, 8)
    return true
  }

  // #16 RASENGAN BARRAGE (small) — needs 2 clones. With both clones out, a neutral Special
  // becomes a barrage: Naruto throws his own Rasengan and each of the 2 clones hurls one too
  // in rapid sequence — two GUARANTEED extra hits stacked onto his throw (reuses the base
  // Rasengan orb FX). Consumes both clones (pop after use); pays the 3-way chakra split.
  // Checked AFTER the motion specials (Pincer / Dark Rasengan) so it's the neutral 2-clone case.
  if (countShadowClones(fighter) >= 2) {
    if (!spendCloneComboChakra(fighter, 30)) return false
    consumeShadowClones(fighter, 2)   // pop both clones
    fighter.vx = fighter.facing * 5   // Naruto's own orb — his combo anchor (normal traveling shot)
    spawnProjectile(fighter, "rasengan", {
      damage: 90, speed: 10, lifetime: 55, hitstun: 20, knockbackX: 7, knockbackY: -2,
      color: "#38bdf8", w: 28, h: 28,
      sheet: "./naruto_kcm_fx_rasengan_sphere.png",
      spriteFrames: 4, spriteW: 64, spriteH: 85, spriteSpeed: 4, spriteScale: 0.55
    }, context)
    schedulePendingSpawn(4,  () => {  // clone orb #1 (guaranteed) …
      spawnGuaranteedCloneHit(fighter, target, "rasengan",
        { damage: 70, hitstun: 18, knockbackX: 6, knockbackY: -2, dirSign: fighter.facing, spriteScale: 0.5 }, context)
      shakeCamera(context, 4, 4)
    })
    schedulePendingSpawn(12, () => {  // … clone orb #2, in rapid sequence
      spawnGuaranteedCloneHit(fighter, target, "rasengan",
        { damage: 70, hitstun: 18, knockbackX: 6, knockbackY: -2, dirSign: fighter.facing, spriteScale: 0.5 }, context)
      shakeCamera(context, 4, 4)
    })
    fighter._spriteCastMove = "rasengan_cast"; fighter._spriteCastTimer = 22
    fighter.attackCooldown = getAttackDuration(24, fighter)
    focusCameraOnAction(context, fighter, target, 0.98, 8)
    return true
  }

  // Default (neutral L, no charge held) = BASE RASENGAN — a close-range RUSH STRIKE.
  // Rasengan is NEVER thrown: Naruto dashes in and rams the spiral orb point-blank. This
  // is the Dragon-Fist melee-rush pattern (createAttackFromMove + setAttackState + forward
  // lunge), NOT a traveling projectile. (Only Rasenshuriken is thrown; Dark Rasengan is AOE.)
  if (!spendEnergy(fighter, 30)) return false
  const attack = createAttackFromMove(fighter, "rasengan", {
    damage: 120, startup: 8, active: 5, recovery: 16,
    hitstun: 22, knockbackX: 9, knockbackY: -3,
    rangeX: 72, rangeY: 55          // short reach — point-blank ram, no ranged travel
  })
  setAttackState(fighter, attack, 20)          // sets attacking + attackCooldown
  fighter.vx = fighter.facing * 8              // dash in to close the gap
  // Sphere FX only — visualOnly (no damage, no collision) so the MELEE hitbox above is
  // what connects; carried forward with the lunge, not thrown ahead as a separate object.
  const orb = spawnProjectile(fighter, "rasenganOrb", {
    damage: 0, speed: 0, lifetime: 20, w: 30, h: 30, visualOnly: true,
    color: "#38bdf8", sheet: "./naruto_kcm_fx_rasengan_sphere.png",
    spriteFrames: 4, spriteW: 64, spriteH: 85, spriteSpeed: 4, spriteScale: 0.6
  }, context)
  if (orb) {
    orb.x  = fighter.x + (fighter.facing >= 0 ? fighter.w : 0)
    orb.y  = fighter.y + (fighter.h || 100) * 0.4
    orb.vx = fighter.facing * 8   // rides the lunge, then fades
  }
  sound.playSfxFile("naruto_rasengan.mp3", null)   // ram cue (shared with Big Ball — same technique)
  fighter._spriteCastMove  = "rasengan_cast"   // 4-koma body plays on the caster (the ram)
  fighter._spriteCastTimer = 20
  focusCameraOnAction(context, fighter, target, 0.99, 8)
  shakeCamera(context, 6, 6)
  return true
}

function executeNarutoUltimate(fighter, context) {
  // Kurama Avatar / Tailed Beast Bomb — CINEMATIC ultimate (kurama.js), built on
  // the Gojo/Sukuna domain-cinematic pattern. NOT a transformation/playable form.
  // Costs 50% of the max meter (fighters spawn at half): can't reliably open at
  // round start because any prior chakra use drops you below the half-bar gate.
  // spendEnergy gates on having the cost, then drains it.
  const cost = Math.ceil((fighter.maxEnergy || 100) * 0.5)
  if (!spendEnergy(fighter, cost)) return false

  const getOpponent = getTargetResolver(context)
  const opponent    = getOpponent(fighter)

  activateKuramaUltimate(fighter, opponent)   // game.js freezes combat + drives the beats
  fighter.attackCooldown = 22
  shakeCamera(context, 12, 14)
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
    fighter._spriteCastTimer = GOJO_CHARGE.hollowPurple  // full windup play length
    fighter.attackCooldown   = getAttackDuration(38 + GOJO_CHARGE.hollowPurple, fighter)
    schedulePendingSpawn(GOJO_CHARGE.hollowPurple, () => {
      spawnProjectile(fighter, "hollowPurple", {
        damage: 200, speed: 10, lifetime: 150,
        hitstun: 32, knockbackX: 14, knockbackY: -4,
        color: "#c084fc", w: 32, h: 32
      }, context)
      fighter._spriteCastMove  = "hollowPurple"   // RELEASE → hollow_purple_cast strip
      fighter._spriteCastTimer = 36
      sound.playSfxFile("gojo_hollow_purple.mp3", null)   // cast/release cue
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
    fighter._spriteCastTimer = GOJO_CHARGE.red          // full windup play length
    fighter.attackCooldown   = getAttackDuration(GOJO_CHARGE.red + 2, fighter)
    schedulePendingSpawn(GOJO_CHARGE.red, () => {
      const attack = createAttackFromMove(fighter, "red", {
        damage: 130, startup: 12, active: 5, recovery: 22,
        hitstun: 26, knockbackX: 12, knockbackY: -3,
        rangeX: 90, rangeY: 60
      })
      setAttackState(fighter, attack, 26)   // currentMove="red" → red_cast strip
      fighter._spriteCastMove  = null        // hand off to currentMove
      fighter._spriteCastTimer = 0
      sound.playSfxFile("gojo_red.mp3", null)   // cast/release cue
    })
    focusCameraOnAction(context, fighter, target, 0.98, 10)
    return true
  }

  // Default = Blue — attraction pull projectile. CHARGE → RELEASE (Task 1b).
  if (isSpecialDisabled(fighter, "blue")) return false   // binding vow (Limitless Sacrifice)
  if (!spendEnergy(fighter, 30)) return false
  fighter._spriteCastMove  = "blue_charge"   // CHARGE strip (gojo_lapse_blue)
  fighter._spriteCastTimer = GOJO_CHARGE.blue          // full windup play length
  fighter.attackCooldown   = getAttackDuration(22 + GOJO_CHARGE.blue, fighter)
  schedulePendingSpawn(GOJO_CHARGE.blue, () => {
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
  // Task 2: 30s → 15s. A domain is a strong burst window, not a round-ender.
  activateDomain(fighter, { cost: 0, duration: 15, range: 1e5 }, context)

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
    sound.playSfxFile("sukuna_slash.mp3", null)   // slash cue (shared with Cleave)
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
      sound.playSfxFile("sukuna_fuga.mp3", null)   // Fuga = Sukuna's flame-arrow technique — release cue
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
  sound.playSfxFile("sukuna_slash.mp3", null)   // slash cue (shared with Dismantle)
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
  // Task 2: 30s → 15s. A domain is a strong burst window, not a round-ender.
  activateDomain(fighter, { cost: 0, duration: 15, range: 1e5 }, context)

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

  // S,A+L (down→back) = CHAIN-KNIFE / Inverted Spear of Heaven. Movement tech, NO
  // cursed energy. Sequenced animation: windup → extension (chain shoots out + hits)
  // → retract → spin finisher (row 15 folded in). Checked first (longest motion).
  if (endsWithPattern(dirs, ["D", "B"])) {
    if ((fighter.chainCooldown || 0) > 0) return false
    fighter.chainCooldown    = 96
    fighter.attackCooldown   = getAttackDuration(64, fighter)   // committal
    fighter._spriteCastMove  = "chain_windup"
    fighter._spriteCastTimer = 14
    schedulePendingSpawn(14, () => {                            // windup → extension
      fighter._spriteCastMove  = "chain_extend"
      fighter._spriteCastTimer = 18
      spawnProjectile(fighter, "chainKnife", {                 // the chain shoots forward + hits
        damage: 95, speed: 17, lifetime: 24,
        hitstun: 22, knockbackX: 9, knockbackY: -2,
        color: "#d1d5db", w: 44, h: 12
      }, context)
      shakeCamera(context, 6, 6)
      schedulePendingSpawn(18, () => {                          // extension → retract
        fighter._spriteCastMove  = "chain_retract"
        fighter._spriteCastTimer = 18
        schedulePendingSpawn(18, () => {                        // retract → spin (folded in)
          fighter._spriteCastMove  = "chain_spin"
          fighter._spriteCastTimer = 16
        })
      })
    })
    focusCameraOnAction(context, fighter, target, 0.95, 10)
    return true
  }

  // S,A+F (down→forward, qcf) = CURSE SPIRIT — a FREE thrown creature projectile.
  // Toji has NO cursed energy, so unlike a normal ki special this costs nothing; it's
  // his cheap ranged poke. Uses the projectile sprite pipeline (curse_effect_2 = the
  // clean 3-frame flying creature). Checked after D,B (chain) so the motions stay distinct.
  if (endsWithPattern(dirs, ["D", "F"])) {
    if ((fighter.attackCooldown || 0) > 0) return false
    fighter.attackCooldown = getAttackDuration(20, fighter)   // brief commit / recast gate — NO energy spent
    spawnProjectile(fighter, "curseSpirit", {
      damage: 70, speed: 9, lifetime: 100,
      hitstun: 18, knockbackX: 6, knockbackY: -2,
      w: 40, h: 30,
      sheet: "./toji_curse_effect_2.png", spriteFrames: 3,
      spriteW: 24, spriteH: 22, spriteSpeed: 5, spriteScale: 2.4
    }, context)
    focusCameraOnAction(context, fighter, target, 0.98, 6)
    return true
  }

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
// TOJI — 3-STANCE WEAPON SYSTEM  (FOUNDATION / Phase 1 — placeholder content)
// ─────────────────────────────────────────────────────────────────
// Toji-ONLY for now (not a generic system). fighter.weaponStance ∈ blade|chain|gun.
// INPUT: the CHARGE button (P) cycles the stance. Chosen because Toji's grab (throw),
// special (chain/curse/rapid/inventory) and ultimate (Heavenly Restriction) slots are all
// occupied, whereas charge is a genuine no-op for Toji (0 energy → no charge, base-only
// transform → triggerTransformation returns false). CORE MECHANIC: a switch pressed during
// an attack's RECOVERY phase CANCELS the recovery early (same state-clear as combat.js's
// launcher-cancel) and swaps stance — so the player can act again after only
// STANCE_SWITCH_FRAMES instead of sitting out the full recovery.
export const TOJI_STANCES = ["blade", "chain", "gun"]
const STANCE_SWITCH_FRAMES = 4   // near-instant switch cost (also the post-cancel gap)

// PLACEHOLDER light per stance — Phase-1 content only. Reuses basic-attack shapes with a
// DISTINCT name + params per stance so the harness can prove the right one fires. NOT the
// real design-doc moveset (Quick Draw / Inverted Spear / etc. come in Phase 2+).
const TOJI_STANCE_LIGHT = {
  blade: { name: "bladeLight", damage: 52, startup: 3, active: 3, recovery: 9,  hitstun: 13, knockbackX: 4, knockbackY: 0,  rangeX: 60,  rangeY: 40 },
  chain: { name: "chainLight", damage: 40, startup: 5, active: 4, recovery: 14, hitstun: 16, knockbackX: 6, knockbackY: -1, rangeX: 110, rangeY: 40 },
  gun:   { name: "gunLight",   damage: 30, startup: 4, active: 2, recovery: 12, hitstun: 10, knockbackX: 3, knockbackY: 0,  rangeX: 90,  rangeY: 30 }
}

export function getTojiStance(fighter) { return (fighter && fighter.weaponStance) || "blade" }

// Fire the CURRENT stance's placeholder light (gated by attackCooldown/attacking like any move).
export function fireTojiStanceLight(fighter, context) {
  if (!fighter) return false
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const md = TOJI_STANCE_LIGHT[getTojiStance(fighter)] || TOJI_STANCE_LIGHT.blade
  const attack = createAttackFromMove(fighter, md.name, md)
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  return true
}

// Stance-switch (CHARGE tap, edge-detected via `chargeHeld` + fighter._stancePrevCharge).
// Returns "switch" | "cancel" | false. Interrupts only the RECOVERY phase (never startup/active).
export function updateTojiStanceSwitch(fighter, chargeHeld, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "toji") return false
  if (fighter.weaponStance == null) fighter.weaponStance = "blade"
  const edge = !!chargeHeld && !fighter._stancePrevCharge
  fighter._stancePrevCharge = !!chargeHeld
  if (!edge) return false

  let kind = "switch"
  if (fighter.attacking && fighter.currentAttack) {
    const phase = (typeof getPhase === "function") ? getPhase(fighter) : null
    if (phase !== "recovery") return false            // can't cancel startup/active — only recovery
    fighter.attacking     = false                     // RECOVERY CANCEL (mirror launcher-cancel clear)
    fighter.currentAttack = null
    fighter.currentMove   = null
    kind = "cancel"
  }
  fighter.attackCooldown = STANCE_SWITCH_FRAMES        // near-instant switch cost / post-cancel gap
  const i = TOJI_STANCES.indexOf(getTojiStance(fighter))
  fighter.weaponStance = TOJI_STANCES[(i + 1) % TOJI_STANCES.length]
  return kind
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
  if ((fighter.ultimateCooldown || 0) > 0) return false      // on cooldown → do nothing (same as too little meter)
  if (fighter.attackCooldown > 0 || fighter.hitstun > 0 || fighter.blockstun > 0) return false
  if (fighter.attacking) return false
  if (isSpecialDisabled(fighter, "ultimate")) return false   // binding vow (Limitless Sacrifice / Assassin's Oath)

  const key = (fighter.rosterKey || fighter.id || "").toLowerCase()

  let cast
  if (fighter.isMahoraga) {
    cast = executeMahoragaUltimate(fighter, context)
  } else {
    switch (key) {
      case "goku":    cast = executeGokuUltimate(fighter, context);    break
      case "naruto":  cast = executeNarutoUltimate(fighter, context);  break
      case "gojo":    cast = executeGojoUltimate(fighter, context);    break
      case "megumi":  cast = executeMegumiUltimate(fighter, context);  break
      case "sukuna":  cast = executeSukunaUltimate(fighter, context);  break
      case "omololu": cast = executeOmoluUltimate(fighter, context);   break
      case "toji":    cast = executeToji_Ultimate(fighter, context);   break
      default:        cast = executeFallbackUltimate(fighter, context); break
    }
  }

  // UNIVERSAL COOLDOWN: only start it when the ultimate ACTUALLY fired — executeX
  // returns false if it bailed (e.g. not enough meter), so a failed attempt never
  // locks the ultimate out. Applies to every character through this one dispatch.
  if (cast) fighter.ultimateCooldown = ULTIMATE_COOLDOWN_FRAMES
  return cast
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
    // Infinity drains energy while active. Drop it as soon as the meter can't cover
    // the per-frame drain — NOT only at exactly 0. The old `> 0` check let passive
    // regen (regenEnergy, run later the SAME frame) top the meter back up by a sliver
    // each frame, so energy never actually reached 0 at check time and Infinity stayed
    // on forever with an empty-looking bar.
    const drain = 0.14
    if ((fighter.energy || 0) >= drain) {
      fighter.energy = Math.max(0, fighter.energy - drain)
    } else {
      // Energy exhausted → Infinity drops. TASK 5: depleting CE while Infinity is up
      // backlashes — a one-time small health penalty + a brief vulnerable stagger
      // (this branch runs only on the frame infinityActive flips off, so it's once).
      fighter.energy         = 0
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
