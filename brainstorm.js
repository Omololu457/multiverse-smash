// brainstorm.js — BRAINSTORM (Cerebrocrustacean), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects never write it.
// Simulation randomness: hash(match seed, frame, player index) only (bsHash).
import { BRAINSTORM_ANIM, BRAINSTORM_GEOM } from "./brainstormAssets.js"
export { BRAINSTORM_ANIM, BRAINSTORM_GEOM }

// CLOSED (dome down) frame set = the generated table. OPEN (dome up) frame set = the same table with the locomotion / idle /
// air poses swapped for the two dome-up frames (Col 3 R8 + the right-extra dome frame). Render aliases only; no new art.
const A0 = BRAINSTORM_ANIM
const ANIM = { ...A0 }
const OPEN_ANIM = { ...A0, idle: A0.open_idle, walk: A0.open_walk, walk_back: A0.open_walk, run: A0.open_walk, dash: A0.open_walk,
  jump: A0.open_jump, doubleJump: A0.open_jump, fall: A0.open_jump, guard: A0.open_idle, crouch: A0.open_idle, win: A0.open_idle }
export { ANIM as BS_CLOSED_ANIM, OPEN_ANIM as BS_OPEN_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const BRAINSTORM = {
  id: "brainstorm", poolKey: "brainstorm", displayName: "Brainstorm", slot: 9,
  status: "ready", sheetPath: "./ben10_brainstorm_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/brainstorm/SPRITE_LEDGER.md",
  mods: { speed: 0.85, damage: 1.00, defense: 1.10, weight: 1.00 },   // defense 1.10 = dome CLOSED (the form's resting state)
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Brain Bolt", special2: "Neural Burst", special3: "Psychic Pull", special4: "Calculated Strike", special5: "Overcharge",
    ultimate: "Neural Tempest" },
  basic_attacks: {
    light:  normal(16, 6, 3, 12, 0),                                                         // claw poke (render lunge)
    heavy:  normal(52, 15, 4, 24, -7, { knockbackX: 7, rangeX: 160 }),                        // claw clamp, 160 px
    down:   normal(24, 8, 3, 16, -4, { hitLevel: "low" }),                                    // leg sweep, hits low
    up:     normal(44, 12, 4, 26, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // psychic lift, upward
    air:    normal(28, 8, 4, 12, 2)                                                           // air claw
  },
  anim: ANIM,
  onApply, tick, blockLight, moveFrames, damageDealt, incomingScale, fireSpecial, fireUltimate, struck, specialTax, onContact, blockHeavy, absorb, bodyOffset, targetOffset,
  drawHud: drawBrainstormHud, drawFx: drawBrainstormFx, drawUnder: drawBrainstormUnder
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshBrainstormState() {
  return { kind: "brainstorm", t: 0, castId: 0,
    dome: "closed", domeT: 0, toggles: 0, noAttack: false, buffer: null, drained: 0,
    read: { log: [], cat: null, t: 0, lock: 0, lastCat: null, lastT: -999, triggers: 0, consumed: 0 },
    syn: { pips: 0, pipT: 0, lastPipCast: -1, scT: 0, immune: 0, scs: 0, taxed: 0 },
    fwdPrev: false, fwdTapT: -999, dashTapT: -999, ocUsed: false,
    bolt: null, burst: null, pull: null, strike: null, oc: null, ult: null, lastUltRaw: 0, lastRead: null,
    shield: { t: 0, cd: 0, caught: 0, ret: null },
    stats: { bolts: 0, bursts: 0, pulls: 0, pullHits: 0, strikes: 0, ocs: 0, ults: 0, reads: 0 } }
}
export const bsState = f => (f?.omnitrix?.formState?.kind === "brainstorm" && f.transformed && f.activeAlien === "brainstorm") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshBrainstormState()
  f.defenseMultiplier = BS_DOME.CLOSED_DEF
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = bsState(f); if (!s) return
  s.t++
  tickDome(f, s, api)
  tickRead(s)
  tickSynapse(s)
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  if (opp && opp._benTaxedSpecial && --opp._benTaxedSpecial.t <= 0) api.fireTaxedSpecial(opp)   // Short-Circuit: release the held special
  if (f.onGround || f.grounded) s.ocUsed = false                         // Overcharge: once per airtime
  tickDashTap(f, s, input || {})
  tickShield(f, s, api, opp)
  tickBolt(f, s, api)
  tickBurst(f, s)
  tickPull(f, s, opp)
  tickStrike(f, s, api)
  tickOvercharge(f, s)
  tickUlt(f, s, opp, api, ctx)
}

// ── THE DOME (GAME_STATE) ─────────────────────────────────────────────────────────────────────────────────
// Block + Light tap toggles it (the form's own toggle — the shared ready-form blockLight hook, Ghostfreak's Phase input).
// 18f to open, 24f to close; refused in hitstun, during his own active frames and during the ultimate; committed (no
// attacks, no walk) while it moves. Resets to CLOSED on swap / revert / KO / rematch (fresh formState).
//   CLOSED  defense ×1.10, no lightning specials, Mind Shield available, the closed frame set.
//   OPEN    defense ×0.80 (brain exposed), lightning-tagged damage ×1.25, Power drain +2/s, the dome-up frame set.
// The brain is exposed from the moment the dome is fully up until it is fully closed again (open + closing); while it
// is opening it still counts as closed.
export const BS_DOME = { OPEN: 18, CLOSE: 24, CLOSED_DEF: 1.10, OPEN_DEF: 0.80, LTN_MULT: 1.25, DRAIN_PER_SEC: 2 }
export const domeExposed = s => !!s && (s.dome === "open" || s.dome === "closing")
export function inOwnActiveFrames(f) {
  const a = f.attacking && f.currentAttack
  if (!a) return false
  const el = (a.total || 0) - (a.timer || 0)
  return el >= (a.activeStart || 0) && el <= (a.activeEnd ?? a.activeStart ?? 0)
}
export function canToggleDome(f, s) {
  return !!s && (s.dome === "closed" || s.dome === "open") && !((f.hitstun || 0) > 0) && !inOwnActiveFrames(f) && !s.ult
}
function beginDome(f, s, to) {
  const n = to === "open" ? BS_DOME.OPEN : BS_DOME.CLOSE
  s.dome = to === "open" ? "opening" : "closing"; s.domeT = n; s.toggles++
  f.attacking = false; f.currentAttack = null; f.currentMove = null
  // committed: no walk / jump / guard (_benPowerCommit), no normals (moveFrames), no throw (formState.noAttack). Not
  // attackCooldown — a lightning special pressed while it opens must still reach fireSpecial to be buffered.
  f._benPowerCommit = Math.max(f._benPowerCommit || 0, n); s.noAttack = true; f.vx = 0
  f._spriteCastMove = to === "open" ? "bsDomeOpen" : "bsDomeClose"; f._spriteCastTimer = n
}
export function toggleDome(f, s) {
  if (!canToggleDome(f, s)) return false
  beginDome(f, s, s.dome === "closed" ? "open" : "closed")
  return true
}
// blockLight hook (game.js Omnitrix input handler): the Light press is consumed so it never also jabs.
function blockLight(f) {
  const s = bsState(f); if (!s) return false
  toggleDome(f, s)
  return true
}
function tickDome(f, s, api) {
  if (s.dome === "opening" || s.dome === "closing") {
    f.vx = 0
    if (--s.domeT <= 0) {
      s.domeT = 0; s.dome = s.dome === "opening" ? "open" : "closed"; s.noAttack = false; f._benPowerCommit = 0
      if (s.dome === "open" && s.buffer) { const b = s.buffer; s.buffer = null; castBuffered(f, s, api, b) }
      if (s.dome === "closed") s.buffer = null
    }
  }
  f.defenseMultiplier = domeExposed(s) ? BS_DOME.OPEN_DEF : BS_DOME.CLOSED_DEF
  if (domeExposed(s) && !s.ult) {                                         // +2 Power/s on top of the device drain
    const d = Math.min(f.energy || 0, BS_DOME.DRAIN_PER_SEC / 60); f.energy = (f.energy || 0) - d; s.drained += d
  }
  const want = s.dome === "open" || s.dome === "closing" ? OPEN_ANIM : ANIM   // frame-set swap (Megawhatt precedent)
  if (f._skinAnim !== want) f._skinAnim = want
}
// moveFrames hook (combat.startMove): no normals while the dome moves (the transition is committed).
function moveFrames(f, key, md) {
  const s = bsState(f); if (!s) return md
  if (s.dome === "opening" || s.dome === "closing") return false
  return md
}
// incomingScale hook (combat.applyScaledDamage, after the registry mods.defense divide — projectile / ability damage): the
// registry holds the CLOSED defense (×1.10); while the brain is exposed the effective defense is ×0.80. Melee reads
// fighter.defenseMultiplier, which tickDome keeps in step.
function incomingScale(f) { const s = bsState(f); return domeExposed(s) ? BS_DOME.CLOSED_DEF / BS_DOME.OPEN_DEF : 1 }
// damageDealt hook (combat.applyScaledDamage): lightning-tagged damage (every source named "bs_ltn_*") ×1.25 while the
// brain is exposed. Nothing else is touched.
export const isLightningMove = m => typeof m === "string" && m.startsWith("bs_ltn_")
function damageDealt(f, target, raw, opts) {
  const s = bsState(f); if (!s || !opts) return raw
  return isLightningMove(opts.move) && domeExposed(s) ? raw * BS_DOME.LTN_MULT : raw
}

// ── PATTERN READ (his unique system, GAME_STATE) ─────────────────────────────────────────────────────────
// He logs the category of the last 3 attacks the opponent LANDED on him or had BLOCKED by him (the struck-by hook:
// combat melee contact / projectile contact / grab connect): HIGH, LOW, PROJECTILE, GRAB, AIR. The same category at
// least 2 times in the last 3 → READ that category for 300f (HUD). While READ is active and the opponent's most recent
// logged attack (within 90f) matches it, his NEXT special gets startup −3f (min 1f) and damage +30%, and READ is
// consumed. Expires at 300f; after it is consumed no new READ for 300f. Swap / revert / KO / rematch clear the log and
// READ (fresh formState); the ultimate clears it too.
export const BS_READ = { LOG: 3, NEED: 2, DUR: 300, LOCK: 300, RECENT: 90, STARTUP: -3, DMG: 1.30 }
export const READ_CATS = ["HIGH", "LOW", "PROJECTILE", "GRAB", "AIR"]
export function categorize(info) {
  if (!info) return null
  if (info.kind === "grab") return "GRAB"
  if (info.kind === "projectile") return "PROJECTILE"
  const m = info.move || {}
  if (m.isGrab) return "GRAB"
  if (info.air) return "AIR"
  if (m.hitLevel === "low" || m.name === "down" || /low|sweep|crouch/i.test(String(m.name || ""))) return "LOW"
  return "HIGH"
}
export function logRead(s, cat) {
  const r = s.read; if (!cat) return
  r.log.push(cat); if (r.log.length > BS_READ.LOG) r.log.shift()
  r.lastCat = cat; r.lastT = s.t
  if (r.t > 0 || r.lock > 0) return                                        // one READ at a time; locked after a consume
  if (r.log.filter(c => c === cat).length >= BS_READ.NEED) { r.cat = cat; r.t = BS_READ.DUR; r.triggers++ }
}
// struck hook (ben10State.benAlienStruck): observation only
function struck(f, info) {
  const s = bsState(f); if (!s || !info || info.attacker === f) return
  if (info.proj && info.proj.visualOnly) return
  logRead(s, categorize(info))
}
function tickRead(s) {
  const r = s.read
  if (r.t > 0 && --r.t <= 0) { r.t = 0; r.cat = null }
  if (r.lock > 0) r.lock--
}
export const readArmed = s => !!s && s.read.t > 0 && s.read.lastCat === s.read.cat && s.t - s.read.lastT <= BS_READ.RECENT
// asked by every cast: { startup delta, damage mult }; consumes READ when it applies
export function takeRead(s) {
  if (!readArmed(s)) return { startup: 0, dmg: 1, read: null }
  const cat = s.read.cat
  s.read.t = 0; s.read.cat = null; s.read.lock = BS_READ.LOCK; s.read.consumed++
  return { startup: BS_READ.STARTUP, dmg: BS_READ.DMG, read: cat }
}
export function clearRead(s) { if (s) s.read = { ...s.read, log: [], cat: null, t: 0, lastCat: null, lastT: -999 } }

// ── SYNAPSE → SHORT-CIRCUIT (status on the OPPONENT, owned by this form's GAME_STATE) ─────────────────────────
// Clean hits from Brain Bolt, Neural Burst (final tick only) and Overcharge add ONE Synapse pip per cast (however many
// ticks hit), max 3; none from blocks, FX or Psychic Pull. Pips expire 240f after the last. 3 pips → SHORT-CIRCUIT for
// 240f (pips consumed): the opponent's specials start 6f later and cost +50% energy / Power (the generic specialTax hook:
// the press is held 6f, then fires through the normal path; their frame data, input polling and the clock are untouched).
// No refresh while active; 360f immunity after. Swap / revert / KO / rematch clear it (fresh formState). Static overlay =
// render only.
export const BS_SYN = { MAX: 3, EXPIRE: 240, SC: 240, IMMUNE: 360, STARTUP: 6, COST: 1.5 }
function tickSynapse(s) {
  const v = s.syn
  if (v.pips > 0 && --v.pipT <= 0) { v.pips = 0; v.pipT = 0 }
  if (v.scT > 0) { if (--v.scT <= 0) { v.scT = 0; v.immune = BS_SYN.IMMUNE } }
  else if (v.immune > 0) v.immune--
}
// one pip per CAST id; never while Short-Circuit is active or the opponent is immune
export function addSynapse(s, cast, n = 1) {
  const v = s.syn
  if (cast == null || cast === v.lastPipCast) return false
  if (v.scT > 0 || v.immune > 0) return false
  v.lastPipCast = cast
  v.pips = Math.min(BS_SYN.MAX, v.pips + n); v.pipT = BS_SYN.EXPIRE
  if (v.pips >= BS_SYN.MAX) { v.pips = 0; v.pipT = 0; v.scT = BS_SYN.SC; v.scs++ }
  return true
}
export const shortCircuited = s => !!s && s.syn.scT > 0
// specialTax hook (abilities.triggerSpecial, asked for the fighter pressing Special)
function specialTax(f, target) {
  const s = bsState(f); if (!s || !target || target === f || !(s.syn.scT > 0)) return null
  s.syn.taxed++
  return { startup: BS_SYN.STARTUP, costMult: BS_SYN.COST }
}
// contact hook (combat → ben10State.benAlienContact): pips on CLEAN hits of pip-tagged casts; the moves add their own
// effects (Phase 6) through onMoveContact.
function onContact(f, target, { proj = null, blocked = false } = {}) {
  const s = bsState(f); if (!s || !proj || proj.visualOnly) return
  const tag = proj.alien; if (!tag || !tag.bs) return
  if (!blocked && tag.pip) addSynapse(s, tag.cast)
  onMoveContact(f, s, target, tag, blocked)
}
function onMoveContact(f, s, target, tag, blocked) {
  if (tag.bs === "pull" && s.pull && s.pull.cast === tag.cast) { s.pull.connected = true; if (!blocked) beginPullDrag(f, s, target) }
  if (tag.bs === "strike" && s.strike && s.strike.cast === tag.cast) endStrikeTravel(f, s, api0)
  if (tag.bs === "ultOpen" && !blocked && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
}
let api0 = null   // the last api handed to the tick (contact hooks get none); only used to clear Strike's own hitbox

// ── SPECIALS (dispatch; the casts themselves are below) ───────────────────────────────────────────────────
// A LIGHTNING special pressed while the dome is CLOSED starts the dome opening first (+18f startup) and is buffered for
// one input; pressed while it is OPENING it is buffered. The buffered special casts (and spends its Power) on the frame the
// dome is fully up. Closing: refused.
export const LIGHTNING = new Set(["bolt", "burst", "overcharge"])
function pickSpecial(f, s) {
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null   // "N" = neutral (harness spelling)
  const air = !(f.onGround || f.grounded)
  if (air) return (dir === null || dir === "F" || dir === "D") ? "overcharge" : null
  if (dir === "B") return "burst"
  if (dir === "D") return "pull"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= BS_DASH_WINDOW) return "strike"
  return "bolt"
}
export const BS_DASH_WINDOW = 14
function fireSpecial(f, ctx, api) {
  const s = bsState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind) return false
  if (LIGHTNING.has(kind) && s.dome !== "open") {
    if (s.ult || s.dome === "closing") return false
    if (s.dome === "opening") { s.buffer = { kind, at: s.t }; return true }
    if (!canToggleDome(f, s) || (f.attackCooldown || 0) > 0 || f.attacking || f._benPowerCommit > 0) return false
    beginDome(f, s, "open"); s.buffer = { kind, at: s.t }
    return true
  }
  return cast(f, s, api, kind, ctx)
}
function castBuffered(f, s, api, b) {
  if (b.kind === "overcharge" && (f.onGround || f.grounded)) return false   // landed while the dome opened: nothing to cast
  return cast(f, s, api, b.kind, null)
}

