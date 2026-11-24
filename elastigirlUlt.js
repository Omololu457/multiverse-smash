// Elastigirl (elastigirl) — FAMILY RAFT CINEMATIC (2026-11-23; owner: "make them more cinematic … make sure you can
// actually feel the power between those attacks"). SIMULATION ONLY — the render lives in elastigirlUltFx.js.
//
// The ultimate's opener is unchanged: the R14 windup, then the raft (Helen carrying Dash and Violet) surges. Its first
// CLEAN contact snatches the foe into a FROZEN cinematic through the shared cineRegistry.js slot (game.js freezes combat /
// physics / input and calls update(ctx) every frame):
//   SNATCH      0–24   both arms shoot across the screen, grab the foe, yank them up to shoulder height
//   WHIP        24–94  the foe is whipped over her head into the floor BEHIND her (hit 1), then back over into the floor in
//                      FRONT (hit 2) and bounces high
//   SLINGSHOT   94–136 hands anchored on the floor ahead, body drawn back like a rubber band … released into a flying kick
//                      through the airborne foe (hit 3)
//   GIANT FIST  136–166 above the foe, one fist inflates to a giant fist and hammers them into the ground (hit 4, FINISHER)
//   PARACHUTE   166–220 she floats down as a parachute while the dust settles; letterbox out
// Every position is a pure function of the cinematic frame `k` (layout()). Hit-stop holds `k` (the world freezes on each
// contact) while `tick` keeps counting for the effects. No Math.random / wall clock. Damage goes through W.damage
// (applyScaledDamage). A KO on any hit plays the rest of the scene without further damage and ends cleanly.
import { ULT_CINE as U } from './elastigirlData.js'
import { registerFreezeCine } from './cineRegistry.js'

const cine = { active: false }
export const isElastigirlUltActive = () => !!cine.active
export const elastigirlUltScene = () => (cine.active ? cine : null)
export const elastigirlUltStatus = () => ({ active: !!cine.active, k: cine.k | 0, tick: cine.tick | 0, hits: cine.hits | 0, dealt: Math.round(cine.dealt || 0), ko: !!cine.ko,
  caster: cine.caster?.side ?? null })
// last finished cinematic (tests / stats; plain numbers only)
export let elastigirlUltLast = null

const ctrX = o => (o.x || 0) + (o.w || 48) / 2
const feet = o => (o.y || 0) + (o.h || 94)
const clamp = (v, a, b) => v < a ? a : v > b ? b : v
const lerp = (a, b, u) => a + (b - a) * u
const ease = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u) }
const easeIn = u => { u = clamp(u, 0, 1); return u * u }
const easeOut = u => { u = clamp(u, 0, 1); return 1 - (1 - u) * (1 - u) }
const seg = (k, a, b) => clamp((k - a) / (b - a), 0, 1)
// sprite poses without a sheet-drawn long limb (the cinematic draws her limbs): eWhip strip frame 2 wind-up / 3 arm raised /
// 11 crouched hammer-down / 12 settle (timeline ticks 6 / 9 / 26 / 34)
const whipAt = u => u < 0.3 ? 6 : u < 0.78 ? 9 : 26
function pose(f, move, at) {
  f.attacking = true; f.currentMove = move
  f.currentAttack = { name: move, total: 999, timer: 999 - Math.max(0, at | 0), activeStart: 9999, activeEnd: 9999, rangeX: 0, rangeY: 0, damage: 0, hasHit: true, mb: null, _ultPose: true, _egCine: true }
}

