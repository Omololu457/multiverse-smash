// ichigoUlt.js — Ichigo Kurosaki (ichigo) ULTIMATE "TENSA ZANGETSU: GETSUGA TENSHŌ" as a FROZEN CINEMATIC (2026-11-24 roster-
// wide ultimate pass). Replaces the legacy 108-frame dash → uppercut cinematic (abilities.executeIchigoUltimate +
// ichigoGetsugaTenshoCinematic.js — both untouched, no longer reached) through cineRegistry (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (100), same sure-hit, range-independent payoff.
//   DAMAGE (legacy 330 raw → 198 dealt, no attacker boost — kept that way): dash-slash 60 + rising cut 80 + the Getsuga 220 =
//   360 raw → ≈216 dealt (+9 %). A held guard chips 25 % per hit (the foe stays grounded behind their guard).
// BEATS (script frame k; the Getsuga holds B.stop real frames):
//   RESOLVE    0-44   letterbox; push in; black reiatsu with a red rim flares off him. "I'll put everything into this one strike!"
//   CHARGE    44-96   Tensa Zangetsu drinks the reiatsu — the blade goes black, the air is pulled into it; 月牙天衝
//   DASH      96-110  shunpo dash-slash across the gap (hit)
//   RISE     110-150  the rising cut launches the foe; he follows them up into the sky (hit). "Blow away!"
//   GETSUGA  150-188  time stops mid-air: GETSUGA TENSHŌ — the swing, a colossal black crescent with a crimson edge
//   IMPACT     188    it swallows the foe: white frame → crimson inverted frame; the crescent tears on into the clouds
//   AFTER    196-300  black embers drift; the foe drops; he lands, blade on his shoulder: "This is my own power."
import { makeCineUlt, cineHit, sfx, voice, clamp, smooth, outE, box, preloadAnims } from './bleachUltKit.js'
import { drawIchigoUltScreen } from './ichigoUltFx.js'

export const B = {
  cost: 100, dash: 60, rise: 80, raw: 220, blockMult: 0.25,
  chargeAt: 44, dashAt: 96, dashHit: 106, riseAt: 112, riseHit: 118, getsugaAt: 150, swingAt: 168, fireAt: 174, impactAt: 188, afterAt: 214, landAt: 236, outAt: 286, total: 298,
  stop: 28, lift: 230, slide: 200,
}
const VOICE = { open: 'ichigo_voice_166_t04m26_1s.mp3', rise: 'ichigo_voice_148_t03m52_6s.mp3', getsuga: 'ichigo_voice_046_t01m14_6s.mp3', after: 'ichigo_voice_100_t02m35_3s.mp3' }

