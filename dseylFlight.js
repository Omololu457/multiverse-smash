// DSEYL (dseyl) — FLIGHT. Reuses flight.js unchanged (profile FLIGHT_PROFILES.dseyl: rocket boots, a lighter flyer than
// the Supermen). Takeoff / come-down = a Charge TAP — Homelander's control — but measured here on the SIM clock instead
// of the shared wall-clock tap test (game.js handleChargeRelease skips dseyl), so replay / LAN stay deterministic.
// L2 / P held together with R1 / L is Syndrome's modifier table and never toggles flight.
// State: f._dseyl.fl (inside GAME_STATE via the game.js snapshot line). No RNG, no wall clock. No-op for anyone else.
import { DSEYL_KEY, DSEYL_FLIGHT_TAP } from './dseylData.js'
import { flightToggleInput } from './flight.js'

const isDs = f => f?.rosterKey === DSEYL_KEY
const flState = f => f._dseyl.fl ||= { chg: 0, chgMod: false, pend: 0, prevCharge: false, prevSpecial: false, takeoffs: 0, toggles: 0 }

// Called from tickDseyl every sim frame (f._dseyl exists).
export function tickDseylFlight(f, raw) {
  if (!isDs(f) || !f._dseyl) return
  const p = flState(f), ch = !!raw.charge, sp = !!raw.special
  if (ch && !p.prevCharge) { p.chg = 0; p.chgMod = false }
  if (ch) { p.chg++; if (sp) p.chgMod = true }
  if (!ch && p.prevCharge && !p.chgMod && p.chg <= DSEYL_FLIGHT_TAP.maxHold) p.pend = DSEYL_FLIGHT_TAP.modWindow
  if (p.pend > 0) {
    if (sp && !p.prevSpecial) p.pend = 0                                    // R1 right after the tap = Syndrome's modifier
    else if (--p.pend === 0 && !(f.hitstun > 0) && !f.isGrabbed && !f.attacking && f.health > 0 && flightToggleInput(f)) p.toggles++
  }
  p.prevCharge = ch; p.prevSpecial = sp
}
