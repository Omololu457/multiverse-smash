// saitamaUltFx.js — RENDER-ONLY half of Saitama's SERIOUS SERIES: SERIOUS PUNCH cinematic (saitamaUlt.js). One screen pass
// (cineRegistry overlay slot, identity transform, device pixels) that owns the whole picture while the cinematic runs:
//   world → screen from camera.js's live transform (the same maths as camera.applyTransform), so world FX stay glued to the
//   stage; both fighters are drawn HERE from their real sprite sheets (the engine sprites are hidden with _fxAlpha = 0).
// Layers: time-slow desaturation → the split sky (cloud deck torn open along the punch line) → floor FX under the fighters
// (cracks, the planet-scale dust ring) → the fighters → FX over (wind into the fist, pebbles, shockwave wall) → a re-blit
// punch-in zoom (camera.js caps zoom ≈1.15) → manga panels (the deadpan face, the SERIOUS face, the giant fist) → titles →
// impact frames (white / inverted) → letterbox + subtitles. Returns true while active (hides the HUD).
// Pure functions of the scene's script / real frames; noise = integer hash (no Math.random). Reduce Flashing → no white /
// inverted frames; Reduce Motion → no jitter / drifting particles.
import { camera } from './camera.js'
import { juiceSettings } from './juiceSettings.js'

const BG = './saitama_death_punch_backround_effect.png'
const PORTRAIT = './saitama_portrait.png'
// cells of the hi-res backdrop (663×196): the shadowed SERIOUS face · the fist · face + fist
const CELL = { face: [0, 30, 84, 130], fist: [113, 26, 216, 140], both: [447, 0, 214, 194] }
const T = { seriousAt: 44, windAt: 96, titleAt: 128, lungeAt: 166, punchAt: 172, skyEnd: 250, okAt: 262, fallAt: 296, landAt: 314, outAt: 306 }

const imgs = new Map(), boxes = new Map()
const image = src => { let im = imgs.get(src); if (!im) { im = new Image(); im.src = src; imgs.set(src, im) } return im }
const ready = im => im && im.complete && im.naturalWidth > 0
const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
const outE = u => { u = clamp(u, 0, 1); return 1 - (1 - u) ** 3 }
const calmMotion = () => !!juiceSettings?.reduceMotion
const calmFlash = () => !!juiceSettings?.reduceFlashing

// ── sprites ──────────────────────────────────────────────────────────────────────────────────────────────────────────
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
// one frame of fighter f's action `keys[0..]`, content centred on (x) with content bottom on feetY (screen px), zoom z
function sprite(c, f, keys, frame, x, feetY, z, dir, o = {}) {
  let a = null; for (const k of keys) if ((a = animOf(f, k))) break
  if (!a?.sheet) return null
  const im = image(a.sheet); if (!ready(im)) return null
  const n = Math.max(1, a.frames || 1), fi = clamp(frame | 0, 0, n - 1), w = a.width, h = a.height
  const sx = (a.sourceX || 0) + fi * w, sy = a.sourceY || 0
  const bx = frameBox(im, sx, sy, w, h, a.sheet + '#' + sx + ',' + sy + ',' + w + ',' + h)
  const s = (f.spriteScale || 1.8) * (a.scale || 1) * z * (o.s || 1), ccx = (bx.l + bx.r) / 2, ccy = (bx.t + bx.b) / 2
  let src = im, ssx = sx, ssy = sy
  if (o.tint) {
    const sc = tintCanvas(w, h); sc.g.clearRect(0, 0, w, h); sc.g.globalCompositeOperation = 'source-over'; sc.g.globalAlpha = 1
    sc.g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    sc.g.globalCompositeOperation = 'source-atop'; sc.g.globalAlpha = o.tintA ?? 0.6; sc.g.fillStyle = o.tint; sc.g.fillRect(0, 0, w, h)
    src = sc.cv; ssx = 0; ssy = 0
  }
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= o.alpha ?? 1
  if (o.rot) { // spin about the content centre
    c.translate(Math.round(x), Math.round(feetY - (bx.b - ccy) * s)); c.rotate(o.rot); if (dir < 0) c.scale(-1, 1)
    c.drawImage(src, ssx, ssy, w, h, -ccx * s, -ccy * s, w * s, h * s)
  } else {
    c.translate(Math.round(x), Math.round(feetY)); if (dir < 0) c.scale(-1, 1)
    c.drawImage(src, ssx, ssy, w, h, -ccx * s, -bx.b * s, w * s, h * s)
  }
  c.restore()
  const top = feetY - (bx.b - bx.t) * s
  return { top, h: (bx.b - bx.t) * s, front: x + dir * (bx.r - ccx) * s, s }
}
export function preloadSaitamaUlt(f, t) {
  image(BG); image(PORTRAIT)
  for (const k of ['idle', 'saitamaDeathImpact', 'saitamaDeathCharge']) { const a = animOf(f, k); if (a?.sheet) image(a.sheet) }
  for (const k of ['idle', 'hurt', 'guard', 'knockdown', 'fall']) { const a = animOf(t, k); if (a?.sheet) image(a.sheet) }
}

