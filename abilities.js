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
import { activateGokuBlackSwordCinematic, isGokuBlackSwordCinematicActive } from "./gokuBlackSwordCinematic.js"   // Goku Black Sword Slash freeze cinematic (no cycle)
import { activateVegetaFinalFlashCinematic, isVegetaFinalFlashCinematicActive } from "./vegetaFinalFlashCinematic.js"   // Vegeta Overcharged Final Flash ultimate cinematic (no cycle)
import { activateBeerusKiBallCinematic, isBeerusKiBallCinematicActive } from "./beerusKiBallCinematic.js"   // Beerus Ki Ball ultimate cinematic (no cycle)
import { resolveGrab, GLOBAL_DAMAGE_SCALE } from "./combat.js"   // shared grab pipeline + the one damage-scale lever (combat.js doesn't import abilities.js → no cycle)
import { isBetaUnlocked } from "./progression.js"   // beta-only single-direction input simplification (progression.js imports only account.js → no cycle)
import { pickRickVoice } from "./rickVoice.js"   // Rick special-cast voice pools (audio-only; no cycle)
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

// STRICT motion match: the last N recent inputs must EXACTLY equal `pattern`. Unlike the forgiving
// endsWithPattern (which tolerates one stray → a suffix like B→F would shadow D→F/D→B when a stray
// direction precedes), this never collides with the base D→F/D→B specials, so it's used for the SSJ
// bonus specials whose relative endings (F/B) would otherwise overlap them.
function endsWithExact(list, pattern) {
  if (!Array.isArray(list) || !Array.isArray(pattern) || list.length < pattern.length) return false
  const tail = list.slice(-pattern.length)
  return tail.every((t, i) => t === pattern[i])
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
  itachi: { F: ["D", "F"], B: ["D", "B"] },                                                       // (Mangekyou only) F=Amaterasu (QCF) · B=Genjutsu (QCB, hit-confirm) · neutral=Great Fireball
  rick:   { F: ["D", "F"], B: ["D", "B"], U: ["U"], D: ["D"] },                                  // F=Portal-Pull · B=Portal-Push · U=Rocket · D=Laser · neutral=Meeseeks
  goku_black: { F: ["D", "F"], B: ["D", "B"] },                                                  // F=Kamehameha (QCF) · B=Spirit Bomb (QCB) · neutral=Explosion (Stage 3b)
  vegeta: { F: ["D", "F"], B: ["D", "B"], U: ["U"], D: ["D"] },                                  // F=Galick Gun · B=Final Flash · neutral=Big Bang · U=Launch Ki Blast (free) · D=Ki Blast (free)
  beerus: { F: ["D", "F"], B: ["D", "B"], U: ["U"], D: ["D"] }                                   // F=Forward Push · B=Outward Ki Blast · U=Hakai · D=Downward Ki Blast · neutral=Ki Blast
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
    // OPTIONAL impact-on-connect FX: a sprite {sheet,frames,w,h,speed,scale,lifetime} spawned as a
    // visualOnly projectile at the hit point ONLY when this projectile connects (resolveProjectileHitsMulti).
    impact:     moveData.impact     || null,
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

// ─────────────────────────────────────────────────────────────────
// VEGETA — 3 charge/release energy specials (his OWN kit, NOT shared with Goku):
//   QCF (D→F)  = GALICK GUN   — fast, cheapest; quick purple beam
//   QCB (D→B)  = FINAL FLASH  — most committed/heaviest; long windup + big recovery
//   neutral    = BIG BANG     — mid-cost spherical ki blast that stretches into a beam
// Each: spendEnergy → charge cast pose (_spriteCastMove) → schedulePendingSpawn fires the
// projectile mid-cast (mirrors Goku Black's Kamehameha/Spirit Bomb). Projectiles render the
// re-sliced FX strips (drawProjectiles sprite hook, flipped to travel direction).
const VG_GALICK_CAST = 14, VG_GALICK_FIRE = 9
const VG_BIGBANG_CAST = 18, VG_BIGBANG_FIRE = 13
const VG_FINALFLASH_CAST = 30, VG_FINALFLASH_FIRE = 24
// STAGE 6 free-poke timing (all no-energy, cooldown-gated).
const VG_KIBLAST_CAST = 10, VG_KIBLAST_FIRE = 6, VG_KIBLAST_CD = 22, VG_KIBLAST_HOLD_MS = 300
const VG_LAUNCH_CAST = 16, VG_LAUNCH_FIRE = 8, VG_LAUNCH_CD = 40
// FREE melee pokes (EX cancel + the two Koma strings). komaRush1 auto-chains into komaFinish on a
// CLEAN hit; komaFinish LAUNCHES (combo ends → the launch-cancel is fine, like vgUpFinish).
const VEGETA_FREE_MELEE = {
  exKi:       { damage: 35, startup: 4, active: 3, recovery: 12, hitstun: 16, knockbackX: 6, knockbackY: -2, rangeX: 74, rangeY: 52, cd: 20 },
  komaRush1:  { damage: 30, startup: 5, active: 4, recovery: 12, hitstun: 14, knockbackX: 3, knockbackY: 0,  rangeX: 78, rangeY: 52, cd: 30, komaNext: "komaFinish" },
  komaFinish: { damage: 70, startup: 6, active: 6, recovery: 22, hitstun: 24, knockbackX: 11, knockbackY: -5, rangeX: 94, rangeY: 56, cd: 30, launcher: true },
  komaRep:    { damage: 38, startup: 5, active: 3, recovery: 14, hitstun: 14, knockbackX: 5, knockbackY: 0,  rangeX: 80, rangeY: 52, cd: 22 },
  // BLUE-ONLY 4-STAGE Koma Rush (front_attack → front_kick → up_attack → ki_bomb_throw). Same auto-chain-
  // on-clean-hit + interrupt-on-whiff/block as the 2-stage version — just more links. koma3 POPS (not a true
  // launcher, so the chain survives to koma4); koma4 is the launcher finisher and spawns the ki-bomb detonation.
  vgBlueKoma1: { damage: 30, startup: 5, active: 4, recovery: 11, hitstun: 14, knockbackX: 3, knockbackY: 0,  rangeX: 76, rangeY: 52, cd: 30, komaNext: "vgBlueKoma2" },
  vgBlueKoma2: { damage: 36, startup: 5, active: 4, recovery: 11, hitstun: 15, knockbackX: 3, knockbackY: 0,  rangeX: 80, rangeY: 52, cd: 30, komaNext: "vgBlueKoma3" },
  vgBlueKoma3: { damage: 44, startup: 6, active: 4, recovery: 12, hitstun: 18, knockbackX: 2, knockbackY: -9, rangeX: 82, rangeY: 56, cd: 30, komaNext: "vgBlueKoma4" },
  vgBlueKoma4: { damage: 90, startup: 6, active: 5, recovery: 22, hitstun: 26, knockbackX: 13, knockbackY: -6, rangeX: 98, rangeY: 60, cd: 30, launcher: true,
                 komaFx: { sheet: "./vegeta_blue_kibomb_fx_uniform.png", frames: 19, w: 112, h: 87, speed: 2, scale: 1.0 } },
}
function fireVegetaMelee(fighter, key) {
  const md = VEGETA_FREE_MELEE[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.cd)   // FREE — cooldown only, no spendEnergy
  fighter._komaNext     = md.komaNext || null
  fighter._rekkaNext    = null             // free pokes are not part of the Fwd+Heavy target combo
  fighter._cmdHitLanded = false
  // Blue Koma finisher: throw the ki bomb — an orange detonation FX in front of Vegeta (visualOnly, decays).
  if (md.komaFx) {
    spawnProjectile(fighter, "vgKiBombFx", {
      visualOnly: true, damage: 0, lifetime: md.komaFx.lifetime || 28, vx: 0, vy: 0,
      spawnX: fighter.x + (fighter.w || 60) / 2 + fighter.facing * ((fighter.w || 60) * 0.7 + 24),
      spawnY: fighter.y + (fighter.h || 100) * 0.4,
      sheet: md.komaFx.sheet, spriteFrames: md.komaFx.frames, spriteW: md.komaFx.w, spriteH: md.komaFx.h,
      spriteSpeed: md.komaFx.speed || 2, spriteScale: md.komaFx.scale || 1
    })
  }
  return true
}
// SSJ SELF-DESTRUCT (Stage 5) — mirrors Rick's Self-Destruct: the caster "pose" IS the detonation
// (self_explosion via _spriteCastMove), damage is a manual proximity gate (no self-harm, no projectile
// collision needed). SSJ-only signature; separate from the Overcharged Final Flash ultimate.
// Self-Destruct is manual-subtract (bypasses GLOBAL_DAMAGE_SCALE), like Rick's Self-Destruct / GB Explosion —
// the established convention for instant proximity-AOE nukes. Kept a FLAT value across SSJ + Blue (it is NOT
// multiplied by the form buff), so it does NOT compound across forms; matched to Rick's 180 so it isn't a
// new worst-case in that already-flagged class.
const VG_SELFDESTRUCT = { radius: 210, dmg: 180 }
function fireVegetaSelfDestruct(fighter, context) {
  const target = getTargetResolver(context)(fighter)
  const rcx = fighter.x + (fighter.w || 60) / 2
  const rcy = fighter.y + (fighter.h || 100) / 2
  fighter._spriteCastMove  = "selfDestruct"   // self_explosion engulfs Vegeta (VEGETA_SSJ_ANIM.selfDestruct)
  fighter._spriteCastTimer = 34
  fighter.attackCooldown   = getAttackDuration(12, fighter)   // just blocks an accidental instant re-press
  fighter.vx = 0
  shakeCamera(context, 18, 20)
  focusCameraOnAction(context, fighter, target, 0.93, 16)
  if (target && !target.eliminated && (target.invulnTimer || 0) <= 0) {
    const tcx = target.x + (target.w || 60) / 2
    const tcy = target.y + (target.h || 100) / 2
    if (Math.hypot(tcx - rcx, tcy - rcy) <= VG_SELFDESTRUCT.radius) {   // proximity gate — whiffs if far
      let dmg = VG_SELFDESTRUCT.dmg
      if (target.isBlocking) { dmg = Math.floor(dmg * 0.20); target.blockstun = 20 }
      else { target.hitstun = 44; target.vx = (tcx >= rcx ? 1 : -1) * 18; target.vy = -10; target.colorFlash = 10 }
      target.health = Math.max(0, (target.health || 0) - dmg)   // direct (no GLOBAL_DAMAGE_SCALE), like Rick/GB Explosion
    }
  }
  return true
}

function executeVegetaSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)
  const ssj         = vegetaIsSuper(fighter)   // SSJ OR Blue → super-tier specials (base = purple)
  const blue        = !!fighter._ssjBlueActive
  // 3-tier picker: Blue art/values → SSJ → base. Blue sits above SSJ (top of the ladder).
  const pick = (b, s, ba) => (blue ? b : ssj ? s : ba)

  // ── SSJ-EXCLUSIVE bonus specials (Stage 5) — no base-form equivalent, so gated on `ssj`. Own
  // motions chosen to avoid every base motion: NOT D→F/D→B (Galick/Final Flash), NOT ending in U/D
  // (those match the free Launch-Ki/Ki-Blast pokes). B→F and F→B are clean and mutually distinct.
  if (ssj) {
    // BLUE-EXCLUSIVE (top-tier) specials — the other two exact 2-motions (F→F, B→B). All 4 of {F,B}²
    // are now claimed by exact motions (FF super-galick, BB teleport, BF self-destruct, FB diag-galick),
    // none colliding with the base forgiving D→F / D→B.
    if (blue) {
      // F→F — SUPER GALICK GUN: a bigger, costlier Galick (own input, distinct from the D→F Galick).
      if (endsWithExact(dirs, ["F", "F"])) {
        if (!spendEnergy(fighter, 50)) return false
        fighter._spriteCastMove  = "vgSuperGalickCast"
        fighter._spriteCastTimer = 22
        fighter.attackCooldown   = getAttackDuration(26, fighter)
        schedulePendingSpawn(14, () => {
          spawnProjectile(fighter, "superGalick", {
            damage: 260, speed: 16, lifetime: 130, hitstun: 28, knockbackX: 15, knockbackY: -3,
            color: "#22d3ee", w: 62, h: 56,
            sheet: "./vegeta_blue_galick_fx_uniform.png", spriteFrames: 10, spriteW: 195, spriteH: 95, spriteSpeed: 3, spriteScale: 1.25   // bigger than the regular beam
          }, context)
          shakeCamera(context, 12, 12)
        })
        focusCameraOnAction(context, fighter, target, 0.96, 12)
        return true
      }
      // B→B — TELEPORT: blink BEHIND the opponent. NB: the shared game.js teleportBehindTarget actually
      // repositions SAME-side-adjacent ("ready to attack"); for a true behind-blink we cross to the FAR side.
      if (endsWithExact(dirs, ["B", "B"])) {
        if (!spendEnergy(fighter, 20)) return false
        if (target) {
          fighter.x = fighter.x < target.x ? target.x + (target.w || 60) + 8 : target.x - (fighter.w || 60) - 8   // FAR side = behind
          fighter.y = target.y
          fighter.vx = 0; fighter.vy = 0
          fighter.facing = (target.x >= fighter.x) ? 1 : -1    // turn to face the opponent after re-appearing
        }
        fighter._spriteCastMove  = "vgTeleport"
        fighter._spriteCastTimer = 16
        fighter.attackCooldown   = getAttackDuration(14, fighter)
        fighter.teleportFlash    = 14
        focusCameraOnAction(context, fighter, target, 1.0, 8)
        return true
      }
    }
    // EXACT-match (not forgiving) so these never shadow / aren't shadowed by the base D→F / D→B specials.
    // B→F — SELF-DESTRUCT: a standalone signature nuke (NOT the ultimate). Huge cost, big proximity AOE.
    if (endsWithExact(dirs, ["B", "F"])) {
      if (!spendEnergy(fighter, 90)) return false
      return fireVegetaSelfDestruct(fighter, context)
    }
    // F→B — DIAGONAL GALICK GUN: a downward-angled beam variant, its OWN input (distinct from D→F Galick).
    if (endsWithExact(dirs, ["F", "B"])) {
      if (!spendEnergy(fighter, 32)) return false
      fighter._spriteCastMove  = "diagGalickCast"
      fighter._spriteCastTimer = VG_GALICK_CAST
      fighter.attackCooldown   = getAttackDuration(VG_GALICK_CAST + 6, fighter)
      schedulePendingSpawn(VG_GALICK_FIRE, () => {
        spawnProjectile(fighter, "diagGalick", {
          damage: 130, speed: 15, lifetime: 100, hitstun: 22, knockbackX: 9, knockbackY: 4,
          vy: 4,   // ANGLED DOWN — the diagonal beam
          color: "#ffe066", w: 44, h: 40,
          spawnY: fighter.y + (fighter.h || 100) * 0.2,   // from higher up so the down-angle sweeps into a grounded foe
          sheet: "./vegeta_ssj_diag_galick_fx_uniform.png", spriteFrames: 7, spriteW: 144, spriteH: 256, spriteSpeed: 3, spriteScale: 0.5
        }, context)
        shakeCamera(context, 8, 8)
      })
      focusCameraOnAction(context, fighter, target, 0.98, 10)
      return true
    }
  }

  // QCF (D→F) — GALICK GUN: fast + cheapest. SSJ = own gold FX sheet, higher cost/damage.
  if (endsWithPattern(dirs, ["D", "F"])) {
    if (!spendEnergy(fighter, pick(34, 30, 25))) return false
    fighter._spriteCastMove  = "galickCast"
    fighter._spriteCastTimer = VG_GALICK_CAST
    fighter.attackCooldown   = getAttackDuration(VG_GALICK_CAST + 6, fighter)
    schedulePendingSpawn(VG_GALICK_FIRE, () => {
      spawnProjectile(fighter, "galickGun", {
        damage: pick(180, 150, 120), speed: 15, lifetime: 130, hitstun: 24, knockbackX: 10, knockbackY: -2,
        color: pick("#22d3ee", "#ffe066", "#b06bff"), w: 46, h: 42,
        sheet: pick("./vegeta_blue_galick_fx_uniform.png", "./vegeta_ssj_galick_fx_uniform.png", "./vegeta_base_galick_fx_uniform.png"),
        spriteFrames: pick(10, 10, 7), spriteW: pick(195, 195, 144), spriteH: pick(95, 84, 262), spriteSpeed: 3, spriteScale: ssj ? 0.85 : 0.6
      }, context)
      shakeCamera(context, 8, 8)
    })
    focusCameraOnAction(context, fighter, target, 0.98, 10)
    return true
  }

  // QCB (D→B) — FINAL FLASH: his hardest-hitting, most committed beam. SSJ = animated gold beam sheet
  // + a dedicated explosion sheet that fires ONLY on connect (proj.impact → resolveProjectileHitsMulti).
  if (endsWithPattern(dirs, ["D", "B"])) {
    if (!spendEnergy(fighter, pick(64, 58, 50))) return false
    fighter._spriteCastMove  = "charge"          // reuse the power-up pose (SSJ gold / Blue = gold fallback → FLAGGED gap)
    fighter._spriteCastTimer = VG_FINALFLASH_CAST
    fighter.attackCooldown   = getAttackDuration(VG_FINALFLASH_CAST + 12, fighter)
    schedulePendingSpawn(VG_FINALFLASH_FIRE, () => {
      spawnProjectile(fighter, "finalFlash", {
        damage: pick(300, 250, 200), speed: 11, lifetime: 150, hitstun: 30, knockbackX: 14, knockbackY: -3,
        color: pick("#7fd4ff", "#ffe066", "#ffe066"), w: 74, h: 46,
        sheet: pick("./vegeta_blue_finalflash_beam_uniform.png", "./vegeta_ssj_finalflash_beam_uniform.png", "./vegeta_base_finalflash_beam1_uniform.png"),
        spriteFrames: pick(12, 17, 1), spriteW: pick(258, 258, 193), spriteH: pick(156, 144, 130), spriteSpeed: ssj ? 2 : 4, spriteScale: 0.85,
        // Explosion sheet plays at the point of contact ONLY (never at cast). Blue reuses SSJ's impact sheet.
        ...(ssj ? { impact: { sheet: "./vegeta_ssj_finalflash_impact_uniform.png", frames: 17, w: 71, h: 83, speed: 2, scale: 2.2, lifetime: 40 } } : {})
      }, context)
      shakeCamera(context, 12, 12)
    })
    focusCameraOnAction(context, fighter, target, 0.95, 14)
    return true
  }

  // ── FREE (no-energy) SPECIAL-button pokes (Stage 6). Gated ONLY by attackCooldown. Placed
  // after the QCF/QCB energy specials so those keep priority; before the neutral Big Bang.
  // U+Special — LAUNCH KI BLAST: an anti-air cyan barrage (3 staggered rising orbs).
  if (endsWithPattern(dirs, ["U"])) {
    if ((fighter.attackCooldown || 0) > 0) return false
    fighter._spriteCastMove  = "launchKi"
    fighter._spriteCastTimer = VG_LAUNCH_CAST
    fighter.attackCooldown   = getAttackDuration(VG_LAUNCH_CD, fighter)
    for (let i = 0; i < 3; i++) {
      schedulePendingSpawn(VG_LAUNCH_FIRE + i * 6, () => {
        spawnProjectile(fighter, "launchKi", {
          damage: 30, speed: 13, lifetime: 90, hitstun: 16, knockbackX: 4, knockbackY: -9, vy: -3.5 + i * 1.5,
          color: "#22d3ee", w: 26, h: 26,
          sheet: "./vegeta_base_kiblast_orb_uniform.png", spriteFrames: 5, spriteW: 118, spriteH: 141, spriteSpeed: 3, spriteScale: 0.34
        }, context)
      })
    }
    focusCameraOnAction(context, fighter, target, 1.0, 8)
    return true
  }

  // D+Special — KI BLAST: quick cyan shot. TAP vs HOLD = how long Down was held (charge-down-then-fire).
  if (endsWithPattern(dirs, ["D"])) {
    if ((fighter.attackCooldown || 0) > 0) return false
    const held = performance.now() - (fighter._vgDownSince || performance.now())
    const charged = held >= VG_KIBLAST_HOLD_MS
    fighter._spriteCastMove  = "kiBlast"
    fighter._spriteCastTimer = VG_KIBLAST_CAST
    fighter.attackCooldown   = getAttackDuration(charged ? VG_KIBLAST_CD + 6 : VG_KIBLAST_CD, fighter)
    schedulePendingSpawn(VG_KIBLAST_FIRE, () => {
      spawnProjectile(fighter, "kiBlast", {
        damage: charged ? 55 : 30, speed: charged ? 12 : 15, lifetime: 120,
        hitstun: charged ? 18 : 12, knockbackX: charged ? 8 : 4, knockbackY: -1,
        color: "#22d3ee", w: charged ? 42 : 26, h: charged ? 42 : 26,
        sheet: "./vegeta_base_kiblast_orb_uniform.png", spriteFrames: 5, spriteW: 118, spriteH: 141, spriteSpeed: 3, spriteScale: charged ? 0.5 : 0.32
      }, context)
    })
    return true
  }

  // NEUTRAL — BIG BANG ATTACK: mid-cost spherical ki blast. SSJ = the base blast RECOLORED GOLD
  // (vegeta_ssj_bigbang_fx, baked hue-shift of the purple base FX), higher cost/damage.
  if (!spendEnergy(fighter, pick(46, 42, 35))) return false
  fighter._spriteCastMove  = "bigBangCast"     // base cast pose in ALL forms (no SSJ/Blue cast crop → FLAGGED gap)
  fighter._spriteCastTimer = VG_BIGBANG_CAST
  fighter.attackCooldown   = getAttackDuration(VG_BIGBANG_CAST + 8, fighter)
  schedulePendingSpawn(VG_BIGBANG_FIRE, () => {
    spawnProjectile(fighter, "bigBang", {
      damage: pick(210, 175, 140), speed: 12, lifetime: 140, hitstun: 26, knockbackX: 11, knockbackY: -1,
      color: pick("#22d3ee", "#ffe066", "#b06bff"), w: 50, h: 44,
      sheet: pick("./vegeta_blue_bigbang_fx_uniform.png", "./vegeta_ssj_bigbang_fx_uniform.png", "./vegeta_base_bigbang_fx_uniform.png"),
      spriteFrames: 10, spriteW: 195, spriteH: 82, spriteSpeed: 3, spriteScale: 0.7
    }, context)
    shakeCamera(context, 9, 9)
  })
  focusCameraOnAction(context, fighter, target, 0.97, 12)
  return true
}

