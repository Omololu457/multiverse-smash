// ninjaStormFx.js — NINJA STORM RANGERS RENDER-ONLY layer. Reads `_nsr` / `_academy` / `_ranger` and never writes
// them. Everything here is presentation: the Shadow Clone ghost (the ACTIVE stance's own strips at ~0.6 alpha with a
// cool tint — no new art), Ninja Vanish streaks (sheet row R2), the Kawarimi swap streaks, the stance-swap smoke ring,
// the Mode aura, the lock-on reticle + beam / shockwave (sheet row R21), the Ultimate's fist-burst / debris strips,
// impact sparks, the HUD (Vanish pips, stance tag + dial, clone / Mode bars).
import { NS_ANIMS, NS_ULT, NS_TIMELINES, STANCE_LOOK, isNinjaStorm } from './ninjaStormData.js'
import { NS_FX } from './ninjaStormSprites.js'
import { getAcademyProfile, academyHudState } from './ninjaAcademy.js'
import { rangerHudState } from './rangers.js'
import { nsUltPhase, stance } from './ninjaStormState.js'
import { GLOBAL_SPRITE_SCALE } from './sprite.js'

const cache = new Map(), tinted = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
const fxOf = f => NS_FX[stance(f)]
const animsOf = f => NS_ANIMS[stance(f)]
// both stances' strips warm in the image cache the first time he is drawn (render-only; a swap never shows a blank frame)
let _warm = false
function warm() { if (_warm || typeof Image === 'undefined') return; _warm = true; for (const st of ['red', 'yellow']) { for (const a of Object.values(NS_ANIMS[st])) image(a.sheet); for (const d of Object.values(NS_FX[st])) image(d.sheet) } }
const scaleOf = f => (f.spriteScale || 2.33) * GLOBAL_SPRITE_SCALE
const frameAt = (key, A, el) => {
  const a = A[key]; if (!a) return 0
  const tl = a.frameTimeline || NS_TIMELINES[key]
  if (tl) return tl.reduce((i, [at, fr]) => el >= at ? fr : i, 0)
  return Math.min(a.frames - 1, Math.floor(el / (a.speed || 6)) % (a.loop ? a.frames : Number.MAX_SAFE_INTEGER))
}
// A strip with a cool tint baked in (cached per sheet + tint; render-only canvases, never game state)
function tintedStrip(im, tint) {
  const k = im.src + '|' + tint
  let cv = tinted.get(k)
  if (!cv && ready(im) && typeof document !== 'undefined') {
    cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight
    const x = cv.getContext('2d'); x.drawImage(im, 0, 0)
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = 0.42; x.fillStyle = tint; x.fillRect(0, 0, cv.width, cv.height)
    tinted.set(k, cv)
  }
  return cv
}
// Draw anim `key` frame `fr` of the fighter's own strips with the cell origin at world (cx, feet).
function drawCell(c, f, key, fr, cx, feet, dir, alpha, tint = null) {
  const a = animsOf(f)[key]; if (!a) return
  const im = image(a.sheet); if (!ready(im)) return
  const src = tint ? tintedStrip(im, tint) : im; if (!src) return
  const s = scaleOf(f), i = Math.max(0, Math.min(a.frames - 1, fr))
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(cx), Math.round(feet)); if (dir < 0) c.scale(-1, 1)
  c.drawImage(src, i * a.width, 0, a.width, a.height, -a.originX * s, -a.originY * s, a.width * s, a.height * s); c.restore()
}
function drawFxStrip(c, f, name, fr, cx, cy, dir, alpha, k = 1) {
  const d = fxOf(f)[name]; if (!d) return
  const im = image(d.sheet); if (!ready(im)) return
  const s = scaleOf(f) * k, i = Math.max(0, Math.min(d.frames - 1, fr))
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(cx), Math.round(cy)); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, i * d.width, 0, d.width, d.height, -d.width * s / 2, -d.height * s / 2, d.width * s, d.height * s); c.restore()
}
const calm = () => typeof globalThis !== 'undefined' && !!(globalThis.juiceSettings?.reduceMotion)

// Body alpha (× the engine's body alpha): hidden while the Ultimate's burst / debris strips stand in for the body.
export function ninjaStormBodyAlpha(f) { return isNinjaStorm(f) && nsUltPhase(f) ? 0 : 1 }

