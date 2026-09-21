// harness/net_spike.mjs — Stage 0/1 proof: a REAL WebSocket round-trip over the LAN transport.
//
// Boots the actual host (net/lanServer.mjs) on a throwaway port, connects the actual client
// (net/lanClient.js) to it, and asserts that live messages travel end-to-end over a real socket:
//   1. HELLO → WELCOME handshake succeeds when build stamps match, and assigns the client a side.
//   2. PING → PONG payload round-trips byte-for-byte (the "prove the pipe" spike).
//   3. A MATCH_SETUP message (Stage 1 wire format) reflects back intact over the wire.
//   4. An INPUT mask encodes on one side and decodes to the identical raw controls on the other.
//   5. A DELIBERATELY mismatched build stamp is REJECTED — mismatched builds refuse to connect.
//
// This is not a mock: it uses ws on the server and the native WebSocket on the client, on a real TCP port.

import { startLanServer } from "../net/lanServer.mjs"
import { LanClient } from "../net/lanClient.js"
import {
  encode, decode, makeMatchSetup, makeInput, readInput, makeHello, MSG,
} from "../net/protocol.js"

const PORT = 8799
let pass = 0, fail = 0
const ok  = (m) => { pass++; console.log(`  ✓ ${m}`) }
const bad = (m) => { fail++; console.log(`  ✗ ${m}`) }
const eq  = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// Silence the server's operational logging during the test (keep output focused on assertions).
const server = startLanServer({ port: PORT, log: () => {} })
await new Promise((r) => server.wss.once("listening", r))

const URL = `ws://127.0.0.1:${PORT}`

try {
  // 1. Handshake ------------------------------------------------------------------------------------
  const client = new LanClient(URL, { name: "spike-tester" })
  await client.connect()
  if (client.welcomed) ok("HELLO → WELCOME handshake completed over the socket")
  else bad("handshake did not complete")
  if (client.side === "p2") ok(`host assigned client a side (${client.side})`)
  else bad(`unexpected side: ${client.side}`)

  // 2. Ping round-trip ------------------------------------------------------------------------------
  const reply = await client.ping("round-trip-proof")
  if (reply === "round-trip-proof") ok("PING → PONG payload round-tripped byte-for-byte")
  else bad(`ping payload corrupted: got ${JSON.stringify(reply)}`)

  // 3. Match-setup reflection (Stage 1 wire format over the real socket) -----------------------------
  const setup = makeMatchSetup({
    seed: 1234567, mode: "versus", rounds: 3,
    p1Char: "goku", p1Skin: "default", p2Char: "sasuke", p2Skin: "default",
    stage: "Hidden Leaf",
  })
  const setupBack = await new Promise((resolve) => {
    client.on("echo", (m) => resolve(m.of))
    client.send(setup)
  })
  if (eq(setupBack, setup)) ok("MATCH_SETUP (seed/roster/stage) survived the round-trip intact")
  else bad(`match setup mangled: ${JSON.stringify(setupBack)}`)

  // 4. Input mask encode→wire→decode ----------------------------------------------------------------
  const rawIn = { left: false, right: true, down: false, up: false, jump: false, light: true,
                  heavy: false, upAttack: false, special: false, ultimate: false, dash: false,
                  grab: false, charge: false, block: false }
  const inputMsg = makeInput("p2", 42, rawIn)
  const inputBack = await new Promise((resolve) => {
    client.on("echo", (m) => resolve(m.of))
    client.send(inputMsg)
  })
  const decoded = readInput(inputBack)
  if (decoded.frame === 42 && decoded.side === "p2" && eq(decoded.raw, rawIn))
    ok("INPUT mask encoded, crossed the wire, decoded back to identical raw controls (frame 42)")
  else bad(`input round-trip mismatch: ${JSON.stringify(decoded)}`)
  client.close()

  // 5. Build-mismatch rejection ---------------------------------------------------------------------
  // Hand-forge a HELLO with a bogus stamp and confirm the host refuses + closes.
  const rejected = await new Promise((resolve) => {
    const raw = new (globalThis.WebSocket)(URL)
    raw.onopen = () => raw.send(encode({ ...makeHello("evil-build"), stamp: "r0.bWRONG.p0" }))
    raw.onmessage = (ev) => { const m = decode(ev.data); if (m.t === MSG.REJECT) resolve(m.reason) }
    raw.onclose = () => resolve(null)
    setTimeout(() => resolve("TIMEOUT"), 2500)
  })
  if (rejected && rejected !== "TIMEOUT") ok(`mismatched build REJECTED with reason: "${rejected}"`)
  else bad(`mismatched build was not cleanly rejected (got ${rejected})`)

} catch (e) {
  bad(`unexpected error: ${e.stack || e.message}`)
} finally {
  await server.close()
}

console.log(`\nnet-spike: ${pass}/${pass + fail} passed`)
process.exit(fail === 0 ? 0 : 1)
