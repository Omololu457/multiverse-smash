// rath.js — RATH (Appoplexian), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// A pure brawler: NO projectiles and NO ranged specials. Every special is a real engine MELEE move (api.startMove → the
// engine's own hitbox / block / chip / hitstun / combo scaling) or a command grab; the ultimate is a cinematic beatdown.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (claw sparks, roar
// burst, armor glow, speech burst, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sheet source unknown: docs/ben10/aliens/rath/SPRITE_LEDGER.md.
import { RATH_ANIM, RATH_GEOM } from "./rathAssets.js"
export { RATH_ANIM, RATH_GEOM }

export const RT_KEY = "rath"
const ANIM = { ...RATH_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const RATH = {
  id: RT_KEY, poolKey: RT_KEY, displayName: "Rath", slot: 21,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Ripjaws (20)
  status: "ready", sheetPath: "./ben10_rath_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/rath/SPRITE_LEDGER.md",
  mods: { speed: 1.00, damage: 1.25, defense: 0.90, weight: 1.10 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Claw Rake", special2: "Rath Rush", special3: "Let Me Tell You Something", special4: "Overhead Slam",
    special5: "Primal Lunge", passive: "Fury", ultimate: "Rath's Fury" },
  basic_attacks: {
    light:  normal(20, 5, 3, 9, 0, { rangeX: 90 }),                                             // T14 → T15 straight
    heavy:  normal(58, 14, 4, 22, -6, { knockbackX: 6, rangeX: 170 }),                         // T19 → T16 long straight, 170 px
    down:   normal(26, 7, 3, 14, -4, { hitLevel: "low", rangeX: 120 }),                        // T17 low claw swipe, hits low
    up:     normal(48, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 95 }),   // T20 → T21 uppercut, launches
    air:    normal(32, 7, 4, 12, 2, { rangeX: 85 })                                            // leap + straight (reused)
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, struck, damageDealt, targetOffset,
  drawHud: drawRathHud, drawFx: drawRathFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshRathState() {
  return { kind: RT_KEY, t: 0, castId: 0, noAttack: false, base: null, stage: { L: -1e6, R: 1e6 },
    oppDir: 1, hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5,
    fury: 0, lastGainT: 0, furyT: 0, furyCd: 0, furyReadyAt: 0, furyUses: 0, furyEnds: [], armored: 0, pierced: 0,
    gainDealt: 0, gainTaken: 0, roarT: -999,
    chain: null, grab: null, lunge: null, lungeUsed: false, ult: null, lastUlt: null, lastChain: null, lastGrab: null, lastLunge: null,
    stats: { casts: 0, rakes: 0, rakeHits: 0, rushes: 0, rushHits: 0, grabs: 0, grabbed: 0, teched: 0, slams: 0, slamHits: 0,
      bounces: 0, lunges: 0, lungeHits: 0, rants: 0 } }
}
export const rtState = f => (f?.omnitrix?.formState?.kind === RT_KEY && f.transformed && f.activeAlien === RT_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshRathState()
  s.base = { walk: f._benWalkSpeed, dash: f.dashSpeed, jump: f.jumpForce }
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function rtHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
const TICKS = []   // section ticks (f, s, input, api, opp), filled by the sections below, run in order
let api0 = null    // the api of the last tick (hooks called outside the tick)
function tick(f, input, ctx, api) {
  const s = rtState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  input = input || {}
  api0 = api
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  s.oppDir = opp && !opp.eliminated ? (cx(opp) >= cx(f) ? 1 : -1) : (f.facing || 1)
  tickInputs(f, s, input, s.oppDir)
  for (const fn of TICKS) fn(f, s, input, api, opp)
  s.noAttack = busy(s)
}
const BUSY = []    // predicates: a cast owns him
const busy = s => BUSY.some(p => p(s))
// moveFrames hook (combat.startMove): his own special moves (rt_*) pass; no normals while a cast owns him; tier frame cuts
const MD_XFORM = []   // (f, s, key, md) → a (copied) md (RAGING's −1f startup, Phase 3)
function moveFrames(f, key, md) {
  const s = rtState(f); if (!s || !md) return md
  if (!/^rt_/.test(key) && busy(s)) return false
  return MD_XFORM.reduce((m, fn) => fn(f, s, key, m), md)
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, opponent-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) CLAW RAKE (in the air: PRIMAL LUNGE)   ↓↙← + P (214) LET ME TELL YOU SOMETHING
//   ←↙↓ + P (412) OVERHEAD SLAM                          →→ + P (a frame-counted double tap) RATH RUSH
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral / ↑ Claw Rake, ← Let Me
// Tell You Something, ↓ Overhead Slam, → after a double tap Rath Rush (→ alone Claw Rake); any air Special = Primal Lunge.
// Directions are read RELATIVE TO THE OPPONENT (the engine turns a fighter with his walk input; BenWolf's lesson).
export const RT_DASH_WINDOW = 14, RT_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input, face) {
  const fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= RT_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["412", "slam"], ["214", "grab"], ["236", "rake"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= RT_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "lunge"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (s.t - (s.dashTapT ?? -999) <= RT_DASH_WINDOW && (dir === "F" || !dir)) return "rush"
  if (dir === "B") return "grab"
  if (dir === "D") return "slam"
  return "rake"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const RT_COST = { rake: 10, rush: 12, grab: 16, slam: 14, lunge: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = rtState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
let ULT = null     // the ultimate's cast (Phase 4)
function fireUltimate(f, ctx, api) { return ULT ? ULT(f, ctx, api) : false }

// ── hooks dispatched to the sections ──────────────────────────────────────────────────────────────────────────
const CONTACT = []   // onContact (f, s, target, info): a contact HE made
function onContact(f, target, info) {
  const s = rtState(f); if (!s || !target) return
  for (const h of CONTACT) h(f, s, target, info || {})
}
const STRUCK = []    // struck (f, s, info): an attack that landed on him or that he blocked
function struck(f, info) {
  const s = rtState(f); if (!s) return
  for (const h of STRUCK) h(f, s, info || {})
}
const DEALT = []     // damageDealt multipliers (f, s, target, raw, opts) → raw
function damageDealt(f, target, raw, opts) {
  const s = rtState(f); if (!s || !(raw > 0)) return raw
  for (const fn of DEALT) raw = fn(f, s, target, raw, opts || {})
  return raw
}
// his own ultimate's damage is authored as a fixed total: never boosted by the Fury tiers
// (melee damage carries no move in its opts: read the attacker's live move — the same frame the engine resolves it)
const isUltHit = (opts, f) => { const m = opts.move, n = typeof m === "string" ? m : (m && m.name) ||
  ((opts.source === "melee" || opts.source === "block-chip") && f && f.currentAttack ? f.currentAttack.name : ""); return /^rt_ult/.test(String(n || "")) }

// ── HUD + world overlays (render-only: read GAME_STATE, never write it) ────────────────────────────────────────
const HUD_PARTS = []   // (ctx, f, s, box) → draws one HUD row
export function drawRathHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = rtState(f); if (!ctx || !s) return
  const w = Math.min(120, pbw || 120), y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save()
  for (const p of HUD_PARTS) p(ctx, f, s, { bx, y, w, flip })
  ctx.restore()
}
function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
const FX_DRAW = []   // (c, f, s, frame, opp) render-only layers
export function drawRathFx(c, f, frame = 0, opp = null) {
  const s = rtState(f); if (!s || !c) return
  for (const d of FX_DRAW) d(c, f, s, frame, opp)
}

// ── 3. FURY (his unique system, GAME_STATE) ─────────────────────────────────────────────────────────────────────
// A 0–100 gauge, shown under Omnitrix Power while he is active; starts at 0. It GAINS FROM BOTH SIDES OF A FIGHT (unlike
// every other alien's pips): landing a hit +4 (blocked +2) — every contact HE makes (onContact: normals + his melee specials;
// the command-grab rant adds its own) — and TAKING a hit +5 (blocking one +2) — every attack that lands on him or that he
// blocks (struck: melee / projectile / throw). −1/f after 150f with neither gain. Caps at 100.
// TIERS: 0–59 base. 60–99 RAGING: damage +10%, move startup −1f (min 1f). 100 → RATH'S FURY: 180f of SUPER ARMOR (the
// optional `armor` hook: hits from normal- / special-tagged melee and projectiles land WITHOUT hitstun / knockback / a move
// cancel — he still takes the full damage; launchers / spikes, unblockables, throws and cinematic / ultimate hits still
// combo / knock him down: armor against flinch, not invulnerability), damage +15% (−1f startup kept). It ends into COOLDOWN:
// Fury 0, 240f where gains are halved; it can only trigger again 600f after it ended (until then a full gauge is RAGING).
// Swap / revert / KO / rematch: a fresh formState (Fury, the armor window, the cooldown all cleared; the armor is read live
// from formState, so nothing lingers on the fighter).
export const RT_FURY = { MAX: 100, HIT: 4, HIT_BLOCKED: 2, TAKEN: 5, TAKEN_BLOCKED: 2, IDLE: 150, DECAY: 1, RAGE: 60,
  RAGE_DMG: 1.10, CUT: 1, FURY_T: 180, FURY_DMG: 1.15, CD: 240, CD_GAIN: 0.5, REUSE: 600 }
export const furyOn = s => !!(s && s.furyT > 0)
export const furyTier = s => (!s ? 0 : furyOn(s) ? 3 : s.fury >= RT_FURY.RAGE ? 2 : 1)
export function gainFury(f, s, amount, side) {
  if (!s || !(amount > 0) || furyOn(s)) return 0
  const add = amount * (s.furyCd > 0 ? RT_FURY.CD_GAIN : 1)
  const before = s.fury
  s.fury = Math.min(RT_FURY.MAX, s.fury + add); s.lastGainT = s.t
  const got = s.fury - before
  if (side === "dealt") s.gainDealt += got; else s.gainTaken += got
  if (s.fury >= RT_FURY.MAX && s.t >= s.furyReadyAt) { s.furyT = RT_FURY.FURY_T; s.furyUses++; s.roarT = s.t }   // RATH'S FURY
  return got
}
export function endFury(f, s, why) {
  if (!furyOn(s)) return
  s.furyT = 0; s.fury = 0; s.furyCd = RT_FURY.CD; s.furyReadyAt = s.t + RT_FURY.REUSE
  s.furyEnds.push(why); if (s.furyEnds.length > 4) s.furyEnds.shift()
}
TICKS.push((f, s) => {
  if (s.furyT > 0) { if (--s.furyT <= 0) { s.furyT = 1; endFury(f, s, "timer") } return }
  if (s.furyCd > 0) s.furyCd--
  if (s.fury > 0 && s.t - s.lastGainT >= RT_FURY.IDLE) s.fury = Math.max(0, s.fury - RT_FURY.DECAY)
})
CONTACT.push((f, s, target, { blocked }) => { gainFury(f, s, blocked ? RT_FURY.HIT_BLOCKED : RT_FURY.HIT, "dealt") })
STRUCK.push((f, s, { blocked }) => { gainFury(f, s, blocked ? RT_FURY.TAKEN_BLOCKED : RT_FURY.TAKEN, "taken") })
DEALT.push((f, s, target, raw, opts) => (isUltHit(opts, f) ? raw : raw * (furyOn(s) ? RT_FURY.FURY_DMG : furyTier(s) >= 2 ? RT_FURY.RAGE_DMG : 1)))
MD_XFORM.push((f, s, key, md) => (furyTier(s) >= 2 && !md.rtFollow ? { ...md, startup: Math.max(1, (md.startup ?? 5) - RT_FURY.CUT) } : md))
export const startupOf = (s, n) => Math.max(1, n - (furyTier(s) >= 2 ? RT_FURY.CUT : 0))   // his own scheduled beats (grab)
// the SUPER ARMOR test (combat.js via ben10State.benAlienArmor). Plain reads + counters only.
function armor(f, info) {
  const s = rtState(f); if (!furyOn(s)) return false
  const m = info.move, p = info.proj
  const pierce = m ? (m.unblockable || m.launcher || m.spike || m.isUltimate || info.cat === "ultimate" || info.cat === "grab" || m.category === "grab")
    : p ? (p.unblockable || p.isUltimate) : true
  if (pierce) { s.pierced++; return false }
  s.armored++; return true
}
RATH.armor = armor

// render-only: the Fury gauge under the Omnitrix bar (orange; RAGING pulses red; RATH'S FURY flashes with its time left;
// the cooldown greys it out)
const ORANGE = "#ff5500", DARKOR = "#bd4204", RAGE = "#ef4444", WHITE = "#f1f1f0", INK = "#1b1b1f"
HUD_PARTS.push((ctx, f, s, { bx, y, w, flip }) => {
  const h = 5, tier = furyTier(s), fill = furyOn(s) ? s.furyT / RT_FURY.FURY_T : s.fury / RT_FURY.MAX
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, y - 1, w + 2, h + 2)
  ctx.fillStyle = s.furyCd > 0 && !furyOn(s) ? "#6b7280" : tier === 3 ? ((s.t >> 2) % 2 ? WHITE : ORANGE) : tier === 2 ? ((s.t >> 3) % 2 ? RAGE : ORANGE) : DARKOR
  const fw = Math.round(w * Math.max(0, Math.min(1, fill))); ctx.fillRect(flip ? bx + w - fw : bx, y, fw, h)
  ctx.fillStyle = INK; const mk = Math.round(w * RT_FURY.RAGE / RT_FURY.MAX); ctx.fillRect(flip ? bx + w - mk : bx + mk, y, 1, h)   // the RAGING mark
  const label = furyOn(s) ? `RATH'S FURY ${Math.ceil(s.furyT / 60)}s` : s.furyCd > 0 ? "FURY COOLDOWN" : tier === 2 ? "RAGING" : "FURY"
  ctx.font = "bold 8px monospace"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = tier >= 2 ? WHITE : "#fdba74"; ctx.fillText(label, flip ? bx + w : bx, y + h + 2)
})
// render-only: RAGING heat shimmer, the RATH'S FURY armor glow (a pulsing pixel outline) + the trigger roar burst
FX_DRAW.push((c, f, s, frame) => {
  const tier = furyTier(s), x0 = f.x, y0 = f.y, w = f.w || 64, h = f.h || 118
  c.save()
  if (tier >= 2) {                                                          // heat shimmer: pixels rising off his shoulders
    c.globalAlpha = 0.55; c.fillStyle = tier === 3 ? "#fde047" : ORANGE
    for (let i = 0; i < 6; i++) { const ph = (frame * 2 + i * 13) % 40; px(c, x0 + 6 + ((i * 23) % (w - 12)), y0 + 20 - ph, 3) }
  }
  if (tier === 3) {                                                         // armor glow: a stepped orange outline, pulsing
    const a = 0.45 + 0.35 * ((frame >> 2) % 2); c.globalAlpha = a; c.fillStyle = ORANGE
    for (let yy = 0; yy < h; yy += 6) { px(c, x0 - 3, y0 + yy, 3); px(c, x0 + w + 3, y0 + yy, 3) }
    for (let xx = 0; xx < w; xx += 6) { px(c, x0 + xx, y0 - 3, 3) }
  }
  const age = s.t - s.roarT
  if (age >= 0 && age < 24) {                                               // the roar burst: two pixel rings expanding
    c.globalAlpha = 1 - age / 24; c.fillStyle = WHITE
    for (const r0 of [age * 5 + 10, age * 3 + 4]) for (let k = 0; k < 16; k++) { const an = k / 16 * Math.PI * 2; px(c, cx(f) + Math.cos(an) * r0, y0 + h * 0.3 + Math.sin(an) * r0 * 0.7, 4) }
  }
  c.restore()
})

// ── 4. MOVES — NO PROJECTILES ANYWHERE ───────────────────────────────────────────────────────────────────────────
// Every special is either a CHAIN of real engine melee moves (api.startMove → combat.js resolves the box in front of him, the
// block / chip / hitstun / combo scaling / onContact, exactly like a normal; category "special"), or the command grab. No
// projectile entity is ever spawned (asserted by the harness, scanning activeProjectiles through every move).
const blockstunFor = (active, recovery, onBlock) => Math.max(1, active + recovery + onBlock)
function canAct(f, s) {
  return f.transformed && f.activeAlien === RT_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
const pose = (f, name, left) => { f._spriteCastMove = name; f._spriteCastTimer = Math.max(2, left) }
function beginCast(f, s, api, cost) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  if (s.oppDir) f.facing = s.oppDir                                          // every cast faces the opponent
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  s.castId++; s.stats.casts++
  return s.castId
}
const clampX = (s, o, x) => Math.max(s.stage.L, Math.min(s.stage.R - (o.w || 60), x))
// one engine melee step: (key, damage, startup, active, recovery, extra) — pre-mod numbers; the box reaches rangeX in front
const step = (key, damage, startup, active, recovery, extra = {}) => ({ key, md: { damage, startup, active, recovery, frameExact: true,
  isSpecial: true, category: "special", rangeY: 90, hitstun: 20, knockbackX: 2, knockbackY: 0, ...extra } })
BUSY.push(s => !!(s.chain || s.grab || s.lunge || s.ult))

// THE CHAIN RUNNER: steps start back-to-back (frameExact moves end with 0 cooldown); a step marked `needContact` only comes
// out if the previous one connected or was blocked. A hit that FLINCHES him (hitstun) ends the chain — under RATH'S FURY the
// armor leaves no hitstun, so the chain goes on. `lunge` = the shared `_benLunge` (stage-clamped real travel), from `lungeAt`
// frames into the step.
function startChain(f, s, api, kind, cast, steps, poseName, whiff = 0) {
  s.chain = { kind, cast, face: f.facing || 1, i: 0, stepT: 0, t: 0, steps, contacts: [], pose: poseName, whiff, why: null }
  s.stats[kind === "rake" ? "rakes" : kind === "rush" ? "rushes" : "slams"]++
  return nextStep(f, s, api)
}
function nextStep(f, s, api) {
  const c = s.chain, st = c.steps[c.i]
  if (st.needContact && !c.contacts.some(k => k.key === c.steps[c.i - 1].key)) { endChain(f, s, "whiff", c.whiff); return true }
  if (!api.startMove(f, st.key, st.md)) { endChain(f, s, "refused"); return false }
  c.i++; c.stepT = 0
  return true
}
function endChain(f, s, why, recover = 0) {
  const c = s.chain; if (!c) return
  s.lastChain = { kind: c.kind, why, contacts: c.contacts.map(k => ({ ...k })), steps: c.i, t: c.t }
  s.chain = null; delete f._benLunge
  if (recover > 0) { f.attackCooldown = Math.max(f.attackCooldown || 0, recover); f._benPowerCommit = Math.max(f._benPowerCommit || 0, recover); pose(f, "idle", recover) }
  else if (why !== "done") { f._spriteCastMove = null; f._spriteCastTimer = 0 }
}
TICKS.push((f, s, input, api) => {
  const c = s.chain; if (!c) return
  c.t++; c.stepT++
  if ((f.hitstun || 0) > 0 || f.knockdownState) { endChain(f, s, "hit"); return }
  const st = c.steps[c.i - 1]
  if (f.attacking && f.currentAttack && st && f.currentAttack.name === st.key) {
    if (st.lunge && c.stepT === (st.lunge.at || 0) + 1) f._benLunge = { speed: c.face * st.lunge.speed, frames: st.lunge.frames }
    pose(f, st.pose || c.pose, 2); return
  }
  if (c.i < c.steps.length) { nextStep(f, s, api); if (s.chain) pose(f, c.steps[c.i - 1].pose || c.pose, 2); return }
  endChain(f, s, "done")
})
CONTACT.unshift((f, s, target, { move, blocked }) => {                     // step bookkeeping (before the Fury gain)
  const n = move && move.name, c = s.chain; if (!n || !c || !c.steps.some(st => st.key === n)) return
  c.contacts.push({ key: n, blocked: !!blocked })
  if (!blocked) { if (c.kind === "rake") s.stats.rakeHits++; if (c.kind === "rush") s.stats.rushHits++; if (c.kind === "slam") s.stats.slamHits++ }
  if (n === "rt_rush_1") { delete f._benLunge; if (f.currentAttack) f.currentAttack.timer = Math.min(f.currentAttack.timer, 1) }   // the charge stops on contact
  if (n === "rt_slam" && !blocked) s.bounce = { at: s.t + 1, cast: c.cast }
})

// 1. CLAW RAKE (↓↘→ + P, 10) — B10 wind-up → B11 claw slash: 12f startup, 3 hits 18 / 18 / 24 = 60, 170 px reach, a real
//    forward step (48 px during the startup), −10 on block, no projectile, no tracking.
export const RT_RAKE = { STARTUP: 12, HITS: [18, 18, 24], REACH: 170, GAP: 4, ON_BLOCK: -10, RECOVERY: 18, STEP: { speed: 4, frames: 12 } }
function castRake(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, RT_COST.rake); if (cast == null) return false
  const R = RT_RAKE, last = R.HITS.length - 1
  return startChain(f, s, api, "rake", cast, R.HITS.map((d, k) => step(`rt_rake_${k + 1}`, d, k ? R.GAP : R.STARTUP, k === last ? 3 : 2, k === last ? R.RECOVERY : 0, {
    rangeX: R.REACH, rtFollow: k > 0, hitstun: k === last ? 24 : 16, knockbackX: k === last ? 6 : 0.5,
    blockstun: k === last ? blockstunFor(3, R.RECOVERY, R.ON_BLOCK) : R.GAP + 6, ...(k === 0 ? {} : {}) })).map((st, k) => (k === 0 ? { ...st, lunge: { at: 0, ...R.STEP } } : st)), "rtRake")
}
CASTS.rake = castRake

// 2. RATH RUSH (→→ + P, 12) — leap B1 → the hunched charge B4–B9: 14f startup, a 320 px charge (real travel, 20 px/f), 2 hits
//    22 / 30 = 52 (the charge stops at the first contact, the second hit follows; a whiff = no second hit, 20f recovery),
//    −13 on block, no invulnerability, no armor outside RATH'S FURY.
export const RT_RUSH = { STARTUP: 14, TRAVEL: 320, SPEED: 20, HITS: [22, 30], ON_BLOCK: -13, RECOVERY: 20, WHIFF: 20 }
function castRush(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, RT_COST.rush); if (cast == null) return false
  const R = RT_RUSH, run = R.TRAVEL / R.SPEED
  return startChain(f, s, api, "rush", cast, [
    { ...step("rt_rush_1", R.HITS[0], R.STARTUP, run, 0, { rangeX: 50, hitstun: 22, knockbackX: 1, blockstun: 12 }), lunge: { at: R.STARTUP, speed: R.SPEED, frames: run } },
    { ...step("rt_rush_2", R.HITS[1], 3, 3, R.RECOVERY, { rangeX: 80, rtFollow: true, hitstun: 26, knockbackX: 7, blockstun: blockstunFor(3, R.RECOVERY, R.ON_BLOCK) }), needContact: true, pose: "rtRushHit" }
  ], "rtRush", R.WHIFF)
}
CASTS.rush = castRush

// 4. OVERHEAD SLAM (←↙↓ + P, 14) — B10 overhead wind-up → T17 swung down (a render-only overhead arc): 16f startup, 56,
//    a GROUND BOUNCE on a clean hit (the frame after: they bounce up off the floor, juggleable), −14 on block, melee range.
export const RT_SLAM = { STARTUP: 16, DMG: 56, ACTIVE: 4, RECOVERY: 24, ON_BLOCK: -14, REACH: 110, BOUNCE_VY: -10, BOUNCE_STUN: 34 }
function castSlam(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, RT_COST.slam); if (cast == null) return false
  const R = RT_SLAM
  return startChain(f, s, api, "slam", cast, [step("rt_slam", R.DMG, R.STARTUP, R.ACTIVE, R.RECOVERY, { rangeX: R.REACH, hitstun: 30, knockbackX: 1,
    hitLevel: "overhead", blockstun: blockstunFor(R.ACTIVE, R.RECOVERY, R.ON_BLOCK) })], "rtSlam")
}
CASTS.slam = castSlam
TICKS.push((f, s, input, api, opp) => {                                       // the ground bounce
  const b = s.bounce; if (!b || s.t < b.at) return
  s.bounce = null
  if (!opp || opp.eliminated || !((opp.hitstun || 0) > 0) || opp.isLaunched) return
  opp.vy = RT_SLAM.BOUNCE_VY; opp.onGround = false; opp.grounded = false; opp.isLaunched = true
  opp.hitstun = Math.max(opp.hitstun || 0, RT_SLAM.BOUNCE_STUN); s.stats.bounces++
})

