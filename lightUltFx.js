// lightUltFx.js — RENDER half of lightUlt.js (Light Yagami's AS PLANNED / I AM KIRA cinematics). Reads lightUltScene();
// never writes sim state. One screen-space pass (cineRegistry.registerCineScreen — after the world, before the HUD):
//   1. the finished world frame RE-DRAWN scaled about the subject (a real push-in / punch-zoom past camera.js's cap) and
//      colour-graded (cold desaturated blue for the writing, crimson for Kira);
//   2. a WORLD layer drawn with the camera matrix (rebuilt from camera.js exactly as applyTransform does) × the push-in:
//      Ryuk, Light himself from his own sheets (his engine sprite is hidden by _fxAlpha 0), the scythe crescents, sparks;
//   3. the SCREEN layer: the Death Note page close-up with the name written stroke by stroke, the 40-second clock, the
//      ECG, the potato-chip panel, the "THAT'S RIGHT. I'M KIRA." panel, storms of pages, impact frames (white → inverted),
//      the final-reap screen split, captions, damage, letterbox + title cut-in. Returns true while active (hides the HUD).
// Render-only noise = integer hash of the scene's frame counters. Also exports the small drawing kit L's ultimate reuses.
import { registerCineScreen } from './cineRegistry.js'
import { camera } from './camera.js'
import { lightUltScene, LIGHT_CINE } from './lightUlt.js'

