// Ben 10 THEME contact sheets: boots a headless page on the REAL recolour module (benThemeRecolor.js) and renders, per sprite
// set, its idle pose (+ an attack pose) under the original and all 20 themes, labelled, at gameplay scale and enlarged
// nearest-neighbour. Output: docs/ben10/skins/img/contact_<set>.png + contact_humans.png + contact_aliens.png.
//   node tools/ben10/theme_contact_sheets.mjs [set ...]
import { chromium } from "playwright"
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const OUT = path.join(ROOT, "docs/ben10/skins/img"); fs.mkdirSync(OUT, { recursive: true })
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ogg": "audio/ogg", ".mp3": "audio/mpeg", ".wav": "audio/wav" }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d) }) }); s.listen(0, "127.0.0.1", () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
// each set's idle + one attack strip and its frame width, read from the game's own animation tables
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
page.on("pageerror", e => console.log("pageerror:", String(e).slice(0, 200)))
await page.goto(`${base}/index.html?harness=1`); await page.waitForFunction(() => !!window.__harness, null, { timeout: 30000 })
const only = process.argv.slice(2)
const res = await page.evaluate(async (only) => {
  const { BEN_THEMES } = await import("./benThemes.js")
  const { BEN_THEME_REGIONS } = await import("./benThemeRegions.js")
  const { recolorImageData } = await import("./benThemeRecolor.js")
  const { characters } = await import("./characters.js")
  const { getAlienDefinition } = await import("./aliens.js")
  const sk = await import("./skins.js")
  const classic = sk.getSkinAnimationData("ben10", "ben10Classic")
  const animOf = async key => {
    if (key === "jacket") return characters.ben10.animationData
    if (key === "classic") return classic
    if (key === "swampfire") return (await import("./swampfireAssets.js")).SWAMPFIRE_ANIM
    return getAlienDefinition(key)?.anim || null
  }
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = "./" + src.replace(/^\.\//, "") })
  const out = {}
  for (const key of Object.keys(BEN_THEME_REGIONS)) {
    if (only.length && !only.includes(key)) continue
    const A = await animOf(key); if (!A?.idle) { out[key] = { err: "no anim" }; continue }
    const poses = [A.idle, A.light || A.attack || A.heavy || A.special || A.walk].filter(Boolean)
    const imgs = []
    for (const p of poses) { const im = await load(p.sheet); if (im) imgs.push({ im, fw: p.width || im.naturalHeight, fh: p.height || im.naturalHeight, sx: p.sourceX || 0, sy: p.sourceY || 0 }) }
    if (!imgs.length) { out[key] = { err: "no sheet" }; continue }
    const cols = [null, ...BEN_THEMES.map(t => t.id)], SC = 2, PAD = 6, LAB = 26
    const cellW = Math.max(110, Math.max(...imgs.map(x => x.fw)) * SC + PAD), cellH = imgs.reduce((a, x) => a + x.fh * SC + PAD, 0) + LAB
    const per = 7, rows = Math.ceil(cols.length / per)
    const cv = document.createElement("canvas"); cv.width = per * cellW + PAD; cv.height = rows * cellH + 30
    const cx = cv.getContext("2d"); cx.fillStyle = "#1b2233"; cx.fillRect(0, 0, cv.width, cv.height); cx.imageSmoothingEnabled = false
    cx.fillStyle = "#fff"; cx.font = "bold 14px Arial"; cx.fillText(`${BEN_THEME_REGIONS[key].label} — original + 20 themes (×${SC} nearest-neighbour; each cell: idle, then an attack pose)`, 6, 18)
    cols.forEach((tid, ci) => {
      const X = (ci % per) * cellW + PAD, Y = Math.floor(ci / per) * cellH + 30
      cx.fillStyle = "#cbd5e1"; cx.font = "bold 10px Arial"
      const nm = tid ? BEN_THEMES[ci - 1].name : "original", k = nm.lastIndexOf(" — ")
      const l1 = tid ? `${ci}. ${nm.slice(0, k)}` : "original", l2 = tid ? nm.slice(k + 3) : ""
      const clip = t => { let o = t; while (o.length > 3 && cx.measureText(o).width > cellW - 8) o = o.slice(0, -1); return o }
      cx.fillText(clip(l1), X, Y + 10); cx.font = "10px Arial"; cx.fillText(clip(l2), X, Y + 22)
      let y = Y + LAB
      for (const p of imgs) {
        const c = document.createElement("canvas"); c.width = p.fw; c.height = p.fh
        const g = c.getContext("2d"); g.drawImage(p.im, p.sx, p.sy, p.fw, p.fh, 0, 0, p.fw, p.fh)
        if (tid) { const d = g.getImageData(0, 0, p.fw, p.fh); recolorImageData(d.data, p.fw, p.fh, key, tid); g.putImageData(d, 0, 0) }
        cx.drawImage(c, X, y, p.fw * SC, p.fh * SC); y += p.fh * SC + PAD
      }
    })
    out[key] = { png: cv.toDataURL("image/png") }
  }
  return out
}, only)
for (const [k, v] of Object.entries(res)) {
  if (v.err) { console.log("SKIP", k, v.err); continue }
  fs.writeFileSync(path.join(OUT, `contact_${k}.png`), Buffer.from(v.png.split(",")[1], "base64")); console.log("wrote", k)
}
await browser.close(); server.close()
