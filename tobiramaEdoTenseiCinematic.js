// tobiramaEdoTenseiCinematic.js
// Tobirama — EDO TENSEI activation + end cinematics. A frozen combat cinematic mirroring the shared
// XCinematic.js contract (activate / isActive / update / draw / clear / getStatus). game.updateBattle()
// freezes combat while isEdoTenseiCinematicActive(): it calls updateEdoTenseiCinematic({camera,sound,
// worldWidth}) + camera.advance() and returns early — NEITHER fighter can act (same contract as the
// Godspeed / Flash Time / Beerus cinematics). The outer freeze is ALSO why the Edo Tensei energy drain
// pauses during a nested inner ultimate: while any cinematic runs, updatePlayerCombat (which drains the
// vessel's energy) never runs.
//
// ACTIVATION ("in"):  jump-to-edge → hand-seals → a GIANT summoning coffin rises → it opens revealing
//   the vessel's idle → onResolve (the body-swap) → the coffin CLOSES (the rise frames in REVERSE) →
//   camera settles → control hands to the vessel.
// END ("out"):        camera pans onto the vessel → the coffin rises → the vessel runs back inside →
//   onResolve (revert to Tobirama) → the coffin closes → settle → control reverts to Tobirama.
//
// The coffin (edo_tense_effect_part_2, 10f) plays FORWARD to rise/open and BACKWARD to close (reuse the
// one asset reversed — no separate closing art). Sprites are drawn in SCREEN space at canvas-height
// fractions (the giant-scale approach used by Netero's Guanyin / Itachi's Susanoo), positioned relative
// to the caster's live screen position so the overlay lines up with the world-rendered fighter.
import { sound as globalSound, SFX } from "./sound.js"
import { characters } from "./characters.js"

const CINE_ZOOM = 1.28
const COFFIN = { src: "./tobirama_edo_tense_effect_part_2_uniform.png", w: 51, h: 86, frames: 10 }
const RIFT   = { src: "./tobirama_edo_tense_effect_part_1_uniform.png", w: 71, h: 69, frames: 1 }

// ── ACTIVATION timeline (frames @60fps) ──────────────────────────────────────
const IN = { JUMP: 26, SEALS: 68, RISE: 112, REVEAL: 146, SWAP: 144, CLOSE: 176, TOTAL: 196 }
// ── END timeline ─────────────────────────────────────────────────────────────
const OUT = { PAN: 30, RISE: 72, RUNIN: 104, REVERT: 104, CLOSE: 140, TOTAL: 160 }

const _imgs = {}
function _img(src) { if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im } return _imgs[src] }
function _drawSprite(ctx, img, sheet, frameIdx, cx, cy, dh, flip = 1) {
  if (!img.complete || img.naturalWidth === 0) return false
  const scale = dh / sheet.h, dw = sheet.w * scale
  ctx.save(); ctx.translate(cx, cy); ctx.scale(flip, 1)
  ctx.drawImage(img, frameIdx * sheet.w, 0, sheet.w, sheet.h, -dw / 2, -dh / 2, dw, dh)
  ctx.restore(); return true
}

const cine = {
  active: false, mode: "in", frame: 0, caster: null, opponent: null, vesselKey: null,
  onResolve: null, resolved: false, edgeX: null, startX: null, _cam: null, savedMaxStep: null, savedMaxZoom: null
}

// caster = the Tobirama fighter. For "in", vesselKey + onResolve(=applyEdoTensei). For "out", onResolve(=revert).
export function activateEdoTenseiCinematic(caster, opponent, mode, vesselKey, onResolve, worldWidth) {
  if (!caster) return false
  cine.active = true; cine.mode = mode; cine.frame = 0; cine.caster = caster; cine.opponent = opponent || null
  cine.vesselKey = vesselKey || caster._edoVessel || null
  cine.onResolve = onResolve || null; cine.resolved = false
  cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null
  cine.startX = caster.x
  // Jump-back target: the near arena edge (away from the opponent).
  const w = caster.w || 60
  const back = (caster.facing || 1) >= 0 ? -1 : 1
  cine.edgeX = back < 0 ? 24 : Math.max(24, (worldWidth || 1280) - w - 24)
  return true
}
export function isEdoTenseiCinematicActive() { return cine.active }
export function getEdoTenseiCinematicStatus() {
  return { active: cine.active, mode: cine.mode, frame: cine.frame, resolved: cine.resolved,
           total: cine.mode === "in" ? IN.TOTAL : OUT.TOTAL, vessel: cine.vesselKey }
}

