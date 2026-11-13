// spdRedFx.js — S.P.D. Red Ranger RENDER-ONLY presentation: HUD (gem-badged Delta bar, teleport pips, JUDGMENT meter),
// the blink streak / dissolve / afterimages, hit sparks. Reads simulation state (fighter._spdRed, fighter._ranger)
// and never writes it. Image objects are presentation caches. Any jitter is a pure hash of (frame, slot).
import { SPD_RED_FX } from './spdRedSprites.js'
import { rangerHudState, rangerBodyAlpha, badgeRGBA, getRangerProfile } from './rangers.js'

const _img = {}
function img(src) {
  if (typeof Image === 'undefined' || !src) return null
  let i = _img[src]; if (!i) { i = _img[src] = new Image(); i.src = src }
  return i.complete && i.naturalWidth ? i : null
}
export const hash = (a, b = 0) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const isRed = f => f?.rosterKey === 'spd_red'
const SCALE = f => (f?.spriteScale || 2.4 / 1.18) * 1.18   // the engine draws sprites at spriteScale × 1.18

function sprite(c, key, x, y, { rot = 0, sx = 1, sy = 1, alpha = 1, anchor = 'c' } = {}) {
  const F = SPD_RED_FX[key], im = img(F?.sheet); if (!im) return
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha *= alpha
  c.translate(x, y); if (rot) c.rotate(rot); c.scale(sx, sy)
  c.drawImage(im, -im.width / 2, anchor === 'b' ? -im.height : -im.height / 2)
  c.restore()
}

// HUD state (tests read it).
export function spdRedHudState(f) {
  const h = rangerHudState(f)
  return h ? { ...h, delta: f.energy, lockout: f._spdRed?.lockout || 0 } : null
}

// Body opacity for game.js's renderHybridFighter (blink dissolve / vanish). 1 for everyone else.
export function spdRedBodyAlpha(f) { return isRed(f) ? rangerBodyAlpha(f) : 1 }

// HUD: the WANTED-poster GEM as the Delta bar's badge, two diamond TELEPORT pips (refilling ones fill up) and a
// 20-segment JUDGMENT meter under them.
export function drawSpdRedHud(ctx, fighter, { x, enY, pbw, flip }) {
  if (!isRed(fighter)) return
  const st = spdRedHudState(fighter) || { pips: [1, 1], meter: 0, meterMax: 20 }
  const gem = img(SPD_RED_FX.gem.sheet)
  const s = 24, bx = flip ? x + pbw - 54 : x + 50, by = enY - 27
  ctx.save()
  ctx.beginPath(); ctx.arc(bx + s / 2, by + s / 2, s / 2 + 2, 0, Math.PI * 2)
  ctx.fillStyle = '#1a0606'; ctx.fill(); ctx.strokeStyle = st.lockout > 0 ? '#555' : '#36d6e6'; ctx.lineWidth = 1.5; ctx.stroke()
  if (gem) {
    ctx.imageSmoothingEnabled = false
    const k = (s - 2) / Math.max(gem.width, gem.height)
    if (st.lockout > 0) ctx.filter = 'grayscale(1)'
    ctx.drawImage(gem, bx + s / 2 - gem.width * k / 2, by + s / 2 - gem.height * k / 2, gem.width * k, gem.height * k)
    ctx.filter = 'none'
  }
  // TELEPORT pips: diamonds (gem cyan when charged; a spent one fills from the bottom as it recharges)
  const step = flip ? -14 : 14, px0 = flip ? bx - 10 : bx + s + 8
  for (let i = 0; i < st.pips.length; i++) {
    const cx = px0 + i * step, cy = by + 6, r = 6, v = st.pips[i]
    ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath()
    ctx.fillStyle = '#251010'; ctx.fill()
    if (v > 0) {
      ctx.save(); ctx.clip()
      ctx.fillStyle = v >= 1 ? '#36d6e6' : 'rgba(54,214,230,0.45)'
      ctx.fillRect(cx - r, cy + r - 2 * r * v, 2 * r, 2 * r * v); ctx.restore()
    }
    ctx.strokeStyle = v >= 1 ? '#e8ffff' : '#7a5050'; ctx.lineWidth = 1; ctx.stroke()
  }
  ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd0d0'
  ctx.fillText('BLINK', px0 + step * 0.5, by + 22)
  // JUDGMENT meter: 20 segments; gold when ready, pulsing while an INNOCENT re-attempt window is open
  if (st.meterMax) {
    const mx = flip ? px0 + 2 * step - 4 - 60 : px0 + 2 * step + 4, my = by + 2, mw = 60, mh = 8
    const ready = st.judgReady, segs = st.meterMax, filled = st.meter || 0
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(mx - 1, my - 1, mw + 2, mh + 2)
    for (let i = 0; i < segs; i++) {
      const sx = mx + (flip ? mw - (i + 1) * (mw / segs) : i * (mw / segs))
      ctx.fillStyle = i < filled ? (ready ? (st.judgHold > 0 ? (Math.floor(st.judgHold / 8) % 2 ? '#fff3a0' : '#ffd23c') : '#ffd23c') : '#e0201c') : '#2a1818'
      ctx.fillRect(sx + 0.5, my, mw / segs - 1, mh)
    }
    ctx.fillStyle = ready ? '#ffe680' : '#ffb0b0'; ctx.textAlign = flip ? 'right' : 'left'
    ctx.fillText(st.verdict === 'guilty' ? 'JUDGMENT: GUILTY' : ready ? 'JUDGMENT READY' : 'JUDGMENT', flip ? mx + mw : mx, my + mh + 9)
  }
  ctx.restore()
  drawJudgmentPoster(ctx, fighter)
}

