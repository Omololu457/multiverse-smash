// gokuUlt.js — Goku (goku): the per-form ULTIMATE ("Transformation Ladder") rebuilt as FROZEN CINEMATICS (2026-11-24;
// owner: "go onto the Dragon Ball ones … fix those ones"). SIMULATION half — the render lives in gokuUltFx.js.
// Rides cineRegistry.js: registerUltCast('goku') takes the Ultimate press, registerFreezeCine freezes combat / physics /
// input and calls update(ctx) every frame while the scene plays.
//
// Same input, Ki cost and damage as the legacy executeGokuUltimate (abilities.js, untouched — simply no longer reached):
//   form   ultimate                 Ki   damage (raw, applyScaledDamage)                      guarded
//   base   SPIRIT BOMB              25   360 × form offense, source 'ability'                ×0.5
//   ssj    SUPER KAMEHAMEHA         50   300 × offense, 'ability'                            ×0.5
//   ssj2   METEOR SMASH             50   60 + 70 + 60 + 150, 'goku-meteor-smash'             ×0.25
//   ssj3   DRAGON FIST              50   120 + 200, 'goku-dragon-fist'                       ×0.25
//   god    GOD KAMEHAMEHA           50   340 × offense, 'ability'                            ×0.5
//   blue   KAIOKEN ×10 KAMEHAMEHA   50   340 × offense, 'ability' (Kaioken switched on)      ×0.5
//   ui     AUTONOMOUS ASSAULT       50   4 × 50 + 160, 'goku-autonomous-assault'            ×0.25
// Like the legacy ults the payoff is GUARANTEED and range-independent (the beam crosses any gap; the rushes close it).
// Every position is a pure function of the script frame k; hit-stop holds k. No Math.random / wall clock.
import { registerUltCast, registerFreezeCine } from './cineRegistry.js'
import { applyScaledDamage } from './combat.js'
import { sound } from './sound.js'

const FORMS = ['base', 'ssj', 'ssj2', 'ssj3', 'god', 'blue', 'ui']
const OFFENSE = { base: 1.0, ssj: 1.1, ssj2: 1.18, ssj3: 1.28, god: 1.32, blue: 1.38, ui: 1.45 }   // abilities.js GOKU_FORMS dmg

// beat tables (script frames). raw = fraction of the total for the scaled beams, absolute raw for the rushes.
export const GOKU_CINE = {
  kame: { total: 262, title: 34, syl: [40, 58, 76, 94], suck: 108, fire: 120, contact: 126, ticks: [134, 142, 150, 158], blast: 172, beamOff: 188,
          split: { contact: 0.10, tick: 0.075, blast: 0.60 }, stop: { contact: 7, tick: 3, blast: 20 } },
  bomb: { total: 282, title: 34, gather0: 36, throw: 140, contact: 168, ticks: [176, 184, 192, 200], blast: 212,
          split: { contact: 0.15, tick: 0.05, blast: 0.65 }, stop: { contact: 10, tick: 3, blast: 22 } },
  meteor: { total: 252, title: 30, dash: 32, arrive: 38, jabs: [44, 50, 56, 62], kick: 74, port: 92, aerial: 100, raise: 108, hammer: 118, slam: 130,
            raw: { jab: 15, kick: 70, aerial: 60, slam: 150 }, stop: { jab: 3, kick: 10, aerial: 7, hammer: 6, slam: 20 } },
  dragon: { total: 262, title: 34, charge: 36, launch: 84, contact: 92, rise0: 100, roar: 146, burst: 158, fall: 172, land: 186,
            raw: { punch: 120, burst: 200 }, stop: { punch: 12, burst: 22 } },
  ui: { total: 252, title: 34, eye: 36, vanish: 66, strikes: [78, 94, 110, 126], appear: 138, palm: 150,
        raw: { strike: 50, palm: 160 }, stop: { strike: 6, palm: 22 } },
}
const KIND = { base: 'bomb', ssj: 'kame', god: 'kame', blue: 'kame', ssj2: 'meteor', ssj3: 'dragon', ui: 'ui' }
const COST = { base: 25, ssj: 50, ssj2: 50, ssj3: 50, god: 50, blue: 50, ui: 50 }
const BEAM_RAW = { base: 360, ssj: 300, god: 340, blue: 340 }
const SOURCE = { ssj2: 'goku-meteor-smash', ssj3: 'goku-dragon-fist', ui: 'goku-autonomous-assault' }
// voice (gokuVoice.js / GOKU_VOICE_LOG.md transcripts) — the line plays over the title cut-in
export const GOKU_ULT_VOICE = {
  base: ['goku_029.mp3', "I've still got more left in me!"],
  ssj: ['goku_017.mp3', "My name is Goku, and I'm a Saiyan!"],
  ssj2: ['goku_001.mp3', "I'm your worst nightmare."],
  ssj3: ['goku_002.mp3', 'A Saiyan from Earth!'],
  god: ['goku_007.mp3', "This guy's a cut above the rest!"],
  blue: ['goku_010.mp3', "All out! You're a lot stronger now, right?"],
  ui: ['goku_032.mp3', 'Have you even been training?'],
}

