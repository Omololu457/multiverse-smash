// miwaUlt.js — Kasumi Miwa (miwa) ULTIMATE "SIMPLE DOMAIN — BATTŌ: THREE DRAWS" as a FROZEN CINEMATIC (2026-11-24 roster-wide
// "every character gets their own special ultimate" pass). Replaces the legacy single quick-draw (abilities.executeMiwaUltimate +
// miwaUltimateCinematic.js — both untouched, no longer reached when a foe is present) through cineRegistry (bleachUltKit):
//   cast(): same gate (not attacking / no attack cooldown / not already mid-cinematic), same cost (100). Sure-hit and
//   range-independent like the legacy (the Simple Domain swells until the foe is inside it) — no foe → the legacy ult.
//   DAMAGE (legacy 280 raw → 168 dealt, no attacker boost): three draws 60 + 60 + 60 + the sheathe 130 = 310 raw ≈ 186 dealt
//   (+11 %, no attacker boost). A held guard chips 25 %.
// BEATS (script frame k):
//   STANCE     0-40   letterbox; she drops into the battō stance; "KANI RYŌIKI!" — the Simple Domain's pale circle opens at her
//                     feet; 簡易領域
//   THE FIELD 40-78   the circle swells across the stage until the foe stands inside it; hand on the hilt (close-up);
//                     "Shinkage-ryū…"; 新陰流; every grain of dust in the circle hangs still
//   DRAW 1      80    an iai dash straight through them — a white cut across the screen (hit)
//   DRAW 2      96    back through the other way (hit)
//   DRAW 3     114    "From the neck!" — a rising draw past them; she lands on the far side, back turned (hit)
//   SHEATHE  130-164  time stops: the three cuts hang in the air, glowing; she slides the blade home, slowly…
//   CHIN        164   the guard clicks against the scabbard: every cut detonates — white frame, inverted frame, petals of light
//   AFTER    176-260  the foe crumples; the circle dissolves; "I can fight, too!"
import { makeCineUlt, cineHit, sfx, voice, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { drawMiwaUltScreen } from './miwaUltFx.js'

export const B = {
  cost: 100, blockMult: 0.25, draw: 60, sheathe: 130,
  fieldAt: 40, d1: 80, d2: 96, d3: 114, sheatheAt: 130, chinAt: 164, afterAt: 176, calmAt: 196, outAt: 248, total: 260,
  stop: 24, pass: 100,
}
const VOICE = { open: 'miwa_390_t12m42_3s.mp3', school: 'miwa_506_t16m31_4s.mp3', neck: 'miwa_494_t16m09_6s.mp3', after: 'miwa_438_t14m18_3s.mp3' }

const C = makeCineUlt({
  id: 'miwa_simple_domain_batto', keys: ['miwa'], total: B.total, cost: B.cost, maxZoom: 1.9,
  setup(S) { S.fFace = S.dir; S.fx = S.fx0; S.cuts = []; S.land = S.tx0 },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'ultimate', 'iaiDash', 'light', 'miwaG3', 'miwaG2'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    const draw = (n, ang) => {
      cineHit(S, B.draw, { blockMult: B.blockMult }); S.hold = 6; S.cuts.push({ k, ang, real: S.real })
      sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'impact_hit_01', 0.9); sfx(ctx, n === 3 ? 'crack_sizzle_bright' : 'swish_fast_02', 0.8); cam?.shake?.(8, 8)
    }
    if (k === 0) { voice(ctx, S, VOICE.open); sfx(ctx, 'whoosh_medium_02', 0.6) }
    if (k === 8) sfx(ctx, 'energy_tone_hold', 0.6)
    if (k === B.fieldAt) { sfx(ctx, 'warp_wobble_01', 0.7); sfx(ctx, 'charge_hum_rise', 0.7) }
    if (k === B.fieldAt + 6) voice(ctx, S, VOICE.school)
    if (k === B.d1 - 6) sfx(ctx, 'boom_anticipation_suck', 0.9)
    if (k === B.d1) draw(1, -0.05)
    if (k === B.d2) draw(2, 0.12)
    if (k === B.d3 - 8) voice(ctx, S, VOICE.neck)
    if (k === B.d3) draw(3, -0.6)
    if (k === B.sheatheAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'sting_pitch_rise_hold', 0.7) }
    if (k === B.chinAt - 2) sfx(ctx, 'impact_crack_01', 0.6)
    if (k === B.chinAt && !S.done.chin) {
      S.done.chin = true; S.chinReal = S.real
      cineHit(S, B.sheathe, { blockMult: B.blockMult }); S.hold = B.stop; cam?.shake?.(18, 36)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 0.9); sfx(ctx, 'crack_sizzle_bright', 1); sfx(ctx, 'hit_heavy_boom_01', 0.9)
    }
    if (k === B.chinAt + 10) sfx(ctx, 'rumble_tail_01', 0.8)
    if (k === B.calmAt) voice(ctx, S, VOICE.after)
  },
  place(S, k) {
    S.pf = k
    const d = S.dir, T = S.tx0, far = T + d * B.pass, near = T - d * B.pass
    const dash = (a, b, at) => a + (b - a) * smooth(clamp((k - at + 5) / 5, 0, 1))
    if (k < B.d1 - 5) { S.fx = S.fx0; S.fFace = d }
    else if (k < B.d2 - 5) { S.fx = dash(S.fx0, far, B.d1); S.fFace = k < B.d1 + 8 ? d : -d }
    else if (k < B.d3 - 5) { S.fx = dash(far, near, B.d2); S.fFace = k < B.d2 + 8 ? -d : d }
    else { S.fx = dash(near, far + d * 20, B.d3); S.fFace = d }   // she ends past them, back turned
    S.tx = T; S.fy = 0
    S.ty = 0
  },
  camera(S, cam, k) {
    const f = S.caster, tb = box(S.tx, S.tFloor - 47)
    if (k < B.fieldAt) cam.focusOnFighter(f, 1.5 + 0.25 * smooth(k / B.fieldAt))
    else if (k < B.d1 - 6) cam.focusBetween?.(f, tb, 0.95)
    else if (k < B.sheatheAt) cam.focusBetween?.(box(S.tx0 - S.dir * B.pass, S.floor - 47), box(S.tx0 + S.dir * B.pass, S.floor - 47), 1.25)
    else if (k < B.chinAt) cam.focusOnFighter(f, 1.4 + 0.2 * smooth((k - B.sheatheAt) / 30))
    else if (k < B.calmAt) cam.focusBetween?.(f, tb, 1.15)
    else cam.focusOnFighter(f, 1.3)
  },
  draw: (ctx, canvas, S) => drawMiwaUltScreen(ctx, canvas, S, B),
})
export const isMiwaUltActive = C.active
export const getMiwaUltStatus = C.status
export const clearMiwaUlt = C.clear
