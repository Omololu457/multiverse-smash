// minatoKurama.js
// MINATO ULTIMATE — "Nine-Tails Chakra Mode / Tailed Beast Bomb" CINEMATIC.
// A dedicated module that REUSES the proven kurama.js freeze-cinematic / giant-avatar
// architecture (combat-frozen, camera-driven, fullscreen scripted sequence with a
// GUARANTEED effect) but draws MINATO's OWN dedicated art THROUGHOUT — NO Naruto Kurama
// sprites are referenced here. It also adds a distinct opening beat Naruto's lacks: a
// CHAKRA-MODE ACTIVATION (Minato cloaks in Kurama's chakra, his own intro strip) BEFORE
// the half-tailed-fox avatar emerges.
//
// SEQUENCE:
//   ACTIVATE — Minato transforms into his chakra cloak (minato_kurama_ultimate_intro).
//   WIDEN    — the arena pulls OUT; a ground glow marks where the fox will erupt.
//   RISE     — the half-Kurama fox avatar erupts on the edge OPPOSITE the opponent,
//              silhouette→reveal (minato_kurama_ultimate_effect_part_1), facing them.
//   CHARGE   — the fox rears/howls (part_2) and a Tailed Beast Bomb forms at its mouth
//              (part_1_projectile forming orbs → part_2_projectile orb).
//   FIRE     — the TBB streaks mouth→opponent (part_2_projectile) and detonates; GUARANTEED
//              damage at impact (survivable from full, like Naruto's — not a pure round-ender).
//   SETTLE   — the blast fades, the fox sinks, the camera restores.
//
// Contract with game.js (mirrors kurama.js exactly):
//   • abilities.executeMinatoUltimate() spends the meter then calls activateMinatoKurama(caster, opponent).
//   • updateBattle() freezes combat while isMinatoKuramaActive(): calls updateMinatoKurama({camera,
//     hitEffects, damageNumbers, sound}) + camera.advance() and returns early.
//   • drawBattle() calls drawMinatoKurama(ctx, canvas) as a fullscreen screen-space overlay.
//   • every reset path calls clearMinatoKurama().
// Self-contained: imports only sound.js (no cycle).

import { sound as globalSound, SFX } from "./sound.js"
import { applyScaledDamage } from "./combat.js"   // Stage 1a: the one scaled-damage choke-point

// ── TIMELINE (frames @60fps) ──
const TL = { ACTIVATE: 42, WIDEN: 20, RISE: 40, CHARGE: 50, FIRE: 45, SETTLE: 25 }
const T_ACT_END    = TL.ACTIVATE                       // 42
const T_WIDEN_END  = T_ACT_END   + TL.WIDEN            // 62
const T_RISE_END   = T_WIDEN_END + TL.RISE             // 102
const T_CHARGE_END = T_RISE_END  + TL.CHARGE           // 152
const T_FIRE_END   = T_CHARGE_END + TL.FIRE            // 197
const T_TOTAL      = T_FIRE_END  + TL.SETTLE           // 222
const IMPACT_OFFSET = 14
const T_IMPACT = T_CHARGE_END + IMPACT_OFFSET          // 166

const WIDE_ZOOM = 0.55
const MINATO_TBB_DAMAGE = 600                          // ~half a bar; survivable from full (not a round-ender)
const BLOCKED_RATIO = 0.20                             // held block → chipped TBB

const cine = {
  active: false, frame: 0, caster: null, opponent: null, damageDealt: false,
  enemySide: 1, faceLeft: false, _cam: null, savedMaxStep: null
}

// ── art registry (lazy image cache; frame metadata for the multi-frame Minato sheets) ──
const ART = {}
function img(name) { let i = ART[name]; if (!i) { i = new Image(); i.src = `./${name}.png`; ART[name] = i } return i }
const A = {
  intro:    { name: "minato_kurama_ultimate_intro_uniform",             frames: 6, fw: 57,  fh: 63  },  // chakra-mode transform (Minato)
  foxRise:  { name: "minato_kurama_ultimate_effect_part_1_uniform",     frames: 2, fw: 502, fh: 418 },  // 0 = silhouette, 1 = golden reveal
  foxHowl:  { name: "minato_kurama_ultimate_effect_part_2_uniform",     frames: 2, fw: 401, fh: 418 },  // rearing / howling
  foxLunge: { name: "minato_kurama_ultimate_effect_part_3_uniform",     frames: 2, fw: 500, fh: 417 },  // lunge on the blast
  tbbForm:  { name: "minato_kurama_ultimate_effect_part_1_projectile_uniform", frames: 6, fw: 48,  fh: 46 },  // TBB condensing
  tbbOrb:   { name: "minato_kurama_ultimate_effect_part_2_projectile_uniform", frames: 3, fw: 364, fh: 179 }  // TBB orb streaking
}
function preload() { Object.values(A).forEach(a => img(a.name)) }

