// weather.js — FEEL PASS (Phase 3): cosmetic WEATHER (render-layer ONLY).
//
// Screen-space overlay system drawn OVER the scene but UNDER the HUD: rain / thunderstorm / hail / snow /
// fog / wind / heat-wave / rainbow, plus CLEAR. Particles fall in the viewport; floor effects (splashes,
// snow accumulation, puddle ripples) sit at the ground line. NONE of this touches the simulation — all
// variation comes from a deterministic integer hash of (match seed, particle index, respawn count), never
// gameRng/Date/Math.random, so LAN peers + companion screens render the identical sky. Weather TYPE is
// chosen deterministically / host-authoritatively by the caller (Phases 4-5); this module just renders it.
//
// Readability guard: fog density and overlay darkness are hard-capped, the lightning flash respects Reduce
// Flashing and fires at most once per second, and nothing is drawn in the HUD band (caller draws the HUD
// after this). Intensity ("low"/"full") + the existing Particles setting scale the particle budget.

export const WEATHER = Object.freeze({
  CLEAR: "clear", RAIN: "rain", THUNDERSTORM: "thunderstorm", HAIL: "hail",
  SNOW: "snow", FOG: "fog", WIND: "wind", HEATWAVE: "heatwave", RAINBOW: "rainbow",
})
export const WEATHER_TYPES = Object.freeze(Object.values(WEATHER))

// ── deterministic hash → [0,1) ───────────────────────────────────────────────
let _seed = 0x5eed
export function weatherSetSeed(s) { _seed = (s >>> 0) || 0x5eed }
function h(a, b = 0, c = 0) {
  let x = (_seed ^ (a * 0x9e3779b1) ^ (b * 0x85ebca77) ^ (c * 0xc2b2ae3d)) >>> 0
  x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0
  return x / 4294967296
}

// ── state ────────────────────────────────────────────────────────────────────
let cur = WEATHER.CLEAR      // the weather currently rendering
let target = WEATHER.CLEAR   // the weather we're transitioning toward
let alpha = 0                // global weather opacity 0..1 (dips to 0 at the switch midpoint = crossfade)
let transitioning = false
let frame = 0
let flashTimer = 0           // active screen-flash frames remaining
let flashCd = 0              // ≥1 flash/sec clamp
let thunderAt = -1           // frame to fire the delayed thunder one-shot
let nextStrikeAt = 0         // frame of the next lightning strike (thunderstorm)
let rainbowT = 0             // rainbow fade-in progress
let particles = []           // active particle array (type-specific)
let ripples = []             // floor splash/puddle ripples
let _lastW = 0, _lastH = 0
const TRANSITION = 120       // ~2s crossfade (60fps): 1s out, 1s in
const FLASH_MIN_GAP = 60     // ≥1s between flashes

function _intensityScale(intensity, particleScale) {
  return (intensity === "low" ? 0.45 : 1) * (particleScale != null ? particleScale : 1)
}

// ── particle seeding ─────────────────────────────────────────────────────────
function _seedParticles(type, w, h0, intensity, particleScale) {
  particles = []; ripples = []
  const s = _intensityScale(intensity, particleScale)
  const mk = (n, init) => { for (let i = 0; i < n; i++) particles.push(init(i)) }
  if (type === WEATHER.RAIN || type === WEATHER.THUNDERSTORM) {
    const heavy = type === WEATHER.THUNDERSTORM
    mk(Math.round((heavy ? 260 : 190) * s), i => ({ x: h(i, 1) * (w + 200) - 100, y: h(i, 2) * h0, len: (heavy ? 16 : 12) + h(i, 3) * 10, sp: (heavy ? 17 : 13) + h(i, 4) * 6, r: i }))
  } else if (type === WEATHER.HAIL) {
    mk(Math.round(90 * s), i => ({ x: h(i, 1) * (w + 120) - 60, y: h(i, 2) * h0, sz: 2 + h(i, 3) * 3, sp: 9 + h(i, 4) * 4, vx: (h(i, 5) - 0.5) * 2, r: i, bounce: 0 }))
  } else if (type === WEATHER.SNOW) {
    mk(Math.round(150 * s), i => ({ x: h(i, 1) * w, y: h(i, 2) * h0, sz: 1.5 + h(i, 3) * 3, sp: 0.8 + h(i, 4) * 1.4, drift: 0.6 + h(i, 5) * 1.2, ph: h(i, 6) * 6.28, r: i }))
  } else if (type === WEATHER.WIND) {
    mk(Math.round(34 * s), i => ({ x: h(i, 1) * w, y: h(i, 2) * h0 * 0.9, sz: 3 + h(i, 3) * 5, sp: 4 + h(i, 4) * 5, ph: h(i, 6) * 6.28, leaf: h(i, 7) > 0.4, r: i }))
  }
}

