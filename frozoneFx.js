// FROZONE (frozone) — RENDER-ONLY: ice effects, Black Ice patch, skate ribbon, Chill pips, freeze shell, HUD, intro, ultimate
// presentation and audio cues. Reads sim state (f._frozone, the ultimate view, the owner's projectiles); never writes it.
// ART POLICY (docs/frozone/ICE_SYSTEM.md "Art"): EXTRACTED pieces = the supplied burst / burst2 / splash / spray / arc
// (assets/frozone/fx, original white pixels) and every body frame (skate streaks, disc, sweep sparks are baked into them).
// PROCEDURAL pieces = hard-edged polygons only: crystalline wedges / spikes, the lance, the patch sheet, the ribbon, the
// freeze shell, ramp wedges and rings — integer coordinates, no blur, no gradients, no shadows, a 4-colour palette per
// skin (FROZONE_FX_COLORS). Cosmetic ice never collides (the only hit volumes live in frozoneState).
// Bounded: images cached once per URL; no per-frame canvases / pixel reads / decoding; no Math.random. Shards use a
// fixed angle table. Reduced-motion / reduced-flashing → no pulsing, fewer shards.
import { sound } from './sound.js'
import { camera } from './camera.js'
import { juiceSettings } from './juiceSettings.js'
import { frozone as FZ, FROZONE_MOVES as MV, HAND, LANCE, BLACK_ICE, CHILL, FREEZE, ULT, RAIL, TRAIL, WALL } from './frozoneData.js'
import { FROZONE_PARTS as PA } from './frozoneSprites.js'
import { frozoneUltView, frozoneUltScene, INTRO, hasFzKit } from './frozoneState.js'
import { registerCineScreen } from './cineRegistry.js'
import { FROZONE_FX_COLORS } from './frozoneSkins.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const frozoneFxCacheSize = () => cache.size
const isFz = f => f?.rosterKey === 'frozone'
const tagOf = f => (f?._recolorTag && FROZONE_FX_COLORS[f._recolorTag]) ? f._recolorTag : null
export const colsOf = f => FROZONE_FX_COLORS[tagOf(f)] || FROZONE_FX_COLORS.default
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const elapsed = a => a.total - a.timer
const cl = (v, a, b) => Math.max(a, Math.min(b, v))
const R = Math.round
// supplied effect pieces resolve through the owner's skin (precomputed recolour of the white ice pixels)
const partUrl = (f, name) => { const t = tagOf(f); return t ? `./assets/frozone/skins/${t}/fx/${name}.png` : PA[name].sheet }
export const frozonePartUrl = partUrl
function part(c, f, name, x, y, { flip = 1, flipY = 1, alpha = 1, scale = 2 } = {}) {
  const A = PA[name]; if (!A || alpha <= 0.01) return
  const im = image(partUrl(f, name)); if (!ready(im)) return
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= cl(alpha, 0, 1)
  c.translate(R(x), R(y)); c.scale(flip, flipY)
  c.drawImage(im, 0, 0, A.width, A.height, -A.originX * scale, -A.originY * scale, A.width * scale, A.height * scale)
  c.restore()
}
// hard-edged polygon in the palette (no blur): fill + 2 px outline
function poly(c, pts, fill, line, alpha = 1, lw = 2) {
  if (alpha <= 0.01 || pts.length < 3) return
  c.save(); c.globalAlpha *= cl(alpha, 0, 1); c.beginPath(); c.moveTo(R(pts[0][0]), R(pts[0][1]))
  for (let i = 1; i < pts.length; i++) c.lineTo(R(pts[i][0]), R(pts[i][1]))
  c.closePath(); if (fill) { c.fillStyle = fill; c.fill() } if (line) { c.lineWidth = lw; c.lineJoin = 'miter'; c.strokeStyle = line; c.stroke() } c.restore()
}
function seg(c, x0, y0, x1, y1, col, lw = 2, alpha = 1) {
  c.save(); c.globalAlpha *= cl(alpha, 0, 1); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'square'
  c.beginPath(); c.moveTo(R(x0), R(y0)); c.lineTo(R(x1), R(y1)); c.stroke(); c.restore()
}
// one crystalline spike from (x, y) pointing along angle a (radians), length L, half-width w: faceted (core line)
function spike(c, P, x, y, a, L, w, alpha = 1) {
  const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux
  const tip = [x + ux * L, y + uy * L], b1 = [x + nx * w, y + ny * w], b2 = [x - nx * w, y - ny * w], mid = [x + ux * L * 0.45 + nx * w * 0.6, y + uy * L * 0.45 + ny * w * 0.6]
  poly(c, [b1, mid, tip, b2], P.ice[1], P.ice[0], alpha)
  seg(c, x, y, tip[0] - ux * 2, tip[1] - uy * 2, P.ice[2], 2, alpha)
}
// fixed shard table (deterministic): [angle, speed, size]
const SHARDS = [[-2.6, 7, 9], [-2.1, 9, 7], [-1.7, 10, 10], [-1.2, 9, 8], [-0.8, 8, 9], [-0.35, 7, 7], [0.2, 6, 8], [2.9, 6, 7], [-2.9, 5, 6], [-1.45, 12, 6], [-0.6, 11, 6], [-2.35, 11, 6]]
function shards(c, P, x, y, t, n, spread = 1, life = 26) {
  if (t >= life) return
  const k = calm() ? Math.min(n, 6) : n, al = 1 - t / life
  for (let i = 0; i < k; i++) {
    const [a, v, s] = SHARDS[i % SHARDS.length], px = x + Math.cos(a) * v * t * spread, py = y + Math.sin(a) * v * t * spread + 0.25 * t * t
    poly(c, [[px, py - s], [px + s * 0.6, py], [px, py + s * 0.8], [px - s * 0.6, py]], P.ice[2], P.ice[0], al)
  }
}
function ring(c, P, x, y, r, alpha = 1, flat = 0.32) {
  if (alpha <= 0.01) return
  c.save(); c.globalAlpha *= cl(alpha, 0, 1); c.strokeStyle = P.ice[1]; c.lineWidth = 4
  c.beginPath(); c.ellipse(R(x), R(y), Math.max(1, r), Math.max(1, r * flat), 0, 0, Math.PI * 2); c.stroke()
  c.strokeStyle = P.ice[3]; c.lineWidth = 2; c.beginPath(); c.ellipse(R(x), R(y), Math.max(1, r - 4), Math.max(1, (r - 4) * flat), 0, 0, Math.PI * 2); c.stroke(); c.restore()
}
const handAt = (f, key, d) => { const h = HAND[key] || [20, 60], front = d === 1 ? f.x + f.w : f.x; return [front + d * h[0], f.y + f.h - h[1]] }

