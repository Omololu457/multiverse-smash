// Robin (robin) — RENDER-ONLY FX, HUD, intro card and audio cues. Reads sim state (f._robin, the ultimate view), never
// writes it. Supplied art only for sprites (bomb, the complete Bomb Explosion, the smoke derived from its late cells,
// health-icon expressions, the cutscene bust + mask / mouth pieces, the fighter's own current frame for Smoke Step
// echoes); arming rings, the OUTPLAY tag and the intro banner are small code-drawn geometry / text.
// Bounded: images cached once per URL, no per-frame canvases, pixel reads or image decoding; every list is capped in
// the sim. No Math.random (decorative variation = sim tick). Reduced effects (juiceSettings.reduceFlashing /
// reduceMotion) → static material phase, no blinking, no echoes.
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { robin, SMOKE, PLANT, BLAST } from './robinData.js'
import { ROBIN_ICONS, ROBIN_CUTSCENE, ROBIN_FX, ROBIN_CELL } from './robinSprites.js'
import { robinUltView, inOwnSmoke } from './robinState.js'
import { ROBIN_FX_COLORS } from './robinSkins.js'

const FW = ROBIN_CELL.w, FH = ROBIN_CELL.h, SC = 2.2
const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const robinFxCacheSize = () => cache.size
const tagOf = f => f?._recolorTag && ROBIN_FX_COLORS[f._recolorTag] ? f._recolorTag : null
const colsOf = f => ROBIN_FX_COLORS[tagOf(f)] || ROBIN_FX_COLORS.default
const art = (f, rel) => image(tagOf(f) ? `./assets/robin/skins/${tagOf(f)}/${rel}` : `./assets/robin/${rel}`)
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const sheetOf = (f, action) => {
  const d = (f._skinAnim && f._skinAnim[action]) || robin.animationData[action]
  return d?.sheet || null
}

// ── skin MATERIAL (Starfield Detective stars / Gilded Night glitter): precomputed overlay strip of the drawn action,
// drawn inside the body's own draw rect (cloth / trim pixels only by construction). Slow crossfade between 4 phases.
const warmed = new Set()
const stripName = sh => sh ? sh.slice(sh.lastIndexOf('/') + 1, -4) : null
function drawMaterial(c, f) {
  const mat = colsOf(f).material, tag = tagOf(f)
  if (!mat || !tag || f._lastDrawX == null || !f._lastDrawW || (f.health <= 0 && f._lastSpriteAction === 'lose')) return
  if (!warmed.has(tag)) { warmed.add(tag); for (const d of Object.values(robin.animationData)) for (let k = 0; k < 4; k++) image(`./assets/robin/skins/${tag}/mat/p${k}/${stripName(d.sheet)}.png`) }
  const strip = stripName(robin.animationData[f._lastSpriteAction]?.sheet); if (!strip) return
  const fr = f._lastSpriteFrame ?? 0, t = f._robin?.tick || 0
  const layer = (k, al) => {
    const im = image(`./assets/robin/skins/${tag}/mat/p${k}/${strip}.png`); if (!ready(im) || al <= 0.01) return
    const n = Math.max(1, Math.round(im.naturalWidth / FW)), i = Math.min(n - 1, fr)
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = al
    if ((f.facing ?? 1) === -1) { c.translate(f._lastDrawX + f._lastDrawW, f._lastDrawY); c.scale(-1, 1) } else c.translate(f._lastDrawX, f._lastDrawY)
    c.drawImage(im, i * FW, 0, FW, FH, 0, 0, f._lastDrawW, f._lastDrawH); c.restore()
  }
  if (calm()) { layer(0, 0.75); return }
  const P = 64, k = Math.floor(t / P) % 4, u = (t % P) / P, fade = Math.max(0, (u - 0.6) / 0.4)
  layer(k, 0.9 * (1 - fade)); layer((k + 1) % 4, 0.9 * fade)
}

function drawCell(c, im, i, cw, ch, x, yBottom, scale, alpha = 1, flip = 1) {
  if (!ready(im)) return
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha
  c.translate(x, yBottom); c.scale(flip, 1)
  c.drawImage(im, i * cw, 0, cw, ch, -cw * scale / 2, -ch * scale, cw * scale, ch * scale); c.restore()
}

