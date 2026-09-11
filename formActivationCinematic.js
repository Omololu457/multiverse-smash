// formActivationCinematic.js
// A SHORT (~1s) frozen cinematic BEAT for a form ACTIVATION — the "moment of transform".
// Mirrors ssjRoseCinematic.js / the Kurama / Sasuke freeze contract EXACTLY (the systems that truly
// FREEZE combat), but generalised so several characters share ONE activate/update/draw/clear surface:
//   • the caller (abilities.js / game.js) calls activateFormActivationCinematic(caster, opponent,
//     onResolve, config) instead of applying the form instantly.
//   • updateBattle() freezes combat while isFormActivationCinematicActive(): it calls
//     updateFormActivationCinematic({camera, sound}) + camera.advance() and returns early
//     (no physics/combat/input that frame) — the SAME contract used for SSJ Rose / Kurama / Sasuke.
//   • drawBattle() calls drawFormActivationCinematic(ctx, canvas) as a fullscreen, screen-space overlay
//     drawn ON TOP of the frozen world.
//   • the actual form change (tint flag / stat multipliers) is applied by onResolve() at the RESOLVE
//     beat — so it lands as the cinematic ENDS, not before it starts (the "buildup then POP" read).
//   • every reset path calls clearFormActivationCinematic().
//
// This adds ONLY a presentation moment — it does NOT change any balance number, damage, threshold or
// transform MECHANIC. onResolve carries the exact same form-apply the instant path used to run inline.
//
// It is a SINGLETON (one module-level `cine`), like every other cinematic here: a second activation is
// refused while one is in flight (the caller falls back to its instant path or drops the input, same as
// SSJ Rose's `if (isSSJRoseCinematicActive()) return false`).
//
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — deliberately SHORT so it never feels like a match pause.
//   FLASH   [0,10)    10f ~0.17s  colour pop; camera SNAPS in + isolates the caster
//   BUILD   [10,42)   32f ~0.53s  the hold-pose plays on the isolated fighter; aura swells
//   RESOLVE [42,60)   18f ~0.30s  aura burst; FORM-APPLY runs @start of RESOLVE; camera eases back
// Total 60f ≈ 1.0s.
// ─────────────────────────────────────────────────────────────────
export const FORM_CINE_TIMELINE = { FLASH: 10, BUILD: 32, RESOLVE: 18 }
const T_FLASH_END = FORM_CINE_TIMELINE.FLASH                       // 10
const T_BUILD_END = T_FLASH_END + FORM_CINE_TIMELINE.BUILD         // 42  ← form-apply lands here
const T_TOTAL     = T_BUILD_END + FORM_CINE_TIMELINE.RESOLVE       // 60

// Camera isolation: zoom PAST the normal 1.15 cap and pan AWAY from the opponent so the opponent leaves
// the frame (a clean, isolated transform). Restored on end.
const ISO_ZOOM = 2.8    // temporary camera.maxZoom during the beat (well past the normal 1.15 cap)
const ISO_PAN  = 155    // px to shift framing away from the opponent (caster frames near an edge)

// Fallback config so a bad/absent config never throws.
const DEFAULT_CFG = {
  key: "form",
  holdPose: "taunt",
  auraInner: "rgba(255,240,140,A)",   // A is replaced with the live alpha
  auraMid:   "rgba(255,176,32,A)",
  flash:     "#fff4c0",
  backdrop:  "#160f04"
}

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onResolve: null, resolved: false, cfg: DEFAULT_CFG,
  _cam: null, savedMaxStep: null, savedMaxZoom: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION. onResolve(): applies the actual form change — invoked ONCE at the RESOLVE beat.
// Returns false (caller should fall back to its instant path) if it can't start.
// ─────────────────────────────────────────────────────────────────
export function activateFormActivationCinematic(caster, opponent, onResolve, config = {}) {
  if (!caster) return false
  if (cine.active) return false          // singleton — one activation beat at a time
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onResolve = typeof onResolve === "function" ? onResolve : null
  cine.resolved = false
  cine.cfg = { ...DEFAULT_CFG, ...config }
  cine._cam = null
  cine.savedMaxStep = null
  cine.savedMaxZoom = null
  // Hold the transform pose on the fighter through the freeze (sprite frames advance in the draw path,
  // which still runs while combat is frozen). Cleared at end → back to normal resolution.
  caster._spriteCastMove  = cine.cfg.holdPose
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking  = false
  // Combat is frozen for the whole beat, so per-frame state resets (updateFighterState) don't run —
  // clear a lingering charge pose so the release-charge that triggered this doesn't get stuck.
  caster.isCharging = false
  return true
}

export function isFormActivationCinematicActive() { return cine.active }

export function getFormActivationCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_FLASH_END) return "flash"
  if (f < T_BUILD_END) return "build"
  return "resolve"
}

