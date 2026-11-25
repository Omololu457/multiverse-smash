// ravenUlt.js — Raven's ULTIMATE "AZARATH METRION ZINTHOS — SOUL-SELF" as a full cinematic (2026-11-24, owner: "give every
// character their own special ultimate"). The sim stays ravenState.js's frozen scene (same opener, same 100 Energy, same
// contacts 40 + 40 + 160 raw through W.damage with the confirm's combo scale); titansUltCore.js wraps it so the scene
// gets camera / sound access, hit-stop and authored pauses. Drawn by ravenUltFx.js (screen pass).
// BEATS (legacy frame L; ‖ = a held legacy frame while the beat plays):
//   SUMMON       L0-40     letterbox, the room goes dark, push in on her face; shadow tendrils crawl to her feet; title cut-in
//   "AZARATH"    ‖L41 ×20  she lifts off the floor in a black aura — the first word of the chant slams in
//   "METRION"    ‖L76 ×18  two piles of the room torn up and wrapped in her power — the second word
//   THE ROOM     L80-111   both piles hurled (40 + 40): violet impact frames, hit-stop, shake
//   "ZINTHOS!"   ‖L128 ×70 the soul-self tears out of her: a giant raven rises, wings blotting out the stage (pull out),
//                          screeches, dives and wraps the foe in its wings — a sphere of darkness with its eyes glaring
//   THE DARK     L128-175  inside the dark the sphere crushes three times while she holds the shell
//   RELEASE      L176-180  slow-motion; the sphere implodes → contact 160: inverted frame, the raven bursts out and up,
//                          shock rings, hit-stop 26 with a punch-in on the foe, the damage slammed in
//   AFTER        L181-209  feathers fall, the dark lifts: "Azarath. Metrion. Zinthos."
import { titanCine, titanLine } from './titansUltCore.js'
import { ravenUltScene, updateRavenUlt, clearRavenUlt } from './ravenState.js'
import { drawRavenUltScreen, preloadRavenUlt } from './ravenUltFx.js'

export const RV = { p1: 41, p1n: 20, p2: 76, p2n: 18, p3: 128, p3n: 70, rise: 10, dive: 34, wrap: 52, release: 180, slow: [176, 181] }

function beat(A, L, D) {
  const f = D.caster
  if (L === 0 && A.once('open')) { A.sfx('energy_hum_low', 0.75); A.sfx('warp_wobble_01', 0.5); A.sfx('pitch_drop_slowmo', 0.5); try { preloadRavenUlt(f) } catch (_) {} }
  if (L === 18 && A.once('title')) { A.sfx('swish_fast_02', 0.7); A.sfx('sting_pitch_rise_hold', 0.5) }
  if (D.pauseAt === RV.p1 && D.pk === 1 && A.once('w1')) { A.sfx('boom_medium_01', 0.7); A.sfx('charge_hum_rise', 0.6); A.shake(5, 10) }
  if (D.pauseAt === RV.p2 && D.pk === 1 && A.once('w2')) { A.sfx('boom_medium_02', 0.75); A.sfx('energy_tone_hold', 0.5); A.shake(7, 12) }
  if (D.pauseAt === RV.p3) {
    const k = D.pk
    if (k === 1 && A.once('w3')) { A.sfx('boom_anticipation_suck', 1); A.sfx('impact_frame_boom_long', 0.7); A.shake(10, 16); titanLine(f, 'ult', 0) }
    if (k === RV.rise && A.once('rise')) { A.sfx('charge_swell_riser', 0.9); A.sfx('warp_wobble_02', 0.9) }
    if (k === RV.rise + 14 && A.once('screech')) { A.sfx('crack_sizzle_bright', 0.7); A.sfx('warp_wobble_01', 1); A.shake(8, 20) }
    if (k === RV.dive && A.once('dive')) { A.sfx('whoosh_medium_02', 1); A.sfx('swish_fast_01', 0.9) }
    if (k === RV.wrap && A.once('wrap')) { A.sfx('boom_huge_01', 0.85); A.sfx('hit_heavy_boom_01', 0.8); A.shake(16, 22) }
  }
  if ((L === 140 || L === 152 || L === 164) && A.once('crush' + L)) { A.sfx('hit_heavy_boom_01', 0.55); A.sfx('warp_wobble_02', 0.4); A.shake(6, 8) }
  if (L === 172 && A.once('suck')) { A.sfx('pitch_drop_slowmo', 0.9); A.sfx('boom_anticipation_suck', 0.9); titanLine(f, 'shout', 1) }   // "I'm gonna pop your bubble."
  if (L === 196 && A.once('tail')) A.sfx('energy_tone_hold', 0.35)
}
function contact(A, i) {
  if (i < 2) { A.sfx('impact_hit_01', 0.9); A.sfx('boom_medium_02', 0.8); A.sfx('crack_sizzle_bright', 0.45); A.shake(11 + i * 3, 14) }
  else { A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_02_roar', 1); A.sfx('crack_sizzle_bright', 0.8); A.shake(22, 44); A.sfx('rumble_tail_01', 0.9) }
}
function camera(cam, D, L) {
  if (!cam?.focusOnFighter) return
  const f = D.caster, t = D.target
  const box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 })
  if (D.hold > 0 && D.lastHit) { cam.focusOnFighter(t, D.lastHit.i === 2 ? 1.55 : 1.3); return }
  if (D.pauseAt === RV.p3 && D.pk > 0) {
    if (D.pk < RV.dive) cam.focusOnFighter(box(f.x + 24, f.y - 40), 0.85)   // pull out: the soul-self above her
    else if (D.pk < RV.wrap) cam.focusBetween?.(f, t, 1.0)
    else cam.focusOnFighter(t, 1.4)
    return
  }
  if (L < 41) cam.focusOnFighter(f, 1.75)
  else if (L < 80) cam.focusOnFighter(f, 1.4)
  else if (L < 126) cam.focusBetween?.(f, t, 1.15)
  else if (L < 176) cam.focusBetween?.(f, t, 1.25)
  else if (L < 181) cam.focusOnFighter(t, 1.6)
  else cam.focusBetween?.(f, t, 1.0)
}
export const ravenUltDirector = titanCine({
  id: 'raven_soulself', zoom: 1.85,
  scene: ravenUltScene, update: updateRavenUlt, clear: clearRavenUlt,
  pauses: { [RV.p1]: RV.p1n, [RV.p2]: RV.p2n, [RV.p3]: RV.p3n },
  slow: L => (L >= RV.slow[0] && L < RV.slow[1] ? 3 : 1),
  stop: i => (i < 2 ? 9 : 26),
  beat, contact, camera,
  draw: drawRavenUltScreen,
})
