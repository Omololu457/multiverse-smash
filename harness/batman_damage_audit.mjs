// harness/batman_damage_audit.mjs — Batman (rebuilt) DAMAGE AUDIT through the real game and REAL keyboard input.
//  1. Batman routes measured against 4 live opponents (Goku, Superman, Higuruma, Arlong): single hits, the chain, chain →
//     Grapnel Breaker → KNIGHTFALL, launcher → jump-cancel → air strike, every support operation alone, and a fleet-assisted
//     pressure string (Airspace bombs landing during the chain).
//  2. Reference fighters measured the same way on the same target (a Batman dummy): Goku, Superman and Higuruma (technical)
//     — light, heavy, a Light ×3 string and their Ultimate.
// Writes docs/batman/damage_audit.json (DAMAGE_AUDIT.md is written from it).        node harness/batman_damage_audit.mjs
import fs from 'node:fs'
import { boot } from './batman_lib.mjs'
const out = { batman: {}, reference: {}, notes: [] }
const press = (page, step) => async (keys, h = 2) => { for (const k of keys) await page.keyboard.down(k); await step(h); for (const k of keys) await page.keyboard.up(k) }
async function setup(page, step, gap, energy = 100) {
  await page.evaluate(([gap, energy]) => { const H = __harness.batmanTest; H.reset(); __harness.setDummyBehavior('stand'); const a = H.raw(), b = H.raw('p2')
    a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = energy; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f.isBlocking = false; f._forceGuard = false
      f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, energy]); await step(1)
}
async function measure(G, gap, script, settle = 900, energy = 100) {
  const { page, step } = G; await setup(page, step, gap, energy)
  const hp = () => page.evaluate(() => { const b = __harness.batmanTest.raw('p2'); return b.health })
  const busy = () => page.evaluate(() => { const H = __harness.batmanTest, a = H.raw(), s = a._batman; return !!(a.attacking || H.ult().active || s?.ops?.length || s?.pay?.length || s?.bat || s?.hook || __harness.batmanTest.raw('p2').hitstun > 0 && false) })
  const h0 = await hp(), hits = []; let last = h0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); const h = await hp(); if (h < last) hits.push(last - h); last = h } }
  const M = { watch, press: async (keys, h = 2) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) } }
  await script(M)
  for (let i = 0; i < settle; i++) { if (!(await busy())) break; await watch(1) }
  await watch(10)
  const maxHp = await page.evaluate(() => __harness.batmanTest.raw('p2').maxHealth), def = await page.evaluate(() => __harness.batmanTest.raw('p2').defenseMultiplier || 1)
  return { dmg: h0 - last, hits, pctOfTargetHp: +((h0 - last) / maxHp * 100).toFixed(1), targetMaxHp: maxHp, targetDefMult: def }
}
const order = async (M, page, dir) => { await page.keyboard.down('p'); await M.watch(2); for (const k of [...dir, 'l']) await page.keyboard.down(k); await M.watch(2); for (const k of [...dir, 'l', 'p']) await page.keyboard.up(k) }
const ROUTES = {
  'light': [80, async M => { await M.press(['j']) }],
  'heavy': [90, async M => { await M.press(['k']) }],
  'chain Square ×3': [80, async M => { await M.press(['j'], 1); await M.watch(9); await M.press(['j'], 1); await M.watch(10); await M.press(['j'], 1) }],
  'chain → Grapnel Breaker': [80, async M => { await M.press(['j'], 1); await M.watch(9); await M.press(['j'], 1); await M.watch(10); await M.press(['j'], 1); await M.watch(12); await M.press(['d', 'l'], 2) }],
  'chain → Grapnel → KNIGHTFALL': [80, async M => { await M.press(['j'], 1); await M.watch(9); await M.press(['j'], 1); await M.watch(10); await M.press(['j'], 1); await M.watch(12); await M.press(['d', 'l'], 2); await M.watch(40); await M.press(['u'], 2) }],
  'launcher → jump → air strike': [55, async M => { await M.press(['i'], 1); await M.watch(9); await M.press(['w'], 2); await M.watch(8); await M.press(['j'], 2) }],
  'KNIGHTFALL (raw, point blank)': [90, async M => { await M.press(['u'], 2) }],
  'Gotham Airspace alone': [260, async M => { await M.press(['a', 'l'], 2) }],
  'Interceptor alone': [260, async M => { await order(M, M.page, []) }],
  'Carrier barrage alone': [260, async M => { await order(M, M.page, ['d']) }],
  'Skyhook alone': [260, async M => { await order(M, M.page, ['w']) }],
  'Capsule cover alone': [260, async M => { await order(M, M.page, ['s']) }],
  'Automaton alone': [260, async M => { await order(M, M.page, ['a']) }],
  'Airspace + chain under the bombs': [220, async M => { await M.press(['a', 'l'], 2); for (let i = 0; i < 70; i++) await M.watch(1); await M.page.evaluate(() => { const H = __harness.batmanTest, a = H.raw(), b = H.raw('p2'); a.x = b.x - 80 }); await M.press(['j'], 1); await M.watch(9); await M.press(['j'], 1); await M.watch(10); await M.press(['j'], 1) }],
}
// SUPPLEMENT (node harness/batman_damage_audit.mjs --supplement): the legal ultimate route. KNIGHTFALL needs a FULL 100 bar,
// so it cannot follow Grapnel (14) in the same string; it cancels from the third Square (bL3) instead. Merged into the JSON.
if (process.argv.includes('--supplement')) {
  const prev = JSON.parse(fs.readFileSync('docs/batman/damage_audit.json', 'utf8')); prev.supplement = {}
  for (const opp of ['goku', 'superman', 'higuruma', 'arlong']) {
    const G = await boot('batman', opp, 77003); prev.supplement[opp] = {}
    const R = { 'chain Square ×3 → KNIGHTFALL (bL3 cancel)': [80, async M => { await M.press(['j'], 1); await M.watch(9); await M.press(['j'], 1); await M.watch(10); await M.press(['j'], 1); await M.watch(8); await M.press(['u'], 2) }],
      // shared launcher standard (launchVy −32): the jump press must land after the hit freeze, and only the double jump reaches
      'launcher → jump → double jump → air strike': [55, async M => { await M.press(['i'], 1); await M.watch(20); await M.press(['w'], 2); await M.watch(6); await M.press(['w'], 2); await M.watch(6); await M.press(['j'], 2) }] }
    for (const [name, [gap, fn]] of Object.entries(R)) { const r = await measure(G, gap, fn, 900); prev.supplement[opp][name] = r; console.log(`batman vs ${opp.padEnd(9)} ${name.padEnd(44)} ${String(r.dmg).padStart(4)}  ${JSON.stringify(r.hits)}`) }
    await G.close()
  }
  prev.notes = [...new Set([...(prev.notes || []), 'The "launcher → jump → air strike" row only lands the launcher: the shared Balanced launcher (launchVy −32) lifts the target ≈590 px and the jump press is swallowed during the hit freeze; the working juggle is launcher → (≥20 f) jump → double jump → air strike (supplement).', 'KNIGHTFALL needs a full 100 bar: the "chain → Grapnel → KNIGHTFALL" row never fires the ultimate (Grapnel spends 14); the legal ultimate string is chain → KNIGHTFALL (supplement).'])]
  fs.writeFileSync('docs/batman/damage_audit.json', JSON.stringify(prev, null, 1)); process.exit(0)
}
try {
  for (const opp of ['goku', 'superman', 'higuruma', 'arlong']) {
    const G = await boot('batman', opp, 77001); out.batman[opp] = {}
    for (const [name, [gap, fn]] of Object.entries(ROUTES)) { const r = await measure(G, gap, M => fn({ ...M, page: G.page })); out.batman[opp][name] = r; console.log(`batman vs ${opp.padEnd(9)} ${name.padEnd(34)} ${String(r.dmg).padStart(4)}  ${JSON.stringify(r.hits)}`) }
    if (G.errors.length) out.notes.push(`${opp}: page errors ${G.errors.slice(0, 2).join(' | ')}`)
    await G.close()
  }
  // reference fighters on a Batman dummy
  for (const ref of ['goku', 'superman', 'higuruma']) {
    const G = await boot(ref, 'batman', 77002); out.reference[ref] = {}
    const R = { light: [80, async M => { await M.press(['j']) }], heavy: [90, async M => { await M.press(['k']) }],
      'Light ×3 (tapped)': [80, async M => { await M.press(['j'], 1); await M.watch(9); await M.press(['j'], 1); await M.watch(10); await M.press(['j'], 1) }],
      'Ultimate (point blank)': [90, async M => { await M.press(['u'], 2) }] }
    for (const [name, [gap, fn]] of Object.entries(R)) { const r = await measure(G, gap, fn, 1200); out.reference[ref][name] = r; console.log(`${ref.padEnd(9)} vs batman ${name.padEnd(24)} ${String(r.dmg).padStart(4)}  ${JSON.stringify(r.hits)}`) }
    await G.close()
  }
} catch (e) { console.log('ERR', e.stack) }
fs.mkdirSync('docs/batman', { recursive: true }); fs.writeFileSync('docs/batman/damage_audit.json', JSON.stringify(out, null, 1)); process.exit(0)
