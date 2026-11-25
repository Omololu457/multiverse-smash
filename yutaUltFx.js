// yutaUltFx.js — RENDER-ONLY half of Yuta's RIKA — PURE LOVE (yutaUlt.js). One screen pass (cineRegistry overlay, identity
// transform) owning the picture while the cinematic runs: world → screen from camera.js's live transform; Yuta drawn from his
// real sheets (yutaUltCast / yutaCombo3 / yutaCem), RIKA from her real summon strips (rika_spawn / idle / reach / screech,
// shown far larger than the field assist), the foe from theirs. Palette: void-dark stage, pale bone-white curse, violet-pink
// cursed energy. Pure functions of the scene's frames; noise = integer hash. Reduce Flashing → no white frames; Reduce
// Motion → no jitter / drifting particles.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, speedLines, title, calligraphy, sub, letterbox, star, glow, rings,
  debris, damageNumber, calmMotion, calmFlash } from './bleachUltKit.js'

export const RIKA = {
  spawn:   { sheet: './rika_spawn_uniform.png',   frames: 5, width: 150, height: 130 },
  idle:    { sheet: './rika_idle_uniform.png',    frames: 5, width: 150, height: 130 },
  reach:   { sheet: './rika_reach_uniform.png',   frames: 5, width: 150, height: 130 },
  screech: { sheet: './rika_screech_uniform.png', frames: 6, width: 150, height: 130 },
}
const VIO = '190,120,255', PINK = '255,150,220', BONE = '235,240,255'

function yFrame(S, k, B) {
  if (k < B.manifestAt) return { keys: ['yutaUltCast'], fr: k < 14 ? 0 : k < 30 ? 1 : 2 }
  if (k < B.thrustAt - 8) return { keys: ['yutaUltCast'], fr: 2 }
  if (k < B.thrustAt + 10) return { keys: ['yutaCombo3'], fr: Math.min(4, Math.floor((k - B.thrustAt + 8) / 3.6)) }
  if (k < B.loveAt) return { keys: ['yutaCombo3'], fr: 5 }
  if (k < B.chargeAt) return { keys: ['yutaUltCast'], fr: 3 + ((k - B.loveAt) >> 3) % 2 }
  if (k < B.afterAt) return { keys: ['yutaCem'], fr: k < B.fireAt - 6 ? Math.min(3, Math.floor((k - B.chargeAt) / 10)) : Math.min(6, 4 + ((k - B.fireAt + 6) >> 3)) }
  return { keys: ['yutaUltCast'], fr: 7 }
}
function rFrame(S, k, B) {
  if (k < B.manifestAt) return null
  if (k < B.manifestAt + 24) return { a: RIKA.spawn, fr: Math.min(4, Math.floor((k - B.manifestAt) / 5)) }
  if (k < B.assaultAt) return { a: RIKA.screech, fr: 1 }
  if (k < B.clawAt + 8) return { a: RIKA.reach, fr: Math.min(2, Math.floor((k - B.assaultAt) / 6)) }
  if (k < B.slamAt - 10) return { a: RIKA.reach, fr: 3 }
  if (k < B.slamAt + 8) return { a: RIKA.screech, fr: k < B.slamAt ? 3 : 2 }
  if (k < B.loveAt + 10) return { a: RIKA.idle, fr: (S.real >> 3) % 5 }
  if (k < B.afterAt) return { a: RIKA.reach, fr: 1 }
  return { a: RIKA.idle, fr: (S.real >> 3) % 5 }
}