const C = makeCineUlt({
  id: 'ichigo_getsuga_tensho', keys: ['ichigo'], total: B.total, cost: B.cost, maxZoom: 1.9,
  setup(S) { S.fx1 = S.tx0 - S.dir * 56; S.land = S.tx0 + S.dir * (S.blocked ? 100 : B.slide); S.fFace = S.dir; S.fx = S.fx0 },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'charge', 'ichigoGetsugaCast', 'ichigoUlt1', 'ichigoUlt2', 'ichigoAirGetsuga', 'ichigoReturn', 'fall'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.7); voice(ctx, S, VOICE.open) }
    if (k === 20) { sfx(ctx, 'boom_medium_01', 0.7); cam?.shake?.(6, 10) }
    if (k === B.chargeAt) { sfx(ctx, 'charge_swell_riser', 0.9); sfx(ctx, 'charge_hum_rise', 0.8) }
    if (k === 80) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.dashAt) { sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'whoosh_medium_01', 0.8) }
    if (k === B.dashHit) { cineHit(S, B.dash, { blockMult: B.blockMult }); sfx(ctx, 'impact_hit_01', 0.9); sfx(ctx, 'swish_fast_01', 0.8); cam?.shake?.(8, 10) }
    if (k === B.riseAt) { voice(ctx, S, VOICE.rise); sfx(ctx, 'swish_fast_02', 0.9) }
    if (k === B.riseHit) { cineHit(S, B.rise, { blockMult: B.blockMult }); sfx(ctx, 'hit_heavy_boom_01', 0.8); sfx(ctx, 'whoosh_medium_02', 0.8); cam?.shake?.(10, 12) }
    if (k === B.getsugaAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'sting_pitch_rise_hold', 0.8); voice(ctx, S, VOICE.getsuga) }
    if (k === B.swingAt) { sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'energy_tone_hold', 0.8) }
    if (k === B.fireAt) { sfx(ctx, 'boom_huge_02_roar', 0.9); sfx(ctx, 'whoosh_medium_02', 1); cam?.shake?.(12, 16) }
    if (k === B.impactAt && !S.done.impact) {
      S.done.impact = true; S.impactReal = S.real
      cineHit(S, B.raw, { blockMult: B.blockMult })
      S.hold = B.stop; cam?.shake?.(20, 40)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'crack_sizzle_bright', 0.9)
    }
    if (k === B.impactAt + 4) sfx(ctx, 'boom_huge_02_roar', 0.8)
    if (k === B.impactAt + 14) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.landAt) { sfx(ctx, 'boom_medium_01', 0.8); cam?.shake?.(6, 8) }
    if (k === B.landAt + 14) voice(ctx, S, VOICE.after)
  },
  place(S, k) {
    S.pf = k
    // Ichigo: dash in → rise with the foe → hang → drop back down
    const du = k < B.dashAt ? 0 : k < B.dashHit ? outE((k - B.dashAt) / (B.dashHit - B.dashAt)) : 1
    S.fx = S.fx0 + (S.fx1 - S.fx0) * du
    const air = S.blocked ? 0 : 1
    if (k < B.riseAt) S.fy = 0
    else if (k < B.getsugaAt) S.fy = air * (B.lift - 30) * outE((k - B.riseAt) / (B.getsugaAt - B.riseAt))
    else if (k < B.afterAt) S.fy = air * (B.lift - 30 + 8 * Math.sin((k - B.getsugaAt) * 0.1))
    else S.fy = air * (B.lift - 30) * (1 - clamp((k - B.afterAt) / (B.landAt - B.afterAt), 0, 1) ** 2)
    // the foe: staggered → launched → hangs → blasted back → falls
    if (k < B.riseHit) { S.tx = S.tx0 + (k >= B.dashHit ? S.dir * 10 : 0); S.ty = 0 }
    else if (k < B.impactAt) { S.tx = S.tx0 + S.dir * 10; S.ty = air * B.lift * outE((k - B.riseHit) / (B.getsugaAt - B.riseHit)) }
    else {
      const u = clamp((k - B.impactAt) / (B.landAt + 6 - B.impactAt), 0, 1)
      S.tx = S.tx0 + S.dir * 10 + (S.land - S.tx0 - S.dir * 10) * outE(u)
      S.ty = air * (B.lift + 60 * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - u)) * (1 - u * u)
    }
  },
  camera(S, cam, k) {
    const f = S.caster, t = S.target
    if (k < B.chargeAt) cam.focusOnFighter(f, 1.55 + 0.3 * smooth(k / B.chargeAt))
    else if (k < B.dashAt) cam.focusOnFighter(f, 1.75)
    else if (k < B.riseAt) cam.focusBetween?.(f, t, 1.3)
    else if (k < B.getsugaAt) cam.focusBetween?.(f, t, 1.15)
    else if (k < B.fireAt) cam.focusOnFighter(f, 1.6)
    else if (k < B.afterAt) cam.focusBetween?.(f, box(S.tx, S.tFloor - (S.ty || 0) - 47), 1.1)
    else cam.focusBetween?.(f, box(S.land, S.tFloor - 47), 1.05)
  },
  draw: (ctx, canvas, S) => drawIchigoUltScreen(ctx, canvas, S, B),
})
export const isIchigoUltActive = C.active
export const getIchigoUltStatus = C.status
export const clearIchigoUlt = C.clear
