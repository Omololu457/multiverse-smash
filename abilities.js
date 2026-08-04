// abilities.js
// Central ability system — specials, ultimates, transformations, projectiles, summons.
// Each of the 7 starter characters has a fully implemented unique kit.

import { characters } from "./characters.js"
import { moveset }    from "./moveset.js"
import { sound }      from "./sound.js"
import { pickItachiVoice } from "./itachiVoice.js"   // Itachi cast voice lines (audio-only)
import { activateDomain } from "./domains.js"   // domains.js doesn't import abilities.js → no cycle
import { activateKuramaUltimate } from "./kurama.js"   // Naruto ult cinematic (kurama.js imports neither → no cycle)
import { activateMinatoKurama } from "./minatoKurama.js"   // Minato ult cinematic (self-contained, no cycle)
import { activateEdoTenseiCinematic, isEdoTenseiCinematicActive } from "./tobiramaEdoTenseiCinematic.js"   // Tobirama Edo Tensei summon/un-summon cinematic (no cycle: it imports only characters/sound)
import { activateChrolloSkillHunterCinematic, isChrolloSkillHunterCinematicActive } from "./chrolloSkillHunterCinematic.js"   // Chrollo Skill Hunter transform cinematic (swap fires at reveal beat via onResolve)
import { clearInputBuffer } from "./input.js"   // clear buffered presses when Edo Tensei swaps bodies (input.js imports nothing → no cycle)
import { activateSasukeEyesCinematic } from "./sasukeCinematic.js"   // Sasuke Susanoo Lv2 escalation cinematic (no cycle)
import { activateSSJRoseCinematic, isSSJRoseCinematicActive } from "./ssjRoseCinematic.js"   // Goku Black SSJ Rose transform cinematic (no cycle)
import { activateGokuBlackSwordCinematic, isGokuBlackSwordCinematicActive } from "./gokuBlackSwordCinematic.js"   // Goku Black Sword Slash freeze cinematic (no cycle)
import { activateVegetaFinalFlashCinematic, isVegetaFinalFlashCinematicActive } from "./vegetaFinalFlashCinematic.js"   // Vegeta Overcharged Final Flash ultimate cinematic (no cycle)
import { activateBeerusKiBallCinematic, isBeerusKiBallCinematicActive } from "./beerusKiBallCinematic.js"   // Beerus Ki Ball ultimate cinematic (no cycle)
import { activateBen10OmnitrixCinematic, isBen10OmnitrixCinematicActive } from "./ben10OmnitrixCinematic.js"   // Ben 10 Omnitrix-transform ultimate cinematic (no cycle)
import { activateMakiShibuyaCinematic, isMakiShibuyaCinematicActive } from "./makiShibuyaCinematic.js"   // Maki HP-threshold Shibuya-Arc transform cinematic (no cycle)
import { activateBatmanDarkKnightCinematic, isBatmanDarkKnightCinematicActive } from "./batmanDarkKnightCinematic.js"   // Batman "The Dark Knight" batarang-barrage ultimate cinematic (no cycle)
import { activateOmniManBodySlamCinematic, isOmniManBodySlamCinematicActive } from "./omnimanBodySlamCinematic.js"   // Omni-Man "Viltrumite Onslaught" body-slam ultimate cinematic (no cycle)
import { activateSupermanUltimateCinematic, isSupermanUltimateCinematicActive } from "./supermanUltimateCinematic.js"   // Superman "Solar Overload" ultimate cinematic (no cycle)
import { activateRengokuFlameExplosionCinematic, isRengokuFlameExplosionCinematicActive } from "./rengokuFlameExplosionCinematic.js"   // Rengoku "Flame Explosion" ultimate cinematic (no cycle)
import { activateMiwaUltimateCinematic, isMiwaUltimateCinematicActive } from "./miwaUltimateCinematic.js"   // Miwa "Blade of the Neophyte" battojutsu-slash ultimate cinematic (no cycle)
import { activateSamuraiFlameSmasherCinematic, isSamuraiFlameSmasherCinematicActive } from "./samuraiFlameSmasherCinematic.js"   // Samurai Red Ranger "Fire Smasher: Blazing Strike" tier-scaling ultimate cinematic (no cycle)
import { activateShinobuButterflyCinematic, isShinobuButterflyCinematicActive } from "./shinobuButterflyCinematic.js"   // Shinobu "Butterfly Dance" ultimate cinematic (no cycle)
import { activateGhostfaceFinalActCinematic, isGhostfaceFinalActCinematicActive } from "./ghostfaceFinalActCinematic.js"   // Ghostface "The Final Act" stab-flurry ultimate cinematic (no cycle)
import { activateKilluaGodspeedCinematic, isKilluaGodspeedCinematicActive } from "./killuaGodspeedCinematic.js"   // Killua Godspeed activation cinematic (no cycle)
import { activateFlashTimeCinematic, isFlashTimeCinematicActive } from "./flashTimeCinematic.js"   // Flash — Flash Time activation cinematic (no cycle; mirrors Godspeed)
import { activateGonAdultFormCinematic, isGonAdultFormCinematicActive } from "./gonAdultFormCinematic.js"   // Gon Adult Form activation cinematic (no cycle; mirrors Godspeed)
import { activateHisokaOverdriveCinematic, isHisokaOverdriveCinematicActive } from "./hisokaOverdriveCinematic.js"   // Hisoka Bloodlust Overdrive activation cinematic (no cycle; mirrors Godspeed)
import { resolveGrab, GLOBAL_DAMAGE_SCALE, rekkaContinue } from "./combat.js"   // shared grab pipeline + the one damage-scale lever + the shared command-normal cancel gate (combat.js doesn't import abilities.js → no cycle)
import { isBetaUnlocked } from "./progression.js"   // beta-only single-direction input simplification (progression.js imports only account.js → no cycle)
import { getSkin } from "./skins.js"   // Ghostface Companion Swap applies each companion's "_crew" affiliation skin (skins.js imports only characters/progression/manifest → no cycle)
import { detectMotion, clearMotionHistory } from "./motionInput.js"   // classic motion-input engine (Naruto-universe elevated specials; motionInput.js imports nothing → no cycle)
import { pickRickVoice } from "./rickVoice.js"   // Rick special-cast voice pools (audio-only; no cycle)
import { pickKilluaVoice } from "./killuaVoice.js"   // Killua special/ultimate cast voice pools (audio-only; no cycle)
import { pickGonVoice, GON_FINAL_BLOW_SFX } from "./gonVoice.js"   // Gon Jajanken/rekka/Final-Blow cast voice pools (audio-only; no cycle)
import { pickHisokaVoice } from "./hisokaVoice.js"   // Hisoka Bungee-Gum/Texture-Surprise/Overdrive/rekka cast voice pools (audio-only; no cycle)
import { pickMinatoVoice } from "./minatoVoice.js"   // Minato cast voice pools (Rasengan/Flying-Raijin/Reaper/Kurama; audio-only, no cycle)
import { pickOmniManVoice } from "./omnimanVoice.js"   // Omni-Man special/flight/ultimate cast voice pool (audio-only; no cycle)
import { pickSupermanVoice } from "./supermanVoice.js"   // Superman special/flight/mode/ultimate cast voice pool (audio-only; no cycle)
import { pickTobiramaVoice } from "./tobiramaVoice.js"   // Tobirama cast/ultimate voice pools (audio-only; no cycle)
import { pickSkinVoice } from "./gojoVoice.js"                    // per-skin voice override (Gojo "Limitless" young pack)
import { pickZenitsuVoice } from "./zenitsuVoice.js"             // Zenitsu Thunder-Breathing / Double-Attack / ultimate cast voice pools (audio-only)
import { pickRengokuVoice } from "./rengokuVoice.js"            // Rengoku form-callout / concentration / ultimate cast voice pools (audio-only)
import { pickShinobuVoice } from "./shinobuVoice.js"            // Shinobu poison/dance-cast + ultimate-windup cast voice pools (audio-only)
import { pickSamuraiVoice } from "./samuraiRedVoice.js"         // Samurai Red Ranger mega/special/finisher/ultimate cast voice pools (audio-only)
import { pickGoldSamuraiVoice } from "./goldSamuraiRangerVoice.js"   // Gold Samurai Ranger transform/barracuda/fox-claw cast voice pools (audio-only)
import { pickVegetaVoice } from "./vegetaVoice.js"              // Vegeta Galick/BigBang/FinalFlash/ultimate cast voice pools (audio-only; shared across base/SSJ/Blue)
import { pickMakiVoice } from "./makiVoice.js"                 // Maki kunai/nunchaku/powerCharge/shibuya-activation cast voice pools (audio-only, JP dub)
import { pickChrolloVoice } from "./chrolloVoice.js"            // Chrollo Skill Hunter ULTIMATE-activation cast voice pool (audio-only; fires once at transform beat)
import { pickGhostfaceVoice } from "./ghostfaceVoice.js"        // Ghostface knife-special + ultimate cast voice pool (audio-only)
import {
  activeSummons, spawnSummon as spawnAssistSummon,
  summonShadowClone, dispelShadowClones, countShadowClones,
  spawnShadowClone,      // direct clone spawn with optional position override (Minato Flying Raijin Clones spawn AT marks)
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
const NARUTO_KURAMA_RECAST_FRAMES = 2400   // 40s — Naruto-only premium lockout after the Tailed Beast Bomb (2× the universal 20s). Retuned from 80s: at 80s the TBB's damage-per-cooldown (7.5 raw/s) sat BELOW Rick/Sasuke ults despite being the roster's hardest single hit — "feels nerfed". 40s puts it at 15 raw/s ≈ Sasuke Susanoo's 15.1 (dead in line with the pack's premium ult, not an outlier either way). Damage kept at 600 (already highest per-cast). See BALANCE_AUDIT.md §Naruto-ult-retune.
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
  minato: { F: ["D", "F"], B: ["D", "B"], U: ["B", "U"], N: ["B", "F"], D: ["D"] },               // F=Clone Spawn · B=Clone Dispel · U=Pincer Rendan(sub) · N=Clone Rush(sub, B→F avoids the dashTeleport F→F) · D=(S5) · neutral=Clone Barrage / (S4 Flying Raijin)
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
    radius:     (moveData.radius != null) ? moveData.radius : width / 2,
    // OPTIONAL procedural placeholder-FX selector (Tobirama Stage 4): "water" | "dark" | "waterwall".
    // ui.drawProjectiles renders a code-drawn effect for it; a real `sheet` later takes precedence.
    drawKind:   moveData.drawKind   || null,
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
    // OPTIONAL owner-flag set on a clean connect (resolveProjectileHitsMulti): the name of a boolean
    // field to set TRUE on this projectile's owner when it lands a hit. Powers Saiki's projectile
    // rekka cancel-on-hit gate (hitFlag: "_cmdHitLanded"). Null for ordinary projectiles.
    hitFlag:    moveData.hitFlag    || null,
    // OPTIONAL hit-stop control (combat.getProjectileHitstopFrames): `hitstop` is a
    // numeric per-projectile freeze override; `noHitstop:true` opts a rapid multi-hit /
    // DOT projectile out of the shared projectile freeze so it doesn't stutter. Absent →
    // the tier default (HITSTOP.projectile, or .special/.ultimate via isSpecial/isUltimate).
    hitstop:    (typeof moveData.hitstop === "number") ? moveData.hitstop : undefined,
    noHitstop:  moveData.noHitstop  || false,
    isSpecial:  moveData.isSpecial  || false,
    isUltimate: moveData.isUltimate || false,
    // Pure-visual projectiles (e.g. an in-place AOE ring bloom): skipped by hit
    // resolution so they never stun/despawn on contact — they fade out via lifetime.
    visualOnly: moveData.visualOnly || false,
    // BOOMERANG (Killua's yo-yo): fly OUT to `maxRange` from the owner then RETRACT — homing back
    // to the owner at `retractSpeed`, despawning on pickup (combat.updateProjectiles). On contact it
    // flips to `returning` instead of despawning (resolveProjectileHitsMulti). No-op unless set.
    boomerang:    moveData.boomerang    || false,
    maxRange:     moveData.maxRange     || null,
    retractSpeed: moveData.retractSpeed || null,
    returning:    false
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
    if (!(fighter._atkVoiceCd > 0)) { try { sound.playSfxFile?.(pickVegetaVoice("galickGun"), null); fighter._atkVoiceCd = 150 } catch (_) {} }   // Galick Gun cast line (audio-only)
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
    if (!(fighter._atkVoiceCd > 0)) { try { sound.playSfxFile?.(pickVegetaVoice("finalFlash"), null); fighter._atkVoiceCd = 150 } catch (_) {} }   // Final Flash cast line (audio-only)
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
  if (!(fighter._atkVoiceCd > 0)) { try { sound.playSfxFile?.(pickVegetaVoice("bigBang"), null); fighter._atkVoiceCd = 150 } catch (_) {} }   // Big Bang Attack cast line (audio-only)
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
  try { sound.playSfxFile?.(pickVegetaVoice("ultimate"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // Overcharged Final Flash cast line (audio-only; _atkVoiceCd stops the connect-bark double)
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
// BATMAN — "The Dark Knight" ULTIMATE (Stage 4). A frozen cinematic BATARANG BARRAGE built on the
// SAME shared freeze architecture as Beerus (batmanDarkKnightCinematic.js). Chosen as the LARGEST /
// most elaborate sequence in the batch (batman_baterang_combo_throws, 14f) per the asset-map flag —
// which coincides with the design brief's barrage FALLBACK. Full Gadget meter; the guaranteed damage
// lands at the barrage-connect beat via onImpact. A held block chips it (Beerus/Kurama sure-hit shape).
// ─────────────────────────────────────────────────────────────────────────
const BATMAN_ULT = { cost: 100, dmg: 300, blockRatio: 0.25 }   // full Gadget meter (maxEnergy 100)
function executeBatmanUltimate(fighter, context) {
  if ((fighter.rosterKey || "").toLowerCase() !== "batman") return false
  if (isBatmanDarkKnightCinematicActive()) return false            // already mid-cinematic
  if (!spendEnergy(fighter, BATMAN_ULT.cost)) return false
  const opp = getTargetResolver(context)(fighter)
  fighter.vx = 0
  activateBatmanDarkKnightCinematic(fighter, opp, (cineCtx) => applyBatmanDarkKnightDamage(fighter, opp, cineCtx))
  return true
}

// PAYOFF: a GUARANTEED, range-independent batarang barrage. A held block (frozen at its pre-cinematic
// value) chips it to 25%; a clean hit deals the full ~300 + a big stagger. Applied once at the connect beat.
function applyBatmanDarkKnightDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = BATMAN_ULT.dmg
  if (blocked) {
    dmg = Math.round(dmg * BATMAN_ULT.blockRatio)
    opp.blockstun = Math.max(opp.blockstun || 0, 18)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 28)
    opp.vx = fighter.facing * 14; opp.vy = -6
    opp.colorFlash = 12; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 20, maxTimer: 20,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#9fb6ff",
      damage: dmg, lines: blocked ? 6 : 16, radius: blocked ? 14 : 40,
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

// ── FORM-AWARE RECOLOR (alt-color skins, "all forms" option) ──────────────────────────────────
// When a fighter wearing a recolor skin transforms, its form art (Vegeta SSJ/Blue, Goku Black Rose)
// must ALSO carry the alt colour. applySkin() stamps fighter._recolorTag (the skin's tag) + stashes
// the recoloured BASE anim on fighter._baseSkinAnim. On transform we retag the form const to
// __<tag>.png sheets (which gen_alt_skins.mjs produced for the form sheets); on revert we restore
// the recoloured base (not null) so the alt colour persists. No tag → canonical art, unchanged.
// Purely cosmetic — sheet paths only. Memoised per (anim, tag).
const _formTagCache = new WeakMap()
function retagFormAnim(anim, tag) {
  if (!tag || !anim) return anim
  let byTag = _formTagCache.get(anim); if (!byTag) { byTag = new Map(); _formTagCache.set(anim, byTag) }
  if (byTag.has(tag)) return byTag.get(tag)
  const out = {}
  for (const [k, d] of Object.entries(anim)) out[k] = d?.sheet ? { ...d, sheet: d.sheet.replace(/\.(png|jpe?g)$/i, `__${tag}.png`) } : d
  byTag.set(tag, out); return out
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
  fighter._skinAnim         = retagFormAnim(VEGETA_SSJ_ANIM, fighter._recolorTag)   // form-swap (+alt recolor if any)
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
  fighter._skinAnim         = fighter._baseSkinAnim || null   // restore recoloured base (not canonical) if alt-skinned
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
  // GAP CLOSED (QOL cosmetic pass): tiers 2/3 previously fell through to SSJ GOLD in Blue. The unwired
  // cyan sheet `vegeta_blue_up_attack.png` (up_attack, distinct from up_attack_2) was on disk — RE-SLICED
  // to `vegeta_blue_up_attack_uniform.png` {7,51,69} and wired to vgUpT2. vgUpT3 (super_up launcher finisher)
  // reuses the Blue launcher pose `up_uniform` (both are launchers) — all three tiers now render cyan, no gold.
  vgUpT1:   { frames: 9,  width: 57, height: 72, speed: 3, anchorY: 0, sheet: "./vegeta_blue_up_uniform.png" },
  vgUpT2:   { frames: 7,  width: 51, height: 69, speed: 3, anchorY: 0, sheet: "./vegeta_blue_up_attack_uniform.png" },
  vgUpT3:   { frames: 9,  width: 57, height: 72, speed: 3, anchorY: 0, sheet: "./vegeta_blue_up_uniform.png" },
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
  fighter._skinAnim         = retagFormAnim(VEGETA_BLUE_ANIM, fighter._recolorTag)
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
  fighter._skinAnim         = fighter._baseSkinAnim || null
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
    // FX sheet is overridable so each summoner's clones render their own hit (default = Naruto's
    // Rasengan sphere; Minato passes his kunai). Frame dims default to the Rasengan strip's 4×64×85.
    sheet: opts.sheet || "./naruto_kcm_fx_rasengan_sphere.png",
    spriteFrames: opts.spriteFrames || 4, spriteW: opts.spriteW || 64, spriteH: opts.spriteH || 85,
    spriteSpeed: opts.spriteSpeed || 4, spriteScale: opts.spriteScale || 0.55
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

// ELEVATED (motion-input) — UZUMAKI BARRAGE. A double-quarter-circle-forward (↓→↓→) + Special
// summons a momentary clone swarm that pummels the target with a guaranteed flurry capped by a
// launcher. It is CLONE-INDEPENDENT by design (a pure execution reward for the hard input), which
// is exactly what keeps it distinct from — and additive to — the three clone-COUNT Barrage routes
// (#16 2-clone / #19 3-clone / contextual Down finisher). Chakra-gated (60); returns false if the
// gate fails so the caller can fall through to the normal special routes. Reuses the shared
// guaranteed-hit + delayed-spawn primitives (spawnGuaranteedCloneHit / schedulePendingSpawn), the
// same building blocks the clone barrages use.
const NARUTO_UZUMAKI_BARRAGE_COST = 60
function executeNarutoUzumakiBarrage(fighter, context, target) {
  if (!target) return false
  if (!spendEnergy(fighter, NARUTO_UZUMAKI_BARRAGE_COST)) return false
  sound.playSfxFile("naruto_shadow_clone_special.mp3", null)   // VOICE: "Naruto 2000-Hit Combo!" — reused for the clone-swarm flurry
  // A short lunge into the target so the swarm reads as an on-point pummel (not a ranged throw).
  fighter.vx = fighter.facing * 6
  fighter._spriteCastMove = "rasengan_cast"; fighter._spriteCastTimer = 32
  // FLURRY: five rapid guaranteed strikes (clone swarm), then a LAUNCHER finisher. Guaranteed hits
  // overlap the target on spawn so the whole barrage connects on a successful read; combo decay keeps
  // the effective total in a fair band despite the raw sum.
  ;[2, 8, 14, 20, 26].forEach((delay) => schedulePendingSpawn(delay, () => {
    spawnGuaranteedCloneHit(fighter, target, "rasengan",
      { damage: 42, hitstun: 14, knockbackX: 3, knockbackY: -1, dirSign: fighter.facing, spriteScale: 0.42, lifetime: 10 }, context)
    shakeCamera(context, 3, 3)
  }))
  schedulePendingSpawn(34, () => {   // LAUNCHER cap — pops the target up-and-away
    spawnGuaranteedCloneHit(fighter, target, "rasengan",
      { damage: 95, hitstun: 28, knockbackX: 9, knockbackY: -9, dirSign: fighter.facing, spriteScale: 0.6, lifetime: 14 }, context)
    shakeCamera(context, 7, 7)
  })
  fighter.attackCooldown = getAttackDuration(30, fighter)
  focusCameraOnAction(context, fighter, target, 0.97, 10)
  return true
}

// ELEVATED (motion-input) — SHURIKEN-HIDDEN CLONE TECHNIQUE. A double-quarter-circle-back
// (↓←↓←) + Special throws what reads as a single ordinary projectile (the decoy shuriken/kunai),
// but a clone is HIDDEN with it: a beat later it poofs in and strikes — a delayed second threat.
// SHARED by Naruto and Minato (per-owner projectile art below); the reveal reuses the established
// "clone poofs in and hits" idiom (spawnClonePuff + spawnGuaranteedCloneHit) the clone barrages use.
// The reveal is a deterministic timed spawn (fires whether the decoy HIT or MISSED), rather than the
// miss-only projectile onExpire hook, so the hidden clone is a reliable follow-up. Chakra-gated;
// returns false on a failed gate so the caller falls through.
const SHURIKEN_CLONE_COST = 35
// Per-owner decoy look. Naruto reuses the generic spinning-shuriken art (sasuke_shuriken.png — a
// character-agnostic ninja tool; FLAGGED as shared cross-char art, no Naruto-native shuriken exists);
// Minato throws his signature kunai (MINATO_CLONE_FX). The reveal STRIKE FX mirrors each owner's
// clone-hit look (Naruto = default Rasengan sphere; Minato = kunai).
function shurikenCloneConfig(key) {
  if (key === "naruto") return {
    cast: "rasengan_cast",
    proj: { sheet: "./sasuke_shuriken.png", spriteFrames: 3, spriteW: 52, spriteH: 54, spriteSpeed: 2, spriteScale: 0.8, color: "#d7ecff", w: 26, h: 26 },
    hit:  { spriteScale: 0.5 }
  }
  if (key === "minato") return {
    cast: "minatoCloneCast",
    proj: { ...MINATO_CLONE_FX, color: "#facc15", w: 26, h: 16 },
    hit:  { ...MINATO_CLONE_FX }
  }
  return null
}
function fireShurikenHiddenClone(fighter, context, target) {
  if (!target) return false
  const key = (fighter.rosterKey || "").toLowerCase()
  const cfg = shurikenCloneConfig(key)
  if (!cfg) return false
  if (!spendEnergy(fighter, SHURIKEN_CLONE_COST)) return false
  const face = fighter.facing
  fighter._spriteCastMove  = cfg.cast
  fighter._spriteCastTimer = 16
  // The VISIBLE single projectile — an ordinary-looking thrown weapon (the decoy).
  spawnProjectile(fighter, key + "HiddenShuriken", {
    damage: 40, speed: 15, lifetime: 60, hitstun: 14, knockbackX: 5, knockbackY: 0,
    spawnY: (fighter.y || 0) + (fighter.h || 100) * 0.4, aimAt: _oppCenter(target),
    ...cfg.proj
  }, context)
  // HIDDEN CLONE reveal — a beat later (as the shuriken reaches the target) it poofs in and strikes.
  schedulePendingSpawn(16, () => {
    spawnClonePuff(target.x + (target.w || 0) / 2, target.y + (target.h || 100) * 0.4)
    spawnGuaranteedCloneHit(fighter, target, key + "HiddenCloneHit",
      { damage: 72, hitstun: 20, knockbackX: 8, knockbackY: -4, dirSign: face, ...cfg.hit }, context)
    shakeCamera(context, 5, 5)
  })
  fighter.attackCooldown = getAttackDuration(20, fighter)
  focusCameraOnAction(context, fighter, target, 0.99, 8)
  return true
}

function executeNarutoSpecial(fighter, context) {
  const dirs = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  // ELEVATED motion-input route — SHURIKEN-HIDDEN CLONE (double-QCB ↓←↓←). Checked before the
  // single-QCB (D→B) clone-dispel below; a double needs 4 tokens so a single ↓← still dispels.
  // Falls through on a failed gate (→ dispel), keeping the existing route intact.
  if (detectMotion(fighter, "doubleQcb")) {
    if (fireShurikenHiddenClone(fighter, context, target)) { clearMotionHistory(fighter); return true }
  }

  // ELEVATED motion-input route — checked FIRST so a double-QCF history [D,F,D,F] cannot fall
  // through to the single-QCF (D→F) shadow-clone spawn below. Clone-independent; on a failed gate
  // (e.g. not enough chakra) it falls through untouched, so every existing route is preserved.
  if (detectMotion(fighter, "doubleQcf")) {
    if (executeNarutoUzumakiBarrage(fighter, context, target)) { clearMotionHistory(fighter); return true }
  }

  // TRANSFORMATION JUTSU — Tier 1 Disguise (→↓←) / Tier 2 Full Copy (→↓→). Motion-input, additive;
  // shared dispatcher (same call is added to the other 4 chars in Stage 4). Falls through on a failed gate.
  if (tryTransformJutsu(fighter, context)) return true

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

  // CLONE RUSH / KAGE ASSAULT (SETPLAY) — F→F (double-tap toward the opponent) + Special with
  // at least one clone placed, BELOW shroud stage 3 (at stage 3+ the F→F slot is the chakra-arm
  // grab above, which is checked first). Every live clone is launched on ONE AUTONOMOUS rush-
  // strike then despawns — staggered a beat apart so Naruto stays free (short recovery) to play
  // neutral / cover his approach while the clones close in. UNLIKE the instant Rasengan Barrage
  // (#16/#19, guaranteed same-frame orbs), each rusher physically travels and is reactable /
  // blockable — this is the okizeme/setplay tool, not a combo confirm. Cost = the popped clone
  // shares (consumeShadowClones is lossy, like a clone destroyed in combat); no meter on top.
  // Reuses the shikigami rush→one-hit→despawn summon (narutoCloneRush template).
  if (endsWithPattern(dirs, ["F", "F"]) && countShadowClones(fighter) >= 1) {
    const spots = consumeShadowClones(fighter, 3)   // all live clones (up to 3) become rushers
    spots.forEach((spot, i) => {
      const rusher = spawnAssistSummon(fighter, "narutoCloneRush", target)
      if (rusher) {
        rusher.x = spot.x; rusher.y = spot.y        // launch from where the clone was standing
        rusher.spawnBeat   = i * 12                  // staggered launch — each rushes a beat later
        rusher.attackTimer = -i * 12                 // stagger their first strike window to match
      }
    })
    sound.playSfxFile?.("naruto_shadow_clone_special.mp3", null)   // "Naruto 2000-Hit Combo!"
    fighter._spriteCastMove  = "rasengan_cast"       // brief command-gesture pose
    fighter._spriteCastTimer = 16
    fighter.attackCooldown   = getAttackDuration(14, fighter)   // SHORT — free to move as they rush
    focusCameraOnAction(context, fighter, target, 0.99, 8)
    shakeCamera(context, 4, 4)
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

    // CLONE UZUMAKI BARRAGE — hard-knockdown FINISHER (contextual). ONLY when the opponent is
    // ALREADY in hitstun (mid-combo) AND ≥2 clones are in reserve does Down+Special become the
    // clone-slam ender; otherwise it stays the normal Dark Rasengan below (zero change to that
    // move's neutral use). Pops the clones for a rapid guaranteed flurry that CAPS with a
    // downward slam (positive knockbackY floors them), a dedicated combo ender matching the
    // "2000-Hit Combo" flavor. DELIBERATELY does NOT touch knockdownState (goku_black-only,
    // softlock-guarded in combat.js) — the knockdown is expressed via strong down+away knockback
    // and long hitstun, the same way every other non-goku_black hard hit reads as a floor.
    // Damage kept below Full Rasengan Barrage #19 (this is a decayed combo tail): 2 clones =
    // 45+90 = 135 RAW, 3 clones = 45+45+90 = 180 RAW (×0.60 global → ~81 / 108 EFF).
    if ((target?.hitstun || 0) > 0 && countShadowClones(fighter) >= 2) {
      const n = consumeShadowClones(fighter, 3).length   // pop all live clones (2 or 3)
      sound.playSfxFile("naruto_shadow_clone_special.mp3", null)   // VOICE: "Naruto 2000-Hit Combo!"
      for (let i = 0; i < n; i++) {
        const last = (i === n - 1)   // the final clone lands the slam
        schedulePendingSpawn(3 + i * 6, () => {
          spawnGuaranteedCloneHit(fighter, target, "rasengan", last
            ? { damage: 90, hitstun: 30, knockbackX: 8, knockbackY: 7,  dirSign: fighter.facing, w: 34, h: 34, spriteScale: 0.6 }   // SLAM down+away = knockdown cap
            : { damage: 45, hitstun: 20, knockbackX: 3, knockbackY: -3, dirSign: fighter.facing, spriteScale: 0.45 },              // brief link hits
            context)
          shakeCamera(context, last ? 9 : 4, last ? 8 : 4)
        })
      }
      fighter._spriteCastMove  = "rasengan_cast"
      fighter._spriteCastTimer = 24
      fighter.attackCooldown   = getAttackDuration(28, fighter)
      focusCameraOnAction(context, fighter, target, 0.97, 12)
      return true
    }

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

// ═══════════════════════════════════════════════════════════════════════════════
// MINATO SPECIAL — SHADOW CLONE SYSTEM (Stage 3), PORTED from Naruto's own routes.
// Same system, same rules (motions + clone-count gating), calling the SHARED summons.js
// primitives (summon/dispel/count/consume) and the SHARED combo helpers (spendCloneCombo-
// Chakra, spawnGuaranteedCloneHit, spawnAssistSummon, applyCloneRendanStorm). The ONLY
// Minato-specific bits: clone BODY art (per-owner in summons.js) and the guaranteed-hit FX
// = Minato's KUNAI (MINATO_CLONE_FX) instead of Naruto's Rasengan sphere. The 5 routes:
//   D→F  Clone Spawn      · D→B  Clone Dispel
//   F→F (≥1 clone) Clone Rush setplay (autonomous rushers)
//   B→U (≥2 clones) Pincer Rendan (front+back guaranteed juggle)
//   Down+Special (in hitstun, ≥2 clones) contextual Kunai-Barrage FINISHER (slam ender)
//   Neutral (≥2/≥3 clones) Kunai Barrage (2 or full 3-clone)
//   + Clone Rendan Storm (passive light-string extension — generalized in game.js).
// Slots NOT matched here (neutral with no clones, plain Down+Special) fall through to
// false, reserved for Flying Raijin (Stage 4) and Rasengan/Reaper (Stage 5).
// ═══════════════════════════════════════════════════════════════════════════════
const MINATO_CLONE_FX = { sheet: "./minato_kunai_projectile.png", spriteFrames: 1, spriteW: 30, spriteH: 15, spriteSpeed: 6, spriteScale: 1.6 }

// ── FLYING RAIJIN (Stage 4) — kunai throw → mark → teleport. The genuinely novel mechanic. ──
const MINATO_RAIJIN_COST     = 15
const MINATO_RAIJIN_MARK_CAP = 3

// Convert a MISSED Flying Raijin kunai into a tracked teleport MARK (rolling 3-cap: throwing a 4th
// drops the oldest). Called via the kunai projectile's onExpire (combat.updateProjectiles) — it
// fires ONLY on a whiff, because a kunai that CONNECTS is removed by the hit resolver (which never
// runs onExpire). So: hit = damage + vanish; miss = a mark. Auto-selects the freshly placed mark.
function placeFlyingRaijinMark(fighter, x) {
  if (!fighter) return
  fighter._frMarks = fighter._frMarks || []
  fighter._frMarks.push({ x, y: fighter.groundY ?? fighter.y })
  while (fighter._frMarks.length > MINATO_RAIJIN_MARK_CAP) fighter._frMarks.shift()   // rolling cap — oldest drops
  fighter._frSel = fighter._frMarks.length - 1                                        // newest becomes selected
}

// The kunai throw itself (neutral Special, outside any clone-barrage context). Small chakra cost.
// The mark/teleport/cycle wiring lives in game.js (teleportToFlyingRaijinMark on the F→F dash blink;
// Charge-tap cycles the selected mark) + ui.js (HUD 1/2/3 + world-space mark glyphs).
function fireFlyingRaijinKunai(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, MINATO_RAIJIN_COST)) return false
  const face = fighter.facing || 1
  fighter._spriteCastMove  = "minatoRush2"   // Yellow-Flash kunai-throw pose
  try { sound.playSfxFile?.(pickMinatoVoice("flyingRaijin"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: Flying Raijin cast
  fighter._spriteCastTimer = 16
  fighter.attackCooldown   = getAttackDuration(18, fighter)
  fighter.vx = face * 2
  const kunai = spawnProjectile(fighter, "minatoRaijinKunai", {
    ...MINATO_CLONE_FX, damage: 72, speed: 17, lifetime: 46, hitstun: 16, knockbackX: 6, knockbackY: -2,
    color: "#facc15", w: 30, h: 15, vx: face * 17, spawnY: fighter.y + (fighter.h || 100) * 0.42
  }, context)
  if (kunai) kunai.onExpire = (p) => placeFlyingRaijinMark(fighter, p.x)   // whiff → drops a teleport mark
  shakeCamera(context, 3, 3)
  return true
}

// ── RASENGAN (Stage 5) — Down+Special. Close-range dash-in RAM (never thrown), same shape as
// Naruto's neutral Rasengan: a short-reach melee hitbox + a spiral-orb FX riding the lunge. ──
function fireMinatoRasengan(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 30)) return false
  const face = fighter.facing || 1
  fighter._spriteCastMove = "minatoRasengan"; fighter._spriteCastTimer = 20
  try { sound.playSfxFile?.(pickMinatoVoice("rasengan"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: Rasengan cast
  const attack = createAttackFromMove(fighter, "minatoRasengan", {
    damage: 120, startup: 8, active: 5, recovery: 16, hitstun: 22, knockbackX: 9, knockbackY: -3, rangeX: 74, rangeY: 56, isSpecial: true
  })
  setAttackState(fighter, attack, 22)
  fighter.vx = face * 8   // dash in to close the gap (Dragon-Fist ram pattern)
  // ORB FX — the FULL Rasengan sphere sheet (minato_rasengan_orb = combo_effect_part_3: 4 solid
  // spheres + 4 spiral swirls). The old basic_rasengan_effect sheet was mostly tiny forming-dots so
  // the orb rendered as an invisible speck. Scale 0.42 on the 122px cell ≈ 51px on-screen = Naruto's
  // own Rasengan orb size (naruto_kcm_fx_rasengan_sphere 85px × 0.6 ≈ 51px).
  const orb = spawnProjectile(fighter, "minatoRasenganOrb", {
    damage: 0, speed: 0, lifetime: 22, w: 40, h: 40, visualOnly: true, color: "#38bdf8",
    sheet: "./minato_rasengan_orb_uniform.png", spriteFrames: 8, spriteW: 122, spriteH: 120, spriteSpeed: 3, spriteScale: 0.42
  }, context)
  if (orb) { orb.x = fighter.x + (face >= 0 ? fighter.w : 0); orb.y = fighter.y + (fighter.h || 100) * 0.4; orb.vx = face * 8 }
  focusCameraOnAction(context, fighter, getTargetResolver(context)(fighter), 0.99, 8)
  shakeCamera(context, 6, 6)
  return true
}

// ── BIG BALL RASENGAN (Stage 5) — charge held + Down+Special. The escalation: a larger, harder
// ram with the big-sphere FX (wider/taller hitbox, more damage/knockback). Same ram shape, bigger. ──
function fireMinatoBigBall(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 45)) return false
  const face = fighter.facing || 1
  fighter._spriteCastMove = "minatoRasengan"; fighter._spriteCastTimer = 26
  try { sound.playSfxFile?.(pickMinatoVoice("rasengan"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: Big Ball Rasengan cast
  const attack = createAttackFromMove(fighter, "minatoBigBall", {
    damage: 175, startup: 12, active: 6, recovery: 22, hitstun: 26, knockbackX: 12, knockbackY: -5, rangeX: 96, rangeY: 82, isSpecial: true
  })
  setAttackState(fighter, attack, 30)
  fighter.vx = face * 6
  const orb = spawnProjectile(fighter, "minatoBigBall", {
    damage: 0, speed: 0, lifetime: 28, w: 60, h: 60, visualOnly: true, color: "#38bdf8",
    sheet: "./minato_big_ball_uniform.png", spriteFrames: 3, spriteW: 334, spriteH: 129, spriteSpeed: 6, spriteScale: 0.42
  }, context)
  if (orb) { orb.x = fighter.x + (face >= 0 ? fighter.w : 0) + face * 24; orb.y = fighter.y + (fighter.h || 100) * 0.5; orb.vx = face * 6 }
  focusCameraOnAction(context, fighter, getTargetResolver(context)(fighter), 0.97, 10)
  shakeCamera(context, 10, 9)
  return true
}

// ── REAPER DEATH SEAL (Stage 5) — the SACRIFICE. Charge held + neutral Special. Costs HIGH chakra
// AND a REAL chunk of Minato's OWN HP, for a single devastating soul-rip hit. DELIBERATELY NOT
// match-ending (that instant-win lane belongs to Gon's Adult-Form Final Blow): it's a big — but
// blockable, range-gated — melee hit that a full-HP opponent survives, and it can NEVER self-KO
// (unavailable if the HP cost would drop Minato too low). raw 500 × 0.60 ≈ 300 EFF on a fresh hit —
// devastating (~26% of a 1150 bar) yet survivable. The Shinigami manifests behind Minato and its
// clawed arm rips forward (both visualOnly FX; the melee hitbox is the reach). Flagged in balance.
const MINATO_REAPER_CHAKRA  = 60
const MINATO_REAPER_HP_COST = 170
const MINATO_REAPER_REACH   = 250   // the GIANT Shinigami's arm reaches far across the arena
const MINATO_REAPER_RIP     = 250   // soul-rip damage applied on the grab (+ updateGrab's throw on top ≈ 300 total)
function fireReaperDeathSeal(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  // GATE: enough chakra AND enough HP that the self-cost can't kill him (never self-KO / match-ending).
  if ((fighter.energy || 0) < MINATO_REAPER_CHAKRA) return false
  if ((fighter.health || 0) <= MINATO_REAPER_HP_COST + 60) return false
  spendEnergy(fighter, MINATO_REAPER_CHAKRA)   // chakra spent on cast (whiff or not)
  const getOpponent = getTargetResolver(context)
  const target = getOpponent(fighter)
  const face = fighter.facing || 1
  fighter._spriteCastMove = "minatoReaperCast"; fighter._spriteCastTimer = 40

  // ── The GIANT Shinigami manifests CENTER-ARENA (between the fighters), towering over the field. ──
  const fCX = fighter.x + fighter.w / 2
  const tCX = target ? target.x + (target.w || 0) / 2 : fCX + face * 120
  const midX = (fCX + tCX) / 2
  const gy = fighter.y - (fighter.h || 100) * 0.85   // head high above the fighters
  const reaper = spawnProjectile(fighter, "minatoShinigami", {
    damage: 0, speed: 0, lifetime: 52, w: 200, h: 300, visualOnly: true, color: "#1f2937",
    sheet: "./minato_reaper_death_seal_summoning_uniform.png", spriteFrames: 2, spriteW: 251, spriteH: 328, spriteSpeed: 26, spriteScale: 1.5   // GIANT (≈490px tall)
  }, context)
  if (reaper) { reaper.x = midX; reaper.y = gy; reaper.vx = face * 0.01 }   // vx sign → draw faces the opponent (drawProjectiles flips on vx<0)
  // The clawed arm rips OUT toward the opponent (giant reach).
  const arm = spawnProjectile(fighter, "minatoReaperArm", {
    damage: 0, speed: 0, lifetime: 40, w: 160, h: 90, visualOnly: true, color: "#374151",
    sheet: "./minato_reaper_death_seal_summoning_arm_uniform.png", spriteFrames: 1, spriteW: 395, spriteH: 232, spriteSpeed: 6, spriteScale: 0.7
  }, context)
  if (arm) { arm.x = (midX + tCX) / 2; arm.y = fighter.y + (fighter.h || 100) * 0.1; arm.vx = face * 0.01 }
  // Ambient soul-flame FX on the target side.
  const flame = spawnProjectile(fighter, "minatoReaperFlame", {
    damage: 0, speed: 0, lifetime: 40, w: 30, h: 40, visualOnly: true, color: "#60a5fa",
    sheet: "./minato_reaper_death_seal_fire_uniform.png", spriteFrames: 3, spriteW: 18, spriteH: 33, spriteSpeed: 3, spriteScale: 2.0
  }, context)
  if (flame && target) { flame.x = tCX; flame.y = target.y + (target.h || 100) * 0.2 }

  focusCameraOnAction(context, fighter, target, 0.9, 22)
  shakeCamera(context, 16, 14)

  // ── The GRAB/THROW — the Shinigami seizes the opponent's soul. Long reach (250px). On a CLEAN grab
  // it applies the devastating soul-rip AND pays the real HP sacrifice; the shared updateGrab() then
  // does the pop-up-and-throw. A WHIFF (out of reach) costs only chakra + recovery — no HP sacrifice. ──
  const grabbed = resolveGrab(fighter, target, context, MINATO_REAPER_REACH)
  if (grabbed && target) {
    fighter.health = Math.max(1, fighter.health - MINATO_REAPER_HP_COST)   // REAL HP sacrifice, ONLY on connect (clamped — never lethal)
    target.health = Math.max(0, (target.health || 0) - MINATO_REAPER_RIP)  // soul-rip; updateGrab adds the throw on top
    target.colorFlash = 10
    fighter.attackCooldown = getAttackDuration(30, fighter)
    try { sound.playSfxFile?.(pickMinatoVoice("reaper"), null); fighter._atkVoiceCd = 150 } catch (_) {}    // VOICE: Reaper Death Seal — "I'll risk my life" (the HP-sacrifice)
  } else {
    // whiff: committed recovery, chakra already spent, but NO health sacrifice.
    fighter._spriteCastMove = "minatoReaperCast"; fighter._spriteCastTimer = 30
    fighter.attackCooldown = getAttackDuration(34, fighter)
  }
  return true
}

// ELEVATED (motion-input) — FLYING RAIJIN CLONES (Minato). A HALF-CIRCLE-FORWARD (←↓→) + Special,
// GATED on ≥1 placed Flying Raijin kunai mark: clones materialize AT the marks (via a yellow-flash
// teleport) rather than beside Minato, each delivering an arrival strike — tying the shadow-clone
// system directly into his signature mark mechanic. The marks are a spent resource (consumed on use).
// Returns false when no marks exist, so the caller falls through — additive, never blocking a base
// route. Reuses spawnShadowClone (positioned at the mark), the mark FX art, and the shared
// guaranteed-hit + puff primitives.
// MOTION CHOICE: HCF, NOT double-QCF. Minato's signature F→F double-tap TELEPORTS him to the selected
// mark (teleportToFlyingRaijinMark) — and this move requires a mark to exist — so a double-QCF's "→→"
// would blink him onto the mark mid-input and flip his facing. A half-circle has a single forward tap,
// so it never triggers the blink. (Naruto keeps double-QCF for Uzumaki Barrage; he has no F→F blink.)
const MINATO_RAIJIN_CLONES_COST = 40
function fireFlyingRaijinClones(fighter, context, target) {
  const marks = (fighter._frMarks || []).slice()
  if (!marks.length) return false                     // gate → fall through to normal clone spawn
  if (!spendEnergy(fighter, MINATO_RAIJIN_CLONES_COST)) return false
  const face = fighter.facing
  fighter._frMarks = []; fighter._frSel = 0           // consume the marks (spent resource)
  fighter._spriteCastMove = "minatoCloneCast"; fighter._spriteCastTimer = 18
  marks.forEach((mark, i) => schedulePendingSpawn(i * 5, () => {
    const my = mark.y ?? fighter.groundY ?? fighter.y
    spawnClonePuff(mark.x, my)                                                    // arrival poof AT the mark
    spawnProjectile(fighter, "minatoRaijinFlash", {                              // yellow flash-ring at the mark
      visualOnly: true, damage: 0, speed: 0, lifetime: 12, w: 40, h: 40, color: "#facc15",
      sheet: "./minato_yellow_flash_teleport.png", spriteFrames: 1, spriteScale: 1.0,
      spawnX: mark.x - 20, spawnY: my - 40
    }, context)
    spawnShadowClone(fighter, target, { x: mark.x - (fighter.w || 60) / 2, y: my })   // persistent clone body AT the mark (cap-limited)
    if (target) spawnGuaranteedCloneHit(fighter, target, "minatoKunai",           // the clone's arrival strike
      { ...MINATO_CLONE_FX, damage: 50, hitstun: 18, knockbackX: 6, knockbackY: -3, dirSign: face }, context)
    shakeCamera(context, 4, 4)
  }))
  fighter.attackCooldown = getAttackDuration(24, fighter)
  focusCameraOnAction(context, fighter, target, 0.98, 10)
  return true
}

function executeMinatoSpecial(fighter, context) {
  const dirs        = getRelativeDirections(fighter)
  const getOpponent = getTargetResolver(context)
  const target      = getOpponent(fighter)

  // TRANSFORMATION JUTSU — Tier 1 Disguise (→↓←) / Tier 2 Full Copy (←↓← for Minato, teleport-safe).
  if (tryTransformJutsu(fighter, context)) return true

  // ELEVATED motion-input route — SHURIKEN-HIDDEN CLONE (double-QCB ↓←↓←). Checked before the
  // single-QCB (D→B) clone-dispel below; a double needs 4 tokens so a single ↓← still dispels.
  if (detectMotion(fighter, "doubleQcb")) {
    if (fireShurikenHiddenClone(fighter, context, target)) { clearMotionHistory(fighter); return true }
  }

  // ELEVATED motion-input route — FLYING RAIJIN CLONES (half-circle-forward ←↓→), gated on ≥1 kunai
  // mark. HCF (not double-QCF) so the input never contains a forward double-tap, which would otherwise
  // trigger Minato's F→F teleport-to-mark blink mid-motion. With no marks it falls through so the base
  // routes (B→F clone rush / D→F spawn) are untouched.
  if (detectMotion(fighter, "hcf")) {
    if (fireFlyingRaijinClones(fighter, context, target)) { clearMotionHistory(fighter); return true }
  }

  // D→F = SHADOW CLONE spawn (cap 3; over cap → no-op). No upfront chakra — cost is the pool split.
  if (endsWithPattern(dirs, ["D", "F"])) {
    if (!summonShadowClone(fighter, target, { onFocus: () => focusCameraOnAction(context, fighter, null, 1.02, 12) })) return false
    // CASTER performs the summon hand-sign (minatoCloneCast = the shadow_clone_justu gesture). Previously
    // this gesture art was (wrongly) the clone BODY, so the clones performed it and Minato did nothing;
    // now the gesture plays on Minato and the clones stand in their own idle (summons.js CLONE_BODY_SETS).
    fighter._spriteCastMove  = "minatoCloneCast"
    fighter._spriteCastTimer = 16
    fighter.attackCooldown = getAttackDuration(16, fighter)
    shakeCamera(context, 5, 5)
    return true
  }

  // D→B = DISPEL all clones (safe recall — shares fold back, non-lossy).
  if (endsWithPattern(dirs, ["D", "B"])) {
    if (!dispelShadowClones(fighter)) return false
    fighter.attackCooldown = getAttackDuration(10, fighter)
    return true
  }

  // B→F (≥1 clone) = CLONE RUSH / setplay. Every live clone becomes ONE autonomous rush-strike
  // then despawns, staggered a beat apart so Minato stays free. Reactable/blockable (not a confirm).
  // NOTE: uses B→F (step-back→forward), NOT Naruto's F→F — Minato's F→F double-tap is his
  // Flying-Raijin dashTeleport blink (Stage 1), which would eat the input and flip facing.
  if (endsWithPattern(dirs, ["B", "F"]) && countShadowClones(fighter) >= 1) {
    const spots = consumeShadowClones(fighter, 3)
    spots.forEach((spot, i) => {
      const rusher = spawnAssistSummon(fighter, "minatoCloneRush", target)
      if (rusher) { rusher.x = spot.x; rusher.y = spot.y; rusher.spawnBeat = i * 12; rusher.attackTimer = -i * 12 }
    })
    fighter._spriteCastMove  = "minatoMeleeRush"   // brief dashing command gesture
    fighter._spriteCastTimer = 16
    fighter.attackCooldown   = getAttackDuration(14, fighter)
    focusCameraOnAction(context, fighter, target, 0.99, 8)
    shakeCamera(context, 4, 4)
    return true
  }

  // B→U (≥2 clones) = PINCER RENDAN — one clone strikes from the FRONT, one from BEHIND: two
  // guaranteed juggle hits (opposite offsets) that pop the opponent up. Consumes both clones.
  if (endsWithPattern(dirs, ["B", "U"]) && countShadowClones(fighter) >= 2) {
    if (!spendCloneComboChakra(fighter, 35)) return false
    consumeShadowClones(fighter, 2)
    const halfW = (target?.w || 40) * 0.4
    schedulePendingSpawn(2, () => {   // FRONT clone
      spawnGuaranteedCloneHit(fighter, target, "minatoKunai", { ...MINATO_CLONE_FX, damage: 60, hitstun: 24, knockbackX: 3, knockbackY: -11, dirSign: fighter.facing, offsetX: halfW }, context)
      shakeCamera(context, 5, 6)
    })
    schedulePendingSpawn(8, () => {   // BACK clone (opposite side)
      spawnGuaranteedCloneHit(fighter, target, "minatoKunai", { ...MINATO_CLONE_FX, damage: 60, hitstun: 24, knockbackX: 3, knockbackY: -10, dirSign: -fighter.facing, offsetX: -halfW }, context)
      shakeCamera(context, 5, 6)
    })
    fighter._spriteCastMove = "minatoRush2"; fighter._spriteCastTimer = 24
    fighter.attackCooldown = getAttackDuration(26, fighter)
    focusCameraOnAction(context, fighter, target, 0.96, 12)
    return true
  }

  // Down + Special — the contextual clone FINISHER (Kunai Uzumaki Barrage). ONLY when the
  // opponent is ALREADY in hitstun (mid-combo) AND ≥2 clones are held: pop them for a rapid
  // guaranteed flurry that CAPS with a downward slam (positive knockbackY floors them). Otherwise
  // this Down+Special slot is reserved for Stage 5 (Rasengan) → falls through to false.
  if (dirs.length > 0 && dirs[dirs.length - 1] === "D") {
    if ((target?.hitstun || 0) > 0 && countShadowClones(fighter) >= 2) {
      const n = consumeShadowClones(fighter, 3).length
      for (let i = 0; i < n; i++) {
        const last = (i === n - 1)   // final clone lands the slam
        schedulePendingSpawn(3 + i * 6, () => {
          spawnGuaranteedCloneHit(fighter, target, "minatoKunai", last
            ? { ...MINATO_CLONE_FX, damage: 90, hitstun: 30, knockbackX: 8, knockbackY: 7,  dirSign: fighter.facing }   // SLAM cap = knockdown read
            : { ...MINATO_CLONE_FX, damage: 45, hitstun: 20, knockbackX: 3, knockbackY: -3, dirSign: fighter.facing },  // link hits
            context)
          shakeCamera(context, last ? 9 : 4, last ? 8 : 4)
        })
      }
      fighter._spriteCastMove  = "minatoRush2"
      fighter._spriteCastTimer = 24
      fighter.attackCooldown   = getAttackDuration(28, fighter)
      focusCameraOnAction(context, fighter, target, 0.97, 12)
      return true
    }
    // Plain Down+Special (Stage 5): charge held → Big Ball Rasengan; otherwise the basic Rasengan ram.
    if (fighter.isCharging) return fireMinatoBigBall(fighter, context)
    return fireMinatoRasengan(fighter, context)
  }

  // CHARGED neutral Special → REAPER DEATH SEAL (Stage 5 sacrifice). Checked before the clone
  // barrages so a committed charge always casts the Reaper regardless of clones out; unavailable
  // (falls through) if the chakra/HP gate fails.
  if (fighter.isCharging && fireReaperDeathSeal(fighter, context)) return true

  // Neutral (≥3 clones) = FULL KUNAI BARRAGE — Minato's own kunai + 3 guaranteed clone kunai.
  // Checked BEFORE the 2-clone case so a full team fires the bigger barrage. Consumes all 3.
  if (countShadowClones(fighter) >= 3) {
    if (!spendCloneComboChakra(fighter, 30)) return false
    consumeShadowClones(fighter, 3)
    fighter.vx = fighter.facing * 5
    spawnProjectile(fighter, "minatoKunai", { damage: 80, speed: 12, lifetime: 55, hitstun: 20, knockbackX: 7, knockbackY: -2, color: "#facc15", w: 26, h: 16, ...MINATO_CLONE_FX }, context)
    ;[4, 11, 18].forEach((delay) => schedulePendingSpawn(delay, () => {
      spawnGuaranteedCloneHit(fighter, target, "minatoKunai", { ...MINATO_CLONE_FX, damage: 66, hitstun: 18, knockbackX: 6, knockbackY: -2, dirSign: fighter.facing }, context)
      shakeCamera(context, 4, 4)
    }))
    fighter._spriteCastMove = "minatoRush2"; fighter._spriteCastTimer = 24
    fighter.attackCooldown = getAttackDuration(26, fighter)
    focusCameraOnAction(context, fighter, target, 0.98, 8)
    return true
  }

  // Neutral (≥2 clones) = KUNAI BARRAGE (small) — Minato's kunai + 2 guaranteed clone kunai.
  if (countShadowClones(fighter) >= 2) {
    if (!spendCloneComboChakra(fighter, 30)) return false
    consumeShadowClones(fighter, 2)
    fighter.vx = fighter.facing * 5
    spawnProjectile(fighter, "minatoKunai", { damage: 80, speed: 12, lifetime: 55, hitstun: 20, knockbackX: 7, knockbackY: -2, color: "#facc15", w: 26, h: 16, ...MINATO_CLONE_FX }, context)
    schedulePendingSpawn(4,  () => { spawnGuaranteedCloneHit(fighter, target, "minatoKunai", { ...MINATO_CLONE_FX, damage: 66, hitstun: 18, knockbackX: 6, knockbackY: -2, dirSign: fighter.facing }, context); shakeCamera(context, 4, 4) })
    schedulePendingSpawn(12, () => { spawnGuaranteedCloneHit(fighter, target, "minatoKunai", { ...MINATO_CLONE_FX, damage: 66, hitstun: 18, knockbackX: 6, knockbackY: -2, dirSign: fighter.facing }, context); shakeCamera(context, 4, 4) })
    fighter._spriteCastMove = "minatoRush2"; fighter._spriteCastTimer = 22
    fighter.attackCooldown = getAttackDuration(24, fighter)
    focusCameraOnAction(context, fighter, target, 0.98, 8)
    return true
  }

  // Neutral Special (no clone-barrage context) = FLYING RAIJIN kunai throw (Stage 4). The plain
  // Down+Special slot returned false above (reserved for Stage 5 Rasengan / Reaper Death Seal).
  return fireFlyingRaijinKunai(fighter, context)
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
  // NARUTO-ONLY premium recast lockout. The Tailed Beast Bomb dispatches through triggerUltimate
  // like everyone else and WOULD get the universal 1200f/20s cooldown — a screen-clearing guaranteed
  // nuke warrants a premium above baseline, but the old 4× (4800f/80s) overcorrected: on a
  // damage-per-cooldown basis the TBB actually sat BELOW Rick/Sasuke ultimates at 80s despite being
  // the roster's hardest single hit, which read as "nerfed". Retuned to 2× baseline (2400f/40s):
  // 600 raw / 40s = 15 raw/s ≈ Sasuke Susanoo's 15.1 — in line with the pack's premium ult. The 50%
  // meter cost already gates recast (~20-27s of regen), so 40s is the effective cadence: reliably
  // once per 90s round, occasionally twice with real meter setup. Only Naruto is touched.
  fighter.ultimateCooldown     = NARUTO_KURAMA_RECAST_FRAMES
  fighter._suppressUltCooldown = true   // stop triggerUltimate from overwriting with the 1200 default
  return true
}

// MINATO ULTIMATE — Nine-Tails Chakra Mode → Tailed Beast Bomb. CINEMATIC ultimate
// (minatoKurama.js), reusing the kurama.js freeze-cinematic / giant-avatar architecture with
// MINATO's OWN dedicated art throughout (chakra-mode intro + his half-Kurama fox). Costs 50% of
// the max meter (like Naruto's), and shares the same premium 2×-baseline recast lockout — an
// equivalent screen-clearing guaranteed nuke (600 dmg, survivable from full).
function executeMinatoUltimate(fighter, context) {
  const cost = Math.ceil((fighter.maxEnergy || 100) * 0.5)
  if (!spendEnergy(fighter, cost)) return false
  const getOpponent = getTargetResolver(context)
  const opponent    = getOpponent(fighter)
  activateMinatoKurama(fighter, opponent)   // game.js freezes combat + drives the beats
  try { sound.playSfxFile?.(pickMinatoVoice("ult"), null) } catch (_) {}   // VOICE: Kurama ultimate — "the Fourth Hokage's power!"
  fighter.attackCooldown = 22
  shakeCamera(context, 12, 14)
  fighter.ultimateCooldown     = NARUTO_KURAMA_RECAST_FRAMES
  fighter._suppressUltCooldown = true
  return true
}

// ── GOJO SATORU ───────────────────────────────────────────────────
// "Limitless" (gojo2) SKIN cast-flavor voice — fires on ANY successfully-cast Gojo
// special or ultimate (audio-only). The young-Gojo pack has NO named-technique lines
// (Blue/Red/Purple/Domain deliberately excluded), so this plays a GENERIC flourish
// OVER the existing per-technique SFX — named casts never go silent under Limitless,
// they just also get a young-Gojo bark. Returns null (→ no-op) on the default skin, so
// base Gojo's casts are completely unchanged. Called only after a cast returns true.
function maybeFireGojoCastVoice(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "gojo") return
  const clip = pickSkinVoice("gojo", fighter.skinId, "cast")
  if (clip) { try { sound.playSfxFile?.(clip, null) } catch (_) {} }
}
// FLASH "Reverse Flash" skin special-cast flavor (same mechanism as Gojo). Base Flash has no cast voice,
// so pickSkinVoice returns null on every other skin → base Flash's casts are completely unchanged.
function maybeFireFlashSkinCastVoice(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "flash") return
  const clip = pickSkinVoice("flash", fighter.skinId, "cast")
  if (clip) { try { sound.playSfxFile?.(clip, null) } catch (_) {} }
}

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
        color: "#c084fc", w: 32, h: 32,
        // Salvaged Shinjuku-batch orb FX (drawProjectiles sprite hook) — replaces the
        // procedural purple circle. Uniform-resliced 7f×269×251 blue+red→purple morph.
        sheet: "./gojo_hollow_purple_orb_fx.png", spriteFrames: 7, spriteW: 269, spriteH: 251, spriteScale: 0.30, spriteSpeed: 5
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
      // Red = repulsion-singularity orb PROJECTILE (was a close-range melee burst). Positive
      // knockbackX shoves the target away (repulsion). Sprite = the salvaged Shinjuku-batch
      // red orb FX (uniform-resliced 3f×149×149). Release pose still plays the red_cast strip.
      spawnProjectile(fighter, "red", {
        damage: 130, speed: 13, lifetime: 120,
        hitstun: 26, knockbackX: 12, knockbackY: -3,
        color: "#ef4444", w: 22, h: 22,
        sheet: "./gojo_red_orb_fx.png", spriteFrames: 3, spriteW: 149, spriteH: 149, spriteScale: 0.34, spriteSpeed: 5
      }, context)
      fighter._spriteCastMove  = "red"   // RELEASE → red_cast strip (mirrors Blue/Hollow Purple)
      fighter._spriteCastTimer = 26
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
      color: "#60a5fa", w: 18, h: 18,
      // Salvaged Shinjuku-batch orb FX (drawProjectiles sprite hook) — replaces the
      // procedural blue circle. Uniform-resliced 3f×152×154 strip.
      sheet: "./gojo_blue_orb_fx.png", spriteFrames: 3, spriteW: 152, spriteH: 154, spriteScale: 0.34, spriteSpeed: 5
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
      // "Fuga" flame-arrow voice shout (sukuna_fuga.mp3) DELETED 2026-08-04 (voice removal); Flame Arrow
      // itself is unchanged — the cast just no longer vocalizes. Drop a new shout on this line to re-enable.
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
    // ROUTE 1 — chain to next rekka hit: fresh LIGHT during the current hit's RECOVERY. Routed through
    // the shared rekkaContinue with requireHit:false — the blade rekka links on TIMING alone (no clean-
    // connect gate), exactly as before; the shared helper just centralizes the window-close + cancel rule.
    const bladeNext = rekkaContinue(fighter, { edge: lightEdge, phase: getPhase?.(fighter), opponent: context?.getOpponent?.(fighter), requireHit: false })
    if (bladeNext) return fireTojiBladeMove(fighter, bladeNext, context)
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
  // Routed through the shared rekkaContinue (its own connect-latch / window-close are idempotent with
  // the multi-string latch+clear above, which must stay for the Koma / up-tier strings that share them).
  const cmdNext = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (cmdNext) return fireVegetaCommand(fighter, cmdNext, context)

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

// ─────────────────────────────────────────────────────────────────
// BEN 10 — per-FORM command-normal cancel chain (Fwd+Heavy opener → re-tap Heavy on
// CONNECT to continue). Same Toji-Rekka mechanics as Vegeta (fireVegetaCommand +
// shared rekkaContinue, requireHit:true → a whiff/block ends the string). Ben 10 is one
// fighter whose active alien decides which chain opens: Ben-human = 2-hit jab, XLR8 =
// 3-hit speed combo (the combo sheet), Diamondhead = 2-hit crystal swing (launcher end).
// Art-less aliens have no chain (opener=null) → they keep neutral normals only.
// ─────────────────────────────────────────────────────────────────
const BEN10_COMMAND = {
  // Ben-human — quick 2-hit jab string.
  benJab1: { damage: 30, startup: 5, active: 3, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: 0,  rangeX: 64, rangeY: 46, rekkaNext: "benJab2" },
  benJab2: { damage: 48, startup: 6, active: 4, recovery: 16, hitstun: 18, knockbackX: 7, knockbackY: -2, rangeX: 70, rangeY: 46 },   // finisher — no rekkaNext
  // XLR8 — 3-hit speed combo, low per-hit but fast; ends in a launcher.
  xlCombo1: { damage: 22, startup: 3, active: 2, recovery: 11, hitstun: 12, knockbackX: 2, knockbackY: 0,  rangeX: 72, rangeY: 44, rekkaNext: "xlCombo2" },
  xlCombo2: { damage: 24, startup: 3, active: 2, recovery: 11, hitstun: 12, knockbackX: 2, knockbackY: 0,  rangeX: 76, rangeY: 44, rekkaNext: "xlCombo3" },
  xlCombo3: { damage: 42, startup: 4, active: 3, recovery: 16, hitstun: 20, knockbackX: 8, knockbackY: -3, rangeX: 82, rangeY: 44, launcher: true },   // launcher finisher
  // Diamondhead — heavy 2-hit crystal swing; ends in a launcher.
  dhSwing1: { damage: 42, startup: 6, active: 4, recovery: 12, hitstun: 14, knockbackX: 3, knockbackY: 0,  rangeX: 82, rangeY: 54, rekkaNext: "dhSwing2" },
  dhSwing2: { damage: 66, startup: 8, active: 4, recovery: 20, hitstun: 22, knockbackX: 9, knockbackY: -3, rangeX: 94, rangeY: 54, launcher: true },   // launcher finisher
}

// Which chain OPENS for the fighter's current form (null = no command chain this form).
function ben10OpenerKey(fighter) {
  if (fighter.transformed === false) return "benJab1"   // reverted human
  const a = (fighter.activeAlien || "").toLowerCase()
  if (a === "xlr8") return "xlCombo1"
  if (a === "diamondhead") return "dhSwing1"
  return null   // art-less aliens: neutral normals only (until their own art lands)
}

function fireBen10Command(fighter, key, context) {
  const md = BEN10_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // reset per stage; latched true only on a real (non-blocked) hit
  return true
}

// Grounded command-normal driver (mirrors updateVegetaCommandCombat's rekka path). Returns
// true (→ skip the normal path this frame) only when it actually fires a stage.
export function updateBen10CommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || !inputState) return false
  const key = (fighter.rosterKey || "").toLowerCase()
  if (key !== "ben10" && key !== "albedo") return false

  // FEEDBACK — Energy Absorption counter bookkeeping (runs before the command chain).
  // (1) A pending redirect stamped by combat.shouldFeedbackAbsorb → fire the amplified discharge NOW.
  // (2) Otherwise tick the open counter window down (expires harmlessly on a whiff).
  if (fighter._fbAbsorbPending) {
    const pending = fighter._fbAbsorbPending
    fighter._fbAbsorbPending = null
    fighter._fbAbsorbWindow = 0
    return fireFbDischargeCounter(fighter, pending, context)
  }
  if ((fighter._fbAbsorbWindow || 0) > 0) fighter._fbAbsorbWindow--

  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase = getPhase?.(fighter)

  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy
  fighter._cmdPrevHeavy = !!inputState.heavy

  // Latch a REAL connect for the current stage (hit, not block) — see updateVegetaCommandCombat.
  const opp = context?.getOpponent?.(fighter)
  if (fighter.attacking && fighter.currentAttack?.hasHit && (opp?.hitstun || 0) > 0) fighter._cmdHitLanded = true
  if (!fighter.attacking) { fighter._rekkaNext = null; fighter._cmdHitLanded = false }

  // CONTINUE — fresh Heavy during the current hit's RECOVERY, only if it CONNECTED (cancel-on-hit).
  const cmdNext = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (cmdNext) return fireBen10Command(fighter, cmdNext, context)

  // OPENER — Forward+Heavy from neutral, grounded. Form decides which chain.
  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && forward && heavyEdge) {
    const opener = ben10OpenerKey(fighter)
    if (opener) return fireBen10Command(fighter, opener, context)
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

  // REKKA CONTINUE — fresh press of the ACTIVE string's button during the current hit's RECOVERY,
  // only if it CONNECTED. _rekkaBtn routes: kick chain advances on Heavy, sword string on Light.
  // Shared rekkaContinue owns the connect-latch, window-close and cancel rule (see combat.js).
  const opp  = context?.getOpponent?.(fighter)
  const edge = fighter._rekkaBtn === "light" ? lightEdge : heavyEdge
  const next = rekkaContinue(fighter, { edge, phase, opponent: opp, requireHit: true })
  if (next) return fireOmegaRangerCmd(fighter, next)

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
// SAMURAI RED RANGER — Stage 2 command layer: the MERGED tap/hold up-attack + a Toji-Rekka
// command-normal cancel chain. Both run through updateSamuraiRangerCommandCombat (before the
// normal path); the built-in grounded up-attack is suppressed for samurai so it never double-fires.
//
// MERGED UP-ATTACK (one input I, two power tiers): a quick TAP → samUpTap (fast rising launcher,
// upattack_1). HOLDING I past SAM_UP_HOLD_FRAMES → samUpHold (a stronger, slower rising attack,
// upattack_2) fires the instant the threshold is reached; releasing before then fires the tap.
//
// FLAME-SLASH CHAIN (Fwd+Heavy opener → re-tap Heavy during recovery, cancel-on-HIT): samRekka1
// (opening slash) → samRekka2 (crouch-crescent) → samRekkaFin (flaming ground-slash LAUNCHER,
// string ends). Cancel-on-HIT (Vegeta/Omega pattern): a stage only advances if the prior hit
// CONNECTED — a block or whiff ends the string there. Each stage is a real, individually-landable
// attack. FREE (no energy): the chain commits via recovery. Neutral heavy/light/air/down_air stay
// on the normal path (the Stage-2 normals).
// ─────────────────────────────────────────────────────────────────────────────
const SAM_UP_HOLD_FRAMES = 9   // hold the up-attack this many frames → the strong (samUpHold) tier
const SAMURAI_RANGER_UP = {
  samUpTap:  { damage: 66,  startup: 6,  active: 4, recovery: 16, hitstun: 20, knockbackX: 3, knockbackY: -12, rangeX: 64, rangeY: 78, launcher: true },   // quick rising launcher
  samUpHold: { damage: 112, startup: 10, active: 5, recovery: 24, hitstun: 24, knockbackX: 4, knockbackY: -15, rangeX: 72, rangeY: 82, launcher: true },   // charged strong tier
}
const SAMURAI_RANGER_CMD = {
  samRekka1:   { damage: 40, startup: 5, active: 3, recovery: 11, hitstun: 14, knockbackX: 3,  knockbackY: 0,  rangeX: 82, rangeY: 54, rekkaNext: "samRekka2" },
  samRekka2:   { damage: 42, startup: 5, active: 4, recovery: 12, hitstun: 15, knockbackX: 4,  knockbackY: 0,  rangeX: 86, rangeY: 56, rekkaNext: "samRekkaFin" },
  samRekkaFin: { damage: 82, startup: 7, active: 4, recovery: 22, hitstun: 24, knockbackX: 10, knockbackY: -8, rangeX: 92, rangeY: 58, launcher: true },   // flaming launcher — string ends here
}

function fireSamuraiRangerMove(fighter, key) {
  const md = SAMURAI_RANGER_CMD[key] || SAMURAI_RANGER_UP[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter.currentMove   = key                 // drives sprite.js identity resolution
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._rekkaBtn     = "heavy"             // the flame chain advances on Heavy
  fighter._cmdHitLanded = false               // latched true only on a real (non-blocked) hit → gates the cancel
  // SPIN SWORD / base-weapon cast voice — only on the Flame-Chain FINISHER (the sword combo-ender). The
  // opener stages stay silent. _atkVoiceCd so the finisher's connect doesn't ALSO fire the offense bark.
  if (key === "samRekkaFin") {   // combo-ender voice, CHAR-AWARE: Red = fire spin-sword, Gold = "Fierce Fox Claw"
    const rk = (fighter.rosterKey || "").toLowerCase()
    if (rk === "samurai_red_ranger") { try { sound.playSfxFile?.(pickSamuraiVoice("spinSword"), null); fighter._atkVoiceCd = 150 } catch (_) {} }
    else if (rk === "gold_samurai_ranger") { try { sound.playSfxFile?.(pickGoldSamuraiVoice("foxClaw"), null); fighter._atkVoiceCd = 150 } catch (_) {} }
  }
  return true
}

// Per-frame Samurai Red Ranger driver (merged up-attack + flame chain). Returns true (→ caller
// skips the normal path this frame) only when it actually fires a move.
// Both Samurai Rangers (Red + Gold) share this command-combat handler. Red also has a MERGED grounded
// up-attack (tap/hold) → its built-in up is suppressed (game.js) and driven here; Gold uses a SINGLE
// standard up-attack (its up is NOT suppressed), so the merged-up branch is gated to Red only. The
// Fwd+Heavy rekka chain runs for BOTH (identical logic, each ranger's own sprites via animationData).
const SAMURAI_RANGER_KEYS = new Set(["samurai_red_ranger", "gold_samurai_ranger", "green_samurai_ranger"])
export function updateSamuraiRangerCommandCombat(fighter, inputState, context, getPhase) {
  const rk = (fighter?.rosterKey || "").toLowerCase()
  if (!fighter || !SAMURAI_RANGER_KEYS.has(rk) || !inputState) return false
  const mergedUp = rk === "samurai_red_ranger"   // Gold has no merged tap/hold up-attack
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase = getPhase?.(fighter)

  // Press-EDGE of Heavy (fresh tap, not held/buffered) — a rekka needs a clean re-tap.
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy
  fighter._cmdPrevHeavy = !!inputState.heavy

  // REKKA CONTINUE — fresh Heavy during the current hit's RECOVERY, only if it CONNECTED. Shared
  // rekkaContinue owns the connect-latch, window-close and cancel rule (see combat.js).
  const opp  = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireSamuraiRangerMove(fighter, next)

  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (!canStart) { fighter._samUpPrev = !!inputState.upAttack; if (!inputState.upAttack) fighter._samUpHold = 0; return false }

  // MERGED UP-ATTACK (grounded): count how long I is held. Reaching SAM_UP_HOLD_FRAMES fires the
  // strong tier immediately; releasing before then fires the quick tap. (Airborne up-attack is left
  // to the normal path — this merger is a grounded launcher.)
  if (grounded && mergedUp) {
    const upHeld = !!inputState.upAttack
    const upPrev = !!fighter._samUpPrev
    fighter._samUpPrev = upHeld
    if (upHeld) {
      fighter._samUpHold = (fighter._samUpHold || 0) + 1
      if (fighter._samUpHold >= SAM_UP_HOLD_FRAMES) { fighter._samUpHold = 0; return fireSamuraiRangerMove(fighter, "samUpHold") }
      return false   // still deciding tap-vs-hold — hold the input this frame
    } else if (upPrev && (fighter._samUpHold || 0) > 0) {
      fighter._samUpHold = 0
      return fireSamuraiRangerMove(fighter, "samUpTap")   // released before threshold → quick tap
    }
    fighter._samUpHold = 0
  }

  // FLAME CHAIN opener: Fwd+Heavy. Neutral heavy stays the normal (heavy) on the normal path.
  if (grounded && forward && heavyEdge) return fireSamuraiRangerMove(fighter, "samRekka1")
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// SAMURAI RED RANGER — MEGA MODE (Stage 3): a full VEGETA-STYLE TIER-SWAP (NOT an overlay).
// Activating it swaps fighter._skinAnim to SAMURAI_MEGA_ANIM (every move now renders its Mega sheet,
// via sprite.js's `_skinAnim?.[action] || animationData?.[action]` fallback) AND applies a flat tier
// damage/speed/defense multiplier — so EVERY move (idle/walk/jump/hit/guard/normals/command chain/
// ultimate) is higher-damage Mega art for the form's duration. Same machinery as Vegeta's base→SSJ.
//
// INPUT: hold P to build Symbol Power; RELEASE at/above the threshold → Mega Mode (mirrors Vegeta's
// charge-release). A quick TAP while transformed reverts early. Sustained per-frame drain → auto-revert
// at empty (applySamuraiFormSystem). The transformation plays a locked in-place MORPH: the silhouette
// darkens while the 火 calligraphy is brush-drawn ALONGSIDE him (game.js drawSamuraiMegaTransform), then
// both RESOLVE into the Mega form on a flash. (The upload has NO 超 calligraphy in real frame content —
// only 火 — so per project discipline we render only what exists.)
//
// Any action WITHOUT dedicated Mega art (e.g. `air` — no mega air sheet in the batch) falls through to
// the base sheet automatically; that's the intended _skinAnim fallback, flagged not fabricated.
// ─────────────────────────────────────────────────────────────────────────────
const SAMURAI_MEGA_THRESHOLD = 90    // Symbol Power needed to transform (maxEnergy 160)
const SAMURAI_MEGA_DRAIN     = 0.30  // per-frame sustained drain → ~8.9s from full
const SAMURAI_MEGA_MORPH     = 42    // locked morph frames (~0.7s)
const SAMURAI_MEGA_RESOLVE   = 16    // frames-remaining at which base→Mega art + stats resolve (the flash)
const SAMURAI_MEGA_MULT      = { dmg: 1.35, spd: 1.05, def: 1.08 }
// Both Samurai Rangers share the Mega-Mode tier-swap machinery (enter/revert/form-system/morph). The
// per-char art is chosen inside applySamuraiMegaStats (mega anim) + drawSamuraiMegaTransform (symbol).
// NOTE: the fire SPECIAL/ULTIMATE (executeSamuraiRanger*) also call this, but Gold is not dispatched to
// them (game.js special/ultimate switch is per-rosterKey) until Gold gets its OWN Stage-4/5 wiring.
const isSamuraiRanger = (f) => SAMURAI_RANGER_KEYS.has((f?.rosterKey || "").toLowerCase())
export function samuraiIsMega(f) { return !!f?._megaActive && !!f?._megaArtApplied }   // TRUE once resolved (gates Mega-only Flame Slash in Stage 4)

// FULL Mega-tier form anim (all RE-SLICED from copies). Keys mirror the base animationData; sprite.js
// falls back to base for any key omitted here (air). light/heavy are windows of the single mega_combo
// sheet (the batch has no mega combo_2); the command chain reuses mega_combo + the mega flame string.
const SAMURAI_MEGA_ANIM = {
  idle:  { frames: 4, width: 28, height: 62, speed: 6, anchorY: 0, sheet: "./samurai_ranger_mega_idle_uniform.png" },
  walk:  { frames: 8, width: 46, height: 61, speed: 6, anchorY: 0, sheet: "./samurai_ranger_mega_walk_uniform.png" },
  run:   { frames: 8, width: 46, height: 61, speed: 4, anchorY: 0, sheet: "./samurai_ranger_mega_walk_uniform.png" },
  dash:  { frames: 8, width: 46, height: 61, speed: 3, anchorY: 0, sheet: "./samurai_ranger_mega_walk_uniform.png" },
  jump:  { frames: 6, width: 36, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_jump_uniform.png" },
  fall:  { frames: 6, width: 36, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_jump_uniform.png" },
  hurt:  { frames: 2, width: 39, height: 59, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_hit_uniform.png" },
  guard: { frames: 3, width: 30, height: 56, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_guard_uniform.png" },
  light:    { frames: 4, width: 77, height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_combo_uniform.png" },
  heavy:    { frames: 6, width: 77, height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_combo_uniform.png" },
  grab:     { frames: 4, width: 77, height: 69, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_combo_uniform.png" },
  down_air: { frames: 7, width: 63, height: 73, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_downattack_uniform.png" },
  samUpTap:  { frames: 8,  width: 69, height: 118, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_upattack_1_uniform.png" },
  samUpHold: { frames: 14, width: 93, height: 91,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_upattack_2_uniform.png" },
  samRekka1:   { frames: 13, width: 77, height: 69, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_combo_uniform.png" },
  samRekka2:   { frames: 13, width: 77, height: 69, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_combo_uniform.png" },
  samRekkaFin: { frames: 18, width: 77, height: 77, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_downattack_2_uniform.png" },
  // MEGA-ONLY Flame Slash cast pose (Stage 4). Lives ONLY in the Mega form set — there is no base-tier
  // art for it, matching the Mega-exclusive gate in executeSamuraiRangerSpecial.
  flameSlash: { frames: 13, width: 91, height: 75, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_flameslash_uniform.png" },
  // MEGA-TIER ULTIMATE art (Stage 5) — overrides the base `ultimate` key so a transformed cast renders
  // the higher-power Mega barrage. Same move, tier-dependent presentation (+ higher damage, applied by
  // applySamuraiUltimateDamage reading _megaActive). The 6 Mega specialattack parts stitched + resliced.
  ultimate: { frames: 55, width: 164, height: 108, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_mega_ultimate_uniform.png" }
}

// GOLD Samurai Ranger's Mega-tier form anim (own art — the gold-armored Super Samurai). Same key shape
// as Red's SAMURAI_MEGA_ANIM; sprite.js falls back to Gold's BASE anim for any omitted key. Sliced per-row
// from samurai_ranger_gold_mega_mode_attacks.png (COPIES). No merged up-attack (Gold uses a single up).
const GOLD_MEGA_ANIM = {
  idle:  { frames: 4, width: 32, height: 58,  speed: 6, anchorY: 0, sheet: "./samurai_ranger_gold_mega_mode_idle_uniform.png" },
  walk:  { frames: 8, width: 46, height: 54,  speed: 6, anchorY: 0, sheet: "./samurai_ranger_gold_mega_mode_run_uniform.png" },
  run:   { frames: 8, width: 46, height: 54,  speed: 4, anchorY: 0, sheet: "./samurai_ranger_gold_mega_mode_run_uniform.png" },
  dash:  { frames: 8, width: 46, height: 54,  speed: 3, anchorY: 0, sheet: "./samurai_ranger_gold_mega_mode_run_uniform.png" },
  jump:  { frames: 6, width: 29, height: 60,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_mode_bjump_uniform.png" },
  fall:  { frames: 6, width: 29, height: 60,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_mode_bjump_uniform.png" },
  hurt:  { frames: 3, width: 54, height: 69,  speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_mode_hurt_uniform.png" },
  guard: { frames: 3, width: 37, height: 57,  speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_guard_uniform.png" },
  light:    { frames: 4,  width: 131, height: 74,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_slash_uniform.png" },
  heavy:    { frames: 6,  width: 131, height: 74,  speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_slash_uniform.png" },
  up:       { frames: 8,  width: 116, height: 100, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_rising_uniform.png" },
  air:      { frames: 7,  width: 53,  height: 58,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_aerial_uniform.png" },
  down_air: { frames: 5,  width: 53,  height: 58,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_aerial_uniform.png" },
  grab:     { frames: 4,  width: 131, height: 74,  speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_slash_uniform.png" },
  samRekka1:   { frames: 9,  width: 131, height: 74,  speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_slash_uniform.png" },
  samRekka2:   { frames: 9,  width: 116, height: 100, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_rising_uniform.png" },
  samRekkaFin: { frames: 10, width: 110, height: 108, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_launcher_uniform.png" },
  lightSlash:  { frames: 8,  width: 110, height: 108, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_launcher_uniform.png" },  // Mega-tier slash-wave cast pose
  ultimate:    { frames: 10, width: 110, height: 108, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_gold_mega_launcher_uniform.png" }   // Mega-tier ULTIMATE barrage art (Stage 5)
}
// GREEN Samurai Ranger's Mega-tier form anim (own art — the DEEPER-GREEN "power/mega" Forest form).
// RESOLVED the power_mode-vs-mega_mode question: a palette compare (base green R≈55-62 vs power_mode +
// mega_mode R≈38-39) proved they are the SAME transformed tier, just split across differently-named
// sheets — so the Mega tier draws idle/jump from `power_mode_*` and combat from `mega_mode_*`. Same key
// shape as Red/Gold; sprite.js falls back to Green's BASE anim for any omitted key (air/hurt/down_air —
// the batch has no dedicated Mega art for those, flagged not fabricated). Single up-attack (like Gold).
const GREEN_MEGA_ANIM = {
  idle:  { frames: 4, width: 30, height: 62, speed: 6, anchorY: 0, sheet: "./samurai_ranger_forest_mega_idle_uniform.png" },
  walk:  { frames: 8, width: 58, height: 54, speed: 6, anchorY: 0, sheet: "./samurai_ranger_forest_mega_run_uniform.png" },
  run:   { frames: 8, width: 58, height: 54, speed: 4, anchorY: 0, sheet: "./samurai_ranger_forest_mega_run_uniform.png" },
  dash:  { frames: 8, width: 58, height: 54, speed: 3, anchorY: 0, sheet: "./samurai_ranger_forest_mega_run_uniform.png" },
  jump:  { frames: 6, width: 36, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_jump_uniform.png" },
  fall:  { frames: 6, width: 36, height: 60, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_jump_uniform.png" },
  guard: { frames: 4, width: 41, height: 70, speed: 6, anchorY: 0, sourceX: 164, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_guard_uniform.png" }, // clean crouch (skip shield-FX frames)
  light:    { frames: 4,  width: 68, height: 73, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_slash_uniform.png" },
  heavy:    { frames: 6,  width: 77, height: 69, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_lunge_uniform.png" },
  up:       { frames: 8,  width: 69, height: 117, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_rising_uniform.png" },
  grab:     { frames: 4,  width: 68, height: 73, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_slash_uniform.png" },
  samRekka1:   { frames: 12, width: 68, height: 73, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_slash_uniform.png" },
  samRekka2:   { frames: 13, width: 77, height: 69, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_lunge_uniform.png" },
  samRekkaFin: { frames: 21, width: 93, height: 91, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_launcher_uniform.png" }, // pink-ring → green leaf-storm super
  // MEGA-tier FOREST SPEAR cast pose (Stage 4) — overrides the base forestSpear key so a transformed cast
  // renders the deeper-green mega spear-thrust art. The special itself is usable in both tiers (tier-scaling).
  forestSpear: { frames: 13, width: 83, height: 70, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_spear_cast_uniform.png" },
  // MEGA-tier ULTIMATE art (Stage 5) — overrides the base `ultimate` key so a transformed cast renders the
  // higher-power Mega leaf-storm barrage (pink-ring → green leaf-storm super). Same move, tier presentation.
  ultimate: { frames: 21, width: 93, height: 91, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./samurai_ranger_forest_mega_launcher_uniform.png" }
}
// Per-character Mega form anim: applySamuraiMegaStats swaps in the caster's OWN mega art.
const SAMURAI_MEGA_ANIM_BY_KEY = { samurai_red_ranger: SAMURAI_MEGA_ANIM, gold_samurai_ranger: GOLD_MEGA_ANIM, green_samurai_ranger: GREEN_MEGA_ANIM }

function applySamuraiMegaStats(fighter) {
  const anim = SAMURAI_MEGA_ANIM_BY_KEY[(fighter.rosterKey || "").toLowerCase()] || SAMURAI_MEGA_ANIM
  // Mega tier carries the ACTIVE SKIN: retag the Mega sheets to the fighter's recolor tag so an alt skin
  // stays consistent THROUGH the transform (base blue → Mega blue, not base blue → Mega red). No tag
  // (default) → retagFormAnim returns the canonical `anim` unchanged. The 12 Red creative skins
  // (tools/gen_samurai_creative.py) ship recolored __<tag> Mega sheets + carry recolorTag in skins.js.
  fighter._skinAnim         = retagFormAnim(anim, fighter._recolorTag)
  fighter.damageMultiplier  = SAMURAI_MEGA_MULT.dmg
  fighter.attackMultiplier  = SAMURAI_MEGA_MULT.dmg
  fighter.speedMultiplier   = SAMURAI_MEGA_MULT.spd
  fighter.defenseMultiplier = SAMURAI_MEGA_MULT.def
  fighter.currentFormData   = fighter.transformations?.megaMode || fighter.currentFormData   // updateTransformationState re-applies this each frame (Vegeta gotcha)
}

// Enter Mega Mode: gated on samurai + not already Mega + actionable + Symbol Power ≥ threshold. Starts
// the locked morph; art + stats resolve partway through (the flash), NOT at entry, so the silhouette
// visibly darkens on the BASE body first and only THEN swaps to the Mega form.
export function enterSamuraiMega(fighter, context = {}) {
  if (!isSamuraiRanger(fighter) || fighter._megaActive) return false
  if ((fighter.attackCooldown || 0) > 0 || (fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0) return false
  if ((fighter.energy || 0) < SAMURAI_MEGA_THRESHOLD) return false
  fighter._megaActive     = true
  fighter._megaArtApplied = false
  fighter._megaMorphTimer = SAMURAI_MEGA_MORPH
  fighter._megaMorphTotal = SAMURAI_MEGA_MORPH
  fighter.currentForm     = "megaMode"          // HUD/state
  fighter.attackCooldown  = SAMURAI_MEGA_MORPH   // fully locked while morphing
  fighter.vx = 0
  fighter.teleportFlash   = Math.max(fighter.teleportFlash || 0, 10)
  // MEGA MODE activation voice — fires at the ACTIVATION beat (silhouette darken + calligraphy symbol),
  // BEFORE the morph resolves the Mega art/stats (applySamuraiFormSystem's flash). CHAR-AWARE: Gold speaks
  // his own "Samurai Morpher! Gold power!" (transformCast), Red his fire "Mega Mode Power!" — no cross-VA.
  try {
    const rk = (fighter.rosterKey || "").toLowerCase()
    // CHAR-AWARE, no cross-VA leak: Gold speaks his own transformCast, Red his fire megaMode. Green has
    // no voice pack yet → SILENT (do NOT fall through to Red's clip). Wire a green clip in a later voice stage.
    const clip = rk === "gold_samurai_ranger" ? pickGoldSamuraiVoice("transformCast")
               : rk === "samurai_red_ranger"  ? pickSamuraiVoice("megaMode")
               : null
    if (clip) { sound.playSfxFile?.(clip, null, { owner: fighter }); fighter._atkVoiceCd = 150 }   // owned → the transform-complete line (fired later, outside the owner window) can stop this if it's still tailing
  } catch (_) {}
  return true
}

// Revert to base: clear the flag + art swap + multipliers (mirrors revertVegetaSSJ).
export function revertSamuraiMega(fighter) {
  if (!fighter || !fighter._megaActive) return
  fighter._megaActive       = false
  fighter._megaArtApplied   = false
  fighter._megaMorphTimer   = 0
  fighter._skinAnim         = fighter._baseSkinAnim || null
  fighter.currentForm       = "base"
  fighter.damageMultiplier  = 1
  fighter.attackMultiplier  = 1
  fighter.speedMultiplier   = 1
  fighter.defenseMultiplier = 1
  fighter.currentFormData   = fighter.transformations?.base || null
  fighter.teleportFlash     = Math.max(fighter.teleportFlash || 0, 8)
}

// Per-frame hook (updateFighterState): drives the morph resolve, then continuous drain + auto-revert.
export function applySamuraiFormSystem(fighter) {
  if (!isSamuraiRanger(fighter) || !fighter._megaActive) return
  if ((fighter._megaMorphTimer || 0) > 0) {
    fighter._megaMorphTimer--
    fighter.vx = 0                                // stay planted during the locked morph
    if (!fighter._megaArtApplied && fighter._megaMorphTimer <= SAMURAI_MEGA_RESOLVE) {
      fighter._megaArtApplied = true             // RESOLVE: base→Mega art + tier stats, on a flash
      applySamuraiMegaStats(fighter)
      fighter.teleportFlash = Math.max(fighter.teleportFlash || 0, 16)
    }
    // TRANSFORM-COMPLETE voice (Gold only) — fires exactly once, the frame the locked morph fully ends
    // (timer just hit 0), i.e. AFTER the reveal flash: "Gold is good to go!" confirms Mega Mode is active.
    if (fighter._megaMorphTimer <= 0 && (fighter.rosterKey || "").toLowerCase() === "gold_samurai_ranger") {
      // owner:fighter — this hook runs OUTSIDE the _voiceOwner window (updateFighterState, not
      // _updatePlayerCombatBody), so pass the owner explicitly → this stops the activation line if it's
      // still playing (single voice channel: 001 never stacks on 000).
      try { sound.playSfxFile?.(pickGoldSamuraiVoice("transformDone"), null, { owner: fighter }) } catch (_) {}
    }
    return
  }
  // Sustained drain → instant auto-revert at empty.
  fighter.energy = Math.max(0, (fighter.energy || 0) - SAMURAI_MEGA_DRAIN)
  if ((fighter.energy || 0) <= 0) revertSamuraiMega(fighter)
}

// FLAME SLASH (Stage 4) — SPECIAL button, MEGA-MODE-EXCLUSIVE. A rising flame-sword slash (launcher)
// into a DOUBLE-BURST: two forward flame crescents fired on the swing's release beats. GATED HARD on
// samuraiIsMega — in base form there is NO art and the input is a no-op (returns false → the special
// button does nothing), because the batch ships no base-tier Flame Slash art (flagged, not fabricated).
// Costs 35 Symbol Power (on top of Mega Mode's own sustained drain).
export function executeSamuraiRangerSpecial(fighter, context) {
  if (!isSamuraiRanger(fighter)) return false
  if (!samuraiIsMega(fighter)) return false                       // ← the Mega-only gate (base form: no-op)
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 35)) return false
  const md = { damage: 120, startup: 7, active: 5, recovery: 20, hitstun: 24, blockstun: 14, knockbackX: 6, knockbackY: -13, rangeX: 86, rangeY: 76, launcher: true, isSpecial: true }
  const attack = createAttackFromMove(fighter, "flameSlash", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "flameSlash" → the cast pose
  fighter.vx = (fighter.facing || 1) * 3                          // small lunge into the rising slash
  shakeCamera(context, 5, 8)
  // FIRE SMASHER (Flame Slash) cast voice — random pick; _atkVoiceCd so the connect doesn't ALSO bark.
  try { sound.playSfxFile?.(pickSamuraiVoice("fireSmasher"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  // DOUBLE-BURST — two forward flame crescents on the swing's release beats (own collision, isSpecial).
  const spawnBurst = (dmg) => spawnProjectile(fighter, "samurai_flameburst", {
    sheet: "./samurai_ranger_flameburst_uniform.png", spriteFrames: 12, spriteW: 57, spriteH: 75, spriteSpeed: 2, spriteScale: 1.3,
    damage: dmg, speed: 12, lifetime: 70, hitstun: 16, knockbackX: 7, knockbackY: -3,
    w: 40, h: 46, color: "#ff7a1a", isSpecial: true, spawnY: fighter.y + (fighter.h || 100) * 0.4
  }, context)
  schedulePendingSpawn(11, () => { spawnBurst(48); shakeCamera(context, 3, 5) })
  schedulePendingSpawn(17, () => spawnBurst(42))
  return true
}

// GOLD SAMURAI RANGER — LIGHT SLASH (Stage 4 special, SPECIAL button). A forward Barracuda-Blade swing
// that HURLS a light energy slash-wave (a katana sword-beam) with its OWN independent projectile collision,
// distinct from Gold's melee normals. NO bow/arrow art exists on disk (confirmed by the asset-map scan), so
// this is the strongest real projectile candidate — built from Gold's actual blue slash-arc FX. Usable in
// BOTH tiers (unlike Red's Mega-only Flame Slash): TIER-SCALING — Mega Mode throws a bigger, faster,
// harder-hitting wave and renders the gold-armored cast art (via _skinAnim). Costs 35 Symbol Power.
export function executeGoldSamuraiSpecial(fighter, context) {
  if ((fighter?.rosterKey || "").toLowerCase() !== "gold_samurai_ranger") return false
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 35)) return false
  const mega = !!fighter._megaActive
  const md = { damage: mega ? 120 : 90, startup: 8, active: 5, recovery: 20, hitstun: 22, blockstun: 12, knockbackX: 6, knockbackY: -3, rangeX: 40, rangeY: 40, isSpecial: true }
  const attack = createAttackFromMove(fighter, "lightSlash", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "lightSlash" → the cast pose
  fighter.vx = (fighter.facing || 1) * 3                                   // small lunge into the swing
  shakeCamera(context, 4, 6)
  // BARRACUDA BLADE cast voice — direct technique-name match. Random pick; _atkVoiceCd so the connect
  // doesn't ALSO trigger the offense bark (no cast+connect double — the Red discipline).
  try { sound.playSfxFile?.(pickGoldSamuraiVoice("barracuda"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  // The light slash-wave — Gold's OWN extracted slash-arc FX, its own collision (isSpecial). Fired on the
  // swing's release beat. Mega tier: bigger box, faster, more damage + reach.
  const waveDmg = mega ? 96 : 72
  schedulePendingSpawn(md.startup + 2, () => {
    spawnProjectile(fighter, "gold_light_slashwave", {
      sheet: "./samurai_ranger_gold_slashwave_uniform.png", spriteFrames: 5, spriteW: 97, spriteH: 77, spriteSpeed: 2, spriteScale: mega ? 1.5 : 1.2,
      damage: waveDmg, speed: mega ? 15 : 12, lifetime: mega ? 80 : 70, hitstun: 20, knockbackX: 8, knockbackY: -3,
      w: mega ? 54 : 44, h: mega ? 54 : 46, color: "#5aa8ff", isSpecial: true, spawnY: fighter.y + (fighter.h || 100) * 0.4
    }, context)
    shakeCamera(context, 3, 5)
  })
  return true
}

// GREEN Samurai Ranger — FOREST SPEAR (Stage 4): the character's REAL extended-reach weapon (a naginata,
// confirmed by the alpha-gutter scan — neither Red nor Gold has it). Modelled on Gold's projectile special
// (both tiers, tier-scaling) but with the SPEAR IDENTITY baked in: a LONG-REACH melee thrust (rangeX 100
// vs the melee normals' ~68-92) that ALSO hurls a travelling leaf-energy blast wave. Green has no voice
// pack yet → SILENT (no cross-VA leak). Cast pose = the spear-thrust sheet (base) / mega spear (Mega).
export function executeGreenSamuraiSpecial(fighter, context) {
  if ((fighter?.rosterKey || "").toLowerCase() !== "green_samurai_ranger") return false
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 35)) return false
  const mega = !!fighter._megaActive
  // EXTENDED-REACH melee thrust — rangeX 100 deliberately out-reaches every melee normal (the spear payoff).
  const md = { damage: mega ? 120 : 90, startup: 9, active: 5, recovery: 22, hitstun: 22, blockstun: 12, knockbackX: 6, knockbackY: -2, rangeX: 100, rangeY: 46, isSpecial: true }
  const attack = createAttackFromMove(fighter, "forestSpear", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "forestSpear" → the spear-thrust cast pose
  fighter.vx = (fighter.facing || 1) * 3                                   // small lunge into the thrust
  shakeCamera(context, 4, 6)
  // The leaf-energy blast wave — Green's OWN extracted projectile FX, its own collision (isSpecial). Fired
  // on the thrust's release beat. Mega tier: bigger box, faster, more damage + reach.
  const waveDmg = mega ? 96 : 72
  schedulePendingSpawn(md.startup + 2, () => {
    spawnProjectile(fighter, "forest_spear_wave", {
      sheet: "./samurai_ranger_forest_spear_wave_uniform.png", spriteFrames: 12, spriteW: 57, spriteH: 75, spriteSpeed: 2, spriteScale: mega ? 1.5 : 1.2,
      damage: waveDmg, speed: mega ? 15 : 12, lifetime: mega ? 80 : 70, hitstun: 20, knockbackX: 8, knockbackY: -3,
      w: mega ? 54 : 46, h: mega ? 58 : 50, color: "#6bc34a", isSpecial: true, spawnY: fighter.y + (fighter.h || 100) * 0.4
    }, context)
    shakeCamera(context, 3, 5)
  })
  return true
}

// ULTIMATE (Stage 5) — "Fire Smasher: Blazing Strike", a freeze-cinematic flaming-saber barrage.
// TIER-SCALING: the cinematic plays the caster's OWN `ultimate` sprite, which resolves to the BASE strip
// untransformed and the MEGA strip in Mega Mode (via _skinAnim). The DAMAGE scales the same way here.
const SAMURAI_ULT_BASE_DMG = 340
const SAMURAI_ULT_MEGA_DMG = 460   // ≈ base × 1.35, matching the Mega tier relationship
function applySamuraiUltimateDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const mega = !!fighter?._megaActive
  let dmg = mega ? SAMURAI_ULT_MEGA_DMG : SAMURAI_ULT_BASE_DMG
  dmg = Math.round(dmg * (fighter?._ultDamageMult ?? 1))   // Morpher Call-In assist scaling (1 = normal self-cast)
  if (opp.isBlocking) {
    dmg = Math.round(dmg * 0.25)
    opp.blockstun = Math.max(opp.blockstun || 0, 20)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 40)
    opp.vx = (fighter.facing || 1) * 13; opp.vy = -7            // blasted away by the flame barrage
    opp.colorFlash = 14; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 46)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (sure-hit)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2, ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 22, maxTimer: 22,
      category: opp.isBlocking ? "light" : "ultimate",
      color: opp.isBlocking ? null : "#ff6a1a",
      damage: dmg, lines: opp.isBlocking ? 6 : 20, radius: opp.isBlocking ? 14 : 56,
      ...(opp.isBlocking ? { isBlocking: true } : {})
    })
  }
}

const SAMURAI_ULT_COST = 100
export function executeSamuraiRangerUltimate(fighter, context) {
  if (!isSamuraiRanger(fighter)) return false
  if (isSamuraiFlameSmasherCinematicActive()) return false     // already mid-cinematic
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, SAMURAI_ULT_COST)) return false
  const opp = context?.getOpponent?.(fighter) || null
  fighter.vx = 0
  // ULTIMATE ("Fire Smasher: Blazing Strike") cast voice — fires at ACTIVATION/windup, BEFORE the
  // freeze-cinematic's guaranteed-damage STRIKE beat. _atkVoiceCd so no connect double. Random pick.
  try { sound.playSfxFile?.(pickSamuraiVoice("ultimate"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  activateSamuraiFlameSmasherCinematic(fighter, opp, (cineCtx) => applySamuraiUltimateDamage(fighter, opp, cineCtx))
  return true
}

// GOLD SAMURAI RANGER — "Barracuda Blade: Light Finale" ULTIMATE (Stage 5). REUSES Red's proven
// freeze-cinematic architecture (activateSamuraiFlameSmasherCinematic — same timeline / camera / STRIKE
// beat / _skinAnim tier art) but with Gold's OWN light-saber barrage sprite + a LIGHT (gold) FX palette
// (drawSamuraiFlameSmasherCinematic branches on rosterKey). TIER-SCALING, exactly like Red: the cinematic
// plays the caster's `ultimate` sprite (BASE launcher art untransformed, MEGA launcher art in Mega Mode
// via _skinAnim) and the DAMAGE scales the same way (base 340 / Mega 460) at the guaranteed STRIKE beat.
const GOLD_ULT_BASE_DMG = 340
const GOLD_ULT_MEGA_DMG = 460   // ≈ base × 1.35, matching the Mega tier relationship
function applyGoldSamuraiUltimateDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const mega = !!fighter?._megaActive
  let dmg = mega ? GOLD_ULT_MEGA_DMG : GOLD_ULT_BASE_DMG
  dmg = Math.round(dmg * (fighter?._ultDamageMult ?? 1))   // Morpher Call-In assist scaling (1 = normal self-cast)
  if (opp.isBlocking) {
    dmg = Math.round(dmg * 0.25)
    opp.blockstun = Math.max(opp.blockstun || 0, 20)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 40)
    opp.vx = (fighter.facing || 1) * 13; opp.vy = -7
    opp.colorFlash = 14; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 46)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)   // GUARANTEED sure-hit (range-independent)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2, ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 22, maxTimer: 22,
      category: opp.isBlocking ? "light" : "ultimate",
      color: opp.isBlocking ? null : "#ffe27a",       // LIGHT gold burst (not fire)
      damage: dmg, lines: opp.isBlocking ? 6 : 20, radius: opp.isBlocking ? 14 : 56,
      ...(opp.isBlocking ? { isBlocking: true } : {})
    })
  }
}
export function executeGoldSamuraiUltimate(fighter, context) {
  if ((fighter?.rosterKey || "").toLowerCase() !== "gold_samurai_ranger") return false
  if (isSamuraiFlameSmasherCinematicActive()) return false     // shares the freeze cinematic with Red
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, SAMURAI_ULT_COST)) return false
  const opp = context?.getOpponent?.(fighter) || null
  fighter.vx = 0
  activateSamuraiFlameSmasherCinematic(fighter, opp, (cineCtx) => applyGoldSamuraiUltimateDamage(fighter, opp, cineCtx))
  return true
}

// GREEN SAMURAI RANGER — "Forest Spear: Verdant Storm" ULTIMATE (Stage 5). REUSES Red/Gold's proven
// freeze-cinematic architecture (activateSamuraiFlameSmasherCinematic — same timeline/camera/STRIKE beat/
// _skinAnim tier art) with Green's OWN leaf-storm barrage sprite + a FOREST (leaf-green) FX palette
// (drawSamuraiFlameSmasherCinematic branches on rosterKey). TIER-SCALING exactly like Red/Gold: the
// cinematic plays the caster's `ultimate` sprite (BASE launcher untransformed, MEGA launcher in Mega Mode
// via _skinAnim) and the DAMAGE scales the same way (base 340 / Mega 460) at the guaranteed STRIKE beat.
const GREEN_ULT_BASE_DMG = 340
const GREEN_ULT_MEGA_DMG = 460   // ≈ base × 1.35, matching the Mega tier relationship
function applyGreenSamuraiUltimateDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const mega = !!fighter?._megaActive
  let dmg = mega ? GREEN_ULT_MEGA_DMG : GREEN_ULT_BASE_DMG
  dmg = Math.round(dmg * (fighter?._ultDamageMult ?? 1))   // Morpher Call-In assist scaling (1 = normal self-cast)
  if (opp.isBlocking) {
    dmg = Math.round(dmg * 0.25)
    opp.blockstun = Math.max(opp.blockstun || 0, 20)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 40)
    opp.vx = (fighter.facing || 1) * 13; opp.vy = -7
    opp.colorFlash = 14; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 46)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)   // GUARANTEED sure-hit (range-independent)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2, ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 22, maxTimer: 22,
      category: opp.isBlocking ? "light" : "ultimate",
      color: opp.isBlocking ? null : "#6bdd52",       // FOREST leaf-green burst (not fire/gold)
      damage: dmg, lines: opp.isBlocking ? 6 : 20, radius: opp.isBlocking ? 14 : 56,
      ...(opp.isBlocking ? { isBlocking: true } : {})
    })
  }
}
export function executeGreenSamuraiUltimate(fighter, context) {
  if ((fighter?.rosterKey || "").toLowerCase() !== "green_samurai_ranger") return false
  if (isSamuraiFlameSmasherCinematicActive()) return false     // shares the freeze cinematic with Red/Gold
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, SAMURAI_ULT_COST)) return false
  const opp = context?.getOpponent?.(fighter) || null
  fighter.vx = 0
  activateSamuraiFlameSmasherCinematic(fighter, opp, (cineCtx) => applyGreenSamuraiUltimateDamage(fighter, opp, cineCtx))
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// OMNI-MAN — "Viltrumite Beatdown" command-normal cancel chain + a free push poke (Stage 2).
// BEATDOWN (Fwd+Heavy → re-tap Heavy): omCombo1 (flying knee) → omCombo2 (downward hook) →
// omComboFin (multi-hit LAUNCHER, string ends). Cancel-on-HIT (Vegeta/Omega pattern): a stage only
// advances if the prior hit CONNECTED — a block or whiff (no _cmdHitLanded) ends the string there.
// Each stage is a real, individually-landable attack; damage reads heavier than the roster average
// (raw-power archetype). FREE POKE: Forward Push (Fwd+Light) — big-pushback spacing shove. Both FREE
// (no Smart Atoms cost): the chain commits via recovery, the poke is cooldown-gated. Neutral
// light/heavy/up/air stay on the normal path (the 5 Stage-2 normals).
// ─────────────────────────────────────────────────────────────────────────────
const OMNIMAN_CMD = {
  omCombo1:   { damage: 58, startup: 6, active: 3, recovery: 11, hitstun: 15, knockbackX: 4, knockbackY: 0,   rangeX: 86, rangeY: 54, rekkaNext: "omCombo2" },
  omCombo2:   { damage: 54, startup: 6, active: 4, recovery: 12, hitstun: 15, knockbackX: 4, knockbackY: -1,  rangeX: 88, rangeY: 52, rekkaNext: "omComboFin" },
  omComboFin: { damage: 95, startup: 7, active: 5, recovery: 22, hitstun: 24, knockbackX: 8, knockbackY: -12, rangeX: 94, rangeY: 58, launcher: true },   // multi-hit launcher — string ends here
}
const OMNIMAN_POKE = {
  omPush: { damage: 46, startup: 6, active: 3, recovery: 14, hitstun: 16, knockbackX: 14, knockbackY: 0, rangeX: 92, rangeY: 52, cd: 26 },   // spacing shove — huge pushback
}

function fireOmniManCmd(fighter, key) {
  const md = OMNIMAN_CMD[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._rekkaBtn     = "heavy"   // the beatdown advances on Heavy
  fighter._cmdHitLanded = false     // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
function fireOmniManPoke(fighter, key) {
  const md = OMNIMAN_POKE[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.cd)   // FREE — cooldown only, no spendEnergy
  fighter._rekkaNext    = null             // the poke is not part of the beatdown chain
  fighter._cmdHitLanded = false
  return true
}

// Grounded command-normal driver (mirrors updateOmegaRangerCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateOmniManCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "omniman" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase = getPhase?.(fighter)

  // Press-EDGES (fresh tap, not a held/buffered button) — a rekka needs a clean re-tap.
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy
  const lightEdge = !!inputState.light && !fighter._cmdPrevLight
  fighter._cmdPrevHeavy = !!inputState.heavy
  fighter._cmdPrevLight = !!inputState.light

  // BEATDOWN CONTINUE — fresh Heavy during the current hit's RECOVERY, only if it CONNECTED. Shared
  // rekkaContinue owns the connect-latch, window-close and cancel-on-whiff/block rule (see combat.js).
  const opp  = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireOmniManCmd(fighter, next)

  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (!canStart || !grounded) return false

  // OPENERS from neutral (grounded). Fwd+Heavy = Beatdown; Fwd+Light = Forward Push. Neutral
  // light/heavy/up/air stay the normal jab/haymaker/launcher/aerial on the normal path.
  if (forward && heavyEdge) return fireOmniManCmd(fighter, "omCombo1")
  if (forward && lightEdge) return fireOmniManPoke(fighter, "omPush")
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// CHROLLO — "BLADE RUSH" command chain (Stage 2). Fwd+Heavy opens chCombo1 (a rushing
// punch string) → re-tap Heavy during recovery, cancel-on-HIT → chComboFin (an extended
// side-kick LAUNCHER, string ends). Cancel-on-hit (Omni-Man/Vegeta pattern): a stage only
// advances if the prior hit CONNECTED — a block or whiff (no _cmdHitLanded) ends the string.
// Deliberately SHORT (2 stages) and un-flashy — Chrollo's base kit is meant to be plain; his
// identity is the Skill Hunter ultimate. FREE (no energy): the chain commits via recovery.
// Neutral light/heavy/up/air stay on the normal path (the 5 Stage-2 normals).
// ─────────────────────────────────────────────────────────────────────────────
const CHROLLO_CMD = {
  chCombo1:   { damage: 50, startup: 6, active: 4, recovery: 12, hitstun: 16, knockbackX: 4, knockbackY: 0,   rangeX: 82, rangeY: 52, rekkaNext: "chComboFin" },
  chComboFin: { damage: 80, startup: 7, active: 5, recovery: 22, hitstun: 22, knockbackX: 7, knockbackY: -11, rangeX: 96, rangeY: 56, launcher: true },   // extended side-kick launcher — string ends here
}

function fireChrolloCmd(fighter, key) {
  const md = CHROLLO_CMD[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._rekkaBtn     = "heavy"   // the Blade Rush advances on Heavy
  fighter._cmdHitLanded = false     // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}

// Grounded command-normal driver (mirrors updateOmniManCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateChrolloCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "chrollo" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase = getPhase?.(fighter)

  // Press-EDGE (fresh tap, not a held/buffered button) — a rekka needs a clean re-tap.
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy
  fighter._cmdPrevHeavy = !!inputState.heavy

  // BLADE RUSH CONTINUE — fresh Heavy during the current hit's RECOVERY, only if it CONNECTED. Shared
  // rekkaContinue owns the connect-latch, window-close and cancel-on-whiff/block rule (see combat.js).
  const opp  = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireChrolloCmd(fighter, next)

  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (!canStart || !grounded) return false

  // OPENER from neutral (grounded). Fwd+Heavy = Blade Rush. Neutral light/heavy/up/air stay normal.
  if (forward && heavyEdge) return fireChrolloCmd(fighter, "chCombo1")
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// CHROLLO SPECIALS (Stage 3) — SPECIAL button, direction-branched via _specialHeldDir (Killua/Batman
// architecture). Both use REAL unextracted master-sheet art surfaced in the Stage-3 close pass — the
// base kit is otherwise deliberately plain, and the neck-stab "manipulation" move does NOT exist in the
// art (confirmed absent, NOT fabricated):
//   Neutral / Forward = NEN BOLT — the forward blue-orb thrust cast (chNenCast, specialmove_part2) plays
//                       while a traveling blue nen CONSTRUCT projectile (16f) flies straight. 25.
//   Down              = BLADE LUNGE — a committed forward knife-thrust lunge (chBladeLunge, 5f). 25.
// ─────────────────────────────────────────────────────────────────────────────
const CHROLLO_BLADE_MD = { damage: 78, startup: 6, active: 5, recovery: 18, hitstun: 20, blockstun: 11, knockbackX: 9, knockbackY: -3, rangeX: 104, rangeY: 56, isSpecial: true }

export function executeChrolloSpecial(fighter, context) {
  if (!fighter || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const dir = fighter._specialHeldDir || null
  return dir === "D" ? fireChrolloBladeLunge(fighter, context)
                     : fireChrolloNenBolt(fighter, context)
}

// NEUTRAL/FWD — Nen Bolt: the forward blue-orb thrust CAST pose plays while a traveling blue nen
// construct projectile releases mid-motion and flies straight. Chrollo's ranged poke.
function fireChrolloNenBolt(fighter, context) {
  if (!spendEnergy(fighter, fighter.specials?.nenBolt?.cost ?? 25)) return false
  fighter._spriteCastMove  = "chNenCast"   // 4f forward orb-thrust (specialmove_part2)
  fighter._spriteCastTimer = 20
  fighter.attackCooldown   = getAttackDuration(26, fighter)
  const face = fighter.facing || 1
  // Release on the thrust's forward beat (~frame 3 of the 4f cast).
  schedulePendingSpawn(6, () => {
    spawnProjectile(fighter, "chrollo_nenbolt", {
      sheet: "./chrollo_nenbeast_uniform.png", spriteFrames: 16, spriteW: 70, spriteH: 33, spriteSpeed: 2, spriteScale: 1.7,
      damage: 60, speed: 12, hitstun: 18, knockbackX: 7, knockbackY: -2,
      w: 60, h: 34, color: "#2ea9d6", lifetime: 130, isSpecial: true,
      vx: face * 12, spawnY: fighter.y + (fighter.h || 100) * 0.4
    }, context)
  })
  return true
}

// DOWN — Blade Lunge: a committed forward knife-thrust lunge (real 5f thrust art). A gap-closing stab.
function fireChrolloBladeLunge(fighter, context) {
  if (!spendEnergy(fighter, fighter.specials?.bladeLunge?.cost ?? 25)) return false
  const md = CHROLLO_BLADE_MD
  const attack = createAttackFromMove(fighter, "chBladeLunge", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove "chBladeLunge" → the thrust pose
  fighter.vx = (fighter.facing || 1) * 15   // lunge forward through the thrust
  shakeCamera(context, 3, 6)
  return true
}

// ═════════════════════════════════════════════════════════════════════════════
// CHROLLO — "SKILL HUNTER" ULTIMATE (Stage 5). Chrollo's whole identity: a LIVE transform into a full
// copy of the CURRENT OPPONENT — their normals, specials, their OWN ultimate, AND their transformations
// all become his for 30 seconds. Built on the SAME proven live character-data swap machinery as
// Tobirama's Edo Tensei (applyEdoTensei), but Chrollo-OWNED so Edo Tensei stays untouched, with 3 deltas:
//   • VESSEL = the live opponent (context.getOpponent), NOT a pre-match pick → no vessel-select UI.
//   • UNLOCK GATE = the opponent must land 3 DISTINCT moves on Chrollo first (combat.trackSkillHunterUnlock
//     sets _shUnlocked). Activation ALSO costs 100 energy. The unlock is CONSUMED per use (re-earn 3).
//   • NO reanim palette (Chrollo becomes a NORMAL-coloured copy); a FIXED 30s timer (not an energy drain);
//     re-press Ultimate = manual early-end (handled in game.js before the ultimate dispatch).
// Copies transformations + transformationOrder + specials/passive ON TOP of the Edo field list so the
// stolen kit truly includes the opponent's FORMS (Chrollo-as-Goku can SSJ, Chrollo-as-Megumi can summon
// Mahoraga, …). Reuses the generic _edoClearTransient / _edoCleanseVesselState helpers (despite the name,
// they are character-agnostic). Post-swap the fighter's rosterKey IS the opponent's, so triggerSpecial/
// triggerUltimate dispatch to the opponent's REAL handlers with zero per-move wiring (the whole point).
// ═════════════════════════════════════════════════════════════════════════════
// Explicit list (NOT a spread of EDO_SWAP_FIELDS — that const is defined later in the file, so spreading
// it here would hit its temporal-dead-zone at module load). = EDO_SWAP_FIELDS + Chrollo's extras (the
// form system + specials/passive/archetypes) so the stolen kit is truly complete.
const SKILL_HUNTER_FIELDS   = ["rosterKey", "name", "color", "basic_attacks", "animationData", "spriteScale", "traits", "ultimate", "dashTeleport", "runWhenAdvancing", "introPool", "maxEnergy", "energyType", "transformations", "transformationOrder", "specials", "passive", "archetypes", "primary", "secondary", "hasSprites"]
const SKILL_HUNTER_DURATION = 30 * 60   // 30s @60fps — FIXED timer (user-chosen)
const SKILL_HUNTER_COST     = 100       // standard ultimate-tier energy cost, ON TOP of the 3-distinct-move unlock

// Resolve a valid, STABLE copy target from the live opponent. Blocks mirror match + transient states.
function chrolloSkillHunterTarget(fighter, context) {
  const opp = context?.getOpponent?.(fighter)
  if (!opp) return null
  const key = (opp.rosterKey || "").toLowerCase()
  if (!key || key === "chrollo") return null      // mirror match → no-op
  if (!characters[key]) return null               // opponent in a transient non-character rosterKey → abort
  if (opp._canvasHeightFrac) return null           // don't copy a giant-form transient scale state
  return key
}

export function applySkillHunter(fighter, targetKey) {
  const target = characters[targetKey]
  if (!target) return false
  // 1) stash Chrollo's originals (+ skin state) for the revert
  const stash = {}
  for (const k of SKILL_HUNTER_FIELDS) stash[k] = fighter[k]
  stash._skinAnim = fighter._skinAnim; stash._recolorTag = fighter._recolorTag; stash._baseSkinAnim = fighter._baseSkinAnim
  fighter._shStash = stash
  // 2) overwrite with the target's FULL kit — everything the moveset/render pipeline reads off the fighter
  fighter.rosterKey        = targetKey
  fighter.name             = target.name || targetKey
  fighter.color            = target.color || fighter.color
  fighter.basic_attacks    = target.basic_attacks || fighter.basic_attacks
  fighter.animationData    = target.animationData || fighter.animationData
  fighter.spriteScale      = target.spriteScale ?? fighter.spriteScale
  fighter.traits           = target.traits || fighter.traits
  fighter.ultimate         = target.ultimate || fighter.ultimate
  fighter.specials         = target.specials || fighter.specials
  fighter.passive          = target.passive || fighter.passive
  fighter.archetypes       = target.archetypes || fighter.archetypes
  fighter.primary          = target.primary || fighter.primary
  fighter.secondary        = target.secondary || fighter.secondary
  fighter.dashTeleport     = !!target.movement?.dashTeleport
  fighter.runWhenAdvancing = !!target.movement?.runWhenAdvancing
  fighter.introPool        = target.introPool || null
  fighter.hasSprites       = target.hasSprites !== false
  // Copy the FORM system so the stolen kit includes transformations (SSJ / Susanoo / Mahoraga / Godspeed).
  // Reset currentForm/transformIndex to the BASE form so escalation works from scratch.
  fighter.transformations     = target.transformations || null
  fighter.transformationOrder = target.transformationOrder || null
  fighter.currentForm         = (target.transformationOrder && target.transformationOrder[0]) || null
  fighter.transformIndex      = target.transformationOrder ? 0 : null
  // NO reanim recolor — Chrollo becomes a NORMAL-coloured copy. Drop any inherited skin override.
  fighter._skinAnim = null; fighter._baseSkinAnim = null; fighter._recolorTag = null
  fighter.maxEnergy  = target.stats?.maxEnergy || fighter.maxEnergy || 130
  fighter.energyType = target.traits?.energyType || fighter.energyType
  fighter.energy     = fighter.maxEnergy    // fresh bar so the stolen kit (specials/forms/ultimate) is usable
  // 3) clean transient state + reset the sprite handler so it re-resolves against the copy's anim
  _edoClearTransient(fighter)
  fighter._shActive = true
  fighter._shTimer  = SKILL_HUNTER_DURATION
  fighter._shTarget = targetKey
  fighter.ultimateCooldown = 0
  clearInputBuffer(fighter)
  fighter.teleportFlash = 12
  return true
}

export function revertSkillHunter(fighter) {
  if (!fighter?._shActive || !fighter._shStash) return false
  const s = fighter._shStash
  _edoCleanseVesselState(fighter)                        // wipe any stolen form/buff BEFORE restoring Chrollo's fields
  for (const k of SKILL_HUNTER_FIELDS) fighter[k] = s[k]
  fighter._skinAnim = s._skinAnim || null; fighter._recolorTag = s._recolorTag || null; fighter._baseSkinAnim = s._baseSkinAnim || null
  _edoClearTransient(fighter)                            // clears own attack/cast state (NOT hitstun/knockback → non-exploitable)
  fighter._shActive = false; fighter._shStash = null; fighter._shTarget = null; fighter._shTimer = 0
  fighter.energy = 0                                     // spent the heist
  // CONSUME the unlock — the opponent must land 3 NEW distinct moves to Skill Hunter again.
  fighter._shUnlocked = false
  if (fighter._shMovesSeen) fighter._shMovesSeen.clear()
  clearInputBuffer(fighter)
  fighter.teleportFlash = 14
  return true
}

// Fixed-timer window driver (called every frame from game.js updatePlayerCombat). Counts the 30s window
// down; on expiry → revert. (The drain PAUSES automatically during any nested cinematic because
// updateBattle returns early before updatePlayerCombat while a cinematic runs.)
export function updateSkillHunter(fighter) {
  if (!fighter || !fighter._shActive) return
  if (fighter._shTimer > 0) fighter._shTimer--
  if (fighter._shTimer <= 0) revertSkillHunter(fighter)
}

// Manual early-end — re-press Ultimate during the copied form (game.js intercepts the ult press).
export function endSkillHunterWindow(fighter) {
  if (!fighter?._shActive) return false
  return revertSkillHunter(fighter)
}

export function isChrolloSkillHunterActive(fighter) { return !!fighter?._shActive }
// HUD/harness read: is the unlock earned (3 distinct opponent moves landed) but not yet spent?
export function isChrolloSkillHunterReady(fighter) { return !!(fighter && fighter._shUnlocked && !fighter._shActive) }
export function chrolloDistinctMovesLanded(fighter) { return fighter && fighter._shMovesSeen ? fighter._shMovesSeen.size : 0 }

// ─────────────────────────────────────────────────────────────────
// TRANSFORMATION JUTSU (Naruto universe) — Tier 1 Disguise / Tier 2 Full Copy
// ─────────────────────────────────────────────────────────────────
// Reuses the Skill Hunter field-swap ENGINE but with its OWN state (_tj*) so it NEVER inherits
// Chrollo's purple SKILL_HUNTER_TINT or 3-move unlock — no shared-code conflict. Motion-input
// activated (per-char TRANSFORM_JUTSU_MOTIONS); target = the opponent.
//   Tier 1 (Disguise): swaps ONLY the visual fields → rosterKey/basic_attacks/specials/ultimate/traits/
//     stats are UNTOUCHED, so move dispatch + damage stay the caster's own (provably no stat/move change).
//   Tier 2 (Full Copy, Stage 3): full SKILL_HUNTER_FIELDS swap.
const TJ_DISGUISE_FIELDS = ["name", "color", "spriteScale"]
const TJ_TIER1_COST = 25
const TJ_TIER2_COST = 100
const TJ_DURATION   = 20 * 60   // 20s window, auto-revert

function transformJutsuTarget(fighter, context) {
  const opp = context?.getOpponent?.(fighter)
  if (!opp) return null
  const key = (opp.rosterKey || "").toLowerCase()
  if (!key || key === (fighter.rosterKey || "").toLowerCase()) return null   // mirror → no-op
  if (!characters[key]) return null                                          // opponent in a transient rosterKey → abort
  if (opp._canvasHeightFrac) return null                                     // don't copy a giant-form transient scale
  return key
}

export function applyTransformDisguise(fighter, targetKey) {
  const target = characters[targetKey]
  if (!target) return false
  const stash = {}
  for (const k of TJ_DISGUISE_FIELDS) stash[k] = fighter[k]
  stash._skinAnim = fighter._skinAnim; stash._recolorTag = fighter._recolorTag; stash._baseSkinAnim = fighter._baseSkinAnim
  fighter._tjStash = stash
  // VISUAL ONLY. rosterKey / basic_attacks / specials / ultimate / traits / stats deliberately UNTOUCHED.
  // Appearance is driven through the _skinAnim body-swap channel (the render resolves via
  // _getAction(rosterKey, action, _skinAnim) — NOT fighter.animationData), the same lever Hisoka
  // Overdrive / Susanoo levels use. rosterKey stays the caster's, so move dispatch is unchanged.
  fighter.name         = target.name || targetKey
  fighter.color        = target.color || fighter.color
  fighter.spriteScale  = target.spriteScale ?? fighter.spriteScale
  fighter._skinAnim     = target.animationData || fighter._skinAnim   // ← the disguise
  fighter._baseSkinAnim = fighter._skinAnim; fighter._recolorTag = null
  _tjResetSpriteHandler(fighter)   // force the handler to re-resolve _actionDef against the new _skinAnim
  fighter._tjActive = true; fighter._tjTier = 1; fighter._tjTarget = targetKey; fighter._tjTimer = TJ_DURATION
  fighter.teleportFlash = 10
  return true
}

// Reset the sprite handler so it re-resolves its cached _actionDef against freshly-swapped animationData
// (the handler only re-resolves when currentAction changes — sprite.js — so an idle→idle swap is stale
// without this). Same trick _edoClearTransient uses.
function _tjResetSpriteHandler(fighter) {
  const h = fighter.spriteHandler
  if (h) { h.currentAction = null; h.frameIndex = 0; h.frameTimer = 0; h.locked = false }
}

export function revertTransformJutsu(fighter) {
  if (!fighter?._tjActive || !fighter._tjStash) return false
  const fields = fighter._tjTier === 2 ? SKILL_HUNTER_FIELDS : TJ_DISGUISE_FIELDS
  const s = fighter._tjStash
  if (fighter._tjTier === 2) _edoCleanseVesselState(fighter)   // wipe any copied form/buff before restore (Tier 2 only)
  for (const k of fields) fighter[k] = s[k]
  fighter._skinAnim = s._skinAnim || null; fighter._recolorTag = s._recolorTag || null; fighter._baseSkinAnim = s._baseSkinAnim || null
  if (fighter._tjTier === 2) _edoClearTransient(fighter)
  _tjResetSpriteHandler(fighter)   // re-resolve back to the caster's own art
  fighter._tjActive = false; fighter._tjTier = 0; fighter._tjTarget = null; fighter._tjTimer = 0; fighter._tjStash = null
  fighter.teleportFlash = 12
  return true
}

// Per-frame timer driver (called from game.js alongside the other buff-mode systems).
export function updateTransformJutsu(fighter) {
  if (!fighter || !fighter._tjActive) return
  if (fighter._tjTimer > 0) fighter._tjTimer--
  if (fighter._tjTimer <= 0) revertTransformJutsu(fighter)
}
export function isTransformJutsuActive(fighter) { return !!fighter?._tjActive }
export function transformJutsuTier(fighter) { return fighter?._tjActive ? (fighter._tjTier || 0) : 0 }

// Tier 2 — FULL COPY: swap the entire kit (same fields as Skill Hunter) so the caster gains the
// copied character's real moves/forms/stats. PARALLEL to applySkillHunter but with _tj* state (its
// OWN stash/flag/timer) — no shared mutable state, so it never conflicts with Chrollo's mechanic.
export function applyTransformFullCopy(fighter, targetKey) {
  const target = characters[targetKey]
  if (!target) return false
  const stash = {}
  for (const k of SKILL_HUNTER_FIELDS) stash[k] = fighter[k]
  stash._skinAnim = fighter._skinAnim; stash._recolorTag = fighter._recolorTag; stash._baseSkinAnim = fighter._baseSkinAnim
  fighter._tjStash = stash
  // Full kit — everything the moveset/render pipeline reads off the fighter (mirrors applySkillHunter).
  fighter.rosterKey        = targetKey
  fighter.name             = target.name || targetKey
  fighter.color            = target.color || fighter.color
  fighter.basic_attacks    = target.basic_attacks || fighter.basic_attacks
  fighter.animationData    = target.animationData || fighter.animationData
  fighter.spriteScale      = target.spriteScale ?? fighter.spriteScale
  fighter.traits           = target.traits || fighter.traits
  fighter.ultimate         = target.ultimate || fighter.ultimate
  fighter.specials         = target.specials || fighter.specials
  fighter.passive          = target.passive || fighter.passive
  fighter.archetypes       = target.archetypes || fighter.archetypes
  fighter.primary          = target.primary || fighter.primary
  fighter.secondary        = target.secondary || fighter.secondary
  fighter.dashTeleport     = !!target.movement?.dashTeleport
  fighter.runWhenAdvancing = !!target.movement?.runWhenAdvancing
  fighter.introPool        = target.introPool || null
  fighter.hasSprites       = target.hasSprites !== false
  fighter.transformations     = target.transformations || null
  fighter.transformationOrder = target.transformationOrder || null
  fighter.currentForm         = (target.transformationOrder && target.transformationOrder[0]) || null
  fighter.transformIndex      = target.transformationOrder ? 0 : null
  fighter._skinAnim = null; fighter._baseSkinAnim = null; fighter._recolorTag = null   // normal-coloured copy (drop caster's skin)
  fighter.maxEnergy  = target.stats?.maxEnergy || fighter.maxEnergy || 130
  fighter.energyType = target.traits?.energyType || fighter.energyType
  // BALANCE: do NOT refill to full on copy. The caster's remaining pool (already reduced by the 100
  // activation cost) CARRIES OVER, clamped to the copied max — so activating at low energy leaves you
  // low, and a copied ULTIMATE can't be fired instantly off a free full bar. (Unlike Chrollo's Skill
  // Hunter, which grants a fresh bar; that mechanic is untouched.)
  fighter.energy     = Math.min(fighter.energy || 0, fighter.maxEnergy)
  _edoClearTransient(fighter)
  _tjResetSpriteHandler(fighter)
  fighter._tjActive = true; fighter._tjTier = 2; fighter._tjTarget = targetKey; fighter._tjTimer = TJ_DURATION
  fighter.ultimateCooldown = 0
  clearInputBuffer(fighter)
  fighter.teleportFlash = 14
  return true
}

// Motion-input entry point. tier 1 = Disguise (cheap, visual-only). tier 2 = Full Copy (expensive).
function fireTransformJutsu(fighter, context, tier) {
  if (fighter._tjActive) return false                       // already transformed
  const targetKey = transformJutsuTarget(fighter, context)
  if (!targetKey) return false                              // no valid opponent (mirror / transient)
  const cost = tier === 2 ? TJ_TIER2_COST : TJ_TIER1_COST
  if (!spendEnergy(fighter, cost)) return false
  spawnClonePuff(fighter.x + (fighter.w || 60) / 2, fighter.y + (fighter.h || 100) / 2)   // henge transform smoke (shared poof)
  fighter.teleportFlash = 12
  fighter.attackCooldown = getAttackDuration(tier === 2 ? 20 : 14, fighter)
  return tier === 2 ? applyTransformFullCopy(fighter, targetKey) : applyTransformDisguise(fighter, targetKey)
}

// Per-character motion bindings (like BETA_SPECIAL_MOTIONS). tier2 checked before tier1. Motions are
// chosen collision-free per char (avoiding double-FORWARD for Minato, whose F→F is his teleport blink).
const TRANSFORM_JUTSU_MOTIONS = {
  // Both motions use THREE DISTINCT directions so neither repeats a direction — a repeated direction is a
  // double-tap, which triggers a dash (or Minato's F→F teleport) and corrupts the input. Tier 1 = HCB
  // (→↓←), Tier 2 = DBF (↓←→). Both have a single forward tap (Minato-safe) and are collision-free per char.
  naruto:   { tier1: "hcb", tier2: "dbf" },
  sasuke:   { tier1: "hcb", tier2: "dbf" },
  itachi:   { tier1: "hcb", tier2: "dbf" },
  tobirama: { tier1: "hcb", tier2: "dbf" },
  minato:   { tier1: "hcb", tier2: "dbf" }
}
// Shared dispatcher — call at the TOP of each Naruto-universe executeXSpecial. Additive: on a failed
// gate it returns false and the normal special routing continues.
function tryTransformJutsu(fighter, context) {
  const key = (fighter.rosterKey || "").toLowerCase()
  const m = TRANSFORM_JUTSU_MOTIONS[key]
  if (!m || fighter._tjActive) return false                 // no binding, or already transformed
  if (m.tier2 && detectMotion(fighter, m.tier2) && fireTransformJutsu(fighter, context, 2)) { clearMotionHistory(fighter); return true }
  if (m.tier1 && detectMotion(fighter, m.tier1) && fireTransformJutsu(fighter, context, 1)) { clearMotionHistory(fighter); return true }
  return false
}

export function executeChrolloUltimate(fighter, context) {
  if (fighter._shActive || isChrolloSkillHunterCinematicActive()) return false   // already copying / mid-cinematic
  if (!fighter._shUnlocked) return false                                          // GATE: opponent must land 3 distinct moves first
  const targetKey = chrolloSkillHunterTarget(fighter, context)
  if (!targetKey) return false                                                    // no valid opponent to copy (mirror / transient)
  if (!spendEnergy(fighter, SKILL_HUNTER_COST)) return false                       // standard ultimate energy cost ON TOP of the unlock
  fighter.attacking = false; fighter.currentMove = null; fighter.currentAttack = null; fighter.isCharging = false
  // Hold the transformation pose (book windup → purple robe swirl) through the freeze cinematic; the
  // body-swap (applySkillHunter) fires at the cinematic's SWAP beat via onResolve.
  fighter._spriteCastMove = "chSkillHunterCast"; fighter._spriteCastTimer = 120
  // VOICE: Skill Hunter / Switch — fires EXACTLY ONCE here at the activation beat, BEFORE the body-swap
  // (applySkillHunter) runs at the cinematic's SWAP frame. The fighter is still Chrollo now, so this uses
  // Chrollo's voice; after the swap any barks belong to the COPIED character, so the two never overlap.
  try { sound?.playSfxFile?.(pickChrolloVoice("ultActivate"), null) } catch (_) {}
  activateChrolloSkillHunterCinematic(fighter, context?.getOpponent?.(fighter),
    () => applySkillHunter(fighter, targetKey))
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// OMNI-MAN — FLIGHT (Stage 3): a TOGGLEABLE movement MODE that REPLACES the jump. While active,
// Smart Atoms (the shared energy pool) drains SLOWLY per-frame; specials draw from the SAME pool, so
// casting mid-flight shortens flight time. If Smart Atoms hits 0 while airborne, a DEDICATED forced-
// descent sequence fires: he crashes from the sky (forcedDescent sprite) and eats a landing-recovery
// vulnerability window on impact.
//
// ADAPTATION NOTE (asked for in the brief): the per-frame drain PRIMITIVE — the shared
// tickSustainedFormDrain helper — extends CLEANLY to a movement mode: it's generic over an `active`
// predicate + a `revert` callback, decoupled from the transformation framework. Here `active` =
// `_flightActive` and `revert` = triggerOmniManForcedDescent (NOT a form-swap). The transformation
// FRAMEWORK itself (characters.js transformations / updateTransformations / form multipliers / body-
// swap) does NOT fit and is deliberately bypassed — flight is a movement toggle, not a character form.
// The movement itself lives in physics.moveFighter (a flight branch) + physics.applyGravity (hover =
// no gravity); this file owns the drain, the toggle, and the forced-descent state machine.
// ─────────────────────────────────────────────────────────────────────────────
const OMNIMAN_FLIGHT_DRAIN      = 0.08   // Smart Atoms/frame while flying (~4.8/s → ~42s from a full 200). MUCH gentler than any ultimate-tier drain (Godspeed/Rose 0.30, SSJ Blue 0.28, SSJ 0.18): sustained everyday movement, not a ticking clock.
const OMNIMAN_DESCENT_RECOVERY  = 42     // landing-recovery vulnerability frames after a forced crash-down — long/dramatic: fully committed, cannot act or block.
const OMNIMAN_FLIGHT_LIFTOFF    = -6     // upward nudge when flight engages from the ground (lifts him off into the hover).

// Flight is no longer Omni-Man-exclusive: any character whose def carries traits.canFly reuses this
// exact system (Omni-Man + Superman). Gate on the trait, not the rosterKey, so adding a flyer is a
// one-field change. Character-SPECIFIC flavor (e.g. Omni-Man's cast bark) still branches on rosterKey.
function canUseFlightSystem(fighter) { return !!(fighter && fighter.traits?.canFly) }

export function isOmniManFlying(fighter) { return !!fighter?._flightActive }
// TRUE during the crash tumble AND the landing-recovery window — the fully-locked "ran out of power" state.
export function isOmniManForcedDescent(fighter) { return !!(fighter?._forcedDescent) || (fighter?._descentLandTimer || 0) > 0 }

// TOGGLE (bound to the P / charge-button EDGE in game.js — Omni-Man never hold-charges). No-op while
// crashing/recovering, in hitstun/blockstun/knockdown, or with no juice to take off.
export function toggleOmniManFlight(fighter) {
  if (!canUseFlightSystem(fighter)) return false
  if (isOmniManForcedDescent(fighter)) return false
  if ((fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0 || fighter.knockdownState) return false
  if (!fighter._flightActive && (fighter.energy || 0) <= OMNIMAN_FLIGHT_DRAIN) return false   // no Smart Atoms to lift off
  fighter._flightActive = !fighter._flightActive
  if (fighter._flightActive) {
    // ENGAGE: lift off into the hover (free aerial movement REPLACES the jump arc from here).
    fighter.onGround = false; fighter.grounded = false
    fighter.isLaunched = false; fighter.jumpCount = 0
    if ((fighter.vy || 0) >= 0) fighter.vy = OMNIMAN_FLIGHT_LIFTOFF
    // Flight-flavored cast bark on ACTIVATION, cooldown-gated (5s) so rapid re-toggling can't spam it
    // (audio-only; no gameplay effect). Omni-Man ("I go where I please") and Superman (shared cast pool)
    // both draw from their respective cast pools.
    const _rk = (fighter.rosterKey || "").toLowerCase()
    if (_rk === "omniman" || _rk === "superman") {
      const _now = (typeof performance !== "undefined" ? performance.now() : 0)
      if (!fighter._flightVoiceAt || _now - fighter._flightVoiceAt > 5000) {
        fighter._flightVoiceAt = _now
        const _clip = _rk === "superman" ? pickSupermanVoice("cast") : pickOmniManVoice("cast")
        try { sound?.playSfxFile?.(_clip, null) } catch (_) {}
      }
    }
  }
  // DISENGAGE: nothing punitive — gravity resumes next frame and he falls/lands normally (no penalty).
  return true
}

// Hard reset of ALL flight state (round start / match reset / cleanup) — clears the hover, the crash,
// and the landing-recovery timer so nothing leaks across rounds.
export function forceRevertOmniManFlight(fighter) {
  if (!fighter) return
  fighter._flightActive = false
  fighter._forcedDescent = false
  fighter._descentLandTimer = 0
  fighter._flightTogglePrev = false
}

// Forced descent — the "ran out of Smart Atoms" crash. Used as the drain `revert` at 0 energy.
export function triggerOmniManForcedDescent(fighter) {
  if (!fighter) return
  fighter._flightActive = false
  // Only a real crash if genuinely airborne; at ground level just drop the flight flag cleanly.
  if (fighter.onGround || fighter.grounded) { fighter._forcedDescent = false; return }
  fighter._forcedDescent = true
  fighter.attacking = false; fighter.currentAttack = null; fighter.currentMove = null
  fighter._spriteCastMove = null; fighter._spriteCastTimer = 0
  fighter.vy = Math.max(fighter.vy || 0, 2)   // begin the tumble downward
}

// Per-frame flight system (called from updateFighterState BEFORE applyGravity). Drain → forced
// descent → landing recovery. Regen is suppressed while flying (game.js) so the pool truly depletes.
export function applyOmniManFlightSystem(fighter) {
  if (!canUseFlightSystem(fighter)) return
  // KNOCKED OUT OF THE SKY: a hard knockdown ends flight cleanly (he drops and falls normally). A plain
  // hit does NOT (he's a durable powerhouse) — only a true knockdown breaks the hover.
  if (fighter._flightActive && fighter.knockdownState) fighter._flightActive = false
  // DRAIN while flying (shared pool). Auto-fires the forced descent the frame Smart Atoms runs dry.
  tickSustainedFormDrain(fighter, { active: isOmniManFlying, drainPerFrame: OMNIMAN_FLIGHT_DRAIN, revert: triggerOmniManForcedDescent })
  // CRASH → LANDING: once the tumble reaches the floor, open the landing-recovery vulnerability window.
  if (fighter._forcedDescent && (fighter.onGround || fighter.grounded)) {
    fighter._forcedDescent = false
    fighter._descentLandTimer = OMNIMAN_DESCENT_RECOVERY
    fighter.vx = 0
  }
  // LANDING RECOVERY — fully committed/vulnerable; tick down, then release control.
  if ((fighter._descentLandTimer || 0) > 0) fighter._descentLandTimer--
}

// ─────────────────────────────────────────────────────────────────────────────
// OMNI-MAN SPECIALS (Stage 4) — SPECIAL button, direction-branched via _specialHeldDir (Killua/Batman
// architecture). ALL spend from the SHARED Smart Atoms pool (so casting competes with flight time —
// heavy special usage shortens how long he can stay airborne):
//   Neutral = VILTRUMITE SMASH — a committed super-armored power punch (reuses the heavy pose). 35.
//   Forward = SKEWERING RUSH  — a flying tackle that carries him across the screen (mobility lunge,
//             Batman cape-dash pattern). Usable on the GROUND or mid-FLIGHT. 30.
//   Down    = METEOR DROP     — a diving meteor slam that SPIKES the opponent down; airborne/flying it
//             adds a hard downward dive. 40.
// NOTE: the asset batch has no thrown-object / Heat-Vision art → no ranged special (flagged in the map).
// ─────────────────────────────────────────────────────────────────────────────
const OMNIMAN_SMASH_MD  = { damage: 130, startup: 8, active: 5, recovery: 22, hitstun: 26, knockbackX: 12, knockbackY: -3, rangeX: 96,  rangeY: 58, superArmor: true, isSpecial: true }
const OMNIMAN_SKEWER_MD = { damage: 120, startup: 7, active: 6, recovery: 20, hitstun: 24, knockbackX: 14, knockbackY: -4, rangeX: 104, rangeY: 62, isSpecial: true }
const OMNIMAN_METEOR_MD = { damage: 140, startup: 9, active: 5, recovery: 24, hitstun: 26, knockbackX: 8,  knockbackY: 12, rangeX: 92,  rangeY: 66, isSpecial: true, spike: true }

export function executeOmniManSpecial(fighter, context) {
  if (!fighter || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const dir = fighter._specialHeldDir || null
  const ok = dir === "F" ? fireOmniManSkewer(fighter, context)
           : dir === "D" ? fireOmniManMeteor(fighter, context)
           :               fireOmniManSmash(fighter, context)
  if (ok) { try { sound?.playSfxFile?.(pickOmniManVoice("cast"), null) } catch (_) {} }   // Viltrumite cast bark (audio-only)
  return ok
}

// NEUTRAL — Viltrumite Smash: a committed super-armored power punch (reuses the heavy haymaker pose via
// the omSmash→heavy map). Highest single-blow damage; slow + very punishable on whiff (long recovery).
function fireOmniManSmash(fighter, context) {
  if (!spendEnergy(fighter, fighter.specials?.viltrumiteSmash?.cost ?? 35)) return false
  const md = OMNIMAN_SMASH_MD
  const attack = createAttackFromMove(fighter, "omSmash", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove "omSmash" → heavy pose
  shakeCamera(context, 4, 6)
  return true
}

// FORWARD — Skewering Rush: a flying tackle. A committed forward LUNGE (Batman cape-dash pattern) that
// carries him across the screen into a dive-punch. Works on the ground (launches into the tackle) or
// mid-flight. The horizontal velocity burst is what makes it a gap-closer / flight-charge.
function fireOmniManSkewer(fighter, context) {
  if (!spendEnergy(fighter, fighter.specials?.skeweringRush?.cost ?? 30)) return false
  const md = OMNIMAN_SKEWER_MD
  const attack = createAttackFromMove(fighter, "omSkewer", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove "omSkewer" → the flying-tackle streak pose
  fighter.vx = (fighter.facing || 1) * 20   // launch forward across the screen
  if (fighter._flightActive) fighter.vy = 0   // mid-flight: level out into a horizontal skewer
  shakeCamera(context, 4, 7)
  return true
}

// DOWN — Meteor Drop: a diving meteor slam that SPIKES the opponent down (knockbackY +). Airborne or
// flying, it adds a hard downward dive so it crashes down onto grounded foes.
function fireOmniManMeteor(fighter, context) {
  if (!spendEnergy(fighter, fighter.specials?.meteorDrop?.cost ?? 40)) return false
  const md = OMNIMAN_METEOR_MD
  const attack = createAttackFromMove(fighter, "omMeteor", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  attack.spike = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove "omMeteor" → the diving-slam pose
  const airborne = !(fighter.onGround ?? fighter.grounded ?? false)
  if (airborne || fighter._flightActive) { fighter.vy = 10; fighter.vx = (fighter.facing || 1) * 4 }   // dive down-forward
  shakeCamera(context, 5, 8)
  return true
}

// ─────────────────────────────────────────────────────────────────────────
// OMNI-MAN — "Viltrumite Onslaught" ULTIMATE (Stage 5). A frozen cinematic BODY-SLAM built on the SAME
// shared freeze architecture as Beerus/Batman (omnimanBodySlamCinematic.js). Chosen as the LARGEST /
// most elaborate sequence in the batch (combo_where_he_lands_on_his_oppenets, 15f — the widest sheet)
// per the asset-map Step-3 finding: he rockets up and crashes DOWN onto the opponent. Costs half the
// Smart Atoms bar; the guaranteed damage lands at the SLAM connect beat via onImpact. A held block
// chips it (Beerus/Kurama sure-hit shape). Shared pool: the 100 cost competes with flight + specials.
// ─────────────────────────────────────────────────────────────────────────
const OMNIMAN_ULT = { cost: 100, dmg: 340, blockRatio: 0.25 }
function executeOmniManUltimate(fighter, context) {
  if ((fighter.rosterKey || "").toLowerCase() !== "omniman") return false
  if (isOmniManBodySlamCinematicActive()) return false            // already mid-cinematic
  if (!spendEnergy(fighter, OMNIMAN_ULT.cost)) return false
  const opp = getTargetResolver(context)(fighter)
  fighter.vx = 0
  fighter._flightActive = false; fighter._forcedDescent = false; fighter._descentLandTimer = 0   // ult overrides any flight state
  try { sound?.playSfxFile?.(pickOmniManVoice("cast"), null) } catch (_) {}   // Viltrumite ultimate cast bark (audio-only)
  activateOmniManBodySlamCinematic(fighter, opp, (cineCtx) => applyOmniManSlamDamage(fighter, opp, cineCtx))
  return true
}

// PAYOFF: a GUARANTEED, range-independent body slam. A held block (frozen at its pre-cinematic value)
// CHIPS it to 25%; a clean hit deals the full ~340 and SLAMS the opponent to the ground (knockdown).
// Applied once at the SLAM connect beat by the cinematic.
function applyOmniManSlamDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = OMNIMAN_ULT.dmg
  if (blocked) {
    dmg = Math.round(dmg * OMNIMAN_ULT.blockRatio)
    opp.blockstun = Math.max(opp.blockstun || 0, 20)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 34)
    opp.vx = (fighter.facing || 1) * 9; opp.vy = 8            // driven down & away by the slam
    opp.colorFlash = 14; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 42)   // slammed to the ground
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (Kurama sure-hit)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 20, maxTimer: 20,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#ff6a4a",
      damage: dmg, lines: blocked ? 6 : 16, radius: blocked ? 14 : 46,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERMAN ULTIMATE (Stage 5) — "Solar Overload": a frozen cinematic (supermanUltimateCinematic.js) where
// Superman channels green solar energy → dissolves into particles → DETONATES. Costs 100 Solar Energy (the
// full bar); the guaranteed damage lands at the DETONATION beat via onImpact. A held block chips it to 25%
// (Omni-Man/Kurama sure-hit shape). Shared pool: the 100 cost competes with flight + specials + modes.
// ─────────────────────────────────────────────────────────────────────────
const SUPERMAN_ULT = { cost: 100, dmg: 380, blockRatio: 0.25 }
function executeSupermanUltimate(fighter, context) {
  if ((fighter.rosterKey || "").toLowerCase() !== "superman") return false
  if (isSupermanUltimateCinematicActive()) return false            // already mid-cinematic
  if (!spendEnergy(fighter, SUPERMAN_ULT.cost)) return false
  const opp = getTargetResolver(context)(fighter)
  fighter.vx = 0
  fighter._flightActive = false                                    // ult overrides any flight/mode state
  forceRevertSupermanModes(fighter)
  activateSupermanUltimateCinematic(fighter, opp, (cineCtx) => applySupermanUltimateDamage(fighter, opp, cineCtx))
  supermanCastBark(fighter)   // Kryptonian ultimate cast bark (audio-only)
  return true
}

// PAYOFF: a GUARANTEED, range-independent solar detonation. A held block (frozen at its pre-cinematic
// value) CHIPS it to 25%; a clean hit deals the full ~380 and blasts the opponent away (knockdown).
// Applied once at the DETONATION beat by the cinematic.
function applySupermanUltimateDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = SUPERMAN_ULT.dmg
  if (blocked) {
    dmg = Math.round(dmg * SUPERMAN_ULT.blockRatio)
    opp.blockstun = Math.max(opp.blockstun || 0, 20)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 36)
    opp.vx = (fighter.facing || 1) * 12; opp.vy = -6           // blasted away by the detonation
    opp.colorFlash = 14; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 44)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (Kurama sure-hit)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 20, maxTimer: 20,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#39ff88",
      damage: dmg, lines: blocked ? 6 : 18, radius: blocked ? 14 : 50,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
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
// mirroring kurama.js (fox bodyH = ch*0.74). Both stages loom over the opponent, but the WHOLE
// figure — horned head through the energy base — stays framed on-screen (the camera's giant
// zoom-to-fit, camera.js update(), pulls back to include it). Lv2 previously used 1.20 = TALLER
// than the screen, which cut the head off; at giant scale the busy translucent lvl_2 line-art
// then read as several overlapping ghost silhouettes ("4 copies in a purple circle"). 1.00 keeps
// Lv2 looming larger than Lv1 while its horned head clears the HUD band (the giant camera-snap in
// camera.js frames the whole figure instantly on transform).
// SUSANOO_REF_H = the body-frame content height per stage → sprite.js scales EVERY action by
// ch*frac/refH. (Tune these two frac numbers to dial size.)
const SUSANOO_CANVAS_FRAC = { 1: 0.95, 2: 1.00 }
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
function _susanooBody(sheet, width, height, idleStart, idleFrames, speed = 40, guardFrame = null) {
  const cell = { frames: idleFrames, width, height, speed, loop: true, anchorY: 0, sourceX: idleStart * width, sheet }
  const body = {
    idle: cell, walk: cell, run: cell, jump: cell, fall: cell,
    hurt: cell, light: cell, heavy: cell, up: cell, air: cell, down_air: cell,
    grab: cell, dash: cell,
    susanooGrab: cell, susanooSword: cell, susanooArrow: cell, susanooIntro: cell
  }
  // BLOCK/GUARD pose — a DISTINCT, STATIC single frame from this same sheet (a real existing pose, no
  // new art). Without it, sprite.js _resolveAction had no `guard` on _skinAnim and fell through to the
  // calm idle CELL, so holding block just kept the idle loop replaying regardless of input (the reported
  // "looping background overlay" bug). loop:false → the frame HOLDS steady while block is held, and the
  // resolver only picks it while isBlocking is true, so it correctly tracks real block input.
  if (guardFrame != null) body.guard = { frames: 1, width, height, speed, loop: false, anchorY: 0, sourceX: guardFrame * width, sheet }
  return body
}
// Uniform repacked sheets (lvl1 5×231, lvl2 4×247). Idle windows chosen by inter-frame delta scan.
// guardFrame = a distinct braced pose in the SAME sheet (real content): lvl1 frame 4 = arms crossed over
// the ribcage (a true guard stance); lvl2 has no dedicated block frame (all 4 are idle-calm 2–3 / bow-aim
// 0–1), so it HOLDS its most drawn-in frame (3) steady during block — stops the distracting loop even
// though the silhouette matches idle. A bespoke lvl2 block sheet (cf. Itachi's) is a deferred art item.
const SUSANOO_LVL1_ANIM = _susanooBody("./sasuke_susanoo_lvl_1_anim.png", 231, 277, 0, 2, 40, 4)   // calm poses 0–1; guard = frame 4
const SUSANOO_LVL2_ANIM = _susanooBody("./sasuke_susanoo_lvl_2_anim.png", 247, 298, 2, 2, 40, 3)   // calm poses 2–3; guard = frame 3 held

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
    // SHORT recovery (15f, still > the input buffer window (INPUT_BUFFER_FRAMES) so a single tap's lingering buffer
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

// ─────────────────────────────────────────────────────────────────────────
// ITACHI — SUSANOO ULTIMATE  (single-tier, creature-only)
// Mirrors Sasuke's self-managed giant Susanoo, COLLAPSED to one tier (no Lv2
// escalation, no re-press). Reuses the GENERIC engine support: _susanooActive
// (physics half-arena lock), _canvasHeightFrac/_canvasHeightRefH (sprite.js giant
// scale + combat.js giant hurtbox), _skinAnim (giant body). Deliberately does NOT
// set Sasuke's _susanooStage (whose update/voice/motion code is stage-keyed) — Itachi
// tracks its own _itachiSusanoo flag + _itachiSusanooTimer so the two never collide.
// Unlike Sasuke (one pose-atlas + FX attacks), Itachi has full-body creature sheets
// per state, so the body BODY-SWAPS between them (sprite.js resets frameIndex on sheet
// change — the "sheet-swap frame-reset" line). The SPECIAL button swings the giant sword.
// ─────────────────────────────────────────────────────────────────────────
const ITACHI_SUSANOO_CANVAS_FRAC = 0.72   // idle giant ≈ 72% of canvas height (looms; feet planted)
const ITACHI_SUSANOO_REF_H       = 216    // idle body-cell height → sprite.js scale = ch*frac/refH
const _itachiSusCell = (sheet, frames, width, height, speed) => ({ frames, width, height, speed, loop: true, anchorY: 0, sheet })
const ITACHI_SUS_IDLE   = _itachiSusCell("./itachi_susano_creature_idle.png",                  1, 383, 216, 40)
const ITACHI_SUS_BLOCK  = _itachiSusCell("./itachi_susano_creature_block_uniform.png",         2, 360, 228, 30)
const ITACHI_SUS_HURT   = _itachiSusCell("./itachi_susano_creature_took_damage_uniform.png",   2, 362, 234, 8)
const ITACHI_SUS_ATTACK = _itachiSusCell("./itachi_susano_creature_attack_uniform.png",        2, 493, 249, 6)
const ITACHI_SUS_SWORD  = _itachiSusCell("./itachi_susano_creature_sword_uniform.png",         3, 363, 255, 5)
// Every action maps to a full-body creature pose. Normals hold the idle (like Sasuke) — the giant's
// real offense is the SPECIAL sword; hurt/guard swap to their creature states; susanooSword is the swing.
const ITACHI_SUSANOO_ANIM = {
  idle: ITACHI_SUS_IDLE, walk: ITACHI_SUS_IDLE, run: ITACHI_SUS_IDLE, jump: ITACHI_SUS_IDLE,
  fall: ITACHI_SUS_IDLE, dash: ITACHI_SUS_IDLE,
  light: ITACHI_SUS_IDLE, heavy: ITACHI_SUS_IDLE, up: ITACHI_SUS_IDLE, air: ITACHI_SUS_IDLE,
  down_air: ITACHI_SUS_IDLE, grab: ITACHI_SUS_ATTACK,
  hurt: ITACHI_SUS_HURT, guard: ITACHI_SUS_BLOCK,
  susanooSword: ITACHI_SUS_SWORD
}

export function itachiInSusanoo(fighter) { return !!(fighter && fighter._itachiSusanoo) }

export function enterItachiSusanoo(fighter) {
  if (!fighter) return
  if (fighter._mangekyouActive) revertMangekyou(fighter)   // the giant supersedes the buff mode
  fighter._itachiSusanoo      = true
  fighter._itachiSusanooTimer = SUSANOO_DURATION_FRAMES
  fighter.damageMultiplier    = 1.6
  fighter.attackMultiplier    = 1.6
  fighter.defenseMultiplier   = 1.4
  fighter._canvasHeightFrac   = ITACHI_SUSANOO_CANVAS_FRAC   // GENERIC giant scale (sprite.js) + hurtbox (combat.js)
  fighter._canvasHeightRefH   = ITACHI_SUSANOO_REF_H
  fighter._skinAnim           = ITACHI_SUSANOO_ANIM
  fighter._susanooActive      = true                        // GENERIC physics half-arena lock
  fighter.canJump             = false                       // a planted giant doesn't hop
}

// Drop the giant + arm the 20s ultimate recast lockout (the cooldown was suppressed on activation).
export function revertItachiSusanoo(fighter) {
  if (!fighter || !fighter._itachiSusanoo) return
  fighter._itachiSusanoo      = false
  fighter._itachiSusanooTimer = 0
  fighter.damageMultiplier    = 1
  fighter.attackMultiplier    = 1
  fighter.defenseMultiplier   = 1
  fighter._skinAnim           = null
  fighter._canvasHeightFrac   = null
  fighter._canvasHeightRefH   = null
  fighter._susanooActive      = false
  fighter._arenaHalfLock      = null
  fighter.canJump             = true
  fighter.ultimateCooldown    = ULTIMATE_COOLDOWN_FRAMES
}

// Per-frame: tick the sustained-form timer, auto-revert at 0. Hooked in updateTransformationState.
export function updateItachiSusanoo(fighter) {
  if (!fighter || !fighter._itachiSusanoo) return
  if ((fighter._itachiSusanooTimer || 0) > 0) {
    fighter._itachiSusanooTimer--
    if (fighter._itachiSusanooTimer <= 0) revertItachiSusanoo(fighter)
  }
}

// SUSANOO SWORD SLASH — the SPECIAL button while the giant is active. Body swaps to the
// creature_sword swing (full-body pose) with a long reach; a slash-effect FX flashes over the blade.
function executeItachiSusanooSword(fighter, context) {
  const md = { damage: 240, startup: 12, active: 8, recovery: 26, hitstun: 34, knockbackX: 14, knockbackY: -6, rangeX: 300, rangeY: 200 }
  const attack = createAttackFromMove(fighter, "susanooSword", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  // Slash-effect flash over the blade (visualOnly FX; flat yOff since Itachi's giant cell-height
  // differs from Sasuke's SUSANOO_CELL_H table that _susanooArmYOff assumes).
  _spawnSusanooFx(fighter, "./itachi_susano_creature_sword_effect.png",
    { frames: 4, w: 96, h: 190, scale: 2.6, life: 22, drift: 6, yOff: -260, color: "#5ad0ff" }, context)
  sound.playSfxFile?.(pickItachiVoice("susanooSword"), null)   // "Totsuka no Tsurugi"
  shakeCamera(context, 9, 12)
  return true
}

// ITACHI ULTIMATE — summon the single-tier Susanoo. Pays 50% max energy, enters the sustained
// giant for SUSANOO_DURATION_FRAMES. Cooldown is suppressed on activation and armed in revert
// (so the 20s recast lockout starts AFTER the form ends — Sasuke pattern).
function executeItachiUltimate(fighter, context) {
  if (fighter._itachiSusanoo) return false                  // already active (single-tier — no re-press)
  const cost = Math.ceil((fighter.maxEnergy || 100) * 0.5)
  if (!spendEnergy(fighter, cost)) return false
  enterItachiSusanoo(fighter)
  sound.playSfxFile?.(pickItachiVoice("susanoo"), null)     // "Susanoo!" / "Yasakani no Magatama"
  fighter._suppressUltCooldown = true                       // lockout armed in revertItachiSusanoo instead
  fighter.teleportFlash  = Math.max(fighter.teleportFlash || 0, 16)
  fighter.attackCooldown = getAttackDuration(20, fighter)
  focusCameraOnAction(context, fighter, null, 0.9, 20)
  shakeCamera(context, 12, 16)
  return true
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
// SASUKE — HAWK SUMMON (base-kit special, BACK,FORWARD + special)
// ─────────────────────────────────────────────────────────────────
// Sasuke summons his hawk (the Garuda/hawk contract), which SWOOPS across the screen as an
// independent traveling projectile — same architecture as Sasuke's own shuriken poke or Vegeta's
// Galick Gun (spawnProjectile → travels → hits on contact, carries its own hitbox separate from
// Sasuke's hurtbox). On a clean connect it is a LAUNCHER, not a knockdown ender: knockbackY is a
// big NEGATIVE pop that sends the opponent well above a normal up-normal launcher (which clamps to
// vy -17 in physics.launcherAttack) and even above a full jump (-22), so it reads as "an upper, but
// much higher" and opens an air-juggle route. B,F is an OPEN Sasuke motion (D,F=lightning /
// D,B=chidori / D=shuriken / neutral=dash are all taken) so it never collides with the existing
// kit. Cost 30 sits a touch above the 24 lightning and below the 35 chidori, pricing in the
// guaranteed-launch → juggle value. Uses the real sasuke_summon.png art (3 frames: wings-spread →
// folded → folded = a flapping dive); the sheet faces right and drawProjectiles auto-flips it to
// its travel direction, so it always faces the way it flies. ADDITION only — no existing move,
// damage, or slot is touched.
const HAWK = { cost: 30, dmg: 72, launchY: -26 }

function executeSasukeHawkSummon(fighter, target, context) {
  if (!spendEnergy(fighter, HAWK.cost)) return false
  fighter._spriteCastMove  = "shurikenThrow"    // brief summon-gesture pose (no dedicated summon strip)
  fighter._spriteCastTimer = 16
  // The hawk flies FLAT across the screen at chest height (a horizontal glide — the wings-spread
  // art reads as a bird in level flight, and a flat path reliably crosses at the opponent's body
  // height for a clean connect). Forward shot (vx = facing*speed); non-homing, like Galick Gun.
  spawnProjectile(fighter, "sasukeHawk", {
    damage: HAWK.dmg, speed: 13, lifetime: 100,
    hitstun: 34, knockbackX: 4, knockbackY: HAWK.launchY,   // small X, BIG upward pop = launcher
    w: 90, h: 90, color: "#8a5a2b",
    isSpecial: true,
    spawnY: (fighter.y || 0) + (fighter.h || 100) * 0.30,   // chest height → crosses at body level
    sheet: "./sasuke_summon.png", spriteFrames: 3, spriteW: 135, spriteH: 145, spriteSpeed: 5, spriteScale: 0.8
  }, context)
  fighter.attackCooldown = getAttackDuration(24, fighter)
  focusCameraOnAction(context, fighter, target, 0.98, 8)
  shakeCamera(context, 5, 6)
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

// ─────────────────────────────────────────────────────────────────────────────
// ISAAC NETERO — command-normal cancel chain + Barrage Punches special (Stage 3).
// COMMAND CHAIN (Down+Heavy opener → re-tap Heavy during recovery on HIT): down_attck_1 →
// down_attck_2. Same rekka primitive as Vegeta/Toji: setAttackState + _rekkaNext advanced on a
// fresh Heavy during recovery, GATED on _cmdHitLanded so a blocked/whiffed opener ends the string
// (cancel-on-HIT / interrupt-on-whiff). Its own input path — the neutral light/heavy normals are
// untouched (Down modifier is what routes Heavy into the chain).
// ─────────────────────────────────────────────────────────────────────────────
const NETERO_COMMAND = {
  down_attck_1: { damage: 46, startup: 6, active: 4, recovery: 14, hitstun: 15, knockbackX: 3, knockbackY: 0,  rangeX: 78, rangeY: 60, rekkaNext: "down_attck_2" },   // crouch lunge opener
  down_attck_2: { damage: 72, startup: 5, active: 4, recovery: 18, hitstun: 20, knockbackX: 7, knockbackY: -6, rangeX: 84, rangeY: 64 },                              // rising follow-up (mild pop)
}
function fireNeteroCommand(fighter, key, context) {
  const md = NETERO_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
// Grounded command-normal driver (mirrors updateVegetaCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateNeteroCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "netero" || !inputState) return false
  if (fighter._guanyinActive) return false   // giant form has its own attack set (updateNeteroGuanyinCombat)
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)

  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy

  // CONTINUE — fresh Heavy during the opener's RECOVERY, only if it CONNECTED (cancel-on-hit).
  // Shared rekkaContinue owns the connect-latch, window-close and cancel rule (see combat.js).
  const opp = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireNeteroCommand(fighter, next, context)

  // OPENER — Down+Heavy from neutral (grounded). Consumes the press so the normal heavy doesn't also fire.
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && inputState.down && heavyEdge) return fireNeteroCommand(fighter, "down_attck_1", context)

  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// KILLUA ZOLDYCK — the Barrage: a 4-hit cancel-on-hit command-normal chain (Down+Heavy)
// (Stage 2). Killua's signature rapid-punch flurry. Mirrors updateNeteroCommandCombat exactly
// (Down+Heavy opener → re-tap Heavy during recovery to cancel into the next part, gated on a
// clean connect so a whiff/block ENDS the string = the mid-chain interrupt). Assassin pacing:
// low damage per hit, 4 fast hits, barrage4 launches. Each stage's sprite is barrageN (resolved
// via sprite.js currentMove identity → characters.js killua.animationData.barrageN). Neutral
// light/heavy/up/air/down_air stay on the standard normal path (Down is what routes into the chain).
// ─────────────────────────────────────────────────────────────────────────────
// recovery 14 on the non-finisher parts widens the cancel window comfortably past the shared
// input buffer window (INPUT_BUFFER_FRAMES, ~7f) so a clean re-tap always lands a fresh edge during
// recovery; cancel-on-hit
// cuts the recovery short anyway, so it only matters on a whiff/block (fair — a strong rushdown string).
const KILLUA_COMMAND = {
  // knockbackX 1 on the non-finisher parts keeps the target PINNED (a barrage shouldn't shove them
  // out of its own string); the finisher then reaches with rangeX 110 + delivers the launch knockback.
  barrage1: { damage: 26, startup: 5, active: 3, recovery: 14, hitstun: 12, knockbackX: 1, knockbackY: 0,  rangeX: 78, rangeY: 48, rekkaNext: "barrage2" },
  barrage2: { damage: 28, startup: 4, active: 3, recovery: 14, hitstun: 12, knockbackX: 1, knockbackY: 0,  rangeX: 80, rangeY: 48, rekkaNext: "barrage3" },
  barrage3: { damage: 30, startup: 4, active: 3, recovery: 14, hitstun: 13, knockbackX: 1, knockbackY: 0,  rangeX: 82, rangeY: 48, rekkaNext: "barrage4" },
  barrage4: { damage: 55, startup: 5, active: 4, recovery: 18, hitstun: 20, knockbackX: 8, knockbackY: -3, rangeX: 110, rangeY: 52 },   // launcher finisher (extended reach)
}
function fireKilluaCommand(fighter, key, context) {
  const md = KILLUA_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = key === "barrage4"
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the barrageN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
// Grounded command-normal driver (mirrors updateNeteroCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateKilluaCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "killua" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)

  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy

  // CONTINUE — fresh Heavy during the current part's RECOVERY, only if it CONNECTED (cancel-on-hit;
  // a whiff/block leaves _cmdHitLanded false → the chain stops here = mid-chain interrupt). The shared
  // rekkaContinue owns the connect-latch, window-close and cancel rule (see combat.js).
  const opp = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireKilluaCommand(fighter, next, context)

  // OPENER — Down+Heavy from neutral (grounded). Consumes the press so the normal heavy doesn't also fire.
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && inputState.down && heavyEdge) return fireKilluaCommand(fighter, "barrage1", context)

  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// HISOKA — "Card Flourish": a 2-hit cancel-on-hit command-normal chain (Down+Heavy)
// (Stage 2). Mirrors updateKilluaCommandCombat/updateFlashCommandCombat EXACTLY: Down+Heavy opens
// rekka1 (crouch strike), re-tap Heavy during recovery to cancel into rekka2 (extended-reach card-slash
// launcher) — gated on a clean connect, so a whiff/block ENDS the string = the mid-chain interrupt.
// Each stage's sprite is hisokaRekkaN (sprite.js currentMove identity → characters.js animationData).
// Neutral light/heavy/up/air/down_air stay on the standard normal path (Down is what routes into the chain).
// ─────────────────────────────────────────────────────────────────────────────
const HISOKA_COMMAND = {
  // knockbackX 1 on the opener keeps the target PINNED inside the string; the finisher reaches with
  // rangeX 108 (the long card-slash arc) + delivers the launch knockback.
  hisokaRekka1: { damage: 28, startup: 5, active: 3, recovery: 14, hitstun: 12, knockbackX: 1, knockbackY: 0,  rangeX: 80,  rangeY: 50, rekkaNext: "hisokaRekka2" },
  hisokaRekka2: { damage: 52, startup: 5, active: 4, recovery: 17, hitstun: 18, knockbackX: 8, knockbackY: -3, rangeX: 108, rangeY: 52 },   // launcher finisher (extended card-slash reach)
}
function fireHisokaCommand(fighter, key, context) {
  const md = HISOKA_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = key === "hisokaRekka2"
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the hisokaRekkaN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  // VOICE: Card Flourish rekka OPENER only (not the follow-up) — aggressive turn-taking callout (audio-only)
  if (key === "hisokaRekka1") { try { sound.playSfxFile?.(pickHisokaVoice("rekka"), null); fighter._atkVoiceCd = 150 } catch (_) {} }
  return true
}
// Grounded command-normal driver (mirrors updateKilluaCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateHisokaCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "hisoka" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)

  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy

  // CONTINUE — fresh Heavy during the current part's RECOVERY, only if it CONNECTED (cancel-on-hit;
  // a whiff/block leaves _cmdHitLanded false → the chain stops here = mid-chain interrupt). The shared
  // rekkaContinue owns the connect-latch, window-close and cancel rule (see combat.js).
  const opp = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireHisokaCommand(fighter, next, context)

  // OPENER — Down+Heavy from neutral (grounded). Consumes the press so the normal heavy doesn't also fire.
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && inputState.down && heavyEdge) return fireHisokaCommand(fighter, "hisokaRekka1", context)

  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// THE FLASH — "Speed Rush": a 2-hit cancel-on-hit command-normal chain (Down+Heavy)
// (Stage 2). Mirrors updateKilluaCommandCombat EXACTLY (Down+Heavy opener → re-tap Heavy during
// recovery to cancel into the finisher, gated on a clean connect so a whiff/block ENDS the string =
// the mid-chain interrupt). Rushdown pacing: low damage per hit, fast, rush2 launches. Each stage's
// sprite is rushN (resolved via sprite.js currentMove identity → characters.js flash.animationData.rushN).
// Neutral light/heavy/up/air/down_air stay on the standard normal path (Down is what routes into the chain).
// recovery 13 on the opener widens the cancel window past the shared input buffer (~7f); cancel-on-hit
// cuts recovery short anyway, so the window only matters on a whiff/block (fair).
// ─────────────────────────────────────────────────────────────────────────────
const FLASH_COMMAND = {
  // knockbackX 1 on the opener keeps the target PINNED inside the string; the finisher reaches with
  // rangeX 100 + delivers the launch knockback.
  rush1: { damage: 26, startup: 4, active: 3, recovery: 13, hitstun: 12, knockbackX: 1, knockbackY: 0,  rangeX: 82,  rangeY: 50, rekkaNext: "rush2" },
  rush2: { damage: 48, startup: 4, active: 4, recovery: 16, hitstun: 18, knockbackX: 8, knockbackY: -3, rangeX: 100, rangeY: 52 },   // launcher finisher (extended reach)
}
function fireFlashCommand(fighter, key, context) {
  const md = FLASH_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = key === "rush2"
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the rushN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
// Grounded command-normal driver (mirrors updateKilluaCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateFlashCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "flash" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)

  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy

  // CONTINUE — fresh Heavy during the current part's RECOVERY, only if it CONNECTED (cancel-on-hit;
  // a whiff/block leaves _cmdHitLanded false → the chain stops here = mid-chain interrupt).
  const opp = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireFlashCommand(fighter, next, context)

  // OPENER — Down+Heavy from neutral (grounded). Consumes the press so the normal heavy doesn't also fire.
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && inputState.down && heavyEdge) return fireFlashCommand(fighter, "rush1", context)

  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// GON FREECSS — "Rush": a 2-hit cancel-on-hit command-normal chain (Down+Heavy) (Stage 2).
// Mirrors updateFlashCommandCombat EXACTLY: Down+Heavy opener → re-tap Heavy during recovery to
// cancel into the finisher, gated on a clean connect so a whiff/block ENDS the string = the
// mid-chain interrupt. rush1 = rapid second-hit flurry → rush2 = big launching finisher. Neutral
// light/heavy/up/air/down_air stay on the standard normal path (Down is what routes into the chain).
// ─────────────────────────────────────────────────────────────────────────────
const GON_COMMAND = {
  rush1: { damage: 28, startup: 4, active: 3, recovery: 13, hitstun: 12, knockbackX: 1, knockbackY: 0,  rangeX: 84,  rangeY: 52, rekkaNext: "rush2" },
  rush2: { damage: 60, startup: 5, active: 4, recovery: 18, hitstun: 20, knockbackX: 9, knockbackY: -4, rangeX: 104, rangeY: 62 },   // launcher finisher (extended reach)
}
function fireGonCommand(fighter, key, context) {
  const md = GON_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = key === "rush2"
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the rushN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  // VOICE: Rush technique callout on the OPENER only (rush1) — audio-only; _atkVoiceCd suppresses the
  // combat-bark double-up on this chain's connects.
  if (key === "rush1") { try { sound.playSfxFile?.(pickGonVoice("rekka"), null); fighter._atkVoiceCd = 150 } catch (_) {} }
  return true
}
// Grounded command-normal driver (mirrors updateFlashCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateGonCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "gon" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy
  // CONTINUE — fresh Heavy during the current part's recovery, only if it CONNECTED (cancel-on-hit).
  const opp = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireGonCommand(fighter, next, context)
  // OPENER — Down+Heavy from neutral (grounded). Consumes the press so the normal heavy doesn't also fire.
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && inputState.down && heavyEdge) return fireGonCommand(fighter, "rush1", context)
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// BATMAN — "Combo": a 3-hit cancel-on-hit command-normal chain (Down+Heavy) (Stage 2).
// Mirrors updateFlashCommandCombat/updateGonCommandCombat EXACTLY (Down+Heavy opener → re-tap
// Heavy during recovery to cancel into the next stage, gated on a clean connect so a whiff/block
// ENDS the string = mid-chain interrupt). Sourced from the 12-frame standing hand-to-hand string
// (batman_melle_combo_1): batCombo1 (jab opener) → batCombo2 (weave→uppercut) → batCombo3 (extended
// straight finisher, launches). Technical-brawler pacing (moderate per-hit, not spiky/rushdown).
// Neutral light/heavy/up/air/down_air stay on the standard normal path (Down is what routes into the
// chain). Each stage's sprite is batComboN (sprite.js currentMove identity → characters.js animationData).
// ─────────────────────────────────────────────────────────────────────────────
const BATMAN_COMMAND = {
  // knockbackX 1 on the openers keeps the target PINNED inside the string; the finisher reaches with
  // rangeX 96 + delivers the launch knockback.
  batCombo1: { damage: 30, startup: 4, active: 3, recovery: 12, hitstun: 13, knockbackX: 1, knockbackY: 0,  rangeX: 82, rangeY: 54, rekkaNext: "batCombo2" },
  batCombo2: { damage: 36, startup: 4, active: 3, recovery: 12, hitstun: 14, knockbackX: 2, knockbackY: 0,  rangeX: 88, rangeY: 56, rekkaNext: "batCombo3" },
  batCombo3: { damage: 66, startup: 6, active: 4, recovery: 20, hitstun: 22, knockbackX: 9, knockbackY: -4, rangeX: 96, rangeY: 60 },   // extended-straight launcher finisher (string ends here)
}
function fireBatmanCommand(fighter, key, context) {
  const md = BATMAN_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = key === "batCombo3"
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the batComboN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
// Grounded command-normal driver (mirrors updateFlashCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateBatmanCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "batman" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy
  // CONTINUE — fresh Heavy during the current part's recovery, only if it CONNECTED (cancel-on-hit).
  const opp = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireBatmanCommand(fighter, next, context)
  // OPENER — Down+Heavy from neutral (grounded). Consumes the press so the normal heavy doesn't also fire.
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && inputState.down && heavyEdge) return fireBatmanCommand(fighter, "batCombo1", context)
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERMAN — "Kryptonian Rush": a 3-hit cancel-on-hit command-normal chain (Fwd+Heavy) (Stage 2).
// Mirrors updateBatmanCommandCombat, but the opener is FORWARD+Heavy (a forward-committing flying punch
// flurry, Omni-Man pattern): supRush1 (fast flying cross) → re-tap Heavy on hit → supRush2 (flying
// charged jab) → supRushFin (a big charged haymaker that LAUNCHES; string ends here). Cancel-on-hit —
// a whiff/block ENDS the string (mid-chain interrupt). Low knockback on the openers pins the target
// inside the string; the finisher delivers the launch. Free (no Solar Energy cost).
// ─────────────────────────────────────────────────────────────────────────────
const SUPERMAN_COMMAND = {
  supRush1:   { damage: 28, startup: 5, active: 3, recovery: 13, hitstun: 14, knockbackX: 2,  knockbackY: 0,  rangeX: 94,  rangeY: 52, rekkaNext: "supRush2" },
  supRush2:   { damage: 34, startup: 5, active: 3, recovery: 13, hitstun: 15, knockbackX: 2,  knockbackY: 0,  rangeX: 98,  rangeY: 52, rekkaNext: "supRushFin" },
  supRushFin: { damage: 74, startup: 8, active: 4, recovery: 22, hitstun: 24, knockbackX: 13, knockbackY: -6, rangeX: 106, rangeY: 60 },   // charged-haymaker launcher (string ends here)
}
function fireSupermanCommand(fighter, key, context) {
  const md = SUPERMAN_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = key === "supRushFin"
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the supRushN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
export function updateSupermanCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "superman" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy
  // CONTINUE — fresh Heavy during the current part's recovery, only if it CONNECTED (cancel-on-hit).
  const opp = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireSupermanCommand(fighter, next, context)
  // OPENER — Forward+Heavy from neutral (grounded). Consumes the press so the normal heavy doesn't also fire.
  const forward = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && forward && heavyEdge) return fireSupermanCommand(fighter, "supRush1", context)
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERMAN SPECIALS (Stage 3) — SPECIAL button, direction-branched via _specialHeldDir (Killua/Batman
// pattern). Both spend from the SHARED Solar Energy pool (fighter.energy), same as flight:
//   Forward = SUPER FLYING PUNCH — a committed charged dash-strike that carries him across the screen
//             (Omni-Man Skewer pattern; usable on the ground or mid-flight). Launcher. 30.
//   Neutral/Down = HEAT VISION — twin eye-beam PROJECTILE fired from eye height with INDEPENDENT
//             collision (procedural drawKind "heatvision"; no dedicated sprite → braced cast pose). 22.
// ─────────────────────────────────────────────────────────────────────────────
const SUPERMAN_HEATVISION_COST = 22
const SUPERMAN_FLYINGPUNCH_COST = 30
// Power-flavored cast bark for any Superman special / mode-activation / flight-toggle / ultimate.
// Cooldown-gated (700ms) so rapid re-presses can't spam it. Audio-only; no gameplay effect.
function supermanCastBark(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "superman") return
  const now = (typeof performance !== "undefined" ? performance.now() : 0)
  if (fighter._castVoiceAt && now - fighter._castVoiceAt <= 700) return
  fighter._castVoiceAt = now
  try { sound?.playSfxFile?.(pickSupermanVoice("cast"), null) } catch (_) {}
}
function fireSupermanHeatVision(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, SUPERMAN_HEATVISION_COST)) return false
  // Braced firing pose (reuse the charge stance — no dedicated eye-beam art); the beam sells it.
  fighter._spriteCastMove  = "charge"
  fighter._spriteCastTimer = 20
  fighter.attackCooldown   = getAttackDuration(26, fighter)
  fighter.vx = 0
  // SOLAR FLARE mode ENHANCES it into a wide gold "Solar Flare Beam" (bigger + higher damage).
  const flare = !!fighter._solarFlareActive
  schedulePendingSpawn(5, () => {
    spawnProjectile(fighter, flare ? "superman_solarbeam" : "superman_heatvision", {
      drawKind: "heatvision", color: flare ? "#ffcc2e" : "#ff3a1a",
      damage: flare ? 84 : 52, speed: 15, hitstun: flare ? 20 : 16, knockbackX: flare ? 12 : 8, knockbackY: -2,
      w: flare ? 74 : 46, h: flare ? 22 : 14, radius: flare ? 22 : 16, lifetime: 80, isSpecial: true,
      spawnY: fighter.y + (fighter.h || 100) * 0.18   // eye height
    }, context)
  })
  supermanCastBark(fighter)   // Kryptonian cast bark (audio-only)
  return true
}
function fireSupermanFlyingPunch(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, SUPERMAN_FLYINGPUNCH_COST)) return false
  // KRYPTONIAN OVERLOAD mode ENHANCES it into a faster, harder "Overload Rush" (more dmg + reach + lunge).
  const over = !!fighter._overloadActive
  const md = over
    ? { damage: 150, startup: 6, active: 6, recovery: 16, hitstun: 26, blockstun: 14, knockbackX: 16, knockbackY: -8, rangeX: 120, rangeY: 66, isSpecial: true, launcher: true }
    : { damage: 108, startup: 8, active: 6, recovery: 20, hitstun: 22, blockstun: 12, knockbackX: 13, knockbackY: -6, rangeX: 110, rangeY: 62, isSpecial: true, launcher: true }
  const attack = createAttackFromMove(fighter, "superPunch", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "superPunch" → drives the charged-punch pose
  fighter.vx = (fighter.facing || 1) * (over ? 24 : 19)   // committed forward lunge across the screen
  if (fighter._flightActive) fighter.vy = 0 // mid-flight: level out into the charge
  shakeCamera(context, 4, 7)
  supermanCastBark(fighter)   // Kryptonian cast bark (audio-only)
  return true
}
export function executeSupermanSpecial(fighter, context) {
  // Deterministic held-direction routing (_specialHeldDir — robust, non-time-windowed; Killua pattern):
  //   Down = Solar Flare toggle · Back = Kryptonian Overload toggle · Forward = Super Flying Punch ·
  //   Neutral/Up = Heat Vision. Re-pressing a mode's direction while it's active toggles it OFF.
  const dir = fighter._specialHeldDir || null
  // Mode toggles self-gate on attackCooldown so ONE press = ONE toggle (the Special dispatch re-fires
  // every frame the button is held; enter() sets a cooldown, and revert() must set one too, else a held
  // press would flip the mode on→off→on across successive frames).
  if (dir === "D") {
    if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
    if (fighter._solarFlareActive) { revertSupermanSolarFlare(fighter); fighter.attackCooldown = getAttackDuration(12, fighter); return true }
    if (enterSupermanSolarFlare(fighter, context)) return true
    return fireSupermanHeatVision(fighter, context)   // not enough Solar Energy → fall back to the beam
  }
  if (dir === "B") {
    if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
    if (fighter._overloadActive) { revertSupermanOverload(fighter); fighter.attackCooldown = getAttackDuration(12, fighter); return true }
    if (enterSupermanOverload(fighter, context)) return true
    return fireSupermanHeatVision(fighter, context)
  }
  if (dir === "F") return fireSupermanFlyingPunch(fighter, context)   // FORWARD = charged dash-strike (Overload-enhanced)
  return fireSupermanHeatVision(fighter, context)                     // NEUTRAL/UP = eye-beam (Solar-Flare-enhanced)
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPERMAN MODE-TOGGLES (Stage 4) — two Mangekyou-style sustained buff modes, mutually exclusive, each
// DRAINING the shared Solar Energy pool while active and AUTO-REVERTING when it runs dry (Itachi/Godspeed
// pattern). Distinct dedicated entry art + distinct aura (game.js) + a distinct enhanced move:
//   SOLAR FLARE (gold, Down+Special)     — offense: +25% damage; Heat Vision → wide gold Solar Flare Beam.
//   KRYPTONIAN OVERLOAD (blue, Back+Sp)  — pressure: +30% attack speed +15% move speed; Flying Punch → Overload Rush.
// ─────────────────────────────────────────────────────────────────────────────
const SUPERMAN_MODE_THRESHOLD = 80    // Solar Energy needed to ignite either mode
const SUPERMAN_MODE_DRAIN      = 0.25 // Solar Energy/frame while a mode is active (~15/s → ~13s from a full 200)
export function isSupermanSolarFlare(f) { return !!f?._solarFlareActive }
export function isSupermanOverload(f)   { return !!f?._overloadActive }
function revertSupermanSolarFlare(fighter) {
  if (!fighter || !fighter._solarFlareActive) return
  fighter._solarFlareActive = false
  if (fighter.currentForm === "solarFlare") fighter.currentForm = "base"
  fighter.damageMultiplier = 1; fighter.attackMultiplier = 1
  // clear the entry-cast pose if it's still holding (e.g. auto-revert mid-cast) so it doesn't bleed into later sprites
  if (fighter._spriteCastMove === "solarFlareCast") { fighter._spriteCastMove = null; fighter._spriteCastTimer = 0 }
}
function revertSupermanOverload(fighter) {
  if (!fighter || !fighter._overloadActive) return
  fighter._overloadActive = false
  if (fighter.currentForm === "overload") fighter.currentForm = "base"
  fighter.attackSpeedMultiplier = 1; fighter.speedMultiplier = 1
  if (fighter._spriteCastMove === "overloadCast") { fighter._spriteCastMove = null; fighter._spriteCastTimer = 0 }
}
function enterSupermanSolarFlare(fighter, context) {
  if (fighter._solarFlareActive) return false
  if ((fighter.attackCooldown || 0) > 0 || (fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0) return false
  if ((fighter.energy || 0) < SUPERMAN_MODE_THRESHOLD) return false
  if (fighter._overloadActive) revertSupermanOverload(fighter)   // modes are mutually exclusive
  fighter._solarFlareActive = true
  fighter.currentForm       = "solarFlare"
  fighter.damageMultiplier  = 1.25
  fighter.attackMultiplier  = 1.25
  fighter._spriteCastMove   = "solarFlareCast"   // gold radiant-burst entry (dedicated art)
  fighter._spriteCastTimer  = 30
  fighter.attackCooldown    = 10
  fighter.teleportFlash     = Math.max(fighter.teleportFlash || 0, 12)
  fighter.vx = 0
  supermanCastBark(fighter)   // Kryptonian mode-activation bark (audio-only)
  return true
}
function enterSupermanOverload(fighter, context) {
  if (fighter._overloadActive) return false
  if ((fighter.attackCooldown || 0) > 0 || (fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0) return false
  if ((fighter.energy || 0) < SUPERMAN_MODE_THRESHOLD) return false
  if (fighter._solarFlareActive) revertSupermanSolarFlare(fighter)   // modes are mutually exclusive
  fighter._overloadActive       = true
  fighter.currentForm           = "overload"
  fighter.attackSpeedMultiplier = 1.3
  fighter.speedMultiplier       = 1.15
  fighter._spriteCastMove       = "overloadCast"   // blue electric-crackle entry (dedicated art)
  fighter._spriteCastTimer      = 40
  fighter.attackCooldown        = 10
  fighter.teleportFlash         = Math.max(fighter.teleportFlash || 0, 12)
  fighter.vx = 0
  supermanCastBark(fighter)   // Kryptonian mode-activation bark (audio-only)
  return true
}
// Round/menu-reset reverts (mirror forceRevertHisokaOverdrive's role).
export function forceRevertSupermanModes(fighter) { revertSupermanSolarFlare(fighter); revertSupermanOverload(fighter) }
// Per-frame drain + auto-revert for BOTH modes (called from updateFighterState).
export function applySupermanModeSystem(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "superman") return
  tickSustainedFormDrain(fighter, { active: isSupermanSolarFlare, drainPerFrame: SUPERMAN_MODE_DRAIN, revert: revertSupermanSolarFlare })
  tickSustainedFormDrain(fighter, { active: isSupermanOverload,   drainPerFrame: SUPERMAN_MODE_DRAIN, revert: revertSupermanOverload })
}

// ─────────────────────────────────────────────────────────────────────────────
// ZENITSU — "Thunderclap Flurry": a 3-hit cancel-on-hit command-normal chain (Down+Heavy) (Stage 2).
// Mirrors updateBatmanCommandCombat/updateGonCommandCombat EXACTLY (Down+Heavy opener → re-tap Heavy
// during recovery to cancel into the next stage, gated on a clean connect so a whiff/block ENDS the
// string = mid-chain interrupt). Sourced from the overflow melee strips: zenCombo1 (low sweep) →
// zenCombo2 (dashing lunge) → zenCombo3 (rising super vertical slash, launches). Fast burst-striker
// pacing (spiky, low commitment on the openers). Neutral light/heavy/up/air/down_air stay on the
// standard normal path (Down is what routes into the chain). Each stage's sprite is zenComboN
// (sprite.js currentMove identity → characters.js animationData).
// ─────────────────────────────────────────────────────────────────────────────
const ZENITSU_COMMAND = {
  // knockbackX 1 on the openers keeps the target PINNED inside the string; the finisher reaches with
  // rangeX 98 + delivers the launch knockback.
  zenCombo1: { damage: 32, startup: 3, active: 3, recovery: 11, hitstun: 13, knockbackX: 1, knockbackY: 0,  rangeX: 84, rangeY: 56, rekkaNext: "zenCombo2" },
  zenCombo2: { damage: 38, startup: 4, active: 3, recovery: 12, hitstun: 14, knockbackX: 2, knockbackY: 0,  rangeX: 92, rangeY: 56, rekkaNext: "zenCombo3" },
  zenCombo3: { damage: 62, startup: 5, active: 4, recovery: 19, hitstun: 22, knockbackX: 9, knockbackY: -5, rangeX: 98, rangeY: 64 },   // rising super-slash launcher finisher (string ends here)
}
function fireZenitsuCommand(fighter, key, context) {
  const md = ZENITSU_COMMAND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = key === "zenCombo3"
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the zenComboN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
// Grounded command-normal driver (mirrors updateBatmanCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateZenitsuCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "zenitsu" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy
  // CONTINUE — fresh Heavy during the current part's recovery, only if it CONNECTED (cancel-on-hit).
  const opp = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireZenitsuCommand(fighter, next, context)
  // OPENER — Down+Heavy from neutral (grounded). Consumes the press so the normal heavy doesn't also fire.
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && inputState.down && heavyEdge) return fireZenitsuCommand(fighter, "zenCombo1", context)
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// RENGOKU — "Flame Breathing" combo chains (Stage 3): a BRANCHING, cancel-on-hit command-normal
// system with BOTH a ground chain and an air chain, each ending in an OPTIONAL escalated "super"
// finisher. Opener = Forward+Heavy (grounded → ground chain, airborne → air chain). On a CLEAN hit:
// re-tap Heavy during recovery to continue the normal-tier chain, OR press SPECIAL during recovery to
// branch EARLY into the heavier super finisher (ends the string). A whiff/block ENDS the chain
// (mid-chain interrupt) — same cancel-on-hit gate as every rekka (rekkaContinue) + a twin Special gate.
// Sourced from the JUS combo strips: GROUND combo_1 → combo_2 → combo_3 (+ super_foward/super_down
// finishers); AIR combo_air_1-remainder → combo_into_air bridge → combo_air_2 (+ super_down_air finisher).
// Each stage's sprite is the currentMove identity key (sprite.js → characters.js animationData).
// ─────────────────────────────────────────────────────────────────────────────
const RENGOKU_GROUND = {
  // Low knockback on the openers pins the target inside the string; the finishers deliver the payoff.
  rengokuG1:        { damage: 30, startup: 4, active: 3, recovery: 12, hitstun: 13, knockbackX: 1,  knockbackY: 0,  rangeX: 90,  rangeY: 58, rekkaNext: "rengokuG2" },
  rengokuG2:        { damage: 36, startup: 4, active: 3, recovery: 13, hitstun: 14, knockbackX: 1,  knockbackY: 0,  rangeX: 96,  rangeY: 58, rekkaNext: "rengokuG3", superNext: "rengokuSuperFwd" },
  rengokuG3:        { damage: 46, startup: 5, active: 3, recovery: 14, hitstun: 16, knockbackX: 3,  knockbackY: -2, rangeX: 94,  rangeY: 60, superNext: "rengokuSuperDown" },   // last normal — Special-only branch
  rengokuSuperFwd:  { damage: 74, startup: 7, active: 4, recovery: 20, hitstun: 24, knockbackX: 13, knockbackY: -4, rangeX: 110, rangeY: 60 },   // forward flame-lunge finisher (off G2)
  rengokuSuperDown: { damage: 82, startup: 8, active: 4, recovery: 22, hitstun: 26, knockbackX: 10, knockbackY: -6, rangeX: 100, rangeY: 64 },   // downward flame-wave slam finisher (off G3, launches)
}
const RENGOKU_AIR = {
  rengokuA1:       { damage: 30, startup: 4, active: 3, recovery: 12, hitstun: 13, knockbackX: 2, knockbackY: -1, rangeX: 92, rangeY: 58, rekkaNext: "rengokuABridge" },
  rengokuABridge:  { damage: 34, startup: 4, active: 3, recovery: 14, hitstun: 14, knockbackX: 2, knockbackY: -2, rangeX: 88, rangeY: 62, rekkaNext: "rengokuA2" },
  rengokuA2:       { damage: 44, startup: 4, active: 3, recovery: 13, hitstun: 16, knockbackX: 3, knockbackY: -2, rangeX: 96, rangeY: 62, superNext: "rengokuSuperAir" },
  rengokuSuperAir: { damage: 78, startup: 6, active: 4, recovery: 16, hitstun: 24, knockbackX: 6, knockbackY: 12, rangeX: 92, rangeY: 70 },   // downward flame-spike finisher (off A2, spikes)
}
const RENGOKU_CHAIN = { ...RENGOKU_GROUND, ...RENGOKU_AIR }

function fireRengokuCommand(fighter, key, context) {
  const md = RENGOKU_CHAIN[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = key === "rengokuSuperDown"
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the stage sprite
  // Air stages: cancel downward momentum + a slight rise so the chain juggles instead of falling out mid-string.
  if (RENGOKU_AIR[key] && !(fighter.onGround ?? fighter.grounded)) fighter.vy = -3
  fighter._rekkaNext    = md.rekkaNext  || null
  fighter._rekkaSuper   = md.superNext  || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates BOTH cancels
  // FLAME-BREATHING FORM callout on the SUPER-FINISHER branches only (not the basic G1-3/A1-2 links —
  // those ride combat.js's offense combatBark). Set _atkVoiceCd so the finisher's own connect doesn't
  // ALSO fire a combatBark (cast+connect double), same guard zenitsu's specials use.
  if (key === "rengokuSuperFwd" || key === "rengokuSuperDown" || key === "rengokuSuperAir") {
    try { sound.playSfxFile?.(pickRengokuVoice("formCallout"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  }
  return true
}
// Command-normal driver (mirrors updateSupermanCommandCombat + adds the Special super-branch). Returns
// true (→ skip the normal path this frame) only when it actually fires a stage.
export function updateRengokuCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "rengoku" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)
  const heavyEdge   = !!inputState.heavy   && !fighter._cmdPrevHeavy     // fresh tap, not held
  const specialEdge = !!inputState.special && !fighter._cmdPrevSpecial
  fighter._cmdPrevHeavy   = !!inputState.heavy
  fighter._cmdPrevSpecial = !!inputState.special
  if (!fighter.attacking) fighter._rekkaSuper = null   // string ended → drop the dangling super branch (rekkaContinue clears _rekkaNext)
  const opp = context?.getOpponent?.(fighter)

  // Latch the clean-connect gate the same way rekkaContinue does, so a Special branch on the exact hit
  // frame still sees it (rekkaContinue below also sets this, but it runs AFTER this check).
  if (fighter.attacking && fighter.currentAttack?.hasHit && (opp?.hitstun || 0) > 0) fighter._cmdHitLanded = true
  // SUPER BRANCH — fresh Special during the current stage's recovery, ONLY on a clean connect. Ends the string.
  if (fighter.attacking && fighter._rekkaSuper && specialEdge && phase === "recovery" && fighter._cmdHitLanded) {
    const sup = fighter._rekkaSuper
    // Cancel the current attack's recovery (mirrors rekkaContinue) so fireRengokuCommand passes its
    // `!fighter.attacking` guard and the finisher fires THIS frame.
    fighter.attacking = false; fighter.currentAttack = null; fighter.currentMove = null; fighter.attackCooldown = 0
    fighter._rekkaSuper = null; fighter._rekkaNext = null; fighter._cmdHitLanded = false
    return fireRengokuCommand(fighter, sup, context)
  }
  // CONTINUE (normal tier) — fresh Heavy during recovery on a clean hit → rekkaNext.
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireRengokuCommand(fighter, next, context)

  // OPENER — Forward+Heavy from neutral. Grounded → ground chain; airborne → air chain. Consumes the
  // press so the normal heavy doesn't also fire (Fwd is what routes into the chain; neutral heavy stays normal).
  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && forward && heavyEdge) return fireRengokuCommand(fighter, grounded ? "rengokuG1" : "rengokuA1", context)
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// RENGOKU SPECIALS (Stage 4) — COOLDOWN-gated (maxEnergy 0), like every Demon Slayer char.
//   CHARGED FLAME STRIKE (CHARGE button, hold→release, TWO power tiers): hold P → the "charge" windup
//     plays (game.js lets a no-energy charger enter isCharging); RELEASE fires the strike — a quick TAP
//     (<200ms) = weak tier (rengokuCharge1), a longer HOLD = strong tier (rengokuCharge2, wide flame arc).
//     A forward lunge closes the gap; the puches dash-recovery pose (rengokuFlameTail) plays over recovery.
//   COUNTER (SPECIAL button, neutral): a reactive parry stance — sets the universal _parryInputBuffer for a
//     window (checkParry stuns an incoming startup attack) + a flaming riposte via the combat.checkParry hook.
// Both gate on dedicated cooldowns (flameCd / counterCd), ticked in game.updateMiscTimers (thunderCd twin).
// ─────────────────────────────────────────────────────────────────────────────
const RENGOKU_FLAME_CD   = 75   // ~1.25s anti-spam gate for the free (no-energy) charged strike
const RENGOKU_COUNTER_CD = 96   // ~1.6s gate for the reactive counter stance
const RENGOKU_COUNTER_WINDOW = 22   // parry-active frames the counter stance holds open
// Fired from game.handleChargeRelease on a CHARGE-key release. `strong` = the hold tier (longer press).
export function fireRengokuFlameStrike(fighter, strong, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "rengoku") return false
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if ((fighter.flameCd || 0) > 0) return false   // COOLDOWN gate (no energy cost)
  const md = strong
    ? { damage: 150, startup: 8, active: 4, recovery: 20, hitstun: 28, blockstun: 14, knockbackX: 13, knockbackY: -3, rangeX: 122, rangeY: 64, isSpecial: true }
    : { damage: 90,  startup: 6, active: 3, recovery: 14, hitstun: 22, blockstun: 10, knockbackX: 9,  knockbackY: -2, rangeX: 100, rangeY: 58, isSpecial: true }
  const moveKey = strong ? "rengokuCharge2" : "rengokuCharge1"
  const attack = createAttackFromMove(fighter, moveKey, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = moveKey → release sprite
  fighter.isCharging = false
  const dir = fighter.facing || 1
  fighter.vx = dir * (strong ? 11 : 9)   // forward lunge to close the gap
  // puches dash-recovery TAIL: swap the sprite to rengokuFlameTail for the recovery phase (+ a short beat
  // after). _spriteCastMove overrides currentMove in sprite.js while _spriteCastTimer > 0.
  schedulePendingSpawn(md.startup + md.active + 1, () => {
    if (fighter.currentAttack && fighter.currentAttack.name === moveKey) { fighter._spriteCastMove = "rengokuFlameTail"; fighter._spriteCastTimer = md.recovery + 6 }
  })
  fighter.flameCd = RENGOKU_FLAME_CD
  // FLAME-BREATHING FORM callout on the Charged Flame Strike (shares the finisher pool). _atkVoiceCd
  // guards against a cast+connect combatBark double (same as the super-finisher branches).
  try { sound.playSfxFile?.(pickRengokuVoice("formCallout"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  try { shakeCamera(context, strong ? 6 : 4, strong ? 9 : 7) } catch (_) {}
  return true
}
// COUNTER — neutral SPECIAL. Opens a reactive parry/riposte WINDOW (combat.shouldRengokuCounter negates
// an incoming melee hit + ripostes), mirroring the Feedback Energy-Absorption counter architecture.
function executeRengokuSpecial(fighter, context) {
  if (!fighter || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if ((fighter.counterCd || 0) > 0) return false   // COOLDOWN gate (no energy cost)
  fighter._rengokuCountering = RENGOKU_COUNTER_WINDOW   // counter-window countdown → combat.shouldRengokuCounter (ticked down in game.updateMiscTimers)
  fighter._spriteCastMove    = "rengokuCounter"          // the counter stance pose
  fighter._spriteCastTimer   = RENGOKU_COUNTER_WINDOW
  fighter.counterCd = RENGOKU_COUNTER_CD
  // TOTAL CONCENTRATION callout as he braces into the counter stance (the one neutral non-charge special).
  try { sound.playSfxFile?.(pickRengokuVoice("concentration"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  return true
}

// RENGOKU ULTIMATE — "Flame Explosion" (Stage 5). A freeze-cinematic AOE detonation
// (rengokuFlameExplosionCinematic.js: camera push-in → blade-raise/eruption sequence → pull-back). The
// guaranteed, range-independent flame damage lands at the DETONATION beat via onImpact. COOLDOWN-gated
// (no energy; maxEnergy 0) — reuses the universal ultimateCooldown gate, stamped 8s (Zenitsu precedent).
const RENGOKU_ULT_CD  = 480   // 8s @ 60fps — short real-time recast (design band 5-10s)
const RENGOKU_ULT_DMG = 340   // guaranteed AOE flame detonation (a held block chips it to 25%)
function executeRengokuUltimate(fighter, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "rengoku") return false
  if (isRengokuFlameExplosionCinematicActive()) return false   // already mid-cinematic
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const opp = context?.getOpponent?.(fighter) || null
  fighter.vx = 0
  // "Ultimate Technique" (奥義) callout at ACTIVATION / windup — fires HERE, before the cinematic's
  // detonation beat (the guaranteed damage lands later via applyRengokuUltimateDamage / onImpact, which
  // stays voiceless). Same timing convention as every other ultimate-activation line.
  try { sound.playSfxFile?.(pickRengokuVoice("ultimate"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  activateRengokuFlameExplosionCinematic(fighter, opp, (cineCtx) => applyRengokuUltimateDamage(fighter, opp, cineCtx))
  fighter._suppressUltCooldown = true
  fighter.ultimateCooldown = RENGOKU_ULT_CD
  return true
}
// PAYOFF — GUARANTEED, range-independent flame detonation applied ONCE at the DETONATION beat by the
// cinematic. A held block (frozen at its pre-cinematic value) chips it to 25%; a clean hit deals full + blasts away.
function applyRengokuUltimateDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = RENGOKU_ULT_DMG
  if (blocked) {
    dmg = Math.round(dmg * 0.25)
    opp.blockstun = Math.max(opp.blockstun || 0, 20)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 36)
    opp.vx = (fighter.facing || 1) * 12; opp.vy = -6           // blasted away by the eruption
    opp.colorFlash = 14; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 44)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (sure-hit)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 20, maxTimer: 20,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#ff6a1a",
      damage: dmg, lines: blocked ? 6 : 18, radius: blocked ? 14 : 50,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
}

// ── MIWA ULTIMATE (Stage 4) — "Blade of the Neophyte" battojutsu quick-draw freeze-cinematic. Costs 100
// cursed energy; a single GUARANTEED slash lands at the connect beat (via onImpact). Mirrors Rengoku. ──
const MIWA_ULT = { cost: 100, dmg: 280 }
function executeMiwaUltimate(fighter, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "miwa") return false
  if (isMiwaUltimateCinematicActive()) return false            // already mid-cinematic
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, MIWA_ULT.cost)) return false
  const opp = context?.getOpponent?.(fighter) || null
  fighter.vx = 0
  activateMiwaUltimateCinematic(fighter, opp, (cineCtx) => applyMiwaUltimateDamage(fighter, opp, cineCtx))
  return true
}
// PAYOFF — GUARANTEED, range-independent battojutsu slash, applied ONCE at the connect beat. A held block
// (frozen at its pre-cinematic value) chips it to 25%; a clean hit deals full + blasts the opponent away.
function applyMiwaUltimateDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = MIWA_ULT.dmg
  if (blocked) {
    dmg = Math.round(dmg * 0.25)
    opp.blockstun = Math.max(opp.blockstun || 0, 20)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 34)
    opp.vx = (fighter.facing || 1) * 12; opp.vy = -5           // sent flying by the draw-slash
    opp.colorFlash = 14; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 42)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (sure-hit)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 20, maxTimer: 20,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#38bdf8",
      damage: dmg, lines: blocked ? 6 : 16, radius: blocked ? 14 : 46,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHINOBU KOCHO (Stage 3) — "Insect Breathing" thrust chain + POISON specials. COOLDOWN-gated (maxEnergy 0).
//   COMMAND CHAIN (Fwd+Heavy opener → re-tap Heavy on a clean hit): shinobuG1 (horizontal slash) →
//     shinobuG2 (overhead cut) → shinobuG3 (lunging body-check finisher). Cancel-on-hit; a whiff/block
//     ENDS the string (shared rekkaContinue, requireHit:true — the mid-chain interrupt). Toji-Rekka pattern.
//   SPECIALS (SPECIAL button, direction-branched via _specialHeldDir):
//     Neutral/Forward = POISON THRUST — a committed lunging stinger (down_attack art). Low direct dmg +
//       a WISTERIA POISON DoT stamped on the opponent on a CLEAN hit (the existing game.js `_dot`
//       subsystem — her low-burst / high-attrition identity). Gated on poisonCd.
//     Back = BUTTERFLY FLIT — an acrobatic backflip evade (back_flips art): brief i-frames + a backward
//       hop, a spacing/reposition tool. No damage. Gated on flitCd.
//   Cooldowns (poisonCd / flitCd) tick in game.updateMiscTimers (Rengoku flameCd/counterCd twins).
// ─────────────────────────────────────────────────────────────────────────────
const SHINOBU_GROUND = {
  // Low knockback on the openers pins the target inside the string; the finisher delivers the knockback.
  shinobuG1: { damage: 24, startup: 4, active: 3, recovery: 11, hitstun: 12, knockbackX: 1, knockbackY: 0,  rangeX: 92, rangeY: 52, rekkaNext: "shinobuG2" },
  shinobuG2: { damage: 30, startup: 4, active: 3, recovery: 12, hitstun: 13, knockbackX: 1, knockbackY: 0,  rangeX: 88, rangeY: 58, rekkaNext: "shinobuG3" },
  shinobuG3: { damage: 40, startup: 5, active: 3, recovery: 15, hitstun: 16, knockbackX: 8, knockbackY: -3, rangeX: 96, rangeY: 56 },   // finisher (ends the string)
}
function fireShinobuCommand(fighter, key, context) {
  const md = SHINOBU_GROUND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = key → drives the stage sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the continue
  return true
}
// WISTERIA POISON DoT — stamped on a clean Poison Thrust hit (attrition offsets her low burst).
const SHINOBU_POISON = { ticks: 7, interval: 20, dmg: 7 }   // 49 over ~2.3s
export function updateShinobuCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "shinobu" || !inputState) return false
  const opp = context?.getOpponent?.(fighter)
  // POISON-ON-HIT watcher: when the armed Poison Thrust lands a CLEAN (non-blocked) hit, stamp the DoT
  // ONCE onto the opponent (localized — no shared resolveAttackHit edit). Armed by fireShinobuPoisonThrust.
  if (fighter._shinobuPoisonPending && fighter.attacking && fighter.currentAttack?.name === "shinobuPoison"
      && fighter.currentAttack.hasHit && opp && !opp.isBlocking && (opp.hitstun || 0) > 0) {
    opp._dot = { ticks: SHINOBU_POISON.ticks, interval: SHINOBU_POISON.interval, dmg: SHINOBU_POISON.dmg, delay: SHINOBU_POISON.interval }
    fighter._shinobuPoisonPending = false
  }
  if (!fighter.attacking) fighter._shinobuPoisonPending = false   // thrust ended (whiff/block) → drop the pending stamp

  const grounded  = fighter.onGround ?? fighter.grounded ?? false
  const phase     = getPhase?.(fighter)
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy
  // CONTINUE — fresh Heavy during recovery on a clean hit → rekkaNext (shared rekkaContinue owns the gate).
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireShinobuCommand(fighter, next, context)
  // OPENER — Forward+Heavy from neutral (grounded). Consumes the press so the neutral heavy stays normal.
  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && forward && heavyEdge) return fireShinobuCommand(fighter, "shinobuG1", context)
  return false
}

// ── SHINOBU SPECIALS — SPECIAL button, direction-branched via _specialHeldDir. COOLDOWN-gated (maxEnergy 0). ──
const SHINOBU_POISON_CD = 78   // ~1.3s gate for the Poison Thrust
const SHINOBU_FLIT_CD   = 66   // ~1.1s gate for the Butterfly Flit evade
function fireShinobuPoisonThrust(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if ((fighter.poisonCd || 0) > 0) return false   // COOLDOWN gate (no energy cost)
  const md = { damage: 40, startup: 6, active: 3, recovery: 16, hitstun: 16, blockstun: 10, knockbackX: 4, knockbackY: -1, rangeX: 104, rangeY: 54, isSpecial: true }
  const attack = createAttackFromMove(fighter, "shinobuPoison", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = shinobuPoison → stinger pose
  fighter.vx = (fighter.facing || 1) * 9    // forward lunge — the stinger dives in
  fighter._shinobuPoisonPending = true      // arm the poison-on-hit watcher (updateShinobuCommandCombat)
  fighter.poisonCd = SHINOBU_POISON_CD
  // POISON cast callout ("How about this poison?" / "Change the blend"). _atkVoiceCd guards a cast+connect
  // double with the offense combatBark (same as Rengoku/Zenitsu specials).
  try { sound.playSfxFile?.(pickShinobuVoice("poisonCast"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  try { shakeCamera(context, 3, 6) } catch (_) {}
  return true
}
function fireShinobuFlit(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if ((fighter.flitCd || 0) > 0) return false   // COOLDOWN gate
  // Acrobatic backward evade: brief i-frames + a backward hop (spacing/reposition, no damage).
  fighter.vx = -(fighter.facing || 1) * 13
  fighter.vy = -6
  fighter.onGround = false; fighter.grounded = false
  fighter.invulnTimer      = Math.max(fighter.invulnTimer || 0, 20)   // i-frames through the flip
  fighter._spriteCastMove  = "shinobuFlit"                            // backflip pose (overrides state sprite)
  fighter._spriteCastTimer = 28
  fighter.flitCd = SHINOBU_FLIT_CD
  // Insect Breathing "dance" technique callout (Butterfly/Spirit/Void Dance — random). _atkVoiceCd guard.
  try { sound.playSfxFile?.(pickShinobuVoice("specialCast"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  return true
}
function executeShinobuSpecial(fighter, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "shinobu") return false
  const dir = fighter._specialHeldDir || null
  if (dir === "B") return fireShinobuFlit(fighter, context)
  return fireShinobuPoisonThrust(fighter, context)   // Neutral / Forward = Poison Thrust
}

// SHINOBU ULTIMATE — "Insect Breathing: Butterfly Dance" (Stage 4). A freeze-cinematic spinning-DASH
// finisher (shinobuButterflyCinematic.js: camera push-in → dash-in thrust → spinning slash → pull-back).
// The guaranteed damage + a lethal wisteria POISON finisher land at the STRIKE beat via onImpact. COOLDOWN-
// gated (no energy; maxEnergy 0) — reuses the universal ultimateCooldown gate, stamped 8s (Zenitsu/Rengoku
// precedent). On-theme low-burst: her DIRECT hit is the lowest of the cinematic-ult band; the poison
// finisher makes up the rest (attrition, her signature) so the total sits mid-band.
const SHINOBU_ULT_CD          = 480   // 8s @ 60fps — short real-time recast (design band 5-10s)
const SHINOBU_ULT_DMG         = 300   // guaranteed direct (a held block chips it to 25%); lowest cinematic direct
const SHINOBU_ULT_POISON      = { ticks: 6, interval: 18, dmg: 11 }   // lethal finisher DoT on a CLEAN hit (66 over ~1.8s)
function executeShinobuUltimate(fighter, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "shinobu") return false
  if (isShinobuButterflyCinematicActive()) return false   // already mid-cinematic
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const opp = context?.getOpponent?.(fighter) || null
  fighter.vx = 0
  // ULTIMATE windup callout — fires HERE at ACTIVATION (before the cinematic's STRIKE payoff, same timing
  // convention as every other ult). 009/014 "getting serious" + folded-in concentration declarations. The
  // guaranteed damage lands later via applyShinobuUltimateDamage/onImpact, which stays voiceless.
  try { sound.playSfxFile?.(pickShinobuVoice("ultimate"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  activateShinobuButterflyCinematic(fighter, opp, (cineCtx) => applyShinobuUltimateDamage(fighter, opp, cineCtx))
  fighter._suppressUltCooldown = true
  fighter.ultimateCooldown = SHINOBU_ULT_CD
  return true
}
// PAYOFF — GUARANTEED, range-independent applied ONCE at the STRIKE beat by the cinematic. A held block
// (frozen at its pre-cinematic value) chips the direct hit to 25% and NO poison; a clean hit deals full +
// blasts away + stamps the lethal wisteria poison finisher (the existing game.js _dot subsystem).
function applyShinobuUltimateDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = SHINOBU_ULT_DMG
  if (blocked) {
    dmg = Math.round(dmg * 0.25)
    opp.blockstun = Math.max(opp.blockstun || 0, 20)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 34)
    opp.vx = (fighter.facing || 1) * 11; opp.vy = -5           // blasted away by the spinning strike
    opp.colorFlash = 14; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 42)
    // WISTERIA POISON FINISHER — the signature lethal DoT, on a CLEAN hit only.
    opp._dot = { ticks: SHINOBU_ULT_POISON.ticks, interval: SHINOBU_ULT_POISON.interval, dmg: SHINOBU_ULT_POISON.dmg, delay: SHINOBU_ULT_POISON.interval }
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (sure-hit)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 20, maxTimer: 20,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#8a4dff",
      damage: dmg, lines: blocked ? 6 : 16, radius: blocked ? 14 : 46,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GHOSTFACE (Stage 1) — knife STALKER: normals + "Slasher Frenzy" command chain +
//   direction-branched specials (DREAD-energy cost) + "The Final Act" freeze-cinematic ult.
//   COMMAND CHAIN (Down+Heavy opener → re-tap Heavy on a CLEAN hit): ghostfaceCombo1→2→3
//     (a low knife flurry). Cancel-on-hit; a whiff/block ENDS the string (shared rekkaContinue,
//     requireHit:true). Batman/Shinobu Toji-Rekka pattern. Pure normal chain, no energy cost.
//   SPECIALS (SPECIAL button, direction-branched via _specialHeldDir; energy-cost like Batman):
//     Neutral/Forward = GUTTING LUNGE — a dashing knife stab (gap-closer). Leaves a BLEED DoT on a
//       clean hit (the existing game.js `_dot` subsystem — his attrition identity). Cost 25.
//     Down = LOW GUT — a low sweeping gut-slash that trips (knockdown) on a clean hit. Cost 20.
//     Back = STALK VANISH — a backstep with brief i-frames (reposition, no damage). Cost 15.
//   ULTIMATE = THE FINAL ACT (freeze-cinematic stab flurry; guaranteed damage + lethal bleed at connect).
// ─────────────────────────────────────────────────────────────────────────────
const GHOSTFACE_GROUND = {
  // Low knockback on the openers pins the target inside the string; the finisher delivers the knockback.
  ghostfaceCombo1: { damage: 22, startup: 4, active: 3, recovery: 11, hitstun: 12, knockbackX: 1, knockbackY: 0,  rangeX: 90, rangeY: 50, rekkaNext: "ghostfaceCombo2" },
  ghostfaceCombo2: { damage: 28, startup: 4, active: 3, recovery: 12, hitstun: 13, knockbackX: 1, knockbackY: 0,  rangeX: 92, rangeY: 52, rekkaNext: "ghostfaceCombo3" },
  ghostfaceCombo3: { damage: 42, startup: 5, active: 3, recovery: 16, hitstun: 17, knockbackX: 8, knockbackY: -3, rangeX: 98, rangeY: 54 },   // finisher (ends the string)
}
function fireGhostfaceCommand(fighter, key, context) {
  const md = GHOSTFACE_GROUND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = key → drives the stage sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the continue
  return true
}
// BLEED DoT — stamped on a clean Gutting Lunge hit (attrition offsets his human-fragile burst).
const GHOSTFACE_BLEED = { ticks: 6, interval: 20, dmg: 6 }   // 36 over ~2s
export function updateGhostfaceCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "ghostface" || !inputState) return false
  const opp = context?.getOpponent?.(fighter)
  // BLEED-ON-HIT watcher: when the armed Gutting Lunge lands a CLEAN (non-blocked) hit, stamp the DoT
  // ONCE onto the opponent (localized — no shared resolveAttackHit edit). Armed by fireGhostfaceGuttingLunge.
  if (fighter._gfBleedPending && fighter.attacking && fighter.currentMove === "gfLunge"
      && fighter.currentAttack?.hasHit && opp && !opp.isBlocking && (opp.hitstun || 0) > 0) {
    opp._dot = { ticks: GHOSTFACE_BLEED.ticks, interval: GHOSTFACE_BLEED.interval, dmg: GHOSTFACE_BLEED.dmg, delay: GHOSTFACE_BLEED.interval }
    fighter._gfBleedPending = false
  }
  if (!fighter.attacking) fighter._gfBleedPending = false   // lunge ended (whiff/block) → drop the pending stamp
  // LOW-GUT KNOCKDOWN watcher: a clean Low Gut hit trips the opponent (knockdown) ONCE.
  if (fighter._gfLowGutPending && fighter.attacking && fighter.currentMove === "gfLowCut"
      && fighter.currentAttack?.hasHit && opp && !opp.isBlocking && (opp.hitstun || 0) > 0) {
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 40)
    fighter._gfLowGutPending = false
  }
  if (!fighter.attacking) fighter._gfLowGutPending = false

  const grounded  = fighter.onGround ?? fighter.grounded ?? false
  const phase     = getPhase?.(fighter)
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy
  // CONTINUE — fresh Heavy during recovery on a clean hit → rekkaNext (shared rekkaContinue owns the gate).
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireGhostfaceCommand(fighter, next, context)
  // OPENER — Down+Heavy from neutral (grounded). Consumes the press so the neutral heavy stays normal.
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && inputState.down && heavyEdge) return fireGhostfaceCommand(fighter, "ghostfaceCombo1", context)
  return false
}

// ── GHOSTFACE SPECIALS — SPECIAL button, direction-branched via _specialHeldDir. DREAD-energy cost (Batman pattern). ──
function fireGhostfaceGuttingLunge(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 25)) return false
  // BILLY identity: reduced telegraph on this dash/approach move specifically (skin modifier; see
  // GHOSTFACE_SKIN_MODS). Every other identity uses the base 6f startup.
  const startup = fighter._gfSkinMod?.lungeStartupScale
    ? Math.max(2, Math.round(6 * fighter._gfSkinMod.lungeStartupScale))
    : 6
  const md = { damage: 50, startup, active: 4, recovery: 16, hitstun: 20, blockstun: 12, knockbackX: 6, knockbackY: -4, rangeX: 110, rangeY: 54, isSpecial: true }
  const attack = createAttackFromMove(fighter, "gfLunge", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = gfLunge → lunge stab pose
  fighter.vx = (fighter.facing || 1) * 12    // dashing gap-closer lunge
  fighter._gfBleedPending = true             // arm the bleed-on-hit watcher (updateGhostfaceCommandCombat)
  try { shakeCamera(context, 3, 6) } catch (_) {}
  return true
}
function fireGhostfaceLowGut(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 20)) return false
  const md = { damage: 42, startup: 6, active: 3, recovery: 18, hitstun: 22, blockstun: 10, knockbackX: 4, knockbackY: -1, rangeX: 96, rangeY: 44, isSpecial: true }
  const attack = createAttackFromMove(fighter, "gfLowCut", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = gfLowCut → low sweep pose
  fighter.vx = (fighter.facing || 1) * 6
  fighter._gfLowGutPending = true            // arm the knockdown-on-hit watcher
  try { shakeCamera(context, 3, 6) } catch (_) {}
  return true
}
// (Stalk Vanish retired — its evasive backstep + i-frames now live in the Backstage Pass GETAWAY branch.)
// ── GHOSTFACE COMPANION POOLS — the 4-character swap pool for each killer identity. There is NO "default"
// pool: Ghostface always has one of the 5 identities (enforced at applySkin), so the equipped skin ALWAYS
// resolves to a real 4-character pool. (Kept the CALLIN_POOLS name — the swap reuses this exact data.) ──
export const GHOSTFACE_CALLIN_POOLS = {
  ghostfaceBilly:  ["sasuke", "itachi", "chrollo", "killua"],
  ghostfaceDebbie: ["beerus", "netero", "maki", "omniman"],
  ghostfaceRoman:  ["rick", "tobirama", "gojo", "hisoka"],
  ghostfaceJill:   ["sukuna", "goku_black", "gold_samurai_ranger", "vegeta"],
  ghostfaceAmber:  ["shinobu", "gon", "naruto", "zenitsu"],
}
// The 4-character pool for a fighter's ACTIVE identity ([] for non-Ghostface, or the unreachable case of a
// Ghostface with no valid identity — applySkin guarantees one, so this never falls back to a sampler).
export function getGhostfaceCallInPool(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "ghostface") return []
  return GHOSTFACE_CALLIN_POOLS[fighter.skinId] || []
}
// COMPANION SWAP is triggered by a MOTION + Special (the Transformation-Jutsu control model), NOT the old
// Call-In. Each motion selects a pool slot; checked at the TOP of the Special dispatch (below), BEFORE the
// held-direction knife specials. Uses endsWithExact (STRICT tail match, no stray tolerance) so the motions
// never collide with each other or with the single-direction Gutting Lunge (F) / Low Gut (D) / Stalk
// Vanish (B). Longest motions are checked first so a QCF/QCB buried inside a DBF/DFB can't shadow it.
// The swap-motion pool slot (0-3) buffered right now, or null. Longest-motion-first so a QCF/QCB buried
// inside a DBF/DFB can't shadow it; STRICT tail match (endsWithExact). Read by the Backstage Pass SWAP
// branch to pick WHICH of the equipped identity's 4 companions the swap-in lands on (spec §4.2 — the
// motion is the companion pre-pick; holding Grab/Charge is only the "make this a swap" flag).
function ghostfaceSwapSlotFromMotion(fighter) {
  const dirs  = getRelativeDirections(fighter)
  const order = GHOSTFACE_SWAP_SLOTS.map((_, i) => i).sort((a, b) => GHOSTFACE_SWAP_SLOTS[b].motion.length - GHOSTFACE_SWAP_SLOTS[a].motion.length)
  for (const slot of order) if (endsWithExact(dirs, GHOSTFACE_SWAP_SLOTS[slot].motion)) return slot
  return null
}
// A knife special leaves its held direction in the history; clear it so a FOLLOWING input can't chain
// into a 2-token swap motion (e.g. Low Gut ↓ then a ← = ↓← = an accidental QCB). Fresh, deliberate rolls only.
function finishGfKnife(fighter, fired) {
  if (fired && fighter.directionHistory) fighter.directionHistory.length = 0
  return fired
}
// SPECIAL button = BACKSTAGE PASS (spec §4.2). Branch by the modifiers held the frame Special is buffered
// (stamped onto the fighter in game.js beside _specialHeldDir). Priority: SWAP (Grab/Charge) > FAKEOUT
// (attack btn) > the Fwd/Down KNIFE specials > GETAWAY (Back) > neutral SIDE-SWITCH. The knife specials
// (Gutting Lunge on Fwd, Low Gut on Down) survive; the old standalone motion+Special swap folds into the
// SWAP branch and Stalk Vanish folds into the evasive GETAWAY branch.
function executeGhostfaceSpecial(fighter, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "ghostface") return false
  if (fighter._gfSwapActive || fighter._bpActive) return false          // already a companion / mid-Backstage-Pass
  const mods = fighter._specialHeldMods || {}
  const dir  = fighter._specialHeldDir  || null
  if (mods.grab || mods.charge) return triggerGhostfaceBackstagePass(fighter, "swap", ghostfaceSwapSlotFromMotion(fighter) ?? 0, context)
  if (mods.attack)              return triggerGhostfaceBackstagePass(fighter, "fakeout", 0, context)
  // VOICE: knife-special cast bark ("STAB!" / "I'll gut you!" …) on the Gutting Lunge / Low Gut. Gated
  // by the shared _atkVoiceCd so it never stacks with the offense-connect bark. Swap/getaway/switch
  // (Backstage Pass) are voiced by the companion swap system, not here.
  if ((dir === "F" || dir === "D") && (fighter._atkVoiceCd || 0) <= 0) {
    try { sound?.playSfxFile?.(pickGhostfaceVoice("specialCast"), null); fighter._atkVoiceCd = 120 } catch (_) {}
  }
  if (dir === "F")              return finishGfKnife(fighter, fireGhostfaceGuttingLunge(fighter, context))   // Fwd  = Gutting Lunge (bleed)
  if (dir === "D")              return finishGfKnife(fighter, fireGhostfaceLowGut(fighter, context))         // Down = Low Gut (knockdown)
  if (dir === "B")              return triggerGhostfaceBackstagePass(fighter, "getaway", 0, context)         // Back = Getaway (evasive; folds in Stalk Vanish)
  return triggerGhostfaceBackstagePass(fighter, "switch", 0, context)                                       // neutral = cross-up Side Switch
}

// GHOSTFACE ULTIMATE — "The Final Act" (freeze-cinematic stab flurry; ghostfaceFinalActCinematic.js).
// Guaranteed range-independent damage + a lethal BLEED finisher land at the CONNECT beat via onImpact.
// Full DREAD meter (maxEnergy 100), Batman precedent. Direct burst sits mid-band; the bleed makes up the rest.
const GHOSTFACE_ULT       = { cost: 100, dmg: 300, blockRatio: 0.25 }
const GHOSTFACE_ULT_BLEED = { ticks: 6, interval: 18, dmg: 10 }   // lethal finisher DoT on a CLEAN hit (60 over ~1.8s)
function executeGhostfaceUltimate(fighter, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "ghostface") return false
  if (isGhostfaceFinalActCinematicActive()) return false            // already mid-cinematic
  if (!spendEnergy(fighter, GHOSTFACE_ULT.cost)) return false
  const opp = getTargetResolver(context)(fighter)
  fighter.vx = 0
  try { sound?.playSfxFile?.(pickGhostfaceVoice("specialCast"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: "The Final Act" cast bark
  activateGhostfaceFinalActCinematic(fighter, opp, (cineCtx) => applyGhostfaceFinalActDamage(fighter, opp, cineCtx))
  return true
}
// PAYOFF — GUARANTEED, range-independent, applied ONCE at the CONNECT beat by the cinematic. A held block
// (frozen at its pre-cinematic value) chips the direct hit to 25% and NO bleed; a clean hit deals full +
// blasts away + stamps the lethal bleed finisher (the existing game.js _dot subsystem).
function applyGhostfaceFinalActDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = GHOSTFACE_ULT.dmg
  if (blocked) {
    dmg = Math.round(dmg * GHOSTFACE_ULT.blockRatio)
    opp.blockstun = Math.max(opp.blockstun || 0, 20)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 34)
    opp.vx = (fighter.facing || 1) * 11; opp.vy = -5           // blasted away by the flurry
    opp.colorFlash = 14; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, 42)
    // BLEED FINISHER — the signature lethal DoT, on a CLEAN hit only.
    opp._dot = { ticks: GHOSTFACE_ULT_BLEED.ticks, interval: GHOSTFACE_ULT_BLEED.interval, dmg: GHOSTFACE_ULT_BLEED.dmg, delay: GHOSTFACE_ULT_BLEED.interval }
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)            // GUARANTEED, range-independent (sure-hit)
  const ocx = (opp.x || 0) + (opp.w || 60) / 2
  const ocy = (opp.y || 0) + (opp.h || 100) / 2
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({
      x: ocx, y: ocy, timer: 20, maxTimer: 20,
      category: blocked ? "light" : "ultimate",
      color: blocked ? null : "#c81e28",
      damage: dmg, lines: blocked ? 6 : 16, radius: blocked ? 14 : 40,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// GHOSTFACE — COMPANION SWAP ("Kameo") : the signature identity power (Stage 3 pilot).
// A killer wears a borrowed face — press the swap combo and Ghostface becomes ONE of the 4 companions
// matched to the equipped killer-identity skin (getGhostfaceCallInPool), playing that character's FULL
// real kit with UNLIMITED resource, for a fixed window, then auto-reverting to Ghostface.
//
// ENGINE REUSE (NOT Chrollo's trigger): this forks the Skill Hunter field-swap ENGINE — the same
// SKILL_HUNTER_FIELDS constant + the field writes proven by applySkillHunter — into its OWN _gfSwap*
// state namespace, exactly the way Transformation Jutsu (_tj*) forks it. applySkillHunter itself is left
// 100% untouched, so Chrollo's Skill Hunter cannot be affected. Differences from Skill Hunter, per spec:
//   (a) TRIGGER  = a MOTION + Special (tryGhostfaceSwapMotion, Transformation-Jutsu control model), NOT
//                  a charge combo and NOT the 3-distinct-move unlock. The motion picks the pool slot.
//   (b) TIMER    = fixed window, auto-revert; no manual early-end.
//   (c) RESOURCE = UNLIMITED during the window via the existing fighter.infiniteEnergy flag
//                  (spendEnergy/canSpendEnergy short-circuit on it) — prior value stashed + restored.
//   (d) TARGET   = a COMPANION from the equipped skin's pool, NOT the opponent.
const GF_SWAP_DURATION = 12 * 60   // 12s window (spec: 10-15s), fixed → auto-revert
const GF_SWAP_COST     = 35        // modest Dread cost per activation (freely repeatable, energy-gated only)

// Slot table — a facing-relative MOTION + Special picks companion pool[i] of the equipped identity.
// STRICT-matched (endsWithExact) + longest-first so the four motions never collide with each other or with
// Ghostface's held-direction knife specials. QCF/QCB = the two simplest; DBF/DFB = the two half-circles.
export const GHOSTFACE_SWAP_SLOTS = [
  { motion: ["D", "F"],      label: "↓→ + Special" },    // slot 0 — QCF
  { motion: ["D", "B"],      label: "↓← + Special" },    // slot 1 — QCB
  { motion: ["D", "B", "F"], label: "↓←→ + Special" },   // slot 2 — DBF
  { motion: ["D", "F", "B"], label: "↓→← + Special" },   // slot 3 — DFB
]
export function ghostfaceSwapSlotCombo(i) { return GHOSTFACE_SWAP_SLOTS[i] || null }

// Overwrite the live fighter with the companion's FULL kit. Mirrors applySkillHunter's field writes
// (kept in sync via the shared SKILL_HUNTER_FIELDS stash loop) + adds the infiniteEnergy grant.
export function applyGhostfaceSwap(fighter, targetKey) {
  const target = characters[targetKey]
  if (!target) return false
  // 1) stash Ghostface's originals (+ skin state + prior infiniteEnergy) for the revert
  const stash = {}
  for (const k of SKILL_HUNTER_FIELDS) stash[k] = fighter[k]
  stash._skinAnim = fighter._skinAnim; stash._recolorTag = fighter._recolorTag; stash._baseSkinAnim = fighter._baseSkinAnim
  stash.infiniteEnergy = fighter.infiniteEnergy
  // Stash Ghostface's OWN Dread (already debited the activation cost in triggerGhostfaceSwap) so the revert
  // restores it rather than refilling to full. Otherwise the window's infiniteEnergy would leave the meter
  // pinned high and the revert-clamp would hand back a FULL bar — making every swap after the first free and
  // the mechanic effectively permanent. Restoring the post-cost value keeps it "limited by Dread regen".
  stash.energy = fighter.energy
  fighter._gfSwapStash = stash
  // 2) overwrite with the companion's FULL kit (same field writes as applySkillHunter)
  fighter.rosterKey        = targetKey
  fighter.name             = target.name || targetKey
  fighter.color            = target.color || fighter.color
  fighter.basic_attacks    = target.basic_attacks || fighter.basic_attacks
  fighter.animationData    = target.animationData || fighter.animationData
  fighter.spriteScale      = target.spriteScale ?? fighter.spriteScale
  fighter.traits           = target.traits || fighter.traits
  fighter.ultimate         = target.ultimate || fighter.ultimate
  fighter.specials         = target.specials || fighter.specials
  fighter.passive          = target.passive || fighter.passive
  fighter.archetypes       = target.archetypes || fighter.archetypes
  fighter.primary          = target.primary || fighter.primary
  fighter.secondary        = target.secondary || fighter.secondary
  fighter.dashTeleport     = !!target.movement?.dashTeleport
  fighter.runWhenAdvancing = !!target.movement?.runWhenAdvancing
  fighter.introPool        = target.introPool || null
  fighter.hasSprites       = target.hasSprites !== false
  fighter.transformations     = target.transformations || null
  fighter.transformationOrder = target.transformationOrder || null
  fighter.currentForm         = (target.transformationOrder && target.transformationOrder[0]) || null
  fighter.transformIndex      = target.transformationOrder ? 0 : null
  // AFFILIATION SKIN (spec §3): the companion wears its "joined the killer" _crew skin for the whole swap —
  // ONE accent recoloured to the summoning killer's tint. Each companion is in exactly ONE identity's pool,
  // so `<companion>_crew` is unambiguous (no per-killer variant needed). _recolorTag="crew" ALSO makes
  // retagFormAnim swap to the __crew FORM sheets if the companion transforms mid-swap (Vegeta SSJ/Blue,
  // Goku Black SSJ Rose — those crew form sheets exist). Falls back to the companion's normal art if — for
  // any reason — a crew skin isn't present (getSkin returns slot 0 on a miss, so match the id explicitly).
  const crewId   = `${targetKey}_crew`
  const crewSkin = getSkin(targetKey, crewId)
  if (crewSkin && crewSkin.id === crewId && crewSkin.animationData) {
    fighter._skinAnim = crewSkin.animationData
    fighter._baseSkinAnim = crewSkin.animationData
    fighter._recolorTag = crewSkin.recolorTag || "crew"
  } else {
    fighter._skinAnim = null; fighter._baseSkinAnim = null; fighter._recolorTag = null   // fallback: companion's NORMAL art
  }
  fighter.maxEnergy  = target.stats?.maxEnergy || fighter.maxEnergy || 100
  fighter.energyType = target.traits?.energyType || fighter.energyType
  // 3) UNLIMITED resource for the window + full bar (so the borrowed kit is instantly, endlessly usable)
  fighter.infiniteEnergy = true
  fighter.energy         = fighter.maxEnergy
  // 4) clean transient state (also re-resolves the sprite handler against the new anim) + arm the window
  _edoClearTransient(fighter)
  fighter._gfSwapActive = true
  fighter._gfSwapTimer  = GF_SWAP_DURATION
  fighter._gfSwapTarget = targetKey
  fighter.ultimateCooldown = 0
  clearInputBuffer(fighter)
  // TRANSFORM-IN animation (spec §3 — "Ghostface visibly becomes the companion, not an instant pop"): a
  // smoke poof engulfs the fighter and the companion (in its crew skin) fades in through it via the teleport
  // flash. Reuses the clone-spawn / Kawarimi-substitution poof + the existing teleport fade, so it stays
  // purely COSMETIC and the swap keeps every balance property (NO i-frames, still eats hitstun, freely
  // repeatable). The literal "runs fully off-screen and returns" presentation belongs to the Backstage Pass
  // (§4.2), where the dash + trailing phantom hitbox justify and cover the vacated-position window.
  spawnClonePuff(fighter.x + (fighter.w || 60) / 2, fighter.y + (fighter.h || 100) / 2)
  fighter.teleportFlash = 16
  return true
}

export function revertGhostfaceSwap(fighter) {
  if (!fighter?._gfSwapActive || !fighter._gfSwapStash) return false
  const s = fighter._gfSwapStash
  _edoCleanseVesselState(fighter)                        // wipe any borrowed form/buff BEFORE restoring Ghostface
  for (const k of SKILL_HUNTER_FIELDS) fighter[k] = s[k]
  fighter._skinAnim = s._skinAnim || null; fighter._recolorTag = s._recolorTag || null; fighter._baseSkinAnim = s._baseSkinAnim || null
  fighter.infiniteEnergy = s.infiniteEnergy || false     // restore EXACT prior value (don't clobber a training toggle)
  _edoClearTransient(fighter)                            // clears own attack/cast (NOT hitstun/knockback → non-exploitable)
  fighter._gfSwapActive = false; fighter._gfSwapStash = null; fighter._gfSwapTarget = null; fighter._gfSwapTimer = 0
  fighter.energy = Math.min(s.energy || 0, fighter.maxEnergy || 0)   // restore the POST-COST Dread (no free refill → cost is real, gated by regen)
  clearInputBuffer(fighter)
  spawnClonePuff(fighter.x + (fighter.w || 60) / 2, fighter.y + (fighter.h || 100) / 2)   // TRANSFORM-OUT: Ghostface reappears through the same smoke poof (symmetric with swap-in)
  fighter.teleportFlash = 16
  return true
}

// Fixed-timer driver — counts the window down + auto-reverts (called every frame from game.js).
export function updateGhostfaceSwap(fighter) {
  if (!fighter || !fighter._gfSwapActive) return
  if (fighter._gfSwapTimer > 0) fighter._gfSwapTimer--
  if (fighter._gfSwapTimer <= 0) revertGhostfaceSwap(fighter)
}
export function isGhostfaceSwapActive(fighter) { return !!fighter?._gfSwapActive }
export function ghostfaceSwapTimer(fighter)   { return fighter?._gfSwapActive ? (fighter._gfSwapTimer || 0) : 0 }
export function ghostfaceSwapTarget(fighter)  { return fighter?._gfSwapActive ? (fighter._gfSwapTarget || null) : null }

// TRIGGER — swap into pool[slot] of the equipped identity. Deterministic: slot indexes straight into the
// (already pool-gated) companion list, so a given combo ALWAYS lands the same companion. Energy-gated only.
export function triggerGhostfaceSwap(fighter, slot, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "ghostface") return false   // only real Ghostface (not mid-swap)
  if (fighter._gfSwapActive) return false
  if (fighter.attacking || fighter.currentMove) return false                              // don't cancel a committed move
  const pool = getGhostfaceCallInPool(fighter)
  const targetKey = pool[slot]
  if (!targetKey || !characters[targetKey]) return false
  const cost = Math.round(GF_SWAP_COST * (fighter._gfSkinMod?.swapCostScale ?? 1))   // ROMAN identity: cheaper swap
  if (!spendEnergy(fighter, cost)) return false
  if (!applyGhostfaceSwap(fighter, targetKey)) return false
  fighter.vx = 0
  // If the player happens to be holding CHARGE when the swap fires, consume that hold so the swapped-in
  // companion doesn't inherit it (a charge-RELEASE would otherwise fire the companion's charge action —
  // e.g. Itachi Mangekyou's freeze cinematic). Cleared on release (game.js). See charge-input-bleed fix.
  fighter._suppressChargeUntilRelease = true
  try { shakeCamera(context, 5, 10) } catch (_) {}
  return true
}

// ═════════════════════════════════════════════════════════════════════════════
// GHOSTFACE — BACKSTAGE PASS (spec §4.2): the Special button. Ghostface dashes "off-screen"; a trailing
// PHANTOM hitbox — a visual-effect strike tied to the LIVE caster (NOT a second fighter instance) — lands
// at his vacated spot on a short delay ("hit you on the way out"); then he, or a swap companion, pops out.
// Four branches, decided by the modifiers held the frame Special is buffered (executeGhostfaceSpecial):
//   • switch  (neutral)          → cross-up teleport to the opponent's FAR side (phantom hit ON)
//   • getaway (hold Back)        → same-side reappear (evasive; inherits Stalk Vanish's i-frames; hit ON)
//   • fakeout (hold an attack)   → cancels the phantom hit, keeps the reposition (a mind-game whiff)
//   • swap    (hold Grab/Charge) → runs the existing Companion Swap into pool[slot] (motion picks slot)
// Cosmetic/mobility branches get evasive i-frames; the SWAP branch gets NONE (preserves the swap's
// deliberate no-free-entry balance — a clean hit during the dash CANCELS the swap-in).
const BP_COST          = 20             // Dread for a reposition Backstage Pass (the swap branch pays the SWAP cost at emerge, not this)
const BP_DASH_FRAMES   = 16             // "off-screen" travel before emerging
const BP_IFRAMES       = 18             // evasive i-frames on the reposition branches (Getaway == old Stalk Vanish); swap branch = 0
const BP_PHANTOM_DELAY = 8              // frames after cast the trailing hitbox connects
const BP_PHANTOM = { dmg: 40, hitstun: 20, knockbackX: 7, knockbackY: -4, rangeX: 150, rangeY: 130 }

// Arm a Backstage Pass. `branch` ∈ {switch, getaway, fakeout, swap}; `slot` is the companion index for swap.
export function triggerGhostfaceBackstagePass(fighter, branch, slot = 0, context = null) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "ghostface") return false
  if (fighter._bpActive || fighter._gfSwapActive) return false
  if (fighter.attacking || fighter.currentMove) return false                       // don't cancel a committed move
  if ((fighter.attackCooldown || 0) > 0) return false
  const isSwap = branch === "swap"
  if (isSwap) {
    // Pre-check the SWAP is affordable (Roman-scaled) so we never dash then fizzle; the actual spend happens
    // at emerge via triggerGhostfaceSwap. A non-Ghostface / empty-pool slot also fails here.
    const pool = getGhostfaceCallInPool(fighter)
    if (!pool[slot] || !characters[pool[slot]]) return false
    const swapCost = Math.round(GF_SWAP_COST * (fighter._gfSkinMod?.swapCostScale ?? 1))
    if (!canSpendEnergy(fighter, swapCost)) return false
  } else if (!spendEnergy(fighter, BP_COST)) {
    return false
  }
  const cx = (fighter.x || 0) + (fighter.w || 60) / 2
  const cy = (fighter.y || 0) + (fighter.h || 100) / 2
  fighter._bpActive   = true
  fighter._bpBranch   = branch
  fighter._bpSlot     = slot
  fighter._bpTimer    = BP_DASH_FRAMES
  fighter._bpEmerged  = false
  fighter._bpHitLanded = false
  // Fakeout is the ONLY branch that cancels the phantom hit; switch/getaway/swap all "hit on the way out".
  fighter._bpPhantom  = (branch === "fakeout") ? null : { x: cx, y: cy, delay: BP_PHANTOM_DELAY, done: false, ...BP_PHANTOM }
  // Evasive i-frames on the reposition branches; the swap branch stays hittable (balance). Getaway == Stalk Vanish.
  if (!isSwap) fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, BP_IFRAMES)
  // Dash "off-screen": switch/fakeout/swap surge toward the opponent (emerge behind), getaway slips away.
  fighter.vx = (branch === "getaway" ? -1 : 1) * (fighter.facing || 1) * (branch === "getaway" ? 15 : 17)
  fighter.vy = 0
  fighter.teleportFlash = 16
  try { spawnClonePuff(cx, cy) } catch (_) {}
  // If Grab/Charge is held (swap trigger), swallow the charge release so the swapped-in companion doesn't
  // inherit it (Itachi Mangekyou etc.) — same guard the direct swap uses. Harmless on the other branches.
  fighter._suppressChargeUntilRelease = true
  if (fighter.directionHistory) fighter.directionHistory.length = 0                // consume the buffered motion
  try { shakeCamera(context, 4, 8) } catch (_) {}
  return true
}

// The trailing phantom hitbox connects ONCE at the vacated position, on a delay, against the caster's foe.
function bpResolvePhantom(fighter, context) {
  const ph = fighter._bpPhantom
  if (!ph || ph.done) return
  if (ph.delay > 0) { ph.delay--; return }
  ph.done = true
  const opp = context?.getOpponent?.(fighter)
  if (!opp || opp.eliminated) return
  const oppCx = (opp.x || 0) + (opp.w || 60) / 2
  const oppCy = (opp.y || 0) + (opp.h || 100) / 2
  if (Math.abs(oppCx - ph.x) > ph.rangeX / 2 || Math.abs(oppCy - ph.y) > ph.rangeY / 2) return   // whiffed
  const blocked = !!opp.isBlocking
  const dmg = blocked ? Math.round(ph.dmg * 0.25) : ph.dmg
  opp.health = Math.max(0, (opp.health || 0) - dmg)
  if (blocked) { opp.blockstun = Math.max(opp.blockstun || 0, 12) }
  else {
    opp.hitstun = Math.max(opp.hitstun || 0, ph.hitstun)
    const away = oppCx >= ph.x ? 1 : -1                      // knocked AWAY from the vacated spot
    opp.vx = away * ph.knockbackX; opp.vy = ph.knockbackY
    opp.colorFlash = 12; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 8)
  }
  fighter._bpHitLanded = !blocked                            // test hook
  try { spawnClonePuff(ph.x, ph.y) } catch (_) {}
  try { shakeCamera(context, 4, 8) } catch (_) {}
}

// Emerge: reposition (or trigger the swap) once the dash completes.
function bpEmerge(fighter, context) {
  const opp = context?.getOpponent?.(fighter)
  const sw  = context?.worldWidth || 0
  const branch = fighter._bpBranch
  if (branch === "swap") {
    // Hand off to the existing Companion Swap (spends the swap cost, applies the crew skin + its own poof).
    triggerGhostfaceSwap(fighter, fighter._bpSlot || 0, context)
    bpClear(fighter)
    return
  }
  fighter.vx = 0; fighter.vy = 0
  if ((branch === "switch" || branch === "fakeout") && opp) {
    // Cross-up: emerge on the opponent's FAR side from where Ghostface started.
    const startedLeft = ((fighter._bpPhantom?.x) ?? ((fighter.x || 0) + (fighter.w || 60) / 2)) < ((opp.x || 0) + (opp.w || 60) / 2)
    fighter.x = startedLeft ? (opp.x || 0) + (opp.w || 60) + 8 : (opp.x || 0) - (fighter.w || 60) - 8
    fighter.y = opp.y ?? fighter.y
  } else if (opp) {
    // Getaway: stay on the same side, settle a step further back (retreat is already carried by the dash vx).
    fighter.x = (opp.x || 0) < (fighter.x || 0) ? (fighter.x || 0) + 10 : (fighter.x || 0) - 10
  }
  if (sw > 0) fighter.x = Math.max(0, Math.min(sw - (fighter.w || 60), fighter.x))
  if (opp) fighter.facing = ((opp.x || 0) >= (fighter.x || 0)) ? 1 : -1              // face the opponent on arrival
  fighter.teleportFlash = 16
  try { spawnClonePuff((fighter.x || 0) + (fighter.w || 60) / 2, (fighter.y || 0) + (fighter.h || 100) / 2) } catch (_) {}
  if (typeof context?.camera?.focusBetween === "function" && opp) context.camera.focusBetween(fighter, opp, 1.0, 10)
  fighter.attackCooldown = getAttackDuration(10, fighter)                           // brief recovery, not spammable
  bpClear(fighter)
}

function bpClear(fighter) {
  fighter._bpActive = false; fighter._bpBranch = null; fighter._bpPhantom = null
  fighter._bpTimer = 0; fighter._bpEmerged = false; fighter._bpSlot = 0
}

// Per-frame driver (called from game.js beside updateGhostfaceSwap, WITH the ability context for the foe).
export function updateGhostfaceBackstagePass(fighter, context) {
  if (!fighter || !fighter._bpActive) return
  // Interrupted mid-dash (only possible on the no-i-frame SWAP branch): a clean hit CANCELS the pass.
  if ((fighter.hitstun || 0) > 0 || fighter.knockdownState) { bpClear(fighter); return }
  bpResolvePhantom(fighter, context)
  if (fighter._bpTimer > 0) fighter._bpTimer--
  if (fighter._bpTimer <= 0 && !fighter._bpEmerged) { fighter._bpEmerged = true; bpEmerge(fighter, context) }
}
export function isGhostfaceBackstagePassActive(fighter) { return !!fighter?._bpActive }
export function ghostfaceBackstagePassBranch(fighter)   { return fighter?._bpActive ? (fighter._bpBranch || null) : null }

// ─────────────────────────────────────────────────────────────────────────────
// MAKI ZENIN (Stage 2) — naginata normals + "Cursed Tool Flurry" command chain.
//   The 5 basic normals (light/heavy/up/air/down_air) use the generic attack system
//   (characters.js basic_attacks + animationData) — no code here.
//   COMMAND CHAIN (Fwd+Heavy opener → re-tap Heavy on a CLEAN hit): makiG1 (low sweep-
//     kick) → makiG2 (roundhouse) → makiG3 (spinning axe-kick finisher). Cancel-on-hit;
//     a whiff/block ENDS the string (shared rekkaContinue, requireHit:true — the mid-chain
//     interrupt). Toji-Rekka pattern, twin of updateShinobuCommandCombat. No resource cost
//     (maxEnergy 0) — a pure normal-move chain, gated only by frame recovery. Specials
//     (Stage 3) and the HP-threshold transformation ultimate (Stage 4) land later.
// ─────────────────────────────────────────────────────────────────────────────
// HEAVENLY VOW rebalance: the cancel-on-hit link out of each opener is DELIBERATELY tightened to the first
// MAKI_CANCEL_FRAMES of recovery (a per-character override on the shared combo-flow cancel window — see
// combat.cancelWindowOpen). The move recovery/punishability is UNCHANGED (still 11/12/16f); only the input
// window in which the next Heavy links is narrowed, from the full recovery phase to ~5f (~83ms) — tighter
// than the roster-default full-recovery window. High-risk/high-reward: her damage is top-of-band, but the
// string only connects on precise timing. Scoped to Maki only; no other character sets _cancelWindowFrames.
const MAKI_CANCEL_FRAMES = 5
const MAKI_GROUND = {
  // Low knockback on the openers pins the target inside the string; the finisher delivers the knockback.
  // Damage raised ~+20% (Heavenly Vow) — Maki is now a top-of-band physical hitter (ATK 96), the counterweight
  // being the tightened link window above. Full string 34+40+56 = 130 RAW (~78 EFF).
  makiG1: { damage: 34, startup: 4, active: 3, recovery: 11, hitstun: 13, knockbackX: 1, knockbackY: 0,  rangeX: 98,  rangeY: 54, rekkaNext: "makiG2" },
  makiG2: { damage: 40, startup: 4, active: 3, recovery: 12, hitstun: 14, knockbackX: 1, knockbackY: 0,  rangeX: 96,  rangeY: 60, rekkaNext: "makiG3" },
  makiG3: { damage: 56, startup: 5, active: 3, recovery: 16, hitstun: 17, knockbackX: 9, knockbackY: -3, rangeX: 100, rangeY: 62 },   // finisher (ends the string)
}
function fireMakiCommand(fighter, key, context) {
  const md = MAKI_GROUND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = key → drives the stage sprite
  fighter._rekkaNext         = md.rekkaNext || null
  fighter._cmdHitLanded      = false   // latched true only on a real (non-blocked) hit → gates the continue
  fighter._cancelWindowFrames = MAKI_CANCEL_FRAMES   // per-character TIGHT link window (Heavenly Vow tradeoff)
  return true
}
export function updateMakiCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "maki" || !inputState) return false
  const opp       = context?.getOpponent?.(fighter)
  const grounded  = fighter.onGround ?? fighter.grounded ?? false
  const phase     = getPhase?.(fighter)
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy
  // CONTINUE — fresh Heavy during recovery on a clean hit → rekkaNext (shared rekkaContinue owns the gate).
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireMakiCommand(fighter, next, context)
  // OPENER — Forward+Heavy from neutral (grounded). Consumes the press so the neutral heavy stays normal.
  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && forward && heavyEdge) return fireMakiCommand(fighter, "makiG1", context)
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// KASUMI MIWA (Stage 2) — "Battojutsu Rush" katana command chain. Fwd+Heavy opener → re-tap Heavy on a
// CLEAN hit: miwaG1 (low lunge) → miwaG2 (dash-thrust) → miwaG3 (rising slash launcher finisher).
// Cancel-on-hit; a whiff/block ENDS the string (shared rekkaContinue, requireHit:true). Toji-Rekka twin of
// updateMakiCommandCombat/updateShinobuCommandCombat. The 5 base normals (light/heavy/up/air/down_air) use
// the generic attack system (basic_attacks + animationData) — no code here.
// ─────────────────────────────────────────────────────────────────────────────
const MIWA_GROUND = {
  // Low knockback on the openers pins the target inside the string; the launcher finisher delivers it.
  // Damage sits just under Maki's kick chain (Miwa ATK 86 vs 90) — a fast, technical sword string.
  miwaG1: { damage: 28, startup: 4, active: 3, recovery: 11, hitstun: 13, knockbackX: 1, knockbackY: 0,  rangeX: 98,  rangeY: 52, rekkaNext: "miwaG2" },   // low lunge opener
  miwaG2: { damage: 34, startup: 5, active: 3, recovery: 12, hitstun: 14, knockbackX: 2, knockbackY: 0,  rangeX: 108, rangeY: 54, rekkaNext: "miwaG3" },   // dash-thrust (extra reach)
  miwaG3: { damage: 48, startup: 6, active: 4, recovery: 17, hitstun: 20, knockbackX: 5, knockbackY: -9, launch: 10, rangeX: 100, rangeY: 66 },             // rising slash launcher finisher
}
function fireMiwaCommand(fighter, key, context) {
  const md = MIWA_GROUND[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = key → drives the stage sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the continue
  return true
}
export function updateMiwaCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "miwa" || !inputState) return false
  const opp       = context?.getOpponent?.(fighter)
  const grounded  = fighter.onGround ?? fighter.grounded ?? false
  const phase     = getPhase?.(fighter)
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy
  // CONTINUE — fresh Heavy during recovery on a clean hit → rekkaNext (shared rekkaContinue owns the gate).
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireMiwaCommand(fighter, next, context)
  // OPENER — Forward+Heavy from neutral (grounded). Consumes the press so the neutral heavy stays normal.
  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && forward && heavyEdge) return fireMiwaCommand(fighter, "miwaG1", context)
  return false
}

// ── MIWA SPECIALS (Stage 3) — cursed-energy cost (spendEnergy). Grounded Special = Iai Dash (gap-closer
// battojutsu); airborne Special = Rapid Slash Vortex (aerial slash + a SEPARATE vortex FX overlay layer,
// §10). The CHARGE button (hold P) is the cursed-energy charge stance — handled by the engine's charge
// system via animationData.charge (kasumi_charg), no code here. ──
function fireMiwaIaiDash(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 28)) return false
  const md = { damage: 66, startup: 5, active: 4, recovery: 18, hitstun: 22, blockstun: 12, knockbackX: 8, knockbackY: -3, rangeX: 122, rangeY: 50, isSpecial: true }
  const attack = createAttackFromMove(fighter, "iaiDash", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = iaiDash → dash-slash pose
  fighter.vx = (fighter.facing || 1) * 16   // fast iaijutsu dash-through
  try { shakeCamera(context, 4, 7) } catch (_) {}
  return true
}
function fireMiwaAirSlash(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 30)) return false
  const md = { damage: 58, startup: 4, active: 5, recovery: 14, hitstun: 18, blockstun: 10, knockbackX: 5, knockbackY: 4, rangeX: 98, rangeY: 84, isSpecial: true }
  const attack = createAttackFromMove(fighter, "airVortex", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = airVortex → CHARACTER slash frames
  // Spawn the VORTEX FX as a SEPARATE overlay layer (§10) — drawn on top of the body by game.drawMiwaVortex,
  // NOT part of the character sub-clip. Position is resolved at draw time from the fighter.
  fighter._miwaVortex = { t: 0, max: 24 }
  try { shakeCamera(context, 3, 6) } catch (_) {}
  return true
}
function executeMiwaSpecial(fighter, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "miwa") return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  return grounded ? fireMiwaIaiDash(fighter, context) : fireMiwaAirSlash(fighter, context)
}

// ── MAKI SPECIALS (Stage 3) — SPECIAL button, direction-branched via _specialHeldDir (Killua/Chrollo
// architecture). All COOLDOWN-gated (maxEnergy 0 → no spendEnergy; the no-energy roster gates specials
// on dedicated timers ticked in game.updateMiscTimers, like Shinobu's poisonCd/flitCd). Weapon variety is
// FOLDED IN as flavor here (kunai / nunchaku), NOT a full switching system:
//   Neutral / Forward = KUNAI THROW — a thrown kunai; an INDEPENDENT-COLLISION projectile (spawnProjectile,
//     its own hitbox/lifetime, resolved by combat.updateProjectiles). Maki's ranged poke.
//   Down              = NUNCHAKU FLURRY — pulls nunchaku for a committed spinning overhead melee combo
//     (10f flurry pose). A high-commitment close-range burst.
// The CHARGE button hosts POWER CHARGE (fireMakiPowerCharge, below) — a self-buff, wired via handleChargeRelease.
const MAKI_KUNAI_CD    = 66    // ~1.1s gate for the kunai throw
const MAKI_NUNCHAKU_CD = 96    // ~1.6s gate for the committed nunchaku flurry
const MAKI_NUNCHAKU_MD = { damage: 92, startup: 6, active: 6, recovery: 20, hitstun: 22, blockstun: 12, knockbackX: 8, knockbackY: -3, rangeX: 96, rangeY: 72, isSpecial: true }   // Heavenly Vow: 78→92
function fireMakiKunai(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if ((fighter.kunaiCd || 0) > 0) return false   // COOLDOWN gate (no energy cost)
  if (!(fighter._atkVoiceCd > 0)) { try { sound.playSfxFile?.(pickMakiVoice("kunai"), null); fighter._atkVoiceCd = 150 } catch (_) {} }   // Kunai Throw cast line (audio-only)
  fighter._spriteCastMove  = "makiKunai"          // 6f windup → release throw pose
  fighter._spriteCastTimer = 22
  fighter.attackCooldown   = getAttackDuration(24, fighter)
  fighter.kunaiCd          = MAKI_KUNAI_CD
  const face = fighter.facing || 1
  // Release the kunai on the forward beat (~frame 4 of the 6f throw), as its own independent projectile.
  schedulePendingSpawn(8, () => {
    spawnProjectile(fighter, "maki_kunai", {
      sheet: "./maki_kunai_proj.png", spriteFrames: 1, spriteW: 24, spriteH: 10, spriteScale: 2.0,
      damage: 60, speed: 14, hitstun: 16, knockbackX: 6, knockbackY: -1,   // Heavenly Vow: 52→60
      w: 34, h: 16, color: "#c9ccd1", lifetime: 100, isSpecial: true,
      vx: face * 14, spawnY: fighter.y + (fighter.h || 100) * 0.42
    }, context)
  })
  try { shakeCamera(context, 2, 4) } catch (_) {}
  return true
}
function fireMakiNunchaku(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if ((fighter.nunchakuCd || 0) > 0) return false   // COOLDOWN gate
  if (!(fighter._atkVoiceCd > 0)) { try { sound.playSfxFile?.(pickMakiVoice("nunchaku"), null); fighter._atkVoiceCd = 150 } catch (_) {} }   // Nunchaku Flurry cast line (audio-only)
  const md = MAKI_NUNCHAKU_MD
  const attack = createAttackFromMove(fighter, "makiNunchaku", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove "makiNunchaku" → the flurry pose
  fighter.nunchakuCd = MAKI_NUNCHAKU_CD
  fighter.vx = (fighter.facing || 1) * 6   // small step in as the flurry lands
  try { shakeCamera(context, 3, 6) } catch (_) {}
  return true
}
export function executeMakiSpecial(fighter, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "maki") return false
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const dir = fighter._specialHeldDir || null
  if (dir === "D") return fireMakiNunchaku(fighter, context)
  return fireMakiKunai(fighter, context)   // Neutral / Forward / Up / Back = Kunai Throw
}

// ── MAKI — POWER CHARGE (Stage 3, CHARGE button). A self-buff physical power-up (NOT a strike): holds the
// weapon-raised charge stance, then grants ~5s of boosted damage. Fired from game.handleChargeRelease on a
// CHARGE release (no energy — the hold just poses). Cooldown-gated. Stash/restore of damage+attack multiplier
// (combat takes the max) modeled on Killua's Godspeed buff; _makiPowerTimer ticks down in updateMiscTimers.
const MAKI_POWER_DUR  = 300   // 5s @60fps
const MAKI_POWER_CD   = 540   // 9s recast (5s buff + 4s downtime → not spammable)
const MAKI_POWER_MULT = 1.3
export function fireMakiPowerCharge(fighter, context) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "maki") return false
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if ((fighter._makiPowerCd || 0) > 0 || fighter._makiPowerActive) return false   // cooldown / already buffed
  fighter._makiPowerActive   = true
  fighter._makiPowerTimer    = MAKI_POWER_DUR
  if (!(fighter._atkVoiceCd > 0)) { try { sound.playSfxFile?.(pickMakiVoice("powerCharge"), null); fighter._atkVoiceCd = 150 } catch (_) {} }   // Power Charge cast line (audio-only)
  // The per-frame form-sync (updateFighterAbilities) re-applies damage/attackMultiplier FROM
  // currentFormData every frame, so a direct set would be wiped next frame (the currentFormData
  // gotcha). Ride the buff on a CLONE of the current form (never mutate the shared base object)
  // so the sync itself keeps applying 1.3×; the revert restores the previous form ref.
  const bf = fighter.currentFormData || {}
  fighter._makiPowerPrevForm = fighter.currentFormData      // may be null/undefined → restored as-is
  fighter._makiPowerFormSwapped = true
  fighter.currentFormData = { ...bf,
    damageMultiplier: (bf.damageMultiplier || 1) * MAKI_POWER_MULT,
    attackMultiplier: (bf.attackMultiplier || bf.damageMultiplier || 1) * MAKI_POWER_MULT }
  fighter.damageMultiplier   = fighter.currentFormData.damageMultiplier   // immediate (also re-synced each frame)
  fighter.attackMultiplier   = fighter.currentFormData.attackMultiplier
  fighter._spriteCastMove    = "makiCharge"                     // weapon-raised power-up pose
  fighter._spriteCastTimer   = 26
  fighter._makiPowerCd       = MAKI_POWER_CD
  fighter.colorFlash         = Math.max(fighter.colorFlash || 0, 12)
  try { shakeCamera(context, 3, 7) } catch (_) {}
  return true
}
export function revertMakiPowerCharge(fighter) {
  if (!fighter || !fighter._makiPowerActive) return
  fighter._makiPowerActive = false
  fighter._makiPowerTimer  = 0
  if (fighter._makiPowerFormSwapped) { fighter.currentFormData = fighter._makiPowerPrevForm; fighter._makiPowerPrevForm = null; fighter._makiPowerFormSwapped = false }
  const bf = fighter.currentFormData || {}
  fighter.damageMultiplier = bf.damageMultiplier || 1
  fighter.attackMultiplier = bf.attackMultiplier || bf.damageMultiplier || 1
}

// ═════════════════════════════════════════════════════════════════════════════
// MAKI — "CURSED TOOL AWAKENING" (Stage 4). Her Shibuya-Arc black-costume form. The build's most novel
// mechanic: an HP-THRESHOLD ULTIMATE, not a meter ult (she has no energy). The transform OPTION unlocks
// only once her HP drops to ≤25% (game.trackMakiShibuyaUnlock sets _shibuyaUnlocked, which PERSISTS the
// rest of the match even if she heals above 25% — a genuine risk/reward comeback). Player-triggered via the
// Ultimate button; ONE-WAY for the round (no drain/revert — Maki has no meter; resetRound rebuilds a fresh
// base-form fighter). Built on the Samurai Mega _skinAnim tier-swap: the whole moveset's LOOK swaps to the
// maki_ultimate_* Shibuya sheets, buff via the `shibuya` currentFormData form, + a scale bump (the Shibuya
// source art is drawn smaller). guard/hurt/dash/specials are intentionally ABSENT from the swap table → they
// fall back to base-form art (sprite.js reads _skinAnim?.[a] || animationData?.[a]) — the Stage-0-approved
// base-form fallback. The activation plays makiShibuyaCinematic (freeze-cinematic; flash-only, no second
// body → duplicate-render-immune).
// ═════════════════════════════════════════════════════════════════════════════
const MAKI_SHIBUYA_SCALE = 1.86   // Shibuya idle body 57px × 1.86 ≈ 106px = base on-screen height (source art is smaller than base)
// NOTE: the Shibuya (Ultimate) form is GORE-FREE by DEFAULT for every skin — the sheets below point at the
// *_covered.png art (arm blood/gore masked over with a dark long-sleeve; tools/gen_maki_covered.py). This
// is the BASE Shibuya art itself now, not an opt-in "Covered" skin. The original gore *_uniform.png sheets
// are kept on disk (unreferenced) as a backup. See the removed makiCovered skin / MAKI_SHIBUYA_ANIM_COVERED.
const MAKI_SHIBUYA_ANIM = {
  // movement
  idle: { frames: 3, width: 38, height: 57, speed: 7, anchorY: 0, loop: true,  sheet: "./maki_shibuya_idle_covered.png" },
  walk: { frames: 6, width: 55, height: 50, speed: 6, anchorY: 0, loop: true,  sheet: "./maki_shibuya_run_covered.png" },
  run:  { frames: 6, width: 55, height: 50, speed: 4, anchorY: 0, loop: true,  sheet: "./maki_shibuya_run_covered.png" },
  jump: { frames: 4, width: 43, height: 58, speed: 5, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_jump_covered.png" },
  fall: { frames: 1, width: 43, height: 58, speed: 6, anchorY: 0, sourceX: 129, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_jump_covered.png" },
  // transformation-reveal pose (held through the cinematic via _spriteCastMove = "shibuyaIntro")
  shibuyaIntro: { frames: 4, width: 100, height: 58, speed: 8, anchorY: 0, loop: true, sheet: "./maki_shibuya_intro_covered.png" },
  // 5 normals — the awakened sword moveset (same basic_attacks frame data, buffed by the shibuya form)
  light:    { frames: 4, width: 73, height: 74, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_light_covered.png" },      // slash (white arc)
  heavy:    { frames: 7, width: 58, height: 57, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_heavy_covered.png" },      // thrust combo
  up:       { frames: 5, width: 69, height: 66, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_up_covered.png" },         // rising launcher (purple arc)
  air:      { frames: 2, width: 75, height: 53, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_air_covered.png" },         // aerial thrust
  down_air: { frames: 3, width: 62, height: 61, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_downair_covered.png" },     // descending strike
  // command chain — restyled with the surplus Shibuya sheets so the kick rekka reads as sword strikes
  makiG1:   { frames: 3, width: 73, height: 49, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_g1_covered.png" },
  makiG2:   { frames: 3, width: 59, height: 59, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_g2_covered.png" },
  makiG3:   { frames: 5, width: 62, height: 44, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: "./maki_shibuya_g3_covered.png" }
}
function isMaki(f) { return (f?.rosterKey || "").toLowerCase() === "maki" }
export function makiShibuyaActive(f) { return !!f?._shibuyaActive }
// Apply the black-costume moveset swap + buff + scale. Called at activation (immediately, so the held
// reveal pose resolves via _skinAnim); one-way for the round.
function enterMakiShibuya(fighter) {
  if (!fighter || fighter._shibuyaActive) return
  if (fighter._makiPowerActive) revertMakiPowerCharge(fighter)   // clear the Power Charge form-swap first, else its later revert would clobber the shibuya currentFormData
  fighter._shibuyaActive   = true
  fighter.currentForm      = "shibuya"
  // The Shibuya art is gore-free for EVERY skin (MAKI_SHIBUYA_ANIM already points at the covered sheets).
  fighter._skinAnim        = retagFormAnim(MAKI_SHIBUYA_ANIM, fighter._recolorTag)   // tier-swap the sprite table (recolor-safe; tag is null today)
  fighter.currentFormData  = fighter.transformations?.shibuya || fighter.currentFormData   // per-frame form-sync applies the 1.25×/1.1×/1.05× buff
  fighter._shibuyaBaseScale = fighter.spriteScale
  fighter.spriteScale      = MAKI_SHIBUYA_SCALE
  fighter._spriteCastMove  = "shibuyaIntro"                        // hold the reveal pose through the cinematic
  fighter._spriteCastTimer = 170
  fighter.teleportFlash    = Math.max(fighter.teleportFlash || 0, 12)
}
function executeMakiShibuyaUltimate(fighter, context) {
  if (!isMaki(fighter)) return false
  if (fighter._shibuyaActive) return false        // already transformed (one-way)
  if (!fighter._shibuyaUnlocked) return false      // HP-threshold not yet reached → the Ultimate button is a no-op
  if (isMakiShibuyaCinematicActive()) return false
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const opp = context?.getOpponent?.(fighter) || null
  fighter.vx = 0
  // Shibuya-activation voice fires HERE at the transform CAST beat — before activateMakiShibuyaCinematic
  // plays the reveal — so the "getting serious / turn it around" line lands on the windup, not the reveal.
  try { sound.playSfxFile?.(pickMakiVoice("shibuyaActivation"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  enterMakiShibuya(fighter)                        // swap NOW so the held reveal pose resolves via _skinAnim
  activateMakiShibuyaCinematic(fighter, opp)
  fighter._suppressUltCooldown = true              // one-way transform → no recast-lockout needed
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// ZENITSU SPECIAL — SPECIAL button, direction-branched via _specialHeldDir (Killua/Gon architecture).
//   Neutral (+Back/Up) = THUNDER BREATHING FIRST FORM: Thunderclap and Flash — a fast, single-
//     decisive-hit DASH-STRIKE (he lunges forward on the strike). Blockable. COOLDOWN-gated
//     (thunderCd), NOT energy-gated — Zenitsu has maxEnergy 0, so the no-energy roster gates its
//     specials on a dedicated cooldown timer (mirrors Toji's chainCooldown), ticked in
//     game.updateMiscTimers. This is the SAME cooldown mechanism the Stage-5 Ultimate reuses.
//   Forward / Down = DOUBLE ATTACK (Tanjiro / Inosuke) — wired in Stage 4 (both currently fall through
//     to the Thunderclap so the button is never dead).
// ─────────────────────────────────────────────────────────────────────────────
const ZENITSU_THUNDER_CD = 90   // ~1.5s at 60fps — anti-spam gate for the free (no-energy) dash-strike
const ZENITSU_DOUBLE_CD  = 150  // ~2.5s — shared cooldown for BOTH Double Attack variants (Tanjiro/Inosuke)
function executeZenitsuSpecial(fighter, context) {
  // Direction-branched (Killua/Gon architecture) via _specialHeldDir:
  //   Forward = DOUBLE ATTACK: Tanjiro   ·   Down = DOUBLE ATTACK: Inosuke   ·   Neutral = Thunderclap.
  const dir = fighter._specialHeldDir || null
  if (dir === "F") return fireZenitsuDoubleAttack(fighter, context, "tanjiro")
  if (dir === "D") return fireZenitsuDoubleAttack(fighter, context, "inosuke")
  return fireZenitsuThunderclap(fighter, context)
}

// ── DOUBLE ATTACK (Stage 4) — two hardcoded partner variants, ONE special, shared cooldown ─────────
// A scripted PINCER combo (NOT two independently-controlled fighters): Zenitsu flash-dashes in from his
// side (his zenThunderclap pose + forward lunge) while the chosen partner (Tanjiro water-slash / Inosuke
// dual-blade) is spawned on the OPPONENT'S FAR side and rushes INWARD — the opponent is caught between
// both. The partner is a sprite-backed summon (rush → one-hit → poof via spawnClonePuff). Cooldown-gated
// (doubleAtkCd), NOT energy-gated (Zenitsu has maxEnergy 0). Both variants share ZENITSU_DOUBLE_CD.
function fireZenitsuDoubleAttack(fighter, context, partner) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if ((fighter.doubleAtkCd || 0) > 0) return false   // COOLDOWN gate (shared by both variants)
  const opp = context?.getOpponent?.(fighter)
  const dir = fighter.facing || 1
  // ZENITSU'S half — a lunging flash-strike from his side (reuses the lightning dash-in pose).
  const md = { damage: 70, startup: 6, active: 5, recovery: 20, hitstun: 22, blockstun: 12, knockbackX: 8, knockbackY: -2, rangeX: 104, rangeY: 62, isSpecial: true }
  const attack = createAttackFromMove(fighter, "zenThunderclap", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter.vx = dir * 12
  for (const t of [2, 4, 6, 8]) schedulePendingSpawn(t, () => { if (fighter.currentAttack && fighter.currentAttack.name === "zenThunderclap") fighter.vx = dir * 12 })
  // PARTNER'S half — spawn the scripted partner on the opponent's FAR side; it rushes back inward.
  if (opp) {
    const summonId = partner === "tanjiro" ? "zenitsuTanjiro" : "zenitsuInosuke"
    const p = spawnAssistSummon(fighter, summonId, opp)
    if (p) {
      p.x = opp.x + dir * 90            // land BEYOND the opponent (far side) → rush behavior carries it inward
      p.y = opp.y + (p.offsetY || 0)
      p.facing = -dir                   // face back toward the opponent (movement re-derives this each frame)
    }
  }
  fighter.doubleAtkCd = ZENITSU_DOUBLE_CD
  // VOICE: Double Attack "full commitment" finisher line — fires on BOTH variants (audio-only). Set
  // _atkVoiceCd so the offense-connect bark can't stack on the cast line.
  try { sound.playSfxFile?.(pickZenitsuVoice("doubleAttack"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  fighter._doubleAtkVariant = partner   // telemetry/harness
  shakeCamera(context, 7, 12)
  return true
}

// ── ZENITSU ULTIMATE (Stage 5) — Thunderclap & Flash: Godspeed (dash-through slice) ────────────────
// DELIBERATELY unlike every other roster ultimate. Key properties:
//   • DASH-THROUGH: crouch-charge → flash-blink PAST the opponent to the far side (not a stationary hit).
//   • SAME-LEVEL: only connects if both fighters are at matching level (both grounded, or both airborne
//     at matching height). On a mismatch it WHIFFS — the dash still fires + the cooldown is still spent
//     (chosen over refund/block: simpler, and less exploitable — mistiming costs you the window, and a
//     free refund would let you mash it safely until the levels line up).
//   • UNBLOCKABLE: attack.unblockable bypasses combat.resolveAttackHit's guard branch (a real exception).
//   • HIGH DAMAGE: 300 raw → 180 EFF (scaled pipeline, honest side of the audit) — Rick-ult tier.
//   • COOLDOWN-GATED, NOT ENERGY: reuses the EXISTING universal `ultimateCooldown` gate (triggerUltimate
//     already blocks on it), but stamped SHORT (8s) via `_suppressUltCooldown` instead of the 20s default.
//     No energy is spent (Zenitsu has maxEnergy 0). See ZENITSU_ASSET_MAP.md / BALANCE_AUDIT flag.
const ZENITSU_ULT_CD = 480   // 8s @ 60fps — short real-time recast (design band 5-10s)
function zenitsuSameLevel(a, b) {
  const aG = a.onGround ?? a.grounded ?? true
  const bG = b.onGround ?? b.grounded ?? true
  if (aG && bG) return true                       // both grounded = same level
  if (aG !== bG) return false                     // one grounded, one airborne = mismatch
  return Math.abs((a.y || 0) - (b.y || 0)) <= 46  // both airborne → matching height
}
function executeZenitsuUltimate(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const target = context?.getOpponent?.(fighter)
  const dir = fighter.facing || 1
  // VOICE: ultimate ACTIVATION cry ("Godspeed!" / "Thunder Breathing: Total Concentration!") — fires
  // HERE, on activation, BEFORE the dash blink is scheduled (NOT on connect). Random of the two.
  try { sound.playSfxFile?.(pickZenitsuVoice("ultimate"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  const sameLevel = !!target && zenitsuSameLevel(fighter, target)
  const STARTUP = 10
  const md = { damage: 300, startup: STARTUP, active: 6, recovery: 22, hitstun: 34, blockstun: 0, knockbackX: 15, knockbackY: -5, rangeX: 150, rangeY: 72, isSpecial: true }
  const attack = createAttackFromMove(fighter, "zenUltimate", md, { minActiveStart: STARTUP, minActiveEnd: STARTUP + md.active })
  attack.isSpecial = true
  attack.isUltimate = true
  attack.unblockable = true               // bypass the guard check (deliberate)
  if (!sameLevel) attack.hasHit = true    // LEVEL MISMATCH → inert hitbox = clean whiff (cooldown still spent)
  setAttackState(fighter, attack, STARTUP + md.active + md.recovery)
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, STARTUP + 10)   // i-frames covering the blink
  fighter._zenUltWhiff = !sameLevel       // telemetry/harness
  // DASH-THROUGH: after the crouch-charge startup, blink PAST the opponent to the far side.
  schedulePendingSpawn(STARTUP, () => {
    if (target) {
      const sw = context?.worldWidth || 3200
      const gap = (target.w || 60) + 30
      fighter.x = Math.max(0, Math.min(sw - (fighter.w || 60), target.x + dir * gap))   // ends on the far side (passed through)
      fighter.vx = dir * 6
      fighter.facing = (target.x >= fighter.x) ? 1 : -1
    }
  })
  // SHORT cooldown (NOT energy) — reuse the universal ultimateCooldown gate, stamped 8s not 20s.
  fighter._suppressUltCooldown = true
  fighter.ultimateCooldown = ZENITSU_ULT_CD
  shakeCamera(context, 9, 16)
  focusCameraOnAction(context, fighter, target, 1.0, 10)
  return true
}
// FIRST FORM: THUNDERCLAP AND FLASH — near-instant lunging strike. Fast startup, one heavy hit, he
// travels forward INTO the opponent (the canon dash-through feel, kept blockable/normal here; the
// UNBLOCKABLE dash-THROUGH is the Stage-5 Ultimate). currentMove = "zenThunderclap" → the lightning-
// trail dash sprite.
function fireZenitsuThunderclap(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if ((fighter.thunderCd || 0) > 0) return false   // COOLDOWN gate (no energy cost)
  const md = { damage: 130, startup: 6, active: 4, recovery: 17, hitstun: 26, blockstun: 14, knockbackX: 12, knockbackY: -3, rangeX: 104, rangeY: 60, isSpecial: true }
  const attack = createAttackFromMove(fighter, "zenThunderclap", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "zenThunderclap" → dash-strike sprite
  // DASH-IN lunge: reassert forward velocity across startup→active so he closes the gap on the strike.
  const dir = fighter.facing || 1
  fighter.vx = dir * 13
  for (const t of [2, 4, 6, 8]) schedulePendingSpawn(t, () => { if (fighter.currentAttack && fighter.currentAttack.name === "zenThunderclap") fighter.vx = dir * 13 })
  fighter.thunderCd = ZENITSU_THUNDER_CD
  // VOICE: First Form callout ("Thunder Breathing, First Form!") — random of the two (audio-only). Set
  // _atkVoiceCd so the offense-connect bark can't double up on top of this cast line (Gon precedent).
  try { sound.playSfxFile?.(pickZenitsuVoice("thunderclap"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  shakeCamera(context, 5, 8)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// TOBIRAMA — taijutsu command chain + 2 free pokes (Stage 3). Mirrors the Omega
// Ranger architecture (chain + pokes), cancel-on-HIT (Vegeta/Killua pattern).
// CHAIN (Fwd+Heavy → re-tap Heavy): tobiCombo1 → tobiCombo2 (water-infused strike) →
//   tobiComboFin (super downward slam finisher). A stage only advances if the prior
//   hit CONNECTED — a block/whiff (no _cmdHitLanded) ends the string = mid-chain interrupt.
// FREE POKES (cooldown-gated, no energy): Fwd+Light = Strong Forward (tumbling launcher);
//   Back+Heavy = Rising Knee (anti-air launcher). Neutral light/heavy/up/air/down_air stay
//   on the normal path. Each stage's sprite is its currentMove key (sprite.js identity map).
// ─────────────────────────────────────────────────────────────────────────────
const TOBIRAMA_CMD = {
  tobiCombo1:   { damage: 42, startup: 5, active: 3, recovery: 11, hitstun: 13, knockbackX: 3,  knockbackY: 0,  rangeX: 80, rangeY: 54, rekkaNext: "tobiCombo2" },
  tobiCombo2:   { damage: 46, startup: 5, active: 3, recovery: 12, hitstun: 15, knockbackX: 3,  knockbackY: -1, rangeX: 88, rangeY: 56, rekkaNext: "tobiComboFin" },   // water-infused strike (built-in blue burst art)
  tobiComboFin: { damage: 84, startup: 8, active: 4, recovery: 22, hitstun: 26, knockbackX: 11, knockbackY: 4,  rangeX: 92, rangeY: 58 },   // downward slam finisher (string ends here)
}
const TOBIRAMA_POKE = {
  tobiStrongFwd:  { damage: 66, startup: 6, active: 4, recovery: 16, hitstun: 22, knockbackX: 8, knockbackY: -11, rangeX: 90, rangeY: 96, launcher: true, cd: 32 },  // committed forward tumbling launcher
  tobiRisingKnee: { damage: 56, startup: 6, active: 4, recovery: 14, hitstun: 18, knockbackX: 3, knockbackY: -13, rangeX: 74, rangeY: 92, launcher: true, cd: 28 },  // rising-knee anti-air
}
function fireTobiramaCmd(fighter, key) {
  const md = TOBIRAMA_CMD[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the tobiComboN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
function fireTobiramaPoke(fighter, key) {
  const md = TOBIRAMA_POKE[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.cd)   // FREE — cooldown only, no spendEnergy
  fighter._rekkaNext    = null             // pokes are not part of the chain
  fighter._cmdHitLanded = false
  return true
}
// Grounded command-normal driver (mirrors updateOmegaRangerCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateTobiramaCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "tobirama" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)

  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  const lightEdge = !!inputState.light && !fighter._cmdPrevLight
  fighter._cmdPrevHeavy = !!inputState.heavy
  fighter._cmdPrevLight = !!inputState.light

  // CONTINUE — fresh Heavy during the current part's RECOVERY, only if it CONNECTED (cancel-on-hit).
  const opp  = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireTobiramaCmd(fighter, next)

  const forward = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const back    = fighter.facing === 1 ? !!inputState.left  : !!inputState.right
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (!canStart || !grounded) return false

  // OPENERS (down blocks in this engine, so back is free for a command).
  if (forward && heavyEdge) return fireTobiramaCmd(fighter, "tobiCombo1")     // Fwd+Heavy → chain opener
  if (forward && lightEdge) return fireTobiramaPoke(fighter, "tobiStrongFwd")  // Fwd+Light → Strong Forward poke
  if (back    && heavyEdge) return fireTobiramaPoke(fighter, "tobiRisingKnee") // Back+Heavy → Rising Knee poke
  return false
}

// ─────────────────────────────────────────────────────────────────────────────
// MINATO — "Yellow Flash Rush" taijutsu command chain + 2 free pokes (Stage 2).
// Mirrors updateTobiramaCommandCombat EXACTLY (chain + pokes, cancel-on-HIT).
// CHAIN (Fwd+Heavy → re-tap Heavy): minatoRush1 (taijutsu string) → minatoRush2
//   (Yellow-Flash kunai flurry) → minatoRushFin (flipping downward slam, launches).
//   A stage only advances if the prior hit CONNECTED — a block/whiff ends the string
//   (mid-chain interrupt). FREE POKES (cooldown-gated, no energy): Fwd+Light = Floor
//   Combo (advancing string launcher); Back+Heavy = Melee Rush (dashing kunai rush).
//   Neutral light/heavy/up/air/down_air stay on the normal path. Each stage's sprite
//   is its currentMove key (sprite.js identity map → minato.animationData).
// ─────────────────────────────────────────────────────────────────────────────
const MINATO_CMD = {
  minatoRush1:   { damage: 42, startup: 4, active: 3, recovery: 10, hitstun: 13, knockbackX: 3,  knockbackY: 0,  rangeX: 80, rangeY: 54, rekkaNext: "minatoRush2" },
  minatoRush2:   { damage: 48, startup: 5, active: 3, recovery: 12, hitstun: 15, knockbackX: 3,  knockbackY: -1, rangeX: 90, rangeY: 58, rekkaNext: "minatoRushFin" },   // Yellow-Flash kunai flurry
  minatoRushFin: { damage: 86, startup: 8, active: 4, recovery: 22, hitstun: 26, knockbackX: 11, knockbackY: -6, rangeX: 92, rangeY: 60, launcher: true },   // flip-slam launcher finisher (string ends here)
}
const MINATO_POKE = {
  minatoFloorCombo: { damage: 70, startup: 6, active: 5, recovery: 18, hitstun: 22, knockbackX: 9, knockbackY: -12, rangeX: 96, rangeY: 74, launcher: true, cd: 34 },  // advancing floor-combo launcher
  minatoMeleeRush:  { damage: 62, startup: 5, active: 4, recovery: 16, hitstun: 19, knockbackX: 7, knockbackY: -2,  rangeX: 92, rangeY: 60, cd: 30 },                  // dashing kunai rush
}
function fireMinatoCmd(fighter, key) {
  const md = MINATO_CMD[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // sets currentMove = key → drives the minatoRushN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the cancel
  return true
}
function fireMinatoPoke(fighter, key) {
  const md = MINATO_POKE[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = !!md.launcher
  setAttackState(fighter, attack, md.cd)   // FREE — cooldown only, no spendEnergy
  fighter._rekkaNext    = null             // pokes are not part of the chain
  fighter._cmdHitLanded = false
  return true
}
// Grounded command-normal driver (mirrors updateTobiramaCommandCombat). Returns true (→ skip the
// normal path this frame) only when it actually fires a stage.
export function updateMinatoCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "minato" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)

  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  const lightEdge = !!inputState.light && !fighter._cmdPrevLight
  fighter._cmdPrevHeavy = !!inputState.heavy
  fighter._cmdPrevLight = !!inputState.light

  // CONTINUE — fresh Heavy during the current part's RECOVERY, only if it CONNECTED (cancel-on-hit).
  const opp  = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireMinatoCmd(fighter, next)

  const forward = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const back    = fighter.facing === 1 ? !!inputState.left  : !!inputState.right
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (!canStart || !grounded) return false

  // OPENERS (down blocks in this engine, so back is free for a command).
  if (forward && heavyEdge) return fireMinatoCmd(fighter, "minatoRush1")       // Fwd+Heavy → chain opener
  if (forward && lightEdge) return fireMinatoPoke(fighter, "minatoFloorCombo") // Fwd+Light → Floor Combo poke
  if (back    && heavyEdge) return fireMinatoPoke(fighter, "minatoMeleeRush")  // Back+Heavy → Melee Rush poke
  return false
}

// ── KILLUA SPECIAL — direction-branched menu (SPECIAL button) ────────────────────────────────
// Reads the LIVE held direction stamped by game.js (fighter._specialHeldDir) the frame Special is
// pressed — robust vs the time-windowed motion history. Neutral = Yo-Yo (Stage 3), Forward =
// Lightning Palm, Down = Electric Ball (Stage 4). Back/Up fall through to the neutral yo-yo.
function executeKilluaSpecial(fighter, context) {
  const dir = fighter._specialHeldDir || null
  if (dir === "F") return fireKilluaLightningPalm(fighter, context)
  if (dir === "D") return fireKilluaElectricBall(fighter, context)
  return fireKilluaYoyo(fighter, context)
}

// NEUTRAL — the Yo-Yo (throw → travel → retract boomerang) — Stage 3.
// The assassin's mid-range disruption tool. A throw CAST pose plays while an independently-
// traveling electric yo-yo (killua_yoyo_fx.png spin cycle) flies OUT with its own collision;
// on contact OR at max range it RETRACTS — homing back to Killua's live position — and despawns
// on pickup (generic `boomerang` projectile behaviour added in combat.js). RETRACT TRIGGER =
// max-range OR on-hit (both), NOT a second button press: the projectile art is a symmetric spin
// cycle with no distinct "recall" frames, so a boomerang read is what the frames support. The
// return trip is VISUAL only (collision is skipped while `returning`) — a clean single-hit throw,
// no double-dip. Costs 30 Nen.
function fireKilluaYoyo(fighter, context) {
  if (!spendEnergy(fighter, 30)) return false
  try { sound.playSfxFile?.(pickKilluaVoice("specialCast"), null) } catch (_) {}   // VOICE: generic special-cast bark (un-named technique)
  fighter._spriteCastMove  = "yoyoThrow"     // 4f throw pose (killua_yoyo_throw_uniform)
  fighter._spriteCastTimer = 20
  fighter.attackCooldown   = getAttackDuration(24, fighter)
  // Release the yo-yo a few frames in, on the throw motion's release beat (part_1's hand-open).
  schedulePendingSpawn(6, () => {
    spawnProjectile(fighter, "killua_yoyo", {
      sheet: "./killua_yoyo_fx.png", spriteFrames: 5, spriteW: 41, spriteH: 47, spriteSpeed: 2, spriteScale: 1.1,
      damage: 70, speed: 15, hitstun: 16, knockbackX: 6, knockbackY: -2,
      w: 30, h: 30, color: "#38bdf8", lifetime: 220,
      boomerang: true, maxRange: 360, retractSpeed: 17,   // travels out ≤360px, then homes back to owner
      spawnY: fighter.y + (fighter.h || 100) * 0.4
    }, context)
  })
  return true
}

// FORWARD — Lightning Palm (Kannon): a point-blank electric burst — Stage 4.
// A committed melee-range createAttackFromMove (like Netero's Barrage special), high hitstun / low
// knockback so it's a combo starter, not a launcher. The electric_push cast pose sells the palm arc.
// Steps Killua slightly forward into the thrust. Costs 25 Nen.
function fireKilluaLightningPalm(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 25)) return false
  try { sound.playSfxFile?.(pickKilluaVoice("specialPalm"), null) } catch (_) {}   // VOICE: strike-technique callout (PROVISIONAL: gale/jinnai → Lightning Palm)
  const md = { damage: 62, startup: 6, active: 5, recovery: 14, hitstun: 26, blockstun: 12, knockbackX: 3, knockbackY: 0, rangeX: 74, rangeY: 60, isSpecial: true }
  const attack = createAttackFromMove(fighter, "lightningPalm", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "lightningPalm" → the cast pose
  fighter.vx = (fighter.facing || 1) * 4
  shakeCamera(context, 4, 7)
  return true
}

// DOWN — Electric Ball: a traveling electric orb projectile — Stage 4.
// A ranged poke (no retract, unlike the yo-yo). The electric_ball cast pose charges → forms → hurls;
// the orb releases partway through the animation and flies straight as a procedural glowing sphere
// (no dedicated clean orb frame in the batch). Costs 30 Nen.
function fireKilluaElectricBall(fighter, context) {
  if (!spendEnergy(fighter, 30)) return false
  try { sound.playSfxFile?.(pickKilluaVoice("specialCast"), null) } catch (_) {}   // VOICE: generic special-cast bark (un-named technique)
  fighter._spriteCastMove  = "electricBall"   // 11f charge→form→hurl pose (killua_electric_ball_uniform)
  fighter._spriteCastTimer = 24
  fighter.attackCooldown   = getAttackDuration(28, fighter)
  const face = fighter.facing || 1
  // Hurl on the release beat (~frame 12 of the charge), after the ball visually forms.
  schedulePendingSpawn(12, () => {
    spawnProjectile(fighter, "killua_electricBall", {
      damage: 60, speed: 13, lifetime: 90, hitstun: 18, knockbackX: 6, knockbackY: -2,
      w: 34, h: 34, radius: 18, color: "#7dd3fc", spriteScale: 1.4,   // procedural glowing electric orb
      vx: face * 13, spawnY: fighter.y + (fighter.h || 100) * 0.42
    }, context)
    shakeCamera(context, 4, 6)
  })
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// HISOKA — SPECIAL menu (SPECIAL button, direction-branched via _specialHeldDir).
//   • Neutral = Bungee Gum (Stage 3) — extended-reach elastic-whip MELEE lash (NOT a grab).
//   • Forward / Down = Texture Surprise cards (Stage 4 — rapid spread / single precise throw).
// Reads the LIVE held direction game.js stamps (fighter._specialHeldDir) the frame Special is pressed.
// ─────────────────────────────────────────────────────────────────────────────
// INPUT SPLIT (Stage 4): the two Texture Surprise variants are TWO SEPARATE DIRECTIONAL inputs, NOT
// tap/hold. Rationale — the codebase already stamps a robust _specialHeldDir and the sister HxH chars
// (Killua neutral/F/D, Gon Jajanken neutral/F/D) branch specials this way, so each of Hisoka's two
// DISTINCT card animations (single vs. spread) gets its own unambiguous actuation with no charge-timing
// read. Forward = rapid spread (aggressive approach), Down = single precise (deliberate). Neutral = whip.
function executeHisokaSpecial(fighter, context) {
  const dir = fighter._specialHeldDir || null
  if (dir === "F") return fireHisokaCardRapid(fighter, context)
  if (dir === "D") return fireHisokaCardSingle(fighter, context)
  return fireHisokaBungeeGum(fighter, context)
}

// Shared card-projectile factory. Each card is an INDEPENDENT projectile drawing its own collision
// from Hisoka's hurtbox origin (spawnProjectile default spawnX/Y). The projectile art is the 2-frame
// spinning card (hisoka_card_projectile_uniform), scaled up from its tiny 11×8 native cell.
function spawnHisokaCard(fighter, context, { damage, speed, vy = 0, hitstun, knockbackX, knockbackY, lifetime, noHitstop = false }) {
  spawnProjectile(fighter, "hisoka_card", {
    sheet: "./hisoka_card_projectile_uniform.png", spriteFrames: 2, spriteW: 11, spriteH: 8, spriteSpeed: 3, spriteScale: 2.6,
    damage, speed, vy, hitstun, knockbackX, knockbackY, lifetime,
    w: 20, h: 14, color: "#4aa3ff", isSpecial: true, noHitstop,
    spawnY: fighter.y + (fighter.h || 100) * 0.42
  }, context)
}

// DOWN — Texture Surprise (single): one precise, hard-hitting card thrown flat and fast. Higher
// per-hit damage than the spread; a committed ranged poke. Costs 18 Nen.
function fireHisokaCardSingle(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 18)) return false
  try { sound.playSfxFile?.(pickHisokaVoice("texture"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: Texture Surprise cast (audio-only)
  fighter._spriteCastMove  = "cardThrowSingle"   // 4f throw pose
  fighter._spriteCastTimer = 18
  fighter.attackCooldown   = getAttackDuration(22, fighter)
  schedulePendingSpawn(8, () => {   // release on the throw beat (hand-forward)
    spawnHisokaCard(fighter, context, { damage: 48, speed: 16, hitstun: 18, knockbackX: 6, knockbackY: -2, lifetime: 95 })
  })
  return true
}

// FORWARD — Texture Surprise (rapid): a fast fan of cards thrown in quick succession, each angled so
// they cover a wide vertical spread. Low per-card damage, wide coverage — a zoning/space-control tool.
// Each card is its own projectile (independent collision). noHitstop so the burst doesn't stutter.
// Costs 30 Nen.
function fireHisokaCardRapid(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 30)) return false
  try { sound.playSfxFile?.(pickHisokaVoice("texture"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: Texture Surprise cast (audio-only)
  fighter._spriteCastMove  = "cardThrowRapid"   // 6f spinning-fan pose
  fighter._spriteCastTimer = 22
  fighter.attackCooldown   = getAttackDuration(28, fighter)
  // 5 cards in quick succession (staggered 2f apart), fanned vy -6..+6 for wide coverage.
  const fan = [-6, -3, 0, 3, 6]
  fan.forEach((vy, i) => {
    schedulePendingSpawn(6 + i * 2, () => {
      spawnHisokaCard(fighter, context, { damage: 16, speed: 14, vy, hitstun: 10, knockbackX: 3, knockbackY: -1, lifetime: 85, noHitstop: true })
    })
  })
  return true
}

// NEUTRAL — Bungee Gum: the elastic Nen whip lashes far forward — a committed melee special with a
// MUCH longer hitbox than any normal (rangeX 172 vs the normals' default 85 → ~2× reach, matching the
// pink whip that extends to fill the sprite cell). High hitstun / knockback: a hard-hitting poke and
// combo-ender that punishes from a range his buttons can't touch. NOT a grab (it's a strike hitbox).
// Steps him slightly into the lash. Costs 30 Nen.
function fireHisokaBungeeGum(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 30)) return false
  try { sound.playSfxFile?.(pickHisokaVoice("bungee"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: "Bungee Gum!" cast (audio-only)
  // In Bloodlust Overdrive the whip lashes DRAMATICALLY farther (rangeX 172 → 230) + hits harder — the
  // "escalated Bungee Gum mastery" of the form (on top of the flat 1.3 damageMultiplier the form applies).
  const od = !!fighter._overdriveActive
  const md = { damage: od ? 92 : 72, startup: 8, active: 6, recovery: 18, hitstun: 22, blockstun: 12, knockbackX: od ? 10 : 8, knockbackY: -3, rangeX: od ? 230 : 172, rangeY: 48, isSpecial: true }
  const attack = createAttackFromMove(fighter, "bungeeGum", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "bungeeGum" → the whip pose
  fighter.vx = (fighter.facing || 1) * 3   // small step into the lash
  shakeCamera(context, od ? 7 : 5, 8)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// HISOKA — BLOODLUST OVERDRIVE (Ultimate) — Stage 5.
// A full ALTERNATE-FORM transformation, reusing the giant-cinematic architecture directly (mirrors
// Killua Godspeed + Gon Adult Form): a sustained buff-mode form with (a) a _skinAnim BODY-SWAP to the
// golden-aura power-up sprites (Sasuke-Susanoo / Vegeta-SSJ mechanism — Hisoka HAS dedicated power-up art,
// so unlike Godspeed this actually swaps the body), (b) a frozen ACTIVATION CINEMATIC playing the
// card-cape→golden-aura transform sequence (hisokaOverdriveCinematic.js), and (c) near-max Nen gate +
// per-frame drain → auto-revert. While active: +30% damage, +25% attack speed, and Bungee Gum gains
// dramatically extended reach (see fireHisokaBungeeGum). Visual identity per the real art: a golden Nen
// power-up aura form (NOT a giant — same size) with an empowered whip; the transform sheet shows the
// signature card-cape aura swirl resolving into the shirtless golden-aura power-up.
const HISOKA_OVERDRIVE_THRESHOLD = 140          // Nen ≥ 140 (near-max of 170) to activate — a committed cost
const HISOKA_OVERDRIVE_DRAIN     = 0.30         // Nen/frame while active (~8s from full) → auto-revert on empty
const HISOKA_OVERDRIVE_MULT      = { dmg: 1.3, atkSpeed: 1.25 }

// COMPLETE _skinAnim set: spread the base anim (so EVERY un-overridden action still resolves — an
// incomplete _skinAnim would hit the fallback-box glitch, getAction treats it as the whole set), then
// override the actions that have dedicated golden-aura power-up art (idle + up-attack). The empowered
// Bungee Gum keeps the base whip sheet (its escalation is the reach/damage bump, not new art).
const HISOKA_OVERDRIVE_ANIM = {
  ...characters.hisoka.animationData,
  idle: { frames: 4, width: 51, height: 65, speed: 8, anchorY: -2, sheet: "./hisoka_powerup_idle_uniform.png" },
  up:   { frames: 3, width: 95, height: 66, speed: 3, anchorY: -2, loop: false, lockLastFrame: true, sheet: "./hisoka_powerup_up_uniform.png" },
}

export function isHisokaOverdriveActive(f) { return !!f?._overdriveActive }

function enterHisokaOverdrive(fighter, context) {
  if (fighter._overdriveActive) return false
  if ((fighter.energy || 0) < HISOKA_OVERDRIVE_THRESHOLD) return false
  fighter._overdriveActive      = true
  fighter.currentForm           = "overdrive"                  // HUD state (NOT a form-data swap)
  fighter.damageMultiplier      = HISOKA_OVERDRIVE_MULT.dmg
  fighter.attackMultiplier      = HISOKA_OVERDRIVE_MULT.dmg     // == damageMultiplier (combat takes the max)
  fighter.attackSpeedMultiplier = HISOKA_OVERDRIVE_MULT.atkSpeed
  fighter._skinAnim             = HISOKA_OVERDRIVE_ANIM         // BODY-SWAP to the golden-aura power-up form
  // Hold the transform pose (card-cape aura swirl → golden power-up) through the activation cinematic
  // (combat frozen; the cinematic clears it on end → power-up-form gameplay animations take over).
  fighter._spriteCastMove  = "transform"
  fighter._spriteCastTimer = 190
  return true
}

function revertHisokaOverdrive(fighter) {
  if (!fighter || !fighter._overdriveActive) return
  fighter._overdriveActive      = false
  fighter.currentForm           = "base"
  fighter.damageMultiplier      = 1
  fighter.attackMultiplier      = 1
  fighter.attackSpeedMultiplier = 1
  fighter._skinAnim             = fighter._baseSkinAnim || null   // restore base (Hisoka has no alt skins → null)
}
// Public revert for reset paths (round/KO/menu) — mirrors forceRevertGonAdultForm's role.
export function forceRevertHisokaOverdrive(fighter) { revertHisokaOverdrive(fighter) }

// Per-frame (game.updateFighterState): drain the meter → auto-revert at 0.
export function applyHisokaOverdriveSystem(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "hisoka") return
  if (!fighter._overdriveActive) return
  tickSustainedFormDrain(fighter, { active: isHisokaOverdriveActive, drainPerFrame: HISOKA_OVERDRIVE_DRAIN, revert: revertHisokaOverdrive })
}

// OVERDRIVE = the buff + _skinAnim body-swap (applied at trigger) + a frozen ACTIVATION CINEMATIC
// (hisokaOverdriveCinematic.js — camera pushes in on Hisoka, the transform plays, the camera pulls back).
function executeHisokaUltimate(fighter, context) {
  if (isHisokaOverdriveCinematicActive()) return false      // already mid-activation
  if (fighter._overdriveActive) return false                // already transformed
  if (!enterHisokaOverdrive(fighter, context)) return false // apply the buff/body-swap (gated on near-max Nen)
  try { sound.playSfxFile?.(pickHisokaVoice("overdrive"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: Bloodlust Overdrive cast (audio-only)
  const opp = context?.getOpponent?.(fighter) || context?.p2 || null
  activateHisokaOverdriveCinematic(fighter, opp)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// THE FLASH — SPECIAL menu (SPECIAL button, direction-branched via _specialHeldDir) — Stage 3.
// Both are MELEE-RANGE MULTI-HIT WHIRLS (the only special art in the batch; NO projectile content).
//   • Neutral = Spin Attack — fast 3-hit spinning whirl, pins (combo/pressure tool). 20 Speed Force.
//   • Forward = Tornado — advancing 4-hit electric vortex; the final hit LAUNCHES. 35 Speed Force.
// Multi-hit uses the shared re-arm pattern (schedule currentAttack.hasHit=false mid-active to re-open
// the hitbox — same mechanism as Netero's guanyinCombo twoHit). currentMove drives the whirl sprite
// (flash.animationData.spinAttack / .tornado, both loop). Back/Up/Down fall through to Spin Attack.
// ─────────────────────────────────────────────────────────────────────────────
function executeFlashSpecial(fighter, context) {
  return (fighter._specialHeldDir === "F")
    ? fireFlashTornado(fighter, context)
    : fireFlashSpinAttack(fighter, context)
}

// NEUTRAL — Spin Attack: an in-place 3-hit spinning whirl. Low per-hit, low knockback (PINS the
// target inside the whirl so all 3 connect), high hitstun → a rushdown combo starter. 20 Speed Force.
function fireFlashSpinAttack(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 20)) return false
  const md = { damage: 22, startup: 5, active: 18, recovery: 14, hitstun: 14, blockstun: 10, knockbackX: 1, knockbackY: 0, rangeX: 84, rangeY: 64, isSpecial: true }
  const attack = createAttackFromMove(fighter, "spinAttack", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "spinAttack" → looping whirl pose
  // 3 HITS: initial connect + two re-arms across the active window (frames 5..23). Guarded so a later move isn't touched.
  schedulePendingSpawn(10, () => { if (fighter.currentAttack && fighter.currentAttack.name === "spinAttack") fighter.currentAttack.hasHit = false })
  schedulePendingSpawn(16, () => { if (fighter.currentAttack && fighter.currentAttack.name === "spinAttack") fighter.currentAttack.hasHit = false })
  shakeCamera(context, 3, 6)
  return true
}

// FORWARD — Tornado: an advancing 4-hit electric vortex. Drifts Flash forward through the whirl;
// the first 3 hits pin (low knockback), the FINAL re-arm bumps launchY + launcher so the last hit
// EJECTS/launches the target (combo → air route). Costs 35 Speed Force. Melee range.
function fireFlashTornado(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 35)) return false
  const md = { damage: 28, startup: 6, active: 22, recovery: 18, hitstun: 14, blockstun: 12, knockbackX: 1, knockbackY: 0, rangeX: 92, rangeY: 68, isSpecial: true }
  const attack = createAttackFromMove(fighter, "tornado", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "tornado" → looping vortex pose
  const face = fighter.facing || 1
  fighter.vx = face * 3.5                                                  // advancing drift
  // 4 HITS: initial + 3 re-arms (frames 6..28). The LAST re-arm turns the final connect into a launcher.
  schedulePendingSpawn(11, () => { if (fighter.currentAttack && fighter.currentAttack.name === "tornado") { fighter.vx = (fighter.facing || 1) * 3; fighter.currentAttack.hasHit = false } })
  schedulePendingSpawn(18, () => { if (fighter.currentAttack && fighter.currentAttack.name === "tornado") fighter.currentAttack.hasHit = false })
  schedulePendingSpawn(25, () => { if (fighter.currentAttack && fighter.currentAttack.name === "tornado") { fighter.currentAttack.launcher = true; fighter.currentAttack.launchY = -12; fighter.currentAttack.pushX = 7; fighter.currentAttack.hasHit = false } })
  shakeCamera(context, 5, 8)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// GON FREECSS — JAJANKEN (Stage 3): three fully independent specials on the SPECIAL button,
// direction-branched via _specialHeldDir (Killua/Flash architecture), NO gating between them.
//   Neutral  = ROCK     — telegraphed charge → single devastating punch (highest dmg + commitment).
//   Forward  = SCISSORS — rapid multi-hit jab string (lowest per-hit, highest hit-count; combo tool).
//   Down     = PAPER    — open-palm push (low dmg, strong knockback; a spacing/defensive tool).
// Damage/cost modeled off the BALANCE_AUDIT special tier; Rock sits noticeably above Paper/Scissors.
// ─────────────────────────────────────────────────────────────────────────────
function executeGonSpecial(fighter, context) {
  // ADULT FORM overrides the SPECIAL button entirely: Jajanken is gone — the only move is the
  // all-or-nothing SUDDEN-DEATH strike (win-on-hit / lose-on-miss). You are committed to the finisher.
  if (fighter._adultFormActive) return fireGonSuddenDeath(fighter, context)
  const dir = fighter._specialHeldDir || null
  if (dir === "F") return fireGonScissors(fighter, context)
  if (dir === "D") return fireGonPaper(fighter, context)
  return fireGonRock(fighter, context)   // neutral (and Back/Up) = Rock, the signature
}

// NEUTRAL — ROCK. A REAL telegraphed charge: 18f startup shows the charge-windup frames (the opponent
// can see it coming and block), then ONE devastating punch. Highest damage + commitment in the base
// kit. Big knockback + slight launch. 45 Nen.
function fireGonRock(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 45)) return false
  const md = { damage: 150, startup: 18, active: 5, recovery: 18, hitstun: 30, blockstun: 16, knockbackX: 14, knockbackY: -6, rangeX: 112, rangeY: 66, isSpecial: true }
  const attack = createAttackFromMove(fighter, "rock", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true; attack.launcher = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "rock" → charge-windup→punch sprite (the telegraph)
  fighter.vx = (fighter.facing || 1) * 3            // small step into the punch on release
  shakeCamera(context, 6, 10)
  try { sound.playSfxFile?.(pickGonVoice("rock"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: Jajanken ROCK cast (audio-only)
  return true
}

// FORWARD — SCISSORS. Rapid multi-hit jab string (Flash spin-whirl pattern): 5 low-per-hit connects
// across a long active window; low knockback PINS the target so all hits land → combo starter/extender.
// 30 Nen.
function fireGonScissors(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 30)) return false
  const md = { damage: 20, startup: 6, active: 22, recovery: 14, hitstun: 12, blockstun: 8, knockbackX: 1, knockbackY: 0, rangeX: 84, rangeY: 58, isSpecial: true }
  const attack = createAttackFromMove(fighter, "scissors", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "scissors" → multi-hit jab sprite
  // 5 HITS: initial connect + 4 re-arms across the active window. Guarded so a later move isn't touched.
  for (const t of [11, 15, 19, 23]) schedulePendingSpawn(t, () => { if (fighter.currentAttack && fighter.currentAttack.name === "scissors") fighter.currentAttack.hasHit = false })
  try { sound.playSfxFile?.(pickGonVoice("scissors"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: Jajanken SCISSORS cast (audio-only)
  return true
}

// DOWN — PAPER. Open-palm push: low damage, HUGE knockback = a spacing/defensive reset tool (NOT a
// combo piece). Fast, short. 24 Nen.
function fireGonPaper(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 24)) return false
  const md = { damage: 46, startup: 8, active: 4, recovery: 16, hitstun: 14, blockstun: 10, knockbackX: 18, knockbackY: -2, rangeX: 92, rangeY: 62, isSpecial: true }
  const attack = createAttackFromMove(fighter, "paper", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "paper" → palm-push sprite
  shakeCamera(context, 3, 6)
  try { sound.playSfxFile?.(pickGonVoice("paper"), null); fighter._atkVoiceCd = 150 } catch (_) {}   // VOICE: Jajanken PAPER cast (audio-only)
  return true
}

// ── GON ULTIMATE — ADULT FORM + SUDDEN-DEATH ("Final Blow") — Stage 4 ───────────────────────
// A sustained SELF-TRANSFORMATION (buff-mode, like Godspeed/Flash Time — no adult body-swap art in the
// batch, so it's an overlay on the child body + a green Nen aura) with a HARD TRADE-OFF and a NOVEL
// match-ending payoff:
//   • ACTIVATE (ultimate, near-max Nen): a frozen growth cinematic (gonAdultFormCinematic.js), then the
//     form is live. While active Gon is STRONGER (damage bump) but MOVEMENT-LOCKED — he CANNOT jump or
//     dash and can only slowly LUMBER forward (physics reads canJump=false / noDash / reduced speed).
//     That lockout IS the counterplay window: the opponent sees the giant closing in and can run/space.
//   • DRAIN: per-frame Nen drain → auto-revert when the meter runs dry (shared tickSustainedFormDrain).
//     Reverting on empty is NOT a loss — it just ends the form. The only way to WIN with it is to land…
//   • SUDDEN-DEATH ("Final Blow"): while Adult Form is active the SPECIAL button fires ONE all-or-nothing
//     close-range strike (fireGonSuddenDeath). Short range → Gon MUST close the distance first (the whole
//     point of the lockout). game._updateGonSuddenDeath() watches the swing:
//         CLEAN unblocked connect  → INSTANT MATCH WIN for Gon  (bypasses roundWins entirely)
//         whiff OR blocked         → INSTANT MATCH LOSS for Gon (bypasses roundWins entirely)
//     The win/miss detection + the _checkMatchOver() override live in game.js (it owns match-flow);
//     abilities.js only flags the attack (_gonSuddenDeath) and arms the watch (_suddenDeathWatch/_Atk).
const GON_ADULT_THRESHOLD = 140            // Nen ≥ 140 (near-max of 160) to activate — a committed cost
const GON_ADULT_DRAIN     = 0.30           // Nen/frame while active (~9s from full) → auto-revert on empty
const GON_ADULT_MULT      = { dmg: 1.3 }   // adult-form power bump (normals/rekka hit harder)
const GON_ADULT_SPEED     = 40             // lumber walk (physics clamps rawSpeed*0.09 → the 4px/f floor)
// GIANT-FORM SIZING (the SAME canvas-relative system as Netero's Guanyin / Itachi's Susanoo —
// sprite.js scales the drawn cell + combat.js scales the hurtbox to match). Adult Gon is
// canonically much taller than base Gon and most of the roster, so the sustained buff-mode body
// (which reuses the CHILD sprites — no dedicated adult idle/walk art exists) is scaled UP here.
// A "tall grown man", NOT a Guanyin-scale statue: 0.28 vs Guanyin 0.76 / Susanoo 0.72. refH = the
// CHILD idle body-cell height (47) so every buff-mode action scales by the SAME factor and stays
// proportional. The transform/finalblow cells carry their own actionScale and are EXEMPT from this
// frac (sprite.js skips the giant path when an action defines actionScale) so they don't double-scale.
const GON_ADULT_CANVAS_FRAC = 0.28
const GON_ADULT_REF_H       = 47

export function isGonAdultFormActive(f) { return !!f?._adultFormActive }

function enterGonAdultForm(fighter, context) {
  if (fighter._adultFormActive) return false
  if ((fighter.energy || 0) < GON_ADULT_THRESHOLD) return false
  fighter._adultFormActive    = true
  fighter.currentForm         = "adult"                     // HUD state (NOT a form-data swap)
  fighter.damageMultiplier    = GON_ADULT_MULT.dmg
  fighter.attackMultiplier    = GON_ADULT_MULT.dmg          // == damageMultiplier (combat takes the max)
  // MOVEMENT LOCKOUT — the counterplay window. Stash originals for a clean revert.
  fighter._adultBaseSpeed     = fighter.speed
  fighter._adultBaseCanJump   = fighter.canJump
  fighter._adultBaseNoDash    = fighter.noDash
  fighter.speed               = GON_ADULT_SPEED             // slow lumber (can still close distance)
  fighter.canJump             = false                       // no jump
  fighter.noDash              = true                        // no dash
  // GIANT SILHOUETTE — grow the drawn body + the hurtbox (canvas-relative giant sizing; sprite.js
  // + combat.js read these). Makes Adult Gon read as genuinely taller than the roster instead of
  // snapping back to child height once the growth cinematic ends. Cleared on revert.
  fighter._canvasHeightFrac   = GON_ADULT_CANVAS_FRAC
  fighter._canvasHeightRefH   = GON_ADULT_REF_H
  fighter._adultTrail         = []
  // Hold the child→adult growth pose through the activation cinematic (combat frozen; the cinematic
  // clears it on end → normal buff-mode animations + the green aura overlay take over).
  fighter._spriteCastMove  = "transform"
  fighter._spriteCastTimer = 170
  return true
}

function revertGonAdultForm(fighter) {
  if (!fighter || !fighter._adultFormActive) return
  fighter._adultFormActive    = false
  fighter.currentForm         = "base"
  fighter.damageMultiplier    = 1
  fighter.attackMultiplier    = 1
  if (fighter._adultBaseSpeed   != null) { fighter.speed   = fighter._adultBaseSpeed;   fighter._adultBaseSpeed   = null }
  fighter.canJump = (fighter._adultBaseCanJump === false) ? false : true;  fighter._adultBaseCanJump = null
  fighter.noDash  = !!fighter._adultBaseNoDash;                            fighter._adultBaseNoDash  = null
  fighter._canvasHeightFrac   = null    // release giant sizing → back to normal child-body scale + hurtbox
  fighter._canvasHeightRefH   = null
  fighter._adultTrail = []
}
// Public revert for reset paths (round/KO/menu) — mirrors forceRevertFlashTime's role.
export function forceRevertGonAdultForm(fighter) { revertGonAdultForm(fighter) }

// Per-frame (game.updateFighterState): drain the meter → auto-revert at 0, and record the position
// trail the green Nen aura overlay draws (game.drawGonAdultAura).
export function applyGonAdultFormSystem(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "gon") return
  if (!fighter._adultFormActive) return
  tickSustainedFormDrain(fighter, { active: isGonAdultFormActive, drainPerFrame: GON_ADULT_DRAIN, revert: revertGonAdultForm })
  if (!fighter._adultFormActive) return   // reverted this frame
  const trail = fighter._adultTrail || (fighter._adultTrail = [])
  trail.unshift({ x: fighter.x, y: fighter.y })
  if (trail.length > 5) trail.pop()
}

// ADULT FORM = the buff/lockout (applied at trigger) + a frozen ACTIVATION CINEMATIC
// (gonAdultFormCinematic.js — camera pushes in on Gon, the growth plays, the camera pulls back).
function executeGonUltimate(fighter, context) {
  if (isGonAdultFormCinematicActive()) return false        // already mid-activation
  if (fighter._adultFormActive) return false               // already transformed
  if (!enterGonAdultForm(fighter, context)) return false    // apply the buff/lockout (gated on near-max Nen)
  const opp = context?.getOpponent?.(fighter) || context?.p2 || null
  activateGonAdultFormCinematic(fighter, opp)
  return true
}

// SUDDEN-DEATH ("Final Blow") — fired by the SPECIAL button ONLY while Adult Form is active. A short-
// range, fast, all-or-nothing strike. game._updateGonSuddenDeath() reads _gonSuddenDeath + the armed
// watch and forces an INSTANT match win (clean hit) or loss (whiff/block), bypassing round-count.
function fireGonSuddenDeath(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (fighter._suddenDeathWatch) return false              // one throw per form — already committed
  const md = { damage: 400, startup: 6, active: 12, recovery: 22, hitstun: 40, blockstun: 18, knockbackX: 22, knockbackY: -12, rangeX: 82, rangeY: 84, isSpecial: true }
  const attack = createAttackFromMove(fighter, "finalblow", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  attack._gonSuddenDeath = true                            // combat.js marks _sdConnect ("clean"/"blocked") on contact
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "finalblow" → decisive-strike sprite
  fighter._suddenDeathWatch = true                         // arm the game.js watcher (win-on-hit / lose-on-miss)
  fighter._suddenDeathAtk   = attack
  fighter.vx = (fighter.facing || 1) * 4                   // small commit step into the strike
  shakeCamera(context, 8, 12)
  // VOICE: the EXCLUSIVE Final Blow line ("it's fine if this ends" / sudden-death janken). Wired here
  // ONLY — not in any pool — so it can never leak to another Jajanken variant or the Adult Form transform.
  try { sound.playSfxFile?.(GON_FINAL_BLOW_SFX, null); fighter._atkVoiceCd = 150 } catch (_) {}
  return true
}

// ── KILLUA ULTIMATE — GODSPEED (Kanmuru) — Stage 5 ──────────────────────────────────────────
// The OVERLAY path (decided Stage 1, KILLUA_ASSET_MAP.md): NOT an alternate-form sprite swap
// (Netero/Susanoo) but a sustained SELF-BUFF + electric-afterimage overlay on Killua's normal
// animations — the Itachi-Mangekyou tier. Entering Godspeed IS the ultimate (no separate move on
// top). Meter-gated (near-max), then a per-frame Nen drain sustains it → auto-reverts when the meter
// runs dry (tickSustainedFormDrain, shared with Mangekyou/SSJ). Buffs: attackSpeedMultiplier (the
// signature — every attack's startup/active/recovery divides by it via getAttackDuration/_dur), plus
// damage and a dash/movement bump. GOTCHA (Netero memo): never touch currentFormData — this is a buff,
// not a form; and set damageMultiplier == attackMultiplier (combat takes the MAX to avoid double-count).
const GODSPEED_THRESHOLD = 150            // energy ≥ 150 (near-max of 180) to activate
const GODSPEED_DRAIN     = 0.30           // energy/frame while active (~18/s → ~10s from full)
const GODSPEED_MULT      = { dmg: 1.25, atkSpeed: 1.4, spd: 1.3, dash: 28, speed: 120 }

function isGodspeedActive(f) { return !!f?._godspeedActive }

function enterGodspeed(fighter, context) {
  if (fighter._godspeedActive) return false
  if ((fighter.energy || 0) < GODSPEED_THRESHOLD) return false
  fighter._godspeedActive     = true
  fighter.currentForm         = "godspeed"                 // HUD state (NOT a form-data swap)
  fighter._godspeedBaseDash   = fighter.dashSpeed          // stash originals for a clean revert
  fighter._godspeedBaseSpeed  = fighter.speed
  fighter.damageMultiplier    = GODSPEED_MULT.dmg
  fighter.attackMultiplier    = GODSPEED_MULT.dmg          // == damageMultiplier (combat takes the max)
  fighter.attackSpeedMultiplier = GODSPEED_MULT.atkSpeed   // faster startup/recovery = the "speed" feel
  fighter.speedMultiplier     = GODSPEED_MULT.spd          // cosmetic/HUD (movement is clamped; dash carries it)
  fighter.dashSpeed           = GODSPEED_MULT.dash
  fighter.speed               = GODSPEED_MULT.speed
  fighter._godspeedTrail      = []
  // Hold his CHARGE-UP pose (the SAME blue electric charge aura from his charge animation — carried
  // through, no new colour) for the whole activation cinematic. The cinematic owns the camera push-in /
  // flash / shake, so no teleportFlash or shakeCamera here; it clears this pose when it ends → normal
  // gameplay + the Godspeed afterimage overlay take over. Timer covers the ~150f cinematic (combat is
  // frozen during it, so the timer isn't ticked down until control resumes).
  fighter._spriteCastMove  = "charge"
  fighter._spriteCastTimer = 170
  return true
}

function revertGodspeed(fighter) {
  if (!fighter || !fighter._godspeedActive) return
  fighter._godspeedActive     = false
  fighter.currentForm         = "base"
  fighter.damageMultiplier    = 1
  fighter.attackMultiplier    = 1
  fighter.attackSpeedMultiplier = 1
  fighter.speedMultiplier     = 1
  if (fighter._godspeedBaseDash  != null) { fighter.dashSpeed = fighter._godspeedBaseDash;  fighter._godspeedBaseDash  = null }
  if (fighter._godspeedBaseSpeed != null) { fighter.speed     = fighter._godspeedBaseSpeed; fighter._godspeedBaseSpeed = null }
  fighter._godspeedTrail = []
}

// Per-frame (game.updateFighterState): drain the meter → auto-revert at 0, and record the position
// trail the electric-afterimage overlay draws (game.drawGodspeedAura).
export function applyGodspeedSystem(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "killua") return
  if (!fighter._godspeedActive) return
  tickSustainedFormDrain(fighter, { active: isGodspeedActive, drainPerFrame: GODSPEED_DRAIN, revert: revertGodspeed })
  if (!fighter._godspeedActive) return   // reverted this frame
  const trail = fighter._godspeedTrail || (fighter._godspeedTrail = [])
  trail.unshift({ x: fighter.x, y: fighter.y })
  if (trail.length > 5) trail.pop()
}

// GODSPEED = the buff (applied at trigger, Itachi-Mangekyou style) + a frozen ACTIVATION CINEMATIC
// (killuaGodspeedCinematic.js — camera pushes in on Killua, the charge-up plays, the camera pulls back).
function executeKilluaUltimate(fighter, context) {
  if (isKilluaGodspeedCinematicActive()) return false      // already mid-activation
  if (!enterGodspeed(fighter, context)) return false       // apply the buff (gated on near-max Nen)
  try { sound.playSfxFile?.(pickKilluaVoice("specialGodspeed"), null) } catch (_) {}   // VOICE: ultimate callout (PROVISIONAL: lightning_speed/thunder_god → Godspeed)
  const opp = context?.getOpponent?.(fighter) || context?.p2 || null
  activateKilluaGodspeedCinematic(fighter, opp)
  return true
}

// ── THE FLASH — FLASH TIME (Ultimate) — Stage 4 ────────────────────────────────────────────────
// REUSES Killua's Godspeed architecture: a sustained SELF-BUFF (Itachi-Mangekyou tier — no form-data
// swap) + a frozen ACTIVATION CINEMATIC (flashTimeCinematic.js, mirrors killuaGodspeedCinematic.js) +
// the SAME per-opponent frame-skip TIME-SLOW already built for Godspeed (game._updateGodspeedTimeSlow,
// generalized to read fighter._ftOppTimeScale). The differential: the opponent runs at ~1/3 speed
// (FT_OPP_TIMESCALE) while Flash keeps full speed = the "Flash 3× / opponent ⅓×" read. Distinct from
// Godspeed:  ① opponent slowed harder (0.34 vs 0.4),  ② Flash CANNOT block while active (enforced every
// frame),  ③ Flash's ground movement gets OVERSHOOT/SKID (momentum imprecision on stop — physics.js,
// gated on _flashTimeActive). Near-max meter gate + per-frame drain → auto-revert (shared tick).
const FLASH_TIME_THRESHOLD   = 90     // Speed Force ≥ 90 (near-max of 100) to activate — a near-max cost
const FLASH_TIME_DRAIN       = 0.22   // energy/frame while active (~7.5s from full 100)
const FLASH_TIME_OPP_SLOW    = 0.34   // opponent runs at ~1/3 speed (the ⅓× side of the 3× differential)
const FLASH_TIME_MULT        = { atkSpeed: 1.25, dash: 30 }   // Flash's own snappiness + a big dash bump

export function isFlashTimeActive(f) { return !!f?._flashTimeActive }

function enterFlashTime(fighter) {
  if (fighter._flashTimeActive) return false
  if ((fighter.energy || 0) < FLASH_TIME_THRESHOLD) return false
  fighter._flashTimeActive       = true
  fighter.currentForm            = "flashTime"                 // HUD state (NOT a form-data swap)
  fighter._ftBaseDash            = fighter.dashSpeed           // stash for a clean revert
  fighter.attackSpeedMultiplier  = FLASH_TIME_MULT.atkSpeed    // faster startup/recovery (getAttackDuration divides)
  fighter.dashSpeed              = FLASH_TIME_MULT.dash
  fighter._ftOppTimeScale        = FLASH_TIME_OPP_SLOW         // read by game._updateGodspeedTimeSlow (generalized)
  fighter._ftTrail               = []
  fighter.isBlocking             = false                       // (5) can't block while active — from the first frame
  // Hold the spinning-whirl pose (Flash vibrating up to speed) through the activation cinematic (combat is
  // frozen during it, so the timer isn't ticked down until control resumes; the cinematic clears it on end).
  fighter._spriteCastMove  = "spinAttack"
  fighter._spriteCastTimer = 170
  return true
}

function revertFlashTime(fighter) {
  if (!fighter || !fighter._flashTimeActive) return
  fighter._flashTimeActive      = false
  fighter.currentForm           = "base"
  fighter.attackSpeedMultiplier = 1
  if (fighter._ftBaseDash != null) { fighter.dashSpeed = fighter._ftBaseDash; fighter._ftBaseDash = null }
  fighter._ftOppTimeScale = 0
  fighter._ftTrail = []
}
// Public revert for reset paths (round/KO/menu) — mirrors revertGodspeed's role.
export function forceRevertFlashTime(fighter) { revertFlashTime(fighter) }

// Per-frame (game.updateFighterState): drain the meter → auto-revert at 0, ENFORCE the block-lockout,
// and record the position trail the red/gold afterimage overlay draws (game.drawFlashAura).
export function applyFlashTimeSystem(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "flash") return
  if (!fighter._flashTimeActive) return
  tickSustainedFormDrain(fighter, { active: isFlashTimeActive, drainPerFrame: FLASH_TIME_DRAIN, revert: revertFlashTime })
  if (!fighter._flashTimeActive) return   // reverted this frame
  fighter.isBlocking = false              // (5) enforce block-lockout continuously (belt-and-braces vs the input gate)
  const trail = fighter._ftTrail || (fighter._ftTrail = [])
  trail.unshift({ x: fighter.x, y: fighter.y })
  if (trail.length > 6) trail.pop()
}

// FLASH TIME = the buff (applied at trigger) + a frozen ACTIVATION CINEMATIC (camera pushes in on
// Flash, the spin-up plays, the camera pulls back). Mirrors executeKilluaUltimate exactly.
function executeFlashUltimate(fighter, context) {
  if (isFlashTimeCinematicActive()) return false            // already mid-activation
  if (!enterFlashTime(fighter)) return false                // apply the buff (gated on near-max Speed Force)
  const opp = context?.getOpponent?.(fighter) || context?.p2 || null
  activateFlashTimeCinematic(fighter, opp)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// SAIKI KUSUO — 4-hit projectile REKKA (Fwd+Heavy) + Basic Burst free poke (Fwd+Light) — Stage 3.
// The zoner's mid-range pressure tool. Unlike the melee rekkas (Toji/Vegeta/Netero) each stage fires
// an INDEPENDENTLY-TRAVELING magenta bolt (its own paired FX + collision) rather than a melee hitbox —
// so the cancel-on-hit gate reads the BOLT connecting, not a melee hasHit. The cast pose (createAttack /
// setAttackState → currentMove) is a HARMLESS timing shell (rangeX 4 / damage 0): it exists only to
// (a) drive the chainN sprite and (b) give getAttackPhase a real "recovery" window to re-tap into. The
// bolt carries hitFlag:"_cmdHitLanded" so a CLEAN connect latches the same flag the melee rekkas gate on
// (a block or whiff never sets it → the string ends there, matching the interrupt rule).
// ─────────────────────────────────────────────────────────────────────────────
const SAIKI_MAGENTA = "#d4308f"
const SAIKI_CHAIN = {
  //                pose            timing (harmless shell)      → traveling bolt (its own FX + collision)
  saikiChain1:   { startup: 5, active: 3, recovery: 22, rekkaNext: "saikiChain2",
                   bolt: { sheet: "./saiki_chain1_fx_u.png", spriteFrames: 3, spriteW: 15, spriteH: 30, spriteSpeed: 3, spriteScale: 1.7,
                           damage: 42, speed: 15, lifetime: 42, hitstun: 14, knockbackX: 4, knockbackY: 0, w: 28, h: 34 } },
  saikiChain2:   { startup: 5, active: 3, recovery: 22, rekkaNext: "saikiChain3",
                   bolt: { sheet: "./saiki_chain2_fx_u.png", spriteFrames: 3, spriteW: 37, spriteH: 7, spriteSpeed: 2, spriteScale: 1.5,
                           damage: 36, speed: 17, lifetime: 42, hitstun: 12, knockbackX: 4, knockbackY: 0, w: 44, h: 16 } },
  saikiChain3:   { startup: 5, active: 3, recovery: 22, rekkaNext: "saikiChainFin",
                   bolt: { sheet: "./saiki_chain3_fx_u.png", spriteFrames: 3, spriteW: 37, spriteH: 7, spriteSpeed: 2, spriteScale: 1.5,
                           damage: 40, speed: 17, lifetime: 44, hitstun: 13, knockbackX: 5, knockbackY: 0, w: 44, h: 16 } },
  saikiChainFin: { startup: 6, active: 3, recovery: 26, rekkaNext: null,
                   bolt: { sheet: "./saiki_chainfin_fx_u.png", spriteFrames: 6, spriteW: 54, spriteH: 51, spriteSpeed: 3, spriteScale: 1.35,
                           damage: 72, speed: 13, lifetime: 52, hitstun: 26, knockbackX: 11, knockbackY: -4, w: 56, h: 52 } }
}

function fireSaikiChain(fighter, key, context) {
  const md = SAIKI_CHAIN[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  // Harmless timing/pose shell — rangeX 4 / damage 0 so the CAST never melee-hits; the bolt does the work.
  const shell = { damage: 0, startup: md.startup, active: md.active, recovery: md.recovery, hitstun: 1, rangeX: 4, rangeY: 30 }
  const attack = createAttackFromMove(fighter, key, shell, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = key → drives the chainN sprite
  fighter._rekkaNext    = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only by THIS step's bolt landing a clean hit (hitFlag)
  // Traveling bolt: independent projectile, own FX + collision, carries the rekka gate flag.
  spawnProjectile(fighter, key + "_bolt", {
    ...md.bolt, color: SAIKI_MAGENTA, hitFlag: "_cmdHitLanded",
    spawnY: fighter.y + (fighter.h || 100) * 0.42
  }, context)
  return true
}

// FREE POKE — Basic Burst (Fwd+Light): a short-range, NON-TRAVELING point-blank cyan burst that grows
// in place (vx/vy 0, brief lifetime) — mechanically distinct from the chain's traveling bolts. Free,
// cooldown-gated. Cast pose via _spriteCastMove (quick, no attacking lock — the burst does the work).
function fireSaikiBurst(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  fighter._spriteCastMove  = "saikiBurst"
  fighter._spriteCastTimer = 16
  fighter.attackCooldown   = getAttackDuration(20, fighter)
  const face = fighter.facing || 1
  spawnProjectile(fighter, "saikiBurst_fx", {
    sheet: "./saiki_burst_fx_u.png", spriteFrames: 7, spriteW: 36, spriteH: 21, spriteSpeed: 2, spriteScale: 1.8,
    damage: 48, hitstun: 16, knockbackX: 5, knockbackY: -1, lifetime: 16, w: 50, h: 44, color: "#49e0e0",
    vx: 0, vy: 0,
    spawnX: fighter.x + (face === 1 ? (fighter.w || 60) + 6 : -50 - 6),
    spawnY: fighter.y + (fighter.h || 100) * 0.40
  }, context)
  return true
}

// Grounded command driver (mirrors updateNeteroCommandCombat). Returns true (→ skip the normal path)
// only when it actually fires a stage/poke. Fwd+Heavy opens the bolt rekka; Fwd+Light is Basic Burst.
export function updateSaikiCommandCombat(fighter, inputState, context, getPhase) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "saiki" || !inputState) return false
  const grounded = fighter.onGround ?? fighter.grounded ?? false
  const phase    = getPhase?.(fighter)

  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  const lightEdge = !!inputState.light && !fighter._cmdPrevLight
  fighter._cmdPrevHeavy = !!inputState.heavy
  fighter._cmdPrevLight = !!inputState.light

  // CONTINUE — fresh Heavy during the current step's RECOVERY, only if this step's bolt CONNECTED.
  // Shared rekkaContinue owns the window-close + cancel rule. Saiki's _cmdHitLanded is latched by the
  // BOLT's hitFlag (resolveProjectileHitsMulti), not by the cast shell — rekkaContinue's own melee-latch
  // never fires here (the 0-damage cast never connects), so the projectile-driven connect still gates it.
  const opp = context?.getOpponent?.(fighter)
  const next = rekkaContinue(fighter, { edge: heavyEdge, phase, opponent: opp, requireHit: true })
  if (next) return fireSaikiChain(fighter, next, context)

  // OPENERS from neutral (grounded, forward held toward the opponent). Neutral light/heavy stay on the
  // normal path (front_attack / blade-swipe); only Forward+button routes here.
  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  if (canStart && grounded && forward && !inputState.down) {
    if (heavyEdge) return fireSaikiChain(fighter, "saikiChain1", context)   // Fwd+Heavy → 4-hit bolt rekka
    if (lightEdge) return fireSaikiBurst(fighter, context)                  // Fwd+Light → Basic Burst poke
  }

  return false
}

// ── SAIKI SPECIAL — Lightning (Stage 4) ─────────────────────────────────────
// A single long-range lightning BEAM rendered as TWO SIMULTANEOUS layered halves: bolt_top + bolt_bot
// (same width, offset heights per the source art) spawn together, travel identically, and overlap into
// one thicker combined bolt. Only the BOTTOM half carries collision/damage; the top half is visualOnly
// (a pure overlay) so the pair reads as one visual but lands one hit. 3f channeling cast pose first.
function executeSaikiSpecial(fighter, context) {
  if (!spendEnergy(fighter, 30)) return false
  fighter._spriteCastMove  = "saikiLightning"    // 3f channeling pose (saiki_lightning_cast_u)
  fighter._spriteCastTimer = 22
  fighter.attackCooldown   = getAttackDuration(30, fighter)
  const face   = fighter.facing || 1
  const originY = fighter.y + (fighter.h || 100) * 0.42
  const boltCommon = { spriteFrames: 3, spriteW: 210, spriteScale: 0.9, spriteSpeed: 2, speed: 18, lifetime: 44, color: "#c76bff", vx: face * 18 }
  // Fire both halves after a short channel so they leave on the beam's release beat (same frame → layered).
  schedulePendingSpawn(10, () => {
    // BOTTOM half — the damaging beam (its collision box covers the full combined thickness).
    spawnProjectile(fighter, "saikiLightning_bot", {
      ...boltCommon, sheet: "./saiki_bolt_bot_u.png", spriteH: 35,
      damage: 130, hitstun: 28, knockbackX: 12, knockbackY: -3, w: 120, h: 48,   // EFF ≈78 @ cost30 — kamehameha/Gojo-red tier (was 160→EFF96, a cost-30 outlier)
      spawnY: originY + 12
    }, context)
    // TOP half — pure visual overlay stacked just above, forming one thicker bolt (never collides).
    spawnProjectile(fighter, "saikiLightning_top", {
      ...boltCommon, sheet: "./saiki_bolt_top_u.png", spriteH: 36,
      visualOnly: true, damage: 0, lifetime: 44,
      spawnY: originY - 12
    }, context)
    shakeCamera(context, 6, 8)
  })
  return true
}

// ── SAIKI ULTIMATE — Giant Bomb Throw (Stage 5) ─────────────────────────────
// Saiki hurls a psychic bomb: an 8-frame throw pose plays FIRST, and only AFTER the throw motion
// visually completes does the payoff detonate — a screen-filling 10-frame shockwave (the largest FX in
// the kit) with its own huge blast volume. The explosion is a visualOnly sprite (so it plays through its
// whole animation instead of despawning on first contact) paired with a direct AOE damage sweep (Beerus
// Hakai / Rick Self-Destruct pattern — bypasses the per-hit despawn and GLOBAL_DAMAGE_SCALE) for the
// biggest single hit in the kit. Near-max meter cost.
const SAIKI_BOMB = { cost: 150, throwFrames: 26, dmg: 300, radius: 300, hitstun: 46 }
function executeSaikiUltimate(fighter, context) {
  if (!spendEnergy(fighter, SAIKI_BOMB.cost)) return false
  fighter._spriteCastMove  = "saikiBomb"     // 8f windup → throw → recovery pose (saiki_bomb_cast_u)
  fighter._spriteCastTimer = SAIKI_BOMB.throwFrames
  fighter.attackCooldown   = getAttackDuration(SAIKI_BOMB.throwFrames + 10, fighter)
  const getOpp = getTargetResolver(context)
  const target = getOpp(fighter)
  focusCameraOnAction(context, fighter, target, 0.95, 14)

  // DELAYED payoff: fire the explosion only once the throw animation has visually completed.
  schedulePendingSpawn(SAIKI_BOMB.throwFrames + 2, () => {
    const t  = getOpp(fighter)
    // Detonate on the opponent (a thrown bomb landing on them); the screen-filling FX + big radius
    // read as an arena-wide blast even so.
    const ex = t ? t.x + (t.w || 60) / 2 : fighter.x + fighter.facing * 260
    const ey = t ? t.y + (t.h || 100) * 0.5 : fighter.y + (fighter.h || 100) * 0.5
    // Screen-filling explosion — pure visual (never collides/despawns; plays its full 10 frames then fades).
    spawnProjectile(fighter, "saikiBombBlast", {
      visualOnly: true, damage: 0, lifetime: 40, vx: 0, vy: 0,
      sheet: "./saiki_bomb_fx_u.png", spriteFrames: 10, spriteW: 126, spriteH: 125, spriteSpeed: 3, spriteScale: 3.6,
      spawnX: ex, spawnY: ey, color: "#ff6ba3"
    }, context)
    shakeCamera(context, 22, 26)
    // Direct AOE hit — biggest single hit in the kit (bypasses per-hit despawn + GLOBAL_DAMAGE_SCALE).
    if (t && !t.eliminated && (t.invulnTimer || 0) <= 0) {
      const tcx = t.x + (t.w || 60) / 2, tcy = t.y + (t.h || 100) / 2
      if (Math.hypot(tcx - ex, tcy - ey) <= SAIKI_BOMB.radius) {
        let dmg = SAIKI_BOMB.dmg
        if (t.isBlocking) { dmg = Math.floor(dmg * 0.2); t.blockstun = 24 }
        else { t.hitstun = SAIKI_BOMB.hitstun; t.vx = (tcx >= ex ? 1 : -1) * 16; t.vy = -10; t.colorFlash = 8 }
        t.health = Math.max(0, (t.health || 0) - dmg)
      }
    }
  })
  return true
}

// ── NETERO SPECIAL — Barrage Punches ─────────────────────────────────────────
// One committed melee flurry (Netero's only special; direction-agnostic). currentMove drives the
// concatenated 8-frame sprite (3 punch frames → 5 fist-blur frames) as one continuous sequence while
// a strong isSpecial hitbox lands. A slight forward drive carries him into the barrage.
function executeNeteroSpecial(fighter, context) {
  if (fighter._guanyinActive) return fireGuanyinAttack(fighter, "guanyinCombo", context)   // giant: SPECIAL = 2-hit combo slash
  if (!spendEnergy(fighter, 30)) return false
  const md = { damage: 110, startup: 6, active: 14, recovery: 12, hitstun: 22, blockstun: 12, knockbackX: 8, knockbackY: -2, rangeX: 98, rangeY: 62, isSpecial: true }
  const attack = createAttackFromMove(fighter, "barragePunches", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "barragePunches" → 8-frame sprite
  fighter.vx = (fighter.facing || 1) * 5
  shakeCamera(context, 4, 8)
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// ISAAC NETERO ULTIMATE — 100-Type Guanyin Bodhisattva (Stage 4).
// A full sustained GIANT alternate form — same architecture as Itachi's Susanoo. Reuses the GENERIC
// engine support: _canvasHeightFrac/_canvasHeightRefH (sprite.js giant scale + combat.js giant
// hurtbox), _skinAnim (giant body body-swap), _susanooActive (physics half-arena lock). Tracks its
// OWN _guanyinActive flag + _guanyinTimer so it never collides with Sasuke/Itachi's giant state.
// Two-beat entry: a base-form CHARGE cast pose (13f) plays, THEN the giant materialises (delayed
// enter), covered by a teleport flash. Avatar attacks (SPECIAL button) land in Stage 5. Guard/hit
// reuse Netero's OWN base block/hit art UPSCALED to giant height (borrowed stopgap — flagged).
// ─────────────────────────────────────────────────────────────────────────────
const NETERO_GUANYIN_CANVAS_FRAC = 0.76   // idle giant ≈ 76% of canvas height (looming statue; feet planted)
const NETERO_GUANYIN_REF_H       = 344    // idle giant body-cell height → sprite.js scale = ch*frac/refH
const GUANYIN_CAST_FRAMES        = 26     // base-form charge pose duration before the giant appears (13f × speed 2)
const _guanyinCell = (sheet, frames, width, height, speed) => ({ frames, width, height, speed, loop: true, anchorY: 0, sheet })
const GUANYIN_IDLE  = _guanyinCell("./guanyin_idle_uniform.png",      7, 238, 344, 10)   // hands-in-prayer idle
const GUANYIN_LUNGE = _guanyinCell("./guanyin_run_lunge_uniform.png", 7, 312, 344, 5)    // forward-traveling lunge (movement)
// BORROWED stopgap: Netero's own base block/hit, upscaled to giant height so the SAME giant system
// renders them at scale. No dedicated Guanyin guard/hit art exists (flagged for a future art pass).
const GUANYIN_GUARD = _guanyinCell("./netero_guanyin_guard_big.png",  4, 222, 344, 8)
const GUANYIN_HURT  = _guanyinCell("./netero_guanyin_hurt_big.png",   7, 394, 344, 6)
// STAGE 5 avatar ATTACK poses — one-shot (hold last frame), not looped. Frame counts confirmed by reslice.
const _guanyinAtk = (sheet, frames, width, height, speed) => ({ frames, width, height, speed, loop: false, lockLastFrame: true, anchorY: 0, sheet })
const GUANYIN_LEG   = _guanyinAtk("./guanyin_leg_strike_uniform.png",  4, 304, 344, 4)
const GUANYIN_ARM   = _guanyinAtk("./guanyin_arm_sweep_uniform.png",   5, 342, 344, 4)   // wide horizontal arc
const GUANYIN_COMBO = _guanyinAtk("./guanyin_combo_slash_uniform.png", 7, 300, 344, 4)   // 2-hit
const GUANYIN_BURST = _guanyinAtk("./guanyin_punch_burst_uniform.png", 6, 297, 344, 4)   // frames 1-2 windup, 3-6 damage
const GUANYIN_ANIM = {
  idle: GUANYIN_IDLE, jump: GUANYIN_IDLE, fall: GUANYIN_IDLE,
  // The lunge TRAVELS (design: the whole base moves) — walk/run/dash play it; the generic giant
  // hurtbox (combat.js _giantHurtbox) reads the DRAWN giant, so the hurtbox follows the lunge.
  walk: GUANYIN_LUNGE, run: GUANYIN_LUNGE, dash: GUANYIN_LUNGE,
  // Base-kit normal buttons are intercepted while giant (updateNeteroGuanyinCombat) and re-routed to the
  // avatar attacks below; the raw normal actions still hold the idle if ever reached.
  light: GUANYIN_IDLE, heavy: GUANYIN_IDLE, up: GUANYIN_IDLE, air: GUANYIN_IDLE, down_air: GUANYIN_IDLE, grab: GUANYIN_IDLE,
  hurt: GUANYIN_HURT, guard: GUANYIN_GUARD,
  // Avatar attack poses (driven by currentMove; see fireGuanyinAttack).
  guanyinLeg: GUANYIN_LEG, guanyinArm: GUANYIN_ARM, guanyinCombo: GUANYIN_COMBO, guanyinBurst: GUANYIN_BURST,
  // 100-Type Zero finisher — STAGED ART: reuses the punch_burst pose (the Zero is canonically a single
  // all-out punch) so the slot is fully playable now; a dedicated Zero sheet is a future art pass.
  guanyinZero: GUANYIN_BURST
}

// Avatar-attack move data — ultimate-tier (each out-hits Netero's base kit; the giant's 1.6× attack
// multiplier stacks on top). Reach is giant-sized. punch_burst's startup (9) intentionally covers the
// 2 non-damaging windup frames so the hitbox only exists frames 3-6 (activeStart..activeEnd gate).
const GUANYIN_ATTACKS = {
  guanyinLeg:   { damage: 62, startup: 6, active: 8,  recovery: 16, hitstun: 24, knockbackX: 10, knockbackY: -2, rangeX: 220, rangeY: 210 },              // quick low sweep
  guanyinArm:   { damage: 78, startup: 8, active: 10, recovery: 18, hitstun: 26, knockbackX: 14, knockbackY: -3, rangeX: 300, rangeY: 200 },              // wide horizontal arc
  guanyinCombo: { damage: 46, startup: 4, active: 16, recovery: 12, hitstun: 18, knockbackX: 6,  knockbackY: -2, rangeX: 250, rangeY: 210, twoHit: true },// 2-hit (re-arms mid-active)
  guanyinBurst: { damage: 92, startup: 9, active: 13, recovery: 8,  hitstun: 30, knockbackX: 16, knockbackY: -8, rangeX: 240, rangeY: 210 }, // windup(1-2) → burst(3-6); NOT a launcher (a launcher self-lifts the planted giant)
  // 100-TYPE ZERO — the single strongest strike in the kit (once-per-activation finisher; see
  // executeNeteroZero). Long committed windup (24f startup) covers the dramatic cast; huge damage +
  // knockback. 1.6× avatar attackMultiplier stacks on top (≈288 eff) → a true KO-tier finisher.
  guanyinZero:  { damage: 180, startup: 24, active: 12, recovery: 24, hitstun: 44, knockbackX: 24, knockbackY: -12, rangeX: 380, rangeY: 280 }
}
// Fire one Guanyin avatar attack (currentMove drives the giant body-swap to the attack pose).
function fireGuanyinAttack(fighter, key, context) {
  const md = GUANYIN_ATTACKS[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = createAttackFromMove(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  attack.launcher  = !!md.launcher
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  shakeCamera(context, 6, 8)
  // 2-HIT (combo_slash): re-arm the hitbox mid-active so it connects a SECOND time (the two trail
  // moments ~frames 2 and 4). resolveAttackHit gates on currentAttack.hasHit; clearing it re-opens the
  // window for one more connect while active frames are still live. Guarded so a later move isn't touched.
  if (md.twoHit) schedulePendingSpawn(10, () => { if (fighter.currentAttack && fighter.currentAttack.name === key) fighter.currentAttack.hasHit = false })
  return true
}
// ── 100-TYPE ZERO — dedicated finisher move-slot within the Guanyin form ──────
// Netero's single strongest, most dramatic strike. Fires on the ULTIMATE button pressed AGAIN
// while already giant (that input previously no-opped — see executeNeteroUltimate). Gated
// ONCE PER activation via _zeroUsed (reset in enterNeteroGuanyin), so it reads as a climactic
// finisher, not a spammable normal. Free (no meter) — you already paid full meter to enter the
// form. Committed cinematic: the ~19s monologue plays on the windup (fire-and-forget, overlaps
// as dramatic VO — flagged as tunable), the payoff battle-cry is synced to the strike frames.
function executeNeteroZero(fighter, context) {
  if (!fighter._guanyinActive || fighter._zeroUsed) return false
  if (fighter.attacking || (fighter.attackCooldown || 0) > 0) return false
  fighter._zeroUsed = true
  const md = GUANYIN_ATTACKS.guanyinZero
  const attack = createAttackFromMove(fighter, "guanyinZero", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial  = true
  attack.isUltimate = true                                   // ultimate-tier hit categorisation (KO/knockdown class)
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._suppressUltCooldown = true                        // don't arm the ult cooldown for this in-form press (revert owns the 20s lockout)
  // 100-Type Zero cast/strike voice removed (audio files deleted); re-add sound.playSfxFile here to re-enable.
  focusCameraOnAction(context, fighter, null, 1.0, 22)
  shakeCamera(context, 12, 16)
  // Strike beat: camera shake synced to the active frames (after the committed windup).
  schedulePendingSpawn(md.startup, () => {
    if (fighter.currentAttack && fighter.currentAttack.name === "guanyinZero") {
      shakeCamera(context, 18, 22)
    }
  })
  return true
}

// While giant: intercept the base-kit attack buttons and re-route to the avatar attacks. light=leg,
// heavy=arm-sweep, up=punch-burst; combo-slash is on SPECIAL (executeNeteroSpecial giant branch).
// Returns true (→ skip the normal path) only when it fires.
export function updateNeteroGuanyinCombat(fighter, inputState, context, getPhase) {
  if (!fighter || !fighter._guanyinActive || !inputState) return false
  const lightEdge = !!inputState.light    && !fighter._gLightPrev
  const heavyEdge = !!inputState.heavy    && !fighter._gHeavyPrev
  const upEdge    = !!inputState.upAttack  && !fighter._gUpPrev
  fighter._gLightPrev = !!inputState.light
  fighter._gHeavyPrev = !!inputState.heavy
  fighter._gUpPrev    = !!inputState.upAttack
  if (fighter.attacking || (fighter.attackCooldown || 0) > 0) return false
  if (lightEdge) return fireGuanyinAttack(fighter, "guanyinLeg",   context)
  if (heavyEdge) return fireGuanyinAttack(fighter, "guanyinArm",   context)
  if (upEdge)    return fireGuanyinAttack(fighter, "guanyinBurst", context)
  return false
}

export function neteroInGuanyin(fighter) { return !!(fighter && fighter._guanyinActive) }

export function enterNeteroGuanyin(fighter) {
  if (!fighter) return
  fighter._guanyinActive    = true
  fighter._guanyinTimer     = SUSANOO_DURATION_FRAMES       // ~20s, then auto-reverts
  fighter._zeroUsed         = false                         // 100-Type Zero is once-per-activation → re-arm it each time the form is entered
  fighter.damageMultiplier   = 1.6
  fighter.attackMultiplier   = 1.6
  fighter.defenseMultiplier  = 1.4
  fighter._canvasHeightFrac  = NETERO_GUANYIN_CANVAS_FRAC    // GENERIC giant scale (sprite.js) + hurtbox (combat.js)
  fighter._canvasHeightRefH  = NETERO_GUANYIN_REF_H
  fighter._skinAnim          = GUANYIN_ANIM
  fighter._susanooActive     = true                          // GENERIC physics half-arena lock
  fighter.canJump            = false                         // a planted giant doesn't hop
  // Clear the base-form charge pose so it can't shadow the giant on the handoff (four-copies guard).
  fighter._spriteCastMove    = null
  fighter._spriteCastTimer   = 0
  fighter.attacking          = false
  fighter.currentMove        = null
  fighter.currentAttack      = null
}

// Drop the giant + arm the 20s ultimate recast lockout (suppressed on activation).
export function revertNeteroGuanyin(fighter) {
  if (!fighter || !fighter._guanyinActive) return
  fighter._guanyinActive    = false
  fighter._guanyinTimer     = 0
  fighter.damageMultiplier   = 1
  fighter.attackMultiplier   = 1
  fighter.defenseMultiplier  = 1
  fighter._skinAnim          = null
  fighter._canvasHeightFrac  = null
  fighter._canvasHeightRefH  = null
  fighter._susanooActive     = false
  fighter._arenaHalfLock     = null
  fighter.canJump            = true
  fighter.ultimateCooldown   = ULTIMATE_COOLDOWN_FRAMES
}

// Per-frame: tick the sustained-form timer, auto-revert at 0. Hooked in updateTransformationState.
// The 1.6× buff set in enterNeteroGuanyin persists because Netero has NO transformations block (Itachi
// parity) — updateTransformations() no-ops, so it never re-applies a base-form multiplier and stomps it.
export function updateNeteroGuanyin(fighter) {
  if (!fighter || !fighter._guanyinActive) return
  if ((fighter._guanyinTimer || 0) > 0) {
    fighter._guanyinTimer--
    if (fighter._guanyinTimer <= 0) revertNeteroGuanyin(fighter)
  }
}

// ULTIMATE — pays FULL meter (a true ultimate). Plays the base-form charge cast, THEN materialises
// the giant after GUANYIN_CAST_FRAMES (delayed enter). Cooldown suppressed on activation, armed in revert.
function executeNeteroUltimate(fighter, context) {
  if (fighter._guanyinActive) return executeNeteroZero(fighter, context)   // ult button WHILE giant = 100-Type Zero finisher (once per activation)
  const cost = fighter.maxEnergy || 100
  if (!spendEnergy(fighter, cost)) return false
  fighter._spriteCastMove  = "guanyinCast"                  // base-form charge pose (13f) plays first
  fighter._spriteCastTimer = GUANYIN_CAST_FRAMES
  fighter.attackCooldown   = getAttackDuration(GUANYIN_CAST_FRAMES, fighter)
  fighter._suppressUltCooldown = true                       // 20s recast lockout armed in revertNeteroGuanyin instead
  // Guanyin-cast voice removed (audio files deleted); the transformation/summon beat still fires
  // here — re-add sound.playSfxFile?.(pickNeteroVoice("guanyinCast"), null) to re-enable.
  focusCameraOnAction(context, fighter, null, 0.9, 18)
  shakeCamera(context, 10, 14)
  schedulePendingSpawn(GUANYIN_CAST_FRAMES, () => {
    enterNeteroGuanyin(fighter)
    fighter.teleportFlash = Math.max(fighter.teleportFlash || 0, 16)
    shakeCamera(context, 14, 16)
  })
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
  // SUSANOO active → the SPECIAL button swings the giant sword (base kit is suppressed while giant).
  if (fighter._itachiSusanoo) return executeItachiSusanooSword(fighter, context)

  // TRANSFORMATION JUTSU — Tier 1 Disguise (→↓←) / Tier 2 Full Copy (→↓→). Additive; falls through on gate-fail.
  if (tryTransformJutsu(fighter, context)) return true

  const dirs = getRelativeDirections(fighter)

  // ── MANGEKYOU-GATED SPECIALS ────────────────────────────────────────────
  // HARD gate: only resolve while _mangekyouActive. In base form this whole block is skipped,
  // so a QCF/QCB motion simply falls through to the neutral Great Fireball (Itachi's always-on
  // special). Mirrors Goku Black's Rose-exclusive gate — the flame/illusion art only exists in-mode.
  if (fighter._mangekyouActive) {
    // QCF (D→F) — AMATERASU: inextinguishable black flame. Modest direct hit, strong lingering DOT.
    if (endsWithPattern(dirs, ["D", "F"])) {
      if (!spendEnergy(fighter, 40)) return false
      sound.playSfxFile?.(pickItachiVoice("amaterasu"), null)   // "Amaterasu!"
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
      sound.playSfxFile?.(pickItachiVoice("genjutsu"), null)   // "Tsukuyomi" / "The finishing touch"
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
  sound.playSfxFile?.(pickItachiVoice("fireball"), null)   // "Katon!" cast bark
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

  // TRANSFORMATION JUTSU — Tier 1 Disguise (→↓←) / Tier 2 Full Copy (→↓→). Additive; falls through on gate-fail.
  if (tryTransformJutsu(fighter, context)) return true
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
    if (endsWithPattern(dirs, ["B", "F"])) return executeSasukeHawkSummon(fighter, target, context)      // hawk swoop = combo-starting launcher
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

// ─────────────────────────────────────────────────────────────────────────────
// TOBIRAMA — SPECIAL menu (SPECIAL button, direction-branched via _specialHeldDir) — Stage 4.
// Water-release ninjutsu + a dark-element orb. The space-time Water Body-Flicker escape is a
// REVERSAL (Special pressed while in hitstun/knockdown — executeTobiramaWaterFlicker, driven from game.js).
//   Neutral = Water Dragon Jutsu (proc water projectile; cast = seal→thrust)
//   Forward = Forward Water Slash (advancing melee; water-arc FX built into the sprite)
//   Up      = Rising Water        (anti-air launcher; geyser FX built into the sprite)
//   Down    = Water Wall          (proc water-barrier — brief stationary damaging column)
//   Back    = Darkness Jutsu      (proc dark-orb projectile; cast pose)
// Costs Chakra. Melee casts use createAttackFromMove (currentMove drives the pose); projectile/
// barrier casts use _spriteCastMove + schedulePendingSpawn → spawnProjectile with a drawKind
// PLACEHOLDER FX (ui.drawProjectiles) — a real `sheet` later takes precedence (drop-in swap).
// ─────────────────────────────────────────────────────────────────────────────
const TOBI_WATER_SLASH  = { damage: 72, startup: 6, active: 4, recovery: 15, hitstun: 20, knockbackX: 7, knockbackY: -2,  rangeX: 96, rangeY: 58,  isSpecial: true }
const TOBI_RISING_WATER = { damage: 66, startup: 7, active: 4, recovery: 16, hitstun: 22, knockbackX: 2, knockbackY: -15, rangeX: 72, rangeY: 100, isSpecial: true, launcher: true }

function fireTobiramaWaterSlash(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 25)) return false
  const md = TOBI_WATER_SLASH
  const attack = createAttackFromMove(fighter, "tobiWaterSlash", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "tobiWaterSlash"
  fighter.vx = (fighter.facing || 1) * 5        // advance into the slash
  shakeCamera(context, 4, 6)
  return true
}
function fireTobiramaRisingWater(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 30)) return false
  const md = TOBI_RISING_WATER
  const attack = createAttackFromMove(fighter, "tobiRisingWater", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.launcher = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  shakeCamera(context, 4, 6)
  return true
}
function fireTobiramaWaterDragon(fighter, context) {
  if (!spendEnergy(fighter, 40)) return false
  try { sound.playSfxFile?.(pickTobiramaVoice("cast"), null) } catch (_) {}   // VOICE: water-jutsu callout (PROVISIONAL: seiton → Water Dragon)
  fighter._spriteCastMove  = "tobiWaterDragon"     // 10f seal→thrust cast pose
  fighter._spriteCastTimer = 30
  fighter.attackCooldown   = getAttackDuration(34, fighter)
  const face = fighter.facing || 1
  schedulePendingSpawn(16, () => {                 // release on the forward-thrust beat
    spawnProjectile(fighter, "tobiWaterDragon", {
      drawKind: "water", damage: 78, speed: 12, lifetime: 130, hitstun: 20, knockbackX: 8, knockbackY: -3,
      w: 56, h: 44, radius: 26, color: "#38bdf8", isSpecial: true,
      vx: face * 12, spawnY: fighter.y + (fighter.h || 100) * 0.42
    }, context)
    shakeCamera(context, 5, 7)
  })
  return true
}
function fireTobiramaDarkness(fighter, context) {
  if (!spendEnergy(fighter, 30)) return false
  fighter._spriteCastMove  = "tobiDarkness"        // 6f seal→cup cast pose
  fighter._spriteCastTimer = 24
  fighter.attackCooldown   = getAttackDuration(28, fighter)
  const face = fighter.facing || 1
  schedulePendingSpawn(12, () => {
    spawnProjectile(fighter, "tobiDarkness", {
      drawKind: "dark", damage: 60, speed: 11, lifetime: 110, hitstun: 18, knockbackX: 6, knockbackY: -2,
      w: 44, h: 44, radius: 22, color: "#7c3aed", isSpecial: true,
      vx: face * 11, spawnY: fighter.y + (fighter.h || 100) * 0.42
    }, context)
  })
  return true
}
function fireTobiramaWaterWall(fighter, context) {
  if (!spendEnergy(fighter, 30)) return false
  fighter._spriteCastMove  = "tobiWaterWall"       // 5f seal→brace cast pose
  fighter._spriteCastTimer = 22
  fighter.attackCooldown   = getAttackDuration(26, fighter)
  schedulePendingSpawn(8, () => {                  // raise the wall just in front
    spawnProjectile(fighter, "tobiWaterWall", {
      drawKind: "waterwall", damage: 44, speed: 0, vx: 0, lifetime: 42, hitstun: 16, knockbackX: 9, knockbackY: -2,
      w: 34, h: 112, radius: 46, color: "#38bdf8", isSpecial: true,
      spawnX: fighter.facing === 1 ? fighter.x + (fighter.w || 60) + 8 : fighter.x - 34 - 8,
      spawnY: fighter.y + (fighter.h || 100) * 0.5
    }, context)
    shakeCamera(context, 3, 5)
  })
  return true
}
// SPACE-TIME escape — Water Body-Flicker. A reversal: dissolve into water and reform a short
// distance BACK with brief i-frames. Driven from game.js when Special is pressed during
// hitstun/knockdown (bypassing the normal special gate). NOT free — costs 35 Chakra + a 90f
// cooldown, so it's a committed defensive resource, not an infinite get-out. True if it fired.
export function executeTobiramaWaterFlicker(fighter, context) {
  if (!fighter || (fighter._waterFlickerCd || 0) > 0) return false
  if (!spendEnergy(fighter, 35)) return false
  fighter.hitstun = 0; fighter.stun = 0; fighter.blockstun = 0
  fighter.knockdownState = false; fighter.knockdownTimer = 0
  fighter.attacking = false; fighter.isLaunched = false
  fighter.vx = 0; fighter.vy = 0
  const face = fighter.facing || 1
  fighter.x -= face * 130                            // reform retreating (away from the opponent)
  fighter.invulnTimer      = Math.max(fighter.invulnTimer || 0, 26)
  fighter._waterFlickerCd  = 90
  fighter._spriteCastMove  = "tobiWaterFlicker"      // puddle→column→reform pose
  fighter._spriteCastTimer = 26
  fighter.attackCooldown   = getAttackDuration(22, fighter)   // reform recovery — also stops a still-held Special from re-firing a neutral cast this frame
  fighter.teleportFlash    = 8
  shakeCamera(context, 4, 6)
  return true
}
export function executeTobiramaSpecial(fighter, context) {
  // TRANSFORMATION JUTSU — Tier 1 Disguise (→↓←) / Tier 2 Full Copy (→↓→). Additive; falls through on gate-fail.
  if (tryTransformJutsu(fighter, context)) return true

  const dir = fighter._specialHeldDir || null
  const airborne = !(fighter.onGround ?? fighter.grounded ?? true)
  // Rising Water (anti-air geyser launcher) = Special while AIRBORNE, or Up+Special. Airborne is the
  // robust path: in this engine `up` also fires the jump, so holding Up+Special leaves the ground the
  // same frame — reading "airborne" covers both the jump-cancel and a deliberate Up+Special.
  if (airborne || dir === "U") return fireTobiramaRisingWater(fighter, context)
  if (dir === "F") return fireTobiramaWaterSlash(fighter, context)
  if (dir === "D") return fireTobiramaWaterWall(fighter, context)
  if (dir === "B") return fireTobiramaDarkness(fighter, context)
  return fireTobiramaWaterDragon(fighter, context)   // neutral ground (and any unmapped dir)
}

// ─────────────────────────────────────────────────────────────────────────────
// TOBIRAMA — EDO TENSEI ultimate (Stage 6). An in-place CHARACTER-SWAP: spend ALL chakra + a
// portion of CURRENT hp to REANIMATE the pre-chosen vessel (fighter._edoBackup) — control passes
// to that character's FULL kit for a DRAINING window, then auto-reverts to Tobirama. Reuses the
// transform-style stash→overwrite→restore body-swap (Step A) — no new multi-fighter systems.
// POOL DECISION (Step A): SHARED hp (the vessel fights on Tobirama's remaining life → no free
// healthbar reset), FRESH full energy bar that IS the window fuel — it drains per frame AND funds the
// borrowed kit, so managing energy manages the summon's length. All moveset/render routing reads the
// fighter object, so swapping rosterKey + the fields below re-routes the entire borrowed kit automatically.
// REVISED DESIGN: Tobirama does NOT vanish — his body stays on screen as a standing, hittable
// _edoDummy next to the tomb. Two end conditions: (a) the vessel's ENERGY bar drains to 0, or
// (b) the OPPONENT lands a hit directly on the dummy (game.js), which also damages the shared HP.
// ─────────────────────────────────────────────────────────────────────────────
// WINDOW = a continuous DRAIN on the vessel's OWN ENERGY bar (the Vegeta-SSJ / tickSustainedFormDrain
// pattern, on `energy`). The vessel EMERGES with a full bar; it drains per frame and the jutsu ends when
// it hits 0. CRUCIAL (fixes "feels like a fixed timer"): because the window fuel IS the energy bar, the
// player can EXTEND the summon by building energy (charge move / passive regen / any energy gain) and
// SHORTENS it by spending on the vessel's kit — a genuinely managed drain, not a decoupled countdown.
// A prior build drained a SEPARATE `_edoFuel` meter at a constant rate → that is mathematically a timer
// (energy management had zero effect on it), which is exactly the reported symptom.
const EDO_ENERGY_DRAIN           = 0.26  // energy/frame while active. Net of passive regen (~0.06) → ~0.20/frame:
                                         // a full ~190-200 bar lasts ~16s UNMANAGED (a comfortably usable window,
                                         // not razor-thin); a charge move (+0.5/frame) net-GAINS energy, extending
                                         // it (charging locks you = a real tradeoff). Tuned DOWN from 0.35 (~11s)
                                         // so the window feels usable even for a vessel WITHOUT a nested ultimate;
                                         // see edoVesselInNestedUltimate for the pause that protects self-draining
                                         // transformation ultimates from being double-drained.
const EDO_TENSEI_HP_COST_FRAC    = 0.25  // portion of CURRENT hp spent to reanimate (non-trivial)
const EDO_TENSEI_MIN_ENERGY      = 60    // minimum chakra pool required to activate at all
const EDO_DUMMY_OFFSET           = 100   // vessel emerges this far TOWARD the opponent so it doesn't overlap the standing Tobirama
// Everything the moveset/render pipeline reads off the fighter object (Step A investigation).
const EDO_SWAP_FIELDS = ["rosterKey", "name", "color", "basic_attacks", "animationData", "spriteScale", "traits", "ultimate", "dashTeleport", "runWhenAdvancing", "introPool", "maxEnergy", "energyType"]

function applyEdoTensei(fighter, vesselKey, worldWidth) {
  const vessel = characters[vesselKey]
  if (!vessel) return false
  // 1) stash Tobirama's originals (+ _skinAnim) for the revert
  const stash = {}
  for (const k of EDO_SWAP_FIELDS) stash[k] = fighter[k]
  stash._skinAnim = fighter._skinAnim
  stash._recolorTag = fighter._recolorTag        // Part 2: restore Tobirama's own recolor state on revert
  stash._baseSkinAnim = fighter._baseSkinAnim
  fighter._edoStash = stash
  // 1b) snapshot Tobirama's own body as a standing, hittable "dummy" (rendered next to the tomb for the
  //     whole window). Captured NOW, while the fighter still holds Tobirama's idle sheet + position (the
  //     cinematic has parked him at the arena edge). The opponent can hit this to cancel the jutsu early.
  const idle = fighter.animationData?.idle || {}
  fighter._edoDummy = {
    x: fighter.x, y: fighter.y, w: fighter.w || 60, h: fighter.h || 100, facing: fighter.facing || 1,
    sheet: idle.sheet || null, sw: idle.width || 48, sh: idle.height || 90, frames: idle.frames || 1,
    spriteScale: fighter.spriteScale, _f: 0
  }
  // 2) overwrite with the vessel's data — the kit routes off rosterKey + these fighter fields
  fighter.rosterKey        = vesselKey
  fighter.name             = vessel.name || vesselKey
  fighter.color            = vessel.color || fighter.color
  fighter.basic_attacks    = vessel.basic_attacks || fighter.basic_attacks
  fighter.animationData    = vessel.animationData || fighter.animationData
  fighter.spriteScale      = vessel.spriteScale ?? fighter.spriteScale
  fighter.traits           = vessel.traits || fighter.traits
  fighter.ultimate         = vessel.ultimate || fighter.ultimate
  fighter.dashTeleport     = !!vessel.movement?.dashTeleport
  fighter.runWhenAdvancing = !!vessel.movement?.runWhenAdvancing
  fighter.introPool        = vessel.introPool || null
  // Part 2 — REANIMATION palette: any Edo Tensei vessel renders in the near-black desaturated "reanimated
  // corpse" wash for the whole summon window, REGARDLESS of the vessel's own skin. Reuses the recolor
  // skin-swap mechanism: _skinAnim = vessel anim retagged to __reanim sheets (generated per char). Stamping
  // _recolorTag/_baseSkinAnim = "reanim" makes even a NESTED vessel transform (SSJ/Rose/etc) stay dark.
  const reanimAnim         = retagFormAnim(vessel.animationData, "reanim")
  fighter._skinAnim        = reanimAnim
  fighter._baseSkinAnim    = reanimAnim
  fighter._recolorTag      = "reanim"
  fighter.maxEnergy        = vessel.stats?.maxEnergy || fighter.maxEnergy || 200
  fighter.energyType       = vessel.traits?.energyType || fighter.energyType
  fighter.energy           = fighter.maxEnergy           // FRESH FULL bar = the window fuel; it drains over the summon and funds the borrowed kit
  // 3) clean transient state + reset the sprite handler so it re-resolves against the vessel's anim
  _edoClearTransient(fighter)
  fighter._edoActive = true                  // window ends when the ENERGY bar (drained per frame) hits 0 — extendable by building energy
  fighter._edoVessel = vesselKey
  fighter._edoIntroPlayed = false            // game.js plays the vessel's OWN intro (pose + voice) once the summon cinematic ends
  fighter.ultimateCooldown = 0   // the vessel starts with its OWN ultimate ready (nested ultimate is the point)
  clearInputBuffer(fighter)      // drop the activation ult-press (frozen in the buffer during the summon) so the vessel doesn't inherit it
  // The vessel EMERGES a short step toward the opponent so the player-controlled body doesn't overlap the
  // standing Tobirama dummy left at the arena edge (clamped to the stage).
  const worldW = worldWidth || 1280
  fighter.x = Math.max(24, Math.min(worldW - (fighter.w || 60) - 24, fighter.x + (fighter._edoDummy.facing) * EDO_DUMMY_OFFSET))
  fighter.teleportFlash = 12
  return true
}

function _edoClearTransient(fighter) {
  fighter.attacking = false; fighter.currentMove = null; fighter.currentAttack = null
  fighter._spriteCastMove = null; fighter._spriteCastTimer = 0; fighter.isCharging = false
  fighter._rekkaNext = null; fighter._cmdHitLanded = false; fighter._cmdPrevHeavy = false; fighter._cmdPrevLight = false
  if (fighter.spriteHandler) { fighter.spriteHandler.currentAction = null; fighter.spriteHandler.frameIndex = 0; fighter.spriteHandler.frameTimer = 0; fighter.spriteHandler.locked = false }
}

// On revert, wipe any FORM / BUFF state the vessel's own ultimate may have left active (Susanoo,
// Godspeed, Flash Time, SSJ forms, Mangekyou, …) so it can never LEAK onto the reverted Tobirama.
// Covers the common sprite-roster ult states; each defaults falsy/1 = "off/normal".
function _edoCleanseVesselState(fighter) {
  fighter._susanooStage = 0; fighter._susanooTimer = 0; fighter._susanooActive = false; fighter._suppressUltCooldown = false
  fighter._itachiSusanoo = false; fighter._itachiSusanooTimer = 0; fighter._mangekyouActive = false
  fighter._godspeedActive = false; fighter._godspeedTrail = null
  fighter._flashTimeActive = false; fighter._ftTrail = null; fighter._oppTimeScale = null
  fighter.currentForm = null; fighter.transformIndex = null
  fighter.damageMultiplier = 1; fighter.attackSpeedMultiplier = 1
  fighter._canvasHeightFrac = null; fighter._rooted = false; fighter.isLaunched = false
}

// Revert to Tobirama at window expiry (Step D — the handoff). Restores identity + kit and plays a
// graceful water-reform transition. NON-EXPLOITABLE: this does NOT grant i-frames and does NOT touch
// hitstun / blockstun / stun / knockdownState / vx / vy — so if the window lapses mid-combo, Tobirama
// INHERITS the bad position (the swap can never cancel a punish into a free escape). Activation is
// likewise gated out during hitstun (triggerUltimate), so neither end of the swap is an escape.
export function revertEdoTensei(fighter) {
  if (!fighter?._edoActive || !fighter._edoStash) return false
  const s = fighter._edoStash
  _edoCleanseVesselState(fighter)                        // wipe any vessel form/buff BEFORE restoring Tobirama's fields
  for (const k of EDO_SWAP_FIELDS) fighter[k] = s[k]
  fighter._skinAnim = s._skinAnim || null
  fighter._recolorTag = s._recolorTag || null            // Part 2: drop the reanim override on revert
  fighter._baseSkinAnim = s._baseSkinAnim || null
  fighter.energy = 0                                     // Tobirama spent all chakra to reanimate
  _edoClearTransient(fighter)                            // clears own attack/cast state (NOT hitstun/knockback)
  // Tobirama re-inhabits at the vessel's FINAL position (no reposition → the revert can't teleport out of a
  // punish). The standing dummy simply vanishes as the seal completes.
  fighter._edoActive = false; fighter._edoDummy = null; fighter._edoStash = null; fighter._edoVessel = null
  clearInputBuffer(fighter)      // symmetric: Tobirama doesn't inherit the vessel's buffered presses
  fighter.teleportFlash = 14                             // reanimation dissolves back — a visible flash (never a hard snap)
  // Graceful reform pose (the water body-flicker dissolve→reform). Purely cosmetic — grants no invuln
  // and yields to hitstun (a mid-combo revert correctly shows the hurt pose, not a safe reform).
  if (!(fighter.hitstun > 0) && !fighter.knockdownState) { fighter._spriteCastMove = "tobiWaterFlicker"; fighter._spriteCastTimer = 20 }
  return true
}

export function executeTobiramaUltimate(fighter, context) {
  if (fighter._edoActive || isEdoTenseiCinematicActive()) return false   // already reanimating / mid-summon
  const vesselKey = fighter._edoBackup
  if (!vesselKey || !characters[vesselKey]) return false              // no vessel (assignEdoBackup defaults, so rare)
  if ((fighter.energy || 0) < EDO_TENSEI_MIN_ENERGY) return false     // needs a real chakra pool
  // COST paid UP-FRONT: ALL current chakra + a portion of CURRENT hp (shared pool — never self-KO).
  fighter.energy = 0
  fighter.health = Math.max(1, (fighter.health || 0) - Math.floor((fighter.health || 0) * EDO_TENSEI_HP_COST_FRAC))
  fighter.attacking = false; fighter.currentMove = null; fighter.currentAttack = null; fighter.isCharging = false
  try { sound.playSfxFile?.(pickTobiramaVoice("ultimateCast"), null) } catch (_) {}   // VOICE: Edo Tensei "no kindness, full might" ultimate-activation callout
  // Launch the summoning CINEMATIC (freeze + jump-to-edge + hand-seals + rising coffin + reveal). The
  // body-swap (applyEdoTensei) fires at the cinematic's reveal beat via onResolve; control hands to the
  // vessel when the cinematic ends. Combat is frozen throughout (game.updateBattle freeze-gate).
  const worldWidth = context?.worldWidth
  activateEdoTenseiCinematic(fighter, context?.getOpponent?.(fighter), "in", vesselKey,
    () => applyEdoTensei(fighter, vesselKey, worldWidth), worldWidth)
  return true
}

// De-summon (launch the reverse "out" cinematic → revert to Tobirama). Called from BOTH end conditions:
// the window fuel running dry (updateEdoTensei) and the opponent landing a hit on the standing Tobirama
// dummy (game.js checkEdoDummyHit). Idempotent while a de-summon is already in flight.
export function endEdoTenseiWindow(fighter, worldWidth) {
  if (!fighter?._edoActive || fighter._edoEnding) return false
  fighter._edoEnding = true
  activateEdoTenseiCinematic(fighter, null, "out", fighter._edoVessel,
    () => { revertEdoTensei(fighter); fighter._edoEnding = false }, worldWidth)
  return true
}

// True while the summoned vessel is inside its OWN ultimate / transformation state (a nested ultimate).
// The Edo Tensei outer drain PAUSES for this WHOLE duration (see updateEdoTensei) so a self-draining
// transformation ultimate isn't double-drained. Covered generically by `currentForm` (Vegeta SSJ/Blue,
// Killua Godspeed, Flash Time, Goku Black SSJ Rose, Mahoraga all set it to a non-base value) plus the
// explicit flags for the giant/buff forms that DON'T set currentForm (Sasuke/Itachi Susanoo, Mangekyou).
// applyEdoTensei swaps in the vessel but never sets currentForm, so a non-base currentForm reliably means
// "the vessel entered its own transformation" — Tobirama himself has no form.
export function edoVesselInNestedUltimate(fighter) {
  if (!fighter) return false
  const form = fighter.currentForm
  if (form && form !== "base") return true
  return !!(fighter._ssjActive || fighter._ssjBlueActive || fighter._ssjRoseActive ||
            fighter._godspeedActive || fighter._flashTimeActive || fighter._mangekyouActive ||
            fighter._susanooActive || fighter._itachiSusanoo || fighter._susanooStage ||
            fighter.isMahoraga)
}

// Per-frame Edo Tensei driver (called every frame from game.js updatePlayerCombat). Drains the window
// fuel; when it hits 0 it launches the END cinematic (un-summon), which reverts to Tobirama at its own
// beat. NOTE: the fuel drain PAUSES automatically during any inner-ultimate ACTIVATION cinematic — while
// any cinematic runs, updateBattle returns early before updatePlayerCombat, so this never drains then.
export function updateEdoTensei(fighter, worldWidth) {
  if (!fighter || !fighter._edoActive || fighter._edoEnding) return
  // PAUSE the outer Edo drain for the ENTIRE duration of a nested transformation-style ultimate — not just
  // its activation cinematic. Godspeed / Vegeta SSJ-Blue / SSJ Rose / Flash Time / Mangekyou are GAMEPLAY
  // buff-modes that drain the SAME energy bar continuously (there is no single "cinematic moment" to pause
  // around); stacking Edo's 0.26/frame on top burned the shared bar so fast the nested ultimate was
  // pointless. While the vessel is transformed only the vessel's OWN drain ticks; the Edo window resumes on
  // revert, on whatever energy is left. (Activation cinematics were already covered by the outer freeze.)
  if (edoVesselInNestedUltimate(fighter)) return
  // Reuse the shared sustained-form drain (same helper as Vegeta SSJ/Blue, Goku Black SSJ Rose, Godspeed,
  // Flash Time) on the vessel's ENERGY bar. When energy can't cover the tick, `revert` fires the un-summon
  // (energy-exhaustion end condition). Because this drains the SAME bar the player builds/spends, the
  // summon is genuinely extendable (charge/regen) and shortenable (spend on the kit) — not a fixed timer.
  tickSustainedFormDrain(fighter, {
    active: f => !!f._edoActive && !f._edoEnding,
    drainPerFrame: EDO_ENERGY_DRAIN,
    revert: f => endEdoTenseiWindow(f, worldWidth)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// BATMAN — SPECIAL menu (SPECIAL button, direction-branched via _specialHeldDir) — Stage 3.
// Gadget-tech kit. Three tools, per the design calls (each pinned to the ACTUAL batch art):
//   • Neutral = BATARANG — a thrown projectile (baterang_throw cast → batman_baterang_proj.png
//     5-frame spinning batarang). Fastest/cheapest tool: a quick ranged poke. 15 Gadgets.
//   • Forward = CAPE DASH — the "Grapple Hook" slot, resolved as a MOBILITY LUNGE (not a grab-pull):
//     NO hook-and-pull art exists in the batch OR atlas, so per the brief the side_kick_combos
//     leaping cape-swoop drives a committed forward dash-strike. 25 Gadgets.
//   • Down    = SMOKE PELLET — evasion/mix-up: a vanish-and-reappear-BEHIND teleport reusing the
//     shared teleport-behind math (Sasuke-Substitution pattern) + procedural smoke poof + i-frames.
//     No dedicated smoke art → the poof is spawnClonePuff (art-independent, proven). 20 Gadgets.
// ─────────────────────────────────────────────────────────────────────────────
function executeBatmanSpecial(fighter, context) {
  const dir = fighter._specialHeldDir || null
  if (dir === "F") return fireBatmanCapeDash(fighter, context)
  if (dir === "D") return fireBatmanSmokePellet(fighter, context)
  return fireBatmanBatarang(fighter, context)
}

// NEUTRAL — Batarang: a thrown spinning projectile. The throw CAST pose plays while a small batarang
// (5-frame spin filmstrip) releases mid-motion and flies straight with its own collision. Cheap + fast
// = the poke that opens neutral. 15 Gadgets.
function fireBatmanBatarang(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 15)) return false
  fighter._spriteCastMove  = "batarangThrow"   // 6f wind-up→release (batman_batarang_throw_uniform)
  fighter._spriteCastTimer = 22
  fighter.attackCooldown   = getAttackDuration(24, fighter)
  const face = fighter.facing || 1
  // Release on the throw's release beat (~frame 5 of the 6f cast).
  schedulePendingSpawn(6, () => {
    spawnProjectile(fighter, "batman_batarang", {
      sheet: "./batman_baterang_proj.png", spriteFrames: 5, spriteW: 41, spriteH: 22, spriteSpeed: 2, spriteScale: 1.3,
      damage: 34, speed: 17, hitstun: 15, knockbackX: 5, knockbackY: -1,
      w: 34, h: 20, color: "#2b2f3a", lifetime: 150,
      vx: face * 17, spawnY: fighter.y + (fighter.h || 100) * 0.4
    }, context)
  })
  return true
}

// FORWARD — Cape Dash ("Grapple Hook" slot as a MOBILITY lunge). A committed leaping cape-swoop that
// carries Batman forward into a single strike (approach/gap-close tool). createAttackFromMove melee +
// a forward velocity burst; mild launch so it can start a juggle. 25 Gadgets.
function fireBatmanCapeDash(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 25)) return false
  const md = { damage: 50, startup: 6, active: 5, recovery: 16, hitstun: 20, blockstun: 12, knockbackX: 7, knockbackY: -5, rangeX: 96, rangeY: 64, isSpecial: true, launcher: true }
  const attack = createAttackFromMove(fighter, "capeDash", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)   // currentMove = "capeDash" → the leaping-swoop pose
  fighter.vx = (fighter.facing || 1) * 14   // lunge forward through the swoop
  shakeCamera(context, 4, 7)
  return true
}

// DOWN — Smoke Pellet: drop a smoke pellet and vanish, reappearing BEHIND the opponent. Reuses the
// shared teleport-behind positioning math (replicated from game.js teleportBehindTarget, exactly as
// Sasuke's Substitution does — abilities.js can't import game.js) + the procedural smoke poof
// (spawnClonePuff) at both origin and destination + brief i-frames on the blink. 20 Gadgets.
function fireBatmanSmokePellet(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 20)) return false
  const target = context?.getOpponent?.(fighter)
  fighter.invulnTimer   = Math.max(fighter.invulnTimer || 0, 14)   // covers the blink (dodges melee + stray projectiles)
  fighter.teleportFlash = 16
  // Poof OUT at the origin (capture before the reposition).
  spawnClonePuff(fighter.x + (fighter.w || 60) / 2, fighter.y + (fighter.h || 100) / 2)
  const STARTUP = 6
  fighter.attackCooldown = getAttackDuration(STARTUP + 18, fighter)   // committed, not spammable
  schedulePendingSpawn(STARTUP, () => {
    if (target) {
      const sw = context?.worldWidth || 3200
      // TRUE teleport-BEHIND: CROSS to the FAR side of the opponent (the shared game.js
      // teleportBehindTarget actually blinks to the near/same side = point-blank; for the Smoke
      // Pellet mix-up we want to genuinely reappear behind). Flip the ternary vs that helper.
      fighter.x = fighter.x < target.x ? target.x + target.w + 8 : target.x - fighter.w - 8
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

// ─────────────────────────────────────────────────────────────────
// BEN 10 SPECIALS (Stage 3) — SPECIAL button, FORM-branched then direction-branched via
// _specialHeldDir (Killua/Batman/Gon architecture). Ben 10 is one fighter; the active alien
// decides the special set. Art-less aliens fall through to the generic fallback special.
//   Ben-human:   neutral = Hoverboard Dash (mobility+strike, i-frames) · Down = Hoverboard Bash (launcher)
//   XLR8:        neutral = Dash Strike (quick lunge)               · Fwd  = Sonic Rush (launcher — combo extender)
//   Diamondhead: neutral = Shard Barrage (crystal projectile)      · Down = Rising Diamonds (ground eruption, launcher)
// ─────────────────────────────────────────────────────────────────

// XLR8 — neutral quick dash-strike (Zenitsu Thunderclap pattern: forward vx burst + melee hitbox).
function fireXlr8DashStrike(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 15)) return false
  const md = { damage: 80, startup: 4, active: 4, recovery: 14, hitstun: 20, blockstun: 10, knockbackX: 9, knockbackY: -2, rangeX: 96, rangeY: 48, isSpecial: true }
  const attack = createAttackFromMove(fighter, "xlDash", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  const dir = fighter.facing || 1
  fighter.vx = dir * 16
  for (const t of [2, 4, 6]) schedulePendingSpawn(t, () => { if (fighter.currentAttack?.name === "xlDash") fighter.vx = dir * 16 })
  shakeCamera(context, 3, 5)
  return true
}

// XLR8 — forward Sonic Rush: longer, faster dash that LAUNCHES (combo extender off a rekka launcher).
function fireXlr8SonicRush(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 25)) return false
  const md = { damage: 62, startup: 5, active: 5, recovery: 18, hitstun: 24, blockstun: 12, knockbackX: 6, knockbackY: -12, rangeX: 112, rangeY: 52, isSpecial: true, launcher: true }
  const attack = createAttackFromMove(fighter, "xlRush", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true; attack.launcher = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  const dir = fighter.facing || 1
  fighter.vx = dir * 20
  for (const t of [2, 4, 6, 8]) schedulePendingSpawn(t, () => { if (fighter.currentAttack?.name === "xlRush") fighter.vx = dir * 20 })
  shakeCamera(context, 4, 6)
  return true
}

// Diamondhead — neutral Shard Barrage: crystal-cannon cast pose → a traveling crystal projectile.
function fireDhShardBarrage(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 20)) return false
  fighter._spriteCastMove = "dhShoot"; fighter._spriteCastTimer = 20
  fighter.attackCooldown = getAttackDuration(24, fighter)
  const face = fighter.facing || 1
  schedulePendingSpawn(7, () => {
    // Procedural crystal shard (no dedicated projectile sprite yet — flagged in the asset map).
    spawnProjectile(fighter, "ben10_diamond_shard", {
      damage: 40, speed: 15, hitstun: 15, knockbackX: 6, knockbackY: -1,
      w: 22, h: 14, radius: 12, color: "#5eead4", lifetime: 130, isSpecial: true,
      vx: face * 15, spawnY: fighter.y + (fighter.h || 100) * 0.42
    }, context)
  })
  return true
}

// Diamondhead — Down Rising Diamonds: hand-slam cast → a stationary ground-eruption hitbox that LAUNCHES.
function fireDhRisingDiamonds(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 28)) return false
  fighter._spriteCastMove = "dhRising"; fighter._spriteCastTimer = 24
  fighter.attackCooldown = getAttackDuration(30, fighter)
  const face = fighter.facing || 1
  schedulePendingSpawn(10, () => {
    // Stationary ground hitbox in front (procedural crystal spikes — flagged); launches on hit.
    spawnProjectile(fighter, "ben10_diamond_eruption", {
      damage: 55, speed: 0, vx: 0, lifetime: 26, hitstun: 22, knockbackX: 3, knockbackY: -14,
      w: 52, h: 84, radius: 30, color: "#5eead4", isSpecial: true, launcher: true,
      spawnX: face === 1 ? fighter.x + (fighter.w || 60) + 10 : fighter.x - 52 - 10,
      spawnY: fighter.y + (fighter.h || 100) * 0.15
    }, context)
    shakeCamera(context, 4, 6)
  })
  return true
}

// Ben-human — neutral Hoverboard Dash: a mobility lunge with brief startup i-frames + a strike.
function fireBenHoverboard(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 15)) return false
  const md = { damage: 45, startup: 6, active: 5, recovery: 16, hitstun: 18, blockstun: 10, knockbackX: 7, knockbackY: -4, rangeX: 92, rangeY: 56, isSpecial: true }
  const attack = createAttackFromMove(fighter, "benHover", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  const dir = fighter.facing || 1
  fighter.vx = dir * 14
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 8)
  for (const t of [2, 4, 6, 8]) schedulePendingSpawn(t, () => { if (fighter.currentAttack?.name === "benHover") fighter.vx = dir * 14 })
  shakeCamera(context, 3, 5)
  return true
}

// Ben-human — Down Hoverboard Bash: a committed downward board strike that LAUNCHES (shares the pose).
function fireBenHoverBash(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 22)) return false
  const md = { damage: 60, startup: 8, active: 5, recovery: 20, hitstun: 22, blockstun: 12, knockbackX: 6, knockbackY: -12, rangeX: 84, rangeY: 60, isSpecial: true, launcher: true }
  const attack = createAttackFromMove(fighter, "benHover", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true; attack.launcher = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  const dir = fighter.facing || 1
  fighter.vx = dir * 10
  shakeCamera(context, 4, 6)
  return true
}

// Feedback — ENERGY ABSORPTION (neutral Special, the HEADLINE reactive counter). Opens a timed counter
// window (the absorb stance): if an incoming hit lands during it, combat.shouldFeedbackAbsorb negates it
// and stamps a redirect that updateBen10CommandCombat fires back amplified. Whiff = normal recovery.
const FB_ABSORB = { cost: 12, startup: 4, window: 22, recovery: 12 }
function fireFbEnergyAbsorb(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, FB_ABSORB.cost)) return false
  fighter._spriteCastMove  = "fbCharge"
  fighter._spriteCastTimer = FB_ABSORB.startup + FB_ABSORB.window + FB_ABSORB.recovery
  fighter._fbAbsorbWindow  = FB_ABSORB.startup + FB_ABSORB.window   // counter-active frames (ticked in update)
  fighter._fbAbsorbPending = null
  fighter.attackCooldown   = getAttackDuration(FB_ABSORB.startup + FB_ABSORB.window + FB_ABSORB.recovery, fighter)
  fighter.vx = 0
  shakeCamera(context, 2, 4)
  return true
}

// Feedback — the amplified REDIRECT fired the frame after a successful absorb (from updateBen10CommandCombat).
// Discharge damage scales with the absorbed blow: bigger the hit you eat, bigger the counter (capped).
function fireFbDischargeCounter(fighter, pending, context) {
  fighter._spriteCastMove  = "fbShot"; fighter._spriteCastTimer = 18
  fighter.attackCooldown   = getAttackDuration(20, fighter)
  fighter.vx = 0
  const face = fighter.facing || 1
  const amp  = Math.min(180, 80 + Math.round((pending?.dmg || 40) * 1.4))   // redirect scales w/ absorbed dmg
  schedulePendingSpawn(5, () => {
    spawnProjectile(fighter, "feedback_discharge", {
      damage: amp, speed: 17, vx: face * 17, hitstun: 24, knockbackX: 10, knockbackY: -3,
      w: 32, h: 20, radius: 17, color: "#22d3ee", lifetime: 120, isSpecial: true,
      spawnY: fighter.y + (fighter.h || 100) * 0.42
    }, context)
  })
  shakeCamera(context, 5, 7)
  return true
}

// Feedback — ENERGY DISCHARGE (Down Special, proactive zoner cast → traveling electric orb). The
// straightforward ranged option alongside the reactive counter (equal-treatment: ≥2 specials).
function fireFbEnergyDischarge(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!spendEnergy(fighter, 22)) return false
  fighter._spriteCastMove = "fbShot"; fighter._spriteCastTimer = 20
  fighter.attackCooldown = getAttackDuration(24, fighter)
  const face = fighter.facing || 1
  schedulePendingSpawn(7, () => {
    // Procedural electric orb (raw projectile strip split on its spark lines — reserved; flagged in map).
    spawnProjectile(fighter, "feedback_discharge", {
      damage: 90, speed: 15, vx: face * 15, hitstun: 18, knockbackX: 7, knockbackY: -1,
      w: 28, h: 18, radius: 14, color: "#22d3ee", lifetime: 130, isSpecial: true,
      spawnY: fighter.y + (fighter.h || 100) * 0.42
    }, context)
  })
  return true
}

function executeBen10Special(fighter, context) {
  const dir = fighter._specialHeldDir || null
  if (fighter.transformed === false) {   // Ben-human
    if (dir === "D") return fireBenHoverBash(fighter, context)
    return fireBenHoverboard(fighter, context)
  }
  const a = (fighter.activeAlien || "").toLowerCase()
  if (a === "diamondhead") {
    if (dir === "D") return fireDhRisingDiamonds(fighter, context)
    return fireDhShardBarrage(fighter, context)
  }
  if (a === "xlr8") {
    if (dir === "F") return fireXlr8SonicRush(fighter, context)
    return fireXlr8DashStrike(fighter, context)
  }
  if (a === "feedback") {
    if (dir === "D") return fireFbEnergyDischarge(fighter, context)   // proactive electric orb
    return fireFbEnergyAbsorb(fighter, context)                       // reactive absorb/redirect counter
  }
  return executeFallbackSpecial(fighter, context)   // art-less aliens keep the generic special
}

// ─────────────────────────────────────────────────────────────────
// BEN 10 ULTIMATES (Stage 4) — form-branched. Ben-human = Omnitrix Transformation FREEZE CINEMATIC
// (the showpiece, biggest hit); XLR8 = Sonic Blitz (committed high-damage blitz dash); Diamondhead =
// Crystal Storm (a walking field of ground eruptions). Art-less aliens → generic fallback ultimate.
// ben10 maxEnergy is 100, so costs sit well under full.
// ─────────────────────────────────────────────────────────────────
const BEN10_OMNITRIX_ULT = { cost: 90, dmg: 320, blockRatio: 0.20 }

// Guaranteed Omnitrix-burst shockwave (applied by the cinematic onImpact beat).
function applyBen10OmnitrixDamage(fighter, opp, cineCtx = {}) {
  if (!opp || opp.eliminated) return
  const blocked = !!opp.isBlocking
  let dmg = BEN10_OMNITRIX_ULT.dmg
  if (blocked) {
    dmg = Math.round(dmg * BEN10_OMNITRIX_ULT.blockRatio)
    opp.blockstun = Math.max(opp.blockstun || 0, 18)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 30)
    opp.vx = (fighter.facing || 1) * 16; opp.vy = -7
    opp.colorFlash = 12; opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
  }
  opp.health = Math.max(0, (opp.health || 0) - dmg)   // GUARANTEED, range-independent
  if (Array.isArray(cineCtx.hitEffects)) {
    cineCtx.hitEffects.push({ x: (opp.x || 0) + (opp.w || 60) / 2, y: (opp.y || 0) + (opp.h || 100) / 2,
      timer: 20, maxTimer: 20, category: blocked ? "light" : "ultimate", color: blocked ? null : "#4ade80",
      damage: dmg, lines: blocked ? 6 : 16, radius: blocked ? 14 : 44, ...(blocked ? { isBlocking: true } : {}) })
  }
}

// XLR8 — SONIC BLITZ: a committed, high-damage blitz dash (launcher). Reuses the combo pose.
function fireXlr8SonicBlitz(fighter, context) {
  if (!spendEnergy(fighter, 60)) return false
  // Raw 280 → ~168 effective through the global melee-damage scale (~0.60), so it reads as a real
  // ultimate rather than a scaled-down normal (Sonic Blitz goes through the combat pipeline, unlike
  // Ben's direct-damage cinematic burst).
  const md = { damage: 280, startup: 6, active: 8, recovery: 22, hitstun: 28, blockstun: 16, knockbackX: 10, knockbackY: -14, rangeX: 150, rangeY: 60, isSpecial: true, isUltimate: true, launcher: true }
  const attack = createAttackFromMove(fighter, "xlUlt", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isUltimate = true; attack.launcher = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  const dir = fighter.facing || 1
  fighter.vx = dir * 26
  for (const t of [2, 4, 6, 8, 10, 12]) schedulePendingSpawn(t, () => { if (fighter.currentAttack?.name === "xlUlt") fighter.vx = dir * 26 })
  shakeCamera(context, 10, 12)
  focusCameraOnAction(context, fighter, getTargetResolver(context)(fighter), 0.95, 12)
  return true
}

// Diamondhead — CRYSTAL STORM: a walking field of ground-eruption hitboxes marching forward.
function fireDhCrystalStorm(fighter, context) {
  if (!spendEnergy(fighter, 70)) return false
  fighter._spriteCastMove = "dhUlt"; fighter._spriteCastTimer = 46
  fighter.attackCooldown = getAttackDuration(50, fighter)
  const face = fighter.facing || 1
  const baseX = fighter.x + (fighter.w || 60) / 2
  // 4 eruptions marching outward from Ben, staggered — a crystal field (escalated Rising Diamonds).
  for (let i = 0; i < 4; i++) {
    schedulePendingSpawn(8 + i * 7, () => {
      spawnProjectile(fighter, "ben10_diamond_eruption", {
        damage: 60, speed: 0, vx: 0, lifetime: 24, hitstun: 22, knockbackX: 4, knockbackY: -13,
        w: 54, h: 88, radius: 30, color: "#5eead4", isSpecial: true, isUltimate: true, launcher: true,
        spawnX: baseX + face * (40 + i * 62) - 27,
        spawnY: fighter.y + (fighter.h || 100) * 0.12
      }, context)
      if (i === 0) shakeCamera(context, 6, 8)
    })
  }
  return true
}

// Feedback — OVERLOAD: the ultimate. Overloading with stored/absorbed energy, Feedback unleashes a
// STREAM of three large electric orbs (the fbUlt 5-frame beam cast) marching forward. Per-form pipeline
// ultimate consistent with its sibling forms (XLR8 Sonic Blitz / Diamondhead Crystal Storm) — NOT the
// freeze-cinematic (that's Ben-human's transform showpiece). Also the "amplified discharge" reading of
// the absorb/redirect special (Batman ultimate-fallback precedent), here backed by distinct 5-frame art.
function fireFbOverload(fighter, context) {
  if (!spendEnergy(fighter, 70)) return false
  fighter._spriteCastMove = "fbUlt"; fighter._spriteCastTimer = 40
  fighter.attackCooldown = getAttackDuration(44, fighter)
  fighter.vx = 0
  const face = fighter.facing || 1
  // Three staggered overload orbs (raw 110 → ~66 effective each through the global melee scale). Not all
  // are guaranteed at every spacing → totals sit in ultimate range without a single point-blank one-shot.
  for (let i = 0; i < 3; i++) {
    schedulePendingSpawn(6 + i * 6, () => {
      spawnProjectile(fighter, "feedback_overload", {
        damage: 110, speed: 18, vx: face * 18, hitstun: 26, knockbackX: 11, knockbackY: -4,
        w: 40, h: 30, radius: 22, color: "#22d3ee", lifetime: 130, isSpecial: true, isUltimate: true,
        spawnY: fighter.y + (fighter.h || 100) * 0.42
      }, context)
      if (i === 0) { shakeCamera(context, 8, 10); focusCameraOnAction(context, fighter, getTargetResolver(context)(fighter), 0.95, 12) }
    })
  }
  return true
}

function executeBen10Ultimate(fighter, context) {
  if (fighter.transformed === false) {   // Ben-human → Omnitrix transformation freeze cinematic
    if (isBen10OmnitrixCinematicActive()) return false
    if (!spendEnergy(fighter, BEN10_OMNITRIX_ULT.cost)) return false
    const opp = getTargetResolver(context)(fighter)
    fighter.vx = 0
    activateBen10OmnitrixCinematic(fighter, opp, (cineCtx) => applyBen10OmnitrixDamage(fighter, opp, cineCtx))
    return true
  }
  const a = (fighter.activeAlien || "").toLowerCase()
  if (a === "xlr8") return fireXlr8SonicBlitz(fighter, context)
  if (a === "diamondhead") return fireDhCrystalStorm(fighter, context)
  if (a === "feedback") return fireFbOverload(fighter, context)
  return executeFallbackUltimate(fighter, context)   // art-less aliens keep the generic ultimate
}

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
    case "minato":  return executeMinatoSpecial(fighter, context)   // Stage 3: shadow-clone routes (Flying Raijin / Rasengan / Reaper land in S4-5)
    case "gojo":    { const ok = executeGojoSpecial(fighter, context); if (ok) maybeFireGojoCastVoice(fighter); return ok }
    case "megumi":  return executeMegumiSpecial(fighter, context)
    case "sukuna":  return executeSukunaSpecial(fighter, context)
    case "sasuke":  return executeSasukeSpecial(fighter, context)   // Susanoo grab/arrow (only while in Susanoo)
    case "itachi":  return executeItachiSpecial(fighter, context)   // Fireball (neutral); Amaterasu/Genjutsu gated on Mangekyou (Stage 4)
    case "netero":  return executeNeteroSpecial(fighter, context)   // Barrage Punches (melee flurry; command chain is Down+Heavy, separate)
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
    case "samurai_red_ranger": return executeSamuraiRangerSpecial(fighter, context)   // Flame Slash — MEGA-MODE-EXCLUSIVE (no-op in base form)
    case "gold_samurai_ranger": return executeGoldSamuraiSpecial(fighter, context)    // Light Slash — light energy slash-wave projectile (both tiers, tier-scaling)
    case "green_samurai_ranger": return executeGreenSamuraiSpecial(fighter, context)  // Forest Spear — long-reach thrust + leaf-blast wave projectile (both tiers, tier-scaling)
    case "saiki":   return executeSaikiSpecial(fighter, context)   // Lightning — two layered bolts fired as one thick beam
    case "killua":  return executeKilluaSpecial(fighter, context)   // Yo-Yo throw→travel→retract boomerang
    case "flash":   { const ok = executeFlashSpecial(fighter, context); if (ok) maybeFireFlashSkinCastVoice(fighter); return ok }   // Spin Attack (neutral) / Tornado (forward); + Reverse-skin cast bark
    case "batman":  return executeBatmanSpecial(fighter, context)   // Batarang (neutral projectile) / Cape Dash (fwd mobility lunge) / Smoke Pellet (down teleport-behind)
    case "superman": return executeSupermanSpecial(fighter, context)   // Heat Vision (neutral/down eye-beam projectile) / Super Flying Punch (fwd charged dash-strike)
    case "gon":     return executeGonSpecial(fighter, context)   // Jajanken: Rock (neutral, charged) / Scissors (fwd, multi-hit) / Paper (down, push)
    case "zenitsu": return executeZenitsuSpecial(fighter, context)   // Thunder Breathing 1st Form dash-strike (neutral); Double Attack (Fwd/Down) = Stage 4
    case "rengoku": return executeRengokuSpecial(fighter, context)   // COUNTER — reactive parry stance (Charged Flame Strike is on the CHARGE button, not here)
    case "shinobu": return executeShinobuSpecial(fighter, context)   // Poison Thrust (neutral/Fwd) / Butterfly Flit backflip evade (Back)
    case "maki":    return executeMakiSpecial(fighter, context)   // Kunai Throw (neutral/Fwd projectile) / Nunchaku Flurry (Down); Power Charge is on CHARGE
    case "miwa":    return executeMiwaSpecial(fighter, context)   // grounded → Iai Dash (gap-closer); airborne → Rapid Slash Vortex (+ FX overlay); CHARGE (hold P) = cursed-energy charge stance
    case "hisoka":  return executeHisokaSpecial(fighter, context)   // Bungee Gum (neutral, extended-reach whip); Texture Surprise cards land in Stage 4
    case "tobirama": return executeTobiramaSpecial(fighter, context)   // Water Dragon/Slash/Rising/Wall/Darkness (dir-branched); Water Flicker escape is a hitstun reversal
    case "omniman": return executeOmniManSpecial(fighter, context)   // Stage 3: "Viltrumite Smash" — SHARED-pool special (full dir-branched set = Stage 4)
    case "chrollo": return executeChrolloSpecial(fighter, context)   // Nen Bolt (neutral/fwd projectile) / Blade Lunge (down knife-thrust)
    case "ghostface": return executeGhostfaceSpecial(fighter, context)   // Backstage Pass (spec §4.2): swap(Grab/Charge) / fakeout(attack) / getaway(Back) / side-switch(neutral) + knife specials Gutting Lunge(Fwd)/Low Gut(Down)
    case "ben10":   return executeBen10Special(fighter, context)   // form-branched: XLR8 Dash/Sonic Rush · Diamondhead Shard/Rising Diamonds · Ben Hoverboard; art-less aliens → fallback
    case "albedo":  return executeBen10Special(fighter, context)   // Albedo shares Ben's alien specials
    default:        return executeFallbackSpecial(fighter, context)
  }
}

export function triggerUltimate(fighter, context = {}) {
  if (!fighter) return false
  // NOTE: during an Edo Tensei window the fighter IS the vessel (rosterKey swapped) → this dispatches to
  // the VESSEL's own ultimate (the nested ultimate-within-an-ultimate). We intentionally do NOT block it.
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
      case "minato":  cast = executeMinatoUltimate(fighter, context);  break
      case "gojo":    cast = executeGojoUltimate(fighter, context);    if (cast) maybeFireGojoCastVoice(fighter);    break
      case "megumi":  cast = executeMegumiUltimate(fighter, context);  break
      case "sukuna":  cast = executeSukunaUltimate(fighter, context);  break
      case "sasuke":  cast = executeSasukeUltimate(fighter, context);  break   // two-stage Susanoo
      case "itachi":  cast = executeItachiUltimate(fighter, context);  break   // single-tier creature Susanoo
      case "netero":  cast = executeNeteroUltimate(fighter, context);  break   // 100-Type Guanyin Bodhisattva giant form
      case "omololu": cast = executeOmoluUltimate(fighter, context);   break
      case "toji":    cast = executeToji_Ultimate(fighter, context);   break
      case "rick":    cast = executeRickUltimate(fighter, context);    break
      // Goku Black — Stage 3b: Sword Slash (Rose-only sure-hit with a real interruptible windup).
      case "goku_black": cast = executeGokuBlackUltimate(fighter, context); break
      case "vegeta":  cast = executeVegetaUltimate(fighter, context);  break   // Overcharged Final Flash freeze cinematic
      case "beerus":  cast = executeBeerusUltimate(fighter, context);  break   // Ki Ball 3-stage freeze cinematic
      case "batman":  cast = executeBatmanUltimate(fighter, context);  break   // The Dark Knight: batarang-barrage freeze cinematic
      case "omega_ranger": cast = executeOmegaRangerUltimate(fighter, context); break   // Omega Saber: Final Strike
      case "samurai_red_ranger": cast = executeSamuraiRangerUltimate(fighter, context); break   // Fire Smasher: Blazing Strike — TIER-SCALING freeze cinematic (base vs Mega art+damage)
      case "gold_samurai_ranger": cast = executeGoldSamuraiUltimate(fighter, context); break     // Barracuda Blade: Light Finale — SAME freeze cinematic, light palette, tier-scaling (base 340 / Mega 460)
      case "green_samurai_ranger": cast = executeGreenSamuraiUltimate(fighter, context); break    // Forest Spear: Verdant Storm — SAME freeze cinematic, leaf-green palette, tier-scaling (base 340 / Mega 460)
      case "saiki":   cast = executeSaikiUltimate(fighter, context);   break   // Giant Bomb Throw: delayed screen-filling explosion
      case "killua":  cast = executeKilluaUltimate(fighter, context);  break   // Godspeed: sustained speed/damage buff + electric afterimage overlay (buff-mode, not a form swap)
      case "gon":     cast = executeGonUltimate(fighter, context);     break   // Adult Form: buff + movement-lockout + close-range SUDDEN-DEATH (hit=instant win / miss=instant loss)
      case "zenitsu": cast = executeZenitsuUltimate(fighter, context); break   // Godspeed: dash-THROUGH slice — same-level, UNBLOCKABLE, 8s COOLDOWN (not energy)
      case "rengoku": cast = executeRengokuUltimate(fighter, context); break   // Flame Explosion: freeze-cinematic AOE detonation — 8s COOLDOWN (not energy)
      case "shinobu": cast = executeShinobuUltimate(fighter, context); break   // Butterfly Dance: freeze-cinematic spinning-dash finisher + poison — 8s COOLDOWN (not energy)
      case "maki": cast = executeMakiShibuyaUltimate(fighter, context); break   // Cursed Tool Awakening: HP-threshold (≤25%) player-triggered Shibuya-Arc transform — freeze cinematic + moveset swap (no meter; one-way for the round)
      case "hisoka":  cast = executeHisokaUltimate(fighter, context);  break   // Bloodlust Overdrive: buff + _skinAnim golden power-up body-swap + freeze cinematic (form-swap, extended whip)
      case "flash":   cast = executeFlashUltimate(fighter, context);   if (cast) maybeFireFlashSkinCastVoice(fighter);   break   // Flash Time (buff-mode) + Reverse-skin cast bark
      case "tobirama": cast = executeTobiramaUltimate(fighter, context); break   // Edo Tensei: in-place swap into the pre-chosen vessel's full kit for a timed window
      case "chrollo": cast = executeChrolloUltimate(fighter, context); break   // Skill Hunter: live transform into a full copy of the OPPONENT for 30s (gated on 3 distinct moves landed)
      case "ghostface": cast = executeGhostfaceUltimate(fighter, context); break   // The Final Act: freeze-cinematic stab flurry — guaranteed damage + lethal bleed finisher
      case "miwa": cast = executeMiwaUltimate(fighter, context); break   // Blade of the Neophyte: battojutsu quick-draw freeze-cinematic — single guaranteed slash

      case "omniman": cast = executeOmniManUltimate(fighter, context); break   // Viltrumite Onslaught: flying body-slam freeze cinematic (largest sheet)
      case "superman": cast = executeSupermanUltimate(fighter, context); break   // Solar Overload: green energy-surge → particle-dissolve detonation freeze cinematic
      case "ben10":   cast = executeBen10Ultimate(fighter, context);   break   // form-branched: Ben Omnitrix-transform cinematic · XLR8 Sonic Blitz · Diamondhead Crystal Storm
      case "albedo":  cast = executeBen10Ultimate(fighter, context);   break   // Albedo shares the alien ultimates (Ultimatrix)
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
  updateItachiSusanoo(fighter)   // Itachi single-tier Susanoo: tick its own timer + auto-revert
  updateNeteroGuanyin(fighter)   // Netero Guanyin Bodhisattva giant: tick its own timer + auto-revert

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
// `field` (default "energy") lets a sustained state drain a DEDICATED resource instead of the energy bar,
// should one ever be needed; every current caller (SSJ/Blue, Rose, Godspeed, Flash Time, Edo Tensei)
// drains "energy" so managing that bar manages the state's duration.
export function tickSustainedFormDrain(fighter, { active, drainPerFrame, revert, field = "energy" }) {
  if (!fighter || !active(fighter)) return
  if ((fighter[field] || 0) >= drainPerFrame) {
    fighter[field] = Math.max(0, fighter[field] - drainPerFrame)
  } else {
    fighter[field] = 0
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

// ─────────────────────────────────────────────────────────────────────────
// GOKU BLACK — transformation ladder: base → Rose (Rose is the single sustained transform tier).
// (The base→SSG→Rose→Blue recolor pilot was removed 2026-08-01 — shelved, per the standing decision.)
export function isGokuBlack(fighter) { return (fighter?.rosterKey || "").toLowerCase() === "goku_black" }

// A `currentFormData` object for a Goku Black tier. updateTransformationState re-applies
// currentFormData's multipliers to the fighter EVERY frame; Goku Black is created with the base form
// (all-1 multipliers), so setting the raw fighter.*Multiplier fields alone is clobbered back to 1 on
// the next frame. Pointing currentFormData at the tier's multipliers (the Vegeta pattern) makes the
// buff persist. attackMultiplier == damageMultiplier so combat's MAX(dmg, atk) is unaffected.
function gbFormData(mult) {
  return { damageMultiplier: mult.dmg, attackMultiplier: mult.dmg, speedMultiplier: mult.spd, defenseMultiplier: mult.def }
}
// Restore the base form (all-1 multipliers) so the per-frame re-apply stops buffing after a revert.
function gbBaseFormData(fighter) { return fighter.transformations?.base || { damageMultiplier: 1, attackMultiplier: 1, speedMultiplier: 1, defenseMultiplier: 1 } }

// Enter SSJ Rose (base → Rose). Runs as a FROZEN CINEMATIC (ssjRoseCinematic.js, mirrors Kurama/Sasuke):
// combat freezes, the camera isolates Goku Black, the base→Rose (red→pink) morph plays via _skinAnim's
// `transform` (black_goku_transformation_to_ssj_rose, wired as the base `transform` action), and the
// form-swap lands at the RESOLVE beat via onResolve — NOT immediately.
export function enterSSJRose(fighter, context = {}) {
  if (!isGokuBlack(fighter) || fighter._ssjRoseActive) return false
  if (isSSJRoseCinematicActive()) return false   // already mid-transform
  if ((fighter.attackCooldown || 0) > 0 || (fighter.hitstun || 0) > 0 || (fighter.blockstun || 0) > 0) return false
  if ((fighter.energy || 0) < SSJ_ROSE_THRESHOLD) return false   // ONLY at/near max — no up-front spend
  const opp = getTargetResolver(context)(fighter)
  activateSSJRoseCinematic(fighter, opp, () => {
    // FORM-SWAP — applied at the cinematic's RESOLVE beat (Sasuke Lv2 pattern).
    fighter._ssjRoseActive    = true
    fighter._skinAnim         = retagFormAnim(SSJ_ROSE_ANIM, fighter._recolorTag)   // form-swap (+alt recolor if any)
    fighter.currentForm       = "ssjRose"           // HUD/state (base → ssjRose)
    fighter.damageMultiplier  = SSJ_ROSE_MULT.dmg
    fighter.attackMultiplier  = SSJ_ROSE_MULT.dmg
    fighter.speedMultiplier   = SSJ_ROSE_MULT.spd
    fighter.defenseMultiplier = SSJ_ROSE_MULT.def
    fighter.currentFormData   = gbFormData(SSJ_ROSE_MULT)   // persist the buff (Vegeta gotcha: currentFormData is re-applied every frame)
    fighter.teleportFlash     = 14
    fighter.attackCooldown    = 12                  // brief settle as gameplay resumes
  })
  return true
}

// Revert to base form: clear the form flag + art swap + stat multipliers. Called by the drain
// auto-revert, a manual re-tap, and round/KO resets.
export function revertSSJRose(fighter) {
  if (!fighter || !fighter._ssjRoseActive) return
  fighter._ssjRoseActive    = false
  fighter._skinAnim         = fighter._baseSkinAnim || null
  fighter.currentForm       = "base"
  fighter.damageMultiplier  = 1
  fighter.attackMultiplier  = 1
  fighter.speedMultiplier   = 1
  fighter.defenseMultiplier = 1
  fighter.currentFormData   = gbBaseFormData(fighter)   // stop the per-frame buff re-apply
  fighter.teleportFlash     = Math.max(fighter.teleportFlash || 0, 8)
}

// P-tap toggle helper (kept for API parity; game.js drives the ladder directly). Enters Rose if base +
// at threshold; drops to base if already Rose.
export function toggleSSJRose(fighter, context = {}) {
  if (!isGokuBlack(fighter)) return false
  if (fighter._ssjRoseActive) { revertSSJRose(fighter); return true }
  return enterSSJRose(fighter, context)
}

// Per-frame hook (updateFighterState): continuous drain + instant auto-revert at 0 while in Rose.
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
// (buff, not form-swap). The activation REVEAL is the frozen eye-transformation cinematic
// (mangekyouCinematic.js), triggered from game.handleChargeRelease right after this returns true.
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
  fighter.attackCooldown    = 10              // brief settle as the eyes ignite
  sound.playSfxFile?.(pickItachiVoice("mangekyou"), null)   // "Your eyes see nothing" — Sharingan ignites
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
        damage: Math.round(120 * (fighter.damageMultiplier || 1)), speed: 14, lifetime: 130,   // scales across base/Rose
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
        damage: Math.round(150 * (fighter.damageMultiplier || 1)), speed: 9, lifetime: 150,   // scales across base/Rose
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
