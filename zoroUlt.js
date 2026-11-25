// zoroUlt.js — Roronoa Zoro (zoro) SUPER "鬼気 九刀流 阿修羅 · 一霧銀 — ASHURA: ICHIBUGIN" as a FROZEN CINEMATIC (2026-11-24
// roster-wide ult pass). Zoro's Super lives in his own command layer (zoro.js fire('zAshura'): 236236+A or Ultimate at 100
// Spirit, Santoryu only, grounded) and never reaches abilities.triggerUltimate. zoro.js now asks castZoroUlt() first:
//   true      → this cinematic plays (100 Spirit spent at the cast; the 240-frame Spirit lockout starts when it ends — the
//               legacy inSuper → lockout bookkeeping)
//   undefined → the legacy zAshura plays exactly as before (foe out of the first cut's reach / on another level → its whiff)
//   false     → refused (another cinematic is running)
// The registry cast (cineRegistry 'zoro') only accepts casts handed over by castZoroUlt (gate flag), so the Ultimate button
// can never bypass the Santoryu requirement.
//   DAMAGE: legacy 70 + 70 + 70 + 150 = 360 raw through the combat pipeline WITH the attacker and his Santoryu offense
//   (×1.12) — measured 232 on Naruto. Here the same 4 contacts (56 + 56 + 56 + 120 raw × offense) through applyScaledDamage
//   WITH the attacker — measured ≈249 (+7 %; the legacy cuts sometimes dropped a contact). A held guard chips 25 %.
// BEATS (script frame k):
//   BANDANA        0-40   letterbox, close on him: the bandana tied on, Wado Ichimonji in his teeth
//   KIKI KYŪTŌRYŪ 40-86   demon aura: a three-headed, six-armed Ashura rises behind him, nine blades fanned — 鬼気 九刀流
//   ICHIBUGIN     86-150  three dash-throughs; each time the demon's nine blades rake the foe (hit-stop, nine-line slash)
//   SHEATHE      150-196  he stands past the foe, back turned; time hangs; the blades slide home… click.
//   ONIGIRI       196     the delayed cut lands at once: white / inverted frame, a nine-ray slash burst, the foe blown back
//   AFTERMATH    196-262  the demon fades into dust: "Nothing happened."
import { makeCineUlt, cineHit, sfx, ctrX, clamp, smooth, box, preloadAnims } from './bleachUltKit.js'
import { zoroState, zcue, ZORO_TUNING } from './zoroState.js'
import { drawZoroUltScreen } from './zoroUltFx.js'

export const ZU = {
  cutRaw: 56, finRaw: 120, blockMult: 0.25, reach: 170,
  demonAt: 40, cuts: [96, 116, 136], sheatheAt: 150, clickAt: 196, total: 262,
  cutStop: 7, finStop: 28,
}
const off = f => Math.max(f.damageMultiplier || 1, f.attackMultiplier || 1)