// ── ACTIVATION (abilities.executeMinatoUltimate — meter already spent) ──
export function activateMinatoKurama(caster, opponent) {
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

export function isMinatoKuramaActive() { return cine.active }
export function getMinatoKuramaStatus() {
  return { active: cine.active, frame: cine.frame, phase: getMinatoKuramaPhase(), struck: !!cine.damageDealt, chargeStart: T_RISE_END, impactFrame: T_IMPACT }
}
export function getMinatoKuramaPhase() {
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
export function updateMinatoKurama(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0 && cam) {
    cine._cam = cam
    cine.savedMaxStep = cam.maxZoomStep
    cam.maxZoomStep = 0.06
    snd?.play?.(SFX.DOMAIN_ACTIVATE)      // activation boom (shared SFX — no character-voice asset)
  }
  // HIDE the real caster for the whole cinematic — minatoKurama draws the transforming Minato (intro)
  // + the fox itself, so the real frozen body must NOT also render (that was the "second Minato" bug).
  if (cine.caster) cine.caster._kuramaHide = true
  // Fox roar leads the rise→charge buildup.
  if (f === T_WIDEN_END) snd?.play?.(SFX.DOMAIN_ACTIVATE)

  // SHARED KURAMA ULT VOICE — "Kurama! Haa! Tailed Beast Bomb!" (naruto_kurama_ultimate.mp3).
  // Minato sealed HALF of Kurama; Naruto holds the other half, so the SAME entity/line fits both
  // ultimates. This is a direct cross-character REUSE of Naruto's existing asset (no re-cut) — it
  // fires here at the bomb-forming CHARGE beat (f === T_RISE_END), the exact analog of Naruto's
  // kurama.js f === T_FULL_END trigger. It plays ALONGSIDE Minato's own dedicated cast line (that
  // one fires ~1.7s earlier at activation in abilities.executeMinatoUltimate), never replacing it:
  // the cast line is owner-tagged (Minato) and long finished by now, while this cinematic-update cue
  // is owner-null (single-voice-channel exempt), so the two never cut each other. Fresh Audio per
  // call → independent of Naruto's own playback (only one ult cinematic runs at a time anyway).
  if (f === T_RISE_END) snd?.playSfxFile?.("naruto_kurama_ultimate.mp3", null)

  // Camera: hold on the caster during ACTIVATE (framing his transform), then WIDEN to frame both
  // through the fox rise/charge/blast, easing back on SETTLE.
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
      cam.shake(26, 30)
    } else if (f > T_IMPACT && f < T_FIRE_END && f % 6 === 0) {
      cam.shake(12, 10)
    }
  }

  if (f === T_IMPACT && !cine.damageDealt) { cine.damageDealt = true; applyDamage(ctx, snd) }

  cine.frame++
  if (cine.frame >= T_TOTAL) endCine()
  return getMinatoKuramaPhase()
}

function applyDamage(ctx, snd) {
  const opp = cine.opponent
  if (!opp) return
  const blocked = !!opp.isBlocking
  const damage  = blocked ? Math.round(MINATO_TBB_DAMAGE * BLOCKED_RATIO) : MINATO_TBB_DAMAGE
  const dealt = applyScaledDamage(opp, damage, { source: "minato-tbb" })
  opp.vx = 0
  if (blocked) {
    opp.blockstun = Math.max(opp.blockstun || 0, 14)
  } else {
    opp.hitstun = Math.max(opp.hitstun || 0, 30)
    opp.colorFlash = 10
    opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)
  }
  const ocx = (opp.x || 0) + (opp.w || 0) / 2, ocy = (opp.y || 0) + (opp.h || 0) / 2
  if (Array.isArray(ctx.hitEffects)) {
    ctx.hitEffects.push({
      x: ocx, y: ocy, timer: 18, maxTimer: 18,
      category: blocked ? "light" : "ultimate", color: blocked ? null : "#ffb028",
      damage: dealt, lines: blocked ? 6 : 12, radius: blocked ? 14 : 40,
      ...(blocked ? { isBlocking: true } : {})
    })
  }
  snd?.play?.(blocked ? SFX.BLOCK : SFX.HIT_HEAVY)
  if (opp.health <= 0) snd?.play?.(SFX.KO)
}

