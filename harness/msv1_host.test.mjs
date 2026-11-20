// harness/msv1_host.test.mjs — MSV1-HOST: public host server security + room relay (headless, no browser).
//   node harness/msv1_host.test.mjs
// Builds a throwaway client folder (with secrets planted NEXT to it and a symlink pointing out of it), starts
// the real net/hostServer.mjs on a random port, and attacks it: traversal (plain, encoded, double-encoded,
// backslash, NUL), directory listing, dev/debug routes, non-whitelisted repo files, methods, room brute force,
// origin forgery, oversize/malformed/flooding WS messages, cross-room relay, version mismatch. Also checks the
// happy path: two clients in one room handshake, see each other, and exchange INPUT / MATCH_SETUP.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import net from "node:net"
import { WebSocket } from "ws"
import { createHostServer, safeRelPath, makeRoomCode } from "../net/hostServer.mjs"
import { makeHello, buildStamp, MSG } from "../net/protocol.js"
import { parseJoinInput, normalizeRoomCode, relayUrlFor, ROOM_ALPHABET } from "../net/hostConfig.js"
import { isClientPath } from "../net/clientManifest.mjs"

let pass = 0, fail = 0
const ok = (name, cond, detail = "") => { if (cond) { pass++; console.log(`  ✅ ${name}${detail ? "  — " + detail : ""}`) } else { fail++; console.log(`  ❌ ${name}${detail ? "  — " + detail : ""}`) } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── fixture ──────────────────────────────────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mshost-"))
const root = path.join(tmp, "client")
fs.mkdirSync(path.join(root, "assets"), { recursive: true })
fs.mkdirSync(path.join(root, "docs"), { recursive: true })
fs.writeFileSync(path.join(root, "index.html"), "<html><head></head><body>GAME</body></html>")
fs.writeFileSync(path.join(root, "game.js"), "export const x = 1")
fs.writeFileSync(path.join(root, "assets", "a.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
fs.writeFileSync(path.join(root, "package.json"), '{"secret":"repo file"}')
fs.writeFileSync(path.join(root, "docs", "notes.md"), "private notes")
fs.writeFileSync(path.join(tmp, "SECRET.txt"), "TOP SECRET outside the client root")
fs.symlinkSync(path.join(tmp, "SECRET.txt"), path.join(root, "assets", "link.png"))   // whitelisted NAME, escaping target
const manifest = new Set(["game.js", "assets/a.png", "assets/link.png"])
const CODE = "abc1234567"
const logs = []
const srv = createHostServer({
  root, manifest, buildInfo: { appVersion: "9.9.9", codeHash: CODE }, log: (m) => logs.push(m),
  limits: { msgsPerSecond: 50, joinFailuresPerWindow: 5, maxConnectionsPerIp: 6, maxConnections: 12 },
  legacyLanRoom: () => room.code,
})
const port = await srv.listen(0, "127.0.0.1")
const room = srv.createRoom()
const room2 = srv.createRoom()
const base = `http://127.0.0.1:${port}`

// raw HTTP so encoded paths reach the server verbatim (fetch would normalise them)
function raw(pathStr, { method = "GET", headers = {} } = {}) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1", () => {
      s.write(`${method} ${pathStr} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n${Object.entries(headers).map(([k, v]) => `${k}: ${v}\r\n`).join("")}\r\n`)
    })
    let buf = ""
    s.on("data", (d) => { buf += d.toString("latin1") })
    s.on("end", () => resolve({ status: +((/^HTTP\/1\.1 (\d+)/.exec(buf) || [])[1] || 0), body: buf.split("\r\n\r\n").slice(1).join("\r\n\r\n") }))
    s.on("error", () => resolve({ status: 0, body: "" }))
  })
}

