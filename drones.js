/**
 * DRONES.JS — reusable, data-driven DEPLOYABLE-DRONE module.
 *
 * Green Arrow is the first user; a future tech character (Batman, Cyborg, Iron Man)
 * reuses it by adding a DRONE PROFILE (data) + spawning via spawnDrone(). Nothing in the
 * *logic* is character-specific — every number lives in DRONE_PROFILES, every behaviour in
 * the BEHAVIOURS registry (register your own with registerBehaviour()).
 *
 * This EXTENDS the summon model rather than duplicating the fight loop: drones are their own
 * hittable entities with HP/hurtboxes, parallel to activeSummons. They are summoned, updated,
 * drawn and cleared at the same call-sites as summons (game.js), and reuse summon damage
 * primitives where an attack *lands on the opponent*.
 *
 * SIM vs RENDER (determinism / LAN / replay):
 *   • Every field on a drone object is SIMULATION state. The whole drone lives in the module
 *     registry `activeDrones` (part of GAME_STATE), is reset on match start, and is replayed.
 *   • Hover bob, rotor blur, thruster particles, screen shake are RENDER-ONLY (drawDrones),
 *     computed from the frame counter, never read back by the sim.
 *   • No Math.random / gameRng anywhere. Any randomness uses hashRandom(seed, frame, idx*31+slot)
 *     imported from flight.js — a pure integer hash, so it is LAN/replay-safe.
 *
 * Movement reuses flight.js's accel/drag model via flightAxisStep / flightSoftLimit (imported,
 * not copied), so a drone coasts, reverse-brakes and soft-limits exactly like a flyer.
 */
import { hashRandom, flightAxisStep, flightSoftLimit } from "./flight.js"

// ─────────────────────────────────────────────────────────────────────────────
// Registry — THE global drone list (part of GAME_STATE). Reset on match start.
// Pooling: a hard cap of MAX_RENDER keeps per-frame work bounded; nothing is allocated
// per frame (drone objects are created on spawn, mutated in place, spliced on death).
// ─────────────────────────────────────────────────────────────────────────────
export const activeDrones = []
const MAX_RENDER = 40            // render/update cap on active drone projectiles+bodies
const MAX_ACTIVE_DEFAULT = 2     // max owned drones at once (3 during a Super)

// ─────────────────────────────────────────────────────────────────────────────
// DRONE PROFILES (pure data). Future characters add a key here — no logic changes.
//   id            unique profile key
//   sprites       { anim: { sheet, frames } } — animation strips (idle/walk/death/…)
//   hp            hit points (hittable entity)
//   accel/maxH/maxV/drag/reverseBrake/overspeedDrag   flight-model smoothing
//   hoverHeight   y-offset above the floor it hovers at (0 = planted on floor)
//   bobAmp        hover-bob amplitude (render-only sine)
//   leash         max distance from owner before it is pulled back
//   behaviour     BEHAVIOURS key (movement + actions)
//   cooldownOnDeath  frames the type is locked out after destruction
//   techCost      owner energy spent to summon
//   hurtbox       { w, h } collision box for incoming hits
//   scale         render scale (per the 35–70%-of-GA-height target sizes)
//   frontFacing   true = symmetric art, never mirrored (Overwatch, Aegis, Skyhook)
//   refundRetire/refundRecall  refund fractions (defaults 0.25 / 0.30)
// ─────────────────────────────────────────────────────────────────────────────
export const DRONE_PROFILES = {
  // Generic test dummy — used by the profile-driven determinism/generic test. Follows the
  // owner, hovers, is hittable, goes on cooldown when destroyed. No attack.
  test_dummy: {
    id: "test_dummy",
    sprites: { idle: { sheet: "./ga_overwatch_idle_sheet.png", frames: 4 }, death: { sheet: "./ga_overwatch_death_sheet.png", frames: 6 } },
    hp: 50, accel: 1.4, maxH: 10, maxV: 9, drag: 0.86, reverseBrake: 0.7, overspeedDrag: 0.9,
    hoverHeight: 150, bobAmp: 4, leash: 320, behaviour: "follow", cooldownOnDeath: 120,
    techCost: 20, hurtbox: { w: 40, h: 28 }, scale: 1.4, frontFacing: true, nativeFacing: "front",
  },
}

export function registerDroneProfile(id, profile) { DRONE_PROFILES[id] = { ...profile, id } }

