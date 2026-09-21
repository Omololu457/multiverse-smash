// net/lanClient.js — LAN multiplayer CLIENT transport (Stage 0 spike).
//
// STRICTLY ADDITIVE / OPT-IN. This is the browser-side counterpart to lanServer.mjs. It imports ONLY
// net/protocol.js (wire format) and never touches game state, so it cannot affect standalone play — the
// game only ever loads it if a player explicitly opts into a LAN match (wiring that comes in a later stage).
//
// It's written against the standard `WebSocket` global, which exists natively in browsers AND in modern
// Node (so the same file both runs in-game and can be exercised from a terminal to prove the pipe). No `ws`
// import here — the client side needs no dependency.
//
// Stage-0 scope: connect, complete the HELLO→WELCOME handshake (refusing to proceed on a build mismatch),
// and expose send/on hooks + a ping() round-trip probe. Feeding real per-frame INPUT into the game loop is
// a later stage.

import {
  encode, decode, makeHello, makePing, checkHello, MSG, buildStamp,
} from "./protocol.js"

const WS = (typeof globalThis !== "undefined" && globalThis.WebSocket) ? globalThis.WebSocket : null

export class LanClient {
  constructor(url, { name = null } = {}) {
    if (!WS) throw new Error("no WebSocket implementation available in this environment")
    this.url = url
    this.name = name
    this.socket = null
    this.welcomed = false
    this.side = null            // "p1" | "p2", assigned by the host on WELCOME
    this._handlers = {}         // type → callback(msg)
    this._openWaiters = []      // resolve/reject pairs waiting on the handshake
  }

  // Resolves once the host WELCOMEs us (build stamps matched); rejects on REJECT or socket error/close.
  connect() {
    return new Promise((resolve, reject) => {
      this._openWaiters.push({ resolve, reject })
      const socket = new WS(this.url)
      this.socket = socket

      socket.onopen = () => {
        // Sanity: our own stamp is what the host compares against. Send it in the hello.
        socket.send(encode(makeHello(this.name)))
      }

      socket.onmessage = (ev) => {
        const msg = decode(ev.data)
        if (msg.t === null) return

        if (msg.t === MSG.WELCOME) {
          this.welcomed = true
          this.side = msg.side || "p2"
          this._flushWaiters(null)
        } else if (msg.t === MSG.REJECT) {
          this._flushWaiters(new Error(`host rejected connection: ${msg.reason} (ours ${msg.ours}, theirs ${msg.theirs})`))
          try { socket.close() } catch {}
        }
        const h = this._handlers[msg.t]
        if (h) h(msg)
      }

      socket.onerror = (e) => {
        this._flushWaiters(new Error(`socket error: ${e && e.message ? e.message : "unknown"}`))
      }
      socket.onclose = () => {
        if (!this.welcomed) this._flushWaiters(new Error("socket closed before welcome"))
      }
    })
  }

  _flushWaiters(err) {
    const waiters = this._openWaiters
    this._openWaiters = []
    for (const w of waiters) err ? w.reject(err) : w.resolve(this)
  }

  // Register a handler for an incoming message type (see protocol.MSG). Returns `this` for chaining.
  on(type, cb) { this._handlers[type] = cb; return this }

  send(msg) {
    if (!this.socket || this.socket.readyState !== 1) throw new Error("socket not open")
    this.socket.send(encode(msg))
  }

  // Round-trip probe: send a PING with `payload`, resolve with the PONG's payload. Rejects on timeout.
  ping(payload = "hello", timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this._handlers[MSG.PONG] = undefined; reject(new Error("ping timeout")) }, timeoutMs)
      this._handlers[MSG.PONG] = (msg) => { clearTimeout(timer); this._handlers[MSG.PONG] = undefined; resolve(msg.payload) }
      this.send(makePing(payload))
    })
  }

  close() { try { this.socket && this.socket.close() } catch {} }
}

// Convenience one-shot used by the CLI harness and tests.
export async function connectLan(url, opts) {
  const c = new LanClient(url, opts)
  await c.connect()
  return c
}

// Direct-run entry (Node only): `node net/lanClient.js ws://<host>:<port> [name]`. Connects, handshakes,
// fires one ping, prints the round-tripped reply, exits. Guarded so a browser import (where `process` is
// undefined) never runs this, and so importing the module from a test doesn't auto-connect.
const isNode = typeof process !== "undefined" && process.argv && process.argv[1]
if (isNode && import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2] || "ws://127.0.0.1:8787"
  const name = process.argv[3] || "cli-client"
  console.log(`[lan-client] build stamp: ${buildStamp()}`)
  console.log(`[lan-client] connecting to ${url} ...`)
  connectLan(url, { name })
    .then(async (c) => {
      console.log(`[lan-client] welcomed as ${c.side}`)
      const reply = await c.ping("round-trip-proof")
      console.log(`[lan-client] ping → pong payload: ${JSON.stringify(reply)}`)
      c.close()
      process.exit(reply === "round-trip-proof" ? 0 : 2)
    })
    .catch((e) => { console.error(`[lan-client] FAILED: ${e.message}`); process.exit(1) })
}
