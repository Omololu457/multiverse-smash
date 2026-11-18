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
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, struck, damageDealt,
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
const isUltHit = opts => /^rt_ult/.test(String(opts.move || ""))

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
DEALT.push((f, s, target, raw, opts) => (isUltHit(opts) ? raw : raw * (furyOn(s) ? RT_FURY.FURY_DMG : furyTier(s) >= 2 ? RT_FURY.RAGE_DMG : 1)))
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