// ── NORMALS / SPECIAL STRIKES: the ice follows the move's own elapsed time (pooled; no entity) ──
function drawMoveIce(c, f, P) {
  const a = f.attacking ? f.currentAttack : null, m = a?.fz; if (!m) return
  const md = MV[m.key]; if (!md) return
  const t = elapsed(a), d = m.dir, st = md.startup, act = md.active, feet = f.y + f.h
  const on = t >= st - 1 && t < st + act + 4, u = cl((t - st + 2) / (act + 2), 0, 1), fade = t >= st + act ? 1 - (t - st - act) / 5 : 1
  const [hx, hy] = handAt(f, m.key, d), ang = d === 1 ? 0 : Math.PI
  switch (md.ice) {
    case 'jab': if (on) spike(c, P, hx, hy, ang, 24 + 26 * u, 6, fade); break
    case 'jab2': if (on) { spike(c, P, hx, hy - 6, ang - d * 0.12, 30 + 28 * u, 6, fade); spike(c, P, hx, hy + 6, ang + d * 0.1, 22 + 24 * u, 5, fade) } break
    case 'burst': if (on) { for (const k of [-0.5, -0.2, 0.1, 0.4]) spike(c, P, hx, hy, ang + d * k, 22 + 40 * u * (1 - Math.abs(k)), 6, fade); part(c, f, 'burst', hx + d * 30, hy + 30, { flip: d, alpha: fade, scale: 1 }) } break
    case 'sweep': if (t >= st && t < st + act + 8) seg(c, f.x + f.w / 2, feet - 2, hx, feet - 2, P.ice[2], 3, fade * 0.9); break
    case 'wedge': case 'ultOpen': if (on) {
      const L = 40 + 52 * u, w = 13
      poly(c, [[hx, hy - w], [hx + d * L * 0.6, hy - w * 1.1], [hx + d * L, hy], [hx + d * L * 0.6, hy + w * 1.1], [hx, hy + w]], P.ice[1], P.ice[0], fade)
      seg(c, hx, hy, hx + d * (L - 4), hy, P.ice[3], 2, fade); seg(c, hx + d * L * 0.2, hy - w * 0.7, hx + d * L * 0.6, hy - w * 0.2, P.ice[2], 2, fade)
    } break
    case 'riseWedge': {
      if (t < st - 3 || t > st + act + 10) break
      const k = cl((t - st + 3) / (act + 3), 0, 1), x0 = f.x + (d === 1 ? f.w : 0) + d * 30
      for (const [dx, h] of [[0, 120], [26, 86], [-20, 70], [46, 54]]) { const H = h * k * fade, x = x0 + d * dx; poly(c, [[x - 10, feet], [x - 4, feet - H * 0.7], [x, feet - H], [x + 5, feet - H * 0.6], [x + 10, feet]], P.ice[1], P.ice[0], fade) }
      if (t >= st && t < st + 6) part(c, f, 'burst2', x0, feet, { flip: d, alpha: fade })
    } break
    case 'airBurst': if (on) { spike(c, P, hx, hy, ang, 30 + 30 * u, 7, fade); spike(c, P, hx, hy, ang + d * 0.35, 22 + 18 * u, 5, fade); spike(c, P, hx, hy, ang - d * 0.35, 22 + 18 * u, 5, fade) } break
    case 'drop': if (t >= st - 2 && t < st + act) { const x = ctrX(f); spike(c, P, x - 10, feet - 10, Math.PI / 2 + 0.2, 46, 9); spike(c, P, x + 10, feet - 10, Math.PI / 2 - 0.2, 40, 8) } break
    case 'rush': if (on) { spike(c, P, hx, hy - 18, ang - d * 0.25, 40 + 30 * u, 8, fade); spike(c, P, hx, hy - 30, ang, 50 + 40 * u, 9, fade); part(c, f, 'spray', hx + d * 26, feet, { flip: d, alpha: fade }) } break
    case 'rise': if (t >= md.liftAt - 2 && t < st + act + 8) {   // the ice column that throws him up (anchored to the takeoff floor)
      const s = f._frozone, floor = s?.floor ?? feet, x = ctrX(f), H = cl(floor - feet, 0, 260), al = t > st + act ? 1 - (t - st - act) / 8 : 1
      if (H > 4) { poly(c, [[x - 18, floor], [x - 12, feet], [x + 12, feet], [x + 18, floor]], P.ice[1], P.ice[0], al * 0.9); seg(c, x - 4, floor - 4, x - 4, feet + 4, P.ice[2], 2, al) }
      if (t >= st && t < st + act) for (const k of [-0.6, -0.2, 0.2, 0.6]) spike(c, P, x, f.y + 20, -Math.PI / 2 + k, 30 + 20 * u, 6, fade)
    } break
    case 'breaker': if (t >= st - 4 && t < st + act + 8) {
      const k = cl((t - st + 4) / 6, 0, 1), al = t > st + act ? 1 - (t - st - act) / 8 : 1
      for (const [o, L, w] of [[-0.55, 46, 9], [-0.25, 70, 11], [0, 92, 14], [0.25, 70, 11], [0.55, 46, 9]]) spike(c, P, hx, hy, ang + d * o, L * k, w, al)
      if (t >= st && t < st + 6) { part(c, f, 'burst', hx + d * 60, hy + 34, { flip: d, alpha: al }); part(c, f, 'burst2', hx + d * 40, hy + 40, { flip: -d, alpha: al }) }
    } break
  }
  // Glacier Rush: the supplied disc frames carry the board; a short spray off the board while travelling
  if (m.key === 'fRush' && md.travel && t >= md.travel[0] && t < md.travel[1] && (t & 3) === 0) part(c, f, 'splash', f.x + (d === 1 ? 0 : f.w), feet, { flip: -d, alpha: 0.85 })
  // Ice Lance / Black Ice cast: a small crystal forming in the hand before release
  if ((m.key === 'fLance' || m.key === 'fBlackIce') && t < md.releaseAt) { const k = t / md.releaseAt; poly(c, [[hx, hy - 6 * k], [hx + d * 6 * k, hy], [hx, hy + 6 * k], [hx - d * 6 * k, hy]], P.ice[2], P.ice[0]) }
}
// guard: a small hexagonal ice plate in front of the braced casting pose (cosmetic; the shared guard rules apply)
function drawGuard(c, f, P) {
  if (!f.isBlocking || f.attacking) return
  const d = f.facing || 1, [hx, hy] = handAt(f, 'guard', d), r = 26, x = hx + d * 6
  poly(c, [[x, hy - r], [x + d * r * 0.5, hy - r * 0.5], [x + d * r * 0.5, hy + r * 0.5], [x, hy + r], [x - d * r * 0.3, hy + r * 0.5], [x - d * r * 0.3, hy - r * 0.5]], P.ice[1], P.ice[0], f.blockstun > 0 ? 0.95 : 0.7)
  seg(c, x, hy - r + 6, x, hy + r - 6, P.ice[3], 2, 0.8)
}
// projectiles the sim owns — the engine draws them invisible (blank sheet); their art is here
function drawShots(c, f, P, W) {
  for (const p of (W?.projectiles || [])) {
    const k = p?.owner === f && p._fz; if (!k || k.kind !== 'lance') continue
    const d = p.vx >= 0 ? 1 : -1, L = k.frost ? 86 : 60, w = k.frost ? 13 : 6, x = p.x, y = p.y
    poly(c, [[x - d * L * 0.5, y], [x - d * L * 0.2, y - w], [x + d * L * 0.5, y], [x - d * L * 0.2, y + w]], P.ice[1], P.ice[0])
    seg(c, x - d * L * 0.45, y, x + d * L * 0.42, y, P.ice[3], 2)
    if (k.frost) { spike(c, P, x - d * 10, y - 8, d === 1 ? -0.5 : Math.PI + 0.5, 20, 5); spike(c, P, x - d * 10, y + 8, d === 1 ? 0.5 : Math.PI - 0.5, 20, 5) }
    for (let i = 1; i <= 3; i++) seg(c, x - d * (L * 0.5 + i * 10), y + ((i & 1) ? -3 : 3), x - d * (L * 0.5 + i * 10 - 6), y + ((i & 1) ? -3 : 3), P.ice[2], 2, 0.8 - i * 0.2)
  }
}
// Black Ice: a flat crystalline sheet ON the floor, always outlined (never an invisible hazard)
function drawPatch(c, f, s, P) {
  const p = s.patch; if (!p) return
  const x0 = p.x - p.w / 2, x1 = p.x + p.w / 2, y = p.floor, life = BLACK_ICE.life, warn = p.t > life - 60
  const al = p.t < 8 ? p.t / 8 : warn && !calm() ? ((p.t >> 3) & 1 ? 0.55 : 0.9) : 0.9
  poly(c, [[x0, y], [x0 + 10, y - 7], [x1 - 10, y - 7], [x1, y], [x1 - 8, y + 3], [x0 + 8, y + 3]], P.ice[0], P.ice[2], al, 2)
  for (let i = 0; i < 4; i++) { const xx = x0 + 18 + i * (p.w - 36) / 3; seg(c, xx, y - 4, xx + 10, y - 1, P.ice[3], 2, al) }
}
// the decorative skate ribbon (owner's recent feet points; bright after a Skate Switch / during the ultimate)
function drawTrail(c, f, s, P) {
  const T = s.trail; if (!T || T.length < 2) return
  for (let i = 1; i < T.length; i++) {
    const a = T[i - 1], b = T[i]; if (Math.abs(a.x - b.x) > 60 || Math.abs(a.y - b.y) > 40) continue
    const al = Math.max(0, 1 - b.t / 30) * 0.9, bright = b.b
    seg(c, a.x, a.y - 2, b.x, b.y - 2, bright ? P.ice[3] : P.ice[1], bright ? 5 : 4, al)
    seg(c, a.x, a.y + 1, b.x, b.y + 1, P.accent || P.ice[0], 2, al)
  }
}
// ── 2026-11-15 mobility kit: persistent ice (Ice Flash trails / Ice Rails), Ice Wall, Ice Glider board, flash streak ──
const fadeOf = (q, warn) => { const left = q.life - q.t; if (q.t < 4) return q.t / 4; if (left < warn) return calm() ? 0.6 : ((q.t >> 2) & 1 ? 0.35 : 0.85); return 0.92 }
function drawIceObjects(c, f, s, P) {
  for (const q of (s.ice || [])) {
    if (q.kind === 'trail') {
      const al = fadeOf(q, TRAIL.warn)
      poly(c, [[q.x0, q.y0 + 1], [q.x0 + q.dir * 8, q.y0 - 5], [q.x1 - q.dir * 8, q.y1 - 5], [q.x1, q.y1 + 1], [q.x1 - q.dir * 6, q.y1 + 4], [q.x0 + q.dir * 6, q.y0 + 4]], P.ice[0], P.ice[2], al * 0.85, 2)
      const n = Math.max(1, Math.floor(Math.abs(q.x1 - q.x0) / 40))
      for (let i = 0; i < n; i++) { const x = q.x0 + (q.x1 - q.x0) * (i + 0.5) / n; seg(c, x - 8, q.y0 - 3, x + 6, q.y0, P.ice[3], 2, al) }
    } else if (q.kind === 'rail') {
      const al = fadeOf(q, RAIL.warn), L = Math.hypot(q.x1 - q.x0, q.y1 - q.y0) || 1, nx = -(q.y1 - q.y0) / L, ny = (q.x1 - q.x0) / L
      const s1 = ny < 0 ? -1 : 1   // underside normal points down
      poly(c, [[q.x0, q.y0 - 3], [q.x1, q.y1 - 3], [q.x1 + nx * 9 * s1, q.y1 + ny * 9 * s1], [q.x0 + nx * 9 * s1, q.y0 + ny * 9 * s1]], P.ice[1], P.ice[0], al, 2)
      seg(c, q.x0, q.y0 - 3, q.x1, q.y1 - 3, P.ice[3], 2, al)
      const n = Math.max(2, Math.floor(L / 46))   // hanging crystal teeth under the rail
      for (let i = 1; i < n; i++) { const k = i / n, x = q.x0 + (q.x1 - q.x0) * k, y = q.y0 + (q.y1 - q.y0) * k; spike(c, P, x, y + 6, Math.PI / 2, 14, 4, al * 0.8) }
    }
  }
  const w = s.wall
  if (w) {
    const h = WALL.h * Math.min(1, (w.t + 1) / WALL.rise), x0 = w.x - WALL.w / 2, x1 = w.x + WALL.w / 2, y1 = w.floor, y0 = y1 - h
    const left = WALL.life - w.t, al = left < 40 && !calm() ? ((w.t >> 2) & 1 ? 0.5 : 0.9) : 0.92
    poly(c, [[x0 - 6, y1], [x0, y0 + 18], [w.x - 4, y0], [x1 + 2, y0 + 10], [x1 + 6, y1]], P.ice[1], P.ice[0], al, 3)
    poly(c, [[x0 + 4, y1 - 4], [x0 + 6, y0 + 26], [w.x, y0 + 12], [w.x + 2, y1 - 4]], P.ice[2], null, al * 0.5)
    seg(c, w.x - 2, y0 + 8, w.x - 6, y1 - 6, P.ice[3], 2, al)
    for (let i = 0; i < WALL.hp - w.hp; i++) seg(c, x0 + 4, y0 + 30 + i * 28, x1 - 2, y0 + 44 + i * 30, P.ice[3], 2, al)   // cracks per blocked shot
  }
}
function drawBoard(c, f, s, P) {
  if (!(s.glide || s.ride || s.stream)) return
  const feet = f.y + f.h, x = ctrX(f), d = f.facing || 1
  let ang = 0
  const rn = s.ride?.n ?? s.stream?.seg
  if (rn != null) { const q = s.ice.find(i => i.n === rn); if (q && (q.x1 !== q.x0 || q.y1 !== q.y0)) ang = Math.atan2(q.y1 - q.y0, q.x1 - q.x0) - (q.dir === -1 ? Math.PI : 0) }
  c.save(); c.translate(R(x), R(feet)); c.rotate(ang)
  poly(c, [[-38, 2], [-30, -4], [30, -4], [42, 0], [30, 7], [-30, 7]], P.ice[1], P.ice[0], 0.95, 2)
  seg(c, -26, -1, 26, -1, P.ice[3], 2, 0.9)
  c.restore()
  if (!calm() && (s.tick & 3) === 0) part(c, f, 'splash', x - d * 34, feet + 4, { flip: -d, alpha: 0.6, scale: 1 })
}
function drawFlash(c, f, s, P) {
  const z = s.flashFx; if (!z) return
  const al = 1 - z.t / 14, d = z.dir
  for (const [dy, lw] of [[-18, 5], [-48, 7], [-80, 4]]) seg(c, z.x0, z.y + dy, z.x1 - d * 20, z.y + dy, P.ice[(dy === -48) ? 3 : 1], lw, al * 0.85)
  for (let i = 0; i < 4; i++) { const k = (i + 1) / 5, x = z.x0 + (z.x1 - z.x0) * k; spike(c, P, x, z.y - 50, d === 1 ? Math.PI : 0, 26 * al + 6, 5, al * (1 - k * 0.5)) }
}

