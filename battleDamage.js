// battleDamage.js — FEEL PASS (Phase 2): persistent BATTLE DAMAGE (render-layer ONLY).
//
// Accumulates per-slot damage taken across a MATCH (persists through rounds; cleared at match end / return
// to select) and turns it into:
//   • FIGHTER MARKS — scuffs/dirt, scorch (fire/explosion), frost (ice), small tears, and BLOOD (eligible
//     fighters only, when allowed). Rendered into a normalized texture that sprite.js composites CLIPPED to
//     the sprite's own alpha (source-atop), so marks only ever land on the character's pixels.
//   • FLOOR DECALS — scorch, cracks, (rain) puddles, and blood pools/drips, stamped ONCE into a persistent
//     offscreen layer drawn between the stage and the fighters; capped, oldest fade when over cap.
//
// NONE of this is part of GAME_STATE, replays, or determinism hashes. All visual variation comes from a
// deterministic integer hash of (matchSeed, slot/frame, index) — never gameRng/Date/Math.random — so LAN
// peers and companion screens draw the identical picture. Blood is gated by the caller (eligibility +
// bloodFx + "Full"); this module just honors the `bloodAllowed` flags it is handed.

import { poolAcquire, poolRelease } from "./pool.js"

// ── deterministic hash → [0,1) ───────────────────────────────────────────────
let _seed = 0x1234
export function bdSetSeed(seed) { _seed = (seed >>> 0) || 0x1234 }
function h(a, b = 0, c = 0) {
  let x = (_seed ^ (a * 0x9e3779b1) ^ (b * 0x85ebca77) ^ (c * 0xc2b2ae3d)) >>> 0
  x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0
  return x / 4294967296
}

// ── per-slot damage records ──────────────────────────────────────────────────
// level by cumulative fraction of maxHealth taken this match (can exceed 1 over rounds → capped at 3).
const LEVEL_FRAC = [0.15, 0.40, 0.70]   // L1 / L2 / L3 thresholds
const records = new Map()   // slotId → { slot, total, maxHp, level, types:Set, tex, texKey, eligible }

function recFor(slot) {
  let r = records.get(slot)
  if (!r) { r = { slot, total: 0, maxHp: 1000, level: 0, types: new Set(), tex: null, texKey: "", eligible: false }; records.set(slot, r) }
  return r
}

// Classify a hit's element/flags into a mark family.
function markFamily(element, big) {
  if (element === "fire" || big === "explosion") return "scorch"
  if (element === "ice") return "frost"
  return "scuff"
}

// Record a clean hit on a slot. dmg = damage dealt; maxHp = victim maxHealth; element = juice element;
// big = "explosion"|"slam"|null; eligible = blood-eligible (adult/brutal, from the caller's existing rule).
export function bdRecordHit({ slot, dmg, maxHp, element, big, eligible }) {
  if (!slot || !(dmg > 0)) return
  const r = recFor(slot)
  r.maxHp = maxHp || r.maxHp || 1000
  r.eligible = !!eligible
  r.total += dmg
  r.types.add(markFamily(element, big))
  const frac = r.total / Math.max(1, r.maxHp)
  const lvl = frac >= LEVEL_FRAC[2] ? 3 : frac >= LEVEL_FRAC[1] ? 2 : frac >= LEVEL_FRAC[0] ? 1 : 0
  if (lvl !== r.level) { r.level = lvl; r.tex = null }   // level changed → rebuild texture
}

export function bdLevel(slot) { return recFor(slot).level }
export function bdEligible(slot) { return recFor(slot).eligible }

