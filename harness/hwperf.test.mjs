// harness/hwperf.test.mjs — HWPERF (hardware scan / auto quality / governor / Performance panel).
//   node harness/hwperf.test.mjs            (HWPERF_HEADED=1 to watch; HWPERF_CHANNEL=chrome for the real GPU)
// Proves: default mode is OFF and changes nothing · every tier loads with no page errors and keeps the LOGICAL
// canvas size · the sim is bit-identical at tier OFF vs MAX (same seed) · the governor steps DOWN when frames
// are artificially slowed · the benchmark completes · the panel + FPS graph render (screenshots → SHOTS dir).
import { chromium } from "playwright"
import { spawn } from "node:child_process"
import path from "node:path"; import fs from "node:fs"; import net from "node:net"; import os from "node:os"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SHOTS = process.env.HWPERF_SHOTS || path.join(os.tmpdir(), "hwperf_shots")
fs.mkdirSync(SHOTS, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`) }
const section = t => console.log(`\n── ${t} ─────────────────────────`)
const free = p => new Promise(r => { const s = net.createServer().once("error", () => r(false)).once("listening", () => s.close(() => r(true))).listen(p) })
let port = 8790; while (!(await free(port))) port++
const srv = spawn(process.execPath, [path.join(ROOT, "tools", "serve.mjs")], { env: { ...process.env, PORT: String(port) }, stdio: "ignore" })
await new Promise(r => setTimeout(r, 900))
const base = `http://localhost:${port}/index.html`

const browser = await chromium.launch({ headless: !process.env.HWPERF_HEADED, channel: process.env.HWPERF_CHANNEL || undefined,
  args: ["--autoplay-policy=no-user-gesture-required", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] })
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 })
const page = await ctxB.newPage()
const errors = []
page.on("pageerror", e => { errors.push(e.message); console.log("  ⚠️  pageerror:", e.message) })
const T = 120000
const wait = ms => page.waitForTimeout(ms)
const st = () => page.evaluate(() => window.__hwperf.status())

