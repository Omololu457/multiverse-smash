// net/lanServer.mjs — LAN multiplayer HOST transport (Stage 0 spike).
//
// STRICTLY ADDITIVE / OPT-IN, and by design it imports ZERO game code — the only game-adjacent thing it
// touches is net/protocol.js (the wire format) which in turn only borrows replay.js's pure encode helpers.
// Nothing here can affect standalone single-device play; it's a separate process you start on purpose.
//
// Responsibilities at this stage:
//   1. Open a WebSocket port with the `ws` package.
//   2. Print the LAN IP:port so a phone/second machine knows where to connect.
//   3. Complete the version handshake (HELLO → WELCOME/REJECT) so mismatched builds refuse to connect.
//   4. Prove the pipe: echo PING→PONG (and reflect anything else) so a real message round-trips.
//
// Remote INPUT injection into the actual game loop is a LATER stage — intentionally not here.

import { WebSocketServer } from "ws"
import os from "node:os"
import { decode, encode, checkHello, makeWelcome, makeReject, makePong, makeLobby, buildStamp, MSG } from "./protocol.js"

const DEFAULT_PORT = 8787

// All non-internal IPv4 addresses of this host, so the operator can read off a reachable LAN address.
export function lanAddresses() {
  const out = []
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === "IPv4" && !ni.internal) out.push({ iface: name, address: ni.address })
    }
  }
  return out
}

// relay: when true, the host FORWARDS a handshook client's gameplay messages (INPUT / MATCH_SETUP) to every
// OTHER handshook client — the star topology a real LAN match needs so two peers exchange inputs. Default
// off so the Stage-0 echo/ping behaviour (and its test) is unchanged.
export function startLanServer({ port = DEFAULT_PORT, log = console.log, relay = false } = {}) {
  const wss = new WebSocketServer({ port })
  const clients = new Set()
  let nextClientId = 1

  // relay mode only: two named seats. First handshook client takes p1 (host convention), second takes p2, a
  // third is rejected. Kept null when empty so a departing player frees their seat for a reconnect.
  const slots = { p1: null, p2: null }
  const occupiedSides = () => ["p1", "p2"].filter((s) => slots[s])
  const broadcastLobby = () => {
    const msg = encode(makeLobby(occupiedSides()))
    for (const s of [slots.p1, slots.p2]) if (s && s.readyState === 1) s.send(msg)
  }

  wss.on("listening", () => {
    log(`[lan] host build stamp: ${buildStamp()}`)
    log(`[lan] listening on port ${port}`)
    const addrs = lanAddresses()
    if (addrs.length === 0) {
      log(`[lan] no external LAN interface found — reachable locally at ws://127.0.0.1:${port}`)
    } else {
      log(`[lan] connect a second device to one of:`)
      for (const a of addrs) log(`[lan]   ws://${a.address}:${port}   (${a.iface})`)
    }
  })

  wss.on("connection", (socket, req) => {
    const id = nextClientId++
    const peer = req.socket.remoteAddress
    socket._lanHandshook = false
    clients.add(socket)
    log(`[lan] client #${id} connected from ${peer} (awaiting hello)`)

    socket.on("message", (raw) => {
      const msg = decode(raw)
      if (msg.t === null) { log(`[lan] client #${id} sent junk: ${msg.error}`); return }

      // Gate everything behind the handshake: until a valid HELLO lands, the only thing we act on is HELLO.
      if (!socket._lanHandshook) {
        if (msg.t !== MSG.HELLO) { log(`[lan] client #${id} spoke before hello (${msg.t}) — ignored`); return }
        const verdict = checkHello(msg)
        if (!verdict.ok) {
          log(`[lan] client #${id} REJECTED: ${verdict.reason}`)
          socket.send(encode(makeReject(verdict.reason, msg.stamp)))
          socket.close(4001, "handshake failed")
          return
        }
        socket._lanHandshook = true
        if (relay) {
          // Assign a seat by join order (p1 = host, p2 = joiner). Full room → reject the third comer.
          const side = !slots.p1 ? "p1" : !slots.p2 ? "p2" : null
          if (!side) {
            log(`[lan] client #${id} REJECTED: match full (2 players)`)
            socket.send(encode(makeReject("match is full (2 players)", msg.stamp)))
            socket.close(4002, "match full")
            return
          }
          slots[side] = socket
          socket._side = side
          socket.send(encode(makeWelcome(side, occupiedSides().length)))
          broadcastLobby()   // tell BOTH seats who's present now (host learns "opponent joined")
          log(`[lan] client #${id} handshake OK (${msg.name || "anon"}) → seat ${side}`)
        } else {
          socket.send(encode(makeWelcome("p2")))   // Stage-0 spike: single client always welcomed as p2
          log(`[lan] client #${id} handshake OK (${msg.name || "anon"}) → welcomed as p2`)
        }
        return
      }

      // Post-handshake. PING is always answered with PONG (liveness / Stage-0 spike).
      if (msg.t === MSG.PING) {
        socket.send(encode(makePong(msg)))
        log(`[lan] client #${id} ping → pong (payload: ${JSON.stringify(msg.payload)})`)
        return
      }
      if (relay && (msg.t === MSG.INPUT || msg.t === MSG.MATCH_SETUP || msg.t === MSG.BYE)) {
        // Star relay: forward this peer's gameplay message to every OTHER handshook client, verbatim.
        for (const other of clients) {
          if (other !== socket && other._lanHandshook && other.readyState === 1) other.send(encode(msg))
        }
        return
      }
      // Default (relay off): reflect so a round-trip stays observable end-to-end.
      socket.send(encode({ t: "echo", of: msg }))
      log(`[lan] client #${id} ${msg.t} → echoed`)
    })

    socket.on("close", (code) => {
      clients.delete(socket)
      if (relay && socket._side && slots[socket._side] === socket) {
        slots[socket._side] = null       // free the seat so the peer sees the room empty out / allow a rejoin
        broadcastLobby()
      }
      log(`[lan] client #${id} disconnected (code ${code})`)
    })
    socket.on("error", (e) => log(`[lan] client #${id} socket error: ${e.message}`))
  })

  wss.on("error", (e) => log(`[lan] server error: ${e.message}`))

  return {
    wss,
    port,
    clientCount: () => clients.size,
    close: () => new Promise((res) => wss.close(res)),
  }
}

// Direct-run entry: `node net/lanServer.mjs [port]`. Guarded so importing this module (e.g. from a test
// harness) does NOT open a socket.
const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const port = Number(process.argv[2]) || DEFAULT_PORT
  startLanServer({ port })
  process.on("SIGINT", () => { console.log("\n[lan] shutting down"); process.exit(0) })
}
