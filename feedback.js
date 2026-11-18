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
  id: FB_KEY, poolKey: FB_KEY, displayName: "Feedback", slot: 15,
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
  //@@TICK@@
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
// double tap = Conduit Dash), ← Siphon Cable, ↑ Return Fire, ↓ Overload Burst.
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
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "siphon"
  if (dir === "D") return "burst"
  if (dir === "U") return "fire"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= FB_DASH_WINDOW) return "dash"
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
export const FB_GUARD = { WINDOW: 10, CD: 300, GAIN: 0.5, MAX_GAIN: 30, BEAM_MAX: 30, BEAM_GAIN: 0.5, STORE: 180 }
const ELEMENT = /fire|flame|burn|electric|lightning|thunder|volt|plasma|beam|laser|energy|ki\b|chakra|blast/i
const tagged = m => !!m && !!(m.fire || m.electric || m.beam || m.isBeam || m.laser || m.energy || (m.alien && m.alien.beam) ||
  ELEMENT.test(String(m.element || "")) || ELEMENT.test(String(m.damageType || "")))
const passes = m => !!m && !!(m.unblockable || m.isUltimate || m.isCinematic || m.cinematic || m.isGrab || m.isThrow || m.grab || m.throw ||
  ["grab", "throw", "ultimate"].includes(m.category))
const beamOf = p => isBeam(p) || !!(p && p.alien && p.alien.beam)
export const guardOpen = s => !!s && s.guard.t > 0
const beamOpen = s => !!s && s.guard.beamT > 0 && s.guard.beamT <= FB_GUARD.BEAM_MAX && s.blockHeld
function blockHeavy(f) {
  const s = fbState(f); if (!s) return false
  const g = s.guard
  if (g.cd > 0 || busy(s) || (f.hitstun || 0) > 0 || f.attacking || !f.transformed) return false
  g.t = FB_GUARD.WINDOW; g.cd = FB_GUARD.CD; g.beamT = 0; s.stats.guards++
  f._spriteCastMove = "fbGuard"; f._spriteCastTimer = FB_GUARD.WINDOW; f._benPowerCommit = FB_GUARD.WINDOW; f.attackCooldown = FB_GUARD.WINDOW; f.vx = 0
  return true
}
function tickGuard(f, s) {
  const g = s.guard
  if (g.t > 0) g.t--
  if (g.cd > 0) g.cd--
  if (g.beamT > 0) { if (!s.blockHeld || g.beamT > FB_GUARD.BEAM_MAX) g.beamT = 0; else { g.beamT++; f._spriteCastMove = "fbGuard"; f._spriteCastTimer = 2 } }
}
const gainOf = dmg => Math.min(FB_GUARD.MAX_GAIN, Math.max(0, dmg || 0) * FB_GUARD.GAIN)
const LOOK = ["color", "sheet", "spriteFrames", "spriteW", "spriteH", "spriteSpeed", "spriteScale", "radius", "w", "h", "rectHitbox", "frameW", "frameH"]
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
  if (p.visualOnly || p.owner === f || p._fbAbsorbed || p.fbReturned || passes(p)) return false
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

// ── hooks filled by the later sections (defaults: no-op) ───────────────────────────────────────────────────
function hurtbox(f) { return null }
function damageDealt(f, target, raw, opts) { return raw }
function onContact(f, target, { proj = null, move = null, blocked = false } = {}) {
  const s = fbState(f); if (!s || blocked || !target || target === f) return
  const tag = proj && proj.alien
  if (proj && tag && tag.pip === true && addPip(f, s, tag.cast) && s.drain.pips >= FB_DRAIN.MAX) startBlackout(f, s, target)   // the same frame the 3rd lands
  //@@CONTACT@@
  if (proj && tag && tag.fb === "siphon") return                                 // Siphon pays its own +15 (section 6)
  if (proj && tag && /^ult/.test(String(tag.fb || ""))) return                  // the ult's beats: no Charge (fixed total)
  if (proj ? electricMove(proj) : (!move || electricMove(move) || !!f.basic_attacks?.[move.name]?.electric)) addCharge(s, FB_CHARGE.ELECTRIC)   // a clean electric hit: +4
}
function fireUltimate(f, ctx, api) { return false }
function targetOffset(f, target) { return null }

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
export function drawFeedbackUnder(c, f) {}
export function drawFeedbackFx(c, f, frame = 0, opp = null) {}
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
  //@@HUD@@
  ctx.restore()
}