// ── MOVES (pre-mod; startup / damage / on-block) ─────────────────────────────────────────────────────────
//   ↓↘→ + P  Brain Bolt (air: Overcharge)   ↓↙← + P  Neural Burst   ←↙↓ + P  Psychic Pull   →→ + P  Calculated Strike
// (the direction held the frame Special is pressed — the shared alien motion inputs — plus a frame-counted →→ tap)
export const BS_COST = { bolt: 12, burst: 16, pull: 14, strike: 14, overcharge: 12, ultimate: 55 }
export const BS_BOLT = { STARTUP: 14, RECOVERY: 20, SPEED: 14, RANGE: 420, DMG: 45, HITSTUN: 20, BLOCKSTUN: 12 }
export const BS_BURST = { STARTUP: 12, GAP: 6, TICKS: 3, TICK: 15, R: 150, RECOVERY: 22, ON_BLOCK: -12 }
export const BS_PULL = { STARTUP: 18, ACTIVE: 2, RECOVERY: 16, WHIFF: 20, RANGE: 300, DIST: 160, DRAG: 8, DMG: 20, ON_HIT: 14, ON_BLOCK: -10 }
export const BS_STRIKE = { STARTUP: 8, DIST: 280, FRAMES: 14, RECOVERY: 18, DMG: 50, ON_BLOCK: -12, ON_HIT: 4 }
export const BS_OC = { STARTUP: 8, ACTIVE: 6, RECOVERY: 16, DMG: 45, W: 70, H: 320 }
// MIND SHIELD (Block + Heavy, dome CLOSED only): cost 0, 7 s cooldown, 10f window — catches ONE non-beam projectile and
// throws it back at its original speed with 50% damage, ownership transferred; anything else passes through. No i-frames.
export const BS_SHIELD = { WINDOW: 10, CD: 420, DMG: 0.5 }
const cx = o => o.x + (o.w || 60) / 2
// →→ : two FORWARD press edges within 14f, neither with Down held (↓↘→ holds Forward from ↘, so it never makes a 2nd edge)
function tickDashTap(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) {
    if (s.t - s.fwdTapT <= BS_DASH_WINDOW) s.dashTapT = s.t
    s.fwdTapT = s.t
  }
  s.fwdPrev = fwd
}
function canAct(f, s) {
  return f.transformed && f.activeAlien === "brainstorm" && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !s.ult && (s.dome === "closed" || s.dome === "open") && !s.strike
}
// commit a cast: Power spent, READ applied + consumed (startup −3f min 1, damage +30%), pose, lock
function beginCast(f, s, api, pose, cost, startup, rest, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (!api.spendEnergy(f, cost)) return null
  const rd = takeRead(s); if (rd.read) { s.stats.reads++; s.lastRead = { cat: rd.read, at: s.t } }
  const st = Math.max(1, startup + rd.startup), total = st + rest
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++
  return { st, total, dmg: rd.dmg, cast: s.castId, read: rd.read }
}
// a stationary rectangular hitbox riding the shared projectile pipeline; vx carries the facing (knockback direction)
const hitbox = (f, api, name, face, md) => api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, ...md }, {})
function cast(f, s, api, kind, ctx) {
  api0 = api
  if (kind === "bolt") return castBolt(f, s, api)
  if (kind === "burst") return castBurst(f, s, api)
  if (kind === "pull") return castPull(f, s, api)
  if (kind === "strike") return castStrike(f, s, api)
  if (kind === "overcharge") return castOvercharge(f, s, api)
  return false
}

