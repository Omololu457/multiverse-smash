// Beast Boy (beast_boy) — RENDER-ONLY FX, HUD and audio cues. Reads sim state (f._beastBoy, the ultimate view), never
// writes it. Supplied art only for sprites (health-icon expressions, cut-in bust + eye / mouth overlays, precomputed skin
// material strips); the Wild Chain cue, the Instinct token pip and the morph ring are small code-drawn geometry.
// Bounded: images cached once per URL, no particle arrays, no per-frame canvases or pixel reads. Reduced effects:
// juiceSettings.reduceFlashing / reduceMotion → static material phase, no pulsing cues.
import { sound } from './sound.js'
import { juiceSettings } from './juiceSettings.js'
import { beast_boy, ANIMAL_DIR } from './beastBoyData.js'
import { BEAST_BOY_ICONS, BEAST_BOY_CUTSCENE } from './beastBoySprites.js'
import { beastBoyUltView, formOf, instinctOpen } from './beastBoyState.js'
import { BEAST_BOY_FX_COLORS } from './beastBoySkins.js'
import { titanVoTick, titanVoDraw } from './titansVoice.js'   // Teen Titans voice lines (audio-only)
import { drawTitanIntroFx, drawTitanIntroCards } from './titansIntro.js'   // Teen Titans special intros (presentation only)
import './beastBoyUlt.js'   // ANIMAL INSTINCT — FOUR BEAST FINISH: the cinematic director + screen pass over the ultimate (cineRegistry)

const FW = 272, FH = 136
const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const beastBoyFxCacheSize = () => cache.size
const tagOf = f => f?._recolorTag && BEAST_BOY_FX_COLORS[f._recolorTag] ? f._recolorTag : null
const colsOf = f => BEAST_BOY_FX_COLORS[tagOf(f)] || BEAST_BOY_FX_COLORS.default
const art = (f, rel) => image(tagOf(f) ? `./assets/beast_boy/skins/${tagOf(f)}/${rel}` : `./assets/beast_boy/${rel}`)
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const stripOf = action => { const sh = beast_boy.animationData[action]?.sheet; return sh ? sh.slice(sh.lastIndexOf('/') + 1, -4) : null }
const NAME = { gorilla: 'GORILLA', bird: 'BIRD', tiger: 'TIGER', tricera: 'TRICERATOPS' }
const ARROW = { up: '↑', fwd: '→', down: '↓', back: '←', neutral: '' }

// ── skin MATERIAL: precomputed overlay strip of the drawn action, inside the body's own draw rect (body-only by
// construction: the build writes material pixels only inside the approved body masks). Slow crossfade between 4
// precomputed phases (stars / glitter) or a slow alpha breathe (iridescent); one static phase under reduced effects.
// Warm every material strip of a skin ONCE (first time that skin's overlay is needed), so the first appearance of an
// animal mid-match already has its overlay decoded (bounded: one Image per strip × phase, cached for the session).
const warmed = new Set()
function warmMaterial(tag, mat) {
  if (warmed.has(tag)) return; warmed.add(tag)
  const strips = new Set(Object.keys(beast_boy.animationData).map(stripOf).filter(Boolean))
  for (let k = 0; k < (mat.kind === 'iridescent' ? 1 : 4); k++) for (const s of strips) image(`./assets/beast_boy/skins/${tag}/mat/p${k}/${s}.png`)
}
function drawMaterial(c, f) {
  const mat = colsOf(f).material, tag = tagOf(f)
  if (mat && tag) warmMaterial(tag, mat)
  if (!mat || !tag || f._lastDrawX == null || !f._lastDrawW || (f.health <= 0 && f._lastSpriteAction === 'lose')) return
  const strip = stripOf(f._lastSpriteAction); if (!strip) return
  const fr = f._lastSpriteFrame ?? 0, t = f._beastBoy?.tick || 0
  const layer = (k, a) => {
    const im = image(`./assets/beast_boy/skins/${tag}/mat/p${k}/${strip}.png`); if (!ready(im) || a <= 0.01) return
    const n = Math.max(1, Math.round(im.naturalWidth / FW)), i = Math.min(n - 1, fr)
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = a
    if ((f.facing ?? 1) === -1) { c.translate(f._lastDrawX + f._lastDrawW, f._lastDrawY); c.scale(-1, 1) } else c.translate(f._lastDrawX, f._lastDrawY)
    c.drawImage(im, i * FW, 0, FW, FH, 0, 0, f._lastDrawW, f._lastDrawH); c.restore()
  }
  if (mat.kind === 'iridescent') { layer(0, calm() ? mat.maxAlpha * 0.35 : mat.maxAlpha * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / mat.period))); return }
  if (calm()) { layer(0, 0.7); return }
  const P = 56, k = Math.floor(t / P) % 4, u = (t % P) / P, fade = Math.max(0, (u - 0.66) / 0.34)
  layer(k, 0.85 * (1 - fade)); layer((k + 1) % 4, 0.85 * fade)
}

