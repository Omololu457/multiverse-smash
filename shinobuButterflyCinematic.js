// shinobuButterflyCinematic.js
// SHINOBU KOCHO ULTIMATE — "Insect Breathing · Butterfly Dance: Caprice" — a frozen combat cinematic.
// Contract (unchanged; game.js / abilities.js untouched):
//   • abilities.executeShinobuUltimate() plays her windup line and calls activateShinobuButterflyCinematic(caster, opponent, onImpact).
//   • updateBattle() freezes combat while isShinobuButterflyCinematicActive() and calls
//     updateShinobuButterflyCinematic({camera, sound, hitEffects, damageNumbers}) + camera.advance().
//   • drawBattle() calls drawShinobuButterflyCinematic(ctx, canvas) as a fullscreen overlay.
//   • the DAMAGE (+ the wisteria poison) is applied by onImpact() exactly once, at the last sting.
//   • every reset path calls clearShinobuButterflyCinematic().
//
// Shot list (60 fps):
//   GATHER [0,100)    close-up; violet butterflies spiral in around her. 蟲の呼吸 "INSECT BREATHING".
//   AIM    [100,150)  the stinger blade levels at the foe: 蝶ノ舞 "BUTTERFLY DANCE" · 戯れ "CAPRICE"; the camera runs down the blade.
//   DANCE  [150,214)  four flits around the foe — in front, behind, in front, behind — each a sting that leaves a glowing
//                      puncture and a burst of butterflies (render beats; no damage yet).
//   FINAL  [214,290)  she lands past them, the spin finish; at 222 the poison blooms from every sting (THE damage), wisteria
//                      petals and butterflies scatter, the camera pulls back.
// Deterministic (frame-indexed, no RNG). Self-contained: imports sound.js + dsCineKit.js (no cycle).

import { sound as globalSound, SFX } from "./sound.js"
import { ease, cx, hsh, toScreen, camOpen, camRestore, pose, drawCalligraphy, drawLetterbox, drawVignette, butterfly } from "./dsCineKit.js"

export const SHINOBU_ULT_CINE_TIMELINE = { GATHER: 100, AIM: 50, DANCE: 64, FINAL: 76 }
const T_AIM = 100, T_DANCE = 150, T_FINAL = 214, T_IMPACT = 222, T_TOTAL = 290
const FLITS = [150, 166, 182, 198]                      // sting beats
const STING_PTS = [[0.15, 0.28], [-0.2, 0.42], [0.1, 0.6], [-0.05, 0.36]]   // (dx·w, y·h) on the foe
const WORDS = [[40, "蟲の呼吸", "INSECT BREATHING"], [100, "蝶ノ舞", "BUTTERFLY DANCE"], [128, "戯れ", "CAPRICE"]]
const VIOLET = ["#b98cff", "#e6d4ff", "#8a4dff", "#d9a8ff"]

const cine = { active: false, frame: 0, caster: null, opponent: null, onImpact: null, struck: false, _cam: null, saved: null,
  startX: null, targetX: null, dir: 1, opp0: null }

export function activateShinobuButterflyCinematic(caster, opponent, onImpact) {
  if (!caster) return false
  const dir = (caster.facing ?? 1) >= 0 ? 1 : -1
  Object.assign(cine, { active: true, frame: 0, caster, opponent: opponent || null, onImpact: typeof onImpact === "function" ? onImpact : null,
    struck: false, _cam: null, saved: null, dir, startX: caster.x, opp0: opponent ? { x: cx(opponent), y: opponent.y || 0, w: opponent.w || 60, h: opponent.h || 100 } : null })
  const w = caster.w || 60
  cine.targetX = opponent ? cx(opponent) + dir * ((opponent.w || 60) / 2 + w / 2 + 60) - w / 2 : caster.x + dir * 220
  caster._spriteCastMove = "shinobuUltimate"; caster._spriteCastTimer = T_TOTAL + 8
  caster.attacking = false; caster.vx = 0
  return true
}

export function isShinobuButterflyCinematicActive() { return cine.active }

