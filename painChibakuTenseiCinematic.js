// painChibakuTenseiCinematic.js
// PAIN / NAGATO'S DEVA PATH — "Chibaku Tensei" (Ultimate) — a frozen combat cinematic. Mirrors the EXACT
// contract of madaraTengaiShinseiCinematic.js (activate / isActive / getPhase / update / draw / clear that
// truly FREEZES combat):
//   • abilities.executePainUltimate calls activatePainChibakuTenseiCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isPainChibakuTenseiCinematicActive() and calls
//     updatePainChibakuTenseiCinematic({camera, sound, ...}) + camera.advance().
//   • drawBattle() calls drawPainChibakuTenseiCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the SLAM beat (caller owns the payoff).
//   • every reset path calls clearPainChibakuTenseiCinematic().
//
// THE SHOW: Pain raises his arms (painChibakuCast pose plays through the freeze); a black gravity sphere
// forms overhead and GROWS as debris is drawn in (chibaku sphere strip); it then SLAMS down onto the
// opponent with a white/orange impact flash — the meteor-impact payoff. (An earlier sprite-based ground
// "explosion" — flat→dome→flame-pillar + shockwave rings — was REMOVED: its source art had baked-in green
// separator lines and drew ~136px right / ~77px below the opponent, so it looked bad and never connected.
// See PAIN_ASSET_MAP.md.) Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// TIMELINE (frames @60fps) — 172f total (~2.9s):
//   CAST  [0,48)     48f  camera frames both; Pain raises his arms, the sky darkens (gravity)
//   RISE  [48,110)   62f  the black sphere forms overhead and grows, drawing in debris
//   SLAM  [110,152)  42f  the sphere plunges onto the opponent → white/orange impact flash; damage here
//   SETTLE[152,172)  20f  the impact flash fades, camera returns before combat resumes
export const PAIN_CHIBAKU_TIMELINE = { CAST: 48, RISE: 62, SLAM: 42, SETTLE: 20 }
const T_CAST_END = PAIN_CHIBAKU_TIMELINE.CAST                        // 48
const T_RISE_END = T_CAST_END + PAIN_CHIBAKU_TIMELINE.RISE           // 110
const T_SLAM_END = T_RISE_END + PAIN_CHIBAKU_TIMELINE.SLAM           // 152
const T_TOTAL    = T_SLAM_END + PAIN_CHIBAKU_TIMELINE.SETTLE         // 172
const T_SLAM     = T_RISE_END                                        // 110 — the sphere touches down

const CINE_ZOOM = 0.76   // pull back to frame both fighters + the sphere overhead

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

export function activatePainChibakuTenseiCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true; cine.frame = 0
  cine.caster = caster; cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false; cine._cam = null; cine.savedMaxStep = null
  caster._spriteCastMove  = "painChibakuCast"     // the arms-raised cast pose plays through the freeze
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false; caster.vx = 0
  return true
}

export function isPainChibakuTenseiCinematicActive() { return cine.active }

export function getPainChibakuTenseiCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_CAST_END) return "cast"
  if (f < T_RISE_END) return "rise"
  if (f < T_SLAM_END) return "slam"
  return "settle"
}

export function getPainChibakuTenseiCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getPainChibakuTenseiCinematicPhase(),
    total: T_TOTAL, impactFrame: T_SLAM, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

export function updatePainChibakuTenseiCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08 }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
  }

  // Camera: frame BOTH fighters through rise/slam, then return to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    const z = f < T_SLAM_END ? CINE_ZOOM : 1.0
    if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, z)
    else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, z)
  }

  // Rumble: a rising tremor as the sphere grows, a HARD slam at impact, aftershocks after.
  if (cam && cam.shake) {
    if (f >= T_CAST_END && f < T_SLAM && f % 6 === 0) cam.shake(2 + ((f - T_CAST_END) / PAIN_CHIBAKU_TIMELINE.RISE) * 8, 8)
    else if (f === T_SLAM) cam.shake(42, 38)
    else if (f > T_SLAM && f < T_SLAM_END && f % 6 === 0) cam.shake(15, 12)
  }

  // SLAM — the guaranteed damage lands here, exactly once.
  if (f === T_SLAM && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endPainChibakuTenseiCinematic()
  return getPainChibakuTenseiCinematicPhase()
}

function endPainChibakuTenseiCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }   // never eat the payoff
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

export function clearPainChibakuTenseiCinematic() {
  if (cine.active || cine._cam) endPainChibakuTenseiCinematic()
}

// ── DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank). ──
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawPainChibakuTenseiCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1
  const oppX = cw * (0.5 + dir * 0.16), groundY = ch * 0.66   // the opponent's ground position (slam target)

  // Gravity sky darken — builds through cast/rise, fades in settle.
  let backdrop = 0
  if (f < T_SLAM_END) backdrop = 0.46 * Math.min(1, f / T_RISE_END)
  else                backdrop = 0.46 * (1 - (f - T_SLAM_END) / PAIN_CHIBAKU_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#05060d", backdrop)

  const skyX = oppX, skyY = ch * 0.22   // where the sphere forms/grows overhead

  // ── RISE — the black sphere forms overhead and GROWS, drawing in debris streaks. ──
  if (f >= T_CAST_END && f < T_SLAM) {
    const t = (f - T_CAST_END) / PAIN_CHIBAKU_TIMELINE.RISE            // 0→1
    // converging debris streaks (drawn toward the sphere)
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = `rgba(150,120,90,${0.35 * t})`; ctx.lineWidth = 2
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + t * 1.4
      const rad = ch * 0.34 * (1 - t) + 30
      ctx.beginPath(); ctx.moveTo(skyX + Math.cos(ang) * rad, skyY + Math.sin(ang) * rad * 0.7)
      ctx.lineTo(skyX + Math.cos(ang) * rad * 0.4, skyY + Math.sin(ang) * rad * 0.28); ctx.stroke()
    }
    ctx.restore()
    _drawSphere(ctx, skyX, skyY, ch * (0.10 + 0.34 * t), Math.min(4, Math.floor(t * 5)))
  }

  // ── SLAM — the gravity sphere plunges the last stretch and CRASHES down onto the target, with a
  // white/orange impact flash as the payoff. NOTE: the prior sprite-based ground "explosion" bloom
  // (flat→dome→flame-pillar) + its shockwave rings were REMOVED. Root cause was twofold and unfixable
  // in-code: (1) its source sheet `pain_chibaku_ground_uniform.png` carried BAKED-IN bright-green
  // separator lines running THROUGH the dome (x≈84) and pillar (x≈138) frames — a source-art defect, not
  // a sliceable gutter — plus a split-colour dome and a near-invisible flat stage; and (2) it drew at a
  // hardcoded screen fraction (oppX, groundY) that sat ~136px right and ~77px below the opponent's real
  // on-screen feet, so it never connected. The sphere slam + flash (below) is the clean meteor-impact
  // payoff and stands as the complete Ultimate. See PAIN_ASSET_MAP.md. ──
  if (f >= T_SLAM && f < T_SLAM_END + 6) {
    const since = f - T_SLAM
    const fall = Math.min(1, since / 10)                               // sphere drops in the first ~10f
    if (since < 12) {
      const sy = skyY + (groundY - skyY) * fall
      _drawSphere(ctx, skyX, sy, ch * 0.44 * (1 - 0.2 * fall), 4)
    }
    // white/orange impact flash — the meteor-impact detonation
    const decay = Math.max(0, 1 - since / 28)
    _flash(ctx, cw, ch, "#ffffff", decay * 0.7)
    _flash(ctx, cw, ch, "#ff7a1a", decay * 0.3)
  }
}

// Draw the chibaku sphere sprite (or a procedural rocky ball) at (x,y) with the given diameter + frame.
function _drawSphere(ctx, x, y, size, frameIdx) {
  const img = _img("./pain_chibaku_sphere_uniform.png")
  if (img) {
    const frames = 5, sw = img.naturalWidth / frames, sh = img.naturalHeight
    const fi = Math.max(0, Math.min(frames - 1, frameIdx))
    const dw = size, dh = size * (sh / sw)
    ctx.save(); ctx.globalAlpha = 1; ctx.drawImage(img, fi * sw, 0, sw, sh, x - dw / 2, y - dh / 2, dw, dh); ctx.restore()
  } else {
    ctx.save(); ctx.fillStyle = "#161213"; ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "rgba(90,70,55,0.8)"; ctx.lineWidth = 3; ctx.stroke(); ctx.restore()
  }
}
