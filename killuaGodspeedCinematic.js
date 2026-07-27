// killuaGodspeedCinematic.js
// Killua GODSPEED activation cinematic — a frozen combat cinematic. Mirrors gokuBlackSwordCinematic.js
// EXACTLY (the same activate / isActive / getStatus / update / draw / clear contract; NOT a parallel
// system), differing only in framing: this ISOLATES Killua (focusOnFighter — the SSJ-Rose / Mangekyou
// single-fighter framing) rather than the sword's focusBetween, because Godspeed is a self-buff, not an
// attack that lands on the opponent.
//   • abilities.executeKilluaUltimate() applies the Godspeed buff, then calls
//     activateKilluaGodspeedCinematic(caster, opponent) and holds Killua's charge-up pose (the SAME blue
//     electric charge aura established by his charge animation — carried through, no new colour).
//   • game.updateBattle() freezes combat while isKilluaGodspeedCinematicActive(): it calls
//     updateKilluaGodspeedCinematic({camera, sound}) + camera.advance() and returns early (same contract
//     used for the sword slash / SSJ Rose). Neither fighter can act during the sequence.
//   • The camera pushes IN on Killua, holds through the charge-up, a transformation BURST fires, then it
//     eases back to the normal 1.0 framing and combat resumes (Godspeed is now live).
import { sound as globalSound, SFX } from "./sound.js"

const CINE_ZOOM = 1.75                 // isolate-push framing on Killua (tight, like SSJ Rose's transform)
// TIMELINE (frames @60fps) — ~150f (~2.5s), the same ballpark as the other transform cinematics:
//   PUSH   [0,45)     camera pushes in + isolates Killua; the blue charge aura builds
//   HOLD   [45,105)   held close on the charge-up; rumble escalates
//   BURST  @105       transformation completes — cyan flash + hard shake
//   SETTLE [105,150)  camera eases back out to the normal 1.0 game view, then resume
const T_PUSH_END = 45, T_BURST = 105, T_SETTLE_END = 150, T_TOTAL = 150

const cine = { active: false, frame: 0, caster: null, opponent: null, _cam: null, savedMaxStep: null, savedMaxZoom: null, burst: false }

export function activateKilluaGodspeedCinematic(caster, opponent) {
  if (!caster) return false
  cine.active = true; cine.frame = 0; cine.caster = caster; cine.opponent = opponent || null
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null; cine.burst = false
  return true
}

export function isKilluaGodspeedCinematicActive() { return cine.active }

export function getKilluaGodspeedCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  return f < T_PUSH_END ? "push" : f < T_BURST ? "hold" : f < T_SETTLE_END ? "settle" : "done"
}

export function getKilluaGodspeedCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getKilluaGodspeedCinematicPhase(), total: T_TOTAL, burst: cine.burst }
}

// UPDATE (per frame while active; game.js freezes combat around this)
export function updateKilluaGodspeedCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08     // let the push settle, never snaps
      cine.savedMaxZoom = cam.maxZoom;     cam.maxZoom = CINE_ZOOM     // lift the normal 1.15 cap so the push-in reads
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom (same as sword / SSJ Rose)
  }

  // Camera: ISOLATE + push in on Killua through PUSH/HOLD/BURST, then ease the zoom back to 1.0 on SETTLE.
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
      cam.shake(20, 24)
    } else if (f > T_BURST && f < T_SETTLE_END && f % 8 === 0) {
      cam.shake(6, 8)
    }
  }

  if (f === T_BURST && !cine.burst) {
    cine.burst = true
    try { snd?.play?.(SFX.HIT_PROJECTILE) } catch (_) {}   // electric snap on the completion beat
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endKilluaGodspeedCinematic()
  return getKilluaGodspeedCinematicPhase()
}

function endKilluaGodspeedCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (cam && cine.savedMaxZoom != null) cam.maxZoom = cine.savedMaxZoom   // restore the normal zoom cap
  // Release the held charge-up pose so normal gameplay animations resume (the Godspeed buff + afterimage
  // overlay are already live from the trigger — this just stops forcing the charge sprite).
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null; cine.burst = false
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearKilluaGodspeedCinematic() {
  if (cine.active || cine._cam) endKilluaGodspeedCinematic()
}

// DRAW (fullscreen overlay) — a brief cyan radial flash at the BURST beat. Uses the charge aura's own
// blue/cyan family (no new colour), keeping the transformation visually continuous with the charge-up.
export function drawKilluaGodspeedCinematic(ctx, canvas) {
  if (!cine.active || !ctx || !canvas) return
  const d = Math.abs(cine.frame - T_BURST)
  if (d < 16) {
    const a = (1 - d / 16) * 0.5
    ctx.save()
    const cx = canvas.width / 2, cy = canvas.height / 2
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.62)
    g.addColorStop(0, `rgba(125,211,252,${a})`)     // #7dd3fc — the charge aura's cyan
    g.addColorStop(0.5, `rgba(56,189,248,${a * 0.5})`)
    g.addColorStop(1, "rgba(29,78,216,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }
}
