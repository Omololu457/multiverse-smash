// hashiramaSealingJutsuCinematic.js
// HASHIRAMA — "Sealing Jutsu" ULTIMATE — a DOMAIN-EXPANSION-STYLE TRAP (redesigned 2026-08-12,
// supersedes the earlier freeze-cinematic "combo → cameo → barrier" design).
//
// The DOMAIN itself (background swap to hashirama_sealing_box.png, the opponent FREEZE/trap, the timer,
// activation white-flash, collapse) is owned by domains.js — Hashirama activates a first-class domain
// exactly like Gojo's Unlimited Void (activateDomain reads rosterKey "hashirama"). This module is the
// bespoke IN-WORLD OVERLAY that plays ON TOP of that live domain (combat is NOT frozen — Hashirama moves
// and attacks freely; only the trapped opponent is frozen by the domain):
//   • GATES  — two Gracious Deity Gates slam down flanking the trapped opponent (the seal cage).
//   • CAMEOS — Naruto (Kurama) → Minato → Tobirama flash in ON A LOOP for the whole domain and STRIKE the
//              trapped foe (each strike calls dealCameoHit → scaled damage). This is the domain's
//              guaranteed offense, delivered over the duration (not one scripted finisher beat).
// Everything here draws in WORLD space (inside the camera transform) so the gates/cameos track the trapped
// opponent as the live camera moves. Self-contained: imports only sound.js (no cycle).

import { sound as globalSound, SFX } from "./sound.js"

// The three ally cameos (hashirama_sealing_assist_uniform: 12 cells of 55×88 → 4 allies × 3 frames).
// cell order on the sheet: Naruto 0-2, Minato 3-5, Tobirama 6-8, Hashirama 9-11.
const CAMEOS = [
  { name: "naruto",   base: 0, tint: "#ff9a2e", side: -1 },   // Kurama chakra mode (orange), strikes from the left
  { name: "minato",   base: 3, tint: "#ffd54a", side:  1 },   // Flying Raijin (yellow), strikes from the right
  { name: "tobirama", base: 6, tint: "#7ec8ff", side:  0 },   // white hair / blue, strikes from behind-center
]

const GATE_SLAM   = 22   // frames: gates fall from above and slam down flanking the opponent
const CAMEO_DUR   = 46   // frames one cameo is on screen before the next cycles in
const CAMEO_STRIKE = 16  // frame within a cameo's window when its hit lands

const cine = {
  active: false, frame: 0, duration: 0, caster: null, opponent: null,
  dealCameoHit: null, cameoTimer: 0, cameoIndex: 0, cameoStruck: false, strikeFlash: 0, hits: 0
}

// lightweight image cache (world-space overlay art)
const _imgs = {}
function _img(src) {
  if (typeof Image === "undefined") return null
  let im = _imgs[src]
  if (!im) { im = new Image(); im.src = src; _imgs[src] = im }
  return (im.complete && im.naturalWidth > 0) ? im : null
}

// caster, opponent, dealCameoHit(cameo)→applies damage, durationFrames = the domain's duration.
export function activateHashiramaSealingJutsuCinematic(caster, opponent, dealCameoHit, durationFrames = 420) {
  if (!caster) return false
  cine.active = true; cine.frame = 0; cine.duration = Math.max(60, durationFrames | 0)
  cine.caster = caster; cine.opponent = opponent || null
  cine.dealCameoHit = typeof dealCameoHit === "function" ? dealCameoHit : null
  cine.cameoTimer = 0; cine.cameoIndex = 0; cine.cameoStruck = false; cine.strikeFlash = 0; cine.hits = 0
  caster._spriteCastMove  = "gatesCaster"   // Hashirama forms the seal on activation (brief)
  caster._spriteCastTimer = 26
  return true
}

export function isHashiramaSealingJutsuCinematicActive() { return cine.active }

export function getHashiramaSealingJutsuCinematicPhase() {
  if (!cine.active) return null
  if (cine.frame < GATE_SLAM) return "gates"
  return "cameos"
}

export function getHashiramaSealingJutsuCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getHashiramaSealingJutsuCinematicPhase(),
    duration: cine.duration, hits: cine.hits, cameo: CAMEOS[cine.cameoIndex]?.name ?? null,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null,
    oppFrozen: !!cine.opponent?.domainFrozen
  }
}

