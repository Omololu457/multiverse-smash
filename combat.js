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
import { poolAcquire } from "./pool.js"   // Stage 22C: recycle hit-spark objects (spawned in bursts during ultimates)
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
import { pickSupermanVoice } from "./supermanVoice.js"
import { pickItachiVoice } from "./itachiVoice.js"
// Sukuna voice pack REBUILT 2026-08-04 (sukunaVoice.js/pickSukunaVoice restored; EN+JA dual pools, JA default).
// The preserved offense-connect trigger point (applySukunaOffenseVoice below) is filled back in; hitReact +
// lowHealth hooks added alongside the Maki/Miwa cluster. See imported pickSukunaVoice (line below).
import { pickSaikiVoice } from "./saikiVoice.js"
import { pickSkinVoice } from "./gojoVoice.js"   // per-skin voice override (Gojo "Limitless" young pack)
import { pickZenitsuVoice } from "./zenitsuVoice.js"   // Zenitsu hit-react / offense-bark / low-health voice pools (audio-only)
import { pickRengokuVoice } from "./rengokuVoice.js"   // Rengoku hit-react / offense-bark / low-health voice pools (audio-only)
import { pickShinobuVoice } from "./shinobuVoice.js"   // Shinobu hit-react / offense-bark / low-health voice pools (audio-only)
import { pickInosukeVoice } from "./inosukeVoice.js"   // Inosuke hit-react / offense-bark / low-health voice pools (audio-only)
import { pickNezukoVoice } from "./nezukoVoice.js"   // Nezuko grunt pools (audio-only; muffled — no dialogue, sorted by acoustic characteristics)
import { pickSamuraiVoice } from "./samuraiRedVoice.js"   // Samurai Red Ranger hit-react / offense-bark / low-health voice pools (audio-only)
import { pickGoldSamuraiVoice } from "./goldSamuraiRangerVoice.js"   // Gold Samurai Ranger hit-react / offense-bark voice pools (audio-only)
import { pickVegetaVoice } from "./vegetaVoice.js"   // Vegeta hit-react / offense-bark / low-health voice pools (audio-only; shared across base/SSJ/Blue)
import { pickMakiVoice } from "./makiVoice.js"   // Maki hit-react / offense-bark / low-health voice pools (audio-only, JP dub)
import { pickYujiVoice } from "./yujiVoice.js"   // Yuji hit-react / offense-bark / low-health voice pools (audio-only; EN+JA, JA active)
import { pickMiwaVoice } from "./miwaVoice.js"   // Miwa hit-react / offense-bark / low-health voice pools (audio-only, JP dub)
import { pickMadaraVoice } from "./madaraVoice.js"   // Madara hit-react / offense-bark / low-health voice pools (audio-only, JA)
import { pickObitoVoice } from "./obitoVoice.js"     // Obito hit-react / offense-bark / low-health voice pools (audio-only, JA)
import { pickTobiVoice } from "./tobiVoice.js"       // Tobi (masked Obito alias) general combat-bark pool (audio-only, JA — separate from Obito's)
import { pickZarakiVoice } from "./zarakiVoice.js"   // Zaraki hit / offense-bark / low-health voice pools (audio-only, JA)
import { pickIchigoVoice } from "./ichigoVoice.js"   // Ichigo hit-react / offense-bark / low-health voice pools (audio-only, JA)
import { pickSukunaVoice } from "./sukunaVoice.js"   // Sukuna hit-react / offense-bark / low-health voice pools (audio-only; JA default, EN switchable)
import { pickChrolloVoice } from "./chrolloVoice.js"   // Chrollo hit-react / grunt / offense-bark / taunt / low-health voice pools (audio-only)
import { pickGhostfaceVoice } from "./ghostfaceVoice.js"   // Ghostface hit-react / offense-bark / taunt / low-health voice pools (audio-only)

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

// ── THE ONE DAMAGE CHOKE-POINT (MK-feel Stage 1a) ─────────────────────────────
// Every point of HP removed by an offensive source MUST pass through here so the
// global pacing scale can never be bypassed. Historically summon hits, DOT ticks,
// and the manual-subtract cinematic ultimates (Rick/Kurama/Vegeta/…) subtracted
// `.health` directly and so skipped GLOBAL_DAMAGE_SCALE — creating the balance
// outliers the design review flagged. This function is now the sole writer.
//   applyScaledDamage(target, rawDamage, opts) -> HP actually removed (int)
//     rawDamage : PRE-scale damage. Callers whose value was already scaled
//                 upstream (the combo-scaled melee/projectile path) pass
//                 { scale: 1 } so scale is applied exactly once, never twice.
//     opts.scale : scalar to apply (default GLOBAL_DAMAGE_SCALE).
//     opts.floor : HP clamp floor (default 0; non-lethal costs/chip pass 1).
//     opts.source: label for the __DMG_LOG trace (Stage 1a before/after diff).
// Debug: set globalThis.__DMG_LOG = true to log every application as
//   [DMG] <source> raw=<r> scale=<s> dealt=<d> <before>-><after>
export function applyScaledDamage(target, rawDamage, opts = {}) {
  if (!target) return 0
  //   opts.bypassScale : DELIBERATE escape hatch — apply the raw amount with no global scale
  //                      (equivalent to scale:1). Must be passed on purpose; each use is justified
  //                      in the Stage 1 report. Distinct in intent from callers who pre-scaled
  //                      upstream and pass scale:1 to avoid double-scaling (melee/projectile).
  const scale = opts.bypassScale ? 1
              : opts.scale != null ? opts.scale
              : GLOBAL_DAMAGE_SCALE
  const floor = opts.floor != null ? opts.floor : 0
  const raw   = Math.max(0, rawDamage || 0)
  const dealt = Math.floor(raw * scale)
  const before = target.health || 0
  target.health = Math.max(floor, before - dealt)
  if (typeof globalThis !== "undefined" && globalThis.__DMG_LOG) {
    try {
      console.log(`[DMG] ${opts.source || "?"} raw=${raw} scale=${scale} dealt=${dealt} ${before}->${target.health}`)
    } catch (_) {}
  }
  return before - target.health
}

// Canonical MK-feel name for the single damage choke-point (Stage 1). `applyScaledDamage`
// remains the established name its ~12 call sites use; `applyDamage` is the same function so new
// code + the design spec's contract share one implementation — never a second competing path.
export const applyDamage = applyScaledDamage

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
    // AERIAL HARD — an optional heavy-while-airborne normal. Returns null when a fighter doesn't
    // define one (must NOT fall through to the generic `default` fallback, or every character would
    // sprout a phantom aerial-heavy). Currently: Madara's Susanoo-hand grab.
    case "air_heavy": return b.airHeavy || b.air_heavy || null
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
  // COMBO-FLOW: honor the launcher/spike FLAGS, not just the name. Rekka finishers are named
  // per-stage (barrage4, batCombo3, …) so _catFromName can't see they're launchers — without this
  // they froze at jab weight (HITSTOP.light) despite launching. Fire fns set attack.launcher on the
  // finisher (and md.launcher/spike propagate via createAttackFromMove.category), so this is the ONE
  // place the whole roster's chain finishers get their proper heavy/launcher impact-freeze.
  if (atk.launcher) return HITSTOP.launcher
  if (atk.spike)    return HITSTOP.spike

  const c = atk.category || _catFromName(atk.name)
  return HITSTOP[c] ?? HITSTOP.default
}

