// megawhatt.js — MEGAWHATT (living electricity), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table and the leaf flight module (no engine imports, no cycles). The
// engine reaches it through the generic, ben10-gated ready-form hooks (ADD_ALIEN.md) and hands it an `api`.
//
// ALL simulation state lives in GAME_STATE: fighter.omnitrix.formState (Voltage, Static/Shock, casts, ult) plus the
// flight controller fighter._flightCtl (flight.js), both cleared by clearBenFormState on swap / revert / KO.
// No randomness in the simulation at all. Render-only bits (frame-set swap, dim, swarm copies, crackle, marker) READ
// that state; they never write it.
import { MEGAWHATT_ANIM, MEGAWHATT_DRAINED_ANIM, MEGAWHATT_FX } from "./megawhattAssets.js"
import { flightTakeoff, isFlying, FLIGHT_PHASE, flightKnockedDown } from "./flight.js"
export { MEGAWHATT_ANIM, MEGAWHATT_DRAINED_ANIM, MEGAWHATT_FX }

// flight poses (sprite.js maps the flight controller's pose to fly / flyHover / flyCruise) + the Omnitrix ult pose key
const withAliases = A => ({ ...A, fly: A.mwFly, flyHover: A.mwFly, flyCruise: A.mwFly, flyRise: A.mwFly, flyDive: A.mwFly, hbFire: A.mwSparkBall })
const ANIM = withAliases(MEGAWHATT_ANIM)
const DRAINED_ANIM = withAliases(MEGAWHATT_DRAINED_ANIM)

// ── tuning (pre-mod numbers from the brief) ─────────────────────────────────────────────────────────────────
export const MW_VOLT = { MAX: 100, START: 60, HIT: 6, BLOCKED: 3, DRAW: 2, FLIGHT: 0.6, CHARGED: 25, SURGE_AFTER: 50, SURGE_CANCEL: 24 }
export const MW_DRAINED = { SPEED: 0.85, DAMAGE: 0.8 }
export const MW_COST = { spark: [10, 10], wire: [12, 15], thunder: [15, 20], discharge: [0, 30], ultimate: [50, 50] }   // [Power, Voltage]
export const MW_STATIC = { MAX: 3, EXPIRE: 240, SHOCK: 20, IMMUNE: 300 }
export const MW_DRAW_TAKEN = 1.15
export const MW_SPARK = { DMG: 40, VX: 7.5, VY: -5, GRAV: 0.5, BOUNCES: 2, RANGE: 500, STARTUP: 10, TOTAL: 28 }
export const MW_WIRE = { HITS: [[10, 25], [18, 30]], LUNGE_AT: 6, LUNGE_FRAMES: 18, LUNGE_SPEED: 20, DUCK: [6, 24], TOTAL: 40 }
export const MW_THUNDER = { MARKER: 24, AHEAD: 260, DMG: 70, TOTAL: 36 }
export const MW_DISCHARGE = { RADIUS: 150, DMG: 50, COOLDOWN: 480, BREAKER_HITS: 3, STARTUP: 4, TOTAL: 30 }
export const MW_FLIGHT_MAX = 90, MW_FLIGHT_CAP = 120, MW_FLIGHT_HOLD = 8
export const MW_ULT = { OPENER: 40, SWARM: 25, SWARM_AT: [20, 30, 40, 50], FINAL: 100, FINAL_AT: 70, END: 86,
  STARTUP: 12, WHIFF_RECOVERY: 60, LOCKOUT: 100, MIN_VOLT: 50 }

const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 16, knockbackX: 3, knockbackY: -2, frameExact: true, electric: true, ...extra
})

export const MEGAWHATT = {
  id: "megawhatt", poolKey: "megawhatt", displayName: "Megawhatt", slot: 3,
  status: "ready", sheetPath: "./ben10_megawhatt_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/megawhatt/SPRITE_LEDGER.md",
  mods: { speed: 1.15, damage: 0.95, defense: 0.85, weight: 0.6 },
  movement: "flight", maxJumps: 2,   // the shared double jump; flight never refills it
  flightProfile: "megawhatt",        // flight.js FLIGHT_PROFILES.megawhatt (per-alien flight profile hook)
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Spark Ball", special2: "Live Wire", special3: "Thunder Strike", special4: "Ground Draw",
    defense: "Discharge", ultimate: "Blackout" },
  basic_attacks: {
    light: normal(16, 4, 3, 10, 1),                                                     // Attack f1-2 spark
    heavy: normal(48, 12, 4, 22, -5, { knockbackX: 8, rangeX: 140 }),                   // Attack spark burst, 140 px
    down:  normal(24, 6, 3, 14, -3, { hitLevel: "low" }),                               // Attack -> streak start, hits low
    up:    normal(44, 10, 4, 26, -8, { launcher: true, launchVy: -15, selfVy: 0 }),     // Attack ^ bolt
    air:   normal(26, 6, 4, 10, 2)                                                      // fly + spark
  },
  anim: ANIM, drainedAnim: DRAINED_ANIM, fx: MEGAWHATT_FX,
  onApply, tick, fireSpecial, fireUltimate, blockHeavy, absorb, onContact,
  incomingScale, hurtbox, phasing, drawHud: drawMegawhattHud, drawFx: drawMegawhattFx, drawUnder: drawMegawhattUnder
}

