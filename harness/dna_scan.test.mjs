// DNA SCAN (dnaScan.js) live test — Ben / Albedo / Kevin: ↓+U scan → U+L transform → timeout / manual revert;
// colour-scheme sheet + chest emblem render; Chrollo Skill Hunter book overlay draws. Screenshots → docs/dna_scan/.
// USAGE: node tools/serve.mjs (or PORT=…) then  DNA_URL=http://127.0.0.1:8000/index.html node harness/dna_scan.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

const _srv = process.env.DNA_URL ? null : await serve()   // no URL given → the harness's own static server
const base = process.env.DNA_URL || `${_srv.base}/index.html`
const OUT = 'docs/dna_scan'; fs.mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch({ headless: true })
const errors = []
let fails = 0, passes = 0
const check = (label, ok, data) => { if (ok) passes++; else fails++; console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : '  ' + JSON.stringify(data))) }

async function run(p1, p2, fn) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(p1 + ': ' + e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${base}?harness=1&p1=${p1}&p2=${p2}&seed=4242`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__harness?.kevinTest, null, { timeout: 120000 })
  await page.evaluate(() => { __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); __harness.aiVsAi.step(1) })
  await page.evaluate(() => __harness.preloadDone?.())
  await page.evaluate(async () => {
    const { writeRawControls } = await import('./input.js')
    const dna = await import('./dnaScan.js')
    const H = __harness.kevinTest, a = H.raw(), b = H.raw('p2')
    const step = (raw = {}, n = 1) => { for (let i = 0; i < n; i++) { writeRawControls(a, raw); __harness.aiVsAi.step(1) } }
    const render = () => __harness.luffyTest.step(0)
    const reset = () => {
      H.reset(); __harness.setRoundTimer(99999); __harness.setDummyBehavior('stand')
      for (const [i, f] of [a, b].entries()) { f.health = f.maxHealth; f.x = 1250 + i * 220; f.vx = 0; f.facing = i ? -1 : 1; f.hitstun = f.blockstun = 0; f.attacking = false; f.attackCooldown = 0; f.knockdownState = false }
      step({}, 2)
    }
    window.__dna = { a, b, step, render, reset, st: () => dna.dnaState(a), DNA: dna.DNA }
  })
  try { await fn(page) } finally { await page.close() }
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png` })