// FREEZE SHELL: translucent faceted crystal around the opponent's DRAWN body; the silhouette stays visible inside it
function shellRect(t) {
  const x = t._lastDrawX ?? t.x - 20, y = t._lastDrawY ?? t.y - 20, w = t._lastDrawW ?? (t.w || 48) + 40, h = t._lastDrawH ?? (t.h || 94) + 30
  return { x: Math.min(x, t.x - 8), y: Math.min(y, t.y - 12), w: Math.max(w, (t.w || 48) + 16), h: Math.max(h, (t.h || 94) + 16) }
}
function drawShell(c, P, t, k, big = false, alpha = 1) {
  const r = shellRect(t), pad = big ? 18 : 8, x0 = r.x - pad, x1 = r.x + r.w + pad, y0 = r.y - pad, y1 = Math.max(r.y + r.h, t.y + (t.h || 94)) + 2, cx = (x0 + x1) / 2
  const pts = [[cx, y0 - (big ? 24 : 12)], [x1, y0 + 18], [x1 + (big ? 10 : 4), (y0 + y1) / 2], [x1 - 4, y1], [x0 + 4, y1], [x0 - (big ? 10 : 4), (y0 + y1) / 2], [x0, y0 + 18]]
  poly(c, pts, P.ice[2], null, 0.32 * alpha)
  poly(c, pts, null, P.ice[0], alpha, 3)
  seg(c, cx, y0 - (big ? 18 : 8), cx - 10, y1 - 8, P.ice[3], 2, 0.75 * alpha)
  seg(c, x0 + 8, y0 + 26, cx + 12, (y0 + y1) / 2, P.ice[1], 2, 0.75 * alpha)
  seg(c, x1 - 8, y0 + 30, cx - 6, y1 - 30, P.ice[1], 2, 0.6 * alpha)
  if (!calm() && (k & 15) < 3) seg(c, x0 + 10, y0 + 20, x0 + 22, y0 + 8, P.ice[3], 3, alpha)   // fixed glint (no randomness)
}
function drawChill(c, f, s, P, W, p1, p2) {
  for (const t of [p1, p2]) {
    if (!t || t === f) continue
    const side = t.side || t.playerNumber || 0, ch = s.chill[side]
    if (s.freeze && s.freeze.side === side) {
      const rem = s.freeze.until - s.clock
      drawShell(c, P, t, s.clock, false, rem < 6 && !calm() ? 0.6 + 0.4 * (rem & 1) : 1)
    }
    const immune = (s.immune[side] || 0) > s.clock
    if (!ch && !immune) continue
    const x = ctrX(t), y = (t._lastDrawY ?? t.y) - 16
    for (let i = 0; i < CHILL.max; i++) {
      const px = x + (i - 1) * 16, on = ch && i < ch.n
      poly(c, [[px, y - 7], [px + 6, y], [px, y + 7], [px - 6, y]], on ? P.ice[2] : 'rgba(10,20,30,0.55)', immune ? '#8a96a8' : P.ice[0], 1, 2)
    }
  }
}
function label(c, x, y, text, col, al = 1) {
  if (al <= 0) return
  c.save(); c.globalAlpha = cl(al, 0, 1); c.font = '900 16px Arial'; c.textAlign = 'center'
  c.fillStyle = '#06101a'; c.fillText(text, x + 1, y + 1); c.fillStyle = col; c.fillText(text, x, y); c.restore()
}
function drawEvents(c, f, s, P) {
  for (const e of s.fx) {
    const t = e.t
    if (e.kind === 'chip') { if (t < 6) part(c, f, 'splash', e.x, e.y + 10, { flip: e.dir, alpha: 1 - t / 6, scale: 1 }) }
    else if (e.kind === 'crack') { if (t < 8) part(c, f, 'burst2', e.x, e.y + 30, { flip: e.dir, alpha: 1 - t / 8 }); shards(c, P, e.x, e.y, t, 6, 0.8, 18) }
    else if (e.kind === 'frostHit') { if (t < 8) part(c, f, 'burst', e.x, e.y + 30, { flip: e.dir, alpha: 1 - t / 8 }); shards(c, P, e.x, e.y, t, 6, 0.8, 18) }
    else if (e.kind === 'freezeOn') { ring(c, P, e.x, e.y + 40, 20 + t * 4, 1 - t / 16); if (t < 24) label(c, e.x, e.y - 70 - t, 'FREEZE', P.hud[1], 1 - t / 24) }
    else if (e.kind === 'thaw') shards(c, P, e.x, e.y, t, 5, 0.6, 16)
    else if (e.kind === 'shatter') { if (t < 6) part(c, f, 'burst', e.x, e.y + 34, { alpha: 1 - t / 6 }); shards(c, P, e.x, e.y, t, 12, 1.1, 28); ring(c, P, e.x, e.y + 46, 16 + t * 5, 1 - t / 18); if (t < 26) label(c, e.x, e.y - 76 - t, 'SHATTER', P.hud[1], 1 - t / 26) }
    else if (e.kind === 'patchForm') { if (t < 10) part(c, f, 'spray', e.x, e.y, { flip: e.dir, alpha: 1 - t / 10 }) }
    else if (e.kind === 'patchSnap') { if (t < 10) part(c, f, 'burst2', e.x, e.y, { flip: e.dir, alpha: 1 - t / 10 }); shards(c, P, e.x, e.y - 20, t, 6, 0.7, 16) }
    else if (e.kind === 'switch') { ring(c, P, e.x, e.y, 30 + t * 5, 1 - t / 14); if (t < 10) part(c, f, 'arc', e.x, e.y, { flip: e.dir, alpha: 1 - t / 10 }) }
    else if (e.kind === 'melt') { if (t < 16) seg(c, e.x - 40 + t * 2, e.y, e.x + 40 - t * 2, e.y, P.ice[1], 3, 1 - t / 16) }
    else if (e.kind === 'spray') { if (t < 12) { part(c, f, 'arc', e.x, e.y, { flip: e.dir, alpha: 1 - t / 12 }); part(c, f, 'spray', e.x + e.dir * 18, e.y, { flip: e.dir, alpha: 1 - t / 12, scale: 1 }) } }
    else if (e.kind === 'slice') {
      const L = Math.min(1, t / 4) * 70, al = t < 16 ? 1 - t / 16 : 0
      if (al > 0) { seg(c, e.x - e.dir * L, e.y - L * 0.7, e.x + e.dir * L, e.y + L * 0.7, P.ice[3], 5, al); seg(c, e.x - e.dir * L * 0.8, e.y + L * 0.5, e.x + e.dir * L * 0.8, e.y - L * 0.5, P.ice[1], 4, al * 0.9) }
      shards(c, P, e.x, e.y, t, 10, 1, 24)
    }
    else if (e.kind === 'puff') { if (t < 10) part(c, f, 'splash', e.x, e.y + 6, { alpha: 1 - t / 10 }) }
    else if (e.kind === 'riseBurst') { if (t < 10) part(c, f, 'burst2', e.x, e.y, { flip: e.dir, alpha: 1 - t / 10 }) }
    else if (e.kind === 'landBurst') { ring(c, P, e.x, e.y, 18 + t * 4, 1 - t / 12); if (t < 8) part(c, f, 'spray', e.x, e.y, { flip: e.dir, alpha: 1 - t / 8 }) }
    else if (e.kind === 'ultBurst') {
      if (t < 8) { part(c, f, 'burst', e.x - 20, e.y + 50, { scale: 3, alpha: 1 - t / 8 }); part(c, f, 'burst2', e.x + 24, e.y + 50, { scale: 3, flip: -1, alpha: 1 - t / 8 }) }
      shards(c, P, e.x, e.y, t, 12, 1.6, 34); ring(c, P, e.x, e.y + 50, 30 + t * 9, 1 - t / 30, 0.28)
    }
  }
}

