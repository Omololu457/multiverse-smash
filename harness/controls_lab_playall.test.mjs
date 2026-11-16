// harness/controls_lab_playall.test.mjs — CONTROLS LAB "▶ Play all" + "⛶ Big view":
//   P1 Play all demos the moves one after another without clicks (the counter advances, the selected card follows)
//   P2 the button turns into Stop; Stop ends it   P3 Big view widens the arena (and survives a reload)   + no errors
//   node harness/controls_lab_playall.test.mjs [char=enoch]
import fs from "node:fs"
import { startServer, launch, openLab, checker, gameBaselineErrors, newErrors } from "./controls_lab_common.mjs"
const CHAR = process.argv[2] || "enoch"
const { server, base } = await startServer(); const browser = await launch(); const C = checker(), check = C.check
const baseline = await gameBaselineErrors(browser, base)
const { page, errs } = await openLab(browser, base, CHAR, { viewport: { width: 1440, height: 900 } })
await page.evaluate(() => window.__lab.api?.setMode ? window.__lab.api.setMode("moves") : null)
const w0 = await page.evaluate(() => document.querySelector("#arenaBox").getBoundingClientRect().width)
await page.click('[data-act="playall"]')
const seen = new Set()
for (let i = 0; i < 40; i++) { await page.waitForTimeout(500); const s = await page.evaluate(() => ({ i: window.__lab.S.playAll?.i, sel: window.__lab.S.selMove?.name, btn: document.querySelector('[data-act="playall"]')?.textContent })); if (s.sel) seen.add(s.sel); if (i === 8) fs.mkdirSync("docs/controls_lab", { recursive: true }) }
const st = await page.evaluate(() => ({ i: window.__lab.S.playAll?.i, n: window.__lab.S.playAll?.n, btn: document.querySelector('[data-act="playall"]')?.textContent }))
check("P1 Play all runs the moves back to back on its own (several moves played in 20 s)", seen.size >= 5 && st.i >= 4, JSON.stringify({ played: [...seen], st }))
check("P2 the button reads Stop (n / total) while playing", /Stop \(\d+ \/ \d+\)/.test(st.btn || ""), st.btn)
await page.screenshot({ path: "docs/controls_lab/playall.png" })
await page.click('[data-act="playall"]'); await page.waitForTimeout(400)
const stopped = await page.evaluate(() => ({ pa: window.__lab.S.playAll, btn: document.querySelector('[data-act="playall"]')?.textContent }))
check("P2b Stop ends it", !stopped.pa && /Play all/.test(stopped.btn), JSON.stringify(stopped))
await page.click("#bigBtn"); await page.waitForTimeout(400)
const w1 = await page.evaluate(() => document.querySelector("#arenaBox").getBoundingClientRect().width)
check("P3 Big view makes the arena bigger", w1 > w0 * 1.15, `${Math.round(w0)} → ${Math.round(w1)}`)
await page.screenshot({ path: "docs/controls_lab/bigview.png" })
const zoom = await page.evaluate(() => ({ on: window.__lab.S.zoom, K: window.__lab.S.view?.K, k: window.__lab.S.arenaScale, btn: document.querySelector("#zoomBtn").textContent }))
check("P4 Zoom is on by default and magnifies the fighters (follows them)", zoom.on && zoom.K > zoom.k * 1.5 && /ON/.test(zoom.btn), JSON.stringify(zoom))
await page.click("#zoomBtn"); await page.waitForTimeout(300)
const z2 = await page.evaluate(() => ({ on: window.__lab.S.zoom, K: window.__lab.S.view?.K, k: window.__lab.S.arenaScale })); await page.click("#zoomBtn")
check("P4b Zoom toggles off (whole stage) and back", !z2.on && Math.abs(z2.K - z2.k) < 1e-6, JSON.stringify(z2))
await page.reload(); await page.waitForFunction(() => window.__lab?.eng.ready && !document.querySelector("#app.booting"), null, { timeout: 120000 })
check("P3b Big view is remembered", await page.evaluate(() => document.querySelector("#app").classList.contains("big")))
await page.evaluate(() => { try { localStorage.removeItem("ms_controls_lab_big"); localStorage.removeItem("ms_controls_lab_zoom") } catch (_) {} })
{ const added = newErrors(errs, baseline); check("no errors added by the Lab (the main game's own pre-existing 404s excluded)", added.length === 0, added.slice(0, 3).join(" | ")) }
await browser.close(); server.close()
console.log(`\ncontrols_lab_playall: ${C.pass} passed, ${C.fail} failed`); process.exit(C.fail ? 1 : 0)
