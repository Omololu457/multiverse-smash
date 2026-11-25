// kevinUltFx.js — RENDER-ONLY half of Kevin Levin's two cinematics (kevinUlt.js): ABSORPTION OVERLOAD (activation) and
// EVERYTHING YOU THREW AT ME (cash-out finisher). Screen passes (cineRegistry overlay, identity transform), world → screen from
// camera.js's live transform; Kevin is drawn from his REAL atlas (kevinData KEVIN_ART: the apply strip's crawling coat, the
// green transform strip, mutant idle / claw / halo / Arc Torrent cells), the foe from its own sheets.
// Pure functions of the scene frames; noise = integer hash. Reduce Flashing → no white/inverted frames; Reduce Motion → no jitter.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, sub, letterbox, star, glow, rings,
  damageNumber, debris, fissure, calmMotion, calmFlash } from './bleachUltKit.js'
import { KEVIN_ART } from './kevinData.js'

const TEAL = '120,240,210', GREEN = '90,255,90', YEL = '255,240,90'
const art = f => KEVIN_ART[f?.skinId] || KEVIN_ART.default
const SC = f => (f?.spriteScale || 1.9)

// one atlas cell of Kevin. o.frameMode: centre on the cell (halo / arc cells), else on the content box
function kev(ctx, f, a, fi, x, feetY, z, dir, o = {}) {
  if (!a?.sheet) return null
  const shift = o.originY != null ? (a.height - o.originY) * SC(f) * z * (o.s || 1) : 0
  return sprite(ctx, f, a, fi, x, feetY + shift, z, dir, { ...o, frame: !!o.frameMode })
}

