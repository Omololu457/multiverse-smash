// tojiReincarnationCinematic.js
// TOJI FUSHIGURO — REINCARNATED FORM activation cinematic (a frozen combat cinematic). Mirrors
// hisokaOverdriveCinematic.js EXACTLY (same activate / isActive / getPhase / getStatus / update / draw /
// clear contract; NOT a parallel system), differing only in framing colour — Toji's crimson Reincarnated
// aura (matching the TOJI_REINCARNATED_TINT crimson wash in sprite.js) vs Hisoka's gold. Reincarnated Form
// is a SELF power-up, so — like Overdrive / Godspeed — it ISOLATES the caster (focusOnFighter) rather than
// framing between the two fighters.
//   • abilities.executeTojiUltimate() applies the Reincarnated-Form buff + crimson tint (enterTojiReincarnatedForm),
//     then calls activateTojiReincarnationCinematic(caster, opponent). This is the MANUAL, player-chosen cast —
//     it does NOT require critical HP and is INDEPENDENT of the automatic two-stage comeback (that path skips
//     this cinematic; it is a mid-combat life-save, not a frozen ceremony).
//   • game.updateBattle() freezes combat while isTojiReincarnationCinematicActive(): it calls
//     updateTojiReincarnationCinematic({camera, sound}) + camera.advance() and returns early (same contract
//     used for Overdrive / Godspeed / Adult Form). Neither fighter can act during the sequence.
//   • The camera pushes IN on Toji, holds as the crimson cursed aura builds, a transformation BURST fires,
//     then it eases back to the normal 1.0 framing and combat resumes (Reincarnated Form is now live).
import { sound as globalSound, SFX } from "./sound.js"

const CINE_ZOOM = 1.75                 // isolate-push framing on Toji (tight, like the other transforms)
// TIMELINE (frames @60fps) — ~150f (~2.5s), the same ballpark as the other transform cinematics:
//   PUSH   [0,45)     camera pushes in + isolates Toji; the crimson cursed aura builds
//   HOLD   [45,105)   held close on the aura swell; rumble escalates
//   BURST  @105       transformation completes — crimson flash + hard shake
//   SETTLE [105,150)  camera eases back out to the normal 1.0 game view, then resume
const T_PUSH_END = 45, T_BURST = 105, T_SETTLE_END = 150, T_TOTAL = 150

const cine = { active: false, frame: 0, caster: null, opponent: null, _cam: null, savedMaxStep: null, savedMaxZoom: null, burst: false }

export function activateTojiReincarnationCinematic(caster, opponent) {
  if (!caster) return false
  cine.active = true; cine.frame = 0; cine.caster = caster; cine.opponent = opponent || null
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null; cine.burst = false
  return true
}

export function isTojiReincarnationCinematicActive() { return cine.active }

export function getTojiReincarnationCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  return f < T_PUSH_END ? "push" : f < T_BURST ? "hold" : f < T_SETTLE_END ? "settle" : "done"
}

export function getTojiReincarnationCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getTojiReincarnationCinematicPhase(), total: T_TOTAL, burst: cine.burst }
}

// UPDATE (per frame while active; game.js freezes combat around this)
export function updateTojiReincarnationCinematic(ctx = {}) {
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

  // Camera: ISOLATE + push in on Toji through PUSH/HOLD/BURST, then ease the zoom back to 1.0 on SETTLE.
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
    try { snd?.play?.(SFX.HIT_PROJECTILE) } catch (_) {}   // aura snap on the completion beat
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endTojiReincarnationCinematic()
  return getTojiReincarnationCinematicPhase()
}

function endTojiReincarnationCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (cam && cine.savedMaxZoom != null) cam.maxZoom = cine.savedMaxZoom   // restore the normal zoom cap
  // Release any held cast pose so normal (now Reincarnated-Form-tinted) gameplay animations resume — the
  // buff + crimson tint are already live from the trigger; this just stops forcing the hold pose.
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null; cine.burst = false
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearTojiReincarnationCinematic() {
  if (cine.active || cine._cam) endTojiReincarnationCinematic()
}

// DRAW (fullscreen overlay) — a brief crimson radial flash at the BURST beat, matching the Reincarnated
// Form's crimson wash (sprite.js TOJI_REINCARNATED_TINT), keeping the transformation visually continuous.
export function drawTojiReincarnationCinematic(ctx, canvas) {
  if (!cine.active || !ctx || !canvas) return
  const d = Math.abs(cine.frame - T_BURST)
  if (d < 16) {
    const a = (1 - d / 16) * 0.5
    ctx.save()
    const cx = canvas.width / 2, cy = canvas.height / 2
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.62)
    g.addColorStop(0, `rgba(226,43,45,${a})`)        // #e22b2d — the crimson Reincarnated aura core
    g.addColorStop(0.5, `rgba(150,20,28,${a * 0.5})`) // deep blood-crimson mid
    g.addColorStop(1, "rgba(60,10,14,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }
}
