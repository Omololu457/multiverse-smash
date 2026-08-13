// tobiramaEdoTenseiCinematic.js
// Tobirama — EDO TENSEI activation + end cinematics. A frozen combat cinematic mirroring the shared
// XCinematic.js contract (activate / isActive / update / draw / clear / getStatus). game.updateBattle()
// freezes combat while isEdoTenseiCinematicActive(): it calls updateEdoTenseiCinematic({camera,sound,
// worldWidth}) + camera.advance() and returns early — NEITHER fighter can act (same contract as the
// Godspeed / Flash Time / Beerus cinematics). The outer freeze is ALSO why the Edo Tensei energy drain
// pauses during a nested inner ultimate: while any cinematic runs, updatePlayerCombat (which drains the
// vessel's energy) never runs.
//
// ACTIVATION ("in"):  jump-to-edge → hand-seals → a towering summoning tomb ERUPTS in front (non-linear
//   ease-out rise) → a black void opens + slides down its face → the vessel emerges as a SLOW-BURN
//   silhouette → full reanimated color at its OWN normal scale → onResolve (the body-swap) → the tomb
//   CLOSES (the rise frames in REVERSE) → camera settles → control hands to the vessel.
//   (These beats mirror Hashirama's own pillar-rise → pillar-open intro; the tomb art already encodes the
//    rise + void-opening, so the cinematic just eases/times it and fades the vessel silhouette→color.)
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
  // TWO-VESSEL FIX: the body-swap at SWAP turns the REAL (world-rendered) caster INTO the vessel, but the
  // cinematic's own vessel OVERLAY (_drawVesselIdle at coffinX, offset from the caster) keeps drawing until
  // CLOSE — so [SWAP, CLOSE) would show TWO copies of the vessel. Hide the real body for exactly that window
  // (renderHybridFighter honours _kuramaHide) so the coffin overlay is the ONLY vessel; at CLOSE the overlay
  // stops and the real vessel takes over at the caster's spot. Before SWAP the real body is still Tobirama
  // (a DIFFERENT character from the emerging vessel) and must stay visible — hence the SWAP lower bound.
  if (c) c._kuramaHide = (f >= IN.SWAP && f < IN.CLOSE)
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
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0; cine.caster._kuramaHide = false }   // clear the two-vessel hide (safety: never leave the body invisible if the cinematic is cut short)
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

  // The tomb rises a clear step IN FRONT of Tobirama (in his facing direction) so he stays visible beside it.
  const coffinX = casterSX + face * cw * 0.19
  // A towering tomb — taller than the emerging vessel so it reads as a coffin they step OUT of — but NOT
  // screen-dominating (the old ch*0.62 read as an oversized black slab that swallowed the frame).
  const coffinH = ch * 0.46
  const img = _img(COFFIN.src)

  if (cine.mode === "in") {
    // RIFT crack flashes at the coffin's base just before it rises.
    if (f >= IN.SEALS && f < IN.RISE) {
      const a = Math.sin(((f - IN.SEALS) / (IN.RISE - IN.SEALS)) * Math.PI)
      ctx.save(); ctx.globalAlpha = 0.7 * a; _drawSprite(ctx, _img(RIFT.src), RIFT, 0, coffinX, groundSY - 6, ch * 0.10); ctx.restore()
    }
    if (f >= IN.RISE - 6) {
      const closing = f >= IN.CLOSE
      // phaseP drives the coffin SHEET (frames 0→5 rising, 6→9 the black void opening + sliding down the
      // face). Eased so the void-opening beats read the same way Hashirama's own pillar-open intro does.
      const phaseP = closing ? (f - IN.CLOSE) / (IN.TOTAL - IN.CLOSE)
                             : Math.min(1, (f - (IN.RISE - 6)) / (IN.REVEAL - (IN.RISE - 6)))
      // NON-LINEAR growth: fast initial rise out of the ground, easing as it nears full height (ease-out
      // cubic) — a heavy tomb erupting then settling, not a linear slide.
      const rt = Math.min(1, (f - (IN.RISE - 6)) / 26)
      const riseUp = closing ? 1 : (1 - Math.pow(1 - rt, 3))
      const cy = groundSY - coffinH / 2 * riseUp
      _drawSprite(ctx, img, COFFIN, _coffinFrame(phaseP, closing), coffinX, cy, coffinH, face)
      // vessel revealed emerging FROM the opened coffin's dark void (REVEAL → SWAP). Drawn at the vessel's
      // OWN NORMAL scale (its real sprite height mapped to the cinematic zoom — see _vesselNormalH) — NEVER
      // resized to fill the giant tomb — and faded in as a SLOW-BURN silhouette → full reanimated color, so
      // it reads at the exact size + look it'll have once control hands over.
      if (!closing && f >= IN.REVEAL - 24 && cine.vesselKey) {
        const revealP = Math.max(0, Math.min(1, (f - (IN.REVEAL - 24)) / 30))   // slow-burn: silhouette → color
        _drawVesselIdle(ctx, coffinX, groundSY, _vesselNormalH(ch), face, revealP)
      }
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

function _drawVesselIdle(ctx, cx, groundSY, dh, flip, revealP = 1) {
  const key = cine.vesselKey
  const idle = characters[key]?.animationData?.idle
  if (!idle?.sheet) return
  const img = _img(idle.sheet)
  const sheet = { w: idle.width || 48, h: idle.height || 90, frames: idle.frames || 1 }
  const fi = Math.floor(cine.frame / 8) % sheet.frames
  const scale = dh / sheet.h, dw = sheet.w * scale
  if (!img.complete || img.naturalWidth === 0) return
  const p = Math.max(0, Math.min(1, revealP))
  // SLOW-BURN REVEAL (mirrors Hashirama's own pillar-open silhouette→color emergence): early on the vessel
  // is a near-black silhouette rising out of the void; it lifts into its final REANIMATED look (the sickly
  // green-gray corpse tint, EDO_REANIM_TINT in sprite.js) as p → 1. Interpolating the filter from a
  // desaturated dark silhouette to the reanim tint gives the "building into full color" beat.
  const bright = 0.06 + 0.94 * p            // 0.06 ≈ black silhouette → 1.0 full
  const sat    = 0.05 + 0.67 * p            // flat silhouette → reanim saturation (0.72)
  const emerge = (1 - p) * dh * 0.18        // starts sunk into the void, rises to stand on the ground
  ctx.save(); ctx.globalAlpha = 0.4 + 0.56 * p
  ctx.filter = `grayscale(${1 - 0.18 * p}) sepia(${0.45 * p}) hue-rotate(${55 * p}deg) saturate(${sat}) brightness(${bright}) contrast(0.92)`
  ctx.translate(cx, groundSY - dh / 2 + emerge); ctx.scale(flip, 1)
  ctx.drawImage(img, fi * sheet.w, 0, sheet.w, sheet.h, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}
