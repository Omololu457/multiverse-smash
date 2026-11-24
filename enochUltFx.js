// enochUltFx.js — ENOCH's three SUPER cinematics, RENDER-ONLY (reads enochUltView / enochUltScene; never writes the sim).
//   ABSOLUTE ZERO (ice)  : time stops (the world drains of colour), four glacier spikes stair-step the foe into the sky under
//                          a turning snowflake sigil, a colossal icicle forms over the frozen moment and spears them down —
//                          colour floods back out of the impact in a ring, a crown of ice bursts from the crater.
//   FLASH POINT (fire)   : push-in on the burning visor, a beam draws a fuse of fire that rings the foe in pillars, locked
//                          pulses, a leap + two crossing beam slashes (an X burned on them, slow motion), a white-hot star
//                          focused over them collapses into a detonation and a pillar of fire. Heat-haze over the screen.
//   THERMAL SHOCK (fusion): the screen split blue / orange, a yin-yang turning behind him, twin serpents of frost and flame
//                          braid in — frozen solid, coiled in a rising vortex, superheated red — his clap: the ice explodes
//                          into steam (white-out).
// World layers: drawEnochUltUnder (behind the fighters) + drawEnochUltOver (in front). Screen layer (cineRegistry): the
// virtual-camera re-blit for real close-ups (the engine camera stops at ×1.15), the grade, impact frames, letterbox, the
// title cut-in, callouts and the cinematic's own damage total. Flicker / scatter = a frame hash, never Math.random.
import { registerCineScreen } from './cineRegistry.js'
import { juiceSettings } from './juiceSettings.js'
import { enochUltScene, lensOrigin } from './enochState.js'
import { enoch as EN, SUPERS } from './enochData.js'
import { ENOCH_VFX, ENOCH_VFX_PATH } from './enochVfx.js'
import { drawBeam3 } from './beam.js'

const ICE = ['#ffffff', '#e8fbff', '#9fe8ff', '#4fb6d8', '#1f5a78', '#0b2a40'], FIRE = ['#ffffff', '#fff1c0', '#ffd27a', '#ff9a3c', '#e0501c', '#7a1e08']
const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const cl = (v, a, b) => Math.max(a, Math.min(b, v))
const easeO = u => 1 - (1 - u) * (1 - u)
const easeI = u => u * u
const R = Math.round
const hh = i => { let x = (Math.imul(i | 0, 374761393) + 668265263) >>> 0; x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0; return ((x ^ (x >>> 16)) >>> 0) / 4294967296 }
const TAU = Math.PI * 2

function vfx(c, name, k, x, y, { scale = 1, alpha = 1, flip = 1, h = 0, rot = 0 } = {}) {
  const V = ENOCH_VFX[name]; if (!V) return false
  const n = V.frames.length, i = cl(k | 0, 0, n - 1), [w0, h0] = V.frames[i], im = image(ENOCH_VFX_PATH(name, i)); if (!ready(im)) return false
  const k2 = h ? h / h0 : scale, w = w0 * k2, ht = h0 * k2
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false; c.translate(R(x), R(y)); if (rot) c.rotate(rot); if (flip < 0) c.scale(-1, 1)
  c.drawImage(im, R(-w / 2), V.anchor === 'b' ? R(-ht) : R(-ht / 2), R(w), R(ht)); c.restore(); return true
}
function poly(c, pts, fill, line = null, alpha = 1, lw = 2) {
  if (!(alpha > 0.01)) return
  c.save(); c.globalAlpha *= alpha; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath()
  if (fill) { c.fillStyle = fill; c.fill() } if (line) { c.strokeStyle = line; c.lineWidth = lw; c.stroke() } c.restore()
}
function ring(c, x, y, r, col, alpha = 1, lw = 4, flat = 0.3) {
  if (!(alpha > 0.01) || r <= 0) return
  c.save(); c.globalAlpha = cl(alpha, 0, 1); c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.ellipse(x, y, r, Math.max(1, r * flat), 0, 0, TAU); c.stroke(); c.restore()
}
function glow(c, x, y, r, inner, outer = 'rgba(0,0,0,0)', alpha = 1) {
  if (!(alpha > 0.01) || r <= 1) return
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, inner); g.addColorStop(1, outer)
  c.save(); c.globalAlpha = cl(alpha, 0, 1); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore()
}
// a two-tone faceted crystal from (x, base) to the tip (x + lean, tip): the light face left of the spine, the dark face right
function crystal(c, x, base, tip, w, lean, alpha = 1, hot = 0) {
  if (!(alpha > 0.01) || Math.abs(base - tip) < 2) return
  const mid = base + (tip - base) * 0.55, tx = x + lean
  const L = hot > 0 ? mix('#e8fbff', '#ffd27a', hot) : ICE[1], M = hot > 0 ? mix('#9fe8ff', '#ff6a2a', hot) : ICE[2], D = hot > 0 ? mix('#4fb6d8', '#b0300e', hot) : ICE[3]
  poly(c, [[x - w / 2, base], [x - w * 0.42 + lean * 0.45, mid], [tx, tip], [x + lean * 0.2, base]], L, null, alpha)
  poly(c, [[x + lean * 0.2, base], [tx, tip], [x + w * 0.42 + lean * 0.45, mid], [x + w / 2, base]], D, null, alpha)
  poly(c, [[x - w * 0.12, base], [x - w * 0.1 + lean * 0.5, mid], [tx, tip], [x + w * 0.05 + lean * 0.5, mid]], M, null, alpha * 0.8)
  poly(c, [[x - w / 2, base], [x - w * 0.42 + lean * 0.45, mid], [tx, tip], [x + w * 0.42 + lean * 0.45, mid], [x + w / 2, base]], null, hot > 0.5 ? '#fff1c0' : '#ffffff', alpha * 0.85, 2)
}
function mix(a, b, u) {
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], A = p(a), B = p(b)
  return `rgb(${A.map((v, i) => R(v + (B[i] - v) * cl(u, 0, 1))).join(',')})`
}
// debris: n particles flung out of (x, y) `age` frames ago (a pure function of age — deterministic, no state)
function debris(c, x, y, age, n, seed, { speed = 9, up = 8, grav = 0.45, life = 40, col = ICE, size = 5, kind = 'shard', spread = 1 } = {}) {
  if (age < 0 || age > life) return
  const al = 1 - age / life, k = calm() ? Math.ceil(n / 3) : n
  for (let i = 0; i < k; i++) {
    const a = -Math.PI / 2 + (hh(seed + i * 7) - 0.5) * Math.PI * 1.9 * spread, sp = speed * (0.35 + hh(seed + i * 13)), vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - up * hh(seed + i * 5)
    const px = x + vx * age, py = y + vy * age + 0.5 * grav * age * age, s = size * (0.5 + hh(seed + i * 3))
    if (kind === 'ember') { c.save(); c.globalAlpha = al; c.fillStyle = col[1 + (i % 3)]; c.fillRect(R(px - s / 2), R(py - s / 2), R(s), R(s)); c.restore() }
    else { const r = age * 0.3 + i; poly(c, [[px + Math.cos(r) * s, py + Math.sin(r) * s], [px + Math.cos(r + 2.3) * s * 0.6, py + Math.sin(r + 2.3) * s * 0.6], [px + Math.cos(r + 3.9) * s * 0.8, py + Math.sin(r + 3.9) * s * 0.8]], col[1 + (i % 3)], null, al) }
  }
}
function steamCloud(c, x, y, age, n, seed, scale = 1, life = 70) {
  if (age < 0 || age > life) return
  const al = age < 4 ? 1 : 1 - (age - 4) / (life - 4)
  for (let i = 0; i < (calm() ? Math.ceil(n / 2) : n); i++) {
    const a = hh(seed + i) * TAU, D = (90 + 260 * hh(seed + i * 3)) * scale, d = D * (1 - Math.exp(-age / 10)), r = (26 + 70 * hh(seed + i * 9)) * scale * (0.5 + 0.5 * easeO(cl(age / 18, 0, 1)))
    const px = x + Math.cos(a) * d * 1.4, py = y + Math.sin(a) * d * 0.7 - age * (0.6 + hh(seed + i * 4))
    glow(c, px, py, r, `rgba(${235 + (i % 3) * 6},${238 + (i % 2) * 8},245,0.9)`, 'rgba(220,226,236,0)', al * 0.9)
  }
}

