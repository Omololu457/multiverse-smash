// alienx.js — ALIEN X (Celestialsapien), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects never write it.
// No randomness in the simulation.
import { ALIENX_ANIM, ALIENX_GEOM } from "./alienxAssets.js"
import { flightTakeoff, isFlying, FLIGHT_PHASE, flightKnockedDown } from "./flight.js"
export { ALIENX_ANIM, ALIENX_GEOM }

// axVoice = the Stance frame held during a 20f voice switch; flight poses (sprite.js maps the flight controller's pose to
// fly / flyHover / flyCruise / …) all = the Dash frame (axFly). Render aliases only; no new art.
const A0 = ALIENX_ANIM
const ANIM = { ...A0, axVoice: A0.guard, fly: A0.axFly, flyHover: A0.axFly, flyCruise: A0.axFly, flyRise: A0.axFly, flyDive: A0.axFly }
// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

// DELIBERATION IS COSTLY: Omnitrix Power drains ×1.5 while Alien X is active (~13 s from full; base 5/s → 7.5/s).
export const AX_DRAIN_MULT = 1.5
// THREE VOICES (stance, GAME_STATE): Block + Light taps cycle Ben → Bellicus → Serena → Ben. 20f switch (Stance frame),
// 120f cooldown, refused in hitstun, during his own active frames and during the ultimate. Resets to Ben on swap / revert /
// KO / rematch (fresh formState) and after the ultimate.
//   BEN      balanced: base values; the only voice whose Decree hits build Void pips.
//   BELLICUS aggression: damage +20%, defense −15%, Decree startup +2f.
//   SERENA   restraint: defense +20%, damage −15%, guard drains 40% slower (block chip ×0.6), Decree Power −3 (min 6).
export const AX_VOICES = ["ben", "bellicus", "serena"]
export const AX_VOICE = { SWITCH: 20, COOLDOWN: 120, SWALLOW: 10,
  ben:      { dmg: 1.00, def: 1.00, startup: 0, cost: 0, chip: 1.0, label: "BEN" },
  bellicus: { dmg: 1.20, def: 0.85, startup: 2, cost: 0, chip: 1.0, label: "BELLICUS" },
  serena:   { dmg: 0.85, def: 1.20, startup: 0, cost: -3, chip: 0.6, label: "SERENA" } }
export const AX_MIN_DECREE_COST = 6
// VOID → UNMADE (status on the OPPONENT, owned by this form's GAME_STATE — swap / revert / KO clear it). Clean hits from
// Nullify, Gravity and Void Grasp add ONE pip per cast (however many ticks hit), max 3, Ben voice only; none from blocks,
// FX or Starfall Dash. Pips expire 240f after the last. 3 pips → UNMADE (pips consumed): for 300f the opponent's NEXT
// special is negated (startup plays, Power spent, no hitbox / projectile — abilities.triggerSpecial negate hook).
// Consumed on use or when the 300f expire; no refresh while active; 420f immunity after.
export const AX_VOID = { MAX: 3, EXPIRE: 240, UNMADE: 300, IMMUNE: 420 }
// FLIGHT (flight.js profile "alienx"): hold Jump in the air (≥ 8f) to hover-fly; max 120f per airtime, cruise 4.0, high
// drag, never above the jump apex + 140 px, knocked out of the sky (40f grounded lock) by a hard hit, never refills jumps.
export const AX_FLIGHT = { MAX: 120, CAP: 140, HOLD: 8 }
// DECREES (the five specials; pre-mod; startup / damage / on-block). Slow, committed, non-cancellable on whiff. Bellicus
// adds +2f to every Decree startup (decreeStartup); Serena takes 3 off every Decree Power cost, min 6 (decreeCost). The
// ultimate is not a Decree for these voice rules (its cost / timing are fixed).
export const AX_COST = { nullify: 12, gravity: 16, rewind: 20, grasp: 14, starfall: 12, ultimate: 60 }
export const AX_NULLIFY = { STARTUP: 24, ACTIVE: 6, RECOVERY: 20, DIST: 220, R: 70, DMG: 40, ON_BLOCK: -12 }
export const AX_GRAVITY = { STARTUP: 28, GAP: 6, RECOVERY: 22, R: 70, DMG1: 20, DMG2: 25, AIR: 55, PIN: 30, ON_BLOCK: -14, SLAM_VY: 16, BOUNCE_VY: -10, BOUNCE_WAIT: 45 }
export const AX_REWIND = { BACK: 60, HEAL: 40, RECOVERY: 30, COOLDOWN: 900 }
export const AX_GRASP = { STARTUP: 16, RANGE: 120, WHIFF: 28, TICKS: [8, 16, 24], TICK: 15, HOLD: 30, THROW: 200, CARRY: 12, RECOVERY: 12, DASH_WINDOW: 14 }
export const AX_STARFALL = { STARTUP: 4, DIST: 300, FRAMES: 20, DMG: 50, LAND: 10 }
// ABSOLUTE DECREE: grab-style opener 40 → starfield + float casting Circle f1–12 → 3 rings × 25 → Big Bang 135 (250 raw)
export const AX_ULT = { OPENER_AT: 16, OPENER: 40, WHIFF: 60, RISE: 18, FLOAT: 70, RINGS_AT: [40, 56, 72], RING: 25, BANG_AT: 96, BANG: 135, END: 116, LOCKOUT: 140 }

