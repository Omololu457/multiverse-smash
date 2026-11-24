// narutoUltFxKit.js — RENDER-ONLY helpers shared by the Naruto-universe cinematic ultimates (2026-11-24 ult pass):
// sakuraUltFx.js, hinataUltFx.js, kakashiUltFx.js, … Builds on the One Punch Man kit (saitamaUltFx.js opmKit: real
// sprite-sheet drawing, world→screen view, punch-in re-blit, speed lines, subtitles) and adds the Naruto look: vertical
// brush-kanji title cut-ins, letterbox, anime impact frames (white / inverted silhouettes), big damage pops, strip art,
// lightning, cracks, petals. Pure functions of the frames passed in; noise = integer hash (no Math.random).
import { opmKit } from './saitamaUltFx.js'

export const { image, ready, hash, clamp, smooth, outE, animOf, sprite, view, punchIn, speedLines, star, calmMotion, calmFlash } = opmKit
const MINCHO = '"Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif'

let _tc = null
function tintCv(w, h) { if (!_tc) { const cv = document.createElement('canvas'); _tc = { cv, g: cv.getContext('2d') } }
  if (_tc.cv.width < w || _tc.cv.height < h) { _tc.cv.width = Math.max(_tc.cv.width, Math.ceil(w)); _tc.cv.height = Math.max(_tc.cv.height, Math.ceil(h)) } return _tc }
// a frame of a horizontal n-frame strip, bottom-centred on (x, feetY), height-scaled by s (src px → screen px)
export function strip(ctx, src, n, i, x, feetY, s, o = {}) {
  const im = image(src); if (!ready(im)) return null
  const fw = im.naturalWidth / n, fh = im.naturalHeight, fi = clamp(i | 0, 0, n - 1), top = o.cropTop || 0
  ctx.save(); ctx.imageSmoothingEnabled = !!o.smooth; ctx.globalAlpha *= o.alpha ?? 1
  if (o.comp) ctx.globalCompositeOperation = o.comp
  ctx.translate(Math.round(x), Math.round(feetY)); if (o.rot) ctx.rotate(o.rot); if (o.dir < 0) ctx.scale(-1, 1)
  const ay = o.ay ?? 1   // 1 = bottom anchored, 0.5 = centred
  let src2 = im, sx = fi * fw
  if (o.tint) { const T = tintCv(fw, fh); T.g.clearRect(0, 0, T.cv.width, T.cv.height); T.g.globalCompositeOperation = 'source-over'; T.g.drawImage(im, sx, 0, fw, fh, 0, 0, fw, fh)
    T.g.globalCompositeOperation = 'source-atop'; T.g.fillStyle = o.tint; T.g.fillRect(0, 0, fw, fh); src2 = T.cv; sx = 0 }
  ctx.drawImage(src2, sx, top, fw, fh - top, -fw * s / 2, -(fh - top) * s * ay, fw * s, (fh - top) * s)
  ctx.restore()
  return { w: fw * s, h: (fh - top) * s }
}

export function letterbox(ctx, W, H, k, real, total, out = 14) {
  const lbIn = clamp(real / 10, 0, 1), lbOut = k >= total - out ? clamp((total - k) / out, 0, 1) : 1, bar = H * 0.12 * Math.min(lbIn, lbOut)
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar)
  return bar
}
export function subtitle(ctx, W, H, who, line, a, col = '#f2b705') {
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = clamp(a, 0, 1)
  const fs = Math.round(H * 0.032), y = H * 0.935
  ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const tw = ctx.measureText(line).width, nf = Math.round(fs * 0.62)
  ctx.lineWidth = fs * 0.18; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(line, W / 2, y); ctx.fillStyle = '#ffffff'; ctx.fillText(line, W / 2, y)
  ctx.font = `900 ${nf}px system-ui, sans-serif`; ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(who, W / 2 - tw / 2, y - fs * 0.95)
  ctx.restore()
}
// a line shown between frames [a, b) of k with fades
export const lineA = (k, a, b, fin = 6, fout = 8) => (k < a || k >= b) ? 0 : Math.min((k - a) / fin, (b - k) / fout, 1)