const c = { active: false }
export const gokuUltScene = () => (c.active ? c : null)
export const isGokuUltActive = () => !!c.active
export const gokuUltStatus = () => ({ active: !!c.active, form: c.form || null, kind: c.kind || null, k: c.k | 0, real: c.real | 0, hits: c.hits | 0, dealt: Math.round(c.dealt || 0), ko: !!c.ko })
export let gokuUltLast = null   // last finished scene (tests): { form, kind, hits, dealt, ko }

const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
const easeO = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) * (1 - u) }
const seg = (k, a, b) => clamp((k - a) / Math.max(1, b - a), 0, 1)
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const shake = (ctx, s, n) => { try { ctx?.camera?.shake?.(s, n) } catch (_) {} }

function targetOf(f, context) {
  try { if (typeof context?.getOpponent === 'function') return context.getOpponent(f) } catch (_) {}
  return f?.side === 'p2' ? context?.p1 : context?.p2
}
const formOf = f => FORMS[f?.transformIndex || 0] || 'base'
const animOf = (o, key) => (o?._skinAnim && o._skinAnim[key]) || o?.animationData?.[key]

// ── CAST (abilities.triggerUltimate → castRegisteredUlt) ─────────────────────────────────────────────────────────
function cast(f, context) {
  if (!f || (f.rosterKey || '').toLowerCase() !== 'goku') return undefined
  if (c.active) return false
  if ((f.attackCooldown || 0) > 0 || f.attacking) return false
  const t = targetOf(f, context)
  if (!t || t.eliminated || !(t.health > 0)) return undefined          // nobody to hit → legacy path (unchanged)
  const form = formOf(f), cost = COST[form]
  if (!f.infiniteEnergy && (f.energy || 0) < cost) return false
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - cost)
  if (form === 'blue' && !(f._kaioken > 0)) f._kaioken = 1              // legacy preFire: Kaioken ×10 switches Kaioken on
  start(f, t, form, context)
  try { sound.playSfxFile?.(GOKU_ULT_VOICE[form][0], null, { owner: f }); f._atkVoiceCd = 150 } catch (_) {}
  return true
}

function start(f, t, form, context) {
  for (const k of Object.keys(c)) delete c[k]
  const d = ctrX(t) >= ctrX(f) ? 1 : -1
  const sL = context?.stageLeft || 0, sW = context?.stageWidth || context?.worldWidth || 3200
  const kind = KIND[form], guarded = !!t.isBlocking
  const off = Math.max(f.damageMultiplier || 1, f.attackMultiplier || 1) || OFFENSE[form]
  const beamTotal = BEAM_RAW[form] ? Math.round(BEAM_RAW[form] * off) : 0
  // the foe gets drawn by gokuUltFx from its own hurt / knockdown strips when it has them (else the engine draws it)
  const drawFoe = !!(animOf(t, 'hurt')?.sheet)
  Object.assign(c, {
    active: true, form, kind, k: 0, real: 0, hold: 0, holdN: 1, caster: f, target: t, d,
    floor: feet(f), tFloor: feet(t), fx0: ctrX(f), tx0: ctrX(t), sL, sR: sL + sW,
    scale: guarded ? (kind === 'kame' || kind === 'bomb' ? 0.5 : 0.25) : 1, guarded, beamTotal, source: SOURCE[form] || 'ability',
    hits: 0, dealt: 0, ko: false, last: null, pops: [], cam: null, camSaved: null, done: {},
    fAlpha0: f._fxAlpha, tAlpha0: t._fxAlpha, drawFoe, anim: f._skinAnim || null,
    g: { x: ctrX(f), feet: feet(f), key: 'kiCharge', fi: 0, hide: false, rot: 0 },
    tp: { x: ctrX(t), feet: feet(t), pose: guarded ? 'guard' : 'hurt', rot: 0 },
  })
  // where the foe ends up (knocked back, kept on stage) and where Goku stands for the rushes
  const inL = sL + 60, inR = sL + sW - 60
  c.tEnd = clamp(c.tx0 + d * (kind === 'kame' ? 150 : kind === 'bomb' ? 40 : kind === 'ui' ? 130 : 70), inL, inR)
  c.gNear = clamp(c.tx0 - d * 64, inL, inR)
  f.vx = 0; f.vy = 0; f.facing = d; f.isBlocking = false; f.hitstop = 0
  f.attacking = true; f.currentAttack = null; f.currentMove = null
  f._spriteCastMove = null; f._spriteCastTimer = 0
  f._fxAlpha = 0                                                       // gokuUltFx draws Goku himself
  if (drawFoe) t._fxAlpha = 0
  t.vx = 0; t.vy = 0; t.hitstop = 0; t.attacking = false; t.currentAttack = null; t.currentMove = null
  t.isDashing = false; t.dashTimer = 0; t.facing = -d
  if (guarded) t.blockstun = Math.max(t.blockstun || 0, 9999); else t.hitstun = Math.max(t.hitstun || 0, 9999)
}

