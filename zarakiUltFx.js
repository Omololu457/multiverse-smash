// zarakiUltFx.js — RENDER-ONLY half of Zaraki's BANKAI — THE DEMON'S CLEAVER (zarakiUlt.js). One screen pass (cineRegistry
// overlay, identity transform) that owns the picture while the cinematic runs: world → screen from camera.js's live transform,
// both fighters drawn here from their REAL sheets (zaraki_bankai_ultimate strip: normal → red silhouette → demon → cleave).
// Layers: red sky + desaturation → the skull reiatsu pillar → floor (cracks, fissure, rocks) → fighters → embers / steam /
// shockwave → re-blit close-ups → titles / calligraphy → impact frames → THE WORLD IS CUT (screen split along the blade)
// → letterbox + subtitles. Pure functions of the scene's frames; noise = integer hash. Reduce Flashing → no white/inverted
// frames; Reduce Motion → no jitter / drifting particles.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, calligraphy, sub, letterbox, star, glow, rings,
  fissure, debris, damageNumber, calmMotion, calmFlash, lerp } from './bleachUltKit.js'

const RED = '255,40,30'
let _cut = null
function cutCanvas(W, H) { if (!_cut) { const cv = document.createElement('canvas'); _cut = { cv, g: cv.getContext('2d') } }
  if (_cut.cv.width !== W || _cut.cv.height !== H) { _cut.cv.width = W; _cut.cv.height = H } return _cut }

