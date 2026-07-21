// abilities.js
// Central ability system — specials, ultimates, transformations, projectiles, summons.
// Each of the 7 starter characters has a fully implemented unique kit.

import { characters } from "./characters.js"
import { moveset }    from "./moveset.js"
import { sound }      from "./sound.js"
import { activateDomain } from "./domains.js"   // domains.js doesn't import abilities.js → no cycle
import { activateKuramaUltimate } from "./kurama.js"   // Naruto ult cinematic (kurama.js imports neither → no cycle)
import { activateSasukeEyesCinematic } from "./sasukeCinematic.js"   // Sasuke Susanoo Lv2 escalation cinematic (no cycle)
import { activateSSJRoseCinematic, isSSJRoseCinematicActive } from "./ssjRoseCinematic.js"   // Goku Black SSJ Rose transform cinematic (no cycle)
import { resolveGrab } from "./combat.js"   // shared grab pipeline (combat.js doesn't import abilities.js → no cycle)
import { isBetaUnlocked } from "./progression.js"   // beta-only single-direction input simplification (progression.js imports only account.js → no cycle)
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
const ULTIMATE_COOLDOWN_FRAMES = 1200   // 20s @ 60fps (universal)
const NARUTO_KURAMA_RECAST_FRAMES = 4800   // 80s — Naruto-only long lockout after the Tailed Beast Bomb
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
    aoe:        !!moveData.aoe,          // stationary caster-centred hitbox (getAttackHitbox)
    isSpecial:  !!moveData.isSpecial,    // → special chip% / hitstop / damage-number category
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
  // BETA INPUT SIMPLIFICATION (beta code only): in beta, `list` is the EXACT canonical
  // motion synthesized from the single held direction (see getRelativeDirections beta
  // branch), so match by exact equality. This prevents a reduced single-direction input
  // from false-triggering a longer motion via the forgiving subsequence match below.
  // Normal (non-beta) play never enters this branch — the logic below is untouched.
  if (isBetaUnlocked()) {
    return Array.isArray(list) && Array.isArray(pattern) &&
           list.length === pattern.length &&
           list.every((tok, i) => tok === pattern[i])
  }
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

// ─────────────────────────────────────────────────────────────────
// BETA-ONLY INPUT SIMPLIFICATION — single held direction → special
// ─────────────────────────────────────────────────────────────────
// When the beta code (GojoV1 / isBetaUnlocked) is active, the motion-roll requirement
// for command specials is replaced by "hold ONE direction, then tap Special". Each entry
// maps a held RELATIVE direction (F/B/U/D, or N = neutral/none) to the EXACT motion array
// the (unchanged) per-character dispatch already expects, so the dispatch fires the SAME
// special the full motion would have produced. Directions NOT listed fall back to the
// character's neutral/default special ([]). Reductions were chosen collision-free; the
// non-clean substitutes (Naruto Pincer, Megumi Nue/Toad, Toji Rapid Strike) are marked
// (sub) and documented in BETA_INPUT_MAP.md. The main (non-beta) motion system is untouched.
const BETA_SPECIAL_MOTIONS = {
  goku:   { F: ["D", "F"] },                                                                    // F=Kamehameha · neutral=Dragon Fist
  gojo:   { F: ["F"],      B: ["D", "B"], U: ["U"] },                                            // F=Red · B=Hollow Purple · U=Teleport · neutral=Blue
  sukuna: { F: ["F"],      B: ["D", "B"] },                                                      // F=Flame Arrow · B=Dismantle · neutral=Cleave
  naruto: { F: ["D", "F"], B: ["D", "B"], U: ["B", "U"], D: ["D"] },                             // F=Clone Spawn · B=Clone Dispel · U=Pincer Rendan(sub) · D=Dark Rasengan · neutral=Rasengan
  megumi: { F: ["D", "F"], B: ["D", "B"], U: ["D", "U"], D: ["F", "D", "F"], N: ["B", "F"] },    // F=Divine Dogs · B=Max Elephant · U=Rabbit · D=Nue(sub) · neutral=Toad(sub)
  toji:   { F: ["D", "F"], B: ["D", "B"], D: ["F", "F"] },                                       // F=Curse Spirit · B=Chain-Knife · D=Rapid Strike(sub) · neutral=Inventory Smash
  sasuke: { F: ["D", "F"], B: ["D", "B"], D: ["D"] },                                            // F=Lightning · B=Chidori Koiten · D=Shuriken · neutral=Dash Strike
  rick:   { F: ["D", "F"], B: ["D", "B"], U: ["U"], D: ["D"] },                                  // F=Portal-Pull · B=Portal-Push · U=Rocket · D=Laser · neutral=Meeseeks
  goku_black: { F: ["D", "F"], B: ["D", "B"] }                                                   // F=Kamehameha (QCF) · B=Spirit Bomb (QCB) · neutral=Explosion (Stage 3b)
}

// Resolve the exact canonical motion for the fighter's currently-held direction (stamped
// by game.js as fighter._betaHeldDir the frame Special is pressed). ALWAYS returns an array
// (never falls back to motion history) so, in beta, only the held direction matters.
function betaMotionForHeldDir(fighter) {
  const held = fighter._betaHeldDir || null   // "F" | "B" | "U" | "D" | null (neutral)
  const key  = (fighter.rosterKey || fighter.id || "").toLowerCase()

  // Sasuke's Susanoo dispatch (executeSasukeSpecial, stage>0) reads the RAW held direction
  // (includes "D" → grab, else sword/arrow) rather than a motion. Keep the synthetic minimal
  // there so a held Forward can't inject a "D" and wrongly force the grab.
  if (key === "sasuke" && (fighter._susanooStage || 0) > 0) return held === "D" ? ["D"] : []

  // Mahoraga (transformed Megumi) fires Wheel Rotation unconditionally (its dispatch ignores
  // directions), so a single token is safe and avoids applying Megumi's summon map.
  if (fighter.isMahoraga) return held ? [held] : []

  const map = BETA_SPECIAL_MOTIONS[key]
  if (!map)  return held ? [held] : []   // generic fallback dispatch: single token ([B]/[F]/[D])
  if (!held) return map.N || []          // neutral (some chars remap neutral — e.g. Megumi → Toad)
  return map[held] || []                 // unmapped held dir → neutral/default special
}

