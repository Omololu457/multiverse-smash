// sanjiFx.js — Sanji RENDER-ONLY presentation (HUD Heat bar warmth + glass badge + Course pips, world FX: flames,
// embers, heat shimmer, kick afterimages, the cigarette glow, the Going Merry intro flash, Course callouts).
// Reads simulation state (fighter._sanji, timers) and never writes it. Image objects are presentation caches.
import { SANJI_FX } from './sanjiSprites.js'

const _img = {}
function img(src) {
  if (typeof Image === 'undefined') return null
  let i = _img[src]; if (!i) { i = _img[src] = new Image(); i.src = src }
  return i.complete && i.naturalWidth ? i : null
}
const lerp = (a, b, t) => a + (b - a) * t
// Heat colour ramp: cool blue (0) → orange (0.6) → white-hot (1).
export function heatColor(r, alpha = 1) {
  const stops = [[0, [74, 140, 255]], [0.55, [255, 140, 30]], [0.85, [255, 210, 120]], [1, [255, 252, 240]]]
  let i = 0; while (i < stops.length - 2 && r > stops[i + 1][0]) i++
  const [r0, c0] = stops[i], [r1, c1] = stops[i + 1], t = Math.max(0, Math.min(1, (r - r0) / (r1 - r0)))
  return `rgba(${Math.round(lerp(c0[0], c1[0], t))},${Math.round(lerp(c0[1], c1[1], t))},${Math.round(lerp(c0[2], c1[2], t))},${alpha})`
}

// HUD (energy panel, before the bar): the cocktail-glass badge pinned to the Heat label.
export function drawSanjiHud(ctx, fighter, { x, enY, pbw, flip }) {
  if (fighter?.rosterKey !== 'sanji') return
  const g = img(SANJI_FX.glass.sheet)
  const s = 22, bx = flip ? x + pbw - 52 : x + 50, by = enY - 25
  const r = Math.max(0, Math.min(1, (fighter.energy || 0) / (fighter.maxEnergy || 100)))
  ctx.save()
  ctx.beginPath(); ctx.arc(bx + s / 2, by + s / 2, s / 2 + 2, 0, Math.PI * 2)
  ctx.fillStyle = '#1c2236'; ctx.fill(); ctx.strokeStyle = heatColor(r); ctx.lineWidth = 1.5; ctx.stroke()
  if (g) {
    ctx.imageSmoothingEnabled = false
    const k = (s - 4) / Math.max(g.width, g.height), w = g.width * k, h = g.height * k
    ctx.drawImage(g, bx + (s - w) / 2, by + (s - h) / 2, w, h)
  }
  const st = fighter._sanji
  if (st && (st.dj > 0 || st.djLock)) {   // Diable Jambe status next to the badge
    ctx.font = 'bold 8px Arial'; ctx.textAlign = flip ? 'right' : 'left'; ctx.textBaseline = 'alphabetic'
    const tx = flip ? bx - 6 : bx + s + 6
    if (st.dj > 0) { ctx.fillStyle = st.djOver > 0 ? '#fff4d8' : '#ffb04a'; ctx.fillText((st.djOver > 0 ? 'HELL MEMORIES ' : 'DIABLE JAMBE ') + Math.ceil(st.dj / 60) + 's', tx, by + 9) }
    else { ctx.fillStyle = 'rgba(200,210,230,0.7)'; ctx.fillText('JAMBE SPENT — empty to relight', tx, by + 9) }
  }
  ctx.restore()
}

