// krybotUltFx.js — RENDER-ONLY half of Krybot's TROOBIAN CROSSFIRE — SQUADRON PROTOCOL (krybotUlt.js). One screen pass
// (cineRegistry overlay, identity transform): world → screen from camera.js's live transform; Krybot, the four squad units and
// the foe are drawn from their REAL sheets (kBlaster aim strip, walk, win, the supplied five-cell explosion).
// Layers: optics tint → transport columns → squad + Krybot + foe → laser sights / bolts / converging core → explosion stack →
// re-blit close-ups → optics HUD (scanlines, reticle, typed readouts) → title → impact frames → letterbox.
// Pure functions of the scene frames; noise = integer hash. Reduce Flashing → no white/inverted frames; Reduce Motion → no jitter.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, letterbox, star, glow, rings,
  damageNumber, debris, calmMotion, calmFlash, image, ready } from './bleachUltKit.js'

const RED = '255,40,40', ORANGE = '255,150,40'
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace'

export function drawKrybotUltScreen(ctx, canvas, S, B, UNITS) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.boomReal != null ? S.real - S.boomReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 20 : 8), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 20 : 8) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), floorY = fp.y
  const core = V.p(S.tx0, S.tFloor - 50)
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the arena drops into a cold red night (optics), colour drains on the slow-mo
  const nightA = k < B.calmAt ? smooth(S.real / 12) : clamp(1 - (k - B.calmAt) / 24, 0, 1)
  wash(ctx, W, H, '#14060a', 0.5 * nightA, 'multiply'); wash(ctx, W, H, '#ff2a2a', 0.08 * nightA, 'soft-light')
  desat(ctx, W, H, k >= B.slowAt && k < B.boomAt ? 0.8 * smooth((k - B.slowAt) / 5) : 0)

  // 2) squad units (behind the leads), with their transport columns
  const units = UNITS.map((u, i) => unitState(S, V, k, u, i, B))
  for (const u of units) if (u.col > 0) beamColumn(ctx, u.p.x, floorY, z * u.sc, u.col, S.real + u.i * 7, H)
  const muzzles = []
  for (const u of units) { const m = drawUnit(ctx, S, V, k, u, B); if (m) muzzles.push(m) }

  // 3) the foe, then Krybot
  drawFoe(ctx, S, V, k, tp, B)
  const km = drawLead(ctx, S, V, k, fp, B)

  // 4) laser sights (deploy → barrage), volley bolts, barrage streams, the converging core
  const sightA = k >= B.titleAt && k < B.boomAt ? smooth((k - B.titleAt) / 8) : 0
  if (sightA > 0) for (const m of muzzles.concat(km ? [km] : [])) laser(ctx, m, core, z, sightA * (0.55 + 0.25 * Math.sin(S.real * 0.9 + m.x)), S.real)
  B.volleyAt.forEach((at, i) => { const d = k - at; const m = muzzles.find(q => q.i === i); if (m && d >= -3 && d < 6) bolt(ctx, m, core, z, clamp((d + 3) / 3, 0, 1), d) })
  B.volleyAt.forEach(at => { const d = k - at; if (d >= 0 && d < 10) { star(ctx, core.x, core.y, (70 - d * 5) * z, 1 - d / 10, d * 0.2, '#ffd0c0'); glow(ctx, core.x, core.y, 120 * z, ORANGE, (1 - d / 10) * 0.8) } })
  if (k >= B.barrageAt && k < B.boomAt) {
    const bu = (k - B.barrageAt) / (B.boomAt - B.barrageAt)
    for (const m of muzzles.concat(km ? [km] : [])) for (let j = 0; j < 3; j++) { const ph = ((S.real * 0.22 + j / 3 + m.i * 0.13) % 1); if (ph < 0.85) bolt(ctx, m, core, z, ph / 0.85, 1, 0.6) }
    const R = (20 + 70 * smooth(bu)) * z * (1 + 0.08 * Math.sin(S.real * 1.3))
    glow(ctx, core.x, core.y, R * 3, RED, 0.85); glow(ctx, core.x, core.y, R * 1.4, ORANGE, 0.9)
    star(ctx, core.x, core.y, R * 1.5, 0.9, S.real * 0.15, '#ffe7d0')
    if (k >= B.slowAt - 6) speedLines(ctx, W, H, core.x, core.y, 70, 31, '#ffffff', 0.35 * smooth((k - B.slowAt + 6) / 8), true, S.real)
  }

  // 5) DETONATION: stacked supplied explosions, shockwaves, debris, smoke
  if (k >= B.boomAt) {
    const kp = k - B.boomAt + (held ? 0 : 0)
    explosionStack(ctx, core.x, floorY, z, kp, pr)
    if (kp < 60) { rings(ctx, core.x, core.y, kp / 60, 4, W * 0.9, '#ffb060', 16 * z, 0.85); rings(ctx, core.x, floorY, kp / 60, 3, W * 0.8, '#ff5030', 12 * z, 0.18) }
    if (kp < 36) glow(ctx, core.x, core.y, (220 + kp * 24) * z, ORANGE, (1 - kp / 36) * 0.95)
    debris(ctx, core.x, floorY, kp, 40, z, 77, '#3a3438', 420, 26)
    smoke(ctx, core.x, floorY, z, kp)
  }

  // 6) real close-ups (camera.js caps zoom)
  if (k < B.lockEnd) punchIn(ctx, canvas, W, H, fp.x, floorY - 120 * z, 1 + 0.45 * smooth((k - 2) / 26))
  else if (k >= B.volleyAt[0] - 2 && k < B.volleyAt[0] + 8) punchIn(ctx, canvas, W, H, core.x, core.y, 1 + 0.2 * Math.sin(Math.PI * (k - B.volleyAt[0] + 2) / 10))
  else if (k >= B.volleyAt[1] - 2 && k < B.volleyAt[1] + 8) punchIn(ctx, canvas, W, H, core.x, core.y, 1 + 0.2 * Math.sin(Math.PI * (k - B.volleyAt[1] + 2) / 10))
  else if (k >= B.slowAt && k < B.boomAt) punchIn(ctx, canvas, W, H, core.x, core.y, 1 + 0.3 * smooth((k - B.slowAt) / 6))

  // 7) Krybot optics HUD
  const hudA = k < B.titleAt ? smooth(k / 6) : k < B.boomAt ? 0.55 : k >= B.calmAt ? clamp((k - B.calmAt) / 8, 0, 1) * clamp((B.outAt + 4 - k) / 10, 0, 1) : 0
  if (hudA > 0) optics(ctx, W, H, hudA, S.real)
  if (k < B.boomAt) reticle(ctx, W, H, tp.x, tp.y - 60 * z, z, k, S.real, B)
  if (k >= 4 && k < B.lockEnd + 4) readout(ctx, W, H, ['TROOBIAN OPTICS // UNIT KRY-01', '> SCANNING ...', '> TARGET ACQUIRED', '> REQUEST: SQUADRON PROTOCOL'], k - 4, dir)
  if (k >= B.beamAt[0] && k < B.titleAt) readout(ctx, W, H, ['> AUTHORISED // GRUMM COMMAND', '> UNITS 02-05 DEPLOYING'], k - B.beamAt[0], dir)
  if (k >= B.titleAt && k < B.volleyAt[0] + 10) title(ctx, W, H, 'TROOBIAN CROSSFIRE', 'KRYBOT  ·  SQUADRON PROTOCOL', (k - B.titleAt) / (B.volleyAt[0] + 10 - B.titleAt),
    { y: 0.22, fs: 0.11, band: 'rgba(14,6,8,0.93)', edge: '#ff3a2a', fill: '#e9edf2', stroke: '#7a0c0c', from: -dir })
  if (k >= B.barrageAt && k < B.slowAt) bigCall(ctx, W, H, 'FIRE AT WILL', (k - B.barrageAt) / (B.slowAt - B.barrageAt))

  // 8) impact frames
  if (pr >= 1 && pr < 5 && !calmFlash()) silFrame(ctx, W, H, S, V, fp, tp, units, '#ffffff', '#1a0000', pr, B)
  else if (pr >= 5 && pr < 11) silFrame(ctx, W, H, S, V, fp, tp, units, calmFlash() ? '#1c0606' : '#160000', '#ff3a20', pr, B)
  ctx.restore()

  if (pr >= 11) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.22, pr - 11, '#ff5a3a')
  if (k >= B.calmAt + 4 && k < B.outAt + 6) readout(ctx, W, H, ['> TARGET NEUTRALISED.', '> SQUAD RECALLED.'], k - B.calmAt - 4, dir, 0.3)

  // 9) letterbox
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  return true
}