export function drawZarakiUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, t = S.target, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.cleaveReal != null ? S.real - S.cleaveReal : -1
  const jit = (held || (k >= B.bankaiAt && k < B.bankaiAt + 16)) && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * 18, y: (hash(S.real, 2) - 0.5) * 18 } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y
  const headW = V.p(S.fx0, S.floor - 112)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the sky turns red under the Bankai; the colour drains through the raise
  const redA = k < B.bankaiAt ? 0 : k < B.calmAt ? clamp((k - B.bankaiAt) / 10, 0, 1) : clamp(1 - (k - B.calmAt) / 24, 0, 1)
  if (redA > 0) { wash(ctx, W, H, '#5a0000', 0.55 * redA, 'multiply'); wash(ctx, W, H, '#ff2010', 0.18 * redA, 'soft-light') }
  const slowA = k >= B.raiseAt - 4 && k < B.cleaveAt ? smooth((k - B.raiseAt + 4) / 18) * 0.8 : 0
  desat(ctx, W, H, slowA)
  if (k < B.bankaiAt) wash(ctx, W, H, '#000000', 0.35 * smooth(S.real / 16), 'source-over')   // the room dims around him

  // 2) the SKULL pillar of reiatsu
  if (k >= B.bankaiAt - 2 && k < B.raiseAt + 10) pillar(ctx, W, H, V, S, k, B)
  // the first shock when the patch comes off: a yellow-gold flare → red
  if (k >= B.patchAt && k < B.bankaiAt + 10) {
    const u = (k - B.patchAt) / (B.bankaiAt + 10 - B.patchAt)
    glow(ctx, headW.x, headW.y + 50 * z, (120 + 420 * outE(u)) * z, u < 0.45 ? '255,214,80' : RED, (1 - u) * 0.9)
    rings(ctx, fp.x, floorY - 60 * z, clamp((k - B.patchAt) / 26, 0, 1), 3, 520 * z, u < 0.45 ? '#ffe27a' : '#ff5a3a', 10 * z, 0.55)
  }

  // 3) floor: cracks + lifted rocks around him; then the fissure of the cleave
  if (k >= B.patchAt && k < B.calmAt + 30) cracksAround(ctx, fp.x, floorY, z, clamp((k - B.patchAt) / 60, 0, 1), k >= B.calmAt ? clamp(1 - (k - B.calmAt) / 30, 0, 1) : 1)
  if (k >= B.bankaiAt && k < B.cleaveAt && !calmMotion()) rocks(ctx, fp.x, floorY, z, k - B.bankaiAt)
  const kp = k - B.cleaveAt, cutX = V.p(S.fx1 + dir * 70, 0).x
  if (kp >= 0) {
    const a = k >= B.outAt - 20 ? clamp((B.outAt - k) / 20, 0, 1) : 1
    ctx.save(); ctx.globalAlpha = a; fissure(ctx, cutX - dir * 60 * z, floorY, dir, W * 1.4, outE(kp / 20), Math.max(1, z), 77); ctx.restore()
    ctx.save(); ctx.globalAlpha = a * 0.8; fissure(ctx, cutX, floorY + 4 * z, -dir, W * 0.35, outE(kp / 26), Math.max(1, z * 0.7), 91); ctx.restore()
  }

  // 4) fighters
  drawFoe(ctx, S, V, k, tp, B)
  drawZaraki(ctx, S, V, k, fp, B)

  // 5) FX over: rising embers + steam off the demon, the crimson shockwave, debris
  if (k >= B.bankaiAt && k < B.calmAt + 20 && !calmMotion()) embers(ctx, fp.x, floorY, z, S.real, k < B.calmAt ? 1 : clamp(1 - (k - B.calmAt) / 20, 0, 1), W)
  if (kp >= 0 && kp < 70) {
    const u = kp / 70
    rings(ctx, tp.x, floorY - 10 * z, u, 4, W * 0.9, '#ff5a3a', 16 * z, 0.22)
    const wx = tp.x + dir * outE(u) * W * 1.2
    ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const wg = ctx.createLinearGradient(wx - dir * 200, 0, wx, 0); wg.addColorStop(0, 'rgba(255,40,20,0)'); wg.addColorStop(1, `rgba(255,120,80,${(0.7 * (1 - u)).toFixed(3)})`)
    ctx.fillStyle = wg; ctx.fillRect(Math.min(wx, wx - dir * 200), 0, 200, H); ctx.restore()
    debris(ctx, tp.x, floorY, kp, 40, Math.max(1, z), 13, '#4a2a20', 520, 26)
  }
  if (kp >= 0 && kp < 30) glow(ctx, tp.x, tp.y - 60 * z, (200 + kp * 20) * z, RED, (1 - kp / 30) * 0.9)

  // 6) real close-ups (camera.js caps zoom ≈1.15)
  if (k < B.bankaiAt) punchIn(ctx, canvas, W, H, headW.x, headW.y + 30 * z, 1 + 0.4 * smooth((k - 4) / 30))
  else if (k >= B.demonAt && k < B.raiseAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 90 * z, 1.15 + 0.25 * smooth((k - B.demonAt) / 40))
  else if (k >= B.raiseAt + 6 && k < B.lungeAt) punchIn(ctx, canvas, W, H, fp.x, floorY - 150 * z, 1 + 0.3 * smooth((k - B.raiseAt - 6) / 18))

  // 7) titles + calligraphy
  if (k >= B.bankaiAt + 8 && k < B.demonAt - 4) title(ctx, W, H, 'BANKAI', 'ZARAKI KENPACHI  ·  THE DEMON UNLEASHED', (k - B.bankaiAt - 8) / (B.demonAt - B.bankaiAt - 12),
    { y: 0.25, fs: 0.15, band: 'rgba(20,0,0,0.9)', edge: '#ff3a24', fill: '#ffffff', stroke: '#b3000a', kanji: '卍解', kanjiCol: '#ff4030' })
  if (k >= B.demonAt + 4 && k < B.raiseAt + 4) calligraphy(ctx, W, H, '剣八', (k - B.demonAt - 4) / (B.raiseAt - B.demonAt), { x: dir > 0 ? 0.84 : 0.16, y: 0.26, size: 0.17, col: '#ff2a1a', edge: '#000', glow: 'rgba(255,0,0,0.8)' })
  if (k >= B.raiseAt && k < B.cleaveAt) { ctx.save(); speedLines(ctx, W, H, tp.x, tp.y - 50 * z, 60, 31, '#000000', 0.35 * smooth((k - B.raiseAt) / 20), true, S.real); ctx.restore() }

  // 8) the cleave: world shot (blade buried) → white → inverted → the split
  if (pr >= 4 && pr < 8 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, '#ffffff', '#000000', pr)
  else if (pr >= 8 && pr < 13) silFrame(ctx, W, H, S, V, fp, tp, calmFlash() ? '#1a0000' : '#000000', '#ff2a1a', pr)
  ctx.restore()

  // the world is cut — the finished frame splits along the blade's line and slides apart
  if (pr >= 13 && k < B.splitEnd) split(ctx, canvas, W, H, tp, dir, pr, k, B)
  if (pr >= 13) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.25, pr - 13)
  if (k >= B.calmAt && k < B.outAt + 6) {   // the epilogue tag
    const a = Math.min(clamp((k - B.calmAt) / 8, 0, 1), clamp((B.outAt + 6 - k) / 10, 0, 1))
    ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${Math.round(H * 0.05)}px Impact, "Arial Black", sans-serif`; ctx.textAlign = dir > 0 ? 'right' : 'left'; ctx.textBaseline = 'middle'
    ctx.lineWidth = 6; ctx.strokeStyle = '#000'; const tx = dir > 0 ? W * 0.94 : W * 0.06
    ctx.strokeText('ONE SWING.', tx, H * 0.2); ctx.fillStyle = '#ff3a24'; ctx.fillText('ONE SWING.', tx, H * 0.2); ctx.restore()
  }

  // 9) letterbox + subtitles
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, 54, 'ZARAKI', 'No need to hold back for once!', '#ff5a3a')
  sub(ctx, W, H, k, B.demonAt + 2, B.raiseAt - 4, 'ZARAKI', "The best! …Not that I want to use this.", '#ff5a3a')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'ZARAKI', 'Entertain me! Let’s begin!', '#ff5a3a')
  return true
}

// ── zaraki: the bankai strip (0 normal · 1-5 red silhouette transform · 6-11 demon · 12-14 raise · 15-16 the cleave) ──
function zFrame(S, k, B) {
  if (k < B.patchAt) return { keys: ['idle'], fr: (S.real >> 3) % 4 }
  if (k < B.bankaiAt) return { keys: ['zarakiBankai'], fr: 0 }
  if (k < 100) return { keys: ['zarakiBankai'], fr: 1 + ((k >> 3) & 1) }
  if (k < B.demonAt) return { keys: ['zarakiBankai'], fr: 3 + Math.min(2, Math.floor((k - 100) / 7)) }
  if (k < B.raiseAt) return { keys: ['zarakiBankai'], fr: 6 + ((k - B.demonAt) >> 3) % 6 }
  if (k < B.raiseAt + 8) return { keys: ['zarakiBankai'], fr: 12 }
  if (k < B.raiseAt + 14) return { keys: ['zarakiBankai'], fr: 13 }
  if (k < B.cleaveAt) return { keys: ['zarakiBankai'], fr: 14 }
  if (k < B.calmAt) return { keys: ['zarakiBankai'], fr: k < B.cleaveAt + 4 ? 15 : 16 }
  if (k < B.calmAt + 10) return { keys: ['zarakiBankai'], fr: 6 }
  return { keys: ['zarakiBankai'], fr: 0 }
}
function drawZaraki(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z, dir = S.dir, { keys, fr } = zFrame(S, k, B)
  const demon = k >= B.bankaiAt && k < B.calmAt
  if (demon) glow(ctx, fp.x, fp.y - 70 * z, 150 * z * (1 + 0.08 * Math.sin(S.real * 0.4)), '255,30,20', 0.55)
  if (k >= B.lungeAt && k < B.cleaveAt + 4) {   // after-images strung back along the leap
    const back = Math.min(Math.abs(S.fx1 - S.fx0), 320) * z
    for (let g = 4; g >= 1; g--) sprite(ctx, f, keys, fr, fp.x - dir * g * Math.max(16 * z, back / 5), fp.y, z, dir, { frame: true, alpha: 0.16 * (5 - g), tint: '#ff2010', tintA: 0.8 })
  }
  const out = k >= B.calmAt ? clamp((k - B.calmAt) / 20, 0, 1) : 0
  sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir, { frame: keys[0] === 'zarakiBankai', tint: out > 0 && out < 1 ? '#ff2010' : null, tintA: 0.6 * (1 - out) })
  // the eyepatch tears off and spins away
  if (k >= B.patchAt && k < B.patchAt + 40) {
    const u = (k - B.patchAt) / 40, hx = fp.x + dir * 6 * z, hy = fp.y - 112 * z
    const px = hx - dir * u * 120 * z, py = hy - Math.sin(u * Math.PI) * 70 * z + u * u * 140 * z
    ctx.save(); ctx.translate(px, py); ctx.rotate(u * 14); ctx.globalAlpha = 1 - u * 0.6
    ctx.fillStyle = '#0c0c0c'; ctx.fillRect(-6 * z, -4 * z, 12 * z, 8 * z); ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 1.5 * z; ctx.beginPath(); ctx.moveTo(-14 * z, 0); ctx.lineTo(14 * z, 0); ctx.stroke(); ctx.restore()
    star(ctx, hx, hy, (60 * (1 - u)) * z, 1 - u, u * 3, '#fff4c0')
  }
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.cleaveAt
  if (kp < 0) { sprite(ctx, t, k >= B.raiseAt ? (S.blocked ? ['guard', 'idle'] : ['hurt', 'idle']) : ['idle'], k >= B.raiseAt ? 0 : (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir, { sx: kp < 6 ? 0.85 : 1, sy: kp < 6 ? 1.06 : 1 }); return }
  if (kp < 6) { sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { sx: 0.8, sy: 1.08, tint: '#ffffff', tintA: kp < 2 ? 0.8 : 0 }); return }
  const landed = (S.ty || 0) <= 0 && kp > 20
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * (kp * 0.25) })
}
function silFrame(ctx, W, H, S, V, fp, tp, bg, fg, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 60 * z, 90, 50 + pr, fg, 0.95, false, pr)
  sprite(ctx, S.caster, ['zarakiBankai'], 15, fp.x, fp.y, z, S.dir, { frame: true, tint: fg, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1, sx: 0.8, sy: 1.08 })
  ctx.restore()
}
function split(ctx, canvas, W, H, tp, dir, pr, k, B) {
  const C = cutCanvas(W, H); C.g.setTransform(1, 0, 0, 1, 0, 0); C.g.clearRect(0, 0, W, H); C.g.drawImage(canvas, 0, 0)
  // the blade's line: steep, falling toward the foe
  const cx = tp.x, cy = H * 0.5, ang = Math.atan2(1, 0.32 * dir)
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux
  const life = k - B.cleaveAt, sep = (life < 0 ? (pr - 13) / 4 : 1) * (calmMotion() ? 10 : 26) * clamp(1 - (k - (B.splitEnd - 18)) / 18, 0, 1) * (H / 720)
  const L = Math.hypot(W, H)
  ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
  for (const s of [1, -1]) {
    ctx.save(); ctx.beginPath()
    ctx.moveTo(cx - ux * L, cy - uy * L); ctx.lineTo(cx + ux * L, cy + uy * L); ctx.lineTo(cx + ux * L + nx * L * s, cy + uy * L + ny * L * s); ctx.lineTo(cx - ux * L + nx * L * s, cy - uy * L + ny * L * s); ctx.closePath(); ctx.clip()
    ctx.drawImage(C.cv, nx * sep * s + ux * sep * 0.6 * s, ny * sep * s + uy * sep * 0.6 * s)
    ctx.restore()
  }
  // the white-hot cut in the gap
  ctx.globalCompositeOperation = 'lighter'
  for (const [lw, col] of [[Math.max(4, sep * 2.6), 'rgba(255,40,20,0.75)'], [Math.max(2, sep * 1.1), 'rgba(255,210,180,0.95)'], [2, '#ffffff']]) {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(cx - ux * L, cy - uy * L); ctx.lineTo(cx + ux * L, cy + uy * L); ctx.stroke()
  }
  ctx.restore()
}
function pillar(ctx, W, H, V, S, k, B) {
  const z = V.z, base = V.p(S.fx0, S.floor)
  const inU = clamp((k - B.bankaiAt + 2) / 14, 0, 1), outU = k >= B.raiseAt - 10 ? clamp((k - B.raiseAt + 10) / 20, 0, 1) : 0, a = inU * (1 - outU) * (k >= B.demonAt ? 1 - 0.5 * smooth((k - B.demonAt) / 12) : 1)
  if (a <= 0) return
  const wv = (130 + 40 * Math.sin(S.real * 0.3)) * z * (0.5 + 0.5 * outE(inU)), top = -20
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const g = ctx.createLinearGradient(base.x - wv, 0, base.x + wv, 0)
  g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(0.25, `rgba(200,10,10,${(0.6 * a).toFixed(3)})`); g.addColorStop(0.5, `rgba(255,150,120,${(0.9 * a).toFixed(3)})`); g.addColorStop(0.75, `rgba(200,10,10,${(0.6 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(255,0,0,0)')
  ctx.fillStyle = g; ctx.fillRect(base.x - wv, top, wv * 2, base.y - top)
  // licking flame tongues up the column
  if (!calmMotion()) for (let i = 0; i < 34; i++) {
    const ph = ((S.real * (0.9 + hash(i, 3)) + hash(i, 4) * 60) % 60) / 60, side = hash(i, 5) < 0.5 ? -1 : 1
    const x = base.x + side * wv * (0.55 + 0.5 * hash(i, 6)), y = base.y - ph * (base.y - top), len = (40 + 70 * hash(i, 7)) * z
    ctx.globalAlpha = a * Math.sin(Math.PI * ph) * 0.8; ctx.fillStyle = i % 3 ? '#ff3a1a' : '#ffb08a'
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + side * 30 * z, y - len * 0.5, x + side * 8 * z, y - len); ctx.quadraticCurveTo(x - side * 6 * z, y - len * 0.5, x, y); ctx.fill()
  }
  ctx.restore()
  // the SKULL in the reiatsu, high over him
  const su = clamp((k - B.bankaiAt - 10) / 24, 0, 1) * (1 - outU)
  if (su > 0) {
    const sx = base.x, sy = Math.max(H * 0.2, base.y - 330 * z), r = Math.max(70, 120 * z) * (0.8 + 0.2 * outE(su)), flick = 0.85 + 0.15 * Math.sin(S.real * 0.7)
    ctx.save(); ctx.globalAlpha = su * 0.9 * flick
    const sg = ctx.createRadialGradient(sx, sy, r * 0.1, sx, sy, r * 1.3); sg.addColorStop(0, 'rgba(255,90,60,0.9)'); sg.addColorStop(1, 'rgba(120,0,0,0)')
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.1, r * 1.25, 0, 0, Math.PI * 2); ctx.fill()
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(25,0,0,0.85)'
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx + s * r * 0.38, sy - r * 0.05, r * 0.24, r * 0.3, s * 0.35, 0, Math.PI * 2); ctx.fill() }
    ctx.beginPath(); ctx.moveTo(sx, sy + r * 0.22); ctx.lineTo(sx - r * 0.1, sy + r * 0.42); ctx.lineTo(sx + r * 0.1, sy + r * 0.42); ctx.closePath(); ctx.fill()
    for (let i = -3; i <= 3; i++) ctx.fillRect(sx + i * r * 0.11 - r * 0.04, sy + r * 0.6, r * 0.08, r * 0.22)
    // burning pupils
    ctx.globalCompositeOperation = 'lighter'
    for (const s of [-1, 1]) glow(ctx, sx + s * r * 0.38, sy - r * 0.02, r * 0.14, '255,240,200', su)
    ctx.restore()
  }
}
function cracksAround(ctx, x, y, z, u, a) {
  if (u <= 0 || a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'
  for (let i = 0; i < 14; i++) {
    let px = x, py = y; const side = i < 7 ? -1 : 1
    ctx.strokeStyle = '#140404'; ctx.lineWidth = Math.max(1.5, 4 * z * (1 - (i % 7) / 9)); ctx.beginPath(); ctx.moveTo(px, py)
    for (let s = 0; s < 7 * u; s++) { px += side * (16 + hash(i, s) * 34) * z; py += (hash(i + 9, s * 7) - 0.5) * 9 * z; ctx.lineTo(px, py) }
    ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,50,30,0.4)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore()
}
function rocks(ctx, x, y, z, kk) {
  ctx.save()
  for (let i = 0; i < 22; i++) {
    const ph = ((kk * 0.5 + hash(i, 5) * 60) % 80) / 80, px = x + (hash(i, 6) - 0.5) * 420 * z, py = y - ph * (140 + hash(i, 7) * 220) * z, sz = (3 + hash(i, 8) * 9) * z
    ctx.globalAlpha = Math.sin(Math.PI * ph); ctx.fillStyle = i % 3 ? '#4a3428' : '#8a6a50'
    ctx.save(); ctx.translate(px, py); ctx.rotate(ph * 4 + i); ctx.fillRect(-sz / 2, -sz / 2, sz, sz * 0.8); ctx.restore()
  }
  ctx.restore()
}
function embers(ctx, x, y, z, real, a, W) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 44; i++) {
    const ph = ((real * (0.8 + hash(i, 2)) + hash(i, 3) * 90) % 90) / 90
    const px = x + (hash(i, 4) - 0.5) * W * 0.7 + Math.sin(real * 0.05 + i) * 20 * z, py = y - ph * 520 * z
    ctx.globalAlpha = a * Math.sin(Math.PI * ph) * 0.9; ctx.fillStyle = i % 4 ? '#ff4a2a' : '#ffd0a0'
    ctx.fillRect(px, py, 2 + hash(i, 6) * 3, 2 + hash(i, 6) * 3)
  }
  ctx.restore(); void lerp
}