// HUD (energy panel, right after the shared fill): repaint the Heat fill so it WARMS as it fills — blue at the
// empty end, orange through the middle, white-hot at the top. Pure overpaint of the shared fill rect.
export function drawSanjiHeatFill(ctx, fighter, { fillX, enY, fillW, enH, x, pbw, flip }) {
  if (fighter?.rosterKey !== 'sanji' || !(fillW > 0)) return
  const r = Math.max(0, Math.min(1, (fighter.energy || 0) / (fighter.maxEnergy || 100)))
  const x0 = flip ? x + 8 + pbw : x + 8, x1 = flip ? x + 8 : x + 8 + pbw
  const g = ctx.createLinearGradient(x0, 0, x1, 0)
  for (const t of [0, 0.25, 0.5, 0.75, 1]) g.addColorStop(t, heatColor(t))
  ctx.save()
  ctx.fillStyle = g
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(fillX, enY, fillW, enH, Math.min(4, fillW / 2)); else ctx.rect(fillX, enY, fillW, enH); ctx.fill()
  if (r > 0.8) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,200,0.18)'; ctx.fillRect(fillX, enY, fillW, enH) }
  ctx.restore()
}

// World-space FX, drawn after the fighter sprite (game.js render list). Pulses derive from the sim clock
// (deterministic visuals); nothing here touches simulation state.
export function drawSanjiFx(c, f) {
  if (!c || f?.rosterKey !== 'sanji') return
  if (f._introPlaying) drawMerryFlash(c, f)
  if (!f._sanji) return
  const s = f._sanji
  if (s.dj > 0 || (f.attacking && f.currentAttack?.sj?.kind === 'ignite')) drawDiable(c, f, s)
  if (s.lastHit && (s.clock - s.lastHit[0]) < 22) drawImpactEmbers(c, s)
  drawCigarette(c, f, s)
}