// ── squad ──
function unitState(S, V, k, u, i, B) {
  const wx = S.tx0 + S.dir * u.dx, face = S.dir * u.face, z = V.z
  const inAt = B.beamAt[i], outAt = B.outBeam[i]
  const appear = smooth((k - inAt) / 10), gone = k >= outAt ? smooth((k - outAt) / 10) : 0
  const col = k >= inAt - 2 && k < inAt + 16 ? Math.sin(Math.PI * clamp((k - inAt + 2) / 18, 0, 1)) : k >= outAt - 2 && k < outAt + 16 ? Math.sin(Math.PI * clamp((k - outAt + 2) / 18, 0, 1)) : 0
  return { i, u, sc: u.sc, face, p: V.p(wx, S.floor), z, appear: appear * (1 - gone), drop: (1 - appear) * 220, col, firing: k >= B.titleAt && k < outAt - 2 }
}
function drawUnit(ctx, S, V, k, u, B) {
  if (u.appear <= 0.01) return null
  const z = V.z * u.sc, y = u.p.y - u.drop * V.z
  const tint = u.u.dark ? '#120408' : (u.appear < 1 ? '#ff4a3a' : null)
  const fr = u.firing ? (k >= B.barrageAt && k < B.boomAt ? 1 + ((S.real >> 1) & 1) : 1) : 0
  const r = sprite(ctx, S.caster, ['kBlaster', 'idle'], fr, u.p.x, y, z, u.face, { alpha: u.appear, tint, tintA: u.u.dark ? u.u.dark : 0.7 * (1 - u.appear) })
  if (!r) return null
  // visor glint
  star(ctx, u.p.x + u.face * 6 * z, r.top + r.h * 0.06, 9 * z, 0.5 * u.appear, S.real * 0.1, '#ff5040')
  if (!u.firing) return null
  return { i: u.i, x: r.front, y: r.top + r.h * 0.3, z }
}
function drawLead(ctx, S, V, k, fp, B) {
  const f = S.caster, z = V.z, dir = S.dir
  let keys = ['kBlaster', 'idle'], fr = 1
  if (k < 14) { keys = ['ultimate', 'kBlaster']; fr = 1 }
  else if (k >= B.calmAt + 6) { keys = ['win', 'idle']; fr = (S.real >> 4) & 1 }
  glow(ctx, fp.x, fp.y - 60 * z, 90 * z, RED, k < B.calmAt ? 0.25 : 0.1)
  const r = sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir)
  if (!r) return null
  // the red visor burns during the lock-on
  if (k < B.lockEnd + 10) star(ctx, fp.x + dir * 6 * r.s, r.top + r.h * 0.06, (14 + 8 * Math.sin(S.real * 0.6)) * z, 0.9, S.real * 0.12, '#ff3020')
  if (k >= B.calmAt + 6) return null
  return { i: 9, x: r.front, y: r.top + r.h * 0.3, z }
}
function drawFoe(ctx, S, V, k, tp, B) {
  const t = S.target, z = V.z, fdir = -S.dir, kp = k - B.boomAt
  if (kp < 0) {
    const hit = B.volleyAt.some(at => k >= at && k < at + 6) || k >= B.barrageAt
    sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: hit ? Math.sin(S.real * 1.9) * 0.08 : 0, tint: hit && (S.real & 2) ? '#ff7050' : null, tintA: 0.5 })
    return
  }
  const landed = (S.ty || 0) <= 1 && kp > 20
  sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * kp * 0.18, tint: kp < 4 ? '#ffffff' : kp < 30 ? '#2a1a14' : null, tintA: kp < 4 ? 0.85 : 0.45 })
}

