/**
 * COMBAT ENGINE — merged clean version
 * Features:
 * - hitstop scaling
 * - parry
 * - clash
 * - grab / throw
 * - super armor flashes
 * - chip damage
 * - wall bounce flag
 * - damage number emission
 * - projectile hit resolution
 */

import { physics } from "./physics.js"
import { sound, SFX } from "./sound.js"
import { pickRickVoice } from "./rickVoice.js"
import { pickKilluaVoice } from "./killuaVoice.js"
import { pickGonVoice } from "./gonVoice.js"
import { pickHisokaVoice } from "./hisokaVoice.js"
import { pickMinatoVoice } from "./minatoVoice.js"
import { pickTobiramaVoice } from "./tobiramaVoice.js"
import { pickFlashVoice } from "./flashVoice.js"
import { pickBatmanVoice } from "./batmanVoice.js"
import { pickOmniManVoice } from "./omnimanVoice.js"
import { pickItachiVoice } from "./itachiVoice.js"
import { pickSukunaVoice } from "./sukunaVoice.js"
import { pickSaikiVoice } from "./saikiVoice.js"
import { pickSkinVoice } from "./gojoVoice.js"   // per-skin voice override (Gojo "Limitless" young pack)

// ========================
// HITSTOP TABLE — SINGLE SHARED TUNABLE SOURCE
// ========================
// Hit-stop (a.k.a. hit-pause / freeze) is the brief impact-freeze applied to BOTH
// fighters the instant a hit connects, before hitstun/knockback resolve — it's what
// gives a blow its "weight". This table is the ONE place hit-stop is tuned for the
// whole roster: every attack (melee AND projectile) routes its freeze through
// getHitstopFrames()/getProjectileHitstopFrames() → applyHitstop() below, so there is
// no per-character hit-stop code anywhere. Values scale with hit weight (light < heavy
// < special < ultimate). Exported so tools/tests can read the canonical numbers.
// TUNE HERE — changing a number here changes that tier's feel game-wide.
export const HITSTOP = {
  light: 4,
  air: 4,
  grab: 6,
  heavy: 8,
  launcher: 8,
  spike: 8,
  special: 12,
  ultimate: 20,
  projectile: 8,   // default freeze for a projectile connect (zoner-friendly: lighter than melee `special`)
  parry: 14,
  clash: 14,
  default: 4
}

// Single shared entry point for applying hit-stop. BOTH the melee path
// (resolveAttackHit) and the projectile path (resolveProjectileHitsMulti) call this,
// so freezing is one system, not two divergent copies. Uses max() so a heavier
// overlapping freeze is never shortened by a lighter one landing the same frame.
export function applyHitstop(attacker, defender, frames) {
  const f = frames | 0
  if (f <= 0) return
  if (attacker) attacker.hitstop = Math.max(attacker.hitstop || 0, f)
  if (defender) defender.hitstop = Math.max(defender.hitstop || 0, f)
}

// Projectile hit-stop frames. Weight-scaled like melee, with two escape hatches so
// rapid multi-hit / DOT projectiles don't stutter-freeze: a per-projectile numeric
// `hitstop` override, and a `noHitstop` opt-out. visualOnly projectiles never freeze.
export function getProjectileHitstopFrames(proj) {
  if (!proj || proj.visualOnly || proj.noHitstop) return 0
  if (typeof proj.hitstop === "number") return proj.hitstop
  if (proj.isUltimate) return HITSTOP.ultimate
  if (proj.isSpecial)  return HITSTOP.special
  return HITSTOP.projectile
}

// ========================
// HITSTUN / COMBO TUNING
// ========================
// Hitstun is the action-lock the DEFENDER suffers after being hit, letting the
// attacker link follow-ups into a combo. Per-move base durations live in each
// fighter's basic_attacks/specials data (heavier moves = longer stun, so it's
// already tied to attack strength). HITSTUN_SCALE is a single global knob to
// tune combo-ability across the whole game without editing every move.
// (Combo damage falloff is handled by getComboScale; blockstun + the
// charging-can't-defend rule are handled in resolveAttackHit / game.js.)
const HITSTUN_SCALE = 1.15   // MK12-style flow: links connect without frame-perfect timing (falloff via getComboScale keeps it safe)

// GLOBAL PACING (Task 1): single lever to slow matches down. Matches were ending
// in 2-3 hits; every point of dealt damage (melee, projectile, throw) is scaled
// by this one constant so RELATIVE balance between characters is untouched —
// it's mathematically identical to raising everyone's health by 1/scale, but in
// one place instead of 45 maxHealth edits. 0.60 ≈ +66% time-to-kill. Tune here.
export const GLOBAL_DAMAGE_SCALE = 0.60

// ========================
// HELPERS
// ========================

function _catFromName(n) {
  n = (n || "").toLowerCase()
  if (n === "light" || n === "air") return "light"
  if (n === "heavy") return "heavy"
  if (n === "up" || n.includes("launch")) return "launcher"
  if (n === "down_air" || n.includes("spike")) return "spike"
  if (n === "grab") return "grab"
  return "light"
}

function _dur(base, fighter) {
  return Math.max(8, Math.floor(base / (fighter?.attackSpeedMultiplier || 1)))
}

function _getMD(fighter, key) {
  const b = fighter?.basic_attacks || {}
  // Accepts both the canonical schema (characters.js: light/heavy/upAttack/…)
  // and the legacy `*_attack` naming used by data-driven roster entries, so no
  // data source can silently whiff an attack by using the wrong key spelling.
  switch (key) {
    case "light": return b.light || b.light_attack || null
    case "heavy": return b.heavy || b.heavy_attack || null
    case "up": return b.upAttack || b.up || b.up_attack || null
    case "air": return b.airAttack || b.air || b.air_attack || null
    case "down_air": return b.downAir || b.down_air || b.downAir_attack || null
    case "grab": return b.grab || { damage: 30, hitstun: 18, throwForceX: 5, throwForceY: -4 }
    default: return b[key] || fighter?.specials?.[key] || { damage: 40, hitstun: 20 }
  }
}

function _hitSound(atk, blocking) {
  if (blocking) return SFX?.BLOCK || "block"
  if (!atk) return SFX?.HIT_LIGHT || "hit_light"
  if (atk.isUltimate) return SFX?.HIT_ULTIMATE || "hit_ultimate"
  if (atk.isSpecial) return SFX?.HIT_SPECIAL || "hit_special"

  const c = atk.category || _catFromName(atk.name)
  if (c === "heavy" || c === "launcher" || c === "spike") {
    return SFX?.HIT_HEAVY || "hit_heavy"
  }
  return SFX?.HIT_LIGHT || "hit_light"
}

// ========================
// STATE INIT
// ========================

export function ensureCombatState(fighter) {
  if (!fighter) return

  const D = {
    attacking: false,
    currentMove: null,
    currentMoveData: null,
    currentAttack: null,
    moveTimer: 0,
    movePhase: "idle",
    hasHitThisMove: false,
    attackCooldown: 0,
    hitstun: 0,
    blockstun: 0,
    hitstop: 0,
    isGrabbed: false,
    invulnTimer: 0,
    comboCounter: 0,
    comboTimer: 0,
    airHits: 0,
    maxAirHits: 3,
    colorFlash: 0,
    attackMultiplier: 1,
    damageMultiplier: 1,
    defenseMultiplier: 1,
    energy: 0,
    maxEnergy: 100,
    wasInStartup: false,
    grabTimer: 0,
    grabInputBuffer: 0,
    knockdownState: false,
    knockdownTimer: 0,
    techRoll: null,
    wallBounce: false,
    parryFlash: 0,
    armorFlash: 0,
    clashFlash: 0,
    _parryInputBuffer: 0
  }

  for (const k in D) {
    if (fighter[k] == null) fighter[k] = D[k]
  }
}

// ========================
// COMBO SCALE
// ========================

// COMBO DECAY (combo-flow Stage 3) — successive hits in one uninterrupted combo do progressively less
// DAMAGE and slightly less HITSTUN, so long strings feel earned (neither infinite nor weak). Applied ON
// TOP OF GLOBAL_DAMAGE_SCALE, for melee AND projectiles alike. Per-combo-STRING: the scale resets the
// moment the combo drops — the opponent blocks or escapes (comboCounter → 0 in resolveAttackHit /
// resolveProjectileHitsMulti) or enough time passes (comboTimer → 0 in updateCombat). Both curves index
// by (comboCounter-1) and FLOOR at their last entry so late hits never round to near-zero. TUNE HERE —
// one place, whole roster. The damage curve is the long-standing tuned set (unchanged); the hitstun curve
// is deliberately gentle and stays well above 0 so cancel-on-hit rekkas and juggles still link.
export const COMBO_DAMAGE_CURVE  = [1, 0.92, 0.84, 0.76, 0.70, 0.65]
export const COMBO_HITSTUN_CURVE = [1, 1, 0.95, 0.90, 0.87, 0.85]
function _comboScale(fighter, curve) {
  if (!fighter || (fighter.comboCounter || 0) <= 1) return 1
  return curve[Math.min(fighter.comboCounter - 1, curve.length - 1)]
}
export function getComboScale(fighter)        { return _comboScale(fighter, COMBO_DAMAGE_CURVE) }
export function getComboHitstunScale(fighter) { return _comboScale(fighter, COMBO_HITSTUN_CURVE) }

// ========================
// ATTACK PHASE
// ========================

export function getHitstopFrames(atk) {
  if (!atk) return HITSTOP.default
  if (atk.isUltimate) return HITSTOP.ultimate
  if (atk.isSpecial) return HITSTOP.special

  const c = atk.category || _catFromName(atk.name)
  return HITSTOP[c] ?? HITSTOP.default
}

export function getSparkCategory(atk) {
  if (!atk) return "light"
  if (atk.isUltimate) return "ultimate"
  if (atk.isSpecial) return "special"

  const c = atk.category || _catFromName(atk.name)
  if (c === "heavy" || c === "launcher" || c === "spike") return "heavy"
  return "light"
}

export function attackIsActive(attack) {
  if (!attack) return false
  const e = attack.total - attack.timer
  return e >= attack.activeStart && e <= attack.activeEnd
}

export function getAttackPhase(fighter) {
  if (!fighter?.currentAttack) return "idle"
  const a = fighter.currentAttack
  const e = a.total - a.timer
  if (e < a.activeStart) return "startup"
  if (e <= a.activeEnd) return "active"
  return "recovery"
}

// ========================
// CANCEL WINDOWS (combo-flow Stage 2)
// ========================
// The roster's command-normal (rekka) chains all share ONE cancel rule — a fresh chain-button tap
// during the current move's RECOVERY phase, gated on a clean connect — but each move's exact frame
// ranges live on its currentAttack (startup/active/recovery, set at move start). getCancelWindow is
// the single READ-ONLY, inspectable view of that timing: every character's cancel window reads through
// this one API in the same {startup, active, recovery, phase, open} shape, so windows are precisely
// frame-defined and can be tuned/inspected consistently. Purely derived — it changes no behavior.
export function getCancelWindow(fighter) {
  const a = fighter?.currentAttack
  if (!a) {
    return { move: fighter?.currentMove || null, phase: "idle", startup: 0, active: 0, recovery: 0,
             elapsed: 0, open: false, cancelInto: fighter?._rekkaNext || null, connected: !!fighter?._cmdHitLanded }
  }
  const phase = getAttackPhase(fighter)
  return {
    move:      fighter.currentMove || a.name || null,
    phase,
    startup:   a.activeStart,                 // frames 0..startup      → startup
    active:    a.activeEnd - a.activeStart,   // frames startup..active → active (hittable)
    recovery:  a.total - a.activeEnd,         // frames active..end     → recovery (the CANCEL window)
    elapsed:   a.total - a.timer,             // frames into the move so far
    open:      phase === "recovery",          // the universal rekka cancel window is the recovery phase
    cancelInto: fighter._rekkaNext || null,   // the queued next chain step, if any
    connected: !!fighter._cmdHitLanded         // did the current stage land a clean hit (gates the cancel)
  }
}

