// ghostfreak.js — GHOSTFREAK (Ectonurite), a READY Omnitrix alien (registry entry + subvercetti sheet + ledger).
// Leaf module: imports only its generated art table, the leaf flight module and the pure damage-type metadata
// (damageTypes.js → damageTags.js; no engine imports, no cycles). The engine reaches it through the generic, ben10-gated
// ready-form hooks (docs/ben10/ADD_ALIEN.md) and hands it an `api` of shared primitives.
//
// ALL simulation state lives in GAME_STATE: fighter.omnitrix.formState (Phase, Ambush, Dread / Terror, casts, Possess,
// ult) plus the flight controller fighter._flightCtl (flight.js) — cleared by clearBenFormState on swap / revert / KO.
// Two short LEASES live on the opponent and lapse by themselves within 2 frames once he stops refreshing them (swap /
// KO safe): `_benTerrorT` (Terror movement rule, read by physics) and the Possess hold (hitstun refresh).
// No randomness anywhere in the simulation. Render-only bits (40 % body alpha, rings, wind, darkening, tint, shake)
// READ that state; they never write it.
import { GHOSTFREAK_ANIM, GHOSTFREAK_FX, GHOSTFREAK_ICONS } from "./ghostfreakAssets.js"
import { flightTakeoff, isFlying, FLIGHT_PHASE, flightKnockedDown } from "./flight.js"
import { meleeDamageType, projectileDamageType } from "./damageTypes.js"
export { GHOSTFREAK_ANIM, GHOSTFREAK_FX, GHOSTFREAK_ICONS }

// flight poses (sprite.js maps the flight controller's pose to fly / flyHover / flyCruise / flyRise / flyDive)
const ANIM = { ...GHOSTFREAK_ANIM, fly: GHOSTFREAK_ANIM.gfFly, flyHover: GHOSTFREAK_ANIM.gfFly, flyCruise: GHOSTFREAK_ANIM.gfFly,
  flyRise: GHOSTFREAK_ANIM.gfFly, flyDive: GHOSTFREAK_ANIM.gfFly }

// ── tuning (pre-mod numbers from the brief) ─────────────────────────────────────────────────────────────────
// PHASE: Block + Light (tap). 10 Power to enter, 8f transition (green silhouette), Intangible drains 4 Power/s, 90f max.
// Leaving costs a 20f MATERIALIZE recovery (tangible, vulnerable); forced exit (90f / out of Power) → 240f cooldown,
// manual exit → 60f. Casting Wail / Possess from Intangible leaves Phase FOR the cast (no 20f recovery; 60f cooldown).
export const GF_PHASE = { COST: 10, ENTER: 8, MAX: 90, DRAIN: 4 / 60, MATERIALIZE: 20, CD_FORCED: 240, CD_MANUAL: 60, SWALLOW: 10 }
// AMBUSH: the first hit within 24f of materializing (counted from the moment he can act again — after the 20f
// recovery, or from the cast that left Phase) deals +20 %; a normal started in the window starts 2f sooner (min 1f).
export const GF_AMBUSH = { WINDOW: 24, MULT: 1.2, CUT: 2 }
// DREAD → TERROR (status on the opponent, owned by this form's GAME_STATE)
export const GF_DREAD = { MAX: 3, EXPIRE: 240, TERROR: 120, IMMUNE: 360, WALK: 0.6, CHIP: 1.3 }
export const GF_COST = { gale: 10, wail: 14, possess: 18, rise: 12, cold: 12, ultimate: 50 }
// SPECTRAL GALE: swirl travels up to 380 px; on reaching the opponent it holds on them: 4 ticks × 10 every 8f, pushes
// 6 px/f while they are inside it (8f max per cast), one on screen.
export const GF_GALE = { STARTUP: 12, SPEED: 10, RANGE: 380, TICKS: [0, 8, 16, 24], DMG: 10, PUSH: 6, PUSH_MAX: 8, W: 70, H: 90, TOTAL: 36 }
// WAIL: 160 px burst around him, 16f startup, 30, −10 on block, +1 Dread.
export const GF_WAIL = { STARTUP: 16, RADIUS: 160, DMG: 30, TOTAL: 46, ON_BLOCK: -10 }
// POSSESS: command grab, 14f startup (10 from Intangible), 140 px, 28f whiff recovery; possessed 45f, 3 × 15, +2 Dread, +15 Power.
export const GF_POSSESS = { STARTUP: 14, STARTUP_PHASED: 10, RANGE: 140, WHIFF: 28, HOLD: 45, TICKS: [15, 30, 45], DMG: 15, POWER: 15, TECH_CD: 18 }
// PHANTOM RISE: spiralling upward gale, 55, upper body intangible to physical hits on active frames 4-10, −12 on block.
export const GF_RISE = { STARTUP: 4, HIT_AT: 6, DMG: 55, IFRAMES: [4, 10], RISE_VY: -15, TOTAL: 34, ON_BLOCK: -12 }
// COLD TOUCH (air): downward gale, 40, once per airtime.
export const GF_COLD = { STARTUP: 6, DMG: 40, TOTAL: 28, DIVE_VY: 7 }
export const GF_FLIGHT_MAX = 150, GF_FLIGHT_CAP = 160, GF_FLIGHT_HOLD = 8
// FEAR FEAST: grab opener 40 → dissolve → tremor 3 × 25 → storm 3 × 20 → scream 65 = 240 raw; heal 15 once; 100f lockout.
export const GF_ULT = { STARTUP: 12, RANGE: 150, OPENER: 40, WHIFF_RECOVERY: 60, TREMOR_AT: [20, 28, 36], TREMOR: 25,
  STORM_AT: [48, 58, 68], STORM: 20, SCREAM_AT: 84, SCREAM: 65, END: 100, LOCKOUT: 100, HEAL: 15 }

const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 16, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra
})

