// gokuUltFx.js — RENDER half of gokuUlt.js (Goku's seven per-form cinematic ultimates). Reads gokuUltScene(); never
// writes sim state. One screen-space pass (cineRegistry.registerCineScreen — after the world, before the HUD):
//   1. the finished world frame RE-DRAWN scaled about the subject (a real push-in / punch-zoom past camera.js's cap) and
//      colour-graded per form (the sky darkens for the Spirit Bomb, silver stillness for Ultra Instinct …);
//   2. a WORLD layer drawn with the camera matrix × the push-in: Goku from his own form sheets (his engine sprite is hidden
//      by _fxAlpha 0), the foe from its own hurt / knockdown strips, auras, the Kamehameha, the Spirit Bomb, the golden
//      dragon, afterimages, craters, debris, explosions;
//   3. the SCREEN layer: the KA·ME·HA·ME·HA chant, the silver eye, impact frames (white → inverted), speed lines,
//      call-outs, captions, damage, letterbox + title cut-in. Returns true while active (hides the HUD).
// Render-only noise = integer hash of the scene's frame counters. Self-contained (no other character's files).
import { registerCineScreen } from './cineRegistry.js'
import { camera } from './camera.js'
import { gokuUltScene, GOKU_CINE, GOKU_ULT_VOICE } from './gokuUlt.js'

// ── kit ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const imgs = new Map(), boxes = new Map()
const image = src => { let im = imgs.get(src); if (!im) { im = new Image(); im.src = src; imgs.set(src, im) } return im }
const ready = im => !!(im && im.complete && im.naturalWidth > 0)
const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
const easeO = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) * (1 - u) }
const seg = (k, a, b) => clamp((k - a) / Math.max(1, b - a), 0, 1)
const TAU = Math.PI * 2
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
// one frame of a horizontal strip: content centred on x, content bottom on feetY; o.rot spins about the body's middle
function blitSheet(c, A, fi, x, feetY, dir, scale, o = {}) {
  const im = image(A.sheet); if (!ready(im)) return null
  const n = Math.max(1, A.frames | 0), i = clamp(fi | 0, 0, n - 1), w = A.width, h = A.height
  const sx = (A.sourceX || 0) + i * w, sy = 0
  const bx = frameBox(im, sx, sy, w, h, A.sheet + '#' + sx + ',' + w + ',' + h)
  const ax = (bx.l + bx.r) / 2, hh = (bx.b - bx.t) * scale
  let src = im, ssx = sx, ssy = sy
  if (o.tint) {
    const t = tintCanvas(w, h); t.g.clearRect(0, 0, t.cv.width, t.cv.height); t.g.globalCompositeOperation = 'source-over'; t.g.globalAlpha = 1
    t.g.drawImage(im, sx, sy, w, h, 0, 0, w, h); t.g.globalCompositeOperation = 'source-atop'; t.g.globalAlpha = o.tintA ?? 0.7
    t.g.fillStyle = o.tint; t.g.fillRect(0, 0, w, h); t.g.globalCompositeOperation = 'source-over'; src = t.cv; ssx = 0; ssy = 0
  }
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= (o.alpha ?? 1)
  if (o.comp) c.globalCompositeOperation = o.comp
  c.translate(Math.round(x), Math.round(feetY - hh / 2)); if (o.rot) c.rotate(o.rot); if (dir < 0) c.scale(-1, 1)
  c.drawImage(src, ssx, ssy, w, h, -ax * scale, -bx.b * scale + hh / 2, w * scale, h * scale)
  c.restore()
  return { top: feetY - hh, height: hh, front: x + dir * (bx.r - ax) * scale }
}
const animOf = (o, anim, key) => (anim && anim[key]) || (o?._skinAnim && o._skinAnim[key]) || o?.animationData?.[key]
function blitAnim(c, o, anim, key, fi, x, feetY, dir, opt = {}) {
  const A = animOf(o, anim, key); if (!A?.sheet) return null
  const n = Math.max(1, A.frames || 1), i = opt.loop ? ((fi % n) + n) % n : clamp(fi | 0, 0, n - 1)
  return blitSheet(c, A, i, x, feetY, dir, (o.spriteScale ?? 1.9) * GLOBAL * (opt.s || 1), opt)
}
function worldXf(canvas) {
  const cw = canvas.width, ch = canvas.height
  return new DOMMatrix().translate(cw * 0.5, ch * 0.5).scale(camera.zoom || 1).translate(-(camera.x || 0) - (camera.leadX || 0) + (camera.shakeX || 0), -(camera.y || 0) + (camera.shakeY || 0))
}
let _scr = null
function scratchOf(canvas) {
  if (!_scr) { const cv = document.createElement('canvas'); _scr = { cv, g: cv.getContext('2d') } }
  if (_scr.cv.width !== canvas.width || _scr.cv.height !== canvas.height) { _scr.cv.width = canvas.width; _scr.cv.height = canvas.height }
  return _scr
}
function pushIn(c, canvas, Z, fx, fy, filter) {
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
function card(c, text, x, y, size, fill, alpha = 1, rot = 0, stroke = '#000000', font = '900 %spx "Arial Black", Arial, sans-serif') {
  if (alpha <= 0.01 || !text) return
  c.save(); c.globalAlpha = clamp(alpha, 0, 1); c.translate(x, y); c.rotate(rot)
  c.font = font.replace('%s', Math.max(6, Math.round(size))); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'
  c.lineWidth = Math.max(2, size * 0.16); c.strokeStyle = stroke; c.strokeText(text, 0, 0)
  c.fillStyle = fill; c.fillText(text, 0, 0); c.restore()
}
function letterbox(c, W, H, k, total, col, u) {
  const inU = easeO(k / 10), outU = easeO((total - k) / 14), bar = H * 0.115 * Math.min(inU, outU)
  c.fillStyle = '#000000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar)
  c.globalAlpha = Math.min(inU, outU); c.fillStyle = col; c.fillRect(0, bar - 2 * u, W, 2 * u); c.fillRect(0, H - bar, W, 2 * u); c.globalAlpha = 1
  return bar
}
function impactFrame(c, W, H, age, inv, tint, tintA) {
  if (age < 0) return
  if (age === 0) { c.globalAlpha = 0.95; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H) }
  else if (age <= inv) { c.globalCompositeOperation = 'difference'; c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over' }
  else if (age < inv + 14) { c.globalAlpha = tintA * (1 - (age - inv) / 14); c.fillStyle = tint; c.fillRect(0, 0, W, H) }
  c.globalAlpha = 1
}
function speedLines(c, W, H, x, y, a, seed, n = 48, col = '#ffffff') {
  if (a <= 0.01) return
  c.save(); c.globalAlpha = a; c.fillStyle = col
  const R = Math.hypot(W, H)
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + hash(i, seed) * 0.12, r0 = R * (0.22 + 0.2 * hash(i + 9, seed)), wdt = 0.006 + 0.012 * hash(i + 3, seed)
    c.beginPath(); c.moveTo(x + Math.cos(ang - wdt) * R, y + Math.sin(ang - wdt) * R); c.lineTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0)
    c.lineTo(x + Math.cos(ang + wdt) * R, y + Math.sin(ang + wdt) * R); c.closePath(); c.fill()
  }
  c.restore()
}
function vignette(c, W, H, col0, col1) {
  const g = c.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.95)
  g.addColorStop(0, col0); g.addColorStop(1, col1); c.fillStyle = g; c.fillRect(0, 0, W, H)
}
function titleCut(c, W, H, k, end, u, o) {
  if (k >= end) return
  const a = k < 4 ? k / 4 : k > end - 6 ? (end - k) / 6 : 1, slide = easeO(k / 7), y0 = H * 0.16, bh = 150 * u
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.translate((1 - slide) * -W, 0)
  c.beginPath(); c.moveTo(0, y0 + 26 * u); c.lineTo(W, y0 - 26 * u); c.lineTo(W, y0 - 26 * u + bh); c.lineTo(0, y0 + 26 * u + bh); c.closePath(); c.fillStyle = o.band; c.fill()
  c.fillStyle = o.accent; c.fillRect(0, y0 + 2 * u, W, 4 * u); c.fillRect(0, y0 + bh - 6 * u, W, 4 * u)
  for (let i = 0; i < 9; i++) { const sx = ((k * (22 + i * 5) + i * 160) % (W + 300)) - 150, sy = y0 + 20 * u + hash(i, 4) * (bh - 40 * u); c.fillStyle = o.streak; c.fillRect(sx, sy, 80 + 120 * hash(i + 3, 4), 2 * u) }
  const por = o.portrait ? image(o.portrait) : null
  if (ready(por)) { const ph = bh * 1.1, pw = ph * por.naturalWidth / por.naturalHeight; c.save(); c.beginPath(); c.rect(0, y0 - 30 * u, W, bh + 60 * u); c.clip(); c.imageSmoothingEnabled = false; c.drawImage(por, W * 0.07, y0 + bh / 2 - ph / 2, pw, ph); c.restore() }
  const slam = k < 6 ? 0 : k < 12 ? 1.9 - 0.9 * easeO((k - 6) / 6) : 1
  const ts = Math.min(70, 1100 / Math.max(8, o.title.length)) * u
  if (slam > 0) card(c, o.title, W * 0.6, y0 + bh * 0.42, ts * slam, '#ffffff', 1, -0.04, o.stroke)
  if (k >= 12) card(c, o.sub, W * 0.62, y0 + bh * 0.8, 24 * u, o.accent, clamp((k - 12) / 5, 0, 1), -0.04, '#000000')
  c.restore()
}
function subtitle(c, W, H, bar, text, a, u) {
  if (a <= 0.01) return
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.font = `italic 600 ${Math.round(22 * u)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.lineWidth = 5 * u; c.strokeStyle = '#000000'; c.strokeText(text, W / 2, H - bar - 26 * u); c.fillStyle = '#f2f2f2'; c.fillText(text, W / 2, H - bar - 26 * u); c.restore()
}
function drawPops(c, M, pops, real, u, col) {
  for (const p of pops) {
    const age = real - p.real; if (age < 0 || age > 50 || !p.amt) continue
    const q = M.transformPoint({ x: p.x, y: p.y })
    const s = (26 + 22 * (p.power || 0.5)) * u * (age < 4 ? 1.5 - age * 0.12 : 1)
    card(c, String(p.amt), q.x + (hash(p.real, 2) - 0.5) * 40 * u, q.y - 30 * u - age * 1.2 * u, s, col, clamp((50 - age) / 12, 0, 1), -0.05, '#000000')
  }
}
const mat = (c, M) => c.setTransform(M.a, M.b, M.c, M.d, M.e, M.f)
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})` }
function glowBall(c, x, y, r, col, core = 'rgba(255,255,255,0.95)', a = 1) {
  if (r <= 0.5) return
  const g = c.createRadialGradient(x, y, 0, x, y, r * 2.2)
  g.addColorStop(0, core); g.addColorStop(0.32, rgba(col, 0.9 * a)); g.addColorStop(0.55, rgba(col, 0.35 * a)); g.addColorStop(1, rgba(col, 0))
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 2.2, 0, TAU); c.fill()
}
function bolt(c, x0, y0, x1, y1, seed, col, w) {
  c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0)
  for (let i = 1; i <= 6; i++) { const u = i / 6; c.lineTo(x0 + (x1 - x0) * u + (i < 6 ? (hash(i, seed) - 0.5) * 26 : 0), y0 + (y1 - y0) * u + (i < 6 ? (hash(i + 7, seed) - 0.5) * 26 : 0)) }
  c.stroke()
}