// 3. "LET ME TELL YOU SOMETHING, [OPPONENT'S NAME]!" (↓↙← + P, 16) — a COMMAND GRAB: 15f startup, 110 px (centre to
//    centre), 28f whiff recovery. STANDARD THROW RULES (combat.resolveGrab's tests, Humongousaur's Crush Grab): both grounded,
//    not during his combo, an invulnerable / knocked-down target can't be grabbed, a defender out of hit / blockstun with Grab
//    buffered TECHS it (both pushed apart, 18f each). On a grab: the rant — B3 shouting + 4 guaranteed hits × 15 = 60 (source
//    "grab-throw"; each one a landed hit: +4 Fury) — then a SHOVE 150 px away (stage-clamped). No pip system.
export const RT_GRAB = { STARTUP: 15, RANGE: 110, WHIFF: 28, TICKS: [12, 22, 32, 42], DMG: 15, HOLD: 50, SHOVE: 150, GAP: 52, RECOVERY: 16, TECH: 18 }
function castGrab(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, RT_COST.grab); if (cast == null) return false
  const st = startupOf(s, RT_GRAB.STARTUP), end = st + RT_GRAB.WHIFF
  f.attackCooldown = end; f._benPowerCommit = end; f.vx = 0
  s.grab = { t: 0, st, cast, face: f.facing || 1, held: false, h: 0, end, result: null, dealt: 0, raw: 0, ticks: 0, shoved: 0, name: "" }
  s.stats.grabs++; pose(f, "rtGrab", end)
  return true
}
CASTS.grab = castGrab
export function grabCanGrab(f, opp) {
  if (!opp || opp.eliminated || opp.isGrabbed) return "none"
  if (!grounded(f) || !grounded(opp)) return "air"
  if ((f.comboCounter || 0) > 0) return "combo"
  if ((opp.invulnTimer || 0) > 0 || opp.knockdownState) return "invuln"
  if (Math.abs(cx(opp) - cx(f)) > RT_GRAB.RANGE) return "range"
  return "ok"
}
TICKS.push((f, s, input, api, opp) => {
  const m = s.grab; if (!m) return
  m.t++
  if (!m.held && (f.hitstun || 0) > 0) { s.grab = null; return }
  if (m.t === m.st) {
    const why = grabCanGrab(f, opp); m.result = why
    if (why === "ok") {
      const canTech = !((opp.hitstun || 0) > 0 || (opp.blockstun || 0) > 0)
      if (canTech && (opp.grabInputBuffer || 0) > 0) {                         // THROW ESCAPE (the standard tech)
        m.result = "teched"; s.stats.teched++
        f.attackCooldown = RT_GRAB.TECH; opp.attackCooldown = RT_GRAB.TECH; f._benPowerCommit = RT_GRAB.TECH
        f.vx = -m.face * 3; opp.vx = m.face * 3; m.end = m.t + RT_GRAB.TECH
      } else {
        m.held = true; m.h = 0; s.stats.grabbed++; s.stats.rants++
        m.name = String(opp.name || opp.displayName || opp.rosterKey || "").toUpperCase()
        m.end = m.t + RT_GRAB.HOLD + RT_GRAB.RECOVERY
        f.attackCooldown = m.end - m.t; f._benPowerCommit = m.end - m.t
        opp.attacking = false; opp.currentAttack = null; opp.isCharging = false
      }
    }
  }
  if (m.held && opp && !opp.eliminated) {
    m.h++
    if (m.h <= RT_GRAB.HOLD) {                                                // held by the collar in front of him, ranted at
      opp.hitstun = Math.max(opp.hitstun || 0, 10); opp.vx = 0; opp.vy = 0
      opp.x = clampX(s, opp, cx(f) + m.face * RT_GRAB.GAP - (opp.w || 60) / 2)
      if (RT_GRAB.TICKS.includes(m.h)) {
        const hp = opp.health; api.applyScaledDamage(opp, RT_GRAB.DMG, { attacker: f, move: "rt_grab_rant", source: "grab-throw" })
        m.dealt += hp - opp.health; m.raw += RT_GRAB.DMG; m.ticks++
        gainFury(f, s, RT_FURY.HIT, "dealt"); opp.colorFlash = 6; api.shake?.(3, 4)
      }
      if (m.h === RT_GRAB.HOLD) {                                             // the shove: 150 px away, a small pop
        const from = opp.x
        opp.x = clampX(s, opp, opp.x + m.face * RT_GRAB.SHOVE); m.shoved = opp.x - from
        opp.vx = m.face * 2; opp.vy = -6; opp.hitstun = Math.max(opp.hitstun || 0, 26)
        opp.onGround = false; opp.grounded = false; opp.isLaunched = true
        m.held = false; m.done = true
      }
    }
  }
  pose(f, m.held ? (RT_GRAB.TICKS.some(k => m.h >= k && m.h < k + 6) ? "rtRantHit" : "rtRant") : "rtGrab", m.end - m.t)
  if (m.t >= m.end) { s.lastGrab = { result: m.result, dealt: m.dealt, raw: m.raw, ticks: m.ticks, shoved: m.shoved, whiffRec: m.result !== "ok" && m.result !== "teched" ? RT_GRAB.WHIFF : 0 }; s.grab = null }
})