// BEHIND the body: Vanish streak (the travel trail) + the Kawarimi swap streaks.
export function drawNinjaStormUnder(c, f) {
  if (!isNinjaStorm(f)) return
  warm()
  const b = f._ranger?.blink, w = f.w || 48, h = f.h || 94
  if (b) {
    const dir = b.dir || f.facing || 1
    if (b.phase === 'start') drawFxStrip(c, f, 'fxStreak', 4 - b.t, b.x0 + w / 2 - dir * 20, (b.y0 ?? f.y) + h * 0.55, dir, 0.6)
    else if (b.phase === 'travel' && b.x1 != null) {
      const u = (b.t - 3) / 5
      drawFxStrip(c, f, 'fxStreak', 0, f.x + w / 2 - dir * 30, f.y + h * 0.55, dir, 0.95)
      drawFxStrip(c, f, 'fxStreak', 2 + Math.floor(u * 2), b.x0 + w / 2, (b.y0 ?? f.y) + h * 0.55, dir, 0.5 * (1 - u))
    } else if (b.phase === 'recover' && b.x1 != null) drawFxStrip(c, f, 'fxStreak', 3, b.x1 + w / 2 - dir * 40, (b.y1 ?? f.y) + h * 0.55, dir, 0.4)
  }
  const L = f._academy?.lastSwap
  if (L) {
    const a = L.t / 12
    drawFxStrip(c, f, 'fxStreak', 1, L.from, L.fy - h * 0.45, Math.sign(L.to - L.from) || 1, 0.7 * a)
    drawFxStrip(c, f, 'fxSpeck', 5, L.to, L.ty - h * 0.5, 1, a)
  }
}

