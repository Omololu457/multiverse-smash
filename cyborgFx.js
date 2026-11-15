// Cyborg (cyborg) — RENDER-ONLY FX, HUD and audio cues. Reads sim state (f._cyborg, the ultimate view), never writes
// it. Supplied art only for sprites (explosion / sonic / missile strips, health-icon expressions, cut-in bust + eye /
// mouth overlays, precomputed skin-material strips); the Heat bar, vent steam, resonance ring, cannon beam and the
// Mega shock ring are small code-drawn geometry. Bounded: s.fx ≤ 8 entries (sim-owned), images cached once per URL,
// no particle arrays, no per-frame canvases, no per-frame pixel reads. Reduced effects: juiceSettings.reduceFlashing /
// reduceMotion → static material phase, steady overheat tell, no beam shimmer; particles 'low' → one steam puff.
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { cyborg, HEAT } from './cyborgData.js'
import { CYBORG_FX, CYBORG_ICONS, CYBORG_CUTSCENE } from './cyborgSprites.js'
import { cyborgUltView } from './cyborgState.js'
import { CYBORG_FX_COLORS } from './cyborgSkins.js'

const FW = 184, FH = 168
const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const cyborgFxCacheSize = () => cache.size
const tagOf = f => f?._recolorTag && CYBORG_FX_COLORS[f._recolorTag] ? f._recolorTag : null
const colsOf = f => CYBORG_FX_COLORS[tagOf(f)] || CYBORG_FX_COLORS.default
const art = (f, rel) => image(tagOf(f) ? `./assets/cyborg/skins/${tagOf(f)}/${rel}` : `./assets/cyborg/${rel}`)
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const lowFx = () => juiceSettings.particles === 'low'
const S = f => f.spriteScale || cyborg.spriteScale
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const tid = t => t?.side || t?.playerNumber || 0
// strip name for a resolved sprite action (aliases such as cSonic → cShot share a strip)
const stripOf = action => { const sh = cyborg.animationData[action]?.sheet; return sh ? sh.slice(sh.lastIndexOf('/') + 1, -4) : null }

// draw frame `fr` of an fx strip (w × h cells) centred at (x, y), flipped for dir < 0
function blit(c, im, w, h, fr, x, y, dir, scale, alpha = 1) {
  if (!ready(im)) return
  const n = Math.max(1, Math.round(im.naturalWidth / w)), k = Math.max(0, Math.min(n - 1, fr))
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(y)); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, k * w, 0, w, h, -w * scale / 2, -h * scale / 2, w * scale, h * scale); c.restore()
}
const explosion = (c, f, x, y, t) => blit(c, art(f, 'fx/explosion_strip.png'), CYBORG_FX.explosion.w, CYBORG_FX.explosion.h, Math.floor(t / 2.6), x, y, 1, S(f), t > 24 ? (30 - t) / 6 : 1)
function shockRing(c, x, y, k, len = 24) {   // neutral (white / pale steel) ground ring: the Mega impact stays neutral
  const u = k / len, r = 24 + 120 * u
  c.save(); c.globalAlpha = 0.7 * (1 - u); c.strokeStyle = '#f4f7fb'; c.lineWidth = Math.max(1, 5 * (1 - u))
  c.beginPath(); c.ellipse(x, y - 2, r, r * 0.18, 0, 0, Math.PI * 2); c.stroke()
  c.globalAlpha = 0.35 * (1 - u); c.strokeStyle = '#9fb3c8'; c.beginPath(); c.ellipse(x, y - 2, r * 0.65, r * 0.12, 0, 0, Math.PI * 2); c.stroke(); c.restore()
}