// JUDGMENT (screen space, HUD pass): the WANTED poster slides down onto the HUD while time is frozen, then the
// verdict is stamped on it — a red X (GUILTY, stays small in the corner while the card holds the foe) or a cyan O
// (INNOCENT, while the re-attempt window is open). Pure function of f._ranger.judg.
function drawJudgmentPoster(ctx, f) {
  const j = f._ranger?.judg, J = getRangerProfile(f)?.judgment; if (!j || !J) return
  const poster = img(SPD_RED_FX.poster.sheet); if (!poster) return
  const sc = ctx.getTransform?.().a || 1, W = (ctx.canvas?.width || 1280) / sc
  let show = 0, big = true
  if (j.phase === 'freeze') show = Math.min(1, (j.t + 1) / 10)                    // slide in over 10 f
  else if (j.contain > 0) { show = 1; big = J.guilty.seal - j.contain < 45 }      // GUILTY: big for 45 f, then corner
  else if (j.hold > 0 && J.innocent.holdFull - j.hold < 60) show = 1              // INNOCENT: 1 s
  if (!show) return
  const k = big ? 2 : 0.9, pw = poster.width * k, ph = poster.height * k
  const x = big ? W / 2 - pw / 2 : W / 2 - pw / 2, y = big ? -ph + (ph + 70) * show : 64
  ctx.save(); ctx.imageSmoothingEnabled = false
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x - 4, y - 4, pw + 8, ph + 22 * k / 2 + 8)
  ctx.drawImage(poster, x, y, pw, ph)
  // verdict strip (code-drawn UI; the poster's own credit band is excluded from the game)
  ctx.fillStyle = '#c2ab7f'; ctx.fillRect(x, y + ph, pw, 11 * k)
  ctx.fillStyle = '#2a1a10'; ctx.font = `bold ${Math.round(9 * k)}px Arial`; ctx.textAlign = 'center'
  const label = j.phase === 'freeze' ? 'SCANNING…' : j.verdict === 'guilty' ? 'GUILTY' : 'INNOCENT'
  ctx.fillText(label, x + pw / 2, y + ph + 9 * k)
  if (j.phase !== 'freeze') {   // the stamp over the mugshot
    const cx = x + pw / 2, cy = y + ph * 0.62, r = 20 * k
    ctx.lineWidth = 5 * k / 2; ctx.lineCap = 'round'
    if (j.verdict === 'guilty') {
      ctx.strokeStyle = '#ff2a1a'
      ctx.beginPath(); ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r); ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r); ctx.stroke()
    } else { ctx.strokeStyle = '#36d6e6'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke() }
  }
  ctx.restore()
}

