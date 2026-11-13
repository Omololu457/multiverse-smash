// harness/buggy_skins_check.mjs — Buggy alt-colour skins: every skin applies, its sheets are the recoloured ones,
// the skin SURVIVES his part-detach mask swaps (masked body rows) + the detached hand is drawn from the skin's art,
// and a round reset keeps it. Screenshots each skin mid-move. 0 page errors / 0 recolor 404s.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SH = path.join(ROOT, "brutality_work", "shots", "buggy_skins"); fs.mkdirSync(SH, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".wav": "audio/wav" }
const miss = []
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { if (u.includes("__")) miss.push(u); rs.writeHead(404); rs.end(); return } rs.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d) }) }); s.listen(0, () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(String(e)))
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m) } else { fail++; console.log("  ✗", m) } }
const st = () => page.evaluate(() => window.__harness.state())
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 8 }).catch(() => {}) }
try {
  await page.goto(`${base}/index.html?harness=1&p1=buggy&p2=zoro`, { waitUntil: "load" })
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 })
  await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {}); await wf(4)
  const skins = await page.evaluate(() => window.__harness.skinList?.("buggy") ?? null)
  const IDS = ["buggy_crimson", "buggy_crossguild", "buggy_shanks", "buggy_mihawk", "buggy_crocodile", "buggy_gold", "buggy_ben10", "buggy_albedo", "buggyAlienX"]
  for (const id of IDS) {
    const tag = id === "buggyAlienX" ? "alienx" : id.slice(6)
    console.log(`\n── ${id} ──`)
    await page.evaluate(() => window.__harness.buggyTest.reset()); await wf(2)
    const applied = await page.evaluate(i => window.__harness.setSkin("p1", i), id)
    await wf(3)
    let s = await page.evaluate(() => window.__harness.buggyTest.state("p1"))
    ok(applied === id && s.idleSheet?.endsWith(`idle__${tag}.png`), `applied → idle sheet ${s.idleSheet}`)
    // detach the hand → masked body row (mask bit 2) must keep the skin; the flying hand must use the skin sheet
    await page.evaluate(() => window.__harness.buggyTest.hand("p1")); await wf(10)
    s = await page.evaluate(() => window.__harness.buggyTest.state("p1"))
    const hand = await page.evaluate(() => { const f = window.__harness.buggyTest.raw("p1"); return { tag: f._recolorTag, mask: f._buggy?.mask | 0 } })
    ok(s.idleSourceY > 0 && s.idleSheet?.endsWith(`idle__${tag}.png`), `hand out → masked row (sourceY ${s.idleSourceY}, mask ${hand.mask}) still skinned`)
    ok(s.parts.some(p => p.type === "buggy_hand"), `hand drone live (tag ${hand.tag})`)
    await page.screenshot({ path: path.join(SH, `${id}.png`) })
  }
  // round reset keeps the skin
  await page.evaluate(() => window.__harness.buggyTest.reset()); await page.evaluate(() => window.__harness.buggyTest.recall("p1")); await wf(40)
  const after = await page.evaluate(() => { const f = window.__harness.buggyTest.raw("p1"); return (f._skinAnim || f.animationData).idle.sheet })
  ok(after.endsWith("idle__alienx.png"), `after reset/recall the skin is kept (${after})`)
  // default skin byte-identical behaviour: default → _skinAnim base sheets
  await page.evaluate(() => window.__harness.setSkin("p1", "default")); await wf(3)
  const def = await page.evaluate(() => window.__harness.buggyTest.state("p1").idleSheet)
  ok(def === "./assets/buggy/idle.png", `default skin → base sheets (${def})`)
} catch (e) { console.error("EXCEPTION", e); fail++ }
ok(miss.length === 0, `0 recolor 404s (${miss.slice(0, 3).join(", ")})`)
ok(errs.length === 0, `0 page errors (${errs.slice(0, 2).join(" | ")})`)
console.log(`\nRESULT: ${pass}/${pass + fail} passed, ${fail} failed  · shots → ${SH}`)
await browser.close(); server.close(); process.exit(fail ? 1 : 0)