// ─────────────────────────────────────────────────────────────────────────────
// BEHAVIOURS — per-frame (drone, ctx) handlers. They set a movement TARGET and may act.
// Core/generic handlers live here; GA-specific ones (recon/planted/guard/strafe/hook) are
// registered by the character layer (Phase 4) via registerBehaviour().
// ─────────────────────────────────────────────────────────────────────────────
const BEHAVIOURS = {}
export function registerBehaviour(name, fn) { BEHAVIOURS[name] = fn }

// follow: hover above+behind the owner. The reusable baseline (also the test dummy).
registerBehaviour("follow", (d) => {
  const o = d.owner; if (!o) return
  const behind = -(o.facing || 1)
  d.tx = (o.x || 0) + behind * 70
  d.ty = floorY(o) - (d.profile.hoverHeight || 120)
  d.anim = "idle"
})

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle
// ─────────────────────────────────────────────────────────────────────────────
export function resetDrones() { activeDrones.length = 0 }

export function ensureDroneOwnerState(owner) {
  if (!owner) return
  if (!owner._gaDroneCd) owner._gaDroneCd = {}       // {type: framesLeft}
  if (!owner._gaDronePips) owner._gaDronePips = []    // HUD read
}

export function countDrones(owner) {
  let n = 0
  for (const d of activeDrones) if (d.owner === owner && !d.dying && !d._retiring) n++
  return n
}

export function droneTypeOnCooldown(owner, type) {
  return !!(owner && owner._gaDroneCd && owner._gaDroneCd[type] > 0)
}

function floorY(f) {
  // the fighter's feet line; drones hover relative to it. f.y is top; f.h height.
  return (f && (f.groundY != null ? f.groundY : (f.y || 0) + (f.h || 100)))
}

// Spawn a drone. Honours cap (2, or 3 during owner._gaSuperActive), cooldown, tech cost.
// If at cap, retires the oldest (25% refund). opts.spendEnergy(owner,cost)->bool if provided.
export function spawnDrone(owner, type, opts = {}) {
  const profile = DRONE_PROFILES[type]
  if (!owner || !profile) return null
  ensureDroneOwnerState(owner)
  if (droneTypeOnCooldown(owner, type)) return null
  if ((owner._gaDisabled || 0) > 0) return null       // EMP lockout — no new drones while disabled
  if (activeDrones.length >= MAX_RENDER) return null
  const cap = owner._gaSuperActive ? 3 : MAX_ACTIVE_DEFAULT

  const cost = (opts.techCost != null) ? opts.techCost : (profile.techCost || 0)
  const refund = (opts.spendTech || defaultSpendTech)
  if (!refund(owner, cost)) return null        // not enough Tech

  if (countDrones(owner) >= cap) retireOldest(owner, opts)

  const slot = nextSlot(owner)
  const face = owner.facing || 1
  const d = {
    id: `${owner.side || "p?"}:${type}:${slot}`,
    type, profile, owner, ownerSide: owner.side,
    playerIndex: owner.playerNumber || (owner.side === "p2" ? 2 : 1),
    slot,
    x: (owner.x || 0) - face * 240,            // enters from off-screen behind
    y: floorY(owner) - (profile.hoverHeight || 120),
    vx: 0, vy: 0,
    hp: profile.hp, maxHp: profile.hp,
    facing: face,
    frame: 0, anim: "idle", animTimer: 0,
    mode: opts.mode || "protector",            // PROTECTOR (default) | STRIKE — sim state
    behaviour: profile.behaviour || "follow",
    state: "enter", stateTimer: 0,
    bornFrame: opts.frame || 0,
    life: profile.lifetime || Infinity,        // frames before self-expiry (Infinity = until killed)
    dying: false, deathTimer: 0,
    _retiring: false, _retireRefunded: false,
    target: opts.target || null,
    tx: owner.x || 0, ty: floorY(owner) - (profile.hoverHeight || 120),
    data: {},                                  // behaviour scratch (fireTimer, scanTimer, …)
  }
  activeDrones.push(d)
  return d
}

let _slotCounter = 0
function nextSlot(owner) { _slotCounter = (_slotCounter + 1) & 0x7fffffff; return _slotCounter }

function defaultSpendTech(owner, cost) {
  if ((owner.energy || 0) < cost) return false
  owner.energy = Math.max(0, (owner.energy || 0) - cost)
  return true
}
function grantTech(owner, amount) {
  if (!owner) return
  owner.energy = Math.min(owner.maxEnergy || 100, (owner.energy || 0) + amount)
}

