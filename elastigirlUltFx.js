// Elastigirl (elastigirl) — FAMILY RAFT CINEMATIC, RENDER ONLY (elastigirlUlt.js owns the simulation). Reads the scene,
// never writes it. World pass (drawElastigirlUltWorld, called from elastigirlFx.drawElastigirlFx while the caster is drawn):
// the stretched limbs (bezier arms in her suit colours), gloves, the GIANT FIST, slingshot anchors, whip trails, shockwave
// rings, dust, debris and the crater. Screen pass (registerCineScreen): letterbox, the title cut-in, focus lines, impact
// frames / flashes, a crash-zoom punch on every contact, the finisher caption. No Math.random: variation = hash(tick, i).
import { registerCineScreen } from './cineRegistry.js'
import { elastigirlUltScene, layout } from './elastigirlUlt.js'
import { ULT_CINE as U } from './elastigirlData.js'
import { juiceSettings } from './juiceSettings.js'

const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const seg = (k, a, b) => clamp((k - a) / (b - a), 0, 1)
const easeOut = u => 1 - (1 - u) * (1 - u)
let XF = null                                   // world → screen transform recorded while the caster is drawn
const toScreen = (x, y) => XF ? { x: XF.a * x + XF.c * y + XF.e, y: XF.b * x + XF.d * y + XF.f, s: Math.hypot(XF.a, XF.b) } : null

