// flashUlt.js — the Flash's FLASH TIME activation rebuilt as a full cinematic (2026-11-24, owner: "give every character
// their own special ultimate"). Flash Time stays exactly what it is — a timed buff MODE (0 damage by design: the opponent's
// time slows, Flash speeds up), applied by abilities.executeFlashUltimate, which then starts flashTimeCinematic.js's frozen
// activation (camera push / hold / burst / settle, 150 f). This module wraps that activation in a cineRegistry freeze cine
// of the same active() (cineRegistry is checked before game.js's own Flash Time branch, so the legacy update is driven from
// here) and owns the picture:
//   SPEED FORCE  f0-45    letterbox; red / gold lightning crackles off him, building; the FLASH TIME title cut-in
//   THE WORLD…   f45-105  a time-ripple rolls out from him: everything outside his speed-force bubble drains to grey and
//                         stops — dust and embers hang mid-air, the lightning tightens into a vortex around him
//   …STOPS       f105     a lightning bolt strikes him: white-gold frame, a 10 f held burst, "FLASH TIME" slams in
//   FASTEST MAN  f105-150 the bubble stays, colour seeps back as the mode goes live: "There's only one fastest man alive."
// Deterministic: everything is a function of the activation's frame + a real-frame counter (no Math.random / clock).
import { registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { isFlashTimeCinematicActive, updateFlashTimeCinematic, clearFlashTimeCinematic, getFlashTimeCinematicStatus } from './flashTimeCinematic.js'
import { sound } from './sound.js'
import { drawFlashUltScreen } from './flashUltFx.js'

export const FT = { burst: 105, hold: 10, voAt: 112, line: 'flashinj2_002_t01m36_8s.mp3' }
const D = { on: false }
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const reset = () => { for (const k of Object.keys(D)) delete D[k]; D.on = false }

// the legacy activation frames its caster with camera.focusOnFighter — a pass-through proxy learns who Flash is
function spy(ctx) {
  const cam = ctx.camera
  if (!cam) return ctx
  const proxy = new Proxy(cam, {
    get(t, p) { if (p === 'focusOnFighter') return (f, z) => { D.caster = f; return t.focusOnFighter(f, z) }; const v = t[p]; return typeof v === 'function' ? v.bind(t) : v },
    set(t, p, v) { t[p] = v; return true },
  })
  return { ...ctx, camera: proxy }
}
function update(ctx0 = {}) {
  const ctx = spy(ctx0)
  const st = getFlashTimeCinematicStatus()
  if (!st.active) { reset(); return }
  if (!D.on || (st.frame === 0 && D.k > 0)) { reset(); Object.assign(D, { on: true, k: 0, real: 0, hold: 0, held: false, fired: {}, caster: D.caster || null }) }
  D.real++
  const k = st.frame
  const once = key => (D.fired[key] ? false : (D.fired[key] = true))
  if (D.hold > 0) { D.hold--; if (D.hold === 0) { try { updateFlashTimeCinematic(ctx) } catch (_) {} } D.k = getFlashTimeCinematicStatus().frame; return }
  if (k === 0 && once('open')) { sfx(ctx, 'charge_hum_rise', 0.7); sfx(ctx, 'crack_sizzle_bright', 0.6) }
  if ((k === 12 || k === 24 || k === 34 || k === 52 || k === 66 || k === 80 || k === 92) && once('z' + k)) sfx(ctx, 'crack_sizzle_bright', 0.35 + k / 300)
  if (k === 20 && once('title')) sfx(ctx, 'swish_fast_02', 0.7)
  if (k === 45 && once('ripple')) { sfx(ctx, 'pitch_drop_slowmo', 1); sfx(ctx, 'warp_wobble_01', 0.8) }
  if (k === 60 && once('hum')) sfx(ctx, 'energy_tone_hold', 0.5)
  if (k === 88 && once('rise')) sfx(ctx, 'charge_swell_riser', 0.9)
  if (k === 100 && once('suck')) sfx(ctx, 'boom_anticipation_suck', 0.9)
  if (k === FT.burst && !D.held) {   // the strike: hold the burst frame, then let the legacy burst fire
    D.held = true; D.hold = FT.hold; D.burstReal = D.real
    sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 0.9); sfx(ctx, 'crack_sizzle_bright', 1)
    D.k = k; return
  }
  if (k === FT.voAt && once('vo')) { try { sound.playSfxFile?.(FT.line, null, { owner: D.caster }) } catch (_) {} }
  if (k === FT.voAt + 2 && once('tail')) sfx(ctx, 'rumble_tail_01', 0.6)
  try { updateFlashTimeCinematic(ctx) } catch (_) {}
  D.k = getFlashTimeCinematicStatus().frame
  if (!isFlashTimeCinematicActive()) reset()
}
function clear() { try { clearFlashTimeCinematic() } finally { reset() } }
export const flashUltScene = () => (D.on && isFlashTimeCinematicActive() ? D : null)

registerFreezeCine('flash_time', { active: isFlashTimeCinematicActive, update, clear })
registerCineScreen('flash_time', (ctx, canvas) => {
  if (!isFlashTimeCinematicActive()) { if (D.on) reset(); return false }
  if (!D.on) return false
  drawFlashUltScreen(ctx, canvas, D, getFlashTimeCinematicStatus())
  return true
})