for (const [p1, scheme] of [['ben10', 'ben'], ['albedo', 'albedo'], ['kevin_levin', 'kevin']]) {
  await run(p1, 'naruto', async page => {
    const r = await page.evaluate(async () => {
      const { a, step, reset, st, render } = __dna, out = {}
      reset(); a.energy = 100
      step({ down: true, ultimate: true }); step({ down: true }, 1); step({}, 30); render()
      out.scanMid = st()
      return out
    })
    await shot(page, `${p1}_1_scan`)
    const r2 = await page.evaluate(async () => {
      const { a, step, st, render, DNA } = __dna, out = {}
      step({}, DNA.scanTotal); render()
      out.afterScan = st(); out.energy = a.energy
      // U + L (U first, L 2 frames later)
      a.energy = 100; a.attackCooldown = 0
      step({ ultimate: true }, 2); step({ ultimate: true, special: true }); step({}, 30); render()
      out.morphMid = st()
      return out
    })
    await shot(page, `${p1}_2_morph`)
    const r3 = await page.evaluate(async () => {
      const { a, step, st, render, DNA } = __dna, out = {}
      step({}, DNA.morphTotal); for (let i = 0; i < 8; i++) { step({}, 3); render() }
      out.copied = st(); out.omni = a.omnitrix === null; out.sheetLive = !!a._dnaSheetLive; out.emblemFrame = a._lastDrawW > 0
      return out
    })
    await shot(page, `${p1}_3_copied`)
    const r4 = await page.evaluate(async () => {
      const { a, step, st, render, DNA } = __dna, out = {}
      // copied kit works: neutral light
      const hp0 = __dna.b.health; step({ right: true }, 20); step({ light: true }); step({}, 30); out.lightHit = __dna.b.health < hp0
      // manual turn-back: U + L again
      step({ ultimate: true, special: true }); step({}, 4)
      out.back = st()
      // recharge, then transform again and let it time out
      step({}, DNA.recharge + 2); a.energy = 100
      step({ special: true }); step({ ultimate: true, special: true }); step({}, DNA.morphTotal + 2)
      out.again = st()
      a._dna.timer = 3; step({}, 6)
      out.timedOut = st()
      // U alone (with a sample stored) still reaches the normal ultimate after the hold-back
      a.energy = 100; a.attackCooldown = 0; step({}, DNA.recharge + 4)
      const e0 = a.energy; step({ ultimate: true }, 8); step({}, 2)
      out.plainUlt = { e0, e1: a.energy }
      render()
      return out
    })
    await shot(page, `${p1}_4_after`)
    // THE 6TH DIAL SLOT: ↓↓ then U = the scanned alien, ↓↓ then ; = back, ↓↓ then J (from the copy) = straight to alien 1
    const r5 = await page.evaluate(async () => {
      const { a, step, st, render, DNA, reset } = __dna, out = {}
      reset()   // a fresh round: the plain-U check above left Ben inside his own ultimate cinematic (no input read)
      const dd = () => { step({ down: true }); step({}, 2); step({ down: true }); step({}, 2) }
      a.energy = 100; a.attackCooldown = 0
      dd(); step({ ultimate: true }); step({}, DNA.morphTotal + 4); render()
      out.dial = st(); out.dialUltE = a.energy
      dd(); step({ block: true }); step({}, 4)
      out.dialBack = st()
      a.energy = 100; dd(); step({ ultimate: true }); step({}, DNA.morphTotal + 4)
      out.dial2 = st()
      dd(); step({ light: true }); step({}, 70)
      out.toAlien = { rk: a.rosterKey, transformed: !!a.transformed, alien: a.omnitrix?.currentAlien || a.currentAlien || null, dna: st() }
      return out
    })
    const res = { ...r, ...r2, ...r3, ...r4, ...r5 }
    check(`${p1}: ↓↓ then U becomes the scanned alien`, res.dial?.active && res.dial?.rosterKey === 'naruto', res.dial)
    check(`${p1}: ↓↓ then U costs the transform, not the ultimate`, res.dialUltE >= 70, res.dialUltE)
    check(`${p1}: ↓↓ then ; turns back`, !res.dialBack?.active && res.dialBack?.rosterKey === p1, res.dialBack)
    check(`${p1}: ↓↓ then U again straight away`, res.dial2?.active, res.dial2)
    if (p1 !== 'kevin_levin') check(`${p1}: ↓↓ then J from the copy dials alien 1`, !res.toAlien?.dna?.active && res.toAlien.transformed, res.toAlien)
    check(`${p1}: scan cinematic running`, res.scanMid?.cine === 'scan', res.scanMid)
    check(`${p1}: scanned naruto stored`, res.afterScan?.scanKey === 'naruto', res.afterScan)
    check(`${p1}: scan spent 100`, res.energy < 5, res.energy)
    check(`${p1}: U+L morph cinematic`, res.morphMid?.cine === 'morph', res.morphMid)
    check(`${p1}: now Naruto with ${scheme} scheme`, res.copied?.rosterKey === 'naruto' && res.copied?.scheme === scheme && res.copied?.active, res.copied)
    check(`${p1}: recolored sheet live`, res.sheetLive, res)
    check(`${p1}: copied light connects`, res.lightHit, res)
    check(`${p1}: U+L again turns back`, res.back?.rosterKey === p1 && !res.back?.active && res.back?.scanKey === 'naruto', res.back)
    check(`${p1}: transform again after recharge`, res.again?.active && res.again?.rosterKey === 'naruto', res.again)
    check(`${p1}: times out back`, res.timedOut?.rosterKey === p1 && !res.timedOut?.active, res.timedOut)
    check(`${p1}: plain U still reaches the normal ultimate`, res.plainUlt.e1 < res.plainUlt.e0 || p1 === 'kevin_levin', res.plainUlt)
  })
}

// Chrollo — book overlay + purple scheme + forehead cross
await run('chrollo', 'naruto', async page => {
  const r = await page.evaluate(async () => {
    const { a, step, reset, render } = __dna
    reset(); a.energy = 130; a._shUnlocked = true
    step({ ultimate: true })
    const C = await import('./chrolloSkillHunterCinematic.js')
    for (let i = 0; i < 900 && !(C.isChrolloSkillHunterCinematicActive() && C.getChrolloSkillHunterCinematicStatus().frame >= 64); i++) step({}, 1)
    render()
    return { cine: C.getChrolloSkillHunterCinematicStatus() }
  })
  await page.waitForTimeout(400); await page.evaluate(() => __dna.render())   // let the page portrait decode, redraw the same frame
  await shot(page, 'chrollo_1_book')
  const r2 = await page.evaluate(async () => {
    const { a, step, render } = __dna
    step({}, 140); for (let i = 0; i < 8; i++) { step({}, 3); render() }
    return { sh: !!a._shActive, rk: a.rosterKey, live: !!a._dnaSheetLive }
  })
  await shot(page, 'chrollo_2_copied')
  check('chrollo: book cinematic reached', r.cine?.active && r.cine.frame >= 64, r.cine)
  check('chrollo: skill hunter copied naruto', r2.sh && r2.rk === 'naruto', r2)
  check('chrollo: purple scheme sheet live', r2.live, r2)
})

if (errors.length) { console.log('PAGE ERRORS:\n' + [...new Set(errors)].join('\n')); fails++ }
console.log(`\n${passes} passed, ${fails} failed`)
await browser.close()
process.exit(fails ? 1 : 0)
