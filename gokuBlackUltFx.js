// gokuBlackUltFx.js — RENDER half of gokuBlackUlt.js (Goku Black's DIVINE LACERATION). Reads gokuBlackUltScene(); never
// writes sim state. One screen-space pass (cineRegistry.registerCineScreen — after the world, before the HUD):
//   1. the finished world frame RE-DRAWN scaled about the subject (real push-ins / punch-zooms past camera.js's cap),
//      graded rosé (desaturated + magenta), darkening to near-black for the scythe;
//   2. a WORLD layer with the camera matrix × the push-in: the rosé aura, Black himself from his Rosé sheets (his engine
//      sprite is hidden by _fxAlpha 0), the ki-blade, afterimages, the lacerations left glowing on the foe, the scythe;
//   3. the SCREEN layer: falling rose petals, full-frame slash flashes, the reap's split frame, impact frames, captions,
//      damage, letterbox + title cut-in. Returns true while active (hides the HUD).
// Render-only noise = integer hash of the scene's frame counters. Drawing kit shared with lightUltFx.js (read-only import).
import { registerCineScreen } from './cineRegistry.js'
import { image, ready, hash, clamp, ease, easeO, seg, blitAnim, worldXf, pushIn, scratchOf, card, letterbox, impactFrame,
  speedLines, vignette, titleCut, subtitle, drawPops, mat } from './lightUltFx.js'
import { gokuBlackUltScene, GOKU_BLACK_CINE as G, blackPose } from './gokuBlackUlt.js'

const ROSE = '#ff5db1', ROSE_HI = '#ffc2e4', VIOLET = '#b04dff'
const view = { z: 1, x: 0, y: 0, last: -1 }
if (typeof Image !== 'undefined') for (const u of ['./goku_black_ssj_rose_sword_slahs_Special.png', './goku_black_ssj_rose_super_ki_slash.png', './goku_black_ssj_rose_charge_uniform.png', './goku_black_ssj_rose_idle_2.png', './goku_black_mug_shot.png']) image(u)