// Shared command-normal CONTINUE gate. Historically each rekka character (Killua/Netero/Vegeta/Omega/
// Saiki/Toji) inlined this identical logic; routing them all through this ONE function is what makes the
// cancel timing a genuinely shared system rather than six ad-hoc copies. The caller passes the fresh
// chain-button edge it already computes (edge) + the current phase; this owns the three shared rules:
//   1. LATCH a clean connect — a hit (opponent in hitstun), NOT a block — onto _cmdHitLanded. (Runs
//      before resolveAttackHit in updateCombat, so hasHit/hitstun reflect the previous frame's hit.)
//   2. CLOSE the window when the move fully ends (clears _rekkaNext + _cmdHitLanded).
//   3. CANCEL: on a fresh edge during recovery (and, unless requireHit=false, only if it connected),
//      tear down the current attack and RETURN the next stage key for the caller to fire. Else null.
// requireHit defaults true (whiff/block ends the string = the mid-chain interrupt); Toji's stance
// chain passes false (its blade rekka links on timing alone, unchanged from before).
export function rekkaContinue(fighter, { edge, phase, opponent, requireHit = true } = {}) {
  if (!fighter) return null
  if (fighter.attacking && fighter.currentAttack?.hasHit && (opponent?.hitstun || 0) > 0) fighter._cmdHitLanded = true
  if (!fighter.attacking) { fighter._rekkaNext = null; fighter._cmdHitLanded = false }
  if (fighter.attacking && fighter._rekkaNext && edge && phase === "recovery" && (!requireHit || fighter._cmdHitLanded)) {
    const next = fighter._rekkaNext
    fighter.attacking = false; fighter.currentAttack = null; fighter.currentMove = null
    fighter.attackCooldown = 0   // clear the just-set cooldown so the chain fires now
    return next
  }
  return null
}

// ========================
// HITBOX / HURTBOX
// ========================

export function getAttackHitbox(fighter) {
  const a = fighter?.currentAttack
  if (!fighter || !a) return null

  let w = a.rangeX || 50
  let h = a.rangeY || 40
  let x = fighter.facing === 1 ? fighter.x + fighter.w : fighter.x - w
  let y = fighter.y + 20

  // AOE moves (e.g. Sasuke's Chidori Koiten lightning discharge): a STATIONARY box
  // CENTERED on the caster instead of the normal in-front reach, so the burst catches
  // anyone within range on either side during its active window. Generic — any attack
  // that sets `aoe:true` uses it; every existing (non-aoe) move is unchanged.
  if (a.aoe) {
    return {
      x: fighter.x + (fighter.w || 0) / 2 - w / 2,
      y: fighter.y + (fighter.h || 100) / 2 - h / 2,
      w, h
    }
  }

  if (a.name === "up") {
    y = fighter.y - 30
  } else if (a.name === "down_air") {
    y = fighter.y + 30
  } else if (a.name === "air") {
    // Air normals use a forgiving bubble: a behind-margin + the attacker's body +
    // full forward reach, and extended ABOVE — so air combos connect whether the
    // juggled enemy is in front of or stacked above the attacker.
    const behind = 16
    const reach  = a.rangeX || 60
    w = behind + fighter.w + reach
    h = (a.rangeY || 40) + 45
    x = fighter.facing === 1 ? fighter.x - behind : fighter.x + fighter.w + behind - w
    y = fighter.y - 25
  }

  return { x, y, w, h }
}

// GIANT hurtbox (Susanoo): the physics box (fighter.x/y/w/h) stays small & ground-anchored
// for correct movement/collision, so a hurtbox built from it would sit at the giant's FEET —
// hits on the towering upper body wouldn't register. When _canvasHeightFrac is set, sprite.js
// has recorded the giant's RENDERED box (_lastDrawY top + _lastDrawW/_lastDrawH from the same
// canvasHeight×frac/refH sizing math). Build a hurtbox spanning the visible body, VERTICALLY
// CENTERED on the giant (not the feet), and roughly torso-wide (trims the wide cell + arm reach).
const GIANT_BODY_W_FRAC = 0.5    // hittable core width as a fraction of the rendered cell width
const GIANT_BODY_H_FRAC = 0.92   // trims the small top/bottom transparent cell padding
function _giantHurtbox(fighter) {
  const top = fighter._lastDrawY, gh = fighter._lastDrawH, gw = fighter._lastDrawW
  if (top == null || !gh || !gw) return null   // not rendered yet (e.g. activation frame) → caller falls back
  const centerX = fighter.x + (fighter.w || 0) / 2   // giant is drawn centered over the physics box
  const centerY = top + gh / 2                        // vertical center of the visible giant
  const w = gw * GIANT_BODY_W_FRAC
  const h = gh * GIANT_BODY_H_FRAC
  return { x: centerX - w / 2, y: centerY - h / 2, w: Math.max(1, w), h: Math.max(1, h) }
}

export function getHurtbox(fighter) {
  if (!fighter) return null
  if (fighter._canvasHeightFrac) {
    const giant = _giantHurtbox(fighter)
    if (giant) return giant   // else fall through to the normal box for the pre-first-draw frame
  }
  return {
    x: fighter.x + 6,
    y: fighter.y + 6,
    w: Math.max(1, fighter.w - 12),
    h: Math.max(1, fighter.h - 6)
  }
}

export function rectsOverlap(a, b) {
  return !!a && !!b &&
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
}

// ========================
// SPECIAL TRAITS
// ========================

export function shouldGojoAutoDodge(defender) {
  // Auto-dodge when the active FORM grants it (Ultra Instinct / Unlimited Void)
  // OR when Gojo's player-toggled Infinity is ON. Either way it costs ki per
  // dodge; if too low to pay, the hit lands (and the passive drain will drop
  // Infinity at 0 energy — see applyGojoPassiveSystems).
  const infinityOn = (defender?.rosterKey || "").toLowerCase() === "gojo" && !!defender?.infinityActive
  if (!defender?.currentFormData?.autoDodge && !infinityOn) return false
  const c = defender.currentFormData?.autoDodgeKiCost || 5
  if ((defender.energy || 0) < c) return false
  defender.energy -= c
  defender.teleportFlash = 8
  return true
}

// SASUKE — ABSOLUTE DEFENSE. Charge-button TOGGLE (see game.handleChargeRelease), mirrors the
// shape of shouldGojoAutoDodge above but is STRONGER: while toggled on it is an UNCONDITIONAL
// full negate — every incoming hit is nullified outright (no per-hit dodge-roll that can fail),
// as long as the energy check passes. COST MODEL is per-block, NOT a continuous drain: energy is
// deducted only on a hit it actually negates (same per-event shape as Gojo's autoDodgeKiCost).
// Priced NOTICEABLY HIGHER than Gojo's per-dodge cost — Gojo's Infinity autoDodgeKiCost falls
// back to 5 (combat.shouldGojoAutoDodge); Absolute Defense costs 12 per block.
// ADDITIVE to Sasuke's normal Down/S block — both coexist (this is checked before the block/damage
// path, so it negates whether or not he is also holding block; when it's off, normal block applies).
// DEFERRED / OUT OF SCOPE (do NOT fix this pass): holding the charge button while also feeding a
// motion-gated special can create input conflicts. Intentionally left unhandled — noted only.
export const SASUKE_ABSOLUTE_DEFENSE_COST = 12   // per negated hit (Gojo's per-dodge autoDodgeKiCost = 5)
// GOKU BLACK — "Ki Slash" heavy: the one normal that costs energy. 10 = 5% of his 200 pool → still
// spammable as a poke, but well under his cheapest special (Kamehameha 30) so it stays a normal.
export const KI_SLASH_COST = 10
// GOKU BLACK — knockdown reaction length on a strong grounded hit: ~28f FALL (black_goku_hit) then
// ~24f RISE (black_goku_get_up) = 52. Kept in sync with sprite.js GETUP_WINDOW (24).
export const GOKU_BLACK_KNOCKDOWN = 52
// Neutral wake-up i-frames (no tech input) — guarantees an escape window off a hard knockdown so a
// mashed meaty can't loop the fighter back down. A touch shorter than the 18f tech-roll reward.
export const WAKEUP_INVULN = 14
export function shouldSasukeAbsoluteDefenseNegate(defender) {
  if ((defender?.rosterKey || "").toLowerCase() !== "sasuke") return false
  if (!defender?.absoluteDefenseActive) return false
  if ((defender.energy || 0) < SASUKE_ABSOLUTE_DEFENSE_COST) return false
  defender.energy -= SASUKE_ABSOLUTE_DEFENSE_COST   // per-block cost, deducted ONLY on an actual negate
  defender.teleportFlash = Math.max(defender.teleportFlash || 0, 8)
  return true
}

export function applyUltraEgoReaction(defender) {
  if (!defender?.currentFormData?.rageHealOnHit) return
  const c = defender.currentFormData.healCostPerHitKi || 4
  if ((defender.energy || 0) < c) return
  defender.energy -= c
  defender.health = Math.min(
    defender.maxHealth || 1000,
    defender.health + defender.currentFormData.rageHealOnHit
  )
}

// Kurama Shroud Intensify comeback (combo #23) — SAME SHAPE as applyUltraEgoReaction's
// rage-heal, reskinned: at deep shroud stages Naruto draws Kurama's chakra to knit his
// wounds, healing a little WHEN HIT (deeper stage = more). Health-gated via the passive
// fighter.shroudStage (set in game.applyKuramaShroudSystem) and FREE — the shroud costs
// no ki/chakra. Guarded so a KO blow is never undone. Stages 1-2 give no heal (visual only).
export function applyKuramaShroudReaction(defender) {
  const stage = defender?.shroudStage || 0
  if (stage < 3) return                      // buff unlocks at stage 3
  if ((defender.health || 0) <= 0) return    // don't resurrect from a killing blow
  const heal = (stage - 2) * 6               // stage 3→+6, 4→+12, 5→+18 HP per hit taken
  defender.health = Math.min(defender.maxHealth || 1000, (defender.health || 0) + heal)
}