// ── ULTIMATE presentation (world) ──
// Timeline (frozoneData ULT): cast (vapour pulled out of the air, freezing breath) → BEAM from his hands that locks the
// foe's feet in ice → the floor freezes and the ramp erupts → three skating passes (each adds a layer of ice to the foe,
// hit-stop + slash) → he leaps off the ramp while the foe is sealed in a giant ICE MONOLITH (slow motion) → dive →
// SHATTER (hit-stop, fragments, shockwaves, spike field, diamond dust) → the cool pose. Everything is a pure function of
// the view (frame / hold / tick) + fixed hash tables: no state, no randomness.
let XF = null   // world → screen (DOMMatrix) recorded by the world pass, read by the screen overlay
const toScreen = (x, y) => XF ? { x: XF.a * x + XF.c * y + XF.e, y: XF.b * x + XF.d * y + XF.f } : null
const hh = i => { let x = (Math.imul(i | 0, 374761393) + 668265263) >>> 0; x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296 }
const easeO = u => 1 - (1 - u) * (1 - u)
const easeB = u => { const s = 1.7; u -= 1; return 1 + u * u * ((s + 1) * u + s) }   // overshoot
// how much ice coats the captive (0 → feet only → whole body), by beat
function encase(v) {
  const k = v.frame, U = ULT
  if (k < U.lock) return 0
  let fr = 0.3; for (let i = 0; i < 3; i++) { const at = U.contacts[i].at; if (k >= at) fr = 0.3 + 0.24 * (i + Math.min(1, (k - at + 1) / 6)) }
  return Math.min(1, fr)
}
function drawShellPart(c, P, t, k, frac, big) {
  if (frac <= 0) return
  const r = shellRect(t), y1 = Math.max(r.y + r.h, t.y + (t.h || 94)) + 4, y0 = r.y - 40
  c.save(); c.beginPath(); c.rect(r.x - 80, y1 - (y1 - y0) * frac, r.w + 160, (y1 - y0) * frac + 8); c.clip()
  drawShell(c, P, t, k, big, 1); c.restore()
  if (frac < 1) { const yy = y1 - (y1 - y0) * frac; for (let i = 0; i < 5; i++) spike(c, P, r.x - 6 + i * (r.w + 12) / 4, yy + 6, -Math.PI / 2 + (i - 2) * 0.25, 10 + 8 * hh(i + k), 4, 0.9) }
}
// the giant ice monolith around the captive: grows from the floor, faceted, a glint sweeps it, cracks before the shatter
function monolithPts(v, g) {
  const cx = v.tx, b = v.feet, w = v.tW + 150, H = v.tH * 3.2 * g
  return [[cx - w / 2, b], [cx - w / 2 - 12, b - H * 0.55], [cx - w * 0.3, b - H * 0.9], [cx - w * 0.04, b - H], [cx + w * 0.2, b - H * 0.92], [cx + w / 2 + 10, b - H * 0.6], [cx + w / 2, b]]
}
function drawMonolith(c, f, P, v) {
  const U = ULT, k = v.frame, g = easeB(cl((k - U.mono) / U.monoGrow, 0, 1)), pts = monolithPts(v, g), cx = v.tx, b = v.feet, w = v.tW + 150, H = v.tH * 3.2 * g
  poly(c, pts, P.ice[2], null, 0.5)
  poly(c, [pts[0], pts[1], pts[2], [cx - w * 0.12, b - H * 0.5], [cx - w * 0.2, b]], P.ice[1], null, 0.45)
  poly(c, [[cx + w * 0.05, b], [cx + w * 0.12, b - H * 0.55], pts[4], pts[5], pts[6]], P.ice[3], null, 0.22)
  poly(c, pts, null, P.ice[0], 1, 4); poly(c, pts, null, P.ice[3], 0.8, 2)
  seg(c, pts[3][0], pts[3][1], cx - w * 0.12, b - H * 0.5, P.ice[3], 2, 0.7); seg(c, cx - w * 0.12, b - H * 0.5, cx - w * 0.2, b, P.ice[1], 2, 0.6)
  seg(c, pts[4][0], pts[4][1], cx + w * 0.12, b - H * 0.55, P.ice[3], 2, 0.6)
  if (!calm()) {   // a hard glint band sweeping up the faces
    const u = ((k - U.mono) % 40) / 40, gy = b - H * (u * 1.4 - 0.2)
    c.save(); c.beginPath(); c.moveTo(R(pts[0][0]), R(pts[0][1])); for (const p of pts) c.lineTo(R(p[0]), R(p[1])); c.closePath(); c.clip()
    poly(c, [[cx - w, gy + 40], [cx + w, gy - 40], [cx + w, gy - 22], [cx - w, gy + 58]], '#ffffff', null, 0.35); c.restore()
  }
  for (let i = 0; i < 6; i++) { const sx = cx - w / 2 - 20 + i * (w + 40) / 5; spike(c, P, sx, b, -Math.PI / 2 + (i - 2.5) * 0.22, (28 + 30 * hh(i + 7)) * g, 8, 1) }
  // cracks spread from the side he dives at, from the dive to the strike
  if (k >= U.dive - 2) {
    const u = cl((k - U.dive + 2) / (U.shatter - U.dive + 2), 0, 1), d = v.dir, sx = cx + d * w / 2, sy = b - v.tH * 0.6
    for (let i = 0; i < 7; i++) {
      let x = sx, y = sy; const a0 = Math.PI + (d === 1 ? 0 : Math.PI) + (i - 3) * 0.42
      for (let j = 0; j < 4; j++) { const L = 26 * u * (1 + hh(i * 9 + j)), a = a0 + (hh(i * 7 + j + 3) - 0.5) * 0.9; const nx = x + Math.cos(a) * L * (d === 1 ? 1 : 1), ny = y + Math.sin(a) * L; seg(c, x, y, nx, ny, '#ffffff', 3, 0.95); x = nx; y = ny }
    }
  }
}
// fragments of the monolith after the shatter (ballistic, fixed tables)
function drawFragments(c, P, v, a) {
  const cx = v.tx, b = v.feet, w = v.tW + 150, H = v.tH * 3.2, d = v.dir, n = calm() ? 12 : 28
  for (let i = 0; i < n; i++) {
    const ox = cx + (hh(i) - 0.5) * w, oy = b - hh(i + 50) * H, vx = -d * (1.5 + 7 * hh(i + 100)) + (hh(i + 150) - 0.5) * 7, vy = -(3 + 10 * hh(i + 200))
    let x = ox + vx * a * 1.5, y = oy + vy * a * 1.5 + 0.32 * a * a
    if (y > b - 4) y = b - 4
    const s = 10 + 26 * hh(i + 250), rot = a * (hh(i + 300) - 0.5) * 0.35 + i, al = a < 46 ? 1 : 1 - (a - 46) / 18
    if (al <= 0) continue
    const q = [0, 2.6, 3.7].map((t, j) => { const rr = s * (j ? 0.45 + 0.3 * hh(i * 4 + j) : 1.1); return [x + Math.cos(t + rot) * rr, y + Math.sin(t + rot) * rr] })   // long crystal splinters
    poly(c, q, j2(i) ? P.ice[2] : P.ice[3], P.ice[0], al, 2)
  }
}
const j2 = i => (i & 1) === 1
function drawUlt(c, f, v, P, layer) {
  const U = ULT, k = v.frame, d = v.dir, floor = v.feet, tx = v.tx, Rr = U.ramp.r, t = v.target
  try { XF = c.getTransform() } catch (_) { XF = null }
  const sa = k - U.shatter   // age after the shatter (≥ 0)
  if (layer === 'under') {
    // the frozen street: a thin sheet under him while he casts, then it races out from the captive once the beam locks
    const spread = k < U.lock ? cl(k / U.beam, 0, 1) * 70 : 70 + easeO(cl((k - U.lock) / 18, 0, 1)) * 640
    const fx0 = k < U.lock ? ctrX(f) : tx, al = k > U.total - 30 ? (U.total - k) / 30 : 1
    poly(c, [[fx0 - spread, floor], [fx0 - spread + 14, floor - 7], [fx0 + spread - 14, floor - 7], [fx0 + spread, floor], [fx0 + spread - 10, floor + 5], [fx0 - spread + 10, floor + 5]], P.ice[0], P.ice[2], 0.85 * al)
    for (let i = 0; i < 10; i++) { const x = fx0 + (i - 4.5) * spread / 5; seg(c, x - 18, floor - 3, x + 22, floor - 3, P.ice[3], 2, 0.6 * al) }
    // the ramp: a ring of jagged wedges erupting around the captive at the lock, holds, blown apart by the shatter
    const rise = k < U.lock ? 0 : k < U.lock + 10 ? easeB((k - U.lock) / 10) : sa < 0 ? 1 : Math.max(0, 1 - sa / 6)
    if (rise > 0) for (let i = 0; i < 11; i++) {
      const a = Math.PI + i / 10 * Math.PI, x = tx + Math.cos(a) * Rr * 1.05, h = (34 + 46 * Math.abs(Math.sin(a)) + 16 * hh(i)) * rise
      poly(c, [[x - 18, floor], [x - 9, floor - h], [x + 2, floor - h * 1.1], [x + 8, floor - h * 0.8], [x + 18, floor]], P.ice[1], P.ice[0], 0.95)
      seg(c, x - 6, floor - 4, x - 2, floor - h * 0.95, P.ice[3], 2, 0.8)
    }
    // spike field erupting outward from the shatter
    if (sa >= 0 && sa < 60) for (let j = 0; j < 9; j++) for (const sd of [-1, 1]) {
      const age = sa - j * 1.2; if (age < 0) continue
      const x = tx + sd * (70 + j * 48), up = age < 5 ? easeB(age / 5) : Math.max(0, 1 - (age - 18) / 24)
      if (up > 0) spike(c, P, x, floor + 2, -Math.PI / 2 + sd * (0.18 + 0.05 * j), (70 - j * 5) * up, 11 - j * 0.6, 1)
    }
    return
  }
  // ── over the fighters ──
  const hand = handAt(f, 'ultOpen', f.facing || d), body = [tx, floor - v.tH * 0.55]
  // CAST: moisture pulled out of the air into his hands + freezing breath
  if (k < U.beam + 4) {
    const al = k < 6 ? k / 6 : 1
    for (let i = 0; i < (calm() ? 6 : 14); i++) {
      const a = i / 14 * Math.PI * 2 + k * 0.04, ph = ((k * 3 + i * 17) % 48) / 48, r = 190 * (1 - ph)
      const x = hand[0] + Math.cos(a) * r, y = hand[1] + Math.sin(a) * r * 0.7
      seg(c, x, y, x - Math.cos(a) * 22, y - Math.sin(a) * 22 * 0.7, i & 1 ? P.ice[3] : P.ice[2], 2, al * (0.3 + 0.7 * ph))
    }
    const g = cl(k / U.beam, 0, 1), sp = k * 0.12
    for (let i = 0; i < 6; i++) spike(c, P, hand[0], hand[1], sp + i * Math.PI / 3, 6 + 22 * g, 3 + 3 * g, al)
    if (k >= 14 && k < 40) for (let i = 0; i < 3; i++) { const u = (k - 14 - i * 4) / 18; if (u > 0 && u < 1) part(c, f, 'splash', ctrX(f) + (f.facing || d) * (16 + 40 * u), f.y + 20 - 12 * u, { flip: f.facing || d, alpha: 0.8 * (1 - u), scale: 1 + u }) }
  }
  // BEAM: hands → captive; locks the feet; leaves a frozen bridge
  if (k >= U.beam && k < U.skate) {
    const u = cl((k - U.beam) / 5, 0, 1), fade = k < U.lock + 4 ? 1 : 1 - (k - U.lock - 4) / (U.skate - U.lock - 4)
    const ex = hand[0] + (body[0] - hand[0]) * u, ey = hand[1] + (body[1] - hand[1]) * u, L = Math.hypot(ex - hand[0], ey - hand[1]) || 1
    const ux = (ex - hand[0]) / L, uy = (ey - hand[1]) / L, nx = -uy, ny = ux, W0 = (k < U.lock ? 16 + 4 * ((k & 1) ? 1 : 0) : 22) * fade
    const top = [], bot = []
    for (let s = 0; s <= 10; s++) { const q = s / 10, j = 0.6 + 0.6 * hh(s + k * 3), px = hand[0] + ux * L * q, py = hand[1] + uy * L * q; top.push([px + nx * W0 * j, py + ny * W0 * j]); bot.unshift([px - nx * W0 * j, py - ny * W0 * j]) }
    poly(c, [...top, ...bot], P.ice[1], P.ice[0], 0.92 * fade, 3)
    seg(c, hand[0], hand[1], ex, ey, P.ice[3], Math.max(2, W0 * 0.6), fade)
    for (let s = 1; s < 8; s++) { const q = s / 8; if (q > u) break; const px = hand[0] + ux * L * q, py = hand[1] + uy * L * q, side = s & 1 ? 1 : -1; spike(c, P, px, py, Math.atan2(ny * side, nx * side) + (hh(s) - 0.5) * 0.6, (14 + 16 * hh(s + 9)) * fade, 4, fade) }
    if (u >= 1) for (let i = 0; i < 8; i++) spike(c, P, ex, ey, i * Math.PI / 4 + k * 0.05, (18 + 30 * cl((k - U.beam - 5) / 6, 0, 1)) * fade, 6, fade)
    if (k >= U.lock && k < U.lock + 12) { ring(c, P, tx, floor, 30 + (k - U.lock) * 14, 1 - (k - U.lock) / 12, 0.25); if (k < U.lock + 6) part(c, f, 'burst', tx, floor, { scale: 3, alpha: 1 - (k - U.lock) / 6 }) }
  }
  // the captive's ice coat, layer by layer (until the monolith swallows it)
  if (t && k >= U.lock && sa < 0) drawShellPart(c, P, t, k, encase(v), k >= U.contacts[2].at)
  // SKATE PASSES: slash + burst + shards at each crossing (frozen during the hit-stop)
  for (let i = 0; i < 3; i++) {
    const at = U.contacts[i].at, a = k - at; if (a < 0 || a >= 14) continue
    const al = 1 - a / 14, Ls = (90 + 30 * i) * (a === 0 ? 1 : 1 + a * 0.05), cy = floor - v.tH * 0.55, sgn = i & 1 ? -1 : 1
    seg(c, tx - Ls, cy - sgn * Ls * 0.5, tx + Ls, cy + sgn * Ls * 0.5, P.ice[1], 12 + 2 * i, al); seg(c, tx - Ls, cy - sgn * Ls * 0.5, tx + Ls, cy + sgn * Ls * 0.5, '#ffffff', 5, al)
    seg(c, tx - 260, cy + 8, tx + 260, cy + 8, P.ice[3], 3, al * 0.8)
    if (a < 8) part(c, f, i & 1 ? 'burst2' : 'burst', tx, floor - 10, { scale: 3 + i * 0.5, flip: sgn, alpha: 1 - a / 8 })
    shards(c, P, tx, cy, a, 12, 1 + 0.25 * i, 22); ring(c, P, tx, floor, 24 + a * (10 + 3 * i), al, 0.28)
  }
  // the cinematic's own damage numbers (the engine's are dropped: they would float un-zoomed)
  const sh = v.shown, na = sh ? k - sh.at : 99
  if (sh && sh.amt > 0 && na >= 0 && na < 44) {
    const bigHit = sh.at === U.shatter, sz = (bigHit ? 46 : 26) * (na < 3 ? 1.5 - na * 0.15 : 1), al = na < 34 ? 1 : 1 - (na - 34) / 10
    c.save(); c.globalAlpha = cl(al, 0, 1); c.font = `900 italic ${Math.round(sz)}px Impact, "Arial Black", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.lineJoin = 'round'; c.lineWidth = Math.max(3, sz / 6); c.strokeStyle = '#06203a'; const ty = floor - v.tH - 24 - Math.min(na, 20) * 1.2 - (bigHit ? 40 : 0)
    c.strokeText(String(sh.amt), tx + (bigHit ? 0 : (sh.at & 1 ? 26 : -26)), ty); c.fillStyle = bigHit ? '#ffffff' : P.hud[1]; c.fillText(String(sh.amt), tx + (bigHit ? 0 : (sh.at & 1 ? 26 : -26)), ty); c.restore()
  }
  // MONOLITH
  if (k >= U.mono && sa <= 0) drawMonolith(c, f, P, v)
  // the dive: an ice spike leading his fist down into the monolith's side
  if (k >= U.dive - 2 && k <= U.shatter) {
    const hx = ctrX(f) - d * 10, hy = f.y + f.h * 0.5, mx = tx + d * (v.tW + 150) / 2, my = floor - v.tH * 0.6
    spike(c, P, hx, hy, Math.atan2(my - hy, mx - hx), Math.max(20, Math.hypot(mx - hx, my - hy) * (k >= U.shatter - 2 ? 1 : 0.5)), 12, 1)
    for (let i = 0; i < 4; i++) seg(c, hx + (i - 1.5) * 10, hy - 40 - i * 12, hx + (i - 1.5) * 10, hy - 140 - i * 20, P.ice[3], 2, 0.7)
  }
  // SHATTER
  if (sa >= 0) {
    if (sa < 10) poly(c, [[tx - 40 + sa * 3, floor], [tx - 14, floor - 900], [tx + 14, floor - 900], [tx + 40 - sa * 3, floor]], '#ffffff', null, 0.85 * (1 - sa / 10))
    drawFragments(c, P, v, sa)
    ring(c, P, tx, floor, 40 + sa * 26, 1 - sa / 24, 0.22); if (sa >= 4) ring(c, P, tx, floor, 30 + (sa - 4) * 18, 1 - (sa - 4) / 26, 0.3)
    if (sa < 10) { part(c, f, 'burst', tx - 30, floor, { scale: 5, alpha: 1 - sa / 10 }); part(c, f, 'burst2', tx + 30, floor, { scale: 5, flip: -1, alpha: 1 - sa / 10 }) }
    shards(c, P, tx, floor - v.tH * 0.7, sa, 12, 2.2, 40)
    // diamond dust drifting down for the rest of the cinematic
    const dal = Math.min(1, sa / 6) * Math.min(1, (U.total - k) / 20)
    for (let i = 0; i < (calm() ? 16 : 44); i++) {
      const x = tx + (hh(i) - 0.5) * 1000 + Math.sin(sa * 0.05 + i) * 12, y = floor - 520 + ((hh(i + 77) * 520 + sa * (1.2 + hh(i + 33) * 1.4)) % 520), s = 2 + 3 * hh(i + 5)
      poly(c, [[x, y - s], [x + s * 0.7, y], [x, y + s], [x - s * 0.7, y]], (i + (k >> 2)) % 5 ? P.ice[2] : '#ffffff', null, dal)
    }
  }
}
// ── ULTIMATE presentation (screen space, cineRegistry): letterbox, title cut-in, frost creeping in from the frame edges,
// impact frames (white / inverted), punch-zoom on the hit-stops, speed lines, slow-motion grade, the callouts.
function card(c, txt, x, y, size, fill, a = 1, rot = 0, stroke = '#06101a') {
  if (!(a > 0.01)) return
  c.save(); c.globalAlpha = cl(a, 0, 1); c.translate(x, y); if (rot) c.rotate(rot)
  c.font = `900 italic ${Math.round(size)}px Impact, "Arial Black", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.lineJoin = 'round'; c.lineWidth = Math.max(4, size / 6); c.strokeStyle = stroke; c.strokeText(txt, 0, 0); c.fillStyle = fill; c.fillText(txt, 0, 0); c.restore()
}
function frostCover(k) {
  const U = ULT, sa = k - U.shatter
  if (sa >= 0) return sa < 3 ? 0.75 : Math.max(0, 0.22 - (sa - 3) * 0.006)
  if (k < U.beam) return 0.12 * k / U.beam
  if (k < U.lock) return 0.12 + 0.13 * (k - U.beam) / (U.lock - U.beam)
  let c = 0.28; for (let i = 0; i < 3; i++) if (k >= U.contacts[i].at) c = 0.34 + 0.07 * i
  if (k >= U.mono) c = Math.min(0.75, c + 0.4 * cl((k - U.mono) / (U.shatter - U.mono), 0, 1))
  return c
}
function drawFrost(c, Wd, Ht, P, cov, k, burst) {
  if (cov <= 0.01) return
  const n = calm() ? 24 : 52, per = 2 * (Wd + Ht), al0 = burst > 0 ? 1 - burst : 1
  c.save()
  // a soft rime band hugging the frame
  const band = Ht * 0.16 * cov * al0
  if (band > 1) for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, 0, band, 0, 0, Wd, band], [0, Ht, 0, Ht - band, 0, Ht - band, Wd, band], [0, 0, band, 0, 0, 0, band, Ht], [Wd, 0, Wd - band, 0, Wd - band, 0, band, Ht]]) {
    const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, 'rgba(225,246,255,0.55)'); g.addColorStop(1, 'rgba(225,246,255,0)'); c.fillStyle = g; c.fillRect(rx, ry, rw, rh)
  }
  c.lineCap = 'round'
  for (let i = 0; i < n; i++) {
    let s = (i + hh(i) * 0.7) / n * per, x, y, nx, ny
    if (s < Wd) { x = s; y = 0; nx = 0; ny = 1 } else if ((s -= Wd) < Ht) { x = Wd; y = s; nx = -1; ny = 0 } else if ((s -= Ht) < Wd) { x = Wd - s; y = Ht; nx = 0; ny = -1 } else { s -= Wd; x = 0; y = Ht - s; nx = 1; ny = 0 }
    const L = cov * Ht * 0.34 * (0.35 + 0.9 * hh(i + 40)), a = Math.atan2(ny, nx) + (hh(i + 80) - 0.5) * 0.9
    if (L < 4) continue
    let ox = 0, oy = 0; if (burst > 0) { ox = -nx * burst * 70 * (0.5 + hh(i + 3)); oy = burst * burst * 160 * (0.4 + hh(i + 4)) - ny * burst * 40 }
    const ux = Math.cos(a), uy = Math.sin(a), bx = x + ox, by = y + oy, w = 3 + 5 * hh(i + 120)
    c.globalAlpha = 0.28 * al0; c.fillStyle = '#e6f8ff'
    c.beginPath(); c.moveTo(bx - uy * w * 2, by + ux * w * 2); c.lineTo(bx + ux * L, by + uy * L); c.lineTo(bx + uy * w * 2, by - ux * w * 2); c.closePath(); c.fill()
    c.globalAlpha = 0.9 * al0; c.strokeStyle = '#ffffff'; c.lineWidth = 1.6
    c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + ux * L, by + uy * L)
    // fern branches: short V pairs along the stem, shrinking toward the tip
    const nb = Math.max(2, Math.floor(L / 14))
    for (let j = 1; j < nb; j++) { const q = j / nb, px = bx + ux * L * q, py = by + uy * L * q, bl = (1 - q) * L * 0.32 + 3
      for (const sd of [-1, 1]) { const b = a + sd * 0.75; c.moveTo(px, py); c.lineTo(px + Math.cos(b) * bl, py + Math.sin(b) * bl) } }
    c.stroke()
    c.globalAlpha = 0.6 * al0; c.strokeStyle = P.ice[1]; c.lineWidth = 1; c.beginPath(); c.moveTo(bx + ux * 2, by + uy * 2); c.lineTo(bx + ux * L * 0.7, by + uy * L * 0.7); c.stroke()
  }
  c.restore()
}
function drawSpeedLines(c, Wd, Ht, cx, cy, al, seed, n = 40) {
  if (al <= 0.01) return
  c.save(); c.globalAlpha = al; c.fillStyle = '#ffffff'
  const R0 = Math.hypot(Wd, Ht)
  for (let i = 0; i < n; i++) {
    const a = (i + hh(i + seed) * 0.8) / n * Math.PI * 2, r1 = Ht * (0.22 + 0.2 * hh(i * 3 + seed)), w = 0.008 + 0.012 * hh(i + 7 + seed)
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a - w) * R0, cy + Math.sin(a - w) * R0); c.lineTo(cx + Math.cos(a + w) * R0, cy + Math.sin(a + w) * R0); c.closePath(); c.fill()
  }
  c.restore()
}
// VIRTUAL CAMERA (screen space): the engine camera stops at ×1.15, so the close-ups re-blit the finished world frame,
// scaled about a focus point — keyed per timeline frame (zoom, subject), eased between keys, punched in on hit-stops.
// Subjects: f = Frozone, t = the captive, mid = between them, mono = the monolith / the leap.
const VCAM = [[0, 1, 'mid'], [12, 1.85, 'f'], [36, 1.85, 'f'], [46, 1.3, 'mid'], [54, 1.65, 't'], [66, 1.45, 't'], [140, 1.6, 't'],
  [152, 1.15, 'mono'], [166, 1, 'mono'], [186, 1, 'mono'], [192, 1.7, 't'], [195, 1.7, 't'], [206, 1.1, 't'], [216, 1.35, 'f'], [240, 1.6, 'f'], [256, 1, 'mid']]
