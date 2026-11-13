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

// World-space FX (drawn after the fighter sprite). Pure functions of sim state + the frame counter.
export function drawBuggyFx(c, f, frame = 0) {
  if (!c || f?.rosterKey !== 'buggy' || !f._buggy) return
  const s = f._buggy
  if (s.nullFlash > 0) drawNullify(c, f, s)
  if (s.stagger > 0) drawReassembly(c, f, s)
}

// Sprite-space anchor from the fighter's last real draw rect (cell 160×112, origin 80,100 → feet centre).
function anchor(f) {
  const k = (f._lastDrawH || 0) > 0 ? f._lastDrawH / 112 : 2.3
  const fx = (f._lastDrawW || 0) > 0 ? f._lastDrawX + f._lastDrawW / 2 : f.x + (f.w ?? 48) / 2
  const fy = (f._lastDrawH || 0) > 0 ? f._lastDrawY + 100 * k : f.y + (f.h ?? 94)
  return { k, fx, fy }
}
// Draw a sheet frame with its BOTTOM-centre at (fx, fy).
function blitFeet(c, im, sx, sy, sw, sh, fx, fy, flip, k) {
  c.save(); c.translate(fx, fy); if (flip) c.scale(-1, 1)
  c.drawImage(im, sx, sy, sw, sh, -sw * k / 2, -sh * k, sw * k, sh * k); c.restore()
}

// BARA BARA NO MI: the blade passes through — a solid white silhouette flash over his body, two ghost halves that
// slide apart along the cut and snap back, and a thin white cut line. 24 frames.
function drawNullify(c, f, s) {
  const { k, fx, fy } = anchor(f), flip = (f.facing || 1) < 0
  const t = s.nullFlash / 24                                      // 1 → 0
  const open = Math.sin(Math.min(1, (1 - t) * 1.4) * Math.PI) * 9 * k / 2.3
  c.save(); c.imageSmoothingEnabled = false
  const sp = img(BUGGY_FX.split.sheet)
  if (sp && t < 0.85) {
    const fw = BUGGY_FX.split.w, fh = BUGGY_FX.split.h
    c.globalAlpha = 0.55 * t
    blitFeet(c, sp, 0, 0, fw, fh, fx - open, fy - open * 0.5, flip, k)
    blitFeet(c, sp, fw, 0, fw, fh, fx + open, fy + open * 0.2, flip, k)
  }
  const si = img(BUGGY_FX.silhouette.sheet)
  if (si && t > 0.55) {   // first ~10 frames: solid white body flash
    c.globalAlpha = Math.min(1, (t - 0.55) * 3.5)
    blitFeet(c, si, 0, 0, BUGGY_FX.silhouette.w, BUGGY_FX.silhouette.h, fx, fy, flip, k)
  }
  const cy = fy - 34 * k, ang = ((s.nullSeq * 37) % 50 - 25) * Math.PI / 180, L = 30 * k
  c.globalAlpha = Math.min(1, t * 1.6); c.strokeStyle = '#ffffff'; c.lineWidth = 2
  c.beginPath(); c.moveTo(fx - Math.cos(ang) * L, cy - Math.sin(ang) * L); c.lineTo(fx + Math.cos(ang) * L, cy + Math.sin(ang) * L); c.stroke()
  c.restore()
}

// CHOP STAGGER: the body shows the head+hand-detached row (mask 3) while the head and hand fly back in. 60 frames.
const REASSEMBLE = [['head', -1.0, -0.55], ['hand', 1.1, -0.15]]
function drawReassembly(c, f, s) {
  const { k, fx, fy } = anchor(f), t = s.stagger / 60, wob = Math.sin(s.clock * 0.6) * 2
  c.save(); c.imageSmoothingEnabled = false
  for (const [slot, ox, oy] of REASSEMBLE) {
    const im = img(PIP_ICON[slot]); if (!im) continue
    const px = fx + ox * 30 * k * t + wob, py = fy - 52 * k + oy * 40 * k * t - Math.sin(t * Math.PI) * 6 * k
    blitFeet(c, im, 0, 0, im.width, im.height, px, py + im.height * k / 2, (f.facing || 1) < 0, k)
  }
  c.restore()
}
