// harness/originals_creative_skins.test.mjs — the ORIGINALS' creative skins (tools/originalskins/build.py): 10 each for
// Omololu, Dseyl and Enoch, each inspired by another fighter. Per skin: every recoloured sheet + portrait exists with the
// SAME size as the base (identical frame grid → same timing / hitboxes), the skin applies in a real match, the sprite
// decodes (no keying box) through idle / walk / attack, and there are no JS errors.
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
const frames = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}) }
const sizeOf = f => { try { const b = fs.readFileSync(path.join(ROOT, f.replace(/^\.\//, ""))); return b.readUInt32BE(16) + "x" + b.readUInt32BE(20) } catch (_) { return null } }
const SHOTS = path.join(OUT, "originals_skins"); fs.mkdirSync(SHOTS, { recursive: true })
const { characters } = await import(path.join(ROOT, "characters.js"))
const { SKINS } = await import(path.join(ROOT, "skins.js"))
try {
  for (const key of ["omololu", "dseyl", "enoch"]) {
    const list = (SKINS[key] || []).filter(s => s.source?.version === "tools/originalskins/build.py" || /^omololu(Rose|Hollowpurple|Kingofcurses|Akatsuki|Sage|Thunderclap|Flamehashira|Magmacore|Crystal|Homelander)$/.test(s.id))
    console.log(`\n── ${key}: ${list.length} creative skins ──`)
    check(`${key}: 10 creative skins registered`, list.length === 10, list.map(s => s.id).join(","))
    // files: every sheet + the portrait, same size as the base sheet
    let bad = []
    for (const s of list) {
      for (const [a, d] of Object.entries(s.animationData || {})) {
        if (!d?.sheet) continue
        const baseSheet = characters[key].animationData[a].sheet
        if (!sizeOf(d.sheet) || sizeOf(d.sheet) !== sizeOf(baseSheet)) bad.push(`${s.id}:${a}`)
      }
      if (!sizeOf(s.portrait)) bad.push(`${s.id}:portrait`)
    }
    check(`${key}: every recoloured sheet + portrait exists, same size as the base`, bad.length === 0, bad.slice(0, 4).join(" "))
    await page.goto(`${base}/index.html?harness=1&p1=${key}&p2=obito`, { waitUntil: "load" })
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 120000 })
    await page.mouse.click(20, 20)
    await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
    for (const s of list) {
      const applied = await page.evaluate(id => window.__harness.bootSkin(id, "default"), s.id)
      try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 15000, polling: 50 }) } catch (_) {}
      await page.evaluate(() => window.__harness.setDummyBehavior?.("stand")); await frames(6)
      const st = await page.evaluate(() => ({ id: window.__harness.p1()?.skinId, ready: window.__harness.spriteReady("p1")?.ready === true }))
      await page.screenshot({ path: path.join(SHOTS, `${s.id}_idle.png`) })
      await page.keyboard.down("d"); await frames(10); await page.keyboard.up("d")
      const walk = await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true)
      await page.keyboard.press("j"); await frames(5)
      const atk = await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true)
      await page.screenshot({ path: path.join(SHOTS, `${s.id}_attack.png`) })
      check(`${s.name}: applies + renders idle / walk / attack`, st.id === s.id && st.ready && walk && atk, `skinId=${st.id} ready=${st.ready}/${walk}/${atk}`)
    }
  }
  check("no JS errors across the run", jsErrors.length === 0, jsErrors[0] || "")
} catch (e) { check("run completed", false, String(e).slice(0, 200)) }
console.log(`\n  ORIGINALS CREATIVE SKINS: ${PASS} passed, ${FAIL} failed`)
await browser.close(); server.close(); process.exit(FAIL ? 1 : 0)
