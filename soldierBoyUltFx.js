// soldierBoyUltFx.js — RENDER-ONLY half of Soldier Boy's NUCLEAR BURST cinematic (soldierBoyUlt.js). One screen pass
// (cineRegistry overlay slot, identity transform, device pixels) that owns the picture while the cinematic runs:
// world → screen from camera.js's live transform, both fighters drawn HERE from their real sprite sheets (the engine
// sprites are hidden with _fxAlpha = 0). Layers: the sick-green radiation grade → the fallout sky (mushroom cloud) →
// floor (scorch, the glowing crater ring) → the fighters (his body lit from inside) → FX over (shock rings, embers,
// geiger flecks, the detonation sphere) → re-blit punch-in → title / cut-in → impact frames → letterbox + subtitles.
// Pure functions of the scene's script / real frames; noise = integer hash (no Math.random). Reduce Flashing → no
// white / inverted frames; Reduce Motion → no jitter / drifting particles.
// Also exports dcKit — the shared drawing kit the other DC / Marvel cinematic ultimates (spidermanUltFx.js, …) reuse.
import { camera } from './camera.js'
import { juiceSettings } from './juiceSettings.js'

// ══ THE KIT (shared) ════════════════════════════════════════════════════════════════════════════════════════════════
const imgs = new Map(), boxes = new Map()
const image = src => { let im = imgs.get(src); if (!im) { im = new Image(); im.src = src; imgs.set(src, im) } return im }
const ready = im => im && im.complete && im.naturalWidth > 0
const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
const outE = u => { u = clamp(u, 0, 1); return 1 - (1 - u) ** 3 }
const calmMotion = () => !!juiceSettings?.reduceMotion
const calmFlash = () => !!juiceSettings?.reduceFlashing
const animOf = (f, key) => (f?._skinAnim && f._skinAnim[key]) || f?.animationData?.[key] || null
function frameBox(im, sx, sy, w, h, key) {
  let b = boxes.get(key); if (b) return b
  try {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data
    let l = w, t = h, r = -1, bo = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 24) { if (x < l) l = x; if (x > r) r = x; if (y < t) t = y; if (y > bo) bo = y }
    b = r < 0 ? { l: 0, t: 0, r: w, b: h } : { l, t, r: r + 1, b: bo + 1 }
  } catch (_) { b = { l: 0, t: 0, r: w, b: h } }
  boxes.set(key, b); return b
}
let _tint = null
function tintCanvas(w, h) { if (!_tint) { const cv = document.createElement('canvas'); _tint = { cv, g: cv.getContext('2d') } }
  if (_tint.cv.width < w || _tint.cv.height < h) { _tint.cv.width = Math.max(_tint.cv.width, w); _tint.cv.height = Math.max(_tint.cv.height, h) } return _tint }