export const ALIENX = {
  id: "alienx", poolKey: "alienx", displayName: "Alien X", slot: 8,
  status: "ready", sheetPath: "./ben10_alienx_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/alienx/SPRITE_LEDGER.md",
  mods: { speed: 0.80, damage: 1.20, defense: 1.25, weight: 1.40 },
  movement: "flight", maxJumps: 2,              // the shared double jump; flight never refills it
  flightProfile: "alienx",                      // flight.js FLIGHT_PROFILES.alienx (per-alien flight profile hook)
  drainMult: AX_DRAIN_MULT,                     // per-alien Power drain multiplier hook (fighters.updateTransformDevice)
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Nullify", special2: "Gravity", special3: "Rewind", special4: "Void Grasp", special5: "Starfall Dash",
    ultimate: "Absolute Decree" },
  basic_attacks: {
    light:  normal(22, 6, 3, 12, 0),                                                      // Attacks f1
    heavy:  normal(64, 15, 4, 26, -7, { knockbackX: 8, rangeX: 190 }),                     // Attacks f2-4, 190 px
    down:   normal(30, 8, 3, 16, -4, { hitLevel: "low" }),                                 // Attacks f5-6, hits low
    up:     normal(54, 13, 4, 28, -10, { launcher: true, launchVy: -15, selfVy: 0 }),      // Attacks f8-9
    air:    normal(36, 8, 4, 12, 2)                                                        // Attacks f10
  },
  anim: ANIM,
  onApply, tick, moveFrames, damageTaken, negateSpecial, onContact, fireSpecial, fireUltimate,
  drawHud: drawAlienXHud, drawFx: drawAlienXFx, drawUnder: drawAlienXUnder
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshAlienXState() {
  return { kind: "alienx", t: 0, castId: 0, baseDmg: 1.0,
    voice: "ben", switchT: 0, voiceCd: 0, prevBL: false, swallowL: 0, switches: 0, ult: null,
    airborne: false, apexY: null, capY: null, jumpHeld: 0, flightUsed: 0, flights: 0,
    hist: [], histI: 0, rewindCd: 0, fwdPrev: false, fwdTapT: -999, dashTapT: -999, starUsed: false,
    nullify: null, gravity: null, bounce: null, grasp: null, star: null, lastUltRaw: 0,
    stats: { nullified: 0, rewinds: 0, healed: 0, grasps: 0, techs: 0, starfalls: 0 },
    void: { pips: 0, pipT: 0, lastPipCast: -1, unmadeT: 0, immune: 0, unmades: 0, negated: 0, negatedAt: -999 } }
}
export const axState = f => (f?.omnitrix?.formState?.kind === "alienx" && f.transformed && f.activeAlien === "alienx") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshAlienXState()
  f.omnitrix.formState.baseDmg = f.damageMultiplier ?? ALIENX.mods.damage   // mods.damage × Vow (set by applyAlien)
  f._alienFlightProfile = ALIENX.flightProfile; f._flightCtl = null           // cleared by clearBenFormState
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = axState(f); if (!s) return
  s.t++
  tickVoice(f, s, input || {})
  applyVoiceMods(f, s)
  tickVoid(s)
  tickFlight(f, s, input || {})
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  if (f.onGround || f.grounded) s.starUsed = false                       // Starfall Dash: once per airtime
  if (s.rewindCd > 0) s.rewindCd--
  tickDashTap(f, s, input || {})
  tickNullify(f, s, api, opp)
  tickGravity(f, s, api, opp)
  tickGrasp(f, s, api, opp)
  tickStarfall(f, s, api)
  tickUlt(f, s, opp, api)
  recordHistory(f, s)
}

// ── FLIGHT ────────────────────────────────────────────────────────────────────────────────────────────────
function tickFlight(f, s, input) {
  const c = f._flightCtl, flying = !!c && isFlying(f), grounded = !!(f.onGround || f.grounded)
  const jump = !!(input.jump || input.up)
  s.jumpHeld = jump ? s.jumpHeld + 1 : 0
  if (grounded) { s.airborne = false; s.apexY = null; s.capY = null; s.flightUsed = 0 }
  else { s.airborne = true; if (!flying) s.apexY = s.apexY == null ? f.y : Math.min(s.apexY, f.y) }
  if (flying) {
    s.flightUsed++
    if ((f.hitstun || 0) > 0) { flightKnockedDown(f); return }                     // hard hit → drop + 40f grounded lock
    if (!jump || s.flightUsed >= AX_FLIGHT.MAX || s.ult || s.switchT > 0) { c.phase = FLIGHT_PHASE.GROUNDED; c.wantDescend = false; return }
    if (s.capY != null && f.y < s.capY) { f.y = s.capY; if ((f.vy || 0) < 0) f.vy = 0 }   // never above apex + 140
    if (!f.attacking && !(f._spriteCastTimer > 0 && f._spriteCastMove !== "axFly")) { f._spriteCastMove = "axFly"; f._spriteCastTimer = 2 }
    return
  }
  if (grounded || !jump || s.jumpHeld < AX_FLIGHT.HOLD || s.flightUsed >= AX_FLIGHT.MAX || f.attacking ||
      (f.hitstun || 0) > 0 || s.ult || s.switchT > 0) return
  const jc = f.jumpCount
  if (flightTakeoff(f)) {
    f.jumpCount = jc                                                                // flight never refills jumps
    s.capY = (s.apexY ?? f.y) - AX_FLIGHT.CAP; s.flights++
  }
}