// 5. PRIMAL LUNGE (air ↓↘→ + P — any air Special; 12) — leap B1 → long straight T16: a diagonal dive (the shared `_benGlide`),
//    50 on the body hit (one engine melee move), once per airtime, no jump refill, melee only. 12f landing.
export const RT_LUNGE = { STARTUP: 4, VX: 9, VY: 11, MAX: 40, DMG: 50, LAND: 12 }
function castLunge(f, s, api) {
  if (grounded(f) || s.lungeUsed) return false
  const cast = beginCast(f, s, api, RT_COST.lunge); if (cast == null) return false
  const R = RT_LUNGE
  if (!api.startMove(f, "rt_lunge", step("rt_lunge", R.DMG, R.STARTUP, R.MAX, 0, { rangeX: 60, rangeY: 100, hitstun: 26, knockbackX: 4, knockbackY: -5, blockstun: 12 }).md)) return false
  s.lungeUsed = true; s.stats.lunges++
  s.lunge = { t: 0, st: R.STARTUP, cast, face: f.facing || 1, lastY: f.y, hit: false, jumps: f.jumpCount }
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }
  return true
}
CASTS.lunge = castLunge
TICKS.push((f, s) => {
  if (grounded(f) && !s.lunge) s.lungeUsed = false                            // once per airtime
  const d = s.lunge; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { endLunge(f, s, false); return }
  if (d.t <= d.st) { f._benGlide = { vx: 0, vy: 0 }; pose(f, "rtLunge", 2); return }
  const landed = d.t > d.st + 1 && (f.y === d.lastY || grounded(f))
  d.lastY = f.y
  if (landed || d.t >= d.st + RT_LUNGE.MAX) { endLunge(f, s, landed); return }
  f._benGlide = { vx: d.face * RT_LUNGE.VX, vy: RT_LUNGE.VY }
  pose(f, "rtLunge", 2)
})
function endLunge(f, s, landed) {
  const d = s.lunge; s.lunge = null; delete f._benGlide
  if (f.attacking && f.currentAttack && f.currentAttack.name === "rt_lunge") { f.attacking = false; f.currentAttack = null }
  if (landed) { f.attackCooldown = RT_LUNGE.LAND; f._benPowerCommit = RT_LUNGE.LAND; pose(f, "crouch", RT_LUNGE.LAND) }
  else { f._spriteCastMove = null; f._spriteCastTimer = 0 }
  s.lastLunge = { landed, hit: d.hit, jumps: d.jumps }
}
CONTACT.unshift((f, s, target, { move, blocked }) => {
  if (!move || move.name !== "rt_lunge" || !s.lunge) return
  s.lunge.hit = true; if (!blocked) s.stats.lungeHits++
})

