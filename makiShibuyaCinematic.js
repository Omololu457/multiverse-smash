// makiShibuyaCinematic.js
// Maki Zenin SHIBUYA-ARC transformation cinematic — a frozen combat cinematic. Mirrors
// gonAdultFormCinematic.js EXACTLY (same activate / isActive / getStatus / update / draw / clear
// contract), differing only in framing/colour: it ISOLATES Maki (focusOnFighter — single-fighter
// transform framing) and flashes CURSED-ENERGY ORANGE-RED (her Shibuya cursed-tool colour) rather than
// Gon's green, because this is a self-transformation, not an attack that lands on the opponent.
//   • abilities.executeMakiShibuyaUltimate() applies the black-costume moveset swap (enterMakiShibuya —
//     _skinAnim → the Shibuya sheets, currentFormData → the shibuya form, scale bump) and holds Maki's
//     transformation-reveal pose (the `shibuyaIntro` action, resolved via the now-set _skinAnim), THEN
//     calls activateMakiShibuyaCinematic(caster, opponent).
//   • game.updateBattle() freezes combat while isMakiShibuyaCinematicActive(): it calls
//     updateMakiShibuyaCinematic({camera, sound}) + camera.advance() and returns early (the same freeze
//     contract used for Gon Adult Form / Godspeed / Flash Time). Neither fighter can act; the round timer
//     is paused for free (updateBattle early-returns before it ticks).
//   • The camera pushes IN on Maki, holds through the awakening, a transformation BURST fires, then it
//     eases back to the normal 1.0 framing and combat resumes (the Shibuya kit is now live for the round).
// NO second-body overlay is drawn (flash-only) → structurally immune to the duplicate-render bug class;
// the real fighter renders exactly once, so no _kuramaHide guard is needed.
import { sound as globalSound, SFX } from "./sound.js"

const CINE_ZOOM = 1.7                  // isolate-push framing on Maki (tight, like the other transforms)
// TIMELINE (frames @60fps) — ~150f (~2.5s), matching the other transform cinematics:
//   PUSH   [0,45)     camera pushes in + isolates Maki; the awakening builds
//   HOLD   [45,105)   held close on the reveal pose; rumble escalates
//   BURST  @105       transformation completes — orange-red cursed flash + hard shake
//   SETTLE [105,150)  camera eases back out to the normal 1.0 game view, then resume
const T_PUSH_END = 45, T_BURST = 105, T_SETTLE_END = 150, T_TOTAL = 150
export const MAKI_SHIBUYA_CINE_FRAMES = T_TOTAL

const cine = { active: false, frame: 0, caster: null, opponent: null, _cam: null, savedMaxStep: null, savedMaxZoom: null, burst: false }

export function activateMakiShibuyaCinematic(caster, opponent) {
  if (!caster) return false
  cine.active = true; cine.frame = 0; cine.caster = caster; cine.opponent = opponent || null
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null; cine.burst = false
  return true
}

export function isMakiShibuyaCinematicActive() { return cine.active }

export function getMakiShibuyaCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  return f < T_PUSH_END ? "push" : f < T_BURST ? "hold" : f < T_SETTLE_END ? "settle" : "done"
}

export function getMakiShibuyaCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getMakiShibuyaCinematicPhase(), total: T_TOTAL, burst: cine.burst }
}

// UPDATE (per frame while active; game.js freezes combat around this)
export function updateMakiShibuyaCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08     // let the push settle, never snaps
      cine.savedMaxZoom = cam.maxZoom;     cam.maxZoom = CINE_ZOOM     // lift the normal cap so the push-in reads
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom (same as the other transforms)
  }

  // Camera: ISOLATE + push in on Maki through PUSH/HOLD/BURST, then ease the zoom back to 1.0 on SETTLE.
  if (cam && cine.caster && cam.focusOnFighter) {
    let z = CINE_ZOOM
    if (f >= T_BURST) z = CINE_ZOOM - (CINE_ZOOM - 1.0) * Math.min(1, (f - T_BURST) / (T_SETTLE_END - T_BURST))
    cam.focusOnFighter(cine.caster, z)
  }

  // Rumble: escalates over HOLD, a hard shake on the BURST (transformation completes), tremor as it settles.
  if (cam && cam.shake) {
    if (f >= T_PUSH_END && f < T_BURST && f % 5 === 0) {
      cam.shake(3 + ((f - T_PUSH_END) / (T_BURST - T_PUSH_END)) * 7, 8)
    } else if (f === T_BURST) {
      cam.shake(22, 26)
    } else if (f > T_BURST && f < T_SETTLE_END && f % 8 === 0) {
      cam.shake(6, 8)
    }
  }

  if (f === T_BURST && !cine.burst) {
    cine.burst = true
    try { snd?.play?.(SFX.HIT_PROJECTILE) } catch (_) {}   // impact snap on the completion beat
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endMakiShibuyaCinematic()
  return getMakiShibuyaCinematicPhase()
}

function endMakiShibuyaCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (cam && cine.savedMaxZoom != null) cam.maxZoom = cine.savedMaxZoom   // restore the normal zoom cap
  // Release the held reveal pose so normal Shibuya gameplay animations resume. The moveset swap + buff are
  // already live from the trigger — this just stops forcing the sprite.
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null; cine.burst = false
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearMakiShibuyaCinematic() {
  if (cine.active || cine._cam) endMakiShibuyaCinematic()
}

// DRAW (fullscreen overlay) — a brief ORANGE-RED cursed-energy radial flash at the BURST beat, keeping the
// transformation visually continuous with the black-costume Shibuya form's cursed-tool colour.
export function drawMakiShibuyaCinematic(ctx, canvas) {
  if (!cine.active || !ctx || !canvas) return
  const d = Math.abs(cine.frame - T_BURST)
  if (d < 16) {
    const a = (1 - d / 16) * 0.5
    ctx.save()
    const cx = canvas.width / 2, cy = canvas.height / 2
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.62)
    g.addColorStop(0, `rgba(255,138,92,${a})`)        // #ff8a5c — bright cursed-ember
    g.addColorStop(0.5, `rgba(226,64,40,${a * 0.5})`) // #e24028 — deep red
    g.addColorStop(1, "rgba(120,20,12,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }
}
