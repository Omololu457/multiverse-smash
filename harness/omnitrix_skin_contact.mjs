// harness/omnitrix_skin_contact.mjs [char ...] — close-up contact sheet of the OMNITRIX theme skin: each fighter's idle frame +
// one attack frame, default vs Omnitrix (the exact omniTheme.js recolour the game uses, run in the browser). → docs/skins/omnitrix/contact_*.png
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const OUT = 'docs/skins/omnitrix'; mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true }), pg = await browser.newPage()
await pg.goto(`${server.base}/index.html?harness=1`); await pg.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 90000 })
const want = process.argv.slice(2)
const url = await pg.evaluate(async want => {
  const { characters } = await import('./characters.js'); const { omniRecolor } = await import('./omniTheme.js'); const { getSkins } = await import('./skins.js')
  const keys = want.length ? want : Object.keys(characters).filter(k => getSkins(k).some(s => s.id === k + '_omnitrixTheme'))
  const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
  const cells = []
  for (const k of keys) {
    const A = characters[k].animationData || {}
    const pick = [A.idle || A.stand || Object.values(A)[0], A.light || A.heavy || A.special || A.walk].filter(d => d?.sheet)
    const row = []
    for (const d of pick) {
      const im = await load(d.sheet); if (!im) continue
      const fw = d.width || d.frameWidth || im.naturalWidth, fh = d.height || d.frameHeight || im.naturalHeight
      const fi = d === pick[1] ? Math.min(2, Math.max(0, Math.floor(im.naturalWidth / fw) - 1)) : 0
      const c = document.createElement('canvas'); c.width = fw; c.height = Math.min(fh, im.naturalHeight); const g = c.getContext('2d'); g.drawImage(im, fi * fw, 0, fw, c.height, 0, 0, fw, c.height)
      const o = document.createElement('canvas'); o.width = im.naturalWidth; o.height = im.naturalHeight; const og = o.getContext('2d'); og.drawImage(im, 0, 0)
      const data = og.getImageData(0, 0, o.width, o.height); omniRecolor(data.data, o.width, o.height); og.putImageData(data, 0, 0)
      const c2 = document.createElement('canvas'); c2.width = fw; c2.height = c.height; c2.getContext('2d').drawImage(o, fi * fw, 0, fw, c.height, 0, 0, fw, c.height)
      const trim = cv => { const g = cv.getContext('2d'), D = g.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1
        for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (D[(y * cv.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
        return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1] }
      const bb = trim(c); if (!bb) continue
      const cut = cv => { const t = document.createElement('canvas'); t.width = bb[2]; t.height = bb[3]; t.getContext('2d').drawImage(cv, bb[0], bb[1], bb[2], bb[3], 0, 0, bb[2], bb[3]); return t }
      row.push(cut(c), cut(c2))
    }
    cells.push([k, row])
  }
  const S = 3, H = Math.max(...cells.map(([, r]) => Math.max(0, ...r.map(c => c.height)))) * S + 18
  const cols = 4, colW = Math.max(...cells.map(([, r]) => r.reduce((a, c) => a + c.width * S + 4, 0))) + 8
  const out = document.createElement('canvas'); out.width = cols * colW; out.height = Math.ceil(cells.length / cols) * H
  const g = out.getContext('2d'); g.fillStyle = '#2e3038'; g.fillRect(0, 0, out.width, out.height); g.imageSmoothingEnabled = false
  cells.forEach(([k, r], i) => { const x0 = (i % cols) * colW, y0 = Math.floor(i / cols) * H; g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(k, x0 + 4, y0 + 12); let x = x0 + 4
    for (const c of r) { g.drawImage(c, x, y0 + 16, c.width * S, c.height * S); x += c.width * S + 4 } })
  return out.toDataURL('image/png')
}, want)
const name = want.length ? want.slice(0, 3).join('_') : 'all'
writeFileSync(`${OUT}/contact_${name}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', `${OUT}/contact_${name}.png`)
await browser.close(); server.close?.(); process.exit(0)
