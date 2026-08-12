// redRangerPowerSwordCinematic.js
// RED RANGER (Jason, MMPR) "POWER SWORD: OVERHEAD STRIKE" ULTIMATE — a frozen combat cinematic.
// Mirrors the EXACT wired contract of gokuBlackSwordCinematic.js (the systems that truly FREEZE
// combat) — activate / isActive / getPhase / getStatus / update / draw / clear:
//   • abilities.executeRedRangerMmprUltimate() calls activateRedRangerPowerSwordCinematic(caster,
//     opponent, onImpact).
//   • updateBattle() freezes combat while isRedRangerPowerSwordCinematicActive(): it calls
//     updateRedRangerPowerSwordCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance()
//     and returns early (the SAME freeze contract as Goku Black's sword / Kurama).
//   • drawBattle() calls drawRedRangerPowerSwordCinematic(ctx, canvas) as a fullscreen overlay.
//   • the guaranteed DAMAGE lands via onImpact() at the STRIKE connect beat (abilities.js owns the payoff).
//   • every reset path calls clearRedRangerPowerSwordCinematic().
//
// The SHOW is the caster's OWN sprite (sword_up_attack) played through the freeze via
// _spriteCastMove:"ultimate". This adds a RED/WHITE Power-Sword energy overlay (vignette + strike flash
// + a bright diagonal slash streak). Self-contained: imports only sound.js (no cycle).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — 154f total (~2.6s):
//   WINDUP [0,60)     60f   camera frames BOTH fighters; Jason leaps + raises the Power Sword overhead
//   STRIKE [60,120)   60f   the blade comes DOWN and CONNECTS: guaranteed damage lands at the IMPACT beat
//   SETTLE [120,154)  34f   slash energy fades, camera eases back before combat resumes
// ─────────────────────────────────────────────────────────────────
export const RR_SWORD_CINE_TIMELINE = { WINDUP: 60, STRIKE: 60, SETTLE: 34 }
const T_WINDUP_END = RR_SWORD_CINE_TIMELINE.WINDUP                    // 60
const T_STRIKE_END = T_WINDUP_END + RR_SWORD_CINE_TIMELINE.STRIKE     // 120
const T_TOTAL      = T_STRIKE_END + RR_SWORD_CINE_TIMELINE.SETTLE     // 154

const IMPACT_OFFSET = 16                          // frames into STRIKE the overhead slash CONNECTS
const T_IMPACT = T_WINDUP_END + IMPACT_OFFSET      // 76

const CINE_ZOOM = 0.80   // frame BOTH fighters (the slash lands ON the opponent)

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// ACTIVATION (from abilities.executeRedRangerMmprUltimate). onImpact(ctx) applies the guaranteed
// damage — invoked ONCE at the STRIKE connect beat.
export function activateRedRangerPowerSwordCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Hold the sword_up_attack strip on the caster through the freeze (frames advance in the draw path,
  // which still runs while combat is frozen). Cleared at end so the pose can't linger past it.
  caster._spriteCastMove  = "ultimate"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isRedRangerPowerSwordCinematicActive() { return cine.active }

export function getRedRangerPowerSwordCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_WINDUP_END) return "windup"
  if (f < T_STRIKE_END) return "strike"
  return "settle"
}

// Test/harness snapshot.
export function getRedRangerPowerSwordCinematicStatus() {
  return { active: cine.active, frame: cine.frame, phase: getRedRangerPowerSwordCinematicPhase(), total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck, casterKey: cine.caster?.rosterKey ?? null }
}

// UPDATE (per frame while active; game.js freezes combat around this)
export function updateRedRangerPowerSwordCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) { cine._cam = cam; cine.savedMaxStep = cam.maxZoomStep; cam.maxZoomStep = 0.08 }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
  }

  // Camera: frame BOTH fighters (the slash lands ON the opponent), easing to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    const z = f < T_STRIKE_END ? CINE_ZOOM : 1.0
    if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, z)
    else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, z)
  }

  // Rumble: builds over the back half of WINDUP, a hard shake on the STRIKE connect, tremor after.
  if (cam && cam.shake) {
    if (f >= T_WINDUP_END - 30 && f < T_WINDUP_END && f % 6 === 0) cam.shake(4 + ((f - (T_WINDUP_END - 30)) / 30) * 6, 8)
    else if (f === T_IMPACT) cam.shake(28, 28)
    else if (f > T_IMPACT && f < T_STRIKE_END && f % 7 === 0) cam.shake(10, 10)
  }

  // STRIKE CONNECT — the guaranteed damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endRedRangerPowerSwordCinematic()
  return getRedRangerPowerSwordCinematicPhase()
}

function endRedRangerPowerSwordCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }   // never drop the payoff
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearRedRangerPowerSwordCinematic() {
  if (cine.active || cine._cam) endRedRangerPowerSwordCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank)
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color; ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

// A bright diagonal Power-Sword slash streak across the screen at the connect (white core → red).
function drawSlashStreak(ctx, cw, ch, alpha) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha = Math.min(1, alpha)
  ctx.translate(cw * 0.5, ch * 0.5)
  ctx.rotate(-0.95)                       // steep overhead down-diagonal
  ctx.shadowColor = "#ff3b30"; ctx.shadowBlur = 46
  const len = Math.hypot(cw, ch) * 1.25
  const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0)
  grad.addColorStop(0.0, "rgba(255,255,255,0)")
  grad.addColorStop(0.46, "rgba(255,255,255,0.92)")
  grad.addColorStop(0.5, "rgba(255,255,255,1)")
  grad.addColorStop(0.54, "rgba(255,59,48,0.92)")
  grad.addColorStop(1.0, "rgba(255,59,48,0)")
  ctx.fillStyle = grad
  ctx.fillRect(-len / 2, -17, len, 34)
  ctx.restore()
}

export function drawRedRangerPowerSwordCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame

  // Subtle red vignette — kept light so BOTH fighters stay clearly visible.
  let backdrop = 0
  if (f < T_WINDUP_END)      backdrop = (f / T_WINDUP_END) * 0.32
  else if (f < T_STRIKE_END) backdrop = 0.32
  else                       backdrop = 0.32 * (1 - (f - T_STRIKE_END) / RR_SWORD_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#1e0806", backdrop)

  // WINDUP — gathering red Power-Sword energy glow, pulsing and building toward the strike.
  if (f < T_WINDUP_END) {
    const p = f / T_WINDUP_END
    const cx = cw * 0.5, cy = ch * 0.5
    const glow = (0.15 + 0.5 * p) * (0.72 + 0.28 * Math.sin(f * 0.5))
    ctx.save()
    const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, cw * 0.45)
    g.addColorStop(0, `rgba(255,70,60,${0.32 * glow})`)
    g.addColorStop(0.6, `rgba(220,40,40,${0.12 * glow})`)
    g.addColorStop(1, "rgba(220,40,40,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore()
  }

  // STRIKE — white/red impact flash + expanding shockwave rings + the slash streak.
  if (f >= T_WINDUP_END && f < T_STRIKE_END) {
    const since = f - T_IMPACT
    if (since >= 0) {
      const decay = Math.max(0, 1 - since / 24)
      _flash(ctx, cw, ch, "#ffffff", decay * 0.60)
      _flash(ctx, cw, ch, "#ff3b30", decay * 0.32)
      drawSlashStreak(ctx, cw, ch, decay)
      const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1
      const oppX = cw * (0.5 + dir * 0.14), oppY = ch * 0.55
      ctx.save(); ctx.globalCompositeOperation = "lighter"
      for (let i = 0; i < 3; i++) {
        const t = Math.max(0, Math.min(1, (since - i * 3) / 24))
        if (t <= 0 || t >= 1) continue
        const r = t * cw * 0.46
        ctx.strokeStyle = `rgba(255,${90 - i * 24},${70 - i * 20},${(1 - t) * 0.7})`
        ctx.lineWidth = 9 * (1 - t) + 2
        ctx.beginPath(); ctx.ellipse(oppX, oppY, r, r * 0.34, 0, 0, Math.PI * 2); ctx.stroke()
      }
      ctx.restore()
    }
  }
}