// ═════════════════════════ ABSORPTION OVERLOAD ═════════════════════════
export function drawKevinOverloadScreen(ctx, canvas, O, A) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = O.frame, dir = O.dir, f = O.f
  const V = view(W, H), z = V.z, held = O.hold > 0
  const pr = O.revealReal != null ? O.real - O.revealReal : -1
  const jit = held && !calmMotion() ? { x: (hash(O.real, 1) - 0.5) * 14, y: (hash(O.real, 2) - 0.5) * 14 } : { x: 0, y: 0 }
  const fp = V.p(O.fx, O.floor), floorY = fp.y
  const H2 = art(f)
  ctx.save(); ctx.translate(jit.x, jit.y)

  const dusk = k < A.outAt ? smooth(O.real / 10) : clamp(1 - (k - A.outAt) / 12, 0, 1)
  wash(ctx, W, H, '#03140e', 0.55 * dusk, 'multiply')
  if (k >= A.overload && k < A.reveal) wash(ctx, W, H, '#2aff6a', 0.12 * smooth((k - A.overload) / 30), 'soft-light')

  // floor: palm crater + teal veins racing out
  if (k >= A.palm) {
    const vu = smooth((k - A.palm) / 40), fade = k < A.outAt ? 1 : clamp(1 - (k - A.outAt) / 12, 0, 1)
    ctx.save(); ctx.globalAlpha = fade
    for (let i = 0; i < 6; i++) fissure(ctx, fp.x + dir * 16 * z, floorY - 2 * z + (i - 2.5) * 3 * z, i & 1 ? -1 : 1, (220 + 160 * hash(i, 3)) * z * vu, vu, z, 40 + i, 'rgba(110,255,210,0.85)')
    ctx.restore()
    if (k < A.palm + 12) rings(ctx, fp.x + dir * 16 * z, floorY, (k - A.palm) / 12, 2, 200 * z, '#9ffff0', 6 * z, 0.22)
  }
  // floor chunks tear loose and fly INTO him (crawl), then the overload streams
  if (k >= A.crawl && k < A.reveal) chunks(ctx, fp.x, floorY, z, k - A.crawl, O.real, dir)
  if (k >= A.overload - 6 && k < A.reveal + 2) streams(ctx, W, H, fp.x, floorY - 60 * z, z, k - A.overload + 6, O.real)

  // Kevin
  glow(ctx, fp.x, floorY - 50 * z, (100 + (k >= A.overload ? 80 * smooth((k - A.overload) / 40) : 0)) * z, k >= A.overload ? GREEN : TEAL, k < A.reveal ? 0.5 : 0.35)
  if (k < A.crawl) kev(ctx, f, H2.human.kApply, Math.min(2, k / 5 | 0), fp.x, floorY, z, dir)
  else if (k < A.overload) {
    const u = (k - A.crawl) / (A.overload - A.crawl), fi = 2 + Math.min(5, Math.floor(u * 6))
    const r = kev(ctx, f, H2.human.kApply, fi, fp.x, floorY, z, dir)
    if (r) seam(ctx, fp.x, r, u, z, O.real)
  } else if (k < A.reveal) {
    const u = (k - A.overload) / (A.reveal - A.overload), fi = 1 + Math.min(3, Math.floor(u * 4 + ((O.real >> 1) & 1) * 0.5))
    const sw = calmMotion() ? 1 : 1 + 0.05 * Math.sin(O.real * 1.3)
    kev(ctx, f, H2.human.kTransform, fi, fp.x, floorY, z * sw, dir, { s: 1 + 0.15 * u })
  } else {
    const fi = k < A.reveal + 6 ? 5 : -1
    if (fi >= 0) kev(ctx, f, H2.human.kTransform, 5, fp.x, floorY, z, dir, { tint: pr < 6 ? '#ffffff' : null, tintA: 0.7 })
    else kev(ctx, f, H2.ultimate.idle, (O.real >> 3) % 4, fp.x, floorY, z, dir)
  }
  // reveal: shockwave + debris
  if (k >= A.reveal) {
    const kp = k - A.reveal
    if (kp < 40) { rings(ctx, fp.x, floorY - 50 * z, kp / 40, 3, W * 0.7, '#8affa0', 12 * z, 0.8); glow(ctx, fp.x, floorY - 50 * z, (200 + kp * 16) * z, GREEN, (1 - kp / 40) * 0.8) }
    debris(ctx, fp.x, floorY, kp, 30, z, 91, '#4a5a50', 360, 22)
  }

  // close-ups
  if (k < A.crawl + 6) punchIn(ctx, canvas, W, H, fp.x + dir * 14 * z, floorY - 20 * z, 1 + 0.5 * smooth(k / 14))
  else if (k < A.overload) punchIn(ctx, canvas, W, H, fp.x, floorY - 50 * z, 1 + 0.3 * (1 - smooth((k - A.crawl - 6) / 30)) + 0.1)
  else if (k >= A.reveal && k < A.reveal + 24) punchIn(ctx, canvas, W, H, fp.x, floorY - 10 * z, 1 + 0.35 * (1 - smooth((k - A.reveal) / 24)))

  if (k >= A.overload && k < A.reveal) speedLines(ctx, W, H, fp.x, floorY - 60 * z, 70, 13, '#c8ffd8', 0.35 * smooth((k - A.overload) / 20), true, O.real)
  if (k >= A.titleAt && k < A.outAt + 6) title(ctx, W, H, 'ULTIMATE KEVIN', 'ABSORPTION OVERLOAD  ·  12 SECONDS', (k - A.titleAt) / (A.outAt + 6 - A.titleAt),
    { y: 0.24, fs: 0.12, band: 'rgba(4,20,12,0.93)', edge: '#5cff8a', fill: '#eafff2', stroke: '#0f6a3a', from: -dir })
  // reveal impact frames
  if (pr >= 0 && pr < 4 && !calmFlash()) { wash(ctx, W, H, '#ffffff', 1); kev(ctx, f, H2.ultimate.idle, 0, fp.x, floorY, z, dir, { tint: '#08200f', tintA: 1 }) }
  else if (pr >= 4 && pr < 9) { wash(ctx, W, H, calmFlash() ? '#06140c' : '#041a0a', 1); speedLines(ctx, W, H, fp.x, floorY - 50 * z, 80, 70 + pr, '#5cff8a', 0.9, false, pr); kev(ctx, f, H2.ultimate.idle, 0, fp.x, floorY, z, dir, { tint: '#5cff8a', tintA: 1 }) }
  ctx.restore()

  letterbox(ctx, W, H, O.real, k, A.outAt, 12)
  sub(ctx, W, H, k, 4, A.crawl + 14, 'KEVIN', "Let's see what this place is made of.", '#5cff8a')
  sub(ctx, W, H, k, A.overload, A.reveal - 2, 'KEVIN', 'Everything in here… is MINE.', '#5cff8a')
  return true
}
// the coat line rising up his body (u = 0 feet → 1 head)
function seam(ctx, x, r, u, z, real) {
  const y = r.top + r.h * (1 - smooth(u))
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(0, y - 8 * z, 0, y + 8 * z); g.addColorStop(0, 'rgba(160,255,230,0)'); g.addColorStop(0.5, 'rgba(200,255,240,0.55)'); g.addColorStop(1, 'rgba(160,255,230,0)')
  ctx.fillStyle = g; ctx.fillRect(x - r.w * 0.55, y - 6 * z, r.w * 1.1, 12 * z); ctx.restore()
  for (let i = 0; i < 4; i++) star(ctx, x + (hash(i, real >> 2) - 0.5) * r.w, y, 9 * z, 0.8, real * 0.2 + i, '#dffff6')
}
function chunks(ctx, x, floorY, z, kp, real, dir) {
  ctx.save()
  for (let i = 0; i < 22; i++) {
    const born = (i * 37) % 40, q = (kp - born) / 18
    if (q < 0 || q > 1) continue
    const sx = x + (i & 1 ? 1 : -1) * (120 + hash(i, 9) * 260) * z, sy = floorY
    const ex = x + (hash(i, 4) - 0.5) * 30 * z, ey = floorY - (20 + hash(i, 5) * 70) * z
    const e = q * q, px = sx + (ex - sx) * e, py = sy + (ey - sy) * e - Math.sin(Math.PI * q) * (60 + hash(i, 6) * 80) * z
    const s = (5 + hash(i, 7) * 8) * z * (1 - 0.5 * q)
    ctx.save(); ctx.translate(px, py); ctx.rotate(real * 0.3 * (hash(i, 8) - 0.5) + i)
    ctx.fillStyle = i % 3 === 0 ? '#9a8a76' : i % 3 === 1 ? '#7d8790' : '#6fd8c0'; ctx.fillRect(-s, -s * 0.7, s * 2, s * 1.4)
    ctx.strokeStyle = 'rgba(200,255,240,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(-s, -s * 0.7, s * 2, s * 1.4); ctx.restore()
  }
  ctx.restore(); void dir
}
function streams(ctx, W, H, x, y, z, kp, real) {
  if (kp < 0) return
  const a = clamp(kp / 10, 0, 1)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (let i = 0; i < 16; i++) {
    const ang = hash(i, 21) * Math.PI * 2, R = Math.hypot(W, H) * 0.7
    const ph = ((real * 0.05 + hash(i, 22)) % 1)
    const sx = x + Math.cos(ang) * R * (1 - ph), sy = y + Math.sin(ang) * R * (1 - ph) * 0.7
    const ex = x + Math.cos(ang) * R * Math.max(0, 0.75 - ph), ey = y + Math.sin(ang) * R * Math.max(0, 0.75 - ph) * 0.7
    for (const [lw, col] of [[10 * z, 'rgba(60,255,110,0.25)'], [3 * z, 'rgba(210,255,220,0.9)']]) { ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke() }
  }
  ctx.restore()
}

