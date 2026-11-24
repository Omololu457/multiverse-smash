// vegetaDarkUltFx.js — RENDER half of vegetaDarkUlt.js (Dark Vegeta's VILLAINOUS ONSLAUGHT cinematic). Reads
// vegetaDarkUltScene(); never writes sim state. One screen-space pass (cineRegistry.registerCineScreen):
//   1. the finished world frame re-drawn scaled about the subject (push-in / punch-zoom) and drained to a cold violet;
//   2. a WORLD layer (camera matrix × push-in): the black aura, Dark Vegeta from his own (skinned) sheets with black
//      after-images on every blink, violet impact bursts, the launch shock, the Big Bang star, its flight and detonation;
//   3. the SCREEN layer: the face close-up with the Majin M burning in, impact frames, call-outs, subtitles, damage,
//      letterbox + title cut-in. Returns true while active (hides the HUD).
// Render-only noise = integer hash of the scene's frame counters. Drawing kit shared with vegetaUltFx.js.
import { registerCineScreen } from './cineRegistry.js'
import { vegetaDarkUltScene, VD_CINE, vdPose, vdLift } from './vegetaDarkUlt.js'
import { image, ready, hash, clamp, ease, easeO, seg, blitAnim, worldXf, pushIn, card, letterbox, impactFrame, speedLines, vignette,
  titleCut, subtitle, drawPops, mat, bolt, glow, preloadAnim } from './vegetaUltFx.js'

const view = { z: 1, x: 0, y: 0, last: -1 }
const PORTRAIT = './vegeta_dark_portrait.png'
// portrait-space landmarks (173 × 288 bust): the forehead M straddles the widow's peak, the two eyes
const M_PTS = [[64, 113], [69, 97], [80, 109], [91, 97], [96, 113]]
const EYES = [[62, 122], [98, 121]]
if (typeof Image !== 'undefined') image(PORTRAIT)

function draw(ctx, canvas) {
  const sc = vegetaDarkUltScene()
  if (!sc) { view.last = -1; return false }
  const V = VD_CINE, T = V.total
  if (sc.k < V.close0) { preloadAnim(sc.caster, ['vdAura', 'vegetaDarkRush1', 'vegetaDarkRush2', 'vegetaDarkRush3', 'light', 'heavy', 'vdKiCast', 'idleCross', 'idle']); image(sc.caster.portrait || PORTRAIT) }
  const W = canvas.width, H = canvas.height, u = H / 720
  const f = sc.caster, t = sc.target, k = sc.k, real = sc.real, d = sc.d
  const XF = worldXf(canvas)
  const sp = (x, y) => XF.transformPoint({ x, y })
  const fx = (f.x || 0) + (f.w || 48) / 2, ff = (f.y || 0) + (f.h || 94)
  const tx = (t.x || 0) + (t.w || 48) / 2, tcy = (t.y || 0) + (t.h || 94) * 0.45
  const lastAge = sc.last ? real - sc.last.real : 99, lastPow = sc.last?.power || 0
  // ── 1. push-in ──
  let Z = 1, foc = sp(fx, ff - 70)
  if (k < V.close1) { Z = 1.1 + 0.3 * ease(k / V.close1); foc = sp(fx, ff - 75) }
  else if (k < V.launch) { Z = 1.45; foc = sp(tx, tcy) }
  else if (k < V.set) { Z = 1.45 - 0.4 * easeO(seg(k, V.launch, V.set)); foc = sp((fx + tx) / 2, (ff - 70 + tcy) / 2) }
  else if (k < V.fire) { Z = 1.05 + 0.35 * ease(seg(k, V.set, V.fire)); foc = sp(fx + d * 20, ff - 80) }
  else if (k < V.after) { Z = 1.05; foc = sp(tx, tcy + 30) }
  else { Z = 1.2 + 0.2 * ease(seg(k, V.after, T)); foc = sp(fx, ff - 74) }
  if (lastAge >= 0 && lastAge < 6) Z += 0.28 * lastPow * (1 - lastAge / 6)
  const drain = ease(k / 14) * (k >= V.land && k < V.land + 20 ? 0.3 : 1)
  const grade = `saturate(${1 - 0.7 * drain}) brightness(${1 - 0.35 * drain}) hue-rotate(${-20 * drain}deg)`
  if (view.last < 0) { view.z = Z; view.x = foc.x; view.y = foc.y } else { view.z += (Z - view.z) * 0.3; view.x += (foc.x - view.x) * 0.24; view.y += (foc.y - view.y) * 0.24 }
  view.last = real
  const P = pushIn(ctx, canvas, view.z, view.x, view.y, grade)
  const M = P.multiply(XF)
  const S = (x, y) => M.transformPoint({ x, y })
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(150,90,210,${0.45 * drain})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'
  vignette(ctx, W, H, 'rgba(20,0,30,0.05)', `rgba(8,0,14,${0.8 * drain})`); ctx.restore()
  // ── 2. world layer ──
  ctx.save(); mat(ctx, M)
  world(ctx, sc, f, t, fx, ff, tx, tcy, k, real, d)
  ctx.restore()
  // ── 3. screen layer ──
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
  screen(ctx, W, H, u, sc, S, f, t, fx, ff, tx, tcy, k, real, d)
  const bar = letterbox(ctx, W, H, k, T, '#b06aff', u)
  titleCut(ctx, W, H, k, V.title, u, { band: 'rgba(14,0,22,0.94)', accent: '#b06aff', streak: 'rgba(210,160,255,0.4)', portrait: f.portrait || PORTRAIT,
    title: 'VILLAINOUS ONSLAUGHT', sub: 'THE DARK PRINCE', stroke: '#2a0040', size: 58 })
  drawPops(ctx, M, sc.pops, real, u, '#e6c8ff')
  if (k >= T - 56 && sc.dealt > 0) card(ctx, `${Math.round(sc.dealt)} DMG${sc.guarded ? ' (GUARDED)' : ''}`, W * 0.84, bar + 40 * u, 28 * u, '#ffffff', clamp((k - T + 56) / 8, 0, 1) * clamp((T - k) / 10, 0, 1), -0.04, '#000000')
  subs(ctx, W, H, bar, u, k)
  ctx.restore()
  return true
}

