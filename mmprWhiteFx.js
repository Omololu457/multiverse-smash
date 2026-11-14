// White Ranger (mmpr_white) — RENDER-ONLY FX + audio cues. Reads sim state (f._mmprWhite, f._falcon, f._ranger, the
// ultimate status), never writes it. Supplied art only: Ninja Megazord cells through the SHARED Zord cell drawer / image
// cache (mmprBlackFx.drawZordCell), the supplied sword arc, Tommy's own low-dive cell as the blink afterimage. Markers
// (order warning, order pips, discipline symbols, Formation token, Leader's Return cue) are small code-drawn geometry in
// the owner's skin colours. Bounded: no particle arrays, no per-frame canvas allocation, no per-frame image decoding.
import { sound } from './sound.js'
import { NINJA_CELLS, NINJA_SEQ } from './ninjaMegazordSprites.js'
import { FALCON_SORTIES, falconPos, falconHud } from './falconzord.js'
import { drawZordCell, preloadZordCells } from './mmprBlackFx.js'
import { NINJA_RESOURCE, FORMATION } from './mmprWhiteData.js'
import { mmprWhiteUltZord } from './mmprWhiteState.js'
import { MMPR_WHITE_FX_COLORS } from './mmprWhiteSkins.js'

export const NINJA_SCALE = 1.9            // ~167 px tall: larger than Tommy (133 px) without hiding both fighters / HUD
export const NINJA_ALPHA = 0.82           // drawn over the fighter layer: slightly translucent so neither fighter disappears
const ghost = new Map()
function image(url) { if (!ghost.has(url)) { const im = new Image(); im.src = url; ghost.set(url, im) } return ghost.get(url) }
const ownerArt = (f, n) => image(f._recolorTag ? `./assets/mmpr_white/skins/${f._recolorTag}/${n}.png` : `./assets/mmpr_white/${n}.png`)
const cols = f => MMPR_WHITE_FX_COLORS[f._recolorTag] || MMPR_WHITE_FX_COLORS.default
export const mmprWhiteFxCacheSize = () => ghost.size
const frameOf = (pose, age, speed = 4) => { const seq = NINJA_SEQ[pose] || [pose]; return seq[Math.floor(age / speed) % seq.length] }
const ZPOSE = { step: 'step', jab: 'jab', punch: 'punch', punch2: 'punch2', ready: 'ready', rear: 'rear', chamber: 'chamber', crane: 'crane',
  recover: 'recover', push: 'push', draw: 'draw', wind: 'wind', cut: 'cut', cutHold: 'cut', finish: 'finish' }