// ─────────────────────────────────────────────────────────────────
// BEERUS — God of Destruction specials (Stage 3). Motions mirror Vegeta's DB layout:
//   neutral = Ki Blast · D = Downward Ki Blast · D→F = Forward Push · D→B = Outward Ki Blast · U = Hakai
// (beta single-hold map: F/B/U/D above). Two mixed source sheets were sliced into SEPARATE
// char-cast vs projectile assets, so the traveling rings / self-nova never warp the body.
export function isBeerus(fighter) { return (fighter?.rosterKey || "").toLowerCase() === "beerus" }
const BEERUS_KIBLAST = { cost: 30, dmg: 120 }
const BEERUS_DOWNKI  = { cost: 35, dmg: 140 }
const BEERUS_OUTWARD = { cost: 50, dmg: 130, radius: 165 }   // proximity AOE; dmg RUNS THROUGH GLOBAL_DAMAGE_SCALE (→ ~78 eff) so it matches the scaled-special tier (Ki Blast/Downward), not the bypass tier
const BEERUS_PUSH    = { cost: 45, ring: 95 }
const BEERUS_HAKAI   = { cost: 70, dmg: 190, range: 245, startup: 40 }   // most committed: long telegraph, big direct payoff

// Direct (unscaled) proximity/point damage — mirrors fireVegetaSelfDestruct's application rules
// (invuln skip, block chip, hitstun + knockback on a clean hit). Returns whether it connected.
function beerusApplyDirect(target, cx, cy, dmg, range, kbx = 10) {
  if (!target || target.eliminated || (target.invulnTimer || 0) > 0) return false
  const tcx = target.x + (target.w || 60) / 2, tcy = target.y + (target.h || 100) / 2
  if (Math.hypot(tcx - cx, tcy - cy) > range) return false
  let d = dmg
  if (target.isBlocking) { d = Math.floor(d * 0.20); target.blockstun = 20 }
  else { target.hitstun = 34; target.vx = (tcx >= cx ? 1 : -1) * kbx; target.vy = -8; target.colorFlash = 10 }
  target.health = Math.max(0, (target.health || 0) - d)
  return true
}