// ── THREE VOICES ──────────────────────────────────────────────────────────────────────────────────────────
export function inOwnActiveFrames(f) {
  const a = f.attacking && f.currentAttack
  if (!a) return false
  const el = (a.total || 0) - (a.timer || 0)
  return el >= (a.activeStart || 0) && el <= (a.activeEnd ?? a.activeStart ?? 0)
}
export const voiceOf = s => AX_VOICE[(s && s.voice) || "ben"]
export function canSwitchVoice(f, s) {
  return !!s && s.switchT <= 0 && s.voiceCd <= 0 && !((f.hitstun || 0) > 0) && !inOwnActiveFrames(f) && !s.ult
}
export function cycleVoice(f, s) {
  if (!canSwitchVoice(f, s)) return false
  s.voice = AX_VOICES[(AX_VOICES.indexOf(s.voice) + 1) % AX_VOICES.length]
  s.switchT = AX_VOICE.SWITCH; s.voiceCd = AX_VOICE.COOLDOWN; s.switches++
  f.attacking = false; f.currentAttack = null; f.currentMove = null
  f.attackCooldown = Math.max(f.attackCooldown || 0, AX_VOICE.SWITCH); f.vx = 0
  f._spriteCastMove = "axVoice"; f._spriteCastTimer = AX_VOICE.SWITCH
  f.colorFlash = Math.max(f.colorFlash || 0, 8)
  return true
}
export function resetVoice(s) { if (s) { s.voice = "ben"; s.switchT = 0 } }
// Block + Light (raw held buttons, edge on Light while Block is held). The Light press is swallowed: the jab is refused
// (moveFrames) while Block is held and until Light has been released for one input-buffer window (10f).
function tickVoice(f, s, input) {
  if (s.switchT > 0) { s.switchT--; f.vx = 0 }
  if (s.voiceCd > 0) s.voiceCd--
  const bl = !!(input.block && input.light)
  if (bl && !s.prevBL) cycleVoice(f, s)
  s.prevBL = bl
  if (input.light && (input.block || s.swallowL > 0)) s.swallowL = AX_VOICE.SWALLOW
  else if (s.swallowL > 0) s.swallowL--
}
// stance modifiers: damage / defense multipliers re-derived every frame from the form's base (mods × Vow)
function applyVoiceMods(f, s) {
  const v = voiceOf(s)
  f.damageMultiplier = s.baseDmg * v.dmg
  f.defenseMultiplier = ALIENX.mods.defense * v.def
}
// Decree timing / cost under the current voice (Bellicus +2f startup; Serena −3 Power, min 6)
export const decreeStartup = (s, base) => base + voiceOf(s).startup
export const decreeCost = (s, base) => voiceOf(s).cost ? Math.max(AX_MIN_DECREE_COST, base + voiceOf(s).cost) : base
// moveFrames hook (combat.startMove): refuse the jab while a Block + Light voice tap is being swallowed / Block is held.
function moveFrames(f, key, md) {
  const s = axState(f); if (!s) return md
  if (key === "light" && (s.swallowL > 0 || f.isBlocking)) return false
  if (s.switchT > 0) return false                                         // the 20f switch is committed
  return md
}
// damageTaken hook (combat.applyScaledDamage): Serena's guard drains 40% slower = block chip ×0.6.
function damageTaken(f, raw, opts) {
  const s = axState(f); if (!s) return raw
  if (opts && opts.source === "block-chip") return raw * voiceOf(s).chip
  return raw
}

// ── VOID → UNMADE ─────────────────────────────────────────────────────────────────────────────────────────
function tickVoid(s) {
  const v = s.void
  if (v.pips > 0 && --v.pipT <= 0) { v.pips = 0; v.pipT = 0 }
  if (v.unmadeT > 0) { if (--v.unmadeT <= 0) { v.unmadeT = 0; v.immune = AX_VOID.IMMUNE } }
  else if (v.immune > 0) v.immune--
}
// one pip per CAST (a cast id), Ben voice only, never while Unmade is active or the opponent is immune
export function addVoid(s, cast) {
  const v = s.void
  if (cast == null || cast === v.lastPipCast) return false
  if (s.voice !== "ben") return false
  if (v.unmadeT > 0 || v.immune > 0) return false
  v.lastPipCast = cast
  v.pips = Math.min(AX_VOID.MAX, v.pips + 1); v.pipT = AX_VOID.EXPIRE
  if (v.pips >= AX_VOID.MAX) { v.pips = 0; v.pipT = 0; v.unmadeT = AX_VOID.UNMADE; v.unmades++ }
  return true
}
// negateSpecial hook (abilities.triggerSpecial, asked for the fighter pressing Special): true while UNMADE is active on
// that opponent; commit = consume it (→ 420f immunity). It never changes input polling or the simulation clock.
function negateSpecial(f, target, commit) {
  const s = axState(f); if (!s || !target || target === f) return false
  const v = s.void
  if (!(v.unmadeT > 0)) return false
  if (commit) { v.unmadeT = 0; v.immune = AX_VOID.IMMUNE; v.negated++; v.negatedAt = s.t }
  return true
}

