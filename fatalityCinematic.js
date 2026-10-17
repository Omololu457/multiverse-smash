// fatalityCinematic.js
// ─────────────────────────────────────────────────────────────────
// ROSTER-WIDE FATALITY — MK-style "FINISH THEM" window at match-end + press ULTIMATE to perform the finisher.
// At the KO that ends a match, game.js calls startFinishWindow(winner, victim) instead of going straight to the
// victory screen; this module runs the window (reads the winner's Ultimate press) and, if pressed, plays a
// style-themed CUTAWAY using the victim's PRE-BUILT derived sprite (fatality/<key>_<style>.png) — slice / smoosh
// / riddle / ash per the winner's archetype (fatalityStyles.js). Self-contained fullscreen overlay: no sprite-
// system hooks. Combat is already over (victim at 0 HP), so the fatality is purely cosmetic → game.js enters the
// victory screen when fatalityDone(). Deterministic frame timing; imports only sound.js + fatalityStyles.js.
// ─────────────────────────────────────────────────────────────────
import { sound } from "./sound.js"
import { fatalityStyleFor, fatalitySpritePath, STYLE_FX } from "./fatalityStyles.js"

let _f = null   // { phase:"window"|"fatality"|"done", t, winner, victim, style, fx, img, imgReady, prevUlt }

const WINDOW_FRAMES = 180   // ~3s to press Ultimate
const STRIKES = [16, 24, 32, 40, 48], STRIKES_END = 54, CHOP = 70, END = 138

export function isFatalityActive() { return !!_f && _f.phase !== "done" }
export function fatalityDone() { return !!_f && _f.phase === "done" }
export function fatalityWinner() { return _f ? _f.winner : null }
// true only if the player actually INPUT a fatality (window → "fatality" phase); false if the window timed out.
// game.js reads this (before clearing) to decide: performed → victory; timed-out → play the winner's brutality.
export function fatalityWasPerformed() { return !!_f && !!_f.performed }
export function fatalityStatus() { return _f ? { phase: _f.phase, t: _f.t, style: _f.style, imgReady: _f.imgReady } : { phase: null } }
export function clearFatalityCinematic() { _f = null }

export function startFinishWindow(winner, victim) {
  if (_f || !winner || !victim) return false
  const wKey = (winner.rosterKey || winner.id || "").toLowerCase()
  const vKey = (victim.rosterKey || victim.id || "").toLowerCase()
  const style = fatalityStyleFor(wKey)
  const rec = { phase: "window", t: 0, winner, victim, style, fx: STYLE_FX[style] || STYLE_FX.slice, img: null, imgReady: false, prevUlt: true }
  try { const img = new Image(); img.onload = () => { rec.imgReady = true }; img.src = fatalitySpritePath(wKey, vKey); rec.img = img } catch (_) {}
  try { winner.vx = 0; victim.vx = 0 } catch (_) {}
  _f = rec
  return true
}

export function updateFatalityCinematic(ctx = {}) {
  const s = _f; if (!s) return
  const snd = ctx.sound || sound
  if (s.phase === "window") {
    s.t++
    const ult = !!ctx.ultPressed
    if (ult && !s.prevUlt) { s.phase = "fatality"; s.t = 0; s.performed = true }   // rising edge → perform the fatality
    s.prevUlt = ult
    if (s.phase === "window" && s.t >= WINDOW_FRAMES) s.phase = "done"   // timed out → normal victory
    return
  }
  if (s.phase === "fatality") {
    s.t++
    if (s.t === 2) snd?.playJuiceSfx?.(s.fx.lead, { gain: 0.55 })
    if (STRIKES.includes(s.t)) { snd?.playJuiceSfx?.(s.fx.lead, { gain: 0.45 }); snd?.playJuiceSfx?.("warp_wobble_01", { gain: 0.25 }) }
    if (s.t === STRIKES_END + 1) { snd?.playJuiceSfx?.(s.fx.boom, { gain: 1.0, ultBoom: true, duckSec: 0.6 }); snd?.playJuiceSfx?.("rumble_tail_01", { gain: 0.6, delay: 4 / 60 }) }
    if (s.t >= END) s.phase = "done"
    return
  }
}

