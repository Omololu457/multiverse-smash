// jesusUltFx.js — Jesus "BLESSED ENERGY" cinematic, RENDER ONLY (jesusUlt.js owns the simulation; reads the scene, never
// writes it). One screen pass (registerCineScreen) that maps world → screen through the live camera and draws, in order:
// the crash-zoom punch on contacts, the darkened sky + storm clouds that PART above him, god-rays pouring down, the halo,
// the Lion of Judah (the sheet's own lion Walk/Roaring frames), Jesus himself (his real — skinned — sprite strips, lit and
// glowing over the dimmed world; the engine sprite is hidden by _fxAlpha 0), the escalating waves of holy light and the
// sheet's own "blessed energy" light-circle burst frames on every contact, the gather into his hand, the blinding radiance,
// drifting light motes, the letterbox, the title card, subtitles in his voice, call-outs and damage numbers.
// The lion and the light circles come straight from the original JUS sheet (green-keyed at runtime, no new art files).
// No Math.random: every variation is hash(i, …). Render-only state: the image cache.
import { registerCineScreen } from './cineRegistry.js'
import { camera } from './camera.js'
import { juiceSettings } from './juiceSettings.js'
import { jesusUltScene, JU, riseAt, foeAt, poseAt } from './jesusUlt.js'

const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const seg = (k, a, b) => clamp((k - a) / Math.max(1, b - a), 0, 1)
const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
const easeOut = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) }
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const GSS = 1.18   // sprite.js GLOBAL_SPRITE_SCALE

// ── images ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const IMG = new Map()
function image(src) {
  if (!src || typeof Image === 'undefined') return null
  let im = IMG.get(src); if (!im) { im = new Image(); im.src = src; IMG.set(src, im) }
  return im
}
const ready = im => !!(im && im.complete && im.naturalWidth > 0)
const SHEET = './jesus_christ_sprite_sheet_jus_by_xxalexsmashxx_dgsphko.png'
image(SHEET)   // preload (render-only) so the lion / light circles are ready at the first cast
// green-keyed cut-outs of the original sheet (the lion and the light circles)
const KEYED = new Map()
function cut(r) {
  const key = r.join(','); let cv = KEYED.get(key); if (cv) return cv
  const im = image(SHEET); if (!ready(im) || typeof document === 'undefined') return null
  cv = document.createElement('canvas'); cv.width = r[2]; cv.height = r[3]
  const g = cv.getContext('2d'); g.drawImage(im, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3])
  try {
    const d = g.getImageData(0, 0, r[2], r[3]), p = d.data
    for (let i = 0; i < p.length; i += 4) if (p[i + 1] > 90 && p[i] < 70 && p[i + 2] < 70 && p[i + 1] - p[i] > 50) p[i + 3] = 0
    g.putImageData(d, 0, 0)
  } catch (_) { return null }
  KEYED.set(key, cv); return cv
}
// lion "Roaring" row (faces right) and the "Walk" row's first frame; the blessed-energy light circles (small → sunburst → rings)
const LION_ROAR = [[1091, 2190, 66, 45], [1157, 2190, 62, 45], [1219, 2190, 68, 45], [1287, 2190, 69, 45], [1356, 2190, 72, 45], [1428, 2190, 73, 45]]
const LION_WALK = [1094, 2139, 69, 44]
const BURST = [[24, 2669, 23, 28], [53, 2668, 29, 31], [113, 2637, 95, 94], [237, 2628, 111, 112], [369, 2617, 130, 129], [512, 2618, 124, 127], [652, 2620, 122, 121], [793, 2614, 133, 133]]

// ── world → screen (live camera, plus this pass's crash-zoom) ───────────────────────────────────────────────────────
let PZ = { z: 1, x: 0, y: 0 }
function S(wx, wy, W, H) {
  const z = camera.zoom || 1
  const x = (wx - (camera.x || 0) - (camera.leadX || 0) + (camera.shakeX || 0)) * z + W / 2
  const y = (wy - (camera.y || 0) + (camera.shakeY || 0)) * z + H / 2
  return { x: (x - PZ.x) * PZ.z + PZ.x, y: (y - PZ.y) * PZ.z + PZ.y, s: z * PZ.z }
}