export function updateEdoTenseiCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame
  const c = cine.caster

  if (f === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08; cine.savedMaxZoom = cam.maxZoom; cam.maxZoom = Math.max(cam.maxZoom, CINE_ZOOM) }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
  }

  if (cine.mode === "in") _updateIn(f, c, cam, snd)
  else                    _updateOut(f, c, cam, snd)

  cine.frame++
  const total = cine.mode === "in" ? IN.TOTAL : OUT.TOTAL
  if (cine.frame >= total) endEdoTenseiCinematic()
  return getEdoTenseiCinematicStatus()
}

function _resolveOnce() { if (!cine.resolved) { cine.resolved = true; try { cine.onResolve?.() } catch (_) {} } }

function _updateIn(f, c, cam, snd) {
  // JUMP — Tobirama leaps to the near edge (hand-seals pose held from here on).
  if (f < IN.JUMP) {
    if (c) { const t = f / IN.JUMP; c.x = cine.startX + (cine.edgeX - cine.startX) * t; c._spriteCastMove = "tobiEdoCast"; c._spriteCastTimer = IN.TOTAL - f; c.vx = 0; c.vy = 0 }
  } else if (c) { c.x = cine.edgeX; c._spriteCastMove = "tobiEdoCast"; c._spriteCastTimer = IN.TOTAL - f }
  // camera holds on Tobirama through the seals, eases to frame the coffin once it rises.
  if (cam && c && cam.focusOnFighter) cam.focusOnFighter(c, CINE_ZOOM)
  if (cam && cam.shake) {
    if (f === IN.RISE - 30) cam.shake(10, 12)
    else if (f >= IN.RISE - 30 && f < IN.REVEAL && f % 6 === 0) cam.shake(6, 8)
    else if (f === IN.SWAP) cam.shake(18, 20)
  }
  if (f === IN.SEALS) { try { snd?.play?.(SFX.HIT_PROJECTILE) } catch (_) {} }
  if (f === IN.SWAP) _resolveOnce()   // body-swap at the reveal peak; the coffin then closes over the transition
}

function _updateOut(f, c, cam, snd) {
  if (c) { c.vx = 0; c.vy = 0 }
  if (cam && c && cam.focusOnFighter) cam.focusOnFighter(c, CINE_ZOOM)
  // RUN-IN — the vessel steps toward the coffin (a short walk) before being sealed away.
  if (f >= OUT.RISE && f < OUT.RUNIN && c) { c._spriteCastMove = null; c.currentMove = null }
  if (cam && cam.shake) {
    if (f === OUT.RISE - 20) cam.shake(9, 10)
    else if (f === OUT.REVERT) cam.shake(16, 18)
  }
  if (f === OUT.REVERT) _resolveOnce()   // revert to Tobirama as the coffin seals
}

function endEdoTenseiCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (cam && cine.savedMaxZoom != null) cam.maxZoom = cine.savedMaxZoom
  _resolveOnce()   // safety: guarantee the swap/revert even if the timeline was cut short
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null; cine.vesselKey = null
  cine.onResolve = null; cine.resolved = false; cine._cam = null; cine.savedMaxStep = null; cine.savedMaxZoom = null
}
export function clearEdoTenseiCinematic() { if (cine.active || cine._cam) endEdoTenseiCinematic() }

