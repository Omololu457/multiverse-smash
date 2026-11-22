// net/lanSession.js — LAN lockstep INPUT-EXCHANGE engine (Stage 2).
//
// STRICTLY ADDITIVE / OPT-IN. This is the deterministic heart of remote play, and it imports ONLY the wire
// format (protocol.js) + replay.js's pure encode/decode. It has NO game state and NO game-loop knowledge —
// the game feeds it live input each frame and asks it what input to apply. When no LAN match is running,
// this file is never instantiated, so standalone play cannot be affected.
//
// MODEL — delay-based lockstep (the standard, rollback-free first cut):
//   • Both machines run the SAME deterministic sim (same seed/roster/stage from the MATCH_SETUP message).
//   • The only thing exchanged is the 14-bit input mask, per frame, per side (protocol INPUT messages).
//   • A fixed INPUT DELAY decouples "when input is sampled" from "when it's applied": the mask sampled on
//     this device at sim frame F is scheduled to APPLY at frame F+delay, and is sent immediately. So by the
//     time either machine reaches frame F, the remote mask for F was sent `delay` frames ago and has had a
//     full delay-window (plus the priming frames) to arrive over the LAN — no per-frame network stall in
//     the common case.
//   • CRUCIAL for determinism: BOTH fighters are driven from the agreed delayed masks — including the LOCAL
//     one. The live device state is only read at SAMPLE time; it never drives the sim directly. That's what
//     keeps the two machines bit-identical (each consumes the identical (localMask, remoteMask) stream).
//   • The first `delay` frames have no sampled input yet, so both sides use NEUTRAL (0) input there — a tiny,
//     standard input-latency artifact, identical on both machines.
//
// If the remote mask for a frame hasn't arrived (network fell behind the delay budget), canAdvance() returns
// false and the caller HOLDS the sim that frame rather than guessing — a stall is visible but never a desync.
// (Rollback/prediction is a deliberate future upgrade; this layer's API is shaped to allow it later.)

import { makeInput, MSG } from "./protocol.js"

export const DEFAULT_INPUT_DELAY = 2

export class LanSession {
  // send: (protocolMsg) => void  — ships a message to the peer (serialized by the caller's transport).
  // side: "p1" | "p2"            — which fighter THIS device drives.
  constructor({ send, side, inputDelay = DEFAULT_INPUT_DELAY } = {}) {
    if (typeof send !== "function") throw new Error("LanSession needs a send(msg) function")
    if (!/^p[1-4]$/.test(side)) throw new Error(`LanSession side must be p1..p4, got ${side}`)
    this.send = send
    this.side = side
    this.remoteSide = side === "p1" ? "p2" : "p1"
    this.inputDelay = Math.max(0, inputDelay | 0)
    this.localMask = new Map()    // applyFrame → mask (our input, sampled inputDelay frames earlier)
    this.remoteMask = new Map()   // applyFrame → mask (received from the peer)
    this.remotes = [this.remoteSide]          // every OTHER seat in the match (2–4 player online)
    this.masksBySide = new Map([[this.remoteSide, this.remoteMask]])
    this.lastSampled = -1         // highest sim frame we've sampled local input for (dedupe)
    this.startFrame = null        // sim frame this session first saw — anchors the priming window (a LAN
  }                               // match begins mid-battle, NOT at frame 0, so the window is relative to here)

  // A LAN match is begun at whatever battle frame the sim is already on. We latch that as startFrame on the
  // first frame we're asked about, so the first `inputDelay` frames (which have no sampled input yet) fall in
  // the NEUTRAL priming window and let the sim self-bootstrap instead of dead-locking the stall gate.
  _ensureStart(frame) { if (this.startFrame === null) this.startFrame = frame }
  _priming(frame)     { return this.startFrame === null || frame < this.startFrame + this.inputDelay }