// ── WORLD PASS ──────────────────────────────────────────────────────────────────────────────────────────────────────
function limb(c, a, suit, glove) {
  const mx = (a.x0 + a.x1) / 2, my = (a.y0 + a.y1) / 2, dx = a.x1 - a.x0, dy = a.y1 - a.y0, len = Math.hypot(dx, dy) || 1
  const cx = mx - dy / len * (a.bend || 0), cy = my + dx / len * (a.bend || 0)
  const path = () => { c.beginPath(); c.moveTo(a.x0, a.y0); c.quadraticCurveTo(cx, cy, a.x1, a.y1) }
  // thinner the further it stretches (rubber), never thinner than a cord
  const w = Math.max(3.5, a.w * clamp(220 / len, 0.55, 1.15))
  c.lineCap = 'round'; c.lineJoin = 'round'
  path(); c.strokeStyle = 'rgba(20,0,0,0.85)'; c.lineWidth = w + 4; c.stroke()
  path(); c.strokeStyle = suit; c.lineWidth = w; c.stroke()
  c.save(); c.translate(-0.8, -1.2); path(); c.strokeStyle = 'rgba(255,190,170,0.55)'; c.lineWidth = Math.max(1, w * 0.28); c.stroke(); c.restore()
  if (a.taut) {                                   // slingshot tension: a bright vibrating core
    c.save(); c.globalAlpha = 0.35 + 0.5 * a.taut; c.strokeStyle = '#fff3c4'; c.lineWidth = 1.2
    c.beginPath(); c.moveTo(a.x0, a.y0); c.lineTo(a.x1 + (hash(a.x1 | 0, a.taut * 99 | 0) - 0.5) * 3, a.y1); c.stroke(); c.restore()
  }
  if (a.fist) { fist(c, a, cx, cy, suit, glove); return }
  // glove (open hand while reaching, a fist once it grips)
  const ang = Math.atan2(a.y1 - cy, a.x1 - cx), r = Math.max(4.5, w * 0.95)
  c.fillStyle = glove; c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = 1.5
  c.beginPath(); c.arc(a.x1, a.y1, r, 0, Math.PI * 2); c.fill(); c.stroke()
  if (a.open) for (let i = -2; i <= 2; i++) { const fa = ang + i * 0.38; c.strokeStyle = glove; c.lineWidth = 3
    c.beginPath(); c.moveTo(a.x1, a.y1); c.lineTo(a.x1 + Math.cos(fa) * r * 2, a.y1 + Math.sin(fa) * r * 2); c.stroke() }
}
function fist(c, a, cx, cy, suit, glove) {
  const r = a.fist, ang = Math.atan2(a.y1 - cy, a.x1 - cx)
  // forearm swells into the fist (tapered quad)
  const wx = a.x1 - Math.cos(ang) * r * 0.9, wy = a.y1 - Math.sin(ang) * r * 0.9, nx = -Math.sin(ang), ny = Math.cos(ang)
  c.fillStyle = suit; c.strokeStyle = 'rgba(20,0,0,0.9)'; c.lineWidth = 2
  c.beginPath(); c.moveTo(cx + nx * 5, cy + ny * 5); c.lineTo(wx + nx * r * 0.55, wy + ny * r * 0.55); c.lineTo(wx - nx * r * 0.55, wy - ny * r * 0.55); c.lineTo(cx - nx * 5, cy - ny * 5); c.closePath(); c.fill(); c.stroke()
  // black cuff
  c.fillStyle = '#111'; c.beginPath(); c.ellipse(wx, wy, r * 0.25, r * 0.62, ang, 0, Math.PI * 2); c.fill()
  // the glove: a big rounded fist with knuckles, lit from the top-left
  c.save(); c.translate(a.x1, a.y1); c.rotate(ang)
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 1.1)
  g.addColorStop(0, '#5a5a5a'); g.addColorStop(0.45, glove); g.addColorStop(1, '#000')
  c.fillStyle = g; c.strokeStyle = '#000'; c.lineWidth = 2.5
  c.beginPath(); c.ellipse(0, 0, r * 1.0, r * 0.88, 0, 0, Math.PI * 2); c.fill(); c.stroke()
  c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = Math.max(1, r * 0.06)
  for (let i = -1.5; i <= 1.5; i++) { c.beginPath(); c.arc(r * 0.55, i * r * 0.36, r * 0.2, -Math.PI / 2, Math.PI / 2); c.stroke() }
  c.beginPath(); c.arc(-r * 0.1, r * 0.45, r * 0.3, 0.2, 2.2); c.stroke()   // thumb
  c.restore()
}
function rings(c, sc) {
  for (const e of sc.fx) {
    const age = sc.tick - e.tick, P = e.power
    if (age < 0 || age > 60) continue
    const air = e.i === 2
    // shockwave rings: a flattened floor ellipse (an air burst for the kick)
    for (let j = 0; j < (P > 2 ? 3 : 2); j++) {
      const a2 = age - j * 4; if (a2 < 0 || a2 > 28) continue
      const u = a2 / 28, R = (40 + 190 * P * 0.6) * easeOut(u) + 10
      c.save(); c.globalAlpha = (1 - u) * (j ? 0.55 : 0.9); c.strokeStyle = j === 1 ? '#ffb13b' : '#ffffff'; c.lineWidth = Math.max(1, (9 - j * 2) * (1 - u) * P * 0.7)
      c.beginPath(); if (air) c.arc(e.x, e.cy, R * 0.7, 0, Math.PI * 2); else c.ellipse(e.x, e.y - 2, R, R * 0.22, 0, 0, Math.PI * 2); c.stroke(); c.restore()
    }
    // impact star
    if (age < 10) {
      const u = age / 10, n = 12, R0 = 26 * P, cx = e.x, cy = air ? e.cy : e.y - 30
      c.save(); c.globalAlpha = 1 - u; c.fillStyle = age < 3 ? '#ffffff' : '#ffd25a'
      c.beginPath()
      for (let i = 0; i < n * 2; i++) { const ang = i / (n * 2) * Math.PI * 2 + hash(e.tick, i) * 0.2, rr = (i & 1 ? 0.35 : 1 + hash(e.tick, i + 50) * 0.8) * R0 * (0.6 + u)
        c.lineTo(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * (air ? 1 : 0.8)) }
      c.closePath(); c.fill(); c.restore()
    }
    if (air) continue
    // dust: puffs rolling out along the floor
    for (let i = 0; i < 8 * P; i++) {
      const side = i & 1 ? 1 : -1, sp = 1.5 + 4 * hash(e.tick, i) * P, x = e.x + side * sp * age * (1 - age / 120), y = e.y - 6 - hash(e.tick, i + 9) * 18 - age * 0.25
      const r = (6 + 10 * hash(e.tick, i + 3)) * (1 + age / 25)
      c.save(); c.globalAlpha = Math.max(0, 0.5 * (1 - age / 60)); c.fillStyle = i % 3 ? '#c9b9a0' : '#e8dcc6'
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.restore()
    }
    // debris for the finisher
    if (P > 2) for (let i = 0; i < 18; i++) {
      const vx = (hash(e.tick, i + 100) - 0.5) * 14, vy = -5 - 9 * hash(e.tick, i + 200), x = e.x + vx * age, y = e.y + vy * age + 0.42 * age * age
      if (y > e.y + 4) continue
      c.save(); c.fillStyle = i % 2 ? '#5b4a3a' : '#8a7860'; c.translate(x, y); c.rotate(age * 0.3 + i); const s = 3 + 5 * hash(e.tick, i + 300); c.fillRect(-s / 2, -s / 2, s, s); c.restore()
    }
  }
}
function crater(c, sc) {
  const e = sc.fx.find(f => f.i === 3); if (!e) return
  const age = sc.tick - e.tick, grow = easeOut(clamp(age / 6, 0, 1))
  c.save()
  c.fillStyle = 'rgba(30,18,10,0.55)'; c.beginPath(); c.ellipse(e.x, e.y + 2, 120 * grow, 16 * grow, 0, 0, Math.PI * 2); c.fill()
  c.strokeStyle = 'rgba(20,10,5,0.85)'; c.lineWidth = 2.5
  for (let i = 0; i < 9; i++) {
    const side = i < 5 ? -1 : 1, L = (60 + 120 * hash(e.tick, i + 400)) * grow
    c.beginPath(); c.moveTo(e.x, e.y); let x = e.x, y = e.y
    for (let s = 1; s <= 4; s++) { x = e.x + side * L * s / 4; y = e.y + (hash(e.tick, i * 10 + s) - 0.5) * 10 * (s / 4) + 1; c.lineTo(x, y) }
    c.stroke()
  }
  c.restore()
}
function trails(c, sc, L) {
  const k = sc.k
  // whip ribbon: where the foe was over the last frames
  if (L.phase === 'whip' && k > U.swing + 2 && k <= U.slam2 + 2) {
    c.save(); c.lineCap = 'round'
    let prev = null
    for (let j = 0; j <= 7; j++) {
      const p = layout(sc, Math.max(U.swing, k - j)).t
      if (prev) { c.globalAlpha = 0.55 * (1 - j / 8); c.strokeStyle = '#ffffff'; c.lineWidth = 26 * (1 - j / 9); c.beginPath(); c.moveTo(prev.x, prev.cy); c.lineTo(p.x, p.cy); c.stroke() }
      prev = p
    }
    c.restore()
  }
  // slingshot release: Helen's red speed streak
  if (k >= U.release && k <= U.kick + 3) {
    c.save(); c.lineCap = 'round'
    const now = layout(sc, Math.min(k, U.kick - 1)).h, then = layout(sc, U.release).h, fh = sc.fh
    for (let i = 0; i < 6; i++) { const oy = -fh * (0.15 + i * 0.13)
      c.globalAlpha = 0.5 - i * 0.06; c.strokeStyle = i % 2 ? '#ffffff' : '#ff4a3a'; c.lineWidth = 3 + (i % 3)
      c.beginPath(); c.moveTo(then.x, then.feet + oy); c.lineTo(now.x, now.feet + oy); c.stroke() }
    c.restore()
  }
  // the giant fist's downward swing: an arc smear
  if (L.phase === 'smash') {
    const a = L.arms[0]; if (a?.fist) { c.save(); c.globalAlpha = 0.45; c.fillStyle = '#ffffff'
      for (let j = 1; j <= 4; j++) { const p = layout(sc, Math.max(U.smash, k - j)).arms[0]; if (!p) continue; c.globalAlpha = 0.35 * (1 - j / 5); c.beginPath(); c.arc(p.x1, p.y1, p.fist * 0.95, 0, Math.PI * 2); c.fill() }
      c.restore() }
  }
}
function splash(c, sc) {
  const k = sc.k; if (k > 22) return
  const x0 = sc.tx0 - sc.d * 10, y0 = sc.ty0 - 20
  c.save()
  for (let i = 0; i < 22; i++) {
    const ang = Math.PI * (1.05 + 0.9 * hash(i, 77)), sp = 3 + 6 * hash(i, 78), x = x0 + Math.cos(ang) * sp * k, y = y0 + Math.sin(ang) * sp * k + 0.3 * k * k
    c.globalAlpha = Math.max(0, 1 - k / 22); c.fillStyle = i % 3 ? '#7fc8f8' : '#e8f6ff'; c.fillRect(Math.round(x), Math.round(y), 5, 5)
  }
  c.restore()
}
export function drawElastigirlUltWorld(c, f, suit = '#d8201c', glove = '#101010') {
  const sc = elastigirlUltScene()
  if (!sc || sc.caster !== f || !c) return false
  try { XF = c.getTransform() } catch (_) { XF = null }
  const L = layout(sc, sc.k)
  c.save()
  crater(c, sc)
  trails(c, sc, L)
  splash(c, sc)
  for (const a of L.anchors) { c.fillStyle = glove; c.beginPath(); c.ellipse(a.x, a.y - 3, 9, 4, 0, 0, Math.PI * 2); c.fill() }
  for (const a of L.arms) limb(c, a, suit, glove)
  rings(c, sc)
  c.restore()
  return true
}