// ── the moves' render-only FX (nothing here is GAME_STATE or collides) ────────────────────────────────────────────
const SPARK = "#ffffff", CLAW = "#a7a7a7"
const spark = (c, x, y, k, frame) => { c.fillStyle = (frame & 2) ? SPARK : CLAW; for (let i = 0; i < 4; i++) px(c, x + Math.cos(i * 1.57 + k) * (4 + (frame % 3) * 3), y + Math.sin(i * 1.57 + k) * (4 + (frame % 3) * 3), 3) }
// the speech burst: a jagged pixel balloon over his head (text or "!" glyphs; render-only, no hitbox, not GAME_STATE)
function speech(c, f, text, frame) {
  const w = Math.max(40, Math.min(260, text.length * 6 + 16)), h = 22, x = cx(f) - w / 2, y = f.y - h - 26 - ((frame >> 3) % 2)
  c.save(); c.fillStyle = INK; c.fillRect(Math.round(x - 2), Math.round(y - 2), w + 4, h + 4)
  c.fillStyle = WHITE; c.fillRect(Math.round(x), Math.round(y), w, h)
  for (let i = 0; i < w; i += 8) { c.fillStyle = INK; c.fillRect(Math.round(x + i), Math.round(y - 4), 3, 3); c.fillRect(Math.round(x + i + 4), Math.round(y + h + 1), 3, 3) }
  c.fillStyle = WHITE; c.fillRect(Math.round(cx(f) - 3), Math.round(y + h), 6, 8)
  c.fillStyle = "#b91c1c"; c.font = "bold 9px monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, Math.round(cx(f)), Math.round(y + h / 2 + 1))
  c.restore()
}
FX_DRAW.push((c, f, s, frame, opp) => {
  const face = f.facing || 1, h = f.h || 118, a = f.attacking && f.currentAttack
  if (a) {
    const el = (a.total || 0) - (a.timer || 0), act = el >= (a.activeStart || 0) && el <= (a.activeEnd ?? 0)
    if ((a.name === "down" || /^rt_rake/.test(a.name) || a.name === "rt_lunge") && act) spark(c, cx(f) + face * ((f.w || 64) / 2 + 40), f.y + h * (a.name === "down" ? 0.85 : 0.45), el, frame)
    if (a.name === "rt_slam" && el < (a.activeEnd ?? 0) + 2) {               // the overhead arc: pixel dots on a half circle
      const p = Math.min(1, el / Math.max(1, a.activeStart || 1)); c.save(); c.fillStyle = (frame & 2) ? SPARK : ORANGE
      for (let i = 0; i <= 6; i++) { const an = Math.PI * (1 - p * i / 6); px(c, cx(f) + face * Math.cos(an) * 60, f.y + h * 0.35 - Math.sin(an) * 60, 4) }
      c.restore()
    }
    if (/^rt_rush/.test(a.name)) { c.save(); c.globalAlpha = 0.5; c.fillStyle = "#c2a878"; for (let i = 1; i <= 4; i++) px(c, cx(f) - face * i * 16, f.y + h - 4 - (i % 2) * 3, 7 - i); c.restore() }
  }
  const g = s.grab
  if (g && g.held) speech(c, f, `LET ME TELL YOU SOMETHING, ${g.name}!`, frame)
})

