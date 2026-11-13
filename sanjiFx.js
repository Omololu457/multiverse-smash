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
  drawCigarette(c, f, f._sanji)
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