// NARUTO-ONLY escalated combo-finisher recoil. When a real combo string against Naruto is
// capped by a heavy / launcher / special hit, show his naruto_kcm_knocked_out_a burst pose
// (routed through sprite.js's "knockdown" action) for the recoil instead of the standard
// naruto_kcm_taking_damage flinch — selling "that combo really landed". PURELY VISUAL: it
// only sets a self-timer (_comboFinisherReactTimer) read by sprite.js; it does NOT touch
// knockdownState / tech / hitstun / combo counters / damage. No-op for every other character.
// Called from resolveAttackHit AFTER attacker.comboCounter has been incremented for this hit,
// so `comboCounter >= NARUTO_COMBO_FINISHER_MIN` means this is the Nth+ hit of an active string.
const NARUTO_COMBO_FINISHER_MIN    = 3    // this hit must be the 3rd+ link (a real combo, not a poke)
const NARUTO_COMBO_FINISHER_FRAMES = 26   // recoil-pose window (~5 of the 6 burst frames)
export function applyNarutoComboFinisherReaction(defender, attacker) {
  if (!defender || defender.rosterKey !== "naruto") return
  if ((attacker?.comboCounter || 0) < NARUTO_COMBO_FINISHER_MIN) return   // not (yet) a combo
  const a = attacker.currentAttack
  if (!a) return
  // "Combo-ending" class of hit: a heavy, an up-launcher, a special/ultimate, or any strong
  // blow-away (the hits that actually cap a string) — NOT the light jabs that link into it.
  const finisher = a.name === "heavy" || a.launcher || a.isSpecial || a.isUltimate ||
    Math.abs(a.pushX || 0) >= 8
  if (!finisher) return
  defender._comboFinisherReactTimer = NARUTO_COMBO_FINISHER_FRAMES
}

// ── NARUTO VOICE LINES (audio-only; no gameplay effect) ─────────────────────────
// All fire via sound.playSfxFile(<file>, null) — a fresh Audio per call so a voice line
// overlaps cleanly with the technique SFX and never cuts another off (mirrors Beerus /
// Goku Black). Cooldowns (_hitVoiceCd for reactions, _atkVoiceCd for offense) are ticked
// in game.js updateMiscTimers so a rapid string fires ONE line per window, not a spam.

// DEFENDER reaction pool — LIGHT flinch vs HEAVY/knockdown-tier, split like Goku Black's
// but WITHOUT knockdownState (that flag is goku_black-only), so the tier is read straight
// off the hit `cat`/`dmg` — same heavy test Beerus uses. Heavy picks a genuine random take
// of the two "Why?!" recordings; a light poke gets the single short flinch. One line per
// _hitVoiceCd window. Called only on an UNBLOCKED hit (see resolveAttackHit).
function applyNarutoHitVoice(defender, cat, dmg) {
  if (defender.rosterKey !== "naruto" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  const heavy = cat === "heavy" || cat === "launcher" || cat === "spike" ||
    cat === "special" || cat === "ultimate" || dmg >= 55
  const clip = heavy
    ? (Math.random() < 0.5 ? "naruto_hit_heavy_1.mp3" : "naruto_hit_heavy_2.mp3")   // "Why?!" — two takes
    : "naruto_hit_light.mp3"                                                        // short frustrated flinch
  try { sound?.playSfxFile?.(clip, null) } catch (_) {}
}

// ATTACKER offense pool — pride / signature lines when NARUTO connects. A STRONG connect
// (heavy / special / ultimate melee hit) fires the Hokage line (two takes, random); a long
// BASIC light string (5th+ link) fires the packed combo-burst hype. Shared _atkVoiceCd so
// only ONE offense line plays per window and the two never stack; STRONG takes priority.
// blocked=false suppresses it on a guarded hit. NOTE (flagged): projectile-only specials
// (Rasenshuriken, clone barrages) resolve in resolveProjectileHits, not here, so they don't
// trigger the Hokage line — they carry their own dedicated barks instead.
const NARUTO_COMBO_BURST_MIN = 5   // this hit is the 5th+ link → "a long combo string landing"
function applyNarutoOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || attacker.rosterKey !== "naruto" || (attacker._atkVoiceCd > 0)) return
  const strong    = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  if (strong) {
    sound?.playSfxFile?.(Math.random() < 0.5 ? "naruto_hokage_line_1.mp3" : "naruto_hokage_line_2.mp3", null)
  } else {
    sound?.playSfxFile?.("naruto_combo_burst.mp3", null)   // 6 packed hype lines → one combo-finisher cluster
  }
}

// LOW-HEALTH bark — "Not yet — I can still fight" — fires ONCE the first time Naruto drops
// to/below the threshold. _lowHealthVoiceDone resets naturally each round (resetRound rebuilds
// fighters). Driven from the damage path (defender == naruto), gated to a real, non-fatal drop.
const NARUTO_LOW_HEALTH_RATIO = 0.25
function applyNarutoLowHealthVoice(defender) {
  if (defender.rosterKey !== "naruto" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * NARUTO_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.("naruto_low_health.mp3", null) } catch (_) {}
  }
}

// ── SASUKE VOICE LINES (audio-only; mirrors the Naruto pattern above) ────────────
// DEFENDER reaction pool — split by hit tier off `cat`/`dmg` (no knockdownState, same test
// Naruto/Beerus use). A light flinch gets the short reaction-bark cluster ("Sakura! Get out of
// the way! Hmph!" — the incidental Sakura callout is baked flavor, not a mechanic); a heavy/
// knockdown-tier hit gets the separate heavy reaction. One line per _hitVoiceCd window; only on
// an UNBLOCKED hit (see resolveAttackHit). Japanese VO kept intentionally.
function applySasukeHitVoice(defender, cat, dmg) {
  if (defender.rosterKey !== "sasuke" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  const heavy = cat === "heavy" || cat === "launcher" || cat === "spike" ||
    cat === "special" || cat === "ultimate" || dmg >= 55
  const clip = heavy ? "sasuke_hit_reaction2.mp3"          // heavy/knockdown-tier reaction
    : "sasuke_hit_bark_cluster.mp3"                        // light flinch cluster
  try { sound?.playSfxFile?.(clip, null) } catch (_) {}
}

// ATTACKER offense pool — three-way, priority-ordered, shared _atkVoiceCd (one line per window):
//   (1) IN SUSANOO → "Burn to ashes!" hit-confirm on any Susanoo MELEE (sword/grab) landing. The
//       Susanoo arrow is a projectile (resolveProjectileHits) so it isn't covered here — same
//       projectile-excluded scope the Naruto offense pool notes above.
//   (2) LONG BASIC STRING (5th+ link) → combo-finisher pool, random of the two combo barks
//       ("Pathetic. But this is reality." / "That's why you end up taking a decisive hit").
//   (3) STRONG single connect (heavy/special/ultimate, not a light poke) → "…this is reality"
//       general attack-lands bark (sasuke_attack_connect). blocked=false suppresses on guard.
function applySasukeOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || attacker.rosterKey !== "sasuke" || (attacker._atkVoiceCd > 0)) return
  if ((attacker._susanooStage || 0) > 0) {
    attacker._atkVoiceCd = 150
    sound?.playSfxFile?.("sasuke_burn_to_ashes.mp3", null)   // Susanoo hit-confirm bark
    return
  }
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  if (longString) {
    sound?.playSfxFile?.(Math.random() < 0.5 ? "sasuke_hit_connect_taunt.mp3" : "sasuke_combo_finisher.mp3", null)
  } else {
    sound?.playSfxFile?.("sasuke_attack_connect.mp3", null)   // strong single connect
  }
}

// ── ITACHI VOICE LINES (audio-only; mirrors the Naruto/Sasuke pattern) ──────────
// Hit-taken: a calm-observation reaction pool ("Naruhodo… I see" / "Quick, aren't you"),
// one line per _hitVoiceCd window. Only on an unblocked hit (called from resolveAttackHit).
function applyItachiHitVoice(defender) {
  if (!defender || defender.rosterKey !== "itachi" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  const clip = pickItachiVoice("reaction")
  if (clip) { try { sound?.playSfxFile?.(clip, null) } catch (_) {} }
}

// Offense: a taunting connect pool ("You are weak" / "Foolish one" / "There's no escape"),
// one line per _atkVoiceCd window. STRONG connect (heavy/special/ultimate) OR a long basic string
// — a light-poke spam is left silent (mirrors Sasuke's strong/longString gate).
function applyItachiOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || attacker.rosterKey !== "itachi" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  const clip = pickItachiVoice("offense")
  if (clip) { attacker._atkVoiceCd = 150; try { sound?.playSfxFile?.(clip, null) } catch (_) {} }
}

// Low-HP: "I haven't fallen yet" — once per round on crossing the low-HP line (defender path).
const ITACHI_LOW_HEALTH_RATIO = 0.25
function applyItachiLowHealthVoice(defender) {
  if (!defender || defender.rosterKey !== "itachi" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000, hp = defender.health || 0
  if (hp > 0 && hp <= max * ITACHI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    const clip = pickItachiVoice("lowHp")
    if (clip) { try { sound?.playSfxFile?.(clip, null) } catch (_) {} }
  }
}

// ── RICK VOICE LINES (audio-only; same pattern as Naruto/Sasuke above) ───────────
// DEFENDER reaction pool — LIGHT flinch vs HEAVY/knockdown-tier, tier read straight off
// `cat`/`dmg` (same heavy test Naruto/Sasuke/Beerus use; no knockdownState). Random pick
// within the chosen pool via pickRickVoice. One line per _hitVoiceCd window (ticked in
// game.js); only on an UNBLOCKED hit (see resolveAttackHit).
function applyRickHitVoice(defender, cat, dmg) {
  if (defender.rosterKey !== "rick" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  const heavy = cat === "heavy" || cat === "launcher" || cat === "spike" ||
    cat === "special" || cat === "ultimate" || dmg >= 55
  const clip = pickRickVoice(heavy ? "hitHeavy" : "hitLight")
  try { sound?.playSfxFile?.(clip, null) } catch (_) {}
}

// ATTACKER offense pool — Rick's generic taunt/combat-flavor barks ("Suck it", "Eat it",
// "Oldest Rick trick in the book", …) on a STRONG connect (heavy/special/ultimate) OR a long
// BASIC light string (5th+ link) landing. Shared _atkVoiceCd (one line per window). blocked
// suppresses it. Same scope note as Naruto/Sasuke: projectile-only specials resolve in
// resolveProjectileHits, not here — Rick's specials carry their own cast barks instead.
function applyRickOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || attacker.rosterKey !== "rick" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickRickVoice("taunt"), null) } catch (_) {}
}

// ── KILLUA ZOLDYCK VOICE LINES (audio-only; Japanese "Nen Impact" pack) ──
// DEFENDER reaction — dismissive pool ("Too soft", "Annoying", "Damn it"…), single pool (no tier
// split; the pool is uniformly dismissive). One line per _hitVoiceCd window; unblocked hits only.
function applyKilluaHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "killua" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickKilluaVoice("hitReact"), null) } catch (_) {}
}

// ATTACKER connect — combat barks ("Bark now!", "Got it", "Blow you away"…) on a STRONG connect
// (heavy/special/ultimate) OR a long BASIC light string. Killua has NO taunt action (enrolling him in
// the universal heal-taunt would change gameplay — excluded here), so his confident TAUNT one-liners
// ride this same connect trigger at ~30% (Rick/Sukuna precedent: a connect can pull from a taunt pool).
// Shared _atkVoiceCd → one line per window; blocked suppresses it.
function applyKilluaOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "killua" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickKilluaVoice(Math.random() < 0.30 ? "taunt" : "combatBark"), null) } catch (_) {}
}