export const GHOSTFREAK = {
  id: "ghostfreak", poolKey: "ghostfreak", displayName: "Ghostfreak", slot: 7,
  status: "ready", sheetPath: "./ben10_ghostfreak_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/ghostfreak/SPRITE_LEDGER.md",
  mods: { speed: 0.90, damage: 1.00, defense: 0.80, weight: 0.50 },
  movement: "flight", maxJumps: 2,   // the shared double jump; flight never refills it
  flightProfile: "ghostfreak",       // flight.js FLIGHT_PROFILES.ghostfreak (per-alien flight profile hook)
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Spectral Gale", special2: "Wail", special3: "Possess", special4: "Phantom Rise", special5: "Cold Touch",
    defense: "Phase", ultimate: "Fear Feast" },
  basic_attacks: {
    light: normal(16, 5, 3, 9, 0),                                                     // Attack pose + short wind swipe
    heavy: normal(48, 14, 4, 22, -6, { knockbackX: 8, rangeX: 170 }),                  // Attack pose + extended wind swipe, 170 px
    down:  normal(22, 7, 3, 14, -4, { hitLevel: "low" }),                              // Attack pose, low offset, hits low
    up:    normal(42, 11, 4, 26, -9, { launcher: true, launchVy: -15, selfVy: 0 }),    // Fly frame tilted up + upward gale
    air:   normal(26, 7, 4, 10, 2)                                                     // Fly frame + forward wind
  },
  anim: ANIM, fx: GHOSTFREAK_FX, icons: GHOSTFREAK_ICONS,
  onApply, tick, fireSpecial, fireUltimate, blockLight, onContact, moveFrames, evade, phasing, damageDealt, bodyAlpha,
  drawHud: drawGhostfreakHud, drawFx: drawGhostfreakFx, drawUnder: drawGhostfreakUnder
}

let _api = null   // the shared primitives object (stateless); blockLight can be called without one

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshGhostfreakState() {
  return { kind: "ghostfreak", t: 0, castId: 0,
    ph: "tangible", phT: 0, phCd: 0, phUses: 0, forced: 0, manual: 0, swallow: 0, noBlock: false, noAttack: false,
    amb: { pending: false, win: 0, used: false, cut: false, hits: 0 },
    dread: { pips: 0, pipT: 0, lastCast: -1, terrorT: 0, immune: 0, terrors: 0 },
    gale: null, wail: null, possess: null, rise: null, cold: null, ult: null,
    riseUsed: false, coldUsed: false, lastUltRaw: 0, healed: false,
    airborne: false, apexY: null, capY: null, jumpHeld: 0, flightUsed: 0, floorY: null,
    hist: [], lastDir: 5, fwdPrev: false, fwdTapT: -999, dashTapT: -999,
    stats: { evaded: 0, possessed: 0, techs: 0, ambush: 0 } }
}
export const gfState = f => (f?.omnitrix?.formState?.kind === "ghostfreak" && f.transformed && f.activeAlien === "ghostfreak") ? f.omnitrix.formState : null
export const isIntangible = s => !!s && s.ph === "intangible"
export const isPhased = s => !!s && (s.ph === "intangible" || s.ph === "entering")
const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f.side] ?? 0)

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshGhostfreakState()
  f._alienFlightProfile = GHOSTFREAK.flightProfile; f._flightCtl = null
  if (f.onGround || f.grounded) s.floorY = f.y + f.h
}

// ── per-frame tick (GAME_STATE only; abilities.tickBenAlienForm calls it once per fighter per frame) ─────────
function tick(f, input, ctx, api) {
  const s = gfState(f); if (!s) return
  _api = api; s.t++
  const opp = api.getOpponent(f)
  const grounded = !!(f.onGround || f.grounded)
  if (grounded) { s.floorY = f.y + f.h; if (!s.rise) s.riseUsed = false; if (!s.cold) s.coldUsed = false }   // a rise's grounded startup frames are not a landing
  if (s.swallow > 0) s.swallow = input && input.light ? GF_PHASE.SWALLOW : s.swallow - 1   // the Block + Light press never also jabs
  tickInputs(f, s, input || {}, opp)
  tickPhase(f, s, api)
  tickAmbush(s)
  tickFlight(f, s, input, grounded)
  tickGale(f, s, opp, ctx, api)
  tickWail(f, s)
  tickPossess(f, s, opp, api)
  tickRise(f, s)
  tickCold(f, s)
  tickUlt(f, s, opp, api)
  tickDread(f, s, opp)
  s.noBlock = s.ph === "intangible" || s.ph === "entering"                           // cannot block while phased (formState.noBlock)
  s.noAttack = s.noBlock || s.ph === "materialize"                                  // no normal throw while phased / materializing (formState.noAttack)
}