// 1. BRAIN BOLT (lightning) — Col 3 R4–R6 cast; a 420 px bolt, 45, +1 Synapse; one on screen
const boltLive = (f, api) => api.activeProjectiles().some(p => p.owner === f && p.name === "bs_ltn_bolt" && !p.visualOnly)
function castBolt(f, s, api) {
  if (s.bolt || boltLive(f, api)) return false
  const c = beginCast(f, s, api, "bsCast", BS_COST.bolt, BS_BOLT.STARTUP, BS_BOLT.RECOVERY); if (!c) return false
  const face = f.facing || 1
  s.bolt = { t: 0, st: c.st, cast: c.cast }; s.stats.bolts++
  api.scheduleBenSpawn(f, c.st, () => { s.bolt = null
    api.spawnProjectile(f, "bs_ltn_bolt", { damage: BS_BOLT.DMG * c.dmg, speed: 0, vx: face * BS_BOLT.SPEED, vy: 0,
      spawnX: cx(f) + face * (f.w / 2 + 10), spawnY: f.y + f.h * 0.35, w: 46, h: 18, radius: 12, color: "#fde047",
      lifetime: Math.round(BS_BOLT.RANGE / BS_BOLT.SPEED), isSpecial: true, electric: true, hitstun: BS_BOLT.HITSTUN,
      blockstun: BS_BOLT.BLOCKSTUN, knockbackX: 4, knockbackY: -2, alien: { bs: "bolt", pip: true, cast: c.cast } }, {}) })
  return true
}
function tickBolt(f, s) { if (s.bolt && ++s.bolt.t > s.bolt.st + 2) s.bolt = null }