// ── GON FREECSS VOICE LINES (audio-only; Japanese "Nen Impact" pack) ──
// DEFENDER reaction — dismissive/pained pool ("No way", "This is bad", "Damn it"…). One line per
// _hitVoiceCd window; unblocked hits only. Gon has a SEPARATE low-health pool (below).
function applyGonHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "gon" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickGonVoice("hitReact"), null) } catch (_) {}
}

// ATTACKER connect — combat barks ("Got you!", "My turn", "More!"…) on a HEAVY connect OR a long BASIC
// light string. Gon's SPECIALS (Jajanken Rock/Scissors/Paper, Rush rekka, Final Blow) fire their OWN
// dedicated cast lines and set _atkVoiceCd on cast, so they're excluded here (no cast+connect double).
// Shared _atkVoiceCd → one line per window; blocked suppresses it.
function applyGonOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "gon" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickGonVoice("combatBark"), null) } catch (_) {}
}

// LOW-HEALTH bark — "Not yet, I can still fight" / "I'm going to die" — fires ONCE the first time Gon
// drops to/below the threshold (same pattern as Naruto/Itachi/Omega). Random pick from the comeback pool.
const GON_LOW_HEALTH_RATIO = 0.25
function applyGonLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "gon" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * GON_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickGonVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── HISOKA MORROW VOICE LINES (audio-only; Japanese "Nen Impact" pack) ──
// DEFENDER reaction — delighted/dismissive pool ("No no~", "Impressive~", "Irresistible~"). One line
// per _hitVoiceCd window; unblocked hits only. Hisoka has a SEPARATE low-health pool (below).
function applyHisokaHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "hisoka" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickHisokaVoice("hitReact"), null) } catch (_) {}
}

// ATTACKER connect — combat barks ("You won't get away", "You're in the way~") on a HEAVY connect OR a
// long BASIC light string, with a ~30% chance to pull a flirty taunt one-liner instead (Hisoka has no
// `taunt` action → the taunt pool rides this trigger; Killua/Rick precedent). His SPECIALS (Bungee Gum,
// Texture Surprise, Overdrive, Card Flourish rekka) fire their OWN cast lines and set _atkVoiceCd on
// cast, so they're excluded here (no cast+connect double). Shared _atkVoiceCd → one line per window.
function applyHisokaOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "hisoka" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickHisokaVoice(Math.random() < 0.30 ? "taunt" : "combatBark"), null) } catch (_) {}
}

// LOW-HEALTH bark — Hisoka is THRILLED by danger: "I can't stand it — irresistible~" / "How tantalizing~".
// Fires ONCE the first time he drops to/below the threshold (same pattern as Gon/Naruto/Itachi).
const HISOKA_LOW_HEALTH_RATIO = 0.25
function applyHisokaLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "hisoka" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * HISOKA_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickHisokaVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── MINATO NAMIKAZE VOICE LINES (audio-only; Japanese Storm-Connections pack) ──
// DEFENDER reaction — "oh nice / I won't lose / I'm serious now" on an unblocked hit. One line per
// _hitVoiceCd window. Minato has a SEPARATE low-health pool (below).
function applyMinatoHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "minato" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickMinatoVoice("hitReact"), null) } catch (_) {}
}

// ATTACKER connect — offense barks on a HEAVY connect OR a long BASIC light string. Since Minato has
// no taunt ACTION, the taunt pool rides this too (30% taunt / 70% hitConnect — Killua precedent). His
// SPECIALS fire their own cast lines and set _atkVoiceCd on cast, so they're excluded here.
function applyMinatoOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "minato" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickMinatoVoice(Math.random() < 0.30 ? "taunt" : "hitConnect"), null) } catch (_) {}
}

// LOW-HEALTH bark — "I'll fight to the end" / "no matter what happens to this body" — fires ONCE the
// first time Minato drops to/below the threshold (same pattern as Naruto/Gon/Itachi).
const MINATO_LOW_HEALTH_RATIO = 0.25
function applyMinatoLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "minato" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * MINATO_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickMinatoVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── TOBIRAMA SENJU VOICE LINES (audio-only; Japanese pack) ──
// ATTACKER connect — his overconfident taunt one-liners ("No resistance", "A shinobi of your caliber
// has fallen"…) on a STRONG connect (heavy/special/ultimate) OR a long BASIC light string. Tobirama has
// NO taunt action (enrolling him in the heal-taunt would change gameplay — excluded), so the taunt pool
// rides this connect trigger (Rick precedent). Shared _atkVoiceCd → one line per window; blocked suppresses.
function applyTobiramaOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "tobirama" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickTobiramaVoice("taunt"), null) } catch (_) {}
}

// ── THE FLASH VOICE LINES (audio-only; Injustice 2 pack, transcribed → FLASH_VOICE_LOG.md) ──
// DEFENDER reaction — one spoken line ("Not again.") + the verified effort-grunt set. One line per
// _hitVoiceCd window; unblocked hits only.
function applyFlashHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "flash" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  // SKIN OVERRIDE: the Reverse Flash skin REPLACES base Flash's reaction line (skinClip || base), same
  // priority the intro site uses. Under any other skin pickSkinVoice returns null → base Flash unchanged.
  const skinClip = pickSkinVoice("flash", defender.skinId, "hitReact")
  try { sound?.playSfxFile?.(skinClip || pickFlashVoice("hitReact"), null) } catch (_) {}
}

// ATTACKER connect — Flash's quippy speed trash-talk on a STRONG connect (heavy/special/ultimate) OR a
// long BASIC light string. No taunt action (heal-taunt would change gameplay — excluded), so the taunt
// pool rides this connect trigger (Rick precedent). Shared _atkVoiceCd → one line per window; blocked suppresses.
function applyFlashOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "flash" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  // SKIN OVERRIDE: the Reverse Flash skin REPLACES base Flash's connect line — ~30% taunt / 70% hit-connect
  // (Killua precedent). Under any other skin pickSkinVoice returns null → base Flash taunt pool, unchanged.
  const skinClip = pickSkinVoice("flash", attacker.skinId, Math.random() < 0.30 ? "taunt" : "hitConnect")
  try { sound?.playSfxFile?.(skinClip || pickFlashVoice("taunt"), null) } catch (_) {}
}

// ── BATMAN VOICE LINES (audio-only; Injustice 2 pack, transcribed → BATMAN_VOICE_LOG.md) ──
// DEFENDER reaction — the verified effort-grunt set (clips 60-66). One line per _hitVoiceCd window;
// unblocked hits only.
function applyBatmanHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "batman" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickBatmanVoice("hitReact"), null) } catch (_) {}
}

// ATTACKER connect — Batman's cold trash-talk on a STRONG connect (heavy/special/ultimate) OR a long
// BASIC light string. No taunt action (heal-taunt would change gameplay — excluded), so the taunt pool
// rides this connect trigger (Flash/Gon precedent). Shared _atkVoiceCd → one line per window; blocked suppresses.
function applyBatmanOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "batman" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickBatmanVoice("taunt"), null) } catch (_) {}
}

// ── OMNI-MAN VOICE LINES ── (MK1 pack; audio-only, no gameplay effect). Same three combat hooks as
// Gon/Batman: DEFENDER hit-reaction, ATTACKER cold trash-talk on a strong/long connect (the taunt pool
// rides the connect trigger — Omni-Man has no taunt action), and a once-only low-HP line. See omnimanVoice.js.
function applyOmniManHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "omniman" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickOmniManVoice("hitReact"), null) } catch (_) {}
}
function applyOmniManOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "omniman" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickOmniManVoice("taunt"), null) } catch (_) {}
}
function applyOmniManLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "omniman" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * 0.30) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickOmniManVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── ISAAC NETERO VOICE LINES ── (removed — audio files deleted; awaiting fresh audio.
// The hit-connect and startup-grunt trigger POINTS remain in resolveAttackHit / updateCombat
// below; re-wire a neteroVoice module + the applyNetero*Voice helpers here to re-enable.)

// ── SAIKI KUSUO VOICE LINES (audio-only; English-dub deadpan dismissals) ──
// HIT-CONNECT bark — fires when an UNBLOCKED attack CONNECTS (any tier). Saiki's 12 clips are the
// deadpan dismissal pool ("Who cares", "I'll pass", "Not listening"…), which read as an unimpressed
// "landed a hit" line. They were originally wired READY-AND-WAITING onto the universal taunt commit
// (game.js), but Saiki has no `taunt` action so that hook is dormant — this LIVE hit-connect trigger
// is what actually makes them audible in-game. Uses the shared _atkVoiceCd (ticked generically in
// game.js) → one line per window, never spams, suppressed when blocked.
function applySaikiOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "saiki" || (attacker._atkVoiceCd > 0)) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickSaikiVoice("taunt"), null) } catch (_) {}
}

// ── GOJO "LIMITLESS" SKIN VOICE (audio-only; young-Gojo Japanese pack, skin-gated) ──
// These two fire ONLY when a Gojo is wearing the "gojo2" (Limitless) skin — pickSkinVoice
// returns null for the default skin (or any other char), so base Gojo is completely unaffected.
// HIT-CONNECT: an UNBLOCKED Gojo attack lands ("good hit" / "take this" / "you're wide open"…).
// Shared _atkVoiceCd (ticked in game.js) → one line per window, suppressed when blocked.
function applyGojoLimitlessOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "gojo" || (attacker._atkVoiceCd > 0)) return
  const clip = pickSkinVoice("gojo", attacker.skinId, "hitConnect")
  if (!clip) return                                  // default skin → base Gojo (no young pool)
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(clip, null) } catch (_) {}
}
// HIT-REACTION: Gojo TAKES an unblocked hit ("that hurts" / "oops" / "damn it"…). Own _hitVoiceCd
// window (ticked in game.js). No tier split — the young pack's reaction lines are tier-agnostic.
function applyGojoLimitlessHitVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "gojo" || (defender._hitVoiceCd > 0)) return
  const clip = pickSkinVoice("gojo", defender.skinId, "hitReact")
  if (!clip) return                                  // default skin → base Gojo (no young pool)
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(clip, null) } catch (_) {}
}

// ── OMEGA RANGER VOICE LINES (audio-only; same pattern as Naruto/Sasuke/Rick above) ──
// DEFENDER reaction — LIGHT tier ONLY ("No!"). Omega ships a single light-stagger reaction clip
// (the hit_1 flinch); a heavy/knockdown-tier hit has no VO here, so it stays silent by design (not
// a mis-tier). One line per _hitVoiceCd window (ticked in game.js); only on an UNBLOCKED hit.
function applyOmegaRangerHitVoice(defender, cat, dmg) {
  if ((defender.rosterKey || "").toLowerCase() !== "omega_ranger" || (defender._hitVoiceCd > 0)) return
  const heavy = cat === "heavy" || cat === "launcher" || cat === "spike" ||
    cat === "special" || cat === "ultimate" || dmg >= 55
  if (heavy) return                                            // light stagger (hit_1) only
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.("omega_hit_reaction_light.mp3", null) } catch (_) {}
}