// ── ABSOLUTE ZERO (world) ──
const AZ_SPIKES = [{ dx: 0, w: 70, lean: -6 }, { dx: -34, w: 58, lean: 10 }, { dx: 30, w: 54, lean: -12 }, { dx: -6, w: 46, lean: 4 }]
function azUnder(c, f, v) {
  const k = v.frame, V = SUPERS.absoluteZero, floor = v.floorT, tx = v.tx, fin = V.finale
  // the snowflake sigil: a slow six-armed mandala behind the captive (forms on the palm slam, burns white at the finale)
  if (k >= 16 && k < fin + 14) {
    const a = cl((k - 16) / 18, 0, 1) * (k >= fin ? 1 - (k - fin) / 14 : 1), cy = floor - 150 - v.lift * 0.45, Rr = 90 + 70 * easeO(cl((k - 16) / 40, 0, 1)), rot = k * 0.004
    c.save(); c.translate(R(tx), R(cy)); c.rotate(rot); c.globalAlpha = 0.55 * a; c.strokeStyle = ICE[2]; c.lineWidth = 3
    c.beginPath(); c.arc(0, 0, Rr, 0, TAU); c.stroke(); c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, Rr * 0.72, 0, TAU); c.stroke()
    for (let i = 0; i < 6; i++) { const q = i * TAU / 6, ux = Math.cos(q), uy = Math.sin(q)
      c.lineWidth = 3; c.strokeStyle = ICE[1]; c.beginPath(); c.moveTo(0, 0); c.lineTo(ux * Rr * 1.12, uy * Rr * 1.12); c.stroke()
      for (const b of [0.45, 0.75]) { const bx = ux * Rr * b, by = uy * Rr * b, bl = Rr * 0.22 * (1.1 - b)
        for (const sd of [-1, 1]) { const q2 = q + sd * 0.8; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + Math.cos(q2) * bl, by + Math.sin(q2) * bl); c.stroke() } } }
    poly(c, [[0, -14], [12, 0], [0, 14], [-12, 0]], ICE[1], '#ffffff', 0.9); c.restore()
  }
  // the frost wave racing from his palm to the captive (palm slam → first spike)
  if (k >= 14 && k < 40) {
    const u = cl((k - 14) / 18, 0, 1), x0 = v.cx + v.dir * 20, x1 = x0 + (tx - x0) * easeO(u)
    c.save(); c.globalAlpha = 0.9 * (k < 34 ? 1 : 1 - (k - 34) / 6); c.fillStyle = ICE[2]; c.fillRect(R(Math.min(x0, x1)), R(floor - 4), R(Math.abs(x1 - x0)), 6); c.fillStyle = '#ffffff'; c.fillRect(R(Math.min(x0, x1)), R(floor - 4), R(Math.abs(x1 - x0)), 2); c.restore()
    for (let i = 0; i < 7; i++) { const xx = x0 + (x1 - x0) * (i / 7); crystal(c, xx, floor, floor - 14 - 12 * hh(i + 3), 14, (hh(i) - 0.5) * 10, 0.9) }
    ring(c, x0, floor, 30 + (k - 14) * 9, ICE[1], 0.8 * (1 - u), 4, 0.25)
  }
  // the four glacier spikes (each one taller than the last, the tip under the captive's feet), shattered by the finale
  if (k < fin) for (let i = 0; i < 4; i++) {
    const at = V.contacts[i].at, age = k - at; if (age < -1) continue
    const top = floor - [60, 118, 172, 228][i] - 4, grow = easeO(cl((age + 1) / 4, 0, 1)), S = AZ_SPIKES[i]
    const tip = floor - (floor - top) * grow
    crystal(c, tx + S.dx, floor + 4, tip, S.w + 10 * (3 - i) * 0.3, S.lean, 0.95)
    for (let j = 0; j < 3; j++) { const sd = j === 1 ? -1 : 1, bx = tx + S.dx + sd * (S.w * 0.45 + 12 * j), bh = (floor - tip) * (0.22 + 0.14 * hh(i * 9 + j)) * grow; crystal(c, bx, floor + 4, floor - bh, 26 + 8 * hh(i + j), sd * (8 + 8 * hh(j + i * 3)), 0.95) }
    if (age >= 0 && age < 10) ring(c, tx + S.dx, floor, 26 + age * 10, '#ffffff', 1 - age / 10, 3, 0.3)
  }
}
function azOver(c, f, v) {
  const k = v.frame, V = SUPERS.absoluteZero, floor = v.floorT, tx = v.tx, fin = V.finale, head = v.feet - v.tH
  // hoarfrost on his palm + breath
  if (k >= 14 && k < fin) { glow(c, v.cx + v.dir * 26, v.cFeet - 8, 26, 'rgba(232,251,255,0.9)', 'rgba(159,232,255,0)', 0.7) }
  // the colossal icicle: grows over the hanging captive, then drives them into the floor
  if (k >= 74 && k < fin + 2) {
    const grow = easeO(cl((k - 74) / 26, 0, 1)), L = 340 * grow, w = 140 * grow, tipY = k < 112 ? head - 26 - 40 * (1 - grow) : head - 6
    crystal(c, tx, tipY - L, tipY, w, 0, 0.97)
    // the gathering frost spiralling into it
    if (k < 112) for (let i = 0; i < 10; i++) { const q = hh(i) * TAU + k * 0.09, r = 140 * (1 - ((k * 0.02 + hh(i + 5)) % 1)); c.save(); c.globalAlpha = 0.8; c.fillStyle = '#ffffff'; c.fillRect(R(tx + Math.cos(q) * r), R(tipY - L * 0.5 + Math.sin(q) * r * 0.6), 3, 3); c.restore() }
    if (k >= 112) for (let i = 0; i < 5; i++) { c.save(); c.globalAlpha = 0.5; c.fillStyle = '#ffffff'; c.fillRect(R(tx - 40 + i * 20), R(tipY - L - 80 - hh(i) * 60), 2, 80 + 40 * hh(i + 9)); c.restore() }   // speed streaks
  }
  // FINALE: shatter of the spikes + the icicle, a crown of ice bursting out of the crater, shock rings, diamond dust
  if (k >= fin) {
    const a = k - fin
    for (let i = 0; i < 9; i++) {
      const q = -Math.PI / 2 + (i - 4) * 0.33, L = (110 + 90 * hh(i + 40)) * easeO(cl(a / 5, 0, 1)) * (i === 4 ? 1.5 : 1), al = a < 26 ? 1 : 1 - (a - 26) / 16
      if (al <= 0) continue
      const bx = tx + Math.cos(q) * 14, w = 30 + 16 * hh(i)
      c.save(); c.translate(R(bx), R(floor)); c.rotate(q + Math.PI / 2); crystal(c, 0, 0, -L, w, 0, al); c.restore()
    }
    ring(c, tx, floor, 40 + a * 22, '#ffffff', 1 - a / 22, 6, 0.28); ring(c, tx, floor, 20 + a * 13, ICE[2], 1 - a / 28, 4, 0.28)
    debris(c, tx, floor - 120, a, 26, 811, { speed: 11, up: 6, life: 46, size: 9 })
    debris(c, tx, floor - 20, a, 22, 977, { speed: 8, up: 10, life: 40, size: 6 })
    if (a < 10) vfx(c, 'iceBurst', a * 0.7, tx, floor - 60, { scale: 7, alpha: 1 - a / 10 })
    if (a < 6) glow(c, tx, floor - 40, 220, 'rgba(255,255,255,0.95)', 'rgba(159,232,255,0)', 1 - a / 6)
    for (let i = 0; i < 30; i++) { const sx = tx + (hh(i + 300) - 0.5) * 700, sy = floor - 360 + ((hh(i + 301) * 360 + a * (1 + hh(i + 2))) % 360), al = cl((a - 4) / 8, 0, 1) * 0.8; if (al > 0) poly(c, [[sx, sy - 3], [sx + 2, sy], [sx, sy + 3], [sx - 2, sy]], '#ffffff', null, al) }
  }
}

