// DSEYL (dseyl) — ZERO HOUR presentation (RENDER-ONLY). Reads dseylUltScene() (dseylState.js); never writes sim state.
// The world pass (drawDseylUnder → recordDseylUltWorld) records the world → screen transform; the SCREEN overlay
// (cineRegistry.registerCineScreen) then:
//   1. re-blits the finished frame scaled about a virtual camera (real close-ups past camera.js's 1.15 cap) and, while time
//      is stopped, re-blits it GREY (the stop rolls out of Dseyl as a wave; the resume rolls colour back from the lattice);
//   2. draws Dseyl himself (his engine sprite is hidden for the cinematic) in full colour over the frozen grey world, his
//      six afterimage clones, the blueprint lattice, the Zero-Point drones, beams, blasts, the sphere and the clock face;
//   3. grades (vignette, impact frames: white → inverted → cyan), letterbox, title card, callouts, its own damage count.
// Bounded: images cached once per URL, one tinted copy per sheet (cached), fixed shard tables, a frame hash for noise.
// No Math.random. Reduced motion / flashing → no inverted frames, softer flashes, capped zoom.
import { juiceSettings } from './juiceSettings.js'
import { DSEYL_ULT as U, dseyl as DS } from './dseylData.js'
import { DSEYL_ANIM } from './dseylSprites.js'
import { SYNDROME_PARTS as PA } from './syndromeSprites.js'
import { dseylUltScene, zhNode, zhDrone, zhRoute, zhFoeLift } from './dseylState.js'
import { registerCineScreen } from './cineRegistry.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
const tints = new Map()
function tinted(im, col) {   // one cached silhouette copy per (sheet, colour)
  const key = im.src + '|' + col
  if (tints.has(key)) return tints.get(key)
  if (!ready(im)) return null
  try {
    const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight
    const x = cv.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, cv.width, cv.height)
    tints.set(key, cv); return cv
  } catch (_) { return null }
}
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const cl = (v, a, b) => Math.max(a, Math.min(b, v))
const easeO = u => 1 - (1 - u) * (1 - u)
const hh = i => { let x = (Math.imul(i | 0, 374761393) + 668265263) >>> 0; x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296 }
const COL = { cyan: '#5fe8ff', deep: '#0b6dff', white: '#f4fdff', gold: '#ffd25f', ink: '#040a16' }
const C = U.contacts, BEAM0 = C[0].at, DR0 = C[6].at

// ── world → screen ──
let XF = null
export function recordDseylUltWorld(c) { try { XF = c.getTransform() } catch (_) { XF = null } }
let V = { sx: 0, sy: 0, sz: 1 }
const w2s = (x, y) => XF ? { x: (XF.a * x + XF.c * y + XF.e - V.sx) * V.sz, y: (XF.b * x + XF.d * y + XF.f - V.sy) * V.sz } : { x, y }
const kpx = () => (XF ? XF.a : 1) * V.sz   // world px → screen px

// positions (world) at timeline frame k
const sceneOf = v => {
  const d = v.dir, floor = v.floor
  return {
    d, floor,
    node: i => { const n = zhNode(i); return { x: v.tc + d * n.dx, feet: floor - n.lift } },
    drone: j => { const n = zhDrone(j); return { x: v.tc + d * n.dx, y: floor - 47 - n.lift } },
    foe: k => ({ x: v.tc, y: floor - v.tH * 0.5 - zhFoeLift(k) }),
    me: k => { const r = zhRoute(k); return { x: v.tc + d * r.dx, feet: floor - r.lift, face: d * r.face, r } },
  }
}

