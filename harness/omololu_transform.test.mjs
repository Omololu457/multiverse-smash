// harness/omololu_transform.test.mjs — Omololu "Transformation Jutsu" (Down+Ult): transform into a live copy
// of the CURRENT opponent, gain their FULL kit for a window, revert on KO / real hit / timeout (ghostface_exe
// model) with a recognition tint. Verifies it copies the SPECIFIC opponent each time (not a fixed set), the
// copied kit is usable, and both revert paths work — across 3 different opponents.
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
import { characters } from "../characters.js"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
const ok = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const frames = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 30000, polling: 16 }).catch(() => {}) }
const tf = () => page.evaluate(() => window.__harness.omololu.transform.state("p1"))

async function boot(opp) {
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=${opp}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await frames(3)
}

try {
  // ── copies the SPECIFIC live opponent each time (3 different opponents) ──
  for (const opp of ["sasuke", "goku", "ichigo"]) {
    console.log(`\n── vs ${opp} ─────────────────────────────`)
    await boot(opp)
    const res = await page.evaluate(() => window.__harness.omololu.transform.trigger("p1"))
    await frames(4)
    const st = await tf()
    const expUlt = characters[opp]?.ultimate?.name || null
    ok(`vs ${opp}: transform activates`, res?.active === true && st.active === true, `active=${st.active}`)
    ok(`vs ${opp}: rosterKey becomes '${opp}' (copies THIS opponent)`, st.rosterKey === opp && st.target === opp, `rosterKey=${st.rosterKey} target=${st.target}`)
    ok(`vs ${opp}: gains ${opp}'s ACTUAL ultimate ('${expUlt}')`, !!expUlt && st.ultName === expUlt, `got '${st.ultName}' expected '${expUlt}'`)
    ok(`vs ${opp}: sprite still decodes (no keying box)`, await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true))
    ok(`vs ${opp}: recognition tint applied (disguised omololu)`, st.tint === "#8a5cf6", `tint=${st.tint}`)
    // the copied kit is USABLE — fire a special, confirm a move/cast fires off the copied specials
    await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.resetFighterInput?.("p1") }); await frames(2)
    const cast = await page.evaluate(() => { const r = window.__harness.p1SpecialDir("N"); return r })
    await frames(3)
    ok(`vs ${opp}: copied kit is usable (a special fires)`, !!(cast && (cast.move || cast.cast)), JSON.stringify(cast))
    await page.screenshot({ path: path.join(OUT, `OMOLOLU_transform_${opp}.png`) })
    await page.evaluate(() => window.__harness.omololu.transform.revert("p1", "cleanup"))
  }

  // ── prove it is the SPECIFIC opponent, not a fixed set: the 3 copied ults differ ──
  console.log("\n── specificity ─────────────────────────────")
  const ults = ["sasuke", "goku", "ichigo"].map(k => characters[k]?.ultimate?.name)
  ok("the 3 opponents' copied ultimates are all DIFFERENT (not a fixed borrowed set)", new Set(ults).size === 3, ults.join(" / "))

  // ── REVERT ON REAL HIT (ghostface_exe model) ──
  console.log("\n── revert conditions ─────────────────────────────")
  await boot("sasuke")
  await page.evaluate(() => window.__harness.omololu.transform.trigger("p1")); await frames(3)
  ok("transformed (pre-hit)", (await tf()).active === true)
  await page.evaluate(() => window.__harness.setP1Hitstun(24)); await frames(3)
  const afterHit = await tf()
  ok("a REAL hit reverts the transform", afterHit.active === false && afterHit.reason === "hit" && afterHit.rosterKey === "omololu", `active=${afterHit.active} reason=${afterHit.reason} key=${afterHit.rosterKey}`)

  // ── REVERT ON TIMEOUT ──
  await boot("goku")
  await page.evaluate(() => window.__harness.omololu.transform.trigger("p1")); await frames(3)
  const t0 = (await tf()).timer
  ok("transformed (pre-timeout), timer counting down", (await tf()).active === true && t0 > 0, `timer=${t0}`)
  await frames(920)   // > OMO_TF_WINDOW (900f / 15s)
  const afterTimeout = await tf()
  ok("the window times out → reverts to omololu", afterTimeout.active === false && afterTimeout.reason === "expire" && afterTimeout.rosterKey === "omololu", `active=${afterTimeout.active} reason=${afterTimeout.reason} key=${afterTimeout.rosterKey}`)

  ok("no JS errors across the run", jsErrors.length === 0, jsErrors[0] || "")
  console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`)
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++
} finally {
  await browser.close(); server.close()
  process.exit(FAIL ? 1 : 0)
}
