// waterhazard.js — WATER HAZARD (Orishan), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table + read-only data / readers (Goop's Puddle Form numbers, Ripjaws' flood
// reader and electric-hit tags). The engine reaches it only through the generic, ben10-gated ready-form hooks
// (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate — see docs/ben10/ADD_ALIEN.md), which hand
// it an `api` with the shared primitives.
// STRICTLY WATER: tagged "water" in waterAffinity.js, so inside a Ripjaws STORM TIDE flood he is WATERBORNE (no breath, no
// drowning, no wading / swim penalties — Ripjaws' own rule, applied by benFlood.js) and his Pressure Core reads the flood
// depth (read-only, waterOf()).
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE) plus ONE self-expiring stamp on the
// opponent (`_benShortFuse`, plain data); render-only effects (droplets, splash rings, glow, vortex, geyser, shake) never
// write it. Simulation randomness: hash(match seed, frame, player index) only.
// Sheet from fun-tech.tk: docs/ben10/aliens/waterhazard/SPRITE_LEDGER.md.
import { WATERHAZARD_ANIM, WATERHAZARD_GEOM } from "./waterhazardAssets.js"
import { GP_PUDDLE, GP_GEYSER } from "./goop.js"   // Goop's Puddle Form / Geyser numbers, READ (identical by construction; goop.js imports only its art)
export { WATERHAZARD_ANIM, WATERHAZARD_GEOM }

