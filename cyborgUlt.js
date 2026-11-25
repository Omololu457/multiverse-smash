// cyborgUlt.js — Cyborg's ULTIMATE "BOOYAH PROTOCOL — FULL SYSTEMS IMPACT" as a full cinematic (2026-11-24, owner: "give
// every character their own special ultimate"). The sim stays cyborgState.js's frozen scene (same sonic opener, same 100
// Power, same contacts 40 + 3×20 + 40 + 110 raw through W.damage with the confirm's combo scale, Heat 60 after); the
// titansUltCore.js director wraps it with camera / sound access, hit-stop and authored pauses. Drawn by cyborgUltFx.js.
// BEATS (legacy frame L; ‖ = a held legacy frame while the beat plays):
//   BOOT        L0-41     letterbox; his cybernetic eye's HUD boots over the screen: "BOOYAH PROTOCOL", systems online
//   TARGET LOCK ‖L42 ×24  punch-in on the red eye — the lock brackets slam onto the foe, readouts scroll
//   SONIC       L44-69    the sonic cannon (40): rings of sound down the beam, the screen ripples
//   PAYLOAD     L70-109   three missiles (20 ×3) on smoke trails: "MISSILES AWAY"
//   THRUST      L110-149  rocket boost and the aerial punch (40): thruster fire, speed lines
//   FULL SYSTEMS‖L152 ×24 every system routes into the fist: power lines, the meter overloads 100 → 200 % — "BOO YEAH!"
//   IMPACT      L172      the Mega Punch (110): white frame, hit-stop 26, punch-in, a blue-white shock dome, "BOOYAH!"
//   THE POWER   L180-215  "That's the power!"
import { titanCine, titanLine } from './titansUltCore.js'
import { cyborgUltScene, updateCyborgUlt, clearCyborgUlt } from './cyborgState.js'
import { drawCyborgUltScreen, preloadCyborgUlt } from './cyborgUltFx.js'

export const CY = { lock: 42, lockN: 24, full: 152, fullN: 24, mega: 172 }

function beat(A, L, D) {
  const f = D.caster
  if (L === 0 && A.once('open')) { A.sfx('energy_tone_hold', 0.5); A.sfx('charge_hum_rise', 0.6); try { preloadCyborgUlt(f) } catch (_) {} }
  if ((L === 10 || L === 18 || L === 26) && A.once('boot' + L)) A.sfx('crack_sizzle_bright', 0.35)
  if (D.pauseAt === CY.lock) {
    if (D.pk === 1 && A.once('lock')) { A.sfx('sting_pitch_rise_hold', 0.7); A.sfx('swish_fast_02', 0.6) }
    if (D.pk === 14 && A.once('lock2')) { A.sfx('impact_crack_01', 0.7); A.sfx('energy_hum_low', 0.6); A.shake(4, 6) }
  }
  if (L === 44 && A.once('cannon')) { A.sfx('charge_swell_riser', 0.8); A.sfx('warp_wobble_01', 0.8); A.shake(6, 18) }
  if ((L === 72 || L === 80 || L === 88) && A.once('m' + L)) A.sfx('whoosh_medium_01', 0.7)
  if (L === 110 && A.once('boost')) { A.sfx('whoosh_medium_02', 0.9); A.sfx('rumble_tail_01', 0.5) }
  if (D.pauseAt === CY.full) {
    if (D.pk === 1 && A.once('full')) { A.sfx('charge_swell_riser', 1); A.sfx('energy_hum_low', 0.8); A.shake(5, 24) }
    if (D.pk === 12 && A.once('vo')) titanLine(f, 'ult', 0)   // "BOO YEAH!"
    if (D.pk === 20 && A.once('suck')) A.sfx('boom_anticipation_suck', 1)
  }
  if (L === 190 && A.once('end')) titanLine(f, 'ult', 2)   // "That's the power!"
}
function contact(A, i) {
  if (i === 0) { A.sfx('boom_medium_02', 0.9); A.sfx('warp_wobble_02', 0.7); A.shake(10, 14) }
  else if (i < 4) { A.sfx('boom_medium_01', 0.85); A.sfx('impact_hit_01', 0.6); A.shake(9, 10) }
  else if (i === 4) { A.sfx('hit_heavy_boom_01', 0.9); A.sfx('impact_crack_01', 0.7); A.shake(12, 14) }
  else { A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_01', 1); A.sfx('boom_huge_02_roar', 0.85); A.sfx('rumble_tail_01', 0.9); A.shake(24, 46) }
}
function camera(cam, D, L) {
  if (!cam?.focusOnFighter) return
  const f = D.caster, t = D.target
  if (D.hold > 0 && D.lastHit) { cam.focusOnFighter(t, D.lastHit.i === 5 ? 1.25 : 1.35); return }
  if (D.pauseAt === CY.lock && D.pk > 0) { cam.focusBetween?.(f, t, 1.3); return }
  if (D.pauseAt === CY.full && D.pk > 0) { cam.focusOnFighter(f, 1.7); return }
  if (L < 42) cam.focusOnFighter(f, 1.7)
  else if (L < 110) cam.focusBetween?.(f, t, 1.2)
  else if (L < 150) cam.focusBetween?.(f, t, 1.35)
  else if (L < 172) cam.focusOnFighter(f, 1.6)
  else cam.focusBetween?.(f, t, 1.05)
}
export const cyborgUltDirector = titanCine({
  id: 'cyborg_booyah', zoom: 1.85,
  scene: cyborgUltScene, update: updateCyborgUlt, clear: clearCyborgUlt,
  pauses: { [CY.lock]: CY.lockN, [CY.full]: CY.fullN },
  slow: L => (L >= 166 && L < 172 ? 3 : 1),
  stop: i => (i === 0 ? 9 : i < 4 ? 6 : i === 4 ? 9 : 26),
  beat, contact, camera,
  draw: drawCyborgUltScreen,
})