// ── START (elastigirlState.elastigirlHit: the raft's first clean contact) ───────────────────────────────────────────
export function startElastigirlUlt(f, t, W, dir) {
  if (cine.active || !f || !t || !(f.health > 0)) return false
  const stage = W?.stageWidth?.() || 3200, d = dir || f.facing || 1, floor = feet(f)
  const th = t.h || 94, tw = t.w || 48
  // the pivot (her shoulder) keeps the whole whip arc on stage: she slides there during the snatch if a wall is close
  const reach = U.R[2] + tw / 2 + 24
  const px = clamp(ctrX(f), reach, stage - reach)
  for (const k of Object.keys(cine)) delete cine[k]
  Object.assign(cine, { active: true, k: 0, tick: 0, hold: 0, caster: f, target: t, W, stage, d, floor, px, hx0: ctrX(f), tx0: ctrX(t), ty0: feet(t),
    th, tw, fh: f.h || 94, hp0: t.health || 0, hits: 0, dealt: 0, ko: false, done: [], fx: [], alpha0: t._fxRot ?? null })
  f.vx = 0; f.vy = 0; f.facing = d; f.hitstop = 0
  t.hitstun = Math.max(t.hitstun || 0, 9999); t.isBlocking = false; t.vx = 0; t.vy = 0; t.hitstop = 0; t.facing = -d
  const s = f._elastigirl; if (s) { s.ult = { k: 0, hits: 0 }; s.stats.ultCines = (s.stats.ultCines || 0) + 1 }
  return true
}