// ── world → screen (camera.applyTransform maths) ─────────────────────────────────────────────────────────────────────
function view(W, H) {
  const z = camera.zoom || 1, ox = (camera.x || 0) + (camera.leadX || 0) - (camera.shakeX || 0), oy = (camera.y || 0) - (camera.shakeY || 0)
  return { z, p: (x, y) => ({ x: (x - ox) * z + W / 2, y: (y - oy) * z + H / 2 }) }
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
let _scr = null
function scratch(W, H) { if (!_scr) { const cv = document.createElement('canvas'); _scr = { cv, g: cv.getContext('2d') } }
  if (_scr.cv.width !== W || _scr.cv.height !== H) { _scr.cv.width = W; _scr.cv.height = H } return _scr }
function punchIn(ctx, canvas, W, H, cx, cy, z) {   // re-blit the finished frame scaled about (cx, cy) — a real close-up
  if (z <= 1.001) return
  const S = scratch(W, H); S.g.setTransform(1, 0, 0, 1, 0, 0); S.g.clearRect(0, 0, W, H); S.g.drawImage(canvas, 0, 0)
  ctx.save(); ctx.imageSmoothingEnabled = false
  ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy)
  ctx.drawImage(S.cv, 0, 0); ctx.restore()
}
function cell(ctx, name, x, y, h, o = {}) {   // a backdrop cell, height h, centred on (x, y)
  const im = image(BG); if (!ready(im)) return false
  const [sx, sy, sw, sh] = CELL[name], s = h / sh, w = sw * s
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= o.alpha ?? 1
  ctx.translate(x, y); if (o.dir < 0) ctx.scale(-1, 1)
  ctx.drawImage(im, sx, sy, sw, sh, -w / 2, -h / 2, w, h); ctx.restore()
  return { w, s }
}
function speedLines(ctx, W, H, cx, cy, n, seed, col, a, inward = true, real = 0) {
  const lum = parseInt(String(col).slice(1, 3), 16) || 0
  ctx.save(); ctx.globalCompositeOperation = lum > 128 ? 'lighter' : 'source-over'
  const R = Math.hypot(W, H)
  for (let i = 0; i < n; i++) {
    const ang = hash(i, seed) * Math.PI * 2, u = calmMotion() ? 0.5 : ((real * 1.7 + hash(i, seed + 3) * 20) % 20) / 20
    const r0 = R * (inward ? 0.62 - u * 0.25 : 0.2 + u * 0.3), len = R * (0.12 + hash(i, seed + 5) * 0.25)
    ctx.strokeStyle = col; ctx.globalAlpha = a * (0.3 + 0.7 * hash(i, seed + 9)); ctx.lineWidth = 1 + hash(i, seed + 2) * 4
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); ctx.lineTo(cx + Math.cos(ang) * (r0 + len), cy + Math.sin(ang) * (r0 + len)); ctx.stroke()
  }
  ctx.restore()
}
function hLines(ctx, W, y0, y1, n, seed, col, a, real) {   // horizontal manga speed lines (a panel's motion)
  ctx.save()
  for (let i = 0; i < n; i++) {
    const y = y0 + hash(i, seed) * (y1 - y0), len = W * (0.25 + hash(i, seed + 1) * 0.6), x = ((hash(i, seed + 2) * W * 2 + (calmMotion() ? 0 : real * (30 + hash(i, 4) * 40))) % (W * 1.6)) - W * 0.3
    ctx.globalAlpha = a * (0.25 + 0.6 * hash(i, seed + 3)); ctx.fillStyle = col; ctx.fillRect(x, y, len, 1 + hash(i, seed + 5) * 3)
  }
  ctx.restore()
}
function title(ctx, W, H, text, sub, u, o = {}) {   // a slanted cut-in band with a slammed title
  const inU = clamp(u / 0.14, 0, 1), outU = clamp((u - 0.84) / 0.16, 0, 1)
  const ease = outE(inU), slideX = (1 - ease) * W * 0.8 * (o.from || 1) - outU * W * 0.9 * (o.from || 1), by = H * (o.y || 0.5), bh = H * (o.bh || 0.17)
  ctx.save(); ctx.translate(slideX, 0)
  ctx.beginPath(); ctx.moveTo(0, by - bh * 0.62); ctx.lineTo(W, by - bh * 0.42); ctx.lineTo(W, by + bh * 0.5); ctx.lineTo(0, by + bh * 0.4); ctx.closePath()
  ctx.fillStyle = o.band || 'rgba(8,4,4,0.92)'; ctx.fill()
  ctx.strokeStyle = o.edge || '#f2b705'; ctx.lineWidth = Math.max(3, H * 0.006); ctx.stroke()
  const punch = 1 + Math.max(0, 1 - u / 0.05) * 0.6, fs = Math.round(H * (o.fs || 0.12) * punch)
  ctx.translate(W * 0.5, by); ctx.transform(1, 0, -0.16, 1, 0, 0)
  ctx.font = `900 ${fs}px Impact, "Arial Black", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.16; ctx.strokeStyle = o.stroke || '#b3120f'; ctx.strokeText(text, 0, 0)
  ctx.fillStyle = o.fill || '#ffe14d'; ctx.fillText(text, 0, 0)
  if (sub) { ctx.font = `700 ${Math.round(H * 0.028)}px system-ui, sans-serif`; ctx.fillStyle = '#ffffff'; ctx.fillText(sub, 0, fs * 0.66) }
  ctx.restore()
}
function subtitle(ctx, W, H, who, line, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
  const fs = Math.round(H * 0.032), y = H * 0.935
  ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const tw = ctx.measureText(line).width, nf = Math.round(fs * 0.62)
  ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#000'; ctx.strokeText(line, W / 2, y); ctx.fillStyle = '#ffffff'; ctx.fillText(line, W / 2, y)
  ctx.font = `900 ${nf}px system-ui, sans-serif`; ctx.fillStyle = '#f2b705'; ctx.textAlign = 'left'; ctx.fillText(who, W / 2 - tw / 2, y - fs * 0.95)
  ctx.restore()
}
function star(ctx, x, y, r, a, rot = 0) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = '#ffffff'
  ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath()
  for (let i = 0; i < 8; i++) { const rr = i & 1 ? r * 0.16 : r; const an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) }
  ctx.closePath(); ctx.fill()
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,240,200,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}

// ── the sky: an overcast cloud deck that the punch tears open along its line ───────────────────────────────────────────
function sky(ctx, W, H, horizon, fist, dir, k, S) {
  const kp = k - T.punchAt
  const a = kp < 0 ? 0 : kp < 3 ? kp / 3 : k < T.fallAt ? 1 : clamp(1 - (k - T.fallAt) / 26, 0, 1)
  if (a <= 0 || horizon <= 0) return
  const split = outE(kp / 34), rays = clamp(kp / 10, 0, 1)
  ctx.save(); ctx.globalAlpha = a
  ctx.beginPath(); ctx.rect(0, 0, W, horizon); ctx.clip()
  // clear high sky revealed behind the deck
  const g = ctx.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, '#2a6fd6'); g.addColorStop(0.6, '#8ec5ff'); g.addColorStop(1, '#e8f4ff')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon)
  // the split line: from the fist toward the far edge, rising
  const slope = clamp((fist.y - horizon * 0.12) / (W * 0.85), 0.2, 1.2), lineY = x => fist.y - Math.max(0, (x - fist.x) * dir) * slope
  // god rays pouring through the tear
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 9; i++) {
    const x0 = fist.x + dir * W * (0.12 + i * 0.11), y0 = lineY(x0), wv = 30 + hash(i, 4) * 60
    ctx.globalAlpha = a * rays * (0.10 + 0.10 * hash(i, 7)) * (1 + 0.3 * Math.sin(S.real * 0.1 + i))
    const rg = ctx.createLinearGradient(0, y0, 0, horizon); rg.addColorStop(0, 'rgba(255,246,216,1)'); rg.addColorStop(1, 'rgba(255,246,216,0)')
    ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(x0 - wv, y0); ctx.lineTo(x0 + wv, y0); ctx.lineTo(x0 + wv * 3 + dir * 80, horizon); ctx.lineTo(x0 - wv * 3 + dir * 80, horizon); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
  // the cloud deck: rows of puffs, parted by the tear (puffs ahead of the fist are pushed off the line)
  const rows = 7, gap0 = H * 0.05 + split * H * 0.5
  for (let r = 0; r < rows; r++) {
    const ry = horizon * (0.06 + r * 0.14), n = 16
    for (let i = 0; i < n; i++) {
      const id = r * 31 + i, px0 = (i + hash(id, 1) * 0.8) / n * (W + 240) - 120, py0 = ry + (hash(id, 2) - 0.5) * horizon * 0.12
      const ahead = (px0 - fist.x) * dir, Ly = lineY(px0), d = py0 - Ly
      let px = px0, py = py0
      if (ahead > -60) {
        const reach = clamp((ahead + 60) / (W * 0.9), 0, 1), front = clamp(split * 1.25 - reach * 0.35, 0, 1)
        const g2 = gap0 * front * (0.45 + reach)
        if (Math.abs(d) < g2) py = Ly + Math.sign(d || (hash(id, 3) - 0.5)) * g2 + d * 0.4
        px += dir * front * 90 * (0.4 + reach)
      } else {   // behind him the deck is shoved back by the blast ring
        px -= dir * split * 60
      }
      const rr = horizon * (0.07 + hash(id, 4) * 0.07) * (1 + r * 0.06)
      const shade = 0.55 + 0.35 * hash(id, 5) - r * 0.03
      ctx.fillStyle = `rgba(${Math.round(150 * shade + 40)},${Math.round(150 * shade + 45)},${Math.round(160 * shade + 55)},0.97)`
      ctx.beginPath(); ctx.ellipse(px, py, rr * 1.7, rr, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = `rgba(255,255,255,${(0.25 * (1 - r / rows)).toFixed(3)})`
      ctx.beginPath(); ctx.ellipse(px - rr * 0.3, py - rr * 0.35, rr * 1.0, rr * 0.45, 0, 0, Math.PI * 2); ctx.fill()
    }
  }
  // the tear's white-hot edge in its first instants
  if (kp >= 0 && kp < 18) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (1 - kp / 18)
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 + 30 * (1 - kp / 18)
    ctx.beginPath(); ctx.moveTo(fist.x, fist.y); ctx.lineTo(fist.x + dir * W * 1.2, lineY(fist.x + dir * W * 1.2)); ctx.stroke(); ctx.restore()
  }
  ctx.restore()
}

// ── floor FX (under the fighters) ─────────────────────────────────────────────────────────────────────────────────────
function cracks(ctx, x, y, z, u, seed) {   // radiating floor cracks from (x, y), grown to u
  if (u <= 0) return
  ctx.save(); ctx.strokeStyle = '#1a0f08'; ctx.lineCap = 'round'
  for (let i = 0; i < 12; i++) {
    let px = x, py = y; const side = i < 6 ? -1 : 1, segs = 6
    ctx.lineWidth = Math.max(1.5, 4 * z * (1 - (i % 6) / 8)); ctx.beginPath(); ctx.moveTo(px, py)
    for (let s = 0; s < segs * u; s++) { px += side * (18 + hash(seed + i, s) * 34) * z; py += (hash(seed + 9, i * 7 + s) - 0.5) * 9 * z; ctx.lineTo(px, py) }
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,120,60,0.35)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.restore()
}
function dustRing(ctx, x, y, z, kp, W) {   // the planet-scale dust ring: a flat torus of dust racing outward
  if (kp < 0 || kp > 110) return
  const u = kp / 110, r = (60 + outE(kp / 70) * 2600) * z, ry = r * 0.11, a = (1 - u) * 0.85
  ctx.save()
  for (let j = 0; j < 3; j++) {
    const rj = r * (1 - j * 0.08)
    ctx.globalAlpha = a * (0.6 - j * 0.15); ctx.strokeStyle = j ? '#a8916c' : '#d9c39a'; ctx.lineWidth = (26 - j * 6) * z * (1 + u)
    ctx.beginPath(); ctx.ellipse(x, y, rj, ry * (1 - j * 0.1), 0, 0, Math.PI * 2); ctx.stroke()
  }
  // billows rising off the ring
  if (!calmMotion()) for (let i = 0; i < 36; i++) {
    const an = (i / 36) * Math.PI * 2, bx = x + Math.cos(an) * r, by = y + Math.sin(an) * ry - hash(i, 3) * 30 * z * (0.5 + u)
    const br = (14 + hash(i, 5) * 24) * z * (1 + u * 1.5)
    ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#c8b28a'; ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore(); void W
}

// ── THE SCREEN PASS ──────────────────────────────────────────────────────────────────────────────────────────────────
export function drawSaitamaUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 16, y: (hash(S.real, 2) - 0.5) * 16 } : { x: 0, y: 0 }
  const pr = S.punchReal != null ? S.real - S.punchReal : -1
  const fp = V.p(f.x + (f.w || 48) / 2, S.floor), horizon = fp.y
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) TIME SLOWS — the world drains of colour (the people stay in colour: they are drawn after this)
  const slowA = k >= T.windAt - 8 && k < T.punchAt ? smooth((k - T.windAt + 8) / 24) * 0.85 : k >= T.punchAt && k < T.punchAt + 4 ? 0.85 : 0
  if (slowA > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = slowA; ctx.fillStyle = 'hsl(0,0%,50%)'; ctx.fillRect(-20, -20, W + 40, H + 40)
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = slowA * 0.35; ctx.fillStyle = '#8a6a5a'; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore()
  }
  // deadpan beat: a calm, slightly washed look
  if (k < T.seriousAt) { ctx.save(); ctx.globalAlpha = 0.18 * smooth(S.real / 12); ctx.fillStyle = '#fff3c4'; ctx.globalCompositeOperation = 'soft-light'; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore() }

  // fist point (screen) from his real punch frame geometry, estimated before the sprite is drawn
  const fistW = { x: f.x + (f.w || 48) / 2 + dir * 52, y: S.floor - (f.h || 94) * 0.62 }, fist = V.p(fistW.x, fistW.y)

  // 2) the split sky (behind the fighters)
  if (!S.blocked || true) sky(ctx, W, H, horizon, fist, dir, k, S)

  // 3) floor FX under the fighters
  const kp = k - T.punchAt
  if (k >= T.windAt) cracks(ctx, fp.x, horizon, z, k < T.punchAt ? smooth((k - T.windAt) / 70) * 0.7 : 1, 17)
  dustRing(ctx, fp.x, horizon, z, kp, W)

  // 4) the fighters (real sheets)
  const tp = foeScreen(S, V, k)
  drawFoe(ctx, S, V, k, tp)
  drawSaitama(ctx, S, V, k, fp)

  // 5) FX over: wind sucked into the fist, floating pebbles + dust motes, the shockwave wall, the twinkle, the falling foe
  if (k >= T.windAt && k < T.punchAt && !calmMotion()) {
    const u = smooth((k - T.windAt) / 60)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 40; i++) {
      const an = hash(i, 11) * Math.PI * 2, ph = ((S.real * (1.2 + hash(i, 2)) + hash(i, 3) * 40) % 40) / 40
      const d0 = (60 + (1 - ph) * 420) * z, len = (20 + hash(i, 4) * 50) * z
      ctx.globalAlpha = u * ph * 0.7; ctx.strokeStyle = '#fff2d0'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(fist.x + Math.cos(an) * d0, fist.y + Math.sin(an) * d0 * 0.6); ctx.lineTo(fist.x + Math.cos(an) * (d0 - len), fist.y + Math.sin(an) * (d0 - len) * 0.6); ctx.stroke()
    }
    ctx.restore()
    // pebbles + grit floating up around him, in slow motion
    ctx.save()
    for (let i = 0; i < 26; i++) {
      const ph = ((k - T.windAt) * 0.6 + hash(i, 5) * 60) % 70 / 70
      const px = fp.x + (hash(i, 6) - 0.5) * 360 * z, py = horizon - ph * (120 + hash(i, 7) * 160) * z, sz = (2 + hash(i, 8) * 6) * z
      ctx.globalAlpha = Math.sin(Math.PI * ph) * u; ctx.fillStyle = i % 3 ? '#6b5a48' : '#a89478'
      ctx.save(); ctx.translate(px, py); ctx.rotate(ph * 3 + i); ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.8); ctx.restore()
    }
    ctx.restore()
  }
  if (kp >= 0 && kp < 60) {   // the shockwave wall racing across the stage from the fist
    const u = kp / 60, wx = fist.x + dir * outE(u) * W * 1.4, a = (1 - u)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const wg = ctx.createLinearGradient(wx - dir * 160 * (1 + u), 0, wx, 0); wg.addColorStop(0, 'rgba(255,255,255,0)'); wg.addColorStop(0.8, `rgba(220,235,255,${(0.35 * a).toFixed(3)})`); wg.addColorStop(1, `rgba(255,255,255,${(0.9 * a).toFixed(3)})`)
    ctx.fillStyle = wg; ctx.fillRect(Math.min(wx, wx - dir * 160 * (1 + u)), 0, 160 * (1 + u), H)
    ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; ctx.lineWidth = 4 + 10 * a; ctx.beginPath(); ctx.moveTo(wx, 0); ctx.lineTo(wx, H); ctx.stroke()
    // ground spray kicked up at its base
    ctx.globalCompositeOperation = 'source-over'
    for (let i = 0; i < 18; i++) { const sx = wx - dir * hash(i, 21) * 140, sy = horizon - hash(i, 22) * 90 * a, sr = (6 + hash(i, 23) * 16) * z * 1.6
      ctx.globalAlpha = a * 0.7; ctx.fillStyle = '#b9a27c'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
    // concentric pressure rings out of the fist
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let j = 0; j < 3; j++) { const uj = clamp(u * 1.6 - j * 0.15, 0, 1); if (uj <= 0) continue
      ctx.globalAlpha = (1 - uj) * 0.9; ctx.strokeStyle = j ? '#ffe9a8' : '#ffffff'; ctx.lineWidth = (10 - j * 3)
      ctx.beginPath(); ctx.ellipse(fist.x, fist.y, 30 + uj * 520, (30 + uj * 520) * 0.55, 0, 0, Math.PI * 2); ctx.stroke() }
    ctx.restore()
  }
  if (!S.blocked && k >= 214 && k < 240) {   // the twinkle: gone into the stratosphere
    const u = (k - 214) / 26, sx = clamp(tp.x, W * 0.08, W * 0.92), sy = H * 0.15
    star(ctx, sx, sy, (18 + 40 * Math.sin(Math.PI * u)) * (H / 720), Math.sin(Math.PI * u), u * 2)
  }

  // 6) a real punch-in (camera.js caps zoom ≈1.15): the deadpan face, the cocked fist, the impact
  const head = V.p(f.x + (f.w || 48) / 2, S.floor - (f.h || 94) * 0.9)
  if (k < T.seriousAt) punchIn(ctx, canvas, W, H, head.x, head.y, 1 + 0.35 * smooth((k - 6) / 34))
  else if (k >= 140 && k < T.punchAt) punchIn(ctx, canvas, W, H, fist.x, fist.y, 1 + 0.5 * smooth((k - 140) / 26))

  // 7) MANGA PANELS + TITLES
  if (k >= 4 && k < T.seriousAt + 4) deadpanPanel(ctx, W, H, S, k)
  if (k >= T.seriousAt && k < T.windAt) seriousPanel(ctx, W, H, S, k)
  if (k >= T.titleAt && k < T.lungeAt) title(ctx, W, H, 'SERIOUS PUNCH', 'SERIOUS SERIES  ·  MAJI NAGURI', (k - T.titleAt) / (T.lungeAt - T.titleAt), { y: 0.24, fs: 0.13 })
  // the punch: white frame → inverted frame → the giant fist panel through the hit-stop
  if (pr >= 0 && pr < 30) impactFrames(ctx, canvas, W, H, S, pr, tp, V, fp)
  // the damage number
  if (pr >= 30 && pr < 110 && S.dmg > 0) {
    const u = (pr - 30) / 80, fs = Math.round(H * 0.09 * (1 + Math.max(0, 1 - (pr - 30) / 6) * 0.6))
    const nx = clamp(tp.x, W * 0.1, W * 0.9), ny = clamp(tp.y - H * 0.18, H * 0.2, H * 0.8) - u * H * 0.08
    ctx.save(); ctx.globalAlpha = clamp(1.4 - u * 1.4, 0, 1); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#2a0000'; ctx.strokeText(String(S.dmg), nx, ny); ctx.fillStyle = S.blocked ? '#ffd27a' : '#ff3b2f'; ctx.fillText(String(S.dmg), nx, ny); ctx.restore()
  }
  // the anticlimax
  if (k >= T.skyEnd) leaf(ctx, W, H, k)
  if (k >= 270 && k < T.outAt + 12) {
    const u = (k - 270) / 48, a = Math.min(clamp((k - 270) / 8, 0, 1), clamp((T.outAt + 12 - k) / 10, 0, 1))
    ctx.save(); ctx.globalAlpha = a; ctx.font = `300 ${Math.round(H * 0.05)}px "Helvetica Neue", system-ui, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 5
    ctx.strokeText('ONE PUNCH.', W * 0.93, H * 0.2 - u * 6); ctx.fillText('ONE PUNCH.', W * 0.93, H * 0.2 - u * 6); ctx.restore()
  }
  ctx.restore()

  // 8) letterbox + subtitles (steady — never jittered)
  const lbIn = clamp(S.real / 10, 0, 1), lbOut = k >= T.outAt ? clamp(1 - (k - T.outAt) / 14, 0, 1) : 1, bar = H * 0.12 * Math.min(lbIn, lbOut)
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar)
  if (k >= 2 && k < 140) subtitle(ctx, W, H, 'SAITAMA', "In that case, I'm using my finishing move too.", Math.min((k - 2) / 6, (140 - k) / 10))
  if (k >= T.okAt && k < T.outAt + 4) subtitle(ctx, W, H, 'SAITAMA', '…All right.', Math.min((k - T.okAt) / 6, (T.outAt + 4 - k) / 8))
  return true
}

