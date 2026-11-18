// jetray.js — JETRAY (Aerophibian), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// ALL simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE): flight bookkeeping, Mach Time, the echo
// queue, casts, Neuro pips / Grounded, the ult. Simulation randomness = hash(match seed, frame, player index) only. Render-only
// effects (beam glow, bolts' glow, warp trail, afterimages, sonic rings, the ult's starfield / planets, shake) READ that state.
import { JETRAY_ANIM, JETRAY_EYES, JETRAY_GEOM } from "./jetrayAssets.js"
import { flightTakeoff, isFlying, FLIGHT_PHASE, flightKnockedDown } from "./flight.js"   // leaf module (Megawhatt / Ghostfreak / Alien X do the same)
export { JETRAY_ANIM, JETRAY_EYES, JETRAY_GEOM }

const ANIM = { ...JETRAY_ANIM, jrFly: JETRAY_ANIM.fly }

// ── tuning (pre-mod numbers from the brief) ─────────────────────────────────────────────────────────────────
export const JR_FLIGHT = { MAX: 240, CAP: 220, HOLD: 8 }
export const JR_MACH = { COST: 25, DURATION: 150, COOLDOWN: 600, FRAMES: 0.7, SPEED: 1.5, PROJ: 0.5, SWALLOW: 10 }
export const JR_ECHO = { DELAY: 10, FRAC: 0.30, MAX: 3 }
export const JR_BOOM = { R: 120, DMG: 25, LIFE: 2 }
export const JR_NEURO = { MAX: 3, EXPIRE: 240, GROUNDED: 150, IMMUNE: 360, AIR: 0.5 }
export const JR_COST = { eye: 10, tail: 12, dash: 12, dive: 12, ultimate: 55 }
export const JR_EYE = { STARTUP: 16, TICKS: [0, 6, 12], DMG: 15, RANGE: 480, ANGLE: 30, RECOVERY: 18, ON_BLOCK: -10, BEAM_LIFE: 16 }
export const JR_TAIL = { STARTUP: 14, ANGLES: [0, 20, 40], DMG: 10, RANGE: 380, SPEED: 19, RECOVERY: 16, ON_BLOCK: -8 }
export const JR_DASH = { STARTUP: 8, DIST: 380, FRAMES: 16, HITS_AT: [3, 12], DMG: [20, 28], RECOVERY: 18, ON_BLOCK: -12 }
export const JR_DIVE = { STARTUP: 4, VX: 9, VY: 13, DMG: 50, BOUNCE: -8, MAXF: 40, RECOVERY: 12 }
export const JR_ROLL = { TOTAL: 18, IFROM: 4, ITO: 10, CD: 300, DRIFT: 4, WINDOW: 14 }
export const JR_DASH_WINDOW = 14
// COSMIC DRAG — deliberately NOT a vertical grab-climb-slam (Superman's World of Cardboard / Homelander's Flight 37 both open
// with eye beams, climb straight up and slam down from above). Jetray's opener is a low TALON SWOOP; the ride is SIDEWAYS
// through hyperspace (the world streaks past horizontally); the damage comes from what he drags them THROUGH (asteroids, a moon,
// a ringed giant's rings); the finish is a SLINGSHOT around a sun that flings them back into the arena horizontally (skid +
// bounce), not a dive from orbit. 40 + 6×20 + 80 = 240 unscaled.
export const JR_ULT = { STARTUP: 8, SWOOP_F: 18, SWOOP_V: 14, OPENER: 40, WHIFF: 60, WARP: 24, IMPACT_AT: [40, 52, 64, 76, 88, 100],
  IMPACT: 20, SLING_AT: 112, CRASH_AT: 134, CRASH: 80, END: 150, LOCKOUT: 100, KD: 50, SKID: 14 }

const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 16, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const JETRAY = {
  id: "jetray", poolKey: "jetray", displayName: "Jetray", slot: 12,
  status: "ready", sheetPath: "./ben10_jetray_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/jetray/SPRITE_LEDGER.md",
  mods: { speed: 1.30, damage: 0.95, defense: 0.80, weight: 0.65 },
  movement: "flight", maxJumps: 2,                    // the shared double jump; flight never refills it
  flightProfile: "jetray",                            // flight.js FLIGHT_PROFILES.jetray (Mach Time swaps in jetray_mach)
  moves: { jab: "Wing Flick", heavy: "Wing Slash", low: "Low Glide", launcher: "Rising Sweep", air: "Air Slash",
    special1: "Eye Laser", special2: "Tail Volley", special3: "Wing Dash", special4: "Sonic Dive", defense: "Barrel Roll",
    mach: "Mach Time", ultimate: "Cosmic Drag" },
  basic_attacks: {
    light: normal(16, 5, 3, 10, 1, { rangeX: 110 }),                                    // glide frame + wing flick
    heavy: normal(50, 13, 4, 22, -6, { knockbackX: 7, rangeX: 170 }),                   // wing slash, 170 px
    down:  normal(22, 7, 3, 14, -3, { hitLevel: "low" }),                               // low glide, hits low
    up:    normal(42, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0 }),     // upright rising wing sweep
    air:   normal(26, 6, 4, 10, 2)                                                      // diving slash
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, blockSpecial, onContact, bodyOffset, targetOffset,
  drawHud: drawJetrayHud, drawFx: drawJetrayFx, drawUnder: drawJetrayUnder, drawBehind: drawJetrayBehind
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshJetrayState() {
  return { kind: "jetray", t: 0, castId: 0, noAttack: false, baseSpeed: null, baseDash: null,
    airborne: false, apexY: null, capY: null, jumpHeld: 0, flightUsed: 0, flights: 0,
    machT: 0, machCd: 0, machs: 0, swallow: 0,
    echoes: [], echoCount: 0, echoesFired: 0,
    neuro: { pips: 0, pipT: 0, lastPipCast: -1, groundT: 0, immune: 0, grounds: 0 },
    eye: null, tail: null, dash: null, dive: null, diveUsed: false, roll: null, rollCd: 0, boom: null,
    fwdPrev: false, fwdTapT: -999, dashTapT: -999, backPrev: false, backTapT0: -999, backTapT: -999, rollTapT: -999,
    lastIn: { up: false, down: false },
    ult: null, lastUltRaw: 0, lastUltLayout: null,
    stats: { eyes: 0, lastEyeAngle: null, tails: 0, dashes: 0, booms: 0, dives: 0, rolls: 0, ults: 0, pipsAdded: 0 } }
}
export const jrState = f => (f?.omnitrix?.formState?.kind === "jetray" && f.transformed && f.activeAlien === "jetray") ? f.omnitrix.formState : null
export const machActive = s => !!s && s.machT > 0
const fs = (s, n) => machActive(s) ? Math.max(1, Math.round(n * JR_MACH.FRAMES)) : n   // Mach Time frame compression

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshJetrayState()
  s.baseSpeed = f._benWalkSpeed; s.baseDash = f.dashSpeed
  f._alienFlightProfile = JETRAY.flightProfile; f._flightCtl = null   // cleared by clearBenFormState on swap / revert / KO
}
const cx = o => o.x + (o.w || 60) / 2
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function jrHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
let _api = null