// one frame of fighter f's action keys[0..] (first that exists), content centred on x, content bottom on feetY (screen px).
// dir = facing on screen (+1 right). o: { alpha, tint, tintA, rot, sx, sy, skew, s, flip (sheet authored facing left) }
function sprite(c, f, keys, frame, x, feetY, z, dir, o = {}) {
  let a = null; for (const k of keys) if ((a = animOf(f, k))) break
  if (!a?.sheet) return null
  const im = image(a.sheet); if (!ready(im)) return null
  const n = Math.max(1, a.frames || 1), fi = ((frame | 0) % n + n) % n, w = a.width, h = a.height
  const cols = a.columns || a.cols || n, sx = (a.sourceX || 0) + (fi % cols) * w, sy = (a.sourceY || 0) + Math.floor(fi / cols) * h
  const bx = frameBox(im, sx, sy, w, h, a.sheet + '#' + sx + ',' + sy + ',' + w + ',' + h)
  const s = (f.spriteScale || 1.8) * (a.scale || 1) * z * (o.s || 1), ccx = (bx.l + bx.r) / 2, ccy = (bx.t + bx.b) / 2
  let src = im, ssx = sx, ssy = sy
  if (o.tint && (o.tintA ?? 0.6) > 0) {
    const sc = tintCanvas(w, h); sc.g.clearRect(0, 0, sc.cv.width, sc.cv.height); sc.g.globalCompositeOperation = 'source-over'; sc.g.globalAlpha = 1
    sc.g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    sc.g.globalCompositeOperation = 'source-atop'; sc.g.globalAlpha = clamp(o.tintA ?? 0.6, 0, 1); sc.g.fillStyle = o.tint; sc.g.fillRect(0, 0, w, h)
    src = sc.cv; ssx = 0; ssy = 0
  }
  const d = o.flip ? -dir : dir
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= o.alpha ?? 1
  if (o.rot) {
    c.translate(Math.round(x), Math.round(feetY - (bx.b - ccy) * s)); c.rotate(o.rot); if (d < 0) c.scale(-1, 1)
    c.drawImage(src, ssx, ssy, w, h, -ccx * s, -ccy * s, w * s, h * s)
  } else {
    c.translate(Math.round(x), Math.round(feetY)); if (o.sx || o.sy) c.scale(o.sx || 1, o.sy || 1); if (o.skew) c.transform(1, 0, o.skew, 1, 0, 0); if (d < 0) c.scale(-1, 1)
    c.drawImage(src, ssx, ssy, w, h, -ccx * s, -bx.b * s, w * s, h * s)
  }
  c.restore()
  return { top: feetY - (bx.b - bx.t) * s, h: (bx.b - bx.t) * s, w: (bx.r - bx.l) * s, s }
}
function preloadAnims(f, keys) { for (const k of keys) { const a = animOf(f, k); if (a?.sheet) image(a.sheet) } }
function view(W, H) {   // camera.applyTransform maths
  const z = camera.zoom || 1, ox = (camera.x || 0) + (camera.leadX || 0) - (camera.shakeX || 0), oy = (camera.y || 0) - (camera.shakeY || 0)
  return { z, p: (x, y) => ({ x: (x - ox) * z + W / 2, y: (y - oy) * z + H / 2 }) }
}
let _scr = null
function scratch(W, H) { if (!_scr) { const cv = document.createElement('canvas'); _scr = { cv, g: cv.getContext('2d') } }
  if (_scr.cv.width !== W || _scr.cv.height !== H) { _scr.cv.width = W; _scr.cv.height = H } return _scr }
