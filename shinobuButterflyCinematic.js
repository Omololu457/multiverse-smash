// shinobuButterflyCinematic.js
// SHINOBU KOCHO "INSECT BREATHING: BUTTERFLY DANCE" ULTIMATE — a frozen combat cinematic. Mirrors the
// EXACT contract of rengokuFlameExplosionCinematic.js / supermanUltimateCinematic.js (activate / isActive
// / getPhase / update / draw / clear that truly FREEZES combat):
//   • abilities.executeShinobuUltimate() calls activateShinobuButterflyCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isShinobuButterflyCinematicActive() and calls
//     updateShinobuButterflyCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawShinobuButterflyCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the STRIKE beat (caller owns the payoff).
//   • every reset path calls clearShinobuButterflyCinematic().
//
// The SHOW is Shinobu's OWN sprite: the 9-frame `shinobu_ultimate_uniform` (a forward thrust-LUNGE that
// resolves into a spinning slash) plays through the freeze via _spriteCastMove:"shinobuUltimate" (sprite
// frames advance in the draw path, which still runs while combat is frozen). To sell the "spinning DASH"
// (design brief), the caster's x EASES toward the opponent across the DASH phase — she closes the gap and
// strikes THROUGH them. This overlay adds her purple/white wisteria palette: a building violet vignette +
// a white/violet strike flash + expanding spiral slash rings at the connect beat.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — 112f total (~1.87s):
//   DASH   [0,36)    36f  camera pushes IN; she winds the thrust + DASHES toward the opponent (x eases in)
//   SPIN   [36,84)   48f  the spinning slash; at the STRIKE beat (+14) the guaranteed damage + poison
//                          finisher + white/violet flash + expanding spiral slash rings land
//   SETTLE [84,112)  28f  flash/rings fade, camera pulls BACK before combat resumes
// ─────────────────────────────────────────────────────────────────
export const SHINOBU_ULT_CINE_TIMELINE = { DASH: 36, SPIN: 48, SETTLE: 28 }
const T_DASH_END = SHINOBU_ULT_CINE_TIMELINE.DASH                   // 36
const T_SPIN_END = T_DASH_END + SHINOBU_ULT_CINE_TIMELINE.SPIN      // 84
const T_TOTAL    = T_SPIN_END + SHINOBU_ULT_CINE_TIMELINE.SETTLE    // 112

const IMPACT_OFFSET = 14                          // frames into SPIN the slash CONNECTS
const T_IMPACT = T_DASH_END + IMPACT_OFFSET       // 50

const CINE_ZOOM   = 0.84   // frame BOTH fighters (she dashes across the gap)
const DASH_GAP    = 74     // px short of the opponent she ends the dash at (she strikes through)

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null,
  startX: null, targetX: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeShinobuUltimate). onImpact(ctx) applies the real damage —
// invoked ONCE at the STRIKE beat.
// ─────────────────────────────────────────────────────────────────
export function activateShinobuButterflyCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // DASH endpoints: from her current x → to just short of the opponent (facing-aware). If no opponent,
  // she lunges a fixed distance forward.
  const dir = (caster.facing ?? 1) >= 0 ? 1 : -1
  cine.startX = caster.x
  cine.targetX = opponent
    ? opponent.x - dir * DASH_GAP
    : caster.x + dir * 180
  // Play her ultimate sprite through the freeze (drawn by the normal render path, which still runs).
  caster._spriteCastMove  = "shinobuUltimate"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isShinobuButterflyCinematicActive() { return cine.active }

export function getShinobuButterflyCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_DASH_END) return "dash"
  if (f < T_SPIN_END) return "spin"
  return "settle"
}

// Test/harness snapshot — surfaces the LIVE caster ref so a test can prove it's the real fighter.
export function getShinobuButterflyCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getShinobuButterflyCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null,
    casterX: cine.caster?.x ?? null, startX: cine.startX, targetX: cine.targetX
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateShinobuButterflyCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.08            // let the push-in settle within DASH (never snaps)
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation cue
  }

  // DASH — ease the caster from her start x toward the opponent (easeOutQuad). Combat is frozen, so
  // setting x directly is safe. This is the "dash-based" read (she closes the gap and strikes through).
  if (cine.caster && cine.startX != null && cine.targetX != null) {
    const t = Math.min(1, f / T_DASH_END)
    const eased = 1 - (1 - t) * (1 - t)
    cine.caster.x = cine.startX + (cine.targetX - cine.startX) * eased
  }

  // Camera: push IN to frame BOTH fighters, then pull BACK to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_SPIN_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: a rising flutter through the spin windup, a hard shake on the STRIKE, tremor after.
  if (cam && cam.shake) {
    if (f >= T_DASH_END && f < T_IMPACT && f % 4 === 0) {
      cam.shake(3 + ((f - T_DASH_END) / IMPACT_OFFSET) * 6, 7)
    } else if (f === T_IMPACT) {
      cam.shake(28, 28)
    } else if (f > T_IMPACT && f < T_SPIN_END && f % 6 === 0) {
      cam.shake(9, 9)
    }
  }

  // STRIKE — the guaranteed damage (+ poison finisher) lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endShinobuButterflyCinematic()
  return getShinobuButterflyCinematicPhase()
}

function endShinobuButterflyCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Rengoku / Superman / Beerus).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
  cine.startX = null; cine.targetX = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearShinobuButterflyCinematic() {
  if (cine.active || cine._cam) endShinobuButterflyCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank).
// The dash+spin itself is the caster's sprite; this adds the violet wisteria vignette + strike flash +
// expanding spiral slash rings toward the opponent.
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawShinobuButterflyCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1

  // Violet wisteria vignette — power building through the dash/spin windup, fading in SETTLE.
  let backdrop = 0
  if (f < T_SPIN_END)  backdrop = 0.34 * Math.min(1, f / T_DASH_END)
  else                 backdrop = 0.34 * (1 - (f - T_SPIN_END) / SHINOBU_ULT_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#160726", backdrop)

  // The opponent's screen-space anchor (camera frames both; the slash spirals toward the opponent side).
  const oppX = cw * (0.5 + dir * 0.15), oppY = ch * 0.54

  // ── STRIKE — white/violet flash + expanding spiral slash rings.
  if (f >= T_IMPACT && f < T_SPIN_END + 6) {
    const since = f - T_IMPACT
    const decay = Math.max(0, 1 - since / 24)
    _flash(ctx, cw, ch, "#ffffff", decay * 0.58)
    _flash(ctx, cw, ch, "#8a4dff", decay * 0.34)
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    for (let i = 0; i < 4; i++) {
      const t = Math.max(0, Math.min(1, (since - i * 3) / 22))
      if (t <= 0 || t >= 1) continue
      const r = t * cw * 0.46
      // spiral slash arcs (partial ellipses rotated per ring) in violet→white
      ctx.strokeStyle = `rgba(${180 + i * 18},${150 + i * 20},255,${(1 - t) * 0.72})`
      ctx.lineWidth = 8 * (1 - t) + 2
      ctx.beginPath()
      ctx.ellipse(oppX, oppY, r, r * 0.42, (i * Math.PI) / 4 + since * 0.16, 0, Math.PI * 1.5)
      ctx.stroke()
    }
    ctx.restore()
  }
}
