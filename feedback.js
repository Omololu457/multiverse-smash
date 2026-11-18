// feedback.js — FEEDBACK (Conductoid), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate /
// absorb / blockHeavy / onContact / damageDealt — see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// Registry / pool key `feedback_ov`: the experimental `feedback` entry (its legacy kit and art table) is left untouched.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE): Charge, the stored-projectile record, Drain
// pips / Blackout, casts. Render-only effects (sparks, glow, current, static, shake) never write it. Simulation randomness:
// hash(match seed, frame, player index) only. Sheet source: see docs/ben10/aliens/feedback/SPRITE_LEDGER.md.
import { FEEDBACK_ANIM, FEEDBACK_FX, FEEDBACK_GEOM } from "./feedbackAssets.js"
export { FEEDBACK_ANIM, FEEDBACK_FX, FEEDBACK_GEOM }

export const FB_KEY = "feedback_ov"
const ANIM = { ...FEEDBACK_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage. His normals are ELECTRIC-tagged
// (plug strikes / sparks): a landed one gives +4 Charge, and other forms' tag filters read them as electric.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, electric: true, ...extra })

export const FEEDBACK = {
  id: FB_KEY, poolKey: FB_KEY, displayName: "Feedback", slot: 16,   // catalog slot (metadata; PICK FIVE): the brief said 15, but Humongousaur took 15 on main and ready slots must stay contiguous (ben10_moveset_p4)
  status: "ready", sheetPath: "./ben10_feedback_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/feedback/SPRITE_LEDGER.md",
  mods: { speed: 1.05, damage: 0.95, defense: 0.90, weight: 0.85 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Plasma Orb", special2: "Siphon Cable", special3: "Return Fire", special4: "Overload Burst",
    special5: "Conduit Dash", special6: "Volt Shot", defense: "Plug Guard", ultimate: "Full Feedback" },
  basic_attacks: {
    light:  normal(16, 5, 3, 9, 1, { rangeX: 90 }),                                           // plug spark
    heavy:  normal(48, 13, 4, 21, -5, { knockbackX: 7, rangeX: 150, plugArm: true }),        // plug strike, 150 px
    down:   normal(22, 7, 3, 14, -3, { hitLevel: "low", rangeX: 110 }),                       // crouch + low plug spark, hits low
    up:     normal(42, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // rising spark arc
    air:    normal(26, 7, 4, 11, 2)                                                           // jump frame + spark
  },
  anim: ANIM, fx: FEEDBACK_FX,
  onApply, tick, moveFrames, hurtbox, fireSpecial, fireUltimate, absorb, blockHeavy, damageDealt, onContact, targetOffset,
  drawHud: drawFeedbackHud, drawFx: drawFeedbackFx, drawUnder: drawFeedbackUnder
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshFeedbackState() {
  return { kind: FB_KEY, t: 0, castId: 0, noAttack: false,
    stage: { L: -1e6, R: 1e6 },
    charge: 0, chargeT: 0,                                 // Charge gauge 0–100; chargeT = frames since the last gain (decay)
    guard: { t: 0, cd: 0, beamT: 0, absorbed: 0 },         // PLUG GUARD
    stored: null, lastStored: null,                        // the ONE stored-projectile record
    drain: { pips: 0, pipT: 0, pipped: [], boT: 0, immuneT: 0, lastE: null, blackouts: 0 },
    orb: null, siphon: null, fire: null, burst: null, dash: null, volt: null, voltUsed: false, landT: -999,
    ult: null, lastUltRaw: 0, lastUltDrain: 0,
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5,
    stats: { casts: 0, absorbed: 0, absorbedBeams: 0, stores: 0, dissipated: 0, returns: 0, orbs: 0, siphons: 0, drained: 0, bursts: 0,
      burstRejects: 0, dashes: 0, volts: 0, pips: 0, blackouts: 0, ults: 0, guards: 0, chargeGained: 0 } }
}
export const fbState = f => (f?.omnitrix?.formState?.kind === FB_KEY && f.transformed && f.activeAlien === FB_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshFeedbackState()
}

const cx = o => o.x + (o.w || 60) / 2
let projRef = null   // the engine's live projectile list (render reads it; never written by render)
const grounded = f => !!(f && (f.onGround || f.grounded))
export const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
export const projBox = p => { const pw = p.w || (p.radius || 10) * 2, ph = p.h || (p.radius || 10) * 2; return { x: p.x - pw / 2, y: p.y - ph / 2, w: pw, h: ph } }
export const isBeam = p => !!p && !!(p.beam || p.isBeam || p.laser || /beam|laser|kameha|ray\b|_ray|heat_?vision|getsuga|blast_wave/i.test(String(p.name || p.move || "")))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function fbHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = fbState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  if (api && api.activeProjectiles) projRef = api.activeProjectiles()      // read-only reference for the render
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  input = input || {}
  tickInputs(f, s, input)
  if (grounded(f)) s.voltUsed = false                                      // Volt Shot: once per airtime
  s.blockHeld = !!input.block
  tickCharge(f, s)
  tickGuard(f, s)
  tickStored(f, s)
  tickDrain(f, s, opp)
  tickOrb(f, s, api)
  tickSiphon(f, s, api)
  tickFire(f, s, api)
  tickBurst(f, s, api, opp)
  tickDash(f, s, api)
  tickVolt(f, s, api)
  tickUlt(f, s, opp, api, ctx)
  s.noAttack = busy(s)
}
const busy = s => !!(s.orb || s.siphon || s.fire || s.burst || s.dash || s.volt || s.ult)
// moveFrames hook (combat.startMove): no normals while a cast owns him
function moveFrames(f, key, md) { const s = fbState(f); if (!s) return md; return busy(s) ? false : md }

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
//   ↓↘→ + P (236) PLASMA ORB (air: VOLT SHOT)   ↓↙← + P (214) SIPHON CABLE   →↓↘ + P (623) RETURN FIRE
//   ←↙↓ + P (412) OVERLOAD BURST                 →→ + P (a frame-counted double tap) CONDUIT DASH
//   Block + Heavy: PLUG GUARD (the blockHeavy hook)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral / → Plasma Orb (→ after a
// double tap = Conduit Dash, held or released), ← Siphon Cable, ↑ Return Fire, ↓ Overload Burst.
export const FB_DASH_WINDOW = 14, FB_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= FB_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "fire"], ["412", "burst"], ["214", "siphon"], ["236", "orb"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= FB_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "volt"
  const m = readMotion(s); if (m) return m
  if (s.t - (s.dashTapT ?? -999) <= FB_DASH_WINDOW) return "dash"            // →→ inside 14f (held or released)
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "siphon"
  if (dir === "D") return "burst"
  if (dir === "U") return "fire"
  return "orb"
}

// ── SPECIALS (dispatch) ─────────────────────────────────────────────────────────────────
export const FB_COST = { orb: 10, siphon: 12, fire: 0, burst: 14, dash: 10, volt: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = fbState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
function canAct(f, s) {
  return f.transformed && f.activeAlien === FB_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++; s.stats.casts++
  return { cast: s.castId, total }
}
// a hitbox riding the shared projectile pipeline (hidden: drawn by this module); vx carries the knockback direction
const hitbox = (f, api, name, face, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, electric: true, ...md,
  alien: { hidden: true, ...(md.alien || {}) } }, {})
const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)

