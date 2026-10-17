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

// one jaw of a monstrous maw (Yuta's Rika) — a dark curved jaw lined with triangular teeth + a cursed rim glow.
// dir = -1 upper jaw (teeth point down), +1 lower jaw (teeth point up).
function _jaw(c, cx, y, w, h, dir, rim) {
  c.save()
  c.beginPath()
  c.moveTo(cx - w / 2, y); c.quadraticCurveTo(cx, y + dir * h, cx + w / 2, y)
  c.lineTo(cx + w / 2, y - dir * h * 1.6); c.lineTo(cx - w / 2, y - dir * h * 1.6); c.closePath()
  c.fillStyle = "rgba(12,2,18,0.96)"; c.fill()
  const n = 9; c.fillStyle = "rgba(236,226,236,0.92)"
  for (let i = 0; i < n; i++) {
    const tx = cx - w / 2 + (i + 0.5) / n * w, tipy = y + dir * h * 0.5 * (0.6 + 0.4 * Math.sin(i * 1.3))
    c.beginPath(); c.moveTo(tx - w / n * 0.42, y); c.lineTo(tx + w / n * 0.42, y); c.lineTo(tx, tipy); c.closePath(); c.fill()
  }
  c.strokeStyle = rim; c.lineWidth = 3; c.globalAlpha = 0.6
  c.beginPath(); c.moveTo(cx - w / 2, y); c.quadraticCurveTo(cx, y + dir * h, cx + w / 2, y); c.stroke()
  c.restore()
}

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
  const ad = victim.animationData || {}
  const def = ad[base] || ad.hurt || ad.idle || { width: 128, height: 128, frames: 1 }
  // Load the EXACT sheet the sim slices for this action (def.sheet) so frame dims match; fall back to the
  // manifest-convention sheet for chars whose animationData carries no explicit `sheet` path (e.g. gojo).
  let img = null
  try {
    if (def.sheet) { img = new Image(); img.src = def.sheet }
    else { const sheets = getSpriteSheets(vKey) || {}; img = sheets[base] || sheets.hurt || sheets.idle || null }
  } catch (_) {}
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
    const frames = Math.max(1, def.frames || 1)
    const ok = S.img && S.img.complete && S.img.naturalWidth > 0
    const sw = ok ? S.img.naturalWidth / frames : (def.width || 128)   // per-frame width from the real sheet
    const sh = ok ? S.img.naturalHeight : (def.height || 128)
    const frame = beat.frame || 0, sx = frame * sw, sy = 0
    const grow = (beat.from ?? 0.8) + ((beat.to ?? 1.1) - (beat.from ?? 0.8)) * ease(p)
    const scale = (H * 0.55) / sh * grow
    const dw = sw * scale, dh = sh * scale
    let cx = W * 0.5, cy = H * (beat.anchor ?? 0.54)
    if (beat.tremble) cx += Math.sin(f * 1.7) * beat.tremble * (0.4 + 0.6 * p)
    const dx = cx - dw / 2, dy = cy - dh / 2
    c.imageSmoothingEnabled = false
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

  // ── PHASE 2 — CURSED ENERGY (JJK) ────────────────────────────────────────────────────────────────

  // SUKUNA — Malevolent Shrine: a skeletal Buddhist-shrine silhouette (skull + ribs) looming in blood-dark space
  shrineBg(c, W, H, p, beat, S, f) {
    const a = ease(Math.min(1, (f - beat.t0) / 18))
    c.save(); c.globalAlpha = a
    const g = c.createRadialGradient(W / 2, H * 0.5, H * 0.1, W / 2, H * 0.5, H * 0.95)
    g.addColorStop(0, "rgba(96,8,16,0.55)"); g.addColorStop(1, "rgba(8,0,2,0.95)")
    c.fillStyle = g; c.fillRect(0, 0, W, H)
    const cx = W / 2, cy = H * 0.4
    c.fillStyle = "rgba(220,205,195,0.13)"; c.beginPath(); c.arc(cx, cy, H * 0.14, 0, 7); c.fill()   // skull
    c.fillStyle = "rgba(8,0,2,0.6)"; c.beginPath(); c.arc(cx - H * 0.05, cy - H * 0.015, H * 0.03, 0, 7); c.arc(cx + H * 0.05, cy - H * 0.015, H * 0.03, 0, 7); c.fill()
    c.strokeStyle = "rgba(230,210,200,0.2)"; c.lineWidth = 3
    for (let i = 0; i < 5; i++) { c.globalAlpha = a * 0.2; c.beginPath(); c.ellipse(cx, cy + H * 0.16 + i * H * 0.07, H * (0.2 + i * 0.04), H * 0.05, 0, Math.PI * 0.1, Math.PI * 0.9); c.stroke() }
    c.restore()
  },

  // a flurry of slash lines flashing across the victim (Dismantle / Cleave)
  slashCross(c, W, H, p, beat, S, f) {
    const r = S.rect; const cx = r ? r.x + r.w / 2 : W / 2, cy = r ? r.y + r.h / 2 : H / 2
    const rw = r ? r.w : W * 0.2, rh = r ? r.h : H * 0.3, reach = rw * 1.5
    const n = beat.count || 12
    for (let i = 0; i < n; i++) {
      const birth = (i / n) * (beat.t1 - beat.t0) * 0.8, age = (f - beat.t0) - birth
      if (age < 0 || age > 7) continue
      const aa = 1 - age / 7, ang = (hash(i, 7) % 360) * Math.PI / 180
      const ox = Math.cos(ang) * reach, oy = Math.sin(ang) * reach
      const jx = cx + (rnd(i, 1) - 0.5) * rw * 0.8, jy = cy + (rnd(i, 2) - 0.5) * rh * 0.8
      c.strokeStyle = beat.color || "#ff2b36"; c.globalAlpha = aa; c.lineWidth = 2.5 * aa + 1
      c.beginPath(); c.moveTo(jx - ox, jy - oy); c.lineTo(jx + ox, jy + oy); c.stroke(); c.globalAlpha = 1
    }
  },

  // the victim sprite DICED into a grid of tiles that fly apart + drop (the Dismantle payoff). Reuses S.img/rect.
  shatter(c, W, H, p, beat, S) {
    const r = S.rect; if (!r) return
    const img = S.img, def = S.def || { width: 128, height: 128 }
    const okImg = img && img.complete && img.naturalWidth > 0
    const frames = Math.max(1, def.frames || 1)
    const fw = okImg ? img.naturalWidth / frames : (def.width || 128), fh = okImg ? img.naturalHeight : (def.height || 128)
    const cols = beat.cols || 5, rows = beat.rows || 7
    const sw = fw / cols, sh = fh / rows, dw = r.w / cols, dh = r.h / rows
    const e = ease(p), spread = (beat.spread || 1) * r.w * 0.6
    c.save(); c.imageSmoothingEnabled = false
    for (let cxi = 0; cxi < cols; cxi++) for (let ry = 0; ry < rows; ry++) {
      const idx = cxi * rows + ry
      const dirx = ((cxi + 0.5) / cols - 0.5) * 2 + (rnd(idx, 1) - 0.5) * 0.6
      const diry = ((ry + 0.5) / rows - 0.5) * 2 + (rnd(idx, 2) - 0.5) * 0.6
      const px = r.x + cxi * dw + dirx * spread * e
      const py = r.y + ry * dh + diry * spread * e + e * e * 44   // gravity drop
      c.save(); c.globalAlpha = Math.max(0, 1 - e * 0.5)
      c.translate(px + dw / 2, py + dh / 2); c.rotate((rnd(idx, 3) - 0.5) * e * 1.2)
      if (okImg) { try { c.drawImage(img, cxi * sw, ry * sh, sw, sh, -dw / 2, -dh / 2, dw, dh) } catch (_) {} }
      else { c.fillStyle = "rgba(40,40,48,0.9)"; c.fillRect(-dw / 2, -dh / 2, dw, dh) }
      c.restore()
      if (e > 0.1 && idx % 2) { c.fillStyle = `rgba(150,10,16,${((1 - e) * 0.8).toFixed(3)})`; c.beginPath(); c.arc(px + dw / 2, py + dh / 2, 2, 0, 7); c.fill() }
    }
    c.restore()
  },

  // ALT SUKUNA — a flame arrow lances in from off-screen toward the victim
  flameBeam(c, W, H, p, beat, S) {
    const r = S.rect; const tx = r ? r.x + r.w * 0.5 : W / 2, ty = r ? r.y + r.h * 0.45 : H / 2
    const e = ease(p), x0 = 0, y0 = ty - 40, prog = Math.min(1, e * 1.5), bx = x0 + (tx - x0) * prog
    c.save()
    const g = c.createLinearGradient(x0, y0, bx, ty); g.addColorStop(0, "rgba(255,220,120,0)"); g.addColorStop(1, beat.color || "#ff7a1e")
    c.strokeStyle = g; c.lineWidth = 10 * e + 4; c.globalAlpha = 0.9
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(bx, ty); c.stroke()
    c.fillStyle = "rgba(255,200,80,0.9)"; c.beginPath(); c.arc(bx, ty, 8 * e + 4, 0, 7); c.fill()
    c.restore()
  },

  // ALT SUKUNA — the victim burns away bottom-up to ash + rising embers (Fūga). Overlays the still-drawn sprite.
  incinerate(c, W, H, p, beat, S, f) {
    const r = S.rect; if (!r) return
    const e = ease(p), burnH = r.h * e, ly = r.y + r.h - burnH
    c.save()
    c.fillStyle = "rgba(8,4,2,0.92)"; c.fillRect(r.x, ly, r.w, burnH)
    const g = c.createLinearGradient(0, ly - 14, 0, ly + 6)
    g.addColorStop(0, "rgba(255,180,40,0)"); g.addColorStop(0.6, beat.color || "#ff7a1e"); g.addColorStop(1, "rgba(120,20,0,0.85)")
    c.fillStyle = g; c.fillRect(r.x - 4, ly - 14, r.w + 8, 20)
    for (let i = 0; i < 44; i++) { const bx = r.x + rnd(i, 1) * r.w, prog = ((f * 0.04 + rnd(i, 2)) % 1), by = ly - prog * r.h * 0.75, sz = (1 - prog) * 4 + 1; c.globalAlpha = (1 - prog) * e; c.fillStyle = i % 3 ? "#ffb032" : "#ff5a10"; c.beginPath(); c.arc(bx, by, sz, 0, 7); c.fill() }
    c.globalAlpha = 1; c.restore()
  },

  // YUTA — Rika's monstrous maw descends from top & bottom and SNAPS shut over the victim
  maw(c, W, H, p, beat, S) {
    const r = S.rect; const cx = r ? r.x + r.w / 2 : W / 2, cy = r ? r.y + r.h * 0.45 : H * 0.5
    const e = ease(p), open = 1 - e, col = beat.color || "#b428dc"
    const jawW = (r ? r.w : W * 0.3) * 2.4, jawH = (r ? r.h : H * 0.4) * 0.9, gap = jawH * (0.2 + open * 0.95)
    _jaw(c, cx, cy - gap, jawW, jawH, -1, col)
    _jaw(c, cx, cy + gap, jawW, jawH, 1, col)
    if (e > 0.6) { c.save(); c.globalAlpha = (e - 0.6) / 0.4 * 0.5; c.fillStyle = "rgba(150,10,20,1)"; c.beginPath(); c.ellipse(cx, cy, jawW * 0.3, jawH * 0.2, 0, 0, 7); c.fill(); c.restore() }
  },

  // YUJI — Black Flash: a black star core + red space-distortion cracks at the impact point
  blackFlash(c, W, H, p, beat, S) {
    const r = S.rect; const hx = r ? r.x + r.w * 0.5 : W / 2, hy = r ? r.y + r.h * (beat.headY ?? 0.45) : H / 2
    const e = ease(p), rad = (r ? r.w : W * 0.2) * (0.3 + e * 0.9)
    c.save()
    c.strokeStyle = `rgba(230,30,60,${(1 - e).toFixed(3)})`; c.lineWidth = 5 * (1 - e) + 1
    c.beginPath(); c.arc(hx, hy, rad, 0, 7); c.stroke()
    c.fillStyle = `rgba(4,2,8,${Math.min(1, (1 - e) * 1.4).toFixed(3)})`; c.beginPath()
    const spikes = 8
    for (let i = 0; i < spikes * 2; i++) { const ang = i / (spikes * 2) * Math.PI * 2, rr = i % 2 ? rad * 0.35 : rad * 0.8, x = hx + Math.cos(ang) * rr, y = hy + Math.sin(ang) * rr; i ? c.lineTo(x, y) : c.moveTo(x, y) }
    c.closePath(); c.fill()
    for (let i = 0; i < 10; i++) { const ang = (hash(i, 9) % 360) * Math.PI / 180; c.strokeStyle = `rgba(255,40,70,${((1 - e) * 0.9).toFixed(3)})`; c.lineWidth = 2 * (1 - e) + 0.5; let x = hx, y = hy; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { x += Math.cos(ang) * rad * 0.3 + (rnd(i * 4 + k, 1) - 0.5) * 14; y += Math.sin(ang) * rad * 0.3 + (rnd(i * 4 + k, 2) - 0.5) * 14; c.lineTo(x, y) } c.stroke() }
    c.globalAlpha = 1; c.restore()
  },

  // ── Batch 2B "The Sorcerer-Killers" ──────────────────────────────────────────────────────────────

  // TOJI — the Inverted Spear of Heaven thrusts clean through the victim (cold steel, no cursed energy, just blood)
  impale(c, W, H, p, beat, S) {
    const r = S.rect; const hy = r ? r.y + r.h * (beat.headY ?? 0.42) : H / 2, cx = r ? r.x + r.w / 2 : W / 2
    const halfLen = (r ? r.w : W * 0.2) * 1.6, e = ease(p)
    const x0 = cx - halfLen, x1 = cx - halfLen + halfLen * 2 * Math.min(1, e * 1.3)
    c.save()
    c.strokeStyle = beat.color || "#cfd8e6"; c.lineWidth = 6; c.globalAlpha = 0.95
    c.beginPath(); c.moveTo(x0, hy); c.lineTo(x1, hy); c.stroke()
    c.fillStyle = "#e8eef7"; c.beginPath(); c.moveTo(x1 + 12, hy); c.lineTo(x1 - 4, hy - 7); c.lineTo(x1 - 4, hy + 7); c.closePath(); c.fill()
    if (e > 0.3) { c.fillStyle = `rgba(150,10,16,${Math.min(1, (e - 0.3) * 2).toFixed(3)})`; for (let i = 0; i < 12; i++) { const a = rnd(i, 1) * Math.PI * 2, d = rnd(i, 2) * 22 * e; c.beginPath(); c.arc(cx + Math.cos(a) * d, hy + Math.sin(a) * d, 2, 0, 7); c.fill() } }
    c.restore()
  },

  // MAKI — Split Soul Katana: the cut severs body AND soul. The sprite bisects vertically + a white soul-flash.
  soulSplit(c, W, H, p, beat, S) {
    const r = S.rect; if (!r) return
    const img = S.img, def = S.def || {}, okImg = img && img.complete && img.naturalWidth > 0
    const frames = Math.max(1, def.frames || 1), fw = okImg ? img.naturalWidth / frames : (def.width || 128), fh = okImg ? img.naturalHeight : (def.height || 128)
    const e = ease(p), gap = r.w * 0.5 * e
    c.save(); c.imageSmoothingEnabled = false
    c.save(); c.globalAlpha = Math.max(0, 1 - e * 0.4); c.translate(-gap - e * e * 10, e * e * 30); c.rotate(-e * 0.15)
    if (okImg) { try { c.drawImage(img, 0, 0, fw / 2, fh, r.x, r.y, r.w / 2, r.h) } catch (_) {} } else { c.fillStyle = "rgba(40,40,48,0.9)"; c.fillRect(r.x, r.y, r.w / 2, r.h) }
    c.restore()
    c.save(); c.globalAlpha = Math.max(0, 1 - e * 0.4); c.translate(gap + e * e * 10, e * e * 30); c.rotate(e * 0.15)
    if (okImg) { try { c.drawImage(img, fw / 2, 0, fw / 2, fh, r.x + r.w / 2, r.y, r.w / 2, r.h) } catch (_) {} } else { c.fillStyle = "rgba(40,40,48,0.9)"; c.fillRect(r.x + r.w / 2, r.y, r.w / 2, r.h) }
    c.restore()
    const seamX = r.x + r.w / 2
    c.strokeStyle = `rgba(240,245,255,${(1 - e).toFixed(3)})`; c.lineWidth = 4 * (1 - e) + 1; c.beginPath(); c.moveTo(seamX, r.y - 10); c.lineTo(seamX, r.y + r.h + 10); c.stroke()
    c.globalAlpha = Math.max(0, 0.7 - e * 0.7); c.fillStyle = "rgba(200,230,255,0.85)"; c.beginPath(); c.arc(seamX, r.y + r.h * 0.3 - e * 40, 8 * (1 - e) + 3, 0, 7); c.fill(); c.globalAlpha = 1
    for (let i = 0; i < 14; i++) { if (e < 0.1) break; const yy = r.y + rnd(i, 1) * r.h; c.fillStyle = `rgba(150,10,16,${((1 - e) * 0.9).toFixed(3)})`; c.beginPath(); c.arc(seamX + (rnd(i, 2) - 0.5) * 20 * e, yy, 2, 0, 7); c.fill() }
    c.restore()
  },

  // NAOYA — Projection Sorcery (24 frames/sec): after-image copies blur past + rapid cuts + a filmstrip-tick motif
  frameFlicker(c, W, H, p, beat, S, f) {
    const r = S.rect; if (!r) return
    const img = S.img, def = S.def || {}, okImg = img && img.complete && img.naturalWidth > 0
    const frames = Math.max(1, def.frames || 1), fw = okImg ? img.naturalWidth / frames : (def.width || 128), fh = okImg ? img.naturalHeight : (def.height || 128)
    const e = ease(p)
    c.save(); c.imageSmoothingEnabled = false
    for (let i = 0; i < 5; i++) { const ph = f * 0.3 + i * 1.3, ox = Math.sin(ph) * r.w * 0.5 * e + (rnd(i, f >> 1) - 0.5) * 20, oy = (rnd(i + 3, f >> 1) - 0.5) * 14; c.globalAlpha = 0.18; if (okImg) { try { c.drawImage(img, 0, 0, fw, fh, r.x + ox, r.y + oy, r.w, r.h) } catch (_) {} } }
    c.globalAlpha = 1
    for (let i = 0; i < 6; i++) { const age = (f * 2 + i * 5) % 14; if (age < 5) { const aa = 1 - age / 5, yy = r.y + ((hash(i, f >> 2) % 100) / 100) * r.h; c.strokeStyle = `rgba(255,200,80,${aa.toFixed(3)})`; c.lineWidth = 2; c.beginPath(); c.moveTo(r.x - 10, yy); c.lineTo(r.x + r.w + 10, yy + (rnd(i, 1) - 0.5) * 20); c.stroke() } }
    c.fillStyle = beat.color || "#ffbe3c"; c.globalAlpha = 0.5; const off = (f * 3) % 24
    for (let x = -24 + off; x < W; x += 24) { c.fillRect(x, r.y - 18, 14, 6); c.fillRect(x, r.y + r.h + 12, 14, 6) }
    c.restore()
  },

  // AOI TODO — Boogie Woogie: claps swap positions in a disorienting blink, then a colossal strike lands
  boogie(c, W, H, p, beat, S, f) {
    const r = S.rect; if (!r) return
    const img = S.img, def = S.def || {}, okImg = img && img.complete && img.naturalWidth > 0
    const frames = Math.max(1, def.frames || 1), fw = okImg ? img.naturalWidth / frames : (def.width || 128), fh = okImg ? img.naturalHeight : (def.height || 128)
    const e = ease(p)
    c.save(); c.imageSmoothingEnabled = false
    const slot = Math.floor(f / 8) % 3, offs = [[-r.w * 0.9, 10], [r.w * 0.9, -6], [0, 0]]
    for (let i = 0; i < 3; i++) { if (i === slot) continue; const [ox, oy] = offs[i]; c.globalAlpha = 0.25 * (1 - e * 0.5); if (okImg) { try { c.drawImage(img, 0, 0, fw, fh, r.x + ox * (1 - e), r.y + oy, r.w, r.h) } catch (_) {} } }
    c.globalAlpha = 1
    const cx = r.x + r.w / 2, cy = r.y + r.h * 0.45
    for (let i = 0; i < 3; i++) { const rp = (f * 0.05 + i * 0.33) % 1; c.strokeStyle = `rgba(90,200,255,${((1 - rp) * 0.6).toFixed(3)})`; c.lineWidth = 3 * (1 - rp) + 1; c.beginPath(); c.arc(cx, cy, rp * r.w * 1.4, 0, 7); c.stroke() }
    c.restore()
  },
}

export default { activateBrutalityCinematic, isBrutalityCinematicActive, updateBrutalityCinematic, brutalityCinematicDone, drawBrutalityCinematic, clearBrutalityCinematic, brutalityCinematicStatus }