// 2. NEURAL BURST (lightning) — radial 150 px around him, 3 ticks × 15 = 45, knockback on the last, −12 on block; final
//    tick +1 Synapse
function castBurst(f, s, api) {
  const span = BS_BURST.GAP * (BS_BURST.TICKS - 1)
  const c = beginCast(f, s, api, "bsCast", BS_COST.burst, BS_BURST.STARTUP, span + BS_BURST.RECOVERY); if (!c) return false
  const face = f.facing || 1, x = cx(f), y = f.y + f.h * 0.5
  s.burst = { t: 0, st: c.st, cast: c.cast, x, y }; s.stats.bursts++
  for (let k = 0; k < BS_BURST.TICKS; k++) {
    const at = c.st + k * BS_BURST.GAP, last = k === BS_BURST.TICKS - 1
    api.scheduleBenSpawn(f, at, () => api.spawnProjectile(f, "bs_ltn_burst", { damage: BS_BURST.TICK * c.dmg, speed: 0, vx: face * 0.01, vy: 0,
      spawnX: x, spawnY: y, radius: BS_BURST.R, radial: true, lifetime: 2, isSpecial: true, electric: true,
      hitstun: last ? 26 : 14, blockstun: last ? Math.max(1, (c.total - at + 1) + BS_BURST.ON_BLOCK) : 10, noHitstop: !last,
      knockbackX: last ? 9 : 0.5, knockbackY: last ? -5 : 0, alien: { bs: last ? "burst3" : "burst", pip: last, cast: c.cast } }, {}))
  }
  return true
}
function tickBurst(f, s) { if (s.burst && ++s.burst.t > s.burst.st + BS_BURST.GAP * (BS_BURST.TICKS - 1) + 8) s.burst = null }