// EYE ANCHOR (sheet data, JETRAY_EYES): the world point his eyes are at for a given animation frame, correct in both facings.
export function eyePoint(f, anim = "jrEye", frame = 0) {
  const tab = JETRAY_EYES[anim] || JETRAY_EYES.jrEye, e = tab[Math.min(frame, tab.length - 1)] || JETRAY_EYES.jrEye[0]
  const sc = JETRAY_GEOM.screenScale, face = f.facing || 1
  return { x: cx(f) + face * e[0] * sc, y: f.y + (f.h || 96) + e[1] * sc }
}

// ── per-frame tick ────────────────────────────────────────────────────────────────────────────────────────
function tick(f, input, ctx, api) {
  const s = jrState(f); if (!s) return
  _api = api; s.t++
  input = input || {}
  if (s.swallow > 0) s.swallow = input.special ? JR_MACH.SWALLOW : s.swallow - 1   // the Mach Time press must not ALSO cast
  const opp = api.getOpponent(f)
  const stage = { L: ctx?.stageLeft ?? -Infinity, R: ctx?.stageWidth ?? Infinity }
  const grounded = !!(f.onGround || f.grounded)
  if (grounded) s.diveUsed = false
  if (s.rollCd > 0) s.rollCd--
  s.lastIn = { up: !!input.up, down: !!input.down }
  tickTaps(f, s, input)
  tickMach(f, s, api)
  tickFlight(f, s, input, grounded)
  tickEchoes(f, s, opp, api)
  tickNeuro(f, s, opp)
  tickEye(f, s, opp, api)
  tickTail(f, s)
  tickDash(f, s, opp, api, stage)
  tickBoom(s)
  tickDive(f, s, api, grounded)
  tickRoll(f, s, stage)
  tickUlt(f, s, opp, api, ctx, stage)
  s.noAttack = busy(s)
}
const busy = s => !!(s.eye || s.tail || s.dash || s.dive || s.roll || s.ult)
// startMove hook: no normals while a special owns him; Barrel Roll (←← + Light) takes the Light press; Mach Time ×0.7 frames
function moveFrames(f, key, md) {
  const s = jrState(f); if (!s || !md) return md
  if (key === "light" && s.t - s.backTapT <= JR_ROLL.WINDOW && s.backTapT > s.rollTapT && castRoll(f, s)) return false
  if (busy(s)) return false
  if (!machActive(s)) return md
  return { ...md, startup: Math.max(1, Math.round((md.startup ?? 5) * JR_MACH.FRAMES)), recovery: Math.max(1, Math.round((md.recovery ?? 10) * JR_MACH.FRAMES)) }
}
function tickTaps(f, s, input) {   // →→ (Wing Dash) and ←← (Barrel Roll): two press edges within 14f, Down not held
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= JR_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  if (back && !s.backPrev && !input.down) { if (s.t - s.backTapT0 <= JR_ROLL.WINDOW) s.backTapT = s.t; s.backTapT0 = s.t }
  s.fwdPrev = fwd; s.backPrev = back
}

// ── FLIGHT (flight.js profile "jetray"): hold Jump in the air to fly. 240f per airtime, cruise 8.0, moderate drag,
// 8-direction steering (flight.js), no altitude past the jump apex + 220 px, knocked out of the sky (40f grounded) by a hit,
// never refills jumps. Mach Time swaps in "jetray_mach" (×1.5 speed). ────────────────────────────────────────────────
function tickFlight(f, s, input, grounded) {
  f._alienFlightProfile = machActive(s) ? "jetray_mach" : "jetray"
  const c = f._flightCtl, flying = !!c && isFlying(f)
  const jump = !!(input.jump || input.up)
  s.jumpHeld = jump ? s.jumpHeld + 1 : 0
  if (grounded) { s.airborne = false; s.apexY = null; s.capY = null; s.flightUsed = 0 }
  else { s.airborne = true; if (!flying) s.apexY = s.apexY == null ? f.y : Math.min(s.apexY, f.y) }
  if (flying) {
    s.flightUsed++
    if ((f.hitstun || 0) > 0) { flightKnockedDown(f); return }                    // hard hit → drop + 40f grounded lock
    if (!jump || s.flightUsed >= JR_FLIGHT.MAX || s.ult || s.dive || s.dash) { c.phase = FLIGHT_PHASE.GROUNDED; c.wantDescend = false; return }
    if (s.capY != null && f.y < s.capY) { f.y = s.capY; if ((f.vy || 0) < 0) f.vy = 0 }   // no altitude past apex + 220
    if (!f.attacking && !busy(s)) { f._spriteCastMove = "jrFly"; f._spriteCastTimer = 2 }
    return
  }
  if (grounded || !jump || s.jumpHeld < JR_FLIGHT.HOLD || s.flightUsed >= JR_FLIGHT.MAX || f.attacking || (f.hitstun || 0) > 0 || busy(s)) return
  const jc = f.jumpCount
  if (flightTakeoff(f)) {
    f.jumpCount = jc                                                               // flight never refills jumps
    s.capY = (s.apexY ?? f.y) - JR_FLIGHT.CAP; s.flights++
    if (!f._benSfx) f._benSfx = "jr_fly"
  }
}

