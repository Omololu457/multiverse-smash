// Starfire (starfire): RENDER-ONLY FX, HUD, audio cues and the opt-in EYE DEBUG view. Reads sim state (f._starfire,
// the live move, the ultimate view) and never writes it.
//
// Art sources (supplied sheet only): Energy Ball, Energy Exploding, the two Laser pieces (cap + body, two brightness
// variants), health-icon expressions, cut-in bust with eye / mouth overlays, precomputed skin-material strips.
// Code-drawn geometry: glows, rings, the levitation shadow, HUD pips / bars, the debug overlay.
//
// Bounded cost: s.fx ≤ 10 entries (sim-owned); images cached once per URL; no particle arrays, no per-frame canvases,
// no pixel reads. Reduced effects (juiceSettings.reduceFlashing / reduceMotion): steady glows, no beam shimmer, static
// material phase.
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { starfire, LEV, ORB, CELL } from './starfireData.js'
import { STARFIRE_FX, STARFIRE_ICONS, STARFIRE_CUTSCENE } from './starfireSprites.js'
import { STARFIRE_EYES } from './starfireEyes.js'
import { starfireUltView, starfireLiveLaser, eyeWorld } from './starfireState.js'
import { STARFIRE_FX_COLORS } from './starfireSkins.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const starfireFxCacheSize = () => cache.size
const tagOf = f => f?._recolorTag && STARFIRE_FX_COLORS[f._recolorTag] ? f._recolorTag : null
const colsOf = f => STARFIRE_FX_COLORS[tagOf(f)] || STARFIRE_FX_COLORS.default
const art = (f, rel) => image(tagOf(f) ? `./assets/starfire/skins/${tagOf(f)}/${rel}` : `./assets/starfire/${rel}`)
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const S = f => f.spriteScale || starfire.spriteScale
const ctrX = f => (f.x || 0) + (f.w ?? 60) / 2
const stripOf = action => { const sh = starfire.animationData[action]?.sheet; return sh ? sh.slice(sh.lastIndexOf('/') + 1, -4) : null }

// ── opt-in EYE DEBUG view: ?sfEyes=1, localStorage ms_starfire_eye_debug = '1', or setStarfireEyeDebug(true) ──
let eyeDebug = null
export function setStarfireEyeDebug(on) { eyeDebug = !!on }
function eyeDebugOn() {
  if (eyeDebug != null) return eyeDebug
  try { eyeDebug = /[?&]sfEyes=1\b/.test(location.search) || localStorage.getItem('ms_starfire_eye_debug') === '1' } catch (_) { eyeDebug = false }
  return eyeDebug
}

function blit(c, im, w, h, fr, x, y, dir, scale, alpha = 1) {
  if (!ready(im)) return
  const n = Math.max(1, Math.round(im.naturalWidth / w)), k = Math.max(0, Math.min(n - 1, fr))
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(y)); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, k * w, 0, w, h, -w * scale / 2, -h * scale / 2, w * scale, h * scale); c.restore()
}
const strip = (f, name) => art(f, `fx/${name}_strip.png`)
const EX = () => STARFIRE_FX.explosion
const explosion = (c, f, x, y, t, sc, from = 0) => blit(c, strip(f, 'explosion'), EX().w, EX().h, from + Math.floor(t / 3), x, y, 1, sc, t > 30 ? Math.max(0, (40 - t) / 10) : 1)
function glow(c, x, y, rx, ry, col, a) { c.save(); c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.restore() }
function ring(c, x, y, r, col, a, lw = 2) { c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); c.restore() }

