// nsCgptUltFx.js — RENDER-ONLY half of Ninja Storm CGPT's TWIN TEMPEST — FAULTLINE CATACLYSM (nsCgptUlt.js). One screen pass
// (cineRegistry overlay, identity transform): world → screen from camera.js's live transform; the Ranger AND the shadow clone are
// drawn from the fighter's REAL skin strips (sword / kickHeavy / stringEnd / swordRise / airSpin / diveKick / land / victory, the
// supplied tornado and earth-dome strips scaled up for the eruption), the foe from its own sheets.
// Pure functions of the scene frames; noise = integer hash. Reduce Flashing → no white/inverted frames; Reduce Motion → no jitter.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, sub, letterbox, star, glow, rings,
  damageNumber, debris, fissure, calmMotion, calmFlash, animOf } from './bleachUltKit.js'

const WIND = '160,220,255', EARTH = '255,170,60', CLONE = '#8fd4ff'
// every MSV1 cell: 260×136, origin (130, 132)
function body(ctx, f, keys, fi, x, feetY, z, dir, o = {}) {
  let a = null; for (const k of keys) if ((a = animOf(f, k))) break
  if (!a?.sheet) return null
  const s = (f?.spriteScale || 1.8) * (a.scale || 1) * z * (o.s || 1)
  return sprite(ctx, f, a, fi, x, feetY + 4 * s, z, dir, { ...o, frame: true })
}
const turnSide = (i, side) => ((i >> 1) % 2 ? -1 : 1) * side

