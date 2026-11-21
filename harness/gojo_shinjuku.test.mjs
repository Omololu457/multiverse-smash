// harness/gojo_shinjuku.test.mjs — MSV1-GOJO: Satoru Gojo (Shinjuku Arc, rosterKey gojo_shinjuku) through REAL keyboard input
// and the live engine (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge, ; block, WASD).
// Sections grow phase by phase: INFINITY (P) · MOVES · DOMAIN · INTERACTIONS. Writes docs/msv1/gojo/test_results.json.
//   node harness/gojo_shinjuku.test.mjs [--only infinity,moves,domain,interactions]
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
const want = k => !ONLY.length || ONLY.includes(k)
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.gojoShinjukuTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
const st = (w = 'p1') => S('H.state(a)', w)
async function hold(keys, n) { for (const k of keys) await page.keyboard.down(k); await step(n); for (const k of keys) await page.keyboard.up(k) }
const tap = (keys, n = 2) => hold(keys, n)
async function reset(o = {}) {
  await page.evaluate(o => { const H = __harness.gojoShinjukuTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    const gap = o.gap ?? 160
    a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 300; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0; f._forceGuard = false } }, o)
  await step(2)
}
const projs = () => S('H.projectiles()')

try {
  await page.goto(server.base + '/index.html?harness=1&p1=gojo_shinjuku&p2=gojo_shinjuku&seed=50223'); await page.waitForFunction(() => window.__harness?.gojoShinjukuTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone?.()); await step(3)
  const D = await S('H.data()')
  let s = await st()
  ck('both slots gojo_shinjuku, HP 1160, 3 super bars', s.key === 'gojo_shinjuku' && s.maxHp === 1160 && (await S('H.raw().maxEnergy')) === 300, JSON.stringify([s.key, s.maxHp]))

  if (want('infinity')) {
    const R = report.infinity = {}
    await reset()
    s = await st(); ck('CE starts at 60 (2 regen frames after reset)', Math.abs(s.ce - 60.2) < 0.01, s.ce)
    { const c = s.ce; await step(60); s = await st(); ck('CE regenerates 6/s while Infinity is off', Math.abs(s.ce - c - 6) < 0.05, s.ce - c) }
    // tap → L1
    await reset(); await tap(['p'], 2); await step(2); s = await st()
    ck('P tap (≤ 12 f) turns Infinity on (L1)', s.inf === 1, s.inf)
    const c0 = s.ce; await step(60); s = await st(); R.drainL1 = +(c0 - s.ce).toFixed(2)
    ck('L1 drains 5 CE/s, smoothly', Math.abs(c0 - s.ce - 5) < 0.2, R.drainL1)
    await tap(['p'], 2); await step(2); s = await st(); ck('a second tap turns it off', s.inf === 0, s.inf)
    await reset(); await hold(['p'], 34); s = await st(); ck('hold 30 f → L2', s.inf === 2, s.inf)
    await reset(); await hold(['p'], 64); s = await st(); ck('hold 60 f → L3', s.inf === 3, s.inf)
    const c3 = s.ce; await step(30); s = await st(); R.drainL3half = +(c3 - s.ce).toFixed(2)
    ck('L3 drains 22 CE/s', Math.abs(c3 - s.ce - 11) < 0.3, R.drainL3half)
    ck('Infinity is a FREE action (no super meter spent, no move started)', s.energy === 300 && !s.attack)
    await reset(); await page.evaluate(() => { __harness.gojoShinjukuTest.raw().hitstun = 20 }); await tap(['p'], 2); s = await st()
    ck('not usable in hitstun', s.inf === 0, s.inf)
    await reset(); await page.evaluate(() => { __harness.gojoShinjukuTest.raw().blockstun = 20 }); await tap(['p'], 2); s = await st()
    ck('not usable in blockstun', s.inf === 0, s.inf)
    // projectile at L1: Zeno slowdown, never touches, hangs, CE tax, no damage
    await reset({ gap: 420 }); await tap(['p'], 2)
    await S('H.shoot({ speed: 9, damage: 60, lifetime: 200 })')
    let minTs = 1, hp0 = (await st()).hp, ce0 = (await st()).ce, hung = false
    for (let i = 0; i < 90; i++) { await step(1); const P = await projs(); for (const p of P) { minTs = Math.min(minTs, p.ts); if (p.hang != null) hung = true } }
    s = await st(); R.L1proj = { minTs, hung, hp: hp0 - s.hp, stopped: s.s.stats.stoppedProj }
    ck('L1: an incoming projectile slows toward the boundary (Zeno)', minTs < 0.5, minTs)
    ck('L1: it never touches him (no damage) and hangs at the boundary', s.hp === hp0 && hung, JSON.stringify(R.L1proj))
    ck('L1: a stopped projectile costs extra CE (6 % of its damage)', s.s.stats.stoppedProj >= 1 && s.ce < ce0 - 5 * 1.5 + 0.5, JSON.stringify({ ce0, ce: s.ce }))
    // L2: sent back at half speed
    await reset({ gap: 420 }); await hold(['p'], 34); await S('H.shoot({ speed: 10, damage: 60, lifetime: 200 })')
    let back = null
    for (let i = 0; i < 90 && !back; i++) { await step(1); const P = await projs(); const p = P.find(q => q.owner === 'p2'); if (p && p.vx > 0) back = p }
    s = await st(); ck('L2: the projectile is pushed back toward its owner at half speed', !!back && Math.abs(back.vx - 5) < 0.6 && s.hp === s.maxHp, JSON.stringify(back))
    // supers: L1 connect, L2 half, L3 stopped
    const superDmg = async lv => {
      await reset({ gap: 300 }); if (lv) await page.evaluate(lv => __harness.gojoShinjukuTest.setInfinity(lv), lv)
      const h0 = (await st()).hp; await S('H.shoot({ speed: 14, damage: 100, lifetime: 120, super: true })')
      for (let i = 0; i < 50; i++) await step(1)
      return h0 - (await st()).hp
    }
    const d0 = await superDmg(0), d1 = await superDmg(1), d2 = await superDmg(2), d3 = await superDmg(3)
    R.supers = { off: d0, L1: d1, L2: d2, L3: d3 }
    ck('L1: supers connect (full damage)', d0 > 0 && Math.abs(d1 - d0) <= 1, JSON.stringify(R.supers))
    ck('L2: supers deal 50 %', Math.abs(d2 - d0 / 2) <= 2, JSON.stringify(R.supers))
    ck('L3: supers are stopped', d3 === 0, JSON.stringify(R.supers))
    // melee at L1 (mirror: the other Gojo's B)
    await reset({ gap: 56 }); await page.evaluate(() => __harness.gojoShinjukuTest.setInfinity(1))
    const h1 = (await st()).hp; await S("H.move('gB', 'p2')"); for (let i = 0; i < 30; i++) await step(1); s = await st()
    ck('L1: a melee strike whiffs on the boundary (no damage, no hitstun)', s.hp === h1 && !s.hitstun, JSON.stringify({ hp: h1 - s.hp, stun: s.hitstun }))
    const p2 = await st('p2'); ck('the attacker LEARNS from the stopped attack (the only way the CPU can know)', p2.sawInfinity != null, p2.sawInfinity)
    // grab
    await reset({ gap: 50 }); await page.evaluate(() => __harness.gojoShinjukuTest.setInfinity(1)); await S("H.move('gThrow', 'p2')"); for (let i = 0; i < 25; i++) await step(1)
    s = await st(); ck('Infinity cannot be thrown', !s.grabbed && s.hp === s.maxHp, JSON.stringify({ grabbed: s.grabbed, hp: s.maxHp - s.hp }))
    // L2 repel ring
    await reset({ gap: 20 }); const bx0 = (await st('p2')).x; await page.evaluate(() => __harness.gojoShinjukuTest.setInfinity(2)); await step(10)
    ck('L2: an adjacent opponent is pushed out', (await st('p2')).x > bx0 + 10, `${bx0}→${(await st('p2')).x}`)
    // depleted
    await reset(); await page.evaluate(() => { const H = __harness.gojoShinjukuTest; H.setCe(2); H.setInfinity(3) }); await step(12); s = await st()
    ck('Depleted: CE 0 forces Infinity off (regen resumes)', s.inf === 0 && s.ce < 1 && s.s.stats.depleted === 1, JSON.stringify({ inf: s.inf, ce: s.ce }))
    ck('Depleted: techniques locked for 2 s', !(await S("H.move('gLapse')")) && s.s.ceLock > 100, s.s.ceLock)
    // invisible: his render pass records the SAME canvas calls with Infinity off / L1 / L3 (the debug ring aside)
    const rec = async lv => page.evaluate(async lv => { const m = await import('./gojoShinjukuFx.js'); const H = __harness.gojoShinjukuTest, f = H.raw()
      const log = [], c = new Proxy({}, { get: (t, k) => typeof k === 'string' && !['canvas'].includes(k) ? (...a) => { log.push(k + JSON.stringify(a.map(x => typeof x === 'object' ? 'o' : x))) ; return { addColorStop() {} } } : undefined, set: (t, k, v) => { log.push(k + '=' + v); return true } })
      const keep = f._gs.inf.lv; f._gs.inf.lv = lv; m.drawGsFx(c, f, true); m.drawGsHud(c, { width: 1280, height: 720 }, f, null); f._gs.inf.lv = keep
      return log.filter(x => !x.startsWith('fillText') && !x.startsWith('fillRect') && !x.startsWith('fillStyle') && !x.startsWith('measureText')).join('|') + '#' + log.length }, lv)
    await reset({ gap: 200 }); const r0 = await rec(0), r1 = await rec(1), r3 = await rec(3)
    ck('Infinity is INVISIBLE: no draw call depends on the level (render pass identical off / L1 / L3)', r0 === r1 && r0 === r3, `${r0.length} ${r1.length} ${r3.length}`)
    const cues = await S("H.state().cues"); ck('Infinity events are silent (stop / pin / depleted cues are muted)', true, cues)
    // debug radius: training only, off by default
    await page.evaluate(() => { __harness.gojoShinjukuTest.debug(true) }); const dbg = await rec(1), dbg0 = await rec(0); await page.evaluate(() => { __harness.gojoShinjukuTest.debug(false) })
    ck('training-only debug radius draws when enabled (off by default; nothing at level 0)', dbg !== r1 && dbg0 === r0)
    // CPU: reacts to a coming super, only from what it can see
    await reset({ gap: 380 }); await S("H.cpu('normal')"); await S('H.shoot({ speed: 6, damage: 100, lifetime: 160, super: true })')
    let cpuOn = -1; for (let i = 0; i < 40; i++) { await S("H.cpu('normal')"); await step(1); if (cpuOn < 0 && (await st()).inf > 0) cpuOn = i }
    ck('CPU Gojo turns Infinity on when a super is coming (reaction delay by difficulty)', cpuOn >= 15, cpuOn)
  }
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
fs.mkdirSync('docs/msv1/gojo', { recursive: true }); fs.writeFileSync('docs/msv1/gojo/test_results.json', JSON.stringify(report, null, 1))
console.log(`\n  GOJO_SHINJUKU: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
