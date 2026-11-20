// harness/blood_sheets.mjs — MSV1-BLOOD contact sheets: for each character, key frames (idle, walk, attack, hurt, jump,
// knockdown) drawn 3× with (row 1) the body-map anchors + eye box and (row 2) TIER 4 blood painted by the REAL runtime
// painter (battleBlood.js), clipped exactly as in a match.
//   node harness/blood_sheets.mjs [key1,key2,...|all] [--montage out.png --per 4]
// Writes docs/msv1/blood/sheets/<id>.png (+ an optional montage of several sheets for quick review).
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' }
const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
let keys = (args[0] && !args[0].startsWith('--') ? args[0] : 'all')
if (keys === 'all') keys = fs.readdirSync(path.join(ROOT, 'data/bloodmaps')).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort()
else keys = keys.split(',')
const OUT = path.join(ROOT, 'docs/msv1/blood/sheets'); fs.mkdirSync(OUT, { recursive: true })
// EXTRA=1: review the runtime-only strips (tools/bloodmap/extra_defs.json) — written to EXTRA_OUT (default <tmp>/blood_extra), never to docs
const EXTRA_OUT = process.env.EXTRA_OUT || path.join(os.tmpdir(), 'blood_extra'); if (process.env.EXTRA) fs.mkdirSync(EXTRA_OUT, { recursive: true })
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) return res.writeHead(403).end(); fs.readFile(f, (e, d) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto(`${base}/__blank__`)
const errs = []; page.on('pageerror', e => errs.push(e.message))
const results = []
for (const key of keys) {
  const r = await page.evaluate(async ([key, EXTRA]) => {
    const B = await import('/battleBlood.js?' + Date.now())
    const map = await (await fetch(`/data/bloodmaps/${key}.json`)).json()
    const WANT = [['idle'], ['walk', 'run'], ['light', 'heavy', 'attack'], ['hurt', 'hit'], ['jump', 'fall'], ['knockdown', 'down', 'lose']]
    const picks = []
    for (const alts of WANT) {
      let k = null, act = null
      for (const a of alts) { const e = [...Object.entries(map.byAction)].find(([n]) => n.split('|')[0] === a); if (e) { k = e[1]; act = a; break } }
      if (!k) continue
      const [sheet, sx, sy, w, h, n] = k.split('|'); const ids = map.index[k]
      let i = Math.min(ids.length - 1, Math.floor(Number(n) / 2)); while (i > 0 && ids[i] < 0) i--
      if (ids[i] < 0) continue
      picks.push({ act, sheet, sx: +sx, sy: +sy, w: +w, h: +h, n: +n, i, fm: map.frames[ids[i]] })
    }
    if (EXTRA) {   // review mode: the runtime-only strips (tools/bloodmap/extra_defs.json) instead of the key frames
      picks.length = 0
      const xd = await (await fetch('/tools/bloodmap/extra_defs.json')).json()
      for (const d of (xd[key] || xd[key.toLowerCase()] || [])) {
        const k = [d.sheet, d.sx, d.sy, d.w, d.h, d.n].join('|'), ids = map.index[k]; if (!ids) continue
        let i = Math.min(ids.length - 1, Math.floor(d.n / 2)); while (i > 0 && ids[i] < 0) i--
        if (ids[i] >= 0) picks.push({ act: d.act + '*', sheet: d.sheet, sx: d.sx, sy: d.sy, w: d.w, h: d.h, n: d.n, i, fm: map.frames[ids[i]] })
      }
    }
    if (!picks.length) return { key, err: 'no key frames' }
    const imgs = await Promise.all([...new Set(picks.map(p => p.sheet))].map(s => new Promise(res => { const im = new Image(); im.onload = () => res([s, im]); im.onerror = () => res([s, null]); im.src = '/' + s })))
    const IM = Object.fromEntries(imgs)
    // a TIER 4 fighter with wounds of every kind in every region (the real hit path)
    B.bloodMatchStart(1234)
    B.bloodSetLevelSource(() => 'full')
    const f = { rosterKey: key, side: 'cs', health: 80, maxHealth: 1000, facing: 1, x: 0, y: 0, w: 60, h: 100, grounded: true, vx: 0 }
    const hits = [[30, 8, 'blunt'], [30, 14, 'slash'], [30, 40, 'blunt'], [52, 46, 'slash'], [5, 45, 'pierce'], [30, 70, 'slash'], [30, 88, 'blunt'], [30, 30, 'energy']]
    hits.forEach(([x, y, t], j) => B.bloodHit({ target: f, attacker: null, x, y, damage: 60, damageType: t, frame: 10 + j * 40 }))   // mixed ages: fresh → drying
    B.bloodTick(f, 60, 100, null)
    for (let k = 0; k < 200 && !B.bloodMapReady(key); k++) await new Promise(r => setTimeout(r, 20))
    for (let t = 0; t < 420; t++) B.bloodTickWorld(t)
    // crop every frame to its opaque box (+ margin) and scale the body to ~190 px tall so small sprites stay readable
    for (const p of picks) {
      const im = IM[p.sheet]; if (!im) continue
      const t = document.createElement('canvas'); t.width = p.w; t.height = p.h; const tg = t.getContext('2d'); tg.drawImage(im, p.sx + p.i * p.w, p.sy, p.w, p.h, 0, 0, p.w, p.h)
      const A = tg.getImageData(0, 0, p.w, p.h).data; let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1
      for (let q = 0; q < p.w * p.h; q++) if (A[q * 4 + 3] >= 128) { const qx = q % p.w, qy = (q / p.w) | 0; if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy }
      const m = 3; p.cx = Math.max(0, x0 - m); p.cy = Math.max(0, y0 - m); p.cw = Math.min(p.w, x1 + m + 1) - p.cx; p.ch = Math.min(p.h, y1 + m + 1) - p.cy
      if (x1 < 0) { p.cx = 0; p.cy = 0; p.cw = p.w; p.ch = p.h }
    }
    const bodyH = Math.max(...picks.map(p => p.ch || 1))
    const S = Math.max(1, Math.min(7, Math.round(190 / bodyH))), pad = 6, label = 14
    const W = picks.reduce((a, p) => a + p.cw * S + pad, pad), Hh = Math.max(...picks.map(p => p.ch)) * S
    const cv = document.createElement('canvas'); cv.width = W; cv.height = label + Hh * 2 + pad * 3
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false
    g.fillStyle = '#1b1d22'; g.fillRect(0, 0, cv.width, cv.height)
    g.fillStyle = '#e8e8e8'; g.font = '11px monospace'; g.fillText(`${key} — ${map.name || ''} · fluid ${B.bloodFluidOf(f)} · row 1 anchors / eye box · row 2 TIER 4`, 4, 11)
    const COL = ['#ff4040', '#ff4040', '#ff4040', '#ff4040', '#ffc800', '#ffc800', '#ffc800', '#00c8ff', '#00c8ff', '#00c8ff', '#78ff50', '#78ff50']
    let x = pad, coverMax = 0, eyeHits = 0, outside = 0
    for (const p of picks) {
      const im = IM[p.sheet]; if (!im) continue
      const fx = p.sx + p.i * p.w
      for (const row of [0, 1]) {
        const y = label + pad + row * (Hh + pad)
        g.fillStyle = '#2a2e36'; g.fillRect(x, y, p.cw * S, p.ch * S)
        g.drawImage(im, fx + p.cx, p.sy + p.cy, p.cw, p.ch, x, y, p.cw * S, p.ch * S)
        const ox = x - p.cx * S, oy = y - p.cy * S   // frame origin for anchor / blood placement
        if (row === 0) {
          const e = p.fm.e
          if (e[0] >= 0) { g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.strokeRect(ox + e[0] * S, oy + e[1] * S, (e[2] - e[0] + 1) * S, (e[3] - e[1] + 1) * S) }
          for (let j = 0; j < 12; j++) { const ax = p.fm.a[j * 3], ay = p.fm.a[j * 3 + 1]; if (ax < 0) continue; g.fillStyle = COL[j]; g.fillRect(ox + ax * S - 1, oy + ay * S - 1, S + 2, S + 2) }
          g.fillStyle = '#cfcfcf'; g.fillText(p.act, x + 2, y + 10)
        } else {
          f._lastDrawX = 0; f._lastDrawY = 0; f._lastDrawW = p.w
          const bc = B.bloodFrame(f, { sheet: p.sheet, sourceX: p.sx, sourceY: p.sy, width: p.w, height: p.h, frames: p.n }, p.i, p.act, im, fx, p.sy, 420)
          if (bc) {
            g.drawImage(bc, p.cx, p.cy, p.cw, p.ch, x, y, p.cw * S, p.ch * S)
            // verification: coverage ≤ 15 %, nothing outside the alpha, nothing in the eye box
            const t = document.createElement('canvas'); t.width = p.w; t.height = p.h; const tg = t.getContext('2d'); tg.drawImage(im, fx, p.sy, p.w, p.h, 0, 0, p.w, p.h)
            const A = tg.getImageData(0, 0, p.w, p.h).data, Bd = bc.getContext('2d').getImageData(0, 0, p.w, p.h).data
            let op = 0, bl = 0; const e = p.fm.e
            for (let q = 0; q < p.w * p.h; q++) { const a = A[q * 4 + 3] >= 128; if (a) op++; if (Bd[q * 4 + 3] > 0) { bl++; if (A[q * 4 + 3] === 0) outside++; const qx = q % p.w, qy = (q / p.w) | 0; if (e[0] >= 0 && qx >= e[0] && qx <= e[2] && qy >= e[1] && qy <= e[3]) eyeHits++ } }
            coverMax = Math.max(coverMax, bl / Math.max(1, op))
          }
        }
      }
      x += p.cw * S + pad
    }
    return { key, png: cv.toDataURL('image/png'), frames: picks.length, coverMax, eyeHits, outside, unique: map.frames.length, indexed: Object.values(map.index).reduce((a, v) => a + v.length, 0), overrides: Object.keys(map.overrides || {}).length, fluid: B.bloodFluidOf(f) }
  }, [key, !!process.env.EXTRA])
  if (r.err) { console.log(`  ⚠️  ${key}: ${r.err}`); results.push(r); continue }
  fs.writeFileSync(path.join(process.env.EXTRA ? EXTRA_OUT : OUT, `${key}.png`), Buffer.from(r.png.split(',')[1], 'base64'))
  delete r.png; results.push(r)
  console.log(`  ${r.coverMax <= 0.15 && !r.eyeHits && !r.outside ? '✅' : '❌'} ${key.padEnd(22)} frames ${r.frames} · coverage max ${(r.coverMax * 100).toFixed(1)}% · eye px ${r.eyeHits} · outside-body px ${r.outside} · fluid ${r.fluid}`)
}
if (!process.env.EXTRA) fs.writeFileSync(path.join(ROOT, 'docs/msv1/blood/sheets_results.json'), JSON.stringify(results, null, 1))
if (errs.length) console.log('page errors:', errs.slice(0, 3))
await browser.close(); server.close()
