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
export function brutalityCinematicStatus() { return _b ? { active: !_b.done, t: _b.t, wKey: _b.wKey, banner: _b.concept?.banner || null, done: _b.done } : { active: false } }
export function clearBrutalityCinematic() { _b = null }

export function activateBrutalityCinematic(winner, victim, move) {
  if (_b || !winner || !victim) return false
  const wKey = (winner.rosterKey || winner.id || "").toLowerCase()
  const vKey = (victim.rosterKey || victim.id || "").toLowerCase()
  // GHOSTFACE Killer Swap: a kill landed while swapped into Enforcer/Assassin still plays a GHOSTFACE
  // brutality (the borrowed Zaraki/Chrollo identity doesn't hijack the finisher). Resolve against ghostface.
  const gfForm = (winner._gfSwapActive && winner._killerForm) ? (winner._killerTint || true) : null
  const effKey = gfForm ? "ghostface" : wKey
  let concept = BRUTALITY_CONCEPTS[effKey]
  if (!concept) return false                                  // no concept for this winner → caller falls back
  // VILGAX — three bespoke brutalities picked by the killing-blow move: eye-laser ult → CHIMERIAN ONSLAUGHT,
  // big-energy kill (Dagon/Meteor/Seismic/drone) → TEN WORLDS FALL, else (sword normals/specials, default) →
  // CONQUEROR'S EDGE. `move` comes from winF._killingBlowMove (passed by the game.js trigger).
  if (wKey === "vilgax") {
    const m = String(move || "").toLowerCase()
    if (/ult|koma|chimerian|onslaught|eye|laser|beam/.test(m)) concept = BRUTALITY_CONCEPTS.vilgax                 // ultimate → eye lasers
    else if (/dagon|meteor|seismic|slam|drone|bolt/.test(m)) concept = BRUTALITY_CONCEPTS.vilgax_fall || concept   // big-energy → orbital
    else concept = BRUTALITY_CONCEPTS.vilgax_edge || concept   // sword (normals / crescents / thrown sword / slash / cyclone, default) → bisection
  }
  // GHOSTFACE — four brutalities by killing move: gut specials → THE SEQUEL, ult/Backstage → OUTNUMBERED,
  // knife normals → FOURTH WALL (the base concept), anything else / timeout → LIGHTS OUT. A kill scored in a
  // Killer form (gfForm) plays OUTNUMBERED — the "second killer" finisher.
  if (effKey === "ghostface") {
    const m = String(move || "").toLowerCase()
    if (gfForm)                                                       concept = BRUTALITY_CONCEPTS.ghostface_outnumbered || concept
    else if (/lunge|gflow|lowcut|gut/.test(m))                        concept = BRUTALITY_CONCEPTS.ghostface_sequel || concept
    else if (/ult|final|gfult|backstage|\bbp\b|ambush|swap/.test(m)) concept = BRUTALITY_CONCEPTS.ghostface_outnumbered || concept
    else if (/light|heavy|combo|slash|stab|jab|^up$|air|down/.test(m)) concept = BRUTALITY_CONCEPTS.ghostface   // knife normals → Fourth Wall
    else                                                             concept = BRUTALITY_CONCEPTS.ghostface_lightsout || concept
  }
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
    // ── choreographed (two-actor) extras — both fighters' sprites + an eased internal camera ──
    atk: { key: wKey, ad: winner.animationData || {}, cache: new Map() },   // attacker (winner) — flickers/strikes
    vic: { key: vKey, ad: victim.animationData || {}, cache: new Map() },    // victim (loser) — reacts/bleeds
    cam: { zoom: 1, cx: 0.5, cy: 0.5, tzoom: 1, tcx: 0.5, tcy: 0.5 },
    W: 0, H: 0,
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
  // choreographed concepts: ease the internal camera toward the latest active `cam` beat's framing
  if (s.concept.choreographed) {
    let cb = null
    for (const b of s.concept.beats) if (b.fx === "cam" && s.t >= b.t0 && s.t <= b.t1) cb = b
    if (cb) {
      s.cam.tzoom = cb.zoom ?? 1; s.cam.tcx = cb.cx ?? 0.5; s.cam.tcy = cb.cy ?? 0.5
      // hard CUT (MK-style) — snap to the new framing the instant this shot begins, instead of easing in
      if (cb.cut && s.t === cb.t0) { s.cam.zoom = s.cam.tzoom; s.cam.cx = s.cam.tcx; s.cam.cy = s.cam.tcy }
    }
    const k = cb && cb.ease ? cb.ease : 0.16
    s.cam.zoom += (s.cam.tzoom - s.cam.zoom) * k
    s.cam.cx += (s.cam.tcx - s.cam.cx) * k
    s.cam.cy += (s.cam.tcy - s.cam.cy) * k
  }
  if (s.t >= s.total) s.done = true
}

