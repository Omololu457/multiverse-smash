// harness/violet_skins.test.mjs — Violet Parr PHASE 7: the palette-swap skins are cosmetic only.
// For every skin × every animation strip / FX strip / portrait: the sheet exists, has the default's exact size and
// alpha mask (identical geometry), and the never-recolour colours (skin tones, eye white, "i" logo / belt gold, floor
// shadow) are pixel-identical. The suit really changed, and the invisible strips are tinted. Pixel reads via a canvas
// in the real browser (same decoder the game uses). Render checks per skin: harness/violet_render_check.mjs --skin <id>.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { ck, summary } from './violet_lib.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage()
await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.violetTest)
try {
  const skins = await page.evaluate(() => __harness.violetTest.skins())
  ck('three skins: Supersuit (default), Incredibles 2, Midnight', skins.map(s => s.name).join('|') === 'Supersuit|Incredibles 2|Midnight', skins)
  const res = await page.evaluate(async () => {
    const { VIOLET_SKINS, VIOLET_SKIN_FX } = await import('./violetSkins.js'), { violet } = await import('./violetData.js'), { VIOLET_FX } = await import('./violetSprites.js')
    const load = u => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = u })
    const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
    const KEEP = new Set(['248,200,192', '216,176,160', '144,120,112', '248,248,248', '216,160,32', '160,120,24', '216,224,24', '64,64,64', '32,48,64'])
    const SUIT = new Set(['216,16,56', '176,16,48', '144,16,40']), INV = '64,0,96|80,0,160|80,56,208|104,56,136|128,0,168|184,0,168|184,96,144|184,120,232|192,184,240|208,208,248|248,128,248'.split('|')
    const out = []
    for (const sk of VIOLET_SKINS.filter(s => s.id !== 'default')) {
      const pairs = Object.entries(violet.animationData).map(([k, d]) => [k, d.sheet, sk.animationData[k].sheet])
      for (const k in VIOLET_FX) pairs.push(['fx:' + k, VIOLET_FX[k].sheet, `${VIOLET_SKIN_FX[sk.recolorTag].dir}/${k}.png`])
      pairs.push(['portrait', violet.portrait, sk.portrait])
      const r = { id: sk.id, n: 0, missing: [], size: [], alpha: 0, kept: 0, keptBad: 0, suitChanged: 0, suitSeen: 0, invChanged: 0, invSeen: 0, fxChanged: 0 }
      for (const [k, a, b] of pairs) {
        const A = await load(a), B = await load(b); r.n++
        if (!A || !B) { r.missing.push(k); continue }
        if (A.width !== B.width || A.height !== B.height) { r.size.push(k); continue }
        const pa = px(A), pb = px(B)
        for (let i = 0; i < pa.length; i += 4) {
          if ((pa[i + 3] > 0) !== (pb[i + 3] > 0)) r.alpha++
          if (!pa[i + 3]) continue
          const ca = `${pa[i]},${pa[i + 1]},${pa[i + 2]}`, same = pa[i] === pb[i] && pa[i + 1] === pb[i + 1] && pa[i + 2] === pb[i + 2]
          if (k.startsWith('fx:')) { if (!same) r.fxChanged++; continue }
          if (KEEP.has(ca)) { r.kept++; if (!same) r.keptBad++ }
          if (SUIT.has(ca)) { r.suitSeen++; if (!same) r.suitChanged++ }
          if (INV.includes(ca)) { r.invSeen++; if (!same) r.invChanged++ }
        }
      }
      out.push(r)
    }
    return out
  })
  for (const r of res) {
    ck(`${r.id}: every strip / FX strip / portrait exists (${r.n})`, r.missing.length === 0, r.missing)
    ck(`${r.id}: identical sizes and alpha masks (geometry unchanged)`, r.size.length === 0 && r.alpha === 0, { size: r.size, alpha: r.alpha })
    ck(`${r.id}: skin tones, eye white, "i" logo / belt gold untouched`, r.kept > 1000 && r.keptBad === 0, { kept: r.kept, bad: r.keptBad })
    ck(`${r.id}: every suit-red pixel recoloured`, r.suitSeen > 0 && r.suitChanged === r.suitSeen, { seen: r.suitSeen, changed: r.suitChanged })
    ck(`${r.id}: invisible frames tinted to match`, r.invSeen > 0 && r.invChanged === r.invSeen, { seen: r.invSeen, changed: r.invChanged })
    ck(`${r.id}: force-field FX strips tinted`, r.fxChanged > 1000, r.fxChanged)
  }
} catch (e) { ck('exception', false, e.stack) }
await browser.close(); server.close?.(); process.exit(summary('violet skins (phase 7)') ? 1 : 0)
