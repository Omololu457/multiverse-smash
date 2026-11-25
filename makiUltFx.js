// makiUltFx.js — RENDER-ONLY overlay for Maki's SHIBUYA — AWAKENING activation (makiUlt.js). Runs on the legacy frozen
// activation's own frame clock k (0..150; burst at 105). Maki is drawn from her real reveal strip
// (maki_shibuya_intro_covered.png, 4 × 100×58: kneeling beside Mai → rising with the blade → standing → ready) over her hidden
// engine sprite. Gore-free (the covered art), quiet and respectful in the loss beat. Pure functions of k; noise = integer hash.
// Reduce Flashing → no white frame; Reduce Motion → no drifting embers / jitter.
import { clamp, smooth, outE, hash, view, image, ready, punchIn, wash, desat, speedLines, title, calligraphy, letterbox, glow, rings,
  calmMotion, calmFlash } from './bleachUltKit.js'

const SHEET = './maki_shibuya_intro_covered.png', CW = 100, CH = 58, BURST = 105, OUT = 132
const EMBER = '255,120,40'

// one cell of the reveal strip, cell-centred on x, bottom on feetY (cell 0 has a stray "Intro" label in its top rows → cropped)
function reveal(ctx, fr, x, feetY, s, dir, o = {}) {
  const im = image(SHEET); if (!ready(im)) return
  const top = fr === 0 ? 14 : 0, sx = fr * CW, h = CH - top
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= o.alpha ?? 1
  ctx.translate(Math.round(x), Math.round(feetY)); if (dir < 0) ctx.scale(-1, 1)
  if (o.tint) {   // silhouette / tint pass via a scratch canvas
    const cv = tintCv(); cv.g.clearRect(0, 0, CW, CH); cv.g.globalCompositeOperation = 'source-over'; cv.g.drawImage(im, sx, top, CW, h, 0, 0, CW, h)
    cv.g.globalCompositeOperation = 'source-atop'; cv.g.globalAlpha = o.tintA ?? 1; cv.g.fillStyle = o.tint; cv.g.fillRect(0, 0, CW, CH); cv.g.globalAlpha = 1
    ctx.drawImage(cv.cv, 0, 0, CW, h, -CW / 2 * s, -h * s, CW * s, h * s)
  } else ctx.drawImage(im, sx, top, CW, h, -CW / 2 * s, -h * s, CW * s, h * s)
  ctx.restore()
}
let _t = null
function tintCv() { if (!_t) { const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; _t = { cv, g: cv.getContext('2d') } } return _t }
const frameAt = k => (k < 45 ? 0 : k < 80 ? 1 : k < BURST ? 2 : 3)

