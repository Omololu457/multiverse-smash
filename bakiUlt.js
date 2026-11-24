// bakiUlt.js — Baki Hanma (baki) ULTIMATE "ONI NO SE — THE DEMON BACK" activation as a FROZEN CINEMATIC (2026-11-24 roster
// ultimate pass). The ultimate stays exactly what it is today — the timed empowered FORM (dmg ×1.30 / spd ×1.12, ~12 s,
// auto-revert), applied by the legacy abilities.executeBakiUltimate (called here, untouched) — but the activation, which
// was a 60-frame flex with a HUD label, becomes a cinematic:
//   registerUltCast('baki')   → cast(): runs executeBakiUltimate (same gates, same form, same cost / cooldown path) and,
//                               when it fires, starts the freeze.
//   registerFreezeCine('baki_oni') → game.js freezes combat / physics / input and calls update(ctx).
// BEATS (script frames k, 60 fps):
//   BREATH    0-34    letterbox in, a slow push on Baki; the knuckles crack; "I'll get even stronger."
//   TURN     34-70    he turns his back to the foe — the camera rides up his spine; the muscles knot and swell, red veins pulse
//   THE FACE 70-120   a full-screen close-up of the back: the muscles form a DEMON'S FACE, its eyes ignite; ONI NO SE title;
//                     heartbeat thumps shake the frame
//   ROAR    120       the demon "roars": red impact frames, a shockwave ring off his back, the foe flinches
//   AFTER   124-176   he turns back round in the flex pose, crimson aura crackling; a stat card (DMG ×1.3 · SPD ×1.12 · 12 s)
// No damage (it is a power-up, as today). SIM: pure function of the script frame. Render: bakiUltFx.js.
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { executeBakiUltimate } from './abilities.js'
import { clearInputBuffer } from './input.js'
import { drawBakiUltScreen, preloadBakiUlt, BAKI_T as T } from './bakiUltFx.js'

const VOICE = { a: 'baki_009.mp3', b: 'baki_004.mp3' }
const c = { active: false }
export const isBakiUltActive = () => !!c.active
export const bakiUltScene = () => (c.active ? c : null)
export const getBakiUltStatus = () => ({ active: !!c.active, frame: c.frame | 0, real: c.real | 0 })
const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)

function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'baki') return undefined
  if (c.active) return false
  const r = executeBakiUltimate(f, context)
  if (!r) return r
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  const t = getOpp(f)
  const dir = t ? (ctrX(t) >= ctrX(f) ? 1 : -1) : (f.facing || 1)
  Object.assign(c, { active: true, frame: 0, real: 0, caster: f, target: t || null, dir, floor: feet(f), tFloor: t ? feet(t) : feet(f),
    fx: ctrX(f), tx: t ? ctrX(t) : ctrX(f) + dir * 200, cam: null, camSaved: null, fAlpha0: f._fxAlpha, tAlpha0: t?._fxAlpha, tHit0: t ? t.hitstun : 0 })
  f.vx = 0; f.vy = 0; f.facing = dir
  if (t) { t.vx = 0; t.vy = 0 }
  f._fxAlpha = 0; if (t) t._fxAlpha = 0
  try { preloadBakiUlt(f, t) } catch (_) {}
  return r
}

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const voice = (ctx, file) => { try { ctx?.sound?.playSfxFile?.(file, null, { owner: c.caster }) } catch (_) {} }

function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster
  if (!f) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.9; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
  c.real++
  const k = c.frame
  if (k === 0) { sfx(ctx, 'impact_crack_01', 0.6); voice(ctx, VOICE.a) }
  if (k === 10) sfx(ctx, 'crack_sizzle_bright', 0.4)
  if (k === 22) voice(ctx, VOICE.b)
  if (k === T.turn) { sfx(ctx, 'whoosh_medium_01', 0.7); sfx(ctx, 'energy_hum_low', 0.7) }
  if (k === T.turn + 18) sfx(ctx, 'charge_hum_rise', 0.8)
  if (k === T.face) { sfx(ctx, 'sting_pitch_rise_hold', 0.8); sfx(ctx, 'boom_medium_02', 0.8); cam?.shake?.(6, 10) }
  if (k > T.face && k < T.roar && (k - T.face) % 16 === 4) { sfx(ctx, 'hit_heavy_boom_01', 0.4); cam?.shake?.(5, 6) }
  if (k === T.roar - 6) sfx(ctx, 'boom_anticipation_suck', 0.9)
  if (k === T.roar) { sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'impact_frame_boom_long', 0.8); cam?.shake?.(18, 30) }
  if (k === T.roar + 10) sfx(ctx, 'rumble_tail_01', 0.8)
  place()
  if (cam?.focusOnFighter) {
    if (k < T.turn) cam.focusOnFighter(f, 1.5)
    else if (k < T.roar) cam.focusOnFighter(f, 1.85)
    else if (c.target) cam.focusBetween?.(f, c.target, 1.25)
    else cam.focusOnFighter(f, 1.3)
  }
  if (++c.frame > T.total) finish()
}
function place() {
  const f = c.caster, t = c.target
  f.x = Math.round(c.fx - (f.w || 48) / 2); f.y = c.floor - (f.h || 94); f.vx = 0; f.vy = 0; f.onGround = true; f.grounded = true; f.facing = c.dir; f._fxAlpha = 0
  f._juiceAttackTrail = false; f._juiceDashTrail = false; f._juiceTrailBuf = null
  if (t) { t.vx = 0; t.vy = 0; t._fxAlpha = 0; t._juiceAttackTrail = false; t._juiceDashTrail = false; t._juiceTrailBuf = null }
}
function restore() {
  const f = c.caster, t = c.target, cam = c.cam, sv = c.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
  if (f) { if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0 }
  if (t) { if (c.tAlpha0 == null) delete t._fxAlpha; else t._fxAlpha = c.tAlpha0 }
}
function finish() {
  const f = c.caster
  if (f) { try { clearInputBuffer(f) } catch (_) {} f.vx = 0; f.vy = 0 }
  restore(); reset()
}
const reset = () => { for (const key of Object.keys(c)) delete c[key]; c.active = false }
export function clear() { if (!c.active) return; restore(); reset() }
export const clearBakiUlt = clear

registerUltCast('baki', cast)
registerFreezeCine('baki_oni', { active: isBakiUltActive, update, clear })
registerCineScreen('baki_oni', (ctx, canvas) => drawBakiUltScreen(ctx, canvas, bakiUltScene()))
