// net/tunnel.mjs — MSV1-HOST: Cloudflare QUICK TUNNEL manager (node only).
//
//   cloudflared tunnel --no-autoupdate --url http://127.0.0.1:<hostPort>
//
// prints a random https://<words>.trycloudflare.com URL; everything (HTTP + WebSocket → wss://) sent there
// is forwarded to our host server. No Cloudflare account, no router changes.
//
// BINARY POLICY — never run an unverified binary:
//   1. a copy bundled with the packaged app (resources/cloudflared/…), placed there by the release workflow
//      after checking the SAME pinned SHA-256 below;
//   2. a `cloudflared` the user installed themselves on PATH (their own trust decision);
//   3. otherwise download the pinned official release from github.com/cloudflare/cloudflared, verify the
//      archive's SHA-256 against the pin BEFORE extracting, cache it in the app's data folder, and re-hash
//      the cached binary against the recorded hash before every launch.
// cloudflared is Apache-2.0 licensed, so bundling it is permitted (its LICENSE ships alongside).

import { spawn, execFileSync } from "node:child_process"
import { EventEmitter } from "node:events"
import fs from "node:fs"
import path from "node:path"
import crypto from "node:crypto"
import zlib from "node:zlib"

export const CLOUDFLARED_VERSION = "2026.11.1"
// SHA-256 of each release ASSET as served by GitHub (the `digest` GitHub computes for the uploaded file).
// Source: api.github.com/repos/cloudflare/cloudflared/releases/tags/2026.11.1. The non-macOS values also
// match the "SHA256 Checksums" list in the release notes; the notes' macOS .tgz lines describe a different
// packaging of the archive, so the asset digest is the one that matches the bytes actually downloaded.
export const CLOUDFLARED_ASSETS = Object.freeze({
  "darwin-arm64": { file: "cloudflared-darwin-arm64.tgz", sha256: "02fe4bcf08f2c09699cff30658228a739a0c47fb75f3653d1b8772a27ade4462", tgz: true },
  "darwin-x64":   { file: "cloudflared-darwin-amd64.tgz", sha256: "5e0403b188dfee71fbd9b995e7dc9910d61b661c52371935ab6475d41185632f", tgz: true },
  "linux-x64":    { file: "cloudflared-linux-amd64",      sha256: "97bb3b02d23a5980fc9c15a1a270e692da1923f103f920d5b16d4931d5ab55e7" },
  "linux-arm64":  { file: "cloudflared-linux-arm64",      sha256: "b155cec3e48e489cfb8e5c602769fb8c771083018d8881d68b4d18a791567c5a" },
  "win32-x64":    { file: "cloudflared-windows-amd64.exe", sha256: "341deda3db5ec498a0482254d6c38c0b7cf01a30c37bb5dd95d2216d08955e35" },
  "win32-ia32":   { file: "cloudflared-windows-386.exe",   sha256: "060868e138e638237e33329315c3e374e0156a2fb18879e571dbc0d506060df3" },
})
export const platformKey = (p = process.platform, a = process.arch) => `${p}-${a}`
export const exeName = (p = process.platform) => (p === "win32" ? "cloudflared.exe" : "cloudflared")
export const assetUrl = (asset) => `https://github.com/cloudflare/cloudflared/releases/download/${CLOUDFLARED_VERSION}/${asset.file}`
const TUNNEL_URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i

export const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex")
const sha256File = (f) => sha256(fs.readFileSync(f))

function onPath(name) {
  try {
    const cmd = process.platform === "win32" ? "where" : "which"
    const out = execFileSync(cmd, [name], { stdio: ["ignore", "pipe", "ignore"] }).toString().split(/\r?\n/)[0].trim()
    return out && fs.existsSync(out) ? out : null
  } catch { return null }
}