export function getSparkCategory(atk) {
  if (!atk) return "light"
  if (atk.isUltimate) return "ultimate"
  if (atk.isSpecial) return "special"
  if (atk.launcher || atk.spike) return "heavy"   // finisher weight: heavy hit-spark, matching getHitstopFrames

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
// PER-CHARACTER CANCEL-WINDOW WIDTH OVERRIDE (combo-flow). By DEFAULT the rekka cancel is open for
// the ENTIRE recovery phase — that shared rule is unchanged for the whole roster. A fighter may set
// `_cancelWindowFrames = W` to NARROW its own acceptance to only the FIRST W frames of recovery: a
// tighter link demanding more precise timing. This is a genuine per-character exception, NOT a change
// to the default — unset (the roster norm) → the full-recovery window exactly as before. It does not
// touch move recovery/punishability; only WHEN inside recovery a cancel is accepted. (Maki uses it:
// her superhuman speed/power is traded against a demanding combo-execution window.)
export function cancelWindowOpen(fighter) {
  if (getAttackPhase(fighter) !== "recovery") return false     // only ever open in recovery
  const W = fighter?._cancelWindowFrames
  if (!(W > 0)) return true                                    // default (unset): the whole recovery phase
  const a = fighter.currentAttack
  const intoRecovery = (a.total - a.timer) - a.activeEnd       // frame # within recovery (1-based: recovery's first frame is 1)
  return intoRecovery <= W                                      // tightened: only the first W frames of recovery link
}

export function getCancelWindow(fighter) {
  const a = fighter?.currentAttack
  if (!a) {
    return { move: fighter?.currentMove || null, phase: "idle", startup: 0, active: 0, recovery: 0,
             elapsed: 0, open: false, windowFrames: 0, cancelInto: fighter?._rekkaNext || null, connected: !!fighter?._cmdHitLanded }
  }
  const phase = getAttackPhase(fighter)
  const recovery = a.total - a.activeEnd
  const W = fighter._cancelWindowFrames
  return {
    move:      fighter.currentMove || a.name || null,
    phase,
    startup:   a.activeStart,                 // frames 0..startup      → startup
    active:    a.activeEnd - a.activeStart,   // frames startup..active → active (hittable)
    recovery,                                 // frames active..end     → recovery (the full recovery span)
    windowFrames: W > 0 ? Math.min(W, recovery) : recovery,  // EFFECTIVE cancel window (narrowed if overridden)
    elapsed:   a.total - a.timer,             // frames into the move so far
    open:      cancelWindowOpen(fighter),     // honours the per-character narrowed window
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
  if (fighter.attacking && fighter._rekkaNext && edge && cancelWindowOpen(fighter) && (!requireHit || fighter._cmdHitLanded)) {
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

// FEEDBACK (Ben 10 Conductoid) — ENERGY ABSORPTION reactive counter. Unlike Sasuke's toggle, this is a
// TIMED counter WINDOW opened by the neutral Special (abilities.fireFbEnergyAbsorb sets _fbAbsorbWindow).
// If an incoming hit (melee OR projectile) lands DURING the window, it is ABSORBED — full negate, no
// damage — and Feedback gains energy from the absorbed blow, then a discharge is STAMPED (_fbAbsorbPending)
// for the ability layer to fire back amplified next frame (updateBen10CommandCombat). Whiff (no hit in the
// window) = nothing absorbed, normal recovery. The window is ticked/expired in updateBen10CommandCombat.
// Guarded to the feedback form so a stale flag on another alien can't absorb. incomingDmg scales the redirect.
export const FB_ABSORB_REFUND = 20   // energy gained from absorbing a hit (the "absorption" payoff)
export function shouldFeedbackAbsorb(defender, incomingDmg = 40) {
  if (!defender || (defender._fbAbsorbWindow || 0) <= 0) return false
  if ((defender.activeAlien || "").toLowerCase() !== "feedback") return false
  defender._fbAbsorbWindow = 0                       // one absorb per window — consume it
  defender._fbAbsorbPending = { dmg: Math.max(20, incomingDmg | 0) }   // ability layer fires the redirect
  defender.energy = Math.min(defender.maxEnergy || 100, (defender.energy || 0) + FB_ABSORB_REFUND)
  defender.teleportFlash = Math.max(defender.teleportFlash || 0, 10)
  defender.colorFlash = Math.max(defender.colorFlash || 0, 10)
  return true
}

// RENGOKU — COUNTER reactive parry/riposte. A TIMED window opened by the neutral Special
// (abilities.executeRengokuSpecial sets _rengokuCountering, ticked down in game.updateMiscTimers).
// If an incoming MELEE hit lands DURING the window it is NEGATED (no damage) and Rengoku RIPOSTES: the
// attacker is stunned + shoved + its swing cancelled + takes flat flame damage, while Rengoku gets brief
// i-frames + a parry flash + his flame-release pose. Mirrors shouldFeedbackAbsorb (same negate-in-
// resolveAttackHit shape) + checkParry's attacker-stun. One riposte per window (flag consumed). Guarded
// to rengoku so a stale flag on anyone else can't counter.
export const RENGOKU_RIPOSTE_DMG = 70
export function shouldRengokuCounter(defender, attacker) {
  if (!defender || !attacker || (defender._rengokuCountering || 0) <= 0) return false
  if ((defender.rosterKey || "").toLowerCase() !== "rengoku") return false
  defender._rengokuCountering = 0                                  // one riposte per window — consume it
  attacker.hitstun = Math.max(attacker.hitstun || 0, 30)           // stun + shove the attacker, cancel its swing
  attacker.vx = -(attacker.facing || 1) * 7
  attacker.attacking = false; attacker.currentAttack = null
  applyScaledDamage(attacker, RENGOKU_RIPOSTE_DMG, { source: "rengoku-riposte" })   // flat flaming riposte (now scaled like every other damage source)
  defender.invulnTimer = Math.max(defender.invulnTimer || 0, 10)   // Rengoku: brief i-frames + flash + flame pose
  defender.parryFlash  = Math.max(defender.parryFlash || 0, 12)
  defender.attackCooldown = 0
  defender._spriteCastMove = "rengokuCharge1"; defender._spriteCastTimer = 16
  return true
}

// NEZUKO — Counter Stance riposte (Down+Special). Same architecture as shouldRengokuCounter: an incoming
// melee hit during the _nzCountering window is NEGATED and riposted (attacker stunned + shoved + swing
// cancelled + flat damage), Nezuko gets brief i-frames + a parry flash. One riposte per window. Guarded to
// nezuko so a stale flag elsewhere can't counter.
export const NEZUKO_RIPOSTE_DMG = 78
export function shouldNezukoCounter(defender, attacker) {
  if (!defender || !attacker || (defender._nzCountering || 0) <= 0) return false
  if ((defender.rosterKey || "").toLowerCase() !== "nezuko") return false
  defender._nzCountering = 0                                       // one riposte per window — consume it
  attacker.hitstun = Math.max(attacker.hitstun || 0, 30)          // stun + shove the attacker, cancel its swing
  attacker.vx = -(attacker.facing || 1) * 7
  attacker.attacking = false; attacker.currentAttack = null
  applyScaledDamage(attacker, NEZUKO_RIPOSTE_DMG, { source: "nezuko-riposte" })   // flat riposte (now scaled like every other damage source)
  defender.invulnTimer = Math.max(defender.invulnTimer || 0, 10)  // brief i-frames + flash
  defender.parryFlash  = Math.max(defender.parryFlash || 0, 12)
  defender.attackCooldown = 0
  defender._spriteCastMove = "nezukoCounter"; defender._spriteCastTimer = 16
  return true
}

// GHOSTFACE — JILL identity bait-counter. Reliable reactive counter (fires when a hit LANDS, like
// shouldRengokuCounter — NOT the unreachable checkParry path). While Jill stands in her neutral IDLE
// stance (not attacking / blocking / hurt / airborne / already knocked down) an incoming melee attack is
// negated and the attacker is stunned + shoved. Cooldown-gated (_jillCounterCd, ticked in updateCombat)
// so it's a BAIT — she can be pressured after a counter, not a permanent auto-block. No-op for every
// other fighter / identity (gated on the Jill skin modifier). Faster/more-forgiving than the other four
// identities by construction (only Jill has it, and it needs no input).
const JILL_COUNTER_CD = 72   // ~1.2s between free counters — the exploitable gap the opponent baits out
function shouldGhostfaceJillCounter(defender, attacker, hitSparks) {
  if (!defender || !attacker || !defender._gfSkinMod?.jillCounter) return false
  if ((defender._jillCounterCd || 0) > 0) return false
  // must be standing in her open "bait" stance (true neutral idle), grounded
  if (defender.attacking || defender.isBlocking || (defender.hitstun || 0) > 0 ||
      defender.knockdownState || !(defender.onGround ?? defender.grounded ?? true)) return false
  defender._jillCounterCd = JILL_COUNTER_CD
  attacker.hitstun = Math.max(attacker.hitstun || 0, 28)          // stun + shove the attacker, cancel its swing
  attacker.vx = -(attacker.facing || 1) * 7
  attacker.attacking = false; attacker.currentAttack = null
  defender.invulnTimer = Math.max(defender.invulnTimer || 0, 10)  // brief i-frames + parry flash
  defender.parryFlash  = Math.max(defender.parryFlash || 0, 12)
  defender.attackCooldown = 0
  const mx = ((attacker.x + attacker.w / 2) + (defender.x + defender.w / 2)) / 2
  const my = ((attacker.y + attacker.h / 2) + (defender.y + defender.h / 2)) / 2
  if (Array.isArray(hitSparks)) hitSparks.push(Object.assign(poolAcquire("spark"), { x: mx, y: my, timer: 20, maxTimer: 20, category: "parry", color: "#e0457b", lines: 12, radius: 30 }))
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

// ── CHROLLO LUCILFER VOICE LINES (audio-only; Japanese pack) ──
// DEFENDER reaction, split by tier (Shinobu precedent): a LIGHT hit → exertion grunt; a HEAVY hit →
// surprise/pain pool ("Misjudged" / "More than expected" / "Tough"). One line per _hitVoiceCd window;
// unblocked hits only. Chrollo has a SEPARATE low-health pool (below).
function applyChrolloHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "chrollo" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  const pool = cat === "light" ? "grunt" : "hitReact"
  try { sound?.playSfxFile?.(pickChrolloVoice(pool), null) } catch (_) {}
}

// ATTACKER connect — combat barks ("Above" / "Can you dodge?" / "Curtain fall") on a HEAVY connect OR a
// long BASIC light string, with a ~30% chance to swap in a dismissive TAUNT one-liner ("Too bad" /
// "Useless" / "Is this all?") instead (Killua/Hisoka "taunt rides offense-connect" precedent). Chrollo's
// specials/ultimate fire their OWN cast lines and set _atkVoiceCd, so they're excluded here. Shared
// _atkVoiceCd → one line per window; blocked suppresses it.
function applyChrolloOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "chrollo" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  const pool = Math.random() < 0.3 ? "tauntCombat" : "combatBark"
  try { sound?.playSfxFile?.(pickChrolloVoice(pool), null) } catch (_) {}
}

// LOW-HEALTH bark — "The spider doesn't die" — fires ONCE the first time Chrollo drops to/below the
// threshold (same pattern as Gon/Naruto/Itachi). A thematic comeback line.
const CHROLLO_LOW_HEALTH_RATIO = 0.25
function applyChrolloLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "chrollo" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * CHROLLO_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickChrolloVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── GHOSTFACE VOICE LINES (audio-only; English MK1 pack) — mirrors the Chrollo shape ──
// DEFENDER reaction: any unblocked hit → a "hitReact" one-liner ("Where'd you learn to punch like
// that?" / "Now that's scary" / "Feeling woozy"). One line per _hitVoiceCd window. Ghostface's
// discarded grunts stay SFX (not a pool), so there's no light/heavy split — a single hitReact pool.
function applyGhostfaceHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "ghostface" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickGhostfaceVoice("hitReact"), null) } catch (_) {}
}

