// harness/omni_preview.mjs [key …] — OFFLINE look-dev for the Omnitrix theme (omniTheme.js): for each fighter, the idle +
// an attack frame, ORIGINAL vs OMNITRIX (with the chest badge exactly where drawDnaEmblem puts it), zoomed ×3 on a dark plate.
// No match is booted — the real module recolours the real sheets in the page. → OUT/omni_<n>.png (6 fighters per image)
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const OUT = process.env.OMNI_OUT || 'docs/skins/omnitrix/preview'; mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.on('pageerror', e => console.log('pageerror', e.message))
await page.goto(`${server.base}/index.html?harness=1`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 120000 })
let keys = process.argv.slice(2)
if (!keys.length) keys = await page.evaluate(async () => { const { characters: C } = await import('./characters.js'); return Object.keys(C).filter(k => !C[k].hidden && C[k].hasSprites !== false && C[k].isPlayable !== false) })
const PER = 6
for (let b = 0; b * PER < keys.length; b++) {
  const chunk = keys.slice(b * PER, b * PER + PER)
  const url = await page.evaluate(async ([chunk, PAL]) => {
    const { characters: C } = await import('./characters.js'), T = await import('./omniTheme.js'), FX = await import('./dnaScanFx.js')
    const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
    const SC = 3, CW = 150, CH = 150, rows = []
    for (const k of chunk) {
      const A = C[k].animationData || {}
      const acts = ['idle', 'heavy', 'light', 'special', 'run'].filter(a => A[a]?.sheet).slice(0, 2)
      const cells = []
      // the colour decision: ONE analysis of the idle frame, shared by every sheet (exactly what dnaScanFx does)
      const id0 = A.idle || A[acts[0]], im0 = await load(id0.sheet); let ref = null
      if (im0) { const c0 = document.createElement('canvas'); c0.width = im0.naturalWidth; c0.height = im0.naturalHeight; const g0 = c0.getContext('2d', { willReadFrequently: true }); g0.drawImage(im0, 0, 0); const dd0 = g0.getImageData(0, 0, c0.width, c0.height); ref = T.omniAnalyze(dd0.data, c0.width, c0.height, id0.width || id0.frameWidth || 0, id0.height || id0.frameHeight || 0) }
      for (const act of acts) {
        const d = A[act], im = await load(d.sheet); if (!im) continue
        const fw = d.width || d.frameWidth || im.naturalWidth, fh = d.height || d.frameHeight || im.naturalHeight
        const n = Math.max(1, Math.floor(im.naturalWidth / fw)), fi = act === 'idle' ? 0 : Math.min(n - 1, Math.floor(n / 2))
        // the whole sheet goes through the real recolour (it reads sheet-wide colour stats), then one frame is cut
        const sc = document.createElement('canvas'); sc.width = im.naturalWidth; sc.height = im.naturalHeight
        const g = sc.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0)
        const id = g.getImageData(0, 0, sc.width, sc.height); T.omniRecolor(id.data, sc.width, sc.height, ref, PAL, { fw, fh }); g.putImageData(id, 0, 0)
        sc.complete = true; sc.naturalWidth = sc.width; sc.naturalHeight = sc.height
        for (const [src, badge] of [[im, false], [sc, true]]) {
          const c = document.createElement('canvas'); c.width = fw; c.height = fh; const cg = c.getContext('2d'); cg.drawImage(src, fi * fw, 0, fw, fh, 0, 0, fw, fh)
          cells.push({ c, badge, src: sc, sx: fi * fw, fw, fh })
        }
      }
      rows.push({ k, cells })
    }
    const W = 160 + 4 * (CW * SC / 2 + 10), out = document.createElement('canvas')
    const rowH = CH * SC / 2 + 20; out.width = Math.round(W); out.height = rows.length * rowH
    const o = out.getContext('2d'); o.fillStyle = '#1b1f27'; o.fillRect(0, 0, out.width, out.height); o.imageSmoothingEnabled = false
    rows.forEach((r, ri) => {
      const y0 = ri * rowH; o.fillStyle = '#e8e8e8'; o.font = '16px sans-serif'; o.fillText(r.k, 8, y0 + 24)
      r.cells.forEach((cl, ci) => {
        // fit the opaque box into the cell
        const g = cl.c.getContext('2d'), dd = g.getImageData(0, 0, cl.fw, cl.fh).data; let x0 = cl.fw, y0b = cl.fh, x1 = -1, y1 = -1
        for (let y = 0; y < cl.fh; y++) for (let x = 0; x < cl.fw; x++) if (dd[(y * cl.fw + x) * 4 + 3] > 30) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0b) y0b = y; if (y > y1) y1 = y }
        if (x1 < 0) return
        const bw = x1 - x0 + 1, bh = y1 - y0b + 1, cw = CW * SC / 2, ch = CH * SC / 2 + 8, k = Math.min(cw / bw, ch / bh, 4)
        const dx = 160 + ci * (cw + 10) + (cw - bw * k) / 2, dy = y0 + 4 + (ch - bh * k)
        o.drawImage(cl.c, x0, y0b, bw, bh, dx, dy, bw * k, bh * k)
        if (cl.badge) {   // the in-game badge: drawDnaEmblem on a fake fighter whose drawn rect is this cell
          const f = { skinId: 'x_omnitrixTheme', _dnaScheme: PAL === 'omni' ? null : PAL, _lastDrawX: dx - x0 * k, _lastDrawY: dy - y0b * k, _lastDrawW: cl.fw * k, _lastDrawH: cl.fh * k }
          FX.drawDnaEmblem(o, f, cl.src, cl.sx, 0, cl.fw, cl.fh, false)
        }
      })
    })
    return out.toDataURL('image/png')
  }, [chunk, process.env.OMNI_PAL || 'omni'])
  writeFileSync(`${OUT}/omni_${String(b).padStart(2, '0')}.png`, Buffer.from(url.split(',')[1], 'base64'))
  console.log('wrote', b, chunk.join(','))
}
await browser.close(); server.close?.()
