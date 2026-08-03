// chrolloSkillHunterCinematic.js
// Chrollo SKILL HUNTER activation cinematic — a frozen combat cinematic. Mirrors
// gonAdultFormCinematic.js / killuaGodspeedCinematic.js EXACTLY (same activate / isActive / getStatus /
// update / draw / clear contract), differing only in framing/colour and in that it fires an onResolve
// callback at the SWAP beat (like tobiramaEdoTenseiCinematic) — that callback runs applySkillHunter,
// turning Chrollo into a full live copy of the opponent.
//   • abilities.executeChrolloUltimate() holds Chrollo's transformation pose (_spriteCastMove =
//     "chSkillHunterCast" — book windup → purple robe swirl → envelop, chrollo_skillhunter_cast_uniform.png)
//     and calls activateChrolloSkillHunterCinematic(caster, opponent, onResolve).
//   • game.updateBattle() freezes combat while isChrolloSkillHunterCinematicActive(): it calls
//     updateChrolloSkillHunterCinematic({camera, sound}) + camera.advance() and returns early. Neither
//     fighter can act during the sequence.
//   • The camera pushes IN on Chrollo, holds through the robe swirl, the SWAP fires (Chrollo becomes the
//     opponent's copy) on a purple flash + hard shake, then it eases back to the normal 1.0 framing.
import { sound as globalSound, SFX } from "./sound.js"

const CINE_ZOOM = 1.7
// TIMELINE (frames @60fps) — ~138f (~2.3s):
//   PUSH   [0,45)     camera pushes in + isolates Chrollo; the book windup / robe rises
//   HOLD   [45,84)    held close on the robe swirl; rumble escalates
//   SWAP   @84        the body-swap fires (applySkillHunter via onResolve) — purple flash + hard shake
//   SETTLE [84,138)   camera eases back out to the normal 1.0 game view, then resume as the copy
const T_PUSH_END = 45, T_SWAP = 84, T_SETTLE_END = 138, T_TOTAL = 138

const cine = { active: false, frame: 0, caster: null, opponent: null, onResolve: null, resolved: false, _cam: null, savedMaxStep: null, savedMaxZoom: null }

export function activateChrolloSkillHunterCinematic(caster, opponent, onResolve) {
  if (!caster) return false
  cine.active = true; cine.frame = 0; cine.caster = caster; cine.opponent = opponent || null
  cine.onResolve = typeof onResolve === "function" ? onResolve : null; cine.resolved = false
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null
  return true
}

export function isChrolloSkillHunterCinematicActive() { return cine.active }

export function getChrolloSkillHunterCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  return f < T_PUSH_END ? "push" : f < T_SWAP ? "hold" : f < T_SETTLE_END ? "settle" : "done"
}

export function getChrolloSkillHunterCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getChrolloSkillHunterCinematicPhase(), total: T_TOTAL, resolved: cine.resolved }
}

function _resolveOnce() {
  if (cine.resolved) return
  cine.resolved = true
  try { cine.onResolve && cine.onResolve() } catch (_) {}
}

export function updateChrolloSkillHunterCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08
      cine.savedMaxZoom = cam.maxZoom;     cam.maxZoom = CINE_ZOOM
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
  }

  // Camera: isolate + push in on Chrollo through PUSH/HOLD/SWAP, then ease back to 1.0 on SETTLE.
  if (cam && cine.caster && cam.focusOnFighter) {
    let z = CINE_ZOOM
    if (f >= T_SWAP) z = CINE_ZOOM - (CINE_ZOOM - 1.0) * Math.min(1, (f - T_SWAP) / (T_SETTLE_END - T_SWAP))
    cam.focusOnFighter(cine.caster, z)
  }

  if (cam && cam.shake) {
    if (f >= T_PUSH_END && f < T_SWAP && f % 5 === 0) {
      cam.shake(3 + ((f - T_PUSH_END) / (T_SWAP - T_PUSH_END)) * 7, 8)
    } else if (f === T_SWAP) {
      cam.shake(20, 24)
    } else if (f > T_SWAP && f < T_SETTLE_END && f % 8 === 0) {
      cam.shake(6, 8)
    }
  }

  // SWAP BEAT — fire the body-swap (applySkillHunter) exactly once, as the robe envelops.
  if (f === T_SWAP) {
    _resolveOnce()
    try { snd?.play?.(SFX.HIT_PROJECTILE) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endChrolloSkillHunterCinematic()
  return getChrolloSkillHunterCinematicPhase()
}

function endChrolloSkillHunterCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (cam && cine.savedMaxZoom != null) cam.maxZoom = cine.savedMaxZoom
  _resolveOnce()   // safety: guarantee the swap fired even if the cinematic was cut short
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onResolve = null; cine.resolved = false; cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearChrolloSkillHunterCinematic() {
  if (cine.active || cine._cam) endChrolloSkillHunterCinematic()
}

// DRAW (fullscreen overlay) — a PURPLE radial flash at the SWAP beat (Chrollo's colour / robe purple),
// keeping the transformation visually continuous with the robe swirl.
export function drawChrolloSkillHunterCinematic(ctx, canvas) {
  if (!cine.active || !ctx || !canvas) return
  const d = Math.abs(cine.frame - T_SWAP)
  if (d < 16) {
    const a = (1 - d / 16) * 0.55
    ctx.save()
    const cx = canvas.width / 2, cy = canvas.height / 2
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.62)
    g.addColorStop(0, `rgba(167,139,250,${a})`)       // #a78bfa — bright violet
    g.addColorStop(0.5, `rgba(124,58,237,${a * 0.5})`) // #7c3aed — Chrollo's colour
    g.addColorStop(1, "rgba(76,29,149,0)")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }
}
