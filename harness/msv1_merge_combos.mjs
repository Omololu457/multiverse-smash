// harness/msv1_merge_combos.mjs — MSV1-MERGE Phase 3: the SWAP combos of Shane & Dustin, performed with REAL key input in
// training mode on the real loop. Per step: damage dealt (HP bar), Ninja Power, meter, active form, engine combo counter.
// Output feeds docs/msv1/MERGE_COMBOS.md.   node harness/msv1_merge_combos.mjs [--json out.json]
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
  await page.evaluate(() => __harness.ninjaTest.reset()); await page.evaluate(o => { const f = __harness.ninjaTest.raw('p1'); if (f._duo && o.form && f.rosterKey !== o.form) { } }, o)
  await page.evaluate(([dx, o]) => { const T = __harness.ninjaTest, a = T.raw('p1'), z = T.raw('p2'); a.x = o.ax ?? 800; z.x = a.x + dx; a.facing = dx > 0 ? 1 : -1; z.facing = -a.facing
    for (const f of [a, z]) { f.invulnTimer = 0; f.knockdownState = false; f.hitstun = 0; f.blockstun = 0; f.health = f.maxHealth; f.vx = 0; f.vy = 0; f.comboCounter = 0; f.energy = o.energy ?? 0; f.attacking = false; f.currentAttack = null } }, [dx, o])
  await step(3); await page.evaluate(() => __harness.ninjaTest.np('p1', 100))
}