// ── sprites ──
function animOf(f, key) { return f?.animationData?.[key]?.sheet ? f.animationData[key] : DSEYL_ANIM[key] || DSEYL_ANIM.idle }
function frameOf(A, at) {
  if (A.frameTimeline) { let fi = 0; for (const [t, i] of A.frameTimeline) if (at >= t) fi = i; return Math.min(fi, A.frames - 1) }
  const n = Math.floor(at / (A.speed || 6)); return A.loop ? n % A.frames : Math.min(n, A.frames - 1)
}
// draw a body cell with its feet at world (x, feet); `tint` = a silhouette colour (afterimages)
function body(c, f, key, at, x, feet, face, { alpha = 1, tint = null, glow = 0, scale = 2, add = false } = {}) {
  if (alpha <= 0.01) return
  const A = animOf(f, key), im = image(A.sheet); if (!ready(im)) return
  const src = tint ? tinted(im, tint) : im; if (!src) return
  const fi = frameOf(A, at), k = kpx() * scale, p = w2s(x, feet)
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = cl(alpha, 0, 1); if (add) c.globalCompositeOperation = 'lighter'
  if (glow > 0 && !calm()) { c.shadowColor = COL.cyan; c.shadowBlur = glow * kpx() }
  c.translate(Math.round(p.x), Math.round(p.y)); c.scale(face < 0 ? -1 : 1, 1)
  c.drawImage(src, fi * A.width, 0, A.width, A.height, -A.originX * k, -A.originY * k, A.width * k, A.height * k)
  c.restore()
}
function part(c, name, i, x, y, { alpha = 1, scale = 2, flip = 1, add = false } = {}) {
  const A = PA[name]; if (!A || alpha <= 0.01) return
  const im = image(A.sheet); if (!ready(im)) return
  const fr = ((i % A.frames) + A.frames) % A.frames, k = kpx() * scale, p = w2s(x, y)
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = cl(alpha, 0, 1); if (add) c.globalCompositeOperation = 'lighter'
  c.translate(p.x, p.y); c.scale(flip, 1)
  c.drawImage(im, fr * A.width, 0, A.width, A.height, -A.originX * k, -A.originY * k, A.width * k, A.height * k)
  c.restore()
}
function card(c, txt, x, y, size, fill, a = 1, rot = 0, stroke = COL.ink, font = 'Impact, "Arial Black", sans-serif') {
  if (!(a > 0.01)) return
  c.save(); c.globalAlpha = cl(a, 0, 1); c.translate(x, y); if (rot) c.rotate(rot)
  c.font = `900 italic ${Math.round(size)}px ${font}`; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.lineJoin = 'round'; c.lineWidth = Math.max(4, size / 6); c.strokeStyle = stroke; c.strokeText(txt, 0, 0); c.fillStyle = fill; c.fillText(txt, 0, 0); c.restore()
}
function glowLine(c, a, b, w, col, alpha = 1) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'
  c.globalAlpha = 0.35 * alpha; c.strokeStyle = col; c.lineWidth = w * 2.6; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke()
  c.globalAlpha = 0.8 * alpha; c.lineWidth = w; c.stroke()
  c.globalAlpha = alpha; c.strokeStyle = COL.white; c.lineWidth = Math.max(1, w * 0.35); c.stroke(); c.restore()
}
function ring(c, p, r, w, col, alpha, ry = 1) {
  if (alpha <= 0.01 || r <= 0) return
  c.save(); c.globalAlpha = alpha; c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.ellipse(p.x, p.y, r, r * ry, 0, 0, Math.PI * 2); c.stroke(); c.restore()
}
function burst(c, p, r, alpha, inner = COL.white, outer = COL.cyan) {
  if (alpha <= 0.01 || r <= 1) return
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = cl(alpha, 0, 1)
  const g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, inner); g.addColorStop(0.35, outer); g.addColorStop(1, 'rgba(0,120,255,0)')
  c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); c.restore()
}
function spikes(c, p, n, r0, r1, w, col, alpha, seed) {
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = cl(alpha, 0, 1); c.fillStyle = col
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + hh(seed + i) * 0.5, L = r0 + (r1 - r0) * (0.55 + 0.45 * hh(seed * 7 + i)), ww = w * (0.6 + hh(i + seed * 3))
    c.beginPath(); c.moveTo(p.x + Math.cos(a + 1.57) * ww, p.y + Math.sin(a + 1.57) * ww); c.lineTo(p.x + Math.cos(a) * L, p.y + Math.sin(a) * L)
    c.lineTo(p.x + Math.cos(a - 1.57) * ww, p.y + Math.sin(a - 1.57) * ww); c.closePath(); c.fill()
  }
  c.restore()
}
function speedLines(c, Wd, Ht, cx, cy, a, seed, n = 46) {
  if (calm()) return
  c.save(); c.globalAlpha = a; c.fillStyle = '#ffffff'
  const R0 = Math.hypot(Wd, Ht)
  for (let i = 0; i < n; i++) {
    const an = (i / n) * Math.PI * 2 + hh(seed + i) * 0.13, r1 = R0 * (0.22 + 0.2 * hh(i * 3 + seed)), w = 0.004 + 0.008 * hh(i + seed * 5)
    c.beginPath(); c.moveTo(cx + Math.cos(an) * R0, cy + Math.sin(an) * R0)
    c.lineTo(cx + Math.cos(an + w) * r1, cy + Math.sin(an + w) * r1); c.lineTo(cx + Math.cos(an - w) * r1, cy + Math.sin(an - w) * r1); c.closePath(); c.fill()
  }
  c.restore()
}

