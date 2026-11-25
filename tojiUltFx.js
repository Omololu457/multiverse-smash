// tojiUltFx.js — RENDER-ONLY overlay for Toji's REINCARNATED — HEAVENLY RESTRICTION activation (tojiUlt.js). Runs on the legacy
// frozen activation's own frame clock k (0..150; burst at 105). Toji is drawn from his real sheets (idle / intro neck-roll /
// tojiChain4 whip-out / tojiChain5 chain spin) over his hidden engine sprite; everything else is layered FX. Pure functions of
// k; noise = integer hash. Reduce Flashing → no white frame; Reduce Motion → no jitter / drifting particles.
import { clamp, smooth, outE, hash, view, sprite, punchIn, wash, desat, speedLines, title, calligraphy, letterbox, star, glow, rings,
  calmMotion, calmFlash } from './bleachUltKit.js'

const CRIM = '226,43,45', BURST = 105, OUT = 132

function tFrame(f, k, real) {
  if (k < 18) return { keys: ['idle'], fr: (real >> 3) % 6 }
  if (k < 45) return { keys: ['intro', 'idle'], fr: 9 + Math.min(4, (k - 18) >> 3) }
  if (k < 60) return { keys: ['tojiChain4', 'idle'], fr: Math.min(4, (k - 45) >> 2) }
  if (k < 100) return { keys: ['tojiChain5', 'idle'], fr: ((k - 60) >> 2) % 3 }
  if (k < BURST + 10) return { keys: ['tojiChain4', 'idle'], fr: 6 }
  if (k < BURST + 30) return { keys: ['tojiChain5', 'idle'], fr: 3 }
  return { keys: ['idle'], fr: (real >> 3) % 6 }
}