// Drones take damage from any attack/projectile. Attacker gets NO meter and NO combo credit,
// and the hit does NOT freeze the main fight's hitstop.
export function damageDrone(drone, amount, attacker) {
  if (!drone || drone.dying) return false
  drone.hp -= amount
  drone._hitFlash = 6
  if (drone.hp <= 0) {
    drone.dying = true
    drone.anim = "death"
    drone.frame = 0; drone.animTimer = 0
    drone.deathTimer = (drone.profile.sprites?.death?.frames || 6) * 5 + 6
    const o = drone.owner
    if (o) { ensureDroneOwnerState(o); o._gaDroneCd[drone.type] = drone.profile.cooldownOnDeath || 120 }
  }
  return true
}

export function retireOldest(owner, opts = {}) {
  let oldest = null
  for (const d of activeDrones) {
    if (d.owner === owner && !d.dying && !d._retiring) { oldest = oldest || d }
  }
  if (!oldest) return
  oldest._retiring = "retire"
  if (!oldest._retireRefunded) {
    oldest._retireRefunded = true
    const frac = oldest.profile.refundRetire != null ? oldest.profile.refundRetire : 0.25
    grantTech(owner, Math.round((oldest.profile.techCost || 0) * frac))
  }
}

// RECALL — all owner drones dock; refund 30% of each cost scaled by remaining HP.
export function recallDrones(owner) {
  for (const d of activeDrones) {
    if (d.owner === owner && !d.dying && !d._retiring) {
      d._retiring = "recall"
      if (!d._retireRefunded) {
        d._retireRefunded = true
        const frac = d.profile.refundRecall != null ? d.profile.refundRecall : 0.30
        grantTech(owner, Math.round((d.profile.techCost || 0) * frac * (d.hp / d.maxHp)))
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-frame update. Call once from the battle loop (beside updateSummons).
//   owners : array of fighters that may own drones (p1,p2[,…])
//   frame  : global frame counter (deterministic hashing + bob phase)
// ─────────────────────────────────────────────────────────────────────────────
const _defaultIsEnemy = (o, f) => !!(o && f && f !== o && f.side !== o.side)
const _tgtEnv = {}   // reused each frame (no per-frame allocation; never mutates the caller's env)
export function updateDrones(owners, frame, env = {}) {
  // targeting env (defaults from the owners list for 1v1; game.js passes fighters/isEnemy for FFA).
  // Build a reused context — do NOT write onto the caller's env (it may be a shared/const object).
  _tgtEnv.fighters = env.fighters || owners
  _tgtEnv.isEnemy = env.isEnemy || _defaultIsEnemy
  // tick owner cooldowns + refresh HUD pips — only for fighters that have used drones
  // (_gaDroneCd is created lazily on first spawnDrone), so non-drone characters are untouched.
  for (const o of owners) {
    if (!o || !o._gaDroneCd) continue
    for (const k in o._gaDroneCd) if (o._gaDroneCd[k] > 0) o._gaDroneCd[k]--
    refreshPips(o)
  }
  for (let i = activeDrones.length - 1; i >= 0; i--) {
    const d = activeDrones[i]
    if (d._hitFlash > 0) d._hitFlash--
    // OWNER DOWN: when the owner is KO'd/eliminated, every active drone plays its DEATH anim and
    // falls (the LOSE sequence; also covers "hit by a super → drones destroyed"). Generic.
    if (!d.dying && d.owner && ((typeof d.owner.health === "number" && d.owner.health <= 0) || d.owner.eliminated)) {
      d.dying = true; d.anim = "death"; d.frame = 0; d.animTimer = 0
      d.deathTimer = (d.profile.sprites?.death?.frames || 6) * 5 + 6
    }
    if (d.dying) {
      advanceAnim(d)
      if (--d.deathTimer <= 0) activeDrones.splice(i, 1)
      continue
    }
    if (d._retiring) {
      // fly off-screen behind the owner, then despawn
      const face = d.owner?.facing || 1
      d.tx = (d.owner?.x || d.x) - face * 520
      d.ty = d.y - 40
      moveToward(d, d.profile)
      d.x += d.vx; d.y += d.vy
      if (Math.abs(d.x - (d.owner?.x || 0)) > 480 || (d._retireTimer = (d._retireTimer || 0) + 1) > 90) {
        activeDrones.splice(i, 1)
      }
      advanceAnim(d)
      continue
    }
    // lifetime expiry — self-scuttle (death anim) or fly off (retire), per profile.expireMode
    if (d.life !== Infinity && --d.life <= 0) {
      if ((d.profile.expireMode || "death") === "retire") { d._retiring = "expire" }
      else {
        d.dying = true; d.anim = "death"; d.frame = 0; d.animTimer = 0
        d.deathTimer = (d.profile.sprites?.death?.frames || 6) * 5 + 6
      }
      continue
    }
    // behaviour sets d.tx/d.ty + actions
    pickDroneTarget(d, _tgtEnv)   // PASS3 P4: retarget each frame per the owner's order (hysteresis inside)
    const bfn = BEHAVIOURS[d.behaviour] || BEHAVIOURS.follow
    bfn(d, { frame, env })
    // GUARD order: hold near Oliver (override the behaviour's travel target) — don't chase/dive.
    if (d._gaHold && d.owner && !d.dying && !d._retiring) { d.tx = (d.owner.x || 0) - (d.owner.facing || 1) * 70; d.ty = floorY(d.owner) - (d.profile.hoverHeight || 120) }
    moveToward(d, d.profile)
    d.x += d.vx; d.y += d.vy
    leashAndBound(d, env)
    advanceAnim(d)
    d.frameAge = (d.frameAge || 0) + 1
  }
}

function moveToward(d, p) {
  const prof = { accel: p.accel || 1.4, drag: p.drag || 0.86, reverseBrake: p.reverseBrake || 0.7, overspeedDrag: p.overspeedDrag || 0.9 }
  const dx = (d.tx ?? d.x) - d.x, dy = (d.ty ?? d.y) - d.y
  const hx = Math.abs(dx) < 2 ? 0 : Math.sign(dx)
  const hy = Math.abs(dy) < 2 ? 0 : Math.sign(dy)
  d.vx = flightAxisStep(d.vx, hx, prof)
  d.vy = flightAxisStep(d.vy, hy, prof)
  d.vx = flightSoftLimit(d.vx, p.maxH || 10, prof)
  d.vy = flightSoftLimit(d.vy, p.maxV || 9, prof)
  // don't overshoot the target this frame
  if (Math.abs(dx) < Math.abs(d.vx)) { d.vx = dx }
  if (Math.abs(dy) < Math.abs(d.vy)) { d.vy = dy }
  updateDroneFacing(d, p)
}

// DESIRED FACING — sim state (stored on d.facing for determinism). Data-driven:
//   nativeFacing "front" → symmetric art, facing is irrelevant (drawDrones never flips).
//   faceMode "target" → always face the target (a turret/gunship keeps facing it even while
//     thrusting BACKWARD; the real turn-around happens when it crosses to the target's other side).
//   faceMode "travel" (default) → face travel velocity.
// Deadzone/hysteresis (|dx|>24, |vx|>1.2) stops flicker near overlap / at rest.
function updateDroneFacing(d, p) {
  const native = droneNative(p)
  if (native === "front") { d.facing = d.facing || 1; return }
  const mode = p.faceMode || "travel"
  const tgt = (d.state === "hookSelf") ? null : (d.target || d._opp)
  let desired = d.facing || 1
  if (mode === "target" && tgt && !tgt.eliminated) {
    const tdx = (tgt.x || 0) - d.x
    if (Math.abs(tdx) > 24) desired = tdx < 0 ? -1 : 1
  } else if (Math.abs(d.vx) > 1.2) {
    desired = d.vx < 0 ? -1 : 1
  } else if (d.owner) {
    desired = d.owner.facing || desired
  }
  d.facing = desired
}
function droneNative(p) { return p.nativeFacing || (p.frontFacing ? "front" : "right") }

function leashAndBound(d, env) {
  const o = d.owner
  const leash = d.profile.leash || 320
  if (o) {
    const dx = d.x - (o.x || 0)
    if (Math.abs(dx) > leash) d.x = (o.x || 0) + Math.sign(dx) * leash
  }
  const lw = env.leftWall ?? 0, rw = env.rightWall ?? 4000
  if (d.x < lw) d.x = lw
  if (d.x > rw) d.x = rw
  const ceil = env.ceilingY ?? -200
  if (d.y < ceil) d.y = ceil
}

function advanceAnim(d) {
  const strip = d.profile.sprites?.[d.anim] || d.profile.sprites?.idle
  const frames = strip?.frames || 1
  d.animTimer = (d.animTimer || 0) + 1
  if (d.animTimer >= 5) { d.animTimer = 0; d.frame = (d.frame + 1) % frames }
  if (d.frame >= frames) d.frame = frames - 1
}

// HUD pips: up to 3 slots. Alive owned drones first, then types on cooldown (greyed).
function refreshPips(owner) {
  const pips = []
  for (const d of activeDrones) {
    if (d.owner === owner && !d.dying && !d._retiring) {
      pips.push({ type: baseType(d.type), alive: true, iconFrames: d.profile.sprites?.idle?.frames || 4 })
    }
  }
  for (const type in owner._gaDroneCd) {
    const cd = owner._gaDroneCd[type]
    if (cd > 0 && pips.length < 3) {
      const prof = DRONE_PROFILES[type]
      pips.push({ type: baseType(type), alive: false, cdFrac: cd / (prof?.cooldownOnDeath || 120), iconFrames: prof?.sprites?.idle?.frames || 4 })
    }
  }
  owner._gaDronePips = pips.slice(0, 3)
}
function baseType(t) { return String(t).replace(/_.*/, "").replace(/[0-9]/g, "") }

// ─────────────────────────────────────────────────────────────────────────────
// Collisions — drones are hittable. Call once/frame from the battle loop.
//   fighters   : [p1, p2] — each fighter's live melee hitbox can damage ENEMY drones
//   projectiles: activeProjectiles — any projectile damages the ENEMY-owned… no: a
//                projectile damages drones owned by the projectile's TARGET side.
// Attacking a drone grants NO meter / NO combo credit and causes NO hitstop (handled in
// damageDrone — we never route through applyScaledDamage).
// ─────────────────────────────────────────────────────────────────────────────
export function updateDroneCollisions(fighters, projectiles) {
  if (!activeDrones.length) return
  // melee: a fighter's active attack hitbox vs the opponent's drones
  for (const f of fighters) {
    if (!f || !f.attacking || !f.currentAttack) continue
    const atk = f.currentAttack
    if (atk.hasHitDrone) continue
    const hb = meleeHitbox(f)
    for (const d of activeDrones) {
      if (d.dying || d.owner === f || d.owner?.side === f.side) continue
      if (rectHit(hb, droneRect(d))) {
        damageDrone(d, atk.damage || 30, f)
        atk.hasHitDrone = true
        break
      }
    }
  }
  // projectiles: a projectile vs drones NOT owned by the projectile's owner
  if (Array.isArray(projectiles)) {
    for (const p of projectiles) {
      if (p._struckDrone && !p.piercing) continue
      for (const d of activeDrones) {
        if (d.dying) continue
        const owner = p.owner
        if (owner && (d.owner === owner || d.owner?.side === owner.side)) continue
        if (rectHit(projRect(p), droneRect(d))) {
          // Aegis-style shields absorb projectiles (drain HP); others just take the hit.
          const absorbs = d.profile.absorbsProjectiles
          damageDrone(d, p.damage || 20, owner)
          p._struckDrone = true
          if (!p.piercing) { p.lifetime = Math.min(p.lifetime || 0, 1) }
          if (absorbs) p._absorbed = true
          break
        }
      }
    }
  }
}

function meleeHitbox(f) {
  const face = f.facing || 1
  const reach = (f.currentAttack?.rangeX || 70)
  const cx = (f.x || 0) + face * reach * 0.5
  return { x: cx - reach / 2, y: (f.y || 0) - 20, w: reach, h: (f.h || 100) + 40 }
}
function droneRect(d) {
  const hb = d.profile.hurtbox || { w: 40, h: 30 }
  return { x: d.x - hb.w / 2, y: d.y - hb.h / 2, w: hb.w, h: hb.h }
}
function projRect(p) { return { x: p.x, y: p.y, w: p.w || p.width || 16, h: p.h || p.height || 10 } }
function rectHit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y }

// ─────────────────────────────────────────────────────────────────────────────
// CPU AI hook — teach the opponent to attack drones in reach ~25% of the time (hash-decided),
// prioritising the most dangerous types. Returns the drone to attack, or null.
// ─────────────────────────────────────────────────────────────────────────────
const AI_PRIORITY = { bulwark: 3, kestrel: 3, skyhook: 2, aegis: 1, overwatch: 1, test: 1 }
export function aiPickDroneTarget(aiFighter, frame, reach = 150) {
  if (!aiFighter || !activeDrones.length) return null
  const seed = (aiFighter._matchSeed | 0) || 1
  if (hashRandom(seed, frame >> 3, (aiFighter.playerNumber || 1) * 31 + 7) >= 0.25) return null
  let best = null, bestPr = -1
  for (const d of activeDrones) {
    if (d.dying || d.owner?.side === aiFighter.side) continue
    if (Math.abs(d.x - (aiFighter.x || 0)) > reach) continue
    const pr = AI_PRIORITY[baseType(d.type)] || 1
    if (pr > bestPr) { bestPr = pr; best = d }
  }
  return best
}

// ─────────────────────────────────────────────────────────────────────────────
// TARGETING + ORDERS (PASS3 P4). Shared, deterministic, with hysteresis so drones don't flicker
// between targets. Orders (owner._gaOrder) persist for the round: "focus" (attack the current target),
// "guard" (stay home, protector only), "sweep" (counter-summon first, then the fighter).
// ─────────────────────────────────────────────────────────────────────────────
export function pickDroneTarget(d, env) {
  const owner = d.owner; if (!owner) return d.target
  const order = owner._gaOrder || "focus"
  const enemies = (env.fighters || []).filter(f => f && env.isEnemy?.(owner, f) && !f.eliminated)
  if (!enemies.length) return d.target
  if (order === "guard") { d._gaHold = true; return d.target }   // hold near Oliver; keep the current ref
  d._gaHold = false
  // priority: TAGGED fighter → nearest enemy fighter (counter-summon handles summons/projectiles).
  const tagged = enemies.find(f => (f._gaTagged || 0) > 0)
  let nearest = enemies[0]
  for (const f of enemies) if (Math.abs((f.x || 0) - d.x) < Math.abs((nearest.x || 0) - d.x)) nearest = f
  const want = tagged || nearest
  if (d.target !== want) { d._gaRetargetT = (d._gaRetargetT || 0) + 1; if (d._gaRetargetT > 10 || !d.target || d.target.eliminated) { d.target = want; d._gaRetargetT = 0 } }
  else d._gaRetargetT = 0
  return d.target
}

// COUNTER-SUMMON: Bulwark/Aegis shoot down SMALL enemy projectiles (never beams/supers) within 25%
// of Oliver, one per 45f (30f under SWEEP orders). env.screenW for the 25% band.
export function updateDroneCounterSummon(projectiles, frame, env = {}) {
  if (!activeMunitionsReady(projectiles)) return
  const band = (env.screenW || 1280) * 0.25
  for (const d of activeDrones) {
    if (d.dying || (d.type !== "bulwark" && d.type !== "aegis")) continue
    const o = d.owner; if (!o) continue
    const cd = ((o._gaOrder || "focus") === "sweep") ? 30 : 45
    if ((d.data._csCd || 0) > 0) { d.data._csCd--; continue }
    for (const p of projectiles) {
      if (!p.owner || !env.isEnemy?.(o, p.owner)) continue
      if (p.isUltimate || p.visualOnly || /beam|laser|getsuga|bijuu|kamehameha/i.test(p.name || "")) continue   // never beams/supers
      if ((p.w || p.width || 16) > 44) continue                                                                 // small only
      if (Math.abs((p.x || 0) - (o.x || 0)) > band) continue
      p.lifetime = Math.min(p.lifetime || 0, 1); d.data._csCd = cd; d._hitFlash = 6                             // shot it down
      break
    }
  }
}
function activeMunitionsReady(projectiles) { return activeDrones.length && Array.isArray(projectiles) }

const GA_ORDERS = ["focus", "guard", "sweep"]
export function cycleDroneOrder(owner) { const i = GA_ORDERS.indexOf(owner._gaOrder || "focus"); owner._gaOrder = GA_ORDERS[(i + 1) % GA_ORDERS.length]; return owner._gaOrder }
export function droneOrder(owner) { return owner?._gaOrder || "focus" }

export function getActiveDrones() { return activeDrones }

// ─────────────────────────────────────────────────────────────────────────────
// RENDER — call from the game render loop (after fighters, before HUD). Render-only:
// hover bob (deterministic sine on frame), rotor blur, thruster particles, hit flash.
// Front-facing types are never mirrored; side-facing flip with d.facing.
// ─────────────────────────────────────────────────────────────────────────────
const _droneImgs = {}
function _dImg(src) {
  if (!src) return null
  let im = _droneImgs[src]
  if (!im && typeof Image !== "undefined") { im = new Image(); im.src = src; _droneImgs[src] = im }
  return im
}

// PASS2/P3 — render-only Green Arrow fighter-status FX (works with or without drones out). Called
// from game.js with [p1, p2]: orange guard-ping, shock-stun ring, Flash white burst, Net pixel mesh.
export function drawGreenArrowFx(ctx, fighters = [], frame = 0) {
  if (!ctx) return
  for (const f of fighters) {
    if (!f) continue
    const cx = (f.x || 0) + (f.w || 60) / 2, cy = (f.y || 0) + (f.h || 100) / 2
    if ((f._gaGuardPing || 0) > 0) _ring(ctx, cx, cy, 46 - (f._gaGuardPing % 8), "#ff9a3c", f._gaGuardPing / 16)
    if ((f._gaStunRing || 0) > 0) _ring(ctx, cx, cy, 34 + (20 - (f._gaStunRing || 0)), "#ffb02e", f._gaStunRing / 20)
    if ((f._gaFlash || 0) > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, f._gaFlash / 10); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, cy, 90 * (1 + (18 - f._gaFlash) * 0.08), 0, Math.PI * 2); ctx.fill(); ctx.restore() }
    if ((f._gaNetted || 0) > 0) _drawNet(ctx, f)
  }
}
// procedural pixel-style NET mesh over a netted fighter (render-only, not sprite art).
function _drawNet(ctx, f) {
  const x = (f.x || 0), y = (f.y || 0), w = (f.w || 60), h = (f.h || 100)
  ctx.save(); ctx.globalAlpha = 0.72; ctx.strokeStyle = "#dff0ff"; ctx.lineWidth = 1.5
  const step = 9
  for (let gx = 0; gx <= w; gx += step) { ctx.beginPath(); ctx.moveTo(x + gx, y); ctx.lineTo(x + gx, y + h); ctx.stroke() }
  for (let gy = 0; gy <= h; gy += step) { ctx.beginPath(); ctx.moveTo(x, y + gy); ctx.lineTo(x + w, y + gy); ctx.stroke() }
  ctx.strokeStyle = "#8fc8ff"; ctx.strokeRect(x, y, w, h)
  ctx.restore()
}

export function drawDrones(ctx, frame = 0, camera = null) {
  if (!ctx || !activeDrones.length) return
  for (const d of activeDrones) {
    // SWARM — render as `scouts` mini-Overwatch saucers orbiting (render-only positions).
    if (d.profile.swarm && !d.dying) { _drawSwarm(ctx, d, frame); if (d._debugHurt) drawDroneDebug(ctx, d); continue }
    const strip = d.profile.sprites?.[d.anim] || d.profile.sprites?.idle
    const img = _dImg(strip?.sheet)
    const frames = strip?.frames || 1
    // render-only hover bob (not applied to the sim hurtbox)
    const bob = (d.dying || d.behaviour === "planted") ? 0
      : Math.sin((frame - d.bornFrame) * 0.11) * (d.profile.bobAmp || 0)
    const rx = d.x, ry = d.y + bob
    ctx.save()
    if (d._hitFlash > 0 && (frame & 1)) ctx.globalAlpha = 0.6
    if (img && img.complete && img.naturalWidth > 0) {
      const fw = img.naturalWidth / frames
      const fh = img.naturalHeight
      const sc = d.profile.scale || 1
      const dw = fw * sc, dh = fh * sc
      const fi = Math.min(frames - 1, d.frame)
      const _native = droneNative(d.profile)
      const flip = _native !== "front" && d.facing !== (_native === "left" ? -1 : 1)
      ctx.translate(rx, ry)
      if (flip) ctx.scale(-1, 1)
      ctx.drawImage(img, fi * fw, 0, fw, fh, -dw / 2, -dh / 2, dw, dh)
      // hit flash overlay
      if (d._hitFlash > 0) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.25; ctx.fillStyle = "#fff"; ctx.fillRect(-dw / 2, -dh / 2, dw, dh) }
      // Aegis shield-shatter / intercept flash
      if (d._shieldFlash > 0) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.4 * (d._shieldFlash / 14); ctx.fillStyle = "#bfe8ff"; ctx.fillRect(-dw / 2, -dh / 2, dw, dh); d._shieldFlash-- }
    } else {
      // fallback chip (art not yet decoded) — keeps the entity visible/debuggable
      const hb = d.profile.hurtbox || { w: 40, h: 30 }
      ctx.fillStyle = d.dying ? "#553" : "#2e9e3a"
      ctx.globalAlpha = 0.8
      ctx.fillRect(rx - hb.w / 2, ry - hb.h / 2, hb.w, hb.h)
    }
    ctx.restore()
    if (_droneDebugOn) drawDroneDebug(ctx, d)
  }
}

