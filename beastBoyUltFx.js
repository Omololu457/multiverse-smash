// beastBoyUltFx.js — RENDER-ONLY half of Beast Boy's ANIMAL INSTINCT — FOUR BEAST FINISH cinematic (beastBoyUlt.js). One
// screen pass (cineRegistry overlay, identity transform, device pixels): green morph flashes with each beast's name, the
// jungle-green grade, the T-REX (a procedural flat-green cartoon silhouette in his own palette: grows out of him, roars
// the stage apart, shrinks into the triceratops), the horn launch, dust, punch-ins, letterbox + subtitles. The gorilla,
// hawk, tiger and triceratops are his real morph sprites (engine-drawn). Pure functions of the director's counters.
import { dcKit } from './soldierBoyUltFx.js'

const { image, hash, clamp, smooth, outE, calmMotion, calmFlash, view, punchIn, speedLines, title, subtitle, letterbox, glow, ring, grade, bigNumber, caption } = dcKit
const BUST = './assets/beast_boy/cutscene/bust.png'
export function preloadBeastBoyUlt() { image(BUST) }
const P = { rex: 166, rexN: 44, grow: 10, roar: 18, shrink: 36 }
const MORPHS = [[30, 'GORILLA!'], [75, 'HAWK!'], [115, 'TIGER!'], [166, 'TRICERATOPS!']]
const GRN = '90,230,80'

// T-rex side profile (facing +x), unit = height; feet at y = 0. jaw = 0 (shut) … 1 (wide open)
function rex(c, x, y, s, dir, jaw, a, real) {
  if (a <= 0 || s <= 2) return
  c.save(); c.translate(x, y); c.scale(dir * s, s); c.globalAlpha = clamp(a, 0, 1); c.lineJoin = 'round'
  const j = 0.1 * jaw
  const body = [[-1.05, -0.42], [-0.7, -0.55], [-0.35, -0.7], [0.0, -0.8], [0.22, -0.86], [0.3, -0.98], [0.42, -1.04], [0.72, -1.02], [0.86, -0.97], [0.88, -0.9 + j * 0.2],
    [0.62, -0.86 + j * 0.3], [0.5, -0.83 + j * 0.3], [0.5, -0.8 + j], [0.84, -0.78 + j * 1.6], [0.84, -0.73 + j * 1.6], [0.52, -0.68 + j * 0.6], [0.36, -0.66], [0.3, -0.55],
    [0.34, -0.5], [0.44, -0.49], [0.46, -0.44], [0.36, -0.45], [0.26, -0.4], [0.2, -0.32], [0.16, -0.18], [0.22, -0.04], [0.36, -0.02], [0.36, 0], [0.04, 0], [0.04, -0.06], [0.0, -0.2],
    [-0.08, -0.28], [-0.14, -0.2], [-0.12, -0.05], [-0.02, -0.02], [-0.02, 0], [-0.3, 0], [-0.28, -0.08], [-0.34, -0.3], [-0.5, -0.38]]
  c.beginPath(); body.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py))); c.closePath()
  const g = c.createLinearGradient(0, -1, 0, 0); g.addColorStop(0, '#5fd84c'); g.addColorStop(0.6, '#3fae36'); g.addColorStop(1, '#2a7d27')
  c.fillStyle = g; c.fill(); c.lineWidth = 0.018; c.strokeStyle = '#0f3b10'; c.stroke()
  c.beginPath(); c.moveTo(-0.9, -0.44); c.quadraticCurveTo(-0.3, -0.58, 0.2, -0.62); c.quadraticCurveTo(0.0, -0.42, -0.4, -0.38); c.closePath(); c.fillStyle = 'rgba(160,255,140,0.25)'; c.fill()   // belly highlight
  c.fillStyle = '#ffffff'   // teeth
  for (let i = 0; i < 5; i++) { const tx = 0.56 + i * 0.06; c.beginPath(); c.moveTo(tx, -0.86 + j * 0.3 + 0.005); c.lineTo(tx + 0.02, -0.82 + j * 0.3); c.lineTo(tx + 0.04, -0.86 + j * 0.3 + 0.005); c.fill()
    if (jaw > 0.2) { c.beginPath(); c.moveTo(tx, -0.78 + j * 1.6 - 0.005); c.lineTo(tx + 0.02, -0.815 + j * 1.6); c.lineTo(tx + 0.04, -0.78 + j * 1.6 - 0.005); c.fill() } }
  c.beginPath(); c.ellipse(0.5, -0.95, 0.035, 0.022, 0, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill()   // the eye (his eyes stay his)
  c.beginPath(); c.ellipse(0.51, -0.95, 0.012, 0.018, 0, 0, Math.PI * 2); c.fillStyle = '#123a12'; c.fill()
  c.beginPath(); c.moveTo(0.42, -1.0); c.lineTo(0.56, -0.985); c.lineWidth = 0.014; c.strokeStyle = '#0f3b10'; c.stroke()   // brow
  c.restore()
}
function dust(c, x, y, z, k, a, seed) {
  if (a <= 0) return
  for (let i = 0; i < 12; i++) { const sd = i % 2 ? 1 : -1, d = (10 + k * (2 + 3 * hash(i, seed))) * z, r = (8 + k * 0.6 + 6 * hash(i, seed + 1)) * z
    c.save(); c.globalAlpha = clamp(a * (1 - k / 50), 0, 1) * 0.7; c.fillStyle = i % 3 ? '#b9a27a' : '#d8c8a0'; c.beginPath(); c.arc(x + sd * d, y - r * 0.6 - k * 0.3 * z * hash(i, seed + 2), r, 0, Math.PI * 2); c.fill(); c.restore() }
}

