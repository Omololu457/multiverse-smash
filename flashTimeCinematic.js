// flashTimeCinematic.js
// The Flash — FLASH TIME activation cinematic. A frozen combat cinematic that MIRRORS
// killuaGodspeedCinematic.js EXACTLY (same activate / isActive / getStatus / update / draw / clear
// contract; the same isolate-push-in → hold → burst → settle framing), differing only in colour
// (Flash's red / gold lightning instead of Killua's electric cyan). Flash Time is a self-buff, so it
// ISOLATES Flash (focusOnFighter) rather than framing both fighters.
//   • abilities.executeFlashUltimate() applies the Flash Time buff (opponent time-slow + self speed
//     buff + block-lockout + overshoot movement), then calls activateFlashTimeCinematic(caster, opponent)
//     and holds Flash's spinning-up pose.
//   • game.updateBattle() freezes combat while isFlashTimeCinematicActive(): it calls
//     updateFlashTimeCinematic({camera, sound}) + camera.advance() and returns early (same contract as
//     Godspeed / the sword slash). Neither fighter can act during the sequence.
//   • The camera pushes IN on Flash, holds through the spin-up, a speed BURST fires, then it eases back
//     to the normal 1.0 framing and combat resumes (Flash Time is now live).
import { sound as globalSound, SFX } from "./sound.js"

const CINE_ZOOM = 1.75                 // isolate-push framing on Flash (tight; matches Godspeed)
// TIMELINE (frames @60fps) — ~150f (~2.5s), the same ballpark / structure as Godspeed:
//   PUSH   [0,45)     camera pushes in + isolates Flash; the red/gold speed aura builds
//   HOLD   [45,105)   held close on the spin-up; rumble escalates
//   BURST  @105       Flash Time engages — gold flash + hard shake
//   SETTLE [105,150)  camera eases back out to the normal 1.0 game view, then resume
const T_PUSH_END = 45, T_BURST = 105, T_SETTLE_END = 150, T_TOTAL = 150

const cine = { active: false, frame: 0, caster: null, opponent: null, _cam: null, savedMaxStep: null, savedMaxZoom: null, burst: false }

export function activateFlashTimeCinematic(caster, opponent) {
  if (!caster) return false
  cine.active = true; cine.frame = 0; cine.caster = caster; cine.opponent = opponent || null
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null; cine.burst = false
  return true
}

export function isFlashTimeCinematicActive() { return cine.active }

export function getFlashTimeCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  return f < T_PUSH_END ? "push" : f < T_BURST ? "hold" : f < T_SETTLE_END ? "settle" : "done"
}

export function getFlashTimeCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getFlashTimeCinematicPhase(), total: T_TOTAL, burst: cine.burst }
}

// UPDATE (per frame while active; game.js freezes combat around this)
export function updateFlashTimeCinematic(ctx = {}) {
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
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom (same as Godspeed)
  }

  // Camera: ISOLATE + push in on Flash through PUSH/HOLD/BURST, then ease the zoom back to 1.0 on SETTLE.
  if (cam && cine.caster && cam.focusOnFighter) {
    let z = CINE_ZOOM
    if (f >= T_BURST) z = CINE_ZOOM - (CINE_ZOOM - 1.0) * Math.min(1, (f - T_BURST) / (T_SETTLE_END - T_BURST))
    cam.focusOnFighter(cine.caster, z)
  }

  // Rumble: escalates over HOLD, a hard shake on the BURST (Flash Time engages), tremor as it settles.
  if (cam && cam.shake) {
    if (f >= T_PUSH_END && f < T_BURST && f % 5 === 0) {
      cam.shake(3 + ((f - T_PUSH_END) / (T_BURST - T_PUSH_END)) * 7, 8)
    } else if (f === T_BURST) {
      cam.shake(20, 24)
    } else if (f > T_BURST && f < T_SETTLE_END && f % 8 === 0) {
      cam.shake(6, 8)
    }
  }

  if (f === T_BURST && !cine.burst) {
    cine.burst = true
    try { snd?.play?.(SFX.HIT_PROJECTILE) } catch (_) {}   // sharp snap on the engage beat
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endFlashTimeCinematic()
  return getFlashTimeCinematicPhase()
}

function endFlashTimeCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (cam && cine.savedMaxZoom != null) cam.maxZoom = cine.savedMaxZoom   // restore the normal zoom cap
  // Release the held spin-up pose so normal gameplay animations resume (the Flash Time buff + afterimage
  // overlay are already live from the trigger — this just stops forcing the spin pose).
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null; cine.burst = false
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearFlashTimeCinematic() {
  if (cine.active || cine._cam) endFlashTimeCinematic()
}

// DRAW (fullscreen overlay) — a brief red/gold radial flash at the BURST beat (Flash's speed-force
// colours, keeping the transformation visually continuous with the afterimage overlay).
export function drawFlashTimeCinematic(ctx, canvas) {
  if (!cine.active || !ctx || !canvas) return
  const d = Math.abs(cine.frame - T_BURST)
  if (d < 16) {
    const a = (1 - d / 16) * 0.5
    ctx.save()
    const cx = canvas.width / 2, cy = canvas.height / 2
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.62)
    g.addColorStop(0, `rgba(253,224,71,${a})`)        // #fde047 — gold lightning core
    g.addColorStop(0.5, `rgba(232,53,42,${a * 0.55})`) // #e8352a — Flash red
    g.addColorStop(1, "rgba(153,27,27,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }
}
