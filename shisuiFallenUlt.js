// shisuiFallenUlt.js — Shisui (Fallen) neutral ULTIMATE "瞬身 · 千の影 — BODY FLICKER: THOUSAND SHADOWS" as a FROZEN
// CINEMATIC (2026-11-24 roster-wide ult pass). Replaces the legacy neutral executeShisuiFallenUltimate path (5 blink-strikes +
// a thrust that read as a few flickers on the stage — left untouched in abilities.js, simply no longer reached for neutral).
// KEPT ON THE LEGACY PATH (cast returns undefined): the Up / Down / Flicker-Time variants (_ultVariant kotoamatsukami /
// emeraldSusanoo / flickerTime) and the ULTIMATE FATALITY gate (neutral on a near-death foe → shisuiFallenFatalityCinematic).
// Same input + cost (fighter.ultimate.cost ?? 100). DAMAGE = the legacy formula exactly: 5 × 34 + 68 raw, each through
// shisuiFallenDmg (offense × Clan-Hunter +10 % on an Uchiha × lit Mangekyō +8 %), applyScaledDamage WITHOUT the attacker
// (as legacy). A held guard chips 30 %.
// BEATS (script frame k, 60 fps; hit-stop holds real frames):
//   GLARE        0-40   letterbox, the world drains to crimson-grey; his portrait + the Mangekyō turning: 瞬身
//   VANISH      40-52   he is gone — a smear of shadow + leaves where he stood
//   1000 SHADOWS 52-150 five strikes from every angle (alternating sides / heights), each a crimson slash + hit-stop; between
//                       them a ring of after-images closes around the foe (more after every cut) — 千の影
//   THE EYE    150-186  time stops: every shadow turns to look; a crow flock wheels; the eye fills the band
//   FLICKER    186      the real one thrusts straight through — white / inverted impact frame, a screen-wide cut
//   CROWS      186-262  the shadows burst into crows and feathers; the foe crumples: "You never saw me move."
import { makeCineUlt, cineHit, sfx, ctrX, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { drawShisuiFallenUltScreen } from './shisuiFallenUltFx.js'

export const SF = {
  strikeRaw: 34, finalRaw: 68, blockMult: 0.3,
  vanishAt: 40, strikes: [58, 78, 98, 116, 132], stopAt: 150, thrustAt: 186, total: 262,
  strikeStop: 6, finalStop: 26,
}
const UCHIHA = new Set(['sasuke', 'sasuke_adult', 'sasuke_sensei', 'itachi', 'madara', 'obito', 'tobi',
  'shisui_blade', 'shisui_trinity', 'shisui_puppeteer', 'shisui_fallen'])
// abilities.js shisuiFallenDmg (not exported) — replicated 1:1
export function sfDmg(f, t, raw) {
  const off = Math.max(f.damageMultiplier || 1, f.attackMultiplier || 1)
  const clan = t && UCHIHA.has((t.rosterKey || '').toLowerCase()) ? 1.10 : 1
  const eye = f._sharinganActive ? 1.08 : 1
  return Math.round(raw * off * clan * eye)
}
// where Shisui stands for strike i: side (±1 relative to the cast direction) + height (world px)
export const STRIKE = [{ side: -1, h: 0 }, { side: 1, h: 60 }, { side: -1, h: 110 }, { side: 1, h: 20 }, { side: -1, h: 80 }]
export const strikeIndex = k => { let i = -1; for (let j = 0; j < SF.strikes.length; j++) if (k >= SF.strikes[j] - 6) i = j; return i }

const C = makeCineUlt({
  id: 'shisui_fallen_thousand_shadows', keys: ['shisui_fallen'], total: SF.total, maxZoom: 1.9,
  cost: f => f.ultimate?.cost ?? 100,
  gate(f, t) {
    const v = f._ultVariant || 'thousandShadows'
    if (v !== 'thousandShadows') return undefined                                   // Koto / Susanoo / Flicker Time → legacy
    if ((t.health || 0) > 0 && (t.health || 0) <= Math.max(120, (t.maxHealth || 1000) * 0.15)) return undefined   // fatality gate → legacy
    return true
  },
  setup(S) { S.fFace = S.dir; S.land = S.tx0 + S.dir * (S.blocked ? 40 : 120); S.uchiha = UCHIHA.has((S.target.rosterKey || '').toLowerCase()) },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'heavy', 'light', 'up', 'run', 'kunaiCast'])
    image('./shisui_fallen_finisher_uniform.png'); image('./shisui_fallen_portrait.png'); image('./shisui_fallen_mangekyou_uniform.png')
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera, f = S.caster, t = S.target
    if (k === 0) { sfx(ctx, 'pitch_drop_slowmo', 0.7); sfx(ctx, 'energy_tone_hold', 0.4) }
    if (k === 14) { sfx(ctx, 'sting_pitch_rise_hold', 0.7); sfx(ctx, 'warp_wobble_01', 0.5) }
    if (k === SF.vanishAt) { sfx(ctx, 'warp_wobble_02', 0.9); sfx(ctx, 'whoosh_medium_01', 0.9) }
    SF.strikes.forEach((at, i) => {
      if (k === at - 6) sfx(ctx, 'swish_fast_0' + (1 + i % 3), 0.9)
      if (k === at && !S.done['s' + i]) {
        S.done['s' + i] = true
        cineHit(S, sfDmg(f, t, SF.strikeRaw), { blockMult: SF.blockMult, move: 'shisui_fallen-thousand-shadows' })
        S.hold = SF.strikeStop; S.lastCut = { i, real: S.real }
        cam?.shake?.(6 + i * 2, 8)
        sfx(ctx, 'impact_crack_01', 0.9); sfx(ctx, i === 4 ? 'hit_heavy_boom_01' : 'impact_hit_01', 0.8)
      }
    })
    if (k === SF.stopAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'energy_hum_low', 0.8) }
    if (k === SF.stopAt + 10) sfx(ctx, 'charge_hum_rise', 0.8)
    if (k === SF.thrustAt - 8) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === SF.thrustAt && !S.done.final) {
      S.done.final = true; S.hitReal = S.real
      cineHit(S, sfDmg(f, t, SF.finalRaw), { blockMult: SF.blockMult, move: 'shisui_fallen-thousand-shadows-final' })
      S.hold = SF.finalStop; cam?.shake?.(20, 36)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'crack_sizzle_bright', 0.8)
    }
    if (k === SF.thrustAt + 6) { sfx(ctx, 'whoosh_medium_02', 0.9); sfx(ctx, 'swish_fast_03', 0.8) }
    if (k === SF.thrustAt + 14) sfx(ctx, 'rumble_tail_01', 0.9)
  },
  place(S, k) {
    S.pf = k
    if (k < SF.vanishAt) { S.fx = S.fx0; S.fy = 0; S.fFace = S.dir }
    else if (k < SF.stopAt) {
      const i = strikeIndex(k)
      if (i < 0) { S.fx = S.fx0; S.fy = 0 }
      else { const st = STRIKE[i]; S.fx = S.tx0 + st.side * S.dir * 58; S.fy = st.h; S.fFace = st.side > 0 ? -S.dir : S.dir }
    } else if (k < SF.thrustAt) { S.fx = S.tx0 - S.dir * 150; S.fy = 0; S.fFace = S.dir }
    else { S.fx = S.tx0 + S.dir * 110; S.fy = 0; S.fFace = S.dir }
    // the foe: rocked by each cut, lifted a little by the high ones, then crumples forward of the thrust
    if (k < SF.strikes[0]) { S.tx = S.tx0; S.ty = 0 }
    else if (k < SF.thrustAt) { const i = Math.max(0, strikeIndex(k)); S.tx = S.tx0; S.ty = S.blocked ? 0 : Math.min(60, STRIKE[i].h * 0.5) * smooth((k - SF.strikes[0]) / 10) }
    else { const u = clamp((k - SF.thrustAt) / 30, 0, 1); S.tx = S.tx0 + (S.land - S.tx0) * (1 - (1 - u) ** 2); S.ty = S.blocked ? 0 : Math.max(0, 40 * (1 - u * 3)) }
  },
  camera(S, cam, k) {
    const f = S.caster, foe = box(S.tx0, S.tFloor - 60)
    if (k < SF.vanishAt) cam.focusOnFighter(f, 1.5 + 0.3 * smooth(k / SF.vanishAt))
    else if (k < SF.stopAt) cam.focusOnFighter(foe, 1.35)
    else if (k < SF.thrustAt) cam.focusOnFighter(foe, 1.15)
    else if (k < SF.thrustAt + 40) cam.focusBetween?.(box(S.fx, S.floor - 47), box(S.land, S.tFloor - 47), 1.15)
    else cam.focusOnFighter(f, 1.3)
  },
  draw: (ctx, canvas, S) => drawShisuiFallenUltScreen(ctx, canvas, S),
})

export const isShisuiFallenUltActive = C.active
export const getShisuiFallenUltStatus = C.status
export const clearShisuiFallenUlt = C.clear
void ctrX
