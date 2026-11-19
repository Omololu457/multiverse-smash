// ALBEDO SKIN THEMES — RENDER CHECK (feat/albedo-skin-themes). Boots the real game headless (simulated keyboard input only).
//   node harness/albedo_themes_render.mjs            → shots in albedo_work/ (untracked)
// For ALL 40 Albedo theme skins (kid × 20, older × 20), opponent = Ben 10:
//   pick ALBEDO with the theme → match → the human art drawn is the themed canvas for THAT theme + appearance (and Ben's
//   side draws original art) → transform into EVERY one of Albedo's 24 forms (forced via benForm) → each form draws its
//   themed canvas → revert → human themed again. Gameplay numbers (HP / speed / jump / variant) = the base variant's.
// Plus: real Ultimatrix dial transform + ultimate, KO → rematch keeps the theme, Albedo vs Albedo (two themes), Albedo vs
// Ben in the SAME alien, Ben's own skins vs a themed Albedo, the two preserved defaults stay unthemed, no page errors,
// no 404s, no black screen, frame pacing during transform / the busiest finishes (Red Singularity stars, Ruby Opal glitter).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, "albedo_work"); fs.mkdirSync(OUT, { recursive: true })
const QUICK = process.argv.includes("--quick")
// --slice a-b : only combos a..b (0-19 kid, 20-39 older) of section 1 · --no-extras : skip sections 2-5 · --only-extras
const SLICE = (process.argv.find(a => a.startsWith("--slice=")) || "--slice=0-39").slice(8).split("-").map(Number)
const EXTRAS = !process.argv.includes("--no-extras"), SECTION1 = !process.argv.includes("--only-extras")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".ico": "image/x-icon" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const jsErrors = [], my404 = []
let page, boots = 0
async function freshPage() {          // a long run recycles the page (headless chromium slows down over hundreds of reloads)
  if (page) await page.close().catch(() => {})
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on("pageerror", e => jsErrors.push(String(e)))
  page.on("response", r => { if (r.status() === 404 && /albedo|ben10_/.test(r.url())) my404.push(r.url().split("/").pop()) })
}
await freshPage()
let passed = 0, failed = 0
const fails = []
const ok = (c, m, d = "") => { if (c) { passed++; if (!QUICK || !/·/.test(m)) console.log("  ✅", m, d) } else { failed++; fails.push(m); console.log("  ❌", m, d) } }
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a])
const state = () => H("state")
async function frames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}) }
async function key(k, hold = 3) { await page.keyboard.down(k); await frames(hold); await page.keyboard.up(k); await frames(2) }
async function notBlack(file) {
  // the game canvas itself (page.screenshot can hang on "waiting for fonts" under load; the canvas is what we check)
  const url = await page.evaluate(() => document.querySelector("canvas").toDataURL("image/png"))
  const buf = Buffer.from(url.split(",")[1], "base64"); fs.writeFileSync(path.join(OUT, file), buf)
  const lum = await page.evaluate(() => { const c = document.querySelector("canvas"); const x = c.getContext("2d"); const d = x.getImageData(0, Math.floor(c.height * 0.3), c.width, Math.floor(c.height * 0.4)).data; let s = 0; for (let i = 0; i < d.length; i += 400) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 400) / 3 })
  return lum > 12 && buf.length > 20000
}
const info = () => page.evaluate(async () => (await import("./albedoThemeCache.js")).albedoThemeCacheInfo())
const live = side => page.evaluate(s => { const f = window.__harness.forceAction(null, s); return f }, side)
async function lastDrawnFor(side, pred, maxFrames = 90) {
  let d = null
  for (let i = 0; i < maxFrames; i += 3) { d = (await info()).lastDrawn[side]; if (pred(d)) return d; await frames(3) }
  return d
}
async function boot(p1, p2, p1Skin, p2Skin, p1Aliens = null, p2Aliens = null) {
  if (++boots % 5 === 0) await freshPage()
  for (let a = 0; ; a++) {      // one retry: the plain test server can stall a page load under a long run
    try { await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "domcontentloaded", timeout: 60000 })
      await page.waitForFunction(() => !!window.__harness, null, { timeout: 60000 }); break }
    catch (e) { if (a >= 1) throw e }
  }
  await page.mouse.click(640, 360)
  await H("start", { experimental: false, p1Skin, p2Skin, p1Aliens, p2Aliens }); await frames(4)
  await H("skipToBattle"); await frames(20)
  await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 20000, polling: 32 }).catch(() => {})
}
const stats = side => page.evaluate(s => { const f = window.__harness[s](); return f && { maxHealth: f.maxHealth, health: f.health, key: f.key } }, side)
const variantOf = side => page.evaluate(s => { const d = window.__harness.ben10Details(s); return d && { variant: d.variant, form: d.form, sheet: d.sheet, loadout: d.loadout } }, side)
const chord = (type, ks) => page.evaluate(([t, ks]) => { for (const k of ks) document.dispatchEvent(new KeyboardEvent(t, { key: k, code: k === ";" ? "Semicolon" : "Key" + k.toUpperCase(), bubbles: true })) }, [type, ks])
async function omx(ks) { await key("s", 2); await key("s", 2); await chord("keydown", ks); await frames(3); await chord("keyup", ks); await frames(60) }
async function pacing(n = 120) {
  return page.evaluate(n => new Promise(res => { const t = []; let last = performance.now(); const step = now => { t.push(now - last); last = now; if (t.length < n) requestAnimationFrame(step); else { t.sort((a, b) => a - b); res({ p50: +t[Math.floor(n * 0.5)].toFixed(1), p95: +t[Math.floor(n * 0.95)].toFixed(1), max: +t[n - 1].toFixed(1) }) } }; requestAnimationFrame(step) }), n)
}