export function drawYutaUltScreen(ctx, canvas, S, B) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = S.pf ?? S.frame, f = S.caster, dir = S.dir
  const V = view(W, H), z = V.z, held = S.hold > 0
  const pr = S.fireReal != null ? S.real - S.fireReal : -1
  const jit = held && !calmMotion() ? { x: (hash(S.real, 1) - 0.5) * (pr >= 0 ? 20 : 8), y: (hash(S.real, 2) - 0.5) * (pr >= 0 ? 20 : 8) } : { x: 0, y: 0 }
  const fp = V.p(S.fx, S.floor), tp = V.p(S.tx, S.tFloor - (S.ty || 0)), rp = V.p(S.rx, S.floor - (S.ry || 0)), floorY = fp.y
  const muzzle = { x: fp.x + dir * 70 * z, y: fp.y - 70 * z }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the stage drains into a void-violet dark while she is out
  const darkA = k < B.calmAt ? smooth(S.real / 30) : clamp(1 - (k - B.calmAt) / 30, 0, 1)
  wash(ctx, W, H, '#0a0414', 0.55 * darkA, 'multiply'); wash(ctx, W, H, '#05010a', 0.25 * darkA)
  // pure love: everything washes pink-white behind the beam
  if (k >= B.chargeAt && k < B.calmAt) wash(ctx, W, H, '#ff9ad8', 0.12 * smooth((k - B.chargeAt) / 30) * (k > B.afterAt ? clamp(1 - (k - B.afterAt) / 18, 0, 1) : 1), 'screen')

  // 2) the invocation: a ring of cursed energy on the floor, motes drawn into him
  if (k < B.manifestAt + 10) {
    const a = smooth(k / 16) * (k > B.manifestAt ? 1 - (k - B.manifestAt) / 10 : 1)
    glow(ctx, fp.x, fp.y - 50 * z, 120 * z, VIO, 0.45 * a)
    ringGlyph(ctx, fp.x, floorY, 110 * z, S.real, a)
    if (!calmMotion()) motes(ctx, fp.x, fp.y - 50 * z, z, S.real, a, true)
  }
  // her eruption: pale shock + darkness tearing open behind him
  if (k >= B.manifestAt && k < B.assaultAt) {
    const u = (k - B.manifestAt) / (B.assaultAt - B.manifestAt)
    glow(ctx, rp.x, rp.y - 130 * z, (200 + 500 * outE(u)) * z, BONE, (1 - u) * 0.8)
    rings(ctx, rp.x, floorY - 20 * z, clamp(u * 1.4, 0, 1), 4, W * 0.7, '#e9e2ff', 12 * z, 0.35)
    if (k >= B.manifestAt + 20) screechWaves(ctx, rp.x + dir * 60 * z, rp.y - 190 * z, z, k - B.manifestAt - 20, dir)
  }

  // 3) Rika (behind), the foe, Yuta
  const R = rFrame(S, k, B)
  if (R) {
    const grow = k < B.manifestAt + 24 ? 0.55 + 0.45 * outE((k - B.manifestAt) / 24) : 1
    const fade = k >= B.afterAt ? clamp(1 - (k - B.afterAt) / 30, 0, 1) : 1
    const flash = k < B.manifestAt + 8 ? 1 - (k - B.manifestAt) / 8 : 0
    const lunging = k >= B.assaultAt && k < B.clawAt
    if (lunging) for (let g = 3; g >= 1; g--) sprite(ctx, null, R.a, R.fr, rp.x - dir * g * 34 * z, rp.y, z, dir, { raw: true, s: 2.1 * grow, frame: true, alpha: 0.15 * (4 - g), tint: '#b28cff', tintA: 0.8 })
    glow(ctx, rp.x, rp.y - 140 * z, 220 * z * grow, VIO, 0.35 * fade)
    sprite(ctx, null, R.a, R.fr, rp.x, rp.y, z, dir, { raw: true, s: 2.1 * grow, frame: true, alpha: fade, tint: flash > 0 ? '#ffffff' : (fade < 1 ? '#c8b0ff' : null), tintA: flash > 0 ? flash : (1 - fade) * 0.8 })
  }
  drawFoe(ctx, S, V, k, tp, B, pr)
  { const { keys, fr } = yFrame(S, k, B)
    if (k >= B.thrustAt - 8 && k < B.thrustAt) for (let g = 3; g >= 1; g--) sprite(ctx, f, keys, fr, fp.x - dir * g * 30 * z, fp.y, z, dir, { frame: true, alpha: 0.15 * (4 - g), tint: '#c9a8ff', tintA: 0.7 })
    sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir, { frame: true }) }

  // 4) hits: claw rakes, slam crater, thrust flash
  const kc = k - B.clawAt, ks = k - B.slamAt, kt = k - B.thrustAt
  if (kc >= 0 && kc < 16) clawRakes(ctx, tp.x, tp.y - 70 * z, z, kc / 16, dir)
  if (ks >= 0 && ks < 40) { rings(ctx, tp.x, floorY, ks / 40, 3, 420 * z, '#d9c8ff', 10 * z, 0.22); debris(ctx, tp.x, floorY, ks, 26, Math.max(1, z), 41, '#2c2238', 380, 18); glow(ctx, tp.x, floorY - 30 * z, 160 * z, BONE, (1 - ks / 40) * 0.6) }
  if (kt >= 0 && kt < 12) { star(ctx, tp.x - dir * 10 * z, tp.y - 60 * z, (110 - kt * 6) * z, 1 - kt / 12, 0.4, '#f4eaff') }

  // 5) PURE LOVE: the ring glows, the sphere grows between them, the beam
  if (k >= B.loveAt && k < B.fireAt) {
    const u = clamp((k - B.loveAt) / 20, 0, 1)
    star(ctx, fp.x + dir * 10 * z, fp.y - 62 * z, (30 + 10 * Math.sin(S.real * 0.4)) * z * u, u, S.real * 0.05, '#ffe6f6')   // the ring
  }
  if (k >= B.chargeAt && k < B.fireAt + 4) {
    const u = clamp((k - B.chargeAt) / (B.fireAt - B.chargeAt), 0, 1), r = (14 + 70 * outE(u)) * z * (1 + 0.05 * Math.sin(S.real * 0.9))
    if (!calmMotion()) motes(ctx, muzzle.x, muzzle.y, z, S.real, u, false)
    glow(ctx, muzzle.x, muzzle.y, r * 3.2, PINK, 0.6 * u)
    glow(ctx, muzzle.x, muzzle.y, r * 1.6, VIO, 0.9)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(muzzle.x, muzzle.y, r * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    if (!calmMotion()) for (let i = 0; i < 6; i++) { const an = S.real * 0.12 + i * 1.05; ctx.save(); ctx.strokeStyle = `rgba(${PINK},0.6)`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(muzzle.x, muzzle.y, r * 1.3, r * 0.45, an, 0, Math.PI * 2); ctx.stroke(); ctx.restore() }
  }
  if (pr >= 0 && k < B.calmAt + 6) beam(ctx, W, H, muzzle, dir, z, pr, k, B, S.real)

  // 6) close-ups
  if (k < B.manifestAt) punchIn(ctx, canvas, W, H, fp.x, fp.y - 60 * z, 1 + 0.4 * smooth((k - 2) / 36))
  else if (k >= B.manifestAt + 20 && k < B.assaultAt) punchIn(ctx, canvas, W, H, rp.x + dir * 40 * z, rp.y - 190 * z, 1 + 0.3 * smooth((k - B.manifestAt - 20) / 16))
  else if (k >= B.chargeAt && k < B.fireAt) punchIn(ctx, canvas, W, H, (fp.x + muzzle.x) / 2, fp.y - 80 * z, 1 + 0.3 * smooth((k - B.chargeAt) / 30))
  if (k >= B.fireAt - 16 && k < B.fireAt) speedLines(ctx, W, H, muzzle.x, muzzle.y, 70, 27, '#ffffff', 0.5 * smooth((k - B.fireAt + 16) / 12), true, S.real)

  // 7) the beam's impact frames
  if (pr >= 0 && pr < 3 && !calmFlash()) impact(ctx, W, H, S, V, fp, tp, rp, k, B, '#ffffff', '#c9a8ff', '#000000', pr)
  else if (pr >= 3 && pr < 10) impact(ctx, W, H, S, V, fp, tp, rp, k, B, calmFlash() ? '#120820' : '#0b0414', '#ff9ad8', '#ffffff', pr)
  ctx.restore()

  // 8) titles + calligraphy
  if (k >= B.manifestAt + 6 && k < B.assaultAt + 6) title(ctx, W, H, 'RIKA ORIMOTO', 'QUEEN OF CURSES  ·  FULLY MANIFESTED', (k - B.manifestAt - 6) / (B.assaultAt - B.manifestAt),
    { y: 0.22, fs: 0.12, band: 'rgba(10,4,20,0.92)', edge: '#c9a8ff', fill: '#f4f0ff', stroke: '#5a2a9a', kanji: '里香', kanjiCol: '#e0d0ff' })
  if (k >= B.manifestAt + 10 && k < B.clawAt) calligraphy(ctx, W, H, '里香', (k - B.manifestAt - 10) / (B.clawAt - B.manifestAt - 10), { x: dir > 0 ? 0.88 : 0.12, y: 0.3, size: 0.14, col: '#f4f0ff', edge: '#2a1040', glow: 'rgba(190,120,255,0.9)' })
  if (k >= B.loveAt + 6 && k < B.fireAt + 30) calligraphy(ctx, W, H, '純愛', (k - B.loveAt - 6) / (B.fireAt + 30 - B.loveAt - 6), { x: dir > 0 ? 0.12 : 0.88, y: 0.3, size: 0.15, col: '#ffd6ef', edge: '#3a0a2a', glow: 'rgba(255,120,200,0.9)' })
  if (pr >= 6 && k < B.calmAt) title(ctx, W, H, 'PURE LOVE', 'YUTA OKKOTSU & RIKA  ·  JUNAI-HŌ', clamp((pr - 6) / 56, 0, 1),
    { y: 0.78, fs: 0.13, band: 'rgba(30,6,30,0.9)', edge: '#ff9ad8', fill: '#ffffff', stroke: '#c0207a', kanji: '純愛砲', kanjiCol: '#ffc0e8' })
  if (pr >= 10) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.28, pr - 10, '#ff9ad8')
  else if (pr < 0 && S.dmg > 0 && k >= B.clawAt + 4) damageNumber(ctx, W, H, S, tp.x, tp.y - H * 0.25, Math.min(30, k - (k >= B.thrustAt ? B.thrustAt : k >= B.slamAt ? B.slamAt : B.clawAt)), '#d9c8ff')

  // 9) letterbox + subtitles
  letterbox(ctx, W, H, S.real, k, B.outAt, 12)
  sub(ctx, W, H, k, 2, B.manifestAt + 4, 'YUTA', "I won't forgive anyone who hurts my friends.", '#c9a8ff')
  sub(ctx, W, H, k, B.loveAt, B.fireAt - 4, 'YUTA', "Let's end this.", '#c9a8ff')
  sub(ctx, W, H, k, B.calmAt, B.outAt + 4, 'YUTA', "I'm definitely getting stronger.", '#c9a8ff')
  return true
}