// ── FLASH POINT (world) ──
const FP_PILLARS = [-128, -74, 74, 128]
function fpFlame(c, x, floor, h, k, i, alpha) {   // a fire pillar from the effect sheet (procedural fallback)
  if (vfx(c, 'firePillar', ((k >> 2) + i) % 4, x, floor + 6, { h, alpha })) return
  const w = h * 0.32
  poly(c, [[x - w / 2, floor], [x - w * 0.3, floor - h * 0.6], [x + (hh(k + i) - 0.5) * 10, floor - h], [x + w * 0.3, floor - h * 0.55], [x + w / 2, floor]], FIRE[3], null, alpha)
  poly(c, [[x - w / 4, floor], [x, floor - h * 0.7], [x + w / 4, floor]], FIRE[1], null, alpha)
}
function fpUnder(c, f, v) {
  const k = v.frame, V = SUPERS.flashPoint, floor = v.floorT, tx = v.tx, fin = V.finale
  // the fuse: the beam's line of fire on the floor, then the ring of pillars
  if (k >= 34 && k < fin) {
    const u = cl((k - 34) / 8, 0, 1), x0 = v.cx + v.dir * 30, x1 = x0 + (tx - x0) * u
    for (let x = Math.min(x0, x1); x < Math.max(x0, x1); x += 22) vfx(c, 'flameGrow', ((k >> 2) + (x | 0)) % 9, x, floor + 4, { h: 34 + 10 * hh(x | 0), alpha: 0.9 })
  }
  if (k >= 40 && k < fin + 6) {
    const al = k >= fin ? 1 - (k - fin) / 6 : 1
    FP_PILLARS.forEach((dx, i) => { const g = easeO(cl((k - 40 - i * 2) / 8, 0, 1)); if (g > 0) fpFlame(c, tx + dx, floor, (170 + 40 * (i & 1)) * g, k, i, al * 0.95) })
    glow(c, tx, floor - 60, 190, 'rgba(255,150,40,0.45)', 'rgba(255,90,20,0)', al)
  }
  // the sun he focuses (behind the captive): a white-hot star with a turning corona
  if (k >= 120 && k < fin) {
    const g = easeO(cl((k - 120) / 14, 0, 1)), drop = k >= 134 ? easeI((k - 134) / 4) : 0, sy = (v.feet - v.tH - 150) + drop * 150, r = 10 + 56 * g * (1 - drop * 0.5)
    glow(c, tx, sy, r * 4, 'rgba(255,200,90,0.55)', 'rgba(255,90,20,0)', 1)
    c.save(); c.translate(R(tx), R(sy)); c.rotate(k * 0.05)
    for (let i = 0; i < 12; i++) { const q = i * TAU / 12, L = r * (1.6 + 0.5 * ((i & 1) ? 1 : 0)); poly(c, [[Math.cos(q - 0.08) * r, Math.sin(q - 0.08) * r], [Math.cos(q) * L, Math.sin(q) * L], [Math.cos(q + 0.08) * r, Math.sin(q + 0.08) * r]], FIRE[2], null, 0.85) }
    c.restore(); glow(c, tx, sy, r, '#ffffff', 'rgba(255,241,192,0.9)', 1)
  }
}
function fpOver(c, f, v) {
  const k = v.frame, V = SUPERS.flashPoint, floor = v.floorT, tx = v.tx, fin = V.finale, ty = v.feet - v.tH * 0.55
  const lens = lensOrigin(f), beam = (tx2, ty2, w, tick) => drawBeam3(c, { ox: R(lens.x), oy: R(lens.y), tx: R(tx2), ty: R(ty2), hit: true, tick }, { glow: 'rgba(255,120,30,0.55)', mid: 'rgba(255,210,122,0.95)', core: 'rgba(255,248,220,1)', dot: '#fff1c0', impact: 'rgba(255,210,122,0.8)', width: w })
  // the visor charges: a star on the lens
  if (k < 40) { const g = cl(k / 30, 0, 1); glow(c, lens.x, lens.y, 8 + 40 * g, 'rgba(255,255,255,1)', 'rgba(255,154,60,0)', 0.9); for (let i = 0; i < 4; i++) { const q = i * Math.PI / 4 + k * 0.03, L = 20 + 70 * g; c.save(); c.globalAlpha = 0.8 * g; c.strokeStyle = '#fff1c0'; c.lineWidth = 2; c.beginPath(); c.moveTo(lens.x - Math.cos(q) * L, lens.y - Math.sin(q) * L); c.lineTo(lens.x + Math.cos(q) * L, lens.y + Math.sin(q) * L); c.stroke(); c.restore() } }
  // the fuse beam sweeping along the floor, then locked on the chest with six pulses
  if (k >= 34 && k < 44) { const u = cl((k - 34) / 8, 0, 1), x0 = v.cx + v.dir * 30; beam(x0 + (tx - x0) * u, floor - 2, 1.1, k) }
  if (k >= 44 && k < 94) { const p = V.contacts.slice(1, 7).some(q => k >= q.at && k < q.at + 3); beam(tx, ty, p ? 2.0 : 1.25, k); if (p) glow(c, tx, ty, 60, 'rgba(255,255,255,0.95)', 'rgba(255,154,60,0)', 0.9) }
  // the X: two beam slashes from the air, each one leaving a burning scar on them
  const slash = (at, s) => { if (k < at - 4 || k >= at + 3) return; const u = cl((k - at + 4) / 6, 0, 1), L = 110; beam(tx + s * L * (1 - 2 * u), ty - L * (1 - 2 * u) * 0.9, 1.8, k) }
  slash(108, -1); slash(116, 1)
  for (const [at, s] of [[108, -1], [116, 1]]) if (k >= at && k < fin + 4) {
    const a = k - at, L = 56 * easeO(cl(a / 3, 0, 1)), al = k >= fin ? 1 - (k - fin) / 4 : 1
    c.save(); c.globalAlpha = al; c.lineCap = 'round'
    for (const [w, col] of [[16, 'rgba(255,90,20,0.5)'], [8, FIRE[2]], [3, '#ffffff']]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(tx - s * L, ty - L * 0.9); c.lineTo(tx + s * L, ty + L * 0.9); c.stroke() }
    c.restore(); debris(c, tx, ty, a, 10, at * 7, { kind: 'ember', col: FIRE, speed: 5, up: 3, life: 24, size: 4 })
  }
  // embers drifting up all through the cinematic
  if (k >= 40) for (let i = 0; i < (calm() ? 10 : 28); i++) { const sx = tx + (hh(i + 50) - 0.5) * 420, sy = floor - ((hh(i + 51) * 320 + k * (1.5 + 2 * hh(i + 52))) % 320); c.save(); c.globalAlpha = 0.8; c.fillStyle = FIRE[1 + (i % 3)]; c.fillRect(R(sx + Math.sin(k * 0.1 + i) * 6), R(sy), 3, 3); c.restore() }
  // FINALE: the star collapses into them — detonation, a pillar of fire to the sky, shock rings, an ember storm
  if (k >= fin) {
    const a = k - fin
    if (a < 8) glow(c, tx, ty, 260, 'rgba(255,255,255,1)', 'rgba(255,200,90,0)', 1 - a / 8)
    vfx(c, 'fireRise', a / 3, tx, floor + 10, { h: 300, alpha: a < 24 ? 1 : 1 - (a - 24) / 10 })
    if (a < 34) fpFlame(c, tx, floor, 560 * easeO(cl(a / 6, 0, 1)), k, 9, a < 20 ? 1 : 1 - (a - 20) / 14)
    ring(c, tx, floor, 40 + a * 24, '#fff1c0', 1 - a / 22, 7, 0.26); ring(c, tx, floor, 30 + a * 15, FIRE[3], 1 - a / 28, 5, 0.26)
    debris(c, tx, ty, a, 40, 1201, { kind: 'ember', col: FIRE, speed: 12, up: 6, grav: 0.2, life: 44, size: 6 })
  }
}