// ── the fighters ─────────────────────────────────────────────────────────────────────────────────────────────────────
function drawSaitama(ctx, S, V, k, fp) {
  const f = S.caster, z = V.z, dir = S.dir, x = V.p(f.x + (f.w || 48) / 2, 0).x
  let keys = ['idle'], fr = 0
  if (k < T.windAt) { fr = ((S.real >> 3) % 5) }
  else if (k < 130) { keys = ['saitamaDeathImpact']; fr = 1 }
  else if (k < T.lungeAt) { keys = ['saitamaDeathImpact']; fr = 2 }
  else if (k < T.lungeAt + 3) { keys = ['saitamaDeathImpact']; fr = 3 }
  else if (k < T.skyEnd) { keys = ['saitamaDeathImpact']; fr = k < T.punchAt ? 4 : ((k >> 3) & 1) ? 5 : 4 }
  else if (k < T.skyEnd + 8) { keys = ['saitamaDeathImpact']; fr = 6 }
  else { keys = ['saitamaDeathImpact']; fr = 7 }
  // a heat-haze of SERIOUS intent around him through the wind-up
  if (k >= T.windAt && k < T.punchAt) {
    const u = smooth((k - T.windAt) / 40)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(x, fp.y - 60 * z, 4, x, fp.y - 60 * z, 120 * z); g.addColorStop(0, `rgba(255,80,40,${(0.25 * u).toFixed(3)})`); g.addColorStop(1, 'rgba(255,40,20,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, fp.y - 60 * z, 120 * z, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  // after-images on the lunge
  if (k >= T.lungeAt && k < T.punchAt + 8) for (let g = 3; g >= 1; g--) sprite(ctx, f, keys, 3, x - dir * g * 22 * z, fp.y, z, dir, { alpha: 0.18 * (4 - g), tint: '#ffffff', tintA: 0.6 })
  sprite(ctx, f, keys, fr, x, fp.y, z, dir)
}
function foeScreen(S, V, k) {
  const t = S.target
  const p = V.p(t.x + (t.w || 48) / 2, t.y + (t.h || 94))
  return { x: p.x, y: p.y }
}
function drawFoe(ctx, S, V, k, tp) {
  const t = S.target, z = V.z, kp = k - T.punchAt, fdir = -S.dir
  if (kp < 0) { sprite(ctx, t, k > 150 ? ['hurt', 'idle'] : ['idle'], 0, tp.x, tp.y, z, fdir); return }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir)
    if (kp < 40 && !calmMotion()) { ctx.save(); ctx.fillStyle = '#b9a27c'; for (let i = 0; i < 8; i++) { ctx.globalAlpha = (1 - kp / 40) * 0.6; ctx.beginPath(); ctx.arc(tp.x - S.dir * (10 + i * 14) * z, tp.y - hash(i, kp) * 12 * z, (5 + i) * z, 0, Math.PI * 2); ctx.fill() } ctx.restore() }
    return }
  if (k < T.fallAt) {   // blasted up and away, spinning, a smoke trail behind
    const spin = kp * 0.35 * S.dir
    if (!calmMotion()) { ctx.save(); for (let i = 1; i <= 8; i++) { ctx.globalAlpha = 0.35 * (1 - i / 9); ctx.fillStyle = '#e8dccb'; ctx.beginPath(); ctx.arc(tp.x - S.dir * i * 10 * z, tp.y - 40 * z + i * 26 * z, (10 + i * 4) * z, 0, Math.PI * 2); ctx.fill() } ctx.restore() }
    sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: spin }); return
  }
  const landed = k >= T.landAt
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], landed ? 9 : 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : (k * 0.4) })
  if (landed && k < T.landAt + 20) { const u = (k - T.landAt) / 20; ctx.save(); ctx.globalAlpha = (1 - u) * 0.7; ctx.fillStyle = '#c8b28a'; ctx.beginPath(); ctx.ellipse(tp.x, tp.y, (30 + u * 90) * z, (8 + u * 14) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}

// ── panels ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function deadpanPanel(ctx, W, H, S, k) {   // a manga inset: the bored, round, deadpan face
  const im = image(PORTRAIT); if (!ready(im)) return
  const u = (k - 4) / (T.seriousAt - 4), inU = outE(u / 0.2), outU = clamp((k - T.seriousAt) / 4, 0, 1)
  const pw = W * 0.26, ph = H * 0.46, px = W * 0.06 - (1 - inU) * W * 0.4, py = H * 0.2
  ctx.save(); ctx.globalAlpha = 1 - outU
  ctx.beginPath(); ctx.moveTo(px, py + ph * 0.06); ctx.lineTo(px + pw, py); ctx.lineTo(px + pw * 0.96, py + ph); ctx.lineTo(px + pw * 0.02, py + ph * 0.97); ctx.closePath()
  ctx.fillStyle = '#f6efe0'; ctx.fill(); ctx.save(); ctx.clip()
  // dotted screentone
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let yy = py; yy < py + ph; yy += 10) for (let xx = px + ((yy / 10) & 1) * 5; xx < px + pw; xx += 10) ctx.fillRect(xx, yy, 3, 3)
  const s = (ph * 1.15) / (im.naturalHeight * 0.62), dw = im.naturalWidth * s
  ctx.imageSmoothingEnabled = false; ctx.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * 0.62, px + pw / 2 - dw / 2, py + ph * 0.02, dw, ph * 1.15 * 0.98)
  ctx.restore()
  ctx.lineWidth = Math.max(3, H * 0.007); ctx.strokeStyle = '#111'; ctx.stroke()
  // a deadpan "…" bubble
  const bx = px + pw * 0.84, by = py - H * 0.02
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#111'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(bx, by, W * 0.04, H * 0.04, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#111'; ctx.font = `900 ${Math.round(H * 0.04)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('…', bx, by - H * 0.006)
  ctx.restore()
}
function seriousPanel(ctx, W, H, S, k) {   // the world drops to black-red: the rare SERIOUS face, eyes in shadow, one white glint
  const u = (k - T.seriousAt) / (T.windAt - T.seriousAt), inA = clamp((k - T.seriousAt) / 4, 0, 1), outA = clamp((T.windAt - k) / 6, 0, 1), a = Math.min(inA, outA)
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.05, W * 0.5, H * 0.5, H * 0.9); g.addColorStop(0, '#5a0606'); g.addColorStop(1, '#070000')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  hLines(ctx, W, H * 0.1, H * 0.9, 70, 5, '#ff5a3a', 0.35, S.real)
  const fh = H * (0.86 + 0.12 * smooth(u)), fx = W * 0.5 + (1 - outE(u / 0.25)) * W * 0.3 * S.dir, fy = H * 0.5
  cell(ctx, 'face', fx, fy, fh, { dir: S.dir })
  // the eye glint: the backdrop's white eye at (54,106) of the face cell (84×130 from y 30)
  const sc = fh / CELL.face[3], ex = fx + S.dir * (54 - CELL.face[2] / 2) * sc, ey = fy + (106 - CELL.face[1] - CELL.face[3] / 2) * sc
  if (k >= T.seriousAt + 14) star(ctx, ex, ey, H * 0.07 * (1 + 0.3 * Math.sin(S.real * 0.5)), clamp((k - T.seriousAt - 14) / 4, 0, 1) * 0.95, S.real * 0.04)
  // SERIOUS SERIES — stamped
  if (k >= T.seriousAt + 16) {
    const su = clamp((k - T.seriousAt - 16) / 5, 0, 1), sc2 = 1 + (1 - su) * 0.8
    ctx.save(); ctx.translate(W * (S.dir > 0 ? 0.27 : 0.73), H * 0.8); ctx.scale(sc2, sc2); ctx.rotate(-0.05)
    const fs = Math.round(H * 0.085)
    ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#000'; ctx.strokeText('SERIOUS SERIES', 0, 0)
    ctx.fillStyle = '#ffffff'; ctx.fillText('SERIOUS SERIES', 0, 0)
    ctx.font = `700 ${Math.round(H * 0.026)}px system-ui, sans-serif`; ctx.fillStyle = '#ff7a5a'; ctx.fillText('— no more holding back —', 0, fs * 0.7)
    ctx.restore()
  }
  ctx.restore()
}
function impactFrames(ctx, canvas, W, H, S, pr, tp, V, fp) {
  const flash = !calmFlash(), z = V.z, f = S.caster, t = S.target, d = S.dir
  const sil = (bg, fg) => {   // the classic anime impact frame: flat background, both fighters as hard silhouettes, burst lines
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 70, 41 + pr, fg, 0.9, false, pr)
    ctx.save(); ctx.globalCompositeOperation = 'source-over'
    sprite(ctx, f, ['saitamaDeathImpact'], 4, V.p(f.x + (f.w || 48) / 2, 0).x, fp.y, z, d, { tint: fg, tintA: 1 })
    sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, -d, { tint: fg, tintA: 1 })
    ctx.restore()
  }
  if (pr < 3) { if (flash) sil('#ffffff', '#000000'); return }
  if (pr < 7) { if (flash) sil('#000000', '#ffffff'); else sil('#1a0000', '#ffe14d'); return }
  // the giant fist panel (face + fist) slammed over the whole screen through the hold, red burst lines behind it
  const u = (pr - 7) / 23, a = pr < 24 ? 1 : clamp(1 - (pr - 24) / 6, 0, 1)
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.05, W / 2, H / 2, H * 0.9); g.addColorStop(0, '#fff6e0'); g.addColorStop(0.5, '#ffb08a'); g.addColorStop(1, '#b3120f')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  speedLines(ctx, W, H, W / 2, H / 2, 110, 61, '#3a0000', 1, false, pr)
  ctx.globalCompositeOperation = 'source-over'
  const shake = calmMotion() ? 0 : (hash(pr, 9) - 0.5) * H * 0.02
  cell(ctx, 'both', W / 2 + shake, H / 2 + shake * 0.6, H * (1.05 + 0.08 * u), { dir: S.dir })
  ctx.restore()
}
function leaf(ctx, W, H, k) {   // a single leaf drifts across the quiet
  const u = (k - T.skyEnd) / 74; if (u > 1) return
  const x = W * (1.05 - u * 1.2), y = H * (0.42 + 0.08 * Math.sin(u * 9)), r = H * 0.012
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(u * 14) * 0.9)
  ctx.fillStyle = '#7a9a3a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 2, r, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#4a5e20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 2, 0); ctx.lineTo(r * 2.4, 0); ctx.stroke(); ctx.restore()
}

// shared with genosUltFx.js (the other One Punch Man cinematic)
export const opmKit = { image, ready, hash, clamp, smooth, outE, animOf, sprite, view, punchIn, speedLines, subtitle, star, calmMotion, calmFlash }
