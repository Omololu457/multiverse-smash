// obitoJuubiCinematic.js
// OBITO ULTIMATE — "Ten-Tails Jinchūriki / Tailed Beast Bomb" CINEMATIC.
// A dedicated module that REUSES the proven kurama.js / minatoKurama.js freeze-cinematic giant-avatar
// architecture (combat-frozen, camera-driven, fullscreen scripted sequence with a GUARANTEED effect),
// but draws OBITO'S OWN dedicated Juubi art THROUGHOUT — no Kurama sprites are referenced here.
//
// SEQUENCE (camera push-in → giant form → one big attack → pull back):
//   ACTIVATE — a summoning burst + Mokuton (wood release) erupts from the ground where the beast rises.
//   WIDEN    — the arena pulls OUT; a violet ground glow marks the eruption point.
//   RISE     — the Ten-Tails (Juubi) erupts on the edge OPPOSITE the opponent, silhouette→reveal, facing them.
//   CHARGE   — the Juubi rears/roars (jaw works) and a Bijūdama (Tailed Beast Bomb) condenses at its maw.
//   FIRE     — the Bijūdama streaks maw→opponent and detonates; GUARANTEED damage (survivable from full).
//   SETTLE   — the blast fades, the beast sinks, the camera restores.
//
// Contract with game.js (mirrors minatoKurama.js exactly):
//   • abilities.executeObitoUltimate() spends the meter then calls activateObitoJuubi(caster, opponent).
//   • updateBattle() freezes combat while isObitoJuubiCinematicActive(): calls updateObitoJuubi({camera,
//     hitEffects, damageNumbers, sound}) + camera.advance() and returns early.
//   • drawBattle() calls drawObitoJuubi(ctx, canvas) as a fullscreen screen-space overlay.
//   • every reset path calls clearObitoJuubi().
// The real caster is hidden via `_kuramaHide` (the shared "don't double-render the frozen body" flag).
// Self-contained: imports only sound.js (no cycle).

import { sound as globalSound, SFX } from "./sound.js"
import { applyScaledDamage } from "./combat.js"   // Stage 1a: the one scaled-damage choke-point

// ── TIMELINE (frames @60fps) ──
const TL = { ACTIVATE: 42, WIDEN: 20, RISE: 42, CHARGE: 52, FIRE: 46, SETTLE: 26 }
const T_ACT_END    = TL.ACTIVATE                       // 42
const T_WIDEN_END  = T_ACT_END   + TL.WIDEN            // 62
const T_RISE_END   = T_WIDEN_END + TL.RISE             // 104
const T_CHARGE_END = T_RISE_END  + TL.CHARGE           // 156
const T_FIRE_END   = T_CHARGE_END + TL.FIRE            // 202
const T_TOTAL      = T_FIRE_END  + TL.SETTLE           // 228
const IMPACT_OFFSET = 14
const T_IMPACT = T_CHARGE_END + IMPACT_OFFSET          // 170

const WIDE_ZOOM = 0.52
const JUUBI_DAMAGE = 360                               // cinematic band (survivable from full; ≈ Madara Tengai 340)
const BLOCKED_RATIO = 0.20                             // held block → chipped Bijūdama

// Kamui/Rinnegan palette for the energy FX (the grey beast is drawn from art).
const VIOLET = "#9A6BFF", DEEP = "#2a0f4a", DARKCORE = "#150a22"

const cine = {
  active: false, frame: 0, caster: null, opponent: null, damageDealt: false,
  enemySide: 1, faceLeft: false, _cam: null, savedMaxStep: null
}

// ── art registry (lazy image cache; frame metadata for the multi-frame Obito sheets) ──
const ART = {}
function img(name) { let i = ART[name]; if (!i) { i = new Image(); i.src = `./${name}.png`; ART[name] = i } return i }
const A = {
  juubi:  { name: "obito_juubi_uniform",        frames: 3, fw: 710, fh: 594 },  // 0 = mouth-closed rise · 1 = jaw-open roar · 2 = howl/fire
  summon: { name: "obito_juubi_summon_uniform", frames: 2, fw: 56,  fh: 55  },  // summoning burst
  moku:   { name: "obito_mokuton_uniform",      frames: 2, fw: 48,  fh: 75  }   // Mokuton wood-release
}
function preload() { Object.values(A).forEach(a => img(a.name)) }

