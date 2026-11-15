// Pulls live roster numbers for docs/elastigirl/BALANCE_NOTES.md (stats + normal frame data of the comparison fighters).
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch(), page = await browser.newPage()
await page.goto(server.base + `/index.html?harness=1&p1=elastigirl&p2=spiderman&seed=7`); await page.waitForFunction(() => window.__harness?.charDef, null, { timeout: 60000 })
const out = await page.evaluate(async () => { const { characters } = await import('./characters.js')
  const pick = k => { const c = characters[k]; if (!c) return null; const b = c.basic_attacks || {}; const n = m => m ? { dmg: m.damage, su: m.startup, ac: m.active, rc: m.recovery, rx: m.rangeX } : null
    return { name: c.name, uni: c.universe, stats: c.stats, traits: { energy: c.traits?.energyName, flight: !!c.traits?.flightProfile }, light: n(b.light), heavy: n(b.heavy), up: n(b.upAttack), ult: c.ultimate?.name } }
  const all = Object.keys(characters), hp = all.map(k => characters[k]?.stats?.maxHealth).filter(Number.isFinite).sort((a, b) => a - b), sp = all.map(k => characters[k]?.stats?.speed).filter(Number.isFinite).sort((a, b) => a - b)
  return { spiderman: pick('spiderman'), superman: pick('superman'), violet: pick('violet'), elastigirl: pick('elastigirl'), n: all.length, hpMedian: hp[hp.length >> 1], hpRange: [hp[0], hp[hp.length - 1]], speedMedian: sp[sp.length >> 1],
    incredibles: all.filter(k => characters[k]?.universe === 'the_incredibles') } })
console.log(JSON.stringify(out, null, 1)); await browser.close(); server.close?.()