// 3. PSYCHIC PULL (closed or open) — 18f, a telekinetic grab up to 300 px ahead: pulls 160 px toward him, 20, +14 on hit,
//    −10 on block, 20f whiff recovery (16 on contact). No pip.
function castPull(f, s, api) {
  const c = beginCast(f, s, api, "bsPull", BS_COST.pull, BS_PULL.STARTUP, BS_PULL.ACTIVE + BS_PULL.RECOVERY); if (!c) return false
  const face = f.facing || 1, rem = BS_PULL.ACTIVE + BS_PULL.RECOVERY
  s.pull = { t: 0, st: c.st, cast: c.cast, face, connected: false, drag: null, total: c.total }; s.stats.pulls++
  api.scheduleBenSpawn(f, c.st, () => hitbox(f, api, "bs_pull", face, { damage: BS_PULL.DMG * c.dmg,
    spawnX: cx(f) + face * (f.w / 2 + BS_PULL.RANGE / 2), spawnY: f.y + f.h * 0.5, w: BS_PULL.RANGE, h: 170, lifetime: BS_PULL.ACTIVE,
    hitstun: (rem + 1) + BS_PULL.ON_HIT, blockstun: Math.max(1, (rem + 1) + BS_PULL.ON_BLOCK), knockbackX: 0.01, knockbackY: 0,
    alien: { bs: "pull", pip: false, cast: c.cast } }))
  return true
}
function beginPullDrag(f, s, target) {
  const face = s.pull.face, gap = (f.w + (target.w || 60)) / 2 + 6
  const room = Math.max(0, (cx(target) - cx(f)) * face - gap)                // never pulled through him
  s.pull.drag = { t: 0, x0: target.x, dist: Math.min(BS_PULL.DIST, room) }; s.stats.pullHits++
}
function tickPull(f, s, opp) {
  const p = s.pull; if (!p) return
  p.t++
  if (p.drag && opp) {
    const d = p.drag; d.t++
    const k = Math.min(1, d.t / BS_PULL.DRAG), e = 1 - (1 - k) * (1 - k)
    opp.x = d.x0 - p.face * d.dist * e; opp.vx = 0
    if (k >= 1) p.drag = null
  }
  if (p.t === p.st + BS_PULL.ACTIVE && !p.connected) {                       // whiffed: 20f recovery instead of 16
    const extra = BS_PULL.WHIFF - BS_PULL.RECOVERY
    f.attackCooldown = (f.attackCooldown || 0) + extra; f._benPowerCommit = (f._benPowerCommit || 0) + extra; f._spriteCastTimer = (f._spriteCastTimer || 0) + extra
    p.whiffed = true
  }
  if (p.t > p.st + BS_PULL.ACTIVE + BS_PULL.WHIFF && !p.drag) s.pull = null
}

// 4. CALCULATED STRIKE — 8f, a psychic-boosted lunge of 280 px over 14f (real travel, no tracking), 50, −12 on block
function castStrike(f, s, api) {
  const c = beginCast(f, s, api, "bsStrike", BS_COST.strike, BS_STRIKE.STARTUP, BS_STRIKE.FRAMES + BS_STRIKE.RECOVERY); if (!c) return false
  s.strike = { t: 0, st: c.st, cast: c.cast, face: f.facing || 1, dmg: c.dmg, x0: f.x, done: false }; s.stats.strikes++
  return true
}
function endStrikeTravel(f, s, api) {
  const d = s.strike; if (!d || d.done) return
  d.done = true; delete f._benGlide; f.vx = 0
  f.attackCooldown = f._benPowerCommit = BS_STRIKE.RECOVERY; f._spriteCastTimer = BS_STRIKE.RECOVERY
  if (api) { const L = api.activeProjectiles(); for (let i = L.length - 1; i >= 0; i--) if (L[i].owner === f && L[i].name === "bs_strike") L.splice(i, 1) }
}
function tickStrike(f, s, api) {
  const d = s.strike; if (!d) return
  d.t++
  const live = d.t - d.st, v = BS_STRIKE.DIST / BS_STRIKE.FRAMES
  if ((f.hitstun || 0) > 0) { endStrikeTravel(f, s, api); s.strike = null; return }
  if (d.done) { if (!(f.attackCooldown > 0)) s.strike = null; return }
  if (live < 0) { f.vx = 0; return }
  if (live === 0) api.spawnProjectile(f, "bs_strike", { damage: BS_STRIKE.DMG * d.dmg, speed: 0, vx: d.face * v, vy: 0,
    spawnX: cx(f) + d.face * (f.w / 2), spawnY: f.y + f.h * 0.5, w: 70, h: 80, rectHitbox: true, lifetime: BS_STRIKE.FRAMES, isSpecial: true,
    hitstun: BS_STRIKE.RECOVERY + 1 + BS_STRIKE.ON_HIT, blockstun: Math.max(1, BS_STRIKE.RECOVERY + 1 + BS_STRIKE.ON_BLOCK),
    knockbackX: 5, knockbackY: -2, alien: { bs: "strike", pip: false, cast: d.cast } }, {})
  if (live >= BS_STRIKE.FRAMES) { endStrikeTravel(f, s, api); return }
  f._benGlide = { vx: d.face * v, vy: 0 }
  f._spriteCastMove = "bsStrike"; f._spriteCastTimer = Math.max(f._spriteCastTimer || 0, 2)
}

// 5. OVERCHARGE (air, lightning) — a downward lightning column under him, 45, +1 Synapse; once per airtime, no jump refill
function castOvercharge(f, s, api) {
  if (s.ocUsed || f.onGround || f.grounded) return false
  const c = beginCast(f, s, api, "bsCast", BS_COST.overcharge, BS_OC.STARTUP, BS_OC.ACTIVE + BS_OC.RECOVERY, { commit: false }); if (!c) return false
  s.ocUsed = true; s.stats.ocs++
  const face = f.facing || 1
  s.oc = { t: 0, st: c.st, cast: c.cast, x: cx(f) }
  api.scheduleBenSpawn(f, c.st, () => { if (s.oc) s.oc.x = cx(f)
    hitbox(f, api, "bs_ltn_overcharge", face, { damage: BS_OC.DMG * c.dmg, spawnX: cx(f), spawnY: f.y + f.h + BS_OC.H / 2 - 20,
      w: BS_OC.W, h: BS_OC.H, lifetime: BS_OC.ACTIVE, electric: true, hitstun: 22, blockstun: 12, knockbackX: 2, knockbackY: 6,
      alien: { bs: "overcharge", pip: true, cast: c.cast } }) })
  return true
}
function tickOvercharge(f, s) { if (s.oc && ++s.oc.t > s.oc.st + BS_OC.ACTIVE + 4) s.oc = null }