// Smoke field: three overlapping puffs of the muted smoke strip spanning the field; translucent so silhouettes stay
// readable; mirror Robin vs Robin → lighter. Fades in / out at the field's ends.
function drawSmoke(c, f, s, mirror) {
  const z = s.smoke; if (!z) return
  const im = art(f, 'fx/smoke_strip.png'), S = ROBIN_FX.smoke, life = z.life
  const fade = Math.min(1, (SMOKE.life - life + 1) / 6, life / 12)
  const base = (mirror ? 0.42 : 0.6) * fade, t = s.tick || 0
  const offs = [-SMOKE.halfW * 0.55, 0, SMOKE.halfW * 0.55]
  offs.forEach((dx, i) => {
    const fr = calm() ? 1 + i : Math.floor((t / 9 + i * 2)) % S.frames
    const sc = Math.min(3.2, 2.4 + 0.25 * i)
    drawCell(c, im, fr, S.w, S.h, z.x + dx, z.y + 2, sc, base, i === 1 ? -1 : 1)
  })
  if (!z.stepUsed && inOwnSmoke(f)) {   // STEP READY marker while Robin stands in his own field
    c.save(); c.globalAlpha = 0.85; c.strokeStyle = colsOf(f).hud[1]; c.lineWidth = 2
    c.beginPath(); c.ellipse(ctrX(f), f.y + f.h - 2, 26, 6, 0, 0, Math.PI * 2); c.stroke(); c.restore()
  }
}
function drawPlant(c, f, s) {
  const z = s.plant; if (!z) return
  const im = art(f, 'fx/bomb_strip.png'), B = ROBIN_FX.bomb, [hud0, hud1] = colsOf(f).hud, t = s.tick || 0
  drawCell(c, im, 0, B.w, B.h, z.x, z.y, SC, 1, z.dir || 1)
  c.save(); c.lineWidth = 2
  if (!z.armed) {   // arming: a filling arc (owner colour) — readable from either side
    c.strokeStyle = hud0; c.globalAlpha = 0.9
    c.beginPath(); c.arc(z.x, z.y - 26, 7, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * Math.min(1, z.age / PLANT.arm)); c.stroke()
  } else {
    const blink = calm() ? 1 : (z.warn > 0 ? (t % 4 < 2) : (t % 40 < 30)) ? 1 : 0.35
    c.fillStyle = z.warn > 0 ? '#ff4030' : hud1; c.globalAlpha = blink
    c.beginPath(); c.arc(z.x, z.y - 26, z.warn > 0 ? 5 : 4, 0, Math.PI * 2); c.fill()
    c.globalAlpha = 0.85; c.strokeStyle = hud0; c.beginPath(); c.arc(z.x, z.y - 26, 7, 0, Math.PI * 2); c.stroke()
    // fixed lifetime bar
    c.globalAlpha = 0.7; c.fillStyle = hud0; c.fillRect(z.x - 12, z.y - 38, 24 * Math.max(0, z.life / PLANT.life), 2)
  }
  c.restore()
}
function drawEvents(c, f, s) {
  const [hud0, hud1] = colsOf(f).hud
  for (const e of s.fx) {
    if (e.kind === 'blast') {
      const im = art(f, 'fx/explosion_strip.png'), X = ROBIN_FX.explosion, fr = Math.min(X.frames - 1, Math.floor(e.t / 3))
      drawCell(c, im, fr, X.w, X.h, e.x, e.y + 4, e.why === 'ult' ? 3.6 : 2.6, 1)
    } else if (e.kind === 'smokePuff') {
      const im = art(f, 'fx/smoke_strip.png'), S = ROBIN_FX.smoke
      drawCell(c, im, Math.min(S.frames - 1, Math.floor(e.t / 6)), S.w, S.h, e.x, e.y + 2, 3, Math.max(0, 0.8 - e.t / 40))
    } else if (e.kind === 'fizzle') {
      c.save(); c.globalAlpha = Math.max(0, 1 - e.t / 24); c.strokeStyle = '#c8d0dc'; c.lineWidth = 2
      for (let i = 0; i < 4; i++) { const ang = -Math.PI / 2 + (i - 1.5) * 0.5, r = 6 + e.t; c.beginPath(); c.moveTo(e.x + Math.cos(ang) * 4, e.y - 6 + Math.sin(ang) * 4); c.lineTo(e.x + Math.cos(ang) * r, e.y - 6 + Math.sin(ang) * r); c.stroke() }
      c.restore()
    } else if (e.kind === 'bat') {
      c.save(); c.globalAlpha = Math.max(0, 1 - e.t / 14); c.strokeStyle = hud1; c.lineWidth = 3
      c.beginPath(); c.arc(e.x, e.y, 6 + e.t * 1.5, 0, Math.PI * 2); c.stroke(); c.restore()
    } else if (e.kind === 'outplay') {
      c.save(); c.globalAlpha = Math.max(0, 1 - e.t / 30); c.font = 'bold 15px Arial'; c.textAlign = 'center'
      c.fillStyle = '#0c0c14'; c.fillText('OUTPLAY', e.x + 1, e.y - e.t * 0.6 + 1); c.fillStyle = hud1; c.fillText('OUTPLAY', e.x, e.y - e.t * 0.6); c.restore()
    } else if (e.kind === 'ultBomb') {
      const im = art(f, 'fx/bomb_strip.png'), B = ROBIN_FX.bomb
      drawCell(c, im, 0, B.w, B.h, e.x, e.y, SC, 1)
      if (calm() || e.t % 6 < 3) { c.save(); c.fillStyle = '#ff4030'; c.beginPath(); c.arc(e.x, e.y - 22, 4, 0, Math.PI * 2); c.fill(); c.restore() }
    }
  }
}
// Smoke Step echoes: fading copies of Robin's ACTUAL current frame at his recent positions (cosmetic only).
function drawGhosts(c, f, s) {
  if (calm() || !s.ghosts.length || f._lastDrawX == null) return
  const sh = sheetOf(f, f._lastSpriteAction); if (!sh) return
  const im = image(sh); if (!ready(im)) return
  const fr = f._lastSpriteFrame ?? 0, hud = colsOf(f).echo
  for (const gh of s.ghosts) {
    const dx = gh.x - f.x, al = 0.38 * (1 - gh.t / 15); if (al <= 0) continue
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = al
    if ((f.facing ?? 1) === -1) { c.translate(f._lastDrawX + dx + f._lastDrawW, f._lastDrawY); c.scale(-1, 1) } else c.translate(f._lastDrawX + dx, f._lastDrawY)
    c.drawImage(im, fr * FW, 0, FW, FH, 0, 0, f._lastDrawW, f._lastDrawH)
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = al * 0.6; c.fillStyle = hud; c.fillRect(0, 0, f._lastDrawW, f._lastDrawH)
    c.restore()
  }
}