function punchIn(ctx, canvas, W, H, cx, cy, z) {   // re-blit the finished frame scaled about (cx, cy) — a real close-up
  if (z <= 1.001) return
  const S = scratch(W, H); S.g.setTransform(1, 0, 0, 1, 0, 0); S.g.clearRect(0, 0, W, H); S.g.drawImage(canvas, 0, 0)
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false
  ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy)
  ctx.drawImage(S.cv, 0, 0); ctx.restore()
}
function speedLines(ctx, W, H, cx, cy, n, seed, col, a, inward = true, real = 0) {
  ctx.save(); ctx.globalCompositeOperation = 'source-over'
  const R = Math.hypot(W, H)
  for (let i = 0; i < n; i++) {
    const ang = hash(i, seed) * Math.PI * 2, u = calmMotion() ? 0.5 : ((real * 1.7 + hash(i, seed + 3) * 20) % 20) / 20
    const r0 = R * (inward ? 0.62 - u * 0.25 : 0.2 + u * 0.3), len = R * (0.12 + hash(i, seed + 5) * 0.25)
    ctx.strokeStyle = col; ctx.globalAlpha = a * (0.3 + 0.7 * hash(i, seed + 9)); ctx.lineWidth = 1 + hash(i, seed + 2) * 4
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang) * (r0 + len), cy + Math.sin(ang) * (r0 + len)); ctx.stroke()
  }
  ctx.restore()
}
// a slanted cut-in band with a slammed title; u = 0..1 through its life
function title(ctx, W, H, text, sub, u, o = {}) {
  const inU = clamp(u / 0.14, 0, 1), outU = clamp((u - 0.84) / 0.16, 0, 1)
  const ease = outE(inU), slideX = (1 - ease) * W * 0.8 * (o.from || 1) - outU * W * 0.9 * (o.from || 1), by = H * (o.y || 0.5), bh = H * (o.bh || 0.17)
  ctx.save(); ctx.translate(slideX, 0)
  ctx.beginPath(); ctx.moveTo(0, by - bh * 0.62); ctx.lineTo(W, by - bh * 0.42); ctx.lineTo(W, by + bh * 0.5); ctx.lineTo(0, by + bh * 0.4); ctx.closePath()
  ctx.fillStyle = o.band || 'rgba(8,4,4,0.92)'; ctx.fill()
  ctx.strokeStyle = o.edge || '#f2b705'; ctx.lineWidth = Math.max(3, H * 0.006); ctx.stroke()
  if (o.portrait) { const im = image(o.portrait); if (ready(im)) { ctx.save(); ctx.clip(); const ph = bh * 1.6, pw = ph * im.naturalWidth / im.naturalHeight
    ctx.imageSmoothingEnabled = false; ctx.drawImage(im, W * (o.portraitX ?? 0.1) - pw / 2, by - ph * 0.55, pw, ph); ctx.restore() } }
  const punch = 1 + Math.max(0, 1 - u / 0.05) * 0.6, fs = Math.round(H * (o.fs || 0.12) * punch)
  ctx.translate(W * (o.tx || 0.5), by); ctx.transform(1, 0, -0.16, 1, 0, 0)
  ctx.font = `900 ${fs}px Impact, "Arial Black", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = o.stroke || '#b3120f'; ctx.strokeText(text, 0, 0)
  ctx.fillStyle = o.fill || '#ffe14d'; ctx.fillText(text, 0, 0)
  if (sub) { ctx.font = `700 ${Math.round(H * 0.028)}px system-ui, sans-serif`; ctx.fillStyle = o.subFill || '#ffffff'; ctx.fillText(sub, 0, fs * 0.66) }
  ctx.restore()
}
function subtitle(ctx, W, H, who, line, a, col = '#f2b705') {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
  const fs = Math.round(H * 0.032), y = H * 0.935
  ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const tw = ctx.measureText(line).width, nf = Math.round(fs * 0.62)
  ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#000'; ctx.strokeText(line, W / 2, y); ctx.fillStyle = '#ffffff'; ctx.fillText(line, W / 2, y)
  ctx.font = `900 ${nf}px system-ui, sans-serif`; ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(who, W / 2 - tw / 2, y - fs * 0.95)
  ctx.restore()
}
function letterbox(ctx, W, H, inU, outU) { const bar = H * 0.12 * Math.min(clamp(inU, 0, 1), clamp(outU, 0, 1)); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar) }
function star(ctx, x, y, r, a, rot = 0, col = '#ffffff') {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = col
  ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath()
  for (let i = 0; i < 8; i++) { const rr = i & 1 ? r * 0.16 : r; const an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) }
  ctx.closePath(); ctx.fill()
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,240,200,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
function glow(ctx, x, y, r, rgb, a) {   // additive radial glow; rgb = "r,g,b"
  if (a <= 0 || r <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${clamp(a, 0, 1).toFixed(3)})`); g.addColorStop(0.45, `rgba(${rgb},${clamp(a * 0.35, 0, 1).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
function ring(ctx, x, y, r, ry, col, lw, a) { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(x, y, Math.max(1, r), Math.max(1, ry), 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore() }
function grade(ctx, W, H, op, col, a) { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = col; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore() }
function bigNumber(ctx, W, H, val, x, y, u, col = '#ff3b2f') {   // the damage number slammed in
  if (!(val > 0) || u < 0 || u > 1) return
  const fs = Math.round(H * 0.09 * (1 + Math.max(0, 1 - u * 14) * 0.6))
  ctx.save(); ctx.globalAlpha = clamp(1.4 - u * 1.4, 0, 1); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const nx = clamp(x, W * 0.1, W * 0.9), ny = clamp(y, H * 0.2, H * 0.8) - u * H * 0.08
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#1a0000'; ctx.strokeText(String(val), nx, ny); ctx.fillStyle = col; ctx.fillText(String(val), nx, ny); ctx.restore()
}
function caption(ctx, W, H, text, x, y, a, o = {}) {   // a big stamped word (onomatopoeia / call-out)
  if (a <= 0) return
  const fs = Math.round(H * (o.fs || 0.08) * (o.scale || 1))
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.translate(x, y); ctx.rotate(o.rot || 0)
  ctx.font = `900 ${fs}px Impact, "Arial Black", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  ctx.lineWidth = fs * 0.18; ctx.strokeStyle = o.stroke || '#000'; ctx.strokeText(text, 0, 0); ctx.fillStyle = o.fill || '#fff'; ctx.fillText(text, 0, 0)
  ctx.restore()
}
export const dcKit = { image, ready, hash, clamp, smooth, outE, calmMotion, calmFlash, animOf, sprite, preloadAnims, view, punchIn, speedLines, title, subtitle, letterbox, star, glow, ring, grade, bigNumber, caption }