// the Naruto cut-in: a vertical column of brush kanji slammed in (scale 1.8 → 1) + a slanted English band
export function kanjiTitle(ctx, W, H, kanji, english, u, o = {}) {
  if (u <= 0 || u >= 1) return
  const inU = clamp(u / 0.12, 0, 1), outU = clamp((u - 0.86) / 0.14, 0, 1), a = 1 - outU
  const side = o.side ?? 1, x = W * (side > 0 ? (o.x ?? 0.82) : 1 - (o.x ?? 0.82))
  const sc = 1 + (1 - outE(inU)) * 0.8, fs = Math.round(H * (o.fs ?? 0.13)), chars = [...kanji]
  ctx.save(); ctx.globalAlpha = a
  // ink splash behind the column
  ctx.save(); ctx.translate(x, H * 0.5); ctx.scale(sc, sc)
  ctx.fillStyle = o.ink || 'rgba(10,4,8,0.72)'; ctx.beginPath()
  const colH = chars.length * fs * 1.02 + fs * 0.4
  for (let i = 0; i <= 24; i++) { const t = i / 24, yy = -colH / 2 + t * colH, wv = fs * (0.62 + 0.14 * Math.sin(t * 17 + 2) + 0.1 * hash(i, 3)); ctx.lineTo(-wv, yy) }
  for (let i = 24; i >= 0; i--) { const t = i / 24, yy = -colH / 2 + t * colH, wv = fs * (0.62 + 0.14 * Math.cos(t * 13) + 0.1 * hash(i, 7)); ctx.lineTo(wv, yy) }
  ctx.closePath(); ctx.fill()
  ctx.font = `900 ${fs}px ${MINCHO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'
  chars.forEach((ch, i) => {
    const yy = -colH / 2 + fs * 0.7 + i * fs * 1.02
    ctx.lineWidth = fs * 0.14; ctx.strokeStyle = o.stroke || '#120208'; ctx.strokeText(ch, 0, yy)
    ctx.fillStyle = o.fill || '#ffffff'; ctx.fillText(ch, 0, yy)
  })
  ctx.restore()
  // English band
  if (english) {
    const by = H * (o.by ?? 0.8), slide = (1 - outE(clamp((u - 0.05) / 0.12, 0, 1))) * W * 0.6 * -side
    ctx.save(); ctx.translate(slide, 0)
    const bw = W * 0.62, bx = side > 0 ? W * 0.04 : W - W * 0.04 - bw, bh = H * 0.075
    ctx.beginPath(); ctx.moveTo(bx, by - bh * 0.55); ctx.lineTo(bx + bw, by - bh * 0.45); ctx.lineTo(bx + bw - bh * 0.4, by + bh * 0.5); ctx.lineTo(bx + bh * 0.2, by + bh * 0.45); ctx.closePath()
    ctx.fillStyle = o.band || 'rgba(8,4,10,0.9)'; ctx.fill(); ctx.strokeStyle = o.edge || '#ff8ab8'; ctx.lineWidth = Math.max(2, H * 0.004); ctx.stroke()
    const efs = Math.round(H * 0.046); ctx.font = `900 ${efs}px Impact, "Arial Black", system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.translate(bx + bw / 2, by); ctx.transform(1, 0, -0.18, 1, 0, 0)
    ctx.lineWidth = efs * 0.16; ctx.strokeStyle = '#000'; ctx.lineJoin = 'round'; ctx.strokeText(english, 0, 0); ctx.fillStyle = o.efill || '#ffffff'; ctx.fillText(english, 0, 0)
    ctx.restore()
  }
  ctx.restore()
}

// a full-screen flat-colour impact frame: both fighters as hard silhouettes + burst lines (draw fns supplied by caller)
export function impactFrame(ctx, W, H, bg, fg, cx, cy, seed, drawPeople) {
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-20, -20, W + 40, H + 40)
  speedLines(ctx, W, H, cx, cy, 80, seed, fg, 0.9, false, seed)
  drawPeople?.(fg); ctx.restore()
}

// damage pops for every number the sim recorded (screen-space, from world positions)
export function damagePops(ctx, W, H, S, V, col = '#ff3b2f') {
  const list = S.nums || []
  for (let ni = 0; ni < list.length; ni++) {
    const n = list[ni], age = S.real - n.real; if (age < 0 || age > (n.big ? 64 : 22)) continue
    const stack = n.big ? list.slice(0, ni).filter(m => m.big && S.real - m.real <= 64).length : 0
    const p = V.p(n.x + (n.big ? 0 : (hash(ni, 5) - 0.5) * 70), n.y - (n.big ? 0 : hash(ni, 6) * 40)), u = age / (n.big ? 64 : 22), big = n.big, fs = Math.round(H * (big ? 0.085 : 0.05) * (1 + Math.max(0, 1 - age / 6) * 0.7))
    ctx.save(); ctx.globalAlpha = clamp(1.4 - u * 1.4, 0, 1); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    const x = clamp(p.x, W * 0.08, W * 0.92), y = clamp(p.y - u * H * 0.06 - stack * H * 0.075, H * 0.16, H * 0.82)
    ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#2a0000'; ctx.lineJoin = 'round'; ctx.strokeText(String(n.v), x, y); ctx.fillStyle = S.blocked ? '#ffd27a' : col; ctx.fillText(String(n.v), x, y); ctx.restore()
  }
}