// ── MIND SHIELD ───────────────────────────────────────────────────────────────────────────────────────────
// blockHeavy hook (game.js): closed dome only; true = handled (the Heavy press is consumed)
function blockHeavy(f) {
  const s = bsState(f); if (!s) return false
  return raiseShield(f, s)
}
export function raiseShield(f, s) {
  if (s.dome !== "closed" || s.shield.cd > 0 || s.ult || (f.hitstun || 0) > 0) return false
  s.shield.t = BS_SHIELD.WINDOW; s.shield.cd = BS_SHIELD.CD
  f._spriteCastMove = "guard"; f._spriteCastTimer = BS_SHIELD.WINDOW
  return true
}
export const isBeam = p => !!p && !!(p.beam || p.isBeam || p.laser || /beam|laser|kameha|ray\b|_ray|heat_?vision|getsuga|blast_wave/i.test(String(p.name || "")))
// absorb hook (combat, before a hit resolves): one non-beam projectile the opponent owns, inside the window → caught
function absorb(f, info) {
  const s = bsState(f); if (!s || !(s.shield.t > 0)) return false
  const p = info && info.proj
  if (!p || p.visualOnly || p.owner === f || isBeam(p)) return false       // melee / beams / own pieces pass through
  const sp = Math.hypot(p.vx || 0, p.vy || 0) || p.speed || 8
  const ex = {}; for (const k of ["color", "sheet", "spriteFrames", "spriteW", "spriteH", "spriteSpeed", "spriteScale", "radius", "w", "h", "rectHitbox"]) if (p[k] !== undefined) ex[k] = p[k]
  s.shield.ret = { name: String(p.name || "proj"), dmg: (p.damage || 0) * BS_SHIELD.DMG, speed: sp, vy: -(p.vy || 0), x: p.x, y: p.y, ex }
  s.shield.t = 0; s.shield.caught++
  return true
}
function tickShield(f, s, api, opp) {
  const sh = s.shield
  if (sh.t > 0) sh.t--
  if (sh.cd > 0) sh.cd--
  if (sh.ret && api) {                                                       // throw it back the frame after the catch
    const r = sh.ret; sh.ret = null
    const dir = opp ? (cx(opp) >= cx(f) ? 1 : -1) : (f.facing || 1)
    api.spawnProjectile(f, "bs_shield_" + r.name, { ...r.ex, damage: r.dmg, speed: 0, vx: dir * Math.abs(r.speed), vy: r.vy,
      spawnX: cx(f) + dir * (f.w / 2 + 12), spawnY: f.y + f.h * 0.4, lifetime: 120, isSpecial: true, hitstun: 18, blockstun: 10,
      knockbackX: 4, knockbackY: -2, alien: { bs: "shield", pip: false, cast: -1, from: r.name } }, {})
  }
}

// ── ULTIMATE: NEURAL TEMPEST (same input as Omnitrix Overload, alien form only) ──────────────────────────────
// 55 Power, forced OPEN. A Psychic-Pull-style seize opener (40); whiff / block = no cinematic, 60f recovery. On a clean
// opener: the opponent is HELD (render-only lift, no collision change), the stage dims, a procedural "calculation"
// montage of numbers and graph lines orbits them while the dome opens fully (R3 then R8) → STORM: 5 bolts × 24 from
// hash(seed, frame, player)-chosen angles (R4–R6 bursts) → FINAL TEMPEST: the enlarged R6 burst + a pixel shock ring, 90.
// 250 unscaled (40 + 120 + 90). Then Synapse pips (+3, so Short-Circuit) unless the opponent is Short-Circuited / immune,
// lights and positions restore, the dome returns to CLOSED, Pattern Read clears, 110f recovery lockout.
// The ult damage is not lightning-TAGGED (its design total is fixed); glyphs / bolts have no hitboxes and no GAME_STATE.
export const BS_ULT = { OPENER_AT: 14, OPENER: 40, RANGE: 200, WHIFF: 60, CALC: 40, BOLTS_AT: [44, 54, 64, 74, 84], BOLT: 24,
  FINAL_AT: 100, FINAL: 90, END: 120, LOCKOUT: 110, LIFT: 46 }
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function bsHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h ^= h >>> 16
  return h / 4294967296
}
function fireUltimate(f, ctx, api) {
  const s = bsState(f); if (!s) return false
  if (!canAct(f, s)) return false
  if (!api.spendEnergy(f, BS_COST.ultimate)) return false
  api0 = api
  s.castId++
  const face = f.facing || 1, total = BS_ULT.OPENER_AT + BS_ULT.WHIFF
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "bsPull"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.dome = "open"; s.domeT = 0; s.buffer = null; s.shield.t = 0                 // forced OPEN
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId, angles: [], hits: [] }
  s.stats.ults++
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, BS_ULT.OPENER_AT, () => hitbox(f, api, "bs_ult_open", face, {
    damage: BS_ULT.OPENER, spawnX: cx(f) + face * (f.w / 2 + BS_ULT.RANGE / 2), spawnY: f.y + f.h * 0.5, w: BS_ULT.RANGE, h: 150, lifetime: 3,
    isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { bs: "ultOpen", cast: s.castId } }))
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "calc"; u.t = 0; u.raw = BS_ULT.OPENER
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = BS_ULT.END + BS_ULT.LOCKOUT; f._benPowerCommit = BS_ULT.END; f._spriteCastTimer = BS_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, BS_ULT.END + 2)            // cinematic only (the opponent is held)
}
function tickUlt(f, s, opp, api, ctx) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > BS_ULT.OPENER_AT + 12) { s.ult = null; s.dome = "closed" } return }   // whiff / block
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y   // held (no collision change)
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "neural_tempest", source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 8) }
  if (u.t < BS_ULT.CALC) { u.phase = "calc"; f._spriteCastMove = u.t < BS_ULT.CALC / 2 ? "bsDomeOpen" : "open_idle" }
  else if (u.t < BS_ULT.FINAL_AT) { u.phase = "storm"; f._spriteCastMove = "bsCast"
    const k = BS_ULT.BOLTS_AT.indexOf(u.t)
    if (k >= 0) { u.angles.push(bsHash(ctx?.seed ?? 1, ctx?.frame ?? u.t, pIndex(f), k) * Math.PI * 2); hit(BS_ULT.BOLT, 3 + k) } }
  else if (u.t < BS_ULT.END) { u.phase = "final"; f._spriteCastMove = "bsCastHold"
    if (u.t === BS_ULT.FINAL_AT) hit(BS_ULT.FINAL, 16) }
  else { endUlt(f, s, opp); return }
  f._spriteCastTimer = 2
}
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }     // positions restore
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = (u.face || 1) * 10; opp.vy = -8 }
  s.lastUltRaw = u?.raw || 0; s.lastUltAngles = u?.angles ? u.angles.slice() : []
  if (opp && u && !(s.syn.immune > 0) && !(s.syn.scT > 0)) addSynapse(s, u.cast, BS_SYN.MAX)   // pips only (no extra damage)
  s.ult = null
  s.dome = "closed"; s.domeT = 0; s.buffer = null                          // dome returns to CLOSED
  clearRead(s)                                                             // Pattern Read clears
  f.attackCooldown = BS_ULT.LOCKOUT; f._benPowerCommit = BS_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── RENDER-ONLY BODY OFFSETS (game.js body draw; never collision) ─────────────────────────────────────────────
