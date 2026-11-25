// luffyUlt.js — Monkey D. Luffy (luffy) ULTIMATE "GEAR 5 — GOMU GOMU NO BAJRANG GUN" as a FROZEN CINEMATIC (2026-11-24
// roster-wide "every character gets their own special ultimate" pass). Replaces the legacy generic 4-contact lfFinale
// (luffy.executeLuffyUltimate — untouched, still the WHIFF path) through cineRegistry (bleachUltKit.makeCineUlt):
//   cast(): same gate as the legacy finale (grounded, not attacking / no attack cooldown), same cost (lfFinale cost 100). In the
//   finale's reach (its contacts reach 160-230 px + the lunge ≈ 260 px, same level) → the cinematic, sure-hit. Out of reach →
//   undefined → the legacy lfFinale plays and whiffs exactly as today (lfFinaleMiss).
//   DAMAGE: legacy 4 contacts 30+30+40+120 (×1.7) through the combat pipeline = 280 on Naruto. Here: the fist lands (one big hit)
//   + two crater-grind ticks through applyScaledDamage WITH the attacker (roster boost, as the pipeline did) — tuned ≈ +10 %.
// BEATS (script frame k; the slam holds B.stop real frames of hit-stop):
//   DRUMS        0-44   letterbox; push in on his chest — DUN · DUN · DUN, the Drums of Liberation, heartbeat rings
//   GEAR 5      44-110  white burst; hair and clothes turn white, a ring of clouds and steam, GEAR 5 band, 太陽の神ニカ
//   TOON       110-150  the sun-god laugh: cartoon squash-and-stretch bounces, HAHAHA bubbles, the foe's eyes pop
//   LEAP       150-168  he springs straight up out of frame; the camera pulls out to the sky
//   INFLATE    168-212  his arm balloons into a colossal fist over the whole stage; black-red Haki lightning coils it;
//                       "GOMU GOMU NO…" — slow motion, the colour drains
//   BAJRANG GUN 212-226 the fist falls: speed lines, the ground shadow swells
//   IMPACT     226      white frame → inverted Haki frame → hit-stop; a dome shockwave, a crater, cloud ring
//   AFTERMATH  226-300  the crater grinds (two more ticks), the fist deflates, he drops back down, the white fades —
//                       "Shishishi!" — back to the straw hat
import { makeCineUlt, cineHit, sfx, ctrX, clamp, smooth, box, preloadAnims, animOf, image } from './bleachUltKit.js'
import { drawLuffyUltScreen } from './luffyUltFx.js'

export const B = {
  raws: [215, 65, 65], blockMult: 0.2, reach: 260,
  beats: [8, 20, 32], g5At: 44, toonAt: 110, leapAt: 150, inflateAt: 168, slamAt: 212, hitAt: 226, tick2: 234, tick3: 242,
  calmAt: 262, outAt: 290, total: 300, stop: 26, leapH: 230, slide: 180,
}

// the Gear 5 sheet of the same action (every luffy action ships a __gear5 recolour); keeps the frame data of the worn skin
const g5Cache = new Map()
export function g5(f, key) {
  const a = animOf(f, key); if (!a?.sheet) return null
  const k = a.sheet + '|' + key
  let r = g5Cache.get(k)
  if (!r) { r = { ...a, sheet: /__gear5\.png$/.test(a.sheet) ? a.sheet : a.sheet.replace(/(__[a-z0-9_]+)?\.png$/i, '__gear5.png') }; g5Cache.set(k, r) }
  return r
}

