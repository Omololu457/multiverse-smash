// tojiUlt.js — Toji Fushiguro (toji) ULTIMATE "REINCARNATED — HEAVENLY RESTRICTION" (2026-11-24 roster-wide "every character
// gets their own special ultimate" pass). Toji's ultimate is a MODE (Reincarnated Form: dmg ×1.25 / spd ×1.1 / def ×1.08 for
// the round, meterless, once per round) and that mode, its gates, its freeze + camera (tojiReincarnationCinematic.js) and its
// harness contract are KEPT exactly as they are — this module only turns the activation into a real cinematic:
//   registerUltCast('toji') records the caster/foe and returns undefined → abilities.executeTojiUltimate runs untouched
//   (applies the form, starts the legacy frozen activation). While that legacy activation is live, this module's screen pass
//   (registerCineScreen) owns the picture: letterbox, Toji drawn from his real sheets running a weapon kata, crimson pressure,
//   close-ups, calligraphy, the burst and the readout. No new damage (the legacy activation deals none).
// BEATS (the legacy activation's own frame clock, 150 f):
//   STILLNESS   0-45   letterbox; the stage drains to crimson-black; push in; he rolls his neck — no cursed energy at all
//   PRESSURE   45-105  a crimson heat-haze aura climbs off him, the floor cracks; the glare (close-up, eye glint);
//                      天与呪縛 HEAVENLY RESTRICTION; the Inverted Spear of Heaven whirls on its chain around him (chain kata)
//   BURST       105    he snaps the chain taut — crimson shockwave, white → crimson frame; REINCARNATED / SORCERER KILLER
//   SETTLE    105-150  the aura settles into him; DMG ×1.25 · SPD ×1.10 · DEF ×1.08 chips; letterbox out
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { getTojiReincarnationCinematicStatus } from './tojiReincarnationCinematic.js'
import { drawTojiUltScreen } from './tojiUltFx.js'

const S = { caster: null, target: null, alpha0: undefined, hidden: false, seen: false }
function restore() {
  if (S.caster && S.hidden) { if (S.alpha0 === undefined) delete S.caster._fxAlpha; else S.caster._fxAlpha = S.alpha0 }
  S.hidden = false
}
function reset() { restore(); S.caster = null; S.target = null; S.seen = false }

registerUltCast('toji', (f, context) => {
  const getOpp = typeof context?.getOpponent === 'function' ? context.getOpponent : (x => (x?.side === 'p1' ? context?.p2 : context?.p1))
  restore()
  S.caster = f; S.target = getOpp(f) || null; S.alpha0 = f._fxAlpha; S.seen = false
  return undefined   // the legacy executeTojiUltimate does the real work (form + frozen activation)
})
// nothing of ours ticks in the sim; registered only so every reset path restores the sprite alpha
registerFreezeCine('toji_reincarnated_overlay', { active: () => false, update() {}, clear: reset })
registerCineScreen('toji_reincarnated_overlay', (ctx, canvas) => {
  if (!S.caster) return false
  let st = null
  try { st = getTojiReincarnationCinematicStatus() } catch (_) {}
  if (!st?.active) { if (S.seen || S.hidden) reset(); return false }   // refused (no legacy activation) or finished
  S.seen = true
  if (!S.hidden) { S.alpha0 = S.caster._fxAlpha; S.hidden = true }
  S.caster._fxAlpha = 0          // render-only: the overlay draws Toji himself
  return drawTojiUltScreen(ctx, canvas, S, st.frame | 0, st.total || 150)
})
export const getTojiUltOverlayStatus = () => ({ armed: !!S.caster, drawing: !!S.hidden })
