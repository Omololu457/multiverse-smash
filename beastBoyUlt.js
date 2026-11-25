// beastBoyUlt.js — Beast Boy's ULTIMATE "ANIMAL INSTINCT — FOUR BEAST FINISH" as a full cinematic (2026-11-24, owner: "give
// every character their own special ultimate"). The sim stays beastBoyState.js's frozen scene (same punch opener, same 100
// cost, same contacts 45 + 30 + 60 + 100 raw through W.damage with the confirm's combo scale); titansUltCore.js wraps it
// with camera / sound access, hit-stop and authored pauses. Drawn by beastBoyUltFx.js (screen pass). The four beasts are his
// real morph sprites (gorilla, hawk, tiger, triceratops); the T-REX is a cinematic morph drawn by the screen pass.
// BEATS (legacy frame L; ‖ = a held legacy frame while the beat plays):
//   BINGO        L0-30     letterbox, push in on Gar, the title cut-in; every morph = a green morph flash + its name
//   GORILLA      L30-74    the gorilla kick (45)               "GORILLA!"
//   HAWK         L75-114   the hawk dive (30)                  "HAWK!"
//   TIGER        L115-164  the tiger slash (60)                "TIGER!"
//   T-REX        ‖L166 ×44 he grows into a towering T-rex that fills the frame and ROARS: shock rings, the camera
//                          shakes apart, the foe cowers — then shrinks into the triceratops
//   TRICERATOPS  L166-234  the charge and the horn launch (100): white frame, hit-stop 26, punch-in, dust
//   BOOM         L235-259  his ready pose: "Yeah, that's why I do it!"
import { titanCine, titanLine } from './titansUltCore.js'
import { beastBoyUltScene, updateBeastBoyUlt, clearBeastBoyUlt } from './beastBoyState.js'
import { drawBeastBoyUltScreen, preloadBeastBoyUlt } from './beastBoyUltFx.js'

export const BB = { rex: 166, rexN: 44, grow: 10, roar: 18, shrink: 36 }

function beat(A, L, D) {
  const f = D.caster
  if (L === 0 && A.once('open')) { A.sfx('swish_fast_02', 0.6); A.sfx('charge_hum_rise', 0.5); try { preloadBeastBoyUlt(f) } catch (_) {} }
  for (const m of [30, 75, 115]) if (L === m && A.once('mo' + m)) { A.sfx('warp_wobble_01', 0.7); A.sfx('whoosh_medium_01', 0.6) }
  if (D.pauseAt === BB.rex) {
    const k = D.pk
    // his engine sprite hides while the T-rex (drawn by the screen pass) stands in his place (game.js reads _invAlpha as a body alpha)
    if (k >= 5 && k < BB.rexN - 3) { f._invAlpha = 0; D.invHidden = true } else if (D.invHidden) { delete f._invAlpha; D.invHidden = false }
    if (k === 1 && A.once('rex')) { A.sfx('warp_wobble_02', 0.9); A.sfx('charge_swell_riser', 0.9) }
    if (k === BB.grow && A.once('stomp')) { A.sfx('hit_heavy_boom_01', 0.9); A.shake(10, 10) }
    if (k === BB.roar && A.once('roar')) { A.sfx('boom_huge_02_roar', 1); A.sfx('rumble_tail_01', 0.9); A.sfx('warp_wobble_01', 0.8); A.shake(20, 18) }
    if (k === BB.shrink && A.once('shr')) { A.sfx('warp_wobble_02', 0.8); A.sfx('whoosh_medium_02', 0.7) }
  }
  if (L === 170 && A.once('charge')) { A.sfx('rumble_tail_01', 0.7); A.sfx('charge_hum_rise', 0.6) }
  if (L === 182 && A.once('suck')) A.sfx('boom_anticipation_suck', 0.9)
  if (L === 236 && A.once('vo')) titanLine(f, 'win', 2)   // "Yeah, that's why I do it!"
}
function contact(A, i) {
  if (i === 0) { A.sfx('hit_heavy_boom_01', 0.95); A.sfx('boom_medium_01', 0.7); A.shake(12, 14) }
  else if (i === 1) { A.sfx('swish_fast_03', 0.8); A.sfx('impact_hit_01', 0.8); A.shake(8, 10) }
  else if (i === 2) { A.sfx('hit_flurry_01', 0.9); A.sfx('impact_crack_01', 0.8); A.shake(11, 12) }
  else { A.sfx('impact_frame_boom_long', 1); A.sfx('boom_huge_01', 1); A.sfx('rumble_tail_01', 0.9); A.shake(24, 44) }
}
function camera(cam, D, L) {
  if (!cam?.focusOnFighter) return
  const f = D.caster, t = D.target
  const box = (x, y) => ({ x: x - 24, y: y - 47, w: 48, h: 94 })
  if (D.hold > 0 && D.lastHit) { cam.focusOnFighter(t, D.lastHit.i === 3 ? 1.3 : 1.45); return }
  if (D.pauseAt === BB.rex && D.pk > 0) { cam.focusOnFighter(box(f.x + 24 + D.dir * 30, f.y - 50), D.pk < BB.grow ? 1.2 : 0.8); return }
  if (L < 30) cam.focusOnFighter(f, 1.75)
  else if (L < 165) cam.focusBetween?.(f, t, 1.35)
  else if (L < 235) cam.focusBetween?.(f, t, 1.15)
  else cam.focusOnFighter(f, 1.5)
}
export const beastBoyUltDirector = titanCine({
  id: 'beast_boy_instinct', zoom: 1.85,
  scene: beastBoyUltScene, update: updateBeastBoyUlt, clear: clearBeastBoyUlt,
  pauses: { [BB.rex]: BB.rexN },
  slow: L => (L >= 182 && L < 187 ? 3 : 1),
  stop: i => (i < 3 ? 9 : 26),
  beat, contact, camera,
  draw: drawBeastBoyUltScreen,
})
