// ippoUltFx.js — RENDER-ONLY half of Ippo Makunouchi's DEMPSEY ROLL cinematic (ippoUlt.js), plus a small shared render kit
// (`cineKit`) the other One Piece / HxH / horror / Baki / Saiki cinematic modules of the 2026-11-24 roster pass reuse.
// One screen pass (cineRegistry overlay, identity transform, device pixels) that owns the picture while the cinematic runs:
// world → screen from camera.js's live transform; both fighters drawn HERE from their real sprite sheets (engine sprites are
// hidden with _fxAlpha = 0). Pure functions of the scene's script / real frames; noise = integer hash (no Math.random).
// Reduce Flashing → no white / inverted frames; Reduce Motion → no jitter / drifting particles.
import { camera } from './camera.js'
import { juiceSettings } from './juiceSettings.js'

// ═════════════════════════════════════════ shared kit ════════════════════════════════════════════════════════════════
const imgs = new Map(), anchors = new Map()
export const image = src => { let im = imgs.get(src); if (!im) { im = new Image(); im.src = src; imgs.set(src, im) } return im }
export const ready = im => im && im.complete && im.naturalWidth > 0
export const hash = (a, b = 0) => ((Math.imul((a | 0) * 374761393 + (b | 0) * 668265263, 1274126177) >>> 0) % 10007) / 10007
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
export const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
export const outE = u => { u = clamp(u, 0, 1); return 1 - (1 - u) ** 3 }
export const calmMotion = () => !!juiceSettings?.reduceMotion
export const calmFlash = () => !!juiceSettings?.reduceFlashing
export const animOf = (f, key) => (f?._skinAnim && f._skinAnim[key]) || f?.animationData?.[key] || null
export function preloadAnims(f, keys) { for (const k of keys) { const a = animOf(f, k); if (a?.sheet) image(a.sheet) } }

// FEET anchor of one cell: x = median column of the opaque pixels in the lowest 30 % of the content (robust to stray
// neighbour-cell pixels, keeps the BODY — not a wide punch arc — on the anchor), y = the lowest opaque row; plus the top.
function anchorOf(im, sx, sy, w, h, key) {
  let a = anchors.get(key); if (a) return a
  try {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    const d = g.getImageData(0, 0, w, h).data, rowN = new Array(h).fill(0)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) rowN[y]++
    let top = 0, bot = h - 1
    while (top < h && rowN[top] < 2) top++
    while (bot > 0 && rowN[bot] < 2) bot--
    if (bot <= top) { a = { x: w / 2, b: h, t: 0 } } else {
      const y0 = Math.round(bot - (bot - top) * 0.3), xs = []
      for (let y = y0; y <= bot; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) xs.push(x)
      xs.sort((p, q) => p - q)
      a = { x: xs.length ? xs[xs.length >> 1] + 0.5 : w / 2, b: bot + 1, t: top }
    }
  } catch (_) { a = { x: w / 2, b: h, t: 0 } }
  anchors.set(key, a); return a
}
let _tint = null
function tintCanvas(w, h) { if (!_tint) { const cv = document.createElement('canvas'); _tint = { cv, g: cv.getContext('2d') } }
  if (_tint.cv.width < w || _tint.cv.height < h) { _tint.cv.width = Math.max(_tint.cv.width, w); _tint.cv.height = Math.max(_tint.cv.height, h) } return _tint }
