// kurama.js
// Naruto ULTIMATE — "Kurama / Tailed Beast Bomb" CINEMATIC (REBUILT 2026-07-13).
// Built on the Gojo/Sukuna DOMAIN cinematic pattern (game.js domainCine): a
// combat-frozen, camera-driven, fullscreen scripted sequence with a GUARANTEED
// effect — NOT a transformation and NOT a playable fox form.
//
// SPATIAL STAGING (this is the rebuild — the old version guessed the fox layout):
//   • The stadium WIDENS (camera zooms OUT, framing both fighters) to make room
//     for a giant fox.
//   • Kurama rises UP OUT OF THE GROUND on the edge OPPOSITE the opponent: first
//     the partial head (fox_head_clean), then the full body (fox_left_clean),
//     FLIPPED so the fox faces TOWARD the opponent from the far side.
//       enemy on RIGHT → fox rises on LEFT edge, faces RIGHT (native, no flip)
//       enemy on LEFT  → fox rises on RIGHT edge, faces LEFT  (flipped)
//   • A Tailed Beast Bomb forms at the fox's mouth (dark_sphere_growth scales up),
//     then FIRES across the widened arena at the opponent → explosion + shockwaves.
//
// FRAME-DATA REALITY (confirmed by slicing/inspection 2026-07-13):
//   • fox_head/left/right and every tbb_* PNG are SINGLE frames, not internal
//     strips. The blast "animates" by SEQUENCING the six separate files
//     (explosion_a → explosion_b → shockwave_1..4); the dark orb "animates" by
//     SCALING. So there are no held-static multi-frame strips — sequencing +
//     scaling is the correct treatment.
//   • fox_*_clean are artifact-removed crops of the originals (originals untouched).
//     BOTH fox bodies face RIGHT natively → facing is a horizontal flip, not a
//     file choice. We use fox_left_clean + flip (per user).
//
// Contract with game.js (unchanged — mirrors the domain cinematic):
//   • abilities.executeNarutoUltimate() spends the meter then calls
//     activateKuramaUltimate(caster, opponent).
//   • updateBattle() freezes combat while isKuramaCinematicActive(): it calls
//     updateKuramaUltimate({camera, hitEffects, damageNumbers, sound}) + camera
//     .advance() and returns early (no physics/combat that frame).
//   • drawBattle() calls drawKuramaCinematic(ctx, canvas) as a fullscreen,
//     screen-space overlay drawn ON TOP of the world.
//   • every reset path calls clearKuramaUltimate() (restores camera limits).
//
// Self-contained: imports only sound.js (no cycle — game.js/abilities.js import
// THIS, this imports neither).

import { sound as globalSound, SFX } from "./sound.js"

// ─────────────────────────────────────────────────────────────────
// TIMELINE  (frames @60fps) — ALL beats tunable here.
//   WIDEN        [0,25)     25f ~0.42s  camera pulls OUT to widen the arena; white flash
//   RISE_PARTIAL [25,60)    35f ~0.58s  partial fox head rises UP out of the ground (far edge)
//   RISE_FULL    [60,100)   40f ~0.67s  full fox body rises up & settles, facing the opponent
//   CHARGE       [100,150)  50f ~0.83s  Tailed Beast Bomb forms at the mouth (orb scales up); rumble
//   FIRE         [150,195)  45f ~0.75s  bomb flies mouth→opponent → explosion/shockwave seq; DAMAGE @impact(+14)
//   SETTLE       [195,220)  25f ~0.42s  blast fades, fox sinks, camera restores
// ─────────────────────────────────────────────────────────────────
export const KURAMA_TIMELINE = { WIDEN: 25, RISE_PARTIAL: 35, RISE_FULL: 40, CHARGE: 50, FIRE: 45, SETTLE: 25 }
const T_WIDEN_END   = KURAMA_TIMELINE.WIDEN                                   // 25
const T_PARTIAL_END = T_WIDEN_END   + KURAMA_TIMELINE.RISE_PARTIAL            // 60
const T_FULL_END    = T_PARTIAL_END + KURAMA_TIMELINE.RISE_FULL               // 100
const T_CHARGE_END  = T_FULL_END    + KURAMA_TIMELINE.CHARGE                  // 150
const T_FIRE_END    = T_CHARGE_END  + KURAMA_TIMELINE.FIRE                    // 195
const T_TOTAL       = T_FIRE_END    + KURAMA_TIMELINE.SETTLE                  // 220