// ── THERMAL SHOCK (world) ──
function yinYang(c, x, y, r, rot, alpha) {
  if (!(alpha > 0.01)) return
  c.save(); c.translate(R(x), R(y)); c.rotate(rot); c.globalAlpha = alpha
  c.fillStyle = FIRE[3]; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill()
  c.fillStyle = ICE[2]; c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false); c.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, false); c.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); c.closePath(); c.fill()
  c.fillStyle = ICE[1]; c.beginPath(); c.arc(0, r / 2, r * 0.14, 0, TAU); c.fill()
  c.fillStyle = FIRE[1]; c.beginPath(); c.arc(0, -r / 2, r * 0.14, 0, TAU); c.fill()
  c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke(); c.restore()
}
// a serpent = N body points (head first); drawn as scaled discs + a head. `side` filters depth (+1 front, -1 back, 0 all)
function serpent(c, pts, el, side, alpha) {
  const P = el === 'ice' ? ICE : FIRE, n = pts.length
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round'
  for (const [extra, col] of [[5, el === 'ice' ? '#0b2a40' : '#4a1204'], [0, P[3]]]) for (let j = n - 1; j > 0; j--) {
    const p = pts[j], q = pts[j - 1]; if (side && Math.sign(p.z || 1) !== side) continue
    c.globalAlpha = alpha * (p.z < 0 ? 0.55 : 1); c.strokeStyle = col; c.lineWidth = 2 * (3 + 10 * (1 - j / n)) + 4 + extra
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke()
  }
  c.restore()
  for (let j = n - 1; j >= 0; j--) {
    const p = pts[j]; if (side && Math.sign(p.z || 1) !== side) continue
    const r = 3 + 10 * (1 - j / n), al = alpha * (p.z < 0 ? 0.55 : 1)
    c.save(); c.globalAlpha = al; c.fillStyle = P[j % 2 ? 3 : 2]; c.beginPath(); c.arc(p.x, p.y, r + 2, 0, TAU); c.fill(); c.fillStyle = P[1]; c.beginPath(); c.arc(p.x, p.y - r * 0.3, r * 0.55, 0, TAU); c.fill(); c.restore()
    if (el === 'fire' && j % 3 === 0) { c.save(); c.globalAlpha = al * 0.8; c.fillStyle = FIRE[2]; c.fillRect(R(p.x - 2), R(p.y - r - 6 - (j % 5)), 3, 4); c.restore() }
    if (el === 'ice' && j % 4 === 1) poly(c, [[p.x, p.y - r - 8], [p.x + 3, p.y - r], [p.x - 3, p.y - r]], '#ffffff', null, al)
  }
  const h = pts[0], h2 = pts[1] || h; if (side && Math.sign(h.z || 1) !== side) return
  const a = Math.atan2(h.y - h2.y, h.x - h2.x)
  c.save(); c.globalAlpha = alpha; c.translate(h.x, h.y); c.rotate(a)
  poly(c, [[18, 0], [4, -11], [-8, -9], [-14, -16], [-10, 0], [-14, 16], [-8, 9], [4, 11]], P[2], P[0], 1, 2)   // head + crest
  poly(c, [[18, 0], [26, -3], [26, 3]], P[1], null, 1)
  c.fillStyle = el === 'ice' ? '#0b2a40' : '#3a0a00'; c.fillRect(2, -6, 4, 3); c.fillRect(2, 3, 4, 3)
  c.restore()
}
function tsSerpents(f, v) {
  const k = v.frame, V = SUPERS.thermalShock, fin = V.finale, N = 30
  if (k < 28 || k >= fin) return null
  const hx = v.cx + v.dir * 24, hy = v.cFeet - 62, tx = v.tx, ty = v.feet - v.tH * 0.5, out = { ice: [], fire: [] }
  for (const [el, ph] of [['ice', 0], ['fire', Math.PI]]) for (let j = 0; j < N; j++) {
    if (k < 46) {   // the braid in: two sine paths crossing each other on the way
      const u = cl((k - 28) / 18 - j * 0.03, 0, 1), x = hx + (tx - hx) * u, y = hy + (ty - hy) * u + Math.sin(u * Math.PI * 3 + ph) * 46 * (1 - u * 0.6)
      out[el].push({ x, y, z: Math.cos(u * Math.PI * 3 + ph) })
    } else {        // the coil: a rising double helix around the captive (front / back = depth)
      const th = (k - 46) * 0.24 + ph - j * 0.32, rr = v.tW * 0.5 + 34 + 6 * Math.sin(k * 0.1), y = ty - 62 + j * 4.2 - 10 * Math.sin(th)
      out[el].push({ x: tx + Math.cos(th) * rr, y, z: Math.sin(th) })
    }
  }
  return out
}
function iceShell(c, v, k, heat) {
  const tx = v.tx, top = v.feet - v.tH - 14, bot = v.feet + 6, w = v.tW + 40
  const pts = []; for (let i = 0; i < 12; i++) { const q = i / 12 * TAU, rr = 0.86 + 0.2 * hh(i + 70); pts.push([tx + Math.cos(q) * w / 2 * rr, (top + bot) / 2 + Math.sin(q) * (bot - top) / 2 * rr]) }
  poly(c, pts, heat > 0 ? `rgba(${R(120 + 135 * heat)},${R(200 - 90 * heat)},${R(255 - 205 * heat)},0.55)` : 'rgba(159,232,255,0.55)', heat > 0.4 ? '#fff1c0' : '#ffffff', 1, 2)
  poly(c, [[tx - w * 0.3, top + 20], [tx - w * 0.1, top + 8], [tx - w * 0.2, bot - 30]], 'rgba(255,255,255,0.45)', null, 1)
  if (heat > 0) {   // the cracks glow orange → white as it superheats
    c.save(); c.strokeStyle = heat > 0.7 ? '#fff1c0' : FIRE[3]; c.lineWidth = 2 + 2 * heat; c.globalAlpha = cl(heat * 1.4, 0, 1); c.beginPath()
    for (let i = 0; i < 6; i++) { let x = tx + (hh(i + 90) - 0.5) * w * 0.6, y = top + 10 + hh(i + 91) * (bot - top - 20); c.moveTo(x, y); for (let s = 0; s < 3; s++) { x += (hh(i * 5 + s) - 0.5) * 30; y += (hh(i * 7 + s) - 0.3) * 26; c.lineTo(x, y) } }
    c.stroke(); c.restore()
    if (heat > 0.3) for (let i = 0; i < 5; i++) { const sx = tx + (hh(i + 120) - 0.5) * w * 0.8, a = (k * 2 + i * 13) % 40; glow(c, sx, top - a, 10 + a * 0.6, 'rgba(240,244,250,0.8)', 'rgba(240,244,250,0)', (1 - a / 40) * heat) }
  }
}
function tsUnder(c, f, v) {
  const k = v.frame, V = SUPERS.thermalShock, fin = V.finale
  const onCaster = k < 40, x = onCaster ? v.cx : v.tx, y = onCaster ? v.cFeet - 70 : v.feet - v.tH * 0.5
  const spin = k < 88 ? k * 0.02 : 0.02 * 88 + (k - 88) * (k - 88) * 0.006, al = (k < 8 ? k / 8 : 1) * (k >= fin ? Math.max(0, 1 - (k - fin) / 8) : 1) * (onCaster ? 0.75 : 0.55)
  yinYang(c, x, y, onCaster ? 70 + 30 * easeO(cl(k / 20, 0, 1)) : 120 + 40 * cl((k - 40) / 40, 0, 1), spin, al)
  const S = tsSerpents(f, v); if (S) { serpent(c, S.ice, 'ice', -1, 1); serpent(c, S.fire, 'fire', -1, 1) }
}
function tsOver(c, f, v) {
  const k = v.frame, V = SUPERS.thermalShock, fin = V.finale, tx = v.tx, ty = v.feet - v.tH * 0.5
  // ice in one hand, fire in the other
  if (k < 30) { const g = easeO(cl(k / 14, 0, 1)), hx = v.cx + v.dir * 22, hy = v.cFeet - 60
    glow(c, hx, hy - 16, 26 * g, 'rgba(232,251,255,1)', 'rgba(79,182,216,0)', 1); glow(c, hx - v.dir * 30, hy + 4, 26 * g, 'rgba(255,241,192,1)', 'rgba(255,90,20,0)', 1)
    poly(c, [[hx, hy - 34 * g], [hx + 8 * g, hy - 16], [hx, hy - 2], [hx - 8 * g, hy - 16]], ICE[1], '#ffffff', g) }
  if (k >= V.contacts[0].at && k < fin) iceShell(c, v, k, k >= V.contacts[1].at ? cl((k - V.contacts[1].at) / 22, 0, 1) * 0.6 + 0.4 : 0)
  const S = tsSerpents(f, v); if (S) { serpent(c, S.ice, 'ice', 1, 1); serpent(c, S.fire, 'fire', 1, 1) }
  for (const q of V.contacts.slice(0, 2)) { const a = k - q.at; if (a >= 0 && a < 16) { ring(c, tx, ty, 30 + a * 9, q.kind === 'freeze' ? ICE[1] : FIRE[2], 1 - a / 16, 5, 1); debris(c, tx, ty, a, 14, q.at * 3, q.kind === 'freeze' ? { life: 16 } : { kind: 'ember', col: FIRE, life: 16 }) } }
  // FINALE: the ice explodes into steam — a blue ring and an orange ring racing out, shards + embers, a wall of steam
  if (k >= fin) {
    const a = k - fin
    if (a < 6) glow(c, tx, ty, 280, 'rgba(255,255,255,1)', 'rgba(230,240,250,0)', 1 - a / 6)
    ring(c, tx, ty, 30 + a * 26, ICE[1], 1 - a / 20, 8, 0.55); ring(c, tx, ty, 20 + a * 18, FIRE[2], 1 - a / 24, 8, 0.55)
    debris(c, tx, ty, a, 22, 1311, { speed: 12, up: 4, life: 36, size: 8 }); debris(c, tx, ty, a, 22, 1409, { kind: 'ember', col: FIRE, speed: 11, up: 5, life: 36, size: 5 })
    steamCloud(c, tx, ty, a, 22, 1501, 1, 52)
  }
}