// one frame of fighter f's first available action in `keys`, feet at (x, feetY) screen px, zoom z, facing dir.
// o: { alpha, tint, tintA, sx, sy, skew, rot, s, flip } — `flip` mirrors an action whose art is authored facing left.
export function sprite(c, f, keys, frame, x, feetY, z, dir, o = {}) {
  let a = null; for (const k of keys) if ((a = typeof k === 'object' ? k : animOf(f, k))) break
  if (!a?.sheet) return null
  const im = image(a.sheet); if (!ready(im)) return null
  const n = Math.max(1, a.frames || 1), fi = clamp(frame | 0, 0, n - 1), w = a.width, h = a.height
  const sx = (a.sourceX || 0) + fi * w, sy = a.sourceY || 0
  const an = anchorOf(im, sx, sy, w, h, a.sheet + '#' + sx + ',' + sy + ',' + w + ',' + h)
  const s = (f.spriteScale || 1.8) * (a.scale || 1) * z * (o.s || 1)
  let src = im, ssx = sx, ssy = sy
  if (o.tint) {
    const sc = tintCanvas(w, h); sc.g.clearRect(0, 0, w, h); sc.g.globalCompositeOperation = 'source-over'; sc.g.globalAlpha = 1
    sc.g.drawImage(im, sx, sy, w, h, 0, 0, w, h)
    sc.g.globalCompositeOperation = 'source-atop'; sc.g.globalAlpha = o.tintA ?? 0.6; sc.g.fillStyle = o.tint; sc.g.fillRect(0, 0, w, h)
    src = sc.cv; ssx = 0; ssy = 0
  }
  const d = o.flip ? -dir : dir
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= o.alpha ?? 1
  if (o.rot) {
    const cy = (an.b + an.t) / 2
    c.translate(Math.round(x), Math.round(feetY - (an.b - cy) * s)); c.rotate(o.rot); if (d < 0) c.scale(-1, 1)
    c.drawImage(src, ssx, ssy, w, h, -an.x * s, -cy * s, w * s, h * s)
  } else {
    c.translate(Math.round(x), Math.round(feetY)); if (o.sx || o.sy) c.scale(o.sx || 1, o.sy || 1); if (o.skew) c.transform(1, 0, o.skew, 1, 0, 0); if (d < 0) c.scale(-1, 1)
    c.drawImage(src, ssx, ssy, w, h, -an.x * s, -an.b * s, w * s, h * s)
  }
  c.restore()
  return { top: feetY - (an.b - an.t) * s, h: (an.b - an.t) * s, s }
}
export function view(W, H) {
  const z = camera.zoom || 1, ox = (camera.x || 0) + (camera.leadX || 0) - (camera.shakeX || 0), oy = (camera.y || 0) - (camera.shakeY || 0)
  return { z, p: (x, y) => ({ x: (x - ox) * z + W / 2, y: (y - oy) * z + H / 2 }) }
}
let _scr = null
function scratch(W, H) { if (!_scr) { const cv = document.createElement('canvas'); _scr = { cv, g: cv.getContext('2d') } }
  if (_scr.cv.width !== W || _scr.cv.height !== H) { _scr.cv.width = W; _scr.cv.height = H } return _scr }
