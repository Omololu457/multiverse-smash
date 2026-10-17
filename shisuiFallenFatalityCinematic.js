// shisuiFallenFatalityCinematic.js
// ─────────────────────────────────────────────────────────────────
// SHISUI (FALLEN) — ULTIMATE FATALITY. Fires when the victim is near death and Shisui's NEUTRAL Ultimate is
// pressed (trigger lives in abilities.js executeShisuiFallenUltimate; the game.js hooks just run + draw this).
// A self-contained FULLSCREEN CUTAWAY — it never touches the sprite system: darken → flicker-slash strikes →
// white chop-flash → the PRE-BUILT chopped-victim sprite (fatality/<key>_chopped.png) slams in with a blood
// burst → hold → the victim is KO'd. Presentation-only; combat is frozen while active (game.js innerCineActive).
// Deterministic frame timing (no RNG). Imports only ./sound.js — no import cycle.
// ─────────────────────────────────────────────────────────────────
import { sound } from "./sound.js"

let _st = null   // { t, victim, attacker, img, imgReady, done, key }

// cumulative frame thresholds (60fps): zoom/darken → strikes → chop → hold → end
const PH = { STRIKES_END: 54, CHOP: 70, END: 140 }
const STRIKE_FRAMES = [16, 24, 32, 40, 48]

export function isShisuiFallenFatalityActive() { return !!_st }
export function shisuiFallenFatalityStatus() { return _st ? { t: _st.t, done: _st.done, key: _st.key, imgReady: _st.imgReady } : { active: false } }

export function activateShisuiFallenFatality(attacker, victim) {
  if (_st || !victim || !attacker) return false
  const key = (victim.rosterKey || victim.id || "").toLowerCase()
  const rec = { t: 0, victim, attacker, img: null, imgReady: false, done: false, key }
  try {
    const img = new Image()
    img.onload = () => { rec.imgReady = true }
    img.src = `./fatality/${key}_chopped.png`
    rec.img = img
  } catch (_) {}
  // freeze both fighters in place for the cutaway (stun+invuln instead of the global cine-freeze, so this
  // needs no innerCineActive() hook — just update+draw in game.js).
  try {
    victim.vx = 0; victim.vy = 0; victim.invulnTimer = 9999; victim.hitstun = PH.END; victim.attackCooldown = PH.END; victim.isCharging = false
    attacker.vx = 0; attacker.invulnTimer = 9999; attacker.attackCooldown = PH.END
  } catch (_) {}
  _st = rec
  return true
}

export function clearShisuiFallenFatalityCinematic() { _st = null }

export function updateShisuiFallenFatalityCinematic(ctx = {}) {
  const s = _st; if (!s) return
  const snd = ctx.sound || sound
  s.t++
  if (s.t === 2) snd?.playJuiceSfx?.("boom_anticipation_suck", { gain: 0.55 })
  if (STRIKE_FRAMES.includes(s.t)) { snd?.playJuiceSfx?.("crack_sizzle_bright", { gain: 0.5 }); snd?.playJuiceSfx?.("warp_wobble_01", { gain: 0.3 }) }
  if (s.t === PH.STRIKES_END + 1) { snd?.playJuiceSfx?.("boom_huge_01", { gain: 1.0, ultBoom: true, duckSec: 0.6 }); snd?.playJuiceSfx?.("rumble_tail_01", { gain: 0.6, delay: 4 / 60 }) }
  // END — clear the cutaway FIRST, then KO the victim, so match-over fires the frame AFTER we've cleared
  // (KO'ing mid-cutaway would end the match → updateBattle stops → the cinematic would freeze unfinished).
  if (s.t >= PH.END && !s.done) {
    const v = s.victim; s.done = true
    clearShisuiFallenFatalityCinematic()
    try { v.health = 0; v.hitstun = 0; v.eliminated = true } catch (_) {}
  }
}

export function drawShisuiFallenFatalityCinematic(c, canvas) {
  const s = _st; if (!s || !c || !canvas) return
  const W = canvas.width, H = canvas.height, t = s.t
  c.save()
  // 1) darken the stage (builds through the strike phase)
  const dark = Math.min(0.85, (t / PH.STRIKES_END) * 0.85)
  c.fillStyle = `rgba(6,2,4,${dark.toFixed(3)})`; c.fillRect(0, 0, W, H)
  // 2) flicker-slash strikes — sharp red/white diagonal cuts flashing across the frozen scene
  if (t <= PH.STRIKES_END + 2) {
    for (const sf of STRIKE_FRAMES) {
      const age = t - sf
      if (age >= 0 && age < 6) {
        const a = 1 - age / 6, seed = sf * 37
        const x0 = seed * 53 % W, y0 = seed * 29 % (H | 1)
        const dir = sf % 2 ? 1 : -1
        c.strokeStyle = `rgba(255,${40 + seed % 60},40,${a.toFixed(3)})`; c.lineWidth = 3 * a + 1
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + dir * 200, y0 + 150); c.stroke()
        c.fillStyle = `rgba(206,18,24,${(a * 0.8).toFixed(3)})`
        c.beginPath(); c.arc(x0 + dir * 100, y0 + 75, 6 * a + 2, 0, 7); c.fill()
      }
    }
  }
  // 3) the CHOP — a white flash
  if (t >= PH.STRIKES_END && t < PH.STRIKES_END + 5) { const a = 1 - (t - PH.STRIKES_END) / 5; c.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`; c.fillRect(0, 0, W, H) }
  // 4) the pre-built chopped sprite SLAMS in + a blood burst, then holds
  if (t >= PH.STRIKES_END + 2 && s.imgReady && s.img) {
    const img = s.img, grow = Math.min(1, (t - PH.STRIKES_END) / 9)
    const scale = Math.min((H * 0.6) / img.height, (W * 0.5) / img.width) * (0.72 + 0.28 * grow)
    const dw = img.width * scale, dh = img.height * scale
    const dx = W / 2 - dw / 2, dy = H * 0.54 - dh / 2
    c.fillStyle = "rgba(150,10,14,0.5)"; c.beginPath(); c.arc(W / 2, H * 0.5, dw * 0.75 * grow, 0, 7); c.fill()
    c.imageSmoothingEnabled = false
    c.drawImage(img, dx, dy, dw, dh)
  }
  // 5) flavour banner on the hold
  if (t >= PH.CHOP) {
    const fade = Math.min(1, (t - PH.CHOP) / 8) * Math.min(1, (PH.END - t) / 12)
    c.fillStyle = `rgba(190,14,18,${(0.95 * fade).toFixed(3)})`
    c.font = `700 ${Math.floor(H * 0.09)}px Arial`; c.textAlign = "center"
    c.fillText("CUT TO PIECES", W / 2, H * 0.17)
  }
  c.restore()
}