function executeBeerusSpecial(fighter, context) {
  const dirs   = getRelativeDirections(fighter)
  const getOpp = getTargetResolver(context)
  const target = getOpp(fighter)

  // U — HAKAI: the most committed special. Held static point pose + long startup (real vulnerability
  // window), then a big DIRECT payoff and the erase-field effect spawned AT THE TARGET (not on Beerus).
  if (endsWithPattern(dirs, ["U"])) {
    if (!spendEnergy(fighter, BEERUS_HAKAI.cost)) return false
    fighter._spriteCastMove  = "hakai"
    sound.playSfxFile?.("beerus_hakai_activate.mp3", null)   // "You won't underestimate a god of destruction now" — on Hakai cast begin
    fighter._spriteCastTimer  = BEERUS_HAKAI.startup + 16
    fighter.attackCooldown    = getAttackDuration(BEERUS_HAKAI.startup + 20, fighter)
    fighter.vx = 0
    focusCameraOnAction(context, fighter, target, 0.95, BEERUS_HAKAI.startup)
    schedulePendingSpawn(BEERUS_HAKAI.startup, () => {
      const t  = getOpp(fighter)
      const ex = t ? t.x + (t.w || 60) / 2 : fighter.x + fighter.facing * 170
      const ey = t ? t.y + (t.h || 100) / 2 : fighter.y + (fighter.h || 100) / 2
      // effect at the TARGET (visualOnly → never stuns/despawns; fades via lifetime)
      spawnProjectile(fighter, "hakaiField", {
        visualOnly: true, damage: 0, lifetime: 34,
        spawnX: ex - 84, spawnY: ey - 70, vx: 0, vy: 0, w: 4, h: 4,
        sheet: "./beerus_hakai_fx_u.png", spriteFrames: 4, spriteW: 168, spriteH: 140, spriteSpeed: 8, spriteScale: 1.05
      }, context)
      shakeCamera(context, 10, 12)
      beerusApplyDirect(t, ex, ey, BEERUS_HAKAI.dmg, BEERUS_HAKAI.range, 8)
    })
    return true
  }

  // D→F (QCF) — FORWARD PUSH: two consecutive shockwave rings spawned in front, traveling outward.
  if (endsWithPattern(dirs, ["D", "F"])) {
    if (!spendEnergy(fighter, BEERUS_PUSH.cost)) return false
    fighter._spriteCastMove  = "pushCast"
    sound.playSfxFile?.("beerus_special_cast_2.mp3", null)   // "How about this" — on Forward Push cast (distinct from Ki Blast's cast_1)
    fighter._spriteCastTimer  = 18
    fighter.attackCooldown    = getAttackDuration(24, fighter)
    const ring = (sheet, frames, sw, sh, extra = {}) => ({
      damage: BEERUS_PUSH.ring, speed: 12, lifetime: 72, hitstun: 20, knockbackX: 12, knockbackY: -2,
      color: "#e0a0ff", w: 46, h: 60, sheet, spriteFrames: frames, spriteW: sw, spriteH: sh, spriteSpeed: 4, spriteScale: 1.4, ...extra
    })
    schedulePendingSpawn(10, () => { spawnProjectile(fighter, "pushRing1", ring("./beerus_push_ring1_u.png", 4, 47, 86), context); shakeCamera(context, 8, 8) })
    schedulePendingSpawn(20, () => { spawnProjectile(fighter, "pushRing2", ring("./beerus_push_ring2_u.png", 6, 40, 102, { speed: 14, spriteScale: 1.6 }), context) })
    focusCameraOnAction(context, fighter, target, 0.99, 10)
    return true
  }

  // D→B (QCB) — OUTWARD KI BLAST: self-centered expanding nova (proximity AOE from a fixed point on Beerus).
  if (endsWithPattern(dirs, ["D", "B"])) {
    if (!spendEnergy(fighter, BEERUS_OUTWARD.cost)) return false
    fighter._spriteCastMove  = "outward"
    fighter._spriteCastTimer  = 30
    fighter.attackCooldown    = getAttackDuration(30, fighter)
    fighter.vx = 0
    shakeCamera(context, 12, 14)
    focusCameraOnAction(context, fighter, target, 0.97, 14)
    const cx = fighter.x + (fighter.w || 60) / 2, cy = fighter.y + (fighter.h || 100) / 2
    const outwardDmg = Math.round(BEERUS_OUTWARD.dmg * GLOBAL_DAMAGE_SCALE)   // scaled to the projectile-special tier
    schedulePendingSpawn(12, () => beerusApplyDirect(getOpp(fighter), cx, cy, outwardDmg, BEERUS_OUTWARD.radius, 14))
    return true
  }

  // D — DOWNWARD KI BLAST: a diving down-forward blast; the ground-impact burst plays on connect.
  if (endsWithPattern(dirs, ["D"])) {
    if (!spendEnergy(fighter, BEERUS_DOWNKI.cost)) return false
    fighter._spriteCastMove  = "downKiBlast"
    fighter._spriteCastTimer  = 26
    fighter.attackCooldown    = getAttackDuration(28, fighter)
    schedulePendingSpawn(12, () => {
      spawnProjectile(fighter, "downwardKi", {
        damage: BEERUS_DOWNKI.dmg, speed: 15, lifetime: 62, hitstun: 22, knockbackX: 8, knockbackY: 6,
        vx: fighter.facing * 12, vy: 7,                       // down-forward dive
        color: "#c060ff", w: 34, h: 34,
        spawnY: fighter.y + (fighter.h || 100) * 0.15,
        sheet: "./beerus_ki_blast_fx_u.png", spriteFrames: 2, spriteW: 47, spriteH: 87, spriteSpeed: 3, spriteScale: 0.7,
        impact: { sheet: "./beerus_downward_fx_u.png", frames: 4, w: 325, h: 221, speed: 4, scale: 0.7, lifetime: 34 }
      }, context)
      shakeCamera(context, 8, 8)
    })
    return true
  }

  // NEUTRAL — KI BLAST: quick forward energy shot (basic poke of the kit).
  if (!spendEnergy(fighter, BEERUS_KIBLAST.cost)) return false
  fighter._spriteCastMove  = "kiBlastCast"
  sound.playSfxFile?.("beerus_special_cast_1.mp3", null)   // "Give me your best shot" — on Ki Blast cast (his most-thrown special)
  fighter._spriteCastTimer  = 20
  fighter.attackCooldown    = getAttackDuration(22, fighter)
  schedulePendingSpawn(12, () => {
    spawnProjectile(fighter, "kiBlast", {
      damage: BEERUS_KIBLAST.dmg, speed: 15, lifetime: 120, hitstun: 16, knockbackX: 7, knockbackY: -1,
      color: "#ffaa33", w: 30, h: 30,
      sheet: "./beerus_ki_blast_fx_u.png", spriteFrames: 2, spriteW: 47, spriteH: 87, spriteSpeed: 4, spriteScale: 0.55
    }, context)
  })
  return true
}

// VEGETA ULTIMATE — "Overcharged Final Flash": the Stage-4 Final Flash special escalated into a
// near-max-meter FROZEN CINEMATIC (biggest hit in his kit). Reuses the shared freeze architecture
// (vegetaFinalFlashCinematic.js, mirroring gokuBlackSwordCinematic). The guaranteed, range-independent
// damage lands at the FIRE connect beat via onImpact — a held block chips it, a clean hit is huge.
const VG_ULT = { cost: 100, dmg: 340, ssjDmg: 420, blueDmg: 480, blockRatio: 0.22 }   // base < SSJ < Blue overcharge
function executeVegetaUltimate(fighter, context) {
  if ((fighter.rosterKey || "").toLowerCase() !== "vegeta") return false
  if (isVegetaFinalFlashCinematicActive()) return false        // already mid-cinematic
  if (!spendEnergy(fighter, VG_ULT.cost)) return false
  const opp = getTargetResolver(context)(fighter)
  fighter.vx = 0
  activateVegetaFinalFlashCinematic(fighter, opp, (cineCtx) => applyVegetaFinalFlashDamage(fighter, opp, cineCtx))
  return true
}

// PAYOFF: a GUARANTEED, range-independent overcharged beam. A held block (frozen at its pre-cinematic
// value, like Kurama's TBB) CHIPS it to 22%; a clean hit deals the full ~340 + a big stagger. Applied
// once at the FIRE connect beat by the cinematic.
function applyVegetaFinalFlashDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = fighter._ssjBlueActive ? VG_ULT.blueDmg : fighter._ssjActive ? VG_ULT.ssjDmg : VG_ULT.dmg   // base 340 < SSJ 420 < Blue 480
  if (blocked) {
    dmg = Math.round(dmg * VG_ULT.blockRatio)
    opp.blockstun = Math.max(opp.blockstun || 0, 18)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 28)
    opp.vx = fighter.facing * 16; opp.vy = -6
    opp.colorFlash = 12; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (Kurama sure-hit)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 20, maxTimer: 20,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#ffe066",
      damage: dmg, lines: blocked ? 6 : 16, radius: blocked ? 14 : 42,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
}

// BEERUS ULTIMATE — "Ki Ball": near-max-meter FROZEN CINEMATIC (biggest hit in his kit). Reuses the
// shared freeze architecture (beerusKiBallCinematic.js, mirroring vegetaFinalFlashCinematic). The
// guaranteed, range-independent damage lands at the IMPACT connect beat via onImpact — a held block
// chips it, a clean hit is huge (cinematic-tier, like Kurama's TBB rather than a punishable special).
const BEERUS_ULT = { cost: 150, dmg: 380, blockRatio: 0.22 }   // near-max meter (maxEnergy 170)
function executeBeerusUltimate(fighter, context) {
  if ((fighter.rosterKey || "").toLowerCase() !== "beerus") return false
  if (isBeerusKiBallCinematicActive()) return false            // already mid-cinematic
  if (!spendEnergy(fighter, BEERUS_ULT.cost)) return false
  const opp = getTargetResolver(context)(fighter)
  fighter.vx = 0
  activateBeerusKiBallCinematic(fighter, opp, (cineCtx) => applyBeerusKiBallDamage(fighter, opp, cineCtx))
  return true
}

// PAYOFF: a GUARANTEED, range-independent Ki Ball. A held block (frozen at its pre-cinematic value,
// like Kurama's TBB) CHIPS it to 22%; a clean hit deals the full ~380 + a big stagger. Applied once
// at the IMPACT connect beat by the cinematic.
function applyBeerusKiBallDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = BEERUS_ULT.dmg
  if (blocked) {
    dmg = Math.round(dmg * BEERUS_ULT.blockRatio)
    opp.blockstun = Math.max(opp.blockstun || 0, 18)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 30)
    opp.vx = fighter.facing * 17; opp.vy = -7
    opp.colorFlash = 12; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (Kurama sure-hit)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 20, maxTimer: 20,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#e0a0ff",
      damage: dmg, lines: blocked ? 6 : 16, radius: blocked ? 14 : 44,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────
// VEGETA — SUPER SAIYAN (regular)  (continuous-drain sustained transform)
// Vegeta's SECOND form on the SAME rosterKey ("vegeta") — a _skinAnim art swap, NOT a
// separate roster entry. Built on the exact SSJ-Rose architecture: threshold-gated
// charge-RELEASE entry (no up-front spend), continuous per-frame drain, instant
// auto-revert at 0, and a FULL art form-swap (gold sheets via _skinAnim). Declarative
// twin lives in characters.vegeta.transformations.ssj (energyDrainPerFrame/revertOnEmpty).
//
// MANDATORY WAYPOINT: SSJ is the first rung of Vegeta's transform ladder and the REQUIRED
// intermediate for the future SSJ Blue. enterVegetaSSJ is callable BOTH as the player-facing
// transform AND — via ensureVegetaSSJWaypoint / opts.fast — as a silent pass-through the Blue
// build calls FIRST, so the SSJ state actually fires before Blue stacks on top (never skipped).
// ─────────────────────────────────────────────────────────────────────────
export function isVegeta(fighter) { return (fighter?.rosterKey || "").toLowerCase() === "vegeta" }

const VEGETA_SSJ_THRESHOLD = 120     // energy ≥ 120 (60% of maxEnergy 200) to enter — hold P to build past it
const VEGETA_SSJ_DRAIN     = 0.18    // energy/frame while transformed (~11/s @60fps) — gentler than Rose's 0.30
const VEGETA_SSJ_MULT      = { dmg: 1.20, spd: 1.12, def: 1.05 }   // below the Rose ceiling (+25/+15/+5) → headroom for Blue
const VEGETA_SSJ_MORPH     = 58      // transform.png play length (27f × speed 2) — full lockout while morphing

