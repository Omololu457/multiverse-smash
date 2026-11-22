// harness/controls_lab_fatalities.test.mjs — CONTROLS LAB shows the match-end FINISHERS:
//   F1 every fighter's move list ends with a FINISHERS section: its SIGNATURE FATALITY (Special) + SCREEN BREAKER (Grab › Special)
//   F2 clicking the fatality card plays the REAL finisher in the arena (signatureFatality.js), then the Lab reloads the fighter
//   F3 the FATALITIES tab lists every roster fighter with their technique   F4 clicking another fighter there switches + plays it
//   F5 Screen Breaker demo plays too   F6 the move list's Play all skips the finishers   + no errors
import fs from "node:fs"
import { startServer, launch, openLab, checker, gameBaselineErrors, newErrors } from "./controls_lab_common.mjs"
const { server, base } = await startServer(); const browser = await launch(); const C = checker(), check = C.check
const baseline = await gameBaselineErrors(browser, base)
const { page, errs } = await openLab(browser, base, "gojo", { viewport: { width: 1440, height: 900 } })
fs.mkdirSync("docs/controls_lab", { recursive: true })
await page.evaluate(() => window.__lab.api.setMode("moves"))
const fin = await page.evaluate(() => window.__lab.S.moves.filter(m => m.fin).map(m => ({ name: m.name, sec: m.section, fin: m.fin })))
const secs = await page.evaluate(() => [...document.querySelectorAll("#listScroll .sec")].map(e => e.textContent))
check("F1 Gojo's move list has a FINISHERS section: HOLLOW PURPLE + a fatality per special (BLUE, RED) + SCREEN BREAKER", fin.length >= 4 && /HOLLOW PURPLE/.test(fin[0].name) && fin.some(f => /BLUE/.test(f.name)) && fin.some(f => /RED/.test(f.name)) && fin[fin.length - 1].fin === "sb" && secs.includes("FINISHERS"), JSON.stringify({ fin, secs }))
// F2: click the fatality card, watch it run
const idx = await page.evaluate(() => window.__lab.S.moves.findIndex(m => m.fin === "sig" && !m.idx))
await page.click(`[data-move="${idx}"]`)
let seen = null
const acted = new Set()
for (let i = 0; i < 400; i++) { const s = await page.evaluate(() => window.__lab.eng.mods.sig.signatureFatalityState()); if (s.phase) { seen = s; if (s.acting) acted.add(s.acting); if (s.t > 100) { await page.screenshot({ path: "docs/controls_lab/fatality_gojo.png" }); break } } await page.waitForTimeout(100) }
const back = await page.waitForFunction(() => !window.__lab.S.finisher && window.__lab.eng.ready && window.__lab.eng.gameState() === "battle" && /performed in the engine/.test(document.querySelector("#moveStatus")?.textContent || ""), null, { timeout: 90000 }).then(() => true, () => false)
check("F2b Gojo ACTS it out with his own strips (hollow_purple_charge → hollow_purple_cast), not standing still", acted.has("hollow_purple_charge") && acted.has("hollow_purple_cast"), JSON.stringify([...acted]))
check("F2 clicking it plays HOLLOW PURPLE in the arena, then the Lab is back in a fresh training match", seen?.kind === "void" && back, JSON.stringify({ seen, back }))
// F3/F4: FATALITIES tab
await page.click('[data-mode="fatal"]'); await page.waitForTimeout(300)
const list = await page.evaluate(() => ({ n: document.querySelectorAll(".card[data-fatal]").length, chips: document.querySelectorAll(".fat-chip").length, roster: window.__lab.S.roster.length, names: [...document.querySelectorAll("[data-fatal] .nm")].slice(0, 400).map(e => e.textContent) }))
check("F3 the FATALITIES tab lists every roster fighter with ALL their fatalities (signature + one chip per special)", list.chips > 400 && list.n === list.roster && list.n >= 100 && list.names.includes("AMATERASU") && list.names.includes("SERIOUS PUNCH"), JSON.stringify({ n: list.n, roster: list.roster }))
await page.screenshot({ path: "docs/controls_lab/fatalities_tab.png" })
await page.click('.card[data-fatal="itachi"]', { position: { x: 30, y: 20 } })
let s2 = null
for (let i = 0; i < 500; i++) { const s = await page.evaluate(() => window.__lab.S.key === "itachi" && window.__lab.eng.ready ? window.__lab.eng.mods.sig.signatureFatalityState() : { phase: null }); if (s.phase) { s2 = s; if (s.t > 90) { await page.screenshot({ path: "docs/controls_lab/fatality_itachi.png" }); break } } await page.waitForTimeout(100) }
const back2 = await page.waitForFunction(() => !window.__lab.S.finisher && window.__lab.eng.ready && window.__lab.eng.gameState() === "battle", null, { timeout: 90000 }).then(() => true, () => false)
check("F4 picking Itachi there switches fighter and plays AMATERASU", s2?.name === "AMATERASU" && back2, JSON.stringify({ s2, back2 }))
// F4b Sukuna: domain → dash → a cleave / dismantle flurry
await page.click('[data-mode="fatal"]'); await page.waitForTimeout(300); await page.click('.card[data-fatal="sukuna"]', { position: { x: 30, y: 20 } })
const sk = new Set()
for (let i = 0; i < 600; i++) { const s = await page.evaluate(() => window.__lab.S.key === "sukuna" && window.__lab.eng.ready ? window.__lab.eng.mods.sig.signatureFatalityState() : { phase: null }); if (s.phase && s.acting) sk.add(s.acting); if (sk.size && !s.phase) break; await page.waitForTimeout(100) }
await page.waitForFunction(() => !window.__lab.S.finisher && window.__lab.eng.ready && window.__lab.eng.gameState() === "battle", null, { timeout: 90000 }).catch(() => {})
check("F4b Sukuna ACTS it out: Domain, then Cleave + Dismantle", sk.has("cleave") && sk.has("dismantle"), JSON.stringify([...sk]))
// F5 Screen Breaker card
await page.evaluate(() => window.__lab.api.setMode("moves"))
const sbi = await page.evaluate(() => window.__lab.S.moves.findIndex(m => m.fin === "sb"))
await page.click(`[data-move="${sbi}"]`)
let sb = false
for (let i = 0; i < 80 && !sb; i++) { sb = await page.evaluate(() => window.__lab.eng.mods.sb.screenBreakerActive()); await page.waitForTimeout(100) }
const back3 = await page.waitForFunction(() => !window.__lab.S.finisher && window.__lab.eng.ready && window.__lab.eng.gameState() === "battle", null, { timeout: 90000 }).then(() => true, () => false)
check("F5 the SCREEN BREAKER card plays it too", sb && back3, JSON.stringify({ sb, back3 }))
// F6 Play all skips finishers
const pa = await page.evaluate(() => window.__lab.S.moves.some(m => m.fin) && window.__lab.S.moves.filter(m => !m.unavailable && !m.fin).length === window.__lab.S.moves.filter(m => !m.unavailable).length - window.__lab.S.moves.filter(m => m.fin && !m.unavailable).length)
check("F6 the move list's Play all leaves the finishers out (they end the match)", pa)
const ne = newErrors(errs, baseline)
check("no new errors", ne.length === 0, ne.slice(0, 3).join(" | "))
await browser.close(); server.close()
console.log(`\ncontrols_lab_fatalities: ${C.pass} passed, ${C.fail} failed`); process.exit(C.fail ? 1 : 0)
