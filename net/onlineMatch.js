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
import { MSG, makeMatchSetup, makeBye, makePick } from "./protocol.js"
import { hostRelayUrl } from "./hostLink.js"   // MSV1-HOST: hosting UI (DOM overlay) + the desktop host's own-room URL

let _client = null      // active LanClient (transport), or null
let _session = null     // active LanSession (lockstep), created once our seat is known
let _role = null        // "host" | "join" — what THIS device intends to be
let _side = null        // "p1" | "p2" — the seat the relay actually assigned
let _peers = 1          // how many seats are filled (from LOBBY / WELCOME)
let _sides = []         // which seats are filled (p1 = host, p2..p4 = friends), from LOBBY
let _cb = {}            // UI callbacks: { onWelcome, onLobby, onSetup, onBye, onError }
let _rtts = []          // recent round trips to the relay (ms), newest last
let _rttTimer = null
let _delay = null       // agreed lockstep input delay for the next match (null = LanSession default)

// Round trip to the relay, measured every 2 s while connected. On the internet link this is what the host uses
// to pick an input delay that keeps the match at full speed (see netInputDelay).
export function rtt() {
  if (!_rtts.length) return null
  const s = [..._rtts].sort((a, b) => a - b), med = s[s.length >> 1]
  return Math.round(Math.max(med, 0.75 * s[s.length - 1]))   // lean towards the slow samples (jitter)
}
// Frames of input delay so a press reaches the other device before it's needed: one-way trip ≈ half of each
// player's round trip to the relay, plus margin. LAN (a few ms) → 2, the long-standing default.
export function netInputDelay(rttA, rttB) {
  const oneWay = ((rttA || 0) + (rttB || 0)) / 2
  return Math.max(2, Math.min(12, Math.ceil(oneWay * 1.25 / (1000 / 60)) + 1))
}
export function setInputDelay(n) {
  _delay = Number.isInteger(n) ? n : null
  if (_session && _delay != null) _session.inputDelay = _delay
}
function _startRtt(client) {
  _rtts = []
  clearInterval(_rttTimer)
  let busy = false
  const probe = async () => {
    if (busy || _client !== client || !client.welcomed) return
    busy = true
    const t = (typeof performance !== "undefined" ? performance : Date).now()
    try { await client.ping(1, 4000); _rtts.push((typeof performance !== "undefined" ? performance : Date).now() - t); if (_rtts.length > 7) _rtts.shift() } catch {}
    busy = false
  }
  probe(); setTimeout(probe, 300); setTimeout(probe, 700)
  _rttTimer = setInterval(probe, 2000)
}

export function isConnecting() { return !!_client && !_client.welcomed }
export function isConnected()  { return !!_client && _client.welcomed }
export function role()   { return _role }
export function side()   { return _side }
export function peers()  { return _peers }
export function bothPresent() { return _peers >= 2 }
export function getSession()   { return _session }
export function sides()        { return _sides.slice() }

// Connect to a relay as `roleWanted` ("host" | "join"). Resolves once the relay WELCOMEs us (seat assigned);
// rejects on build-mismatch/refusal/socket error. `cbs` receives lifecycle events for the UI to render.
export async function connect(url, roleWanted, cbs = {}) {
  disconnect()                 // never stack two connections
  // MSV1-HOST: in the desktop app while hosting, the HOST joins its own room on the host server as seat p1
  // (host token) — the same relay protocol, just room-scoped — so internet joiners land in this match.
  if (roleWanted === "host") { const own = hostRelayUrl(); if (own) url = own }
  _cb = cbs || {}
  _role = roleWanted
  _side = null
  _peers = 1; _sides = []

  const client = new LanClient(url, { name: roleWanted })
  _client = client
  client.on(MSG.LOBBY, (m) => { _peers = m.count || _peers; if (Array.isArray(m.sides)) _sides = m.sides.filter((s) => /^p[1-4]$/.test(s)); _cb.onLobby && _cb.onLobby(m) })
  client.on(MSG.MATCH_SETUP, (m) => { _cb.onSetup && _cb.onSetup(m) })
  client.on(MSG.BYE, (m) => { _cb.onBye && _cb.onBye(m) })
  client.on(MSG.PICK, (m) => { _cb.onPick && _cb.onPick(m) })   // pick-your-own select: the other player's fighter
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
  _startRtt(client)
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

// A fresh lockstep session for the NEXT match on the same connection (play again): the old one's buffered
// masks are keyed by frame number and would otherwise leak into the new match.
export function resetSession() {
  if (!_client || !_side) return null
  const client = _client
  _session = new LanSession({ side: _side, send: (msg) => { try { client.send(msg) } catch {} } })
  _delay = null
  return _session
}

// Pick-your-own select: tell the other player which fighter we locked in (UI only; the host's MATCH_SETUP stays
// the single source of truth for the match).
export function sendPick(meta) {
  const msg = makePick({ rtt: rtt(), ...meta })
  if (_client && msg.char) _client.send(msg)
  return msg
}

// Tear down cleanly, telling the peer we've left so their UI can react (opponent forfeits / back to menu).
export function disconnect(reason = null) {
  if (_client) {
    try { if (_client.welcomed) _client.send(makeBye(reason)) } catch {}
    try { _client.close() } catch {}
  }
  clearInterval(_rttTimer); _rttTimer = null; _rtts = []; _delay = null
  _client = null
  _session = null
  _side = null
  _role = null
  _peers = 1
  _sides = []
}