export function drawMakiUltScreen(ctx, canvas, S, k, total) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, f = S.caster, dir = f.facing || 1
  const V = view(W, H), z = V.z, s = (f.spriteScale || 1.86) * z
  const cx = (f.x || 0) + (f.w || 48) / 2, feet = (f.y || 0) + (f.h || 94)
  const fp = V.p(cx, feet), fr = frameAt(k), pb = k - BURST
  const jit = pb >= 0 && pb < 12 && !calmMotion() ? { x: (hash(k, 1) - 0.5) * 14, y: (hash(k, 2) - 0.5) * 14 } : { x: 0, y: 0 }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the night: colourless and cold for the loss; the estate's fire creeps in as she rises
  const dim = k < OUT ? smooth(k / 14) : clamp(1 - (k - OUT) / 18, 0, 1)
  desat(ctx, W, H, (k < 45 ? 0.95 : 0.6) * dim)
  wash(ctx, W, H, k < 45 ? '#04070e' : '#120604', 0.6 * dim, 'multiply')
  if (k >= 40) { const fa = smooth((k - 40) / 30) * dim; firelight(ctx, W, H, fa, k) }
  if (k < 45 && !calmMotion()) rain(ctx, W, H, k, 0.5 * dim)

  // 2) embers lift around her once she rises; the burst's ring
  if (k >= 45 && !calmMotion()) embers(ctx, fp.x, fp.y, z, k, dim * smooth((k - 45) / 20), W)
  if (k >= 80 && k < BURST + 30) glow(ctx, fp.x, fp.y - 55 * z, (110 + 10 * Math.sin(k * 0.5)) * z, EMBER, 0.35 * (k < BURST ? smooth((k - 80) / 20) : clamp(1 - (k - BURST) / 30, 0, 1)))
  if (pb >= 0 && pb < 50) rings(ctx, fp.x, fp.y - 10 * z, pb / 50, 3, W * 0.7, '#ff9a5a', 10 * z, 0.3)

  // 3) Maki herself
  reveal(ctx, fr, fp.x, fp.y, s, dir)

  // 4) close-ups: the kneel (a slow, gentle push), the eyes as she stands
  if (k < 45) punchIn(ctx, canvas, W, H, fp.x, fp.y - 30 * z, 1 + 0.3 * smooth(k / 44))
  else if (k >= 84 && k < BURST - 4) punchIn(ctx, canvas, W, H, fp.x, fp.y - 95 * z, 1.6 + 0.3 * smooth((k - 84) / 17))

  // 5) the first cut: a horizontal draw across the whole screen → the frame splits for a beat
  if (pb >= 0 && pb < 2 && !calmFlash()) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-40, -40, W + 80, H + 80); reveal(ctx, fr, fp.x, fp.y, s, dir, { tint: '#000000' }) }
  else if (pb >= 2 && pb < 8) { ctx.fillStyle = calmFlash() ? '#1a0a04' : '#3a1204'; ctx.fillRect(-40, -40, W + 80, H + 80); speedLines(ctx, W, H, fp.x, fp.y - 60 * z, 70, 23 + pb, '#ffb070', 0.7, false, pb); reveal(ctx, fr, fp.x, fp.y, s, dir, { tint: '#fff0e0' }) }
  if (pb >= 0 && pb < 26) cut(ctx, canvas, W, H, fp.y - 62 * z, pb, dir)
  ctx.restore()

  // 6) words
  if (k >= 6 && k < 44) calligraphy(ctx, W, H, '真依', (k - 6) / 38, { x: dir > 0 ? 0.84 : 0.16, y: 0.24, size: 0.12, col: '#dfe6ef', edge: '#0a0e16', glow: 'rgba(160,190,230,0.5)' })
  if (k >= 82 && k < BURST) calligraphy(ctx, W, H, '覚醒', (k - 82) / (BURST - 82), { x: dir > 0 ? 0.86 : 0.14, y: 0.22, size: 0.13, col: '#ffffff', edge: '#3a0a00', glow: 'rgba(255,120,40,0.85)' })
  if (k >= 60 && k < 100) caption(ctx, W, H, k < 80 ? 'No cursed energy left. Not a single drop.' : 'The restriction is complete.', k < 80 ? (k - 60) / 20 : (k - 80) / 20)
  if (pb >= 8 && k < OUT + 14) title(ctx, W, H, 'ZENIN MAKI', 'AWAKENED  ·  HEAVENLY RESTRICTION PERFECTED', (k - BURST - 8) / (OUT + 14 - BURST - 8),
    { y: 0.24, fs: 0.13, band: 'rgba(16,6,2,0.92)', edge: '#ff8a3a', fill: '#ffffff', stroke: '#8a2a00', kanji: '禪院真希', kanjiCol: '#ffb070' })
  if (pb >= 14 && k < total) chips(ctx, W, H, clamp((pb - 14) / 28, 0, 1), k >= OUT + 4 ? clamp(1 - (k - OUT - 4) / 14, 0, 1) : 1)

  letterbox(ctx, W, H, k, k, OUT, 16, k < 45 ? 0.15 : 0.12)
  return k < OUT + 16
}

