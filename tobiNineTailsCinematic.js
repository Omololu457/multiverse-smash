// tobiNineTailsCinematic.js
// TOBI ULTIMATE — "Nine-Tails (Kurama) / Tailed Beast Bomb" CINEMATIC.
// A dedicated module that REUSES the proven kurama.js / minatoKurama.js / obitoJuubiCinematic.js
// freeze-cinematic giant-avatar architecture (combat-frozen, camera-driven, fullscreen scripted
// sequence with a GUARANTEED effect), but draws TOBI'S OWN dedicated Nine-Tails art THROUGHOUT.
// This is explicitly a DIFFERENT beast from Obito's Ten-Tails — the NINE-Tails fox + Tailed Beast Bomb.
//
// FULLY INDEPENDENT of Obito: its own module-scope `cine` singleton (so an Obito Juubi and a Tobi
// Nine-Tails can never share cinematic state) and its own `_tobiKuramaHide` caster-hide flag (NOT the
// shared `_kuramaHide`), so both can be loaded/played simultaneously with zero coupling.
//
// SEQUENCE (camera push-in → giant fox → Tailed Beast Bomb → pull back):
//   ACTIVATE — a summoning burst + ground eruption where the beast rises.
//   WIDEN    — the arena pulls OUT; an orange chakra ground glow marks the eruption point.
//   RISE     — the Nine-Tails fox erupts on the edge OPPOSITE the opponent, sliding up, facing them.
//   CHARGE   — the fox rears & roars (jaw works); a Bijūdama (Tailed Beast Bomb) condenses at its maw.
//   FIRE     — the Bijūdama streaks maw→opponent and detonates; GUARANTEED damage (survivable from full).
//   SETTLE   — the blast fades, the fox sinks, the camera restores.
//
// Contract with game.js (mirrors obitoJuubiCinematic.js exactly):
//   • abilities.executeTobiUltimate() spends the meter then calls activateTobiNineTails(caster, opponent).
//   • updateBattle() freezes combat while isTobiNineTailsCinematicActive().
//   • drawBattle() calls drawTobiNineTails(ctx, canvas) as a fullscreen screen-space overlay.
//   • every reset path calls clearTobiNineTails().
// Self-contained: imports only sound.js (no cycle).

import { sound as globalSound, SFX } from "./sound.js"
import { applyScaledDamage } from "./combat.js"   // Stage 1a: the one scaled-damage choke-point

// ── TIMELINE (frames @60fps) — same beat structure as the Kurama/Juubi cinematics ──
const TL = { ACTIVATE: 42, WIDEN: 20, RISE: 42, CHARGE: 52, FIRE: 46, SETTLE: 26 }
const T_ACT_END    = TL.ACTIVATE
const T_WIDEN_END  = T_ACT_END   + TL.WIDEN
const T_RISE_END   = T_WIDEN_END + TL.RISE
const T_CHARGE_END = T_RISE_END  + TL.CHARGE
const T_FIRE_END   = T_CHARGE_END + TL.FIRE
const T_TOTAL      = T_FIRE_END  + TL.SETTLE            // 228
const IMPACT_OFFSET = 14
const T_IMPACT = T_CHARGE_END + IMPACT_OFFSET           // 170

const WIDE_ZOOM = 0.52
const NINE_TAILS_DAMAGE = 360                           // cinematic band (survivable from full; ≈ Obito Juubi 360)
const BLOCKED_RATIO = 0.20

// Nine-Tails chakra palette (orange); the Bijūdama itself is dark-blue art.
const ORANGE = "#F0851E", DEEP = "#7A3A08", BOMBGLOW = "#2E6BFF", WHITEHOT = "#ffffff"

const cine = {
  active: false, frame: 0, caster: null, opponent: null, damageDealt: false,
  enemySide: 1, faceLeft: false, _cam: null, savedMaxStep: null
}

// ── art registry (lazy image cache; frame metadata for the resliced uniform sheets) ──
const ART = {}
function img(name) { let i = ART[name]; if (!i) { i = new Image(); i.src = `./${name}.png`; ART[name] = i } return i }
const A = {
  foxRise: { name: "masked_man_fox_rise_uniform",      frames: 2, fw: 547, fh: 433 },  // fox on all fours (RISE)
  foxRoar: { name: "masked_man_fox_roar_uniform",      frames: 2, fw: 561, fh: 441 },  // fox rearing / roaring (CHARGE/FIRE)
  bijuu:   { name: "masked_man_bijuu_uniform",         frames: 9, fw: 96,  fh: 142 },  // Tailed Beast Bomb (frame 4 = big sphere)
  ground:  { name: "masked_man_summon_ground_uniform", frames: 2, fw: 85,  fh: 36  }   // ground eruption FX
}
function preload() { Object.values(A).forEach(a => img(a.name)) }

