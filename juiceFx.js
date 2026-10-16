// juiceFx.js
// ─────────────────────────────────────────────────────────────────
// PRESENTATION-ONLY explosion FX for the "JUICE" pass: code-drawn fireball,
// pooled debris + smoke, floor shockwave ring, and the pre-detonation swell
// (anticipation). Drawn in WORLD space (inside the battle-scene camera
// transform), so everything anchors to the detonation world point.
//
// HARD RULES:
//  • Never touches the simulation — no damage/hitbox/frame-data/physics reads
//    or writes. game.js calls fire*/update/draw; this module only paints.
//  • Deterministic + LAN-safe — all randomness is a pure hash of (frame, player,
//    index). NO Math.random, NO gameRng. Both peers paint identically.
//  • Pooled with a HARD CAP (300 particles) and NO per-frame allocation — every
//    pool object is created once at module load; spawn reuses an inactive slot.
//  • Respects the Particles setting (Low scales counts down) via juiceSettings.
// ─────────────────────────────────────────────────────────────────
import { juiceSettings } from "./juiceSettings.js"

export const JUICE_PARTICLE_CAP = 300          // hard cap: debris + smoke combined
const DEBRIS_MAX = 200, SMOKE_MAX = 100        // = 300 total
const FIREBALL_MAX = 24, SHOCK_MAX = 24, SWELL_MAX = 12

// Per-tier shape. counts are PRE-particleScale; debris bounce once; smoke hangs ~1.5s.
const TIER = {
  small:    { fireR: 36,  fireballs: 1, debris: 6,  smoke: 2, shockwave: false, boomGrow: 5, boomFade: 26 },
  medium:   { fireR: 64,  fireballs: 1, debris: 12, smoke: 3, shockwave: true,  boomGrow: 6, boomFade: 30 },
  ultimate: { fireR: 104, fireballs: 2, debris: 24, smoke: 5, shockwave: true,  boomGrow: 6, boomFade: 34 },
}

// ── deterministic hash (frame, player, index) → [0,1) ────────────────────────
function hash3(a, b, c) {
  let h = (Math.imul(((a | 0) ^ 0x9e3779b9) >>> 0, 2654435761) ^
           Math.imul(((b | 0) + 1) >>> 0, 40503) ^
           Math.imul(((c | 0) + 1) >>> 0, 2246822519)) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13
  return h >>> 0
}
const rnd = (a, b, c) => (hash3(a, b, c) % 100000) / 100000   // 0..1

// ── pools (preallocated once; no per-frame allocation) ───────────────────────
function mkPool(n, shape) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = { active: false, ...shape() }; return a }
const debris    = mkPool(DEBRIS_MAX,  () => ({ x: 0, y: 0, vx: 0, vy: 0, size: 3, life: 0, maxLife: 1, groundY: 0, bounced: false, noGrav: false, r: 200, g: 150, b: 90 }))
const smoke     = mkPool(SMOKE_MAX,   () => ({ x: 0, y: 0, vx: 0, vy: 0, size: 6, grow: 0.4, life: 0, maxLife: 1, shade: 90, dust: false }))
const fireballs = mkPool(FIREBALL_MAX,() => ({ x: 0, y: 0, rMax: 40, age: 0, grow: 6, fade: 30, tier: "small" }))
const shocks    = mkPool(SHOCK_MAX,   () => ({ x: 0, y: 0, groundY: 0, age: 0, maxAge: 26, rMax: 120, tier: "medium" }))
const swells    = mkPool(SWELL_MAX,   () => ({ x: 0, y: 0, age: 0, maxAge: 18, tier: "small" }))

function acquire(pool) { for (let i = 0; i < pool.length; i++) if (!pool[i].active) return pool[i]; return null }
function liveParticles() { let n = 0; for (const p of debris) if (p.active) n++; for (const p of smoke) if (p.active) n++; return n }

// ── ANTICIPATION: a swelling red pulse on the source (startup ≥ 8f moves) ─────
// Code-drawn swell (1.0→1.12-scale red ring that pulses 2-3×) standing in for a
// literal sprite-scale pulse, so the sprite render pipeline is never touched.
export function fireJuiceAnticipation(x, y, tier = "small") {
  const s = acquire(swells); if (!s) return
  s.active = true; s.x = x; s.y = y; s.age = 0; s.tier = tier
  s.maxAge = tier === "ultimate" ? 26 : 18
}