// Test/harness snapshot.
export function getFormActivationCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getFormActivationCinematicPhase(), total: T_TOTAL, resolved: cine.resolved, key: cine.active ? cine.cfg.key : null }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateFormActivationCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cine.savedMaxZoom = cam.maxZoom
      cam.maxZoomStep = 0.26          // fast snap-in so the isolate settles within FLASH+early BUILD
      cam.maxZoom = ISO_ZOOM          // raise the cap so we can isolate past the normal 1.15
    }
    try { snd?.playDragonBallTransformSfx?.() } catch (_) {}   // SHARED Dragon Ball transform cue (sound.js)
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}      // shared power-up boom
  }

  // Camera: ISOLATE the caster — zoom in hard (punch-in) + pan away from the opponent so it leaves frame.
  if (cam && cine.caster) {
    const c = cine.caster
    const ccx = (c.x || 0) + (c.w || 60) / 2
    if (f < T_BUILD_END + 3) {
      if (cam.focusOnFighter) cam.focusOnFighter(c, ISO_ZOOM)
      const dir = cine.opponent ? (Math.sign(((cine.opponent.x || 0) + (cine.opponent.w || 60) / 2) - ccx) || 1) : 1
      cam.targetX = ccx - dir * ISO_PAN     // frame the caster near an edge, opponent off the far side
    } else {
      if (cam.focusOnFighter) cam.focusOnFighter(c, 1.0)   // SETTLE back before combat resumes
    }
  }

  // Escalating rumble through the build, a big shake on the resolve burst.
  if (cam && cam.shake) {
    if (f >= T_FLASH_END && f < T_BUILD_END && f % 6 === 0) cam.shake(4 + ((f - T_FLASH_END) / FORM_CINE_TIMELINE.BUILD) * 6, 8)
    else if (f === T_BUILD_END) cam.shake(16, 18)
  }

  // FORM-APPLY lands exactly at the RESOLVE beat (not before) — the "buildup then POP".
  if (f >= T_BUILD_END && !cine.resolved) {
    cine.resolved = true
    try { cine.onResolve?.() } catch (_) {}
    try { snd?.play?.(SFX.HIT_HEAVY) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endFormActivationCinematic()
  return getFormActivationCinematicPhase()
}

function endFormActivationCinematic() {
  const cam = cine._cam
  if (cam) {
    if (cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
    if (cine.savedMaxZoom != null) cam.maxZoom = cine.savedMaxZoom
  }
  // Safety: never let a transform get "eaten" by an interrupted cinematic — resolve it if we didn't reach
  // the RESOLVE beat (e.g. round ended mid-beat). Idempotent for the caller's apply.
  if (!cine.resolved) { try { cine.onResolve?.() } catch (_) {} }
  // Drop the held transform pose so the (now transformed) fighter returns to its normal resolution.
  // NOTE: a fighter whose activation rides the taunt-heal channel (Bardock) still has _tauntPlaying set,
  // which the sprite resolver honours on its own — so clearing the cast override here is safe there too.
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onResolve = null; cine.resolved = false; cine.cfg = DEFAULT_CFG
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearFormActivationCinematic() {
  if (cine.active || cine._cam) endFormActivationCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded)
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}
function _rgba(spec, a) { return String(spec).replace("A", a.toFixed(3)) }

export function drawFormActivationCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const cfg = cine.cfg

  // Dark backdrop so any sliver of the (framed-out) world recedes and the caster leads.
  let backdrop = 0
  if (f < T_FLASH_END)      backdrop = (f / T_FLASH_END) * 0.58
  else if (f < T_BUILD_END) backdrop = 0.58
  else                      backdrop = 0.58 * (1 - (f - T_BUILD_END) / FORM_CINE_TIMELINE.RESOLVE)
  _flash(ctx, cw, ch, cfg.backdrop, backdrop)

  // Energy aura — a radial glow centered where the zoomed-in fighter sits, swelling through the build.
  const cx = cw * 0.5, cy = ch * 0.52
  const aura = f < T_BUILD_END ? 0.30 + 0.25 * Math.sin(f * 0.42) : Math.max(0, 0.55 - (f - T_BUILD_END) / FORM_CINE_TIMELINE.RESOLVE)
  if (aura > 0) {
    ctx.save()
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, cw * 0.42)
    g.addColorStop(0,   _rgba(cfg.auraInner, 0.42 * aura))
    g.addColorStop(0.6, _rgba(cfg.auraMid,   0.18 * aura))
    g.addColorStop(1,   _rgba(cfg.auraMid,   0))
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore()
  }

  // FLASH colour/white pop at the start; a big burst at RESOLVE.
  if (f < T_FLASH_END) { _flash(ctx, cw, ch, "#ffffff", (1 - f / T_FLASH_END) * 0.65); _flash(ctx, cw, ch, cfg.flash, (1 - f / T_FLASH_END) * 0.4) }
  if (f >= T_BUILD_END) {
    const rp = (f - T_BUILD_END) / FORM_CINE_TIMELINE.RESOLVE
    _flash(ctx, cw, ch, cfg.flash, Math.max(0, 0.6 - rp))
    if (rp < 0.3) _flash(ctx, cw, ch, "#ffffff", (0.3 - rp) * 1.8)
  }
}
