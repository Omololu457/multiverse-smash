// starfireUltFx.js — RENDER-ONLY half of Starfire's SUPERNOVA — EYES OF TAMARAN cinematic (starfireUlt.js). One screen pass
// (cineRegistry overlay, identity transform, device pixels): her hair blazing, the fists igniting, the comet storm of the
// barrage, the eye close-up (a re-blit punch-in on her face), bloom along the twin eye-beams, the nova, star sparkles,
// letterbox + subtitles. The fighters are the engine's own sprites (Starfire in her real ult poses; the beams themselves
// stay starfireFx's). Pure functions of the director's counters; noise = integer hash.
import { dcKit } from './soldierBoyUltFx.js'
import { starfireUltView } from './starfireState.js'

const { image, hash, clamp, smooth, outE, calmMotion, calmFlash, view, punchIn, speedLines, title, subtitle, letterbox, star, glow, ring, grade, bigNumber, caption } = dcKit
const BUST = './assets/starfire/cutscene/bust.png'
export function preloadStarfireUlt() { image(BUST) }
const P = { ign: 58, ignN: 22, eyes: 121, eyesN: 26, nova: 176 }
const GRN = '110,255,80', HOT = '220,255,190'

function comet(c, x0, y0, x1, y1, u, w, a) {   // a starbolt in flight with its trail
  if (a <= 0 || u <= 0 || u > 1) return
  const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, tu = Math.max(0, u - 0.35), tx = x0 + (x1 - x0) * tu, ty = y0 + (y1 - y0) * tu
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = clamp(a, 0, 1); c.lineCap = 'round'
  const g = c.createLinearGradient(tx, ty, x, y); g.addColorStop(0, 'rgba(110,255,80,0)'); g.addColorStop(1, 'rgba(160,255,120,0.9)')
  c.strokeStyle = g; c.lineWidth = w; c.beginPath(); c.moveTo(tx, ty); c.lineTo(x, y); c.stroke(); c.restore()
  glow(c, x, y, w * 2.2, GRN, a); glow(c, x, y, w * 0.9, HOT, a)
}
function flames(c, x, y, s, real, a) {   // her hair blazing up
  if (a <= 0) return
  c.save(); c.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 9; i++) {
    const ph = calmMotion() ? 0 : real * 0.3 + i * 1.9, h = s * (0.6 + 0.5 * hash(i, 4) + 0.2 * Math.sin(ph)), dx = (i - 4) * s * 0.12
    const g = c.createLinearGradient(x + dx, y, x + dx, y - h); g.addColorStop(0, `rgba(255,120,40,${0.55 * a})`); g.addColorStop(0.6, `rgba(255,70,30,${0.3 * a})`); g.addColorStop(1, 'rgba(255,60,20,0)')
    c.fillStyle = g; c.beginPath(); c.moveTo(x + dx - s * 0.1, y); c.quadraticCurveTo(x + dx + Math.sin(ph) * s * 0.15, y - h * 0.6, x + dx + Math.sin(ph * 1.3) * s * 0.1, y - h); c.quadraticCurveTo(x + dx + s * 0.05, y - h * 0.5, x + dx + s * 0.1, y); c.fill()
  }
  c.restore()
}