// ── the virtual camera: [frame, zoom, subject] ──
const VCAM = [[0, 1, 'mid'], [10, 1.9, 'f'], [33, 2.15, 'f'], [36, 2.15, 'f'], [46, 1.2, 'lat'], [49, 1.2, 'lat'], [50, 1.65, 'f'], [148, 1.75, 'f'],
  [151, 0.95, 'lat'], [164, 1.0, 'lat'], [167, 1.85, 'f'], [175, 1.85, 'f'], [177, 1.15, 'lat'], [181, 1.35, 't'], [203, 1.55, 't'],
  [207, 1.2, 't'], [230, 1.35, 't'], [233, 0.95, 'sky'], [250, 1.05, 'sky'], [257, 1.5, 't'], [262, 1.95, 't'], [267, 1.4, 't'],
  [276, 1.05, 'mid'], [290, 1.75, 'f'], [318, 1.85, 'f'], [330, 1, 'mid']]
function vcam(v, S, Wd, Ht) {
  const k = v.frame, m = S.me(k), fo = S.foe(k)
  const raw = w => {
    const fp = XF ? { x: XF.a * m.x + XF.c * (m.feet - 64) + XF.e, y: XF.b * m.x + XF.d * (m.feet - 64) + XF.f } : { x: Wd / 2, y: Ht / 2 }
    const tp = XF ? { x: XF.a * fo.x + XF.c * fo.y + XF.e, y: XF.b * fo.x + XF.d * fo.y + XF.f } : fp
    if (w === 'f') return fp
    if (w === 't') return tp
    if (w === 'lat') { const y = fo.y - 70; return XF ? { x: XF.a * v.tc + XF.c * y + XF.e, y: XF.b * v.tc + XF.d * y + XF.f } : tp }
    return { x: (fp.x + tp.x) / 2, y: (fp.y + tp.y) / 2 }   // mid / sky
  }
  let i = 0; while (i < VCAM.length - 2 && k >= VCAM[i + 1][0]) i++
  const A = VCAM[i], B = VCAM[i + 1], u0 = cl((k - A[0]) / Math.max(1, B[0] - A[0]), 0, 1), u = u0 * u0 * (3 - 2 * u0)
  const pa = raw(A[2]), pb = raw(B[2])
  let z = A[1] + (B[1] - A[1]) * u
  if (v.hold > 0) z *= 1 + (v.hit === 9 ? 0.25 : v.hit >= 6 ? 0.1 + 0.03 * (v.hit - 6) : v.hit >= 0 ? 0.04 + 0.012 * v.hit : 0.06) * (v.hold / Math.max(1, v.holdN))
  if (calm()) z = Math.min(z, 1.5)
  return { z: Math.max(1, z), x: pa.x + (pb.x - pa.x) * u, y: pa.y + (pb.y - pa.y) * u }
}

// is time stopped at timeline frame k (and how far the grey wave has rolled: 0..1)
const frozenAmt = k => k < U.stop ? 0 : k < U.stop + 12 ? (k - U.stop) / 12 : k < U.resume ? 1 : 0
const resumeAmt = k => k >= U.resume && k < U.resume + 12 ? (k - U.resume) / 12 : -1