// ── 3. CHARGE (0–100) ────────────────────────────────────────────────────────────────────────────────────────
// Gains: PLUG GUARD absorbs (+0.5 × the absorbed damage, max +30; beams half), the stored projectile dissipating / being replaced
// (its value), a clean SIPHON CABLE hit +15 (and the opponent loses 15 Power), any other clean ELECTRIC hit of his +4 (all his
// normals and specials are electric-tagged; the ult's own pulses are not — its total is fixed). Idle 180f after the last gain →
// −1 / f. Plasma Orb / Overload Burst / the ult's Discharge spend ALL of it. Swap / revert / KO / rematch clear it (formState).
export const FB_CHARGE = { MAX: 100, ELECTRIC: 4, SIPHON: 15, IDLE: 180, DECAY: 1 }
export function addCharge(s, n) {
  if (!s || !(n > 0)) return 0
  const before = s.charge
  s.charge = Math.min(FB_CHARGE.MAX, s.charge + n); s.chargeT = 0
  const got = s.charge - before; s.stats.chargeGained += got
  return got
}
export function spendCharge(s) { const c = s ? s.charge : 0; if (s) { s.charge = 0; s.chargeT = 0 } return c }
function tickCharge(f, s) {
  s.chargeT++
  if (s.chargeT > FB_CHARGE.IDLE && s.charge > 0) s.charge = Math.max(0, s.charge - FB_CHARGE.DECAY)
}
// is this hit of his electric? (his normals / specials carry electric: true; the ult's beats do not)
const electricMove = m => !!m && (m.electric === true || /electric|lightning|volt|plasma/i.test(String(m.element || "")))

// ── 4. PLUG GUARD (Block + Heavy, cost 0, 5 s cooldown, 10f window) ─────────────────────────────────────────────
// ABSORBS projectile hits and energy / electric / fire / beam-TAGGED hits: 0 damage, no hitstun, Charge +0.5 × the damage (max +30).
// PASSES THROUGH: physical melee (untagged), throws / grabs, unblockables, ultimates / cinematics, his own pieces, and anything
// already RETURNED by a Feedback (loop guard; other absorbers can still take it). Stationary hitboxes riding the projectile
// pipeline (other aliens' hidden melee boxes) count as melee: absorbed only when element-tagged.
// BEAMS: absorbed per tick while Block stays HELD, for at most 30f from the first beam tick, at HALF gain, never stored.
// STORE: an absorbed (non-beam) projectile becomes the ONE stored record (damage, speed, size, tags, owner, look) for 180f, then it
// dissipates into Charge (its value = the absorb gain); a new absorb replaces it and the old record's value is added to Charge.
// ATOMIC: one absorb per projectile (stamped), the gain + record + consume happen in this one call; the engine then removes it.
// LOCK: the guard pose / lock lasts 12f (the absorb window stays 10f) so it outlives the shared 10f input buffer — a shorter lock
// lets the very Heavy press that raised the guard replay as a Heavy normal the frame the lock ends (seen in the render check).
export const FB_GUARD = { WINDOW: 10, LOCK: 12, CD: 300, GAIN: 0.5, MAX_GAIN: 30, BEAM_MAX: 30, BEAM_GAIN: 0.5, STORE: 180 }
const ELEMENT = /fire|flame|burn|electric|lightning|thunder|volt|plasma|beam|laser|energy|ki\b|chakra|blast/i
const tagged = m => !!m && !!(m.fire || m.electric || m.beam || m.isBeam || m.laser || m.energy || (m.alien && m.alien.beam) ||
  ELEMENT.test(String(m.element || "")) || ELEMENT.test(String(m.damageType || "")))
const passes = m => !!m && !!(m.unblockable || m.isUltimate || m.isCinematic || m.cinematic || m.isGrab || m.isThrow || m.grab || m.throw ||
  ["grab", "throw", "ultimate"].includes(m.category))
// RETURNED by a Feedback: the flag rides in `alien` (the shared spawn copies only `alien` / `fire` / hb* extras onto projectiles)
export const returned = p => !!p && !!(p.fbReturned || (p.alien && p.alien.returned))
const beamOf = p => isBeam(p) || !!(p && p.alien && p.alien.beam)
export const guardOpen = s => !!s && s.guard.t > 0
const beamOpen = s => !!s && s.guard.beamT > 0 && s.guard.beamT <= FB_GUARD.BEAM_MAX && s.blockHeld
function blockHeavy(f) {
  const s = fbState(f); if (!s) return false
  const g = s.guard
  if (g.cd > 0 || busy(s) || (f.hitstun || 0) > 0 || f.attacking || !f.transformed) return false
  g.t = FB_GUARD.WINDOW; g.cd = FB_GUARD.CD; g.beamT = 0; s.stats.guards++
  f._spriteCastMove = "fbGuard"; f._spriteCastTimer = FB_GUARD.LOCK; f._benPowerCommit = FB_GUARD.LOCK; f.attackCooldown = FB_GUARD.LOCK; f.vx = 0
  return true
}
function tickGuard(f, s) {
  const g = s.guard
  if (g.t > 0) g.t--
  if (g.cd > 0) g.cd--
  if (g.beamT > 0) { if (!s.blockHeld || g.beamT > FB_GUARD.BEAM_MAX) g.beamT = 0; else { g.beamT++; f._spriteCastMove = "fbGuard"; f._spriteCastTimer = 2 } }
}
const gainOf = dmg => Math.min(FB_GUARD.MAX_GAIN, Math.max(0, dmg || 0) * FB_GUARD.GAIN)
const LOOK = ["color", "sheet", "spriteFrames", "spriteW", "spriteH", "spriteSpeed", "spriteScale", "radius", "w", "h", "rectHitbox", "drawKind", "spriteKey", "spriteFrameStart", "spriteBottomY", "spriteOnce"]
const TAGS = ["fire", "electric", "energy", "element", "damageType", "isSpecial", "hitstun", "blockstun", "knockbackX", "knockbackY"]
function absorb(f, info) {
  const s = fbState(f); if (!s || !info) return false
  const p = info.proj
  if (!p) {                                                                    // the melee path: only element-tagged blows
    const m = info.move
    if (!guardOpen(s) || !m || passes(m) || !tagged(m)) return false
    addCharge(s, gainOf(m.damage)); s.stats.absorbed++; s.guard.absorbed++
    return true
  }
  if (p.visualOnly || p.owner === f || p._fbAbsorbed || returned(p) || passes(p)) return false
  const beam = beamOf(p)
  if (beam) {                                                                  // per tick while held, ≤30f, half gain, no record
    if (!(guardOpen(s) || beamOpen(s))) return false
    if (s.guard.beamT <= 0) s.guard.beamT = 1
    p._fbAbsorbed = true
    addCharge(s, gainOf(p.damage) * FB_GUARD.BEAM_GAIN); s.stats.absorbedBeams++; s.guard.absorbed++
    return true
  }
  if (!guardOpen(s)) return false
  const moving = Math.abs(p.vx || 0) >= 1 || Math.abs(p.vy || 0) >= 1 || (p.speed || 0) >= 1
  if (!moving && !tagged(p)) return false                                       // a stationary melee box: physical → passes
  p._fbAbsorbed = true                                                         // ATOMIC: this projectile can never be absorbed again
  const gain = gainOf(p.damage)
  addCharge(s, gain)
  if (moving) storeRecord(s, p, info.attacker || p.owner, gain)
  s.stats.absorbed++; s.guard.absorbed++
  return true
}
function storeRecord(s, p, owner, value) {
  if (s.stored) addCharge(s, s.stored.value)                                   // replaced: the old record's value goes to Charge
  const look = {}, tags = {}
  for (const k of LOOK) if (p[k] !== undefined && typeof p[k] !== "object") look[k] = p[k]
  for (const k of TAGS) if (p[k] !== undefined && typeof p[k] !== "object") tags[k] = p[k]
  if (p.alien && p.alien.hidden) look.hidden = true                            // drawn by its owner's module → he draws an orb instead
  s.stored = { name: String(p.name || "proj"), damage: p.damage || 0, speed: Math.hypot(p.vx || 0, p.vy || 0) || p.speed || 8,
    w: p.w || 0, h: p.h || 0, radius: p.radius || 0, tags, look, owner: owner && owner.side ? owner.side : null, value, t: FB_GUARD.STORE, id: ++s.castId }
  s.stats.stores++
}
function tickStored(f, s) {
  const r = s.stored; if (!r) return
  if (--r.t <= 0) { addCharge(s, r.value); s.lastStored = { ...r, by: "dissipated" }; s.stored = null; s.stats.dissipated++ }
}

