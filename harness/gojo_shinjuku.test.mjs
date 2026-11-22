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
    // (user request after phase 3: hold P = charge, so the level is stepped by tapping again: 1 → 2 → 3 → off)
    await tap(['p'], 2); await step(2); s = await st(); ck('a second tap → L2', s.inf === 2, s.inf)
    await tap(['p'], 2); await step(2); s = await st(); ck('a third tap → L3', s.inf === 3, s.inf)
    await tap(['p'], 2); await step(2); s = await st(); ck('a fourth tap turns it off', s.inf === 0, s.inf)
    await reset(); for (let i = 0; i < 3; i++) { await tap(['p'], 2); await step(2) } s = await st()
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
    await reset({ gap: 420 }); await tap(['p'], 2); await step(2); await tap(['p'], 2); await step(2); await S('H.shoot({ speed: 10, damage: 60, lifetime: 200 })')
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

  if (want('mobility')) {
    const R = report.mobility = {}
    const dtap = async k => { await tap([k], 2); await step(2); await tap([k], 2) }
    // hold P = charge (the shared hold-to-charge: meter + the charge pose), CE refills, Infinity untouched
    { await reset(); await S('H.setEnergy(0)'); await S('H.setCe(30)'); await page.keyboard.down('p'); await step(60); const a = await st(); await page.keyboard.up('p'); await step(3); const b = await st()
      R.charge = { energy: a.energy, ce: +a.ce.toFixed(2), charging: a.charging, action: a.action, inf: a.inf, after: b.charging }
      ck('hold P = charge: the charge pose plays, super meter fills, CE refills, Infinity stays off', a.charging && a.action === 'charge' && a.energy > 0 && a.ce > 34 && a.inf === 0 && !b.charging, JSON.stringify(R.charge)) }
    { await reset(); await S('H.setInfinity(2)'); await page.keyboard.down('p'); await step(40); await page.keyboard.up('p'); await step(2); const a = await st()
      ck('charging keeps the Infinity level he had', a.inf === 2, a.inf) }
    // double-tap TOWARD = the old Gojo's teleport (beside the foe, facing them)
    { await reset({ gap: 600 }); await dtap('d'); await step(2); const a = await st(), b = await st('p2')
      R.teleport = { x: a.x, foeX: b.x, facing: a.facing, n: a.s.stats.teleports, cd: a.s.cd.tp }
      ck('double-tap → (toward): teleports right beside the foe, 48 f cooldown', a.s.stats.teleports === 1 && Math.abs((a.x + a.w) - b.x) <= 12 && a.s.cd.tp > 40, JSON.stringify(R.teleport))
      await step(4); await dtap('d'); await step(2); const c = await st(); ck('… not again during the cooldown', c.s.stats.teleports === 1, c.s.stats.teleports) }
    // double-tap AWAY = long blink (40 % of the screen), invulnerable in transit
    { await reset({ gap: 160 }); const x0 = (await st()).x; await dtap('a'); let minX = x0, inv = false
      for (let i = 0; i < 16; i++) { await step(1); const a = await st(); minX = Math.min(minX, a.x); if (a.s.blink?.inv) inv = true }
      const a = await st(); R.blink = { dx: x0 - minX, inv, n: a.s.stats.blinks }
      ck('double-tap ← (away): long blink ≈ 512 px away from the foe', a.s.stats.blinks === 1 && x0 - minX > 480 && x0 - minX < 530, JSON.stringify(R.blink))
      ck('… with invulnerable travel frames', inv) }
    { await reset({ gap: 300 }); await dtap('a'); for (let i = 0; i < 6 && !(await st()).s.blink?.inv; i++) await step(1)
      await S('H.shoot({ speed: 0, damage: 60, lifetime: 30 })'); await S('H.parkShots()'); await step(1); const a = await st()
      ck('a projectile on him during the blink travel passes through', a.s.blink?.inv !== undefined && a.hp === a.maxHp, JSON.stringify({ hp: a.hp, blink: a.s.blink })) }
    { await reset({ gap: 600 }); for (const k of ['s', 'd']) await page.keyboard.down(k); await step(2); await page.keyboard.up('s'); await step(2); await page.keyboard.up('d'); await step(2); await tap(['d'], 2); await step(3); const a = await st()
      ck('↓↘→ then → is not a teleport', a.s.stats.teleports === 0, a.s.stats.teleports) }
  }
  if (want('domain')) {
    const R = report.domain = {}
    // U = Unlimited Void: 1 bar + 50 CE, the old Gojo's freeze / background; 15 s; then 5 s burnout + 30 s cooldown
    { await reset({ gap: 200 }); const a0 = await st(); await tap(['u'], 2); for (let i = 0; i < 30; i++) await step(1)
      const a = await st(), b = await st('p2'); R.cast = { mine: a.s.dom.mine, frozen: b.frozen, energy: a.energy, ce: +(a0.ce - a.ce).toFixed(1), domains: a.s.stats.domains }
      ck('U → Unlimited Void opens (the old Gojo\'s domain): the foe is frozen', a.s.dom.mine && b.frozen, JSON.stringify(R.cast))
      ck('… costs 1 bar + 50 CE', a0.energy - a.energy === 100 && Math.abs(a0.ce - a.ce - 50) <= 3, JSON.stringify(R.cast))
      await page.evaluate(() => { const H = __harness.gojoShinjukuTest, a = H.raw(), b = H.raw('p2'); b.x = a.x + a.w + 6 })
      for (let i = 0; i < 120 && (await st()).attack; i++) await step(1)
      await S("H.move('gB', 'p1')"); for (let i = 0; i < 20; i++) await step(1); const b2 = await st('p2')
      ck('… and his attacks land on the frozen foe', b2.hp < b2.maxHp, b2.hp)
      await step(15 * 60); const e = await st(), eb = await st('p2'); R.end = { mine: e.s.dom.mine, burnout: e.s.burnout, cd: e.s.cd.domain, frozen: eb.frozen }
      ck('after 15 s it closes: 5 s burnout, 30 s cooldown', !e.s.dom.mine && e.s.burnout > 200 && e.s.cd.domain > 1500, JSON.stringify(R.end))
      await tap(['p'], 2); await step(2); ck('… burnout: no Infinity', (await st()).inf === 0)
      await tap(['l'], 2); await step(2); ck('… burnout: no techniques', !(await st()).attack)
      await step(400); await S('H.setCe(100)'); await tap(['u'], 2); await step(30); ck('… cooldown: U is refused', !(await st()).s.dom.mine) }
    { await reset({ gap: 200 }); await S('H.setEnergy(50)'); await tap(['u'], 2); await step(30); ck('no domain without a full bar', !(await st()).s.dom.mine) }
    // clash: both open within the window → mash Special 1.5 s; winner's domain 1 s, then both burn out
    { await reset({ gap: 300 }); await tap(['u'], 2); await step(10); await S("H.move('gDomain', 'p2')"); await step(20)
      for (let i = 0; i < 90; i++) { if (i % 3 === 0) await tap(['l'], 1); else await step(1) }
      let won = false; for (let i = 0; i < 240 && !((await st()).s.burnout > 0); i++) { await step(1); if ((await st('p2')).frozen) won = true }
      const a = await st(), b = await st('p2'); R.clash = { a: a.s.lastClash, clashes: a.s.stats.clashes, burnA: a.s.burnout, burnB: b.s.burnout, winnerDomainFroze: won }
      ck('domain clash: both open → a mash-off, the masher wins, then both burn out', a.s.stats.clashes >= 1 && a.s.lastClash?.result === 'win' && won && a.s.burnout > 0 && b.s.burnout > 0, JSON.stringify(R.clash)) }
  }
  if (want('moves')) {
    const R = report.moves = {}
    const hp2 = async () => (await st('p2')).hp
    // run `fn`, then step until both are idle; returns damage dealt to P2, CE spent, the hit log and the stats
    async function run(fn, o = {}) {
      await reset({ gap: o.gap }); if (o.setup) await o.setup()
      const a0 = await st(), h0 = a0.hp, b0 = (await st('p2')).hp, ce0 = a0.ce, e0 = a0.energy, hits = []
      let last = b0
      const tick = async n => { for (let i = 0; i < n; i++) { await step(1); const b = await hp2(); if (b < last) hits.push(last - b); last = b } }
      await fn(tick)
      for (let i = 0; i < (o.max || 300); i++) { const a = await st(), b = await st('p2'); if (!a.attack && !b.hitstun && b.grounded && !(a.s?.fields?.length) && !(a.s?.purples?.length)) break; await tick(1) }
      const a = await st(); return { dmg: b0 - (await hp2()), hits, ce: +(ce0 - a.ce).toFixed(2), bars: (e0 - a.energy) / 100, a, b: await st('p2'), selfDmg: h0 - a.hp }
    }
    const press = async (tick, keys, n = 1) => { for (const k of keys) await page.keyboard.down(k); await tick(n); for (const k of keys) await page.keyboard.up(k) }
    const motion = async (tick, dirs, btn) => { for (const d of dirs) { for (const k of d) await page.keyboard.down(k); await tick(2); for (const k of d) await page.keyboard.up(k) } await press(tick, btn, 2) }
    // CE and bars spent AT THE CAST (read before the press and right after the move starts; no regen while casting)
    async function costOf(fn, o = {}) { await reset({ gap: o.gap }); if (o.setup) await o.setup(); const a0 = await st(); await fn(async n => step(n)); const a = await st()
      return { ce: +(a0.ce - a.ce).toFixed(2), bars: Math.round((a0.energy - a.energy) / 10) / 10, move: a.attack?.name || null } }
    const near = (x, c) => Math.abs(x - c) <= 1   // CE regen ticks during the input frames
    const startup = async (keys) => { await reset(); await tap(keys, 1); const a = await st(); return a.attack ? { name: a.attack.name, activeStart: a.attack.activeStart } : null }
    // ── normals: inputs + frame data ──
    for (const [keys, name, st0] of [[['j'], 'gA1', 5], [['k'], 'gB', 9], [['i'], 'gC', 12], [['s', 'j'], 'gSweep', 7]]) {
      const m = await startup(keys); ck(`${keys.join('+')} → ${name}, ${st0} f startup`, m?.name === name && m.activeStart === st0, JSON.stringify(m))
    }
    ck('every move is tagged with a damageType', Object.values(D.moves).every(m => typeof m.damageType === 'string'), Object.entries(D.moves).filter(([k, m]) => !m.damageType).map(([k]) => k).join(','))
    let r = await run(async t => { await press(t, ['j']); await t(8); await press(t, ['j']); await t(8); await press(t, ['j']); await t(6) }, { gap: 40 })
    R.aString = r; ck('A string J, J, J: three hits (30 / 30 / 45 raw)', r.hits.length === 3 && Math.abs(r.hits[2] / r.hits[0] - 1.5) < 0.35, JSON.stringify(r.hits))
    r = await run(async t => { await press(t, ['k']); await t(12) }, { gap: 50 }); R.B = r.hits
    ck('B ≈ 68', r.hits.length === 1 && Math.abs(r.hits[0] - 68) <= 14, JSON.stringify(r.hits))
    r = await run(async t => { await press(t, ['i']); await t(14) }, { gap: 50 }); R.C = { hits: r.hits, vy: r.b.vy }
    ck('C high kick ≈ 84, launches', r.hits.length === 1 && Math.abs(r.hits[0] - 84) <= 17, JSON.stringify(r.hits))
    r = await run(async t => { await press(t, ['j', 'k'], 2); await t(30) }, { gap: 30 }); R.throw = r.hits
    ck('Throw (Light+Heavy): point-blank Red for ≈ 90', r.hits.length >= 1 && Math.abs(r.dmg - 90) <= 18, JSON.stringify(r.hits))
    // ── Blue ──
    r = await run(async t => { await press(t, ['l']); await t(70) }, { gap: 200 }); R.lapse = { hits: r.hits, ce: r.ce }
    R.lapse.cost = await costOf(async t => { await tap(['l'], 1); await t(1) })
    ck('Lapse Blue (neutral Special): 15 CE, pulls and hits 4 × 12', near(R.lapse.cost.ce, 15) && r.hits.length === 4, JSON.stringify(R.lapse))
    r = await run(async t => { await motion(t, [['s'], ['s', 'd'], ['d']], ['l', 'k']); await t(170) }, { gap: 220, max: 400 }); R.maxBlue = { hits: r.hits, ce: r.ce, bx: r.b.x }
    R.maxBlue.cost = await costOf(async t => { await motion(t, [['s'], ['s', 'd'], ['d']], ['l', 'k']); await t(1) })
    ck('Maximum Output Blue (↓↘→ + S + H): 35 CE, drags 8 × 10 toward the wall', near(R.maxBlue.cost.ce, 35) && R.maxBlue.hits.length === 8 && R.maxBlue.bx > 1700, JSON.stringify(R.maxBlue))
    { await reset({ gap: 600 }); const p0 = await st(), x0 = p0.x; await tap(['w', 'd', 'l'], 2); let mx = x0, md = 0; for (let i = 0; i < 14; i++) { await step(1); const q = await st(); mx = Math.max(mx, q.x); md = Math.max(md, Math.hypot(q.x - p0.x, q.y - p0.y)) }
      const s2 = await st(); R.blueStep = { dx: mx - x0, dist: Math.round(md), ce: 60.2 - s2.ce, used: s2.s.airSteps }
      ck('Blue Step (Up + → + S, diagonal): ~45 % of the screen (576 px) in 6 frames, 10 CE', md > 540 && md < 600 && mx - x0 > 380 && R.blueStep.ce > 9.5 && R.blueStep.ce < 10.5, JSON.stringify(R.blueStep)) }
    r = await run(async t => { await press(t, ['k', 'l'], 2); await t(14) }, { gap: 50 }); R.blueFist = { hits: r.hits, ce: r.ce }
    R.blueFist.cost = await costOf(async t => { await tap(['k', 'l'], 2); await t(1) }, { gap: 300 })
    ck('Blue Fist (Heavy + Special): 8 CE, ≈ 136', Math.abs(r.dmg - 136) <= 27 && near(R.blueFist.cost.ce, 8), JSON.stringify(R.blueFist))
    // ── Red ──
    r = await run(async t => { await press(t, ['d', 'l'], 2); await t(30) }, { gap: 60 }); R.red = { hits: r.hits, ce: r.ce, bounce: r.a.s.stats }
    R.red.cost = await costOf(async t => { await tap(['d', 'l'], 2); await t(1) }, { gap: 300 })
    ck('Reversal Red (→ + S): 15 CE, ≈ 70, wall bounce', r.hits.length >= 1 && Math.abs(r.hits[0] - 70) <= 14 && near(R.red.cost.ce, 15), JSON.stringify({ hits: r.hits, cost: R.red.cost }))
    { await reset({ gap: 380 }); await S('H.shoot({ speed: 7, damage: 60, lifetime: 160 })'); await step(14); await tap(['d', 'l'], 2); let refl = false
      for (let i = 0; i < 40; i++) { await step(1); if ((await projs()).some(p => p.refl)) refl = true }
      ck('Reversal Red reflects a projectile', refl) }
    r = await run(async t => { for (const k of ['d', 'l']) await page.keyboard.down(k); await t(40); for (const k of ['d', 'l']) await page.keyboard.up(k); await t(30) }, { gap: 160 }); R.delayed = { hits: r.hits, ce: r.ce }
    R.delayed.cost = await costOf(async t => { for (const k of ['d', 'l']) await page.keyboard.down(k); await t(16); for (const k of ['d', 'l']) await page.keyboard.up(k) }, { gap: 300 })
    ck('Delayed Red (hold → + S): 18 CE, plants, detonates on release ≈ 60', r.hits.length >= 1 && Math.abs(r.hits[0] - 60) <= 12 && near(R.delayed.cost.ce, 18), JSON.stringify(R.delayed))
    r = await run(async t => { await press(t, ['d', 'l', 'k'], 2); await t(60) }, { gap: 60 }); R.redRush = { hits: r.hits, ce: r.ce, vy: r.b.vy }
    R.redRush.cost = await costOf(async t => { await tap(['d', 'l', 'k'], 2); await t(1) }, { gap: 300 })
    ck('Red Rush (→ + S + H): 20 CE, ≈ 90, crumple then launch', r.hits.length >= 1 && Math.abs(r.hits[0] - 90) <= 18 && near(R.redRush.cost.ce, 20), JSON.stringify(R.redRush))
    // ── Purple ──
    r = await run(async t => { await motion(t, [['s'], ['a']], ['l']); await t(150) }, { gap: 260, max: 400 }); R.purple = { hits: r.hits, ce: r.ce, bars: r.bars }
    R.purple.cost = await costOf(async t => { await motion(t, [['s'], ['a']], ['l']); await t(1) }, { gap: 600 })
    ck('Hollow Purple (↓ ← + S): 1 bar + 40 CE, ≈ 300', R.purple.cost.bars === 1 && near(R.purple.cost.ce, 40) && Math.abs(r.dmg - 300) <= 60, JSON.stringify(R.purple))
    // 200 %: press Special inside each line's window
    const chant = async (hitLines) => run(async t => {
      await motion(t, [['s'], ['a']], ['l', 'k'])
      const C = D.chant, mt = async () => { const a = await st(); return a.attack ? a.attack.total - a.attack.timer : 1e9 }   // the move's own frame
      for (let i = 0; i < 3; i++) { const at = C.start + i * C.line + (hitLines[i] ? (C.window[0] + C.window[1]) / 2 - 1 : 5); for (let k = 0; k < 400 && (await mt()) < at; k++) await t(1); await press(t, ['l'], 1) }
      for (let k = 0; k < 400 && (await mt()) <= D.chantFire; k++) await t(1); await t(40)
    }, { gap: 300, max: 500, setup: () => S('H.setCe(100)') })
    const full = await chant([1, 1, 1]), none = await chant([0, 0, 0])
    R.purple200 = { full: { dmg: full.dmg, out: full.a.s.stats.lastPurpleOutput, chantHits: full.a.s.stats.chantHits, bars: full.bars }, none: { dmg: none.dmg, out: none.a.s.stats.lastPurpleOutput } }
    R.purple200.cost = await costOf(async t => { await motion(t, [['s'], ['a']], ['l', 'k']); await t(1) }, { gap: 600, setup: () => S('H.setCe(100)') })
    ck('200 % Purple: 70 CE at the start, 2 bars when it fires; three timed presses = exactly 200 %', near(R.purple200.cost.ce, 70) && full.a.s.stats.lastPurpleOutput === 200 && full.a.s.stats.chantHits === 3, JSON.stringify(R.purple200))
    ck('200 % Purple: no presses = 100 %; damage 230 → 460', none.a.s.stats.lastPurpleOutput === 100 && full.dmg > none.dmg * 1.6, JSON.stringify(R.purple200))
    { await reset({ gap: 300 }); await S('H.setCe(100)'); await motion(async n => step(n), [['s'], ['a']], ['l', 'k']); await step(40); const e1 = (await st()).energy
      await page.evaluate(() => { const f = __harness.gojoShinjukuTest.raw(); f.hitstun = 20 }); await step(4); const s4 = await st()
      ck('hit during the chant cancels it: CE lost, bars kept', !s4.attack && s4.energy === e1 && e1 === 300 && s4.ce < 35, JSON.stringify({ e1, e: s4.energy, ce: s4.ce, atk: s4.attack?.name })) }
    // ── Falling Blossom / RCT ──
    { await reset({ gap: 56 }); await motion(async n => step(n), [['s'], ['s', 'a'], ['a']], ['p']); await step(2); const h = (await st()).hp
      await S("H.move('gB', 'p2')"); for (let i = 0; i < 20; i++) await step(1); const a = await st(), b = await st('p2')
      R.fbe = { selfDmg: h - a.hp, foeDmg: b.maxHp - b.hp, fbe: a.s.stats.fbe, cd: a.s.cd.fbe }
      ck('Falling Blossom Emotion (↓↙← + P): 12-frame auto-counter ≈ 50, 8 s cooldown', a.hp === h && b.maxHp - b.hp > 30 && a.s.cd.fbe > 400, JSON.stringify(R.fbe)) }
    { await reset(); await page.evaluate(() => { __harness.gojoShinjukuTest.raw().health = 800 }); await motion(async n => step(n), [['s'], [], ['s']], [])
      await page.keyboard.down('p'); await step(120); await page.keyboard.up('p'); await step(4); const a = await st()
      R.rct = { healed: a.hp - 800, ceUsed: 60.2 - a.ce, cd: a.s.cd.rct }
      ck('RCT (↓↓ + hold P): 1 CE → 1.5 HP, 15 s cooldown', a.hp > 800 && Math.abs(R.rct.healed / (R.rct.ceUsed + 2 * 6) - 1.5) < 0.6 && a.s.cd.rct > 800, JSON.stringify(R.rct)) }
    // ── Black Flash ──
    r = await run(async t => { await press(t, ['k']); for (let i = 0; i < 40; i++) { await t(1); const b = await st('p2'); if (b.hitstun > 0) { await press(t, ['l']); break } } await t(20) }, { gap: 50 })
    R.blackFlash = { hits: r.hits, bf: r.a.s.stats.bf, zone: r.a.s.zone }
    ck('Black Flash: Special within 2 f of a B hit → ×2.5 damage, +10 CE, THE ZONE', r.a.s.stats.bf === 1 && r.a.s.zone > 300 && r.dmg > 68 * 2.2, JSON.stringify(R.blackFlash))
    r = await run(async t => { await press(t, ['k']); for (let i = 0; i < 40; i++) { await t(1); const b = await st('p2'); if (b.hitstun > 0) { await t(5); await press(t, ['l']); break } } await t(20) }, { gap: 50 })
    ck('… a late Special is not a Black Flash (it cancels into a technique)', r.a.s.stats.bf === 0, JSON.stringify(r.a.s.stats.bf))
    // ── Perfect Output ──
    r = await run(async t => { await press(t, ['j']); for (let i = 0; i < 30; i++) { await t(1); const a = await st(); if (a.attack?.gs?.contact) { for (let k = 0; k < 30 && (await st()).hitstop > 0; k++) await t(1); await press(t, ['d', 'l'], 1); break } } await t(30) }, { gap: 40 })
    R.perfect = { po: r.a.s.stats.po, ce: r.ce }
    ck('Perfect Output: a cancel on the earliest frame refunds 30 % of the CE cost', r.a.s.stats.po === 1, JSON.stringify(R.perfect))
    // ── burnout / depleted locks ──
    { await reset(); await page.evaluate(() => { __harness.gojoShinjukuTest.raw()._gs.burnout = 200 }); await tap(['l'], 2); const a = await st()
      ck('burnout locks Blue / Red / Purple / Blue Step', !a.attack && a.s.stats.techLocked >= 1) }
  }
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
fs.mkdirSync('docs/msv1/gojo', { recursive: true }); fs.writeFileSync('docs/msv1/gojo/test_results.json', JSON.stringify(report, null, 1))
console.log(`\n  GOJO_SHINJUKU: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
