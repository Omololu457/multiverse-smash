// rengokuFlameExplosionCinematic.js
// RENGOKU ULTIMATE — "Flame Breathing, Ultimate Technique, Ninth Form: RENGOKU" — a frozen combat cinematic.
// Contract (unchanged; game.js / abilities.js untouched):
//   • abilities.executeRengokuUltimate() plays the voice line (rengoku_039_ultimate_technique.mp3 — the FULL
//     anime call, 5.5 s) and calls activateRengokuFlameExplosionCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isRengokuFlameExplosionCinematicActive() and calls
//     updateRengokuFlameExplosionCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawRengokuFlameExplosionCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the CUT beat (caller owns the payoff), exactly once.
//   • every reset path calls clearRengokuFlameExplosionCinematic().
//
// The shot list is timed to the voice line (60 fps; the clip's words measured from its waveform):
//   BREATH  [0,168)    the camera closes in on him; Total Concentration — he breathes: embers are drawn IN to his
//                      mouth, then flame is breathed OUT, slower and deeper each cycle; the heat builds.
//   CALL    [168,300)  "Ōgi" (2.8 s) 奥義 · "Ku no Kata" (3.6 s) 玖ノ型 · "RENGOKU!" (4.4 s) 煉獄 — each word
//                      slams in as brush calligraphy; on "RENGOKU" the flames engulf him (his own explosion sprite).
//   SLASH   [300,312)  one dash THROUGH the opponent — a great flame trail along the path; he ends behind them.
//   STILL   [312,330)  silence; his back to the foe; a thin line of light opens across them.
//   CUT     [330,390)  the cut ignites: white flash, a burning diagonal slash, rings, embers; the camera pulls back.
// Deterministic (no RNG; frame-indexed). The caster's sprite frames are driven here (_animFrozen + frameIndex).
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

export const RENGOKU_ULT_CINE_TIMELINE = { BREATH: 168, CALL: 132, SLASH: 12, STILL: 18, CUT: 60 }
const T_CALL   = 168                     // "Ōgi"
const T_KATA   = 216                     // "Ku no Kata"
const T_NAME   = 264                     // "RENGOKU!"
const T_SLASH  = 300
const T_STILL  = 312
const T_IMPACT = 330
const T_TOTAL  = 390
const WORDS = [[T_CALL, "奥義", "ULTIMATE TECHNIQUE"], [T_KATA, "玖ノ型", "NINTH FORM"], [T_NAME, "煉獄", "RENGOKU"]]

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, saved: null, x0: 0, x1: 0, dir: 1, oppAt: null
}

export function activateRengokuFlameExplosionCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  Object.assign(cine, { active: true, frame: 0, caster, opponent: opponent || null, onImpact: typeof onImpact === "function" ? onImpact : null,
    struck: false, _cam: null, saved: null, x0: caster.x || 0, x1: caster.x || 0, dir: (caster.facing ?? 1) >= 0 ? 1 : -1, oppAt: null })
  caster._spriteCastMove  = "ultimate"
  caster._spriteCastTimer = T_TOTAL + 8
  caster._animFrozen = true
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isRengokuFlameExplosionCinematicActive() { return cine.active }

export function getRengokuFlameExplosionCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  return f < T_CALL ? "breath" : f < T_SLASH ? "call" : f < T_STILL ? "slash" : f < T_IMPACT ? "still" : "cut"
}

export function getRengokuFlameExplosionCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getRengokuFlameExplosionCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k)
const cx = o => (o.x || 0) + (o.w || 60) / 2
// the caster's sprite: breathing stance (cells 0/1 with the breath), the blade raised word by word (2-4), the
// eruption (5-7) on "RENGOKU", then the dash strip through the foe, held after the pass
function poseCaster(f) {
  const c = cine.caster; if (!c) return
  const sh = c.spriteHandler
  let move = "ultimate", fi = 0
  if (f < T_CALL) fi = (f % 56) < 26 ? 1 : 0
  else if (f < T_KATA) fi = 2
  else if (f < T_NAME) fi = 3
  else if (f < T_SLASH) fi = Math.min(7, 4 + Math.floor((f - T_NAME) / 9))
  else if (f < T_STILL) { move = "dash"; fi = Math.min(1, Math.floor((f - T_SLASH) / 6)) }
  else if (f < T_IMPACT + 40) { move = "rengokuSuperDown"; fi = f < T_STILL + 6 ? 4 : 5 }   // the kneeling follow-through, blade out behind, back to the foe
  else { move = null }
  c._spriteCastMove = move
  if (move) { c._spriteCastTimer = T_TOTAL; c._animFrozen = true; if (sh) { const total = (sh._actionDef && sh._actionDef.frames) || 1; sh.frameIndex = Math.max(0, Math.min(total - 1, fi)) } }
  else { c._animFrozen = false; c._spriteCastTimer = 0 }
}

export function updateRengokuFlameExplosionCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame, c = cine.caster, opp = cine.opponent

  if (f === 0 && cam) {
    cine._cam = cam
    cine.saved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }
    cam.maxZoom = 3.0; cam.maxZoomStep = 0.07; cam.maxPanStep = 90
  }
  poseCaster(f)

  // the dash: decided at the first SLASH frame (just past the foe, inside the world), eased over 8 frames
  if (f === T_SLASH && c) {
    const w = c.w || 60, ow = opp ? (opp.w || 60) : 0, ww = cam?.worldWidth || 3200
    const end = opp ? cx(opp) + cine.dir * (ow / 2 + w / 2 + 90) - w / 2 : (c.x || 0) + cine.dir * 360
    cine.x0 = c.x || 0; cine.x1 = Math.max(20, Math.min(ww - 20 - w, end))
    if (opp) cine.oppAt = { x: cx(opp), y: (opp.y || 0) + (opp.h || 100) * 0.45 }
    try { snd?.play?.(SFX.WHIFF) } catch (_) {}
  }
  if (c && f >= T_SLASH && f <= T_SLASH + 8) { c.x = cine.x0 + (cine.x1 - cine.x0) * ease((f - T_SLASH) / 8); c.vx = 0 }
  if (f === T_NAME) { try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {} }

  // camera: tight on him while he breathes and calls the form; whip with the dash; on the foe for the cut; pull back
  if (cam && c) {
    const head = () => { cam.targetY = (c.y || 0) + (c.h || 100) * 0.3 }
    if (f < T_CALL) { cam.focusOnFighter(c, 1.6 + 1.3 * ease(f / 100)); head() }
    else if (f < T_NAME) { cam.focusOnFighter(c, f < T_KATA ? 2.3 : 2.6); head() }
    else if (f < T_SLASH) { cam.focusOnFighter(c, 1.9) }
    else if (f < T_STILL) { if (opp) cam.focusBetween(c, opp, 1.15); cam.maxPanStep = 260; cam.maxZoomStep = 0.12 }
    else if (f < T_IMPACT) { if (opp) cam.focusBetween(c, opp, 1.45); cam.maxPanStep = 90 }
    else { const k = ease((f - T_IMPACT) / (T_TOTAL - T_IMPACT)); if (opp) cam.focusOnFighter(opp, 1.7 - 0.7 * k); else cam.focusOnFighter(c, 1.0) }
    if (cam.shake) {
      if (f >= T_NAME && f < T_SLASH && f % 6 === 0) cam.shake(5, 6)
      if (f === T_SLASH + 2) cam.shake(14, 10)
      if (f === T_IMPACT) cam.shake(34, 30)
      if (f > T_IMPACT && f < T_IMPACT + 30 && f % 7 === 0) cam.shake(10, 8)
    }
  }

  // THE CUT — he turns to face the foe as it lands; the guaranteed damage, exactly once
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.HIT_ULTIMATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
    // he is still facing away (the follow-through): the cut throws the foe AWAY from him, not into his back
    if (opp && c && Math.sign(opp.vx || 0) === Math.sign(cx(c) - cx(opp))) opp.vx = -opp.vx
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endRengokuFlameExplosionCinematic()
  return getRengokuFlameExplosionCinematicPhase()
}

function endRengokuFlameExplosionCinematic() {
  const cam = cine._cam
  if (cam && cine.saved) { cam.maxZoom = cine.saved.maxZoom; cam.maxZoomStep = cine.saved.maxZoomStep; cam.maxPanStep = cine.saved.maxPanStep }
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }   // never eat the payoff
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0; cine.caster._animFrozen = false
    if (cine.opponent) cine.caster.facing = cx(cine.opponent) >= cx(cine.caster) ? 1 : -1 }   // turn back to the foe as combat resumes
  Object.assign(cine, { active: false, frame: 0, caster: null, opponent: null, onImpact: null, struck: false, _cam: null, saved: null, oppAt: null })
}