// ── 5. DRAIN pips → BLACKOUT ───────────────────────────────────────────────────────────────────────────────
// A clean hit of SIPHON CABLE / PLASMA ORB / CONDUIT DASH = +1 Drain pip (tagged `alien.pip`, counted once per cast id), max 3; the
// pips expire 240f after the last one. No pips from blocks, Overload Burst, Return Fire, Volt Shot, normals or the ult.
// 3 pips → BLACKOUT 240f on the opponent: NO energy regen and meter gained from hits HALVED. Done in this form's tick with no engine
// edit (meter is `energy` in this engine): each frame the opponent's energy rise since the last frame is inspected — a rise of
// ≤1.5 / f (passive regen, Charge-button charging) is removed, a bigger one (an on-hit / on-block meter gain) is halved; spending
// still works. Nothing polls the opponent's inputs or touches any clock. No refresh while active (pips can't build), then 360f
// immunity. The static overlay on the opponent is render-only.
export const FB_DRAIN = { MAX: 3, EXPIRE: 240, BLACKOUT: 240, IMMUNE: 360, REGEN_MAX: 1.5, HIT_MULT: 0.5 }
export const blackedOut = s => !!s && s.drain.boT > 0
export function addPip(f, s, cast) {
  const d = s.drain
  if (d.boT > 0 || d.immuneT > 0) return false                               // no refresh while active / immune afterwards
  if (cast != null) { if (d.pipped.includes(cast)) return false; d.pipped.push(cast); if (d.pipped.length > 8) d.pipped.shift() }
  d.pips = Math.min(FB_DRAIN.MAX, d.pips + 1); d.pipT = FB_DRAIN.EXPIRE; s.stats.pips++
  return true
}
export function startBlackout(f, s, opp) {
  const d = s.drain
  if (!opp || d.boT > 0 || d.immuneT > 0) return false
  d.pips = 0; d.pipT = 0; d.boT = FB_DRAIN.BLACKOUT; d.lastE = opp.energy || 0; d.blackouts++; s.stats.blackouts++
  return true
}
function tickDrain(f, s, opp) {
  const d = s.drain
  if (d.boT > 0) {
    if (opp) {
      const e = opp.energy || 0
      if (d.lastE == null) d.lastE = e
      const rise = e - d.lastE
      if (rise > 0) opp.energy = rise <= FB_DRAIN.REGEN_MAX ? d.lastE : d.lastE + rise * FB_DRAIN.HIT_MULT
      d.lastE = opp.energy || 0
    }
    if (--d.boT === 0) { d.immuneT = FB_DRAIN.IMMUNE; d.lastE = null }
  } else if (d.immuneT > 0) d.immuneT--
  if (d.pips > 0 && d.boT <= 0) { if (--d.pipT <= 0) { d.pips = 0; d.pipT = 0 } }
  if (d.pips >= FB_DRAIN.MAX) startBlackout(f, s, opp)
}

// ── 6. MOVES ─────────────────────────────────────────────────────────────────────────────────────────────────
const armEdge = (f, face) => cx(f) + face * (f.w || 60) / 2
const armY = (f, k = 0.36) => f.y + (f.h || 110) * k
const ownShots = (f, api, kind) => api ? api.activeProjectiles().filter(p => p && p.owner === f && p.alien && p.alien.fb === kind) : []

// PLASMA ORB (↓↘→ + P, 10) — 14f, a 500 px orb, 30 + 0.5 × Charge (max 70); spends ALL Charge (at the cast); one on screen; a clean
// hit +1 Drain.
export const FB_ORB = { STARTUP: 14, RECOVERY: 18, BASE: 30, PER: 0.5, MAX: 70, SPEED: 12, RANGE: 500, W: 34, H: 34 }
FB_ORB.TOTAL = FB_ORB.STARTUP + FB_ORB.RECOVERY
export const orbDamage = charge => Math.min(FB_ORB.MAX, FB_ORB.BASE + FB_ORB.PER * charge)
function castOrb(f, s, api) {
  if (ownShots(f, api, "orb").length) return false                             // one on screen
  const c = beginCast(f, s, api, "fbOrb", FB_COST.orb, FB_ORB.TOTAL); if (!c) return false
  const charge = spendCharge(s)
  s.orb = { t: 0, cast: c.cast, face: f.facing || 1, dmg: orbDamage(charge), charge }; s.stats.orbs++
  return true
}
CASTS.orb = castOrb
function tickOrb(f, s, api) {
  const d = s.orb; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.orb = null; return }
  if (d.t === FB_ORB.STARTUP) hitbox(f, api, "fb_orb", d.face, { damage: d.dmg, vx: d.face * FB_ORB.SPEED, speed: FB_ORB.SPEED,
    spawnX: armEdge(f, d.face) + d.face * FB_ORB.W / 2, spawnY: armY(f), w: FB_ORB.W, h: FB_ORB.H,
    lifetime: Math.round(FB_ORB.RANGE / FB_ORB.SPEED), hitstun: 22, blockstun: 10, knockbackX: 3, knockbackY: -2,
    alien: { fb: "orb", pip: true, cast: d.cast, charge: d.charge } })
  f._spriteCastMove = "fbOrb"; f._spriteCastTimer = Math.max(2, FB_ORB.TOTAL - d.t)
  if (d.t >= FB_ORB.TOTAL) s.orb = null
}

