// harness/controls_lab_links.test.mjs — the MAIN GAME side of the Controls Lab, plus a main-game render check:
//   • the main menu lists CONTROLS LAB; selecting it (controller) opens controls.html and the Lab boots
//   • the Academy grid keeps working and has a CONTROLS LAB button the pad can reach; it opens controls.html
//   • render check: boot → start a match → both fighters + HUD render, the fighters animate, no new errors
// Screenshots → docs/controls_lab/screenshots/
import fs from "node:fs"; import path from "node:path"
import { ROOT, startServer, launch, watchErrors, checker, gameBaselineErrors, newErrors } from "./controls_lab_common.mjs"

const SHOTS = path.join(ROOT, "docs", "controls_lab", "screenshots"); fs.mkdirSync(SHOTS, { recursive: true })
const { server, base } = await startServer()
const browser = await launch()
const baseline = await gameBaselineErrors(browser, base)
const C = checker(), check = C.check
const errsAll = []

async function home() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), page = await ctx.newPage()
  errsAll.push(watchErrors(page))
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=zoro`)
  await page.waitForFunction(() => !!window.__harness?.padNav, null, { timeout: 30000 })
  return page
}
const st = page => page.evaluate(() => window.__harness.padMenuState())
const nav = (page, o) => page.evaluate(o => window.__harness.padNav(o), o)
async function seek(page, id, moves) { for (const m of moves) { if ((await st(page)).selId === id) return true; await nav(page, { [m]: true }) } return (await st(page)).selId === id }

try {
  // ── main menu → CONTROLS LAB ──
  let page = await home()
  await nav(page, { confirm: true })
  check("title → MAIN MENU", (await st(page)).gameState === "mainMenu")
  const ids = await page.evaluate(() => { const s = window.__harness.padMenuState(); return s.ids || null })
  const found = await seek(page, "controlsLab", Array(16).fill("down"))
  check("main menu has a CONTROLS LAB entry the pad can select", found, `selId=${(await st(page)).selId}${ids ? ` ids=${ids}` : ""}`)
  await page.screenshot({ path: path.join(SHOTS, "main_menu_link.png") })
  await Promise.all([page.waitForURL(/controls\.html/, { timeout: 15000 }).catch(() => {}), nav(page, { confirm: true })])
  check("selecting it opens controls.html", /controls\.html/.test(page.url()), page.url())
  await page.waitForFunction(() => window.__lab?.eng.ready, null, { timeout: 60000 }).catch(() => {})
  check("…and the Lab boots", await page.evaluate(() => !!window.__lab?.eng.ready).catch(() => false))
  await page.click("#backToGame")
  await page.waitForURL(/index\.html/, { timeout: 15000 }).catch(() => {})
  check("Lab's BACK TO GAME returns to the game", /index\.html/.test(page.url()), page.url())
  await page.context().close()

  // ── Academy → CONTROLS LAB button ──
  page = await home()
  await nav(page, { confirm: true })
  await seek(page, "academy", Array(16).fill("down"))
  await nav(page, { confirm: true })
  check("ACADEMY still opens", (await st(page)).gameState === "academy", (await st(page)).gameState)
  const reach = await seek(page, "controlsLab", [...Array(40).fill("down"), ...Array(6).fill("right")])
  check("Academy grid has a CONTROLS LAB button the pad can reach", reach, `selId=${(await st(page)).selId}`)
  await page.screenshot({ path: path.join(SHOTS, "academy_link.png") })
  await Promise.all([page.waitForURL(/controls\.html/, { timeout: 15000 }).catch(() => {}), nav(page, { confirm: true })])
  check("Academy button opens controls.html", /controls\.html/.test(page.url()), page.url())
  await page.context().close()

  // ── main game render check: boot, pick fighters, start a match, fighters + HUD render ──
  page = await home()
  await page.evaluate(() => window.__harness.boot())
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 15000 })
  const f0 = await page.evaluate(() => window.__harness.state().frame)
  const idx = new Set()
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(34); const p = await page.evaluate(() => window.__harness.p1()); idx.add(p.spriteFrameIndex) }
  const f1 = await page.evaluate(() => window.__harness.state().frame)
  const r = await page.evaluate(() => {
    const cv = document.querySelector("canvas"), x = cv.getContext("2d"), d = x.getImageData(0, 0, cv.width, cv.height).data
    let lit = 0, colors = new Set(); for (let i = 0; i < d.length; i += 4 * 97) { if (d[i] + d[i + 1] + d[i + 2] > 30) lit++; colors.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)) }
    const h = window.__harness; return { lit, colors: colors.size, p1: h.p1()?.health, p2: h.p2()?.health, p1n: h.p1()?.name, p2n: h.p2()?.name, sprites: !!h.p1()?.spriteReady && !!h.p2()?.spriteReady }
  })
  check("match runs (logic frames advance)", f1 - f0 > 30, `${f1 - f0} frames`)
  check("both fighters present with health + sprites ready", r.p1 > 0 && r.p2 > 0 && r.sprites, JSON.stringify(r))
  check("arena + HUD render (canvas full of varied colour)", r.lit > 1000 && r.colors > 40, `lit=${r.lit} colours=${r.colors}`)
  check("fighter animates in the match", idx.size >= 2, [...idx].join(","))
  await page.screenshot({ path: path.join(SHOTS, "main_game_match.png") })
  await page.context().close()
} catch (e) { check("harness ran without throwing", false, e.stack || String(e)) }
await browser.close(); server.close()
const added = newErrors(errsAll.flat(), baseline)
check("zero console errors / failed requests beyond the game's own pre-existing ones", !added.length, added.slice(0, 6).join(" || "))
console.log(`\ncontrols_lab_links: ${C.pass} passed, ${C.fail} failed`)
process.exit(C.fail ? 1 : 0)