console.log("\n── static whitelist / traversal ──")
{
  const r = await raw("/game.js"); ok("whitelisted module served", r.status === 200 && r.body.includes("export const x"))
  const i = await raw("/"); ok("index served at /", i.status === 200 && i.body.includes("GAME"))
  for (const p of ["/../SECRET.txt", "/assets/../../SECRET.txt", "/%2e%2e/SECRET.txt", "/%2E%2E%2FSECRET.txt", "/assets/%2e%2e/%2e%2e/SECRET.txt",
    "/%252e%252e/SECRET.txt", "/..%5cSECRET.txt", "/assets\\..\\..\\SECRET.txt", "/game.js%00.png", "//etc/passwd", "/./game.js", "/assets//a.png"]) {
    const r2 = await raw(p)
    ok(`traversal refused: ${p}`, r2.status >= 400 && !r2.body.includes("TOP SECRET"), `HTTP ${r2.status}`)
  }
  const sl = await raw("/assets/link.png"); ok("symlink escaping the client root refused", sl.status === 403 && !sl.body.includes("TOP SECRET"), `HTTP ${sl.status}`)
  for (const p of ["/assets/", "/assets", "/docs/", "/docs/notes.md", "/package.json", "/.git/config", "/game.js.map", "/node_modules/ws/package.json", "/harness/x.mjs", "/server/save-server.mjs"]) {
    const r3 = await raw(p); ok(`not served: ${p}`, r3.status === 404 || r3.status === 400, `HTTP ${r3.status}`)
  }
  for (const p of ["/api/save", "/api/feedback", "/api/lan-info", "/api/health", "/api/debug", "/__harness", "/admin"]) {
    const r4 = await raw(p); ok(`dev/debug route absent: ${p}`, r4.status === 404, `HTTP ${r4.status}`)
  }
  const post = await raw("/api/save", { method: "POST", headers: { "content-length": "2" } }); ok("POST refused (405)", post.status === 405)
  const put = await raw("/game.js", { method: "PUT", headers: { "content-length": "0" } }); ok("PUT refused (405)", put.status === 405)
  const hdr = await fetch(`${base}/game.js`); ok("nosniff + no-frame headers", hdr.headers.get("x-content-type-options") === "nosniff" && hdr.headers.get("x-frame-options") === "DENY")
  ok("safeRelPath rejects '..' after decoding", safeRelPath("/a/%2e%2e/b") === null && safeRelPath("/a/../b") === null && safeRelPath("/a/b.png") === "a/b.png")
  ok("client-file rule excludes repo/dev files", !isClientPath("package.json") && !isClientPath("docs/x.png") && !isClientPath("harness/a.js") && !isClientPath("tools/a.js") && !isClientPath("x.mjs") && !isClientPath("NOTES.md") && !isClientPath("gon_work/a.png") && !isClientPath(".env") && isClientPath("game.js") && isClientPath("assets/x/y.png") && isClientPath("net/hostLink.js") && !isClientPath("net/hostServer.mjs"))
}