// Behind the body: the blink streak afterimages + dissolve particles (render-only, from f._ranger.blink).
export function drawSpdRedUnder(c, f, frame = 0) {
  if (!c || !isRed(f)) return
  const b = f._ranger?.blink; if (!b) return
  const B = getRangerProfile(f).blink, k = SCALE(f), w = f.w ?? 48, h = f.h ?? 94
  const fy = (f.y || 0) + h, d = b.dir || f.facing || 1
  const flash = b.dodge   // DODGE: the streak flashes white
  if (b.phase === 'start') {   // R17 F1 — he dissolves into horizontal streaks where he stands
    sprite(c, 'streakH', b.x0 + w / 2, fy, { sx: k * d, sy: k, alpha: 0.4 + 0.6 * (b.t + 1) / B.startup, anchor: 'b' })
    dissolve(c, b.x0 + w / 2, fy - h * 0.55, b.t, b.n, flash)
  } else if (b.phase === 'travel' && b.x1 != null) {   // R17 F2 — the streak along the path + fading afterimages
    const u = (b.t - B.startup + 1) / B.travel
    for (let i = 3; i >= 1; i--) {
      const uu = Math.max(0, u - i * 0.22), gx = b.x0 + (b.x1 - b.x0) * uu + w / 2, gy = b.y0 + (b.y1 - b.y0) * uu + h
      sprite(c, 'streakH', gx, gy, { sx: k * d, sy: k, alpha: 0.18 * (4 - i), anchor: 'b' })
    }
    const x = (f.x || 0) + w / 2
    sprite(c, 'streakD', x, fy, { sx: k * d, sy: k, alpha: 0.95, anchor: 'b' })
    c.save()
    c.strokeStyle = flash ? 'rgba(255,255,255,0.95)' : badgeRGBA(f, 0.75)
    c.lineWidth = flash ? 5 : 3
    for (let j = 0; j < 4; j++) {   // speed lines from the start point to him
      const yy = fy - h * (0.25 + 0.17 * j) + (hash(b.n, j) - 0.5) * 8
      c.beginPath(); c.moveTo(b.x0 + w / 2 - d * 10, yy); c.lineTo(x - d * 14, yy); c.stroke()
    }
    if (flash) { c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(x, fy - h / 2, w, h * 0.7, 0, 0, Math.PI * 2); c.fill() }
    c.restore()
  } else if (b.phase === 'recover') {   // re-forms: the streak collapses onto him
    sprite(c, 'streakD', (f.x || 0) + w / 2, fy, { sx: k * d, sy: k, alpha: 0.6 * (1 - (b.t - B.startup - B.travel) / B.recovery), anchor: 'b' })
    dissolve(c, (f.x || 0) + w / 2, fy - h * 0.55, B.recovery - (b.t - B.startup - B.travel), b.n + 7, flash)
  }
}
function dissolve(c, x, y, t, seed, white) {
  c.save(); c.fillStyle = white ? 'rgba(255,255,255,0.9)' : 'rgba(255,60,40,0.85)'
  for (let i = 0; i < 14; i++) {
    const a = hash(seed, i) * Math.PI * 2, r = 10 + t * 9 * hash(seed + 3, i)
    c.fillRect(x + Math.cos(a) * r, y + Math.sin(a) * r * 1.4, 3, 3)
  }
  c.restore()
}

// In front of the body: impact sparks (sim-recorded fx list; the sprite pick + jitter are render-only).
export function drawSpdRedFx(c, f, frame = 0) {
  if (!c || !isRed(f)) return
  drawJudgmentWorld(c, f, frame)
  const s = f._spdRed; if (!s) return
  for (const b of s.fx || []) {
    const life = Math.min(1, b.t / 6)
    sprite(c, 'bolt', b.x, b.y, { sx: 1.8 + (12 - b.t) * 0.12, sy: 1.8 + (12 - b.t) * 0.12, rot: hash(b.n, 1) * 6.28, alpha: life })
  }
}

// JUDGMENT in the world: a scanner sweep over the frozen foe (freeze) and the glass CONTAINMENT CARD with the gem
// around a sealed foe (code-drawn card + the gem sprite). Reads the judge's state only.
function drawJudgmentWorld(c, f, frame) {
  const j = f._ranger?.judg; if (!j) return
  if (j.phase === 'freeze') {
    const t = j.t, x = (f.x || 0) + (f.w ?? 48) / 2 + (f.facing || 1) * 60
    c.save(); c.strokeStyle = 'rgba(54,214,230,0.8)'; c.lineWidth = 2
    for (let i = 0; i < 3; i++) {   // morpher scan beam fanning out
      c.beginPath(); c.moveTo(x, (f.y || 0) + 40); c.lineTo(x + (f.facing || 1) * 900, (f.y || 0) + 40 + (i - 1) * (20 + t * 3)); c.stroke()
    }
    c.restore()
  }
  if (j.contain > 0) {
    const w = 48 + 40, h = 94 + 40, x = j.sealX + 24 - w / 2, y = j.sealY - 20
    const pulse = 0.5 + 0.5 * Math.sin(frame / 5)
    c.save()
    c.fillStyle = `rgba(120,230,255,${0.18 + 0.08 * pulse})`; c.fillRect(x, y, w, h)
    c.strokeStyle = 'rgba(200,250,255,0.95)'; c.lineWidth = 3; c.strokeRect(x, y, w, h)
    c.strokeStyle = 'rgba(54,214,230,0.6)'; c.lineWidth = 1
    for (let k = 1; k < 4; k++) { c.beginPath(); c.moveTo(x + k * w / 4, y); c.lineTo(x + k * w / 4 - 10, y + h); c.stroke() }   // glass glints
    c.restore()
    sprite(c, 'gem', x + w / 2, y - 4, { sx: 1.6, sy: 1.6, rot: Math.sin(frame / 12) * 0.2 })
    c.save(); c.font = 'bold 13px Arial'; c.textAlign = 'center'; c.fillStyle = '#ff3a2a'
    c.fillText('GUILTY', x + w / 2, y + h + 14); c.restore()
  }
}