// The SHADOW CLONE: the owner's own frames, ~0.6 alpha, cool tint, a faint foot ring + life arc for readability.
function cloneView(f, k, clock) {
  const act = k.act
  if (act && act.key === 'ult') {
    const t = clock - act.t0
    if (t < NS_ULT.debrisAt - NS_ULT.rushTo) return { key: 'nUltBurst', fr: Math.min(6, Math.floor(t / 7)) }
    return { key: 'nUltDebris', fr: Math.min(4, Math.floor((t - (NS_ULT.debrisAt - NS_ULT.rushTo)) / 7)) }
  }
  if (act) { const el = clock - act.t0; if (el >= 0) return { key: act.key, fr: frameAt(act.key, animsOf(f), el) }; return { key: 'idle_alt', fr: 0 } }
  return { key: 'idle', fr: Math.floor(k.age / 10) % 4 }
}
function drawClone(c, f) {
  const s = f._academy, k = s?.clone; if (!k) return
  const p = getAcademyProfile(f), sp = p.stances[k.stance] || p.stances.red, v = cloneView(f, k, s.rt)
  const inA = Math.min(1, k.age / 8), out = k.life < 30 ? k.life / 30 : 1
  const cx = k.x + (k.w || 48) / 2, feet = k.y + (k.h || 94)
  if (k.age < 12) drawFxStrip(c, f, 'fxSpeck', Math.floor(k.age / 3), cx, feet - (k.h || 94) / 2, 1, 1 - k.age / 12, 1.4)   // the "poof"
  c.save(); c.strokeStyle = sp.tint; c.globalAlpha = 0.45 * inA * out; c.lineWidth = 2; c.setLineDash([4, 4])
  c.beginPath(); c.ellipse(cx, feet - 2, 24, 5, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([])
  c.globalAlpha = 0.7 * inA; c.beginPath(); c.arc(cx, feet - (k.h || 94) - 14, 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (k.life / p.clone.life)); c.stroke()
  c.restore()
  drawCell(c, f, v.key, v.fr, cx, feet, k.dir || 1, p.clone.alpha * inA * out, sp.tint)
}

// IN FRONT of the body: clone, Mode aura, lock-on, Ultimate burst / debris, sparks.
export function drawNinjaStormFx(c, f, opp) {
  if (!isNinjaStorm(f)) return
  const s = f._nsr, n = f._academy; if (!s) return
  const w = f.w || 48, h = f.h || 94, cx = f.x + w / 2, feet = f.y + h, dir = f.facing || 1
  drawClone(c, f)
  // MODE aura: Lightning = crimson/white crackle, Quake = amber dust ring (render-only, static under Reduce Motion)
  if (n?.mode > 0 && !nsUltPhase(f)) {
    const quake = n.modeStance === 'yellow', t = n.clock, pulse = calm() ? 0.5 : 0.5 + 0.3 * Math.sin(t * 0.3)
    c.save(); c.globalAlpha = 0.35 * pulse; c.strokeStyle = quake ? '#ffb43c' : '#ffffff'; c.lineWidth = 2
    c.beginPath(); c.ellipse(cx, feet - h * 0.5, w * 0.9, h * 0.62, 0, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = 0.5 * pulse; c.strokeStyle = quake ? '#c8781e' : '#ff3030'
    if (!calm()) for (let i = 0; i < 3; i++) {   // deterministic zig-zag from the sim clock (no RNG)
      const a0 = (t * 0.17 + i * 2.1) % (Math.PI * 2), r = h * 0.55
      c.beginPath(); c.moveTo(cx + Math.cos(a0) * r * 0.6, feet - h / 2 + Math.sin(a0) * r)
      c.lineTo(cx + Math.cos(a0 + 0.2) * r * 0.75, feet - h / 2 + Math.sin(a0 + 0.35) * r * 0.8); c.lineTo(cx + Math.cos(a0 + 0.1) * r * 0.9, feet - h / 2 + Math.sin(a0 + 0.6) * r); c.stroke()
    }
    c.restore()
  }
  // LOCK-ON: reticle on the locked spot, then the beam (Shane) / ground shockwave (Dustin) — sheet row R21
  const L = s.lock
  if (L && L.t > 0) {
    const quake = !!L.quake
    if (!L.shot) {
      drawFxStrip(c, f, 'fxStar', 0, L.x, quake ? L.floor - 20 : L.y, 1, 0.95, 2.2)
      c.save(); c.strokeStyle = quake ? '#ffb43c' : '#ff4040'; c.globalAlpha = 0.9; c.lineWidth = 2
      const r = 26 + 10 * Math.max(0, (L.at - (s.clock || 0)) / 12)
      c.beginPath(); c.arc(L.x, quake ? L.floor - 20 : L.y, r, 0, Math.PI * 2); c.stroke(); c.restore()
    } else {
      const k = L.t / 18
      if (quake) { for (let i = -2; i <= 2; i++) drawFxStrip(c, f, 'fxChunk', (i + 2) % 8, L.x + i * 26, L.floor - 18 - Math.abs(i) * 6 * k, 1, k, 0.8) }
      else { const bx0 = cx + dir * w * 0.6; const len = Math.abs(L.x - bx0), segs = Math.max(1, Math.ceil(len / 60))
        for (let i = 0; i < segs; i++) drawFxStrip(c, f, 'fxBeam', 1 + (i % 3), bx0 + dir * (i + 0.5) * (len / segs), f.y + h * 0.36 + (L.y - (f.y + h * 0.36)) * ((i + 0.5) / segs), dir, k)
        drawFxStrip(c, f, 'fxSpark', Math.floor((1 - k) * 6), L.x, L.y, 1, k, 1.6) }
    }
  }
  // ULTIMATE body stand-in (the burst / debris strips are the body here)
  const ph = nsUltPhase(f)
  if (ph) {
    const u = s.ult
    if (ph === 'burst') drawCell(c, f, 'nUltBurst', Math.min(6, Math.floor((u.t - NS_ULT.rushTo) / 7)), cx, feet, dir, 1)
    else drawCell(c, f, 'nUltDebris', Math.min(4, Math.floor((u.t - NS_ULT.debrisAt) / 7)), cx, feet, dir, 1)
  }
  for (const b of s.fx) {
    const k = b.t / 12
    if (b.k === 'poof') drawFxStrip(c, f, 'fxSpeck', (b.n + b.t) % 11, b.x, b.y, 1, Math.min(1, k), 1.5)
    else if (b.k === 'swapRing') {   // STANCE SWAP: a smoke ring in the NEW stance's colour, widening from the feet
      const u = 1 - b.t / 14, col = STANCE_LOOK[stance(f)].color
      c.save(); c.globalAlpha = 0.75 * (1 - u); c.strokeStyle = col; c.lineWidth = 3
      c.beginPath(); c.ellipse(b.x, b.y - 4, 20 + 46 * u, 6 + 10 * u, 0, 0, Math.PI * 2); c.stroke(); c.restore()
      drawFxStrip(c, f, 'fxSpeck', 4 + (b.n % 4), b.x - 26 * u, b.y - 20, 1, 1 - u, 1.3)
      drawFxStrip(c, f, 'fxSpeck', 6 + (b.n % 4), b.x + 26 * u, b.y - 20, -1, 1 - u, 1.3)
    }
    else if (b.k === 'block') drawFxStrip(c, f, 'fxSpark', 0, b.x, b.y, 1, Math.min(1, k), 1.2)
    else drawFxStrip(c, f, 'fxSpark', Math.min(7, Math.floor((1 - k) * 8)), b.x, b.y, 1, Math.min(1, k + 0.2), 1.5)
  }
}

// HUD (under his health bar): two VANISH pips (diamonds, refilling ones fill up), the STANCE tag (RED · SHANE /
// YELLOW · DUSTIN, ↓↓ hint, the 30 f swap-lockout sweep, a lit "DIAL" while ↓↓ is armed), clone life / Kawarimi
// cooldown, Mode timer. Focus itself is the engine's energy bar.
export function drawNinjaStormHud(ctx, f, { x, enY, pbw, flip }) {
  if (!isNinjaStorm(f)) return
  const r = rangerHudState(f) || { pips: [1, 1] }, st = academyHudState(f)
  const col = STANCE_LOOK[stance(f)].color
  const by = enY - 27, step = flip ? -14 : 14, px0 = flip ? x + pbw - 60 : x + 56
  ctx.save()
  for (let i = 0; i < r.pips.length; i++) {
    const cxp = px0 + i * step, cy = by + 6, rr = 6, v = r.pips[i]
    ctx.beginPath(); ctx.moveTo(cxp, cy - rr); ctx.lineTo(cxp + rr, cy); ctx.lineTo(cxp, cy + rr); ctx.lineTo(cxp - rr, cy); ctx.closePath()
    ctx.fillStyle = '#141820'; ctx.fill()
    if (v > 0) { ctx.save(); ctx.clip(); ctx.fillStyle = v >= 1 ? '#3ee0c8' : 'rgba(62,224,200,0.45)'; ctx.fillRect(cxp - rr, cy + rr - 2 * rr * v, 2 * rr, 2 * rr * v); ctx.restore() }
    ctx.strokeStyle = v >= 1 ? '#e8fff8' : '#506060'; ctx.lineWidth = 1; ctx.stroke()
  }
  ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#d8fff4'
  ctx.fillText('VANISH', px0 + step * 0.5, by + 22)
  if (st) {
    // stance tag: coloured plate, the lockout drains it, "DIAL" lights while ↓↓ is armed
    const tw = 74, ty = by - 14
    const tagX = flip ? x + pbw - tw : x
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(tagX, ty, tw, 11)
    ctx.fillStyle = col; ctx.fillRect(tagX, ty, tw * (1 - (st.stanceLock || 0)), 11)
    ctx.fillStyle = stance(f) === 'yellow' ? '#1a1400' : '#ffffff'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'
    ctx.fillText(st.stanceLabel + (st.armed ? ' · DIAL' : ''), tagX + tw / 2, ty + 8.5)
    const mx = flip ? px0 + 2 * step - 70 : px0 + 2 * step + 4, my = by + 1
    const bar = (yy, v, c1, label) => {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(mx - 1, yy - 1, 62, 7)
      ctx.fillStyle = c1; const ww = 60 * Math.max(0, Math.min(1, v)); ctx.fillRect(flip ? mx + 60 - ww : mx, yy, ww, 5)
      ctx.fillStyle = '#eef'; ctx.font = 'bold 7px Arial'; ctx.textAlign = flip ? 'right' : 'left'; ctx.fillText(label, flip ? mx - 3 : mx + 63, yy + 5)
    }
    bar(my, st.clone, '#9fd8ff', st.clone > 0 ? (st.kawaCd > 0 ? 'CLONE · SWAP CD' : 'CLONE · SWAP') : 'NO CLONE')
    bar(my + 9, st.mode > 0 ? st.mode : st.modeCharging ? 1 : 1 - st.modeCd, st.mode > 0 ? col : st.modeCd > 0 ? '#555' : '#c0c0c0',
      st.mode > 0 || st.modeCharging ? st.modeName.toUpperCase() : st.modeCd > 0 ? 'MODE CD' : st.locked ? 'LOCKED' : st.modeName.toUpperCase() + ' READY')
  }
  ctx.restore()
}

// Presentation cues → sound keys (game.js plays them right after the tick, then they are gone). Pure on the sim side:
// the queue is presentation-only (f._nsrCues is never read by the simulation).
export function takeNinjaStormCues(f) {
  const q = f?._nsrCues; if (!q) return []
  f._nsrCues = null
  const pre = stance(f) === 'yellow' ? 'msv2y_' : 'msv2r_'
  return q.map(c => pre + c)
}
