// mangekyouCinematic.js
// Itachi MANGEKYOU SHARINGAN activation — a brief frozen cinematic that plays the eye
// transformation (3-tomoe Sharingan → Mangekyou pinwheel) as a centered SCREEN-SPACE overlay.
// Mirrors gokuBlackSwordCinematic.js's activate / isActive / update / draw / clear contract and
// the game.js freeze-combat + fullscreen-draw hooks EXACTLY — NOT a parallel system. The BUFF
// itself is applied by abilities.enterMangekyou at activation; this is purely the reveal.
//
// The eye art is ONE continuous timeline: itachi_mangekyou_eye_uniform.png = the two exported
// halves (activated_part_1 → part_2) re-sliced (even-division, debris frame dropped) and packed
// into a single 19-frame strip, so part_1's frames flow straight into part_2's — the SAME eye
// progressively rearranging its tomoe into the final pinwheel, not two separate eyes.
//
// Self-contained: imports only sound.js (no cycle — game.js imports THIS).

import { sound as globalSound, SFX } from "./sound.js"

const EYE_SHEET  = "./itachi_mangekyou_eye_uniform.png"
const EYE_FRAMES = 19
const EYE_FW = 92, EYE_FH = 86
const PER_FRAME  = 4                          // world frames per eye-frame (@60fps)
const HOLD       = 36                         // hold the locked-in pinwheel before combat resumes
const T_MORPH    = EYE_FRAMES * PER_FRAME      // 76
const T_TOTAL    = T_MORPH + HOLD             // 112  (~1.87s)

// Lazy-loaded eye image (browser only; harness decodes it on first draw).
let _img = null
function eyeImg() {
  if (!_img && typeof Image !== "undefined") { _img = new Image(); _img.src = EYE_SHEET }
  return _img
}

const cine = { active: false, frame: 0, caster: null, _cam: null, savedMaxStep: null }

// ── ACTIVATION (called from game.handleChargeRelease right after enterMangekyou succeeds) ──
export function activateMangekyouCinematic(caster) {
  if (!caster) return false
  cine.active = true; cine.frame = 0; cine.caster = caster
  caster.vx = 0
  eyeImg()   // kick off decode
  return true
}

export function isMangekyouCinematicActive() { return cine.active }

export function getMangekyouCinematicStatus() {
  return { active: cine.active, frame: cine.frame, total: T_TOTAL,
           eyeFrame: Math.min(EYE_FRAMES - 1, Math.floor(cine.frame / PER_FRAME)) }
}

// ── UPDATE (per frame while active; game.js freezes combat around this) ──
export function updateMangekyouCinematic(ctx = {}) {
  if (!cine.active) return
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  if (cine.frame === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.1 }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom (Kurama / SSJ Rose / Sword)
  }
  // Isolate-zoom on Itachi during the reveal (SSJ Rose-style single-fighter framing), ease out on hold.
  if (cam && cine.caster && cam.focusOnFighter) cam.focusOnFighter(cine.caster, cine.frame < T_MORPH ? 0.8 : 1.0)
  if (cam && cam.shake && cine.frame === T_MORPH - PER_FRAME) cam.shake(10, 14)   // punch as the pinwheel locks in
  cine.frame++
  if (cine.frame >= T_TOTAL) endMangekyouCinematic()
}

function endMangekyouCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  cine.active = false; cine.frame = 0; cine.caster = null; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearMangekyouCinematic() { if (cine.active || cine._cam) endMangekyouCinematic() }

// ── DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank) ──
export function drawMangekyouCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const cx = cw * 0.5, cy = ch * 0.5

  // Crimson-black vignette: fade in → hold → fade out.
  const FADE = 20
  let backdrop
  if (f < FADE) backdrop = (f / FADE) * 0.62
  else if (f < T_TOTAL - FADE) backdrop = 0.62
  else backdrop = 0.62 * (1 - (f - (T_TOTAL - FADE)) / FADE)
  ctx.save(); ctx.globalAlpha = Math.min(1, Math.max(0, backdrop)); ctx.fillStyle = "#140406"; ctx.fillRect(0, 0, cw, ch); ctx.restore()

  // Pulsing red glow behind the eye.
  ctx.save()
  const pulse = 0.4 + 0.3 * Math.sin(f * 0.3)
  const rad = Math.min(cw, ch) * 0.5
  const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, rad)
  g.addColorStop(0, `rgba(220,40,40,${0.34 * pulse})`)
  g.addColorStop(0.7, "rgba(150,10,10,0.08)")
  g.addColorStop(1, "rgba(150,10,10,0)")
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch)
  ctx.restore()

  // The eye — the SAME eye progressing through the whole 19-frame morph, centered + scaled up.
  const img = eyeImg()
  if (img && img.complete && img.naturalWidth > 0) {
    const dh = Math.min(cw, ch) * 0.52
    const dw = dh * (EYE_FW / EYE_FH)
    const fi = Math.min(EYE_FRAMES - 1, Math.floor(f / PER_FRAME))
    ctx.save()
    ctx.shadowColor = "#ff2a2a"; ctx.shadowBlur = 42
    ctx.drawImage(img, fi * EYE_FW, 0, EYE_FW, EYE_FH, cx - dw / 2, cy - dh / 2, dw, dh)
    ctx.restore()
  }
}