function vcam(sc, v, Wd, Ht) {
  const f = sc.caster, k = v.frame, U = ULT
  const pt = w => { const fp = toScreen(ctrX(f), f.y + f.h * 0.5) || { x: Wd / 2, y: Ht / 2 }, tp = toScreen(v.tx, v.feet - v.tH * 0.5) || fp
    return w === 'f' ? fp : w === 't' ? tp : w === 'mono' ? (toScreen(v.tx + v.dir * 40, v.feet - 190) || tp) : { x: (fp.x + tp.x) / 2, y: (fp.y + tp.y) / 2 } }
  let i = 0; while (i < VCAM.length - 2 && k >= VCAM[i + 1][0]) i++
  const A = VCAM[i], B = VCAM[i + 1], u0 = cl((k - A[0]) / Math.max(1, B[0] - A[0]), 0, 1), u = u0 * u0 * (3 - 2 * u0)
  const pa = pt(A[2]), pb = pt(B[2])
  let z = A[1] + (B[1] - A[1]) * u
  if (v.hold > 0) z *= 1 + (v.hit === 3 ? 0.22 : v.hit === -2 ? 0.08 : 0.06 + 0.04 * v.hit) * (v.hold / Math.max(1, v.holdN))
  if (k >= U.shatter && k < U.shatter + 6 && v.hold <= 0) z *= 1 + 0.12 * (1 - (k - U.shatter) / 6)
  return { z, x: pa.x + (pb.x - pa.x) * u, y: pa.y + (pb.y - pa.y) * u }
}
export function drawFrozoneUltScreen(c, cv) {
  const sc = frozoneUltScene(); if (!sc || !sc.view) { XF = null; return false }
  const v = sc.view, f = sc.caster, P = colsOf(f), U = ULT, k = v.frame, Wd = cv.width, Ht = cv.height, u = Ht / 720
  const sa = k - U.shatter, hitAge = v.hold > 0 ? v.holdN - v.hold : -1, big = v.hit === 3, calmMode = calm()
  // 1. virtual camera: the subject lands at (W/2, 0.55 H)
  const V = vcam(sc, v, Wd, Ht), Z = calmMode ? Math.min(V.z, 1.5) : V.z
  let sx = 0, sy = 0, sz = 1
  if (Z > 1.01) {
    const sw2 = Wd / Z, sh2 = Ht / Z; sx = cl(V.x - sw2 * 0.5, 0, Wd - sw2); sy = cl(V.y - sh2 * 0.55, 0, Ht - sh2); sz = Z
    try { c.imageSmoothingEnabled = false; c.drawImage(cv, sx, sy, sw2, sh2, 0, 0, Wd, Ht) } catch (_) { sx = 0; sy = 0; sz = 1 }
  }
  const vm = p => p ? { x: (p.x - sx) * sz, y: (p.y - sy) * sz } : null
  const tp = vm(toScreen(v.tx, v.feet - v.tH * 0.55)) || { x: Wd / 2, y: Ht * 0.55 }
  // 2. grade: cold vignette, darker in the slow motion
  const slow = U.slow.some(q => k >= q[0] && k < q[1])
  const vg = c.createRadialGradient(Wd / 2, Ht / 2, Ht * 0.3, Wd / 2, Ht / 2, Ht * 0.95)
  vg.addColorStop(0, 'rgba(0,20,40,0)'); vg.addColorStop(1, slow ? 'rgba(0,18,40,0.72)' : 'rgba(0,18,40,0.5)')
  c.fillStyle = vg; c.fillRect(0, 0, Wd, Ht)
  if (slow) { c.fillStyle = 'rgba(40,110,170,0.16)'; c.fillRect(0, 0, Wd, Ht) }
  if (k >= U.mono && sa < 0) { c.globalAlpha = 0.35 * cl((k - U.mono) / 16, 0, 1); c.fillStyle = '#020a14'; c.fillRect(0, 0, Wd, Ht); c.globalAlpha = 1 }
  // 3. frost creeping in from the frame (blown off the glass by the shatter)
  drawFrost(c, Wd, Ht, P, frostCover(k), k, sa > 2 && sa < 24 ? (sa - 2) / 22 : 0)
  // 4. speed lines on the passes, the dive and the shatter
  if (hitAge >= 0 && v.hit >= 0) drawSpeedLines(c, Wd, Ht, tp.x, tp.y, big ? 0.6 : 0.35, k)
  if (k >= U.dive && k < U.shatter) drawSpeedLines(c, Wd, Ht, tp.x, tp.y, 0.3, k * 7, 30)
  // 5. impact frames (the world only — bars and type stay crisp): white → inverted → cold flash
  if (hitAge >= 0) {
    const n = v.hit === 3 ? 4 : v.hit === 2 ? 2 : 1
    if (hitAge === 0) { c.globalAlpha = calmMode ? 0.3 : 0.92; c.fillStyle = '#ffffff'; c.fillRect(0, 0, Wd, Ht) }
    else if (hitAge <= n && !calmMode && v.hit >= 1) { c.globalCompositeOperation = 'difference'; c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.fillRect(0, 0, Wd, Ht); c.globalCompositeOperation = 'source-over' }
    else { c.globalAlpha = (calmMode ? 0.12 : 0.3) * (v.hold / Math.max(1, v.holdN)); c.fillStyle = '#bfeeff'; c.fillRect(0, 0, Wd, Ht) }
    c.globalAlpha = 1
  }
  if (sa > 0 && sa < 14) { c.globalAlpha = (calmMode ? 0.15 : 0.5) * (1 - sa / 14); c.fillStyle = '#e6f8ff'; c.fillRect(0, 0, Wd, Ht); c.globalAlpha = 1 }
  // 6. letterbox
  const inU = easeO(cl(k / 10, 0, 1)), outU = easeO(cl((U.total - k) / 14, 0, 1)), bar = Ht * 0.11 * Math.min(inU, outU)
  c.fillStyle = '#000000'; c.fillRect(0, 0, Wd, bar); c.fillRect(0, Ht - bar, Wd, bar)
  c.fillStyle = P.hud[0]; c.globalAlpha = Math.min(inU, outU); c.fillRect(0, bar - 2 * u, Wd, 2 * u); c.fillRect(0, Ht - bar, Wd, 2 * u); c.globalAlpha = 1
  // 7. title cut-in: a diagonal ice band, the portrait, ABSOLUTE ZERO slammed in
  if (k < U.cutIn) {
    const a = k < 4 ? k / 4 : k > U.cutIn - 6 ? (U.cutIn - k) / 6 : 1, slide = easeO(cl(k / 7, 0, 1)), y0 = Ht * 0.13, bh = 150 * u
    c.save(); c.globalAlpha = a; c.translate((1 - slide) * -Wd, 0)
    c.beginPath(); c.moveTo(0, y0 + 26 * u); c.lineTo(Wd, y0 - 26 * u); c.lineTo(Wd, y0 - 26 * u + bh); c.lineTo(0, y0 + 26 * u + bh); c.closePath(); c.fillStyle = 'rgba(4,14,26,0.9)'; c.fill()
    c.fillStyle = P.hud[0]; c.fillRect(0, y0 + 2 * u, Wd, 4 * u); c.fillRect(0, y0 + bh - 6 * u, Wd, 4 * u)
    for (let i = 0; i < 9; i++) { const sx = ((k * (22 + i * 5) + i * 160) % (Wd + 300)) - 150, sy = y0 + 20 * u + hh(i) * (bh - 40 * u); c.fillStyle = 'rgba(214,244,255,0.5)'; c.fillRect(sx, sy, 80 + 120 * hh(i + 3), 2 * u) }
    const por = image(tagOf(f) ? `./assets/frozone/skins/${tagOf(f)}/portrait.png` : FZ.portrait)
    if (ready(por)) { const ph = bh * 1.05, pw = ph * por.naturalWidth / por.naturalHeight; c.imageSmoothingEnabled = false; c.drawImage(por, Wd * 0.08, y0 + bh / 2 - ph / 2, pw, ph) }
    const slam = k < 6 ? 0 : k < 12 ? 1.9 - 0.9 * easeO((k - 6) / 6) : 1
    if (slam > 0) card(c, 'ABSOLUTE ZERO', Wd * 0.58, y0 + bh * 0.42, 74 * u * slam, '#ffffff', 1, -0.04, '#0a3a5e')
    if (k >= 12) card(c, 'CITY ON ICE', Wd * 0.62, y0 + bh * 0.8, 30 * u, P.hud[0], cl((k - 12) / 5, 0, 1), -0.04)
    c.restore()
  }
  // 8. callouts
  if (k >= U.lock && k < U.lock + 22) card(c, 'FREEZE!', cl(tp.x, Wd * 0.2, Wd * 0.8), cl(tp.y - 120 * u, bar + 50 * u, Ht * 0.6), 54 * u * (k - U.lock < 4 ? 1.6 - 0.15 * (k - U.lock) : 1), '#ffffff', cl((U.lock + 22 - k) / 6, 0, 1), -0.08, '#0a3a5e')
  const CALL = ['COLD SNAP!', 'DEEP FREEZE!', 'WHITEOUT!']
  for (let i = 0; i < 3; i++) { const a = k - U.contacts[i].at; if (a >= 0 && a < 18) card(c, CALL[i], Wd * (i === 1 ? 0.7 : 0.3), Ht * (0.3 + 0.06 * i), (40 + 8 * i) * u * (a < 3 ? 1.5 - 0.15 * a : 1), i === 2 ? P.hud[1] : '#ffffff', cl((18 - a) / 5, 0, 1), (i & 1 ? 0.08 : -0.08), '#0a3a5e') }
  if (k >= U.mono + 8 && sa < 0) card(c, 'ABSOLUTE…', Wd / 2, bar + 56 * u, 56 * u, '#d8f6ff', cl((k - U.mono - 8) / 8, 0, 1), -0.03, '#0a3a5e')
  if (sa >= 1 && k < U.total - 6) { const za = sa < 5 ? 1.8 - 0.8 * easeO((sa - 1) / 4) : 1; card(c, 'ZERO!', Wd / 2, Ht * 0.3, 110 * u * za, '#ffffff', cl((U.pose + 10 - k) / 10, 0, 1), -0.05, '#0a3a5e') }
  if (k >= U.pose) { const a = cl((k - U.pose) / 8, 0, 1) * cl((U.total - k) / 10, 0, 1); card(c, 'CITY ON ICE', Wd / 2, Ht - bar - 46 * u, 44 * u, P.hud[0], a, 0, '#06101a'); card(c, '“' + FZ.tagline + '”', Wd / 2, Ht - bar - 14 * u - 2, 18 * u, '#eef8ff', a, 0, '#06101a') }
  if (v.shown?.total > 0 && sa >= 4) card(c, `${v.shown.total} DMG`, Wd * 0.84, bar + 40 * u, 30 * u, '#ffffff', cl((sa - 4) / 6, 0, 1) * cl((U.total - k) / 10, 0, 1), -0.04, '#0a3a5e')
  return true
}
// intro: the ribbon he skated in on + the brake spray (render-only; the position itself is frozoneState.updateFrozoneIntro)
function drawIntro(c, f, P) {
  const k = f._introRevealFrame || 0, d = f.facing || 1, feet = f.y + f.h, x = ctrX(f)
  if (k < INTRO.arrive + 30) {
    const al = k < INTRO.arrive ? 0.9 : 0.9 * (1 - (k - INTRO.arrive) / 30), x0 = (f._fzHomeX != null ? f._fzHomeX + (f.w || 48) / 2 : x) - d * INTRO.dist
    seg(c, x0, feet - 2, x, feet - 2, P.ice[1], 4, al); seg(c, x0, feet + 1, x, feet + 1, P.ice[0], 2, al)
  }
  if (k >= INTRO.arrive - 4 && k < INTRO.arrive + 14) { const u = (k - INTRO.arrive + 4) / 18; part(c, f, 'arc', x + d * 14, feet, { flip: d, alpha: 1 - u }); part(c, f, 'spray', x + d * 30, feet, { flip: d, alpha: 1 - u }) }
}

