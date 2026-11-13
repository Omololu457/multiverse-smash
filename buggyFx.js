// buggyFx.js — Buggy the Clown RENDER-ONLY presentation (HUD badge + part pips, split flashes, orbiting pieces,
// confetti, cape sweep, explosions). Reads simulation state (fighter._buggy, drones) and never writes it.
// Image objects are presentation caches. Confetti / particle positions are pure functions of the frame counter.
import { BUGGY_FX } from './buggySprites.js'
import { getActiveDrones } from './drones.js'

const _img = {}
function img(src) {
  if (typeof Image === 'undefined' || !src) return null
  let i = _img[src]; if (!i) { i = _img[src] = new Image(); i.src = src }
  return i.complete && i.naturalWidth ? i : null
}
const PIP_ICON = { hand: './assets/buggy/parts/L5P4.png', foot: './assets/buggy/parts/L5P9.png', head: './assets/buggy/parts/L1P1.png' }
export const PART_SLOTS = ['hand', 'foot', 'head']
const SLOT_TYPE = { hand: 'buggy_hand', foot: 'buggy_foot', head: 'buggy_head' }

// Part pip state for the HUD: 'ready' (attached) · 'out' (detached) · 'cd' (snapped back, on cooldown).
export function buggyPipState(f) {
  const out = {}
  for (const slot of PART_SLOTS) {
    const type = SLOT_TYPE[slot]
    const cd = f?._gaDroneCd?.[type] || 0
    const live = getActiveDrones().some(d => d.owner === f && d.type === type && !d.dying)
    const flying = slot === 'hand' && !!f?._buggy?.handFlying
    out[slot] = live || flying ? { st: 'out' } : cd > 0 ? { st: 'cd', frac: cd / 360 } : { st: 'ready' }
  }
  return out
}

// HUD: the detached-head sprite (R1F4) badge on the Chop bar + up to 3 part pips (hand / foot / head) that grey
// out while that part is detached or on cooldown (cooldown shows a draining arc).
export function drawBuggyHud(ctx, fighter, { x, enY, pbw, flip }) {
  if (fighter?.rosterKey !== 'buggy') return
  const m = img(BUGGY_FX.smallHead.sheet)
  const s = 24, bx = flip ? x + pbw - 54 : x + 50, by = enY - 27
  ctx.save()
  ctx.beginPath(); ctx.arc(bx + s / 2, by + s / 2, s / 2 + 2, 0, Math.PI * 2)
  ctx.fillStyle = '#3a1408'; ctx.fill(); ctx.strokeStyle = '#e0582a'; ctx.lineWidth = 1.5; ctx.stroke()
  if (m) {
    ctx.imageSmoothingEnabled = false
    const k = s / Math.max(m.width, m.height)
    if (flip) { ctx.translate(bx + s, by); ctx.scale(-1, 1); ctx.drawImage(m, 0, (s - m.height * k) / 2, m.width * k, m.height * k); ctx.setTransform(1, 0, 0, 1, 0, 0) }
    else ctx.drawImage(m, bx, by + (s - m.height * k) / 2, m.width * k, m.height * k)
  }
  ctx.restore()
  const pips = buggyPipState(fighter), ps = 16, gap = 3
  PART_SLOTS.forEach((slot, i) => {
    const px = flip ? bx - (i + 1) * (ps + gap) : bx + s + 4 + i * (ps + gap), py = by + 4, p = pips[slot]
    ctx.save()
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(px, py, ps, ps)
    ctx.strokeStyle = p.st === 'ready' ? '#ffcf6a' : '#555'; ctx.lineWidth = 1; ctx.strokeRect(px + 0.5, py + 0.5, ps - 1, ps - 1)
    const ic = img(PIP_ICON[slot])
    if (ic) {
      ctx.imageSmoothingEnabled = false
      if (p.st !== 'ready') { ctx.globalAlpha = 0.35; ctx.filter = 'grayscale(1)' }
      const k = (ps - 2) / Math.max(ic.width, ic.height)
      ctx.drawImage(ic, px + (ps - ic.width * k) / 2, py + (ps - ic.height * k) / 2, ic.width * k, ic.height * k)
      ctx.filter = 'none'; ctx.globalAlpha = 1
    }
    if (p.st === 'cd') {   // cooldown arc drains as the timer runs out
      ctx.strokeStyle = '#ff7a3a'; ctx.lineWidth = 2; ctx.beginPath()
      ctx.arc(px + ps / 2, py + ps / 2, ps / 2 - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, p.frac))); ctx.stroke()
    }
    ctx.restore()
  })
}

// World-space FX (drawn after the fighter sprite). Filled in by later phases.
export function drawBuggyFx(c, f, frame = 0) {
  if (!c || f?.rosterKey !== 'buggy') return
}
