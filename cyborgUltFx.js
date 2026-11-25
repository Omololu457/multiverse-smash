// cyborgUltFx.js — RENDER-ONLY half of Cyborg's BOOYAH PROTOCOL — FULL SYSTEMS IMPACT cinematic (cyborgUlt.js). One screen
// pass (cineRegistry overlay, identity transform, device pixels): his cybernetic eye's HUD (scanlines, readouts, lock
// brackets), sonic rings down the cannon beam, missile smoke trails, thruster fire, the full-systems overload (power lines
// into the fist, the meter past 100 %), the shock dome, punch-ins, letterbox + subtitles. The fighters are the engine's own
// sprites (Cyborg in his real ult poses; beam / missiles stay cyborgFx's). Pure functions of the director's counters.
import { dcKit } from './soldierBoyUltFx.js'
import { cyborgUltView } from './cyborgState.js'

const { image, hash, clamp, smooth, outE, calmMotion, calmFlash, view, punchIn, speedLines, title, subtitle, letterbox, glow, ring, grade, bigNumber, caption } = dcKit
const BUST = './assets/cyborg/cutscene/bust.png'
export function preloadCyborgUlt() { image(BUST) }
const P = { lock: 42, lockN: 24, full: 152, fullN: 24 }
const RED = '255,50,40', CYAN = '120,220,255'

function brackets(c, x, y, r, a, col, lw) {
  if (a <= 0) return
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.strokeStyle = col; c.lineWidth = lw; const q = r * 0.4
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(x + sx * r, y + sy * (r - q)); c.lineTo(x + sx * r, y + sy * r); c.lineTo(x + sx * (r - q), y + sy * r); c.stroke() }
  c.restore()
}
function hudText(c, H, lines, x, y, a, col = '#ff5a4a', align = 'left') {
  if (a <= 0) return
  c.save(); c.globalAlpha = clamp(a, 0, 1); c.font = `700 ${Math.round(H * 0.022)}px "Courier New", monospace`; c.textAlign = align; c.textBaseline = 'top'
  lines.forEach((l, i) => { c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillText(l, x + 2, y + i * H * 0.03 + 2); c.fillStyle = col; c.fillText(l, x, y + i * H * 0.03) }); c.restore()
}
function thruster(c, x, y, s, real, a) {
  if (a <= 0) return
  c.save(); c.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 3; i++) { const h = s * (1.2 + 0.4 * (calmMotion() ? 0.5 : hash(real + i, 9))), w = s * (0.35 - i * 0.08)
    const g = c.createLinearGradient(x, y, x, y + h); g.addColorStop(0, `rgba(255,255,230,${a})`); g.addColorStop(0.3, `rgba(255,170,60,${0.8 * a})`); g.addColorStop(1, 'rgba(255,60,20,0)')
    c.fillStyle = g; c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y + h * 1.1, x + w, y); c.fill() }
  c.restore()
}