// ── skin MATERIAL: precomputed overlay strip of the drawn action, inside the body's own draw rect (armour-only by
// construction — the build writes material pixels only where the armour / panel mask is). Slow crossfade between
// the 4 precomputed phases (stars / glitter) or a slow alpha breathe (iridescent); static under reduced effects.
function drawMaterial(c, f) {
  const mat = colsOf(f).material, tag = tagOf(f)
  if (!mat || !tag || f._lastDrawX == null || !f._lastDrawW || f.health <= 0 && f._lastSpriteAction === 'lose') return
  const strip = stripOf(f._lastSpriteAction); if (!strip) return
  const fr = f._lastSpriteFrame ?? 0, t = f._cyborg?.tick || 0
  const layer = (k, a) => {
    const im = image(`./assets/cyborg/skins/${tag}/mat/p${k}/${strip}.png`); if (!ready(im) || a <= 0.01) return
    const n = Math.max(1, Math.round(im.naturalWidth / FW)), i = Math.min(n - 1, fr)
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = a
    if ((f.facing ?? 1) === -1) { c.translate(f._lastDrawX + f._lastDrawW, f._lastDrawY); c.scale(-1, 1) } else c.translate(f._lastDrawX, f._lastDrawY)
    c.drawImage(im, i * FW, 0, FW, FH, 0, 0, f._lastDrawW, f._lastDrawH); c.restore()
  }
  if (mat.kind === 'iridescent') { layer(0, calm() ? mat.maxAlpha * 0.35 : mat.maxAlpha * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / mat.period))); return }
  if (calm()) { layer(0, 0.75); return }
  const P = 48, k = Math.floor(t / P) % 4, u = (t % P) / P   // ~0.8 s per phase, crossfade in the last third
  const fade = Math.max(0, (u - 0.66) / 0.34)
  layer(k, 0.9 * (1 - fade)); layer((k + 1) % 4, 0.9 * fade)
}

function drawVent(c, f, s) {
  const m = f.attacking ? f.currentAttack?.cy : null
  const on = m?.key === 'cVent' && m.phase === 'on', hot = !!s.ovh
  if (!on && !hot) return
  const t = s.tick, n = lowFx() ? 1 : on ? 4 : 2, top = f.y + (f.h || 94) * 0.18
  c.save()
  for (let i = 0; i < n; i++) {
    const ph = ((t + i * 11) % 36) / 36, side = i % 2 ? 1 : -1
    const x = ctrX(f) + side * (14 + 6 * ph), y = top - 30 * ph, r = 4 + 9 * ph
    c.globalAlpha = (on ? 0.5 : 0.3) * (1 - ph); c.fillStyle = hot && !on ? '#c9b0a8' : '#e8eef4'
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill()
  }
  c.restore()
}
function drawMarks(c, f, opp) {
  const s = f._cyborg, life = opp && s?.marks?.[tid(opp)]; if (!life || !(opp.health > 0)) return
  const [, fx1, fx2] = colsOf(f).fx, x = ctrX(opp), y = opp.y - 14, k = s.tick
  c.save(); c.lineWidth = 2; c.globalAlpha = life < 20 ? life / 20 : 1
  for (let i = 0; i < 2; i++) {
    const r = 7 + i * 5 + (calm() ? 0 : ((k + i * 6) % 24) / 6)
    c.strokeStyle = i ? fx1 : fx2; c.beginPath(); c.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9); c.stroke()
  }
  c.restore()
}
function drawBeam(c, f, b) {
  const [fx0, fx1, fx2] = colsOf(f).fx, w = 18 + (calm() ? 0 : 4 * Math.sin(b.k * 0.9)), a = b.k > 14 ? (18 - b.k) / 4 : 1
  const x0 = Math.min(b.x0, b.x1), len = Math.abs(b.x1 - b.x0)
  c.save(); c.globalAlpha = 0.55 * a; c.fillStyle = fx0; c.fillRect(x0, b.y - w / 2, len, w)
  c.globalAlpha = 0.85 * a; c.fillStyle = fx1; c.fillRect(x0, b.y - w / 4, len, w / 2)
  c.globalAlpha = a; c.fillStyle = fx2; c.fillRect(x0, b.y - 2, len, 4); c.restore()
}

