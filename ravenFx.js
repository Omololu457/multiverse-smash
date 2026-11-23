// Raven (raven): RENDER-ONLY FX, HUD and audio cues. Reads sim state (f._raven, the ultimate view) and never writes it.
//
// Art sources:
// - Supplied art only for sprites: Pile of Bricks, Bricks Breaking, Energy Shot, Energy Exploding, health-icon
//   expressions, cut-in bust with eye / mouth overlays, and precomputed skin-material strips.
// - The pile glow, Verdict warning, levitation shadow, double-jump ring, shell contact arc and the HUD pips are small
//   code-drawn geometry.
//
// Bounded cost:
// - s.fx has at most 10 entries (sim-owned).
// - Images are cached once per URL.
// - No particle arrays, no per-frame canvases, no per-frame pixel reads.
//
// Reduced effects (juiceSettings.reduceFlashing / reduceMotion):
// - No bobbing, static material phase.
// - Steady glows, but the infused brick stays readable (static glow ring + orb overlay).
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { raven, LEV, PILE, SHELL } from './ravenData.js'
import { RAVEN_FX, RAVEN_ICONS, RAVEN_CUTSCENE } from './ravenSprites.js'
import { ravenUltView } from './ravenState.js'
import { RAVEN_FX_COLORS } from './ravenSkins.js'
import { titanVoTick, titanVoDraw } from './titansVoice.js'   // Teen Titans voice lines (audio-only)
import { drawTitanIntroFx, drawTitanIntroCards } from './titansIntro.js'   // Teen Titans special intros (presentation only)

const FW = 112, FH = 104
const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const ravenFxCacheSize = () => cache.size
const tagOf = f => f?._recolorTag && RAVEN_FX_COLORS[f._recolorTag] ? f._recolorTag : null
const colsOf = f => RAVEN_FX_COLORS[tagOf(f)] || RAVEN_FX_COLORS.default
const art = (f, rel) => image(tagOf(f) ? `./assets/raven/skins/${tagOf(f)}/${rel}` : `./assets/raven/${rel}`)
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const S = f => f.spriteScale || raven.spriteScale
const ctrX = f => (f.x || 0) + (f.w || 60) / 2
const stripOf = action => { const sh = raven.animationData[action]?.sheet; return sh ? sh.slice(sh.lastIndexOf('/') + 1, -4) : null }

// draw frame `fr` of an fx strip (w × h cells) centred at (x, y), flipped for dir < 0
function blit(c, im, w, h, fr, x, y, dir, scale, alpha = 1) {
  if (!ready(im)) return
  const n = Math.max(1, Math.round(im.naturalWidth / w)), k = Math.max(0, Math.min(n - 1, fr))
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(y)); if (dir < 0) c.scale(-1, 1)
  c.drawImage(im, k * w, 0, w, h, -w * scale / 2, -h * scale / 2, w * scale, h * scale); c.restore()
}
const strip = (f, name) => art(f, `fx/${name}_strip.png`)
const explosion = (c, f, x, y, t, sc, from = 0) => blit(c, strip(f, 'explosion'), RAVEN_FX.explosion.w, RAVEN_FX.explosion.h, from + Math.floor(t / 2.6), x, y, 1, sc, t > 26 ? Math.max(0, (34 - t) / 8) : 1)
const breaking = (c, f, x, y, t, sc) => blit(c, strip(f, 'breaking'), RAVEN_FX.breaking.w, RAVEN_FX.breaking.h, Math.floor(t / 5), x, y - RAVEN_FX.breaking.h * sc / 2, 1, sc, t > 14 ? Math.max(0, (20 - t) / 6) : 1)
function glow(c, x, y, rx, ry, col, a) { c.save(); c.globalAlpha = a; c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.restore() }
function ring(c, x, y, r, col, a, lw = 2) { c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); c.restore() }