function endCine() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (cine.caster) cine.caster._kuramaHide = false   // un-hide the real Minato as combat resumes
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.damageDealt = false; cine._cam = null; cine.savedMaxStep = null
}
export function clearMinatoKurama() { if (cine.active || cine._cam) endCine() }

// ── DRAW (fullscreen, screen space, on top of the world; guarded so it never blanks) ──
function _ready(i) { return !!(i && i.complete && i.naturalWidth > 0) }
function _ease(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3) }

// Draw ONE frame of a multi-frame Minato sheet, scaled to display height `h`, centered at (cx,cy).
function drawFrame(ctx, a, frameIdx, cx, cy, h, { alpha = 1, flipX = false, rot = 0 } = {}) {
  if (alpha <= 0 || h <= 0) return
  const im = img(a.name)
  if (!_ready(im)) return
  const fi = Math.max(0, Math.min(a.frames - 1, frameIdx | 0))
  const sx = fi * a.fw
  const w = h * (a.fw / a.fh)
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
  ctx.translate(cx, cy)
  if (rot) ctx.rotate(rot)
  if (flipX) ctx.scale(-1, 1)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(im, sx, 0, a.fw, a.fh, -w / 2, -h / 2, w, h)
  ctx.restore()
}

function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, cw, ch); ctx.restore()
}
function _groundDust(ctx, cx, gy, spread, strength) {
  if (strength <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(0.5, strength * 0.5)
  const g = ctx.createRadialGradient(cx, gy, 4, cx, gy, spread)
  g.addColorStop(0, "rgba(255,180,60,0.9)"); g.addColorStop(1, "rgba(255,120,0,0)")
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, gy, spread, spread * 0.4, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}

// screen position of a fighter (camera-aware; clamped on-screen), for the caster transform + impact.
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

export function drawMinatoKurama(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || 1280, ch = canvas?.height || 720
  const f = cine.frame
  const flip = cine.faceLeft

  // FARTHEST-SIDE RULE: the transform + fox erupt on the arena edge FARTHEST from the opponent, so the
  // giant avatar looms behind Minato and reaches ACROSS toward the foe (never overlapping them).
  const foxCX = cine.enemySide > 0 ? cw * 0.26 : cw * 0.74
  const groundY = ch * 0.92
  const bodyH = ch * 0.92                                    // BIGGER half-Kurama avatar (was 0.78)
  const bodyRestCY = groundY - bodyH * 0.46
  const dirX = flip ? -1 : 1
  const mouthOffX = 0.36 * (bodyH * (A.foxHowl.fw / A.foxHowl.fh)) * dirX
  const mouthOffY = -0.16 * bodyH

  if (f < T_ACT_END) {
    // ACTIVATE — Minato cloaks in Kurama's chakra (his own intro strip). Drawn on the FARTHEST side
    // (where the fox will erupt), NOT at his live position — and the real body is hidden (_kuramaHide),
    // so there is exactly ONE Minato transforming, not two.
    const p = f / T_ACT_END
    _flash(ctx, cw, ch, "#ffb028", (p < 0.5 ? p : (1 - p)) * 0.5)
    const introH = ch * 0.52
    const ix = foxCX, iy = groundY - introH * 0.5
    const fi = Math.min(A.intro.frames - 1, Math.floor(p * A.intro.frames))
    // rising golden aura
    ctx.save(); ctx.globalAlpha = 0.35 + p * 0.4
    const g = ctx.createRadialGradient(ix, iy, 6, ix, iy, introH * 0.9)
    g.addColorStop(0, "rgba(255,200,70,0.9)"); g.addColorStop(1, "rgba(255,140,0,0)")
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ix, iy, introH * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    drawFrame(ctx, A.intro, fi, ix, iy, introH, { alpha: 1, flipX: cine.enemySide < 0 })

  } else if (f < T_WIDEN_END) {
    // WIDEN — arena pulls out; ground glow where the fox will erupt.
    const p = (f - T_ACT_END) / TL.WIDEN
    _flash(ctx, cw, ch, "#ffffff", (1 - p) * 0.4)
    ctx.save(); ctx.globalAlpha = p * 0.55
    const g = ctx.createRadialGradient(foxCX, groundY, 4, foxCX, groundY, cw * 0.24)
    g.addColorStop(0, "#ffc24a"); g.addColorStop(1, "rgba(255,120,0,0)")
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(foxCX, groundY, cw * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.restore()

  } else if (f < T_RISE_END) {
    // RISE — the half-Kurama fox erupts (silhouette → golden reveal), sliding up into view.
    const p = (f - T_WIDEN_END) / TL.RISE
    _flash(ctx, cw, ch, "#2a1500", 0.24 * (1 - p))
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, groundY); ctx.clip()
    const startCY = groundY + bodyH * 0.5
    const cy = startCY + (bodyRestCY - startCY) * _ease(p)
    const frameIdx = p < 0.55 ? 0 : 1   // silhouette → reveal
    drawFrame(ctx, A.foxRise, frameIdx, foxCX, cy, bodyH, { alpha: 0.85 + p * 0.15, flipX: flip })
    ctx.restore()
    _groundDust(ctx, foxCX, groundY, bodyH * (A.foxRise.fw / A.foxRise.fh) * 0.5, 1 - p)

  } else if (f < T_CHARGE_END) {
    // CHARGE — the fox rears & howls; the Tailed Beast Bomb condenses at its mouth.
    const p = (f - T_RISE_END) / TL.CHARGE
    _flash(ctx, cw, ch, "#1a0d00", 0.28)
    const howlFrame = (f % 12 < 6) ? 1 : 0   // jaw works as it roars
    drawFrame(ctx, A.foxHowl, howlFrame, foxCX, bodyRestCY, bodyH, { alpha: 1, flipX: flip })
    const mx = foxCX + mouthOffX, my = bodyRestCY + mouthOffY
    // condensing forming-orbs → the growing dark TBB
    const formFi = Math.min(A.tbbForm.frames - 1, Math.floor((1 - p) * A.tbbForm.frames))
    drawFrame(ctx, A.tbbForm, formFi, mx, my, (0.06 + _ease(p) * 0.16) * ch, { alpha: Math.min(1, 0.3 + p * 3) })

  } else if (f < T_FIRE_END) {
    // FIRE — the TBB streaks mouth→opponent, then detonates.
    const lf = f - T_CHARGE_END
    _flash(ctx, cw, ch, "#1a0d00", 0.18)
    drawFrame(ctx, A.foxLunge, lf < IMPACT_OFFSET ? 0 : 1, foxCX, bodyRestCY, bodyH, { alpha: 1, flipX: flip })
    const mx = foxCX + mouthOffX, my = bodyRestCY + mouthOffY
    const tgt = fighterScreenPos(cine.opponent, cw, ch, cine.enemySide > 0 ? 0.72 : 0.28)
    if (lf < IMPACT_OFFSET) {
      const t = _ease(lf / IMPACT_OFFSET)
      const bx = mx + (tgt.x - mx) * t, by = my + (tgt.y - my) * t
      const orbFi = Math.floor(lf / 3) % A.tbbOrb.frames
      drawFrame(ctx, A.tbbOrb, orbFi, bx, by, (0.18 + t * 0.16) * ch, { alpha: 1, flipX: flip })
      drawFrame(ctx, A.tbbOrb, orbFi, mx + (tgt.x - mx) * t * 0.85, my + (tgt.y - my) * t * 0.85, 0.14 * ch, { alpha: 0.3, flipX: flip })
    } else {
      const bf = lf - IMPACT_OFFSET
      const span = TL.FIRE - IMPACT_OFFSET
      _flash(ctx, cw, ch, "#ffffff", bf < 6 ? (1 - bf / 6) : 0)
      _flash(ctx, cw, ch, "#ff8a1a", Math.max(0, 0.30 - bf / 110))
      // detonation = the TBB orb blooming huge + fading (procedural rings on top)
      const grow = 1 + (bf / span) * 3.0
      const fade = Math.max(0, 1 - (bf / span))
      drawFrame(ctx, A.tbbOrb, 0, tgt.x, tgt.y, (ch * 0.24) * grow, { alpha: fade })
      ctx.save(); ctx.globalAlpha = fade * 0.6; ctx.strokeStyle = "#ffd24a"; ctx.lineWidth = 6
      ctx.beginPath(); ctx.arc(tgt.x, tgt.y, (ch * 0.12) * grow, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    }

  } else {
    // SETTLE — blast fades, fox sinks.
    const p = (f - T_FIRE_END) / TL.SETTLE
    const tgt = fighterScreenPos(cine.opponent, cw, ch, cine.enemySide > 0 ? 0.72 : 0.28)
    ctx.save(); ctx.globalAlpha = (1 - p) * 0.4; ctx.strokeStyle = "#ffd24a"; ctx.lineWidth = 4
    ctx.beginPath(); ctx.arc(tgt.x, tgt.y, ch * 0.36 * (1 + p), 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, groundY); ctx.clip()
    const cy = bodyRestCY + (groundY + bodyH * 0.5 - bodyRestCY) * _ease(p)
    drawFrame(ctx, A.foxLunge, 1, foxCX, cy, bodyH, { alpha: (1 - p) * 0.9, flipX: flip })
    ctx.restore()
  }
}
