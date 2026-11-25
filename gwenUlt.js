// gwenUlt.js — Gwen Tennyson (gwen) ULTIMATE "MANA BLADE — ANODITE JUDGMENT" as a FROZEN CINEMATIC (2026-11-24 roster-wide
// ultimate pass). Replaces the legacy inline Mana Blade (abilities.executeGwenUltimate — untouched, no longer reached while a foe
// exists) through cineRegistry (bleachUltKit.makeCineUlt):
//   cast(): same gate (not attacking / no attack cooldown), same cost (100 mana), same reach (range-independent sure hit, like
//   the legacy blade that manifested AT the foe). No foe → undefined → the legacy path.
//   DAMAGE: legacy 60+60+70+140 = 330 raw via applyScaledDamage WITHOUT the attacker (198 dealt on Naruto). Now
//   70+70+80+150 = 370 raw, same pipeline (no attacker) → ≈222 dealt (+12 %). A held guard chips 25 % (same as legacy).
// BEATS (script frame k):
//   INCANT    0-48    letterbox; push in on Gwen. The spellbook flies open, pink rune circle under her feet, her eyes glow;
//                     "Mana, hear me…" — the room dims to violet
//   PRISON   48-96    a pink hexagonal MANA SPHERE snaps shut around the foe and hoists them off the ground; MANA BLADE band
//   BLADE    96-150   her raised hand pulls a colossal cyan-pink blade out of the sky; it grows in three surges, each surge
//                     cuts a crack in the sphere (3 sure hits); camera pulls out to show the length
//   SWING   150-166   slow-mo + colour drains; the blade arcs down; white → inverted impact frame
//   BREAK   166       the sphere shatters into hex shards, a mana shockwave rings out (the big hit)
//   AFTER   170-236   shards rain and fade, the foe drops; the book snaps shut. "Lucky girl." — letterbox out
import { makeCineUlt, cineHit, sfx, ctrX, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { drawGwenUltScreen } from './gwenUltFx.js'

export const B = {
  hits: [70, 70, 80], final: 150, blockMult: 0.25,
  prisonAt: 48, liftEnd: 82, bladeAt: 96, surge: [108, 122, 136], swingAt: 150, breakAt: 164, calmAt: 196, outAt: 224, total: 236,
  stop: 22, lift: 70, slide: 220,
}

const C = makeCineUlt({
  id: 'gwen_mana_blade', keys: ['gwen'], total: B.total, maxZoom: 1.9,
  cost: f => f.ultimate?.cost ?? 100,
  gate() { return true },
  setup(S) { S.land = S.tx0 + S.dir * (S.blocked ? 90 : B.slide); S.fFace = S.dir },
  preload(S) { preloadAnims(S.caster, ['idle', 'gwenBlade', 'gwenCast', 'win']); preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown']) },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'whoosh_medium_01', 0.6); sfx(ctx, 'energy_tone_hold', 0.5) }
    if (k === 10) sfx(ctx, 'charge_hum_rise', 0.8)
    if (k === 30) { sfx(ctx, 'warp_wobble_01', 0.7); sfx(ctx, 'charge_swell_riser', 0.7) }
    if (k === B.prisonAt) { sfx(ctx, 'impact_crack_01', 0.9); sfx(ctx, 'warp_wobble_02', 0.8); cam?.shake?.(8, 12) }
    if (k === B.prisonAt + 10) sfx(ctx, 'energy_hum_low', 0.8)
    if (k === B.bladeAt) { sfx(ctx, 'sting_pitch_rise_hold', 0.9); sfx(ctx, 'charge_swell_riser', 0.9); cam?.shake?.(6, 20) }
    B.surge.forEach((at, i) => {
      if (k === at) {
        cineHit(S, B.hits[i], { blockMult: B.blockMult })
        sfx(ctx, i === 2 ? 'boom_medium_02' : 'crack_sizzle_bright', 0.9); sfx(ctx, 'swish_fast_0' + (i + 1), 0.8)
        cam?.shake?.(8 + i * 4, 12); S.hold = 3 + i
      }
    })
    if (k === B.swingAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'boom_anticipation_suck', 1) }
    if (k === B.swingAt + 10) { sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'whoosh_medium_02', 0.9) }
    if (k === B.breakAt && !S.done.brk) {
      S.done.brk = true; S.brkReal = S.real
      cineHit(S, B.final, { blockMult: B.blockMult })
      S.hold = B.stop; cam?.shake?.(22, 40)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_huge_01', 0.95); sfx(ctx, 'crack_sizzle_bright', 1)
    }
    if (k === B.breakAt + 4) sfx(ctx, 'boom_huge_02_roar', 0.8)
    if (k === B.breakAt + 14) sfx(ctx, 'rumble_tail_01', 0.9)
    if (k === B.calmAt) sfx(ctx, 'whoosh_medium_01', 0.5)
  },
  place(S, k) {
    S.pf = k; S.fx = S.fx0
    if (k < B.prisonAt) { S.tx = S.tx0; S.ty = 0 }
    else if (k < B.breakAt + 2) { S.tx = S.tx0; S.ty = B.lift * smooth((k - B.prisonAt) / (B.liftEnd - B.prisonAt)) + (k > B.liftEnd ? Math.sin(k * 0.15) * 4 : 0) }
    else {
      const u = clamp((k - B.breakAt - 2) / 34, 0, 1), e = 1 - (1 - u) ** 2
      S.tx = S.tx0 + (S.land - S.tx0) * e
      S.ty = S.blocked ? 0 : Math.max(0, B.lift * (1 - u) + Math.sin(Math.PI * clamp(u * 1.4, 0, 1)) * 40 * (1 - u))
    }
  },
  camera(S, cam, k) {
    const f = S.caster
    if (k < B.prisonAt) cam.focusOnFighter(f, 1.5 + 0.25 * smooth(k / B.prisonAt))
    else if (k < B.bladeAt) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47 - (S.ty || 0)), 1.3)
    else if (k < B.swingAt) cam.focusOnFighter(box((S.fx0 + S.tx0) / 2, S.floor - 170), 0.78)   // pull out — the blade's length
    else if (k < B.breakAt) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47 - (S.ty || 0)), 1.25)
    else if (k < B.calmAt) cam.focusOnFighter(box((S.fx0 + S.land) / 2, S.floor - 60), 0.95)
    else cam.focusOnFighter(f, 1.3)
  },
  draw: (ctx, canvas, S) => drawGwenUltScreen(ctx, canvas, S, B),
})
export const isGwenUltActive = C.active
export const getGwenUltStatus = C.status
export const clearGwenUlt = C.clear
void ctrX
