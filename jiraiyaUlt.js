// jiraiyaUlt.js — Jiraiya (jiraiya) ULTIMATES as FROZEN CINEMATICS (2026-11-24 roster-wide ult pass). Two of his three
// Ultimate branches are rebuilt here; the third stays legacy:
//   • base form, neutral  → enter Hermit / Sage Mode (legacy enterJiraiyaHermit + its form-activation cinematic) — cast
//                           returns undefined, untouched.
//   • Hermit form, neutral → "仙法 · 超大玉螺旋丸 — SAGE ART: ULTRA-BIG BALL RASENGAN" (was one 220-damage projectile).
//   • Down (_ultVariant 'gamabunta', either form) → "口寄せの術 · ガマブン太 — SUMMONING: GAMABUNTA" (was a smoke puff + a
//     200-damage toad projectile).
// Same input + cost (fighter.ultimate.cost ?? 100). DAMAGE: the legacy projectiles land through the combat pipeline WITH the
// attacker and his offense (Hermit ×1.x) — measured on Naruto: Odama 312, Gamabunta 284. Here the same raw totals
// (Odama 4 × 22 + 110 = 198 — the grind's sure-hit replaces the projectile's spacing, so a little lower raw lands ≈ +6 %;
// Gamabunta 50 + 50 + 100 = 200, lands exactly the legacy 284) × offense through applyScaledDamage WITH the attacker.
// A held guard chips 25 %.
// ODAMA BEATS (k):  SAGE 0-40 (the toad markings, nature chakra: 仙法) · FORM 40-96 (palm up: a Rasengan swells to a sphere
//   bigger than he is; wind is dragged in: 超大玉螺旋丸) · DRIVE 96-112 (he leaps and slams it down on the foe) · GRIND 112-168
//   (four grinding hits, the floor carved away) · BURST 168 (white / inverted frame, spiral blast, crater) · aftermath.
// GAMABUNTA BEATS (k): SIGNS 0-40 (hand signs, a thumb bite, palm to the floor: the summoning seal) · SMOKE 40-72 (the stage
//   vanishes in a colossal smoke burst) · THE BOSS 72-120 (Gamabunta looms out of the smoke, Jiraiya on his head, pipe
//   smoking: ガマブン太) · DOSU 120-176 (the giant dagger is drawn and swept across the stage — two cuts) · CHOP 176 (the blade
//   comes down: white / inverted frame, the ground split) · POOF (the toad vanishes in smoke: "The Toad Sage strikes again!")
import { makeCineUlt, cineHit, sfx, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { drawJiraiyaUltScreen } from './jiraiyaUltFx.js'

export const OD = { grindRaw: 22, burstRaw: 110, formAt: 40, leapAt: 96, hitAt: 112, grinds: [118, 132, 146, 158], burstAt: 168, total: 250, grindStop: 4, burstStop: 26 }
export const GB = { cutRaw: 50, chopRaw: 100, smokeAt: 40, bossAt: 72, drawAt: 120, cuts: [140, 156], chopAt: 176, poofAt: 226, total: 270, cutStop: 6, chopStop: 26 }
const off = f => Math.max(f.damageMultiplier || 1, f.attackMultiplier || 1)
const TOTAL = Math.max(OD.total, GB.total)

const C = makeCineUlt({
  id: 'jiraiya_sage_ults', keys: ['jiraiya'], total: TOTAL, maxZoom: 1.9,
  cost: f => f.ultimate?.cost ?? 100,
  gate(f) {
    if (f._ultVariant === 'gamabunta') return true
    if (f._jiraiyaHermit) return true
    return undefined   // base neutral = enter Sage Mode (legacy)
  },
  setup(S) {
    const f = S.caster
    S.mode = f._ultVariant === 'gamabunta' ? 'bunta' : 'odama'
    f._ultVariant = null
    S.end = S.mode === 'bunta' ? GB.total : OD.total
    S.off = off(f); S.fFace = S.dir; S.land = S.tx0 + S.dir * (S.blocked ? 40 : S.mode === 'bunta' ? 120 : 90)
  },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'heavy', 'up', 'throw', 'win', 'jump', 'light'])
    for (const p of ['./jiraiya_hermit_transform_uniform.png', './jiraiya_gama_toad_uniform.png', './jiraiya_gama_dagger_uniform.png', './jiraiya_gama_smoke_uniform.png']) image(p)
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown', 'hurt_air'])
  },
  beats(S, ctx, k) {
    if (k > S.end) { S.frame = TOTAL; return }   // the shorter branch ends early (the controller finishes next frame)
    const cam = ctx.camera, hit = (raw, stop, big) => { cineHit(S, Math.round(raw * S.off), { blockMult: 0.25, attacker: true, move: S.mode === 'bunta' ? 'jiraiyaGamabunta' : 'jiraiyaChouOdama' }); S.hold = stop; if (big) S.hitReal = S.real; else S.lastCut = { real: S.real } }
    if (S.mode === 'odama') {
      if (k === 0) { sfx(ctx, 'energy_tone_hold', 0.6); sfx(ctx, 'pitch_drop_slowmo', 0.5) }
      if (k === 20) sfx(ctx, 'sting_pitch_rise_hold', 0.6)
      if (k === OD.formAt) { sfx(ctx, 'charge_hum_rise', 0.9); sfx(ctx, 'energy_hum_low', 0.9) }
      if (k === OD.formAt + 24) { sfx(ctx, 'charge_swell_riser', 1); cam?.shake?.(5, 30) }
      if (k === OD.leapAt) { sfx(ctx, 'whoosh_medium_01', 1); sfx(ctx, 'boom_anticipation_suck', 0.9) }
      if (k === OD.hitAt) { sfx(ctx, 'boom_medium_02', 1); cam?.shake?.(14, 16) }
      OD.grinds.forEach((at, i) => { if (k === at && !S.done['g' + i]) { S.done['g' + i] = true; hit(OD.grindRaw, OD.grindStop); sfx(ctx, 'hit_flurry_01', 0.8); sfx(ctx, 'warp_wobble_0' + (1 + i % 2), 0.6); cam?.shake?.(8 + i * 2, 8) } })
      if (k === OD.burstAt && !S.done.b) { S.done.b = true; hit(OD.burstRaw, OD.burstStop, true); cam?.shake?.(26, 44); sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'boom_huge_01', 0.9) }
      if (k === OD.burstAt + 12) sfx(ctx, 'rumble_tail_01', 1)
    } else {
      if (k === 0) sfx(ctx, 'energy_tone_hold', 0.5)
      if (k % 6 === 0 && k < 30) sfx(ctx, 'swish_fast_0' + (1 + (k / 6) % 3), 0.5)   // the hand signs
      if (k === 34) { sfx(ctx, 'impact_hit_01', 0.9); sfx(ctx, 'sting_pitch_rise_hold', 0.6) }   // palm to the floor
      if (k === GB.smokeAt) { sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'boom_medium_01', 0.8); cam?.shake?.(18, 30) }
      if (k === GB.bossAt) { sfx(ctx, 'boom_huge_02_roar', 0.9); sfx(ctx, 'rumble_tail_01', 1) }
      if (k === GB.drawAt) { sfx(ctx, 'swish_fast_03', 1); sfx(ctx, 'charge_swell_riser', 0.8) }
      GB.cuts.forEach((at, i) => { if (k === at - 5) sfx(ctx, 'whoosh_medium_0' + (1 + i), 1); if (k === at && !S.done['c' + i]) { S.done['c' + i] = true; hit(GB.cutRaw, GB.cutStop); sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'hit_heavy_boom_01', 0.8); cam?.shake?.(14, 12) } })
      if (k === GB.chopAt - 8) sfx(ctx, 'boom_anticipation_suck', 1)
      if (k === GB.chopAt && !S.done.ch) { S.done.ch = true; hit(GB.chopRaw, GB.chopStop, true); cam?.shake?.(28, 44); sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'impact_crack_01', 1) }
      if (k === GB.chopAt + 12) sfx(ctx, 'rumble_tail_01', 1)
      if (k === GB.poofAt) sfx(ctx, 'boom_medium_01', 0.8)
    }
  },
  place(S, k) {
    S.pf = k
    if (S.mode === 'odama') {
      if (k < OD.leapAt) { S.fx = S.fx0; S.fy = 0 }
      else if (k < OD.hitAt) { const u = smooth((k - OD.leapAt) / (OD.hitAt - OD.leapAt)); S.fx = S.fx0 + (S.tx0 - S.dir * 70 - S.fx0) * u; S.fy = Math.sin(Math.PI * u) * 120 }
      else if (k < OD.burstAt + 10) { S.fx = S.tx0 - S.dir * 70; S.fy = 0 }
      else { S.fx = S.tx0 - S.dir * 70; S.fy = 0 }
      S.fFace = S.dir
      if (k < OD.burstAt) { S.tx = S.tx0; S.ty = 0 }
      else { const u = clamp((k - OD.burstAt) / 30, 0, 1); S.tx = S.tx0 + (S.land - S.tx0) * (1 - (1 - u) ** 2); S.ty = S.blocked ? 0 : Math.sin(Math.PI * u) * 90 }
    } else {
      S.fx = S.fx0; S.fy = k >= GB.bossAt && k < GB.poofAt ? 330 * smooth((k - GB.bossAt) / 30) : 0; S.fFace = S.dir   // on the toad's head
      if (k < GB.chopAt) { S.tx = S.tx0; S.ty = 0 }
      else { const u = clamp((k - GB.chopAt) / 30, 0, 1); S.tx = S.tx0 + (S.land - S.tx0) * (1 - (1 - u) ** 2); S.ty = 0 }
    }
  },
  camera(S, cam, k) {
    const f = S.caster, foe = box(S.tx0, S.tFloor - 60), mid = box((S.fx0 + S.tx0) / 2, S.floor - 140)
    if (S.mode === 'odama') {
      if (k < OD.formAt) cam.focusOnFighter(f, 1.6 + 0.25 * smooth(k / OD.formAt))
      else if (k < OD.leapAt) cam.focusOnFighter(box(S.fx0, S.floor - 120), 1.1)
      else cam.focusBetween?.(box(S.fx, S.floor - 47), foe, 1.15)
    } else {
      if (k < GB.smokeAt) cam.focusOnFighter(f, 1.55)
      else if (k < GB.poofAt) cam.focusOnFighter(mid, 0.95)
      else cam.focusBetween?.(box(S.fx0, S.floor - 47), box(S.land, S.tFloor - 47), 1.1)
    }
  },
  draw: (ctx, canvas, S) => drawJiraiyaUltScreen(ctx, canvas, S),
})

export const isJiraiyaUltActive = C.active
export const getJiraiyaUltStatus = C.status
export const clearJiraiyaUlt = C.clear