// World layer (after the fighters). `opp` lets the smoke lighten for Robin mirrors.
export function drawRobinFx(c, f, opp = null) {
  if (f?.rosterKey !== 'robin') return
  drawMaterial(c, f)
  const s = f._robin; if (!s) return
  drawGhosts(c, f, s)
  drawSmoke(c, f, s, opp?.rosterKey === 'robin')
  drawPlant(c, f, s)
  drawEvents(c, f, s)
}

// ── Screen layer ──
const ICON_ROW = f => {
  if (f.health <= 0) return 'down'
  if (f.hitstun > 0 || f.knockdownState) return 'daze'
  if (f.attacking && f.currentAttack?.rb?.key?.startsWith('r')) return 'shout'
  if (f.attacking) return 'grit'
  return 'calm'
}
function drawIcon(c, f, x, y, scale = 1.5) {
  const im = art(f, 'icons/expressions.png'); if (!ready(im)) return
  const I = ROBIN_ICONS, t = f._robin?.tick || 0
  let row = ICON_ROW(f), [r, n] = I.rows[row], fr = calm() ? 0 : Math.floor(t / 8) % n
  if (row === 'calm') fr = (t % 220) > 196 ? Math.min(n - 1, Math.floor((t % 220 - 196) / 3)) : 0   // calm row = look / blink cycle
  c.save(); c.imageSmoothingEnabled = false
  c.drawImage(im, fr * I.w, r * I.h, I.w, I.h, x, y, I.w * scale, I.h * scale); c.restore()
}
export function robinHudLabel(f) {
  const s = f?._robin
  return { smoke: s?.smoke ? Math.ceil(s.smoke.life / 6) / 10 : 0, step: !!(s?.smoke && !s.smoke.stepUsed),
    bomb: !s?.plant ? 'none' : s.plant.warn > 0 ? 'detonating' : s.plant.armed ? 'armed' : 'arming',
    airBomb: !!s?.airBomb, airRoof: !!s?.airRoof, l2: s?.l2?.phase || null }
}
function drawCutIn(c, cw, ch, f, v) {
  const u = v.cutIn, al = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1
  const bust = art(f, 'cutscene/bust.png'); if (!ready(bust)) return
  const B = ROBIN_CUTSCENE, sc = Math.max(2, Math.floor(Math.min(cw, 1400) / 300)), bw = B.bust.w * sc, bh = B.bust.h * sc
  const bandH = bh + 24, y0 = Math.round(ch * 0.28), [hud0, hud1] = colsOf(f).hud
  const left = (f.facing ?? 1) >= 0, slide = (1 - Math.min(1, u / 0.2)) * (left ? -1 : 1) * 120
  c.save(); c.globalAlpha = 0.82 * al; c.fillStyle = '#100c08'; c.fillRect(0, y0, cw, bandH)
  c.globalAlpha = al; c.fillStyle = hud0; c.fillRect(0, y0, cw, 3); c.fillRect(0, y0 + bandH - 3, cw, 3)
  const bx = Math.round((left ? 40 : cw - 40 - bw) + slide), by = y0 + 12
  c.imageSmoothingEnabled = false; c.drawImage(bust, bx, by, bw, bh)
  // supplied expression pieces (mask squint + mouth cells) — expression only; no recorded dialogue exists, none implied
  const mk = ['mask0', 'mask1'][Math.floor(v.frame / 10) % 2], mo = ['mouth0', 'mouth1', 'mouth2', 'mouth1'][Math.floor(v.frame / 6) % 4]
  for (const k of [mk, mo]) { const o = B.overlays[k], im = art(f, `cutscene/${k}.png`); if (o && ready(im)) c.drawImage(im, bx + o.x * sc, by + o.y * sc, o.w * sc, o.h * sc) }
  c.font = `bold ${Math.round(14 + sc * 3)}px Arial`; c.textBaseline = 'middle'; c.textAlign = left ? 'left' : 'right'
  c.fillStyle = hud1; c.fillText('CHECKMATE', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.4)
  c.font = `bold ${Math.round(10 + sc * 2)}px Arial`; c.fillStyle = hud0
  c.fillText('LIGHTS OUT', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.68)
  c.restore()
}
export function drawRobinHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => {
    if (f?.rosterKey !== 'robin') return
    const L = robinHudLabel(f), [hud0, hud1] = colsOf(f).hud
    const x = (flip ? cw - pad - barW - 20 : pad) + 8, y0 = 74
    const ix = flip ? x + barW - 54 : x
    drawIcon(c, f, ix, y0 - 6, 1.4)
    c.save(); c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    const tx = flip ? ix - 6 : ix + 46
    c.fillStyle = L.smoke ? hud1 : 'rgba(255,255,255,0.45)'
    c.fillText(L.smoke ? `SMOKE ${L.smoke.toFixed(1)}s${L.step ? ' · STEP READY' : ''}` : 'SMOKE —', tx, y0 + 1)
    c.fillStyle = L.bomb === 'armed' ? hud1 : L.bomb === 'none' ? 'rgba(255,255,255,0.45)' : hud0
    c.fillText(`DEAD DROP ${L.bomb === 'none' ? '—' : L.bomb.toUpperCase()}${L.bomb === 'armed' ? ' · L2' : ''}`, tx, y0 + 13)
    c.restore()
  }
  one(p1, false); one(p2, true)
  for (const f of [p1, p2]) { const v = f?.rosterKey === 'robin' ? robinUltView(f) : null; if (v && v.cutIn != null) drawCutIn(c, cw, ch, f, v) }
}