// SIPHON CABLE (↓↙← + P, 12) — the cable shoots out (16f startup) to 300 px: 20 dmg; a clean hit drains 15 of the opponent's Power,
// gives +15 Charge and +1 Drain. 24f recovery after the active frames (whiff-punishable: the cable is part of his hurtbox while it
// is out); −12 on block.
export const FB_SIPHON = { STARTUP: 16, ACTIVE: 3, RECOVERY: 24, RANGE: 300, DMG: 20, DRAIN: 15, CHARGE: 15, ON_BLOCK: -12, H: 30,
  EXT_FROM: 4, HOLD_TO: 22, RETRACT_TO: 34 }
FB_SIPHON.TOTAL = FB_SIPHON.STARTUP + FB_SIPHON.ACTIVE + FB_SIPHON.RECOVERY
export function cableExt(t, reach = FB_SIPHON.RANGE) {
  const L = FB_SIPHON
  if (t < L.EXT_FROM) return 0
  if (t <= L.STARTUP) return reach * (t - L.EXT_FROM) / (L.STARTUP - L.EXT_FROM)
  if (t <= L.HOLD_TO) return reach
  if (t <= L.RETRACT_TO) return reach * (L.RETRACT_TO - t) / (L.RETRACT_TO - L.HOLD_TO)
  return 0
}
function castSiphon(f, s, api) {
  const c = beginCast(f, s, api, "fbSiphon", FB_COST.siphon, FB_SIPHON.TOTAL); if (!c) return false
  s.siphon = { t: 0, cast: c.cast, face: f.facing || 1, hit: false }; s.stats.siphons++
  return true
}
CASTS.siphon = castSiphon
function tickSiphon(f, s, api) {
  const w = s.siphon; if (!w) return
  w.t++
  if ((f.hitstun || 0) > 0) { s.siphon = null; return }
  if (w.t === FB_SIPHON.STARTUP) { const rem = FB_SIPHON.TOTAL - w.t, edge = armEdge(f, w.face)
    hitbox(f, api, "fb_siphon", w.face, { damage: FB_SIPHON.DMG, spawnX: edge + w.face * FB_SIPHON.RANGE / 2, spawnY: armY(f) + 6,
      w: FB_SIPHON.RANGE, h: FB_SIPHON.H, lifetime: FB_SIPHON.ACTIVE, hitstun: rem + 6, blockstun: blockstunFor(rem, FB_SIPHON.ON_BLOCK),
      knockbackX: 0.5, knockbackY: 0, alien: { fb: "siphon", pip: true, cast: w.cast } }) }
  f._spriteCastMove = "fbSiphon"; f._spriteCastTimer = Math.max(2, FB_SIPHON.TOTAL - w.t)
  if (w.t >= FB_SIPHON.TOTAL) s.siphon = null
}
function siphonHit(f, s, target, cast) {
  if (!s.siphon || s.siphon.cast !== cast || s.siphon.hit) return
  s.siphon.hit = true
  const before = target.energy || 0, after = Math.max(0, before - FB_SIPHON.DRAIN)
  target.energy = after; s.stats.drained += before - after
  if (s.drain.boT > 0) s.drain.lastE = after
  addCharge(s, FB_SIPHON.CHARGE)
}

// RETURN FIRE (→↓↘ + P, 0) — needs a stored record (none → nothing happens, no cost, no lockout). 14f, then the stored shot flies at
// the NEAREST other fighter as they stood at the cast (aimed once, no tracking), with its stored speed / size / look, ownership
// transferred to him, `fbReturned` set (no Feedback can absorb it again), damage × 1.25 (max 60); −12 on block. No Drain pip.
export const FB_FIRE = { STARTUP: 14, RECOVERY: 18, MULT: 1.25, MAX: 60, ON_BLOCK: -12, RANGE: 720 }
FB_FIRE.TOTAL = FB_FIRE.STARTUP + FB_FIRE.RECOVERY
export const fireDamage = rec => Math.min(FB_FIRE.MAX, (rec ? rec.damage : 0) * FB_FIRE.MULT)
function nearestOther(f, api) {
  const all = api && api.allFighters ? api.allFighters().filter(o => o && o !== f && !o.eliminated) : []
  if (!all.length) return api && api.getOpponent ? api.getOpponent(f) : null
  let best = null, bd = Infinity
  for (const o of all) { const d = Math.hypot(cx(o) - cx(f), (o.y + (o.h || 110) / 2) - armY(f)); if (d < bd) { bd = d; best = o } }
  return best
}
function castFire(f, s, api) {
  if (!s.stored) return false
  const c = beginCast(f, s, api, "fbFire", FB_COST.fire, FB_FIRE.TOTAL); if (!c) return false
  const rec = s.stored; s.stored = null; s.lastStored = { ...rec, by: "returned" }
  const tgt = nearestOther(f, api)
  const face = tgt ? (cx(tgt) >= cx(f) ? 1 : -1) : (f.facing || 1); f.facing = face
  const sx = armEdge(f, face), sy = armY(f)
  const tx = tgt ? cx(tgt) : sx + face * 100, ty = tgt ? tgt.y + (tgt.h || 110) / 2 : sy
  const L = Math.hypot(tx - sx, ty - sy) || 1, sp = Math.max(4, rec.speed || 8)
  s.fire = { t: 0, cast: c.cast, face, rec, vx: (tx - sx) / L * sp, vy: (ty - sy) / L * sp, target: tgt ? tgt.side || null : null }
  s.stats.returns++
  return true
}
CASTS.fire = castFire
function tickFire(f, s, api) {
  const d = s.fire; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.fire = null; return }
  if (d.t === FB_FIRE.STARTUP && api) { const r = d.rec, rem = FB_FIRE.TOTAL - d.t, look = { ...r.look }, hidden = !!look.hidden; delete look.hidden
    const w = r.w || (r.radius ? r.radius * 2 : 24), h = r.h || (r.radius ? r.radius * 2 : 24)
    api.spawnProjectile(f, "fb_return_" + r.name, { ...r.tags, ...look, damage: fireDamage(r), speed: 0, vx: d.vx, vy: d.vy, w, h,
      spawnX: armEdge(f, d.face) + d.face * w / 2, spawnY: armY(f), lifetime: Math.ceil(FB_FIRE.RANGE / Math.max(4, r.speed || 8)), isSpecial: true,
      hitstun: 22, blockstun: blockstunFor(rem, FB_FIRE.ON_BLOCK), knockbackX: 4, knockbackY: -2, fbReturned: true,
      alien: { fb: "fire", returned: true, electric: true, pip: false, cast: d.cast, hidden: hidden || !look.sheet, from: r.name } }, {}) }
  f._spriteCastMove = "fbFire"; f._spriteCastTimer = Math.max(2, FB_FIRE.TOTAL - d.t)
  if (d.t >= FB_FIRE.TOTAL) s.fire = null
}

