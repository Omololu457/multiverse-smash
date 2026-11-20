// harness/msv1_host_e2e.mjs — MSV1-HOST end-to-end: the REAL desktop app (Electron) hosts, a REAL browser
// joins by the link, they play a full lockstep match; a second desktop instance joins by pasted link and by
// multiversesmash://join (second-instance handoff); a different build is refused; Stop Hosting / quit leave
// no open port and no tunnel process.
//   node harness/msv1_host_e2e.mjs            (opens real app windows on this machine)
// Internet routes are stubbed (fake cloudflared prints a URL; UPnP off) so nothing is exposed publicly; the
// browser joins over the LAN/loopback link exactly as a same-network friend would.
import { randomBytes, randomInt } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawn, execFileSync } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { chromium, _electron } from "playwright"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const EDIR = path.join(ROOT, "electron")
const ELECTRON = createRequire(path.join(EDIR, "package.json"))("electron")
const SHOTS = path.join(ROOT, "docs", "msv1", "host", "screenshots")
fs.mkdirSync(SHOTS, { recursive: true })
let pass = 0, fail = 0
const ok = (n, c, d = "") => { if (c) { pass++; console.log(`  ✅ ${n}${d ? "  — " + d : ""}`) } else { fail++; console.log(`  ❌ ${n}${d ? "  — " + d : ""}`) } }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const tag = randomBytes(4).toString("hex").slice(0, 6)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mse2e-"))