// ══ SOLDIER BOY — NUCLEAR BURST ═══════════════════════════════════════════════════════════════════════════════════
const PORTRAIT = './soldier_boy_portrait.png'
export const SB_T = { critAt: 46, pulse1: 96, pulse2: 128, suckAt: 150, boomAt: 168, falloutAt: 200, standAt: 262, outAt: 300 }
const T = SB_T
export function preloadSoldierBoyUlt(f, t) {
  image(PORTRAIT)
  preloadAnims(f, ['idle', 'crouch', 'up', 'guard', 'hurt', 'win'])
  preloadAnims(t, ['idle', 'hurt', 'knockdown', 'guard', 'fall'])
}
const GREEN = '150,255,170', CORE = '220,255,235'

export function drawSoldierBoyUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 18, y: (hash(S.real, 2) - 0.5) * 18 } : { x: 0, y: 0 }
  const br = S.boomReal != null ? S.real - S.boomReal : -1
  const fp = V.p(f.x + (f.w || 48) / 2, S.floor), horizon = fp.y
  const chest = { x: fp.x + dir * 4 * z, y: fp.y - 78 * z }
  const tp = V.p(t.x + (t.w || 48) / 2, t.y + (t.h || 94))
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) THE GRADE — the world sickens to radiation green as the charge climbs, then goes black for the breath before
  const build = k < T.boomAt ? smooth((k - 10) / (T.suckAt - 10)) : 0
  grade(ctx, W, H, 'multiply', '#2c4a34', build * 0.55)
  grade(ctx, W, H, 'saturation', 'hsl(0,0%,50%)', build * 0.6)
  if (k >= T.suckAt && k < T.boomAt) grade(ctx, W, H, 'source-over', '#020604', smooth((k - T.suckAt) / 12) * 0.88)
  if (k >= T.boomAt && br > 30) {   // fallout: burnt-orange sky wash fading
    const a = clamp(1 - (k - T.falloutAt) / 90, 0, 1) * 0.55
    grade(ctx, W, H, 'multiply', '#c8743a', a); grade(ctx, W, H, 'soft-light', '#ff9a40', a * 0.6)
  }

  // 2) the mushroom cloud — rises behind everything after the detonation
  if (k >= T.boomAt && br > 26) mushroom(ctx, W, H, chest.x, horizon, z, br, S.real)

  // 3) floor: the glowing scorch + crater ring
  if (k >= T.boomAt) {
    const u = clamp((k - T.boomAt) / 40, 0, 1), fade = clamp(1 - (k - T.standAt) / 40, 0, 1)
    ctx.save(); ctx.globalAlpha = 0.85 * fade; ctx.fillStyle = '#120a06'; ctx.beginPath(); ctx.ellipse(fp.x, horizon + 4 * z, (60 + 220 * outE(u)) * z, (12 + 30 * outE(u)) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    ring(ctx, fp.x, horizon + 4 * z, (60 + 220 * outE(u)) * z, (12 + 30 * outE(u)) * z, '#ff8a2a', 6 * z, fade * (0.6 + 0.3 * Math.sin(S.real * 0.3)))
  } else if (k >= T.critAt) {   // the floor cracking under him, light through the cracks
    const u = smooth((k - T.critAt) / 90)
    ctx.save(); ctx.strokeStyle = `rgba(${GREEN},${(0.8 * u).toFixed(3)})`; ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 10; i++) { let px = fp.x, py = horizon; const side = i < 5 ? -1 : 1; ctx.lineWidth = Math.max(1.5, 4 * z * (1 - (i % 5) / 6)); ctx.beginPath(); ctx.moveTo(px, py)
      for (let s = 0; s < 6 * u; s++) { px += side * (16 + hash(i, s) * 30) * z; py += (hash(i + 7, s) - 0.5) * 8 * z; ctx.lineTo(px, py) } ctx.stroke() }
    ctx.restore()
  }

  // 4) the fighters
  drawFoe(ctx, S, V, k, tp)
  drawSB(ctx, S, V, k, fp, chest, br)

  // 5) FX over — geiger flecks, levitating debris, inward wind, pulse rings, the detonation
  if (k < T.boomAt && !calmMotion()) {
    const u = smooth(k / T.suckAt)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 30 + 50 * u; i++) {   // radioactive flecks crawling in toward his chest
      const an = hash(i, 31) * Math.PI * 2, ph = ((S.real * (0.9 + hash(i, 32)) + hash(i, 33) * 50) % 50) / 50
      const d = (40 + (1 - ph) * 260 * (0.6 + u)) * z
      ctx.globalAlpha = ph * (0.4 + 0.6 * u); ctx.fillStyle = i % 4 ? `rgb(${GREEN})` : '#ffffff'
      const s = (1.5 + hash(i, 34) * 2.5) * z; ctx.fillRect(chest.x + Math.cos(an) * d, chest.y + Math.sin(an) * d * 0.75, s, s)
    }
    ctx.restore()
    if (k >= T.critAt) {   // debris lifting off the floor
      const v = smooth((k - T.critAt) / 60)
      ctx.save()
      for (let i = 0; i < 24; i++) { const ph = ((k - T.critAt) * 0.5 + hash(i, 41) * 60) % 80 / 80
        const px = fp.x + (hash(i, 42) - 0.5) * 420 * z, py = horizon - ph * (90 + hash(i, 43) * 150) * z, sz = (3 + hash(i, 44) * 7) * z
        ctx.globalAlpha = Math.sin(Math.PI * ph) * v; ctx.fillStyle = i % 3 ? '#5a5048' : '#8a7c68'
        ctx.save(); ctx.translate(px, py); ctx.rotate(ph * 4 + i); ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.7); ctx.restore() }
      ctx.restore()
    }
  }
  for (const [at, big] of [[T.pulse1, 0], [T.pulse2, 1]]) {   // the two warning pulses
    const kp = k - at; if (kp < 0 || kp > 34) continue
    const u = kp / 34, r = (30 + outE(u) * (big ? 520 : 380)) * z
    ring(ctx, chest.x, chest.y, r, r * 0.8, '#ffffff', (12 - 8 * u) * z, (1 - u))
    ring(ctx, chest.x, chest.y, r * 0.86, r * 0.7, `rgb(${GREEN})`, (18 - 10 * u) * z, (1 - u) * 0.8)
    ring(ctx, fp.x, horizon, r * 1.1, r * 0.16, '#d8ffe0', 8 * z, (1 - u) * 0.8)
    glow(ctx, chest.x, chest.y, (120 + 120 * big) * z * (1 - u * 0.5), GREEN, (1 - u) * 0.8)
  }
  if (k >= T.boomAt && br >= 8) detonation(ctx, W, H, chest, horizon, z, br, S)
  if (k >= T.boomAt && k < T.standAt + 30 && !calmMotion()) {   // embers + ash drifting down through the fallout
    ctx.save()
    for (let i = 0; i < 60; i++) { const ph = (((k - T.boomAt) * (0.4 + hash(i, 51) * 0.6) + hash(i, 52) * 100) % 100) / 100
      const ex = ((hash(i, 53) * W * 1.3 + (k - T.boomAt) * (hash(i, 54) - 0.3) * 2) % (W * 1.2)) - W * 0.1, ey = -20 + ph * H * 1.05
      ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.8; ctx.fillStyle = i % 3 ? '#ffb060' : '#4a4038'; const s = 1.5 + hash(i, 55) * 3; ctx.fillRect(ex, ey, s, s) }
    ctx.restore()
  }

  // 6) punch-ins (camera.js caps zoom ≈1.15): the face, the chest going critical, the foe eating the blast
  const head = { x: fp.x, y: fp.y - 112 * z }
  if (k < T.critAt) punchIn(ctx, canvas, W, H, head.x, head.y, 1 + 0.4 * smooth((k - 4) / 36))
  else if (k >= T.pulse2 + 6 && k < T.suckAt) punchIn(ctx, canvas, W, H, chest.x, chest.y, 1 + 0.5 * smooth((k - T.pulse2 - 6) / 16))
  else if (k >= T.suckAt && k < T.boomAt) punchIn(ctx, canvas, W, H, chest.x, chest.y, 1.5 + 0.3 * smooth((k - T.suckAt) / 18))

  // 7) title + cut-in, impact frames, the number
  if (k >= T.critAt && k < T.pulse1) title(ctx, W, H, 'NUCLEAR BURST', 'COMPOUND V  ·  CRITICAL MASS', (k - T.critAt) / (T.pulse1 - T.critAt),
    { y: 0.3, fs: 0.12, band: 'rgba(10,18,10,0.93)', edge: '#9cff9c', stroke: '#1d4a1d', fill: '#e8ffe0', portrait: PORTRAIT, portraitX: 0.12, tx: 0.56, from: -dir })
  if (k >= T.critAt && k < T.pulse1) trefoil(ctx, W * (dir > 0 ? 0.9 : 0.1), H * 0.3, H * 0.08, S.real * 0.04, clamp((k - T.critAt - 6) / 8, 0, 1) * clamp((T.pulse1 - k) / 8, 0, 1))
  if (k >= T.pulse1 && k < T.pulse1 + 22) caption(ctx, W, H, 'KRRZZT', W * 0.5 + dir * W * 0.22, H * 0.3, clamp((T.pulse1 + 22 - k) / 8, 0, 1), { fill: '#c8ffd0', stroke: '#0b2a12', rot: -0.1, scale: 1 + Math.max(0, 1 - (k - T.pulse1) / 5) * 0.5 })
  if (k >= T.pulse2 && k < T.pulse2 + 22) caption(ctx, W, H, 'KRRRZZZT', W * 0.5 - dir * W * 0.2, H * 0.26, clamp((T.pulse2 + 22 - k) / 8, 0, 1), { fill: '#e8ffe8', stroke: '#0b2a12', rot: 0.08, scale: 1.2 + Math.max(0, 1 - (k - T.pulse2) / 5) * 0.5 })
  if (br >= 0 && br < 10) impactFrames(ctx, W, H, S, br, V, fp, tp, chest)
  if (br >= 10 && br < 16 && !calmFlash()) grade(ctx, W, H, 'source-over', '#fffbe8', 1 - (br - 10) / 6)
  if (br >= 28) bigNumber(ctx, W, H, S.dmg, W * 0.5 + dir * W * 0.25, H * 0.32, (br - 28) / 90, '#ffb347')
  if (k >= T.standAt && k < T.outAt + 10) {
    const a = Math.min(clamp((k - T.standAt) / 10, 0, 1), clamp((T.outAt + 10 - k) / 10, 0, 1))
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${Math.round(H * 0.06)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = dir > 0 ? 'left' : 'right'; ctx.textBaseline = 'middle'
    ctx.lineWidth = 6; ctx.strokeStyle = '#000'; const tx = dir > 0 ? W * 0.06 : W * 0.94
    ctx.strokeText('STILL STANDING.', tx, H * 0.2); ctx.fillStyle = '#e9c770'; ctx.fillText('STILL STANDING.', tx, H * 0.2); ctx.restore()
  }
  ctx.restore()

  // 8) letterbox + subtitles
  letterbox(ctx, W, H, S.real / 10, k >= T.outAt ? 1 - (k - T.outAt) / 12 : 1)
  if (k >= 4 && k < T.critAt + 30) subtitle(ctx, W, H, 'SOLDIER BOY', 'You have no idea what I am.', Math.min((k - 4) / 6, (T.critAt + 30 - k) / 8), '#e9c770')
  if (k >= T.pulse2 - 4 && k < T.suckAt + 6) subtitle(ctx, W, H, 'SOLDIER BOY', 'Get back. GET BACK!', Math.min((k - T.pulse2 + 4) / 5, (T.suckAt + 6 - k) / 6), '#e9c770')
  if (k >= T.standAt + 6 && k < T.outAt + 8) subtitle(ctx, W, H, 'SOLDIER BOY', 'The original. Still standing.', Math.min((k - T.standAt - 6) / 6, (T.outAt + 8 - k) / 8), '#e9c770')
  return true
}