console.log("\n── join page + room lookup ──")
{
  const j = await fetch(`${base}/join?room=${room.code}`); const html = await j.text()
  ok("join page: ONE button (JOIN THE GAME) + the host's copy-and-send invite view", j.status === 200 && html.includes(">JOIN THE GAME<") && !html.includes("Open in desktop app") && !html.includes("Play in browser") && html.includes('id="invite" hidden') && html.includes("Copy link"))
  ok("join page has a strict CSP with nonce", /script-src 'nonce-/.test(j.headers.get("content-security-policy") || ""))
  const x = await fetch(`${base}/join?room=%3Cscript%3Ealert(1)%3C/script%3E`); ok("join page never echoes input", !(await x.text()).includes("<script>alert"))
  const a = await (await fetch(`${base}/api/room/${room.code}?code=${CODE}`)).json()
  ok("room lookup: exists, compatible", a.ok && a.room === room.code && a.max === 2 && a.compatible === true)
  const b = await (await fetch(`${base}/api/room/${room.code}?code=deadbeef00`)).json()
  ok("room lookup: mismatch reported", b.ok && b.compatible === false && b.hostVersion === "9.9.9" && /releases/.test(b.releasesUrl))
}

console.log("\n── room codes ──")
{
  const codes = Array.from({ length: 2000 }, () => makeRoomCode())
  ok("codes are 6 chars from the unambiguous alphabet", codes.every((c) => /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/.test(c)))
  ok("alphabet has no 0/O/1/I", !/[0O1I]/.test(ROOM_ALPHABET))
  ok("normalizeRoomCode", normalizeRoomCode("abc0d3") === null && normalizeRoomCode("ab-c2d3") === "ABC2D3" && normalizeRoomCode("abc234") === "ABC234" && normalizeRoomCode("ABC23") === null)
  ok("parse https join link", (() => { const p = parseJoinInput("https://x-y.trycloudflare.com/join?room=ABC234"); return p.kind === "link" && p.origin === "https://x-y.trycloudflare.com" && p.room === "ABC234" })())
  ok("parse protocol link", (() => { const p = parseJoinInput("multiversesmash://join?link=" + encodeURIComponent("http://192.168.1.5:8790/join?room=ABC234") + "&room=ABC234"); return p.kind === "link" && p.origin === "http://192.168.1.5:8790" })())
  ok("bare code → asks for the link", parseJoinInput("abc234").kind === "code")
  ok("relay URL has explicit port + wss", relayUrlFor("https://h.trycloudflare.com", "ABC234") === "wss://h.trycloudflare.com:443/ws?room=ABC234")
}

// ── WS helpers ──
function connectWs(q, { origin, headers = {} } = {}) {
  return new Promise((resolve) => {
    const h = { ...headers }; if (origin) h.Origin = origin
    const ws = new WebSocket(`ws://127.0.0.1:${port}${q}`, { headers: h })
    const msgs = []
    ws.msgs = msgs
    ws.on("message", (d) => { try { msgs.push(JSON.parse(d.toString())) } catch {} })
    ws.on("open", () => resolve(ws))
    ws.on("unexpected-response", (_req, res) => resolve({ refused: res.statusCode }))
    ws.on("error", () => resolve({ refused: -1 }))
  })
}
const closed = (ws) => new Promise((r) => { if (ws.readyState === 3) return r(ws._closeCode); ws.on("close", (c) => r(c)) })
const hello = (ws, code = CODE, extra = {}) => ws.send(JSON.stringify({ ...makeHello("t"), build: { code, app: "9.9.9" }, ...extra }))
const waitFor = async (ws, pred, ms = 1500) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const m = ws.msgs.find(pred); if (m) return m; await sleep(20) } return null }