// World layer (after the fighters).
export function drawBeastBoyFx(c, f) {
  if (f?.rosterKey !== 'beast_boy') return
  titanVoDraw(f, null); drawTitanIntroFx(c, f)   // Titans: the win line a beat after the foe drops · the special-intro effect
  drawMaterial(c, f)
  const s = f._beastBoy; if (!s || !(f.health > 0)) return
  const [hud0, hud1] = colsOf(f).hud, top = (f._lastDrawY ?? f.y) - 8, x = ctrX(f)
  c.save(); c.textAlign = 'center'; c.textBaseline = 'bottom'
  // Wild Chain cue: the named next animal + its direction, only while the 10 f window is open (or a link is queued)
  const o = s.wc.queued || s.wc.open
  if (o) {
    const q = !!s.wc.queued, txt = `${q ? '✓ ' : ''}${NAME[o.next]} ${ARROW[ANIMAL_DIR[o.next]]}+SP`
    c.font = 'bold 12px Arial'; const w = c.measureText(txt).width + 12
    c.globalAlpha = 0.85; c.fillStyle = '#0b1410'; c.fillRect(x - w / 2, top - 18, w, 16)
    c.globalAlpha = 1; c.strokeStyle = q ? hud1 : hud0; c.lineWidth = 1.5; c.strokeRect(x - w / 2 + 0.5, top - 17.5, w - 1, 15)
    c.fillStyle = q ? hud1 : '#eafff1'; c.fillText(txt, x, top - 4)
  }
  // Instinct cancel window: a thin ring at the feet while the armed move's last 8 frames accept Jump / dash
  if (instinctOpen(f)) {
    c.globalAlpha = calm() ? 0.6 : 0.5 + 0.3 * Math.sin(s.tick * 0.8); c.strokeStyle = hud1; c.lineWidth = 2
    c.beginPath(); c.ellipse(x, f.y + f.h - 2, 30, 7, 0, 0, Math.PI * 2); c.stroke()
  }
  c.restore()
}