// one contact: damage (guaranteed, as the legacy), hit-stop, record for the render
function strike(ctx, raw, stop, power, tag) {
  const t = c.target
  c.hold = stop; c.holdN = stop
  c.last = { k: c.k, real: c.real, power, tag }
  if (c.ko || !(t.health > 0)) return
  const hp0 = t.health
  try { applyScaledDamage(t, raw * c.scale, { source: c.source }) } catch (_) {}
  const amt = Math.max(0, hp0 - (t.health || 0))
  c.hits++; c.dealt += amt
  c.pops.push({ real: c.real, amt: Math.round(amt), x: c.tp.x, y: c.tp.feet - (t.h || 94) * 0.7, power }); if (c.pops.length > 10) c.pops.shift()
  t.colorFlash = 8 + stop
  if (!(t.health > 0)) c.ko = true
}
const beamRaw = frac => c.beamTotal * frac

// ── UPDATE ───────────────────────────────────────────────────────────────────────────────────────────────────────
function update(ctx = {}) {
  if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clear()
  const cam = ctx.camera
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.6; cam.maxZoomStep = 0.05; cam.maxPanStep = 70 }
  c.real++
  if (c.hold > 0) { c.hold--; place(); return }
  const k = c.k
  BEATS[c.kind](ctx, k)
  place()
  camera(cam, k)
  if (++c.k > GOKU_CINE[c.kind].total) finish()
}