export function drawBeastBoyUltScreen(ctx, canvas, D, S) {
  const W = canvas?.width || 1280, H = canvas?.height || 720, f = D.caster, t = D.target
  if (!f || !t) return
  const V = view(W, H), z = V.z, L = D.L, real = D.real, dir = D.dir || 1
  const inRex = D.pauseAt === P.rex && D.pk > 0
  const hit = D.lastHit, rr = hit ? real - hit.real : 999, fin = !!(hit && hit.i === 3)
  const fc = V.p(f.x + (f.w || 48) / 2, f.y + (f.h || 94) * 0.5), feet = V.p(f.x + (f.w || 48) / 2, S.floorC + (f.h || 94))
  const tc = V.p(t.x + (t.w || 48) / 2, t.y + (t.h || 94) * 0.45), tf = V.p(t.x + (t.w || 48) / 2, S.floorT + (t.h || 94))
  const jit = (D.hold > 0 || (inRex && D.pk >= P.roar && D.pk < P.roar + 14)) && !calmMotion() ? { x: (hash(real, 1) - 0.5) * 16, y: (hash(real, 2) - 0.5) * 16 } : { x: 0, y: 0 }
  ctx.save(); ctx.translate(jit.x, jit.y)
  grade(ctx, W, H, 'multiply', 'rgb(80,120,70)', fin ? clamp(0.4 - rr / 80, 0, 0.4) : 0.4 * smooth(L / 25) + (inRex ? 0.15 : 0))
  // morph flashes: a green burst at every change of beast
  for (const [at, name] of MORPHS) {
    const k = at === P.rex ? (inRex ? D.pk - (P.rexN - 4) : L >= at ? L - at + 4 : -1) : L - at
    if (k < 0 || k > 22) continue
    const u = k / 22
    glow(ctx, fc.x, fc.y, (40 + 120 * outE(u)) * z, GRN, 0.9 * (1 - u))
    ring(ctx, fc.x, fc.y, (20 + 110 * outE(u)) * z, (20 + 110 * outE(u)) * z, 'rgba(180,255,160,1)', 4 * z, 1 - u)
    caption(ctx, W, H, name, W * 0.5, H * 0.22, clamp(1.4 - u * 1.4, 0, 1), { fs: 0.075, scale: 1 + Math.max(0, 1 - k / 4) * 0.5, fill: '#b6ff8a', stroke: '#1a4a10', rot: -0.06 + 0.04 * (at % 3) })
  }
  // the hawk dive / tiger slash: speed lines on the beast's contact approach
  if ((L >= 84 && L < 93) || (L >= 120 && L < 129)) speedLines(ctx, W, H, tc.x, tc.y, 24, L, 'rgba(220,255,210,1)', 0.35, true, real)
  // T-REX
  if (inRex) {
    const k = D.pk, grow = smooth((k - 4) / (P.grow + 2)), shrink = smooth((k - P.shrink) / 6)
    const sc = (60 + 300 * grow) * (1 - 0.8 * shrink) * z
    const jaw = k < P.roar - 4 ? 0.1 : k < P.roar + 14 ? clamp((k - P.roar + 4) / 4, 0, 1) : clamp(1 - (k - P.roar - 14) / 4, 0, 1)
    if (k >= 4 && k < P.rexN - 3) {
      glow(ctx, feet.x + dir * sc * 0.2, feet.y - sc * 0.5, sc * 0.9, GRN, 0.25)
      rex(ctx, feet.x - dir * sc * 0.1, feet.y, sc, dir, jaw, 1, real)
      if (k < 8 || (k >= P.shrink - 2 && k < P.shrink + 4)) grade(ctx, W, H, 'lighter', 'rgb(60,200,50)', 0.35)
    }
    if (k >= P.grow && k < P.grow + 10) dust(ctx, feet.x, feet.y, z, (k - P.grow) * 3, 1, 5)
    if (k >= P.roar && k < P.roar + 18) {   // the roar: shock rings from the jaws, the screen bends
      const mouth = { x: feet.x - dir * sc * 0.1 + dir * sc * 0.82, y: feet.y - sc * 0.84 }
      for (let i = 0; i < 4; i++) { const q = clamp((k - P.roar - i * 3) / 12, 0, 1); ring(ctx, mouth.x, mouth.y, (20 + 500 * outE(q)) * z, (20 + 360 * outE(q)) * z, 'rgba(230,255,220,1)', 5 * z, 0.8 * (1 - q)) }
      speedLines(ctx, W, H, mouth.x, mouth.y, 44, 97, 'rgba(240,255,235,1)', 0.5, false, real)
      caption(ctx, W, H, 'RAAAWR!!', W * 0.5, H * 0.26, clamp((k - P.roar) / 2, 0, 1) * clamp((P.roar + 18 - k) / 4, 0, 1), { fs: 0.13, scale: 1 + (calmMotion() ? 0 : 0.05 * Math.sin(k)), fill: '#ffffff', stroke: '#1f6a14', rot: -0.05 })
    }
  }
  // the charge: dust kicked up behind the triceratops
  if (L >= 170 && L < 190 && !fin) dust(ctx, V.p(f.x + (f.w || 48) / 2 - dir * 30, 0).x, feet.y, z, (L - 170) % 16 * 2, 0.9, L)
  // the horn launch
  if (fin && rr < 110) {
    const u = clamp(rr / 60, 0, 1)
    glow(ctx, tc.x, tc.y, (100 + 420 * outE(u)) * z, '255,240,170', 0.9 * (1 - u)); glow(ctx, tc.x, tc.y, (60 + 220 * outE(u)) * z, GRN, 0.7 * (1 - u))
    for (let i = 0; i < 3; i++) { const q = clamp((rr - i * 4) / 36, 0, 1); ring(ctx, tf.x, tf.y - 4 * z, (40 + 460 * outE(q)) * z, (12 + 80 * outE(q)) * z, i ? 'rgba(140,255,120,1)' : 'rgba(255,255,230,1)', (8 - i * 2) * z, 1 - q) }
    dust(ctx, tf.x, tf.y, z, rr * 1.2, 1, 9)
  }
  ctx.restore()
  if (inRex && D.pk >= P.roar && D.pk < P.roar + 6) punchIn(ctx, canvas, W, H, W / 2, H / 2, 1.08 + 0.04 * (D.pk - P.roar))
  if (D.hold > 0 && hit) punchIn(ctx, canvas, W, H, tc.x, tc.y, fin ? 1.4 - 0.25 * clamp(rr / 26, 0, 1) : 1.18)
  if (hit && !calmFlash()) {
    if (fin && rr < 3) grade(ctx, W, H, 'source-over', '#ffffff', 1)
    else if (fin && rr < 8) grade(ctx, W, H, 'difference', '#ffffff', 0.8 - (rr - 3) * 0.15)
    else if (!fin && rr < 2) grade(ctx, W, H, 'lighter', 'rgb(120,220,90)', 0.45)
  }
  if (L >= 4 && L < 30 && !D.pauseAt) title(ctx, W, H, 'ANIMAL INSTINCT', 'BEAST BOY · FOUR BEAST FINISH', (L - 4) / 26, { portrait: BUST, band: 'rgba(30,14,46,0.94)', edge: '#7be04f', fill: '#b6ff8a', stroke: '#2a0a46', subFill: '#ffffff', fs: 0.09, y: 0.62 })
  if (fin && rr < 80) title(ctx, W, H, 'FOUR BEAST FINISH!', null, rr / 80, { band: 'rgba(14,40,10,0.88)', edge: '#b6ff8a', fill: '#ffffff', stroke: '#2e8a1a', fs: 0.1, y: 0.22, bh: 0.2, from: -1 })
  letterbox(ctx, W, H, (L + (D.pauseAt ? 40 : 0)) / 10, (259 - L) / 18)
  if (L >= 236) subtitle(ctx, W, H, 'BEAST BOY', "Yeah, that's why I do it!", clamp((L - 236) / 6, 0, 1), '#8fe060')
  if (fin) bigNumber(ctx, W, H, D.dmg, tc.x, tc.y - 50 * z, rr / 70, '#b6ff8a')
}
