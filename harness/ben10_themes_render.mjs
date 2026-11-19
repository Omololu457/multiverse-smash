// BEN 10 THEMES RENDER CHECK (the brief's push gate): boots the real game headless. For each appearance (Classic, Jacket):
// picks Ben with a themed skin, starts a match, transforms into EVERY READY alien (5 per match, PICK FIVE), and while each
// alien is on screen cycles all 20 themes, confirming the renderer draws that alien's sheet recoloured in the SAME theme
// (benThemeLast = the alien's form + the selected theme, and the drawn canvas differs from the original). Also: the human
// form under all 20 themes, no page error, no black screen, Albedo never themed, a mirror match with independent picks.
//   node harness/ben10_themes_render.mjs
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)))
let passed = 0, failed = 0
const ok = (c, m, d = "") => { if (c) { passed++; if (process.env.VERBOSE) console.log("  ✅", m, d) } else { failed++; console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
async function frames(n) { const s = (await H("state")).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function boot(p1, p2, opts) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 30000 })
  await H("start", { experimental: false, mode: "versus", difficulty: "dummy", ...opts }); await frames(4)
  await H("skipToBattle"); await frames(30)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
}
// set p1's theme directly (as the skin does) and check the next drawn sheet
const probe = (who, themeId) => page.evaluate(async ([who, themeId]) => {
  const st = window.__harness.benTheme(who, themeId)
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const r = window.__harness.benTheme(who)
  // the main canvas is not black: mean brightness of a downscaled copy
  const c = document.querySelector("canvas"), t = document.createElement("canvas"); t.width = 64; t.height = 36
  t.getContext("2d").drawImage(c, 0, 0, 64, 36); const d = t.getContext("2d").getImageData(0, 0, 64, 36).data
  let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2]
  return { ...r, bright: sum / (d.length / 4) / 3 }
}, [who, themeId])
// does the themed copy actually differ from the source sheet?
const differs = () => page.evaluate(async () => {
  const R = await import("./benThemeRecolor.js"); const st = window.__harness.benTheme("p1"); const last = st.last; if (!last) return false
  const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = last.path })
  if (!im) return false
  const w = im.naturalWidth, h = im.naturalHeight
  const a = document.createElement("canvas"); a.width = w; a.height = h; const ga = a.getContext("2d"); ga.drawImage(im, 0, 0)
  const da = ga.getImageData(0, 0, w, h).data, db = new Uint8ClampedArray(da)
  R.recolorImageData(db, w, h, last.form, last.theme)
  let n = 0, alphaSame = true
  for (let i = 0; i < da.length; i += 4) { if (da[i + 3] !== db[i + 3]) alphaSame = false; if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) n++ }
  return { n, alphaSame, path: last.path.split("/").pop() }
})

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 30000 })
  const meta = await page.evaluate(async () => {
    const { BEN_THEMES } = await import("./benThemes.js"); const { BEN10_ALIEN_REGISTRY } = await import("./aliens.js")
    const { BEN_THEME_REGIONS } = await import("./benThemeRegions.js")
    return { themes: BEN_THEMES.map(t => t.id), ready: BEN10_ALIEN_REGISTRY.filter(a => a.status === "ready" && a.sheetPath && a.ledgerPath).map(a => a.poolKey), regions: Object.keys(BEN_THEME_REGIONS) }
  })
  ok(meta.themes.length === 20, "20 themes in the registry")
  ok(meta.ready.length > 0 && meta.ready.every(k => meta.regions.includes(k)), `every READY alien (${meta.ready.length}) has a regional map`, meta.ready.filter(k => !meta.regions.includes(k)).join(","))
  const groups = []; for (let i = 0; i < meta.ready.length; i += 5) groups.push(meta.ready.slice(i, i + 5))
  for (const ap of ["classic", "jacket"]) {
    const skin = `${ap}-${meta.themes[0]}`
    for (const [gi, g] of groups.entries()) {
      await boot("ben10", "goku", { p1Aliens: g, p1Skin: skin })
      if (gi === 0) {
        const h0 = await probe("p1")
        ok(h0.skinId === skin && h0.theme === meta.themes[0], `${ap}: the themed skin is applied (${skin})`, JSON.stringify(h0))
        const v = h0.variant; ok(v === (ap === "classic" ? "classic" : "alienforce"), `${ap}: same variant as the original appearance`, v)
        for (const t of meta.themes) {
          const r = await probe("p1", t)
          ok(r.last && r.last.form === ap && r.last.theme === t && r.bright > 3, `${ap} human: ${t}`, JSON.stringify(r.last))
        }
        const d = await differs(); ok(d && d.n > 0 && d.alphaSame, `${ap} human: recoloured pixels, alpha untouched`, JSON.stringify(d))
      }
      for (const [slot, alien] of g.entries()) {
        if (slot > 0) { await H("ben10Morph", "p1", "revert"); await frames(200) }
        await H("ben10SetPower", "p1", 100); await H("ben10Morph", "p1", slot); await frames(80)
        const st = await probe("p1", meta.themes[0])
        ok(st.transformed && st.alien === alien, `${ap}: transformed into ${alien}`, JSON.stringify({ t: st.transformed, a: st.alien }))
        let bad = []
        for (const t of meta.themes) { const r = await probe("p1", t); if (!(r.last && r.last.form === alien && r.last.theme === t && r.bright > 3)) bad.push(`${t}:${JSON.stringify(r.last)}`) }
        ok(bad.length === 0, `${ap}: ${alien} drawn in all 20 themes (same theme as Ben)`, bad.slice(0, 2).join(" | "))
        const d = await differs(); ok(d && d.n > 0 && d.alphaSame, `${ap}: ${alien} recoloured, alpha untouched`, JSON.stringify(d))
      }
      // persistence: revert → still themed (human), and the theme survives a round reset / rematch
      await H("ben10Morph", "p1", "revert"); await frames(60)
      const rv = await probe("p1"); ok(rv.theme && rv.last?.form === ap, `${ap} group ${gi + 1}: revert keeps the theme`, JSON.stringify(rv.last))
      if (gi === 0) {
        await H("ben10Reset", "rematch"); await frames(30)
        const rm = await probe("p1"); ok(rm.theme === meta.themes[meta.themes.length - 1] || rm.theme === meta.themes[0], `${ap}: rematch keeps a theme`, rm.theme)
        await H("ben10Reset", "round"); await frames(30)
        const rr = await probe("p1"); ok(rr.skinId === skin && rr.theme === meta.themes[0], `${ap}: new round re-applies the picked skin's theme`, JSON.stringify({ s: rr.skinId, t: rr.theme }))
      }
    }
  }
  // Albedo vs Ben (themed): Albedo is never themed, Ben is
  await boot("albedo", "ben10", { p2Skin: "jacket-eventhorizon" })
  const al = await probe("p1"), bn = await probe("p2")
  ok(!al.theme && !al.last, "Albedo: never themed (no theme field, nothing recoloured)", JSON.stringify(al))
  ok(bn.theme === "eventhorizon" && bn.last?.theme === "eventhorizon", "Ben (p2) themed while facing Albedo", JSON.stringify(bn.last))
  // mirror: two Bens, independent picks
  await boot("ben10", "ben10", { p1Skin: "classic-neonleap", p2Skin: "jacket-solarfurnace" })
  const m1 = await probe("p1"), m2 = await probe("p2")
  ok(m1.last?.theme === "neonleap" && m1.last?.form === "classic" && m2.last?.theme === "solarfurnace" && m2.last?.form === "jacket", "mirror: independent appearance + theme per player", JSON.stringify([m1.last, m2.last]))
  const tint = [m1.tint, m2.tint]
  ok(tint[1], "mirror: the existing P2 mirror tint still applies over the theme", JSON.stringify(tint))
  ok(jsErrors.length === 0, "no page errors", jsErrors.slice(0, 3).join(" | "))
} catch (e) { failed++; console.log("  ❌ harness threw:", e.message) }
await browser.close(); server.close()
console.log(`\nBEN 10 THEMES RENDER: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