// ── MACH TIME (Block + Special): 25 Power, 150f, then 600f cooldown. His side only (the opponent's clock / polling untouched).
function blockSpecial(f, ctx, api) {
  const s = jrState(f); if (!s) return false
  if (s.machT > 0 || s.machCd > 0 || (f.hitstun || 0) > 0 || s.ult) return false   // no refresh / no re-activate
  if (!(api || _api).spendEnergy(f, JR_MACH.COST)) return false
  s.machT = JR_MACH.DURATION; s.machs++
  s.swallow = JR_MACH.SWALLOW
  f.colorFlash = Math.max(f.colorFlash || 0, 8); if (!f._benSfx) f._benSfx = "jr_mach"
  f._spriteCastMove = "jrMach"; f._spriteCastTimer = 8
  return true
}
function tickMach(f, s, api) {
  if (s.machT > 0 && --s.machT === 0) s.machCd = JR_MACH.COOLDOWN
  else if (s.machCd > 0) s.machCd--
  const m = machActive(s)
  if (s.baseSpeed != null) { f._benWalkSpeed = s.baseSpeed * (m ? JR_MACH.SPEED : 1); f.dashSpeed = s.baseDash * (m ? JR_MACH.SPEED : 1) }
  // opponent-owned projectiles ×0.5: XLR8's 2-frame time-scale lease (expires by itself if he swaps out)
  if (m) for (const p of api.activeProjectiles()) if (p.owner && p.owner !== f && !p.visualOnly) { p.timeScale = JR_MACH.PROJ; p.timeScaleT = 2 }
}
// AFTERIMAGE ECHOES: 10f after a normal / special hit he lands in Mach Time, an echo laser tick at 30% of that hit's damage,
// only if the opponent is still in hitstun then; max 3 per combo; echoes never schedule echoes (they bypass onContact); combo
// scaling applies. No pips. Scheduled in GAME_STATE.
function tickEchoes(f, s, opp, api) {
  if (opp && (opp.hitstun || 0) <= 0 && !s.echoes.length) s.echoCount = 0          // combo over → fresh echo budget
  if (!s.echoes.length) return
  const due = s.echoes.filter(e => e.at <= s.t)
  s.echoes = s.echoes.filter(e => e.at > s.t)
  for (const e of due) {
    if (!opp || opp.eliminated || (opp.hitstun || 0) <= 0) continue               // dropped: no echo outside hitstun
    api.applyScaledDamage(opp, e.raw * api.getComboScale(f), { attacker: f, move: "echo", source: "ability" })
    s.echoesFired++; opp.colorFlash = Math.max(opp.colorFlash || 0, 4)
  }
}
function scheduleEcho(f, s, target, raw) {
  if (!machActive(s) || !(raw > 0) || s.echoCount >= JR_ECHO.MAX) return
  s.echoCount++
  s.echoes.push({ at: s.t + JR_ECHO.DELAY, raw: raw * JR_ECHO.FRAC, x: cx(target), y: target.y + (target.h || 110) / 2, fx: cx(f), fy: f.y + (f.h || 96) * 0.4 })
}

// ── NEUROSHOCK → GROUNDED (status on the OPPONENT, owned by this form's GAME_STATE) ───────────────────────────
// Clean hits from Eye Laser, Tail Volley (its first bolt) and Sonic Dive add ONE Neuro pip per cast, max 3; none from blocks,
// FX, boom rings or echoes. Pips expire 240f after the last. 3 pips → GROUNDED 150f: no double jump, no air dash, air drift
// halved — through the generic `_benGrounded` status physics.moveFighter honours (ADD_ALIEN.md). Their ground game and first
// jump are untouched; input polling and the clock are untouched. No refresh while active; 360f immunity after.
export function addPip(s, cast) {
  const v = s.neuro
  if (cast == null || cast === v.lastPipCast || v.groundT > 0 || v.immune > 0) return false
  v.lastPipCast = cast; s.stats.pipsAdded++
  v.pips = Math.min(JR_NEURO.MAX, v.pips + 1); v.pipT = JR_NEURO.EXPIRE
  if (v.pips >= JR_NEURO.MAX) { v.pips = 0; v.pipT = 0; v.groundT = JR_NEURO.GROUNDED; v.grounds++ }
  return true
}
function tickNeuro(f, s, opp) {
  const v = s.neuro
  if (v.pips > 0 && --v.pipT <= 0) { v.pips = 0; v.pipT = 0 }
  if (v.groundT > 0) {
    if (opp) opp._benGrounded = { ttl: 2, air: JR_NEURO.AIR }
    if (--v.groundT <= 0) { v.groundT = 0; v.immune = JR_NEURO.IMMUNE }
  } else if (v.immune > 0) v.immune--
}
export const grounded = s => !!s && s.neuro.groundT > 0

// ── SPECIALS (dispatch) ──────────────────────────────────────────────────────────────────────────────────
//   ↓↘→ + P  Eye Laser (↑ held = 30° up, ↘ held = 30° down)   ←↙↓ + P  Tail Volley   →→ + P  Wing Dash
//   air: ↓ + P Sonic Dive, ← + P Tail Volley (fans down-back), else Eye Laser
function pickSpecial(f, s) {
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (!(f.onGround || f.grounded)) return dir === "D" ? "dive" : dir === "B" ? "tail" : "eye"
  if (dir === "D") return "tail"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= JR_DASH_WINDOW) return "dash"
  if (dir === "B") return "tail"
  return "eye"
}
function fireSpecial(f, ctx, api) {
  const s = jrState(f); if (!s) return false
  _api = api
  if (s.swallow > 0) return false
  const kind = pickSpecial(f, s)
  if (kind === "eye") return castEye(f, s, api)
  if (kind === "tail") return castTail(f, s, api)
  if (kind === "dash") return castDash(f, s, api)
  if (kind === "dive") return castDive(f, s, api)
  return false
}
function canAct(f, s) {
  return f.transformed && f.activeAlien === "jetray" && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++
  return { cast: s.castId, total }
}
// lifetime ≥ 2: combat.updateProjectiles decrements + culls (≤ 0) BEFORE hits resolve, so a lifetime-1 box never connects in-game.
// Per-frame boxes (dive / ult swoop) replace their previous copy so only one is ever live (no double hit).
const hitbox = (f, api, name, face, md) => {
  const list = api.activeProjectiles?.()
  if (list && md.replace) for (let i = list.length - 1; i >= 0; i--) if (list[i].owner === f && list[i].name === name) list.splice(i, 1)
  return api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, ...md, replace: undefined }, {})
}
const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)

