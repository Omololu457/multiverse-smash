// greenArrowUlt.js — Green Arrow (green_arrow) ULTIMATE "ARROWSTORM PROTOCOL" given a real cinematic (2026-11-24, owner: "give every
// character an ultimate that actually looks like I put in time and effort into it — don't change what the ultimate does").
// The Arrowstorm itself is UNCHANGED: abilities.executeGreenArrowUltimate (cost 100, invuln, the drone volley, the 14-bomb CARPET,
// 4 HUNTERS, 3 SCATTER clusters, Oliver's explosive arrows, the LAST LIGHT 252 bomb, the 3 s Tech lockout) still runs every frame
// through applyGreenArrowArrowstorm — this module only (1) puts a FROZEN activation cinematic in front of it and (2) frames the live
// waves + the LAST LIGHT finisher with a render-only overlay that reads its state (abilities.js is never edited).
//   registerUltCast('green_arrow'): the legacy gates (super not running, no Tech lockout, 100 meter, free to act) → the freeze cine
//   plays; on its last frame it calls executeGreenArrowUltimate (which spends the 100 and starts the storm exactly as before).
// ACTIVATION (frozen, 128 f):
//   OVERWATCH ONLINE  0-36    letterbox; night-green grade; close on Oliver; the drone roster boots on a tactical HUD
//   TARGET LOCK      36-70    cut to the foe: reticle brackets collapse onto them, rangefinder ticks, LOCKED stamp
//   THE DRAW         70-102   back on Oliver: the bow comes up to the sky, string drawn, the arrowhead charges green
//   LOOSE            102      white frame → the flare arrow streaks up out of frame; ARROWSTORM PROTOCOL slams in;
//                    102-128  the Payload squadron crosses the sky behind the title — then the live storm takes over
// LIVE (overlay only, HUD stays): WAVE 1 · CARPET LINE / WAVE 2 · HUNTERS / WAVE 3 · SCATTER banners on a tactical frame;
//   LAST LIGHT: letterbox in, colour drains, a cyan reticle closes on the foe with a 3-2-1 countdown + push-in, then the 252 bomb
//   lands → white / inverted impact frame, shockwave rings, the damage, "THAT'S HOW YOU HIT A TARGET."
// Deterministic: the sim side only counts frames; every visual is a pure function of frames + state (render noise = int hash).
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { executeGreenArrowUltimate } from './abilities.js'
import { ctrX } from './bleachUltKit.js'
import { drawGreenArrowActivation, drawGreenArrowLive } from './greenArrowUltFx.js'

export const GA = { total: 128, lockAt: 36, drawAt: 70, looseAt: 102, cost: 100 }
const A = { on: false }
const L = { f: null }          // the live overlay's fighter (render reads only)
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const restore = () => { const f = A.f; if (f) { if (A.alpha0 == null) delete f._fxAlpha; else f._fxAlpha = A.alpha0 } }
const restoreCam = () => { const c = A.cam, s = A.camSaved; if (c && s) { c.maxZoom = s.maxZoom; c.maxZoomStep = s.maxZoomStep; c.maxPanStep = s.maxPanStep } }
const reset = () => { for (const k of Object.keys(A)) delete A[k]; A.on = false }

registerUltCast('green_arrow', (f, context) => {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'green_arrow') return undefined
  if (A.on) return false
  if (f._gaArrowstormActive || (f._gaTechLock || 0) > 0) return false                  // = the legacy gates
  if (!f.infiniteEnergy && (f.energy || 0) < GA.cost) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  const t = getOpp(f)
  if (!t || t.eliminated) return undefined
  Object.assign(A, { on: true, f, t, context, k: 0, real: 0, alpha0: f._fxAlpha, dir: ctrX(t) >= ctrX(f) ? 1 : -1, cam: null, camSaved: null })
  f.vx = 0; f.vy = 0; f.facing = A.dir; f.isBlocking = false; f.isCharging = false
  f._fxAlpha = 0                                                                             // the overlay draws Oliver himself
  for (const k of Object.keys(L)) delete L[k]
  L.f = f; L.t = t; L.seen = false
  return true
})

registerFreezeCine('green_arrow_arrowstorm_activation', {
  active: () => !!A.on,
  update(ctx = {}) {
    if (!A.on) return
    const f = A.f, t = A.t, cam = ctx.camera, k = A.k
    if (!f || !t || !(f.health > 0) || t.eliminated) { restore(); restoreCam(); reset(); return }   // KO / foe gone → end clean (no storm)
    if (cam && !A.cam) { A.cam = cam; A.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.8; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
    A.real++
    if (A.hold > 0) { A.hold--; return }
    f.vx = 0; f.vy = 0; f._fxAlpha = 0
    // sound script
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.7); sfx(ctx, 'sting_pitch_rise_hold', 0.45) }
    if (k >= 6 && k <= 30 && k % 6 === 0) sfx(ctx, 'impact_crack_01', 0.25)                 // the drone roster ticking online
    if (k === GA.lockAt) { sfx(ctx, 'whoosh_medium_02', 0.6); sfx(ctx, 'energy_tone_hold', 0.5) }
    if (k === GA.lockAt + 22) { sfx(ctx, 'crack_sizzle_bright', 0.7); cam?.shake?.(4, 6) }   // LOCKED
    if (k === GA.drawAt) { sfx(ctx, 'charge_swell_riser', 0.9); sfx(ctx, 'charge_hum_rise', 0.5) }
    if (k === GA.looseAt - 6) sfx(ctx, 'boom_anticipation_suck', 0.9)
    if (k === GA.looseAt) { sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'impact_frame_boom_long', 0.9); sfx(ctx, 'boom_medium_02', 0.7); cam?.shake?.(14, 18); A.hold = 6 }
    if (k === GA.looseAt + 10) sfx(ctx, 'rumble_tail_01', 0.8)
    // camera: Oliver → the foe → Oliver → wide for the squadron
    if (cam?.focusOnFighter) {
      if (k < GA.lockAt) cam.focusOnFighter(f, 1.45 + 0.2 * Math.min(1, k / GA.lockAt))
      else if (k < GA.drawAt) cam.focusOnFighter(t, 1.55)
      else if (k < GA.looseAt) cam.focusOnFighter(f, 1.6)
      else cam.focusBetween?.(f, t, 1.0)
    }
    if (++A.k > GA.total) finish()
  },
  clear() { if (!A.on) return; restore(); restoreCam(); reset() },
})
function finish() {
  const f = A.f, context = A.context
  restore(); restoreCam(); reset()
  if (!f) return
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0
  try { executeGreenArrowUltimate(f, context) } catch (_) {}                                 // the Arrowstorm, exactly as before
}

registerCineScreen('green_arrow_arrowstorm_activation', (ctx, canvas) => (A.on ? drawGreenArrowActivation(ctx, canvas, A, GA) : false))
registerCineScreen('green_arrow_arrowstorm_live', (ctx, canvas) => {
  const f = L.f
  if (!f || A.on) return false
  const s = f._gaArrowstormActive
  if (!s) { if (L.seen) for (const k of Object.keys(L)) L[k] = null; return false }
  L.seen = true
  return drawGreenArrowLive(ctx, canvas, f, s, L)
})
export const isGreenArrowUltActive = () => !!A.on
export const getGreenArrowUltStatus = () => ({ active: !!A.on, frame: A.k | 0, live: !!L.f?._gaArrowstormActive, phase: L.f?._gaArrowstormActive?.phase || null })