// ── DETONATION: fireball + debris + smoke (+ shockwave for MEDIUM/ULTIMATE) ───
// x,y = detonation world point. frame = globalFrameCount, player = 0/1 → the
// deterministic seed. groundY = floor world-Y (debris bounce + shockwave plane).
export function fireJuiceExplosion({ x, y, tier = "medium", frame = 0, player = 0, groundY = 0 }) {
  const t = TIER[tier] || TIER.medium
  const pScale = juiceSettings.particleScale()
  const seed = (frame * 131 + player * 977) >>> 0

  for (let i = 0; i < t.fireballs; i++) {
    const f = acquire(fireballs); if (!f) break
    f.active = true; f.tier = tier; f.age = 0; f.grow = t.boomGrow; f.fade = t.boomFade
    f.x = x + (rnd(seed, 7, i) - 0.5) * t.fireR * 0.4
    f.y = y + (rnd(seed, 11, i) - 0.5) * t.fireR * 0.4
    f.rMax = t.fireR * (0.85 + rnd(seed, 13, i) * 0.3)
  }

  const nDebris = Math.max(1, Math.round(t.debris * pScale))
  for (let i = 0; i < nDebris; i++) {
    const d = acquire(debris); if (!d) break
    const ang = rnd(seed, 101, i) * Math.PI * 2
    const spd = (2 + rnd(seed, 103, i) * 4) * (tier === "ultimate" ? 1.6 : tier === "medium" ? 1.2 : 1)
    d.active = true; d.x = x; d.y = y; d.noGrav = false
    d.vx = Math.cos(ang) * spd
    d.vy = -Math.abs(Math.sin(ang) * spd) - 1.5          // biased upward → arcs out
    d.size = 2 + rnd(seed, 107, i) * (tier === "ultimate" ? 4 : 3)
    d.maxLife = d.life = 34 + Math.floor(rnd(seed, 109, i) * 26)
    d.groundY = groundY; d.bounced = false
    const warm = rnd(seed, 111, i)                        // ember↔debris colour
    d.r = 210 + Math.floor(warm * 45); d.g = 120 + Math.floor(warm * 90); d.b = 60 + Math.floor(warm * 40)
  }

  const nSmoke = Math.max(1, Math.round(t.smoke * pScale))
  for (let i = 0; i < nSmoke; i++) {
    const s = acquire(smoke); if (!s) break
    s.active = true; s.dust = false; s.vx = 0
    s.x = x + (rnd(seed, 201, i) - 0.5) * t.fireR
    s.y = y + (rnd(seed, 203, i) - 0.5) * t.fireR * 0.6
    s.vy = -(0.3 + rnd(seed, 205, i) * 0.5)               // rises slowly
    s.size = t.fireR * (0.25 + rnd(seed, 207, i) * 0.2)
    s.grow = 0.4 + rnd(seed, 209, i) * 0.5                // grows
    s.maxLife = s.life = 80 + Math.floor(rnd(seed, 211, i) * 20)   // ~1.5s @60fps
    s.shade = 70 + Math.floor(rnd(seed, 213, i) * 40)
  }

  if (t.shockwave) {
    const sh = acquire(shocks)
    if (sh) {
      sh.active = true; sh.x = x; sh.groundY = groundY; sh.age = 0
      sh.maxAge = tier === "ultimate" ? 34 : 26
      sh.rMax = (tier === "ultimate" ? 3.0 : 2.0) * t.fireR
      sh.tier = tier
    }
  }
}

// ── DASH dust kick (ground-only) — tan puffs kicked backward from the dash ────
export function fireJuiceDust({ x, y, dir = 1, frame = 0, player = 0 }) {
  const n = Math.max(1, Math.round(6 * juiceSettings.particleScale()))
  const seed = (frame * 53 + player * 911) >>> 0
  for (let i = 0; i < n; i++) {
    const s = acquire(smoke); if (!s) break
    s.active = true; s.dust = true
    s.x = x + (rnd(seed, 301, i) - 0.5) * 18
    s.y = y - rnd(seed, 303, i) * 5
    s.vx = -dir * (0.3 + rnd(seed, 305, i) * 0.7)         // kicks opposite the dash direction
    s.vy = -(0.15 + rnd(seed, 307, i) * 0.3)              // low, lazy rise
    s.size = 5 + rnd(seed, 309, i) * 7
    s.grow = 0.4 + rnd(seed, 311, i) * 0.4
    s.maxLife = s.life = 22 + Math.floor(rnd(seed, 313, i) * 14)
    s.shade = 150 + Math.floor(rnd(seed, 315, i) * 40)
  }
}