// ── DRAW — screen-space overlay on the frozen world ──────────────────────────
// Coffin frame: 0→(frames-1) rising/opening, then reversed while closing (reuse the asset backwards).
function _coffinFrame(phaseP, closing) {
  const idx = Math.min(COFFIN.frames - 1, Math.floor(phaseP * COFFIN.frames))
  return closing ? (COFFIN.frames - 1 - idx) : idx
}
export function drawEdoTenseiCinematic(ctx, canvas) {
  if (!cine.active || !ctx || !canvas) return
  const cw = canvas.width, ch = canvas.height, f = cine.frame, c = cine.caster
  const cam = cine._cam
  // Caster's live screen position (so the coffin lines up with the world-rendered fighter).
  const z = cam ? cam.zoom : 1
  const casterSX = cam && c ? (c.x + (c.w || 60) / 2 - cam.x) * z + cw / 2 : cw / 2
  const groundSY = cam && c ? (c.y + (c.h || 100) - cam.y) * z + ch / 2 : ch * 0.7
  const face = (c?.facing ?? 1) >= 0 ? 1 : -1
  // dark summoning vignette (subtle — both fighters still read)
  ctx.save(); ctx.globalAlpha = 0.34; ctx.fillStyle = "#0a0d14"; ctx.fillRect(0, 0, cw, ch); ctx.restore()

  const coffinX = casterSX + face * cw * 0.16
  const coffinH = ch * 0.62                        // GIANT — a towering tomb, far bigger than a prop
  const img = _img(COFFIN.src)

  if (cine.mode === "in") {
    // RIFT crack flashes at the coffin's base just before it rises.
    if (f >= IN.SEALS && f < IN.RISE) {
      const a = Math.sin(((f - IN.SEALS) / (IN.RISE - IN.SEALS)) * Math.PI)
      ctx.save(); ctx.globalAlpha = 0.7 * a; _drawSprite(ctx, _img(RIFT.src), RIFT, 0, coffinX, groundSY - 6, ch * 0.10); ctx.restore()
    }
    if (f >= IN.RISE - 6) {
      const closing = f >= IN.CLOSE
      const phaseP = closing ? (f - IN.CLOSE) / (IN.TOTAL - IN.CLOSE)
                             : Math.min(1, (f - (IN.RISE - 6)) / (IN.REVEAL - (IN.RISE - 6)))
      const riseUp = Math.min(1, (f - (IN.RISE - 6)) / 22)          // slides up out of the ground
      const cy = groundSY - coffinH / 2 * riseUp
      _drawSprite(ctx, img, COFFIN, _coffinFrame(phaseP, closing), coffinX, cy, coffinH, face)
      // vessel idle revealed IN FRONT of the opened coffin's dark interior (REVEAL → SWAP). Drawn at
      // NORMAL fighter scale (the vessel's real sprite height mapped to the cinematic zoom) — NOT resized
      // to fill the giant coffin — so it reads at the same size it'll be once control hands over.
      if (!closing && f >= IN.REVEAL - 24 && cine.vesselKey) _drawVesselIdle(ctx, coffinX, groundSY, _vesselNormalH(ch), -face)
    }
  } else {
    // END — coffin rises, vessel runs in, coffin closes.
    if (f >= OUT.RISE - 6) {
      const closing = f >= OUT.CLOSE
      const phaseP = closing ? (f - OUT.CLOSE) / (OUT.TOTAL - OUT.CLOSE)
                             : Math.min(1, (f - (OUT.RISE - 6)) / (OUT.RUNIN - (OUT.RISE - 6)))
      const riseUp = Math.min(1, (f - (OUT.RISE - 6)) / 22)
      _drawSprite(ctx, img, COFFIN, _coffinFrame(phaseP, closing), coffinX, groundSY - coffinH / 2 * riseUp, coffinH, face)
    }
  }
}

// Screen-space height for the revealed vessel at NORMAL (non-giant) fighter scale: its real sprite
// height × spriteScale × the cinematic zoom, clamped to a sane band so odd sheets never balloon/vanish.
function _vesselNormalH(ch) {
  const vessel = characters[cine.vesselKey]
  const idleH = vessel?.animationData?.idle?.height || 90
  const scale = vessel?.spriteScale || 1
  return Math.min(ch * 0.34, Math.max(ch * 0.14, idleH * scale * CINE_ZOOM))
}

function _drawVesselIdle(ctx, cx, groundSY, dh, flip) {
  const key = cine.vesselKey
  const idle = characters[key]?.animationData?.idle
  if (!idle?.sheet) return
  // Part 2 — the vessel rises already REANIMATED (near-black desaturated __reanim sheet), matching the
  // in-match body-swap. Falls back to the canonical sheet if the reanim asset is missing/unloaded.
  const reanim = _img(idle.sheet.replace(/\.(png|jpe?g)$/i, "__reanim.png"))
  const img = (reanim.complete && reanim.naturalWidth > 0) ? reanim : _img(idle.sheet)
  const sheet = { w: idle.width || 48, h: idle.height || 90, frames: idle.frames || 1 }
  const fi = Math.floor(cine.frame / 8) % sheet.frames
  const scale = dh / sheet.h, dw = sheet.w * scale
  if (!img.complete || img.naturalWidth === 0) return
  ctx.save(); ctx.globalAlpha = 0.96; ctx.translate(cx, groundSY - dh / 2); ctx.scale(flip, 1)
  ctx.drawImage(img, fi * sheet.w, 0, sheet.w, sheet.h, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}