// ATTACKER offense — priority-ordered, shared _atkVoiceCd (one line per window):
//   (1) a full multi-hit SWORD-SLASH chain (4+ links AND currentMove is an omSword* step) → the
//       combo-finisher "Take it from here?". Fires ONCE at the 4th slash (later slashes fall inside
//       the 150f cooldown), so it never barks on a single slash. Naruto's combo-burst precedent,
//       but scoped to the sword string so a random 4-hit mix doesn't trigger the sword finisher.
//   (2) a STRONG single HEAVY-normal connect (not a light poke) → "Had enough?". Specials/Ultimate
//       are EXCLUDED here (they resolve to cat "light" and, more importantly, each carries its own
//       dedicated cast bark — Buster/Blast/Hyper Mode — at activation, so re-barking on their connect
//       would double up). blocked=false suppresses on guard.
const OMEGA_SWORD_FINISHER_MIN = 4
function applyOmegaRangerOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || (attacker.rosterKey || "").toLowerCase() !== "omega_ranger" || (attacker._atkVoiceCd > 0)) return
  const swordChain = (attacker.comboCounter || 0) >= OMEGA_SWORD_FINISHER_MIN &&
    /^omsword/.test((attacker.currentMove || "").toLowerCase())
  const strong = cat === "heavy"
  if (!swordChain && !strong) return
  attacker._atkVoiceCd = 150
  if (swordChain) sound?.playSfxFile?.("omega_combo_finisher.mp3", null)   // full multi-hit sword string
  else            sound?.playSfxFile?.("omega_hit_connect.mp3", null)      // "Had enough?" — strong single
}

// LOW-HEALTH bark — "This wasn't supposed to happen... it's me he's after." Fires ONCE the first
// time Omega drops to/below the threshold (same gate + ratio family as Naruto's low-health line).
const OMEGA_LOW_HEALTH_RATIO = 0.25
function applyOmegaRangerLowHealthVoice(defender) {
  if ((defender.rosterKey || "").toLowerCase() !== "omega_ranger" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * OMEGA_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.("omega_low_health.mp3", null) } catch (_) {}
  }
}