// 1. EYE LASER (↓↘→ + P, 10): a beam from the per-frame EYE ANCHOR (sheet data; mirrored for facing −1). Direction fixed at cast
//    by the held up / down: neutral horizontal, ↑ 30° up, ↘ 30° down. 16f startup, 3 ticks × 15 = 45 (6f apart), range 480 px,
//    bounded lifetime, one on screen, −10 on block, +1 Neuro. Grounded or airborne (the air cast freezes his drift).
//    Each tick tests the beam SEGMENT against the opponent's hurtbox and, on overlap, lands a small hitbox at the entry point.
function castEye(f, s, api) {
  if (s.eye) return false                                                          // one on screen
  const st = fs(s, JR_EYE.STARTUP), last = st + fs(s, JR_EYE.TICKS[2]), total = last + fs(s, JR_EYE.RECOVERY)
  const c = beginCast(f, s, api, "jrEye", JR_COST.eye, total); if (!c) return false
  const aim = s.lastIn.up || f._specialHeldDir === "U" ? -1 : (s.lastIn.down ? 1 : 0)
  const ang = aim * JR_EYE.ANGLE * Math.PI / 180
  s.eye = { t: 0, cast: c.cast, face: f.facing || 1, ang, aim, st, ticksAt: JR_EYE.TICKS.map(k => st + fs(s, k)), total, last, hits: 0, end: last + JR_EYE.BEAM_LIFE - 12 }
  s.stats.eyes++; s.stats.lastEyeAngle = ang
  f._benSfx = "jr_eye"
  if (!(f.onGround || f.grounded)) { f.vx = 0; f.vy = Math.min(f.vy || 0, 0) }
  return true
}
export function eyeBeam(f, s) {        // the beam segment (sim + render share it): origin = eye anchor, fixed angle, 480 px
  const e = s.eye, o = eyePoint(f, "jrEye", 0)
  return { x0: o.x, y0: o.y, x1: o.x + e.face * Math.cos(e.ang) * JR_EYE.RANGE, y1: o.y + Math.sin(e.ang) * JR_EYE.RANGE }
}
function segBox(b, box) {              // segment ∩ AABB → entry point or null (slab test)
  let t0 = 0, t1 = 1; const dx = b.x1 - b.x0, dy = b.y1 - b.y0
  for (const [p, q] of [[-dx, b.x0 - box.x], [dx, box.x + box.w - b.x0], [-dy, b.y0 - box.y], [dy, box.y + box.h - b.y0]]) {
    if (p === 0) { if (q < 0) return null; continue }
    const r = q / p; if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r } else { if (r < t0) return null; if (r < t1) t1 = r }
  }
  return { x: b.x0 + dx * t0, y: b.y0 + dy * t0, t: t0 }
}
function tickEye(f, s, opp, api) {
  const e = s.eye; if (!e) return
  if ((f.hitstun || 0) > 0 || ++e.t > e.end) { s.eye = null; return }
  if (e.t <= e.last + 2) { f._spriteCastMove = "jrEye"; f._spriteCastTimer = 2; if (!(f.onGround || f.grounded)) { f.vx = 0; f.vy = Math.min(f.vy || 0, 0.5) } }
  const k = e.ticksAt.indexOf(e.t); if (k < 0 || !opp || opp.eliminated) return
  const hit = segBox(eyeBeam(f, s), { x: opp.x, y: opp.y, w: opp.w || 60, h: opp.h || 110 })
  if (!hit) return
  const fin = k === e.ticksAt.length - 1
  hitbox(f, api, "jr_eye_" + k, e.face, { damage: JR_EYE.DMG, spawnX: hit.x + e.face * 8, spawnY: hit.y, w: 24, h: 24, radius: 12, lifetime: 2,
    beam: true, noHitstop: !fin, hitstun: fin ? 22 : 14, blockstun: fin ? blockstunFor(e.total - e.t, JR_EYE.ON_BLOCK) : 12,
    knockbackX: fin ? 4 : 0.5, knockbackY: 0, alien: { jr: true, kind: "eye", pip: true, cast: e.cast } })
}

// 2. TAIL VOLLEY (←↙↓ + P, 12): three tail-tip bolts fire BEHIND him (facing-relative), fanned 0° / 20° / 40° down-and-back,
//    10 each, one hit per target per bolt (30 total), 380 px, 14f startup, −8 on block, +1 Neuro (the first bolt that hits).
function castTail(f, s, api) {
  const st = fs(s, JR_TAIL.STARTUP), total = st + fs(s, JR_TAIL.RECOVERY)
  const c = beginCast(f, s, api, "jrTail", JR_COST.tail, total, { commit: !!(f.onGround || f.grounded) }); if (!c) return false
  const face = f.facing || 1, cast = c.cast
  s.tail = { t: 0, total, cast, face }; s.stats.tails++
  f._benSfx = "jr_tail"
  const life = Math.round(JR_TAIL.RANGE / JR_TAIL.SPEED)
  api.scheduleBenSpawn(f, st, () => JR_TAIL.ANGLES.forEach((deg, i) => {
    const a = deg * Math.PI / 180, tip = tailTip(f, face)
    api.spawnProjectile(f, "jr_tail_" + i, { damage: JR_TAIL.DMG, speed: 0, vx: -face * Math.cos(a) * JR_TAIL.SPEED, vy: Math.sin(a) * JR_TAIL.SPEED,
      spawnX: tip.x, spawnY: tip.y, w: 22, h: 14, radius: 9, lifetime: life, isSpecial: true, noHitstop: true, hitstun: 16,
      blockstun: blockstunFor(total - st, JR_TAIL.ON_BLOCK), knockbackX: -face * 2, knockbackY: -1,
      alien: { jr: true, kind: "tail", bolt: i, pip: true, cast } }, {})
  }))
  return true
}
export const tailTip = (f, face = f.facing || 1) => ({ x: cx(f) - face * ((f.w || 70) / 2 + 30), y: f.y + (f.h || 96) * 0.78 })
function tickTail(f, s) {
  const t = s.tail; if (!t) return
  if ((f.hitstun || 0) > 0 || ++t.t > t.total) { s.tail = null; return }
  f._spriteCastMove = "jrTail"; f._spriteCastTimer = 2
}

// 3. WING DASH (→→ + P, 12): a slashing dash in the warp-bubble frames — 380 px REAL travel, 2 hits 20 / 28, −12 on block, no
//    tracking (the opponent rides the slash only after first contact so both hits connect), no invulnerability. In Mach Time it
//    ends in a SONIC BOOM ring (r 120, 25, once per cast, no pip).
function castDash(f, s, api) {
  const st = fs(s, JR_DASH.STARTUP), fr = fs(s, JR_DASH.FRAMES), total = st + fr + fs(s, JR_DASH.RECOVERY)
  const c = beginCast(f, s, api, "jrDash", JR_COST.dash, total); if (!c) return false
  s.dash = { t: 0, cast: c.cast, face: f.facing || 1, st, fr, total, hitsAt: JR_DASH.HITS_AT.map(k => st + fs(s, k)), carry: false, mach: machActive(s), done: false }
  s.stats.dashes++; s.dashTapT = -999
  f._benSfx = "jr_dash"
  return true
}
function tickDash(f, s, opp, api, stage) {
  const d = s.dash; if (!d) return
  if ((f.hitstun || 0) > 0) { delete f._benGlide; s.dash = null; return }
  d.t++
  if (d.t > d.st + d.fr) {
    if (!d.done) {
      d.done = true; delete f._benGlide; f.vx = 0
      if (d.mach) { s.boom = { t: 0, x: cx(f), y: f.y + (f.h || 96) / 2, cast: d.cast }; s.stats.booms++
        hitbox(f, api, "jr_boom", d.face, { damage: JR_BOOM.DMG, spawnX: cx(f), spawnY: f.y + (f.h || 96) / 2, w: JR_BOOM.R * 2, h: JR_BOOM.R * 2,
          radius: JR_BOOM.R, lifetime: JR_BOOM.LIFE, hitstun: 18, blockstun: 10, knockbackX: 6, knockbackY: -4, alien: { jr: true, kind: "boom", cast: d.cast } })
        api.shake?.(6, 8) }
    }
    if (d.t >= d.total) s.dash = null
    return
  }
  if (d.t <= d.st) { f._spriteCastMove = "jrDash"; f._spriteCastTimer = 2; return }
  const v = JR_DASH.DIST / d.fr
  if (d.carry && opp && !opp.eliminated) { opp.x = Math.max(stage.L, Math.min(stage.R - (opp.w || 60), opp.x + d.face * v)); opp.vx = 0 }
  f._benGlide = { vx: d.face * v, vy: 0 }
  f._spriteCastMove = "jrDash"; f._spriteCastTimer = 2
  const k = d.hitsAt.indexOf(d.t); if (k < 0) return
  const fin = k === d.hitsAt.length - 1
  hitbox(f, api, "jr_dash_" + k, d.face, { damage: JR_DASH.DMG[k], spawnX: cx(f) + d.face * 30, spawnY: f.y + (f.h || 96) * 0.5, w: 120, h: 80,
    radius: 60, lifetime: fin ? 3 : 2, noHitstop: !fin, hitstun: fin ? 22 : 16, blockstun: fin ? blockstunFor(d.total - d.t, JR_DASH.ON_BLOCK) : 14,
    knockbackX: fin ? 7 : 0.5, knockbackY: fin ? -3 : 0, alien: { jr: true, kind: "dash", cast: d.cast } })
}
function tickBoom(s) { if (s.boom && ++s.boom.t > 18) s.boom = null }