// ── pieces ──
function beamColumn(ctx, x, floorY, z, a, real, H) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const w = 46 * z
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0)
  g.addColorStop(0, 'rgba(255,40,40,0)'); g.addColorStop(0.5, `rgba(255,90,70,${0.85 * a})`); g.addColorStop(1, 'rgba(255,40,40,0)')
  ctx.fillStyle = g; ctx.fillRect(x - w, -20, w * 2, floorY + 20)
  ctx.fillStyle = `rgba(255,235,225,${0.9 * a})`; ctx.fillRect(x - 3 * z, -20, 6 * z, floorY + 20)
  for (let i = 0; i < 14; i++) { const yy = floorY - ((real * 9 + i * 53) % (floorY + 40)); ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#ffb0a0'; ctx.fillRect(x - w * 0.8 + hash(i, 5) * w * 1.6, yy, 2 * z, 10 * z) }
  ctx.restore()
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = '#ff6a50'; ctx.lineWidth = 3 * z
  ctx.beginPath(); ctx.ellipse(x, floorY, 60 * z, 12 * z, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
  void H
}
function laser(ctx, m, c, z, a, real) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(a, 0, 1)
  ctx.strokeStyle = 'rgba(255,40,30,0.9)'; ctx.lineWidth = 1.6 * z; ctx.setLineDash([10 * z, 6 * z]); ctx.lineDashOffset = -real * 3
  ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(c.x, c.y); ctx.stroke(); ctx.restore()
  star(ctx, m.x, m.y, 8 * z, a, real * 0.2, '#ff6040')
}
function bolt(ctx, m, c, z, u, d, w = 1) {
  const hx = m.x + (c.x - m.x) * u, hy = m.y + (c.y - m.y) * u, tl = 0.18
  const tx = m.x + (c.x - m.x) * Math.max(0, u - tl), ty = m.y + (c.y - m.y) * Math.max(0, u - tl)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (const [lw, col] of [[14 * z * w, 'rgba(255,40,30,0.45)'], [6 * z * w, 'rgba(255,140,90,0.9)'], [2.5 * z * w, '#fff2e8']]) { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke() }
  ctx.restore()
  if (u < 0.3) star(ctx, m.x, m.y, 22 * z * w, 1 - u / 0.3, d, '#ffd0b0')
}
function explosionStack(ctx, x, floorY, z, kp, pr) {
  const im = image('./assets/krybot/explosion.png')
  if (!ready(im)) return
  // [delay, dx, dy, size]: the main bloom, then a ring of secondaries walking outward
  const parts = [[0, 0, -70, 6.2], [3, -110, -30, 3], [5, 120, -40, 3.2], [8, -40, -170, 3.4], [10, 200, -20, 2.4], [12, -210, -15, 2.4], [15, 60, -230, 2.6], [18, -150, -120, 2]]
  ctx.save(); ctx.imageSmoothingEnabled = false
  for (const [dl, dx, dy, sz] of parts) {
    const q = kp - dl; if (q < 0 || q >= 20) continue
    const fi = Math.min(4, Math.floor(q / 4)), s = 64 * sz * z
    ctx.globalAlpha = q < 16 ? 1 : 1 - (q - 16) / 4
    ctx.drawImage(im, fi * 64, 0, 64, 64, x + dx * z - s / 2, floorY + dy * z - s / 2, s, s)
  }
  ctx.restore(); void pr
}
function smoke(ctx, x, floorY, z, kp) {
  if (kp < 8 || kp > 90) return
  ctx.save()
  for (let i = 0; i < 18; i++) {
    const q = (kp - 8) / 82, px = x + (hash(i, 61) - 0.5) * 380 * z * (0.5 + q), py = floorY - (40 + hash(i, 62) * 160 + q * 120) * z, r = (40 + hash(i, 63) * 60) * z * (0.6 + q)
    ctx.globalAlpha = 0.35 * Math.sin(Math.PI * q); ctx.fillStyle = i % 2 ? '#2a2226' : '#3d3236'
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}
function optics(ctx, W, H, a, real) {
  ctx.save(); ctx.globalAlpha = a
  // red vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95)
  g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, 'rgba(120,0,0,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  // scanlines + one rolling bar
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1.5)
  const ry = calmMotion() ? H * 0.4 : (real * 9) % (H + 80) - 40
  ctx.fillStyle = 'rgba(255,60,40,0.07)'; ctx.fillRect(0, ry, W, 40)
  // frame corners
  ctx.strokeStyle = 'rgba(255,70,50,0.85)'; ctx.lineWidth = 3; const m = H * 0.16, L = H * 0.08
  for (const [cx, cy, sx, sy] of [[W * 0.05, m, 1, 1], [W * 0.95, m, -1, 1], [W * 0.05, H - m, 1, -1], [W * 0.95, H - m, -1, -1]]) { ctx.beginPath(); ctx.moveTo(cx, cy + sy * L); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * L, cy); ctx.stroke() }
  ctx.restore()
}
function reticle(ctx, W, H, x, y, z, k, real, B) {
  const close = smooth(k / 30), R = (220 - 150 * close) * z, a = k < B.boomAt - 4 ? 1 : clamp((B.boomAt - k) / 4, 0, 1)
  const locked = k >= 30
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = locked && (real & 4) ? '#ffffff' : '#ff3a2a'; ctx.lineWidth = 3
  const L = R * 0.45
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.beginPath(); ctx.moveTo(x + sx * R, y + sy * (R - L)); ctx.lineTo(x + sx * R, y + sy * R); ctx.lineTo(x + sx * (R - L), y + sy * R); ctx.stroke() }
  ctx.beginPath(); ctx.arc(x, y, R * 0.35, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - R * 0.6, y); ctx.lineTo(x - R * 0.2, y); ctx.moveTo(x + R * 0.2, y); ctx.lineTo(x + R * 0.6, y); ctx.moveTo(x, y - R * 0.6); ctx.lineTo(x, y - R * 0.2); ctx.moveTo(x, y + R * 0.2); ctx.lineTo(x, y + R * 0.6); ctx.stroke()
  ctx.font = `700 ${Math.round(H * 0.022)}px ${MONO}`; ctx.fillStyle = '#ff5040'; ctx.textAlign = 'left'
  ctx.fillText(locked ? 'LOCK ■' : 'TRACK ' + String(((real * 37) % 900) + 100), x + R + 8, y - R + 14)
  ctx.restore(); void W
}
function readout(ctx, W, H, lines, t, dir, yFrac = 0.17) {
  if (t < 0) return
  const fs = Math.round(H * 0.026)
  ctx.save(); ctx.font = `700 ${fs}px ${MONO}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left'
  const x = dir > 0 ? W * 0.06 : W * 0.6
  let budget = Math.floor(t * 1.6)
  lines.forEach((ln, i) => {
    if (budget <= 0) return
    const shown = ln.slice(0, budget); budget -= ln.length + 4
    const y = H * yFrac + i * fs * 1.35
    ctx.fillStyle = 'rgba(20,0,0,0.6)'; ctx.fillRect(x - 6, y - 3, ctx.measureText(shown).width + 12, fs + 6)
    ctx.fillStyle = i === lines.length - 1 && budget > -4 ? '#ffffff' : '#ff5a48'; ctx.fillText(shown + (budget < 0 && (t & 4) ? '█' : ''), x, y)
  })
  ctx.restore()
}
function bigCall(ctx, W, H, text, u) {
  if (u <= 0 || u >= 1) return
  const a = Math.min(clamp(u / 0.12, 0, 1), clamp((1 - u) / 0.2, 0, 1)), fs = Math.round(H * 0.075 * (1 + Math.max(0, 1 - u / 0.08) * 0.5))
  ctx.save(); ctx.globalAlpha = a; ctx.font = `900 ${fs}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#2a0000'; ctx.strokeText(text, W / 2, H * 0.24); ctx.fillStyle = '#ff4030'; ctx.fillText(text, W / 2, H * 0.24); ctx.restore()
}
function silFrame(ctx, W, H, S, V, fp, tp, units, bg, fg, pr, B) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  const c = V.p(S.tx0, S.tFloor - 50)
  speedLines(ctx, W, H, c.x, c.y, 90, 40 + pr, fg, 0.95, false, pr)
  for (const u of units) if (u.appear > 0.5) sprite(ctx, S.caster, ['kBlaster', 'idle'], 1, u.p.x, u.p.y, z * u.sc, u.face, { tint: fg, tintA: 1 })
  sprite(ctx, S.caster, ['kBlaster', 'idle'], 1, fp.x, fp.y, z, S.dir, { tint: fg, tintA: 1 })
  sprite(ctx, S.target, ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: fg, tintA: 1 })
  ctx.restore(); void B
}