// ── skin MATERIAL: precomputed overlay strip of the drawn action inside the body's own draw rect (see starfireSkins.js) ──
function drawMaterial(c, f) {
  const mat = colsOf(f).material, tag = tagOf(f)
  if (!mat || !tag || f._lastDrawX == null || !f._lastDrawW || (f.health <= 0 && f._lastSpriteAction === 'lose')) return
  const st = stripOf(f._lastSpriteAction); if (!st) return
  const fr = f._lastSpriteFrame ?? 0, t = f._starfire?.tick || 0
  const layer = (k, a) => {
    const im = image(`./assets/starfire/skins/${tag}/mat/p${k}/${st}.png`); if (!ready(im) || a <= 0.01) return
    const n = Math.max(1, Math.round(im.naturalWidth / CELL.w)), i = Math.min(n - 1, fr)
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = a
    if ((f.facing ?? 1) === -1) { c.translate(f._lastDrawX + f._lastDrawW, f._lastDrawY); c.scale(-1, 1) } else c.translate(f._lastDrawX, f._lastDrawY)
    c.drawImage(im, i * CELL.w, 0, CELL.w, CELL.h, 0, 0, f._lastDrawW, f._lastDrawH); c.restore()
  }
  if (mat.kind === 'iridescent') { layer(0, calm() ? mat.maxAlpha * 0.35 : mat.maxAlpha * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / mat.period))); return }
  if (calm()) { layer(0, 0.75); return }
  const P = 54, k = Math.floor(t / P) % 4, u = (t % P) / P, fade = Math.max(0, (u - 0.66) / 0.34)
  layer(k, 0.9 * (1 - fade)); layer((k + 1) % 4, 0.9 * fade)
}

// ── EYE BEAM from the supplied Laser pieces: body tiles along the segment, cap mirrored so its point leads ──
function beam(c, f, sg, t, sc, alpha = 1) {
  const dx = sg.x1 - sg.x0, dy = sg.y1 - sg.y0, L = Math.hypot(dx, dy); if (L < 1) return
  const L0 = STARFIRE_FX.laser, k = calm() ? 0 : (t >> 1) % 2
  const body = art(f, `fx/laser_body${k}.png`), cap = art(f, `fx/laser_cap${k}.png`)
  const bw = L0.body0.w * sc, bh = L0.body0.h * sc, cw = L0.cap0.w * sc
  c.save(); c.globalAlpha = alpha; c.imageSmoothingEnabled = false
  c.translate(sg.x0, sg.y0); c.rotate(Math.atan2(dy, dx))
  const [, md] = colsOf(f).fx
  c.globalAlpha = alpha * (calm() ? 0.25 : 0.22 + 0.08 * Math.sin(t / 2)); c.fillStyle = md; c.fillRect(0, -bh, L, bh * 2); c.globalAlpha = alpha
  if (ready(body)) { let x = 0; const end = Math.max(0, L - cw); while (x < end) { const w = Math.min(bw, end - x); c.drawImage(body, 0, 0, L0.body0.w * (w / bw), L0.body0.h, x, -bh / 2, w, bh); x += w } }
  if (ready(cap)) { c.save(); c.translate(L, 0); c.scale(-1, 1); c.drawImage(cap, 0, -bh / 2, cw, bh); c.restore() }
  c.restore()
}
function drawLiveLaser(c, f, s) {
  const a = f.currentAttack, m = a?.sf; if (!m) return
  const el = a.total - a.timer
  if (el >= a.activeStart - 4 && el < a.activeStart && !m.prism) {   // glare build-up at the validated eyes
    for (const e of eyeWorld(f, m.key, Math.max(0, (f._lastSpriteFrame ?? 0)))) glow(c, e.x, e.y, 6 + (el - a.activeStart + 4) * 2, 4 + (el - a.activeStart + 4), colsOf(f).fx[2], 0.7)
  }
  const g = starfireLiveLaser(f)
  if (!g) return
  const sc = S(f), segs = g.segs.map(sg => {
    if (!g.contact) return sg
    const d = g.contact.d, u = sg.len > 0 ? Math.min(1, d / sg.len) : 0
    return { ...sg, x1: sg.x0 + (sg.x1 - sg.x0) * u, y1: sg.y0 + (sg.y1 - sg.y0) * u }
  })
  for (const sg of segs) beam(c, f, sg, s.tick, sc)
  for (const e of g.eyes) glow(c, e.x, e.y, 7, 5, '#ffffff', 0.85)
}