// 4. SONIC DIVE (air ↓ + P, 12): a diagonal-down dive (the dive frame), 50, bounces him up on hit, once per airtime, no jump
//    refill, +1 Neuro.
function castDive(f, s, api) {
  if (s.diveUsed || s.dive) return false
  const jc = f.jumpCount
  const c = beginCast(f, s, api, "jrDive", JR_COST.dive, fs(s, JR_DIVE.STARTUP) + JR_DIVE.MAXF + JR_DIVE.RECOVERY, { commit: false }); if (!c) return false
  f.jumpCount = jc; s.diveUsed = true
  if (f._flightCtl) { f._flightCtl.phase = FLIGHT_PHASE.GROUNDED; f._flightCtl.wantDescend = false }
  s.dive = { t: 0, st: fs(s, JR_DIVE.STARTUP), face: f.facing || 1, cast: c.cast, hit: false, land: 0 }
  s.stats.dives++
  f._benSfx = "jr_dive"
  return true
}
function tickDive(f, s, api, grounded) {
  const d = s.dive; if (!d) return
  if (d.land > 0) { if (--d.land <= 0) s.dive = null; return }
  if ((f.hitstun || 0) > 0) { delete f._benGlide; s.dive = null; return }
  d.t++
  f._spriteCastMove = "jrDive"; f._spriteCastTimer = 2
  if (d.t <= d.st) { f.vx = 0; f.vy = 0; return }
  if (d.hit || (grounded && d.t > d.st + 1) || d.t > d.st + JR_DIVE.MAXF) {
    delete f._benGlide
    if (d.hit) { f.vy = JR_DIVE.BOUNCE; f.vx = -d.face * 3; s.dive = null; f.attackCooldown = Math.min(f.attackCooldown || 0, 10) }
    else { d.land = JR_DIVE.RECOVERY; f.attackCooldown = JR_DIVE.RECOVERY; f._benPowerCommit = JR_DIVE.RECOVERY }
    return
  }
  const k = machActive(s) ? JR_MACH.SPEED : 1
  f._benGlide = { vx: d.face * JR_DIVE.VX * k, vy: JR_DIVE.VY * k }
  hitbox(f, api, "jr_dive", d.face, { damage: JR_DIVE.DMG, spawnX: cx(f) + d.face * 24, spawnY: f.y + (f.h || 96) * 0.65, w: 96, h: 60, radius: 48,
    lifetime: 2, replace: true, hitstun: 22, blockstun: 12, knockbackX: 5, knockbackY: -5, alien: { jr: true, kind: "dive", pip: true, cast: d.cast } })
}

// DEFENSE: BARREL ROLL (←← + Light): no cost, i-frames on frames 4–10, 5 s cooldown, a short drift back; rotation render-only.
function castRoll(f, s) {
  if (s.rollCd > 0 || !canAct(f, s)) return false
  s.rollTapT = s.backTapT
  s.roll = { t: 0, face: f.facing || 1 }; s.rollCd = JR_ROLL.CD; s.stats.rolls++
  f.attackCooldown = JR_ROLL.TOTAL; f._benPowerCommit = JR_ROLL.TOTAL; f.vx = 0
  f._spriteCastMove = "jrRoll"; f._spriteCastTimer = JR_ROLL.TOTAL
  f._benSfx = "jr_roll"
  return true
}
function tickRoll(f, s, stage) {
  const r = s.roll; if (!r) return
  r.t++
  if (r.t === JR_ROLL.IFROM) f.invulnTimer = Math.max(f.invulnTimer || 0, JR_ROLL.ITO - JR_ROLL.IFROM + 1)   // frames 4–10
  if (r.t <= JR_ROLL.ITO) f.x = Math.max(stage.L, Math.min(stage.R - (f.w || 70), f.x - r.face * JR_ROLL.DRIFT))
  f._spriteCastMove = "jrRoll"; f._spriteCastTimer = 2
  if (r.t >= JR_ROLL.TOTAL) s.roll = null
}

