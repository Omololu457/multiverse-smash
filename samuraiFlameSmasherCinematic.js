// samuraiFlameSmasherCinematic.js
// SAMURAI RED RANGER "FIRE SMASHER: BLAZING STRIKE" ULTIMATE — a frozen combat cinematic.
// Mirrors the EXACT contract of rengokuFlameExplosionCinematic.js (activate / isActive / getPhase /
// update / draw / clear that truly FREEZES combat):
//   • abilities.executeSamuraiRangerUltimate() calls activateSamuraiFlameSmasherCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isSamuraiFlameSmasherCinematicActive() and calls
//     updateSamuraiFlameSmasherCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawSamuraiFlameSmasherCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the STRIKE beat (caller owns the tier-scaled payoff).
//   • every reset path calls clearSamuraiFlameSmasherCinematic().
//
// TIER-SCALING: the SHOW is the caster's OWN sprite, played through the freeze via _spriteCastMove:
// "ultimate". Sprite resolution reads `_skinAnim?.ultimate || animationData?.ultimate`, so an
// UNTRANSFORMED caster renders the BASE ultimate strip and a MEGA-MODE caster renders the Mega strip —
// automatically, no branching here. The caller scales the DAMAGE by the same Mega state at onImpact.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — 138f total (~2.3s): the ~54-frame ultimate strip plays through at its own
// sprite speed while these phases drive the camera / flash / damage beat.
//   RAISE  [0,46)     46f  camera pushes IN; the ranger raises the Fire Smasher, flames build
//   STRIKE [46,104)   58f  the flaming saber barrage — the guaranteed tier-scaled damage lands at +18
//   SETTLE [104,138)  34f  flame flash/rings fade, camera pulls BACK before combat resumes
// ─────────────────────────────────────────────────────────────────
export const SAMURAI_ULT_CINE_TIMELINE = { RAISE: 46, STRIKE: 58, SETTLE: 34 }
const T_RAISE_END  = SAMURAI_ULT_CINE_TIMELINE.RAISE                    // 46
const T_STRIKE_END = T_RAISE_END + SAMURAI_ULT_CINE_TIMELINE.STRIKE     // 104
const T_TOTAL      = T_STRIKE_END + SAMURAI_ULT_CINE_TIMELINE.SETTLE    // 138

const IMPACT_OFFSET = 18                            // frames into STRIKE the barrage payoff DETONATES
const T_IMPACT = T_RAISE_END + IMPACT_OFFSET        // 64

const CINE_ZOOM = 0.82   // frame BOTH fighters (the flame barrage sweeps the opponent)

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, mega: false, _cam: null, savedMaxStep: null
}

// ACTIVATION (from abilities.executeSamuraiRangerUltimate). onImpact(ctx) applies the tier-scaled
// damage — invoked ONCE at the STRIKE beat.
export function activateSamuraiFlameSmasherCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine.mega = !!caster._megaActive          // captured for the overlay's colour intensity (base vs Mega)
  cine._cam = null
  cine.savedMaxStep = null
  // Play the ultimate strip through the freeze (drawn by the normal render path, which still runs).
  // _skinAnim (set while in Mega) makes this resolve to the Mega ultimate sheet; base otherwise.
  caster._spriteCastMove  = "ultimate"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isSamuraiFlameSmasherCinematicActive() { return cine.active }

export function getSamuraiFlameSmasherCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_RAISE_END)  return "raise"
  if (f < T_STRIKE_END) return "strike"
  return "settle"
}

// Test/harness snapshot — surfaces the LIVE caster ref + the tier so a test can prove base vs Mega.
export function getSamuraiFlameSmasherCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getSamuraiFlameSmasherCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck, mega: cine.mega,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// UPDATE (per frame while active; game.js freezes combat around this)
export function updateSamuraiFlameSmasherCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08 }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
  }

  // Camera: push IN to frame BOTH fighters, then pull BACK on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    const z = f < T_STRIKE_END ? CINE_ZOOM : 1.0
    if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, z)
    else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, z)
  }

  // Rumble: builds through the raise, a hard shake on the STRIKE, tremor after.
  if (cam && cam.shake) {
    if (f >= T_RAISE_END && f < T_IMPACT && f % 5 === 0) cam.shake(4 + ((f - T_RAISE_END) / IMPACT_OFFSET) * 8, 8)
    else if (f === T_IMPACT) cam.shake(cine.mega ? 40 : 30, 32)
    else if (f > T_IMPACT && f < T_STRIKE_END && f % 6 === 0) cam.shake(12, 10)
  }

  // STRIKE — the guaranteed tier-scaled damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endSamuraiFlameSmasherCinematic()
  return getSamuraiFlameSmasherCinematicPhase()
}

function endSamuraiFlameSmasherCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }   // never drop the payoff
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine.mega = false; cine._cam = null; cine.savedMaxStep = null
}

export function clearSamuraiFlameSmasherCinematic() {
  if (cine.active || cine._cam) endSamuraiFlameSmasherCinematic()
}

// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank). The barrage
// itself is the caster's sprite; this adds a fire vignette + strike flash + expanding flame rings.
// Mega tier reads HOTTER (deeper vignette, brighter flash) to sell the higher-power presentation.
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawSamuraiFlameSmasherCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1
  const hot = cine.mega ? 1.25 : 1.0    // Mega tier: hotter/brighter overlay
  // CHAR-AWARE palette: Red = fire (red/orange), Gold = LIGHT (gold/white), Green = FOREST (leaf-green).
  // Same overlay structure. Green supplies an OPTIONAL full-rgb ringStroke (the shared ring draw defaults
  // to rgba(255,ringG,…) — red-dominant — which suits fire/light but not green, so green overrides it).
  const rk = (cine.caster?.rosterKey || "").toLowerCase()
  const isGold = rk === "gold_samurai_ranger"
  const isGreen = rk === "green_samurai_ranger"
  const P = isGreen
    ? { vignette: cine.mega ? "#0a2606" : "#082004", flash1: "#ffffff", flash2: "#8ff07a", ringG: (i) => `${220 - i * 20},${60 + i * 10}`,
        ringStroke: (i, t) => `rgba(${70 + i * 24},${230 - i * 18},${70 + i * 16},${(1 - t) * 0.72})` }
    : isGold
    ? { vignette: cine.mega ? "#2a2408" : "#241f06", flash1: "#ffffff", flash2: "#ffd24a", ringG: (i) => `${235 - i * 10},${40 - i * 8}` }
    : { vignette: cine.mega ? "#320a02" : "#2a0a02", flash1: "#ffffff", flash2: "#ff6a1a", ringG: (i) => `${170 - i * 40},${40 + i * 20}` }

  // Vignette — power building through the raise, fading in SETTLE.
  let backdrop = 0
  if (f < T_STRIKE_END) backdrop = 0.36 * hot * Math.min(1, f / T_RAISE_END)
  else                  backdrop = 0.36 * hot * (1 - (f - T_STRIKE_END) / SAMURAI_ULT_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, P.vignette, backdrop)

  const oppX = cw * (0.5 + dir * 0.14), oppY = ch * 0.55

  // STRIKE — flash + expanding shockwave rings (fire for Red, light for Gold).
  if (f >= T_IMPACT && f < T_STRIKE_END + 6) {
    const since = f - T_IMPACT
    const decay = Math.max(0, 1 - since / 26)
    _flash(ctx, cw, ch, P.flash1, decay * 0.60 * hot)
    _flash(ctx, cw, ch, P.flash2, decay * 0.34 * hot)
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    const rings = cine.mega ? 4 : 3
    for (let i = 0; i < rings; i++) {
      const t = Math.max(0, Math.min(1, (since - i * 3) / 24))
      if (t <= 0 || t >= 1) continue
      const r = t * cw * (0.48 * hot)
      ctx.strokeStyle = P.ringStroke ? P.ringStroke(i, t) : `rgba(255,${P.ringG(i)},${(1 - t) * 0.72})`
      ctx.lineWidth = 9 * (1 - t) + 2
      ctx.beginPath(); ctx.ellipse(oppX, oppY, r, r * 0.34, 0, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
  }
}