let _lastApi = null   // the shared primitives object (no state); blockHeavy is called without one

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshMegawhattState() {
  return { kind: "megawhatt", volt: MW_VOLT.START, baseDmg: 0.95, baseSpeed: null, baseDash: null,
    castId: 0, draw: false, spark: null, wire: null, strike: null, ult: null,
    dischargeCd: 0, hitsTaken: 0, prevBH: false, breakers: 0,
    surge: false, surgeCast: null, cancelWin: 0, surgeCancels: 0,
    airborne: false, apexY: null, capY: null, jumpHeld: 0, flightUsed: 0, floorY: null, lastPipCast: -1, lastUltRaw: 0,
    stat: { pips: 0, pipT: 0, shockT: 0, immune: 0, shocks: 0 } }
}
export const mwState = f => (f?.omnitrix?.formState?.kind === "megawhatt" && f.transformed && f.activeAlien === "megawhatt") ? f.omnitrix.formState : null
export const voltTier = s => !s ? "charged" : s.volt >= MW_VOLT.CHARGED ? "charged" : "drained"
export const isMarked = s => !!s && s.stat.pips > 0

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshMegawhattState()
  s.baseDmg = f.damageMultiplier ?? MEGAWHATT.mods.damage           // mods.damage × Vow (set by applyAlien)
  s.baseSpeed = f._benWalkSpeed; s.baseDash = f.dashSpeed
  f._alienFlightProfile = MEGAWHATT.flightProfile; f._flightCtl = null
  if (f.onGround || f.grounded) s.floorY = f.y + f.h
}

export function addVolt(f, amount) {
  const s = mwState(f); if (!s || !amount) return 0
  const before = s.volt
  s.volt = Math.max(0, Math.min(MW_VOLT.MAX, s.volt + amount))
  if (s.volt >= MW_VOLT.MAX && before < MW_VOLT.MAX && !s.surge && !s.surgeCast) {   // SURGE armed (once per fill)
    s.surge = true; f.colorFlash = Math.max(f.colorFlash || 0, 12); if (!f._benSfx) f._benSfx = "mw_surge"
  }
  return s.volt - before
}

// ── per-frame tick (GAME_STATE only; abilities.tickBenAlienForm calls it once per fighter per frame) ─────────
function tick(f, input, ctx, api) {
  const s = mwState(f); if (!s) return
  _lastApi = api
  const opp = api.getOpponent(f)
  const grounded = !!(f.onGround || f.grounded)
  if (grounded) s.floorY = f.y + f.h
  if (s.dischargeCd > 0) s.dischargeCd--
  if ((f.hitstun || 0) <= 0 && (f.blockstun || 0) <= 0) s.hitsTaken = 0

  // tier: DRAINED below 25 → grey frame set, speed ×0.85, damage ×0.8, no flight. Render data follows the flag.
  const drained = voltTier(s) === "drained"
  f.damageMultiplier = s.baseDmg * (drained ? MW_DRAINED.DAMAGE : 1)
  if (s.baseSpeed != null) { f._benWalkSpeed = s.baseSpeed * (drained ? MW_DRAINED.SPEED : 1); f.dashSpeed = s.baseDash * (drained ? MW_DRAINED.SPEED : 1) }
  const want = drained ? DRAINED_ANIM : ANIM
  if (f._skinAnim !== want) f._skinAnim = want

  // DISCHARGE as a combo-breaker: Block + Heavy while being comboed, only after 3+ hits taken (handled here because
  // the movement-input path does not run in hitstun). Neutral Discharge goes through the blockHeavy hook.
  const bh = !!(input.block && input.heavy)
  if (bh && !s.prevBH && (f.hitstun || 0) > 0 && s.hitsTaken >= MW_DISCHARGE.BREAKER_HITS) castDischarge(f, s, api, true)
  s.prevBH = bh

  tickDraw(f, s, input, grounded)
  tickFlight(f, s, input, grounded, drained, api)
  tickSurge(f, s)
  tickSpark(f, s, api)
  tickWire(f, s)
  tickStrike(f, s, opp, api)
  tickUlt(f, s, opp, api)
  tickStatic(f, s, opp)
}