console.log("\n── relay: handshake, seats, forwarding ──")
let hostWs, joinWs
{
  joinWs = await connectWs(`/ws?room=${room.code}`, { origin: `http://127.0.0.1:${port}` })
  hello(joinWs)
  const w = await waitFor(joinWs, (m) => m.t === MSG.WELCOME)
  ok("joiner welcomed as p2 (p1 reserved for the host token)", w && w.side === "p2")
  hostWs = await connectWs(`/ws?room=${room.code}&host=${room.hostToken}`, { origin: "http://127.0.0.1:55555" })
  hello(hostWs)
  const hw = await waitFor(hostWs, (m) => m.t === MSG.WELCOME)
  ok("host (token) welcomed as p1", hw && hw.side === "p1")
  const lob = await waitFor(joinWs, (m) => m.t === MSG.LOBBY && m.count === 2)
  ok("joiner sees the host in the lobby (count 2)", !!lob)
  hostWs.send(JSON.stringify({ t: MSG.MATCH_SETUP, seed: 12345, mode: "pvp", rounds: 3, p1Char: "naruto", p2Char: "sasuke", stage: "Training", evil: "<script>" }))
  const setup = await waitFor(joinWs, (m) => m.t === MSG.MATCH_SETUP)
  ok("MATCH_SETUP relayed host→joiner, rebuilt (unknown fields dropped)", setup && setup.seed === 12345 && setup.p1Char === "naruto" && !("evil" in setup))
  joinWs.send(JSON.stringify({ t: MSG.INPUT, side: "p2", frame: 10, mask: 5, extra: "x" }))
  const inp = await waitFor(hostWs, (m) => m.t === MSG.INPUT)
  ok("INPUT relayed joiner→host, rebuilt", inp && inp.frame === 10 && inp.mask === 5 && !("extra" in inp))
  joinWs.send(JSON.stringify({ t: MSG.INPUT, side: "p1", frame: 11, mask: 1 }))   // spoof the other side
  joinWs.send(JSON.stringify({ t: MSG.MATCH_SETUP, seed: 1, p1Char: "a", p2Char: "b" }))   // joiner may not set up
  joinWs.send(JSON.stringify({ t: MSG.INPUT, side: "p2", frame: 12, mask: 999999 }))   // out of range
  await sleep(200)
  ok("spoofed side / joiner setup / bad mask NOT relayed", !hostWs.msgs.some((m) => (m.t === MSG.INPUT && m.frame !== 10) || (m.t === MSG.MATCH_SETUP)))
  // PICK (PLAY WITH A FRIEND: each player tells the other which fighter they locked in) — relayed both ways, rebuilt
  joinWs.send(JSON.stringify({ t: MSG.PICK, char: "sasuke", skin: "default", aliens: null, evil: "<x>" }))
  const pk = await waitFor(hostWs, (m) => m.t === MSG.PICK)
  ok("PICK relayed joiner→host, rebuilt (unknown fields dropped)", pk && pk.char === "sasuke" && pk.skin === "default" && !("evil" in pk))
  hostWs.send(JSON.stringify({ t: MSG.PICK, char: "goku", skin: "ssj" }))
  const pk2 = await waitFor(joinWs, (m) => m.t === MSG.PICK)
  ok("PICK relayed host→joiner", pk2 && pk2.char === "goku" && pk2.skin === "ssj")
  joinWs.send(JSON.stringify({ t: MSG.PICK, char: "<script>alert(1)</script>" }))
  joinWs.send(JSON.stringify({ t: MSG.PICK, char: "x".repeat(200) }))
  await sleep(200)
  ok("PICK with a non-identifier / oversized fighter id NOT relayed", hostWs.msgs.filter((m) => m.t === MSG.PICK).length === 1)
  joinWs.send(JSON.stringify({ t: MSG.PING, payload: "p" }))
  ok("ping answered", !!(await waitFor(joinWs, (m) => m.t === MSG.PONG && m.payload === "p")))
  const snap = srv.snapshot().rooms.find((r) => r.code === room.code)
  ok("snapshot lists both players", snap && snap.players.length === 2 && snap.players.some((p) => p.host))
}

console.log("\n── isolation, capacity, mismatch ──")
{
  const other = await connectWs(`/ws?room=${room2.code}`)
  hello(other)
  await waitFor(other, (m) => m.t === MSG.WELCOME)
  hostWs.send(JSON.stringify({ t: MSG.INPUT, side: "p1", frame: 50, mask: 3 }))
  await sleep(200)
  ok("messages never cross rooms", !other.msgs.some((m) => m.t === MSG.INPUT))
  other.close()
  const third = await connectWs(`/ws?room=${room.code}`)
  hello(third)
  const rj = await waitFor(third, (m) => m.t === MSG.REJECT)
  ok("third player refused: room full (max 2, no spectating)", rj && /full/i.test(rj.reason))
  const mm = await connectWs(`/ws?room=${room2.code}`)
  hello(mm, "0000000000")
  const rm = await waitFor(mm, (m) => m.t === MSG.REJECT)
  ok("different build hash REJECTED with releases link", rm && rm.mismatch && /mismatch/i.test(rm.reason) && /releases/.test(rm.releasesUrl), rm && rm.reason)
  ok("mismatched client never seated", !srv.snapshot().rooms.find((r) => r.code === room2.code).players.length)
  const nb = await connectWs(`/ws?room=${room2.code}`)
  nb.send(JSON.stringify({ ...makeHello("t"), build: null }))
  const rn = await waitFor(nb, (m) => m.t === MSG.REJECT)
  ok("hello without a build hash REJECTED", !!rn)
  const ws = await connectWs(`/ws?room=${room2.code}`)
  ws.send(JSON.stringify({ t: MSG.HELLO, stamp: "r0.bX.p0", build: { code: CODE } }))
  ok("wrong protocol stamp REJECTED", !!(await waitFor(ws, (m) => m.t === MSG.REJECT)))
  const badTok = await connectWs(`/ws?room=${room2.code}&host=nottherighttoken`)
  ok("bad host token refused", !!(await waitFor(badTok, (m) => m.t === MSG.REJECT && /credentials/.test(m.reason))))
}