export function drawFatalityCinematic(c, canvas) {
  const s = _f; if (!s || !c || !canvas) return
  const W = canvas.width, H = canvas.height
  c.save()
  if (s.phase === "window") {
    // dark vignette edges + pulsing "FINISH THEM — press ULTIMATE" + a draining timer bar
    const pulse = 0.5 + 0.5 * Math.sin(s.t * 0.25)
    c.fillStyle = "rgba(0,0,0,0.28)"; c.fillRect(0, 0, W, H / 6); c.fillRect(0, H * 5 / 6, W, H / 6)
    c.textAlign = "center"
    c.fillStyle = `rgba(230,30,34,${(0.7 + 0.3 * pulse).toFixed(3)})`
    c.font = `800 ${Math.floor(H * 0.11)}px Arial`; c.fillText("FINISH THEM!", W / 2, H * 0.42)
    c.fillStyle = `rgba(255,220,120,${(0.6 + 0.4 * pulse).toFixed(3)})`
    c.font = `700 ${Math.floor(H * 0.045)}px Arial`; c.fillText("press  ULTIMATE", W / 2, H * 0.52)
    const frac = 1 - s.t / WINDOW_FRAMES, bw = W * 0.4
    c.fillStyle = "rgba(255,255,255,0.15)"; c.fillRect(W / 2 - bw / 2, H * 0.58, bw, 8)
    c.fillStyle = "rgba(230,30,34,0.9)"; c.fillRect(W / 2 - bw / 2, H * 0.58, bw * Math.max(0, frac), 8)
    c.restore(); return
  }
  // fatality cutaway (style-tinted)
  const t = s.t, tint = s.fx.tint
  const dark = Math.min(0.85, (t / STRIKES_END) * 0.85)
  c.fillStyle = `rgba(6,2,4,${dark.toFixed(3)})`; c.fillRect(0, 0, W, H)
  if (t <= STRIKES_END + 2) for (const sf of STRIKES) {
    const age = t - sf
    if (age >= 0 && age < 6) {
      const a = 1 - age / 6, seed = sf * 37, x0 = seed * 53 % W, y0 = seed * 29 % (H | 1), dir = sf % 2 ? 1 : -1
      c.strokeStyle = tint; c.globalAlpha = a; c.lineWidth = 3 * a + 1
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + dir * 200, y0 + 150); c.stroke(); c.globalAlpha = 1
    }
  }
  if (t >= STRIKES_END && t < STRIKES_END + 5) { const a = 1 - (t - STRIKES_END) / 5; c.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; c.fillRect(0, 0, W, H) }
  if (t >= STRIKES_END + 2 && s.imgReady && s.img) {
    const img = s.img, grow = Math.min(1, (t - STRIKES_END) / 9)
    const scale = Math.min((H * 0.6) / img.height, (W * 0.5) / img.width) * (0.72 + 0.28 * grow)
    const dw = img.width * scale, dh = img.height * scale
    c.fillStyle = tint; c.globalAlpha = 0.45; c.beginPath(); c.arc(W / 2, H * 0.5, dw * 0.75 * grow, 0, 7); c.fill(); c.globalAlpha = 1
    c.imageSmoothingEnabled = false; c.drawImage(img, W / 2 - dw / 2, H * 0.54 - dh / 2, dw, dh)
  }
  if (t >= CHOP) {
    const fade = Math.min(1, (t - CHOP) / 8) * Math.min(1, (END - t) / 12)
    c.fillStyle = tint; c.globalAlpha = 0.95 * fade
    c.font = `800 ${Math.floor(H * 0.1)}px Arial`; c.textAlign = "center"; c.fillText(s.fx.banner, W / 2, H * 0.17)
    c.globalAlpha = 1
  }
  c.restore()
}