// ── SUKUNA VOICE LINES (audio-only; largest generic-bark pool wired — 55 clips) ──
// Sukuna is a pure AGGRESSOR: all 55 lines are attacker-side barks (no defender
// "I got hit" line exists in the batch → no reaction hook), and Sukuna has NO taunt
// action (the hold-Down taunt mechanic is gated on animationData.taunt, undefined
// here — same as Naruto/Sasuke/Itachi) and no idle/ambient-bark hook. So all FOUR
// pools (see sukunaVoice.js) fold onto the ONE natural Sukuna VO hook — an attack
// CONNECTING — split by combat context, priority-ordered, sharing _atkVoiceCd (one
// line per 150f window so nothing spams). Only on an UNBLOCKED connect. Random pick
// WITHIN each pool via pickSukunaVoice (genuine Math.random, scales to the 21-entry
// taunt pool). Same scope note as Rick/Naruto: projectile-only specials (Dismantle /
// Flame Arrow) resolve in resolveProjectileHits, not here — they carry their own
// move cues (sukuna_slash / sukuna_fuga); the melee Cleave DOES route through here.
const SUKUNA_FINISHER_LOW_RATIO = 0.20   // "finishing blow" threshold for a strong low-HP connect
function applySukunaOffenseVoice(attacker, defender, cat, unblocked) {
  if (!unblocked || !attacker || attacker.rosterKey !== "sukuna" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  const maxHp      = defender?.maxHealth || 1000
  const koHit      = (defender?.health || 0) <= 0
  const lowFinish  = strong && (defender?.health || 0) > 0 && (defender.health <= maxHp * SUKUNA_FINISHER_LOW_RATIO)

  let clip
  if (koHit || lowFinish) {
    clip = pickSukunaVoice("finisher")                        // KO / finishing-blow on a near-dead foe
  } else if (strong || longString) {
    clip = pickSukunaVoice("hitConnect")                      // heavy/special/ultimate or long combo string
  } else {
    // ordinary LIGHT connect → Sukuna's constant aggressive chatter. No taunt mechanic
    // exists, so the 21-entry TAUNT pool lives here; MISC (no ambient hook) folds in as
    // a low-frequency (~1-in-4) alternate — exactly the substitution the brief permits.
    clip = pickSukunaVoice(Math.random() < 0.25 ? "misc" : "taunt")
  }
  if (clip) { attacker._atkVoiceCd = 150; try { sound?.playSfxFile?.(clip, null) } catch (_) {} }
}

// ========================
// PARRY / CLASH / GRAB
// ========================

export function checkParry(defender, attacker, hitSparks) {
  if (!defender || !attacker || !attacker.currentAttack) return false
  if (getAttackPhase(attacker) !== "startup") return false
  if (attacker.currentAttack.timer > 5) return false
  if (!(defender._parryInputBuffer > 0)) return false

  attacker.hitstun = 28
  attacker.vx = -attacker.facing * 6
  attacker.attacking = false
  attacker.currentAttack = null

  defender.parryFlash = 12
  defender.invulnTimer = 10
  defender.attackCooldown = 0

  const mx = ((attacker.x + attacker.w / 2) + (defender.x + defender.w / 2)) / 2
  const my = ((attacker.y + attacker.h / 2) + (defender.y + defender.h / 2)) / 2

  if (Array.isArray(hitSparks)) {
    hitSparks.push({
      x: mx,
      y: my,
      timer: 20,
      maxTimer: 20,
      category: "parry",
      color: "#38bdf8",
      lines: 12,
      radius: 32
    })
  }

  try { sound?.play?.(SFX?.COUNTER_HIT) } catch (_) {}
  // SASUKE parry voice — "Not an attack I can't see through" on a successful parry read.
  if (defender.rosterKey === "sasuke") { try { sound?.playSfxFile?.("sasuke_counter_reaction.mp3", null) } catch (_) {} }
  // GON parry voice — "I'll return it!" on a successful parry read.
  if ((defender.rosterKey || "").toLowerCase() === "gon") { try { sound?.playSfxFile?.(pickGonVoice("parry"), null) } catch (_) {} }
  return true
}

export function checkClash(p1, p2, hitSparks, camera) {
  if (!p1 || !p2) return false
  if (!attackIsActive(p1.currentAttack) || !attackIsActive(p2.currentAttack)) return false

  const h1 = getAttackHitbox(p1)
  const h2 = getAttackHitbox(p2)
  if (!rectsOverlap(h1, h2)) return false

  const c1 = p1.currentAttack.isUltimate ? "ultimate"
    : p1.currentAttack.isSpecial ? "special"
    : (p1.currentAttack.category || "light")

  const c2 = p2.currentAttack.isUltimate ? "ultimate"
    : p2.currentAttack.isSpecial ? "special"
    : (p2.currentAttack.category || "light")

  const s1 = c1 === "special" || c1 === "ultimate"
  const s2 = c2 === "special" || c2 === "ultimate"

  const hs = HITSTOP.clash

  if (s1 && !s2) {
    p2.hitstun = 14
    p2.vx = -p2.facing * 4
    p2.hitstop = hs
    p2.attacking = false
    p2.currentAttack = null
    p2.clashFlash = 10
  } else if (s2 && !s1) {
    p1.hitstun = 14
    p1.vx = -p1.facing * 4
    p1.hitstop = hs
    p1.attacking = false
    p1.currentAttack = null
    p1.clashFlash = 10
  } else {
    for (const f of [p1, p2]) {
      f.vx = -f.facing * 4
      f.hitstop = hs
      f.attacking = false
      f.currentAttack = null
      f.clashFlash = 10
    }
  }

  const mx = ((p1.x + p1.w / 2) + (p2.x + p2.w / 2)) / 2
  const my = ((p1.y + p1.h / 2) + (p2.y + p2.h / 2)) / 2

  if (Array.isArray(hitSparks)) {
    hitSparks.push({
      x: mx,
      y: my,
      timer: 25,
      maxTimer: 25,
      category: "clash",
      color: "#ffffff",
      lines: 20,
      radius: 48
    })
  }

  try { camera?.shake?.(12, 10) } catch (_) {}
  return true
}

export function resolveGrab(attacker, defender, context = {}, range = 75) {
  if (!attacker || !defender) return false
  if (!attacker.onGround || !defender.onGround) return false
  if (attacker.comboCounter > 0) return false

  const aCX = attacker.x + attacker.w / 2
  const dCX = defender.x + defender.w / 2
  // `range` defaults to the standard 75px reach; extended-reach grabs (e.g. Naruto's
  // shroud-gated Chakra Arm Grab) pass a larger value. Everything else — tech window,
  // grab state, and the updateGrab() pop-up-and-drop throw — is shared unchanged.
  if (Math.abs(aCX - dCX) > range) return false

  const canTech = !(defender.hitstun > 0 || defender.blockstun > 0)
  if (canTech && (defender.grabInputBuffer || 0) > 0) {
    attacker.attackCooldown = 18
    defender.attackCooldown = 18
    attacker.vx = -attacker.facing * 3
    defender.vx = attacker.facing * 3
    return false
  }

  defender.isGrabbed = true
  defender.grabTimer = 28
  defender.hitstun = 28
  defender.vx = 0
  defender.vy = 0
  defender.colorFlash = 4

  attacker.attacking = false
  attacker.currentAttack = null
  attacker.attackCooldown = 28
  return true
}

export function updateGrab(attacker, defender) {
  if (!defender?.isGrabbed) return

  defender.vx = 0
  defender.vy = 0
  defender.grabTimer--

  if (defender.grabTimer <= 0) {
    defender.isGrabbed = false
    defender.vy = -14
    defender.vx = (attacker?.facing || 1) * 9
    defender.onGround = false
    defender.isLaunched = true
    defender.health = Math.max(0, (defender.health || 0) - Math.floor(90 * GLOBAL_DAMAGE_SCALE))
    defender.hitstun = 20
    defender.colorFlash = 8

    try { sound?.play?.(SFX?.HIT_HEAVY) } catch (_) {}
    if (defender.health <= 0) {
      try { sound?.play?.(SFX?.KO) } catch (_) {}
    }
  }
}

// ========================
// MOVE START
// ========================

export function startMove(fighter, moveKey, moveData) {
  if (!fighter || !moveData) return false
  if (fighter.attacking || fighter.hitstun > 0 || fighter.attackCooldown > 0) return false

  const st = moveData.startup || 5
  const ac = moveData.active || 4
  const rc = moveData.recovery || 10
  const total = _dur(st + ac + rc, fighter)

  // Launchers (up attacks) get a more generous hitbox so they're not
  // pixel-precise: wider reach and a taller box that also catches an enemy who
  // is already slightly airborne — this is what makes the air combo reliable.
  const isLauncher = moveKey === "up"

  fighter.attacking = true
  fighter.currentAttack = {
    name: moveKey,
    category: moveData.category || _catFromName(moveKey),
    damage: moveData.damage || 40,
    total,
    timer: total,
    activeStart: st,
    activeEnd: st + ac,
    rangeX: moveData.rangeX || (isLauncher ? 95 : 60),
    rangeY: moveData.rangeY || (isLauncher ? 80 : 40),
    hitstun: moveData.hitstun || 15,
    pushX: moveData.knockbackX || 4,
    launchY: moveData.knockbackY ?? -2,
    launcher: moveKey === "up",
    spike: moveKey === "down_air",
    superArmor: !!moveData.superArmor,
    isSpecial: !!moveData.isSpecial,
    isUltimate: !!moveData.isUltimate,
    hasHit: false
  }

  fighter.wasInStartup = true
  return true
}

// ========================
// HIT RESOLUTION
// ========================

export function resolveAttackHit(attacker, defender, hitEffects = null, options = {}) {
  const { stageWidth = 3200, damageNumbers = null } = options

  if (!attacker?.currentAttack || attacker.currentAttack.hasHit) return
  if (!attackIsActive(attacker.currentAttack)) return

  if (checkParry(defender, attacker, hitEffects)) return

  const hitbox = getAttackHitbox(attacker)
  const hurtbox = getHurtbox(defender)
  if (!rectsOverlap(hitbox, hurtbox)) return

  // I-FRAMES / KNOCKDOWN apply to MELEE too, not just projectiles (resolveProjectileHits already
  // skips on invulnTimer). A defender who is invulnerable (tech-roll, dash i-frames, post-parry) OR
  // still knocked DOWN is untouchable; the swing passes through. Consume it (hasHit) so it whiffs
  // cleanly instead of re-testing every active frame.
  //   WHY BOTH conditions: without the invuln check, a hit during Goku Black's post-knockdown i-frames
  //   re-armed knockdownTimer to 52. The invuln check alone is NOT enough — invulnTimer decrements
  //   during hitstop (above) but knockdownTimer does not (it lives in the post-hitstop knockdown
  //   block), so invuln drains ~hitstop frames FASTER than the knockdown, leaving a brief
  //   still-down-but-no-longer-invulnerable window each cycle where a rapid heavy/special barrage
  //   re-armed the knockdown and pinned him in the down/hit reaction forever (soft-lock; opponent's
  //   hits just kept whiff-looping). Treating a knocked-DOWN fighter as untouchable (standard
  //   anti-ground-lock rule; knockdownState is goku_black-only) closes that window robustly. The
  //   knockdown-INDUCING hit still lands (knockdownState is set AFTER damage, below). Verified by
  //   harness/goku_black_softlock.test.mjs (EVIDENCE 1/2 + regression).
  if ((defender.invulnTimer || 0) > 0 || defender.knockdownState) { attacker.currentAttack.hasHit = true; return }

  // Task 4: inside Sukuna's Malevolent Shrine the trapped enemy is UNTOUCHABLE by
  // the player's manual attacks — only the domain's auto-slashes (domains.js) deal
  // damage. The swing whiffs cleanly (consume it so it doesn't re-test every frame).
  // Projectiles (e.g. Sukuna's Fuga) go through resolveProjectileHits and are NOT
  // gated here, so Fuga still connects.
  if (defender.domainUntouchable) { attacker.currentAttack.hasHit = true; return }

  if (attacker.currentAttack?.superArmor) attacker.armorFlash = 8

  if (shouldGojoAutoDodge(defender) || shouldSasukeAbsoluteDefenseNegate(defender)) {
    attacker.currentAttack.hasHit = true
    try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
    return
  }

  const atk = attacker.currentAttack
  const cat = atk.isUltimate ? "ultimate"
    : atk.isSpecial ? "special"
    : (atk.category || _catFromName(atk.name || ""))

  const isCounter = !!(defender.wasInStartup && getAttackPhase(defender) === "startup")

  // damageMultiplier and attackMultiplier are the SAME concept (an offensive
  // scalar). transformations.js sets both to a form's value and domains.js
  // multiplies attackMultiplier on top — so multiplying by BOTH squared the
  // buff (a 2x transform dealt 4x). Take the max instead: that preserves
  // transform×domain stacking (transform sets both to 2, a domain pushes
  // attackMultiplier to 3 → max = 3 = 2×1.5) without the double-count.
  const offenseMult = Math.max(attacker.damageMultiplier || 1, attacker.attackMultiplier || 1)

  let dmg = Math.floor(
    (atk.damage || 40) *
    getComboScale(attacker) *
    offenseMult *
    GLOBAL_DAMAGE_SCALE /
    Math.max(0.5, defender.defenseMultiplier || 1)
  )

  if (isCounter) {
    dmg = Math.floor(dmg * 1.25)
    try { sound?.play?.(SFX?.COUNTER_HIT) } catch (_) {}
  }

  if (defender.isBlocking) {
    const chip = cat === "special" || cat === "ultimate"
    const chipDmg = Math.floor(dmg * (chip ? 0.12 : 0.20))

    defender.health = Math.max(chip ? 1 : 0, (defender.health || 0) - chipDmg)
    defender.blockstun = 10 + (cat === "special" ? 4 : 0)

    try { sound?.play?.(SFX?.BLOCK) } catch (_) {}

    if (Array.isArray(hitEffects)) {
      hitEffects.push({
        x: hitbox.x + hitbox.w / 2,
        y: hitbox.y + hitbox.h / 2,
        timer: 8,
        maxTimer: 8,
        category: "light",
        color: null,
        damage: chipDmg,
        isBlocking: true,
        // Telemetry tags (additive — read by the AI-vs-AI spectator log; no balance impact).
        moveName: atk.name || null,
        attackerSide: attacker.side || null,
        blocked: true,
        lines: 6,
        radius: 14
      })
    }
  } else {
    applyHitstop(attacker, defender, getHitstopFrames(atk))

    defender.hitstun = Math.max(defender.hitstun || 0, Math.round((atk.hitstun || 0) * HITSTUN_SCALE * getComboHitstunScale(attacker)))
    // Getting hit interrupts the defender's own swing so they don't keep
    // attacking (or sit on a never-cleared currentAttack) during hitstun.
    defender.attacking    = false
    defender.currentAttack = null
    defender.currentMove   = null
    // A hit also interrupts a transform-device charge (Ben/Albedo).
    defender.isCharging   = false
    defender.vx = (attacker.facing || 1) * (atk.pushX || 4)

    // BEERUS hit-reaction voice ("...impressive") — only on a SIGNIFICANT hit (heavy-tier category or
    // real damage), NOT every light poke. Cooldown-gated (_hitVoiceCd ticked in game.js) so a rapid
    // heavy string doesn't spam it. No-op for every other character.
    if (defender.rosterKey === "beerus" && !(defender._hitVoiceCd > 0) &&
        (cat === "heavy" || cat === "launcher" || cat === "spike" || cat === "special" || cat === "ultimate" || dmg >= 55)) {
      defender._hitVoiceCd = 150
      try { sound?.playSfxFile?.("beerus_hit_reaction.mp3", null) } catch (_) {}
    }

    if (atk.launcher) {
      physics.launcherAttack(attacker, defender, atk.launchY ?? -12, -22)
    } else if (atk.spike) {
      physics.downAirSpike(attacker, defender, 30)
    } else {
      defender.vy = atk.launchY ?? -2
    }

    if (cat === "heavy" || cat === "special" || cat === "ultimate") {
      const proj = defender.x + defender.vx * 8
      if (proj <= 0 || proj >= stageWidth - (defender.w || 60)) {
        defender.wallBounce = true
      }
    }

    // GOKU BLACK — dramatic KNOCKDOWN on a strong GROUNDED hit (heavy/special/ultimate; NOT
    // launcher/spike, which already send him airborne). His black_goku_hit sheet is a full
    // flinch→fall→sprawled sequence: the resolver plays it through, then chains into black_goku_get_up
    // (RISE). Light jabs stay a brief flinch (hurt). Self-contained — knockdownState is otherwise never
    // triggered in normal play; gated to goku_black. invulnTimer prevents ground-lock combos.
    const isGokuBlackDefender = (defender.rosterKey || "").toLowerCase() === "goku_black"
    if (isGokuBlackDefender && !atk.launcher && !atk.spike &&
        (cat === "heavy" || cat === "special" || cat === "ultimate")) {
      defender.knockdownState = true
      defender.knockdownTimer = GOKU_BLACK_KNOCKDOWN
      defender.invulnTimer    = Math.max(defender.invulnTimer || 0, GOKU_BLACK_KNOCKDOWN)
    }

    // GOKU BLACK hit-reaction voice — mirrors Beerus's cooldown-gated reaction, but SPLIT by tier:
    // the knockdown sequence just set above gets the ESCALATED "Unthinkable! It can't be!" line;
    // any lighter flinch gets "Foolish. The insolence." Shares _hitVoiceCd (ticked in game.js) so a
    // rapid string never spams it, and the shared cooldown means one hit fires ONE of the two, never both.
    // These are the DEFENDER's reactions → own them by the defender (game.js's ambient owner here is the
    // ATTACKER), so a hit-reaction bark is cut when the DEFENDER's hurt animation ends, not the attacker's.
    const _prevVoiceOwner = sound?._voiceOwner
    if (sound) sound._voiceOwner = defender
    if (isGokuBlackDefender && !(defender._hitVoiceCd > 0)) {
      defender._hitVoiceCd = 150
      const voiceLine = defender.knockdownState ? "goku_black_hit_heavy.mp3" : "goku_black_hit_light.mp3"
      try { sound?.playSfxFile?.(voiceLine, null) } catch (_) {}
    }

    // NARUTO hit-reaction voice — light vs heavy pool, split off the hit tier (no knockdownState).
    applyNarutoHitVoice(defender, cat, dmg)
    // SASUKE hit-reaction voice — light flinch cluster vs heavy reaction, same tier split.
    applySasukeHitVoice(defender, cat, dmg)
    // RICK hit-reaction voice — light flinch pool vs heavy pool, same tier split.
    applyRickHitVoice(defender, cat, dmg)
    // KILLUA hit-reaction voice — single dismissive pool ("Too soft" / "Annoying" / "Damn it").
    applyKilluaHitVoice(defender, cat, dmg)
    // GON hit-reaction voice — dismissive/pained pool ("No way" / "This is bad" / "Damn it").
    applyGonHitVoice(defender, cat, dmg)
    // HISOKA hit-reaction voice — delighted/dismissive pool ("No no~" / "Impressive~" / "Irresistible~").
    applyHisokaHitVoice(defender, cat, dmg)
    applyMinatoHitVoice(defender, cat, dmg)
    // FLASH hit-reaction voice — "Not again." + effort-grunt set.
    applyFlashHitVoice(defender, cat, dmg)
    // BATMAN hit-reaction voice — effort-grunt set (clips 60-66).
    applyBatmanHitVoice(defender, cat, dmg)
    // OMNI-MAN hit-reaction voice — shrug-it-off defiance ("That tickles" / "Easy, kid").
    applyOmniManHitVoice(defender, cat, dmg)
    // OMEGA RANGER hit-reaction voice — light stagger only ("No!"); heavy tier stays silent (no clip).
    applyOmegaRangerHitVoice(defender, cat, dmg)
    // ITACHI hit-reaction voice — calm observation pool ("I see…" / "Quick, aren't you").
    applyItachiHitVoice(defender)
    // GOJO "Limitless" skin hit-reaction — young-Gojo pack; no-op on the default skin.
    applyGojoLimitlessHitVoice(defender)
    if (sound) sound._voiceOwner = _prevVoiceOwner   // restore the ambient (attacker) owner

    if (!isCounter) {
      try { sound?.play?.(_hitSound(atk, false)) } catch (_) {}
    }

    defender.health = Math.max(0, (defender.health || 0) - dmg)
    applyNarutoLowHealthVoice(defender)   // "Not yet — I can still fight" (once, on crossing the low-HP line)
    applyOmegaRangerLowHealthVoice(defender)   // "This wasn't supposed to happen…" (once, on crossing the low-HP line)
    applyItachiLowHealthVoice(defender)   // "I haven't fallen yet" (once, on crossing the low-HP line)
    applyGonLowHealthVoice(defender)   // "Not yet" / "I can still fight" / "I'm going to die" (once, on crossing the low-HP line)
    applyHisokaLowHealthVoice(defender)   // Hisoka THRILLED by danger: "Irresistible~" / "How tantalizing~" (once, on crossing the low-HP line)
    applyMinatoLowHealthVoice(defender)   // Minato "I'll fight to the end" (once, on crossing the low-HP line)
    applyOmniManLowHealthVoice(defender)   // "It's all under control" / "none of you can stop me" (once, on crossing the low-HP line)
    defender.colorFlash = cat === "ultimate" ? 12 : cat === "special" ? 9 : 6

    const persist =
      cat === "ultimate" ? 30 :
      cat === "special" ? 22 :
      (cat === "heavy" || atk.launcher || atk.spike) ? 18 : 10

    if (Array.isArray(hitEffects)) {
      hitEffects.push({
        x: hitbox.x + hitbox.w / 2,
        y: hitbox.y + hitbox.h / 2,
        timer: persist,
        maxTimer: persist,
        category: cat,
        color: (cat === "special" || cat === "ultimate") ? (attacker.color || "#ffd166") : null,
        lines: cat === "ultimate" ? 16 : cat === "special" ? 10 : cat === "heavy" ? 8 : 6,
        radius: cat === "ultimate" ? 40 : cat === "special" ? 28 : cat === "heavy" ? 22 : 14,
        damage: dmg,
        isCounterHit: isCounter,
        // Telemetry tags (additive — read by the AI-vs-AI spectator log; no balance impact).
        moveName: atk.name || null,
        attackerSide: attacker.side || null,
        blocked: false
      })
    }

    if (Array.isArray(damageNumbers)) {
      const cmap = {
        light: "#ffffff",
        heavy: "#fbbf24",
        special: "#f97316",
        ultimate: "#ef4444"
      }

      damageNumbers.push({
        value: dmg,
        text: String(dmg),
        x: hitbox.x + hitbox.w / 2,
        y: hitbox.y,
        timer: 45,
        maxTimer: 45,
        opacity: 1,
        category: cat,
        color: cmap[cat] || "#ffffff",
        fontSize: Math.min(38, 22 + Math.floor(dmg / 20))
      })
    }

    if (defender.health <= 0) {
      try { sound?.play?.(SFX?.KO) } catch (_) {}
    }
  }

  attacker.currentAttack.hasHit = true
  // GON SUDDEN-DEATH ("Final Blow"): latch the outcome on the attack so game._updateGonSuddenDeath() can
  // force the instant match end. A CLEAN unblocked connect → "clean" (instant WIN); a guarded hit →
  // "blocked" (counts as a MISS → instant LOSS). (The invuln/knockdown/domain early-returns above set
  // hasHit but never reach here, so an immune opponent correctly reads as a miss/loss.)
  if (attacker.currentAttack._gonSuddenDeath) attacker.currentAttack._sdConnect = defender.isBlocking ? "blocked" : "clean"
  // Combo bookkeeping: a CLEAN hit extends the string (counter++ + refresh the 90f drop timer); a BLOCK
  // BREAKS it (counter → 0) so the decay resets and the attacker's next clean hit starts fresh at full
  // scale. (Previously the counter incremented even on block, so a blocked poke silently taxed the combo.)
  if (defender.isBlocking) {
    attacker.comboCounter = 0
  } else {
    attacker.comboCounter++
    attacker.comboTimer = 90
  }
  attacker.wasInStartup = false

  try { sound?.playCombo?.(attacker.comboCounter) } catch (_) {}

  applyUltraEgoReaction(defender)
  applyKuramaShroudReaction(defender)   // Kurama Shroud comeback heal-on-hit (stage 3+)
  applyNarutoComboFinisherReaction(defender, attacker)   // Naruto-only escalated combo-ender recoil pose
  applyNarutoOffenseVoice(attacker, cat, !defender.isBlocking)   // Naruto Hokage / combo-burst pride line on connect
  applySasukeOffenseVoice(attacker, cat, !defender.isBlocking)   // Sasuke Susanoo-confirm / combo-finisher / attack-lands line
  applyItachiOffenseVoice(attacker, cat, !defender.isBlocking)   // Itachi taunting connect pool (strong/long-string gated)
  applyRickOffenseVoice(attacker, cat, !defender.isBlocking)     // Rick generic taunt/flavor bark on a strong/long-string connect
  applyKilluaOffenseVoice(attacker, cat, !defender.isBlocking)   // Killua combat bark (+ ~30% taunt one-liner) on a strong/long-string connect
  applyGonOffenseVoice(attacker, cat, !defender.isBlocking)      // Gon combat bark on a heavy/long-string connect (specials use their own cast lines)
  applyHisokaOffenseVoice(attacker, cat, !defender.isBlocking)   // Hisoka combat bark (+ ~30% flirty taunt) on a heavy/long-string connect (specials use their own cast lines)
  applyMinatoOffenseVoice(attacker, cat, !defender.isBlocking)   // Minato offense bark / taunt on a heavy/long-string connect
  applyTobiramaOffenseVoice(attacker, cat, !defender.isBlocking) // Tobirama overconfident taunt one-liner on a strong/long-string connect
  applyFlashOffenseVoice(attacker, cat, !defender.isBlocking)    // Flash quippy speed trash-talk on a strong/long-string connect
  applyBatmanOffenseVoice(attacker, cat, !defender.isBlocking)   // Batman cold trash-talk (taunt pool) on a strong/long-string connect
  applyOmniManOffenseVoice(attacker, cat, !defender.isBlocking)  // Omni-Man cold Viltrumite trash-talk (taunt pool) on a strong/long-string connect
  applyOmegaRangerOffenseVoice(attacker, cat, !defender.isBlocking)   // Omega "Had enough?" (strong heavy) / sword-chain combo-finisher
  applySukunaOffenseVoice(attacker, defender, cat, !defender.isBlocking)   // Sukuna finisher(KO/low-HP) / hit-connect(strong+long) / taunt+misc(light) barks
  // Netero hit-connect voice removed (audio files deleted); re-add applyNeteroOffenseVoice here to re-enable.
  applySaikiOffenseVoice(attacker, cat, !defender.isBlocking)    // Saiki deadpan dismissal on connect (was dormant on the no-op taunt hook; this makes it LIVE)
  applyGojoLimitlessOffenseVoice(attacker, cat, !defender.isBlocking)   // Gojo "Limitless" skin hit-connect bark (young pack; no-op on default skin)
}

// ========================
// MAIN UPDATE
// ========================

export function updateCombat(fighter, opponent, controls = {}, options = {}) {
  if (!fighter || !opponent) return

  ensureCombatState(fighter)

  // Netero startup-grunt voice removed (audio files deleted); re-add applyNeteroGruntVoice here to re-enable.

  if ((fighter.grabInputBuffer || 0) > 0) fighter.grabInputBuffer--
  if ((fighter._parryInputBuffer || 0) > 0) fighter._parryInputBuffer--
  if ((fighter.parryFlash || 0) > 0) fighter.parryFlash--
  if ((fighter.armorFlash || 0) > 0) fighter.armorFlash--
  if ((fighter.clashFlash || 0) > 0) fighter.clashFlash--
  if ((fighter.invulnTimer || 0) > 0) fighter.invulnTimer--

  if (fighter.hitstop > 0) {
    fighter.hitstop--
    return
  }

  if (fighter.hitstun > 0) fighter.hitstun--
  if ((fighter._comboFinisherReactTimer || 0) > 0) fighter._comboFinisherReactTimer--   // Naruto combo-ender recoil pose window
  if (fighter.blockstun > 0) fighter.blockstun--
  if (fighter.comboTimer > 0) fighter.comboTimer--
  else fighter.comboCounter = 0
  if (fighter.attackCooldown > 0) fighter.attackCooldown--

  if (fighter.isGrabbed) {
    updateGrab(opponent, fighter)
    return
  }

  if (fighter.knockdownState) {
    if ((fighter.knockdownTimer || 0) > 0) {
      fighter.knockdownTimer--
      if (fighter.knockdownTimer <= 8) {
        if (controls.left) fighter.techRoll = "left"
        if (controls.right) fighter.techRoll = "right"
      }
    }

    if (fighter.knockdownTimer <= 0) {
      fighter.knockdownState = false
      if (fighter.techRoll) {
        const d = fighter.techRoll === "right" ? 1 : -1
        fighter.vx = d * 7
        fighter._techDash = 12
        fighter.invulnTimer = 18
        fighter.colorFlash = 18
        fighter.techRoll = null
      } else {
        // NEUTRAL WAKE-UP INVULN: a fighter standing up from a knockdown gets a brief actionable
        // i-frame window so they always have a guaranteed escape and can't be meaty-looped straight
        // back into knockdown on their wakeup frame (anti-vortex; mirrors the tech-roll's 18f). invuln
        // doesn't stop the fighter acting — only being hit — so the opponent can still act, their meaty
        // just whiffs. knockdownState is goku_black-only, so this affects only him.
        fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, WAKEUP_INVULN)
      }
    }
    return
  }

  fighter.wasInStartup = !!(
    fighter.attacking &&
    fighter.currentAttack &&
    getAttackPhase(fighter) === "startup"
  )

  if (!fighter.attacking && !fighter.hitstun) {
    if (controls.upAttack) {
      startMove(fighter, "up", _getMD(fighter, "up"))
    } else if (controls.grab) {
      fighter.grabInputBuffer = 6
      resolveGrab(fighter, opponent, options)
    } else if (controls.air) {
      startMove(fighter, "air", _getMD(fighter, "air"))
    } else if (controls.downAir) {
      startMove(fighter, "down_air", _getMD(fighter, "down_air"))
    } else if (controls.light) {
      startMove(fighter, "light", _getMD(fighter, "light"))
    } else if (controls.heavy) {
      fighter._parryInputBuffer = 5
      // GOKU BLACK — "Ki Slash": the ONE normal that costs energy (KI_SLASH_COST). If broke, the
      // heavy simply doesn't come out (input consumed, no whiff-attack). Deduct ONLY when it starts.
      const hmd = _getMD(fighter, "heavy")
      const isGB = (fighter.rosterKey || "").toLowerCase() === "goku_black"
      if (isGB && hmd && (fighter.energy || 0) < KI_SLASH_COST) {
        /* not enough energy for Ki Slash → no heavy this press */
      } else if (startMove(fighter, "heavy", hmd) && isGB) {
        fighter.energy = Math.max(0, (fighter.energy || 0) - KI_SLASH_COST)
      }
    }
  }

  if (fighter.attacking && fighter.currentAttack) {
    fighter.currentAttack.timer--

    if (getAttackPhase(fighter) === "active") {
      resolveAttackHit(fighter, opponent, options.hitEffects, {
        stageWidth: options.stageWidth,
        damageNumbers: options.damageNumbers
      })
    }

    // LAUNCHER CANCEL: when an up-attack connects it sends both fighters airborne
    // (see physics.launcherAttack). Cancel the attacker's long recovery so they
    // can immediately jump / air-attack to start the juggle, instead of being
    // stuck on the ground while the enemy floats away.
    if (fighter.currentAttack && fighter.currentAttack.launcher && fighter.currentAttack.hasHit) {
      fighter.attacking = false
      fighter.currentAttack = null
      fighter.currentMove = null
      fighter.attackCooldown = 0
    } else if (fighter.currentAttack && fighter.currentAttack.timer <= 0) {
      fighter.attacking = false
      fighter.currentAttack = null
      fighter.currentMove = null
      fighter.attackCooldown = 10
    }
  }

  // Energy regen is owned by abilities.js regenEnergy() (per-character/domain
  // tuning + the infinite-energy vow). Removing the duplicate passive +0.1 here
  // that used to run alongside it every frame and double-fill the meter.
}