let XF = null   // world → device transform recorded by the world pass, read by the screen pass
const toScreen = (x, y) => XF ? { x: XF.a * x + XF.c * y + XF.e, y: XF.b * x + XF.d * y + XF.f } : null
export function drawEnochUltUnder(c, f, v) {
  if (!v) return
  try { if (v.variant === 'absoluteZero') azUnder(c, f, v); else if (v.variant === 'flashPoint') fpUnder(c, f, v); else tsUnder(c, f, v) } catch (_) {}
}
export function drawEnochUltOver(c, f, v) {
  if (!v) return
  try { XF = c.getTransform() } catch (_) { XF = null }
  try { if (v.variant === 'absoluteZero') azOver(c, f, v); else if (v.variant === 'flashPoint') fpOver(c, f, v); else tsOver(c, f, v) } catch (_) {}
}

// ── SCREEN ──
function card(c, txt, x, y, size, fill, a = 1, rot = 0, stroke = '#06101a') {
  if (!(a > 0.01)) return
  c.save(); c.globalAlpha = cl(a, 0, 1); c.translate(x, y); if (rot) c.rotate(rot)
  c.font = `900 italic ${Math.round(size)}px Impact, "Arial Black", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'
  c.lineJoin = 'round'; c.lineWidth = Math.max(4, size / 6); c.strokeStyle = stroke; c.strokeText(txt, 0, 0); c.fillStyle = fill; c.fillText(txt, 0, 0); c.restore()
}
// THERMAL SHOCK's split-colour title: the left half frost, the right half flame
function splitCard(c, txt, x, y, size, a, rot = 0) {
  if (!(a > 0.01)) return
  c.save(); c.translate(x, y); c.rotate(rot); c.font = `900 italic ${Math.round(size)}px Impact, "Arial Black", sans-serif`; const w = c.measureText(txt).width; c.restore()
  for (const [col, st, sd] of [[ICE[1], '#0a3a5e', -1], [FIRE[2], '#4a1204', 1]]) {
    c.save(); c.beginPath(); c.rect(sd < 0 ? x - w : x, y - size * 1.5, w, size * 3); c.clip(); card(c, txt, x, y, size, col, a, rot, st); c.restore()
  }
}
const VCAM = {
  absoluteZero: [[0, 1, 'mid'], [8, 1.9, 'f'], [14, 2.05, 'f'], [22, 1.2, 'mid'], [34, 1.35, 't'], [70, 1.2, 't'], [78, 1, 'mid'], [100, 1.18, 'sky'], [112, 1.5, 't'], [118, 1.75, 't'], [126, 1.08, 't'], [140, 1, 'mid'], [150, 1.6, 'f'], [160, 1.6, 'f']],
  flashPoint: [[0, 1, 'mid'], [10, 1.8, 'f'], [18, 2.6, 'lens'], [30, 2.9, 'lens'], [36, 1.15, 'mid'], [44, 1.45, 't'], [90, 1.65, 't'], [98, 1, 'mid'], [106, 1.35, 't'], [118, 1.35, 't'], [124, 1.15, 'sun'], [134, 1.45, 'sun'], [138, 1.65, 't'], [146, 1, 't'], [160, 1, 'mid'], [166, 1.5, 'f'], [172, 1.5, 'f']],
  thermalShock: [[0, 1, 'mid'], [8, 1.85, 'f'], [24, 1.85, 'f'], [34, 1.1, 'mid'], [46, 1.6, 't'], [60, 1.25, 't'], [84, 1.6, 't'], [96, 1.3, 'mid'], [108, 1.55, 't'], [112, 1.85, 't'], [122, 1, 'mid'], [146, 1, 'mid'], [154, 1.5, 'f'], [160, 1.5, 'f']],
}
function vcam(sc, v, Wd, Ht) {
  const f = sc.caster, k = v.frame, keys = VCAM[v.variant], ctr = { x: Wd / 2, y: Ht / 2 }
  const fp = toScreen(v.cx, v.cTop + v.cH * 0.5) || ctr, tp = toScreen(v.tx, v.feet - v.tH * 0.5) || fp
  const pt = w => w === 'f' ? fp : w === 't' ? tp : w === 'lens' ? (toScreen(lensOrigin(f).x, lensOrigin(f).y) || fp) : w === 'sky' ? (toScreen(v.tx, v.feet - v.tH - 110) || tp)
    : w === 'sun' ? (toScreen(v.tx, v.feet - v.tH - 90) || tp) : { x: (fp.x + tp.x) / 2, y: (fp.y + tp.y) / 2 }
  let i = 0; while (i < keys.length - 2 && k >= keys[i + 1][0]) i++
  const A = keys[i], B = keys[i + 1], u0 = cl((k - A[0]) / Math.max(1, B[0] - A[0]), 0, 1), u = u0 * u0 * (3 - 2 * u0), pa = pt(A[2]), pb = pt(B[2])
  let z = A[1] + (B[1] - A[1]) * u
  if (v.hold > 0) z *= 1 + (v.hitKind === 'finale' ? 0.22 : v.hitKind === 'pulse' ? 0.03 : 0.08) * (v.hold / Math.max(1, v.holdN))
  return { z, x: pa.x + (pb.x - pa.x) * u, y: pa.y + (pb.y - pa.y) * u }
}
function speedLines(c, Wd, Ht, cx, cy, al, seed, col = '#ffffff', n = 40) {
  if (al <= 0.01) return
  c.save(); c.globalAlpha = al; c.fillStyle = col; const R0 = Math.hypot(Wd, Ht)
  for (let i = 0; i < n; i++) { const a = (i + hh(i + seed) * 0.8) / n * TAU, r1 = Ht * (0.2 + 0.2 * hh(i * 3 + seed)), w = 0.008 + 0.012 * hh(i + 7 + seed)
    c.beginPath(); c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a - w) * R0, cy + Math.sin(a - w) * R0); c.lineTo(cx + Math.cos(a + w) * R0, cy + Math.sin(a + w) * R0); c.closePath(); c.fill() }
  c.restore()
}
function tint(c, op, col, a, Wd, Ht) { if (!(a > 0.01)) return; c.save(); c.globalCompositeOperation = op; c.globalAlpha = cl(a, 0, 1); c.fillStyle = col; c.fillRect(0, 0, Wd, Ht); c.restore() }
// half-plane: the side of the seam through o (direction angle phi) that m0·side points to; m0 = (−sin φ, cos φ)
function halfPlane(c, o, phi, side) {
  const n = { x: Math.cos(phi), y: Math.sin(phi) }, m = { x: -n.y * side, y: n.x * side }, L = 4000
  c.beginPath(); c.moveTo(o.x + n.x * L, o.y + n.y * L); c.lineTo(o.x - n.x * L, o.y - n.y * L); c.lineTo(o.x - n.x * L + m.x * L, o.y - n.y * L + m.y * L); c.lineTo(o.x + n.x * L + m.x * L, o.y + n.y * L + m.y * L); c.closePath()
}
const TITLE_COL = { absoluteZero: [ICE[2], ICE[2], '#0a3a5e'], flashPoint: [FIRE[3], FIRE[3], '#4a1204'], thermalShock: [ICE[2], FIRE[3], '#0c0f20'] }
function titleCut(c, v, Wd, Ht, u) {
  const k = v.frame, CUT = 34; if (k >= CUT) return
  const V = SUPERS[v.variant], [cTop, cBot] = TITLE_COL[v.variant], a = k < 4 ? k / 4 : k > CUT - 6 ? (CUT - k) / 6 : 1
  const y0 = Ht * 0.15, bh = 70 * u, inL = easeO(cl(k / 7, 0, 1))
  c.save(); c.globalAlpha = a
  // two bands closing in from opposite sides — the top one his ice, the bottom one his fire (per variant)
  for (const [y, col, from] of [[y0, cTop, -1], [y0 + bh + 6 * u, cBot, 1]]) {
    c.save(); c.translate(from * (1 - inL) * Wd, 0)
    c.fillStyle = 'rgba(6,10,22,0.92)'; c.beginPath(); c.moveTo(0, y + 10 * u); c.lineTo(Wd, y - 10 * u); c.lineTo(Wd, y - 10 * u + bh); c.lineTo(0, y + 10 * u + bh); c.closePath(); c.fill()
    c.fillStyle = col; c.fillRect(0, y + (from < 0 ? 0 : bh - 4 * u), Wd, 4 * u)
    for (let i = 0; i < 7; i++) { const sx = ((k * (26 + i * 6) * -from + i * 190) % (Wd + 300) + Wd + 300) % (Wd + 300) - 150; c.globalAlpha = a * 0.45; c.fillStyle = col; c.fillRect(sx, y + 12 * u + hh(i + (from > 0 ? 9 : 0)) * (bh - 24 * u), 70 + 110 * hh(i + 3), 2 * u) }
    c.restore()
  }
  c.globalAlpha = a
  const por = image(EN.portrait)
  if (ready(por)) { const ph = bh * 1.9, pw = ph * por.naturalWidth / por.naturalHeight; c.imageSmoothingEnabled = false; c.drawImage(por, Wd * 0.07 + (1 - inL) * -300, y0 + bh + 3 * u - ph / 2, pw, ph) }
  const slam = k < 5 ? 0 : k < 11 ? 2 - easeO((k - 5) / 6) : 1
  if (slam > 0) { if (v.variant === 'thermalShock') splitCard(c, V.name, Wd * 0.58, y0 + bh * 0.55, 70 * u * slam, 1, -0.03); else card(c, V.name, Wd * 0.58, y0 + bh * 0.55, 70 * u * slam, '#ffffff', 1, -0.03, TITLE_COL[v.variant][2]) }
  if (k >= 11) card(c, V.sub, Wd * 0.6, y0 + bh * 1.5 + 6 * u, 26 * u, v.variant === 'flashPoint' ? FIRE[1] : ICE[1], cl((k - 11) / 5, 0, 1), -0.03)
  c.restore()
}
export function drawEnochUltScreen(c, cv) {
  const sc = enochUltScene(); if (!sc || !sc.view) { XF = null; return false }
  const v = sc.view, k = v.frame, Wd = cv.width, Ht = cv.height, u = Ht / 720, V = SUPERS[v.variant], fin = V.finale, sa = k - fin, cm = calm()
  const hitAge = v.hold > 0 ? v.holdN - v.hold : -1
  // 1. virtual camera re-blit (the subject lands at W/2, 0.55 H)
  const VC = vcam(sc, v, Wd, Ht), Z = cm ? Math.min(VC.z, 1.4) : VC.z
  let sx = 0, sy = 0, sz = 1
  if (Z > 1.01) { const sw2 = Wd / Z, sh2 = Ht / Z; sx = cl(VC.x - sw2 * 0.5, 0, Wd - sw2); sy = cl(VC.y - sh2 * 0.55, 0, Ht - sh2); sz = Z
    try { c.imageSmoothingEnabled = false; c.drawImage(cv, sx, sy, sw2, sh2, 0, 0, Wd, Ht) } catch (_) { sx = 0; sy = 0; sz = 1 } }
  const vm = p => p ? { x: (p.x - sx) * sz, y: (p.y - sy) * sz } : null
  const tp = vm(toScreen(v.tx, v.feet - v.tH * 0.5)) || { x: Wd / 2, y: Ht * 0.55 }, fp = vm(toScreen(v.cx, v.cTop + v.cH * 0.5)) || { x: Wd * 0.4, y: Ht * 0.55 }
  const impact = vm(toScreen(v.tx, v.floorT - 40)) || tp
  // 2. the grade
  if (v.variant === 'absoluteZero') {
    // TIME STOPS: the world drains to a cold monochrome; after the finale the colour floods back out of the impact in a ring
    const a = k < 14 ? 0 : sa < 0 ? cl((k - 14) / 12, 0, 1) * 0.92 : 0.92, rad = sa < 0 ? -1 : (sa + 1) * Math.max(Wd, Ht) / 24
    if (a > 0 && rad < Math.hypot(Wd, Ht) * 1.1) {
      c.save(); if (rad > 0) { c.beginPath(); c.rect(0, 0, Wd, Ht); c.arc(impact.x, impact.y, rad, 0, TAU, true); c.clip('evenodd') }
      tint(c, 'saturation', '#808080', a, Wd, Ht); tint(c, 'color', '#5f9fd0', a * 0.38, Wd, Ht); tint(c, 'multiply', '#bcd8ee', a * 0.35, Wd, Ht); c.restore()
      if (rad > 0) { c.save(); c.globalAlpha = 0.9 * (1 - sa / 24); c.strokeStyle = '#e8fbff'; c.lineWidth = 6 * u; c.beginPath(); c.arc(impact.x, impact.y, rad, 0, TAU); c.stroke(); c.restore() }
    }
    // the frozen snowfall: hangs in the air while time is stopped, falls again when it restarts
    if (k >= 14) { const fall = sa > 0 ? sa * 6 : 0
      c.save(); for (let i = 0; i < (cm ? 30 : 80); i++) { const x = hh(i + 600) * Wd, y = ((hh(i + 601) * Ht + fall * (0.6 + hh(i + 602))) % Ht), s = (1.5 + 2.5 * hh(i + 603)) * u
        c.globalAlpha = 0.75 * cl((k - 14) / 10, 0, 1); c.fillStyle = '#ffffff'; c.fillRect(x - s, y - s / 3, s * 2, s * 0.66); c.fillRect(x - s / 3, y - s, s * 0.66, s * 2) } c.restore() }
    if (k >= 14 && k < 34) card(c, 'TIME STOPS.', Wd / 2, Ht * 0.8, 34 * u, '#e8fbff', cl((k - 16) / 4, 0, 1) * cl((34 - k) / 5, 0, 1), 0, '#0a2a40')
  } else if (v.variant === 'flashPoint') {
    // HEAT HAZE: the frame re-blitted in thin strips, each nudged sideways by a rolling sine
    const haze = cm ? 0 : (k < 34 ? k / 34 : 1) * (sa > 0 ? Math.max(0.4, 1 - sa / 40) * 2 : 1)
    if (haze > 0.05) { const sh = Math.max(4, R(6 * u)); try { for (let y = 0; y < Ht; y += sh) { const off = Math.sin(y * 0.045 + k * 0.42) * 3.2 * u * haze; if (Math.abs(off) > 0.4) c.drawImage(cv, 0, y, Wd, sh, off, y, Wd, sh) } } catch (_) {} }
    tint(c, 'overlay', '#ff8a30', 0.22 + (k >= 44 ? 0.08 : 0), Wd, Ht)
    if (k >= 120 && sa < 0) {   // focusing the sun: the world dims around the star
      const sp = vm(toScreen(v.tx, v.feet - v.tH - 150 + (k >= 134 ? easeI((k - 134) / 4) * 150 : 0))) || tp, g = c.createRadialGradient(sp.x, sp.y, 40 * u, sp.x, sp.y, Ht * 0.9)
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,4,0,${0.78 * cl((k - 120) / 8, 0, 1)})`); c.fillStyle = g; c.fillRect(0, 0, Wd, Ht)
    }
    if (sa >= 0 && sa < 40) tint(c, 'screen', '#ff7a20', 0.5 * (1 - sa / 40), Wd, Ht)
  } else {
    // THE SPLIT: blue on his ice side, orange on his fire side; the freeze floods it blue, the heat floods it orange, then the
    // seam spins (the yin-yang) until the clap whites it out with steam
    if (sa < 0) {
      const c1 = V.contacts[0].at, c2 = V.contacts[1].at, P = { x: (fp.x + tp.x) / 2, y: Ht * 0.5 }
      const spin = k < 88 ? 0 : (k - 88) * (k - 88) * 0.0045, phi = Math.PI / 2 + 0.22 + spin
      let off = 0; if (k >= c1 && k < c2) off = Wd * 0.9 * Math.max(0, 1 - (k - c1) / 16); if (k >= c2) off = -Wd * 0.9 * Math.max(0, 1 - (k - c2) / 16)
      const side = v.dir, al = cl(k / 10, 0, 1) * (k >= 88 ? 1.25 : 1), n = { x: Math.cos(phi), y: Math.sin(phi) }, m0 = { x: -n.y, y: n.x }
      const o = { x: P.x - m0.x * off * side, y: P.y - m0.y * off * side }   // + off pushes the seam into the fire side (the ice floods)
      for (const [col, sd] of [[ICE[3], side], [FIRE[3], -side]]) { c.save(); halfPlane(c, o, phi, sd); c.clip(); tint(c, 'color', col, 0.42 * al, Wd, Ht); tint(c, 'overlay', col, 0.25 * al, Wd, Ht); c.restore() }
      const m = m0
      c.save(); c.globalAlpha = 0.9 * cl(k / 10, 0, 1); c.lineJoin = 'miter'
      for (const [w, col, dm] of [[10 * u, ICE[2], 4 * u * side], [10 * u, FIRE[2], -4 * u * side], [3 * u, '#ffffff', 0]]) {
        c.strokeStyle = col; c.lineWidth = w; c.beginPath()
        for (let i = -12; i <= 12; i++) { const t = i * Ht * 0.12, j = (hh(i + 900 + (k >> 2)) - 0.5) * 14 * u, x = o.x + n.x * t + m.x * (j + dm), y = o.y + n.y * t + m.y * (j + dm); i === -12 ? c.moveTo(x, y) : c.lineTo(x, y) }
        c.stroke() }
      c.restore()
    } else {
      const w = sa < 3 ? 1 : Math.max(0, 1 - (sa - 3) / 22)
      tint(c, 'source-over', '#eef2f7', (cm ? 0.5 : 0.88) * w * w, Wd, Ht)
      if (w > 0.05) for (let i = 0; i < 16; i++) { const x = hh(i + 700) * Wd, y = hh(i + 701) * Ht - sa * 3, r = (120 + 160 * hh(i + 702)) * u; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${0.6 * w})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2) }
    }
  }
  // vignette
  const vg = c.createRadialGradient(Wd / 2, Ht / 2, Ht * 0.32, Wd / 2, Ht / 2, Ht * 0.95)
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, v.slow ? 'rgba(0,0,0,0.62)' : 'rgba(0,0,0,0.42)'); c.fillStyle = vg; c.fillRect(0, 0, Wd, Ht)
  // 3. speed lines on the contacts + the dives
  const lineCol = v.variant === 'flashPoint' ? '#fff1c0' : '#ffffff'
  if (hitAge >= 0 && v.hitKind !== 'pulse') speedLines(c, Wd, Ht, tp.x, tp.y, v.hitKind === 'finale' ? 0.6 : 0.35, k, lineCol)
  if ((v.variant === 'absoluteZero' && k >= 110 && sa < 0) || (v.variant === 'flashPoint' && k >= 132 && sa < 0)) speedLines(c, Wd, Ht, tp.x, tp.y, 0.35, k * 7, lineCol, 30)
  // 4. impact frames (the world only — bars and type stay crisp): white → inverted → an element flash
  if (hitAge >= 0 && v.hitKind !== 'pulse') {
    const n = v.hitKind === 'finale' ? 4 : v.hitKind === 'spike' || v.hitKind === 'slash' ? 1 : 2, flashCol = v.variant === 'flashPoint' || v.hitKind === 'heat' ? '#ffd9a0' : '#d8f4ff'
    if (hitAge === 0) tint(c, 'source-over', '#ffffff', cm ? 0.3 : 0.92, Wd, Ht)
    else if (hitAge <= n && !cm) { c.save(); c.globalCompositeOperation = 'difference'; c.fillStyle = '#ffffff'; c.fillRect(0, 0, Wd, Ht); c.restore() }
    else tint(c, 'source-over', flashCol, (cm ? 0.1 : 0.28) * (v.hold / Math.max(1, v.holdN)), Wd, Ht)
  } else if (hitAge >= 0) tint(c, 'screen', '#ffb060', 0.25 * (v.hold / Math.max(1, v.holdN)), Wd, Ht)
  // 5. letterbox (an ice line on top, a fire line under — his two elements framing every one of his supers)
  const inU = easeO(cl(k / 10, 0, 1)), outU = easeO(cl((V.total - k) / 14, 0, 1)), bar = Ht * 0.11 * Math.min(inU, outU)
  c.fillStyle = '#000000'; c.fillRect(0, 0, Wd, bar); c.fillRect(0, Ht - bar, Wd, bar)
  c.globalAlpha = Math.min(inU, outU); c.fillStyle = ICE[2]; c.fillRect(0, bar - 2 * u, Wd, 2 * u); c.fillStyle = FIRE[3]; c.fillRect(0, Ht - bar, Wd, 2 * u); c.globalAlpha = 1
  // 6. title cut-in
  titleCut(c, v, Wd, Ht, u)
  // 7. callouts
  const call = (txt, at, x, y, size, col, rot, st, life = 18) => { const a = k - at; if (a >= 0 && a < life) card(c, txt, x, y, size * u * (a < 3 ? 1.5 - 0.15 * a : 1), col, cl((life - a) / 5, 0, 1), rot, st) }
  if (v.variant === 'absoluteZero') {
    ;['RIME!', 'FROST!', 'GLACIER!', 'PERMAFROST!'].forEach((t, i) => call(t, V.contacts[i].at, Wd * (i & 1 ? 0.7 : 0.3), Ht * (0.34 + 0.05 * i), 40 + 6 * i, i === 3 ? ICE[2] : '#ffffff', i & 1 ? 0.08 : -0.08, '#0a3a5e'))
    if (k >= 84 && sa < 0) card(c, 'ABSOLUTE…', Wd / 2, bar + 56 * u, 54 * u, '#d8f6ff', cl((k - 84) / 8, 0, 1), -0.03, '#0a3a5e')
    if (sa >= 1 && k < V.total - 4) card(c, 'ZERO.', Wd / 2, Ht * 0.3, 120 * u * (sa < 5 ? 1.8 - 0.8 * easeO((sa - 1) / 4) : 1), '#ffffff', cl((V.total - 8 - k) / 10, 0, 1), -0.04, '#0a3a5e')
  } else if (v.variant === 'flashPoint') {
    call('IGNITE!', 40, Wd * 0.32, Ht * 0.34, 50, FIRE[1], -0.08, '#4a1204', 22)
    const pulses = V.contacts.filter(q => q.kind === 'pulse' && k >= q.at).length
    if (pulses > 0 && k < 98) card(c, `HEAT ×${pulses}`, Wd * 0.74, Ht * 0.36, (34 + pulses * 3) * u, FIRE[2], cl((98 - k) / 6, 0, 1), 0.06, '#4a1204')
    call('CROSS', 108, Wd * 0.33, Ht * 0.32, 48, '#ffffff', -0.1, '#4a1204', 14); call('BURN!', 116, Wd * 0.67, Ht * 0.38, 56, FIRE[2], 0.1, '#4a1204', 12)
    if (k >= 122 && sa < 0) card(c, 'FOCUS…', Wd / 2, bar + 56 * u, 50 * u, FIRE[1], cl((k - 122) / 6, 0, 1), -0.03, '#4a1204')
    if (sa >= 1 && k < V.total - 4) card(c, 'FLASH POINT!', Wd / 2, Ht * 0.3, 96 * u * (sa < 5 ? 1.8 - 0.8 * easeO((sa - 1) / 4) : 1), '#fff1c0', cl((V.total - 8 - k) / 10, 0, 1), -0.04, '#4a1204')
  } else {
    call('FROZEN!', V.contacts[0].at, Wd * 0.3, Ht * 0.34, 52, ICE[1], -0.08, '#0a3a5e', 22)
    call('SUPERHEATED!', V.contacts[1].at, Wd * 0.68, Ht * 0.36, 50, FIRE[2], 0.08, '#4a1204', 22)
    if (k >= 92 && sa < 0) splitCard(c, 'ICE  ×  FIRE', Wd / 2, bar + 56 * u, 50 * u, cl((k - 92) / 6, 0, 1), -0.02)
    if (sa >= 1 && k < V.total - 4) splitCard(c, 'THERMAL SHOCK!!', Wd / 2, Ht * 0.3, 96 * u * (sa < 5 ? 1.8 - 0.8 * easeO((sa - 1) / 4) : 1), cl((V.total - 8 - k) / 10, 0, 1), -0.04)
  }
  if (k >= V.total - 26) { const a = cl((k - V.total + 26) / 8, 0, 1) * cl((V.total - k) / 8, 0, 1); card(c, 'ENOCH', Wd / 2, Ht - bar - 44 * u, 40 * u, v.variant === 'flashPoint' ? FIRE[1] : ICE[1], a, 0, '#06101a'); card(c, '“' + EN.tagline + '”', Wd / 2, Ht - bar - 14 * u - 2, 18 * u, '#eef8ff', a, 0, '#06101a') }
  if (v.shown?.total > 0 && sa >= 4) card(c, `${R(v.shown.total)} DMG`, Wd * 0.84, bar + 40 * u, 30 * u, '#ffffff', cl((sa - 4) / 6, 0, 1) * cl((V.total - k) / 10, 0, 1), -0.04, '#0a1020')
  return true
}
registerCineScreen('enoch_supers', drawEnochUltScreen)
