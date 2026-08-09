// yujiUltimateCinematic.js
// YUJI "BLACK FLASH" ULTIMATE — Phase 1 = a frozen combat buildup cinematic. Mirrors the EXACT contract of
// rengokuFlameExplosionCinematic.js (activate / isActive / getPhase / update / draw / clear that truly
// FREEZES combat), with ONE difference: this ultimate's payoff is INTERACTIVE. Instead of dealing fixed
// damage at an impact beat, its resolve callback begins Yuji's mashable "Koma" release (Stage 4 engine) and
// then the freeze LIFTS so the player mashes the flurry → finisher (Phase 2).
//   • abilities.executeYujiUltimate() calls activateYujiUltimateCinematic(caster, opponent, onResolve).
//   • updateBattle() freezes combat while isYujiUltimateCinematicActive() and calls
//     updateYujiUltimateCinematic({camera, sound, ...}) + camera.advance().
//   • drawBattle() calls drawYujiUltimateCinematic(ctx, canvas) as a fullscreen overlay.
//   • onResolve() (→ startYujiKoma) fires ONCE at the RELEASE beat; combat resumes into the Koma mash.
//   • every reset path calls clearYujiUltimateCinematic().
//
// The SHOW is Yuji's OWN sprite: the 14-frame ultimateAction buildup (he braces → cursed energy floods his
// fists) plays through the freeze via _spriteCastMove:"ultimateAction". This overlay is lean — a building
// cyan cursed-energy vignette + a red/black "Black Flash" burst at the release beat.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — 54f total (~0.9s), deliberately SHORT so control returns fast for the mash:
//   BUILD   [0,42)   42f  camera pushes IN on Yuji; he charges — cursed energy floods his fists
//   RELEASE [42,54)  12f  at the RELEASE beat (+2) the "Black Flash" bursts + onResolve() begins the Koma
//                          release; camera pulls back, then the freeze lifts into the mashable flurry
// ─────────────────────────────────────────────────────────────────
export const YUJI_ULT_CINE_TIMELINE = { BUILD: 42, RELEASE: 12 }
const T_BUILD_END = YUJI_ULT_CINE_TIMELINE.BUILD                    // 42
const T_TOTAL     = T_BUILD_END + YUJI_ULT_CINE_TIMELINE.RELEASE    // 54

const RELEASE_OFFSET = 2                          // frames into RELEASE the Black Flash bursts + Koma begins
const T_RELEASE = T_BUILD_END + RELEASE_OFFSET    // 44

const CINE_ZOOM = 0.86   // push in on Yuji (and frame the opponent he's about to rush)

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onResolve: null, resolved: false, _cam: null, savedMaxStep: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeYujiUltimate). onResolve(ctx) begins the Koma release —
// invoked ONCE at the RELEASE beat; the freeze then lifts into the interactive mash.
// ─────────────────────────────────────────────────────────────────
export function activateYujiUltimateCinematic(caster, opponent, onResolve) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onResolve = typeof onResolve === "function" ? onResolve : null
  cine.resolved = false
  cine._cam = null
  cine.savedMaxStep = null
  // Play his buildup sprite through the freeze (drawn by the normal render path, which still runs).
  caster._spriteCastMove  = "ultimateAction"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isYujiUltimateCinematicActive() { return cine.active }

export function getYujiUltimateCinematicPhase() {
  if (!cine.active) return null
  return cine.frame < T_BUILD_END ? "build" : "release"
}

// Test/harness snapshot — surfaces the LIVE caster ref so a test can prove it's the real fighter.
export function getYujiUltimateCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getYujiUltimateCinematicPhase(),
    total: T_TOTAL, releaseFrame: T_RELEASE, resolved: cine.resolved,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateYujiUltimateCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.10           // let the push-in settle within BUILD (never snaps)
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom
  }

  // Camera: push IN through BUILD, pull BACK on RELEASE before the freeze lifts.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_RELEASE) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: builds through the charge, a hard shake on the Black Flash.
  if (cam && cam.shake) {
    if (f < T_BUILD_END && f % 6 === 0) cam.shake(3 + (f / T_BUILD_END) * 7, 8)
    else if (f === T_RELEASE) cam.shake(30, 26)
  }

  // RELEASE — begin the Koma mash, exactly once. (_komaActive is set now but stays dormant until the
  // freeze lifts a few frames later, at which point updateYujiKomaCombat picks it up.)
  if (f === T_RELEASE && !cine.resolved) {
    cine.resolved = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onResolve?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endYujiUltimateCinematic()
  return getYujiUltimateCinematicPhase()
}

function endYujiUltimateCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Rengoku / Superman).
  if (!cine.resolved) { cine.resolved = true; try { cine.onResolve?.({}) } catch (_) {} }
  // NOTE: do NOT clear _spriteCastMove here — startYujiKoma has already repointed it to "yujiKoma1"; the
  // Koma driver owns the sprite from here. Only clear if no Koma took over (defensive).
  if (cine.caster && cine.caster._spriteCastMove === "ultimateAction") { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onResolve = null; cine.resolved = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearYujiUltimateCinematic() {
  if (cine.active || cine._cam) endYujiUltimateCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank).
// The buildup itself is the caster's sprite; this adds the cyan cursed-energy vignette + Black Flash burst.
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

export function drawYujiUltimateCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1

  // Cyan cursed-energy vignette — power building through the charge, fading in RELEASE.
  let backdrop = 0
  if (f < T_BUILD_END) backdrop = 0.34 * Math.min(1, f / T_BUILD_END)
  else                 backdrop = 0.34 * (1 - (f - T_BUILD_END) / YUJI_ULT_CINE_TIMELINE.RELEASE)
  _flash(ctx, cw, ch, "#02121a", backdrop)

  // Yuji's screen-space anchor (camera frames him; the flash bursts around his fists).
  const cx = cw * (0.5 - dir * 0.10), cy = ch * 0.52

  // ── BLACK FLASH — a hard red/white burst + a black-cored cyan ring (the signature distortion).
  if (f >= T_RELEASE && f < T_TOTAL) {
    const since = f - T_RELEASE
    const decay = Math.max(0, 1 - since / 12)
    _flash(ctx, cw, ch, "#ffffff", decay * 0.55)
    _flash(ctx, cw, ch, "#c8102e", decay * 0.30)   // Black Flash red
    ctx.save(); ctx.globalCompositeOperation = "lighter"
    const t = Math.min(1, since / 11)
    const r = t * cw * 0.42
    ctx.strokeStyle = `rgba(120,${230 - t * 120},255,${(1 - t) * 0.8})`   // cyan cursed-energy ring
    ctx.lineWidth = 10 * (1 - t) + 2
    ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
    // black core dot (Black Flash's dark distortion), quick pop
    if (since < 6) { ctx.save(); ctx.globalAlpha = decay * 0.6; ctx.fillStyle = "#050008"; ctx.beginPath(); ctx.ellipse(cx, cy, 26 * (1 - since / 6) + 6, 20 * (1 - since / 6) + 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore() }
  }
}