// Combat calls this after a contact this fighter OWNS lands (melee or projectile, blocked or clean).
function onContact(f, target, { proj = null, move = null, blocked = false } = {}) {
  const s = jrState(f); if (!s || !target) return
  if (proj && proj.visualOnly) return
  const a = proj ? proj.alien : null, kind = a && a.jr ? a.kind : null
  if (kind === "dash" && s.dash && s.dash.cast === a.cast) s.dash.carry = true
  if (kind === "dive" && s.dive && s.dive.cast === a.cast) s.dive.hit = true
  if (blocked) return
  if (a && a.pip) addPip(s, a.cast)
  if (kind !== "ultOpen" && kind !== "boom") scheduleEcho(f, s, target, proj ? (proj.damage || 0) : (move?.damage || 0))
  if (kind === "ultOpen" && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
}

// ── ULTIMATE: COSMIC DRAG (same input as Omnitrix Overload, 55 Power) ───────────────────────────────────────────
function fireUltimate(f, ctx, api) {
  const s = jrState(f); if (!s) return false
  const total = JR_ULT.STARTUP + JR_ULT.SWOOP_F + JR_ULT.WHIFF
  const c = beginCast(f, s, api, "jrDive", JR_COST.ultimate, total); if (!c) return false
  const face = f.facing || 1
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: c.cast, pips0: 0, seed: (ctx?.seed ?? 1) >>> 0, f0: (ctx?.frame ?? s.t) | 0, p: pIndex(f) }
  s.stats.ults++
  f._benSfx = "jr_ult"
  api.focusCamera?.(f, api.getOpponent(f), 0.9, 20)
  return true                                                                     // whiff / block: 60f recovery, no cinematic
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  delete f._benGlide
  u.phase = "warp"; u.t = 0; u.raw = JR_ULT.OPENER; u.pips0 = s.neuro.pips
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  u.layout = jrStarLayout(u.seed, u.f0, u.p)
  s.lastUltLayout = u.layout
  f.attackCooldown = JR_ULT.END + JR_ULT.LOCKOUT; f._benPowerCommit = JR_ULT.END; f._spriteCastTimer = JR_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, JR_ULT.END + 2)
}
// The universe he drags them through — a layout chosen by hash(seed, frame, player): what passes, where, how big. Plain data
// (stored in the ult state); render-only objects, none has a hitbox. The 6 impact objects are the first 6 entries.
const KINDS = ["asteroid", "moon", "ringed", "asteroid", "belt", "moon", "asteroid"]
export function jrStarLayout(seed, frame, player) {
  const out = []
  for (let i = 0; i < 6; i++) {
    const h = k => jrHash(seed, frame, player, i * 8 + k)
    out.push({ kind: KINDS[Math.floor(h(0) * KINDS.length)], r: Math.round(18 + h(1) * 46), dy: Math.round((h(2) - 0.5) * 120), hue: Math.round(h(3) * 360), spin: Math.round(h(4) * 100) / 100 })
  }
  out[2] = { ...out[2], kind: "ringed", r: Math.max(out[2].r, 54) }               // a ringed gas giant always passes
  out.push({ kind: "sun", r: 120, dy: Math.round((jrHash(seed, frame, player, 99) - 0.5) * 60), hue: 45, spin: 0 })
  return out
}
function tickUlt(f, s, opp, api, ctx, stage) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") {
    u.t++
    const st = JR_ULT.STARTUP
    if (u.t <= st) { f._spriteCastMove = "jrDive"; f._spriteCastTimer = 2; return }
    if (u.t <= st + JR_ULT.SWOOP_F && !u.stopped) {                                // the low talon swoop: real travel, talons ride him
      f._benGlide = { vx: u.face * JR_ULT.SWOOP_V, vy: 0 }; f._spriteCastMove = "jrDash"; f._spriteCastTimer = 2
      hitbox(f, api, "jr_ult_swoop", u.face, { damage: JR_ULT.OPENER, spawnX: cx(f) + u.face * 30, spawnY: f.y + (f.h || 96) * 0.6, w: 110, h: 80,
        radius: 55, lifetime: 2, replace: true, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0, knockbackY: 0, alien: { jr: true, kind: "ultOpen", cast: u.cast } })
      if (opp && (opp.blockstun || 0) > 0 && Math.abs(cx(opp) - cx(f)) < 110) { u.stopped = true; delete f._benGlide }   // blocked: stop, no capture
      return
    }
    delete f._benGlide
    if (u.t > st + JR_ULT.SWOOP_F + 4) s.ult = null
    return
  }
  if (!opp || opp.eliminated) { endUlt(f, s, null, stage); return }
  u.t++
  // the held target: talons-locked under him inside the warp bubble; both sim positions frozen at home (restored after)
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  if (u.t < JR_ULT.WARP) { u.phase = "warp"; f._spriteCastMove = "jrDash" }
  else if (u.t < JR_ULT.SLING_AT) {
    u.phase = "universe"; f._spriteCastMove = "jrDash"
    if (JR_ULT.IMPACT_AT.includes(u.t)) {                                          // dragged THROUGH what passes: 6 × 20
      api.applyScaledDamage(opp, JR_ULT.IMPACT, { attacker: f, move: "cosmicDrag", source: "ability" }); u.raw += JR_ULT.IMPACT
      opp.colorFlash = 5; api.shake?.(4, 5)
    }
  } else if (u.t < JR_ULT.CRASH_AT) { u.phase = "slingshot"; f._spriteCastMove = "jrDive" }
  else {
    u.phase = "crash"; f._spriteCastMove = "jrDive"
    if (u.t === JR_ULT.CRASH_AT) {                                                 // flung back in: skid + bounce, 80
      api.applyScaledDamage(opp, JR_ULT.CRASH, { attacker: f, move: "cosmicDrag", source: "ability" }); u.raw += JR_ULT.CRASH
      if (u.pips0 === 2) addPip(s, "ult" + u.cast)                                 // 2 pips at capture → the final hit adds one
      u.crashAt = u.t; api.shake?.(12, 14)
    }
  }
  f._spriteCastTimer = 2
  if (u.t >= JR_ULT.END) endUlt(f, s, opp, stage)
}
function endUlt(f, s, opp, stage) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0; f.facing = u.face }     // positions restore
  if (opp && u?.thome) {
    opp.x = Math.max(stage.L, Math.min(stage.R - (opp.w || 60), u.thome.x)); opp.y = u.thome.y      // a legal stage position
    opp.vx = u.face * JR_ULT.SKID; opp.vy = -8                                          // ground bounce + skid
    opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, JR_ULT.KD); opp.invulnTimer = Math.max(opp.invulnTimer || 0, JR_ULT.KD)
  }
  s.lastUltRaw = u?.raw || 0
  s.ult = null
  f.attackCooldown = JR_ULT.LOCKOUT; f._benPowerCommit = JR_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────────
