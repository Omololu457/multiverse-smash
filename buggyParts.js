// buggyParts.js — Buggy the Clown's detachable BODY PARTS, built on the generic drones.js module (no rewrite):
// each part is a DRONE PROFILE + a registered BEHAVIOUR. drones.js owns spawning, the 2-part cap (a 3rd part
// retires the oldest, 25% refund), HP / hurtboxes / hit flash, death → cooldownOnDeath, recall refunds (30% × HP
// left), flight.js accel/drag movement, leash + stage bounds and the render. This file adds only the Buggy data,
// the three behaviours, and the owner-side bookkeeping (mask bits, snap-back chip, part hits on the foe).
//
//   hand  (buggy_hand) — Chop-Chop Cannon: flies 60% of the screen (70, pierces → can park BEHIND the foe), hovers
//                        2 s, Special again → a 45 stab from wherever it hovers. Mask bit 2.
//   foot  (buggy_foot) — Quick Escape: the legs stay PLANTED where he stood (kick 30 if the foe walks into them).
//                        Mask bit 4.
//   head  (buggy_head) — Lookout: the head floats up-front and chomps (35) anything close. Mask bit 1. The AI
//                        prioritises it (aiPriority 3).
// A part at 0 HP snaps back: 25 chip damage to Buggy + a 6 s (360 f) cooldown on that pip.
//
// DETERMINISM: every part field lives on the drone object in drones.activeDrones (GAME_STATE). No Math.random /
// gameRng: timings are fixed frame counts; positions derive from fighters. Part hits on the foe go through
// applyScaledDamage (via the game.js world accessor) with 85% combo scaling.
import { registerDroneProfile, registerBehaviour, spawnDrone, recallDrones, getActiveDrones, DRONE_PROFILES, preloadDroneSprites } from './drones.js'
import { BUGGY_PARTS } from './buggySprites.js'

export const PART_BITS = { buggy_head: 1, buggy_hand: 2, buggy_foot: 4 }
export const PART_TUNING = {
  chipOnBreak: 25, cooldown: 360,
  hand: { flyFrac: 0.6, flySpeed: 16, hit: 70, hover: 120, stab: 45, stabSpeed: 18 },
  foot: { life: 240, kick: 30, kickEvery: 60, reach: 46 },
  head: { life: 300, bite: 35, biteEvery: 75, reach: 58 },
  partHitChop: 3,
}
export const REF_SCREEN_W = 1280   // the 1280-px reference screen (fixed — never the device canvas → LAN/replay-safe)
const S = 2.6   // part art → world scale (matches Buggy's on-screen body scale)
const sprites = (p, extra = {}) => ({ idle: { sheet: p.idle.sheet, frames: p.idle.frames }, death: { sheet: p.death.sheet, frames: p.death.frames }, ...extra })

// Shared profile fields: parts come HOME on retire / recall / expiry (drones.js retireMode 'home').
const BASE = { accel: 1.8, drag: 0.84, reverseBrake: 0.65, overspeedDrag: 0.9, bobAmp: 3, cooldownOnDeath: PART_TUNING.cooldown,
  retireMode: 'home', expireMode: 'retire', refundRetire: 0.25, refundRecall: 0.30, scale: S, nativeFacing: 'right', buggyPart: true }
registerDroneProfile('buggy_hand', { ...BASE, sprites: sprites(BUGGY_PARTS.hand), hp: 60, maxH: PART_TUNING.hand.flySpeed, maxV: 10, accel: 3,
  hoverHeight: 58, leash: 900, behaviour: 'buggyHand', techCost: 18, hurtbox: { w: 46, h: 36 }, aiPriority: 2 })
registerDroneProfile('buggy_foot', { ...BASE, sprites: sprites(BUGGY_PARTS.legs, { walk: { sheet: BUGGY_PARTS.foot.idle.sheet, frames: BUGGY_PARTS.foot.idle.frames } }),
  hp: 80, maxH: 8, maxV: 8, hoverHeight: 0, bobAmp: 0, leash: 700, behaviour: 'buggyLegs', techCost: 15, hurtbox: { w: 40, h: 70 }, aiPriority: 1 })
registerDroneProfile('buggy_head', { ...BASE, sprites: sprites(BUGGY_PARTS.head), hp: 50, maxH: 7, maxV: 7, hoverHeight: 150,
  leash: 260, behaviour: 'buggyHead', techCost: 8, hurtbox: { w: 50, h: 42 }, aiPriority: 3 })

for (const id of ['buggy_hand', 'buggy_foot', 'buggy_head']) preloadDroneSprites(id)   // render cache only (no-op in Node)

