// harness/alien_skins_shots.mjs — live check of the Ben 10 alien skins (tools/alienskins/build.py) on Rick / Rick Prime /
// Tobirama: equips each skin in a real match, checks the sheets it draws are the __<tag> ones and loaded, screenshots it.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const OUT = 'docs/skins/alien/live'; mkdirSync(OUT, { recursive: true })
const TAGS = ['Upgrade', 'Ben10', 'Albedo', 'Heatblast', 'Diamondhead', 'AlienX', 'AlienxHalf', 'Bigchill', 'Ghostfreak', 'Xlr8']
const CH = (process.argv.slice(2).length ? process.argv.slice(2) : ['rick', 'rickPrime', 'tobirama'])
const server = await serve(), browser = await chromium.launch({ headless: true }); let pass = 0, fail = 0, errors = []
for (const ch of CH) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } }); pg.on('pageerror', e => errors.push(ch + ': ' + e.message))
  await pg.goto(`${server.base}/index.html?harness=1&p1=${ch}&p2=sasuke`, { waitUntil: 'load' })
  await pg.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 90000 })
  await pg.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle() })
  await pg.waitForFunction(() => window.__harness.state().gameState === 'battle', null, { timeout: 60000 })
  for (const t of TAGS) {
    const id = ch + t
    await pg.evaluate(s => window.__harness.setSkin('p1', s), id)
    await new Promise(r => setTimeout(r, 700))
    const r = await pg.evaluate(() => { const f = window.__harness.gojoShinjukuTest.raw('p1'); const a = f._skinAnim || f.animationData || {}; const sh = Object.values(a).map(d => d?.sheet).filter(Boolean); return { skinId: f.skinId, sheets: sh, keys: Object.keys(f).filter(k => /anim|sprite|sheet/i.test(k)).slice(0, 12) } })
    const tag = t.toLowerCase().replace('alienxhalf', 'alienx_half')
    const ok = r.skinId === id && r.sheets.length > 5 && r.sheets.every(s => s.includes('__') && s.includes(tag))
    ok ? pass++ : (fail++, console.log('  FAIL', id, r.skinId, r.sheets.slice(0, 2), r.keys))
    await pg.screenshot({ path: `${OUT}/${id}.png`, clip: { x: 0, y: 160, width: 1280, height: 560 } })
  }
  await pg.close()
}
console.log(`ALIEN SKINS: ${pass} passed, ${fail} failed`, errors.length ? 'errors ' + JSON.stringify(errors.slice(0, 3)) : '')
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
