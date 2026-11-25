// krybotUlt.js — Krybot (krybot) ULTIMATE "TROOBIAN CROSSFIRE — SQUADRON PROTOCOL" as a FROZEN CINEMATIC (2026-11-24
// roster-wide ultimate pass). Krybot's ultimate is NOT dispatched by abilities.triggerUltimate: krybot.js fires the 'ultimate'
// command move (100 Energy, 30f opening blaster). This module takes over only the CONFIRM: krybotState.krybotProjectileHit calls
// krybotHooks.confirm(f, d) when the opening bolt lands UNBLOCKED; we start the frozen cinematic instead of the legacy in-engine
// two-ally / explosion script (s.super). Whiff / blocked opening = unchanged (no confirm, 60f recovery, meter spent like today).
//   DAMAGE: legacy contacts = opening 51 raw + cross 60 + cross 60 + finish 170 (krybotDmg(35/35/100)), projectiles WITH the
//   owner (roster boost). Same contacts here: the opening is still the real projectile; the cinematic deals 60 + 60 + 170 raw via
//   applyScaledDamage WITH the attacker (+ move 'ultimate') — four contacts, 60 + 60 + 160 raw (≈428 dealt on Naruto vs legacy 399, +7 %).
// BEATS (script frame k):
//   LOCK-ON    0-40   letterbox; the picture drops into Krybot's red OPTICS: scanlines, bracket reticle closing on the stunned
//                     foe, "TARGET ACQUIRED" typed out; punch-in on the glowing visor
//   DEPLOY    40-76   "SQUADRON PROTOCOL" — four Krybots beam in on red Troobian transport columns, flanking the foe front and
//                     back; red laser sights snap on and converge; TROOBIAN CROSSFIRE band
//   VOLLEY 1  80      far-flank unit fires (hit)
//   VOLLEY 2  94      rear unit fires (hit)
//   BARRAGE  104-124  the whole squad opens up; bolts converge into a swelling red core over the foe
//   DETONATE 128      slow-mo → white → inverted silhouettes → a colossal multi-stage explosion (the big hit)
//   AFTER    132-196  smoke, the squad beams out one by one; HUD: "TARGET NEUTRALISED." — letterbox out
import { makeCineUlt, cineHit, sfx, ctrX, clamp, smooth, box, preloadAnims, image } from './bleachUltKit.js'
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { krybotHooks, krybotState } from './krybotState.js'
import { drawKrybotUltScreen } from './krybotUltFx.js'

export const B = {
  cross: [60, 60], finish: 160,
  lockEnd: 40, beamAt: [42, 50, 58, 64], titleAt: 60, volleyAt: [80, 94], barrageAt: 104, slowAt: 122, boomAt: 128,
  outBeam: [150, 158, 166, 172], calmAt: 160, outAt: 186, total: 198,
  stop: 24, slide: 230,
}
// squad slots: offset from the foe's centre (×dir), facing (×dir), depth scale (back rows smaller / darker)
export const UNITS = [
  { dx: 175, face: -1, sc: 1, dark: 0 },            // far flank — volley 1
  { dx: -230, face: 1, sc: 1, dark: 0 },             // rear (behind Krybot) — volley 2
  { dx: 300, face: -1, sc: 0.82, dark: 0.35 },       // back row, far
  { dx: -360, face: 1, sc: 0.82, dark: 0.35 },       // back row, near
]