// World accessors (applyScaledDamage, screen width, seed) handed in by tickBuggy each sim frame.
let _W = null
export function setPartWorld(W) { _W = W }

const floorOf = f => (f.y || 0) + (f.h || 94)
const ctr = f => ({ x: (f.x || 0) + (f.w || 48) / 2, y: (f.y || 0) + (f.h || 94) * 0.45 })
const foeOf = d => { const t = d.target || d._opp; return t && !t.eliminated && t !== d.owner && t.side !== d.owner?.side ? t : null }
const touches = (d, foe, reach) => { if (!foe) return false; const c = ctr(foe); return Math.abs(c.x - d.x) < reach && Math.abs(c.y - d.y) < (foe.h || 94) * 0.6 + 10 }

// A part's strike on the foe: blockable, 85% combo scaling, combo credit for Buggy, +3 Chop.
export function partHit(d, foe, dmg, opts = {}) {
  const o = d.owner
  if (!o || !foe || (foe.invulnTimer || 0) > 0 || foe.health <= 0 || (foe.knockdownState && !opts.otg)) return false
  const dir = Math.sign(ctr(foe).x - d.x) || o.facing || 1
  if (foe.isBlocking && !opts.unblockable) {
    foe.blockstun = Math.max(foe.blockstun || 0, opts.blockstun || 12)
    foe.vx = dir * 3
    ;(o._buggyCues ||= []).push('partBlock')
    return 'blocked'
  }
  const scaled = dmg * Math.pow(0.85, o.comboCounter || 0)
  _W?.damage?.(foe, scaled, { source: 'ability', attacker: o, move: d.type, damageType: opts.damageType || 'slash' })
  foe.hitstun = Math.max(foe.hitstun || 0, opts.hitstun || 18)
  foe.vx = dir * (opts.kb ?? 5)
  if (opts.launch) foe.vy = opts.launch
  foe.hitFlash = Math.max(foe.hitFlash || 0, 6)
  o.comboCounter = (o.comboCounter || 0) + 1; o.comboTimer = 90
  const gain = opts.chop ?? PART_TUNING.partHitChop
  if (gain && !(o._buggy?.lockout > 0 || o._buggy?.inSuper)) o.energy = Math.min(o.maxEnergy || 100, (o.energy || 0) + gain)
  ;(o._buggyCues ||= []).push(opts.cue || 'partHit')
  return true
}

// ── BEHAVIOURS ────────────────────────────────────────────────────────────────────────────────────────────
// HAND: fly → hover → (stab) → home. d.data: st, dir, x0, travel, hit, t.
registerBehaviour('buggyHand', d => {
  const T = PART_TUNING.hand, D = d.data, foe = foeOf(d)
  D.t = (D.t || 0) + 1
  if (D.st === 'fly') {
    d.anim = 'idle'
    d.tx = d.x + D.dir * 200; d.ty = D.y0
    if (!D.hit && touches(d, foe, 34)) { D.hit = true; partHit(d, foe, T.hit, { hitstun: 22, kb: 6, cue: 'cannonHit' }) }
    if (Math.abs(d.x - D.x0) >= D.travel || D.t > 90 || d.x <= (_W?.leftWall ?? 0) + 4 || d.x >= (_W?.stageWidth?.() ?? 4000) - 4) { D.st = 'hover'; D.t = 0; D.hx = d.x; D.hy = d.y }
    return
  }
  if (D.st === 'hover') {
    d.tx = D.hx; d.ty = D.hy
    if (D.stabReq) { D.st = 'stab'; D.t = 0; D.hit = false; D.stabReq = false; return }
    if (D.t >= T.hover) d._retiring = 'expire'
    return
  }
  if (D.st === 'stab') {
    if (foe) { const c = ctr(foe); d.tx = c.x; d.ty = c.y }
    if (!D.hit && touches(d, foe, 30)) { D.hit = true; partHit(d, foe, T.stab, { hitstun: 20, kb: 4, cue: 'stab' }); D.t = 20 }
    if (D.hit ? D.t > 26 : D.t > 40) d._retiring = 'recall'
  }
})
// LEGS: planted on the floor where Buggy stood; kick whoever walks into them.
registerBehaviour('buggyLegs', d => {
  const T = PART_TUNING.foot, D = d.data, foe = foeOf(d)
  D.t = (D.t || 0) + 1
  d.tx = D.px; d.ty = D.py; d.anim = 'idle'
  if (D.kickCd > 0) D.kickCd--
  else if (touches(d, foe, T.reach) && Math.abs(floorOf(foe) - (D.py + 35)) < 40) { D.kickCd = T.kickEvery; partHit(d, foe, T.kick, { hitstun: 16, kb: 6, damageType: 'blunt', cue: 'kick' }) }
})
// HEAD: hover above-front of Buggy; chomp anything close.
registerBehaviour('buggyHead', d => {
  const T = PART_TUNING.head, D = d.data, o = d.owner, foe = foeOf(d)
  D.t = (D.t || 0) + 1
  const f = o.facing || 1, oc = ctr(o)
  if (foe && Math.abs(ctr(foe).x - oc.x) < 260) { const c = ctr(foe); d.tx = c.x - f * 10; d.ty = c.y - 30 }
  else { d.tx = oc.x + f * 70; d.ty = floorOf(o) - 150 }
  if (D.biteCd > 0) D.biteCd--
  else if (touches(d, foe, T.reach)) { D.biteCd = T.biteEvery; partHit(d, foe, T.bite, { hitstun: 18, kb: 3, cue: 'chomp' }) }
})

