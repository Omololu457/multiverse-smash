// harness/controls_lab_common.mjs — shared setup for the CONTROLS LAB harnesses (static server, browser, error +
// failed-request capture across the Lab page AND the embedded game iframe, fake standard gamepad, check()).
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".svg": "image/svg+xml", ".woff2": "font/woff2" }

export async function startServer() {
  const server = await new Promise(r => {
    const s = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u)
      if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return }
      fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) })
    })
    s.listen(0, "127.0.0.1", () => r(s))
  })
  return { server, base: `http://127.0.0.1:${server.address().port}` }
}

export async function launch() {
  return chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] })
}

// Every console error / page error / failed or 4xx-5xx request, from the Lab and the game iframe.
export function watchErrors(page) {
  const errs = []
  page.on("console", m => { if (m.type() === "error") errs.push(`console: ${m.text()}`) })
  page.on("pageerror", e => errs.push(`pageerror: ${e.message}`))
  page.on("requestfailed", r => { const f = r.failure()?.errorText || ""; if (!/ERR_ABORTED/.test(f)) errs.push(`requestfailed: ${r.url()} ${f}`) })
  page.on("response", r => { if (r.status() >= 400) errs.push(`HTTP ${r.status()}: ${r.url()}`) })
  return errs
}

// A standard-mapping pad that tests mutate (window.__pad); installed before any page script runs.
export const FAKE_PAD = () => {
  // a real pad is one device for the whole page: the game's iframe sees the SAME pad as the Lab
  if (window !== window.top) { try { navigator.getGamepads = () => window.top.navigator.getGamepads() } catch (_) {} return }
  window.__pad = { id: "Lab test pad (DualSense) (STANDARD GAMEPAD)", index: 0, connected: true, mapping: "standard", timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, touched: false, value: 0 })) }
  window.__padOn = false
  const orig = navigator.getGamepads?.bind(navigator)
  navigator.getGamepads = () => window.__padOn ? [window.__pad, null, null, null] : (orig ? orig() : [])
}
export const PAD = { CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3, L1: 4, R1: 5, L2: 6, R2: 7, CREATE: 8, OPTIONS: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, TOUCHPAD: 17 }

export function checker() {
  let pass = 0, fail = 0; const failures = []
  const check = (n, c, d = "") => { if (c) pass++; else { fail++; failures.push(`${n}${d ? ` — ${d}` : ""}`) } console.log(`  ${c ? "✅ PASS" : "❌ FAIL"} ${n}${d ? `  — ${d}` : ""}`) }
  return { check, get pass() { return pass }, get fail() { return fail }, failures }
}

// `on` = a Browser (fresh context) or a BrowserContext (shares localStorage with earlier pages)
export async function openLab(on, base, char = "goku", { pad = false, viewport = { width: 1280, height: 720 } } = {}) {
  const page = on.contexts ? await (await on.newContext({ viewport })).newPage() : await on.newPage()
  if (pad) await page.addInitScript(FAKE_PAD)
  const errs = watchErrors(page)
  await page.goto(`${base}/controls.html?char=${char}`, { waitUntil: "domcontentloaded", timeout: 120000 })
  await page.waitForFunction(() => window.__lab?.eng.ready && window.__lab.S.key && !document.querySelector("#app.booting"), null, { timeout: 120000 })
  return { page, errs }
}

// The MAIN GAME's own errors on a plain boot (index.html, no Lab): pre-existing, reported separately. The Lab must
// add ZERO errors on top of these. URLs are compared without host:port.
export const normErr = e => e.replace(/https?:\/\/127\.0\.0\.1:\d+/g, "")
export async function gameBaselineErrors(browser, base) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } }), page = await ctx.newPage()
  const errs = watchErrors(page)
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=goku`)
  await page.waitForFunction(() => window.__harness?.boot, null, { timeout: 30000 })
  await page.evaluate(() => window.__harness.boot()); await page.waitForTimeout(2500)
  // + every portrait the game's own character data points at (the select / Academy screens load these)
  const missing = await page.evaluate(async () => {
    const sc = document.createElement("script"); sc.type = "module"
    sc.textContent = `import { characters } from "./characters.js"; window.__baseChars = characters`; document.head.appendChild(sc)
    for (let i = 0; i < 200 && !window.__baseChars; i++) await new Promise(r => setTimeout(r, 25))
    const urls = [...new Set(Object.values(window.__baseChars || {}).map(c => c && c.portrait).filter(Boolean))]
    const out = []
    for (const u of urls) { try { const r = await fetch(u, { method: "HEAD" }); if (!r.ok) out.push(new URL(u, location.href).pathname) } catch (_) {} }
    return out
  })
  await ctx.close()
  const set = new Set(errs.map(normErr))
  for (const m of missing) set.add(`HTTP 404: ${m}`)
  return set
}
export const newErrors = (errs, baseline) => [...new Set(errs.map(normErr))].filter(e => !baseline.has(e))

// Split keys into n round-robin buckets.
export const buckets = (arr, n) => { const out = Array.from({ length: n }, () => []); arr.forEach((k, i) => out[i % n].push(k)); return out }