// ── PHASE ─────────────────────────────────────────────────────────────────────────────────────────────────
// Block + Light (edge). Not in hitstun / blockstun, not during a move or a special, not in the Ultimate / Possess.
function blockLight(f, ctx, api) {
  const s = gfState(f); if (!s) return false
  if (s.ph === "intangible") { exitPhase(f, s, "manual"); s.swallow = GF_PHASE.SWALLOW; return true }
  if (s.ph !== "tangible" || s.phCd > 0) return false
  if ((f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || f.attacking || (f._benPowerCommit || 0) > 0 || s.ult || s.possess) return false
  const a = api || _api; if (!a || !a.spendEnergy(f, GF_PHASE.COST)) return false
  s.ph = "entering"; s.phT = GF_PHASE.ENTER; s.phUses++; s.swallow = GF_PHASE.SWALLOW
  s.amb = { pending: false, win: 0, used: false, cut: false, hits: 0 }
  f._spriteCastMove = "gfPhase"; f._spriteCastTimer = GF_PHASE.ENTER
  if (!f._benSfx) f._benSfx = "transform"
  return true
}
function tickPhase(f, s, api) {
  if (s.phCd > 0 && s.ph === "tangible") s.phCd--
  if (s.ph === "entering") { if (--s.phT <= 0) { s.ph = "intangible"; s.phT = 0 } return }
  if (s.ph === "intangible") {
    s.phT++
    f.energy = Math.max(0, (f.energy || 0) - GF_PHASE.DRAIN)                       // 4 Power / s
    if (s.phT >= GF_PHASE.MAX || (f.energy || 0) <= 0) exitPhase(f, s, "forced")
    return
  }
  if (s.ph === "materialize" && --s.phT <= 0) { s.ph = "tangible"; s.phT = 0; s.amb.win = GF_AMBUSH.WINDOW; s.amb.pending = true }
}
// leave Phase: "manual" / "forced" pay the 20f Materialize recovery; "cast" (Wail / Possess from Intangible) leaves
// Phase for the cast itself. Cooldown 240f after a forced exit, 60f otherwise.
function exitPhase(f, s, kind) {
  s.phCd = kind === "forced" ? GF_PHASE.CD_FORCED : GF_PHASE.CD_MANUAL
  if (kind === "forced") s.forced++; else s.manual++
  s.amb = { pending: true, win: kind === "cast" ? GF_AMBUSH.WINDOW : 0, used: false, cut: false, hits: 0 }
  if (kind === "cast") { s.ph = "tangible"; s.phT = 0; return }
  s.ph = "materialize"; s.phT = GF_PHASE.MATERIALIZE
  f.attackCooldown = Math.max(f.attackCooldown || 0, GF_PHASE.MATERIALIZE)
  f._benPowerCommit = Math.max(f._benPowerCommit || 0, GF_PHASE.MATERIALIZE)        // tangible, vulnerable, can't act
  f._spriteCastMove = "gfPhase"; f._spriteCastTimer = 6
}
function tickAmbush(s) { if (s.amb.win > 0 && --s.amb.win <= 0) s.amb.pending = false }
const ambushLive = s => !!s && s.amb.pending && !s.amb.used && s.amb.win > 0

// startMove hook: no normals while phased / materializing; an Ambush normal starts 2f sooner (min 1f).
function moveFrames(f, key, md) {
  const s = gfState(f); if (!s || !md) return md
  if (s.ph !== "tangible" || s.possess || (s.ult && s.ult.phase !== "opener")) return false
  if (key === "light" && s.swallow > 0) return false                                // the Phase press is still buffered
  if (!ambushLive(s) || s.amb.cut) return md
  s.amb.cut = true
  return { ...md, startup: Math.max(1, (md.startup ?? 5) - GF_AMBUSH.CUT) }
}

// ── hit filtering (Intangible) ────────────────────────────────────────────────────────────────────────────
const NORMALS = new Set(["light", "heavy", "up", "air", "down", "down_air", "air_heavy", "crouchLight", "lowAttack", "low"])
const ENERGY_RX = /beam|laser|blast|fire|flame|electric|lightning|thunder|plasma|energy/i
export function isEnergyMelee(attacker, move) {
  if (!move) return false
  return meleeDamageType(attacker, move) === "energy" || !!(move.fire || move.electric || move.beam || move.energy) || ENERGY_RX.test(move.damageType || "")
}
export function isEnergyProjectile(p) {
  if (!p) return false
  return projectileDamageType(p) === "energy" || !!(p.fire || p.electric || p.beam || p.energy || p.isBeam) || ENERGY_RX.test(String(p.name || ""))
}
// Intangible: physical melee NORMALS and non-energy projectiles pass through him (no hit, no blockstun, no pip).
// Energy / fire / electric / beam hits still land. Phantom Rise active frames 4-10: same filter for physical hits.
function evade(f, { move = null, proj = null, attacker = null } = {}) {
  const s = gfState(f); if (!s) return false
  const riseI = s.rise && s.rise.t >= GF_RISE.IFRAMES[0] && s.rise.t <= GF_RISE.IFRAMES[1]
  if (!isIntangible(s) && !riseI) return false
  let pass = false
  if (proj) pass = !proj.visualOnly && !isEnergyProjectile(proj)
  else if (move) pass = (riseI ? true : NORMALS.has(move.name)) && !isEnergyMelee(attacker, move) && !move.isUltimate
  if (pass) s.stats.evaded++
  return pass
}
// no pushbox vs the opponent while phased or possessing (stage collision still applies — physics clamps the stage)
function phasing(f) { const s = gfState(f); return !!(s && (isPhased(s) || s.possess || (s.ult && s.ult.phase !== "opener"))) }
// render-only: 40 % body while phased; hidden while inside a possessed target
function bodyAlpha(f) {
  const s = gfState(f); if (!s) return 1
  if (s.possess || (s.ult && s.ult.phase !== "opener" && s.ult.phase !== "scream" && s.ult.phase !== "storm")) return 0
  if (s.ph === "intangible") return 0.4
  if (s.ph === "entering") return 0.7
  return 1
}

// Ambush (+20 % once per Phase use) and Terror's faster guard drain (block chip ×1.3) on damage this form deals.
function damageDealt(f, target, raw, opts) {
  const s = gfState(f); if (!s) return raw
  if (opts.source === "block-chip") return s.dread.terrorT > 0 ? raw * GF_DREAD.CHIP : raw
  if (ambushLive(s) || (s.possess && s.possess.ambush)) {
    if (s.possess && s.possess.ambush) return raw * GF_AMBUSH.MULT                  // every Possess drain tick of an Ambush Possess
    s.amb.used = true; s.amb.hits++; s.stats.ambush++
    return raw * GF_AMBUSH.MULT
  }
  return raw
}

// ── FLIGHT (flight.js, profile "ghostfreak"): hold Jump in the air to float. 150f per airtime, cruise 5.0, high drag,
// capped at the jump apex + 160 px, knocked out of the sky (40f grounded lock) by a hard hit, never refills jumps,
// disabled during the Materialize recovery. Allowed while Intangible.
function tickFlight(f, s, input, grounded) {
  const c = f._flightCtl, flying = !!c && isFlying(f)
  const jump = !!(input && (input.jump || input.up))
  s.jumpHeld = jump ? s.jumpHeld + 1 : 0
  if (grounded) { s.airborne = false; s.apexY = null; s.capY = null; s.flightUsed = 0 }
  else { s.airborne = true; if (!flying) s.apexY = s.apexY == null ? f.y : Math.min(s.apexY, f.y) }
  const blocked = s.ph === "materialize" || s.ult || s.possess || s.rise || s.cold
  if (flying) {
    s.flightUsed++
    if ((f.hitstun || 0) > 0) { flightKnockedDown(f); return }                    // hard hit → drop + 40f grounded lock
    if (!jump || blocked || s.flightUsed >= GF_FLIGHT_MAX) { c.phase = FLIGHT_PHASE.GROUNDED; c.wantDescend = false; return }
    if (s.capY != null && f.y < s.capY) { f.y = s.capY; if ((f.vy || 0) < 0) f.vy = 0 }   // no altitude past apex + 160
    if (!f.attacking) { f._spriteCastMove = "gfFly"; f._spriteCastTimer = 2 }
    return
  }
  if (grounded || blocked || !jump || s.jumpHeld < GF_FLIGHT_HOLD || s.flightUsed >= GF_FLIGHT_MAX || f.attacking || (f.hitstun || 0) > 0) return
  const jc = f.jumpCount
  if (flightTakeoff(f)) {
    f.jumpCount = jc                                                               // flight never refills jumps
    s.capY = (s.apexY ?? f.y) - GF_FLIGHT_CAP
  }
}

// ── DREAD → TERROR ────────────────────────────────────────────────────────────────────────────────────────
function tickDread(f, s, opp) {
  const d = s.dread
  if (d.pips > 0 && d.terrorT <= 0 && --d.pipT <= 0) d.pips = 0                   // pips expire 240f after the last
  if (d.immune > 0) d.immune--
  if (d.terrorT > 0) {
    if (!opp || opp.eliminated || (opp.health || 0) <= 0) { d.terrorT = 0; d.immune = GF_DREAD.IMMUNE; return }
    opp._benTerrorT = 2                                                             // movement lease (physics reads it; lapses on its own)
    if (--d.terrorT <= 0) d.immune = GF_DREAD.IMMUNE
  }
}
// one pip per CAST (however many ticks hit), Possess adds 2; no pips while Terror runs (no refresh) or during immunity
export function addDread(f, s, castId, n = 1) {
  const d = s.dread
  if (castId == null || castId === d.lastCast) return false
  if (d.terrorT > 0) return false
  d.lastCast = castId
  d.pips = Math.min(GF_DREAD.MAX, d.pips + n); d.pipT = GF_DREAD.EXPIRE
  if (d.pips >= GF_DREAD.MAX && d.immune <= 0) startTerror(f, s)
  return true
}
function startTerror(f, s) {
  const d = s.dread
  if (d.terrorT > 0 || d.immune > 0) return false
  d.pips = 0; d.pipT = 0; d.terrorT = GF_DREAD.TERROR; d.terrors++
  if (!f._benSfx) f._benSfx = "gf_terror"
  return true
}

// ── casts ────────────────────────────────────────────────────────────────────────────────────────────────
function busy(f, s) { return !!(s.possess || s.ult || s.grab) }
function beginCast(f, s, api, pose, cost, total, { commit = true, fromPhase = false } = {}) {
  if (!f.transformed || f.activeAlien !== "ghostfreak" || f.attacking || (f.attackCooldown || 0) > 0 ||
      (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || busy(f, s)) return false
  if (s.ph === "materialize" || s.ph === "entering") return false
  if (s.ph === "intangible" && !fromPhase) return false
  if (!api.spendEnergy(f, cost)) return false
  if (s.ph === "intangible") exitPhase(f, s, "cast")                               // Wail / Possess leave Phase for the cast
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++
  return true
}

// the WIND tag (damageTypes metadata; spawnProjectile does not copy damageType from the move data)
const wind = p => { if (p) p.damageType = "wind"; return p }
// ↓↘→ + P Spectral Gale (air: Cold Touch) · ↓↙← + P Wail · →→ + P Possess · ←↙↓ + P Phantom Rise
// The motions are READ frame by frame (tickInputs: numpad history relative to the opponent, 18f window; →→ = a 14f double
// tap). With no motion in the buffer (pad / harness `_specialHeldDir`) the held direction maps as before:
// → Possess, ↓ Wail, ← Phantom Rise, neutral / ↑ Spectral Gale (air: Cold Touch).
export const GF_DASH_WINDOW = 14, GF_MOTION_WINDOW = 18
const GF_MOTIONS = [["412", "rise"], ["214", "wail"], ["236", "gale"]]
const gfNumpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  return (input.down ? 0 : (input.up || input.jump) ? 6 : 3) + (fwd ? 3 : back ? 1 : 2)
}
function tickInputs(f, s, input, opp) {
  if (!s.hist) { s.hist = []; s.lastDir = 5; s.fwdPrev = false; s.fwdTapT = -999; s.dashTapT = -999 }
  const ox = opp && !opp.eliminated ? (opp.x + (opp.w || 60) / 2) - (f.x + (f.w || 60) / 2) : 0
  const face = ox > 0 ? 1 : ox < 0 ? -1 : (f.facing || 1)
  const fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= GF_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = gfNumpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
export function gfReadMotion(s) {
  if (!s.hist) return null
  const recent = s.hist.filter(e => s.t - e.t <= GF_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of GF_MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  if (best) return best.kind
  return s.t - (s.dashTapT ?? -999) <= GF_DASH_WINDOW ? "possess" : null
}
export function gfPickSpecial(f, s) {
  const m = gfReadMotion(s); if (m) return m
  const dir = f._specialHeldDir || null
  return dir === "F" ? "possess" : dir === "D" ? "wail" : dir === "B" ? "rise" : "gale"
}
function fireSpecial(f, ctx, api) {
  const s = gfState(f); if (!s) return false
  const face = f.facing || 1
  const grounded = !!(f.onGround || f.grounded)
  const kind = gfPickSpecial(f, s)
  if (s.ph === "intangible" && kind !== "possess" && kind !== "wail") return false  // phased: only Possess / Wail
  if (kind === "possess") return castPossess(f, s, api, face)
  if (kind === "wail") return castWail(f, s, api)
  if (kind === "rise") return castRise(f, s, api, face, grounded)
  if (!grounded) return castCold(f, s, api, face)
  return castGale(f, s, api, face)
}

function castGale(f, s, api, face) {
  if (s.gale) return false                                                          // one on screen
  if (!beginCast(f, s, api, "gfGale", GF_COST.gale, GF_GALE.TOTAL)) return false
  const cast = s.castId
  s.gale = { cast, t: -GF_GALE.STARTUP, x: f.x + f.w / 2 + face * 40, y: f.y + f.h * 0.45, face, dist: 0, push: 0, ticks: 0, grip: null }
  f._benSfx = "gf_gale"
  return true
}
function tickGale(f, s, opp, ctx, api) {
  const g = s.gale; if (!g) return
  g.t++
  if (g.t <= 0) return
  const over = !!opp && !opp.eliminated && Math.abs((opp.x + opp.w / 2) - g.x) <= GF_GALE.W / 2 + opp.w / 2 &&
    Math.abs((opp.y + opp.h / 2) - g.y) <= GF_GALE.H / 2 + opp.h / 2
  if (g.grip == null) {                                                             // travelling: 10 px/f until it reaches the opponent
    if (over) g.grip = 0
    else { g.x += g.face * GF_GALE.SPEED; g.dist += GF_GALE.SPEED; if (g.dist >= GF_GALE.RANGE) { s.gale = null; return } }
  }
  if (g.grip == null) return
  // caught: the swirl holds on them — pushes 6 px/f while they are inside it, bounded to 8f per cast (no chain-lock;
  // stage-clamped), and ticks every 8f: 4 × 10, the final tick adds Dread
  if (over && g.push < GF_GALE.PUSH_MAX) {
    g.push++
    const L = ctx?.stageLeft ?? 0, R = (ctx?.stageWidth ?? 1e9) - (opp.w || 60)
    const nx = Math.max(L, Math.min(R, opp.x + g.face * GF_GALE.PUSH))
    g.x += nx - opp.x; opp.x = nx
  }
  const tick = GF_GALE.TICKS.indexOf(g.grip)
  if (tick >= 0) {
    g.ticks++
    const final = tick === GF_GALE.TICKS.length - 1
    wind(api.spawnProjectile(f, "gf_gale_" + tick, { damage: GF_GALE.DMG, speed: 0, vx: 0, vy: 0, spawnX: g.x, spawnY: g.y,
      w: GF_GALE.W, h: GF_GALE.H, rectHitbox: true, lifetime: 2, isSpecial: true,
      noHitstop: !final, hitstun: final ? 24 : 14, blockstun: final ? 14 : 10, knockbackX: final ? 6 : 0, knockbackY: final ? -3 : 0,
      alien: { gf: true, kind: "gale", cast: g.cast, tick, final } }, {}))
  }
  g.grip++
  if (g.grip > GF_GALE.TICKS[GF_GALE.TICKS.length - 1] + 6) s.gale = null
}

function castWail(f, s, api) {
  if (!beginCast(f, s, api, "gfWail", GF_COST.wail, GF_WAIL.TOTAL, { fromPhase: true })) return false
  const cast = s.castId
  s.wail = { cast, t: 0 }
  f._benSfx = "gf_wail"
  api.scheduleBenSpawn(f, GF_WAIL.STARTUP, () => {
    wind(api.spawnProjectile(f, "gf_wail", { damage: GF_WAIL.DMG, speed: 0, vx: 0, vy: 0, spawnX: f.x + f.w / 2, spawnY: f.y + f.h / 2,
      radius: GF_WAIL.RADIUS, radial: true, lifetime: 3, isSpecial: true, damageType: "wind", hitstun: 24,
      blockstun: GF_WAIL.TOTAL - GF_WAIL.STARTUP + GF_WAIL.ON_BLOCK, knockbackX: 9, knockbackY: -4,
      alien: { gf: true, kind: "wail", cast } }, {}))
    api.shake?.(4, 8)
  })
  return true
}
function tickWail(f, s) { const w = s.wail; if (w && ++w.t > GF_WAIL.TOTAL) s.wail = null }

function castPossess(f, s, api, face) {
  const phased = s.ph === "intangible"
  const startup = phased ? GF_POSSESS.STARTUP_PHASED : GF_POSSESS.STARTUP
  const ambushFromPhase = phased
  if (!beginCast(f, s, api, "gfPossess", GF_COST.possess, startup + GF_POSSESS.WHIFF, { fromPhase: true })) return false
  const cast = s.castId
  s.possess = null
  s.grab = { cast, t: 0, startup, phased, face }
  f._benSfx = "gf_possess"
  api.scheduleBenSpawn(f, startup, () => tryPossess(f, api, cast, ambushFromPhase))
  return true
}
// the engine's grab rules (combat.resolveGrab): both grounded, the grabber not in a combo (POSSESS is exempt: the brief
// makes it a combo ender — route 3 Wail, Heavy, Possess), target in range, target not invulnerable; a target that is NOT in hit/blockstun and has a grab press buffered TECHS it (both pushed apart).
export function grabCheck(f, opp, range, { comboEnder = false } = {}) {
  if (!opp || opp.eliminated || (opp.health || 0) <= 0) return "whiff"
  if ((opp.invulnTimer || 0) > 0 || opp.isGrabbed) return "whiff"
  if (!(f.onGround || f.grounded) || !(opp.onGround || opp.grounded)) return "whiff"
  if ((f.hitstun || 0) > 0) return "whiff"
  if (!comboEnder && (f.comboCounter || 0) > 0) return "whiff"                    // the ult opener keeps the engine's no-throw-in-combo rule
  if (Math.abs((f.x + f.w / 2) - (opp.x + opp.w / 2)) > range) return "whiff"
  const canTech = !((opp.hitstun || 0) > 0 || (opp.blockstun || 0) > 0)
  if (canTech && (opp.grabInputBuffer || 0) > 0) return "tech"
  return "hit"
}
function techPush(f, opp) {
  f.attackCooldown = GF_POSSESS.TECH_CD; opp.attackCooldown = GF_POSSESS.TECH_CD
  f.vx = -(f.facing || 1) * 3; opp.vx = (f.facing || 1) * 3
}
function tryPossess(f, api, cast, ambush) {
  const s = gfState(f); if (!s || !s.grab || s.grab.cast !== cast) return
  s.grab = null
  const opp = api.getOpponent(f)
  const r = grabCheck(f, opp, GF_POSSESS.RANGE, { comboEnder: true })
  if (r === "tech") { techPush(f, opp); s.stats.techs++; return }
  if (r !== "hit") return                                                          // whiff: the 28f recovery plays out
  s.possess = { cast, t: 0, raw: 0, face: f.facing || 1, tx: opp.x, ty: opp.y, ambush: !!ambush || ambushLive(s) }
  if (s.possess.ambush) { s.amb.used = true; s.amb.hits++; s.stats.ambush++ }
  s.stats.possessed++
  addDread(f, s, cast, 2)                                                           // +2 Dread (capped at 3)
  f.attackCooldown = GF_POSSESS.HOLD + 8; f._benPowerCommit = GF_POSSESS.HOLD + 8; f._spriteCastTimer = 0
  f.invulnTimer = Math.max(f.invulnTimer || 0, GF_POSSESS.HOLD + 2)
  holdPossessed(f, s, opp)
}
function holdPossessed(f, s, opp) {
  const p = s.possess
  opp.hitstun = Math.max(opp.hitstun || 0, 2); opp.isBlocking = false               // cannot act or block
  opp.vx = 0; opp.vy = 0; opp.x = p.tx; opp.y = p.ty; opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = opp.x + opp.w / 2 - f.w / 2                              // he is INSIDE them
}
function tickPossess(f, s, opp, api) {
  if (s.grab) { s.grab.t++; if (s.grab.phased && s.grab.t <= s.grab.startup) f._benLunge = null }
  const p = s.possess; if (!p) return
  if (!opp || opp.eliminated || (opp.health || 0) <= 0) { endPossess(f, s, opp, api); return }
  p.t++
  holdPossessed(f, s, opp)
  if (GF_POSSESS.TICKS.includes(p.t)) {                                             // three drain ticks of 15
    api.applyScaledDamage(opp, GF_POSSESS.DMG, { attacker: f, move: "possess", source: "ability" }); p.raw += GF_POSSESS.DMG
    opp.colorFlash = 6; api.shake?.(2, 3)
  }
  if (p.t >= GF_POSSESS.HOLD) endPossess(f, s, opp, api)
}
function endPossess(f, s, opp, api) {
  const p = s.possess; s.possess = null
  f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + GF_POSSESS.POWER)       // +15 Power
  if (opp && !opp.eliminated) {                                                     // bursts out: push-away
    opp.hitstun = Math.max(opp.hitstun || 0, 18); opp.vx = (p?.face || 1) * 9; opp.vy = -4
    f.x = opp.x + opp.w / 2 - f.w / 2 - (p?.face || 1) * 70
  }
  f.attackCooldown = 12; f._benPowerCommit = 12
  f._spriteCastMove = "gfBurst"; f._spriteCastTimer = 12
  s.burst = { t: 0 }
}

function castRise(f, s, api, face, grounded) {
  if (s.riseUsed) return false                                                      // once per airtime
  if (!beginCast(f, s, api, "gfRise", GF_COST.rise, GF_RISE.TOTAL, { commit: false })) return false
  const cast = s.castId, jc = f.jumpCount
  s.riseUsed = true
  s.rise = { cast, t: 0, face, jc }
  f._benSfx = "gf_rise"
  api.scheduleBenSpawn(f, GF_RISE.HIT_AT, () => {
    wind(api.spawnProjectile(f, "gf_rise", { damage: GF_RISE.DMG, speed: 0, vx: 0, vy: 0, spawnX: f.x + f.w / 2 + face * 20, spawnY: f.y + f.h * 0.3,
      w: 90, h: 140, rectHitbox: true, lifetime: 4, isSpecial: true, damageType: "wind", hitstun: 26,
      blockstun: GF_RISE.TOTAL - GF_RISE.HIT_AT + GF_RISE.ON_BLOCK, knockbackX: 3, knockbackY: -14, launcher: true,
      alien: { gf: true, kind: "rise", cast } }, {}))
  })
  return true
}
function tickRise(f, s) {
  const r = s.rise; if (!r) return
  r.t++
  if ((f.hitstun || 0) > 0) { s.rise = null; return }
  if (r.t >= GF_RISE.STARTUP && r.t <= GF_RISE.IFRAMES[1]) { f.vy = GF_RISE.RISE_VY * (1 - (r.t - GF_RISE.STARTUP) / 10); f.onGround = false }
  f.jumpCount = Math.max(f.jumpCount || 0, r.jc)                                    // no jump refill
  if (r.t >= GF_RISE.TOTAL) s.rise = null
}

function castCold(f, s, api, face) {
  if (s.coldUsed) return false                                                      // once per airtime
  if (!beginCast(f, s, api, "gfCold", GF_COST.cold, GF_COLD.TOTAL, { commit: false })) return false
  const cast = s.castId
  s.coldUsed = true
  s.cold = { cast, t: 0, jc: f.jumpCount }
  f._benSfx = "gf_cold"
  api.scheduleBenSpawn(f, GF_COLD.STARTUP, () => {
    wind(api.spawnProjectile(f, "gf_cold", { damage: GF_COLD.DMG, speed: 0, vx: 0, vy: 0, spawnX: f.x + f.w / 2 + face * 40, spawnY: f.y + f.h * 0.8,
      w: 90, h: 80, rectHitbox: true, lifetime: 4, isSpecial: true, damageType: "wind", hitstun: 22, blockstun: 12,
      knockbackX: 3, knockbackY: 6, alien: { gf: true, kind: "cold", cast } }, {}))
  })
  return true
}
function tickCold(f, s) {
  const c = s.cold; if (!c) return
  c.t++
  if (c.t >= GF_COLD.STARTUP && !(f.onGround || f.grounded)) f.vy = Math.max(f.vy || 0, GF_COLD.DIVE_VY)
  f.jumpCount = Math.max(f.jumpCount || 0, c.jc)                                    // no jump refill
  if (c.t >= GF_COLD.TOTAL || (f.hitstun || 0) > 0 || (c.t > GF_COLD.STARTUP && (f.onGround || f.grounded))) s.cold = null   // ends on landing
}

// Combat calls this after a contact this form OWNS lands (melee or projectile, blocked or clean).
function onContact(f, target, { proj = null, move = null, blocked = false } = {}) {
  const s = gfState(f); if (!s || !proj || proj.visualOnly || blocked) return
  const a = proj.alien; if (!a || !a.gf) return
  if (a.kind === "wail") addDread(f, s, a.cast, 1)
  if (a.kind === "gale" && a.final) addDread(f, s, a.cast, 1)                       // final tick only
}

// ── ultimate: FEAR FEAST (same input as Omnitrix Overload, tangible only) ───────────────────────────────────
function fireUltimate(f, ctx, api) {
  const s = gfState(f); if (!s || s.ph !== "tangible" || s.possess || s.ult) return false
  if (!beginCast(f, s, api, "gfPossess", GF_COST.ultimate, GF_ULT.STARTUP + GF_ULT.WHIFF_RECOVERY)) return false
  s.ult = { phase: "opener", t: 0, face: f.facing || 1, raw: 0, cast: s.castId }
  f._benSfx = "gf_ult"
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  const cast = s.castId
  api.scheduleBenSpawn(f, GF_ULT.STARTUP, () => {
    const st = gfState(f); if (!st || !st.ult || st.ult.cast !== cast) return
    const opp = api.getOpponent(f)
    const r = grabCheck(f, opp, GF_ULT.RANGE)
    if (r !== "hit") { if (r === "tech") techPush(f, opp); return }                 // whiff / tech: no cinematic, 60f recovery
    api.applyScaledDamage(opp, GF_ULT.OPENER, { attacker: f, move: "fearFeast", source: "ability" })
    startUltCinematic(f, st, opp)
  })
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "dissolve"; u.t = 0; u.raw = GF_ULT.OPENER
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = GF_ULT.END + GF_ULT.LOCKOUT; f._benPowerCommit = GF_ULT.END; f._spriteCastMove = "gfUltDissolve"; f._spriteCastTimer = 16
  f.invulnTimer = Math.max(f.invulnTimer || 0, GF_ULT.END + 2)
}
function tickUlt(f, s, opp, api) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > GF_ULT.STARTUP + 4) s.ult = null; return }   // whiffed → no cinematic
  if (!opp || opp.eliminated) { endUlt(f, s, null, api); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.isBlocking = false; opp.vx = 0; opp.vy = 0
  opp.x = u.thome.x; opp.y = u.thome.y; opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0
  const hit = (dmg) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "fearFeast", source: "ability" }); u.raw += dmg; opp.colorFlash = 6 }
  if (u.t < 16) { u.phase = "dissolve"; f._spriteCastMove = "gfUltDissolve"; f._spriteCastTimer = 2 }
  else if (u.t < 44) { u.phase = "tremor"; f.x = opp.x + opp.w / 2 - f.w / 2 }
  else if (u.t < GF_ULT.SCREAM_AT - 4) { u.phase = "storm"; f._spriteCastMove = "gfUltStorm"; f._spriteCastTimer = 2 }
  else { u.phase = "scream"; f._spriteCastMove = "gfUltScream"; f._spriteCastTimer = 2; f.x = opp.x + opp.w / 2 - f.w / 2 - u.face * 90 }
  if (GF_ULT.TREMOR_AT.includes(u.t)) { hit(GF_ULT.TREMOR); api.shake?.(4, 5) }       // 2. possession tremor: 3 × 25
  if (GF_ULT.STORM_AT.includes(u.t)) { hit(GF_ULT.STORM); api.shake?.(3, 4) }         // 3. spectral storm: 3 × 20
  if (u.t === GF_ULT.SCREAM_AT) { hit(GF_ULT.SCREAM); api.shake?.(12, 14) }           // 4. final scream: 65
  if (u.t >= GF_ULT.END) endUlt(f, s, opp, api)
}
function endUlt(f, s, opp, api) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }               // positions restore
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = (u.face || 1) * 10; opp.vy = -8 }
  if (opp && !opp.eliminated) startTerror(f, s)                                      // Terror at the end unless on cooldown
  if (!s.healed && u && u.raw > 0) {                                                // +15 to the shared pool, once, capped at the max
    s.healed = true
    f.health = Math.min(f.maxHealth || f.health, (f.health || 0) + GF_ULT.HEAL)
  }
  s.lastUltRaw = u?.raw || 0
  s.ult = null
  f.attackCooldown = GF_ULT.LOCKOUT; f._benPowerCommit = GF_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────────