// ── ULTIMATE: RATH'S FURY (the Omnitrix Overload input; 55 Power) ─────────────────────────────────────────────────────────
// Needs a CLEAN OPENER: a Claw-Rake-style swipe (B10 → B11; an engine melee move, category ultimate) — 40. A whiff or a block:
// no cinematic, 60f recovery. On a clean hit, the existing capture pattern (no projectile anywhere):
//  1. he grabs them by the collar (B3) and starts shouting — a render-only speech burst ("!!!"; no hitbox, not GAME_STATE),
//     both fighters stay readable;
//  2. THE RANT: 5 punches × 22 = 110 with his punch frames, at angles hash(match seed, start frame, player index), all melee;
//  3. the finisher: the double-arm flex (B12) winds into one haymaker (T16): 90, knockdown.
// Total 240 unscaled (40 + 110 + 90), never boosted by the Fury tiers. Afterwards Fury = 0 (a running RATH'S FURY window ends
// with it — but the COOLDOWN only ever starts from the window ending naturally, never from the ultimate alone), positions
// restore, no persistent hazard, 100f recovery lockout.
export const RT_ULT = { OPEN_ST: 12, OPEN_ACTIVE: 4, OPENER: 40, REACH: 150, WHIFF: 60, GRAB_T: 14, RANT_AT: [24, 34, 44, 54, 64], RANT: 22,
  WIND_AT: 72, FINAL_AT: 90, FINAL: 90, END: 104, LOCKOUT: 100, KD: 60, ZOOM: 0.85 }