// the black aura: dark tongues (drawn solid) with a violet rim (additive) and red-violet sparks
function darkAura(c, x, feetY, k, real, a, big = 1) {
  if (a <= 0.01) return
  const n = 18
  const tongues = (sc, fill) => {
    for (let i = 0; i < n; i++) {
      const hx = (i / (n - 1) - 0.5) * 2, bx = x + hx * 40 * sc, base = feetY + 4
      const top = feetY - (80 + 70 * (1 - Math.abs(hx)) + 40 * hash(i, real >> 2)) * sc, wdt = (10 + 8 * hash(i + 5, 2)) * sc
      c.beginPath(); c.moveTo(bx - wdt, base); c.quadraticCurveTo(bx - wdt * 0.5, (base + top) / 2, bx + Math.sin(real * 0.25 + i * 2) * 9 * sc, top)
      c.quadraticCurveTo(bx + wdt * 0.5, (base + top) / 2, bx + wdt, base); c.closePath(); c.fillStyle = fill; c.fill()
    }
  }
  c.save()
  const lg = c.createLinearGradient(0, feetY + 6, 0, feetY - 220 * big); lg.addColorStop(0, 'rgba(6,0,10,0)'); lg.addColorStop(0.12, 'rgba(10,0,18,0.8)'); lg.addColorStop(0.7, 'rgba(14,0,24,0.6)'); lg.addColorStop(1, 'rgba(14,0,24,0)')
  c.globalAlpha = a; tongues(1.25 * big, lg)
  c.globalCompositeOperation = 'lighter'
  const lv = c.createLinearGradient(0, feetY + 6, 0, feetY - 200 * big); lv.addColorStop(0, 'rgba(150,50,255,0)'); lv.addColorStop(0.15, 'rgba(150,50,255,0.35)'); lv.addColorStop(1, 'rgba(150,50,255,0)')
  tongues(0.95 * big, lv)
  for (let i = 0; i < 5; i++) { const h1 = hash(i, real >> 1); if (h1 < 0.4) continue; const sx = x + (hash(i + 3, real >> 1) - 0.5) * 90 * big, sy = feetY - 30 - hash(i + 6, real >> 1) * 150 * big
    bolt(c, sx, sy, sx + (hash(i + 9, real) - 0.5) * 60, sy - 30 - 30 * h1, real * 3 + i, 5, 6, i & 1 ? '#ff3a7a' : '#c080ff', 1.6, a) }
  c.restore()
}

