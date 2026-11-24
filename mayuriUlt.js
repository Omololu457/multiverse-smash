// mayuriUlt.js — Mayuri Kurotsuchi (mayuri) ULTIMATE "BANKAI: KONJIKI ASHISOGI JIZŌ" as a FROZEN CINEMATIC (2026-11-24 roster-
// wide ultimate pass). Replaces the legacy 84-frame construct overlay (abilities.executeMayuriUltimate — untouched, no longer
// reached) through cineRegistry (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (100), same sure-hit, range-independent payoff.
//   DAMAGE (legacy: 330 raw WITH the attacker + move "ultimate" → ≈599 dealt on Naruto, guard 25 % → 150): 3 poison-breath
//   ticks × 25 raw + the crush 290 raw = 365 raw, same attacker/move tags → ≈663 dealt (+10 %); a held guard chips 25 %.
// BEATS (script frame k; the crush holds B.stop real frames):
//   LAB        0-44   letterbox, a sickly green grade, push in on the grin. "Allow me to show you my masterpiece."
//   BANKAI    44-104  the sword raised; the floor splits and violet miasma boils out; 卍解; the golden JIZŌ rises behind him
//   MIASMA   104-162  the construct exhales a rolling cloud of poison across the stage: the foe chokes in it (3 ticks)
//   LOOM     162-196  it heaves itself up over the foe — the camera pulls back to show its size; its shadow swallows them
//   CRUSH      196    it drops: white frame → acid-green inverted frame → blades skewer the ground
//   AFTER    204-290  a green shock-ring, the construct melts into smoke; Mayuri laughs: "Perfection… is so very dull."
import { makeCineUlt, cineHit, sfx, voice, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { drawMayuriUltScreen } from './mayuriUltFx.js'

export const B = {
  cost: 100, tick: 25, raw: 290, blockMult: 0.25,
  bankaiAt: 44, riseAt: 70, breathAt: 104, ticks: [122, 138, 154], loomAt: 162, dropAt: 188, crushAt: 196, afterAt: 214, laughAt: 226, outAt: 278, total: 290,
  stop: 26, slide: 170,
}
const VOICE = { open: 'mayuri_line_080_0249.7s.mp3' }

const C = makeCineUlt({
  id: 'mayuri_ashisogi_jizo', keys: ['mayuri'], total: B.total, cost: B.cost, maxZoom: 1.9,
  setup(S) { S.land = S.tx0 + S.dir * (S.blocked ? 90 : B.slide); S.fFace = S.dir; S.fx = S.fx0 },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'mayuriBankaiCast'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
    image('./mayuri_bankai_construct_uniform.png')
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.6); voice(ctx, S, VOICE.open) }
    if (k === B.bankaiAt) { sfx(ctx, 'sting_pitch_rise_hold', 0.8); sfx(ctx, 'warp_wobble_01', 0.8) }
    if (k === B.bankaiAt + 12) { sfx(ctx, 'impact_crack_01', 0.9); cam?.shake?.(8, 16) }
    if (k === B.riseAt) { sfx(ctx, 'boom_huge_02_roar', 0.9); sfx(ctx, 'rumble_tail_01', 1); cam?.shake?.(12, 40) }
    if (k === B.breathAt) { sfx(ctx, 'whoosh_medium_02', 1); sfx(ctx, 'energy_tone_hold', 0.7); sfx(ctx, 'warp_wobble_02', 0.8) }
    for (const t of B.ticks) if (k === t) { cineHit(S, B.tick, { blockMult: B.blockMult, attacker: true, move: 'ultimate' }); sfx(ctx, 'crack_sizzle_bright', 0.5); cam?.shake?.(4, 8) }
    if (k === B.loomAt) { sfx(ctx, 'charge_swell_riser', 0.9); sfx(ctx, 'rumble_tail_01', 0.8) }
    if (k === B.dropAt) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'whoosh_medium_01', 0.9) }
    if (k === B.crushAt && !S.done.crush) {
      S.done.crush = true; S.crushReal = S.real
      cineHit(S, B.raw, { blockMult: B.blockMult, attacker: true, move: 'ultimate' })
      S.hold = B.stop; cam?.shake?.(22, 44)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_huge_01', 1)
    }
    if (k === B.crushAt + 3) { sfx(ctx, 'boom_huge_02_roar', 0.9); cam?.shake?.(18, 30) }
    if (k === B.crushAt + 14) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.laughAt) sfx(ctx, 'warp_wobble_01', 0.6)
  },
  place(S, k) {
    S.pf = k; S.fx = S.fx0
    if (k < B.crushAt + 4) { S.tx = S.tx0; S.ty = 0 }
    else { const u = clamp((k - B.crushAt - 4) / 30, 0, 1), e = 1 - (1 - u) ** 2; S.tx = S.tx0 + (S.land - S.tx0) * e; S.ty = 0 }
  },
  camera(S, cam, k) {
    const f = S.caster, mid = box((S.fx0 + S.tx0) / 2, S.floor - 140)
    if (k < B.bankaiAt) cam.focusOnFighter(f, 1.55 + 0.3 * smooth(k / B.bankaiAt))
    else if (k < B.riseAt) cam.focusOnFighter(f, 1.5)
    else if (k < B.breathAt) cam.focusOnFighter(box(S.fx0 - S.dir * 90, S.floor - 180), 0.8)        // the Jizō rising behind him
    else if (k < B.loomAt) cam.focusOnFighter(box((S.fx0 + S.tx0) / 2 - S.dir * 60, S.floor - 120), 0.95)
    else if (k < B.crushAt) cam.focusOnFighter(box(S.tx0, S.floor - 220), 0.68)                       // LOOM: pull back to its size
    else if (k < B.afterAt) cam.focusOnFighter(box(S.tx0, S.floor - 170), 0.9)
    else cam.focusOnFighter(f, 1.35)
    void mid
  },
  draw: (ctx, canvas, S) => drawMayuriUltScreen(ctx, canvas, S, B),
})
export const isMayuriUltActive = C.active
export const getMayuriUltStatus = C.status
export const clearMayuriUlt = C.clear
