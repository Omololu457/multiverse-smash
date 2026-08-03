// ghostfaceFinalActCinematic.js
// GHOSTFACE "The Final Act" ULTIMATE — a frozen combat cinematic (a STAB FLURRY). Mirrors the EXACT
// contract of batmanDarkKnightCinematic.js / shinobuButterflyCinematic.js (activate / isActive /
// getPhase / update / draw / clear that truly FREEZES combat) — NOT a parallel system:
//   • abilities.executeGhostfaceUltimate() calls activateGhostfaceFinalActCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isGhostfaceFinalActCinematicActive() and calls
//     updateGhostfaceFinalActCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawGhostfaceFinalActCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the flurry-connect beat (caller owns the payoff).
//   • every reset path calls clearGhostfaceFinalActCinematic().
//
// Ghostface holds his stab-flurry CAST pose (his own sprite = the gfUlt action) through the freeze while
// a PROCEDURAL storm of knife slashes (silver/white streaks) converges on the foe over a bleeding-red
// horror vignette. No projectile sheet needed — the slashes are drawn strokes. Self-contained: imports
// only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — ~198f total (~3.3s):
//   STALK   [0,66)     66f  camera frames BOTH fighters; Ghostface casts (gfUlt stab pose), a
//                            blood-red glow rises around the foe + rumble builds
//   FLURRY  [66,162)   96f  a storm of knife slashes rakes the opponent; at the CONNECT beat the
//                            guaranteed damage + red flash + burst of slashes land
//   SETTLE  [162,198)  36f  the flurry fades, camera eases back before combat resumes
// ─────────────────────────────────────────────────────────────────
export const FINAL_ACT_CINE_TIMELINE = { STALK: 66, FLURRY: 96, SETTLE: 36 }
const T_STALK_END  = FINAL_ACT_CINE_TIMELINE.STALK                  // 66
const T_FLURRY_END = T_STALK_END + FINAL_ACT_CINE_TIMELINE.FLURRY   // 162
const T_TOTAL      = T_FLURRY_END + FINAL_ACT_CINE_TIMELINE.SETTLE  // 198

// The flurry CONNECTS this many frames into FLURRY — the damage/flash beat.
const IMPACT_OFFSET = 30
const T_IMPACT = T_STALK_END + IMPACT_OFFSET                        // 96

const CINE_ZOOM = 0.82   // frames BOTH fighters (the flurry rakes the opponent)

// Deterministic pseudo-random for the slash lanes (no Math.random — keeps the cinematic replayable and
// dodges the harness's Math.random ban). Seeded per-slash by index.
function _rand(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x) }

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeGhostfaceUltimate). onImpact(ctx) applies the real
// damage — invoked ONCE at the flurry-connect beat.
// ─────────────────────────────────────────────────────────────────
export function activateGhostfaceFinalActCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Hold Ghostface's gfUlt stab-flurry CAST pose through the freeze (sprite frames advance in the draw
  // path, which still runs while combat is frozen). Cleared at end so the pose can't linger.
  caster._spriteCastMove  = "gfUlt"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isGhostfaceFinalActCinematicActive() { return cine.active }

export function getGhostfaceFinalActCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_STALK_END) return "stalk"
  if (f < T_FLURRY_END) return "flurry"
  return "settle"
}

// Test/harness snapshot — also surfaces the LIVE caster ref so a test can prove it's the real
// fighter performing the move (not a duplicate instance).
export function getGhostfaceFinalActCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getGhostfaceFinalActCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateGhostfaceFinalActCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.08            // let the framing settle within STALK (never snaps)
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom
  }

  // Camera: frame BOTH fighters, easing to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_FLURRY_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: builds over the back of STALK, a hard shake on the flurry connect, tremor after.
  if (cam && cam.shake) {
    if (f >= T_STALK_END - 36 && f < T_STALK_END && f % 6 === 0) {
      cam.shake(3 + ((f - (T_STALK_END - 36)) / 36) * 7, 8)
    } else if (f === T_IMPACT) {
      cam.shake(26, 28)
    } else if (f > T_IMPACT && f < T_FLURRY_END && f % 5 === 0) {
      cam.shake(9, 8)
    }
  }

  // FLURRY CONNECT — the guaranteed damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endGhostfaceFinalActCinematic()
  return getGhostfaceFinalActCinematicPhase()
}

function endGhostfaceFinalActCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Batman / Shinobu).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearGhostfaceFinalActCinematic() {
  if (cine.active || cine._cam) endGhostfaceFinalActCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank)
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}
// One knife slash = a bright tapered stroke at angle `ang`, length `len`, centered at (cx,cy).
function _drawSlash(ctx, cx, cy, ang, len, width, alpha, color) {
  if (alpha <= 0) return
  ctx.save()
  ctx.translate(cx, cy); ctx.rotate(ang)
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.strokeStyle = color; ctx.lineCap = "round"
  ctx.lineWidth = width
  ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke()
  // thin white core for the blade glint
  ctx.globalAlpha = Math.min(1, alpha * 0.9)
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, width * 0.35)
  ctx.beginPath(); ctx.moveTo(-len / 2, 0); ctx.lineTo(len / 2, 0); ctx.stroke()
  ctx.restore()
}

const N_SLASHES = 20

export function drawGhostfaceFinalActCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1

  // Near-black horror vignette bleeding deep red — the stalker's shadow closing in.
  let backdrop = 0
  if (f < T_STALK_END)        backdrop = (f / T_STALK_END) * 0.5
  else if (f < T_FLURRY_END)  backdrop = 0.5
  else                        backdrop = 0.5 * (1 - (f - T_FLURRY_END) / FINAL_ACT_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#0a0206", backdrop)

  const oppX = cw * (0.5 + dir * 0.16), oppY = ch * 0.54

  // ── STALK — a blood-red glow rises around the opponent, telegraphing the strike zone.
  if (f < T_STALK_END) {
    const p = f / T_STALK_END
    ctx.save()
    const g = ctx.createRadialGradient(oppX, oppY, 8, oppX, oppY, cw * 0.30)
    const gl = (0.12 + 0.4 * p) * (0.78 + 0.22 * Math.sin(f * 0.4))
    g.addColorStop(0, `rgba(220,60,70,${0.36 * gl})`)
    g.addColorStop(0.5, `rgba(150,20,30,${0.16 * gl})`)
    g.addColorStop(1, "rgba(150,20,30,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore()
  }

  // ── FLURRY — a storm of knife slashes rakes across the opponent; a red flash + a burst of
  //    slashes land on the connect beat.
  if (f >= T_STALK_END) {
    const intoF = f - T_STALK_END
    ctx.save()
    for (let i = 0; i < N_SLASHES; i++) {
      const launch = (i / N_SLASHES) * (IMPACT_OFFSET + 18)
      const t = (intoF - launch) / 12                  // each slash flashes briefly
      if (t < 0 || t > 1) continue
      const fade = 1 - t                               // bright at spawn, fades fast
      const ang = (_rand(i) - 0.5) * Math.PI            // random slash angle
      const jx = oppX + (_rand(i + 3) - 0.5) * cw * 0.22
      const jy = oppY + (_rand(i + 11) - 0.5) * ch * 0.26
      const len = ch * (0.14 + 0.12 * _rand(i + 5))
      _drawSlash(ctx, jx, jy, ang, len, 3 + 3 * _rand(i + 2), fade * 0.9, "#cfd6e6")
    }
    ctx.restore()

    // IMPACT flash + a dense burst of slashes crossing on the foe.
    if (intoF >= IMPACT_OFFSET) {
      const since = intoF - IMPACT_OFFSET
      const decay = Math.max(0, 1 - since / 22)
      _flash(ctx, cw, ch, "#ffffff", decay * 0.5)
      _flash(ctx, cw, ch, "#c81e28", decay * 0.32)     // blood-red impact wash
      ctx.save()
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2 + since * 0.06
        const r = (0.3 + _rand(i + 2)) * cw * 0.08 * (1 + since * 0.03)
        _drawSlash(ctx, oppX + Math.cos(ang) * r, oppY + Math.sin(ang) * r * 0.7,
                   ang + Math.PI / 2, ch * 0.12, 4, decay * 0.85, "#e8ecf4")
      }
      ctx.restore()
    }
  }
}