// ── public: set target weather (crossfades) ──────────────────────────────────
export function weatherSet(type, { w = _lastW, h: hh = _lastH, intensity = "full", particleScale = 1 } = {}) {
  if (!WEATHER_TYPES.includes(type)) type = WEATHER.CLEAR
  if (type === target && (alpha > 0 || type === WEATHER.CLEAR)) return
  _lastW = w || _lastW; _lastH = hh || _lastH
  if (cur === WEATHER.CLEAR && !transitioning) { // starting from clear → seed immediately and fade in
    cur = type; target = type; _seedParticles(type, _lastW, _lastH, intensity, particleScale); transitioning = true
  } else {
    target = type; transitioning = true   // fade current out, swap at midpoint, fade target in
  }
  rainbowT = type === WEATHER.RAINBOW ? 0.0001 : 0
  _pendingSeed = { intensity, particleScale }
}
let _pendingSeed = { intensity: "full", particleScale: 1 }

// ── public: advance one frame ─────────────────────────────────────────────────
// opts: { intensity, particleScale, reduceFlashing, sfx (fn(id, gain)) }
export function weatherTick(fr, opts = {}) {
  frame = fr | 0
  const w = _lastW, h0 = _lastH
  const { intensity = "full", reduceFlashing = false, sfx = null } = opts

  // crossfade: 1s fade-out → swap type at midpoint → 1s fade-in
  if (transitioning) {
    if (cur !== target) {
      alpha -= 1 / (TRANSITION / 2)
      if (alpha <= 0) { alpha = 0; cur = target; _seedParticles(cur, w, h0, _pendingSeed.intensity, _pendingSeed.particleScale) }
    } else {
      const goal = cur === WEATHER.CLEAR ? 0 : 1
      alpha += (goal - alpha) * 0.12
      if (Math.abs(alpha - goal) < 0.02) { alpha = goal; transitioning = false }
    }
  }
  if (cur === WEATHER.CLEAR && alpha <= 0.001) { particles = []; ripples = []; return }

  // particle motion
  const wind = (cur === WEATHER.RAIN || cur === WEATHER.THUNDERSTORM) ? 3.0 : cur === WEATHER.WIND ? 7.5 : 0.6
  for (const p of particles) {
    if (cur === WEATHER.RAIN || cur === WEATHER.THUNDERSTORM) {
      p.x += wind; p.y += p.sp
      if (p.y > h0) { if (ripples.length < 60) ripples.push({ x: p.x, y: _groundline(h0), t: 0, r: p.r }); p.y = -10; p.x = h(p.r, 11, (frame / 60) | 0) * (w + 200) - 100 }
    } else if (cur === WEATHER.HAIL) {
      p.x += p.vx; p.y += p.sp
      if (p.y > _groundline(h0)) { if (p.bounce < 1 && sfx) sfx("hail_clack_STANDIN", 0.18); p.bounce++; p.sp = -p.sp * 0.4; p.y = _groundline(h0) - 1; if (Math.abs(p.sp) < 1.2) { p.y = -8; p.x = h(p.r, 11, (frame / 45) | 0) * (w + 120) - 60; p.sp = 9 + h(p.r, 4) * 4; p.bounce = 0 } }
    } else if (cur === WEATHER.SNOW) {
      p.y += p.sp; p.x += Math.sin((frame + p.ph * 20) * 0.02) * p.drift * 0.6 + 0.3
      if (p.y > h0) { p.y = -4; p.x = h(p.r, 11, (frame / 80) | 0) * w }
    } else if (cur === WEATHER.WIND) {
      p.x += p.sp + Math.sin((frame + p.ph * 15) * 0.05) * 1.5; p.y += Math.sin((frame + p.ph * 20) * 0.08) * 0.8
      if (p.x > w + 20) { p.x = -20; p.y = h(p.r, 11, (frame / 70) | 0) * h0 * 0.9 }
    }
  }
  for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].t++; if (ripples[i].t > 16) ripples.splice(i, 1) }

  // thunderstorm lightning: schedule strikes, fire a clamped flash + delayed thunder
  if (cur === WEATHER.THUNDERSTORM && alpha > 0.5) {
    if (frame >= nextStrikeAt) {
      nextStrikeAt = frame + 150 + Math.floor(h(frame, 7) * 260)   // every ~2.5-7s
      if (flashCd <= 0) {
        if (!reduceFlashing) { flashTimer = 6; flashCd = FLASH_MIN_GAP }
        else { flashTimer = 2; flashCd = FLASH_MIN_GAP }   // soft dim instead of a hard white flash
        thunderAt = frame + 18 + Math.floor(h(frame, 8) * 54)      // 0.3-1.2s later
      }
    }
  }
  if (flashTimer > 0) flashTimer--
  if (flashCd > 0) flashCd--
  if (thunderAt >= 0 && frame >= thunderAt) { if (sfx) sfx("thunder_STANDIN", 0.6); thunderAt = -1 }
  if (cur === WEATHER.RAINBOW && rainbowT > 0 && rainbowT < 1) rainbowT = Math.min(1, rainbowT + 0.004)
}

