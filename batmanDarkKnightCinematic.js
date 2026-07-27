// batmanDarkKnightCinematic.js
// BATMAN "The Dark Knight" ULTIMATE — a frozen combat cinematic (batarang BARRAGE). Mirrors the
// EXACT contract of beerusKiBallCinematic.js / vegetaFinalFlashCinematic.js / gokuBlackSwordCinematic.js
// (activate / isActive / getPhase / update / draw / clear that truly FREEZES combat) — NOT a parallel
// system:
//   • abilities.executeBatmanUltimate() calls activateBatmanDarkKnightCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isBatmanDarkKnightCinematicActive() and calls
//     updateBatmanDarkKnightCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawBatmanDarkKnightCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE is applied by onImpact() at the barrage-connect beat (caller owns the payoff).
//   • every reset path calls clearBatmanDarkKnightCinematic().
//
// The Ultimate was chosen as the LARGEST / most elaborate sequence in the batch (per the asset-map
// instruction to flag that candidate): batman_baterang_combo_throws (14 frames, 2156px — widest sheet,
// most frames). This coincides with the design brief's batarang-barrage FALLBACK — same move. Batman
// holds his multi-throw CAST pose (his own sprite = the darkKnight action) through the freeze while a
// volley of batarangs (batman_baterang_proj.png spin filmstrip) rains diagonally down onto the foe.
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import THIS).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE (frames @60fps) — ~204f total (~3.4s):
//   WINDUP  [0,72)     72f  camera frames BOTH fighters; Batman casts (darkKnight throw pose), a
//                            bat-signal glow rises + rumble builds
//   BARRAGE [72,168)   96f  a rain of batarangs streaks down onto the opponent; at the CONNECT beat
//                            the guaranteed damage + white flash + hail of spinning batarangs land
//   SETTLE  [168,204)  36f  the volley fades, camera eases back before combat resumes
// ─────────────────────────────────────────────────────────────────
export const DARK_KNIGHT_CINE_TIMELINE = { WINDUP: 72, BARRAGE: 96, SETTLE: 36 }
const T_WINDUP_END  = DARK_KNIGHT_CINE_TIMELINE.WINDUP                  // 72
const T_BARRAGE_END = T_WINDUP_END + DARK_KNIGHT_CINE_TIMELINE.BARRAGE  // 168
const T_TOTAL       = T_BARRAGE_END + DARK_KNIGHT_CINE_TIMELINE.SETTLE  // 204

// The barrage CONNECTS this many frames into BARRAGE — the damage/flash beat.
const IMPACT_OFFSET = 30
const T_IMPACT = T_WINDUP_END + IMPACT_OFFSET                          // 102

const CINE_ZOOM = 0.82   // frames BOTH fighters (the barrage rains ON the opponent)

// Batarang spin filmstrip (the same horizontal strip the neutral Batarang special uses).
const BAT_SHEET = { src: "./batman_baterang_proj.png", frames: 5, w: 41, h: 22 }
const _imgs = {}
function _img(src) { if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im } return _imgs[src] }

// Deterministic pseudo-random for the barrage lanes (no Math.random — keeps the cinematic replayable
// and dodges the harness's Math.random ban). Seeded per-batarang by index.
function _rand(i) { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x) }

const cine = {
  active: false, frame: 0, caster: null, opponent: null,
  onImpact: null, struck: false, _cam: null, savedMaxStep: null
}

// ─────────────────────────────────────────────────────────────────
// ACTIVATION (called from abilities.executeBatmanUltimate). onImpact(ctx) applies the real
// damage — invoked ONCE at the barrage-connect beat.
// ─────────────────────────────────────────────────────────────────
export function activateBatmanDarkKnightCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  cine.active = true
  cine.frame = 0
  cine.caster = caster
  cine.opponent = opponent || null
  cine.onImpact = typeof onImpact === "function" ? onImpact : null
  cine.struck = false
  cine._cam = null
  cine.savedMaxStep = null
  // Hold Batman's darkKnight throw CAST pose through the freeze (sprite frames advance in the draw
  // path, which still runs while combat is frozen). Cleared at end so the pose can't linger.
  caster._spriteCastMove  = "darkKnight"
  caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false
  caster.vx = 0
  return true
}

export function isBatmanDarkKnightCinematicActive() { return cine.active }

export function getBatmanDarkKnightCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  if (f < T_WINDUP_END) return "windup"
  if (f < T_BARRAGE_END) return "barrage"
  return "settle"
}

// Test/harness snapshot — also surfaces the LIVE caster ref so a test can prove it's the real
// fighter performing the move (not a duplicate instance).
export function getBatmanDarkKnightCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getBatmanDarkKnightCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null
  }
}

// ─────────────────────────────────────────────────────────────────
// UPDATE (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateBatmanDarkKnightCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = cine.frame

  if (f === 0) {
    if (cam) {
      cine._cam = cam
      cine.savedMaxStep = cam.maxZoomStep
      cam.maxZoomStep = 0.08            // let the framing settle within WINDUP (never snaps)
    }
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}   // shared activation boom
  }

  // Camera: frame BOTH fighters, easing to normal on SETTLE.
  if (cam && cine.caster) {
    const opp = cine.opponent
    if (f < T_BARRAGE_END) {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, CINE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, CINE_ZOOM)
    } else {
      if (opp && cam.focusBetween) cam.focusBetween(cine.caster, opp, 1.0)
      else if (cam.focusOnFighter) cam.focusOnFighter(cine.caster, 1.0)
    }
  }

  // Rumble: builds over the back of WINDUP, a hard shake on the barrage connect, tremor after.
  if (cam && cam.shake) {
    if (f >= T_WINDUP_END - 36 && f < T_WINDUP_END && f % 6 === 0) {
      cam.shake(3 + ((f - (T_WINDUP_END - 36)) / 36) * 7, 8)
    } else if (f === T_IMPACT) {
      cam.shake(26, 28)
    } else if (f > T_IMPACT && f < T_BARRAGE_END && f % 5 === 0) {
      cam.shake(9, 8)
    }
  }

  // BARRAGE CONNECT — the guaranteed damage lands here, exactly once.
  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.DOMAIN_ACTIVATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endBatmanDarkKnightCinematic()
  return getBatmanDarkKnightCinematicPhase()
}