// ── DECREES ───────────────────────────────────────────────────────────────────────────────────────────────
//   ↓↘→ + P  Nullify (air: Starfall Dash)   ↓↙← + P  Gravity   ←↙↓ + P  Rewind   →→ + P  Void Grasp
// (the direction held the frame Special is pressed — the shared alien motion inputs — plus a frame-counted →→ tap)
const cx = o => o.x + (o.w || 60) / 2
function fireSpecial(f, ctx, api) {
  const s = axState(f); if (!s) return false
  const dir = f._specialHeldDir || null
  if (!(f.onGround || f.grounded)) return (dir === null || dir === "F" || dir === "D") ? castStarfall(f, s, api) : false
  if (dir === "B") return castGravity(f, s, api)
  if (dir === "D") return castRewind(f, s, api, ctx)
  if (dir === "F" && s.t - s.dashTapT <= AX_GRASP.DASH_WINDOW) return castGrasp(f, s, api)
  return castNullify(f, s, api)
}
// →→ : two FORWARD press edges within 14f, neither with Down held (↓↘→ holds Forward from ↘, so it never makes a 2nd edge)
function tickDashTap(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) {
    if (s.t - s.fwdTapT <= AX_GRASP.DASH_WINDOW) s.dashTapT = s.t
    s.fwdTapT = s.t
  }
  s.fwdPrev = fwd
}
function canAct(f, s) {
  return f.transformed && f.activeAlien === "alienx" && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !s.ult && !(s.switchT > 0) && !s.grasp && !s.star
}
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return false
  if (!api.spendEnergy(f, cost)) return false
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++
  return true
}
// a stationary rectangular hitbox (a "ring" / grab box) riding the shared projectile pipeline; vx carries the facing
// (knockback direction) at a negligible speed
const hitbox = (f, api, name, face, md) => api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, ...md }, {})

// NULLIFY — ring 220 px ahead (24f startup): deletes ONE opponent projectile inside it; 40 if the opponent is inside
function castNullify(f, s, api) {
  const st = decreeStartup(s, AX_NULLIFY.STARTUP), total = st + AX_NULLIFY.ACTIVE + AX_NULLIFY.RECOVERY
  if (!beginCast(f, s, api, "axCast", decreeCost(s, AX_COST.nullify), total)) return false
  const face = f.facing || 1
  s.nullify = { t: 0, st, x: cx(f) + face * AX_NULLIFY.DIST, y: f.y + f.h * 0.5, face, cast: s.castId, deleted: false }
  api.scheduleBenSpawn(f, st, () => hitbox(f, api, "ax_nullify", face, { damage: AX_NULLIFY.DMG, spawnX: s.nullify ? s.nullify.x : cx(f) + face * AX_NULLIFY.DIST,
    spawnY: f.y + f.h * 0.5, w: AX_NULLIFY.R * 2, h: 150, lifetime: AX_NULLIFY.ACTIVE, hitstun: 22, blockstun: Math.max(1, (total - st + 1) + AX_NULLIFY.ON_BLOCK),
    knockbackX: 5, knockbackY: -3, alien: { ax: "nullify", pip: true, cast: s.castId } }))
  return true
}
function tickNullify(f, s, api, opp) {
  const n = s.nullify; if (!n) return
  n.t++
  if (n.t >= n.st && n.t < n.st + AX_NULLIFY.ACTIVE && !n.deleted && opp) {
    const live = api.activeProjectiles()                                  // ownership-aware: only the opponent's, one piece
    for (let i = 0; i < live.length; i++) {
      const p = live[i]
      if (p.owner !== opp || p.visualOnly) continue
      const pr = Math.max(p.radius || 0, (p.w || 0) / 2, (p.h || 0) / 2)
      if (Math.hypot((p.x || 0) - n.x, (p.y || 0) - n.y) <= AX_NULLIFY.R + pr) { live.splice(i, 1); n.deleted = true; s.stats.nullified++; break }
    }
  }
  if (n.t >= n.st + AX_NULLIFY.ACTIVE + 8) s.nullify = null
}

