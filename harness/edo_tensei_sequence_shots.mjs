// harness/ds_ult_cine_shots.mjs — render check of the ultimate cinematics (Demon Slayer: Shinobu / Zenitsu / Nezuko tap + hold;
// Naruto pre-rolls: Sakura / Hinata / Sasuke Sensei / Six Paths / Adult Sasuke / Seventh Hokage):
// one screenshot per beat → docs/demon_slayer/ult_cinematics/<char>/, plus the damage each ult dealt.
// Usage: node harness/ds_ult_cine_shots.mjs [shinobu|zenitsu|nezuko|nezukoDemon ...]
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return } res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res) }); s.listen(0, () => r(s)) });
const base = `http://127.0.0.1:${server.address().port}`;
const OUT = path.join(ROOT, "docs/naruto/edo_tensei_sequence"); fs.mkdirSync(OUT, { recursive: true })
const page = await (await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] })).newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on("pageerror", e => errs.push(String(e)))
await page.goto(base + "/index.html?harness=1&p1=tobirama&p2=spd_red")
await page.waitForFunction(() => !!window.__harness?.start, null, { timeout: 90000 })
await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.() })
await page.waitForFunction(() => window.__harness.state?.().frame > 60, null, { timeout: 60000 })
await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 300); window.__harness.fillEnergy?.() })
await page.waitForTimeout(300)
await page.keyboard.down("u"); await page.waitForTimeout(90); await page.keyboard.up("u")
const cdp = await page.context().newCDPSession(page)
await page.waitForFunction(() => window.__dsPrerollStatus?.().active, null, { timeout: 20000, polling: 16 }).catch(() => {})
await page.waitForFunction(() => !window.__dsPrerollStatus?.().active, null, { timeout: 60000, polling: 16 }).catch(() => {})
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 12 })   // slow the sim so each capture lands on its frame
await page.waitForFunction(() => window.__harness.edoBackup.cine().active, null, { timeout: 60000, polling: 16 })
for (const t of [22, 33, 45, 57, 70, 84, 96, 106, 116, 126, 138, 150, 168, 184, 194]) {
  await page.waitForFunction(t => { const c = window.__harness.edoBackup.cine(); return !c.active || c.frame >= t }, t, { timeout: 30000, polling: 4 }).catch(() => {})
  const c = await page.evaluate(() => window.__harness.edoBackup.cine())
  await page.screenshot({ path: path.join(OUT, `f${String(t).padStart(3, "0")}.png`) })
  console.log(t, c.frame, c.active, JSON.stringify(await page.evaluate(() => ({ x: Math.round(window.__harness.p1().x), d: window.__harness.edoBackup.dummyRect() }))))
}
await page.waitForTimeout(800); await page.screenshot({ path: path.join(OUT, `z_after.png`) })
console.log("errors", errs.length, errs.slice(0, 2)); process.exit(0)
