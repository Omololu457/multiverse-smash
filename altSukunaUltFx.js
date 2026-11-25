// altSukunaUltFx.js — RENDER-ONLY half of Alternate Sukuna's DOMAIN EXPANSION — MALEVOLENT SHRINE (altSukunaUlt.js). One screen
// pass owning the picture while the cinematic runs: Sukuna from his real sheets (altSukunaUltCharge = the Enma hand-sign,
// altSukunaBeam = the Fūga draw → thrust), the foe from theirs, and the three real shrine paintings (alt_sukuna_domain1-3)
// rising out of a blood-red sea behind him. Signature looks: a crimson sky with a black sun, the shrine's gaping mouths,
// a domain full of invisible cuts carving the floor, a colossal X Cleave, and the Fūga fire arrow → a dome of flame.
// Gore-free (cuts are light streaks, the "sea" is a flat crimson pool). Pure functions of the frames; noise = integer hash.
// Reduce Flashing → no white frames; Reduce Motion → no jitter / drifting particles.
import { clamp, smooth, outE, hash, view, sprite, image, ready, punchIn, wash, desat, speedLines, title, calligraphy, sub, letterbox,
  star, glow, rings, damageNumber, calmMotion, calmFlash } from './bleachUltKit.js'

export const SHRINE = ['./alt_sukuna_domain1.png', './alt_sukuna_domain2.png', './alt_sukuna_domain3.png']
const RED = '255,40,40', FIRE = '255,140,40'

function sFrame(S, k, B) {
  if (k < B.shrineAt) return { keys: ['altSukunaUltCharge'], fr: Math.min(4, (k / 8) | 0) }
  if (k < B.openAt) return { keys: ['altSukunaUltCharge'], fr: 4 }
  if (k < B.fireAt) return { keys: ['altSukunaBeam'], fr: k < B.openAt + 14 ? 0 : k < B.fireAt - 10 ? 1 : 2 }
  if (k < B.calmAt) return { keys: ['altSukunaBeam'], fr: 3 }
  return { keys: ['idle'], fr: (S.real >> 3) % 3 }
}