function fireRathsFury(f, ctx, api) {
  const s = rtState(f); if (!s || !canAct(f, s)) return false
  if (!api.spendEnergy(f, RT_COST.ultimate)) return false
  s.castId++
  if (s.oppDir) f.facing = s.oppDir
  const face = f.facing || 1
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  const ok = api.startMove(f, "rt_ult_open", { damage: RT_ULT.OPENER, startup: RT_ULT.OPEN_ST, active: RT_ULT.OPEN_ACTIVE, recovery: 0, frameExact: true,
    isUltimate: true, category: "ultimate", rangeX: RT_ULT.REACH, rangeY: 90, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, rtFollow: true })
  if (!ok) { f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + RT_COST.ultimate); return false }
  s.ult = { phase: "opener", t: 0, face, raw: 0, hits: [], cast: s.castId, seed: (ctx?.seed ?? 1) >>> 0, f0: ctx?.frame ?? s.t, pi: pIndex(f), contact: null }
  pose(f, "rtRake", RT_ULT.OPEN_ST + RT_ULT.OPEN_ACTIVE)
  return true
}
ULT = fireRathsFury
function ultMiss(f, s, why) {                                                // whiff / block: no cinematic, 60f recovery
  s.lastUlt = { captured: false, why, raw: 0 }; s.ult = null
  if (f.attacking && f.currentAttack && f.currentAttack.name === "rt_ult_open") { f.attacking = false; f.currentAttack = null }
  f.attackCooldown = Math.max(f.attackCooldown || 0, RT_ULT.WHIFF); f._benPowerCommit = Math.max(f._benPowerCommit || 0, RT_ULT.WHIFF); pose(f, "idle", RT_ULT.WHIFF)
}
function startCapture(f, s, target) {
  const u = s.ult
  u.phase = "grab"; u.t = 0; u.raw = RT_ULT.OPENER; u.hits.push(RT_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  if (f.attacking && f.currentAttack && f.currentAttack.name === "rt_ult_open") { f.attacking = false; f.currentAttack = null }
  f.attackCooldown = RT_ULT.END + RT_ULT.LOCKOUT; f._benPowerCommit = RT_ULT.END; f._spriteCastTimer = RT_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, RT_ULT.END + 2)
}
// pure: the rant punches of one cast (render + the held target's sway share them; the same seed → the same angles)
export function ultRant(seed, frame0, pi) {
  return RT_ULT.RANT_AT.map((at, i) => ({ at, ang: Math.round((rtHash(seed, frame0, pi, i) * 2 - 1) * 60), len: 50 + Math.floor(rtHash(seed, frame0, pi, i + 16) * 40),
    hi: rtHash(seed, frame0, pi, i + 32) < 0.5 }))
}
TICKS.push((f, s, input, api, opp) => {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") {
    u.t++
    if (u.contact) { if (u.contact.blocked || !opp || opp.eliminated) ultMiss(f, s, "blocked"); else startCapture(f, s, opp); return }
    if (!(f.attacking && f.currentAttack && f.currentAttack.name === "rt_ult_open")) { ultMiss(f, s, (f.hitstun || 0) > 0 ? "hit" : "whiff"); return }
    pose(f, "rtRake", 2); return
  }
  if (!opp || opp.eliminated) { endUlt(f, s, null, api); return }
  u.t++
  if (u.t === 1) api?.focusCamera?.(f, opp, RT_ULT.ZOOM, RT_ULT.END)       // render-only framing
  opp.hitstun = Math.max(opp.hitstun || 0, 4); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null; opp.isBlocking = false
  f.vx = 0; f.vy = 0
  const hit = (dmg, shake, move) => { api.applyScaledDamage(opp, dmg, { attacker: f, move, source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 10) }
  const near = u.thome.x - u.face * ((f.w || 64) - 6)
  f.x = near; f.y = u.home.y
  if (u.t < RT_ULT.GRAB_T) { u.phase = "grab"; f._spriteCastMove = "rtUltGrab" }
  else if (u.t < RT_ULT.WIND_AT) {
    u.phase = "rant"; const k = RT_ULT.RANT_AT.indexOf(u.t)
    f._spriteCastMove = RT_ULT.RANT_AT.some(at => u.t >= at && u.t < at + 6) ? "rtUltPunch" : "rtUltGrab"
    if (k >= 0) hit(RT_ULT.RANT, 5 + k, "rt_ult_rant")
  } else if (u.t <= RT_ULT.FINAL_AT) {
    u.phase = "final"; f._spriteCastMove = "rtUltFinal"
    if (u.t === RT_ULT.FINAL_AT) hit(RT_ULT.FINAL, 18, "rt_ult_final")
  } else if (u.t < RT_ULT.END) { u.phase = "after"; f._spriteCastMove = "win" }
  else { endUlt(f, s, opp, api); return }
  f._spriteCastTimer = 2
})
function endUlt(f, s, opp, api) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30)
    if (!opp.eliminated) { opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, RT_ULT.KD) } }
  s.lastUlt = { captured: !!u?.home, raw: u?.raw || 0, hits: u?.hits ? u.hits.slice() : [], seed: u?.seed, f0: u?.f0, pi: u?.pi,
    home: u?.home ? { ...u.home } : null, thome: u?.thome ? { ...u.thome } : null, endT: s.t, furyWasOn: furyOn(s) }
  s.ult = null
  s.fury = 0; s.furyT = 0                                                    // Fury reset; no cooldown from the ultimate alone
  api?.focusCamera?.(f, opp, 1, 12)
  f.attackCooldown = RT_ULT.LOCKOUT; f._benPowerCommit = RT_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