// ========================
// PROJECTILES
// ========================

export function updateProjectiles(projectiles = [], stageWidth = 3200) {
  if (!Array.isArray(projectiles)) return

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]
    if (!p) {
      projectiles.splice(i, 1)
      continue
    }

    // BOOMERANG (Killua's yo-yo): fly OUT until maxRange from the owner, then RETRACT — home back to
    // the owner's live position and despawn on pickup. `returning` is also set on contact (resolve-
    // ProjectileHitsMulti) so a hit/block bounces it back. Generic: no-op for any projectile without
    // `boomerang`. Computed BEFORE the position step so this frame already moves along the new heading.
    if (p.boomerang && p.owner) {
      const ox = p.owner.x + (p.owner.w || 0) / 2
      const oy = p.owner.y + (p.owner.h || 100) * 0.4
      if (!p.returning && Math.hypot(p.x - ox, p.y - oy) >= (p.maxRange || 360)) p.returning = true
      if (p.returning) {
        const dx = ox - p.x, dy = oy - p.y
        const d = Math.hypot(dx, dy) || 1
        if (d < 34) { projectiles.splice(i, 1); continue }   // caught → despawn
        const rs = p.retractSpeed || 15
        p.vx = (dx / d) * rs; p.vy = (dy / d) * rs
      }
    }

    p.x += p.vx || 0
    p.y += p.vy || 0
    // A returning boomerang despawns on pickup, not on a lifetime timeout, so it always makes it home.
    if (p.lifetime != null && !(p.boomerang && p.returning)) p.lifetime--

    if (
      p.x < -200 || p.x > stageWidth + 200 ||
      p.y < -400 || p.y > 2000 ||
      (p.lifetime != null && p.lifetime <= 0)
    ) {
      // onExpire: fired ONLY on this timeout/out-of-bounds path — i.e. the projectile MISSED (a
      // projectile that connects is removed by resolveProjectileHits, which never runs this). Minato's
      // Flying Raijin kunai uses it to convert a whiff into a teleport mark. Generic: no-op otherwise.
      if (typeof p.onExpire === "function") { try { p.onExpire(p) } catch (_) {} }
      projectiles.splice(i, 1)
    }
  }
}