// Non-freezing per-frame tick — runs in the NORMAL update flow alongside live combat.
export function updateHashiramaSealingJutsuCinematic(ctx = {}) {
  if (!cine.active) return null
  const snd = ctx.sound || globalSound

  if (cine.frame === 0) { try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {} }
  if (cine.frame === GATE_SLAM - 1) { try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {} }   // gate slam
  if (cine.strikeFlash > 0) cine.strikeFlash--

  // CAMEO LOOP — begins once the gates have slammed. Each cameo fades in, STRIKES the trapped foe, cycles.
  if (cine.frame >= GATE_SLAM) {
    cine.cameoTimer++
    if (cine.cameoTimer === CAMEO_STRIKE && !cine.cameoStruck) {
      cine.cameoStruck = true
      cine.strikeFlash = 8
      cine.hits++
      try { cine.dealCameoHit?.(CAMEOS[cine.cameoIndex], ctx) } catch (_) {}
      try { snd?.play?.(SFX.HIT_HEAVY) } catch (_) {}
      if (ctx.camera?.shake) ctx.camera.shake(6, 6)
    }
    if (cine.cameoTimer >= CAMEO_DUR) {
      cine.cameoTimer = 0; cine.cameoStruck = false
      cine.cameoIndex = (cine.cameoIndex + 1) % CAMEOS.length
    }
  }

  cine.frame++
  if (cine.frame >= cine.duration) endCine()
  return getHashiramaSealingJutsuCinematicPhase()
}

function endCine() {
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.dealCameoHit = null; cine.cameoTimer = 0; cine.cameoIndex = 0; cine.cameoStruck = false; cine.strikeFlash = 0
}

export function clearHashiramaSealingJutsuCinematic() { if (cine.active) endCine() }

// ── DRAW — WORLD space (called inside the camera transform), tracking the trapped opponent. ──
export function drawHashiramaSealingJutsuCinematic(ctx) {
  if (!cine.active || !ctx || !cine.opponent) return
  const opp = cine.opponent
  const cx = (opp.x || 0) + (opp.w || 40) / 2
  const feetY = (opp.y || 0) + (opp.h || 100)
  const oh = opp.h || 100

  // ── GATES — two Gracious Deity Gates slam down flanking the trapped opponent (the seal cage). ──
  const gate = _img("./hashirama_gracious_deity_gates_wood_uniform.png")
  const gh = oh * 2.15, gw = gh * (140 / 244)
  const drop = Math.min(1, cine.frame / GATE_SLAM)                 // 0→1 fall
  const restY = feetY - gh                                         // torii base at the ground
  const gy = restY - (1 - drop) * oh * 3                           // start high, slam down
  for (const off of [-1, 1]) {
    const gx = cx + off * (opp.w || 40) * 1.15
    if (gate) { ctx.save(); ctx.globalAlpha = 0.97; ctx.drawImage(gate, gx - gw / 2, gy, gw, gh); ctx.restore() }
    else { ctx.save(); ctx.fillStyle = "#6b3f22"; ctx.fillRect(gx - gw / 2, gy, gw, gh); ctx.restore() }
  }

  // sealing ring around the trapped foe (world space) — reinforces the cage
  ctx.save()
  ctx.globalAlpha = 0.35 + (cine.strikeFlash / 8) * 0.4
  ctx.strokeStyle = "#e02424"; ctx.lineWidth = 3
  ctx.beginPath(); ctx.ellipse(cx, feetY - oh * 0.5, (opp.w || 40) * 1.3, oh * 0.72, 0, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()

  // ── ACTIVE CAMEO — the current ally flashes in beside the trapped foe and strikes it. ──
  if (cine.frame >= GATE_SLAM) {
    const cameo = CAMEOS[cine.cameoIndex]
    const t = cine.cameoTimer / CAMEO_DUR                          // 0→1 across this cameo's window
    const alpha = Math.min(1, cine.cameoTimer / 6) * Math.min(1, (1 - t) / 0.2 + 0.55)
    const size = oh * 1.55
    const px = cx + cameo.side * (opp.w || 40) * 1.05
    const py = feetY - oh * 0.05                                   // feet just above the foe's feet
    // chakra glow behind the ally
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.4 * alpha
    ctx.fillStyle = cameo.tint
    ctx.beginPath(); ctx.ellipse(px, py - size * 0.28, size * 0.4, size * 0.6, 0, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
    const assist = _img("./hashirama_sealing_assist_uniform.png")
    if (assist) {
      const frames = 12, fw = assist.naturalWidth / frames, fh = assist.naturalHeight
      const fi = cameo.base + Math.min(2, Math.floor(cine.cameoTimer / 8))   // step this ally's 3 frames
      const dw = size * (fw / fh), dh = size
      // face toward the opponent (flip when striking from the right)
      ctx.save(); ctx.globalAlpha = alpha
      ctx.translate(px, py); ctx.scale(cameo.side > 0 ? -1 : 1, 1)
      ctx.drawImage(assist, fi * fw, 0, fw, fh, -dw / 2, -dh, dw, dh)
      ctx.restore()
    }
    // strike flash on the trapped foe at the hit beat
    if (cine.strikeFlash > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = (cine.strikeFlash / 8) * 0.6
      ctx.fillStyle = cameo.tint
      ctx.beginPath(); ctx.arc(cx, feetY - oh * 0.5, oh * 0.6, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }
}