function tickDraw(f, s, input, grounded) {
  if (!s.draw) return
  if (!grounded || !(input.special && input.down) || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || s.ult) { s.draw = false; f._spriteCastTimer = 0; return }
  s.volt = Math.min(MW_VOLT.MAX, s.volt + MW_VOLT.DRAW); if (s.volt >= MW_VOLT.MAX) addVolt(f, 0.0001)   // GROUND DRAW +2/f (Surge check)
  f.vx = 0; f._attackInputLock = Math.max(f._attackInputLock || 0, 2); f.attackCooldown = Math.max(f.attackCooldown || 0, 2)
  f._spriteCastMove = "mwDraw"; f._spriteCastTimer = 2
}

// FLIGHT (flight.js, profile "megawhatt"): hold Jump in the air to hover-fly. 90f per airtime, cruise 6.5, high drag,
// capped at the jump apex + 120 px, knocked out of the sky (40f grounded lock) by a hit, never refills jumps, disabled
// while Drained, drains 0.6 Voltage per frame.
function tickFlight(f, s, input, grounded, drained, api) {
  const c = f._flightCtl, flying = !!c && isFlying(f)
  const jump = !!(input.jump || input.up)
  s.jumpHeld = jump ? s.jumpHeld + 1 : 0
  if (grounded) { s.airborne = false; s.apexY = null; s.capY = null; s.flightUsed = 0 }
  else { s.airborne = true; if (!flying) s.apexY = s.apexY == null ? f.y : Math.min(s.apexY, f.y) }
  if (flying) {
    s.flightUsed++
    s.volt = Math.max(0, s.volt - MW_VOLT.FLIGHT)
    if ((f.hitstun || 0) > 0) { flightKnockedDown(f); return }                    // hard hit → drop + 40f grounded lock
    if (!jump || drained || s.flightUsed >= MW_FLIGHT_MAX || s.ult || s.draw) { c.phase = FLIGHT_PHASE.GROUNDED; c.wantDescend = false; return }
    if (s.capY != null && f.y < s.capY) { f.y = s.capY; if ((f.vy || 0) < 0) f.vy = 0 }   // no altitude past apex + 120
    if (!f.attacking) { f._spriteCastMove = "mwFly"; f._spriteCastTimer = 2 }
    return
  }
  if (grounded || drained || !jump || s.jumpHeld < MW_FLIGHT_HOLD || s.flightUsed >= MW_FLIGHT_MAX || f.attacking ||
      (f.hitstun || 0) > 0 || s.ult || s.wire || s.draw) return
  const jc = f.jumpCount
  if (flightTakeoff(f)) {
    f.jumpCount = jc                                                               // flight never refills jumps
    s.capY = (s.apexY ?? f.y) - MW_FLIGHT_CAP
    if (!f._benSfx) f._benSfx = "mw_fly"
  }
}

function tickSurge(f, s) {
  if (!s.surgeCast) return
  const sc = s.surgeCast; sc.t++
  if (s.cancelWin > 0) { if (--s.cancelWin <= 0) resolveSurge(f, s) }
  else if (!sc.granted && sc.t > sc.total + 4) resolveSurge(f, s)                 // the Surge special ended without a hit
}
function resolveSurge(f, s) { s.surgeCast = null; s.cancelWin = 0; s.volt = MW_VOLT.SURGE_AFTER }

// GAME_STATE keeps only the cast id; the live projectile is looked up each frame (no object refs in state).
function tickSpark(f, s, api) {
  const sp = s.spark; if (!sp) return
  const p = api.activeProjectiles().find(q => q.owner === f && q.name === "mw_spark" && q.alien && q.alien.cast === sp.cast)
  if (!p) { s.spark = null; return }
  p.vy = (p.vy || 0) + MW_SPARK.GRAV
  const floor = sp.floor - (p.radius || 14)
  if (p.vy > 0 && p.y + p.vy >= floor) {                                          // bounce BEFORE the step would cross the floor
    if (sp.bounces >= MW_SPARK.BOUNCES) { p.lifetime = 0; s.spark = null; return }   // 3rd landing → gone
    sp.bounces++; p.y = floor; p.vy = -Math.max(4, Math.abs(p.vy) * 0.8)
  }
  if (Math.abs(p.x - sp.x0) >= MW_SPARK.RANGE) { p.lifetime = 0; s.spark = null }    // 500 px reach
}