export function drawDseylUltScreen(c, cv) {
  const sc = dseylUltScene(); if (!sc || !sc.view) { XF = null; return false }
  const v = sc.view, f = sc.caster, k = v.frame, Wd = cv.width, Ht = cv.height, u = Ht / 720, S = sceneOf(v), calmMode = calm()
  const hitAge = v.hold > 0 ? v.holdN - v.hold : -1
  // 1. virtual camera re-blit (+ the grey of stopped time)
  const Z = vcam(v, S, Wd, Ht)
  V = { sx: 0, sy: 0, sz: 1 }
  if (Z.z > 1.01) {
    const sw2 = Wd / Z.z, sh2 = Ht / Z.z, sx = cl(Z.x - sw2 * 0.5, 0, Wd - sw2), sy = cl(Z.y - sh2 * 0.55, 0, Ht - sh2)
    try { c.imageSmoothingEnabled = false; c.drawImage(cv, sx, sy, sw2, sh2, 0, 0, Wd, Ht); V = { sx, sy, sz: Z.z } } catch (_) {}
  }
  const fz = frozenAmt(k), ra = resumeAmt(k), me = S.me(k), mp = w2s(me.x, me.feet - 60), fp = w2s(S.foe(k).x, S.foe(k).y)
  if (fz > 0 || ra >= 0) {
    c.save()
    if (fz > 0 && fz < 1) { c.beginPath(); c.arc(mp.x, mp.y, easeO(fz) * Math.hypot(Wd, Ht), 0, Math.PI * 2); c.clip() }
    if (ra >= 0) { c.beginPath(); c.rect(0, 0, Wd, Ht); c.arc(fp.x, fp.y - 40 * u, easeO(ra) * Math.hypot(Wd, Ht), 0, Math.PI * 2, true); c.clip('evenodd') }
    try { c.filter = 'grayscale(1) contrast(1.3) brightness(0.78)'; c.drawImage(cv, 0, 0); c.filter = 'none' } catch (_) {}
    c.globalAlpha = 0.22; c.fillStyle = '#1a3a6a'; c.fillRect(0, 0, Wd, Ht); c.restore()
    // the wavefront rings
    if (fz > 0 && fz < 1) { const r = easeO(fz) * Math.hypot(Wd, Ht); ring(c, mp, r, 6 * u, COL.cyan, 0.9 * (1 - fz)); ring(c, mp, r * 0.93, 2 * u, COL.white, 0.8 * (1 - fz)) }
    if (ra >= 0) { const r = easeO(ra) * Math.hypot(Wd, Ht); ring(c, { x: fp.x, y: fp.y - 40 * u }, r, 8 * u, COL.gold, 0.9 * (1 - ra)) }
  }
  const K = kpx(), fin = v.done >= C.length   // fin: false after a KO mid-barrage (the strike was skipped → skip its effects too)
  // 2a. blueprint lattice (built in stopped time; burns away as the beams fire)
  const placed = i => k >= U.blinks[i] + 4
  if (k >= U.blinks[0] && k < DR0 + 30) {
    const la = k < BEAM0 ? 1 : cl(1 - (k - BEAM0) / 40, 0, 1)
    c.save(); c.setLineDash([8 * u, 6 * u]); c.lineDashOffset = -k * 1.5; c.lineWidth = 1.6 * u; c.strokeStyle = COL.cyan; c.globalAlpha = 0.75 * la
    for (let i = 0; i < 6; i++) if (placed(i)) {
      const n = S.node(i), a = w2s(n.x, n.feet - 64), t0 = S.foe(Math.min(k, DR0 - 1))
      c.beginPath(); c.moveTo(a.x, a.y); const b = w2s(t0.x, t0.y); c.lineTo(b.x, b.y); c.stroke()
      if (i > 0 && placed(i - 1)) { const m = S.node(i - 1), q = w2s(m.x, m.feet - 64); c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(a.x, a.y); c.stroke() }
    }
    c.setLineDash([])
    for (let i = 0; i < 6; i++) if (placed(i)) {
      const n = S.node(i), a = w2s(n.x, n.feet - 64), age = k - U.blinks[i] - 4
      ring(c, a, (age < 6 ? 30 - 3 * age : 12) * u, 2 * u, COL.cyan, 0.9 * la)
      c.save(); c.globalAlpha = 0.9 * la; c.fillStyle = COL.cyan; c.font = `bold ${Math.round(11 * u)}px monospace`; c.textAlign = 'center'; c.fillText(`N${i + 1}`, a.x, a.y - 20 * u); c.restore()
    }
    c.restore()
  }
  // 2b. Zero-Point drones (planted at nodes 2, 4, 6; frozen in stopped time; then the chain)
  for (let j = 0; j < 3; j++) {
    const at = U.blinks[2 * j + 1] + 5, boom = C[6 + j].at, dp = S.drone(j)
    if (k >= at && k < boom) {
      const spin = k >= U.resume ? k >> 1 : 0, sp = w2s(dp.x, dp.y)
      part(c, 'droneHover', spin, dp.x, dp.y, { scale: 2, flip: v.dir })
      ring(c, sp, (18 + (k >= U.resume ? 4 * Math.sin(k * 0.8) : 0)) * K, 2 * u, k >= boom - 6 ? COL.gold : COL.cyan, 0.8)
    }
    const ba = k - boom
    if (ba >= 0 && ba < 26) {
      const p = w2s(dp.x, dp.y)
      burst(c, p, (60 + 140 * easeO(ba / 26)) * K, ba < 4 ? 1 : 1 - (ba - 4) / 22)
      ring(c, p, (40 + 260 * easeO(ba / 26)) * K, 5 * u, COL.white, 1 - ba / 26)
      if (ba < 10) spikes(c, p, 12, 30 * K, (120 + 60 * ba / 10) * K, 7 * K, COL.cyan, 1 - ba / 10, 30 + j)
      part(c, 'boomRing', ba >> 2, dp.x, dp.y, { scale: 3.5 })
    }
  }
  // 2c. afterimage clones: one at each node he left; each fires its beam once time resumes, then breaks apart
  for (let i = 0; i < 6; i++) {
    const left = i + 1 < 6 ? U.blinks[i + 1] : U.home, fire = C[i].at, n = S.node(i), face = n.x <= v.tc ? 1 : -1
    if (k < left - 3 || k >= fire + 14) continue
    const charging = k >= U.resume && k < fire, firing = k >= fire && k < fire + 8, gone = k >= fire + 8 ? (k - fire - 8) / 6 : 0
    const flick = calmMode ? 1 : 0.75 + 0.25 * hh(k * 13 + i)
    const ca = (k < left ? (k - left + 3) / 3 : 1) * flick * (1 - gone)
    body(c, f, 'zhPlant', 99, n.x, n.feet, face, { alpha: 0.5 * ca, glow: charging || firing ? 18 : 8 })              // the afterimage: his real colours, see-through…
    body(c, f, 'zhPlant', 99, n.x, n.feet, face, { alpha: (firing ? 0.75 : 0.38) * ca, tint: firing ? COL.white : COL.cyan, add: true })   // …washed in Zero-Point light
    if (charging) { const hp = w2s(n.x + face * 30, n.feet - 70); burst(c, hp, (10 + 26 * cl((k - U.resume) / (fire - U.resume), 0, 1)) * K, 0.9) }
    if (firing) {
      const a = w2s(n.x + face * 30, n.feet - 70), t0 = S.foe(k), b = w2s(t0.x, t0.y), fa = 1 - (k - fire) / 9
      glowLine(c, a, b, (k - fire < 2 ? 26 : 16) * K, COL.cyan, fa)
      burst(c, b, 70 * K, fa); spikes(c, b, 9, 16 * K, 80 * K, 5 * K, COL.white, fa, 70 + i)
    }
    if (gone > 0) for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2 + i, r = 20 + 70 * gone, p = w2s(n.x + Math.cos(a) * r, n.feet - 64 + Math.sin(a) * r); c.save(); c.globalAlpha = 1 - gone; c.fillStyle = COL.cyan; c.fillRect(p.x - 3 * u, p.y - 3 * u, 6 * u, 6 * u); c.restore() }
  }
  // 2d. the Zero-Point sphere that holds the captive aloft after the chain
  const sphA = k >= C[8].at && k < U.hit + 2 ? cl((k - C[8].at) / 8, 0, 1) : 0
  if (sphA > 0) {
    const t0 = S.foe(k), p = w2s(t0.x, t0.y), r = (92 + 6 * Math.sin(k * 0.3)) * K
    c.save(); c.globalAlpha = 0.25 * sphA; c.fillStyle = COL.cyan; c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); c.restore()
    ring(c, p, r, 4 * u, COL.white, 0.9 * sphA); ring(c, p, r * 0.92, 2 * u, COL.cyan, 0.9 * sphA)
    for (let q = 0; q < 3; q++) { c.save(); c.globalAlpha = 0.6 * sphA; c.strokeStyle = COL.cyan; c.lineWidth = 1.5 * u; c.beginPath(); c.ellipse(p.x, p.y, r, r * Math.abs(Math.sin(k * 0.05 + q)), q * 1.05, 0, Math.PI * 2); c.stroke(); c.restore() }
  }
  // 2e. the clock face behind the sphere: hands race to twelve, it strikes ZERO HOUR, then shatters
  if (k >= U.apex && k < U.land + 26 && (fin || k < U.land)) {
    const t0 = S.foe(Math.min(k, U.hit)), p = w2s(t0.x, t0.y - 20), R = 210 * K
    const a = cl((k - U.apex) / 10, 0, 1), sh = k >= U.land ? (k - U.land) / 26 : 0
    if (sh <= 0) {
      c.save(); c.globalAlpha = 0.85 * a; c.translate(p.x, p.y)
      c.strokeStyle = COL.gold; c.lineWidth = 5 * u; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.stroke()
      c.lineWidth = 2 * u; c.beginPath(); c.arc(0, 0, R * 0.9, 0, Math.PI * 2); c.stroke()
      for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2, L = i % 3 === 0 ? 0.74 : 0.8; c.lineWidth = (i % 3 === 0 ? 6 : 3) * u; c.beginPath(); c.moveTo(Math.sin(an) * R * L, -Math.cos(an) * R * L); c.lineTo(Math.sin(an) * R * 0.88, -Math.cos(an) * R * 0.88); c.stroke() }
      const prog = k >= U.hit ? 1 : easeO(cl((k - U.apex) / (U.hit - U.apex), 0, 1)), hand = (an, L, w) => { c.lineWidth = w * u; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.sin(an) * R * L, -Math.cos(an) * R * L); c.stroke() }
      c.strokeStyle = COL.white; hand(Math.PI * 2 * (-3 + 3 * prog), 0.82, 4); hand(Math.PI * 2 * (-0.25 + 0.25 * prog), 0.55, 8)
      c.fillStyle = COL.gold; c.beginPath(); c.arc(0, 0, 9 * u, 0, Math.PI * 2); c.fill()
      if (k >= U.hit) { c.globalAlpha = cl(1 - (k - U.hit) / 20, 0, 1); c.strokeStyle = COL.white; c.lineWidth = 14 * u; c.beginPath(); c.arc(0, 0, R * (1 + (k - U.hit) * 0.03), 0, Math.PI * 2); c.stroke() }
      c.restore()
    } else for (let i = 0; i < 18; i++) {   // the face breaks into falling shards
      const an = i / 18 * Math.PI * 2, r = R * (0.9 + 0.5 * sh * (0.5 + hh(i))), px = p.x + Math.sin(an) * r, py = p.y - Math.cos(an) * r + 300 * u * sh * sh * (0.5 + hh(i + 9))
      c.save(); c.globalAlpha = 1 - sh; c.fillStyle = i % 2 ? COL.gold : COL.white; c.translate(px, py); c.rotate(an + sh * 6 * (hh(i) - 0.5))
      c.fillRect(-14 * u, -3 * u, 28 * u, 6 * u); c.restore()
    }
  }
  // 2f. Dseyl (in colour, over stopped time): blink streaks, the dive trail, then the body
  const B = [...U.blinks, U.home, U.apex]
  for (let bi = 0; bi < B.length; bi++) {
    const b = B[bi], a = k - b; if (a < -3 || a > 5) continue
    const p0 = S.me(b - 4), p1 = S.me(b), A0 = w2s(p0.x, p0.feet - 60), A1 = w2s(p1.x, p1.feet - 60), fade = a < 0 ? 1 : 1 - a / 6
    glowLine(c, A0, A1, 10 * K, COL.cyan, 0.9 * fade)
    for (let q = 1; q <= 3; q++) { const s = q / 4; body(c, f, 'dash', 0, p0.x + (p1.x - p0.x) * s, p0.feet + (p1.feet - p0.feet) * s, p1.x >= p0.x ? 1 : -1, { alpha: 0.35 * fade, tint: COL.cyan }) }
    if (a >= 0 && a < 5) { burst(c, A1, (60 - 8 * a) * K, 1 - a / 5); ring(c, A1, (20 + 14 * a) * K, 3 * u, COL.white, 1 - a / 5) }
  }
  if (k >= U.dive && k < U.crash + 2) for (let q = 1; q <= 5; q++) { const pk = Math.max(U.dive, k - q * 2), m = S.me(pk); body(c, f, 'zhDive', 10, m.x, m.feet, m.face, { alpha: 0.5 - q * 0.08, tint: COL.cyan }) }
  const vanish = B.some(b => k >= b - 3 && k < b)
  if (!vanish) body(c, f, me.r.pose, me.r.at, me.x, me.feet, me.face, { glow: k >= U.stop && k < U.resume ? 10 : 0 })
  // the snaps: a ring of light at his hand
  for (const sk of [U.snap1, U.snap2]) { const a = k - sk; if (a >= 0 && a < 10) { const hp = w2s(me.x + me.face * 34, me.feet - 84); burst(c, hp, (30 + 4 * a) * K, 1 - a / 10, COL.white, COL.gold); ring(c, hp, (10 + 9 * a) * K, 3 * u, COL.gold, 1 - a / 10) } }
  // 2g. the ZERO HOUR strike + the crash into the stage
  const za = fin ? k - U.hit : -1
  if (za >= 0 && za < 30) { const t0 = S.foe(U.hit), p = w2s(t0.x, t0.y); burst(c, p, (80 + 170 * easeO(za / 30)) * K, (za < 5 ? 0.85 : 0.85 * (1 - (za - 5) / 25)), COL.white, COL.gold); spikes(c, p, 16, 40 * K, 330 * K, 10 * K, COL.white, 1 - za / 30, 99); ring(c, p, (60 + 520 * easeO(za / 30)) * K, 7 * u, COL.gold, 1 - za / 30) }
  const ca = fin ? k - U.crash : -1
  if (ca >= 0 && ca < 40) {
    const g = w2s(v.tc, v.floor)
    for (let q = 0; q < 3; q++) { const qa = ca - q * 4; if (qa >= 0) ring(c, g, (60 + 900 * easeO(cl(qa / 36, 0, 1))) * K, (8 - 2 * q) * u, q ? COL.cyan : COL.white, 1 - qa / 36, 0.16) }
    burst(c, { x: g.x, y: g.y - 30 * K }, (90 + 90 * easeO(ca / 40)) * K, 0.7 * (1 - ca / 40), COL.white, COL.gold)
    for (let i = 0; i < 16; i++) { const s = ca / 40, dx = (hh(i) - 0.5) * 2, px = g.x + dx * 420 * K * s, py = g.y - (260 * hh(i + 5) * s - 420 * s * s) * K
      c.save(); c.globalAlpha = 1 - s; c.fillStyle = i % 3 ? '#6b6f7a' : COL.cyan; c.translate(px, py); c.rotate(i + s * 8); c.fillRect(-7 * u * K, -5 * u * K, 14 * u * K, 10 * u * K); c.restore() }
  }
  // 3. grade: vignette, stopped-time scanlines, impact frames
  const vg = c.createRadialGradient(Wd / 2, Ht / 2, Ht * 0.3, Wd / 2, Ht / 2, Ht * 0.95)
  vg.addColorStop(0, 'rgba(0,10,30,0)'); vg.addColorStop(1, fz >= 1 ? 'rgba(0,8,24,0.7)' : 'rgba(0,8,24,0.45)'); c.fillStyle = vg; c.fillRect(0, 0, Wd, Ht)
  if (fz >= 1 && !calmMode) { c.save(); c.globalAlpha = 0.06; c.fillStyle = '#9fdcff'; for (let y = (k * 2) % 6; y < Ht; y += 6 * u) c.fillRect(0, y, Wd, 1); c.restore() }
  const sloMo = U.slow.some(q => k >= q[0] && k < q[1])
  if (sloMo && k < U.hit) speedLines(c, Wd, Ht, fp.x, fp.y, 0.28, k * 7, 40)
  if (hitAge >= 0 && v.hit >= 0) speedLines(c, Wd, Ht, fp.x, fp.y, v.hit === 9 ? 0.6 : 0.3, k * 13 + hitAge)
  if (hitAge >= 0) {
    const big = v.hit === 9 || v.hit === -4, n = big ? 4 : v.hit >= 6 || v.hit === -3 ? 2 : 1
    if (hitAge === 0) { c.globalAlpha = calmMode ? 0.3 : v.hit === -2 ? 0.6 : 0.85; c.fillStyle = '#ffffff'; c.fillRect(0, 0, Wd, Ht) }
    else if (hitAge <= n && !calmMode && v.hit !== -2) { c.globalCompositeOperation = 'difference'; c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.fillRect(0, 0, Wd, Ht); c.globalCompositeOperation = 'source-over' }
    else { c.globalAlpha = (calmMode ? 0.1 : 0.25) * (v.hold / Math.max(1, v.holdN)); c.fillStyle = v.hit === 9 ? '#fff1c0' : '#c6f6ff'; c.fillRect(0, 0, Wd, Ht) }
    c.globalAlpha = 1
  }
  // 4. letterbox
  const inU = easeO(cl(k / 10, 0, 1)), outU = easeO(cl((U.total - k) / 14, 0, 1)), bar = Ht * 0.11 * Math.min(inU, outU)
  c.fillStyle = '#000000'; c.fillRect(0, 0, Wd, bar); c.fillRect(0, Ht - bar, Wd, bar)
  c.fillStyle = fz >= 1 ? COL.cyan : COL.gold; c.globalAlpha = Math.min(inU, outU); c.fillRect(0, bar - 2 * u, Wd, 2 * u); c.fillRect(0, Ht - bar, Wd, 2 * u); c.globalAlpha = 1
  // 5. the title card
  if (k < U.cutIn) {
    const a = k < 4 ? k / 4 : k > U.cutIn - 6 ? (U.cutIn - k) / 6 : 1, slide = easeO(cl(k / 7, 0, 1)), y0 = Ht * 0.14, bh = 150 * u
    c.save(); c.globalAlpha = a; c.translate((1 - slide) * Wd, 0)
    c.beginPath(); c.moveTo(0, y0 - 22 * u); c.lineTo(Wd, y0 + 22 * u); c.lineTo(Wd, y0 + 22 * u + bh); c.lineTo(0, y0 - 22 * u + bh); c.closePath(); c.fillStyle = 'rgba(4,10,22,0.92)'; c.fill()
    c.fillStyle = COL.gold; c.fillRect(0, y0 + 4 * u, Wd, 3 * u); c.fillStyle = COL.cyan; c.fillRect(0, y0 + bh - 8 * u, Wd, 3 * u)
    for (let i = 0; i < 10; i++) { const sx = ((k * (26 + i * 5) + i * 170) % (Wd + 300)) - 150, sy = y0 + 18 * u + hh(i) * (bh - 36 * u); c.fillStyle = 'rgba(150,240,255,0.45)'; c.fillRect(Wd - sx, sy, 90 + 120 * hh(i + 3), 2 * u) }
    const por = image(DS.portrait)
    if (ready(por)) { const ph = bh * 1.05, pw = ph * por.naturalWidth / por.naturalHeight; c.imageSmoothingEnabled = false; c.drawImage(por, Wd * 0.07, y0 + bh / 2 - ph / 2, pw, ph) }
    // a stopwatch glyph behind the name, its hand racing
    const gx = Wd * 0.62, gy = y0 + bh * 0.45, gr = 58 * u
    c.strokeStyle = 'rgba(255,210,95,0.35)'; c.lineWidth = 4 * u; c.beginPath(); c.arc(gx, gy, gr, 0, Math.PI * 2); c.stroke()
    c.beginPath(); c.moveTo(gx, gy); c.lineTo(gx + Math.sin(k * 0.5) * gr * 0.9, gy - Math.cos(k * 0.5) * gr * 0.9); c.stroke()
    const slam = k < 6 ? 0 : k < 12 ? 1.9 - 0.9 * easeO((k - 6) / 6) : 1
    if (slam > 0) card(c, U.name, gx, y0 + bh * 0.42, 84 * u * slam, '#ffffff', 1, 0.04, '#062a4a')
    if (k >= 12) card(c, U.sub, gx + 10 * u, y0 + bh * 0.82, 26 * u, COL.cyan, cl((k - 12) / 5, 0, 1), 0.04)
    c.restore()
  }
  // 6. callouts
  const cx = Wd / 2
  if (k >= U.stop && k < U.stop + 26) card(c, 'TIME — STOP.', cx, Ht * 0.32, 72 * u * (k - U.stop < 4 ? 1.5 - 0.12 * (k - U.stop) : 1), COL.white, cl((U.stop + 26 - k) / 6, 0, 1), -0.03, '#062a4a')
  for (let i = 0; i < 6; i++) { const a = k - U.blinks[i] - 3; if (a >= 0 && a < 12) card(c, `BUILD ${i + 1}/6`, cl(w2s(S.node(i).x, 0).x, Wd * 0.15, Wd * 0.85), bar + 44 * u, 30 * u, COL.cyan, cl((12 - a) / 4, 0, 1), 0, '#031426', 'Consolas, monospace') }
  if (fz >= 1 && k >= U.blinks[0]) {   // the stopwatch: the world's clock reads 0.00 while his own keeps running
    const t = ((k - U.stop) / 60).toFixed(2)
    c.save(); c.font = `bold ${Math.round(18 * u)}px Consolas, monospace`; c.textAlign = 'right'; c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillText('WORLD  0.00s', Wd - 24 * u, bar + 26 * u)
    c.fillStyle = COL.cyan; c.fillText(`DSEYL  ${t}s`, Wd - 24 * u, bar + 50 * u); c.restore()
  }
  if (k >= U.home + 4 && k < U.resume) { const a = cl((k - U.home - 4) / 6, 0, 1) * cl((U.resume - k) / 3, 0, 1); card(c, '“Built it in zero seconds.”', cx, Ht - bar - 40 * u, 34 * u, '#eef8ff', a, 0, COL.ink, 'Georgia, serif') }
  if (k >= U.resume && k < U.resume + 18) card(c, 'RESUME.', cx, Ht * 0.3, 84 * u * (k - U.resume < 4 ? 1.6 - 0.15 * (k - U.resume) : 1), COL.gold, cl((U.resume + 18 - k) / 5, 0, 1), 0.03, '#2a1a00')
  const beams = C.slice(0, 6).filter(q => k >= q.at).length
  if (beams > 0 && k < DR0 + 6) { const a0 = k - C[beams - 1].at; card(c, `×${beams}`, cl(fp.x + 120 * u, Wd * 0.2, Wd * 0.85), cl(fp.y - 110 * u, bar + 40 * u, Ht * 0.7), (54 + 6 * beams) * u * (a0 < 3 ? 1.4 - 0.13 * a0 : 1), beams === 6 ? COL.gold : COL.white, cl((DR0 + 6 - k) / 4, 0, 1), -0.08, '#062a4a') }
  if (k >= DR0 && k < C[8].at + 16) card(c, 'CHAIN REACTION!', cx, Ht * 0.28, 60 * u * (k - DR0 < 4 ? 1.4 - 0.1 * (k - DR0) : 1), COL.cyan, cl((C[8].at + 16 - k) / 6, 0, 1), -0.04, '#062a4a')
  if (k >= U.slow[0][0] && k < U.hit) card(c, 'ZERO…', cx, bar + 60 * u, 64 * u, COL.white, cl((k - U.slow[0][0]) / 6, 0, 1), -0.03, '#062a4a')
  if (za >= 1 && k < U.land) { const s = za < 6 ? 2.0 - 1.0 * easeO((za - 1) / 5) : 1; card(c, 'HOUR!!', cx, Ht * 0.3, 128 * u * s, COL.gold, cl((U.land - k) / 8, 0, 1), -0.05, '#2a1a00') }
  if (k >= U.land) {
    const a = cl((k - U.land) / 8, 0, 1) * cl((U.total - k) / 10, 0, 1)
    card(c, 'TIME’S UP.', cx, Ht - bar - 58 * u, 54 * u, COL.white, a, 0, COL.ink)
    card(c, '“' + DS.tagline + '”', cx, Ht - bar - 20 * u, 20 * u, COL.cyan, a, 0, COL.ink, 'Georgia, serif')
  }
  if (v.shown?.total > 0 && k >= C[0].at) card(c, `${v.shown.total} DMG`, Wd * 0.85, Ht - bar - 30 * u, 30 * u, '#ffffff', cl((U.total - k) / 10, 0, 1) * (k >= U.land ? 1 : 0.85), -0.04, '#062a4a')
  return true
}
registerCineScreen('dseyl_zero_hour', drawDseylUltScreen)   // ZERO HOUR screen overlay (hides the battle HUD while active)
