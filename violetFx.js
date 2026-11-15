// Violet Parr (violet) — RENDER ONLY. Reads f._violet / currentAttack.vi, never writes sim state. Every visual is a supplied
// sheet strip (docs/violet/SPRITE_LEDGER.md): R14 push ring, R15 dome, R10 shell, R8 trap bubble, R13 hit rings.
// Flicker / jitter / flash phases come from the sim tick (deterministic, no RNG) and are presentation only.
// Reduced effects (juiceSettings.reduceFlashing / reduceMotion) → no flash, no jitter.
import { juiceSettings } from './juiceSettings.js'
import { VIOLET_FX } from './violetSprites.js'
import { MOVES, SCALE, TRAP, ULT } from './violetData.js'

const cache = new Map()
function image(url) { if (!cache.has(url)) { const im = new Image(); im.src = url; cache.set(url, im) } return cache.get(url) }
if (typeof Image !== 'undefined') for (const k in VIOLET_FX) image(VIOLET_FX[k].sheet)   // preload: first use must draw (no pop-in)
const calm = () => !!(juiceSettings?.reduceMotion || juiceSettings?.reduceFlashing)
const isV = f => f?.rosterKey === 'violet' && !!f._violet
const ctrX = f => (f.x || 0) + (f.w || 48) / 2
const ctrY = f => (f.y || 0) + (f.h || 94) / 2
// Skin FX tint (Phase 7 fills VIOLET_FX_TINT per skin tag; default = the sheet's own colours).
export const VIOLET_FX_TINT = {}
const tintOf = f => VIOLET_FX_TINT[f?._recolorTag || f?.skinId] || null
// Skin-specific strip folder (Phase 7: ./assets/violet/skins/<tag>/fx/*.png), else the default strips.
const fxUrl = (f, k) => { const t = tintOf(f); return t?.dir ? `${t.dir}/${k}.png` : VIOLET_FX[k].sheet }

function strip(c, f, k, i, x, y, sc = SCALE, flip = false, alpha = 1, rot = 0) {
  const C = VIOLET_FX[k], im = image(fxUrl(f, k)); if (!C || !im.complete || !im.naturalWidth) return
  const n = C.frames, fr = ((i % n) + n) % n
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false
  c.translate(Math.round(x), Math.round(y)); if (rot) c.rotate(rot); c.scale(flip ? -sc : sc, sc)
  c.drawImage(im, fr * C.width, 0, C.width, C.height, -C.originX, -C.originY, C.width, C.height)
  c.restore()
}
function ring(c, x, y, r, col, a, dash = null, lw = 3) {
  c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = lw; if (dash) c.setLineDash(dash)
  c.beginPath(); c.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2); c.stroke(); c.restore()
}
const ringCol = f => tintOf(f)?.ring || '#b77cff'