const _imgs = {}
function sheetImg(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  return _imgs[src].complete && _imgs[src].naturalWidth ? _imgs[src] : null
}
const _h = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
// Phase badge (green Tangible / grey Intangible / red lockout) + Phase timer + DREAD pips / TERROR under the Power bar.
export function drawGhostfreakHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = gfState(f); if (!ctx || !s) return
  const y = enY + enH + 3, h = 5
  const lock = s.phCd > 0 && s.ph === "tangible", key = s.ph === "intangible" || s.ph === "entering" ? "intangible" : (lock || s.ph === "materialize") ? "lockout" : "tangible"
  const ic = GHOSTFREAK_ICONS[key], img = ic && sheetImg(ic.sheet), isz = 14
  ctx.save(); ctx.imageSmoothingEnabled = false
  const bx = flip ? x + 8 + pbw - isz : x + 8
  if (img) ctx.drawImage(img, bx, y - 2, isz, isz)
  const gx = flip ? x + 8 : x + 8 + isz + 4, gw = pbw - isz - 4
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(gx, y + 2, gw, h)
  const frac = s.ph === "intangible" ? 1 - s.phT / GF_PHASE.MAX : lock ? 1 - s.phCd / (s.forced && s.phCd > GF_PHASE.CD_MANUAL ? GF_PHASE.CD_FORCED : GF_PHASE.CD_MANUAL) : 1
  const w = gw * Math.max(0, Math.min(1, frac))
  ctx.fillStyle = key === "intangible" ? "#d6d3d1" : key === "lockout" ? "#dc2626" : "#84cc16"
  ctx.fillRect(flip ? gx + gw - w : gx, y + 2, w, h)
  const d = s.dread, pips = d.terrorT > 0 ? "TERROR" : "●".repeat(d.pips) + "○".repeat(GF_DREAD.MAX - d.pips)
  const label = `${key === "intangible" ? "INTANGIBLE" : key === "lockout" ? "MATERIALIZE" : "TANGIBLE"}${ambushLive(s) ? " · AMBUSH" : ""}   DREAD ${pips}`
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = d.terrorT > 0 ? "#e9d5ff" : "#e7e5e4"; ctx.fillText(label, flip ? x + 8 + pbw : x + 8, y + h + 4)
  ctx.restore()
}
function ghost(c, a, fi, cx, cy, face, alpha, scale = 1) {
  const img = sheetImg(a.sheet); if (!img) return
  const sc = a.actionScale * 2 * scale, fw = a.width, fh = a.height
  c.save(); c.globalAlpha = alpha; c.translate(Math.round(cx), Math.round(cy)); if (face < 0) c.scale(-1, 1)
  c.drawImage(img, (fi % a.frames) * fw, 0, fw, fh, -fw * sc / 2, -fh * sc / 2, fw * sc, fh * sc)
  c.restore()
}
function rings(c, x, y, r0, n, color, alpha, lw = 4) {
  c.strokeStyle = color; c.lineWidth = lw
  for (let k = 0; k < n; k++) {
    const r = r0 * (0.55 + 0.45 * k / Math.max(1, n - 1))
    c.globalAlpha = alpha * (1 - k / (n + 1))
    // pixel-style ring: 24 square dashes
    for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; c.fillStyle = color; c.fillRect(Math.round(x + Math.cos(t) * r) - lw / 2, Math.round(y + Math.sin(t) * r * 0.75) - lw / 2, lw, lw) }
  }
}
function windSwipe(c, x, y, face, len, alpha) {
  c.globalAlpha = alpha; c.fillStyle = "#f5f5f4"
  for (let i = 0; i < 3; i++) { const yy = y - 10 + i * 10, l = len * (1 - i * 0.2); for (let k = 0; k < l; k += 6) c.fillRect(Math.round(x + face * k), Math.round(yy + Math.sin(k / 14) * 3), 4, 2) }
}
export function drawGhostfreakFx(c, f, frame = 0, opp = null) {
  const s = gfState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const cx = f.x + f.w / 2, cy = f.y + f.h * 0.4, face = f.facing || 1
  // normals: procedural wind swipes (short Jab, extended Heavy, low, upward gale, forward air) + extracted arrow FX
  const mv = f.currentMove || f.currentAttack?.name
  if (f.attacking && mv) {
    const arrowL = GHOSTFREAK_FX.windArrowL, arrowS = GHOSTFREAK_FX.windArrowS
    const pick = mv === "heavy" ? arrowL : arrowS, img = sheetImg(pick.sheet)
    if (mv === "up") { c.globalAlpha = 0.85; c.fillStyle = "#f5f5f4"; for (let i = 0; i < 4; i++) c.fillRect(Math.round(cx + face * 20 + Math.sin((frame + i * 9) / 4) * 10), Math.round(f.y - 10 - i * 18), 4, 12) }
    else {
      const len = mv === "heavy" ? 150 : mv === "down" ? 70 : 60, yy = mv === "down" ? f.y + f.h * 0.8 : cy
      windSwipe(c, cx + face * 30, yy, face, len, 0.8)
      if (img) { c.globalAlpha = 0.9; c.save(); c.translate(Math.round(cx + face * (mv === "heavy" ? 110 : 60)), Math.round(yy - pick.h)); if (face < 0) c.scale(-1, 1); c.drawImage(img, 0, 0, pick.w, pick.h, -pick.w, 0, pick.w * 2, pick.h * 2); c.restore() }
    }
  }
  // Spectral Gale: the extracted 4-frame swirl loop at the gale's sim position
  if (s.gale && s.gale.t > 0) {
    const a = GHOSTFREAK_FX.gale, img = sheetImg(a.sheet)
    if (img) { const fi = (s.gale.t >> 2) % a.frames; c.globalAlpha = 0.95; c.save(); c.translate(Math.round(s.gale.x), Math.round(s.gale.y)); if (s.gale.face < 0) c.scale(-1, 1); c.drawImage(img, fi * a.w, 0, a.w, a.h, -a.w, -a.h, a.w * 2, a.h * 2); c.restore() }
  }
  // Wail: expanding procedural pixel rings
  if (s.wail && s.wail.t >= GF_WAIL.STARTUP - 4) { const k = Math.min(1, (s.wail.t - GF_WAIL.STARTUP + 4) / 14); rings(c, cx, cy, GF_WAIL.RADIUS * k, 3, "#f5f5f4", 0.85 * (1 - Math.max(0, k - 0.8) * 4)) }
  // Phantom Rise: spiralling upward gale · Cold Touch: downward gale
  if (s.rise) { c.fillStyle = "#f5f5f4"; for (let i = 0; i < 10; i++) { const t = (s.rise.t + i * 3) / 4; c.globalAlpha = 0.7; c.fillRect(Math.round(cx + Math.cos(t) * 30), Math.round(f.y + f.h - i * 16), 4, 4) } }
  if (s.cold) { c.fillStyle = "#e0f2fe"; for (let i = 0; i < 6; i++) { c.globalAlpha = 0.8; c.fillRect(Math.round(cx + face * (30 + i * 6)), Math.round(f.y + f.h * 0.6 + i * 10), 4, 8) } }
  const ox = opp?._lastDrawX ?? (opp ? opp.x : null), oy = opp?._lastDrawY ?? (opp ? opp.y : null)
  const ow = opp?._lastDrawW ?? opp?.w, oh = opp?._lastDrawH ?? opp?.h
  // Possess: shaking overlay with a translucent Ghostfreak inside the target · Fear Feast tremor the same
  if ((s.possess || (s.ult && s.ult.phase === "tremor")) && ox != null) {
    const sx = (_h(frame, 1, 3) - 0.5) * 6, sy = (_h(frame, 2, 5) - 0.5) * 4
    c.globalAlpha = 0.25; c.fillStyle = "#a3e635"; c.fillRect(ox + sx, oy + sy, ow, oh)
    ghost(c, ANIM.idle, frame >> 3, ox + ow / 2 + sx, oy + oh / 2 + sy, face, 0.45)
  }
  if (s.burst && s.burst.t != null && f._spriteCastMove === "gfBurst") { c.fillStyle = "#d9f99d"; for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2, r = 20 + (12 - (f._spriteCastTimer || 0)) * 6; c.globalAlpha = 0.8; c.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), 4, 4) } }
  // Terror: shaking pale tint over the opponent
  if (s.dread.terrorT > 0 && ox != null) { const sx = (_h(frame, 7, 1) - 0.5) * 4; c.globalAlpha = 0.28; c.fillStyle = "#e9d5ff"; c.fillRect(ox + sx, oy, ow, oh) }
  // Fear Feast: ectoplasm dissolve, the spectral storm (Fly frames + integer-scaled gale FX) and the final scream rings
  if (s.ult && s.ult.phase !== "opener" && ox != null) {
    const tx = ox + ow / 2, ty = oy + oh / 2, u = s.ult
    if (u.phase === "dissolve") { c.fillStyle = "#a3e635"; for (let i = 0; i < 16; i++) { c.globalAlpha = 0.7; c.fillRect(Math.round(tx + (_h(u.cast, i, 1) - 0.5) * 120 * (1 - u.t / 16)), Math.round(ty + (_h(u.cast, i, 2) - 0.5) * 120 * (1 - u.t / 16)), 4, 4) } }
    if (u.phase === "storm") {
      const a = GHOSTFREAK_FX.gale, img = sheetImg(a.sheet)
      for (let i = 0; i < 3; i++) {
        const ang = u.t * 0.22 + i * 2.09, px = tx + Math.cos(ang) * 110, py = ty + Math.sin(ang) * 60
        ghost(c, ANIM.gfFly, (u.t >> 1) + i, px, py, Math.cos(ang) < 0 ? 1 : -1, 0.9)
        if (img) { c.globalAlpha = 0.85; c.drawImage(img, ((u.t >> 2) + i) % a.frames * a.w, 0, a.w, a.h, Math.round(px - a.w), Math.round(py - a.h), a.w * 2, a.h * 2) }
      }
    }
    if (u.phase === "scream") { const k = Math.min(1, (u.t - GF_ULT.SCREAM_AT + 4) / 12); rings(c, tx, ty, 240 * k, 4, "#f5f5f4", 0.9, 6) }
  }
  c.restore()
}
// FEAR FEAST: the stage darkens (world-space wash UNDER both fighters, so both stay readable)
export function drawGhostfreakUnder(c, f) {
  const s = gfState(f); if (!c || !s || !s.ult || s.ult.phase === "opener") return
  const t = s.ult.t, a = Math.min(1, t / 6) * Math.min(1, (GF_ULT.END - t) / 6)
  c.save(); c.globalAlpha = 0.62 * Math.max(0, a); c.fillStyle = "#0b0614"; c.fillRect(-4000, -4000, 16000, 12000); c.restore()
}