export function drawTojiUltScreen(ctx, canvas, S, k, total) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, f = S.caster, dir = f.facing || 1
  const V = view(W, H), z = V.z, real = k
  const cx = (f.x || 0) + (f.w || 48) / 2, feet = (f.y || 0) + (f.h || 94)
  const fp = V.p(cx, feet), head = { x: fp.x + dir * 4 * z, y: fp.y - 104 * z }
  const pb = k - BURST
  const jit = pb >= 0 && pb < 14 && !calmMotion() ? { x: (hash(k, 1) - 0.5) * 16, y: (hash(k, 2) - 0.5) * 16 } : { x: 0, y: 0 }
  ctx.save(); ctx.translate(jit.x, jit.y)

  // 1) the world drains to crimson-black — he has no cursed energy at all; the pressure is pure body
  const dim = k < OUT ? smooth(k / 16) : clamp(1 - (k - OUT) / 18, 0, 1)
  desat(ctx, W, H, 0.7 * dim)
  wash(ctx, W, H, '#1a0204', 0.55 * dim, 'multiply')
  vignette(ctx, W, H, 0.6 * dim)

  // 2) pressure: heat-haze aura, cracking floor, dust lifting
  const auraA = k < 45 ? smooth((k - 20) / 25) * 0.4 : k < BURST ? 0.4 + 0.6 * smooth((k - 45) / 40) : clamp(1 - (k - BURST) / 40, 0.25, 1)
  if (auraA > 0) {
    glow(ctx, fp.x, fp.y - 60 * z, (150 + 20 * Math.sin(k * 0.4)) * z, CRIM, 0.45 * auraA)
    if (!calmMotion()) flames(ctx, fp.x, fp.y, z, k, auraA)
  }
  if (k >= 45) cracks(ctx, fp.x, fp.y, z, clamp((k - 45) / 50, 0, 1), k < OUT ? 1 : clamp(1 - (k - OUT) / 18, 0, 1), k)
  if (k >= 45 && k < BURST && !calmMotion()) dust(ctx, fp.x, fp.y, z, k)

  // 3) the chain whirl around him, then Toji himself
  if (k >= 60 && k < BURST + 6) chainWhirl(ctx, fp.x, fp.y - 60 * z, z, k, k < BURST ? smooth((k - 60) / 10) : clamp(1 - (k - BURST) / 6, 0, 1))
  { const { keys, fr } = tFrame(f, k, real); sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir, { frame: true, tint: k >= BURST && k < BURST + 30 ? '#ff2a2a' : null, tintA: 0.25 * clamp(1 - (k - BURST - 10) / 20, 0, 1) }) }

  // 4) the burst
  if (pb >= 0 && pb < 50) {
    rings(ctx, fp.x, fp.y - 10 * z, pb / 50, 4, W * 0.8, '#ff3a3a', 14 * z, 0.3)
    rings(ctx, fp.x, fp.y - 60 * z, pb / 40, 2, W * 0.6, '#ffd0c8', 6 * z, 0.9)
    speedLines(ctx, W, H, fp.x, fp.y - 60 * z, 70, 11, '#ff4040', 0.5 * (1 - pb / 50), false, k)
  }

  // 5) close-ups: push on the stillness, the glare, a punch on the burst
  if (k < 45) punchIn(ctx, canvas, W, H, head.x, head.y + 30 * z, 1 + 0.35 * smooth((k - 4) / 34))
  else if (k >= 62 && k < 86) {
    const Z = 2.1 + 0.2 * smooth((k - 62) / 24)
    punchIn(ctx, canvas, W, H, head.x, head.y, Z)
    const gu = clamp((k - 66) / 14, 0, 1)
    star(ctx, head.x + dir * 6 * z * Z, head.y - 2 * z * Z, 70 * z * Math.sin(Math.PI * gu), Math.sin(Math.PI * gu), gu * 1.5, '#ffffff')
    // cinematic bars tighten for the glare
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H * 0.28); ctx.fillRect(0, H * 0.72, W, H * 0.28)
  } else if (pb >= 0 && pb < 12) punchIn(ctx, canvas, W, H, fp.x, fp.y - 60 * z, 1.25 - 0.25 * (pb / 12))

  // 6) the burst frames: white → crimson
  if (pb >= 0 && pb < 2 && !calmFlash()) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-40, -40, W + 80, H + 80); sil(ctx, f, k, fp, z, dir, '#000000') }
  else if (pb >= 2 && pb < 8) { ctx.fillStyle = calmFlash() ? '#2a0406' : '#7a0008'; ctx.fillRect(-40, -40, W + 80, H + 80); speedLines(ctx, W, H, fp.x, fp.y - 60 * z, 80, 19 + pb, '#ff9a9a', 0.8, false, pb); sil(ctx, f, k, fp, z, dir, '#ffffff') }
  ctx.restore()

  // 7) words
  if (k >= 48 && k < BURST) calligraphy(ctx, W, H, '天与呪縛', (k - 48) / (BURST - 48), { x: dir > 0 ? 0.86 : 0.14, y: 0.17, size: 0.11, col: '#ffffff', edge: '#4a0006', glow: 'rgba(255,40,40,0.85)' })
  if (k >= 86 && k < BURST - 2) tag(ctx, W, H, 'HEAVENLY RESTRICTION — ZERO CURSED ENERGY', (k - 86) / (BURST - 88))
  if (pb >= 6 && k < OUT + 14) title(ctx, W, H, 'REINCARNATED', 'TOJI FUSHIGURO  ·  THE SORCERER KILLER', (k - BURST - 6) / (OUT + 14 - BURST - 6),
    { y: 0.24, fs: 0.13, band: 'rgba(14,0,2,0.92)', edge: '#ff3a3a', fill: '#ffffff', stroke: '#9a0010', kanji: '術師殺し', kanjiCol: '#ff5050' })
  if (pb >= 12 && k < total) chips(ctx, W, H, clamp((pb - 12) / 30, 0, 1), k >= OUT + 4 ? clamp(1 - (k - OUT - 4) / 14, 0, 1) : 1)

  letterbox(ctx, W, H, k, k, OUT, 16)
  return k < OUT + 16
}