// 1v1: unchanged signature/behavior — delegates to the array impl with the two fighters.
export function resolveProjectileHits(projectiles = [], p1, p2, hitEffects = [], damageNumbers = []) {
  resolveProjectileHitsMulti(projectiles, [p1, p2], hitEffects, damageNumbers)
}

// FREE-FOR-ALL: a projectile can hit ANY fighter except its owner (the 1v1 path above is
// just this with two fighters). Same collision/damage/block/DOT logic, generalized target set.
export function resolveProjectileHitsMulti(projectiles = [], fighters = [], hitEffects = [], damageNumbers = []) {
  if (!Array.isArray(projectiles)) return

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i]
    if (!proj) continue
    if (proj.visualOnly) continue   // pure FX (e.g. AOE ring bloom) — never collides
    if (proj.returning) continue    // a retracting boomerang (Killua yo-yo) already hit — return trip is visual-only

    for (const fighter of (fighters || []).filter(Boolean)) {
      if (fighter.eliminated) continue
      if (proj.owner === fighter || proj.ownerId === fighter.side) continue
      // Friendly fire off (team mode): a projectile can't hit an owner's teammate. No-op
      // in 1v1/FFA where fighters carry no `team` property.
      if (proj.owner?.team && fighter.team && proj.owner.team === fighter.team) continue
      if ((fighter.invulnTimer || 0) > 0) continue

      const hurtbox = getHurtbox(fighter)
      // Prefer an explicit circle radius, but fall back to the sprite box so
      // projectiles authored with only {w,h} still collide at their true size.
      const r = proj.radius || proj.size ||
        (proj.w && proj.h ? Math.max(proj.w, proj.h) / 2 : 10)
      const pb = { x: proj.x - r, y: proj.y - r, w: r * 2, h: r * 2 }

      if (!rectsOverlap(pb, hurtbox)) continue

      // Sasuke's Absolute Defense negates projectiles too (full invuln, per-block energy cost) —
      // the projectile is consumed and deals nothing. Checked BEFORE damage so it takes priority
      // over normal block. No-op for everyone else / when the toggle is off / when energy is short.
      if (shouldSasukeAbsoluteDefenseNegate(fighter)) {
        try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
        projectiles.splice(i, 1)
        break
      }

      // Combo damage decay applies to projectiles too (combo-flow Stage 3): a projectile landing mid-
      // combo is scaled by the owner's current combo count, exactly like a melee hit. A standalone
      // projectile (counter 0/1) scales by 1 → unchanged. Uses the PRE-increment counter; the owner's
      // combo bookkeeping (extend on clean hit / reset on block) is done just below, after damage.
      let dmg = (proj.damage || 30) * getComboScale(proj.owner) * GLOBAL_DAMAGE_SCALE

      if (fighter.isBlocking) {
        dmg *= 0.15
        fighter.blockstun = 12
        try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
      } else {
        fighter.hitstun = Math.round((proj.hitstun || 18) * getComboHitstunScale(proj.owner))
        fighter.vx = (proj.vx > 0 ? 1 : -1) * (proj.knockbackX || 5)
        fighter.vy = proj.knockbackY || -3
        fighter.colorFlash = 6
        // Projectile hit-stop — gives a connecting bolt/fireball impact weight (previously
        // projectiles applied none). Freezes the TARGET ONLY — NOT the owner: unlike a melee
        // swing (whose freeze is part of the attacker's own adjacent animation), a projectile
        // is decoupled from its thrower, who has already recovered and may be mid-other-action
        // or across the stage — freezing them stalls their cast animation and looks wrong
        // (regressed Beerus's nova pose + Naruto's cast/voice timing). Opt out per-projectile
        // via noHitstop (rapid barrages / DOT); tune magnitude via HITSTOP.projectile. Clean-hit only.
        applyHitstop(fighter, null, getProjectileHitstopFrames(proj))
        try { sound?.play?.(SFX?.HIT_PROJECTILE) } catch (_) {}
      }

      // Combo bookkeeping — a projectile participates in the owner's combo string just like a melee hit
      // (combo-flow Stage 3): a CLEAN hit extends it (counter++ + refresh the 90f drop timer) so the next
      // hit decays; a BLOCK breaks it (counter → 0). Mirrors resolveAttackHit. DOT ticks resolve elsewhere
      // (game.js) so they don't double-count here. No-op for an owner-less projectile.
      if (proj.owner) {
        if (fighter.isBlocking) proj.owner.comboCounter = 0
        else { proj.owner.comboCounter = (proj.owner.comboCounter || 0) + 1; proj.owner.comboTimer = 90 }
      }

      fighter.health = Math.max(0, (fighter.health || 0) - Math.floor(dmg))

      // Lingering damage-over-time (e.g. Naruto Rasenshuriken wind-chip). Only on a
      // clean (non-blocked) connect, and only if the hit didn't already KO. Ticked in
      // game.updateMiscTimers. `delay` starts one interval out so the first tick lands
      // after the initial hit, not on the same frame.
      if (!fighter.isBlocking && proj.dot && (fighter.health || 0) > 0) {
        const iv = Math.max(1, proj.dot.interval | 0)
        fighter._dot = { ticks: proj.dot.ticks | 0, interval: iv, dmg: proj.dot.dmg | 0, delay: iv }
      }

      // GENERIC PROJECTILE-CONNECT FLAG (Saiki's projectile rekka): a projectile carrying a `hitFlag`
      // string sets that named flag TRUE on its owner when it lands a CLEAN hit (not a block). This lets
      // a projectile-based cancel-chain gate its continue on the bolt actually connecting — the same
      // "cancel-on-hit, block/whiff ends the string" rule the melee rekkas use via _cmdHitLanded.
      if (!fighter.isBlocking && proj.hitFlag && proj.owner) proj.owner[proj.hitFlag] = true

      if (fighter.health <= 0) {
        try { sound?.play?.(SFX?.KO) } catch (_) {}
      }

      if (Array.isArray(hitEffects)) {
        hitEffects.push({
          x: proj.x,
          y: proj.y,
          timer: 14,
          maxTimer: 14,
          category: "special",
          color: proj.color || "#ffd166",
          lines: 10,
          radius: 24,
          damage: Math.floor(dmg),
          // Telemetry tags (additive — read by the AI-vs-AI spectator log; no balance impact).
          moveName: proj.name || "projectile",
          attackerSide: proj.ownerId || proj.owner?.side || null,
          blocked: !!fighter.isBlocking
        })
      }

      if (Array.isArray(damageNumbers)) {
        damageNumbers.push({
          value: Math.floor(dmg),
          text: String(Math.floor(dmg)),
          x: proj.x,
          y: proj.y - 20,
          timer: 45,
          maxTimer: 45,
          opacity: 1,
          category: "special",
          color: "#f97316",
          fontSize: Math.min(38, 22 + Math.floor(dmg / 20))
        })
      }

      // IMPACT-ON-CONNECT FX (e.g. Vegeta SSJ Final Flash's explosion sheet): a projectile carrying
      // an `impact` spawns a pure-visual sprite at the hit point ONLY when it actually connects (not
      // at cast, not on a block-negate). Pushed as a visualOnly projectile so it decays via lifetime
      // and never re-collides. Appended past the current index → not revisited by this backward loop.
      if (proj.impact && !fighter.isBlocking) {
        projectiles.push({
          x: proj.x, y: proj.y, vx: 0, vy: 0, visualOnly: true,
          lifetime: proj.impact.lifetime || 40, name: (proj.name || "proj") + "_impact",
          sheet: proj.impact.sheet, spriteFrames: proj.impact.frames,
          spriteW: proj.impact.w, spriteH: proj.impact.h,
          spriteSpeed: proj.impact.speed || 2, spriteScale: proj.impact.scale || 1
        })
      }

      // A boomerang (Killua yo-yo) RETRACTS on contact instead of despawning: mark it returning
      // (updateProjectiles homes it back to the owner) and stop it colliding. Ordinary projectiles
      // are consumed on hit as before.
      if (proj.boomerang) { proj.returning = true; break }
      projectiles.splice(i, 1)
      break
    }
  }
}