const BEATS = {
  kame(ctx, k) {
    const K = GOKU_CINE.kame, S = K.split
    if (k === 0) { sfx(ctx, 'charge_swell_riser', 0.9); sfx(ctx, 'energy_hum_low', 0.7); shake(ctx, 6, 20) }
    if (k === 12 && c.form === 'blue') { sfx(ctx, 'boom_medium_01', 0.85); sfx(ctx, 'crack_sizzle_bright', 0.8); shake(ctx, 14, 14) }   // KAIOKEN ×10
    K.syl.forEach((s, i) => { if (k === s) { sfx(ctx, i & 1 ? 'warp_wobble_02' : 'warp_wobble_01', 0.5 + i * 0.1); sfx(ctx, 'charge_hum_rise', 0.45 + i * 0.12); shake(ctx, 3 + i * 3, 10) } })
    if (k === K.syl[0]) sfx(ctx, 'energy_tone_hold', 0.6)
    if (k === K.suck) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'pitch_drop_slowmo', 0.6) }
    if (k === K.fire) { sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 0.95); shake(ctx, 22, 30) }
    if (k === K.contact) { strike(ctx, beamRaw(S.contact), K.stop.contact, 0.9, 'contact'); sfx(ctx, 'hit_heavy_boom_01', 0.95); sfx(ctx, 'impact_crack_01', 0.8) }
    K.ticks.forEach((b, i) => { if (k === b) { strike(ctx, beamRaw(S.tick), K.stop.tick, 0.35 + i * 0.08, 'tick'); shake(ctx, 8 + i * 2, 8); sfx(ctx, 'impact_hit_01', 0.55 + i * 0.08); sfx(ctx, 'crack_sizzle_bright', 0.35) } })
    if (k === K.ticks[0]) sfx(ctx, 'rumble_tail_01', 0.8)
    if (k === K.blast - 6) sfx(ctx, 'boom_anticipation_suck', 0.8)
    if (k === K.blast) { strike(ctx, beamRaw(S.blast), K.stop.blast, 1.5, 'blast'); shake(ctx, 34, 36); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'boom_huge_02_roar', 0.9); sfx(ctx, 'hit_heavy_boom_01', 0.9) }
    if (k === K.blast + 14) sfx(ctx, 'rumble_tail_01', 0.9)
    if (c.ko && k > K.contact && k < K.blast - 8) c.k = K.blast - 8
  },
  bomb(ctx, k) {
    const B = GOKU_CINE.bomb, S = B.split
    if (k === 0) { sfx(ctx, 'sting_pitch_rise_hold', 0.8); sfx(ctx, 'energy_hum_low', 0.7) }
    if (k === B.gather0) { sfx(ctx, 'charge_swell_riser', 0.8); sfx(ctx, 'energy_tone_hold', 0.5) }
    if (k > B.gather0 && k < B.throw && (k - B.gather0) % 22 === 0) { sfx(ctx, 'charge_hum_rise', 0.4 + 0.4 * seg(k, B.gather0, B.throw)); shake(ctx, 2 + 6 * seg(k, B.gather0, B.throw), 16) }
    if (k === B.throw - 8) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === B.throw) { sfx(ctx, 'whoosh_medium_02', 1); sfx(ctx, 'warp_wobble_01', 0.8); shake(ctx, 12, 12) }
    if (k === B.contact) { strike(ctx, beamRaw(S.contact), B.stop.contact, 1.0, 'contact'); shake(ctx, 20, 20); sfx(ctx, 'boom_medium_02', 1); sfx(ctx, 'hit_heavy_boom_01', 0.9) }
    B.ticks.forEach((b, i) => { if (k === b) { strike(ctx, beamRaw(S.tick), B.stop.tick, 0.4 + i * 0.08, 'tick'); shake(ctx, 10 + i * 2, 8); sfx(ctx, 'impact_hit_01', 0.6); sfx(ctx, 'rumble_tail_01', 0.4) } })
    if (k === B.blast - 6) sfx(ctx, 'boom_anticipation_suck', 0.9)
    if (k === B.blast) { strike(ctx, beamRaw(S.blast), B.stop.blast, 1.6, 'blast'); shake(ctx, 36, 40); sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'boom_huge_02_roar', 0.9) }
    if (k === B.blast + 16) sfx(ctx, 'rumble_tail_01', 1)
    if (c.ko && k > B.contact && k < B.blast - 8) c.k = B.blast - 8
  },
  meteor(ctx, k) {
    const M = GOKU_CINE.meteor, R = M.raw
    if (k === 0) { sfx(ctx, 'crack_sizzle_bright', 0.9); sfx(ctx, 'charge_swell_riser', 0.7); shake(ctx, 8, 14) }
    if (k === 16) sfx(ctx, 'crack_sizzle_bright', 0.6)
    if (k === M.dash) { sfx(ctx, 'swish_fast_01', 1); sfx(ctx, 'warp_wobble_02', 0.5) }
    M.jabs.forEach((j, i) => { if (k === j) { strike(ctx, R.jab, M.stop.jab, 0.3 + i * 0.06, 'jab'); shake(ctx, 5 + i, 5); sfx(ctx, 'impact_hit_01', 0.6 + i * 0.06); sfx(ctx, i & 1 ? 'swish_fast_02' : 'swish_fast_03', 0.5) } })
    if (k === M.jabs[0]) sfx(ctx, 'hit_flurry_01', 0.8)
    if (k === M.kick - 3) sfx(ctx, 'swish_fast_01', 0.9)
    if (k === M.kick) { strike(ctx, R.kick, M.stop.kick, 0.8, 'kick'); shake(ctx, 16, 12); sfx(ctx, 'hit_heavy_boom_01', 0.9); sfx(ctx, 'boom_medium_01', 0.7) }
    if (k === M.port) { sfx(ctx, 'warp_wobble_01', 0.9); sfx(ctx, 'crack_sizzle_bright', 0.5) }
    if (k === M.aerial) { strike(ctx, R.aerial, M.stop.aerial, 0.7, 'aerial'); shake(ctx, 12, 10); sfx(ctx, 'hit_heavy_boom_01', 0.8); sfx(ctx, 'impact_crack_01', 0.6) }
    if (k === M.raise) { sfx(ctx, 'boom_anticipation_suck', 1); sfx(ctx, 'charge_hum_rise', 0.6) }
    if (k === M.hammer) { c.hold = M.stop.hammer; c.last = { k, real: c.real, power: 0.9, tag: 'hammer' }; shake(ctx, 18, 10); sfx(ctx, 'impact_crack_01', 1); sfx(ctx, 'boom_medium_02', 0.9) }
    if (k === M.hammer + 4) sfx(ctx, 'whoosh_medium_01', 0.9)
    if (k === M.slam) { strike(ctx, R.slam, M.stop.slam, 1.5, 'slam'); shake(ctx, 36, 36); sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'hit_heavy_boom_01', 0.9) }
    if (k === M.slam + 14) sfx(ctx, 'rumble_tail_01', 1)
    if (c.ko && k > M.jabs[0] && k < M.hammer) c.k = M.hammer
  },
  dragon(ctx, k) {
    const D = GOKU_CINE.dragon, R = D.raw
    if (k === 0) { sfx(ctx, 'boom_huge_02_roar', 0.75); sfx(ctx, 'charge_swell_riser', 0.9); shake(ctx, 10, 30) }
    if (k === D.charge) { sfx(ctx, 'energy_hum_low', 0.8); sfx(ctx, 'crack_sizzle_bright', 0.6) }
    if (k > D.charge && k < D.launch && (k - D.charge) % 12 === 0) { shake(ctx, 4 + 8 * seg(k, D.charge, D.launch), 12); sfx(ctx, 'crack_sizzle_bright', 0.3 + 0.4 * seg(k, D.charge, D.launch)) }
    if (k === D.launch - 8) sfx(ctx, 'boom_anticipation_suck', 1)
    if (k === D.launch) { sfx(ctx, 'whoosh_medium_01', 1); sfx(ctx, 'swish_fast_01', 0.9); shake(ctx, 12, 8) }
    if (k === D.contact) { strike(ctx, R.punch, D.stop.punch, 1.0, 'punch'); shake(ctx, 24, 18); sfx(ctx, 'hit_heavy_boom_01', 1); sfx(ctx, 'impact_crack_01', 0.9) }
    if (k === D.rise0) { sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'charge_hum_rise', 0.8); shake(ctx, 16, 40) }
    if (k === D.roar) { sfx(ctx, 'boom_huge_02_roar', 1); sfx(ctx, 'boom_anticipation_suck', 0.8) }
    if (k === D.burst) { strike(ctx, R.burst, D.stop.burst, 1.6, 'burst'); shake(ctx, 36, 36); sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1) }
    if (k === D.land) { sfx(ctx, 'boom_medium_02', 0.9); sfx(ctx, 'rumble_tail_01', 0.9); shake(ctx, 16, 14) }
    if (c.ko && k > D.contact && k < D.roar) c.k = D.roar
  },
  ui(ctx, k) {
    const U = GOKU_CINE.ui, R = U.raw
    if (k === 0) { sfx(ctx, 'energy_tone_hold', 0.8); sfx(ctx, 'sting_pitch_rise_hold', 0.6) }
    if (k === U.eye) { sfx(ctx, 'pitch_drop_slowmo', 0.8); sfx(ctx, 'energy_hum_low', 0.5) }
    if (k === U.vanish) { sfx(ctx, 'warp_wobble_02', 0.9); sfx(ctx, 'swish_fast_03', 0.8) }
    if (k > U.vanish && k < U.appear && (k - U.vanish) % 4 === 0) sfx(ctx, ((k >> 2) % 3) === 0 ? 'swish_fast_01' : ((k >> 2) % 3) === 1 ? 'swish_fast_02' : 'swish_fast_03', 0.35)
    U.strikes.forEach((s, i) => { if (k === s) { strike(ctx, R.strike, U.stop.strike, 0.5 + i * 0.08, 'strike'); shake(ctx, 8 + i * 2, 8); sfx(ctx, 'hit_heavy_boom_01', 0.6 + i * 0.08); sfx(ctx, 'impact_crack_01', 0.5) } })
    if (k === U.appear) { sfx(ctx, 'warp_wobble_01', 0.7); sfx(ctx, 'boom_anticipation_suck', 1) }
    if (k === U.palm) { strike(ctx, R.palm, U.stop.palm, 1.5, 'palm'); shake(ctx, 32, 34); sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_02_roar', 0.9); sfx(ctx, 'boom_huge_01', 0.8) }
    if (k === U.palm + 14) sfx(ctx, 'rumble_tail_01', 0.9)
    if (c.ko && k > U.strikes[0] && k < U.appear) c.k = U.appear
  },
}

