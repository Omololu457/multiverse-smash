// net/netMatch.js — game-facing LAN match singleton (Stage 2).
//
// STRICTLY ADDITIVE / OPT-IN, and the ONLY net module game.js imports. It's the thin seam between the game
// loop and the isolated lockstep engine (lanSession.js). The whole safety story rests on one property:
//
//     when no LAN match has been begun, isActive() is false and EVERY method is an inert no-op / pass-through,
//     so the two gated hooks in game.js collapse to exactly the pre-existing standalone behaviour.
//
// game.js calls, per battle frame (only inside the `if (netMatch.isActive())` branch):
//     netMatch.sample(frame, liveRawInput)          // ship this device's input to the peer
//     netMatch.localMaskAt(frame) / remoteMaskAt()   // the agreed delayed masks to drive both fighters
//     netMatch.canAdvance(frame)                     // lockstep gate: hold the sim if the peer is behind
//     netMatch.localFighter(p1,p2) / remoteFighter() // which on-screen fighter is local vs remote
//
// Remote input REACHES the sim exactly the way replay PLAYBACK already injects it — writeRawControls() at the
// same per-frame arbitration point — so this rides a proven, deterministic path rather than a new one.

import { LanSession, MockSession } from "./lanSession.js"

let _session = null      // active LanSession/MockSession, or null when standalone
let _localSide = "p1"    // which fighter this device drives ("p1" = host convention)

// Begin a LAN match backed by a real transport session. side = this device's fighter.
export function begin(session, { localSide = "p1" } = {}) {
  _session = session
  _localSide = localSide === "p2" ? "p2" : "p1"
  return _session
}

// Headless-test entry: begin a match against a SCRIPTED mock peer (no socket, no real player). Used by the
// game-loop harness to prove the inject/stall hooks without ever involving a standalone match.
export function beginMock(opts = {}) {
  _localSide = opts.localSide === "p2" ? "p2" : "p1"
  _session = new MockSession({ side: _localSide === "p1" ? "p2" : "p1", ...opts })
  return _session
}

export function end() { const s = _session; _session = null; _localSide = "p1"; return s }

export function isActive()  { return !!_session }
export function localSide()  { return _localSide }
export function remoteSide() { return _localSide === "p1" ? "p2" : "p1" }
export function session()    { return _session }

// Map the abstract side to the concrete on-screen fighter objects the game passes in.
export function localFighter(p1, p2)  { return _localSide === "p1" ? p1 : p2 }
export function remoteFighter(p1, p2) { return _localSide === "p1" ? p2 : p1 }

// Feed an inbound protocol message to the session (transport wiring calls this). No-op when standalone.
export function onMessage(msg) { if (_session) _session.onMessage(msg) }

// Per-frame passthroughs — all inert when no session is active.
export function sample(frame, raw)   { if (_session) _session.sample(frame, raw) }
export function localMaskAt(frame)   { return _session ? _session.localMaskAt(frame) : null }
export function remoteMaskAt(frame)  { return _session ? _session.remoteMaskAt(frame) : null }
export function canAdvance(frame)    { return _session ? _session.canAdvance(frame) : true }  // no session → never stalls
export function prune(keepBefore)    { if (_session) _session.prune(keepBefore) }

export { LanSession }