// ── skin MATERIAL ──
// - A precomputed overlay strip of the drawn action, placed inside the body's own draw rect. It is clipped to the
//   approved cloak region by construction: the build writes material pixels only inside that mask.
// - Animated as a slow crossfade between 4 phases, or a slow alpha breathe for iridescent fabric.
// - Static under reduced effects.
function drawMaterial(c, f) {
  const mat = colsOf(f).material, tag = tagOf(f)
  if (!mat || !tag || f._lastDrawX == null || !f._lastDrawW || (f.health <= 0 && f._lastSpriteAction === 'lose')) return
  const st = stripOf(f._lastSpriteAction); if (!st) return
  const fr = f._lastSpriteFrame ?? 0, t = f._raven?.tick || 0
  const layer = (k, a) => {
    const im = image(`./assets/raven/skins/${tag}/mat/p${k}/${st}.png`); if (!ready(im) || a <= 0.01) return
    const n = Math.max(1, Math.round(im.naturalWidth / FW)), i = Math.min(n - 1, fr)
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = a
    if ((f.facing ?? 1) === -1) { c.translate(f._lastDrawX + f._lastDrawW, f._lastDrawY); c.scale(-1, 1) } else c.translate(f._lastDrawX, f._lastDrawY)
    c.drawImage(im, i * FW, 0, FW, FH, 0, 0, f._lastDrawW, f._lastDrawH); c.restore()
  }
  if (mat.kind === 'iridescent') { layer(0, calm() ? mat.maxAlpha * 0.35 : mat.maxAlpha * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / mat.period))); return }
  if (calm()) { layer(0, 0.75); return }
  const P = 54, k = Math.floor(t / P) % 4, u = (t % P) / P   // ≈ 0.9 s per phase, crossfade in the last third (no strobing)
  const fade = Math.max(0, (u - 0.66) / 0.34)
  layer(k, 0.9 * (1 - fade)); layer((k + 1) % 4, 0.9 * fade)
}

function drawPile(c, f, p, t, sc) {
  const [dk, md, lt] = colsOf(f).fx, bob = calm() ? 0 : Math.round(2 * Math.sin((t + p.id * 23) / 14))
  const y = p.y + bob, low = p.state === 'idle' && p.life < 40 && !calm() && (t >> 2) % 2
  glow(c, p.x, y + 4, PILE.w * 0.62, PILE.h * 0.55, dk, p.state === 'idle' ? 0.32 : 0.5)
  if (p.state !== 'idle') ring(c, p.x, y, PILE.w * 0.55, lt, 0.7, 2)
  blit(c, strip(f, 'pile'), RAVEN_FX.pile.w, RAVEN_FX.pile.h, 0, p.x, y, 1, sc, low ? 0.6 : 1)
}
function drawVerdictWarning(c, f, v, t) {
  const [, md, lt] = colsOf(f).fx, pulse = calm() ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(t / 5))
  c.save(); c.globalAlpha = 0.55 * pulse; c.strokeStyle = lt; c.lineWidth = 2; c.setLineDash([6, 6])
  c.beginPath(); c.moveTo(v.col, v.top); c.lineTo(v.col, v.floor); c.stroke(); c.setLineDash([]); c.restore()
  glow(c, v.col, v.floor - 2, 46, 8, md, 0.45 * pulse)
  ring(c, v.col, v.floor - 2, 22, lt, 0.5 * pulse, 1)
}

