// sasukeCinematic.js
// Sasuke SHARINGAN-AWAKENING cinematic — the punctuation beat on Susanoo's
// Level 1 → Level 2 escalation (the SECOND ultimate press). Mirrors kurama.js's
// ultimate-cinematic shape EXACTLY (the one system that truly FREEZES combat):
//   • abilities.executeSasukeUltimate() (stage 1 re-press) calls
//     activateSasukeEyesCinematic(caster, onResolve) instead of escalating instantly.
//   • updateBattle() freezes combat while isSasukeCinematicActive(): it calls
//     updateSasukeCinematic({camera, sound}) + camera.advance() and returns early
//     (no physics/combat that frame) — the SAME contract game.js uses for Kurama.
//   • drawBattle() calls drawSasukeCinematic(ctx, canvas) as a fullscreen, screen-
//     space overlay drawn ON TOP of the frozen world.
//   • the Level-2 escalation (_enterSusanooStage(2) + energy drain) is applied by
//     onResolve() at the cinematic's RESOLVE beat — so the stat/sprite swap lands
//     as the cinematic ends, not before it starts.
//   • every reset path calls clearSasukeCinematic().
//
// ASSET: sasuke_eyes.png (443x294) — a VERTICAL strip of 4 eye-state rows, each a
// left+right eye PAIR. Row rects were gap-scanned + overlay-verified (2026-07-17,
// sasuke_eyes_ROWS.png): the rows are NON-uniform (a naive H/4 mis-cuts), so slices
// are an explicit per-row {sy, sh} table, NOT height/4 * index.
//
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — short: a punctuation beat, not a 2nd ultimate.
//   FLASH        [0,10)     10f ~0.17s  white awakening pop; camera snaps to a face close-up
//   EYE_SEQUENCE [10,114)  104f ~1.73s  step the 4 rows top→bottom (26f each): normal →
//                                        closing → 2-tomoe → 3-tomoe Sharingan
//   RESOLVE      [114,134)  20f ~0.33s  red/white pop, eyes fade; Lv2 escalation applied @start
// ─────────────────────────────────────────────────────────────────
export const SASUKE_EYES_TIMELINE = { FLASH: 10, EYE_SEQUENCE: 104, RESOLVE: 20 }
const EYE_ROWS   = 4
const PER_ROW    = SASUKE_EYES_TIMELINE.EYE_SEQUENCE / EYE_ROWS               // 26
const T_FLASH_END = SASUKE_EYES_TIMELINE.FLASH                                // 10
const T_EYES_END  = T_FLASH_END + SASUKE_EYES_TIMELINE.EYE_SEQUENCE           // 114
const T_TOTAL     = T_EYES_END  + SASUKE_EYES_TIMELINE.RESOLVE                // 134

// Per-row source rects into sasuke_eyes.png (443x294) — gap-scanned content bands,
// top→bottom = normal → closing → 2-tomoe → 3-tomoe. Full width (both eyes).
const EYE_SHEET_W = 443
const EYE_ROW_RECTS = [
  { sy: 11,  sh: 63 },   // 0 normal
  { sy: 93,  sh: 31 },   // 1 closing / squint (thin)
  { sy: 138, sh: 56 },   // 2 two-tomoe
  { sy: 202, sh: 63 }    // 3 three-tomoe (Mangekyo-adjacent)
]

// Close-up zoom on Sasuke's face while the eyes awaken (camera maxZoom is 1.15).
const CLOSEUP_ZOOM = 1.15

const cine = {
  active: false,
  frame: 0,
  caster: null,
  onResolve: null,
  resolved: false,
  _cam: null,
  savedMaxStep: null
}

// ── lazy image cache (mirrors kurama.art) — never blank: draw guards on load ──
let _eyesImg = null
function eyesImg() {
  if (!_eyesImg) { _eyesImg = new Image(); _eyesImg.src = "./sasuke_eyes.png" }
  return _eyesImg
}
function _ready(img) { return !!(img && img.complete && img.naturalWidth > 0) }

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeSasukeUltimate on the Lv1 re-press)
// onResolve(): applies the actual Lv2 escalation — invoked once at RESOLVE.
// ─────────────────────────────────────────────────────────────────
export function activateSasukeEyesCinematic(caster, onResolve) {
  if (!caster) return false
  eyesImg()                        // preload so the strip never pops in mid-cinematic
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.onResolve = typeof onResolve === "function" ? onResolve : null
  cine.resolved = false
  cine._cam = null
  cine.savedMaxStep = null
  return true
}

export function isSasukeCinematicActive() { return cine.active }

export function getSasukeCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_FLASH_END) return "flash"
  if (f < T_EYES_END)  return "eyes"
  return "resolve"
}

// Test/harness status snapshot — active flag, frame, phase, current eye row, total length.
export function getSasukeCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getSasukeCinematicPhase(), row: cine.active ? currentEyeRow() : null, total: T_TOTAL }
}

