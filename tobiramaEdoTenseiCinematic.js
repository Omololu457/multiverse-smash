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
// JUMP → the ground CRACKS in three stages, one at a time (CRACK[0..2]) → the tomb BREAKS UP THROUGH the ground (RISE0→RISE1,
// clipped at the ground line, the sheet's own rise frames 0-3) → the face slides open into a black void (OPEN0→OPEN1, frames
// 4-9) → the vessel forms INSIDE the void as a silhouette, then steps OUT of the coffin onto the ground (EMERGE0→STEP→SWAP) →
// body-swap (the real vessel is put exactly where it stepped out: the coffin's spot) → the tomb sinks back into the ground.
const IN = { JUMP: 26, SEALS: 26, CRACK: [30, 42, 54], RISE: 66, RISE1: 100, OPEN1: 128, EMERGE: 122, STEP: 134, REVEAL: 146, SWAP: 144, CLOSE: 176, TOTAL: 196 }
const CRACKS = [{ x: 10, y: 0, w: 53, h: 12 }, { x: 1, y: 22, w: 70, h: 14 }, { x: 0, y: 53, w: 71, h: 16 }]   // rows of tobirama_edo_tense_effect_part_1
const VOID = { x0: 10, x1: 47, y0: 8, y1: 85 }   // the black void inside an opened coffin frame (cell px)
const COFFIN_OFF = 150                            // world px in front of Tobirama (toward the opponent)
const STEP_OUT = 64                               // world px the vessel walks forward OUT of the tomb before control hands over
const hsh = (a, b) => { let v = (a * 374761393 + b * 668265263) >>> 0; v = Math.imul(v ^ (v >>> 13), 1274126177) >>> 0; return ((v ^ (v >>> 16)) >>> 0) / 4294967296 }
// ── END timeline ─────────────────────────────────────────────────────────────
const OUT = { PAN: 30, RISE: 72, RUNIN: 104, REVERT: 104, CLOSE: 140, TOTAL: 160 }

const _imgs = {}
const _tints = {}
function _tinted(img, col) {   // the crack art's alpha as a solid colour (cached) — used for the glowing seams
  if (!img.complete || !img.naturalWidth || typeof document === "undefined") return null
  const k = img.src + col; if (_tints[k]) return _tints[k]
  const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight
  const g = cv.getContext("2d"); g.drawImage(img, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, cv.width, cv.height)
  return (_tints[k] = cv)
}
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
  // the tomb's WORLD spot: a step in front of Tobirama's edge position (the vessel is placed here at the swap)
  const face = (caster.facing || 1) >= 0 ? 1 : -1
  cine.coffinWX = mode === "in" ? Math.max(60, Math.min((worldWidth || 1280) - 60, cine.edgeX + w / 2 + face * COFFIN_OFF)) : null
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

function _vesselWX(c) { const face = (c?.facing ?? 1) >= 0 ? 1 : -1; return cine.coffinWX + face * STEP_OUT }
function _resolveOnce() { if (!cine.resolved) { cine.resolved = true; try { cine.onResolve?.() } catch (_) {} } }