// Bomb reaches the opponent this many frames into FIRE — the DAMAGE/impact beat.
const IMPACT_OFFSET = 14
const T_IMPACT = T_CHARGE_END + IMPACT_OFFSET                                 // 164

// Widened-arena zoom (camera.minZoom is 0.40, maxZoom 1.15 → this pulls OUT).
const WIDE_ZOOM = 0.55

// Guaranteed Tailed Beast Bomb damage (opponent maxHealth is ~1000). ~Half a
// health bar so it lands like a real ultimate; still survivable from full, so it
// isn't a pure round-ender.
const KURAMA_DAMAGE = 600

const kuramaCine = {
  active: false,
  frame: 0,
  caster: null,
  opponent: null,
  damageDealt: false,
  enemySide: 1,     // +1 = opponent on the right, -1 = on the left
  faceLeft: false,  // fox flipped to face left (opponent on left)
  _cam: null,
  savedMaxStep: null
}

// ── lazy image cache (mirrors ui._projImg) — never blank: draw guards on load ──
const ART = {}
function art(name) {
  let img = ART[name]
  if (!img) { img = new Image(); img.src = `./${name}.png`; ART[name] = img }
  return img
}
const A = {
  foxHead: "naruto_kcm_fx_fox_head_clean",      // partial (head) for the RISE beat
  foxBody: "naruto_kcm_fx_fox_left_clean",       // full body (native faces RIGHT; flip for left)
  charge:  "naruto_kcm_fx_tbb_charge",           // charge swirl at the mouth
  dark:    "naruto_kcm_fx_tbb_dark_sphere_growth", // the bomb orb (scaled to grow)
  explA:   "naruto_kcm_fx_tbb_explosion_a",
  explB:   "naruto_kcm_fx_tbb_explosion_b",
  shock1:  "naruto_kcm_fx_tbb_shockwave_1",
  shock2:  "naruto_kcm_fx_tbb_shockwave_2",
  shock3:  "naruto_kcm_fx_tbb_shockwave_3",
  shock4:  "naruto_kcm_fx_tbb_shockwave_4"
}
// Preload all beats up front so the sequence never pops in mid-cinematic.
function preload() { Object.values(A).forEach(art) }

// ─────────────────────────────────────────────────────────────────
// ACTIVATION  (called from abilities.executeNarutoUltimate — meter already spent)
// ─────────────────────────────────────────────────────────────────
export function activateKuramaUltimate(caster, opponent) {
  if (!caster) return false
  preload()
  kuramaCine.active = true
  kuramaCine.frame = 0
  kuramaCine.caster = caster
  kuramaCine.opponent = opponent || null
  kuramaCine.damageDealt = false
  // Which side is the opponent on? Fox rises on the OPPOSITE edge and faces toward them.
  const ccx = (caster.x || 0) + (caster.w || 0) / 2
  const ocx = opponent ? (opponent.x || 0) + (opponent.w || 0) / 2 : ccx + 1
  kuramaCine.enemySide = ocx >= ccx ? 1 : -1        // +1 opponent right, -1 opponent left
  kuramaCine.faceLeft  = kuramaCine.enemySide < 0   // flip fox to face left when enemy is left
  kuramaCine._cam = null
  kuramaCine.savedMaxStep = null
  return true
}

export function isKuramaCinematicActive() { return kuramaCine.active }

export function getKuramaPhase() {
  if (!kuramaCine.active) return null
  const f = kuramaCine.frame
  if (f < T_WIDEN_END)   return "widen"
  if (f < T_PARTIAL_END) return "rise_partial"
  if (f < T_FULL_END)    return "rise_full"
  if (f < T_CHARGE_END)  return "charge"
  if (f < T_FIRE_END)    return "fire"
  return "settle"
}