// Normals have no unique body art: the jab / heavy / air lunge forward and the launcher lifts, as a draw offset only.
const LUNGE = { light: 14, heavy: 22, air: 12, down: 6 }
function bodyOffset(f) {
  const s = bsState(f); if (!s) return null
  const a = f.attacking && f.currentAttack
  if (a && (LUNGE[a.name] || a.name === "up")) {
    const el = (a.total || 0) - (a.timer || 0), st = a.activeStart || 1, k = el < st ? el / st : Math.max(0, 1 - (el - st) / Math.max(1, (a.total || 1) - st))
    return a.name === "up" ? { dx: 0, dy: -Math.round(10 * k) } : { dx: Math.round((f.facing || 1) * LUNGE[a.name] * k), dy: 0 }
  }
  if (s.strike && !s.strike.done && s.strike.t >= s.strike.st) return { dx: (f.facing || 1) * 6, dy: 2 }   // lean into the strike
  return null
}
// the ult's HELD opponent floats (render only): asked for the OPPONENT of the form's owner
function targetOffset(f, target) {
  const s = bsState(f); const u = s && s.ult; if (!u || !u.thome || u.phase === "opener") return null
  const up = Math.min(1, u.t / 14) * Math.min(1, (BS_ULT.END - u.t) / 10)
  return { dx: 0, dy: -Math.round(BS_ULT.LIFT * up + Math.sin(u.t / 6) * 3) }
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
// render-only deterministic hash (a, b, c) → [0, 1) — sparks / static jitter
function rHash(a, b, c) {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((c | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
// world-space overlays over / around the fighters. Render-only.
export function drawBrainstormFx(c, f, frame = 0, opp = null) {
  const s = bsState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const face = f.facing || 1, fx = cx(f), fy = f.y + f.h * 0.5
  const a = f.attacking && f.currentAttack
  if (a && a.name) {                                                      // procedural claw swipe / sweep spark / lift shimmer
    const el = (a.total || 0) - (a.timer || 0), on = el >= (a.activeStart || 0) && el <= (a.activeEnd ?? a.activeStart ?? 0) + 2
    if (on && (a.name === "light" || a.name === "heavy" || a.name === "air")) drawClawSwipe(c, fx + face * (f.w / 2 + (a.name === "heavy" ? 40 : 18)), fy - 6, face, a.name === "heavy" ? 30 : 20, el)
    if (on && a.name === "down") drawSweepSpark(c, fx + face * (f.w / 2 + 18), f.y + f.h - 6, face, el)
    if (a.name === "up") drawLiftShimmer(c, fx, f.y + f.h, f.w, el)
  }
  const b = s.burst
  if (b && b.t >= b.st) drawPixelRing(c, b.x, b.y, BS_BURST.R * Math.min(1, 0.4 + (b.t - b.st) / 12), (b.t >> 1) % 2 ? "#fde047" : "#ffffff", 4, frame)
  const p = s.pull
  if (p && p.t < p.st + BS_PULL.ACTIVE + 8)                              // telekinetic rings rolling out to 300 px
    for (let i = 0; i < 3; i++) { const k = ((p.t + i * 6) % 18) / 18; drawPixelRing(c, fx + p.face * (f.w / 2 + k * BS_PULL.RANGE), fy, 18 + k * 22, "#c084fc", 3, frame) }
  const o = s.oc
  if (o && o.t >= o.st) drawBolt(c, o.x, f.y + f.h * 0.6, o.x, f.y + f.h + BS_OC.H - 40, frame * 7 + o.cast, 4, "#fde047")
  if (s.shield.t > 0) drawPixelRing(c, fx, fy, Math.max(f.w, f.h) * 0.7, "#93c5fd", 4, frame)   // Mind Shield shell
  const u = s.ult
  if (u && u.thome && opp) {
    const ox = u.thome.x + (opp.w || 60) / 2, oy = u.thome.y + (opp.h || 110) / 2 - BS_ULT.LIFT
    if (u.phase === "calc" || u.phase === "storm") drawCalcMontage(c, ox, oy, u.t, u.cast)
    u.angles.forEach((ang, k) => { const d = u.t - BS_ULT.BOLTS_AT[k]; if (d >= 0 && d < 8)
      drawBolt(c, ox + Math.cos(ang) * 320, oy + Math.sin(ang) * 320, ox, oy, u.cast * 31 + k * 7 + d, 5, d % 2 ? "#ffffff" : "#fde047") })
    const fd = u.t - BS_ULT.FINAL_AT
    if (fd >= 0 && fd < 20) { drawPixelRing(c, ox, oy, 24 + fd * 14, "#ffffff", 5, frame); drawPixelRing(c, ox, oy, 12 + fd * 9, "#fde047", 4, frame) }
  }
  if (opp && opp._lastDrawX != null && opp._lastDrawW != null) {
    const ox = opp._lastDrawX + opp._lastDrawW / 2, oy = opp._lastDrawY - 12
    const v = s.syn
    for (let i = 0; i < v.pips; i++) drawSynapsePip(c, ox + (i - (v.pips - 1) / 2) * 12, oy, frame)
    if (v.scT > 0) {                                                       // SHORT-CIRCUIT static: crackling pixels over the body
      const w = opp._lastDrawW, h = opp._lastDrawH || 120
      for (let i = 0; i < 18; i++) {
        const px = opp._lastDrawX + rHash(frame >> 1, i, 1) * w, py = opp._lastDrawY + rHash(frame >> 1, i, 2) * h
        c.fillStyle = i % 3 ? "#fde047" : "#ffffff"; c.fillRect(Math.round(px), Math.round(py), 3, 3)
        if (i % 4 === 0) c.fillRect(Math.round(px + 3), Math.round(py + 3), 3, 3)
      }
      c.fillStyle = "#fde047"; c.font = "bold 9px Arial"; c.textAlign = "center"; c.fillText("SHORT-CIRCUIT", ox, oy - 8)
    }
  }
  c.restore()
}
function drawSynapsePip(c, x, y, frame) {             // 5×5 pixel lightning node
  const rows = [".y.", "yWy", ".y."], k = 3, pal = { y: (frame >> 3) % 2 ? "#facc15" : "#fde047", W: "#ffffff" }
  for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) { const ch = rows[r][i]; if (ch === ".") continue
    c.fillStyle = pal[ch]; c.fillRect(Math.round(x + (i - 1.5) * k), Math.round(y + (r - 1.5) * k), k, k) }
}
export function drawBrainstormHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = bsState(f); if (!ctx || !s) return
  const y = enY + enH + 3, tx = flip ? x + 8 + pbw : x + 8
  ctx.save()
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  const dome = { closed: "CLOSED", opening: "OPENING…", open: "OPEN", closing: "CLOSING…" }[s.dome]
  ctx.fillStyle = domeExposed(s) ? "#c084fc" : "#fdba74"; ctx.fillText(`DOME ${dome}`, tx, y)
  const r = s.read
  ctx.fillStyle = r.t > 0 ? "#facc15" : "#9ca3af"
  ctx.fillText(r.t > 0 ? `READ ${r.cat} (${Math.ceil(r.t / 60)}s)` : r.lock > 0 ? "READ —" : `READ ${r.log.map(c => c[0]).join("")}`, tx, y + 10)
  const v = s.syn
  ctx.fillStyle = v.scT > 0 ? "#fde047" : "#e5e7eb"
  ctx.fillText(`SYNAPSE ${v.scT > 0 ? "SHORT-CIRCUIT" : v.immune > 0 ? "IMMUNE" : "●".repeat(v.pips) + "○".repeat(BS_SYN.MAX - v.pips)}`, tx, y + 20)
  ctx.restore()
}

// pixel-style ring of square dots (procedural, render-only)
export function drawPixelRing(c, x, y, r, col, k = 4, frame = 0) {
  if (!(r > 0)) return
  const n = Math.max(12, Math.round(r * 0.6)), spin = (frame % 60) / 60 * Math.PI * 2 / n
  c.fillStyle = col
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + spin; c.fillRect(Math.round(x + Math.cos(a) * r - k / 2), Math.round(y + Math.sin(a) * r - k / 2), k, k) }
}
// jagged pixel lightning bolt from (x0, y0) to (x1, y1) (render-only; the jitter is a render hash of `seed`)
export function drawBolt(c, x0, y0, x1, y1, seed = 0, k = 4, col = "#fde047") {
  const n = 9; let px = x0, py = y0
  c.fillStyle = col
  for (let i = 1; i <= n; i++) {
    const t = i / n, j = i === n ? 0 : (rHash(seed, i, 3) - 0.5) * 34
    const nx = x0 + (x1 - x0) * t + j * Math.abs(y1 - y0) / Math.max(1, Math.hypot(x1 - x0, y1 - y0)), ny = y0 + (y1 - y0) * t + j * Math.abs(x1 - x0) / Math.max(1, Math.hypot(x1 - x0, y1 - y0))
    const steps = Math.max(1, Math.round(Math.hypot(nx - px, ny - py) / k))
    for (let q = 0; q <= steps; q++) c.fillRect(Math.round(px + (nx - px) * q / steps - k / 2), Math.round(py + (ny - py) * q / steps - k / 2), k, k)
    px = nx; py = ny
  }
}
function drawClawSwipe(c, x, y, face, r, el) {           // three pixel arcs (claw marks)
  c.fillStyle = "#fed7aa"
  for (let m = 0; m < 3; m++) for (let i = 0; i < 7; i++) {
    const a = -1.0 + i * 0.33, rr = r - m * 6
    c.fillRect(Math.round(x + face * Math.cos(a) * rr * 0.6 - 2), Math.round(y + Math.sin(a) * rr + m * 4 - 2), 4, 4)
  }
}
function drawSweepSpark(c, x, y, face, el) {
  c.fillStyle = "#fde68a"
  for (let i = 0; i < 6; i++) c.fillRect(Math.round(x + face * i * 7), Math.round(y - (i % 2) * 4 - 2), 4, 3)
}
function drawLiftShimmer(c, x, y, w, el) {             // psychic lift: purple pixel motes rising under him
  c.fillStyle = "#c084fc"
  for (let i = 0; i < 8; i++) c.fillRect(Math.round(x - w / 2 + (i / 7) * w), Math.round(y - ((el * 3 + i * 9) % 30)), 3, 3)
}
// the ult's "calculation" montage: pixel digits + graph lines orbiting the held opponent (render-only)
const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111",
  "111100111101111", "111001010010010", "111101111101111", "111101111001111"]
