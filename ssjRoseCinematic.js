// ssjRoseCinematic.js
// Goku Black SSJ ROSE transformation — a frozen cinematic beat. Mirrors kurama.js /
// sasukeCinematic.js EXACTLY (the systems that truly FREEZE combat):
//   • abilities.enterSSJRose() calls activateSSJRoseCinematic(caster, opponent, onResolve)
//     instead of swapping form instantly.
//   • updateBattle() freezes combat while isSSJRoseCinematicActive(): it calls
//     updateSSJRoseCinematic({camera, sound}) + camera.advance() and returns early
//     (no physics/combat/input that frame) — the SAME contract used for Kurama & Sasuke.
//   • drawBattle() calls drawSSJRoseCinematic(ctx, canvas) as a fullscreen, screen-space
//     overlay drawn ON TOP of the frozen world.
//   • the actual form-swap (_ssjRoseActive + _skinAnim + stat multipliers) is applied by
//     onResolve() at the RESOLVE beat — so it lands as the cinematic ENDS, not before it
//     starts (matching Sasuke's Lv2 escalation).
//   • every reset path calls clearSSJRoseCinematic().
//
// The transformation MORPH itself is the character sheet (black_goku_transformation_to_ssj_rose,
// wired as the "transform" action): we hold the caster's _spriteCastMove="transform" so it plays
// ON the (zoomed-in, isolated) fighter through the freeze; the overlay adds the pink flash/aura.
//
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps)
//   FLASH   [0,12)    12f ~0.20s  pink/white pop; camera SNAPS in + isolates Goku Black
//   MORPH   [12,48)   36f ~0.60s  the base→Rose morph sheet plays on the isolated fighter
//   RESOLVE [48,72)   24f ~0.40s  aura burst; FORM-SWAP applied @start of RESOLVE; camera eases back
// ─────────────────────────────────────────────────────────────────
export const SSJ_ROSE_TIMELINE = { FLASH: 12, MORPH: 36, RESOLVE: 24 }
const T_FLASH_END = SSJ_ROSE_TIMELINE.FLASH                       // 12
const T_MORPH_END = T_FLASH_END + SSJ_ROSE_TIMELINE.MORPH         // 48  ← form-swap lands here
const T_TOTAL     = T_MORPH_END + SSJ_ROSE_TIMELINE.RESOLVE       // 72

// Camera isolation: zoom PAST the normal 1.15 cap and pan AWAY from the opponent so the
// opponent leaves the frame entirely (not just darkened). Restored on end.
const ISO_ZOOM = 3.0    // temporary camera.maxZoom during the beat (well past the normal 1.15 cap)
const ISO_PAN  = 175    // px to shift framing away from the opponent (Goku Black frames near an edge)

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onResolve: null, resolved: false,
  _cam: null, savedMaxStep: null, savedMaxZoom: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.enterSSJRose). onResolve(): applies the actual
// form-swap — invoked ONCE at the RESOLVE beat.
// ─────────────────────────────────────────────────────────────────
export function activateSSJRoseCinematic(caster, opponent, onResolve) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onResolve = typeof onResolve === "function" ? onResolve : null
  cine.resolved = false
  cine._cam = null
  cine.savedMaxStep = null
  cine.savedMaxZoom = null
  // Hold the base→Rose MORPH sheet on the fighter through the freeze (sprite frames advance in the
  // draw path, which still runs while combat is frozen). Cleared at end → back to normal resolution.
  caster._spriteCastMove  = "transform"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  // Combat is frozen for the whole beat, so per-frame state resets (updateFighterState) don't run —
  // clear isCharging now so a charge pose held into the transform doesn't get stuck as the resolve-phase
  // pose after the morph cast is dropped at form-swap. (Post-cinematic the normal reset resumes.)
  caster.isCharging = false
  return true
}

export function isSSJRoseCinematicActive() { return cine.active }

export function getSSJRoseCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_FLASH_END) return "flash"
  if (f < T_MORPH_END) return "morph"
  return "resolve"
}