function world(c, sc, f, t, fx, ff, tx, tcy, k, real, d) {
  const V = VD_CINE
  const Pz = vdPose(k)
  // aura: swelling through the title and close-up, a black flicker on him all through the onslaught, full again for the Big Bang
  const aA = k < V.vanish ? ease(k / 30) : k < V.launch + 6 ? 0.35 : k < V.set ? 0.2 : k < V.after ? 0.9 : 0.4 + 0.1 * Math.sin(k / 7)
  if (Pz.key) darkAura(c, fx, ff, k, real, aA, k >= V.set && k < V.land ? 1.25 : 1)
  // after-images on every blink (vanish → appear, each side swap, the blink back to fire)
  const blinks = [[V.vanish, sc.fx0 + (f.w || 48) / 2]]
  V.hits.forEach((at, i) => { if (i && V.side[i] !== V.side[i - 1]) blinks.push([V.hits[i - 1] + 3, null]) })
  blinks.push([V.blink, null])
  for (const [b0] of blinks) { const e = k - b0; if (e >= -2 && e < 10) {
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 10; i++) { const h1 = hash(i, b0), h2 = hash(i + 4, b0); c.globalAlpha = 0.8 * (1 - e / 10); c.strokeStyle = i & 1 ? '#b06aff' : '#ffffff'; c.lineWidth = 2
      const y = ff - 20 - h1 * 110; c.beginPath(); c.moveTo(fx - 120 * h2, y); c.lineTo(fx + 120 * (1 - h2), y); c.stroke() }
    c.restore() } }
  // ── Dark Vegeta ──
  if (Pz.key) {
    // a black ghost one step behind while he moves through the combo
    if (k >= V.appear && k < V.launch + 6) { const Pb = vdPose(k - 3); if (Pb.key && Math.abs(Pb.x - Pz.x) > 4) blitAnim(c, f, Pb.key, Pb.fi, Pb.x, ff, Pb.dir, { alpha: 0.45, tint: '#2a0040', tintA: 0.85 }) }
    const g = blitAnim(c, f, Pz.key, Pz.fi, fx, ff, Pz.dir, { loop: Pz.key === 'vdAura' || Pz.key === 'idleCross' }) || blitAnim(c, f, 'idle', 0, fx, ff, Pz.dir)
    // the M glows on his brow whenever the camera is close enough to read it
    if (g && k >= V.burn1 && (k < V.vanish || k >= V.after)) { const hy = g.top + g.height * 0.12, hx = fx + Pz.dir * 3
      c.save(); c.globalCompositeOperation = 'lighter'; glow(c, hx, hy, 14, 'rgba(255,80,140,0.9)', 'rgba(190,40,255,0.4)', 0.7 + 0.3 * Math.sin(real / 4)); c.restore() }
    // the Big Bang star in his palm
    if (g && k >= V.set && k < V.fire + 2) {
      const px = g.front - Pz.dir * 2, py = g.top + g.height * 0.3, gr = ease(seg(k, V.set, V.fire)), r = (8 + 30 * gr) * (1 + 0.1 * Math.sin(real * 1.4))
      bigBall(c, px, py, r, real, 1)
      // light pulled in
      c.save(); c.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 14; i++) { const h1 = hash(i, 51), ph = (real * (0.03 + 0.02 * h1) + h1) % 1, an = h1 * Math.PI * 2, R0 = 240 * (1 - ph)
        c.globalAlpha = 0.7 * ph * gr; c.strokeStyle = i & 1 ? '#e0b0ff' : '#ff5a9a'; c.lineWidth = 2; c.beginPath(); c.moveTo(px + Math.cos(an) * R0, py + Math.sin(an) * R0); c.lineTo(px + Math.cos(an) * (R0 + 36), py + Math.sin(an) * (R0 + 36)); c.stroke() }
      c.restore()
    }
  }
  // ── impact bursts on the blows ──
  const L = sc.last
  if (L && (L.tag === 'hit' || L.tag === 'launch')) {
    const e = real - L.real
    if (e >= 0 && e < 14) {
      const ix = tx - d * 6, iy = L.tag === 'launch' ? tcy + 20 : tcy
      c.save(); c.globalCompositeOperation = 'lighter'
      glow(c, ix, iy, 70 * L.power * (1 + e / 10), 'rgba(255,255,255,0.95)', 'rgba(170,60,255,0.7)', 1 - e / 14)
      for (let i = 0; i < 10; i++) { const an = hash(i, L.real) * Math.PI * 2, l = (30 + 60 * hash(i + 2, L.real)) * L.power * (0.6 + e / 10)
        c.globalAlpha = 1 - e / 14; c.strokeStyle = i & 1 ? '#ffffff' : '#c070ff'; c.lineWidth = 3; c.beginPath(); c.moveTo(ix + Math.cos(an) * l * 0.3, iy + Math.sin(an) * l * 0.3); c.lineTo(ix + Math.cos(an) * l, iy + Math.sin(an) * l); c.stroke() }
      c.globalAlpha = 0.8 * (1 - e / 14); c.strokeStyle = '#d8a0ff'; c.lineWidth = 4; c.beginPath(); c.ellipse(ix, iy, 20 + e * 8 * L.power, (20 + e * 8 * L.power) * 0.6, 0, 0, Math.PI * 2); c.stroke()
      c.restore()
    }
  }
  // the launch: a vertical shock column under them
  if (k >= V.launch && k < V.launch + 24) { const e = k - V.launch
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.7 * (1 - e / 24)
    const lg = c.createLinearGradient(tx - 30, 0, tx + 30, 0); lg.addColorStop(0, 'rgba(160,60,255,0)'); lg.addColorStop(0.5, 'rgba(230,200,255,0.9)'); lg.addColorStop(1, 'rgba(160,60,255,0)')
    c.fillStyle = lg; c.fillRect(tx - 30, tcy - 260, 60, ff - tcy + 260); c.restore() }
  // ── the Big Bang in flight, then the sky detonates ──
  if (k >= V.fire && k < V.land) {
    const g0 = { x: fx + d * 50, y: ff - 92 }, u2 = easeO(seg(k, V.fire, V.land)), bx = g0.x + (tx - g0.x) * u2, by = g0.y + (tcy - g0.y) * u2
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5
    const lg = c.createLinearGradient(g0.x, g0.y, bx, by); lg.addColorStop(0, 'rgba(150,60,255,0)'); lg.addColorStop(1, 'rgba(230,170,255,0.8)')
    c.strokeStyle = lg; c.lineWidth = 34; c.beginPath(); c.moveTo(g0.x, g0.y); c.lineTo(bx, by); c.stroke(); c.restore()
    bigBall(c, bx, by, 40, real, 1)
  }
  const e = k - V.land
  if (e >= 0 && e < 100) {
    const bx = tx, by = (sc.target.y || 0) + (sc.target.h || 94) * 0.45 + vdLift(k) * 0 , R = 40 + 360 * easeO(e / 18), a = e < 26 ? 1 : 1 - seg(e, 26, 100)
    const cy = c0y(sc, k)
    c.save(); c.globalCompositeOperation = 'lighter'
    const gr = c.createRadialGradient(bx, cy, 0, bx, cy, R); gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(0.3, `rgba(240,200,255,${0.95 * a})`); gr.addColorStop(0.65, `rgba(150,50,255,${0.7 * a})`); gr.addColorStop(1, 'rgba(80,0,160,0)')
    c.fillStyle = gr; c.fillRect(bx - R, cy - R, R * 2, R * 2)
    for (let r = 0; r < 4; r++) { const rr = (e - r * 5) * 26; if (rr <= 0) continue; c.globalAlpha = 0.85 * (1 - e / 60); c.strokeStyle = r & 1 ? '#ff4a9a' : '#ffffff'; c.lineWidth = 10 - r * 2; c.beginPath(); c.arc(bx, cy, rr, 0, Math.PI * 2); c.stroke() }
    // rays
    c.globalAlpha = 0.7 * (1 - seg(e, 4, 40)); c.fillStyle = '#f0d8ff'
    for (let i = 0; i < 14; i++) { const an = (i / 14) * Math.PI * 2 + hash(i, 9) * 0.3, l = R * (1.3 + 0.9 * hash(i, 13)); c.beginPath(); c.moveTo(bx + Math.cos(an - 0.04) * R * 0.3, cy + Math.sin(an - 0.04) * R * 0.3); c.lineTo(bx + Math.cos(an) * l, cy + Math.sin(an) * l); c.lineTo(bx + Math.cos(an + 0.04) * R * 0.3, cy + Math.sin(an + 0.04) * R * 0.3); c.fill() }
    c.restore()
    // black smoke rolling off afterwards
    if (e > 18) { c.save(); for (let i = 0; i < 8; i++) { const h1 = hash(i, 401), h2 = hash(i, 409), px = bx + (h1 - 0.5) * 300, py = cy + (h2 - 0.5) * 160 - (e - 18) * 0.5
      const g2 = c.createRadialGradient(px, py, 0, px, py, 60 + 40 * h1); const al = 0.2 * seg(e, 18, 30) * (1 - seg(e, 50, 90)); g2.addColorStop(0, `rgba(30,8,44,${al})`); g2.addColorStop(1, 'rgba(30,8,44,0)'); c.fillStyle = g2; c.fillRect(px - 100, py - 100, 200, 200) } c.restore() }
  }
}
// the detonation's centre: where the foe hung when it landed
function c0y(sc, k) { const t = sc.target; return (sc.tFloor || 0) - (t.h || 94) * 0.55 - VD_CINE.apex }