// ── fighters for script frame c.k (also during hit-stop, so they stay pinned) ──
function place() {
  const k = c.k, f = c.caster, t = c.target, d = c.d, g = c.g, tp = c.tp
  POSE[c.kind](k, g, tp, d)
  if (c.guarded) { if (tp.pose === 'hurt' || tp.pose === 'down') tp.pose = 'guard'; tp.rot = 0; tp.feet = Math.min(tp.feet, c.tFloor) }
  for (const o of [f, t]) { o._juiceAttackTrail = false; o._juiceDashTrail = false; o._juiceTrailBuf = null }
  f.vx = 0; f.vy = 0; f.facing = d; f._fxAlpha = 0
  f.x = Math.round(g.x - (f.w || 48) / 2); f.y = Math.round(g.feet - (f.h || 94))
  f.onGround = g.feet >= c.floor - 1; f.grounded = f.onGround
  t.x = Math.round(tp.x - (t.w || 48) / 2); t.y = Math.round(tp.feet - (t.h || 94))
  t.vx = 0; t.vy = 0; t.onGround = tp.feet >= c.tFloor - 1; t.grounded = t.onGround; t.facing = -d
  if (c.drawFoe) t._fxAlpha = 0
  if (c.guarded) { t.isBlocking = true; t.blockstun = Math.max(t.blockstun || 0, 9999) } else { t.isBlocking = false; t.hitstun = Math.max(t.hitstun || 0, 9999) }
}
const lerp = (a, b, u) => a + (b - a) * u
const jit = (k, a) => (((k * 7) >> 1) & 1 ? 1 : -1) * a
const POSE = {
  kame(k, g, tp, d) {
    const K = GOKU_CINE.kame
    g.x = c.fx0; g.feet = c.floor; g.rot = 0; g.hide = false
    if (k < K.title) { g.key = 'kiCharge'; g.fi = (k >> 2) % 8 }
    else if (k < K.fire) { g.key = 'gokuKamehameha'; g.fi = k < K.syl[1] ? 0 : k < K.syl[3] ? 1 : 2; g.x = c.fx0 + (k >= K.syl[2] ? jit(k, 1) : 0) }
    else if (k < K.beamOff + 6) { g.key = 'gokuKamehameha'; g.fi = 3; g.x = c.fx0 - d * 6 * easeO(seg(k, K.fire, K.fire + 6)) + jit(k, k < K.blast ? 1.5 : 0) }
    else { g.key = 'idle'; g.fi = (k >> 3) % 6; g.x = c.fx0 - d * 6 }
    // the foe: braced, hit, swallowed and driven back, thrown out by the detonation into the crater
    tp.x = c.tx0; tp.feet = c.tFloor; tp.rot = 0; tp.pose = 'hurt'
    if (k < K.contact) tp.pose = c.guarded ? 'guard' : 'idle'
    else if (k < K.blast) { tp.x = lerp(c.tx0, lerp(c.tx0, c.tEnd, 0.55), easeO(seg(k, K.contact, K.blast))) + jit(k, 3) }
    else { const u = seg(k, K.blast, K.blast + 26); tp.x = lerp(lerp(c.tx0, c.tEnd, 0.55), c.tEnd, easeO(u)); tp.feet = c.tFloor - Math.sin(u * Math.PI) * 90
      tp.rot = -d * 1.4 * easeO(u); if (u >= 1) { tp.pose = 'down'; tp.rot = 0 } }
  },
  bomb(k, g, tp, d) {
    const B = GOKU_CINE.bomb
    g.x = c.fx0; g.feet = c.floor; g.rot = 0; g.hide = false
    if (k < B.gather0) { g.key = 'win'; g.fi = Math.min(4, (k / 7) | 0) }
    else if (k < B.throw - 6) { g.key = 'win'; g.fi = 5; g.x = c.fx0 + (k > B.throw - 40 ? jit(k, 1) : 0) }
    else if (k < B.throw + 30) { g.key = k < B.throw ? 'win' : 'gokuKamehameha'; g.fi = k < B.throw ? 5 : 3 }
    else if (k < B.blast + 30) { g.key = 'guard'; g.fi = 0 }
    else { g.key = 'idle'; g.fi = (k >> 3) % 6 }
    tp.x = c.tx0; tp.feet = c.tFloor; tp.rot = 0; tp.pose = k < B.throw ? 'idle' : 'hurt'
    if (k >= B.contact && k < B.blast) { tp.x = c.tx0 + jit(k, 2); tp.feet = c.tFloor + 6 * seg(k, B.contact, B.blast) }   // ground into the earth
    else if (k >= B.blast) { const u = seg(k, B.blast, B.blast + 28); tp.x = lerp(c.tx0, c.tEnd, easeO(u)); tp.feet = c.tFloor - Math.sin(u * Math.PI) * 130; tp.rot = -d * 2.2 * easeO(u); if (u >= 1) { tp.pose = 'down'; tp.rot = 0 } }
  },
  meteor(k, g, tp, d) {
    const M = GOKU_CINE.meteor, air = c.tFloor - 170
    g.rot = 0; g.hide = false; g.feet = c.floor
    tp.x = c.tx0; tp.feet = c.tFloor; tp.rot = 0; tp.pose = k < M.jabs[0] ? 'idle' : 'hurt'
    // the foe's flight: launched by the kick, bumped by the aerial, MEteor-smashed into the ground
    if (k >= M.kick && k < M.hammer) { const u = easeO(seg(k, M.kick, M.port + 4)); tp.feet = lerp(c.tFloor, air, u); tp.rot = d * 0.5 * u
      if (k >= M.aerial) { const v = easeO(seg(k, M.aerial, M.raise)); tp.feet = air - 30 * v; tp.x = c.tx0 + d * 20 * v; tp.rot = d * (0.5 + 1.2 * v) } }
    if (k >= M.hammer) { const u = seg(k, M.hammer, M.slam); tp.x = lerp(c.tx0 + d * 20, c.tEnd, u); tp.feet = lerp(air - 30, c.tFloor, u * u); tp.rot = d * (1.7 + 1.4 * u)
      if (k >= M.slam) { tp.pose = 'down'; tp.rot = 0; tp.x = c.tEnd; tp.feet = c.tFloor + 4 } }
    if (k < M.dash) { g.x = c.fx0; g.key = 'kiCharge'; g.fi = (k >> 2) % 8 }
    else if (k < M.arrive) { g.x = lerp(c.fx0, c.gNear, easeO(seg(k, M.dash, M.arrive))); g.key = 'heavy'; g.fi = 0; g.hide = k > M.dash + 1 && k < M.arrive - 1 }
    else if (k < M.kick - 4) { g.x = c.gNear; const i = (k - M.arrive) >> 2; g.key = (i & 1) ? 'heavy' : 'light'; g.fi = (i >> 1) & 1 ? 1 : 0; if (g.key === 'light') g.fi = 0 }
    else if (k < M.port) { g.x = c.gNear; g.key = 'up'; g.fi = k < M.kick ? 0 : 1 }
    else if (k < M.aerial) { g.hide = k < M.port + 6; g.x = tp.x - d * 50; g.feet = tp.feet + 10; g.key = 'air'; g.fi = 1 }
    else if (k < M.raise) { g.x = tp.x - d * 46; g.feet = tp.feet + 6; g.key = 'air'; g.fi = 1 }
    else if (k < M.hammer) { g.x = tp.x - d * 18; g.feet = tp.feet - 70; g.key = 'jump'; g.fi = 2 }
    else if (k < M.slam + 4) { const u = seg(k, M.hammer, M.hammer + 4); g.x = tp.x - d * 20; g.feet = Math.min(c.floor, tp.feet - 70 + 40 * u); g.key = 'heavy'; g.fi = 1; g.rot = d * 1.3 }
    else { const u = seg(k, M.slam + 4, M.slam + 24); g.x = c.tEnd - d * 90; g.feet = lerp(c.tFloor - 200, c.floor, ease(u)); g.key = u < 1 ? 'jump' : 'idle'; g.fi = u < 1 ? 1 : (k >> 3) % 6 }
  },
  dragon(k, g, tp, d) {
    const D = GOKU_CINE.dragon, top = c.tFloor - 150
    g.rot = 0; g.hide = false; g.feet = c.floor
    tp.x = c.tx0; tp.feet = c.tFloor; tp.rot = 0; tp.pose = k < D.contact ? 'idle' : 'hurt'
    if (k >= D.rise0 && k < D.burst) { const u = ease(seg(k, D.rise0, D.roar)); tp.feet = lerp(c.tFloor, top, u); tp.x = c.tx0 + Math.sin(k / 6) * 10 * u; tp.rot = d * Math.sin(k / 5) * 0.5 * u }
    if (k >= D.burst) { const u = seg(k, D.fall, D.land); tp.x = lerp(c.tx0, c.tEnd, seg(k, D.burst, D.land)); tp.feet = k < D.fall ? top : lerp(top, c.tFloor, u * u); tp.rot = d * (2 + 3 * seg(k, D.burst, D.land)); if (k >= D.land) { tp.pose = 'down'; tp.rot = 0; tp.feet = c.tFloor + 4 } }
    if (k < D.launch) { g.x = c.fx0 + (k > D.charge ? jit(k, 1.5) : 0); g.key = 'kiCharge'; g.fi = (k >> 2) % 8 }
    else if (k < D.contact) { g.x = lerp(c.fx0, c.gNear, easeO(seg(k, D.launch, D.contact))); g.feet = c.floor - 30 * Math.sin(seg(k, D.launch, D.contact) * Math.PI); g.key = 'down_air'; g.fi = 1 }
    else if (k < D.rise0) { g.x = c.gNear; g.key = 'light'; g.fi = 0 }
    else if (k < D.burst) { const u = ease(seg(k, D.rise0, D.roar)); g.x = c.gNear; g.feet = lerp(c.floor, top + 30, u); g.key = 'up'; g.fi = 1 }   // he rides the dragon up, fist first
    else { const u = ease(seg(k, D.burst + 6, D.land + 6)); g.x = c.gNear - d * 30 * u; g.feet = lerp(top + 30, c.floor, u); g.key = u < 1 ? 'jump' : 'idle'; g.fi = u < 1 ? 1 : (k >> 3) % 6 }
  },
  ui(k, g, tp, d) {
    const U = GOKU_CINE.ui
    g.rot = 0; g.feet = c.floor; g.hide = false
    tp.x = c.tx0; tp.feet = c.tFloor; tp.rot = 0; tp.pose = k < U.strikes[0] ? 'idle' : 'hurt'
    if (k >= U.strikes[0] && k < U.palm) { const n = U.strikes.filter(s => k >= s).length; tp.feet = c.tFloor - 14 * n * Math.min(1, seg(k, U.strikes[0], U.strikes[0] + 6)); tp.x = c.tx0 + jit(k, 2) }
    if (k >= U.palm) { const u = seg(k, U.palm, U.palm + 26); tp.x = lerp(c.tx0, c.tEnd, easeO(u)); tp.feet = lerp(c.tFloor - 56, c.tFloor, u) - Math.sin(u * Math.PI) * 50; tp.rot = -d * 1.6 * easeO(u); if (u >= 1) { tp.pose = 'down'; tp.rot = 0 } }
    if (k < U.vanish) { g.x = c.fx0; g.key = 'guard'; g.fi = 0 }
    else if (k < U.appear) { g.x = c.gNear; g.hide = true; g.key = 'light'; g.fi = 0 }   // only afterimages strike
    else if (k < U.palm + 30) { g.x = c.gNear; g.key = k < U.palm - 2 ? 'guard' : 'light'; g.fi = 0 }
    else { g.x = c.gNear; g.key = 'guard'; g.fi = 0 }
  },
}