// ── ACTIVATION (abilities.executeTobiUltimate — meter already spent) ──
export function activateTobiNineTails(caster, opponent) {
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

export function isTobiNineTailsCinematicActive() { return cine.active }
export function getTobiNineTailsCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getTobiNineTailsPhase(), struck: !!cine.damageDealt,
           chargeStart: T_RISE_END, impactFrame: T_IMPACT, casterHidden: !!cine.caster?._tobiKuramaHide }
}
export function getTobiNineTailsPhase() {
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
export function updateTobiNineTails(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0 && cam) {
    cine._cam = cam
    cine.savedMaxStep = cam.maxZoomStep
    cam.maxZoomStep = 0.06
    snd?.play?.(SFX.DOMAIN_ACTIVATE)
  }
  // HIDE the real caster for the whole cinematic — its OWN flag (`_tobiKuramaHide`), never Obito's.
  if (cine.caster) cine.caster._tobiKuramaHide = true
  if (f === T_WIDEN_END) snd?.play?.(SFX.DOMAIN_ACTIVATE)

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
  return getTobiNineTailsPhase()
}

function applyDamage(ctx, snd) {
  const opp = cine.opponent
  if (!opp) return
  const blocked = !!opp.isBlocking
  const damage  = blocked ? Math.round(NINE_TAILS_DAMAGE * BLOCKED_RATIO) : NINE_TAILS_DAMAGE
  const dealt = applyScaledDamage(opp, damage, { source: "tobi-ninetails" })
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
      category: blocked ? "light" : "ultimate", color: blocked ? null : BOMBGLOW,
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
  if (cine.caster) cine.caster._tobiKuramaHide = false
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.damageDealt = false; cine._cam = null; cine.savedMaxStep = null
}
export function clearTobiNineTails() { if (cine.active || cine._cam) endCine() }

// ── DRAW (fullscreen, screen space; guarded so it never blanks) ──
function _ready(i) { return !!(i && i.complete && i.naturalWidth > 0) }
function _ease(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3) }

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
  g.addColorStop(0, "rgba(240,133,30,0.9)"); g.addColorStop(1, "rgba(122,58,8,0)")
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, gy, spread, spread * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
// Bijūdama drawn from Tobi's real dark-blue bomb art (frame 4 = big sphere), + a blue glow.
function _bijuudama(ctx, cx, cy, r, alpha, flip) {
  if (alpha <= 0 || r <= 0) return
  ctx.save()
  ctx.globalAlpha = alpha * 0.5
  const g = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r * 1.4)
  g.addColorStop(0, "rgba(120,180,255,0.9)"); g.addColorStop(1, "rgba(46,107,255,0)")
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.4, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
  drawFrame(ctx, A.bijuu, 4, cx, cy, r * 2.2, { alpha, flipX: flip })   // real Tailed Beast Bomb sphere
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