// World layer (after the fighters).
export function drawRavenFx(c, f) {
  if (f?.rosterKey !== 'raven') return
  titanVoDraw(f, null); drawTitanIntroFx(c, f)   // Titans: the win line a beat after the foe drops · the special-intro effect
  const s = f._raven
  drawMaterial(c, f)
  if (!s) return
  const sc = S(f), t = s.tick, [dk, md, lt] = colsOf(f).fx
  if (s.lev && f.health > 0) {   // levitation: a soft dark shadow on the floor under her (supplied hover frames do the rest)
    const fl = (f.groundY ?? f.y + f.h), hgt = Math.max(0, fl - (f.y + f.h))
    glow(c, ctrX(f), fl - 2, 30 + Math.min(20, hgt / 8), 6, dk, 0.4)
  }
  if (s.djT > 0 && f.health > 0) {   // shared double jump: restrained derived aura ring from the supplied Jumping poses' feet
    const u = 1 - s.djT / 16; ring(c, ctrX(f), f.y + f.h - 4, 14 + 30 * u, md, 0.7 * (1 - u), 3)
  }
  if (s.verdict) drawVerdictWarning(c, f, s.verdict, t)
  for (const p of s.piles) drawPile(c, f, p, t, sc)
  for (const e of s.live) if (e.kind === 'infused') {   // infused brick: the engine draws the brick, the orb glow rides on it
    const vx = e.x - e.px, x = e.x, y = e.y
    glow(c, x, y, 34, 22, md, calm() ? 0.45 : 0.35 + 0.15 * Math.sin(t / 3)); ring(c, x, y, 26, lt, 0.8, 2)
    blit(c, strip(f, 'orb'), RAVEN_FX.orb.w, RAVEN_FX.orb.h, calm() ? 1 : (t >> 2) % 3, x - (vx >= 0 ? 18 : -18), y, vx < 0 ? -1 : 1, sc * 0.8, 0.9)
  }
  for (const e of s.fx) {
    if (e.kind === 'break') breaking(c, f, e.x, e.y, e.t, sc)
    else if (e.kind === 'explode') explosion(c, f, e.x, e.y, e.t, sc * 0.8)
    else if (e.kind === 'fizzle') explosion(c, f, e.x, e.y, e.t, sc * 0.5, 6)
    else if (e.kind === 'infuse' && e.t < 14) ring(c, e.x, e.y, 18 + e.t * 3, lt, 1 - e.t / 14, 3)
    else if (e.kind === 'shellHit' && e.t < 12) { c.save(); c.globalAlpha = 1 - e.t / 12; c.strokeStyle = lt; c.lineWidth = 4; c.beginPath(); c.arc(e.x - e.dir * 40, e.y, 70, e.dir > 0 ? -0.9 : Math.PI - 0.9, e.dir > 0 ? 0.9 : Math.PI + 0.9); c.stroke(); c.restore() }
    else if (e.kind === 'shellCue' && e.t < 18) { ring(c, e.x, e.y, 30 + e.t * 2, '#ffffff', 0.8 * (1 - e.t / 18), 2); ring(c, e.x, e.y, 22 + e.t, lt, 0.8 * (1 - e.t / 18), 2) }
  }
  const v = ravenUltView(f)
  if (v) {
    for (const p of v.piles) { if (p.glow) glow(c, p.x, p.y, 40, 26, md, 0.4); blit(c, strip(f, 'pile'), RAVEN_FX.pile.w, RAVEN_FX.pile.h, 0, p.x, p.y, 1, sc * 1.15) }
    for (const d of v.debris) breaking(c, f, d.x, d.y, d.k, sc * 1.2)
    if (v.charge != null) glow(c, ctrX(f) + (f.facing ?? 1) * 36, f.y + f.h * 0.4, 10 + 26 * v.charge, 10 + 26 * v.charge, md, 0.5)
    if (v.release) explosion(c, f, v.release.x, v.release.y, v.release.k, sc * 1.8)
  }
}