function _ring(ctx, x, y, r, col, a) {
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.strokeStyle = col; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(x, y, Math.max(6, r), 0, Math.PI * 2); ctx.stroke(); ctx.restore()
}
// SWARM — draw `scouts` mini saucers on a deterministic orbit (protector) / toward the target (strike).
function _drawSwarm(ctx, d, frame) {
  const img = _dImg(d.profile.sprites?.idle?.sheet); if (!img || !img.complete || !img.naturalWidth) return
  const frames = d.profile.sprites?.idle?.frames || 4
  const fw = img.naturalWidth / frames, fh = img.naturalHeight
  const scouts = Math.max(0, Math.min(4, Math.round(d.hp / 20)))
  const mini = 0.5
  for (let i = 0; i < scouts; i++) {
    const ph = (frame - d.bornFrame) * 0.06 + i * (Math.PI / 2)
    const ox = Math.cos(ph) * 46, oy = Math.sin(ph) * 22
    const dw = fw * mini, dh = fh * mini
    ctx.drawImage(img, 0, 0, fw, fh, d.x + ox - dw / 2, d.y + oy - dh / 2, dw, dh)
  }
  if (d._hitFlash > 0 && (frame & 1)) { _ring(ctx, d.x, d.y, 50, "#9fe8ff", 0.5) }
}

