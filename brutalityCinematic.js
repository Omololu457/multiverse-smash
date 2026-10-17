// brutalityCinematic.js
// ─────────────────────────────────────────────────────────────────
// BRUTALITY RENDERER — plays a winner's canon-themed finisher (brutalityConcepts.js) as a self-contained
// FULLSCREEN cutaway over the frozen battle. It never touches the sprite/combat system beyond freezing the two
// fighters in place: it draws its own background + the victim's live HURT/idle sprite frame + a composition of
// reusable FX PRIMITIVES. Deterministic frame timing (a small integer hash stands in for RNG — never gameRng,
// never Math.random — so a replay of the same match reproduces the same finisher). Imports only data + the
// sprite-sheet getter + character frame metadata + sound; no import cycle with game.js.
//
// LIFECYCLE (mirrors batmanDarkKnightCinematic.js so game.js wires it the same way):
//   activateBrutalityCinematic(winner, victim, move) -> bool   (false if the winner has no concept → caller falls back)
//   isBrutalityCinematicActive() -> bool
//   updateBrutalityCinematic({ sound }) -> void                (advance a frame, fire scheduled SFX)
//   brutalityCinematicDone() -> bool                           (true once the beat has fully played)
//   drawBrutalityCinematic(ctx, canvas) -> void                (fullscreen overlay, call AFTER the scene draw)
//   clearBrutalityCinematic() -> void
//   brutalityCinematicStatus() -> { active, t, wKey, done }    (harness/debug)
// ─────────────────────────────────────────────────────────────────
import { BRUTALITY_CONCEPTS } from "./brutalityConcepts.js"
import { getSpriteSheets } from "./spritesheets.js"
import { sound as _sound } from "./sound.js"

let _b = null   // { t, total, concept, winner, victim, wKey, vKey, img, def, rect, done, sounds[] }

// ── deterministic helpers (no Date / no Math.random) ──────────────────────────────────────────────
function hash(a, b) { let h = ((a | 0) * 374761393 + (b | 0) * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h ^ (h >>> 16)) >>> 0 }
function ease(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t) }   // smoothstep
function rnd(a, b) { return (hash(a, b) % 1000) / 1000 }                          // deterministic 0..1

// glyph pools for the dataFlood primitive (Gojo's "infinite information")
// ASCII-safe pools — kanji / rare math symbols "tofu" into empty boxes in the headless monospace font, so we
// lean on a dense Matrix-style 0/1 stream peppered with math ASCII to sell "infinite information pouring in".
const GLYPHS = {
  binary: "01".split(""),
  void:   "0101010101+-*/=<>%xyz0101".split(""),   // 0/1-heavy with sparse math ASCII
  mix:    "01+-*/=<>%#xyz".split(""),
}

export function isBrutalityCinematicActive() { return !!_b && !_b.done }
export function brutalityCinematicDone() { return !!_b && _b.done }
export function brutalityCinematicStatus() { return _b ? { active: !_b.done, t: _b.t, wKey: _b.wKey, done: _b.done } : { active: false } }
export function clearBrutalityCinematic() { _b = null }

export function activateBrutalityCinematic(winner, victim, move) {
  if (_b || !winner || !victim) return false
  const wKey = (winner.rosterKey || winner.id || "").toLowerCase()
  const vKey = (victim.rosterKey || victim.id || "").toLowerCase()
  const concept = BRUTALITY_CONCEPTS[wKey]
  if (!concept) return false                                  // no concept for this winner → caller falls back
  const base = concept.base === "idle" ? "idle" : "hurt"
  let img = null
  try { const sheets = getSpriteSheets(vKey) || {}; img = sheets[base] || sheets.hurt || sheets.idle || null } catch (_) {}
  const ad = victim.animationData || {}
  const def = ad[base] || ad.hurt || ad.idle || { width: 128, height: 128, frames: 1 }
  // freeze both fighters for the cutaway (invuln + long hitstun so nothing moves them; no global cine-freeze needed)
  try {
    victim.vx = 0; victim.vy = 0; victim.invulnTimer = 9999; victim.hitstun = (concept.total || 140); victim.attackCooldown = (concept.total || 140); victim.isCharging = false
    winner.vx = 0; winner.invulnTimer = 9999; winner.attackCooldown = (concept.total || 140)
    if (victim.animationData?.lose) victim._forceAction = "lose"
    if (winner.animationData?.win) winner._forceAction = "win"
  } catch (_) {}
  _b = {
    t: 0, total: concept.total || 140, concept, winner, victim, wKey, vKey, img, def, rect: null, done: false,
    sounds: (concept.sound || []).map(s => ({ ...s, fired: false })),
  }
  return true
}

