// harness/omololu_underskins_live.mjs — verify omololu's 3 new skins (Alien X / Ben 10 / Albedo): each is
// selectable, decodes cleanly (no keying box), and renders with the right colour signature across
// idle/walk/attack. Boots a real match per skin, screenshots each, and compares the sprite-band colour
// RELATIVE across skins (cancels the shared stage backdrop) so green/red/void are provably distinct.
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
// mean R/G/B + luma over the p1 sprite band (left-centre); background is constant across skins so cross-skin
// deltas isolate the sprite colour.
const band = () => page.evaluate(() => {
  const c = document.querySelector("canvas"); const cx = c.getContext("2d", { willReadFrequently: true })
  const x = Math.floor(c.width * 0.28), y = Math.floor(c.height * 0.46), w = Math.floor(c.width * 0.12), h = Math.floor(c.height * 0.26)
  const d = cx.getImageData(x, y, w, h).data; let R = 0, G = 0, B = 0, n = 0
  for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++ }
  const r = R / n, g = G / n, b = B / n
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), lum: Math.round(0.3 * r + 0.59 * g + 0.11 * b) }
})

async function bootWithSkin(skinId) {
  await page.evaluate(() => window.__harness.boot && window.__harness.boot())
  const applied = await page.evaluate(id => window.__harness.bootSkin(id, "default"), skinId)
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}
  await page.evaluate(() => window.__harness.setDummyBehavior("stand"))
  await frames(8)
  const ready = await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true)
  const skinId2 = await page.evaluate(() => window.__harness.p1()?.skinId)
  return { applied, ready, skinId: skinId2 }
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=omololu&p2=obito`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness)
  await page.mouse.click(20, 20)
  await page.evaluate(() => { window.__harness.boot(); window.__harness.skipToBattle() })
  try { await page.waitForFunction(() => window.__harness.spriteReady("p1")?.ready === true, null, { timeout: 12000, polling: 50 }) } catch (_) {}

  // the 3 skins are registered + selectable for omololu
  const skinList = await page.evaluate(() => (window.__harness.getSkins ? window.__harness.getSkins("omololu") : []).map?.(s => s.id) || window.__skinsProbe)
  const ids = await page.evaluate(() => { try { return (window.__harness.skinIds ? window.__harness.skinIds("omololu") : null) } catch (_) { return null } })

  const stats = {}
  for (const [skinId, label] of [["omololuAlienX", "Alien X"], ["omololuBen10", "Ben 10"], ["omololuAlbedo", "Albedo"]]) {
    console.log(`\n── ${label} (${skinId}) ─────────────────────────────`)
    const b = await bootWithSkin(skinId)
    check(`${label}: applied + p1 is omololu`, b.applied?.p1Skin === skinId && b.skinId === skinId, `skinId=${b.skinId}`)
    check(`${label}: sprite sheet decoded (not a keying box)`, b.ready === true)
    // idle
    await frames(4); await page.screenshot({ path: path.join(OUT, `OMOLOLU_skin_${skinId}_idle.png`) })
    stats[skinId] = await band()
    // walk
    await page.keyboard.down("d"); await frames(12); await page.screenshot({ path: path.join(OUT, `OMOLOLU_skin_${skinId}_walk.png`) }); await page.keyboard.up("d")
    check(`${label}: walk/run renders cleanly`, await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true))
    // attack
    await page.evaluate(() => window.__harness.p1ForceLight?.()); await frames(4); await page.screenshot({ path: path.join(OUT, `OMOLOLU_skin_${skinId}_attack.png`) })
    check(`${label}: attack renders cleanly`, await page.evaluate(() => window.__harness.spriteReady("p1")?.ready === true))
    console.log(`     band r=${stats[skinId].r} g=${stats[skinId].g} b=${stats[skinId].b} lum=${stats[skinId].lum}`)
    // AlienX starfield gate: skinId ends "AlienX" → runtime starfield seeded with a valid draw bbox
    if (skinId === "omololuAlienX") {
      await frames(3)
      const fx = await page.evaluate(() => window.__harness.alienXFX("p1"))
      check("Alien X: runtime starfield seeded + drawn (endsWith AlienX gate)", fx.isAlienX && fx.seeded && fx.stars > 0 && fx.rect.w > 0, JSON.stringify(fx))
    }
  }

  console.log("\n── colour signatures distinct (relative — cancels shared backdrop) ─────────────")
  const ax = stats.omololuAlienX, bn = stats.omololuBen10, al = stats.omololuAlbedo
  const greenness = s => s.g - (s.r + s.b) / 2
  const redness   = s => s.r - (s.g + s.b) / 2
  check("Ben 10 band is GREENER than Albedo", greenness(bn) > greenness(al), `greenness ben10=${greenness(bn).toFixed(1)} > albedo=${greenness(al).toFixed(1)}`)
  check("Albedo band is REDDER than Ben 10", redness(al) > redness(bn), `redness albedo=${redness(al).toFixed(1)} > ben10=${redness(bn).toFixed(1)}`)
  check("Alien X band is DARKEST (matte void) of the three", ax.lum <= bn.lum && ax.lum <= al.lum, `alienx lum=${ax.lum} vs ben10 ${bn.lum} / albedo ${al.lum}`)

  check("no JS errors across the run", jsErrors.length === 0, jsErrors[0] || "")
  console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`)
} catch (e) {
  console.error("HARNESS ERROR:", e); FAIL++
} finally {
  await browser.close(); server.close()
  process.exit(FAIL ? 1 : 0)
}