// ─────────────────────────────────────────────────────────────────
// UPDATE  (per frame while active; game.js freezes combat around this)
// ─────────────────────────────────────────────────────────────────
export function updateKuramaUltimate(ctx = {}) {
  if (!kuramaCine.active) return null

  const cam = ctx.camera || null
  const snd = ctx.sound || globalSound
  const f = kuramaCine.frame

  // Capture camera state once so we can pull OUT fast (raise the per-frame zoom
  // step) and restore it in endKurama/clearKuramaUltimate.
  if (f === 0 && cam) {
    kuramaCine._cam = cam
    kuramaCine.savedMaxStep = cam.maxZoomStep
    cam.maxZoomStep = 0.06                 // let the widen reach WIDE_ZOOM within the WIDEN beat
    snd?.play?.(SFX.DOMAIN_ACTIVATE)       // activation boom (shared domain SFX)
  }

  // Camera takeover: WIDEN the arena (framing BOTH fighters, zoomed out) and hold
  // it wide through the fox rise / charge / blast, then ease back on SETTLE.
  // game.js calls camera.advance() after this so the movement uses the shared
  // smoothing (never snaps).
  if (cam && kuramaCine.caster) {
    const opp = kuramaCine.opponent
    if (f < T_FIRE_END) {
      if (opp && cam.focusBetween) cam.focusBetween(kuramaCine.caster, opp, WIDE_ZOOM)
      else if (cam.focusOnFighter) cam.focusOnFighter(kuramaCine.caster, WIDE_ZOOM)
    } else {
      // SETTLE — drift back toward a normal framing before combat resumes.
      if (opp && cam.focusBetween) cam.focusBetween(kuramaCine.caster, opp, 0.8)
      else if (cam.focusOnFighter) cam.focusOnFighter(kuramaCine.caster, 0.85)
    }
  }

  // Screen shake escalates: charge rumble → detonation → blast tremor.
  if (cam && cam.shake) {
    if (f >= T_FULL_END && f < T_CHARGE_END && f % 8 === 0) {
      const ramp = (f - T_FULL_END) / KURAMA_TIMELINE.CHARGE
      cam.shake(5 + ramp * 6, 8)
    } else if (f === T_IMPACT) {
      cam.shake(26, 30)                    // detonation (camera caps strength at 14)
    } else if (f > T_IMPACT && f < T_FIRE_END && f % 6 === 0) {
      cam.shake(12, 10)
    }
  }

  // GUARANTEED HIT at the bomb-impact beat (dodge hook lives inside applyKuramaDamage).
  if (f === T_IMPACT && !kuramaCine.damageDealt) {
    kuramaCine.damageDealt = true
    applyKuramaDamage(ctx, snd)
  }

  kuramaCine.frame++
  if (kuramaCine.frame >= T_TOTAL) endKurama()

  return getKuramaPhase()
}

function applyKuramaDamage(ctx, snd) {
  const opp = kuramaCine.opponent
  if (!opp) return

  // ═══════════════════════════════════════════════════════════════════════════
  // QUICK-TIME DODGE HOOK  ── the Tailed Beast Bomb is a GUARANTEED hit for now.
  // To add an optional dodge QTE later: capture a timed input window during the
  // CHARGE beat (frames T_FULL_END..T_CHARGE_END) and compute the result here, then
  // set `dodged` accordingly. When dodged, skip/curtail the damage block below
  // (and optionally reposition the opponent). All cinematic visuals + camera stay
  // identical either way — only this damage application branches.
  const dodged = false   // TODO(dodge-qte): replace with real dodge-window check
  // ═══════════════════════════════════════════════════════════════════════════
  if (dodged) return

  opp.health = Math.max(0, (opp.health || 0) - KURAMA_DAMAGE)
  opp.hitstun = Math.max(opp.hitstun || 0, 30)
  opp.vx = 0
  opp.colorFlash = 10
  opp.teleportFlash = Math.max(opp.teleportFlash || 0, 10)

  const ocx = (opp.x || 0) + (opp.w || 0) / 2
  const ocy = (opp.y || 0) + (opp.h || 0) / 2
  // Push ONE hit spark carrying the damage — the game's hitSparks processor spawns
  // the floating damage number + records the hit from it (same path as Sukuna's
  // domain slashes), so we don't hand-roll the number or double-count it.
  if (Array.isArray(ctx.hitEffects)) {
    ctx.hitEffects.push({
      x: ocx, y: ocy, timer: 18, maxTimer: 18,
      category: "ultimate", color: "#ff7a1a",
      damage: KURAMA_DAMAGE, lines: 12, radius: 40
    })
  }
  snd?.play?.(SFX.HIT_HEAVY)
  if (opp.health <= 0) snd?.play?.(SFX.KO)
}