// which render pass each primitive belongs to in a choreographed cutaway (world = inside the camera transform)
const PASS_BG = new Set(["darken", "voidInvert", "shrineBg", "tsukuyomiBg"])
const PASS_OVERLAY = new Set(["whiteSpike", "banner", "speedLines", "dataFlood", "letterbox"])
// everything else (actor/flickerIn/flickerRush/swordSlash/bloodGush/headPop/slashCross/...) draws in world space
function _passOf(fx) { return PASS_BG.has(fx) ? 0 : PASS_OVERLAY.has(fx) ? 2 : 1 }

export function drawBrutalityCinematic(c, canvas) {
  const s = _b; if (!s || !c || !canvas) return
  const W = canvas.width, H = canvas.height, f = s.t
  s.W = W; s.H = H
  const run = (beat) => { const span = Math.max(1, beat.t1 - beat.t0); const p = (f - beat.t0) / span; const fn = PRIM[beat.fx]; if (fn) { c.save(); fn(c, W, H, p, beat, s, f); c.restore() } }
  const active = s.concept.beats.filter(b => f >= b.t0 && f <= b.t1)
  if (!s.concept.choreographed) { c.save(); for (const b of active) run(b); c.restore(); return }
  // ── choreographed: 3 passes — screen background · world (camera) · screen overlay ──
  c.save()
  for (const b of active) if (_passOf(b.fx) === 0) run(b)
  c.save()
  c.translate(W / 2, H / 2); c.scale(s.cam.zoom, s.cam.zoom); c.translate(-s.cam.cx * W, -s.cam.cy * H)
  for (const b of active) if (_passOf(b.fx) === 1) run(b)
  c.restore()
  for (const b of active) if (_passOf(b.fx) === 2) run(b)
  c.restore()
}