// re-blit the finished frame scaled about (cx, cy) — a real close-up past camera.js's zoom cap; (tx, ty) = where (cx, cy) lands
export function punchIn(ctx, canvas, W, H, cx, cy, z, tx = cx, ty = cy) {
  if (z <= 1.001 && tx === cx && ty === cy) return
  const S = scratch(W, H); S.g.setTransform(1, 0, 0, 1, 0, 0); S.g.clearRect(0, 0, W, H); S.g.drawImage(canvas, 0, 0)
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
  ctx.translate(tx, ty); ctx.scale(z, z); ctx.translate(-cx, -cy)
  ctx.drawImage(S.cv, 0, 0); ctx.restore()
}
export function speedLines(ctx, W, H, cx, cy, n, seed, col, a, inward = true, real = 0) {
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
export function hLines(ctx, W, y0, y1, n, seed, col, a, real, dir = 1) {
  ctx.save()
  for (let i = 0; i < n; i++) {
    const y = y0 + hash(i, seed) * (y1 - y0), len = W * (0.25 + hash(i, seed + 1) * 0.6)
    let x = ((hash(i, seed + 2) * W * 2 + (calmMotion() ? 0 : real * (30 + hash(i, 4) * 40))) % (W * 1.6)) - W * 0.3
    if (dir < 0) x = W - x - len
    ctx.globalAlpha = a * (0.25 + 0.6 * hash(i, seed + 3)); ctx.fillStyle = col; ctx.fillRect(x, y, len, 1 + hash(i, seed + 5) * 3)
  }
  ctx.restore()
}
// a slanted cut-in band with a slammed title; u = 0..1 over its life
export function title(ctx, W, H, text, sub, u, o = {}) {
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
  if (sub) { ctx.font = `700 ${Math.round(H * 0.028)}px system-ui, sans-serif`; ctx.fillStyle = o.subFill || '#ffffff'; ctx.fillText(sub, 0, fs * 0.66) }
  ctx.restore()
}
export function subtitle(ctx, W, H, who, line, a, o = {}) {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
  const fs = Math.round(H * 0.032), y = H * 0.935
  ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const tw = ctx.measureText(line).width, nf = Math.round(fs * 0.62)
  ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#000'; ctx.strokeText(line, W / 2, y); ctx.fillStyle = '#ffffff'; ctx.fillText(line, W / 2, y)
  ctx.font = `900 ${nf}px system-ui, sans-serif`; ctx.fillStyle = o.who || '#f2b705'; ctx.textAlign = 'left'; ctx.fillText(who, W / 2 - tw / 2, y - fs * 0.95)
  ctx.restore()
}
export function star(ctx, x, y, r, a, rot = 0, col = '255,240,200') {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = '#ffffff'
  ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath()
  for (let i = 0; i < 8; i++) { const rr = i & 1 ? r * 0.16 : r; const an = i * Math.PI / 4; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr) }
  ctx.closePath(); ctx.fill()
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.7); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, `rgba(${col},0)`)
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
export function letterbox(ctx, W, H, amt) { const bar = H * 0.12 * clamp(amt, 0, 1); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar) }
export function ring(ctx, x, y, r, a, col, lw, squash = 0.5) { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1); ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.ellipse(x, y, r, r * squash, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore() }
export function vignette(ctx, W, H, a, col = '0,0,0', inner = 0.25) {
  if (a <= 0) return
  const g = ctx.createRadialGradient(W / 2, H / 2, H * inner, W / 2, H / 2, H * 0.95); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${clamp(a, 0, 1)})`)
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
}
// big floating damage figure (the cinematic's own; the engine's damage numbers are frozen with the world)
export function bigNumber(ctx, W, H, n, x, y, u, col = '#ff3b2f', scale = 0.09) {
  if (!(n > 0)) return
  const fs = Math.round(H * scale * (1 + Math.max(0, 1 - u * 8) * 0.6))
  ctx.save(); ctx.globalAlpha = clamp(1.4 - u * 1.4, 0, 1); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const yy = y - u * H * 0.06
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#1a0000'; ctx.strokeText(String(Math.round(n)), x, yy); ctx.fillStyle = col; ctx.fillText(String(Math.round(n)), x, yy); ctx.restore()
}
export const cineKit = { image, ready, hash, clamp, smooth, outE, calmMotion, calmFlash, animOf, preloadAnims, sprite, view, punchIn, speedLines, hLines, title, subtitle, star, letterbox, ring, vignette, bigNumber }

// ═════════════════════════════════════════ IPPO — DEMPSEY ROLL ═══════════════════════════════════════════════════════
// script beats (frames k @60fps) — shared with ippoUlt.js (the sim reads these; this file never writes the scene)
export const IPPO_T = { dash: 40, weave: 52, roll: 104, finish: 190, upper: 214, down: 252, out: 292, total: 306 }
// the hooks of the roll: script frame, side (+1 left hook / −1 right hook), raw damage — accelerating
export const IPPO_HOOKS = [108, 120, 131, 141, 150, 158, 165, 171, 176, 180, 184, 187].map((at, i) => ({ at, side: i & 1 ? -1 : 1, raw: 20 }))
const T = IPPO_T

export function preloadIppoUlt(f, t) {
  preloadAnims(f, ['idle', 'ippoDempseyWeave', 'ippoDempseyFlurry', 'ippoGazelle', 'win'])
  preloadAnims(t, ['idle', 'hurt', 'guard', 'knockdown', 'fall'])
}

// the ∞ weave: offset (world px) of Ippo's body along a figure-eight at phase ph
export const weaveOff = (ph, amp) => ({ x: Math.sin(ph) * amp, y: Math.abs(Math.sin(ph * 2)) * amp * 0.28, lean: Math.cos(ph) })

export function drawIppoUltScreen(ctx, canvas, S) {
  if (!S) return false
  const W = canvas.width, H = canvas.height, V = view(W, H), z = V.z, k = S.frame, f = S.caster, t = S.target, d = S.dir
  const fx = f.x + (f.w || 48) / 2, tx = t.x + (t.w || 48) / 2
  const fp = V.p(fx, S.floor), tp = V.p(tx, t.y + (t.h || 94))
  const hitR = S.lastHitReal != null ? S.real - S.lastHitReal : 999
  const shakeJ = calmMotion() || hitR > 4 ? 0 : (hash(S.real, 3) - 0.5) * H * 0.012 * (S.lastHitPow || 1)

  ctx.save(); ctx.translate(shakeJ, shakeJ * 0.5)
  // 1) the arena dims to a boxing-ring spotlight
  const dim = k < T.out ? smooth(k / 14) : smooth(1 - (k - T.out) / 16)
  ctx.fillStyle = `rgba(6,4,10,${(0.62 * dim).toFixed(3)})`; ctx.fillRect(-20, -20, W + 40, H + 40)
  const spot = (x, y, r, a, col) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2) }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const mid = (fp.x + tp.x) / 2
  // the overhead cone
  const coneA = 0.16 * dim
  const cg = ctx.createLinearGradient(0, 0, 0, fp.y); cg.addColorStop(0, `rgba(255,244,214,${coneA.toFixed(3)})`); cg.addColorStop(1, `rgba(255,236,190,${(coneA * 0.4).toFixed(3)})`)
  ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(mid - W * 0.05, 0); ctx.lineTo(mid + W * 0.05, 0); ctx.lineTo(mid + 230 * z, fp.y + 10); ctx.lineTo(mid - 230 * z, fp.y + 10); ctx.closePath(); ctx.fill()
  spot(mid, fp.y, 260 * z, (0.22 * dim).toFixed(3), '255,236,200')
  ctx.restore()
  // ring ropes behind the fighters (red / white / blue), sagging slightly
  if (dim > 0.01) {
    const ropeY = [0.50, 0.62, 0.74].map(r => fp.y - 150 * z * (1 - r) * 2.2)
    ;['#d8262a', '#f2f2f2', '#2a54d8'].forEach((col, i) => {
      ctx.save(); ctx.globalAlpha = 0.55 * dim; ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, 5 * z)
      ctx.beginPath(); ctx.moveTo(-20, ropeY[i]); ctx.quadraticCurveTo(W / 2, ropeY[i] + 10 * z, W + 20, ropeY[i]); ctx.stroke(); ctx.restore()
    })
  }
  // crowd camera flashes
  if (!calmFlash() && k >= T.roll && k < T.out) for (let i = 0; i < 4; i++) {
    const id = (S.real >> 2) * 7 + i; if (hash(id, 11) > 0.35) continue
    const x = hash(id, 12) * W, y = H * (0.18 + hash(id, 13) * 0.3)
    star(ctx, x, y, H * 0.03 * (0.5 + hash(id, 14)), 0.75, hash(id, 15))
  }

  // 2) the ∞ trail of the weave (glowing figure-eight laid behind him)
  if (k >= T.weave && k < T.finish + 6) {
    const a = Math.min(smooth((k - T.weave) / 10), k >= T.finish ? 1 - (k - T.finish) / 6 : 1)
    const cx = V.p(S.fx1, 0).x, cy = fp.y - 62 * z, amp = S.amp * z
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = a * (pass ? 0.9 : 0.35); ctx.strokeStyle = pass ? '#ffd2c8' : '#ff3426'; ctx.lineWidth = pass ? 3 * z : 14 * z
      ctx.beginPath()
      const head = S.phase, tail = head - (k >= T.roll ? 9 : 5)
      for (let p = tail; p <= head; p += 0.08) { const o = weaveOff(p, 1); const px = cx + o.x * amp * 1.15, py = cy + Math.sin(p * 2) * amp * 0.36; if (p === tail) ctx.moveTo(px, py); else ctx.lineTo(px, py) }
      ctx.stroke()
    }
    ctx.restore()
  }

  // 3) the fighters
  drawFoe(ctx, S, V, k, tp)
  drawIppo(ctx, S, V, k, fp)

  // 4) per-hook contact bursts
  if (S.lastHitReal != null && hitR < 10 && S.lastHitK < T.finish) {
    const u = hitR / 10, hy = tp.y - 70 * z + (S.lastHitSide > 0 ? -8 : 8) * z, hx = tp.x - d * 12 * z
    star(ctx, hx, hy, (34 + 22 * (S.lastHitPow || 1)) * z * (1 - u * 0.5), 1 - u, S.real * 0.3)
    ring(ctx, hx, hy, (14 + u * 60) * z, (1 - u) * 0.9, '#ffffff', 4 * z, 0.9)
    ring(ctx, hx, hy, (8 + u * 90) * z, (1 - u) * 0.6, '#ff5040', 3 * z, 0.5)
    // sweat / spit spray
    if (!calmMotion()) { ctx.save(); for (let i = 0; i < 9; i++) { const an = (hash(i, S.lastHitK) - 0.5) * 1.6 + (d > 0 ? 0 : Math.PI), r = (10 + u * 70 * (0.5 + hash(i, 5))) * z
      ctx.globalAlpha = (1 - u) * 0.85; ctx.fillStyle = '#e8f6ff'; ctx.beginPath(); ctx.arc(hx + Math.cos(an) * r, hy + Math.sin(an) * r - u * 10 * z, (2 + hash(i, 6) * 3) * z, 0, Math.PI * 2); ctx.fill() } ctx.restore() }
  }
  // the roll's rush: horizontal speed lines + hook counter
  if (k >= T.roll && k < T.finish) {
    const u = (k - T.roll) / (T.finish - T.roll)
    hLines(ctx, W, H * 0.15, H * 0.85, 30 + Math.round(40 * u), 21, '#ffffff', 0.12 + 0.2 * u, S.real, -d)
  }

  // 5) PUNCH-INS (camera.js caps zoom ≈1.15)
  const head = { x: fp.x, y: fp.y - 92 * z }
  if (k < T.weave) { const u = smooth((k - 4) / 30); punchIn(ctx, canvas, W, H, head.x, head.y + 20 * z, 1 + 0.55 * u, head.x + (W * 0.5 - d * W * 0.12 - head.x) * u, head.y + 20 * z + (H * 0.5 - head.y - 20 * z) * u) }
  else if (k < T.roll) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, fp.y - 70 * z, 1 + 0.45 * smooth((k - T.weave) / 20), W / 2, H * 0.6)
  else if (k < T.finish) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, fp.y - 70 * z, 1.45 + 0.35 * smooth((k - T.roll) / (T.finish - T.roll)) + (hitR < 3 ? 0.06 : 0), W / 2, H * 0.6)
  else if (k < T.upper) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, fp.y - 60 * z, 1.8 + 0.3 * smooth((k - T.finish) / (T.upper - T.finish)), W / 2, H * 0.6)
  else if (k < T.out) { const pr0 = S.upperReal != null ? S.real - S.upperReal : 0; if (pr0 >= 24 && k >= T.down) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, fp.y - 80 * z, 1.25, W / 2, H * 0.6) }
  if (k >= T.roll && k < T.finish) {
  if (S.hooks > 0) {
    const fs = Math.round(H * (0.07 + 0.002 * S.hooks) * (1 + Math.max(0, 1 - hitR / 5) * 0.35))
    ctx.save(); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = d > 0 ? 'right' : 'left'; ctx.textBaseline = 'middle'
    const x = d > 0 ? W * 0.93 : W * 0.07, y = H * 0.3
    ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#2a0000'; ctx.strokeText(`${S.hooks} HITS`, x, y); ctx.fillStyle = '#ffe14d'; ctx.fillText(`${S.hooks} HITS`, x, y)
    ctx.font = `700 ${Math.round(H * 0.026)}px system-ui, sans-serif`; ctx.fillStyle = '#ffffff'; ctx.fillText(`${S.dmg | 0} DMG`, x, y + fs * 0.62); ctx.restore()
  }
  }
  if (k >= 6 && k < T.dash + 8) nameCard(ctx, W, H, S, k)

  // 6) panels / titles
  if (k >= T.weave + 6 && k < T.roll + 6) title(ctx, W, H, 'DEMPSEY ROLL', 'THE INFINITE WEAVE  ·  デンプシー・ロール', (k - T.weave - 6) / (T.roll - T.weave), { y: 0.24, fs: 0.13, edge: '#ff3426', fill: '#ffffff', stroke: '#b3120f' })
  if (k >= T.finish && k < T.upper) finishPanel(ctx, W, H, S, k)
  const pr = S.upperReal != null ? S.real - S.upperReal : -1
  if (pr >= 0 && pr < 30) impactFrames(ctx, W, H, S, V, pr, tp, fp)
  if (S.dmg > 0 && pr >= 26 && pr < 120) bigNumber(ctx, W, H, S.dmg, clamp(tp.x, W * 0.12, W * 0.88), clamp(tp.y - H * 0.12, H * 0.45, H * 0.75), (pr - 26) / 94, S.blocked ? '#ffd27a' : '#ff3b2f')
  if (k >= T.down && k < T.out + 8) downCard(ctx, W, H, S, k)
  ctx.restore()

  // 7) letterbox + subtitles
  const lbIn = clamp(S.real / 10, 0, 1), lbOut = k >= T.out ? clamp(1 - (k - T.out) / 14, 0, 1) : 1
  letterbox(ctx, W, H, Math.min(lbIn, lbOut))
  if (k >= 2 && k < T.weave + 20) subtitle(ctx, W, H, 'IPPO', '“I\'m the challenger — all out, start to finish!”  挑戦者なんだから！ガンガン行くぞ！', Math.min((k - 2) / 6, (T.weave + 20 - k) / 10), { who: '#ff5a4a' })
  if (k >= T.finish - 4 && k < T.upper + 4) subtitle(ctx, W, H, 'IPPO', '“Let this be the finish!”  これで終わりにしてください！', Math.min((k - T.finish + 4) / 6, (T.upper + 4 - k) / 4), { who: '#ff5a4a' })
  return true
}

function drawIppo(ctx, S, V, k, fp) {
  const f = S.caster, z = V.z, d = S.dir, x = V.p(f.x + (f.w || 48) / 2, 0).x
  const hitR = S.lastHitReal != null ? S.real - S.lastHitReal : 999
  // heat haze of fighting spirit through the roll
  if (k >= T.weave && k < T.upper + 10) {
    const u = smooth((k - T.weave) / 30)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const g = ctx.createRadialGradient(x, fp.y - 60 * z, 4, x, fp.y - 60 * z, 120 * z); g.addColorStop(0, `rgba(255,60,40,${(0.32 * u).toFixed(3)})`); g.addColorStop(1, 'rgba(255,40,20,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, fp.y - 60 * z, 120 * z, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  if (k < T.dash) { sprite(ctx, f, ['idle'], (S.real >> 3) % 4, x, fp.y, z, d); return }
  if (k < T.weave) {   // the dash in: low, fast, after-images
    for (let g = 3; g >= 1; g--) sprite(ctx, f, ['ippoDempseyWeave', 'idle'], 0, x - d * g * 26 * z, fp.y, z, d, { alpha: 0.18 * (4 - g), tint: '#ff6a50', tintA: 0.7 })
    sprite(ctx, f, ['ippoDempseyWeave', 'idle'], 0, x, fp.y, z, d); return
  }
  if (k < T.roll) {   // the WEAVE: figure-eight bob, frames follow the sway
    const fr = (Math.floor(S.phase / (Math.PI / 2)) % 4 + 4) % 4
    if (!calmMotion()) for (let g = 3; g >= 1; g--) { const o = weaveOff(S.phase - g * 0.45, S.amp); const gx = V.p(S.fx1 + o.x, 0).x
      sprite(ctx, f, ['ippoDempseyWeave', 'idle'], (fr + 4 - g) % 4, gx, fp.y + o.y * z, z, d, { alpha: 0.14 * (4 - g), tint: '#ff4030', tintA: 0.6 }) }
    sprite(ctx, f, ['ippoDempseyWeave', 'idle'], fr, x, fp.y, z, d); return
  }
  if (k < T.finish) {   // THE ROLL: weave + alternating hooks; after-images of the previous hooks
    const fr = hitR < 6 ? (S.lastHitSide > 0 ? 1 : 3) : ((Math.floor(S.phase / (Math.PI / 2)) % 4 + 4) % 4)
    const key = hitR < 6 ? 'ippoDempseyFlurry' : 'ippoDempseyWeave'
    if (!calmMotion()) for (let g = 4; g >= 1; g--) { const o = weaveOff(S.phase - g * 0.5, S.amp); const gx = V.p(S.fx1 + o.x, 0).x
      sprite(ctx, f, ['ippoDempseyFlurry', 'idle'], (g & 1) ? 1 : 3, gx, fp.y + o.y * z, z, d, { alpha: 0.12 * (5 - g), tint: '#ff3020', tintA: 0.65 }) }
    sprite(ctx, f, [key, 'idle'], fr, x, fp.y, z, d); return
  }
  if (k < T.upper) {   // dips low, coiled for the Gazelle
    sprite(ctx, f, ['ippoGazelle', 'idle'], 0, x, fp.y, z, d, { tint: '#ffffff', tintA: 0.15 + 0.15 * Math.sin(S.real * 0.6) }); return
  }
  if (k < T.down) { sprite(ctx, f, ['ippoGazelle', 'idle'], k < T.upper + 6 ? 1 : 3, x, fp.y, z, d); return }
  sprite(ctx, f, ['win', 'idle'], k < T.down + 8 ? 1 : (k < T.down + 14 ? 2 : 3), x, fp.y, z, d)
}

function drawFoe(ctx, S, V, k, tp) {
  const t = S.target, z = V.z, d = S.dir, fd = -d
  const hitR = S.lastHitReal != null ? S.real - S.lastHitReal : 999
  if (S.blocked && k < T.upper) { const q = hitR < 5 ? 1 - hitR / 5 : 0; sprite(ctx, t, ['guard', 'idle'], 9, tp.x + d * 4 * z * q, tp.y, z, fd, { skew: -d * 0.12 * q, tint: '#ffffff', tintA: hitR < 2 ? 0.5 : 0 }); return }
  if (k < T.roll) { sprite(ctx, t, k > T.weave + 20 ? ['guard', 'idle'] : ['idle'], k > T.weave + 20 ? 9 : 0, tp.x, tp.y, z, fd); return }
  if (k < T.upper) {   // head snapping side to side with every hook
    const q = hitR < 7 ? 1 - hitR / 7 : 0, side = S.lastHitSide || 1
    sprite(ctx, t, ['hurt', 'idle'], 9, tp.x + d * 5 * z * q, tp.y, z, fd, { skew: side * 0.22 * q, sx: 1 - 0.08 * q, tint: '#ffffff', tintA: hitR < 2 ? 0.6 : 0 }); return
  }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fd); return }
  if (k < T.down) {   // launched by the Gazelle, spinning
    sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fd, { rot: (k - T.upper) * 0.28 * d })
    if (!calmMotion()) { ctx.save(); for (let i = 1; i <= 6; i++) { ctx.globalAlpha = 0.3 * (1 - i / 7); ctx.fillStyle = '#ffe2c8'; ctx.beginPath(); ctx.arc(tp.x - d * i * 8 * z, tp.y - 40 * z + i * 22 * z, (8 + i * 3) * z, 0, Math.PI * 2); ctx.fill() } ctx.restore() }
    return
  }
  sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fd)
  if (k < T.down + 18) { const u = (k - T.down) / 18; ctx.save(); ctx.globalAlpha = (1 - u) * 0.7; ctx.fillStyle = '#e6d6bc'; ctx.beginPath(); ctx.ellipse(tp.x, tp.y, (30 + u * 100) * z, (8 + u * 14) * z, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
}

function nameCard(ctx, W, H, S, k) {   // the ring announcer's card: name + title, sliding in from his side
  const u = (k - 6) / (T.dash + 2 - 6), a = Math.min(clamp((k - 6) / 5, 0, 1), clamp((T.dash + 8 - k) / 6, 0, 1)), d = S.dir
  const x0 = d > 0 ? W * 0.56 : W * 0.06, slide = (1 - outE(clamp(u / 0.25, 0, 1))) * W * 0.3 * (d > 0 ? 1 : -1)
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x0 + slide, H * 0.24)
  ctx.fillStyle = 'rgba(10,6,6,0.88)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.38, 0); ctx.lineTo(W * 0.36, H * 0.15); ctx.lineTo(-W * 0.02, H * 0.15); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#d8262a'; ctx.fillRect(0, H * 0.15 - 6, W * 0.37, 6)
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
  ctx.font = `700 ${Math.round(H * 0.024)}px system-ui, sans-serif`; ctx.fillStyle = '#ffcf5a'; ctx.fillText('IN THE RED CORNER — KAMOGAWA GYM', W * 0.015, H * 0.035)
  ctx.font = `900 ${Math.round(H * 0.06)}px Impact, "Arial Black", sans-serif`; ctx.fillStyle = '#ffffff'; ctx.fillText('IPPO MAKUNOUCHI', W * 0.015, H * 0.088)
  ctx.font = `700 ${Math.round(H * 0.022)}px system-ui, sans-serif`; ctx.fillStyle = '#ff8a7a'; ctx.fillText('THE INFIGHTER  ·  幕之内一歩', W * 0.015, H * 0.128)
  ctx.restore()
}
function finishPanel(ctx, W, H, S, k) {   // slow-motion: the world drains to red, a manga strip of the coiled fist
  const u = (k - T.finish) / (T.upper - T.finish), a = Math.min(clamp((k - T.finish) / 5, 0, 1), 1)
  ctx.save(); ctx.globalAlpha = a * 0.55
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.1, W / 2, H / 2, H * 0.9); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, 'rgba(90,0,0,1)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
  speedLines(ctx, W, H, W / 2, H * 0.55, 60, 77, '#ffffff', 0.35 + 0.4 * u, true, S.real)
  if (k >= T.finish + 8) title(ctx, W, H, 'GAZELLE PUNCH', '— full-body rising finish —', (k - T.finish - 8) / (T.upper - T.finish - 4), { y: 0.78, fs: 0.1, from: -1, edge: '#7fc8ff', fill: '#ffffff', stroke: '#1a3a8a', band: 'rgba(4,8,20,0.9)', bh: 0.14 })
}

function impactFrames(ctx, W, H, S, V, pr, tp, fp) {
  const flash = !calmFlash(), z = V.z, f = S.caster, t = S.target, d = S.dir
  const sil = (bg, fg) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
    speedLines(ctx, W, H, tp.x, tp.y - 60 * z, 80, 41 + pr, fg, 0.9, false, pr)
    sprite(ctx, f, ['ippoGazelle', 'idle'], 1, fp.x, fp.y, z, d, { tint: fg, tintA: 1 })
    sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, -d, { tint: fg, tintA: 1, sx: 0.85, sy: 1.08, skew: -d * 0.25 })
  }
  if (pr < 3) return
  if (pr < 7) { if (flash) sil('#ffffff', '#000000'); return }
  if (pr < 11) { if (flash) sil('#000000', '#ffffff'); else sil('#1a0000', '#ffe14d'); return }
  if (pr < 24) {   // the Gazelle's arc carved across the whole screen
    const u = (pr - 11) / 13
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = (1 - u) * (0.9 - i * 0.25); ctx.strokeStyle = i ? '#7fc8ff' : '#ffffff'; ctx.lineWidth = (40 - i * 12) * z
      ctx.beginPath(); ctx.arc(fp.x + d * 10 * z, fp.y - 40 * z, (120 + u * 260 + i * 30) * z, d > 0 ? -Math.PI * 0.9 : -Math.PI * 0.1, d > 0 ? Math.PI * 0.1 : Math.PI * 1.1, d < 0); ctx.stroke()
    }
    ctx.restore()
    ring(ctx, tp.x, tp.y - 70 * z, (40 + u * 500) * z, (1 - u), '#ffffff', 10 * z, 0.6)
  }
}

function downCard(ctx, W, H, S, k) {   // the bell + DOWN! card
  const u = (k - T.down) / (T.out + 8 - T.down), a = Math.min(clamp((k - T.down) / 4, 0, 1), clamp((T.out + 8 - k) / 8, 0, 1))
  const sc = 1 + Math.max(0, 1 - (k - T.down) / 6) * 0.8
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W * 0.5, H * 0.3); ctx.scale(sc, sc); ctx.rotate(-0.06)
  const fs = Math.round(H * 0.13)
  ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#000'; ctx.strokeText(S.blocked ? 'GUARD CRUSHED!' : 'DOWN!', 0, 0)
  ctx.fillStyle = S.blocked ? '#ffd27a' : '#ff3426'; ctx.fillText(S.blocked ? 'GUARD CRUSHED!' : 'DOWN!', 0, 0)
  ctx.font = `700 ${Math.round(H * 0.03)}px system-ui, sans-serif`; ctx.fillStyle = '#ffffff'; ctx.fillText(`DEMPSEY ROLL  ·  ${S.hooks} HOOKS + GAZELLE`, 0, fs * 0.7)
  ctx.restore()
  void u
  // the bell (three rings drawn as expanding brass arcs top-centre)
  for (let i = 0; i < 3; i++) { const kk = k - T.down - i * 9; if (kk < 0 || kk > 20) continue
    ring(ctx, W * 0.5, H * 0.16, (10 + kk * 7) * (H / 720), 1 - kk / 20, '#ffd36a', 4, 0.35) }
}
