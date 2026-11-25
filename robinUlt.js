// robinUlt.js — Robin's ULTIMATE "CHECKMATE: LIGHTS OUT" as a full cinematic (2026-11-24, owner: "give every character
// their own special ultimate"). The sim stays robinState.js's frozen scene (same staff opener, same 100 cost, same contacts
// 22 + 22 + 22 + 34 + 130 raw through W.damage with the confirm's combo scale); titansUltCore.js wraps it with camera / sound
// access, hit-stop and authored pauses. Drawn by robinUltFx.js (screen pass).
// BEATS (legacy frame L; ‖ = a held legacy frame while the beat plays):
//   THE PLAN       L0-30     letterbox, push in on the leader; the title cut-in
//   LIGHTS OUT     ‖L31 ×34  a smoke bomb swallows the stage — then the lights cut: only his white lenses in the dark;
//                            three birdarangs whistle out of the black and box the foe in (they stick, blinking)
//   IN THE DARK    L31-85    the bo-staff flurry is lit only by its own strikes (22 ×3): strobe-white silhouettes,
//                            hit-stop, slow-motion between, "CHECK" stamps
//   THE TAKEDOWN   L86-111   lights snap back on as the rising staff launches the foe (34)
//   CHECKMATE      L112-149  his wrist computer: a targeting HUD locks the foe, 3 · 2 · 1 — the birdarangs arm
//   BOOM           L150      the bomb + the birdarangs blow together (130): white frame, hit-stop 24, punch-in, the
//                            backflip clear silhouetted against the blast
//   ONLY ROBIN     L172-199  the landing pose: "ONLY ROBIN! GO!"
import { titanCine, titanLine } from './titansUltCore.js'
import { robinUltScene, updateRobinUlt, clearRobinUlt } from './robinState.js'
import { drawRobinUltScreen, preloadRobinUlt } from './robinUltFx.js'

export const RB = { out: 31, outN: 34, smoke: 0, dark: 10, rang: [16, 21, 26], slow: [48, 86], blast: 150 }

function beat(A, L, D) {
  const f = D.caster
  if (L === 0 && A.once('open')) { A.sfx('sting_pitch_rise_hold', 0.6); A.sfx('swish_fast_02', 0.6); try { preloadRobinUlt(f) } catch (_) {} }
  if (D.pauseAt === RB.out) {
    const k = D.pk
    if (k === 1 && A.once('smoke')) { A.sfx('boom_medium_01', 0.8); A.sfx('whoosh_medium_01', 0.8); A.shake(6, 10) }
    if (k === RB.dark && A.once('dark')) { A.sfx('pitch_drop_slowmo', 0.8); A.sfx('energy_hum_low', 0.6) }
    RB.rang.forEach((r, i) => { if (k === r && A.once('rang' + i)) { A.sfx(i === 1 ? 'swish_fast_03' : 'swish_fast_01', 0.9); A.sfx('crack_sizzle_bright', 0.35) } })
    RB.rang.forEach((r, i) => { if (k === r + 4 && A.once('thunk' + i)) { A.sfx('impact_crack_01', 0.55); A.shake(3, 4) } })
  }
  if ((L === 50 || L === 62 || L === 74) && A.once('sw' + L)) A.sfx('swish_fast_02', 0.7)
  if (L === 88 && A.once('lights')) { A.sfx('whoosh_medium_02', 0.9) }
  if (L === 112 && A.once('hack')) { A.sfx('energy_tone_hold', 0.5); A.sfx('charge_hum_rise', 0.5) }
  if ((L === 122 || L === 132 || L === 142) && A.once('beep' + L)) { A.sfx('crack_sizzle_bright', 0.5); A.sfx('sting_pitch_rise_hold', 0.25 + (L - 122) / 60) }
  if (L === 146 && A.once('suck')) A.sfx('boom_anticipation_suck', 0.9)
  if (L === 176 && A.once('vo')) { titanLine(f, 'ult', 1) }
  if (L === 178 && A.once('land')) A.sfx('impact_hit_01', 0.5)
}
function contact(A, i) {
  if (i < 3) { A.sfx('hit_heavy_boom_01', 0.75); A.sfx('impact_crack_01', 0.8); A.shake(8 + i * 2, 10) }
  else if (i === 3) { A.sfx('impact_hit_01', 0.9); A.sfx('boom_medium_02', 0.8); A.shake(12, 14) }
  else { A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_01', 1); A.sfx('boom_huge_02_roar', 0.8); A.sfx('rumble_tail_01', 0.8); A.shake(22, 40) }
}
function camera(cam, D, L) {
  if (!cam?.focusOnFighter) return
  const f = D.caster, t = D.target
  if (D.hold > 0 && D.lastHit) { cam.focusOnFighter(t, D.lastHit.i === 4 ? 1.2 : 1.55); return }
  if (D.pauseAt === RB.out && D.pk > 0) { cam.focusBetween?.(f, t, D.pk < RB.dark ? 1.05 : 1.3); return }
  if (L < 31) cam.focusOnFighter(f, 1.75)
  else if (L < 86) cam.focusBetween?.(f, t, 1.5)
  else if (L < 112) cam.focusOnFighter(t, 1.3)
  else if (L < 150) cam.focusOnFighter(f, 1.5 + 0.2 * Math.min(1, (L - 112) / 38))
  else if (L < 172) cam.focusBetween?.(f, t, 0.95)
  else cam.focusOnFighter(f, 1.45)
}
export const robinUltDirector = titanCine({
  id: 'robin_checkmate', zoom: 1.85,
  scene: robinUltScene, update: updateRobinUlt, clear: clearRobinUlt,
  pauses: { [RB.out]: RB.outN },
  slow: L => (L >= RB.slow[0] && L < RB.slow[1] && (L % 12 > 7) ? 2 : 1),
  stop: i => (i < 3 ? 7 : i === 3 ? 10 : 24),
  beat, contact, camera,
  draw: drawRobinUltScreen,
})