// ── fighter MARK texture (normalized; composited clipped to sprite alpha by sprite.js) ───────────────
const TEX_W = 128, TEX_H = 192
function _blot(ctx, x, y, r, col) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, "0)"))
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
}
function _buildTex(r, bloodAllowed) {
  if (typeof document === "undefined") return null
  const cv = r.tex && r.tex._cv ? r.tex._cv : (typeof document !== "undefined" ? document.createElement("canvas") : null)
  if (!cv) return null
  cv.width = TEX_W; cv.height = TEX_H
  const c = cv.getContext("2d"); c.clearRect(0, 0, TEX_W, TEX_H)
  const base = r.level, s = r.slot.charCodeAt ? (r.slot.charCodeAt(0) + (r.slot.charCodeAt(1) || 0)) : 0
  // body region: central column, avoid the extreme edges
  const px = i => TEX_W * (0.22 + h(s, i, 1) * 0.56)
  const py = i => TEX_H * (0.14 + h(s, i, 2) * 0.72)
  // 1) scuffs/dirt — always present with any damage, count climbs with level
  const scuffs = base * 3
  for (let i = 0; i < scuffs; i++) _blot(c, px(i), py(i), 5 + h(s, i, 3) * 9, `rgba(46,34,26,${0.22 + h(s, i, 4) * 0.16})`)
  // 2) small tears (dark short strokes) at L2+
  if (base >= 2) { c.strokeStyle = "rgba(18,12,10,0.5)"; c.lineWidth = 1.5
    for (let i = 0; i < 3; i++) { const x = px(i + 40), y = py(i + 40), a = h(s, i, 5) * 6.28, l = 8 + h(s, i, 6) * 10
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke() } }
  // 3) scorch — dark char core + faint ember ring, where fire/explosion hits landed
  if (r.types.has("scorch")) for (let i = 0; i < base + 1; i++) {
    const x = px(i + 10), y = py(i + 10), rr = 8 + h(s, i, 7) * 10
    _blot(c, x, y, rr, "rgba(16,12,10,0.55)"); _blot(c, x, y, rr * 0.7, "rgba(210,95,22,0.22)")
  }
  // 4) frost — pale blue patches + white specks, where ice landed
  if (r.types.has("frost")) for (let i = 0; i < base + 1; i++) {
    const x = px(i + 20), y = py(i + 20)
    _blot(c, x, y, 9 + h(s, i, 8) * 11, "rgba(196,224,255,0.42)")
    c.fillStyle = "rgba(255,255,255,0.6)"; for (let k = 0; k < 3; k++) c.fillRect(x + (h(s, i, 9 + k) - 0.5) * 16, y + (h(s, i, 12 + k) - 0.5) * 16, 2, 2)
  }
  // 5) BLOOD — only when the caller allows it (eligible + Full + bloodFx). Dark-red streaks that run DOWN.
  if (bloodAllowed && r.eligible && base >= 1) for (let i = 0; i < base * 2; i++) {
    const x = px(i + 60), y = py(i + 60)
    _blot(c, x, y, 5 + h(s, i, 13) * 6, "rgba(120,12,22,0.6)")
    const run = 10 + h(s, i, 14) * 26; c.strokeStyle = "rgba(120,12,22,0.5)"; c.lineWidth = 2 + h(s, i, 15) * 2
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + (h(s, i, 16) - 0.5) * 5, y + run); c.stroke()
  }
  if (!r.tex) r.tex = {}
  r.tex._cv = cv
  return cv
}

// Return the current mark texture canvas for a slot (lazily (re)built on level/type/blood change). game.js
// calls this each frame for each live fighter and parks the result on fighter._bdMarkTex for sprite.js.
export function bdMarkTex(slot, bloodAllowed) {
  const r = recFor(slot)
  if (r.level < 1) return null
  const key = `${r.level}|${[...r.types].sort().join(",")}|${bloodAllowed && r.eligible ? 1 : 0}`
  if (!r.tex || r.tex._cv == null || r.texKey !== key) { _buildTex(r, bloodAllowed); r.texKey = key }
  return r.tex ? r.tex._cv : null
}

// ── FLOOR DECALS — persistent offscreen layer ────────────────────────────────
const DECAL_CAP = 150
let decals = []          // { type, x, y, r, rot, age, bloodAllowed }
let floorCv = null, floorW = 0, floorH = 0, floorDirty = false

function _ensureFloor(w, h) {
  if (typeof document === "undefined") return null
  if (!floorCv) floorCv = document.createElement("canvas")
  if (floorW !== w || floorH !== h) { floorCv.width = floorW = w; floorCv.height = floorH = h; floorDirty = true }
  return floorCv
}

function _paintDecal(c, d, alpha) {
  c.save(); c.translate(d.x, d.y); c.rotate(d.rot); c.globalAlpha = alpha
  if (d.type === "scorch") { _blot(c, 0, 0, d.r, "rgba(14,10,8,0.6)"); _blot(c, 0, 0, d.r * 0.6, "rgba(40,24,14,0.5)") }
  else if (d.type === "crack") { c.strokeStyle = "rgba(10,10,14,0.5)"; c.lineWidth = 2
    for (let k = 0; k < 5; k++) { const a = (k / 5) * 6.28 + d.rot; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * d.r, Math.sin(a) * d.r * 0.4); c.stroke() } }
  else if (d.type === "puddle") { c.fillStyle = "rgba(60,90,120,0.28)"; c.beginPath(); c.ellipse(0, 0, d.r, d.r * 0.4, 0, 0, 6.28); c.fill()
    c.strokeStyle = "rgba(150,180,210,0.25)"; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, d.r * 0.7, d.r * 0.28, 0, 0, 6.28); c.stroke() }
  else if (d.type === "blood") { c.fillStyle = "rgba(96,8,16,0.5)"; c.beginPath(); c.ellipse(0, 0, d.r, d.r * 0.42, 0, 0, 6.28); c.fill()
    _blot(c, 0, 0, d.r * 0.5, "rgba(120,12,22,0.55)") }
  c.restore()
}