export const WH_KEY = "waterhazard"
const ANIM = { ...WATERHAZARD_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const WATERHAZARD = {
  id: WH_KEY, poolKey: WH_KEY, displayName: "Water Hazard", slot: 22,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Rath (21)
  status: "ready", sheetPath: "./ben10_waterhazard_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/waterhazard/SPRITE_LEDGER.md",
  mods: { speed: 0.95, damage: 1.05, defense: 1.00, weight: 1.05 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  tags: ["water"],                              // documentation; the live tag map is waterAffinity.js WATER_AFFINITY_FORMS
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Pressure Blast", special2: "Hydro Burst", special3: "Claw Lash", special4: "Puddle Form",
    special5: "Undertow Sweep", special6: "Geyser Dive", passive: "Pressure Core", ultimate: "Tidal Discharge" },
  basic_attacks: {
    light:  normal(18, 5, 3, 9, 0, { rangeX: 90 }),                                              // Col 2 R2 → R6 reach (+ render lunge)
    heavy:  normal(54, 14, 4, 22, -6, { knockbackX: 6, rangeX: 170 }),                          // Col 2 R5 → R6 reach, extended 170 px
    down:   normal(24, 7, 3, 14, -4, { hitLevel: "low", rangeX: 120 }),                         // Col 3 R1 crouch claw, hits low
    up:     normal(46, 11, 4, 24, -9, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 95 }),    // Col 4 R2 → Col 3 R3 rising arm
    air:    normal(28, 7, 4, 12, 2, { rangeX: 85 })                                             // Col 2 R5 leap body
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, struck, damageDealt, evade, bodyAlpha, hurtbox, targetOffset,
  drawHud: drawWaterHazardHud, drawFx: drawWaterHazardFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshWaterHazardState() {
  return { kind: WH_KEY, t: 0, castId: 0, noAttack: false, base: null, stage: { L: -1e6, R: 1e6 },
    oppDir: 1, hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, specialHeld: false,
    core: 0, lastGainT: 0, coreDealt: 0, coreTaken: 0, coreBlocked: 0, coreFlood: 0, floodDepth: "dry",
    pips: 0, pipT: 0, pipCasts: [], fuses: 0, fuseView: "",
    puddle: null, dp: { stage: 0, t: 0 }, blast: null, burst: null, chain: null, sweep: null, dive: null, diveUsed: false, ult: null,
    lastBlast: null, lastBurst: null, lastChain: null, lastSweep: null, lastDive: null, lastUlt: null, lastPuddle: null,
    stats: { casts: 0, puddles: 0, geysers: 0, evaded: 0, blasts: 0, blastHits: 0, bursts: 0, burstHits: 0, lashes: 0, lashHits: 0,
      sweeps: 0, sweepHits: 0, dives: 0, diveHits: 0 } }
}
export const whState = f => (f?.omnitrix?.formState?.kind === WH_KEY && f.transformed && f.activeAlien === WH_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshWaterHazardState()
  s.base = { walk: f._benWalkSpeed, dash: f.dashSpeed, jump: f.jumpForce }
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function whHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
const TICKS = []   // section ticks (f, s, input, api, opp, ctx), filled by the sections below, run in order
function tick(f, input, ctx, api) {
  const s = whState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  input = input || {}
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  s.oppDir = opp && !opp.eliminated ? (cx(opp) >= cx(f) ? 1 : -1) : (f.facing || 1)
  tickInputs(f, s, input, s.oppDir)
  s.specialHeld = !!input.special
  for (const fn of TICKS) fn(f, s, input, api, opp, ctx)
  s.noAttack = busy(s)
}
const BUSY = []    // predicates: a cast owns him
const busy = s => BUSY.some(p => p(s))
// moveFrames hook (combat.startMove): his own special moves (wh_*) pass; no normals while a cast owns him
const MD_XFORM = []
function moveFrames(f, key, md) {
  const s = whState(f); if (!s || !md) return md
  if (!/^wh_/.test(key) && busy(s)) return false
  return MD_XFORM.reduce((m, fn) => fn(f, s, key, m), md)
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, opponent-relative: 6 = toward, 4 = away, 2 = ↓ …; consecutive duplicates dropped,
// 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   ↓↘→ + P (236) PRESSURE BLAST (hold P to charge)   ↓↙← + P (214) HYDRO BURST   ←↙↓ + P (412) UNDERTOW SWEEP
//   →→ + P (a frame-counted double tap) CLAW LASH      ↓ + P (hold) PUDDLE FORM     air ↓ + P (any air Special) GEYSER DIVE
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral / ↑ / → Pressure Blast,
// ← Hydro Burst, ↓ Puddle Form, → after a double tap Claw Lash. Directions are read RELATIVE TO THE OPPONENT.
export const WH_DASH_WINDOW = 14, WH_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input, face) {
  const fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= WH_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["412", "sweep"], ["214", "burst"], ["236", "blast"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= WH_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "dive"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (s.t - (s.dashTapT ?? -999) <= WH_DASH_WINDOW && (dir === "F" || !dir)) return "lash"
  if (dir === "B") return "burst"
  if (dir === "D") return "puddle"
  return "blast"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const WH_COST = { blast: 10, blastFull: 6, burst: 14, lash: 12, sweep: 12, dive: 12, ultimate: 55 }   // puddle: Goop's GP_PUDDLE.COST
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = whState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
let ULT = null     // the ultimate's cast (Phase 6)
function fireUltimate(f, ctx, api) { return ULT ? ULT(f, ctx, api) : false }

// ── hooks dispatched to the sections ──────────────────────────────────────────────────────────────────────────
const CONTACT = []   // onContact (f, s, target, info): a contact HE made
function onContact(f, target, info) {
  const s = whState(f); if (!s || !target) return
  for (const h of CONTACT) h(f, s, target, info || {})
}
const STRUCK = []    // struck (f, s, info): an attack that landed on him or that he blocked
function struck(f, info) {
  const s = whState(f); if (!s) return
  for (const h of STRUCK) h(f, s, info || {})
}
const DEALT = []     // damageDealt (f, s, target, raw, opts) → raw
function damageDealt(f, target, raw, opts) {
  const s = whState(f); if (!s || !(raw > 0)) return raw
  for (const fn of DEALT) raw = fn(f, s, target, raw, opts || {})
  return raw
}

// ── HUD + world overlays (render-only: read GAME_STATE, never write it) ────────────────────────────────────────
const HUD_PARTS = []   // (ctx, f, s, box) → draws one HUD row
export function drawWaterHazardHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = whState(f); if (!ctx || !s) return
  const w = Math.min(120, pbw || 120), y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save()
  for (const p of HUD_PARTS) p(ctx, f, s, { bx, y, w, flip })
  ctx.restore()
}
export function px(c, x, y, k = 3) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
const FX_DRAW = []   // (c, f, s, frame, opp) render-only layers
export function drawWaterHazardFx(c, f, frame = 0, opp = null) {
  const s = whState(f); if (!s || !c) return
  for (const d of FX_DRAW) d(c, f, s, frame, opp)
}

// ── 3. PUDDLE FORM (↓ + Special, hold) — Goop's Puddle Form, his numbers READ from goop.js (GP_PUDDLE / GP_GEYSER) ─────────
// melt (Col 4 R2 sinking, 6f) → slide (a procedural pixel puddle in his palette — the sheet has no puddle frame; speed 6,
// Power −4/s, max 150f) → release = reform (Col 4 R2 → Col 1 R1, 12f, punishable) or →↓↘ (+ P still held) = GEYSER UPPERCUT
// (60, launches). Entry costs 10. Low profile: in the puddle (melt / slide) high / mid melee and projectiles miss his body
// (the engine's generic `evade` hook — Goop's exact rule); a LOW melee move still hits. Can't jump, block or attack except to
// exit (power commit + cooldown). NO projector weak point (that was Goop's own; omitted for Water Hazard).
export const WH_PUDDLE = GP_PUDDLE, WH_GEYSER = GP_GEYSER
function canAct(f, s) {
  return f.transformed && f.activeAlien === WH_KEY && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
export const hold = (f, n) => { f._benPowerCommit = Math.max(f._benPowerCommit || 0, n); f.attackCooldown = Math.max(f.attackCooldown || 0, n) }
const pose = (f, name, left) => { f._spriteCastMove = name; f._spriteCastTimer = Math.max(2, left) }
BUSY.push(s => !!s.puddle)
function enterPuddle(f, s, api) {
  if (!grounded(f) || !canAct(f, s)) return false
  if (!api.spendEnergy(f, WH_PUDDLE.COST)) return false
  f.isCharging = false; f.vx = 0
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  s.castId++; s.stats.casts++; s.puddle = { phase: "melt", t: 0, pt: 0, cast: s.castId }; s.dp = { stage: 0, t: 0 }; s.stats.puddles++
  hold(f, 2)
  return true
}
CASTS.puddle = enterPuddle
function endPuddle(f, s, how) {
  const pd = s.puddle; if (!pd) return
  if (how === "reform") { pd.phase = "reform"; pd.pt = 0; hold(f, WH_PUDDLE.REFORM); return }
  s.lastPuddle = { how, t: pd.t }; s.puddle = null
}
TICKS.push((f, s, input, api) => {
  const pd = s.puddle; if (!pd) return
  if ((f.hitstun || 0) > 0 || (f.health || 0) <= 0) { s.lastPuddle = { how: "hit", t: pd.t }; s.puddle = null; return }   // knocked out of the puddle
  pd.pt++
  f.vx = 0
  if (pd.phase === "melt") {
    hold(f, 2); pose(f, "whMelt", 2)
    if (pd.pt >= WH_PUDDLE.MELT) { pd.phase = "slide"; pd.t = 0 }
    return
  }
  if (pd.phase === "reform") {
    pose(f, "whReform", 2)
    if (pd.pt >= WH_PUDDLE.REFORM) { s.lastPuddle = { how: "reform", t: pd.t }; s.puddle = null; f._spriteCastMove = null; f._spriteCastTimer = 0 }
    return
  }
  pd.t++
  hold(f, 2); pose(f, "whMelt", 2)
  if (!f.infiniteEnergy) f.energy = Math.max(0, (f.energy || 0) - WH_PUDDLE.DRAIN_PER_S / 60)
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left, down = !!input.down
  const dp = s.dp                                                           // GEYSER: →↓↘ inside the puddle (frame-counted)
  if (dp.stage > 0 && s.t - dp.t > WH_PUDDLE.DP_WINDOW) dp.stage = 0
  if (dp.stage === 0 && fwd && !down) { dp.stage = 1; dp.t = s.t }
  else if (dp.stage === 1 && down && !fwd) dp.stage = 2
  else if (dp.stage === 2 && down && fwd) { dp.stage = 0; castGeyser(f, s, api); return }
  if (!input.special) { endPuddle(f, s, "reform"); return }                 // release = reform (12f, punishable)
  if (pd.t >= WH_PUDDLE.MAX || (f.energy || 0) <= 0) { endPuddle(f, s, "reform"); return }
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  if (dir) f._benLunge = { frames: 1, speed: dir * WH_PUDDLE.SPEED }       // slide at speed 6 (stage-clamped by physics)
})
// GEYSER UPPERCUT (from the puddle): Col 4 R2 → Col 3 R3 rising arm; a geyser box under / in front of him on frame 8 — 60,
// launches (Goop's numbers). The geyser column itself is drawn procedurally (render-only).
function castGeyser(f, s, api) {
  s.lastPuddle = { how: "geyser", t: s.puddle.t }; s.puddle = null; s.stats.geysers++; s.castId++
  const cast = s.castId, face = f.facing || 1
  pose(f, "whGeyser", WH_GEYSER.FRAMES); hold(f, WH_GEYSER.FRAMES + WH_GEYSER.RECOVERY)
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  s.geyserT = s.t
  api.scheduleBenSpawn(f, WH_GEYSER.HIT_AT, () => {
    api.spawnProjectile(f, "wh_geyser", { damage: WH_GEYSER.DMG, speed: 0, vx: 0, vy: 0, rectHitbox: true,
      spawnX: f.x + f.w / 2 + face * 50, spawnY: f.y + f.h * 0.3, w: 100, h: 160, lifetime: 3,
      isSpecial: true, hitstun: 32, blockstun: 16, knockbackX: 3 * face, knockbackY: -14,
      alien: { wh: "geyser", cast } }, {})
  })
  return true
}
// Low profile (Goop's exact rule): in the puddle (melt / slide) everything but a LOW grounded melee move misses the body.
function evade(f, { move = null, proj = null, attacker = null } = {}) {
  const s = whState(f); if (!s || !s.puddle || s.puddle.phase === "reform") return false
  const low = !proj && !!move && !!attacker && !!(attacker.onGround || attacker.grounded) && move.hitLevel === "low"
  if (!low) s.stats.evaded++
  return !low
}
// render-only: the body sinks into the puddle during the melt and is replaced by it during the slide
function bodyAlpha(f) {
  const s = whState(f), pd = s && s.puddle; if (!pd) return 1
  return pd.phase === "slide" ? 0 : pd.phase === "melt" ? Math.max(0, 1 - pd.pt / WH_PUDDLE.MELT) : 1
}
const MAROON = "#8f1b31", DARKM = "#530c24", CYAN = "#00cccc", GREEN = "#00ff6c", WHITE = "#f1f5f9", INK = "#14141a"
FX_DRAW.push((c, f, s, frame) => {                                          // the procedural pixel puddle + its ripple
  const pd = s.puddle; if (!pd || pd.phase === "reform") return
  const k = pd.phase === "melt" ? Math.min(1, pd.pt / WH_PUDDLE.MELT) : 1, w = 30 + 46 * k, x0 = cx(f), y0 = f.y + (f.h || 112) - 3
  c.save()
  for (let i = -w; i <= w; i += 4) {
    const e = 1 - (i / w) ** 2, hh = Math.max(1, Math.round(6 * e))
    c.fillStyle = DARKM; c.fillRect(Math.round(x0 + i - 2), Math.round(y0 - hh), 4, hh + 2)
    c.fillStyle = MAROON; if (hh > 2) c.fillRect(Math.round(x0 + i - 2), Math.round(y0 - hh), 4, 2)
  }
  c.fillStyle = GREEN; px(c, x0 - 8, y0 - 4, 3); px(c, x0 + 8, y0 - 4, 3)               // the eyes, under the surface
  const r = (frame % 30) / 30; c.globalAlpha = 1 - r; c.fillStyle = CYAN                // a ripple ring
  for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2; px(c, x0 + Math.cos(an) * w * (0.6 + r * 0.6), y0 - 2 + Math.sin(an) * 3, 2) }
  c.restore()
})
FX_DRAW.push((c, f, s, frame) => {                                          // the geyser column (render-only)
  const age = s.t - (s.geyserT ?? -999); if (age < WH_GEYSER.HIT_AT - 2 || age > WH_GEYSER.FRAMES) return
  const face = f.facing || 1, x0 = cx(f) + face * 50, base = f.y + (f.h || 112), hgt = Math.min(1, (age - WH_GEYSER.HIT_AT + 2) / 5) * 170
  c.save(); c.globalAlpha = 0.85
  for (let y = 0; y < hgt; y += 6) { const ww = 22 + Math.sin((y + frame * 4) / 14) * 6; c.fillStyle = (y / 6) % 2 ? CYAN : WHITE; c.fillRect(Math.round(x0 - ww / 2), Math.round(base - y - 6), Math.round(ww), 6) }
  c.restore()
})

// ── 4. PRESSURE CORE (his unique resource, GAME_STATE) ───────────────────────────────────────────────────────────────
// A separate 0–100 gauge, shown under Omnitrix Power while he is active. GAINS: landing a hit +5 (onContact, not blocked),
// taking a hit +3, blocking one +2 (struck). FLOOD BONUS: while he is WADING in a live STORM TIDE flood +1/s, SUBMERGED +3/s —
// a READ-ONLY look at the flood's per-fighter stamp `_benWater` (plain data { ttl, depth, wb } that benFlood.js writes and
// physics / combat already read; the same test as benFlood.waterOf): it never writes the stamp, the flood, the water level or
// anyone else's data. −1/f after 150f with no gain. SPENDING: Pressure Blast (full charge) and Hydro Burst spend ALL of it
// (scaling their damage). Swap / revert / KO / rematch: a fresh formState (cleared). Deterministic (frame counts only).
export const WH_CORE = { MAX: 100, HIT: 5, TAKEN: 3, BLOCKED: 2, WADE_S: 1, SUB_S: 3, IDLE: 150, DECAY: 1 }
export const floodDepth = f => { const w = f && f._benWater; return w && w.ttl > 0 && (w.depth === "wading" || w.depth === "submerged") ? w.depth : "dry" }
export function gainCore(s, amount, side) {
  if (!s || !(amount > 0)) return 0
  const before = s.core; s.core = Math.min(WH_CORE.MAX, s.core + amount); s.lastGainT = s.t
  const got = s.core - before
  if (side === "dealt") s.coreDealt += got; else if (side === "taken") s.coreTaken += got; else if (side === "blocked") s.coreBlocked += got; else s.coreFlood += got
  return got
}
export function spendCore(s) { const c = s.core; s.core = 0; return c }
TICKS.push((f, s) => {
  const d = floodDepth(f); s.floodDepth = d
  if (d !== "dry") gainCore(s, (d === "submerged" ? WH_CORE.SUB_S : WH_CORE.WADE_S) / 60, "flood")
  else if (s.core > 0 && s.t - s.lastGainT >= WH_CORE.IDLE) s.core = Math.max(0, s.core - WH_CORE.DECAY)
})
CONTACT.push((f, s, target, { blocked }) => { if (!blocked) gainCore(s, WH_CORE.HIT, "dealt") })
STRUCK.push((f, s, { blocked }) => { gainCore(s, blocked ? WH_CORE.BLOCKED : WH_CORE.TAKEN, blocked ? "blocked" : "taken") })

// render-only: the Pressure Core gauge (cyan; full = white pulse; the flood bonus shows a rising-bubble tick)
HUD_PARTS.push((ctx, f, s, { bx, y, w, flip }) => {
  const h = 5, fill = s.core / WH_CORE.MAX
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, y - 1, w + 2, h + 2)
  ctx.fillStyle = s.core >= WH_CORE.MAX ? ((s.t >> 3) % 2 ? WHITE : CYAN) : CYAN
  const fw = Math.round(w * Math.max(0, Math.min(1, fill))); ctx.fillRect(flip ? bx + w - fw : bx, y, fw, h)
  ctx.font = "bold 8px monospace"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"; ctx.fillStyle = "#a5f3fc"
  ctx.fillText(`CORE ${Math.floor(s.core)}${s.floodDepth !== "dry" ? (s.floodDepth === "submerged" ? " ▲▲▲" : " ▲") : ""}`, flip ? bx + w : bx, y + h + 2)
})
// render-only: the Core glow on the orb hand while it is ≥ 50
FX_DRAW.push((c, f, s, frame) => {
  if (s.core < 50 || s.puddle) return
  const face = f.facing || 1, sc = (f.h || 112) / 260, ox = cx(f) + face * WATERHAZARD_GEOM.orb[0] * sc * 0.5, oy = f.y + (f.h || 112) * 0.25
  c.save(); c.globalAlpha = 0.35 + 0.25 * ((frame >> 3) % 2); c.fillStyle = CYAN
  for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2 + frame * 0.05; px(c, ox + Math.cos(an) * 9, oy + Math.sin(an) * 9, 3) }
  c.restore()
})

// ── 5. DRENCHED → SHORT FUSE (an opponent status) ───────────────────────────────────────────────────────────────────
// CLEAN hits (not blocked) from Pressure Blast, Hydro Burst, Geyser Uppercut, Undertow Sweep and Geyser Dive add ONE Drenched
// pip per CAST (multi-tick moves count once), max 3; no pip from blocks or FX; the pips expire 240f after the last one.
// 3 pips → SHORT FUSE on the opponent for 240f: the pips are consumed; the opponent takes +20 % from ELECTRIC-tagged hits only
// (Ripjaws' electric tag map, benFlood.isElectricHit — Megawhatt / Feedback bodies + the tagged electric projectiles), applied
// in ben10State.benAlienDamageMods; it multiplies independently with Ripjaws' own +15 % submerged-electric rule (different tag,
// different condition). Nothing else: no stun, no polling / clock change. No refresh while it runs; 360f immunity after.
// Short Fuse is ONE plain-data stamp on the opponent, `_benShortFuse = { left, imm, mult }`, counted down by physics.js
// (`left` 240 → 0, then `imm` 360 → 0, then deleted) — it outlives a swap on purpose (Ben swaps to an electric alien to cash
// it in); his own pips are form state and clear with the swap / revert / KO / rematch.
export const WH_DRENCH = { MAX: 3, EXPIRE: 240, FUSE: 240, IMMUNE: 360, MULT: 1.2 }
export const PIP_SOURCES = ["blast", "burst", "geyser", "sweep", "dive"]
export const fuseOf = o => (o && o._benShortFuse) || null
export const fuseOn = o => { const z = fuseOf(o); return !!(z && z.left > 0) }
export function addPip(f, s, opp, cast) {
  if (!opp || opp.eliminated || s.pipCasts.includes(cast)) return false
  s.pipCasts.push(cast); if (s.pipCasts.length > 8) s.pipCasts.shift()
  if (fuseOf(opp)) return false                                             // no refresh while active / during the immunity
  s.pips = Math.min(WH_DRENCH.MAX, s.pips + 1); s.pipT = s.t
  if (s.pips >= WH_DRENCH.MAX) { s.pips = 0; s.fuses++; opp._benShortFuse = { left: WH_DRENCH.FUSE, imm: WH_DRENCH.IMMUNE, mult: WH_DRENCH.MULT } }
  return true
}
TICKS.push((f, s, input, api, opp) => {
  if (s.pips > 0 && s.t - s.pipT >= WH_DRENCH.EXPIRE) s.pips = 0
  const z = fuseOf(opp); s.fuseView = z ? (z.left > 0 ? `SHORT FUSE ${Math.ceil(z.left / 60)}s` : "") : ""   // a plain string copy for the HUD
})
CONTACT.push((f, s, target, { proj, move, blocked }) => {
  if (blocked) return
  const tag = proj && proj.alien && proj.alien.wh, cast = proj && proj.alien && proj.alien.cast
  if (tag && PIP_SOURCES.includes(tag)) addPip(f, s, target, cast)
})
// render-only: the Drenched pips under the Core gauge (a droplet per pip; SHORT FUSE: a yellow spark label)
HUD_PARTS.push((ctx, f, s, { bx, y, w, flip }) => {
  const yy = y + 17
  for (let i = 0; i < WH_DRENCH.MAX; i++) { ctx.fillStyle = i < s.pips ? CYAN : "rgba(255,255,255,0.18)"; const x = flip ? bx + w - 8 - i * 9 : bx + i * 9; ctx.fillRect(x + 1, yy, 5, 6); ctx.fillRect(x + 2, yy - 2, 3, 2) }
  if (s.fuseView) { ctx.font = "bold 8px monospace"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"; ctx.fillStyle = "#fde047"; ctx.fillText(s.fuseView, flip ? bx + w - 32 : bx + 32, yy - 1) }
})
// render-only: droplets dripping off a Drenched opponent, crackling yellow sparks over a SHORT FUSE one
FX_DRAW.push((c, f, s, frame, opp) => {
  if (!opp) return
  const ox = cx(opp), oy = opp.y, oh = opp.h || 110
  c.save()
  if (s.pips > 0) { c.fillStyle = CYAN; for (let i = 0; i < s.pips * 2; i++) { const ph = (frame * 2 + i * 17) % 40; px(c, ox - 16 + (i * 13) % 32, oy + 10 + ph * oh / 40, 3) } }
  if (fuseOn(opp)) { c.fillStyle = (frame & 2) ? "#fde047" : WHITE; for (let i = 0; i < 6; i++) { const a = (i * 2.4 + frame * 0.3) % (Math.PI * 2); px(c, ox + Math.cos(a) * 26, oy + oh * 0.4 + Math.sin(a) * oh * 0.4, 3) } }
  c.restore()
})

// ── 6. SPECIALS ────────────────────────────────────────────────────────────────────────────────────────────────────────
// Each special is a cast record in formState, advanced frame by frame by his tick (a hit = hitstun cancels it); its damage is a
// RECT HITBOX entity (api.spawnProjectile, rectHitbox — the engine's own block / chip / hitstun / combo scaling / onContact),
// tagged alien { wh, cast } so the Drenched pip and "one on screen" read the cast. Hidden boxes are drawn procedurally.
let projRef = null                                                           // the live projectile list (read for one-on-screen + render)
TICKS.unshift((f, s, input, api) => { if (api && api.activeProjectiles) projRef = api.activeProjectiles() })
const ownLive = (f, wh, cast) => !!projRef && projRef.some(p => p && p.owner === f && p.alien && p.alien.wh === wh && (cast == null || p.alien.cast === cast) && p.lifetime > 0)
const killOwn = (f, wh) => { if (projRef) for (const p of projRef) if (p && p.owner === f && p.alien && p.alien.wh === wh) p.lifetime = 0 }
const box = (f, api, name, md) => api && api.spawnProjectile(f, name, { speed: 0, vx: (f.facing || 1) * 0.01, vy: 0, rectHitbox: true, isSpecial: true,
  lifetime: 2, ...md, alien: { hidden: true, ...(md.alien || {}) } }, {})
const blockstunFor = (active, recovery, onBlock) => Math.max(1, active + recovery + onBlock)
function beginCast(f, s, api, cost) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false; f.vx = 0
  if (s.oppDir) f.facing = s.oppDir                                          // every cast faces the opponent
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  s.castId++; s.stats.casts++
  return s.castId
}
BUSY.push(s => !!(s.blast || s.burst || s.chain || s.sweep || s.dive || s.ult))
const flinched = f => (f.hitstun || 0) > 0 || !!f.knockdownState

// 1. PRESSURE BLAST (↓↘→ + P, 10) — Col 3 R3 → R4 charge, R5 → R6 release: a water-jet projectile, 460 px, 40. HOLD P to charge
//    up to 30f: a FULL hold costs +6 Power and deals 40 + 0.5 × Core spent (max 75), spending ALL Core on release. A tap fires
//    at 10f. One on screen (a second press while his jet flies is refused). +1 Drenched on a clean hit.
export const WH_BLAST = { MIN: 10, FULL: 30, SPEED: 14, RANGE: 460, DMG: 40, CORE_K: 0.5, MAX: 75, RECOVERY: 16, W: 46, H: 26 }
function castBlast(f, s, api) {
  if (!grounded(f) || ownLive(f, "blast")) return false
  const cast = beginCast(f, s, api, WH_COST.blast); if (cast == null) return false
  s.blast = { t: 0, cast, face: f.facing || 1, held: true, full: false, fired: false, dmg: 0, core: 0 }; s.stats.blasts++
  hold(f, 2); pose(f, "whCharge", 2)
  return true
}
CASTS.blast = castBlast
TICKS.push((f, s, input, api) => {
  const b = s.blast; if (!b) return
  b.t++
  if (flinched(f)) { s.lastBlast = { ...b, why: "hit" }; s.blast = null; return }
  if (!b.fired) {
    if (!input.special) b.held = false
    hold(f, 2); f._spriteCastMove = "whCharge"; f._spriteCastTimer = 2
    const fire = b.t >= WH_BLAST.FULL || (b.t >= WH_BLAST.MIN && !b.held)
    if (!fire) return
    b.full = b.t >= WH_BLAST.FULL && b.held && (f.infiniteEnergy || api.spendEnergy(f, WH_COST.blastFull))
    b.core = b.full ? spendCore(s) : 0
    b.dmg = b.full ? Math.min(WH_BLAST.MAX, WH_BLAST.DMG + WH_BLAST.CORE_K * b.core) : WH_BLAST.DMG
    b.fired = true; b.ft = b.t
    const sc = (f.h || 112) / 260
    api.spawnProjectile(f, "wh_blast", { damage: b.dmg, speed: 0, vx: b.face * WH_BLAST.SPEED, vy: 0, rectHitbox: true, isSpecial: true,
      spawnX: cx(f) + b.face * Math.max(30, WATERHAZARD_GEOM.orb[0] * sc), spawnY: f.y + (f.h || 112) * 0.28, w: WH_BLAST.W, h: WH_BLAST.H,
      lifetime: Math.ceil(WH_BLAST.RANGE / WH_BLAST.SPEED), hitstun: 22, blockstun: 14, knockbackX: 5 * b.face, knockbackY: -2,
      alien: { wh: "blast", cast: b.cast, hidden: true, full: b.full } }, {})
    hold(f, WH_BLAST.RECOVERY); pose(f, "whFire", WH_BLAST.RECOVERY)
    return
  }
  if (b.t - b.ft >= WH_BLAST.RECOVERY) { s.lastBlast = { full: b.full, dmg: b.dmg, core: b.core, t: b.ft, why: "fired" }; s.blast = null }
})

// 2. HYDRO BURST (↓↙← + P, 14, needs Core ≥ 20) — Col 3 R4 → R5: a close RADIAL burst, 160 px around him, 16f startup,
//    30 + 0.4 × Core (max 70), spends ALL Core at the cast, knocks back (away from him), −14 on block. +1 Drenched.
export const WH_BURST = { NEED: 20, STARTUP: 16, R: 160, DMG: 30, CORE_K: 0.4, MAX: 70, ACTIVE: 4, RECOVERY: 26, ON_BLOCK: -14 }
function castBurst(f, s, api) {
  if (!grounded(f) || s.core < WH_BURST.NEED) return false
  const cast = beginCast(f, s, api, WH_COST.burst); if (cast == null) return false
  const core = spendCore(s)
  s.burst = { t: 0, cast, core, dmg: Math.min(WH_BURST.MAX, WH_BURST.DMG + WH_BURST.CORE_K * core) }; s.stats.bursts++
  const total = WH_BURST.STARTUP + WH_BURST.ACTIVE + WH_BURST.RECOVERY; hold(f, total); pose(f, "whBurst", total)
  return true
}
CASTS.burst = castBurst
TICKS.push((f, s, input, api, opp) => {
  const b = s.burst; if (!b) return
  b.t++
  if (flinched(f) && b.t <= WH_BURST.STARTUP) { s.lastBurst = { ...b, why: "hit" }; s.burst = null; return }
  pose(f, "whBurst", 2)
  if (b.t === WH_BURST.STARTUP) {
    const dir = opp ? (cx(opp) >= cx(f) ? 1 : -1) : (f.facing || 1)
    box(f, api, "wh_burst", { damage: b.dmg, spawnX: cx(f), spawnY: f.y + (f.h || 112) / 2, w: WH_BURST.R * 2, h: (f.h || 112) + 40, lifetime: WH_BURST.ACTIVE,
      hitstun: 26, blockstun: blockstunFor(WH_BURST.ACTIVE, WH_BURST.RECOVERY, WH_BURST.ON_BLOCK), knockbackX: 8 * dir, knockbackY: -5, alien: { wh: "burst", cast: b.cast } })
    b.fx = s.t
  }
  if (b.t >= WH_BURST.STARTUP + WH_BURST.ACTIVE + WH_BURST.RECOVERY) { s.lastBurst = { core: b.core, dmg: b.dmg, why: "done", hit: !!b.hit }; s.burst = null }
})

// 3. CLAW LASH (→→ + P, 12) — Col 2 R5 lunge → R6 reach: a DASH SLASH, 300 px of real travel (20 px/f, stage-clamped, no tracking),
//    2 hits 20 / 28 = 48: the first rides with him (the travel stops on contact), the second swings 4f later; a whiff swings at
//    the end of the travel. −12 on block. While it is out his hurtbox extends forward 50 px (the reaching limb is hittable).
export const WH_LASH = { STARTUP: 10, SPEED: 20, TRAVEL: 300, HITS: [20, 28], GAP: 4, RECOVERY: 20, ON_BLOCK: -12, LIMB: 50 }
function castLash(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, WH_COST.lash); if (cast == null) return false
  const run = WH_LASH.TRAVEL / WH_LASH.SPEED
  s.chain = { t: 0, cast, face: f.facing || 1, run, contact: null, hit2At: WH_LASH.STARTUP + run, done: 0, hits: [] }; s.stats.lashes++
  hold(f, WH_LASH.STARTUP + run + WH_LASH.GAP + WH_LASH.RECOVERY); pose(f, "whLash", 2)
  return true
}
CASTS.lash = castLash
TICKS.push((f, s, input, api) => {
  const c = s.chain; if (!c) return
  c.t++
  if (flinched(f)) { delete f._benLunge; s.lastChain = { hits: c.hits.slice(), why: "hit" }; s.chain = null; return }
  f._spriteCastMove = "whLash"; f._spriteCastTimer = 2
  const st = WH_LASH.STARTUP
  if (c.t === st + 1 && !c.contact) f._benLunge = { speed: c.face * WH_LASH.SPEED, frames: c.run }
  if (c.t > st && c.t <= st + c.run && !c.contact && !ownLive(f, "lash1", c.cast))
    box(f, api, "wh_lash1", { damage: WH_LASH.HITS[0], spawnX: cx(f) + c.face * 50, spawnY: f.y + (f.h || 112) * 0.45, w: 70, h: 70,
      hitstun: 20, blockstun: 12, knockbackX: 1 * c.face, alien: { wh: "lash1", cast: c.cast } })
  if (c.t === c.hit2At) {
    box(f, api, "wh_lash2", { damage: WH_LASH.HITS[1], spawnX: cx(f) + c.face * 60, spawnY: f.y + (f.h || 112) * 0.45, w: 90, h: 80, lifetime: 3,
      hitstun: 24, blockstun: blockstunFor(3, WH_LASH.RECOVERY, WH_LASH.ON_BLOCK), knockbackX: 6 * c.face, knockbackY: -3, alien: { wh: "lash2", cast: c.cast } })
    f.attackCooldown = Math.max(f.attackCooldown || 0, 3 + WH_LASH.RECOVERY); f._benPowerCommit = Math.max(f._benPowerCommit || 0, 3 + WH_LASH.RECOVERY)
  }
  if (c.t >= c.hit2At + 3 + WH_LASH.RECOVERY) { s.lastChain = { hits: c.hits.slice(), why: c.contact ? "done" : "whiff", t: c.t }; s.chain = null }
})
function hurtbox(f) {
  const s = whState(f), c = s && s.chain; if (!c || c.t <= WH_LASH.STARTUP) return null
  const face = c.face, L = WH_LASH.LIMB
  return { x: face > 0 ? f.x : f.x - L, y: f.y, w: (f.w || 62) + L, h: f.h || 112 }
}

// 5. UNDERTOW SWEEP (←↙↓ + P, 12) — Col 3 R1 crouch + a procedural pixel water ring at his feet: radius 140, 14f startup, 45,
//    hits LOW (a floor-level box), TRIPS (a clean hit = a forced knockdown, the existing knockdown rules), −13 on block, +1 pip.
export const WH_SWEEP = { STARTUP: 14, R: 140, DMG: 45, ACTIVE: 3, RECOVERY: 24, ON_BLOCK: -13, KD: 40, H: 44 }
function castSweep(f, s, api) {
  if (!grounded(f)) return false
  const cast = beginCast(f, s, api, WH_COST.sweep); if (cast == null) return false
  s.sweep = { t: 0, cast, hit: false, kd: false }; s.stats.sweeps++
  const total = WH_SWEEP.STARTUP + WH_SWEEP.ACTIVE + WH_SWEEP.RECOVERY; hold(f, total); pose(f, "whSweep", total)
  return true
}
CASTS.sweep = castSweep
TICKS.push((f, s, input, api) => {
  const w = s.sweep; if (!w) return
  w.t++
  if (flinched(f) && w.t <= WH_SWEEP.STARTUP) { s.lastSweep = { ...w, why: "hit" }; s.sweep = null; return }
  pose(f, "whSweep", 2)
  if (w.t === WH_SWEEP.STARTUP) {
    box(f, api, "wh_sweep", { damage: WH_SWEEP.DMG, spawnX: cx(f), spawnY: f.y + (f.h || 112) - WH_SWEEP.H / 2, w: WH_SWEEP.R * 2, h: WH_SWEEP.H, lifetime: WH_SWEEP.ACTIVE,
      hitLevel: "low", hitstun: 30, blockstun: blockstunFor(WH_SWEEP.ACTIVE, WH_SWEEP.RECOVERY, WH_SWEEP.ON_BLOCK), knockbackX: 1 * (f.facing || 1), knockbackY: 0,
      alien: { wh: "sweep", cast: w.cast } })
    w.fx = s.t
  }
  if (w.t >= WH_SWEEP.STARTUP + WH_SWEEP.ACTIVE + WH_SWEEP.RECOVERY) { s.lastSweep = { hit: w.hit, kd: w.kd, why: "done" }; s.sweep = null }
})

// 6. GEYSER DIVE (air ↓ + P — any air Special; 12) — the Col 3 R3 charge frame + a procedural downward orb: a diagonal-DOWN dive
//    (the shared `_benGlide`), 48 on the body hit (one hit per cast), once per airtime, no jump refill, +1 Drenched. 12f landing.
export const WH_DIVE = { STARTUP: 5, VX: 8, VY: 12, MAX: 45, DMG: 48, LAND: 12 }
function castDive(f, s, api) {
  if (grounded(f) || s.diveUsed) return false
  const cast = beginCast(f, s, api, WH_COST.dive); if (cast == null) return false
  s.diveUsed = true; s.stats.dives++
  s.dive = { t: 0, cast, face: f.facing || 1, lastY: f.y, hit: false, jumps: f.jumpCount }
  f.vx = 0; f.vy = 0; f._benGlide = { vx: 0, vy: 0 }; hold(f, 2)
  return true
}
CASTS.dive = castDive
TICKS.push((f, s, input, api) => {
  if (grounded(f) && !s.dive) s.diveUsed = false                              // once per airtime
  const d = s.dive; if (!d) return
  d.t++
  if (flinched(f)) { endDive(f, s, false); return }
  pose(f, "whDive", 2); hold(f, 2)
  if (d.t <= WH_DIVE.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; return }
  const landed = d.t > WH_DIVE.STARTUP + 1 && (f.y === d.lastY || grounded(f))
  d.lastY = f.y
  if (landed || d.t >= WH_DIVE.STARTUP + WH_DIVE.MAX) { endDive(f, s, landed); return }
  f._benGlide = { vx: d.face * WH_DIVE.VX, vy: WH_DIVE.VY }
  if (!d.hit && !ownLive(f, "dive", d.cast)) box(f, api, "wh_dive", { damage: WH_DIVE.DMG, spawnX: cx(f) + d.face * 14, spawnY: f.y + (f.h || 112) * 0.7,
    w: 70, h: 70, hitstun: 24, blockstun: 12, knockbackX: 3 * d.face, knockbackY: -4, alien: { wh: "dive", cast: d.cast } })
})
function endDive(f, s, landed) {
  const d = s.dive; s.dive = null; delete f._benGlide; killOwn(f, "dive")
  if (landed) { f.attackCooldown = WH_DIVE.LAND; f._benPowerCommit = WH_DIVE.LAND; pose(f, "crouch", WH_DIVE.LAND) }
  else { f.attackCooldown = 0; f._benPowerCommit = 0; f._spriteCastMove = null; f._spriteCastTimer = 0 }
  s.lastDive = { landed, hit: d.hit, jumps: d.jumps }
}

// contact bookkeeping (before the Core / pip handlers): the lash stops on its first contact, the sweep trips, the dive registers
CONTACT.unshift((f, s, target, { proj, blocked }) => {
  const a = proj && proj.alien; if (!a || !a.wh) return
  if (a.wh === "blast" && !blocked) s.stats.blastHits++
  if (a.wh === "burst") { if (s.burst) s.burst.hit = !blocked; if (!blocked) s.stats.burstHits++ }
  const c = s.chain
  if ((a.wh === "lash1" || a.wh === "lash2") && c && c.cast === a.cast) {
    c.hits.push({ k: a.wh, blocked: !!blocked }); if (!blocked) s.stats.lashHits++
    if (a.wh === "lash1" && !c.contact) { c.contact = { blocked: !!blocked, t: c.t }; delete f._benLunge; killOwn(f, "lash1"); c.hit2At = c.t + WH_LASH.GAP }
  }
  if (a.wh === "sweep" && s.sweep && !blocked) {
    s.sweep.hit = true; s.stats.sweepHits++
    if (!target.knockdownState && !target.eliminated) { target.knockdownState = true; target.knockdownTimer = Math.max(target.knockdownTimer || 0, WH_SWEEP.KD); s.sweep.kd = true }
  }
  if (a.wh === "dive" && s.dive) { s.dive.hit = true; if (!blocked) s.stats.diveHits++ }
})

// ── ULTIMATE: TIDAL DISCHARGE (the Omnitrix Overload input; 55 Power) ─────────────────────────────────────────────────────
// Needs a CLEAN OPENER: a Pressure-Blast-style jet (an engine projectile, 40). A whiff or a block: no cinematic, 60f recovery.
// On a clean hit, the existing capture pattern:
//  1. he melts into a swirling VORTEX of water around the captured opponent (a procedural pixel spiral, render-only, no
//     hitbox, both fighters stay readable);
//  2. PRESSURE BARRAGE: 4 jets × 22 = 88 at angles hash(match seed, start frame, player index), the Col 3 orb frames;
//  3. GEYSER FINISH: he reforms (the Geyser Uppercut frame) and a towering water column under them: 112, knockdown.
// Total 240 unscaled (40 + 88 + 112). Core → 0 afterwards. If the opponent carries exactly 2 Drenched pips at the capture, the
// final hit adds 1 pip (the normal pip rule: immunity respected, no extra damage — it completes a SHORT FUSE). Positions
// restore, no persistent hazard, 100f recovery lockout.
export const WH_ULT = { OPEN_ST: 10, SPEED: 16, RANGE: 420, OPENER: 40, WHIFF: 60, VORTEX: 30, JET_AT: [36, 46, 56, 66], JET: 22,
  REFORM_AT: 76, FINAL_AT: 90, FINAL: 112, END: 108, LOCKOUT: 100, KD: 60, ZOOM: 0.85 }
function fireTidal(f, ctx, api) {
  const s = whState(f); if (!s || !canAct(f, s) || ownLive(f, "ult_open")) return false
  if (!api.spendEnergy(f, WH_COST.ultimate)) return false
  s.castId++
  if (s.oppDir) f.facing = s.oppDir
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  s.ult = { phase: "opener", t: 0, face: f.facing || 1, raw: 0, hits: [], cast: s.castId, seed: (ctx?.seed ?? 1) >>> 0, f0: ctx?.frame ?? s.t, pi: pIndex(f),
    contact: null, fired: false, pips0: 0, pipAdded: false }
  hold(f, WH_OPEN_TOTAL()); pose(f, "whCharge", WH_ULT.OPEN_ST)
  return true
}
const WH_OPEN_TOTAL = () => WH_ULT.OPEN_ST + Math.ceil(WH_ULT.RANGE / WH_ULT.SPEED) + 2
ULT = fireTidal
function ultMiss(f, s, why) {
  s.lastUlt = { captured: false, why, raw: 0 }; s.ult = null; killOwn(f, "ult_open")
  f.attackCooldown = Math.max(f.attackCooldown || 0, WH_ULT.WHIFF); f._benPowerCommit = Math.max(f._benPowerCommit || 0, WH_ULT.WHIFF); pose(f, "idle", WH_ULT.WHIFF)
}
// pure: the barrage jets of one cast (render + the held target's sway share them; the same seed → the same angles)
export function ultJets(seed, frame0, pi) {
  return WH_ULT.JET_AT.map((at, i) => ({ at, ang: Math.round((whHash(seed, frame0, pi, i) * 2 - 1) * 70), len: 70 + Math.floor(whHash(seed, frame0, pi, i + 16) * 50) }))
}
TICKS.push((f, s, input, api, opp) => {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") {
    u.t++
    if (u.contact) {
      if (u.contact.blocked || !opp || opp.eliminated) { ultMiss(f, s, "blocked"); return }
      u.phase = "vortex"; u.t = 0; u.raw = WH_ULT.OPENER; u.hits.push(WH_ULT.OPENER); u.pips0 = s.pips
      u.home = { x: f.x, y: f.y }; u.thome = { x: opp.x, y: opp.y }; killOwn(f, "ult_open")
      f.attackCooldown = WH_ULT.END + WH_ULT.LOCKOUT; f._benPowerCommit = WH_ULT.END; f.invulnTimer = Math.max(f.invulnTimer || 0, WH_ULT.END + 2)
      return
    }
    if (flinched(f) && !u.fired) { ultMiss(f, s, "hit"); return }
    pose(f, u.fired ? "whFire" : "whCharge", 2)
    if (u.t === WH_ULT.OPEN_ST) {
      u.fired = true
      api.spawnProjectile(f, "wh_ult_open", { damage: WH_ULT.OPENER, speed: 0, vx: u.face * WH_ULT.SPEED, vy: 0, rectHitbox: true, isUltimate: true,
        spawnX: cx(f) + u.face * 40, spawnY: f.y + (f.h || 112) * 0.28, w: WH_BLAST.W, h: WH_BLAST.H, lifetime: Math.ceil(WH_ULT.RANGE / WH_ULT.SPEED),
        hitstun: 40, blockstun: 16, knockbackX: 0.01 * u.face, knockbackY: 0, alien: { wh: "ult_open", cast: u.cast, hidden: true } }, {})
    }
    if (u.fired && u.t > WH_ULT.OPEN_ST + 1 && !ownLive(f, "ult_open", u.cast)) ultMiss(f, s, "whiff")
    return
  }
  if (!opp || opp.eliminated) { endUlt(f, s, null, api); return }
  u.t++
  if (u.t === 1) api?.focusCamera?.(f, opp, WH_ULT.ZOOM, WH_ULT.END)       // render-only framing
  opp.hitstun = Math.max(opp.hitstun || 0, 4); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y
  opp.attacking = false; opp.currentAttack = null; opp.isBlocking = false
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake, move) => { api.applyScaledDamage(opp, dmg, { attacker: f, move, source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 10) }
  if (u.t < WH_ULT.VORTEX) { u.phase = "vortex"; f._spriteCastMove = "whMelt" }
  else if (u.t < WH_ULT.REFORM_AT) {
    u.phase = "barrage"; f._spriteCastMove = "whUltOrb"
    const k = WH_ULT.JET_AT.indexOf(u.t); if (k >= 0) hit(WH_ULT.JET, 5 + k, "wh_ult_jet")
  } else if (u.t <= WH_ULT.FINAL_AT) {
    u.phase = "final"; f._spriteCastMove = "whGeyser"
    if (u.t === WH_ULT.FINAL_AT) {
      hit(WH_ULT.FINAL, 18, "wh_ult_geyser")
      if (u.pips0 === 2 && s.pips === 2) u.pipAdded = addPip(f, s, opp, u.cast)   // the normal pip rule (immunity respected)
    }
  } else if (u.t < WH_ULT.END) { u.phase = "after"; f._spriteCastMove = "win" }
  else { endUlt(f, s, opp, api); return }
  f._spriteCastTimer = 2
})
function endUlt(f, s, opp, api) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30)
    if (!opp.eliminated) { opp.knockdownState = true; opp.knockdownTimer = Math.max(opp.knockdownTimer || 0, WH_ULT.KD) } }
  s.lastUlt = { captured: !!u?.home, raw: u?.raw || 0, hits: u?.hits ? u.hits.slice() : [], seed: u?.seed, f0: u?.f0, pi: u?.pi, pips0: u?.pips0 ?? 0,
    pipAdded: !!u?.pipAdded, home: u?.home ? { ...u.home } : null, thome: u?.thome ? { ...u.thome } : null, endT: s.t }
  s.ult = null
  s.core = 0                                                                 // Core → 0 after the ultimate
  api?.focusCamera?.(f, opp, 1, 12)
  f.attackCooldown = WH_ULT.LOCKOUT; f._benPowerCommit = WH_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}