try {
  section("default load (no params) = OFF, no change")
  await page.goto(`${base}?harness=1`, { waitUntil: "load", timeout: T })
  await page.waitForFunction(() => window.__hwperf && window.__harness && window.__harness.aiVsAi, null, { timeout: T })
  let s = await st()
  check("hwperf loaded, mode OFF by default", s.mode === "off", s.mode)
  check("no render hooks installed when OFF", s.hooks === false)
  const logical0 = await page.evaluate(() => [document.getElementById("gameCanvas").width, document.getElementById("gameCanvas").height, innerWidth, innerHeight])
  check("logical canvas = window size (unchanged behaviour)", logical0[0] === logical0[2] && logical0[1] === logical0[3], JSON.stringify(logical0))

  section("sim is untouched: same seed → identical state at OFF and MAX")
  const snapRun = (seed) => page.evaluate((sd) => {
    window.__harness.rng.forceSeed(sd)
    window.__harness.aiVsAi.start({ p1: "netero", p2: "beerus", matches: 1, speed: 1 })
    window.__harness.aiVsAi.step(1200)
    const sn = w => { const p = window.__harness[w](); return { x: +p.x.toFixed(4), y: +p.y.toFixed(4), health: p.health, energy: +(p.energy || 0).toFixed(4) } }
    return { p1: sn("p1"), p2: sn("p2"), w: document.getElementById("gameCanvas").width, h: document.getElementById("gameCanvas").height }
  }, seed)
  const off = await snapRun(5150)
  await page.evaluate(() => window.__hwperf.setMode("max")); await wait(600)
  const max = await snapRun(5150)
  check("fighter state identical OFF vs MAX after 1200 frames", JSON.stringify(off) === JSON.stringify(max), `off=${JSON.stringify(off)} max=${JSON.stringify(max)}`)

  section("every tier: loads clean, logical size kept, backing scaled")
  await page.evaluate(() => window.__hwperf.setGovernor(false))   // check each tier at its NOMINAL scale (the slow test VM would trip the governor)
  const want = await page.evaluate(() => Object.fromEntries(["low", "medium", "high", "ultra", "max"].map(t => [t, window.__hwperf.tierScale(t)])))
  for (const t of ["low", "medium", "high", "ultra", "max"]) {
    await page.evaluate(m => window.__hwperf.setMode(m), t)
    await page.evaluate(() => window.__harness.aiVsAi.start({ p1: "gojo_shinjuku", p2: "sukuna", matches: 1, speed: 1 }))
    await wait(2500)
    s = await st()
    const lg = await page.evaluate(() => [document.getElementById("gameCanvas").width, document.getElementById("gameCanvas").height, innerWidth, innerHeight])
    const errs = errors.length
    check(`${t}: logical ${lg[0]}×${lg[1]} kept · backing ${s.backing.join("×")} (${(+s.scale).toFixed(2)}×, want ${want[t]}×) · fps ${s.fps.toFixed(0)}`, lg[0] >= 640 && s.logical[0] === lg[0] && Math.abs(s.scale - want[t]) < 0.02 && errs === 0, errs ? errors.slice(-1)[0] : "")
    if (t === "max" || t === "low") await page.screenshot({ path: path.join(SHOTS, `fight_${t}.png`) })
  }

  section("governor steps DOWN when frames are artificially slowed")
  await page.evaluate(() => { window.__hwperf.setGovernor(true); window.__hwperf.setMode("max"); window.__hwperf._debugSlow(45) })
  let dropped = false
  for (let i = 0; i < 30 && !dropped; i++) { await wait(1000); s = await st(); dropped = s.gov.drop >= 1 }
  check("governor dropped at least one level under load", dropped, `drop=${s.gov.drop} fps=${s.fps.toFixed(1)} log=${JSON.stringify(s.gov.log.slice(0, 2))}`)
  const dropAt = s.gov.drop
  await page.evaluate(() => window.__hwperf._debugSlow(0)); await wait(4000)
  s = await st()
  check("does not bounce straight back up (slow recovery)", s.gov.drop >= dropAt, `drop=${s.gov.drop}`)

  section("benchmark + panel + HUD")
  await page.evaluate(() => window.__hwperf.setMode("auto"))
  const t0 = Date.now()
  const bench = await page.evaluate(() => window.__hwperf.runBenchmark({ seconds: 2.2 }))
  check("benchmark completes and recommends a tier", bench && ["low", "medium", "high", "ultra", "max"].includes(bench.tier), JSON.stringify(bench))
  console.log(`     (benchmark wall time ${((Date.now() - t0) / 1000).toFixed(1)} s)`)
  await page.evaluate(() => { window.__hwperf.setHud(true); window.__hwperf.openPanel() }); await wait(1500)
  await page.screenshot({ path: path.join(SHOTS, "panel.png") })
  const panelOk = await page.evaluate(() => { const p = document.getElementById("hwp-panel"); return !!p && p.style.display === "block" && /DETECTED|Detected/.test(p.innerText) })
  check("Performance panel opens", panelOk)
  await page.evaluate(() => window.__hwperf.closePanel()); await wait(1200)
  await page.screenshot({ path: path.join(SHOTS, "hud.png") })
  const hudOk = await page.evaluate(() => document.getElementById("hwp-hud").style.display === "block")
  check("FPS graph visible", hudOk)
  await page.keyboard.press("F7"); await wait(300)
  check("F7 toggles the FPS graph", await page.evaluate(() => document.getElementById("hwp-hud").style.display === "none"))
  await page.keyboard.press("Shift+F7"); await wait(400)
  check("Shift+F7 opens the panel", await page.evaluate(() => document.getElementById("hwp-panel").style.display === "block"))
  await page.evaluate(() => { window.__hwperf.setGovernor(false); const sel = document.querySelector('#hwp-panel select[data-k="scale"]'); sel.value = "1.5"; sel.dispatchEvent(new Event("change", { bubbles: true })) }); await wait(800)
  s = await st()
  check("panel knob → Custom mode at 1.5×", s.mode === "custom" && Math.abs(s.scale - 1.5) < 0.02, `mode=${s.mode} scale=${s.scale}`)
  await page.screenshot({ path: path.join(SHOTS, "panel_custom.png") })
  await page.keyboard.press("Escape"); await wait(200)
  check("Escape closes the panel", await page.evaluate(() => document.getElementById("hwp-panel").style.display === "none"))
  await page.evaluate(() => window.__hwperf.screenshot(true)); await wait(3000)
  s = await st()
  check("4K photo restores the previous scale afterwards", Math.abs(s.scale - 1.5) < 0.02, `scale=${s.scale}`)
  await page.evaluate(() => window.__hwperf.setGovernor(true))

  section("OFF restores the player's own settings")
  await page.evaluate(() => window.__hwperf.setMode("off")); await wait(400)
  s = await st()
  const lg2 = await page.evaluate(() => { const c = document.getElementById("gameCanvas"); return [c.width, window.__hwperf.status().backing[0]] })
  check("OFF → backing back to logical size", lg2[0] === lg2[1], JSON.stringify(lg2))
  check("no page errors during the whole run", errors.length === 0, errors.slice(0, 3).join(" | "))
} catch (e) {
  check("ran to completion", false, e.message)
} finally {
  await browser.close(); srv.kill()
}
console.log(`\n══════════════════════════════\n  HWPERF: ${PASS} passed, ${FAIL} failed\n══════════════════════════════`)
process.exit(FAIL ? 1 : 0)