const C = makeCineUlt({
  id: 'zoro_ashura_ichibugin', keys: ['zoro'], total: ZU.total, maxZoom: 1.9,
  cost: 100,
  gate(f) { return f._zoroUltHandoff ? true : undefined },
  setup(S) {
    const f = S.caster, s = zoroState(f)
    if (s) { s.inSuper = false; s.superHit = true }
    try { zcue(f, 'ashura') } catch (_) {}
    S.off = off(f); S.fFace = S.dir; S.land = S.tx0 + S.dir * (S.blocked ? 40 : 150)
  },
  finish(S) { const s = zoroState(S.caster); if (s) { s.lockout = ZORO_TUNING.superLockout; s.lastAshura = s.clock } },
  preload(S) {
    preloadAnims(S.caster, ['idle', 'zAshura', 'zOni', 'zShishiStrike', 'zsHeavy', 'zSanto', 'win'])
    preloadAnims(S.target, ['idle', 'hurt', 'guard', 'knockdown', 'hurt_air'])
  },
  beats(S, ctx, k) {
    const cam = ctx.camera
    if (k === 0) { sfx(ctx, 'energy_tone_hold', 0.5); sfx(ctx, 'swish_fast_01', 0.5) }
    if (k === 24) sfx(ctx, 'swish_fast_02', 0.6)
    if (k === ZU.demonAt) { sfx(ctx, 'boom_anticipation_suck', 0.9); sfx(ctx, 'charge_swell_riser', 0.9); sfx(ctx, 'rumble_tail_01', 0.8); cam?.shake?.(6, 30) }
    if (k === ZU.demonAt + 24) { sfx(ctx, 'boom_medium_02', 0.9); sfx(ctx, 'energy_hum_low', 0.8) }
    ZU.cuts.forEach((at, i) => {
      if (k === at - 6) sfx(ctx, 'whoosh_medium_0' + (1 + i % 2), 1)
      if (k === at && !S.done['c' + i]) {
        S.done['c' + i] = true
        cineHit(S, Math.round(ZU.cutRaw * S.off), { blockMult: ZU.blockMult, attacker: true, move: 'zAshura' })
        S.hold = ZU.cutStop; S.lastCut = { i, real: S.real }
        cam?.shake?.(10 + i * 3, 10); sfx(ctx, 'hit_flurry_01', 0.9); sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'swish_fast_0' + (1 + i), 1)
      }
    })
    if (k === ZU.sheatheAt) { sfx(ctx, 'pitch_drop_slowmo', 1) }
    if (k === ZU.sheatheAt + 20) sfx(ctx, 'sting_pitch_rise_hold', 0.7)
    if (k === ZU.clickAt - 4) sfx(ctx, 'impact_hit_01', 0.6)   // the click of the sheath
    if (k === ZU.clickAt && !S.done.fin) {
      S.done.fin = true; S.hitReal = S.real
      cineHit(S, Math.round(ZU.finRaw * S.off), { blockMult: ZU.blockMult, attacker: true, move: 'zAshura' })
      S.hold = ZU.finStop; cam?.shake?.(24, 40)
      sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'hit_flurry_01', 1)
    }
    if (k === ZU.clickAt + 10) sfx(ctx, 'rumble_tail_01', 1)
  },
  place(S, k) {
    S.pf = k
    if (k < ZU.cuts[0] - 8) { S.fx = S.fx0; S.fy = 0; S.fFace = S.dir }
    else if (k < ZU.sheatheAt) {   // dash-throughs: alternate sides of the foe
      let i = 0; for (let j = 0; j < ZU.cuts.length; j++) if (k >= ZU.cuts[j] - 8) i = j
      const side = i % 2 === 0 ? 1 : -1, u = smooth((k - (ZU.cuts[i] - 8)) / 10)
      S.fx = S.tx0 + side * S.dir * (-90 + 180 * u); S.fy = 0; S.fFace = side * S.dir
    } else { S.fx = S.tx0 + S.dir * 130; S.fy = 0; S.fFace = S.dir }
    if (k < ZU.clickAt) { S.tx = S.tx0; S.ty = 0 }
    else { const u = clamp((k - ZU.clickAt) / 30, 0, 1); S.tx = S.tx0 + (S.land - S.tx0) * (1 - (1 - u) ** 2); S.ty = S.blocked ? 0 : Math.max(0, Math.sin(Math.PI * u) * 70) }
  },
  camera(S, cam, k) {
    const f = S.caster, foe = box(S.tx0, S.tFloor - 60)
    if (k < ZU.demonAt) cam.focusOnFighter(f, 1.6 + 0.25 * smooth(k / ZU.demonAt))
    else if (k < ZU.cuts[0] - 8) cam.focusOnFighter(box(S.fx0, S.floor - 120), 1.0)
    else if (k < ZU.sheatheAt) cam.focusOnFighter(foe, 1.3)
    else if (k < ZU.clickAt) cam.focusBetween?.(box(S.fx, S.floor - 47), foe, 1.35)
    else cam.focusBetween?.(box(S.fx, S.floor - 47), box(S.land, S.tFloor - 47), 1.1)
  },
  draw: (ctx, canvas, S) => drawZoroUltScreen(ctx, canvas, S),
})

// zoro.js entry: the Super's start point (after its canAfford / grounded checks).
export function castZoroUlt(f, opp, world) {
  if (!f || !opp || opp.eliminated || !(opp.health > 0)) return undefined
  if (Math.abs(ctrX(opp) - ctrX(f)) > ZU.reach || Math.abs((opp.y || 0) - (f.y || 0)) > 110 || !(f.onGround || f.grounded)) return undefined
  const sv = { attacking: f.attacking, currentAttack: f.currentAttack, currentMove: f.currentMove, attackCooldown: f.attackCooldown }
  f.attacking = false; f.currentAttack = null; f.attackCooldown = 0
  f._zoroUltHandoff = true
  let r
  try { r = C.cast(f, { getOpponent: () => opp, worldWidth: world?.stageWidth?.() || 3200 }) } finally { f._zoroUltHandoff = false }
  if (r !== true) Object.assign(f, sv)
  return r
}
export const isZoroUltActive = C.active
export const getZoroUltStatus = C.status
export const clearZoroUlt = C.clear