// INTRO CARD — "ROBIN — THE BOY WONDER", drawn in the existing intro phase (namecall-banner styling, lower third,
// supplied portrait) while a Robin's own intro plays. Presentation only; skip / rematch clear _introPlaying.
export function drawRobinIntroCard(c, cv, p1, p2) {
  const f = [p1, p2].find(q => q?.rosterKey === 'robin' && q._introPlaying); if (!f) return
  const cw = cv?.width || 1280, ch = cv?.height || 720, k = f._introRevealFrame || 0
  const al = Math.min(1, Math.max(0, (k - 24) / 10)); if (al <= 0) return
  const name = robin.introTitle, [hud0, hud1] = colsOf(f).hud, por = art(f, 'portrait.png')
  c.save(); c.globalAlpha = al; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 36px Arial'
  const bw = c.measureText(name).width + 140, bx = cw / 2 - bw / 2, by = ch * 0.72, bh = 64
  c.fillStyle = 'rgba(8,12,24,0.82)'; c.fillRect(bx, by, bw, bh)
  c.strokeStyle = hud0; c.lineWidth = 3; c.strokeRect(bx, by, bw, bh)
  if (ready(por)) { c.imageSmoothingEnabled = false; c.save(); c.beginPath(); c.rect(bx + 4, by + 4, 56, bh - 8); c.clip(); c.drawImage(por, bx + 4, by - 14, 56, 70); c.restore() }
  c.fillStyle = '#f1f5f9'; c.shadowBlur = 18; c.shadowColor = hud1
  c.fillText(name, cw / 2 + 28, by + bh / 2)
  c.restore()
}

const AFTER_DEFEAT_MUTE = /^(throw|smoke|step|plant|armed|hack|express|roof|staff|swing|reject|ult|convert|detonate)/
export function playRobinCues(f) {
  const q = f?._robin?.cues; if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('robin_' + v) } catch (_) {} }
  q.length = 0
}
export { SMOKE as ROBIN_SMOKE, BLAST as ROBIN_BLAST }
