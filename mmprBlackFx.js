// Black Ranger (mmpr_black) — RENDER-ONLY FX + audio cues. Reads sim state (f._mmprBlack, f._falcon, f._ranger, the
// ultimate status), never writes it. Supplied art only: Falconzord cells (shared cache, decoded once for every owner),
// the capsule shots, the impact burst, Black's own low-dive cell as the blink afterimage. Markers (lane, reticle,
// pips, Pincer flash) are small code-drawn geometry in the owner's skin colour. Bounded: no particle arrays, no
// per-frame canvas allocation, no per-frame image decoding.
import { sound } from './sound.js'
import { FALCON_CELLS, FALCON_SEQ } from './falconzordSprites.js'
import { FALCON_SORTIES, falconPos, falconHud } from './falconzord.js'
import { FALCON_RESOURCE } from './mmprBlackData.js'
import { mmprBlackUltFalcon } from './mmprBlackState.js'
import { MMPR_BLACK_FX_COLORS } from './mmprBlackSkins.js'

export const FALCON_SCALE = 1.5          // ~110 px wide in flight: a large assist that never hides both fighters / HUD
const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
export const mmprBlackFxCacheSize = () => cache.size
const ownerArt = (f, n) => image(f._recolorTag ? `./assets/mmpr_black/skins/${f._recolorTag}/${n}.png` : `./assets/mmpr_black/${n}.png`)
const cols = f => MMPR_BLACK_FX_COLORS[f._recolorTag] || MMPR_BLACK_FX_COLORS.default

// Draw one Falconzord cell at a world point (the cell's torso / wing-root anchor), facing `dir` (+1 = right).
export function drawFalconCell(c, name, x, y, dir, alpha = 1, scale = FALCON_SCALE) {
  const cell = FALCON_CELLS[name]; if (!cell) return
  const im = image(cell.src); if (!im.complete || !im.naturalWidth) return
  const flip = dir * (cell.face || 1) < 0
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(y)); if (flip) c.scale(-1, 1)
  c.drawImage(im, -cell.ax * scale, -cell.ay * scale, cell.w * scale, cell.h * scale); c.restore()
}
const frameOf = (pose, age, speed = 4) => { const seq = FALCON_SEQ[pose] || [pose]; return seq[Math.floor(age / speed) % seq.length] }