export function drawAltSukunaUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pf = S.fireReal != null ? S.real - S.fireReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pf >= 0 ? 18 : 8), y: (hash(S.real, 2) - 0.5) * (pf >= 0 ? 18 : 8) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y, tHit = { x: tp.x, y: tp.y - 60 * z }
  const domA = k < B.shrineAt ? smooth((k - 20) / 22) : k < B.outAt ? 1 : clamp(1 - (k - B.outAt) / 10, 0, 1)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the world drowns in ink, then the domain: crimson sky, black sun, a blood-red sea at the floor
  wash(ctx, W, H, '#050000', 0.55 * smooth(S.real / 16) * (k < B.outAt ? 1 : domA), 'multiply')
  if (domA > 0) domainSky(ctx, W, H, floorY, domA, S.real, k >= B.openAt && k < B.fireAt ? 0.5 : 1)

  // 2) the shrine rises behind him (three paintings: rising → full → the skull heap), mouths breathing
  if (k >= B.shrineAt - 2) {
    const u = clamp((k - B.shrineAt + 2) / 30, 0, 1), sink = k >= B.calmAt ? smooth((k - B.calmAt) / (B.outAt - B.calmAt)) : 0
    const idx = k < B.shrineAt + 16 ? 0 : k < B.shrineAt + 34 ? 1 : 2
    const im = image(SHRINE[idx])
    if (ready(im)) {
      const sh = H * 0.78 * (k >= B.openAt && k < B.fireAt ? 0.95 : 1), sw = im.width * sh / im.height
      const bx = fp.x - dir * W * 0.22 - sw / 2, by = floorY + 20 * z - sh * (0.35 + 0.65 * outE(u)) + sink * sh * 0.9
      const br = 1 + (k < B.dismantleAt ? 0.015 * Math.sin(S.real * 0.12) : 0)
      ctx.save(); ctx.globalAlpha = domA * clamp(u * 2, 0, 1); ctx.imageSmoothingEnabled = false
      ctx.beginPath(); ctx.rect(-40, -40, W + 80, floorY + 24 * z + 40); ctx.clip()
      ctx.translate(bx + sw / 2, by + sh); ctx.scale(br, br); ctx.drawImage(im, -sw / 2, -sh, sw, sh); ctx.restore()
      if (k < B.dismantleAt) glow(ctx, bx + sw / 2, by + sh * 0.5, sw * 0.5, RED, 0.2 * domA)
    }
    bloodSea(ctx, W, floorY, z, domA, S.real)
  }

  // 3) the sure-hit: hundreds of invisible cuts carve the floor / the air, six land on the target
  if (k >= B.dismantleAt && k < B.cleaveAt + 14) cutStorm(ctx, W, H, floorY, z, k - B.dismantleAt, S.real, B.cleaveAt - B.dismantleAt)

  // 4) fighters
  drawFoe(ctx, S, V, k, tp, B, pf)
  const { keys, fr } = sFrame(S, k, B)
  sprite(ctx, f, keys, fr, fp.x, fp.y, z, S.fFace, { frame: true })
  if (k >= B.openAt && k < B.fireAt) {      // the Fūga: a fire arrow forms between his hands, drawn back like a bow
    const u = smooth((k - B.openAt) / (B.fireAt - B.openAt - 6)), hx = fp.x + dir * 30 * z, hy = fp.y - 66 * z
    glow(ctx, hx, hy, (40 + 90 * u) * z, FIRE, 0.7 * u)
    arrow(ctx, hx - dir * 40 * z * u, hy, dir, (60 + 80 * u) * z, z, u, S.real)
  }
  for (const at of B.dHits) { const kk = k - at; if (kk >= 0 && kk < 8) { cutX(ctx, tHit.x, tHit.y, (60 + hash(at, 3) * 40) * z, hash(at, 4) * Math.PI, 1 - kk / 8, z) } }
  for (const [at, ang] of [[B.cleaveAt, -0.7], [B.cleave2, 0.7]]) {
    const kk = k - at; if (kk >= -3 && kk < 22) bigCleave(ctx, W, H, tHit.x, tHit.y, ang * dir, kk, z)
  }

  // 5) close-ups: the hand-sign, the eyes as the shrine opens, the bow drawn
  if (k < 34) punchIn(ctx, canvas, W, H, fp.x, fp.y - 70 * z, 1.3 + 0.4 * smooth(k / 30))
  else if (k >= B.openAt + 22 && k < B.fireAt - 4) punchIn(ctx, canvas, W, H, fp.x + dir * 20 * z, fp.y - 66 * z, 1.35 + 0.25 * smooth((k - B.openAt - 22) / 18))
  if (k >= B.fireAt - 6 && k < B.fireAt) speedLines(ctx, W, H, fp.x + dir * 30 * z, fp.y - 66 * z, 70, 31, '#ffd08a', 0.6, true, S.real)

  // 6) Fūga: white → ember frame (black silhouettes) → the dome of flame swallows the target
  if (pf >= 0 && pf < 3 && !calmFlash()) impact(ctx, W, H, S, fp, tp, k, B, '#ffffff', '#1a0400', pf)
  else if (pf >= 3 && pf < 10) impact(ctx, W, H, S, fp, tp, k, B, '#5a0e00', '#000000', pf)
  if (pf >= 6 && k < B.outAt + 6) fireDome(ctx, W, tp.x, floorY, z, pf - 6, S.real, k >= B.calmAt ? clamp(1 - (k - B.calmAt) / (B.outAt - B.calmAt + 6), 0, 1) : 1)
  if (pf >= 0 && pf < 50) rings(ctx, tp.x, floorY - 30 * z, pf / 50, 3, W * 0.8, '#ffb070', 12 * z, 0.4)
  ctx.restore()

  // 7) words
  if (k >= 4 && k < B.shrineAt) calligraphy(ctx, W, H, '領域展開', (k - 4) / (B.shrineAt - 4), { x: dir > 0 ? 0.82 : 0.18, y: 0.24, size: 0.11, col: '#ffffff', edge: '#2a0000', glow: 'rgba(255,40,40,0.8)' })
  if (k >= B.shrineAt && k < B.dismantleAt) title(ctx, W, H, 'MALEVOLENT SHRINE', 'DOMAIN EXPANSION  ·  KING OF CURSES', (k - B.shrineAt) / (B.dismantleAt - B.shrineAt),
    { y: 0.2, fs: 0.11, band: 'rgba(20,0,0,0.92)', edge: '#ff3a3a', fill: '#ffffff', stroke: '#6a0000', kanji: '伏魔御廚子', kanjiCol: '#ff8080' })
  if (k >= B.dismantleAt && k < B.cleaveAt - 6) calligraphy(ctx, W, H, '解', (k - B.dismantleAt) / (B.cleaveAt - 6 - B.dismantleAt), { x: dir > 0 ? 0.86 : 0.14, y: 0.22, size: 0.16, col: '#ffffff', edge: '#2a0000', glow: 'rgba(255,60,60,0.8)' })
  if (k >= B.cleaveAt - 6 && k < B.openAt) calligraphy(ctx, W, H, '捌', (k - B.cleaveAt + 6) / (B.openAt - B.cleaveAt + 6), { x: dir > 0 ? 0.86 : 0.14, y: 0.22, size: 0.16, col: '#ffffff', edge: '#2a0000', glow: 'rgba(255,60,60,0.8)' })
  if (k >= B.openAt && k < B.fireAt) calligraphy(ctx, W, H, '開', (k - B.openAt) / (B.fireAt - B.openAt), { x: dir > 0 ? 0.84 : 0.16, y: 0.22, size: 0.12, col: '#ffe0b0', edge: '#3a0a00', glow: 'rgba(255,140,40,0.9)' })
  if (pf >= 10 && k < B.outAt) title(ctx, W, H, 'FŪGA', 'OPEN  ·  FLAME ARROW', clamp((pf - 10) / (B.outAt - B.fireAt - 10), 0, 1),
    { y: 0.76, fs: 0.14, band: 'rgba(30,6,0,0.92)', edge: '#ff8a3a', fill: '#ffffff', stroke: '#8a2a00', kanji: '竈', kanjiCol: '#ffb070' })
  if (pf >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.28, pf - 10, '#ff5a2a')
  else if (pf < 0 && k >= B.dismantleAt + 8) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.26, Math.min(30, k - (S.lastHitK ?? k)), '#ff6060')

  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, B.shrineAt, B.shrineAt + 40, 'SUKUNA', 'Malevolent Shrine.', '#ff5a5a')
  sub(ctx, W, H, k, B.cleaveAt - 6, B.cleaveAt + 18, 'SUKUNA', 'Cleave.', '#ff5a5a')
  sub(ctx, W, H, k, B.openAt, B.openAt + 30, 'SUKUNA', 'Open.', '#ff5a5a')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 6, 'SUKUNA', 'It is done.', '#ff5a5a')
  return true
}

