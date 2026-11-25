// invincibleUltFx.js — RENDER-ONLY half of the TERMINAL VELOCITY impact payoff (invincibleUlt.js). One screen pass
// (cineRegistry overlay, identity transform, device pixels): impact frames, radial ground cracks, the slow-motion dust dome,
// blue / yellow shock rings, hanging rubble, the burning column of his descent, punch-in, title, damage, letterbox +
// subtitle. Both fighters stay the engine's own sprites. Pure function of the payoff's frame counter; noise = integer hash.
import { dcKit } from './soldierBoyUltFx.js'

const { hash, clamp, smooth, outE, calmMotion, calmFlash, view, punchIn, speedLines, title, subtitle, letterbox, glow, ring, grade, bigNumber } = dcKit
const T = { total: 100, pullAt: 56, voAt: 58 }

export function drawInvTvScreen(ctx, canvas, c) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, k = c.k
  const V = view(W, H), z = V.z, p = V.p(c.x, c.floorY), slow = 0.35   // slow motion: the dust and rubble crawl
  const jit = k < 14 && !calmMotion() ? { x: (hash(k, 1) - 0.5) * 20 * (1 - k / 14), y: (hash(k, 2) - 0.5) * 20 * (1 - k / 14) } : { x: 0, y: 0 }
  ctx.save(); ctx.translate(jit.x, jit.y)
  grade(ctx, W, H, 'multiply', 'rgb(90,100,130)', 0.45 * (1 - smooth((k - 70) / 30)))
  // the column of air he tore through the sky
  const colA = clamp(1 - k / 70, 0, 1)
  if (colA > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'
    const w = (26 + 30 * (1 - colA)) * z, g = ctx.createLinearGradient(p.x - w, 0, p.x + w, 0)
    g.addColorStop(0, 'rgba(80,160,255,0)'); g.addColorStop(0.5, `rgba(240,248,255,${0.85 * colA})`); g.addColorStop(1, 'rgba(80,160,255,0)')
    ctx.fillStyle = g; ctx.fillRect(p.x - w, 0, w * 2, p.y); ctx.restore() }
  // radial ground cracks (perspective-flattened), glowing yellow at first
  ctx.save(); ctx.lineCap = 'round'
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, len = (120 + 260 * hash(i, 7)) * z * outE(clamp(k / 10, 0, 1)), dy = (hash(i, 8) - 0.3) * 30 * z
    let x = p.x, y = p.y; ctx.beginPath(); ctx.moveTo(x, y)
    for (let s = 1; s <= 5; s++) { x = p.x + side * len * s / 5; y = p.y + dy * s / 5 + (hash(i * 7 + s, 9) - 0.5) * 10 * z; ctx.lineTo(x, y) }
    ctx.strokeStyle = 'rgba(20,14,10,0.9)'; ctx.lineWidth = (5 - i % 3) * z; ctx.stroke()
    ctx.strokeStyle = `rgba(255,210,80,${0.8 * clamp(1 - k / 50, 0, 1)})`; ctx.lineWidth = 1.5 * z; ctx.stroke()
  }
  ctx.restore()
  // the dust dome, in slow motion
  const du = outE(clamp(k * slow / 30, 0, 1)), da = clamp(1 - (k - 50) / 50, 0, 1)
  ctx.save(); ctx.globalAlpha = 0.75 * da
  for (let i = 0; i < 16; i++) { const an = Math.PI + Math.PI * (i / 15), r = (60 + 300 * du) * z, rr = (30 + 50 * hash(i, 3)) * z * (0.6 + du)
    const g = ctx.createRadialGradient(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r * 0.45, 0, p.x + Math.cos(an) * r, p.y + Math.sin(an) * r * 0.45, rr)
    g.addColorStop(0, 'rgba(200,185,160,0.9)'); g.addColorStop(1, 'rgba(160,140,120,0)'); ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r * 0.45, rr, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
  // shock rings: his colours
  for (let i = 0; i < 4; i++) { const q = clamp((k - i * 5) * (i ? slow * 2 : 1) / 30, 0, 1); ring(ctx, p.x, p.y - 4 * z, (30 + 560 * outE(q)) * z, (10 + 110 * outE(q)) * z, i % 2 ? 'rgba(255,214,40,1)' : 'rgba(90,170,255,1)', (9 - i * 2) * z, 1 - q) }
  glow(ctx, p.x, p.y - 30 * z, (100 + 300 * outE(clamp(k / 20, 0, 1))) * z, '255,230,150', 0.9 * clamp(1 - k / 30, 0, 1))
  // rubble hanging in the air
  for (let i = 0; i < 24; i++) { const an = -Math.PI * (0.1 + 0.8 * hash(i, 21)), sp = (2 + 6 * hash(i, 22)) * z, tt = k * slow
    const x = p.x + Math.cos(an) * sp * tt * 6, y = p.y + Math.sin(an) * sp * tt * 6 + 0.25 * tt * tt * z, s = (4 + 9 * hash(i, 23)) * z
    ctx.save(); ctx.translate(x, y); ctx.rotate(calmMotion() ? 0 : tt * (hash(i, 24) - 0.5)); ctx.globalAlpha = clamp(1.2 - k / 90, 0, 1)
    ctx.fillStyle = i % 3 ? '#6b5a48' : '#9c8468'; ctx.fillRect(-s / 2, -s / 2, s, s * 0.7); ctx.restore() }
  if (k < 24) speedLines(ctx, W, H, p.x, p.y - 40 * z, 40, 3, 'rgba(255,255,255,1)', 0.6 * (1 - k / 24), false, k)
  ctx.restore()
  if (k < 20) punchIn(ctx, canvas, W, H, p.x, p.y - 40 * z, 1.35 - 0.3 * smooth(k / 20))
  if (!calmFlash()) { if (k < 3) grade(ctx, W, H, 'source-over', '#ffffff', 1); else if (k < 8) grade(ctx, W, H, 'difference', '#ffffff', 0.85 - (k - 3) * 0.15) }
  if (k >= 8 && k < 86) title(ctx, W, H, 'TERMINAL VELOCITY', 'INVINCIBLE', (k - 8) / 78, { band: 'rgba(14,30,70,0.92)', edge: '#ffd21e', fill: '#ffd21e', stroke: '#0b2a6b', subFill: '#bfe0ff', fs: 0.1, y: 0.24, bh: 0.19 })
  bigNumber(ctx, W, H, c.dmg, p.x + 90 * z, p.y - 70 * z, (k - 10) / 80, '#ffd21e')
  letterbox(ctx, W, H, (k + 4) / 6, (T.total - k) / 14)
  if (k >= T.voAt) subtitle(ctx, W, H, 'INVINCIBLE', 'STAY DOWN!', clamp((k - T.voAt) / 4, 0, 1) * clamp((T.total - k) / 8, 0, 1), '#ffd21e')
}
