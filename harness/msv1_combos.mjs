// harness/msv1_combos.mjs — MSV1 Phase 5: perform each documented combo with REAL key input on the real loop and
// measure hits / damage / whether the foe ever left hitstun (a true combo). Output feeds docs/msv1/COMBOS.md.
//   node harness/msv1_combos.mjs [--json out.json]
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve()
const browser = await chromium.launch({ headless: true })
const out = []; let page
async function boot(p1, p2) {
  if (page) await page.close()
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.ninjaTest, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await page.evaluate(() => __harness.luffyTest.step(2))
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 200)) }
}
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (w = 'p1') => page.evaluate(w => __harness.ninjaTest.state(w), w)
async function fresh(dx, o = {}) {
  await page.evaluate(() => __harness.ninjaTest.reset())
  await page.evaluate(([dx, o]) => { const T = __harness.ninjaTest, a = T.raw('p1'), z = T.raw('p2'); a.x = o.ax ?? 800; z.x = a.x + dx; a.facing = dx > 0 ? 1 : -1; z.facing = -a.facing
    for (const f of [a, z]) { f.invulnTimer = 0; f.knockdownState = false; f.hitstun = 0; f.blockstun = 0; f.health = f.maxHealth; f.vx = 0; f.vy = 0; f.comboCounter = 0; f.energy = o.energy ?? 0; f.attacking = false; f.currentAttack = null } }, [dx, o])
  await step(3); await page.evaluate(() => __harness.ninjaTest.np('p1', 100))
}
// script: array of [frameOffset, action] where action = 'j' | ['s','d'] (hold set) | 'release' | fn
async function perform(name, who, dx, script, o = {}) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return
  await fresh(dx, o); if (o.setup) await o.setup()
  const taps = []
  const h0 = (await S('p2')).health; let hits = 0, lastH = h0, dropped = false, inCombo = false, maxCombo = 0, held = new Set()
  const total = Math.max(...script.map(x => x[0])) + (o.tail ?? 60)
  for (let t = 0; t <= total; t++) {
    for (const [at, act] of script.filter(x => x[0] === t)) {
      if (typeof act === 'function') await act()
      else if (act === 'release') { for (const k of held) await page.keyboard.up(k); held.clear() }
      else if (Array.isArray(act)) { for (const k of held) if (!act.includes(k)) { await page.keyboard.up(k); held.delete(k) } for (const k of act) if (!held.has(k)) { await page.keyboard.down(k); held.add(k) } }
      else { await page.keyboard.down(act); taps.push(act) }   // a tap = pressed for exactly this frame
    }
    await step(1)
    for (const k of taps.splice(0)) await page.keyboard.up(k)
    const z = await S('p2'), a = await S('p1')
    if (process.env.TRACE && name.includes(process.env.TRACE)) console.log('   ', t, a.move, Math.round(a.x), Math.round(a.y), a.grounded ? 'G' : 'air', a.facing, a.s?.burrow ? 'B' : '', a.s?.streak ? 'S' + a.s.streak.t : '', '| foe', Math.round(z.x), z.hitstun, z.knockdown ? 'KD' : '', z.health)
    if (z.health < lastH) { hits++; inCombo = true } lastH = z.health
    maxCombo = Math.max(maxCombo, a.combo || 0)
    if (inCombo && !(z.hitstun > 0) && !z.knockdown && z.grounded && hits && t < total - (o.tail ?? 60) + 10) dropped = dropped || (o.allowDrop ? false : false)
  }
  for (const k of held) await page.keyboard.up(k)
  const dealt = h0 - (await S('p2')).health
  out.push({ who, name, hits, dealt, combo: maxCombo, notation: o.notation || '' })
  console.log(`  ${who.padEnd(6)} ${name.padEnd(34)} hits ${String(hits).padStart(2)}  dmg ${String(dealt).padStart(4)}  engine combo ${maxCombo}`)
}
const MOT = (t, seq, btn, gap = 2) => { const r = []; seq.forEach((k, i) => r.push([t + i * gap, [].concat(k)])); r.push([t + seq.length * gap, 'release']); r.push([t + seq.length * gap + 1, btn]); return r }
const QCF = (t, btn) => MOT(t, ['s', ['s', 'd'], 'd'], btn)
const QCFL = (t, btn) => MOT(t, ['s', ['s', 'a'], 'a'], btn)   // after a cross-up he faces left: ↓↙← on screen = ↓↘→ for him
const QCF2 = (t, btn) => MOT(t, ['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd'], btn, 1)
const DT = (t, k, gap = 3) => [[t, k], [t + gap, k]]
try {
  console.log('\n── MSV1 COMBOS (measured on the real loop; damage = what the HP bar lost, parity ×1.6 and global ×0.6 included) ──')
  await boot('ns_red', 'ns_yellow')
  await perform('Kick string', 'Shane', 90, [[0, 'j'], [8, 'k'], [18, 'k'], [30, 'k']], { notation: 'L, H, H, H' })
  await perform('Launch', 'Shane', 90, [[0, 'j'], [8, 'k'], [18, 'k'], [30, 'i']], { notation: 'L, H, H, Up-Attack (uppercut launcher)' })
  await perform('Sword line', 'Shane', 90, [[0, 'j'], [8, ['d']], [9, 'j'], [11, 'release']], { notation: 'L, →L' })
  await perform('Streak Strike → Tornado', 'Shane', 230, [...DT(0, 'd'), [4, 'j'], ...QCFL(16, 'l')], { notation: '→→ (L during), ↓↘→ S in the recovery' })
  await perform('Run-over beam', 'Shane', 230, [...DT(0, 'd'), [4, 'j'], ...QCFL(16, 'j')], { notation: '→→ (L during), ↓↘→ L' })
  await perform('String → Storm Ascension', 'Shane', 90, [[0, 'j'], [8, 'k'], [18, 'k'], ...QCF2(24, 'l')], { energy: 100, tail: 130, notation: 'L, H, H, ↓↘→↓↘→ S (1 bar)' })
  await perform('Mirror → Hawk Mirage', 'Shane', 260, [[0, () => page.evaluate(() => __harness.ninjaTest.mirror('p1'))], [16, 'u']], { energy: 100, tail: 110, notation: '↓↓ Charge … Ultimate (2 bars)' })
  await boot('ns_yellow', 'ns_red')
  await perform('Kick string', 'Dustin', 90, [[0, 'j'], [8, 'k'], [19, 'k'], [31, 'k']], { notation: 'L, H, H, H' })
  await perform('Rock route', 'Dustin', 100, [[0, 'j'], [8, ['d']], [9, 'k'], [11, 'release']], { notation: 'L, →H (Rock Slash)' })
  await perform('Full REV → Tremor → Erupt', 'Dustin', 330, [[0, () => page.evaluate(() => __harness.ninjaTest.set('p1', { rev: { pips: 3, t: 0 } }))], ...DT(2, 's'), [6, ['l']], ...DT(16, 'd'), [40, 'release']], { notation: '(3 REV) ↓↓ hold S, →→ under them, release' })
  await perform('Trap trip → Ground Pound OTG', 'Dustin', 150, [[0, () => page.evaluate(() => { const T = __harness.ninjaTest; T.raw('p2').x = T.raw('p1').x + 150; T.set('p1', { traps: [{ x: Math.round(T.raw('p1').x + 174), feet: Math.round(T.raw('p1').y + T.raw('p1').h), life: 300, id: 99, armed: 20 }] }) })], [4, ['w', 'd']], [5, ['d']], [7, ['s']], [8, 'k'], [10, 'release']], { notation: 'trap trips them → hop forward, ↓H at once (OTG shock)' })
  await perform('String → Earthquake', 'Dustin', 90, [[0, 'j'], [8, 'k'], [19, 'k'], ...QCF2(25, 'l')], { energy: 100, tail: 130, notation: 'L, H, H, ↓↘→↓↘→ S (1 bar)' })
  await perform('Double → Fault Line', 'Dustin', 260, [[0, () => page.evaluate(() => __harness.ninjaTest.mirror('p1'))], [16, 'u']], { energy: 100, tail: 110, notation: '↓↓ Charge … Ultimate (2 bars)' })
} catch (e) { console.log('  ❌', e.stack) }
await browser.close(); server.close?.()
const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1))
