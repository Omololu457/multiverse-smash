// altSukunaUlt.js — Alternate Sukuna (alt_sukuna) ULTIMATE "DOMAIN EXPANSION — MALEVOLENT SHRINE" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide "every character gets their own special ultimate" pass). Replaces the legacy inline 90-frame domain
// (abilities.executeAltSukunaUltimate — untouched, no longer reached when a foe is present) through cineRegistry
// (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (100). A domain's sure-hit: range-independent — no foe →
//   undefined → the legacy ult.
//   DAMAGE (legacy 330 raw → ≈198 dealt, no attacker boost): Dismantle 6 × 15 + Cleave 2 × 45 + Fūga 180 = 360 raw ≈ 216 dealt
//   (+9 %, no attacker boost). A held guard chips 25 %.
// BEATS (script frame k):
//   HAND-SIGN    0-42   letterbox; ink floods in; he forms the Enma hand-sign; 領域展開 calligraphy
//   SHRINE      42-96   "Malevolent Shrine." — the shrine rises out of a sea of blood behind him (the three real shrine paintings
//                        in sequence: rising → the skull heap), mouths gaping; the sky turns crimson; 伏魔御廚子
//   DISMANTLE   96-150  the sure-hit: invisible slashes fill the whole domain — hundreds of cuts carve the floor, six land (hits)
//   CLEAVE     150-172  "Cleave." — two colossal adapting cuts in an X (hits, hit-stop)
//   OPEN       178-222  "Open." — the Fūga: a fire arrow forms between his hands, drawn like a bow; the world goes dark
//   FŪGA         222    the arrow flies — white frame → ember frame → a dome of fire swallows the target
//   AFTER      232-300  fire rains and dies down; the shrine sinks back into the blood; "It is done."
import { makeCineUlt, cineHit, sfx, voice, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { drawAltSukunaUltScreen, SHRINE } from './altSukunaUltFx.js'

export const B = {
  cost: 100, blockMult: 0.25, dismantle: 15, cleave: 45, fuga: 180,
  shrineAt: 42, dismantleAt: 96, dHits: [104, 112, 120, 128, 136, 144], cleaveAt: 156, cleave2: 164, openAt: 178, fireAt: 222,
  afterAt: 232, calmAt: 262, outAt: 290, total: 300, stop: 26,
}
const VOICE = { shrine: 'sukuna_new_201_t05m39_0s.mp3', cleave: 'sukuna_new_200_t05m37_9s.mp3', open: 'sukuna_new_199_t05m36_9s.mp3', after: 'sukuna_new_335_t09m53_6s.mp3' }

const C = makeCineUlt({
  id: 'alt_sukuna_malevolent_shrine', keys: ['alt_sukuna'], total: B.total, cost: B.cost, maxZoom: 1.9,
  setup(S) { S.fFace = S.dir; S.fx = S.fx0; S.land = S.tx0 + S.dir * (S.blocked ? 60 : 140) },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'altSukunaUltCharge', 'altSukunaBeam'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
    for (const s of SHRINE) image(s)
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.8); sfx(ctx, 'boom_anticipation_suck', 0.6) }
    if (k === 20) sfx(ctx, 'charge_hum_rise', 0.8)
    if (k === B.shrineAt) { voice(ctx, S, VOICE.shrine); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'rumble_tail_01', 1); cam?.shake?.(14, 40) }
    if (k === B.shrineAt + 24) { sfx(ctx, 'boom_medium_02', 0.9); cam?.shake?.(10, 16) }
    if (k === B.dismantleAt) { sfx(ctx, 'hit_flurry_01', 1); sfx(ctx, 'swish_fast_01', 0.9) }
    B.dHits.forEach((at, i) => {
      if (k === at && !S.done['d' + i]) { S.done['d' + i] = true; cineHit(S, B.dismantle, { blockMult: B.blockMult }); S.lastHitK = k; sfx(ctx, i & 1 ? 'swish_fast_02' : 'swish_fast_03', 0.9); sfx(ctx, 'impact_hit_01', 0.6); cam?.shake?.(5, 6) }
    })
    if (k === B.cleaveAt - 6) voice(ctx, S, VOICE.cleave)
    for (const at of [B.cleaveAt, B.cleave2]) if (k === at && !S.done['c' + at]) {
      S.done['c' + at] = true; cineHit(S, B.cleave, { blockMult: B.blockMult }); S.hold = 8; S.lastHitK = k
      sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'hit_heavy_boom_01', 0.9); cam?.shake?.(14, 14)
    }
    if (k === B.openAt) { voice(ctx, S, VOICE.open); sfx(ctx, 'charge_swell_riser', 1) }
    if (k === B.openAt + 20) sfx(ctx, 'sting_pitch_rise_hold', 0.8)
    if (k === B.fireAt - 6) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.fireAt && !S.done.fuga) {
      S.done.fuga = true; S.fireReal = S.real
      cineHit(S, B.fuga, { blockMult: B.blockMult }); S.hold = B.stop; cam?.shake?.(22, 50)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'boom_huge_02_roar', 1)
    }
    if (k === B.fireAt + 10) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.calmAt) voice(ctx, S, VOICE.after)
  },
  place(S, k) {
    S.pf = k
    let tx = S.tx0, ty = 0
    if (k >= B.cleaveAt && k < B.fireAt) tx += S.dir * 8 * Math.sin(Math.PI * clamp((k - B.cleaveAt) / 12, 0, 1))
    if (k >= B.fireAt) {
      const u = clamp((k - B.fireAt) / 40, 0, 1)
      tx = S.tx0 + (S.land - S.tx0) * (1 - (1 - u) ** 2)
      ty = S.blocked ? 0 : Math.max(0, Math.sin(Math.PI * clamp(u * 1.4, 0, 1)) * 80)
    }
    S.tx = tx; S.ty = ty; S.fx = S.fx0; S.fy = 0
  },
  camera(S, cam, k) {
    const f = S.caster, tb = box(S.tx, S.tFloor - 47 - (S.ty || 0))
    if (k < B.shrineAt) cam.focusOnFighter(f, 1.5 + 0.25 * smooth(k / B.shrineAt))
    else if (k < B.dismantleAt) cam.focusOnFighter(box(S.fx0 - S.dir * 60, S.floor - 160), 0.72)
    else if (k < B.openAt) cam.focusBetween?.(f, tb, 1.1)
    else if (k < B.fireAt) cam.focusOnFighter(f, 1.45)
    else if (k < B.calmAt) cam.focusBetween?.(f, tb, 0.85)
    else cam.focusOnFighter(f, 1.25)
  },
  draw: (ctx, canvas, S) => drawAltSukunaUltScreen(ctx, canvas, S, B),
})
export const isAltSukunaUltActive = C.active
export const getAltSukunaUltStatus = C.status
export const clearAltSukunaUlt = C.clear