// ── Soldier Boy: hunched, then lit from inside until he IS the bomb; then standing in the smoke ────────────────────
function drawSB(ctx, S, V, k, fp, chest, br) {
  const f = S.caster, z = V.z, dir = S.dir, x = fp.x
  const heat = k < T.boomAt ? smooth((k - 20) / (T.boomAt - 20)) : 0
  const flick = calmMotion() ? 0.5 : 0.5 + 0.5 * Math.sin(S.real * (0.6 + heat * 1.2))
  // the glow behind him
  if (k < T.boomAt) glow(ctx, chest.x, chest.y, (60 + 220 * heat) * z, GREEN, 0.25 + 0.6 * heat * (0.7 + 0.3 * flick))
  let keys = ['idle'], fr = (S.real >> 3) % 5, tintA = 0
  if (k < T.critAt) { keys = ['crouch', 'idle']; fr = k < 20 ? 0 : 1 + ((S.real >> 4) & 1); tintA = 0.15 * flick }
  else if (k < T.suckAt) { keys = ['guard', 'idle']; fr = 1; tintA = 0.2 + 0.55 * heat * flick }
  else if (k < T.boomAt) { keys = ['up', 'idle']; fr = 2; tintA = 0.9 }
  else if (br < 60) { keys = ['up', 'idle']; fr = 2; tintA = clamp(1 - br / 60, 0, 1) }
  else if (k < T.standAt) { keys = ['idle']; fr = (S.real >> 3) % 5; tintA = 0 }
  else { keys = ['win', 'idle']; fr = Math.min(6, (k - T.standAt) >> 2); tintA = 0 }
  const sx = x + (k < T.boomAt && !calmMotion() ? (hash(S.real, 61) - 0.5) * heat * 4 * z : 0)
  sprite(ctx, f, keys, fr, sx, fp.y, z, dir, { tint: k >= T.suckAt && k < T.boomAt + 30 ? '#ffffff' : '#c8ffd0', tintA })
  // veins of light: radiating cracks across the body
  if (k >= T.critAt && k < T.boomAt + 20) {
    const u = k < T.boomAt ? smooth((k - T.critAt) / (T.boomAt - T.critAt)) : 1 - (k - T.boomAt) / 20
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#eaffea'; ctx.lineCap = 'round'
    for (let i = 0; i < 9; i++) { const an = -Math.PI / 2 + (hash(i, 71) - 0.5) * Math.PI * 1.8; let px = chest.x, py = chest.y
      ctx.globalAlpha = u * (0.6 + 0.4 * flick); ctx.lineWidth = (2.5 - i * 0.15) * z; ctx.beginPath(); ctx.moveTo(px, py)
      for (let s = 0; s < 4 * u; s++) { px += Math.cos(an + (hash(i, s + 3) - 0.5)) * 10 * z; py += Math.sin(an + (hash(i, s + 5) - 0.5)) * 12 * z; ctx.lineTo(px, py) } ctx.stroke() }
    ctx.restore()
    glow(ctx, chest.x, chest.y, (24 + 60 * u) * z, CORE, 0.9 * u)
  }
  // steam off him after
  if (k >= T.falloutAt && !calmMotion()) {
    ctx.save()
    for (let i = 0; i < 14; i++) { const ph = ((S.real * 0.8 + hash(i, 81) * 60) % 60) / 60
      ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.35; ctx.fillStyle = '#d8d0c8'
      ctx.beginPath(); ctx.arc(x + (hash(i, 82) - 0.5) * 50 * z + ph * 10 * z, fp.y - (30 + ph * 140) * z, (6 + ph * 16) * z, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
  }
}
function drawFoe(ctx, S, V, k, tp) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (k < T.pulse1) { sprite(ctx, t, ['idle'], (S.real >> 3), tp.x, tp.y, z, fdir); return }
  if (k < T.boomAt) {   // staggered by the pulses, shielding their face from the light
    const hot = k >= T.suckAt
    sprite(ctx, t, ['hurt', 'idle'], k < T.pulse2 ? 1 : 3, tp.x, tp.y, z, fdir, { tint: hot ? '#000000' : '#c8ffd0', tintA: hot ? 0.75 : 0.25 })
    return
  }
  const kb = k - T.boomAt
  if (S.airborne) sprite(ctx, t, ['hurt', 'idle'], 8, tp.x, tp.y, z, fdir, { rot: S.dir * kb * 0.22, tint: '#ff9a40', tintA: clamp(0.7 - kb / 80, 0, 0.7) })
  else sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir, { tint: '#3a2a20', tintA: clamp(0.5 - (k - T.standAt) / 60, 0, 0.5) })
}
function trefoil(ctx, x, y, r, rot, a) {   // the radiation symbol
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot)
  ctx.fillStyle = '#f6d32a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#111'
  for (let i = 0; i < 3; i++) { const a0 = -Math.PI / 2 + i * Math.PI * 2 / 3 - Math.PI / 6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.86, a0, a0 + Math.PI / 3); ctx.closePath(); ctx.fill() }
  ctx.fillStyle = '#f6d32a'; ctx.beginPath(); ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}