// ── shared kit (also used by lRyuuzakiUltFx.js) ──────────────────────────────────────────────────────────────────────
const imgs = new Map(), boxes = new Map()
export const image = src => { let im = imgs.get(src); if (!im) { im = new Image(); im.src = src; imgs.set(src, im) } return im }
export const ready = im => !!(im && im.complete && im.naturalWidth > 0)
export const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
export const easeO = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) * (1 - u) }
export const seg = (k, a, b) => clamp((k - a) / Math.max(1, b - a), 0, 1)
const GLOBAL = 1.18   // sprite.js GLOBAL_SPRITE_SCALE

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
// one frame of a horizontal strip: content centred on x (or ax = anchor fraction of the frame width), content bottom on feetY
export function blitSheet(c, url, frames, w, h, fi, x, feetY, dir, scale, o = {}) {
  const im = image(url); if (!ready(im)) return null
  const n = Math.max(1, frames | 0), i = clamp(fi | 0, 0, n - 1), inset = o.inset | 0
  const sx = i * w + inset, sy = inset, sw = w - inset * 2, sh = h - inset * 2
  const bx = frameBox(im, sx, sy, sw, sh, url + '#' + sx + ',' + sw + ',' + sh)
  const ax = o.ax != null ? o.ax * sw : (bx.l + bx.r) / 2
  let src = im, ssx = sx, ssy = sy
  if (o.tint) {
    const t = tintCanvas(sw, sh); t.g.clearRect(0, 0, t.cv.width, t.cv.height); t.g.globalCompositeOperation = 'source-over'; t.g.globalAlpha = 1
    t.g.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh); t.g.globalCompositeOperation = 'source-atop'; t.g.globalAlpha = o.tintA ?? 0.7
    t.g.fillStyle = o.tint; t.g.fillRect(0, 0, sw, sh); t.g.globalCompositeOperation = 'source-over'; src = t.cv; ssx = 0; ssy = 0
  }
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= (o.alpha ?? 1)
  if (o.comp) c.globalCompositeOperation = o.comp
  c.translate(Math.round(x), Math.round(feetY)); if (dir < 0) c.scale(-1, 1); if (o.rot) c.rotate(o.rot)
  c.drawImage(src, ssx, ssy, sw, sh, -ax * scale, -bx.b * scale, sw * scale, sh * scale)
  c.restore()
  return { top: feetY - (bx.b - bx.t) * scale, height: (bx.b - bx.t) * scale, s: scale, front: x + dir * (bx.r - ax) * scale, back: x - dir * (ax - bx.l) * scale }
}
// one frame of a fighter's own animation (the worn skin's sheet when it has one)
export function blitAnim(c, f, key, fi, x, feetY, dir, o = {}) {
  const A = (f?._skinAnim && f._skinAnim[key]) || f?.animationData?.[key]; if (!A?.sheet) return null
  const s = (f.spriteScale ?? 1.9) * GLOBAL * (o.s || 1)
  const n = Math.max(1, A.frames || 1), i = o.loop ? ((fi % n) + n) % n : clamp(fi | 0, 0, n - 1)
  return blitSheet(c, A.sheet, n, A.width, A.height, i, x, feetY, dir, s, { ...o, inset: typeof o.inset === 'function' ? o.inset(i) : o.inset, ax: typeof o.ax === 'function' ? o.ax(i) : o.ax })
}
export const animFrames = (f, key) => ((f?._skinAnim && f._skinAnim[key]) || f?.animationData?.[key])?.frames || 1
// world → screen, rebuilt exactly as camera.applyTransform does (the screen hook runs right after the world pass)
export function worldXf(canvas) {
  const cw = canvas.width, ch = canvas.height
  return new DOMMatrix().translate(cw * 0.5, ch * 0.5).scale(camera.zoom || 1).translate(-(camera.x || 0) - (camera.leadX || 0) + (camera.shakeX || 0), -(camera.y || 0) + (camera.shakeY || 0))
}
// the push-in: re-draw the finished frame scaled Z about screen point (fx, fy), graded with a CSS filter
let _scr = null
export function scratchOf(canvas) {
  if (!_scr) { const cv = document.createElement('canvas'); _scr = { cv, g: cv.getContext('2d') } }
  if (_scr.cv.width !== canvas.width || _scr.cv.height !== canvas.height) { _scr.cv.width = canvas.width; _scr.cv.height = canvas.height }
  return _scr
}
export function pushIn(c, canvas, Z, fx, fy, filter) {
  const W = canvas.width, H = canvas.height
  Z = Math.max(1, Z)
  const hw = W / (2 * Z), hh = H / (2 * Z)
  fx = clamp(fx, hw, W - hw); fy = clamp(fy, hh, H - hh)
  const P = new DOMMatrix().translate(W / 2, H / 2).scale(Z).translate(-fx, -fy)
  if (Z > 1.001 || filter) {
    const s = scratchOf(canvas); s.g.setTransform(1, 0, 0, 1, 0, 0); s.g.clearRect(0, 0, W, H); s.g.drawImage(canvas, 0, 0)
    c.save(); c.setTransform(P); c.imageSmoothingEnabled = Z < 1.6; if (filter) c.filter = filter
    c.drawImage(s.cv, 0, 0); c.restore()
  }
  return P
}
// bold call-out with an outline (screen space)
export function card(c, text, x, y, size, fill, alpha = 1, rot = 0, stroke = '#000000', font = '900 %spx "Arial Black", Arial, sans-serif', align = 'center') {
  if (alpha <= 0.01 || !text) return
  c.save(); c.globalAlpha = clamp(alpha, 0, 1); c.translate(x, y); c.rotate(rot)
  c.font = font.replace('%s', Math.max(6, Math.round(size))); c.textAlign = align; c.textBaseline = 'middle'; c.lineJoin = 'round'
  c.lineWidth = Math.max(2, size * 0.16); c.strokeStyle = stroke; c.strokeText(text, 0, 0)
  c.fillStyle = fill; c.fillText(text, 0, 0); c.restore()
}
export function letterbox(c, W, H, k, total, col, u) {
  const inU = easeO(k / 10), outU = easeO((total - k) / 14), bar = H * 0.115 * Math.min(inU, outU)
  c.fillStyle = '#000000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar)
  c.globalAlpha = Math.min(inU, outU); c.fillStyle = col; c.fillRect(0, bar - 2 * u, W, 2 * u); c.fillRect(0, H - bar, W, 2 * u); c.globalAlpha = 1
  return bar
}
// impact frame: age 0 white, then `inv` inverted frames, then a fading tint
export function impactFrame(c, W, H, age, inv, tint, tintA) {
  if (age < 0) return
  if (age === 0) { c.globalAlpha = 0.95; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H) }
  else if (age <= inv) { c.globalCompositeOperation = 'difference'; c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over' }
  else if (age < inv + 14) { c.globalAlpha = tintA * (1 - (age - inv) / 14); c.fillStyle = tint; c.fillRect(0, 0, W, H) }
  c.globalAlpha = 1
}
export function speedLines(c, W, H, x, y, a, seed, n = 48, col = '#ffffff') {
  c.save(); c.globalAlpha = a; c.fillStyle = col
  const R = Math.hypot(W, H)
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + hash(i, seed) * 0.12, r0 = R * (0.22 + 0.2 * hash(i + 9, seed)), wdt = 0.006 + 0.012 * hash(i + 3, seed)
    c.beginPath(); c.moveTo(x + Math.cos(ang - wdt) * R, y + Math.sin(ang - wdt) * R); c.lineTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0)
    c.lineTo(x + Math.cos(ang + wdt) * R, y + Math.sin(ang + wdt) * R); c.closePath(); c.fill()
  }
  c.restore()
}
export function vignette(c, W, H, col0, col1) {
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.95)
  g.addColorStop(0, col0); g.addColorStop(1, col1); c.fillStyle = g; c.fillRect(0, 0, W, H)
}
// title cut-in band: diagonal strip sliding in, the portrait, the name slammed in
export function titleCut(c, W, H, k, end, u, o) {
  if (k >= end) return
  const a = k < 4 ? k / 4 : k > end - 6 ? (end - k) / 6 : 1, slide = easeO(k / 7), y0 = H * 0.16, bh = 150 * u
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.translate((1 - slide) * -W, 0)
  c.beginPath(); c.moveTo(0, y0 + 26 * u); c.lineTo(W, y0 - 26 * u); c.lineTo(W, y0 - 26 * u + bh); c.lineTo(0, y0 + 26 * u + bh); c.closePath(); c.fillStyle = o.band; c.fill()
  c.fillStyle = o.accent; c.fillRect(0, y0 + 2 * u, W, 4 * u); c.fillRect(0, y0 + bh - 6 * u, W, 4 * u)
  for (let i = 0; i < 9; i++) { const sx = ((k * (22 + i * 5) + i * 160) % (W + 300)) - 150, sy = y0 + 20 * u + hash(i, 4) * (bh - 40 * u); c.fillStyle = o.streak; c.fillRect(sx, sy, 80 + 120 * hash(i + 3, 4), 2 * u) }
  const por = o.portrait ? image(o.portrait) : null
  if (ready(por)) { const ph = bh * 1.1, pw = ph * por.naturalWidth / por.naturalHeight; c.save(); c.beginPath(); c.rect(0, y0 - 30 * u, W, bh + 60 * u); c.clip(); c.imageSmoothingEnabled = false; c.drawImage(por, W * 0.07, y0 + bh / 2 - ph / 2, pw, ph); c.restore() }
  const slam = k < 6 ? 0 : k < 12 ? 1.9 - 0.9 * easeO((k - 6) / 6) : 1
  if (slam > 0) card(c, o.title, W * 0.6, y0 + bh * 0.42, 70 * u * slam, '#ffffff', 1, -0.04, o.stroke)
  if (k >= 12) card(c, o.sub, W * 0.62, y0 + bh * 0.8, 26 * u, o.accent, clamp((k - 12) / 5, 0, 1), -0.04, '#000000')
  c.restore()
}
export function subtitle(c, W, H, bar, text, a, u) {
  if (a <= 0.01) return
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.font = `italic 600 ${Math.round(22 * u)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.lineWidth = 5 * u; c.strokeStyle = '#000000'; c.strokeText(text, W / 2, H - bar - 26 * u); c.fillStyle = '#f2f2f2'; c.fillText(text, W / 2, H - bar - 26 * u); c.restore()
}
// zoom-aware damage pops (world point through matrix M)
export function drawPops(c, M, pops, real, u, col) {
  for (const p of pops) {
    const age = real - p.real; if (age < 0 || age > 50 || !p.amt) continue
    const q = M.transformPoint({ x: p.x, y: p.y })
    const s = (26 + 22 * (p.power || 0.5)) * u * (age < 4 ? 1.5 - age * 0.12 : 1)
    card(c, String(p.amt), q.x + (hash(p.real, 2) - 0.5) * 40 * u, q.y - 30 * u - age * 1.2 * u, s, col, clamp((50 - age) / 12, 0, 1), -0.05, '#000000')
  }
}
const mat = (c, M) => c.setTransform(M.a, M.b, M.c, M.d, M.e, M.f)
export { mat }

// ── LIGHT ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const RYUK = { url: './light_ryuk_uniform.png', n: 5, w: 66, h: 58 }
const view = { z: 1, x: 0, y: 0, last: -1 }   // render-only smoothing of the push-in
// preload Light's cinematic sheets while the meter is nearly full (render-only)
if (typeof Image !== 'undefined') for (const u of ['./light_ultwrite_uniform.png', './light_scythe_uniform.png', './light_cast_uniform.png', './light_lose_uniform.png', RYUK.url, './light_kira_panel.png', './light_asplanned_panel.png', './light_portrait.png']) image(u)

function draw(ctx, canvas) {
  const sc = lightUltScene()
  if (!sc) { view.last = -1; return false }
  const W = canvas.width, H = canvas.height, u = H / 720
  const f = sc.caster, t = sc.target, k = sc.k, real = sc.real, d = sc.d
  const plan = sc.kind === 'plan', CF = LIGHT_CINE[sc.kind], T = CF.total
  const XF = worldXf(canvas)
  const sp = (x, y) => XF.transformPoint({ x, y })
  const fx = (f.x || 0) + (f.w || 48) / 2, ff = (f.y || 0) + (f.h || 94)
  const tx = (t.x || 0) + (t.w || 48) / 2, tcy = (t.y || 0) + (t.h || 94) * 0.45
  const lastAge = sc.last ? real - sc.last.real : 99, lastPow = sc.last?.power || 0
  // ── 1. push-in target (screen) ──
  let Z = 1, foc = sp((fx + tx) / 2, (ff + tcy) / 2), grade = null
  if (plan) {
    const P = CF
    if (k < P.title) { Z = 1 + 0.08 * ease(k / P.title); foc = sp(fx, ff - 60) }
    else if (k < P.clock0) { Z = 1.12 + 0.18 * ease(seg(k, P.title, P.written)); foc = sp(fx, ff - 70) }
    else if (k < P.attack) { Z = 1.15 + 0.35 * ease(seg(k, P.clock0, P.attack)); foc = sp(tx, tcy) }
    else if (k < P.close) { Z = 1.5 - 0.4 * easeO(seg(k, P.attack, P.attack + 24)); foc = sp(tx, tcy) }
    else { Z = 1.1 - 0.1 * ease(seg(k, P.close, T)); foc = sp((fx + tx) / 2, ff - 60) }
    grade = k < P.attack ? `saturate(${1 - 0.75 * ease(k / 20)}) brightness(${1 - 0.3 * ease(k / 20)})` : `saturate(0.15) brightness(${0.55 + 0.2 * ease(seg(k, P.close, T))})`
  } else {
    const K = CF
    if (k < K.title) { Z = 1 + 0.06 * ease(k / K.title); foc = sp(fx, ff - 60) }
    else if (k < K.step) { Z = 1.08 + 0.16 * ease(seg(k, K.title, K.morph)); foc = sp(fx, ff - 90) }
    else if (k < K.reap) { Z = 1.25 + 0.25 * ease(seg(k, K.suck, K.reap)); foc = sp((fx + tx) / 2, tcy) }
    else { Z = 1.5 - 0.45 * easeO(seg(k, K.reap, K.reap + 20)); foc = sp((fx + tx) / 2, tcy) }
    grade = `saturate(${1 - 0.6 * ease(k / 16)}) sepia(${0.5 * ease(k / 16)}) hue-rotate(-30deg) brightness(${1 - 0.25 * ease(k / 16)})`
  }
  if (lastAge >= 0 && lastAge < 6) Z += 0.22 * lastPow * (1 - lastAge / 6)   // punch-zoom on contact
  if (view.last < 0) { view.z = Z; view.x = foc.x; view.y = foc.y } else { view.z += (Z - view.z) * 0.25; view.x += (foc.x - view.x) * 0.2; view.y += (foc.y - view.y) * 0.2 }
  view.last = real
  const P = pushIn(ctx, canvas, view.z, view.x, view.y, grade)
  const M = P.multiply(XF)                         // world → final screen
  const S = (x, y) => M.transformPoint({ x, y })
  // colour wash
  ctx.save()
  if (plan) vignette(ctx, W, H, 'rgba(10,20,40,0.15)', 'rgba(2,6,14,0.78)')
  else { ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(200,40,50,0.55)'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; vignette(ctx, W, H, 'rgba(40,0,10,0.1)', 'rgba(10,0,4,0.82)') }
  ctx.restore()
  // ── 2. world layer ──
  ctx.save(); mat(ctx, M)
  if (plan) worldPlan(ctx, sc, f, t, fx, ff, tx, tcy, k, real, d); else worldKira(ctx, sc, f, t, fx, ff, tx, tcy, k, real, d)
  ctx.restore()
  // ── 3. screen layer ──
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
  if (plan) screenPlan(ctx, W, H, u, sc, S, f, t, k, real); else screenKira(ctx, W, H, u, sc, S, f, t, k, real, canvas)
  const bar = letterbox(ctx, W, H, k, T, plan ? '#7fb2ff' : '#e0334a', u)
  if (plan) titleCut(ctx, W, H, k, CF.title, u, { band: 'rgba(6,10,20,0.92)', accent: '#7fb2ff', streak: 'rgba(200,220,255,0.45)', portrait: f.skinId && f.skinId !== 'default' ? `./light_portrait__${f.skinId}.png` : './light_portrait.png', title: 'AS PLANNED', sub: 'THE DEATH NOTE', stroke: '#0a1630' })
  else titleCut(ctx, W, H, k, CF.title, u, { band: 'rgba(24,2,8,0.93)', accent: '#ff3b4e', streak: 'rgba(255,170,180,0.4)', portrait: f.skinId && f.skinId !== 'default' ? `./light_portrait__${f.skinId}.png` : './light_portrait.png', title: 'I AM KIRA', sub: 'GOD OF THE NEW WORLD', stroke: '#3a0010' })
  drawPops(ctx, M, sc.pops, real, u, plan ? '#dfe9ff' : '#ffd0d6')
  if (k >= T - 50 && sc.dealt > 0) card(ctx, `${Math.round(sc.dealt)} DMG${sc.guarded ? ' (GUARDED)' : ''}`, W * 0.84, bar + 40 * u, 28 * u, '#ffffff', clamp((k - T + 50) / 8, 0, 1) * clamp((T - k) / 10, 0, 1), -0.04, '#000000')
  if (plan) subPlan(ctx, W, H, bar, u, k); else subKira(ctx, W, H, bar, u, k)
  ctx.restore()
  return true
}

// Ryuk hovering — floats, drifts, laughs (render-only bob)
function ryuk(c, x, feetY, d, k, s, o = {}) {
  const fi = o.fi != null ? o.fi : ((k >> 3) % RYUK.n)
  return blitSheet(c, RYUK.url, RYUK.n, RYUK.w, RYUK.h, fi, x, feetY + Math.sin(k / 11) * 6, d, s, o)
}
function lightBody(c, f, key, fi, x, feetY, d, o) { return blitAnim(c, f, key, fi, x, feetY, d, { ax: axOf(key), ...o }) }
const writeInset = i => (i >= 3 && i <= 6 ? 2 : 0)   // the writing strip's middle cells carry a 1px frame line
// body anchors (head column, fraction of the frame width) so the scythe / pen never drag the body sideways
const AX = { lightScythe: [0.46, 0.46, 0.43, 0.37, 0.36, 0.46, 0.54, 0.56, 0.52], lightUltWrite: [0.42, 0.43, 0.42, 0.37, 0.4, 0.37, 0.43, 0.4, 0.35, 0.42], lightCast: [0.41, 0.4, 0.5] }
const axOf = key => AX[key] ? (i => AX[key][i] ?? 0.45) : undefined

function worldPlan(c, sc, f, t, fx, ff, tx, tcy, k, real, d) {
  const P = LIGHT_CINE.plan
  // Ryuk: fades in over Light's shoulder, watches, laughs on the heart attack
  const ra = clamp((k - 10) / 20, 0, 1) * clamp((LIGHT_CINE.plan.total - k) / 16, 0, 1)
  if (ra > 0) ryuk(c, fx - d * 70, ff - 70, d, k, 2.3, { alpha: ra * 0.92, fi: k >= P.attack && k < P.attack + 50 ? 2 + ((k >> 2) & 1) : undefined })
  // Light: opens the notebook, writes, the pen stops; on the heart attack he lowers it, then the laugh
  let key = 'lightUltWrite', fi
  if (k < P.write0) fi = Math.min(2, (k / 10) | 0)
  else if (k < P.written) fi = 3 + (((k - P.write0) / 5) | 0) % 4
  else if (k < P.attack) fi = 7
  else if (k < P.close) fi = 8
  else { key = 'lightCast'; fi = k < P.close + 10 ? 0 : 1 }
  // the notebook's glow while the name goes down
  if (k >= P.write0 && k < P.written + 10) { const g = c.createRadialGradient(fx + d * 14, ff - 70, 2, fx + d * 14, ff - 70, 60); g.addColorStop(0, 'rgba(160,200,255,0.5)'); g.addColorStop(1, 'rgba(160,200,255,0)'); c.fillStyle = g; c.fillRect(fx - 80, ff - 140, 200, 140) }
  lightBody(c, f, key, fi, fx, ff, d, { inset: key === 'lightUltWrite' ? writeInset : 0 })
  // the laugh text beside him
  if (k >= P.close + 10) blitSheet(c, './light_cast_uniform.png', 3, 24, 82, 2, fx + d * 46, ff - 30, 1, 2.0, { alpha: clamp((k - P.close - 10) / 6, 0, 1) })
  // heartbeat pulses around the foe
  for (const b of P.beats) { const a = k - b; if (a >= 0 && a < 16) { c.save(); c.globalAlpha = 0.7 * (1 - a / 16); c.strokeStyle = '#ff3040'; c.lineWidth = 4; c.beginPath(); c.arc(tx, tcy, 20 + a * 6, 0, Math.PI * 2); c.stroke(); c.restore() } }
  // heart attack: shock rings + a red burst at the chest
  const a = k - P.attack
  if (a >= 0 && a < 40) {
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let r = 0; r < 3; r++) { const rr = (a - r * 4) * 14; if (rr <= 0) continue; c.globalAlpha = 0.8 * (1 - a / 40); c.strokeStyle = r ? '#ff2840' : '#ffffff'; c.lineWidth = 8 - r * 2; c.beginPath(); c.ellipse(tx, tcy, rr, rr * 0.7, 0, 0, Math.PI * 2); c.stroke() }
    const g = c.createRadialGradient(tx, tcy, 0, tx, tcy, 90); g.addColorStop(0, `rgba(255,60,70,${0.9 * (1 - a / 40)})`); g.addColorStop(1, 'rgba(255,0,20,0)'); c.fillStyle = g; c.fillRect(tx - 90, tcy - 90, 180, 180)
    c.restore()
  }
}

function worldKira(c, sc, f, t, fx, ff, tx, tcy, k, real, d) {
  const K = LIGHT_CINE.kira
  // GIANT Ryuk rising behind Light: dark, towering, then he looms over the reap
  const rise = easeO(seg(k, K.reveal - 4, K.reveal + 18)), ra = rise * clamp((K.total - k) / 18, 0, 1)
  if (ra > 0) {
    const rx = (k < K.step ? fx : (fx + tx) / 2) - d * 34, rf = ff + 70 - 70 * rise
    const g = ryuk(c, rx, rf, d, k, 4.0, { alpha: ra * 0.85, tint: '#12001c', tintA: 0.55 })
    // the eyes
    if (g) { const ey = g.top + g.height * 0.3 + Math.sin(k / 11) * 6
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = ra * (0.6 + 0.4 * Math.sin(k / 5))
      for (const ex of [-11, 11]) { const gr = c.createRadialGradient(rx + ex, ey, 0, rx + ex, ey, 24); gr.addColorStop(0, 'rgba(255,40,40,0.95)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); c.fillStyle = gr; c.fillRect(rx + ex - 24, ey - 24, 48, 48) }
      c.restore() }
  }
  // the Light pose: notebook raised → glowing → scythe → slashes → the reap → standing over the fallen
  let fi
  if (k < K.glow) fi = Math.min(1, (k / 30) | 0)
  else if (k < K.morph) fi = 2
  else if (k < K.step) fi = 3
  else if (k < K.slashes[0]) fi = 4
  else if (k < K.slashes[1]) fi = 5
  else if (k < K.reap - 4) fi = 4
  else if (k < K.reap + 8) fi = 6
  else if (k < K.reap + 30) fi = 7
  else fi = 8
  // the step out of the shadows: black feathers where he vanished and where he appears
  const st = k - K.step
  if (st >= -6 && st < 18) {
    for (let i = 0; i < 18; i++) { const h1 = hash(i, 31), h2 = hash(i, 47), age = st + 6
      for (const [ox, sgn] of [[sc.fx0 + (f.w || 48) / 2, -1], [fx, 1]]) { if (sgn < 0 && st > 10) continue; if (sgn > 0 && st < 0) continue
        c.save(); c.globalAlpha = 0.85 * (1 - age / 24); c.fillStyle = '#0a0008'; c.translate(ox + (h1 - 0.5) * 90 + (h2 - 0.5) * age * 4, ff - 20 - h2 * 110 - age * 2); c.rotate(h1 * 6)
        c.beginPath(); c.ellipse(0, 0, 9, 3, 0, 0, Math.PI * 2); c.fill(); c.restore() } }
  }
  const hidden = st >= -2 && st < 2
  if (!hidden) {
    const g = lightBody(c, f, 'lightScythe', fi, fx, ff, d, {})
    if (k >= K.glow && k < K.morph + 6 && g) { c.save(); c.globalCompositeOperation = 'lighter'; const gr = c.createRadialGradient(fx + d * 20, ff - 80, 0, fx + d * 20, ff - 80, 90); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.4, 'rgba(200,120,255,0.5)'); gr.addColorStop(1, 'rgba(120,0,200,0)'); c.fillStyle = gr; c.fillRect(fx - 100, ff - 180, 240, 200); c.restore() }
  }
  // reaping crescents across the foe
  const cres = (at, rot, R, w, col) => { const a = k - at; if (a < 0 || a > 18) return
    c.save(); c.translate(tx, tcy); c.rotate(rot); c.globalCompositeOperation = 'lighter'; const al = 1 - a / 18
    for (const [lw, aa, cc] of [[w * 2.6, 0.35, col], [w, 0.9, col], [w * 0.35, 1, '#ffffff']]) { c.globalAlpha = al * aa; c.strokeStyle = cc; c.lineWidth = lw; c.beginPath(); c.arc(0, 0, R + a * 2, -1.9, 1.1 * (0.4 + 0.6 * Math.min(1, a / 3))); c.stroke() }
    c.restore() }
  cres(K.slashes[0], d > 0 ? 0.3 : Math.PI - 0.3, 70, 8, '#b061e0')
  cres(K.slashes[1], d > 0 ? -2.4 : -0.7, 80, 10, '#d03050')
  cres(K.reap, d > 0 ? 0.9 : Math.PI - 0.9, 130, 16, '#9a40ff')
  // sparks at every contact
  if (sc.last && real - sc.last.real < 14) { const a = real - sc.last.real
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 22; i++) { const ang = hash(i, sc.last.k) * Math.PI * 2, r = (10 + 120 * hash(i + 5, sc.last.k)) * easeO(a / 14) * (sc.last.power || 1)
      c.globalAlpha = 1 - a / 14; c.fillStyle = i & 1 ? '#ffffff' : '#c070ff'; c.fillRect(tx + Math.cos(ang) * r - 2, tcy + Math.sin(ang) * r - 2, 4, 4) }
    c.restore() }
}

// ── LIGHT: screen layer ──
function page(c, x, y, w, h, rot, a, fn) { c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); fn(w, h); c.restore() }
function screenPlan(c, W, H, u, sc, S, f, t, k, real) {
  const P = LIGHT_CINE.plan
  // THE DEATH NOTE — open book close-up, the name written stroke by stroke
  const inA = easeO(seg(k, P.title - 4, P.write0 + 4)), outA = 1 - ease(seg(k, P.written + 10, P.clock0 + 4))
  const shut = k >= P.close ? 1 : 0
  if (inA * outA > 0.01) {
    const bw = W * 0.56, bh = H * 0.5, bx = W * 0.5 + (1 - inA) * W * 0.6, by = H * 0.52
    page(c, bx, by, bw, bh, -0.05 + 0.02 * Math.sin(real / 40), inA * outA, (w, h) => {
      c.fillStyle = '#050505'; c.fillRect(-w / 2 - 14 * u, -h / 2 - 12 * u, w + 28 * u, h + 24 * u)           // the black cover
      c.fillStyle = '#ece6d6'; c.fillRect(-w / 2, -h / 2, w / 2 - 4 * u, h); c.fillStyle = '#f4efe2'; c.fillRect(4 * u, -h / 2, w / 2 - 4 * u, h)
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-6 * u, -h / 2, 12 * u, h)                                     // the gutter
      c.strokeStyle = 'rgba(80,110,170,0.35)'; c.lineWidth = 1 * u
      for (let i = 1; i < 12; i++) { const ly = -h / 2 + i * h / 12; c.beginPath(); c.moveTo(-w / 2 + 12 * u, ly); c.lineTo(-10 * u, ly); c.moveTo(12 * u, ly); c.lineTo(w / 2 - 12 * u, ly); c.stroke() }
      // left page: names already written (faint), the rule
      c.fillStyle = 'rgba(20,20,20,0.35)'; c.font = `italic ${Math.round(15 * u)}px Georgia, serif`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'
      for (let i = 0; i < 9; i++) { const ln = 8 + ((hash(i, 77) * 9) | 0); let s = ''; for (let j = 0; j < ln; j++) s += 'abcdefghiklmnorstuy'[(hash(i * 31 + j, 5) * 19) | 0]; c.fillText(s[0].toUpperCase() + s.slice(1, 5) + ' ' + s.slice(5), -w / 2 + 20 * u, -h / 2 + (i + 1.75) * h / 12) }
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.font = `${Math.round(10 * u)}px Georgia, serif`
      c.fillText('HOW TO USE IT — The human whose name is written', 16 * u, -h / 2 + 0.75 * h / 12); c.fillText('in this note shall die.', 16 * u, -h / 2 + 1.25 * h / 12)
      // the NAME: revealed letter by letter, a red-black ink, a pen nib at the head of the stroke
      const name = sc.name.toUpperCase(), n = name.length, prog = seg(k, P.write0 + 6, P.written - 4) * n
      const fs = Math.min(58 * u, (w / 2 - 40 * u) / Math.max(4, n) * 1.7)
      c.font = `italic 700 ${Math.round(fs)}px Georgia, "Times New Roman", serif`; c.fillStyle = '#120808'
      const lx = 26 * u, ly = -h / 2 + 6.4 * h / 12
      const full = Math.floor(prog), partW = c.measureText(name.slice(0, full)).width
      c.fillText(name.slice(0, full), lx, ly)
      if (full < n) { const ch = name[full], cw = c.measureText(ch).width, fr = prog - full
        c.save(); c.beginPath(); c.rect(lx + partW, ly - fs, cw * fr, fs * 1.3); c.clip(); c.fillText(ch, lx + partW, ly); c.restore() }
      const penX = lx + partW + (full < n ? c.measureText(name[full]).width * (prog - full) : 0), penY = ly - fs * 0.15 + Math.sin(real * 1.7) * 3 * u
      if (k < P.written + 6) { c.save(); c.translate(penX, penY); c.rotate(-0.9); c.fillStyle = '#1a1a1a'; c.fillRect(0, -4 * u, 120 * u, 8 * u); c.fillStyle = '#c8b060'; c.fillRect(0, -4 * u, 16 * u, 8 * u)
        c.beginPath(); c.moveTo(0, -4 * u); c.lineTo(-14 * u, 0); c.lineTo(0, 4 * u); c.closePath(); c.fillStyle = '#d8d8d8'; c.fill(); c.restore() }
      // the seal: a heavy underline slashed under the finished name
      if (k >= P.written) { const a = seg(k, P.written, P.written + 5); c.fillStyle = '#7a0010'; c.fillRect(lx - 6 * u, ly + 10 * u, (partW + 12 * u) * a, 5 * u) }
      // cover lettering on the left edge
      c.save(); c.rotate(-Math.PI / 2); c.fillStyle = '#d8d8d8'; c.font = `700 ${Math.round(14 * u)}px "Old English Text MT", "UnifrakturMaguntia", Georgia, serif`; c.textAlign = 'center'; c.fillText('DEATH NOTE', 0, -w / 2 - 2 * u); c.restore()
    })
    if (k === P.written || (k > P.written && k < P.written + 3)) { c.globalAlpha = 0.5; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
  }
  // 40 SECONDS — the clock races down
  if (k >= P.written + 4 && k < P.attack + 30) {
    const a = seg(k, P.written + 4, P.clock0 + 2) * (1 - seg(k, P.attack + 18, P.attack + 30))
    const secs = k < P.clock0 ? 40 : Math.max(0, Math.ceil(40 * (1 - seg(k, P.clock0, P.attack))))
    const cx = W * 0.8, cy = H * 0.34, R = 70 * u
    c.save(); c.globalAlpha = a
    c.fillStyle = 'rgba(4,8,16,0.85)'; c.beginPath(); c.arc(cx, cy, R + 10 * u, 0, Math.PI * 2); c.fill()
    c.strokeStyle = secs <= 5 ? '#ff3346' : '#cfe0ff'; c.lineWidth = 4 * u; c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke()
    for (let i = 0; i < 40; i++) { const an = -Math.PI / 2 + i / 40 * Math.PI * 2, r0 = i % 5 ? R - 6 * u : R - 14 * u; c.lineWidth = i % 5 ? 1.5 * u : 3 * u; c.beginPath(); c.moveTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); c.lineTo(cx + Math.cos(an) * R, cy + Math.sin(an) * R); c.stroke() }
    const left = secs / 40
    c.fillStyle = 'rgba(255,40,60,0.28)'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R - 2 * u, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2); c.closePath(); c.fill()
    const hand = -Math.PI / 2 + left * Math.PI * 2; c.strokeStyle = '#ffffff'; c.lineWidth = 3 * u; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(hand) * (R - 10 * u), cy + Math.sin(hand) * (R - 10 * u)); c.stroke()
    c.restore()
    card(c, String(secs), cx, cy + 2 * u, (secs <= 5 ? 56 : 46) * u * (k >= P.clock0 && (k - P.clock0) % 6 < 2 ? 1.12 : 1), secs <= 5 ? '#ff3346' : '#ffffff', a, 0, '#000000')
    card(c, 'SECONDS', cx, cy + R + 26 * u, 18 * u, '#cfe0ff', a, 0, '#000000')
    // the ECG across the bottom third: beats on the heartbeats, a spike on the attack, then flat
    const ey = H * 0.7, ea = a * 0.9
    c.save(); c.globalAlpha = ea; c.strokeStyle = k >= P.attack ? '#ff3346' : '#46ff8a'; c.lineWidth = 3 * u; c.shadowColor = c.strokeStyle; c.shadowBlur = 10 * u
    c.beginPath()
    const span = Math.min(1, seg(k, P.written + 4, P.clock0 + 10)) * W
    for (let x = 0; x <= span; x += 4 * u) {
      const kk = k - (span - x) / (W / 90)   // the line scrolls: the right edge is "now"
      let y = 0
      for (const b of P.beats) { const dd = kk - b; if (dd > -2 && dd < 4) y = -Math.sin((dd + 2) / 6 * Math.PI * 2) * 50 * u }
      const da = kk - P.attack; if (da > -2 && da < 5) y = -Math.sin((da + 2) / 7 * Math.PI * 2) * 110 * u
      if (kk > P.attack + 5) y = 0
      if (x === 0) c.moveTo(x, ey + y); else c.lineTo(x, ey + y)
    }
    c.stroke(); c.restore()
  }
  // heartbeat red pulse on the frame edges
  for (const b of P.beats) { const a = real - (sc.last && sc.last.k === b ? sc.last.real : -99); if (a >= 0 && a < 14) vignette(c, W, H, 'rgba(255,0,0,0)', `rgba(170,0,20,${0.55 * (1 - a / 14)})`) }
  // the POTATO CHIP panel: Light's close-up, the chip, the bite
  if (k >= P.chip0 && k < P.chip1 + 8) {
    const a = seg(k, P.chip0, P.chip0 + 6) * (1 - seg(k, P.chip1, P.chip1 + 8))
    const pw = W * 0.3, ph = H * 0.34, px = W * 0.06, py = H * 0.2
    c.save(); c.globalAlpha = a; c.translate((1 - easeO(seg(k, P.chip0, P.chip0 + 8))) * -pw, 0)
    c.fillStyle = '#ffffff'; c.fillRect(px - 5 * u, py - 5 * u, pw + 10 * u, ph + 10 * u); c.fillStyle = '#0c0f18'; c.fillRect(px, py, pw, ph)
    c.save(); c.beginPath(); c.rect(px, py, pw, ph); c.clip()
    speedLines(c, pw * 2, ph * 2, px + pw * 0.55, py + ph * 0.4, 0.12, 9, 36, '#9fb8ff')
    const eat = k >= P.chipEat
    blitAnim(c, f, 'lightCast', eat ? 1 : 0, px + pw * 0.4, py + ph * 2.15, 1, { s: 4.2, ax: 0.41 })
    // the chip: pinched up to the face, then CRUNCH
    const cu = easeO(seg(k, P.chip0 + 4, P.chipEat - 2)), chx = px + pw * (0.86 - 0.18 * cu), chy = py + ph * (0.95 - 0.5 * cu)
    if (!eat) { c.save(); c.translate(chx, chy); c.rotate(0.4 + cu * 0.5); c.fillStyle = '#f2c94c'; c.strokeStyle = '#a07a18'; c.lineWidth = 2 * u
      c.beginPath(); for (let i = 0; i < 14; i++) { const an = i / 14 * Math.PI * 2, r = (24 + (i & 1 ? 4 : 0)) * u; c.lineTo(Math.cos(an) * r, Math.sin(an) * r * 0.72) } c.closePath(); c.fill(); c.stroke(); c.restore() }
    else { const e = k - P.chipEat; c.fillStyle = '#f2c94c'; for (let i = 0; i < 10; i++) { const an = hash(i, 8) * Math.PI * 2, r = e * (3 + 4 * hash(i, 9)) * u; c.fillRect(chx - 40 * u + Math.cos(an) * r, chy - 30 * u + Math.sin(an) * r + e * e * 0.1 * u, 6 * u, 5 * u) } }
    c.restore()
    c.restore()
    card(c, '…I\'LL TAKE A POTATO CHIP…', px + pw / 2, py + ph + 26 * u, 18 * u, '#ffffff', a * seg(k, P.chip0 + 4, P.chip0 + 8), -0.03, '#000000')
    if (k >= P.chipEat) { const e = k - P.chipEat; card(c, 'AND EAT IT!', px + pw * 0.62, py + ph * 0.86, 46 * u * (e < 4 ? 1.6 - e * 0.15 : 1), '#ffe066', a, -0.12, '#3a1a00'); card(c, 'CRUNCH', px + pw * 0.82, py + ph * 0.5, 24 * u, '#ffffff', a * (1 - seg(e, 6, 14)), 0.2, '#000000') }
  }
  // the heart attack: white → inverted → crimson, speed lines from the chest, HEART ATTACK slammed in
  const ha = sc.last?.tag === 'attack' ? real - sc.last.real : -1
  if (ha >= 0) {
    const tp = S((t.x || 0) + (t.w || 48) / 2, (t.y || 0) + (t.h || 94) * 0.4)
    if (ha < 30) speedLines(c, W, H, tp.x, tp.y, 0.5 * (1 - ha / 30), 3, 60)
    impactFrame(c, W, H, ha, 3, '#b0001a', 0.45)
    if (ha >= 2 && ha < 70) card(c, 'HEART ATTACK', W / 2, H * 0.25, 96 * u * (ha < 7 ? 1.9 - 0.9 * easeO((ha - 2) / 5) : 1), '#ffffff', clamp((70 - ha) / 10, 0, 1), -0.05, '#7a0010')
  }
  // the book SNAPS shut — the cover fills the frame for a beat
  if (shut) { const e = k - P.close
    if (e < 26) { const a = e < 3 ? e / 3 : 1 - seg(e, 14, 26), sx = W * (0.5 + 0.08 * (1 - easeO(e / 5)))
      c.save(); c.globalAlpha = a; c.translate(W / 2, H / 2); c.rotate(-0.04); c.fillStyle = '#060606'; c.fillRect(-W * 0.22, -H * 0.3, W * 0.44, H * 0.6); c.strokeStyle = '#2a2a2a'; c.lineWidth = 3 * u; c.strokeRect(-W * 0.22 + 8 * u, -H * 0.3 + 8 * u, W * 0.44 - 16 * u, H * 0.6 - 16 * u); c.restore()
      card(c, 'DEATH NOTE', sx, H * 0.5, 60 * u, '#e8e8e8', a, -0.04, '#000000', '700 %spx "Old English Text MT", "UnifrakturMaguntia", Georgia, serif') }
    if (e >= 18) card(c, 'JUST AS PLANNED.', W / 2, H * 0.3, 58 * u, '#dfe9ff', seg(e, 18, 24) * clamp((LIGHT_CINE.plan.total - k) / 10, 0, 1), -0.04, '#0a1630') }
}
function subPlan(c, W, H, bar, u, k) {
  const P = LIGHT_CINE.plan
  const line = (a, b, s) => { if (k >= a && k < b) subtitle(c, W, H, bar, s, seg(k, a, a + 6) * (1 - seg(k, b - 6, b)), u) }
  line(P.write0, P.written - 2, '“I will write your name.”')
  line(P.written + 6, P.chip0, '“Forty seconds. That is all you have left.”')
  line(P.attack + 26, P.close - 2, '“Ryuk… did you see that?”  — Ryuk: “Heh heh heh…”')
}

function screenKira(c, W, H, u, sc, S, f, t, k, real, canvas) {
  const K = LIGHT_CINE.kira
  // the storm of pages: torn Death Note pages whirling across the frame, names scrawled on them
  if (k >= K.reveal - 4) {
    const a = seg(k, K.reveal - 4, K.reveal + 10) * clamp((K.total - k) / 16, 0, 1), n = 26
    for (let i = 0; i < n; i++) {
      const h1 = hash(i, 11), h2 = hash(i, 13), h3 = hash(i, 17), sp = 3 + 6 * h2 + (k > K.reap ? 4 : 0)
      const x = ((h1 * W * 1.4 + (k - K.reveal) * sp * (i & 1 ? 1 : -0.7) * u) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * 0.2
      const y = ((h3 * H + Math.sin((k + i * 9) / 14) * 40 * u + (k - K.reveal) * (1 + 2 * h1) * u) % (H * 1.2)) - H * 0.1
      const s = (22 + 30 * h2) * u
      page(c, x, y, s, s * 1.3, (k + i * 20) / (20 + 30 * h1), a * (0.45 + 0.4 * h3), (w, h) => {
        c.fillStyle = '#efe8d8'; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = 'rgba(40,0,0,0.6)'; c.lineWidth = 1.5 * u
        for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(-w / 2 + 4 * u, -h / 2 + (j + 1) * h / 5); c.lineTo(-w / 2 + 4 * u + (w - 8 * u) * (0.5 + 0.5 * hash(i, j)), -h / 2 + (j + 1) * h / 5 + 1); c.stroke() }
      })
    }
  }
  // THAT'S RIGHT. I'M KIRA. — the manga panel slams in, huge, framed
  const pa = k - K.panel
  if (pa >= 0 && k < K.morph) {
    const im = image('./light_kira_panel.png')
    if (ready(im)) {
      const a = Math.min(1, pa / 3) * (1 - seg(k, K.morph - 10, K.morph)), z = pa < 6 ? 1.35 - 0.35 * easeO(pa / 6) : 1 + 0.03 * seg(k, K.panel + 6, K.morph)
      const pw = W * 0.62 * z, ph = pw * im.naturalHeight / im.naturalWidth, px = W / 2 - pw / 2, py = H * 0.2
      c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(0,0,0,0.7)'; c.fillRect(0, py - 14 * u, W, ph + 28 * u)
      c.fillStyle = '#ffffff'; c.fillRect(px - 6 * u, py - 6 * u, pw + 12 * u, ph + 12 * u); c.imageSmoothingEnabled = false; c.drawImage(im, px, py, pw, ph); c.restore()
    }
  }
  // the morph flash, the slashes' impact frames, the FINAL REAP: the frame splits along the cut
  if (k >= K.morph && k < K.morph + 4) { c.globalAlpha = 0.85 * (1 - (k - K.morph) / 4); c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
  const la = sc.last ? real - sc.last.real : -1
  if (sc.last?.tag === 'slash' && la >= 0) { const tp = S((t.x || 0) + (t.w || 48) / 2, (t.y || 0) + (t.h || 94) * 0.45); if (la < 10) speedLines(c, W, H, tp.x, tp.y, 0.35 * (1 - la / 10), sc.last.k, 40); impactFrame(c, W, H, la, 1, '#7a1aa0', 0.35) }
  if (k >= K.suck - 10 && k < K.reap) { const a = seg(k, K.suck - 10, K.reap); c.fillStyle = `rgba(0,0,0,${0.35 * a})`; c.fillRect(0, 0, W, H)
    const tp = S((t.x || 0) + (t.w || 48) / 2, (t.y || 0) + (t.h || 94) * 0.45); speedLines(c, W, H, tp.x, tp.y, 0.25 * a, k, 50, '#ff6070') }
  if (sc.last?.tag === 'reap' && la >= 0) {
    // the split: the frame above the diagonal slides one way, below the other
    if (la >= 1 && la < 40) {
      const s = scratchOf(canvas); s.g.setTransform(1, 0, 0, 1, 0, 0); s.g.clearRect(0, 0, W, H); s.g.drawImage(canvas, 0, 0)
      const off = 26 * u * (la < 22 ? easeO(la / 6) : 1 - seg(la, 22, 40)), x0 = 0, y0 = H * 0.72, x1 = W, y1 = H * 0.22
      c.fillStyle = '#000000'; c.fillRect(0, 0, W, H)
      for (const sgn of [-1, 1]) { c.save(); c.beginPath(); if (sgn < 0) { c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(x1, y1); c.lineTo(x0, y0) } else { c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(W, H); c.lineTo(0, H) } c.closePath(); c.clip()
        c.drawImage(s.cv, sgn * off, sgn * off * 0.45); c.restore() }
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffffff'; c.lineWidth = 6 * u * (1 - seg(la, 4, 40)); c.shadowColor = '#c060ff'; c.shadowBlur = 24 * u; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.restore()
    }
    impactFrame(c, W, H, la, 3, '#8a00c0', 0.45)
    if (la >= 3 && la < 56) card(c, 'DELETED.', W / 2, H * 0.25, 100 * u * (la < 8 ? 1.9 - 0.9 * easeO((la - 3) / 5) : 1), '#ffffff', clamp((56 - la) / 10, 0, 1), -0.06, '#5a0080')
  }
  if (k >= K.reap + 50) card(c, 'I AM THE GOD OF THE NEW WORLD', W / 2, H * 0.22, 40 * u, '#ffd0d6', seg(k, K.reap + 50, K.reap + 58) * clamp((K.total - k) / 10, 0, 1), -0.03, '#3a0010')
}
function subKira(c, W, H, bar, u, k) {
  const K = LIGHT_CINE.kira
  const line = (a, b, s) => { if (k >= a && k < b) subtitle(c, W, H, bar, s, seg(k, a, a + 6) * (1 - seg(k, b - 6, b)), u) }
  line(K.title, K.panel + 4, '“You wanted to know who Kira is?”')
  line(K.speech, K.morph, '“I am justice. I protect the innocent — and those who fear me.”')
  line(K.step, K.suck, '“Everyone who opposes me… is evil.”')
}

registerCineScreen('light_ult', draw)
