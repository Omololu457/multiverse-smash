// humongousaur.js — HUMONGOUSAUR (Vaxasaurian), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (dust, debris,
// shockwave lines, camera zoom / shake, the tier scale-up) never write it. Simulation randomness: hash(match seed, frame,
// player index) only. Sheet: docs/ben10/aliens/humongousaur/SPRITE_LEDGER.md.
import { HUMONGOUSAUR_ANIM, HUMONGOUSAUR_GEOM } from "./humongousaurAssets.js"
export { HUMONGOUSAUR_ANIM, HUMONGOUSAUR_GEOM }

export const HM_KEY = "humongousaur"
const ANIM = { ...HUMONGOUSAUR_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const HUMONGOUSAUR = {
  id: HM_KEY, poolKey: HM_KEY, displayName: "Humongousaur", slot: 15,   // catalog slot (metadata; PICK FIVE): the next contiguous ready slot after Upgrade (14)
  status: "ready", sheetPath: "./ben10_humongousaur_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/humongousaur/SPRITE_LEDGER.md",
  mods: { speed: 0.85, damage: 1.15, defense: 1.20, weight: 1.50 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Charging Tackle", special2: "Quake Slam", special3: "Roar", special4: "Crush Grab",
    special5: "Push Through", special6: "Meteor Stomp", ultimate: "Extinction Event" },
  basic_attacks: {
    light:  normal(22, 6, 3, 10, 0, { rangeX: 110 }),                                          // PUNCH f1–2
    heavy:  normal(64, 15, 4, 24, -7, { knockbackX: 7, rangeX: 190 }),                        // PUNCH f3–4, the swoosh swing, 190 px
    down:   normal(28, 8, 3, 16, -4, { hitLevel: "low", rangeX: 170 }),                       // GROUND ATTACK f2–3, hits low, 170 px
    up:     normal(52, 12, 4, 26, -10, { launcher: true, launchVy: -15, selfVy: 0, rangeX: 100 }),   // PUNCH UP f1–6, launches
    air:    normal(34, 8, 4, 12, 2, { rangeX: 90 })                                           // FALL f1 + a render-only fist streak
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, hurtbox, damageDealt, damageTaken,
  drawHud: drawHumongousaurHud
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshHumongousaurState() {
  return { kind: HM_KEY, t: 0, castId: 0, noAttack: false, baseSpeed: null, baseDash: null,
    stage: { L: -1e6, R: 1e6 },
    size: { v: 0, idleT: 0, giantT: 0, shrinkT: 0, gained: [], giants: 0, shrinks: 0, peak: 0 },
    hist: [], fwdPrev: false, fwdTapT: -999, dashTapT: -999, lastDir: 5, spPrev: false,
    stats: { casts: 0, gains: 0, gained: 0 } }
}
export const hmState = f => (f?.omnitrix?.formState?.kind === HM_KEY && f.transformed && f.activeAlien === HM_KEY) ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshHumongousaurState()
  s.baseSpeed = f._benWalkSpeed; s.baseDash = f.dashSpeed
}

const cx = o => o.x + (o.w || 60) / 2
const grounded = f => !!(f && (f.onGround || f.grounded))
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function hmHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = hmState(f); if (!s) return
  s.t++
  if (ctx && Number.isFinite(ctx.stageLeft)) s.stage.L = ctx.stageLeft
  if (ctx && Number.isFinite(ctx.stageWidth)) s.stage.R = ctx.stageWidth
  input = input || {}
  tickInputs(f, s, input)
  tickSize(f, s)
  s.noAttack = busy(s)
  s.spPrev = !!input.special
}
const busy = s => false
// moveFrames hook (combat.startMove): no normals while a cast owns him; the Size tier's reach on a copied table
function moveFrames(f, key, md) {
  const s = hmState(f); if (!s) return md
  if (busy(s)) return false
  const k = tierOf(s).reach
  return k === 1 || !md ? md : { ...md, rangeX: Math.round((md.rangeX || 60) * k) }
}

// ── INPUTS: the shared alien motion inputs ──────────────────────────────────────────────────────────────────
// A short raw-direction history (numpad, facing-relative: 6 = toward, 4 = away, 2 = ↓, 3 = ↘ …; consecutive duplicates
// dropped, 8 entries, plain data) is read when Special is pressed; the motion whose LAST input is the most recent wins:
//   →→ + P (a frame-counted double tap) CHARGING TACKLE   ↓↘→ + P (236) QUAKE SLAM   ↓↙← + P (214) ROAR
//   ←↙↓ + P (412) CRUSH GRAB                               →↓↘ + P (623) PUSH THROUGH
//   air: ↓ + P (any air Special) METEOR STOMP (once per airtime)
// With no motion in the buffer (pad / harness `_specialHeldDir`), the held direction maps: neutral Quake Slam, → after a
// double tap Charging Tackle, ← Roar, ↓ Crush Grab, ↑ Push Through.
export const HM_DASH_WINDOW = 14, HM_MOTION_WINDOW = 18
const numpad = (input, face) => {
  const fwd = face > 0 ? !!input.right : !!input.left, back = face > 0 ? !!input.left : !!input.right
  const v = input.down ? 0 : (input.up || input.jump) ? 6 : 3, h = fwd ? 3 : back ? 1 : 2
  return v + h
}
function tickInputs(f, s, input) {
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= HM_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
  const d = numpad(input, face)
  if (d !== s.lastDir) { s.hist.push({ d, t: s.t }); if (s.hist.length > 8) s.hist.shift(); s.lastDir = d }
}
const MOTIONS = [["623", "push"], ["412", "crush"], ["214", "roar"], ["236", "quake"]]
export function readMotion(s) {
  const recent = s.hist.filter(e => s.t - e.t <= HM_MOTION_WINDOW).map(e => e.d).join("")
  let best = null
  for (const [m, kind] of MOTIONS) {
    let i = -1, j = 0
    for (let k = 0; k < recent.length && j < m.length; k++) if (recent[k] === m[j]) { j++; i = k }
    if (j === m.length && (!best || i > best.end)) best = { kind, end: i }
  }
  return best ? best.kind : null
}
export function pickSpecial(f, s) {
  if (!grounded(f)) return "stomp"
  const m = readMotion(s); if (m) return m
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (dir === "B") return "roar"
  if (dir === "D") return "crush"
  if (dir === "U") return "push"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= HM_DASH_WINDOW) return "tackle"
  return "quake"
}

