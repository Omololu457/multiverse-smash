// BEN 10 VO RENDER CHECK: boots the real game headless with sound unlocked (a click), then for ben10 picks the 11 READY aliens
// that got new VO, five per match (PICK FIVE). For each alien it transforms through the Omnitrix, throws a special and lands
// hits, then ends the match both ways (win and lose). Every Ben 10 cast clip handed to sound.playSfxFile is recorded; each must
// be served 200 (no 404), and the page must throw no error. Also checks Albedo (human intro / win) and Vilgax.
//   node harness/ben10_vo_render.mjs
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = [], audio404 = [], served = new Set()
page.on("pageerror", e => jsErrors.push(String(e)))
page.on("response", r => { const u = decodeURIComponent(r.url()); if (/\/(assets\/audio|voice)\//.test(u)) { if (r.status() === 404) audio404.push(u.split("/").slice(-2).join("/")); else if (r.status() < 400) served.add(u.replace(base, ".")) } })
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
async function frames(n) { const s = (await H("state")).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
// record every file cue (clip, result) in the page: the wrapper only observes; it calls the real playSfxFile
const tap = () => page.evaluate(async () => {
  const { sound } = await import("./sound.js")
  if (!sound.__voTap) { const orig = sound.playSfxFile.bind(sound); sound.playSfxFile = (f, fb, o) => { const r = orig(f, fb, o); (window.__vo ||= []).push({ f: String(f), r, owner: !!o?.owner, fade: o?.fadeMs ?? null, rate: o?.rate ?? null }); return r }; sound.__voTap = true }
  window.__vo = []
})
// Ben 10 cast clips: the new assets/audio packs + Albedo's / Vilgax's merged transcript-verified mp3s (passed as bare names)
const vo = () => page.evaluate(() => (window.__vo || []).filter(e => /assets\/audio\/(ben10|albedo|vilgax)\/|^(albedo|vilgax)_\d+\.mp3$/.test(e.f)))
const played = e => !!e.r   // playSfxFile returns the Audio element when the cue starts, false when it does not
async function boot(p1, p2, aliens, skin) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 })
  await page.mouse.click(640, 360); await tap()
  await H("start", { experimental: false, mode: "versus", difficulty: "dummy", p1Aliens: aliens || null, p1Skin: skin || "default" }); await frames(4)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
}
async function endMatch(loser) {          // KO the loser each round until the victory block runs
  for (let i = 0; i < 6; i++) {
    const st = await H("state"); if (st.gameState !== "battle") { await frames(20); if ((await H("state")).gameState !== "battle") break }
    await H("setHealth", 0, loser); await frames(240)
  }
  await frames(30)
}
const READY_VO = ["ghostfreak", "heatblast", "wildvine", "bigchill", "diamondhead_ov", "feedback_ov", "humongousaur", "rath", "swampfire", "upgrade_ov", "xlr8"]
try {
  const groups = [READY_VO.slice(0, 5), READY_VO.slice(5, 10), [READY_VO[10], "goop", "megawhatt", "eyeguy", "alienx"]]
  for (const [gi, g] of groups.entries()) {
    for (const loser of ["p2", "p1"]) {
      await boot("ben10", "goku", g)
      const intro = await vo(); if (gi === 0 && loser === "p2") ok(intro.some(e => /ben_teen/.test(e.f)), "ben10 (Alien Force) intro line from ben_teen", intro.map(e => e.f.split("/").pop()).join(","))
      for (const [slot, alien] of g.entries()) {
        if (!READY_VO.includes(alien)) continue
        await H("ben10SetPower", "p1", 100); await page.evaluate(() => { window.__vo = [] })
        if (slot > 0) { await H("ben10Morph", "p1", "revert"); await frames(200); await H("ben10SetPower", "p1", 100); await page.evaluate(() => { window.__vo = [] }) }
        const m = await H("ben10Morph", "p1", slot); await frames(70)
        const d = await H("ben10Details", "p1")
        const t = await vo()
        ok(d?.form === alien || d?.activeAlien === alien || m?.act, `${alien}: transformed`, JSON.stringify({ act: m?.act, form: d?.form || d?.activeAlien }))
        // a special + a couple of connects (attack / special VO); cooldowns allow at least one
        await page.evaluate(() => window.__harness.setP2X(window.__harness.p1().x + 70))
        for (const dir of ["N", "F"]) { await H("ben10SetPower", "p1", 100); await H("ben10Cast", dir); await frames(40) }
        const after = await vo()
        const mine = after.filter(e => e.f.includes(`/ben10/${alien}/`))
        if (loser === "p2") ok(mine.length > 0 && mine.every(played), `${alien}: own VO played on transform / attack`, mine.map(e => e.f.split("/").pop()).join(",") || JSON.stringify(after.map(e => e.f.split("/").pop())))
        if (loser === "p2") ok(mine.filter(e => !/source\/.*_0*\d+\.ogg$/.test(e.f) || true).every(e => (e.owner && e.fade === 40) || e.rate != null), `${alien}: voice on the single owned channel (40 ms fade) / SFX layered`)
      }
      await page.evaluate(() => { window.__vo = [] })
      await endMatch(loser)
      const end = await vo()
      ok(end.length > 0 && end.every(played), `group ${gi + 1}: ${loser === "p2" ? "WIN" : "LOSE"} cue plays for Ben (as the alien, else his human pool)`, end.map(e => e.f.split("/").slice(-3).join("/")).join(","))
    }
  }
  // Albedo human (intro + win) and Vilgax (intro / hit / win)
  await boot("albedo", "vilgax", null)
  await H("fireIntroVoice", "p2"); await frames(4)   // skipToBattle jumps past p2's intro beat; fire it through the harness hook
  const a0 = await vo(); ok(a0.some(e => /albedo/.test(e.f)) && a0.some(e => /vilgax/.test(e.f)), "albedo + vilgax intro lines", a0.map(e => e.f.split("/").pop()).join(","))
  await page.evaluate(() => { window.__vo = [] }); await endMatch("p2")
  const a1 = await vo(); ok(a1.some(e => /albedo/.test(e.f)) && a1.every(played), "albedo WIN / vilgax LOSE cues", a1.map(e => e.f.split("/").pop()).join(","))
  // Classic Ben speaks with the kid (ben_young) pools; Prime has no clips (silent, no crash)
  await boot("ben10", "goku", null, "ben10Classic"); const c0 = await vo()
  ok(c0.every(e => /ben_young/.test(e.f)), "Classic Ben intro from ben_young (or silent)", c0.map(e => e.f.split("/").pop()).join(",") || "(silent)")
  ok(audio404.length === 0, "no VO 404s", audio404.slice(0, 5).join(","))
  ok(jsErrors.length === 0, "no page errors", jsErrors.slice(0, 3).join(" | "))
} catch (e) { failed++; console.log("  ❌ harness threw:", e.message) }
await browser.close(); server.close()
console.log(`\nBEN 10 VO RENDER: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