// ── pieces ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function sprite(c, f, action, idx, cx, feetY, s, glow, extraLight) {
  const def = f.animationData?.[action] || f.animationData?.idle; if (!def) return null
  const im = image(def.sheet); if (!ready(im)) return null
  const fw = def.width, fh = def.height, i = Math.min(idx, (def.frames || 1) - 1)
  const sc = (f.spriteScale || 1.95) * GSS * s, w = fw * sc, h = fh * sc
  c.save(); c.imageSmoothingEnabled = false
  c.translate(cx, feetY); if ((f.facing || 1) < 0) c.scale(-1, 1)
  if (glow > 0) { c.shadowColor = `rgba(255,226,140,${Math.min(1, glow)})`; c.shadowBlur = 28 * s * glow }
  c.drawImage(im, i * fw, 0, fw, fh, -w / 2, -h, w, h)
  c.shadowBlur = 0
  if (extraLight > 0) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, extraLight); c.drawImage(im, i * fw, 0, fw, fh, -w / 2, -h, w, h) }
  c.restore()
  return { w, h }
}
function lion(c, sc, W, H) {
  const k = sc.k; if (k < JU.lionIn || k > JU.gather + 16) return
  const d = sc.d, p = S(sc.cx0 - d * 64, sc.floorF, W, H)   // on the ground beneath / behind him, facing the foe
  const form = ease(seg(k, JU.lionIn, JU.lionIn + 18)), fade = 1 - ease(seg(k, JU.gather, JU.gather + 16))
  const a = form * fade; if (a <= 0.01) return
  let r = LION_WALK
  if (k >= JU.roar - 10 && k < JU.roar + 26) { const t = k - (JU.roar - 10); r = LION_ROAR[t < 4 ? 0 : t < 8 ? 1 : t < 26 ? (((t >> 2) & 1) ? 3 : 2) : t < 32 ? 4 : 5] }
  else if (k >= JU.roar + 26) r = LION_ROAR[5]
  const im = cut(r); if (!im) return
  const s = 2.6 * p.s, w = r[2] * s, h = r[3] * s, rise = (1 - form) * 26 * p.s
  c.save(); c.imageSmoothingEnabled = false; c.translate(p.x, p.y - rise); if (d < 0) c.scale(-1, 1)
  // a golden aura, then the lion, then (while forming / dissolving) a light-made overlay
  c.globalAlpha = a; c.shadowColor = 'rgba(255,210,110,0.95)'; c.shadowBlur = 30 * p.s
  c.drawImage(im, -w / 2, -h, w, h); c.shadowBlur = 0
  const lit = Math.max(1 - form, 1 - fade) * 1.2 + (k >= JU.roar && k < JU.roar + 8 ? 0.4 : 0)
  if (lit > 0.02) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, lit) * a; c.drawImage(im, -w / 2, -h, w, h) }
  c.restore()
  // the ROAR: sound-rings off the lion's mouth, rolling toward the foe
  const ra = k - JU.roar
  if (ra >= -2 && ra < 30) {
    const mx = p.x + d * w * 0.42, my = p.y - h * 0.62
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let j = 0; j < 4; j++) {
      const u = (ra + 2 - j * 5) / 22; if (u < 0 || u > 1) continue
      const R = (30 + 520 * easeOut(u)) * p.s
      c.globalAlpha = (1 - u) * 0.8; c.strokeStyle = j & 1 ? '#ffd36b' : '#fff6da'; c.lineWidth = (10 - j * 1.5) * (1 - u) * p.s + 1
      c.beginPath(); c.arc(mx, my, R, d > 0 ? -0.75 : Math.PI - 0.75, d > 0 ? 0.75 : Math.PI + 0.75); c.stroke()
    }
    c.restore()
  }
}
function clouds(c, W, H, jx, dark, open, real) {
  if (dark <= 0.01) return
  c.save()
  for (let i = 0; i < 18; i++) {
    const side = i & 1 ? 1 : -1, spread = hash(i, 2)
    let x = jx + side * (W * 0.06 + spread * W * 0.85) + Math.sin(real * 0.004 + i) * 10
    x += side * open * W * (0.16 + 0.16 * (1 - spread))                       // the clouds PART above him
    const y = H * (0.06 + 0.30 * hash(i, 3)), r = H * (0.09 + 0.07 * hash(i, 4)), tone = 30 + (hash(i, 5) * 26 | 0)
    for (let j = 0; j < 6; j++) {                                              // a cloud = a bank of flattened puffs
      const px = x + (j - 2.5) * r * 0.62 + (hash(i * 7 + j, 7) - 0.5) * r * 0.3, py = y - Math.sin((j + 0.5) / 6 * Math.PI) * r * 0.32 + (hash(i * 7 + j, 8) - 0.5) * r * 0.2
      const rx = r * (0.55 + 0.35 * hash(i * 7 + j, 9)), ry = rx * 0.66
      const g = c.createRadialGradient(px - rx * 0.2, py - ry * 0.45, rx * 0.05, px, py, rx)
      g.addColorStop(0, `rgba(${tone + 36},${tone + 30},${tone + 54},${0.95 * dark})`); g.addColorStop(0.5, `rgba(${tone + 4},${tone},${tone + 24},${0.92 * dark})`)
      g.addColorStop(0.85, `rgba(${tone - 14},${tone - 16},${tone + 4},${0.6 * dark})`); g.addColorStop(1, 'rgba(10,8,20,0)')
      c.fillStyle = g; c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2); c.fill()
    }
    if (open > 0.05) {                                                         // the edge facing the opening, rim-lit by the light behind
      const lx = x - side * r * 1.5, lg = c.createRadialGradient(lx, y, 0, lx, y, r * 0.9)
      lg.addColorStop(0, `rgba(255,214,140,${0.5 * open * dark})`); lg.addColorStop(1, 'rgba(255,214,140,0)')
      c.fillStyle = lg; c.beginPath(); c.ellipse(lx, y, r * 0.9, r * 0.6, 0, 0, Math.PI * 2); c.fill()
    }
  }
  c.restore()
}
function godRays(c, W, H, jx, jy, power, real, hero) {
  if (power <= 0.01) return
  const ox = jx, oy = -H * 0.18
  c.save(); c.globalCompositeOperation = 'screen'
  // the opening itself: a soft white-gold glow at the top of the frame
  const og = c.createRadialGradient(ox, H * 0.0, 0, ox, H * 0.0, H * 0.55)
  og.addColorStop(0, `rgba(255,252,236,${0.85 * power})`); og.addColorStop(0.35, `rgba(255,224,150,${0.4 * power})`); og.addColorStop(1, 'rgba(255,210,120,0)')
  c.fillStyle = og; c.fillRect(0, 0, W, H)
  for (let i = 0; i < 13; i++) {
    const ang = (hash(i, 11) - 0.5) * 1.1, wd = 0.018 + 0.05 * hash(i, 12), L = H * 1.5
    const flick = 0.75 + 0.25 * Math.sin(real * (0.03 + 0.02 * hash(i, 13)) + i * 2.1)
    const a = power * (0.08 + 0.14 * hash(i, 14)) * flick
    const g = c.createLinearGradient(ox, oy, ox + Math.sin(ang) * L, oy + Math.cos(ang) * L)
    g.addColorStop(0, `rgba(255,250,225,${a})`); g.addColorStop(0.55, `rgba(255,225,150,${a * 0.7})`); g.addColorStop(1, 'rgba(255,210,120,0)')
    c.fillStyle = g; c.beginPath(); c.moveTo(ox, oy)
    c.lineTo(ox + Math.sin(ang - wd) * L, oy + Math.cos(ang - wd) * L); c.lineTo(ox + Math.sin(ang + wd) * L, oy + Math.cos(ang + wd) * L); c.closePath(); c.fill()
  }
  // the main beam: straight down onto him
  if (hero > 0) {
    const bw = W * 0.05 * (0.8 + 0.4 * hero), g = c.createLinearGradient(0, 0, 0, jy + H * 0.1)
    g.addColorStop(0, `rgba(255,255,245,${0.75 * hero})`); g.addColorStop(0.8, `rgba(255,236,180,${0.45 * hero})`); g.addColorStop(1, 'rgba(255,230,170,0)')
    c.fillStyle = g; c.beginPath(); c.moveTo(ox - bw * 0.5, 0); c.lineTo(ox + bw * 0.5, 0); c.lineTo(jx + bw * 1.1, jy + H * 0.1); c.lineTo(jx - bw * 1.1, jy + H * 0.1); c.closePath(); c.fill()
  }
  c.restore()
}
function halo(c, hx, hy, s, amt, real, burst) {
  if (amt <= 0.01) return
  const R = 46 * s * amt
  c.save(); c.globalCompositeOperation = 'lighter'
  const g = c.createRadialGradient(hx, hy, 0, hx, hy, R * 3.2)
  g.addColorStop(0, `rgba(255,250,220,${0.55 * amt})`); g.addColorStop(0.3, `rgba(255,220,130,${0.3 * amt})`); g.addColorStop(1, 'rgba(255,200,100,0)')
  c.fillStyle = g; c.beginPath(); c.arc(hx, hy, R * 3.2, 0, Math.PI * 2); c.fill()
  // turning spokes of light
  c.globalAlpha = 0.5 * amt; c.fillStyle = '#ffe9b0'
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2 + real * 0.006, L = R * (2.2 + 0.9 * hash(i, 21)), wd = 0.025
    c.beginPath(); c.moveTo(hx + Math.cos(a) * R * 1.05, hy + Math.sin(a) * R * 1.05)
    c.lineTo(hx + Math.cos(a - wd) * L, hy + Math.sin(a - wd) * L); c.lineTo(hx + Math.cos(a + wd) * L, hy + Math.sin(a + wd) * L); c.closePath(); c.fill()
  }
  // the ring
  c.globalAlpha = 0.95 * amt; c.strokeStyle = '#fff3c8'; c.lineWidth = Math.max(2, 5 * s); c.beginPath(); c.arc(hx, hy, R, 0, Math.PI * 2); c.stroke()
  c.globalAlpha = 0.6 * amt; c.strokeStyle = '#ffc857'; c.lineWidth = Math.max(1, 2 * s); c.beginPath(); c.arc(hx, hy, R * 1.18, 0, Math.PI * 2); c.stroke()
  // the halo's birth: one wide ring rolling out
  if (burst >= 0 && burst < 1) {
    c.globalAlpha = (1 - burst) * 0.9; c.lineWidth = Math.max(1, 10 * s * (1 - burst)); c.strokeStyle = '#fffbe6'
    c.beginPath(); c.arc(hx, hy, R + 520 * s * easeOut(burst), 0, Math.PI * 2); c.stroke()
  }
  c.restore()
}
function burstAt(c, x, y, size, age, alpha = 1) {
  // the sheet's own blessed-energy circles: orb → sunburst → ring burst → ring → dashed ring
  const seq = [2, 2, 3, 3, 4, 4, 4, 5, 5, 6, 6, 7, 7, 7], fi = seq[Math.min(seq.length - 1, Math.floor(age / 2.2))]
  const im = cut(BURST[fi]); if (!im) return
  const grow = 0.55 + 0.6 * easeOut(age / 30), sz = size * grow, a = alpha * (1 - seg(age, 14, 32))
  if (a <= 0) return
  c.save(); c.imageSmoothingEnabled = false; c.globalCompositeOperation = 'lighter'; c.globalAlpha = a
  c.drawImage(im, x - sz / 2, y - sz / 2, sz, sz); c.restore()
}
function wave(c, cx, cy, reach, u, power, W, H) {
  // an expanding band of holy light from his body, washing across the screen
  if (u <= 0 || u >= 1) return
  const R = reach * easeOut(u), band = (90 + 70 * power) * (1 - 0.4 * u)
  c.save(); c.globalCompositeOperation = 'screen'
  const g = c.createRadialGradient(cx, cy, Math.max(0, R - band), cx, cy, R + band * 0.25)
  const a = (1 - u) * (0.55 + 0.2 * power)
  g.addColorStop(0, 'rgba(255,220,130,0)'); g.addColorStop(0.55, `rgba(255,214,120,${a * 0.6})`); g.addColorStop(0.85, `rgba(255,252,236,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g; c.fillRect(0, 0, W, H)
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = (1 - u) * 0.9; c.strokeStyle = '#fffdf0'; c.lineWidth = 3 + 4 * power * (1 - u)
  c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke()
  c.restore()
}
function motes(c, W, H, amt, real, n = 70, rise = 0.6) {
  if (amt <= 0.01) return
  c.save(); c.globalCompositeOperation = 'lighter'
  for (let i = 0; i < n; i++) {
    const sp = rise * (0.4 + hash(i, 31)), y = H * 1.05 - ((real * sp + hash(i, 32) * H * 1.2) % (H * 1.2))
    const x = hash(i, 33) * W + Math.sin(real * 0.02 + i) * 14, r = (1.2 + 2.6 * hash(i, 34)) * (H / 720)
    const tw = 0.5 + 0.5 * Math.sin(real * 0.09 + i * 1.7)
    c.globalAlpha = amt * (0.35 + 0.5 * tw); c.fillStyle = i % 4 ? '#ffe6a0' : '#ffffff'
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}
function gatherFx(c, hx, hy, k, s, W, H) {
  if (k < JU.gather || k >= JU.final) return
  const u0 = seg(k, JU.gather, JU.final)
  c.save(); c.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 60; i++) {
    const t = ((k - JU.gather) / 18 + hash(i, 41)) % 1, a = hash(i, 42) * Math.PI * 2, R0 = (0.35 + 0.5 * hash(i, 43)) * Math.max(W, H)
    const R = R0 * (1 - t) * (1 - t), x = hx + Math.cos(a) * R, y = hy + Math.sin(a) * R, tail = 0.12 * R0 * (1 - t)
    c.globalAlpha = 0.25 + 0.7 * t; c.strokeStyle = i % 3 ? '#ffd774' : '#ffffff'; c.lineWidth = 1.5 + 2 * t
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * tail, y + Math.sin(a) * tail); c.stroke()
  }
  // the light he holds: a growing star
  const R = (8 + 46 * ease(u0)) * s, g = c.createRadialGradient(hx, hy, 0, hx, hy, R * 2.4)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,240,190,0.9)'); g.addColorStop(1, 'rgba(255,210,110,0)')
  c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(hx, hy, R * 2.4, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#ffffff'
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + k * 0.03, L = R * (3 + 2 * u0)
    c.beginPath(); c.moveTo(hx + Math.cos(a) * L, hy + Math.sin(a) * L); c.lineTo(hx + Math.cos(a + 1.57) * R * 0.2, hy + Math.sin(a + 1.57) * R * 0.2)
    c.lineTo(hx - Math.cos(a) * L * 0.05, hy - Math.sin(a) * L * 0.05); c.lineTo(hx + Math.cos(a - 1.57) * R * 0.2, hy + Math.sin(a - 1.57) * R * 0.2); c.closePath(); c.fill() }
  c.restore()
}
// ── type ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SERIF = "Georgia, 'Times New Roman', serif"
function glowText(c, txt, x, y, px, fill, alpha, glow = '#ffcf6a', stroke = 'rgba(30,18,0,0.85)') {
  if (alpha <= 0) return
  c.save(); c.globalAlpha = alpha; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 ${px}px ${SERIF}`
  c.shadowColor = glow; c.shadowBlur = px * 0.6; c.lineWidth = Math.max(2, px * 0.1); c.strokeStyle = stroke; c.strokeText(txt, x, y)
  c.fillStyle = fill; c.fillText(txt, x, y); c.shadowBlur = 0; c.fillText(txt, x, y); c.restore()
}
function title(c, W, H, k, f) {
  if (k < JU.titleIn || k > JU.titleOut) return
  const u = H / 720, inU = easeOut(seg(k, JU.titleIn, JU.titleIn + 10)), outU = ease(seg(k, JU.titleOut - 10, JU.titleOut))
  const a = inU * (1 - outU), y = H * 0.2, bh = 118 * u
  c.save(); c.globalAlpha = a
  // a deep royal band with gold rules, a light sweep across it
  const g = c.createLinearGradient(0, y - bh / 2, 0, y + bh / 2); g.addColorStop(0, 'rgba(12,16,48,0.92)'); g.addColorStop(1, 'rgba(26,18,52,0.92)')
  const wide = W * (0.2 + 0.8 * inU)
  c.fillStyle = g; c.fillRect(W / 2 - wide / 2, y - bh / 2, wide, bh)
  c.fillStyle = '#e8c060'; c.fillRect(W / 2 - wide / 2, y - bh / 2, wide, 3 * u); c.fillRect(W / 2 - wide / 2, y + bh / 2 - 3 * u, wide, 3 * u)
  const sx = W * (-0.2 + 1.4 * seg(k, JU.titleIn + 4, JU.titleIn + 34)), sg = c.createLinearGradient(sx - 120 * u, 0, sx + 120 * u, 0)
  sg.addColorStop(0, 'rgba(255,240,200,0)'); sg.addColorStop(0.5, 'rgba(255,240,200,0.25)'); sg.addColorStop(1, 'rgba(255,240,200,0)')
  c.fillStyle = sg; c.fillRect(W / 2 - wide / 2, y - bh / 2, wide, bh)
  // portrait in a gold ring
  const por = image(f?.portrait || './jesus_portrait.png'), px = W / 2 - 300 * u, pr = 46 * u
  c.save(); c.beginPath(); c.arc(px, y, pr, 0, Math.PI * 2); c.clip(); c.fillStyle = '#1a1438'; c.fillRect(px - pr, y - pr, pr * 2, pr * 2)
  if (ready(por)) { const s = (pr * 2.2) / Math.max(por.naturalWidth, por.naturalHeight); c.imageSmoothingEnabled = false; c.drawImage(por, px - por.naturalWidth * s / 2, y - por.naturalHeight * s / 2 + 6 * u, por.naturalWidth * s, por.naturalHeight * s) }
  c.restore()
  c.strokeStyle = '#f2d27a'; c.lineWidth = 3 * u; c.beginPath(); c.arc(px, y, pr, 0, Math.PI * 2); c.stroke()
  c.restore()
  c.save(); c.globalAlpha = a; c.textAlign = 'left'; c.textBaseline = 'middle'
  c.font = `600 ${15 * u}px ${SERIF}`; c.fillStyle = '#e8c060'; c.fillText('J E S U S   ·   U L T I M A T E', W / 2 - 236 * u, y - 30 * u)
  c.restore()
  const slam = k < JU.titleIn + 8 ? 1.5 - 0.5 * easeOut(seg(k, JU.titleIn, JU.titleIn + 8)) : 1
  c.save(); c.translate(W / 2 + 40 * u, y + 12 * u); c.scale(slam, slam)
  glowText(c, 'BLESSED ENERGY', 0, 0, 58 * u, '#fff8e2', a)
  c.restore()
}
const LINES = [
  [12, 50, 'Father… let Your light shine upon this place.'],
  [66, 100, 'Fear not.'],
  [106, 148, 'Behold — the Lion of the tribe of Judah.'],
  [JU.gather, JU.final + 4, 'Let there be light.'],
  [JU.descend0 - 4, JU.total, 'Go in peace.'],
]
function subtitle(c, W, H, k, bar) {
  const u = H / 720
  for (const [a, b, txt] of LINES) {
    if (k < a || k > b) continue
    const al = Math.min(seg(k, a, a + 6), 1 - seg(k, b - 6, b))
    c.save(); c.globalAlpha = al; c.textAlign = 'center'; c.textBaseline = 'middle'
    const y = H - Math.max(bar, 60 * u) / 2
    c.font = `600 ${12 * u}px ${SERIF}`; c.fillStyle = '#e8c060'; c.fillText('JESUS', W / 2, y - 17 * u)
    c.font = `italic 400 ${24 * u}px ${SERIF}`; c.fillStyle = '#fbf4e0'; c.shadowColor = 'rgba(255,210,120,0.6)'; c.shadowBlur = 10 * u
    c.fillText(txt, W / 2, y + 8 * u); c.restore()
  }
}
const CALLS = ['THE LION OF JUDAH', 'GRACE', 'GLORY', 'BLESSED ENERGY']
function callouts(c, W, H, sc) {
  const u = H / 720
  for (const e of sc.impacts) {
    if (e.i > 3) continue
    const age = sc.real - e.real; if (age < 0 || age > 44) continue
    const pop = age < 5 ? 1.7 - 0.7 * easeOut(age / 5) : 1 + 0.002 * age, a = 1 - seg(age, 30, 44)
    const px = [40, 50, 62, 84][e.i] * u, y = e.i === 3 ? H * 0.5 : H * (0.3 + 0.04 * e.i)
    c.save(); c.translate(W / 2, y); c.scale(pop, pop); glowText(c, CALLS[e.i], 0, 0, px, e.i === 3 ? '#ffffff' : '#fff3cc', a, e.i === 3 ? '#ffd76a' : '#ffbf47'); c.restore()
  }
}
function numbers(c, W, H, sc) {
  const sh = sc.shown, u = H / 720; if (!sh) return
  const age = sc.real - sh.real
  if (age < 60 && sh.amt > 0) {
    const p = foeAt(sc.k), q = S(p.x, p.y - sc.th - 20, W, H), a = 1 - seg(age, 40, 60), pop = age < 4 ? 1.5 - 0.5 * age / 4 : 1
    c.save(); c.translate(q.x, q.y - age * 0.6 * u); c.scale(pop, pop); c.textAlign = 'center'; c.textBaseline = 'middle'
    c.globalAlpha = a; c.font = `900 ${34 * u}px ${SERIF}`; c.lineWidth = 6 * u; c.strokeStyle = '#2a1a00'; c.strokeText(`${sh.amt}`, 0, 0)
    c.fillStyle = sh.i === 3 ? '#ffffff' : '#ffe08a'; c.fillText(`${sh.amt}`, 0, 0); c.restore()
  }
  if (sc.hits > 0) {
    c.save(); c.textAlign = 'right'; c.textBaseline = 'middle'; c.font = `700 ${22 * u}px ${SERIF}`; c.fillStyle = '#fff3cc'; c.shadowColor = '#ffbf47'; c.shadowBlur = 10 * u
    c.globalAlpha = 1 - seg(sc.k, JU.out, JU.total)
    c.fillText(`${sc.hits} ${sc.hits === 1 ? 'WAVE' : 'WAVES'}  ·  ${Math.round(sc.dealt)} DAMAGE`, W - 30 * u, H * 0.16)
    c.restore()
  }
}

// ── the pass ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function drawScreen(c, cv) {
  const sc = jesusUltScene(); if (!sc) return false
  const W = cv.width, H = cv.height, k = sc.pk ?? sc.k, real = sc.real | 0, f = sc.caster, quiet = calm(), u = H / 720
  const last = sc.impacts[sc.impacts.length - 1], age = last ? real - last.real : 999
  // 1. CRASH ZOOM: the finished world frame punches in around each contact
  PZ = { z: 1, x: W / 2, y: H / 2 }
  if (!quiet && last && age < 14 && last.i <= 3) {
    const z = 1 + 0.045 * (last.power || 1) * (1 - age / 14) * (age < 2 ? 1.5 : 1)
    const fp = (() => { const P0 = PZ; const p = S(last.x, last.y, W, H); PZ = P0; return p })()
    try { c.drawImage(cv, fp.x - fp.x / z, fp.y - fp.y / z, W / z, H / z, 0, 0, W, H) } catch (_) {}
    PZ = { z, x: fp.x, y: fp.y }
  }
  const r = riseAt(k), feet = S(sc.cx0, sc.floorF - r, W, H), s = feet.s
  const fh = (f.animationData?.idle?.height || 58) * (f.spriteScale || 1.95) * GSS * s
  const jx = feet.x, chest = { x: jx + sc.d * 6 * s, y: feet.y - fh * 0.62 }, head = { x: jx, y: feet.y - fh * 0.9 }
  // 2. the sky darkens … and after the radiance, it clears
  const dark = ease(seg(k, 0, 36)) * (1 - ease(seg(k, JU.final + 12, JU.final + 70)))
  const open = ease(seg(k, JU.part, JU.part + 24))
  if (dark > 0) {
    const g = c.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, `rgba(5,4,18,${0.93 * dark})`); g.addColorStop(0.5, `rgba(10,8,26,${0.78 * dark})`); g.addColorStop(1, `rgba(14,9,24,${0.62 * dark})`)
    c.fillStyle = g; c.fillRect(0, 0, W, H)
  }
  if (k >= JU.gather && k < JU.final) { c.fillStyle = `rgba(4,3,12,${0.35 * ease(seg(k, JU.gather, JU.final))})`; c.fillRect(0, 0, W, H) }
  clouds(c, W, H, jx, Math.max(dark, 0), open, real)
  // 3. the heavens open: god-rays (stronger on every wave; withdrawn during the gather; a gentle single beam after)
  const waveBoost = [JU.roar, JU.wave1, JU.wave2].reduce((m, at, i) => Math.max(m, (k >= at && k < at + 20) ? (1 - (k - at) / 20) * (0.3 + 0.2 * i) : 0), 0)
  const gatherDim = k >= JU.gather && k < JU.final ? 1 - 0.75 * ease(seg(k, JU.gather, JU.gather + 14)) : 1
  const rays = open * (1 - ease(seg(k, JU.final + 20, JU.final + 70))) * gatherDim * (1 + waveBoost)
  const peace = k >= JU.final + 20 ? 0.45 * ease(seg(k, JU.final + 20, JU.final + 60)) * (1 - seg(k, JU.out + 6, JU.total)) : 0
  godRays(c, W, H, jx, feet.y, Math.max(rays, peace * 0.6), real, Math.max(rays * 0.9, peace))
  // 4. halo behind his head
  const haloAmt = ease(seg(k, JU.halo, JU.halo + 18)) * (1 - 0.6 * seg(k, JU.descend1, JU.total))
  halo(c, head.x, head.y, s, haloAmt, real, k >= JU.halo ? (k - JU.halo) / 34 : -1)
  // 5. the Lion of Judah
  lion(c, sc, W, H)
  // 6. Jesus — his own sprite, lit
  const [act, idx] = poseAt(k)
  const lit = k >= JU.final && k < JU.final + 8 ? 0.8 : (last && age < 6 && last.i < 3 ? 0.35 * (1 - age / 6) : 0)
  sprite(c, f, act, idx, jx, feet.y, s, 0.55 + 0.45 * Math.max(open, haloAmt), lit)
  // 7. light motes (rising since the heavens opened; drifting freely in the aftermath)
  motes(c, W, H, open * 0.55 * (1 - seg(k, JU.gather, JU.gather + 8)) + (k >= JU.final ? 0.9 * (1 - seg(k, JU.out + 4, JU.total)) : 0), real, 70, k >= JU.final ? 0.35 : 0.7)
  // 8. the waves: hits 1-3 roll out from him; every contact flowers into the sheet's blessed-energy circles on the foe
  const foeP = foeAt(k), foe = S(foeP.x, foeP.y - sc.th * 0.5, W, H)
  const reach = Math.max(Math.hypot(foe.x - chest.x, foe.y - chest.y) + 260 * s, W * 0.7)
  for (const e of sc.impacts) {
    const a = real - e.real
    if (e.i >= 1 && e.i <= 2) wave(c, chest.x, chest.y, reach, a / (26 + 6 * e.i), e.power, W, H)
    if (e.i <= 2 && sc.affected && !e.spared) {
      burstAt(c, foe.x, foe.y, (90 + 50 * e.i) * s * e.power, a + 9, 0.7)
      if (a < 10) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createRadialGradient(foe.x, foe.y, 0, foe.x, foe.y, 90 * s); g.addColorStop(0, `rgba(255,250,230,${0.8 * (1 - a / 10)})`); g.addColorStop(1, 'rgba(255,220,140,0)'); c.fillStyle = g; c.fillRect(foe.x - 90 * s, foe.y - 90 * s, 180 * s, 180 * s); c.restore() }
    }
  }
  // 9. the gather into his hands
  gatherFx(c, chest.x, chest.y, k, s, W, H)
  // 10. RADIANCE: white-out → the sheet's sunburst grown to fill the screen → rings → a warm fade back
  const fin = sc.impacts.find(e => e.i === 3)
  if (fin) {
    const a = real - fin.real, big = Math.max(W, H) * 2.1
    burstAt(c, chest.x, chest.y, big, a * 0.9, 1)
    c.save(); c.globalCompositeOperation = 'lighter'
    for (let j = 0; j < 3; j++) { const q = (a - j * 6) / 40; if (q < 0 || q > 1) continue
      c.globalAlpha = (1 - q) * 0.8; c.strokeStyle = j === 1 ? '#ffd36b' : '#ffffff'; c.lineWidth = (16 - j * 4) * (1 - q) * u + 1
      c.beginPath(); c.arc(chest.x, chest.y, 40 * u + Math.max(W, H) * 1.1 * easeOut(q), 0, Math.PI * 2); c.stroke() }
    c.restore()
    const wa = a < 3 ? (quiet ? 0.45 : 1) : (quiet ? 0.3 : 0.92) * Math.pow(clamp(1 - (a - 3) / 46, 0, 1), 1.6)
    if (wa > 0) { c.fillStyle = a < 3 ? `rgba(255,255,255,${wa})` : `rgba(255,246,222,${wa})`; c.fillRect(0, 0, W, H) }
  }
  // contact flashes on the waves
  if (last && last.i <= 2 && age < 10 && !fin) { c.fillStyle = `rgba(255,248,225,${(quiet ? 0.15 : 0.5) * Math.pow(1 - age / 10, 2)})`; c.fillRect(0, 0, W, H) }
  // warm grade in the aftermath
  if (k >= JU.final + 20) { const v = c.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H / 2, H); v.addColorStop(0, 'rgba(255,220,150,0)'); v.addColorStop(1, `rgba(120,80,20,${0.28 * (1 - seg(k, JU.out, JU.total))})`); c.fillStyle = v; c.fillRect(0, 0, W, H) }
  // 11. letterbox, title, subtitles, call-outs, numbers
  const bar = H * 0.11 * easeOut(seg(real, 0, 12)) * (1 - ease(seg(k, JU.out, JU.total)))
  c.fillStyle = '#000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar)
  c.fillStyle = 'rgba(232,192,96,0.8)'; c.fillRect(0, bar - 2 * u, W, 2 * u * (bar > 4 ? 1 : 0)); c.fillRect(0, H - bar, W, 2 * u * (bar > 4 ? 1 : 0))
  title(c, W, H, k, f)
  callouts(c, W, H, sc)
  numbers(c, W, H, sc)
  subtitle(c, W, H, k, bar)
  return true
}
registerCineScreen('jesus', drawScreen)