// Test/harness snapshot.
export function getSSJRoseCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getSSJRoseCinematicPhase(), total: T_TOTAL, resolved: cine.resolved }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateSSJRoseCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cine.savedMaxZoom = cam.maxZoom
      cam.maxZoomStep = 0.24          // fast snap-in so the isolate settles within the FLASH+early MORPH
      cam.maxZoom = ISO_ZOOM          // raise the cap so we can isolate past the normal 1.15
    }
    try { snd?.playDragonBallTransformSfx?.() } catch (_) {}   // SHARED Dragon Ball transform cue (sound.js)
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared power-up boom
    // SSJ ROSE naming monologue — "...it would be Rosé... Super Saiyan Rosé." Fires at transform start.
    // NOTE: this is a ~10s line and the cinematic itself is only 72f (~1.2s), so the voice INTENTIONALLY
    // outlasts the visual and plays out over the post-transform idle (fresh Audio element, not cut off).
    try { snd?.playSfxFile?.("goku_black_transform_rose.mp3", null) } catch (_) {}
  }

  // Camera: ISOLATE Goku Black — zoom in hard + pan away from the opponent so he leaves frame.
  if (cam && cine.caster) {
    const gb = cine.caster
    const gbcx = (gb.x || 0) + (gb.w || 60) / 2
    if (f < T_MORPH_END + 4) {
      if (cam.focusOnFighter) cam.focusOnFighter(gb, ISO_ZOOM)
      const dir = cine.opponent ? (Math.sign(((cine.opponent.x || 0) + (cine.opponent.w || 60) / 2) - gbcx) || 1) : 1
      cam.targetX = gbcx - dir * ISO_PAN     // frame Goku Black near an edge, opponent off the far side
    } else {
      if (cam.focusOnFighter) cam.focusOnFighter(gb, 1.0)   // SETTLE back before combat resumes
    }
  }

  // Escalating rumble through the morph, a big shake on the resolve burst.
  if (cam && cam.shake) {
    if (f >= T_FLASH_END && f < T_MORPH_END && f % 6 === 0) cam.shake(4 + ((f - T_FLASH_END) / SSJ_ROSE_TIMELINE.MORPH) * 7, 8)
    else if (f === T_MORPH_END) cam.shake(18, 20)
  }

  // FORM-SWAP lands exactly at the RESOLVE beat (not before).
  if (f >= T_MORPH_END && !cine.resolved) {
    cine.resolved = true
    try { cine.onResolve?.() } catch (_) {}
    // The base→Rose MORPH ("transform") pose is finished and onResolve just swapped _skinAnim to the
    // Rose set — which has NO "transform" strip. Holding the cast pose any longer would resolve to a
    // missing action → the fallback draws the idle sheet UNSLICED (the "4 copies" glitch) through the
    // fading RESOLVE overlay. Drop it now so the resolve phase shows the clean Rose idle.
    if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
    try { snd?.play?.(SFX.HIT_HEAVY) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endSSJRoseCinematic()
  return getSSJRoseCinematicPhase()
}

function endSSJRoseCinematic() {
  const cam = cine._cam
  if (cam) {
    if (cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
    if (cine.savedMaxZoom != null) cam.maxZoom = cine.savedMaxZoom
  }
  // Safety: never let a transform get "eaten" by an interrupted cinematic.
  if (!cine.resolved) { try { cine.onResolve?.() } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onResolve = null; cine.resolved = false
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearSSJRoseCinematic() {
  if (cine.active || cine._cam) endSSJRoseCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded)
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawSSJRoseCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame

  // Dark backdrop so any sliver of the (framed-out) world recedes and Goku Black leads.
  let backdrop = 0
  if (f < T_FLASH_END)      backdrop = (f / T_FLASH_END) * 0.62
  else if (f < T_MORPH_END) backdrop = 0.62
  else                      backdrop = 0.62 * (1 - (f - T_MORPH_END) / SSJ_ROSE_TIMELINE.RESOLVE)
  _flash(ctx, cw, ch, "#180a1e", backdrop)

  // Pink energy aura — a radial pink glow centered where the zoomed-in fighter sits.
  const cx = cw * 0.5, cy = ch * 0.5
  const aura = f < T_MORPH_END ? 0.3 + 0.25 * Math.sin(f * 0.4) : Math.max(0, 0.55 - (f - T_MORPH_END) / SSJ_ROSE_TIMELINE.RESOLVE)
  if (aura > 0) {
    ctx.save()
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, cw * 0.42)
    g.addColorStop(0, `rgba(255,93,177,${0.42 * aura})`)
    g.addColorStop(0.6, `rgba(214,80,180,${0.18 * aura})`)
    g.addColorStop(1, "rgba(214,80,180,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore()
  }

  // FLASH pink/white pop at the start; a big pink burst at RESOLVE.
  if (f < T_FLASH_END) { _flash(ctx, cw, ch, "#ffffff", (1 - f / T_FLASH_END) * 0.7); _flash(ctx, cw, ch, "#ff5db1", (1 - f / T_FLASH_END) * 0.4) }
  if (f >= T_MORPH_END) {
    const rp = (f - T_MORPH_END) / SSJ_ROSE_TIMELINE.RESOLVE
    _flash(ctx, cw, ch, "#ff5db1", Math.max(0, 0.6 - rp))
    if (rp < 0.3) _flash(ctx, cw, ch, "#ffffff", (0.3 - rp) * 1.8)
  }
}
