// benFlood.js — the STORM TIDE flood: ONE global, owner-tagged, flat water line (generic, ben10-gated; Ripjaws casts it).
// GAME_STATE: the OWNER's `_benFlood` record (plain data). Each frame the world tick (abilities.tickBenAlienForm, gated on
// the field) stamps every fighter with `_benWater` (plain data, ttl 2) — the ONLY thing physics / combat ever read. With no
// flood nothing is stamped, so every character plays byte-identically. The flood never changes the stage: no collision,
// no floor, no wall, no friction, no KO zone; the line is a world Y only, and water never pushes anyone anywhere.
// Render-only (never GAME_STATE): rain, lightning flashes, ripples (±6 px), foam, bubbles, steam — hash(seed, frame, layer).

export const FLOOD = {
  L1: 0.18, L2: 0.42, CAP: 0.55, GAP: 140,          // fractions of the arena height H; the air gap (px) under the arena top
  HEAD_K: 1.3,                                      // Level 2 = 1.3 × the tallest standing hurtbox when 0.42 H would leave a head dry
  RISE1: 90, RISE2: 60, DUR: 480, RECEDE: 90, CD: 900,
  RIPPLE: 6
}
export const ARENA_TOP_Y = 0      // the top of the camera / stage bounds (game.js clamps the camera to camera.minY || 0, world y)
const PHYS_GROUND = 520           // physics.groundY default (a fighter's own groundY wins)

export const floodOf = f => (f && f._benFlood) || null
export const floodLive = r => !!(r && r.phase !== "off")          // water exists (rise / hold / recede / boil)
export const floodLine = r => (floodLive(r) ? r.line : 0)          // px above the floor (0 = no water)
export const floodLineY = r => r.floorY - floodLine(r)             // world Y of the flat gameplay line
const sideIdx = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)

// the arena: H from the floor to the arena top; a short stage passes ctx.arenaTopY
export function arenaOf(owner, ctx) {
  const floorY = Number.isFinite(owner && owner.groundY) ? owner.groundY : PHYS_GROUND
  const topY = ctx && Number.isFinite(ctx.arenaTopY) ? ctx.arenaTopY : ARENA_TOP_Y
  return { floorY, topY, H: floorY - topY }
}
// the STANDING hurtbox height (crouching never dodges depth): the tallest h seen while not crouching
export function standH(f) {
  const h = f.h || f.height || 110
  if (!f.isCrouching && !f.crouching) f._benStandH = Math.max(f._benStandH || 0, h)
  return f._benStandH || h
}
export function levelsFor(owner, ctx, fighters) {
  const { floorY, topY, H } = arenaOf(owner, ctx)
  const cap = Math.max(0, Math.min(FLOOD.CAP * H, H - FLOOD.GAP))
  const tallest = Math.max(...fighters.filter(Boolean).map(standH), 1)
  let l2 = FLOOD.L2 * H
  if (l2 < tallest) l2 = FLOOD.HEAD_K * tallest                     // a standing head must be fully under at Level 2
  return { floorY, topY, H, cap, l1: Math.min(FLOOD.L1 * H, cap), l2: Math.min(l2, cap), tallest }
}

// ── lifecycle ─────────────────────────────────────────────────────────────────────────────────────────────
export function canStartFlood(owner, fighters) {
  if (fighters.some(o => o && floodLive(floodOf(o)))) return false  // one flood at a time (mirror included)
  const r = floodOf(owner); return !(r && r.cd > 0)
}
export function startFlood(owner, ctx, fighters, seed = 1) {
  const L = levelsFor(owner, ctx, fighters)
  owner._benFlood = { owner: owner.side || "p1", phase: "rise", level: 1, t: 0, line: 0, from: 0, to: L.l1, rampT: 0, rampN: FLOOD.RISE1,
    floorY: L.floorY, topY: L.topY, H: L.H, cap: L.cap, l1: L.l1, l2: L.l2, tallest: L.tallest, seed: seed >>> 0, cd: 0, end: null,
    boiled: 0, boilAt: {}, breath: {}, drown: {}, wb: {}, events: 0 }
  return owner._benFlood
}
export function raiseFlood(owner) {
  const r = floodOf(owner)
  if (!r || r.level !== 1 || !(r.phase === "rise" || r.phase === "hold")) return false
  r.level = 2; r.from = r.line; r.to = Math.max(r.line, r.l2 - r.boiled); r.rampT = 0; r.rampN = FLOOD.RISE2; r.phase = "rise"
  return true
}
// swap / revert: the 90f recede (cooldown still applies); boil: the fire ultimate drops it to 0 over 60f
export function recedeFlood(owner, frames = FLOOD.RECEDE, why = "time") {
  const r = floodOf(owner); if (!floodLive(r) || r.phase === "recede" || r.phase === "boil") return false
  r.phase = why === "boil" ? "boil" : "recede"; r.from = r.line; r.to = 0; r.rampT = 0; r.rampN = frames; r.end = why
  return true
}
// KO / round end / rematch: gone instantly, cooldown included; every stamp lapses
// (STAMPED: owner → the fighters its last tick stamped — runtime bookkeeping only, never GAME_STATE, so a KO hook that only
// sees the owner can still lapse every stamp at once)
const STAMPED = new WeakMap()
export function clearFloodInstant(owner, fighters = []) {
  if (!owner || !owner._benFlood) return
  delete owner._benFlood
  for (const o of [...fighters, ...(STAMPED.get(owner) || [])]) if (o && o._benWater) delete o._benWater
  STAMPED.delete(owner)
}