// Pacing is compared against the SAME scene with Albedo's unthemed default (headless chromium renders in software, so the
// absolute frame time is the machine's, not the theme's): themed p95 must stay within 15 % + 2 ms of that baseline.
async function idle() { for (let i = 0; i < 200; i++) { const c = await info(); if (!c.queued && !c.pending) return; await page.waitForTimeout(50) } }
async function paceVs(label, themedSkin, form, p2 = "ben10", p2Skin = "default") {
  const run = async sk => { await boot("albedo", p2, sk, p2Skin); if (form) await H("benForm", form, "p1"); await frames(40); await idle(); await pacing(30); return pacing(150) }
  const b = await run("default"), t = await run(themedSkin)
  ok(t.p95 <= b.p95 * 1.15 + 2, `frame pacing: ${label} vs unthemed baseline`, `themed ${JSON.stringify(t)} · baseline ${JSON.stringify(b)}`)
}
try {
  await page.goto(`${base}/index.html?harness=1&p1=albedo&p2=ben10`, { waitUntil: "load" })
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 60000 })
  const REG = await page.evaluate(async () => { const m = await import("./albedoThemes.js"); const r = await import("./albedoThemeRegions.js"); const s = await import("./skins.js")
    return { themes: m.ALBEDO_THEMES.map(t => t.id), ids: { kid: m.ALBEDO_THEMES.map(t => m.albedoThemeSkinId("kid", t.id)), older: m.ALBEDO_THEMES.map(t => m.albedoThemeSkinId("older", t.id)) },
      forms: r.ALBEDO_FORM_KEYS, albedoSkins: s.getSkins("albedo").map(x => x.id), benSkins: s.getSkins("ben10").map(x => x.id) } })
  ok(REG.themes.length === 20 && REG.ids.kid.length === 20 && REG.ids.older.length === 20, "registry: 20 themes × kid / older")
  ok(REG.forms.length === 24, "Albedo's transformation list: 24 forms", REG.forms.join(","))
  ok(REG.ids.kid.concat(REG.ids.older).every(id => REG.albedoSkins.includes(id)), "all 40 theme skins in Albedo's select list")
  ok(REG.benSkins.every(id => !/^albedo/.test(id)), "Ben's select list has no Albedo theme skin", REG.benSkins.join(","))

  // ── 0. preserved defaults stay unthemed (older default + kid Classic) ──
  for (const [sk, want] of [["default", 950], ["ben10Classic", 900]]) {
    await boot("albedo", "ben10", sk, "default")
    ok((await lastDrawnFor("p1", d => d !== undefined, 6)) === null, `preserved default "${sk}" draws Albedo's original __albedo art (no theme)`)
    ok((await stats("p1")).maxHealth === want, `default "${sk}" HP ${want}`)
  }

  // ── 1. all 40 combinations × every form ──
  const forms = QUICK ? ["xlr8", "alienx", "heatblast", "diamondhead_ov", "upgrade_ov"] : REG.forms
  let formChecks = 0, formOk = 0; const missingForms = []
  for (const app of ["kid", "older"]) for (let i = 0; i < 20; i++) {
    const n = (app === "kid" ? 0 : 20) + i
    if (!SECTION1 || n < SLICE[0] || n > SLICE[1]) continue
    const id = REG.ids[app][i], th = REG.themes[i]
    await boot("albedo", "ben10", id, "default", ["swampfire", "heatblast", "megawhatt", "goop", "xlr8"])
    const d = await lastDrawnFor("p1", d => !!d && d.includes(`|${th}|${app}|`))
    ok(!!d && d.includes(`|${th}|${app}|`), `· ${id}: human (${app}) themed`, d || "none")
    ok((await info()).lastDrawn.p2 === null, `· ${id}: Ben (p2) draws his own art`)
    const st = await stats("p1"); ok(st.maxHealth === (app === "kid" ? 900 : 950), `· ${id}: HP = ${app === "kid" ? "Classic 900" : "Alien Force 950"}`, st.maxHealth)
    const v = await variantOf("p1"); ok(v?.variant === (app === "kid" ? "classic" : "alienforce"), `· ${id}: variant ${v?.variant}`)
    if (i === 0 || i === 2 || i === 19 || !QUICK) ok(await notBlack(`_albedo_${id}_human.png`), `· ${id}: no black screen (human)`)
    for (const form of forms) {
      await H("benForm", form, "p1"); formChecks++
      const fd = await lastDrawnFor("p1", d => !!d && d.includes(`|${th}|${form}|`))
      if (fd && fd.includes(`|${th}|${form}|`)) formOk++; else missingForms.push(`${id}/${form}:${fd}`)
      if ((i === 2 || i === 19) && app === "older" && ["alienx", "diamondhead_ov", "heatblast", "upgrade_ov", "ghostfreak"].includes(form)) ok(await notBlack(`_albedo_${id}_${form}.png`), `· ${id}: no black screen (${form})`)
    }
    await H("benForm", "human", "p1")
    const back = await lastDrawnFor("p1", d => !!d && d.includes(`|${th}|${app}|`))
    ok(!!back, `· ${id}: revert → human theme restored`, back || "none")
    if (i % 5 === 4) console.log(`  … ${app} ${i + 1}/20`)
  }
  if (SECTION1) ok(formOk === formChecks, `every form themed under every theme (${formOk}/${formChecks} kid+older × form)`, missingForms.slice(0, 6).join(" "))

  if (EXTRAS) {
  // ── 2. real Ultimatrix dial transform + ultimate + KO → rematch ──
  await boot("albedo", "ben10", "albedoOlderRedSingularity" === REG.ids.older[2] ? REG.ids.older[2] : REG.ids.older[2], "default", ["swampfire", "heatblast", "megawhatt", "goop", "xlr8"])
  await H("ben10SetPower", "p1", 100); await omx(["l"])
  const dv = await variantOf("p1"); ok(dv?.form === "megawhatt", "Ultimatrix dial ↓↓+L transforms (real input)", dv?.form)
  ok(!!(await lastDrawnFor("p1", d => !!d && d.includes("|redSingularity|megawhatt|"))), "dial-transformed form is themed")
  await H("ben10SetPower", "p1", 100); await key("u", 3); await frames(40)
  ok(await notBlack("_albedo_ult.png"), "no black screen (ultimate)")
  const ud = await lastDrawnFor("p1", d => !!d && d.includes("|redSingularity|"), 30); ok(!!ud, "theme holds through the ultimate", ud || "none")
  await H("benForm", "human", "p1"); await frames(10)
  await page.evaluate(() => { const f = window.__harness.p2 && null; return f })
  // KO → rematch: a fresh match with the same selection (what Rematch does: startMatch with the stored matchConfig)
  await boot("albedo", "ben10", REG.ids.older[2], "default")
  ok(!!(await lastDrawnFor("p1", d => !!d && d.includes("|redSingularity|older|"))), "rematch / fresh match restores appearance + theme")

  // ── 3. Albedo vs Albedo (different appearance + theme each) ──
  await boot("albedo", "albedo", REG.ids.kid[19], REG.ids.older[4])
  const a1 = await lastDrawnFor("p1", d => !!d && d.includes("|rubyOpal|kid|")), a2 = await lastDrawnFor("p2", d => !!d && d.includes("|bloodPrism|older|"))
  ok(!!a1 && !!a2, "two Albedos: kid Ruby Opal vs older Blood Prism", `${a1} / ${a2}`)
  await H("benForm", "xlr8", "p1"); await H("benForm", "xlr8", "p2")
  const x1 = await lastDrawnFor("p1", d => !!d && d.includes("|rubyOpal|xlr8|")), x2 = await lastDrawnFor("p2", d => !!d && d.includes("|bloodPrism|xlr8|"))
  ok(!!x1 && !!x2, "two Albedos, SAME alien (XLR8): each keeps its own theme", `${x1} / ${x2}`)
  ok(await notBlack("_albedo_mirror_xlr8.png"), "no black screen (mirror, same alien)")

  // ── 4. Albedo vs Ben in the SAME alien; Ben's own skins vs a themed Albedo ──
  for (const benSkin of ["default", "ben10Classic", "ben10_crimson"]) {
    await boot("ben10", "albedo", benSkin, REG.ids.older[3])
    await H("benForm", "diamondhead_ov", "p1"); await H("benForm", "diamondhead_ov", "p2")
    const bd = await lastDrawnFor("p2", d => !!d && d.includes("|redlineVirus|diamondhead_ov|"))
    const bsheet = (await variantOf("p1"))?.sheet || ""
    ok(!!bd && (await info()).lastDrawn.p1 === null && !/__albedo/.test(bsheet), `Ben (${benSkin}) + Albedo both Diamondhead: Ben original art, Albedo Redline Virus`, `${bsheet} / ${bd}`)
  }
  ok(await notBlack("_albedo_vs_ben_diamondhead.png"), "no black screen (Albedo vs Ben, shared alien)")
  // transform pacing: the frames right after a form's FIRST themed use (on-demand generation of the whole form)
  for (const [label, sk] of [["transform (generation frames)", REG.ids.older[0]]]) {
    await boot("albedo", "ben10", "default", "default"); await frames(30); await idle(); await H("benForm", "jetray", "p1"); const b = await pacing(90)
    await boot("albedo", "ben10", sk, "default"); await frames(30); await idle(); await H("benForm", "jetray", "p1"); const t = await pacing(90)
    ok(t.p95 <= b.p95 * 1.15 + 2, `frame pacing: ${label} — Jetray (largest form) vs unthemed`, `themed ${JSON.stringify(t)} · baseline ${JSON.stringify(b)}`)
  }
  await paceVs("Red Singularity Alien X (stars)", REG.ids.older[2], "alienx")
  await paceVs("Ruby Opal kid (glitter)", REG.ids.kid[19], null)
  await paceVs("Ruby Opal Diamondhead vs Ben", REG.ids.older[19], "diamondhead_ov")
  // ── 5. selection flow: the real skin-select screen (43 Albedo cards, portraits load), a real click, save → reload ──
  const sessURL = `${base}/index.html?harness=1&session=1&p1=albedo&p2=ben10`
  await page.goto(sessURL, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 60000 })
  await H("clearSession")
  const want = REG.ids.older[2]
  let sel = await H("showSkinSelect", "albedo", "p1", 0)
  const idx = sel.skins.findIndex(s => s.id === want); sel = await H("showSkinSelect", "albedo", "p1", idx)
  for (let i = 0; i < 40 && !sel.skins.every(s => s.portraitReady); i++) { await page.waitForTimeout(150); sel = await H("showSkinSelect", "albedo", "p1", idx) }
  ok(sel.skins.length === 42 && sel.skins.filter(s => /^albedo/.test(s.id)).length === 40, "skin select: 2 preserved defaults + 40 themes (Prime hidden unless experimental, as before)", sel.skins.length)
  ok(sel.skins.every(s => s.portraitReady), "every Albedo skin portrait loads", sel.skins.filter(s => !s.portraitReady).map(s => s.id).join(","))
  ok(await notBlack("_albedo_skin_select.png"), "no black screen (skin select)")
  const rect = (await H("skinSelectRects"))[idx]
  await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2); await page.waitForTimeout(800)
  const s1 = await H("session"); ok(s1.p1Skin === want, `clicking the card selects "${sel.skins[idx].name}"`, s1.p1Skin)
  await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 60000 })
  const s2 = await H("session"); ok(s2.p1Skin === want, "restart restores the saved Albedo appearance + theme", s2.p1Skin)
  await H("clearSession")

  }
  const ci = await info(); ok(ci.size <= 256, "cache bounded", `size ${ci.size}, generated ${ci.generated}, evicted ${ci.evicted}, maxGenMs ${ci.maxGenMs.toFixed(1)}`)
  ok(jsErrors.length === 0, "no page errors", jsErrors[0] || "")
  ok(my404.length === 0, "no Albedo / Ben asset 404s", [...new Set(my404)].slice(0, 5).join(", "))
} catch (e) { failed++; console.log("FATAL", e) }
finally {
  await browser.close(); server.close()
  console.log(`\nALBEDO THEMES RENDER: ${passed} passed, ${failed} failed`)
  if (fails.length) console.log("FAILED:", fails.slice(0, 20).join(" | "))
  process.exit(failed ? 1 : 0)
}