// Returns { bin, source } or null. Does not download.
export function findCloudflared({ bundledDir = null, cacheDir = null, env = process.env } = {}) {
  if (env.MS_CLOUDFLARED) return fs.existsSync(env.MS_CLOUDFLARED) ? { bin: env.MS_CLOUDFLARED, source: "env" } : null
  if (bundledDir) {
    const b = path.join(bundledDir, exeName())
    if (fs.existsSync(b)) return { bin: b, source: "bundled" }
  }
  const p = onPath(exeName())
  if (p) return { bin: p, source: "path" }
  if (cacheDir) {
    const c = path.join(cacheDir, exeName()), h = c + ".sha256"
    if (fs.existsSync(c) && fs.existsSync(h) && sha256File(c) === fs.readFileSync(h, "utf8").trim()) return { bin: c, source: "cache" }
  }
  return null
}

// Minimal ustar reader: extracts the single regular file named `want` (basename match) from a tar buffer.
export function extractFromTar(tar, want) {
  let off = 0
  while (off + 512 <= tar.length) {
    const hdr = tar.subarray(off, off + 512)
    if (hdr.every((b) => b === 0)) break
    const name = hdr.subarray(0, 100).toString("utf8").replace(/\0.*$/s, "")
    const prefix = hdr.subarray(345, 500).toString("utf8").replace(/\0.*$/s, "")
    const size = parseInt(hdr.subarray(124, 136).toString("utf8").replace(/\0.*$/s, "").trim() || "0", 8)
    const type = String.fromCharCode(hdr[156] || 48)
    const full = prefix ? `${prefix}/${name}` : name
    const body = off + 512
    if ((type === "0" || type === "\0") && path.posix.basename(full) === want) return Buffer.from(tar.subarray(body, body + size))
    off = body + Math.ceil(size / 512) * 512
  }
  return null
}

// Download → verify the archive hash against the pin → extract → cache → record the binary's own hash.
export async function downloadCloudflared({ cacheDir, onProgress = () => {}, fetchImpl = globalThis.fetch, key = platformKey() } = {}) {
  const asset = CLOUDFLARED_ASSETS[key]
  if (!asset) throw new Error(`no pinned cloudflared build for ${key}`)
  onProgress({ phase: "download", pct: 0, text: `Downloading the Cloudflare tunnel helper (cloudflared ${CLOUDFLARED_VERSION})…` })
  const res = await fetchImpl(assetUrl(asset), { redirect: "follow" })
  if (!res.ok || !res.body) throw new Error(`download failed: HTTP ${res.status}`)
  const total = +res.headers.get("content-length") || 0
  const chunks = []
  let got = 0, lastPct = -1
  for await (const chunk of res.body) {
    chunks.push(Buffer.from(chunk)); got += chunk.length
    const pct = total ? Math.floor((got / total) * 100) : 0
    if (pct !== lastPct && pct % 5 === 0) { lastPct = pct; onProgress({ phase: "download", pct, text: `Downloading tunnel helper… ${pct}%` }) }
  }
  const buf = Buffer.concat(chunks)
  const got256 = sha256(buf)
  if (got256 !== asset.sha256) throw new Error(`checksum mismatch for ${asset.file}: expected ${asset.sha256}, got ${got256} — refusing to run it`)
  onProgress({ phase: "verify", pct: 100, text: "Checksum verified." })
  const bin = asset.tgz ? extractFromTar(zlib.gunzipSync(buf), "cloudflared") : buf
  if (!bin) throw new Error("cloudflared binary not found inside the verified archive")
  fs.mkdirSync(cacheDir, { recursive: true })
  const out = path.join(cacheDir, exeName())
  const tmp = out + ".tmp"
  fs.writeFileSync(tmp, bin, { mode: 0o755 })
  fs.renameSync(tmp, out)
  fs.writeFileSync(out + ".sha256", sha256(bin))
  return { bin: out, source: "download" }
}