function endKurama() {
  const cam = kuramaCine._cam
  if (cam && kuramaCine.savedMaxStep != null) cam.maxZoomStep = kuramaCine.savedMaxStep
  kuramaCine.active = false
  kuramaCine.frame = 0
  kuramaCine.caster = null
  kuramaCine.opponent = null
  kuramaCine.damageDealt = false
  kuramaCine._cam = null
  kuramaCine.savedMaxStep = null
}

// Idempotent cleanup for every reset path (round reset / rematch / menu).
export function clearKuramaUltimate() {
  if (kuramaCine.active || kuramaCine._cam) endKurama()
}

// ─────────────────────────────────────────────────────────────────
// DRAW — fullscreen, SCREEN space, on top of the world (never blank: guarded)
// ─────────────────────────────────────────────────────────────────
function _ready(img) { return !!(img && img.complete && img.naturalWidth > 0) }

// Draw a cached sprite centered at (cx,cy). `h` sizes it to a target DISPLAY height
// (px); width follows the sprite's aspect. flipX mirrors horizontally. Returns the
// drawn {w,h} so callers can anchor FX (e.g. the mouth) to it.
function drawSprite(ctx, name, cx, cy, h, { alpha = 1, flipX = false, rot = 0 } = {}) {
  if (alpha <= 0 || h <= 0) return { w: 0, h: 0 }
  const img = art(name)
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
  ctx.translate(cx, cy)
  if (rot) ctx.rotate(rot)
  if (flipX) ctx.scale(-1, 1)
  let dw = h, dh = h
  if (_ready(img)) {
    const ar = img.naturalWidth / img.naturalHeight
    dh = h; dw = h * ar
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  } else {
    // Procedural fallback so a not-yet-loaded frame still reads as a fiery orb.
    const r = h / 2
    ctx.fillStyle = "#ff7a1a"; ctx.shadowColor = "#ffcf6b"; ctx.shadowBlur = 40
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
    dw = h; dh = h
  }
  ctx.restore()
  return { w: dw, h: dh }
}

function _flash(ctx, cw, ch, color, alpha) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha = Math.min(1, alpha); ctx.fillStyle = color
  ctx.fillRect(0, 0, cw, ch); ctx.restore()
}

// Map an opponent WORLD center to a SCREEN x/y using the same transform camera
// .applyTransform uses: screen = cw/2 + zoom*(world - camPos + shake). Falls back
// to a sensible side-of-screen point if no camera was captured.
function opponentScreenPos(cw, ch) {
  const opp = kuramaCine.opponent
  const cam = kuramaCine._cam
  const fallbackX = cw * (kuramaCine.enemySide > 0 ? 0.72 : 0.28)
  const fallbackY = ch * 0.62
  if (!opp || !cam) return { x: fallbackX, y: fallbackY }
  const ocx = (opp.x || 0) + (opp.w || 0) / 2
  const ocy = (opp.y || 0) + (opp.h || 0) / 2
  const z = cam.zoom || 1
  let sx = cw / 2 + z * (ocx - (cam.x || 0) + (cam.shakeX || 0))
  let sy = ch / 2 + z * (ocy - (cam.y || 0) + (cam.shakeY || 0))
  // keep the impact on-screen even if the frozen framing put the fighter near an edge
  sx = Math.max(cw * 0.14, Math.min(cw * 0.86, sx))
  sy = Math.max(ch * 0.30, Math.min(ch * 0.80, sy))
  return { x: sx, y: sy }
}