// ATTACKER connect — combat barks on a HEAVY connect OR a long BASIC light string, with ~30% chance
// to swap in a taunt one-liner instead (Killua/Hisoka/Chrollo "taunt rides offense-connect" precedent).
// Knife specials + the ultimate fire their OWN specialCast lines and set _atkVoiceCd → excluded here.
function applyGhostfaceOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "ghostface" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  const pool = Math.random() < 0.3 ? "taunt" : "combatBark"
  try { sound?.playSfxFile?.(pickGhostfaceVoice(pool), null) } catch (_) {}
}

// LOW-HEALTH bark — "I'll survive. I always do." / "We're only in the first reel." — fires ONCE the
// first time Ghostface drops to/below the threshold (same pattern as Chrollo/Gon/Naruto).
const GHOSTFACE_LOW_HEALTH_RATIO = 0.25
function applyGhostfaceLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "ghostface" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * GHOSTFACE_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickGhostfaceVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── ZENITSU AGATSUMA VOICE LINES (audio-only; Japanese Demon Slayer pack) ──
// DEFENDER reaction — panicked pool ("No way!", "Damn it!", "I got hit!"). One line per _hitVoiceCd
// window; unblocked hits only. Zenitsu has a SEPARATE low-health pool (below).
function applyZenitsuHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "zenitsu" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickZenitsuVoice("hitReact"), null) } catch (_) {}
}

// ATTACKER connect — combat/determination barks ("This is it, here I go!", "Counterattack!", "I won't
// give up!") on a HEAVY connect OR a long BASIC light string. Zenitsu has NO taunt action (enrolling him
// in the universal heal-taunt would change gameplay — excluded here), so his DETERMINATION one-liners
// fold into this same offense-connect pool (Gon/Killua precedent). His SPECIALS (Thunderclap, Double
// Attack, Godspeed ult) fire their OWN cast lines and set _atkVoiceCd on cast, so they're excluded here
// (no cast+connect double). Shared _atkVoiceCd → one line per window; blocked suppresses it.
function applyZenitsuOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "zenitsu" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickZenitsuVoice("combatBark"), null) } catch (_) {}
}

// LOW-HEALTH bark — "This can't be done yet!" — fires ONCE the first time Zenitsu drops to/below the
// threshold (same pattern as Gon/Naruto/Itachi). Random pick (single-entry pool).
const ZENITSU_LOW_HEALTH_RATIO = 0.25
function applyZenitsuLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "zenitsu" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * ZENITSU_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickZenitsuVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── KYOJURO RENGOKU VOICE LINES (audio-only; Japanese Demon Slayer pack) ──
// DEFENDER reaction — effort-grunt cluster (grunt_1 … grunt_15). One line per _hitVoiceCd window;
// unblocked hits only. Rengoku has a SEPARATE low-health pool (below).
function applyRengokuHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "rengoku" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickRengokuVoice("hitReact"), null) } catch (_) {}
}

// ATTACKER connect — flame/determination barks ("Burn it all away!", "Perish!", "Take the fall properly!",
// + the taunt-less char's TAUNT-COMBAT lines "Come at me" / "Feel free to strike") on a HEAVY connect OR a
// long BASIC light string. Rengoku has NO taunt action (enrolling him in the universal heal-taunt would
// change gameplay — excluded here), so the taunt-combat one-liners fold into this offense pool (Zenitsu/
// Gon precedent). His FLAME specials (super-finishers, Charged Flame Strike, Counter, Ultimate) fire their
// OWN cast lines and set _atkVoiceCd on cast, so they're excluded here (no cast+connect double). Shared
// _atkVoiceCd → one line per window; blocked suppresses it.
function applyRengokuOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "rengoku" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickRengokuVoice("combatBark"), null) } catch (_) {}
}

// LOW-HEALTH bark — "I'm feeling energized!" / "Unbelievable!" / "That's enough!" — fires ONCE the first
// time Rengoku drops to/below the threshold (same pattern as Gon/Zenitsu/Naruto). Random pick.
const RENGOKU_LOW_HEALTH_RATIO = 0.25
function applyRengokuLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "rengoku" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * RENGOKU_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickRengokuVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── VEGETA VOICE LINES (audio-only; FighterZ pack, shared across base/SSJ/Blue) ──
// DEFENDER reaction on an unblocked hit ("Damn you!" / "Ridiculous!"); one line per _hitVoiceCd window.
// Form-agnostic — fires the same pool whatever tier Vegeta is in (see vegetaVoice.js).
const VEGETA_LOW_HEALTH_RATIO = 0.25
function applyVegetaHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "vegeta" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickVegetaVoice("hitReact"), null) } catch (_) {}
}
// ATTACKER combat bark on a HEAVY / long-string connect (his taunt trash-talk is folded in here — no taunt action).
function applyVegetaOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "vegeta" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickVegetaVoice("combatBark"), null) } catch (_) {}
}
// LOW-HEALTH once, on crossing the threshold ("Impossible!" / "Where does all that power come from?").
function applyVegetaLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "vegeta" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * VEGETA_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickVegetaVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── MAKI ZENIN VOICE LINES (audio-only; Japanese JJK dub) ──
// DEFENDER reaction on an unblocked hit; ATTACKER combat bark on a heavy/long-string connect (no taunt
// action → taunt lines live in the intro pool, not here); LOW-HEALTH once on crossing the line. The
// low-HP threshold is 0.30 (a touch ABOVE the ≤25% Shibuya-unlock gate) so the "still moving" bark lands
// slightly BEFORE she's transform-eligible — the "turn it around" transform cue is a separate pool fired
// at the Shibuya cast beat (abilities.executeMakiShibuyaUltimate), so the two never collide.
const MAKI_LOW_HEALTH_RATIO = 0.30
function applyMakiHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "maki" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickMakiVoice("hitReact"), null) } catch (_) {}
}
function applyMakiOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "maki" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickMakiVoice("combatBark"), null) } catch (_) {}
}
function applyMakiLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "maki" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * MAKI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickMakiVoice("lowHealth"), null) } catch (_) {}
  }
}
// YUJI voice (same shape as Maki; audio-only, EN+JA sets with JA active). Reuses MAKI_LOW_HEALTH_RATIO (0.30).
// Cast lines (cursed-energy Y specials + Black Flash ult) live in abilities.js; here = hit / offense / low-health.
function applyYujiHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "yuji" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickYujiVoice("hitReact"), null) } catch (_) {}
}
function applyYujiOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "yuji" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"     // Divergent Fist heavy carries the "Divergent!" line inside the offense pool
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickYujiVoice("offense"), null) } catch (_) {}
}
function applyYujiLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "yuji" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * MAKI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickYujiVoice("lowHealth"), null) } catch (_) {}
  }
}
// MIWA voice (same shape as Maki; JP-dub, audio-only). Reuses MAKI_LOW_HEALTH_RATIO (0.30).
function applyMiwaHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "miwa" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickMiwaVoice("hitReact"), null) } catch (_) {}
}
function applyMiwaOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "miwa" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickMiwaVoice("combatBark"), null) } catch (_) {}
}
function applyMiwaLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "miwa" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * MAKI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickMiwaVoice("lowHealth"), null) } catch (_) {}
  }
}
// MADARA voice (audio-only, JA) — mirrors the Miwa hit/offense/low-health hooks; cast lines live on his
// specials/ult (abilities.js). No-op for every other fighter.
function applyMadaraHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "madara" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickMadaraVoice("hitReact"), null) } catch (_) {}
}
function applyMadaraOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "madara" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickMadaraVoice("combatBark"), null) } catch (_) {}
}
function applyMadaraLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "madara" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * MAKI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickMadaraVoice("lowHealth"), null) } catch (_) {}
  }
}
// OBITO voice (audio-only, JA) — mirrors the Madara hit/offense/low-health hooks; cast lines live on his
// specials/ult + the Kamui-intangibility toggle (abilities.js). No-op for every other fighter.
function applyObitoHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "obito" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickObitoVoice("hitReact"), null) } catch (_) {}
}
function applyObitoOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "obito" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickObitoVoice("combatBark"), null) } catch (_) {}
}
// TOBI (masked Obito alias) — general combat bark on a heavy / long-string connect. Own pool, no coupling
// to Obito. Specials + ult use their own cast lines (they set _atkVoiceCd so they don't also bark here).
function applyTobiOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "tobi" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickTobiVoice("combatBark"), null) } catch (_) {}
}
function applyObitoLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "obito" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * MAKI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickObitoVoice("lowHealth"), null) } catch (_) {}
  }
}
// ICHIGO voice (audio-only, JA) — mirrors the Madara hit/offense/low-health hooks; cast lines live on his
// specials/ult/rekka (abilities.js). No-op for every other fighter.
function applyIchigoHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "ichigo" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickIchigoVoice("hitReact"), null) } catch (_) {}
}
function applyIchigoOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "ichigo" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickIchigoVoice("combatBark"), null) } catch (_) {}
}
function applyIchigoLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "ichigo" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * MAKI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickIchigoVoice("lowHealth"), null) } catch (_) {}
  }
}
// ZARAKI voice (audio-only, JA) — mirrors the Madara/Ichigo hit/offense/low-health hooks; cast lines (Shikai/
// Bankai/Yachiru) live in abilities.js. Covers BOTH Zaraki entries (base + the dedicated Shikai char). No-op for everyone else.
function isZarakiKey(f) { const k = (f?.rosterKey || "").toLowerCase(); return k === "zaraki" || k === "zaraki_shikai" }
function applyZarakiHitVoice(defender, cat, dmg) {
  if (!isZarakiKey(defender) || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickZarakiVoice("hit"), null) } catch (_) {}
}
function applyZarakiOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !isZarakiKey(attacker) || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickZarakiVoice("offense"), null) } catch (_) {}
}
function applyZarakiLowHealthVoice(defender) {
  if (!isZarakiKey(defender) || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * MAKI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickZarakiVoice("lowHealth"), null) } catch (_) {}
  }
}
// SUKUNA voice (same shape as Maki/Miwa; JA default, EN switchable — audio-only). Reuses MAKI_LOW_HEALTH_RATIO (0.30).
// Sukuna is ENTERTAINED by a good hit rather than hurt, so `hitReact` reads as approval ("Nice attack." / "More!").
function applySukunaHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "sukuna" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickSukunaVoice("hitReact"), null) } catch (_) {}
}
// offense-connect bark lives at the PRESERVED trigger point below (applySukunaOffenseVoice, was a no-op stub
// from the pack deletion — now rebuilt in place, reusing its existing dispatch in resolveAttackHit).
function applySukunaLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "sukuna" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * MAKI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickSukunaVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── SHINOBU KOCHO VOICE LINES (audio-only; Japanese Demon Slayer pack) ──
// DEFENDER reaction — split by hit strength: STRONG hits (heavy/special/ultimate/launcher/spike) draw the
// reaction pool ("Dangerous!" / "Why would you?"); LIGHT hits draw the exertion grunt cluster. One line
// per _hitVoiceCd window; unblocked hits only. Low-health has a SEPARATE pool (below).
function applyShinobuHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "shinobu" || (defender._hitVoiceCd > 0)) return
  const strong = cat === "heavy" || cat === "special" || cat === "ultimate" || cat === "launcher" || cat === "spike" || (dmg || 0) >= 55
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickShinobuVoice(strong ? "hitReact" : "hitGrunt"), null) } catch (_) {}
}