// Long-lived quick tunnel with automatic restart. Events:
//   "url"   (url)            first URL and every new URL after a restart
//   "down"  ({code, signal}) the process exited (a restart is scheduled while wanted)
//   "log"   (line)
export class QuickTunnel extends EventEmitter {
  constructor({ bin, port, spawnImpl = spawn, args = null, startTimeoutMs = 45_000 } = {}) {
    super()
    this.bin = bin; this.port = port; this.spawnImpl = spawnImpl
    this.args = args || ["tunnel", "--no-autoupdate", "--url", `http://127.0.0.1:${port}`]
    this.startTimeoutMs = startTimeoutMs
    this.child = null; this.url = null; this.wanted = false; this.restarts = 0; this._timer = null
  }

  // Resolves with the first public URL, rejects if none appears in time (the process is then killed).
  start() {
    this.wanted = true
    return new Promise((resolve, reject) => {
      let settled = false
      const to = setTimeout(() => { if (!settled) { settled = true; this.stop(); reject(new Error("tunnel did not report a public URL in time")) } }, this.startTimeoutMs)
      const onUrl = (u) => { if (!settled) { settled = true; clearTimeout(to); resolve(u) } }
      const onFail = (e) => { if (!settled) { settled = true; clearTimeout(to); this.stop(); reject(e) } }
      this.once("url", onUrl)
      this._spawn(onFail)
    })
  }

  _spawn(onFirstFail = null) {
    let child
    try {
      child = this.spawnImpl(this.bin, this.args, { stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
    } catch (e) { if (onFirstFail) return onFirstFail(e); return this._scheduleRestart() }
    this.child = child
    let buf = "", lastLine = ""
    const scan = (d) => {
      buf += d.toString()
      let i
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1)
        this.emit("log", line)
        if (line.trim()) lastLine = line.trim()
        const m = TUNNEL_URL_RE.exec(line)
        if (m && m[0] !== this.url) { this.url = m[0]; this.restarts = 0; this.emit("url", this.url) }
      }
      if (buf.length > 8192) buf = buf.slice(-1024)
    }
    child.stdout && child.stdout.on("data", scan)
    child.stderr && child.stderr.on("data", scan)
    child.on("error", (e) => { if (onFirstFail && !this.url) { onFirstFail(e); onFirstFail = null } })
    child.on("exit", (code, signal) => {
      if (this.child === child) this.child = null
      this.emit("down", { code, signal })
      // exited before ever giving us a URL on the FIRST start → fail fast with cloudflared's own last words
      if (onFirstFail && !this.url) { const f = onFirstFail; onFirstFail = null; return f(new Error(`cloudflared exited (${code ?? signal}): ${lastLine.replace(/^\S+\s+(ERR|INF|WRN)\s*/, "").slice(0, 160) || "no output"}`)) }
      if (this.wanted) this._scheduleRestart()
    })
  }

  _scheduleRestart() {
    if (!this.wanted || this._timer) return
    const delay = Math.min(60_000, 2000 * 2 ** Math.min(this.restarts++, 5))
    this._timer = setTimeout(() => { this._timer = null; if (this.wanted) this._spawn() }, delay)
    this._timer.unref?.()
  }

  // Kills the process (TERM, then KILL after 2 s). Safe to call repeatedly.
  stop() {
    this.wanted = false
    if (this._timer) { clearTimeout(this._timer); this._timer = null }
    const c = this.child
    this.child = null
    this.url = null
    if (!c) return Promise.resolve()
    return new Promise((resolve) => {
      let done = false
      const fin = () => { if (!done) { done = true; resolve() } }
      c.once("exit", fin)
      try { c.kill("SIGTERM") } catch { fin() }
      setTimeout(() => { try { c.kill("SIGKILL") } catch {} ; fin() }, 2000).unref?.()
    })
  }

  // Synchronous best-effort kill for process exit paths.
  killNow() {
    this.wanted = false
    if (this._timer) { clearTimeout(this._timer); this._timer = null }
    if (this.child) { try { this.child.kill("SIGKILL") } catch {} ; this.child = null }
  }
}