// GRAVITY — ring where the opponent stood AT CAST (no tracking), 28f; grounded 2 hits + 30f pin, airborne slam + bounce
function castGravity(f, s, api) {
  const opp = api.getOpponent(f); if (!opp) return false
  const st = decreeStartup(s, AX_GRAVITY.STARTUP), total = st + AX_GRAVITY.GAP + AX_GRAVITY.RECOVERY
  if (!beginCast(f, s, api, "axCast", decreeCost(s, AX_COST.gravity), total)) return false
  s.gravity = { t: 0, st, total, x: cx(opp), y: opp.y + opp.h * 0.5, face: f.facing || 1, cast: s.castId, air: null }
  return true
}
function tickGravity(f, s, api, opp) {
  const g = s.gravity
  if (g) {
    g.t++
    const blk = at => Math.max(1, (g.total - at + 1) + AX_GRAVITY.ON_BLOCK)   // the hit frame counts for both sides
    const box = { spawnX: g.x, spawnY: g.y, w: AX_GRAVITY.R * 2, h: 170, lifetime: 2 }
    if (g.t === g.st) {
      g.air = !!opp && !(opp.onGround || opp.grounded)                      // decided at the active frame, at the cast-time spot
      if (g.air) hitbox(f, api, "ax_gravity", g.face, { ...box, damage: AX_GRAVITY.AIR, hitstun: 34, blockstun: blk(g.st),
        knockbackX: 1, knockbackY: AX_GRAVITY.SLAM_VY, alien: { ax: "gravAir", pip: true, cast: g.cast } })
      else hitbox(f, api, "ax_gravity", g.face, { ...box, damage: AX_GRAVITY.DMG1, hitstun: 16, blockstun: 10, noHitstop: true,
        knockbackX: 0.5, knockbackY: 0, alien: { ax: "grav1", pip: true, cast: g.cast } })
    }
    if (!g.air && g.t === g.st + AX_GRAVITY.GAP) hitbox(f, api, "ax_gravity", g.face, { ...box, damage: AX_GRAVITY.DMG2, hitstun: 22,
      blockstun: blk(g.st + AX_GRAVITY.GAP), knockbackX: 1, knockbackY: 0, alien: { ax: "grav2", pip: true, cast: g.cast } })
    if (g.t >= g.total) s.gravity = null
  }
  const b = s.bounce                                                       // air slam → one ground bounce
  if (b && opp) {
    b.t++
    if (b.t > 2 && (opp.onGround || opp.grounded)) {
      opp.vy = AX_GRAVITY.BOUNCE_VY; opp.onGround = false; opp.grounded = false
      opp.hitstun = Math.max(opp.hitstun || 0, 26); s.bounce = null
    } else if (b.t > AX_GRAVITY.BOUNCE_WAIT) s.bounce = null
  }
}

// REWIND — back to where he stood 60f ago (stage-clamped) + heal HP lost in those 60f (≤ 40, never above the 60f-ago value)
function recordHistory(f, s) {
  const e = [f.x, f.y, f.health, (f.onGround || f.grounded) ? 1 : 0]
  if (s.hist.length < AX_REWIND.BACK) s.hist.push(e)
  else { s.hist[s.histI] = e; s.histI = (s.histI + 1) % AX_REWIND.BACK }
}
export const rewindSnapshot = s => !s || !s.hist.length ? null : (s.hist.length < AX_REWIND.BACK ? s.hist[0] : s.hist[s.histI])
function castRewind(f, s, api, ctx) {
  if (s.rewindCd > 0) return false
  const snap = rewindSnapshot(s); if (!snap) return false
  const total = AX_REWIND.RECOVERY
  if (!beginCast(f, s, api, "axRewind", decreeCost(s, AX_COST.rewind), total)) return false
  const lo = ctx?.stageLeft ?? 0, hi = (ctx?.stageWidth ?? ctx?.worldWidth ?? Infinity) - (f.w || 60)
  f.x = Math.max(lo, Math.min(hi, snap[0])); f.y = snap[1]; f.vx = 0; f.vy = 0
  f.onGround = f.grounded = !!snap[3]
  const heal = Math.max(0, Math.min(AX_REWIND.HEAL, snap[2] - f.health))
  f.health = Math.min(f.maxHealth || Infinity, f.health + heal)
  s.rewindCd = AX_REWIND.COOLDOWN; s.stats.rewinds++; s.stats.healed += heal
  if (f._flightCtl) f._flightCtl.phase = FLIGHT_PHASE.GROUNDED
  return true
}