// ── HIT FEEL: directional spark burst in the hit direction (arcs + gravity, never straight) ──
export function fireJuiceHitSpark({ x, y, dir = 1, count = 6, speed = 4, frame = 0, player = 0 }) {
  const n = Math.max(1, Math.round(count * juiceSettings.hitEffectScale()))
  const seed = (frame * 131 + player * 733) >>> 0
  const base = dir < 0 ? Math.PI : 0                       // emission centre = the hit direction
  for (let i = 0; i < n; i++) {
    const d = acquire(debris); if (!d) break
    const ang = base + (rnd(seed, 401, i) - 0.5) * 1.6     // ±0.8 rad cone around the hit direction
    const sp = speed * (0.6 + rnd(seed, 403, i) * 0.8)
    d.active = true; d.x = x; d.y = y; d.noGrav = false
    d.vx = Math.cos(ang) * sp
    d.vy = Math.sin(ang) * sp - (0.5 + rnd(seed, 405, i) * 1.5)   // slight upward pop → the spark ARCS
    d.size = 1.5 + rnd(seed, 407, i) * 2.2
    d.maxLife = d.life = 10 + Math.floor(rnd(seed, 409, i) * 10)
    d.groundY = 0; d.bounced = true                        // no floor bounce for a quick hit spark
    const warm = rnd(seed, 411, i)
    d.r = 255; d.g = 200 + Math.floor(warm * 55); d.b = 120 + Math.floor(warm * 80)
  }
}

// ── HIT FEEL: KO "pop" — a burst of coloured pieces thrown outward (gravity + bounce). ──
export function fireJuiceKoPop({ x, y, groundY = 0, frame = 0, player = 0, colors = null, count = 28 }) {
  const n = Math.max(1, Math.round(count * juiceSettings.hitEffectScale() * juiceSettings.particleScale()))
  const seed = (frame * 197 + player * 877) >>> 0
  for (let i = 0; i < n; i++) {
    const d = acquire(debris); if (!d) break
    const ang = rnd(seed, 501, i) * Math.PI * 2
    const sp = 2 + rnd(seed, 503, i) * 5
    d.active = true; d.x = x; d.y = y; d.noGrav = false
    d.vx = Math.cos(ang) * sp; d.vy = -Math.abs(Math.sin(ang) * sp) - 2
    d.size = 2 + rnd(seed, 505, i) * 4
    d.maxLife = d.life = 30 + Math.floor(rnd(seed, 507, i) * 30)
    d.groundY = groundY; d.bounced = false
    const c = (colors && colors.length) ? colors[i % colors.length] : [255, 80 + Math.floor(rnd(seed, 509, i) * 120), 80]
    d.r = c[0]; d.g = c[1]; d.b = c[2]
  }
}

// ── DISNEY (Phase B): CHARGE-IN — particles pulled IN from a ring toward the source (converging) ──
export function fireJuiceChargeIn({ x, y, frame = 0, player = 0, tier = "medium", color = null }) {
  const n = Math.max(1, Math.round((tier === "ultimate" ? 12 : 8) * juiceSettings.hitEffectScale()))
  const seed = (frame * 263 + player * 619) >>> 0
  const R = tier === "ultimate" ? 90 : 60
  for (let i = 0; i < n; i++) {
    const d = acquire(debris); if (!d) break
    const ang = rnd(seed, 601, i) * Math.PI * 2
    const r0 = R * (0.7 + rnd(seed, 603, i) * 0.4)
    d.active = true; d.noGrav = true; d.bounced = true; d.groundY = 0
    d.x = x + Math.cos(ang) * r0; d.y = y + Math.sin(ang) * r0
    const sp = r0 / (10 + rnd(seed, 605, i) * 6)          // arrive at the core in ~10-16f
    d.vx = -Math.cos(ang) * sp; d.vy = -Math.sin(ang) * sp
    d.size = 1.2 + rnd(seed, 607, i) * 2
    d.maxLife = d.life = 10 + Math.floor(rnd(seed, 609, i) * 6)
    const c = color || [150, 220, 255]                    // generic ki/energy; Phase D tints by element
    d.r = c[0]; d.g = c[1]; d.b = c[2]
  }
}

// ── advance all pools one sim frame (deterministic; call each sim frame) ──────
export function updateJuiceFx() {
  for (const d of debris) {
    if (!d.active) continue
    if (!d.noGrav) d.vy += 0.35                           // gravity (charge-in particles float straight in)
    d.x += d.vx; d.y += d.vy
    if (!d.bounced && d.groundY && d.y >= d.groundY) {    // bounce ONCE
      d.y = d.groundY; d.vy = -d.vy * 0.42; d.vx *= 0.6; d.bounced = true
    } else if (d.bounced && d.groundY && d.y > d.groundY) { d.y = d.groundY; d.vy = 0; d.vx *= 0.8 }
    if (--d.life <= 0) d.active = false
  }
  for (const s of smoke) {
    if (!s.active) continue
    s.x += s.vx || 0; s.y += s.vy; s.size += s.grow; s.vy *= 0.985; s.vx *= 0.9
    if (--s.life <= 0) s.active = false
  }
  for (const f of fireballs) { if (f.active && ++f.age >= f.grow + f.fade) f.active = false }
  for (const sh of shocks)   { if (sh.active && ++sh.age >= sh.maxAge) sh.active = false }
  for (const s of swells)    { if (s.active && ++s.age >= s.maxAge) s.active = false }
}

