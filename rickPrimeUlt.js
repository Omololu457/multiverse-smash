// rickPrimeUlt.js — Rick Prime (rickPrime) "TEMPORAL REWIND" — the CINEMATIC LAYER (2026-11-24). The rewind itself is
// game.js-owned and deeply wired (rolling snapshot buffer, tryStartRickPrimeRewind on the Ultimate press — intercepted in
// updatePlayerCombat BEFORE abilities.js triggerUltimate, so registerUltCast can't take it — a 714-frame freeze that drives
// the camera, scrubs the foe backwards along their recorded path, then restores both fighters + the clock + 10s bonus).
// That mechanic is kept EXACTLY as is (same cost 150, same cooldown, same restore, no damage — it never dealt any). This
// module wraps it in a cinematic: TIME STOP impact frame → the world drains to grey while Rick Prime stays in colour → a
// giant clock face seizes, then its hands spin BACKWARDS as the foe's afterimages stream back along their path (VHS ◀◀
// timecode, tracking glitches) → the clock SHATTERS and time snaps forward (colour floods back, TIME RESTORED +10s).
//
// It is RENDER-ONLY (rickPrimeUltFx.js draws it via registerCineScreen; the sim never reads anything here) and reads the
// rewind's own state through a getter, so its beats are locked to game.js's timer (REWIND_* phases: focus/zoomin 0-54,
// watch 54-84, playback 84-624, restore at 624, panback 624-690, end 714).
//
// ONE OUTSIDE HOOK is needed (game.js, the Rick Prime ultimate intercept in updatePlayerCombat):
//     tryStartRickPrimeRewind(fighter); return
//   →
//     if (tryStartRickPrimeRewind(fighter)) startRickPrimeRewindCine(fighter, getOpponent(fighter), () => rewindState); return
//   plus `import { startRickPrimeRewindCine } from "./rickPrimeUlt.js"`. (Optional polish: skip the legacy `_drawRewind()`
//   capsule ghosts while `isRickPrimeRewindCineActive()` — this module draws real-sprite afterimages instead.)
// Until that line lands nothing here runs (the placeholder import from cineUlts.js just registers the hooks).
import { registerFreezeCine } from './cineRegistry.js'
import './rickPrimeUltFx.js'

export const PRIME_REWIND = { zoomEnd: 54, watchEnd: 84, playEnd: 624, panEnd: 690, total: 714, bonusSec: 10 }
const c = { active: false }
export const isRickPrimeRewindCineActive = () => !!c.active
export const rickPrimeRewindScene = () => (c.active ? c : null)
export const getRickPrimeRewindCineStatus = () => ({ active: !!c.active, t: c.active ? timerOf() : -1, restored: !!(c.active && c.rw?.()?.restored) })

function timerOf() { try { const s = c.rw?.(); return s && s.active ? (s.timer | 0) : PRIME_REWIND.total } catch (_) { return PRIME_REWIND.total } }
export const rickPrimeRewindTimer = () => (c.active ? timerOf() : -1)

// Called by game.js the moment tryStartRickPrimeRewind commits (see the header). getRewind() → game.js rewindState (read-only).
export function startRickPrimeRewindCine(caster, opp, getRewind) {
  if (!caster || !opp || typeof getRewind !== 'function') return false
  endRickPrimeRewindCine()
  Object.assign(c, { active: true, caster, opp, rw: getRewind, fired: new Set(), ghosts: [], lastT: -1,
    save: { cR: caster._fxRecord, oR: opp._fxRecord } })
  caster._fxRecord = true; opp._fxRecord = true             // sprite.js records the exact frame drawn → real-sprite afterimages / colour redraw
  delete opp._primeRewindCut; delete caster._primeRewindResult  // rickPower.js applyPrimeRewindRules stamps this rewind's result at the restore
  return true
}
export function endRickPrimeRewindCine() {
  if (!c.active) return
  const s = c.save || {}
  if (c.caster) { c.caster._fxRecord = s.cR; if (s.cR == null) delete c.caster._fxRecord }
  if (c.opp) { c.opp._fxRecord = s.oR; if (s.oR == null) delete c.opp._fxRecord }
  for (const k of Object.keys(c)) delete c[k]
  c.active = false
}
// Every reset path (round reset, rematch, KO teardown, menu → clearFreezeCines): drop the overlay. Never freezes anything
// itself (active() is false — the rewind's own freeze in game.js is the one that holds the world).
// (game.js's own restore at the snap also runs clearFreezeCines — while the rewind is still live that call is the rewind
// tearing down the world, not a reset, so the overlay stays; the screen pass ends it once the rewind is over.)
function clearFromReset() { let live = false; try { live = !!c.rw?.()?.active } catch (_) {} ; if (!live) endRickPrimeRewindCine() }
registerFreezeCine('rickprime_rewind_cine', { active: () => false, update() {}, clear: clearFromReset })