// VOID GRASP — command grab: 16f startup, 120 px, 28f whiff recovery; 3 × 15, throw 200 px, +1 pip; standard throw-escape
function castGrasp(f, s, api) {
  const st = decreeStartup(s, AX_GRASP.STARTUP)
  if (!beginCast(f, s, api, "axGrasp", decreeCost(s, AX_COST.grasp), st + AX_GRASP.WHIFF)) return false
  s.grasp = { t: 0, st, phase: "startup", cast: s.castId, face: f.facing || 1, scale: 1, x0: 0, y0: 0 }
  return true
}
export function graspReaches(f, opp) {
  const face = f.facing || 1, d = (cx(opp) - cx(f)) * face
  return d >= -10 && d <= AX_GRASP.RANGE && (f.onGround || f.grounded) && (opp.onGround || opp.grounded) &&
    !opp.eliminated && !opp.knockdownState && !opp.isGrabbed && !((opp.invulnTimer || 0) > 0)
}
function tickGrasp(f, s, api, opp) {
  const g = s.grasp; if (!g) return
  g.t++
  if (g.phase === "startup") {
    if ((f.hitstun || 0) > 0) { s.grasp = null; return }                  // stuffed
    if (g.t < g.st) return
    if (!opp || !graspReaches(f, opp)) { g.phase = "whiff"; return }
    if (!((opp.hitstun || 0) > 0 || (opp.blockstun || 0) > 0) && (opp.grabInputBuffer || 0) > 0) {   // throw tech (combat.resolveGrab rule)
      f.vx = -g.face * 3; opp.vx = g.face * 3; opp.attackCooldown = Math.max(opp.attackCooldown || 0, 18)
      s.stats.techs++; g.phase = "whiff"; return
    }
    g.phase = "hold"; g.t = 0; g.scale = api.getComboScale ? api.getComboScale(f) : 1
    f.comboCounter = (f.comboCounter || 0) + 1; f.comboTimer = 90
    opp.attacking = false; opp.currentAttack = null; opp.isBlocking = false
    f.attackCooldown = AX_GRASP.HOLD + AX_GRASP.CARRY + AX_GRASP.RECOVERY; f._benPowerCommit = f.attackCooldown
    f._spriteCastMove = "axGrasp"; f._spriteCastTimer = AX_GRASP.HOLD
    s.stats.grasps++; addVoid(s, g.cast)                                   // clean connect → +1 Void pip
    return
  }
  if (g.phase === "whiff") { if (g.t >= g.st + AX_GRASP.WHIFF) s.grasp = null; return }
  if (!opp || opp.eliminated) { s.grasp = null; return }
  if (g.phase === "hold") {
    opp.hitstun = Math.max(opp.hitstun || 0, 6); opp.vx = 0; opp.vy = 0
    opp.x = cx(f) + g.face * 52 - (opp.w || 60) / 2; f.vx = 0
    if (AX_GRASP.TICKS.includes(g.t)) { api.applyScaledDamage(opp, AX_GRASP.TICK * g.scale, { attacker: f, move: "void_grasp", source: "ability" }); opp.colorFlash = 6 }
    if (g.t >= AX_GRASP.HOLD) { g.phase = "throw"; g.t = 0; g.x0 = opp.x; g.y0 = opp.y; f._spriteCastMove = "axThrow"; f._spriteCastTimer = AX_GRASP.CARRY + 4 }
    return
  }
  if (g.phase === "throw") {                                              // 200 px carry over 12f (ease-out arc)
    const k = Math.min(1, g.t / AX_GRASP.CARRY), e = 1 - (1 - k) * (1 - k)
    opp.x = g.x0 + g.face * AX_GRASP.THROW * e; opp.y = g.y0 - Math.sin(Math.PI * k) * 36
    opp.vx = 0; opp.vy = 0; opp.hitstun = Math.max(opp.hitstun || 0, 14)
    if (g.t >= AX_GRASP.CARRY) { opp.hitstun = Math.max(opp.hitstun || 0, 20); s.grasp = null }
  }
}

// STARFALL DASH (air) — diagonal-down 300 px over 20f, 50, once per airtime, no jump refill, no Void pip
function castStarfall(f, s, api) {
  if (s.starUsed) return false
  const st = decreeStartup(s, AX_STARFALL.STARTUP)
  if (!beginCast(f, s, api, "axFly", decreeCost(s, AX_COST.starfall), st + AX_STARFALL.FRAMES + AX_STARFALL.LAND, { commit: false })) return false
  s.starUsed = true
  if (f._flightCtl) f._flightCtl.phase = FLIGHT_PHASE.GROUNDED                  // leaves hover-flight (no refill)
  s.star = { t: 0, st, face: f.facing || 1, cast: s.castId, landed: false }
  return true
}
function tickStarfall(f, s, api) {
  const d = s.star; if (!d) return
  d.t++
  const v = AX_STARFALL.DIST / AX_STARFALL.FRAMES / Math.SQRT2, live = d.t - d.st
  const end = () => { delete f._benGlide; s.star = null
    const L = api.activeProjectiles(); for (let i = L.length - 1; i >= 0; i--) if (L[i].owner === f && L[i].name === "ax_starfall") L.splice(i, 1) }
  if ((f.hitstun || 0) > 0) { end(); return }
  if (live < 0) { f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }; return }   // hang during startup
  if (live === 0) api.spawnProjectile(f, "ax_starfall", { damage: AX_STARFALL.DMG, speed: 0, vx: d.face * v, vy: v,
    spawnX: cx(f) + d.face * 20, spawnY: f.y + f.h * 0.6, w: 80, h: 80, rectHitbox: true, lifetime: AX_STARFALL.FRAMES, isSpecial: true,
    hitstun: 24, blockstun: 12, knockbackX: 6, knockbackY: 2, alien: { ax: "starfall", pip: false, cast: d.cast } }, {})
  f._spriteCastMove = "axFly"; f._spriteCastTimer = 2
  if (live >= AX_STARFALL.FRAMES || (live > 0 && (f.onGround || f.grounded))) { end(); f.attackCooldown = AX_STARFALL.LAND; return }
  f._benGlide = { vx: d.face * v, vy: v }
}