// World layer (after the fighters). `opp` is optional (resonance ring over the marked opponent).
export function drawCyborgFx(c, f, opp = null) {
  if (f?.rosterKey !== 'cyborg') return
  const s = f._cyborg
  drawMaterial(c, f)
  if (!s) return
  const sc = S(f)
  for (const e of s.fx) {
    if (e.kind === 'ex') explosion(c, f, e.x, e.y, e.t)
    else if (e.kind === 'shock') shockRing(c, e.x, e.y, e.t)
    else if (e.kind === 'sonicBurst' && e.t < 12) blit(c, art(f, 'fx/sonic_strip.png'), CYBORG_FX.sonic.w, CYBORG_FX.sonic.h, Math.floor(e.t / 4) % 2, e.x, e.y, e.x >= ctrX(f) ? 1 : -1, sc, 1 - e.t / 12)
  }
  if (f.health > 0) { drawVent(c, f, s); drawMarks(c, f, opp) }
  const v = cyborgUltView(f)
  if (v) {
    if (v.beam) drawBeam(c, f, v.beam)
    for (const m of v.missiles) blit(c, art(f, 'fx/missile_strip.png'), CYBORG_FX.missile.w, CYBORG_FX.missile.h, 0, m.x, m.y, m.dir, sc)
    for (const b of v.blasts) explosion(c, f, b.x, b.y, b.k)
    if (v.shock) shockRing(c, v.shock.x, v.shock.y, v.shock.k)
  }
}