// ── debug overlay: eye boxes, origins, beam direction, collision segment, animation / frame (opt-in) ──
function drawEyeDebug(c, f) {
  if (f._lastDrawX == null || !f._lastDrawW) return
  const act = f._lastSpriteAction, fr = f._lastSpriteFrame ?? 0, tab = STARFIRE_EYES[act]?.[fr]
  const sc = f._lastDrawW / CELL.w, dir = (f.facing ?? 1) === -1 ? -1 : 1
  const X = u => dir > 0 ? f._lastDrawX + u * sc : f._lastDrawX + (CELL.w - u) * sc, Y = v => f._lastDrawY + v * sc
  c.save(); c.lineWidth = 1; c.font = 'bold 11px monospace'; c.textBaseline = 'bottom'
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.strokeRect(f._lastDrawX, f._lastDrawY, f._lastDrawW, f._lastDrawH)
  if (tab) for (const k of tab.eyes) {
    const [u, v, w, h] = k.rect, x0 = Math.min(X(u), X(u + w)), x1 = Math.max(X(u), X(u + w))
    c.strokeStyle = k.side === 'back' ? '#29d8ff' : '#ff3ad0'; c.strokeRect(x0, Y(v), x1 - x0, h * sc)
    const ox = X(k.origin[0]), oy = Y(k.origin[1])
    c.fillStyle = tab.emit ? '#ffff00' : '#ff4040'; c.beginPath(); c.arc(ox, oy, 2.5, 0, Math.PI * 2); c.fill()
    const aim = f.currentAttack?.sf?.aim || [dir, 0]
    c.strokeStyle = '#ffff00'; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + aim[0] * 26, oy + aim[1] * 26); c.stroke()
  }
  const a = f.currentAttack
  const g = a?.sf ? starfireLiveLaser(f) : null
  if (g) {
    c.strokeStyle = '#00ff66'; c.lineWidth = 1.5
    for (const sg of g.segs) { c.beginPath(); c.moveTo(sg.x0, sg.y0); c.lineTo(sg.x1, sg.y1); c.stroke() }
    if (g.contact) { c.strokeStyle = '#ff2020'; c.strokeRect(g.contact.x - 4, g.contact.y - 4, 8, 8) }
  }
  c.fillStyle = '#ffffff'; c.strokeStyle = '#000000'; c.lineWidth = 3
  const label = `${act || '?'} #${fr} ${tab ? tab.state : 'no table'}${tab && !tab.emit ? ' (no beam)' : ''}`
  c.strokeText(label, f._lastDrawX, f._lastDrawY - 2); c.fillText(label, f._lastDrawX, f._lastDrawY - 2)
  c.restore()
}