// ── OWNER API (called from buggyState / the command layer) ───────────────────────────────────────────────
const noSpend = () => true   // the Special already paid its Chop; drones.js still refunds by profile.techCost
export const ownParts = f => getActiveDrones().filter(d => d.owner === f && d.profile?.buggyPart)
export const livePart = (f, type) => getActiveDrones().find(d => d.owner === f && d.type === type && !d.dying && !d._retiring)
export const partReady = (f, type) => !(f?._gaDroneCd?.[type] > 0) && !livePart(f, type)

function place(d, x, y) { d.x = x; d.y = y; d.vx = 0; d.vy = 0; d.tx = x; d.ty = y; d.data.t = 0 }

export function launchHand(f, frame = 0) {
  if (!partReady(f, 'buggy_hand')) return null
  const d = spawnDrone(f, 'buggy_hand', { spendTech: noSpend, frame }); if (!d) return null
  const c = ctr(f), dir = f.facing || 1, sw = REF_SCREEN_W
  place(d, c.x + dir * 30, c.y - 6)
  Object.assign(d.data, { st: 'fly', dir, x0: d.x, y0: d.y, travel: sw * PART_TUNING.hand.flyFrac, hit: false })
  d.vx = dir * PART_TUNING.hand.flySpeed; d.facing = dir
  return d
}
export function stabHand(f) {
  const d = livePart(f, 'buggy_hand')
  if (!d || d.data.st !== 'hover') return false
  d.data.stabReq = true
  return true
}
export function plantLegs(f, frame = 0) {
  if (!partReady(f, 'buggy_foot')) return null
  const d = spawnDrone(f, 'buggy_foot', { spendTech: noSpend, frame }); if (!d) return null
  const c = ctr(f), py = floorOf(f) - 35
  place(d, c.x, py); Object.assign(d.data, { px: c.x, py, kickCd: 30 })
  d.life = PART_TUNING.foot.life
  return d
}
export function lookout(f, frame = 0) {
  if (!partReady(f, 'buggy_head')) return null
  const d = spawnDrone(f, 'buggy_head', { spendTech: noSpend, frame }); if (!d) return null
  const c = ctr(f)
  place(d, c.x, (f.y || 0) + 12); Object.assign(d.data, { biteCd: 40 })
  d.life = PART_TUNING.head.life
  return d
}
export function recallParts(f) { const n = ownParts(f).filter(d => !d.dying && !d._retiring).length; if (n) recallDrones(f); return n }

// Per-frame owner bookkeeping (tickBuggy): mask bits for the body rows + the snap-back chip on a broken part.
export function tickParts(f) {
  let live = 0, homing = 0
  for (const d of getActiveDrones()) {
    if (d.owner !== f || !d.profile?.buggyPart) continue
    if (d.dying) {
      if (!d.data.chipped) {
        d.data.chipped = true
        if (f.health > 0) _W?.damage?.(f, PART_TUNING.chipOnBreak, { source: 'buggy-part-break', bypassScale: true })
        ;(f._buggyCues ||= []).push('snapBack')
      }
      continue   // a broken part snaps straight back — body whole again
    }
    if (d._retiring) homing |= PART_BITS[d.type] || 0
    else live |= PART_BITS[d.type] || 0
  }
  // ≤ 2 parts are ever off the body (drones.js cap) — a part still flying home only shows while a row exists.
  const bits = m => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1)
  let mask = live
  for (const b of [1, 2, 4]) if ((homing & b) && !(mask & b) && bits(mask) < 2) mask |= b
  return mask
}
export { DRONE_PROFILES }
