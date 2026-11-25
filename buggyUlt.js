// buggyUlt.js — Buggy the Clown (buggy) SUPER "BARA BARA FESTIVAL — BUGGY BALL!!" as a FROZEN CINEMATIC (2026-11-24 roster-wide
// "every character gets their own special ultimate" pass). Buggy's Super lives in his own command layer (buggy.js fire('bSuper'),
// 236236+A or Ultimate at 100 Chop) — it never reaches abilities.triggerUltimate. buggy.js now asks castBuggyUlt() first:
//   true      → this cinematic plays (Chop spent here, parts recalled, the 3 s Chop lockout armed — the legacy bookkeeping)
//   undefined → the legacy bSuper move plays exactly as before (foe out of the barrage's reach / on another level)
//   false     → refused (another cinematic is running)
// The same cast is registered for the Ultimate button through cineRegistry (registerUltCast 'buggy') so both inputs agree.
//   DAMAGE: legacy 4 balls × 55 + 3 stabs × 20 + rush 90 = 370 raw through the World damage pipeline WITH the attacker
//   (≈296 on Naruto). Here: 3 hand stabs + a foot + the BUGGY BALL + the knife-ball rush, applyScaledDamage WITH the attacker,
//   tuned to ≈ the same (+0-10 %). A held guard chips 25 % of every hit.
// BEATS (script frame k; hit-stop holds real frames on the contacts):
//   SHOWTIME      0-36   letterbox, circus spotlight on him, the red nose glints: "Gyahahaha! Time for a FLASHY show!"
//   BARA BARA     36-96  he bursts into pieces — head, gloved hands with knives, boots — that circle the foe; confetti;
//                        BARA BARA FESTIVAL circus banner
//   CHOP STABS    96-150 the hands dart in: three knife stabs and a boot to the face, each a close-up with hit-stop
//   REASSEMBLE   150-176 the pieces fly home and snap back together
//   CANNON       176-206 the cannon cart rolls in loaded with a colossal BUGGY BALL; the fuse fizzes; the foe panics
//   FIRE / IMPACT 206-218 BOOM — the ball arcs over in slow motion → white / inverted frame → a circus-sized explosion
//   KNIFE BALL   244     out of the smoke he rolls through as a spinning ball of knives
//   FLASHY!      262-300 he strikes his pose under the spotlight: 派手に!
import { makeCineUlt, cineHit, sfx, ctrX, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { buggyState, BUGGY_SUPER_LOCKOUT, bcue } from './buggyState.js'
import { recallParts } from './buggyParts.js'
import { BUGGY_PARTS, BUGGY_FX } from './buggySprites.js'
import { drawBuggyUltScreen } from './buggyUltFx.js'

export const B = {
  stabRaw: 20, footRaw: 26, ballRaw: 230, rushRaw: 84, blockMult: 0.25, reach: 460,
  splitAt: 36, festAt: 44, stabs: [104, 120, 136], footAt: 146, homeAt: 150, joinAt: 172, cartAt: 176, fireAt: 206, hitAt: 218,
  rushAt: 236, rushHit: 244, calmAt: 262, outAt: 290, total: 300, stabStop: 4, stop: 26, launch: 190, slide: 240,
}

const C = makeCineUlt({
  id: 'buggy_bara_festival', keys: ['buggy'], total: B.total, maxZoom: 1.9,
  cost: 100,
  gate(f, t) {
    if (!(f.onGround || f.grounded)) return false
    if (Math.abs(ctrX(t) - ctrX(f)) > B.reach || Math.abs((t.y || 0) - (f.y || 0)) > 120) return undefined   // → the legacy bSuper
    return true
  },
  setup(S) {
    const f = S.caster
    try { recallParts(f) } catch (_) {}
    try { const s = buggyState(f); if (s) { s.lockout = BUGGY_SUPER_LOCKOUT; s.inSuper = false } } catch (_) {}
    try { bcue(f, 'superStart') } catch (_) {}
    S.cart = S.fx0 - S.dir * 170
    S.land = S.tx0 + S.dir * (S.blocked ? 60 : B.slide)
    S.past = S.land + S.dir * 90
    S.fFace = S.dir
  },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'taunt', 'bChopped', 'bSuper', 'bStab', 'win', 'bCannon'])
    for (const p of Object.values(BUGGY_PARTS)) image(p.idle.sheet)
    for (const k of ['ballBuggy', 'knife', 'cartGhost']) if (BUGGY_FX[k]?.sheet) image(BUGGY_FX[k].sheet)
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.5); sfx(ctx, 'sting_pitch_rise_hold', 0.5) }
    if (k === 20) sfx(ctx, 'crack_sizzle_bright', 0.5)
    if (k === B.splitAt) { sfx(ctx, 'boom_medium_01', 0.8); sfx(ctx, 'warp_wobble_01', 0.9); cam?.shake?.(8, 10) }
    if (k === B.festAt + 6 || k === B.festAt + 26) sfx(ctx, 'whoosh_medium_0' + (k === B.festAt + 6 ? 1 : 2), 0.7)
    const si = B.stabs.indexOf(k)
    if (si >= 0) { cineHit(S, B.stabRaw, { blockMult: B.blockMult, attacker: true, move: 'bSuper' }); S.hold = B.stabStop; S.lastStab = { i: si, real: S.real }; cam?.shake?.(7 + si * 2, 8); sfx(ctx, 'swish_fast_0' + (1 + si), 1); sfx(ctx, 'impact_hit_01', 0.9) }
    if (B.stabs.some(sk => k === sk - 5)) sfx(ctx, 'whoosh_medium_02', 0.5)
    if (k === B.footAt) { cineHit(S, B.footRaw, { blockMult: B.blockMult, attacker: true, move: 'bSuper' }); S.hold = B.stabStop + 2; S.lastStab = { i: 3, real: S.real }; cam?.shake?.(12, 10); sfx(ctx, 'hit_heavy_boom_01', 0.7) }
    if (k === B.homeAt) sfx(ctx, 'warp_wobble_02', 0.8)
    if (k === B.joinAt) { sfx(ctx, 'impact_crack_01', 0.7); cam?.shake?.(5, 6) }
    if (k === B.cartAt) { sfx(ctx, 'rumble_tail_01', 0.8); sfx(ctx, 'charge_hum_rise', 0.7) }
    if (k === B.cartAt + 14) sfx(ctx, 'crack_sizzle_bright', 0.8)
    if (k === B.fireAt - 4) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.fireAt) { sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'pitch_drop_slowmo', 0.8); cam?.shake?.(16, 14) }
    if (k === B.hitAt && !S.done.hit) {
      S.done.hit = true; S.hitReal = S.real
      cineHit(S, B.ballRaw, { blockMult: B.blockMult, attacker: true, move: 'bSuper' })
      S.hold = B.stop; cam?.shake?.(26, 48)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_medium_02', 0.9)
    }
    if (k === B.hitAt + 10) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.rushAt) { sfx(ctx, 'swish_fast_03', 0.9); sfx(ctx, 'hit_flurry_01', 0.8) }
    if (k === B.rushHit) { cineHit(S, B.rushRaw, { blockMult: B.blockMult, attacker: true, move: 'bSuper' }); S.hold = 8; S.rushReal = S.real; cam?.shake?.(14, 14); sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'boom_medium_01', 0.9) }
    if (k === B.calmAt) sfx(ctx, 'sting_pitch_rise_hold', 0.5)
  },
  place(S, k) {
    S.pf = k
    if (k < B.cartAt) S.fx = S.fx0
    else if (k < B.rushAt) S.fx = S.fx0 + (S.cart - S.fx0) * smooth((k - B.cartAt) / 12)
    else if (k < B.rushHit + 10) S.fx = S.cart + (S.past - S.cart) * smooth((k - B.rushAt) / (B.rushHit + 10 - B.rushAt))
    else S.fx = S.past
    S.fFace = k >= B.rushHit + 10 ? -S.dir : S.dir
    // the foe: rocked by the stabs, blasted up by the ball, rolled over by the knife-ball
    if (k < B.hitAt + 2) {
      const ls = S.lastStab, kick = ls ? Math.max(0, 1 - (S.real - ls.real) / 10) : 0
      S.tx = S.tx0 + (ls ? (ls.i % 2 ? -1 : 1) * S.dir * 8 * kick : 0) + (k >= B.cartAt && k < B.fireAt ? Math.sin(k * 1.3) * 2 : 0); S.ty = 0
    } else {
      const u = clamp((k - B.hitAt - 2) / 26, 0, 1)
      S.tx = S.tx0 + (S.land - S.tx0) * (1 - (1 - u) ** 2)
      S.ty = S.blocked ? 0 : Math.max(0, Math.sin(Math.PI * u) * B.launch)
    }
  },
  camera(S, cam, k) {
    const f = S.caster, foe = box(S.tx0, S.tFloor - 47)
    if (k < B.splitAt) cam.focusOnFighter(f, 1.55 + 0.25 * smooth(k / B.splitAt))
    else if (k < B.homeAt) cam.focusOnFighter(foe, 1.3)
    else if (k < B.cartAt) cam.focusBetween?.(f, foe, 1.15)
    else if (k < B.fireAt) cam.focusOnFighter(box(S.cart, S.floor - 60), 1.4)
    else if (k < B.hitAt) cam.focusBetween?.(box(S.cart, S.floor - 47), foe, 1.0)
    else if (k < B.calmAt) cam.focusOnFighter(box((S.tx0 + S.land) / 2, S.tFloor - 90), 0.9)
    else cam.focusOnFighter(f, 1.35)
  },
  draw: (ctx, canvas, S) => drawBuggyUltScreen(ctx, canvas, S, B),
})

// buggy.js entry: the Super's start point. Out of reach / another level → undefined (legacy bSuper). A super CANCEL out of a
// connected normal arrives mid-attack: the cast clears that attack only when the cinematic actually takes over.
export function castBuggyUlt(f, opp, world) {
  if (!f || !opp || opp.eliminated) return undefined
  if (Math.abs(ctrX(opp) - ctrX(f)) > B.reach || Math.abs((opp.y || 0) - (f.y || 0)) > 120 || !(f.onGround || f.grounded)) return undefined
  const sv = { attacking: f.attacking, currentAttack: f.currentAttack, currentMove: f.currentMove, attackCooldown: f.attackCooldown }
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0
  const r = C.cast(f, { getOpponent: () => opp, worldWidth: world?.stageWidth?.() || 3200 })
  if (r !== true) Object.assign(f, sv)
  return r
}
export const isBuggyUltActive = C.active
export const getBuggyUltStatus = C.status
export const clearBuggyUlt = C.clear