function bodyOffset(f) {
  const s = jrState(f); if (!s) return null
  if (s.roll) return { dx: 0, dy: -Math.sin(s.roll.t / JR_ROLL.TOTAL * Math.PI) * 10, rot: -s.roll.face * (s.roll.t / JR_ROLL.TOTAL) * Math.PI * 2 }
  if (s.ult && s.ult.home && s.ult.phase !== "opener") return { dx: 0, dy: Math.round(Math.sin(s.ult.t * 0.35) * 4) - 18 }
  if (f.attacking && (f.currentMove === "light" || f.currentMove === "heavy")) return { dx: (f.facing || 1) * (f.currentMove === "heavy" ? 18 : 10), dy: 0 }   // lunge
  if (f.attacking && f.currentMove === "down") return { dx: (f.facing || 1) * 8, dy: 14 }                                    // LOW: low glide
  return (f.crouching || f.isCrouching) ? { dx: 0, dy: 14 } : null                                                        // crouch: low glide
}
function targetOffset(owner, target) {
  const s = jrState(owner); if (!s || !s.ult || !s.ult.home || s.ult.phase === "opener") return null
  return { dx: 0, dy: Math.round(Math.sin(s.ult.t * 0.35) * 4) - 4 }
}
export function drawJetrayHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = jrState(f); if (!ctx || !s) return
  const y = enY + enH + 3, h = 5
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x + 8, y, pbw, h)
  const frac = s.machT > 0 ? s.machT / JR_MACH.DURATION : 1 - s.machCd / JR_MACH.COOLDOWN
  const col = s.machT > 0 ? "#fde047" : s.machCd > 0 ? "#64748b" : "#f59e0b"
  const w = pbw * Math.max(0, Math.min(1, frac))
  ctx.fillStyle = col; ctx.fillRect(flip ? x + 8 + pbw - w : x + 8, y, w, h)
  const v = s.neuro
  const neuro = v.groundT > 0 ? ` · GROUNDED ${Math.ceil(v.groundT / 60)}s` : v.immune > 0 ? " · NEURO IMMUNE" : ` · NEURO ${"●".repeat(v.pips)}${"○".repeat(JR_NEURO.MAX - v.pips)}`
  const label = (s.machT > 0 ? `MACH TIME ${Math.ceil(s.machT / 6) / 10}s · ECHO ${s.echoCount}/${JR_ECHO.MAX}` : s.machCd > 0 ? `MACH TIME ${Math.ceil(s.machCd / 60)}s` : "MACH TIME READY (; + L)") + neuro
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = col; ctx.fillText(label, flip ? x + 8 + pbw : x + 8, y + h + 1)
  ctx.restore()
}
const _imgs = {}
function sheetImg(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  return _imgs[src].complete && _imgs[src].naturalWidth ? _imgs[src] : null
}
function ghost(c, a, fi, x, feetY, face, alpha, tint) {     // a translucent copy of one of his frames (afterimages / echoes)
  const img = sheetImg(a.sheet); if (!img) return
  const sc = JETRAY_GEOM.screenScale, fw = a.width, fh = a.height
  c.save(); c.globalAlpha = alpha; c.translate(Math.round(x), Math.round(feetY)); if (face < 0) c.scale(-1, 1)
  c.drawImage(img, (fi % a.frames) * fw, 0, fw, fh, -JETRAY_GEOM.centreX * sc, -a.originY * sc, fw * sc, fh * sc)
  if (tint) { c.globalCompositeOperation = "source-atop"; c.fillStyle = tint; c.fillRect(-JETRAY_GEOM.centreX * sc, -a.originY * sc, fw * sc, fh * sc) }
  c.restore()
}
const px = (c, x, y, s = 4) => c.fillRect(Math.round(x) - s / 2, Math.round(y) - s / 2, s, s)
function pixelLine(c, x0, y0, x1, y1, w, col, step = 4) {
  c.fillStyle = col; const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step))
  for (let i = 0; i <= n; i++) px(c, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, w)
}
function ring(c, x, y, r, col, s = 5, squash = 1) { c.fillStyle = col; const n = Math.max(16, Math.round(r / 3)); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; px(c, x + Math.cos(a) * r, y + Math.sin(a) * r * squash, s) } }
// the warp-bubble's fading trail, rebuilt (the sheet's soft gradient could not be keyed cleanly): stepped pixel bands
function warpTrail(c, x, y, face, len, alpha) {
  const bands = 8
  for (let i = 0; i < bands; i++) {
    const k = i / bands, w = len / bands
    c.globalAlpha = alpha * (1 - k) * 0.8
    c.fillStyle = i % 2 ? "#c4b5fd" : "#e9d5ff"
    const h = Math.round(26 * (1 - k * 0.6))
    c.fillRect(Math.round(x - face * (i * w + w)), Math.round(y - h / 2), Math.round(w) + 1, h)
  }
  c.globalAlpha = 1
}
export function drawJetrayFx(c, f, frame = 0, opp = null) {
  const s = jrState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const face = f.facing || 1, mid = f.y + (f.h || 96) / 2
  // Eye Laser: twin red-gold beams from the eye anchor along the cast angle (glow = render only)
  if (s.eye && s.eye.t > s.eye.st - 2) {
    const b = eyeBeam(f, s), fade = s.eye.t > s.eye.last ? Math.max(0, 1 - (s.eye.t - s.eye.last) / 6) : 1
    c.globalAlpha = 0.45 * fade; pixelLine(c, b.x0, b.y0, b.x1, b.y1, 12, "#f97316", 6)
    c.globalAlpha = fade; pixelLine(c, b.x0, b.y0 - 3, b.x1, b.y1 - 3, 4, "#fde047", 4); pixelLine(c, b.x0, b.y0 + 3, b.x1, b.y1 + 3, 4, "#ef4444", 4)
    c.globalAlpha = 1
  } else if (s.eye) { const e = eyePoint(f, "jrEye", 0); c.fillStyle = "#fde047"; px(c, e.x, e.y, 6 + (frame & 2) * 2) }
  // Tail Volley charge spark at the tail tip + the live bolts' glow
  if (s.tail && s.tail.t < (s.tail.total || 30)) { const t = tailTip(f, s.tail.face); c.fillStyle = "#facc15"; px(c, t.x, t.y, 8) }
  if (_api) for (const p of _api.activeProjectiles()) if (p.owner === f && /^jr_tail_/.test(p.name || "")) {
    c.fillStyle = "#fef08a"; px(c, p.x, p.y, 8); c.fillStyle = "rgba(250,204,21,0.55)"; px(c, p.x - Math.sign(p.vx) * 10, p.y - Math.sign(p.vy || 0) * 4, 8)
  }
  // Wing Dash: rebuilt warp trail behind the bubble core; normals' wing slashes
  if (s.dash && s.dash.t > s.dash.st && !s.dash.done) warpTrail(c, cx(f) - face * 40, mid, face, 220, 1)
  if (f.attacking && (f.currentMove === "heavy" || f.currentMove === "light" || f.currentMove === "up" || f.currentMove === "air" || f.currentMove === "down")) {
    const r = f.currentMove === "heavy" ? 85 : f.currentMove === "light" ? 50 : 60
    c.fillStyle = "#fde68a"
    for (let i = 0; i < 9; i++) { const a = (f.currentMove === "up" ? -Math.PI / 2 : 0) + (i / 8 - 0.5) * 1.6; px(c, cx(f) + face * (Math.cos(a) * r + 20), mid + (f.currentMove === "down" ? 30 : 0) + Math.sin(a) * r * 0.6, 4) }
  }
  // Sonic Boom ring
  if (s.boom) { const k = s.boom.t / 18; c.globalAlpha = 1 - k; ring(c, s.boom.x, s.boom.y, 30 + k * (JR_BOOM.R - 30), "#e0f2fe", 6); c.globalAlpha = 1 }
  // Sonic Dive streak
  if (s.dive && !s.dive.land && s.dive.t > s.dive.st) pixelLine(c, cx(f) - face * 60, mid - 60, cx(f), mid, 6, "rgba(254,240,138,0.7)", 6)
  // echo ghosts: a translucent Jetray fades in and fires the echo laser tick at the target
  for (const e of s.echoes) {
    const k = 1 - Math.max(0, e.at - s.t) / JR_ECHO.DELAY, ex = e.x - face * 120, ey = e.y - 30
    ghost(c, ANIM.jrEye, 0, ex, ey + 60, face, 0.2 + 0.4 * k, "rgba(253,224,71,0.6)")
    if (k > 0.8) { c.globalAlpha = 0.8; pixelLine(c, ex + face * 20, ey, e.x, e.y, 5, "#fde047", 5); c.globalAlpha = 1 }
  }
  // Grounded crackle on the opponent's legs + Neuro pips over their head
  if (opp && !opp.eliminated) {
    const v = s.neuro, ox = cx(opp), feet = opp.y + (opp.h || 110)
    if (v.groundT > 0) { c.fillStyle = (frame >> 1) & 1 ? "#a5f3fc" : "#fde047"
      for (let i = 0; i < 6; i++) { const k = (i * 37 + frame * 11) % 40; px(c, ox - 20 + k, feet - 6 - ((i * 13 + frame * 7) % 30), 4) } }
    for (let i = 0; i < v.pips; i++) { c.fillStyle = "#fde047"; px(c, ox - 12 + i * 12, opp.y - 14, 6) }
  }
  // Cosmic Drag: warp bubble trail on both while the world streaks past
  if (s.ult && s.ult.home && s.ult.phase !== "opener") warpTrail(c, cx(f) - face * 50, mid, face, 300, 0.9)
  c.restore()
}
// Mach Time: a warm wash UNDER both fighters. Cosmic Drag: the stage is covered by hyperspace — a procedural parallax starfield
// streaking sideways, the hash-laid universe (asteroids, moons, a ringed gas giant, an asteroid belt, a sun flare) passing behind
// the fighters (both stay readable in front of it). Nothing here has a hitbox or GAME_STATE presence.
export function drawJetrayUnder(c, f, frame = 0) {
  const s = jrState(f); if (!c || !s) return
  const u = s.ult && s.ult.home && s.ult.phase !== "opener" ? s.ult : null
  if (!u && !machActive(s)) return
  c.save(); c.imageSmoothingEnabled = false
  if (!u) { c.globalAlpha = 0.12; c.fillStyle = "#f59e0b"; c.fillRect(-4000, -4000, 16000, 12000); c.restore(); return }
  const X = cx(f), Y = f.y + (f.h || 96) / 2, face = u.face
  const k = Math.min(1, u.t / JR_ULT.WARP), fadeOut = u.t > JR_ULT.END - 10 ? (JR_ULT.END - u.t) / 10 : 1
  c.globalAlpha = Math.min(k, fadeOut)
  c.fillStyle = "#05030f"; c.fillRect(X - 2400, Y - 1600, 4800, 3200)
  const speed = 6 + u.t * 0.6
  for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 70; i++) {    // parallax star streaks, escalating speed
    const h1 = jrHash(u.seed, i, u.p, layer * 131), h2 = jrHash(u.seed, i, u.p, layer * 131 + 1)
    const span = 2400, sx = ((h1 * span - face * u.t * speed * (layer + 1) * 0.6) % span + span) % span - span / 2
    const sy = (h2 - 0.5) * 1200, len = 4 + speed * (layer + 1) * 0.4
    c.fillStyle = layer === 2 ? "#ffffff" : layer === 1 ? "#c7d2fe" : "#6366f1"
    c.fillRect(Math.round(X + sx), Math.round(Y + sy), Math.round(len), layer === 2 ? 3 : 2)
  }
  // the passing universe: each impact object sweeps past the held opponent at its impact frame
  u.layout.forEach((o, i) => {
    const at = i < 6 ? JR_ULT.IMPACT_AT[i] : JR_ULT.SLING_AT + 10
    const dx = -face * (u.t - at) * (i < 6 ? 26 : 10), ox = X + face * 40 + dx, oy = Y + o.dy * (i < 6 ? 0.3 : 1)
    if (Math.abs(dx) > 1400) return
    const col = `hsl(${o.hue},55%,${o.kind === "sun" ? 60 : 45}%)`
    if (o.kind === "sun") { c.fillStyle = "#fde68a"; for (let r = o.r; r > 0; r -= 12) { c.globalAlpha = Math.min(k, fadeOut) * (0.25 + 0.75 * (1 - r / o.r)); ring(c, ox, oy, r, r > o.r * 0.6 ? "#fb923c" : "#fef3c7", 8) } c.globalAlpha = Math.min(k, fadeOut); return }
    c.fillStyle = col
    for (let y = -o.r; y <= o.r; y += 6) { const w = Math.sqrt(Math.max(0, o.r * o.r - y * y)); c.fillRect(Math.round(ox - w), Math.round(oy + y), Math.round(w * 2), 6) }
    if (o.kind === "ringed") ring(c, ox, oy, o.r * 1.8, "#fcd34d", 5, 0.25)
    if (o.kind === "belt") for (let j = 0; j < 14; j++) { c.fillStyle = "#a8a29e"; px(c, ox + (j - 7) * 18, oy + ((j * 37) % 23) - 11, 8) }
    if (o.kind === "moon") { c.fillStyle = "rgba(0,0,0,0.25)"; px(c, ox - o.r * 0.3, oy - o.r * 0.2, 10); px(c, ox + o.r * 0.2, oy + o.r * 0.3, 8) }
  })
  c.restore()
}
// MACH TIME afterimages (render-only memory outside GAME_STATE): his recent positions, gold-tinted, while Mach Time runs
const _trail = new WeakMap()
export function drawJetrayBehind(c, f, frame = 0) {
  const s = jrState(f); if (!c) return
  if (!s) { _trail.delete(f); return }
  let tr = _trail.get(f); if (!tr) { tr = []; _trail.set(f, tr) }
  tr.push({ x: cx(f), feet: f.y + (f.h || 96), face: f.facing || 1 }); if (tr.length > 12) tr.shift()
  if (!machActive(s) && !s.dash) return
  c.save(); c.imageSmoothingEnabled = false
  for (let i = 0; i < tr.length - 2; i += 3) ghost(c, s.dash ? ANIM.jrDash : ANIM.fly, (frame >> 2) + i, tr[i].x, tr[i].feet, tr[i].face, 0.1 + 0.05 * i / 3, "rgba(250,204,21,0.55)")
  c.restore()
}
