// beerusKiBallCinematic.js
// BEERUS "Ki Ball" ULTIMATE — a frozen combat cinematic. Mirrors the EXACT contract of
// vegetaFinalFlashCinematic.js / gokuBlackSwordCinematic.js / kurama.js (activate / isActive /
// getPhase / update / draw / clear that truly FREEZES combat) — NOT a parallel system:
//   • abilities.executeBeerusUltimate() calls activateBeerusKiBallCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isBeerusKiBallCinematicActive() and calls
//     updateBeerusKiBallCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawBeerusKiBallCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the IMPACT connect beat (caller owns the payoff).
//   • every reset path calls clearBeerusKiBallCinematic().
//
// Unlike Vegeta's procedural beam, Beerus has real orb art: the charging orb grows through
// ki_ball_part_1 (plain scale-up) → ki_ball_part_2 (escalating flame/lightning, frames 5-6 are
// the LOOP-HOLD pair while fully built), then ki_ball_part_3 (orb-sink → explosion → starburst)
// fires ONLY at the connect beat — never spawned during the charge (the part_3-premature bug class).
// Beerus himself holds the ki_ball CAST pose (his own sprite; the orb is drawn here, not in that sheet).
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — ~216f total (~3.6s):
//   CHARGE [0,84)     84f  camera frames BOTH fighters; Beerus casts (ki_ball pose), the orb
//                           grows part_1 → part_2 in his hands, escalating + rumble building
//   FIRE   [84,174)   90f  the orb RELEASES and CONNECTS: at the IMPACT beat the part_3 explosion +
//                           white/orange flash + guaranteed damage land on the opponent
//   SETTLE [174,216)  42f  explosion fades, camera eases back before combat resumes
// ─────────────────────────────────────────────────────────────────
export const KI_BALL_CINE_TIMELINE = { CHARGE: 84, FIRE: 90, SETTLE: 42 }
const T_CHARGE_END = KI_BALL_CINE_TIMELINE.CHARGE                 // 84
const T_FIRE_END   = T_CHARGE_END + KI_BALL_CINE_TIMELINE.FIRE    // 174
const T_TOTAL      = T_FIRE_END + KI_BALL_CINE_TIMELINE.SETTLE    // 216

// The orb CONNECTS this many frames into FIRE — the damage/flash/explosion beat.
const IMPACT_OFFSET = 24
const T_IMPACT = T_CHARGE_END + IMPACT_OFFSET                     // 108

const CINE_ZOOM = 0.82   // frames BOTH fighters (the ball is thrown ON the opponent)

// Orb art strips (re-sliced, uniform cells). Lazy-loaded Images, cached by src.
const P1_SHEET = { src: "./beerus_ki_ball_p1_u.png", frames: 2, w: 86,  h: 86 }    // plain orb small→large
const P2_SHEET = { src: "./beerus_ki_ball_p2_u.png", frames: 6, w: 304, h: 308 }   // escalating; frames 5-6 (idx 4-5) = loop-hold
const P3_SHEET = { src: "./beerus_ki_ball_p3_u.png", frames: 4, w: 242, h: 184 }   // impact: sink → explosion → starburst
const _imgs = {}
function _img(src) { if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im } return _imgs[src] }

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeBeerusUltimate). onImpact(ctx) applies the real
// damage — invoked ONCE at the IMPACT connect beat.
// ─────────────────────────────────────────────────────────────────
export function activateBeerusKiBallCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Hold Beerus's ki_ball CAST pose through the freeze (sprite frames advance in the draw path,
  // which still runs while combat is frozen). Cleared at end so the pose can't linger.
  caster._spriteCastMove  = "kiBall"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isBeerusKiBallCinematicActive() { return cine.active }

export function getBeerusKiBallCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_CHARGE_END) return "charge"
  if (f < T_FIRE_END) return "fire"
  return "settle"
}

// Test/harness snapshot — also surfaces the LIVE caster ref so a test can prove it's the real
// fighter performing the move (not a duplicate instance — the Vegeta-SSJ-ultimate bug class).
export function getBeerusKiBallCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getBeerusKiBallCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateBeerusKiBallCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.08            // let the framing settle within CHARGE (never snaps)
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom
  }

  // Ultimate VOICE at the CHARGE/cast beginning (well before the impact beat @T_IMPACT) — mirrors
  // gokuBlackSwordCinematic firing its voice line at a fixed timeline frame via playSfxFile.
  if (f === 6) { try { snd?.playSfxFile?.("beerus_ultimate_activate.mp3", null) } catch (_) {} }

  // Camera: frame BOTH fighters, easing to normal on SETTLE.
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

  // Rumble: builds over the back of CHARGE, a hard shake on the IMPACT connect, tremor after.
  if (cam && cam.shake) {
    if (f >= T_CHARGE_END - 40 && f < T_CHARGE_END && f % 6 === 0) {
      cam.shake(4 + ((f - (T_CHARGE_END - 40)) / 40) * 8, 8)
    } else if (f === T_IMPACT) {
      cam.shake(30, 30)
    } else if (f > T_IMPACT && f < T_FIRE_END && f % 6 === 0) {
      cam.shake(11, 10)
    }
  }

  // IMPACT CONNECT — the guaranteed damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endBeerusKiBallCinematic()
  return getBeerusKiBallCinematicPhase()
}

function endBeerusKiBallCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Vegeta / Sword).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearBeerusKiBallCinematic() {
  if (cine.active || cine._cam) endBeerusKiBallCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank)
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}
function _drawSprite(ctx, img, sheet, frameIdx, cx, cy, dh) {
  if (!img.complete || img.naturalWidth === 0) return false
  const scale = dh / sheet.h
  const dw = sheet.w * scale
  ctx.drawImage(img, frameIdx * sheet.w, 0, sheet.w, sheet.h, cx - dw / 2, cy - dh / 2, dw, dh)
  return true
}

export function drawBeerusKiBallCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1

  // Deep-purple vignette backdrop — Beerus's Destruction energy; subtle so both fighters read.
  let backdrop = 0
  if (f < T_CHARGE_END)   backdrop = (f / T_CHARGE_END) * 0.40
  else if (f < T_FIRE_END) backdrop = 0.40
  else                     backdrop = 0.40 * (1 - (f - T_FIRE_END) / KI_BALL_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#140820", backdrop)

  // Beerus's side (hands) and the opponent's side, in screen space (camera frames both).
  const handX = cw * (dir >= 0 ? 0.40 : 0.60), handY = ch * 0.46
  const oppX  = cw * (0.5 + dir * 0.16),        oppY  = ch * 0.52

  // ── CHARGE — orb grows in his hands: part_1 (plain) then part_2 (escalating, loop-hold on 4-5).
  if (f < T_CHARGE_END) {
    const p = f / T_CHARGE_END
    // gathering purple glow behind the orb
    ctx.save()
    const g = ctx.createRadialGradient(handX, handY, 6, handX, handY, cw * 0.34)
    const gl = (0.16 + 0.5 * p) * (0.74 + 0.26 * Math.sin(f * 0.5))
    g.addColorStop(0, `rgba(224,160,255,${0.42 * gl})`)
    g.addColorStop(0.5, `rgba(178,76,240,${0.16 * gl})`)
    g.addColorStop(1, "rgba(178,76,240,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore()

    ctx.save(); ctx.globalCompositeOperation = "lighter"
    if (f < 20) {
      // part_1 — plain orb scaling up
      const fi = Math.min(P1_SHEET.frames - 1, Math.floor(f / 10))
      _drawSprite(ctx, _img(P1_SHEET.src), P1_SHEET, fi, handX, handY, ch * (0.10 + 0.10 * (f / 20)))
    } else {
      // part_2 — escalating; advance to the loop-hold pair (idx 4-5) and alternate while held
      const into = f - 20
      let fi = Math.floor(into / 8)
      if (fi >= 4) fi = 4 + (Math.floor(into / 6) % 2)        // 4↔5 flicker loop-hold
      fi = Math.min(P2_SHEET.frames - 1, fi)
      const dh = ch * (0.22 + 0.20 * Math.min(1, into / (T_CHARGE_END - 20)))
      _drawSprite(ctx, _img(P2_SHEET.src), P2_SHEET, fi, handX, handY, dh)
    }
    ctx.restore()
  }

  // ── FIRE — the orb releases, streaks to the opponent, then the impact explosion + flash land.
  if (f >= T_CHARGE_END && f < T_FIRE_END) {
    const intoFire = f - T_CHARGE_END
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    if (intoFire < IMPACT_OFFSET) {
      // fully-charged orb (part_2 final frame) travelling from hands to the opponent
      const t = intoFire / IMPACT_OFFSET
      const ox = handX + (oppX - handX) * t
      const oy = handY + (oppY - handY) * t
      _drawSprite(ctx, _img(P2_SHEET.src), P2_SHEET, P2_SHEET.frames - 1, ox, oy, ch * (0.42 - 0.06 * t))
    } else {
      // IMPACT: part_3 explosion at the opponent + decaying white/orange flash
      const since = intoFire - IMPACT_OFFSET
      const decay = Math.max(0, 1 - since / 24)
      _flash(ctx, cw, ch, "#ffffff", decay * 0.78)
      _flash(ctx, cw, ch, "#ffb84d", decay * 0.34)
      const fi = Math.min(P3_SHEET.frames - 1, Math.floor(since / 5))
      _drawSprite(ctx, _img(P3_SHEET.src), P3_SHEET, fi, oppX, oppY, ch * 0.72)
    }
    ctx.restore()
  }
}
