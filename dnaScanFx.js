// dnaScanFx.js — RENDER ONLY for the DNA-scan system (dnaScan.js owns the simulation) + Chrollo's Skill Hunter look.
// Import-light leaf (sprite.js imports it): cineRegistry + camera only.
//   • dnaSchemeSheet(f, path, img)  — whole-sheet recolor of the COPIED body into the copier's own colour scheme
//     (Ben black/green/white, Albedo black/red/white, Kevin steel/gunmetal + green glint, Chrollo deep purple/lavender).
//     Luminance → 5-stop ramp, alpha kept, same size/layout → slicing unchanged. Built off-frame (≤1 sheet / 14 ms), LRU.
//   • drawDnaEmblem(ctx, f, …)       — the copier's badge on the copied body: Omnitrix / Ultimatrix on the chest,
//     Plumber badge (Kevin), Chrollo's forehead cross. Placed from the drawn frame's opaque bounding box.
//   • screen pass (registerCineScreen 'dna_scan') — scan cinematic, morph cinematic, revert pulse, the "U + L" DNA chip.
//   • drawChrolloBookOverlay(…)     — Skill Hunter cinematic dressing (letterbox, Bandit's Secret opening, stolen page).
// No Math.random: every variation is hash(i, …). Nothing here is read by the simulation.
import { registerCineScreen } from './cineRegistry.js'
import { camera } from './camera.js'
import { OMNI_SCHEME, isOmniSkin, omniRecolor, omniAnalyze } from './omniTheme.js'   // the roster-wide OMNITRIX theme skin (+ Ben's DNA copies wear it)

export const DNA_SCHEMES = {
  ben:     { ramp: ['#050806', '#0d2a10', '#22b322', '#9dff8f', '#ffffff'], glow: '#39ff3a', deep: '#0b3d0b', emblem: 'omnitrix', device: 'OMNITRIX',   verb: 'NEW DNA SAMPLE ACQUIRED' },
  albedo:  { ramp: ['#070304', '#3a070c', '#c8141f', '#ff9a9a', '#ffffff'], glow: '#ff2a35', deep: '#4a0509', emblem: 'ultimatrix', device: 'ULTIMATRIX', verb: 'DNA SAMPLE ACQUIRED' },
  kevin:   { ramp: ['#07080b', '#262a31', '#6f7a86', '#c3ccd6', '#eafff0'], glow: '#7dff9a', deep: '#1d2229', emblem: 'plumber',  device: 'OSMOSIAN',   verb: 'DNA ABSORBED' },
  omni:    OMNI_SCHEME,
  chrollo: { ramp: ['#06030c', '#251040', '#6a3bbd', '#c6abff', '#f6f0ff'], glow: '#a78bfa', deep: '#2a1050', emblem: 'cross',    device: 'SKILL HUNTER', verb: 'ABILITY STOLEN' },
}
export function dnaSchemeOf(f) {
  if (!f) return null
  if (f._dnaScheme) return f._dnaScheme === 'ben' ? 'omni' : f._dnaScheme   // Ben's copy of the foe wears the foe's Omnitrix skin
  if (f._shActive) return 'chrollo'
  if (isOmniSkin(f)) return 'omni'
  return null
}

// ── the scene the simulation publishes (dnaScan.js writes, this file reads) ─────────────────────────────────────────
export const DNA_SCENE = { active: false, kind: null, k: 0, total: 0, caster: null, target: null, scheme: 'ben', name: '', portrait: null, swapAt: 0, lockAt: 0 }
export const DNA_PULSES = []   // { f, scheme, k, total } — revert / timeout flashes (render-only life)
export const DNA_FIGHTERS = new Set()   // fighters with a _dna state (for the chip)