// stub cloudflared: prints a (fake, unreachable) trycloudflare URL so the panel's "Online" path is exercised
const stub = path.join(tmp, "cloudflared")
fs.writeFileSync(stub, `#!${process.execPath}\nrequire('fs').appendFileSync(${JSON.stringify(path.join(tmp, "pids"))},process.pid+'\\n');setTimeout(()=>console.error('INF |  https://e2e-stub-${tag}.trycloudflare.com  |'),200);setInterval(()=>{},1e6)\n`, { mode: 0o755 })
const baseEnv = { ...process.env, MS_CLOUDFLARED: stub, MS_CLOUDFLARED_DOWNLOAD: "off", MS_HOST_UPNP: "off", MS_WINDOWED: "1", LAN_PORT: String(20000 + randomInt(20000)) }
const profiles = []
function launchApp(profile, extraEnv = {}, query = "harness=1&hostui=1") {
  profiles.push(profile)
  return _electron.launch({ executablePath: ELECTRON, args: [EDIR], env: { ...baseEnv, MS_PROFILE: profile, MS_URL_QUERY: query, ...extraEnv }, timeout: 60000 })
}
async function appWindow(app) {
  if (process.env.E2E_DEBUG) { app.process().stdout.on("data", (d) => process.stdout.write("    [main] " + d)); app.process().stderr.on("data", (d) => process.stdout.write("    [main!] " + d)) }
  const w = await app.firstWindow()
  if (process.env.E2E_DEBUG) { w.on("pageerror", (e) => console.log("    [pageerror]", e.message)); w.on("close", () => console.log("    [window closed]")) }
  await w.waitForFunction(() => window.msDesktop && window.__msOnline && window.__harness, null, { timeout: 60000 })
  return w
}
const hostState = (w) => w.evaluate(() => window.msDesktop.getState())
// Poll an (async) page predicate from node — page.waitForFunction treats a returned Promise as truthy.
async function until(w, fn, arg, ms = 15000, what = "condition") {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { try { if (await w.evaluate(fn, arg)) return true } catch {} ; await sleep(150) }
  throw new Error(`timed out waiting for ${what}`)
}
const listening = (port) => { try { return execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"]).toString().trim().length > 0 } catch { return false } }
const alive = (pid) => { try { process.kill(pid, 0); return true } catch { return false } }

let hostApp, friendApp, browser
try {
  // ── 1. cold start: the app launches and AUTOMATICALLY hosts ─────────────────────────────────────────
  console.log("\n── desktop app auto-hosts ──")
  hostApp = await launchApp(`e2ehost-${tag}`)
  const hw = await appWindow(hostApp)
  await until(hw, async () => { const s = await window.msDesktop.getState(); return s.status === "online" && s.route === "tunnel" }, null, 30000)
  const hs = await hostState(hw)
  ok("hosting started automatically on launch (no clicks)", hs.status === "online", `route=${hs.route} port=${hs.port}`)
  ok("panel data: 6-char room code + join link + LAN link", /^[A-Z2-9]{6}$/.test(hs.room) && hs.publicLink === `https://e2e-stub-${tag}.trycloudflare.com/join?room=${hs.room}` && hs.lanLinks.length > 0, `${hs.room} ${hs.publicLink}`)
  ok("first-run notice shown (one time)", await hw.locator("#ms-host .mh-modal").filter({ hasText: "Hosting lets friends join you" }).count() === 1)
  await hw.screenshot({ path: path.join(SHOTS, "01_first_run_notice.png") })
  await hw.locator("#ms-host .mh-modal button", { hasText: "Got it" }).click()
  ok("hosting badge visible in the menu", (await hw.locator("#ms-host .mh-badge").innerText()).includes(`Hosting online · ${hs.room}`))
  await hw.locator("#ms-host .mh-badge").click()
  ok("panel: Copy Link, Stop Hosting, auto-host setting, join box", await hw.locator("#ms-host .mh-card button", { hasText: "Copy Link" }).count() >= 1 && await hw.locator("#ms-host .mh-card button", { hasText: "Stop Hosting" }).count() === 1 && await hw.locator("#mh-auto").isChecked())
  await hw.screenshot({ path: path.join(SHOTS, "02_hosting_panel.png") })
  await hw.locator("#ms-host .mh-card button", { hasText: "Copy Link" }).first().click()
  ok("Copy Link puts the join link on the clipboard", (await hostApp.evaluate(({ clipboard }) => clipboard.readText())) === hs.publicLink)
  await hw.locator("#ms-host .mh-badge").click()   // close panel
  ok("public listener serves the game but no dev API", (await fetch(`http://127.0.0.1:${hs.port}/api/save`)).status === 404 && (await fetch(`http://127.0.0.1:${hs.port}/`)).status === 200)
  const portClash = hs.port !== 8790 ? `8790 busy → ${hs.port}` : "8790"
  ok("host port chosen without crashing", !!hs.port, portClash)

  // ── 2. a friend joins in the BROWSER by opening the link ─────────────────────────────────────────────
  console.log("\n── browser friend joins by link + full match ──")
  browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] })
  const lanOrigin = new URL(hs.lanLinks[0]).origin
  // The game's arena size follows the window (canvas = innerWidth × innerHeight), and the existing lockstep
  // assumes both peers use the same size (net_online uses two identical 1280×720 pages). Match the host.
  const vp = await hw.evaluate(() => ({ width: innerWidth, height: innerHeight }))
  const jp = await browser.newPage({ viewport: vp })
  jp.on("pageerror", (e) => console.log("  ⚠️ [browser] pageerror:", e.message))
  const joinPage = await jp.goto(`${lanOrigin}/join?room=${hs.room}`)
  ok("join page loads from the host (LAN link)", joinPage.status() === 200 && await jp.locator("#play").count() === 1)
  await jp.waitForFunction(() => /players connected/.test(document.getElementById("st").textContent), null, { timeout: 8000 })
  await jp.screenshot({ path: path.join(SHOTS, "03_join_page.png") })
  const playHref = await jp.locator("#play").getAttribute("href")
  const deskHref = await jp.locator("#desk").getAttribute("href")
  ok("join page: Play in browser + Open in desktop app links", playHref === `/?room=${hs.room}` && deskHref.startsWith("multiversesmash://join?link="), deskHref.slice(0, 60))
  await jp.goto(`${lanOrigin}/?room=${hs.room}&harness=1&hostui=1`, { waitUntil: "domcontentloaded" })
  await jp.mouse.click(640, 360)
  await jp.waitForFunction(() => window.__msOnline && window.__msOnline.status() === "joined", null, { timeout: 60000 })
  ok("browser friend auto-joined the room from the link (seat p2)", (await jp.evaluate(() => window.__harness.online.side())) === "p2")
  await jp.waitForFunction(() => document.readyState === "complete", null, { timeout: 240000 })   // let the friend finish loading assets first
  await until(hw, async () => (await window.msDesktop.getState()).players.some((p) => p.side === "p2"), null, 10000)
  ok("host panel shows the friend connected", true)
  await hw.waitForSelector("#ms-host .mh-toast", { timeout: 5000 })
  await hw.screenshot({ path: path.join(SHOTS, "04_friend_joined_toast.png") })
  await hw.locator("#ms-host .mh-toast button", { hasText: "Set up the match" }).click()
  await hw.waitForFunction(() => window.__msOnline.status() === "ready", null, { timeout: 10000 })
  ok("host (P1, same window) connected into its room; opponent present", (await hw.evaluate(() => window.__harness.online.side())) === "p1")
  await sleep(4500)   // heartbeat measures ping every 2 s
  const st = await hostState(hw)
  ok("panel lists both players with ping", st.players.length === 2 && st.players.every((p) => p.pingMs != null), st.players.map((p) => `${p.side}:${p.pingMs}ms`).join(" "))
  await hw.evaluate(() => window.__harness.online.hostStartMatch("goku", "sasuke", null))
  await jp.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 10000 })
  const [s1, s2] = await Promise.all([hw.evaluate(() => window.__harness.online.seed()), jp.evaluate(() => window.__harness.online.seed())])
  ok("both start the SAME seed (MATCH_SETUP through the host relay)", s1 != null && s1 === s2, `${s1}/${s2}`)
  await hw.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle())
  await jp.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle())
  // Play: the friend (P2) attacks; sample both sims and compare on shared frames until the match ends.
  const probe = (p) => p.evaluate(() => ({ s: window.__harness.online.syncProbe(), g: window.__msOnline.state(), a: window.__msOnline.inMatch() }))
  const H = new Map(), J = new Map()
  const t0 = Date.now()
  let endedH = false, endedJ = false
  const keys = ["j", "k", "l", "j", "j", "k"]
  let ki = 0
  while (Date.now() - t0 < 900000 && !(endedH && endedJ)) {
    await jp.keyboard.press(keys[ki++ % keys.length]).catch(() => {})
    if (ki % 4 === 0) { await jp.keyboard.down("a"); await sleep(350); await jp.keyboard.up("a") }   // walk in (keymap: a = left)
    const [a, b] = await Promise.all([probe(hw), probe(jp)])
    if (a.s) H.set(a.s.frame, a.s)
    if (b.s) J.set(b.s.frame, b.s)
    if (["victory", "matchEnd"].includes(a.g)) endedH = true
    if (["victory", "matchEnd"].includes(b.g)) endedJ = true
    await sleep(25)
  }
  let shared = 0, mism = 0, maxF = 0
  for (const [f, a] of H) { const b = J.get(f); if (!b) continue; shared++; maxF = Math.max(maxF, f); if (JSON.stringify(a) !== JSON.stringify(b)) mism++ }
  ok("match played through the host relay to the END on both sides", endedH && endedJ, `${Math.round((Date.now() - t0) / 1000)}s, lastFrame≈${maxF}`)
  ok("sims bit-identical on every shared frame", shared > 20 && mism === 0, `mismatched ${mism}/${shared}`)
  const hp = [...H.values()].at(-1), jpv = [...J.values()].at(-1)
  const first = [...H.values()][0]
  const hurt = [...H.values()].some((v) => v.p1h < first.p1h || v.p2h < first.p2h)
  ok("damage actually happened (a real fight, not idle)", !!(first && hurt), hp && `start p1h=${first.p1h} p2h=${first.p2h}; min p1h=${Math.min(...[...H.values()].map((v) => v.p1h))}`)
  await hw.screenshot({ path: path.join(SHOTS, "05_match_end_host.png") })
  await jp.screenshot({ path: path.join(SHOTS, "06_match_end_browser.png") })
  await jp.close()
  await until(hw, async () => !(await window.msDesktop.getState()).players.some((p) => p.side === "p2"), null, 10000)
  ok("friend leaving frees the seat (panel updates)", true)

  // ── 3. a second DESKTOP instance joins by pasted link, then by multiversesmash://join ───────────────
  console.log("\n── desktop friend: pasted link + protocol URL ──")
  friendApp = await launchApp(`e2efriend-${tag}`, { MS_HOST_TUNNEL: "off" })
  const fw = await appWindow(friendApp)
  await fw.locator("#ms-host .mh-modal button", { hasText: "Got it" }).click({ timeout: 15000 }).catch(() => {})
  await fw.locator("#ms-host .mh-badge").click()
  await fw.locator("#ms-host .mh-card input[aria-label='Join link']").fill(hs.room)
  await fw.locator("#ms-host .mh-card button", { hasText: "Join" }).click()
  ok("bare room code → asks for the full link", (await fw.locator("#ms-host .mh-toast").innerText()).includes("Paste your friend's full join link"))
  await fw.locator("#ms-host .mh-badge").click().catch(() => {})
  if (!(await fw.locator("#ms-host .mh-card").count())) await fw.locator("#ms-host .mh-badge").click()
  await fw.locator("#ms-host .mh-card input[aria-label='Join link']").fill(hs.lanLinks[0])
  await fw.screenshot({ path: path.join(SHOTS, "07_desktop_join_box.png") })
  await fw.locator("#ms-host .mh-card button", { hasText: "Join" }).click()
  await fw.waitForFunction(() => window.__msOnline.status() === "joined", null, { timeout: 20000 })
  ok("desktop friend joined by PASTED LINK (seat p2)", (await fw.evaluate(() => window.__harness.online.side())) === "p2")
  await friendApp.close(); friendApp = null
  await until(hw, async () => !(await window.msDesktop.getState()).players.some((p) => p.side === "p2"), null, 10000)

  friendApp = await launchApp(`e2efriend-${tag}`, { MS_HOST_TUNNEL: "off" })
  const fw2 = await appWindow(friendApp)
  const proto = `multiversesmash://join?link=${encodeURIComponent(hs.lanLinks[0])}&room=${hs.room}`
  // second launch with the URL on argv (Windows/Linux delivery; dev-mode on macOS) → hands off + exits
  const second = spawn(ELECTRON, [EDIR, proto], { env: { ...baseEnv, MS_PROFILE: `e2efriend-${tag}` }, stdio: "ignore" })
  const code2 = await new Promise((r) => { const t = setTimeout(() => { second.kill(); r("timeout") }, 20000); second.on("exit", (c) => { clearTimeout(t); r(c) }) })
  ok("second launch hands the URL to the running app and exits (single instance)", code2 === 0, `exit ${code2}`)
  await fw2.waitForFunction(() => window.__msOnline.status() === "joined", null, { timeout: 20000 })
  ok("desktop friend joined via multiversesmash://join", (await fw2.evaluate(() => window.__harness.online.side())) === "p2")
  await friendApp.close(); friendApp = null
  await until(hw, async () => !(await window.msDesktop.getState()).players.some((p) => p.side === "p2"), null, 10000)

  // ── 4. version mismatch is refused, clearly, and never starts a match ───────────────────────────────
  console.log("\n── version mismatch ──")
  friendApp = await launchApp(`e2eold-${tag}`, { MS_HOST_TUNNEL: "off", MS_TEST_CODE_OVERRIDE: "0123456789" })
  const ow = await appWindow(friendApp)
  await ow.locator("#ms-host .mh-modal button", { hasText: "Got it" }).click({ timeout: 15000 }).catch(() => {})
  await ow.locator("#ms-host .mh-badge").click()
  await ow.locator("#ms-host .mh-card input[aria-label='Join link']").fill(hs.lanLinks[0])
  await ow.locator("#ms-host .mh-card button", { hasText: "Join" }).click()
  await ow.waitForSelector("#ms-host .mh-modal >> text=Different game version", { timeout: 15000 })
  ok("different build: clear message + 'Download matching version' button", await ow.locator("#ms-host .mh-modal button", { hasText: "Download matching version" }).count() === 1)
  await ow.screenshot({ path: path.join(SHOTS, "08_version_mismatch.png") })
  // and the relay itself refuses even if the pre-check were bypassed
  await ow.evaluate((u) => window.__msOnline.join(u), `ws://127.0.0.1:${hs.port}/ws?room=${hs.room}`)
  await ow.waitForFunction(() => window.__msOnline.status() === "error", null, { timeout: 15000 })
  ok("relay rejects the mismatched build (handshake)", /mismatch/i.test(await ow.evaluate(() => window.__msOnline.error())))
  ok("mismatch never seats the player / never starts a match", !(await hostState(hw)).players.some((p) => p.side === "p2") && !(await ow.evaluate(() => window.__msOnline.inMatch())))
  await friendApp.close(); friendApp = null

  // ── 5. Stop Hosting / Start Hosting / quit ───────────────────────────────────────────────────────────
  console.log("\n── stop / quit cleanup ──")
  const pids = fs.readFileSync(path.join(tmp, "pids"), "utf8").trim().split("\n").map(Number)
  ok("hosting badge hidden on fight/result screens", !(await hw.locator("#ms-host .mh-badge").isVisible()), await hw.evaluate(() => window.__msOnline.state()))
  await hw.evaluate(() => window.__harness.online.openMenu())   // back to a menu, as a player would
  await hw.waitForSelector("#ms-host .mh-badge", { state: "visible", timeout: 5000 })
  await hw.locator("#ms-host .mh-badge").click()
  await hw.locator("#ms-host .mh-card button", { hasText: "Stop Hosting" }).click()
  await until(hw, async () => (await window.msDesktop.getState()).status === "offline", null, 10000)
  await sleep(500)
  ok("Stop Hosting closes the public port", !listening(hs.port), `port ${hs.port}`)
  ok("Stop Hosting kills the tunnel process", pids.every((p) => !alive(p)))
  ok("badge shows Hosting off", (await hw.locator("#ms-host .mh-badge").innerText()).includes("Hosting off"))
  await hw.locator("#ms-host .mh-card button", { hasText: "Start Hosting" }).click()
  await until(hw, async () => (await window.msDesktop.getState()).status === "online", null, 20000)
  const hs2 = await hostState(hw)
  ok("Start Hosting again → new room", hs2.room && hs2.room !== hs.room, hs2.room)
  await hw.locator("#mh-auto").uncheck()
  ok("auto-host setting saved (Off)", (await hw.evaluate(() => window.msDesktop.getSettings())).autoHost === false)
  const pids2 = fs.readFileSync(path.join(tmp, "pids"), "utf8").trim().split("\n").map(Number)
  await hostApp.close(); hostApp = null
  await sleep(800)
  ok("quitting the app closes the public port", !listening(hs2.port))
  ok("quitting leaves no cloudflared process", pids2.every((p) => !alive(p)))
  // relaunch: auto-host is Off now → not hosting
  hostApp = await launchApp(`e2ehost-${tag}`)
  const hw3 = await appWindow(hostApp)
  await sleep(1500)
  ok("auto-host Off is remembered across launches", (await hostState(hw3)).status === "offline")
  ok("first-run notice is NOT shown again", await hw3.locator("#ms-host .mh-modal").count() === 0)
  await hostApp.close(); hostApp = null
} catch (e) {
  ok("no unexpected error", false, e.stack || e.message)
} finally {
  for (const a of [hostApp, friendApp]) { if (a) await a.close().catch(() => {}) }
  if (browser) await browser.close().catch(() => {})
  for (const p of profiles) fs.rmSync(path.join(os.homedir(), "Library", "Application Support", `multiverse-smash-desktop-${p}`), { recursive: true, force: true })
  try { for (const pid of fs.readFileSync(path.join(tmp, "pids"), "utf8").trim().split("\n").map(Number)) if (alive(pid)) process.kill(pid, "SIGKILL") } catch {}
  fs.rmSync(tmp, { recursive: true, force: true })
}
console.log(`\nMSV1-HOST E2E: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
