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
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, struck, damageDealt, evade, bodyAlpha,
  drawHud: drawWaterHazardHud, drawFx: drawWaterHazardFx
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshWaterHazardState() {
  return { kind: WH_KEY, t: 0, castId: 0, noAttack: false, base: null, stage: { L: -1e6, R: 1e6 },
    oppDir: 1, hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, specialHeld: false,
    core: 0, lastGainT: 0, coreDealt: 0, coreTaken: 0, coreBlocked: 0, coreFlood: 0, floodDepth: "dry",
    pips: 0, pipT: 0, pipCasts: [], fuses: 0,
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