// ── ACTIVATION (abilities.executeObitoUltimate — meter already spent) ──
export function activateObitoJuubi(caster, opponent) {
  if (!caster) return false
  preload()
  cine.active = true; cine.frame = 0; cine.caster = caster; cine.opponent = opponent || null
  cine.damageDealt = false
  const ccx = (caster.x || 0) + (caster.w || 0) / 2
  const ocx = opponent ? (opponent.x || 0) + (opponent.w || 0) / 2 : ccx + 1
  cine.enemySide = ocx >= ccx ? 1 : -1
  cine.faceLeft  = cine.enemySide < 0
  cine._cam = null; cine.savedMaxStep = null
  return true
}

export function isObitoJuubiCinematicActive() { return cine.active }
export function getObitoJuubiCinematicStatus() {
  // casterHidden = the real frozen Obito is suppressed (_kuramaHide) so it never double-renders next to
  // the giant beast (the "second body" duplicate-render bug this project is prone to).
  return { active: cine.active, frame: cine.frame, phase: getObitoJuubiPhase(), struck: !!cine.damageDealt,
           chargeStart: T_RISE_END, impactFrame: T_IMPACT, casterHidden: !!cine.caster?._kuramaHide }
}
export function getObitoJuubiPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_ACT_END)    return "activate"
  if (f < T_WIDEN_END)  return "widen"
  if (f < T_RISE_END)   return "rise"
  if (f < T_CHARGE_END) return "charge"
  if (f < T_FIRE_END)   return "fire"
  return "settle"
}

// ── UPDATE (per frame while active; game.js freezes combat around this) ──
export function updateObitoJuubi(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0 && cam) {
    cine._cam = cam
    cine.savedMaxStep = cam.maxZoomStep
    cam.maxZoomStep = 0.06
    snd?.play?.(SFX.DOMAIN_ACTIVATE)      // summoning boom (shared SFX — no character-voice asset)
  }
  // HIDE the real caster for the whole cinematic (the module draws the summon + beast; the frozen body
  // must NOT also render — the shared "second body" guard, reused from the Kurama cinematics).
  if (cine.caster) cine.caster._kuramaHide = true
  if (f === T_WIDEN_END) snd?.play?.(SFX.DOMAIN_ACTIVATE)   // beast roar leads the rise→charge buildup

  // Camera: hold on the caster during ACTIVATE, WIDEN to frame both through the rise/charge/blast, ease back on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_ACT_END) {
      if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 0.9)
    } else if (f < T_FIRE_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, WIDE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, WIDE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 0.8)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 0.85)
    }
  }

  if (cam && cam.shake) {
    if (f >= T_RISE_END && f < T_CHARGE_END && f % 8 === 0) {
      const ramp = (f - T_RISE_END) / TL.CHARGE
      cam.shake(5 + ramp * 6, 8)
    } else if (f === T_IMPACT) {
      cam.shake(28, 30)
    } else if (f > T_IMPACT && f < T_FIRE_END && f % 6 === 0) {
      cam.shake(12, 10)
    }
  }

  if (f === T_IMPACT && !cine.damageDealt) { cine.damageDealt = true; applyDamage(ctx, snd) }

  cine.frame++
  if (cine.frame >= T_TOTAL) endCine()
  return getObitoJuubiPhase()
}

function applyDamage(ctx, snd) {
  const opp = cine.opponent
  if (!opp) return
  const blocked = !!opp.isBlocking
  const damage  = blocked ? Math.round(JUUBI_DAMAGE * BLOCKED_RATIO) : JUUBI_DAMAGE
  const dealt = applyScaledDamage(opp, damage, { source: "obito-juubi" })
  opp.vx = 0
  if (blocked) {
    opp.blockstun = Math.max(opp.blockstun || 0, 14)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 32)
    opp.colorFlash = 10
    opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
  }
  const ocx = (opp.x || 0) + (opp.w || 0) / 2, ocy = (opp.y || 0) + (opp.h || 0) / 2
  if (Array.isArray(ctx.hitEffects)) {
    ctx.hitEffects.push({
      x: ocx, y: ocy, timer: 18, maxTimer: 18,
      category: blocked ? "light" : "ultimate", color: blocked ? null : VIOLET,
      damage: dealt, lines: blocked ? 6 : 12, radius: blocked ? 14 : 42,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
  snd?.play?.(blocked ? SFX.BLOCK : SFX.HIT_HEAVY)
  if (opp.health <= 0) snd?.play?.(SFX.KO)
}

function endCine() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (cine.caster) cine.caster._kuramaHide = false   // un-hide the real Obito as combat resumes
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.damageDealt = false; cine._cam = null; cine.savedMaxStep = null
}
export function clearObitoJuubi() { if (cine.active || cine._cam) endCine() }

// ── DRAW (fullscreen, screen space, on top of the world; guarded so it never blanks) ──
function _ready(i) { return !!(i && i.complete && i.naturalWidth > 0) }
function _ease(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3) }

