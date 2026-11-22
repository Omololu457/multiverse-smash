// harness/gojo_shinjuku_supers.mjs — MSV1-GOJO phase 6: EVERY roster ultimate vs Satoru Gojo (Shinjuku) at Infinity
// off / L1 / L2 / L3. P1 = the caster (harness p1Ultimate), P2 = gojo_shinjuku (training dummy, stand). CE is topped up
// during each cast so the LEVEL RULE is measured, not the CE economy (L3 would otherwise deplete mid-cinematic).
// Rule: L1 = supers connect (≈ off), L2 = ×0.5 and no launch, L3 = 0. Exceptions are classified, not hidden:
// forced off (the caster's ult is a domain), mirror / Mahoraga bypass, no-damage ults (buffs / transformations).
// Usage: node harness/gojo_shinjuku_supers.mjs [--keys a,b] [--out docs/msv1/gojo]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { serve } from './ben10_test_utils.mjs'
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const OUT = arg('--out') || 'docs/msv1/gojo'
const server = await serve(), browser = await chromium.launch({ headless: true })
let page
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const E = (fn, a) => page.evaluate(fn, a)
async function boot(p1) {
  if (page) await page.close().catch(() => {})
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => { errs.push(String(e.message).slice(0, 160)) })
  await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=gojo_shinjuku&seed=50223`)
  await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 30000 })
  await E(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await step(3)
}
let errs = []
await boot('naruto')
const keys = (arg('--keys') ? arg('--keys').split(',') : await E(() => __harness.rosterSets().all)).filter(k => k !== 'gojo_shinjuku').sort()
const rows = []
for (const key of keys) {
  errs = []
  const row = { key, dmg: {}, rule: {}, note: '' }
  try {
    await boot(key)
    for (const lv of [0, 1, 2, 3]) {
      await E(lv => { const H = __harness.gojoShinjukuTest; H.reset(); __harness.setDummyBehavior('stand'); __harness.healP1?.(); __harness.healP2?.()
        const a = H.raw('p1'), b = H.raw('p2'); a.x = 1300; b.x = 1300 + 160; a.facing = 1; b.facing = -1; a.vx = b.vx = 0
        H.setCe(100, 'p2'); H.setInfinity(lv, 'p2'); H.setEnergy(300, 'p2'); __harness.fillEnergy?.(); __harness.resetUlt?.() }, lv)
      await step(4)
      const s0 = await E(() => { const s = __harness.gojoShinjukuTest.state('p2'); return { hp: s.hp, st: s.s.stats } })
      const cast = await E(() => !!__harness.p1Ultimate()?.cast)
      let minHp = s0.hp, lastLv = lv
      for (let i = 0; i < 48; i++) { await step(10); const r = await E(lv => { const H = __harness.gojoShinjukuTest, s = H.state('p2'); if (lv) H.setCe(100, 'p2'); return { hp: s.hp, inf: s.inf } }, lv); minHp = Math.min(minHp, r.hp); lastLv = r.inf }
      const s1 = await E(() => __harness.gojoShinjukuTest.state('p2').s.stats)
      const d = k => (s1[k] || 0) - (s0.st[k] || 0)
      row.dmg[lv] = Math.round(s0.hp - minHp)
      row.rule[lv] = { cast, connected: d('supersConnected'), halved: d('supersHalved'), whiffed: d('supersWhiffed'), stopped: d('stopped') + d('stoppedProj'),
        forced: Object.keys(s1.forcedOff || {}).filter(k => (s1.forcedOff[k] || 0) > (s0.st.forcedOff?.[k] || 0)), bypass: d('mirrorBypass') + d('mahoragaBypass'), endLv: lastLv }
    }
    const off = row.dmg[0], f = lv => row.rule[lv].forced.length ? row.rule[lv].forced.join('+') : null
    if (!row.rule[0].cast) row.verdict = 'no-cast'
    else if (off <= 0) row.verdict = 'no-damage'
    else if ([1, 2, 3].some(lv => f(lv))) row.verdict = 'forced-off:' + ([1, 2, 3].map(f).find(Boolean))
    else if ([1, 2, 3].some(lv => row.rule[lv].bypass)) row.verdict = 'bypass'
    else {
      const ok1 = Math.abs(row.dmg[1] - off) <= Math.max(6, off * 0.15), ok2 = Math.abs(row.dmg[2] - off * 0.5) <= Math.max(8, off * 0.2), ok3 = row.dmg[3] <= Math.max(2, off * 0.05)
      row.verdict = ok1 && ok2 && ok3 ? 'ok' : `CHECK (L1 ${ok1 ? 'ok' : 'x'} / L2 ${ok2 ? 'ok' : 'x'} / L3 ${ok3 ? 'ok' : 'x'})`
    }
  } catch (e) { row.verdict = 'error'; row.note = String(e.message).slice(0, 120) }
  if (errs.length) row.pageErrors = errs.slice(0, 3)
  rows.push(row)
  console.log(`${key.padEnd(24)} off ${String(row.dmg[0] ?? '-').padStart(4)}  L1 ${String(row.dmg[1] ?? '-').padStart(4)}  L2 ${String(row.dmg[2] ?? '-').padStart(4)}  L3 ${String(row.dmg[3] ?? '-').padStart(4)}  ${row.verdict}${errs.length ? '  pageerr' : ''}`)
}
fs.mkdirSync(OUT, { recursive: true })
fs.writeFileSync(path.join(OUT, 'supers.json'), JSON.stringify(rows, null, 1))
const tally = rows.reduce((t, r) => { const v = r.verdict.split(' ')[0].split(':')[0]; t[v] = (t[v] || 0) + 1; return t }, {})
console.log('\nSUPERS SWEEP:', JSON.stringify(tally))
await browser.close(); server.close?.()