// ── public draw passes (game.js) ──
export function drawFrozoneUnder(c, p1, p2, W) {
  for (const f of [p1, p2]) {
    if (!hasFzKit(f)) continue   // Frozone + hosts (Enoch's Ice Stance ice); the HUD and intro card stay Frozone-only
    const P = colsOf(f)
    if (f._introPlaying) { if (isFz(f)) drawIntro(c, f, P); continue }
    const s = f._frozone; if (!s) continue
    const v = frozoneUltView(f); if (v) { drawUlt(c, f, { ...v, target: f === p1 ? p2 : p1 }, P, 'under') }
    drawPatch(c, f, s, P); drawIceObjects(c, f, s, P); drawTrail(c, f, s, P); drawFlash(c, f, s, P)
  }
}
export function drawFrozoneOver(c, p1, p2, W) {
  for (const f of [p1, p2]) {
    if (!hasFzKit(f)) continue
    const s = f._frozone; if (!s || f._introPlaying) continue
    const P = colsOf(f), v = frozoneUltView(f)
    if (v) drawUlt(c, f, { ...v, target: f === p1 ? p2 : p1 }, P, 'over')
    else { drawBoard(c, f, s, P); drawMoveIce(c, f, P); drawGuard(c, f, P); drawShots(c, f, P, W); drawChill(c, f, s, P, W, p1, p2) }
    drawEvents(c, f, s, P)
  }
}
export function frozoneHudLabel(f) {
  const s = f?._frozone
  return { patch: s?.patch ? { x: s.patch.x, left: BLACK_ICE.life - s.patch.t } : null, freeze: s?.freeze ? { side: s.freeze.side, left: s.freeze.until - s.clock } : null,
    chill: s ? Object.fromEntries(Object.entries(s.chill).map(([k, v]) => [k, v.n])) : {}, airSkate: !(f?.airDashCount > 0), rise: !s?.riseUsed,
    flash: !((f?.dashCooldown || 0) > 0), streaming: !!s?.stream, wall: s?.wall ? { left: WALL.life - s.wall.t, hp: s.wall.hp } : null, rails: (s?.ice || []).filter(q => q.kind === 'rail').length }
}
export function drawFrozoneHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => {
    if (!isFz(f)) return
    const L = frozoneHudLabel(f), P = colsOf(f), x0 = (flip ? cw - pad - barW - 20 : pad) + 8, y0 = 92
    c.save(); c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    const tx = flip ? x0 + barW : x0
    const rows = [[L.patch ? `BLACK ICE SET ${Math.ceil(L.patch.left / 60)}s` : 'BLACK ICE READY', !L.patch], [L.freeze ? `FREEZE ${L.freeze.left}` : 'FREEZE —', !L.freeze],
      [`ICE FLASH ${L.flash ? 'READY' : '…'} · ICE RAIL ${L.airSkate ? 'READY' : 'USED'} · RISE ${L.rise ? 'READY' : 'USED'}`, L.flash && L.airSkate && L.rise],
      [L.wall ? `ICE WALL ${Math.ceil(L.wall.left / 60)}s · ${L.wall.hp} HP` : 'ICE WALL READY', !L.wall]]
    rows.forEach(([txt, ok], i) => { c.fillStyle = ok ? P.hud[0] : 'rgba(255,255,255,0.6)'; c.fillText(txt, tx, y0 + i * 11) })
    c.restore()
  }
  if (frozoneUltScene()) return   // the ultimate's own screen overlay (letterbox / cut-in) owns the screen
  one(p1, false); one(p2, true)
}
export function drawFrozoneIntroCard(c, cv, p1, p2) {
  const f = [p1, p2].find(q => isFz(q) && q._introPlaying); if (!f) return
  const cw = cv?.width || 1280, ch = cv?.height || 720, k = f._introRevealFrame || 0
  const al = Math.min(1, Math.max(0, (k - 30) / 10)); if (al <= 0) return
  const P = colsOf(f), por = image(tagOf(f) ? `./assets/frozone/skins/${tagOf(f)}/portrait.png` : FZ.portrait)
  c.save(); c.globalAlpha = al; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 30px Arial'
  const name = FZ.introTitle, bw = c.measureText(name).width + 130, bx = cw / 2 - bw / 2, by = ch * 0.72, bh = 66
  c.fillStyle = 'rgba(6,16,26,0.86)'; c.fillRect(bx, by, bw, bh); c.strokeStyle = P.hud[0]; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh)
  if (ready(por)) { c.imageSmoothingEnabled = false; c.drawImage(por, bx + 8, by + 6, por.naturalWidth * 2, por.naturalHeight * 2) }
  c.fillStyle = '#eef8ff'; c.fillText(name, cw / 2 + 26, by + bh * 0.4)
  c.font = 'bold 12px Arial'; c.fillStyle = P.hud[1]; c.fillText('“' + FZ.tagline + '”', cw / 2 + 26, by + bh * 0.78)
  c.restore()
}
const AFTER_DEFEAT_MUTE = /^(cast|swing|lance|frost|patch|skate|chill|freeze|shatter|thaw|rise|ult|brake)/
export function playFrozoneCues(f) {
  const q = f?._frozone?.cues; if (!q?.length) return
  for (const v of q) {
    if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue
    if (v === 'shatter') { try { camera.shake(6, 8) } catch (_) {} }   // the ultimate's shakes come from updateFrozoneUlt(ctx)
    try { sound.play('frozone_' + v) } catch (_) {}
  }
  q.length = 0
}

registerCineScreen('frozone_absolute_zero', drawFrozoneUltScreen)   // ABSOLUTE ZERO screen overlay (hides the HUD while active)