// Draw ONE frame of a multi-frame Obito sheet, scaled to display height `h`, centered at (cx,cy).
function drawFrame(ctx, a, frameIdx, cx, cy, h, { alpha = 1, flipX = false } = {}) {
  if (alpha <= 0 || h <= 0) return
  const im = img(a.name)
  if (!_ready(im)) return
  const fi = Math.max(0, Math.min(a.frames - 1, frameIdx | 0))
  const sx = fi * a.fw
  const w = h * (a.fw / a.fh)
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
  ctx.translate(cx, cy)
  if (flipX) ctx.scale(-1, 1)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(im, sx, 0, a.fw, a.fh, -w / 2, -h / 2, w, h)
  ctx.restore()
}

function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, cw, ch); ctx.restore()
}
function _groundGlow(ctx, cx, gy, spread, strength) {
  if (strength <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(0.55, strength * 0.55)
  const g = ctx.createRadialGradient(cx, gy, 4, cx, gy, spread)
  g.addColorStop(0, "rgba(154,107,255,0.9)"); g.addColorStop(1, "rgba(42,15,74,0)")
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, gy, spread, spread * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
// Procedural Bijūdama (Tailed Beast Bomb) — no dedicated art. Dark core + violet glow + rotating ring.
function _bijuudama(ctx, cx, cy, r, alpha, t) {
  if (alpha <= 0 || r <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r)
  g.addColorStop(0, DARKCORE); g.addColorStop(0.55, DEEP); g.addColorStop(1, "rgba(154,107,255,0)")
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = alpha * 0.85; ctx.strokeStyle = VIOLET; ctx.lineWidth = Math.max(2, r * 0.06)
  ctx.shadowColor = VIOLET; ctx.shadowBlur = 14
  ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.92, r * 0.4, t * 0.12, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.4, r * 0.92, -t * 0.1, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}

function fighterScreenPos(fighter, cw, ch, fallbackFrac) {
  const cam = cine._cam
  const fx = cw * fallbackFrac, fy = ch * 0.60
  if (!fighter || !cam) return { x: fx, y: fy }
  const fcx = (fighter.x || 0) + (fighter.w || 0) / 2
  const fcy = (fighter.y || 0) + (fighter.h || 0) / 2
  const z = cam.zoom || 1
  let sx = cw / 2 + z * (fcx - (cam.x || 0) + (cam.shakeX || 0))
  let sy = ch / 2 + z * (fcy - (cam.y || 0) + (cam.shakeY || 0))
  sx = Math.max(cw * 0.14, Math.min(cw * 0.86, sx))
  sy = Math.max(ch * 0.30, Math.min(ch * 0.80, sy))
  return { x: sx, y: sy }
}

export function drawObitoJuubi(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || 1280, ch = canvas?.height || 720
  const f = cine.frame
  const flip = cine.faceLeft

  // FARTHEST-SIDE RULE: the beast erupts on the arena edge FARTHEST from the opponent, so it looms behind
  // Obito and reaches ACROSS toward the foe (never overlapping them).
  const beastCX = cine.enemySide > 0 ? cw * 0.28 : cw * 0.72
  const groundY = ch * 0.94
  const bodyH = ch * 0.95                                     // towering Juubi
  const bodyRestCY = groundY - bodyH * 0.46
  const dirX = flip ? -1 : 1
  const mouthOffX = 0.30 * (bodyH * (A.juubi.fw / A.juubi.fh)) * dirX
  const mouthOffY = -0.10 * bodyH

  if (f < T_ACT_END) {
    // ACTIVATE — summoning burst + Mokuton erupts from the ground at the eruption point.
    const p = f / T_ACT_END
    _flash(ctx, cw, ch, VIOLET, (p < 0.5 ? p : (1 - p)) * 0.45)
    _groundGlow(ctx, beastCX, groundY, cw * (0.10 + p * 0.16), p)
    // Mokuton wood columns erupting (jitter frame)
    const mokH = ch * (0.20 + p * 0.30)
    drawFrame(ctx, A.moku, f % 8 < 4 ? 0 : 1, beastCX, groundY - mokH * 0.5, mokH, { alpha: 0.9, flipX: flip })
    // summoning glyph pulsing above
    const sumH = ch * 0.20
    drawFrame(ctx, A.summon, f % 6 < 3 ? 0 : 1, beastCX, groundY - mokH - sumH * 0.4, sumH, { alpha: 0.35 + p * 0.5 })

  } else if (f < T_WIDEN_END) {
    // WIDEN — arena pulls out; violet ground glow where the beast will erupt.
    const p = (f - T_ACT_END) / TL.WIDEN
    _flash(ctx, cw, ch, "#ffffff", (1 - p) * 0.35)
    _groundGlow(ctx, beastCX, groundY, cw * 0.26, 0.5 + p * 0.5)

  } else if (f < T_RISE_END) {
    // RISE — the Ten-Tails erupts (silhouette → reveal), sliding up into view.
    const p = (f - T_WIDEN_END) / TL.RISE
    _flash(ctx, cw, ch, DEEP, 0.24 * (1 - p))
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, groundY); ctx.clip()
    const startCY = groundY + bodyH * 0.5
    const cy = startCY + (bodyRestCY - startCY) * _ease(p)
    drawFrame(ctx, A.juubi, 0, beastCX, cy, bodyH, { alpha: 0.9 + p * 0.1, flipX: flip })
    ctx.restore()
    _groundGlow(ctx, beastCX, groundY, cw * 0.28 * (1 - p * 0.4), 1 - p)

  } else if (f < T_CHARGE_END) {
    // CHARGE — the Juubi rears & roars (jaw works); the Bijūdama condenses at its maw.
    const p = (f - T_RISE_END) / TL.CHARGE
    _flash(ctx, cw, ch, "#0d0616", 0.26)
    const roarFrame = (f % 12 < 6) ? 1 : 2   // jaw-open ↔ howl
    drawFrame(ctx, A.juubi, roarFrame, beastCX, bodyRestCY, bodyH, { alpha: 1, flipX: flip })
    const mx = beastCX + mouthOffX, my = bodyRestCY + mouthOffY
    _bijuudama(ctx, mx, my, (0.02 + _ease(p) * 0.10) * ch, Math.min(1, 0.3 + p * 3), f)

  } else if (f < T_FIRE_END) {
    // FIRE — the Bijūdama streaks maw→opponent, then detonates.
    const lf = f - T_CHARGE_END
    _flash(ctx, cw, ch, "#0d0616", 0.16)
    drawFrame(ctx, A.juubi, 2, beastCX, bodyRestCY, bodyH, { alpha: 1, flipX: flip })
    const mx = beastCX + mouthOffX, my = bodyRestCY + mouthOffY
    const tgt = fighterScreenPos(cine.opponent, cw, ch, cine.enemySide > 0 ? 0.74 : 0.26)
    if (lf < IMPACT_OFFSET) {
      const t = _ease(lf / IMPACT_OFFSET)
      const bx = mx + (tgt.x - mx) * t, by = my + (tgt.y - my) * t
      _bijuudama(ctx, bx, by, (0.09 + t * 0.05) * ch, 1, f)
    } else {
      const bf = lf - IMPACT_OFFSET
      const span = TL.FIRE - IMPACT_OFFSET
      _flash(ctx, cw, ch, "#ffffff", bf < 6 ? (1 - bf / 6) : 0)
      _flash(ctx, cw, ch, VIOLET, Math.max(0, 0.28 - bf / 110))
      const grow = 1 + (bf / span) * 3.0
      const fade = Math.max(0, 1 - (bf / span))
      _bijuudama(ctx, tgt.x, tgt.y, (ch * 0.16) * grow, fade, f)
      ctx.save(); ctx.globalAlpha = fade * 0.6; ctx.strokeStyle = VIOLET; ctx.lineWidth = 6
      ctx.beginPath(); ctx.arc(tgt.x, tgt.y, (ch * 0.12) * grow, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    }

  } else {
    // SETTLE — blast fades, beast sinks.
    const p = (f - T_FIRE_END) / TL.SETTLE
    const tgt = fighterScreenPos(cine.opponent, cw, ch, cine.enemySide > 0 ? 0.74 : 0.26)
    ctx.save(); ctx.globalAlpha = (1 - p) * 0.4; ctx.strokeStyle = VIOLET; ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, ch * 0.34 * (1 + p), 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, groundY); ctx.clip()
    const cy = bodyRestCY + (groundY + bodyH * 0.5 - bodyRestCY) * _ease(p)
    drawFrame(ctx, A.juubi, 2, beastCX, cy, bodyH, { alpha: (1 - p) * 0.9, flipX: flip })
    ctx.restore()
  }
}