export function drawCgptUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir, f = S.caster
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.boomReal != null ? S.real - S.boomReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 22 : 9), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 22 : 9) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor - (S.fy || 0)), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), g0 = V.p(S.tx0, S.tFloor), floorY = g0.y
  ctx.save(); ctx.translate(jit.x, jit.y)

  const dusk = k < B.calmAt ? smooth(S.real / 12) : clamp(1 - (k - B.calmAt) / 24, 0, 1)
  wash(ctx, W, H, '#060a14', 0.5 * dusk, 'multiply'); wash(ctx, W, H, k < B.diveAt ? '#40a0ff' : '#ff9a30', 0.08 * dusk, 'soft-light')
  desat(ctx, W, H, k >= B.slowAt && k < B.diveAt ? 0.75 * smooth((k - B.slowAt) / 5) : 0)

  // the wind spiral around the foe
  if (k >= 20 && k < B.eruptAt + 4) spiral(ctx, g0.x, floorY, tp.y, z, smooth((k - 20) / 10) * (k < B.diveAt ? 1 : clamp(1 - (k - B.diveAt) / 10, 0, 1)), S.real)
  // floor cracks racing in before the eruption
  if (k >= B.diveAt && k < B.eruptAt + 40) { const u = smooth((k - B.diveAt) / 12); for (let i = 0; i < 4; i++) fissure(ctx, g0.x, floorY + (i - 1.5) * 3 * z, i & 1 ? 1 : -1, (260 + 140 * hash(i, 7)) * z * u, u, z, 60 + i, 'rgba(255,170,60,0.85)') }
  // the earth dome (supplied strip, scaled into a colossal eruption)
  if (k >= B.eruptAt - 2 && k < B.eruptAt + 46) dome(ctx, S, g0.x, floorY, z, k - B.eruptAt)

  drawFoe(ctx, S, V, k, tp, B)
  drawClone(ctx, S, V, k, B)
  drawRanger(ctx, S, V, k, fp, B)

  // the cross-cuts
  B.spiral.forEach((at, i) => { const d = k - at; if (d >= -2 && d < 8) cut(ctx, tp.x, tp.y - 50 * z, z, d, i, i % 2 ? '#ffffff' : CLONE) })
  if (k >= B.diveAt && k < B.diveAt + 10) { const d = k - B.diveAt; star(ctx, tp.x, tp.y - 40 * z, (90 - d * 7) * z, 1 - d / 10, d, '#fff2d0'); rings(ctx, tp.x, tp.y - 30 * z, d / 10, 2, 220 * z, '#ffd27a', 8 * z, 0.4) }
  if (k >= B.eruptAt) {
    const kp = k - B.eruptAt
    if (kp < 50) { rings(ctx, g0.x, floorY - 40 * z, kp / 50, 4, W * 0.9, '#ffb050', 16 * z, 0.8); glow(ctx, g0.x, floorY - 80 * z, (240 + kp * 18) * z, EARTH, (1 - kp / 50) * 0.9) }
    debris(ctx, g0.x, floorY, kp, 46, z, 13, '#7a5a3a', 460, 30)
    rockSpikes(ctx, g0.x, floorY, z, kp)
  }

  // close-ups
  if (k < 22) punchIn(ctx, canvas, W, H, (fp.x + tp.x) / 2, tp.y - 50 * z, 1 + 0.3 * Math.sin(Math.PI * k / 22))
  else if (k >= B.apexAt + 2 && k < B.diveAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 40 * z, 1 + 0.3 * smooth((k - B.apexAt - 2) / 10))
  else if (k >= B.eruptAt - 4 && k < B.eruptAt) punchIn(ctx, canvas, W, H, g0.x, floorY - 30 * z, 1.25)

  if (k >= 8 && k < 42) title(ctx, W, H, 'TWIN TEMPEST', 'FAULTLINE CATACLYSM  ·  NINJA STORM', (k - 8) / 34, { y: 0.22, fs: 0.12, band: 'rgba(6,10,24,0.93)', edge: '#6cc8ff', fill: '#f2fbff', stroke: '#13406e', from: -dir })
  if (k >= B.apexAt && k < B.diveAt) speedLines(ctx, W, H, fp.x, fp.y - 40 * z, 70, 21, '#ffffff', 0.35 * smooth((k - B.apexAt) / 8), true, S.real)
  if (k >= B.diveAt - 6 && k < B.eruptAt) bigCall(ctx, W, H, 'FAULTLINE —', (k - B.diveAt + 6) / (B.eruptAt - B.diveAt + 6))

  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, g0, '#ffffff', '#1a0c00', pr)
  else if (pr >= 5 && pr < 10) silFrame(ctx, W, H, S, V, fp, tp, g0, calmFlash() ? '#141008' : '#120800', '#ffae40', pr)
  ctx.restore()

  if (pr >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.22, pr - 10, '#ffae40')
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, 26, 'RANGER', 'Twin Tempest!', '#6cc8ff')
  sub(ctx, W, H, k, B.apexAt, B.eruptAt, 'RANGER', 'Earth — open up!', '#ffae40')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'RANGER', 'Storm’s passed.', '#6cc8ff')
  return true
}