function drawDigit(c, d, x, y, k) {
  const g = DIGITS[d % 10]
  for (let i = 0; i < 15; i++) if (g[i] === "1") c.fillRect(Math.round(x + (i % 3) * k), Math.round(y + Math.floor(i / 3) * k), k, k)
}
function drawCalcMontage(c, ox, oy, t, cast) {
  c.fillStyle = "#a7f3d0"
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2 + t / 30, r = 70 + 10 * Math.sin(t / 9 + i)
    drawDigit(c, Math.floor(rHash(cast, i, t >> 3) * 10), ox + Math.cos(a) * r - 4, oy + Math.sin(a) * r * 0.7 - 7, 3)
  }
  c.fillStyle = "#86efac"                                // two orbiting graph lines (rising staircase plots)
  for (let g = 0; g < 2; g++) {
    const a = t / 22 + g * Math.PI, gx = ox + Math.cos(a) * 110, gy = oy + Math.sin(a) * 60
    for (let i = 0; i < 12; i++) c.fillRect(Math.round(gx - 24 + i * 4), Math.round(gy + 10 - Math.round(rHash(cast, g * 16 + i, 9) * 10 + i * 1.5)), 3, 3)
    c.fillRect(Math.round(gx - 26), Math.round(gy + 12), 52, 2)
  }
}
// ultimate stage dim under the fighters (world space; fades in / out with the cinematic — "lights restore" at the end)
export function drawBrainstormUnder(c, f) {
  const s = bsState(f); if (!c || !s || !s.ult || s.ult.phase === "opener" || !s.ult.home) return
  const t = s.ult.t, a = Math.max(0, Math.min(1, t / 8) * Math.min(1, (BS_ULT.END - t) / 8))
  c.save(); c.globalAlpha = 0.7 * a; c.fillStyle = "#05070d"; c.fillRect(-4000, -4000, 16000, 12000); c.restore()
}