// Deterministic per-particle pseudo-random (render-only; integer hash of particle index + seed).
const hr = (i, k) => { let h = (i * 374761393 + k * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
// The burning leg's anchor: the kicking foot while a kick is live (front of the hitbox reach), else the front shin.
function legPoint(f) {
  const a = f.attacking ? f.currentAttack : null, z = a?.sj, w = f.w || 48, h = f.h || 94, face = f.facing || 1, cx = f.x + w / 2
  if (z && !z.noHit && a.rangeX) {
    const by = z.centered ? f.y + (z.boxY ?? 20) + (a.rangeY || 40) / 2 : f.y + (z.boxY ?? 20) + Math.min(a.rangeY || 40, 60) / 2
    return { x: cx + face * (w / 2 + a.rangeX * 0.55), y: by, len: 26 }
  }
  return { x: cx + face * 7, y: f.y + h * 0.78, len: h * 0.4 }
}
// DIABLE JAMBE: flames licking up the leg, a heat shimmer around it, sparks; during the spin-up the fire builds.
function drawDiable(c, f, s) {
  const t = s.clock || 0, p = legPoint(f)
  const spin = f.attacking && f.currentAttack?.sj?.kind === 'ignite'
  const build = spin ? Math.max(0, Math.min(1, (f.currentAttack.total - f.currentAttack.timer) / 34)) : 1
  const fade = spin ? 1 : Math.min(1, s.dj / 45)
  const over = s.djOver > 0
  const N = Math.round((over ? 16 : 11) * build)
  c.save(); c.globalCompositeOperation = 'lighter'
  // heat shimmer (soft orange haze)
  const g = c.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34 + p.len * 0.6)
  g.addColorStop(0, `rgba(255,170,60,${0.32 * build * fade})`); g.addColorStop(1, 'rgba(255,90,0,0)')
  c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, 34 + p.len * 0.6, 0, Math.PI * 2); c.fill()
  for (let i = 0; i < N; i++) {
    const life = 18 + Math.floor(hr(i, 3) * 14), ph = ((t + Math.floor(hr(i, 1) * life)) % life) / life
    const ox = (hr(i, 2) - 0.5) * 14 + Math.sin((t + i * 7) * 0.31) * 3, oy = (hr(i, 4) - 0.5) * p.len
    const x = p.x + ox, y = p.y + oy - ph * 26, r = (1 - ph) * (over ? 7 : 5.5) + 1
    c.fillStyle = ph < 0.3 ? `rgba(255,250,225,${0.85 * fade})` : ph < 0.65 ? `rgba(255,170,50,${0.7 * fade})` : `rgba(230,70,10,${0.45 * fade * (1 - ph)})`
    c.beginPath(); c.ellipse(x, y, r * 0.7, r * 1.3, 0, 0, Math.PI * 2); c.fill()
  }
  if (spin) {   // the friction spin: a fast orange ring around the planted leg
    const ang = t * 0.9
    c.strokeStyle = `rgba(255,150,40,${0.25 + 0.5 * build})`; c.lineWidth = 3
    c.beginPath(); c.ellipse(f.x + (f.w || 48) / 2, f.y + (f.h || 94) * 0.9, 30, 8, 0, ang, ang + Math.PI * 1.3); c.stroke()
  }
  c.restore()
}
// Embers on impact (render-only): a burst at the last landed kick; orange-white when the leg was burning.
function drawImpactEmbers(c, s) {
  const [at, x, y, lit] = s.lastHit, k = (s.clock - at) / 22
  c.save(); c.globalCompositeOperation = 'lighter'
  const n = lit ? 14 : 6
  for (let i = 0; i < n; i++) {
    const ang = hr(i + at, 7) * Math.PI * 2, sp = 20 + hr(i + at, 8) * 40
    const px = x + Math.cos(ang) * sp * k, py = y + Math.sin(ang) * sp * k + 18 * k * k, r = (1 - k) * (lit ? 3.2 : 2)
    c.fillStyle = lit ? `rgba(255,${Math.round(150 + 100 * (1 - k))},60,${1 - k})` : `rgba(200,225,255,${0.8 * (1 - k)})`
    c.beginPath(); c.arc(px, py, r + 0.5, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}

// Mouth point of the pocket-pose frames (R6/R7): the cigarette tip sits 6px in front of / 42px above the feet
// pivot in sheet pixels (read off assets/sanji/idle.png). Scaled by the live draw scale.
const CIG = { dx: 6, dy: 42 }
const POCKET_ACTIONS = new Set(['idle', 'idleLong', 'walk', 'walk_back', 'intro', 'sIntroLight', 'win'])
function drawCigarette(c, f, s) {
  const act = f.spriteHandler?.currentAction || 'idle'
  if (!POCKET_ACTIONS.has(act)) return
  const k = (f._lastDrawW || 320 * 1.95) / 320, face = f.facing || 1
  const x = f.x + (f.w || 48) / 2 + face * CIG.dx * k, y = f.y + (f.h || 94) - CIG.dy * k
  const r = Math.max(0, Math.min(1, (f.energy || 0) / (f.maxEnergy || 100)))
  const t = s.clock || 0, flick = 0.75 + 0.25 * Math.sin(t * 0.21) * Math.sin(t * 0.07)
  const rad = (2 + r * 5) * flick
  c.save(); c.globalCompositeOperation = 'lighter'
  const g = c.createRadialGradient(x, y, 0, x, y, rad * 2.4)
  g.addColorStop(0, `rgba(255,${Math.round(200 + 55 * r)},${Math.round(120 + 120 * r)},${0.55 + 0.4 * r})`)
  g.addColorStop(0.4, `rgba(255,110,30,${0.25 + 0.35 * r})`)
  g.addColorStop(1, 'rgba(255,60,0,0)')
  c.fillStyle = g; c.beginPath(); c.arc(x, y, rad * 2.4, 0, Math.PI * 2); c.fill()
  c.restore()
}

function drawMerryFlash(c, f) {
  const t = f._introRevealFrame || 0, m = img(SANJI_FX.merry.sheet)
  if (!m || t > 60) return
  const a = t < 8 ? t / 8 : t < 40 ? 1 : (60 - t) / 20
  const flash = t < 14 && (t >> 1) % 2 === 0   // two white strobes on arrival
  const k = 2.4, w = m.width * k, h = m.height * k, cx = f.x + (f.w || 48) / 2, y = f.y - h - 18
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = Math.max(0, a)
  c.drawImage(m, cx - w / 2, y, w, h)
  if (flash) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 * a; c.drawImage(m, cx - w / 2, y, w, h) }
  c.restore()
}