// ── Screen layer: pile pips, levitation budget, shell cooldown and expression icon under each Raven's health bar; cut-in ──
const ICON_ROW = f => {
  const s = f._raven
  if (f.health <= 0) return 'down'
  if (f.hitstun > 0 || f.knockdownState) return 'daze'
  if (f.health < f.maxHealth * 0.3) return 'hurt'
  if (f.attacking && (f.currentAttack?.isSpecial || f.currentAttack?.isUltimate)) return 'strain'
  if (s?.lev) return 'focus'
  return 'calm'
}
function drawIcon(c, f, x, y, scale = 1.4) {
  const im = art(f, 'icons/expressions.png'); if (!ready(im)) return
  const I = RAVEN_ICONS, t = f._raven?.tick || 0, row = ICON_ROW(f)
  const [r, n] = I.rows[row]
  const fr = row === 'calm' ? ((t % 200) > 190 ? 1 : 0) : row === 'daze' ? Math.floor(t / 10) % n : Math.floor(t / 8) % n
  c.save(); c.imageSmoothingEnabled = false
  c.drawImage(im, fr * I.w, r * I.h, I.w, I.h, x, y, I.w * scale, I.h * scale); c.restore()
}
export function ravenHudLabel(f) {
  const s = f?._raven
  const used = s ? s.piles.length + s.live.filter(e => e.kind !== 'pulse' && e.kind !== 'airPulse' && e.kind !== 'ult').length : 0
  return { piles: s ? s.piles.filter(p => p.state === 'idle').length : 0, slots: Math.max(0, PILE.max - used),
    lev: s?.lev ? Math.max(0, LEV.maxFrames - s.lev.t) : null, shellCd: s?.shellCd || 0 }
}
function drawCutIn(c, cw, ch, f, v) {
  const u = v.cutIn, a = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1
  const bust = art(f, 'cutscene/bust.png'); if (!ready(bust)) return
  const B = RAVEN_CUTSCENE, sc = Math.max(2, Math.floor(Math.min(cw, 1400) / 380)), bw = B.bust.w * sc, bh = B.bust.h * sc
  const bandH = bh + 24, y0 = Math.round(ch * 0.3), [hud0, hud1] = colsOf(f).hud
  const left = (f.facing ?? 1) >= 0, slide = calm() ? 0 : (1 - Math.min(1, u / 0.2)) * (left ? -1 : 1) * 120
  c.save(); c.globalAlpha = 0.82 * a; c.fillStyle = '#08060f'; c.fillRect(0, y0, cw, bandH)
  c.globalAlpha = a; c.fillStyle = hud0; c.fillRect(0, y0, cw, 3); c.fillRect(0, y0 + bandH - 3, cw, 3)
  const bx = Math.round((left ? 40 : cw - 40 - bw) + slide), by = y0 + 12
  c.imageSmoothingEnabled = false
  c.drawImage(bust, bx, by, bw, bh)
  const t = v.frame, ov = (n, o) => { const im = art(f, `cutscene/${n}.png`); if (ready(im)) c.drawImage(im, bx + o.x * sc, by + o.y * sc, o.w * sc, o.h * sc) }
  if (t >= 30) ov(t < 34 ? 'eye1' : 'eye0', B.overlays.eye0)                                       // supplied narrowed-eye cells (a closing focus beat)
  const mo = ['mouth0', 'mouth1', 'mouth2', 'mouth1'][Math.floor(t / 6) % 4]; if (t >= 6 && t < 28) ov(mo, B.overlays[mo])   // supplied mouth cells (no voice, no text)
  c.font = `bold ${Math.round(14 + sc * 3)}px Arial`; c.textBaseline = 'middle'; c.textAlign = left ? 'left' : 'right'
  c.fillStyle = hud1; c.fillText('AZARATH', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.4)
  c.font = `bold ${Math.round(10 + sc * 2)}px Arial`; c.fillStyle = hud0
  c.fillText('THE ROOM OBEYS', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.68)
  c.restore()
}
export function drawRavenHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => {
    if (f?.rosterKey !== 'raven') return
    const x = (flip ? cw - pad - barW - 20 : pad) + 8, y0 = 74, L = ravenHudLabel(f), [hud0, hud1] = colsOf(f).hud
    const bx = flip ? x + 60 : x, w = barW - 60
    c.save()
    // two small pile-availability indicators: filled = a free object slot, ring = in use; inner dot = an idle pile ready
    for (let i = 0; i < PILE.max; i++) {
      const px = flip ? bx + w - 10 - i * 22 : bx + 10 + i * 22, py = y0 + 5
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(px - 9, py - 6, 18, 12)
      c.strokeStyle = hud0; c.lineWidth = 1.5; c.strokeRect(px - 8.5, py - 5.5, 17, 11)
      if (i < L.slots) { c.fillStyle = hud0; c.fillRect(px - 6, py - 3, 12, 6) }
      if (i < L.piles) { c.fillStyle = '#ffffff'; c.fillRect(px - 2, py - 2, 4, 4) }
    }
    c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    const tx = flip ? bx + w - 52 : bx + 52
    const parts = []
    if (L.lev != null) parts.push(`LEVITATE ${Math.ceil(L.lev / 6) / 10}s`)
    if (L.shellCd > 0) parts.push(`SHELL ${Math.ceil(L.shellCd / 6) / 10}s`)
    c.fillStyle = hud1; c.fillText(parts.join('  ') || 'BRICKS', tx, y0)
    if (L.lev != null) {   // levitation budget bar (remaining of 120 f)
      const lw = 70, fill = lw * L.lev / LEV.maxFrames, lx = flip ? tx - lw : tx
      c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(lx, y0 + 12, lw, 4); c.fillStyle = hud0; c.fillRect(flip ? lx + lw - fill : lx, y0 + 12, fill, 4)
    }
    c.restore()
    drawIcon(c, f, flip ? x : x + barW - 54, y0 - 6, 1.4)
  }
  one(p1, false); one(p2, true)
  for (const f of [p1, p2]) { const v = f?.rosterKey === 'raven' ? ravenUltView(f) : null; if (v && v.cutIn != null) drawCutIn(c, cw, ch, f, v) }
}

// Cue playback (presentation only). Spell cues are muted after defeat.
const AFTER_DEFEAT_MUTE = /^(pulse|cast|lift|send|infuse|verdict|shell|lev|reject|doubleJump|ult)/
export function playRavenCues(f) {
  const q = f?._raven?.cues
  try { titanVoTick(f, q) } catch (_) {}   // Titans voice: hurt / KO / Ultimate / morph lines (audio-only)
  if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('raven_' + v) } catch (_) {} }
  q.length = 0
}
