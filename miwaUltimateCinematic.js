// miwaUltimateCinematic.js
// KASUMI MIWA "BLADE OF THE NEOPHYTE" ULTIMATE — a frozen combat cinematic (battojutsu quick-draw).
// Mirrors the EXACT contract of rengokuFlameExplosionCinematic.js (activate / isActive / getPhase / update
// / draw / clear that truly FREEZES combat):
//   • abilities.executeMiwaUltimate() calls activateMiwaUltimateCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isMiwaUltimateCinematicActive() and calls
//     updateMiwaUltimateCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawMiwaUltimateCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the SLASH beat (caller owns the payoff).
//   • every reset path calls clearMiwaUltimateCinematic().
//
// The SHOW is Miwa's OWN sprite: the 8-frame `ultimate` clip (windup — sword drawn back → explosive forward
// slash) plays through the freeze via _spriteCastMove:"ultimate" (sprite frames advance in the draw path,
// which still runs while combat is frozen). This overlay is lean — a cool cursed-energy vignette + a
// white/azure flash + a horizontal slash-arc streak at the connect beat.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — 114f total (~1.9s):
//   WINDUP [0,44)    44f  camera pushes IN; Miwa drops into the draw stance, cursed energy gathers on the edge
//   SLASH  [44,88)   44f  at the SLASH beat (+10) the guaranteed slash damage + azure/white flash + slash arc
//   SETTLE [88,114)  26f  flash/arc fade, camera pulls BACK before combat resumes
// ─────────────────────────────────────────────────────────────────
export const MIWA_ULT_CINE_TIMELINE = { WINDUP: 44, SLASH: 44, SETTLE: 26 }
const T_WINDUP_END = MIWA_ULT_CINE_TIMELINE.WINDUP                  // 44
const T_SLASH_END  = T_WINDUP_END + MIWA_ULT_CINE_TIMELINE.SLASH    // 88
const T_TOTAL      = T_SLASH_END + MIWA_ULT_CINE_TIMELINE.SETTLE    // 114

const IMPACT_OFFSET = 10                          // frames into SLASH the blade CONNECTS
const T_IMPACT = T_WINDUP_END + IMPACT_OFFSET      // 54

const CINE_ZOOM = 0.82   // frame BOTH fighters (the slash reaches across to the opponent)

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// ACTIVATION (from abilities.executeMiwaUltimate). onImpact(ctx) applies the real damage — ONCE, at the slash.
export function activateMiwaUltimateCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Play her ultimate sprite through the freeze (drawn by the normal render path, which still runs).
  caster._spriteCastMove  = "ultimate"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isMiwaUltimateCinematicActive() { return cine.active }

export function getMiwaUltimateCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_WINDUP_END) return "windup"
  if (f < T_SLASH_END)  return "slash"
  return "settle"
}

// Test/harness snapshot — surfaces the LIVE caster ref so a test can prove it's the real fighter.
export function getMiwaUltimateCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getMiwaUltimateCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// UPDATE (per frame while active; game.js freezes combat around this)
export function updateMiwaUltimateCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08 }   // smooth push-in
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
  }

  // Camera: push IN to frame BOTH fighters through the slash, then pull BACK on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_SLASH_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: a rising tension through the windup, a hard crack on the SLASH, a brief tremor after.
  if (cam && cam.shake) {
    if (f >= T_WINDUP_END && f < T_IMPACT && f % 4 === 0) cam.shake(3 + ((f - T_WINDUP_END) / IMPACT_OFFSET) * 6, 6)
    else if (f === T_IMPACT) cam.shake(30, 28)
    else if (f > T_IMPACT && f < T_SLASH_END && f % 7 === 0) cam.shake(9, 8)
  }

  // SLASH — the guaranteed damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endMiwaUltimateCinematic()
  return getMiwaUltimateCinematicPhase()
}

function endMiwaUltimateCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Rengoku / Superman / Beerus).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearMiwaUltimateCinematic() {
  if (cine.active || cine._cam) endMiwaUltimateCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank). The slash itself
// is the caster's sprite; this adds a cursed-energy vignette + the connect flash + a horizontal slash arc.
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawMiwaUltimateCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1

  // Cool cursed-energy vignette — gathering through the windup, fading in SETTLE.
  let backdrop = 0
  if (f < T_SLASH_END) backdrop = 0.34 * Math.min(1, f / T_WINDUP_END)
  else                 backdrop = 0.34 * (1 - (f - T_SLASH_END) / MIWA_ULT_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#04121f", backdrop)

  const oppX = cw * (0.5 + dir * 0.14), oppY = ch * 0.55

  // ── CONNECT — white/azure flash + a sweeping horizontal slash arc across the opponent.
  if (f >= T_IMPACT && f < T_SLASH_END + 6) {
    const since = f - T_IMPACT
    const decay = Math.max(0, 1 - since / 22)
    _flash(ctx, cw, ch, "#ffffff", decay * 0.6)
    _flash(ctx, cw, ch, "#38bdf8", decay * 0.3)
    // slash arc — a thin bright streak sweeping across from Miwa's side toward the opponent.
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    const t = Math.max(0, Math.min(1, since / 16))
    const sweep = cw * (0.10 + 0.80 * t) * dir
    const midX = cw * 0.5, y = oppY
    ctx.strokeStyle = `rgba(224,242,254,${(1 - t) * 0.9})`
    ctx.lineWidth = 10 * (1 - t) + 2
    ctx.beginPath()
    ctx.moveTo(midX - sweep * 0.5, y - cw * 0.05)
    ctx.lineTo(midX + sweep * 0.5, y + cw * 0.05)
    ctx.stroke()
    // a second, fainter azure trail
    ctx.strokeStyle = `rgba(56,189,248,${(1 - t) * 0.5})`
    ctx.lineWidth = 18 * (1 - t) + 2
    ctx.beginPath()
    ctx.moveTo(midX - sweep * 0.5, y - cw * 0.02)
    ctx.lineTo(midX + sweep * 0.5, y + cw * 0.08)
    ctx.stroke()
    ctx.restore()
  }
}
