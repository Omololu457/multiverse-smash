// ninjaStormUlt.js — Ninja Storm Rangers MSv2 (ninja_storm_rangers) ULTIMATE as a FROZEN CINEMATIC (2026-11-24 roster-wide
// ultimate pass), one script per stance:
//   RED  (Shane, Wind)  "THUNDER FIST FINISH" — wind rush, a cyclone hoists the foe, an aerial crescent X, then the giant red
//                        storm fist erupts from below them with lightning crawling over it.
//   YELLOW (Dustin, Earth) "LION ZORD SLAM" — shoulder rush, rock pillars burst up under the foe, a Lion Hammer quake stomp,
//                        then the giant golden lion's paw tears out of the ground and slams them back down.
// The legacy scripted move (ninjaStormState tickUlt: 100 Focus, 14f rush, connect test, guard / whiff branches) is untouched;
// only its CLEAN connect is taken over: nsrHooks.ult(f, opp, u) → the cinematic (u.res = 'cine', the legacy ticks never fire).
//   DAMAGE: identical — NS_ULT.pool (260 raw, Twin Technique 2 × 130) split 15 / 15 / 25 / 45 % through nsStrike with the
//   combo scale frozen at the cast (fixedScale) and locked:true, one call per body (the ninja, and the clone if Twin) —
//   exactly the legacy loop, just placed on the cinematic beats.
// BEATS (script frame k): CALL 0-26 (letterbox, stance power-up strip + element aura, title) · RUSH 26-38 (hit 1) ·
//   LIFT 40 (hit 2: cyclone / rock pillars) · AERIAL / QUAKE 52-70 (hit 3) · FIST 74-96 (slow-mo, the giant fist rises) ·
//   IMPACT 96 (white → inverted, the big hit) · AFTER 100-160 (debris rain, win pose, letterbox out).
import { makeCineUlt, sfx, ctrX, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { nsrHooks, nsStrike, isYellow } from './ninjaStormState.js'
import { NS_ULT } from './ninjaStormData.js'
import { drawNinjaStormUltScreen } from './ninjaStormUltFx.js'

export const B = {
  rushAt: 32, liftAt: 44, airAt: 66, slowAt: 80, fistAt: 74, boomAt: 98, calmAt: 128, outAt: 150, total: 162,
  stop: 24, lift: 120, slide: 240,
}
const C = makeCineUlt({
  id: 'ninja_storm_ult', keys: ['ninja_storm_rangers'], total: B.total, maxZoom: 1.9,
  cost: 0,   // tickUlt already spent all the Focus
  gate() { return true },
  setup(S) { S.land = S.tx0 + S.dir * B.slide; S.fFace = S.dir; S.yellow = isYellow(S.caster) },
  preload(S) { preloadAnims(S.caster, ['nMode', 'nRush', 'nBlade', 'heavyQuake', 'jump', 'up', 'win', 'idle', 'nUltBurst', 'nUltDebris']); preloadAnims(S.target, ['hurt', 'knockdown', 'idle']) },
  beats(S, ctx, k) {
    const cam = ctx.camera, Y = S.yellow
    const hit = i => {
      const u = S.u, plan = u?.plan || { bodies: 1, each: NS_ULT.pool }, last = i === 3
      for (let b = 0; b < plan.bodies; b++) {
        const before = S.target.health, fx = S.caster?._ninja?.fx, n0 = fx ? fx.length : 0
        const r = nsStrike(S.caster, S.target, plan.each * NS_ULT.split[i], { fixedScale: u?.scale ?? 1, locked: true, move: 'nUlt', hitstun: last ? 60 : 40, kb: 0 })
        if (fx && fx.length > n0) fx.length = n0   // frozen sim: framework bursts would never age (the cinematic draws its own impacts)
        if (r === true && u) u.hits++
        S.dmg += Math.max(0, before - S.target.health); S.hits++
      }
      S.target.vx = 0; S.target.vy = 0; S.target.knockdownState = false
      if (!(S.target.health > 0)) S.ko = true
      S.lastHitK = k
    }
    if (k === 0) { sfx(ctx, Y ? 'rumble_tail_01' : 'whoosh_medium_01', 0.7); sfx(ctx, 'energy_tone_hold', 0.5) }
    if (k === 8) sfx(ctx, 'charge_hum_rise', 0.8)
    if (k === 22) sfx(ctx, Y ? 'boom_medium_01' : 'swish_fast_01', 0.7)
    if (k === B.rushAt - 4) sfx(ctx, Y ? 'whoosh_medium_02' : 'swish_fast_02', 0.9)
    if (k === B.rushAt) { hit(0); sfx(ctx, 'impact_hit_01', 1); cam?.shake?.(10, 10); S.hold = 4 }
    if (k === B.liftAt) { hit(1); sfx(ctx, Y ? 'impact_crack_01' : 'warp_wobble_01', 1); sfx(ctx, Y ? 'boom_medium_02' : 'whoosh_medium_01', 0.8); cam?.shake?.(12, 14); S.hold = 5 }
    if (k === B.airAt - 6) sfx(ctx, Y ? 'boom_anticipation_suck' : 'swish_fast_03', 0.9)
    if (k === B.airAt) { hit(2); sfx(ctx, Y ? 'hit_heavy_boom_01' : 'crack_sizzle_bright', 1); sfx(ctx, 'impact_crack_01', 0.8); cam?.shake?.(16, 16); S.hold = 7 }
    if (k === B.fistAt) { sfx(ctx, 'charge_swell_riser', 1); sfx(ctx, Y ? 'rumble_tail_01' : 'energy_hum_low', 0.9) }
    if (k === B.slowAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'sting_pitch_rise_hold', 0.8) }
    if (k === B.boomAt - 4) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.boomAt && !S.done.boom) {
      S.done.boom = true; S.boomReal = S.real
      hit(3); S.hold = B.stop; cam?.shake?.(26, 42)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'hit_heavy_boom_01', 1); if (!Y) sfx(ctx, 'crack_sizzle_bright', 1)
    }
    if (k === B.boomAt + 4) sfx(ctx, 'boom_huge_02_roar', 0.9)
    if (k === B.boomAt + 18) sfx(ctx, 'rumble_tail_01', 0.9)
  },
  place(S, k) {
    S.pf = k
    // the ninja: holds, rushes through to the foe's near side, (Red) leaps for the aerial cross, lands back
    const near = S.tx0 - S.dir * 64
    if (k < 26) S.fx = S.fx0
    else if (k < B.rushAt) S.fx = S.fx0 + (near - S.fx0) * smooth((k - 26) / (B.rushAt - 26))
    else S.fx = near
    S.fy = !S.yellow && k >= 52 && k < 72 ? Math.sin(Math.PI * (k - 52) / 20) * 150 : 0
    // the foe: hoisted by the cyclone / pillars, held, then hurled by the fist
    if (k < B.liftAt) { S.tx = S.tx0; S.ty = 0 }
    else if (k < B.boomAt) { S.tx = S.tx0; S.ty = B.lift * smooth((k - B.liftAt) / 12) + Math.sin(k * 0.25) * 4 + (S.yellow && k >= B.airAt && k < B.airAt + 6 ? -30 : 0) }
    else {
      const u = clamp((k - B.boomAt) / 40, 0, 1), e = 1 - (1 - u) ** 2
      S.tx = S.tx0 + (S.land - S.tx0) * e
      S.ty = Math.max(0, (B.lift + 140 * Math.sin(Math.PI * clamp(u * 1.2, 0, 1))) * (1 - u))
    }
  },
  camera(S, cam, k) {
    const f = S.caster
    if (k < 26) cam.focusOnFighter(f, 1.5 + 0.2 * smooth(k / 26))
    else if (k < B.liftAt + 6) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47 - (S.ty || 0)), 1.3)
    else if (k < B.fistAt) cam.focusOnFighter(box(S.tx0 - S.dir * 30, S.tFloor - 100 - (S.ty || 0) * 0.5), 1.2)
    else if (k < B.boomAt) cam.focusOnFighter(box(S.tx0, S.tFloor - 110), 0.85)
    else if (k < B.calmAt) cam.focusOnFighter(box((S.tx0 + S.land) / 2, S.floor - 90), 0.85)
    else cam.focusOnFighter(f, 1.3)
  },
  draw: (ctx, canvas, S) => drawNinjaStormUltScreen(ctx, canvas, S, B),
})
// the Ninja Storm Ultimate goes through ninjaStorm.js's own command layer, never triggerUltimate
registerUltCast('ninja_storm_rangers', () => undefined)
// a training reset clears the fighter's _nsr state without clearFreezeCines — end the cinematic with it
registerFreezeCine('ninja_storm_ult_guard', { active: () => { if (C.active() && (!C.S.caster?._nsr || C.S.caster._nsr !== C.S.st)) C.clear(); return false }, update() {}, clear() {} })

nsrHooks.ult = (f, opp, u) => {
  if (C.active() || !f || !opp || !(opp.health > 0)) return false
  C.S.u = u; C.S.st = f._nsr   // survives into setup (cast keeps unknown keys)
  const keep = { cd: f.attackCooldown, a: f.attacking, ca: f.currentAttack, cm: f.currentMove }
  f.attacking = false; f.attackCooldown = 0
  const ok = C.cast(f, { getOpponent: () => opp }) === true
  if (!ok) { delete C.S.u; delete C.S.st; f.attacking = keep.a; f.currentAttack = keep.ca; f.currentMove = keep.cm; f.attackCooldown = keep.cd }
  return ok
}
export const isNinjaStormUltActive = C.active
export const getNinjaStormUltStatus = C.status
export const clearNinjaStormUlt = C.clear
void ctrX
