// vegetaFinalFlashCinematic.js
// VEGETA "Overcharged Final Flash" ULTIMATE — a frozen combat cinematic. Mirrors
// gokuBlackSwordCinematic.js / kurama.js / ssjRoseCinematic.js EXACTLY (the same
// activate / isActive / getPhase / update / draw / clear contract that truly FREEZES
// combat) — NOT a parallel system:
//   • abilities.executeVegetaUltimate() calls activateVegetaFinalFlashCinematic(caster,
//     opponent, onImpact) — the OVERCHARGED version of the Stage-4 Final Flash special:
//     bigger beam/explosion draw, brighter flash, camera pulls in, biggest hit in his kit.
//   • updateBattle() freezes combat while isVegetaFinalFlashCinematicActive(): it calls
//     updateVegetaFinalFlashCinematic({camera, sound, hitEffects, damageNumbers}) +
//     camera.advance() and returns early — the SAME contract as Kurama / SSJ Rose / Sword.
//   • drawBattle() calls drawVegetaFinalFlashCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the FIRE connect beat (caller owns the payoff).
//   • every reset path calls clearVegetaFinalFlashCinematic().
//
// Reuses the SAME art as the Final Flash special (vegeta_base_final_flash_effect / _ultimate),
// drawn bigger/brighter here — the "no new art needed" pattern the design called for.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — ~198f total (~3.3s):
//   WINDUP [0,66)    66f  camera pulls in framing BOTH fighters; Vegeta braces (charge pose),
//                          gold energy gathers in his hands, rumble builds
//   FIRE   [66,150)  84f  the overcharged beam ERUPTS and CONNECTS: damage + the impact
//                          explosion + white/gold flash land at the IMPACT beat
//   SETTLE [150,198) 48f  beam + explosion fade, camera eases back before combat resumes
// ─────────────────────────────────────────────────────────────────
export const FINAL_FLASH_CINE_TIMELINE = { WINDUP: 66, FIRE: 84, SETTLE: 48 }
const T_WINDUP_END = FINAL_FLASH_CINE_TIMELINE.WINDUP                 // 66
const T_FIRE_END   = T_WINDUP_END + FINAL_FLASH_CINE_TIMELINE.FIRE    // 150
const T_TOTAL      = T_FIRE_END + FINAL_FLASH_CINE_TIMELINE.SETTLE    // 198

// The beam CONNECTS this many frames into FIRE — the damage/flash/explosion beat.
const IMPACT_OFFSET = 14
const T_IMPACT = T_WINDUP_END + IMPACT_OFFSET                         // 80

const CINE_ZOOM = 0.80   // frames BOTH fighters, pulled out a touch (matches Sword's framing feel)

// Impact explosion strip (re-sliced from vegeta_base_final_flash_ultimate.png). Lazy-loaded Image.
// FORM-AWARE: an SSJ caster swaps to the gold SSJ explosion sheet, drawn bigger/brighter (Stage 5).
const IMPACT_SHEET      = { src: "./vegeta_base_finalflash_impact_uniform.png", frames: 17, w: 71, h: 94 }
const SSJ_IMPACT_SHEET  = { src: "./vegeta_ssj_finalflash_impact_uniform.png", frames: 17, w: 71, h: 83 }
const BLUE_IMPACT_SHEET = { src: "./vegeta_blue_finalflash_beam_uniform.png", frames: 12, w: 258, h: 156 }   // Blue reuses its Stage-4 beam art, drawn as the blast
const _impactImgs = {}   // cache keyed by src
function _getImpactImg(src) {
  if (!_impactImgs[src]) { const im = new Image(); im.src = src; _impactImgs[src] = im }
  return _impactImgs[src]
}

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeVegetaUltimate). onImpact(ctx) applies the real
// damage — invoked ONCE at the FIRE connect beat.
// ─────────────────────────────────────────────────────────────────
export function activateVegetaFinalFlashCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Hold Vegeta's power-up brace pose through the freeze (sprite frames advance in the draw path,
  // which still runs while combat is frozen). Cleared at end so the pose can't linger.
  caster._spriteCastMove  = "charge"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isVegetaFinalFlashCinematicActive() { return cine.active }

export function getVegetaFinalFlashCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_WINDUP_END) return "windup"
  if (f < T_FIRE_END) return "fire"
  return "settle"
}

// Test/harness snapshot.
export function getVegetaFinalFlashCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getVegetaFinalFlashCinematicPhase(), total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateVegetaFinalFlashCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.08            // let the framing settle within WINDUP (never snaps)
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom (Kurama / SSJ Rose / Sword)
  }

  // Camera: frame BOTH fighters (this attack lands ON the opponent), easing to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_FIRE_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: builds over the back of WINDUP, a hard shake on the FIRE connect, tremor after.
  if (cam && cam.shake) {
    if (f >= T_WINDUP_END - 36 && f < T_WINDUP_END && f % 6 === 0) {
      cam.shake(4 + ((f - (T_WINDUP_END - 36)) / 36) * 7, 8)
    } else if (f === T_IMPACT) {
      cam.shake(26, 28)
    } else if (f > T_IMPACT && f < T_FIRE_END && f % 6 === 0) {
      cam.shake(10, 10)
    }
  }

  // FIRE CONNECT — the guaranteed damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endVegetaFinalFlashCinematic()
  return getVegetaFinalFlashCinematicPhase()
}

function endVegetaFinalFlashCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic — if we end before the connect
  // beat, still apply the hit (mirrors SSJ Rose / Sword onResolve safety).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearVegetaFinalFlashCinematic() {
  if (cine.active || cine._cam) endVegetaFinalFlashCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank)
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

// A thick horizontal beam sweeping across the screen toward the opponent (white core → gold, or cyan for Blue).
function drawBeam(ctx, cw, ch, dir, alpha, thick, blue = false) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = Math.min(1, alpha)
  const cy = ch * 0.5
  ctx.shadowColor = blue ? "#7fd4ff" : "#ffe066"; ctx.shadowBlur = 50
  const mid = blue ? "rgba(127,212,255,0.9)" : "rgba(255,224,102,0.9)"
  const tail = blue ? "rgba(60,170,255,0)" : "rgba(255,200,40,0)"
  const grad = ctx.createLinearGradient(0, 0, cw, 0)
  const stops = dir >= 0
    ? [[0, "rgba(255,255,255,0.95)"], [0.5, mid], [1, tail]]
    : [[0, tail], [0.5, mid], [1, "rgba(255,255,255,0.95)"]]
  for (const [o, c] of stops) grad.addColorStop(o, c)
  ctx.fillStyle = grad
  ctx.fillRect(0, cy - thick / 2, cw, thick)
  // bright white core
  ctx.globalAlpha = Math.min(1, alpha * 0.9)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, cy - thick * 0.16, cw, thick * 0.32)
  ctx.restore()
}

export function drawVegetaFinalFlashCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1
  const blue = !!cine.caster?._ssjBlueActive   // Blue = cyan beam/glow (else gold)

  // Deep-blue vignette backdrop — kept subtle so BOTH fighters stay visible.
  let backdrop = 0
  if (f < T_WINDUP_END)    backdrop = (f / T_WINDUP_END) * 0.34
  else if (f < T_FIRE_END) backdrop = 0.34
  else                     backdrop = 0.34 * (1 - (f - T_FIRE_END) / FINAL_FLASH_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#0a1030", backdrop)

  // WINDUP — gathering gold energy glow, pulsing and building toward the eruption.
  if (f < T_WINDUP_END) {
    const p = f / T_WINDUP_END
    const cx = cw * (dir >= 0 ? 0.36 : 0.64), cy = ch * 0.5
    const glow = (0.15 + 0.55 * p) * (0.72 + 0.28 * Math.sin(f * 0.5))
    ctx.save()
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, cw * 0.4)
    g.addColorStop(0, blue ? `rgba(127,212,255,${0.4 * glow})` : `rgba(255,224,102,${0.4 * glow})`)
    g.addColorStop(0.55, `rgba(255,196,40,${0.15 * glow})`)
    g.addColorStop(1, "rgba(255,196,40,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore()
  }

  // FIRE — the overcharged beam + impact explosion + white/gold flash, peaking at the connect.
  if (f >= T_WINDUP_END && f < T_FIRE_END) {
    const intoFire = f - T_WINDUP_END
    // Beam ramps up over the first ~14f (to the impact), then holds bright, then fades late.
    const beamAlpha = Math.min(1, intoFire / IMPACT_OFFSET) * (f < T_FIRE_END - 18 ? 1 : Math.max(0, (T_FIRE_END - f) / 18))
    const thick = ch * (0.10 + 0.06 * Math.min(1, intoFire / IMPACT_OFFSET))
    drawBeam(ctx, cw, ch, dir, beamAlpha, thick, blue)

    const sinceImpact = f - T_IMPACT
    if (sinceImpact >= 0) {
      // FORM-AWARE overcharge: base gold → SSJ brighter gold → Blue brightest + cyan, biggest blast.
      const superT = blue || !!cine.caster?._ssjActive
      const decay  = Math.max(0, 1 - sinceImpact / 20)
      _flash(ctx, cw, ch, "#ffffff", decay * (blue ? 0.82 : superT ? 0.72 : 0.55))
      _flash(ctx, cw, ch, blue ? "#7fd4ff" : "#ffe066", decay * (blue ? 0.46 : superT ? 0.40 : 0.28))

      // Impact explosion sprite at the opponent side, scaled BIG (biggest for Blue).
      const IS = blue ? BLUE_IMPACT_SHEET : superT ? SSJ_IMPACT_SHEET : IMPACT_SHEET
      const _impactImg = _getImpactImg(IS.src)
      if (_impactImg.complete && _impactImg.naturalWidth > 0) {
        const frames = IS.frames, fw = IS.w, fh = IS.h
        const fi = Math.min(frames - 1, Math.floor(sinceImpact / 3))
        const scale = ch / fh * (blue ? 1.3 : superT ? 1.15 : 0.9)   // Blue blast fills the most screen
        const dw = fw * scale, dh = fh * scale
        // Near frame-centre (where the impact reads regardless of zoom/framing), biased a touch
        // toward the opponent along the beam's travel direction.
        const ex = cw * (0.5 + dir * 0.12), ey = ch * 0.5
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        ctx.translate(ex, ey)
        ctx.drawImage(_impactImg, fi * fw, 0, fw, fh, -dw / 2, -dh / 2, dw, dh)
        ctx.restore()
      }
    }
  }
}