const ease = k => k * k * (3 - 2 * k)
// the world tick: schedule + depth stamps (later sections add swim / breath / fire on top). Called once per frame per OWNER.
const WORLD = []   // (r, owner, fighters, ctx, api) sections, filled below
export function tickBenFlood(owner, ctx, api) {
  const r = floodOf(owner); if (!r) return
  const opp = api && api.getOpponent ? api.getOpponent(owner) : null
  const fighters = [owner, opp].filter(Boolean)
  if (fighters.some(o => !((o.health ?? 1) > 0))) { clearFloodInstant(owner, fighters); return }   // a KO ends it instantly
  if (!floodLive(r)) { if (r.cd > 0 && --r.cd <= 0) delete owner._benFlood; return }
  r.t++
  if (r.rampT < r.rampN) { r.rampT++; r.line = r.from + (r.to - r.from) * ease(r.rampT / r.rampN) }
  else r.line = r.to
  r.line = Math.max(0, Math.min(r.line, r.cap))                     // HARD CAP + air gap, always
  if (r.phase === "rise" && r.rampT >= r.rampN) r.phase = "hold"
  if (r.phase === "hold" && r.t >= FLOOD.DUR) recedeFlood(owner, FLOOD.RECEDE, "time")
  if ((r.phase === "recede" || r.phase === "boil") && r.rampT >= r.rampN) {
    r.phase = "off"; r.line = 0; r.cd = FLOOD.CD; r.breath = {}; r.drown = {}
    for (const o of fighters) if (o._benWater) delete o._benWater
    return
  }
  for (const o of fighters) stampWater(r, o)
  STAMPED.set(owner, fighters)
  for (const fn of WORLD) fn(r, owner, fighters, ctx, api)
}

// ── depth states (from the STANDING hurtbox; a platform above the line is DRY — the line is a horizontal Y only) ──────
export function depthOf(r, f) {
  if (!floodLive(r) || !(r.line > 0)) return "dry"
  const lineY = floodLineY(r), feet = f.y + (f.h || 110), head = feet - standH(f)
  if (feet <= lineY) return "dry"
  return head < lineY ? "wading" : "submerged"
}
// waterborne (Phase 6 extends this with the tag map): a READY form flagged `waterborne`
export let isWaterborne = f => !!(f && f.omnitrix && f.transformed && f.omnitrix.formState && f.omnitrix.formState.kind === "ripjaws")
export function setWaterborneTest(fn) { isWaterborne = fn }
function stampWater(r, o) {
  const depth = depthOf(r, o), wb = isWaterborne(o)
  const w = o._benWater || (o._benWater = {})
  w.ttl = 2; w.depth = depth; w.lineY = floodLineY(r); w.wb = wb; w.owner = r.owner
}
export const waterOf = f => (f && f._benWater && f._benWater.ttl > 0) ? f._benWater : null
export const submergedPlain = f => { const w = waterOf(f); return !!(w && !w.wb && w.depth === "submerged") }
// combat hook: a SUBMERGED non-waterborne fighter takes knockback distance ×0.8 and launch ×0.75 (floaty); hitstun unchanged
export const WATER_KB = { X: 0.8, LAUNCH: 0.75 }
export function benWaterKnockback(f) { if (!submergedPlain(f)) return; f.vx = (f.vx || 0) * WATER_KB.X; if ((f.vy || 0) < 0) f.vy *= WATER_KB.LAUNCH }
export { WORLD as FLOOD_WORLD, sideIdx }