const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const seg = (k, a, b) => clamp((k - a) / Math.max(1, b - a), 0, 1)
const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
const easeOut = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) }
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const rgba = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})` }

// ── 1) sheet recolor ─────────────────────────────────────────────────────────────────────────────────────────────────
// The body is re-tailored as an alien suit in the wearer's device colours (omniTheme.omniRecolor: suit / accent / trim, hair,
// skin, outline and technique FX kept). The colour DECISION comes from the character's idle frame and is shared by every
// sheet, so nothing changes colour between moves. Built off-frame (≤1 sheet / 14 ms), LRU-capped.
const PAL_OF = { omni: 'omni', ben: 'omni', albedo: 'albedo', kevin: 'kevin', chrollo: 'chrollo' }
const SHEETS = new Map()      // key → canvas (LRU by insertion)
const REFS = new Map()        // idle sheet path → omniAnalyze result (null while loading)
const REF_IMG = new Map()
let _px = 0, _lastBuild = -1e9
const SHEET_PX_CAP = 48e6
const _now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())
const _ok = im => !!(im && im.complete && im.naturalWidth > 0)
function pixelsOf(img) {
  const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0)
  return { cv, g, data: g.getImageData(0, 0, cv.width, cv.height) }
}
// the character's colour decision, from its idle frame (the sheet being drawn IS the idle sheet → used directly)
function refFor(f, path, img) {
  const A = f._skinAnim || f.animationData || {}, idle = A.idle || A.stand || null
  const ipath = idle?.sheet || path
  if (REFS.has(ipath) && REFS.get(ipath)) return { ipath, ref: REFS.get(ipath) }
  let im = ipath === path ? img : REF_IMG.get(ipath)
  if (!im && typeof Image !== 'undefined') { im = new Image(); im.src = ipath; REF_IMG.set(ipath, im) }
  if (!_ok(im)) return null
  const { data } = pixelsOf(im)
  const ref = omniAnalyze(data.data, data.width, data.height, idle?.width || idle?.frameWidth || 0, idle?.height || idle?.frameHeight || 0)
  REFS.set(ipath, ref)
  return ref ? { ipath, ref } : null
}
function buildSheet(img, id, ref, cell) {
  const { cv, g, data } = pixelsOf(img)
  omniRecolor(data.data, cv.width, cv.height, ref, PAL_OF[id] || 'omni', cell)
  g.putImageData(data, 0, 0)
  cv.complete = true; cv.naturalWidth = cv.width; cv.naturalHeight = cv.height   // the renderer checks sheets with img.complete / naturalWidth
  return cv
}
export function dnaSchemeSheet(f, path, img) {
  const id = dnaSchemeOf(f)
  if (!id || !path || !_ok(img) || typeof document === 'undefined') { if (f) f._dnaSheetLive = false; return null }
  const R = refFor(f, path, img)
  if (!R) { f._dnaSheetLive = false; return null }       // the idle reference is still loading (a frame or two)
  const key = id + '|' + path + '|' + R.ipath
  let cv = SHEETS.get(key)
  if (cv && cv.naturalWidth !== img.naturalWidth) { SHEETS.delete(key); cv = null }
  if (cv) { SHEETS.delete(key); SHEETS.set(key, cv); f._dnaSheetLive = true; return cv }
  const t = _now()
  if (t - _lastBuild < 14) { f._dnaSheetLive = false; return null }   // budget: at most one build per frame-ish
  _lastBuild = t
  // the frame cell of this sheet (from the animation that uses it) → each frame's head is kept as drawn
  const A = f._skinAnim || f.animationData || {}, def = Object.values(A).find(a => a && a.sheet === path)
  const cell = def ? { fw: def.width || def.frameWidth || 0, fh: def.height || def.frameHeight || 0 } : null
  try { cv = buildSheet(img, id, R.ref, cell) } catch (_) { f._dnaSheetLive = false; return null }
  SHEETS.set(key, cv); _px += cv.width * cv.height
  for (const [k, c] of SHEETS) { if (_px <= SHEET_PX_CAP || k === key) break; SHEETS.delete(k); _px -= c.width * c.height }
  f._dnaSheetLive = true
  return cv
}

// ── 2) emblem on the copied body ─────────────────────────────────────────────────────────────────────────────────────
// WHERE: per frame, from the frame's own pixels (cached): the head (top of the silhouette) → the face (skin pixels near it;
// skin is never recoloured) → the chest half a head below the chin, centred on the torso run of that row (an outstretched
// arm can't drag it sideways). Masked fighters (no skin): the head's own width / height. Chrollo's cross: the forehead.
const CHEST = new WeakMap()
let _bbCv = null
const isSkinPx = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d || mx < 107) return false
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; const sat = d / mx; return h >= 8 && h <= 45 && sat >= 0.12 && sat <= 0.58 }
function chestOf(sheet, sx, sy, w, h) {
  let m = CHEST.get(sheet); if (!m) { m = new Map(); CHEST.set(sheet, m) }
  const key = sx + ',' + sy + ',' + w + ',' + h
  if (m.has(key)) return m.get(key)
  let out = null
  try {
    const c = _bbCv || (_bbCv = document.createElement('canvas'))
    if (c.width < w) c.width = w; if (c.height < h) c.height = h
    const g = c.getContext('2d', { willReadFrequently: true }); g.clearRect(0, 0, c.width, c.height); g.drawImage(sheet, sx, sy, w, h, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data, A = (x, y) => d[(y * w + x) * 4 + 3] > 40
    let x0 = w, y0 = h, x1 = -1, y1 = -1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (A(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    if (x1 >= 0) {
      const bh = y1 - y0 + 1
      // the head: the topmost opaque rows → its centre column and width
      let tx = 0, tn = 0
      for (let y = y0; y < Math.min(y1, y0 + 3); y++) for (let x = x0; x <= x1; x++) if (A(x, y)) { tx += x; tn++ }
      const topX = tn ? tx / tn : (x0 + x1) / 2
      const runAt = (y, cx) => { let a = Math.round(cx), b = a; if (!A(a, y)) { let best = -1; for (let k = 1; k < w; k++) { if (a - k >= 0 && A(a - k, y)) { best = a - k; break } if (a + k < w && A(a + k, y)) { best = a + k; break } } if (best < 0) return null; a = b = best }
        while (a > 0 && A(a - 1, y)) a--; while (b < w - 1 && A(b + 1, y)) b++; return [a, b] }
      const hr = runAt(Math.min(y1, y0 + Math.max(2, Math.round(bh * 0.08))), topX)
      const headW = hr ? Math.max(4, Math.min(hr[1] - hr[0] + 1, bh * 0.3)) : Math.max(4, bh * 0.16)
      // the face: skin pixels in the upper body close to the head column
      let fx = 0, fn = 0, fTop = h, fBot = -1
      const lim = y0 + bh * 0.42
      for (let y = y0; y <= lim; y++) for (let x = Math.max(0, Math.round(topX - headW)); x <= Math.min(w - 1, Math.round(topX + headW)); x++) {
        const o = (y * w + x) * 4; if (d[o + 3] > 40 && isSkinPx(d[o], d[o + 1], d[o + 2])) { fx += x; fn++; if (y < fTop) fTop = y }
      }
      // the torso's centre line: median opaque column of the chest band (arms/legs/fists are the minority there)
      const xs = []
      for (let y = Math.round(y0 + bh * 0.22); y <= Math.round(y0 + bh * 0.46); y++) for (let x = x0; x <= x1; x++) if (A(x, y)) xs.push(x)
      xs.sort((a, b) => a - b)
      const torsoX = xs.length ? xs[xs.length >> 1] : (x0 + x1) / 2
      let cx = topX, chin, headH, faceH = 0
      if (fn >= 4 && Math.abs(fx / fn - torsoX) > headW * 1.3) fn = 0     // "face" skin far from the torso = a fist / a foot
      if (fn >= 4) {
        // the face ends where the skin run under the head column stops (a bare torso below it is NOT face)
        const fcx = fx / fn; let y = fTop, last = fTop
        for (; y <= Math.min(y1, fTop + headW * 1.3); y++) { let hit = false; for (let x = Math.round(fcx - headW * 0.35); x <= Math.round(fcx + headW * 0.35); x++) { const o = (y * w + x) * 4; if (x >= 0 && x < w && d[o + 3] > 40 && isSkinPx(d[o], d[o + 1], d[o + 2])) { hit = true; break } } if (hit) last = y }
        chin = Math.min(last, fTop + headW * 0.95); headH = Math.max(3, chin - y0 + 1); faceH = chin - fTop + 1; cx = fcx
      } else { headH = Math.max(4, headW * 1.05); chin = y0 + headH }
      // the drop below the chin comes from the FACE (tall hair must not push the badge to the belly), at least half a head
      let cy = faceH ? chin + Math.max(2, faceH * 0.62, headW * 0.45) : y0 + bh * 0.3      // masked: 30% down the body
      cy = Math.max(y0 + bh * 0.2, Math.min(y0 + bh * 0.48, cy, y1 - 2))
      if (!faceH) cx = torsoX
      cx = Math.max(torsoX - headW * 0.6, Math.min(torsoX + headW * 0.6, cx))
      const run = runAt(Math.round(cy), cx)
      if (run) { const mid = (run[0] + run[1]) / 2; cx = Math.max(cx - headW * 0.35, Math.min(cx + headW * 0.35, mid)) }
      const r = Math.max(2.5, Math.min(9, headW * 0.34, run ? (run[1] - run[0] + 1) * 0.32 : 9))
      out = { cx, cy, r, fx: cx, fy: y0 + headH * 0.32, headW }
    }
  } catch (_) { out = null }
  m.set(key, out)
  return out
}
// WHAT: the badge drawn PIXEL BY PIXEL at the sprite's own resolution (then scaled up crisp, like the sprite) — a shaded
// silver bezel, black dial and the device's hourglass, so it reads as part of the suit, not a sticker on top of it.
const BADGES = new Map()
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
function badgeSprite(kind, R, glow) {
  const key = kind + '|' + R + '|' + glow
  if (BADGES.has(key)) return BADGES.get(key)
  const N = R * 2 + 1, cv = document.createElement('canvas'); cv.width = N; cv.height = N
  const g = cv.getContext('2d'), img = g.createImageData(N, N), D = img.data, G = hexRgb(glow)
  const put = (x, y, c, a = 255) => { const o = (y * N + x) * 4; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = a }
  const shade = (c, k) => c.map(v => Math.max(0, Math.min(255, v * k)))
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = x - R, py = y - R, dist = Math.hypot(px, py)
    if (kind === 'cross') {   // Chrollo: the forehead cross (a tattoo — no bezel)
      const vx = Math.abs(px) <= Math.max(0.5, R * 0.18), vy = Math.abs(py) <= R
      const hx = Math.abs(px) <= R * 0.62, hy = Math.abs(py + R * 0.3) <= Math.max(0.5, R * 0.16)
      if ((vx && vy) || (hx && hy)) put(x, y, shade(G, py < 0 ? 1.1 : 0.85))
      continue
    }
    if (dist > R + 0.25) continue
    const light = 1.18 - 0.42 * ((py - px * 0.5) / (R * 1.4) + 0.5)          // lit from the upper left
    if (kind === 'plumber') {      // Kevin: the Plumber badge — steel hexagon, black dial, green core + bar
      const hex = Math.max(Math.abs(px) * 0.866 + Math.abs(py) * 0.5, Math.abs(py)) <= R
      if (!hex) continue
      if (dist > R * 0.68) put(x, y, shade([150, 160, 172], light))
      else if (dist <= R * 0.3 || (Math.abs(px) <= Math.max(0.5, R * 0.1) && Math.abs(py) <= R * 0.6)) put(x, y, shade(G, light))
      else put(x, y, [14, 18, 22])
      continue
    }
    if (dist > R - 0.9) { put(x, y, shade([206, 214, 210], light)); continue }   // silver bezel
    if (dist > R - 1.7 && R >= 4) { put(x, y, [10, 12, 11]); continue }            // black ring
    const ir = R - (R >= 4 ? 1.7 : 0.9), ay = Math.abs(py), ax = Math.abs(px)
    const hour = ay <= ir * 0.78 && ax <= 0.55 + (ay / (ir * 0.78)) * ir * 0.62   // the hourglass: narrow waist, wide ends
    put(x, y, hour ? shade(G, 0.72 + 0.4 * (1 - (py + ir) / (2 * ir))) : [8, 11, 9])
  }
  g.putImageData(img, 0, 0)
  BADGES.set(key, cv)
  return cv
}
export function drawDnaEmblem(ctx, f, sheet, sx, sy, w, h, flipped) {
  const id = dnaSchemeOf(f); if (!id || !sheet) return
  const S = DNA_SCHEMES[id], P = chestOf(sheet, sx, sy, w, h); if (!P) return
  const sc = (f._lastDrawW || w) / w
  const cross = S.emblem === 'cross'
  const lx = flipped ? (w - 1 - (cross ? P.fx : P.cx)) : (cross ? P.fx : P.cx), ly = cross ? P.fy : P.cy
  const R = Math.max(2, Math.round(cross ? P.headW * 0.2 : P.r))
  const kind = S.emblem === 'plumber' ? 'plumber' : cross ? 'cross' : 'dial'
  const spr = badgeSprite(kind, R, S.glow)
  const x = (f._lastDrawX || 0) + (lx + 0.5) * sc, y = (f._lastDrawY || 0) + (ly + 0.5) * sc
  const t = (f._dna?.t || f._shTimer || (f._omniT = (f._omniT || 0) + 1)), pulse = 0.5 + 0.5 * Math.sin(t * 0.12)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  const half = (R + 0.5) * sc
  // a soft device glow behind the dial (the hourglass "breathes"), then the crisp badge
  ctx.globalAlpha *= 0.28 + 0.22 * pulse
  const gr = ctx.createRadialGradient(x, y, 0, x, y, half * 2.1); gr.addColorStop(0, S.glow); gr.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gr; ctx.fillRect(x - half * 2.1, y - half * 2.1, half * 4.2, half * 4.2)
  ctx.globalAlpha = Math.min(1, ctx.globalAlpha / (0.28 + 0.22 * pulse)) * 0.97
  ctx.drawImage(spr, x - half, y - half, half * 2, half * 2)
  ctx.restore()
}
function hourglass(c, r, fill) {
  c.fillStyle = fill; c.beginPath()
  c.moveTo(-r * 0.62, -r * 0.72); c.lineTo(r * 0.62, -r * 0.72); c.lineTo(r * 0.1, 0); c.lineTo(r * 0.62, r * 0.72); c.lineTo(-r * 0.62, r * 0.72); c.lineTo(-r * 0.1, 0); c.closePath(); c.fill()
}
export function drawEmblemShape(c, kind, r, S, pulse = 0) {
  c.save()
  c.shadowColor = S.glow; c.shadowBlur = r * (0.9 + pulse)
  if (kind === 'omnitrix' || kind === 'ultimatrix') {
    c.fillStyle = '#0a0a0a'; c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill()
    c.lineWidth = r * 0.2; c.strokeStyle = kind === 'ultimatrix' ? '#d9d9d9' : '#e8e8e8'; c.stroke()
    c.shadowBlur = r * 0.6; hourglass(c, r * 0.86, S.glow)
  } else if (kind === 'plumber') {
    c.fillStyle = '#9aa4b0'; c.beginPath()
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r) } c.closePath(); c.fill()
    c.shadowBlur = r * 0.5; c.fillStyle = '#101418'; c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.fill()
    c.fillStyle = S.glow; c.beginPath(); c.arc(0, 0, r * 0.3, 0, Math.PI * 2); c.fill()
    c.fillRect(-r * 0.08, -r * 0.62, r * 0.16, r * 1.24)
  } else if (kind === 'cross') {
    c.fillStyle = S.glow
    c.fillRect(-r * 0.16, -r * 0.8, r * 0.32, r * 1.6); c.fillRect(-r * 0.56, -r * 0.4, r * 1.12, r * 0.3)
  }
  c.restore()
}
// ── 3) screen pass ───────────────────────────────────────────────────────────────────────────────────────────────────
function W2S(wx, wy, W, H) {
  const z = camera.zoom || 1
  return { x: (wx - (camera.x || 0) - (camera.leadX || 0) + (camera.shakeX || 0)) * z + W / 2, y: (wy - (camera.y || 0) + (camera.shakeY || 0)) * z + H / 2, s: z }
}
const IMG = new Map()
function image(src) { if (!src || typeof Image === 'undefined') return null; let im = IMG.get(src); if (!im) { im = new Image(); im.src = src; IMG.set(src, im) } return im }
const ready = im => !!(im && im.complete && im.naturalWidth > 0)
export const dnaPreload = src => { image(src) }   // warm a portrait before its cinematic needs it
function body(f) { // world-space drawn rect (falls back to the physics box)
  const x = f._lastDrawX ?? f.x, y = f._lastDrawY ?? f.y, w = f._lastDrawW ?? (f.w || 60), h = f._lastDrawH ?? (f.h || 100)
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2, top: y + h * 0.12, bot: y + h }
}
function letterbox(c, W, H, a) { if (a <= 0) return; const bh = H * 0.11 * a; c.fillStyle = '#000'; c.fillRect(0, 0, W, bh); c.fillRect(0, H - bh, W, bh) }
function title(c, W, H, text, sub, S, a, y = 0.2) {
  if (a <= 0) return
  c.save(); c.globalAlpha = a; c.textAlign = 'center'; c.textBaseline = 'middle'
  const fs = Math.round(Math.min(W, H * 1.8) * 0.045)
  c.font = `900 ${fs}px "Arial Black", Impact, sans-serif`
  c.lineWidth = fs * 0.16; c.strokeStyle = '#000'; c.strokeText(text, W / 2, H * y)
  c.shadowColor = S.glow; c.shadowBlur = fs * 0.6; c.fillStyle = '#fff'; c.fillText(text, W / 2, H * y)
  if (sub) { c.shadowBlur = fs * 0.3; c.font = `800 ${Math.round(fs * 0.48)}px "Arial Black", Impact, sans-serif`; c.fillStyle = S.glow; c.strokeText(sub, W / 2, H * y + fs * 0.95); c.fillText(sub, W / 2, H * y + fs * 0.95) }
  c.restore()
}
function helix(c, cx, y0, y1, amp, phase, S, a, lw) {
  const n = 28
  for (let strand = 0; strand < 2; strand++) {
    c.beginPath()
    for (let i = 0; i <= n; i++) { const u = i / n, y = y0 + (y1 - y0) * u, x = cx + Math.sin(u * Math.PI * 4 + phase + strand * Math.PI) * amp; i ? c.lineTo(x, y) : c.moveTo(x, y) }
    c.strokeStyle = rgba(strand ? '#ffffff' : S.glow, a); c.lineWidth = lw; c.stroke()
  }
  for (let i = 0; i <= n; i += 2) {
    const u = i / n, y = y0 + (y1 - y0) * u, s = Math.sin(u * Math.PI * 4 + phase)
    c.strokeStyle = rgba(S.glow, a * 0.5 * Math.abs(Math.cos(u * Math.PI * 4 + phase)))
    c.lineWidth = lw * 0.6; c.beginPath(); c.moveTo(cx + s * amp, y); c.lineTo(cx - s * amp, y); c.stroke()
  }
}
function portraitCard(c, W, H, S, name, src, a, fromRight) {
  if (a <= 0) return
  const cw = Math.min(W * 0.34, 380), ch = cw * 0.36, slide = (1 - easeOut(a)) * (fromRight ? 1 : -1) * W * 0.4
  const x = (fromRight ? W - cw - W * 0.04 : W * 0.04) + slide, y = H * 0.66
  c.save(); c.globalAlpha = Math.min(1, a * 1.4)
  c.fillStyle = 'rgba(0,0,0,0.78)'; c.strokeStyle = S.glow; c.lineWidth = 3
  c.beginPath(); c.moveTo(x + 16, y); c.lineTo(x + cw, y); c.lineTo(x + cw - 16, y + ch); c.lineTo(x, y + ch); c.closePath(); c.fill(); c.stroke()
  const im = image(src)
  if (ready(im)) {
    c.save(); c.beginPath(); c.rect(x + 18, y + 6, ch - 12, ch - 12); c.clip()
    const s = Math.max((ch - 12) / im.naturalWidth, (ch - 12) / im.naturalHeight)
    c.drawImage(im, x + 18 + (ch - 12 - im.naturalWidth * s) / 2, y + 6, im.naturalWidth * s, im.naturalHeight * s)
    c.restore(); c.strokeStyle = rgba(S.glow, 0.8); c.lineWidth = 2; c.strokeRect(x + 18, y + 6, ch - 12, ch - 12)
  }
  c.textAlign = 'left'; c.textBaseline = 'middle'
  const fs = Math.round(ch * 0.26)
  c.font = `800 ${Math.round(fs * 0.55)}px "Arial Black", Impact, sans-serif`; c.fillStyle = S.glow; c.fillText(S.device + ' · DNA', x + ch + 14, y + ch * 0.3)
  c.font = `900 ${fs}px "Arial Black", Impact, sans-serif`; c.fillStyle = '#fff'; c.shadowColor = S.glow; c.shadowBlur = 10
  let nm = String(name || '').toUpperCase(); while (nm.length > 3 && c.measureText(nm).width > cw - ch - 34) nm = nm.slice(0, -2) + '…'
  c.fillText(nm, x + ch + 14, y + ch * 0.66)
  c.restore()
}

function drawScan(c, W, H) {
  const sc = DNA_SCENE, S = DNA_SCHEMES[sc.scheme] || DNA_SCHEMES.ben, k = sc.k, T = sc.total, f = sc.caster, t = sc.target
  if (!f || !t) return
  const inA = seg(k, 0, 12), outA = 1 - seg(k, T - 14, T)
  c.fillStyle = `rgba(0,0,0,${0.5 * inA * outA})`; c.fillRect(0, 0, W, H)
  const fb = body(f), tb = body(t)
  const hand = W2S(fb.cx + (f.facing || 1) * fb.w * 0.22, fb.y + fb.h * 0.45, W, H)
  const tTop = W2S(tb.x, tb.y, W, H), tBot = W2S(tb.x + tb.w, tb.bot, W, H)
  const bx0 = tTop.x - 10, by0 = tTop.y - 10, bx1 = tBot.x + 10, by1 = tBot.y + 6, bw = bx1 - bx0, bhh = by1 - by0
  const kevin = sc.scheme === 'kevin'
  // the dial lights up on the wrist
  { const a = seg(k, 2, 14) * outA, r = 10 + 24 * easeOut(seg(k, 2, 18)) * (1 - seg(k, 24, 34) * 0.5)
    c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(hand.x, hand.y, 0, hand.x, hand.y, r * 3)
    g.addColorStop(0, rgba(S.glow, 0.9 * a)); g.addColorStop(1, rgba(S.glow, 0)); c.fillStyle = g; c.fillRect(hand.x - r * 3, hand.y - r * 3, r * 6, r * 6); c.restore()
    c.save(); c.translate(hand.x, hand.y - r * 1.8); c.globalAlpha = a; drawEmblemShape(c, S.emblem === 'cross' ? 'omnitrix' : S.emblem, r * 0.9, S, 1); c.restore() }
  // beam / absorption streams
  if (k >= 18 && k < T - 16) {
    const a = seg(k, 18, 24) * (1 - seg(k, T - 22, T - 16))
    const tx = (bx0 + bx1) / 2, ty = by0 + bhh * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(k * 0.09)))
    c.save(); c.globalCompositeOperation = 'lighter'
    if (!kevin) {
      for (const [lw, al] of [[18, 0.18], [8, 0.45], [3, 0.95]]) { c.strokeStyle = rgba(lw === 3 ? '#ffffff' : S.glow, al * a); c.lineWidth = lw; c.beginPath(); c.moveTo(hand.x, hand.y); c.lineTo(bx0 + bw * 0.1, by0); c.lineTo(tx, ty); c.lineTo(bx0 + bw * 0.1, by1); c.closePath(); c.stroke() }
      c.fillStyle = rgba(S.glow, 0.12 * a); c.beginPath(); c.moveTo(hand.x, hand.y); c.lineTo(bx0, by0); c.lineTo(bx0, by1); c.closePath(); c.fill()
    } else {
      for (let i = 0; i < 26; i++) { // particles stream FROM the foe INTO Kevin's palm
        const u = ((k * 0.035 + hash(i, 7)) % 1), sx = bx0 + bw * hash(i, 3), sy = by0 + bhh * hash(i, 5)
        const x = sx + (hand.x - sx) * ease(u), y = sy + (hand.y - sy) * ease(u) + Math.sin(u * 9 + i) * 12 * (1 - u)
        c.fillStyle = rgba(i % 3 ? S.glow : '#ffffff', a * (0.4 + 0.6 * u)); c.beginPath(); c.arc(x, y, 2 + 3 * (1 - u), 0, Math.PI * 2); c.fill()
      }
    }
    c.restore()
  }
  // scan frame on the foe: corner brackets, grid, sweeping scanline, helix, percentage
  if (k >= 22 && k < T - 12) {
    const a = seg(k, 22, 30) * (1 - seg(k, T - 20, T - 12))
    c.save(); c.globalAlpha = a; c.strokeStyle = S.glow; c.lineWidth = 3; c.shadowColor = S.glow; c.shadowBlur = 12
    const L = Math.min(bw, bhh) * 0.22
    for (const [x, y, dx, dy] of [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]]) { c.beginPath(); c.moveTo(x + dx * L, y); c.lineTo(x, y); c.lineTo(x, y + dy * L); c.stroke() }
    c.shadowBlur = 0; c.globalAlpha = a * 0.22; c.lineWidth = 1
    for (let gx = bx0; gx <= bx1; gx += 9) { c.beginPath(); c.moveTo(gx, by0); c.lineTo(gx, by1); c.stroke() }
    for (let gy = by0; gy <= by1; gy += 9) { c.beginPath(); c.moveTo(bx0, gy); c.lineTo(bx1, gy); c.stroke() }
    const u = ((k - 22) / 30) % 1, sy = by0 + bhh * (Math.floor((k - 22) / 30) % 2 ? 1 - u : u)
    c.globalAlpha = a; c.globalCompositeOperation = 'lighter'
    const g = c.createLinearGradient(0, sy - 22, 0, sy + 4); g.addColorStop(0, rgba(S.glow, 0)); g.addColorStop(1, rgba(S.glow, 0.55)); c.fillStyle = g; c.fillRect(bx0, sy - 22, bw, 26)
    c.fillStyle = '#fff'; c.fillRect(bx0 - 6, sy, bw + 12, 2)
    c.globalCompositeOperation = 'source-over'
    helix(c, bx1 + 34, by0, by1, 12, k * 0.18, S, a * 0.9, 2.5)
    const pct = Math.round(100 * seg(k, 26, sc.lockAt))
    c.font = '900 16px "Arial Black", Impact, sans-serif'; c.textAlign = 'left'; c.fillStyle = '#fff'; c.shadowColor = S.glow; c.shadowBlur = 8
    c.fillText((kevin ? 'ABSORBING ' : 'SCANNING ') + pct + '%', bx0, by0 - 14)
    c.restore()
  }
  // lock: flash + stamp + portrait card
  const lk = k - sc.lockAt
  if (lk >= 0 && lk < 10) { c.fillStyle = rgba(S.glow, 0.45 * (1 - lk / 10)); c.fillRect(0, 0, W, H) }
  title(c, W, H, S.device, null, S, seg(k, 4, 14) * (1 - seg(k, 36, 44)) , 0.2)
  if (lk >= 0) { title(c, W, H, S.verb, null, S, seg(lk, 0, 6) * outA, 0.2); portraitCard(c, W, H, S, sc.name, sc.portrait, seg(lk, 0, 14) * outA, f.facing > 0) }
  letterbox(c, W, H, inA * outA)
}

function drawMorph(c, W, H) {
  const sc = DNA_SCENE, S = DNA_SCHEMES[sc.scheme] || DNA_SCHEMES.ben, k = sc.k, T = sc.total, f = sc.caster
  if (!f) return
  const inA = seg(k, 0, 10), outA = 1 - seg(k, T - 12, T), sw = sc.swapAt
  c.fillStyle = `rgba(0,0,0,${0.45 * inA * outA})`; c.fillRect(0, 0, W, H)
  const fb = body(f), top = W2S(fb.cx, fb.y - 10, W, H), bot = W2S(fb.cx, fb.bot, W, H), mid = W2S(fb.cx, fb.y + fb.h * 0.4, W, H)
  const hgt = bot.y - top.y, z = mid.s
  // slam the dial: the emblem flies up big and spins
  if (k < sw + 6) {
    const a = seg(k, 2, 10) * (1 - seg(k, sw - 4, sw + 6)), r = 22 * z * (1 + 0.6 * easeOut(seg(k, 4, 16)))
    c.save(); c.translate(mid.x, top.y - r * 1.4); c.rotate(easeOut(seg(k, 4, sw)) * Math.PI * 2); c.globalAlpha = a
    drawEmblemShape(c, S.emblem === 'cross' ? 'omnitrix' : S.emblem, r, S, 1.5); c.restore()
  }
  // light column + helix wrapping the body
  if (k >= 10 && k < sw + 18) {
    const a = seg(k, 10, 18) * (1 - seg(k, sw + 4, sw + 18)), cw = (40 + 30 * Math.sin(k * 0.3)) * z
    c.save(); c.globalCompositeOperation = 'lighter'
    const g = c.createLinearGradient(mid.x - cw, 0, mid.x + cw, 0); g.addColorStop(0, rgba(S.glow, 0)); g.addColorStop(0.5, rgba(S.glow, 0.55 * a)); g.addColorStop(1, rgba(S.glow, 0))
    c.fillStyle = g; c.fillRect(mid.x - cw, 0, cw * 2, H)
    helix(c, mid.x, top.y - 20, bot.y, 30 * z * (1 - 0.4 * seg(k, 20, sw)), k * 0.35, S, a, 3)
    // the body whites out into a silhouette before the swap
    const wa = seg(k, 18, sw) * (1 - seg(k, sw, sw + 10))
    const rg = c.createRadialGradient(mid.x, mid.y, 0, mid.x, mid.y, hgt * 0.75); rg.addColorStop(0, `rgba(255,255,255,${0.9 * wa})`); rg.addColorStop(0.5, rgba(S.glow, 0.5 * wa)); rg.addColorStop(1, rgba(S.glow, 0))
    c.fillStyle = rg; c.fillRect(mid.x - hgt, mid.y - hgt, hgt * 2, hgt * 2)
    c.restore()
  }
  // swap flash + burst
  const sk = k - sw
  if (sk >= 0 && sk < 16) {
    c.fillStyle = rgba(S.glow, 0.7 * (1 - sk / 16)); c.fillRect(0, 0, W, H)
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 18; i++) { const ang = i / 18 * Math.PI * 2 + hash(i, 2), len = (60 + 160 * hash(i, 4)) * z * easeOut(sk / 16)
      c.strokeStyle = rgba(i % 2 ? '#ffffff' : S.glow, 0.9 * (1 - sk / 16)); c.lineWidth = 3; c.beginPath(); c.moveTo(mid.x + Math.cos(ang) * len * 0.4, mid.y + Math.sin(ang) * len * 0.4); c.lineTo(mid.x + Math.cos(ang) * len, mid.y + Math.sin(ang) * len); c.stroke() }
    c.restore()
  }
  if (sk >= 0) { title(c, W, H, String(sc.name || '').toUpperCase(), S.device + ' · DNA FORM', S, seg(sk, 2, 10) * outA, 0.18); portraitCard(c, W, H, S, sc.name, sc.portrait, seg(sk, 4, 16) * outA, f.facing > 0) }
  letterbox(c, W, H, inA * outA)
}

function drawPulses(c, W, H) {
  for (let i = DNA_PULSES.length - 1; i >= 0; i--) {
    const p = DNA_PULSES[i]; p.k++
    if (p.k > p.total) { DNA_PULSES.splice(i, 1); continue }
    const S = DNA_SCHEMES[p.scheme] || DNA_SCHEMES.ben, fb = body(p.f), m = W2S(fb.cx, fb.y + fb.h * 0.45, W, H), u = p.k / p.total
    c.save(); c.globalCompositeOperation = 'lighter'
    c.strokeStyle = rgba(S.glow, 0.9 * (1 - u)); c.lineWidth = 6 * (1 - u) + 1
    c.beginPath(); c.arc(m.x, m.y, (20 + 120 * easeOut(u)) * m.s, 0, Math.PI * 2); c.stroke()
    const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, 90 * m.s); g.addColorStop(0, rgba(S.glow, 0.5 * (1 - u))); g.addColorStop(1, rgba(S.glow, 0))
    c.fillStyle = g; c.fillRect(m.x - 90 * m.s, m.y - 90 * m.s, 180 * m.s, 180 * m.s)
    c.restore()
  }
}
// small DNA chip over the head: the stored form + "↓↓ U" (its dial slot), or the remaining time while transformed
function drawChips(c, W, H) {
  for (const f of DNA_FIGHTERS) {
    const d = f._dna; if (!d || !d.scanKey || (DNA_SCENE.tick || 0) - (d.stamp || 0) > 20 || f.eliminated || (f.health || 0) <= 0) continue
    const S = DNA_SCHEMES[d.scheme] || DNA_SCHEMES.ben, fb = body(f), p = W2S(fb.cx, fb.y - 6, W, H)
    const txt = d.active ? `${Math.ceil(d.timer / 60)}s` : (d.cd > 0 ? `${Math.ceil(d.cd / 60)}s` : '↓↓ U')
    const label = (d.scanName || '').toUpperCase().slice(0, 14)
    c.save(); c.font = '800 11px "Arial Black", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
    const tw = c.measureText(label + '  ' + txt).width + 26, x = p.x - tw / 2, y = p.y - 26
    c.globalAlpha = d.active || d.cd > 0 ? 0.85 : 1
    c.fillStyle = 'rgba(0,0,0,0.72)'; c.strokeStyle = S.glow; c.lineWidth = 1.5
    c.beginPath(); c.roundRect ? c.roundRect(x, y, tw, 17, 8) : c.rect(x, y, tw, 17); c.fill(); c.stroke()
    c.save(); c.translate(x + 10, y + 8.5); drawEmblemShape(c, S.emblem === 'cross' ? 'omnitrix' : S.emblem, 5.5, S, 0.3); c.restore()
    c.fillStyle = '#fff'; c.fillText(label + '  ', p.x + 5 - c.measureText(txt).width / 2, y + 9)
    c.fillStyle = S.glow; c.fillText(txt, p.x + 5 + c.measureText(label + '  ').width / 2, y + 9)
    if (d.active) { c.fillStyle = S.glow; c.fillRect(x + 4, y + 15, (tw - 8) * clamp(d.timer / d.total, 0, 1), 2) }
    c.restore()
  }
}
registerCineScreen('dna_scan', (c, cv) => {
  const W = cv.width, H = cv.height
  drawPulses(c, W, H)
  if (!DNA_SCENE.active) { drawChips(c, W, H); return false }
  if (DNA_SCENE.kind === 'scan') drawScan(c, W, H); else drawMorph(c, W, H)
  return true
})

// ── 4) Chrollo — Skill Hunter cinematic dressing (called from drawChrolloSkillHunterCinematic) ────────────────────
// st = { frame, total, swapAt, caster, opponent, name, portrait }
export function drawChrolloBookOverlay(c, cv, st) {
  const W = cv.width, H = cv.height, S = DNA_SCHEMES.chrollo, k = st.frame, T = st.total, sw = st.swapAt
  const inA = seg(k, 0, 12), outA = 1 - seg(k, T - 14, T)
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0)
  // dusk wash + vignette
  c.fillStyle = `rgba(14,4,28,${0.55 * inA * (1 - seg(k, sw, sw + 30))})`; c.fillRect(0, 0, W, H)
  // drifting pages (deterministic)
  for (let i = 0; i < 14; i++) {
    const u = ((k * 0.006 + hash(i, 1)) % 1), x = W * hash(i, 2) + Math.sin(k * 0.03 + i) * 40, y = H * (1.05 - u * 1.2)
    const a = 0.5 * inA * outA * Math.sin(u * Math.PI)
    c.save(); c.translate(x, y); c.rotate(Math.sin(k * 0.04 + i * 2) * 0.8); c.globalAlpha = a; c.fillStyle = '#efe6d2'; c.fillRect(-14, -18, 28, 36)
    c.fillStyle = 'rgba(80,50,120,0.5)'; for (let l = 0; l < 5; l++) c.fillRect(-10, -12 + l * 6, 20 - (l % 2) * 6, 1.5); c.restore()
  }
  // the book (Bandit's Secret) opens above center; the stolen page shows the opponent
  const bw = Math.min(W * 0.36, 420), bh = bw * 0.62, bx = W / 2, by = H * 0.42
  const open = easeOut(seg(k, 10, 44)), lift = (1 - easeOut(seg(k, 4, 24))) * H * 0.3
  const bookA = seg(k, 4, 14) * (1 - seg(k, sw + 2, sw + 14))
  if (bookA > 0) {
    c.save(); c.globalAlpha = bookA; c.translate(bx, by + lift)
    const g = c.createRadialGradient(0, 0, 0, 0, 0, bw); g.addColorStop(0, rgba(S.glow, 0.45)); g.addColorStop(1, rgba(S.glow, 0)); c.fillStyle = g; c.fillRect(-bw, -bw, bw * 2, bw * 2)
    c.fillStyle = '#1a0d10'; c.fillRect(-bw / 2 - 8, -bh / 2 - 6, bw + 16, bh + 12)          // cover
    c.fillStyle = '#7a2230'; c.fillRect(-bw / 2 - 4, -bh / 2 - 2, bw + 8, bh + 4)
    // left page (fixed) + right page (turns open)
    c.fillStyle = '#f1e7cf'; c.fillRect(-bw / 2, -bh / 2, bw / 2 - 2, bh)
    c.save(); c.scale(Math.max(0.02, open), 1); c.fillStyle = '#f6eedb'; c.fillRect(2, -bh / 2, bw / 2 - 2, bh); c.restore()
    // flipping page while opening
    const flip = seg(k, 30, 50)
    if (flip > 0 && flip < 1) { c.save(); c.scale(Math.cos(flip * Math.PI), 1); c.fillStyle = '#fffaf0'; c.fillRect(0, -bh / 2, bw / 2 - 2, bh); c.restore() }
    // handwriting on the left page
    c.fillStyle = 'rgba(60,30,90,0.55)'; for (let l = 0; l < 9; l++) c.fillRect(-bw / 2 + 14, -bh / 2 + 16 + l * (bh - 30) / 9, (bw / 2 - 40) * (0.6 + 0.4 * hash(l, 9)), 2)
    // the stolen page: the opponent's portrait fades in under a purple hand-print stamp
    const pa = seg(k, 46, 66) * open
    if (pa > 0) {
      const im = image(st.portrait), pw = bw / 2 - 26, ph = bh - 46
      if (ready(im)) { c.save(); c.globalAlpha *= pa; c.beginPath(); c.rect(12, -bh / 2 + 10, pw, ph); c.clip(); const s = Math.max(pw / im.naturalWidth, ph / im.naturalHeight); c.drawImage(im, 12 + (pw - im.naturalWidth * s) / 2, -bh / 2 + 10, im.naturalWidth * s, im.naturalHeight * s); c.restore() }
      c.save(); c.globalAlpha *= pa; c.fillStyle = '#3a1660'; c.textAlign = 'center'; c.font = `900 ${Math.round(bh * 0.07)}px Georgia, serif`
      c.fillText(String(st.name || '').toUpperCase().slice(0, 16), 12 + pw / 2, bh / 2 - 14); c.restore()
      // hand-print (palm + 4 fingers) stamped at the steal
      const ha = seg(k, 60, 70) * (1 - seg(k, sw + 2, sw + 10))
      if (ha > 0) { c.save(); c.globalAlpha *= ha * 0.8; c.fillStyle = S.glow; c.translate(12 + pw / 2, 0); const s = 1 + (1 - seg(k, 60, 66)) * 0.6; c.scale(s, s)
        c.beginPath(); c.ellipse(0, 10, 18, 20, 0, 0, Math.PI * 2); c.fill(); for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(-13 + i * 8.6, -18 - (i === 1 || i === 2 ? 6 : 0), 4, 12, 0, 0, Math.PI * 2); c.fill() }
        c.beginPath(); c.ellipse(20, 8, 4, 10, -0.8, 0, Math.PI * 2); c.fill(); c.restore() }
    }
    c.restore()
  }
  // swap: violet flash + page shards
  const sk = k - sw
  if (sk >= 0 && sk < 22) {
    c.fillStyle = rgba('#c4a8ff', 0.6 * (1 - sk / 22)); c.fillRect(0, 0, W, H)
    for (let i = 0; i < 22; i++) { const a = hash(i, 3) * Math.PI * 2, d = (40 + 360 * hash(i, 4)) * easeOut(sk / 22)
      c.save(); c.translate(bx + Math.cos(a) * d, by + Math.sin(a) * d); c.rotate(a + sk * 0.2); c.globalAlpha = 1 - sk / 22; c.fillStyle = i % 3 ? '#f1e7cf' : S.glow; c.fillRect(-7, -9, 14, 18); c.restore() }
  }
  title(c, W, H, 'SKILL HUNTER', seg(k, 46, 60) > 0 ? 'BANDIT\'S SECRET' : null, S, seg(k, 6, 16) * (1 - seg(k, sw - 6, sw + 2)), 0.14)
  if (sk >= 0) title(c, W, H, String(st.name || '').toUpperCase(), 'ABILITY STOLEN', S, seg(sk, 4, 12) * outA, 0.16)
  letterbox(c, W, H, inA * outA)
  c.restore()
}