function drawZord(c, pose, x, y, dir, age, alpha = NINJA_ALPHA) {
  drawZordCell(c, NINJA_CELLS, frameOf(ZPOSE[pose] || pose, age, 5), x, y, dir, alpha, NINJA_SCALE)
}
function drawArc(c, x, y, dir, u) {   // the supplied sword arc, in front of the blade, fading over its active frames
  drawZordCell(c, NINJA_CELLS, 'arc0', x + dir * 40, y - 110, dir, Math.max(0, 1 - u) * 0.95, NINJA_SCALE)
}
function drawOrder(c, f) {
  const so = f._falcon?.sortie; if (!so) return
  const P = FALCON_SORTIES[so.kind]; if (P.zord !== 'ninja') return
  const p = falconPos(so), [lite, deep] = cols(f)
  const gated = (so.gates || []).includes('formation')
  // WARNING: the committed strike zone on the floor (owner-coloured), before any contact can land
  if (so.age < P.warn + 4) {
    const c0 = P.contacts[0], b = c0.box, zx = so.ox + so.dir * (P.keys.find(k => k[0] >= c0.from)?.[1] ?? 0) + so.dir * (b.dx || 0)
    const a = 0.7 * (1 - Math.max(0, so.age - P.warn) / 4)
    c.save(); c.globalAlpha = a; c.strokeStyle = lite; c.lineWidth = 2; c.setLineDash([8, 6])
    c.strokeRect(zx - b.w / 2, so.oy + (b.dy || 0) - b.h / 2, b.w, b.h); c.setLineDash([])
    c.fillStyle = deep; c.globalAlpha = a * 0.25; c.fillRect(zx - b.w / 2, so.oy - 4, b.w, 4); c.restore()
  }
  let pose = p.pose
  if (!gated && P.gatePoses?.[pose]) pose = P.gatePoses[pose]   // the follow-up pose only shows when it was accepted
  drawZord(c, pose, p.x, p.y, so.dir, so.age)
  if (so.kind === 'ninjaEdge') {
    const cA = P.contacts[0], cB = P.contacts[1]
    if (so.age >= cA.from && so.age <= cA.to + 6) drawArc(c, p.x, p.y, so.dir, (so.age - cA.from) / 10)
    if (gated && so.age >= cB.from && so.age <= cB.to + 6) drawArc(c, p.x, p.y + 20, so.dir, (so.age - cB.from) / 10)
  }
}
function drawUltZord(c, f) {
  const u = mmprWhiteUltZord(f); if (!u) return
  drawZord(c, u.pose, u.x, u.y, u.dir, u.age, 0.9)
  if (u.arc != null) drawArc(c, u.x, u.y, u.dir, u.arc)
}
// Compact HUD above Tommy: order pips (diamonds) + three discipline symbols + the Formation token with its expiry ring.
function glyph(c, d, x, y, on, lite, deep) {
  c.save(); c.translate(x, y); c.lineWidth = 1.5; c.strokeStyle = on ? lite : '#5c6370'; c.fillStyle = on ? lite : '#14171c'; c.globalAlpha = on ? 1 : 0.8
  c.beginPath(); c.arc(0, 0, 6, 0, Math.PI * 2); c.fillStyle = '#14171c'; c.fill(); c.stroke()
  c.fillStyle = on ? lite : '#5c6370'; c.strokeStyle = on ? lite : '#5c6370'
  if (d === 'hand') { c.fillRect(-2.5, -2.5, 5, 5) }                                                     // HAND: square palm
  else if (d === 'foot') { c.beginPath(); c.moveTo(-3, -3); c.lineTo(-3, 3); c.lineTo(3, 3); c.stroke() }  // FOOT: heel angle
  else { c.beginPath(); c.moveTo(-3.5, 3.5); c.lineTo(3.5, -3.5); c.stroke(); c.beginPath(); c.moveTo(-3.5, 1); c.lineTo(-1, 3.5); c.stroke() }   // BLADE
  c.restore()
}
function drawHud(c, f) {
  const [lite, deep] = cols(f), s = f._mmprWhite, cx = f.x + f.w / 2, y = f.y - 22
  const h = falconHud(f, NINJA_RESOURCE)
  if (h) {
    const locked = h.lockout > 0 || h.postUlt > 0 || !!h.active
    for (let i = 0; i < h.max; i++) {
      const x = cx - 40 + i * 14, fill = i < h.pips ? 1 : i === h.pips ? h.refill : 0
      c.save(); c.beginPath(); c.moveTo(x, y - 5); c.lineTo(x + 5, y); c.lineTo(x, y + 5); c.lineTo(x - 5, y); c.closePath()
      c.fillStyle = '#14171c'; c.globalAlpha = 0.85; c.fill()
      if (fill > 0) { c.save(); c.clip(); c.fillStyle = i < h.pips ? (locked ? deep : lite) : deep; c.globalAlpha = 1; c.fillRect(x - 5, y + 5 - 10 * fill, 10, 10 * fill); c.restore() }
      c.globalAlpha = 1; c.strokeStyle = lite; c.lineWidth = 1; c.stroke(); c.restore()
    }
  }
  if (!s) return
  if (s.token) {
    const x = cx + 10, k = s.token.t / FORMATION.tokenLife
    c.save(); c.translate(x + 12, y); c.fillStyle = lite; c.beginPath(); c.moveTo(0, -7); c.lineTo(7, 0); c.lineTo(0, 7); c.lineTo(-7, 0); c.closePath(); c.fill()
    c.strokeStyle = deep; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke()
    if (s.accept) { c.strokeStyle = lite; c.globalAlpha = 0.5 + 0.5 * (s.accept.t % 4 < 2); c.beginPath(); c.arc(0, 0, 14, 0, Math.PI * 2); c.stroke() }   // retap NOW
    c.restore()
  } else {
    const coll = s.coll, k = coll ? 1 - coll.t / FORMATION.window : 0
    ;['hand', 'foot', 'blade'].forEach((d, i) => glyph(c, d, cx + 2 + i * 15, y, !!coll?.[d], lite, deep))
    if (coll) { c.save(); c.strokeStyle = deep; c.lineWidth = 2; c.globalAlpha = 0.9; c.beginPath(); c.moveTo(cx - 5, y + 10); c.lineTo(cx - 5 + 44 * k, y + 10); c.stroke(); c.restore() }   // collection time left
  }
  if (s.leader) { c.save(); c.strokeStyle = lite; c.lineWidth = 2; c.globalAlpha = s.leader.t / 12; c.beginPath()
    c.moveTo(cx - 18, f.y + f.h + 6); c.lineTo(cx - 26, f.y + f.h + 12); c.moveTo(cx + 18, f.y + f.h + 6); c.lineTo(cx + 26, f.y + f.h + 12); c.stroke(); c.restore() }   // ⇐ ⇒ cue under the feet
}
// Ultimate rhythm (token-held entry): the discipline symbol flashes over Tommy as it leads its phase. Presentation only.
function drawUltRhythm(c, f) {
  const fr = f._mmprWhite?.ult?.frame, r = f._mmprWhite?.ult?.rhythm; if (fr == null || !r) return
  const [lite, deep] = cols(f)
  for (const [at, d] of [[18, 'hand'], [50, 'foot'], [160, 'blade']]) if (fr >= at && fr < at + 14) {
    const k = 1 - (fr - at) / 14; c.save(); c.globalAlpha = k; c.translate(f.x + f.w / 2, f.y - 40); c.scale(2.2, 2.2); glyph(c, d, 0, 0, true, lite, deep); c.restore()
  }
}
function drawBlink(c, f) {
  const b = f._ranger?.blink; if (!b || b.phase !== 'travel' || b.x1 == null) return
  const im = ownerArt(f, 'blink'); if (!im.complete || !im.naturalWidth) return
  const s = f.spriteScale || 1.85, w = 208 * s, h = 128 * s
  for (let i = 0; i < 3; i++) {
    const u = (i + 1) / 4, x = b.x0 + (b.x1 - b.x0) * u + f.w / 2
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = 0.18 + 0.12 * i; c.translate(x, f.y + f.h); if ((f.facing || 1) < 0) c.scale(-1, 1)
    c.drawImage(im, -104 * s, -118 * s, w, h); c.restore()
  }
}

export function drawMmprWhiteFx(c, f) {
  if (f?.rosterKey !== 'mmpr_white') return
  if (f.health > 0) { drawBlink(c, f); drawHud(c, f) }
  drawOrder(c, f)       // a committed order finishes its short scripted action even if Tommy is KO'd this frame (sim-owned)
  drawUltZord(c, f)
  drawUltRhythm(c, f)
}
// Cue playback (presentation only). No call / order / reward sound after defeat.
const AFTER_DEFEAT_MUTE = /^(call|order|ready|commit_|offer|accept|leader|formation|disc_|ult)/
export function playMmprWhiteCues(f) {
  const q = f?._mmprWhite?.cues; if (!q?.length) return
  for (const v of q) { if (f.health <= 0 && AFTER_DEFEAT_MUTE.test(v)) continue; try { sound.play('mmprwhite_' + v) } catch (_) {} }
  q.length = 0
}
export function preloadNinjaMegazord() { preloadZordCells(NINJA_CELLS) }