function _groundline(h0) { return h0 * 0.86 }   // approximate floor band in screen space (caller may override via groundY)

// ── public: draw (screen space, OVER the scene, UNDER the HUD) ─────────────────
// opts: { groundY (screen y of the floor), intensity, reduceFlashing }
export function weatherDraw(ctx, canvas, opts = {}) {
  const w = canvas.width, h0 = canvas.height
  _lastW = w; _lastH = h0
  if (cur === WEATHER.CLEAR && alpha <= 0.001) return
  const gy = opts.groundY != null ? opts.groundY : _groundline(h0)
  const A = alpha
  ctx.save()

  if (cur === WEATHER.RAIN || cur === WEATHER.THUNDERSTORM) {
    ctx.globalAlpha = A * 0.5; ctx.strokeStyle = cur === WEATHER.THUNDERSTORM ? "rgba(174,196,228,0.9)" : "rgba(170,190,220,0.8)"; ctx.lineWidth = cur === WEATHER.THUNDERSTORM ? 1.6 : 1.1
    const slant = cur === WEATHER.THUNDERSTORM ? 0.28 : 0.22
    ctx.beginPath(); for (const p of particles) { ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.len * slant, p.y + p.len) } ctx.stroke()
    ctx.globalAlpha = A * 0.4; ctx.strokeStyle = "rgba(190,210,235,0.7)"
    for (const r of ripples) { const rr = 2 + r.t * 1.4; ctx.globalAlpha = A * 0.4 * (1 - r.t / 16); ctx.beginPath(); ctx.ellipse(r.x, gy, rr, rr * 0.35, 0, 0, 6.28); ctx.stroke() }
    ctx.globalAlpha = A * 0.10; ctx.fillStyle = "#1a2636"; ctx.fillRect(0, 0, w, h0)   // light cool wash (capped)
  } else if (cur === WEATHER.HAIL) {
    ctx.globalAlpha = A * 0.85; ctx.fillStyle = "rgba(226,240,255,0.95)"
    for (const p of particles) { ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, 6.28); ctx.fill() }
  } else if (cur === WEATHER.SNOW) {
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    for (const p of particles) { ctx.globalAlpha = A * 0.9; ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, 6.28); ctx.fill() }
    ctx.globalAlpha = A * 0.5; ctx.fillStyle = "rgba(245,250,255,0.6)"; ctx.fillRect(0, gy, w, Math.min(10, h0 - gy))   // thin accumulation strip
  } else if (cur === WEATHER.WIND) {
    for (const p of particles) { ctx.globalAlpha = A * 0.8; ctx.fillStyle = p.leaf ? "rgba(150,110,50,0.85)" : "rgba(150,140,120,0.5)"
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate((frame + p.ph * 30) * 0.1); ctx.fillRect(-p.sz / 2, -p.sz / 3, p.sz, p.sz * 0.6); ctx.restore() }
  } else if (cur === WEATHER.FOG) {
    const cap = (opts.intensity === "low" ? 0.18 : 0.30) * A   // HARD-capped so fighters stay readable
    for (let L = 0; L < 3; L++) { const off = (frame * (0.2 + L * 0.15)) % (w + 400) - 200
      const g = ctx.createLinearGradient(0, h0 * (0.3 + L * 0.2), 0, h0); g.addColorStop(0, `rgba(200,206,216,0)`); g.addColorStop(1, `rgba(200,206,216,${cap / 3})`)
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h0)
      ctx.globalAlpha = cap * 0.5; ctx.fillStyle = "rgba(210,214,222,0.5)"; ctx.beginPath(); ctx.ellipse((off + L * 300) % w, h0 * (0.55 + L * 0.12), 320, 70, 0, 0, 6.28); ctx.fill() }
  } else if (cur === WEATHER.HEATWAVE) {
    ctx.globalAlpha = A * 0.12; ctx.fillStyle = "rgba(255,190,120,1)"; ctx.fillRect(0, 0, w, h0)   // warm tint
    ctx.globalAlpha = A * 0.10; ctx.strokeStyle = "rgba(255,235,200,0.8)"; ctx.lineWidth = 2   // cheap shimmer bands near the ground
    for (let i = 0; i < 6; i++) { const yy = gy - i * 18 - 6; ctx.beginPath(); for (let xx = 0; xx <= w; xx += 16) ctx.lineTo(xx, yy + Math.sin((xx + frame * 2 + i * 40) * 0.05) * 3); ctx.stroke() }
  } else if (cur === WEATHER.RAINBOW) {
    ctx.globalAlpha = A * 0.5 * rainbowT
    const cols = ["#ff5a5a", "#ffb04a", "#ffe24a", "#4ade80", "#4aa8e0", "#8b5cf6"]
    ctx.lineWidth = 10
    for (let i = 0; i < cols.length; i++) { ctx.strokeStyle = cols[i]; ctx.beginPath(); ctx.arc(w * 0.5, gy + 120, w * 0.42 - i * 11, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke() }
  }

  // thunderstorm screen flash (clamped; soft under Reduce Flashing)
  if (flashTimer > 0) { ctx.globalAlpha = (opts.reduceFlashing ? 0.12 : 0.5) * (flashTimer / 6); ctx.fillStyle = "#eef4ff"; ctx.fillRect(0, 0, w, h0) }
  ctx.restore()
}

