// benFlood.js — the STORM TIDE flood: ONE global, owner-tagged, flat water line (generic, ben10-gated; Ripjaws casts it).
// GAME_STATE: the OWNER's `_benFlood` record (plain data). Each frame the world tick (abilities.tickBenAlienForm, gated on
// the field) stamps every fighter with `_benWater` (plain data, ttl 2) — the ONLY thing physics / combat ever read. With no
// flood nothing is stamped, so every character plays byte-identically. The flood never changes the stage: no collision,
// no floor, no wall, no friction, no KO zone; the line is a world Y only, and water never pushes anyone anywhere.
// Render-only (never GAME_STATE): rain, lightning flashes, ripples (±6 px), foam, bubbles, steam — hash(seed, frame, layer).

import { isWaterborneFighter, isFireProj, isElectricProj, isElectricBody, isFireUltimate } from "./waterAffinity.js"   // the waterborne + fire / electric tag maps (data only)
import { HB_SCORCH } from "./heatblast.js"   // leaf module: Heatblast's Scorch burn constants (a submerged burn ends)

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
// the Ultimate's flood: straight to Level 2 (over 60f) for 300f in total — only when no flood is live and the cooldown is not
// running (null otherwise: nothing changes)
export const ULT_FLOOD_DUR = 300
export function ultFlood(owner, ctx, fighters, seed = 1) {
  if (!canStartFlood(owner, fighters)) return null
  const r = startFlood(owner, ctx, fighters, seed)
  r.level = 2; r.to = r.l2; r.rampN = FLOOD.RISE2; r.dur = ULT_FLOOD_DUR; r.byUlt = true
  return r
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
  for (const o of [...fighters, ...(STAMPED.get(owner) || [])]) if (o) { delete o._benWater; delete o._benSinkT }
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
  if (r.phase === "hold" && r.t >= (r.dur || FLOOD.DUR)) recedeFlood(owner, FLOOD.RECEDE, "time")
  if ((r.phase === "recede" || r.phase === "boil") && r.rampT >= r.rampN) {
    r.phase = "off"; r.line = 0; r.cd = FLOOD.CD; r.breath = {}; r.drown = {}; r.taken = {}
    for (const o of fighters) { delete o._benWater; delete o._benSinkT }
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
// WATERBORNE (waterAffinity.js tag map: the ACTIVE form's "water" / "ice" tag) — re-read every frame, so a transform completing
// mid-flood (or a revert) updates the state on the next tick; breath is cleared / restarts at 100 accordingly (tickBreath)
export let isWaterborne = isWaterborneFighter
export function setWaterborneTest(fn) { isWaterborne = fn || isWaterborneFighter }   // harness override; null restores
function stampWater(r, o) {
  const depth = depthOf(r, o), wb = isWaterborne(o)
  const w = o._benWater || (o._benWater = {})
  w.ttl = 2; w.depth = depth; w.lineY = floodLineY(r); w.wb = wb; w.owner = r.owner; w.t = r.t
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

// ── BREATH + DROWNING (Phase 5; GAME_STATE: the flood record's breath / drown maps, keyed by side) ─────────────────
// Only NON-waterborne fighters, only while a flood exists. Breath 0–100, 100 at the flood's start. SUBMERGED: −100 / 420f;
// head above water (dry / wading / at the surface): +100 / 90f. At 0 while submerged: DROWNING — 4 HP every 15f, not
// combo-scaled, no hitstun / knockback, never breaks or resets a combo, and it CANNOT KO (stops at 1 HP). No refill while
// drowning until the head is above water. Stops at once when the flood ends, the target surfaces / is dry / wading, or
// becomes waterborne, or when the owner stops being Ripjaws (a swap / revert recede): every breath record is cleared.
// BREATH STEAL (−6, once per cast) and UNDERTOW (−15 once + sink) come from Ripjaws' contact (breathHit).
export const BREATH = { MAX: 100, DRAIN: 100 / 420, REFILL: 100 / 90, DROWN_HP: 4, DROWN_EVERY: 15, STEAL: 6, UNDERTOW: 15, SINK_T: 30, SINK_V: 6 }
export const breathLive = r => floodLive(r) && r.end !== "swap" && r.end !== "boil"
WORLD.push(function tickBreath(r, owner, fighters) {
  if (r.paused) return   // the owner's Ultimate cinematic holds everyone: breath / drowning pause (no damage beyond the Ultimate's)
  for (const o of fighters) {
    const k = o.side || "p" + (sideIdx(o) + 1), w = o._benWater
    if (!breathLive(r) || (w && w.wb)) { if (k in r.breath) { delete r.breath[k]; delete r.drown[k] } if (w) { w.breath = null; w.drowning = false } continue }
    let b = k in r.breath ? r.breath[k] : BREATH.MAX
    const sub = w && w.depth === "submerged"
    if (sub) {
      b = Math.max(0, b - BREATH.DRAIN)
      if (b <= 0) { r.drown[k] = (r.drown[k] || 0) + 1; if (r.drown[k] % BREATH.DROWN_EVERY === 0 && o.health > 1) o.health = Math.max(1, o.health - BREATH.DROWN_HP) }
    } else { b = Math.min(BREATH.MAX, b + BREATH.REFILL); delete r.drown[k] }
    r.breath[k] = b
    if (w) { w.breath = b; w.drowning = sub && b <= 0 }
  }
})
// UNDERTOW sink: while _benSinkT runs the target is pulled down at 6 px/f (never through the floor: physics clamps) — wading
// or submerged non-waterborne targets only; lapses with the flood
WORLD.push(function tickSink(r, owner, fighters) {
  for (const o of fighters) if ((o._benSinkT || 0) > 0) {
    const w = o._benWater; if (!breathLive(r) || !w || w.wb) { delete o._benSinkT; continue }
    o._benSinkT--; if ((o.vy || 0) < BREATH.SINK_V) o.vy = BREATH.SINK_V; if (!o._benSinkT) delete o._benSinkT
  }
})
// Ripjaws' clean hit on a SUBMERGED non-waterborne target: −6 once per cast (key); Undertow: −15 once per cast + the sink
export function breathHit(owner, target, key, kind = "steal") {
  const r = floodOf(owner) || floodOf(target); if (!breathLive(r)) return false
  const w = waterOf(target); if (!w || w.wb) return false
  if (kind === "steal" && w.depth !== "submerged") return false
  if (kind === "undertow" && w.depth === "dry") return false
  const k = target.side || "p" + (sideIdx(target) + 1), tag = kind + ":" + key
  r.taken = r.taken || {}; const seen = r.taken[k] || (r.taken[k] = [])
  if (seen.includes(tag)) return false
  seen.push(tag); if (seen.length > 8) seen.shift()
  r.breath[k] = Math.max(0, (k in r.breath ? r.breath[k] : BREATH.MAX) - (kind === "undertow" ? BREATH.UNDERTOW : BREATH.STEAL))
  if (kind === "undertow") target._benSinkT = BREATH.SINK_T   // UNDERTOW: dragged toward the floor for 30f (tickSink)
  return true
}
// the breath bar (render-only): a thin bar just UNDER the affected fighter's health panel (o.y = the panel's bottom + 3; o.x /
// o.w = the bar track), only while a flood exists and breath < 100; a red DROWNING pulse at 0. Never wider than the track.
export function drawBenBreathHud(ctx, f, o) {
  const w = waterOf(f); if (!w || w.wb || w.breath == null || w.breath >= BREATH.MAX) return
  const W = Math.max(40, o.w || o.pbw || 120), x = o.x || 0, y = o.y != null ? o.y : (o.enY || 0) + (o.enH || 6) + 3
  const k = Math.max(0, Math.min(1, w.breath / BREATH.MAX)), pulse = w.drowning ? ((w.t >> 3) & 1) : 0   // render-only blink (the flood's own frame count)
  ctx.save(); ctx.fillStyle = "rgba(8,15,30,0.85)"; ctx.fillRect(x - 1, y - 1, W + 2, 6)
  ctx.fillStyle = w.drowning ? (pulse ? "#f87171" : "#7f1d1d") : "#38bdf8"
  const bw = w.drowning ? W : W * k; ctx.fillRect(o.flip ? x + W - bw : x, y, bw, 4)
  if (w.drowning) { ctx.font = "bold 9px monospace"; ctx.fillStyle = pulse ? "#fecaca" : "#f87171"; ctx.textAlign = o.flip ? "right" : "left"; ctx.fillText("DROWNING", o.flip ? x + W : x, y + 13) }
  ctx.restore()
}

// ── FIRE + ELECTRIC (Phase 7) ──────────────────────────────────────────────────────────────────────────────
// Each fire event is ATOMIC (resolved whole, inside this one section, the frame it happens):
//  • FIZZLE: a fire projectile / hitbox first seen with its anchor below the line never exists — deleted the frame it
//    appears, before it can hit (the cast's cost stays spent). Cosmetic steam.
//  • PUT OUT: a fire projectile that was above the line and is now below is deleted; if it CROSSED from above it BOILS the
//    flood: the line drops 30 px, once per 180f per fire owner, at most 90 px per flood.
//  • BURN ENDS when the burning fighter is submerged (Heatblast's Scorch, Enoch's burn, Sanji's Diable burn).
//  • FIRE ULTIMATE during a flood (a fire-tagged ultimate projectile, or an ultimate cast whose element is fire): the flood
//    drops to 0 over 60f, ends, and its 900f cooldown starts. Nothing is put out while it boils away.
// ELECTRIC: an electric hit on a SUBMERGED fighter (waterborne or not) deals +15 % (benFloodDamage, the damage hook).
export const FIRE = { BOIL: 30, BOIL_CD: 180, BOIL_MAX: 90, ULT_DRAIN: 60, ELECTRIC: 1.15 }
const STEAM = []   // render-only puffs {x, y, t} — never GAME_STATE
function steam(p, r) { if (STEAM.length > 24) STEAM.shift(); STEAM.push({ x: p.x + (p.w || 0) / 2, y: floodLineY(r), t: 0 }) }
const ownerKey = p => { const o = p && p.owner; return o ? (o.side || "p" + (sideIdx(o) + 1)) : "?" }
WORLD.push(function tickFire(r, owner, fighters, ctx, api) {
  r.ultCd = r.ultCd || {}
  for (const o of fighters) {                                                // fire ULTIMATE cast (the cooldown edge)
    const k = o.side || "p" + (sideIdx(o) + 1), cd = o.ultimateCooldown || 0
    if (cd > (r.ultCd[k] || 0) && r.phase !== "boil" && isFireUltimate(o)) { recedeFlood(owner, FIRE.ULT_DRAIN, "boil"); r.fireUlts = (r.fireUlts || 0) + 1 }
    r.ultCd[k] = cd
  }
  const list = api && api.activeProjectiles ? api.activeProjectiles() : null
  if (list) for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]; if (!isFireProj(p)) continue
    if (p.isUltimate && r.phase !== "boil") { recedeFlood(owner, FIRE.ULT_DRAIN, "boil"); r.fireUlts = (r.fireUlts || 0) + 1 }
    if (r.phase === "boil") { p._benFireSeen = 1; continue }
    const below = (p.y || 0) + (p.h || 0) / 2 > floodLineY(r) && r.line > 0
    if (!p._benFireSeen) { p._benFireSeen = 1; if (below) { list.splice(i, 1); r.fizzles = (r.fizzles || 0) + 1; steam(p, r) } else p._benFireAbove = 1; continue }
    if (!below) { p._benFireAbove = 1; continue }
    list.splice(i, 1); r.putOut = (r.putOut || 0) + 1; steam(p, r)
    const k = ownerKey(p)
    if (p._benFireAbove && r.boiled < FIRE.BOIL_MAX && !(r.t < (r.boilAt[k] ?? -Infinity) + FIRE.BOIL_CD)) {
      const d = Math.min(FIRE.BOIL, FIRE.BOIL_MAX - r.boiled); r.boiled += d; r.boilAt[k] = r.t
      r.to = Math.max(0, r.to - d); r.from = Math.max(0, r.from - d); if (r.rampT >= r.rampN) r.line = r.to   // holding: drops now; rising: the ramp continues to the lower target
    }
  }
  for (const o of fighters) {                                                // a submerged fighter's burn ends
    const w = o._benWater; if (!w || w.depth !== "submerged") continue
    for (const b of fighters) if (b !== o) {
      const fs = b.omnitrix && b.transformed && b.omnitrix.formState, sc = fs && fs.kind === "heatblast" && fs.scorch
      if (sc && sc.burnT > 0) { sc.burnT = 0; sc.burnTick = 0; sc.immune = HB_SCORCH.IMMUNE; r.burnsEnded = (r.burnsEnded || 0) + 1 }
      const ea = b._enoch && b._enoch.aff && b._enoch.aff[o.side]
      if (ea && (ea.burn > 0 || ea.burnT > 0)) { ea.burn = 0; ea.burnT = 0; r.burnsEnded = (r.burnsEnded || 0) + 1 }
      if (b._sanji && b._sanji.burn > 0) { b._sanji.burn = 0; b._sanji.burnTick = 0; r.burnsEnded = (r.burnsEnded || 0) + 1 }
    }
    if (o._fireBurn) o._fireBurn = null                                      // the render-only burn overlay too
  }
})
// damage hook (ben10State.benAlienDamageMods → every damage write with a Ben on either side): electric on a SUBMERGED target
export function isElectricHit(opts) {
  const a = opts && (opts.attacker || opts.boostFrom); if (!a) return false
  if (opts.source === "projectile") return isElectricProj({ name: opts.move }) || (isElectricBody(a) && !!opts.move)
  return opts.source === "melee" && isElectricBody(a)
}
export function benFloodDamage(target, raw, opts) {
  const w = waterOf(target); if (!w || w.depth !== "submerged") return raw
  return isElectricHit(opts) ? raw * FIRE.ELECTRIC : raw
}

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
  c.globalAlpha = 0.36; c.fillStyle = "#1d4ed8"; c.fillRect(-200, lineY, stageW + 400, r.floorY - lineY + 400)
  c.globalAlpha = 0.20; c.fillStyle = "#0b1e4a"; c.fillRect(-200, lineY + 40, stageW + 400, r.floorY - lineY + 360)
  // the surface: cosmetic ripple band (±6 px) + foam pixels; the gameplay line stays flat
  c.globalAlpha = 0.85; c.fillStyle = "#bfdbfe"
  for (let x = -200; x < stageW + 200; x += 8) { const dy = Math.round(Math.sin((x + frame * 3) * 0.035) * FLOOD.RIPPLE * 0.5 + (rh(r.seed, (x >> 3) + (frame >> 2), 5) - 0.5) * FLOOD.RIPPLE)
    c.fillRect(x, lineY + dy - 2, 8, 3) }
  c.fillStyle = "#ffffff"; c.globalAlpha = 0.9
  for (let i = 0; i < 40; i++) { const x = (rh(r.seed, i, (frame >> 3) + 11) * (stageW + 400)) - 200; c.fillRect(Math.round(x), lineY - 3, 3, 2) }
  // bubbles (render-only)
  c.globalAlpha = 0.55; c.fillStyle = "#e0f2fe"
  for (let i = 0; i < 24; i++) { const x = rh(r.seed, i, 31) * stageW, y = r.floorY - ((frame * (1 + (i & 3)) + rh(r.seed, i, 32) * 600) % Math.max(1, r.line)); if (y > lineY + 4) c.fillRect(Math.round(x), Math.round(y), 3, 3) }
  // steam where fire was put out / fizzled (render-only puffs, aged here)
  for (let i = STEAM.length - 1; i >= 0; i--) { const q = STEAM[i]; q.t++; if (q.t > 40) { STEAM.splice(i, 1); continue }
    c.globalAlpha = 0.5 * (1 - q.t / 40); c.fillStyle = "#f1f5f9"
    for (let j = 0; j < 5; j++) c.fillRect(Math.round(q.x - 12 + j * 6 + Math.sin(q.t * 0.2 + j) * 3), Math.round(q.y - q.t * 1.2 - (j & 1) * 6), 6, 6) }
  c.restore()
}
// screen-space lightning flash (render-only; never damages, never gameplay)
export function drawBenFloodFlash(c, owner, frame, w, h) {
  const r = floodOf(owner); if (!floodLive(r) || !lightningOn(r, frame)) return
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.16; c.fillStyle = "#e0f2fe"; c.fillRect(0, 0, w, h); c.restore()
}