export function drawKuramaCinematic(ctx, canvas) {
  if (!kuramaCine.active || !ctx) return

  const cw = canvas?.width || (typeof window !== "undefined" ? window.innerWidth : 1280)
  const ch = canvas?.height || (typeof window !== "undefined" ? window.innerHeight : 720)
  const f = kuramaCine.frame
  const flip = kuramaCine.faceLeft

  // Fox spatial layout (screen space). Fox rises on the edge OPPOSITE the opponent.
  const foxCX = kuramaCine.enemySide > 0 ? cw * 0.30 : cw * 0.70   // opp right → fox left, & vice versa
  const groundY = ch * 0.92                                        // clip line = "the ground"
  const bodyH = ch * 0.74                                          // full fox display height
  const headH = ch * 0.34                                          // partial-head display height
  const bodyRestCY = groundY - bodyH * 0.46                        // resting center once fully risen
  // The mouth sits toward the head (upper, facing side). Offsets are fractions of
  // the drawn body box; the facing-side sign flips with the fox.
  const dirX = flip ? -1 : 1
  const mouthOffX = 0.40 * (bodyH * (707 / 418)) * dirX            // bodyW = bodyH*aspect
  const mouthOffY = -0.10 * bodyH

  if (f < T_WIDEN_END) {
    // WIDEN — quick white pop as the arena pulls out; a low ground glow marks the
    // spot the fox will erupt from.
    const p = f / T_WIDEN_END
    _flash(ctx, cw, ch, "#ffffff", (1 - p) * 0.6)
    ctx.save()
    ctx.globalAlpha = p * 0.5
    const g = ctx.createRadialGradient(foxCX, groundY, 4, foxCX, groundY, cw * 0.22)
    g.addColorStop(0, "#ffb04a"); g.addColorStop(1, "rgba(255,90,0,0)")
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(foxCX, groundY, cw * 0.22, 0, Math.PI * 2); ctx.fill()
    ctx.restore()

  } else if (f < T_PARTIAL_END) {
    // RISE_PARTIAL — the fox's HEAD breaks the ground first, sliding UP into view.
    const p = (f - T_WIDEN_END) / KURAMA_TIMELINE.RISE_PARTIAL
    _flash(ctx, cw, ch, "#2a0d00", 0.22 * p)
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, cw, groundY); ctx.clip()   // hide anything below ground
    const headRestCY = groundY - headH * 0.5
    const cy = groundY + headH * 0.6 + (headRestCY - (groundY + headH * 0.6)) * _ease(p)
    drawSprite(ctx, A.foxHead, foxCX, cy, headH, { alpha: 0.7 + p * 0.3, flipX: flip })
    ctx.restore()
    _groundDust(ctx, foxCX, groundY, headH * (707 / 418) * 0.5, p)

  } else if (f < T_FULL_END) {
    // RISE_FULL — the full body erupts and settles, facing the opponent.
    const p = (f - T_PARTIAL_END) / KURAMA_TIMELINE.RISE_FULL
    _flash(ctx, cw, ch, "#2a0d00", 0.26)
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, cw, groundY); ctx.clip()
    const startCY = groundY + bodyH * 0.5
    const cy = startCY + (bodyRestCY - startCY) * _ease(p)
    drawSprite(ctx, A.foxBody, foxCX, cy, bodyH, { alpha: 0.85 + p * 0.15, flipX: flip })
    ctx.restore()
    _groundDust(ctx, foxCX, groundY, bodyH * (707 / 418) * 0.5, 1 - p)

  } else if (f < T_CHARGE_END) {
    // CHARGE — fox holds; the Tailed Beast Bomb forms at the mouth (orb scales up).
    const p = (f - T_FULL_END) / KURAMA_TIMELINE.CHARGE
    _flash(ctx, cw, ch, "#1a0600", 0.30)
    drawSprite(ctx, A.foxBody, foxCX, bodyRestCY, bodyH, { alpha: 1, flipX: flip })
    const mx = foxCX + mouthOffX, my = bodyRestCY + mouthOffY
    // Chakra swirls in only as a FAINT background aura; the DARK Tailed Beast Bomb
    // (fx_tbb_dark_sphere_growth) is the star — it condenses out of the swirl and
    // GROWS small→large across the whole charge. (Previously the blue swirl was the
    // dominant orb, which read as a Rasengan; the dark sphere now leads.)
    drawSprite(ctx, A.charge, mx, my, (0.10 + p * 0.16) * ch, { alpha: 0.28, rot: f * 0.18 })
    drawSprite(ctx, A.dark, mx, my, (0.03 + _ease(p) * 0.14) * ch, { alpha: Math.min(1, 0.25 + p * 3) })

  } else if (f < T_FIRE_END) {
    // FIRE — the bomb flies mouth→opponent, then detonates: explosion_a/b →
    // shockwave_1..4 SEQUENCED (each a separate single-frame file), expanding.
    const lf = f - T_CHARGE_END               // 0..44
    _flash(ctx, cw, ch, "#1a0600", 0.20)
    // fox still looming behind the blast (solid/opaque)
    drawSprite(ctx, A.foxBody, foxCX, bodyRestCY, bodyH, { alpha: 1, flipX: flip })

    const mx = foxCX + mouthOffX, my = bodyRestCY + mouthOffY
    const tgt = opponentScreenPos(cw, ch)

    if (lf < IMPACT_OFFSET) {
      // travel — the DARK Tailed Beast Bomb streaks across the widened arena toward
      // the opponent, continuing to grow small→large as it approaches.
      const t = _ease(lf / IMPACT_OFFSET)
      const bx = mx + (tgt.x - mx) * t
      const by = my + (tgt.y - my) * t
      drawSprite(ctx, A.dark, bx, by, (0.17 + t * 0.13) * ch, { alpha: 1 })
      // faint motion trail
      drawSprite(ctx, A.dark, mx + (tgt.x - mx) * t * 0.85, my + (tgt.y - my) * t * 0.85, 0.13 * ch, { alpha: 0.3 })
    } else {
      // detonation — sequence the six blast files at the impact point, growing/fading
      const bf = lf - IMPACT_OFFSET           // 0..30
      _flash(ctx, cw, ch, "#ffffff", bf < 6 ? (1 - bf / 6) : 0)
      _flash(ctx, cw, ch, "#ff5a00", Math.max(0, 0.28 - bf / 120))
      const seq = [A.explA, A.explB, A.shock1, A.shock2, A.shock3, A.shock4]
      const span = KURAMA_TIMELINE.FIRE - IMPACT_OFFSET      // 31
      const idx = Math.min(seq.length - 1, Math.floor((bf / span) * seq.length))
      const grow = 1 + (bf / span) * 2.6
      const fade = Math.max(0, 1 - (bf / span) * 0.4)
      drawSprite(ctx, seq[idx], tgt.x, tgt.y, (ch * 0.34) * grow, { alpha: fade })
    }

  } else {
    // SETTLE — the last ring dissipates at the impact point; the fox sinks away.
    const p = (f - T_FIRE_END) / KURAMA_TIMELINE.SETTLE
    const tgt = opponentScreenPos(cw, ch)
    drawSprite(ctx, A.shock4, tgt.x, tgt.y, ch * 0.34 * 3.6, { alpha: (1 - p) * 0.4 })
    // fox sinks back into the ground
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, cw, groundY); ctx.clip()
    const cy = bodyRestCY + (groundY + bodyH * 0.5 - bodyRestCY) * _ease(p)
    drawSprite(ctx, A.foxBody, foxCX, cy, bodyH, { alpha: (1 - p) * 0.85, flipX: flip })
    ctx.restore()
  }
}

// ease-out cubic for organic rise/travel motion
function _ease(t) { t = Math.max(0, Math.min(1, t)); return 1 - Math.pow(1 - t, 3) }

// procedural dust kicked up where the fox breaks the ground (no dedicated asset)
function _groundDust(ctx, cx, gy, spread, strength) {
  if (strength <= 0) return
  ctx.save()
  ctx.globalAlpha = Math.min(0.5, strength * 0.5)
  const g = ctx.createRadialGradient(cx, gy, 4, cx, gy, spread)
  g.addColorStop(0, "rgba(120,90,60,0.9)"); g.addColorStop(1, "rgba(120,90,60,0)")
  ctx.fillStyle = g
  ctx.beginPath(); ctx.ellipse(cx, gy, spread, spread * 0.4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}