// ── LAYOUT: everything as a pure function of k ──────────────────────────────────────────────────────────────────────
// h: Helen (centre x, feet y, pose, pose frame) · t: foe (centre x, centre y, rotation) · arms: world-space limbs for the
// render ({ x0, y0, x1, y1, bend, w, fist, open }) · anchors: planted hands for the slingshot
export function layout(c, k) {
  const d = c.d, floor = c.floor, px = c.px, th = c.th, tw = c.tw, fh = c.fh
  const Sy = floor - fh * 0.70                                          // shoulder height
  const R = U.R
  const onFloorBehind = Math.PI + Math.asin(clamp((floor - th / 2 - Sy) / R[1], -1, 1))   // φ where the foe's centre meets the floor behind
  const onFloorFront = -Math.asin(clamp((floor - th / 2 - Sy) / R[2], -1, 1))
  const arcPt = (phi, r) => ({ x: px + d * r * Math.cos(phi), y: Sy - r * Math.sin(phi) })
  const h = { x: px, feet: floor, pose: 'idle', at: 0 }, t = { x: c.tx0, cy: c.ty0 - th / 2, rot: 0 }
  const arms = [], anchors = []
  let phase = 'snatch'
  const shoulder = () => ({ x: h.x + d * 6, y: h.feet - fh * 0.70 })
  const both = (x1, y1, bend, w = 7, extra = {}) => { const s = shoulder(); arms.push({ x0: s.x - d * 4, y0: s.y + 2, x1: x1 - d * 6, y1: y1 + 6, bend, w, ...extra }, { x0: s.x + d * 4, y0: s.y - 2, x1: x1 + d * 6, y1: y1 - 6, bend: bend * 0.8, w, ...extra }) }
  const frontX = px + d * R[2], apexX = px + d * (R[2] + 60)
  const apexY = floor - U.apex                                             // foe centre at the top of the bounce
  const kickPt = { x: apexX + d * 30, y: apexY - 50 }                      // the kick knocks them a little higher / further
  if (k < U.swing) {
    // SNATCH — raft impact pushes the foe out, both arms shoot across the screen and yank them up to shoulder height
    const slid = { x: lerp(c.tx0, px + d * R[0], easeOut(seg(k, 0, 10))), y: c.ty0 - th / 2 }
    h.x = lerp(c.hx0, px, ease(seg(k, 0, U.grip)))
    h.pose = k < U.grip ? 'eLongArm' : 'grab'; h.at = k < U.grip ? 5 : 0
    const grab = arcPt(0, R[0])
    if (k < U.grip) { t.x = slid.x; t.cy = slid.y }
    else { const u = easeOut(seg(k, U.grip, U.swing)); t.x = lerp(slid.x, grab.x, u); t.cy = lerp(slid.y, grab.y, u) }
    const reachU = easeOut(seg(k, 2, U.grip)), s = shoulder()
    both(lerp(s.x, t.x - d * tw * 0.2, reachU), lerp(s.y, t.cy, reachU), k < U.grip ? 18 * (1 - reachU) : -10, 7, { open: k < U.grip })
  } else if (k < U.anchor) {
    // WHIP — over the head into the floor behind (slam 1), back over into the floor in front (slam 2), then the bounce
    phase = 'whip'
    let phi, r
    if (k <= U.slam1) { const u = easeIn(seg(k, U.swing, U.slam1)); phi = lerp(0, onFloorBehind, u); r = lerp(R[0], R[1], u); h.pose = 'eWhip'; h.at = whipAt(seg(k, U.swing, U.slam1)) }
    else if (k <= U.slam1 + 6) { phi = onFloorBehind - 0.05 * Math.sin(Math.PI * seg(k, U.slam1, U.slam1 + 6)); r = R[1]; h.pose = 'eWhip'; h.at = 34 }
    else if (k <= U.slam2) { const u = easeIn(seg(k, U.slam1 + 6, U.slam2)); phi = lerp(onFloorBehind, onFloorFront, u); r = lerp(R[1], R[2], u); h.pose = 'eWhip'; h.at = whipAt(seg(k, U.slam1 + 6, U.slam2)) }
    if (k <= U.slam2) {
      const p = arcPt(phi, r); t.x = p.x; t.cy = p.y; t.rot = d * (Math.PI / 2 - phi)
      const lag = k <= U.slam1 ? 1 : -1                                    // the limbs trail the swing: curve against the motion
      both(t.x, t.cy, lag * d * 46 * Math.sin(Math.PI * seg(k, k <= U.slam1 ? U.swing : U.slam1 + 6, k <= U.slam1 ? U.slam1 : U.slam2)), 8)
    } else {
      // the bounce: up and away from the front slam, spinning; the arms snap back to her
      const u = easeOut(seg(k, U.slam2, U.anchor + 18))
      t.x = lerp(frontX, apexX, u); t.cy = lerp(floor - th / 2, apexY, u); t.rot = d * (Math.PI / 2 + (k - U.slam2) * 0.28)
      h.pose = 'eWhip'; h.at = k < U.slam2 + 6 ? 26 : 34
      const back = easeIn(seg(k, U.slam2, U.slam2 + 8)), s = shoulder()
      if (back < 1) both(lerp(frontX, s.x + d * 20, back), lerp(floor - th / 2, s.y, back), -14 * d, 8)
    }
  } else if (k < U.kick) {
    // SLINGSHOT — hands planted ahead, body drawn back (the stretch builds), release → she rockets into the foe
    phase = 'sling'
    const ax = px + d * 70
    anchors.push({ x: ax - d * 10, y: floor }, { x: ax + d * 12, y: floor })
    const bx = px - d * 160
    const u = easeOut(seg(k, U.slam2, U.anchor + 18))
    t.x = lerp(frontX, apexX, u); t.cy = lerp(floor - th / 2, apexY, u) + (k >= U.anchor + 18 ? Math.sin((k - U.anchor) * 0.2) * 3 : 0)
    t.rot = d * (Math.PI / 2 + (k - U.slam2) * (0.28 - 0.0035 * (k - U.slam2)))
    if (k < U.release) {
      const p = ease(seg(k, U.anchor, U.release)), tremble = k > U.release - 8 ? ((k & 1) ? 1.5 : -1.5) : 0
      h.x = lerp(px, bx, p) + tremble; h.pose = 'up'; h.at = 0
      const s = shoulder()
      for (const a of anchors) arms.push({ x0: s.x, y0: s.y + 6, x1: a.x, y1: a.y - 4, bend: 0, w: lerp(8, 4.5, p), taut: p })
    } else {
      // released: fly straight at the foe
      const u2 = easeIn(seg(k, U.release, U.kick)), from = { x: bx, y: floor }, to = { x: kickPt.x - d * 46, y: kickPt.y + fh * 0.45 }
      h.x = lerp(from.x, to.x, u2); h.feet = lerp(from.y, to.y, u2); h.pose = 'eWhirl'; h.at = 8
      const snap = seg(k, U.release, U.release + 5), s = shoulder()
      if (snap < 1) for (const a of anchors) arms.push({ x0: s.x, y0: s.y, x1: lerp(a.x, s.x, easeIn(snap)), y1: lerp(a.y, s.y, easeIn(snap)), bend: 20 * d * (1 - snap), w: 5 })
      phase = 'release'
    }
  } else if (k <= U.land) {
    // GIANT FIST — kicked higher, she rises above, a fist inflates, then hammers the foe into the ground
    phase = k < U.smash ? 'fist' : 'smash'
    const top = { x: kickPt.x, y: kickPt.y }
    if (k < U.smash) { const u = easeOut(seg(k, U.kick, U.kick + 10)); t.x = lerp(apexX, top.x, u); t.cy = lerp(apexY, top.y, u) + Math.sin((k - U.kick) * 0.15) * 4 }
    else { const u = easeIn(seg(k, U.smash, U.land)); t.x = top.x; t.cy = lerp(top.y, floor - tw / 2 - 2, u) }
    t.rot = d * (Math.PI / 2 + (k < U.smash ? (U.kick - U.slam2) * 0.12 + (k - U.kick) * 0.06 : Math.PI * 2))
    const hx = top.x - d * 70, hf = floor - U.rise
    const u = easeOut(seg(k, U.kick, U.kick + 12))
    h.x = lerp(kickPt.x - d * 46, hx, u); h.feet = lerp(kickPt.y + fh * 0.45, hf, u)
    h.pose = k < U.smash ? (k < U.kick + 5 ? 'eWhirl' : 'eBounce') : 'eWhip'; h.at = k < U.smash ? (k < U.kick + 5 ? 13 : k < U.inflate ? 8 : 12) : 26
    const s = shoulder(), r = 14 + 64 * ease(seg(k, U.inflate, U.smash - 4))
    const raised = { x: s.x - d * 70, y: s.y - 34 - r * 0.8 }
    let fx, fy
    if (k < U.smash) { const g = easeOut(seg(k, U.kick + 6, U.inflate + 6)); fx = lerp(s.x, raised.x, g); fy = lerp(s.y, raised.y, g) }
    else { const u2 = seg(k, U.smash, U.land), a0 = Math.atan2(raised.y - s.y, raised.x - s.x), a1 = Math.atan2(t.cy - th * 0.2 - r - s.y, t.x - s.x)
      const ang = lerp(a0, a1 + (a1 - a0 > Math.PI ? -2 * Math.PI : a1 - a0 < -Math.PI ? 2 * Math.PI : 0), easeIn(Math.min(1, u2 * 1.8)))
      const len = lerp(Math.hypot(raised.x - s.x, raised.y - s.y), Math.hypot(t.x - s.x, t.cy - tw / 2 - r - s.y), easeIn(u2))
      fx = s.x + Math.cos(ang) * len; fy = s.y + Math.sin(ang) * len
      if (u2 > 0.55) { fx = lerp(fx, t.x, (u2 - 0.55) / 0.45); fy = Math.min(fy, t.cy - tw / 2 - r * 0.7) } }
    arms.push({ x0: s.x, y0: s.y, x1: fx, y1: fy, bend: k < U.smash ? -18 * d : 30 * d, w: 9, fist: r })
  } else {
    // PARACHUTE — impact, the fist deflates, she floats down beside the crater; the foe lies in it
    phase = k < U.caption ? 'impact' : 'settle'
    const bounce = k < U.land + 8 ? Math.sin(Math.PI * seg(k, U.land, U.land + 8)) * 16 : 0
    t.x = kickPt.x; t.cy = floor - tw / 2 - 2 - bounce; t.rot = d * Math.PI / 2
    const hx0 = kickPt.x - d * 70, hx1 = clamp(kickPt.x - d * 120, 30, c.stage - 30), u = ease(seg(k, U.land + 4, U.out))
    h.x = lerp(hx0, hx1, u); h.feet = lerp(floor - U.rise, floor, u)
    h.pose = k < U.out ? 'eDome' : 'eDomeLand'; h.at = k < U.out ? Math.min(38, 11 + Math.floor((k - U.land) * 0.5)) : k - U.out
    const s = shoulder(), defl = seg(k, U.land, U.land + 10)
    if (defl < 1) arms.push({ x0: s.x, y0: s.y, x1: lerp(t.x, s.x, easeIn(defl)), y1: lerp(t.cy - tw / 2 - 40, s.y, easeIn(defl)), bend: 16 * d, w: 9, fist: 78 * (1 - defl) + 14 * defl })
  }
  h.x = clamp(h.x, 24, c.stage - 24); t.x = clamp(t.x, tw / 2, c.stage - tw / 2)
  return { phase, h, t, arms, anchors, Sy }
}