function drawRanger(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z, face = S.fFace || S.dir
  glow(ctx, fp.x, fp.y - 50 * z, 90 * z, k < B.diveAt ? WIND : EARTH, k < B.calmAt ? 0.3 : 0.12)
  if (k < 24) { body(ctx, f, ['sword1', 'idle'], 3, fp.x, fp.y, z, face); return }
  if (k < B.apexAt) {
    const i = B.spiral.findIndex(at => k < at + 4), turn = i < 0 ? 5 : i
    const mine = turn % 2 === 1, d = k - B.spiral[turn]
    const keys = turn === 5 ? ['swordRise', 'sword2'] : ['sword2', 'sword1']
    body(ctx, f, mine ? keys : ['airSpin', 'jump'], mine ? clamp(d + 3, 0, 5) : (S.real >> 2) % 4, fp.x, fp.y, z, face)
    return
  }
  if (k < B.diveAt) { body(ctx, f, ['airSpin', 'jump'], (S.real >> 2) % 4, fp.x, fp.y, z, face, { rot: k < B.apexAt + 8 ? Math.PI : 0 }); return }
  if (k < B.eruptAt) { body(ctx, f, ['superDive', 'dropDive'], Math.min(3, (k - B.diveAt) / 3 | 0), fp.x, fp.y, z, face); return }
  if (k < B.calmAt) { body(ctx, f, ['superSlam', 'landRecover'], Math.min(3, (k - B.eruptAt) / 6 | 0), fp.x, fp.y, z, face); return }
  body(ctx, f, ['win', 'idle'], Math.min(9, (k - B.calmAt) / 4 | 0), fp.x, fp.y, z, face)
}
function drawClone(ctx, S, V, k, B) {
  if (k < B.cloneAt) return
  const f = S.caster, z = V.z, side = S.dir
  const out = k >= B.cloneOut ? clamp((k - B.cloneOut) / 14, 0, 1) : 0
  const a = Math.min(clamp((k - B.cloneAt) / 8, 0, 1), 1 - out) * 0.85
  if (a <= 0) return
  let wx, fy = 0, face, keys, fi
  if (k < B.apexAt) {
    const i = B.spiral.findIndex(at => k < at + 4), turn = i < 0 ? 4 : i
    const ci = turn % 2 === 0 ? turn : Math.max(0, turn - 1), sd = turnSide(ci, side)
    wx = S.tx0 + sd * 74; face = -sd; fy = k >= 24 ? Math.max(0, (S.ty || 0) - 20) : 0
    const mine = turn % 2 === 0, d = k - B.spiral[turn]
    keys = mine ? [['kickHeavy', 'stringEnd', 'airKick'][ci >> 1], 'kickHeavy'] : ['airSpin', 'jump']
    fi = mine ? clamp(d + 2, 0, 4) : (S.real >> 2) % 4
    if (k < 24) { keys = ['nsVanishOut', 'guard', 'idle']; fi = Math.min(4, (k - B.cloneAt) / 3 | 0); wx = S.tx0 + side * 80; face = -side; fy = 0 }
  } else if (k < B.eruptAt) { wx = S.tx0 + side * 70; face = -side; fy = k < B.diveAt ? (S.ty || 0) - 30 : Math.max(0, (S.ty || 0) - 20); keys = k < B.diveAt ? ['guard', 'idle'] : ['airSpin', 'jump']; fi = 1 }
  else { wx = S.tx0 + side * 90; face = -side; keys = ['landRecover', 'idle']; fi = 2 }
  const p = V.p(wx, S.floor - Math.max(0, fy))
  body(ctx, f, keys, fi, p.x, p.y, z, face, { alpha: a, tint: CLONE, tintA: 0.45 })
  if (k < B.cloneAt + 14) smoke(ctx, V.p(S.tx0 + side * 80, S.floor).x, V.p(0, S.floor).y, z, k - B.cloneAt)
  if (out > 0) smoke(ctx, p.x, p.y, z, (k - B.cloneOut))
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.eruptAt
  if (kp < 0) {
    const hitNow = S.lastHitK != null && k - S.lastHitK < 5
    sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: k >= 24 && k < B.diveAt ? Math.sin(S.real * 0.35) * 0.35 : 0, tint: hitNow ? '#ffffff' : null, tintA: 0.65 })
    return
  }
  const landed = (S.ty || 0) <= 1 && kp > 26
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * kp * 0.17, tint: kp < 4 ? '#ffffff' : null, tintA: 0.85 })
}
function spiral(ctx, x, floorY, topY, z, a, real) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const hgt = Math.max(60 * z, floorY - topY + 120 * z)
  for (let i = 0; i < 30; i++) {
    const yy = floorY - (i / 30) * hgt, w = (50 + i * 4) * z, ph = real * 0.45 + i * 0.6
    ctx.globalAlpha = 0.55 * a * (0.5 + 0.5 * Math.sin(ph)); ctx.strokeStyle = i % 3 ? 'rgba(200,235,255,0.85)' : 'rgba(90,170,255,0.9)'; ctx.lineWidth = 3 * z
    ctx.beginPath(); ctx.ellipse(x, yy, w, w * 0.22, 0, ph % (Math.PI * 2), ph % (Math.PI * 2) + Math.PI * 1.2); ctx.stroke()
  }
  ctx.restore()
}
function cut(ctx, x, y, z, d, i, col) {
  const u = clamp((d + 2) / 5, 0, 1), a = d < 5 ? 1 : 1 - (d - 5) / 3, ang = (i * 1.1) % Math.PI - Math.PI / 2
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.translate(x, y); ctx.rotate(ang)
  for (const [lw, c] of [[14 * z, 'rgba(120,200,255,0.45)'], [4 * z, col]]) { ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(-110 * z, 0); ctx.lineTo(-110 * z + 220 * z * u, 0); ctx.stroke() }
  ctx.restore()
  if (d >= 0 && d < 5) star(ctx, x, y, (50 - d * 8) * z, 1 - d / 5, d + i, '#e8f8ff')
}
function dome(ctx, S, x, floorY, z, kp) {
  const f = S.caster, a = kp < 34 ? 1 : clamp(1 - (kp - 34) / 12, 0, 1)
  const fi = Math.min(6, Math.max(0, (kp + 2) / 4 | 0)), sc = 2.2 + 0.6 * outE(clamp((kp + 2) / 14, 0, 1))
  glow(ctx, x, floorY - 90 * z * sc / 2, 220 * z * sc / 2, EARTH, 0.55 * a)
  body(ctx, f, ['domeFx'], fi, x, floorY, z, S.dir, { s: sc, alpha: a, tint: '#ffb050', tintA: 0.35 })
}
function rockSpikes(ctx, x, floorY, z, kp) {
  if (kp > 60) return
  const grow = outE(clamp(kp / 6, 0, 1)), sink = clamp((kp - 36) / 24, 0, 1)
  ctx.save()
  for (let i = 0; i < 14; i++) {
    const dx = (i - 6.5) * 34 * z + (hash(i, 3) - 0.5) * 16 * z, h = (60 + hash(i, 4) * 150) * z * grow * (1 - sink) * (1 - Math.abs(i - 6.5) / 9), w = (18 + hash(i, 5) * 16) * z
    if (h <= 1) continue
    ctx.fillStyle = i % 2 ? '#6a4a2a' : '#8c6638'; ctx.beginPath(); ctx.moveTo(x + dx - w / 2, floorY); ctx.lineTo(x + dx + (hash(i, 6) - 0.5) * 10 * z, floorY - h); ctx.lineTo(x + dx + w / 2, floorY); ctx.closePath(); ctx.fill()
    ctx.strokeStyle = 'rgba(255,200,120,0.55)'; ctx.lineWidth = 1.5 * z; ctx.stroke()
  }
  ctx.restore()
}
function smoke(ctx, x, y, z, kp) {
  if (kp < 0 || kp > 18) return
  ctx.save()
  for (let i = 0; i < 10; i++) {
    const an = hash(i, 9) * Math.PI * 2, r = (14 + kp * 3) * z, px = x + Math.cos(an) * r, py = y - 40 * z + Math.sin(an) * r * 0.7
    ctx.globalAlpha = 0.6 * (1 - kp / 18); ctx.fillStyle = i % 2 ? '#cfe6ff' : '#9fb8d8'
    ctx.beginPath(); ctx.arc(px, py, (12 + hash(i, 2) * 10) * z, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function bigCall(ctx, W, H, text, u) {
  if (u <= 0 || u >= 1) return
  const a = Math.min(clamp(u / 0.12, 0, 1), clamp((1 - u) / 0.2, 0, 1)), fs = Math.round(H * 0.08 * (1 + Math.max(0, 1 - u / 0.08) * 0.5))
  ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#2a1200'; ctx.strokeText(text, W / 2, H * 0.24); ctx.fillStyle = '#ffae40'; ctx.fillText(text, W / 2, H * 0.24); ctx.restore()
}
function silFrame(ctx, W, H, S, V, fp, tp, g0, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, g0.x, g0.y - 60 * z, 90, 90 + pr, fg, 0.95, false, pr)
  body(ctx, S.caster, ['domeFx'], 4, g0.x, g0.y, z, S.dir, { s: 2.6, tint: fg, tintA: 1 })
  body(ctx, S.caster, ['superSlam', 'landRecover'], 0, fp.x, fp.y, z, S.fFace || S.dir, { tint: fg, tintA: 1 })
  sprite(ctx, S.target, ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore()
}