// ATTACKER connect — general combat bark ("Here I go!") on a HEAVY connect OR a long BASIC light string.
// Her poison/dance specials + ultimate fire their OWN cast lines and set _atkVoiceCd on cast, so they're
// excluded here (no cast+connect double). Shared _atkVoiceCd → one line per window; blocked suppresses it.
function applyShinobuOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "shinobu" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickShinobuVoice("combatBark"), null) } catch (_) {}
}

// LOW-HEALTH bark — "This is... oh no." — fires ONCE the first time Shinobu drops to/below the threshold
// (same pattern as Rengoku/Gon/Zenitsu). Random pick (single clip here).
const SHINOBU_LOW_HEALTH_RATIO = 0.25
function applyShinobuLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "shinobu" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 960
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * SHINOBU_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickShinobuVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── INOSUKE HASHIBIRA VOICE LINES (audio-only; Japanese Demon Slayer / Hinokami Chronicles pack) ──
// DEFENDER reaction — split by hit strength: STRONG hits (heavy/special/ultimate/launcher/spike/≥55) draw
// the reaction pool ("What the hell?!" / "Don't screw with me!"); LIGHT hits draw the exertion grunt
// cluster. One line per _hitVoiceCd window; unblocked hits only. Low-health has a SEPARATE pool (below).
function applyInosukeHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "inosuke" || (defender._hitVoiceCd > 0)) return
  const strong = cat === "heavy" || cat === "special" || cat === "ultimate" || cat === "launcher" || cat === "spike" || (dmg || 0) >= 55
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickInosukeVoice(strong ? "hitReact" : "hitGrunt"), null) } catch (_) {}
}

// ATTACKER connect — general combat bark ("I got it!" / "Prepare yourself!") on a HEAVY connect OR a long
// BASIC light string. His Beast-Breathing cinematic specials + Assist fire their OWN cast lines and set
// _atkVoiceCd on cast, so they're excluded here (no cast+connect double). Shared _atkVoiceCd → one line
// per window; blocked suppresses it.
function applyInosukeOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "inosuke" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickInosukeVoice("combatBark"), null) } catch (_) {}
}

// LOW-HEALTH bark — "I won't lose." / "Don't underestimate me!" — fires ONCE the first time Inosuke drops
// to/below the threshold (same pattern as Shinobu/Rengoku/Gon/Zenitsu). Random pick.
const INOSUKE_LOW_HEALTH_RATIO = 0.25
function applyInosukeLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "inosuke" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1040
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * INOSUKE_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickInosukeVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── NEZUKO KAMADO GRUNT LINES (audio-only; muffled grunts — no dialogue, sorted by acoustic characteristics) ──
// DEFENDER reaction — split by hit strength: STRONG hits draw the bright/sharp hitReact grunts; LIGHT hits draw
// the short hitGrunt cluster. One line per _hitVoiceCd window; unblocked hits only. Low-health = separate pool.
function applyNezukoHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "nezuko" || (defender._hitVoiceCd > 0)) return
  const strong = cat === "heavy" || cat === "special" || cat === "ultimate" || cat === "launcher" || cat === "spike" || (dmg || 0) >= 55
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickNezukoVoice(strong ? "hitReact" : "hitGrunt"), null) } catch (_) {}
}
// ATTACKER connect — combat/taunt bark on a HEAVY connect OR a long BASIC light string. Shared _atkVoiceCd →
// one line per window; blocked suppresses it. (Nezuko's specials/ults have no separate cast lines — she's muffled.)
function applyNezukoOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "nezuko" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickNezukoVoice("combatBark"), null) } catch (_) {}
}
// LOW-HEALTH grunt — fires ONCE the first time Nezuko drops to/below the threshold (same pattern as siblings).
const NEZUKO_LOW_HEALTH_RATIO = 0.25
function applyNezukoLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "nezuko" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1020
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * NEZUKO_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickNezukoVoice("lowHealth"), null) } catch (_) {}
  }
}

// ── SAMURAI RED RANGER VOICE LINES (audio-only; English Power Rangers Samurai pack) ──
// DEFENDER reaction — general hit-react line ("What in the world?!"). One line per _hitVoiceCd window;
// unblocked hits only. Low-health has a SEPARATE pool (below).
function applySamuraiHitVoice(defender, cat, dmg) {
  if (!defender || (defender._hitVoiceCd > 0)) return
  const rk = (defender.rosterKey || "").toLowerCase()
  let clip = null
  if (rk === "samurai_red_ranger") clip = pickSamuraiVoice("hitReact")
  else if (rk === "gold_samurai_ranger") clip = pickGoldSamuraiVoice("hitReact")
  else return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(clip, null) } catch (_) {}
}

// ATTACKER connect — combat bark ("I'll take that." / "Finish this!") on a HEAVY connect OR a long BASIC
// light string. His Flame Slash special, Flame-Chain finisher, Mega activation + ultimate fire their OWN
// cast lines and set _atkVoiceCd on cast, so they're excluded here (no cast+connect double). Shared
// _atkVoiceCd → one line per window; blocked suppresses it.
function applySamuraiOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker._atkVoiceCd > 0)) return
  const rk = (attacker.rosterKey || "").toLowerCase()
  if (rk !== "samurai_red_ranger" && rk !== "gold_samurai_ranger") return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  const clip = rk === "gold_samurai_ranger" ? pickGoldSamuraiVoice("combatBark") : pickSamuraiVoice("combatBark")
  try { sound?.playSfxFile?.(clip, null) } catch (_) {}
}

// LOW-HEALTH bark — "Better backpedal." — fires ONCE the first time the Samurai drops to/below the
// threshold (same pattern as Rengoku/Shinobu/Gon). Random pick (single clip here).
const SAMURAI_LOW_HEALTH_RATIO = 0.25
function applySamuraiLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "samurai_red_ranger" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1090
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * SAMURAI_LOW_HEALTH_RATIO) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickSamuraiVoice("lowHealth"), null) } catch (_) {}
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

