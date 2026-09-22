// net/onlineMatch.js — browser-side LAN match CONTROLLER (host/join lifecycle).
//
// STRICTLY ADDITIVE / OPT-IN. This is the connection brain the host/join UI talks to. It ties together the
// three isolated pieces — LanClient (transport), LanSession (lockstep engine), and the protocol wire format —
// into a tiny state machine, and hands game.js a ready LanSession to feed netMatch.begin(). It imports NO game
// code, so it cannot affect standalone play; game.js only touches it from the (new, gated) online screens.
//
// TOPOLOGY: both devices run the game locally; the HOST's machine also runs the relay ws server (started by
// the dev server / Electron main). Both game clients connect to that one relay:
//   • First to connect gets seat p1 (the host), second gets p2 (the joiner) — assigned by the relay.
//   • The relay forwards INPUT / MATCH_SETUP / BYE between the two seats; it also emits LOBBY presence.
// The host picks the matchup locally, then ships a MATCH_SETUP (seed + both characters + stage). Both sides
// start the SAME deterministic match from that seed; from then on only per-frame input masks cross the wire.

import { LanClient } from "./lanClient.js"
import { LanSession } from "./lanSession.js"
import { MSG, makeMatchSetup, makeBye } from "./protocol.js"

let _client = null      // active LanClient (transport), or null
let _session = null     // active LanSession (lockstep), created once our seat is known
let _role = null        // "host" | "join" — what THIS device intends to be
let _side = null        // "p1" | "p2" — the seat the relay actually assigned
let _peers = 1          // how many seats are filled (from LOBBY / WELCOME)
let _cb = {}            // UI callbacks: { onWelcome, onLobby, onSetup, onBye, onError }

export function isConnecting() { return !!_client && !_client.welcomed }
export function isConnected()  { return !!_client && _client.welcomed }
export function role()   { return _role }
export function side()   { return _side }
export function peers()  { return _peers }
export function bothPresent() { return _peers >= 2 }
export function getSession()   { return _session }

// Connect to a relay as `roleWanted` ("host" | "join"). Resolves once the relay WELCOMEs us (seat assigned);
// rejects on build-mismatch/refusal/socket error. `cbs` receives lifecycle events for the UI to render.
export async function connect(url, roleWanted, cbs = {}) {
  disconnect()                 // never stack two connections
  _cb = cbs || {}
  _role = roleWanted
  _side = null
  _peers = 1

  const client = new LanClient(url, { name: roleWanted })
  _client = client
  client.on(MSG.LOBBY, (m) => { _peers = m.count || _peers; _cb.onLobby && _cb.onLobby(m) })
  client.on(MSG.MATCH_SETUP, (m) => { _cb.onSetup && _cb.onSetup(m) })
  client.on(MSG.BYE, (m) => { _cb.onBye && _cb.onBye(m) })
  // Route the peer's per-frame input into the lockstep session (created just below, on WELCOME).
  client.on(MSG.INPUT, (m) => { if (_session) _session.onMessage(m) })

  try {
    await client.connect()     // resolves on WELCOME
  } catch (e) {
    _cb.onError && _cb.onError(e)
    disconnect()
    throw e
  }
  _side = client.side
  _peers = Math.max(_peers, 1)
  _session = new LanSession({ side: _side, send: (msg) => { try { client.send(msg) } catch {} } })
  _cb.onWelcome && _cb.onWelcome({ side: _side })
  return { side: _side }
}

// HOST only: ship the agreed match parameters to the joiner. `meta` mirrors startRecording()'s meta object
// (seed / mode / rounds / p1Char / p1Skin / p2Char / p2Skin / stage). Returns the sent message.
export function sendSetup(meta) {
  const msg = makeMatchSetup(meta)
  if (_client) _client.send(msg)
  return msg
}

// Tear down cleanly, telling the peer we've left so their UI can react (opponent forfeits / back to menu).
export function disconnect(reason = null) {
  if (_client) {
    try { if (_client.welcomed) _client.send(makeBye(reason)) } catch {}
    try { _client.close() } catch {}
  }
  _client = null
  _session = null
  _side = null
  _role = null
  _peers = 1
}
