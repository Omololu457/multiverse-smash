// victoryArt.js — the result screen shows WHO won (2026-11-25 polish pass): the winner's portrait, big, in the margin on their
// side of the stats panel (p1 left / p2 right) with a soft side glow, and the loser's small greyed portrait opposite.
// A matchflow VICTORY_ART provider (render-only; reads victoryState.winnerKey / loserKey set by game.js).
import { VICTORY_ART } from './matchflow.js'
import { characters } from './characters.js'

const IMG = new Map()
function portrait(key) {
  const src = characters[key]?.portrait
  if (!src) return null
  if (!IMG.has(src)) { const im = new Image(); im.src = src; IMG.set(src, im) }
  const im = IMG.get(src)
  return im.complete && im.naturalWidth > 0 ? im : null
}
const SKIP = new Set(['dinothunder'])   // Dino Thunder already paints its BOSS KILLED art in that margin
VICTORY_ART.push((ctx, canvas, st) => {
  const cw = canvas.width, ch = canvas.height, side = st.winnerSide
  if (side !== 'p1' && side !== 'p2') return
  const statW = Math.min(560, cw * 0.7), margin = (cw - statW) / 2
  if (margin < 150) return                                   // narrow / phone screens: no room beside the stats
  const a = Math.max(0, Math.min(1, st.fadeAlpha ?? 1))
  const draw = (key, left, big) => {
    const im = portrait(key); if (!im) return
    const maxW = margin - 40, maxH = ch * (big ? 0.5 : 0.24)
    const k = Math.min(maxW / im.naturalWidth, maxH / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k
    const cx = left ? margin / 2 : cw - margin / 2, cy = ch * (big ? 0.6 : 0.62)
    ctx.save()
    if (big) {
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75)
      g.addColorStop(0, side === 'p1' ? 'rgba(56,189,248,0.28)' : 'rgba(248,113,113,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g; ctx.fillRect(cx - w, cy - h, w * 2, h * 2)
    } else ctx.filter = 'grayscale(1) brightness(0.55)'
    ctx.globalAlpha *= big ? a : a * 0.7
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h)
    ctx.restore()
  }
  if (st.winnerKey && !SKIP.has(st.winnerKey)) draw(st.winnerKey, side === 'p1', true)
  if (st.loserKey && !SKIP.has(st.loserKey) && st.loserKey !== st.winnerKey) draw(st.loserKey, side !== 'p1', false)
})
