// madaraTengaiShinseiCinematic.js
// MADARA — "Perfect Susanoo / Tengai Shinsei" (TAP Ultimate tier) — a frozen combat cinematic. Mirrors the
// EXACT contract of rengokuFlameExplosionCinematic.js (activate / isActive / getPhase / update / draw / clear
// that truly FREEZES combat):
//   • abilities.executeMadaraUltimate(TAP) calls activateMadaraTengaiShinseiCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isMadaraTengaiShinseiCinematicActive() and calls
//     updateMadaraTengaiShinseiCinematic({camera, sound, ...}) + camera.advance().
//   • drawBattle() calls drawMadaraTengaiShinseiCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the METEOR-IMPACT beat (caller owns the payoff).
//   • every reset path calls clearMadaraTengaiShinseiCinematic().
//
// The SHOW: Madara raises the Perfect Susanoo (his summon pose plays through the freeze via
// _spriteCastMove:"madaraTengaiCast"); a Rinnegan flash tints the sky; a colossal meteor (meteor_smash art)
// falls from the top of the screen onto the opponent → the explosion sprite + white flash + shockwave rings.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// TIMELINE (frames @60fps) — 156f total (~2.6s):
//   SUMMON [0,52)    52f  camera pulls back to frame both; Madara raises Perfect Susanoo, sky darkens (Rinnegan)
//   FALL   [52,104)  52f  the meteor plummets from the top of the screen toward the opponent
//   IMPACT [104,140) 36f  meteor lands → explosion + white flash + shockwave; the guaranteed damage lands here
//   SETTLE [140,156) 16f  flash/rings fade, camera returns before combat resumes
export const MADARA_TENGAI_TIMELINE = { SUMMON: 52, FALL: 52, IMPACT: 36, SETTLE: 16 }
const T_SUMMON_END = MADARA_TENGAI_TIMELINE.SUMMON                       // 52
const T_FALL_END   = T_SUMMON_END + MADARA_TENGAI_TIMELINE.FALL          // 104
const T_IMPACT_END = T_FALL_END + MADARA_TENGAI_TIMELINE.IMPACT          // 140
const T_TOTAL      = T_IMPACT_END + MADARA_TENGAI_TIMELINE.SETTLE        // 156
const T_IMPACT     = T_FALL_END                                          // 104 — the meteor touches down

const CINE_ZOOM = 0.78   // pull back to frame both fighters + room for the falling meteor

// lightweight image cache (screen-space overlay art)
const _imgs = {}
function _img(src) {
  if (typeof Image === "undefined") return null
  let im = _imgs[src]
  if (!im) { im = new Image(); im.src = src; _imgs[src] = im }
  return (im.complete && im.naturalWidth > 0) ? im : null
}

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

export function activateMadaraTengaiShinseiCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true; cine.frame = 0
  cine.caster = caster; cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false; cine._cam = null; cine.savedMaxStep = null
  caster._spriteCastMove  = "madaraTengaiCast"     // the Perfect Susanoo summon pose plays through the freeze
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false; caster.vx = 0
  return true
}

export function isMadaraTengaiShinseiCinematicActive() { return cine.active }

export function getMadaraTengaiShinseiCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_SUMMON_END) return "summon"
  if (f < T_FALL_END)   return "fall"
  if (f < T_IMPACT_END) return "impact"
  return "settle"
}

export function getMadaraTengaiShinseiCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getMadaraTengaiShinseiCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

export function updateMadaraTengaiShinseiCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08 }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
  }

  // Camera: frame BOTH fighters through the fall/impact, then return to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    const z = f < T_IMPACT_END ? CINE_ZOOM : 1.0
    if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, z)
    else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, z)
  }

  // Rumble: a growing tremor as the meteor nears, a hard slam at IMPACT, aftershocks after.
  if (cam && cam.shake) {
    if (f >= T_SUMMON_END && f < T_IMPACT && f % 5 === 0) cam.shake(3 + ((f - T_SUMMON_END) / MADARA_TENGAI_TIMELINE.FALL) * 9, 8)
    else if (f === T_IMPACT) cam.shake(40, 36)
    else if (f > T_IMPACT && f < T_IMPACT_END && f % 6 === 0) cam.shake(14, 12)
  }

  // METEOR IMPACT — the guaranteed damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endMadaraTengaiShinseiCinematic()
  return getMadaraTengaiShinseiCinematicPhase()
}

function endMadaraTengaiShinseiCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }   // never eat the payoff
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

export function clearMadaraTengaiShinseiCinematic() {
  if (cine.active || cine._cam) endMadaraTengaiShinseiCinematic()
}

// ── DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank). ──
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawMadaraTengaiShinseiCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1
  const oppX = cw * (0.5 + dir * 0.16), oppY = ch * 0.60   // the meteor's target (opponent side)

  // Rinnegan sky darken — builds through summon/fall, fades in settle.
  let backdrop = 0
  if (f < T_IMPACT_END) backdrop = 0.42 * Math.min(1, f / T_FALL_END)
  else                  backdrop = 0.42 * (1 - (f - T_IMPACT_END) / MADARA_TENGAI_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#0a0410", backdrop)
  // faint purple Rinnegan wash during summon
  if (f < T_FALL_END) {
    const rg = _img("./madara2_reneggan_genjustu_effect.png")
    if (rg) { ctx.save(); ctx.globalAlpha = 0.20 * Math.min(1, f / T_SUMMON_END); ctx.drawImage(rg, cw * 0.5 - 180, ch * 0.12, 360, 130); ctx.restore() }
    else    { _flash(ctx, cw, ch, "#3b1a5c", 0.10 * Math.min(1, f / T_SUMMON_END)) }
  }

  // ── FALL — the colossal meteor plummets from the top of the screen toward the opponent. ──
  if (f >= T_SUMMON_END && f < T_IMPACT) {
    const t = (f - T_SUMMON_END) / MADARA_TENGAI_TIMELINE.FALL           // 0→1
    const mx = cw * (0.5 + dir * 0.16 * t) - (dir * cw * 0.10 * (1 - t))  // arcs in toward the target
    const my = -ch * 0.25 + (oppY + ch * 0.25) * t                        // top → target
    const size = ch * (0.46 + 0.60 * t)                                   // grows as it nears — fills the screen at impact (genuine meteor scale)
    const met = _img("./madara2_meteor_smash.png")
    ctx.save(); ctx.globalCompositeOperation = "lighter"                   // fiery trail
    ctx.globalAlpha = 0.5
    ctx.fillStyle = "#ff7a1a"
    ctx.beginPath(); ctx.ellipse(mx, my - size * 0.4, size * 0.28, size * 0.9, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    if (met) { ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(met, mx - size / 2, my - size / 2, size, size); ctx.restore() }
    else     { ctx.save(); ctx.fillStyle = "#8a4a12"; ctx.beginPath(); ctx.arc(mx, my, size / 2, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  }

  // ── IMPACT — explosion sprite (8f) + white flash + shockwave rings. ──
  if (f >= T_IMPACT && f < T_IMPACT_END + 4) {
    const since = f - T_IMPACT
    const decay = Math.max(0, 1 - since / 26)
    _flash(ctx, cw, ch, "#ffffff", decay * 0.7)
    _flash(ctx, cw, ch, "#ff7a1a", decay * 0.3)
    const exp = _img("./madara2_meteor_smash_explasion_effect.png")
    if (exp) {
      const frames = 8, fw = exp.naturalWidth / frames, fh = exp.naturalHeight
      const fi = Math.min(frames - 1, Math.floor(since / 4))
      const es = ch * 1.1
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - since / 34)
      ctx.drawImage(exp, fi * fw, 0, fw, fh, oppX - es / 2, oppY - es * 0.5, es, es * (fh / fw))
      ctx.restore()
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    for (let i = 0; i < 3; i++) {
      const t = Math.max(0, Math.min(1, (since - i * 3) / 24))
      if (t <= 0 || t >= 1) continue
      const r = t * cw * 0.55
      ctx.strokeStyle = `rgba(255,${160 - i * 40},${60 + i * 20},${(1 - t) * 0.7})`
      ctx.lineWidth = 10 * (1 - t) + 2
      ctx.beginPath(); ctx.ellipse(oppX, oppY, r, r * 0.34, 0, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
  }
}
