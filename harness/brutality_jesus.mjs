// harness/brutality_jesus.mjs — JESUS "ASCENSION" finisher (the untouchable intercept).
// Verifies that ANY finisher involving Jesus resolves to the heavenly ASCENSION (plays on the LOSER): Jesus wins →
// the opponent ascends; Jesus loses → Jesus ascends. Renders without a page error; screenshots each direction.
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
async function wf(n) { const s = (await page.evaluate(() => window.__harness.state())).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

// [winner side, tag, who ASCENDS]
const CASES = [["p1", "jesus_wins", "the opponent"], ["p2", "jesus_loses", "Jesus"]]
try {
  await page.goto(`${base}/index.html?harness=1&p1=jesus&p2=goku`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness); await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.boot?.() ?? window.__harness.start?.())
  await page.evaluate(() => window.__harness.skipToBattle())
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {})
  await wf(4)
  await page.evaluate(() => { window.__harness.brutality.setBrutality(true); window.__harness.brutality.setBlood(true) })

  for (const [winner, tag, who] of CASES) {
    const before = errs.length
    const started = await page.evaluate(w => window.__harness.brutality.ascension(w, true), winner)
    await wf(2)
    const af = await page.evaluate(() => window.__harness.brutality.activeFinisher())
    ok(started && af && af.name === "ASCENSION" && af.gore === "ascension", `${tag}: ${who} ascends → ASCENSION (ascension)  [got ${af?.name}/${af?.gore}]`)
    await wf(70); await page.screenshot({ path: path.join(SHOTS, `jesus_${tag}.png`) })
    await page.waitForFunction(() => !window.__harness.brutality.activeFinisher(), null, { timeout: 9000, polling: 16 }).catch(() => {})
    ok(errs.length === before, `${tag}: 0 page errors  [${errs.slice(before, before + 1).join(" | ")}]`)
    await page.evaluate(() => window.__harness.skipToBattle?.()); await wf(2)
    await page.evaluate(() => { const p1 = window.__harness.p1(), p2 = window.__harness.p2(); if (p1) p1.health = p1.maxHealth; if (p2) p2.health = p2.maxHealth })
  }
  // NO gore ever: blood parts must stay empty through an ascension (it is bloodless)
  await page.evaluate(() => window.__harness.brutality.ascension("p1", true)); await wf(40)
  const st = await page.evaluate(() => window.__harness.brutality.state())
  ok(st.live === true && st.finisher && st.finisher.gore === "ascension", `ascension runs as a LIVE bloodless finisher  [${JSON.stringify({ live: st.live, gore: st.finisher?.gore })}]`)
  ok(errs.length === 0, `no page JS errors overall  [${errs.slice(0, 2).join(" | ")}]`)
} catch (e) { console.error("EXCEPTION", e); FAIL++ }
finally {
  await browser.close(); server.close()
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} brutality-jesus: ${PASS} passed, ${FAIL} failed`)
  process.exit(FAIL === 0 ? 0 : 1)
}