// ═════════════════════════ EVERYTHING YOU THREW AT ME ═════════════════════════
const ABSORBED = ['255,80,60', '90,170,255', '255,230,80', '120,255,120', '210,110,255', '255,150,40']
export function drawKevinCashScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir, f = S.caster
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.boomReal != null ? S.real - S.boomReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 20 : 10), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 20 : 10) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y
  const U = art(f).ultimate
  ctx.save(); ctx.translate(jit.x, jit.y)

  const dusk = k < B.calmAt ? smooth(S.real / 12) : clamp(1 - (k - B.calmAt) / 24, 0, 1)
  wash(ctx, W, H, '#050a12', 0.55 * dusk, 'multiply')
  desat(ctx, W, H, k >= B.slowAt && k < B.boomAt ? 0.8 * smooth((k - B.slowAt) / 4) : 0)

  // foe
  drawFoe(ctx, S, V, k, tp, B)
  // Kevin
  const hand = { x: fp.x + dir * 34 * z, y: floorY - 70 * z }
  glow(ctx, fp.x, floorY - 55 * z, (110 + (k >= B.recallAt && k < B.boomAt ? 90 * smooth((k - B.recallAt) / 40) : 0)) * z, YEL, k < B.calmAt ? 0.22 : 0.1)
  if (k < B.recallAt) kev(ctx, f, U.kCash, 2, fp.x, floorY, z, dir)
  else if (k < B.rakeAt[0] - 4) kev(ctx, f, U.kHalo, Math.min(6, 2 + ((k - B.recallAt) / 9 | 0)), fp.x, floorY, z, dir, { frameMode: true })
  else if (k < B.slowAt) { const ri = k < B.rakeAt[1] - 4 ? k - B.rakeAt[0] : k - B.rakeAt[1]; kev(ctx, f, U.kCash, ri < -1 ? 0 : ri < 2 ? 1 : 2, fp.x, floorY, z, dir) }
  else if (k < B.calmAt) { const fi = k < B.arcAt ? 0 : k < B.boomAt ? 1 : Math.min(4, 1 + ((k - B.boomAt) / 10 | 0)); kev(ctx, f, U.kArc, fi, fp.x, floorY, z, dir, { frameMode: true, originY: 77 }) }
  else kev(ctx, f, U.idle, (S.real >> 3) % 4, fp.x, floorY, z, dir)

  // RECALL: every colour he ever absorbed streams back out of him and into the claw
  if (k >= B.recallAt - 4 && k < B.slowAt) recall(ctx, fp.x, floorY - 55 * z, hand, z, k - B.recallAt, S.real)
  // rakes
  B.rakeAt.forEach((at, i) => { const d = k - at; if (d >= -2 && d < 10) rake(ctx, tp.x, tp.y - 50 * z, z, d, i, dir) })
  // ARC: point-blank beam over the screen
  if (k >= B.arcAt && k < B.calmAt) {
    const kp = k - B.arcAt, grow = outE(kp / 6), fade = k < B.boomAt + 24 ? 1 : clamp(1 - (k - B.boomAt - 24) / 14, 0, 1)
    beam(ctx, W, hand.x, tp.y - 40 * z, z, grow, fade, dir, S.real)
  }
  if (k >= B.boomAt) {
    const kp = k - B.boomAt
    if (kp < 50) { rings(ctx, tp.x, tp.y - 45 * z, kp / 50, 4, W * 0.8, '#fff17a', 14 * z, 0.85); glow(ctx, tp.x, tp.y - 45 * z, (200 + kp * 20) * z, YEL, (1 - kp / 50) * 0.9) }
    debris(ctx, tp.x, floorY, kp, 28, z, 55, '#5a5048', 380, 24)
  }

  // close-ups
  if (k < 14) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, tp.y - 50 * z, 1 + 0.3 * Math.sin(Math.PI * k / 14))
  else if (k >= B.recallAt + 10 && k < B.rakeAt[0] - 6) punchIn(ctx, canvas, W, H, hand.x, hand.y, 1 + 0.35 * smooth((k - B.recallAt - 10) / 20))
  else if (k >= B.slowAt && k < B.boomAt) punchIn(ctx, canvas, W, H, hand.x, hand.y, 1 + 0.3 * smooth((k - B.slowAt) / 6))

  if (k >= 8 && k < B.recallAt + 24) title(ctx, W, H, 'EVERYTHING YOU THREW AT ME', 'ULTIMATE KEVIN  ·  CASH OUT', (k - 8) / (B.recallAt + 16), { y: 0.23, fs: 0.085, band: 'rgba(10,10,20,0.93)', edge: '#ffe14d', fill: '#fff8d6', stroke: '#7a5a00', from: dir })
  if (k >= B.slowAt - 4 && k < B.boomAt) speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 70, 29, '#ffffff', 0.35, true, S.real)

  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, U, '#ffffff', '#141000', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, fp, tp, U, calmFlash() ? '#141008' : '#0c0a00', '#ffe14d', pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.22, pr - 10, '#ffe14d')
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 4, B.recallAt + 10, 'KEVIN', 'You hit me with everything you had…', '#ffe14d')
  sub(ctx, W, H, k, B.recallAt + 14, B.slowAt, 'KEVIN', '…so here. Take it ALL back.', '#ffe14d')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'KEVIN', 'Payback.', '#ffe14d')
  return true
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.boomAt
  if (kp < 0) { const hit = B.rakeAt.some(at => k >= at && k < at + 6); sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: Math.sin(k * 0.15) * 0.1, tint: hit ? '#ffffff' : null, tintA: 0.6 }); return }
  const landed = (S.ty || 0) <= 1 && kp > 24
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * kp * 0.16, tint: kp < 4 ? '#ffffff' : null, tintA: 0.85 })
}
function recall(ctx, x, y, hand, z, kp, real) {
  const a = clamp((kp + 4) / 8, 0, 1)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 30; i++) {
    const col = ABSORBED[i % ABSORBED.length], ph = ((real * 0.025 + hash(i, 11)) % 1)
    const ang = hash(i, 12) * Math.PI * 2 + real * 0.08, R = (120 - 100 * ph) * z
    const px = x + Math.cos(ang) * R * (1 - ph) + (hand.x - x) * ph * ph, py = y + Math.sin(ang) * R * 0.6 * (1 - ph) + (hand.y - y) * ph * ph
    const r = (6 + 6 * hash(i, 13)) * z
    const g = ctx.createRadialGradient(px, py, 0, px, py, r * 2.2); g.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); g.addColorStop(0.4, `rgba(${col},${0.8 * a})`); g.addColorStop(1, `rgba(${col},0)`)
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r * 2.2, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
  const u = clamp(kp / 44, 0, 1)
  glow(ctx, hand.x, hand.y, (30 + 60 * u) * z, YEL, 0.3 + 0.3 * u)
  star(ctx, hand.x, hand.y, (18 + 30 * u) * z, 0.85, real * 0.1, '#fffbe0')
}
function rake(ctx, x, y, z, d, i, dir) {
  const u = clamp((d + 2) / 6, 0, 1), a = d < 4 ? 1 : 1 - (d - 4) / 6
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (let j = 0; j < 3; j++) {
    const off = (j - 1) * 16 * z, s = i ? -1 : 1
    ctx.globalAlpha = a; ctx.strokeStyle = j === 1 ? '#ffffff' : '#fff27a'; ctx.lineWidth = (j === 1 ? 6 : 4) * z
    ctx.beginPath(); ctx.moveTo(x - dir * 70 * z + off, y - s * 70 * z); ctx.lineTo(x - dir * 70 * z + off + dir * 140 * z * u, y - s * 70 * z + s * 140 * z * u); ctx.stroke()
  }
  ctx.restore()
  if (d >= 0 && d < 6) star(ctx, x, y, (60 - d * 8) * z, 1 - d / 6, d, '#fff6c0')
}
function beam(ctx, W, x, y, z, grow, fade, dir, real) {
  const end = dir > 0 ? W + 60 : -60, len = Math.abs(end - x) * grow, wv = (46 + 10 * Math.sin(real * 0.9)) * z
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade
  ctx.translate(x, y); if (dir < 0) ctx.scale(-1, 1)
  for (const [w, col, al] of [[wv * 2.4, '255,200,40', 0.35], [wv * 1.3, '255,240,90', 0.8], [wv * 0.55, '255,255,235', 1]]) {
    const g = ctx.createLinearGradient(0, -w, 0, w); g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${al})`); g.addColorStop(1, `rgba(${col},0)`)
    ctx.fillStyle = g; ctx.fillRect(0, -w, len, w * 2)
  }
  if (!calmMotion()) for (let i = 0; i < 26; i++) { const px = (hash(i, 3) * len + real * 40) % Math.max(1, len), py = (hash(i, 4) - 0.5) * wv * 2; ctx.fillStyle = 'rgba(255,255,220,0.8)'; ctx.fillRect(px, py, 30 * z, 2 * z) }
  ctx.restore()
  star(ctx, x, y, (90 + 20 * Math.sin(real)) * z, fade, real * 0.1, '#fffbe0')
}
function silFrame(ctx, W, H, S, V, fp, tp, U, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 90, 80 + pr, fg, 0.95, false, pr)
  kev(ctx, S.caster, U.kArc, 1, fp.x, fp.y, z, S.dir, { frameMode: true, originY: 77, tint: fg, tintA: 1 })
  sprite(ctx, S.target, ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore()
}
