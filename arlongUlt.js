// arlongUlt.js — Arlong (arlong) SUPER "ARLONG PARK — KIRIBACHI" as a FROZEN CINEMATIC (2026-11-24 roster-wide "every character
// gets their own special ultimate" pass). Arlong's Super lives in his own command layer (arlong.js trySpecial → 'aSuper',
// ↓↘→↓↘→+A or Ultimate at 100 Tide) — it never reaches abilities.triggerUltimate. arlong.js now asks castArlongUlt() first:
//   true      → this cinematic plays (Tide spent here; the Kiribachi returns to his hand; the 3 s Tide lockout is armed)
//   undefined → the legacy aSuper timeline plays exactly as before (foe out of reach / on another level)
//   false     → refused (another cinematic is running)
// The same cast is registered for the Ultimate button through cineRegistry (registerUltCast 'arlong').
//   DAMAGE: legacy 4 torpedo strikes × 60 + Kiribachi 120 = 360 raw through the World pipeline WITH the attacker (≈306 on
//   Naruto). Here: 4 Shark On Darts + Shark On Tooth + the Kiribachi slam through applyScaledDamage WITH the attacker, tuned
//   to ≈ the same (+0-10 %). A held guard chips 25 % of every hit.
// BEATS (script frame k; hit-stop holds real frames on the contacts):
//   SUPERIORITY    0-36   letterbox, close on his grin, the saw nose glints: "Humans are an inferior species!"
//   ARLONG PARK   36-72   the tide ROARS in — the screen floods from the floor up, caustic light, bubbles; he dives in
//   SHARK ON DARTS 72-150 a shark fin cuts the surface; four torpedo strikes from four angles, each a close-up with hit-stop
//   SHARK ON TOOTH 150-176 a spinning drill bite: 牙
//   KIRIBACHI    176-214 a geyser launches him out of the water, the Kiribachi raised overhead, slow motion
//   SLAM          214     white / inverted frame — the saw comes down, a wall of water explodes
//   RECEDE       214-300 the water drains away; "Know your place, human!"
import { makeCineUlt, cineHit, sfx, ctrX, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { arlongState, ARLONG_SUPER_LOCKOUT, acue } from './arlongState.js'
import { ARLONG_FX } from './arlongSprites.js'
import { drawArlongUltScreen } from './arlongUltFx.js'

export const B = {
  dartRaw: 44, toothRaw: 58, slamRaw: 150, blockMult: 0.25, reach: 520,
  floodAt: 36, diveAt: 54, darts: [86, 102, 118, 134], toothAt: 164, riseAt: 180, slamAt: 214,
  recedeAt: 236, calmAt: 262, outAt: 290, total: 300, dartStop: 5, stop: 26, slide: 220,
}

const C = makeCineUlt({
  id: 'arlong_park_kiribachi', keys: ['arlong'], total: B.total, maxZoom: 1.9,
  cost: 100,
  gate(f, t) {
    if (!(f.onGround || f.grounded)) return false
    if (Math.abs(ctrX(t) - ctrX(f)) > B.reach || Math.abs((t.y || 0) - (f.y || 0)) > 120) return undefined   // → the legacy aSuper
    return true
  },
  setup(S) {
    const f = S.caster
    try { const s = arlongState(f); if (s) { s.lockout = ARLONG_SUPER_LOCKOUT; s.inSuper = false; s.blade = { st: 'hand' }; s.shots = [] } } catch (_) {}
    try { acue(f, 'superStart') } catch (_) {}
    S.rise = S.tx0 - S.dir * 70
    S.land = S.tx0 + S.dir * (S.blocked ? 50 : B.slide)
    S.fFace = S.dir
  },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'taunt', 'idleFlex', 'aSuper', 'aDarts', 'aTooth', 'win'])
    for (const k of ['drill', 'jets', 'burstA', 'bladeFlat']) if (ARLONG_FX[k]?.sheet) image(ARLONG_FX[k].sheet)
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown', 'hurt_air'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.6); try { acue(S.caster, 'surface') } catch (_) {} }
    if (k === 18) sfx(ctx, 'crack_sizzle_bright', 0.5)
    if (k === B.floodAt) { sfx(ctx, 'rumble_tail_01', 1); sfx(ctx, 'whoosh_medium_01', 1); sfx(ctx, 'boom_medium_02', 0.8); cam?.shake?.(10, 30); try { acue(S.caster, 'flood') } catch (_) {} }
    if (k === B.diveAt) { sfx(ctx, 'whoosh_medium_02', 0.9); sfx(ctx, 'warp_wobble_01', 0.7) }
    if (k === 72) sfx(ctx, 'energy_tone_hold', 0.5)
    const di = B.darts.indexOf(k)
    if (di >= 0) { cineHit(S, B.dartRaw, { blockMult: B.blockMult, attacker: true, move: 'aSuper' }); S.hold = B.dartStop; S.lastHit = { i: di, real: S.real }; cam?.shake?.(9 + di * 2, 10); sfx(ctx, 'impact_hit_01', 1); sfx(ctx, 'boom_medium_01', 0.6) }
    if (B.darts.some(dk => k === dk - 8)) sfx(ctx, 'swish_fast_0' + (1 + (B.darts.findIndex(dk => k === dk - 8) % 3)), 0.9)
    if (k === B.toothAt - 12) { sfx(ctx, 'charge_hum_rise', 0.8); sfx(ctx, 'hit_flurry_01', 0.6) }
    if (k === B.toothAt) { cineHit(S, B.toothRaw, { blockMult: B.blockMult, attacker: true, move: 'aSuper' }); S.hold = 8; S.lastHit = { i: 4, real: S.real }; S.toothReal = S.real; cam?.shake?.(14, 14); sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'hit_heavy_boom_01', 0.8) }
    if (k === B.riseAt) { sfx(ctx, 'boom_huge_01', 0.9); sfx(ctx, 'whoosh_medium_01', 1); cam?.shake?.(12, 16) }
    if (k === B.riseAt + 14) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'sting_pitch_rise_hold', 0.8) }
    if (k === B.slamAt - 6) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.slamAt && !S.done.slam) {
      S.done.slam = true; S.hitReal = S.real
      cineHit(S, B.slamRaw, { blockMult: B.blockMult, attacker: true, move: 'aSuper' })
      S.hold = B.stop; cam?.shake?.(24, 44)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_huge_02_roar', 1); try { acue(S.caster, 'superSlam') } catch (_) {}
    }
    if (k === B.slamAt + 8) sfx(ctx, 'rumble_tail_01', 1)
    if (k === B.recedeAt) sfx(ctx, 'whoosh_medium_02', 0.6)
  },
  place(S, k) {
    S.pf = k
    // Arlong's engine body: parked at his mark under the water, then at the slam spot
    S.fx = k < B.riseAt ? S.fx0 : S.rise
    S.fFace = S.dir; S.fy = 0
    if (k < B.slamAt + 2) {
      const lh = S.lastHit, kick = lh ? Math.max(0, 1 - (S.real - lh.real) / 12) : 0
      S.tx = S.tx0 + (lh ? (lh.i % 2 ? -1 : 1) * S.dir * 10 * kick : 0)
      S.ty = k >= B.floodAt + 16 && k < B.slamAt ? 14 + Math.sin(k * 0.12) * 6 : 0   // caught floating in the flood
    } else {
      const u = clamp((k - B.slamAt - 2) / 36, 0, 1)
      S.tx = S.tx0 + (S.land - S.tx0) * (1 - (1 - u) ** 2); S.ty = 0
    }
  },
  camera(S, cam, k) {
    const f = S.caster, foe = box(S.tx0, S.tFloor - 47)
    if (k < B.floodAt) cam.focusOnFighter(f, 1.55 + 0.3 * smooth(k / B.floodAt))
    else if (k < B.diveAt + 14) cam.focusBetween?.(f, foe, 1.0)
    else if (k < B.riseAt) cam.focusOnFighter(foe, 1.35)
    else if (k < B.slamAt) cam.focusOnFighter(box(S.rise, S.floor - 150), 1.05)
    else if (k < B.calmAt) cam.focusBetween?.(box(S.rise, S.floor - 47), box(S.land, S.tFloor - 47), 1.0)
    else cam.focusOnFighter(box(S.rise, S.floor - 47), 1.3)
  },
  draw: (ctx, canvas, S) => drawArlongUltScreen(ctx, canvas, S, B),
})

// arlong.js entry: the Super's start point (see buggyUlt.castBuggyUlt for the cancel handling).
export function castArlongUlt(f, opp, world) {
  if (!f || !opp || opp.eliminated) return undefined
  if (Math.abs(ctrX(opp) - ctrX(f)) > B.reach || Math.abs((opp.y || 0) - (f.y || 0)) > 120 || !(f.onGround || f.grounded)) return undefined
  const sv = { attacking: f.attacking, currentAttack: f.currentAttack, currentMove: f.currentMove, attackCooldown: f.attackCooldown }
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0
  const r = C.cast(f, { getOpponent: () => opp, worldWidth: world?.stageWidth?.() || 3200 })
  if (r !== true) Object.assign(f, sv)
  return r
}
export const isArlongUltActive = C.active
export const getArlongUltStatus = C.status
export const clearArlongUlt = C.clear