export function drawVioletFx(c, f) {
  if (!isV(f) || !c) return
  const s = f._violet, a = f.attacking && f.currentAttack?.vi ? f.currentAttack : null, tick = s.tick
  const inv = s.inv ? 0.35 : 1
  if (a) {
    const k = a.vi.key, md = MOVES[k], e = a.total - a.timer, dir = a.vi.dir
    if (k === 'vShield' && e >= md.startup && e < md.startup + md.active) {          // R15 dome, grows in then pulses
      const i = Math.min(5, Math.floor((e - md.startup) / 3)), pulse = calm() ? 0 : Math.sin(tick * 0.5) * 0.04
      strip(c, f, 'dome', i, ctrX(f), ctrY(f), SCALE * (1 + pulse), false, 0.85 * inv)
    }
    if (k === 'vBall' && e < md.startup + md.active) {                                // R10 shell around the R17 curl
      strip(c, f, 'shell', Math.floor(e / 3), ctrX(f), f.y + (f.h || 94) * 0.62, SCALE * 0.9, dir < 0, 0.9 * inv)
    }
    if ((k === 'heavy' || k === 'light' || k === 'vLow' || k === 'air') && e >= md.startup && e <= md.startup + md.active + 4) {
      const bx = ctrX(f) + dir * ((f.w || 48) / 2 + (md.rangeX || 34) * 0.6), by = f.y + (k === 'vLow' ? (f.h || 94) * 0.8 : (f.h || 94) * 0.35)
      const sc = k === 'heavy' ? SCALE * 0.7 : SCALE * 0.4
      strip(c, f, 'hit', Math.floor((e - md.startup) / 2), bx, by, sc, dir < 0, 0.85 * inv)   // R13 force ring at the palm
    }
    if (k === 'up' && e >= md.startup && e <= md.startup + md.active + 6) {          // upward R13 burst
      strip(c, f, 'hit', Math.floor((e - md.startup) / 2), ctrX(f) + dir * 30, f.y - 6, SCALE * 0.6, false, 0.85 * inv, -Math.PI / 2 * dir)
    }
    if (k === 'vPush' && e < md.startup) ring(c, ctrX(f) + dir * 34, f.y + (f.h || 94) * 0.45, 6 + e * 2, ringCol(f), 0.7 * inv)
    if (k === 'vUlt' && e < md.startup) ring(c, ctrX(f), ctrY(f), 70 - e * 4, ringCol(f), 0.8, null, 4)
  }
  if (s.pshield > 0) strip(c, f, 'dome', Math.min(5, 30 - s.pshield), ctrX(f), ctrY(f), SCALE, false, Math.min(1, s.pshield / 8) * 0.9 * inv)   // Protective Instinct
  if (s.push) strip(c, f, 'push', Math.floor(s.push.trav / 26), s.push.x, s.push.y, SCALE * 0.8, s.push.dir < 0, 0.95)
  const T = s.trap
  if (T) {
    if (T.st === 'form') {                                                            // telegraph: shrinking dashed circle + crosshair
      const k = T.t / TRAP.delay
      ring(c, T.x, T.y, TRAP.r * (2 - k), ringCol(f), 0.5 + 0.4 * k, [8, 6], 3)
      if (!calm() || T.t % 2 === 0) ring(c, T.x, T.y, 6, ringCol(f), 0.9, null, 2)
      if (T.t >= TRAP.delay - 6) strip(c, f, 'trap', T.t - (TRAP.delay - 6), T.x, T.y, SCALE * 0.75, false, 0.7)
    } else if (T.st === 'hold') strip(c, f, 'trap', 3 + (Math.floor(T.t / 6) % 3), T.x, T.y, SCALE * 0.75, false, 0.9)
    else strip(c, f, 'hit', Math.floor(T.t / 4), T.x, T.y, SCALE * 0.75, false, 1 - T.t / (TRAP.fizzle + 1))
  }
  const U = s.ult
  if (U && U.st !== 'done') {
    if (U.st === 'trap' || U.st === 'squeeze') {
      const sq = U.st === 'squeeze' ? 1 - 0.25 * Math.min(1, (U.t - ULT.squeezeAt) / (ULT.blastAt - ULT.squeezeAt)) : 1
      const j = calm() || U.st !== 'squeeze' ? 0 : ((tick % 3) - 1) * 2
      strip(c, f, 'trap', 3 + (Math.floor(U.t / 5) % 3), U.x + j, U.y, SCALE * 0.85 * sq, false, 0.95)
    } else if (U.st === 'blast') {
      const bt = U.t - ULT.blastAt, j = calm() ? 0 : Math.max(0, 6 - bt) * ((tick % 2) ? 1 : -1)
      strip(c, f, 'dome', Math.min(5, Math.floor(bt / 3)), U.x + j, U.y, SCALE * (1.6 + bt * 0.03), false, Math.max(0, 1 - bt / 40))
      ring(c, U.x, U.y, ULT.blastR * (0.5 + bt / 30), ringCol(f), Math.max(0, 0.8 - bt / 40), null, 6)
    }
  }
  const H = s.lastHit
  if (H && tick - H.tick < 10 && H.kind !== 'trap') strip(c, f, 'hit', Math.floor((tick - H.tick) / 3), H.x, H.y, SCALE * (H.kind === 'blast' ? 1.2 : 0.55), false, 0.9)
}

// Screen-space: FULL FORCE detonation flash (render-only; skipped under reduced flashing).
export function drawVioletScreen(c, cv, p1, p2) {
  if (!c || juiceSettings?.reduceFlashing) return
  for (const f of [p1, p2]) {
    const U = isV(f) && f._violet.ult; if (!U || U.st !== 'blast') continue
    const bt = U.t - ULT.blastAt; if (bt > 14) continue
    c.save(); c.globalAlpha = Math.max(0, 0.55 - bt * 0.04); c.fillStyle = tintOf(f)?.flash || '#e9d8ff'
    c.fillRect(0, 0, cv?.width || 1280, cv?.height || 720); c.restore()
  }
}
