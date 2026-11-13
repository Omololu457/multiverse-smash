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

// World-space FX, drawn after the fighter sprite (game.js render list). Pulses derive from the sim clock
// (deterministic visuals); nothing here touches simulation state.
export function drawZoroFx(c, f) {
  if (!c || f?.rosterKey !== 'zoro' || !f._zoro) return
  const s = f._zoro, w = f.w ?? 48, h = f.h ?? 100, cx = f.x + w / 2, cy = f.y + h * 0.55
  // SANTORYU: faint green-white aura (no palette shift).
  if (s.santoryu) {
    const t = s.clock || 0, pulse = 0.5 + 0.5 * Math.sin(t * 0.12)
    const fade = Math.min(1, s.santoryuTimer / 60)   // fades out over the last second
    c.save(); c.globalCompositeOperation = 'lighter'
    const g = c.createRadialGradient(cx, cy, h * 0.15, cx, cy, h * 0.85)
    g.addColorStop(0, `rgba(220,255,225,${0.10 * fade})`)
    g.addColorStop(0.6, `rgba(90,200,110,${(0.10 + 0.06 * pulse) * fade})`)
    g.addColorStop(1, 'rgba(90,200,110,0)')
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, w * 1.15, h * 0.8, 0, 0, Math.PI * 2); c.fill()
    c.globalAlpha = 0.35 * fade; c.strokeStyle = '#e8ffe9'; c.lineWidth = 1.5
    for (let k = 0; k < 3; k++) {   // three faint rising wisps (one per sword)
      const ph = (t * 0.05 + k / 3) % 1, wx = cx + (k - 1) * w * 0.45
      c.beginPath(); c.moveTo(wx, f.y + h); c.quadraticCurveTo(wx + Math.sin(t * 0.1 + k) * 8, f.y + h * (1 - ph), wx, f.y + h * (0.9 - ph * 0.9)); c.stroke()
    }
    c.restore()
  }
}
