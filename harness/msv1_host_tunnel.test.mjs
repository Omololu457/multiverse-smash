// harness/msv1_host_tunnel.test.mjs — MSV1-HOST: tunnel manager + host controller, against a STUB cloudflared.
//   node harness/msv1_host_tunnel.test.mjs
// The stub is a tiny executable script that prints a trycloudflare URL the way cloudflared does (and can die
// on cue), so we can prove: URL parsing, restart-on-drop with the NEW url shown, stop() kills the process (no
// orphan), checksum mismatch refuses to install, the tar extractor, and the controller's degrade path
// (tunnel fails → LAN link still works, clear message). The REAL cloudflared is not run here.
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import zlib from "node:zlib"
import { QuickTunnel, downloadCloudflared, extractFromTar, findCloudflared, CLOUDFLARED_ASSETS, sha256 } from "../net/tunnel.mjs"
import { createHostController } from "../electron/host.js"

let pass = 0, fail = 0
const ok = (n, c, d = "") => { if (c) { pass++; console.log(`  ✅ ${n}${d ? "  — " + d : ""}`) } else { fail++; console.log(`  ❌ ${n}${d ? "  — " + d : ""}`) } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }

// SAFETY: this test must never download or run the real cloudflared. Block network fetches outright.
globalThis.fetch = ((orig) => async (u, o) => { const s = String(u); if (!/^http:\/\/127\.0\.0\.1:/.test(s)) throw new Error("network blocked in test: " + s); return orig(u, o) })(globalThis.fetch)
process.env.MS_CLOUDFLARED_DOWNLOAD = "off"
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mstun-"))
const stub = path.join(tmp, "cloudflared")
fs.writeFileSync(stub, `#!${process.execPath}
const fs=require('fs'),p=require('path');const d=${JSON.stringify(tmp)};
const cf=p.join(d,'count');let n=0;try{n=+fs.readFileSync(cf,'utf8')}catch{};n++;fs.writeFileSync(cf,String(n));
fs.appendFileSync(p.join(d,'pids'),process.pid+'\\n');
fs.writeFileSync(p.join(d,'args'),JSON.stringify(process.argv.slice(2)));
if(process.env.STUB_MODE==='fail'){console.error('ERR failed to request quick Tunnel: no network');process.exit(1)}
setTimeout(()=>{console.error('2026-11-20T00:00:00Z INF +----------------------------+');console.error('2026-11-20T00:00:00Z INF |  https://stub-run-'+n+'.trycloudflare.com  |')},150);
if(process.env.STUB_DIE_MS&&n===1)setTimeout(()=>process.exit(3),+process.env.STUB_DIE_MS);
setInterval(()=>{},1e6);
`, { mode: 0o755 })

console.log("\n── QuickTunnel ──")
{
  process.env.STUB_DIE_MS = "600"
  const t = new QuickTunnel({ bin: stub, port: 9999 })
  const urls = []
  t.on("url", (u) => urls.push(u))
  const first = await t.start()
  ok("parses the trycloudflare URL from cloudflared output", first === "https://stub-run-1.trycloudflare.com", first)
  const args = JSON.parse(fs.readFileSync(path.join(tmp, "args"), "utf8"))
  ok("runs `tunnel --no-autoupdate --url http://127.0.0.1:<port>`", args.join(" ") === "tunnel --no-autoupdate --url http://127.0.0.1:9999")
  // stub dies after 600 ms → restart (2 s backoff) → new URL
  const t0 = Date.now(); while (urls.length < 2 && Date.now() - t0 < 8000) await sleep(100)
  ok("restarts after a drop and reports the NEW url", urls[1] === "https://stub-run-2.trycloudflare.com", urls.join(" , "))
  const pids = fs.readFileSync(path.join(tmp, "pids"), "utf8").trim().split("\n").map(Number)
  await t.stop()
  await sleep(300)
  ok("stop() kills cloudflared (no orphan process)", pids.every((p) => !alive(p)), `pids ${pids.join(",")}`)
  delete process.env.STUB_DIE_MS
}
{
  process.env.STUB_MODE = "fail"
  const t = new QuickTunnel({ bin: stub, port: 9999, startTimeoutMs: 3000 })
  let err = null
  try { await t.start() } catch (e) { err = e }
  ok("a tunnel that never reports a URL rejects (no hang)", !!err, err && err.message)
  await t.stop()
  delete process.env.STUB_MODE
}