// ── Screen layer: Heat bar + expression icon under each Cyborg's health bar; ultimate cut-in ──
const ICON_ROW = f => {
  const s = f._cyborg
  if (f.health <= 0) return 'down'
  if (f.hitstun > 0 || f.knockdownState) return 'daze'
  if (s?.ovh || (s?.heat || 0) >= HEAT.warn) return 'strain'
  if (f.attacking) return 'grin'
  return 'calm'
}
function drawIcon(c, f, x, y, scale = 1.5) {
  const im = art(f, 'icons/expressions.png'); if (!ready(im)) return
  const I = CYBORG_ICONS, t = f._cyborg?.tick || 0
  let row = ICON_ROW(f), [r, n] = I.rows[row], fr = Math.floor(t / 8) % n
  if (row === 'calm') { const blink = (t % 180) > 170; if (blink) { [r, n] = I.rows.calm2; fr = 1 % n } else fr = 0 }
  c.save(); c.imageSmoothingEnabled = false
  c.drawImage(im, fr * I.w, r * I.h, I.w, I.h, x, y, I.w * scale, I.h * scale); c.restore()
}
export function cyborgHeatLabel(f) {
  const s = f?._cyborg, h = Math.round((s?.heat || 0) / HEAT.Q)
  const state = s?.ovh ? 'OVERHEAT' : f?.currentAttack?.cy?.key === 'cVent' ? 'VENT' : h >= 60 ? 'WARN' : ''
  return { heat: h, state }
}
function drawCutIn(c, cw, ch, f, v) {
  const u = v.cutIn, a = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1
  const bust = art(f, 'cutscene/bust.png'); if (!ready(bust)) return
  const B = CYBORG_CUTSCENE, sc = Math.max(2, Math.floor(Math.min(cw, 1400) / 380)), bw = B.bust.w * sc, bh = B.bust.h * sc
  const bandH = bh + 24, y0 = Math.round(ch * 0.32), [hud0, hud1] = colsOf(f).hud
  const left = (f.facing ?? 1) >= 0, slide = (1 - Math.min(1, u / 0.2)) * (left ? -1 : 1) * 120
  c.save(); c.globalAlpha = 0.8 * a; c.fillStyle = '#0a0d14'; c.fillRect(0, y0, cw, bandH)
  c.globalAlpha = a; c.fillStyle = hud0; c.fillRect(0, y0, cw, 3); c.fillRect(0, y0 + bandH - 3, cw, 3)
  const bx = Math.round((left ? 40 : cw - 40 - bw) + slide), by = y0 + 12
  c.imageSmoothingEnabled = false
  c.drawImage(bust, bx, by, bw, bh)
  const t = v.frame, ov = (n, o) => { const im = art(f, `cutscene/${n}.png`); if (ready(im)) c.drawImage(im, bx + o.x * sc, by + o.y * sc, o.w * sc, o.h * sc) }
  ov(t % 24 < 3 ? 'eye1' : 'eye0', B.overlays.eye0)                                     // the supplied blink cell
  const mo = ['mouth0', 'mouth1', 'mouth2', 'mouth1'][Math.floor(t / 5) % 4]; ov(mo, B.overlays[mo])   // supplied mouth cells (no text)
  c.font = `bold ${Math.round(14 + sc * 3)}px Arial`; c.textBaseline = 'middle'; c.textAlign = left ? 'left' : 'right'
  c.fillStyle = hud1; c.fillText('BOOYAH PROTOCOL', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.4)
  c.font = `bold ${Math.round(10 + sc * 2)}px Arial`; c.fillStyle = hud0
  c.fillText('FULL SYSTEMS IMPACT', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.68)
  c.restore()
}
export function drawCyborgHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => {
    if (f?.rosterKey !== 'cyborg') return
    const x = (flip ? cw - pad - barW - 20 : pad) + 8, y0 = 74, h = 7, w = barW - 60
    const { heat, state } = cyborgHeatLabel(f), ovh = state === 'OVERHEAT'
    const bx = flip ? x + 60 : x
    const col = ovh ? (calm() || (f._cyborg?.tick || 0) % 30 < 20 ? '#ff3b30' : '#b8231c') : heat >= 60 ? '#ffae1a' : colsOf(f).hud[0]
    c.save()
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(bx, y0, w, h)
    c.fillStyle = col; const fill = Math.max(0, Math.min(1, heat / 100)) * w
    c.fillRect(flip ? bx + w - fill : bx, y0, fill, h)
    c.fillStyle = 'rgba(255,255,255,0.5)'; const tx = flip ? bx + w - w * 0.6 : bx + w * 0.6; c.fillRect(Math.round(tx), y0 - 1, 1, h + 2)   // the 60 line
    c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1; c.strokeRect(bx + 0.5, y0 + 0.5, w - 1, h - 1)
    // text as well as colour: "HEAT 72  WARN" (left bar) / "WARN  HEAT 72" (right bar)
    c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = 'left'
    const main = `HEAT ${heat}`, mw = c.measureText(main).width, sw = state ? c.measureText(state).width + 6 : 0
    const x0 = flip ? bx + w - mw - sw : bx
    c.fillStyle = '#e8edf4'; c.fillText(main, flip ? x0 + sw : x0, y0 + h + 3)
    if (state) { c.fillStyle = col; c.fillText(state, flip ? x0 : x0 + mw + 6, y0 + h + 3) }
    c.restore()
    drawIcon(c, f, flip ? x : x + barW - 54, y0 - 6, 1.4)
  }
  one(p1, false); one(p2, true)
  for (const f of [p1, p2]) { const v = f?.rosterKey === 'cyborg' ? cyborgUltView(f) : null; if (v && v.cutIn != null) drawCutIn(c, cw, ch, f, v) }
}

// Cue playback (presentation only). Weapon / heat cues are muted after defeat.
const AFTER_DEFEAT_MUTE = /^(shot|pulse|missile|rack|vent|ventOpen|ventClose|overheat|weaponsOnline|reject|locked|thruster|cannonBranch|transform|retract|ult)/
export function playCyborgCues(f) {
  const q = f?._cyborg?.cues; if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('cyborg_' + v) } catch (_) {} }
  q.length = 0
}