// ── Goku's look per form ─────────────────────────────────────────────────────────────────────────────────────────
const PAL = {
  base: { ki: '#8ad0ff', hot: '#e8f8ff', accent: '#7fd0ff', band: 'rgba(4,12,30,0.93)', stroke: '#06224a', title: 'SPIRIT BOMB', sub: 'GENKIDAMA', jp: '元気玉' },
  ssj: { ki: '#ffd23a', hot: '#fff6c0', accent: '#ffd23a', band: 'rgba(30,20,0,0.93)', stroke: '#4a3000', title: 'SUPER KAMEHAMEHA', sub: 'SUPER SAIYAN', jp: '超かめはめ波' },
  ssj2: { ki: '#ffe060', hot: '#fffad0', accent: '#ffe060', band: 'rgba(30,20,0,0.93)', stroke: '#4a3000', title: 'METEOR SMASH', sub: 'SUPER SAIYAN 2', jp: 'メテオスマッシュ', arcs: '#8ad8ff' },
  ssj3: { ki: '#ffc02a', hot: '#fff0a0', accent: '#ffc02a', band: 'rgba(34,18,0,0.94)', stroke: '#4a2a00', title: 'DRAGON FIST', sub: 'SUPER SAIYAN 3', jp: '龍拳', arcs: '#bfe8ff' },
  god: { ki: '#ff5a3a', hot: '#ffd8c0', accent: '#ff6a4a', band: 'rgba(34,4,4,0.93)', stroke: '#4a0800', title: 'GOD KAMEHAMEHA', sub: 'SUPER SAIYAN GOD', jp: '神かめはめ波' },
  blue: { ki: '#3ac8ff', hot: '#e0f8ff', accent: '#3ac8ff', band: 'rgba(2,14,34,0.93)', stroke: '#002a4a', title: 'KAMEHAMEHA ×10', sub: 'SUPER SAIYAN BLUE · KAIOKEN', jp: '界王拳 かめはめ波', kaio: '#ff2a3a' },
  ui: { ki: '#c8d0ff', hot: '#ffffff', accent: '#d8deff', band: 'rgba(8,8,20,0.94)', stroke: '#20244a', title: 'AUTONOMOUS ASSAULT', sub: 'ULTRA INSTINCT', jp: '身勝手の極意' },
}
const portraitOf = form => form === 'base' ? './goku_portrait.png' : `./goku_${form}_portrait.png`
if (typeof Image !== 'undefined') for (const f of Object.keys(PAL)) image(portraitOf(f))

const view = { z: 1, x: 0, y: 0, last: -1 }

function draw(ctx, canvas) {
  const sc = gokuUltScene()
  if (!sc) { view.last = -1; return false }
  const W = canvas.width, H = canvas.height, u = H / 720
  const k = sc.k, real = sc.real, kind = sc.kind, C = GOKU_CINE[kind], T = C.total, P = PAL[sc.form]
  const XF = worldXf(canvas), sp = (x, y) => XF.transformPoint({ x, y })
  const g = sc.g, tp = sc.tp, f = sc.caster, t = sc.target
  const th = (t.h || 94), tcy = tp.feet - th * 0.5
  const lastAge = sc.last ? real - sc.last.real : 99, lastPow = sc.last?.power || 0
  // ── 1. push-in ──
  let Z = 1, foc = sp((g.x + tp.x) / 2, sc.floor - 70), grade = null
  const Zf = FOCUS[kind](sc, k, C, sp)
  Z = Zf.z; foc = Zf.at; grade = Zf.grade
  if (lastAge >= 0 && lastAge < 6) Z += 0.2 * lastPow * (1 - lastAge / 6)
  if (view.last < 0) { view.z = Z; view.x = foc.x; view.y = foc.y } else { view.z += (Z - view.z) * 0.22; view.x += (foc.x - view.x) * 0.2; view.y += (foc.y - view.y) * 0.2 }
  view.last = real
  const PM = pushIn(ctx, canvas, view.z, view.x, view.y, grade)
  const M = PM.multiply(XF), S = (x, y) => M.transformPoint({ x, y })
  ctx.save(); WASH[kind](ctx, W, H, sc, k, C, P); ctx.restore()
  // ── 2. world ──
  ctx.save(); mat(ctx, M)
  WORLD[kind](ctx, sc, k, real, C, P, f, t, g, tp, tcy)
  ctx.restore()
  // ── 3. screen ──
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
  SCREEN[kind](ctx, W, H, u, sc, k, real, C, P, S, tcy)
  // impact frames on the contacts
  if (sc.last && lastAge >= 0) { const big = sc.last.power >= 1.4, q = S(tp.x, tcy)
    if (sc.last.power >= 0.7 && lastAge < 12) speedLines(ctx, W, H, q.x, q.y, (big ? 0.55 : 0.3) * (1 - lastAge / 12), sc.last.k, big ? 64 : 40, big ? P.hot : '#ffffff')
    if (big) impactFrame(ctx, W, H, lastAge, 3, P.ki, 0.45); else if (sc.last.power >= 0.7) impactFrame(ctx, W, H, lastAge, 1, P.ki, 0.25) }
  const bar = letterbox(ctx, W, H, k, T, P.accent, u)
  titleCut(ctx, W, H, k, C.title, u, { band: P.band, accent: P.accent, streak: rgba(P.hot, 0.45), portrait: portraitOf(sc.form), title: P.title, sub: P.sub, stroke: P.stroke })
  drawPops(ctx, M, sc.pops, real, u, P.hot)
  if (k >= T - 50 && sc.dealt > 0) card(ctx, `${Math.round(sc.dealt)} DMG${sc.guarded ? ' (GUARDED)' : ''}`, W * 0.84, bar + 40 * u, 28 * u, '#ffffff', clamp((k - T + 50) / 8, 0, 1) * clamp((T - k) / 10, 0, 1), -0.04, '#000000')
  const line = (a, b, s) => { if (k >= a && k < b) subtitle(ctx, W, H, bar, s, seg(k, a, a + 6) * (1 - seg(k, b - 6, b)), u) }
  const subs = SUBS[kind](sc.form, C)
  line(4, Math.min(C.title + 26, subs.length ? subs[0][0] : 999), '“' + GOKU_ULT_VOICE[sc.form][1] + '”')
  for (const [a, b, s] of subs) line(a, b, s)
  ctx.restore()
  return true
}

