// harness/msv1_host_e2e.mjs — MSV1-HOST end-to-end, "PLAY WITH A FRIEND": the REAL desktop app (Electron)
// clicks the title-screen button, gets an invite link, a REAL browser opens it on the LAN, BOTH players pick
// their OWN fighter on their own screen, the host picks the stage, and they play a full lockstep match.
// Also: the invite page, a desktop friend via multiversesmash://join, a different build refused, Back / quit
// leave no open port and no tunnel process.
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
// Real select flow for ONE player on their own screen: the real character grid + a real mouse click on the
// card (same handler a player uses), then the real skin pick. Returns when that player is locked in.
async function pickFighter(page, universe, key) {
  const roster = await page.evaluate((u) => window.__harness.gotoCharacterSelect(u), universe)
  const idx = roster.indexOf(key)
  if (idx < 0) throw new Error(`${key} not in ${universe} roster`)
  const pt = await page.evaluate((i) => {
    const r = window.__harness.charCardRects()[i]; const c = document.querySelector("canvas"); const b = c.getBoundingClientRect()
    const sx = c.width / b.width, sy = c.height / b.height
    return { x: b.left + (r.x + r.w / 2) / sx, y: b.top + (r.y + r.h / 2) / sy }
  }, idx)
  await realClick(page, pt)
  await page.waitForFunction(() => window.__msOnline.state() === "selectSkin", null, { timeout: 20000 })
  await page.evaluate(() => window.__harness.pickSkin(0))
  await page.waitForFunction(() => window.__msOnline.friendInfo().locked, null, { timeout: 20000 })
}
// A real pointer click: move in from a nearby point first (a move to the SAME spot fires no mousemove, and the
// game reads the cursor position from mousemove).
async function realClick(page, pt) {
  await page.mouse.move(pt.x + 7, pt.y + 5); await sleep(40); await page.mouse.move(pt.x, pt.y, { steps: 3 }); await sleep(60)
  await page.mouse.click(pt.x, pt.y)
}
async function clickTitleButton(page, id) {
  const pt = await page.evaluate((id) => {
    const r = window.__msOnline.startButtons().find((b) => b.id === id); const c = document.querySelector("canvas"); const b = c.getBoundingClientRect()
    const sx = c.width / b.width, sy = c.height / b.height
    return r && { x: b.left + (r.x + r.w / 2) / sx, y: b.top + (r.y + r.h / 2) / sy }
  }, id)
  if (!pt) throw new Error(`no title button ${id}`)
  await realClick(page, pt)
}
try {
  // ── 1. cold start: one button on the title screen, nothing hosting until it's pressed ─────────────────
  console.log("\n── title screen: PLAY WITH A FRIEND ──")
  hostApp = await launchApp(`e2ehost-${tag}`)
  const hw = await appWindow(hostApp)
  hw.on("pageerror", (e) => console.log("  ⚠️ [host] pageerror:", e.message))
  await hw.waitForFunction(() => window.__msOnline.state() === "start", null, { timeout: 30000 })
  await sleep(800)
  ok("not hosting until the button is pressed", (await hostState(hw)).status === "offline")
  ok("title screen has exactly PLAY + PLAY WITH A FRIEND", JSON.stringify(await hw.evaluate(() => window.__msOnline.startButtons().map((b) => b.id))) === '["play","friend"]')
  ok("no hosting badge / floating buttons / first-run popup", await hw.locator("#ms-host .mh-badge, #ms-host .mh-btn-float, #ms-host .mh-modal").count() === 0)
  ok("ONLINE (LAN) removed from the main menu", !(await hw.evaluate(() => window.__harness.ui.mainMenuRects().map((r) => r.id))).includes("online"))
  await hw.screenshot({ path: path.join(SHOTS, "01_title_play_with_a_friend.png") })
  await clickTitleButton(hw, "friend")
  await hw.waitForSelector("#ms-host .mh-screen a.mh-link", { timeout: 30000 })
  const hs = await hostState(hw)
  const link = await hw.locator("#ms-host a.mh-link").innerText()
  const href = await hw.locator("#ms-host a.mh-link").getAttribute("href")
  ok("button → hosting starts + friend screen with ONE clickable invite link", hs.status === "online" && link === hs.lanLinks[0] && /^http:\/\/[\d.]+:\d+\/join\?room=[A-Z2-9]{6}$/.test(link), link)
  ok("link opens in the browser (new tab) as the copy-and-send page", href === `${link}#invite` && (await hw.locator("#ms-host a.mh-link").getAttribute("target")) === "_blank")
  await hw.waitForSelector("#ms-host .mh-screen >> text=Not on the same Wi-Fi", { timeout: 20000 }).catch(() => {})   // settle: the (stub) internet link arrives a moment later
  ok("friend screen: Copy link + Back, waiting for your friend", await hw.waitForSelector("#ms-host .mh-screen >> text=Waiting for your friend to join", { timeout: 5000 }).then(() => true, () => false) && await hw.locator("#ms-host .mh-screen button", { hasText: "Copy link" }).count() === 1 && await hw.locator("#ms-host .mh-screen button", { hasText: "Back" }).count() === 1)
  await hw.screenshot({ path: path.join(SHOTS, "02_friend_screen_link.png") })
  await hw.locator("#ms-host .mh-screen button", { hasText: "Copy link" }).click()
  ok("Copy link puts the invite link on the clipboard", (await hostApp.evaluate(({ clipboard }) => clipboard.readText())) === link)
  ok("public listener serves the game but no dev API", (await fetch(`http://127.0.0.1:${hs.port}/api/save`)).status === 404 && (await fetch(`http://127.0.0.1:${hs.port}/`)).status === 200)

  // ── 2. the invite page (what the host's browser shows after clicking the link) ────────────────────────
  console.log("\n── invite page in the browser ──")
  browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] })
  const ip = await browser.newPage({ viewport: { width: 900, height: 700 } })
  await ip.goto(href)
  await ip.waitForSelector("#invite:not([hidden])", { timeout: 8000 })
  ok("invite page: 'Your invite link is ready' + the link + Copy link", (await ip.locator("#lnk").innerText()) === link && await ip.locator("#copy").count() === 1)
  ok("address bar shows the plain link (ready to copy from the URL bar)", ip.url() === link, ip.url())
  await ip.screenshot({ path: path.join(SHOTS, "03_invite_page.png") })
  await ip.close()

  // ── 3. friend opens the link in a browser on the same Wi-Fi: ONE button ───────────────────────────────
  console.log("\n── friend joins from the link; each picks their own fighter ──")
  const vp = await hw.evaluate(() => ({ width: innerWidth, height: innerHeight }))   // lockstep needs equal arena sizes (see REPORT)
  const jp = await browser.newPage({ viewport: vp })
  jp.on("pageerror", (e) => console.log("  ⚠️ [browser] pageerror:", e.message))
  const joinPage = await jp.goto(link)
  ok("join page has ONE button: JOIN THE GAME", joinPage.status() === 200 && await jp.locator("a.btn, button").filter({ visible: true }).count() === 1 && (await jp.locator("#play").innerText()).trim() === "JOIN THE GAME")
  await jp.waitForFunction(() => /players connected/.test(document.getElementById("st").textContent), null, { timeout: 30000 })
  await jp.screenshot({ path: path.join(SHOTS, "04_join_page_one_button.png") })
  // JOIN THE GAME → the game (?room=) — the test adds harness hooks to that same URL
  ok("JOIN THE GAME goes straight into the game for this room", (await jp.locator("#play").getAttribute("href")) === `/?room=${hs.room}`)
  await jp.goto(`${new URL(link).origin}/?room=${hs.room}&harness=1&hostui=1`, { waitUntil: "domcontentloaded" })
  await jp.waitForFunction(() => window.__msOnline && window.__msOnline.state() === "selectUniverse", null, { timeout: 90000 })
  ok("friend lands on THEIR OWN fighter select (seat p2)", (await jp.evaluate(() => window.__harness.online.side())) === "p2")
  await hw.waitForFunction(() => window.__msOnline.state() === "selectUniverse", null, { timeout: 15000 })
  ok("host's screen moves to the host's own fighter select automatically", (await hw.evaluate(() => window.__harness.online.side())) === "p1")
  await jp.waitForFunction(() => document.readyState === "complete", null, { timeout: 240000 })
  await pickFighter(hw, "dragon_ball", "goku")
  ok("host locked in → waits for the friend's pick", await hw.waitForSelector("#ms-host .mh-screen >> text=Waiting for your friend to pick", { timeout: 3000 }).then(() => true, () => false))
  await hw.screenshot({ path: path.join(SHOTS, "05_host_locked_waiting.png") })
  await pickFighter(jp, "naruto", "sasuke")
  await jp.screenshot({ path: path.join(SHOTS, "06_friend_locked_waiting.png") })
  ok("friend sees what the host picked", await jp.waitForSelector("#ms-host .mh-screen >> text=Your friend picked Goku", { timeout: 3000 }).then(() => true, () => false))
  await hw.waitForFunction(() => window.__msOnline.state() === "selectStage", null, { timeout: 10000 })
  ok("both picked → host chooses the stage", true)
  await hw.screenshot({ path: path.join(SHOTS, "07_host_stage_select.png") })
  // the host clicks a real stage card (the pre-selected home stage of the host's fighter)
  const stPt = await hw.evaluate(() => {
    const cards = window.__msOnline.stageButtons(); const r = cards.find((c) => c.w > 0 && c.y >= 0) ; const c = document.querySelector("canvas"); const b = c.getBoundingClientRect()
    const sx = c.width / b.width, sy = c.height / b.height
    return { x: b.left + (r.x + r.w / 2) / sx, y: b.top + (r.y + r.h / 2) / sy, name: r.name }
  })
  await realClick(hw, stPt)
  await jp.waitForFunction(() => window.__harness.online.isActive(), null, { timeout: 15000 })
  const [s1, s2] = await Promise.all([hw.evaluate(() => window.__harness.online.seed()), jp.evaluate(() => window.__harness.online.seed())])
  ok("both start the SAME seed (MATCH_SETUP through the host relay)", s1 != null && s1 === s2, `${s1}/${s2}`)
  const chars = await Promise.all([hw, jp].map((p) => p.evaluate(() => window.__msOnline.matchup())))
  ok("each player got the fighter THEY picked (P1 Goku, P2 Sasuke) on both screens", JSON.stringify(chars[0]) === '["goku","sasuke"]' && JSON.stringify(chars[1]) === '["goku","sasuke"]', JSON.stringify(chars))
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
  const hp = [...H.values()].at(-1)
  const first = [...H.values()][0]
  const hurt = first && [...H.values()].some((v) => v.p1h < first.p1h || v.p2h < first.p2h)
  ok("damage actually happened (a real fight, not idle)", !!hurt, hp && `start p1h=${first.p1h} p2h=${first.p2h}; min p1h=${Math.min(...[...H.values()].map((v) => v.p1h))}`)
  await hw.screenshot({ path: path.join(SHOTS, "08_match_end_host.png") })
  await jp.screenshot({ path: path.join(SHOTS, "09_match_end_browser.png") })
  // PLAY AGAIN: the friend presses R (rematch) on the result screen → BOTH go back to picking their own fighter
  await jp.waitForFunction(() => window.__msOnline.state() === "victory", null, { timeout: 30000 })
  await hw.waitForFunction(() => window.__msOnline.state() === "victory", null, { timeout: 30000 })
  await sleep(1500)
  await jp.keyboard.press("r")
  await jp.waitForFunction(() => window.__msOnline.state() === "selectUniverse", null, { timeout: 10000 })
  await hw.waitForFunction(() => window.__msOnline.state() === "selectUniverse", null, { timeout: 10000 })
  ok("play again (R on the result screen) → both players back on their own fighter select", true)
  await pickFighter(hw, "naruto", "sasuke")
  await pickFighter(jp, "dragon_ball", "goku")
  await hw.waitForFunction(() => window.__msOnline.state() === "selectStage", null, { timeout: 10000 })
  const stPt2 = await hw.evaluate(() => {
    const r = window.__msOnline.stageButtons().find((c) => c.w > 0 && c.y >= 0); const c = document.querySelector("canvas"); const b = c.getBoundingClientRect()
    const sx = c.width / b.width, sy = c.height / b.height
    return { x: b.left + (r.x + r.w / 2) / sx, y: b.top + (r.y + r.h / 2) / sy }
  })
  await realClick(hw, stPt2)
  await jp.waitForFunction(() => window.__harness.online.isActive() && window.__msOnline.inMatch(), null, { timeout: 15000 }).catch(async () => {
    const d = await Promise.all([hw, jp].map((p) => p.evaluate(() => ({ st: window.__msOnline.state(), status: window.__msOnline.status(), err: window.__msOnline.error(), fi: window.__msOnline.friendInfo(), mu: window.__msOnline.matchup(), active: window.__harness.online.isActive() }))))
    throw new Error("second match did not start: " + JSON.stringify(d) + " click=" + JSON.stringify(stPt2))
  })
  const m2 = await Promise.all([hw, jp].map((p) => p.evaluate(() => window.__msOnline.matchup())))
  ok("second match: the NEW picks on both screens (P1 Sasuke, P2 Goku)", JSON.stringify(m2[0]) === '["sasuke","goku"]' && JSON.stringify(m2[1]) === '["sasuke","goku"]', JSON.stringify(m2))
  await hw.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle())
  await jp.evaluate(() => window.__harness.skipToBattle && window.__harness.skipToBattle())
  const H2 = new Map(), J2 = new Map(); const t2 = Date.now()
  while (Date.now() - t2 < 60000) {
    await jp.keyboard.press(keys[ki++ % keys.length]).catch(() => {})
    const [a, b] = await Promise.all([probe(hw), probe(jp)])
    if (a.s) H2.set(a.s.frame, a.s)
    if (b.s) J2.set(b.s.frame, b.s)
    if (Math.max(0, ...H2.keys()) > 600) break
    await sleep(25)
  }
  let sh2 = 0, mm2 = 0, mx2 = 0
  for (const [f, a] of H2) { const b = J2.get(f); if (!b) continue; sh2++; mx2 = Math.max(mx2, f); if (JSON.stringify(a) !== JSON.stringify(b)) mm2++ }
  ok("second match runs in lockstep on a fresh session (bit-identical)", sh2 > 10 && mm2 === 0 && mx2 > 300, `frames≈${mx2}, mismatched ${mm2}/${sh2}`)
  await jp.close()
  await until(hw, async () => !(await window.msDesktop.getState()).players.some((p) => p.side === "p2"), null, 10000)
  ok("friend leaving frees the seat; host goes back to the invite screen", await hw.waitForSelector("#ms-host .mh-screen a.mh-link", { timeout: 10000 }).then(() => true, () => false))

  // ── 4. a DESKTOP friend via multiversesmash://join (second-instance handoff) ─────────────────────────
  console.log("\n── desktop friend: multiversesmash://join ──")
  friendApp = await launchApp(`e2efriend-${tag}`, { MS_HOST_TUNNEL: "off" })
  const fw2 = await appWindow(friendApp)
  const proto = `multiversesmash://join?link=${encodeURIComponent(hs.lanLinks[0])}&room=${hs.room}`
  const second = spawn(ELECTRON, [EDIR, proto], { env: { ...baseEnv, MS_PROFILE: `e2efriend-${tag}` }, stdio: "ignore" })
  const code2 = await new Promise((r) => { const t = setTimeout(() => { second.kill(); r("timeout") }, 20000); second.on("exit", (c) => { clearTimeout(t); r(c) }) })
  ok("second launch hands the URL to the running app and exits (single instance)", code2 === 0, `exit ${code2}`)
  await fw2.waitForFunction(() => window.__msOnline.state() === "selectUniverse", null, { timeout: 40000 }).catch(async (e) => {
    const d = await fw2.evaluate(() => ({ state: window.__msOnline.state(), status: window.__msOnline.status(), error: window.__msOnline.error(), ui: document.querySelector("#ms-host") && document.querySelector("#ms-host").innerText.slice(0, 300) }))
    const hsNow = await hostState(hw)
    throw new Error(`desktop friend did not reach fighter select: ${JSON.stringify(d)} host=${JSON.stringify({ status: hsNow.status, room: hsNow.room, players: hsNow.players })} hostGame=${await hw.evaluate(() => window.__msOnline.state())}`)
  })
  ok("desktop friend joined via multiversesmash://join and picks their own fighter (p2)", (await fw2.evaluate(() => window.__harness.online.side())) === "p2")
  await friendApp.close(); friendApp = null
  await until(hw, async () => !(await window.msDesktop.getState()).players.some((p) => p.side === "p2"), null, 10000)

  // ── 5. version mismatch is refused, clearly, and never starts a match ───────────────────────────────
  console.log("\n── version mismatch ──")
  friendApp = await launchApp(`e2eold-${tag}`, { MS_HOST_TUNNEL: "off", MS_TEST_CODE_OVERRIDE: "0123456789" })
  const ow = await appWindow(friendApp)
  const proto2 = `multiversesmash://join?link=${encodeURIComponent(hs.lanLinks[0])}&room=${hs.room}`
  const third = spawn(ELECTRON, [EDIR, proto2], { env: { ...baseEnv, MS_PROFILE: `e2eold-${tag}` }, stdio: "ignore" })
  await new Promise((r) => { const t = setTimeout(() => { third.kill(); r() }, 20000); third.on("exit", () => { clearTimeout(t); r() }) })
  await ow.waitForSelector("#ms-host .mh-modal >> text=Different game version", { timeout: 15000 })
  ok("different build: clear message + 'Download matching version' button", await ow.locator("#ms-host .mh-modal button", { hasText: "Download matching version" }).count() === 1)
  await ow.screenshot({ path: path.join(SHOTS, "10_version_mismatch.png") })
  await ow.evaluate((u) => window.__msOnline.join(u), `ws://127.0.0.1:${hs.port}/ws?room=${hs.room}`)
  await until(ow, () => /mismatch/i.test(window.__msOnline.error() || "") || !!document.querySelector("#ms-host .mh-modal"), null, 15000)
  ok("relay rejects the mismatched build (handshake)", /mismatch/i.test(await ow.evaluate(() => window.__msOnline.error() || "")) || (await ow.locator("#ms-host .mh-modal >> text=Different game version").count()) >= 1)
  ok("mismatch never seats the player / never starts a match", !(await hostState(hw)).players.some((p) => p.side === "p2") && !(await ow.evaluate(() => window.__msOnline.inMatch())))
  await friendApp.close(); friendApp = null

  // ── 6. leaving stops hosting; quit leaves nothing behind ─────────────────────────────────────────────
  console.log("\n── leave / back / quit cleanup ──")
  const pids = fs.readFileSync(path.join(tmp, "pids"), "utf8").trim().split("\n").map(Number)
  await hw.evaluate(() => window.__msOnline.toTitle())
  await until(hw, async () => (await window.msDesktop.getState()).status === "offline", null, 10000)
  await sleep(500)
  ok("back on the title screen → hosting stops by itself, port closed", !listening(hs.port), `port ${hs.port}`)
  ok("…and the tunnel process is killed", pids.every((p) => !alive(p)))
  await hw.waitForFunction(() => !document.querySelector("#ms-host .mh-screen"), null, { timeout: 5000 })
  await clickTitleButton(hw, "friend")
  await hw.waitForSelector("#ms-host .mh-screen a.mh-link", { timeout: 30000 })
  const hs2 = await hostState(hw)
  ok("pressing PLAY WITH A FRIEND again → a new room + link", hs2.status === "online" && hs2.room !== hs.room, hs2.room)
  await hw.locator("#ms-host .mh-screen button", { hasText: "Back" }).click()
  await until(hw, async () => (await window.msDesktop.getState()).status === "offline", null, 10000)
  await sleep(500)
  ok("Back → hosting stops, port closed, title screen", !listening(hs2.port) && (await hw.evaluate(() => window.__msOnline.state())) === "start")
  await hw.waitForFunction(() => !document.querySelector("#ms-host .mh-screen"), null, { timeout: 5000 })
  await clickTitleButton(hw, "friend")
  await hw.waitForSelector("#ms-host .mh-screen a.mh-link", { timeout: 30000 })
  const hs3 = await hostState(hw)
  const pids3 = fs.readFileSync(path.join(tmp, "pids"), "utf8").trim().split("\n").map(Number)
  await hostApp.close(); hostApp = null
  await sleep(800)
  ok("quitting the app closes the public port", !listening(hs3.port))
  ok("quitting leaves no cloudflared process", pids3.every((p) => !alive(p)))
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
