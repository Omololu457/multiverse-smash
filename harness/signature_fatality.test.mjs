// harness/signature_fatality.test.mjs — SIGNATURE FATALITIES: in the match-end FINISH window the winner presses SPECIAL (L) and
// performs their defining technique in the arena (Gojo → HOLLOW PURPLE, the map goes black, the victim is erased). One fighter
// per effect kind (19) + a check that every roster fighter has an entry.
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".ogg": "audio/ogg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++ }
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on("pageerror", e => errors.push(String(e)))
const sleep = t => new Promise(r => setTimeout(r, t))
const OUT = path.join(ROOT, "harness", "shots", "signature_fatality"); fs.mkdirSync(OUT, { recursive: true })
const ONLY = process.argv[2] ? process.argv[2].split(",") : null
const CASES = ["gojo:void", "goku:beam", "zoro:slash", "sukuna:dismantle", "itachi:fire", "frozone:ice", "sasuke:lightning", "madara:crush", "saitama:punch", "obito:vortex",
  "flash:blitz", "green_arrow:barrage", "gaara:bind", "soldier_boy:explode", "beerus:erase", "shinobu:poison", "saiki:psychic", "light:note", "jesus:holy"].filter(c => !ONLY || ONLY.includes(c.split(":")[0]))
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1`, { waitUntil: "load" })
  const cov = await page.evaluate(async () => { const [m, s] = await Promise.all([import("./characters.js"), import("./signatureFatality.js")]); const C = m.characters || m.default; return Object.keys(C).filter(k => !C[k].hidden && !s.SIGNATURE_TABLE[k]) })
  check("every roster fighter has a signature fatality", cov.length === 0, JSON.stringify(cov))
  const noAct = await page.evaluate(async () => { const [m, s] = await Promise.all([import("./characters.js"), import("./signatureFatality.js")]); const C = m.characters || m.default
    return Object.keys(C).filter(k => !C[k].hidden).filter(k => { const A = C[k].animationData || {}, p = s.signatureFatalityPlan({ ...C[k], rosterKey: k, animationData: undefined }); return !(p.windup in A && p.release in A && p.strikes.length && p.strikes.every(a => a in A)) }) })
  const fl = await page.evaluate(async () => { const [m, s] = await Promise.all([import("./characters.js"), import("./signatureFatality.js")]); const C = m.characters || m.default
    const ks = Object.keys(C).filter(k => !C[k].hidden), all = ks.map(k => ({ k, L: s.fatalityList({ rosterKey: k }) })), dup = all.filter(({ L }) => new Set(L.map(e => e.slot)).size !== L.length).map(({ k }) => k)
    const noAct = all.flatMap(({ k, L }) => L.map(e => ({ k, e, p: s.signatureFatalityPlan({ ...C[k], rosterKey: k, animationData: undefined }, e) }))).filter(({ k, p }) => { const A = C[k].animationData || {}; return !(p.windup in A && p.release in A) }).map(({ k, e }) => k + ":" + e.name)
    return { total: all.reduce((n, a) => n + a.L.length, 0), specials: all.reduce((n, a) => n + a.L.length - 1, 0), dup, noAct: noAct.slice(0, 5), nNoAct: noAct.length } })
  check(`every special in every move list has its own fatality (${fl.specials} special + ${fl.total - fl.specials} signature) on a unique input`, fl.specials > 400 && fl.dup.length === 0, JSON.stringify(fl.dup))
  check("…and every one of them is acted with the fighter's own strips", fl.nNoAct === 0, JSON.stringify(fl.noAct))
  check("every roster fighter ACTS their fatality with their own strips (wind-up, release, strikes all exist)", noAct.length === 0, JSON.stringify(noAct))
  for (const cs of CASES) { const [key, kind] = cs.split(":")
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?harness=1&p1=${key}&p2=naruto`, { waitUntil: "load" })
    await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 }); await page.mouse.click(640, 360)
    await page.evaluate(() => { window.__harness.start({ mode: "vs", difficulty: "dummy" }); window.__harness.skipToBattle() })
    await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" && s.countdown === 0 }, null, { timeout: 60000, polling: 50 })
    await page.evaluate(() => window.__harness.forceP1MatchWin())
    let w = null; for (let i = 0; i < 150 && w?.phase !== "window"; i++) { w = await page.evaluate(async () => (await import("./fatalityCinematic.js")).fatalityStatus()); await sleep(100) }
    if (key === "jesus") { check("jesus: no FINISH window — the existing rule (a match with Jesus ends in the heavenly ascension, never a fatality)", w?.phase !== "window", JSON.stringify(w)); continue }
    if (w?.phase !== "window") { check(`${key}: FINISH window`, false, JSON.stringify(w)); continue }
    const fwd = key === "gojo" && process.env.FWD !== "0"   // Gojo: forward + Special → BLUE (LAPSE), a SPECIAL fatality
    await sleep(200); if (fwd) { await page.keyboard.down("KeyD"); await sleep(80) } await page.keyboard.down("KeyL"); await sleep(120); await page.keyboard.up("KeyL"); if (fwd) await page.keyboard.up("KeyD")
    const S = () => page.evaluate(async () => (await import("./signatureFatality.js")).signatureFatalityState())
    let st = null, seen = null, gone = false, shot = 0
    let gore = null
    for (let i = 0; i < 600; i++) { st = await S(); if (st.phase) { seen = st; gone ||= st.gone; if (st.gore && (!gore || st.gore.parts + st.gore.decals > gore.parts + gore.decals)) gore = st.gore; if (st.t >= [20, 64, 110, 170][shot]) await page.screenshot({ path: path.join(OUT, `${key}_${shot++}.png`) }) } else if (seen) break; await sleep(30) }
    const g = await page.waitForFunction(() => window.__harness.state().gameState === "victory", null, { timeout: 30000 }).then(() => true, () => false)
    if (key === "gojo") check("gojo: FORWARD + SPECIAL → his special fatality BLUE (LAPSE)", /BLUE/.test(seen?.name || ""), seen?.name)
    check(`${key}: GORE — blood pools${["note"].includes(kind) ? "" : " + spray"} (limbs / organs when torn apart)`, gore && gore.decals > 0 && (gore.limbs > 0 || gore.organs > 0 || ["note", "poison", "barrage", "lightning", "punch", "holy"].includes(kind) || /BLUE/.test(seen?.name || "")), JSON.stringify(gore))
    check(`${key}: ${seen?.name} (${kind}) plays in the arena, the victim dies, then victory`, (seen?.kind === kind || key === "gojo") && (gone || kind === "note" || kind === "poison" || kind === "barrage" || kind === "lightning") && g, JSON.stringify({ k: seen?.kind, t: seen?.t, gone, victory: g }))
  }
  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "))
} catch (e) { check("run", false, String(e).slice(0, 300)) }
await browser.close(); server.close()
console.log(`signature_fatality: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