// steps: [frame, action] like msv1_combos; marks: [frame, label] — a row is recorded at each mark
async function perform(name, dx, script, marks, o = {}) {
  await fresh(dx, o); if ((await S()).key !== (o.form || 'ns_red')) { await swapNow(); await fresh(dx, o) }
  await page.evaluate(() => { const d = __harness.ninjaTest.raw('p1')._duo; if (d) { d.tag = null; d.cd = 0; d.want = 0; d.armT = 0 } })   // no leftover tag / cooldown from the setup swap
  if (o.setup) await o.setup()
  const z0 = await S('p2'); let lastH = z0.health, held = new Set(), taps = [], prev = { h: z0.health, np: 100, en: o.energy ?? 0 }
  const rows = [], total = Math.max(...script.map(x => x[0]), ...marks.map(m => m[0])) + 2
  let maxCombo = 0, dropped = null, hit = false
  for (let t = 0; t <= total; t++) {
    for (const [, act] of script.filter(x => x[0] === t)) {
      if (typeof act === 'function') await act()
      else if (act === 'release') { for (const k of held) await page.keyboard.up(k); held.clear() }
      else if (Array.isArray(act)) { for (const k of held) if (!act.includes(k)) { await page.keyboard.up(k); held.delete(k) } for (const k of act) if (!held.has(k)) { await page.keyboard.down(k); held.add(k) } }
      else { await page.keyboard.down(act); taps.push(act) }
    }
    await step(1)
    for (const k of taps.splice(0)) await page.keyboard.up(k)
    const a = await S('p1'), z = await S('p2')
    if (z.health < lastH) hit = true; lastH = z.health
    maxCombo = Math.max(maxCombo, a.combo || 0)
    if (hit && dropped == null && !(z.hitstun > 0) && !z.knockdown && !(z.blockstun > 0) && z.grounded) dropped = t
    for (const [, label] of marks.filter(m => m[0] === t)) {
      const cur = { h: z.health, np: Math.round(a.s?.np ?? 0), en: Math.round(a.energy || 0) }
      rows.push({ tagged: !!(await page.evaluate(() => __harness.ninjaTest.raw('p1').currentAttack?.nj?.tag)), label, dmg: prev.h - cur.h, np: cur.np - prev.np, npNow: cur.np, meter: cur.en, form: a.key, combo: a.combo || 0, swap: !!(await page.evaluate(() => __harness.ninjaTest.raw('p1')._duo?.swap)) })
      prev = cur
    }
  }
  for (const k of held) await page.keyboard.up(k)
  await settle()
  const total_dmg = z0.health - (await S('p2')).health
  out.push({ name, rows, total: total_dmg, maxCombo, droppedAt: dropped, notation: o.notation || '' })
  console.log(`\n  ${name}  — total ${total_dmg}, engine combo ${maxCombo}${dropped != null ? `, foe actionable from frame ${dropped}` : ', foe never actionable (true combo)'}`)
  for (const r of rows) console.log(`     ${r.label.padEnd(44)} dmg ${String(r.dmg).padStart(4)}  NP ${String(r.np).padStart(4)} (now ${String(r.npNow).padStart(3)})  meter ${String(r.meter).padStart(3)}  ${r.form}${r.swap ? ' (swapping)' : ''}${r.tagged ? ' [tag ×1.1]' : ''}`)
}
async function settle() { for (let i = 0; i < 200; i++) { await step(1); const s = await S(); if (!s.attacking && !(s.hitstun > 0)) break } await step(40) }
async function swapNow() { await page.keyboard.down('p'); await step(1); for (const k of ['s', null, 's', 'j']) { if (k) { await page.keyboard.down(k); await step(1); await page.keyboard.up(k) } else await step(2) } await step(1); await page.keyboard.up('p'); await settle() }
const MOT = (t, seq, btn, gap = 2) => { const r = []; seq.forEach((k, i) => r.push([t + i * gap, [].concat(k)])); r.push([t + seq.length * gap, 'release']); r.push([t + seq.length * gap + 1, btn]); return r }
const QCF = (t, btn) => MOT(t, ['s', ['s', 'd'], 'd'], btn)
const QCF2 = (t, btn) => MOT(t, ['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd'], btn, 1)
const SWAP = t => [[t - 1, () => page.keyboard.down('p')], [t, 's'], [t + 2, 's'], [t + 3, 'j'], [t + 5, () => page.keyboard.up('p')]]   // hold Charge, ↓, ↓, J — the owner's swap input
const CHORD = (t, a, b) => [[t, [a, b]], [t + 2, 'release']]
try {
  console.log('\n── MSV1-MERGE SWAP COMBOS (training mode, real keys; damage = HP bar lost; NP = Ninja Power delta per step) ──')
  await boot('windrangers', 'ns_yellow')
  // 1. TAG-IN: Shane's string, swap in its recovery → the swap-in strike → Dustin's Rock Slash
  await perform('1. Tag-in (Shane → Dustin)', 80,
    [[0, 'j'], [8, 'k'], [18, 'k'], ...SWAP(26), [44, ['d']], [45, 'k'], [47, 'release']],
    [[16, 'Shane L, H'], [28, 'Shane H (2nd kick)'], [44, 'Charge+↓↓+J: swap + swap-in strike'], [70, 'Dustin →H Rock Slash']],
    { notation: 'L, H, H, Charge+↓↓+J, →H' })
  // 2. TAG BONUS: Shane L,H → swap (strike lands: Shane tagged) → Dustin L → swap back after the 30-f cooldown → Shane Tornado +10%
  await perform('2. Tag bonus round trip (Shane → Dustin → Shane)', 80,
    [[0, 'j'], [8, 'k'], ...SWAP(16), [34, 'j'], ...SWAP(66), ...QCF(86, 'l')],
    [[14, 'Shane L, H'], [34, 'Charge+↓↓+J: swap + strike (tags Shane)'], [64, 'Dustin L (cooldown runs)'], [84, 'Charge+↓↓+J: swap back + strike'], [96, 'Shane ↓↘→ S Tornado starts'], [140, 'Shane Tornado (+10% tag bonus) hits']],
    { notation: 'L, H, Charge+↓↓+J, L, Charge+↓↓+J, ↓↘→ S' })
  // 3. STONE OPENER: Dustin's string, swap → Shane's Ninja Beam
  await perform('3. Stone opener (Dustin → Shane beam)', 80,
    [[0, 'j'], [8, 'k'], [19, 'k'], ...SWAP(28), ...QCF(46, 'j')],
    [[17, 'Dustin L, H'], [30, 'Dustin H'], [46, 'Charge+↓↓+J: swap + swap-in strike'], [80, 'Shane ↓↘→ L Ninja Beam']],
    { form: 'ns_yellow', notation: 'L, H, H, Charge+↓↓+J, ↓↘→ L' })
  // 4. MAX: string → STORM AND STONE (the full meter). Super → swap → super is refused (see MERGE_COMBOS.md)
  await perform('4. Max: Shane string → Storm and Stone (full meter)', 80,
    [[0, 'j'], [8, 'k'], [18, 'k'], ...MOT(24, ['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd'], null, 1).slice(0, -1), ...CHORD(31, 'l', 'k')],
    [[28, 'Shane L, H, H'], [130, '↓↘→↓↘→ S+H STORM AND STONE']],
    { energy: 100, notation: 'L, H, H, ↓↘→↓↘→ S+H' })
  await perform('4b. Super → swap → super (refused)', 80,
    [[0, 'j'], [8, 'k'], [18, 'k'], ...QCF2(24, 'l'), ...SWAP(60), ...QCF2(140, 'l')],
    [[28, 'Shane L, H, H'], [60, 'Storm Ascension (1 bar) running'], [64, 'Charge+↓↓+J during the super (refused)'], [140, 'after the super'], [190, 'Dustin ↓↘→↓↘→ S']],
    { energy: 100, notation: 'L, H, H, ↓↘→↓↘→ S, Charge+↓↓+J, ↓↘→↓↘→ S' })
} catch (e) { console.log('  ❌', e.stack) }
await browser.close(); server.close?.()
const j = process.argv.indexOf('--json'); if (j > 0) fs.writeFileSync(process.argv[j + 1], JSON.stringify(out, null, 1))
