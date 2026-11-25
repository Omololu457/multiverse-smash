// mrIncredibleUltFx.js — RENDER-ONLY half of Mr. Incredible's BACK IN MY PRIME activation (mrIncredibleUlt.js). One screen pass
// (cineRegistry overlay, identity transform): Bob from his REAL skin sheets (veteran idle → prime idle / intro, the skin the player
// picked), a sepia film grade, the spinning newspaper montage, the "i" emblem bloom + light rays, the white frame, the title and
// the stat chips. Pure function of the cinematic's frames; noise = integer hash; honours Reduce Flashing / Motion.
import { clamp, smooth, outE, hash, ctrX, feet, view, sprite, punchIn, wash, desat, title, sub, letterbox, glow, rings, calmMotion, calmFlash } from './bleachUltKit.js'
import { MR_FORM_SKINS } from './mrIncredibleSkins.js'

const ORANGE = '#ff7a1a', RED = '#d0202c', GOLD = '#ffd23a'
const PAPERS = [['MR. INCREDIBLE SAVES THE DAY!', 'Hero stops runaway train with bare hands'], ['“INCREDIBLE!” CITY CHEERS', 'Masked strongman foils bank heist'], ['SUPER STRENGTH, SUPER HEART', 'He did it again — and again']]

function forms(f) { return MR_FORM_SKINS[f?.skinId] || MR_FORM_SKINS.default }
function film(ctx, W, H, real, a) {
  if (a <= 0) return
  ctx.save()
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(20,10,0,${(0.75 * a).toFixed(3)})`)
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H)
  if (!calmMotion()) {
    const fr = real >> 1; ctx.globalAlpha = 0.1 * a; ctx.fillStyle = '#fff4d8'
    for (let i = 0; i < 120; i++) ctx.fillRect(hash(i, fr) * W, hash(i + 300, fr) * H, 2, 2)
    ctx.globalAlpha = 0.2 * a; for (let i = 0; i < 2; i++) if (hash(i, fr + 3) > 0.55) ctx.fillRect(hash(i, fr + 5) * W, 0, 1, H)
  }
  ctx.restore()
}
function paper(ctx, W, H, i, u, n) {   // one spinning front page
  if (u <= 0) return
  const e = outE(clamp(u / 0.35, 0, 1)), [head, deck] = PAPERS[i]
  const x = W * (0.3 + i * 0.2), y = H * (0.45 + (i % 2 ? -0.04 : 0.05)), s = (0.25 + 0.75 * e) * (1 + 0.04 * clamp(u - 0.35, 0, 1)), rot = (1 - e) * (i % 2 ? -6 : 6) + (i - 1) * 0.08
  const w = H * 0.62, h = H * 0.44
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s)
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18
  ctx.fillStyle = '#efe3c4'; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.shadowBlur = 0
  ctx.fillStyle = '#2a2014'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `700 ${Math.round(h * 0.07)}px Georgia, "Times New Roman", serif`; ctx.fillText('THE  METROVILLE  TIMES', 0, -h * 0.4)
  ctx.fillRect(-w * 0.45, -h * 0.33, w * 0.9, 2)
  ctx.font = `900 ${Math.round(h * 0.11)}px Georgia, "Times New Roman", serif`
  const words = head.split(' '), mid = Math.ceil(words.length / 2)
  ctx.fillText(words.slice(0, mid).join(' '), 0, -h * 0.2); ctx.fillText(words.slice(mid).join(' '), 0, -h * 0.07)
  ctx.font = `italic 600 ${Math.round(h * 0.05)}px Georgia, serif`; ctx.fillText(deck, 0, h * 0.04)
  // the photo: a red-suited hero silhouette in a frame
  ctx.fillStyle = '#b7a88a'; ctx.fillRect(-w * 0.42, h * 0.1, w * 0.36, h * 0.34)
  ctx.fillStyle = '#7a1a14'; ctx.beginPath(); ctx.arc(-w * 0.24, h * 0.2, h * 0.05, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(-w * 0.3, h * 0.25, w * 0.12, h * 0.17)
  ctx.fillStyle = '#6b5f4a'; for (let r = 0; r < 6; r++) ctx.fillRect(-w * 0.02, h * (0.12 + r * 0.055), w * 0.44 * (r === 5 ? 0.6 : 1), h * 0.02)
  ctx.restore(); void n
}
function emblem(ctx, x, y, r, a, rot = 0) {   // the family "i" emblem
  if (a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot)
  ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = r * 0.14; ctx.strokeStyle = '#141414'; ctx.stroke()
  ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.72, r * 0.66, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.arc(0, -r * 0.36, r * 0.12, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-r * 0.12, -r * 0.16); ctx.lineTo(r * 0.12, -r * 0.16); ctx.lineTo(r * 0.09, r * 0.48); ctx.lineTo(-r * 0.09, r * 0.48); ctx.closePath(); ctx.fill()
  ctx.restore()
}
function rays(ctx, x, y, R, a, real) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(calmMotion() ? 0 : real * 0.01)
  for (let i = 0; i < 18; i++) {
    const t = (i / 18) * Math.PI * 2, w = 0.06 + 0.04 * hash(i, 9)
    const g = ctx.createLinearGradient(0, 0, Math.cos(t) * R, Math.sin(t) * R); g.addColorStop(0, 'rgba(255,200,80,0.7)'); g.addColorStop(1, 'rgba(255,120,30,0)')
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, t - w, t + w); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}
function chips(ctx, W, H, u) {
  const L = ['DMG ×1.30', 'SPEED ×1.15', 'AIR ×1.10', '15 s'], fs = H * 0.032
  ctx.save(); ctx.font = `900 ${Math.round(fs)}px Impact, "Arial Black", sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'
  const ws = L.map(t => ctx.measureText(t).width + fs * 1.4), tot = ws.reduce((a, b) => a + b, 0) + fs * 0.6 * (L.length - 1)
  let x = W / 2 - tot / 2
  L.forEach((t, i) => {
    const a = clamp((u - i * 0.08) / 0.15, 0, 1), y = H * 0.83 + (1 - outE(a)) * H * 0.04
    ctx.globalAlpha = a; ctx.fillStyle = 'rgba(20,6,2,0.85)'; ctx.fillRect(x, y - fs * 0.8, ws[i], fs * 1.6)
    ctx.fillStyle = ORANGE; ctx.fillRect(x, y - fs * 0.8, fs * 0.25, fs * 1.6)
    ctx.fillStyle = GOLD; ctx.fillText(t, x + ws[i] / 2 + fs * 0.1, y); x += ws[i] + fs * 0.6
  })
  ctx.restore()
}

