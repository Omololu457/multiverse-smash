// kevinUlt.js — Kevin Levin (kevin_levin) ULTIMATE as two FROZEN CINEMATICS (2026-11-24 roster-wide ultimate pass). Kevin's
// ultimate is a 12-second MODE run by kevinState.js (U = the 'kTransform' morph, 100 Power; U again on the ground inside the
// form = the 'kCash' finisher). Neither goes through abilities.triggerUltimate, so this module hooks kevinState.kevinHooks:
//
// 1) ABSORPTION OVERLOAD — the activation (kevinHooks.transform, fired when the 'kTransform' morph starts — 100 Power already
//    spent). The cinematic replaces the morph's 28f startup: at its end the form is applied exactly as kevinState's active frame
//    does (coat cleared, formUntil = tick + FORM_TICKS) and the morph ends, so the 12 s form begins right after (kevinState's tick is frozen with the sim — no form time is lost). No damage, no foe state
//    change. Beats (k):
//      PALM      0-16   letterbox, push in: Kevin drops to one knee and slaps his palm on the floor — the boards crack teal
//      CRAWL    16-58   matter crawls UP his body (the real apply strip + a rising metallic seam); floor chunks tear loose
//                       and fly into him; teal veins run out across the stage
//      OVERLOAD 58-98   the green-silhouette transform strip convulses; every light in the arena bends into him (converging
//                       green streams), shake escalates — "Everything in here… is MINE."
//      REVEAL   98      white flash; Ultimate Kevin stands up out of it (low-angle punch-in, shockwave, debris)
//      TITLE   100-140  ULTIMATE KEVIN · ABSORPTION OVERLOAD band; letterbox out by 150
// 2) EVERYTHING YOU THREW AT ME — the cash-out finisher (kevinHooks.cash, on the kCash CLEAN hit; whiff / guard unchanged).
//    DAMAGE: legacy = ONE applyScaledDamage of the time-scaled cash damage (180–360 raw before offense/defense) at cinematic
//    frame 41 with { scale:1, source:'ultimate', tier:'big', attacker, move:'kCash', defenseApplied, offenseApplied }. Same
//    pipeline and the same total, split 15 % + 15 % (two claw rakes) + the remainder (the point-blank Arc Torrent).
//    Beats (k): SEIZE 0-26 (claw grab, foe hoisted) · RECALL 26-70 (every colour of energy he ever absorbed swirls back out of
//    his body into the raised claw; the halo rises) · RAKES 72 / 86 · ARC 100-112 (slow-mo, white → inverted frames, the
//    beam at point blank — the big hit) · AFTER 116-196 ("Payback.") — he reverts right after, exactly like the legacy path.
import { makeCineUlt, sfx, ctrX, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { readRawControls } from './input.js'
import { kevinHooks } from './kevinState.js'
import { KEVIN_ART, FORM_TICKS } from './kevinData.js'
import { drawKevinOverloadScreen, drawKevinCashScreen } from './kevinUltFx.js'

export const kevinArt = f => KEVIN_ART[f?.skinId] || KEVIN_ART.default

// ── 1) ABSORPTION OVERLOAD (activation) ── a light controller: no damage, the foe is left exactly as it was ──────────────
export const A = { palm: 10, crawl: 16, overload: 58, reveal: 98, titleAt: 100, outAt: 138, total: 150 }
const O = { active: false }
function oClear() {
  if (!O.active) return
  const f = O.f, cam = O.cam, sv = O.camSaved
  if (f) { if (O.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = O.fAlpha0 }
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
  for (const k of Object.keys(O)) delete O[k]
  O.active = false
}
function oStart(f, t) {
  if (O.active || C.active() || !f || !(f.health > 0)) return false
  const art = kevinArt(f)
  Object.assign(O, { active: true, f, st: f._kevin, t: t || null, frame: 0, real: 0, hold: 0, dir: f.facing || 1, fx: ctrX(f), floor: (f.y || 0) + (f.h || 94),
    fAlpha0: f._fxAlpha, cam: null, camSaved: null })
  f._fxAlpha = 0
  for (const a of [art.human.kApply, art.human.kTransform, art.ultimate.idle]) if (a?.sheet) image(a.sheet)
  return true
}
function oUpdate(ctx = {}) {
  if (!O.active) return
  const f = O.f; if (!f || !(f.health > 0)) return oClear()
  // the sim (and kevinTick's input-edge reader) is frozen under the cinematic: keep Kevin's "previous buttons" in step with the
  // pad, so releasing U during the cinematic still lets the next U press read as a fresh edge (the cash-out)
  const raw = readRawControls(f), kp = f._kevin?.prev
  if (raw && kp) for (const key of ['light', 'heavy', 'upAttack', 'special', 'ultimate', 'grab']) kp[key] = !!raw[key]
  const cam = ctx.camera
  if (cam && !O.cam) { O.cam = cam; O.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.9; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
  O.real++
  f._fxAlpha = 0; f.vx = 0; f.vy = 0
  if (O.hold > 0) { O.hold--; return }
  const k = O.frame
  if (k === 0) { sfx(ctx, 'boom_anticipation_suck', 0.6); sfx(ctx, 'energy_tone_hold', 0.5) }
  if (k === A.palm) { sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'hit_heavy_boom_01', 0.6); cam?.shake?.(10, 12); O.hold = 5 }
  if (k === A.crawl) { sfx(ctx, 'charge_hum_rise', 0.8); sfx(ctx, 'crack_sizzle_bright', 0.5) }
  if (k > A.crawl && k < A.overload && k % 8 === 0) { sfx(ctx, 'impact_hit_01', 0.4); cam?.shake?.(3, 5) }
  if (k === 40) sfx(ctx, 'rumble_tail_01', 0.6)
  if (k === A.overload) { sfx(ctx, 'charge_swell_riser', 1); sfx(ctx, 'warp_wobble_01', 0.8) }
  if (k > A.overload && k < A.reveal && k % 6 === 0) cam?.shake?.(4 + (k - A.overload) / 5, 6)
  if (k === A.reveal - 8) sfx(ctx, 'sting_pitch_rise_hold', 0.9)
  if (k === A.reveal) { O.revealReal = O.real; sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 0.9); cam?.shake?.(20, 30); O.hold = 10 }
  if (k === A.reveal + 6) sfx(ctx, 'rumble_tail_01', 0.8)
  if (k === A.titleAt + 4) sfx(ctx, 'boom_medium_01', 0.6)
  if (cam?.focusOnFighter) {
    if (k < A.overload) cam.focusOnFighter(f, 1.5 + 0.25 * smooth(k / A.overload))
    else if (k < A.reveal) cam.focusOnFighter(f, 1.75 - 0.45 * smooth((k - A.overload) / 40))
    else cam.focusOnFighter(box(O.fx, O.floor - 60), 1.25)
  }
  if (++O.frame > A.total) {
    // the morph's own 28f startup was the cinematic: the form lands the moment it ends
    // (kevinState's own kTransform-applied branch, verbatim: coat cleared, form timer from now), then the morph ends
    const m = f.attacking ? f.currentAttack : null, ks = f._kevin
    if (m?.kevin?.key === 'kTransform' && !m.kevin.applied && ks) {
      m.kevin.applied = true; ks.material = null; ks.coatUntil = 0; ks.formUntil = ks.tick + FORM_TICKS
      f.attacking = false; f.currentAttack = null; f.currentMove = null
    }
    oClear()
  }
}
registerFreezeCine('kevin_overload', { active: () => !!O.active, update: oUpdate, clear: oClear })
registerCineScreen('kevin_overload', (ctx, canvas) => (O.active ? drawKevinOverloadScreen(ctx, canvas, O, A) : false))

// ── 2) EVERYTHING YOU THREW AT ME (cash-out finisher) ──────────────────────────────────────────────────────────────────
export const B = {
  split: [0.15, 0.15], seizeEnd: 26, recallAt: 26, rakeAt: [72, 86], slowAt: 96, arcAt: 100, boomAt: 106, calmAt: 150, outAt: 184, total: 196,
  stop: 22, lift: 70, slide: 300,
}
function hitPart(S, amt) {
  const t = S.target, f = S.caster
  if (!t || !(t.health > 0) || !(amt > 0)) return 0
  const before = t.health
  try { applyScaledDamage(t, amt, { scale: 1, source: 'ultimate', tier: 'big', attacker: f, move: 'kCash', defenseApplied: true, offenseApplied: true }) } catch (_) {}
  const d = Math.max(0, before - t.health); S.dmg += d; S.hits++; t.colorFlash = 10
  if (f) { f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90 }
  if (!(t.health > 0)) S.ko = true
  return d
}
const C = makeCineUlt({
  id: 'kevin_cash', keys: ['kevin_levin'], total: B.total, maxZoom: 1.9,
  cost: 0,   // the form was bought with the morph
  gate() { return true },
  setup(S) {
    S.land = S.tx0 + S.dir * B.slide; S.fFace = S.dir
    const d = S.cash || 0, a = Math.round(d * B.split[0]), b = Math.round(d * B.split[1])
    S.parts = [a, b, Math.max(0, d - a - b)]
  },
  preload(S) { const art = kevinArt(S.caster).ultimate; for (const k of ['kCash', 'kHalo', 'kArc', 'idle']) if (art[k]?.sheet) image(art[k].sheet); preloadAnims(S.target, ['hurt', 'knockdown']) },
  beats(S, ctx, k) {
    const cam = ctx.camera
    // the move object was kept alive only through the confirm frame (the hook runs inside the move runner): end it now, so the
    // engine's ultimate motion-trail never records the staged body
    if (k === 0) { const f = S.caster; f.attacking = false; f.currentAttack = null; f.currentMove = null; f._juiceAttackTrail = false; f._juiceTrailBuf = null }
    if (k === 0) { sfx(ctx, 'impact_hit_01', 0.9); sfx(ctx, 'whoosh_medium_01', 0.6); cam?.shake?.(8, 10) }
    if (k === 10) sfx(ctx, 'energy_tone_hold', 0.6)
    if (k === B.recallAt) { sfx(ctx, 'charge_hum_rise', 0.9); sfx(ctx, 'warp_wobble_02', 0.7) }
    if (k === 46) sfx(ctx, 'charge_swell_riser', 0.9)
    B.rakeAt.forEach((at, i) => {
      if (k === at - 3) sfx(ctx, 'swish_fast_0' + (i + 1), 0.9)
      if (k === at) { hitPart(S, S.parts[i]); sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'hit_heavy_boom_01', 0.6); cam?.shake?.(12 + i * 4, 12); S.hold = 5 + i * 2 }
    })
    if (k === B.slowAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'boom_anticipation_suck', 1) }
    if (k === B.arcAt) sfx(ctx, 'sting_pitch_rise_hold', 0.8)
    if (k === B.boomAt && !S.done.boom) {
      S.done.boom = true; S.boomReal = S.real
      hitPart(S, S.parts[2])
      S.hold = B.stop; cam?.shake?.(26, 40)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'crack_sizzle_bright', 1)
    }
    if (k === B.boomAt + 4) sfx(ctx, 'boom_huge_02_roar', 0.9)
    if (k === B.boomAt + 16) sfx(ctx, 'rumble_tail_01', 0.9)
  },
  place(S, k) {
    S.pf = k; S.fx = S.fx0
    if (k < B.boomAt) { S.tx = S.tx0; S.ty = B.lift * smooth(k / 18) + (k > 18 ? Math.sin(k * 0.2) * 3 : 0) }
    else {
      const u = clamp((k - B.boomAt) / 44, 0, 1), e = 1 - (1 - u) ** 2
      S.tx = S.tx0 + (S.land - S.tx0) * e
      S.ty = Math.max(0, (B.lift + 60 * Math.sin(Math.PI * clamp(u * 1.3, 0, 1))) * (1 - u))
    }
  },
  camera(S, cam, k) {
    const f = S.caster
    if (k < B.recallAt) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47 - (S.ty || 0)), 1.45)
    else if (k < B.rakeAt[0] - 4) cam.focusOnFighter(f, 1.4 + 0.35 * smooth((k - B.recallAt) / 40))
    else if (k < B.slowAt) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47 - (S.ty || 0)), 1.3)
    else if (k < B.boomAt) cam.focusBetween?.(f, box(S.tx0, S.tFloor - 47 - (S.ty || 0)), 1.5)
    else if (k < B.calmAt) cam.focusOnFighter(box((S.fx0 + S.land) / 2, S.floor - 70), 0.85)
    else cam.focusOnFighter(f, 1.3)
  },
  draw: (ctx, canvas, S) => drawKevinCashScreen(ctx, canvas, S, B),
})
// A training reset (game.js resetTraining) runs clearKevin (deletes f._kevin) but not clearFreezeCines — end either cinematic
// the moment the caster's state is gone (polled through the freeze registry's active() check; never itself active).
registerFreezeCine('kevin_ult_guard', { active: () => { if (O.active && (!O.f?._kevin || O.f._kevin !== O.st)) oClear(); if (C.active() && (!C.S.caster?._kevin || C.S.caster._kevin !== C.S.st)) C.clear(); return false }, update() {}, clear() {} })
// Kevin's ultimate never goes through triggerUltimate — keep that path on the legacy switch.
registerUltCast('kevin_levin', () => undefined)

kevinHooks.transform = (f, t) => { oStart(f, t) }
kevinHooks.cash = (f, d, damage) => {
  if (C.active() || O.active || !f || !d || !(d.health > 0)) return false
  // called from INSIDE combat.resolveAttackHit, which still writes to f.currentAttack after this hook: keep the move object
  // alive through this frame (the freeze starts next frame; finish() ends it)
  const keep = { attacking: f.attacking, currentAttack: f.currentAttack, currentMove: f.currentMove, cd: f.attackCooldown }
  f.attacking = false; f.attackCooldown = 0
  C.S.cash = damage; C.S.st = f._kevin   // read by setup() (cast() keeps unknown keys until its Object.assign)
  const ok = C.cast(f, { getOpponent: () => d }) === true
  if (!ok) { delete C.S.cash; delete C.S.st }
  f.attacking = keep.attacking; f.currentAttack = keep.currentAttack; f.currentMove = keep.currentMove
  if (!ok) f.attackCooldown = keep.cd
  return ok
}
export const isKevinUltActive = () => !!O.active || C.active()
export const getKevinCashStatus = C.status
export const clearKevinUlt = () => { oClear(); C.clear() }