  // Feed EVERY inbound message here (the transport's onmessage). Non-INPUT messages are ignored so the same
  // hook can sit under a broader message router. Only the PEER's inputs are buffered.
  // 3–4 player match: the seats of everyone else in it (call before the first frame). 2-player = untouched.
  setPlayers(sides) {
    const others = [...new Set(sides)].filter((s) => s !== this.side && /^p[1-4]$/.test(s))
    if (!others.length) return
    this.remotes = others
    this.remoteSide = others[0]
    this.masksBySide = new Map(others.map((s) => [s, s === others[0] ? this.remoteMask : new Map()]))
  }

  onMessage(msg) {
    if (!msg || msg.t !== MSG.INPUT || typeof msg.frame !== "number") return
    const m = this.masksBySide.get(msg.side)
    if (m) m.set(msg.frame, msg.mask)
  }

  // Called once per sim frame with the frame about to run and the live device input (a raw 14-field object,
  // e.g. from input.js readRawControls). Schedules it to apply at F+inputDelay and ships it to the peer.
  // Idempotent per frame.
  sample(simFrame, raw) {
    this._ensureStart(simFrame)
    if (simFrame <= this.lastSampled) return
    this.lastSampled = simFrame
    const applyFrame = simFrame + this.inputDelay
    const msg = makeInput(this.side, applyFrame, raw || {})
    this.localMask.set(applyFrame, msg.mask)
    this.send(msg)
  }

  // Our own mask to apply at frame F (neutral during the priming window). Always known once sampled.
  localMaskAt(frame) {
    this._ensureStart(frame)
    if (this._priming(frame)) return 0
    const m = this.localMask.get(frame)
    return m === undefined ? null : m
  }

  // The peer's mask to apply at frame F, or null if it hasn't arrived yet (→ caller stalls).
  remoteMaskAt(frame, side = this.remoteSide) {
    this._ensureStart(frame)
    if (this._priming(frame)) return 0
    const map = this.masksBySide.get(side)
    const m = map && map.get(frame)
    return m === undefined ? null : m
  }
  // Any seat's agreed mask (ours or a remote one).
  maskAt(side, frame) { return side === this.side ? this.localMaskAt(frame) : this.remoteMaskAt(frame, side) }

  // Lockstep gate: is it safe to simulate frame F? Only when BOTH masks for F are known.
  canAdvance(frame) {
    if (this.localMaskAt(frame) === null) return false
    for (const s of this.remotes) if (this.remoteMaskAt(frame, s) === null) return false
    return true
  }

  // Reclaim buffered masks older than `keepBefore` (both maps) so a long match doesn't grow unbounded.
  prune(keepBefore) {
    for (const k of this.localMask.keys())  if (k < keepBefore) this.localMask.delete(k)
    for (const map of this.masksBySide.values()) for (const k of map.keys()) if (k < keepBefore) map.delete(k)
  }
}

// A drop-in session with the SAME interface whose "peer" inputs come from SERIALIZABLE options (so a headless
// browser test can begin one via page.evaluate) and whose send() is a no-op. It stands in for a real second
// player, exercising the real inject/stall hooks WITHOUT a socket — and deliberately without any actual peer,
// so it can never touch a standalone match. Options:
//   remoteConst  — the peer's mask applied every (non-withheld) frame. Default 0 (neutral).
//   withholdFrom — an apply-frame from which the peer's mask is WITHHELD (returns null) to force a stall.
//   remoteScript — optional (frame)=>mask|null for richer patterns (takes precedence over remoteConst).
export class MockSession extends LanSession {
  constructor({ side = "p2", inputDelay = DEFAULT_INPUT_DELAY, remoteConst = 0, withholdFrom = null, remoteScript = null } = {}) {
    super({ send: () => {}, side, inputDelay })
    this._const = remoteConst | 0
    this._withholdFrom = (typeof withholdFrom === "number") ? withholdFrom : null
    this._script = (typeof remoteScript === "function") ? remoteScript : null
  }
  remoteMaskAt(frame) {
    this._ensureStart(frame)
    if (this._withholdFrom != null && frame >= this._withholdFrom) return null   // simulate a late/missing packet → stall
    if (this._priming(frame)) return 0
    if (this._script) { const v = this._script(frame); return v == null ? 0 : v }
    return this._const
  }
}
