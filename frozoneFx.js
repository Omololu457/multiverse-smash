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
import { frozoneUltView, ultRoute, INTRO } from './frozoneState.js'
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
function drawUlt(c, f, v, P, layer) {
  const k = v.frame, d = v.dir, floor = v.feet, tx = v.tx, Rr = ULT.ramp.r
  if (layer === 'under') {
    // 1–2: ice spreads outward along the floor from his hand (0–29), stays as the stage of the cinematic
    const spread = cl(k / 30, 0, 1) * (Rr + 120), al = k > 206 ? 1 - (k - 206) / 24 : 1
    poly(c, [[tx - spread, floor], [tx - spread + 12, floor - 6], [tx + spread - 12, floor - 6], [tx + spread, floor], [tx + spread - 10, floor + 4], [tx - spread + 10, floor + 4]], P.ice[0], P.ice[2], 0.85 * al)
    // 3: the procedural ramp (a ring of crystalline wedges around the captive) rises 30–59, holds, sinks after the shatter
    const rise = k < 30 ? 0 : k < 60 ? (k - 30) / 30 : k < 190 ? 1 : Math.max(0, 1 - (k - 190) / 16)
    if (rise > 0) for (let i = 0; i < 9; i++) {
      const a = Math.PI + i / 8 * Math.PI, x = tx + Math.cos(a) * Rr, h = (26 + 34 * Math.abs(Math.sin(a))) * rise
      poly(c, [[x - 16, floor], [x - 8, floor - h], [x + 6, floor - h * 0.8], [x + 16, floor]], P.ice[1], P.ice[0], 0.95)
    }
    return
  }
  // 6: the large crystal shell (140–189), fully readable around the captive
  const t = v.target
  if (t && k >= 136 && k < 190) drawShell(c, P, t, k, true, k < 140 ? (k - 136) / 4 : 1)
  // 5: the passes — a short burst at each crossing
  for (const at of [73, 100, 127]) if (k >= at && k < at + 8) { for (const o of [-0.4, 0, 0.4]) spike(c, P, tx, floor - 50, (k & 1 ? 0 : Math.PI) + o, 26 + (k - at) * 4, 6, 1 - (k - at) / 8) }
  // 7: brake spray (170–183)
  if (k >= 170 && k < 184) { const x = ctrX(f); part(c, f, 'arc', x, floor, { flip: -d, alpha: 1 - (k - 170) / 14 }) }
  // the shatter beam from the extended hand (184–190)
  if (k >= 184 && k <= 190) { const hx = f.facing === 1 ? f.x + f.w + 46 : f.x - 46, hy = f.y + f.h - 74; spike(c, P, hx, hy, f.facing === 1 ? Math.atan2(floor - 50 - hy, tx - hx) : Math.atan2(floor - 50 - hy, tx - hx), Math.min(Math.abs(tx - hx), 40 + (k - 184) * 30), 8) }
}
function drawCutIn(c, cw, ch, f, v, P) {
  const u = v.cutIn, al = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1
  const por = image(tagOf(f) ? `./assets/frozone/skins/${tagOf(f)}/portrait.png` : FZ.portrait)
  const y0 = Math.round(ch * 0.2), bandH = 84, left = (f.facing ?? 1) >= 0
  c.save(); c.globalAlpha = 0.8 * al; c.fillStyle = '#06101a'; c.fillRect(0, y0, cw, bandH)
  c.globalAlpha = al; c.fillStyle = P.hud[0]; c.fillRect(0, y0, cw, 3); c.fillRect(0, y0 + bandH - 3, cw, 3)
  if (ready(por)) { c.imageSmoothingEnabled = false; c.drawImage(por, left ? 40 : cw - 40 - por.naturalWidth * 2, y0 + 14, por.naturalWidth * 2, por.naturalHeight * 2) }
  c.textAlign = left ? 'left' : 'right'; c.textBaseline = 'middle'
  c.font = 'bold 18px Arial'; c.fillStyle = P.hud[0]; c.fillText('ABSOLUTE ZERO', left ? 130 : cw - 130, y0 + 28)
  c.font = '900 28px Arial'; c.fillStyle = P.hud[1]; c.fillText('CITY ON ICE', left ? 130 : cw - 130, y0 + 58)
  c.restore()
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
    if (!isFz(f)) continue
    const P = colsOf(f)
    if (f._introPlaying) { drawIntro(c, f, P); continue }
    const s = f._frozone; if (!s) continue
    const v = frozoneUltView(f); if (v) { drawUlt(c, f, { ...v, target: f === p1 ? p2 : p1 }, P, 'under') }
    drawPatch(c, f, s, P); drawIceObjects(c, f, s, P); drawTrail(c, f, s, P); drawFlash(c, f, s, P)
  }
}
export function drawFrozoneOver(c, p1, p2, W) {
  for (const f of [p1, p2]) {
    if (!isFz(f)) continue
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
  one(p1, false); one(p2, true)
  for (const f of [p1, p2]) { const v = isFz(f) ? frozoneUltView(f) : null; if (v && v.cutIn != null) drawCutIn(c, cw, ch, f, v, colsOf(f)) }
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
    if (v === 'ultShatter') { try { camera.shake(14, 20) } catch (_) {} } else if (v === 'shatter') { try { camera.shake(6, 8) } catch (_) {} }
    try { sound.play('frozone_' + v) } catch (_) {}
  }
  q.length = 0
}