function tickWire(f, s) {
  const w = s.wire; if (!w) return
  if ((f.hitstun || 0) > 0 || ++w.t > MW_WIRE.TOTAL) { s.wire = null; return }
  f._spriteCastMove = "mwLiveWire"; f._spriteCastTimer = 2
}

function tickStrike(f, s, opp, api) {
  const st = s.strike; if (!st) return
  if (++st.t < MW_THUNDER.MARKER) return
  const floor = st.floor
  api.spawnProjectile(f, "mw_thunder", { damage: MW_THUNDER.DMG, speed: 0, vx: 0, vy: 0, spawnX: st.x, spawnY: floor - 70,
    w: 90, h: 150, radius: 50, lifetime: 3, isSpecial: true, hitstun: 30, blockstun: 16, knockbackX: 2, knockbackY: -13,
    alien: { mw: true, pip: st.cast, kind: "thunder", cast: st.cast } }, {})
  spawnFx(f, s, api, "bolt", st.x, floor - 150, 14, 4)
  spawnFx(f, s, api, "star", st.x, floor - 20, 14, 3)
  api.shake?.(6, 8)
  s.strike = null
}

function tickStatic(f, s, opp) {
  const st = s.stat
  if (st.pips > 0 && st.shockT <= 0 && --st.pipT <= 0) st.pips = 0              // pips expire 240f after the last one
  if (st.immune > 0) st.immune--
  if (st.shockT > 0) {
    if (!opp || opp.eliminated || (opp.health || 0) <= 0) { st.shockT = 0; st.immune = MW_STATIC.IMMUNE; return }
    opp.hitstun = Math.max(opp.hitstun || 0, 1)                                    // SHOCK: stunned in place, 20 ticks
    if (--st.shockT <= 0) st.immune = MW_STATIC.IMMUNE
  }
}
function addStaticPip(f, s, castId, opp) {
  const st = s.stat
  if (castId == null || castId === s.lastPipCast) return false                   // one pip per cast, however many ticks hit
  if (st.shockT > 0 || st.immune > 0) return false                               // no refresh / no repeat capture
  s.lastPipCast = castId
  st.pips = Math.min(MW_STATIC.MAX, st.pips + 1); st.pipT = MW_STATIC.EXPIRE
  if (st.pips >= MW_STATIC.MAX) {                                                // SHOCK: consume the pips, stun 20 ticks
    st.pips = 0; st.pipT = 0; st.shockT = MW_STATIC.SHOCK; st.shocks++
    if (opp) { opp.hitstun = Math.max(opp.hitstun || 0, MW_STATIC.SHOCK); opp.vx = 0 }
    if (!f._benSfx) f._benSfx = "mw_shock"
  }
  return true
}