// a jagged lightning bolt from (x0,y0) to (x1,y1)
export function bolt(ctx, x0, y0, x1, y1, seed, w = 3, col = '#bfe6ff', segs = 9, jag = 0.18) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  for (const [lw, a, c] of [[w * 4, 0.25, col], [w * 1.8, 0.6, col], [w * 0.7, 1, '#ffffff']]) {
    ctx.strokeStyle = c; ctx.globalAlpha *= 1; ctx.lineWidth = lw; ctx.save(); ctx.globalAlpha = a; ctx.beginPath(); ctx.moveTo(x0, y0)
    for (let i = 1; i < segs; i++) { const t = i / segs, off = (hash(seed, i) - 0.5) * L * jag; ctx.lineTo(x0 + dx * t + nx * off, y0 + dy * t + ny * off) }
    ctx.lineTo(x1, y1); ctx.stroke(); ctx.restore()
  }
  ctx.restore()
}

// radiating ground cracks from (x, y), grown to u (0..1), reach R px
export function cracks(ctx, x, y, R, u, seed, n = 14, col = '#140a06', glow = null) {
  if (u <= 0) return
  ctx.save(); ctx.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1, segs = 7; let px = x, py = y
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, 5 * (1 - (i >> 1) / n)); ctx.beginPath(); ctx.moveTo(px, py)
    const reach = R * (0.4 + 0.6 * hash(seed, i))
    for (let s = 0; s < segs * u; s++) { px += side * reach / segs * (0.6 + hash(seed + i, s) * 0.8); py += (hash(seed + 9, i * 7 + s) - 0.5) * reach * 0.05; ctx.lineTo(px, py) }
    ctx.stroke()
    if (glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = glow; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore() }
  }
  ctx.restore()
}

// a radial glow
export function glow(ctx, x, y, r, rgb, a) {
  if (a <= 0 || r <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${clamp(a, 0, 1).toFixed(3)})`); g.addColorStop(0.45, `rgba(${rgb},${(clamp(a, 0, 1) * 0.35).toFixed(3)})`); g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}
// shock rings out of (x, y)
export function rings(ctx, x, y, u, R, col = '#ffffff', n = 3, flat = 0.55, lw = 8) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let j = 0; j < n; j++) { const uj = clamp(u * 1.5 - j * 0.16, 0, 1); if (uj <= 0 || uj >= 1) continue
    ctx.globalAlpha = (1 - uj) * 0.9; ctx.strokeStyle = col; ctx.lineWidth = lw * (1 - j * 0.25)
    ctx.beginPath(); ctx.ellipse(x, y, 12 + uj * R, (12 + uj * R) * flat, 0, 0, Math.PI * 2); ctx.stroke() }
  ctx.restore()
}
// a full-screen tint
export function wash(ctx, W, H, col, a, comp = 'source-over') { if (a <= 0) return; ctx.save(); ctx.globalCompositeOperation = comp; ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = col; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore() }
export function desat(ctx, W, H, a, tint = '#2a1830', tintA = 0.35) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.globalAlpha = a; ctx.fillStyle = 'hsl(0,0%,50%)'; ctx.fillRect(-20, -20, W + 40, H + 40)
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = a * tintA; ctx.fillStyle = tint; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.restore()
}
// a manga panel (slanted quad) holding a portrait crop, with screentone; returns false until the art is ready
export function portraitPanel(ctx, src, crop, px, py, pw, ph, o = {}) {
  const im = image(src); if (!ready(im)) return false
  const [sx, sy, sw, sh] = crop || [0, 0, im.naturalWidth, im.naturalHeight]
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1
  ctx.beginPath(); ctx.moveTo(px, py + ph * 0.05); ctx.lineTo(px + pw, py); ctx.lineTo(px + pw * 0.97, py + ph); ctx.lineTo(px + pw * 0.02, py + ph * 0.96); ctx.closePath()
  ctx.fillStyle = o.bg || '#f6efe0'; ctx.fill(); ctx.save(); ctx.clip()
  if (o.bgFn) o.bgFn(px, py, pw, ph)
  const s = Math.max(pw / sw, ph / sh) * (o.zoom || 1), dw = sw * s, dh = sh * s
  ctx.imageSmoothingEnabled = false
  if (o.dir < 0) { ctx.translate(px + pw / 2, 0); ctx.scale(-1, 1); ctx.translate(-(px + pw / 2), 0) }
  ctx.drawImage(im, sx, sy, sw, sh, px + pw / 2 - dw / 2 + (o.ox || 0) * pw, py + ph / 2 - dh / 2 + (o.oy || 0) * ph, dw, dh)
  ctx.restore()
  ctx.lineWidth = Math.max(3, ph * 0.012); ctx.strokeStyle = o.edge || '#111'; ctx.stroke(); ctx.restore()
  return true
}
// the fighter's skin recolor of a sheet that isn't in its animationData (e.g. "sakura_heavy_down_uniform.png" →
// "…__blue.png" when the idle sheet is "…__blue.png"); falls back to the base sheet until / unless the recolor loads
export function skinned(f, src) {
  const idle = animOf(f, 'idle')?.sheet || '', m = idle.match(/__([a-z0-9_]+)\.png$/i)
  if (!m) return src
  const alt = src.replace(/\.png$/i, `__${m[1]}.png`), im = image(alt)
  return ready(im) ? alt : src
}