// OVERLOAD BURST (←↙↓ + P, 14; needs Charge ≥ 25 — below that it is refused, free) — 16f, a 150 px radial burst around him,
// 30 + 0.4 × Charge (max 70), spends ALL Charge (at the cast), knockback away from him, −14 on block. No Drain pip.
export const FB_BURST = { STARTUP: 16, ACTIVE: 3, RECOVERY: 22, MIN: 25, BASE: 30, PER: 0.4, MAX: 70, R: 150, ON_BLOCK: -14 }
FB_BURST.TOTAL = FB_BURST.STARTUP + FB_BURST.ACTIVE + FB_BURST.RECOVERY
export const burstDamage = charge => Math.min(FB_BURST.MAX, FB_BURST.BASE + FB_BURST.PER * charge)
function castBurst(f, s, api) {
  if (s.charge < FB_BURST.MIN) { s.stats.burstRejects++; return false }
  const c = beginCast(f, s, api, "fbBurst", FB_COST.burst, FB_BURST.TOTAL); if (!c) return false
  const charge = spendCharge(s)
  s.burst = { t: 0, cast: c.cast, dmg: burstDamage(charge), charge }; s.stats.bursts++
  return true
}
CASTS.burst = castBurst
function tickBurst(f, s, api, opp) {
  const d = s.burst; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.burst = null; return }
  if (d.t === FB_BURST.STARTUP) { const face = opp ? (cx(opp) >= cx(f) ? 1 : -1) : (f.facing || 1), rem = FB_BURST.TOTAL - d.t
    hitbox(f, api, "fb_burst", face, { damage: d.dmg, spawnX: cx(f), spawnY: f.y + (f.h || 110) / 2, w: FB_BURST.R * 2, h: Math.max(FB_BURST.R * 2, (f.h || 110) + 40),
      lifetime: FB_BURST.ACTIVE, hitstun: rem + 14, blockstun: blockstunFor(rem, FB_BURST.ON_BLOCK), knockbackX: 9, knockbackY: -5,
      alien: { fb: "burst", pip: false, cast: d.cast } }) }
  f._spriteCastMove = "fbBurst"; f._spriteCastTimer = Math.max(2, FB_BURST.TOTAL - d.t)
  if (d.t >= FB_BURST.TOTAL) s.burst = null
}

// CONDUIT DASH (→→ + P, 10) — 4f, then he becomes current and dashes 300 px in 12f (the hitbox rides with him), 45; −12 on block;
// a clean hit +1 Drain.
export const FB_DASH = { STARTUP: 4, FRAMES: 12, DIST: 300, RECOVERY: 18, DMG: 45, ON_BLOCK: -12, W: 70, H: 90 }
FB_DASH.TOTAL = FB_DASH.STARTUP + FB_DASH.FRAMES + FB_DASH.RECOVERY
function castDash(f, s, api) {
  if (!grounded(f)) return false
  const c = beginCast(f, s, api, "fbDash", FB_COST.dash, FB_DASH.TOTAL); if (!c) return false
  s.dash = { t: 0, cast: c.cast, face: f.facing || 1, x0: f.x, done: false }; s.stats.dashes++
  return true
}
CASTS.dash = castDash
function endDash(f, s, api) {
  const d = s.dash; if (!d || d.done) return
  d.done = true; delete f._benGlide; f.vx = 0
  if (api) { const L = api.activeProjectiles(); for (let i = L.length - 1; i >= 0; i--) if (L[i] && L[i].owner === f && L[i].alien && L[i].alien.fb === "dash") L.splice(i, 1) }
}
function tickDash(f, s, api) {
  const d = s.dash; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endDash(f, s, api); s.dash = null; return }
  const live = d.t - FB_DASH.STARTUP, v = FB_DASH.DIST / FB_DASH.FRAMES
  if (live === 0) hitbox(f, api, "fb_dash", d.face, { damage: FB_DASH.DMG, vx: d.face * v, spawnX: cx(f) + d.face * (f.w || 60) / 2, spawnY: f.y + (f.h || 110) * 0.5,
    w: FB_DASH.W, h: FB_DASH.H, lifetime: FB_DASH.FRAMES, hitstun: FB_DASH.RECOVERY + 6, blockstun: blockstunFor(FB_DASH.RECOVERY, FB_DASH.ON_BLOCK),
    knockbackX: 5, knockbackY: -2, alien: { fb: "dash", pip: true, cast: d.cast } })
  if (live >= 0 && live < FB_DASH.FRAMES) f._benGlide = { vx: d.face * v, vy: 0 }
  else if (live >= FB_DASH.FRAMES) endDash(f, s, api)
  f._spriteCastMove = "fbDash"; f._spriteCastTimer = Math.max(2, FB_DASH.TOTAL - d.t)
  if (d.t >= FB_DASH.TOTAL) { endDash(f, s, api); s.dash = null }
}

// VOLT SHOT (air, any special in the air; 12) — a plasma orb fired diagonally DOWN-forward, 40; once per airtime; no jump refill.
export const FB_VOLT = { STARTUP: 8, RECOVERY: 16, DMG: 40, SPEED: 9, LIFE: 50, W: 28, H: 28 }
FB_VOLT.TOTAL = FB_VOLT.STARTUP + FB_VOLT.RECOVERY
function castVolt(f, s, api) {
  if (grounded(f) || s.voltUsed) return false
  const c = beginCast(f, s, api, "fbVolt", FB_COST.volt, FB_VOLT.TOTAL, { commit: false }); if (!c) return false
  s.voltUsed = true
  s.volt = { t: 0, cast: c.cast, face: f.facing || 1 }; s.stats.volts++
  return true
}
CASTS.volt = castVolt
function tickVolt(f, s, api) {
  const d = s.volt; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { s.volt = null; return }
  if (d.t === FB_VOLT.STARTUP) { const v = FB_VOLT.SPEED / Math.SQRT2
    hitbox(f, api, "fb_volt", d.face, { damage: FB_VOLT.DMG, vx: d.face * v, vy: v, spawnX: armEdge(f, d.face), spawnY: f.y + (f.h || 110) * 0.6,
      w: FB_VOLT.W, h: FB_VOLT.H, lifetime: FB_VOLT.LIFE, hitstun: 22, blockstun: 10, knockbackX: 3, knockbackY: 2,
      alien: { fb: "volt", pip: false, cast: d.cast } }) }
  f._spriteCastMove = "fbVolt"; f._spriteCastTimer = Math.max(2, FB_VOLT.TOTAL - d.t)
  if (d.t >= FB_VOLT.TOTAL || (grounded(f) && d.t > FB_VOLT.STARTUP)) s.volt = null
}