// World layer (after the fighters).
export function drawStarfireFx(c, f) {
  if (f?.rosterKey !== 'starfire') return
  const s = f._starfire
  drawMaterial(c, f)
  if (s) {
    const sc = S(f), t = s.tick, [dk, md, lt] = colsOf(f).fx
    if (s.lev && f.health > 0) { const fl = (f.groundY ?? f.y + f.h), hgt = Math.max(0, fl - (f.y + f.h)); glow(c, ctrX(f), fl - 2, 30 + Math.min(20, hgt / 8), 6, dk, 0.4) }
    if (s.djT > 0 && f.health > 0) { const u = 1 - s.djT / 16; ring(c, ctrX(f), f.y + f.h - 4, 14 + 30 * u, md, 0.7 * (1 - u), 3) }
    for (const e of s.live) {
      if (e.kind === 'orb') { glow(c, e.x, e.y, ORB.r * 2.2, ORB.r * 2.2, md, calm() ? 0.3 : 0.24 + 0.1 * Math.sin(t / 4)); ring(c, e.x, e.y, ORB.r * 1.7 + (calm() ? 0 : 2 * Math.sin(t / 5)), lt, 0.7, 2) }
      else if (e.kind === 'burst') { glow(c, e.x, e.y, 44, 34, md, 0.45); ring(c, e.x, e.y, 30, '#ffffff', 0.8, 3) }
    }
    if (f.currentAttack?.sf) drawLiveLaser(c, f, s)
    for (const e of s.fx) {
      if (e.kind === 'explode') explosion(c, f, e.x, e.y, e.t, sc * 0.9)
      else if (e.kind === 'bigExplode') explosion(c, f, e.x, e.y, e.t, sc * 1.6)
      else if (e.kind === 'fizzle') explosion(c, f, e.x, e.y, e.t, sc * 0.5, 7)
      else if (e.kind === 'prism' && e.t < 16) { ring(c, e.x, e.y, 16 + e.t * 4, '#ffffff', 1 - e.t / 16, 3); ring(c, e.x, e.y, 10 + e.t * 3, lt, 1 - e.t / 16, 3) }
      else if (e.kind === 'laserHit' && e.t < 10) glow(c, e.x, e.y, 18 - e.t, 18 - e.t, lt, 0.8 * (1 - e.t / 10))
    }
  }
  const v = starfireUltView(f)
  if (v) {
    const sc = S(f), [, md, lt] = colsOf(f).fx, t = v.frame
    for (const b of v.bolts) { glow(c, b.x, b.y, 16, 16, md, 0.5); blit(c, strip(f, 'ball'), STARFIRE_FX.ball.w, STARFIRE_FX.ball.h, 0, b.x, b.y, f.facing ?? 1, sc * 1.1) }
    if (v.beams) for (const sg of v.beams.segs) beam(c, f, sg, t, sc * 1.25)
    for (const i of v.impacts) explosion(c, f, i.x, i.y, i.k * 2, sc * 0.8)
    if (v.explode) { glow(c, v.explode.x, v.explode.y, 60 + v.explode.k * 3, 60 + v.explode.k * 3, lt, calm() ? 0.25 : 0.35 * (1 - v.explode.k / 28)); explosion(c, f, v.explode.x, v.explode.y, v.explode.k, sc * 2.4) }
  }
  if (eyeDebugOn()) drawEyeDebug(c, f)
}

