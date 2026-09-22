// harness/net_lockstep.mjs — Stage 2 proof: the LAN lockstep INPUT-EXCHANGE engine (net/lanSession.js) is
// deterministic and consistent on both ends.
//
// THE PROPERTY THAT MATTERS: for LAN play to be desync-free, both machines must reconstruct the EXACT same
// per-frame (p1 mask, p2 mask) timeline from the inputs they exchange. If they do, feeding those masks into
// the (already deterministic, seed-driven) sim produces bit-identical matches. This harness proves exactly
// that reconstruction agreement — twice:
//
//   PART A — in-memory cross-wired sessions (perfect, synchronous delivery): rigorous determinism check with
//            no I/O flake. Also verifies the lockstep gate (canAdvance) and a deliberate stall.
//   PART B — two real WebSocket clients over the actual host in RELAY mode: the same agreement, but the masks
//            travel over real sockets. (Raw transport round-trip itself was already proven in net_spike.)

import { LanSession } from "../net/lanSession.js"
import { startLanServer } from "../net/lanServer.mjs"
import { LanClient } from "../net/lanClient.js"
import { MSG } from "../net/protocol.js"

const DELAY = 2
const N = 240                     // simulate 240 frames (~4s at 60fps)
let pass = 0, fail = 0
const ok  = (m) => { pass++; console.log(`  ✓ ${m}`) }
const bad = (m) => { fail++; console.log(`  ✗ ${m}`) }

// Deterministic scripted inputs so both ends can be compared. p1 and p2 press different patterns.
const p1raw = (f) => ({ left: f % 2 === 0, light: f % 3 === 0, right: f % 7 === 0, up: f % 11 === 0 })
const p2raw = (f) => ({ right: f % 2 === 1, heavy: f % 4 === 0, block: f % 5 === 0, special: f % 9 === 0 })

// Rebuild the canonical (p1,p2) mask timeline a session sees, and hash it. `p1IsLocal` tells us whether this
// session drives p1 (so we know which of local/remote is p1's mask).
function timelineHash(session, p1IsLocal, frames) {
  let h = 2166136261 >>> 0
  for (let f = 0; f < frames; f++) {
    const p1m = p1IsLocal ? session.localMaskAt(f) : session.remoteMaskAt(f)
    const p2m = p1IsLocal ? session.remoteMaskAt(f) : session.localMaskAt(f)
    h = (Math.imul(h ^ (p1m & 0xffff), 16777619)) >>> 0
    h = (Math.imul(h ^ (p2m & 0xffff), 16777619)) >>> 0
  }
  return h
}

// ── PART A — in-memory, synchronous ─────────────────────────────────────────
console.log("PART A — in-memory cross-wired sessions")
{
  const A = new LanSession({ side: "p1", inputDelay: DELAY, send: (m) => B.onMessage(m) })
  const B = new LanSession({ side: "p2", inputDelay: DELAY, send: (m) => A.onMessage(m) })

  let advancedA = 0, advancedB = 0, agree = true
  for (let f = 0; f < N; f++) {
    A.sample(f, p1raw(f))
    B.sample(f, p2raw(f))
    // Advance the frame whose inputs were scheduled DELAY frames ago (they're all present now).
    if (A.canAdvance(f)) advancedA++
    if (B.canAdvance(f)) advancedB++
    // Lockstep agreement invariant: A's view of p2 == B's own p2 input, and vice-versa.
    if (A.remoteMaskAt(f) !== B.localMaskAt(f) || B.remoteMaskAt(f) !== A.localMaskAt(f)) agree = false
  }
  if (advancedA === N && advancedB === N) ok(`both sessions could advance all ${N} frames (no false stalls)`)
  else bad(`advance counts off: A=${advancedA} B=${advancedB} (want ${N})`)
  if (agree) ok("lockstep agreement held every frame (each side's remote view == the peer's local input)")
  else bad("lockstep agreement broke — sessions disagreed on a mask")

  const hA = timelineHash(A, true, N), hB = timelineHash(B, false, N)
  if (hA === hB) ok(`both sessions reconstructed the IDENTICAL (p1,p2) input timeline (hash ${hA})`)
  else bad(`timeline hashes differ: A=${hA} B=${hB} → would desync`)

  // Stall proof: a session that never RECEIVES the peer's mask for a frame must refuse to advance it.
  const lonely = new LanSession({ side: "p1", inputDelay: DELAY, send: () => {} }) // send dropped → peer never hears us, we never hear peer
  for (let f = 0; f < 10; f++) lonely.sample(f, p1raw(f))
  if (lonely.localMaskAt(5) !== null && lonely.remoteMaskAt(5) === null && lonely.canAdvance(5) === false)
    ok("STALL works: local input known, remote absent → canAdvance(5) === false (holds, never guesses)")
  else bad(`stall gate wrong: local=${lonely.localMaskAt(5)} remote=${lonely.remoteMaskAt(5)} canAdvance=${lonely.canAdvance(5)}`)
}

// ── PART B — over real sockets, host in RELAY mode ───────────────────────────
console.log("\nPART B — two real WebSocket clients over a relay host")
{
  const PORT = 8798
  const server = startLanServer({ port: PORT, log: () => {}, relay: true })
  await new Promise((r) => server.wss.once("listening", r))
  const URL = `ws://127.0.0.1:${PORT}`

  try {
    const cA = new LanClient(URL, { name: "peerA" }); await cA.connect()
    const cB = new LanClient(URL, { name: "peerB" }); await cB.connect()

    const A = new LanSession({ side: "p1", inputDelay: DELAY, send: (m) => cA.send(m) })
    const B = new LanSession({ side: "p2", inputDelay: DELAY, send: (m) => cB.send(m) })
    cA.on(MSG.INPUT, (m) => A.onMessage(m))
    cB.on(MSG.INPUT, (m) => B.onMessage(m))

    // Fire every frame's input from both peers over the wire.
    for (let f = 0; f < N; f++) { A.sample(f, p1raw(f)); B.sample(f, p2raw(f)) }

    // Wait until both sessions have received the peer's masks for the whole run (async socket delivery).
    const start = performance.now()
    let ready = false
    while (performance.now() - start < 4000) {
      if (A.canAdvance(N - 1) && B.canAdvance(N - 1)) { ready = true; break }
      await new Promise((r) => setTimeout(r, 10))
    }
    if (ready) ok(`all ${N} frames of input crossed real sockets and both peers can advance to frame ${N - 1}`)
    else bad(`timed out waiting for socket delivery (A.can=${A.canAdvance(N - 1)} B.can=${B.canAdvance(N - 1)})`)

    const hA = timelineHash(A, true, N), hB = timelineHash(B, false, N)
    if (hA === hB) ok(`over real sockets, both peers reconstructed the IDENTICAL input timeline (hash ${hA})`)
    else bad(`socket timeline hashes differ: A=${hA} B=${hB}`)

    cA.close(); cB.close()
  } catch (e) {
    bad(`part B error: ${e.stack || e.message}`)
  } finally {
    await server.close()
  }
}

console.log(`\nnet-lockstep: ${pass}/${pass + fail} passed`)
process.exit(fail === 0 ? 0 : 1)