// ── UPDATE (one frame; game.js freezes everything else) ─────────────────────────────────────────────────────────────
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const own = (ctx, id) => { try { ctx?.sound?.play?.('elastigirl_' + id) } catch (_) {} }
// sound beats (k → [juice ids], own synth cues)
const BEATS = {
  0: [['sting_pitch_rise_hold', 0.9]], 2: [['swish_fast_01', 0.7]], 14: [['impact_crack_01', 0.5]], 24: [['whoosh_medium_01', 0.8]], 38: [['swish_fast_02', 0.7]],
  58: [['whoosh_medium_02', 0.85]], 70: [['swish_fast_03', 0.7]], 86: [['warp_wobble_01', 0.6]], 94: [['charge_swell_riser', 0.9]],
  116: [['swish_fast_03', 0.9], ['whoosh_medium_01', 0.9]], 130: [['warp_wobble_02', 0.5]], 136: [['boom_anticipation_suck', 0.9], ['energy_hum_low', 0.6]],
  150: [['pitch_drop_slowmo', 0.7]], 160: [['whoosh_medium_02', 1]], 178: [['rumble_tail_01', 0.9]], 206: [['energy_tone_hold', 0.35]],
}
const OWN = { 0: 'ultStretch', 14: 'snap', 94: 'ultStretch', 116: 'ultSnap', 136: 'ultInflate', 168: 'parachute' }
const HIT_SFX = [[['impact_hit_01', 1], ['boom_medium_01', 0.8]], [['hit_heavy_boom_01', 1], ['boom_medium_02', 0.85], ['impact_crack_01', 0.6]],
  [['crack_sizzle_bright', 0.9], ['hit_flurry_01', 0.8], ['impact_hit_01', 0.9]], [['boom_huge_02_roar', 1], ['boom_huge_01', 0.9], ['impact_frame_boom_long', 0.9]]]

