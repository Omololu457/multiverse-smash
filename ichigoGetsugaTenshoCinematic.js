// ichigoGetsugaTenshoCinematic.js
// ICHIGO KUROSAKI "GETSUGA TENSHŌ" ULTIMATE — a frozen combat cinematic (dash-slash → rising crescent
// uppercut). Mirrors the EXACT contract of miwaUltimateCinematic.js / rengokuFlameExplosionCinematic.js
// (activate / isActive / getPhase / update / draw / clear that truly FREEZES combat):
//   • abilities.executeIchigoUltimate() calls activateIchigoGetsugaCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isIchigoGetsugaCinematicActive() and calls
//     updateIchigoGetsugaCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawIchigoGetsugaCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the UPPERCUT beat (caller owns the payoff).
//   • every reset path calls clearIchigoGetsugaCinematic().
//
// The SHOW is Ichigo's OWN sprite, played through the freeze via _spriteCastMove: the 9-frame dash-slash
// (ichigoUlt1, ultimate_part_1) during the DASH phase, then SWITCHED to the 5-frame rising uppercut
// (ichigoUlt2, ultimate_part_2) at the finisher — ONE continuous windup→finisher sequence. Sprite frames
// advance in the draw path, which still runs while combat is frozen (and resets frameIndex on the sheet swap).
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — 108f total (~1.8s):
//   DASH   [0,42)    42f  camera pushes IN; Ichigo streaks forward in the dash-slash pose (part_1)
//   FINISH [42,84)   42f  SWITCH to the rising uppercut (part_2); at +12 the guaranteed Getsuga + flash/crescent
//   SETTLE [84,108)  24f  flash/crescent fade, camera pulls BACK before combat resumes
// ─────────────────────────────────────────────────────────────────
export const ICHIGO_ULT_CINE_TIMELINE = { DASH: 42, FINISH: 42, SETTLE: 24 }
const T_DASH_END   = ICHIGO_ULT_CINE_TIMELINE.DASH                    // 42
const T_FINISH_END = T_DASH_END + ICHIGO_ULT_CINE_TIMELINE.FINISH     // 84
const T_TOTAL      = T_FINISH_END + ICHIGO_ULT_CINE_TIMELINE.SETTLE   // 108

const IMPACT_OFFSET = 12                              // frames into FINISH the uppercut CONNECTS
const T_IMPACT = T_DASH_END + IMPACT_OFFSET           // 54

const CINE_ZOOM = 0.82   // frame BOTH fighters (the dash-slash reaches across to the opponent)

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null, _switched: false
}

// ACTIVATION (from abilities.executeIchigoUltimate). onImpact(ctx) applies the real damage — ONCE, at the uppercut.
export function activateIchigoGetsugaCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  cine._switched = false
  // Play the dash-slash sprite through the freeze (drawn by the normal render path, which still runs).
  caster._spriteCastMove  = "ichigoUlt1"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isIchigoGetsugaCinematicActive() { return cine.active }

export function getIchigoGetsugaCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_DASH_END)   return "dash"
  if (f < T_FINISH_END) return "finish"
  return "settle"
}

// Test/harness snapshot — surfaces the LIVE caster ref so a test can prove it's the real fighter.
export function getIchigoGetsugaCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getIchigoGetsugaCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    castMove: cine.caster?._spriteCastMove ?? null,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// UPDATE (per frame while active; game.js freezes combat around this)
export function updateIchigoGetsugaCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08 }   // smooth push-in
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
  }

  // SWITCH the sprite to the rising uppercut (part_2) exactly at the finisher beat — the continuous handoff.
  if (f === T_DASH_END && !cine._switched && cine.caster) {
    cine._switched = true
    cine.caster._spriteCastMove  = "ichigoUlt2"
    cine.caster._spriteCastTimer = (T_TOTAL - f) + 8
  }

  // Camera: push IN to frame BOTH fighters through the slash, then pull BACK on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_FINISH_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: rising tension through the dash, a hard crack on the uppercut, a brief tremor after.
  if (cam && cam.shake) {
    if (f >= T_DASH_END && f < T_IMPACT && f % 4 === 0) cam.shake(3 + ((f - T_DASH_END) / IMPACT_OFFSET) * 6, 6)
    else if (f === T_IMPACT) cam.shake(32, 30)
    else if (f > T_IMPACT && f < T_FINISH_END && f % 7 === 0) cam.shake(9, 8)
  }

  // UPPERCUT — the guaranteed Getsuga damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endIchigoGetsugaCinematic()
  return getIchigoGetsugaCinematicPhase()
}

function endIchigoGetsugaCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Miwa / Rengoku / Superman).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null; cine._switched = false
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearIchigoGetsugaCinematic() {
  if (cine.active || cine._cam) endIchigoGetsugaCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank). The slash itself
// is the caster's sprite; this adds a Getsuga vignette + a horizontal dash streak + the connect flash and a
// big rising blue crescent (the Getsuga Tenshō wave).
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawIchigoGetsugaCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1

  // Cool Getsuga vignette — gathering through the dash, fading in SETTLE.
  let backdrop = 0
  if (f < T_FINISH_END) backdrop = 0.34 * Math.min(1, f / T_DASH_END)
  else                  backdrop = 0.34 * (1 - (f - T_FINISH_END) / ICHIGO_ULT_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#04121f", backdrop)

  const midX = cw * 0.5, midY = ch * 0.55

  // ── DASH — a low horizontal reiatsu streak sweeping in Ichigo's facing direction.
  if (f < T_DASH_END) {
    const t = f / T_DASH_END
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    ctx.strokeStyle = `rgba(56,189,248,${0.25 + 0.35 * t})`
    ctx.lineWidth = 6 + 10 * t
    ctx.beginPath()
    ctx.moveTo(midX - dir * cw * 0.45, midY + ch * 0.06)
    ctx.lineTo(midX + dir * cw * (0.10 + 0.30 * t), midY - ch * 0.02)
    ctx.stroke(); ctx.restore()
  }

  // ── UPPERCUT CONNECT — white/azure flash + a big rising blue crescent (the Getsuga Tenshō wave).
  if (f >= T_IMPACT && f < T_FINISH_END + 8) {
    const since = f - T_IMPACT
    const decay = Math.max(0, 1 - since / 26)
    _flash(ctx, cw, ch, "#ffffff", decay * 0.62)
    _flash(ctx, cw, ch, "#38bdf8", decay * 0.32)
    // rising crescent arc — sweeps UP across the opponent's side.
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    const t = Math.max(0, Math.min(1, since / 18))
    const cx = midX + dir * cw * 0.10
    const cy = midY - ch * (0.05 + 0.45 * t)      // rises upward over the connect
    const r  = cw * (0.10 + 0.06 * t)
    ctx.strokeStyle = `rgba(224,242,254,${(1 - t) * 0.9})`
    ctx.lineWidth = 14 * (1 - t) + 3
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.15, Math.PI * 0.95, false); ctx.stroke()
    ctx.strokeStyle = `rgba(56,189,248,${(1 - t) * 0.6})`
    ctx.lineWidth = 24 * (1 - t) + 3
    ctx.beginPath(); ctx.arc(cx, cy, r * 1.18, Math.PI * 0.12, Math.PI * 1.0, false); ctx.stroke()
    ctx.restore()
  }
}
