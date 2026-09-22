// net/protocol.js — LAN multiplayer WIRE FORMAT (Stage 1).
//
// STRICTLY ADDITIVE / OPT-IN: this module defines the message shapes that travel over the LAN socket.
// It touches ZERO game state. It only translates between in-memory values (the same ones startRecording()
// already captures) and the compact JSON envelopes we put on the wire, so the two ends agree byte-for-byte
// on what a message means.
//
// The whole point of LAN play is that BOTH machines run the SAME deterministic simulation and only exchange
// per-frame INPUTS (lockstep). For that to be safe, the two builds must be sim-compatible or they will
// desync silently. So the handshake carries a build stamp assembled from the exact same version/balance
// values replay.js uses to decide whether a recorded match can be replayed — if a replay from build A can't
// play back on build B, then a live match between A and B can't either. Mismatched builds REFUSE to connect.
//
// We deliberately reuse replay.js's encodeInput/decodeInput (the 14-bit input mask shared with input.js) so
// an INPUT message on the wire is the exact same integer the replay recorder writes. One representation,
// one source of truth — no chance of the netcode and the replay system disagreeing about what "left" means.

import { encodeInput, decodeInput, REPLAY_VERSION, BALANCE_STAMP } from "../replay.js"

// Bump when the NET envelope shape below changes (independent of REPLAY_VERSION, which tracks the input
// mask / replay-file format, and BALANCE_STAMP, which tracks gameplay values). All three fold into the
// build stamp so any one of them differing blocks a connection.
export const PROTOCOL_VERSION = 1

// Message `t` (type) tags. Keep these short — they're on the wire every frame for INPUT.
export const MSG = Object.freeze({
  HELLO:       "hello",        // client → host: open the handshake, carries the client's build stamp
  WELCOME:     "welcome",      // host   → client: stamps match, connection accepted (carries host stamp + assigned side)
  REJECT:      "reject",       // host   → client: stamps differ (or bad hello) — connection refused, socket closes
  MATCH_SETUP: "match_setup",  // host   → client: seed / characters / stage — mirrors startRecording()'s meta
  INPUT:       "input",        // either → either: one frame's input mask (encodeInput result) for one side
  LOBBY:       "lobby",        // host   → clients: who's connected (peer presence) so the UI can say "waiting…"
  BYE:         "bye",          // either → either: leaving the match cleanly (opponent forfeits / returns to menu)
  PING:        "ping",         // either → either: liveness / round-trip probe (echo target for the Stage-0 spike)
  PONG:        "pong",         // reply to PING, echoes the original payload back
})

// The single string both ends compare. If these differ, the two builds may diverge mid-match, so we refuse
// the connection up front rather than desync silently 4000 frames in. Assembled from the three axes that
// govern sim/format compatibility.
export function buildStamp() {
  return `r${REPLAY_VERSION}.b${BALANCE_STAMP}.p${PROTOCOL_VERSION}`
}

// ─────────────────────────────────────────────────────────────────
// ENVELOPE ENCODE / DECODE
// Every message is a JSON object with a `t` tag. encode() → string for socket.send(); decode() parses and
// shallow-validates. decode never throws — a malformed frame returns { t:null, error } so callers can drop
// it instead of crashing the connection.
// ─────────────────────────────────────────────────────────────────
export function encode(msg) {
  return JSON.stringify(msg)
}

export function decode(raw) {
  let m
  try { m = JSON.parse(typeof raw === "string" ? raw : String(raw)) }
  catch (e) { return { t: null, error: "bad json" } }
  if (!m || typeof m !== "object" || typeof m.t !== "string") return { t: null, error: "no type tag" }
  return m
}

// ─────────────────────────────────────────────────────────────────
// MESSAGE CONSTRUCTORS
// ─────────────────────────────────────────────────────────────────

// client → host. `name` is optional cosmetic identity for later UI; the stamp is what actually gates entry.
export function makeHello(name = null) {
  return { t: MSG.HELLO, stamp: buildStamp(), name }
}

// host → client. `side` is "p1" | "p2" — which fighter this client drives (host is conventionally p1).
// `count` is how many peers are currently in the match room (1 = just you, 2 = opponent present).
export function makeWelcome(side = "p2", count = 1) {
  return { t: MSG.WELCOME, stamp: buildStamp(), side, count }
}

// host → clients: current room roster so each side's UI can reflect "waiting for opponent…" vs "ready".
// sides = the assigned sides currently connected, e.g. ["p1","p2"]. count = sides.length.
export function makeLobby(sides = []) {
  return { t: MSG.LOBBY, sides, count: sides.length }
}

// either → either: a clean departure (return to menu / disconnect) so the peer can end the match gracefully.
export function makeBye(reason = null) {
  return { t: MSG.BYE, reason }
}

// host → client. `reason` is human-readable; `theirs`/`ours` let a mismatched client show exactly what differs.
export function makeReject(reason, theirStamp = null) {
  return { t: MSG.REJECT, reason, ours: buildStamp(), theirs: theirStamp }
}

// Compatibility check the host runs on a received HELLO. Kept here (not in the server) so client and any
// future test can share the exact rule. Returns { ok } or { ok:false, reason }.
export function checkHello(hello) {
  if (!hello || hello.t !== MSG.HELLO)   return { ok: false, reason: "not a hello" }
  if (typeof hello.stamp !== "string")   return { ok: false, reason: "hello has no build stamp" }
  const ours = buildStamp()
  if (hello.stamp !== ours)              return { ok: false, reason: `build mismatch: client ${hello.stamp} != host ${ours}` }
  return { ok: true }
}

// host → client. Mirrors EXACTLY the meta object game.js passes to replay.startRecording() so that a client
// starting from this message begins the identical deterministic match the host does (same seed, same roster,
// same stage). Field names match startRecording's meta 1:1 on purpose.
export function makeMatchSetup(meta = {}) {
  return {
    t: MSG.MATCH_SETUP,
    seed:   meta.seed ?? null,
    mode:   meta.mode ?? null,
    rounds: meta.rounds ?? null,
    p1Char: meta.p1Char ?? null, p1Skin: meta.p1Skin ?? "default",
    p2Char: meta.p2Char ?? null, p2Skin: meta.p2Skin ?? "default",
    stage:  meta.stage ?? null,
  }
}

// Per-frame input. `raw` is the same object input.js's readRawControls() produces (the 14 boolean fields);
// we store the encoded 14-bit integer, identical to what replay.recordInputs writes. `side` says whose
// input it is, `frame` is the 0-based battle-frame index (for lockstep alignment / late-frame detection).
export function makeInput(side, frame, raw) {
  return { t: MSG.INPUT, side, frame, mask: encodeInput(raw) }
}

// Inverse of makeInput's payload: turn a received INPUT message's mask back into the 14-field raw object
// that input.js's writeRawControls() consumes. Returns { side, frame, raw }.
export function readInput(msg) {
  return { side: msg.side, frame: msg.frame, raw: decodeInput(msg.mask) }
}

export function makePing(payload = null) { return { t: MSG.PING, payload, ts: null } }
export function makePong(pingMsg)        { return { t: MSG.PONG, payload: pingMsg ? pingMsg.payload : null } }