console.log("\n── binary verification ──")
{
  const fake = Buffer.from("not cloudflared")
  const fakeFetch = async () => ({ ok: true, status: 200, headers: new Map([["content-length", String(fake.length)]]), body: (async function* () { yield fake })() })
  fakeFetch.toString = () => "fake"
  const fetchImpl = async (...a) => { const r = await fakeFetch(...a); r.headers.get = (k) => (k === "content-length" ? String(fake.length) : null); return r }
  let err = null
  try { await downloadCloudflared({ cacheDir: path.join(tmp, "cache"), fetchImpl, key: "linux-x64" }) } catch (e) { err = e }
  ok("download with a wrong checksum is REFUSED (never written / run)", err && /checksum mismatch/.test(err.message) && !fs.existsSync(path.join(tmp, "cache", "cloudflared")), err && err.message.slice(0, 80))
  // a tar.gz containing "cloudflared": extractor finds it
  const body = Buffer.from("#!/bin/sh\necho hi\n")
  const hdr = Buffer.alloc(512); hdr.write("cloudflared", 0); hdr.write("0000755\0", 100); hdr.write(body.length.toString(8).padStart(11, "0") + "\0", 124); hdr[156] = 48
  const tar = Buffer.concat([hdr, body, Buffer.alloc(512 - body.length), Buffer.alloc(1024)])
  ok("tar extractor finds the binary", extractFromTar(zlib.gunzipSync(zlib.gzipSync(tar)), "cloudflared")?.equals(body))
  ok("every pinned asset has a sha256", Object.values(CLOUDFLARED_ASSETS).every((a) => /^[0-9a-f]{64}$/.test(a.sha256)))
  // a cached binary whose recorded hash no longer matches is not trusted
  fs.mkdirSync(path.join(tmp, "c2"), { recursive: true })
  fs.writeFileSync(path.join(tmp, "c2", "cloudflared"), "tampered")
  fs.writeFileSync(path.join(tmp, "c2", "cloudflared.sha256"), sha256(Buffer.from("original")))
  const oldPath = process.env.PATH; process.env.PATH = "/nonexistent"
  ok("tampered cached binary is ignored", findCloudflared({ cacheDir: path.join(tmp, "c2") }) === null)
  process.env.PATH = oldPath
}

console.log("\n── host controller (tunnel via stub, and degrade path) ──")
{
  const root = path.join(tmp, "client"); fs.mkdirSync(root); fs.writeFileSync(path.join(root, "index.html"), "<html><head></head></html>")
  const states = []
  const env = { MS_CLOUDFLARED: stub, MS_CLOUDFLARED_DOWNLOAD: "off", MS_HOST_UPNP: "off", MS_HOST_PORT: "0", PATH: "/nonexistent" }
  fs.rmSync(path.join(tmp, "count"), { force: true }); fs.rmSync(path.join(tmp, "pids"), { force: true })
  const hc = createHostController({ root, manifest: new Set(), buildInfo: { appVersion: "1.0.0", codeHash: "x" }, cacheDir: path.join(tmp, "cache"), env, onState: (s) => states.push(s) })
  const s = await hc.start()
  ok("start(): status online via tunnel", s.status === "online" && s.route === "tunnel", `${s.status}/${s.route}`)
  ok("public join link = tunnel URL + /join?room=CODE", s.publicLink === `https://stub-run-1.trycloudflare.com/join?room=${s.room}`, s.publicLink)
  ok("room code shown (6 chars)", /^[A-Z2-9]{6}$/.test(s.room))
  ok("LAN link(s) shown too", Array.isArray(s.lanLinks))
  ok("went through Starting → Online", states.some((x) => x.status === "starting") && states.at(-1).status === "online")
  const port = s.port
  const r = await fetch(`http://127.0.0.1:${port}/healthz`); ok("host server answering", r.ok)
  const pids = fs.readFileSync(path.join(tmp, "pids"), "utf8").trim().split("\n").map(Number)
  const st = await hc.stop()
  await sleep(300)
  ok("Stop Hosting → status offline", st.status === "offline")
  let refused = false
  try { await fetch(`http://127.0.0.1:${port}/healthz`) } catch { refused = true }
  ok("Stop Hosting really closes the public listener", refused)
  ok("Stop Hosting kills cloudflared", pids.every((p) => !alive(p)))

  const env2 = { MS_CLOUDFLARED: stub, MS_CLOUDFLARED_DOWNLOAD: "off", MS_HOST_UPNP: "off", MS_HOST_PORT: "0" }
  process.env.STUB_MODE = "fail"
  const hc2 = createHostController({ root, manifest: new Set(), buildInfo: { appVersion: "1.0.0", codeHash: "x" }, cacheDir: path.join(tmp, "cache"), env: env2 })
  // shorten the start timeout by failing fast: the stub exits 1 → restart loop; start() rejects after its timeout
  const t0 = Date.now()
  const s2 = await hc2.start()
  ok("tunnel failure → still ONLINE on LAN, with a clear message", s2.status === "online" && s2.route === "lan" && /unavailable/.test(s2.message) && !s2.publicLink, `${s2.message.slice(0, 90)} (${Math.round((Date.now() - t0) / 1000)}s)`)
  const r2 = await fetch(`http://127.0.0.1:${s2.port}/healthz`); ok("LAN hosting keeps working after tunnel failure", r2.ok)
  await hc2.stop()
  delete process.env.STUB_MODE
}

fs.rmSync(tmp, { recursive: true, force: true })
console.log(`\nMSV1-HOST TUNNEL: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