function sil(ctx, f, k, fp, z, dir, col) { const { keys, fr } = tFrame(f, k, k); sprite(ctx, f, keys, fr, fp.x, fp.y, z, dir, { frame: true, tint: col, tintA: 1 }) }
function vignette(ctx, W, H, a) {
  if (a <= 0) return
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.9)
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a.toFixed(3)})`)
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore()
}
function flames(ctx, x, y, z, k, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 26; i++) {
    const ph = ((k * (1 + hash(i, 3)) + hash(i, 4) * 40) % 40) / 40, side = (hash(i, 5) - 0.5) * 2
    const px = x + side * 34 * z, py = y - ph * 150 * z, len = (24 + 30 * hash(i, 7)) * z
    ctx.globalAlpha = a * Math.sin(Math.PI * ph) * 0.7; ctx.fillStyle = i % 3 ? '#ff2a2a' : '#ff9a80'
    ctx.beginPath(); ctx.moveTo(px - 4 * z, py); ctx.quadraticCurveTo(px + side * 10 * z, py - len * 0.5, px, py - len); ctx.quadraticCurveTo(px + 4 * z, py - len * 0.4, px + 4 * z, py); ctx.fill()
  }
  ctx.restore()
}
function cracks(ctx, x, y, z, u, a, k) {
  if (u <= 0 || a <= 0) return
  ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round'
  for (let i = 0; i < 10; i++) {
    let px = x, py = y; const side = i < 5 ? -1 : 1
    ctx.strokeStyle = '#0c0204'; ctx.lineWidth = Math.max(1.5, 4 * z * (1 - (i % 5) / 7)); ctx.beginPath(); ctx.moveTo(px, py)
    for (let s = 0; s < 6 * u; s++) { px += side * (14 + hash(i, s) * 26) * z; py += (hash(i + 5, s * 3) - 0.5) * 8 * z; ctx.lineTo(px, py) }
    ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(255,40,40,0.45)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'
  }
  ctx.restore(); void k
}
function dust(ctx, x, y, z, k) {
  ctx.save()
  for (let i = 0; i < 24; i++) {
    const ph = ((k * 0.6 + hash(i, 5) * 50) % 60) / 60, px = x + (hash(i, 6) - 0.5) * 300 * z, py = y - ph * (60 + hash(i, 7) * 120) * z, s = (2 + hash(i, 8) * 5) * z
    ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.8; ctx.fillStyle = i % 3 ? '#3a2a24' : '#7a6050'; ctx.fillRect(px, py, s, s * 0.8)
  }
  ctx.restore()
}
// the Inverted Spear of Heaven whirling on its chain: a silver-crimson ellipse trail + the blade glint at its head
function chainWhirl(ctx, x, y, z, k, a) {
  if (a <= 0) return
  const R = 110 * z, ang = k * 0.55
  ctx.save(); ctx.globalCompositeOperation = 'lighter'
  for (let j = 0; j < 14; j++) {
    const t0 = ang - j * 0.16, al = a * (1 - j / 14)
    ctx.strokeStyle = j < 2 ? `rgba(240,240,255,${al.toFixed(3)})` : `rgba(${CRIM},${(al * 0.8).toFixed(3)})`; ctx.lineWidth = Math.max(1.5, (5 - j * 0.3) * z)
    ctx.beginPath(); ctx.ellipse(x, y, R, R * 0.32, -0.15, t0 - 0.16, t0); ctx.stroke()
  }
  const hx = x + Math.cos(ang) * R * Math.cos(-0.15) - Math.sin(ang) * R * 0.32 * Math.sin(-0.15), hy = y + Math.cos(ang) * R * Math.sin(-0.15) + Math.sin(ang) * R * 0.32 * Math.cos(-0.15)
  star(ctx, hx, hy, 22 * z, a, ang, '#ffffff')
  ctx.restore()
}
function tag(ctx, W, H, text, u) {
  const a = Math.min(clamp(u / 0.2, 0, 1), clamp((1 - u) / 0.2, 0, 1))
  ctx.save(); ctx.globalAlpha = a; ctx.font = `800 ${Math.round(H * 0.03)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(text, W / 2, H * 0.84); ctx.fillStyle = '#ff6a6a'; ctx.fillText(text, W / 2, H * 0.84); ctx.restore()
}
function chips(ctx, W, H, u, a) {
  const items = ['DMG ×1.25', 'SPD ×1.10', 'DEF ×1.08'], fs = Math.round(H * 0.034)
  ctx.save(); ctx.font = `900 ${fs}px Impact, "Arial Black", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  items.forEach((s, i) => {
    const ui = clamp(u * 3 - i * 0.6, 0, 1); if (ui <= 0) return
    const x = W * (0.32 + i * 0.18), y = H * 0.8 + (1 - outE(ui)) * 30
    ctx.globalAlpha = a * ui; ctx.fillStyle = 'rgba(20,0,2,0.85)'; ctx.fillRect(x - fs * 2.6, y - fs * 0.75, fs * 5.2, fs * 1.5)
    ctx.strokeStyle = '#ff3a3a'; ctx.lineWidth = 2; ctx.strokeRect(x - fs * 2.6, y - fs * 0.75, fs * 5.2, fs * 1.5)
    ctx.fillStyle = '#ffffff'; ctx.fillText(s, x, y)
  })
  ctx.restore()
}
