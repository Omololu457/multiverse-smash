// yutaUlt.js — Yuta Okkotsu (yuta) ULTIMATE "RIKA — PURE LOVE" as a FROZEN CINEMATIC (2026-11-24 roster-wide "every character
// gets their own special ultimate" pass). Replaces the legacy invocation → persistent AI Rika assist (abilities.
// executeYutaUltimate + summons.js rikaAssist — both untouched, no longer reached when a foe is present) through cineRegistry
// (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (100 cursed energy). Sure-hit and range-independent
//   (Rika comes to the foe; the beam crosses the stage) — no foe → undefined → the legacy summon.
//   DAMAGE (legacy: Rika strikes 55 raw ×0.60 for ~6 s → measured 231 dealt on Naruto, no attacker boost): Rika's claw 45 +
//   Rika's slam 55 + Yuta's thrust 60 + PURE LOVE 240 = 400 raw ≈ 240 dealt (no attacker boost, like the legacy). A held
//   guard chips 25 %.
// BEATS (script frame k; the beam holds B.stop real frames):
//   INVOKE      0-46   letterbox; the stage goes dark; Yuta draws, kneels and calls her — "I won't forgive anyone who hurts my friends."
//   MANIFEST   46-92   RIKA erupts out of the dark behind him (spawn strip, huge), screeches; pale shockwave; 里香 calligraphy
//   ASSAULT    92-150  she lunges across the stage: claw (hit) → overhead slam (hit); he flashes in with a thrust (hit)
//   PURE LOVE 150-214  he steps back to her; the ring glows; she wraps her arms around him; a sphere of cursed energy grows
//                       between them; 純愛 calligraphy; "Let's end this."
//   FIRE        214    PURE LOVE: a colossal white-violet cursed-energy beam swallows the foe — white frame, inverted frame, hold
//   AFTER     224-300  the beam thins to sparkles; Rika fades back into him; "I'm definitely getting stronger."
import { makeCineUlt, cineHit, sfx, voice, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { drawYutaUltScreen, RIKA } from './yutaUltFx.js'

export const B = {
  cost: 100, blockMult: 0.25,
  claw: 45, slam: 55, thrust: 60, beam: 240,
  manifestAt: 46, assaultAt: 92, clawAt: 104, slamAt: 124, thrustAt: 142, loveAt: 158, chargeAt: 176, fireAt: 214,
  afterAt: 234, calmAt: 252, outAt: 288, total: 300, stop: 26, slide: 360,
}
const VOICE = { open: 'yuta_344.mp3', love: 'yuta_160.mp3', after: 'yuta_343.mp3' }

const C = makeCineUlt({
  id: 'yuta_rika_pure_love', keys: ['yuta'], total: B.total, cost: B.cost, maxZoom: 1.9,
  setup(S) {
    S.fFace = S.dir; S.fx = S.fx0
    S.rx = S.fx0 - S.dir * 70; S.ry = 0                         // Rika (world x of her centre, height above floor)
    S.land = S.tx0 + S.dir * (S.blocked ? 120 : B.slide)
    S.yHome = S.tx0 - S.dir * 330                                 // where he stands to fire: a good beam's length back
  },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'yutaUltCast', 'yutaCombo3', 'yutaCem', 'heavy', 'walk'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
    for (const k of Object.keys(RIKA)) image(RIKA[k].sheet)
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.8); voice(ctx, S, VOICE.open) }
    if (k === 24) sfx(ctx, 'charge_hum_rise', 0.8)
    if (k === 40) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.manifestAt) { sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'impact_frame_boom_long', 0.8); cam?.shake?.(16, 30) }
    if (k === B.manifestAt + 18) { sfx(ctx, 'warp_wobble_01', 0.9); sfx(ctx, 'sting_pitch_rise_hold', 0.6) }
    if (k === B.assaultAt) { sfx(ctx, 'whoosh_medium_01', 1); sfx(ctx, 'warp_wobble_02', 0.7) }
    if (k === B.clawAt) { cineHit(S, B.claw, { blockMult: B.blockMult }); S.hold = 6; sfx(ctx, 'impact_hit_01', 1); sfx(ctx, 'swish_fast_02', 0.9); cam?.shake?.(10, 12) }
    if (k === B.slamAt) { cineHit(S, B.slam, { blockMult: B.blockMult }); S.hold = 8; sfx(ctx, 'boom_medium_01', 1); sfx(ctx, 'hit_heavy_boom_01', 0.9); cam?.shake?.(16, 16) }
    if (k === B.thrustAt - 6) sfx(ctx, 'swish_fast_03', 1)
    if (k === B.thrustAt) { cineHit(S, B.thrust, { blockMult: B.blockMult }); S.hold = 8; sfx(ctx, 'impact_crack_01', 1); cam?.shake?.(10, 10) }
    if (k === B.loveAt) { voice(ctx, S, VOICE.love); sfx(ctx, 'energy_tone_hold', 0.8) }
    if (k === B.chargeAt) { sfx(ctx, 'charge_swell_riser', 1); sfx(ctx, 'charge_hum_rise', 0.8) }
    if (k === B.fireAt - 8) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.fireAt && !S.done.fire) {
      S.done.fire = true; S.fireReal = S.real
      cineHit(S, B.beam, { blockMult: B.blockMult })
      S.hold = B.stop; cam?.shake?.(22, 50)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'boom_huge_02_roar', 0.9); sfx(ctx, 'energy_tone_hold', 1)
    }
    if (k === B.fireAt + 8) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.calmAt) voice(ctx, S, VOICE.after)
  },
  place(S, k) {
    S.pf = k
    const dir = S.dir
    // Rika: rises behind him → lunges to the foe → returns to embrace him for the beam → fades
    const rHome = S.fx0 - dir * 70, rAtk = S.tx0 - dir * 90, rLove = S.yHome - dir * 40
    if (k < B.assaultAt) { S.rx = rHome; S.ry = 0 }
    else if (k < B.clawAt) { const u = smooth((k - B.assaultAt) / (B.clawAt - B.assaultAt)); S.rx = rHome + (rAtk - rHome) * u; S.ry = Math.sin(Math.PI * u) * 50 }
    else if (k < B.thrustAt) { S.rx = rAtk; S.ry = k >= B.slamAt - 10 && k < B.slamAt ? (k - B.slamAt + 10) * 8 : 0 }
    else if (k < B.loveAt + 10) { const u = smooth((k - B.thrustAt) / (B.loveAt + 10 - B.thrustAt)); S.rx = rAtk + (rLove - rAtk) * u; S.ry = Math.sin(Math.PI * u) * 40 }
    else { S.rx = rLove; S.ry = 0 }
    // Yuta: kneels where he is → flashes in for the thrust → back-steps to fire
    const near = S.tx0 - dir * 70
    if (k < B.thrustAt - 8) S.fx = S.fx0
    else if (k < B.thrustAt) S.fx = S.fx0 + (near - S.fx0) * smooth((k - B.thrustAt + 8) / 8)
    else if (k < B.loveAt) S.fx = near
    else if (k < B.loveAt + 14) S.fx = near + (S.yHome - near) * smooth((k - B.loveAt) / 14)
    else S.fx = S.yHome
    // the foe: rocked by the claw, crushed by the slam, then carried away by the beam
    let tx = S.tx0, ty = 0
    if (k >= B.clawAt && k < B.clawAt + 14) tx += dir * 16 * Math.sin(Math.PI * (k - B.clawAt) / 14)
    if (k >= B.thrustAt && k < B.thrustAt + 12) tx += dir * 12 * Math.sin(Math.PI * (k - B.thrustAt) / 12)
    if (k >= B.fireAt) {
      const u = clamp((k - B.fireAt) / 44, 0, 1), e = 1 - (1 - u) ** 2
      tx = S.tx0 + (S.land - S.tx0) * e
      ty = S.blocked ? 0 : Math.max(0, Math.sin(Math.PI * clamp(u * 1.3, 0, 1)) * 90)
    }
    S.tx = tx; S.ty = ty; S.fy = 0
  },
  camera(S, cam, k) {
    const f = S.caster, tb = box(S.tx, S.tFloor - 47 - (S.ty || 0)), rb = box(S.rx, S.floor - 90)
    if (k < B.manifestAt) cam.focusOnFighter(f, 1.5 + 0.2 * smooth(k / B.manifestAt))
    else if (k < B.assaultAt) cam.focusOnFighter(box(S.fx0 - S.dir * 30, S.floor - 110), 1.0)
    else if (k < B.loveAt) cam.focusBetween?.(rb, tb, 1.2)
    else if (k < B.fireAt) cam.focusOnFighter(box(S.fx - S.dir * 20, S.floor - 80), 1.25 + 0.2 * smooth((k - B.loveAt) / 50))
    else if (k < B.calmAt) cam.focusBetween?.(f, tb, 0.8)
    else cam.focusOnFighter(f, 1.25)
  },
  draw: (ctx, canvas, S) => drawYutaUltScreen(ctx, canvas, S, B),
})
export const isYutaUltActive = C.active
export const getYutaUltStatus = C.status
export const clearYutaUlt = C.clear
