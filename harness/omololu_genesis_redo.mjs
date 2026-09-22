// harness/omololu_genesis_redo.mjs — proves the REDONE domain "The Genesis Threshold":
//   • it is the RHYTHM/REFLEX GAUNTLET (random W/A/S/D prompts, Naoya-window judging), NOT a cinematic
//   • CORRECT key in-window = ZERO damage that beat; WRONG key or MISSED window = REAL damage
//   • the prompts are genuinely RANDOM per activation (not a fixed pattern)
//   • the backdrop is the ACTUAL IMG_3608 photo (converted to omololu_genesis_bg.jpg), decoded + drawn
//   • captures a mid-sequence screenshot with an ACTIVE on-screen prompt
import { chromium } from "playwright"
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let PASS = 0, FAIL = 0
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`) }
const section = t => console.log(`\n── ${t} ─────────────────────────────`)
const frames = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }

async function boot() {
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=obito`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setSession && window.__harness.setSession({ infiniteResources: true }))
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await frames(4)
}

try {
  await boot()

  section("STAGE 4A — it IS the rhythm gauntlet (random WASD prompt), not a cinematic")
  const t = await page.evaluate(() => window.__harness.omololu.trigger("p1"))
  check("domain casts", !!t?.cast)
  check("a RANDOM W/A/S/D prompt is armed on cast", !!t?.view && ["W", "A", "S", "D"].includes(t.view.glyph), t?.view?.glyph)
  const di = await page.evaluate(() => window.__harness.omololu.domainInfo())
  check("domain identity is 'The Genesis Threshold'", di?.name === "The Genesis Threshold", di?.name)
  check("it's a RHYTHM domain (a live cadence view exists)", !!(await page.evaluate(() => window.__harness.omololu.state())))

  section("STAGE 4B — judging: correct = ZERO damage, wrong/missed = REAL damage (synchronous, no double-tick)")
  const runBeats = (mode) => page.evaluate((mode) => {
    const H = window.__harness.omololu
    H.trigger("p1")
    const OPP = { up: "down", down: "up", left: "right", right: "left" }
    let dmg = 0, beats = 0, g
    for (let i = 0; i < 6; i++) {
      g = 0; while (H.state()?.phase === "telegraph" && g++ < 300) H.tick(null)
      const dir = { W: "up", A: "left", S: "down", D: "right" }[H.state().glyph]
      let r
      if (mode === "correct") r = H.tick(dir)
      else if (mode === "wrong") r = H.tick(OPP[dir])
      else { g = 0; while (H.state()?.phase === "window" && g++ < 300) r = H.tick(null) }  // miss the window
      dmg += (r?.dmg || 0); beats++
      g = 0; while (H.state()?.phase === "gap" && g++ < 300) H.tick(null)
    }
    return { dmg, beats, hits: H.state()?.hits, misses: H.state()?.misses }
  }, mode)
  const correct = await runBeats("correct")
  check("6 CORRECT beats → ZERO damage", correct.dmg === 0, `dmg=${correct.dmg}, hits=${correct.hits}`)
  const wrong = await runBeats("wrong")
  check("6 WRONG beats → real damage every beat", wrong.dmg > 0 && wrong.misses >= 6, `dmg=${wrong.dmg}, misses=${wrong.misses}`)
  const missed = await runBeats("missed")
  check("6 MISSED windows → real damage every beat", missed.dmg > 0 && missed.misses >= 6, `dmg=${missed.dmg}, misses=${missed.misses}`)
  check("per-beat damage is in-band (domain/ultimate tier, not an outlier)", (wrong.dmg / 6) <= 20, `${(wrong.dmg / 6).toFixed(1)}/beat`)

  section("STAGE 4C — prompts are genuinely RANDOM per activation (not a fixed pattern)")
  const seqOf = () => page.evaluate(() => {
    const H = window.__harness.omololu; H.trigger("p1")
    const seq = []; let g
    for (let i = 0; i < 8; i++) { seq.push(H.state().glyph); g = 0; while (H.state()?.phase !== "gap" && g++ < 400) H.tick(H.state()?.phase === "window" ? { W: "up", A: "left", S: "down", D: "right" }[H.state().glyph] : null); g = 0; while (H.state()?.phase === "gap" && g++ < 200) H.tick(null) }
    return seq.join("")
  })
  const s1 = await seqOf(), s2 = await seqOf()
  check("two activations yield DIFFERENT random sequences", s1 !== s2, `${s1} vs ${s2}`)

  section("STAGE 4D — backdrop is the ACTUAL IMG_3608 photo, decoded + drawn")
  const asset = await page.evaluate(async (b) => { const r = await fetch(b + "/omololu_genesis_bg.jpg"); return { ok: r.ok, type: r.headers.get("content-type") } }, base)
  check("converted asset omololu_genesis_bg.jpg is served (200)", asset.ok === true, asset.type)
  await boot()
  await page.evaluate(() => window.__harness.omololu.trigger("p1"))
  await frames(40)   // let the domain render so the image decodes
  const bg = await page.evaluate(() => window.__harness.omololu.domainInfo())
  check("the IMG_3608 photo actually DECODED (not the procedural fallback)", bg?.bgImageReady === true, `bgImageReady=${bg?.bgImageReady}`)
  // sample the backdrop warmth (photo + warm domain wash) vs the old generic purple
  const warm = await page.evaluate(() => {
    const c = document.querySelector("canvas"); const cx = c.getContext("2d", { willReadFrequently: true })
    const pts = [[c.width * 0.12, c.height * 0.18], [c.width * 0.88, c.height * 0.2], [c.width * 0.5, c.height * 0.12]]
    let r = 0, b = 0
    for (const [x, y] of pts) { const d = cx.getImageData(x | 0, y | 0, 6, 6).data; for (let i = 0; i < d.length; i += 4) { r += d[i]; b += d[i + 2] } }
    return { r: Math.round(r), b: Math.round(b), warm: r > b }
  })
  check("backdrop reads WARM (crimson/gold domain wash over the photo)", warm.warm, `ΣR=${warm.r} ΣB=${warm.b}`)

  section("STAGE 4E — mid-sequence screenshot with an ACTIVE on-screen prompt")
  // wait until a prompt's input window is open, then capture
  await page.waitForFunction(() => { const v = window.__harness.omololu.state(); return v && v.windowOpen === true }, null, { timeout: 8000, polling: 16 }).catch(() => {})
  const shotView = await page.evaluate(() => window.__harness.omololu.state())
  await page.screenshot({ path: path.join(OUT, "OMOLOLU_genesis_prompt.png") })
  check("captured with a live prompt on screen", !!shotView && ["W", "A", "S", "D"].includes(shotView.glyph), `prompt='${shotView?.glyph}' phase=${shotView?.phase}`)
  check("no JS errors across the whole run", jsErrors.length === 0, jsErrors[0] || "")

  console.log(`\n${FAIL === 0 ? "✓ ALL PASS" : "✗ FAILURES"} — ${PASS} passed, ${FAIL} failed`)
  console.log("shot → harness/shots/OMOLOLU_genesis_prompt.png")
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++
} finally {
  await browser.close(); server.close()
  process.exit(FAIL === 0 ? 0 : 1)
}