function bigBall(c, x, y, r, real, a) {
  c.save(); c.globalCompositeOperation = 'lighter'
  glow(c, x, y, r * 3.2, 'rgba(230,190,255,0.9)', 'rgba(140,40,255,0.6)', a)
  glow(c, x, y, r * 1.1, 'rgba(255,255,255,1)', 'rgba(240,220,255,0.95)', a)
  for (let j = 0; j < 5; j++) { const an = hash(j, real >> 1) * Math.PI * 2, L = r * (1.6 + 1.4 * hash(j + 3, real >> 1)); bolt(c, x, y, x + Math.cos(an) * L, y + Math.sin(an) * L, real * 7 + j, 5, 5, j & 1 ? '#ff5a9a' : '#e0b0ff', 1.8, a) }
  c.restore()
}

// the close-up: his face fills a band across the screen; the M burns in stroke by stroke; the eyes glint
function closeUp(c, W, H, u, f, k, real) {
  const V = VD_CINE
  const a = seg(k, V.close0, V.close0 + 6) * (1 - seg(k, V.close1 - 6, V.close1))
  if (a <= 0) return
  const im = image(f.portrait || PORTRAIT), ok = ready(im) ? im : image(PORTRAIT)
  if (!ready(ok)) return
  const y0 = H * 0.17, bh = H * 0.66, slide = easeO(seg(k, V.close0, V.close0 + 8))
  c.save(); c.globalAlpha = a
  c.beginPath(); c.rect(0, y0, W, bh); c.clip()
  // background: violet void with streaks flowing past
  const bg = c.createLinearGradient(0, y0, 0, y0 + bh); bg.addColorStop(0, '#0a0012'); bg.addColorStop(0.5, '#22003a'); bg.addColorStop(1, '#0a0012'); c.fillStyle = bg; c.fillRect(0, y0, W, bh)
  for (let i = 0; i < 22; i++) { const h1 = hash(i, 61), sx = W - ((real * (14 + 20 * h1) + h1 * W * 2) % (W * 1.4)), sy = y0 + hash(i, 67) * bh
    c.fillStyle = i & 1 ? 'rgba(190,110,255,0.35)' : 'rgba(255,60,140,0.25)'; c.fillRect(sx, sy, 140 + 160 * h1, 2 * u) }
  // the bust, scaled so the face fills the band, drifting closer
  const z = 1 + 0.12 * seg(k, V.close0, V.close1), s = (bh * 2.1 / 288) * z
  const fxp = 80, fyp = 112                                            // the face centre in portrait pixels
  const cx = W * 0.5 + (1 - slide) * W * 0.4, cy = y0 + bh * 0.5
  const ox = cx - fxp * s, oy = cy - fyp * s
  c.imageSmoothingEnabled = false
  c.drawImage(ok, ox, oy, ok.naturalWidth * s * (173 / ok.naturalWidth), ok.naturalHeight * s * (288 / ok.naturalHeight))
  const P = (p) => [ox + p[0] * s, oy + p[1] * s]
  // dark veins crawling over the face as it burns
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(120,60,170,${0.35 * seg(k, V.burn0, V.burn1)})`; c.fillRect(0, y0, W, bh); c.restore()
  // the M, stroke by stroke
  const prog = seg(k, V.burn0, V.burn1) * (M_PTS.length - 1)
  if (prog > 0) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'miter'
    const pulse = k >= V.burn1 ? 0.75 + 0.25 * Math.sin(real / 3) : 1
    for (const [wdt, col, blur] of [[5.2, 'rgba(160,30,255,0.7)', 22], [3, 'rgba(255,60,130,0.95)', 12], [1.2, 'rgba(255,235,245,1)', 4]]) {
      c.strokeStyle = col; c.lineWidth = wdt * s; c.shadowColor = '#ff2a7a'; c.shadowBlur = blur * u * pulse
      c.beginPath(); const p0 = P(M_PTS[0]); c.moveTo(p0[0], p0[1])
      for (let i = 1; i < M_PTS.length; i++) { const fr = clamp(prog - (i - 1), 0, 1); if (fr <= 0) break
        const a0 = M_PTS[i - 1], b0 = M_PTS[i], p = P([a0[0] + (b0[0] - a0[0]) * fr, a0[1] + (b0[1] - a0[1]) * fr]); c.lineTo(p[0], p[1]) }
      c.stroke()
    }
    // sparks off the burning tip
    if (k < V.burn1) { const i = Math.min(M_PTS.length - 2, Math.floor(prog)), fr = prog - i, a0 = M_PTS[i], b0 = M_PTS[i + 1], tip = P([a0[0] + (b0[0] - a0[0]) * fr, a0[1] + (b0[1] - a0[1]) * fr])
      glow(c, tip[0], tip[1], 30 * u, 'rgba(255,255,255,1)', 'rgba(255,60,140,0.7)')
      for (let j = 0; j < 6; j++) { const an = hash(j, real) * Math.PI * 2, l = (14 + 30 * hash(j + 2, real)) * u; c.strokeStyle = '#ffd0e0'; c.lineWidth = 2 * u; c.shadowBlur = 0; c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(tip[0] + Math.cos(an) * l, tip[1] + Math.sin(an) * l); c.stroke() } }
    c.restore()
  }
  // the glint
  if (k >= V.glint) { const e = k - V.glint, ga = e < 3 ? e / 3 : 1 - seg(e, 3, 12)
    c.save(); c.globalCompositeOperation = 'lighter'
    for (const p of EYES) { const [ex, ey] = P(p); glow(c, ex, ey, 40 * u, 'rgba(255,255,255,1)', 'rgba(255,40,120,0.6)', ga)
      c.globalAlpha = ga; c.fillStyle = '#ffffff'; c.fillRect(ex - 60 * u, ey - 1.5 * u, 120 * u, 3 * u); c.fillRect(ex - 1.5 * u, ey - 30 * u, 3 * u, 60 * u) }
    c.restore() }
  c.restore()
  // band edges
  c.save(); c.globalAlpha = a; c.fillStyle = '#b06aff'; c.fillRect(0, y0 - 3 * u, W, 3 * u); c.fillRect(0, y0 + bh, W, 3 * u); c.restore()
  if (k >= V.burn1 + 2) card(c, 'M A J I N', W * 0.8, y0 + bh * 0.82, 40 * u, '#ff6aa8', a * seg(k, V.burn1 + 2, V.burn1 + 8), -0.04, '#2a0030')
}

function screen(c, W, H, u, sc, S, f, t, fx, ff, tx, tcy, k, real, d) {
  const V = VD_CINE
  closeUp(c, W, H, u, f, k, real)
  if (k >= V.burn1 && k < V.burn1 + 3) { c.globalAlpha = 0.5; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
  // the blows: an impact frame on each, violet speed lines, the count
  const L = sc.last
  if (L && (L.tag === 'hit' || L.tag === 'launch')) {
    const e = real - L.real, p = S(tx, tcy)
    if (e < 10) speedLines(c, W, H, p.x, p.y, 0.35 * (1 - e / 10) * L.power, L.real, 44, '#e8c8ff')
    if (L.tag === 'launch') impactFrame(c, W, H, e, 2, '#6a10b0', 0.4)
    else if (e === 0) { c.globalAlpha = 0.35; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
  }
  const nHit = sc.hits | 0
  if (k >= V.hits[0] && k < V.launch + 30 && nHit > 0) card(c, `${Math.min(nHit, 7)} HIT${nHit > 1 ? 'S' : ''}`, W * (d > 0 ? 0.18 : 0.82), H * 0.3, (38 + nHit * 3) * u, '#e6c8ff', clamp((V.launch + 30 - k) / 8, 0, 1), -0.08, '#2a0040')
  if (k >= V.launch + 4 && k < V.set + 6) card(c, 'NOWHERE TO RUN.', W / 2, H * 0.26, 46 * u, '#ffffff', seg(k, V.launch + 4, V.launch + 10) * (1 - seg(k, V.set, V.set + 6)), -0.04, '#3a0050')
  // the charge
  if (k >= V.set && k < V.fire) { const p = S(fx + d * 40, ff - 92); speedLines(c, W, H, p.x, p.y, 0.15 + 0.25 * seg(k, V.set, V.fire), real >> 1, 56, '#d8a8ff') }
  if (k >= V.fire) { const e = sc.real - (sc.fireReal ?? 1e9)
    if (e >= 0 && e < 3) { c.globalAlpha = 0.6; c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
    if (e >= 0 && k < V.land + 40) card(c, 'BIG BANG ATTACK!!', W / 2, H * 0.24, 92 * u * (e < 6 ? 1.8 - 0.8 * easeO(e / 6) : 1), '#ffffff', clamp((V.land + 40 - k) / 8, 0, 1), -0.05, '#4a0070') }
  if (L?.tag === 'bigbang') { const e = real - L.real; impactFrame(c, W, H, e, 3, '#8a20ff', 0.5); if (e >= 3 && e < 60) { const p = S(tx, c0yS(sc)); speedLines(c, W, H, p.x, p.y, 0.4 * (1 - e / 60), 77, 60, '#f0d8ff') } }
  if (k >= V.fold + 6) card(c, 'PATHETIC.', W / 2, H * 0.26, 60 * u, '#f0e0ff', seg(k, V.fold + 6, V.fold + 12) * clamp((V.total - k) / 10, 0, 1), -0.04, '#2a0040')
}
const c0yS = sc => (sc.tFloor || 0) - (sc.target.h || 94) * 0.55 - VD_CINE.apex
function subs(c, W, H, bar, u, k) {
  const V = VD_CINE
  const line = (a, b, s) => { if (k >= a && k < b) subtitle(c, W, H, bar, s, seg(k, a, a + 6) * (1 - seg(k, b - 6, b)), u) }
  line(6, V.close0, '“Kindness made me weak. I’ve cast it off.”')
  line(V.voice.at, V.vanish + 10, '“I hope you’re ready…”')
  line(V.blink + 4, V.fire, '“Now — disappear!”')
  line(V.fold + 14, V.total - 2, '“A prince answers to no one.”')
}

registerCineScreen('vegeta_dark_ult', draw)