const C = makeCineUlt({
  id: 'krybot_crossfire', keys: ['krybot'], total: B.total, maxZoom: 1.9,
  cost: 0,   // the command move already spent the 100 Energy
  gate() { return true },
  setup(S) { S.land = S.tx0 + S.dir * B.slide; S.fFace = S.dir },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'kBlaster', 'ultimate', 'win', 'walk'])
    preloadAnims(S.target, ['idle', 'hurt', 'knockdown'])
    image('./assets/krybot/explosion.png')
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_tone_hold', 0.6); sfx(ctx, 'impact_crack_01', 0.6) }
    if (k === 8 || k === 16 || k === 24) sfx(ctx, 'crack_sizzle_bright', 0.35)
    if (k === 30) sfx(ctx, 'sting_pitch_rise_hold', 0.7)
    B.beamAt.forEach((at, i) => { if (k === at) { sfx(ctx, i & 1 ? 'warp_wobble_02' : 'warp_wobble_01', 0.7); cam?.shake?.(4, 8) } })
    if (k === B.titleAt) sfx(ctx, 'charge_swell_riser', 0.8)
    if (k === B.titleAt + 10) sfx(ctx, 'energy_hum_low', 0.7)
    B.volleyAt.forEach((at, i) => {
      if (k === at - 4) sfx(ctx, 'swish_fast_0' + (i + 1), 0.7)
      if (k === at) {
        cineHit(S, B.cross[i], { attacker: true, move: 'ultimate' })
        sfx(ctx, 'impact_hit_01', 1); sfx(ctx, 'crack_sizzle_bright', 0.8); cam?.shake?.(10 + i * 4, 12); S.hold = 4 + i * 2
      }
    })
    if (k >= B.barrageAt && k < B.slowAt && (k - B.barrageAt) % 3 === 0) sfx(ctx, 'swish_fast_0' + (1 + ((k >> 1) % 3)), 0.45)
    if (k === B.barrageAt) { sfx(ctx, 'hit_flurry_01', 0.9); sfx(ctx, 'charge_hum_rise', 0.8) }
    if (k === B.slowAt) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'boom_anticipation_suck', 1) }
    if (k === B.boomAt && !S.done.boom) {
      S.done.boom = true; S.boomReal = S.real
      cineHit(S, B.finish, { attacker: true, move: 'ultimate' })
      S.hold = B.stop; cam?.shake?.(26, 44)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'hit_heavy_boom_01', 1)
    }
    if (k === B.boomAt + 4) sfx(ctx, 'boom_huge_02_roar', 0.9)
    if (k === B.boomAt + 10) { sfx(ctx, 'boom_medium_01', 0.8); cam?.shake?.(10, 14) }
    if (k === B.boomAt + 18) sfx(ctx, 'boom_medium_02', 0.7)
    if (k === B.boomAt + 26) sfx(ctx, 'rumble_tail_01', 0.9)
    B.outBeam.forEach(at => { if (k === at) sfx(ctx, 'warp_wobble_01', 0.4) })
  },
  place(S, k) {
    S.pf = k; S.fx = S.fx0
    if (k < B.boomAt) { S.tx = S.tx0 + (k >= B.volleyAt[0] && k < B.boomAt ? Math.sin(k * 1.7) * (k >= B.barrageAt ? 4 : 2) : 0); S.ty = 0 }
    else {
      const u = clamp((k - B.boomAt) / 40, 0, 1), e = 1 - (1 - u) ** 2
      S.tx = S.tx0 + (S.land - S.tx0) * e
      S.ty = Math.max(0, Math.sin(Math.PI * clamp(u * 1.15, 0, 1)) * 150 * (1 - u * 0.5))
    }
  },
  camera(S, cam, k) {
    const f = S.caster, mid = (S.fx0 + S.tx0) / 2
    if (k < B.lockEnd) cam.focusOnFighter(f, 1.55 + 0.2 * smooth(k / B.lockEnd))
    else if (k < B.volleyAt[0] - 6) cam.focusOnFighter(box(mid + S.dir * 30, S.floor - 90), 0.72)
    else if (k < B.barrageAt) cam.focusOnFighter(box(S.tx0, S.tFloor - 60), 1.2)
    else if (k < B.boomAt) cam.focusOnFighter(box(S.tx0, S.tFloor - 55), 1.2 + 0.4 * smooth((k - B.barrageAt) / (B.boomAt - B.barrageAt)))
    else if (k < B.calmAt) cam.focusOnFighter(box(S.tx0 + S.dir * 60, S.floor - 110), 0.75)
    else cam.focusOnFighter(f, 1.25)
  },
  draw: (ctx, canvas, S) => drawKrybotUltScreen(ctx, canvas, S, B, UNITS),
})
// A training reset (game.js resetTraining) runs clearKrybot (deletes f._krybot) but not clearFreezeCines — end the
// cinematic the moment the caster's state is gone (polled through the freeze registry's active() check; never itself active).
registerFreezeCine('krybot_crossfire_guard', { active: () => { if (C.active() && (!C.S.caster?._krybot || C.S.caster._krybot !== C.S.st)) C.clear(); return false }, update() {}, clear() {} })
// Krybot's ultimate never goes through triggerUltimate — keep that path on the legacy switch (no-op for krybot).
registerUltCast('krybot', () => undefined)

// The opening-bolt confirm (krybotState.krybotProjectileHit → krybotHooks.confirm). Return true = the cinematic took over.
krybotHooks.confirm = (f, d) => {
  if (C.active() || !f || !d || !(d.health > 0) || d.isBlocking) return false
  const s = krybotState(f)
  // end the command move (its recovery is replaced by the cinematic) and clear every Krybot shot / helper
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0
  s.helper = null; s.super = null
  const ctx = { getOpponent: () => d, worldWidth: krybotHooks.stageWidth?.() || 3200 }
  C.S.st = f._krybot
  const ok = C.cast(f, ctx) === true
  if (!ok) delete C.S.st
  return ok
}
export const isKrybotUltActive = C.active
export const getKrybotUltStatus = C.status
export const clearKrybotUlt = C.clear
void ctrX