export function drawStarfireUltScreen(ctx, canvas, D, S) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, f = D.caster, t = D.target
  if (!f || !t) return
  const V = view(W, H), z = V.z, L = D.L, real = D.real, dir = D.dir || 1
  const inIgn = D.pauseAt === P.ign && D.pk > 0, inEyes = D.pauseAt === P.eyes && D.pk > 0
  const hit = D.lastHit, rr = hit ? real - hit.real : 999, nova = !!(hit && hit.i === 6)
  const fh = f.h || 110, head = V.p(f.x + (f.w || 60) / 2 + dir * 3, f.y + fh * 0.12), hand = V.p(f.x + (f.w || 60) / 2 + dir * 30, f.y + fh * 0.35)
  const back = V.p(f.x + (f.w || 60) / 2 - dir * 22, f.y + fh * 0.38), tc = V.p(t.x + (t.w || 48) / 2, t.y + (t.h || 94) * 0.45)
  const jit = D.hold > 0 && !calmMotion() ? { x: (hash(real, 1) - 0.5) * 12, y: (hash(real, 2) - 0.5) * 12 } : { x: 0, y: 0 }
  ctx.save(); ctx.translate(jit.x, jit.y)
  // the sky darkens into deep space; green when the beams fire
  const dimA = nova ? clamp(0.5 - rr / 60, 0, 0.5) : 0.5 * smooth(L / 30)
  grade(ctx, W, H, 'multiply', 'rgb(40,50,90)', dimA)
  if (inEyes || (L >= 134 && L < 172)) grade(ctx, W, H, 'multiply', 'rgb(120,255,120)', inEyes ? 0.35 * smooth(D.pk / 10) : 0.35)
  // her power: hair aflame, the green corona
  const aura = nova ? clamp(1 - rr / 40, 0, 1) : smooth(L / 18)
  flames(ctx, head.x - dir * 6 * z, head.y + 2 * z, 34 * z, real, aura)
  glow(ctx, hand.x - dir * 30 * z, hand.y, 110 * z, GRN, 0.3 * aura)
  // IGNITE: both fists, stars streaming inward
  if (inIgn || (L >= 60 && L < 120)) {
    const u = inIgn ? smooth(D.pk / P.ignN) : 1
    for (const p of [hand, back]) { glow(ctx, p.x, p.y, (14 + 34 * u) * z, GRN, 0.9); glow(ctx, p.x, p.y, (6 + 14 * u) * z, HOT, 1) }
    if (inIgn) for (let i = 0; i < 26; i++) {
      const an = hash(i, 17) * Math.PI * 2, v = ((D.pk * 1.6 + hash(i, 18) * 30) % 30) / 30, r = (220 - 200 * v) * z, p = i % 2 ? hand : back
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = v; ctx.fillStyle = '#c8ff9a'; ctx.fillRect(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r, 3 * z, 3 * z); ctx.restore()
    }
    if (inIgn && D.pk > 14) ring(ctx, hand.x, hand.y, (30 + (D.pk - 14) * 12) * z, (30 + (D.pk - 14) * 12) * z, 'rgba(200,255,170,1)', 4 * z, 1 - (D.pk - 14) / 8)
  }
  // BARRAGE: a storm of comet trails around the four real bolts
  if (L >= 60 && L < 120 && !nova) {
    for (let i = 0; i < 14; i++) {
      const at = 60 + i * 4, u = (L - at) / 9
      if (u <= 0 || u > 1) continue
      const p = i % 2 ? hand : back, off = (hash(i, 23) - 0.5) * 90 * z
      comet(ctx, p.x, p.y, tc.x + (hash(i, 24) - 0.5) * 40 * z, tc.y + off * 0.6, u, (9 + 8 * hash(i, 25)) * z, 0.95)
    }
    speedLines(ctx, W, H, tc.x, tc.y, 22, 9, 'rgba(170,255,140,1)', 0.25, true, real)
  }
  // EYE-BEAMS: bloom along the real beams
  const v = starfireUltView(f)
  if (v?.beams && !nova) {
    for (const sg of v.beams.segs) { const a = V.p(sg.x0, sg.y0), b = V.p(sg.x1, sg.y1)
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'
      for (const [w, col] of [[34, 'rgba(90,255,60,0.18)'], [18, 'rgba(140,255,110,0.35)'], [6, 'rgba(240,255,230,0.9)']]) { ctx.strokeStyle = col; ctx.lineWidth = w * z; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke() }
      ctx.restore(); glow(ctx, b.x, b.y, 60 * z, GRN, 0.7); glow(ctx, a.x, a.y, 22 * z, HOT, 0.9) }
    speedLines(ctx, W, H, tc.x, tc.y, 34, 13, 'rgba(200,255,180,1)', 0.45, true, real)
  }
  // SUPERNOVA: everything collapses into the foe, then the nova
  if (L >= 168 && !nova) { const u = smooth((L - 168) / 8); glow(ctx, tc.x, tc.y, (160 - 110 * u) * z, GRN, 0.5 + 0.5 * u); glow(ctx, tc.x, tc.y, 30 * z * (1 + u), HOT, 0.9); speedLines(ctx, W, H, tc.x, tc.y, 46, 71, 'rgba(230,255,210,1)', 0.6 * u, true, real) }
  if (nova && rr < 130) {
    const u = clamp(rr / 70, 0, 1)
    glow(ctx, tc.x, tc.y, (120 + 700 * outE(u)) * z, GRN, 0.95 * (1 - u))
    glow(ctx, tc.x, tc.y, (60 + 260 * outE(u)) * z, HOT, 1 - u)
    for (let i = 0; i < 4; i++) { const q = clamp((rr - i * 4) / 44, 0, 1); ring(ctx, tc.x, tc.y, (40 + 640 * outE(q)) * z, (40 + 640 * outE(q)) * z * (i % 2 ? 0.35 : 1), i ? 'rgba(130,255,100,1)' : 'rgba(250,255,240,1)', (9 - i * 2) * z, 1 - q) }
    for (let i = 0; i < 22; i++) {   // the stars raining back down
      const an = hash(i, 31) * Math.PI * 2, d = (40 + 260 * hash(i, 32)) * z * outE(clamp(rr / 30, 0, 1)), fall = Math.max(0, rr - 30) * 0.8 * z
      star(ctx, tc.x + Math.cos(an) * d, tc.y + Math.sin(an) * d * 0.6 + fall, (6 + 10 * hash(i, 33)) * z, clamp(1.3 - rr / 100, 0, 1) * (calmMotion() ? 1 : 0.6 + 0.4 * Math.sin(rr * 0.4 + i)), rr * 0.05, '#d8ffc8')
    }
  }
  ctx.restore()
  // close-ups
  if (inEyes) { const u = smooth(D.pk / 8); punchIn(ctx, canvas, W, H, head.x, head.y, 1 + 1.6 * u)
    const eg = 0.6 + 0.4 * (calmMotion() ? 1 : Math.sin(real * 0.5)); glow(ctx, W / 2, H / 2 - 4, 120 * u, GRN, 0.25 * eg * u)
    grade(ctx, W, H, 'lighter', 'rgb(40,120,20)', 0.25 * u) }
  if (D.hold > 0 && hit) punchIn(ctx, canvas, W, H, tc.x, tc.y, nova ? 1.4 - 0.25 * clamp(rr / 26, 0, 1) : 1.15)
  if (hit && !calmFlash()) {
    if (nova && rr < 3) grade(ctx, W, H, 'source-over', '#ffffff', 1)
    else if (nova && rr < 10) grade(ctx, W, H, 'source-over', 'rgb(200,255,180)', 0.9 - (rr - 3) * 0.12)
    else if (!nova && rr < 2) grade(ctx, W, H, 'lighter', 'rgb(90,200,60)', 0.5)
  }
  if (inEyes && D.pk > 6) caption(ctx, W, H, 'ZOAL!', W * 0.5, H * 0.8, clamp((D.pk - 6) / 3, 0, 1), { fs: 0.1, scale: 1 + Math.max(0, 1 - (D.pk - 6) / 5) * 0.6, fill: '#c8ff7a', stroke: '#0d3b06' })
  if (inIgn) caption(ctx, W, H, 'STARBOLTS!', W * 0.5, H * 0.22, clamp(D.pk / 4, 0, 1), { fs: 0.07, fill: '#d9ff9a', stroke: '#124a08', rot: -0.05 })
  if (L >= 4 && L < 40 && !D.pauseAt) title(ctx, W, H, 'SUPERNOVA', 'STARFIRE · EYES OF TAMARAN', (L - 4) / 36, { portrait: BUST, band: 'rgba(40,6,50,0.94)', edge: '#7dff4a', fill: '#b8ff6a', stroke: '#2a0640', subFill: '#ffd0f0', fs: 0.1, y: 0.62 })
  if (nova && rr < 80) title(ctx, W, H, 'SUPERNOVA!', null, rr / 80, { band: 'rgba(8,30,6,0.85)', edge: '#c8ff7a', fill: '#ffffff', stroke: '#2e9a12', fs: 0.13, y: 0.22, bh: 0.2, from: -1 })
  letterbox(ctx, W, H, (L + (D.pauseAt ? 40 : 0)) / 10, (223 - L) / 16)
  if (L >= 200) subtitle(ctx, W, H, 'STARFIRE', 'Teen Titans triumph!', clamp((L - 200) / 6, 0, 1), '#9dff6a')
  if (nova) bigNumber(ctx, W, H, D.dmg, tc.x, tc.y - 50 * z, rr / 70, '#b8ff6a')
}