// ── ACTOR DRAW (choreographed cutaways) ─────────────────────────────────────────────────────────────
// Lazily load a fighter's action sheet (the EXACT sheet the sim uses) and cache it per actor.
function _actorImg(actor, action) {
  if (!actor) return null
  if (actor.cache.has(action)) return actor.cache.get(action)
  const def = actor.ad[action] || actor.ad.idle || null
  let img = null
  try {
    if (def && def.sheet) { img = new Image(); img.src = def.sheet }
    else { const sheets = getSpriteSheets(actor.key) || {}; img = sheets[action] || sheets.idle || null }
  } catch (_) {}
  const rec = (img && def) ? { img, def } : null
  actor.cache.set(action, rec)
  return rec
}
// pick the first action that actually exists on this actor (for graceful fallbacks, e.g. knockdown→lose→hurt)
function _firstAction(actor, cands) { if (!actor) return "idle"; for (const a of cands) if (actor.ad[a]) return a; return "idle" }
// resolve which frame of an action to show: "hold:N" | "anim:SPEED" | "once:SPEED@T0" | number
function _frameIdx(sel, frames, t, t0) {
  if (typeof sel === "number") return Math.max(0, Math.min(frames - 1, sel | 0))
  if (typeof sel === "string") {
    const [mode, arg] = sel.split(":")
    const sp = Math.max(1, parseInt(arg || "6", 10))
    if (mode === "hold") return Math.max(0, Math.min(frames - 1, parseInt(arg || "0", 10)))
    if (mode === "once") return Math.min(frames - 1, Math.floor((t - (t0 || 0)) / sp))
    return Math.floor(t / sp) % frames   // "anim"
  }
  return Math.floor(t / 6) % frames
}
// draw actor `who` ("atk"/"vic") action frame centered at world (wx,wy); H sizes it (~hFrac of H tall at zoom 1)
function _drawActor(c, S, who, action, wx, wy, opts = {}) {
  const actor = who === "atk" ? S.atk : S.vic
  const rec = _actorImg(actor, action)
  const H = S.H || 720, hFrac = opts.hFrac || 0.42, facing = opts.facing || 1, alpha = opts.alpha ?? 1
  if (!rec || !rec.img || !rec.img.complete || !rec.img.naturalWidth) {
    c.save(); c.globalAlpha = alpha * 0.8; c.fillStyle = "#1a1c24"; c.fillRect(wx - 20, wy - 40, 40, 80); c.restore(); return null
  }
  const def = rec.def, frames = Math.max(1, def.frames || 1)
  const fw = rec.img.naturalWidth / frames, fh = rec.img.naturalHeight
  const frame = _frameIdx(opts.frame ?? "anim:6", frames, S.t, opts.t0), sx = frame * fw
  const scale = (H * hFrac) / fh * (opts.scale || 1), dw = fw * scale, dh = fh * scale
  c.save(); c.globalAlpha = alpha; c.imageSmoothingEnabled = false
  c.translate(wx, wy); if (opts.rot) c.rotate(opts.rot); c.scale(facing, 1)
  try { c.drawImage(rec.img, sx, 0, fw, fh, -dw / 2, -dh / 2, dw, dh) } catch (_) {}
  c.restore()
  return { x: wx - dw / 2, y: wy - dh / 2, w: dw, h: dh, cx: wx, cy: wy }   // top-left rect (matches flat `sprite`)
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
    const emberA = beat.black ? "#e636b4" : "#ffb032", emberB = beat.black ? "#8a0044" : "#ff5a10"   // Amaterasu = black flame (magenta edge so it READS on dark)
    for (let i = 0; i < 44; i++) { const bx = r.x + rnd(i, 1) * r.w, prog = ((f * 0.04 + rnd(i, 2)) % 1), by = ly - prog * r.h * 0.75, sz = (1 - prog) * 4 + 1; c.globalAlpha = (1 - prog) * e; c.fillStyle = i % 3 ? emberA : emberB; c.beginPath(); c.arc(bx, by, sz, 0, 7); c.fill() }
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

  // ── CHOREOGRAPHED cutscene primitives (two-actor). Coords are fractions of W/H → world px. ────────

  // draw an actor's action frame at a staged position (the attacker or the reacting victim)
  actor(c, W, H, p, beat, S) {
    const who = beat.who || "vic"
    const action = Array.isArray(beat.action) ? _firstAction(who === "atk" ? S.atk : S.vic, beat.action) : (beat.action || "idle")
    const rect = _drawActor(c, S, who, action, (beat.x ?? 0.5) * W, (beat.y ?? 0.5) * H,
      { frame: beat.frame, facing: beat.facing || 1, scale: beat.scale || 1, hFrac: beat.hFrac || 0.42, t0: beat.t0, alpha: beat.alpha ?? 1, rot: beat.rot || 0 })
    // publish the victim's on-screen rect so signature FX primitives (headPop/shatter/maw/…) can target it
    if (who === "vic" && rect) S.rect = rect
  },

  // attacker FLICKERS in from fromX→toX with fading after-images (Body Flicker approach + speed streak)
  flickerIn(c, W, H, p, beat, S) {
    const e = ease(p), fromX = (beat.fromX ?? 0.85) * W, toX = (beat.toX ?? 0.6) * W, y = (beat.y ?? 0.5) * H
    const face = beat.facing || 1, action = beat.action || "run"
    for (let i = 4; i >= 0; i--) { const te = Math.max(0, e - i * 0.12), x = fromX + (toX - fromX) * te; _drawActor(c, S, "atk", action, x, y, { frame: "anim:4", facing: face, alpha: i === 0 ? 1 : 0.18, hFrac: 0.42 }) }
    c.save(); c.strokeStyle = beat.color || "rgba(200,40,46,0.5)"; c.lineWidth = 3; c.globalAlpha = 1 - e; c.beginPath(); c.moveTo(fromX, y); c.lineTo(toX, y); c.stroke(); c.restore()
  },

  // attacker BLITZES around the victim — teleporting between positions, each with ghosts + a slash flash + streak
  flickerRush(c, W, H, p, beat, S, f) {
    const cxw = (beat.around ?? 0.54) * W, cyw = (beat.aroundY ?? 0.48) * H
    const n = beat.count || 7, radX = (beat.radX ?? 0.26) * W, radY = (beat.radY ?? 0.12) * H
    const posAt = (k) => { const a = (k / n) * Math.PI * 2 + k * 1.7; return [cxw + Math.cos(a) * radX, cyw + Math.sin(a) * radY] }
    const slot = Math.floor((f - beat.t0) / 7) % n, prev = (slot - 1 + n) % n
    const [px, py] = posAt(prev), [x, y] = posAt(slot)
    c.save(); c.strokeStyle = beat.color || "#d0202a"; c.lineWidth = 3; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); c.restore()
    for (let i = 1; i <= 2; i++) { const [gx, gy] = posAt((slot - i + n) % n); _drawActor(c, S, "atk", beat.action || "run", gx, gy, { frame: "anim:3", facing: gx < cxw ? 1 : -1, alpha: 0.2, hFrac: 0.4 }) }
    _drawActor(c, S, "atk", beat.action || "run", x, y, { frame: "anim:3", facing: x < cxw ? 1 : -1, alpha: 1, hFrac: 0.4 })
    const aa = 1 - ((f - beat.t0) % 7) / 7, sa = (hash(slot, 3) % 360) * Math.PI / 180, L = radX * 0.9
    c.save(); c.strokeStyle = `rgba(255,240,245,${aa.toFixed(3)})`; c.lineWidth = 2.5 * aa + 1
    c.beginPath(); c.moveTo(cxw - Math.cos(sa) * L, cyw - Math.sin(sa) * L); c.lineTo(cxw + Math.cos(sa) * L, cyw + Math.sin(sa) * L); c.stroke(); c.restore()
  },

  // a single big SWORD slash arc sweeping through (x,y) with a leading blade glint
  swordSlash(c, W, H, p, beat, S) {
    const x = (beat.x ?? 0.54) * W, y = (beat.y ?? 0.46) * H, e = ease(p)
    const R = (beat.len ?? 0.3) * H, a0 = beat.angle ?? -2.2, sweep = beat.sweep ?? 2.6, ang = a0 + sweep * e
    c.save()
    c.strokeStyle = beat.color || "#ffffff"; c.lineWidth = 6 * (1 - e) + 2; c.globalAlpha = 0.9
    c.beginPath(); c.arc(x, y, R, a0, ang, false); c.stroke()
    const gx = x + Math.cos(ang) * R, gy = y + Math.sin(ang) * R
    c.fillStyle = "#ffffff"; c.globalAlpha = 1 - e * 0.5; c.beginPath(); c.arc(gx, gy, 6 * (1 - e) + 2, 0, 7); c.fill()
    c.restore()
  },

  // blood spurts from (x,y) and pours downward, accumulating (deterministic — seeded by index + frame)
  bloodGush(c, W, H, p, beat, S, f) {
    const x = (beat.x ?? 0.54) * W, y = (beat.y ?? 0.46) * H, amount = beat.amount || 24, age = f - beat.t0
    c.save()
    for (let i = 0; i < amount; i++) {
      const birth = (i * 1.7) % 24, life = age - birth; if (life < 0) continue
      const ang = -Math.PI / 2 + (rnd(i, 1) - 0.5) * 2.2, sp = rnd(i, 2) * 3 + 2
      const px = x + Math.cos(ang) * sp * life, py = y + Math.sin(ang) * sp * life + 0.09 * life * life
      const sz = rnd(i, 3) * 3 + 1.5
      c.fillStyle = i % 4 ? "rgba(150,8,14,0.95)" : "rgba(110,4,10,0.95)"
      c.beginPath(); c.arc(px, py, sz, 0, 7); c.fill()
    }
    c.restore()
  },

  // SCREEN-space radial speed lines — conveys the intensity of the flicker blitz
  speedLines(c, W, H, p, beat, S, f) {
    const e = Math.sin(Math.min(1, p * 2) * Math.PI) * 0.6 + 0.2
    c.save(); c.globalAlpha = e; c.strokeStyle = beat.color || "rgba(230,230,235,0.5)"; c.lineWidth = 2
    const cx = W / 2, cy = H / 2
    for (let i = 0; i < 26; i++) { const ang = (i / 26) * Math.PI * 2 + f * 0.02, r0 = Math.min(W, H) * (0.4 + (hash(i, 1) % 20) / 100); c.beginPath(); c.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0); c.lineTo(cx + Math.cos(ang) * (r0 + 60), cy + Math.sin(ang) * (r0 + 60)); c.stroke() }
    c.restore()
  },

  // cinematic LETTERBOX bars (slide in, then hold) + a soft vignette — the MK "this is a finisher" framing
  letterbox(c, W, H, p, beat, S, f) {
    const prog = ease(Math.min(1, (f - beat.t0) / (beat.in || 10)))
    const bh = H * (beat.h || 0.12) * prog
    c.save()
    c.fillStyle = "rgba(0,0,0,0.96)"; c.fillRect(0, 0, W, bh); c.fillRect(0, H - bh, W, bh)
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85)
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${(0.5 * prog).toFixed(3)})`)
    c.fillStyle = g; c.fillRect(0, 0, W, H)
    c.restore()
  },

  // ── PHASE 3 — THE SHARINGAN (Uchiha) ─────────────────────────────────────────────────────────────

  // SASUKE — Chidori: a crackling nest of lightning at the pierce point (world-space, targets S.rect)
  lightning(c, W, H, p, beat, S, f) {
    const r = S.rect; const x = r ? r.x + r.w * (beat.hx ?? 0.5) : W / 2, y = r ? r.y + r.h * (beat.headY ?? 0.45) : H / 2
    const col = beat.color || "#7ec8ff"
    c.save()
    for (let i = 0; i < 9; i++) {
      const ang = (hash(i, f >> 1) % 360) * Math.PI / 180; let px = x, py = y
      c.strokeStyle = col; c.lineWidth = 2; c.globalAlpha = 0.55 + 0.45 * Math.sin(f * 0.5 + i)
      c.beginPath(); c.moveTo(px, py)
      for (let k = 0; k < 5; k++) { px += Math.cos(ang) * 18 + (rnd(i * 5 + k, f) - 0.5) * 20; py += Math.sin(ang) * 18 + (rnd(i * 5 + k, f + 1) - 0.5) * 20; c.lineTo(px, py) }
      c.stroke()
    }
    c.globalAlpha = 1; c.fillStyle = "#eaf6ff"; c.beginPath(); c.arc(x, y, (r ? r.w : 80) * 0.11, 0, 7); c.fill()
    c.restore()
  },

  // ITACHI — Tsukuyomi: the genjutsu world. Inverted red sky / black ground + a dark blood-moon (BG pass)
  tsukuyomiBg(c, W, H, p, beat, S, f) {
    const a = ease(Math.min(1, (f - beat.t0) / 16))
    c.save()
    const g = c.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, `rgba(120,10,10,${(a * 0.85).toFixed(3)})`); g.addColorStop(0.5, `rgba(40,0,0,${a.toFixed(3)})`); g.addColorStop(1, `rgba(4,0,0,${a.toFixed(3)})`)
    c.fillStyle = `rgba(14,0,0,${a.toFixed(3)})`; c.fillRect(0, 0, W, H)
    c.fillStyle = g; c.fillRect(0, 0, W, H)
    c.globalAlpha = a; c.fillStyle = "#1a0000"; c.beginPath(); c.arc(W * 0.5, H * 0.23, H * 0.12, 0, 7); c.fill()
    c.strokeStyle = "#c01010"; c.lineWidth = 3; c.stroke()
    c.restore()
  },

  // MADARA — Tengai Shinsei: a flaming meteor plummets from the sky onto the target (world-space, targets S.rect)
  meteor(c, W, H, p, beat, S, f) {
    const r = S.rect; const tx = r ? r.x + r.w * 0.5 : W / 2, ty = r ? r.y + r.h * 0.3 : H * 0.4
    const e = ease(p), startY = -H * 0.35, ry = startY + (ty - startY) * Math.min(1, e * 1.25)
    const rad = (r ? r.w : 120) * 0.7 * (0.3 + e * 0.9)
    c.save()
    for (let i = 0; i < 10; i++) { const a = (1 - i / 10) * 0.5 * (1 - Math.max(0, e - 0.8) * 5); c.fillStyle = `rgba(255,${120 - i * 8},20,${Math.max(0, a).toFixed(3)})`; c.beginPath(); c.arc(tx + (rnd(i, 1) - 0.5) * rad * 0.3, ry - i * rad * 0.5, rad * (1 - i * 0.06), 0, 7); c.fill() }
    if (e < 0.85) {
      c.fillStyle = "#2a1810"; c.beginPath()
      const sp = 10; for (let i = 0; i < sp; i++) { const ang = i / sp * Math.PI * 2, rr = rad * (0.8 + 0.3 * rnd(i, 2)), x = tx + Math.cos(ang) * rr, y = ry + Math.sin(ang) * rr; i ? c.lineTo(x, y) : c.moveTo(x, y) } c.closePath(); c.fill()
      c.strokeStyle = "#ff6a10"; c.lineWidth = 2; c.globalAlpha = 0.8
      for (let i = 0; i < 5; i++) { const ang = rnd(i, 3) * Math.PI * 2; c.beginPath(); c.moveTo(tx, ry); c.lineTo(tx + Math.cos(ang) * rad * 0.8, ry + Math.sin(ang) * rad * 0.8); c.stroke() }
      c.globalAlpha = 1
    } else {   // impact — local burst + debris
      const ia = (e - 0.8) / 0.2
      const gg = c.createRadialGradient(tx, ty, 2, tx, ty, rad * 2.2 * ia); gg.addColorStop(0, `rgba(255,220,120,${(1 - ia).toFixed(3)})`); gg.addColorStop(1, "rgba(255,120,20,0)"); c.fillStyle = gg; c.beginPath(); c.arc(tx, ty, rad * 2.2 * ia, 0, 7); c.fill()
      for (let i = 0; i < 18; i++) { const ang = i / 18 * Math.PI * 2, d = ia * rad * 2.4 * (rnd(i, 4) + 0.4); c.fillStyle = "#3a2418"; c.beginPath(); c.arc(tx + Math.cos(ang) * d, ty + Math.sin(ang) * d - ia * 10, (1 - ia) * 5 + 2, 0, 7); c.fill() }
    }
    c.restore()
  },

  // OBITO — Kamui: a spiralling vortex warps the target out of existence (world-space, centred on S.rect)
  kamuiSpiral(c, W, H, p, beat, S, f) {
    const r = S.rect; const cx = r ? r.x + r.w * 0.5 : W / 2, cy = r ? r.y + r.h * 0.4 : H * 0.4
    const e = ease(p), maxR = (r ? r.w : 120) * 1.5
    c.save(); c.translate(cx, cy); c.rotate(f * 0.12)
    const arms = 4, fade = 1 - Math.max(0, e - 0.85) * 6
    for (let a = 0; a < arms; a++) {
      c.strokeStyle = `rgba(150,90,210,${Math.max(0, 0.75 * fade).toFixed(3)})`; c.lineWidth = 3; c.beginPath()
      for (let t = 0; t < 1; t += 0.03) { const ang = a / arms * Math.PI * 2 + t * Math.PI * 3, rr = maxR * (1 - t) * (1 - e * 0.6), x = Math.cos(ang) * rr, y = Math.sin(ang) * rr; t === 0 ? c.moveTo(x, y) : c.lineTo(x, y) }
      c.stroke()
    }
    c.fillStyle = `rgba(18,6,28,${Math.min(1, e * 1.3).toFixed(3)})`; c.beginPath(); c.arc(0, 0, maxR * 0.28 * e, 0, 7); c.fill()
    c.restore()
  },

  // TOBI — Truth-Seeking Ball: a black orb expands over the target and disintegrates it to nothing (world-space)
  voidOrb(c, W, H, p, beat, S) {
    const r = S.rect; const cx = r ? r.x + r.w * 0.5 : W / 2, cy = r ? r.y + r.h * 0.45 : H * 0.45
    const e = ease(p), rad = (r ? r.w : 120) * (0.15 + e * 1.0)
    c.save()
    const g = c.createRadialGradient(cx, cy, rad * 0.6, cx, cy, rad * 1.2); g.addColorStop(0, "rgba(90,12,110,0)"); g.addColorStop(0.8, "rgba(130,24,150,0.5)"); g.addColorStop(1, "rgba(90,12,110,0)"); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, rad * 1.2, 0, 7); c.fill()
    c.fillStyle = "#040208"; c.beginPath(); c.arc(cx, cy, rad, 0, 7); c.fill()
    c.strokeStyle = "#9020b0"; c.lineWidth = 2; c.globalAlpha = 0.7; c.stroke(); c.globalAlpha = 1
    for (let i = 0; i < 20; i++) { const ang = i / 20 * Math.PI * 2 + i * 0.5, d = rad * (0.9 + rnd(i, 1) * 0.3); c.fillStyle = "#7020a0"; c.beginPath(); c.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, (1 - e) * 3 + 1, 0, 7); c.fill() }
    c.restore()
  },

  // SHISUI (PUPPETEER) — Kotoamatsukami: control strings descend onto the victim's limbs + a control sigil above
  strings(c, W, H, p, beat, S, f) {
    const r = S.rect; if (!r) return
    const cx = r.x + r.w * 0.5, e = ease(p), topY = r.y - r.h * 0.85
    const anchors = [[r.x + r.w * 0.2, r.y + r.h * 0.22], [r.x + r.w * 0.8, r.y + r.h * 0.22], [r.x + r.w * 0.12, r.y + r.h * 0.55], [r.x + r.w * 0.88, r.y + r.h * 0.55], [cx, r.y + r.h * 0.05]]
    c.save(); c.strokeStyle = beat.color || "rgba(120,200,255,0.7)"; c.lineWidth = 1.5; c.globalAlpha = e
    for (let i = 0; i < anchors.length; i++) {
      const [ax, ay] = anchors[i], jx = ax + Math.sin(f * 0.3 + i) * 4 * e
      c.beginPath(); c.moveTo(cx + Math.sin(f * 0.2 + i) * 6 * e, topY); c.lineTo(jx, ay); c.stroke()
      c.fillStyle = "#cfefff"; c.beginPath(); c.arc(jx, ay, 2, 0, 7); c.fill()
    }
    c.globalAlpha = e * 0.5; c.strokeStyle = "#5aa0ff"; c.lineWidth = 2; c.beginPath(); c.arc(cx, topY, 14, 0, 7); c.stroke()
    c.restore()
  },

  // ── PHASE 4 — WILL OF FIRE (Hokage / Sannin) ─────────────────────────────────────────────────────

  // NARUTO — Rasengan: a spiralling chakra sphere grinding at the impact point (world-space, targets S.rect)
  rasengan(c, W, H, p, beat, S, f) {
    const r = S.rect; const x = r ? r.x + r.w * (beat.hx ?? 0.5) : W / 2, y = r ? r.y + r.h * (beat.headY ?? 0.45) : H / 2
    const rad = (r ? r.w : 120) * (beat.size ?? 0.4) * (0.65 + 0.35 * Math.sin(f * 0.4)), col = beat.color || "#50a8ff"
    c.save()
    for (let gi = 4; gi >= 1; gi--) { c.globalAlpha = 0.12 * (5 - gi); c.fillStyle = col; c.beginPath(); c.arc(x, y, rad * (0.4 + gi * 0.28), 0, 7); c.fill() }
    c.globalAlpha = 1
    c.save(); c.translate(x, y); c.rotate(f * 0.35); c.strokeStyle = "rgba(225,242,255,0.8)"; c.lineWidth = 2
    for (let a = 0; a < 3; a++) { c.beginPath(); for (let t = 0; t < 1; t += 0.05) { const ang = a / 3 * Math.PI * 2 + t * Math.PI * 2.5, rr = rad * t, px = Math.cos(ang) * rr, py = Math.sin(ang) * rr; t === 0 ? c.moveTo(px, py) : c.lineTo(px, py) } c.stroke() }
    c.restore()
    c.fillStyle = "#eaf4ff"; c.beginPath(); c.arc(x, y, rad * 0.3, 0, 7); c.fill()
    for (let i = 0; i < 10; i++) { const ang = f * 0.1 + i / 10 * Math.PI * 2, d = rad * (1.1 + 0.3 * Math.sin(f * 0.2 + i)); c.fillStyle = "rgba(185,222,255,0.6)"; c.beginPath(); c.arc(x + Math.cos(ang) * d, y + Math.sin(ang) * d, 2, 0, 7); c.fill() }
    c.restore()
  },

  // HASHIRAMA — Wood Style: thorned wooden tendrils erupt from the ground and bind/constrict the target
  woodBind(c, W, H, p, beat, S, f) {
    const r = S.rect; if (!r) return
    const cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.5, e = ease(p), col = beat.color || "#6b4a2a", n = beat.count || 6
    c.save()
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1, baseX = cx + side * r.w * (0.5 + (i / n) * 0.4), baseY = r.y + r.h * 1.15, grow = Math.min(1, e * 1.2)
      c.strokeStyle = col; c.lineWidth = 6 * grow + 2; c.globalAlpha = Math.min(1, e * 1.5)
      c.beginPath(); c.moveTo(baseX, baseY); let px = baseX, py = baseY
      for (let k = 1; k <= 6; k++) { const tt = k / 6 * grow; px = baseX + (cx - baseX) * tt + Math.sin(f * 0.1 + i + k) * 8; py = baseY + (cy - r.h * 0.3 - baseY) * tt; c.lineTo(px, py) }
      c.stroke()
      c.fillStyle = "#4a3018"; c.beginPath(); c.arc(px, py, 5 * grow + 2, 0, 7); c.fill()
    }
    c.restore()
  },

  // ── PHASE 5 — THE HIDDEN LEAF ────────────────────────────────────────────────────────────────────

  // GAARA — Sand Coffin: swirling sand converges, engulfs and constricts the target (Sabaku Kyū → Sōsō)
  sandCrush(c, W, H, p, beat, S, f) {
    const r = S.rect; if (!r) return
    const cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.5, e = ease(p), col = beat.color || "#d8b870"
    c.save()
    for (let i = 0; i < 60; i++) { const ang = i / 60 * Math.PI * 2 + f * 0.05 + i, conv = 1 - e * 0.7, d = r.w * (0.3 + conv * 0.9) * (0.7 + 0.3 * Math.sin(f * 0.1 + i)); c.fillStyle = i % 3 ? col : "#b89850"; c.globalAlpha = 0.6; c.beginPath(); c.arc(cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * 0.8, 2 + rnd(i, 1) * 2, 0, 7); c.fill() }
    c.globalAlpha = e * 0.5; c.fillStyle = col; c.beginPath(); c.ellipse(cx, cy, r.w * 0.5 * (1 - e * 0.3), r.h * 0.55 * (1 - e * 0.2), 0, 0, 7); c.fill()
    c.restore()
  },

  // ONOKI — Dust Release (Jinton): a particle cube forms and atomises the target to dust
  dustRelease(c, W, H, p, beat, S, f) {
    const r = S.rect; if (!r) return
    const cx = r.x + r.w * 0.5, cy = r.y + r.h * 0.45, e = ease(p), rad = r.w * (0.4 + e * 0.6)
    c.save()
    c.strokeStyle = "rgba(255,245,210,0.8)"; c.lineWidth = 2; c.globalAlpha = 1 - Math.max(0, e - 0.8) * 5
    c.save(); c.translate(cx, cy); c.rotate(f * 0.04); c.strokeRect(-rad, -rad, rad * 2, rad * 2); c.rotate(Math.PI / 4); c.strokeRect(-rad * 0.8, -rad * 0.8, rad * 1.6, rad * 1.6); c.restore()
    c.globalAlpha = e * 0.4; c.fillStyle = "#fff5d2"; c.beginPath(); c.arc(cx, cy, rad * 0.6 * e, 0, 7); c.fill(); c.globalAlpha = 1
    for (let i = 0; i < 30; i++) { const prog = ((f * 0.04 + rnd(i, 1)) % 1), px = cx + (rnd(i, 2) - 0.5) * rad * 2, py = cy + rad - prog * rad * 2.5; c.fillStyle = `rgba(230,215,170,${((1 - prog) * e).toFixed(3)})`; c.beginPath(); c.arc(px, py, (1 - prog) * 2 + 1, 0, 7); c.fill() }
    c.restore()
  },

  // PAIN — expanding gravity shock rings (Shinra Tensei repulsion); reusable concentric-ring burst
  shockRing(c, W, H, p, beat, S, f) {
    const r = S.rect; const cx = r ? r.x + r.w * 0.5 : W / 2, cy = r ? r.y + r.h * 0.45 : H / 2, col = beat.color || "rgba(200,210,230,0.8)", n = beat.count || 4
    c.save()
    for (let i = 0; i < n; i++) { const rp = (((f - beat.t0) * 0.03 + i / n) % 1), rad = rp * (r ? r.w : 200) * 2.2; c.strokeStyle = col; c.globalAlpha = (1 - rp) * 0.8; c.lineWidth = (1 - rp) * 5 + 1; c.beginPath(); c.arc(cx, cy, rad, 0, 7); c.stroke() }
    c.restore()
  },

  // ── PHASE 6 — SAIYAN BLOOD (Dragon Ball) ─────────────────────────────────────────────────────────

  // GOKU & co — a ki BEAM: charge an orb at the attacker side, then fire a thick horizontal beam across the frame
  kiBeam(c, W, H, p, beat, S, f) {
    const r = S.rect; const ty = r ? r.y + r.h * (beat.headY ?? 0.45) : H / 2, col = beat.color || "#50a8ff", e = ease(p)
    const fire = Math.max(0, (e - 0.25) / 0.75)
    c.save()
    if (fire <= 0) {
      const ox = W * 0.82, cr = (r ? r.h : 200) * 0.3 * e
      const g = c.createRadialGradient(ox, ty, 2, ox, ty, cr); g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, col); g.addColorStop(1, "rgba(255,255,255,0)")
      c.fillStyle = g; c.beginPath(); c.arc(ox, ty, cr, 0, 7); c.fill()
    } else {
      const thick = (r ? r.h : 200) * 0.45 * (0.6 + 0.4 * fire) * (beat.wide || 1)
      const g = c.createLinearGradient(0, ty - thick, 0, ty + thick); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, col); g.addColorStop(1, "rgba(255,255,255,0)")
      c.globalAlpha = 0.92; c.fillStyle = g; c.fillRect(0, ty - thick, W, thick * 2)
      c.globalAlpha = 0.9; c.strokeStyle = "#ffffff"; c.lineWidth = thick * 0.5; c.beginPath(); c.moveTo(0, ty); c.lineTo(W, ty); c.stroke()
      c.globalAlpha = 0.6; for (let i = 0; i < 20; i++) { const bx = rnd(i, f >> 1) * W; c.fillStyle = col; c.beginPath(); c.arc(bx, ty + (rnd(i, f) - 0.5) * thick * 1.6, 2, 0, 7); c.fill() }
    }
    c.restore()
  },
}

export default { activateBrutalityCinematic, isBrutalityCinematicActive, updateBrutalityCinematic, brutalityCinematicDone, drawBrutalityCinematic, clearBrutalityCinematic, brutalityCinematicStatus }
