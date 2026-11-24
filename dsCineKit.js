// dsCineKit.js — shared drawing/camera helpers for the Demon Slayer ultimate cinematics
// (shinobuButterflyCinematic.js, demonSlayerCinematics.js). Render-only + camera framing; no sim state, no RNG.

export const ease = k => k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k)
export const cx = o => (o?.x || 0) + (o?.w || 60) / 2
export const hsh = (a, b) => { let v = (a * 374761393 + b * 668265263) >>> 0; v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0; return ((v ^ (v >>> 16)) >>> 0) / 4294967296 }

export function toScreen(cam, cw, ch, x, y) {
  if (!cam) return { x: cw / 2, y: ch / 2, z: 1 }
  const z = cam.zoom || 1
  return { x: (x - (cam.x || 0) - (cam.leadX || 0) + (cam.shakeX || 0)) * z + cw / 2, y: (y - (cam.y || 0) + (cam.shakeY || 0)) * z + ch / 2, z }
}

// lift the camera's zoom/pan limits for a close-up cinematic; returns the saved limits for camRestore
export function camOpen(cam, maxZoom = 3.0) {
  if (!cam) return null
  const saved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }
  cam.maxZoom = maxZoom; cam.maxZoomStep = 0.07; cam.maxPanStep = 90
  return saved
}
export function camRestore(cam, saved) {
  if (!cam || !saved) return
  cam.maxZoom = saved.maxZoom; cam.maxZoomStep = saved.maxZoomStep; cam.maxPanStep = saved.maxPanStep
}

// hold a fighter on one cell of an action strip through a freeze (the cast pose wins over the attack pose)
export function pose(f, move, fi, timer = 600) {
  if (!f) return
  const sh = f.spriteHandler
  if (!move) { f._spriteCastMove = null; f._spriteCastTimer = 0; f._animFrozen = false; return }
  f._spriteCastMove = move; f._spriteCastTimer = timer; f._animFrozen = true
  if (sh) { const total = (sh._actionDef && sh._actionDef.frames) || 1; sh.frameIndex = Math.max(0, Math.min(total - 1, fi)) }
}

// brush-calligraphy words: each [atFrame, kanji, english]; slams in (scale 1.8→1) on the far side of `anchorX`
export function drawCalligraphy(ctx, cw, ch, f, words, anchorX, { fade = 1, accent = "#ff3a12", ink = "#fff1dc", prefix = "", last = -1 } = {}) {
  const side = anchorX < cw / 2 ? 0.74 : 0.26
  const lastI = last < 0 ? words.length - 1 : last
  words.forEach(([at, jp], i) => {
    if (f < at) return
    const k = Math.min(1, (f - at) / 6), sc = 1.8 - 0.8 * ease(k), size = Math.round(ch * (i === lastI ? 0.18 : 0.1) * sc)
    const x = cw * side + (i - (words.length - 1) / 2) * cw * 0.08 * (side > 0.5 ? -1 : 1), y = ch * (0.22 + i * 0.02)
    ctx.globalAlpha = fade * Math.min(1, k * 2)
    ctx.save(); ctx.translate(x, y); ctx.textAlign = "center"; ctx.textBaseline = "top"
    ctx.font = `900 ${size}px "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif`
    ;[...jp].forEach((c, j) => {
      ctx.lineWidth = Math.max(4, size * 0.12); ctx.strokeStyle = "#0c0410"; ctx.strokeText(c, 0, j * size * 0.98)
      ctx.fillStyle = i === lastI ? accent : ink; ctx.fillText(c, 0, j * size * 0.98)
    })
    ctx.restore()
  })
  const said = words.filter(([at]) => f >= at).map(w => w[2]).join("  ·  ")
  if (!said) return
  const line = prefix ? prefix + "  ·  " + said : said
  ctx.globalAlpha = fade; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = `800 ${Math.round(ch * 0.032)}px Georgia, serif`
  ctx.lineWidth = 5; ctx.strokeStyle = "#0c0410"; ctx.strokeText(line, cw / 2, ch * 0.86); ctx.fillStyle = "#ffe6c4"; ctx.fillText(line, cw / 2, ch * 0.86)
}

export function drawLetterbox(ctx, cw, ch, f, total) {
  const lb = Math.min(1, f / 10) * (f > total - 20 ? Math.max(0, (total - f) / 20) : 1), bar = Math.round(ch * 0.09 * lb)
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, cw, bar); ctx.fillRect(0, ch - bar, cw, bar)
}

export function drawVignette(ctx, cw, ch, x, y, alpha, rgb = "20,4,20") {
  if (alpha <= 0) return
  const vg = ctx.createRadialGradient(x, y, Math.min(cw, ch) * 0.12, x, y, Math.max(cw, ch) * 0.75)
  vg.addColorStop(0, `rgba(${rgb},0)`); vg.addColorStop(1, `rgba(${rgb},${alpha})`)
  ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch)
}

// a jagged lightning bolt between two screen points (deterministic per seed)
export function bolt(ctx, x1, y1, x2, y2, seed, width, col, segs = 14, jag = 26) {
  ctx.strokeStyle = col; ctx.lineWidth = width; ctx.lineJoin = "miter"; ctx.beginPath(); ctx.moveTo(x1, y1)
  for (let i = 1; i < segs; i++) { const k = i / segs; ctx.lineTo(x1 + (x2 - x1) * k + (hsh(seed, i) - 0.5) * jag * 0.4, y1 + (y2 - y1) * k + (hsh(seed, i + 50) - 0.5) * jag) }
  ctx.lineTo(x2, y2); ctx.stroke()
}

// a butterfly (wing flap phase t), screen space
export function butterfly(ctx, x, y, s, t, col, edge = "#1a0626") {
  const fl = 0.35 + 0.65 * Math.abs(Math.sin(t))
  ctx.fillStyle = col; ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, s * 0.12)
  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(x + sgn * s * 0.55 * fl, y - s * 0.25, s * 0.6 * fl, s * 0.5, sgn * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.ellipse(x + sgn * s * 0.4 * fl, y + s * 0.35, s * 0.4 * fl, s * 0.32, -sgn * 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  }
  ctx.fillStyle = edge; ctx.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 1.1)
}

export function flameTongue(ctx, x, y, h, w, lean, t, col) {
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w, y)
  ctx.quadraticCurveTo(x - w * 0.6 + lean * 0.4, y - h * 0.55, x + lean + Math.sin(t) * w * 0.3, y - h)
  ctx.quadraticCurveTo(x + w * 0.6 + lean * 0.4, y - h * 0.5, x + w, y); ctx.closePath(); ctx.fill()
}
