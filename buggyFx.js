// buggyFx.js — Buggy the Clown RENDER-ONLY presentation (HUD badge + part pips, split flashes, orbiting pieces,
// confetti, cape sweep, explosions). Reads simulation state (fighter._buggy, drones) and never writes it.
// Image objects are presentation caches. Confetti / particle positions are pure functions of the frame counter.
import { BUGGY_FX, BUGGY_PARTS } from './buggySprites.js'
import { BUGGY_WIN2_ANIM } from './buggyData.js'
import { buggyWinVariant } from './buggyState.js'
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
  if (!c || f?.rosterKey !== 'buggy') return
  drawPresentation(c, f, frame)
  if (!f._buggy) return
  const s = f._buggy
  if (s.lookT >= 0) drawLookAround(c, f, s)
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

// ── PHASE 7 PRESENTATION — intro / wins / lose / idle. Render-only: _bgIntroT / _bgEndT are presentation clocks
// on the fighter (frames since the intro / round-end pose began, from the game frame counter), never read by the
// simulation; every position is a pure function of them (hash-placed, no Math.random). ──
const hh = (i, salt) => { let h = Math.imul(i + 1, 2654435761) ^ Math.imul(salt + 7, 40503); h ^= h >>> 15; h = Math.imul(h, 2246822519); h ^= h >>> 13; return (h >>> 0) / 4294967296 }
const CONFETTI = ['#ff4a3a', '#ffd23a', '#3ab0ff', '#ffffff', '#ff7ad0', '#5ae07a']
const HEAD = BUGGY_PARTS.head.idle
function drawPresentation(c, f, frame) {
  if (f._introPlaying && !f._bgIntroOn) { f._bgIntroOn = true; f._bgIntro0 = frame }   // rising edge: restart the intro clock
  if (!f._introPlaying) f._bgIntroOn = false
  if (f._bgIntro0 != null) { f._bgIntroT = Math.min(112, frame - f._bgIntro0); if (f._bgIntroT < 112) drawIntro(c, f, f._bgIntroT) }
  const fa = f._forceAction
  if (fa === 'win' || fa === 'lose') {
    if (!f._bgEndT || f._bgEndFa !== fa) { f._bgEnd0 = frame - 1; f._bgEndFa = fa }
    const t = f._bgEndT = Math.max(1, frame - f._bgEnd0)
    if (fa === 'win') {
      const v = buggyWinVariant(f), want = v === 2 ? BUGGY_WIN2_ANIM : null
      if ((f._skinAnim || null) !== want) f._skinAnim = want   // the sim may be paused on the result screen
      if (v === 2) drawWinCape(c, f, t); else drawWinPortrait(c, f, t)
    } else { if (f._skinAnim) f._skinAnim = null; drawLose(c, f, t) }
  } else if (f._bgEndT) { f._bgEndT = 0; f._bgEndFa = null; f._bgWinVar = 0 }
}
// INTRO: his ten loose pieces fly in from all sides and snap together (over the intro strip), then confetti pops.
function drawIntro(c, f, t) {
  const { k, fx, fy } = anchor(f), cy = fy - 48 * k
  if (t < 34) {
    const p = Math.min(1, t / 28), e = 1 - Math.pow(1 - p, 3), alpha = t < 28 ? 1 : 1 - (t - 28) / 6
    for (let i = 0; i < 10; i++) {
      const a = hh(i, 1) * Math.PI * 2, d = (55 + hh(i, 2) * 45) * k
      frameOf(c, BUGGY_FX.intro, i, fx + Math.cos(a) * d * (1 - e), cy + Math.sin(a) * d * 0.7 * (1 - e) - Math.sin(p * Math.PI) * 10 * k, k * 0.85, hh(i, 9) < 0.5, alpha)
    }
  }
  if (t >= 26) {   // confetti burst (code-drawn rectangles, flutter = |cos| width)
    const tt = t - 26, fade = 1 - Math.max(0, (tt - 58) / 28)
    c.save(); c.globalAlpha = Math.max(0, fade)
    for (let i = 0; i < 40; i++) {
      const vx = (hh(i, 3) - 0.5) * 2.2, vy = -(0.8 + hh(i, 4) * 1.0)
      const x = fx + vx * tt * k, y = cy - 6 * k + (vy * tt + 0.5 * 0.07 * tt * tt) * k, rot = tt * 0.22 + i
      c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = CONFETTI[i % CONFETTI.length]
      const w = 3.2 * k * Math.max(0.2, Math.abs(Math.cos(rot * 1.7))); c.fillRect(-w / 2, -1 * k, w, 2 * k); c.restore()
    }
    c.restore()
  }
}
// WIN 1 — portrait + head: his mugshot panel drops in beside him and his detached head bobs above it, laughing.
function drawWinPortrait(c, f, t) {
  const { k, fx, fy } = anchor(f), dir = f.facing || 1, im = img(BUGGY_FX.portrait.sheet)
  const p = Math.min(1, t / 14), drop = (1 - p) * (1 - p) * 30 * k, px = fx - dir * 40 * k, py = fy - 50 * k - drop
  if (im) {
    const s = k * 0.42, w = im.width * s, h = im.height * s
    c.save(); c.globalAlpha = p; c.imageSmoothingEnabled = false
    c.fillStyle = '#1a0a04'; c.fillRect(px - w / 2 - 2 * k, py - h / 2 - 2 * k, w + 4 * k, h + 4 * k)
    c.drawImage(im, px - w / 2, py - h / 2, w, h); c.restore()
    if (t > 12) frameOf(c, HEAD, 1 + ((t >> 3) & 3), px, py - h / 2 - 12 * k + Math.sin(t * 0.18) * 2 * k, k * 0.85, dir < 0, Math.min(1, (t - 12) / 6))
  }
}
// WIN 2 — cape + knives fanned: the win2 strip is his cape-spread pose; a fan of knives snaps open in each hand.
function drawWinCape(c, f, t) {
  const { k, fx, fy } = anchor(f), p = Math.min(1, t / 10)
  for (const side of [-1, 1]) {
    const hx = fx + side * 25 * k, hy = fy - 58 * k - (1 - p) * 10 * k
    frameOf(c, BUGGY_FX.knivesFan, side < 0 ? 0 : 1, hx, hy + Math.sin(t * 0.12 + side) * 1.5 * k, k * 0.9 * p, false, p)
  }
}
// LOSE: he lies flat; his loose boots / gloves / balls are scattered on the floor around him (they bounce out).
function drawLose(c, f, t) {
  const { k, fx, fy } = anchor(f)
  for (let i = 0; i < 9; i++) {
    const side = i % 2 ? 1 : -1, d = (22 + hh(i, 5) * 48) * k, p = Math.min(1, t / (14 + i * 2))
    const x = fx + side * d * p, hop = Math.sin(p * Math.PI) * (10 + hh(i, 6) * 12) * k
    frameOf(c, BUGGY_FX.lose, i, x, fy - BUGGY_FX.lose.h * k * 0.45 - hop, k * 0.9, side < 0, 1)
  }
}
// IDLE LOOK-AROUND: the head lifts off the (headless-row) body, glances back, forward, back, then settles home.
function drawLookAround(c, f, s) {
  const { k, fx, fy } = anchor(f), p = s.lookT, dir = f.facing || 1
  const lift = Math.min(1, p / 14, (150 - p) / 14) * 5 * k
  const look = p < 30 ? dir : p < 62 ? -dir : p < 94 ? dir : p < 126 ? -dir : dir
  frameOf(c, HEAD, p > 62 && p < 94 ? 5 : 0, fx + dir * 2 * k, fy - 52 * k - lift + Math.sin(p * 0.2) * 1.2 * k, k, look < 0, 1)
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