// Stamp a NEW decal. Called once per event (explosion/slam/drip/puddle). Bakes into the offscreen layer.
export function bdFloorDecal({ type, x, y, r = 22, rot = 0 }) {
  if (!type || !Number.isFinite(x) || !Number.isFinite(y)) return
  decals.push({ type, x, y, r, rot, age: 0 })
  if (decals.length > DECAL_CAP) { decals.shift(); floorDirty = true }   // drop oldest → full rebuild (with fade) next draw
}

// Draw the floor-decal layer. w/h = canvas size. Rebuilds the baked bitmap only when a decal was added
// past the cap (fade the oldest) or the size changed; otherwise it's a single cheap drawImage.
export function bdDrawFloor(ctx, w, h) {
  const cv = _ensureFloor(w, h); if (!cv) return
  if (floorDirty) {
    const c = cv.getContext("2d"); c.clearRect(0, 0, w, h)
    const n = decals.length
    for (let i = 0; i < n; i++) { const d = decals[i]; const fade = n > DECAL_CAP * 0.8 ? Math.min(1, (i + 1) / (n * 0.5)) : 1; _paintDecal(c, d, fade) }
    floorDirty = false
  } else {
    // fast path: ensure brand-new decals (added since last bake) are stamped without a full clear
    for (let i = 0; i < decals.length; i++) { const d = decals[i]; if (!d._baked) { _paintDecal(cv.getContext("2d"), d, 1); d._baked = true } }
  }
  ctx.drawImage(cv, 0, 0)
}

// ── DRIPS — level-2+ fighters shed a slow pooled drip now and then ────────────
const DRIP_CAP = 40
let drips = []
export function bdMaybeDrip(slot, x, y, groundY, frame, bloodAllowed) {
  const r = recFor(slot)
  if (r.level < 2) return
  if (h(frame, x | 0, 7) > 0.012) return   // ~1.2%/frame → a drip roughly every ~1.4s
  if (drips.length >= DRIP_CAP) return
  const blood = bloodAllowed && r.eligible
  const d = poolAcquire("bdDrip", DRIP_CAP)
  d.x = x + (h(frame, slot.length, 8) - 0.5) * 14; d.y = y; d.vy = 0.6; d.groundY = groundY
  d.blood = blood; d.active = true
  drips.push(d)
}
export function bdTickDrips() {
  for (let i = drips.length - 1; i >= 0; i--) {
    const d = drips[i]; d.vy += 0.18; d.y += d.vy
    if (d.y >= d.groundY) {   // landed → stamp a small floor decal, recycle
      bdFloorDecal({ type: d.blood ? "blood" : "scorch", x: d.x, y: d.groundY, r: d.blood ? 10 : 7, rot: 0 })
      drips.splice(i, 1); poolRelease("bdDrip", d)
    }
  }
}
export function bdDrawDrips(ctx) {
  for (const d of drips) { ctx.fillStyle = d.blood ? "rgba(120,12,22,0.8)" : "rgba(40,30,24,0.75)"; ctx.beginPath(); ctx.ellipse(d.x, d.y, 2.2, 4.2, 0, 0, 6.28); ctx.fill() }
}

// ── lifecycle ────────────────────────────────────────────────────────────────
// Clear EVERYTHING — called at match start and at match end / return to select (NOT between rounds).
export function bdReset() {
  records.clear()
  decals = []
  for (const d of drips) poolRelease("bdDrip", d)
  drips = []
  floorDirty = true
  if (floorCv) { const c = floorCv.getContext("2d"); c && c.clearRect(0, 0, floorW, floorH) }
}

// Harness read-out.
export function bdStatus() {
  const slots = {}
  for (const [k, r] of records) slots[k] = { total: Math.round(r.total), level: r.level, types: [...r.types], eligible: r.eligible, hasTex: !!(r.tex && r.tex._cv) }
  return { slots, decals: decals.length, drips: drips.length }
}
