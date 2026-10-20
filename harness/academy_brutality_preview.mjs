// harness/academy_brutality_preview.mjs — ACADEMY brutality PREVIEW (press B).
// Opens the Academy for tobirama, starts a practice drill, previews each finisher over the dummy, and verifies
// the dummy is REVIVED + the drill resumes (never the victory screen) each time. Render/flow layer.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SHOTS = path.join(ROOT, "brutality_work", "shots"); fs.mkdirSync(SHOTS, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".m4a": "audio/mp4", ".ogg": "audio/ogg" }
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(String(e)))
let PASS = 0, FAIL = 0; const ok = (c, m) => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${m}`) }
const st = () => page.evaluate(() => window.__harness.state())
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.academy); await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())

  console.log("\n── open Academy → tobirama → practice drill ──")
  const open = await page.evaluate(() => window.__harness.academy.openChar("tobirama"))
  ok(open.key === "tobirama", `openChar tobirama  [${open.key}]`)
  const drill = await page.evaluate(() => window.__harness.academy.drill(0, "free"))
  ok(drill && drill.p1 === "tobirama", `practice drill live: p1=${drill?.p1} p2=${drill?.p2} state=${drill?.state}`)
  await wf(4)

  console.log("\n── preview each finisher (B) → dummy revived + drill resumes ──")
  const names = []
  for (let i = 0; i < 5; i++) {
    const before = errs.length
    const p = await page.evaluate(() => window.__harness.academy.previewBrut())
    ok(p.ok && p.active && p.name, `preview #${i + 1}: ${p.name} (${p.gore})  [ok=${p.ok} active=${p.active}]`)
    names.push(p.name)
    await wf(6); await page.screenshot({ path: path.join(SHOTS, `academy_brut_${i}.png`) })
    // let the finisher play out
    await page.waitForFunction(() => !window.__harness.academy.brutState().inPreview, null, { timeout: 8000, polling: 16 }).catch(() => {})
    const after = await page.evaluate(() => window.__harness.academy.brutState())
    ok(!after.active && !after.inPreview && after.p2Hp > 0 && after.state === "battle",
       `after #${i + 1}: dummy revived (hp=${after.p2Hp}) + back in drill (state=${after.state})`)
    ok(errs.length === before, `preview #${i + 1}: 0 page errors  [${errs.slice(before, before + 1).join(" | ")}]`)
  }
  // cycles through the table (should hit all 4 tobirama entries, then repeat)
  const uniq = [...new Set(names)]
  ok(uniq.length >= 4, `cycles through finishers: saw ${uniq.length} distinct  [${uniq.join(", ")}]`)
  ok(names.includes("REANIMATION"), `includes the TRAIT finisher (REANIMATION)  [${uniq.join(", ")}]`)

  ok(errs.length === 0, `no page JS errors overall  [${errs.slice(0, 2).join(" | ")}]`)
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} academy-brutality-preview: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