CONTACT.unshift((f, s, target, { move, blocked }) => {
  const u = s.ult; if (!u || u.phase !== "opener" || !move || move.name !== "rt_ult_open") return
  u.contact = { blocked: !!blocked }
})
// render-only: the held opponent rocks under each rant punch (never collision)
function targetOffset(f, t) {
  const s = rtState(f), u = s && s.ult; if (!u || u.phase !== "rant") return null
  const r = ultRant(u.seed, u.f0, u.pi), k = r.findIndex(p => u.t >= p.at && u.t < p.at + 6); if (k < 0) return null
  return { dx: u.face * (6 - (u.t - r[k].at)), dy: r[k].hi ? -3 : 2 }
}
FX_DRAW.push((c, f, s, frame, opp) => {
  const u = s.ult; if (!u || u.phase === "opener") return
  if (u.phase === "grab" || u.phase === "rant") speech(c, f, "!!!", frame)
  if (u.phase === "rant" && opp) {                                          // punch impact lines at the hashed angles
    const r = ultRant(u.seed, u.f0, u.pi), k = r.findIndex(p => u.t >= p.at && u.t < p.at + 5); if (k < 0) return
    const p = r[k], an = p.ang * Math.PI / 180, ox = cx(opp), oy = opp.y + (opp.h || 110) * (p.hi ? 0.3 : 0.5)
    c.save(); c.fillStyle = (frame & 2) ? SPARK : ORANGE
    for (let i = 0; i < 6; i++) px(c, ox - u.face * Math.cos(an) * i * p.len / 6, oy - Math.sin(an) * i * p.len / 6, 4)
    c.restore()
  }
  if (u.phase === "final" && u.t >= RT_ULT.FINAL_AT - 2 && opp) { c.save(); c.fillStyle = WHITE; for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2; px(c, cx(opp) + Math.cos(an) * 30, opp.y + 40 + Math.sin(an) * 30, 5) } c.restore() }
})
