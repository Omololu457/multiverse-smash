// omnimanBodySlamCinematic.js
// OMNI-MAN "Viltrumite Onslaught" ULTIMATE — a frozen combat cinematic. Mirrors the EXACT contract of
// beerusKiBallCinematic.js / batmanDarkKnightCinematic.js (activate / isActive / getPhase / update /
// draw / clear that truly FREEZES combat):
//   • abilities.executeOmniManUltimate() calls activateOmniManBodySlamCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isOmniManBodySlamCinematicActive() and calls
//     updateOmniManBodySlamCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawOmniManBodySlamCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the SLAM connect beat (caller owns the payoff).
//   • every reset path calls clearOmniManBodySlamCinematic().
//
// Unlike Beerus's orb, the SHOW here is Omni-Man's OWN sprite: the 15-frame body-slam (he leaps up and
// crashes down onto the opponent) plays through the freeze via _spriteCastMove:"ultimate" (sprite frames
// advance in the draw path, which still runs while combat is frozen). So this overlay is lean — a
// building energy vignette + a white impact flash + an expanding ground shockwave at the connect beat.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — ~130f total (~2.2s):
//   LEAP   [0,40)    40f  camera frames BOTH fighters; Omni-Man rockets up (body-slam sprite winds up)
//   SLAM   [40,96)   56f  he crashes DOWN — at the connect beat (+26) the guaranteed damage + white
//                          flash + ground shockwave land on the opponent
//   SETTLE [96,130)  34f  flash/shockwave fade, camera eases back before combat resumes
// ─────────────────────────────────────────────────────────────────
export const BODY_SLAM_CINE_TIMELINE = { LEAP: 40, SLAM: 56, SETTLE: 34 }
const T_LEAP_END = BODY_SLAM_CINE_TIMELINE.LEAP                 // 40
const T_SLAM_END = T_LEAP_END + BODY_SLAM_CINE_TIMELINE.SLAM    // 96
const T_TOTAL    = T_SLAM_END + BODY_SLAM_CINE_TIMELINE.SETTLE  // 130

const IMPACT_OFFSET = 26                         // frames into SLAM the body-slam CONNECTS
const T_IMPACT = T_LEAP_END + IMPACT_OFFSET      // 66

const CINE_ZOOM = 0.82   // frame BOTH fighters (the slam lands ON the opponent)

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeOmniManUltimate). onImpact(ctx) applies the real damage —
// invoked ONCE at the SLAM connect beat.
// ─────────────────────────────────────────────────────────────────
export function activateOmniManBodySlamCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Play his body-slam sprite through the freeze (drawn by the normal render path, which still runs).
  caster._spriteCastMove  = "ultimate"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  // Clear any leftover flight state so the ultimate reads cleanly.
  caster._flightActive = false
  return true
}

export function isOmniManBodySlamCinematicActive() { return cine.active }

export function getOmniManBodySlamCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_LEAP_END) return "leap"
  if (f < T_SLAM_END) return "slam"
  return "settle"
}

// Test/harness snapshot — surfaces the LIVE caster ref so a test can prove it's the real fighter.
export function getOmniManBodySlamCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getOmniManBodySlamCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateOmniManBodySlamCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.08            // let the framing settle within LEAP (never snaps)
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom
  }

  // Camera: frame BOTH fighters, easing to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_SLAM_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: builds over the descent, a hard shake on the SLAM connect, tremor after.
  if (cam && cam.shake) {
    if (f >= T_LEAP_END && f < T_IMPACT && f % 5 === 0) {
      cam.shake(4 + ((f - T_LEAP_END) / IMPACT_OFFSET) * 8, 8)
    } else if (f === T_IMPACT) {
      cam.shake(32, 30)
    } else if (f > T_IMPACT && f < T_SLAM_END && f % 6 === 0) {
      cam.shake(12, 10)
    }
  }

  // SLAM CONNECT — the guaranteed damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endOmniManBodySlamCinematic()
  return getOmniManBodySlamCinematicPhase()
}

function endOmniManBodySlamCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Beerus / Sword).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearOmniManBodySlamCinematic() {
  if (cine.active || cine._cam) endOmniManBodySlamCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank).
// The body-slam itself is the caster's sprite; this adds the energy vignette + impact flash + shockwave.
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawOmniManBodySlamCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1

  // Crimson speed-line vignette — Viltrumite power building through the leap/descent.
  let backdrop = 0
  if (f < T_SLAM_END)  backdrop = 0.34 * Math.min(1, f / T_LEAP_END)
  else                 backdrop = 0.34 * (1 - (f - T_SLAM_END) / BODY_SLAM_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#2a0a0a", backdrop)

  // The opponent's screen-space anchor (camera frames both; slam lands toward the opponent side).
  const oppX = cw * (0.5 + dir * 0.14), oppY = ch * 0.58

  // ── SLAM CONNECT — white/orange impact flash + expanding ground shockwave rings.
  if (f >= T_IMPACT && f < T_SLAM_END + 6) {
    const since = f - T_IMPACT
    const decay = Math.max(0, 1 - since / 22)
    _flash(ctx, cw, ch, "#ffffff", decay * 0.72)
    _flash(ctx, cw, ch, "#ff5a3c", decay * 0.24)
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    for (let i = 0; i < 3; i++) {
      const t = Math.max(0, Math.min(1, (since - i * 3) / 20))
      if (t <= 0 || t >= 1) continue
      const r = t * cw * 0.42
      ctx.strokeStyle = `rgba(255,${150 - i * 30},80,${(1 - t) * 0.7})`
      ctx.lineWidth = 8 * (1 - t) + 2
      ctx.beginPath(); ctx.ellipse(oppX, oppY, r, r * 0.34, 0, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
  }
}
