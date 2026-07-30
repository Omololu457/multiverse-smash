// supermanUltimateCinematic.js
// SUPERMAN "Solar Overload" ULTIMATE — a frozen combat cinematic. Mirrors the EXACT contract of
// omnimanBodySlamCinematic.js (activate / isActive / getPhase / update / draw / clear that truly
// FREEZES combat):
//   • abilities.executeSupermanUltimate() calls activateSupermanUltimateCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isSupermanUltimateCinematicActive() and calls
//     updateSupermanUltimateCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawSupermanUltimateCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the DETONATION beat (caller owns the payoff).
//   • every reset path calls clearSupermanUltimateCinematic().
//
// The SHOW is Superman's OWN sprite: the 13-frame overload (he surges with green solar energy then
// DISSOLVES into particles) plays through the freeze via _spriteCastMove:"ultimate" (sprite frames advance
// in the draw path, which still runs while combat is frozen). This overlay is lean — a building green
// energy vignette + a white/green detonation flash + expanding green shockwave rings at the connect beat.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — 125f total (~2.1s):
//   SURGE  [0,45)    45f  camera zooms on Superman; he channels green solar energy → dissolves
//   BURST  [45,95)   50f  at the DETONATION beat (+15) the guaranteed damage + white/green flash +
//                          expanding shockwave rings land on the opponent
//   SETTLE [95,125)  30f  flash/shockwave fade, camera eases back before combat resumes
// ─────────────────────────────────────────────────────────────────
export const SUPERMAN_ULT_CINE_TIMELINE = { SURGE: 45, BURST: 50, SETTLE: 30 }
const T_SURGE_END = SUPERMAN_ULT_CINE_TIMELINE.SURGE                 // 45
const T_BURST_END = T_SURGE_END + SUPERMAN_ULT_CINE_TIMELINE.BURST   // 95
const T_TOTAL     = T_BURST_END + SUPERMAN_ULT_CINE_TIMELINE.SETTLE  // 125

const IMPACT_OFFSET = 15                          // frames into BURST the overload DETONATES
const T_IMPACT = T_SURGE_END + IMPACT_OFFSET      // 60

const CINE_ZOOM = 0.82   // frame BOTH fighters (the detonation engulfs the opponent)

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeSupermanUltimate). onImpact(ctx) applies the real damage —
// invoked ONCE at the DETONATION beat.
// ─────────────────────────────────────────────────────────────────
export function activateSupermanUltimateCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Play his overload sprite through the freeze (drawn by the normal render path, which still runs).
  caster._spriteCastMove  = "ultimate"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  // Clear any leftover flight/mode state so the ultimate reads cleanly.
  caster._flightActive = false
  return true
}

export function isSupermanUltimateCinematicActive() { return cine.active }

export function getSupermanUltimateCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_SURGE_END) return "surge"
  if (f < T_BURST_END) return "burst"
  return "settle"
}

// Test/harness snapshot — surfaces the LIVE caster ref so a test can prove it's the real fighter.
export function getSupermanUltimateCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getSupermanUltimateCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateSupermanUltimateCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.08            // let the framing settle within SURGE (never snaps)
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom
  }

  // Camera: frame BOTH fighters, easing to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_BURST_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: builds over the surge, a hard shake on the DETONATION, tremor after.
  if (cam && cam.shake) {
    if (f >= T_SURGE_END && f < T_IMPACT && f % 5 === 0) {
      cam.shake(4 + ((f - T_SURGE_END) / IMPACT_OFFSET) * 8, 8)
    } else if (f === T_IMPACT) {
      cam.shake(34, 32)
    } else if (f > T_IMPACT && f < T_BURST_END && f % 6 === 0) {
      cam.shake(12, 10)
    }
  }

  // DETONATION — the guaranteed damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endSupermanUltimateCinematic()
  return getSupermanUltimateCinematicPhase()
}

function endSupermanUltimateCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Omni-Man / Beerus).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearSupermanUltimateCinematic() {
  if (cine.active || cine._cam) endSupermanUltimateCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank).
// The overload itself is the caster's sprite; this adds the green energy vignette + detonation flash + rings.
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawSupermanUltimateCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1

  // Green solar-energy vignette — power building through the surge, fading in SETTLE.
  let backdrop = 0
  if (f < T_BURST_END)  backdrop = 0.36 * Math.min(1, f / T_SURGE_END)
  else                  backdrop = 0.36 * (1 - (f - T_BURST_END) / SUPERMAN_ULT_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#08240f", backdrop)

  // The opponent's screen-space anchor (camera frames both; the detonation blooms toward the opponent side).
  const oppX = cw * (0.5 + dir * 0.14), oppY = ch * 0.55

  // ── DETONATION — white/green flash + expanding green shockwave rings.
  if (f >= T_IMPACT && f < T_BURST_END + 6) {
    const since = f - T_IMPACT
    const decay = Math.max(0, 1 - since / 24)
    _flash(ctx, cw, ch, "#ffffff", decay * 0.66)
    _flash(ctx, cw, ch, "#39ff88", decay * 0.30)
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    for (let i = 0; i < 3; i++) {
      const t = Math.max(0, Math.min(1, (since - i * 3) / 22))
      if (t <= 0 || t >= 1) continue
      const r = t * cw * 0.46
      ctx.strokeStyle = `rgba(${90 + i * 40},255,${150 - i * 30},${(1 - t) * 0.7})`
      ctx.lineWidth = 8 * (1 - t) + 2
      ctx.beginPath(); ctx.ellipse(oppX, oppY, r, r * 0.34, 0, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
  }
}