function draw(ctx, canvas) {
  const sc = gokuBlackUltScene()
  if (!sc) { view.last = -1; return false }
  const W = canvas.width, H = canvas.height, u = H / 720
  const f = sc.caster, t = sc.target, k = sc.k, real = sc.real, d = sc.d, T = G.total
  const XF = worldXf(canvas), sp = (x, y) => XF.transformPoint({ x, y })
  const pose = blackPose(k)
  const tx = (t.x || 0) + (t.w || 48) / 2, tcy = (t.y || 0) + (t.h || 94) * 0.45
  const lastAge = sc.last ? real - sc.last.real : 99, lastPow = sc.last?.power || 0
  // ── 1. push-in ──
  let Z = 1, foc = sp(pose.x, pose.y - 60)
  if (k < G.title) { Z = 1.05 + 0.15 * ease(k / G.title) }
  else if (k < G.blade1) { Z = 1.2 + 0.4 * ease(seg(k, G.title, G.blade0 + 24)); foc = sp(pose.x + d * 26, pose.y - 64) }
  else if (k < G.rise) { Z = 1.35 + 0.1 * Math.sin((k - G.blade1) / 9); foc = sp(tx, tcy) }
  else if (k < G.reap) { Z = 1.3 - 0.3 * ease(seg(k, G.rise, G.scythe + 8)) + 0.3 * ease(seg(k, G.suck + 6, G.reap)); foc = sp((tx + pose.x) / 2, sc.tFloor - 215 + 110 * ease(seg(k, G.suck + 6, G.reap))) }
  else if (k < G.land) { Z = 1.55 - 0.45 * easeO(seg(k, G.reap, G.reap + 24)); foc = sp(tx, tcy) }
  else { Z = 1.1 + 0.1 * ease(seg(k, G.land, T - 20)); foc = sp((pose.x + tx) / 2, pose.y - 60) }
  if (lastAge >= 0 && lastAge < 6) Z += 0.2 * lastPow * (1 - lastAge / 6)
  if (view.last < 0) { view.z = Z; view.x = foc.x; view.y = foc.y } else { view.z += (Z - view.z) * 0.25; view.x += (foc.x - view.x) * 0.22; view.y += (foc.y - view.y) * 0.22 }
  view.last = real
  const dark = seg(k, G.rise, G.scythe + 10) * (1 - seg(k, G.reap + 20, G.land))
  const g0 = ease(k / 14)
  const grade = `saturate(${1 - 0.55 * g0}) brightness(${1 - 0.2 * g0 - 0.45 * dark}) contrast(${1 + 0.15 * g0})`
  const P = pushIn(ctx, canvas, view.z, view.x, view.y, grade)
  const M = P.multiply(XF), S = (x, y) => M.transformPoint({ x, y })
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(255,120,190,${0.45 * g0})`; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'
  vignette(ctx, W, H, 'rgba(40,0,24,0.05)', `rgba(14,0,10,${0.7 + 0.25 * dark})`)
  ctx.restore()
  // ── 2. world ──
  ctx.save(); mat(ctx, M); world(ctx, sc, f, t, tx, tcy, k, real, d, pose); ctx.restore()
  // ── 3. screen ──
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)
  screen(ctx, W, H, u, sc, S, t, tx, tcy, k, real, canvas)
  const bar = letterbox(ctx, W, H, k, T, ROSE, u)
  titleCut(ctx, W, H, k, G.title, u, { band: 'rgba(20,2,14,0.93)', accent: ROSE, streak: 'rgba(255,170,215,0.45)', portrait: './goku_black_mug_shot.png', title: 'DIVINE LACERATION', sub: 'SUPER SAIYAN ROSÉ · ZERO MORTALS', stroke: '#4a0430' })
  drawPops(ctx, M, sc.pops, real, u, ROSE_HI)
  if (k >= T - 54 && sc.dealt > 0) card(ctx, `${Math.round(sc.dealt)} DMG${sc.guarded ? ' (GUARDED)' : ''}`, W * 0.84, bar + 40 * u, 28 * u, '#ffffff', clamp((k - T + 54) / 8, 0, 1) * clamp((T - k) / 10, 0, 1), -0.04, '#000000')
  subs(ctx, W, H, bar, u, k)
  ctx.restore()
  return true
}

// a layered energy stroke (glow → colour → white core), world space
function energyLine(c, pts, w, a, col = ROSE) {
  if (a <= 0.01 || pts.length < 2) return
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round'
  for (const [lw, aa, cc] of [[w * 3.2, 0.25, col], [w * 1.6, 0.55, col], [w * 0.6, 0.95, ROSE_HI], [w * 0.25, 1, '#ffffff']]) {
    c.globalAlpha = a * aa; c.strokeStyle = cc; c.lineWidth = lw; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke()
  }
  c.restore()
}
function glow(c, x, y, r, a, col = '255,93,177') {
  if (a <= 0.01) return
  c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.3, `rgba(${col},${a * 0.7})`); g.addColorStop(1, `rgba(${col},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore()
}
// a crescent of energy (the cut / the reap), world space; sweep 0..1 draws it on
function crescent(c, x, y, R, rot, sweep, w, a, col = ROSE) {
  if (a <= 0.01 || sweep <= 0) return
  c.save(); c.translate(x, y); c.rotate(rot); c.globalCompositeOperation = 'lighter'
  const a0 = -1.25, a1 = a0 + 2.5 * clamp(sweep, 0, 1)
  for (const [lw, aa, cc] of [[w * 2.8, 0.3, col], [w, 0.85, col], [w * 0.4, 1, '#ffffff']]) { c.globalAlpha = a * aa; c.strokeStyle = cc; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.arc(0, 0, R, a0, a1); c.stroke() }
  // the crescent's inner blade (filled sliver)
  c.globalAlpha = a * 0.55; c.fillStyle = col; c.beginPath(); c.arc(0, 0, R + w * 0.6, a0, a1); c.arc(R * 0.18, 0, R * 0.86, a1, a0, true); c.closePath(); c.fill()
  c.restore()
}

const SWORD = 'gbSwordSlash', XSLASH = 'gbSuperKiSlash'
function black(c, f, key, fi, x, y, dir, o = {}) { return blitAnim(c, f, key, fi, x, y, dir, { ax: key === SWORD ? 0.49 : undefined, ...o }) }

function world(c, sc, f, t, tx, tcy, k, real, d, pose) {
  // rosé aura column behind him while the power rises
  const auraA = (k < G.blade1 ? seg(k, 4, 16) : 0) + (k >= G.rise && k < G.reap + 6 ? seg(k, G.rise, G.scythe) : 0)
  if (auraA > 0 && pose.vis) {
    const ax = pose.x, ay = pose.y
    glow(c, ax, ay - 60, 130 + 20 * Math.sin(real / 4), 0.35 * auraA)
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 26; i++) { const h1 = hash(i, 3), life = (real * (1.4 + h1) + i * 13) % 40, px = ax + (h1 - 0.5) * 90 + Math.sin((real + i * 7) / 6) * 6, py = ay - life * 4.2
      c.globalAlpha = auraA * 0.8 * (1 - life / 40); c.fillStyle = i % 3 ? ROSE : '#ffffff'; c.beginPath(); c.ellipse(px, py, 3, 12 + 10 * h1, 0, 0, Math.PI * 2); c.fill() }
    c.restore()
  }
  // ── the lacerations: each cut stays carved into the air across the foe, glowing, until the reap ──
  G.cuts.forEach((at, i) => {
    const a = k - at; if (a < 0 || k >= G.reap + 10) return
    const rot = [0.5, -0.6, 1.25, -0.2, 0.95][i] * (d > 0 ? 1 : -1), L = 90 + i * 8
    const fresh = clamp(1 - a / 10, 0, 1), linger = 0.5 + 0.2 * Math.sin((real + i * 9) / 5)
    const cx = tx + (hash(i, 5) - 0.5) * 16, cy = tcy + (hash(i, 6) - 0.5) * 30
    const p0 = [cx - Math.cos(rot) * L, cy - Math.sin(rot) * L], p1 = [cx + Math.cos(rot) * L, cy + Math.sin(rot) * L]
    energyLine(c, [p0, p1], 3 + 6 * fresh, Math.max(fresh, linger * (k >= G.reap ? 1 - seg(k, G.reap, G.reap + 10) : 1)))
    if (a < 10) crescent(c, cx, cy, 64 + i * 6, rot + (d > 0 ? 0 : Math.PI), easeO(a / 3), 10, 1 - a / 10)
    if (a < 12) { c.save(); c.globalCompositeOperation = 'lighter'
      for (let j = 0; j < 18; j++) { const an = hash(j, at) * Math.PI * 2, r = (8 + 90 * hash(j + 4, at)) * easeO(a / 12); c.globalAlpha = 1 - a / 12; c.fillStyle = j & 1 ? '#ffffff' : ROSE; c.fillRect(cx + Math.cos(an) * r - 2, cy + Math.sin(an) * r - 2, 4, 4) }
      c.restore() }
  })
  // afterimages: every place he cut from, a fading magenta ghost
  if (k >= G.cuts[0] && k < G.scythe + 10) {
    for (let i = 0; i < G.cuts.length; i++) { const a = k - G.cuts[i]; if (a < 3 || a > 40) continue
      const [dx, dy] = G.at[i], side = Math.sign(dx) * d
      black(c, f, XSLASH, 6, tx + dx * d, sc.tFloor - dy, -side, { alpha: 0.5 * (1 - a / 40), tint: VIOLET, tintA: 0.85, comp: 'lighter' }) }
  }
  // ── Black himself ──
  if (pose.vis) {
    let key = SWORD, fi = 0, g = null
    if (k < G.title) { key = 'charge'; fi = k < 12 ? (k / 3) | 0 : 4 + (((k - 12) / 4) | 0) % 5 }
    else if (k < G.blade0) { key = 'charge'; fi = 4 + (((k - 12) / 4) | 0) % 5 }
    else if (k < G.blade1) { key = SWORD; fi = k < G.blade0 + 10 ? 8 : k < G.blade0 + 22 ? 9 : 14 + ((((k - G.blade0 - 22) / 10) | 0) % 2) }
    else if (k < G.rise) { const i = pose.i | 0, a = k - G.cuts[i]; key = XSLASH; fi = clamp(((a + 1) * 1.2) | 0, 0, 8) }
    else if (k < G.reap - 2) { key = SWORD; fi = k < G.scythe ? 15 : 16 }
    else if (k < G.reap + 14) { key = SWORD; fi = 13 }
    else if (k < G.land) { key = SWORD; fi = 16 }
    else { key = 'idle_2'; fi = 0 }
    if (key === 'idle_2' && !((f._skinAnim && f._skinAnim.taunt) || f.animationData?.taunt)) key = 'idle'
    const drawKey = key === 'idle_2' ? 'taunt' : key
    const dir = k >= G.land && k < G.land + 34 ? -d : pose.dir         // lands with his back to the fallen, then turns
    g = black(c, f, drawKey, fi, pose.x, pose.y, dir, drawKey === 'taunt' ? {} : {})
    // ── the DIVINE LACERATING ki-blade: grows from his hand, a needle of rosé light ──
    if (g && k >= G.blade0 + 4 && k < G.rise) {
      const grow = easeO(seg(k, G.blade0 + 4, G.blade0 + 22)), hx = pose.x + dir * (g.height * 0.16), hy = pose.y - g.height * 0.52
      const L = 22 + 70 * grow, an = k < G.blade1 ? -0.95 : -0.15
      const ex = hx + dir * Math.cos(an) * L, ey = hy + Math.sin(an) * L
      energyLine(c, [[hx, hy], [ex, ey]], 4 + 2 * grow + Math.sin(real / 2) * 0.8, k < G.blade1 ? 1 : 0.8)
      glow(c, hx, hy, 26 + 10 * grow, 0.6)
      if (k < G.blade0 + 24) glow(c, ex, ey, 30 * (1 - grow) + 10, 0.8)
    }
    // ── the SCYTHE: the blade bends into a towering crescent on a haft of light ──
    if (g && k >= G.scythe - 6 && k < G.reap + 4) {
      const s = easeO(seg(k, G.scythe - 6, G.scythe + 10)), hx = pose.x + d * 10, hy = pose.y - g.height * 0.6
      const raise = k < G.suck ? 0 : -0.5 * ease(seg(k, G.suck, G.reap - 2))
      const an = -Math.PI / 2 - d * (0.35 - raise), HL = 92 * s
      const topx = hx + Math.cos(an) * HL, topy = hy + Math.sin(an) * HL
      energyLine(c, [[hx - Math.cos(an) * 30, hy - Math.sin(an) * 30], [topx, topy]], 5, s)
      crescent(c, topx + d * 38 * s, topy + 8, 62 * s, d > 0 ? -0.15 : Math.PI + 0.15, s, 12, s * (0.85 + 0.15 * Math.sin(real / 3)))
      glow(c, topx, topy, 60 * s, 0.5 * s)
    }
  }
  // the blink trails between cuts: a thin rosé streak where he moved
  if (k >= G.cuts[0] - 3 && k < G.rise) { for (let i = 1; i < G.cuts.length; i++) { const a = k - (G.cuts[i] - 3); if (a < 0 || a > 6) continue
    const [ax0, ay0] = G.at[i - 1], [ax1, ay1] = G.at[i]
    energyLine(c, [[tx + ax0 * d, sc.tFloor - ay0 - 50], [tx + ax1 * d, sc.tFloor - ay1 - 50]], 2, 0.8 * (1 - a / 6), VIOLET) } }
  // ── THE REAP: one enormous crescent through the foe, then rosé fire on the ground ──
  const ra = k - G.reap
  if (ra >= -2 && ra < 40) {
    const sw = easeO((ra + 2) / 5)
    crescent(c, tx - d * 20, tcy - 30, 170, d > 0 ? 0.55 : Math.PI - 0.55, sw, 22, 1 - seg(ra, 10, 40))
    crescent(c, tx - d * 20, tcy - 30, 140, d > 0 ? 0.55 : Math.PI - 0.55, sw, 8, 0.8 * (1 - seg(ra, 6, 30)), VIOLET)
    if (ra >= 0) { glow(c, tx, tcy, 160 * easeO(ra / 10), 0.9 * (1 - ra / 40))
      c.save(); c.globalCompositeOperation = 'lighter'
      for (let r = 0; r < 3; r++) { const rr = (ra - r * 4) * 16; if (rr <= 0) continue; c.globalAlpha = 0.75 * (1 - ra / 40); c.strokeStyle = r ? ROSE : '#ffffff'; c.lineWidth = 9 - r * 2; c.beginPath(); c.ellipse(tx, sc.tFloor - 6, rr, rr * 0.22, 0, 0, Math.PI * 2); c.stroke() }
      c.restore() }
  }
  // the blade dissolving into petals in his hand
  if (k >= G.land + 28 && k < G.land + 60) { const a = seg(k, G.land + 28, G.land + 60)
    c.save(); for (let i = 0; i < 14; i++) { const h1 = hash(i, 71), px = pose.x + d * (20 + 60 * h1 * a) + Math.sin((k + i * 8) / 5) * 6, py = pose.y - 70 - 60 * a * hash(i, 72) + a * a * 30
      c.globalAlpha = 1 - a; c.fillStyle = i & 1 ? ROSE : ROSE_HI; c.beginPath(); c.ellipse(px, py, 4, 2.2, (k + i * 10) / 9, 0, Math.PI * 2); c.fill() } c.restore() }
}