export function drawCyborgUltScreen(ctx, canvas, D, S) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, f = D.caster, t = D.target
  if (!f || !t) return
  const V = view(W, H), z = V.z, L = D.L, real = D.real, dir = D.dir || 1
  const inLock = D.pauseAt === P.lock && D.pk > 0, inFull = D.pauseAt === P.full && D.pk > 0
  const hit = D.lastHit, rr = hit ? real - hit.real : 999, mega = !!(hit && hit.i === 5)
  const fh = f.h || 94, eye = V.p(f.x + (f.w || 48) / 2 + dir * 6, f.y + fh * 0.14), fist = V.p(f.x + (f.w || 48) / 2 + dir * 34, f.y + fh * 0.4)
  const feet = V.p(f.x + (f.w || 48) / 2, f.y + fh), tc = V.p(t.x + (t.w || 48) / 2, t.y + (t.h || 94) * 0.45)
  const jit = D.hold > 0 && !calmMotion() ? { x: (hash(real, 1) - 0.5) * 12, y: (hash(real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  ctx.save(); ctx.translate(jit.x, jit.y)
  grade(ctx, W, H, 'multiply', 'rgb(70,80,110)', mega ? clamp(0.45 - rr / 70, 0, 0.45) : 0.45 * smooth(L / 25))
  // SONIC: rings of sound down the beam
  const v = cyborgUltView(f)
  if (v?.beam) { const a = V.p(v.beam.x0, v.beam.y), b = V.p(v.beam.x1, v.beam.y), n = 7
    for (let i = 0; i < n; i++) { const u = ((i / n) + (calmMotion() ? 0 : v.beam.k * 0.06)) % 1, x = a.x + (b.x - a.x) * u
      ring(ctx, x, a.y, 10 * z + 26 * z * u, 30 * z + 50 * z * u, 'rgba(170,230,255,1)', 3 * z, 0.8 * (1 - u * 0.5)) }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(150,220,255,0.35)'; ctx.lineWidth = 40 * z; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore()
    speedLines(ctx, W, H, b.x, b.y, 26, 5, 'rgba(200,240,255,1)', 0.4, true, real) }
  // PAYLOAD: smoke trails behind the missiles
  if (v?.missiles?.length) for (const m of v.missiles) { const p = V.p(m.x, m.y)
    for (let j = 1; j < 9; j++) { const q = V.p(m.x - m.dir * j * 14, m.y + Math.sin(j + real * 0.2) * 3); ctx.save(); ctx.globalAlpha = 0.5 * (1 - j / 9); ctx.fillStyle = '#c8ccd4'; ctx.beginPath(); ctx.arc(q.x, q.y, (4 + j * 1.6) * z, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
    glow(ctx, p.x - m.dir * 10 * z, p.y, 16 * z, '255,170,60', 0.9) }
  // THRUST
  if (L >= 110 && L < 152 && !inFull) { thruster(ctx, feet.x - 8 * z, feet.y - 4 * z, 22 * z, real, 1); thruster(ctx, feet.x + 8 * z, feet.y - 4 * z, 22 * z, real + 3, 1)
    if (L >= 126) speedLines(ctx, W, H, tc.x, tc.y, 24, 17, 'rgba(255,255,255,1)', 0.3, true, real) }
  // FULL SYSTEMS: every system routed into the fist
  if (inFull || (L >= 152 && L < 172 && !mega)) {
    const u = inFull ? smooth(D.pk / P.fullN) : 1
    glow(ctx, fist.x, fist.y, (30 + 90 * u) * z, CYAN, 0.9); glow(ctx, fist.x, fist.y, (12 + 26 * u) * z, '240,250,255', 1)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
    for (let i = 0; i < 12; i++) { const an = hash(i, 41) * Math.PI * 2, r0 = (160 + 80 * hash(i, 42)) * z, ph = calmMotion() ? 0.5 : ((real * 0.05 + hash(i, 43)) % 1)
      const x0 = fist.x + Math.cos(an) * r0 * (1 - ph), y0 = fist.y + Math.sin(an) * r0 * (1 - ph)
      ctx.strokeStyle = `rgba(140,225,255,${0.8 * u})`; ctx.lineWidth = 2.5 * z; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (fist.x - x0) * 0.3, y0 + (fist.y - y0) * 0.3); ctx.stroke() }
    ctx.restore()
    speedLines(ctx, W, H, fist.x, fist.y, 30, 23, 'rgba(160,230,255,1)', 0.45 * u, true, real)
  }
  // IMPACT: the shock dome
  if (mega && rr < 120) {
    const u = clamp(rr / 64, 0, 1)
    glow(ctx, tc.x, tc.y, (120 + 560 * outE(u)) * z, CYAN, 0.95 * (1 - u)); glow(ctx, tc.x, tc.y, (50 + 200 * outE(u)) * z, '250,252,255', 1 - u)
    for (let i = 0; i < 4; i++) { const q = clamp((rr - i * 4) / 40, 0, 1); ring(ctx, tc.x, tc.y, (40 + 600 * outE(q)) * z, (30 + 220 * outE(q)) * z, i ? 'rgba(120,210,255,1)' : 'rgba(255,255,255,1)', (9 - i * 2) * z, 1 - q) }
    for (let i = 0; i < 30; i++) { const an = hash(i, 51) * Math.PI * 2, sp = (5 + 10 * hash(i, 52)) * z
      ctx.fillStyle = i % 3 ? '#9fdcff' : '#ffffff'; ctx.globalAlpha = clamp(1 - rr / 50, 0, 1); ctx.fillRect(tc.x + Math.cos(an) * sp * rr, tc.y + Math.sin(an) * sp * rr * 0.6, 4 * z, 2 * z) }
    ctx.globalAlpha = 1
  }
  ctx.restore()
  // close-ups
  if (inLock && D.pk < 12) punchIn(ctx, canvas, W, H, eye.x, eye.y, 1 + 1.3 * smooth(D.pk / 6))
  if (D.hold > 0 && hit) punchIn(ctx, canvas, W, H, tc.x, tc.y, mega ? 1.4 - 0.25 * clamp(rr / 26, 0, 1) : 1.15)
  if (hit && !calmFlash()) {
    if (mega && rr < 3) grade(ctx, W, H, 'source-over', '#ffffff', 1)
    else if (mega && rr < 8) grade(ctx, W, H, 'difference', '#ffffff', 0.85 - (rr - 3) * 0.15)
    else if (!mega && rr < 2) grade(ctx, W, H, 'lighter', 'rgb(110,190,255)', 0.45)
  }
  // THE HUD (his eye): scanlines + red frame through the whole protocol until the impact
  const hudA = mega ? clamp(1 - rr / 12, 0, 1) : smooth(L / 10)
  if (hudA > 0) {
    ctx.save(); ctx.globalAlpha = hudA * 0.18; ctx.fillStyle = '#ff2a20'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1); ctx.restore()
    brackets(ctx, W / 2, H / 2, Math.min(W, H) * 0.44, hudA * 0.6, '#ff4a3a', 3)
    const sys = [['OPTICS', 10], ['SONIC CANNON', 18], ['MISSILE RACK', 26], ['THRUSTERS', 34]].map(([n, at]) => L >= at || D.pauseAt ? `${n} ....... ONLINE` : `${n} .......`)
    hudText(ctx, H, ['// BOOYAH PROTOCOL v3.0', ...sys], W * 0.05, H * 0.16, hudA * (L < 70 || inLock ? 1 : 0.5))
    if (L >= 70 && L < 110) hudText(ctx, H, ['MISSILES AWAY ×3'], W * 0.95, H * 0.16, hudA, '#ffcf3a', 'right')
  }
  if (inLock || (L >= P.lock && L < 110 && !mega)) {   // the lock
    const u = inLock ? smooth(Math.max(0, D.pk - 10) / 6) : 1, r = (40 + 140 * (1 - u)) * z
    brackets(ctx, tc.x, tc.y, r, inLock && D.pk < 10 ? 0 : 1, u >= 1 ? '#ff2a20' : '#ffcf3a', 4 * z)
    if (u >= 1) { caption(ctx, W, H, 'TARGET LOCKED', tc.x, tc.y - r - 22 * z, 1, { fs: 0.028, fill: '#ff4a3a', stroke: '#200000' })
      hudText(ctx, H, [`DIST ${Math.round(Math.abs(t.x - f.x))}`, `THREAT  HIGH`], tc.x + r + 10 * z, tc.y - r, 0.9) }
  }
  if (inFull || (L >= 152 && L < 172 && !mega)) {   // the overload meter
    const u = inFull ? D.pk / P.fullN : 1, pct = Math.round(100 + 100 * smooth(u)), bw = W * 0.34, bx = W * 0.33, by = H * 0.2
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(bx - 4, by - 4, bw + 8, H * 0.04 + 8)
    ctx.fillStyle = pct > 150 ? '#ff3a2a' : '#5fd0ff'; ctx.fillRect(bx, by, bw * Math.min(1, pct / 200), H * 0.04); ctx.restore()
    caption(ctx, W, H, `FULL SYSTEMS  ${pct}%`, W / 2, by - H * 0.035, 1, { fs: 0.04, fill: pct > 150 ? '#ff6a5a' : '#bfefff', stroke: '#001018' })
    if (inFull && D.pk >= 12) caption(ctx, W, H, 'BOO YEAH!', W / 2, H * 0.74, clamp((D.pk - 12) / 3, 0, 1), { fs: 0.1, scale: 1 + Math.max(0, 1 - (D.pk - 12) / 4) * 0.6, fill: '#ffffff', stroke: '#0a5a8a', rot: -0.06 })
  }
  if (L >= 4 && L < 42 && !D.pauseAt) title(ctx, W, H, 'BOOYAH PROTOCOL', 'CYBORG · FULL SYSTEMS IMPACT', (L - 4) / 38, { portrait: BUST, band: 'rgba(14,20,34,0.94)', edge: '#ff3a2a', fill: '#dff4ff', stroke: '#0a4a80', subFill: '#ffb0a8', fs: 0.085, y: 0.64 })
  if (mega && rr < 86) title(ctx, W, H, 'BOOYAH!', null, rr / 86, { band: 'rgba(6,20,36,0.88)', edge: '#5fd0ff', fill: '#ffffff', stroke: '#ff3a2a', fs: 0.14, y: 0.22, bh: 0.2, from: -1 })
  letterbox(ctx, W, H, (L + (D.pauseAt ? 40 : 0)) / 10, (215 - L) / 16)
  if (L >= 190) subtitle(ctx, W, H, 'CYBORG', "That's the power!", clamp((L - 190) / 6, 0, 1), '#5fd0ff')
  if (mega) bigNumber(ctx, W, H, D.dmg, tc.x, tc.y - 50 * z, rr / 70, '#8fe0ff')
}