export function clearRengokuFlameExplosionCinematic() {
  if (cine.active || cine._cam) endRengokuFlameExplosionCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — screen space, over the frozen world (world points mapped through the live camera)
// ─────────────────────────────────────────────────────────────────
const hsh = (a, b) => { let v = (a * 374761393 + b * 668265263) >>> 0; v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0; return ((v ^ (v >>> 16)) >>> 0) / 4294967296 }
function toScreen(cam, cw, ch, x, y) {
  if (!cam) return { x: cw / 2, y: ch / 2, z: 1 }
  const z = cam.zoom || 1
  return { x: (x - (cam.x || 0) - (cam.leadX || 0) + (cam.shakeX || 0)) * z + cw / 2, y: (y - (cam.y || 0) + (cam.shakeY || 0)) * z + ch / 2, z }
}
function flameTongue(ctx, x, y, h, w, lean, t, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w, y)
  ctx.quadraticCurveTo(x - w * 0.6 + lean * 0.4, y - h * 0.55, x + lean + Math.sin(t) * w * 0.3, y - h)
  ctx.quadraticCurveTo(x + w * 0.6 + lean * 0.4, y - h * 0.5, x + w, y); ctx.closePath(); ctx.fill()
}

export function drawRengokuFlameExplosionCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || 1280, ch = canvas?.height || 720
  const f = cine.frame, c = cine.caster, opp = cine.opponent, cam = cine._cam, dir = cine.dir
  if (!c) return
  const head = toScreen(cam, cw, ch, cx(c) + dir * 8, (c.y || 0) + (c.h || 100) * 0.16), z = head.z
  const feet = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100))
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)

  // heat: a dark ember vignette that deepens with every breath
  const heat = f < T_SLASH ? Math.min(1, f / 120) : f < T_IMPACT ? 1 : Math.max(0, 1 - (f - T_IMPACT) / 50)
  const vg = ctx.createRadialGradient(head.x, head.y, Math.min(cw, ch) * 0.12, head.x, head.y, Math.max(cw, ch) * 0.75)
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(30,6,0,${0.78 * heat})`)
  ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch)

  // rising embers over the whole frame
  ctx.globalCompositeOperation = "lighter"
  for (let i = 0; i < 40; i++) {
    const sp = 0.6 + hsh(i, 1) * 1.6, y = ch - ((f * sp * 3 + hsh(i, 2) * ch * 2) % (ch * 1.2)), x = hsh(i, 3) * cw + Math.sin((f + i * 20) / 30) * 18
    ctx.globalAlpha = (0.25 + 0.5 * hsh(i, 4)) * heat; ctx.fillStyle = i % 3 ? "#ff8a2a" : "#ffd27a"; ctx.fillRect(x, y, 3, 3)
  }

  // BREATH: Total Concentration — embers pulled in, then flame breathed out (deeper each cycle)
  if (f < T_NAME) {
    const cyc = 56, p = f % cyc, n = Math.floor(f / cyc), depth = Math.min(1.6, 0.7 + n * 0.3)
    if (p < 26) {   // inhale
      const k = p / 26
      for (let i = 0; i < 18; i++) { const a = hsh(i, n + 9) * Math.PI * 2, r = (150 * depth) * (1 - k) * z * 0.5 + 6
        ctx.globalAlpha = 0.85 * k; ctx.fillStyle = i % 2 ? "#ffb04a" : "#ff5a1a"; ctx.beginPath(); ctx.arc(head.x + Math.cos(a) * r, head.y + Math.sin(a) * r * 0.7, 2.5 * z * 0.5 + 1, 0, Math.PI * 2); ctx.fill() }
    } else {        // exhale: a plume of flame and white breath from the mouth, in the facing direction
      const k = (p - 26) / 30
      for (let i = 0; i < 14; i++) { const d = (20 + i * 9) * depth * z * 0.5 * ease(k * 1.4), r = (4 + i * 1.6) * depth * z * 0.5
        ctx.globalAlpha = Math.max(0, (1 - k) * (1 - i / 16) * 0.9); ctx.fillStyle = i < 4 ? "#fff3d6" : i < 9 ? "#ffa23a" : "#ff4a12"
        ctx.beginPath(); ctx.arc(head.x + dir * d, head.y - Math.sin(i * 0.5 + k) * 4 + i * 0.6, r, 0, Math.PI * 2); ctx.fill() }
    }
    // the glow in his chest builds with the breathing
    const g = ctx.createRadialGradient(head.x, head.y + 30 * z, 0, head.x, head.y + 30 * z, 90 * z * heat + 10)
    g.addColorStop(0, `rgba(255,180,60,${0.5 * heat})`); g.addColorStop(1, "rgba(255,80,0,0)")
    ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch)
  }

  // RENGOKU!: the flames engulf him
  if (f >= T_NAME && f < T_SLASH + 6) {
    const k = Math.min(1, (f - T_NAME) / 14)
    for (let i = 0; i < 16; i++) { const x = feet.x + (i - 7.5) * 14 * z, h = (110 + 120 * hsh(i, 5)) * z * k, w = (16 + 10 * hsh(i, 6)) * z
      ctx.globalAlpha = 0.55; flameTongue(ctx, x, feet.y, h, w, Math.sin((f + i * 7) / 6) * 14 * z, f / 4 + i, i % 2 ? "#ff5a12" : "#ffb02a") }
    ctx.globalAlpha = 0.18 * k; ctx.fillStyle = "#ff6a1a"; ctx.fillRect(0, 0, cw, ch)
  }

  // THE DASH: a broad flame trail along the path (it stays, fading, through the stillness)
  if (f >= T_SLASH && f < T_IMPACT + 20) {
    const a = toScreen(cam, cw, ch, cine.x0 + (c.w || 60) / 2, (c.y || 0) + (c.h || 100) * 0.55)
    const b = toScreen(cam, cw, ch, cine.x1 + (c.w || 60) / 2, (c.y || 0) + (c.h || 100) * 0.55)
    const grow = Math.min(1, (f - T_SLASH) / 8), fade = f < T_STILL ? 1 : Math.max(0, 1 - (f - T_STILL) / 30), ex = a.x + (b.x - a.x) * grow
    for (let L = 0; L < 3; L++) {
      const hh = (70 - L * 20) * z
      ctx.globalAlpha = fade * (0.35 + L * 0.2); ctx.fillStyle = ["#ff3a0a", "#ff8a1a", "#fff0c0"][L]; ctx.beginPath(); ctx.moveTo(a.x, a.y)
      for (let i = 0; i <= 24; i++) { const k = i / 24, x = a.x + (ex - a.x) * k; ctx.lineTo(x, a.y - hh * Math.sin(k * Math.PI) * (0.6 + 0.4 * Math.sin(k * 18 + f * 0.8 + L))) }
      for (let i = 24; i >= 0; i--) { const k = i / 24, x = a.x + (ex - a.x) * k; ctx.lineTo(x, a.y + hh * 0.35 * Math.sin(k * Math.PI)) }
      ctx.closePath(); ctx.fill()
    }
    if (f < T_STILL) { ctx.globalAlpha = 0.5; ctx.fillStyle = "#ffffff"; for (let i = 0; i < 22; i++) { const y = hsh(i, 7) * ch; ctx.fillRect(0, y, cw, 1 + (i % 3)) } }   // speed lines
  }

  // STILLNESS → THE CUT: a thin line of light opens across the foe, then ignites
  if (cine.oppAt && f >= T_STILL) {
    const o = toScreen(cam, cw, ch, cine.oppAt.x, cine.oppAt.y), L = 170 * o.z
    const k = f < T_IMPACT ? (f - T_STILL) / (T_IMPACT - T_STILL) : 1, burn = f >= T_IMPACT ? (f - T_IMPACT) / (T_TOTAL - T_IMPACT) : 0
    const x1 = o.x - L * 0.7, y1 = o.y - L * 0.55, x2 = o.x + L * 0.7, y2 = o.y + L * 0.55
    ctx.lineCap = "round"
    if (f < T_IMPACT) { ctx.globalAlpha = 0.9; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2 + 2 * k; ctx.beginPath(); ctx.moveTo(o.x + (x1 - o.x) * k, o.y + (y1 - o.y) * k); ctx.lineTo(o.x + (x2 - o.x) * k, o.y + (y2 - o.y) * k); ctx.stroke() }
    else {
      const a = Math.max(0, 1 - burn * 1.2)
      if (burn < 0.12) { ctx.globalAlpha = 0.85 * (1 - burn / 0.12); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch) }
      ctx.globalAlpha = a; ctx.strokeStyle = "#ff4a0a"; ctx.lineWidth = 40 * o.z * (1 - burn * 0.6); ctx.beginPath(); ctx.moveTo(x1 * 1.15 - o.x * 0.15, y1 * 1.15 - o.y * 0.15); ctx.lineTo(x2 * 1.15 - o.x * 0.15, y2 * 1.15 - o.y * 0.15); ctx.stroke()
      ctx.strokeStyle = "#ffd060"; ctx.lineWidth = 16 * o.z; ctx.stroke(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 5 * o.z; ctx.stroke()
      for (let i = 0; i < 3; i++) { const t = Math.max(0, Math.min(1, burn * 2.2 - i * 0.15)); if (t <= 0 || t >= 1) continue
        ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = ["#ffe08a", "#ff8a2a", "#ff3a0a"][i]; ctx.lineWidth = 8 * (1 - t) + 2; ctx.beginPath(); ctx.ellipse(o.x, o.y, t * cw * 0.4, t * cw * 0.14, 0, 0, Math.PI * 2); ctx.stroke() }
      for (let i = 0; i < 30; i++) { const ang = hsh(i, 8) * Math.PI * 2, d = burn * (120 + 260 * hsh(i, 9)) * o.z
        ctx.globalAlpha = a; ctx.fillStyle = i % 2 ? "#ffcf6a" : "#ff5a1a"; ctx.fillRect(o.x + Math.cos(ang) * d, o.y + Math.sin(ang) * d - burn * 60, 5, 5) }
    }
  }

  // THE CALL: each word slams in as brush calligraphy on the far side of him, with its English beneath
  ctx.globalCompositeOperation = "source-over"
  if (f >= T_CALL && f < T_SLASH + 4) {
    const side = head.x < cw / 2 ? 0.74 : 0.26, out = f >= T_SLASH ? 1 - (f - T_SLASH) / 4 : 1
    WORDS.forEach(([at, jp, en], i) => {
      if (f < at) return
      const k = Math.min(1, (f - at) / 6), sc = 1.8 - 0.8 * ease(k), size = Math.round(ch * (i === 2 ? 0.2 : 0.11) * sc)
      const x = cw * side + (i - 1) * cw * 0.085 * (side > 0.5 ? -1 : 1), y = ch * (0.3 + i * 0.02)
      ctx.globalAlpha = out * Math.min(1, k * 2)
      ctx.save(); ctx.translate(x, y); ctx.textAlign = "center"; ctx.textBaseline = "top"
      ctx.font = `900 ${size}px "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif`
      const chars = [...jp]; chars.forEach((chh, j) => {
        ctx.lineWidth = Math.max(4, size * 0.12); ctx.strokeStyle = "#140400"; ctx.strokeText(chh, 0, j * size * 0.98)
        ctx.fillStyle = i === 2 ? "#ff3a12" : "#fff1dc"; ctx.fillText(chh, 0, j * size * 0.98) })
      ctx.restore()
    })
    const said = WORDS.filter(([at]) => f >= at).map(w => w[2]).join("  ·  ")
    ctx.globalAlpha = out; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `800 ${Math.round(ch * 0.034)}px Georgia, serif`
    ctx.lineWidth = 5; ctx.strokeStyle = "#140400"; ctx.strokeText("FLAME BREATHING  ·  " + said, cw / 2, ch * 0.86); ctx.fillStyle = "#ffd9a0"; ctx.fillText("FLAME BREATHING  ·  " + said, cw / 2, ch * 0.86)
  }

  // letterbox
  const lb = Math.min(1, f / 10) * (f > T_TOTAL - 20 ? (T_TOTAL - f) / 20 : 1), bar = Math.round(ch * 0.09 * lb)
  ctx.globalAlpha = 1; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cw, bar); ctx.fillRect(0, ch - bar, cw, bar)
  ctx.restore()
}