const C = makeCineUlt({
  id: 'luffy_gear5_bajrang', keys: ['luffy'], total: B.total, maxZoom: 1.9,
  cost: f => f.ultimate?.cost ?? 100,
  gate(f, t) {
    if (!(f.onGround || f.grounded)) return false                                   // the legacy finale is grounded-only
    if (Math.abs(ctrX(t) - ctrX(f)) > B.reach || Math.abs((t.y || 0) - (f.y || 0)) > 120) return undefined   // → legacy whiff
    return true
  },
  setup(S) {
    S.land = S.tx0 + S.dir * (S.blocked ? 70 : B.slide)
    S.fFace = S.dir; S.fy = 0
  },
  preload(S) {
    const f = S.caster
    preloadAnims(f, ['idle', 'win', 'jump', 'fall', 'lfPiston', 'land'])
    for (const k of ['idle', 'intro', 'jump', 'fall', 'lfPiston', 'win', 'land']) { const a = g5(f, k); if (a) image(a.sheet) }
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown', 'hurt_heavy'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) sfx(ctx, 'energy_hum_low', 0.6)
    if (B.beats.includes(k)) { sfx(ctx, 'boom_medium_01', 0.75 + 0.1 * B.beats.indexOf(k)); cam?.shake?.(4 + 3 * B.beats.indexOf(k), 8) }
    if (k === 38) sfx(ctx, 'boom_anticipation_suck', 0.9)
    if (k === B.g5At) { sfx(ctx, 'impact_frame_boom_long', 0.9); sfx(ctx, 'boom_huge_01', 0.9); sfx(ctx, 'crack_sizzle_bright', 0.6); cam?.shake?.(14, 24) }
    if (k === B.g5At + 10) sfx(ctx, 'charge_swell_riser', 0.7)
    if (k === B.toonAt || k === B.toonAt + 14 || k === B.toonAt + 26) sfx(ctx, 'warp_wobble_0' + (1 + ((k - B.toonAt) & 1)), 0.8)
    if (k === B.leapAt) { sfx(ctx, 'whoosh_medium_02', 1); sfx(ctx, 'swish_fast_02', 0.8) }
    if (k === B.inflateAt) { sfx(ctx, 'charge_hum_rise', 0.9); sfx(ctx, 'warp_wobble_02', 0.7) }
    if (k === B.inflateAt + 20) { sfx(ctx, 'crack_sizzle_bright', 0.9); sfx(ctx, 'sting_pitch_rise_hold', 0.8); cam?.shake?.(6, 20) }
    if (k === B.slamAt - 8) sfx(ctx, 'pitch_drop_slowmo', 0.9)
    if (k === B.slamAt) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'whoosh_medium_01', 1) }
    if (k === B.hitAt && !S.done.hit) {
      S.done.hit = true; S.hitReal = S.real
      cineHit(S, B.raws[0], { blockMult: B.blockMult, attacker: true, move: 'lfFinale' })
      S.hold = B.stop
      cam?.shake?.(24, 46)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'impact_crack_01', 1)
    }
    if (k === B.hitAt + 2) { sfx(ctx, 'boom_huge_01', 1); cam?.shake?.(20, 30) }
    if (k === B.tick2 || k === B.tick3) { cineHit(S, B.raws[k === B.tick2 ? 1 : 2], { blockMult: B.blockMult, attacker: true, move: 'lfFinale' }); sfx(ctx, 'boom_medium_02', 0.9); cam?.shake?.(12, 12) }
    if (k === B.hitAt + 12) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.hitAt + 44) sfx(ctx, 'rumble_tail_01', 0.6)
    if (k === B.calmAt) sfx(ctx, 'warp_wobble_01', 0.6)
  },
  place(S, k) {
    S.pf = k
    // Luffy: bounces in the toon beat, springs up for the slam, drops back down after
    if (k < B.toonAt) S.fy = 0
    else if (k < B.leapAt) { const p = (k - B.toonAt) % 14; S.fy = Math.sin(Math.PI * p / 14) * 26 }
    else if (k < B.inflateAt) S.fy = B.leapH * smooth((k - B.leapAt) / (B.inflateAt - B.leapAt))
    else if (k < B.hitAt + 14) S.fy = B.leapH + Math.sin((k - B.inflateAt) * 0.12) * 6
    else if (k < B.calmAt) { const u = clamp((k - B.hitAt - 14) / (B.calmAt - B.hitAt - 14), 0, 1); S.fy = B.leapH * (1 - u * u) }
    else S.fy = 0
    // he springs up AND back so the fist has the sky over the foe to itself; drifts back in on the way down
    const back = k < B.leapAt ? 0 : k < B.inflateAt ? smooth((k - B.leapAt) / (B.inflateAt - B.leapAt)) : k < B.hitAt + 14 ? 1 : 1 - smooth((k - B.hitAt - 14) / (B.calmAt - B.hitAt - 14))
    S.fx = S.fx0 - S.dir * 150 * back
    // the foe: pinned, then crushed into the crater, then knocked clear
    if (k < B.tick3 + 6) { S.tx = S.tx0; S.ty = 0 }
    else { const u = clamp((k - B.tick3 - 6) / 30, 0, 1), e = 1 - (1 - u) ** 2; S.tx = S.tx0 + (S.land - S.tx0) * e; S.ty = S.blocked ? 0 : Math.sin(Math.PI * u) * 60 }
  },
  camera(S, cam, k) {
    const f = S.caster
    if (k < B.g5At) cam.focusOnFighter(f, 1.6 + 0.2 * smooth(k / B.g5At))
    else if (k < B.toonAt) cam.focusOnFighter(f, 1.45)
    else if (k < B.leapAt) cam.focusBetween?.(f, S.target, 1.2)
    else if (k < B.slamAt) cam.focusOnFighter(box((S.fx0 - S.dir * 150 + S.tx0) / 2, S.floor - 200), 0.6)       // the sky + the whole fist
    else if (k < B.hitAt) cam.focusOnFighter(box(S.tx0, S.floor - 120), 0.8)
    else if (k < B.calmAt) cam.focusOnFighter(box(S.tx0, S.floor - 60), 0.95)
    else cam.focusOnFighter(f, 1.3)
  },
  draw: (ctx, canvas, S) => drawLuffyUltScreen(ctx, canvas, S, B),
})
export const isLuffyUltActive = C.active
export const getLuffyUltStatus = C.status
export const clearLuffyUlt = C.clear