// ── casts ────────────────────────────────────────────────────────────────────────────────────────────────
function beginCast(f, s, api, pose, [power, volt], total, { commit = true } = {}) {
  const cancel = s.cancelWin > 0
  if (!f.transformed || f.activeAlien !== "megawhatt" || (!cancel && (f.attacking || (f.attackCooldown || 0) > 0)) ||
      (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || s.ult || s.draw) return false
  if (s.volt < volt) return false                                                // needs the Voltage (Drained rejects pricey specials)
  if (!api.spendEnergy(f, power)) return false
  s.volt -= volt
  f.isCharging = false
  if (!cancel) f._benActionEpoch = (f._benActionEpoch || 0) + 1                  // a Surge cancel keeps the first special's spawns alive
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++
  if (cancel) { s.surgeCancels++; resolveSurge(f, s); s.volt = MW_VOLT.SURGE_AFTER }   // the one Surge cancel → Voltage 50
  else if (s.surge) { s.surge = false; s.surgeCast = { id: s.castId, t: 0, total, granted: false } }
  return true
}
function spawnFx(f, s, api, key, x, y, lifetime, scale, extra = {}) {
  const a = MEGAWHATT_FX[voltTier(s) === "drained" ? key + "Drained" : key] || MEGAWHATT_FX[key]
  return api.spawnProjectile(f, "mw_fx_" + key, { damage: 0, speed: 0, vx: 0, vy: 0, spawnX: x, spawnY: y, lifetime,
    visualOnly: true, sheet: a.sheet, spriteFrames: a.frames, spriteW: a.w, spriteH: a.h, spriteSpeed: a.speed,
    spriteScale: scale, ...extra }, {})
}

function fireSpecial(f, ctx, api) {
  const s = mwState(f); if (!s) return false
  const dir = f._specialHeldDir || null, face = f.facing || 1
  const grounded = !!(f.onGround || f.grounded)
  if (dir === "D" && grounded) return startDraw(f, s)                            // hold ↓ + Special: GROUND DRAW
  if (dir === "F") return castLiveWire(f, s, api, face)                          // →→ + P
  if (dir === "B") return castThunder(f, s, api, face)                           // ←↙↓ + P
  return castSparkBall(f, s, api, face)                                          // ↓↘→ + P
}

function startDraw(f, s) {
  if (s.draw || f.attacking || (f.attackCooldown || 0) > 0 || (f.hitstun || 0) > 0 || s.ult) return false
  s.draw = true; f.vx = 0; f.isCharging = false
  f._spriteCastMove = "mwDraw"; f._spriteCastTimer = 2
  return true
}

function castSparkBall(f, s, api, face) {
  if (api.activeProjectiles().some(p => p.owner === f && p.name === "mw_spark")) return false   // one on screen
  if (!beginCast(f, s, api, "mwSparkBall", MW_COST.spark, MW_SPARK.TOTAL)) return false
  const cast = s.castId
  f._benSfx = "mw_spark"
  api.scheduleBenSpawn(f, MW_SPARK.STARTUP, () => {
    const fx = MEGAWHATT_FX.spark, x0 = f.x + f.w / 2 + face * 26
    const p = api.spawnProjectile(f, "mw_spark", { damage: MW_SPARK.DMG, speed: MW_SPARK.VX, vx: face * MW_SPARK.VX, vy: MW_SPARK.VY,
      spawnX: x0, spawnY: f.y + f.h * 0.4, w: 28, h: 28, radius: 14, lifetime: 120, isSpecial: true, hitstun: 20, blockstun: 14,
      knockbackX: 4, knockbackY: -4, sheet: fx.sheet, spriteFrames: fx.frames, spriteW: fx.w, spriteH: fx.h, spriteSpeed: fx.speed,
      spriteScale: 2, alien: { mw: true, pip: cast, kind: "spark", cast } }, {})
    if (p) s.spark = { cast, x0, bounces: 0, floor: s.floorY ?? (f.y + f.h) }
  })
  return true
}

function castLiveWire(f, s, api, face) {
  if (!beginCast(f, s, api, "mwLiveWire", MW_COST.wire, MW_WIRE.TOTAL)) return false
  const cast = s.castId
  s.wire = { t: 0, cast, face }
  f._benSfx = "mw_wire"
  // 360 px low-profile streak: 18 sim frames × 20 px after a 6f startup, stage-clamped by physics; crosses up (phasing)
  api.scheduleBenSpawn(f, MW_WIRE.LUNGE_AT, () => { f._benLunge = { frames: MW_WIRE.LUNGE_FRAMES, speed: face * MW_WIRE.LUNGE_SPEED } })
  MW_WIRE.HITS.forEach(([t, dmg], i) => api.scheduleBenSpawn(f, t, () => {
    api.spawnProjectile(f, "mw_wire_" + i, { damage: dmg, speed: 0, vx: 0, vy: 0,
      spawnX: f.x + f.w / 2, spawnY: f.y + f.h - 18, w: 90, h: 40, radius: 40, lifetime: 2,
      isSpecial: true, hitLevel: "low", noHitstop: i === 0, hitstun: i === 0 ? 14 : 22, blockstun: 14,
      knockbackX: i === 0 ? 1 : 6, knockbackY: i === 0 ? 0 : -3, alien: { mw: true, pip: cast, kind: "wire", cast } }, {})
  }))
  return true
}

function castThunder(f, s, api, face) {
  if (!beginCast(f, s, api, "mwThunder", MW_COST.thunder, MW_THUNDER.TOTAL)) return false
  const cast = s.castId, opp = api.getOpponent(f)
  const marked = isMarked(s) && opp && !opp.eliminated
  // the bolt lands at a MARKED target's x AT CAST TIME (never tracks after); unmarked: 260 px ahead
  const x = marked ? opp.x + opp.w / 2 : f.x + f.w / 2 + face * MW_THUNDER.AHEAD
  s.strike = { x, t: 0, cast, marked: !!marked, floor: s.floorY ?? (f.y + f.h) }
  f._benSfx = "mw_thunder"
  return true
}

function castDischarge(f, s, api, breaker) {
  if (s.dischargeCd > 0 || s.ult || s.volt < MW_COST.discharge[1]) return false
  if (!breaker && (f.attacking || (f.attackCooldown || 0) > 0 || (f.hitstun || 0) > 0)) return false
  s.volt -= MW_COST.discharge[1]; s.dischargeCd = MW_DISCHARGE.COOLDOWN; s.draw = false
  if (breaker) {                                                                  // COMBO-BREAKER: out of the combo
    f.hitstun = 0; f.blockstun = 0; f.isLaunched = false; f.invulnTimer = Math.max(f.invulnTimer || 0, 10); s.breakers++; s.hitsTaken = 0
  }
  f.attackCooldown = MW_DISCHARGE.TOTAL; f._spriteCastMove = "mwDischarge"; f._spriteCastTimer = MW_DISCHARGE.TOTAL
  s.castId++
  const fire = () => {
    const x = f.x + f.w / 2, y = f.y + f.h / 2
    api.spawnProjectile(f, "mw_discharge", { damage: MW_DISCHARGE.DMG, speed: 0, vx: 0, vy: 0, spawnX: x, spawnY: y,
      radius: MW_DISCHARGE.RADIUS, radial: true, lifetime: 2, isSpecial: true, hitstun: 22, blockstun: 12,
      knockbackX: 14, knockbackY: -5, alien: { mw: true, kind: "discharge" } }, {})
    spawnFx(f, s, api, "star", x, y, 16, 6)
  }
  if (breaker) fire(); else api.scheduleBenSpawn(f, MW_DISCHARGE.STARTUP, fire)
  f._benSfx = "mw_discharge"
  return true
}
// DISCHARGE (Block + Heavy) in neutral: replaces Ben's Energy Guard while Megawhatt. 0 Power, 30 Voltage, 8 s cd.
function blockHeavy(f, ctx, api) {
  const s = mwState(f); if (!s) return false
  return castDischarge(f, s, api || _lastApi, false)
}

// Combat calls this before any hit on him resolves. Megawhatt absorbs nothing; it only counts hits taken in the
// current combo (the Discharge combo-breaker unlocks at 3+).
function absorb(f, { proj = null, move = null } = {}) {
  const s = mwState(f); if (!s) return false
  if (proj && proj.visualOnly) return false
  if (!f.isBlocking) s.hitsTaken = ((f.hitstun || 0) > 0 ? s.hitsTaken : 0) + 1
  return false
}
// +15 % damage taken while Ground Drawing (multiplies the form's defense divide)
function incomingScale(f) { const s = mwState(f); return s && s.draw ? MW_DRAW_TAKEN : 1 }
// Live Wire low profile: frames 6-24 of the streak he is only a ground-hugging box (projectiles at body height miss)
function hurtbox(f) {
  const s = mwState(f), w = s && s.wire
  if (!w || w.t < MW_WIRE.DUCK[0] || w.t > MW_WIRE.DUCK[1]) return null
  return { x: f.x, y: f.y + f.h - 20, w: f.w, h: 20 }
}
// Live Wire passes THROUGH the opponent (cross-up): no body push while the streak runs
function phasing(f) { const s = mwState(f); return !!(s && s.wire && s.wire.t <= MW_WIRE.TOTAL - 10) }

// Combat calls this after a contact this fighter OWNS lands (melee or projectile, blocked or clean).
function onContact(f, target, { proj = null, move = null, blocked = false } = {}) {
  const s = mwState(f); if (!s) return
  const st = s.stat
  if (st.shockT > 0 && !blocked) { st.shockT = 0; st.immune = MW_STATIC.IMMUNE }   // any hit during Shock ends it (normal hitstun)
  if (!proj) { addVolt(f, blocked ? MW_VOLT.BLOCKED : MW_VOLT.HIT); return }       // normals: +6 hit / +3 blocked
  if (proj.visualOnly) return
  const a = proj.alien; if (!a || !a.mw) return
  if (a.kind === "spark" && s.spark && s.spark.cast === a.cast) s.spark = null
  if (blocked) return
  if (a.pip != null) addStaticPip(f, s, a.pip, target)
  if (s.surgeCast && !s.surgeCast.granted && a.cast === s.surgeCast.id) {          // SURGE: one special→special cancel on hit
    s.surgeCast.granted = true; s.cancelWin = MW_VOLT.SURGE_CANCEL
    f.attackCooldown = 0; f._benPowerCommit = 0; f.attacking = false; f._spriteCastTimer = 0
  }
  if (a.kind === "ultOpener" && s.ult && s.ult.phase === "opener" && target && !target.eliminated) startUltCinematic(f, s, target)
}

// ── ultimate: BLACKOUT (same input as Omnitrix Overload, alien form only) ──────────────────────────────────
function fireUltimate(f, ctx, api) {
  const s = mwState(f); if (!s) return false
  if (s.volt < MW_ULT.MIN_VOLT) return false                                     // needs ≥ 50 Voltage
  if (!beginCast(f, s, api, "mwSparkBall", [MW_COST.ultimate[0], 0], MW_ULT.STARTUP + MW_ULT.WHIFF_RECOVERY)) return false
  s.volt = 0                                                                      // spends ALL Voltage
  const face = f.facing || 1
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId }
  f._benSfx = "mw_ult"
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, MW_ULT.STARTUP, () => {
    const fx = MEGAWHATT_FX.spark
    api.spawnProjectile(f, "mw_ult_opener", { damage: MW_ULT.OPENER, speed: 0, vx: 0, vy: 0,
      spawnX: f.x + f.w / 2 + face * 60, spawnY: f.y + f.h * 0.5, w: 130, h: 90, radius: 60, lifetime: 3,
      isSpecial: true, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0, knockbackY: 0,
      sheet: fx.sheet, spriteFrames: fx.frames, spriteW: fx.w, spriteH: fx.h, spriteSpeed: fx.speed, spriteScale: 4,
      alien: { mw: true, kind: "ultOpener" } }, {})
  })
  return true                                                                     // whiff / block: 60f recovery, no cinematic
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "swarm"; u.t = 0; u.raw = MW_ULT.OPENER
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = MW_ULT.END + MW_ULT.LOCKOUT; f._benPowerCommit = MW_ULT.END; f._spriteCastTimer = MW_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, MW_ULT.END + 2)
}
function tickUlt(f, s, opp, api) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > 24) s.ult = null; return }            // whiffed / blocked → no cinematic
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  // capture: the target is held where it was hit for the whole cinematic (hitstun refresh, no drift)
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f._spriteCastMove = u.t < MW_ULT.FINAL_AT - 10 ? "mwFly" : "mwUlt"; f._spriteCastTimer = 2
  if (MW_ULT.SWARM_AT.includes(u.t)) {                                           // 2. the swarm zips through: 4 × 25
    api.applyScaledDamage(opp, MW_ULT.SWARM, { attacker: f, move: "blackout", source: "ability" }); u.raw += MW_ULT.SWARM
    opp.colorFlash = 6; api.shake?.(3, 4)
  }
  if (u.t === MW_ULT.FINAL_AT - 10) u.phase = "converge"
  if (u.t === MW_ULT.FINAL_AT) {                                                  // 3. starburst + bolt column: 100
    api.applyScaledDamage(opp, MW_ULT.FINAL, { attacker: f, move: "blackout", source: "ability" }); u.raw += MW_ULT.FINAL
    const x = opp.x + opp.w / 2, floor = opp.y + opp.h
    spawnFx(f, s, api, "bolt", x, floor - 150, 16, 4); spawnFx(f, s, api, "star", x, opp.y + opp.h / 2, 16, 6)
    api.shake?.(12, 14)
  }
  if (u.t >= MW_ULT.END) endUlt(f, s, opp)
}
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }           // positions restore
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = u.face * 10; opp.vy = -8 }
  s.lastUltRaw = u?.raw || 0
  s.ult = null
  s.volt = 0                                                                      // lights restore; Voltage 0
  f.attackCooldown = MW_ULT.LOCKOUT; f._benPowerCommit = MW_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────────
