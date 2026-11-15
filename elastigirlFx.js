// Elastigirl (elastigirl) — RENDER-ONLY: the Slingshot arm line to its anchor, the Parachute ground shadow (the sheet's
// grey shadow ovals), splash droplets for the Family Raft, cue playback (sound bus + screen shake). Reads sim state
// (f._elastigirl, the pendulum fields), never writes it — except draining the one-shot cue queue it consumes.
// No Math.random: droplet variation = hash(serial, index). Images cached once per URL.
import { sound } from './sound.js'
import { camera } from './camera.js'
import { juiceSettings } from './juiceSettings.js'
import { ELASTIGIRL_FX_CELLS as XC } from './elastigirlSprites.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
const ready = im => im && im.complete && im.naturalWidth > 0
export const elastigirlFxCacheSize = () => cache.size
const isEg = f => f?.rosterKey === 'elastigirl'
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const feet = f => (f.y || 0) + (f.h || 94)
const hash = (a, b = 0) => { let h = (Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const calm = () => !!(juiceSettings.reduceMotion || juiceSettings.reduceFlashing)
// skin-aware suit colour for the drawn arm (the sprite's own red, or the active skin's body colour)
const ARM = { default: ['#d8201c', '#101010'] }
export function setElastigirlArmColors(map) { Object.assign(ARM, map) }
const armOf = f => ARM[f.skinId] || ARM.default

// render-side transient effects (splashes) — NOT game state; capped
const splashes = new WeakMap()
const splashList = f => { let l = splashes.get(f); if (!l) { l = []; splashes.set(f, l) } return l }

export function drawElastigirlFx(c, f) {
  if (!isEg(f) || !c) return
  const s = f._elastigirl
  // SLINGSHOT: the stretched arm from her grip up to the anchor point (+ a small hand at the anchor)
  if (s?.sling && f._swinging) {
    const [suit, glove] = armOf(f), gx = ctrX(f), gy = f.y + (f.h || 94) * 0.30
    c.save(); c.lineCap = 'round'
    c.strokeStyle = suit; c.lineWidth = 6; c.beginPath(); c.moveTo(gx, gy); c.lineTo(f._swAX, f._swAY); c.stroke()
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(gx, gy + 2); c.lineTo(f._swAX, f._swAY + 2); c.stroke()
    c.fillStyle = glove; c.beginPath(); c.arc(f._swAX, f._swAY, 6, 0, Math.PI * 2); c.fill()
    c.restore()
  }
  // PARACHUTE: the supplied shadow ovals on the floor, largest → smallest as she rises
  const domeHop = f.attacking && ['eDome', 'eDomeSlam'].includes(f.currentAttack?.eg?.key)
  if ((s?.para || domeHop) && f.groundY != null) {
    const h = Math.max(0, f.groundY - feet(f)), i = Math.min(5, Math.floor(h / 40)), C = XC['r4s_' + (i + 1)], im = C && image(C.src)
    if (ready(im)) { c.save(); c.imageSmoothingEnabled = false; const sc = 1.9; c.drawImage(im, Math.round(ctrX(f) - C.w * sc / 2), Math.round(f.groundY - C.h * sc / 2), Math.round(C.w * sc), Math.round(C.h * sc)); c.restore() }
  }
  // RAFT splashes
  const l = splashes.get(f)
  if (l?.length) {
    c.save()
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i]; p.t++
      if (p.t > 30) { l.splice(i, 1); continue }
      for (let k = 0; k < 10; k++) {
        const ang = Math.PI * (1.05 + 0.9 * hash(p.id, k)), sp = 3 + 5 * hash(p.id, k + 40), x = p.x + Math.cos(ang) * sp * p.t, y = p.y + Math.sin(ang) * sp * p.t + 0.25 * p.t * p.t
        c.globalAlpha = Math.max(0, 1 - p.t / 30); c.fillStyle = k % 3 ? '#7fc8f8' : '#e8f6ff'
        c.fillRect(Math.round(x), Math.round(y), 4, 4)
      }
    }
    c.restore()
  }
}

let splashSeq = 0
export function playElastigirlCues(f) {
  const q = f?._elastigirl?.cues; if (!q?.length) return
  for (const v of q) {
    if (v === 'splash' || v === 'raft') { const l = splashList(f); l.push({ id: ++splashSeq, x: ctrX(f) + (f.facing || 1) * 60, y: feet(f) - 10, t: 0 }); if (l.length > 6) l.shift() }
    if (v === 'splash' && !calm()) camera.shake?.(6, 8)
    if (v === 'raftEnd' && !calm()) camera.shake?.(10, 12)
    try { sound.play('elastigirl_' + v) } catch (_) {}
  }
  q.length = 0
}
