// clonechoreoFx.js — RENDER-ONLY layer of the shared clone choreography (clonechoreo.js) for the Naruto-universe five.
// Draws: the chakra ring running into the hand sign, the pop (smoke strip / Tobirama rising out of his own water cells /
// the wood clone growing from Hashirama's clone-cast cells), the exit (smoke / collapse back into water / splinters),
// the per-clone tilt ("break the copy") and a small camera punch on the unison strike. Reads CC_FX + ghost-body fields;
// never writes anything the sim reads. Sprite art: only sheets already in the project (CLONE_SHEETS).
import { CC_FX, CLONE_SHEETS, CLONE_STYLE } from './clonechoreo.js'
import { GLOBAL_SPRITE_SCALE } from './sprite.js'
import { juiceSettings } from './juiceSettings.js'
import { triggerShake } from './effects.js'

const cache = new Map()
const image = src => { let im = cache.get(src); if (!im) { im = new Image(); im.src = src; cache.set(src, im) } return im }
const ready = im => im && im.complete && im.naturalWidth > 0
for (const S of Object.values(CLONE_SHEETS)) image(S.sheet)   // preload with the game (the first pop must not miss its cells)
const calm = () => !!(juiceSettings?.reduceMotion || juiceSettings?.reduceFlashing)
const SMOKE_FILTER = { white: 'grayscale(1) brightness(1.55) contrast(1.1)', small: 'grayscale(1) brightness(1.3)', dark: 'grayscale(1) brightness(0.42) contrast(1.4)' }

// a ghost body, tilted about its feet (break the copy); hidden while its water / wood arrival frames play
export function drawCloneGhost(ctx, g, render) {
  if (g._ccHide) return
  const deg = g._ccTilt && (g._ccPhase === 'hold' || g._ccPhase === 'fan' || g._ccPhase === 'pop') ? g._ccTilt : 0
  if (!deg) { render(g); return }
  const px = g.x + (g.w || 0) / 2, py = g.y + (g.h || 0)
  ctx.save(); ctx.translate(px, py); ctx.rotate(deg * Math.PI / 180); ctx.translate(-px, -py)
  try { render(g) } finally { ctx.restore() }
}

function cell(ctx, S, i, x, feet, scale, dir, alpha = 1, filter = null) {
  const im = image(S.sheet); if (!ready(im)) return
  const sx = S.cells[i] * S.w + (S.cropX || 0), sw = S.w - (S.cropX || 0)
  const w = sw * scale, h = S.h * scale
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha *= alpha
  if (filter) { try { ctx.filter = filter } catch (_) {} }
  ctx.translate(Math.round(x), Math.round(feet)); if (dir < 0) ctx.scale(-1, 1)
  ctx.drawImage(im, sx, 0, sw, S.h, -w / 2, -h, w, h)
  ctx.restore()
}

// every CC_FX event, aged one step per drawn frame
export function drawCloneFx(ctx) {
  for (let i = CC_FX.length - 1; i >= 0; i--) {
    const e = CC_FX[i], S = CLONE_STYLE[e.style] || {}, sc = (e.scale || 1) * GLOBAL_SPRITE_SCALE
    const len = Math.max(1, e.len || 10), u = e.t / len
    if (e.k === 'ring') {   // chakra ring converging into the hand sign
      const col = e.kurama ? (S.ringKurama || S.ring) : S.ring, r = 70 * (1 - u) + 6
      ctx.save(); ctx.globalAlpha = calm() ? 0.5 : 0.9 * (1 - u * 0.6)
      if (S.ringCore) { ctx.strokeStyle = S.ringCore; ctx.lineWidth = 7; ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke() }
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha *= 0.5; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 0.6, r * 0.33, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.restore()
    } else if (e.k === 'pop' || e.k === 'exit') {
      const kind = e.kind
      if (kind === 'water' || (kind === 'splash' && e.style === 'tobirama')) {
        const W = e.k === 'pop' ? CLONE_SHEETS.waterRise : CLONE_SHEETS.waterFall
        const n = W.cells.length, k = Math.min(n - 1, Math.floor(u * n))
        cell(ctx, W, kind === 'splash' ? n - 1 - Math.min(n - 1, k) + 0 : k, e.x, e.y, sc, e.dir || 1, kind === 'splash' ? 0.7 * (1 - u) : (e.k === 'exit' && u > 0.75 ? (1 - u) * 4 : 1))
      } else if (kind === 'wood' || (kind === 'splash' && e.style === 'hashirama')) {
        const W = e.k === 'pop' ? CLONE_SHEETS.woodGrow : CLONE_SHEETS.woodSplinter
        const n = W.cells.length, k = Math.min(n - 1, Math.floor(u * n))
        cell(ctx, W, k, e.x, e.y, sc * (e.k === 'exit' ? 0.62 : 1), e.dir || 1, kind === 'splash' ? 0.6 * (1 - u) : (e.k === 'exit' && u > 0.8 ? (1 - u) * 5 : 1))
      } else {   // smoke (Naruto white / Sasuke small / Madara heavy dark) — the project's smoke strip, recoloured
        const W = CLONE_SHEETS.smoke, n = W.cells.length, k = Math.min(n - 1, Math.floor(u * n))
        const big = (e.kurama ? (S.poofKurama || S.poof) : S.poof) || 1
        cell(ctx, W, k, e.x, e.y + 6, 0.75 * big * (e.scale ? Math.min(1.6, e.scale / 1.6) : 1), 1, 0.95 * (1 - u * 0.5), SMOKE_FILTER[S.smoke] || SMOKE_FILTER.white)
      }
    } else if (e.k === 'strike') {   // the unison strike: a tight flash + a small camera punch
      if (e.t === 0 && !calm()) triggerShake?.(3, 6)
      ctx.save(); ctx.globalAlpha = 0.6 * (1 - u); ctx.strokeStyle = S.ring || '#fff'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(e.x, e.y, 18 + 40 * u, 0, Math.PI * 2); ctx.stroke(); ctx.restore()
    }
    e.t++
    if (e.t > len) CC_FX.splice(i, 1)
  }
}