export function getShinobuButterflyCinematicPhase() {
  if (!cine.active) return null
  const f = cine.frame
  return f < T_AIM ? "gather" : f < T_DANCE ? "aim" : f < T_FINAL ? "dance" : "final"
}

export function getShinobuButterflyCinematicStatus() {
  return {
    active: cine.active, frame: cine.frame, phase: getShinobuButterflyCinematicPhase(),
    total: T_TOTAL, impactFrame: T_IMPACT, struck: cine.struck,
    casterKey: cine.caster?.rosterKey ?? null, casterSide: cine.caster?.side ?? null,
    casterX: cine.caster?.x ?? null, startX: cine.startX, targetX: cine.targetX
  }
}

// where she stands for flit i (alternating sides of the foe, clamped into the world)
function flitX(i) {
  const c = cine.caster, o = cine.opp0, w = c.w || 60, ww = cine._cam?.worldWidth || 3200
  if (!o) return cine.startX + cine.dir * (60 + i * 40)
  const side = (i % 2 === 0 ? -1 : 1) * cine.dir
  return Math.max(20, Math.min(ww - 20 - w, o.x + side * (o.w / 2 + w / 2 + 26) - w / 2))
}

export function updateShinobuButterflyCinematic(ctx = {}) {
  if (!cine.active) return null
  const cam = ctx.camera || null, snd = ctx.sound || globalSound
  const f = cine.frame, c = cine.caster, opp = cine.opponent
  if (f === 0 && cam) { cine._cam = cam; cine.saved = camOpen(cam, 3.0) }

  // her sprite (shinobuUltimate: 0-1 stance, 2-4 thrust, 5 blade up, 6-8 spinning finish)
  if (f < T_AIM) pose(c, "shinobuUltimate", f < 60 ? 0 : 5)
  else if (f < T_DANCE) pose(c, "shinobuUltimate", f < 112 ? 1 : f < 124 ? 2 : 3)
  else if (f < T_FINAL) { const i = FLITS.findLastIndex(t => f >= t), k = f - FLITS[i]; pose(c, "shinobuUltimate", k < 3 ? 2 : k < 9 ? 4 : 3) }
  else pose(c, "shinobuUltimate", Math.min(8, 6 + Math.floor((f - T_FINAL) / 6)))

  // the flits: she blinks to each side of the foe, always facing them; then lands past them
  if (c && f >= T_DANCE && f < T_FINAL) {
    const i = FLITS.findLastIndex(t => f >= t)
    if (f === FLITS[i]) { c.x = flitX(i); if (cine.opp0) c.facing = cine.opp0.x >= cx(c) ? 1 : -1; try { snd?.play?.(SFX.WHIFF) } catch (_) {} }
    if (f === FLITS[i] + 3) { try { snd?.play?.(SFX.HIT_LIGHT) } catch (_) {} }
  }
  if (c && f === T_FINAL) { c.x = cine.targetX; c.facing = cine.dir; try { snd?.play?.(SFX.WHIFF) } catch (_) {} }

  if (cam && c) {
    if (f < T_AIM) { cam.focusOnFighter(c, 1.7 + 1.1 * ease(f / 70)); cam.targetY = (c.y || 0) + (c.h || 100) * 0.35 }
    else if (f < T_DANCE) { if (opp) cam.focusBetween(c, opp, 1.35 + 0.25 * ease((f - T_AIM) / 50)); else cam.focusOnFighter(c, 1.6) }
    else if (f < T_IMPACT) { if (opp) cam.focusOnFighter(opp, 2.0); cam.maxPanStep = 160 }
    else { const k = ease((f - T_IMPACT) / (T_TOTAL - T_IMPACT)); if (opp) cam.focusBetween(c, opp, 1.8 - 0.8 * k); else cam.focusOnFighter(c, 1.0); cam.maxPanStep = 90 }
    if (cam.shake) {
      if (FLITS.includes(f - 3)) cam.shake(7, 6)
      if (f === T_IMPACT) cam.shake(24, 24)
    }
  }

  if (f === T_IMPACT && !cine.struck) {
    cine.struck = true
    try { snd?.play?.(SFX.HIT_ULTIMATE) } catch (_) {}
    try { cine.onImpact?.(ctx) } catch (_) {}
    // she is past them, back turned: the bloom throws the foe AWAY from her
    if (opp && c && Math.sign(opp.vx || 0) === Math.sign(cx(c) - cx(opp))) opp.vx = -opp.vx
  }

  cine.frame++
  if (cine.frame >= T_TOTAL) endShinobuButterflyCinematic()
  return getShinobuButterflyCinematicPhase()
}