// ── SPECIALS (dispatch; the casts are added by the later phases) ─────────────────────────────────────────────
export const HM_COST = { tackle: 12, quake: 14, roar: 10, crush: 14, push: 12, stomp: 12, ultimate: 55 }
const CASTS = {}   // kind → cast(f, s, api, ctx), filled by the sections below
function fireSpecial(f, ctx, api) {
  const s = hmState(f); if (!s) return false
  const kind = pickSpecial(f, s); if (!kind || !CASTS[kind]) return false
  return CASTS[kind](f, s, api, ctx)
}
function fireUltimate(f, ctx, api) { return false }

// ── 3. GROWTH (his unique system, GAME_STATE) ─────────────────────────────────────────────────────────────────
// A SIZE gauge 0–100 (under Omnitrix Power while he is active), 0 on transform (formState is fresh on every apply).
//   Gains: each of his hits that lands +5 (+3 if blocked; once per contact); Roar +30; a Quake Slam clean hit +10 (instead
//   of the +5, once per cast). After 120f without a gain the gauge decays 1 per frame.
//   Tiers (GAME_STATE values; the drawn scale follows in fixed steps — a frame-set swap, never a smooth scale):
//     NORMAL 0–39 base · LARGE 40–79 dmg +10% / hurtbox ×1.2 / reach +15% / speed −5% / guard drain −20%
//     HUGE 80–99 dmg +18% / ×1.35 / +25% / −10% (+ Roar and Quake Slam get +1 Tremor pip)
//     GIANT (reaching 100) for 300f: dmg +25% / ×1.5 / +35% / −15% / projectiles deal −20% to him; no decay, no gains.
//     It ends in SHRINK: Size 0 and 150f exhausted (speed −20%, damage −10%, Roar unavailable, no Size gains).
//   The enlarged hurtbox is a trade (the opponent can always hit the bigger body), feet-anchored and clipped to the stage
//   (never inside a wall). HOLD THE LINE (LARGE+): no guard pushback (his vx is zeroed while he is in blockstun) and the
//   −20% guard drain (block chip, and projectile damage taken while guarding). No armor, no invulnerability.
//   Swap / revert / KO / rematch clear formState → Size, GIANT and SHRINK are gone; the next transform starts at 0.
export const HM_SIZE = { MAX: 100, HIT: 5, BLOCKED: 3, ROAR: 30, QUAKE: 10, IDLE: 120, DECAY: 1, GIANT: 300, SHRINK: 150 }
export const HM_TIERS = {
  normal: { name: "NORMAL", min: 0,   dmg: 1.00, hurt: 1.00, reach: 1.00, speed: 1.00, guard: 1.00, proj: 1.00, pip: 0, scale: 1.00 },
  large:  { name: "LARGE",  min: 40,  dmg: 1.10, hurt: 1.20, reach: 1.15, speed: 0.95, guard: 0.80, proj: 1.00, pip: 0, scale: 1.20 },
  huge:   { name: "HUGE",   min: 80,  dmg: 1.18, hurt: 1.35, reach: 1.25, speed: 0.90, guard: 0.80, proj: 1.00, pip: 1, scale: 1.35 },
  giant:  { name: "GIANT",  min: 100, dmg: 1.25, hurt: 1.50, reach: 1.35, speed: 0.85, guard: 0.80, proj: 0.80, pip: 1, scale: 1.50 },
  shrink: { name: "SHRINK", min: 0,   dmg: 0.90, hurt: 1.00, reach: 1.00, speed: 0.80, guard: 1.00, proj: 1.00, pip: 0, scale: 1.00 }
}
export function tierKey(s) {
  const z = s.size
  if (z.giantT > 0) return "giant"
  if (z.shrinkT > 0) return "shrink"
  return z.v >= HM_TIERS.huge.min ? "huge" : z.v >= HM_TIERS.large.min ? "large" : "normal"
}
export const tierOf = s => HM_TIERS[tierKey(s)]
export const holdsLine = s => ["large", "huge", "giant"].includes(tierKey(s))
// Size gain (one gate). Returns the amount actually added.
export function gainSize(f, s, amount, why = "hit") {
  const z = s.size
  if (!(amount > 0) || z.giantT > 0 || z.shrinkT > 0) return 0
  const before = z.v
  z.v = Math.min(HM_SIZE.MAX, z.v + amount); z.idleT = 0; z.peak = Math.max(z.peak, z.v)
  const got = z.v - before
  if (got > 0) { s.stats.gains++; s.stats.gained += got; z.gained.push({ t: s.t, why, got }); if (z.gained.length > 8) z.gained.shift() }
  if (z.v >= HM_SIZE.MAX) { z.giantT = HM_SIZE.GIANT; z.giants++ }
  return got
}
export function startShrink(s) {
  const z = s.size
  z.v = 0; z.giantT = 0; z.shrinkT = HM_SIZE.SHRINK; z.idleT = 0; z.shrinks++
}
// fixed render steps: the frame tables with actionScale × the tier scale (built once; the sheets are the same images)
const scaledAnim = k => Object.fromEntries(Object.entries(ANIM).map(([n, a]) => [n, { ...a, actionScale: +(a.actionScale * k).toFixed(4) }]))
export const HM_FRAMESETS = Object.fromEntries(Object.entries(HM_TIERS).map(([k, v]) => [k, v.scale === 1 ? ANIM : scaledAnim(v.scale)]))
function tickSize(f, s) {
  const z = s.size
  z.idleT++
  if (z.giantT > 0) { if (--z.giantT === 0) startShrink(s) }
  else if (z.shrinkT > 0) z.shrinkT--
  else if (z.idleT > HM_SIZE.IDLE && z.v > 0) z.v = Math.max(0, z.v - HM_SIZE.DECAY)
  const T = tierOf(s)
  if (s.baseSpeed != null) { f._benWalkSpeed = s.baseSpeed * T.speed; if (s.baseDash != null) f.dashSpeed = s.baseDash * T.speed }
  if (holdsLine(s) && (f.blockstun || 0) > 0) f.vx = 0                       // HOLD THE LINE: no guard pushback
  const want = s.ultScale || HM_FRAMESETS[tierKey(s)]                       // render-only frame-set swap (fixed steps)
  if (f._skinAnim !== want) f._skinAnim = want
}
// hurtbox hook: the ordinary body box (combat.getHurtbox's default) scaled about his feet centre by the tier, clipped to the
// stage. NORMAL / SHRINK return null (the ordinary box). Later phases add the ult's invulnerability window on top.
export function scaledBody(f, s, k) {
  const w0 = Math.max(1, (f.w || 60) - 12), h0 = Math.max(1, (f.h || 110) - 6)
  const w = w0 * k, h = h0 * k, feet = f.y + (f.h || 110)
  let x0 = cx(f) - w / 2, x1 = cx(f) + w / 2
  x0 = Math.max(s.stage.L, x0); x1 = Math.min(s.stage.R, x1)                // legal stage space only
  return { x: x0, y: feet - h, w: Math.max(1, x1 - x0), h }
}
function hurtbox(f) {
  const s = hmState(f); if (!s) return null
  const k = tierOf(s).hurt
  return k === 1 ? null : scaledBody(f, s, k)
}
// damage attributed to the form (his hits): the tier multiplier (SHRINK ×0.9)
function damageDealt(f, target, raw, opts) {
  const s = hmState(f); if (!s) return raw
  return raw * tierOf(s).dmg
}
// damage he takes: GIANT −20% from projectiles; HOLD THE LINE −20% guard drain (block chip / projectile chip while guarding)
function damageTaken(f, raw, opts) {
  const s = hmState(f); if (!s) return raw
  opts = opts || {}
  const T = tierOf(s)
  if (opts.source === "projectile") raw *= T.proj
  if (opts.source === "block-chip" || (opts.source === "projectile" && f.isBlocking)) raw *= T.guard
  return raw
}
// onContact: Size gains from his landed hits (+5 / +3 blocked; Quake Slam handled by its own tag)
function onContact(f, target, { proj = null, move = null, blocked = false } = {}) {
  const s = hmState(f); if (!s || !target || target === f) return
  const tag = proj && proj.alien
  if (tag && tag.noSize) return
  if (tag && tag.hm === "quake" && !blocked) { if (!s.quakeSized?.includes(tag.cast)) { (s.quakeSized ||= []).push(tag.cast); if (s.quakeSized.length > 8) s.quakeSized.shift(); gainSize(f, s, HM_SIZE.QUAKE, "quake") } }
  else gainSize(f, s, blocked ? HM_SIZE.BLOCKED : HM_SIZE.HIT, blocked ? "blocked" : "hit")
  if (CONTACT.length) for (const fn of CONTACT) fn(f, s, target, { proj, move, blocked })
}
const CONTACT = []   // later phases' contact handlers (Tremor pips, ult capture)