// FULL merged art set: base Vegeta's COMPLETE animationData (so EVERY un-overridden action still
// renders real art, never the 128² fallback box — animationProfile resolves skinAnim at the object
// level, not per-key) with the SSJ (gold) sheets overlaid on top. Un-overridden actions (normals,
// specials, casts) still show base-form art until later stages replace them — intentional, not a box.
const VEGETA_SSJ_ANIM = {
  ...characters.vegeta.animationData,
  idle:      { frames: 4, width: 34, height: 77, speed: 6, anchorY: 0, sheet: "./vegeta_ssj_idle_uniform.png" },
  walk:      { frames: 4, width: 58, height: 48, speed: 6, anchorY: 0, sheet: "./vegeta_ssj_run_uniform.png" },   // reuse run, slower
  run:       { frames: 4, width: 58, height: 48, speed: 4, anchorY: 0, sheet: "./vegeta_ssj_run_uniform.png" },
  dash:      { frames: 2, width: 69, height: 44, speed: 5, anchorY: 0, sheet: "./vegeta_ssj_dash_uniform.png" },
  back_dash: { frames: 1, width: 42, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_ssj_back_dash_uniform.png" },
  jump:      { frames: 5, width: 42, height: 77, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_ssj_jump_uniform.png" },                    // RISE poses (uniform frames 0-4)
  fall:      { frames: 4, width: 42, height: 77, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sourceX: 210, sheet: "./vegeta_ssj_jump_uniform.png" },       // DESCENT poses (frames 5-8, sourceX 5×42)
  guard:     { frames: 3, width: 44, height: 62, speed: 6, anchorY: 0, sheet: "./vegeta_ssj_gaurd_uniform.png" },
  hurt:      { frames: 5, width: 45, height: 66, speed: 6, anchorY: 0, sheet: "./vegeta_ssj_hit_uniform.png" },
  knockdown: { frames: 7, width: 71, height: 58, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_ssj_knock_down_uniform.png" }, // sprawl→rise
  getup:     { frames: 7, width: 71, height: 58, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_ssj_knock_down_uniform.png" }, // reuse knockdown; sprite.js splits via knockdownTimer/GETUP_WINDOW
  // Transform morph (base→gold). Plays ONCE on entering the form (VEGETA_SSJ_MORPH lockout) and doubles as the SSJ intro.
  transform: { frames: 27, width: 126, height: 93, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_ssj_transformation_uniform.png" },
  // NORMALS (gold). Overlay the SSJ sheets so attacks render the gold body, not the inherited base art
  // (BUG 1: un-overridden keys silently rendered base Vegeta). Frame counts alpha-gutter-verified.
  light:    { frames: 9,  width: 68, height: 61, speed: 3, anchorY: 0, sheet: "./vegeta_ssj_light_uniform.png" },      // foward_attack_2
  heavy:    { frames: 12, width: 56, height: 65, speed: 3, anchorY: 0, sheet: "./vegeta_ssj_heavy_uniform.png" },      // foward_attack
  up:       { frames: 7,  width: 47, height: 61, speed: 3, anchorY: 0, sheet: "./vegeta_ssj_up_uniform.png" },         // up_attack (tiered mechanic = Stage 2 proper; art wired now)
  air:      { frames: 6,  width: 51, height: 70, speed: 4, anchorY: 0, sheet: "./vegeta_ssj_air_uniform.png" },        // air_to_down_attack
  down_air: { frames: 8,  width: 53, height: 71, speed: 4, anchorY: 0, sheet: "./vegeta_ssj_down_air_uniform.png" },   // diagonal_side_down_attack
  // SPECIAL CAST poses (gold). galickCast → SSJ; Final Flash reuses `charge` (below) → both now render the
  // SSJ body while the beam travels as a SEPARATE projectile layer (BUG 2: character stayed visible, just base-art).
  galickCast: { frames: 13, width: 65, height: 68, speed: 2, anchorY: 0, sheet: "./vegeta_ssj_galick_cast_uniform.png" },
  // CHARGE (hold P) — gold aura, two-part (buildup 0-3 once → tail 4-9 loops). Also the Final Flash cast pose
  // AND the Overcharged Final Flash ULTIMATE hold pose (BUG 3: the live caster now reads as gold SSJ, single instance).
  charge:   { frames: 10, width: 110, height: 91, speed: 6, anchorY: 0, loop: true, loopStart: 4, sheet: "./vegeta_ssj_charge_uniform.png" },
  // COMMAND-NORMAL CHAIN (Stage 3) — the base 4-stage Fwd+Heavy rekka (vgFkick1→vgSidekick→vgUpInto→
  // vgUpFinish) is unchanged mechanically; in SSJ each stage renders a consecutive SEGMENT of ONE
  // continuous 30-frame combo sheet (sourceX offsets), so re-tapping plays combo_attack start→finish as
  // a single flowing gold string. Attacking auto-spreads each segment's frames across its move duration.
  vgFkick1:   { frames: 8, width: 64, height: 82, speed: 3, anchorY: 0, sourceX: 0,    sheet: "./vegeta_ssj_combo_attack_uniform.png" },  // frames 0-7
  vgSidekick: { frames: 7, width: 64, height: 82, speed: 3, anchorY: 0, sourceX: 512,  sheet: "./vegeta_ssj_combo_attack_uniform.png" },  // frames 8-14 (8×64)
  vgUpInto:   { frames: 8, width: 64, height: 82, speed: 3, anchorY: 0, sourceX: 960,  sheet: "./vegeta_ssj_combo_attack_uniform.png" },  // frames 15-22 (15×64)
  vgUpFinish: { frames: 7, width: 64, height: 82, speed: 3, anchorY: 0, sourceX: 1472, sheet: "./vegeta_ssj_combo_attack_uniform.png" },  // frames 23-29 (23×64)
  // KOMA RUSH (Stage 3) — the base 2-stage Down+Heavy auto-chain (komaRush1→komaFinish, interrupt on
  // whiff/block) unchanged; in SSJ both stages are consecutive halves of ONE super_kick_special sheet.
  komaRush1:  { frames: 9, width: 115, height: 78, speed: 3, anchorY: 0, sourceX: 0,    sheet: "./vegeta_ssj_super_kick_uniform.png" },  // frames 0-8
  komaFinish: { frames: 9, width: 115, height: 78, speed: 3, anchorY: 0, sourceX: 1035, sheet: "./vegeta_ssj_super_kick_uniform.png" },  // frames 9-17 (9×115)
  // STAGE 5 SSJ-EXCLUSIVE signature moves (no base-form equivalent).
  // SELF-DESTRUCT — the caster "pose" IS the detonation (self_explosion engulfs Vegeta). actionScale
  // tames the tall 159px cell so the blast reads big but not screen-eating.
  selfDestruct:   { frames: 28, width: 166, height: 159, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, actionScale: 0.8, sheet: "./vegeta_ssj_self_explosion_uniform.png" },
  // DIAGONAL GALICK GUN caster pose (its own input, distinct from the Stage-4 Galick).
  diagGalickCast: { frames: 13, width: 74, height: 76, speed: 2, anchorY: 0, sheet: "./vegeta_ssj_diag_galick_cast_uniform.png" },
  // 3-TIER UP-ATTACK (Stage 6) — re-press UP-attack in recovery to escalate. T1 reuses the `up` sheet;
  // T2 = up_attack_special; T3 = super_up_attack (launcher) + a spawned ki-burst FX.
  vgUpT1: { frames: 7,  width: 47, height: 61, speed: 3, anchorY: 0, sheet: "./vegeta_ssj_up_uniform.png" },
  vgUpT2: { frames: 7,  width: 46, height: 77, speed: 3, anchorY: 0, sheet: "./vegeta_ssj_up_special_uniform.png" },
  vgUpT3: { frames: 11, width: 49, height: 65, speed: 3, anchorY: 0, sheet: "./vegeta_ssj_super_up_uniform.png" }
  // NOTE: bigBangCast intentionally left inherited (base) — Big Bang's gold recolor is Stage 4.
  // NOTE: komaRep (Koma Repeatable, Down+Light) intentionally reuses base koma_attack_repeatabl via the merge (no SSJ art on disk).
}

// Enter SSJ. Player path: gated on vegeta + not already SSJ + actionable + energy ≥ threshold, and
// plays the 27-frame morph in-place (locked for its duration). opts.fast = the silent Blue-chain
// pass-through (skips gates + morph, snaps state instantly so Blue can escalate the same frame).
export function enterVegetaSSJ(fighter, context = {}, opts = {}) {
  if (!isVegeta(fighter) || fighter._ssjActive) return false
  const fast = !!opts.fast
  if (!fast) {
    if ((fighter.attackCooldown || 0) > 0 || (fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0) return false
    if ((fighter.energy || 0) < VEGETA_SSJ_THRESHOLD) return false   // ONLY at/above threshold — no up-front spend
  }
  fighter._ssjActive        = true
  fighter._skinAnim         = VEGETA_SSJ_ANIM       // FULL art form-swap (gold sheets)
  fighter.currentForm       = "vegetaSSJ"           // HUD/state (base → vegetaSSJ)
  fighter.damageMultiplier  = VEGETA_SSJ_MULT.dmg
  fighter.attackMultiplier  = VEGETA_SSJ_MULT.dmg
  fighter.speedMultiplier   = VEGETA_SSJ_MULT.spd
  fighter.defenseMultiplier = VEGETA_SSJ_MULT.def
  // updateTransformationState re-applies multipliers from currentFormData EVERY frame — point it at
  // the SSJ entry (matching VEGETA_SSJ_MULT) or the base form data would stomp the buffs a frame later.
  fighter.currentFormData   = fighter.transformations?.ssj || fighter.currentFormData
  fighter._ssjWaypointReached = true                // PUBLIC: SSJ waypoint passed (SSJ Blue prerequisite)
  if (fast) {
    fighter.teleportFlash = Math.max(fighter.teleportFlash || 0, 8)
  } else {
    fighter._spriteCastMove  = "transform"          // play the base→gold morph on the fighter
    fighter._spriteCastTimer = VEGETA_SSJ_MORPH
    fighter.attackCooldown   = VEGETA_SSJ_MORPH      // fully locked while morphing
    fighter.teleportFlash    = 14
    fighter.vx = 0
    sound.playDragonBallTransformSfx()               // SHARED Dragon Ball transform cue
  }
  return true
}

// Revert to base: clear the flag + art swap + stat multipliers. Called by the drain auto-revert,
// a manual re-tap, and round/KO resets. (Mirrors revertSSJRose.)
export function revertVegetaSSJ(fighter) {
  if (!fighter || !fighter._ssjActive) return
  fighter._ssjActive        = false
  fighter._skinAnim         = null
  fighter.currentForm       = "base"
  fighter.damageMultiplier  = 1
  fighter.attackMultiplier  = 1
  fighter.speedMultiplier   = 1
  fighter.defenseMultiplier = 1
  // Point currentFormData back at the base form so updateTransformationState re-applies 1.0 each
  // frame (mirror; otherwise it would keep re-applying the SSJ buffs after revert).
  fighter.currentFormData   = fighter.transformations?.base || null
  fighter.teleportFlash     = Math.max(fighter.teleportFlash || 0, 8)
}

// P-tap toggle: enter if base + at threshold; manual revert if already transformed.
export function toggleVegetaSSJ(fighter, context = {}) {
  if (!isVegeta(fighter)) return false
  if (fighter._ssjActive) { revertVegetaSSJ(fighter); return true }
  return enterVegetaSSJ(fighter, context)
}

// Per-frame hook (updateFighterState): continuous drain + instant auto-revert at 0. Handles BOTH
// forms — only one is ever active (Blue clears _ssjActive), so only its drain runs.
export function applyVegetaFormSystem(fighter) {
  if (!isVegeta(fighter)) return
  tickSustainedFormDrain(fighter, { active: f => !!f._ssjBlueActive, drainPerFrame: VEGETA_BLUE_DRAIN, revert: revertVegetaBlue })
  tickSustainedFormDrain(fighter, { active: f => !!f._ssjActive,     drainPerFrame: VEGETA_SSJ_DRAIN,  revert: revertVegetaSSJ })
}

// MANDATORY-WAYPOINT SEAM for the future SSJ Blue build. Blue's activation MUST call this FIRST:
// if Vegeta isn't already at SSJ (or above), it fires the REAL SSJ transform as a fast, silent
// intermediate step so the SSJ state genuinely exists before Blue stacks on top. Returns true once
// SSJ (or higher) is active. Blue therefore cannot gate purely on base-form energy — routing through
// here guarantees the waypoint is never skipped. _ssjWaypointForced records that this path fired it.
export function ensureVegetaSSJWaypoint(fighter, context = {}) {
  if (!isVegeta(fighter)) return false
  if (fighter._ssjActive || fighter._ssjBlueActive) return true   // already at/above the waypoint
  const ok = enterVegetaSSJ(fighter, context, { fast: true })
  fighter._ssjWaypointForced = ok
  return ok
}

// TRUE while Vegeta is in ANY super form (SSJ or Blue). Gates every "SSJ-or-above" behavior — the
// gold specials, the SSJ-exclusive moves, the up-attack tiers — so they stay available in Blue too.
export function vegetaIsSuper(fighter) { return !!(fighter?._ssjActive || fighter?._ssjBlueActive) }

// ─────────────────────────────────────────────────────────────────────────
// VEGETA — SUPER SAIYAN BLUE  (THIRD form; the top of Vegeta's power tier)
// Chains OFF the SSJ waypoint: enterVegetaBlue REQUIRES the SSJ state (rejects a direct base→Blue),
// mirroring SSJ Rose/SSJ shape (threshold-gated, continuous drain, auto-revert). Blue SUPERSEDES SSJ
// (clears _ssjActive, sets _ssjBlueActive) so only Blue's drain runs. Buffs sit clearly above SSJ's
// finalized 1.20/1.12/1.05 — roughly doubling the base→SSJ boost. _skinAnim is a FULL COPY of SSJ's
// already-merged anim + Blue overlays → 3-tier fallback: Blue art → SSJ gold → base.
// ─────────────────────────────────────────────────────────────────────────
const VEGETA_BLUE_THRESHOLD = 160    // energy ≥ 160 (80% of 200) — HIGHER than SSJ's 120 (top-tier gate)
const VEGETA_BLUE_DRAIN     = 0.28   // energy/frame (~17/s) — faster than SSJ's 0.18 (costlier to sustain)
const VEGETA_BLUE_MULT      = { dmg: 1.45, spd: 1.25, def: 1.12 }   // clearly above SSJ (1.20/1.12/1.05)
const VEGETA_BLUE_MORPH     = 50     // vegeta_blue_transformation.png (25f × speed 2) full lockout

// FULL copy of SSJ's finalized (already-merged base+SSJ) anim, with Blue overlays. Any action WITHOUT
// Blue art falls back to SSJ's (gold), which itself falls back to base's — the 3-tier chain.
const VEGETA_BLUE_ANIM = {
  ...VEGETA_SSJ_ANIM,
  idle:      { frames: 4,  width: 48,  height: 62, speed: 6, anchorY: 0, sheet: "./vegeta_blue_idle_uniform.png" },
  // Blue LOCOMOTION (dedicated cyan art — closes the gap where `run`/`walk` silently fell through to SSJ
  // gold, the source of the choppiness during movement). slice_scan vegeta_ssj_blue_run.png → 248×48, 4
  // content islands [2-52][64-113][127-177][195-246]; RE-SLICED to a uniform strip via harness/reslice.mjs →
  // vegeta_ssj_blue_run_uniform.png {frames:4, width:58, height:48} (matches SSJ run's 58 pitch). NOTE: normal
  // forward movement resolves to `walk` (the `run` action needs |vx|>10, unreached by ground speed), so `walk`
  // MUST point at the Blue sheet too or gold shows during movement — mirrors SSJ/base where walk reuses run.
  walk:      { frames: 4,  width: 58,  height: 48, speed: 6, anchorY: 0, sheet: "./vegeta_ssj_blue_run_uniform.png" },   // reuse run, slower
  run:       { frames: 4,  width: 58,  height: 48, speed: 4, anchorY: 0, sheet: "./vegeta_ssj_blue_run_uniform.png" },
  // Transform morph (SSJ gold → Blue). Plays ONCE on entering (VEGETA_BLUE_MORPH lockout) + doubles as the Blue intro.
  transform: { frames: 25, width: 109, height: 97, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_blue_transformation_uniform.png" },
  // CHARGE — DEDICATED cyan Blue aura. Closes the SAME class as SSJ's Bug 1: vegeta_blue_charge_up.png (real
  // Blue art, 12 islands) existed on disk but VEGETA_BLUE_ANIM never overlaid the `charge` key, so the merged
  // _skinAnim fell through to VEGETA_SSJ_ANIM.charge (gold) — proven via skinAnimDump. RE-SLICED frames 1-9
  // (brace → aura ignite → full cyan aura; dropped 10-12 dissipate so a HELD charge loops clean) into a
  // uniform strip; two-part loop (buildup 0-3 plays once, tail 4-8 loops). Because Final Flash's cast reuses
  // `charge`, this ALSO turns Blue's Final Flash cast cyan (previously the flagged SSJ-gold blip).
  charge:    { frames: 9, width: 107, height: 117, speed: 6, anchorY: 0, loop: true, loopStart: 4, sheet: "./vegeta_blue_charge_up_uniform.png" },
  // STAGE 2 — Blue (cyan) NORMALS. Overlay on top of SSJ's gold so attacks read as Blue Vegeta.
  light:    { frames: 6,  width: 72, height: 62, speed: 3, anchorY: 0, sheet: "./vegeta_blue_light_uniform.png" },   // foward_kick (leading 4px debris discarded → 6 real frames)
  heavy:    { frames: 22, width: 65, height: 65, speed: 2, anchorY: 0, sheet: "./vegeta_blue_heavy_uniform.png" },   // 6_combo_attack
  up:       { frames: 9,  width: 57, height: 72, speed: 3, anchorY: 0, sheet: "./vegeta_blue_up_uniform.png" },      // up_attack_2 (launcher)
  air:      { frames: 14, width: 46, height: 66, speed: 3, anchorY: 0, sheet: "./vegeta_blue_air_uniform.png" },     // air_attack
  down_air: { frames: 14, width: 46, height: 66, speed: 3, anchorY: 0, sheet: "./vegeta_blue_air_uniform.png" },     // REUSE air_attack (no dedicated down_air, same precedent as every form)
  // The up-attack in a super form fires the TIER rekka (vgUpT1), so point tier-1 at the Blue launcher too.
  // Tiers 2/3 (vgUpT2/vgUpT3) have no Blue art → fall through to SSJ gold (documented Blue-art gap).
  vgUpT1:   { frames: 9,  width: 57, height: 72, speed: 3, anchorY: 0, sheet: "./vegeta_blue_up_uniform.png" },
  // STAGE 3 — COMMAND-NORMAL CHAIN. Segment the single 14-frame attack_sequance (re-cropped: #0-13 clean;
  // #14-17 = the flagged 5/1/18/3px debris; #18-20 trailing flourish dropped) across the 4 rekka stages.
  vgFkick1:   { frames: 4, width: 91, height: 72, speed: 3, anchorY: 0, sourceX: 0,    sheet: "./vegeta_blue_cmd_uniform.png" },  // frames 0-3
  vgSidekick: { frames: 3, width: 91, height: 72, speed: 3, anchorY: 0, sourceX: 364,  sheet: "./vegeta_blue_cmd_uniform.png" },  // frames 4-6 (4×91)
  vgUpInto:   { frames: 4, width: 91, height: 72, speed: 3, anchorY: 0, sourceX: 637,  sheet: "./vegeta_blue_cmd_uniform.png" },  // frames 7-10 (7×91)
  vgUpFinish: { frames: 3, width: 91, height: 72, speed: 3, anchorY: 0, sourceX: 1001, sheet: "./vegeta_blue_cmd_uniform.png" },  // frames 11-13 (11×91)
  // STAGE 3 — KOMA RUSH (Blue's is a 4-STAGE chain, unlike SSJ's 2-stage). Distinct sheets per stage.
  vgBlueKoma1: { frames: 10, width: 68, height: 80, speed: 3, anchorY: 0, sheet: "./vegeta_blue_koma1_uniform.png" },  // front_attack (opener)
  vgBlueKoma2: { frames: 10, width: 68, height: 70, speed: 3, anchorY: 0, sheet: "./vegeta_blue_koma2_uniform.png" },  // front_kick
  vgBlueKoma3: { frames: 7,  width: 51, height: 69, speed: 3, anchorY: 0, sheet: "./vegeta_blue_koma3_uniform.png" },  // up_attack (pop) — NB: NOT up_attack_2
  vgBlueKoma4: { frames: 8,  width: 44, height: 67, speed: 3, anchorY: 0, sheet: "./vegeta_blue_koma4_uniform.png" },  // ki_bomb_throw (finisher + FX)
  // STAGE 4 — Galick Gun cast pose (charge+release "character halves" merged → 14f). Final Flash reuses
  // `charge` → now the DEDICATED cyan Blue charge above (gap CLOSED). Big Bang reuses `bigBangCast` (base — FLAGGED gap).
  galickCast: { frames: 14, width: 74, height: 76, speed: 2, anchorY: 0, sheet: "./vegeta_blue_galick_cast_uniform.png" },
  // STAGE 5 Blue-exclusive: Super Galick Gun cast pose (22f, 6px mid-run debris left in — negligible blip)
  // + Teleport (2 poses + streak-blur; play-once).
  vgSuperGalickCast: { frames: 22, width: 105, height: 93, speed: 2, anchorY: 0, sheet: "./vegeta_blue_super_galick_uniform.png" },
  vgTeleport:        { frames: 4,  width: 33,  height: 87, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./vegeta_blue_teleport_uniform.png" }
  // guard/jump/hurt/etc. intentionally NOT overridden → fall through to SSJ's gold sheets (verified in-test).
  // (walk/run ARE now overridden above → Blue locomotion uses its own cyan art, no longer SSJ gold.)
}

// Enter Blue. GATE: must already be in SSJ (the waypoint). Player path rejects a direct base→Blue;
// opts.chain lets a programmatic caller force the SSJ waypoint first via ensureVegetaSSJWaypoint.
export function enterVegetaBlue(fighter, context = {}, opts = {}) {
  if (!isVegeta(fighter) || fighter._ssjBlueActive) return false
  const fast = !!opts.fast
  // MANDATORY WAYPOINT — Blue only from the SSJ state.
  if (!fighter._ssjActive) {
    if (!opts.chain) return false                                    // reject/no-op a direct base→Blue attempt
    if (!ensureVegetaSSJWaypoint(fighter, context)) return false     // full-chain caller: fire SSJ first
  }
  if (!fast) {
    if ((fighter.attackCooldown || 0) > 0 || (fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0) return false
    if ((fighter.energy || 0) < VEGETA_BLUE_THRESHOLD) return false  // higher gate than SSJ
  }
  fighter._ssjActive        = false                 // Blue SUPERSEDES SSJ (only Blue drain runs)
  fighter._ssjBlueActive    = true
  fighter._skinAnim         = VEGETA_BLUE_ANIM
  fighter.currentForm       = "vegetaBlue"
  fighter.damageMultiplier  = VEGETA_BLUE_MULT.dmg
  fighter.attackMultiplier  = VEGETA_BLUE_MULT.dmg
  fighter.speedMultiplier   = VEGETA_BLUE_MULT.spd
  fighter.defenseMultiplier = VEGETA_BLUE_MULT.def
  fighter.currentFormData   = fighter.transformations?.ssjBlue || fighter.currentFormData   // re-applied each frame
  fighter._ssjWaypointReached = true
  if (fast) {
    fighter.teleportFlash = Math.max(fighter.teleportFlash || 0, 8)
  } else {
    fighter._spriteCastMove  = "transform"
    fighter._spriteCastTimer = VEGETA_BLUE_MORPH
    fighter.attackCooldown   = VEGETA_BLUE_MORPH
    fighter.teleportFlash    = 14
    fighter.vx = 0
    sound.playDragonBallTransformSfx()
  }
  return true
}

// Revert Blue → base (drops the whole ladder, like SSJ's revert).
export function revertVegetaBlue(fighter) {
  if (!fighter || !fighter._ssjBlueActive) return
  fighter._ssjBlueActive    = false
  fighter._ssjActive        = false
  fighter._skinAnim         = null
  fighter.currentForm       = "base"
  fighter.damageMultiplier  = 1
  fighter.attackMultiplier  = 1
  fighter.speedMultiplier   = 1
  fighter.defenseMultiplier = 1
  fighter.currentFormData   = fighter.transformations?.base || null
  fighter.teleportFlash     = Math.max(fighter.teleportFlash || 0, 8)
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
    sound.playSfxFile("naruto_big_ball_rasengan.mp3", null)   // VOICE: "Super Big Ball Rasengan Barrage!" — charge-scaling variant only (NOT plain Rasengan)
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
    sound.playSfxFile("naruto_special_burst.mp3", null)   // VOICE: "I'll blow it away with my jutsu" — Dark Rasengan (the voiceless special; Rasenshuriken already carries its wind SFX)
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
    sound.playSfxFile("naruto_shadow_clone_special.mp3", null)   // VOICE: "Naruto 2000-Hit Combo!" — Shadow Clone Blast (clone Rasengan barrage)
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
    sound.playSfxFile("naruto_shadow_clone_special.mp3", null)   // VOICE: "Naruto 2000-Hit Combo!" — Shadow Clone Blast (clone Rasengan barrage)
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
  sound.playSfxFile("naruto_rasengan_cast.mp3", null)   // VOICE: "It's Rasengan!" — plain (neutral) Rasengan only
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

// ─────────────────────────────────────────────────────────────────
// VEGETA — command-normal cancel chain ("Y-track" kick target combo). Toji-Rekka
// mechanics (fireTojiBladeMove/_rekkaNext): a Forward+Heavy OPENER, then re-tapping
// Heavy during the current hit's RECOVERY cancels into the next stage — but ONLY if the
// prior hit actually CONNECTED (cancel-on-HIT; a blocked or whiffed hit ends the string,
// matching the base spec's interrupt-on-whiff/block rule). This is its OWN input path,
// distinct from the neutral light (punch) / neutral heavy (crouch strike) normals, which
// stay on the normal combat path untouched.
//   vgFkick1 (opener) → vgSidekick → vgUpInto (LAUNCHER) → vgUpFinish (finisher).
const VEGETA_COMMAND = {
  vgFkick1:   { damage: 40, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3, knockbackY: 0,  rangeX: 72, rangeY: 50, rekkaNext: "vgSidekick" },
  vgSidekick: { damage: 34, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 3, knockbackY: 0,  rangeX: 80, rangeY: 50, rekkaNext: "vgUpInto" },
  // vgUpInto POPS the opponent up via knockback (NOT launcher:true — a true launcher's
  // physics.launcherAttack lifts the ATTACKER too and auto-cancels his move for a juggle,
  // which would break the grounded rekka before the finisher). Vegeta stays grounded → the
  // string continues; the real juggle-launch lives on the finisher below.
  vgUpInto:   { damage: 42, startup: 6, active: 4, recovery: 12, hitstun: 18, knockbackX: 2, knockbackY: -10, rangeX: 84, rangeY: 54, rekkaNext: "vgUpFinish" },
  vgUpFinish: { damage: 60, startup: 6, active: 4, recovery: 20, hitstun: 22, knockbackX: 9, knockbackY: -4, rangeX: 92, rangeY: 52, launcher: true },   // finisher — LAUNCHES for a juggle (combo ends here, so the launch-cancel is fine)
}

function fireVegetaCommand(fighter, key, context) {
  const md = VEGETA_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._komaNext     = null    // command chain and Koma Rush are separate strings
  fighter._upTierNext   = null
  fighter._cmdHitLanded = false   // reset per stage; latched true only on a real (non-blocked) hit
  return true
}

// SSJ-ONLY 3-TIER UP-ATTACK (Stage 6). Re-pressing UP-attack during the current tier's RECOVERY
// escalates T1 → T2 → T3 (super, a launcher that spawns a ki-burst FX). Reuses the SAME rekka
// primitive as the command chain (setAttackState + a `_next` field advanced on a fresh press).
const VEGETA_SSJ_UP = {
  vgUpT1: { damage: 45, startup: 6, active: 4, recovery: 12, hitstun: 16, knockbackX: 2, knockbackY: -6,  rangeX: 62, rangeY: 74, upNext: "vgUpT2" },   // tap
  vgUpT2: { damage: 58, startup: 5, active: 4, recovery: 14, hitstun: 18, knockbackX: 2, knockbackY: -9,  rangeX: 66, rangeY: 82, upNext: "vgUpT3" },   // 2nd press
  vgUpT3: { damage: 85, startup: 7, active: 5, recovery: 22, hitstun: 24, knockbackX: 3, knockbackY: -14, rangeX: 72, rangeY: 92, launcher: true },     // super (launcher)
}
function fireVegetaUpTier(fighter, key, context) {
  const md = VEGETA_SSJ_UP[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._upTierNext   = md.upNext || null
  fighter._rekkaNext    = null
  fighter._komaNext     = null
  fighter._cmdHitLanded = false
  if (key === "vgUpT3") {   // super finisher — burst FX above Vegeta (visualOnly, decays via lifetime)
    spawnProjectile(fighter, "vgUpFinishFx", {
      visualOnly: true, damage: 0, lifetime: 18, vx: 0, vy: 0,
      spawnX: fighter.x + (fighter.w || 60) / 2, spawnY: fighter.y - 24,
      sheet: "./vegeta_ssj_super_up_fx_uniform.png", spriteFrames: 3, spriteW: 96, spriteH: 96, spriteSpeed: 4, spriteScale: 1.4
    }, context)
  }
  return true
}

// Grounded command-normal driver (mirrors updateTojiStanceCombat's rekka path). Returns
// true (→ skip the normal path this frame) only when it actually fires a stage.
export function updateVegetaCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "vegeta" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase = getPhase?.(fighter)

  // Press-EDGES (fresh tap, not a held/buffered button).
  const heavyEdge   = !!inputState.heavy    && !fighter._cmdPrevHeavy
  const lightEdge   = !!inputState.light    && !fighter._cmdPrevLight
  const specialEdge = !!inputState.special  && !fighter._cmdPrevSpecial
  const upEdge      = !!inputState.upAttack && !fighter._cmdPrevUp   // SSJ 3-tier up-attack re-press
  fighter._cmdPrevHeavy   = !!inputState.heavy
  fighter._cmdPrevLight   = !!inputState.light
  fighter._cmdPrevSpecial = !!inputState.special
  fighter._cmdPrevUp      = !!inputState.upAttack
  // Down HOLD timer — feeds Ki Blast's tap-vs-hold (D+Special) decision in executeVegetaSpecial.
  if (inputState.down && !fighter._vgDownPrev) fighter._vgDownSince = performance.now()
  fighter._vgDownPrev = !!inputState.down

  // Latch a REAL connect for the current stage: hasHit AND the opponent took hitstun (a hit),
  // NOT blockstun (a block). resolveAttackHit runs in updateCombat AFTER this handler, so the
  // flag is observed the following frame while hitstun (12-22f) is still counting down.
  const opp = context?.getOpponent?.(fighter)
  if (fighter.attacking && fighter.currentAttack?.hasHit && (opp?.hitstun || 0) > 0) fighter._cmdHitLanded = true

  // Every string's window closes when the attack fully ends.
  if (!fighter.attacking) { fighter._rekkaNext = null; fighter._komaNext = null; fighter._upTierNext = null; fighter._cmdHitLanded = false }

  // SSJ UP-ATTACK TIER ADVANCE — a fresh UP-attack during the current tier's RECOVERY escalates
  // T1→T2→T3 (no connect required — a committed launcher combo you charge into; each tier is more
  // punishable via longer recovery). SSJ-only (base up-attack stays a single normal).
  if (vegetaIsSuper(fighter) && fighter.attacking && fighter._upTierNext && upEdge && phase === "recovery") {
    const next = fighter._upTierNext
    fighter.attacking = false; fighter.currentAttack = null; fighter.currentMove = null
    fighter.attackCooldown = 0
    return fireVegetaUpTier(fighter, next, context)
  }

  // KOMA RUSH AUTO-ADVANCE — a Koma stage auto-continues into the next on a CLEAN hit (no input),
  // during recovery. A whiff or block (no _cmdHitLanded) ends the rush there (interrupt rule).
  if (fighter.attacking && fighter._komaNext && phase === "recovery" && fighter._cmdHitLanded) {
    const next = fighter._komaNext
    fighter.attacking = false; fighter.currentAttack = null; fighter.currentMove = null
    fighter.attackCooldown = 0
    return fireVegetaMelee(fighter, next)
  }

  // COMMAND-CHAIN CONTINUE — fresh Heavy during the current hit's RECOVERY, only if it CONNECTED.
  if (fighter.attacking && fighter._rekkaNext && heavyEdge && phase === "recovery" && fighter._cmdHitLanded) {
    const next = fighter._rekkaNext
    fighter.attacking = false; fighter.currentAttack = null; fighter.currentMove = null
    fighter.attackCooldown = 0                       // clear the just-set cooldown so the chain fires now
    return fireVegetaCommand(fighter, next, context)
  }

  // EX KI PUNCH — combo-cancel ONLY: fresh Special during a light/heavy NORMAL's recovery cancels
  // into it (the Special button is otherwise blocked mid-attack by the canStart gate in game.js, so
  // this is its only route — never throwable from neutral). Free, cooldown-gated. NOTE: normals set
  // currentAttack.name (not currentMove — startMove leaves currentMove null), so read that.
  const curName = fighter.currentMove || fighter.currentAttack?.name
  if (fighter.attacking && (curName === "light" || curName === "heavy") &&
      phase === "recovery" && specialEdge) {
    fighter.attacking = false; fighter.currentAttack = null; fighter.currentMove = null
    fighter.attackCooldown = 0
    return fireVegetaMelee(fighter, "exKi")
  }

  // OPENERS (grounded, from neutral). Heavy is context-split: Forward=command chain, Down=Koma Rush,
  // neutral=crouch strike (normal path). Down+Light=Koma Repeatable. Down = holding-down (also blocks).
  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded) {
    if (inputState.down && heavyEdge) return fireVegetaMelee(fighter, fighter._ssjBlueActive ? "vgBlueKoma1" : "komaRush1")   // Down+Heavy → Koma Rush (Blue = 4-stage)
    if (inputState.down && lightEdge) return fireVegetaMelee(fighter, "komaRep")      // Down+Light → Koma Repeatable
    if (forward && heavyEdge)         return fireVegetaCommand(fighter, "vgFkick1", context)  // Fwd+Heavy → command chain
    if (vegetaIsSuper(fighter) && upEdge && !inputState.down) return fireVegetaUpTier(fighter, "vgUpT1", context)  // SSJ/Blue: UP-attack → tiered launcher (T1)
  }

  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// OMEGA RANGER — command-normal cancel chain + two free pokes (Stage 3).
// KICK CHAIN (Fwd+Heavy → re-tap Heavy): omKick → omSpinKick → omLowAttack finisher.
// Cancel-on-HIT (Vegeta command pattern): a stage only advances if the prior hit
// CONNECTED — a block or whiff (no _cmdHitLanded) ends the string there. Each stage is
// a real, individually-landable attack. FREE POKES: Forward Push (Fwd+Light) spacing
// shove; Downward Air Attack 2 (airborne Heavy) aerial smash. All FREE (no energy):
// the chain commits via recovery, the pokes are cooldown-gated.
// ─────────────────────────────────────────────────────────────────────────────
const OMEGA_RANGER_CMD = {
  omKick:      { damage: 55, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 4,  knockbackY: 0,  rangeX: 80, rangeY: 52, rekkaNext: "omSpinKick" },
  omSpinKick:  { damage: 48, startup: 6, active: 4, recovery: 12, hitstun: 15, knockbackX: 4,  knockbackY: -1, rangeX: 86, rangeY: 54, rekkaNext: "omLowAttack" },
  omLowAttack: { damage: 82, startup: 6, active: 4, recovery: 20, hitstun: 24, knockbackX: 10, knockbackY: -3, rangeX: 90, rangeY: 46 },   // low sweep finisher (string ends here)
}
const OMEGA_RANGER_POKE = {
  omForwardPush: { damage: 44, startup: 5, active: 3, recovery: 12, hitstun: 16, knockbackX: 12, knockbackY: -1, rangeX: 84, rangeY: 52, cd: 26 },  // spacing shove — big pushback
  omDownAir2:    { damage: 60, startup: 6, active: 4, recovery: 12, hitstun: 18, knockbackX: 3,  knockbackY: 9,  rangeX: 74, rangeY: 60, cd: 24 },  // aerial smash poke — spikes down
}
// SWORD SLASH STRING (Stage 4) — a SECOND independent rekka string (Back+Light opener, re-tap
// LIGHT to continue), same cancel-on-HIT architecture as the kick chain but 7 steps and driven by
// the LIGHT button (via:"light") so it never collides with the Heavy kick chain. Steps 1-6 keep the
// opponent GROUNDED (knockbackY 0) so the ground string stays landable; only the finisher launches.
const OMEGA_RANGER_SWORD = {
  omSword1: { damage: 38, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3,  knockbackY: 0,  rangeX: 88, rangeY: 54, rekkaNext: "omSword2", via: "light" },
  omSword2: { damage: 34, startup: 4, active: 3, recovery: 9,  hitstun: 13, knockbackX: 3,  knockbackY: 0,  rangeX: 86, rangeY: 52, rekkaNext: "omSword3", via: "light" },
  omSword3: { damage: 36, startup: 5, active: 3, recovery: 10, hitstun: 14, knockbackX: 3,  knockbackY: 0,  rangeX: 90, rangeY: 54, rekkaNext: "omSword4", via: "light" },
  omSword4: { damage: 40, startup: 5, active: 3, recovery: 11, hitstun: 15, knockbackX: 3,  knockbackY: 0,  rangeX: 88, rangeY: 60, rekkaNext: "omSword5", via: "light" },
  omSword5: { damage: 38, startup: 4, active: 3, recovery: 10, hitstun: 14, knockbackX: 3,  knockbackY: 0,  rangeX: 90, rangeY: 54, rekkaNext: "omSword6", via: "light" },
  omSword6: { damage: 44, startup: 5, active: 3, recovery: 11, hitstun: 16, knockbackX: 4,  knockbackY: 0,  rangeX: 94, rangeY: 54, rekkaNext: "omSword7", via: "light" },
  omSword7: { damage: 74, startup: 6, active: 4, recovery: 22, hitstun: 24, knockbackX: 12, knockbackY: -6, rangeX: 96, rangeY: 56, launcher: true, via: "light" },   // overhead finisher — LAUNCHES (string ends)
}

function fireOmegaRangerCmd(fighter, key) {
  const md = OMEGA_RANGER_CMD[key] || OMEGA_RANGER_SWORD[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._rekkaBtn     = md.via || "heavy"   // which button advances THIS string (kick=heavy, sword=light)
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
function fireOmegaRangerPoke(fighter, key) {
  const md = OMEGA_RANGER_POKE[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.cd)   // FREE — cooldown only, no spendEnergy
  fighter._rekkaNext    = null             // pokes are not part of the kick chain
  fighter._cmdHitLanded = false
  return true
}

// Per-frame Omega Ranger command/poke driver (mirrors updateVegetaCommandCombat). Returns
// true (→ caller skips the normal path this frame) only when it actually fires a move.
export function updateOmegaRangerCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "omega_ranger" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase = getPhase?.(fighter)

  // Press-EDGES (fresh tap, not a held/buffered button) — a rekka needs a clean re-tap.
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy
  const lightEdge = !!inputState.light && !fighter._cmdPrevLight
  fighter._cmdPrevHeavy = !!inputState.heavy
  fighter._cmdPrevLight = !!inputState.light

  // Latch a REAL connect for the current stage: hasHit AND the opponent took HITSTUN (a hit),
  // NOT blockstun. resolveAttackHit runs in updateCombat AFTER this handler, so the flag is
  // observed the following frame while hitstun (14-24f) is still counting down.
  const opp = context?.getOpponent?.(fighter)
  if (fighter.attacking && fighter.currentAttack?.hasHit && (opp?.hitstun || 0) > 0) fighter._cmdHitLanded = true

  // The chain window closes when the attack fully ends.
  if (!fighter.attacking) { fighter._rekkaNext = null; fighter._cmdHitLanded = false }

  // REKKA CONTINUE — fresh press of the ACTIVE string's button during the current hit's RECOVERY,
  // only if it CONNECTED. _rekkaBtn routes: kick chain advances on Heavy, sword string on Light.
  if (fighter.attacking && fighter._rekkaNext && phase === "recovery" && fighter._cmdHitLanded) {
    const edge = fighter._rekkaBtn === "light" ? lightEdge : heavyEdge
    if (edge) {
      const next = fighter._rekkaNext
      fighter.attacking = false; fighter.currentAttack = null; fighter.currentMove = null
      fighter.attackCooldown = 0                        // clear the just-set cooldown so the chain fires now
      return fireOmegaRangerCmd(fighter, next)
    }
  }

  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const back     = fighter.facing === 1 ? !!inputState.left  : !!inputState.right
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (!canStart) return false

  // AIR — Downward Air Attack 2 (aerial free poke): airborne Heavy. (The generic down-air spike
  // is airborne Down+Light, so there's no conflict.)
  if (!grounded) {
    if (heavyEdge) return fireOmegaRangerPoke(fighter, "omDownAir2")
    return false
  }

  // GROUND OPENERS (only `down` blocks in this engine, so `back` is free for a command). Fwd+Heavy =
  // kick chain; Back+Light = sword slash string; Fwd+Light = Forward Push. Neutral light/heavy stay
  // the normal jab/smash on the normal path.
  if (forward && heavyEdge) return fireOmegaRangerCmd(fighter, "omKick")
  if (back    && lightEdge) return fireOmegaRangerCmd(fighter, "omSword1")
  if (forward && lightEdge) return fireOmegaRangerPoke(fighter, "omForwardPush")
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// OMEGA RANGER SPECIALS (Stage 5) — routed off the Special button by held direction:
//   neutral      = Delta Enforcer GUN (ranged energy bolt + cast pose)
//   Forward+Spec = SUPER UPPER ATTACK (energized rising uppercut — its OWN move, NOT a
//                  tier of the up-normal; melee launcher)
//   Down+Spec    = SPECIAL DOWNWARD ATTACK (spinning-blade windup → ground-spray slam)
// All costed off the SPD-Energy bar. Melee specials use the createAttackFromMove path
// (currentMove drives the sprite); the gun is a sprite-cast + projectile (Rick precedent).
// ─────────────────────────────────────────────────────────────────────────────
const OMEGA_SUPER_UPPER  = { damage: 150, startup: 8,  active: 5, recovery: 20, hitstun: 24, knockbackX: 6, knockbackY: -14, rangeX: 78, rangeY: 92, launcher: true }
const OMEGA_DOWN_SPECIAL = { damage: 165, startup: 10, active: 6, recovery: 24, hitstun: 26, knockbackX: 9, knockbackY: -4,  rangeX: 92, rangeY: 60 }

function executeOmegaRangerSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const last = dirs.length ? dirs[dirs.length - 1] : null

  // DOWN + Special → Special Downward Attack (melee slam; spinning-blade windup art).
  if (last === "D") {
    if (!spendEnergy(fighter, 40)) return false
    const md = OMEGA_DOWN_SPECIAL
    const attack = createAttackFromMove(fighter, "omDownSpecial", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
    setAttackState(fighter, attack, md.startup + md.active + md.recovery)
    fighter._rekkaNext = null
    return true
  }

  // FORWARD + Special → Super Upper Attack (melee launcher — separate move from the up-normal).
  if (last === "F") {
    if (!spendEnergy(fighter, 45)) return false
    // "But you can't beat this guy!" — CHOSE the Super Upper (Fwd+Special) as the home for this
    // generic cast bark; the Special Downward (Down+Special) is deliberately left WITHOUT a dedicated
    // line (neither had one; task said pick either). Fires at cast windup, before the launch connects.
    sound.playSfxFile?.("omega_special_cast.mp3", null)
    const md = OMEGA_SUPER_UPPER
    const attack = createAttackFromMove(fighter, "omSuperUpper", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
    attack.launcher = true
    setAttackState(fighter, attack, md.startup + md.active + md.recovery)
    fighter._rekkaNext = null
    return true
  }

  // BACK + Special → SWORD ULTIMATE (RING) — the Battlizer-style bonus super (its OWN input,
  // separate from the Ultimate button). A big energy-ring saber burst; costliest special, launches.
  if (last === "B") {
    if (!spendEnergy(fighter, 60)) return false
    // "Blast Mode! Power up!" — the bonus Battlizer-style Ring super. Its OWN activation beat, distinct
    // from the Ultimate button's "Hyper Mode!" line (different input, different code path — no collision).
    sound.playSfxFile?.("omega_blast_mode_alt.mp3", null)
    const md = { damage: 200, startup: 10, active: 8, recovery: 26, hitstun: 30, knockbackX: 12, knockbackY: -6, rangeX: 110, rangeY: 90 }
    const attack = createAttackFromMove(fighter, "omSwordRing", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
    attack.launcher = true
    setAttackState(fighter, attack, md.startup + md.active + md.recovery)
    fighter._rekkaNext = null
    shakeCamera(context, 9, 10)
    return true
  }

  // NEUTRAL (or Up) Special → Delta Enforcer GUN: cast pose + forward energy bolt projectile.
  if (!spendEnergy(fighter, 30)) return false
  // "Buster Mode! Go!" — Gun-special cast bark. KEPT the existing display name "Delta Enforcer Gun"
  // (the lore-accurate SPD blaster name, more specific than "Buster Mode") — the spoken callout is
  // flavor VO and doesn't need to be the move's HUD name. Fires at the cast, alongside the bolt spawn.
  sound.playSfxFile?.("omega_buster_mode_cast.mp3", null)
  const face = fighter.facing || 1
  fighter._spriteCastMove  = "omGun"
  fighter._spriteCastTimer = 18
  fighter.attackCooldown   = getAttackDuration(18, fighter)
  spawnProjectile(fighter, "omGunBolt", {
    damage: 120, speed: 15, lifetime: 72, vx: face * 15, vy: 0,
    hitstun: 18, knockbackX: 7, knockbackY: -2, w: 42, h: 18, color: "#ff5a3c",
    sheet: "./omega_ranger_gun_bolt_uniform.png", spriteFrames: 3, spriteW: 51, spriteH: 53, spriteSpeed: 3, spriteScale: 1.0,
    spawnX: face === 1 ? fighter.x + (fighter.w || 60) : fighter.x - 42,
    spawnY: fighter.y + (fighter.h || 100) * 0.34
  }, context)
  return true
}

// OMEGA RANGER ULTIMATE — Omega Saber: Final Strike. A committed full sword-draw arc, the biggest
// single hit in the kit. currentMove "ultimate" → the sword_shash_ultimate sprite (MOVE_TO_ACTION
// maps "ultimate"→"ultimate"). Spends the meter (100), launches, camera shake + focus. (Cooldown is
// armed by the universal triggerUltimate wrapper.)
function executeOmegaRangerUltimate(fighter, context) {
  if (!spendEnergy(fighter, 100)) return false
  // "Omega Ranger, Hyper Mode! Engage!" — at the ULTIMATE activation windup, before the slash lands
  // (same cast-start beat every other char's ultimate line uses). Its own input/path vs the Ring's
  // "Blast Mode!" — the two supers never double-fire.
  sound.playSfxFile?.("omega_hyper_mode_ultimate.mp3", null)
  const md = { damage: 240, startup: 14, active: 8, recovery: 30, hitstun: 40, knockbackX: 14, knockbackY: -8, rangeX: 120, rangeY: 72 }
  const attack = createAttackFromMove(fighter, "ultimate", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._rekkaNext = null
  shakeCamera(context, 14, 14)
  focusCameraOnAction(context, fighter, null, 0.92, 16)
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
    sound.playSfxFile?.("sasuke_susanoo_activate.mp3", null)   // VOICE: "Susanoo!" — Stage 1 giant-form activation
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
    sound.playSfxFile?.("sasuke_ultimate_cast.mp3", null)   // VOICE: "I'll erase you, right here" — Stage 2 (Sharingan-awakening) escalation
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
  sound.playSfxFile?.("sasuke_chidori_cast.mp3", null)   // VOICE: "No one can resist my lightning" — Chidori Koiten cast
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
  // VOICE: "Fire Release: Great Fireball Jutsu!" — Sasuke has NO literal fireball move, so this
  // named-jutsu callout is mapped onto the Two-Strike Lightning (qcf+Special): the biggest
  // telegraphed handseal→named-jutsu base-kit cast, best cadence match, and the only base special
  // with no other voice line (Chidori/dash/shuriken/substitution are taken). FLAGGED substitution.
  sound.playSfxFile?.("sasuke_great_fireball.mp3", null)
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
  sound.playSfxFile?.("sasuke_smoke_and_kagutsuchi.mp3", null)   // VOICE: "Smoke Release!" + "Susanoo Kagutsuchi!" — Substitution Jutsu cast
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

// ── ITACHI SPECIAL dispatch ──────────────────────────────────────────────
// STAGE 2: NEUTRAL Special → Fire Style: Great Fireball Jutsu (cast pose + a big
// rolling flame projectile). Motioned specials (Amaterasu QCF / Genjutsu QCB) are
// added in Stage 4 and HARD-gated behind Mangekyou (_mangekyouActive) — until then
// a motioned press that matches nothing falls through to the neutral fireball.
// Genjutsu hit-confirm gate: at least this many combo hits must be currently connecting
// (combat.js increments comboCounter on unblocked hits, expiring ~90f after the last one).
const GENJUTSU_MIN_COMBO = 2

function executeItachiSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)

  // ── MANGEKYOU-GATED SPECIALS ────────────────────────────────────────────
  // HARD gate: only resolve while _mangekyouActive. In base form this whole block is skipped,
  // so a QCF/QCB motion simply falls through to the neutral Great Fireball (Itachi's always-on
  // special). Mirrors Goku Black's Rose-exclusive gate — the flame/illusion art only exists in-mode.
  if (fighter._mangekyouActive) {
    // QCF (D→F) — AMATERASU: inextinguishable black flame. Modest direct hit, strong lingering DOT.
    if (endsWithPattern(dirs, ["D", "F"])) {
      if (!spendEnergy(fighter, 40)) return false
      const face = fighter.facing || 1
      fighter._spriteCastMove  = "amaterasuCast"
      fighter._spriteCastTimer = 26
      fighter.attackCooldown   = getAttackDuration(26, fighter)
      spawnProjectile(fighter, "amaterasu", {
        damage: 90, speed: 9, lifetime: 104, vx: face * 9, vy: 0,
        hitstun: 20, knockbackX: 4, knockbackY: -1, w: 60, h: 84, color: "#20204a",
        sheet: "./itachi_amaterasu_flame_uniform.png", spriteFrames: 6, spriteW: 167, spriteH: 143, spriteSpeed: 3, spriteScale: 0.7,
        dot: { ticks: 6, interval: 14, dmg: 10 },   // black flames keep burning after the hit
        spawnX: face === 1 ? fighter.x + (fighter.w || 60) : fighter.x - 70,
        spawnY: fighter.y + (fighter.h || 100) * 0.34
      }, context)
      focusCameraOnAction(context, fighter, getTargetResolver(context)(fighter), 0.95, 10)
      return true
    }

    // QCB (D→B) — GENJUTSU: a hit-confirm FINISHER. Only fires mid-combo (comboCounter ≥ MIN);
    // a raw press with no live combo whiffs (returns false — no fireball fallback), so it stays a
    // true combo-ender. On success it lands a big-hitstun illusion (the target is frozen/paralysed).
    if (endsWithPattern(dirs, ["D", "B"])) {
      if ((fighter.comboCounter || 0) < GENJUTSU_MIN_COMBO) return false   // no hit-confirm → no output
      if (!spendEnergy(fighter, 45)) return false
      // hitstun 95 × HITSTUN_SCALE(1.15) ≈ 109f (~1.8s) — the illusion FREEZES the target for a
      // guaranteed follow-up (combat.js applies atk.hitstun; there is no separate paralysis field).
      const md = { damage: 150, startup: 6, active: 6, recovery: 26, hitstun: 95, blockstun: 20, knockbackX: 3, knockbackY: 0, rangeX: 120, rangeY: 96 }
      const attack = createAttackFromMove(fighter, "genjutsuCast", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
      setAttackState(fighter, attack, md.startup + md.active + md.recovery)
      focusCameraOnAction(context, fighter, getTargetResolver(context)(fighter), 1.0, 14)
      shakeCamera(context, 7, 10)
      return true
    }
  }

  // NEUTRAL — Fire Style: Great Fireball Jutsu. Hand-seal cast pose + a wide travelling
  // wall of flame (mirrors the omGun cast-pose + projectile pattern). Available in BOTH forms.
  if (!spendEnergy(fighter, 25)) return false
  const face = fighter.facing || 1
  fighter._spriteCastMove  = "fireballCast"
  fighter._spriteCastTimer = 22
  fighter.attackCooldown   = getAttackDuration(22, fighter)
  spawnProjectile(fighter, "itachiFireball", {
    damage: 120, speed: 11, lifetime: 88, vx: face * 11, vy: 0,
    hitstun: 22, knockbackX: 8, knockbackY: -2, w: 74, h: 60, color: "#ff7a1c",
    sheet: "./itachi_fireball_proj_uniform.png", spriteFrames: 4, spriteW: 228, spriteH: 127, spriteSpeed: 4, spriteScale: 0.6,
    spawnX: face === 1 ? fighter.x + (fighter.w || 60) : fighter.x - 90,
    spawnY: fighter.y + (fighter.h || 100) * 0.34
  }, context)
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
    sound.playSfxFile?.("sasuke_kagutsuchi_blade.mp3", null)   // VOICE: "Kagutsuchi's Blade!" — Susanoo sword special
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
    case "itachi":  return executeItachiSpecial(fighter, context)   // Fireball (neutral); Amaterasu/Genjutsu gated on Mangekyou (Stage 4)
    case "omololu": return executeOmoluSpecial(fighter, context)
    case "toji":    return executeToji_Special(fighter, context)
    case "rick":    return executeRickSpecial(fighter, context)
    // Goku Black — Stage 3a: Kamehameha (QCF) + Spirit Bomb (QCB). Neutral/other motions return
    // false (no-op, no glitch) until Explosion (neutral) lands in Stage 3b. NOTE: the ULTIMATE
    // dispatch still no-ops goku_black (Sword Slash = Stage 3b) — do not remove that one yet.
    case "goku_black": return executeGokuBlackSpecial(fighter, context)
    case "vegeta":  return executeVegetaSpecial(fighter, context)
    case "beerus":  return executeBeerusSpecial(fighter, context)
    case "omega_ranger": return executeOmegaRangerSpecial(fighter, context)   // Gun / Super Upper / Special Downward
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
      case "vegeta":  cast = executeVegetaUltimate(fighter, context);  break   // Overcharged Final Flash freeze cinematic
      case "beerus":  cast = executeBeerusUltimate(fighter, context);  break   // Ki Ball 3-stage freeze cinematic
      case "omega_ranger": cast = executeOmegaRangerUltimate(fighter, context); break   // Omega Saber: Final Strike
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
    try { sound.playSfxFile?.(pickRickVoice("rocket"), null) } catch (_) {}   // VOICE: random Rocket cast bark

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
  try { sound.playSfxFile?.(pickRickVoice("meeseeks"), null) } catch (_) {}   // VOICE: random Meeseeks summon-cast bark (14-entry pool)
  return true
}

function executeRickUltimate(fighter, context) {
  // SELF-DESTRUCT: instant proximity AOE. Only connects if the opponent is inside the blast.
  // Rick takes NO self-damage and is not knocked down — the near-max meter cost is the only
  // balance lever (no startup / vulnerability window). Damage is applied directly (summon-style,
  // bypassing GLOBAL_DAMAGE_SCALE) so 180 ≈ a genuine ultimate burst.
  if (!spendEnergy(fighter, 140)) return false

  // VOICE: Self-Destruct ACTIVATION — his signature catchphrase / "it's called a deterrent" (random pool).
  // Fired on the cast itself; the PAYOFF bark below is a separate beat, gated on the AOE actually connecting.
  try { sound.playSfxFile?.(pickRickVoice("ultActivate"), null) } catch (_) {}

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
      // VOICE: Self-Destruct PAYOFF — fires ONLY when the blast actually connects (a beat after
      // activation): "oh shit, well that's cool" / "boom" (random pool). Distinct from the cast bark.
      try { sound.playSfxFile?.(pickRickVoice("ultPayoff"), null) } catch (_) {}
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

  // (Goku Black Sword Slash is now a frozen CINEMATIC — gokuBlackSwordCinematic.js, driven by
  //  updateBattle's freeze block — so there is no per-frame windup state machine to tick here.)

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
  // CHARGE (hold P) — ROSE aura (form-aware: replaces the base black_goku_power_up aura). Two-part:
  // buildup frames 0-3 (3 brace frames + magenta ignition) play ONCE, then frames 4-8 (sustained pink
  // oval pulsing + sparse) LOOP while P is held (loopStart=4). RE-SLICED uniform (9 frames, feet-aligned;
  // the source packs a calm+ignition pair into one aura-bridged cell — split at the body valley).
  charge:    { frames: 9, width: 112, height: 97, speed: 8, anchorY: 0, loop: true, loopStart: 4, sheet: "./goku_black_ssj_rose_charge_uniform.png" },
  light:     { frames: 6, width: 65,  height: 56, speed: 3, anchorY: 0, sheet: "./goku_black_ssj_rose_foward_attack.png" },
  heavy:     { frames: 8, width: 108, height: 68, speed: 2, anchorY: 0, sheet: "./goku_black_ssj_rose_ki_slash.png" },   // Ki Slash (Rose)
  up:        { frames: 4, width: 43,  height: 62, speed: 3, anchorY: 0, sheet: "./goku_black_ssj_rose_up_attack.png" },
  air:       { frames: 5, width: 63,  height: 70, speed: 4, anchorY: 0, sheet: "./goku_black_ssj_rose_down_attack.png" },
  down_air:  { frames: 5, width: 63,  height: 70, speed: 4, anchorY: 0, sheet: "./goku_black_ssj_rose_down_attack.png" },
  // TAUNT (Rose-form flourish) — the base-form taunt lives in characters.js animationData; this MUST
  // exist so a taunt WHILE transformed shows the Rose (pink-haired) sprite, not the base one, and never
  // hits the 128² FALLBACK box (getAction(skinAnim) has no base fallback). Repurposes the unused
  // goku_black_ssj_rose_idle_2 sheet (confident standing pose). 4×52 uniform (alpha-gutter-verified);
  // speed 27 → 108-frame window, matching the base taunt / Rick.
  taunt:     { frames: 4, width: 52,  height: 75, speed: 27, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./goku_black_ssj_rose_idle_2.png" },
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

// ─────────────────────────────────────────────────────────────────────────
// ITACHI — MANGEKYOU SHARINGAN  (continuous-drain BUFF mode)
// Same drain SHAPE as SSJ Rose (threshold-gated activation, per-frame drain via
// tickSustainedFormDrain, instant auto-revert at 0) — but a BUFF, NOT a sprite-swap:
// it does NOT set _skinAnim. The same character model renders throughout; the eyes
// are an OVERLAY (game.js drawMangekyouAura, drawn on top of the base sprite while
// active). Mangekyou is the hard gate that unlocks Amaterasu + Genjutsu (Stage 4).
// ─────────────────────────────────────────────────────────────────────────
const MANGEKYOU_THRESHOLD = 150             // energy ≥ 150 (75% of maxEnergy 200) — charge up to flip it on
const MANGEKYOU_DRAIN     = 0.28            // energy/frame while active (~16.8/s @60fps → ~9s from full, net vs regen)
const MANGEKYOU_MULT      = { dmg: 1.20, spd: 1.12, def: 1.06 }

export function isItachi(fighter) { return (fighter?.rosterKey || "").toLowerCase() === "itachi" }
export function isMangekyouActive(fighter) { return !!(fighter && fighter._mangekyouActive) }

// Enter Mangekyou. Gated: itachi, not already active, actionable, energy ≥ threshold. NO up-front
// spend (drain handles the cost). Sets the PUBLIC _mangekyouActive flag other systems read
// (Stage-4 Amaterasu/Genjutsu gate on it) + buff multipliers. Deliberately does NOT set _skinAnim
// (buff, not form-swap). teleportFlash gives the activation blink; _mangekyouFlash arms the eye overlay.
export function enterMangekyou(fighter) {
  if (!isItachi(fighter) || fighter._mangekyouActive) return false
  if ((fighter.attackCooldown || 0) > 0 || (fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0) return false
  if ((fighter.energy || 0) < MANGEKYOU_THRESHOLD) return false
  fighter._mangekyouActive  = true
  fighter.currentForm       = "mangekyou"     // HUD/state (base → mangekyou)
  fighter.damageMultiplier  = MANGEKYOU_MULT.dmg
  fighter.attackMultiplier  = MANGEKYOU_MULT.dmg
  fighter.speedMultiplier   = MANGEKYOU_MULT.spd
  fighter.defenseMultiplier = MANGEKYOU_MULT.def
  fighter.teleportFlash     = Math.max(fighter.teleportFlash || 0, 12)
  fighter._mangekyouFlash   = 40              // activation-flash overlay timer (frames)
  fighter.attackCooldown    = 10              // brief settle as the eyes ignite
  return true
}

// Revert to base: clear the flag + buff multipliers. Called by the drain auto-revert (energy 0),
// a manual re-tap, and round/KO resets. Mangekyou-gated specials stop firing the instant this runs.
export function revertMangekyou(fighter) {
  if (!fighter || !fighter._mangekyouActive) return
  fighter._mangekyouActive  = false
  fighter.currentForm       = "base"
  fighter.damageMultiplier  = 1
  fighter.attackMultiplier  = 1
  fighter.speedMultiplier   = 1
  fighter.defenseMultiplier = 1
}

// P-tap toggle: enter if base + at threshold; manual revert if already active (mirrors toggleSSJRose).
export function toggleMangekyou(fighter) {
  if (!isItachi(fighter)) return false
  if (fighter._mangekyouActive) { revertMangekyou(fighter); return true }
  return enterMangekyou(fighter)
}

// Per-frame hook (updateFighterState): continuous drain + instant auto-revert at 0.
export function applyMangekyouSystem(fighter) {
  if (!isItachi(fighter)) return
  if (fighter._mangekyouFlash > 0) fighter._mangekyouFlash--
  tickSustainedFormDrain(fighter, {
    active: f => !!f._mangekyouActive,
    drainPerFrame: MANGEKYOU_DRAIN,
    revert: revertMangekyou
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

// ── GOKU BLACK — SWORD SLASH (Rose-only ULTIMATE, full freeze CINEMATIC) ─────────────────
// A frozen combat cinematic reusing the SAME architecture as Kurama's Tailed Beast Bomb and Goku
// Black's own SSJ Rose transform (see gokuBlackSwordCinematic.js — activate/isActive/update/draw/
// clear, updateBattle freezes around it). BOTH fighters stay framed (camera.focusBetween, the Kurama
// TBB framing) since the slash lands ON the opponent. Rose-form ONLY (the art exists only transformed).
//
// DESIGN CHANGE (intentional, accepted): a full freeze means the opponent CANNOT act, so the old
// "vulnerable windup, opponent can interrupt him" + reaction-window logic is GONE. The PAYOFF is
// unchanged — the same SWORD constants (110 dmg / 20% block ratio / 30f paralysis), applied at the
// STRIKE connect beat via the cinematic's onImpact callback.
const SWORD = { cost: 40, dmg: 110, blockRatio: 0.20, paralysis: 30 }

function executeGokuBlackUltimate(fighter, context) {
  if (!isGokuBlack(fighter)) return false
  if (!fighter._ssjRoseActive) return false                 // ROSE-ONLY — disabled in base form
  if (isGokuBlackSwordCinematicActive()) return false       // already mid-cinematic
  if (!spendEnergy(fighter, SWORD.cost)) return false
  const opp = getTargetResolver(context)(fighter)
  fighter.vx = 0
  // The cinematic sets the caster's sword pose, drives the camera (both fighters framed), fires the
  // voice line at the connect, and calls onImpact to apply the guaranteed damage/paralysis.
  activateGokuBlackSwordCinematic(fighter, opp, (cineCtx) => applySwordSlashDamage(fighter, opp, cineCtx))
  return true
}

// PAYOFF (unchanged SWORD constants): a GUARANTEED, range-independent slash. A held block (frozen at
// its pre-cinematic value, like Kurama's TBB) CHIPS it to 20%; a clean hit paralyses for 30f. Applied
// once at the STRIKE connect beat by the cinematic.
function applySwordSlashDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = SWORD.dmg
  if (blocked) {
    dmg = Math.round(dmg * SWORD.blockRatio)
    opp.blockstun = Math.max(opp.blockstun || 0, 16)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, SWORD.paralysis)   // PARALYSIS beat (ticks down after the freeze)
    opp.stun    = Math.max(opp.stun || 0, SWORD.paralysis)
    opp.vx = 0; opp.colorFlash = 10; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (Kurama sure-hit)
  // Push ONE hit spark carrying the damage — the shared hitSparks processor spawns the floating damage
  // number + records the hit from it (same path Kurama uses), so we never hand-roll or double-count it.
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 18, maxTimer: 18,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#ff5db1",
      damage: dmg, lines: blocked ? 6 : 12, radius: blocked ? 14 : 36,
      ...(blocked ? { isBlocking: true } : {})
    })
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