export function drawMrIncredibleUltScreen(ctx, canvas, C, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = C.k | 0, f = C.f, dir = C.dir
  if (!f) return false
  const V = view(W, H), z = V.z, fp = V.p(ctrX(f), feet(f)), chest = { x: fp.x, y: fp.y - 80 * z }
  const F = forms(f), held = C.hold > 0
  const jit = held && !calmMotion() ? { x: (hash(C.real, 1) - 0.5) * 16, y: (hash(C.real, 2) - 0.5) * 16 } : { x: 0, y: 0 }
  const sep = k < B.suitAt ? 1 : clamp(1 - (k - B.suitAt) / 18, 0, 1)
  ctx.save(); ctx.translate(jit.x, jit.y)
  // 1) grade: sepia memory → colour floods back
  desat(ctx, W, H, 0.85 * sep); wash(ctx, W, H, '#6b4218', 0.38 * sep, 'soft-light'); wash(ctx, W, H, '#1a0c02', 0.35 * sep, 'multiply')
  if (k >= B.suitAt) { const u = clamp((k - B.suitAt) / 20, 0, 1); wash(ctx, W, H, '#3a0806', 0.45 * u * (k < B.primeAt + 30 ? 1 : clamp(1 - (k - B.primeAt - 30) / 14, 0, 1)), 'multiply') }
  // 2) emblem + rays behind him
  if (k >= B.suitAt) {
    const u = outE((k - B.suitAt) / 22), fade = k > B.total - 18 ? clamp((B.total - k) / 18, 0, 1) : 1
    rays(ctx, chest.x, chest.y, H * 0.9 * u, 0.55 * fade, C.real)
    emblem(ctx, chest.x, chest.y - 10 * z, H * 0.3 * u, 0.9 * fade, calmMotion() ? 0 : (1 - u) * -2)
  }
  // 3) Bob — veteran → prime
  const vet = F.veteran || {}, pri = F.prime || {}
  if (k < B.flashAt) {
    const into = k >= B.suitAt ? clamp((k - B.suitAt) / (B.flashAt - B.suitAt), 0, 1) : 0
    sprite(ctx, f, vet.idle ? vet.idle : ['idle'], (C.real >> 2) % 16, fp.x, fp.y, z, dir, { alpha: 1 - into * 0.6, tint: into > 0 ? '#ffffff' : null, tintA: into * 0.8 })
    if (into > 0) sprite(ctx, f, pri.idle ? pri.idle : ['idle'], (C.real >> 2) % 7, fp.x, fp.y, z, dir, { alpha: into, tint: '#ffe0a0', tintA: 1 - into })
    if (into > 0) glow(ctx, chest.x, chest.y, 140 * z * into, '255,170,60', 0.5 * into)
  } else {
    const pk = k - B.flashAt, intro = pri.intro || pri.idle
    sprite(ctx, f, intro || ['idle'], pri.intro ? Math.min((pri.intro.frames || 1) - 1, pk >> 2) : (C.real >> 2) % 7, fp.x, fp.y, z, dir)
    if (pk < 30) rings(ctx, fp.x, fp.y - 6 * z, pk / 30, 3, W * 0.6, pk < 8 ? '#ffffff' : ORANGE, 12 * z, 0.35)
  }
  // 4) close-ups
  if (k < B.paperAt) punchIn(ctx, canvas, W, H, chest.x, chest.y - 20 * z, 1.15 + 0.35 * smooth(k / B.paperAt))
  else if (k >= B.suitAt && k < B.flashAt) punchIn(ctx, canvas, W, H, chest.x, chest.y, 1.1 + 0.25 * smooth((k - B.suitAt) / 20))
  else if (k >= B.flashAt && k < B.primeAt + 8) punchIn(ctx, canvas, W, H, chest.x, chest.y, 1.35 - 0.3 * smooth((k - B.flashAt) / 12))
  // 5) the newspaper montage
  if (k >= B.paperAt && k < B.suitAt + 6) {
    const out = k >= B.suitAt ? clamp(1 - (k - B.suitAt) / 6, 0, 1) : 1
    ctx.save(); ctx.globalAlpha = out; wash(ctx, W, H, '#140a02', 0.45)
    for (let i = 0; i < 3; i++) paper(ctx, W, H, i, (k - B.paperAt - i * 16) / 22, k); ctx.restore()
  }
  film(ctx, W, H, C.real, sep)
  // 6) white frame → the title
  const fk = C.flashReal != null ? C.real - C.flashReal : -1   // real frames: the hit-stop holds the picture, not the flash
  if (fk >= 0 && fk < 3 && !calmFlash()) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(-40, -40, W + 80, H + 80) }
  else if (fk >= 3 && fk < 7 && !calmFlash()) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(-40, -40, W + 80, H + 80); ctx.globalCompositeOperation = 'source-over' }
  if (k >= B.primeAt) {
    title(ctx, W, H, 'BACK IN MY PRIME', 'MR. INCREDIBLE  ·  “GLORY DAYS AREN’T OVER”', clamp((k - B.primeAt) / (B.total - B.primeAt + 6), 0, 1),
      { y: 0.2, fs: 0.12, band: 'rgba(24,6,2,0.94)', edge: ORANGE, fill: GOLD, stroke: '#4a0a04', subCol: '#ffd9b0' })
    chips(ctx, W, H, clamp((k - B.primeAt - 6) / 30, 0, 1))
  }
  ctx.restore()
  letterbox(ctx, W, H, C.real, k, B.total - 12, 12, 0.12)
  sub(ctx, W, H, k, 4, B.paperAt, 'MR. INCREDIBLE', '“Fifteen years of paperwork…”', GOLD)
  sub(ctx, W, H, k, B.paperAt + 2, B.suitAt, 'MR. INCREDIBLE', '“…I remember the glory days.”', GOLD)
  sub(ctx, W, H, k, B.suitAt + 2, B.flashAt, 'MR. INCREDIBLE', '“Still got it.”', GOLD)
  sub(ctx, W, H, k, B.primeAt + 10, B.total, 'MR. INCREDIBLE', '“Back in my prime!”', GOLD)
  return true
}
