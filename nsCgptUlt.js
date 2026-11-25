// nsCgptUlt.js — Ninja Storm CGPT (ninja_storm_cgpt) ULTIMATE "TWIN TEMPEST — FAULTLINE CATACLYSM" as a FROZEN CINEMATIC
// (2026-11-24 roster-wide ultimate pass). The legacy in-engine sequence (nsCgpt.cgptUlt: full meter, opening sword strike that
// must connect, then clone spiral → dive → eruption) keeps its start, cost, opening strike and whiff / guard branches; once the
// opening sword CONNECTS, cgptHooks.ult hands the rest of the schedule to this cinematic (the legacy steps stop: G.ox = null).
//   DAMAGE: the same explicit CGPT_ULT schedule after the opener — spiral 6 × 28 (clone, Ranger, clone, … — the clone's turns
//   never land the KO, noKO like the legacy), descending strike 60, eruption 150 — through ninja.js nsStrike with the combo
//   scale frozen at the opener (fixedScale) and locked:true, exactly the legacy strike() options.
// BEATS (script frame k):
//   TWIN      0-24   letterbox; the sword contact freezes; smoke bursts on the far side and the SHADOW CLONE steps out of it
//   TEMPEST  24-78   a wind spiral lifts the foe; Ranger and clone trade six cross-cuts around them, rising with every turn
//   APEX     78-94   the real Ranger tops the spiral, upside down (slow-mo); the clone holds below
//   DIVE     94      the descending strike drives the foe into the floor (hit)
//   FAULTLINE 106    every crack in the arena answers: the earth dome erupts (white → inverted, the big hit)
//   AFTER   110-190  rock rain; the clone dissolves; victory pose — letterbox out
import { makeCineUlt, sfx, ctrX, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { cgptHooks, CGPT_ULT, CGPT_CLONE } from './nsCgpt.js'
import { nsStrike } from './ninja.js'
import { drawCgptUltScreen } from './nsCgptUltFx.js'

export const B = {
  cloneAt: 8, spiral: [28, 36, 44, 52, 60, 68], apexAt: 78, slowAt: 84, diveAt: 94, eruptAt: 106, cloneOut: 140, calmAt: 150, outAt: 178, total: 190,
  stop: 24, rise: 170, slide: 250,
}
const C = makeCineUlt({
  id: 'ns_cgpt_twin_tempest', keys: ['ninja_storm_cgpt'], total: B.total, maxZoom: 1.9,
  cost: 0,   // the legacy start already spent the meter
  gate() { return true },
  setup(S) { S.land = S.tx0 + S.dir * B.slide; S.fFace = S.dir },
  preload(S) { preloadAnims(S.caster, ['idle', 'sword1', 'sword2', 'swordRise', 'kickHeavy', 'stringEnd', 'airSpin', 'superDive', 'dropDive', 'superSlam', 'landRecover', 'domeFx', 'superTornado', 'win', 'guard', 'nsVanishOut']); preloadAnims(S.target, ['hurt', 'knockdown']) },
  beats(S, ctx, k) {
    const cam = ctx.camera, u = S.u, g = S.g
    const strike = (dmg, o = {}) => {
      const t = S.target; if (!t || !(t.health > 0)) return
      const before = t.health, fx = S.caster?._ninja?.fx, n0 = fx ? fx.length : 0
      const r = nsStrike(S.caster, t, dmg, { fixedScale: u?.scale ?? 1, locked: true, hitstun: o.hitstun ?? 70, kb: 0, move: 'sSuper', damageType: o.type || 'slash', noKO: !!o.noKO, blockstun: 22 })
      // the sim is frozen under the cinematic, so the framework's world bursts (nsFx 'wind' afterimages, hit sparks) never age —
      // they stacked into a column of Ranger bodies; the cinematic draws its own impacts, so drop the ones this strike queued
      if (fx && fx.length > n0) fx.length = n0
      if (r === true && u) { u.hits++; u.dmg += dmg; if (g) { g.stats.ultHits++; g.stats.ultRaw = (g.stats.ultRaw || 0) + dmg } }
      S.dmg += Math.max(0, before - t.health); S.hits++; S.lastHitK = k
      t.vx = 0; t.vy = 0; t.knockdownState = false
      if (!(t.health > 0)) S.ko = true
    }
    // the move object was kept alive only through the confirm frame (the hook runs inside the move runner): end it now, so the
    // engine's ultimate motion-trail never records the staged body
    if (k === 0) { const f = S.caster; if (f._ninja?.fx) f._ninja.fx.length = 0; f.attacking = false; f.currentAttack = null; f.currentMove = null; f._juiceAttackTrail = false; f._juiceTrailBuf = null }
    if (k === 0) { sfx(ctx, 'impact_crack_01', 0.8); sfx(ctx, 'energy_tone_hold', 0.5); cam?.shake?.(6, 8) }
    if (k === B.cloneAt) { sfx(ctx, 'warp_wobble_01', 0.9); sfx(ctx, 'whoosh_medium_02', 0.7) }
    if (k === 20) sfx(ctx, 'charge_hum_rise', 0.8)
    if (k === 24) sfx(ctx, 'whoosh_medium_01', 0.9)
    B.spiral.forEach((at, i) => {
      if (k === at - 3) sfx(ctx, 'swish_fast_0' + (1 + (i % 3)), 0.85)
      if (k === at) { strike(CGPT_ULT.spiralDmg, { noKO: i % 2 === 0, type: i % 2 ? 'slash' : 'energy' }); sfx(ctx, i % 2 ? 'impact_crack_01' : 'impact_hit_01', 0.9); cam?.shake?.(7 + i, 8); S.hold = 3 }
    })
    if (k === B.apexAt) sfx(ctx, 'sting_pitch_rise_hold', 0.8)
    if (k === B.slowAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'boom_anticipation_suck', 0.9) }
    if (k === B.diveAt - 3) sfx(ctx, 'whoosh_medium_02', 1)
    if (k === B.diveAt) { strike(CGPT_ULT.diveDmg, { type: 'blunt' }); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'boom_medium_01', 0.8); cam?.shake?.(16, 14); S.hold = 6 }
    if (k === B.eruptAt - 4) sfx(ctx, 'rumble_tail_01', 0.9)
    if (k === B.eruptAt && !S.done.boom) {
      S.done.boom = true; S.boomReal = S.real
      strike(CGPT_ULT.eruptDmg, { type: 'blunt', hitstun: 60 })
      S.hold = B.stop; cam?.shake?.(28, 44)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'hit_heavy_boom_01', 1)
    }
    if (k === B.eruptAt + 4) sfx(ctx, 'boom_huge_02_roar', 0.9)
    if (k === B.eruptAt + 14) sfx(ctx, 'boom_medium_02', 0.8)
    if (k === B.eruptAt + 24) sfx(ctx, 'rumble_tail_01', 0.9)
    if (k === B.cloneOut) sfx(ctx, 'warp_wobble_02', 0.6)
  },
  place(S, k) {
    S.pf = k
    const first = B.spiral[0], last = B.spiral[B.spiral.length - 1]
    // foe: rises with the spiral, held at the apex, driven down by the dive, launched by the eruption
    if (k < 24) S.ty = 0
    else if (k < B.diveAt) S.ty = B.rise * smooth((k - 24) / (last - 24)) + Math.sin(k * 0.3) * 3
    else if (k < B.eruptAt) S.ty = B.rise * (1 - smooth((k - B.diveAt) / (B.eruptAt - B.diveAt - 2)))
    else { const u = clamp((k - B.eruptAt) / 44, 0, 1); S.ty = Math.max(0, Math.sin(Math.PI * clamp(u * 1.15, 0, 1)) * 230 * (1 - u * 0.4)) }
    if (k < B.eruptAt) S.tx = S.tx0
    else { const u = clamp((k - B.eruptAt) / 44, 0, 1); S.tx = S.tx0 + (S.land - S.tx0) * (1 - (1 - u) ** 2) }
    // Ranger: alternating sides of the foe through the spiral, above at the apex, rides the dive down
    const side = S.dir
    if (k < first - 2) { S.fx = S.fx0; S.fy = 0; S.fFace = S.dir }
    else if (k < B.apexAt) {
      const i = Math.max(0, B.spiral.findIndex(at => k < at + 4)), turn = i < 0 ? 5 : i
      const sd = ((turn >> 1) % 2 ? -1 : 1) * side   // Ranger turns are odd i; side flips every two turns
      S.fx = S.tx0 - sd * 74; S.fFace = sd; S.fy = Math.max(0, (S.ty || 0) - 20)
    } else if (k < B.diveAt) { S.fx = S.tx0 - side * 20 * (1 - smooth((k - B.apexAt) / 16)); S.fy = (S.ty || 0) + 140 - 40 * smooth((k - B.apexAt) / 16); S.fFace = side }
    else if (k < B.eruptAt) { S.fx = S.tx0 - side * 24; S.fy = Math.max(0, (S.ty || 0) + 70 * (1 - smooth((k - B.diveAt) / 10))); S.fFace = side }
    else { S.fx = S.tx0 - side * 60; S.fy = 0; S.fFace = side }
  },
  camera(S, cam, k) {
    const f = S.caster
    if (k < 24) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47), 1.45)
    else if (k < B.apexAt) cam.focusOnFighter(box(S.tx0, S.tFloor - 80 - (S.ty || 0) * 0.7), 1.05)
    else if (k < B.diveAt) cam.focusOnFighter(box(S.tx0, S.tFloor - 140 - (S.ty || 0) * 0.6), 1.3)
    else if (k < B.eruptAt) cam.focusOnFighter(box(S.tx0, S.tFloor - 60), 1.2)
    else if (k < B.calmAt) cam.focusOnFighter(box((S.tx0 + S.land) / 2, S.floor - 110), 0.8)
    else cam.focusOnFighter(f, 1.3)
  },
  finish(S) { if (S.caster) S.caster._juiceTrailBuf = null; if (S.g) S.g.cd = Math.max(S.g.cd || 0, CGPT_CLONE.cooldown) },   // the partner clone dissolved → the normal re-summon cooldown (legacy ultCleanup)
  draw: (ctx, canvas, S) => drawCgptUltScreen(ctx, canvas, S, B),
})
// Twin Tempest goes through the ninja.js command layer, never triggerUltimate
registerUltCast('ninja_storm_cgpt', () => undefined)
// a training reset clears f._ninja without clearFreezeCines — end the cinematic with it
registerFreezeCine('ns_cgpt_ult_guard', { active: () => { if (C.active() && (!C.S.caster?._ninja || C.S.caster._ninja !== C.S.st)) C.clear(); return false }, update() {}, clear() {} })

cgptHooks.ult = (f, opp, s, g, u) => {
  if (C.active() || !f || !opp || !(opp.health > 0)) return false
  C.S.u = u; C.S.g = g; C.S.st = f._ninja   // survive into setup (cast keeps unknown keys)
  // called from inside the ninja.js move runner: keep the move object alive through this frame (finish() ends it)
  const keep = { a: f.attacking, ca: f.currentAttack, cm: f.currentMove, cd: f.attackCooldown }
  f.attacking = false; f.attackCooldown = 0
  const ok = C.cast(f, { getOpponent: () => opp }) === true
  f.attacking = keep.a; f.currentAttack = keep.ca; f.currentMove = keep.cm
  if (!ok) { delete C.S.u; delete C.S.g; delete C.S.st; f.attackCooldown = keep.cd }
  return ok
}
export const isCgptUltActive = C.active
export const getCgptUltStatus = C.status
export const clearCgptUlt = C.clear
void ctrX