function petals(c, W, H, u, k, n, a) {
  if (a <= 0.01) return
  c.save()
  for (let i = 0; i < n; i++) {
    const h1 = hash(i, 101), h2 = hash(i, 103), h3 = hash(i, 107), sp = (1.2 + 2.2 * h2) * u
    const y = ((h3 * H * 1.3 + k * sp * 1.6) % (H * 1.3)) - H * 0.15
    const x = ((h1 * W * 1.2 + Math.sin((k + i * 17) / (18 + 10 * h2)) * 50 * u - k * 0.8 * u) % (W * 1.2) + W * 1.2) % (W * 1.2) - W * 0.1
    const s = (6 + 9 * h2) * u, rot = (k + i * 23) / (12 + 14 * h1)
    c.globalAlpha = a * (0.55 + 0.4 * h3); c.translate(x, y); c.rotate(rot); c.scale(1, 0.45 + 0.4 * Math.abs(Math.sin((k + i * 7) / 9)))
    c.fillStyle = i % 4 ? ROSE : ROSE_HI; c.beginPath(); c.ellipse(0, 0, s, s * 0.6, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = 'rgba(120,0,60,0.35)'; c.beginPath(); c.ellipse(-s * 0.3, 0, s * 0.35, s * 0.2, 0, 0, Math.PI * 2); c.fill()
    c.setTransform(1, 0, 0, 1, 0, 0)
  }
  c.restore()
}

function screen(c, W, H, u, sc, S, t, tx, tcy, k, real, canvas) {
  // petals: a light fall from the aura's ignition, a storm after the reap
  petals(c, W, H, u, k, k < G.reap ? 22 : 60, seg(k, 8, 24) * clamp((G.total - k) / 16, 0, 1))
  // aura ignition flash
  if (k >= 10 && k < 14) { c.globalAlpha = 0.6 * (1 - (k - 10) / 4); c.fillStyle = '#ffd6ec'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
  // each laceration: a full-frame diagonal flash at the moment of the cut + an impact frame
  const la = sc.last ? real - sc.last.real : -1
  if (sc.last?.tag === 'cut' && la >= 0 && la < 8) {
    const i = sc.last.i | 0, tp = S(tx, tcy), rot = [0.5, -0.6, 1.25, -0.2, 0.95][i] * (sc.d > 0 ? 1 : -1), R = Math.hypot(W, H)
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(tp.x, tp.y); c.rotate(rot)
    const w = (14 - la * 1.6) * u
    c.globalAlpha = 0.9 * (1 - la / 8); c.fillStyle = ROSE; c.fillRect(-R, -w * 1.6, R * 2, w * 3.2); c.fillStyle = '#ffffff'; c.fillRect(-R, -w * 0.4, R * 2, w * 0.8)
    c.restore()
    if (la < 6) speedLines(c, W, H, tp.x, tp.y, 0.3 * (1 - la / 6), sc.last.k, 40, ROSE_HI)
    impactFrame(c, W, H, la, i === 4 ? 2 : 0, '#6a0040', 0.3)
    card(c, ['一', '二', '三', '四', '五'][i], W * (0.18 + 0.16 * i), H * 0.24, 64 * u * (la < 3 ? 1.6 - la * 0.2 : 1), '#ffffff', 1, -0.08, '#5a0036', '900 %spx "Hiragino Mincho ProN", "Yu Mincho", serif')
  }
  // the cut tally, kept on screen through the lacerations
  if (k >= G.cuts[0] && k < G.rise + 10) for (let i = 0; i < G.cuts.length; i++) { if (k < G.cuts[i] + 8) continue
    card(c, ['一', '二', '三', '四', '五'][i], W * (0.18 + 0.16 * i), H * 0.24, 40 * u, ROSE_HI, 0.75 * (1 - seg(k, G.rise, G.rise + 10)), -0.08, '#3a0024', '900 %spx "Hiragino Mincho ProN", "Yu Mincho", serif') }
  // the scythe: darkness gathers, speed lines pull toward the foe
  if (k >= G.suck - 10 && k < G.reap) { const a = seg(k, G.suck - 10, G.reap); const tp = S(tx, tcy); c.fillStyle = `rgba(0,0,0,${0.3 * a})`; c.fillRect(0, 0, W, H); speedLines(c, W, H, tp.x, tp.y, 0.3 * a, k, 54, ROSE) }
  if (k >= G.scythe && k < G.scythe + 4) { c.globalAlpha = 0.7 * (1 - (k - G.scythe) / 4); c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1 }
  // THE REAP — the frame splits along the cut, white → inverted → rosé
  if (sc.last?.tag === 'reap' && la >= 0) {
    if (la >= 1 && la < 42) {
      const s = scratchOf(canvas); s.g.setTransform(1, 0, 0, 1, 0, 0); s.g.clearRect(0, 0, W, H); s.g.drawImage(canvas, 0, 0)
      const off = 28 * u * (la < 24 ? easeO(la / 6) : 1 - seg(la, 24, 42))
      const y0 = sc.d > 0 ? H * 0.78 : H * 0.18, y1 = sc.d > 0 ? H * 0.18 : H * 0.78
      c.fillStyle = '#000000'; c.fillRect(0, 0, W, H)
      for (const sgn of [-1, 1]) { c.save(); c.beginPath(); if (sgn < 0) { c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, y1); c.lineTo(0, y0) } else { c.moveTo(0, y0); c.lineTo(W, y1); c.lineTo(W, H); c.lineTo(0, H) } c.closePath(); c.clip()
        c.drawImage(s.cv, sgn * off, sgn * off * 0.4); c.restore() }
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffffff'; c.lineWidth = 7 * u * (1 - seg(la, 4, 42)); c.shadowColor = ROSE; c.shadowBlur = 28 * u; c.beginPath(); c.moveTo(0, y0); c.lineTo(W, y1); c.stroke(); c.restore()
    }
    impactFrame(c, W, H, la, 3, '#a0005a', 0.45)
    if (la >= 3 && la < 60) card(c, 'ZERO MORTALS', W / 2, H * 0.26, 96 * u * (la < 8 ? 1.9 - 0.9 * easeO((la - 3) / 5) : 1), '#ffffff', clamp((60 - la) / 10, 0, 1), -0.06, '#7a0046')
  }
  if (k >= G.land + 34) card(c, 'A GOD HAS JUDGED YOU', W / 2, H * 0.24, 40 * u, ROSE_HI, seg(k, G.land + 34, G.land + 42) * clamp((G.total - k) / 10, 0, 1), -0.03, '#3a0024')
}

function subs(c, W, H, bar, u, k) {
  const line = (a, b, s) => { if (k >= a && k < b) subtitle(c, W, H, bar, s, seg(k, a, a + 6) * (1 - seg(k, b - 6, b)), u) }
  line(G.title - 4, G.blade0 + 12, '“You shall now feel the full brunt of a god\'s anger.”')
  line(G.blade0 + 14, G.blade1 + 2, '“How beautiful… a mortal\'s struggle. More beautiful still — its end.”')
  line(G.rise + 4, G.reap - 2, '“Be grateful. You are cut down by a god\'s own hand.”')
  line(G.land + 2, G.total - 4, '“Behold the beauty of a world without mortals.”')
}

registerCineScreen('goku_black_ult', draw)