// contact hook (combat → ben10State.benAlienContact): clean hits from Nullify / Gravity add ONE pip per cast (Void Grasp
// adds its own on connect); Gravity's 2nd grounded hit pins, the air slam bounces; the ultimate's opener captures.
function onContact(f, target, { proj = null, blocked = false } = {}) {
  const s = axState(f); if (!s || !proj || proj.visualOnly) return
  const tag = proj.alien; if (!tag || !tag.ax || blocked) return
  if (tag.pip) addVoid(s, tag.cast)
  if (tag.ax === "grav2") target._benPinT = AX_GRAVITY.PIN                // physics: no jump, ×0.5 walk (self-decrementing)
  if (tag.ax === "gravAir") s.bounce = { t: 0 }
  if (tag.ax === "ultOpen" && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
}

// ── ultimate: ABSOLUTE DECREE (same input as Omnitrix Overload, alien form only) ──────────────────────────────
function fireUltimate(f, ctx, api) {
  const s = axState(f); if (!s) return false
  if (!beginCast(f, s, api, "axGrasp", AX_COST.ultimate, AX_ULT.OPENER_AT + AX_ULT.WHIFF)) return false
  const face = f.facing || 1
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId }
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, AX_ULT.OPENER_AT, () => hitbox(f, api, "ax_ult_open", face, {
    damage: AX_ULT.OPENER, spawnX: cx(f) + face * (f.w / 2 + 50), spawnY: f.y + f.h * 0.5, w: 120, h: 110, lifetime: 3,
    isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0, knockbackY: 0, alien: { ax: "ultOpen", cast: s.castId } }))
  return true                                                              // whiff / block: no capture → 60f recovery
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "rise"; u.t = 0; u.raw = AX_ULT.OPENER
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = AX_ULT.END + AX_ULT.LOCKOUT; f._benPowerCommit = AX_ULT.END; f._spriteCastTimer = AX_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, AX_ULT.END + 2)            // cinematic only (the opponent is captured)
  if (f._flightCtl) f._flightCtl.phase = FLIGHT_PHASE.GROUNDED
}
function tickUlt(f, s, opp, api) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > AX_ULT.OPENER_AT + 12) s.ult = null; return }   // whiffed / blocked
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y - Math.min(AX_ULT.FLOAT, u.t * (AX_ULT.FLOAT / AX_ULT.RISE))   // floats up
  f.onGround = false; f.grounded = false
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "absolute_decree", source: "ability" }); u.raw += dmg; opp.colorFlash = 8; api.shake?.(shake, 8) }
  if (u.t < AX_ULT.RISE) { u.phase = "rise"; f._spriteCastMove = "axFly" }
  else if (u.t < AX_ULT.BANG_AT) { u.phase = "rings"; f._spriteCastMove = "axCast"
    const k = AX_ULT.RINGS_AT.indexOf(u.t); if (k >= 0) hit(AX_ULT.RING, 3 + k * 2) }
  else if (u.t < AX_ULT.END) { u.phase = "bang"; f._spriteCastMove = "axCastHold"
    if (u.t === AX_ULT.BANG_AT) hit(AX_ULT.BANG, 16) }                    // ignores Unmade timing; applies no Unmade
  else { endUlt(f, s, opp); return }
  f._spriteCastTimer = 2
}
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }     // positions restore
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = (u.face || 1) * 10; opp.vy = -8 }
  s.lastUltRaw = u?.raw || 0
  s.ult = null
  resetVoice(s); s.voiceCd = 0                                             // Stance resets to Ben
  f.attackCooldown = AX_ULT.LOCKOUT; f._benPowerCommit = AX_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