export function drawTobiNineTails(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || 1280, ch = canvas?.height || 720
  const f = cine.frame
  const flip = cine.faceLeft

  // FARTHEST-SIDE RULE: the fox erupts on the arena edge FARTHEST from the opponent, so it looms behind
  // Tobi and reaches ACROSS toward the foe.
  const beastCX = cine.enemySide > 0 ? cw * 0.30 : cw * 0.70
  const groundY = ch * 0.94
  const bodyH = ch * 0.86                                     // towering Nine-Tails
  const bodyRestCY = groundY - bodyH * 0.48
  const dirX = flip ? -1 : 1
  // fox head/maw is at the FRONT of the sprite (toward the opponent)
  const mouthOffX = 0.30 * (bodyH * (A.foxRoar.fw / A.foxRoar.fh)) * dirX
  const mouthOffY = -0.18 * bodyH

  if (f < T_ACT_END) {
    // ACTIVATE — summoning burst + ground eruption.
    const p = f / T_ACT_END
    _flash(ctx, cw, ch, ORANGE, (p < 0.5 ? p : (1 - p)) * 0.40)
    _groundGlow(ctx, beastCX, groundY, cw * (0.10 + p * 0.16), p)
    const gH = ch * (0.10 + p * 0.16)
    drawFrame(ctx, A.ground, f % 8 < 4 ? 0 : 1, beastCX, groundY - gH * 0.4, gH, { alpha: 0.85, flipX: flip })

  } else if (f < T_WIDEN_END) {
    // WIDEN — arena pulls out; orange ground glow where the fox erupts.
    const p = (f - T_ACT_END) / TL.WIDEN
    _flash(ctx, cw, ch, WHITEHOT, (1 - p) * 0.30)
    _groundGlow(ctx, beastCX, groundY, cw * 0.26, 0.5 + p * 0.5)

  } else if (f < T_RISE_END) {
    // RISE — the Nine-Tails erupts, sliding up into view.
    const p = (f - T_WIDEN_END) / TL.RISE
    _flash(ctx, cw, ch, DEEP, 0.22 * (1 - p))
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, groundY); ctx.clip()
    const startCY = groundY + bodyH * 0.5
    const cy = startCY + (bodyRestCY - startCY) * _ease(p)
    drawFrame(ctx, A.foxRise, f % 10 < 5 ? 0 : 1, beastCX, cy, bodyH, { alpha: 0.9 + p * 0.1, flipX: flip })
    ctx.restore()
    _groundGlow(ctx, beastCX, groundY, cw * 0.28 * (1 - p * 0.4), 1 - p)

  } else if (f < T_CHARGE_END) {
    // CHARGE — the fox rears & roars (jaw works); the Bijūdama condenses at its maw.
    const p = (f - T_RISE_END) / TL.CHARGE
    _flash(ctx, cw, ch, "#160a02", 0.22)
    drawFrame(ctx, A.foxRoar, (f % 12 < 6) ? 0 : 1, beastCX, bodyRestCY, bodyH, { alpha: 1, flipX: flip })
    const mx = beastCX + mouthOffX, my = bodyRestCY + mouthOffY
    _bijuudama(ctx, mx, my, (0.02 + _ease(p) * 0.09) * ch, Math.min(1, 0.3 + p * 3), flip)

  } else if (f < T_FIRE_END) {
    // FIRE — the Bijūdama streaks maw→opponent, then detonates.
    const lf = f - T_CHARGE_END
    _flash(ctx, cw, ch, "#160a02", 0.14)
    drawFrame(ctx, A.foxRoar, 1, beastCX, bodyRestCY, bodyH, { alpha: 1, flipX: flip })
    const mx = beastCX + mouthOffX, my = bodyRestCY + mouthOffY
    const tgt = fighterScreenPos(cine.opponent, cw, ch, cine.enemySide > 0 ? 0.74 : 0.26)
    if (lf < IMPACT_OFFSET) {
      const t = _ease(lf / IMPACT_OFFSET)
      const bx = mx + (tgt.x - mx) * t, by = my + (tgt.y - my) * t
      _bijuudama(ctx, bx, by, (0.085 + t * 0.05) * ch, 1, flip)
    } else {
      const bf = lf - IMPACT_OFFSET
      const span = TL.FIRE - IMPACT_OFFSET
      _flash(ctx, cw, ch, WHITEHOT, bf < 6 ? (1 - bf / 6) : 0)
      _flash(ctx, cw, ch, BOMBGLOW, Math.max(0, 0.26 - bf / 110))
      const grow = 1 + (bf / span) * 3.0
      const fade = Math.max(0, 1 - (bf / span))
      _bijuudama(ctx, tgt.x, tgt.y, (ch * 0.15) * grow, fade, flip)
      ctx.save(); ctx.globalAlpha = fade * 0.6; ctx.strokeStyle = BOMBGLOW; ctx.lineWidth = 6
      ctx.beginPath(); ctx.arc(tgt.x, tgt.y, (ch * 0.12) * grow, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    }

  } else {
    // SETTLE — blast fades, fox sinks.
    const p = (f - T_FIRE_END) / TL.SETTLE
    const tgt = fighterScreenPos(cine.opponent, cw, ch, cine.enemySide > 0 ? 0.74 : 0.26)
    ctx.save(); ctx.globalAlpha = (1 - p) * 0.4; ctx.strokeStyle = BOMBGLOW; ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, ch * 0.34 * (1 + p), 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, groundY); ctx.clip()
    const cy = bodyRestCY + (groundY + bodyH * 0.5 - bodyRestCY) * _ease(p)
    drawFrame(ctx, A.foxRoar, 1, beastCX, cy, bodyH, { alpha: (1 - p) * 0.9, flipX: flip })
    ctx.restore()
  }
}