console.log("\n── abuse limits ──")
{
  const big = await connectWs(`/ws?room=${room2.code}`)
  hello(big); await waitFor(big, (m) => m.t === MSG.WELCOME)
  big.send("x".repeat(10_000))
  const c = await closed(big)
  ok("oversize message → connection closed (1009)", c === 1009, `code ${c}`)
  const fl = await connectWs(`/ws?room=${room2.code}`)
  hello(fl); await waitFor(fl, (m) => m.t === MSG.WELCOME)
  for (let i = 0; i < 200; i++) fl.send(JSON.stringify({ t: MSG.PING, payload: i }))
  ok("message flood → dropped (4008)", (await closed(fl)) === 4008)
  const junk = await connectWs(`/ws?room=${room2.code}`)
  hello(junk); await waitFor(junk, (m) => m.t === MSG.WELCOME)
  for (let i = 0; i < 25; i++) junk.send(i % 2 ? "{not json" : JSON.stringify({ t: "eval", code: "process.exit()" }))
  ok("malformed / unknown messages → dropped (4003)", (await closed(junk)) === 4003)
  const ev = await connectWs(`/ws?room=${room2.code}`, { origin: "https://evil.example.com" })
  ok("foreign browser Origin refused (403)", ev.refused === 403, `got ${ev.refused}`)
  const lp = await connectWs(`/`, { headers: { "cf-connecting-ip": "203.0.113.9" } })
  ok("legacy no-room path refused for tunnelled (public) clients", lp.refused === 404, `got ${lp.refused}`)
  const lan = await connectWs(`/`)
  hello(lan)
  const lw = await waitFor(lan, (m) => m.t === MSG.WELCOME || m.t === MSG.REJECT)
  ok("legacy no-room path works for a direct LAN/loopback peer (maps to the main room)", lw && (lw.t === MSG.WELCOME || /full/.test(lw.reason)), lw && lw.t)
  lan.close()
  // brute force: 5 unknown codes from one (forwarded) IP → blocked, even for a real code afterwards
  const H = { "cf-connecting-ip": "198.51.100.7" }
  for (let i = 0; i < 5; i++) await fetch(`${base}/api/room/ZZZZZ${"23456"[i]}`, { headers: H })
  const blocked = await fetch(`${base}/api/room/${room.code}`, { headers: H })
  ok("join attempts rate-limited per IP (429 after repeated unknown codes)", blocked.status === 429, `HTTP ${blocked.status}`)
  const wsb = await connectWs(`/ws?room=${room.code}`, { headers: H })
  ok("blocked IP also refused on the relay", wsb.refused === 429, `got ${wsb.refused}`)
  const other = await fetch(`${base}/api/room/${room.code}`, { headers: { "cf-connecting-ip": "198.51.100.8" } })
  ok("other IPs unaffected", other.status === 200)
}

console.log("\n── closing ──")
{
  const byeP = waitFor(joinWs, (m) => m.t === MSG.BYE, 2000)
  srv.closeRoom(room.code)
  ok("closing a room tells its players (BYE) and closes them", !!(await byeP) && (await closed(joinWs)) === 4100)
  const after = await connectWs(`/ws?room=${room.code}`)
  hello(after)
  ok("closed room code is rejected politely", !!(await waitFor(after, (m) => m.t === MSG.REJECT && /not found/i.test(m.reason))))
  await srv.close()
  const r = await raw("/game.js")
  ok("after close(): port no longer accepts connections", r.status === 0)
}

// EADDRINUSE: occupy a port, ask for it, expect a different free port (never a crash)
{
  const blocker = net.createServer().listen(0, "0.0.0.0")
  await new Promise((r) => blocker.once("listening", r))
  const busy = blocker.address().port
  const s2 = createHostServer({ root, manifest, buildInfo: { codeHash: CODE } })
  const p2 = await s2.listen(busy, "0.0.0.0", 3)
  ok("port clash → auto-picks another port (no crash)", p2 && p2 !== busy, `${busy} busy → ${p2}`)
  await s2.close(); blocker.close()
}

fs.rmSync(tmp, { recursive: true, force: true })
console.log(`\nMSV1-HOST SERVER: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