const VOICE_COL = { ben: "#7dff6a", bellicus: "#f87171", serena: "#93c5fd" }
export function drawAlienXHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = axState(f); if (!ctx || !s) return
  const y = enY + enH + 3, col = VOICE_COL[s.voice] || "#fff"
  ctx.save()
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  const cd = s.voiceCd > 0 ? `  (${Math.ceil(s.voiceCd / 60)}s)` : ""
  ctx.fillStyle = col; ctx.fillText(`VOICE ${voiceOf(s).label}${s.switchT > 0 ? " …" : ""}${cd}`, flip ? x + 8 + pbw : x + 8, y)
  const v = s.void
  const vt = v.unmadeT > 0 ? "UNMADE" : v.immune > 0 ? "IMMUNE" : "◆".repeat(v.pips) + "◇".repeat(AX_VOID.MAX - v.pips)
  ctx.fillStyle = v.unmadeT > 0 ? "#c084fc" : "#e5e7eb"; ctx.fillText(`VOID ${vt}`, flip ? x + 8 + pbw : x + 8, y + 10)
  ctx.restore()
}
// world-space overlays: the UNMADE void glyph over the opponent (+ a burst when a special is negated). Render-only.
export function drawAlienXFx(c, f, frame = 0, opp = null) {
  const s = axState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const n = s.nullify                                                      // Nullify ring (opens over the startup)
  if (n) drawPixelRing(c, n.x, n.y, AX_NULLIFY.R * Math.min(1, n.t / n.st), n.t >= n.st ? "#f8fafc" : "#94a3b8", n.t >= n.st ? 4 : 3, frame)
  const g = s.gravity                                                      // Gravity ring (closes on the cast-time spot)
  if (g) drawPixelRing(c, g.x, g.y, AX_GRAVITY.R * (1.6 - 0.6 * Math.min(1, g.t / g.st)), g.t >= g.st ? "#c084fc" : "#a78bfa", g.t >= g.st ? 4 : 3, frame)
  const u = s.ult
  if (u && u.thome && opp) {                                               // ult: 3 rings closing on the opponent, then the Big Bang
    const ox = u.thome.x + (opp.w || 60) / 2, oy = u.thome.y + (opp.h || 110) / 2
    AX_ULT.RINGS_AT.forEach((at, k) => { const d = at - u.t; if (d > -6 && d < 24) drawPixelRing(c, ox, oy, 26 + Math.max(0, d) * 7, d <= 0 ? "#ffffff" : "#e2e8f0", 4, frame + k) })
    const b = u.t - AX_ULT.BANG_AT
    if (b >= 0 && b < 20) { const r = 20 + b * 16
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; c.fillStyle = i % 2 ? "#ffffff" : "#fde68a"
        for (let q = 0; q < 6; q++) c.fillRect(Math.round(ox + Math.cos(a) * (r * q / 6)), Math.round(oy + Math.sin(a) * (r * q / 6)), 4, 4) }
      drawPixelRing(c, ox, oy, r, "#ffffff", 5, frame) }
  }
  if (opp && opp._lastDrawX != null && opp._lastDrawW != null) {
    const ox = opp._lastDrawX + opp._lastDrawW / 2, oy = opp._lastDrawY - 14
    if (s.void.unmadeT > 0) drawVoidGlyph(c, ox, oy, 3, frame)
    else if (s.void.pips > 0) for (let i = 0; i < s.void.pips; i++) drawVoidGlyph(c, ox + (i - (s.void.pips - 1) / 2) * 14, oy, 1, frame)
    const since = s.t - s.void.negatedAt
    if (since >= 0 && since < 30) { c.strokeStyle = `rgba(192,132,252,${1 - since / 30})`; c.lineWidth = 3; c.beginPath(); c.arc(ox, oy + 40, 10 + since * 2, 0, Math.PI * 2); c.stroke() }
  }
  c.restore()
}
// pixel-style ring of square dots (procedural, render-only)
export function drawPixelRing(c, x, y, r, col, k = 4, frame = 0) {
  if (!(r > 0)) return
  const n = Math.max(12, Math.round(r * 0.6)), spin = (frame % 60) / 60 * Math.PI * 2 / n
  c.fillStyle = col
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + spin; c.fillRect(Math.round(x + Math.cos(a) * r - k / 2), Math.round(y + Math.sin(a) * r - k / 2), k, k) }
}
// ultimate starfield under the fighters (world space; fades in / out with the cinematic; both fighters stay readable)
export function drawAlienXUnder(c, f) {
  const s = axState(f); if (!c || !s || !s.ult || s.ult.phase === "opener" || !s.ult.home) return
  const t = s.ult.t, a = Math.max(0, Math.min(1, t / 8) * Math.min(1, (AX_ULT.END - t) / 8))
  const x0 = s.ult.home.x + (f.w || 60) / 2, y0 = s.ult.home.y
  c.save(); c.globalAlpha = 0.82 * a; c.fillStyle = "#02030a"; c.fillRect(-4000, -4000, 16000, 12000)
  c.globalAlpha = a
  for (let i = 0; i < 140; i++) {
    const sx = x0 + (axHash(s.ult.cast, i, 1) - 0.5) * 1800, sy = y0 + (axHash(s.ult.cast, i, 2) - 0.75) * 900
    const tw = (axHash(s.ult.cast, i, 3) * 60 + t) % 60 < 30 ? 1 : 0.55, k = axHash(s.ult.cast, i, 4) < 0.15 ? 3 : 2
    c.globalAlpha = a * tw; c.fillStyle = axHash(s.ult.cast, i, 5) < 0.2 ? "#c4b5fd" : "#ffffff"; c.fillRect(Math.round(sx), Math.round(sy), k, k)
  }
  c.restore()
}
// render-only deterministic hash (cast id, index, axis) → [0, 1)
function axHash(a, b, c) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((c | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
// 7×7 pixel void glyph (white ring, black core, violet rim) — procedural, render-only
export function drawVoidGlyph(c, x, y, k = 3, frame = 0) {
  const rows = [".vwwwv.", "vw...wv", "w.bbb.w", "w.b.b.w", "w.bbb.w", "vw...wv", ".vwwwv."]
  const pal = { w: "#f8fafc", v: (frame >> 3) % 2 ? "#a855f7" : "#c084fc", b: "#030712" }
  for (let r = 0; r < rows.length; r++) for (let i = 0; i < rows[r].length; i++) {
    const ch = rows[r][i]; if (ch === ".") continue
    c.fillStyle = pal[ch]; c.fillRect(Math.round(x + (i - 3.5) * k), Math.round(y + (r - 3.5) * k), k, k)
  }
}