// ── RENDER-ONLY HUD (reads GAME_STATE, never writes it) ───────────────────────────────────────────────────────
const TIER_COL = { normal: "#d6b36a", large: "#f59e0b", huge: "#f97316", giant: "#ef4444", shrink: "#9ca3af" }
export function drawHumongousaurHud(ctx, f, { x, enY, enH = 8, pbw, flip } = {}) {
  const s = hmState(f); if (!ctx || !s) return
  const z = s.size, k = tierKey(s), w = Math.min(120, pbw || 120), h = 6
  const y = enY + enH + 3, bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, y - 1, w + 2, h + 2)
  const fill = k === "giant" ? z.giantT / HM_SIZE.GIANT : k === "shrink" ? 0 : z.v / HM_SIZE.MAX
  ctx.fillStyle = TIER_COL[k]; const fw = Math.round(w * fill); ctx.fillRect(flip ? bx + w - fw : bx, y, fw, h)
  ctx.fillStyle = "#111827"; for (const m of [40, 80]) ctx.fillRect(Math.round(flip ? bx + w - w * m / 100 : bx + w * m / 100), y, 1, h)   // tier ticks
  if (k === "shrink") { ctx.fillStyle = "#6b7280"; ctx.fillRect(flip ? bx + w - Math.round(w * z.shrinkT / HM_SIZE.SHRINK) : bx, y + h - 2, Math.round(w * z.shrinkT / HM_SIZE.SHRINK), 2) }
  ctx.font = "bold 7px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = TIER_COL[k]
  const label = k === "giant" ? `GIANT ${Math.ceil(z.giantT / 60)}s` : k === "shrink" ? `SHRINK ${Math.ceil(z.shrinkT / 60)}s` : `${HM_TIERS[k].name} ${Math.floor(z.v)}`
  ctx.fillText(`SIZE · ${label}`, flip ? bx + w : bx, y + h + 2)
  ctx.restore()
}
