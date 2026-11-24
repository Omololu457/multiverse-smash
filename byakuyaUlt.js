// byakuyaUlt.js — Byakuya Kuchiki (byakuya) ULTIMATE "BANKAI: SENBONZAKURA KAGEYOSHI → SHŪKEI: HAKUTEIKEN" as a FROZEN
// CINEMATIC (2026-11-24 roster-wide ultimate pass). Replaces the legacy 88-frame wing/blast overlay (abilities.
// executeByakuyaUltimate — left untouched, no longer reached) through cineRegistry (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (100), same sure-hit, range-independent payoff.
//   DAMAGE (legacy 340 raw → 204 dealt, no attacker boost — kept that way): 4 petal-storm cuts × 40 raw + the Hakuteiken
//   thrust 210 raw = 370 raw → ≈222 dealt (+9 %). A held guard chips 25 % per cut.
// BEATS (script frame k; the thrust holds B.stop real frames):
//   COLD       0-40   letterbox; a slow push-in; drifting blossoms. "Know that there is nothing you can protect."
//   RELEASE   40-76   he opens his hand — the blade falls and SINKS into the ground like water; 卍解
//   THOUSAND  76-124  two rows of colossal blades rise out of the floor behind him across the stage; the title
//   SCATTER  124-196  the blades shatter top-down into a hundred million petals that pour across the stage in rivers and
//                     wrap the foe in a pink vortex — four cutting passes (hits)
//   SHŪKEI   196-232  the petals pull back into him; blue-white reiatsu wings unfold; 終景・白帝剣 — "I'll deal the finishing blow."
//   HAKUTEIKEN 232    shunpo — one white thrust through the vortex: white frame → inverted frame → the petals burst outward
//   AFTER    240-320  a rain of petals; the foe falls; his back to them: "This is over."
import { makeCineUlt, cineHit, sfx, voice, ctrX, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { drawByakuyaUltScreen } from './byakuyaUltFx.js'

export const B = {
  cost: 100, cut: 40, raw: 210, blockMult: 0.25,
  releaseAt: 40, bladesAt: 76, scatterAt: 124, cuts: [140, 154, 168, 182], shukeiAt: 196, blinkAt: 226, thrustAt: 232, burstEnd: 262, afterAt: 270, outAt: 308, total: 320,
  stop: 26, slide: 230,
}
const VOICE = { cold: 'byakuya_003.mp3', finish: 'byakuya_007.mp3', over: 'byakuya_004.mp3' }

const C = makeCineUlt({
  id: 'byakuya_senbonzakura', keys: ['byakuya'], total: B.total, cost: B.cost, maxZoom: 1.9,
  setup(S) {
    S.fx1 = S.tx0 - S.dir * 70           // the thrust: he appears at arm's length and drives the blade through
    S.land = S.tx0 + S.dir * (S.blocked ? 110 : B.slide)
    S.fFace = S.dir
  },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'byakuyaBankaiCharge', 'byakuyaBankaiTransform', 'byakuyaBankaiThrust', 'byakuyaShunpoOut'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
    for (const s of ['./byakuya_bankai_wings_grow_uniform.png', './byakuya_bankai_wings_full_uniform.png', './byakuya_bankai_blast_uniform.png']) image(s)
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_tone_hold', 0.5); voice(ctx, S, VOICE.cold) }
    if (k === B.releaseAt) { sfx(ctx, 'swish_fast_01', 0.7); sfx(ctx, 'pitch_drop_slowmo', 0.8) }
    if (k === B.releaseAt + 16) { sfx(ctx, 'warp_wobble_01', 0.9); sfx(ctx, 'boom_anticipation_suck', 0.8); cam?.shake?.(4, 10) }
    if (k === B.bladesAt) { sfx(ctx, 'boom_medium_02', 0.9); sfx(ctx, 'charge_swell_riser', 0.8); cam?.shake?.(10, 30) }
    if (k === B.bladesAt + 20) sfx(ctx, 'rumble_tail_01', 0.8)
    if (k === B.scatterAt) { sfx(ctx, 'crack_sizzle_bright', 0.9); sfx(ctx, 'whoosh_medium_02', 0.9) }
    if (k === B.scatterAt + 8) sfx(ctx, 'hit_flurry_01', 0.7)
    for (let i = 0; i < B.cuts.length; i++) if (k === B.cuts[i]) {
      cineHit(S, B.cut, { blockMult: B.blockMult })
      sfx(ctx, i & 1 ? 'swish_fast_02' : 'swish_fast_01', 0.9); sfx(ctx, 'impact_hit_01', 0.6); cam?.shake?.(4 + i * 2, 8)
    }
    if (k === B.shukeiAt) { sfx(ctx, 'energy_hum_low', 0.9); sfx(ctx, 'sting_pitch_rise_hold', 0.8) }
    if (k === B.shukeiAt + 10) { voice(ctx, S, VOICE.finish); sfx(ctx, 'charge_hum_rise', 0.8) }
    if (k === B.blinkAt) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'warp_wobble_02', 0.8) }
    if (k === B.thrustAt && !S.done.thrust) {
      S.done.thrust = true; S.thrustReal = S.real
      cineHit(S, B.raw, { blockMult: B.blockMult })
      S.hold = B.stop
      cam?.shake?.(16, 36)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'crack_sizzle_bright', 1); sfx(ctx, 'boom_huge_01', 0.9)
    }
    if (k === B.thrustAt + 4) { sfx(ctx, 'boom_huge_02_roar', 0.8); sfx(ctx, 'whoosh_medium_01', 0.8) }
    if (k === B.thrustAt + 14) sfx(ctx, 'rumble_tail_01', 0.9)
    if (k === B.afterAt + 10) voice(ctx, S, VOICE.over)
  },
  place(S, k) {
    S.pf = k
    S.fx = k < B.blinkAt + 4 ? S.fx0 : S.fx1
    if (k < B.thrustAt + 6) { S.tx = S.tx0; S.ty = k >= B.scatterAt + 20 && k < B.thrustAt && !S.blocked ? 10 + 8 * Math.sin(k * 0.3) : 0 }
    else { const u = clamp((k - B.thrustAt - 6) / 34, 0, 1), e = 1 - (1 - u) ** 2; S.tx = S.tx0 + (S.land - S.tx0) * e; S.ty = S.blocked ? 0 : Math.sin(Math.PI * u) * 60 }
  },
  camera(S, cam, k) {
    const f = S.caster
    if (k < B.releaseAt) cam.focusOnFighter(f, 1.5 + 0.35 * smooth(k / B.releaseAt))
    else if (k < B.bladesAt) cam.focusOnFighter(box(S.fx0, S.floor - 30), 1.7)                          // the blade sinking
    else if (k < B.scatterAt) cam.focusOnFighter(box(S.fx0 + S.dir * 60, S.floor - 160), 0.62)          // pull out: the rows of blades
    else if (k < B.cuts[0]) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47), 0.95)
    else if (k < B.shukeiAt) cam.focusOnFighter(box(S.tx0, S.tFloor - 60), 1.45)                         // inside the vortex
    else if (k < B.blinkAt) cam.focusOnFighter(f, 1.65)
    else if (k < B.afterAt) cam.focusBetween?.(box(S.fx1, S.floor - 47), box(S.tx0, S.tFloor - 47), 1.4)
    else cam.focusBetween?.(box(S.fx1, S.floor - 47), box(S.land, S.tFloor - 47), 1.05)
  },
  draw: (ctx, canvas, S) => drawByakuyaUltScreen(ctx, canvas, S, B),
})
export const isByakuyaUltActive = C.active
export const getByakuyaUltStatus = C.status
export const clearByakuyaUlt = C.clear
void ctrX