// Current eye row index (0..3) during the EYE_SEQUENCE beat.
function currentEyeRow() {
  const f = cine.frame
  if (f < T_FLASH_END) return 0
  if (f >= T_EYES_END) return EYE_ROWS - 1
  return Math.min(EYE_ROWS - 1, Math.floor((f - T_FLASH_END) / PER_ROW))
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateSasukeCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.08          // let the close-up snap in during FLASH
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // awakening boom (shared cue)
  }

  // Camera: hold a tight close-up on Sasuke's face through FLASH+EYES, ease back on RESOLVE.
  if (cam && cine.caster) {
    if (f < T_EYES_END) { if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CLOSEUP_ZOOM) }
    else                { if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0) }
  }
  // Small shake tick as each Sharingan tomoe-stage snaps in.
  if (cam && cam.shake && f >= T_FLASH_END && f < T_EYES_END && (f - T_FLASH_END) % PER_ROW === 0) {
    cam.shake(5, 8)
  }

  // Apply the Level-2 escalation exactly as the cinematic starts to RESOLVE.
  if (f >= T_EYES_END && !cine.resolved) {
    cine.resolved = true
    try { cine.onResolve?.() } catch (_) {}
    if (cam && cam.shake) cam.shake(10, 12)
    try { snd?.play?.(SFX.HIT_HEAVY) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endSasukeCinematic()
  return getSasukeCinematicPhase()
}

function endSasukeCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // The close-up left the camera zoomed TIGHT on Sasuke's face; Lv2 is now a (taller) giant. Clear
  // the giant-framed latch so the next camera.update() SNAPS straight to the full Lv2 framing
  // instead of slowly zooming back out (during which the towering head would be clipped).
  if (cam) cam._giantFramed = false
  // Safety: if we somehow ended before RESOLVE applied the escalation, apply it now
  // so a Lv1 re-press can never get "eaten" by an interrupted cinematic.
  if (!cine.resolved) { try { cine.onResolve?.() } catch (_) {} }
  cine.active = false
  cine.frame = 0
  cine.caster = null
  cine.onResolve = null
  cine.resolved = false
  cine._cam = null
  cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu).
export function clearSasukeCinematic() {
  if (cine.active || cine._cam) endSasukeCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen, SCREEN space, on top of the frozen world (guarded)
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawSasukeCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame

  // Darkened backdrop so the frozen scene recedes and the eyes lead. Ramps in over
  // FLASH, holds through the sequence, fades on RESOLVE.
  let backdrop = 0
  if (f < T_FLASH_END)      backdrop = (f / T_FLASH_END) * 0.72
  else if (f < T_EYES_END)  backdrop = 0.72
  else                      backdrop = 0.72 * (1 - (f - T_EYES_END) / SASUKE_EYES_TIMELINE.RESOLVE)
  _flash(ctx, cw, ch, "#0a0410", backdrop)

  // The eye row (both eyes), centered, large. Width fixed so all rows read at the
  // same facial scale; height follows each row's native aspect (closing eyes = thin).
  const row = currentEyeRow()
  const rect = EYE_ROW_RECTS[row]
  const img = eyesImg()
  const isSharingan = row >= 2
  const destW = cw * 0.66
  const destH = destW * (rect.sh / EYE_SHEET_W)
  const cx = cw / 2
  const cy = ch * 0.44
  // subtle per-row pop: eyes scale up a touch right as a new row snaps in
  const intoRow = f < T_FLASH_END ? 0 : ((f - T_FLASH_END) % PER_ROW) / PER_ROW
  const pop = 1 + (1 - Math.min(1, intoRow * 3)) * 0.06

  ctx.save()
  // Sharingan red glow behind the eyes on rows 2–3
  if (isSharingan) {
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, destW * 0.6)
    g.addColorStop(0, "rgba(220,20,20,0.5)"); g.addColorStop(1, "rgba(220,20,20,0)")
    ctx.fillStyle = g
    ctx.beginPath(); ctx.ellipse(cx, cy, destW * 0.6, destH * 1.6, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.imageSmoothingEnabled = true
  if (_ready(img)) {
    const dw = destW * pop, dh = destH * pop
    ctx.drawImage(img, 0, rect.sy, EYE_SHEET_W, rect.sh, cx - dw / 2, cy - dh / 2, dw, dh)
  } else {
    // Fallback: two glowing ovals so the beat still reads if the sheet is slow to load.
    ctx.fillStyle = isSharingan ? "#d21414" : "#1a2030"
    for (const sgn of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + sgn * destW * 0.24, cy, destW * 0.18, destH * 0.5, 0, 0, Math.PI * 2); ctx.fill()
    }
  }
  ctx.restore()

  // FLASH white pop at the very start, and a red awakening pop at RESOLVE.
  if (f < T_FLASH_END) _flash(ctx, cw, ch, "#ffffff", (1 - f / T_FLASH_END) * 0.85)
  if (f >= T_EYES_END) {
    const rp = (f - T_EYES_END) / SASUKE_EYES_TIMELINE.RESOLVE
    _flash(ctx, cw, ch, "#ff1a1a", Math.max(0, 0.5 - rp) )
    if (rp < 0.3) _flash(ctx, cw, ch, "#ffffff", (0.3 - rp) * 1.6)
  }
}