// the detonation: a white-hot sphere swallowing the screen, a floor shock-skirt, the condensation ring
function detonation(ctx, W, H, c, horizon, z, kb, S) {
  const u = clamp((kb - 8) / 34, 0, 1), R = (70 + outE(u) * 620) * Math.max(z, 0.8), a = clamp(1 - (kb - 22) / 48, 0, 1)
  if (a <= 0) return
  glow(ctx, c.x, c.y, R * 1.4, '255,240,200', 0.9 * a)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.55, `rgba(255,236,170,${0.85 * a})`); g.addColorStop(0.85, `rgba(255,140,40,${0.6 * a})`); g.addColorStop(1, 'rgba(255,80,20,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  // the shock-skirt racing along the floor + the condensation (Wilson) ring
  ring(ctx, c.x, horizon, R * 1.5, R * 0.16, '#ffffff', 14 * z * a, a)
  ring(ctx, c.x, horizon, R * 1.25, R * 0.13, '#ffd27a', 24 * z * a, a * 0.7)
  ring(ctx, c.x, c.y - R * 0.2, R * 1.1, R * 0.35, '#e8f0ff', 8 * z * a, a * 0.5)
  if (!calmMotion()) speedLines(ctx, W, H, c.x, c.y, 60, 91 + (kb >> 1), '#fff6dc', 0.6 * a, false, kb)
}
// the mushroom cloud: a churning cap on a rising stem, lit from below
function mushroom(ctx, W, H, x, floorY, z, kb, real) {
  const rise = outE((kb - 26) / 90), a = clamp((kb - 26) / 14, 0, 1) * clamp(1 - (kb - 104) / 36, 0, 1) * 0.85
  if (a <= 0) return
  const capR = H * (0.05 + 0.1 * rise), capY = floorY - capR * 0.6 - (floorY - capR * 0.6 - H * 0.24) * rise
  ctx.save(); ctx.globalAlpha = a
  // stem
  const sg = ctx.createLinearGradient(0, capY, 0, floorY); sg.addColorStop(0, '#6a4a3a'); sg.addColorStop(0.7, '#b8643a'); sg.addColorStop(1, '#ffb060')
  ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x - capR * 0.18, capY + capR * 0.3); ctx.quadraticCurveTo(x - capR * 0.1, (capY + floorY) / 2, x - capR * 0.7, floorY)
  ctx.lineTo(x + capR * 0.7, floorY); ctx.quadraticCurveTo(x + capR * 0.1, (capY + floorY) / 2, x + capR * 0.18, capY + capR * 0.3); ctx.closePath(); ctx.fill()
  // the cap — billows
  for (let i = 0; i < 26; i++) {
    const an = (i / 26) * Math.PI * 2 + (calmMotion() ? 0 : real * 0.01), rr = capR * (0.55 + 0.25 * hash(i, 101))
    const bx = x + Math.cos(an) * capR * 0.85, by = capY + Math.sin(an) * capR * 0.42
    const shade = 0.5 + 0.5 * Math.max(0, Math.sin(an))
    ctx.fillStyle = `rgb(${Math.round(90 + 140 * shade)},${Math.round(60 + 70 * shade)},${Math.round(45 + 30 * shade)})`
    ctx.beginPath(); ctx.arc(bx, by, rr, 0, Math.PI * 2); ctx.fill()
  }
  const cg = ctx.createRadialGradient(x, capY + capR * 0.2, 0, x, capY, capR * 1.1); cg.addColorStop(0, 'rgba(255,220,140,0.95)'); cg.addColorStop(0.5, 'rgba(230,120,50,0.6)'); cg.addColorStop(1, 'rgba(80,50,40,0)')
  ctx.fillStyle = cg; ctx.beginPath(); ctx.ellipse(x, capY, capR * 1.1, capR * 0.62, 0, 0, Math.PI * 2); ctx.fill()
  // a ring of condensation around the stem
  ctx.strokeStyle = 'rgba(240,230,220,0.5)'; ctx.lineWidth = 6 * z; ctx.beginPath(); ctx.ellipse(x, capY + capR * 0.9, capR * 0.9, capR * 0.16, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.restore(); void W; void H
}
function impactFrames(ctx, W, H, S, br, V, fp, tp, chest) {
  const flash = !calmFlash(), z = V.z, f = S.caster, t = S.target, d = S.dir
  const sil = (bg, fg) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    speedLines(ctx, W, H, chest.x, chest.y, 80, 17 + br, fg, 0.9, false, br)
    sprite(ctx, f, ['up', 'idle'], 2, fp.x, fp.y, z, d, { tint: fg, tintA: 1 })
    sprite(ctx, t, ['hurt', 'idle'], 4, tp.x, tp.y, z, -d, { tint: fg, tintA: 1, sx: 0.85, skew: -d * 0.25 })
  }
  if (br < 3) { if (flash) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H) } else sil('#2a2a10', '#fff6c0'); return }
  if (br < 6) { if (flash) sil('#ffffff', '#000000'); else sil('#2a2a10', '#fff6c0'); return }
  if (flash) sil('#000000', '#ffffff'); else sil('#2a2a10', '#fff6c0')
}