// ── Screen layer: Orbital Star pip, levitation budget, airtime allowances and the expression icon; cut-in ──
const ICON_ROW = f => {
  const s = f._starfire
  if (f.health <= 0) return 'down'
  if (f.hitstun > 0 || f.knockdownState) return 'daze'
  if (f.health < f.maxHealth * 0.3) return 'hurt'
  if (f.attacking && (f.currentAttack?.isSpecial || f.currentAttack?.isUltimate)) return 'strain'
  if (s?.lev) return 'focus'
  return 'calm'
}
function drawIcon(c, f, x, y, scale = 1.4) {
  const im = art(f, 'icons/expressions.png'); if (!ready(im)) return
  const I = STARFIRE_ICONS, t = f._starfire?.tick || 0, row = ICON_ROW(f), [r, n] = I.rows[row]
  const fr = row === 'calm' ? ((t % 200) > 188 ? Math.min(n - 1, 1 + ((t % 200) - 188 >> 2)) : 0) : Math.floor(t / 8) % n
  c.save(); c.imageSmoothingEnabled = false; c.drawImage(im, fr * I.w, r * I.h, I.w, I.h, x, y, I.w * scale, I.h * scale); c.restore()
}
export function starfireHudLabel(f) {
  const s = f?._starfire
  return { orb: s ? s.live.filter(e => e.kind === 'orb').length : 0, lev: s?.lev ? Math.max(0, LEV.maxFrames - s.lev.t) : null,
    comet: !s?.cometUsed, airLaser: !s?.laserUsed, sky: !s?.skyUsed }
}
function drawCutIn(c, cw, ch, f, v) {
  const u = v.cutIn, a = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1
  const bust = art(f, 'cutscene/bust.png'); if (!ready(bust)) return
  const B = STARFIRE_CUTSCENE, sc = Math.max(2, Math.floor(Math.min(cw, 1400) / 380)), bw = B.bust.w * sc, bh = B.bust.h * sc
  const bandH = bh + 24, y0 = Math.round(ch * 0.3), [hud0, hud1] = colsOf(f).hud
  const left = (f.facing ?? 1) >= 0, slide = calm() ? 0 : (1 - Math.min(1, u / 0.2)) * (left ? -1 : 1) * 120
  c.save(); c.globalAlpha = 0.82 * a; c.fillStyle = '#100608'; c.fillRect(0, y0, cw, bandH)
  c.globalAlpha = a; c.fillStyle = hud0; c.fillRect(0, y0, cw, 3); c.fillRect(0, y0 + bandH - 3, cw, 3)
  const bx = Math.round((left ? 40 : cw - 40 - bw) + slide), by = y0 + 12
  c.imageSmoothingEnabled = false; c.drawImage(bust, bx, by, bw, bh)
  const t = v.frame, ov = (n, o) => { const im = art(f, `cutscene/${n}.png`); if (ready(im)) c.drawImage(im, bx + o.x * sc, by + o.y * sc, o.w * sc, o.h * sc) }
  if (t >= 28) ov(t < 32 ? 'eye1' : 'eye0', B.overlays.eye0)                                           // supplied eye cells (portrait only, never gameplay)
  const mo = ['mouth0', 'mouth1', 'mouth2', 'mouth1'][Math.floor(t / 6) % 4]; if (t >= 6 && t < 26) ov(mo, B.overlays[mo])
  if (t >= 32) for (const e of [B.overlays.eye0]) glow(c, bx + (e.x + e.w * 0.5) * sc, by + (e.y + e.h * 0.5) * sc, e.w * sc * 0.6, e.h * sc * 0.4, colsOf(f).fx[2], 0.35)
  c.font = `bold ${Math.round(14 + sc * 3)}px Arial`; c.textBaseline = 'middle'; c.textAlign = left ? 'left' : 'right'
  c.fillStyle = hud1; c.fillText('SUPERNOVA', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.4)
  c.font = `bold ${Math.round(10 + sc * 2)}px Arial`; c.fillStyle = hud0
  c.fillText('EYES OF TAMARAN', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.68)
  c.restore()
}
export function drawStarfireHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => {
    if (f?.rosterKey !== 'starfire') return
    const x = (flip ? cw - pad - barW - 20 : pad) + 8, y0 = 74, L = starfireHudLabel(f), [hud0, hud1] = colsOf(f).hud
    const bx = flip ? x + 60 : x, w = barW - 60
    c.save()
    const px = flip ? bx + w - 10 : bx + 10, py = y0 + 5   // Orbital Star pip: filled = orb on stage (Prism Break ready)
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.beginPath(); c.arc(px, py, 7, 0, Math.PI * 2); c.fill()
    c.strokeStyle = hud0; c.lineWidth = 1.5; c.stroke()
    if (L.orb) { c.fillStyle = hud0; c.beginPath(); c.arc(px, py, 4.5, 0, Math.PI * 2); c.fill() }
    c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    const tx = flip ? bx + w - 24 : bx + 24, parts = []
    if (L.lev != null) parts.push(`LEVITATE ${Math.ceil(L.lev / 6) / 10}s`)
    if (!(f.onGround || f.grounded)) parts.push(['COMET', 'SIGHT', 'SKY'].filter((_, i) => [L.comet, L.airLaser, L.sky][i]).join(' ') || 'AIR SPENT')
    c.fillStyle = hud1; c.fillText(parts.join('  ') || (L.orb ? 'ORBITAL STAR' : 'STARBOLT'), tx, y0)
    if (L.lev != null) { const lw = 70, fill = lw * L.lev / LEV.maxFrames, lx = flip ? tx - lw : tx
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(lx, y0 + 12, lw, 4); c.fillStyle = hud0; c.fillRect(flip ? lx + lw - fill : lx, y0 + 12, fill, 4) }
    c.restore()
    drawIcon(c, f, flip ? x : x + barW - 54, y0 - 6, 1.4)
  }
  one(p1, false); one(p2, true)
  for (const f of [p1, p2]) { const v = f?.rosterKey === 'starfire' ? starfireUltView(f) : null; if (v && v.cutIn != null) drawCutIn(c, cw, ch, f, v) }
}

// Cue playback (presentation only). Attack cues are muted after defeat.
const AFTER_DEFEAT_MUTE = /^(bolt|charge|orb|rush|sky|laser|prism|lev|reject|doubleJump|ult)/
export function playStarfireCues(f) {
  const q = f?._starfire?.cues; if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('starfire_' + v) } catch (_) {} }
  q.length = 0
}