// ── shared world pieces ──
function gokuBody(c, sc, g, o = {}) {
  if (g.hide) return null
  return blitAnim(c, sc.caster, sc.anim, g.key, g.fi, g.x, g.feet, sc.d, { rot: g.rot, ...o })
}
function foeBody(c, sc, tp, real) {
  if (!sc.drawFoe) return
  const t = sc.target, dir = -sc.d
  let key = tp.pose === 'down' ? 'knockdown' : tp.pose, rot = tp.rot
  if (!animOf(t, null, key)?.sheet) { if (key === 'knockdown') { key = 'hurt'; rot = -dir * Math.PI / 2 } else key = 'hurt' }
  const A = animOf(t, null, key), fi = key === 'idle' ? ((real >> 3) % Math.max(1, A?.frames || 1)) : key === 'knockdown' ? Math.max(0, (A?.frames || 1) - 1) : 0
  const flash = (t.colorFlash || 0) > 0 && ((real >> 1) & 1)
  blitAnim(c, t, null, key, fi, tp.x, tp.feet, dir, { rot, tint: flash ? '#ffffff' : null, tintA: 0.6 })
}
// ki aura: flame tongues around the body + an inner glow, optional lightning (SSJ2/3)
function aura(c, x, feetY, h, col, hot, k, a, o = {}) {
  if (a <= 0.01) return
  c.save(); c.globalCompositeOperation = 'lighter'
  const cy = feetY - h * 0.5, gr = c.createRadialGradient(x, cy, 4, x, cy, h * 0.85)
  gr.addColorStop(0, rgba(hot, 0.22 * a)); gr.addColorStop(0.5, rgba(col, 0.2 * a)); gr.addColorStop(1, rgba(col, 0)); c.fillStyle = gr; c.fillRect(x - h, cy - h, h * 2, h * 2)
  const n = 16
  for (let i = 0; i < n; i++) {
    const s = (i / (n - 1) - 0.5) * 2, bx = x + s * h * 0.36, by = feetY - (1 - s * s) * h * 0.1
    const fl = hash(i, k >> 1), len = h * (0.45 + 0.4 * (1 - s * s)) * (0.8 + 0.4 * fl) * (o.size || 1)
    const sw = Math.sin(k * 0.35 + i * 1.7) * 10
    c.globalAlpha = a * (0.22 + 0.18 * fl); c.fillStyle = i % 4 ? col : hot
    c.beginPath(); c.moveTo(bx - 10, by); c.quadraticCurveTo(bx - 6 + sw * 0.4, by - len * 0.6, bx + s * 16 + sw, by - len); c.quadraticCurveTo(bx + 6 + sw * 0.4, by - len * 0.6, bx + 10, by); c.closePath(); c.fill()
  }
  if (o.arcs) { c.globalAlpha = a * 0.9; c.lineCap = 'round'
    for (let j = 0; j < 3; j++) { if (hash(j, k >> 1) < 0.45) continue; const a0 = hash(j + 3, k) * TAU, r = h * 0.4
      bolt(c, x + Math.cos(a0) * r * 0.4, cy + Math.sin(a0) * r, x + Math.cos(a0 + 1.4) * r, cy + Math.sin(a0 + 1.4) * r * 1.2, k * 7 + j, o.arcs, 2.5) } }
  c.restore()
}
function crater(c, x, y, w, a, col, k) {
  if (a <= 0.01) return
  c.save(); c.globalAlpha = a
  c.fillStyle = 'rgba(20,12,8,0.85)'; c.beginPath(); c.ellipse(x, y + 4, w, w * 0.18, 0, 0, TAU); c.fill()
  c.fillStyle = 'rgba(0,0,0,0.6)'; c.beginPath(); c.ellipse(x, y + 6, w * 0.7, w * 0.11, 0, 0, TAU); c.fill()
  c.strokeStyle = 'rgba(30,20,12,0.9)'; c.lineWidth = 3
  for (let i = 0; i < 9; i++) { const s = i < 5 ? -1 : 1, L = w * (1.1 + 0.6 * hash(i, 41)); c.beginPath(); c.moveTo(x + s * w * 0.8, y + 4); c.lineTo(x + s * (w * 0.8 + L * 0.5), y + 4 + (hash(i, 43) - 0.5) * 10); c.lineTo(x + s * (w * 0.8 + L), y + 4 + (hash(i, 47) - 0.5) * 14); c.stroke() }
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * 0.6 * (0.6 + 0.4 * Math.sin(k / 6)); c.strokeStyle = col; c.lineWidth = 3
  c.beginPath(); c.ellipse(x, y + 4, w, w * 0.18, 0, Math.PI * 1.02, Math.PI * 1.98); c.stroke()
  c.restore()
}
function smoke(c, x, y, age, R, n = 14, col = '90,80,70') {
  if (age < 0 || age > 90) return
  c.save()
  for (let i = 0; i < n; i++) { const an = Math.PI * (1 + hash(i, 5)), r = R * (0.3 + 0.9 * hash(i, 6)) * easeO(age / 40), px = x + Math.cos(an) * r, py = y + Math.sin(an) * r * 0.6 - age * 0.4 * hash(i, 7)
    c.globalAlpha = 0.5 * (1 - age / 90); c.fillStyle = `rgba(${col},1)`; c.beginPath(); c.arc(px, py, 14 + 26 * hash(i, 8) + age * 0.3, 0, TAU); c.fill() }
  c.restore()
}
function debris(c, x, y, k, k0, a, n = 16, spread = 160) {
  if (a <= 0.01) return
  c.save(); c.fillStyle = '#5a4634'; c.strokeStyle = '#2a1e14'; c.lineWidth = 1.5
  for (let i = 0; i < n; i++) { const t = (k - k0) * (0.5 + hash(i, 3)) * 1.3, px = x + (hash(i, 1) - 0.5) * spread * 2 + Math.sin(t / 10 + i) * 4, py = y - (t % 160), s = 3 + 7 * hash(i, 2)
    c.globalAlpha = a * clamp(1 - (t % 160) / 160, 0, 1); c.save(); c.translate(px, py); c.rotate(t * 0.05 * (hash(i, 4) - 0.5)); c.beginPath(); c.moveTo(-s, -s * 0.4); c.lineTo(-s * 0.2, -s); c.lineTo(s, -s * 0.3); c.lineTo(s * 0.6, s * 0.7); c.lineTo(-s * 0.7, s * 0.6); c.closePath(); c.fill(); c.stroke(); c.restore() }
  c.restore()
}
function explosion(c, x, y, age, R, col, hot) {
  if (age < 0 || age > 60) return
  c.save(); c.globalCompositeOperation = 'lighter'
  const e = easeO(age / 18), fade = 1 - seg(age, 14, 60)
  const g = c.createRadialGradient(x, y, 0, x, y, R * e + 1); g.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`); g.addColorStop(0.35, rgba(hot, 0.85 * fade)); g.addColorStop(0.7, rgba(col, 0.55 * fade)); g.addColorStop(1, rgba(col, 0))
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R * e + 1, 0, TAU); c.fill()
  for (let r = 0; r < 3; r++) { const rr = (age - r * 5) * R / 16; if (rr <= 0) continue; c.globalAlpha = 0.8 * fade * (1 - r * 0.25); c.strokeStyle = r ? col : '#ffffff'; c.lineWidth = 10 - r * 3; c.beginPath(); c.ellipse(x, y, rr, rr * 0.55, 0, 0, TAU); c.stroke() }
  c.globalAlpha = 0.7 * fade; c.fillStyle = hot
  for (let i = 0; i < 18; i++) { const an = hash(i, 91) * TAU, L = R * (0.8 + 1.1 * hash(i, 92)) * e; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(an - 0.03) * L, y + Math.sin(an - 0.03) * L); c.lineTo(x + Math.cos(an + 0.03) * L, y + Math.sin(an + 0.03) * L); c.closePath(); c.fill() }
  c.restore()
}
// the beam: outer glow, wobbling body, spiral bands rushing forward, a white core, a bulb at the head
function beam(c, x0, x1, y, th, col, hot, k, a, d) {
  if (a <= 0.01 || Math.abs(x1 - x0) < 2) return
  c.save(); c.globalCompositeOperation = 'lighter'
  const L = Math.abs(x1 - x0), sx = Math.min(x0, x1)
  for (const [m, al, cc] of [[2.4, 0.22, col], [1.5, 0.45, col], [1.0, 0.8, hot], [0.45, 1, '#ffffff']]) {
    c.globalAlpha = a * al; c.fillStyle = cc; c.beginPath()
    const steps = Math.max(4, Math.ceil(L / 24))
    for (let i = 0; i <= steps; i++) { const x = sx + L * i / steps, w = th * m * (0.5 + 0.5 * Math.min(1, Math.abs(x - x0) / 60)) * (1 + 0.08 * Math.sin(k * 0.9 + i * 1.3)); c.lineTo(x, y - w / 2) }
    for (let i = steps; i >= 0; i--) { const x = sx + L * i / steps, w = th * m * (0.5 + 0.5 * Math.min(1, Math.abs(x - x0) / 60)) * (1 + 0.08 * Math.sin(k * 0.9 + i * 1.3 + 2)); c.lineTo(x, y + w / 2) }
    c.closePath(); c.fill()
  }
  c.globalAlpha = a * 0.55; c.strokeStyle = hot; c.lineWidth = 3
  for (let i = 0; i < L / 46; i++) { const x = x0 + d * ((i * 46 + k * 14) % L); c.beginPath(); c.ellipse(x, y, 8, th * 0.95, 0, 0, TAU); c.stroke() }
  glowBall(c, x0, y, th * 0.75, col, 'rgba(255,255,255,1)', a)
  glowBall(c, x1, y, th * 0.95, col, 'rgba(255,255,255,1)', a)
  c.restore()
}

// ── per-kind camera / grade ─────────────────────────────────────────────────────────────────────────────────────
const FOCUS = {
  kame(sc, k, C, sp) {
    const g = sc.g, tp = sc.tp, hand = sp(g.x + sc.d * 30, sc.floor - 70)
    if (k < C.title) return { z: 1 + 0.08 * ease(k / C.title), at: sp(g.x, sc.floor - 70), grade: null }
    if (k < C.fire) return { z: 1.2 + 0.9 * ease(seg(k, C.title, C.suck + 8)), at: hand, grade: `saturate(${1 - 0.5 * seg(k, C.title, C.fire)}) brightness(${1 - 0.35 * seg(k, C.title, C.fire)})` }
    if (k < C.blast) return { z: 1.05 + 0.25 * ease(seg(k, C.contact, C.blast)), at: sp(lerp(g.x, tp.x, 0.5 + 0.4 * seg(k, C.contact, C.blast)), sc.floor - 70), grade: 'saturate(0.6) brightness(0.75)' }
    return { z: 1.3 - 0.25 * easeO(seg(k, C.blast, C.blast + 40)), at: sp(tp.x, sc.floor - 60), grade: `saturate(${0.5 + 0.5 * seg(k, C.blast + 40, C.total)}) brightness(${0.7 + 0.3 * seg(k, C.blast + 30, C.total)})` }
  },
  bomb(sc, k, C, sp) {
    const g = sc.g, tp = sc.tp, dark = seg(k, C.gather0, C.throw - 30) * (1 - seg(k, C.blast + 20, C.total))
    const gr = `saturate(${1 - 0.55 * dark}) brightness(${1 - 0.5 * dark})`
    if (k < C.gather0) return { z: 1.25 - 0.1 * ease(k / C.gather0), at: sp(g.x, sc.floor - 90), grade: gr }
    if (k < C.throw) return { z: 1.15 - 0.15 * ease(seg(k, C.gather0, C.throw)), at: sp(g.x + sc.d * 40, sc.floor - 150 - 90 * seg(k, C.gather0, C.throw)), grade: gr }
    if (k < C.blast) return { z: 1.0 + 0.2 * ease(seg(k, C.contact, C.blast)), at: sp(lerp(g.x, tp.x, 0.6 + 0.4 * seg(k, C.throw, C.contact)), sc.floor - 110), grade: gr }
    return { z: 1.2 - 0.15 * easeO(seg(k, C.blast, C.blast + 40)), at: sp(tp.x, sc.floor - 80), grade: gr }
  },
  meteor(sc, k, C, sp) {
    const g = sc.g, tp = sc.tp
    if (k < C.dash) return { z: 1.1 + 0.15 * ease(k / C.dash), at: sp(g.x, sc.floor - 70), grade: null }
    if (k < C.kick) return { z: 1.45, at: sp((g.x + tp.x) / 2, sc.floor - 70), grade: 'saturate(1.15)' }
    if (k < C.slam) return { z: 1.0 + 0.25 * seg(k, C.hammer - 6, C.hammer), at: sp(tp.x, lerp(sc.floor - 70, tp.feet - 40, 0.7)), grade: 'saturate(1.1)' }
    return { z: 1.35 - 0.25 * easeO(seg(k, C.slam, C.slam + 40)), at: sp(tp.x, sc.floor - 60), grade: null }
  },
  dragon(sc, k, C, sp) {
    const g = sc.g, tp = sc.tp, gr = `sepia(${0.35 * seg(k, 0, 30) * (1 - seg(k, C.land, C.total))}) brightness(${1 - 0.3 * seg(k, 0, 30) * (1 - seg(k, C.land, C.total))})`
    if (k < C.launch) return { z: 1.1 + 0.7 * ease(seg(k, 0, C.launch)), at: sp(g.x, sc.floor - 75), grade: gr }
    if (k < C.rise0) return { z: 1.5, at: sp((g.x + tp.x) / 2, sc.floor - 70), grade: gr }
    if (k < C.burst) return { z: 1.5 - 0.45 * ease(seg(k, C.rise0, C.rise0 + 20)), at: sp(tp.x, lerp(sc.floor - 80, tp.feet - 60, 0.8)), grade: gr }
    return { z: 1.05 + 0.15 * seg(k, C.land - 4, C.land + 6) - 0.1 * seg(k, C.land + 10, C.total), at: sp(tp.x, lerp(tp.feet - 60, sc.floor - 70, seg(k, C.burst, C.land))), grade: gr }
  },
  ui(sc, k, C, sp) {
    const g = sc.g, tp = sc.tp, still = seg(k, C.eye, C.vanish) * (1 - seg(k, C.palm + 30, C.total))
    const gr = `saturate(${1 - 0.8 * still}) brightness(${1 - 0.25 * still}) contrast(${1 + 0.15 * still})`
    if (k < C.vanish) return { z: 1.1 + 0.4 * ease(seg(k, 0, C.vanish)), at: sp(g.x, sc.floor - 90), grade: gr }
    if (k < C.palm) return { z: 1.55, at: sp(tp.x, sc.floor - 70), grade: gr }
    return { z: 1.4 - 0.3 * easeO(seg(k, C.palm, C.palm + 40)), at: sp(lerp(tp.x, g.x, 0.3), sc.floor - 70), grade: gr }
  },
}
const lerp = (a, b, u) => a + (b - a) * u
const WASH = {
  kame(c, W, H, sc, k, C, P) { const a = seg(k, C.title, C.fire) * (1 - seg(k, C.blast + 30, C.total)); vignette(c, W, H, 'rgba(0,0,0,0)', `rgba(0,0,0,${0.7 * a})`)
    if (sc.form === 'blue' && k >= 12) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.18 * (1 - seg(k, C.blast + 20, C.total)); c.fillStyle = P.kaio; c.fillRect(0, 0, W, H) } },
  bomb(c, W, H, sc, k, C) { const a = seg(k, C.gather0, C.throw - 30) * (1 - seg(k, C.blast + 20, C.total)); c.fillStyle = `rgba(2,6,24,${0.45 * a})`; c.fillRect(0, 0, W, H); vignette(c, W, H, 'rgba(0,0,0,0)', `rgba(0,2,10,${0.7 * a})`) },
  meteor(c, W, H, sc, k, C) { vignette(c, W, H, 'rgba(0,0,0,0)', `rgba(20,12,0,${0.6 * seg(k, 0, 20) * (1 - seg(k, C.slam + 40, C.total))})`) },
  dragon(c, W, H, sc, k, C) { vignette(c, W, H, 'rgba(0,0,0,0)', `rgba(24,10,0,${0.75 * seg(k, 0, 20) * (1 - seg(k, C.land + 20, C.total))})`) },
  ui(c, W, H, sc, k, C) { const a = seg(k, C.eye, C.vanish) * (1 - seg(k, C.palm + 30, C.total)); vignette(c, W, H, 'rgba(0,0,0,0)', `rgba(4,4,14,${0.75 * a})`) },
}

// ── KAMEHAMEHA (SSJ / God / Blue×Kaioken) ────────────────────────────────────────────────────────────────────────
const handPt = (sc, g) => ({ x: g.x + sc.d * 30, y: sc.floor - 62 })
function kameBall(sc, k, C) { return k < C.syl[0] ? 0 : k < C.fire ? 4 + 18 * ease(seg(k, C.syl[0], C.suck)) + (k >= C.suck ? 3 * Math.sin(k * 1.3) : 0) : 0 }
const WORLD = {
  kame(c, sc, k, real, C, P, f, t, g, tp, tcy) {
    const d = sc.d, h = handPt(sc, g), by = h.y
    const auraA = clamp(k / 8, 0, 1) * (1 - seg(k, C.beamOff + 10, C.total - 10) * 0.7)
    if (sc.form === 'blue' && k >= 12) aura(c, g.x, g.feet, 160, P.kaio, '#ffb0b0', k, auraA * 0.85, { size: 1.25 })
    aura(c, g.x, g.feet, 140, P.ki, P.hot, k, auraA, { size: k >= C.syl[2] && k < C.blast ? 1.3 : 1 })
    debris(c, g.x, sc.floor, k, C.title, seg(k, C.title, C.syl[1]) * (1 - seg(k, C.blast, C.blast + 30)), 18, 150)
    // the crater + smoke after the detonation
    if (k >= C.blast) { crater(c, sc.tEnd, sc.tFloor, 110, seg(k, C.blast + 4, C.blast + 14), P.ki, k); smoke(c, sc.tEnd, sc.tFloor - 20, k - C.blast - 6, 170) }
    foeBody(c, sc, tp, real)
    gokuBody(c, sc, g)
    // the ball of ki in the cupped hands
    const r = kameBall(sc, k, C)
    if (r > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glowBall(c, h.x - d * 8, by, r, P.ki); for (let i = 0; i < 10; i++) { const an = hash(i, k >> 1) * TAU, rr = r * (2.6 - 1.6 * ((k + i * 3) % 12) / 12); c.globalAlpha = 0.7; c.fillStyle = P.hot; c.fillRect(h.x - d * 8 + Math.cos(an) * rr - 1.5, by + Math.sin(an) * rr - 1.5, 3, 3) } c.restore() }
    // the beam: the head races across the stage, swallows the foe, keeps going to the edge
    if (k >= C.fire && k < C.beamOff) {
      const reach = Math.abs(tp.x - h.x) + 40, edge = (d > 0 ? sc.sR + 200 : sc.sL - 200)
      let x1
      if (k < C.contact) x1 = h.x + d * reach * easeO(seg(k, C.fire, C.contact))
      else if (k < C.blast) x1 = lerp(tp.x + d * 40, edge, easeO(seg(k, C.contact + 6, C.blast)))
      else x1 = edge
      const a = 1 - seg(k, C.blast + 4, C.beamOff), thk = (sc.form === 'ssj' ? 46 : 56) * (k < C.fire + 4 ? 0.5 + 0.5 * seg(k, C.fire, C.fire + 4) : 1) * (1 + 0.1 * Math.sin(k * 1.7))
      beam(c, h.x, x1, by, thk, P.ki, P.hot, k, a, d)
      if (sc.form === 'blue') beam(c, h.x, x1, by, thk * 1.25, P.kaio, '#ffc0c0', k + 3, a * 0.35, d)
      // the foe silhouetted inside the beam
      if (k >= C.contact && k < C.blast + 4 && sc.drawFoe) blitAnim(c, t, null, 'hurt', 0, tp.x, tp.feet, -d, { rot: tp.rot, tint: '#ffffff', tintA: 0.85, alpha: 0.75, comp: 'lighter' })
    }
    if (k >= C.blast) explosion(c, tp.x, tcy, k - C.blast, 260, P.ki, P.hot)
  },

  // ── SPIRIT BOMB (base) ──
  bomb(c, sc, k, real, C, P, f, t, g, tp, tcy) {
    const d = sc.d, R = bombR(k, C), bp = bombPos(sc, k, C, tp)
    // energy from everywhere: motes streaming up into the sphere
    if (k >= C.gather0 && k < C.throw + 4) { c.save(); c.globalCompositeOperation = 'lighter'
      const a = seg(k, C.gather0, C.gather0 + 12)
      for (let i = 0; i < 70; i++) { const ph = ((k * (0.008 + 0.006 * hash(i, 3)) + hash(i, 1)) % 1), sx = sc.sL + (sc.sR - sc.sL) * hash(i, 2), sy = sc.floor + 10 - 300 * hash(i, 9) * 0.3
        const x = lerp(sx, bp.x, ease(ph)), y = lerp(sy, bp.y, ease(ph)) - Math.sin(ph * Math.PI) * 120 * hash(i, 4)
        c.globalAlpha = a * 0.85 * (1 - ph * 0.4); glowBall(c, x, y, 2.5 + 3 * hash(i, 5), P.ki) }
      c.restore() }
    if (k >= C.blast) { crater(c, sc.tx0, sc.tFloor, 150, seg(k, C.blast + 4, C.blast + 14), P.ki, k); smoke(c, sc.tx0, sc.tFloor - 20, k - C.blast - 6, 220, 18, '70,80,100') }
    aura(c, g.x, g.feet, 140, P.ki, P.hot, k, 0.6 * clamp(k / 10, 0, 1) * (1 - seg(k, C.throw + 20, C.throw + 40)))
    foeBody(c, sc, tp, real)
    gokuBody(c, sc, g)
    if (R > 0 && k < C.blast + 2) {   // the sphere: layered glow, a churning surface, a bright rim
      c.save(); c.globalCompositeOperation = 'lighter'
      glowBall(c, bp.x, bp.y, R * 0.9, P.ki, 'rgba(240,252,255,0.6)', 0.7)
      c.globalCompositeOperation = 'source-over'
      const sg = c.createRadialGradient(bp.x - R * 0.3, bp.y - R * 0.3, R * 0.1, bp.x, bp.y, R)
      sg.addColorStop(0, 'rgba(255,255,255,0.97)'); sg.addColorStop(0.45, 'rgba(190,235,255,0.92)'); sg.addColorStop(0.85, rgba(P.ki, 0.85)); sg.addColorStop(1, 'rgba(120,200,255,0.5)')
      c.fillStyle = sg; c.beginPath(); c.arc(bp.x, bp.y, R, 0, TAU); c.fill()
      c.globalCompositeOperation = 'lighter'; c.save(); c.beginPath(); c.arc(bp.x, bp.y, R, 0, TAU); c.clip()
      for (let i = 0; i < 14; i++) { const an = hash(i, 61) * TAU + k * 0.02 * (hash(i, 62) - 0.5), rr = R * 0.8 * hash(i, 63); c.globalAlpha = 0.35; glowBall(c, bp.x + Math.cos(an) * rr, bp.y + Math.sin(an) * rr, R * 0.12, '#ffffff') }
      c.restore(); c.globalAlpha = 0.8; c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.arc(bp.x, bp.y, R, 0, TAU); c.stroke()
      c.restore()
    }
    if (k >= C.contact && k < C.blast) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 3; i++) { const a = ((k - C.contact) * 3 + i * 14) % 42; c.globalAlpha = 0.6 * (1 - a / 42); c.strokeStyle = P.hot; c.lineWidth = 5; c.beginPath(); c.ellipse(sc.tx0, sc.tFloor, 60 + a * 6, 12 + a, 0, 0, TAU); c.stroke() } c.restore()
      debris(c, sc.tx0, sc.tFloor, k, C.contact, 1, 20, 140) }
    if (k >= C.blast) {   // the detonation: a dome, then a pillar of light into the sky
      const a = k - C.blast
      explosion(c, sc.tx0, sc.tFloor - 40, a, 320, P.ki, P.hot)
      if (a < 60) { c.save(); c.globalCompositeOperation = 'lighter'; const w = 90 * easeO(a / 8) * (1 - seg(a, 30, 60)); const gr = c.createLinearGradient(sc.tx0 - w, 0, sc.tx0 + w, 0); gr.addColorStop(0, rgba(P.ki, 0)); gr.addColorStop(0.5, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, rgba(P.ki, 0)); c.fillStyle = gr; c.fillRect(sc.tx0 - w, sc.tFloor - 2000, w * 2, 2000); c.restore() }
    }
  },

  // ── METEOR SMASH (SSJ2) ──
  meteor(c, sc, k, real, C, P, f, t, g, tp, tcy) {
    const d = sc.d
    if (k >= C.slam) { crater(c, sc.tEnd, sc.tFloor, 120, seg(k, C.slam, C.slam + 8), P.ki, k); smoke(c, sc.tEnd, sc.tFloor - 16, k - C.slam, 200) }
    aura(c, g.x, g.feet, 130, P.ki, P.hot, k, (g.hide ? 0 : 0.8) * (1 - seg(k, C.slam + 30, C.total)), { arcs: P.arcs })
    // the dash: afterimage trail
    if (k >= C.dash && k < C.arrive + 6) for (let i = 0; i < 5; i++) { const u = clamp(seg(k, C.dash, C.arrive) - i * 0.12, 0, 1); blitAnim(c, f, sc.anim, 'heavy', 0, lerp(sc.fx0, sc.gNear, easeO(u)), sc.floor, d, { tint: P.ki, tintA: 0.8, alpha: 0.45 * (1 - i / 5) * (1 - seg(k, C.arrive, C.arrive + 6)) }) }
    // barrage blur: fists everywhere
    if (k >= C.arrive && k < C.kick) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 6; i++) { const yy = sc.floor - 50 - 40 * hash(i, k), xx = g.x + d * (30 + 30 * hash(i + 4, k)); c.globalAlpha = 0.6; c.fillStyle = P.hot; c.beginPath(); c.ellipse(xx, yy, 18, 5, 0, 0, TAU); c.fill() } c.restore() }
    // instant-transmission flicker above the foe
    if (k >= C.port && k < C.port + 8) { c.save(); c.globalCompositeOperation = 'lighter'; const a = 1 - (k - C.port) / 8; for (let i = 0; i < 6; i++) { c.globalAlpha = a; c.strokeStyle = P.hot; c.lineWidth = 3; const yy = tp.feet - 60 + (i - 3) * 14; c.beginPath(); c.moveTo(g.x - 40 * a, yy); c.lineTo(g.x + 40 * a, yy); c.stroke() } c.restore() }
    // the meteor: the foe trails fire on the way down
    if (k >= C.hammer && k < C.slam) { c.save(); c.globalCompositeOperation = 'lighter'; const u = seg(k, C.hammer, C.slam)
      for (let i = 0; i < 8; i++) { const v = Math.max(0, u - i * 0.06); const x = lerp(sc.tx0 + d * 20, sc.tEnd, v), y = lerp(sc.tFloor - 200, sc.tFloor, v * v) - 50; glowBall(c, x, y, 26 - i * 2.5, P.ki, 'rgba(255,255,255,0.8)', 1 - i / 8) } c.restore() }
    foeBody(c, sc, tp, real)
    gokuBody(c, sc, g)
    // the two-fisted hammer: a crescent of ki
    if (k >= C.hammer && k < C.hammer + 14) { const a = 1 - (k - C.hammer) / 14; c.save(); c.globalCompositeOperation = 'lighter'; c.translate(g.x + d * 20, g.feet - 50); for (const [lw, al, col] of [[26, 0.35, P.ki], [10, 0.9, P.hot], [4, 1, '#ffffff']]) { c.globalAlpha = a * al; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(0, 0, 70, d > 0 ? -0.6 : Math.PI - 1.2, d > 0 ? 1.8 : Math.PI + 0.6); c.stroke() } c.restore() }
    if (k >= C.slam) explosion(c, sc.tEnd, sc.tFloor - 10, k - C.slam, 220, P.ki, P.hot)
    if (k >= C.slam) debris(c, sc.tEnd, sc.tFloor, k, C.slam, 1 - seg(k, C.slam + 30, C.slam + 60), 22, 120)
  },

  // ── DRAGON FIST (SSJ3) ──
  dragon(c, sc, k, real, C, P, f, t, g, tp, tcy) {
    const d = sc.d
    if (k >= C.land) { crater(c, sc.tEnd, sc.tFloor, 120, seg(k, C.land, C.land + 8), P.ki, k); smoke(c, sc.tEnd, sc.tFloor - 16, k - C.land, 200) }
    // the charge: the ground cracks, rocks lift, lightning in the aura
    debris(c, g.x, sc.floor, k, 0, seg(k, 4, 20) * (1 - seg(k, C.launch, C.launch + 20)), 24, 200)
    if (k < C.launch) { c.save(); c.strokeStyle = 'rgba(30,18,8,0.8)'; c.lineWidth = 2.5; const L = 200 * ease(seg(k, C.charge, C.launch)); for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1; c.beginPath(); c.moveTo(g.x, sc.floor + 2); c.lineTo(g.x + s * L * (0.4 + 0.6 * hash(i, 3)), sc.floor + 2 + (hash(i, 4) - 0.5) * 12); c.stroke() } c.restore() }
    aura(c, g.x, g.feet, 150, P.ki, P.hot, k, clamp(k / 8, 0, 1) * (1 - seg(k, C.land, C.total)), { arcs: P.arcs, size: k < C.launch ? 1 + 0.5 * seg(k, C.charge, C.launch) : 1 })
    // the launch: a golden corkscrew trail
    if (k >= C.launch && k < C.rise0 + 8) { c.save(); c.globalCompositeOperation = 'lighter'; const a = 1 - seg(k, C.contact + 2, C.rise0 + 8)
      for (let i = 0; i < 30; i++) { const u = i / 30, x = lerp(sc.fx0, g.x, u), y = sc.floor - 60 + Math.sin(u * 14 - k * 0.8) * 22; c.globalAlpha = a * u; glowBall(c, x, y, 6 + 10 * u, P.ki) } c.restore() }
    foeBody(c, sc, tp, real)
    // the DRAGON: coils out of the fist, wraps the foe and rises into the sky, then bursts
    if (k >= C.contact && k < C.burst + 4) dragonWyrm(c, sc, k, C, P, g, tp, tcy)
    gokuBody(c, sc, g)
    if (k >= C.contact && k < C.rise0) glowBall(c, g.x + d * 40, sc.floor - 62, 18, P.ki)
    if (k >= C.burst) explosion(c, tp.x, k < C.fall ? tcy : sc.tFloor - 200, k - C.burst, 300, P.ki, P.hot)
    if (k >= C.land) explosion(c, sc.tEnd, sc.tFloor - 10, k - C.land, 140, P.ki, P.hot)
  },

  // ── AUTONOMOUS ASSAULT (Ultra Instinct) ──
  ui(c, sc, k, real, C, P, f, t, g, tp, tcy) {
    const d = sc.d
    // silver motes drifting up, slow and calm
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 40; i++) { const ph = ((k * 0.004 * (1 + hash(i, 2)) + hash(i, 1)) % 1), x = lerp(sc.fx0, sc.tx0, 0.5) + (hash(i, 3) - 0.5) * 700, y = sc.floor - ph * 360
      c.globalAlpha = 0.6 * Math.sin(ph * Math.PI) * seg(k, 6, 30); c.fillStyle = i % 2 ? P.ki : '#ffffff'; c.fillRect(x, y, 2.5, 2.5) }
    c.restore()
    if (k < C.vanish + 4) aura(c, sc.fx0, sc.floor, 140, P.ki, P.hot, k >> 1, 0.7 * clamp(k / 10, 0, 1) * (1 - seg(k, C.vanish, C.vanish + 4)), { size: 0.85 })
    // the vanish: a ripple in still air
    if (k >= C.vanish && k < C.vanish + 20) { const a = k - C.vanish; c.save(); c.globalAlpha = 0.8 * (1 - a / 20); c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.ellipse(sc.fx0, sc.floor - 70, 20 + a * 6, 60 + a * 3, 0, 0, TAU); c.stroke(); c.restore() }
    foeBody(c, sc, tp, real)
    // the flurry: silver afterimages strike from every angle, each one a different blow
    if (k >= C.vanish + 6 && k < C.appear) {
      const POS = ['light', 'heavy', 'up', 'air', 'gokuCrescent', 'down_air']
      for (let j = 0; j < 4; j++) { const slot = ((k - C.vanish) >> 2) - j; if (slot < 0) continue
        const ang = hash(slot, 17) * TAU, R = 62 + 20 * hash(slot, 19), gx = tp.x + Math.cos(ang) * R, gf = sc.floor - Math.max(0, -Math.sin(ang) * R * 1.4)
        const dir = gx < tp.x ? 1 : -1, a = (j === 0 ? 0.95 : 0.55 - j * 0.12) * (1 - seg(k, C.appear - 6, C.appear))
        blitAnim(c, f, sc.anim, POS[slot % POS.length], 1, gx, gf, dir, { tint: j ? '#c8d0ff' : null, tintA: 0.6, alpha: a })
        if (j === 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.8; c.strokeStyle = '#ffffff'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(gx, gf - 60); c.lineTo(tp.x, tcy); c.stroke(); c.restore() } }
      for (const s of C.strikes) { const a = k - s; if (a >= 0 && a < 12) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - a / 12; c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.arc(tp.x, tcy, 14 + a * 7, 0, TAU); c.stroke(); glowBall(c, tp.x, tcy, 16 * (1 - a / 12), P.ki); c.restore() } }
    }
    if (!g.hide) aura(c, g.x, g.feet, 130, P.ki, P.hot, k >> 1, 0.6 * seg(k, C.appear, C.appear + 8), { size: 0.8 })
    gokuBody(c, sc, g)
    if (k >= C.appear - 4 && k < C.palm) { c.save(); c.globalCompositeOperation = 'lighter'; glowBall(c, g.x + d * 34, sc.floor - 70, 6 + 12 * seg(k, C.appear, C.palm), P.ki); c.restore() }
    if (k >= C.palm) {   // the palm: a silver-white blast that goes clean through
      const a = k - C.palm; explosion(c, g.x + d * 60, sc.floor - 70, a, 240, P.ki, P.hot)
      if (a < 30) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - a / 30; const x0 = g.x + d * 34, L = 900 * easeO(a / 6); const gr = c.createLinearGradient(x0, 0, x0 + d * L, 0); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, rgba(P.ki, 0)); c.fillStyle = gr; c.beginPath(); c.moveTo(x0, sc.floor - 74); c.lineTo(x0 + d * L, sc.floor - 74 - 90); c.lineTo(x0 + d * L, sc.floor - 74 + 90); c.closePath(); c.fill(); c.restore() }
    }
  },
}
// sphere size / position for the Spirit Bomb
function bombR(k, C) { return k < C.gather0 ? 0 : k < C.throw ? 6 + 150 * ease(seg(k, C.gather0, C.throw - 10)) : k < C.blast ? 156 - 30 * seg(k, C.contact, C.blast) : 0 }
function bombPos(sc, k, C, tp) {
  const top = { x: sc.fx0, y: sc.floor - 140 - bombR(Math.min(k, C.throw), C) }
  if (k < C.throw + 4) return top
  const u = ease(seg(k, C.throw + 4, C.contact)), end = { x: sc.tx0, y: sc.tFloor - 60 }
  if (k < C.contact) return { x: lerp(top.x, end.x, u), y: lerp(top.y, end.y, u) - Math.sin(u * Math.PI) * 120 }
  return { x: end.x, y: end.y + 20 * seg(k, C.contact, C.blast) }
}
// the golden dragon: a thick serpent that bursts from the fist, coils around the foe and rears up over them, horned head roaring
function dragonWyrm(c, sc, k, C, P, g, tp, tcy) {
  const d = sc.d, grow = easeO(seg(k, C.contact, C.rise0 + 30)), n = 60, fade = 1 - seg(k, C.burst, C.burst + 4)
  const fist = { x: g.x + d * 40, y: g.feet - 62 }
  const pt = s => {   // s = 0 (fist) … 1 (head)
    if (s < 0.22) { const u = s / 0.22; return { x: lerp(fist.x, tp.x - d * 60, u), y: lerp(fist.y, tcy + 30, u) - Math.sin(u * Math.PI) * 30, z: 1 } }
    const u = (s - 0.22) / 0.78, ang = -Math.PI / 2 * d + u * TAU * 1.6 * d - k * 0.05 * d, r = 78 - 20 * u
    return { x: tp.x + Math.cos(ang) * r, y: tcy + 40 - u * 140 + Math.sin(ang) * r * 0.28, z: Math.sin(ang) }
  }
  const pts = []; for (let i = 0; i <= n; i++) pts.push(pt((i / n) * grow))
  const width = i => 30 * (1 - 0.45 * i / n) * (0.85 + 0.15 * Math.sin(i * 0.9 - k * 0.4))
  c.save(); c.globalAlpha = fade; c.lineCap = 'round'; c.lineJoin = 'round'
  for (const pass of [0, 1]) {   // back half of the coil first, then the front half (over the foe)
    for (let i = 1; i <= n; i++) { const p0 = pts[i - 1], p1 = pts[i]; if ((p1.z < 0) !== (pass === 0)) continue
      const w = width(i)
      c.strokeStyle = '#6a3a00'; c.lineWidth = w + 6; c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke()
      c.strokeStyle = i % 4 < 2 ? '#ffc02a' : '#ffd860'; c.lineWidth = w; c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke()
      c.strokeStyle = 'rgba(255,250,220,0.9)'; c.lineWidth = w * 0.3; c.beginPath(); c.moveTo(p0.x, p0.y - w * 0.2); c.lineTo(p1.x, p1.y - w * 0.2); c.stroke()
      if (i % 3 === 0) { c.fillStyle = '#fff0b0'; c.beginPath(); c.moveTo(p1.x, p1.y - w * 0.5); c.lineTo(p1.x - 5, p1.y - w * 0.5 - 12); c.lineTo(p1.x + 6, p1.y - w * 0.5 - 4); c.closePath(); c.fill() }   // dorsal fins
    }
    if (pass === 0) { c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i <= n; i += 3) glowBall(c, pts[i].x, pts[i].y, width(i) * 0.6, P.ki, 'rgba(255,240,180,0.5)', 0.35 * fade); c.restore() }
  }
  // head
  const hp = pts[n], hp2 = pts[n - 3], ang = Math.atan2(hp.y - hp2.y, hp.x - hp2.x), roar = k >= C.roar ? 1 : 0, S = 2.2 + 0.4 * roar
  c.translate(hp.x, hp.y); c.rotate(ang)
  c.save(); c.globalCompositeOperation = 'lighter'; glowBall(c, 0, 0, 26 * S * 0.6, P.ki, 'rgba(255,250,220,0.8)', fade); c.restore()
  c.fillStyle = '#fff8d8'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(-4 * S, s * 8 * S); c.lineTo(-34 * S, s * 24 * S); c.lineTo(-10 * S, s * 4 * S); c.closePath(); c.fill() }   // horns
  c.fillStyle = '#ffc02a'; c.strokeStyle = '#6a3a00'; c.lineWidth = 3
  c.beginPath(); c.moveTo(-12 * S, -12 * S); c.lineTo(30 * S, -6 * S - roar * 6 * S); c.lineTo(8 * S, -1 * S); c.closePath(); c.fill(); c.stroke()   // upper jaw
  c.beginPath(); c.moveTo(-12 * S, 10 * S); c.lineTo(26 * S, 6 * S + roar * 8 * S); c.lineTo(8 * S, 1 * S); c.closePath(); c.fill(); c.stroke()     // lower jaw
  c.beginPath(); c.ellipse(-6 * S, 0, 14 * S, 12 * S, 0, 0, TAU); c.fill(); c.stroke()
  c.fillStyle = '#ff2a10'; c.beginPath(); c.arc(0, -5 * S, 3 * S, 0, TAU); c.fill()   // the eye
  c.strokeStyle = '#fff4c0'; c.lineWidth = 2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(18 * S, s * 4 * S); c.quadraticCurveTo(36 * S, s * 20 * S, 54 * S, s * (14 + 5 * Math.sin(k / 4)) * S); c.stroke() }   // whiskers
  c.restore()
}

// ── screen layers ──
function syllable(c, W, H, u, txt, jp, age, x, y, col, stroke, keep = 0) {
  if (age < 0) return
  const s = age < 5 ? 1.9 - 0.9 * easeO(age / 5) : 1, a = keep ? (age < 18 ? 1 : 0.55) : clamp(1 - (age - 14) / 6, 0, 1)
  card(c, jp, x, y - 64 * u * s, 54 * u * s, '#ffffff', a, -0.05, stroke, '900 %spx "Hiragino Mincho ProN", "Yu Mincho", serif')
  card(c, txt, x, y, 84 * u * s, col, a, -0.05, stroke)
}
const SCREEN = {
  kame(c, W, H, u, sc, k, real, C, P, S) {
    if (sc.form === 'blue' && k >= 12 && k < 40) { const a = k - 12; card(c, 'KAIOKEN ×10!', W / 2, H * 0.68, 64 * u * (a < 5 ? 1.7 - 0.7 * easeO(a / 5) : 1), '#ff4a4a', clamp((28 - a) / 6, 0, 1), -0.05, '#3a0000') }
    const syl = [['KA…', 'か'], ['ME…', 'め'], ['HA…', 'は'], ['ME…', 'め']]
    if (k < C.fire + 2) C.syl.forEach((s, i) => syllable(c, W, H, u, syl[i][0], syl[i][1], k - s, W * (0.2 + i * 0.2), H * 0.7, P.hot, P.stroke, k >= C.fire ? 0 : 1))
    if (k >= C.suck && k < C.fire) { const a = seg(k, C.suck, C.fire); c.fillStyle = `rgba(0,0,0,${0.3 * a})`; c.fillRect(0, 0, W, H); const q = S(sc.g.x + sc.d * 22, sc.floor - 62); speedLines(c, W, H, q.x, q.y, 0.35 * a, k, 56, P.hot) }
    if (k >= C.fire && k < C.fire + 4) { c.globalAlpha = 0.9 * (1 - (k - C.fire) / 4); c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
    if (k >= C.fire) { const a = k - C.fire; if (a < 34) { card(c, 'HA!!', W / 2, H * 0.3, 140 * u * (a < 6 ? 2 - easeO(a / 6) : 1), '#ffffff', clamp((34 - a) / 8, 0, 1), -0.06, P.stroke); card(c, '波', W / 2 + 150 * u, H * 0.3 - 70 * u, 60 * u, P.hot, clamp((34 - a) / 8, 0, 1) * seg(a, 3, 6), -0.06, P.stroke, '900 %spx "Hiragino Mincho ProN", "Yu Mincho", serif') } }
    if (k >= C.blast + 2) { const a = k - C.blast - 2; card(c, P.title + '!!', W / 2, H * 0.24, Math.min(84, 1500 / P.title.length) * u * (a < 6 ? 1.8 - 0.8 * easeO(a / 6) : 1), '#ffffff', clamp((70 - a) / 10, 0, 1), -0.05, P.stroke) }
  },
  bomb(c, W, H, u, sc, k, real, C, P, S) {
    if (k >= C.throw - 8 && k < C.throw + 30) { const a = k - C.throw + 8; card(c, 'GENKIDAMA!!', W / 2, H * 0.28, 96 * u * (a < 6 ? 1.8 - 0.8 * easeO(a / 6) : 1), '#ffffff', clamp((38 - a) / 8, 0, 1), -0.05, P.stroke); card(c, '元気玉', W / 2 + 230 * u, H * 0.28 - 70 * u, 50 * u, P.hot, clamp((38 - a) / 8, 0, 1), -0.05, P.stroke, '900 %spx "Hiragino Mincho ProN", "Yu Mincho", serif') }
    if (k >= C.blast + 4) { const a = k - C.blast - 4; card(c, 'SPIRIT BOMB!!', W / 2, H * 0.24, 92 * u * (a < 6 ? 1.8 - 0.8 * easeO(a / 6) : 1), '#ffffff', clamp((66 - a) / 10, 0, 1), -0.05, P.stroke) }
    if (k >= C.gather0 && k < C.throw) { const n = Math.floor(seg(k, C.gather0, C.throw - 10) * 100); card(c, `ENERGY ${n}%`, W * 0.84, H * 0.72, 26 * u, P.hot, seg(k, C.gather0, C.gather0 + 8) * (1 - seg(k, C.throw - 6, C.throw)), 0, '#000000') }
  },
  meteor(c, W, H, u, sc, k, real, C, P, S) {
    if (k >= C.arrive && k < C.kick) { const a = k - C.arrive; card(c, 'HA! HA! HA! HAAA!', W * 0.5, H * 0.72, 46 * u, P.hot, clamp(a / 4, 0, 1) * clamp((C.kick - k) / 6, 0, 1), -0.08 + 0.02 * Math.sin(k), P.stroke) }
    if (k >= C.raise && k < C.slam + 50) { const a = k - C.raise; card(c, 'METEOR', W * 0.42, H * 0.62, 90 * u * (a < 6 ? 1.8 - 0.8 * easeO(a / 6) : 1), '#ffffff', clamp((C.slam + 50 - k) / 10, 0, 1), -0.06, P.stroke)
      if (k >= C.hammer) { const b = k - C.hammer; card(c, 'SMASH!!', W * 0.6, H * 0.74, 100 * u * (b < 6 ? 1.9 - 0.9 * easeO(b / 6) : 1), P.hot, clamp((C.slam + 50 - k) / 10, 0, 1), -0.06, P.stroke) } }
  },
  dragon(c, W, H, u, sc, k, real, C, P, S) {
    if (k >= C.charge && k < C.launch) { const a = seg(k, C.charge, C.launch); const q = S(sc.g.x, sc.floor - 70); speedLines(c, W, H, q.x, q.y, 0.25 * a, k >> 2, 50, P.hot) }
    if (k >= C.launch - 6 && k < C.rise0 + 40) { const a = k - C.launch + 6; card(c, 'DRAGON…', W * 0.32, H * 0.72, 70 * u * (a < 5 ? 1.7 - 0.7 * easeO(a / 5) : 1), P.hot, clamp((C.rise0 + 40 - k) / 8, 0, 1), -0.05, P.stroke) }
    if (k >= C.contact && k < C.rise0 + 40) { const a = k - C.contact; card(c, 'FIST!!', W * 0.66, H * 0.72, 100 * u * (a < 5 ? 1.9 - 0.9 * easeO(a / 5) : 1), '#ffffff', clamp((C.rise0 + 40 - k) / 8, 0, 1), -0.05, P.stroke) }
    if (k >= C.roar && k < C.burst + 50) { const a = k - C.roar; card(c, '龍拳', W / 2, H * 0.3, 130 * u * (a < 6 ? 1.8 - 0.8 * easeO(a / 6) : 1), P.hot, clamp((C.burst + 50 - k) / 10, 0, 1), -0.04, P.stroke, '900 %spx "Hiragino Mincho ProN", "Yu Mincho", serif') }
  },
  ui(c, W, H, u, sc, k, real, C, P, S) {
    // the silver eye opens, calm — a band across the frame
    if (k >= C.eye - 2 && k < C.vanish + 4) { const a = seg(k, C.eye - 2, C.eye + 4) * (1 - seg(k, C.vanish - 2, C.vanish + 4)), bh = H * 0.22, y = H * 0.42
      c.save(); c.globalAlpha = a; c.fillStyle = '#05050c'; c.fillRect(0, y - bh / 2, W, bh); c.beginPath(); c.rect(0, y - bh / 2, W, bh); c.clip()
      const op = ease(seg(k, C.eye + 2, C.eye + 14)), r = bh * 0.42, x = W / 2
      c.fillStyle = '#f4f4fa'; c.beginPath(); c.ellipse(x, y, r * 3.2, r * 1.15 * op, 0, 0, TAU); c.fill(); c.clip()
      const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#b8c0d8'); g.addColorStop(1, '#5a6080'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill()
      c.fillStyle = '#1a1c2a'; c.beginPath(); c.arc(x, y, r * 0.3, 0, TAU); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x - r * 0.25, y - r * 0.25, r * 0.12, 0, TAU); c.fill()
      c.restore() }
    if (k >= C.vanish && k < C.appear) { const a = seg(k, C.vanish, C.vanish + 6) * (1 - seg(k, C.appear - 6, C.appear)); card(c, '身勝手の極意', W * 0.14, H * 0.5, 44 * u, '#e8ecff', a * 0.85, 0, '#20244a', '900 %spx "Hiragino Mincho ProN", "Yu Mincho", serif')
      for (let i = 0; i < 18; i++) { const y = H * hash(i, k >> 2), x = ((hash(i, 3) * W + k * 30) % (W + 200)) - 100; c.globalAlpha = 0.3 * a; c.fillStyle = '#ffffff'; c.fillRect(x, y, 140, 1.5 * u) } c.globalAlpha = 1 }
    if (k >= C.palm + 2) { const a = k - C.palm - 2; card(c, 'AUTONOMOUS ASSAULT', W / 2, H * 0.25, 72 * u * (a < 6 ? 1.8 - 0.8 * easeO(a / 6) : 1), '#ffffff', clamp((70 - a) / 10, 0, 1), -0.04, P.stroke) }
  },
}
const SUBS = {
  kame: (form, C) => [[C.syl[0], C.fire - 2, form === 'blue' ? '“Kaioken… times TEN!”' : '“Ka… me… ha… me…”'], [C.blast + 40, C.total - 4, form === 'god' ? 'The divine flame settles.' : 'The smoke clears — a crater where the foe stood.']],
  bomb: (form, C) => [[C.gather0 + 6, C.throw - 10, '“Everyone… lend me your energy!”'], [C.blast + 44, C.total - 4, 'The light of the whole world, spent in one blow.']],
  meteor: (form, C) => [[C.raise - 6, C.hammer, '“This is it!”']],
  dragon: (form, C) => [[C.charge + 6, C.launch - 4, 'The ground splits. The air itself burns gold.'], [C.rise0 + 10, C.roar, '“DRAGON FIST!!”']],
  ui: (form, C) => [[C.eye + 6, C.vanish, 'His body moves on its own.'], [C.appear + 2, C.palm, '…'], [C.palm + 50, C.total - 4, 'Ultra Instinct.']],
}

registerCineScreen('goku_ult', draw)
