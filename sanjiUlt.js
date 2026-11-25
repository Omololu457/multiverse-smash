// sanjiUlt.js — Sanji (sanji) SUPER "DIABLE JAMBE — PARTY TABLE KICK COURSE: BŒUF BURST" as a FROZEN CINEMATIC (2026-11-24
// roster-wide "every character gets their own special ultimate" pass). Sanji's Super lives in his own command layer
// (sanji.js startSpecial('sPTKC'), ↓↘→↓↘→+A or Ultimate at 100 Heat — FREE for 5 s after a completed Course) and never reaches
// abilities.triggerUltimate. sanji.js now asks castSanjiUlt() first:
//   true      → this cinematic plays: the legacy startSuper bookkeeping (all Heat spent / the free charge consumed / Course reset)
//               at the cast, the 3 s Heat lockout + Diable Jambe doused at the end (legacy endSuper)
//   undefined → the legacy sPTKC plays exactly as before (foe out of the first cut's reach / on another level)
//   false     → refused (another cinematic is running)
// The same cast is registered for the Ultimate button through cineRegistry (registerUltCast 'sanji').
//   DAMAGE: legacy 6 cuts × 55 + heel drop 90 (130 with the leg already lit) = 420 raw through the combat pipeline WITH the
//   attacker (≈367 on Naruto). Here: six course kicks + the BŒUF BURST through applyScaledDamage WITH the attacker, tuned to
//   ≈ the same (+0-10 %); an already-lit leg still upgrades the finisher like the legacy litFinisher. A held guard chips 25 %.
// BEATS (script frame k; hit-stop holds real frames on the contacts):
//   MISE EN PLACE   0-40   letterbox, close on him lighting a cigarette, smoke curls: "A cook's legs are his pride."
//   DIABLE JAMBE   40-80   he spins on one heel until the leg glows red-hot — 悪魔風脚 — the air shimmers
//   THE COURSE     80-170  one kick lifts the foe; six cuts from every angle, each a menu card: COLLIER · ÉPAULE ·
//                          CÔTELETTE · SELLE · POITRINE · GIGOT — flame arcs, close-ups, hit-stop
//   PLAT PRINCIPAL 170-204 he springs over them, slow motion, the leg a comet
//   BŒUF BURST     204     the flaming heel comes down: white / inverted frame → a fire column, the foe slammed down
//   BON APPÉTIT    204-300 embers fall; he exhales: "Bon appétit."
import { makeCineUlt, cineHit, sfx, ctrX, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { sanjiState, scue, douseDiable, SANJI_TUNING } from './sanjiState.js'
import { SANJI_DJ_SET, sanjiSkinSet } from './sanjiData.js'
import { drawSanjiUltScreen } from './sanjiUltFx.js'

export const B = {
  cutRaw: 52, burstRaw: 120, litBurstRaw: 160, blockMult: 0.25, reach: 240,
  igniteAt: 40, courseAt: 80, cuts: [88, 101, 114, 127, 140, 153], leapAt: 170, burstAt: 204, calmAt: 252, outAt: 290, total: 300,
  cutStop: 5, stop: 26, lift: 120, slide: 160,
}
export const djAnim = (f, key) => sanjiSkinSet(SANJI_DJ_SET, f?._recolorTag)?.[key] || null

const C = makeCineUlt({
  id: 'sanji_party_table_course', keys: ['sanji'], total: B.total, maxZoom: 1.9,
  cost: f => (f._sanjiUltFree ? 0 : 100),
  gate(f, t) {
    if (!(f.onGround || f.grounded)) return false
    if (Math.abs(ctrX(t) - ctrX(f)) > B.reach || Math.abs((t.y || 0) - (f.y || 0)) > 120) return undefined   // → the legacy sPTKC (its whiff)
    return true
  },
  setup(S) {
    const f = S.caster, s = sanjiState(f)
    S.lit = !!(s && s.dj > 0)
    if (s) { s.inSuper = false; s.ptkcFree = 0; s.course = 0 }
    f.energy = 0                                         // all Heat spent (legacy startSuper)
    f._sanjiUltFree = false
    try { scue(f, 'super') } catch (_) {}
    S.land = S.tx0 + S.dir * (S.blocked ? 50 : B.slide)
    S.fFace = S.dir
  },
  finish(S) {   // legacy endSuper: the 3 s Heat lockout, the Diable Jambe doused
    const f = S.caster, s = sanjiState(f)
    if (s) { s.lockout = SANJI_TUNING.superLockout; s.superFx = null }
    try { douseDiable(f, S.lit, true) } catch (_) {}
  },
  preload(S) {
    const f = S.caster
    preloadAnims(f, ['idle', 'taunt', 'sIgnite', 'sPTKC', 'sConcasse', 'win'])
    for (const k of ['sIgnite', 'sPTKC', 'sHandstand', 'sCollier', 'sCotelette']) { const a = djAnim(f, k); if (a?.sheet) image(a.sheet) }
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown', 'hurt_air'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.5); try { scue(S.caster, 'whoosh3') } catch (_) {} }
    if (k === 20) sfx(ctx, 'crack_sizzle_bright', 0.6)
    if (k === B.igniteAt) { sfx(ctx, 'charge_swell_riser', 0.9); sfx(ctx, 'warp_wobble_01', 0.6) }
    if (k === B.igniteAt + 22) { sfx(ctx, 'boom_medium_02', 0.9); sfx(ctx, 'crack_sizzle_bright', 0.9); cam?.shake?.(10, 14) }
    if (k === B.courseAt) sfx(ctx, 'whoosh_medium_02', 0.9)
    const ci = B.cuts.indexOf(k)
    if (ci >= 0) {
      cineHit(S, B.cutRaw, { blockMult: B.blockMult, attacker: true, move: 'sPTKC' })
      S.hold = B.cutStop; S.lastCut = { i: ci, real: S.real }
      cam?.shake?.(8 + ci * 2, 10)
      sfx(ctx, 'swish_fast_0' + (1 + ci % 3), 1); sfx(ctx, ci === 5 ? 'hit_heavy_boom_01' : 'impact_hit_01', 0.9)
    }
    if (k === B.leapAt) { sfx(ctx, 'whoosh_medium_01', 1); sfx(ctx, 'pitch_drop_slowmo', 0.9) }
    if (k === B.leapAt + 12) sfx(ctx, 'sting_pitch_rise_hold', 0.8)
    if (k === B.burstAt - 6) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.burstAt && !S.done.burst) {
      S.done.burst = true; S.hitReal = S.real
      cineHit(S, S.lit ? B.litBurstRaw : B.burstRaw, { blockMult: B.blockMult, attacker: true, move: 'sPTKC' })
      S.hold = B.stop; cam?.shake?.(24, 44)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'crack_sizzle_bright', 0.9)
      try { scue(S.caster, 'superFinish') } catch (_) {}
    }
    if (k === B.burstAt + 10) sfx(ctx, 'rumble_tail_01', 1)
  },
  place(S, k) {
    S.pf = k
    // Sanji: kicks around the held foe from alternating sides; springs over for the heel drop
    if (k < B.courseAt) { S.fx = S.fx0; S.fy = 0; S.fFace = S.dir }
    else if (k < B.leapAt) {
      let i = 0; for (let j = 0; j < B.cuts.length; j++) if (k >= B.cuts[j] - 5) i = j
      const side = k < B.cuts[0] - 5 ? -1 : (i % 2 === 0 ? -1 : 1)
      S.fx = S.tx0 + side * S.dir * 62; S.fFace = side < 0 ? S.dir : -S.dir
      S.fy = k < B.cuts[0] ? 0 : [0, 70, 130, 40, 150, 90][i]
    } else if (k < B.burstAt) { const u = smooth((k - B.leapAt) / (B.burstAt - B.leapAt)); S.fx = S.tx0 - S.dir * 40 * (1 - u); S.fy = 150 + Math.sin(Math.PI * u) * 90 - u * 110; S.fFace = S.dir }
    else { S.fx = S.tx0 - S.dir * 50; S.fy = Math.max(0, 40 - (k - B.burstAt) * 4); S.fFace = S.dir }
    // the foe: lifted into the air by cut 1 and held there; driven down by the heel; skids out
    if (k < B.cuts[0]) { S.tx = S.tx0; S.ty = 0 }
    else if (k < B.burstAt) { S.tx = S.tx0; S.ty = S.blocked ? 0 : B.lift * smooth((k - B.cuts[0]) / 10) + Math.sin(k * 0.3) * 4 }
    else { const u = clamp((k - B.burstAt) / 30, 0, 1); S.tx = S.tx0 + (S.land - S.tx0) * (1 - (1 - u) ** 2); S.ty = S.blocked ? 0 : Math.max(0, B.lift * (1 - u * 4)) }
  },
  camera(S, cam, k) {
    const f = S.caster, foe = box(S.tx0, S.tFloor - 47 - (k >= B.cuts[0] && k < B.burstAt ? B.lift : 0))
    if (k < B.igniteAt) cam.focusOnFighter(f, 1.55 + 0.3 * smooth(k / B.igniteAt))
    else if (k < B.courseAt) cam.focusOnFighter(f, 1.4)
    else if (k < B.leapAt) cam.focusOnFighter(foe, 1.25)
    else if (k < B.burstAt) cam.focusOnFighter(box(S.tx0, S.floor - 220), 1.0)
    else if (k < B.calmAt) cam.focusBetween?.(box(S.tx0, S.floor - 47), box(S.land, S.tFloor - 47), 1.05)
    else cam.focusOnFighter(f, 1.35)
  },
  draw: (ctx, canvas, S) => drawSanjiUltScreen(ctx, canvas, S, B),
})

// sanji.js entry: the Super's start point (`free` = the post-Course free charge). See buggyUlt.castBuggyUlt for cancels.
export function castSanjiUlt(f, opp, world, free) {
  if (!f || !opp || opp.eliminated) return undefined
  if (Math.abs(ctrX(opp) - ctrX(f)) > B.reach || Math.abs((opp.y || 0) - (f.y || 0)) > 120 || !(f.onGround || f.grounded)) return undefined
  const sv = { attacking: f.attacking, currentAttack: f.currentAttack, currentMove: f.currentMove, attackCooldown: f.attackCooldown }
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0
  f._sanjiUltFree = !!free
  const r = C.cast(f, { getOpponent: () => opp, worldWidth: world?.stageWidth?.() || 3200 })
  f._sanjiUltFree = false
  if (r !== true) Object.assign(f, sv)
  return r
}
export const isSanjiUltActive = C.active
export const getSanjiUltStatus = C.status
export const clearSanjiUlt = C.clear