function endShinobuButterflyCinematic() {
  camRestore(cine._cam, cine.saved)
  if (!cine.struck) { cine.struck = true; try { cine.onImpact?.({}) } catch (_) {} }
  if (cine.caster) { pose(cine.caster, null); if (cine.opponent) cine.caster.facing = cx(cine.opponent) >= cx(cine.caster) ? 1 : -1 }
  Object.assign(cine, { active: false, frame: 0, caster: null, opponent: null, onImpact: null, struck: false, _cam: null, saved: null, startX: null, targetX: null, opp0: null })
}

export function clearShinobuButterflyCinematic() {
  if (cine.active || cine._cam) endShinobuButterflyCinematic()
}

// ─────────────────────────────────────────────────────────────────
// DRAW
// ─────────────────────────────────────────────────────────────────
export function drawShinobuButterflyCinematic(ctx, canvas) {
  if (!cine.active || !ctx) return
  const cw = canvas?.width || 1280, ch = canvas?.height || 720
  const f = cine.frame, c = cine.caster, cam = cine._cam, o = cine.opp0
  if (!c) return
  const me = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100) * 0.4), z = me.z
  const sting = i => o ? toScreen(cam, cw, ch, o.x + STING_PTS[i][0] * o.w * 2, o.y + STING_PTS[i][1] * o.h) : null
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0)

  const dim = f < T_IMPACT ? Math.min(0.72, f / 70) : Math.max(0, 0.72 * (1 - (f - T_IMPACT) / 50))
  drawVignette(ctx, cw, ch, me.x, me.y, dim, "18,4,32")

  // GATHER/AIM: butterflies spiral in around her, then stream along the blade toward the foe
  if (f < T_DANCE + 10) {
    const n = 22
    for (let i = 0; i < n; i++) {
      const a = hsh(i, 1) * Math.PI * 2 + f * (0.03 + hsh(i, 2) * 0.03), k = Math.min(1, f / (60 + hsh(i, 3) * 40))
      let r = (260 - 190 * ease(k)) * z * 0.6 + 20, x = me.x + Math.cos(a) * r, y = me.y + Math.sin(a) * r * 0.6
      if (f >= T_AIM && o) { const t = ease(Math.min(1, (f - T_AIM - hsh(i, 4) * 20) / 40)), oo = toScreen(cam, cw, ch, o.x, o.y + o.h * 0.4); x += (oo.x - x) * t * 0.9; y += (oo.y - y) * t * 0.9 }
      ctx.globalAlpha = Math.min(1, f / 20) * (f > T_DANCE ? Math.max(0, 1 - (f - T_DANCE) / 10) : 1)
      butterfly(ctx, x, y, (9 + hsh(i, 5) * 6) * Math.max(1, z * 0.6), f * 0.5 + i, VIOLET[i % 4])
    }
  }

  // DANCE + FINAL: the stings — a white streak for each flit, a glowing puncture that stays, a butterfly burst
  if (o && f >= T_DANCE) {
    ctx.globalCompositeOperation = "lighter"
    FLITS.forEach((t, i) => {
      if (f < t) return
      const p = sting(i), k = f - t
      if (k < 8) {   // the lunge streak from her side through the sting point
        const side = (i % 2 === 0 ? -1 : 1) * cine.dir
        ctx.globalAlpha = 1 - k / 8; ctx.strokeStyle = "#f3e8ff"; ctx.lineWidth = 6 * p.z; ctx.lineCap = "round"
        ctx.beginPath(); ctx.moveTo(p.x + side * 140 * p.z, p.y - 10 * p.z); ctx.lineTo(p.x - side * 30 * p.z, p.y + 4 * p.z); ctx.stroke()
      }
      const glow = f < T_IMPACT ? 0.8 + 0.2 * Math.sin(f * 0.6 + i) : Math.max(0, 1 - (f - T_IMPACT) / 30)
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16 * p.z); g.addColorStop(0, `rgba(235,210,255,${glow})`); g.addColorStop(1, "rgba(140,60,255,0)")
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(p.x - 20 * p.z, p.y - 20 * p.z, 40 * p.z, 40 * p.z)
      if (k < 26) for (let j = 0; j < 6; j++) {
        const a = hsh(i * 9 + j, 7) * Math.PI * 2, d = k * (2 + hsh(j, i) * 2) * p.z
        ctx.globalAlpha = 1 - k / 26; butterfly(ctx, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d - k * 1.2, 7 * Math.max(1, p.z * 0.6), f * 0.6 + j, VIOLET[j % 4])
      }
    })
    ctx.globalCompositeOperation = "source-over"
  }

  // THE BLOOM: wisteria poison bursts from every sting — veins between them, petals and butterflies scatter
  if (o && f >= T_IMPACT) {
    const k = (f - T_IMPACT) / (T_TOTAL - T_IMPACT), a = Math.max(0, 1 - k * 1.1)
    if (f < T_IMPACT + 6) { ctx.globalAlpha = 0.7 * (1 - (f - T_IMPACT) / 6); ctx.fillStyle = "#f0e2ff"; ctx.fillRect(0, 0, cw, ch) }
    const pts = FLITS.map((_, i) => sting(i))
    ctx.globalAlpha = a; ctx.strokeStyle = "#a24dff"; ctx.lineWidth = 3 * pts[0].z
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.stroke()
    pts.forEach((p, i) => {
      const r = ease(Math.min(1, k * 2.5)) * 70 * p.z
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r + 1); g.addColorStop(0, `rgba(200,120,255,${0.7 * a})`); g.addColorStop(1, "rgba(120,40,220,0)")
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r + 1, 0, Math.PI * 2); ctx.fill()
    })
    for (let i = 0; i < 40; i++) {   // petals + butterflies scatter outward and drift down
      const p = pts[i % 4], ang = hsh(i, 11) * Math.PI * 2, d = ease(Math.min(1, k * 1.6)) * (80 + 220 * hsh(i, 12)) * p.z
      const x = p.x + Math.cos(ang) * d, y = p.y + Math.sin(ang) * d * 0.7 + k * 80 * p.z
      ctx.globalAlpha = a
      if (i % 3) { ctx.fillStyle = i % 2 ? "#c79bff" : "#efe0ff"; ctx.beginPath(); ctx.ellipse(x, y, 5 * p.z * 0.6, 2.5 * p.z * 0.6, ang + f * 0.1, 0, Math.PI * 2); ctx.fill() }
      else butterfly(ctx, x, y, 8 * Math.max(1, p.z * 0.6), f * 0.5 + i, VIOLET[i % 4])
    }
    for (let i = 0; i < 2; i++) { const t = Math.min(1, k * 1.8 - i * 0.2); if (t <= 0 || t >= 1) continue
      const p = toScreen(cam, cw, ch, o.x, o.y + o.h * 0.45); ctx.globalAlpha = (1 - t) * 0.8; ctx.strokeStyle = i ? "#8a4dff" : "#e6d4ff"; ctx.lineWidth = 6 * (1 - t) + 2
      ctx.beginPath(); ctx.ellipse(p.x, p.y, t * cw * 0.35, t * cw * 0.12, 0, 0, Math.PI * 2); ctx.stroke() }
  }

  if (f < T_DANCE + 6) drawCalligraphy(ctx, cw, ch, f, WORDS, me.x, { fade: f >= T_DANCE ? 1 - (f - T_DANCE) / 6 : 1, accent: "#b98cff", ink: "#f3e8ff" })
  drawLetterbox(ctx, cw, ch, f, T_TOTAL)
  ctx.restore()
}