function strike(ctx, i, L) {
  const c = cine, f = c.caster, t = c.target, H = U.hits[i]
  if (c.done[i]) return
  c.done[i] = true
  if (!c.ko && t.health > 0) {
    const before = t.health
    try { c.W?.damage?.(t, H.raw, { source: 'ultimate', attacker: f, move: 'ultimate', damageType: i === 3 ? 'crush' : 'blunt' }) } catch (_) {}
    c.dealt += Math.max(0, before - (t.health || 0))
    f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
    if (!(t.health > 0)) c.ko = true
  }
  c.hits = i + 1; t.colorFlash = 8
  c.hold = H.stop
  const x = L.t.x, y = i === 2 ? L.t.cy : c.floor
  c.fx.push({ tick: c.tick, i, x, y, cy: L.t.cy, power: i === 3 ? 3 : i === 2 ? 1.6 : 1 + i * 0.2 })
  if (c.fx.length > 12) c.fx.shift()
  for (const [id, g] of HIT_SFX[i]) sfx(ctx, id, g)
  own(ctx, i === 3 ? 'ultSlam' : 'thud')
  ctx?.camera?.shake?.(H.shake[0], H.shake[1])
  if (f._elastigirl?.ult) f._elastigirl.ult.hits = c.hits
}

function place(L) {
  const c = cine, f = c.caster, t = c.target, d = c.d
  f.x = L.h.x - (f.w || 48) / 2; f.y = L.h.feet - (f.h || 94); f.facing = d; f.vx = f.vy = 0; f.hitstop = 0   // (the sprite freezes its action while hitstop > 0)
  pose(f, L.h.pose, L.h.at)
  t.x = L.t.x - c.tw / 2; t.y = L.t.cy - c.th / 2; t.vx = t.vy = 0; t.isBlocking = false; t.facing = -d; t.hitstop = 0
  t._fxRot = L.t.rot || 0
  if (t.health > 0) t.hitstun = Math.max(t.hitstun || 0, 9999)
}

