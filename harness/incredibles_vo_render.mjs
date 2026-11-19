// INCREDIBLES VO RENDER CHECK: boots the real game headless with sound unlocked (a click). For each of the six Incredibles
// cast members: intro line, a landed attack (effort / callout VO), then the match ended both ways (WIN and LOSE cue).
// Every Incredibles clip handed to sound.playSfxFile is recorded; each must start, be served 200 (no 404), and the page must
// throw no error. Also re-checks one Ben 10 cast intro (the shared hook sites still work).   node harness/incredibles_vo_render.mjs
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = [], audio404 = []
page.on("pageerror", e => jsErrors.push(String(e)))
page.on("response", r => { const u = decodeURIComponent(r.url()); if (/\/assets\/audio\//.test(u) && r.status() === 404) audio404.push(u.split("/").slice(-3).join("/")) })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
async function frames(n) { const s = (await H("state")).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
const tap = () => page.evaluate(async () => {
  const { sound } = await import("./sound.js")
  if (!sound.__voTap) { const orig = sound.playSfxFile.bind(sound); sound.playSfxFile = (f, fb, o) => { const r = orig(f, fb, o); (window.__vo ||= []).push({ f: String(f), r: !!r, owner: !!o?.owner, fade: o?.fadeMs ?? null }); return r }; sound.__voTap = true }
  window.__vo = []
})
const CAST = ["dash_parr", "elastigirl", "frozone", "mr_incredible", "syndrome", "violet"]
const vo = k => page.evaluate(k => (window.__vo || []).filter(e => e.f.includes(`/assets/audio/${k}/`)), k)
const clear = () => page.evaluate(() => { window.__vo = [] })
const names = l => l.map(e => e.f.split("/").pop()).join(",") || "(none)"
async function boot(p1, p2) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 })
  await page.mouse.click(640, 360); await tap()
  await H("start", { experimental: false, mode: "versus", difficulty: "dummy" }); await frames(4)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
}
async function endMatch(loser) {
  for (let i = 0; i < 6; i++) {
    const st = await H("state"); if (st.gameState !== "battle") { await frames(20); if ((await H("state")).gameState !== "battle") break }
    await H("setHealth", 0, loser); await frames(240)
  }
  await frames(30)
}
try {
  for (const k of CAST) {
    for (const loser of ["p2", "p1"]) {
      await boot(k, "goku")
      if (loser === "p2") {
        await H("fireIntroVoice", "p1"); await frames(4)
        const i = await vo(k); ok(i.length > 0 && i.every(e => e.r && e.owner && e.fade === 40), `${k}: intro line plays (owned voice channel, 40 ms fade)`, names(i))
        // land attacks: dummy p2 parked in front of p1, light attacks pressed until a VO cue fires
        await clear(); let a = []
        for (let t = 0; t < 12 && !a.length; t++) {
          await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 60))
          await page.keyboard.down("j"); await frames(3); await page.keyboard.up("j"); await frames(30)
          a = await vo(k)
        }
        ok(a.length > 0 && a.every(e => e.r), `${k}: attack VO plays on a landed hit`, names(a))
      }
      await clear(); await endMatch(loser)
      const end = await vo(k)
      ok(end.length > 0 && end.every(e => e.r), `${k}: ${loser === "p2" ? "WIN" : "LOSE"} cue plays`, names(end))
    }
  }
  // shared hook sites: the Ben 10 cast still speaks (Albedo intro)
  await boot("albedo", "violet"); await H("fireIntroVoice", "p1"); await frames(4)
  const b = await page.evaluate(() => (window.__vo || []).filter(e => /albedo/.test(e.f)))
  ok(b.length > 0, "Ben 10 cast unaffected: albedo intro still plays", names(b))
  ok(audio404.length === 0, "no VO 404s", audio404.slice(0, 5).join(","))
  ok(jsErrors.length === 0, "no page errors", jsErrors.slice(0, 3).join(" | "))
} catch (e) { failed++; console.log("  ❌ harness threw:", e.message) }
await browser.close(); server.close()
console.log(`\nINCREDIBLES VO RENDER: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
