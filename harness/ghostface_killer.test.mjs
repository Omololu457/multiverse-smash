// harness/ghostface_killer.test.mjs — Ghostface 2026-11-23: the KILLER DIAL (Ben 10 / Ninja Storm Trio gesture, real
// keyboard input): hold P · ↓↓ · J → Chrollo (Assassin), P · ↓↓ · K → Zaraki (Enforcer); as a killer the other button
// switches straight across and the same button turns back into Ghostface; the picking J / K never swings. Faster
// Backstage Passes (8-frame dash), the buff (HP / stats / damage, 18 s cheaper swap), and the borrowed smoke.
//   node harness/ghostface_killer.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const R = {}, errs = []
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
await page.goto(server.base + '/index.html?harness=1&p1=ghostface&p2=homelander&seed=9')
await page.waitForFunction(() => window.__harness?.omnimanViltrumTest)
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = () => page.evaluate(() => { const f = __harness.omnimanViltrumTest.raw(); return { key: f.rosterKey, form: f._killerForm || null, swap: !!f._gfSwapActive, bp: !!f._bpActive, atk: f.attacking ? (f.currentAttack?.name || f.currentAttack?.type || 'atk') : null, energy: f.energy, hp: f.maxHealth, x: f.x, dial: f._gfDial?.last || null } })
const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
async function dial(btn) { await page.keyboard.down('p'); await step(1); await tap(['s']); await step(2); await tap(['s']); await step(1); await tap([btn]); await step(1); await page.keyboard.up('p') }
async function fresh() {
  await page.evaluate(async () => { const H = __harness.omnimanViltrumTest; (await import('./abilities.js')).revertGhostfaceSwap(H.raw()); H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 900; b.x = 1300; a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.hitstun = 0; f.blockstun = 0; f.invulnTimer = 0; f.vx = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0 } a.energy = a.maxEnergy })
  await step(3)
}
const until = async (fn, max = 60) => { const seen = []; for (let i = 0; i < max; i++) { const s = await S(); seen.push(s); if (fn(s)) return { s, i, seen }; await step(1) } return { s: await S(), i: -1, seen } }
try {
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle?.() }); await step(5)
  let s = await S(); R.stats = s
  ck('buff: Ghostface HP 950 → 1250 (before the roster-wide multipliers)', await page.evaluate(async () => (await import('./characters.js')).characters.ghostface.stats.maxHealth === 1250))
  ck('buff: basic damage ×1.35 (Light 35 → 47)', await page.evaluate(async () => (await import('./characters.js')).characters.ghostface.basic_attacks.light.damage === 47))
  // P S S J → Chrollo
  await fresh(); await dial('j'); let r = await until(x => x.swap, 90); R.pssj = { frames: r.i, s: r.s }
  ck('P S S J → Chrollo (Assassin) via a Backstage Pass', r.s.key === 'chrollo' && r.s.form === 'assassin', JSON.stringify(r.s))
  ck('… the picking J never swings (no Light attack during the gesture)', !r.seen.some(x => x.atk && /light|jab/i.test(x.atk)), JSON.stringify(r.seen.map(x => x.atk).filter(Boolean)))
  // smoke went up (render-only state)
  const sm = await page.evaluate(async () => { const m = await import('./ghostfaceKiller.js'); const st = m.ghostfaceSmokeState(__harness.omnimanViltrumTest.raw()); return st ? st.n : 0 })
  ck('borrowed smoke bursts on the vanish / re-entry / swap (Kakashi poof + Robin pellet + Batman field)', sm >= 2, String(sm))
  await step(40)
  // as Chrollo: P S S K → straight to Zaraki (Ben-style alien swap)
  await dial('k'); r = await until(x => x.key === 'zaraki', 40); R.switch = r.s
  ck('as a killer, P S S K switches straight to Zaraki (Enforcer)', r.s.key === 'zaraki' && r.s.form === 'enforcer', JSON.stringify(r.s))
  await step(40)
  await dial('k'); r = await until(x => x.key === 'ghostface', 40); R.revert = r.s
  ck('the same button again (P S S K as Zaraki) turns him back into Ghostface', r.s.key === 'ghostface' && !r.s.swap, JSON.stringify(r.s))
  // P S S K from Ghostface → Zaraki
  await fresh(); await dial('k'); r = await until(x => x.swap, 90)
  ck('P S S K → Zaraki (Enforcer)', r.s.key === 'zaraki', JSON.stringify(r.s))
  // faster Backstage Pass (neutral Special): dash frames
  await fresh(); R.bpFired = await page.evaluate(async () => (await import('./abilities.js')).triggerGhostfaceBackstagePass(__harness.omnimanViltrumTest.raw(), 'switch', 0, null))
  let n = 0; for (let i = 0; i < 40; i++) { const x = await S(); if (x.bp) n++; else if (n) break; await step(1) }
  R.bpFrames = n
  ck('faster Backstage Pass: the off-screen dash is over in ≤ 10 frames (was 16)', R.bpFired && n > 0 && n <= 10, JSON.stringify({ fired: R.bpFired, n }))
  // swap window 18 s
  ck('Killer form lasts 18 s and costs 15 Dread', await page.evaluate(async () => { const src = await (await fetch('./abilities.js')).text(); return /GF_SWAP_DURATION = 18 \* 60/.test(src) && /GF_SWAP_COST {5}= 15/.test(src) }))
  fs.mkdirSync('docs/ghostface', { recursive: true })
  await fresh(); await dial('j'); await step(6); await page.screenshot({ path: 'docs/ghostface/killer_dial_smoke.png' })
  // CPU: a real CPU Ghostface (P2, hard) swaps through the SAME dial (P ↓↓ J/K), both killers, and switches across
  const cpu = await browser.newPage({ viewport: { width: 1280, height: 720 } }); cpu.on('pageerror', e => errs.push('cpu: ' + e.message))
  await cpu.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await cpu.goto(server.base + '/index.html?harness=1&p1=homelander&p2=ghostface&seed=12')
  await cpu.waitForFunction(() => window.__harness?.omnimanViltrumTest)
  R.cpu = await cpu.evaluate(() => {
    __harness.start({ mode: 'vs', difficulty: 'hard' }); __harness.skipToBattle?.()
    const H = __harness.omnimanViltrumTest, seen = new Set(), acts = []
    for (let i = 0; i < 3600; i++) {
      const a = H.raw(), g = H.raw('p2'); a.health = a.maxHealth; g.health = Math.max(g.health, g.maxHealth * 0.6)   // keep the round alive
      __harness.luffyTest.step(1)
      if (g._gfSwapActive) seen.add(g._gfSwapTarget)
      const last = g._gfDial?.last; if (last && acts[acts.length - 1] !== last + '@' + g._gfDial.t) { acts.push(last + '@' + g._gfDial.t); g._gfDial.last = null }
    }
    const g = H.raw('p2'); return { ai: !!g._gfDial?.cpu, gestures: g._gfDial?.cpu?.swaps || 0, picks: g._gfDial?.cpu?.picks || [], seen: [...seen], acts: acts.map(x => x.split('@')[0]) }
  })
  await cpu.close()
  ck('CPU Ghostface plays the P ↓↓ J/K gesture through the dial (≥ 3 times in a minute)', R.cpu.ai && R.cpu.gestures >= 3, JSON.stringify(R.cpu))
  ck('… and the dial actually fires (Backstage Pass swap / killer switch / revert)', R.cpu.acts.some(x => /^pass:/.test(x)), JSON.stringify(R.cpu.acts))
  ck('… using BOTH killers (Chrollo at range, Zaraki up close)', R.cpu.seen.includes('chrollo') && R.cpu.seen.includes('zaraki'), JSON.stringify(R.cpu.seen))
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.mkdirSync('docs/ghostface', { recursive: true }); fs.writeFileSync('docs/ghostface/killer_results.json', JSON.stringify({ pass, fail, R }, null, 1))
console.log(`\n  GHOSTFACE KILLER: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
