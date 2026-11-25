// starfireUlt.js — Starfire's ULTIMATE "SUPERNOVA — EYES OF TAMARAN" as a full cinematic (2026-11-24, owner: "give every
// character their own special ultimate"). The sim stays starfireState.js's frozen scene (same starbolt opener, same 100
// Energy, same contacts 4×20 + 2×30 + 100 raw through W.damage with the confirm's combo scale); titansUltCore.js wraps it
// with camera / sound access, hit-stop and authored pauses. Drawn by starfireUltFx.js (screen pass).
// BEATS (legacy frame L; ‖ = a held legacy frame while the beat plays):
//   PRINCESS     L0-40     letterbox, push in; her hair blazes up like fire; the title cut-in
//   IGNITE       ‖L58 ×22  risen, both fists ignite — green starfire gathers into them, stars stream inward
//   BARRAGE      L60-119   the four starbolts (20 ×4) inside a storm of comet trails, each with a green impact frame
//   EYES         ‖L121 ×26 extreme close-up: her eyes flood green — "ZOAL!"
//   EYE-BEAMS    L134-171  twin beams (30 + 30), the screen tinted and shaking, bloom along the beams
//   SUPERNOVA    L172-191  everything she has collapses into the foe → contact 100: a green-white nova fills the screen,
//                          hit-stop 26, punch-in; star sparkles rain back down
//   TRIUMPH      L192-223  she drifts down: "Teen Titans triumph!"
import { titanCine, titanLine } from './titansUltCore.js'
import { starfireUltScene, updateStarfireUlt, clearStarfireUlt } from './starfireState.js'
import { drawStarfireUltScreen, preloadStarfireUlt } from './starfireUltFx.js'

export const SF = { ign: 58, ignN: 22, eyes: 121, eyesN: 26, nova: 176 }

function beat(A, L, D) {
  const f = D.caster
  if (L === 0 && A.once('open')) { A.sfx('charge_hum_rise', 0.6); A.sfx('whoosh_medium_01', 0.6); try { preloadStarfireUlt(f) } catch (_) {} }
  if (L === 16 && A.once('title')) A.sfx('swish_fast_02', 0.7)
  if (L === 40 && A.once('rise')) A.sfx('whoosh_medium_02', 0.7)
  if (D.pauseAt === SF.ign) {
    if (D.pk === 1 && A.once('ign')) { A.sfx('charge_swell_riser', 0.9); A.sfx('energy_hum_low', 0.6) }
    if (D.pk === 16 && A.once('ign2')) { A.sfx('crack_sizzle_bright', 0.7); A.shake(5, 8) }
  }
  if ((L === 62 || L === 74 || L === 86 || L === 98) && A.once('b' + L)) { A.sfx('swish_fast_01', 0.7); A.sfx('crack_sizzle_bright', 0.35) }
  if (D.pauseAt === SF.eyes) {
    if (D.pk === 1 && A.once('eyes')) { A.sfx('sting_pitch_rise_hold', 0.8); A.sfx('pitch_drop_slowmo', 0.6); titanLine(f, 'ult', 1) }   // "ZOAL!"
    if (D.pk === 18 && A.once('eyes2')) { A.sfx('energy_tone_hold', 0.7); A.shake(6, 10) }
  }
  if (L === 134 && A.once('beam')) { A.sfx('boom_medium_02', 0.9); A.sfx('energy_hum_low', 0.8); A.shake(8, 36) }
  if (L === 150 && A.once('beam2')) A.shake(8, 22)
  if (L === 168 && A.once('suck')) { A.sfx('boom_anticipation_suck', 1); A.sfx('charge_swell_riser', 0.8) }
  if (L === 200 && A.once('vo')) titanLine(f, 'titans', 0)   // "Teen Titans triumph!"
}
function contact(A, i) {
  if (i < 4) { A.sfx('impact_hit_01', 0.8); A.sfx('boom_medium_01', 0.55); A.shake(7 + i, 9) }
  else if (i < 6) { A.sfx('hit_heavy_boom_01', 0.9); A.sfx('crack_sizzle_bright', 0.7); A.shake(12, 14) }
  else { A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_01', 1); A.sfx('boom_huge_02_roar', 0.85); A.sfx('rumble_tail_01', 0.9); A.shake(24, 46) }
}
function camera(cam, D, L) {
  if (!cam?.focusOnFighter) return
  const f = D.caster, t = D.target
  if (D.hold > 0 && D.lastHit) { cam.focusOnFighter(t, D.lastHit.i === 6 ? 1.3 : 1.35); return }
  if (D.pauseAt === SF.ign && D.pk > 0) { cam.focusOnFighter(f, 1.55); return }
  if (D.pauseAt === SF.eyes && D.pk > 0) { cam.focusOnFighter(f, 1.8); return }
  if (L < 40) cam.focusOnFighter(f, 1.75)
  else if (L < 60) cam.focusOnFighter(f, 1.4)
  else if (L < 120) cam.focusBetween?.(f, t, 1.15)
  else if (L < 172) cam.focusBetween?.(f, t, 1.25)
  else if (L < 192) cam.focusOnFighter(t, 1.0)
  else cam.focusOnFighter(f, 1.35)
}
export const starfireUltDirector = titanCine({
  id: 'starfire_supernova', zoom: 1.85,
  scene: starfireUltScene, update: updateStarfireUlt, clear: clearStarfireUlt,
  pauses: { [SF.ign]: SF.ignN, [SF.eyes]: SF.eyesN },
  slow: L => (L >= 172 && L < 176 ? 3 : 1),
  stop: i => (i < 4 ? 6 : i < 6 ? 9 : 26),
  beat, contact, camera,
  draw: drawStarfireUltScreen,
})
