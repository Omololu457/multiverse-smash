// gokuBlackSwordCinematic.js
// Goku Black SWORD SLASH ultimate — a frozen combat cinematic. Mirrors kurama.js /
// ssjRoseCinematic.js EXACTLY (the systems that truly FREEZE combat), reusing the same
// activate / isActive / getPhase / update / draw / clear contract — NOT a parallel system:
//   • abilities.executeGokuBlackUltimate() calls activateGokuBlackSwordCinematic(caster,
//     opponent, onImpact) INSTEAD of the old vulnerable-windup state machine.
//   • updateBattle() freezes combat while isGokuBlackSwordCinematicActive(): it calls
//     updateGokuBlackSwordCinematic({camera, sound, hitEffects, damageNumbers}) +
//     camera.advance() and returns early — the SAME contract used for Kurama & SSJ Rose.
//   • drawBattle() calls drawGokuBlackSwordCinematic(ctx, canvas) as a fullscreen overlay.
//   • the actual DAMAGE/paralysis is applied by onImpact() at the STRIKE connect beat — the
//     caller (abilities.js) owns the SWORD payoff constants, so the payoff is UNCHANGED.
//   • every reset path calls clearGokuBlackSwordCinematic().
//
// Because this is an ATTACK landing ON the opponent (not a solo transform like SSJ Rose), the
// camera frames BOTH fighters (camera.focusBetween — exactly how Kurama's Tailed Beast Bomb
// frames the shot), NOT the SSJ Rose transform's isolate-one-fighter framing.
//
// DESIGN CHANGE (intentional, accepted): combat is FULLY frozen the whole time, so the old
// "vulnerable windup, opponent can interrupt him" behaviour is GONE — nothing can act during a
// frozen cinematic. The interruptible windup / reaction-window state machine was removed.
//
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — named phases, ~220f total (Kurama's ~3.7s ballpark, up from ~42f):
//   WINDUP [0,90)     90f ~1.50s  camera pulls in framing BOTH fighters; Goku Black raises the
//                                 blade (gbSwordSlash pose), pink energy gathers, rumble builds
//   STRIKE [90,170)   80f ~1.33s  the blade comes DOWN and CONNECTS: damage/paralysis + the voice
//                                 line + white/magenta flash + slash streak land at the IMPACT beat
//   SETTLE [170,220)  50f ~0.83s  slash fades, energy dissipates, camera eases back before resume
// ─────────────────────────────────────────────────────────────────
export const SWORD_CINE_TIMELINE = { WINDUP: 90, STRIKE: 80, SETTLE: 50 }
const T_WINDUP_END = SWORD_CINE_TIMELINE.WINDUP                       // 90
const T_STRIKE_END = T_WINDUP_END + SWORD_CINE_TIMELINE.STRIKE        // 170
const T_TOTAL      = T_STRIKE_END + SWORD_CINE_TIMELINE.SETTLE        // 220

// The blade CONNECTS this many frames into STRIKE — the damage/audio/flash beat.
const IMPACT_OFFSET = 16
const T_IMPACT = T_WINDUP_END + IMPACT_OFFSET                         // 106

// Framing zoom that keeps BOTH fighters on-screen (focusBetween centres between them, then
// eases toward a normal 1.0 on SETTLE). minZoom 0.40 / maxZoom 1.15 → this pulls out a touch.
const CINE_ZOOM = 0.78

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// STRIKE-beat voice line ALTERNATION: the connect fires one of two lines, strictly toggling each cast
// so a repeated ultimate never plays the same line twice in a row (and never double-fires on one beat —
// only one line plays per impact). "Taste my blade!" and "Taste divine fury!" are consecutive in the
// source material, so alternating them reads as one continuous delivery across casts. Persists across
// cinematics (module scope) on purpose — the whole point is turn-taking between separate ultimates.
let _bladeLineToggle = false

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeGokuBlackUltimate). onImpact(ctx): applies the
// real damage/paralysis — invoked ONCE at the STRIKE connect beat.
// ─────────────────────────────────────────────────────────────────
export function activateGokuBlackSwordCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Hold the sword-slash pose on the caster through the freeze (sprite frames advance in the draw
  // path, which still runs while combat is frozen). Cleared at end so the pose can't linger past it.
  caster._spriteCastMove  = "gbSwordSlash"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isGokuBlackSwordCinematicActive() { return cine.active }

export function getGokuBlackSwordCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_WINDUP_END) return "windup"
  if (f < T_STRIKE_END) return "strike"
  return "settle"
}

