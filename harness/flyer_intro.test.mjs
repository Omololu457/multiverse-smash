// harness/flyer_intro.test.mjs — FLIGHT ENTRANCES (flyerIntro.js) in the real match-start INTRO:
// Omni-Man meteor + crater, Invincible low fly-by, Homelander heat vision into the FLOOR (never the foe), Superman sky
// fly-by + descent, Starfire / Raven descend. Each starts away from home, ends exactly home, and the fight starts normally.
//   node harness/flyer_intro.test.mjs [omniman_viltrum,homelander,...]
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const ALL = ['omniman_viltrum', 'invincible', 'homelander', 'superman', 'starfire', 'raven']
const want = (process.argv[2] || '').split(',').filter(Boolean), list = want.length ? want : ALL
const server = await serve(), browser = await chromium.launch({ headless: true })
let pass = 0, fail = 0; const errs = []
const ck = (name, ok, info = '') => { ok ? pass++ : fail++; console.log(`${ok ? '✓' : '❌'} ${name}${info ? '  — ' + String(info).slice(0, 220) : ''}`) }
for (const key of list) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errs.push(key + ': ' + e.message))
  await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  const E = (fn, a) => page.evaluate(fn, a), step = n => E(n => __harness.luffyTest.step(n), n)
  await page.goto(server.base + `/index.html?harness=1&p1=${key}&p2=goku&seed=40517`)
  await page.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 60000 })
  await E(() => { __harness.start({}); __harness.preloadDone?.() })
  const s0 = await E(() => __harness.flyerIntro('p1'))
  const R = await E(() => { const home = __harness.flyerIntro('p1').state?.home, kinds = new Set(), variants = new Set(); let maxOff = 0, fx = { parts: 0, rings: 0, decals: [] }
    for (let i = 0; i < 400; i++) { __harness.luffyTest.step(1); const a = __harness.flyerIntro('p1'); if (a.stage !== 'p1') break
      if (a.state) { kinds.add(a.state.kind); variants.add(a.variant); maxOff = Math.max(maxOff, Math.hypot(a.x - home.x, a.y - home.y)) }
      fx = { parts: Math.max(fx.parts, a.fx.parts), rings: Math.max(fx.rings, a.fx.rings), decals: [...new Set([...fx.decals, ...a.fx.decals])] } }
    return { home, kinds: [...kinds], variants: [...variants], maxOff, fx } })
  const { home, maxOff, fx } = R, kinds = new Set(R.kinds), variants = new Set(R.variants), total = s0.state?.total
  const end = await E(() => ({ x: __harness.p1().x, y: __harness.p1().y, st: __harness.flyerIntro('p1') }))
  ck(`${key}: has a flight entrance (${[...kinds].join()}, ${total} f)`, !!home && kinds.size === 1 && total > 60, JSON.stringify(s0.state))
  ck(`${key}: it really travels (starts ${Math.round(maxOff)} px from home) and acts it (${[...variants].join(' → ')})`, maxOff > 150 && variants.size >= 2)
  ck(`${key}: ends exactly on their mark`, Math.abs(end.x - home.x) < 0.5 && Math.abs(end.y - home.y) < 0.5 && !end.st.state, JSON.stringify([end.x, end.y, home]))
  if (key === 'omniman_viltrum') ck('omniman: craters the floor (crater decal + shockwave + debris)', fx.decals.includes('crater') && fx.rings >= 1 && fx.parts > 30, JSON.stringify(fx))
  if (key === 'homelander') {
    ck('homelander: heat vision carves a scorch line in the floor', fx.decals.includes('scorch'), JSON.stringify(fx))
  }
  if (key === 'invincible' || key === 'superman') ck(`${key}: sonic boom ring + trail`, fx.rings >= 1 && fx.parts > 10, JSON.stringify(fx))
  // the fight still starts
  const gs = await E(() => { for (let i = 0; i < 600; i++) { __harness.luffyTest.step(2); if (__harness.flyerIntro('p1').gs === 'battle') break } const a = __harness.flyerIntro('p1'); return a.gs })
  ck(`${key}: then the fight starts`, gs === 'battle', gs)
  await page.close()
}
// skip-to-battle mid-entrance snaps home
{ const page = await browser.newPage(); page.on('pageerror', e => errs.push('skip: ' + e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  const E = (fn, a) => page.evaluate(fn, a)
  await page.goto(server.base + `/index.html?harness=1&p1=homelander&p2=omniman_viltrum&seed=40517`); await page.waitForFunction(() => window.__harness?.luffyTest, null, { timeout: 60000 })
  await E(() => { __harness.start({}); __harness.preloadDone?.(); __harness.luffyTest.step(30) })
  const mid = await E(() => __harness.flyerIntro('p1')); await E(() => __harness.skipToBattle())
  const after = await E(() => ({ a: __harness.flyerIntro('p1'), b: __harness.flyerIntro('p2') }))
  ck('skip mid-entrance: snapped home (no flyer state left)', mid.state && Math.abs(after.a.y - mid.state.home.y) < 0.5 && !after.a.state && !after.b.state, JSON.stringify([mid.y, mid.state?.home, after.a.y]))
  await page.close() }
ck('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(`flyer_intro: ${pass} passed, ${fail} failed`)
await browser.close(); process.exit(fail ? 1 : 0)
