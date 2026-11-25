// makiUlt.js — Maki Zenin (maki) ULTIMATE "SHIBUYA — AWAKENING" (2026-11-24 roster-wide "every character gets their own special
// ultimate" pass). Maki's ultimate is a one-way TRANSFORMATION (low-HP unlock — ≤40 % since the 2026-09-06 playtest gate → the Shibuya-Arc moveset + dmg ×1.25 /
// spd ×1.1 / def ×1.05 for the round, meterless) and that mode, its gates, its freeze + camera (makiShibuyaCinematic.js) and
// its harness contract are KEPT exactly as they are — this module only turns the activation into a real cinematic:
//   registerUltCast('maki') records the caster and returns undefined → abilities.executeMakiShibuyaUltimate runs untouched
//   (swaps the moveset, starts the legacy frozen activation). While that legacy activation is live, this screen pass owns the
//   picture: letterbox, Maki drawn from her real reveal strip (maki_shibuya_intro_covered: kneeling at Mai's side → rising
//   with the blade → standing), the ember-lit Zenin night, close-ups, words, the first cut and the readout. No new damage.
// BEATS (the legacy activation's own frame clock, 150 f):
//   LOSS        0-45   letterbox; cold, colourless night; she kneels beside her sister — silence; 真依
//   RISE       45-80   she takes up the blade; embers lift off the burning estate behind her; her scars catch the firelight
//   PERFECTED  80-105  the last of her cursed energy is gone — the restriction completes; 覚醒 · "THE SAME AS HIM"
//   FIRST CUT   105    one horizontal draw splits the screen — white → ember frame; ZENIN MAKI / AWAKENED
//   SETTLE    105-150  DMG ×1.25 · SPD ×1.10 · DEF ×1.05 chips; letterbox out
import { registerUltCast, registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { getMakiShibuyaCinematicStatus } from './makiShibuyaCinematic.js'
import { drawMakiUltScreen } from './makiUltFx.js'

const S = { caster: null, alpha0: undefined, hidden: false, seen: false }
function restore() {
  if (S.caster && S.hidden) { if (S.alpha0 === undefined) delete S.caster._fxAlpha; else S.caster._fxAlpha = S.alpha0 }
  S.hidden = false
}
function reset() { restore(); S.caster = null; S.seen = false }

registerUltCast('maki', f => { restore(); S.caster = f; S.alpha0 = f._fxAlpha; S.seen = false; return undefined })
registerFreezeCine('maki_awakening_overlay', { active: () => false, update() {}, clear: reset })
registerCineScreen('maki_awakening_overlay', (ctx, canvas) => {
  if (!S.caster) return false
  let st = null
  try { st = getMakiShibuyaCinematicStatus() } catch (_) {}
  if (!st?.active) { if (S.seen || S.hidden) reset(); return false }
  S.seen = true
  if (!S.hidden) { S.alpha0 = S.caster._fxAlpha; S.hidden = true }
  S.caster._fxAlpha = 0          // render-only: the overlay draws Maki herself
  return drawMakiUltScreen(ctx, canvas, S, st.frame | 0, st.total || 150)
})
export const getMakiUltOverlayStatus = () => ({ armed: !!S.caster, drawing: !!S.hidden })