function _updateIn(f, c, cam, snd) {
  // JUMP — Tobirama leaps to the near edge (hand-seals pose held from here on).
  if (f < IN.JUMP) {
    if (c) { const t = f / IN.JUMP; c.x = cine.startX + (cine.edgeX - cine.startX) * t; c._spriteCastMove = "tobiEdoCast"; c._spriteCastTimer = IN.TOTAL - f; c.vx = 0; c.vy = 0 }
  } else if (c && f > IN.SWAP && cine.coffinWX != null) { c.x = _vesselWX(c) - (c.w || 60) / 2 }   // after the swap the vessel stands where it stepped out of the tomb
  else if (c) { c.x = cine.edgeX; c._spriteCastMove = "tobiEdoCast"; c._spriteCastTimer = IN.TOTAL - f }
  // camera holds on Tobirama through the seals, eases to frame the coffin once it rises.
  if (cam && c && cam.focusOnFighter) cam.focusOnFighter(c, CINE_ZOOM)
  if (cam && cam.shake) {
    if (IN.CRACK.includes(f)) cam.shake(7 + IN.CRACK.indexOf(f) * 4, 10)   // each crack stage hits harder
    else if (f === IN.RISE) cam.shake(14, 16)                               // the tomb breaks the ground
    else if (f > IN.RISE && f < IN.RISE1 && f % 5 === 0) cam.shake(6, 6)
    else if (f === IN.STEP) cam.shake(5, 6)
  }
  if (IN.CRACK.includes(f) || f === IN.RISE) { try { snd?.play?.(SFX.HIT_PROJECTILE) } catch (_) {} }
  if (f === IN.SWAP) {
    _resolveOnce()   // body-swap as the vessel finishes stepping out of the tomb
    // the vessel stands exactly where it stepped out (the coffin's spot) — not back at Tobirama's edge
    if (c && cine.coffinWX != null) { c.x = _vesselWX(c) - (c.w || 60) / 2; c.vx = 0; c._spriteCastMove = null; c._spriteCastTimer = 0 }
  }
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
    const cX = cam && cine.coffinWX != null ? (cine.coffinWX - cam.x) * z + cw / 2 : coffinX
    const cellW = COFFIN.w * coffinH / COFFIN.h, cs = coffinH / COFFIN.h
    // 1) GROUND BREAK — the three crack stages appear ONE AT A TIME (each pops in bigger, the last stays under the tomb)
    const rift = _img(RIFT.src)
    for (let i = 0; i < 3; i++) {
      const t0 = IN.CRACK[i], tEnd = i < 2 ? IN.CRACK[i + 1] + 4 : IN.CLOSE
      if (f < t0 || f >= tEnd || !rift.complete || !rift.naturalWidth) continue
      const pop = 1 + 0.25 * Math.max(0, 1 - (f - t0) / 6), fade = i < 2 ? Math.min(1, (tEnd - f) / 4) : 1
      const R = CRACKS[i], dw = cellW * (1.1 + 0.35 * i) * pop, dh = dw * R.h / R.w
      const glow = _tinted(rift, "#8fd8ff"), x0 = cX - dw / 2, y0 = groundSY - dh * 0.55
      ctx.save(); ctx.globalAlpha = fade
      if (glow) {   // the seal-chakra seeping up through each crack (reads on dark AND light floors)
        ctx.globalCompositeOperation = "lighter"; ctx.filter = "blur(5px)"; ctx.globalAlpha = 0.9 * fade * (0.75 + 0.25 * Math.sin(f * 0.5))
        ctx.drawImage(glow, R.x, R.y, R.w, R.h, x0, y0, dw, dh); ctx.filter = "none"
        ctx.globalAlpha = 0.85 * fade; ctx.drawImage(glow, R.x, R.y, R.w, R.h, x0, y0 - 1, dw, dh)
        ctx.globalCompositeOperation = "source-over"
      }
      ctx.globalAlpha = 0.95 * fade; ctx.drawImage(rift, R.x, R.y, R.w, R.h, x0, y0 + 1, dw, dh); ctx.restore()
    }
    // debris kicked up by each crack + by the tomb breaking through
    for (const [t0, n, pow] of [[IN.CRACK[0], 5, 0.5], [IN.CRACK[1], 7, 0.75], [IN.CRACK[2], 9, 1], [IN.RISE, 14, 1.4]]) {
      const k = f - t0; if (k < 0 || k > 22) continue
      ctx.save(); ctx.fillStyle = "#6a5a48"
      for (let j = 0; j < n; j++) {
        const vx = (hsh(t0, j) - 0.5) * 9 * pow, vy = -(4 + 6 * hsh(j, t0)) * pow, x = cX + vx * k * cs * 0.35, y = groundSY + (vy * k + 0.45 * k * k) * cs * 0.35
        if (y > groundSY + 2) continue
        ctx.globalAlpha = 1 - k / 22; const r = (2 + 3 * hsh(j, 7)) * cs * 0.5; ctx.fillRect(x - r, y - r, r * 2, r * 2)
      }
      ctx.restore()
    }
    // 2) the TOMB breaks up through the ground: rise frames 0-3, pushed up from below and clipped at the ground line
    if (f >= IN.RISE) {
      const closing = f >= IN.CLOSE
      let frame, sink = 0
      if (closing) { const p = (f - IN.CLOSE) / (IN.TOTAL - IN.CLOSE); frame = COFFIN.frames - 1 - Math.min(COFFIN.frames - 1, Math.floor(p * COFFIN.frames)); sink = p * p * coffinH }
      else if (f < IN.RISE1) { const p = (f - IN.RISE) / (IN.RISE1 - IN.RISE); frame = Math.min(3, Math.floor(p * 4)); sink = (1 - (1 - Math.pow(1 - p, 3))) * coffinH * 0.35 }
      else frame = 4 + Math.min(5, Math.floor((f - IN.RISE1) / (IN.OPEN1 - IN.RISE1) * 6))   // 3) the face slides open → the void
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, groundSY + 2); ctx.clip()   // nothing shows below the ground
      _drawSprite(ctx, img, COFFIN, frame, cX, groundSY - coffinH / 2 + sink, coffinH, face)
      // 4) the vessel forms INSIDE the void (clipped to it) as a silhouette, then steps OUT onto the ground in front
      if (!closing && f >= IN.EMERGE && cine.vesselKey) {
        const vh = Math.min(_vesselNormalH(ch), (VOID.y1 - VOID.y0) * cs * 0.92)
        if (f < IN.STEP) {
          const p = (f - IN.EMERGE) / (IN.STEP - IN.EMERGE)
          ctx.save(); ctx.beginPath()
          const vx0 = cX + (face > 0 ? VOID.x0 - COFFIN.w / 2 : COFFIN.w / 2 - VOID.x1) * cs
          ctx.rect(vx0, groundSY - coffinH + VOID.y0 * cs, (VOID.x1 - VOID.x0) * cs, (VOID.y1 - VOID.y0) * cs); ctx.clip()
          _drawVesselIdle(ctx, cX, groundSY - 2 * cs, vh, face, 0.15 * p, 0.85 + 0.15 * p)
          ctx.restore()
        }
      }
      ctx.restore()
      if (!closing && f >= IN.STEP && cine.vesselKey) {   // stepped out: in FRONT of the tomb, full reanimated colour
        const p = Math.min(1, (f - IN.STEP) / 12), vh = Math.min(_vesselNormalH(ch), (VOID.y1 - VOID.y0) * cs * 0.92) * (1 + 0.1 * p)
        _drawVesselIdle(ctx, cX + face * STEP_OUT * z * (1 - Math.pow(1 - p, 2)), groundSY, vh, face, 0.15 + 0.85 * p, 1)   // walks forward out of the void
      }
      if (closing && cine.vesselKey) _drawVesselIdle(ctx, cX + face * STEP_OUT * z, groundSY, Math.min(_vesselNormalH(ch), (VOID.y1 - VOID.y0) * cs * 0.92) * 1.1, face, 1, 1)   // stays IN FRONT of the sinking tomb
    }
  } else {
    // END — coffin rises, vessel runs in, coffin closes.
    if (f >= OUT.RISE - 6) {
      const closing = f >= OUT.CLOSE
      const phaseP = closing ? (f - OUT.CLOSE) / (OUT.TOTAL - OUT.CLOSE)
                             : Math.min(1, (f - (OUT.RISE - 6)) / (OUT.RUNIN - (OUT.RISE - 6)))
      const riseUp = Math.min(1, (f - (OUT.RISE - 6)) / 22)
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, groundSY + 2); ctx.clip()   // breaks up THROUGH the ground (nothing below the floor line)
      _drawSprite(ctx, img, COFFIN, _coffinFrame(phaseP, closing), coffinX, groundSY - coffinH / 2 + (1 - riseUp) * coffinH * 0.5, coffinH, face)
      ctx.restore()
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

function _drawVesselIdle(ctx, cx, groundSY, dh, flip, revealP = 1, alphaK = null) {
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
  const emerge = alphaK != null ? 0 : (1 - p) * dh * 0.18   // (legacy callers: starts sunk, rises to stand)
  ctx.save(); ctx.globalAlpha = alphaK != null ? alphaK : 0.4 + 0.56 * p
  ctx.filter = `grayscale(${1 - 0.18 * p}) sepia(${0.45 * p}) hue-rotate(${55 * p}deg) saturate(${sat}) brightness(${bright}) contrast(0.92)`
  ctx.translate(cx, groundSY - dh / 2 + emerge); ctx.scale(flip, 1)
  ctx.drawImage(img, fi * sheet.w, 0, sheet.w, sheet.h, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}
