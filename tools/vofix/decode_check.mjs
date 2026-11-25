import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { serve } from '../../harness/ben10_test_utils.mjs'
const A = JSON.parse(readFileSync('/Users/omololu/Desktop/project/multiverse-smash/tools/vofix/out/applied.json', 'utf8'))
const paths = Object.keys(A.applied)
const server = await serve(), browser = await chromium.launch({ headless: true })
const pg = await browser.newPage(); await pg.goto(`${server.base}/index.html?harness=1`)
const res = await pg.evaluate(async ps => { const ac = new OfflineAudioContext(1, 44100, 44100), bad = []; let ok = 0
  for (const p of ps) { try { const b = await (await fetch(p)).arrayBuffer(); const d = await ac.decodeAudioData(b); if (d.duration > 0.2) ok++; else bad.push([p, d.duration]) } catch (e) { bad.push([p, String(e).slice(0, 60)]) } }
  return { ok, bad } }, paths)
console.log('decoded', res.ok, 'of', paths.length, 'bad', JSON.stringify(res.bad.slice(0, 5)))
await browser.close(); server.close?.()