function drawSortie(c, f) {
  const so = f._falcon?.sortie; if (!so) return
  const P = FALCON_SORTIES[so.kind], p = falconPos(so), [lite, deep] = cols(f)
  // WARNING (owner-coloured, before any contact can land)
  if (so.age < P.warn + 4) {
    const a = 0.75 * (1 - Math.max(0, so.age - P.warn) / 4)
    c.save(); c.globalAlpha = a; c.strokeStyle = lite; c.lineWidth = 2
    if (so.kind === 'sweep') { c.setLineDash([10, 8]); c.beginPath(); c.moveTo(so.ox - so.dir * 170, so.oy); c.lineTo(so.ox + so.dir * 560, so.oy); c.stroke()
      c.setLineDash([]); c.beginPath(); const hx = so.ox + so.dir * 560; c.moveTo(hx, so.oy); c.lineTo(hx - so.dir * 12, so.oy - 7); c.lineTo(hx - so.dir * 12, so.oy + 7); c.closePath(); c.fillStyle = lite; c.fill() }
    else { const r = 22 - Math.min(10, so.age); c.beginPath(); c.arc(so.tx, so.ty, r, 0, Math.PI * 2); c.stroke(); c.strokeStyle = deep
      c.beginPath(); c.moveTo(so.tx - r - 6, so.ty); c.lineTo(so.tx + r + 6, so.ty); c.moveTo(so.tx, so.ty - r - 6); c.lineTo(so.tx, so.ty + r + 6); c.stroke() }
    c.restore()
  }
  const dir = Math.sign(p.vx) || so.dir
  const name = frameOf(p.pose === 'approach' ? 'approach' : p.pose === 'turn' ? 'turn' : p.pose, so.age)
  drawFalconCell(c, name, p.x, p.y, dir)
}
function drawUltFalcon(c, f) {
  const u = mmprBlackUltFalcon(f); if (!u) return
  if (u.pose === 'impact') { const k = Math.min(1, (u.age - 158) / 14); drawFalconCell(c, 'impact0', u.x, u.y + 10, u.dir, 1 - k * 0.8, 2.2); drawFalconCell(c, 'energy0', u.x, u.y - 30 - k * 120, u.dir, 1 - k) }
  else drawFalconCell(c, frameOf(u.pose, u.age, 3), u.x, u.y, u.dir)
}
function drawPips(c, f) {
  const h = falconHud(f, FALCON_RESOURCE); if (!h) return
  const [lite, deep] = cols(f), cx = f.x + f.w / 2, y = f.y - 22, locked = h.lockout > 0 || h.postUlt > 0 || !!h.active
  c.save()
  for (let i = 0; i < h.max; i++) {
    const x = cx - 9 + i * 18, fill = i < h.pips ? 1 : i === h.pips ? h.refill : 0
    c.beginPath(); c.moveTo(x, y - 6); c.lineTo(x + 6, y); c.lineTo(x, y + 6); c.lineTo(x - 6, y); c.closePath()
    c.fillStyle = '#14171c'; c.globalAlpha = 0.85; c.fill()
    if (fill > 0) { c.save(); c.clip(); c.fillStyle = i < h.pips ? (locked ? deep : lite) : deep; c.globalAlpha = 1; c.fillRect(x - 6, y + 6 - 12 * fill, 12, 12 * fill); c.restore() }
    c.globalAlpha = 1; c.strokeStyle = lite; c.lineWidth = 1; c.stroke()
  }
  c.restore()
}
function drawPincer(c, f, opp) {
  const P = f._mmprBlack?.pincer; if (!P || !opp) return
  const [lite] = cols(f), x = opp.x + opp.w / 2, y = opp.y + opp.h * 0.35
  c.save(); c.strokeStyle = lite; c.lineWidth = 2
  if (P.cancel) { c.globalAlpha = 0.95; c.beginPath(); c.arc(x, y, 30, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(x, y, 18, 0, Math.PI * 2); c.stroke() }   // confirmed: double ring
  else { c.globalAlpha = 0.25 + 0.5 * (P.t / 45); c.setLineDash([4, 4]); c.beginPath(); c.arc(x, y, 24, 0, Math.PI * 2); c.stroke() }   // tag ticking down
  c.restore()
}
function drawBlink(c, f) {
  const b = f._ranger?.blink; if (!b || b.phase !== 'travel' || b.x1 == null) return
  const im = ownerArt(f, 'blink'); if (!im.complete || !im.naturalWidth) return
  const s = f.spriteScale || 1.85, w = 176 * s, h = 128 * s
  for (let i = 0; i < 3; i++) {
    const u = (i + 1) / 4, x = b.x0 + (b.x1 - b.x0) * u + f.w / 2
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 0.18 + 0.12 * i; c.translate(x, f.y + f.h); if ((f.facing || 1) < 0) c.scale(-1, 1)
    c.drawImage(im, -88 * s, -118 * s, w, h); c.restore()
  }
}
// Presentation flourishes: one distant cosmetic Falcon pass (no pips, no combat entity). Render-side counter only.
const flyT = new WeakMap()
function drawFlypast(c, f) {
  const intro = !!f._introPlaying, win = f._forceAction === 'win'
  const key = intro ? 'intro' : win ? 'win' : null
  const st = flyT.get(f) || {}; if (!key) { if (st.key) flyT.set(f, {}); return }
  if (st.key !== key) { st.key = key; st.t = 0; flyT.set(f, st) }
  if (st.t > 90) return
  const u = st.t / 90, dir = f.facing || 1, x = f.x + f.w / 2 - dir * 420 + dir * 840 * u, y = f.y - 150 - 40 * Math.sin(u * Math.PI)
  drawFalconCell(c, frameOf('approach', st.t, 6), x, y, dir, 0.55 * Math.sin(u * Math.PI), FALCON_SCALE * 0.6)
  st.t++
}

export function drawMmprBlackFx(c, f, opp = null) {
  if (f?.rosterKey !== 'mmpr_black') return
  drawFlypast(c, f)
  if (f.health > 0) { drawBlink(c, f); drawPips(c, f); drawPincer(c, f, opp) }
  drawSortie(c, f)      // a committed sortie finishes its short pass even if Black is KO'd this frame (sim-owned)
  drawUltFalcon(c, f)
}
// Cue playback (presentation only). No call / summon / sortie sound after defeat.
const AFTER_DEFEAT_MUTE = /^(call|ready|commit_|volley|ultStart|ultConfirm)/
export function playMmprBlackCues(f) {
  const q = f?._mmprBlack?.cues; if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('mmprblack_' + v) } catch (_) {} }
  q.length = 0
}
// Preload the shared Falconzord cells once (game boot / character select). Idempotent.
export function preloadFalconzord() { for (const k in FALCON_CELLS) image(FALCON_CELLS[k].src) }