// Test/harness snapshot.
export function getGokuBlackSwordCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getGokuBlackSwordCinematicPhase(), total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateGokuBlackSwordCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.08            // let the framing settle within the WINDUP beat (never snaps)
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom (same as Kurama / SSJ Rose)
    // ULTIMATE windup line — "You shall now feel the full brunt of a god's anger." Fires at CAST start
    // (windup), deliberately EARLIER than the taste-my-blade/divine-fury line at the IMPACT beat below,
    // so the two never overlap or compete: this one lands as the blade is raised, that one as it connects.
    try { snd?.playSfxFile?.("goku_black_ultimate_line.mp3", null) } catch (_) {}
  }

  // Camera: frame BOTH fighters (focusBetween — Kurama TBB framing), easing to a normal framing on
  // SETTLE. Never isolate — this attack lands ON the opponent, so the opponent stays in shot.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_STRIKE_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: escalates over the back half of WINDUP, a hard shake on the STRIKE connect, tremor after.
  if (cam && cam.shake) {
    if (f >= T_WINDUP_END - 40 && f < T_WINDUP_END && f % 6 === 0) {
      cam.shake(4 + ((f - (T_WINDUP_END - 40)) / 40) * 6, 8)
    } else if (f === T_IMPACT) {
      cam.shake(22, 26)
    } else if (f > T_IMPACT && f < T_STRIKE_END && f % 7 === 0) {
      cam.shake(9, 10)
    }
  }

  // STRIKE CONNECT — the voice line + damage/paralysis land here, exactly once. Anchoring the
  // "taste my blade" cue to the impact frame (not activation) punches with the hit, mirroring how
  // Kurama fires its impact SFX on the bomb-lands beat.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    // Alternate the connect line each cast (toggle) so it never repeats back-to-back. Only ONE line
    // plays at this beat — never both — so it can't stack with the windup line (which already fired).
    const impactLine = _bladeLineToggle ? "goku_black_taste_divine_fury.mp3" : "goku-black-taste-my-blade.mp3"
    _bladeLineToggle = !_bladeLineToggle
    try { snd?.playSfxFile?.(impactLine, null) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endGokuBlackSwordCinematic()
  return getGokuBlackSwordCinematicPhase()
}

function endGokuBlackSwordCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get "eaten" by an interrupted/aborted cinematic (mirrors SSJ Rose's
  // onResolve safety) — if we somehow end before the connect beat, still apply the hit.
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearGokuBlackSwordCinematic() {
  if (cine.active || cine._cam) endGokuBlackSwordCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank)
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

// A bright diagonal slash streak flashing across the screen at the connect (white core → magenta).
function drawSlashStreak(ctx, cw, ch, alpha) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.translate(cw * 0.5, ch * 0.5)
  ctx.rotate(-0.92)                       // steep down-left diagonal
  ctx.shadowColor = "#ff5db1"; ctx.shadowBlur = 45
  const len = Math.hypot(cw, ch) * 1.25
  const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0)
  grad.addColorStop(0.0, "rgba(255,255,255,0)")
  grad.addColorStop(0.46, "rgba(255,255,255,0.92)")
  grad.addColorStop(0.5, "rgba(255,255,255,1)")
  grad.addColorStop(0.54, "rgba(255,93,177,0.92)")
  grad.addColorStop(1.0, "rgba(255,93,177,0)")
  ctx.fillStyle = grad
  ctx.fillRect(-len / 2, -18, len, 36)
  ctx.restore()
}

export function drawGokuBlackSwordCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame

  // Light magenta vignette/backdrop — kept subtle so BOTH fighters stay clearly visible.
  let backdrop = 0
  if (f < T_WINDUP_END)      backdrop = (f / T_WINDUP_END) * 0.34
  else if (f < T_STRIKE_END) backdrop = 0.34
  else                       backdrop = 0.34 * (1 - (f - T_STRIKE_END) / SWORD_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#180a1e", backdrop)

  // WINDUP — gathering pink energy glow, pulsing and building toward the strike.
  if (f < T_WINDUP_END) {
    const p = f / T_WINDUP_END
    const cx = cw * 0.5, cy = ch * 0.5
    const glow = (0.15 + 0.5 * p) * (0.72 + 0.28 * Math.sin(f * 0.5))
    ctx.save()
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, cw * 0.45)
    g.addColorStop(0, `rgba(255,93,177,${0.34 * glow})`)
    g.addColorStop(0.6, `rgba(214,80,180,${0.13 * glow})`)
    g.addColorStop(1, "rgba(214,80,180,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore()
  }

  // STRIKE — white/magenta impact flash + the slash streak, peaking at the connect then decaying.
  if (f >= T_WINDUP_END && f < T_STRIKE_END) {
    const sinceImpact = f - T_IMPACT
    if (sinceImpact >= 0) {
      const decay = Math.max(0, 1 - sinceImpact / 22)
      _flash(ctx, cw, ch, "#ffffff", decay * 0.6)
      _flash(ctx, cw, ch, "#ff5db1", decay * 0.32)
      drawSlashStreak(ctx, cw, ch, decay)
    }
  }
}