export function updateBrutalityCinematic(ctx = {}) {
  const s = _b; if (!s) return
  const snd = ctx.sound || _sound
  s.t++
  for (const e of s.sounds) {
    if (!e.fired && s.t >= (e.t || 0)) { e.fired = true; try { snd?.playJuiceSfx?.(e.id, { gain: e.gain, ultBoom: e.ultBoom, duckSec: e.duckSec, delay: e.delay }) } catch (_) {} }
  }
  if (s.t >= s.total) s.done = true
}

export function drawBrutalityCinematic(c, canvas) {
  const s = _b; if (!s || !c || !canvas) return
  const W = canvas.width, H = canvas.height, f = s.t
  c.save()
  for (const beat of s.concept.beats) {
    if (f < beat.t0 || f > beat.t1) continue
    const span = Math.max(1, beat.t1 - beat.t0)
    const p = (f - beat.t0) / span
    const fn = PRIM[beat.fx]
    if (fn) { c.save(); fn(c, W, H, p, beat, s, f); c.restore() }
  }
  c.restore()
}

// ── FX PRIMITIVE LIBRARY ──────────────────────────────────────────────────────────────────────────
// Each primitive: fn(c, W, H, p, beat, S, f). p = 0..1 progress across the beat; S = shared cutaway state
// (S.rect is the on-screen victim-sprite rect, set by the `sprite` primitive so later beats can target the head).
const PRIM = {
  // full-screen white flash, peaks mid-window (domain clap / overload)
  whiteSpike(c, W, H, p) {
    const a = Math.sin(ease(p) * Math.PI)
    c.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; c.fillRect(0, 0, W, H)
  },

  // simple darken fill (generic background for non-void concepts) — establishes over `ramp` frames, then holds
  darken(c, W, H, p, beat, S, f) {
    const a = Math.min(beat.max ?? 0.85, ease(Math.min(1, (f - beat.t0) / (beat.ramp || 14))) * (beat.max ?? 0.85))
    c.fillStyle = `rgba(${beat.rgb || "6,2,4"},${a.toFixed(3)})`; c.fillRect(0, 0, W, H)
  },

  // GOJO's Unlimited Void — reality inverts to a pale, cold-blue infinite space with drifting dark motes.
  // Establishes FAST (~16 frames) then holds fully opaque so it reads as a true cutaway (stage fully hidden).
  voidInvert(c, W, H, p, beat, S, f) {
    const a = ease(Math.min(1, (f - beat.t0) / 16))
    c.fillStyle = `rgba(230,242,250,${a.toFixed(3)})`; c.fillRect(0, 0, W, H)
    // soft cold vignette — kept light so the Void stays bright/overwhelming (Gojo's space, not a dark room)
    const g = c.createRadialGradient(W / 2, H * 0.5, H * 0.28, W / 2, H * 0.5, H * 0.95)
    g.addColorStop(0, "rgba(205,230,248,0)"); g.addColorStop(1, `rgba(120,152,196,${(a * 0.38).toFixed(3)})`)
    c.fillStyle = g; c.fillRect(0, 0, W, H)
    c.globalAlpha = a * 0.6
    for (let i = 0; i < 48; i++) {
      const x = rnd(i, 1) * W
      const y = ((rnd(i, 2) + i * 0.013) % 1) * H
      c.fillStyle = i % 2 ? "#5f86b0" : "#8fb0d6"
      c.beginPath(); c.arc(x, y, (hash(i, 3) % 3) + 1, 0, 7); c.fill()
    }
  },

  // the victim sprite — drawn centered, scaling `from`→`to`, optional tremble; stores S.rect for later beats
  sprite(c, W, H, p, beat, S, f) {
    const def = S.def || { width: 128, height: 128 }
    const sw = def.width || 128, sh = def.height || 128
    const frame = beat.frame || 0, sx = frame * sw, sy = 0
    const grow = (beat.from ?? 0.8) + ((beat.to ?? 1.1) - (beat.from ?? 0.8)) * ease(p)
    const scale = (H * 0.55) / sh * grow
    const dw = sw * scale, dh = sh * scale
    let cx = W * 0.5, cy = H * (beat.anchor ?? 0.54)
    if (beat.tremble) cx += Math.sin(f * 1.7) * beat.tremble * (0.4 + 0.6 * p)
    const dx = cx - dw / 2, dy = cy - dh / 2
    c.imageSmoothingEnabled = false
    const ok = S.img && S.img.complete && S.img.naturalWidth > 0
    if (ok) { try { c.drawImage(S.img, sx, sy, sw, sh, dx, dy, dw, dh) } catch (_) {} }
    else { c.fillStyle = "rgba(20,22,30,0.9)"; c.fillRect(dx, dy, dw, dh) }   // fallback silhouette
    S.rect = { x: dx, y: dy, w: dw, h: dh }
  },

  // streams of glyphs raining down and converging into the victim's skull (information overload)
  dataFlood(c, W, H, p, beat, S, f) {
    const r = S.rect
    const tx = r ? r.x + r.w * 0.5 : W * 0.5
    const ty = r ? r.y + r.h * 0.17 : H * 0.4
    const pool = GLYPHS[beat.glyphs] || GLYPHS.mix
    const streams = 32
    c.save(); c.textAlign = "center"; c.globalAlpha = Math.min(1, (f - beat.t0) / 10)
    c.font = `${Math.floor(H * 0.034)}px monospace`
    for (let i = 0; i < streams; i++) {
      const colX = (i + 0.5) / streams * W
      const phase = f * 0.06 + i * 0.37
      for (let j = 0; j < 13; j++) {
        const yy = (((phase + j * 0.09) % 1) + 1) % 1 * H
        const conv = Math.min(1, yy / H)
        const gx = colX + (tx - colX) * conv * 0.6
        const g = pool[hash(i * 13 + j, f >> 2) % pool.length]
        c.fillStyle = j === 0 ? "#2bd8ff" : (beat.color || "#15284f")   // dark glyphs READ on the pale Void; lead glyph bright
        c.fillText(g, gx, yy)
      }
    }
    c.restore()
    if (r) {   // white-hot overload core building at the skull as the flood peaks
      const gr = c.createRadialGradient(tx, ty, 2, tx, ty, r.w * 0.55)
      gr.addColorStop(0, `rgba(255,255,255,${(p * 0.85).toFixed(3)})`); gr.addColorStop(0.5, `rgba(120,200,255,${(p * 0.4).toFixed(3)})`); gr.addColorStop(1, "rgba(120,200,255,0)")
      c.fillStyle = gr; c.beginPath(); c.arc(tx, ty, r.w * 0.55, 0, 7); c.fill()
    }
  },

  // the head bursts — mask the head region + expanding ring + deterministic gore/void particle spray
  headPop(c, W, H, p, beat, S) {
    const r = S.rect; if (!r) return
    const hx = r.x + r.w * 0.5, hy = r.y + r.h * (beat.headY ?? 0.16)
    // instant white burst-flash at the skull the moment it bursts, fading fast
    if (p < 0.3) { const bf = 1 - p / 0.3; const gg = c.createRadialGradient(hx, hy, 2, hx, hy, r.w * (0.4 + p)); gg.addColorStop(0, `rgba(255,255,255,${bf.toFixed(3)})`); gg.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gg; c.beginPath(); c.arc(hx, hy, r.w * (0.4 + p), 0, 7); c.fill() }
    // the head is GONE — dark cavity + red wound core
    if (p > 0.1) { c.save(); c.fillStyle = "#09070c"; c.beginPath(); c.ellipse(hx, hy, r.w * 0.26, r.h * 0.14, 0, 0, 7); c.fill(); c.fillStyle = `rgba(150,12,20,${Math.min(1, p * 2).toFixed(3)})`; c.beginPath(); c.ellipse(hx, hy + r.h * 0.02, r.w * 0.13, r.h * 0.07, 0, 0, 7); c.fill(); c.restore() }
    // expanding shock ring
    const rad = r.w * 0.12 + p * r.w * 0.75
    c.strokeStyle = `rgba(210,30,40,${(1 - p).toFixed(3)})`; c.lineWidth = 5 * (1 - p) + 1
    c.beginPath(); c.arc(hx, hy, rad, 0, 7); c.stroke()
    // gore + void particle spray (deterministic)
    const N = 34
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2 + i * 0.7
      const sp = rnd(i, 0) * 0.6 + 0.6
      const dist = p * r.w * sp * 1.15
      const px = hx + Math.cos(a) * dist, py = hy + Math.sin(a) * dist - p * 10
      const sz = (1 - p) * 6 + 1.5
      c.fillStyle = i % 3 ? `rgba(160,12,18,${(1 - p).toFixed(3)})` : `rgba(210,230,255,${((1 - p) * 0.85).toFixed(3)})`
      c.beginPath(); c.arc(px, py, sz, 0, 7); c.fill()
    }
  },

  // the technique-name stamp, fading in then out over the hold
  banner(c, W, H, p, beat, S) {
    const fade = Math.min(1, p * 4) * Math.min(1, (1 - p) * 4 + 0.25)
    c.save(); c.textAlign = "center"
    c.font = `800 ${Math.floor(H * 0.11)}px Arial`
    c.fillStyle = `rgba(255,255,255,${(0.75 * fade).toFixed(3)})`; c.fillText(S.concept.banner, W / 2 + 2, H * 0.2 + 2)
    c.fillStyle = `rgba(${S.concept.bannerRgb || "190,240,255"},${(0.98 * fade).toFixed(3)})`; c.fillText(S.concept.banner, W / 2, H * 0.2)
    c.restore()
  },
}

export default { activateBrutalityCinematic, isBrutalityCinematicActive, updateBrutalityCinematic, brutalityCinematicDone, drawBrutalityCinematic, clearBrutalityCinematic, brutalityCinematicStatus }
