// vegetaUltFx.js — RENDER half of vegetaUlt.js (Vegeta's SUPER SAIYAN BLUE EVOLUTION → FINAL FLASH cinematic). Reads
// vegetaUltScene(); never writes sim state. One screen-space pass (cineRegistry.registerCineScreen — after the world, before
// the HUD):
//   1. the finished world frame RE-DRAWN scaled about the subject (a real push-in / punch-zoom past camera.js's cap) and graded;
//   2. a WORLD layer with the camera matrix × the push-in: the Evolution aura, lifting rocks, ground cracks, Vegeta himself
//      from his own sheets (engine sprite hidden by _fxAlpha 0; the Final Flash poses get the royal-blue Evolution hair), the
//      palm stars, the stage-wide beam, the horizon detonation, smoke;
//   3. the SCREEN layer: impact frames (white → inverted), converging speed lines, call-outs, subtitles, damage, letterbox +
//      title cut-in. Returns true while active (hides the HUD).
// Render-only noise = integer hash of the scene's frame counters. Also exports the drawing kit vegetaDarkUltFx.js reuses.
import { registerCineScreen } from './cineRegistry.js'
import { camera } from './camera.js'
import { vegetaUltScene, VEGETA_CINE } from './vegetaUlt.js'

// ── shared kit (also used by vegetaDarkUltFx.js) ─────────────────────────────────────────────────────────────────
const imgs = new Map(), boxes = new Map()
export const image = src => { let im = imgs.get(src); if (!im) { im = new Image(); im.src = src; imgs.set(src, im) } return im }
export const ready = im => !!(im && im.complete && im.naturalWidth > 0)
export const broken = im => !!(im && im.complete && !(im.naturalWidth > 0))
export const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
export const easeO = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) * (1 - u) }
export const seg = (k, a, b) => clamp((k - a) / Math.max(1, b - a), 0, 1)
export const GLOBAL = 1.18   // sprite.js GLOBAL_SPRITE_SCALE

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
// the skin's file for a sheet: the worn skin's recolour tag is read off the fighter's own idle sheet (name__tag.png);
// falls back to the default sheet while the variant is missing / loading fails
export function skinTag(f) {
  const s = ((f?._skinAnim && f._skinAnim.idle) || f?.animationData?.idle)?.sheet || ''
  const m = /__([A-Za-z0-9_-]+)\.png$/.exec(s); return m ? m[1] : ''
}
export function skinned(url, f) {
  const tag = skinTag(f); if (!tag) return url
  const alt = url.replace(/\.png$/, `__${tag}.png`), im = image(alt)
  return broken(im) ? url : alt
}
// hair recolour (render-only, cached per frame): dark neutral pixels in the head band → the Evolution's deep royal blue
const evo = new Map()
export function evoFrame(im, src, sx, sy, w, h, frac, pal) {
  const key = `${src}#${sx},${sy},${w},${h},${frac}`
  let cv = evo.get(key); if (cv) return cv
  if (!ready(im)) return null
  cv = document.createElement('canvas'); cv.width = w; cv.height = h
  try {
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    const bx = frameBox(im, sx, sy, w, h, src + '#' + sx + ',' + w + ',' + h)
    const lim = bx.t + (bx.b - bx.t) * frac
    const D = g.getImageData(0, 0, w, h), d = D.data
    for (let y = 0; y < Math.min(h, Math.ceil(lim)); y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4; if (d[i + 3] < 25) continue
      const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b)
      if (mx < 96 && mx - mn < 34) { const L = mx / 96; d[i] = pal[0] + pal[3] * L; d[i + 1] = pal[1] + pal[4] * L; d[i + 2] = pal[2] + pal[5] * L }
    }
    g.putImageData(D, 0, 0)
  } catch (_) { const g = cv.getContext('2d'); g.drawImage(im, sx, sy, w, h, 0, 0, w, h) }
  evo.set(key, cv); return cv
}
let _tint = null
function tintCanvas(w, h) { if (!_tint) { const cv = document.createElement('canvas'); _tint = { cv, g: cv.getContext('2d') } }
  if (_tint.cv.width < w || _tint.cv.height < h) { _tint.cv.width = Math.max(_tint.cv.width, w); _tint.cv.height = Math.max(_tint.cv.height, h) } return _tint }
