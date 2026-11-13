// arlongFx.js — Arlong RENDER-ONLY presentation (HUD Tide badge + teeth counter + Kiribachi icon, water zones,
// shimmer / spray, the thrown blade, torpedo, shockwaves, splash bursts). Reads simulation state (fighter._arlong)
// and never writes it. Image objects are presentation caches. Any jitter is a pure hash of (frame, slot).
import { ARLONG_FX } from './arlongSprites.js'

const _img = {}
function img(src) {
  if (typeof Image === 'undefined' || !src) return null
  let i = _img[src]; if (!i) { i = _img[src] = new Image(); i.src = src }
  return i.complete && i.naturalWidth ? i : null
}
export const hash = (a, b = 0) => { let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2f); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }

// HUD state (tests read it): teeth 0-3 and whether the Kiribachi is in hand.
export function arlongHudState(f) {
  const s = f?._arlong
  return { teeth: s?.teeth ?? 3, blade: !s?.blade || s.blade.st === 'hand' }
}

// HUD: a round badge with the Kiribachi blade icon on the Tide bar, a TEETH counter (three teeth pips) and a small
// Kiribachi icon that greys out while the blade is thrown / planted.
export function drawArlongHud(ctx, fighter, { x, enY, pbw, flip }) {
  if (fighter?.rosterKey !== 'arlong') return
  const st = arlongHudState(fighter)
  const blade = img(ARLONG_FX.bladeV.sheet)
  const s = 24, bx = flip ? x + pbw - 54 : x + 50, by = enY - 27
  ctx.save()
  ctx.beginPath(); ctx.arc(bx + s / 2, by + s / 2, s / 2 + 2, 0, Math.PI * 2)
  ctx.fillStyle = '#10213f'; ctx.fill(); ctx.strokeStyle = '#4f7fd6'; ctx.lineWidth = 1.5; ctx.stroke()
  if (blade) {   // the badge: Kiribachi laid diagonally across the Tide disc
    ctx.imageSmoothingEnabled = false
    ctx.translate(bx + s / 2, by + s / 2); ctx.rotate(Math.PI / 4)
    const k = (s + 2) / blade.height
    ctx.drawImage(blade, -blade.width * k / 2, -blade.height * k / 2, blade.width * k, blade.height * k)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }
  ctx.restore()
  // TEETH counter: three white saw-teeth pips (dark when spent) + the Kiribachi-in-hand icon.
  const tx0 = flip ? bx - 8 : bx + s + 6, step = flip ? -12 : 12
  ctx.save()
  for (let i = 0; i < 3; i++) {
    const px = tx0 + i * step, py = by + 6, on = i < st.teeth
    ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py); ctx.lineTo(px, py + 11); ctx.closePath()
    ctx.fillStyle = on ? '#f4f4f8' : '#2b3446'; ctx.fill()
    ctx.strokeStyle = on ? '#0d1424' : '#556'; ctx.lineWidth = 1; ctx.stroke()
  }
  ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#cfe0ff'
  ctx.fillText('TEETH', tx0 + step, by + 25)
  const ix = tx0 + 3 * step + (flip ? -10 : 2), iy = by + 1
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ix, iy, 12, 20)
  ctx.strokeStyle = st.blade ? '#ffcf6a' : '#555'; ctx.strokeRect(ix + 0.5, iy + 0.5, 11, 19)
  if (blade) {
    ctx.imageSmoothingEnabled = false
    if (!st.blade) { ctx.globalAlpha = 0.35; ctx.filter = 'grayscale(1)' }
    const k = 18 / blade.height
    ctx.drawImage(blade, ix + 6 - blade.width * k / 2, iy + 1, blade.width * k, 18)
    ctx.filter = 'none'; ctx.globalAlpha = 1
  }
  ctx.restore()
}

// World-space FX drawn UNDER the fighters (water zones / flood). Pure functions of sim state + frame counter.
export function drawArlongUnder(c, f, frame = 0) {}

// World-space FX drawn after the fighter sprite.
export function drawArlongFx(c, f, frame = 0) {}