function drawFoe(ctx, S, V, k, tp, B, pf) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (S.blocked && k >= B.dHits[0]) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  if (k < B.dHits[0]) { sprite(ctx, t, ['idle'], (S.real >> 3) % 4, tp.x, tp.y, z, fdir, { tint: k >= B.shrineAt ? '#3a0000' : null, tintA: 0.3 }); return }
  if (pf >= 0) { if (pf < 20) return; sprite(ctx, t, ['knockdown', 'hurt'], 9, tp.x, tp.y, z, fdir, { tint: '#2a0a00', tintA: 0.4 }); return }
  const recent = [...B.dHits, B.cleaveAt, B.cleave2].some(d => k - d >= 0 && k - d < 5)
  sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { sx: recent ? 0.9 : 1, sy: recent ? 1.06 : 1, tint: recent ? '#ffffff' : '#3a0000', tintA: recent ? 0.5 : 0.25 })
}
function domainSky(ctx, W, H, floorY, a, real, dimmer) {
  ctx.save(); ctx.globalAlpha = a
  const g = ctx.createLinearGradient(0, 0, 0, floorY)
  g.addColorStop(0, `rgba(40,0,0,${0.92 * dimmer})`); g.addColorStop(0.6, `rgba(150,10,10,${0.85 * dimmer})`); g.addColorStop(1, `rgba(60,0,0,${0.9 * dimmer})`)
  ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, floorY + 40)
  const sx = W * 0.5, sy = H * 0.2, sr = H * 0.11               // the black sun with a red corona
  glow(ctx, sx, sy, sr * 2.2, RED, 0.5 * a * dimmer)
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#ff6a6a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, sr + 2, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}
function bloodSea(ctx, W, y, z, a, real) {
  ctx.save(); ctx.globalAlpha = a
  ctx.fillStyle = '#4a0000'; ctx.fillRect(-40, y - 4 * z, W + 80, 60 * z + 400)
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,80,80,0.35)'; ctx.lineWidth = 1.5
  for (let i = 0; i < 14; i++) {      // slow ripples on the surface
    const yy = y + (4 + i * 5) * z, ph = calmMotion() ? 0 : real * 0.04 + i
    ctx.beginPath(); for (let x = -20; x <= W + 20; x += 24) { const v = yy + Math.sin(x * 0.02 + ph) * 1.5 * z; x === -20 ? ctx.moveTo(x, v) : ctx.lineTo(x, v) } ctx.stroke()
  }
  ctx.restore()
}
function cutStorm(ctx, W, H, floorY, z, kk, real, len) {
  const a = clamp(kk / 6, 0, 1) * (kk > len ? clamp(1 - (kk - len) / 14, 0, 1) : 1)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  const n = Math.min(90, 10 + kk * 3)
  for (let i = 0; i < n; i++) {
    const born = (i * 0.6) | 0, life = kk - born; if (life < 0 || life > 10) continue
    const x = hash(i, 11) * W, y = H * 0.15 + hash(i, 12) * (floorY - H * 0.15), L = (40 + hash(i, 13) * 120) * z, an = hash(i, 14) * Math.PI
    ctx.globalAlpha = a * (1 - life / 10); ctx.strokeStyle = i % 3 ? '#ffffff' : '#ff9090'; ctx.lineWidth = 1.5 + (i % 2)
    const c = Math.cos(an) * L / 2, s = Math.sin(an) * L / 2
    ctx.beginPath(); ctx.moveTo(x - c, y - s); ctx.lineTo(x + c, y + s); ctx.stroke()
  }
  for (let i = 0; i < Math.min(24, kk); i++) {   // scars carved into the floor that stay
    const x = hash(i, 21) * W, L = (30 + hash(i, 22) * 70) * z
    ctx.globalAlpha = a * 0.7; ctx.strokeStyle = '#ffb0b0'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(x - L / 2, floorY + 6 * z + hash(i, 23) * 20 * z); ctx.lineTo(x + L / 2, floorY + 2 * z + hash(i, 24) * 20 * z); ctx.stroke()
  }
  ctx.restore()
}
function cutX(ctx, x, y, L, an, a, z) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  const c = Math.cos(an) * L, s = Math.sin(an) * L
  for (const [lw, col] of [[10 * z, `rgba(${RED},${0.5 * a})`], [3, `rgba(255,255,255,${a})`]]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x - c, y - s); ctx.lineTo(x + c, y + s); ctx.stroke() }
  ctx.restore()
}
function bigCleave(ctx, W, H, x, y, ang, kk, z) {
  const grow = outE(clamp((kk + 3) / 5, 0, 1)), a = kk < 6 ? 1 : clamp(1 - (kk - 6) / 16, 0, 1), L = W * 1.3 * grow
  const c = Math.cos(ang) * L / 2, s = Math.sin(ang) * L / 2
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (const [lw, col] of [[46 * z, `rgba(${RED},${0.35 * a})`], [16 * z, `rgba(255,170,170,${0.8 * a})`], [5, `rgba(255,255,255,${a})`]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x - c, y - s); ctx.lineTo(x + c, y + s); ctx.stroke()
  }
  ctx.restore()
}
function arrow(ctx, x, y, dir, L, z, u, real) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  const fl = calmMotion() ? 0 : Math.sin(real * 0.9) * 2 * z
  for (const [lw, col] of [[18 * z, `rgba(${FIRE},${0.4 * u})`], [7 * z, `rgba(255,200,120,${0.85 * u})`], [2.5 * z, `rgba(255,255,230,${u})`]]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x, y + fl); ctx.lineTo(x + dir * L, y); ctx.stroke()
  }
  ctx.fillStyle = `rgba(255,240,200,${u})`; ctx.beginPath()               // arrowhead
  ctx.moveTo(x + dir * (L + 18 * z), y); ctx.lineTo(x + dir * (L - 6 * z), y - 10 * z); ctx.lineTo(x + dir * (L - 6 * z), y + 10 * z); ctx.closePath(); ctx.fill()
  ctx.restore()
}
function impact(ctx, W, H, S, fp, tp, k, B, bg, fg, pf) {
  const z = view(W, H).z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 60 * z, 80, 41 + pf, fg, 0.85, false, S.real)
  sprite(ctx, S.caster, ['altSukunaBeam'], 3, fp.x, fp.y, z, S.fFace, { frame: true, tint: fg, tintA: 1 })
  sprite(ctx, S.target, ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore()
}
function fireDome(ctx, W, x, floorY, z, pp, real, fade) {
  const r = (60 + 240 * outE(clamp(pp / 18, 0, 1))) * z, a = fade
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createRadialGradient(x, floorY, r * 0.1, x, floorY, r)
  g.addColorStop(0, `rgba(255,250,220,${0.9 * a})`); g.addColorStop(0.45, `rgba(${FIRE},${0.7 * a})`); g.addColorStop(1, 'rgba(160,20,0,0)')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, floorY, r, Math.PI, 0); ctx.fill()
  if (!calmMotion()) for (let i = 0; i < 46; i++) {   // flame tongues + falling embers
    const ph = ((real * (0.9 + hash(i, 2) * 0.6) + hash(i, 3) * 60) % 60) / 60
    const px = x + (hash(i, 4) - 0.5) * r * 2.2, py = floorY - ph * r * 1.4
    ctx.globalAlpha = a * Math.sin(Math.PI * ph); ctx.fillStyle = i % 3 ? '#ff8a2a' : '#ffe0a0'; ctx.fillRect(px, py, 3 * z, 6 * z)
  }
  ctx.restore()
  star(ctx, x, floorY - r * 0.5, r * 0.6 * clamp(1 - pp / 20, 0, 1), a, pp * 0.1, '#fff4d0')
}