function firelight(ctx, W, H, a, k) {
  if (a <= 0) return
  const g = ctx.createLinearGradient(0, H, 0, H * 0.2)
  g.addColorStop(0, `rgba(255,110,30,${(0.35 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(255,110,30,0)')
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85 + 0.15 * Math.sin(k * 0.3); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
}
function rain(ctx, W, H, k, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#9fb3cc'; ctx.lineWidth = 1
  for (let i = 0; i < 70; i++) {
    const x = (hash(i, 3) * W * 1.2 + k * 3) % (W * 1.2) - W * 0.1, y = (hash(i, 4) * H + k * (18 + hash(i, 5) * 8)) % H
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 18); ctx.stroke()
  }
  ctx.restore()
}
function embers(ctx, x, y, z, k, a, W) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 40; i++) {
    const ph = ((k * (0.7 + hash(i, 2)) + hash(i, 3) * 80) % 80) / 80
    const px = x + (hash(i, 4) - 0.5) * W * 0.8 + Math.sin(k * 0.06 + i) * 16 * z, py = y - ph * 420 * z
    ctx.globalAlpha = a * Math.sin(Math.PI * ph) * 0.9; ctx.fillStyle = i % 4 ? '#ff7a2a' : '#ffd8a0'
    ctx.fillRect(px, py, 2 + hash(i, 6) * 3, 2 + hash(i, 6) * 3)
  }
  ctx.restore()
}
let _c = null
function cut(ctx, canvas, W, H, y, pb, dir) {
  if (!_c) { const cv = document.createElement('canvas'); _c = { cv, g: cv.getContext('2d') } }
  if (_c.cv.width !== W || _c.cv.height !== H) { _c.cv.width = W; _c.cv.height = H }
  _c.g.setTransform(1, 0, 0, 1, 0, 0); _c.g.clearRect(0, 0, W, H); _c.g.drawImage(canvas, 0, 0)
  const u = pb / 26, sep = (calmMotion() ? 4 : 14) * Math.sin(Math.PI * clamp(u * 1.2, 0, 1)) * (H / 720), drawU = outE(clamp(pb / 5, 0, 1))
  ctx.save()
  if (pb >= 5) {   // the two halves slide apart along the cut, then rejoin
    ctx.fillStyle = '#000'; ctx.fillRect(0, y - sep, W, sep * 2)
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, y); ctx.clip(); ctx.drawImage(_c.cv, dir * sep * 1.5, -sep); ctx.restore()
    ctx.save(); ctx.beginPath(); ctx.rect(0, y, W, H - y); ctx.clip(); ctx.drawImage(_c.cv, -dir * sep * 1.5, sep); ctx.restore()
  }
  ctx.globalCompositeOperation = 'lighter'
  const x0 = dir > 0 ? 0 : W, x1 = x0 + dir * W * drawU
  for (const [lw, col] of [[Math.max(6, sep * 2), `rgba(${EMBER},${(0.6 * (1 - u)).toFixed(3)})`], [3, `rgba(255,240,220,${(1 - u).toFixed(3)})`]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke()
  }
  ctx.restore()
}
function caption(ctx, W, H, text, u) {
  const a = Math.min(clamp(u / 0.25, 0, 1), clamp((1 - u) / 0.2, 0, 1))
  ctx.save(); ctx.globalAlpha = a; ctx.font = `italic 600 ${Math.round(H * 0.032)}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(text, W / 2, H * 0.82); ctx.fillStyle = '#ffe2c8'; ctx.fillText(text, W / 2, H * 0.82); ctx.restore()
}
function chips(ctx, W, H, u, a) {
  const items = ['DMG ×1.25', 'SPD ×1.10', 'DEF ×1.05'], fs = Math.round(H * 0.034)
  ctx.save(); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  items.forEach((s, i) => {
    const ui = clamp(u * 3 - i * 0.6, 0, 1); if (ui <= 0) return
    const x = W * (0.32 + i * 0.18), y = H * 0.8 + (1 - outE(ui)) * 30
    ctx.globalAlpha = a * ui; ctx.fillStyle = 'rgba(20,8,2,0.85)'; ctx.fillRect(x - fs * 2.6, y - fs * 0.75, fs * 5.2, fs * 1.5)
    ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = 2; ctx.strokeRect(x - fs * 2.6, y - fs * 0.75, fs * 5.2, fs * 1.5)
    ctx.fillStyle = '#ffffff'; ctx.fillText(s, x, y)
  })
  ctx.restore()
}
