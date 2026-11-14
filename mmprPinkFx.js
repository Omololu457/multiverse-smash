// Pink Ranger (mmpr_pink) — RENDER-ONLY FX + audio cues. Reads sim state (f._mmprPink, f._falcon, f._ranger, the
// ultimate scene), never writes it. Supplied art only: the shared Thunder Megazord cells (one decode cache for every
// owner), the supplied yellow arrow, Kimberly's own low-dive cell as the blink afterimage. Markers (Spotter reticle,
// call location, sword-warning, Command pips, Thread flash) are small code-drawn geometry in the owner's skin colour.
// Bounded: no particle arrays, no per-frame canvas allocation, no per-frame image decoding.
import { sound } from './sound.js'
import { THUNDER_CELLS, THUNDER_SEQ } from './thunderMegazordSprites.js'
import { FALCON_SORTIES, falconPos, falconHud } from './falconzord.js'
import { THUNDER_RESOURCE, SPOTTER, BOW } from './mmprPinkData.js'
import { mmprPinkUltScene } from './mmprPinkState.js'
import { MMPR_PINK_FX_COLORS } from './mmprPinkSkins.js'

// 88 px source height x 2.4 ≈ 210 px: clearly larger than the ~133 px fighters, never taller than ~40 % of a 720 px
// view, so both fighters and the HUD stay readable.
export const THUNDER_SCALE = 2.4
const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
export const mmprPinkFxCacheSize = () => cache.size
const ownerArt = (f, n) => image(f._recolorTag ? `./assets/mmpr_pink/skins/${f._recolorTag}/${n}.png` : `./assets/mmpr_pink/${n}.png`)
const cols = f => MMPR_PINK_FX_COLORS[f._recolorTag] || MMPR_PINK_FX_COLORS.default

