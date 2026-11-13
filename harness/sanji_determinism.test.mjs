// harness/sanji_determinism.test.mjs — PHASE 11.7: Sanji's simulation is deterministic with DIABLE JAMBE LIT and THE
// COURSE IN PROGRESS. A forced-seed AI-vs-AI match (CPU Sanji vs CPU Zoro, both seeded via gameRng) is run twice; at a
// fixed frame both runs ignite the leg (the real sIgnite move through combat.startMove) and set the Course to step 3.
// The full replay snapshot of both fighters (x, y, health, Heat + Sanji's whole GAME_STATE `_sanji` + the live
// attack) is hashed EVERY frame for 1500 frames: same seed → identical sequence; another seed → diverges.
// Also: no Math.random / gameRng anywhere in sanji*.js.
//   node harness/sanji_determinism.test.mjs
import { chromium } from 'playwright'
import fs from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const strip = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
for (const f of fs.readdirSync('.').filter(f => /^sanji.*\.js$/.test(f))) check(`${f}: no Math.random / gameRng`, !/Math\.random|gameRng/.test(strip(fs.readFileSync(f, 'utf8'))))
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.aiVsAi && !!window.__harness?.sanjiTest)
  const run = seed => page.evaluate(async seed => {
    const H = window.__harness, { startMove } = await import('./combat.js'), S = await import('./sanjiState.js')
    H.rng.forceSeed(seed)
    H.aiVsAi.start({ p1: 'sanji', p2: 'zoro', p1Diff: 'adaptive', p2Diff: 'adaptive', matches: 1, speed: 1 })
    const r = v => Math.round((v || 0) * 1e4) / 1e4
    const snap = f => JSON.stringify([r(f.x), r(f.y), f.health, r(f.energy), f._sanji || null, f.currentAttack || null, f.hitstun || 0, f.comboCounter || 0])
    const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0).toString(16) }
    const seq = [], seen = { lit: 0, course: 0, burn: 0, both: 0 }
    for (let fr = 0; fr < 1500; fr++) {
      if (fr === 240) {   // the same deterministic intervention in every run: ignite for real + a Course in progress
        const s = H.sanjiTest.raw('p1'); s.energy = 100; s.hitstun = 0; s.isGrabbed = false
        S.sanjiStartMove(s, 'sIgnite', startMove); H.sanjiTest.set('p1', { course: 3, courseIdle: 0 })
      }
      if (fr === 300) H.sanjiTest.set('p1', { course: Math.max(3, H.sanjiTest.raw('p1')._sanji.course), courseIdle: 0 })
      H.aiVsAi.step(1)
      const a = H.sanjiTest.raw('p1'), z = H.sanjiTest.raw('p2'), st = a._sanji || {}
      if (st.dj > 0) seen.lit++
      if (st.course > 0) seen.course++
      if (st.burn > 0) seen.burn++
      if (st.dj > 0 && st.course > 0) seen.both++
      seq.push(hash(snap(a) + '|' + snap(z)))
    }
    return { seq, seen, end: [H.sanjiTest.raw('p1').health, H.sanjiTest.raw('p2').health] }
  }, seed)
  const a = await run(9191), b = await run(9191), c = await run(5050)
  const firstDiff = a.seq.findIndex((h, i) => h !== b.seq[i])
  check('Diable Jambe lit AND a Course in progress during the run (the CPU may spend the bar early)', a.seen.both >= 20 && a.seen.lit >= 120, JSON.stringify(a.seen))
  check('the lit leg burned the opponent (burn ticks in play)', a.seen.burn > 0, a.seen.burn)
  check('same seed → identical full state (both fighters + Sanji GAME_STATE) on EVERY one of 1500 frames', firstDiff === -1 && a.seq.length === 1500,
    firstDiff === -1 ? `end HP ${a.end.join('/')}` : `first divergence at frame ${firstDiff}`)
  check('different seed → diverges (the check can fail)', c.seq.some((h, i) => h !== a.seq[i]), `end HP ${c.end.join('/')}`)
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
} catch (e) { check('test ran to completion', false, e.stack || e.message) }
console.log(`\n════════════════════════════════════════\n  SANJI DETERMINISM (Diable Jambe lit + Course in progress): ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(FAIL ? 1 : 0)
