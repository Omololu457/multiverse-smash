// ben10OmnitrixCinematic.js
// BEN 10 "Omnitrix Transformation" ULTIMATE — a frozen combat cinematic. Mirrors the EXACT
// contract of beerusKiBallCinematic.js / vegetaFinalFlashCinematic.js (activate / isActive /
// getPhase / update / draw / clear that truly FREEZES combat):
//   • abilities.executeBen10Ultimate() (Ben-human branch) calls activateBen10OmnitrixCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isBen10OmnitrixCinematicActive() and calls
//     updateBen10OmnitrixCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawBen10OmnitrixCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE (Omnitrix burst shockwave) is applied by onImpact() at the connect beat.
//   • every reset path calls clearBen10OmnitrixCinematic().
//
// Unlike Beerus's thrown orb, this frames BEN himself: he holds the "transform" CAST pose (his own
// sprite plays ben10_transform_uniform via _spriteCastMove) while this overlay adds the Omnitrix
// green energy build-up → white flash as the alien emerges → a green radial shockwave that connects.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — 150f total (~2.5s):
//   BUILDUP   [0,54)    54f  camera pushes in on Ben; Omnitrix green glow gathers, rumble builds
//   TRANSFORM [54,108)  54f  green intensifies → white flash → the alien bursts out (SHOCKWAVE connects)
//   SETTLE    [108,150) 42f  shockwave fades, camera eases back before combat resumes
// ─────────────────────────────────────────────────────────────────
export const OMNITRIX_CINE_TIMELINE = { BUILDUP: 54, TRANSFORM: 54, SETTLE: 42 }
const T_BUILDUP_END   = OMNITRIX_CINE_TIMELINE.BUILDUP                    // 54
const T_TRANSFORM_END = T_BUILDUP_END + OMNITRIX_CINE_TIMELINE.TRANSFORM  // 108
const T_TOTAL         = T_TRANSFORM_END + OMNITRIX_CINE_TIMELINE.SETTLE   // 150

// The alien bursts out (shockwave + guaranteed damage) this many frames into TRANSFORM.
const IMPACT_OFFSET = 42
const T_IMPACT = T_BUILDUP_END + IMPACT_OFFSET                            // 96

const CINE_ZOOM = 0.74   // close on Ben — the transform is the spectacle

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (from abilities.executeBen10Ultimate). onImpact(ctx) applies the burst damage — once.
// ─────────────────────────────────────────────────────────────────
export function activateBen10OmnitrixCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Hold Ben's transform CAST pose through the freeze (sprite frames advance in the draw path,
  // which still runs while combat is frozen). Cleared at end so the pose can't linger.
  caster._spriteCastMove  = "transform"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isBen10OmnitrixCinematicActive() { return cine.active }

export function getBen10OmnitrixCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_BUILDUP_END) return "buildup"
  if (f < T_TRANSFORM_END) return "transform"
  return "settle"
}

// Test/harness snapshot — surfaces the LIVE caster ref (prove it's the real fighter, not a dup).
export function getBen10OmnitrixCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getBen10OmnitrixCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateBen10OmnitrixCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08 }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom
  }

  // Camera: push in on Ben through BUILDUP/TRANSFORM, ease to normal on SETTLE.
  if (cam && cine.caster) {
    if (f < T_TRANSFORM_END) { if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM) }
    else { if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0) }
  }

  // Rumble: builds over the back of BUILDUP, a hard shake as the alien bursts, tremor after.
  if (cam && cam.shake) {
    if (f >= T_BUILDUP_END - 30 && f < T_BUILDUP_END && f % 6 === 0) {
      cam.shake(4 + ((f - (T_BUILDUP_END - 30)) / 30) * 8, 8)
    } else if (f === T_IMPACT) {
      cam.shake(26, 26)
    } else if (f > T_IMPACT && f < T_TRANSFORM_END && f % 6 === 0) {
      cam.shake(10, 9)
    }
  }

  // BURST CONNECT — the guaranteed shockwave damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endBen10OmnitrixCinematic()
  return getBen10OmnitrixCinematicPhase()
}

function endBen10OmnitrixCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Beerus / Vegeta).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearBen10OmnitrixCinematic() {
  if (cine.active || cine._cam) endBen10OmnitrixCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank).
// Ben's transform SPRITE is drawn by the normal sprite path; this adds the Omnitrix energy.
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawBen10OmnitrixCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const cx = cw * 0.5, cy = ch * 0.5

  // Green Omnitrix vignette backdrop — builds through BUILDUP, holds, fades on SETTLE.
  let backdrop = 0
  if (f < T_BUILDUP_END)        backdrop = (f / T_BUILDUP_END) * 0.42
  else if (f < T_TRANSFORM_END) backdrop = 0.42
  else                          backdrop = 0.42 * (1 - (f - T_TRANSFORM_END) / OMNITRIX_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#04140c", backdrop)

  // Gathering green Omnitrix glow centred on Ben (screen centre — camera is on him).
  if (f < T_TRANSFORM_END) {
    const p = Math.min(1, f / T_TRANSFORM_END)
    ctx.save()
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, cw * 0.36)
    const gl = (0.18 + 0.55 * p) * (0.72 + 0.28 * Math.sin(f * 0.55))
    g.addColorStop(0, `rgba(120,255,170,${0.5 * gl})`)
    g.addColorStop(0.5, `rgba(34,197,120,${0.18 * gl})`)
    g.addColorStop(1, "rgba(34,197,120,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore()
  }

  // White flash as the alien bursts out (right at the IMPACT beat), decaying green after.
  if (f >= T_IMPACT && f < T_IMPACT + 20) {
    const decay = (f - T_IMPACT) / 20
    _flash(ctx, cw, ch, "#ffffff", (1 - decay) * 0.8)
    _flash(ctx, cw, ch, "#4ade80", (1 - decay) * 0.3)
    // Expanding green shockwave ring from Ben.
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    const r = 40 + decay * cw * 0.5
    ctx.strokeStyle = `rgba(74,222,128,${(1 - decay) * 0.85})`
    ctx.lineWidth = 10 * (1 - decay) + 2
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
  }
}
