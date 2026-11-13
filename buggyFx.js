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
  const a = f.attacking ? f.currentAttack : null, g = a?.bg, t = a ? a.total - a.timer : 0
  if (g?.kind === 'super' && t < 24) drawCartWheelIn(c, f, t)
  if (g?.kind === 'cape' && t >= g.window[0] && t < g.window[1]) drawCape(c, f, t - g.window[0])
  if (s.festival > 0) drawFestival(c, f, s, frame)
  if (s.nullFlash > 0) drawNullify(c, f, s)
  if (s.stagger > 0) drawReassembly(c, f, s)
  for (const b of s.balls || []) drawBall(c, f, b)
  for (const b of s.booms || []) drawBoom(c, b)
  for (const x of s.stabFx || []) drawStab(c, f, x)
}

function frameOf(c, fx, i, cx, cy, k, flip = false, alpha = 1) {
  const im = img(fx.sheet); if (!im) return
  c.save(); c.globalAlpha = alpha; c.imageSmoothingEnabled = false; c.translate(cx, cy); if (flip) c.scale(-1, 1)
  c.drawImage(im, (i % (fx.frames || 1)) * fx.w, 0, fx.w, fx.h, -fx.w * k / 2, -fx.h * k / 2, fx.w * k, fx.h * k); c.restore()
}
// FESTIVAL: the sheet's spinning-piece strip, four copies orbiting the body (positions = f(frame)).
function drawFestival(c, f, s, frame) {
  const { k, fx, fy } = anchor(f), cy = fy - 40 * k, R = 40 * k, fade = Math.min(1, s.festival / 30)
  for (let j = 0; j < 4; j++) {
    const ang = frame * 0.12 + j * Math.PI / 2
    frameOf(c, BUGGY_FX.orbit, (frame >> 2) + j * 7, fx + Math.cos(ang) * R, cy + Math.sin(ang) * R * 0.55, k * 1.05, false, fade)
  }
}
function drawBall(c, f, b) {
  const { k } = anchor(f), fxd = b.sup ? BUGGY_FX.ballBuggy : BUGGY_FX.ballPlain
  frameOf(c, fxd, 0, b.x, b.y, k * (b.sup ? 1.3 : 1.15))
}
function drawBoom(c, b) {   // code-drawn explosion (render-only)
  const p = 1 - b.t / 20, r = (b.big ? 70 : 56) * (0.35 + p * 0.75)
  c.save(); c.globalCompositeOperation = 'lighter'
  const gr = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, r)
  gr.addColorStop(0, `rgba(255,250,200,${0.9 * (1 - p)})`); gr.addColorStop(0.45, `rgba(255,160,40,${0.75 * (1 - p)})`); gr.addColorStop(1, 'rgba(200,40,0,0)')
  c.fillStyle = gr; c.beginPath(); c.arc(b.x, b.y, r, 0, Math.PI * 2); c.fill()
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 0.5 * (1 - p); c.fillStyle = '#3a2a22'
  for (let i = 0; i < 6; i++) { const an = i * 1.047 + b.x * 0.01, d = r * 0.9; c.beginPath(); c.arc(b.x + Math.cos(an) * d, b.y + Math.sin(an) * d * 0.7, 5 + 6 * p, 0, Math.PI * 2); c.fill() }
  c.restore()
}
function drawStab(c, f, x) {
  const { k } = anchor(f)
  frameOf(c, BUGGY_FX.cannonHand, 0, x.x - x.dir * 28, x.y - 8, k, x.dir < 0, Math.min(1, x.t / 6))
}
function drawCartWheelIn(c, f, t) {   // the cannon cart rolls in behind him as he splits apart
  const { k, fx, fy } = anchor(f), dir = f.facing || 1, p = Math.min(1, t / 14)
  frameOf(c, BUGGY_FX.cartGhost, 0, fx - dir * (120 - 70 * p) * k / 2.3, fy - BUGGY_FX.cartGhost.h * k / 2, k, dir < 0, 0.55 * (1 - Math.max(0, (t - 14) / 10)))
}
function drawCape(c, f, t) {
  const { k, fx, fy } = anchor(f), dir = f.facing || 1
  frameOf(c, BUGGY_FX.capes, Math.min(3, t >> 2), fx + dir * 22 * k / 2.3, fy - 42 * k, k, dir < 0, t < 8 ? 1 : 0.7)
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