function getRelativeDirections(fighter, maxAge = COMMAND_INPUT_MAX_AGE) {
  if (!fighter) return []
  // BETA: collapse motion rolls to the single held direction (see BETA_SPECIAL_MOTIONS).
  // game.js stamps fighter._betaHeldDir from the live input the frame Special is pressed.
  // Non-beta play skips this entirely — the motion-history logic below is byte-for-byte intact.
  if (isBetaUnlocked()) return betaMotionForHeldDir(fighter)
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

  // Spawn point: overridable via spawnX/spawnY (e.g. a giant's arm height, or a
  // fixed lightning-strike column), else the default in-front-of-fighter origin.
  const spawnX = (moveData.spawnX != null) ? moveData.spawnX
                 : (attacker.facing === 1 ? attacker.x + attacker.w + 4 : attacker.x - width - 4)
  const spawnY = (moveData.spawnY != null) ? moveData.spawnY
                 : attacker.y + (attacker.h || 100) * 0.4
  // Velocity: `aimAt` {x,y} auto-aims the projectile from its spawn point toward that
  // point at the move's `speed` (diagonal down-and-forward for a high Susanoo arm →
  // grounded opponent). Else an explicit `vx` override, else the flat forward shot.
  let velX = (moveData.vx != null) ? moveData.vx : attacker.facing * speed
  let velY = moveData.vy || 0
  if (moveData.aimAt) {
    const dx = moveData.aimAt.x - spawnX
    const dy = moveData.aimAt.y - spawnY
    const mag = Math.hypot(dx, dy) || 1
    velX = (dx / mag) * speed
    velY = (dy / mag) * speed
  }

  const proj = {
    owner:      attacker,
    ownerId:    attacker.side,
    name:       type,
    x:          spawnX,
    y:          spawnY,
    vx:         velX,
    vy:         velY,
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
      sound.playDragonBallTransformSfx()   // SHARED Dragon Ball transform cue (previously had NO audio)
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
  // NARUTO-ONLY long recast lockout. The Tailed Beast Bomb dispatches through triggerUltimate
  // like everyone else and WOULD get the universal 1200f/20s cooldown — but a screen-clearing
  // cinematic nuke shouldn't be reusable every 20s. Suppress the universal cooldown and arm a
  // much longer one (4× = 4800f/80s). Rationale: a round is 5400f/90s and ultimateCooldown does
  // NOT persist across rounds (resetRound rebuilds fighters), so this makes a SECOND cast within
  // one round require casting in the first ~10s and surviving ~80s (rare, real setup) WITHOUT a
  // hard one-per-match cap — a best-of-3 still allows roughly one per round. Only Naruto is touched.
  fighter.ultimateCooldown     = NARUTO_KURAMA_RECAST_FRAMES
  fighter._suppressUltCooldown = true   // stop triggerUltimate from overwriting with the 1200 default
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

// ── GUN STANCE — real normals (Phase 4). RANGED: shots spawn projectiles (projectiles.js
// pattern), NOT melee hitboxes. Per-hit damage is LOWER than melee (chip/pressure framing).
//   5A snapShot — fast low-damage chip/pressure shot (planted). Fires a bullet projectile.
//   5B aimedShot — FEINT: plays the aim pose (idk sprite has NO muzzle flash → reads as a
//      fake-out), fires NO projectile, and is cancelable into a stance-switch via the Phase-1
//      recovery-cancel. A bait.
//   5C tracerRound — bigger commitment/reward: a heavy tracer with a HARD KNOCKBACK on hit
//      (approximates the design's "hard knockdown"; a true knockdown-STATE/get-up is deferred —
//      nothing in the engine currently triggers knockdownState, so it stays a strong blowback).
const TOJI_GUN = {
  snapShot:   { cast: 18, proj: { damage: 20, speed: 17, lifetime: 55, hitstun: 9,  knockbackX: 4,  knockbackY: 0,  w: 14, h: 8,  color: "#ffe066" } },
  aimedShot:  { feint: true, startup: 6, active: 3, recovery: 16 },
  tracerRound:{ cast: 24, proj: { damage: 42, speed: 19, lifetime: 60, hitstun: 20, knockbackX: 13, knockbackY: -8, w: 34, h: 10, color: "#ff5a5a" } }
}

// ── BLADE STANCE — real normals (Phase 2). Sword-character numbers (cf. moveset.js goku /
// Toji basic_attacks: light 52 · heavy 96). Toji is a fast no-meter glass cannon, so these
// skew fast/low-commit. Sprites are in characters.js animationData keyed by these move names.
//   5A quickDraw  — fast low-damage starter; OPENS the rekka.
//   5B forwardSlash — mid-range poke (single hit).
//   2C skywardCut — launcher (up-attack slot).
//   5C Reaper's Combo — a 3-stage REKKA (reaper1→2→3) sliced from toji_Foword_slash_attack.
//      Three cancel routes at each non-final stage's RECOVERY: press LIGHT → chain to next
//      hit · press CHARGE → stance-cancel (Phase-1 mechanic) · do nothing → safe recovery.
const TOJI_BLADE = {
  quickDraw:    { damage: 44, startup: 5, active: 3, recovery: 9,  hitstun: 14, knockbackX: 4, knockbackY: 0,  rangeX: 62, rangeY: 44, rekkaNext: "reaper1" },
  forwardSlash: { damage: 62, startup: 7, active: 4, recovery: 15, hitstun: 16, knockbackX: 6, knockbackY: 0,  rangeX: 95, rangeY: 44 },
  skywardCut:   { damage: 55, startup: 7, active: 4, recovery: 18, hitstun: 22, knockbackX: 2, knockbackY: -9, rangeX: 70, rangeY: 80, launcher: true },
  reaper1:      { damage: 30, startup: 5, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0,  rangeX: 80, rangeY: 40, rekkaNext: "reaper2" },
  reaper2:      { damage: 34, startup: 5, active: 3, recovery: 10, hitstun: 13, knockbackX: 4, knockbackY: 0,  rangeX: 85, rangeY: 40, rekkaNext: "reaper3" },
  reaper3:      { damage: 50, startup: 6, active: 4, recovery: 18, hitstun: 20, knockbackX: 9, knockbackY: -3, rangeX: 95, rangeY: 44 },  // finisher — no rekkaNext
  // ── COMMAND MOVES (Phase 5) ──────────────────────────────────────────────────
  // DASH STRIKE (design "6C") — a forward-committing dash-in stab. Data lives under
  // dashStrike1 (its first sprite); updateTojiStanceCombat swaps the SPRITE 1→2 at the
  // active boundary. Single hit level (the low→overhead property split needs the
  // deferred hit-level block system). Damage 80 > forwardSlash 62 (committed) but a
  // single hit < Reaper's full 30+34+50=114 string. Longer recovery = the dash-in risk.
  dashStrike1:  { damage: 80, startup: 10, active: 4, recovery: 20, hitstun: 20, knockbackX: 9,  knockbackY: -2, rangeX: 110, rangeY: 46 },
  // RISING SPIRAL (design "j.C") — AIR normal / juggle ender off Skyward Cut. Tall rangeY
  // to catch a popped-up opponent. LONG recovery (26) so the full spin is genuinely
  // punishable on block/whiff — the risk is mechanically real, not flavor.
  risingSpiral: { damage: 72, startup: 7,  active: 5, recovery: 26, hitstun: 22, knockbackX: 10, knockbackY: -4, rangeX: 74, rangeY: 82 }
}

// Forward-sprint velocity sustained through Dash Strike's dash-in (startup+active window).
// Physics friction (0.72) would decay a single impulse instantly; re-applying it each frame
// gives a real committed sprint. Tuned so Toji closes ~1 body-width before the stab.
const TOJI_DASH_LUNGE_SPEED = 9

// Dash Strike fire: commits the move (data under dashStrike1) + arms the sustained lunge.
function fireTojiDashStrike(fighter, context) {
  if (!_fireTojiStanceMove(fighter, "dashStrike1", TOJI_BLADE.dashStrike1, context)) return false
  const md = TOJI_BLADE.dashStrike1
  fighter._dashLunge = md.startup + md.active     // sprint through wind-up + stab, plant on recovery
  fighter.vx = fighter.facing * TOJI_DASH_LUNGE_SPEED
  return true
}

// ── CHAIN STANCE — real normals (Phase 3). A mid-range zoning stance: longer reach, slower,
// higher pushback than Blade. Numbers per moveset.js conventions (cf. Blade quickDraw 44 /
// forwardSlash 62). Sprites keyed by move name in characters.js animationData.
//   5A shortLash — quick long-reach poke (trimmed chain whip).
//   5B wideArc   — whiff-punish / wall-carry (big knockbackX), slow-startup high reward.
//   6B lowSweep  — low sweep (down+heavy), a distinct poke intended as the LOW of a 5B/6B
//      mixup. NOTE: the game has NO hit-level (low/overhead) block system yet, so it is NOT
//      forced to be crouch-blocked — the true high/low mixup needs that system (deferred).
//   2B risingCoil — anti-air launcher (up-attack slot).
const TOJI_CHAIN = {
  shortLash:  { damage: 38, startup: 6,  active: 3, recovery: 11, hitstun: 12, knockbackX: 5,  knockbackY: 0,   rangeX: 100, rangeY: 40 },
  wideArc:    { damage: 66, startup: 10, active: 5, recovery: 20, hitstun: 18, knockbackX: 11, knockbackY: 0,   rangeX: 130, rangeY: 44 },
  lowSweep:   { damage: 54, startup: 9,  active: 4, recovery: 18, hitstun: 16, knockbackX: 6,  knockbackY: 0,   rangeX: 120, rangeY: 30 },
  risingCoil: { damage: 58, startup: 8,  active: 5, recovery: 20, hitstun: 20, knockbackX: 2,  knockbackY: -10, rangeX: 70,  rangeY: 85, launcher: true }
}

export function getTojiStance(fighter) { return (fighter && fighter.weaponStance) || "blade" }

// Fire a Toji stance move from move data (shared by Blade + Chain). Sets _rekkaNext (Blade rekka).
function _fireTojiStanceMove(fighter, key, md, context) {
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._rekkaNext = md.rekkaNext || null
  return true
}
const fireTojiBladeMove = (fighter, key, context) => _fireTojiStanceMove(fighter, key, TOJI_BLADE[key], context)
const fireTojiChainMove = (fighter, key, context) => _fireTojiStanceMove(fighter, key, TOJI_CHAIN[key], context)

// GUN ranged shot (5A/5C): play the firing animation via the sprite-cast window (no melee
// attack state) and spawn the bullet projectile. attackCooldown commits for the cast length.
function fireTojiGunShot(fighter, key, context) {
  const md = TOJI_GUN[key]
  if (!md || !md.proj || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  fighter._spriteCastMove  = key             // → animationData[key] firing sprite (snapShot/tracerRound)
  fighter._spriteCastTimer = md.cast
  fighter.attackCooldown   = getAttackDuration(md.cast, fighter)
  spawnProjectile(fighter, key, md.proj, context)
  return true
}

// GUN feint (5B aimedShot): a real (melee-less, 0-damage) attack so it has a RECOVERY phase and
// is cancelable into a stance-switch (Phase-1 mechanic). No projectile — the "no muzzle flash"
// aim reads as a fake-out. Plays the idk aim sprite.
function fireTojiGunFeint(fighter, context) {
  const md = TOJI_GUN.aimedShot
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, "aimedShot",
    { damage: 0, startup: md.startup, active: md.active, recovery: md.recovery, hitstun: 0, knockbackX: 0, knockbackY: 0, rangeX: 8, rangeY: 8 },
    { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._rekkaNext = null
  return true
}

// Per-frame Toji stance-combat routing. Returns true if it consumed the input (caller
// should skip the normal combat path). BLADE fires its real normals + drives the rekka;
// CHAIN/GUN fire the Phase-1 placeholder light. Grounded normals only (aerials/grab stay
// on the normal path). `getPhase` = combat.getAttackPhase; `context` = ability context.
export function updateTojiStanceCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "toji" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const stance   = getTojiStance(fighter)

  // Light press-edge (raw of the buffered light) — a rekka chain needs a FRESH tap, not a held button.
  const lightEdge = !!inputState.light && !fighter._rekkaPrevLight
  fighter._rekkaPrevLight = !!inputState.light

  // Rekka window closes when the attack fully ends (safe-stop / stance-cancel both land here).
  if (!fighter.attacking) fighter._rekkaNext = null

  if (stance === "blade") {
    // ROUTE 1 — chain to next rekka hit: fresh LIGHT during the current hit's RECOVERY.
    if (fighter.attacking && fighter._rekkaNext && lightEdge && getPhase?.(fighter) === "recovery") {
      const next = fighter._rekkaNext
      fighter.attacking = false; fighter.currentAttack = null; fighter.currentMove = null
      fighter.attackCooldown = 0                      // clear the just-set cooldown so the chain fires now
      return fireTojiBladeMove(fighter, next, context)
    }
    // DASH STRIKE upkeep (runs while the move is live, before the canStart gate):
    //  • SPRITE CHAIN: swap crouch(_1)→stab(_2) once past startup. sprite.js frame-resets
    //    on the sheet change, so _2's full-extension stab plays as the hit lands.
    //  • LUNGE: re-apply the forward sprint each frame of the dash-in window.
    if (fighter.attacking && fighter.currentMove === "dashStrike1" && getPhase?.(fighter) !== "startup") {
      fighter.currentMove = "dashStrike2"
    }
    if ((fighter._dashLunge || 0) > 0) { fighter.vx = fighter.facing * TOJI_DASH_LUNGE_SPEED; fighter._dashLunge-- }

    const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
    if (!canStart) return false

    // AIR — RISING SPIRAL (air normal / juggle ender). Buffered light (down+light stays the
    // generic down-air spike). Consuming it here suppresses the generic `air` normal in blade.
    if (!grounded) {
      if (inputState.light && !inputState.down) return fireTojiBladeMove(fighter, "risingSpiral", context)
      return false
    }
    // GROUND normals + command move.
    if (inputState.upAttack)                  return fireTojiBladeMove(fighter, "skywardCut",   context)
    if (inputState.heavy &&  inputState.down)  return fireTojiDashStrike(fighter, context)                  // 6C→S+K: Dash Strike
    if (inputState.heavy && !inputState.down)  return fireTojiBladeMove(fighter, "forwardSlash", context)
    if (inputState.light && !inputState.down)  return fireTojiBladeMove(fighter, "quickDraw",    context)
    return false
  }

  if (stance === "chain") {
    // Real Chain normals. down+heavy = 6B lowSweep (checked before plain heavy = 5B wideArc).
    const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
    if (!canStart || !grounded) return false
    if (inputState.upAttack)                     return fireTojiChainMove(fighter, "risingCoil", context)  // 2B anti-air
    if (inputState.heavy &&  inputState.down)     return fireTojiChainMove(fighter, "lowSweep",   context)  // 6B low
    if (inputState.heavy && !inputState.down)     return fireTojiChainMove(fighter, "wideArc",    context)  // 5B
    if (inputState.light && !inputState.down)     return fireTojiChainMove(fighter, "shortLash",  context)  // 5A
    return false
  }

  // GUN — real ranged normals (Phase 4). All spawn projectiles except the 5B feint.
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (!canStart || !grounded) return false
  if (inputState.upAttack)                  return fireTojiGunShot(fighter, "tracerRound", context)  // 5C
  if (inputState.heavy && !inputState.down)  return fireTojiGunFeint(fighter, context)                // 5B feint
  if (inputState.light && !inputState.down)  return fireTojiGunShot(fighter, "snapShot",  context)    // 5A
  return false
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
// SASUKE — SUSANOO (two-stage sustained ultimate)
// ─────────────────────────────────────────────────────────────────
// Stage 1 (ultimate press, costs 50% max energy like the roster convention): enter a SUSTAINED
// "Susanoo Lv1" — buffed atk/def, gains the ribcage-arm grab, sprite swaps to the lvl_1 body. No
// ongoing drain. Stage 2 (press ultimate AGAIN while in Lv1): DRAIN ALL remaining energy to 0,
// swap to the lvl_2 body, bigger buff, unlock the ranged arrow + a heavier grab. Susanoo is TIMED
// (~20s) then auto-reverts; on revert a 20s ultimate cooldown starts (so you can't immediately
// re-cast — the drain-to-0 + cooldown is the risk/reward). Mirrors the transformations.js form idea
// (currentForm + stat multipliers) but self-managed so the timer isn't reset on escalation and the
// _skinAnim body-swap can be attached. Attacks fire on the SPECIAL button (Sasuke has no other specials).
export const SUSANOO_DURATION_FRAMES = 1200   // ~20s @60fps — timed, then auto-reverts (user-chosen)
// GIANT canvas-relative sizing (item 2): display height as a FRACTION of canvas height,
// mirroring kurama.js (fox bodyH = ch*0.74). Pushed MASSIVE — Lv1 ≈ full canvas height, Lv2
// TALLER than the screen so it genuinely looms (feet planted; head runs off the top). Lv2 > Lv1.
// SUSANOO_REF_H = the body-frame content height per stage → sprite.js scales EVERY action by
// ch*frac/refH. (Tune these two frac numbers to dial size; err big per the brief.)
const SUSANOO_CANVAS_FRAC = { 1: 0.95, 2: 1.20 }
const SUSANOO_REF_H       = { 1: 265,  2: 275  }   // measured content height (lvl_1 rows 7–271, lvl_2 body ~6–280)
// stage buffs (applied to fighter.damageMultiplier/defenseMultiplier; combat uses max(dmgMult,atkMult))
const SUSANOO_STAGE = {
  1: { dmg: 1.4, def: 1.3, grabDmg: 120 },
  2: { dmg: 1.9, def: 1.5, grabDmg: 210, arrowDmg: 230, swordDmg: 265 }   // Lv2 hits HARDER + unlocks arrow & sword
}
// Sprite body-swap animationData (attached to fighter._skinAnim while in Susanoo).
// THREE deliberate choices here:
//   (1) The uniform-cell anim sheets (sasuke_susanoo_lvl_*_anim.png — lvl1 5×231, lvl2 4×247)
//       slice CLEANLY: boundary-overlay verification (2026-07-17, sasuke_susanoo_lvl_*_OVERLAY.png)
//       confirmed every pose sits fully inside its uniform cell with the divider lines landing in
//       genuine empty gaps (mid-x jitter 0px, no edge-touching). So the reported "bleeding" is NOT
//       a runtime slice tear — the slicer math (sx = frameIndex*width) is exact.
//   (2) The real cause of the choppy/"bleeding" look was ANIMATION DESIGN: the body used to loop
//       ALL 5/4 poses — including the dramatic weapon-brandish poses (lvl1's mace swing f2/f3,
//       lvl2's bow draw) — as a permanent idle at speed 8. The arm snapped between wildly different
//       positions ~2×/sec, reading as a glitchy flail. FIX: idle only on the CALMEST ADJACENT pair
//       (measured by min inter-frame delta) at a slow, majestic cadence, mirroring kurama.js holding
//       each phase — plus a continuous sine bob added in sprite.js. `idleStart`/`idleFrames` select
//       a contiguous window; sourceX = idleStart*width offsets the slice into it.
//         lvl1 → poses 0–1 (both standing, hand on the planted mace; Δ≈30, the calmest standing pair).
//         lvl2 → poses 2–3 (arm-across hold; Δ≈9, nearly seamless — by far the smoothest transition).
//   (3) EVERY action key maps to that same calm idle cell — including hurt/light/heavy/up/air/grab
//       and the susanoo* attacks. A key the giant's action machine picks but we DIDN'T define would
//       fall back to a 128² box (a real glitch source when the giant got hit or threw a normal).
//       Attacks' actual art is a SEPARATE spawned FX (this engine has no per-fighter attack-FX slot,
//       see characters.js:600), so the body never needs its dramatic poses.
function _susanooBody(sheet, width, height, idleStart, idleFrames, speed = 40) {
  const cell = { frames: idleFrames, width, height, speed, loop: true, anchorY: 0, sourceX: idleStart * width, sheet }
  return {
    idle: cell, walk: cell, run: cell, jump: cell, fall: cell,
    hurt: cell, light: cell, heavy: cell, up: cell, air: cell, down_air: cell,
    grab: cell, dash: cell,
    susanooGrab: cell, susanooSword: cell, susanooArrow: cell, susanooIntro: cell
  }
}
// Uniform repacked sheets (lvl1 5×231, lvl2 4×247). Idle windows chosen by inter-frame delta scan.
const SUSANOO_LVL1_ANIM = _susanooBody("./sasuke_susanoo_lvl_1_anim.png", 231, 277, 0, 2)   // calm poses 0–1
const SUSANOO_LVL2_ANIM = _susanooBody("./sasuke_susanoo_lvl_2_anim.png", 247, 298, 2, 2)   // calm poses 2–3

export function sasukeInSusanoo(fighter) { return (fighter && (fighter._susanooStage || 0) > 0) }

function _enterSusanooStage(fighter, stage) {
  fighter._susanooStage = stage
  const b = SUSANOO_STAGE[stage]
  fighter.damageMultiplier  = b.dmg
  fighter.attackMultiplier  = b.dmg
  fighter.defenseMultiplier = b.def
  // GIANT sizing (item 2): drive display height off the canvas, not fighter.spriteScale.
  fighter._canvasHeightFrac = SUSANOO_CANVAS_FRAC[stage]
  fighter._canvasHeightRefH = SUSANOO_REF_H[stage]
  fighter._skinAnim   = (stage === 2) ? SUSANOO_LVL2_ANIM : SUSANOO_LVL1_ANIM
  // Half-arena lock (item 3): physics.moveFighter confines this fighter to the half it
  // activated in. Set the flag on stage 1; do NOT reset _arenaHalfLock on escalation so
  // Lv2 stays in the SAME half Lv1 latched.
  fighter._susanooActive = true
  // A planted giant doesn't hop: physics.moveFighter honors canJump !== false.
  fighter.canJump = false
}

// Drop back to normal form + start the 20s recast lockout.
export function revertSasukeSusanoo(fighter) {
  if (!fighter) return
  fighter._susanooStage = 0
  fighter._susanooTimer = 0
  fighter.damageMultiplier  = 1
  fighter.attackMultiplier  = 1
  fighter.defenseMultiplier = 1
  fighter._skinAnim = null
  fighter._canvasHeightFrac = null           // release giant sizing → back to normal sprite scale
  fighter._canvasHeightRefH = null
  fighter._susanooActive = false             // release half-arena lock → full-stage movement
  fighter._arenaHalfLock = null
  fighter.canJump = true                     // restore jumping now the giant is gone
  fighter.ultimateCooldown = ULTIMATE_COOLDOWN_FRAMES   // 20s before another ultimate
}

// Per-frame: tick the Susanoo duration, auto-revert at 0. Called from updateTransformationState.
export function updateSasukeSusanoo(fighter) {
  if (!fighter || (fighter._susanooStage || 0) <= 0) return
  if ((fighter._susanooTimer || 0) > 0) {
    fighter._susanooTimer--
    if (fighter._susanooTimer <= 0) revertSasukeSusanoo(fighter)
  }
}

// Body-cell height (frameData.height in sprite.js) per Susanoo stage — must match
// _susanooBody's height arg so we can reproduce sprite.js's on-screen giant height.
const SUSANOO_CELL_H = { 1: 277, 2: 298 }
// On-screen fraction (0 = top of the head … 1 = feet) where each stage's ATTACKING
// arm/hand sits, measured from the anim sheets (sasuke_susanoo_lvl_*_ARMSCAN.png):
// Lv1 mace/grab arm ≈0.45, Lv2 bow/sword arm ≈0.50. Attack FX spawn at this height so
// they launch from the giant's hands — NOT the ground where Sasuke's small body used to be.
const SUSANOO_ARM_FRAC = { 1: 0.45, 2: 0.50 }

// yOff (relative to fighter.y) for a point `armFrac` down from the giant's rendered TOP,
// derived from the SAME sizing math sprite.js applies (draw() ~line 327):
//   scale  = canvasHeight * _canvasHeightFrac / _canvasHeightRefH
//   giantH = bodyCellH * scale                          (== dstH on screen)
//   the giant's rendered top sits at fighter.y - (giantH - fighterH)
// so a point armFrac down from that top is at yOff = fighterH - giantH*(1 - armFrac).
// Falls back to the old flat offset if the giant-sizing fields aren't set (defensive).
function _susanooArmYOff(fighter, context, armFrac) {
  const ch   = context?.canvasHeight
  const frac = fighter._canvasHeightFrac
  const refH = fighter._canvasHeightRefH
  const stage = fighter._susanooStage || 1
  if (!ch || !frac || !refH) return -170
  const scale    = (ch * frac) / refH
  const giantH   = (SUSANOO_CELL_H[stage] || 277) * scale
  const fighterH = fighter.h ?? fighter.height ?? 110
  return fighterH - giantH * (1 - armFrac)
}

// Spawn a Susanoo attack/activation FX as a visualOnly sprite in FRONT of the giant (the
// body stays giant; the FX carries the attack art). Positioned at the giant's arm/hand via
// `armFrac` (preferred — scales with the giant) or a flat `yOff` fallback. When `aimAt` {x,y}
// is given the FX drifts DOWN-and-forward toward that point (the opponent) at `drift` speed —
// so the strike visibly angles down from the high arm instead of sliding flat; else it drifts
// straight forward at `drift`. speed:0.001 dodges spawnProjectile's `speed || 11` default.
function _spawnSusanooFx(fighter, sheet, { frames, w, h, scale, life, drift = 0, yOff = -170, armFrac = null, aimAt = null, color = "#c9b6ff" }, context) {
  const finalYOff = (armFrac != null) ? _susanooArmYOff(fighter, context, armFrac) : yOff
  const spawnY = (fighter.y || 0) + finalYOff
  const fx = spawnProjectile(fighter, "susanooFx", {
    damage: 0, visualOnly: true, speed: 0.001, lifetime: life, spawnY,
    w: 24, h: 40, color,
    sheet, spriteFrames: frames, spriteW: w, spriteH: h, spriteSpeed: 4, spriteScale: scale
  }, context)
  if (fx) {
    if (aimAt) {
      const dx = aimAt.x - fx.x, dy = aimAt.y - spawnY
      const mag = Math.hypot(dx, dy) || 1
      fx.vx = (dx / mag) * drift
      fx.vy = (dy / mag) * drift
    } else {
      fx.vx = (fighter.facing || 1) * drift
    }
  }
  return fx
}
// ABSOLUTE DEFENSE barrier FX — REPURPOSES sasuke_susanoo_intro.png (the swirling purple aura/
// ribcage sheet that used to play on Susanoo's activation). Spawned once when Sasuke toggles
// Absolute Defense ON (game.handleChargeRelease). The purple aura reads as a protective shell
// manifesting around him — a better fit for a defensive toggle than for the Susanoo summon, which
// now uses a spriteless camera-punch instead (see executeSasukeUltimate). Play speed/scale tuned
// to sit over Sasuke's own body (not the giant), since Absolute Defense is a base-form ability.
export function spawnAbsoluteDefenseFx(fighter, context) {
  if (!fighter) return
  _spawnSusanooFx(fighter, "./sasuke_susanoo_intro.png",
    { frames: 6, w: 113, h: 70, scale: 1.6, life: 32, drift: 0, yOff: -60, color: "#b39ddf" }, context)
}

// Opponent hurtbox center — the aim point for auto-aimed Susanoo attacks.
function _oppCenter(target) {
  if (!target) return null
  return { x: (target.x || 0) + (target.w || 0) / 2, y: (target.y || 0) + (target.h || 0) / 2 }
}

function executeSasukeUltimate(fighter, context) {
  const stage = fighter._susanooStage || 0
  if (stage === 0) {
    // STAGE 1 — pay 50% of max energy once (roster ultimate convention), enter sustained Lv1.
    const cost = Math.ceil((fighter.maxEnergy || 100) * 0.5)
    if (!spendEnergy(fighter, cost)) return false
    _enterSusanooStage(fighter, 1)
    fighter._susanooTimer = SUSANOO_DURATION_FRAMES
    fighter._suppressUltCooldown = true          // no cooldown yet — allow Stage-2 escalation
    // ESCALATION GATE (diagnosed 2026-07-16 via live logging): the OLD 30-frame attackCooldown
    // silently swallowed the Stage-2 re-press for ~0.5s, so escalation "never" fired. Now use a
    // SHORT recovery (15f, still > the 10f input BUFFER_WINDOW so a single tap's lingering buffer
    // can't auto-escalate) AND require the ultimate button to be RELEASED before Stage 2 (so a
    // HELD button can't auto-escalate either). _ultReleasedSinceStage1 is flipped true on keyup.
    fighter._ultReleasedSinceStage1 = false
    // ASSET REPURPOSE (2026-07-18): sasuke_susanoo_intro.png moved to Absolute Defense
    // (spawnAbsoluteDefenseFx). Susanoo now activates with NO dedicated intro sprite — the Lv1
    // giant body simply appears, punctuated by a screen-flash + camera-punch (chosen option (b):
    // simpler transition, matching how other characters' lighter transforms enter). teleportFlash
    // gives the white activation pop so it never reads blank; the stronger camera shake sells the
    // giant slamming in. See SASUKE_ASSET_MAP.md.
    fighter.teleportFlash    = Math.max(fighter.teleportFlash || 0, 14)
    fighter.attackCooldown   = getAttackDuration(15, fighter)
    focusCameraOnAction(context, fighter, null, 0.9, 20)
    shakeCamera(context, 11, 14)
    return true
  }
  if (stage === 1) {
    // Require a genuine SECOND press: the ultimate must have been released since Stage 1 (blocks
    // a held button from escalating on its own). The short atkCd above blocks a single tap's buffer.
    if (!fighter._ultReleasedSinceStage1) return false
    // STAGE 2 is now gated behind a short SHARINGAN-AWAKENING cinematic (sasukeCinematic.js —
    // mirrors kurama.js: combat freezes while it plays). The actual escalation — drain ALL
    // remaining energy to 0 + swap stats/sprite to Lv2 — is applied by onResolve() at the
    // cinematic's RESOLVE beat, so it lands as the cinematic ends, not before it starts.
    fighter._suppressUltCooldown = true   // still mid-Susanoo → suppress the universal ult lockout NOW
    activateSasukeEyesCinematic(fighter, () => {
      fighter.energy = 0
      _enterSusanooStage(fighter, 2)
      fighter._suppressUltCooldown = true
      fighter.attackCooldown = getAttackDuration(24, fighter)
    })
    return true
  }
  return false   // already Lv2 — no-op; the timer (or revert) ends it
}

// Susanoo attacks — SPECIAL button while in Susanoo.
//   Lv1              → grab.
//   Lv2, spaced out  → arrow (ranged bow).
//   Lv2, up close    → SWORD slash (heaviest); hold DOWN for the grab instead.
// grab.png is the canonical grab for BOTH levels (see SASUKE_ASSET_MAP OQ15); grab_1/_2
// are alternate standalone variants, intentionally unused. Sword uses the FX-only
// sword_attack.png as a spawned overlay (this engine has no per-fighter attack-FX slot).
// BASE-KIT special (OUTSIDE Susanoo) — a fast forward dash-strike (Sharingan blitz) using
// sasuke_dash.png. This is Sasuke's ONLY non-Susanoo special: a cheap gap-closer / poke that
// CHIDORI KOITEN — qcb (Down,Back) + Special. Sasuke raises his hands (real windup) and releases
// a STATIONARY lightning discharge AROUND himself (not a traveling projectile). Same structural
// shape as Rick's Self-Destruct — damage resolves at ONE marked point (the active window), not
// continuously — but built through combat's normal startup/active/recovery pipeline: the "burst"
// IS the move's active window, and the caster-centred AOE hitbox (aoe:true → getAttackHitbox) only
// connects if the opponent is in range when active frames land. Sasuke takes no self-damage.
// MID-TIER SPECIAL pricing (see below). Body pose = sasuke_CHIDORI_KOITEN_attack.png (windup→
// discharge, 7f); lightning visual = sasuke_CHIDORI_KOITEN_effects.png spawned at the burst.
//   damage 95 (raw; ×GLOBAL_DAMAGE_SCALE 0.60 ≈ 57 effective) — above the basic Chidori dash-strike
//     (55 raw ≈ 33 eff) and the qcf lightning per-hit, well below Susanoo/ult-tier (Amaterasu/Kirin).
//   AOE 240×140 centred on Sasuke — a "get off me" burst; the proximity requirement is counterplay.
//   startup 16 / active 6 / recovery 20 — REAL windup (not instant/spammable), committal recovery.
//   cost 35 — above dash-strike (18) and lightning (24), below ultimate-tier. Mid-tier.
function executeSasukeChidoriKoiten(fighter, target, context) {
  if (!spendEnergy(fighter, 35)) return false
  const KOITEN_STARTUP = 16, KOITEN_ACTIVE = 6, KOITEN_RECOVERY = 20
  const attack = createAttackFromMove(fighter, "chidoriKoiten", {
    damage: 95, startup: KOITEN_STARTUP, active: KOITEN_ACTIVE, recovery: KOITEN_RECOVERY,
    hitstun: 30, knockbackX: 10, knockbackY: -4,
    rangeX: 240, rangeY: 140,          // stationary AOE around the caster
    aoe: true, isSpecial: true
  })
  setAttackState(fighter, attack, KOITEN_STARTUP + KOITEN_ACTIVE + KOITEN_RECOVERY)
  fighter._spriteCastMove  = "chidoriKoiten"   // windup→discharge body pose
  fighter._spriteCastTimer = KOITEN_STARTUP + KOITEN_ACTIVE + KOITEN_RECOVERY

  // Lightning discharge FX (visualOnly — never collides; the AOE hitbox above deals the damage),
  // spawned CENTRED on Sasuke a couple frames before the active window so it reads as the burst.
  const SCALE = 1.2, FW = 360, FH = 118
  schedulePendingSpawn(Math.max(1, KOITEN_STARTUP - 2), () => {
    spawnProjectile(fighter, "chidoriKoitenFx", {
      visualOnly: true, damage: 0, lifetime: 20, vx: 0, vy: 0,
      w: FW * SCALE, h: FH * SCALE, color: "#8fe6ff",
      spawnX: fighter.x + (fighter.w || 60) / 2 - (FW * SCALE) / 2,
      spawnY: fighter.y + (fighter.h || 100) / 2 - (FH * SCALE) / 2,
      sheet: "./sasuke_CHIDORI_KOITEN_effects.png", spriteFrames: 3, spriteW: FW, spriteH: FH, spriteSpeed: 4, spriteScale: SCALE
    }, context)
  })
  focusCameraOnAction(context, fighter, target, 0.97, 10)
  shakeCamera(context, 8, 10)
  return true
}

// bursts him forward and strikes. The dash sheet plays via _spriteCastMove (takes precedence
// over the attack's currentMove in sprite.js _resolveAction). Whiffs cleanly if <18 energy.
function executeSasukeDashStrike(fighter, target, context) {
  if (!spendEnergy(fighter, 18)) return false
  const attack = createAttackFromMove(fighter, "dashStrike", {
    damage: 55, startup: 4, active: 4, recovery: 12,
    hitstun: 18, knockbackX: 8, knockbackY: -2, rangeX: 100, rangeY: 55
  })
  setAttackState(fighter, attack, 22)
  fighter.vx = (fighter.facing || 1) * 14        // fast forward burst — closes the gap
  fighter._spriteCastMove  = "dash"              // render sasuke_dash.png through the strike
  fighter._spriteCastTimer = 18
  focusCameraOnAction(context, fighter, target, 0.98, 6)
  shakeCamera(context, 5, 5)
  return true
}

// SHURIKEN POKE — a simple ranged projectile poke on DOWN + special (S+L). Sits on the special
// button as a distinct motion (Megumi-style), NOT colliding with neutral special = dash-strike or
// qcf(D,F) = lightning: the dispatch checks D,F FIRST (lightning), then plain-D (shuriken), then
// neutral (dash). Free (no energy — a basic ninja tool), rate-limited by attackCooldown. Throws
// toward the opponent (auto-aimed), so it works as a spacing/zoning poke.
function executeSasukeShuriken(fighter, target, context) {
  const aim = _oppCenter(target)
  fighter._spriteCastMove  = "shurikenThrow"     // throw pose (sasuke_throwing_shuriken)
  fighter._spriteCastTimer = 14
  spawnProjectile(fighter, "sasukeShuriken", {
    damage: 34, speed: 14, lifetime: 70, hitstun: 14, knockbackX: 5, knockbackY: 0,
    w: 26, h: 26, color: "#d7ecff",
    spawnY: (fighter.y || 0) + (fighter.h || 100) * 0.35,   // chest height
    aimAt: aim,
    sheet: "./sasuke_shuriken.png", spriteFrames: 3, spriteW: 52, spriteH: 54, spriteSpeed: 2, spriteScale: 0.85
  }, context)
  fighter.attackCooldown = getAttackDuration(16, fighter)   // brief recovery (rate limit); no energy cost
  shakeCamera(context, 2, 3)
  return true
}

// ─────────────────────────────────────────────────────────────────
// SASUKE — TWO-STRIKE LIGHTNING (base-kit special, DOWN,FORWARD + special / "qcf")
// ─────────────────────────────────────────────────────────────────
// Sasuke's SECOND non-Susanoo special, sharing the special button with the dash-strike via a
// motion split (plain special = dash-strike; qcf+special = this). A scripted, TELEGRAPHED
// two-hit lightning combo: HANDSEALS (rooted, fully vulnerable — a hit during this window
// CANCELS everything and eats the energy, mirroring startup-phase interruption) → STRIKE_1
// (pillar down from above) → gap → STRIKE_2 (ground burst) → resolve. Two SEPARATE blockable
// hits (chip on block), meaningfully less total damage than the Susanoo ultimate, cost in line
// with the specials. Target column is LOCKED at cast start so the handseal is a real dodge window.
const LIGHTNING = {
  cost: 24,
  handseal: 30,   // vulnerability / telegraph window (frames)
  strike1:  14,   // strike-1 hold
  gap:       6,   // between strikes
  strike2:  16,   // strike-2 hold
  dmg1:     42,
  dmg2:     46    // total 88 raw < any Susanoo attack; both blockable (chip)
}

function executeSasukeLightning(fighter, target, context) {
  if (fighter._lightningPhase) return false                 // already casting
  if (!spendEnergy(fighter, LIGHTNING.cost)) return false
  fighter._lightningPhase   = "handseal"
  fighter._lightningTimer   = LIGHTNING.handseal
  fighter._rooted           = true                          // planted during the seals (physics canMove)
  // Lock the strike location NOW so the ~0.5s handseal is a genuine dodge window: the opponent
  // can walk out of the targeted column before the bolts land.
  fighter._lightningTargetX = target
    ? (target.x || 0) + (target.w || 0) / 2
    : (fighter.x || 0) + (fighter.facing || 1) * 160
  // Block other actions for the whole sequence; a hit still cancels via updateSasukeLightning.
  fighter.attackCooldown = getAttackDuration(LIGHTNING.handseal + LIGHTNING.strike1 + LIGHTNING.gap + LIGHTNING.strike2 + 8, fighter)
  fighter.vx = 0
  shakeCamera(context, 3, LIGHTNING.handseal)               // subtle wind-up rumble = the telegraph
  return true
}

// Spawn ONE strike at the locked target x. Two projectiles: a PERSISTENT visualOnly bolt (so
// the strike is actually SEEN — a colliding projectile despawns on contact, flashing for a
// single frame) + a compact real hit projectile at the opponent's body. Collision is a circle
// of radius max(w,h)/2 centered on (x,y) (combat.resolveProjectileHits), so the hit projectile
// is kept small/square and placed on the body; the tall sprite is carried by the visual only.
function _spawnLightningStrike(fighter, context, which) {
  const gy = context?.groundY ?? ((fighter.y || 0) + (fighter.h || 110))
  const tx = fighter._lightningTargetX ?? (fighter.x || 0)
  const cfg = which === 1
    ? { name: "sasukeLightning1", dmg: LIGHTNING.dmg1, life: LIGHTNING.strike1, hitstun: 22, kbx: 4, kby: -8,
        sheet: "./sasuke_lighting_attack_1_ repeatable.png", frames: 4, sw: 65, sh: 137, sscale: 1.7,
        visY: gy - 120, hitY: gy - 55, off: 0, color: "#7fdfff" }              // STRIKE 1 — pillar from above
    : { name: "sasukeLightning2", dmg: LIGHTNING.dmg2, life: LIGHTNING.strike2, hitstun: 26, kbx: 8, kby: -4,
        sheet: "./sasuke_lighting_attack_repeatable.png", frames: 4, sw: 139, sh: 64, sscale: 1.3,
        visY: gy - 34, hitY: gy - 30, off: (fighter.facing || 1) * 10, color: "#aef0ff" }  // STRIKE 2 — ground burst
  // Persistent VISUAL bolt (never collides → shows its full animation).
  spawnProjectile(fighter, cfg.name + "Fx", {
    visualOnly: true, damage: 0, w: 30, h: 40, color: cfg.color,
    spawnX: tx + cfg.off, spawnY: cfg.visY, vx: 0, vy: 0, lifetime: cfg.life,
    sheet: cfg.sheet, spriteFrames: cfg.frames, spriteW: cfg.sw, spriteH: cfg.sh, spriteSpeed: 3, spriteScale: cfg.sscale
  }, context)
  // Compact real HIT at the opponent's body — blockable (chip) via resolveProjectileHits.
  spawnProjectile(fighter, cfg.name, {
    damage: cfg.dmg, hitstun: cfg.hitstun, knockbackX: cfg.kbx, knockbackY: cfg.kby,
    w: 56, h: 56, spawnX: tx + cfg.off, spawnY: cfg.hitY, vx: 0, vy: 0, lifetime: cfg.life, color: cfg.color
  }, context)
  shakeCamera(context, 6, 7)
}

// Per-frame lightning driver (called from updateTransformationState). Cancel-on-hit applies only
// during the handseal window; once the bolts start the cast is committed.
export function updateSasukeLightning(fighter, context) {
  if (!fighter || !fighter._lightningPhase) return
  if (fighter._lightningPhase === "handseal" &&
      ((fighter.hitstun || 0) > 0 || (fighter.stun || 0) > 0 || fighter.knockdownState)) {
    fighter._lightningPhase = null
    fighter._rooted = false
    return
  }
  if (fighter._rooted) fighter.vx = 0
  if ((fighter._lightningTimer || 0) > 0) { fighter._lightningTimer--; if (fighter._lightningTimer > 0) return }
  switch (fighter._lightningPhase) {
    case "handseal":
      fighter._lightningPhase = "strike1"; fighter._lightningTimer = LIGHTNING.strike1
      _spawnLightningStrike(fighter, context, 1)
      break
    case "strike1":
      fighter._lightningPhase = "gap"; fighter._lightningTimer = LIGHTNING.gap
      break
    case "gap":
      fighter._lightningPhase = "strike2"; fighter._lightningTimer = LIGHTNING.strike2
      _spawnLightningStrike(fighter, context, 2)
      break
    default:   // strike2 finished
      fighter._lightningPhase = null
      fighter._rooted = false
      break
  }
}

// Public: is Sasuke mid lightning cast? (harness / future gating)
export function sasukeCastingLightning(fighter) { return !!(fighter && fighter._lightningPhase) }

// SASUKE SUBSTITUTION JUTSU (Kawarimi) — mirrors Naruto's Kawarimi Substitution EXACTLY (same
// architecture, same Block+Special-during-an-incoming-attack input, same 25 meter cost, same real
// startup + recovery tail so it's a committed defensive tool, NOT a free instant panic button):
// the incoming swing is CONSUMED (whiffs, no damage) via the same `hasHit` pattern, Sasuke gets
// brief i-frames + a smoke poof, and after the startup he re-appears with a second poof.
// ONE difference from Naruto's version: instead of Naruto's far-side reposition, Sasuke reappears
// using HIS OWN double-tap dash-behind-teleport positioning math (game.js `teleportBehindTarget`,
// replicated verbatim below — abilities.js can't import game.js without a cycle). Visual =
// sasuke_substitusion_justu.png (3 smoke-poof + wooden-log reveal) left at his origin, plus the
// SAME procedural clone-puff smoke Kawarimi uses for the poof-out / poof-in.
const SASUKE_SUBSTITUTION_STARTUP = 6
function executeSasukeSubstitution(fighter, target, context) {
  if (!spendEnergy(fighter, 25)) return false
  const threat = target && target.currentAttack
  if (threat) threat.hasHit = true                                   // the incoming swing whiffs, guaranteed
  fighter.invulnTimer   = Math.max(fighter.invulnTimer || 0, 14)     // also covers stray projectiles
  fighter.teleportFlash = 16

  // poof OUT at the ORIGIN (capture it before the reposition) + leave the substitution log there.
  const originX = fighter.x + (fighter.w || 60) / 2
  const originY = fighter.y + (fighter.h || 100) / 2
  spawnClonePuff(originX, originY)                                   // same procedural smoke Kawarimi uses
  spawnProjectile(fighter, "substitutionLog", {                      // 3 smoke-poof + wooden-log reveal
    visualOnly: true, damage: 0, lifetime: 26, vx: 0, vy: 0,
    spawnX: originX - 40, spawnY: fighter.y,
    w: 58, h: 71, color: "#a8743a",
    sheet: "./sasuke_substitusion_justu.png", spriteFrames: 4, spriteW: 58, spriteH: 71, spriteSpeed: 6, spriteScale: 1.4
  }, context)

  // Real startup + recovery tail (same frame-shape all the specials use) → committed, not spammable.
  fighter.attackCooldown = getAttackDuration(SASUKE_SUBSTITUTION_STARTUP + 20, fighter)
  schedulePendingSpawn(SASUKE_SUBSTITUTION_STARTUP, () => {
    if (target) {
      const sw = context?.worldWidth || 3200
      // ── teleportBehindTarget positioning math (game.js), replicated exactly ──
      fighter.x = fighter.x < target.x ? target.x - fighter.w - 8 : target.x + target.w + 8
      fighter.x = Math.max(0, Math.min(sw - fighter.w, fighter.x))
      fighter.y = target.y
      fighter.vx = 0; fighter.vy = 0
      fighter.facing = (target.x >= fighter.x) ? 1 : -1
    }
    spawnClonePuff(fighter.x + (fighter.w || 60) / 2, fighter.y + (fighter.h || 100) / 2)   // poof IN
  })
  focusCameraOnAction(context, fighter, target, 1.0, 8)
  return true
}

function executeSasukeSpecial(fighter, context) {
  const stage = fighter._susanooStage || 0
  const getOpp = getTargetResolver(context)
  const target = getOpp(fighter)
  // BASE KIT (no Susanoo): motion split on the SAME special button (Megumi-style). Check the MOST
  // specific motion first so subsets don't shadow it:
  //   down,forward + special (qcf) → two-strike LIGHTNING
  //   down + special              → SHURIKEN ranged poke   (checked after qcf: D,F also ends with D)
  //   plain special               → dash-strike
  if (stage <= 0) {
    // SUBSTITUTION JUTSU (Kawarimi) — Block+Special during an INCOMING attack. Checked FIRST so
    // it takes priority over the down-motion specials while a swing is incoming; with NOTHING
    // incoming it falls through to the normal specials (down = Shuriken, etc.). Same shape as
    // Naruto's Kawarimi vs Dark Rasengan (both share the block/down input).
    if (fighter.isBlocking) {
      const threat   = target && target.currentAttack
      const incoming = !!(threat && target.attacking && !threat.hasHit &&
        ((threat.total || 0) - (threat.timer || 0)) <= (threat.activeEnd || 0))
      if (incoming) return executeSasukeSubstitution(fighter, target, context)
      // blocking with nothing incoming → not a valid Substitution; fall through to normals.
    }
    const dirs = getRelativeDirections(fighter)
    if (endsWithPattern(dirs, ["D", "F"])) return executeSasukeLightning(fighter, target, context)
    if (endsWithPattern(dirs, ["D", "B"])) return executeSasukeChidoriKoiten(fighter, target, context)   // qcb: AOE lightning discharge
    if (endsWithPattern(dirs, ["D"]))      return executeSasukeShuriken(fighter, target, context)
    return executeSasukeDashStrike(fighter, target, context)
  }
  const b = SUSANOO_STAGE[stage]
  const distanceX = target ? Math.abs((fighter.x || 0) - (target.x || 0)) : 0
  const aim = _oppCenter(target)   // auto-aim point (opponent hurtbox center)

  // Lv2 ranged option — the arrow (bow). A real damaging projectile; body stays giant.
  if (stage === 2 && distanceX > 170) {
    // Fire from the giant's bow hand (spawnY = arm height) and AUTO-AIM down at the opponent
    // so the arrow arcs diagonally down-and-forward from up high, not flat across.
    spawnProjectile(fighter, "susanooArrow", {
      damage: b.arrowDmg, speed: 15, lifetime: 70, hitstun: 30, knockbackX: 12, knockbackY: -3,
      color: "#a78bfa", w: 42, h: 20,
      spawnY: (fighter.y || 0) + _susanooArmYOff(fighter, context, SUSANOO_ARM_FRAC[2]),
      aimAt: aim,
      sheet: "./sasuke_susanoo_arrow_attack.png", spriteFrames: 5, spriteW: 110, spriteH: 95, spriteScale: 1.1
    }, context)
    fighter.attackCooldown = getAttackDuration(26, fighter)
    focusCameraOnAction(context, fighter, target, 0.98, 8)
    shakeCamera(context, 6, 6)
    return true
  }

  // Lv2 close-range default — SWORD slash (heaviest melee). Hold DOWN to grab instead.
  const holdingDown = getRelativeDirections(fighter).includes("D")
  if (stage === 2 && !holdingDown) {
    const swordAtk = createAttackFromMove(fighter, "susanooSword", {
      damage: b.swordDmg, startup: 14, active: 10, recovery: 24,
      hitstun: 34, knockbackX: 15, knockbackY: -6,
      rangeX: 260, rangeY: 160                     // giant blade sweep — long + tall reach
    })
    setAttackState(fighter, swordAtk, 34)
    // FX-only sheet → spawned as a visualOnly slash in front of the giant (body stays giant).
    // 5 uniform lightning-bolt frames (the sheet's 6th non-uniform 'diagonal' cell can't be
    // atlas-sliced by the uniform slicer) read as a lightning-blade flurry.
    _spawnSusanooFx(fighter, "./sasuke_susanoo_sword_attack.png",
      { frames: 5, w: 112, h: 282, scale: 2.4, life: 26, drift: 5, armFrac: SUSANOO_ARM_FRAC[2], aimAt: aim, color: "#f5e35a" }, context)
    focusCameraOnAction(context, fighter, target, 0.96, 8)
    shakeCamera(context, 10, 10)
    return true
  }

  // Grab (melee, extending ribcage arm — long reach). Lv2 grab (DOWN-held) hits harder than Lv1.
  const attack = createAttackFromMove(fighter, "susanooGrab", {
    damage: b.grabDmg, startup: 12, active: 8, recovery: 22,
    hitstun: 30, knockbackX: 10, knockbackY: -4,
    rangeX: 210, rangeY: 95                        // long reach = the extending arm
  })
  setAttackState(fighter, attack, 30)
  // grab.png FX = the extending clawed arm. Its 2 "reach" frames (the big cells) slice cleanly
  // as 3 frames of 264px (flurry → reach → reach); the body stays giant behind it.
  _spawnSusanooFx(fighter, "./sasuke_susanoo_grab.png",
    { frames: 3, w: 264, h: 80, scale: 2.6, life: 24, drift: 7, armFrac: SUSANOO_ARM_FRAC[stage] || SUSANOO_ARM_FRAC[1], aimAt: aim, color: "#9a86d8" }, context)
  focusCameraOnAction(context, fighter, target, 0.98, 8)
  shakeCamera(context, 7, 7)
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
    case "sasuke":  return executeSasukeSpecial(fighter, context)   // Susanoo grab/arrow (only while in Susanoo)
    case "omololu": return executeOmoluSpecial(fighter, context)
    case "toji":    return executeToji_Special(fighter, context)
    case "rick":    return executeRickSpecial(fighter, context)
    // Goku Black — Stage 3a: Kamehameha (QCF) + Spirit Bomb (QCB). Neutral/other motions return
    // false (no-op, no glitch) until Explosion (neutral) lands in Stage 3b. NOTE: the ULTIMATE
    // dispatch still no-ops goku_black (Sword Slash = Stage 3b) — do not remove that one yet.
    case "goku_black": return executeGokuBlackSpecial(fighter, context)
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
      case "sasuke":  cast = executeSasukeUltimate(fighter, context);  break   // two-stage Susanoo
      case "omololu": cast = executeOmoluUltimate(fighter, context);   break
      case "toji":    cast = executeToji_Ultimate(fighter, context);   break
      case "rick":    cast = executeRickUltimate(fighter, context);    break
      // Goku Black — Stage 3b: Sword Slash (Rose-only sure-hit with a real interruptible windup).
      case "goku_black": cast = executeGokuBlackUltimate(fighter, context); break
      default:        cast = executeFallbackUltimate(fighter, context); break
    }
  }

  // UNIVERSAL COOLDOWN: only start it when the ultimate ACTUALLY fired — executeX
  // returns false if it bailed (e.g. not enough meter), so a failed attempt never
  // locks the ultimate out. Applies to every character through this one dispatch.
  // EXCEPTION: a cast can set fighter._suppressUltCooldown to defer the lockout (Sasuke's
  // Susanoo — no cooldown while active so Stage 2 stays pressable; the 20s lockout is armed
  // in revertSasukeSusanoo instead). One-shot: consumed here so it never sticks.
  if (cast) {
    if (fighter._suppressUltCooldown) fighter._suppressUltCooldown = false
    else fighter.ultimateCooldown = ULTIMATE_COOLDOWN_FRAMES
  }
  return cast
}

// ─────────────────────────────────────────────────────────────────
// FALLBACK (for any character not in the 7-character starter list)
// ─────────────────────────────────────────────────────────────────
// ── RICK SANCHEZ ──────────────────────────────────────────────────
// ZONER. Keep opponents out with Meeseeks / Rocket / Self-Destruct; melee is backup.
// Special button:  neutral = Meeseeks Box (summon)  |  Up + Special = Rocket (up-special)
//   |  QCF + Special = Portal-Pull  |  QCB + Special = Portal-Push.
// Portal-Behind is NOT here — it's on the double-tap movement (game.js
// detectDoubleTapDashTeleport), shared with Gojo/Sukuna/Toji/Sasuke.
// Ultimate = Self-Destruct (instant proximity AOE, no self-damage). See RICK_ASSET_MAP.md.

// PORTAL-PULL / PORTAL-PUSH — ONE mechanic, two destinations. Pull yanks the
// opponent adjacent to Rick (combo starter); Push banishes them to the far stage
// edge (spacing/punish). BOTH reappear the opponent ABOVE the destination and let
// them FALL — reusing the launcher's target pop-up fields (vy/onGround/isLaunched)
// rather than a bespoke fall-damage system. The landing impact is resolved in
// game.js (resolvePortalDropLanding) the frame the target regrounds, mirroring the
// _dot marker→resolver split. Returns false (a whiff) if the opponent is gone or
// invulnerable; the caller still spends meter + plays the cast, like a whiffed grab.
const RICK_PORTAL_DROP_HEIGHT = 220   // px the opponent reappears ABOVE the destination floor
function rickPortalReposition(fighter, target, context, mode, dmg, hitstun) {
  if (!target || target.eliminated) return false
  if ((target.invulnTimer || 0) > 0) return false      // i-frames can't be portalled → whiff

  const worldW = getWorldWidth(context)
  const stageL = 0
  const stageR = worldW
  const tw     = target.w || 60
  const rickCx = fighter.x + (fighter.w || 60) / 2

  // Destination X (the target's left edge), clamped inside the playable stage.
  let destX
  if (mode === "pull") {
    // Adjacent to Rick, on the side he faces — drag them into melee range.
    const gap = 26
    destX = (fighter.facing || 1) === 1
      ? fighter.x + (fighter.w || 60) + gap
      : fighter.x - tw - gap
  } else {
    // PUSH: the farther valid edge → maximum distance while staying in-bounds, so
    // the opponent can never be thrown off the playable stage.
    const leftDest  = stageL
    const rightDest = stageR - tw
    destX = Math.abs(leftDest - rickCx) >= Math.abs(rightDest - rickCx) ? leftDest : rightDest
  }
  destX = Math.max(stageL, Math.min(stageR - tw, destX))

  // Reappear ABOVE the destination floor and fall — reuse the launcher's target
  // pop-up fields. isLaunched keeps applyGravity from snapping them to the floor.
  const floor = target.groundY != null ? target.groundY
              : (context?.groundY ?? (target.y + (target.h || 100)))
  target.x          = destX
  target.y          = floor - (target.h || 100) - RICK_PORTAL_DROP_HEIGHT
  target.vx         = 0
  target.vy         = 0
  target.onGround   = false
  target.grounded   = false
  target.isLaunched = true
  target.jumpCount  = 0
  target.isGrabbed  = false
  target.hitstun    = Math.max(target.hitstun || 0, 20)   // helpless through the drop
  target.teleportFlash = 14

  // Pending landing impact — resolved by game.js the frame they reground.
  target._portalDrop = { dmg, hitstun, ttl: 240, category: "special", src: fighter.side }

  fighter.facing = (target.x >= fighter.x) ? 1 : -1
  return true
}

// A pure-visual portal-green ring where the opponent reappears (readability). Never
// collides — the impact damage is applied on landing, so this must not double-hit.
function spawnRickPortalFx(fighter, target, context) {
  const cx = (target ? target.x + (target.w || 60) / 2 : fighter.x)
  const cy = (target ? target.y + (target.h || 100) / 2 : fighter.y)
  spawnProjectile(fighter, "portalWarp", {
    visualOnly: true, damage: 0, lifetime: 20,
    vx: 0, vy: 0, w: 130, h: 130, radius: 65, color: "#8be04e",
    spawnX: cx, spawnY: cy
  }, context)
}

function executeRickSpecial(fighter, context) {
  const dirs        = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  // QCF (D→F) + Special = PORTAL-PULL. Yank the opponent next to Rick (combo
  // starter). Cheaper than Push because most of its value is the free position
  // + combo it grants, not the hit itself.
  if (endsWithPattern(dirs, ["D", "F"])) {
    if (!spendEnergy(fighter, 35)) return false
    // 42 EFFECTIVE (direct/unscaled — the manual-damage convention shared by the ult
    // AND summons; NOT the projectile ×0.60 path). Deliberately the softest special
    // (below Rocket's 57 and Meeseeks' 45): the payoff is the free melee position +
    // combo, so the hit itself is secondary. See RICK_ASSET_MAP.md numbers section.
    rickPortalReposition(fighter, target, context, "pull", 42, 30)
    fighter._spriteCastMove  = "portalTravel"
    fighter._spriteCastTimer = 22
    fighter.attackCooldown   = getAttackDuration(20, fighter)
    spawnRickPortalFx(fighter, target, context)
    focusCameraOnAction(context, fighter, target, 1.0, 10)
    return true
  }

  // QCB (D→B) + Special = PORTAL-PUSH. Banish the opponent to the far edge
  // (spacing / punish). Costs more and hits harder — the damage IS the reward,
  // since (unlike Pull) it grants no follow-up, just a full-screen reset.
  if (endsWithPattern(dirs, ["D", "B"])) {
    if (!spendEnergy(fighter, 45)) return false
    // 65 EFFECTIVE (direct/unscaled, same convention). Deliberately the hardest-hitting
    // special, but only a modest committal premium over Rocket's 57 — NOT the old
    // accidental 90. Justified: Push is the most committal/situational special (QCB
    // motion, needs a live target, WHIFFS on i-frames while still spending 45 meter,
    // and grants NO follow-up — just a full-screen reset). See RICK_ASSET_MAP.md.
    rickPortalReposition(fighter, target, context, "push", 65, 34)
    fighter._spriteCastMove  = "portalTravel"
    fighter._spriteCastTimer = 22
    fighter.attackCooldown   = getAttackDuration(22, fighter)
    spawnRickPortalFx(fighter, target, context)
    focusCameraOnAction(context, fighter, target, 0.95, 12)
    return true
  }

  // DOWN + Special = PORTAL-GUN LASER. FREE (0 energy) fast ranged poke — a spacing tool
  // that doesn't compete with the costed specials. Deliberately the weakest hit in the kit.
  if (dirs.length > 0 && dirs[dirs.length - 1] === "D") {
    // No energy cost. The 24f cooldown is the ONLY limiter (prevents laser-spam).
    const face = fighter.facing || 1
    spawnProjectile(fighter, "portalLaser", {
      damage: 20,                    // ×GLOBAL_DAMAGE_SCALE 0.60 ≈ 12 effective — far below
      speed: 16, lifetime: 60,       // Meeseeks 45 / Rocket 57 / Pull 42 / Push 65; fast + long range
      vx: face * 16, vy: 0,
      hitstun: 10, knockbackX: 4, knockbackY: 0,
      w: 26, h: 8, color: "#4dd2ff", // simple bright-blue laser bolt (no sheet → colored shape)
      spawnX: face === 1 ? fighter.x + (fighter.w || 60) : fighter.x - 26,
      spawnY: fighter.y + (fighter.h || 100) * 0.34
    }, context)
    fighter._spriteCastMove  = "gunShot"
    fighter._spriteCastTimer = 14
    fighter.attackCooldown   = getAttackDuration(24, fighter)
    return true
  }

  // UP + Special = ROCKET. Launches Rick upward AND damages anyone caught in the path.
  if (dirs.length > 0 && dirs[dirs.length - 1] === "U") {
    if (!spendEnergy(fighter, 40)) return false
    fighter.vy        = -22           // upward launch (recovery + mobility)
    fighter.onGround  = false
    fighter.grounded  = false
    fighter.isLaunched = true
    fighter.jumpCount = fighter.maxJumps || 2   // consume air jumps so a double-jump can't stack extra height
    fighter._spriteCastMove  = "rocket"
    fighter._spriteCastTimer = 26
    fighter.attackCooldown   = getAttackDuration(20, fighter)
    // RANGE EXTENDED: was a short vertical burst that left the top bound (y<-200) in ~39f.
    // Now a genuine long-traveling rocket — fires FORWARD across the stage (vx 3→14) and LEVEL
    // (vy -16→0, so it stays at launch height and reliably catches grounded foes downrange rather
    // than climbing over them) with lifetime 34→90, ~1260px of reach. Damage/cost unchanged (95/40).
    spawnProjectile(fighter, "rocket", {
      damage: 95, lifetime: 90,
      vx: (fighter.facing || 1) * 14, vy: 0,
      hitstun: 22, knockbackX: 8, knockbackY: -10,
      w: 64, h: 72, color: "#ff6b35",   // generous blast — a wide rocket that catches anyone in its forward lane
      sheet: "./rick_rocket_specail.png", spriteFrames: 1, spriteScale: 1.5,
      spawnX: fighter.x + (fighter.w || 60) / 2 - 22,
      spawnY: fighter.y + (fighter.h || 100) * 0.3
    }, context)
    focusCameraOnAction(context, fighter, target, 1.0, 8)
    return true
  }

  // NEUTRAL Special = MEESEEKS BOX. Throws a Meeseeks that rushes the opponent. NO cap:
  // only energy limits how many are active (meeseeks template maxSimultaneous 99, and we
  // deliberately do NOT gate on summonCooldown), so multiple Meeseeks can be out at once.
  if (!spendEnergy(fighter, 30)) return false
  spawnAssistSummon(fighter, { summonId: "meeseeks", damage: 45 }, target)
  fighter._spriteCastMove  = "meeseeksThrow"
  fighter._spriteCastTimer = 20
  fighter.attackCooldown   = getAttackDuration(22, fighter)
  return true
}

function executeRickUltimate(fighter, context) {
  // SELF-DESTRUCT: instant proximity AOE. Only connects if the opponent is inside the blast.
  // Rick takes NO self-damage and is not knocked down — the near-max meter cost is the only
  // balance lever (no startup / vulnerability window). Damage is applied directly (summon-style,
  // bypassing GLOBAL_DAMAGE_SCALE) so 180 ≈ a genuine ultimate burst.
  if (!spendEnergy(fighter, 140)) return false

  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  const RADIUS = 220        // px, center-to-center — "bigger than a normal special" catch zone
  const DAMAGE = 180        // direct (no GLOBAL_DAMAGE_SCALE); ≈17% of a health bar

  const rcx = fighter.x + (fighter.w || 60) / 2
  const rcy = fighter.y + (fighter.h || 100) / 2

  // Instant blast visual (pure FX, never collides — damage is applied manually below so we can
  // proximity-gate it and guarantee zero self-damage).
  spawnProjectile(fighter, "selfDestructBlast", {
    visualOnly: true, damage: 0, lifetime: 22,
    vx: 0, vy: 0, spawnX: rcx, spawnY: rcy,
    w: RADIUS * 2, h: RADIUS * 2, radius: RADIUS, color: "#8be04e"
  }, context)

  // Rick's body plays the self-destruct pose; NO attacking/vulnerability state is set.
  fighter._spriteCastMove  = "selfDestruct"
  fighter._spriteCastTimer = 30
  fighter.attackCooldown   = getAttackDuration(10, fighter)   // only prevents an accidental instant re-press
  shakeCamera(context, 16, 18)
  focusCameraOnAction(context, fighter, target, 0.95, 14)

  // Proximity gate + damage. Only the opponent is touched → Rick takes no self-damage.
  if (target && !target.eliminated && (target.invulnTimer || 0) <= 0) {
    const tcx  = target.x + (target.w || 60) / 2
    const tcy  = target.y + (target.h || 100) / 2
    const dist = Math.hypot(tcx - rcx, tcy - rcy)
    if (dist <= RADIUS) {
      let dmg = DAMAGE
      if (target.isBlocking) { dmg = Math.floor(dmg * 0.20); target.blockstun = 18 }
      else {
        target.hitstun    = 42
        target.vx         = (tcx >= rcx ? 1 : -1) * 16
        target.vy         = -9
        target.colorFlash = 8
      }
      target.health = Math.max(0, (target.health || 0) - dmg)
    }
  }
  return true
}

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

  // Sasuke Susanoo: tick the sustained-form timer (frame-based, no per-frame energy drain);
  // auto-reverts at 0 and arms the 20s ultimate cooldown. No-op when not in Susanoo.
  updateSasukeSusanoo(fighter)

  // Sasuke two-strike lightning: drive the handseal → strike1 → strike2 state machine.
  // No-op unless a cast is in progress.
  updateSasukeLightning(fighter, context)

  // Goku Black Sword Slash: drive the vulnerable windup → reaction-window → sure-hit state
  // machine (mirrors Sasuke lightning). No-op unless a cast is in progress.
  updateGokuBlackSwordSlash(fighter, context)

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

// ─────────────────────────────────────────────────────────────────────────
// REUSABLE: SUSTAINED-FORM PER-FRAME ENERGY DRAIN + AUTO-REVERT
// Generalizes Gojo Infinity's per-frame drain into ONE primitive any future
// "sustained form" can reuse: deduct `drainPerFrame` from energy every frame the
// form is active, and the INSTANT the meter can't cover the tick, snap the form
// off via `revert`. Called BEFORE regenEnergy each frame (updateFighterState), so
// passive regen can EXTEND the form but never perpetuate it — matching the design's
// "actively top up energy to stay transformed longer". Not character-specific.
// ─────────────────────────────────────────────────────────────────────────
export function tickSustainedFormDrain(fighter, { active, drainPerFrame, revert }) {
  if (!fighter || !active(fighter)) return
  if ((fighter.energy || 0) >= drainPerFrame) {
    fighter.energy = Math.max(0, fighter.energy - drainPerFrame)
  } else {
    fighter.energy = 0
    revert(fighter)   // auto-revert the exact frame the meter runs dry
  }
}

// ─────────────────────────────────────────────────────────────────────────
// GOKU BLACK — SSJ ROSE  (continuous-drain sustained transform)
// Threshold-gated activation (no entry cost), continuous per-frame drain, instant
// auto-revert at 0, and a FULL art form-swap (Rose sheets via _skinAnim, Susanoo
// precedent). Distinct from Susanoo (fixed timer), Gojo Infinity (per-frame drain
// but no form-swap), and Absolute Defense (per-block cost).
// ─────────────────────────────────────────────────────────────────────────
const SSJ_ROSE_THRESHOLD = 180              // energy ≥ 180 (90% of maxEnergy 200) — "at or near max"
const SSJ_ROSE_DRAIN     = 0.30             // energy/frame while transformed (~18/s @60fps; net −0.24 vs 0.06 regen → ~12.5s from 180)
const SSJ_ROSE_MULT      = { dmg: 1.25, spd: 1.15, def: 1.10 }
// Rose art set (RE-SLICED uniform, feet-aligned). Replaces the base black_goku_* set while transformed.
const SSJ_ROSE_ANIM = {
  idle:      { frames: 4, width: 29,  height: 70, speed: 6, anchorY: 0, sheet: "./goku_black_ssj_rose_idle.png" },
  walk:      { frames: 4, width: 58,  height: 46, speed: 5, anchorY: 0, sheet: "./goku_black_ssj_rose_run.png" },
  run:       { frames: 4, width: 58,  height: 46, speed: 4, anchorY: 0, sheet: "./goku_black_ssj_rose_run.png" },
  dash:      { frames: 2, width: 65,  height: 42, speed: 5, anchorY: 0, sheet: "./goku_black_ssj_rose_dash.png" },
  jump:      { frames: 6, width: 49,  height: 74, speed: 6, anchorY: 0, sheet: "./goku_black_ssj_rose_jump.pmg.png" },
  fall:      { frames: 6, width: 49,  height: 74, speed: 6, anchorY: 0, sheet: "./goku_black_ssj_rose_jump.pmg.png" },
  hurt:      { frames: 7, width: 71,  height: 69, speed: 6, anchorY: 0, sheet: "./goku_black_ssj_rose_hit.png" },
  knockdown: { frames: 6, width: 71,  height: 60, speed: 6, anchorY: 0, sheet: "./goku_black_ssj_rose_get_up.png" },
  guard:     { frames: 3, width: 46,  height: 54, speed: 6, anchorY: 0, sheet: "./goku_black_ssj_rose_gaurd.png" },
  light:     { frames: 6, width: 65,  height: 56, speed: 3, anchorY: 0, sheet: "./goku_black_ssj_rose_foward_attack.png" },
  heavy:     { frames: 8, width: 108, height: 68, speed: 2, anchorY: 0, sheet: "./goku_black_ssj_rose_ki_slash.png" },   // Ki Slash (Rose)
  up:        { frames: 4, width: 43,  height: 62, speed: 3, anchorY: 0, sheet: "./goku_black_ssj_rose_up_attack.png" },
  air:       { frames: 5, width: 63,  height: 70, speed: 4, anchorY: 0, sheet: "./goku_black_ssj_rose_down_attack.png" },
  down_air:  { frames: 5, width: 63,  height: 70, speed: 4, anchorY: 0, sheet: "./goku_black_ssj_rose_down_attack.png" },
  // Special CHARGE→RELEASE cast poses (Stage 3a) — Rose variants; base variants live in characters.js.
  // The _skinAnim swap makes the caster pose form-aware automatically (same action key, Rose sheet).
  gbKamehameha: { frames: 10, width: 95, height: 58, speed: 4, anchorY: 0, sheet: "./goku_black_ssj_rose_kamehameha.png" },
  gbSpiritBomb: { frames: 6,  width: 53, height: 65, speed: 5, anchorY: 0, sheet: "./goku_black_ssj_rose_spirit_bomb.png" },
  // SWORD SLASH cast pose (Rose-only ultimate) — 17-frame combined character+effect: windup → pink
  // aura burst → committed slash arcs. RE-SLICED (wide cells hold the extending blade arc; the
  // bottom-aligned character stays centered on the fighter, the arc extends past him). Plays across
  // the vulnerable windup + reaction window + slash.
  gbSwordSlash: { frames: 17, width: 397, height: 84, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./goku_black_ssj_rose_sword_slahs_Special.png" },
  // SSJ-ROSE-EXCLUSIVE SLASH SPECIALS (Stage 3c) — caster poses only exist for the transformed
  // state (no base-form art), so these live ONLY here in SSJ_ROSE_ANIM (mirrors gbSwordSlash).
  // The dispatch gates them on _ssjRoseActive so the keys are never referenced in base form.
  gbElectricKiPush: { frames: 4, width: 64, height: 59, speed: 3, anchorY: 0, sheet: "./goku_black_ssj_rose_electric_ki_push.png" }, // 4-pose palm-shove
  gbElectricSlash:  { frames: 6, width: 65, height: 82, speed: 2, anchorY: 0, sheet: "./goku_black_ssj_rose_electric_slash.png" },   // charge → yellow crescent → recover
  gbSuperKiSlash:   { frames: 9, width: 80, height: 67, speed: 2, anchorY: 0, sheet: "./goku_black_ssj_rose_super_ki_slash.png" }    // 9-frame purple X-swings
}

export function isGokuBlack(fighter) { return (fighter?.rosterKey || "").toLowerCase() === "goku_black" }

// Enter SSJ Rose. Gated: goku_black, not already transformed/transforming, actionable, energy ≥ thresh.
// Runs as a FROZEN CINEMATIC (ssjRoseCinematic.js, mirrors Kurama/Sasuke): combat freezes, the camera
// isolates Goku Black (opponent out of frame), the morph sheet plays, and the actual form-swap (art +
// stats) lands at the RESOLVE beat via the onResolve callback — NOT immediately.
export function enterSSJRose(fighter, context = {}) {
  if (!isGokuBlack(fighter) || fighter._ssjRoseActive) return false
  if (isSSJRoseCinematicActive()) return false   // already mid-transform
  if ((fighter.attackCooldown || 0) > 0 || (fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0) return false
  if ((fighter.energy || 0) < SSJ_ROSE_THRESHOLD) return false   // ONLY at/near max — no up-front spend
  const opp = getTargetResolver(context)(fighter)
  activateSSJRoseCinematic(fighter, opp, () => {
    // FORM-SWAP — applied at the cinematic's RESOLVE beat (Sasuke Lv2 pattern).
    fighter._ssjRoseActive    = true
    fighter._skinAnim         = SSJ_ROSE_ANIM       // FULL art form-swap (Rose sheets)
    fighter.currentForm       = "ssjRose"           // HUD/state (base → ssjRose)
    fighter.damageMultiplier  = SSJ_ROSE_MULT.dmg
    fighter.attackMultiplier  = SSJ_ROSE_MULT.dmg
    fighter.speedMultiplier   = SSJ_ROSE_MULT.spd
    fighter.defenseMultiplier = SSJ_ROSE_MULT.def
    fighter.teleportFlash     = 14
    fighter.attackCooldown    = 12                  // brief settle as gameplay resumes
  })
  return true
}

// Revert to base form: clear the flag + art swap + stat multipliers. Called by the drain
// auto-revert, a manual re-tap, and round/KO resets.
export function revertSSJRose(fighter) {
  if (!fighter || !fighter._ssjRoseActive) return
  fighter._ssjRoseActive    = false
  fighter._skinAnim         = null
  fighter.currentForm       = "base"
  fighter.damageMultiplier  = 1
  fighter.attackMultiplier  = 1
  fighter.speedMultiplier   = 1
  fighter.defenseMultiplier = 1
  fighter.teleportFlash     = Math.max(fighter.teleportFlash || 0, 8)
}

// P-tap toggle: enter if base + at threshold; manual revert if already transformed.
export function toggleSSJRose(fighter, context = {}) {
  if (!isGokuBlack(fighter)) return false
  if (fighter._ssjRoseActive) { revertSSJRose(fighter); return true }
  return enterSSJRose(fighter, context)
}

// Per-frame hook (updateFighterState): continuous drain + instant auto-revert at 0.
export function applyGokuBlackFormSystem(fighter) {
  if (!isGokuBlack(fighter)) return
  tickSustainedFormDrain(fighter, {
    active: f => !!f._ssjRoseActive,
    drainPerFrame: SSJ_ROSE_DRAIN,
    revert: revertSSJRose
  })
}

// ── GOKU BLACK — SPECIALS (Stage 3a: Kamehameha + Spirit Bomb) ──────────────
// Charge-then-release projectile specials on the SPECIAL button, motion-gated.
// FORM-AWARE: the caster CHARGE→RELEASE pose auto-swaps to the Rose sheet via _skinAnim
// (gbKamehameha/gbSpiritBomb exist in BOTH base animationData and SSJ_ROSE_ANIM), the beam is
// form-colored, and Rose applies its +25% damage buff to the beam (projectile damage is NOT
// auto-scaled by damageMultiplier — combat.js:945 — so we bake it in here).
// Explosion (neutral) + Sword Slash (ultimate) = Stage 3b.
// Stage 3c adds three SSJ-ROSE-EXCLUSIVE slash specials on their own motions (B→F Electric Ki Push,
// F→D Electric Slash, B→D Super Ki Slash) — gated on _ssjRoseActive; see GB_ELEC_* constants below.
const GB_KAME_CAST = 40, GB_KAME_FIRE = 24   // full cast-pose play length / frame the beam releases
const GB_BOMB_CAST = 30, GB_BOMB_FIRE = 20
// EXPLOSION (neutral special, both forms) — Rick Self-Destruct mirror. cost 120 = 60% of his 200 pool
// (his most expensive move; the ONLY balance lever for an instant no-startup proximity nuke).
const GB_EXPLOSION = { cost: 120, radius: 200, dmg: 150 }
// SSJ-ROSE-EXCLUSIVE SLASH SPECIALS (Stage 3c). Three NEW moves on the SPECIAL button, each on its
// own motion, ALL gated on _ssjRoseActive (the art only exists transformed). Motion choice rules:
//   • avoid the D→F / D→B subsequences already claimed by Kamehameha/Spirit Bomb (endsWithPattern is
//     forgiving, so a claimed pattern buried in a longer motion would shadow it);
//   • avoid UP — up is the jump key, so any motion with U launches the caster and the grounded slash
//     whiffs over the opponent (these are grounded specials);
//   • mutually distinct. Down (crouch) is safe. Damage is the final Rose value (these never fire in
//     base, so — unlike Kamehameha/Spirit Bomb — there's no base variant to branch on).
//   B→F  ELECTRIC KI PUSH  — spacing/repel: lowest damage in the kit, HIGHEST knockback, cheap.
//   F→D  ELECTRIC SLASH    — mid-tier: fast startup, cheap, a single ranged crescent (the poke).
//   B→D  SUPER KI SLASH    — strongest slash: big X hitbox, slow startup, costed the highest.
const GB_ELEC_PUSH  = { cost: 15, cast: 18, fire: 8,  dmg: 35,  knockbackX: 26, knockbackY: -3, hitstun: 16 }
const GB_ELEC_SLASH = { cost: 20, cast: 22, fire: 10, dmg: 80,  knockbackX: 8,  knockbackY: -3, hitstun: 20 }
const GB_SUPER_SLASH= { cost: 48, cast: 30, fire: 18, dmg: 135, knockbackX: 12, knockbackY: -5, hitstun: 26 }
function executeGokuBlackSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const target = getTargetResolver(context)(fighter)
  const rose = !!fighter._ssjRoseActive

  // QCF (D→F) = KAMEHAMEHA — fast charge→release beam
  if (endsWithPattern(dirs, ["D", "F"])) {
    if (!spendEnergy(fighter, 30)) return false
    fighter._spriteCastMove  = "gbKamehameha"
    fighter._spriteCastTimer = GB_KAME_CAST
    fighter.attackCooldown   = getAttackDuration(GB_KAME_CAST + 4, fighter)
    schedulePendingSpawn(GB_KAME_FIRE, () => {
      spawnProjectile(fighter, "gbKamehameha", {
        damage: rose ? Math.round(120 * SSJ_ROSE_MULT.dmg) : 120, speed: 14, lifetime: 130,
        hitstun: 22, knockbackX: 9, knockbackY: -2,
        color: rose ? "#ff5db1" : "#b06bff", w: 26, h: 22
      }, context)
      shakeCamera(context, 9, 8)
    })
    focusCameraOnAction(context, fighter, target, 0.97, 12)
    return true
  }

  // QCB (D→B) = SPIRIT BOMB — slower, bigger charge→release orb
  if (endsWithPattern(dirs, ["D", "B"])) {
    if (!spendEnergy(fighter, 40)) return false
    fighter._spriteCastMove  = "gbSpiritBomb"
    fighter._spriteCastTimer = GB_BOMB_CAST
    fighter.attackCooldown   = getAttackDuration(GB_BOMB_CAST + 4, fighter)
    schedulePendingSpawn(GB_BOMB_FIRE, () => {
      spawnProjectile(fighter, "gbSpiritBomb", {
        damage: rose ? Math.round(150 * SSJ_ROSE_MULT.dmg) : 150, speed: 9, lifetime: 150,
        hitstun: 28, knockbackX: 7, knockbackY: -6,
        color: rose ? "#ff9ed6" : "#9d7bff", w: 42, h: 42
      }, context)
      shakeCamera(context, 12, 10)
    })
    focusCameraOnAction(context, fighter, target, 0.95, 14)
    return true
  }

  // ── SSJ-ROSE-EXCLUSIVE SLASH SPECIALS (Stage 3c) ──────────────────────────
  // Only resolve while transformed. In BASE form this block is skipped entirely, so these motions
  // fall through to the neutral gate below and — because they carry a directional motion — produce
  // NOTHING (no base-form art, no accidental Explosion).
  if (rose) {
    // B→F = ELECTRIC KI PUSH — low-damage, high-knockback repel (spacing utility)
    if (endsWithPattern(dirs, ["B", "F"])) {
      if (!spendEnergy(fighter, GB_ELEC_PUSH.cost)) return false
      fighter._spriteCastMove  = "gbElectricKiPush"
      fighter._spriteCastTimer = GB_ELEC_PUSH.cast
      fighter.attackCooldown   = getAttackDuration(GB_ELEC_PUSH.cast + 4, fighter)
      schedulePendingSpawn(GB_ELEC_PUSH.fire, () => {
        spawnProjectile(fighter, "gbElectricPush", {
          damage: GB_ELEC_PUSH.dmg, speed: 12, lifetime: 20,
          hitstun: GB_ELEC_PUSH.hitstun, knockbackX: GB_ELEC_PUSH.knockbackX, knockbackY: GB_ELEC_PUSH.knockbackY,
          color: "#ffe14d", w: 44, h: 40,
          // crackling energy-wave FX plays across the short-range shove
          sheet: "./goku_black_ssj_rose_electric_ki_push_effect.png",
          spriteFrames: 6, spriteW: 98, spriteH: 45, spriteSpeed: 3, spriteScale: 1.15
        }, context)
        shakeCamera(context, 6, 6)
      })
      focusCameraOnAction(context, fighter, target, 0.98, 10)
      return true
    }

    // F→D = ELECTRIC SLASH — fast, cheap, mid-tier ranged crescent (the poke)
    if (endsWithPattern(dirs, ["F", "D"])) {
      if (!spendEnergy(fighter, GB_ELEC_SLASH.cost)) return false
      fighter._spriteCastMove  = "gbElectricSlash"
      fighter._spriteCastTimer = GB_ELEC_SLASH.cast
      fighter.attackCooldown   = getAttackDuration(GB_ELEC_SLASH.cast + 4, fighter)
      schedulePendingSpawn(GB_ELEC_SLASH.fire, () => {
        spawnProjectile(fighter, "gbElectricSlash", {
          damage: GB_ELEC_SLASH.dmg, speed: 16, lifetime: 48,
          hitstun: GB_ELEC_SLASH.hitstun, knockbackX: GB_ELEC_SLASH.knockbackX, knockbackY: GB_ELEC_SLASH.knockbackY,
          color: "#ffe14d", w: 30, h: 46
        }, context)
        shakeCamera(context, 7, 7)
      })
      focusCameraOnAction(context, fighter, target, 0.97, 10)
      return true
    }

    // B→D = SUPER KI SLASH — strongest slash: big X hitbox, slow startup, high cost
    if (endsWithPattern(dirs, ["B", "D"])) {
      if (!spendEnergy(fighter, GB_SUPER_SLASH.cost)) return false
      fighter._spriteCastMove  = "gbSuperKiSlash"
      fighter._spriteCastTimer = GB_SUPER_SLASH.cast
      fighter.attackCooldown   = getAttackDuration(GB_SUPER_SLASH.cast + 4, fighter)
      schedulePendingSpawn(GB_SUPER_SLASH.fire, () => {
        spawnProjectile(fighter, "gbSuperKiSlash", {
          damage: GB_SUPER_SLASH.dmg, speed: 13, lifetime: 70,
          hitstun: GB_SUPER_SLASH.hitstun, knockbackX: GB_SUPER_SLASH.knockbackX, knockbackY: GB_SUPER_SLASH.knockbackY,
          color: "#c77dff", w: 64, h: 58
        }, context)
        shakeCamera(context, 13, 11)
      })
      focusCameraOnAction(context, fighter, target, 0.95, 14)
      return true
    }
  }

  // A motioned SPECIAL press that matched nothing above WHIFFS (no move, no energy spent). This keeps
  // Explosion a true NEUTRAL special and means a base-form player performing the Rose slash motions
  // gets nothing (rather than an accidental 120-EN Explosion). Beta returns [] for goku_black's
  // unmapped held dirs, so beta's neutral Explosion is unaffected.
  if (dirs.length > 0) return false

  // NEUTRAL SPECIAL = EXPLOSION (both forms). Mirrors Rick's Self-Destruct EXACTLY: manual press,
  // proximity-gated AOE via Math.hypot, damage to the TARGET only (no self-harm), energy cost as the
  // only balance lever, NO startup-vulnerability window (instant). ART PENDING → procedural pink blast
  // ring (visualOnly projectile), NOT a substituted sprite.
  if (!spendEnergy(fighter, GB_EXPLOSION.cost)) return false
  {
    const R = GB_EXPLOSION.radius
    const rcx = fighter.x + (fighter.w || 60) / 2
    const rcy = fighter.y + (fighter.h || 100) / 2
    spawnProjectile(fighter, "gbExplosion", {
      visualOnly: true, damage: 0, lifetime: 22, vx: 0, vy: 0,
      spawnX: rcx, spawnY: rcy, w: R * 2, h: R * 2, radius: R,
      color: rose ? "#ff5db1" : "#b06bff"
    }, context)
    fighter.colorFlash = 10
    fighter.attackCooldown = getAttackDuration(12, fighter)   // brief lockout, NOT a vulnerability window
    if (target && !target.eliminated && (target.invulnTimer || 0) <= 0) {
      const tcx = target.x + (target.w || 60) / 2
      const tcy = target.y + (target.h || 100) / 2
      if (Math.hypot(tcx - rcx, tcy - rcy) <= R) {          // proximity gate — whiffs if too far
        let dmg = rose ? Math.round(GB_EXPLOSION.dmg * SSJ_ROSE_MULT.dmg) : GB_EXPLOSION.dmg
        if (target.isBlocking) { dmg = Math.floor(dmg * 0.20); target.blockstun = 18 }
        else { target.hitstun = 42; target.vx = (tcx >= rcx ? 1 : -1) * 16; target.vy = -9; target.colorFlash = 8 }
        target.health = Math.max(0, (target.health || 0) - dmg)   // TARGET only — no self-harm
      }
    }
    shakeCamera(context, 15, 14)
    return true
  }
}

// ── GOKU BLACK — SWORD SLASH (Stage 3b: Rose-only ULTIMATE) ─────────────────
// Kurama-style SURE-HIT (damage lands regardless of range) with an opponent REACTION WINDOW
// (block/dodge to mitigate), BUT — unlike Kurama's frozen invulnerable cinematic — Goku Black has a
// REAL vulnerable windup: the caster is rooted and can be HIT to interrupt/cancel it (Sasuke-lightning
// pattern). Rose-form ONLY (the art exists only for the transformed state). Energy-gated on the ult button.
const SWORD = { cost: 40, windup: 24, react: 18, dmg: 110, blockRatio: 0.20, paralysis: 30 }

function executeGokuBlackUltimate(fighter, context) {
  if (!isGokuBlack(fighter)) return false
  if (!fighter._ssjRoseActive) return false        // ROSE-ONLY — disabled in base form
  if (fighter._swordPhase) return false            // already casting
  if (!spendEnergy(fighter, SWORD.cost)) return false
  fighter._swordPhase      = "windup"
  fighter._swordTimer      = SWORD.windup
  fighter._rooted          = true                  // vulnerable + planted through the windup
  fighter._spriteCastMove  = "gbSwordSlash"        // Rose sword-slash pose (windup→slash)
  fighter._spriteCastTimer = SWORD.windup + SWORD.react + 16
  fighter.attackCooldown   = getAttackDuration(SWORD.windup + SWORD.react + 18, fighter)
  fighter.vx = 0
  sound.playSfxFile("goku-black-taste-my-blade.mp3", null)   // voice line on cast (filename kept as-is)
  focusCameraOnAction(context, fighter, getTargetResolver(context)(fighter), 0.98, SWORD.windup)
  return true
}

// Per-frame state machine (called from updateTransformationState). Mirrors updateSasukeLightning.
export function updateGokuBlackSwordSlash(fighter, context = {}) {
  if (!fighter || !fighter._swordPhase) return
  // VULNERABLE WINDUP: a hit during the windup CANCELS the whole move (real interrupt risk).
  if (fighter._swordPhase === "windup" &&
      ((fighter.hitstun || 0) > 0 || (fighter.stun || 0) > 0 || fighter.knockdownState)) {
    fighter._swordPhase = null; fighter._rooted = false
    fighter._spriteCastMove = null; fighter._spriteCastTimer = 0
    return
  }
  if (fighter._rooted) fighter.vx = 0
  if ((fighter._swordTimer || 0) > 0) { fighter._swordTimer--; if (fighter._swordTimer > 0) return }
  if (fighter._swordPhase === "windup") {
    // windup done → OPPONENT REACTION WINDOW (they can block or dodge now)
    fighter._swordPhase = "react"; fighter._swordTimer = SWORD.react
    return
  }
  // react window ended → the GUARANTEED slash lands (sure-hit), unless the opponent blocked/dodged.
  const opp = getTargetResolver(context)(fighter)
  if (opp && !opp.eliminated && (opp.invulnTimer || 0) <= 0) {   // dodged (i-frames) → whiffs
    const blocked = !!opp.isBlocking
    let dmg = SWORD.dmg
    if (blocked) { dmg = Math.round(dmg * SWORD.blockRatio); opp.blockstun = Math.max(opp.blockstun || 0, 16) }
    else {
      opp.hitstun = Math.max(opp.hitstun || 0, SWORD.paralysis)   // brief PARALYSIS beat
      opp.stun    = Math.max(opp.stun || 0, SWORD.paralysis)
      opp.vx = 0; opp.colorFlash = 10; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    }
    opp.health = Math.max(0, (opp.health || 0) - dmg)   // GUARANTEED, range-independent (Kurama sure-hit)
    shakeCamera(context, 12, 14)
  }
  fighter._swordPhase = null; fighter._rooted = false
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