// ── Screen layer: expression icon + Instinct token + Wild Chain counter under each Beast Boy's health bar; cut-in ──
const ICON_ROW = f => {
  if (f.health <= 0) return 'down'
  if (f.hitstun > 0 || f.knockdownState) return 'daze'
  const form = formOf(f)
  if (form !== 'human' || f._beastBoy?.wc?.open) return 'grin'
  if (f.attacking) return 'strain'
  return 'smirk'
}
function drawIcon(c, f, x, y, scale = 1.5) {
  const im = art(f, 'icons/expressions.png'); if (!ready(im)) return
  const I = BEAST_BOY_ICONS, t = f._beastBoy?.tick || 0
  let row = ICON_ROW(f), [r, n] = I.rows[row], fr = calm() ? 0 : Math.floor(t / 8) % n
  if (row === 'smirk' && (t % 200) > 188) { [r, n] = I.rows.blink; fr = Math.min(n - 1, Math.floor((t % 200 - 188) / 3)) }
  c.save(); c.imageSmoothingEnabled = false
  c.drawImage(im, fr * I.w, r * I.h, I.w, I.h, x, y, I.w * scale, I.h * scale); c.restore()
}
export function beastBoyHudLabel(f) {
  const s = f?._beastBoy
  return { instinct: !!s?.inst?.token, collected: Object.keys(s?.inst?.seen || {}).sort(), links: s?.wc?.links || 0, chain: [...(s?.wc?.chain || [])],
    open: s?.wc?.open ? s.wc.open.next : null, queued: s?.wc?.queued ? s.wc.queued.next : null, form: f ? formOf(f) : 'human' }
}
function drawCutIn(c, cw, ch, f, v) {
  const u = v.cutIn, a = u < 0.15 ? u / 0.15 : u > 0.85 ? (1 - u) / 0.15 : 1
  const bust = art(f, 'cutscene/bust.png'); if (!ready(bust)) return
  const B = BEAST_BOY_CUTSCENE, sc = Math.max(2, Math.floor(Math.min(cw, 1400) / 300)), bw = B.bust.w * sc, bh = B.bust.h * sc
  const bandH = bh + 24, y0 = Math.round(ch * 0.3), [hud0, hud1] = colsOf(f).hud
  const left = (f.facing ?? 1) >= 0, slide = (1 - Math.min(1, u / 0.2)) * (left ? -1 : 1) * 120
  c.save(); c.globalAlpha = 0.8 * a; c.fillStyle = '#08120c'; c.fillRect(0, y0, cw, bandH)
  c.globalAlpha = a; c.fillStyle = hud0; c.fillRect(0, y0, cw, 3); c.fillRect(0, y0 + bandH - 3, cw, 3)
  const bx = Math.round((left ? 40 : cw - 40 - bw) + slide), by = y0 + 12
  c.imageSmoothingEnabled = false; c.drawImage(bust, bx, by, bw, bh)
  // supplied mouth cells cycle (expression only — no recorded dialogue exists, none is implied)
  const mo = ['mouth0', 'mouth1', 'mouth2', 'mouth1'][Math.floor(v.frame / 6) % 4], o = B.overlays[mo], im = art(f, `cutscene/${mo}.png`)
  if (ready(im)) c.drawImage(im, bx + o.x * sc, by + o.y * sc, o.w * sc, o.h * sc)
  c.font = `bold ${Math.round(14 + sc * 3)}px Arial`; c.textBaseline = 'middle'; c.textAlign = left ? 'left' : 'right'
  c.fillStyle = hud1; c.fillText('ANIMAL INSTINCT', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.4)
  c.font = `bold ${Math.round(10 + sc * 2)}px Arial`; c.fillStyle = hud0
  c.fillText('FOUR BEAST FINISH', left ? bx + bw + 30 : bx - 30, y0 + bandH * 0.68)
  c.restore()
}
export function drawBeastBoyHud(c, cv, p1, p2) {
  const cw = cv?.width || 1280, ch = cv?.height || 720
  const barW = Math.max(220, Math.min(420, cw * 0.28)), pad = 14
  const one = (f, flip) => {
    if (f?.rosterKey !== 'beast_boy') return
    const L = beastBoyHudLabel(f), [hud0, hud1] = colsOf(f).hud
    const x = (flip ? cw - pad - barW - 20 : pad) + 8, y0 = 74
    const ix = flip ? x + barW - 54 : x
    drawIcon(c, f, ix, y0 - 6, 1.4)
    c.save(); c.font = 'bold 9px Arial'; c.textBaseline = 'top'; c.textAlign = flip ? 'right' : 'left'
    const tx = flip ? ix - 6 : ix + 54
    // INSTINCT: token pip (filled when held) + the distinct animals collected toward the next token
    c.fillStyle = L.instinct ? hud1 : 'rgba(255,255,255,0.18)'; c.strokeStyle = hud1; c.lineWidth = 1
    const px = flip ? tx - 6 : tx + 6
    c.beginPath(); c.moveTo(px, y0); c.lineTo(px + 5, y0 + 5); c.lineTo(px, y0 + 10); c.lineTo(px - 5, y0 + 5); c.closePath(); c.fill(); c.stroke()
    const label = L.instinct ? 'INSTINCT READY' : `INSTINCT ${L.collected.length}/3`
    c.fillStyle = L.instinct ? hud1 : '#dfe9e2'; c.fillText(label, flip ? px - 10 : px + 10, y0 + 1)
    if (L.links > 0 || L.open) { c.fillStyle = hud0; c.fillText(`WILD CHAIN ${L.links}/2`, flip ? px - 10 : px + 10, y0 + 13) }
    c.restore()
  }
  one(p1, false); one(p2, true)
  for (const f of [p1, p2]) { const v = f?.rosterKey === 'beast_boy' ? beastBoyUltView(f) : null; if (v && v.cutIn != null) drawCutIn(c, cw, ch, f, v) }
}

// Cue playback (presentation only). Morph / chain cues are muted after defeat.
const AFTER_DEFEAT_MUTE = /^(morph|chain|instinct|wing|hooves|.*Wind|feint|ult|reject)/
export function playBeastBoyCues(f) {
  const q = f?._beastBoy?.cues
  try { titanVoTick(f, q) } catch (_) {}   // Titans voice: hurt / KO / Ultimate / morph lines (audio-only)
  if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('beastboy_' + v) } catch (_) {} }
  q.length = 0
}