// One Thunder Megazord cell with its FEET anchor at a world point, facing `dir` (+1 = right). Shared by every owner.
export function drawThunderCell(c, name, x, y, dir, alpha = 1, scale = THUNDER_SCALE) {
  const cell = THUNDER_CELLS[name]; if (!cell) return
  const im = image(cell.src); if (!im.complete || !im.naturalWidth) return
  const flip = dir * (cell.face || 1) < 0
  c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = Math.max(0, Math.min(1, alpha)); c.translate(Math.round(x), Math.round(y)); if (flip) c.scale(-1, 1)
  c.drawImage(im, -cell.ax * scale, -cell.ay * scale, cell.w * scale, cell.h * scale); c.restore()
}
// Pose → cell for an ordinary strike (render choice only; contact timing comes from the profile, never from art).
function cellFor(kind, pose, age) {
  if (pose === 'step') return THUNDER_SEQ.step[Math.floor(age / 3) % THUNDER_SEQ.step.length]
  if (pose === 'uslash') return age < 28 ? 'rslash0' : 'rslash1'
  if (pose === 'dwind') return age < 10 ? 'over1' : 'over0'
  if (pose === 'exit') return 'brace1'
  const seq = THUNDER_SEQ[pose] || [pose]
  return seq[Math.floor(age / 4) % seq.length]
}
function warning(c, f, so, P) {
  const first = P.contacts[0].from, [lite, deep] = cols(f)
  if (so.age > first + 2) return
  const u = Math.min(1, so.age / Math.max(1, first)), x = so.tx, y = so.ty
  c.save(); c.globalAlpha = 0.45 + 0.5 * u; c.strokeStyle = lite; c.fillStyle = lite; c.lineWidth = 2
  // ground bracket at the captured location
  c.beginPath(); c.moveTo(x - 46, y); c.lineTo(x + 46, y); c.stroke()
  c.beginPath(); c.moveTo(x - 46, y); c.lineTo(x - 46, y - 10); c.moveTo(x + 46, y); c.lineTo(x + 46, y - 10); c.stroke()
  if (so.kind === 'thunderLine') {        // horizontal cut height
    const yy = y - 45; c.setLineDash([10, 6]); c.beginPath(); c.moveTo(x - 75, yy); c.lineTo(x + 75, yy); c.stroke(); c.setLineDash([])
    c.beginPath(); c.moveTo(x + so.dir * 80, yy); c.lineTo(x + so.dir * 68, yy - 7); c.lineTo(x + so.dir * 68, yy + 7); c.closePath(); c.fill()
  } else if (so.kind === 'skySplitter') { // rising chevrons
    for (let i = 0; i < 3; i++) { const yy = y - 20 - i * 34 - u * 12; c.beginPath(); c.moveTo(x - 14, yy + 8); c.lineTo(x, yy - 6); c.lineTo(x + 14, yy + 8); c.stroke() }
  } else {                                 // Returning Edge: descending chevrons + a filling column (longer read)
    c.strokeStyle = deep; c.strokeRect(x - 30, y - 120, 60, 120); c.fillStyle = deep; c.globalAlpha *= 0.35; c.fillRect(x - 30, y - 120 * u, 60, 120 * u)
    c.globalAlpha = 0.5 + 0.5 * u; c.strokeStyle = lite
    for (let i = 0; i < 3; i++) { const yy = y - 110 + i * 30 + u * 10; c.beginPath(); c.moveTo(x - 14, yy - 8); c.lineTo(x, yy + 6); c.lineTo(x + 14, yy - 8); c.stroke() }
  }
  c.restore()
}
function drawSortie(c, f) {
  const so = f._falcon?.sortie; if (!so || !FALCON_SORTIES[so.kind] || !/^(thunderLine|skySplitter|returningEdge)$/.test(so.kind)) return
  const P = FALCON_SORTIES[so.kind], p = falconPos(so)
  warning(c, f, so, P)
  const fadeIn = Math.min(1, (so.age + 1) / 6), fadeOut = so.age > P.life - 10 ? (P.life - so.age) / 10 : 1
  drawThunderCell(c, cellFor(so.kind, p.pose, so.age), p.x, p.y, so.dir, fadeIn * fadeOut)
}
// The pending call: the captured location is telegraphed from the moment the call is accepted (before commit).
function drawPendingCall(c, f) {
  const s = f._mmprPink, at = s?.callAt; if (!at || !f._falcon?.pendingKind) return
  const [lite] = cols(f)
  c.save(); c.globalAlpha = 0.8; c.strokeStyle = lite; c.lineWidth = 2; c.setLineDash([6, 5])
  c.beginPath(); c.moveTo(at.x - 40, at.y); c.lineTo(at.x + 40, at.y); c.stroke()
  c.beginPath(); c.moveTo(at.x, at.y); c.lineTo(at.x, at.y - 70); c.stroke(); c.setLineDash([])
  c.beginPath(); c.arc(at.x, at.y - 70, 7, 0, Math.PI * 2); c.stroke()
  c.restore()
}
function drawSpotter(c, f) {
  const sp = f._mmprPink?.spot; if (!sp) return
  const [lite, deep] = cols(f), a = Math.min(1, sp.t / 20), r = 16
  c.save(); c.globalAlpha = 0.85 * a; c.strokeStyle = lite; c.lineWidth = 2
  c.beginPath(); c.arc(sp.x, sp.y, r, 0, Math.PI * 2); c.stroke()
  c.strokeStyle = deep
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { c.beginPath(); c.moveTo(sp.x + dx * (r - 5), sp.y + dy * (r - 5)); c.lineTo(sp.x + dx * (r + 7), sp.y + dy * (r + 7)); c.stroke() }
  c.restore()
}
function drawPips(c, f) {
  const h = falconHud(f, THUNDER_RESOURCE); if (!h) return
  const s = f._mmprPink, [lite, deep] = cols(f), cx = f.x + f.w / 2, y = f.y - 22, locked = h.lockout > 0 || h.postUlt > 0 || !!h.active
  c.save()
  for (let i = 0; i < h.max; i++) {
    const x = cx - 9 + i * 18, fill = i < h.pips ? 1 : i === h.pips ? h.refill : 0
    c.beginPath(); c.rect(x - 5, y - 5, 10, 10)
    c.fillStyle = '#1b1218'; c.globalAlpha = 0.85; c.fill()
    if (fill > 0) { c.save(); c.clip(); c.fillStyle = i < h.pips ? (locked ? deep : lite) : deep; c.globalAlpha = 1; c.fillRect(x - 5, y + 5 - 10 * fill, 10, 10 * fill); c.restore() }
    c.globalAlpha = 1; c.strokeStyle = s?.reject > 0 && s.rejectWhy !== 'arrow' ? '#ff4d4d' : lite; c.lineWidth = 1; c.stroke()
  }
  if (s?.reject > 0) { c.globalAlpha = Math.min(1, s.reject / 8); c.strokeStyle = '#ff4d4d'; c.lineWidth = 2
    c.beginPath(); c.moveTo(cx - 6, y - 18); c.lineTo(cx + 6, y - 8); c.moveTo(cx + 6, y - 18); c.lineTo(cx - 6, y - 8); c.stroke() }
  c.restore()
}
function drawThread(c, f) {
  const th = f._mmprPink?.thread; if (!th) return
  const [lite] = cols(f), x = f.x + f.w / 2, y = f.y + f.h * 0.3
  c.save(); c.globalAlpha = th.t / 10; c.strokeStyle = lite; c.lineWidth = 3
  c.beginPath(); c.arc(x, y, 34 - th.t, 0, Math.PI * 2); c.stroke()
  c.beginPath(); c.moveTo(x - 30, y - 30); c.lineTo(x + 30, y + 30); c.stroke()
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
function drawUlt(c, f) {
  const u = mmprPinkUltScene(f); if (!u) return
  const z = u.zord
  if (z) drawThunderCell(c, cellFor('ult', z.pose, z.age), z.x, z.y, z.dir, z.alpha)
  if (u.arrow) {   // the supplied arrow (no new giant arrow art), drawn at the hand height mapping used by real arrows
    const im = ownerArt(f, 'arrow'), A = BOW.art
    if (im.complete && im.naturalWidth) { c.save(); c.imageSmoothingEnabled = false; c.translate(Math.round(u.arrow.x), Math.round(f.y + f.h - A.handDy)); if (u.arrow.dir < 0) c.scale(-1, 1)
      c.drawImage(im, -A.w * A.scale / 2, -A.lineRow * A.scale, A.w * A.scale, A.h * A.scale); c.restore() }
  }
  if (u.impact) { const k = u.impact.age / 10; c.save(); c.globalAlpha = 0.8 * (1 - k); c.fillStyle = '#ffffff'
    c.beginPath(); c.arc(u.impact.x, u.impact.y, 30 + 60 * k, 0, Math.PI * 2); c.fill(); c.restore() }
}
// Presentation: a brief, distant cosmetic Thunder Megazord on the victory pose (never an entity, never over the fighter).
const winT = new WeakMap()
function drawVictory(c, f) {
  const win = f._forceAction === 'win', st = winT.get(f) || { t: 0 }
  if (!win) { if (st.t) winT.set(f, { t: 0 }); return }
  st.t++; winT.set(f, st)
  if (st.t > 120) return
  const dir = f.facing || 1, a = 0.5 * Math.min(1, st.t / 15) * (st.t > 100 ? (120 - st.t) / 20 : 1)
  drawThunderCell(c, 'ready0', f.x + f.w / 2 - dir * 230, f.y + f.h, dir, a, THUNDER_SCALE * 0.8)
}

export function drawMmprPinkFx(c, f, opp = null) {
  if (f?.rosterKey !== 'mmpr_pink') return
  drawVictory(c, f)
  drawSortie(c, f)      // a committed strike finishes even if Kimberly is KO'd this frame (sim-owned)
  drawUlt(c, f)
  if (f.health > 0) { drawPendingCall(c, f); drawSpotter(c, f); drawBlink(c, f); drawPips(c, f); drawThread(c, f) }
}
// Cue playback (presentation only). No call / assist sound after defeat.
const AFTER_DEFEAT_MUTE = /^(call|ready|commit_|bowDraw|armed|shot|ultStart|ultConfirm|ultArrow)/
export function playMmprPinkCues(f) {
  const q = f?._mmprPink?.cues; if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('mmprpink_' + v) } catch (_) {} }
  q.length = 0
}
export function preloadThunderMegazord() { for (const k in THUNDER_CELLS) image(THUNDER_CELLS[k].src) }
export const SPOTTER_LIMIT = SPOTTER.maxDist