// ── SCREEN PASS ─────────────────────────────────────────────────────────────────────────────────────────────────────
function focusLines(ctx, W, H, cx, cy, alpha, seed) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ffffff'
  const R = Math.hypot(W, H)
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2 + hash(seed, i) * 0.08, inner = (0.25 + 0.2 * hash(seed, i + 70)) * Math.min(W, H), wd = 0.004 + 0.01 * hash(seed, i + 140)
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
    ctx.lineTo(cx + Math.cos(a - wd) * R, cy + Math.sin(a - wd) * R); ctx.lineTo(cx + Math.cos(a + wd) * R, cy + Math.sin(a + wd) * R); ctx.closePath(); ctx.fill()
  }
  ctx.restore()
}
function title(ctx, W, H, k) {
  if (k > 58) return
  const inU = easeOut(seg(k, 2, 12)), outU = seg(k, 48, 58), S = H / 720
  const y = H * 0.30, bandH = 92 * S, slide = (1 - inU) * W * 1.1 - outU * W * 1.2
  ctx.save(); ctx.translate(slide, 0)
  // red band with a black under-stripe, tilted
  ctx.save(); ctx.translate(W / 2, y); ctx.rotate(-0.06)
  ctx.fillStyle = '#111'; ctx.fillRect(-W, -bandH / 2 + 10 * S, W * 2, bandH)
  const g = ctx.createLinearGradient(0, -bandH / 2, 0, bandH / 2); g.addColorStop(0, '#ff3b2f'); g.addColorStop(1, '#b3120c')
  ctx.fillStyle = g; ctx.fillRect(-W, -bandH / 2, W * 2, bandH * 0.86)
  ctx.fillStyle = '#ffb000'; ctx.fillRect(-W, bandH * 0.36, W * 2, 5 * S)
  // the "i" emblem
  const ex = -W * 0.30
  ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.arc(ex, -4 * S, 40 * S, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex, -4 * S, 33 * S, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffb000'; ctx.font = `900 ${48 * S}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('i', ex, -2 * S)
  // text
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.font = `italic 800 ${16 * S}px Arial, sans-serif`; ctx.fillStyle = '#ffe3a0'; ctx.fillText('ELASTIGIRL  ·  ULTIMATE', ex + 54 * S, -20 * S)
  ctx.font = `italic 900 ${54 * S}px Impact, 'Arial Black', sans-serif`; ctx.lineWidth = 6 * S; ctx.strokeStyle = '#111'
  ctx.strokeText('FAMILY RAFT', ex + 52 * S, 30 * S); ctx.fillStyle = '#ffffff'; ctx.fillText('FAMILY RAFT', ex + 52 * S, 30 * S)
  ctx.restore(); ctx.restore()
}
function caption(ctx, W, H, k) {
  if (k < U.caption || k > U.out + 6) return
  const S = H / 720, pop = k < U.caption + 6 ? 1.6 - 0.6 * easeOut(seg(k, U.caption, U.caption + 6)) : 1, a = 1 - seg(k, U.out - 4, U.out + 6)
  ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * 0.80); ctx.scale(pop, pop); ctx.rotate(-0.03)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `italic 900 ${42 * S}px Impact, 'Arial Black', sans-serif`
  ctx.lineWidth = 8 * S; ctx.strokeStyle = '#111'; ctx.strokeText('STRETCHED TO THE LIMIT!', 0, 0)
  const g = ctx.createLinearGradient(0, -22 * S, 0, 22 * S); g.addColorStop(0, '#fff6c8'); g.addColorStop(1, '#ff9a1a')
  ctx.fillStyle = g; ctx.fillText('STRETCHED TO THE LIMIT!', 0, 0)
  ctx.restore()
}
function hitCounter(ctx, W, H, sc) {
  if (!sc.hits) return
  const S = H / 720, last = sc.fx[sc.fx.length - 1], age = last ? sc.tick - last.tick : 99, pop = age < 6 ? 1.35 - 0.35 * age / 6 : 1
  ctx.save(); ctx.translate(W - 40 * S, H * 0.2); ctx.scale(pop, pop); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  ctx.font = `italic 900 ${46 * S}px Impact, 'Arial Black', sans-serif`; ctx.lineWidth = 6 * S; ctx.strokeStyle = '#111'
  const txt = `${sc.hits + 1} HITS`
  ctx.strokeText(txt, 0, 0); ctx.fillStyle = '#ffd23a'; ctx.fillText(txt, 0, 0)
  ctx.font = `italic 800 ${17 * S}px Arial, sans-serif`; ctx.lineWidth = 4 * S; const dmg = `${Math.max(0, Math.round((sc.hp0 || 0) - (sc.target?.health || 0)))} DAMAGE`
  ctx.strokeText(dmg, 0, 34 * S); ctx.fillStyle = '#fff'; ctx.fillText(dmg, 0, 34 * S)
  ctx.restore()
}
function drawScreen(ctx, canvas) {
  const sc = elastigirlUltScene()
  if (!sc) return false
  const W = canvas.width, H = canvas.height, k = sc.k, quiet = calm()
  const last = sc.fx[sc.fx.length - 1], age = last ? sc.tick - last.tick : 999, P = last?.power || 1
  const foe = toScreen(layout(sc, k).t.x, layout(sc, k).t.cy) || { x: W / 2, y: H / 2 }
  // CRASH ZOOM: the frame punches in around the contact, decaying over ~10 ticks
  if (!quiet && age < 12) {
    const z = 1 + 0.035 * P * (1 - age / 12) * (age < 2 ? 1.6 : 1)
    try { ctx.drawImage(canvas, foe.x - foe.x / z, foe.y - foe.y / z, W / z, H / z, 0, 0, W, H) } catch (_) {}
  }
  // dim + vignette while the fist charges / the slingshot draws
  const charge = Math.max(seg(k, U.inflate, U.smash - 2) * (k < U.land ? 1 : 0), seg(k, U.anchor, U.release) * (k < U.release ? 0.7 : 0))
  if (charge > 0) {
    const g = ctx.createRadialGradient(foe.x, foe.y, Math.min(W, H) * 0.15, W / 2, H / 2, Math.max(W, H) * 0.75)
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,0,0,${0.55 * charge})`)
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }
  // focus lines: the slingshot release, the kick and the smash
  if (!quiet && ((k >= U.release && k <= U.kick + 4) || (k >= U.smash && k <= U.land + 4))) focusLines(ctx, W, H, foe.x, foe.y, 0.35, sc.tick >> 1)
  // IMPACT FRAMES: a 2-tick inverted frame on the finisher, then white / orange flashes on every contact
  if (last && age < 14) {
    if (!quiet && last.i === 3 && age < 3) { ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.restore() }
    const peak = (quiet ? 0.18 : last.i === 3 ? 0.85 : 0.45), a = peak * Math.pow(1 - age / 14, 2)
    if (!(last.i === 3 && age < 3 && !quiet)) { ctx.fillStyle = last.i === 3 && age > 4 ? `rgba(255,170,60,${a})` : `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, W, H) }
  }
  // letterbox
  const tin = easeOut(seg(sc.tick, 0, 12)), tout = seg(k, U.out, U.total), bar = H * 0.11 * tin * (1 - tout)
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bar); ctx.fillRect(0, H - bar, W, bar)
  title(ctx, W, H, k)
  hitCounter(ctx, W, H, sc)
  caption(ctx, W, H, k)
  return true
}
registerCineScreen('elastigirl', drawScreen)