CONTACT.unshift((f, s, target, { proj, blocked }) => {
  const u = s.ult, a = proj && proj.alien; if (!u || u.phase !== "opener" || !a || a.wh !== "ult_open" || a.cast !== u.cast) return
  u.contact = { blocked: !!blocked }
})
// render-only: the held opponent rocks under each jet (never collision)
function targetOffset(f, t) {
  const s = whState(f), u = s && s.ult; if (!u || u.phase !== "barrage") return null
  const r = ultJets(u.seed, u.f0, u.pi), k = r.findIndex(p => u.t >= p.at && u.t < p.at + 6); if (k < 0) return null
  return { dx: Math.round(Math.cos(r[k].ang * Math.PI / 180) * u.face * (6 - (u.t - r[k].at))), dy: Math.round(Math.sin(r[k].ang * Math.PI / 180) * 3) }
}

// ── the moves' render-only FX (nothing here is GAME_STATE or collides) ────────────────────────────────────────────
FX_DRAW.push((c, f, s, frame, opp) => {
  c.save()
  if (projRef) for (const p of projRef) {                                    // his jets: a pixel water stream with a white core + spray
    if (!p || p.owner !== f || !p.alien || (p.alien.wh !== "blast" && p.alien.wh !== "ult_open") || !(p.lifetime > 0)) continue
    const dir = Math.sign(p.vx || 1), x = p.x + (p.w || 46) / 2, y = p.y + (p.h || 26) / 2, big = p.alien.full ? 1.4 : 1
    for (let i = 0; i < 9; i++) { c.fillStyle = i % 3 ? CYAN : WHITE; px(c, x - dir * i * 8, y + Math.sin((frame + i) * 0.8) * 3, Math.round((8 - i * 0.6) * big)) }
    c.fillStyle = WHITE; for (let i = 0; i < 4; i++) px(c, x - dir * (10 + i * 12), y + (((frame + i * 7) % 9) - 4) * 2, 2)
  }
  const b = s.burst
  if (b && b.fx != null && s.t - b.fx < 10) {                                  // Hydro Burst: an expanding radial splash ring
    const r = WH_BURST.R * (0.4 + 0.6 * (s.t - b.fx) / 10); c.globalAlpha = 1 - (s.t - b.fx) / 10
    for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2; c.fillStyle = k % 2 ? CYAN : WHITE; px(c, cx(f) + Math.cos(an) * r, f.y + (f.h || 112) / 2 + Math.sin(an) * r * 0.6, 5) }
    c.globalAlpha = 1
  }
  const w = s.sweep
  if (w && w.fx != null && s.t - w.fx < 12) {                                 // Undertow: a flat water ring at his feet
    const r = WH_SWEEP.R * Math.min(1, (s.t - w.fx + 2) / 6), y0 = f.y + (f.h || 112) - 4
    for (let k = 0; k < 28; k++) { const an = k / 28 * Math.PI * 2; c.fillStyle = k % 2 ? CYAN : "#0e7490"; px(c, cx(f) + Math.cos(an) * r, y0 + Math.sin(an) * 7, 4) }
  }
  const d = s.dive
  if (d && d.t > WH_DIVE.STARTUP) { c.fillStyle = GREEN; px(c, cx(f) + d.face * 16, f.y + (f.h || 112) * 0.8, 10); c.fillStyle = CYAN; for (let i = 1; i < 5; i++) px(c, cx(f) - d.face * i * 8, f.y + (f.h || 112) * 0.6 - i * 10, 6 - i) }
  const u = s.ult
  if (u && u.phase !== "opener" && opp) {
    const ox = cx(opp), oy = opp.y + (opp.h || 110) / 2
    if (u.phase === "vortex" || u.phase === "barrage") {                       // the swirling vortex: a two-arm pixel spiral around them
      c.globalAlpha = 0.75
      for (let arm = 0; arm < 2; arm++) for (let i = 0; i < 26; i++) { const an = i * 0.45 + frame * 0.18 + arm * Math.PI, r = 18 + i * 3.2; c.fillStyle = i % 3 ? CYAN : WHITE; px(c, ox + Math.cos(an) * r, oy + Math.sin(an) * r * 0.75, 4) }
      c.globalAlpha = 1
    }
    if (u.phase === "barrage") {
      const r = ultJets(u.seed, u.f0, u.pi), k = r.findIndex(p => u.t >= p.at && u.t < p.at + 5)
      if (k >= 0) { const p = r[k], an = p.ang * Math.PI / 180; for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? CYAN : WHITE; px(c, ox - u.face * Math.cos(an) * i * p.len / 8, oy - Math.sin(an) * i * p.len / 8, 6) } }
    }
    if (u.phase === "final" || u.phase === "after") {                         // the towering geyser under them
      const age = u.t - (WH_ULT.FINAL_AT - 6); if (age >= 0) { const base = opp.y + (opp.h || 110) + 4, hgt = Math.min(1, age / 6) * 320
        for (let y = 0; y < hgt; y += 6) { const ww = 46 + Math.sin((y + frame * 5) / 16) * 10; c.fillStyle = (y / 6) % 2 ? CYAN : WHITE; c.fillRect(Math.round(ox - ww / 2), Math.round(base - y - 6), Math.round(ww), 6) } }
    }
  }
  c.restore()
})