// ── SUPERMAN VOICE LINES ── (Injustice 2 pack; audio-only, no gameplay effect). Same three combat hooks
// as Omni-Man/Batman: DEFENDER hit-reaction (effort-grunt set), ATTACKER confident trash-talk on a
// strong/long connect (the taunt pool rides the connect trigger), and a once-only low-HP defiance line.
// See supermanVoice.js.
function applySupermanHitVoice(defender, cat, dmg) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "superman" || (defender._hitVoiceCd > 0)) return
  defender._hitVoiceCd = 150
  try { sound?.playSfxFile?.(pickSupermanVoice("hitReact"), null) } catch (_) {}
}
function applySupermanOffenseVoice(attacker, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "superman" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy" || cat === "special" || cat === "ultimate"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickSupermanVoice("taunt"), null) } catch (_) {}
}
function applySupermanLowHealthVoice(defender) {
  if (!defender || (defender.rosterKey || "").toLowerCase() !== "superman" || defender._lowHealthVoiceDone) return
  const max = defender.maxHealth || 1000
  const hp  = defender.health || 0
  if (hp > 0 && hp <= max * 0.30) {
    defender._lowHealthVoiceDone = true
    try { sound?.playSfxFile?.(pickSupermanVoice("lowHealth"), null) } catch (_) {}
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

// ── SUKUNA VOICE — pack REBUILT 2026-08-04 (sukunaVoice.js; EN+JA dual pools, JA default). This offense-
// connect hook is the preserved TRIGGER POINT restored in place: it fires on every unblocked Sukuna connect
// and, on a HEAVY or long-combo connect, plays a contemptuous offense bark ("Take this." / "Drop dead." /
// "Die."). His cast/domain lines fire from their own hooks in abilities.js/domains.js and set _atkVoiceCd, so
// this is throttled by the shared _atkVoiceCd (one line / 150f window) to avoid a cast+connect double.
// `defender` is unused here (kept for the preserved dispatch signature).
function applySukunaOffenseVoice(attacker, defender, cat, unblocked) {
  if (!unblocked || !attacker || (attacker.rosterKey || "").toLowerCase() !== "sukuna" || (attacker._atkVoiceCd > 0)) return
  const strong     = cat === "heavy"
  const longString = (attacker.comboCounter || 0) >= NARUTO_COMBO_BURST_MIN
  if (!strong && !longString) return
  attacker._atkVoiceCd = 150
  try { sound?.playSfxFile?.(pickSukunaVoice("offense"), null) } catch (_) {}
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
    hitSparks.push(Object.assign(poolAcquire("spark"), {
      x: mx,
      y: my,
      timer: 20,
      maxTimer: 20,
      category: "parry",
      color: "#38bdf8",
      lines: 12,
      radius: 32
    }))
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
    hitSparks.push(Object.assign(poolAcquire("spark"), {
      x: mx,
      y: my,
      timer: 25,
      maxTimer: 25,
      category: "clash",
      color: "#ffffff",
      lines: 20,
      radius: 48
    }))
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

  // NON-DAMAGE PULL-TOWARD-CASTER PAYLOAD (Hisoka Bungee Gum Pull): a sticky-elastic command-grab that
  // REELS the foe IN to a point right in front of the attacker — the mirror-opposite of the Obito
  // `_grabTeleport` warp-AWAY. Stamped per-instance at connect as attacker._grabPull = { gap, hitstun,
  // dmg }. Unlike the other payloads (applied only at release), this EASES defender.x toward the reel
  // point every held frame so the drag is VISIBLE (a gum reel-in, not an instant warp); combat.js:2403
  // skips all defender physics while grabbed, so this easing is the sole mover — nothing fights it. The
  // reel point is recomputed LIVE from the attacker's CURRENT position/facing (the foe stays stuck in
  // front of the caster even if he steps), so no stale world coords are needed here. Stamp-and-clear so
  // a themed value never leaks into the attacker's next generic grab (same discipline as _grabThrowDmg).
  if (attacker && attacker._grabPull) {
    const pull  = attacker._grabPull
    const face  = attacker.facing || 1
    const gap   = pull.gap || 46
    const destX = (attacker.x + (attacker.w || 60) / 2) + face * gap - (defender.w || 60) / 2   // just in front of the caster, live
    defender.vx = 0
    defender.vy = 0
    defender.x += (destX - defender.x) * 0.34        // elastic ease-in (fast, then settling) — the rubbery reel
    defender.grabTimer--
    if (defender.grabTimer <= 0) {
      defender.isGrabbed = false
      attacker._grabPull  = null
      defender.x  = destX                             // snap-settle exactly in front of the attacker
      defender.vx = 0
      defender.vy = 0
      const dmg = pull.dmg || 0                        // pull is the payload → only light chip, not a throw
      if (dmg > 0) applyScaledDamage(defender, dmg, { source: "grab-pull" })
      defender.hitstun    = pull.hitstun || 18         // left briefly stunned in the attacker's face (mixup setup)
      defender.colorFlash = 8
      try { sound?.play?.(SFX?.HIT_LIGHT) } catch (_) {}
      if (defender.health <= 0) { try { sound?.play?.(SFX?.KO) } catch (_) {} }
    }
    return
  }

  defender.vx = 0
  defender.vy = 0
  defender.grabTimer--

  if (defender.grabTimer <= 0) {
    defender.isGrabbed = false
    // NON-DAMAGE POSITION-MANIPULATION PAYLOAD (Obito Kamui grab): a themed command-grab can stamp
    // `attacker._grabTeleport = { destX, dropH }` at connect. When present, the release WARPS the
    // defender to that stamped far point instead of the damage-throw — reusing the launcher pop-up/drop
    // fields (like rickPortalReposition), NO damage. Stamp-and-clear, exactly like _grabThrowDmg below,
    // so it never leaks into the attacker's next generic grab. destX is pre-computed in abilities.js
    // (world width lives there — combat.js doesn't import abilities.js).
    if (attacker && attacker._grabTeleport) {
      const tp = attacker._grabTeleport
      attacker._grabTeleport = null
      const floor = defender.groundY != null ? defender.groundY : (defender.y + (defender.h || 100))
      defender.x         = tp.destX
      defender.y         = floor - (defender.h || 100) - (tp.dropH || 40)   // reappear above → drop in
      defender.vx        = 0
      defender.vy        = 0
      defender.onGround  = false
      defender.grounded  = false
      defender.isLaunched = true
      defender.jumpCount = 0
      defender.hitstun   = 18          // briefly helpless through the warp/drop (no damage)
      defender.teleportFlash = 14
      defender.colorFlash = 8
      try { sound?.play?.(SFX?.WHOOSH || SFX?.HIT_LIGHT) } catch (_) {}
      return
    }
    defender.vy = -14
    defender.vx = (attacker?.facing || 1) * 9
    defender.onGround = false
    defender.isLaunched = true
    // Throw damage is normally the shared flat 90, but a themed command-grab (e.g. the Uchiha
    // Susanoo grab) can stamp `_grabThrowDmg` on the attacker to deal its own tuned amount. Cleared
    // right after so a custom value never leaks into the attacker's next (generic) grab.
    const throwDmg = (attacker && attacker._grabThrowDmg) || 90
    applyScaledDamage(defender, throwDmg, { source: "grab-throw" })
    if (attacker) attacker._grabThrowDmg = 0
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
    // UP-ATTACK per-character launch tuning (optional). When a move declares its
    // own launch velocities, resolveAttackHit passes them to physics.launcherAttack
    // in EXACT mode (bypassing the -17 floor): launchVy = enemy pop velocity,
    // selfVy = the attacker's slightly-lower self-lift. Absent → legacy floor pop.
    launchVy: moveData.launchVy ?? null,
    selfVy: moveData.selfVy ?? null,
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

// SKILL HUNTER unlock tracking (Chrollo, Stage 5). When the OPPONENT lands a CLEAN (non-blocked) hit on
// an untransformed Chrollo, record the connecting move's IDENTITY. Once 3 DISTINCT moves have landed,
// set `_shUnlocked` (the gate to activate the Skill Hunter ultimate). A Set dedups, so the SAME move
// repeated does NOT count — 3 DIFFERENT moves do. Only tracks while Chrollo is himself (rosterKey ===
// "chrollo" and not mid-copy); the unlock is consumed + the Set cleared on activation (must re-earn).
// Called from both the melee (resolveAttackHit) and projectile (resolveProjectileHitsMulti) clean-hit sites.
export function trackSkillHunterUnlock(defender, attacker, moveName, blocked) {
  if (blocked || !moveName || !defender || defender === attacker) return
  if ((defender.rosterKey || "") !== "chrollo" || defender._shActive) return
  const seen = (defender._shMovesSeen ||= new Set())
  seen.add(moveName)
  if (seen.size >= 3) defender._shUnlocked = true
}

// BANDIT'S ECHO mark tracking (Chrollo, Stage 2). COEXISTS with Skill Hunter but is FULLY INDEPENDENT —
// separate trigger, separate `_beMark` state, separate activation (see Stage 3). When the OPPONENT lands a
// CLEAN (non-blocked) SPECIAL or ULTIMATE on an untransformed Chrollo, that exact move becomes "marked".
// Only the single MOST-RECENTLY-landed marked move is copyable — a newer special/ultimate OVERWRITES the
// previous mark. Unlike Skill Hunter's 3-distinct-move unlock, ONE qualifying connect marks (the connect
// itself satisfies both "trigger" and "must have already hit you"). `move` is the connecting attack/
// projectile object (read for isSpecial/isUltimate/name); `attacker` supplies the source kit + direction.
// Called from the SAME melee + projectile clean-hit sites as trackSkillHunterUnlock (additive, no shared
// state). Only marks while Chrollo is himself (rosterKey "chrollo", not mid-Skill-Hunter, not mid-Echo).
// `fromProjectile` distinguishes the two sites: MELEE only qualifies when the connecting attack is flagged
// isSpecial/isUltimate (normals never are). PROJECTILE connects are treated as special-tier by default —
// normals are always melee, so any damaging opponent projectile is a special or ultimate. This is
// deliberate: many marquee projectile specials (Kamehameha / Rasengan / Galick Gun) never set proj.isSpecial,
// so keying purely off that flag would silently miss them — breaking the spec's "projectile specials" case.
export function trackBanditEchoMark(defender, attacker, move, blocked, fromProjectile = false) {
  if (blocked || !move || !attacker || !defender || defender === attacker) return
  if ((defender.rosterKey || "") !== "chrollo" || defender._shActive || defender._beActive) return
  const isUlt  = !!move.isUltimate
  const isSpec = !!move.isSpecial || (fromProjectile && !isUlt)      // projectile ⇒ special-tier unless flagged ultimate
  if (!isUlt && !isSpec) return                                      // ONLY specials / ultimates qualify
  const rosterKey = (attacker.rosterKey || attacker.id || "").toLowerCase()
  if (!rosterKey || rosterKey === "chrollo") return                  // need a real, non-mirror source kit
  defender._beMark = {                                               // OVERWRITE any prior mark
    rosterKey,
    isUltimate:  isUlt,
    moveName:    move.name || (isUlt ? "ultimate" : "special"),
    dir:         attacker._specialHeldDir || null,   // best-effort branch (Stage 3 reproduces the exact variant)
    displayName: attacker.name || rosterKey,
  }
}

export function resolveAttackHit(attacker, defender, hitEffects = null, options = {}) {
  const { stageWidth = 3200, damageNumbers = null } = options

  if (!attacker?.currentAttack || attacker.currentAttack.hasHit) return
  if (!attackIsActive(attacker.currentAttack)) return

  if (checkParry(defender, attacker, hitEffects)) return

  const hitbox = getAttackHitbox(attacker)
  const hurtbox = getHurtbox(defender)
  if (!rectsOverlap(hitbox, hurtbox)) return

  // NEZUKO — Counter Stance (Down+Special) takes priority over EVERYTHING (block/crouch/invuln): a hit that
  // overlaps her during the window is negated + riposted. Checked here at the top so the down-hold that arms
  // it (Block+Special) can't first route the hit through the block/parry path. See shouldNezukoCounter.
  if (shouldNezukoCounter(defender, attacker)) {
    try { sound?.play?.(SFX?.COUNTER_HIT) } catch (_) {}
    return
  }

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

  // FEEDBACK — Energy Absorption counter: absorb the melee blow (no damage), refund energy, stamp the
  // amplified redirect. Scales the discharge by the raw incoming attack damage. Consumes the swing.
  if (shouldFeedbackAbsorb(defender, attacker.currentAttack?.damage || 40)) {
    attacker.currentAttack.hasHit = true
    try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
    return
  }

  // RENGOKU — Counter reactive parry/riposte: negate the blow + stun/damage the attacker (cancels its
  // swing internally, so nothing else resolves this hit). See shouldRengokuCounter.
  if (shouldRengokuCounter(defender, attacker)) {
    try { sound?.play?.(SFX?.COUNTER_HIT) } catch (_) {}
    return
  }


  // GHOSTFACE — JILL identity bait-counter: her neutral stance reads as an opening; an attack INTO it
  // (while she stands in idle) is reactively countered — negate the blow + stun/shove the attacker.
  // Cooldown-gated so it's a bait, not a permanent auto-block. See shouldGhostfaceJillCounter.
  if (shouldGhostfaceJillCounter(defender, attacker, hitEffects)) {
    try { sound?.play?.(SFX?.COUNTER_HIT) } catch (_) {}
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

  // NEZUKO — Blood Demon Slumber vulnerability: while asleep (healing) she takes BONUS damage (risk/reward).
  if (defender._nzSlumberVuln) dmg = Math.floor(dmg * 1.5)

  // UNBLOCKABLE (atk.unblockable) — a DELIBERATE, per-move exception to the guard system: the block
  // branch is skipped entirely so the hit lands FULL even against a held guard (Zenitsu's dash-through
  // Ultimate). Not "high damage that punishes through block" — the block-check itself is bypassed.
  if (defender.isBlocking && !atk.unblockable) {
    const chip = cat === "special" || cat === "ultimate"
    const chipDmg = Math.floor(dmg * (chip ? 0.12 : 0.20))

    applyScaledDamage(defender, chipDmg, { scale: 1, floor: chip ? 1 : 0, source: "block-chip" })   // chipDmg already scaled (derived from `dmg`)
    defender.blockstun = 10 + (cat === "special" ? 4 : 0)

    try { sound?.play?.(SFX?.BLOCK) } catch (_) {}

    if (Array.isArray(hitEffects)) {
      hitEffects.push(Object.assign(poolAcquire("spark"), {
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
      }))
    }
  } else {
    // BOSS SUPER-ARMOR (Stage 20): the arcade boss shrugs off LIGHT attacks — a hit whose move damage
    // is below its threshold (and not a launcher/spike/special/ultimate) can't stun, interrupt, or knock
    // it back, so the player can't jab it out of its own combos. It STILL takes the damage (applied
    // below). There is no universal combo-breaker mechanic to be "immune" to; this delivers that intent.
    const bossArmored = !!defender._bossArmor && !atk.launcher && !atk.spike
      && cat !== "special" && cat !== "ultimate"
      && (atk.damage ?? dmg ?? 0) < (defender._bossArmorThreshold || 0)

    if (bossArmored) {
      defender.armorFlash = 8
      applyHitstop(attacker, defender, Math.min(4, getHitstopFrames(atk)))   // brief impact tick, no stagger
    } else {
      applyHitstop(attacker, defender, getHitstopFrames(atk))
      defender.hitstun = Math.max(defender.hitstun || 0, Math.round((atk.hitstun || 0) * HITSTUN_SCALE * getComboHitstunScale(attacker)))
      // JUGGLE GRAVITY (MK-feel Stage 1b): this hit landed on an AIRBORNE (already-juggled) opponent →
      // bump their juggleCount so physics.applyGravity ramps their fall (each successive air hit drops them
      // faster). Read BEFORE this hit's own launcher/spike physics runs below, so a GROUNDED launcher opener
      // never self-counts. juggleCount resets to 0 on ground contact (applyGravity).
      if (!defender.onGround && !defender.grounded) defender.juggleCount = (defender.juggleCount || 0) + 1
      defender.attacking    = false
      defender.currentAttack = null
      defender.currentMove   = null
      // A hit also interrupts a transform-device charge (Ben/Albedo).
      defender.isCharging   = false
      // AMBER identity — "sticky pressure": her hits shove the opponent LESS, so they can't drift to safety
      // and juke/space away from her (the reliable realization of "reduced side-step-ability against her";
      // the parry-window path proved non-functional). Skin modifier; 1.0 (no change) for everyone else.
      defender.vx = (attacker.facing || 1) * (atk.pushX || 4) * (attacker._gfSkinMod?.stickPressure ?? 1)
    }

    // BEERUS hit-reaction voice ("...impressive") — only on a SIGNIFICANT hit (heavy-tier category or
    // real damage), NOT every light poke. Cooldown-gated (_hitVoiceCd ticked in game.js) so a rapid
    // heavy string doesn't spam it. No-op for every other character.
    if (defender.rosterKey === "beerus" && !(defender._hitVoiceCd > 0) &&
        (cat === "heavy" || cat === "launcher" || cat === "spike" || cat === "special" || cat === "ultimate" || dmg >= 55)) {
      defender._hitVoiceCd = 150
      try { sound?.playSfxFile?.("beerus_hit_reaction.mp3", null) } catch (_) {}
    }

    if (bossArmored) {
      // Boss shrug: no vertical displacement either — it stays planted and keeps attacking.
    } else if (atk.launcher) {
      // Per-character tuned launch (launchVy/selfVy) → EXACT velocities; otherwise
      // the legacy floor pop. The launcher resets attacker.airHits to 0 so the
      // opener itself is NOT counted — the first aerial follow-up becomes hit #1.
      if (atk.launchVy != null) {
        physics.launcherAttack(attacker, defender, atk.launchVy, atk.selfVy ?? -9, { exact: true })
      } else {
        physics.launcherAttack(attacker, defender, atk.launchY ?? -12, -22)
      }
    } else if (atk.spike) {
      physics.downAirSpike(attacker, defender, 30)
    } else if (!attacker.onGround && (defender.isLaunched || !defender.onGround)) {
      // AERIAL JUGGLE FOLLOW-UP — an air normal/special landed while the attacker is
      // airborne and the enemy is still lofted. Route through the air-combo limiter
      // (maxAirHits, 3): under the cap it re-lofts to keep the string going; at the
      // cap it stops re-lofting and drops them faster. This is the ONE place the
      // roster-wide air-hit limit is enforced for launcher juggles.
      physics.airCombo(attacker, defender, atk.launchY ?? -6)
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
    // CHROLLO hit-reaction voice — light-hit exertion grunt vs heavy-hit surprise/pain pool (split by cat).
    applyChrolloHitVoice(defender, cat, dmg)
    // GHOSTFACE hit-reaction voice — single reaction pool ("Where'd you learn to punch like that?").
    applyGhostfaceHitVoice(defender, cat, dmg)
    // HISOKA hit-reaction voice — delighted/dismissive pool ("No no~" / "Impressive~" / "Irresistible~").
    applyHisokaHitVoice(defender, cat, dmg)
    // ZENITSU hit-reaction voice — panicked pool ("No way!" / "Damn it!" / "I got hit!").
    applyZenitsuHitVoice(defender, cat, dmg)
    applyRengokuHitVoice(defender, cat, dmg)
    // SHINOBU hit-reaction voice — strong-hit reaction pool / light-hit exertion grunt (split by cat).
    applyShinobuHitVoice(defender, cat, dmg)
    applyInosukeHitVoice(defender, cat, dmg)
    applyNezukoHitVoice(defender, cat, dmg)
    // SAMURAI RED RANGER hit-reaction voice — "What in the world?!" general reaction.
    applySamuraiHitVoice(defender, cat, dmg)
    // VEGETA hit-reaction voice — "Damn you!" / "Ridiculous!" (shared across base/SSJ/Blue).
    applyVegetaHitVoice(defender, cat, dmg)
    // MAKI hit-reaction voice — "That was close!" / "This guy hurts!" (JP dub).
    applyMakiHitVoice(defender, cat, dmg)
    // YUJI hit-reaction voice — "Damn it!" / "That was close!" (JA active).
    applyYujiHitVoice(defender, cat, dmg)
    // MIWA hit-reaction voice — "Crap!" / "That was close!" (JP dub).
    applyMiwaHitVoice(defender, cat, dmg)
    applyMadaraHitVoice(defender, cat, dmg)
    applyObitoHitVoice(defender, cat, dmg)
    // ICHIGO hit-reaction voice — "Seriously?" / "That was close!" / "Damn!" (JA).
    applyIchigoHitVoice(defender, cat, dmg)
    applyZarakiHitVoice(defender, cat, dmg)
    // SUKUNA hit-reaction voice — ENTERTAINED, not hurt ("Nice attack." / "More!" / "Interesting.").
    applySukunaHitVoice(defender, cat, dmg)
    applyMinatoHitVoice(defender, cat, dmg)
    // FLASH hit-reaction voice — "Not again." + effort-grunt set.
    applyFlashHitVoice(defender, cat, dmg)
    // BATMAN hit-reaction voice — effort-grunt set (clips 60-66).
    applyBatmanHitVoice(defender, cat, dmg)
    // OMNI-MAN hit-reaction voice — shrug-it-off defiance ("That tickles" / "Easy, kid").
    applyOmniManHitVoice(defender, cat, dmg)
    // SUPERMAN hit-reaction voice — effort-grunt set (clips 96-112).
    applySupermanHitVoice(defender, cat, dmg)
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

    applyScaledDamage(defender, dmg, { scale: 1, source: "melee" })   // `dmg` already carries GLOBAL_DAMAGE_SCALE (combo/offense/defense math above); funnel the write through the one choke-point
    applyNarutoLowHealthVoice(defender)   // "Not yet — I can still fight" (once, on crossing the low-HP line)
    applyOmegaRangerLowHealthVoice(defender)   // "This wasn't supposed to happen…" (once, on crossing the low-HP line)
    applyItachiLowHealthVoice(defender)   // "I haven't fallen yet" (once, on crossing the low-HP line)
    applyGonLowHealthVoice(defender)   // "Not yet" / "I can still fight" / "I'm going to die" (once, on crossing the low-HP line)
    applyChrolloLowHealthVoice(defender)   // Chrollo "The spider doesn't die" (once, on crossing the low-HP line)
    applyGhostfaceLowHealthVoice(defender)   // Ghostface "I always do" / "first reel" (once, on crossing the low-HP line)
    applyZenitsuLowHealthVoice(defender)   // Zenitsu "This can't be done yet!" (once, on crossing the low-HP line)
    applyRengokuLowHealthVoice(defender)   // Rengoku "I'm feeling energized!" / "Unbelievable!" (once, on crossing the low-HP line)
    applyShinobuLowHealthVoice(defender)   // Shinobu "This is... oh no." (once, on crossing the low-HP line)
    applyInosukeLowHealthVoice(defender)   // Inosuke "I won't lose." (once, on crossing the low-HP line)
    applyNezukoLowHealthVoice(defender)    // Nezuko strained low-HP grunt (once, on crossing the low-HP line)
    applySamuraiLowHealthVoice(defender)   // Samurai Red Ranger "Better backpedal." (once, on crossing the low-HP line)
    applyVegetaLowHealthVoice(defender)   // Vegeta "Impossible!" / "Where does all that power come from?" (once, on crossing the low-HP line)
    applyMakiLowHealthVoice(defender)   // Maki "My body is still moving!" / "I won't give up!" (once, crossing 30% — the Shibuya transform cue is a separate pool)
    applyYujiLowHealthVoice(defender)   // Yuji "It's not over yet!" / "I won't lose!" (once, crossing 30%)
    applyMiwaLowHealthVoice(defender)   // Miwa "I can't lose!" / "I won't give up yet!" (once, crossing 30%)
    applyMadaraLowHealthVoice(defender)   // Madara low-health bark (once, crossing the line)
    applyObitoLowHealthVoice(defender)   // Obito low-health bark (once, crossing the line)
    applyIchigoLowHealthVoice(defender)   // Ichigo "It's not over yet!" / "I'll overcome it!" (once, crossing 30%)
    applyZarakiLowHealthVoice(defender)   // Zaraki "I'm not dead yet!" (once, crossing the low-HP line)
    applySukunaLowHealthVoice(defender)   // Sukuna "I'm not done yet." / "Now I start burning my life." (once, crossing 30%)
    applyHisokaLowHealthVoice(defender)   // Hisoka THRILLED by danger: "Irresistible~" / "How tantalizing~" (once, on crossing the low-HP line)
    applyMinatoLowHealthVoice(defender)   // Minato "I'll fight to the end" (once, on crossing the low-HP line)
    applyOmniManLowHealthVoice(defender)   // "It's all under control" / "none of you can stop me" (once, on crossing the low-HP line)
    applySupermanLowHealthVoice(defender)   // "What you have can't be cured. I'll never stop fighting." (once, on crossing the low-HP line)
    defender.colorFlash = cat === "ultimate" ? 12 : cat === "special" ? 9 : 6

    // DEBBIE identity — DECEPTIVE hit-reaction: the DISPLAYED flinch is deliberately MISMATCHED from the
    // real damage taken (misdirection). VISUAL ONLY — health / hitstun / knockback set above are UNTOUCHED.
    // A big hit → she barely reacts (tiny flinch, dim flash); a small hit → she over-reacts (sprawl pose,
    // bright flash). Read in sprite.js's hurt-pose selector via _fakeReactVisual. Skipped on real knockdown
    // (don't fight the knockdown system). Cleared when hitstun ends (updateCombatTimers).
    if (defender._gfSkinMod?.deceptiveHurt && !defender.knockdownState) {
      const bigHit = (cat === "heavy" || cat === "special" || cat === "ultimate" || atk.launcher || atk.spike || dmg >= 45)
      defender._fakeReactVisual = bigHit ? "light" : "heavy"   // MISMATCH: big→show light, small→show big
      defender.colorFlash = bigHit ? 3 : 14                    // and a mismatched (visual-only) flash
    }

    const persist =
      cat === "ultimate" ? 30 :
      cat === "special" ? 22 :
      (cat === "heavy" || atk.launcher || atk.spike) ? 18 : 10

    if (Array.isArray(hitEffects)) {
      hitEffects.push(Object.assign(poolAcquire("spark"), {
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
      }))
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
  trackSkillHunterUnlock(defender, attacker, attacker.currentAttack?.name || attacker.currentMove, defender.isBlocking)
  trackBanditEchoMark(defender, attacker, attacker.currentAttack, defender.isBlocking)   // Bandit's Echo: a special/ultimate MELEE connect marks it (independent of Skill Hunter)
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
  applyChrolloOffenseVoice(attacker, cat, !defender.isBlocking)  // Chrollo combat bark (+ ~30% taunt one-liner) on a heavy/long-string connect (specials/ult use their own cast lines)
  applyGhostfaceOffenseVoice(attacker, cat, !defender.isBlocking)  // Ghostface combat bark (+ ~30% taunt one-liner) on a heavy/long-string connect (knife specials/ult use their own cast lines)
  applyZenitsuOffenseVoice(attacker, cat, !defender.isBlocking)  // Zenitsu determination/combat bark on a heavy/long-string connect (specials use their own cast lines)
  applyRengokuOffenseVoice(attacker, cat, !defender.isBlocking)  // Rengoku flame/taunt-combat bark on a heavy/long-string connect (flame specials use their own cast lines)
  applyShinobuOffenseVoice(attacker, cat, !defender.isBlocking)  // Shinobu "Here I go!" bark on a heavy/long-string connect (poison/dance specials use their own cast lines)
  applyInosukeOffenseVoice(attacker, cat, !defender.isBlocking)  // Inosuke "I got it!" bark on a heavy/long-string connect (Beast-Breathing specials/Assist use their own cast lines)
  applyNezukoOffenseVoice(attacker, cat, !defender.isBlocking)   // Nezuko combat grunt on a heavy/long-string connect
  applySamuraiOffenseVoice(attacker, cat, !defender.isBlocking)  // Samurai Red Ranger "I'll take that!"/"Finish this!" bark on a heavy/long-string connect (specials/finisher/ult use their own cast lines)
  applyVegetaOffenseVoice(attacker, cat, !defender.isBlocking)   // Vegeta combat bark / folded taunt on a heavy/long-string connect (Galick/BigBang/FinalFlash/ult use their own cast lines)
  applyMakiOffenseVoice(attacker, cat, !defender.isBlocking)     // Maki combat bark on a heavy/long-string connect (kunai/nunchaku/powerCharge use their own cast lines)
  applyYujiOffenseVoice(attacker, cat, !defender.isBlocking)     // Yuji combat bark (+ Divergent Fist "Divergent!") on a heavy/long-string connect (Y specials + Black Flash use their own cast lines)
  applyMiwaOffenseVoice(attacker, cat, !defender.isBlocking)     // Miwa combat bark on a heavy/long-string connect (iaiDash/airVortex/ultimate use their own cast lines)
  applyMadaraOffenseVoice(attacker, cat, !defender.isBlocking)   // Madara combat bark on a heavy/long-string connect (specials/ult use their own cast lines)
  applyObitoOffenseVoice(attacker, cat, !defender.isBlocking)   // Obito combat bark on a heavy/long-string connect (specials/ult/Kamui use their own cast lines)
  applyTobiOffenseVoice(attacker, cat, !defender.isBlocking)    // Tobi combat bark on a heavy/long-string connect (specials/ult use their own cast lines; own pool, no Obito coupling)
  applyIchigoOffenseVoice(attacker, cat, !defender.isBlocking)   // Ichigo combat bark on a heavy/long-string connect (specials/ult/rekka use their own cast lines)
  applyZarakiOffenseVoice(attacker, cat, !defender.isBlocking)   // Zaraki combat bark on a heavy/long-string connect (Shikai/Bankai/Yachiru use their own cast lines)
  applyHisokaOffenseVoice(attacker, cat, !defender.isBlocking)   // Hisoka combat bark (+ ~30% flirty taunt) on a heavy/long-string connect (specials use their own cast lines)
  applyMinatoOffenseVoice(attacker, cat, !defender.isBlocking)   // Minato offense bark / taunt on a heavy/long-string connect
  applyTobiramaOffenseVoice(attacker, cat, !defender.isBlocking) // Tobirama overconfident taunt one-liner on a strong/long-string connect
  applyFlashOffenseVoice(attacker, cat, !defender.isBlocking)    // Flash quippy speed trash-talk on a strong/long-string connect
  applyBatmanOffenseVoice(attacker, cat, !defender.isBlocking)   // Batman cold trash-talk (taunt pool) on a strong/long-string connect
  applyOmniManOffenseVoice(attacker, cat, !defender.isBlocking)  // Omni-Man cold Viltrumite trash-talk (taunt pool) on a strong/long-string connect
  applySupermanOffenseVoice(attacker, cat, !defender.isBlocking)  // Superman confident trash-talk (taunt pool) on a strong/long-string connect
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
  if (fighter.hitstun <= 0 && fighter._fakeReactVisual) fighter._fakeReactVisual = null   // Debbie deceptive-react flag: drop once the flinch ends
  if ((fighter._jillCounterCd || 0) > 0) fighter._jillCounterCd--   // Jill bait-counter cooldown (the exploitable gap)
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
    if (controls.upAttack && (fighter.onGround || fighter.grounded)) {
      // GROUNDED-ONLY guard: the Up-Attack launcher can only be started from the
      // ground. Airborne, an Up+attack press must NOT re-fire the launcher (it would
      // reset the juggle) — during a juggle the player uses their air normals, which
      // fall through to the `controls.air` branch below.
      startMove(fighter, "up", _getMD(fighter, "up"))
    } else if (controls.grab) {
      fighter.grabInputBuffer = 6
      resolveGrab(fighter, opponent, options)
    } else if (controls.air) {
      startMove(fighter, "air", _getMD(fighter, "air"))
    } else if (controls.downAir) {
      startMove(fighter, "down_air", _getMD(fighter, "down_air"))
    } else if (controls.airHeavy) {
      // AERIAL HARD (air+Heavy) — an optional heavy-while-airborne normal. General hook:
      // `_getMD` returns null for anyone without an `air_heavy` move (buildNormalControlState
      // only sets this control airborne), so it's a no-op for every character except the one
      // that defines it. Currently: Madara's Susanoo-hand grab.
      startMove(fighter, "air_heavy", _getMD(fighter, "air_heavy"))
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

    // LAUNCHER (MK-feel Stage 1b): a connected up-attack NO LONGER auto-cancels its recovery or
    // auto-lifts the attacker (see physics.launcherAttack). It plays out its recovery on the ground
    // like any normal — to convert, the player must JUMP-CANCEL that recovery (physics.moveFighter's
    // jump block reads `currentAttack.launcher && hasHit`, so the attack state must persist through
    // recovery here). If they don't jump-cancel, the launcher simply recovers into neutral.
    if (fighter.currentAttack && fighter.currentAttack.timer <= 0) {
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
    p.age = (p.age || 0) + 1   // frames alive — used by `hitDelay` (a projectile that must play a startup, e.g. a ground spike rising, before it can strike)
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
    if (proj.hitDelay && (proj.age || 0) < proj.hitDelay) continue   // startup: a stationary ground hazard (Madara Wood Spike) RISES for `hitDelay` frames before it can strike

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

      // MADARA — Gunbai reflect: while the summoned war-fan stance is up (_gunbaiReflect), an incoming
      // projectile is TURNED BACK at its owner (the canonical Uchiwa reflect) instead of damaging Madara.
      // The projectile is NOT consumed — it reverses, Madara becomes its owner (so it can strike the
      // original caster), and _gunbaiReflected latches so it can't ping-pong forever. No-op for everyone
      // else / when the window is down. Checked before the damage/block path so it takes priority.
      if ((fighter._gunbaiReflect || 0) > 0 && !proj._gunbaiReflected) {
        proj.vx = -proj.vx; proj.vy = -(proj.vy || 0)
        proj.owner = fighter; proj.ownerId = fighter.side
        proj._gunbaiReflected = true
        proj.x += proj.vx > 0 ? 24 : -24            // nudge clear of Madara's hurtbox so it doesn't instantly re-collide
        fighter.parryFlash = Math.max(fighter.parryFlash || 0, 12)
        try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
        break
      }

      // Sasuke's Absolute Defense negates projectiles too (full invuln, per-block energy cost) —
      // the projectile is consumed and deals nothing. Checked BEFORE damage so it takes priority
      // over normal block. No-op for everyone else / when the toggle is off / when energy is short.
      if (shouldSasukeAbsoluteDefenseNegate(fighter)) {
        try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
        projectiles.splice(i, 1)
        break
      }

      // FEEDBACK — Energy Absorption also eats projectiles (canonically its specialty): absorb the
      // incoming energy, consume the projectile, and stamp the amplified redirect scaled by proj damage.
      if (shouldFeedbackAbsorb(fighter, proj.damage || 40)) {
        try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
        projectiles.splice(i, 1)
        break
      }

      // Combo damage decay applies to projectiles too (combo-flow Stage 3): a projectile landing mid-
      // combo is scaled by the owner's current combo count, exactly like a melee hit. A standalone
      // projectile (counter 0/1) scales by 1 → unchanged. Uses the PRE-increment counter; the owner's
      // combo bookkeeping (extend on clean hit / reset on block) is done just below, after damage.
      let dmg = (proj.damage || 30) * getComboScale(proj.owner)   // PRE-scale; GLOBAL_DAMAGE_SCALE applied at the write via applyScaledDamage

      if (fighter.isBlocking) {
        dmg *= 0.15
        fighter.blockstun = 12
        try { sound?.play?.(SFX?.BLOCK) } catch (_) {}
      } else {
        fighter.hitstun = Math.round((proj.hitstun || 18) * getComboHitstunScale(proj.owner))
        // JUGGLE GRAVITY (Stage 1b): a projectile connecting on an AIRBORNE (juggled) target also ramps
        // their fall (read before this hit's knockback vy is applied → a grounded target never self-counts).
        if (!fighter.onGround && !fighter.grounded) fighter.juggleCount = (fighter.juggleCount || 0) + 1
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

      applyScaledDamage(fighter, dmg, { source: "projectile" })
      trackSkillHunterUnlock(fighter, proj.owner, proj.name, fighter.isBlocking)   // Skill Hunter: a distinct opponent PROJECTILE landing on Chrollo also counts
      trackBanditEchoMark(fighter, proj.owner, proj, fighter.isBlocking, true)   // Bandit's Echo: any opponent PROJECTILE connect marks it (special-tier; independent of Skill Hunter)

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
        hitEffects.push(Object.assign(poolAcquire("spark"), {
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
        }))
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
