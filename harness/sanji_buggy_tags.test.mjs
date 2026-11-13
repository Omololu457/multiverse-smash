// harness/sanji_buggy_tags.test.mjs — the second character to prove the damageType system: Sanji (P1) vs Buggy (P2).
// Buggy's Bara Bara no Mi nullifies SLASH damage. Every Sanji normal and kick special is tagged "blunt", the burn and
// the Concasse patch "energy", the Plate Kick "projectile" — so every one of them must hit Buggy for its normal
// scaled damage and never trigger a split. Each move is measured against Buggy AND against Zoro (no immunity) at the
// same spacing. Real keyboard input, real game loop.
//   node harness/sanji_buggy_tags.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const server = await serve(), browser = await chromium.launch({ headless: true })
const MOVES = [
  ['Collier (L)', ['j'], 96], ['Épaule (→+L)', ['d', 'j'], 96], ['Côtelette (H)', ['k'], 96], ['Selle (→+H)', ['d', 'k'], 96],
  ['Poitrine (←+H)', ['a', 'k'], 96], ['Gigot (↘+L)', ['s', 'd', 'j'], 90], ['Crouch kick (↓+L)', ['s', 'j'], 80], ['Anti-air knee (Up-Attack)', ['i'], 80],
  ['Handstand spin (↓+H)', ['s', 'k'], 70],
  ['Mouton Shot (↓↘→+S)', 'qcf:l', 140], ['Anti-Manner Kick (→·→+S)', 'ff:l', 90], ['Premier Hachis (↓↙←+S)', 'qcb:l', 80], ['Plate Kick (↓↙←+H, projectile)', 'qcb:k', 380],
]
const SEQ = { qcf: ['s', ['s', 'd'], 'd'], qcb: ['s', ['s', 'a'], 'a'], ff: ['d', null, 'd'] }
async function measure(p2) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
  const tap = async keys => { for (const k of keys) await page.keyboard.down(k); await step(1); for (const k of keys) await page.keyboard.up(k) }
  async function motion(seq, button) { let held = []
    for (const k of seq) { const want = k == null ? [] : [].concat(k)
      for (const x of held) if (!want.includes(x)) await page.keyboard.up(x)
      for (const x of want) if (!held.includes(x)) await page.keyboard.down(x)
      held = want; await step(2) }
    for (const x of held) await page.keyboard.up(x); await tap([button]) }
  await page.goto(server.base + `/index.html?harness=1&p1=sanji&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.sanjiTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() }); await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 }); await step(30)
  const out = {}
  const fresh = (dx, heat = 100) => page.evaluate(([dx, heat]) => {
    const t = __harness.sanjiTest; t.reset(); t.heat('p1', heat)
    const a = t.raw('p1'), z = t.raw('p2'); z.x = a.x + dx; z.facing = -1; a.facing = 1; a.comboCounter = 0
    z.health = z.maxHealth; z.invulnTimer = 0; z.hitstun = 0; z.knockdownState = false
    if (z._buggy) { z._buggy.nullHits = []; z._buggy.stagger = 0 }
    return 0 }, [dx, heat])
  const hp = () => page.evaluate(() => __harness.sanjiTest.raw('p2').health)
  const nulls = () => page.evaluate(() => { const b = __harness.sanjiTest.raw('p2')._buggy; return b ? (b.nullHits || []).length + (b.stagger > 0 ? 100 : 0) : 0 })
  const settle = async () => { for (let i = 0; i < 120; i++) { await step(1); const a = await page.evaluate(() => { const f = __harness.sanjiTest.raw('p1'); return f.attacking || __harness.sanjiTest.state('p1').projectiles.length > 0 }); if (!a) break } await step(4) }
  for (const [name, input, dx] of MOVES) {
    await fresh(dx); await step(3)
    const h0 = await hp()
    if (typeof input === 'string') { const [m, b] = input.split(':'); await motion(SEQ[m], b) } else await tap(input)
    await settle()
    out[name] = { d: +(h0 - (await hp())).toFixed(1), nulls: await nulls() }
  }
  // Diable Jambe burn ("energy"): ignite, land one lit kick, then let the burn run out.
  await fresh(96, 100); await tap(['l', 'k']); for (let i = 0; i < 44; i++) await step(1)
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'), z = __harness.sanjiTest.raw('p2'); z.x = a.x + 96; z.health = z.maxHealth })
  const b0 = await hp(); await tap(['j']); await settle(); const b1 = await hp(); for (let i = 0; i < 130; i++) await step(1); const b2 = await hp()
  out['Diable Jambe lit Collier'] = { d: +(b0 - b1).toFixed(1), nulls: await nulls() }
  out['Diable Jambe burn ticks (energy)'] = { d: +(b1 - b2).toFixed(1), nulls: await nulls() }
  await page.close()
  return { out, errors }
}
try {
  const vsBuggy = await measure('buggy'), vsZoro = await measure('zoro')
  console.log('\n── Sanji vs Buggy (slash-immune) vs Sanji vs Zoro (no immunity), same spacing ──')
  for (const name of Object.keys(vsZoro.out)) {
    const b = vsBuggy.out[name], z = vsZoro.out[name]
    check(`${name}: hits Buggy for full damage (${b.d} vs Zoro ${z.d}), no split`, b.d > 0 && Math.abs(b.d - z.d) <= Math.max(1.5, z.d * 0.05) && b.nulls === 0, JSON.stringify({ buggy: b, zoro: z }))
  }
  check('no page errors', vsBuggy.errors.length === 0 && vsZoro.errors.length === 0, [...vsBuggy.errors, ...vsZoro.errors].slice(0, 2).join(' | '))
  console.log('\nTABLE ' + JSON.stringify({ buggy: vsBuggy.out, zoro: vsZoro.out }))
} catch (e) { check('test ran to completion', false, e.stack || e.message) }
console.log(`\n════════════════════════════════════════\n  SANJI vs BUGGY damageType: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(FAIL ? 1 : 0)
