// PLAY_MAX.mjs — "use this whole computer" launcher. Windows / macOS / Linux. Needs only Node + a browser.
//   Double-click PLAY_MAX.bat (Windows) / PLAY_MAX.command (Mac) / play_max.sh (Linux), or:
//   node PLAY_MAX.mjs                 → scan hardware, start the game server, open the game tuned for this PC
//   node PLAY_MAX.mjs --fullscreen    → same, but borderless fullscreen (kiosk). Alt+F4 / Cmd+Q to quit.
//   node PLAY_MAX.mjs --tier=max      → force a tier (low|medium|high|ultra|max) instead of auto-benchmarking
//   node PLAY_MAX.mjs --scan          → only print + save the hardware scan
//   node PLAY_MAX.mjs --no-browser    → start the server and print the URL (open it yourself)
//
// What it does (all safe, nothing is installed or changed on the PC):
//   1. Scans CPU / RAM / GPU / displays (tools/hwscan.mjs) → hw_profile.local.json
//   2. Starts the local game server (tools/serve.mjs) on a free port
//   3. Opens Chrome / Edge / Brave / Chromium in an app window with GPU-friendly flags and a PRIVATE
//      profile folder (.msmash-browser-profile) so the flags apply even if that browser is already open.
//      The game then benchmarks itself (≈3 s, first run only) and picks Low/Medium/High/Ultra/MAX.
//   Flags used are standard Chromium switches. Deliberately NOT used: --disable-gpu-vsync /
//   --disable-frame-rate-limit (those make the GPU spin flat-out for no visible gain).
import net from "node:net"; import fs from "node:fs"; import path from "node:path"; import os from "node:os"
import { spawn, exec } from "node:child_process"; import { fileURLToPath } from "node:url"

const REPO = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const has = f => argv.includes(f)
const opt = k => (argv.find(a => a.startsWith(k + "=")) || "").split("=")[1] || ""
const TIERS = ["low", "medium", "high", "ultra", "max"]

const major = +process.versions.node.split(".")[0]
if (major < 16) { console.log(`\nNode ${process.version} is too old — install the LTS version from https://nodejs.org and try again.\n`); process.exit(1) }

const { scanHardware, compactProfile, printProfile, PROFILE_PATH } = await import("./tools/hwscan.mjs")
console.log("\n  MULTIVERSE SMASH — MAX PERFORMANCE LAUNCHER\n  Scanning hardware…")
const prof = await scanHardware()
try { fs.writeFileSync(PROFILE_PATH, JSON.stringify(prof, null, 2)) } catch (_) {}
console.log(printProfile(prof))
if (has("--scan")) { console.log(`\n  saved → ${PROFILE_PATH}\n`); process.exit(0) }

// ── server ──
const free = p => new Promise(r => { const s = net.createServer().once("error", () => r(false)).once("listening", () => s.close(() => r(true))).listen(p) })
let port = 8000; while (!(await free(port))) port++
process.env.PORT = String(port)
await import("./tools/serve.mjs")

const tierArg = opt("--tier").toLowerCase()
const mode = TIERS.includes(tierArg) ? tierArg : "auto"
const q = new URLSearchParams({ hwperf: mode, hwp: JSON.stringify(compactProfile(prof)) })
if (has("--rebench")) q.set("hwbench", "1")
if (has("--hud")) q.set("hwhud", "1")
const url = `http://localhost:${port}/index.html?${q.toString()}`

// ── browser ──
function findBrowser() {
  const C = []
  if (process.platform === "win32") {
    const roots = [process.env["PROGRAMFILES"], process.env["PROGRAMFILES(X86)"], process.env["LOCALAPPDATA"]].filter(Boolean)
    for (const r of roots) C.push(
      path.join(r, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(r, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(r, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      path.join(r, "Chromium", "Application", "chrome.exe"))
  } else if (process.platform === "darwin") {
    for (const base of ["/Applications", path.join(os.homedir(), "Applications")]) C.push(
      `${base}/Google Chrome.app/Contents/MacOS/Google Chrome`,
      `${base}/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
      `${base}/Brave Browser.app/Contents/MacOS/Brave Browser`,
      `${base}/Chromium.app/Contents/MacOS/Chromium`)
  } else {
    for (const d of (process.env.PATH || "").split(":")) for (const n of ["google-chrome-stable", "google-chrome", "microsoft-edge", "microsoft-edge-stable", "brave-browser", "chromium", "chromium-browser"]) C.push(path.join(d, n))
  }
  return C.find(p => { try { return fs.statSync(p).isFile() } catch (_) { return false } }) || null
}
const browser = findBrowser()
const profileDir = path.join(REPO, ".msmash-browser-profile")
const flags = [
  `--user-data-dir=${profileDir}`,
  "--no-first-run", "--no-default-browser-check", "--disable-features=Translate",
  "--ignore-gpu-blocklist",                 // use the GPU even if this driver is on Chrome's cautious list
  "--enable-gpu-rasterization", "--enable-zero-copy",
  "--force_high_performance_gpu",           // laptops with two GPUs: prefer the strong one (macOS honours this)
  "--disable-background-timer-throttling",  // keep timers accurate while playing (rendering still sleeps when hidden)
  "--autoplay-policy=no-user-gesture-required",
  has("--fullscreen") ? "--kiosk" : "--start-maximized",
  `--app=${url}`,
]

console.log(`\n▶ Game server: http://localhost:${port}/index.html  (mode: ${mode.toUpperCase()})`)
if (has("--no-browser") || process.env.NO_OPEN) {
  console.log(`  Open this in Chrome or Edge:\n  ${url}\n`)
} else if (browser) {
  console.log(`  Opening ${path.basename(browser).replace(/\.exe$/i, "")} with performance flags${has("--fullscreen") ? " (fullscreen — Alt+F4 / Cmd+Q to quit)" : ""}…`)
  const t0 = Date.now()
  const child = spawn(browser, flags, { stdio: "ignore", detached: process.platform !== "win32" })
  child.on("error", e => { console.log("  Could not start the browser:", e.message, "\n  Open this URL yourself:\n  " + url) })
  child.on("exit", () => {
    if (Date.now() - t0 > 8000) { console.log("\n  Game window closed — shutting the server down. Bye!\n"); process.exit(0) }
    // Exited at once = handed off to an already-running window of this profile; keep serving.
  })
} else {
  console.log("  Chrome / Edge not found — opening your default browser instead (works, just without the GPU flags).")
  const cmd = process.platform === "darwin" ? `open "${url}"` : process.platform === "win32" ? `start "" "${url}"` : `xdg-open "${url}"`
  exec(cmd)
}
console.log(`\n  Keep this window open while playing. Close it (or press Ctrl+C) to stop the game server.`)
console.log(`  In game: Shift+F7 = Performance panel · F7 = FPS graph · F = fullscreen\n`)