// ── public: control / status ─────────────────────────────────────────────────
// ── STAGE COMPATIBILITY — ONE data table ──────────────────────────────────────
// Per-stage allowed weather (keyed by stage NAME; CLEAR is ALWAYS allowed and omitted here). Indoor/
// roofed stages allow no precipitation; warm/alien stages omit snow/hail; only outdoor stages that get
// rain also get a rainbow. A disallowed type falls back to the nearest allowed one (see resolveWeather).
const OUTDOOR_FULL = [WEATHER.RAIN, WEATHER.THUNDERSTORM, WEATHER.HAIL, WEATHER.SNOW, WEATHER.FOG, WEATHER.WIND, WEATHER.HEATWAVE, WEATHER.RAINBOW]
const OUTDOOR_WARM = [WEATHER.RAIN, WEATHER.THUNDERSTORM, WEATHER.FOG, WEATHER.WIND, WEATHER.HEATWAVE, WEATHER.RAINBOW]   // no snow/hail
const OUTDOOR_COLD = [WEATHER.RAIN, WEATHER.THUNDERSTORM, WEATHER.HAIL, WEATHER.SNOW, WEATHER.FOG, WEATHER.WIND, WEATHER.RAINBOW]
const INDOOR_ONLY  = [WEATHER.FOG, WEATHER.HEATWAVE]   // roofed: only ambient mist / heat haze
const VOID_ONLY    = [WEATHER.FOG]                     // cosmic void: drifting mist only
export const STAGE_WEATHER = Object.freeze({
  "Jujutsu High Courtyard": OUTDOOR_FULL,
  "Shibuya Incident":       OUTDOOR_COLD,
  "Hidden Leaf Village":    OUTDOOR_FULL,
  "Valley of the End":      OUTDOOR_FULL,
  "Planet Namek":           OUTDOOR_WARM,   // alien + warm → no snow/hail
  "World Tournament Arena": INDOOR_ONLY,    // roofed arena
  "Mugen Train":            [WEATHER.RAIN, WEATHER.THUNDERSTORM, WEATHER.FOG, WEATHER.WIND],   // speeding train — rain/wind/fog, no accumulation
  "Citadel of Ricks":       INDOOR_ONLY,
  "Null Void":              VOID_ONLY,
  "Soul Society":           OUTDOOR_COLD,
  "Gotham Rooftops":        OUTDOOR_COLD,
  "Woodsboro":              [WEATHER.RAIN, WEATHER.THUNDERSTORM, WEATHER.FOG, WEATHER.WIND, WEATHER.RAINBOW],
  "Heaven's Arena":         INDOOR_ONLY,
  "Viltrumite Warzone":     OUTDOOR_WARM,   // wasteland → heat/wind/dust, no snow
  "Command Center":         INDOOR_ONLY,
  "PK Academy":             OUTDOOR_FULL,
  "Analysis Nexus":         INDOOR_ONLY,
  "Shadow Garden":          [WEATHER.FOG, WEATHER.RAIN, WEATHER.WIND, WEATHER.THUNDERSTORM],
  "Test Map":               OUTDOOR_FULL,
  "Battle Royale Colosseum": OUTDOOR_FULL,
})
// nearest-allowed fallback chain for a disallowed type
const FALLBACK = {
  [WEATHER.THUNDERSTORM]: [WEATHER.RAIN, WEATHER.WIND, WEATHER.FOG],
  [WEATHER.RAIN]:         [WEATHER.FOG, WEATHER.WIND],
  [WEATHER.HAIL]:         [WEATHER.SNOW, WEATHER.RAIN, WEATHER.FOG],
  [WEATHER.SNOW]:         [WEATHER.RAIN, WEATHER.FOG],
  [WEATHER.RAINBOW]:      [WEATHER.FOG],
  [WEATHER.WIND]:         [WEATHER.FOG],
  [WEATHER.HEATWAVE]:     [WEATHER.FOG],
  [WEATHER.FOG]:          [WEATHER.WIND],
}
export function allowedWeatherFor(stage) {
  const name = (stage && (stage.name || stage)) || ""
  return STAGE_WEATHER[name] || OUTDOOR_FULL   // unknown stage → treat as open outdoor
}
// Resolve a requested type to one the stage allows (the nearest allowed, else CLEAR).
export function resolveWeather(stage, type) {
  if (type === WEATHER.CLEAR || !type) return WEATHER.CLEAR
  const allowed = allowedWeatherFor(stage)
  if (allowed.includes(type)) return type
  for (const alt of (FALLBACK[type] || [])) if (allowed.includes(alt)) return alt
  return WEATHER.CLEAR
}
// Deterministic per-match pick from a stage's allowed list (Phase-3 default when Weather is ON; Phase 4's
// Weather Source will override this). Returns CLEAR if the stage allows nothing (shouldn't happen).
export function weatherPickForStage(stage, seed) {
  const allowed = allowedWeatherFor(stage)
  if (!allowed.length) return WEATHER.CLEAR
  const s = (seed >>> 0) || 1
  return allowed[s % allowed.length]
}

export function weatherCurrent() { return cur }
export function weatherTarget() { return target }
export function weatherStatus() { return { cur, target, alpha: +alpha.toFixed(3), transitioning, particles: particles.length, ripples: ripples.length, flash: flashTimer, rainbowT: +rainbowT.toFixed(3) } }
export function weatherCycle(opts) { const i = WEATHER_TYPES.indexOf(target); weatherSet(WEATHER_TYPES[(i + 1) % WEATHER_TYPES.length], opts); return target }
export function weatherReset() { cur = target = WEATHER.CLEAR; alpha = 0; transitioning = false; particles = []; ripples = []; flashTimer = flashCd = 0; thunderAt = -1; nextStrikeAt = 0; rainbowT = 0 }