// ── ULTIMATE: FULL FEEDBACK (cost 55) ───────────────────────────────────────────────────────────────────────
// A CLEAN tether opener (the Siphon Cable, 40, 300 px at 16f); a whiff or block = no cinematic, 60f recovery. Then (opponent held,
// no collision change; he is invulnerable only inside the scripted cinematic):
//   DRAIN 0–40f: the opponent's Power is drained to 0; half of what they had (max 40) becomes Charge.
//   PULSES 40–100f: 4 × 25 down the cable.
//   DISCHARGE 120f: 100 + 0.4 × Charge (max +40), then Charge → 0.
// Total 40 + 100 + 100–140 = 240–280 raw. Positions restore; 100f lockout. Current / glow / the enlarged orb are render-only.
export const FB_ULT = { OPENER_AT: 16, OPENER: 40, RANGE: 300, WHIFF: 60, DRAIN: 40, PULSE_AT: [44, 60, 76, 92], PULSE: 25,
  DISCHARGE_AT: 120, DISCHARGE: 100, PER: 0.4, BONUS_MAX: 40, GAIN_MAX: 40, END: 150, LOCKOUT: 100, LAUNCH: -12 }
export const dischargeDamage = charge => FB_ULT.DISCHARGE + Math.min(FB_ULT.BONUS_MAX, FB_ULT.PER * charge)
function fireUltimate(f, ctx, api) {
  const s = fbState(f); if (!s) return false
  if (!canAct(f, s)) return false
  if (!api.spendEnergy(f, FB_COST.ultimate)) return false
  s.castId++
  const face = f.facing || 1, total = FB_ULT.OPENER_AT + FB_ULT.WHIFF
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "fbSiphon"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId, hits: [], drained: 0, gain: 0, discharge: 0 }
  s.stats.ults++
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, FB_ULT.OPENER_AT, () => hitbox(f, api, "fb_ult_open", face, {
    damage: FB_ULT.OPENER, spawnX: armEdge(f, face) + face * FB_ULT.RANGE / 2, spawnY: armY(f) + 6, w: FB_ULT.RANGE, h: 60,
    lifetime: 3, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { fb: "ultOpen", pip: false, cast: s.castId } }))
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "drain"; u.t = 0; u.raw = FB_ULT.OPENER; u.hits.push(FB_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  u.drained = target.energy || 0; target.energy = 0                            // drained to 0
  u.gain = addCharge(s, Math.min(FB_ULT.GAIN_MAX, u.drained / 2)); s.stats.drained += u.drained
  if (s.drain.boT > 0) s.drain.lastE = 0
  f.attackCooldown = FB_ULT.END + FB_ULT.LOCKOUT; f._benPowerCommit = FB_ULT.END; f._spriteCastTimer = FB_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, FB_ULT.END + 2)                 // cinematic only (the opponent is held)
}
function tickUlt(f, s, opp, api, ctx) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > FB_ULT.OPENER_AT + 12) s.ult = null; return }   // whiff / block: no cinematic
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y   // held (no collision change)
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  s.chargeT = 0                                                                // the gauge does not decay inside the cinematic
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "full_feedback", source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 8) }
  if (u.t < FB_ULT.DRAIN) { u.phase = "drain"; f._spriteCastMove = "fbSiphon" }
  else if (u.t < FB_ULT.DISCHARGE_AT - 10) { u.phase = "pulses"; f._spriteCastMove = "fbBurst"
    const k = FB_ULT.PULSE_AT.indexOf(u.t); if (k >= 0) hit(FB_ULT.PULSE, 4 + k * 2) }
  else if (u.t < FB_ULT.END) { u.phase = "discharge"; f._spriteCastMove = "fbFire"
    if (u.t === FB_ULT.DISCHARGE_AT) { u.discharge = dischargeDamage(s.charge); spendCharge(s); hit(u.discharge, 18) } }
  else { endUlt(f, s, opp); return }
  f._spriteCastTimer = 2
}
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }        // positions restore
  if (opp && u?.thome) {
    opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = (cx(opp) >= cx(f) ? 1 : -1) * 3; opp.vy = FB_ULT.LAUNCH
    opp.onGround = false; opp.grounded = false; opp.isLaunched = true
  }
  spendCharge(s)                                                               // Charge → 0
  s.lastUltRaw = u?.raw || 0; s.lastUltDrain = u?.drained || 0; s.lastUlt = u ? { hits: u.hits.slice(), gain: u.gain, discharge: u.discharge } : null
  s.ult = null
  f.attackCooldown = FB_ULT.LOCKOUT; f._benPowerCommit = FB_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── hooks ───────────────────────────────────────────────────────────────────────────────────────────────────
