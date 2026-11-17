// harness/anime_forms.test.mjs — anime juice Phase 3: every FORM CHANGE gets the LEVEL UP treatment (animeForms.js):
// slow fill → flash + pillar + floor rings → chime → the FORM NAME slammed + the REAL stat deltas counted up.
// Real game, real form systems: Goku's ladder (abilities.enterGokuNextForm), Naruto's Sage Mode (transformations.js
// applyTransformation, the real roster data), a revert to base (no ceremony), ben10 skipped.
//   node harness/anime_forms.test.mjs → docs/anime_juice/forms/*.png
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, String(d).slice(0, 260)) } else { fail++; console.log('  ❌', n, String(d).slice(0, 900)) } }
const J = o => JSON.stringify(o)
fs.mkdirSync('docs/anime_juice/forms', { recursive: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
async function boot(p1) {
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=goku&seed=4242`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
  await page.evaluate(async () => {
    window.requestAnimationFrame = () => 0
    const AJ = await import('./animeJuice.js'), AB = await import('./abilities.js'), TR = await import('./transformations.js')
    const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
    window.__A = { AJ, AB, TR, H, step, st: () => AJ.animeJuiceStatus(),
      setup: () => { H.reset(); __harness.setDummyBehavior?.('stand'); const a = H.raw(), b = H.raw('p2'); a.x = 700; b.x = 1000; a.facing = 1; b.facing = -1; a.energy = a.maxEnergy || 100; b.energy = 0; step(3); AJ.animeJuiceReset(); step(1); return { a, b } } }
  })
}
const shot = name => page.screenshot({ path: `docs/anime_juice/forms/${name}.png` })

await boot('goku')
const G = await page.evaluate(() => { const { AB, step, setup, st } = __A; const { a } = setup(); a.energy = a.maxEnergy || 100
  const okClimb = AB.enterGokuNextForm(a, {}); const r = { okClimb, form: a.currentForm }
  step(2); r.ev0 = st().forms[0]; for (let i = 0; i < 6; i++) step(1); r.ev = st().forms[0]; r.pillar = st().kinds.includes('pillar')
  step(20); r.pillarLater = st().kinds.includes('pillar'); return r })
ok('Goku climbs to Super Saiyan → a LEVEL UP event with the form name', G.okClimb && /SUPER SAIYAN/.test(G.ev?.name || ''), J(G))
ok('the real stat deltas (from the fighter, not a table): DMG ×1.00 → ×1.10 …', (G.ev?.deltas || []).some(d => d.k === 'DMG' && Math.abs(d.a - 1) < 0.01 && Math.abs(d.b - 1.1) < 0.01), J(G.ev?.deltas))
ok('the fill crawls first, THEN the flash + pillar (not on frame 1)', !G.pillar && G.pillarLater, J(G))
await page.evaluate(() => __A.step(14)); await shot('goku_ssj_levelup')

await boot('vegeta')
const N = await page.evaluate(() => { const { AB, TR, step, setup, st } = __A; const { a } = setup()
  const okT = AB.triggerTransformation(a, {}); step(4); const r = { okT, form: a.currentForm, ev: st().forms[0] }
  step(60); TR.revertTransformation(a); a.currentForm = 'base'; step(4); r.afterRevert = st().forms.filter(e => e.t < 5).length; return r })
ok('Vegeta transforms (abilities.triggerTransformation → transformations.js) → LEVEL UP with the form name + DMG / SPD / DEF deltas', N.okT && /SUPER SAIYAN|SSJ/.test(N.ev?.name || '') && N.ev.deltas.length >= 3, J(N))
ok('a revert to base is NOT a level up', N.afterRevert === 0, J(N))
await page.evaluate(() => { const { AB, step, setup } = __A; const { a } = setup(); AB.triggerTransformation(a, {}); step(48) }); await shot('vegeta_levelup')

const B = await page.evaluate(async () => { const { AJ } = __A; const F = await import('./animeForms.js'); F.formsReset()
  const ben = { rosterKey: 'ben10', currentForm: 'base', damageMultiplier: 1 }, foe = null
  F.formsTick([ben, foe], true); ben.currentForm = 'heatblast'; F.formsTick([ben, foe], true); return F.formsStatus().length })
ok('ben10 (Omnitrix) is skipped', B === 0, String(B))
ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close()
console.log(`\n  ANIME FORMS: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