function camera(cam, k) {
  if (!cam?.focusOnFighter) return
  const f = c.caster, t = c.target, kind = c.kind
  if (k < 30) { cam.focusBetween?.(f, t, 1.0); return }
  const C = GOKU_CINE[kind]
  if (kind === 'kame') { if (k < C.fire) cam.focusOnFighter(f, 1.3); else if (k < C.blast + 30) cam.focusBetween?.(f, t, 1.05); else cam.focusOnFighter(t, 1.15) }
  else if (kind === 'bomb') { if (k < C.throw) cam.focusOnFighter(f, 1.0); else cam.focusOnFighter(t, 1.1) }
  else cam.focusOnFighter(t, 1.2)
}

function restoreFighters(final) {
  const f = c.caster, t = c.target
  if (t) { t.vx = 0; t.vy = 0; t.hitstun = 0; t.blockstun = 0
    t.x = Math.round((final ? c.tEnd : c.tx0) - (t.w || 48) / 2); t.y = c.tFloor - (t.h || 94); t.onGround = true; t.grounded = true
    if (c.tAlpha0 == null) delete t._fxAlpha; else t._fxAlpha = c.tAlpha0
    t.isBlocking = false
    if (final && t.health > 0 && !c.guarded) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 44) }
    if (final && c.guarded) t.blockstun = 24 }
  if (f) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f._spriteCastMove = null; f._spriteCastTimer = 0
    f.vx = 0; f.vy = 0; f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true
    if (final) f.x = Math.round(c.g.x - (f.w || 48) / 2)
    if (c.fAlpha0 == null) delete f._fxAlpha; else f._fxAlpha = c.fAlpha0
    if (final) f.attackCooldown = 14 }
  const cam = c.cam, sv = c.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
}
function finish() {
  gokuUltLast = { form: c.form, kind: c.kind, hits: c.hits, dealt: Math.round(c.dealt), ko: c.ko }
  restoreFighters(true); reset()
}
const reset = () => { for (const k of Object.keys(c)) delete c[k]; c.active = false }
export function clear() { if (!c.active) return; restoreFighters(false); reset() }

registerUltCast('goku', cast)
registerFreezeCine('goku_ult', { active: isGokuUltActive, update, clear })
import './gokuUltFx.js'