// Voltage gauge under the Omnitrix Power bar while Megawhatt is active + the opponent's Static pips / Shock.
export function drawMegawhattHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = mwState(f); if (!ctx || !s) return
  const drained = voltTier(s) === "drained", y = enY + enH + 3, h = 5
  const col = s.surge || s.surgeCast ? "#ffffff" : drained ? "#9ca3af" : "#fde047"
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x + 8, y, pbw, h)
  const w = pbw * Math.max(0, Math.min(1, s.volt / MW_VOLT.MAX))
  ctx.fillStyle = col; ctx.fillRect(flip ? x + 8 + pbw - w : x + 8, y, w, h)
  const notch = flip ? x + 8 + pbw - pbw * 0.25 : x + 8 + pbw * 0.25            // the Drained threshold (25)
  ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(notch - 0.5, y - 1, 1, h + 2)
  const st = s.stat, pips = st.shockT > 0 ? "SHOCK" : "●".repeat(st.pips) + "○".repeat(MW_STATIC.MAX - st.pips)
  const label = `VOLTAGE ${Math.round(s.volt)} · ${s.surge ? "SURGE" : drained ? "DRAINED" : "CHARGED"}`
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = col; ctx.fillText(`${label}   STATIC ${pips}`, flip ? x + 8 + pbw : x + 8, y + h + 1)
  ctx.restore()
}
const _imgs = {}
function sheetImg(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  return _imgs[src].complete && _imgs[src].naturalWidth ? _imgs[src] : null
}
const _h = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
// Thunder Strike marker, Shock crackle on the opponent, and the Blackout swarm (render-only copies of his fly frames).
export function drawMegawhattFx(c, f, frame = 0, opp = null) {
  const s = mwState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  if (s.strike) {                                                                 // 24f visible marker at the strike x
    const x = Math.round(s.strike.x), y = Math.round(s.strike.floor), blink = (s.strike.t >> 2) % 2
    c.globalAlpha = blink ? 0.95 : 0.55; c.fillStyle = "#fde047"
    for (let k = 0; k < 16; k++) { const t = k / 16 * Math.PI * 2; c.fillRect(Math.round(x + Math.cos(t) * 26) - 2, Math.round(y - 4 + Math.sin(t) * 8) - 2, 4, 4) }
    c.fillRect(x - 2, y - 40 - (s.strike.t % 8) * 6, 4, 18)
  }
  const ox = opp?._lastDrawX, oy = opp?._lastDrawY, ow = opp?._lastDrawW, oh = opp?._lastDrawH
  if (s.stat.shockT > 0 && ox != null) {                                         // Shock crackle over the stunned opponent
    c.globalAlpha = 0.9; c.strokeStyle = (frame >> 1) % 2 ? "#fde047" : "#ffffff"; c.lineWidth = 3
    for (let k = 0; k < 4; k++) {
      c.beginPath(); let px = ox + ow * _h(frame >> 1, k, 1), py = oy + oh * 0.1
      c.moveTo(px, py)
      for (let j = 0; j < 4; j++) { px += (_h(frame >> 1, k, j + 2) - 0.5) * 30; py += oh * 0.2; c.lineTo(px, py) }
      c.stroke()
    }
  }
  if (s.ult && s.ult.phase !== "opener" && ox != null) {                          // the swarm of 4 Megawhatts
    const a = (voltTier(s) === "drained" ? DRAINED_ANIM : ANIM).mwFly, img = sheetImg(a.sheet)
    const cx = ox + ow / 2, cy = oy + oh / 2, conv = s.ult.phase === "converge" ? Math.max(0, 1 - (s.ult.t - (MW_ULT.FINAL_AT - 10)) / 10) : 1
    for (let i = 0; i < 4; i++) {
      const ang = _h(s.ult.cast, i, 7) * Math.PI * 2 + s.ult.t * 0.25 * (i % 2 ? 1 : -1)
      const r = (60 + 50 * _h(s.ult.cast, i, 9)) * conv
      const px = cx + Math.cos(ang) * r, py = cy + Math.sin(ang) * r * 0.6
      const sc = a.actionScale * 2, fw = a.width, fh = a.height, fi = ((s.ult.t >> 1) + i) % a.frames
      c.globalAlpha = 0.95
      if (img) { c.save(); c.translate(px, py); if (Math.cos(ang) < 0) c.scale(-1, 1); c.drawImage(img, fi * fw, 0, fw, fh, -fw * sc / 2, -a.originY * sc + 20, fw * sc, fh * sc); c.restore() }
      else { c.fillStyle = "#fde047"; c.fillRect(px - 8, py - 8, 16, 16) }
    }
  }
  c.restore()
}
// BLACKOUT: the stage lights dim (world-space wash drawn UNDER both fighters, so both stay readable).
export function drawMegawhattUnder(c, f) {
  const s = mwState(f); if (!c || !s || !s.ult || s.ult.phase === "opener") return
  const t = s.ult.t, a = Math.min(1, t / 6) * Math.min(1, (MW_ULT.END - t) / 6)
  c.save(); c.globalAlpha = 0.6 * Math.max(0, a); c.fillStyle = "#05060f"; c.fillRect(-4000, -4000, 16000, 12000); c.restore()
}