// one frame from an explicit source rect (sx, sy, w, h): content centred on x (or ax = anchor fraction), feet row fy on feetY
export function blitRect(c, src, sx, sy, w, h, x, feetY, dir, scale, o = {}) {
  const im = image(src); if (!ready(im)) return null
  const bx = frameBox(im, sx, sy, w, h, src + '#' + sx + ',' + w + ',' + h)
  const ax = o.ax != null ? o.ax * w : (bx.l + bx.r) / 2, fy = o.fy != null ? o.fy : bx.b
  let from = o.evo ? evoFrame(im, src, sx, sy, w, h, o.evoFrac ?? 0.4, o.evo) : null
  if (o.tint) { const t = tintCanvas(w, h); t.g.clearRect(0, 0, t.cv.width, t.cv.height); t.g.globalCompositeOperation = 'source-over'; t.g.globalAlpha = 1
    t.g.drawImage(from || im, from ? 0 : sx, from ? 0 : sy, w, h, 0, 0, w, h); t.g.globalCompositeOperation = 'source-atop'; t.g.globalAlpha = o.tintA ?? 0.7
    t.g.fillStyle = o.tint; t.g.fillRect(0, 0, w, h); t.g.globalCompositeOperation = 'source-over'; from = t.cv }
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= (o.alpha ?? 1)
  if (o.comp) c.globalCompositeOperation = o.comp
  c.translate(Math.round(x), Math.round(feetY)); if (dir < 0) c.scale(-1, 1); if (o.rot) c.rotate(o.rot)
  if (from) c.drawImage(from, 0, 0, w, h, -ax * scale, -fy * scale, w * scale, h * scale)
  else c.drawImage(im, sx, sy, w, h, -ax * scale, -fy * scale, w * scale, h * scale)
  c.restore()
  return { top: feetY - (fy - bx.t) * scale, height: (bx.b - bx.t) * scale, s: scale, front: x + dir * (bx.r - ax) * scale, back: x - dir * (ax - bx.l) * scale, box: bx }
}
// one frame of a uniform horizontal strip
export function blitSheet(c, url, frames, w, h, fi, x, feetY, dir, scale, o = {}) {
  const n = Math.max(1, frames | 0), i = clamp(fi | 0, 0, n - 1)
  return blitRect(c, url, (o.sx0 || 0) + i * w, 0, w, h, x, feetY, dir, scale, o)
}
// one frame of a fighter's own animation (the worn skin's sheet when it has one)
export function blitAnim(c, f, key, fi, x, feetY, dir, o = {}) {
  const A = (f?._skinAnim && f._skinAnim[key]) || f?.animationData?.[key]; if (!A?.sheet) return null
  const s = (f.spriteScale ?? 1.9) * GLOBAL * (o.s || 1)
  const n = Math.max(1, A.frames || 1), i = o.loop ? ((fi % n) + n) % n : clamp(fi | 0, 0, n - 1)
  return blitRect(c, A.sheet, (A.sourceX || 0) + i * A.width, 0, A.width, A.height, x, feetY, dir, s, o)
}
// warm my image cache for the sheets a scene will need (called while the title card plays)
export function preloadAnim(f, keys) { for (const key of keys) { const A = (f?._skinAnim && f._skinAnim[key]) || f?.animationData?.[key]; if (A?.sheet) image(A.sheet) } }
export const animFrames = (f, key) => ((f?._skinAnim && f._skinAnim[key]) || f?.animationData?.[key])?.frames || 1
// world → screen, rebuilt exactly as camera.applyTransform does (the screen hook runs right after the world pass)
export function worldXf(canvas) {
  const cw = canvas.width, ch = canvas.height
  return new DOMMatrix().translate(cw * 0.5, ch * 0.5).scale(camera.zoom || 1).translate(-(camera.x || 0) - (camera.leadX || 0) + (camera.shakeX || 0), -(camera.y || 0) + (camera.shakeY || 0))
}
let _scr = null
export function scratchOf(canvas) {
  if (!_scr) { const cv = document.createElement('canvas'); _scr = { cv, g: cv.getContext('2d') } }
  if (_scr.cv.width !== canvas.width || _scr.cv.height !== canvas.height) { _scr.cv.width = canvas.width; _scr.cv.height = canvas.height }
  return _scr
}
// the push-in: re-draw the finished frame scaled Z about screen point (fx, fy), graded with a CSS filter
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
  if (slam > 0) card(c, o.title, W * 0.6, y0 + bh * 0.42, (o.size || 70) * u * slam, '#ffffff', 1, -0.04, o.stroke)
  if (k >= 12) card(c, o.sub, W * 0.62, y0 + bh * 0.8, 26 * u, o.accent, clamp((k - 12) / 5, 0, 1), -0.04, '#000000')
  c.restore()
}
export function subtitle(c, W, H, bar, text, a, u) {
  if (a <= 0.01) return
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.font = `italic 600 ${Math.round(22 * u)}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.lineWidth = 5 * u; c.strokeStyle = '#000000'; c.strokeText(text, W / 2, H - bar - 26 * u); c.fillStyle = '#f2f2f2'; c.fillText(text, W / 2, H - bar - 26 * u); c.restore()
}
export function drawPops(c, M, pops, real, u, col) {
  for (const p of pops) {
    const age = real - p.real; if (age < 0 || age > 50 || !p.amt) continue
    const q = M.transformPoint({ x: p.x, y: p.y })
    const s = (26 + 22 * (p.power || 0.5)) * u * (age < 4 ? 1.5 - age * 0.12 : 1)
    card(c, String(p.amt), q.x + (hash(p.real, 2) - 0.5) * 40 * u, q.y - 30 * u - age * 1.2 * u, s, col, clamp((50 - age) / 12, 0, 1), -0.05, '#000000')
  }
}
export const mat = (c, M) => c.setTransform(M.a, M.b, M.c, M.d, M.e, M.f)
// a jagged lightning bolt between two points (render-only noise)
export function bolt(c, x0, y0, x1, y1, seed, segs, amp, col, wdt, a = 1) {
  c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = wdt; c.lineJoin = 'miter'; c.shadowColor = col; c.shadowBlur = wdt * 4
  c.beginPath(); c.moveTo(x0, y0)
  for (let i = 1; i < segs; i++) { const u = i / segs, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny) || 1, off = (hash(i, seed) - 0.5) * 2 * amp
    c.lineTo(x0 + (x1 - x0) * u + nx / L * off, y0 + (y1 - y0) * u + ny / L * off) }
  c.lineTo(x1, y1); c.stroke(); c.restore()
}
export function glow(c, x, y, r, inner, outer, a = 1) {
  if (r <= 0.5 || a <= 0.01) return
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, inner); g.addColorStop(0.35, outer); g.addColorStop(1, 'rgba(0,0,0,0)')
  c.save(); c.globalAlpha *= a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore()
}

// ── VEGETA ────────────────────────────────────────────────────────────────────────────────────────────────────────
const FF_URL = './vegeta_base_final_flash_ultimate.png'          // the hand-cut Final Flash strip (non-uniform cells)
const FF = [[8, 38], [60, 22], [102, 21], [135, 34], [181, 49], [239, 47], [301, 61], [374, 65], [449, 46], [508, 51], [580, 51],
            [660, 38], [717, 39], [777, 37], [836, 36], [887, 30], [935, 34]]   // [sx, w] — feet on row 78 of a 94-tall strip
const BLUE_CHARGE = { url: './vegeta_blue_charge_up_uniform.png', n: 9, w: 107, h: 117 }
const INTRO = { url: './vegeta_base_intro_uniform.png', n: 5, w: 46, h: 73 }
const EVO = [16, 52, 150, 36, 120, 90]          // hair → deep royal blue (r0, g0, b0, rSpan, gSpan, bSpan)
const view = { z: 1, x: 0, y: 0, last: -1 }
if (typeof Image !== 'undefined') for (const u of [FF_URL, BLUE_CHARGE.url, INTRO.url, './vegeta_mugshot.png']) image(u)

// Vegeta's Final Flash pose i (from the cut strip, Evolution hair)
function ffPose(c, f, i, x, feetY, d, s, o = {}) {
  const [sx, w] = FF[clamp(i, 0, FF.length - 1)]
  const thrust = i >= 11 && i <= 13
  return blitRect(c, skinned(FF_URL, f), sx, 0, w, 94, x, feetY, d, s, { fy: 78, ax: thrust ? 0.36 : undefined, evo: EVO, evoFrac: i >= 4 && i <= 5 ? 0.3 : 0.42, ...o })
}

function draw(ctx, canvas) {
  const sc = vegetaUltScene()
  if (!sc) { view.last = -1; return false }
  const V = VEGETA_CINE, T = V.total
  if (sc.k < V.tf0) { preloadAnim(sc.caster, ['idle', 'charge']); for (const u of [FF_URL, BLUE_CHARGE.url, INTRO.url]) image(skinned(u, sc.caster)) }
  const W = canvas.width, H = canvas.height, u = H / 720
  const f = sc.caster, t = sc.target, k = sc.k, real = sc.real, d = sc.d
  const XF = worldXf(canvas)
  const sp = (x, y) => XF.transformPoint({ x, y })
  const fx = (f.x || 0) + (f.w || 48) / 2, ff = (f.y || 0) + (f.h || 94)
  const tx = (t.x || 0) + (t.w || 48) / 2, tcy = (t.y || 0) + (t.h || 94) * 0.45
  const lastAge = sc.last ? real - sc.last.real : 99, lastPow = sc.last?.power || 0
  // ── 1. push-in ──
  let Z = 1, foc = sp(fx, ff - 70), grade = null
  if (k < V.title) { Z = 1.05 + 0.15 * ease(k / V.title); foc = sp(fx, ff - 70) }
  else if (k < V.flare) { Z = 1.2 + 0.9 * ease(seg(k, V.tf0, V.flare)); foc = sp(fx, ff - 78) }
  else if (k < V.tfEnd) { Z = 2.1 - 0.75 * easeO(seg(k, V.flare, V.tfEnd)); foc = sp(fx, ff - 70) }
  else if (k < V.thrust) { Z = 1.35 + 0.3 * ease(seg(k, V.spread, V.thrust)); foc = sp(fx, ff - 74) }
  else if (k < V.fire) { Z = 1.7; foc = sp(fx + d * 30, ff - 70) }
  else if (k < V.blast) { Z = 1.12 - 0.08 * ease(seg(k, V.fire, V.contact + 10)); foc = sp((fx + tx) / 2 + d * 60, ff - 70) }
  else if (k < V.after) { Z = 1.0; foc = sp(tx + d * 40, ff - 90) }
  else { Z = 1.15 + 0.25 * ease(seg(k, V.after, T)); foc = sp(fx, ff - 76) }
  if (lastAge >= 0 && lastAge < 6) Z += 0.25 * lastPow * (1 - lastAge / 6)
  if (k >= V.flare && k < V.flare + 6) Z += 0.35 * (1 - (k - V.flare) / 6)
  const dark = k < V.fire ? 0.55 * ease(k / 18) * (1 - 0.6 * seg(k, V.flare, V.flare + 10) * (1 - seg(k, V.flare + 10, V.tfEnd))) : k < V.blast ? 0.15 : k < V.after ? 0 : 0.3 * seg(k, V.after, V.after + 20)
  grade = `brightness(${1 - dark}) saturate(${1 - dark * 0.8})${k >= V.fire && k < V.beamOff ? ' contrast(1.15)' : ''}`
  if (view.last < 0) { view.z = Z; view.x = foc.x; view.y = foc.y } else { view.z += (Z - view.z) * 0.28; view.x += (foc.x - view.x) * 0.22; view.y += (foc.y - view.y) * 0.22 }
  view.last = real
  const P = pushIn(ctx, canvas, view.z, view.x, view.y, grade)
  const M = P.multiply(XF)
  const S = (x, y) => M.transformPoint({ x, y })
  // colour wash: night-blue before the shot, a gold blaze while the beam burns
  ctx.save()
  if (k < V.fire) vignette(ctx, W, H, 'rgba(10,20,60,0.08)', `rgba(2,6,24,${0.75 * ease(k / 16)})`)
  else if (k < V.beamOff) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(255,200,80,${0.16 * (1 - seg(k, V.blast + 6, V.beamOff))})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; vignette(ctx, W, H, 'rgba(0,0,0,0)', 'rgba(30,14,0,0.55)') }
  else vignette(ctx, W, H, 'rgba(0,0,0,0)', 'rgba(4,6,18,0.7)')
  ctx.restore()
  // ── 2. world layer ──
  ctx.save(); mat(ctx, M)
  world(ctx, sc, f, t, fx, ff, tx, tcy, k, real, d)
  ctx.restore()
  // ── 3. screen layer ──
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
  screen(ctx, W, H, u, sc, S, f, t, fx, ff, tx, tcy, k, real, d)
  const bar = letterbox(ctx, W, H, k, T, '#3ac8ff', u)
  titleCut(ctx, W, H, k, V.title, u, { band: 'rgba(2,10,34,0.93)', accent: '#3ac8ff', streak: 'rgba(160,220,255,0.45)', portrait: f.portrait || './vegeta_mugshot.png',
    title: 'SUPER SAIYAN BLUE EVOLUTION', sub: 'THE PRINCE OF ALL SAIYANS', stroke: '#0a1a4a', size: 46 })
  drawPops(ctx, M, sc.pops, real, u, '#fff1a8')
  if (k >= T - 56 && sc.dealt > 0) card(ctx, `${Math.round(sc.dealt)} DMG${sc.guarded ? ' (GUARDED)' : ''}`, W * 0.84, bar + 40 * u, 28 * u, '#ffffff', clamp((k - T + 56) / 8, 0, 1) * clamp((T - k) / 10, 0, 1), -0.04, '#000000')
  subs(ctx, W, H, bar, u, k)
  ctx.restore()
  return true
}

// the Evolution aura: deep royal-blue flame tongues rising around his body, a white-cyan rim
function aura(c, x, feetY, k, real, a, big = 1) {
  if (a <= 0.01) return
  c.save(); c.globalCompositeOperation = 'lighter'
  glow(c, x, feetY - 70, 150 * big, 'rgba(120,170,255,0.55)', 'rgba(30,60,220,0.35)', a)
  const n = 22
  for (let layer = 0; layer < 3; layer++) {
    const col = ['28,52,230', '60,140,255', '200,240,255'][layer], al = [0.55, 0.5, 0.5][layer], sc = [1.25, 1.0, 0.7][layer] * big
    const lg = c.createLinearGradient(0, feetY + 6, 0, feetY - 230 * sc)
    lg.addColorStop(0, `rgba(${col},0)`); lg.addColorStop(0.1, `rgba(${col},${al})`); lg.addColorStop(0.6, `rgba(${col},${al})`); lg.addColorStop(1, `rgba(${col},0)`)
    c.fillStyle = lg; c.globalAlpha = a
    for (let i = 0; i < n; i++) {
      const ph = (real * (0.9 + layer * 0.25) + i * 37) % 24 / 24, hx = (i / (n - 1) - 0.5) * 2
      const bx = x + hx * 46 * sc, base = feetY + 4, top = feetY - (90 + 70 * (1 - Math.abs(hx)) + 40 * hash(i, (real >> 2) + layer)) * sc * (0.7 + 0.3 * ph)
      const wdt = (12 + 8 * hash(i + 5, layer)) * sc
      c.beginPath(); c.moveTo(bx - wdt, base); c.quadraticCurveTo(bx - wdt * 0.6 + Math.sin(real * 0.3 + i) * 6, (base + top) / 2, bx + Math.sin(real * 0.21 + i * 2) * 10 * sc, top)
      c.quadraticCurveTo(bx + wdt * 0.6, (base + top) / 2, bx + wdt, base); c.closePath(); c.fill()
    }
  }
  c.restore()
}

function world(c, sc, f, t, fx, ff, tx, tcy, k, real, d) {
  const V = VEGETA_CINE, s = (f.spriteScale ?? 2.1) * GLOBAL
  // rocks lift off the ground while he powers up, then blast outward on the flare
  if (k >= 8 && k < V.tfEnd + 30) {
    c.save()
    for (let i = 0; i < 26; i++) {
      const h1 = hash(i, 71), h2 = hash(i, 73), h3 = hash(i, 79), side = i & 1 ? 1 : -1
      const rx0 = fx + side * (40 + 220 * h1), lift = Math.min(1, Math.max(0, (k - 8 - h2 * 30) / 60))
      let rx = rx0 + Math.sin((k + i * 13) / 9) * 3, ry = ff - 4 - lift * (40 + 140 * h3)
      if (k >= V.flare) { const e = k - V.flare; rx += side * e * (6 + 8 * h2); ry -= e * (3 + 4 * h1) - e * e * 0.12 }
      const r = 3 + 7 * h2, al = k >= V.flare ? 1 - seg(k, V.flare + 10, V.tfEnd + 30) : Math.min(1, lift * 3)
      if (al <= 0) continue
      c.globalAlpha = al; c.fillStyle = '#3a342e'; c.strokeStyle = 'rgba(140,200,255,0.6)'; c.lineWidth = 1
      c.save(); c.translate(rx, ry); c.rotate(k * 0.05 * (h1 - 0.5) + i)
      c.beginPath(); c.moveTo(-r, -r * 0.4); c.lineTo(-r * 0.2, -r); c.lineTo(r, -r * 0.3); c.lineTo(r * 0.6, r * 0.7); c.lineTo(-r * 0.7, r * 0.6); c.closePath(); c.fill(); c.stroke(); c.restore()
    }
    c.restore()
  }
  // ground cracks on the flare, glowing blue, cooling through the shot
  if (k >= V.flare && k < V.blast + 30) {
    const a = 1 - seg(k, V.fire, V.blast + 30), grow = easeO(seg(k, V.flare, V.flare + 8))
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 9; i++) { const side = i & 1 ? 1 : -1, len = (90 + 170 * hash(i, 5)) * grow; bolt(c, fx + side * 8, ff, fx + side * len, ff + 2 + 6 * hash(i, 6), 400 + i, 7, 5, '#5ab8ff', 2.4, a * 0.9) }
    c.restore()
  }
  // the aura (power-up → full Evolution → held through the shot)
  const auraA = k < V.tf0 + 20 ? 0 : k < V.flare ? 0.3 * seg(k, V.tf0 + 20, V.flare) : k < V.fire ? 1 : k < V.beamOff ? 0.75 : k < V.fold ? 0.55 * (1 - seg(k, V.after, V.fold)) : 0.12 + 0.08 * Math.sin(k / 6)
  const auraBig = k >= V.flare && k < V.flare + 14 ? 1.6 - 0.6 * seg(k, V.flare, V.flare + 14) : 1
  aura(c, fx, ff, k, real, auraA, auraBig)
  // flare shockwave rings
  if (k >= V.flare && k < V.flare + 36) {
    const e = k - V.flare
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let r = 0; r < 3; r++) { const rr = (e - r * 4) * 22; if (rr <= 0) continue; c.globalAlpha = 0.85 * (1 - e / 36); c.strokeStyle = r ? '#3ac8ff' : '#ffffff'; c.lineWidth = 10 - r * 3; c.beginPath(); c.ellipse(fx, ff - 60, rr, rr * 0.55, 0, 0, Math.PI * 2); c.stroke() }
    c.restore()
  }
  // ── Vegeta himself ──
  let g = null
  if (k < V.tf0) g = blitAnim(c, f, 'idle', (k >> 3), fx, ff, d, { loop: true })
  else if (k < V.tfEnd) {
    const B = BLUE_CHARGE
    // before the flare: his CURRENT form's own power-up (fists → hands to the head, the scream); the flare reveals the Blue
    if (k < V.flare) g = blitAnim(c, f, 'charge', k < V.tf0 + 14 ? 0 : Math.min(3, 1 + (((k - V.tf0 - 14) / 8) | 0)), fx, ff, d, { ax: 0.5 }) || blitAnim(c, f, 'idle', 0, fx, ff, d)
    if (!g) g = blitSheet(c, skinned(B.url, f), B.n, B.w, B.h, k < V.flare ? 3 : 5 + (((k - V.flare) >> 2) & 3), fx, ff, d, s * 1.02, { ax: 0.5 })
  }
  else if (k < V.thrust) g = ffPose(c, f, ((k - V.spread) / 7 | 0) & 1 ? 5 : 4, fx, ff, d, s)
  else if (k < V.fire) g = ffPose(c, f, 11, fx, ff, d, s)
  else if (k < V.beamOff) g = ffPose(c, f, 12 + (((k - V.fire) >> 2) & 1), fx, ff, d, s)
  else if (k < V.fold) g = ffPose(c, f, 14 + Math.min(2, ((k - V.beamOff) / 7) | 0), fx, ff, d, s)
  else g = blitRect(c, skinned(INTRO.url, f), 0, 0, INTRO.w, INTRO.h, fx, ff, d, s, { evo: EVO, evoFrac: 0.4 })
  if (!g) g = blitAnim(c, f, 'idle', 0, fx, ff, d)
  // the scream: white-hot light pouring off him just before the flare
  if (k >= V.flare - 10 && k < V.flare + 8) { c.save(); c.globalCompositeOperation = 'lighter'; glow(c, fx, ff - 70, 110 + (k - V.flare + 10) * 6, 'rgba(255,255,255,0.7)', 'rgba(120,200,255,0.4)', 0.8 * (1 - seg(k, V.flare, V.flare + 8))); c.restore() }
  // ── Final Flash charge: a ki star in each palm, stage light sucked in ──
  if (k >= V.spread && k < V.fire && g) {
    const hy = g.top + g.height * 0.33, grow = ease(seg(k, V.spread, V.thrust - 10))
    const pts = k < V.thrust ? [g.front - d * 4, g.back + d * 4] : [g.front - d * 2]
    const r = (k < V.thrust ? 6 + 16 * grow : 30) * (1 + 0.12 * Math.sin(real * 1.3))
    c.save(); c.globalCompositeOperation = 'lighter'
    for (const px of pts) {
      glow(c, px, hy, r * 3.4, 'rgba(255,255,230,1)', 'rgba(255,210,60,0.7)')
      glow(c, px, hy, r, 'rgba(255,255,255,1)', 'rgba(255,255,220,0.9)')
      for (let j = 0; j < 4; j++) { const an = hash(j, real >> 1) * Math.PI * 2, L = r * (1.8 + 1.6 * hash(j + 3, real >> 1)); bolt(c, px, hy, px + Math.cos(an) * L, hy + Math.sin(an) * L, real * 7 + j, 5, 4, j & 1 ? '#7fd4ff' : '#fff6b0', 1.8, 0.9) }
    }
    // streams of light pulled into the palms
    for (let i = 0; i < 16; i++) {
      const h1 = hash(i, 91), ph = ((real * (0.03 + 0.02 * h1) + h1) % 1), an = h1 * Math.PI * 2, R0 = 260 * (1 - ph), px = pts[i % pts.length]
      c.globalAlpha = 0.7 * ph * grow; c.strokeStyle = i & 1 ? '#fff3b0' : '#9ad8ff'; c.lineWidth = 2
      c.beginPath(); c.moveTo(px + Math.cos(an) * R0, hy + Math.sin(an) * R0 * 0.7); c.lineTo(px + Math.cos(an) * (R0 + 40), hy + Math.sin(an) * (R0 + 40) * 0.7); c.stroke()
    }
    c.restore()
  }
  // ── THE BEAM ──
  if (k >= V.fire && k < V.beamOff) beam(c, sc, f, t, fx, ff, tx, tcy, k, real, d, s)
  // ── the horizon detonation ──
  const e = k - V.blast
  if (e >= 0 && e < 90) {
    const bx = tx + d * 40, by = ff - 40, R = 60 + 420 * easeO(e / 20), a = e < 30 ? 1 : 1 - seg(e, 30, 90)
    c.save(); c.globalCompositeOperation = 'lighter'
    const gr = c.createRadialGradient(bx, by, 0, bx, by, R); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.35, `rgba(255,236,150,${0.95 * a})`); gr.addColorStop(0.7, `rgba(255,150,40,${0.6 * a})`); gr.addColorStop(1, 'rgba(255,90,0,0)')
    c.fillStyle = gr; c.beginPath(); c.arc(bx, by, R, Math.PI, 0); c.lineTo(bx + R, ff + 20); c.lineTo(bx - R, ff + 20); c.closePath(); c.fill()
    for (let r = 0; r < 4; r++) { const rr = (e - r * 5) * 30; if (rr <= 0) continue; c.globalAlpha = 0.8 * (1 - e / 60) ; c.strokeStyle = r & 1 ? '#ffd23a' : '#ffffff'; c.lineWidth = 12 - r * 2; c.beginPath(); c.ellipse(bx, ff - 6, rr, rr * 0.22, 0, 0, Math.PI * 2); c.stroke() }
    // a pillar of light into the sky
    c.globalAlpha = 0.85 * (1 - seg(e, 8, 50)); const pw = 70 * easeO(e / 6); const pg = c.createLinearGradient(bx - pw, 0, bx + pw, 0); pg.addColorStop(0, 'rgba(255,220,120,0)'); pg.addColorStop(0.5, 'rgba(255,255,240,1)'); pg.addColorStop(1, 'rgba(255,220,120,0)')
    c.fillStyle = pg; c.fillRect(bx - pw, ff - 2400, pw * 2, 2400)
    c.restore()
    // debris thrown out
    c.save(); c.fillStyle = '#2a2420'
    for (let i = 0; i < 30; i++) { const h1 = hash(i, 211), h2 = hash(i, 223), an = Math.PI * (1.05 + 0.9 * h1), v = 10 + 16 * h2
      const px = bx + Math.cos(an) * v * e, py = by + Math.sin(an) * v * e + 0.35 * e * e; if (py > ff + 10) continue
      c.globalAlpha = 1 - seg(e, 30, 70); c.fillRect(px, py, 4 + 6 * h2, 4 + 5 * h1) }
    c.restore()
  }
  // smoke over the trench
  if (k >= V.blast + 20) {
    const a = seg(k, V.blast + 20, V.blast + 40) * (1 - seg(k, V.blast + 40, V.fold + 10)) * 0.32
    c.save()
    for (let i = 0; i < 9; i++) { const h1 = hash(i, 301), h2 = hash(i, 307), px = tx + d * 30 + (h1 - 0.5) * 360 + (k - V.blast) * 0.4 * (h2 - 0.5), py = ff - 20 - h2 * 120 - (k - V.blast) * 0.35
      const g2 = c.createRadialGradient(px, py, 0, px, py, 50 + 40 * h1); g2.addColorStop(0, `rgba(120,104,92,${a})`); g2.addColorStop(1, 'rgba(120,104,92,0)'); c.fillStyle = g2; c.fillRect(px - 100, py - 100, 200, 200) }
    c.restore()
  }
}

// the stage-wide Final Flash: a white core in a gold body, a flickering corona, jagged edges, spiral rings riding out, blue
// Evolution lightning crawling along it — drawn from his palms to far past the edge of the world
function beam(c, sc, f, t, fx, ff, tx, tcy, k, real, d, s) {
  const V = VEGETA_CINE
  const ox = fx + d * 46 * (s / 2.48), oy = ff - 92 * (s / 2.48)
  const reach = Math.abs(tx - ox) + 30
  const L = k < V.contact ? reach * easeO(seg(k, V.fire, V.contact)) : reach + 2800 * easeO(seg(k, V.contact, V.contact + 10))
  const fade = 1 - seg(k, V.blast + 4, V.beamOff)
  const R = (k < V.contact ? 44 : 64 + 12 * seg(k, V.contact, V.blast)) * (1 + 0.07 * Math.sin(real * 1.7)) * (0.35 + 0.65 * fade)
  c.save(); c.translate(ox, oy); if (d < 0) c.scale(-1, 1)
  c.globalCompositeOperation = 'lighter'
  // corona
  const cg = c.createLinearGradient(0, -R * 2.6, 0, R * 2.6); cg.addColorStop(0, 'rgba(255,180,40,0)'); cg.addColorStop(0.5, `rgba(255,200,70,${0.55 * fade})`); cg.addColorStop(1, 'rgba(255,180,40,0)')
  c.fillStyle = cg; c.fillRect(0, -R * 2.6, L, R * 5.2)
  // jagged gold body + inner + core
  const layer = (rad, col, jag, sd) => {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, -rad * 0.7)
    for (let x = 0; x <= L; x += 26) c.lineTo(x, -rad * (1 + jag * (hash(x / 26 | 0, (real >> 1) + sd) - 0.5)))
    c.lineTo(L, 0)
    for (let x = L; x >= 0; x -= 26) c.lineTo(x, rad * (1 + jag * (hash(x / 26 | 0, (real >> 1) + sd + 9) - 0.5)))
    c.lineTo(0, rad * 0.7); c.closePath(); c.fill()
  }
  c.globalAlpha = fade; layer(R, 'rgba(255,196,40,0.85)', 0.35, 1); layer(R * 0.68, 'rgba(255,240,170,0.95)', 0.2, 2); layer(R * 0.34, 'rgba(255,255,255,1)', 0.1, 3)
  // spiral rings riding out along the beam
  c.strokeStyle = 'rgba(255,255,220,0.8)'; c.lineWidth = 3
  for (let i = 0; i < 8; i++) { const x = ((real * 26 + i * 170) % Math.max(200, L)); if (x > L) continue; c.globalAlpha = 0.7 * fade; c.beginPath(); c.ellipse(x, 0, R * 0.22, R * 1.25, 0, 0, Math.PI * 2); c.stroke() }
  // Evolution lightning crawling on it
  for (let i = 0; i < 4; i++) { const x0 = hash(i, real >> 2) * Math.min(L, 900), x1 = x0 + 120 + 140 * hash(i + 4, real >> 2), sgn = i & 1 ? 1 : -1
    bolt(c, x0, sgn * R * 0.9, Math.min(L, x1), sgn * R * (0.6 + 0.6 * hash(i, 5)), real * 13 + i, 8, 10, '#7fd4ff', 2.2, fade) }
  // the muzzle: a blazing star at his palms
  glow(c, 0, 0, R * 3.4, 'rgba(255,255,255,1)', 'rgba(255,220,90,0.8)', fade)
  c.globalAlpha = fade; c.fillStyle = 'rgba(255,255,255,0.9)'
  for (let i = 0; i < 10; i++) { const an = (i / 10) * Math.PI * 2 + real * 0.08, l = R * (2 + 1.6 * hash(i, real >> 1)); c.beginPath(); c.moveTo(Math.cos(an - 0.08) * R * 0.6, Math.sin(an - 0.08) * R * 0.6); c.lineTo(Math.cos(an) * l, Math.sin(an) * l); c.lineTo(Math.cos(an + 0.08) * R * 0.6, Math.sin(an + 0.08) * R * 0.6); c.fill() }
  // the head before contact
  if (k < V.contact + 2) glow(c, L, 0, R * 2.6, 'rgba(255,255,255,1)', 'rgba(255,210,70,0.85)')
  c.restore()
  // the splash where it meets the foe: light and sparks thrown back past them
  if (k >= V.contact && k < V.blast + 4) {
    const a = fade
    c.save(); c.globalCompositeOperation = 'lighter'
    glow(c, tx - d * 10, tcy, 110 + 20 * Math.sin(real), 'rgba(255,255,255,0.95)', 'rgba(255,200,60,0.7)', a)
    for (let i = 0; i < 14; i++) { const h1 = hash(i, real >> 1), h2 = hash(i + 7, real >> 1), an = (h1 - 0.5) * 1.6, v = 60 + 120 * h2
      c.globalAlpha = 0.9 * a; c.strokeStyle = i & 1 ? '#ffffff' : '#ffd23a'; c.lineWidth = 3; c.beginPath(); c.moveTo(tx, tcy); c.lineTo(tx + d * Math.cos(an) * v, tcy + Math.sin(an) * v); c.stroke() }
    c.restore()
  }
}

function screen(c, W, H, u, sc, S, f, t, fx, ff, tx, tcy, k, real, d) {
  const V = VEGETA_CINE
  // the transformation: ki lightning crawling over the frame, speed lines into him
  if (k >= V.tf0 && k < V.flare) {
    const a = seg(k, V.tf0, V.flare), p = S(fx, ff - 70)
    speedLines(c, W, H, p.x, p.y, 0.22 * a, k >> 2, 54, '#9ad8ff')
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 3 + (a * 5 | 0); i++) { const an = hash(i, real >> 1) * Math.PI * 2, r0 = 70 * u, r1 = (180 + 260 * hash(i + 3, real >> 1)) * u
      bolt(c, p.x + Math.cos(an) * r0, p.y + Math.sin(an) * r0, p.x + Math.cos(an) * r1, p.y + Math.sin(an) * r1, real * 5 + i, 9, 16 * u, '#bfe8ff', 2.6 * u, 0.8 * a) }
    c.restore()
  }
  // THE FLARE: white → inverted, then a royal-blue wash
  if (k >= V.flare) impactFrame(c, W, H, sc.real - (sc.flareReal ?? 1e9), 2, '#1a3cff', 0.5)
  if (k >= V.flare + 4 && k < V.tfEnd + 6) {
    const e = k - V.flare - 4, a = clamp((V.tfEnd + 6 - k) / 8, 0, 1)
    card(c, 'EVOLUTION', W / 2, H * 0.3, 110 * u * (e < 6 ? 1.9 - 0.9 * easeO(e / 6) : 1), '#e8f6ff', a, -0.05, '#0a1a6a')
    if (e >= 8) card(c, 'I AM THE PRINCE OF ALL SAIYANS!', W / 2, H * 0.42, 34 * u, '#7fd4ff', a * seg(e, 8, 14), -0.04, '#000000')
  }
  // charge: light pulled across the frame into his palms
  if (k >= V.spread && k < V.fire) {
    const p = S(fx + d * 20, ff - 80), a = seg(k, V.spread, V.thrust)
    speedLines(c, W, H, p.x, p.y, 0.18 + 0.2 * a, real >> 1, 60, '#fff3c0')
    if (k >= V.spread + 8) card(c, 'FINAL…', W * (d > 0 ? 0.26 : 0.74), H * 0.3, 64 * u * (1 + 0.04 * Math.sin(real * 0.9)), '#fff1a8', seg(k, V.spread + 8, V.spread + 14) * (1 - seg(k, V.thrust, V.fire)), -0.06, '#4a2a00')
  }
  // FIRE: impact frame, the call-out slammed in
  if (k >= V.fire) { const e = sc.real - (sc.fireReal ?? 1e9); impactFrame(c, W, H, e, 2, '#ffd23a', 0.45)
    if (e >= 2 && k < V.blast) card(c, 'FINAL FLASH!!', W / 2, H * 0.24, 104 * u * (e < 8 ? 1.9 - 0.9 * easeO((e - 2) / 6) : 1), '#ffffff', clamp((V.blast - k) / 8, 0, 1), -0.05, '#7a4a00') }
  if (sc.last?.tag === 'contact') { const e = sc.real - sc.last.real, p = S(tx, tcy); if (e < 16) speedLines(c, W, H, p.x, p.y, 0.4 * (1 - e / 16), 17, 50) }
  // the detonation
  if (sc.last?.tag === 'blast') {
    const e = sc.real - sc.last.real
    impactFrame(c, W, H, e, 3, '#ffb020', 0.55)
    if (e >= 3 && e < 70) { const p = S(tx, tcy); speedLines(c, W, H, p.x, p.y, 0.45 * (1 - e / 70), 31, 64, '#fff6d0') }
  }
  if (k >= V.after) card(c, 'REMEMBER IT WELL.', W / 2, H * 0.24, 50 * u, '#dff2ff', seg(k, V.fold, V.fold + 8) * clamp((V.total - k) / 10, 0, 1), -0.04, '#0a1a4a')
}
function subs(c, W, H, bar, u, k) {
  const V = VEGETA_CINE
  const line = (a, b, s) => { if (k >= a && k < b) subtitle(c, W, H, bar, s, seg(k, a, a + 6) * (1 - seg(k, b - 6, b)), u) }
  line(V.tf0 + 4, V.flare - 2, '“Are you brave enough to take this one?”')
  line(V.spread + 4, V.thrust, '“Witness the pride of a Saiyan — at full power!”')
  line(V.fold + 6, V.total - 2, '“This isn’t even the full extent of my power.”')
}

registerCineScreen('vegeta_ult', draw)