// SIPHON CABLE / the ult's tether: the cable is part of his hurtbox while it is out (whiff-punishable)
function hurtbox(f) {
  const s = fbState(f); if (!s) return null
  const L = s.siphon ? { t: s.siphon.t, face: s.siphon.face } : (s.ult && s.ult.phase === "opener" ? { t: s.ult.t, face: s.ult.face } : null)
  const ext = L ? cableExt(L.t) : 0
  if (!(ext > 0)) return null
  const body = { x: f.x + 6, y: f.y + 6, w: Math.max(1, (f.w || 60) - 12), h: Math.max(1, (f.h || 110) - 6) }
  const edge = armEdge(f, L.face), ay = armY(f) - FB_SIPHON.H / 2 + 6
  const x0 = Math.min(body.x, edge, edge + L.face * ext), x1 = Math.max(body.x + body.w, edge, edge + L.face * ext)
  return { x: x0, y: Math.min(body.y, ay), w: x1 - x0, h: Math.max(body.y + body.h, ay + FB_SIPHON.H) - Math.min(body.y, ay) }
}
function damageDealt(f, target, raw, opts) { return raw }
function onContact(f, target, { proj = null, move = null, blocked = false } = {}) {
  const s = fbState(f); if (!s || blocked || !target || target === f) return
  const tag = proj && proj.alien
  if (proj && tag && tag.pip === true && addPip(f, s, tag.cast) && s.drain.pips >= FB_DRAIN.MAX) startBlackout(f, s, target)   // the same frame the 3rd lands
  if (proj && tag && tag.fb === "siphon") siphonHit(f, s, target, tag.cast)
  if (proj && tag && tag.fb === "ultOpen" && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
  if (proj && tag && tag.fb === "siphon") return                                 // Siphon pays its own +15 (section 6)
  if (proj && tag && /^ult/.test(String(tag.fb || ""))) return                  // the ult's beats: no Charge (fixed total)
  if (proj ? (electricMove(proj) || !!(tag && tag.fb)) : (!move || electricMove(move) || !!f.basic_attacks?.[move.name]?.electric)) addCharge(s, FB_CHARGE.ELECTRIC)   // a clean electric hit: +4
}
// render-only: the held opponent lifts and jitters on the cable
function targetOffset(f, target) {
  const s = fbState(f); const u = s && s.ult; if (!u || !u.thome || u.phase === "opener") return null
  return { dx: u.phase === "pulses" && (u.t >> 1) % 2 ? 2 : 0, dy: -Math.round(Math.min(1, u.t / 20) * 10) }
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
const _imgs = {}
function sheetImg(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  return _imgs[src].complete && _imgs[src].naturalWidth ? _imgs[src] : null
}
export const FX_SCALE = 2                                                     // extracted FX: integer nearest-neighbour ×2
// draw one extracted FX frame CENTRED on (x, y)
function fxFrame(c, key, i, x, y, scale = FX_SCALE, flip = 1, alpha = 1) {
  const a = FEEDBACK_FX[key]; const img = a && sheetImg(a.sheet); if (!img || !(scale > 0)) return false
  const k = ((i | 0) % a.frames + a.frames) % a.frames, dw = Math.round(a.w * scale), dh = Math.round(a.h * scale)
  c.save(); c.globalAlpha *= alpha; c.imageSmoothingEnabled = false; c.translate(Math.round(x), Math.round(y)); if (flip < 0) c.scale(-1, 1)
  c.drawImage(img, k * a.w, 0, a.w, a.h, Math.round(-dw / 2), Math.round(-dh / 2), dw, dh); c.restore()
  return true
}
function rHash(a, b, k) {   // render-only deterministic hash → [0, 1) (spark jitter)
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((k | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
// a pixel lightning bolt between two points (render-only)
function bolt(c, x0, y0, x1, y1, col, seed, k = 3, jag = 10) {
  c.fillStyle = col
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14))
  let ax = x0, ay = y0
  for (let i = 1; i <= n; i++) {
    const bx = x0 + (x1 - x0) * i / n, by = y0 + (y1 - y0) * i / n + (i < n ? (rHash(seed, i, 3) - 0.5) * jag * 2 : 0)
    const m = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / k))
    for (let j = 0; j <= m; j++) px(c, ax + (bx - ax) * j / m, ay + (by - ay) * j / m, k)
    ax = bx; ay = by
  }
}
// the Siphon Cable: the extracted wavy cable tiled along the reach, the bend frames at his plug, the plug tip at the end
function drawCable(c, f, face, ext, y, t, current = false) {
  if (!(ext > 0)) return
  const edge = armEdge(f, face), cab = FEEDBACK_FX.cable, seg = cab.w * FX_SCALE * 0.8
  let drawn = false
  for (let x = seg / 2; x < ext; x += seg) drawn = fxFrame(c, "cable", (Math.floor(x / seg) + (t >> 3)) % cab.frames, edge + face * x, y, FX_SCALE, face) || drawn
  if (!drawn) { c.fillStyle = INK; c.fillRect(Math.round(face > 0 ? edge : edge - ext), Math.round(y - 3), Math.round(ext), 6); c.fillStyle = "#3f3f46"; c.fillRect(Math.round(face > 0 ? edge : edge - ext), Math.round(y - 1), Math.round(ext), 2) }
  const bend = ext < FB_SIPHON.RANGE ? "bend" : "bendDark", bi = Math.min(FEEDBACK_FX[bend].frames - 1, Math.floor(ext / FB_SIPHON.RANGE * FEEDBACK_FX[bend].frames))
  fxFrame(c, bend, bi, edge + face * 10, y - 4, FX_SCALE, face)
  if (!fxFrame(c, "plug", t >> 3, edge + face * ext, y, FX_SCALE, face)) { c.fillStyle = "#bf8f26"; px(c, edge + face * ext, y, 10) }
  if (current) { c.fillStyle = (t >> 1) % 2 ? CYN : WHT; for (let k = 0; k < 4; k++) px(c, edge + face * (((t * 14 + k * ext / 4) % ext)), y + ((k + t) % 3) - 1, 5) }
}
export function drawFeedbackUnder(c, f) {}
export function drawFeedbackFx(c, f, frame = 0, opp = null) {
  const s = fbState(f); if (!s) return
  const t = s.t, bx = cx(f), h = f.h || 110
  if (s.guard.t > 0 || s.guard.beamT > 0) {   // PLUG GUARD: spark ring round him
    c.fillStyle = (t >> 1) % 2 ? YEL : CYN
    for (let k = 0; k < 10; k++) { const a = k * 0.628 + t * 0.2; px(c, bx + Math.cos(a) * (f.w || 58) * 0.8, f.y + h * 0.45 + Math.sin(a) * h * 0.45, 4) }
  }
  if (s.stored) { const face = f.facing || 1, a = Math.min(1, s.stored.t / 30)   // the stored shot humming in his plug hand
    if (!fxFrame(c, "stored", t >> 2, armEdge(f, face) + face * 6, armY(f), 1, face, 0.5 + 0.5 * a)) { c.fillStyle = CYN; px(c, armEdge(f, face) + face * 6, armY(f), 12) } }
  if (s.siphon) drawCable(c, f, s.siphon.face, cableExt(s.siphon.t), armY(f) + 6, t, s.siphon.hit)
  if (s.ult && s.ult.phase === "opener") drawCable(c, f, s.ult.face, cableExt(s.ult.t, FB_ULT.RANGE), armY(f) + 6, t)
  if (f.attacking && f.currentAttack && FEEDBACK.basic_attacks[f.currentAttack.name]) {   // normals: a pixel plug spark at the strike point
    const a = f.currentAttack, e = a.total - a.timer, face = f.facing || 1
    if (e >= a.activeStart - 1 && e <= a.activeEnd + 2) { const md = FEEDBACK.basic_attacks[a.name], reach = Math.max(20, Math.min(md.rangeX || 90, 150) - (f.w || 58) / 2)
      const y = a.name === "down" ? f.y + h * 0.8 : a.name === "up" ? f.y + h * 0.1 : armY(f)
      bolt(c, armEdge(f, face), armY(f), armEdge(f, face) + face * reach, y, (t >> 1) % 2 ? CYN : WHT, t + a.name.length, 3, 6) }
  }
  if (s.dash && s.dash.t > FB_DASH.STARTUP && !s.dash.done) {   // CONDUIT DASH: the extracted burst + streak trailing him
    const face = s.dash.face; if (!fxFrame(c, "dash", 0, bx - face * 50, f.y + h * 0.5, 1.5, face, 0.85)) { c.fillStyle = CYN; c.fillRect(Math.round(bx - face * 120), Math.round(f.y + h * 0.4), 120, 14) } }
  if (s.burst && s.burst.t >= FB_BURST.STARTUP - 2 && s.burst.t <= FB_BURST.STARTUP + FB_BURST.ACTIVE + 6) {   // OVERLOAD: pixel radial ring
    const k = Math.min(1, (s.burst.t - FB_BURST.STARTUP + 3) / 6), R = FB_BURST.R * k, cy = f.y + h / 2
    for (let i = 0; i < 28; i++) { const a = i * 0.2244; c.fillStyle = i % 2 ? CYN : WHT; px(c, bx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.75, 5) }
    for (let i = 0; i < 6; i++) bolt(c, bx, cy, bx + Math.cos(i * 1.047) * R, cy + Math.sin(i * 1.047) * R * 0.75, BLU, s.burst.cast * 9 + i, 3, 8)
  }
  if (projRef) for (const p of projRef) {   // his hidden hitboxes that are visible things
    if (!p || p.owner !== f || !p.alien || !p.alien.fb) continue
    const k = p.alien.fb, face = (p.vx || 0) >= 0 ? 1 : -1
    if (k === "orb" || k === "volt") { if (!fxFrame(c, "orb", frame >> 2, p.x, p.y, k === "volt" ? 1.5 : FX_SCALE, face)) { c.fillStyle = CYN; px(c, p.x, p.y, 26) } }
    else if (k === "fire" && p.alien.hidden) { if (!fxFrame(c, "stored", frame >> 2, p.x, p.y, FX_SCALE, face)) { c.fillStyle = WHT; px(c, p.x, p.y, 22) } }
  }
  if (opp && (s.drain.pips > 0 || s.drain.boT > 0)) {   // DRAIN pips over the opponent; BLACKOUT = dark static on them
    const ox = cx(opp), top = opp.y, oh = opp.h || 110, d = s.drain
    if (d.boT > 0) {
      for (let i = 0; i < 8; i++) { const r = rHash(t >> 1, i, 41); if (r < 0.3) continue
        c.fillStyle = i % 2 ? "#0b1020" : CYN; c.globalAlpha = 0.7
        c.fillRect(Math.round(ox - (opp.w || 60) * 0.7 + rHash(t >> 1, i, 43) * 10), Math.round(top + r * oh), Math.round((opp.w || 60) * 1.4 * (0.3 + r * 0.7)), 2) }
      c.globalAlpha = 1; c.fillStyle = (t >> 3) % 2 ? RED : WHT; c.font = "bold 10px monospace"; c.textAlign = "center"; c.fillText("BLACKOUT", ox, top - 18)
    } else for (let k = 0; k < FB_DRAIN.MAX; k++) {
      const x = ox - 12 + k * 12, y = top - 14; c.fillStyle = INK; c.fillRect(x - 4, y - 4, 9, 9)
      c.fillStyle = k < d.pips ? BLU : "#334155"; c.fillRect(x - 3, y - 3, 7, 7); if (k < d.pips) { c.fillStyle = WHT; c.fillRect(x - 1, y - 1, 2, 2) }
    }
  }
  if (s.ult && s.ult.thome && opp) {   // FULL FEEDBACK (render-only): cable + current → pulses → the enlarged orb Discharge
    const u = s.ult, face = cx(opp) >= bx ? 1 : -1, ext = Math.max(0, Math.abs(cx(opp) - armEdge(f, face))), oy = opp.y + (opp.h || 110) / 2
    drawCable(c, f, face, ext, armY(f) + 6, u.t, true)
    if (u.phase === "drain") { c.fillStyle = YEL; for (let k = 0; k < 5; k++) px(c, cx(opp) - face * ((u.t * 6 + k * 24) % Math.max(1, ext)), armY(f) + 6, 5) }   // energy flowing to him
    if (u.phase === "pulses") FB_ULT.PULSE_AT.forEach((at, i) => { if (u.t >= at && u.t - at < 8) bolt(c, armEdge(f, face), armY(f), cx(opp), oy, i % 2 ? CYN : WHT, u.cast * 7 + i, 4, 16) })
    if (u.phase === "discharge") { const k = Math.min(1, (u.t - (FB_ULT.DISCHARGE_AT - 10)) / 10), x = armEdge(f, face) + face * (ext * Math.min(1, Math.max(0, (u.t - FB_ULT.DISCHARGE_AT + 6) / 6)))
      fxFrame(c, "stored", u.t >> 2, x, oy, FX_SCALE * 2 * k, face)
      if (Math.abs(u.t - FB_ULT.DISCHARGE_AT) < 6) { c.save(); c.globalAlpha = 0.55; c.fillStyle = WHT; c.fillRect(cx(opp) - 90, oy - 90, 180, 180); c.restore() } }
  }
}
const INK = "#05070d", BLU = "#38bdf8", CYN = "#a5f3fc", WHT = "#f0fbff", YEL = "#d9f99d", RED = "#ff5b5b"
export function drawFeedbackHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = fbState(f); if (!ctx || !s) return
  const y = enY + enH + 3, w = 64, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save(); ctx.textBaseline = "top"
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, y, w, 5)                                   // CHARGE bar
  ctx.fillStyle = s.charge >= 25 ? BLU : CYN; ctx.fillRect(bx + 1, y + 1, Math.round((w - 2) * s.charge / FB_CHARGE.MAX), 3)
  ctx.font = "bold 7px Arial"; ctx.textAlign = flip ? "right" : "left"; ctx.fillStyle = "#e5e7eb"
  ctx.fillText(`CHARGE ${Math.round(s.charge)}`, flip ? bx + w : bx, y + 7)
  const r = s.stored, sx = flip ? bx + w - 14 : bx + w + 4                                  // STORED slot + its 180f life
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(sx, y - 1, 12, 12); ctx.strokeStyle = r ? BLU : "#4b5563"; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, y - 0.5, 11, 11)
  if (r) { ctx.fillStyle = CYN; ctx.fillRect(sx + 3, y + 2, 6, 6); ctx.fillStyle = WHT; ctx.fillRect(sx + 1, y + 12, Math.round(10 * r.t / FB_GUARD.STORE), 1) }
  ctx.fillStyle = s.guard.t > 0 || s.guard.beamT > 0 ? YEL : s.guard.cd > 0 ? "#9ca3af" : "#e5e7eb"
  ctx.fillText(s.guard.t > 0 || s.guard.beamT > 0 ? "PLUG GUARD" : s.guard.cd > 0 ? `GUARD ${Math.ceil(s.guard.cd / 60)}s` : "GUARD", flip ? bx + w : bx, y + 14)
  const d = s.drain
  ctx.fillStyle = d.boT > 0 ? RED : d.pips ? BLU : "#e5e7eb"
  ctx.fillText(d.boT > 0 ? `BLACKOUT ${Math.ceil(d.boT / 60)}s` : d.immuneT > 0 ? `DRAIN (immune ${Math.ceil(d.immuneT / 60)}s)` : `DRAIN ${"■".repeat(d.pips)}${"□".repeat(FB_DRAIN.MAX - d.pips)}`, flip ? bx + w : bx, y + 21)
  ctx.restore()
}