function drawFoe(ctx, S, V, k, tp, B, pr) {
  const t = S.target, z = V.z, fdir = -S.dir
  if (k < B.clawAt) { sprite(ctx, t, k >= B.manifestAt + 20 ? ['hurt', 'idle'] : ['idle'], k >= B.manifestAt + 20 ? 0 : (S.real >> 3) % 4, tp.x, tp.y, z, fdir); return }
  if (S.blocked) { sprite(ctx, t, ['guard', 'idle'], 9, tp.x, tp.y, z, fdir); return }
  if (pr >= 0) {
    const landed = (S.ty || 0) <= 0 && k > B.fireAt + 30
    sprite(ctx, t, landed ? ['knockdown', 'hurt'] : ['hurt', 'idle'], landed ? 2 : 9, tp.x, tp.y, z, fdir, { rot: landed ? 0 : -S.dir * Math.min(1.3, (k - B.fireAt) * 0.05), tint: k < B.afterAt ? '#ffe0f4' : null, tintA: 0.55 })
    return
  }
  const squash = k >= B.slamAt && k < B.slamAt + 10
  sprite(ctx, t, ['hurt', 'idle'], 9, tp.x, tp.y, z, fdir, { sx: squash ? 1.12 : 1, sy: squash ? 0.86 : 1 })
}
function beam(ctx, W, H, m, dir, z, pr, k, B, real) {
  const inU = clamp(pr / 6, 0, 1), outU = k >= B.afterAt ? clamp((k - B.afterAt) / 22, 0, 1) : 0
  const th = (90 + 30 * Math.sin(real * 0.7)) * z * outE(inU) * (1 - outU * 0.92), len = W * 2
  if (th <= 0.5) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  const x0 = m.x, x1 = m.x + dir * len
  for (const [mul, col, a] of [[2.4, VIO, 0.35], [1.6, PINK, 0.5], [1.0, '255,220,245', 0.8], [0.45, '255,255,255', 1]]) {
    const h = th * mul
    const g = ctx.createLinearGradient(0, m.y - h / 2, 0, m.y + h / 2)
    g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(0.5, `rgba(${col},${a})`); g.addColorStop(1, `rgba(${col},0)`)
    ctx.fillStyle = g; ctx.beginPath()
    // a wavering edge
    const n = 24
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, w = calmMotion() ? 0 : Math.sin(i * 1.7 + real * 0.6) * h * 0.06; ctx.lineTo(x, m.y - h / 2 - w) }
    for (let i = n; i >= 0; i--) { const x = x0 + (x1 - x0) * i / n, w = calmMotion() ? 0 : Math.cos(i * 1.3 + real * 0.5) * h * 0.06; ctx.lineTo(x, m.y + h / 2 + w) }
    ctx.closePath(); ctx.fill()
  }
  // the muzzle bloom + sparkles streaming down the beam
  ctx.globalAlpha = 1 - outU
  const bg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, th * 2); bg.addColorStop(0, 'rgba(255,255,255,1)'); bg.addColorStop(1, 'rgba(255,150,220,0)')
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(m.x, m.y, th * 2, 0, Math.PI * 2); ctx.fill()
  if (!calmMotion()) for (let i = 0; i < 40; i++) {
    const ph = ((real * (2 + hash(i, 3) * 3) + hash(i, 4) * 400) % 400) / 400
    const x = m.x + dir * ph * W * 1.4, y = m.y + (hash(i, 5) - 0.5) * th * 2.4
    ctx.fillStyle = i % 3 ? '#ffe0f4' : '#d8c0ff'; ctx.globalAlpha = (1 - outU) * (1 - ph)
    ctx.fillRect(x, y, 3 + hash(i, 6) * 4, 2)
  }
  ctx.restore()
}
function impact(ctx, W, H, S, V, fp, tp, rp, k, B, bg, fg, sil, pr) {
  const z = V.z
  ctx.save(); ctx.fillStyle = bg; ctx.fillRect(-40, -40, W + 80, H + 80)
  speedLines(ctx, W, H, tp.x, tp.y - 60 * z, 90, 70 + pr, fg, 0.9, false, pr)
  const R = rFrame(S, k, B)
  if (R) sprite(ctx, null, R.a, R.fr, rp.x, rp.y, z, S.dir, { raw: true, s: 2.1, frame: true, tint: sil, tintA: 1 })
  const { keys, fr } = yFrame(S, k, B)
  sprite(ctx, S.caster, keys, fr, fp.x, fp.y, z, S.dir, { frame: true, tint: sil, tintA: 1 })
  sprite(ctx, S.target, S.blocked ? ['guard', 'idle'] : ['hurt', 'idle'], 9, tp.x, tp.y, z, -S.dir, { tint: sil, tintA: 1, sx: 0.85, sy: 1.06 })
  ctx.restore()
}
function ringGlyph(ctx, x, y, r, real, a) {
  if (a <= 0) return
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = `rgba(${VIO},0.9)`; ctx.lineWidth = 2
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.22, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.72, r * 0.16, 0, 0, Math.PI * 2); ctx.stroke()
  for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2 + real * 0.03; ctx.fillStyle = '#e8dcff'; ctx.fillRect(x + Math.cos(an) * r * 0.86 - 2, y + Math.sin(an) * r * 0.19 - 2, 4, 4) }
  ctx.restore()
}
function motes(ctx, x, y, z, real, a, inward) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 32; i++) {
    const ph = ((real * (1 + hash(i, 2)) + hash(i, 3) * 40) % 40) / 40, an = hash(i, 4) * Math.PI * 2, d = (inward ? 1 - ph : ph) * 180 * z + 10 * z
    ctx.globalAlpha = a * Math.sin(Math.PI * ph); ctx.fillStyle = i % 2 ? '#e0ccff' : '#ffc6ea'
    ctx.fillRect(x + Math.cos(an) * d, y + Math.sin(an) * d * 0.7, 3, 3)
  }
  ctx.restore()
}
function screechWaves(ctx, x, y, z, kk, dir) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let j = 0; j < 4; j++) {
    const u = ((kk + j * 6) % 24) / 24
    ctx.globalAlpha = (1 - u) * 0.7; ctx.strokeStyle = '#f0e8ff'; ctx.lineWidth = 4 * z * (1 - u)
    ctx.beginPath(); ctx.arc(x, y, 20 * z + u * 260 * z, dir > 0 ? -0.7 : Math.PI - 0.7, dir > 0 ? 0.7 : Math.PI + 0.7); ctx.stroke()
  }
  ctx.restore()
}
function clawRakes(ctx, x, y, z, u, dir) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const e = outE(clamp(u * 2.5 - i * 0.15, 0, 1)), oy = (i - 1.5) * 22 * z
    ctx.globalAlpha = 1 - u; ctx.strokeStyle = i % 2 ? '#ffffff' : '#d9c8ff'; ctx.lineWidth = 6 * z * (1 - u * 0.6)
    ctx.beginPath(); ctx.moveTo(x - dir * 70 * z, y + oy - 50 * z); ctx.lineTo(x - dir * 70 * z + dir * 150 * z * e, y + oy - 50 * z + 110 * z * e); ctx.stroke()
  }
  ctx.restore()
}
