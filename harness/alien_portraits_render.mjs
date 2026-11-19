// harness/alien_portraits_render.mjs — Ben 10 alien profile pictures, in the real game (headless, simulated input).
// 1) every READY alien has a portrait file that loads (no 404); 2) the Omnitrix loadout screen (PICK FIVE) shows
// them and still fits all aliens on one page; 3) a real click picks an alien; 4) Ben transformed shows the alien's
// portrait in the HUD; Albedo is unchanged. Screenshots → albedo_work/ (untracked).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
import { ALIEN_PORTRAIT_KEYS, alienPortraitPath } from "../alienPortraits.js"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "albedo_work"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".json": "application/json", ".css": "text/css", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
let pass = 0, fail = 0
const ok = (c, msg, extra = "") => { if (c) { pass++; console.log(`  ✅ ${msg} ${extra}`) } else { fail++; console.log(`  ❌ ${msg} ${extra}`) } }
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = [], f404 = []
page.on("pageerror", e => errs.push(String(e)))
page.on("response", r => { if (r.status() === 404 && /ben10_aliens/.test(r.url())) f404.push(r.url().split("/").pop()) })
const frames = n => page.evaluate(n => new Promise(r => { let i = 0; const t = () => (++i >= n ? r() : requestAnimationFrame(t)); requestAnimationFrame(t) }), n)
const shot = async file => { const u = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png")); fs.writeFileSync(path.join(OUT, file), Buffer.from(u.split(",")[1], "base64")) }
try {
  // 1) files
  for (const k of ALIEN_PORTRAIT_KEYS) ok(fs.existsSync(path.join(ROOT, alienPortraitPath(k))), `portrait file for ${k}`)
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "domcontentloaded", timeout: 60000 })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 60000 })
  const pool = await page.evaluate(async () => (await import("./aliens.js")).getAvailableAlienKeys())
  ok(pool.every(k => ALIEN_PORTRAIT_KEYS.includes(k)), `every READY alien has a portrait (${pool.length})`, pool.filter(k => !ALIEN_PORTRAIT_KEYS.includes(k)).join(","))
  // 2) Omnitrix loadout screen via real clicks
  const bi = await page.evaluate(() => window.__harness.showCharSelect("ben_10", "training")); await frames(2)
  const bcr = await page.evaluate(() => window.__harness.charCardRects()); const bIdx = bi.roster.indexOf("ben10")
  await page.mouse.click(bcr[bIdx].x + bcr[bIdx].w / 2, bcr[bIdx].y + bcr[bIdx].h / 2); await frames(3)
  ok((await page.evaluate(() => window.__harness.state().gameState)) === "selectAliens", "reached the Omnitrix loadout screen")
  const loaded = await page.evaluate(async keys => { const m = await import("./alienPortraits.js"); for (let i = 0; i < 120 && keys.some(k => !m.getAlienPortrait(k)); i++) await new Promise(r => setTimeout(r, 50)); return keys.filter(k => m.getAlienPortrait(k)) }, pool)
  ok(loaded.length === pool.length, `all ${pool.length} portraits loaded in the browser`, `${loaded.length}`)
  await frames(4)
  const acr = await page.evaluate(() => window.__harness.alienGridRects())
  ok(acr.length === pool.length && acr.every(c => c.y >= 60 && c.y + c.h <= 720 - 100 && c.x >= 0 && c.x + c.w <= 1280), "all alien cards fit on one page above the buttons", `rows end at ${Math.round(Math.max(...acr.map(c => c.y + c.h)))}`)
  for (const i of [1, 7, 22]) { await page.mouse.click(acr[i].x + acr[i].w / 2, acr[i].y + acr[i].h / 2); await frames(2) }
  await frames(10); await shot("_alien_portraits_select.png")
  const px = await page.evaluate(([x, y, s]) => { const d = document.querySelector("canvas").getContext("2d").getImageData(x, y, s, s).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 120) n++; return n / (s * s) }, [Math.round(acr[1].x + 10), Math.round(acr[1].y + 10), 60])
  ok(px > 0.08, "card shows a picture (bright pixels inside the portrait frame)", px.toFixed(2))
  // 3) HUD
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=albedo`, { waitUntil: "domcontentloaded", timeout: 60000 })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 60000 }); await page.mouse.click(640, 360)
  await page.evaluate(() => window.__harness.start({ experimental: false, p1Skin: "default", p2Skin: "default" })); await frames(4)
  await page.evaluate(() => window.__harness.skipToBattle()); await frames(20)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
  for (const a of ["heatblast", "alienx", "waterhazard"]) {
    await page.evaluate(a => { window.__harness.benForm(a, "p1"); window.__harness.benForm(a, "p2") }, a); await frames(30)
    const d = await page.evaluate(() => window.__harness.ben10Details("p1"))
    ok(d?.form === a, `Ben transformed into ${a}`); await shot(`_alien_portraits_hud_${a}.png`)
  }
  ok(errs.length === 0, "no page errors", errs.slice(0, 2).join(" | ")); ok(f404.length === 0, "no portrait 404s", f404.join(","))
} catch (e) { fail++; console.log("FATAL", e) }
await browser.close(); server.close()
console.log(`\nALIEN PORTRAITS RENDER: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
