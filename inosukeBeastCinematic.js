// inosukeBeastCinematic.js
// INOSUKE HASHIBIRA — the three "Beast Breathing" CINEMATIC SPECIALS share ONE camera cinematic
// (push-IN → strike → pull-BACK), mirroring the EXACT freeze contract of shinobuButterflyCinematic.js /
// miwaUltimateCinematic.js, but SHORTER (specials, ~1.3s) and parameterized by variant:
//   spin  — cenematic_specail_1  (in-place spinning dual-blade slash)          → NEUTRAL special
//   dash  — cenematic_specail_2  (dashing thrust; caster closes the gap)       → FORWARD special
//   lunge — cenematic_specail_4  (slashing lunge fan; short forward lunge)     → DOWN    special
// (cenematic_specail_3 is ABSENT from the art upload — a genuine numbering gap, NOT wired.)
//
// Contract: abilities.executeInosukeSpecial() calls activateInosukeBeastCinematic(caster, opp, variant,
// onImpact). updateBattle() freezes combat while isInosukeBeastCinematicActive() and calls
// updateInosukeBeastCinematic({camera,...}) + camera.advance(). drawBattle() calls
// drawInosukeBeastCinematic(ctx, canvas). onImpact(ctx) applies the (range-gated) damage ONCE at the
// STRIKE beat. Every reset path calls clearInosukeBeastCinematic().
// The SHOW is Inosuke's OWN cine sprite, played through the freeze via _spriteCastMove.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// Per-variant timeline + framing. PUSH = camera eases in + caster closes distance; STRIKE = the hit beat;
// SETTLE = pull the camera back before combat resumes.
const VARIANTS = {
  spin:  { sprite: "inosukeCine1", push: 34, settle: 26, impactOffset: 16, zoom: 0.90, dash: 0,   flash: "#e0902e" },
  dash:  { sprite: "inosukeCine2", push: 30, settle: 24, impactOffset: 14, zoom: 0.86, dash: 150, flash: "#d98324" },
  lunge: { sprite: "inosukeCine4", push: 34, settle: 26, impactOffset: 18, zoom: 0.90, dash: 70,  flash: "#c9721c" },
}
const DASH_GAP = 72   // px short of the opponent the caster ends a closing dash at (strikes through)

const cine = {
  active: false, frame: 0, caster: null, opponent: null, variant: "spin", V: VARIANTS.spin,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null, startX: null, targetX: null,
  total: 0, impact: 0,
}

export function activateInosukeBeastCinematic(caster, opponent, variant, onImpact) {
  if (!caster) return false
  const V = VARIANTS[variant] || VARIANTS.spin
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.variant = VARIANTS[variant] ? variant : "spin"
  cine.V = V
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  cine.total  = V.push + V.settle + V.impactOffset + 8   // strike sits inside; a short tail after
  cine.impact = V.push + V.impactOffset
  const dir = (caster.facing ?? 1) >= 0 ? 1 : -1
  cine.startX = caster.x
  cine.targetX = (V.dash > 0)
    ? (opponent ? opponent.x - dir * DASH_GAP : caster.x + dir * V.dash)
    : caster.x                                            // spin stays put
  caster._spriteCastMove  = V.sprite
  caster._spriteCastTimer = cine.total + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isInosukeBeastCinematicActive() { return cine.active }

export function getInosukeBeastCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < cine.V.push) return "push"
  if (f < cine.total - cine.V.settle) return "strike"
  return "settle"
}

export function getInosukeBeastCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getInosukeBeastCinematicPhase(),
    variant: cine.variant, total: cine.total, impactFrame: cine.impact, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterX: cine.caster?.x ?? null,
    startX: cine.startX, targetX: cine.targetX, sprite: cine.V?.sprite ?? null,
  }
}

export function updateInosukeBeastCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame
  const V = cine.V

  if (f === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08 }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
  }

  // PUSH — for the closing variants (dash/lunge), ease the caster toward the opponent (combat frozen → safe).
  if (cine.caster && cine.startX != null && cine.targetX != null && cine.targetX !== cine.startX) {
    const t = Math.min(1, f / V.push)
    const eased = 1 - (1 - t) * (1 - t)
    cine.caster.x = cine.startX + (cine.targetX - cine.startX) * eased
  }

  // Camera: push IN to frame the action, then pull BACK to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    const settleStart = cine.total - V.settle
    if (f < settleStart) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, V.zoom)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, V.zoom)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: rising through the windup, a hard shake on the STRIKE, tremor after.
  if (cam && cam.shake) {
    if (f >= V.push && f < cine.impact && f % 4 === 0) cam.shake(3 + ((f - V.push) / Math.max(1, V.impactOffset)) * 6, 7)
    else if (f === cine.impact) cam.shake(24, 24)
    else if (f > cine.impact && f < cine.total - V.settle && f % 6 === 0) cam.shake(8, 9)
  }

  // STRIKE — the (range-gated) damage lands here, exactly once.
  if (f === cine.impact && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= cine.total) endInosukeBeastCinematic()
  return getInosukeBeastCinematicPhase()
}

function endInosukeBeastCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }   // never eat the payoff
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
  cine.startX = null; cine.targetX = null; cine.total = 0; cine.impact = 0
}

export function clearInosukeBeastCinematic() {
  if (cine.active || cine._cam) endInosukeBeastCinematic()
}

// ── DRAW — fullscreen SCREEN-space overlay: Inosuke's dusty/boar earthy palette. Building tan vignette →
// strike flash → radiating slash arcs (the dual-blade fan). Guarded, never blank.
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawInosukeBeastCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const V = cine.V
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1
  const settleStart = cine.total - V.settle

  // Earthy vignette — power building through the windup, fading in SETTLE.
  let backdrop = 0
  if (f < settleStart) backdrop = 0.30 * Math.min(1, f / V.push)
  else                 backdrop = 0.30 * (1 - (f - settleStart) / V.settle)
  _flash(ctx, cw, ch, "#1c1206", backdrop)

  const oppX = cw * (0.5 + dir * 0.15), oppY = ch * 0.54

  // STRIKE — tan/white flash + radiating dual-blade slash arcs (the "fan").
  if (f >= cine.impact && f < cine.total - 2) {
    const since = f - cine.impact
    const decay = Math.max(0, 1 - since / 22)
    _flash(ctx, cw, ch, "#ffffff", decay * 0.5)
    _flash(ctx, cw, ch, V.flash, decay * 0.32)
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    for (let i = 0; i < 5; i++) {
      const t = Math.max(0, Math.min(1, (since - i * 3) / 20))
      if (t <= 0 || t >= 1) continue
      const r = t * cw * 0.44
      ctx.strokeStyle = `rgba(${230 - i * 8},${170 - i * 12},${90 + i * 6},${(1 - t) * 0.7})`
      ctx.lineWidth = 7 * (1 - t) + 2
      ctx.beginPath()
      ctx.ellipse(oppX, oppY, r, r * 0.5, (i * Math.PI) / 5 + since * 0.14, 0, Math.PI * 1.6)
      ctx.stroke()
    }
    ctx.restore()
  }
}