function endBatmanDarkKnightCinematic() {
  const cam = cine._cam
  if (cam && cine.savedMaxStep != null) cam.maxZoomStep = cine.savedMaxStep
  // Safety: never let the payoff get eaten by an aborted cinematic (mirrors Beerus / Vegeta / Sword).
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { cine.caster._spriteCastMove = null; cine.caster._spriteCastTimer = 0 }
  cine.active = false; cine.frame = 0; cine.caster = null; cine.opponent = null
  cine.onImpact = null; cine.struck = false; cine._cam = null; cine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearBatmanDarkKnightCinematic() {
  if (cine.active || cine._cam) endBatmanDarkKnightCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen SCREEN-space overlay on top of the frozen world (guarded, never blank)
// ─────────────────────────────────────────────────────────────────
function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}
function _drawBatarang(ctx, img, cx, cy, dh, rot) {
  if (!img.complete || img.naturalWidth === 0) return false
  const scale = dh / BAT_SHEET.h
  const dw = BAT_SHEET.w * scale
  const fi = Math.abs(Math.floor(rot * 2.4)) % BAT_SHEET.frames   // spin frame from travel progress
  ctx.save(); ctx.translate(cx, cy)
  ctx.drawImage(img, fi * BAT_SHEET.w, 0, BAT_SHEET.w, BAT_SHEET.h, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
  return true
}

const N_BATARANGS = 22

export function drawBatmanDarkKnightCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = cine.frame
  const dir = (cine.caster?.facing ?? 1) >= 0 ? 1 : -1

  // Dark-blue night vignette backdrop — the Dark Knight's shadow; subtle so both fighters read.
  let backdrop = 0
  if (f < T_WINDUP_END)        backdrop = (f / T_WINDUP_END) * 0.44
  else if (f < T_BARRAGE_END)  backdrop = 0.44
  else                         backdrop = 0.44 * (1 - (f - T_BARRAGE_END) / DARK_KNIGHT_CINE_TIMELINE.SETTLE)
  _flash(ctx, cw, ch, "#080b16", backdrop)

  // Batman's side and the opponent's side, in screen space (camera frames both).
  const oppX = cw * (0.5 + dir * 0.16), oppY = ch * 0.54
  const img  = _img(BAT_SHEET.src)

  // ── WINDUP — a bat-signal glow rises behind the opponent, telegraphing the strike zone.
  if (f < T_WINDUP_END) {
    const p = f / T_WINDUP_END
    ctx.save()
    const g = ctx.createRadialGradient(oppX, oppY, 8, oppX, oppY, cw * 0.30)
    const gl = (0.12 + 0.4 * p) * (0.78 + 0.22 * Math.sin(f * 0.4))
    g.addColorStop(0, `rgba(190,205,255,${0.34 * gl})`)
    g.addColorStop(0.5, `rgba(90,120,210,${0.14 * gl})`)
    g.addColorStop(1, "rgba(90,120,210,0)")
    ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch); ctx.restore()
  }

  // ── BARRAGE — a volley of batarangs streaks diagonally down onto the opponent; a white flash +
  //    a scatter of spinning batarangs land on the connect beat.
  if (f >= T_WINDUP_END) {
    const intoB = f - T_WINDUP_END
    const dur = T_BARRAGE_END - T_WINDUP_END
    ctx.save()
    for (let i = 0; i < N_BATARANGS; i++) {
      // each batarang launches on its own staggered beat, arcs from off-screen top toward the foe
      const launch = (i / N_BATARANGS) * (IMPACT_OFFSET + 18)
      const t = (intoB - launch) / 26
      if (t < 0 || t > 1.3) continue
      const tc = Math.min(1, t)
      const sx = oppX + (_rand(i) - 0.5) * cw * 0.55 - dir * cw * 0.18   // fan-out origin, biased to Batman's side
      const sy = -ch * 0.12 - _rand(i + 7) * ch * 0.2
      const tx = oppX + (_rand(i + 3) - 0.5) * cw * 0.12
      const ty = oppY + (_rand(i + 11) - 0.5) * ch * 0.14
      const cx = sx + (tx - sx) * tc
      const cy = sy + (ty - sy) * tc
      const dh = ch * (0.05 + 0.03 * _rand(i + 5))
      _drawBatarang(ctx, img, cx, cy, dh, intoB * (0.6 + _rand(i) * 0.8))
    }
    ctx.restore()

    // IMPACT flash + a dense scatter of spinning batarangs piled on the foe.
    if (intoB >= IMPACT_OFFSET) {
      const since = intoB - IMPACT_OFFSET
      const decay = Math.max(0, 1 - since / 22)
      _flash(ctx, cw, ch, "#ffffff", decay * 0.62)
      _flash(ctx, cw, ch, "#9fb6ff", decay * 0.24)
      ctx.save()
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + since * 0.05
        const r = (0.4 + _rand(i + 2)) * cw * 0.10 * (1 + since * 0.02)
        _drawBatarang(ctx, img, oppX + Math.cos(a) * r, oppY + Math.sin(a) * r * 0.7, ch * 0.05, since * 0.7 + i)
      }
      ctx.restore()
    }
  }
}