// ── draw in WORLD space (called inside the battle-scene camera transform) ─────
export function drawJuiceFxWorld(ctx) {
  // shockwaves (floor rings) — behind everything else
  for (const sh of shocks) {
    if (!sh.active) continue
    const t = sh.age / sh.maxAge, env = 1 - t
    const rx = sh.rMax * t, ry = rx * 0.26
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    ctx.strokeStyle = `rgba(255,${180 + Math.floor(env * 60)},120,${(0.55 * env).toFixed(3)})`
    ctx.lineWidth = (sh.tier === "ultimate" ? 5 : 3) * env + 1
    ctx.beginPath(); ctx.ellipse(sh.x, sh.groundY, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }
  // smoke — soft grey puffs, under the fire
  for (const s of smoke) {
    if (!s.active) continue
    const env = s.life / s.maxLife
    const a = (s.dust ? 0.4 : 0.33) * Math.min(1, env * 1.6)   // fade in slightly then out
    ctx.save()
    // dust = warm tan ground kick; smoke = neutral grey.
    ctx.fillStyle = s.dust ? `rgba(200,180,140,${a.toFixed(3)})` : `rgba(${s.shade},${s.shade},${s.shade},${a.toFixed(3)})`
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  // fireballs — layered additive circles that grow fast / fade slow
  for (const f of fireballs) {
    if (!f.active) continue
    const grow = Math.min(1, f.age / f.grow)
    const fade = f.age <= f.grow ? 1 : Math.max(0, 1 - (f.age - f.grow) / f.fade)
    const r = f.rMax * (0.35 + 0.65 * grow)
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    const layers = [
      [1.00, `rgba(255,${120 + Math.floor(fade * 80)},40,${(0.42 * fade).toFixed(3)})`],   // outer orange
      [0.62, `rgba(255,200,90,${(0.55 * fade).toFixed(3)})`],                               // mid yellow
      [0.30, `rgba(255,255,230,${(0.8 * fade).toFixed(3)})`],                               // white-hot core
    ]
    for (const [k, col] of layers) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(f.x, f.y, r * k, 0, Math.PI * 2); ctx.fill() }
    ctx.restore()
  }
  // debris — small warm chunks/embers
  for (const d of debris) {
    if (!d.active) continue
    const env = Math.min(1, d.life / d.maxLife * 1.5)
    ctx.save()
    ctx.fillStyle = `rgba(${d.r},${d.g},${d.b},${(0.9 * env).toFixed(3)})`
    ctx.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size)
    ctx.restore()
  }
  // anticipation swell — pulsing red ring (2-3 pulses) that grows 1.0→1.12
  for (const s of swells) {
    if (!s.active) continue
    const t = s.age / s.maxAge
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 2.5)     // ~2.5 pulses
    const baseR = (s.tier === "ultimate" ? 66 : 42)
    const r = baseR * (1.0 + 0.12 * t)                            // 1.0 → 1.12
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    ctx.strokeStyle = `rgba(255,60,50,${(0.5 * pulse * (1 - t * 0.3)).toFixed(3)})`
    ctx.lineWidth = 3 + 2 * pulse
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  }
}

// Clear every pool (round / match reset).
export function resetJuiceFx() {
  for (const p of debris) p.active = false
  for (const p of smoke) p.active = false
  for (const p of fireballs) p.active = false
  for (const p of shocks) p.active = false
  for (const p of swells) p.active = false
}

// Diagnostics for the harness.
export function juiceFxStatus() {
  const count = (pool) => pool.reduce((n, p) => n + (p.active ? 1 : 0), 0)
  return {
    debris: count(debris), smoke: count(smoke), fireballs: count(fireballs),
    shocks: count(shocks), swells: count(swells),
    particles: liveParticles(), cap: JUICE_PARTICLE_CAP,
  }
}

export default { fireJuiceExplosion, fireJuiceAnticipation, updateJuiceFx, drawJuiceFxWorld, resetJuiceFx, juiceFxStatus }
