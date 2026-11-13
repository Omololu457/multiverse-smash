// zoroFx.js — Roronoa Zoro RENDER-ONLY presentation (HUD badge, auras, afterimages, shockwave rings).
// Reads simulation state (fighter._zoro, timers) and never writes it. Image objects are presentation caches.
import { ZORO_FX } from './zoroSprites.js'

const _img = {}
function img(src) {
  if (typeof Image === 'undefined') return null
  let i = _img[src]; if (!i) { i = _img[src] = new Image(); i.src = src }
  return i.complete && i.naturalWidth ? i : null
}

// HUD: Going Merry badge pinned to the Spirit bar label (energy panel in ui.js).
export function drawZoroHud(ctx, fighter, { x, enY, pbw, flip }) {
  if (fighter?.rosterKey !== 'zoro') return
  const m = img(ZORO_FX.merry.sheet)
  const s = 22, bx = flip ? x + pbw - 52 : x + 50, by = enY - 25
  ctx.save()
  ctx.beginPath(); ctx.arc(bx + s / 2, by + s / 2, s / 2 + 2, 0, Math.PI * 2)
  ctx.fillStyle = '#16301c'; ctx.fill(); ctx.strokeStyle = '#3fa34d'; ctx.lineWidth = 1.5; ctx.stroke()
  if (m) {
    ctx.imageSmoothingEnabled = false
    const k = s / Math.max(m.width, m.height)
    if (flip) { ctx.translate(bx + s, by); ctx.scale(-1, 1); ctx.drawImage(m, 0, (s - m.height * k) / 2, m.width * k, m.height * k) }
    else ctx.drawImage(m, bx, by + (s - m.height * k) / 2, m.width * k, m.height * k)
  }
  ctx.restore()
}