// ── PROJECTILES under the line travel at ×0.75 (Phase 4) ───────────────────────────────────────────────────────
// Each frame a projectile whose centre is below the line is held back by 0.25 of its velocity (the engine then moves it
// the full velocity → net ×0.75). UNAFFECTED: beams / rays, floor shockwaves, spikes / pillars / geysers (by tag or name),
// stationary or rect hitboxes (melee-style boxes), and Ripjaws' own Water Jet (alien.rj === "jet").
export const WATER_PROJ = 0.75
const STATIC_NAMES = /beam|laser|ray\b|wave|shock|quake|spike|pillar|geyser|erupt|tremor|slam/i
export function projUnaffected(p) {
  if (!p || p.visualOnly) return true
  const a = p.alien || {}
  if (a.rj === "jet" || a.beam || a.floor || a.spike || p.grounded || p.rectHitbox) return true
  if (STATIC_NAMES.test(String(p.name || p.type || ""))) return true
  return Math.abs(p.vx || 0) + Math.abs(p.vy || 0) < 0.5
}
export const projBelow = (r, p) => (p.y || 0) > floodLineY(r)
WORLD.push(function slowProjectiles(r, owner, fighters, ctx, api) {
  const list = api && api.activeProjectiles ? api.activeProjectiles() : null; if (!list || !(r.line > 0)) return
  for (const p of list) {
    if (projUnaffected(p) || !projBelow(r, p)) continue
    p.x -= (p.vx || 0) * (1 - WATER_PROJ); p.y -= (p.vy || 0) * (1 - WATER_PROJ)
  }
})

// ── RENDER (render-only; drawn over both fighters by game.js when a fighter carries a flood) ─────────────────────────
function rh(a, b, k) {   // render hash → [0, 1)
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((k | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
export const floodRenderHash = rh
// pooled rain: 140 drops built once (no per-frame allocation); each drop's phase comes from the hash
const RAIN = Array.from({ length: 140 }, (_, i) => ({ x: rh(7, i, 1), y: rh(7, i, 2), v: 0.6 + rh(7, i, 3) * 0.4, l: 8 + (rh(7, i, 4) * 10 | 0) }))
export const RAIN_POOL_SIZE = RAIN.length
export function lightningOn(r, frame) { return rh(r.seed, frame >> 3, 91) < 0.035 && (frame & 7) < 3 }   // ~3f flashes, hash-picked
export function drawBenFlood(c, owner, frame, stageW = 3200) {
  const r = floodOf(owner); if (!floodLive(r) || !(r.line > 0.5)) return
  const lineY = floodLineY(r), top = r.topY, H = r.floorY - top, k = Math.min(1, r.line / Math.max(1, r.l1))
  c.save()
  // rain (world space, pooled)
  c.globalAlpha = 0.35 * k; c.strokeStyle = "#cbd5e1"; c.lineWidth = 1; c.beginPath()
  for (let i = 0; i < RAIN.length; i++) { const d = RAIN[i], x = (d.x * stageW + frame * 2) % stageW, y = top + ((d.y * H + frame * 14 * d.v) % H)
    if (y > lineY) continue; c.moveTo(x, y); c.lineTo(x - 2, y + d.l) }
  c.stroke()
  // the water body (translucent, both fighters readable on bright and dark stages)
  c.globalAlpha = 0.30; c.fillStyle = "#1d4ed8"; c.fillRect(-200, lineY, stageW + 400, r.floorY - lineY + 400)
  c.globalAlpha = 0.18; c.fillStyle = "#0b1e4a"; c.fillRect(-200, lineY + 40, stageW + 400, r.floorY - lineY + 360)
  // the surface: cosmetic ripple band (±6 px) + foam pixels; the gameplay line stays flat
  c.globalAlpha = 0.85; c.fillStyle = "#bfdbfe"
  for (let x = -200; x < stageW + 200; x += 8) { const dy = Math.round(Math.sin((x + frame * 3) * 0.035) * FLOOD.RIPPLE * 0.5 + (rh(r.seed, (x >> 3) + (frame >> 2), 5) - 0.5) * FLOOD.RIPPLE)
    c.fillRect(x, lineY + dy - 2, 8, 3) }
  c.fillStyle = "#ffffff"; c.globalAlpha = 0.9
  for (let i = 0; i < 40; i++) { const x = (rh(r.seed, i, (frame >> 3) + 11) * (stageW + 400)) - 200; c.fillRect(Math.round(x), lineY - 3, 3, 2) }
  // bubbles (render-only)
  c.globalAlpha = 0.55; c.fillStyle = "#e0f2fe"
  for (let i = 0; i < 24; i++) { const x = rh(r.seed, i, 31) * stageW, y = r.floorY - ((frame * (1 + (i & 3)) + rh(r.seed, i, 32) * 600) % Math.max(1, r.line)); if (y > lineY + 4) c.fillRect(Math.round(x), Math.round(y), 3, 3) }
  c.restore()
}
// screen-space lightning flash (render-only; never damages, never gameplay)
export function drawBenFloodFlash(c, owner, frame, w, h) {
  const r = floodOf(owner); if (!floodLive(r) || !lightningOn(r, frame)) return
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.16; c.fillStyle = "#e0f2fe"; c.fillRect(0, 0, w, h); c.restore()
}