// Training "drone debug" overlay — hurtbox + HP bar. Module-level so newly-spawned drones inherit it.
let _droneDebugOn = false
export function setDroneDebug(on) { _droneDebugOn = !!on; return _droneDebugOn }
export function toggleDroneDebug() { _droneDebugOn = !_droneDebugOn; return _droneDebugOn }
export function isDroneDebug() { return _droneDebugOn }
function drawDroneDebug(ctx, d) {
  const r = droneRect(d)
  ctx.save()
  ctx.strokeStyle = "#ff3b6b"; ctx.lineWidth = 1; ctx.strokeRect(r.x, r.y, r.w, r.h)
  const w = r.w, hpf = Math.max(0, d.hp / d.maxHp)
  ctx.fillStyle = "#000a"; ctx.fillRect(r.x, r.y - 6, w, 3)
  ctx.fillStyle = hpf > 0.5 ? "#39d353" : hpf > 0.25 ? "#e3b341" : "#f85149"
  ctx.fillRect(r.x, r.y - 6, w * hpf, 3)
  ctx.fillStyle = "#fff"; ctx.font = "8px monospace"
  const nat = droneNative(d.profile)
  const ord = (d.owner && d.owner._gaOrder) || "focus"
  ctx.fillText(`${d.type} ${Math.ceil(d.hp)} [${nat}] ${ord.toUpperCase()}${d._gaHold ? "*" : ""}`, r.x, r.y - 8)
  // target line (training: which fighter this drone is locked on)
  if (d.target && !d.target.eliminated) {
    const tx = (d.target.x || 0) + (d.target.w || 60) / 2, ty = (d.target.y || 0) + (d.target.h || 100) * 0.4
    ctx.strokeStyle = "#e3b341"; ctx.lineWidth = 1; ctx.setLineDash([3, 3])
    ctx.beginPath(); ctx.moveTo(r.x + r.w / 2, r.y + r.h / 2); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([])
  }
  // facing arrow (sim facing) — cyan line + head in the facing direction
  const cy = r.y + r.h / 2, cx = r.x + r.w / 2, dir = d.facing || 1
  ctx.strokeStyle = "#5fe0ff"; ctx.fillStyle = "#5fe0ff"; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dir * 14, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + dir * 14, cy); ctx.lineTo(cx + dir * 9, cy - 3); ctx.lineTo(cx + dir * 9, cy + 3); ctx.closePath(); ctx.fill()
  ctx.restore()
}