export function updateElastigirlUlt(ctx = {}) {
  const c = cine; if (!c.active) return
  const f = c.caster, t = c.target
  if (!f || !t) return clearElastigirlUlt()
  c.tick++
  if (c.k === 0 && c.tick === 1 && !(t.health > 0)) { c.ko = true }      // the opener already KO'd: play the scene with no damage
  const cam = ctx.camera, k = c.k
  if (c.hold > 0) {
    // HIT-STOP: the world holds on the contact frame; the camera still punches and the effects keep playing
    c.hold--
  } else {
    const L = layout(c, k)
    place(L)
    if (c.tick === 1 || c.lastBeat !== k) {
      c.lastBeat = k
      for (const [id, g] of BEATS[k] || []) sfx(ctx, id, g)
      if (OWN[k]) own(ctx, OWN[k])
      for (let i = 0; i < U.hits.length; i++) if (U.hits[i].at === k) strike(ctx, i, L)
    }
    if (c.hold === 0) c.k++
  }
  if (f._elastigirl?.ult) f._elastigirl.ult.k = c.k
  // CAMERA: push in on the snatch, pull out for the whip arc, wide on the slingshot, crash in on the kick, wide for the fist,
  // tight on the crater, settle
  if (cam?.focusOnFighter) {
    const L = layout(c, c.k), box = (x, y, z) => cam.focusOnFighter({ x: x - 24, y: y - 47, w: 48, h: 94 }, z)
    const kk = c.k, hx = L.h.x, tx = L.t.x
    if (kk < U.grip) box((hx + tx) / 2, c.floor - 90, 1.15)
    else if (kk < U.swing) box((hx + tx) / 2, c.floor - 110, 1.05)
    else if (kk < U.slam2 + 6) box(c.px, c.floor - 150, kk >= U.slam1 && kk < U.slam1 + 6 ? 0.95 : 0.86)
    else if (kk < U.release) box((c.px - c.d * 80 + L.t.x) / 2, c.floor - 170, 0.8)
    else if (kk < U.kick + 8) box((hx + tx) / 2, (L.h.feet + L.t.cy) / 2 - 40, 1.1)
    else if (kk < U.land) box((hx + tx) / 2, c.floor - 240, 0.78)
    else if (kk < U.out) box(tx - c.d * 50, c.floor - 120, kk < U.land + 20 ? 1.15 : 1.0)
    else box(tx - c.d * 60, c.floor - 100, 0.95)
  }
  if (c.k >= U.total) finish()
}

function restoreTarget(t, c, knock) {
  t._fxRot = 0; t.vx = 0; t.vy = 0; t.hitstop = 0; t.isLaunched = false
  t.y = c.floor - (t.h || 94); t.onGround = true; t.grounded = true
  t.hitstun = 0
  if (knock && t.health > 0) { t.knockdownState = true; t.knockdownTimer = Math.max(t.knockdownTimer || 0, 50) }
}
function restoreCaster(f, c, cd) {
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = cd; f.vx = 0; f.vy = 0; f.hitstop = 0
  f.y = c.floor - (f.h || 94); f.onGround = true; f.grounded = true; f.isLaunched = false
  if (f.spriteHandler) f.spriteHandler.locked = false
  if (f._elastigirl) delete f._elastigirl.ult
}
function snapshotLast(c, cleared) {
  elastigirlUltLast = { hits: c.hits, dealt: Math.round(c.dealt), ko: !!c.ko, k: c.k, tick: c.tick, cleared: !!cleared }
}
const reset = () => { for (const k of Object.keys(cine)) delete cine[k]; cine.active = false }
function finish() {
  const c = cine, f = c.caster, t = c.target
  snapshotLast(c, false)
  if (t) restoreTarget(t, c, true)
  if (f) { restoreCaster(f, c, U.recover); const x = clamp(f.x, 0, c.stage - (f.w || 48)); f.x = x }
  reset()
}
// Every reset path (round reset, rematch, KO teardown, menu): restore both fighters and drop the scene.
export function clearElastigirlUlt() {
  if (!cine.active) return
  const c = cine
  snapshotLast(c, true)
  if (c.target) restoreTarget(c.target, c, false)
  if (c.caster) restoreCaster(c.caster, c, 0)
  reset()
}

registerFreezeCine('elastigirl', { active: isElastigirlUltActive, update: updateElastigirlUlt, clear: clearElastigirlUlt })
