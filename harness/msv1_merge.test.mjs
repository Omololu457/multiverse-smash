// harness/msv1_merge.test.mjs — MSV1-MERGE: Shane & Dustin (windrangers) on the REAL game loop.
//   node harness/msv1_merge.test.mjs [section]     Keys: a/d/s/w move, j Light, k Heavy, l Special, o Grab, p Charge, ; block
// Real inputs only for the swap (owner 2026-11-19: hold Charge + ↓↓ + J; pad: hold L2 + D-pad ↓↓ + Square/X).
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const SHOTS = 'docs/msv1/screenshots_merge'; fs.mkdirSync(SHOTS, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
const section = t => console.log(`\n── MSV1-MERGE ${t} ──`)
const ONLY = process.argv[2] || 'all'
const want = k => ONLY === 'all' || ONLY === k
const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const errors = []
let page
async function boot(p1, p2, o = {}) {
  if (page) await page.close()
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.ninjaTest, null, { timeout: 30000 })
  await page.evaluate(o => { if (o.seed != null) __harness.rng.forceSeed(o.seed); __harness.start({ p1Skin: o.p1Skin, p2Skin: o.p2Skin, mode: o.mode, difficulty: o.difficulty }); __harness.skipToBattle() }, o)
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 200)) }
}
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (w = 'p1') => page.evaluate(w => { const s = __harness.ninjaTest.state(w); const f = __harness.ninjaTest.raw(w); s.duo = f._duo ? JSON.parse(JSON.stringify(f._duo)) : null; s.maxJumps = f.maxJumps; s.name = f.name; return s }, w)
const call = (fn, ...a) => page.evaluate(([fn, a]) => __harness.ninjaTest[fn](...a), [fn, a])
const shot = name => page.screenshot({ path: `${SHOTS}/MERGE_${name}.png` })
const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
async function motion(seq, button) {
  let held = []
  for (const k of seq) { const w = k == null ? [] : [].concat(k); for (const x of held) if (!w.includes(x)) await page.keyboard.up(x); for (const x of w) if (!held.includes(x)) await page.keyboard.down(x); held = w; await step(2) }
  if (button) { for (const b of [].concat(button)) await page.keyboard.down(b); await step(1); for (const b of [].concat(button)) await page.keyboard.up(b) }
  for (const x of held) await page.keyboard.up(x)
}
// hold Charge (P), ↓, release, ↓, then J — the owner's swap input (Ben's ↓↓ windows)
async function swapInput(gap = 2, hold = 1) { await page.keyboard.down('p'); await step(1); await tap(['s']); await step(gap); await tap(['s']); await step(1); await tap(['j']); if (hold) await step(hold); await page.keyboard.up('p') }
async function fresh(dx = 300, o = {}) {
  await call('reset')
  await page.evaluate(([dx, o]) => {
    const T = __harness.ninjaTest, a = T.raw('p1'), z = T.raw('p2')
    a.x = o.ax ?? 900; z.x = a.x + dx; z.facing = dx > 0 ? -1 : 1; a.facing = dx > 0 ? 1 : -1
    for (const f of [a, z]) { f.invulnTimer = 0; f.knockdownState = false; f.hitstun = 0; f.blockstun = 0; f.health = f.maxHealth; f.vx = 0; f.vy = 0; f.comboCounter = 0; f.energy = o.energy ?? 0; f.attacking = false; f.currentAttack = null; f.currentMove = null; f.isBlocking = false }
    if (a._duo) { a._duo.cd = 0; a._duo.want = 0; a._duo.armT = 0; a._duo.swap = null; a._duo.tag = null }
  }, [dx, o])
  await step(3)
  await call('np', 'p1', o.np ?? 100)
}
const settle = async (n = 120) => { for (let i = 0; i < n; i++) { await step(1); const s = await S(); if (!s.attacking && !(s.hitstun > 0) && !s.s?.streak && !s.s?.vanish && !s.duo?.swap) break } }
const form = async () => (await S()).key
async function toForm(k) { if ((await form()) === k) return; await fresh(500); await swapInput(); await untilSwap(); await settle(); await step(40) }
async function untilSwap(max = 30) { for (let i = 0; i < max; i++) { const s = await S(); if (s.duo?.swap) return s; await step(1) } return null }

try {
  await boot('windrangers', 'spd_red')
  if (want('roster')) {
    section('ONE ROSTER ENTRY + ALIASES')
    const meta = await page.evaluate(async () => { const m = await import('./characters.js'); const c = m.characters; const k = await import('./kits.js'); const d = await import('./nsDuo.js')
      return { uni: c.windrangers.universe, name: c.windrangers.name, sub: c.windrangers.subtitle, diff: c.windrangers.difficulty, arch: c.windrangers.archetype, tag: c.windrangers.tagline, hidR: !!c.ns_red.hidden, hidY: !!c.ns_yellow.hidden, hidD: !!c.windrangers.hidden,
        visible: Object.values(c).filter(x => x?.universe === 'power_rangers' && x.subUniverse === 'Ninja Storm' && !x.hidden).map(x => x.rosterKey),
        alias: [d.duoResolveSaved('ns_red', 'default'), d.duoResolveSaved('ns_yellow', 'default'), d.duoResolveSaved('spd_red', 'default')], kit: !!k.getKit('windrangers'), hp: c.windrangers.stats.maxHealth } })
    check('windrangers is a roster character (Power Rangers / Ninja Storm)', meta.uni === 'power_rangers')
    check('name "Ninja Storm MS_V1 Ranger Version" (owner), subtitle "Wind Rangers", difficulty 5', meta.name === 'Ninja Storm MS_V1 Ranger Version' && meta.sub === 'Wind Rangers' && meta.diff === 5, meta)
    check('archetype "Ninja Duo / Form Swapper", tagline "Two elements. One storm."', meta.arch === 'Ninja Duo / Form Swapper' && meta.tag === 'Two elements. One storm.')
    check('Shane / Dustin hidden; the duo folded into the Ninja Storm Squad (2026-11-23, still a valid id)', meta.hidR && meta.hidY && meta.hidD && meta.visible.includes('ns_squad') && !meta.visible.includes('windrangers') && !meta.visible.includes('ns_trio'), meta.visible)
    check('saved-settings aliases: ns_red AND ns_yellow → windrangers starting as Red (owner 2026-11-19), others untouched', meta.alias[0].key === 'windrangers' && meta.alias[0].skin === 'default' && meta.alias[1].key === 'windrangers' && meta.alias[1].skin === 'default' && meta.alias[2].key === 'spd_red', meta.alias)
    check('shared health 1248 (S.P.D. Red 1200 × 1.04)', meta.hp === 1248 && (await S()).maxHealth === 1248, (await S()).maxHealth)
    const s0 = await S()
    check('starts as Shane (default skin) with Shane\'s jumps', s0.key === 'ns_red' && s0.maxJumps === 3 && s0.duo?.form === 'ns_red', { key: s0.key, j: s0.maxJumps })
    check('move list: the duo kit shows the active form + TAB toggles it', await page.evaluate(async () => { const n = await import('./nsKit.js'); n.duoKitView('ns_red'); const a = n.NS_DUO_KIT.basics[0].desc; n.duoKitToggle(); const b = n.NS_DUO_KIT.basics[0].desc; n.duoKitView('ns_red'); return a !== b && n.NS_DUO_KIT.specials[0].name.startsWith('FORM SWAP') }))
    await shot('hud_shane')
  }

  if (want('swap')) {
    section('THE SWAP (hold Charge + ↓↓ + J, keyboard)')
    await fresh(400)
    const before = await S()
    await swapInput()
    const s1 = await untilSwap()
    check('↓↓ then O starts the swap', !!s1?.duo?.swap, s1?.duo)
    const log = []
    for (let i = 0; i < 16; i++) { const s = await S(); log.push({ t: s.duo?.swap?.t ?? null, key: s.key, inv: s.invuln, alpha: await page.evaluate(() => window.__harness.ninjaTest.raw('p1')._duo?.swap ? null : 1) }); if (i === 1) await shot('swap_smoke_1_vanish'); if (i === 7) await shot('swap_smoke_2_flip'); if (i === 10) await shot('swap_smoke_3_burst'); await step(1) }
    const after = await S()
    check('the form flipped Shane → Dustin', before.key === 'ns_red' && after.key === 'ns_yellow' && after.duo.form === 'ns_yellow', log.map(l => l.key).join(','))
    const flipAt = log.findIndex(l => l.key === 'ns_yellow')
    check('flip lands mid-swap (≈ frame 7 of 14)', flipAt >= 5 && flipAt <= 9, flipAt)
    check('6 invulnerable frames inside the smoke', log.filter(l => l.inv > 0).length >= 5 && log.filter(l => l.inv > 0).length <= 7, log.map(l => l.inv).join(','))
    check('cost 15 NP (Ben\'s SWAP_COST)', Math.round(before.s.np - after.s.np) >= 13 && Math.round(before.s.np - after.s.np) <= 15, [before.s.np, after.s.np])
    check('cooldown = Ben\'s SWAP_LOCKOUT (30) after the swap', after.duo.cd > 0 && after.duo.cd <= 30 && after.duo.cd >= 25, after.duo.cd)
    check('Dustin\'s jumps / art after the swap', after.maxJumps === 2 && after.name === 'Dustin', [after.maxJumps, after.name])
    await swapInput(); await step(3)
    check('a second swap during the cooldown is refused', (await S()).key === 'ns_yellow' && !(await S()).duo.swap, (await S()).duo)
    await step(40); await swapInput(); await untilSwap(); await settle()
    check('after the cooldown he swaps back to Shane', (await form()) === 'ns_red')
  }

  if (want('rules')) {
    section('SWAP RULES')
    // airborne + momentum
    await toForm('ns_red'); await fresh(500); await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); f.y -= 220; f.onGround = false; f.grounded = false; f.vx = 6; f.vy = -4 })
    await step(1); await swapInput(13)   // Shane: a SLOW ↓…↓ (13 f, inside Ben's 16, outside his 12-f down-streak) swaps straight away
    const air = await untilSwap(); const vxs = []; for (let i = 0; i < 8; i++) { vxs.push((await S()).vx); await step(1) }
    check('allowed airborne (Shane, slow ↓…↓ inside Ben\'s 16-frame window)', !!air?.duo?.swap && !air.grounded && !air.s.streak, { swap: !!air?.duo?.swap, g: air?.grounded })
    check('air swap keeps momentum (vx at the press held through the smoke)', Math.abs(air.vx) > 0.1 && vxs.every(v => Math.abs(v - air.vx) < 0.01), [air.vx, ...vxs].join(','))
    await settle(); await step(40)
    await toForm('ns_red'); await fresh(500); await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); f.y -= 200; f.onGround = false; f.grounded = false; f.vy = -3 }); await step(1)
    const k1 = await form(); await swapInput(1); const qs = await S(); const qsw = await untilSwap(40)
    check('Shane quick air ↓↓ keeps his down-streak; the swap comes out at the streak\'s end', k1 === 'ns_red' && !!qs.s.streak && !!qsw, { k1, streak: !!qs.s.streak, swap: !!qsw })
    await settle(); await step(40)
    // hitstun
    await toForm('ns_red')
    await fresh(400); await page.evaluate(() => { __harness.ninjaTest.raw('p1').hitstun = 40 }); await swapInput(); await step(2)
    let s = await S(); check('refused in hitstun', !s.duo.swap && s.key === 'ns_red', s.duo.lastRefuse)
    await fresh(400); await page.evaluate(() => { __harness.ninjaTest.raw('p1').blockstun = 40 }); await swapInput(); await step(2)
    s = await S(); check('refused in blockstun', !s.duo.swap && s.key === 'ns_red', s.duo.lastRefuse)
    await fresh(1400, { energy: 100 }); await call('move', 'sSuper'); await step(4); await swapInput(); await step(2)
    s = await S(); check('refused during a super', !s.duo.swap && s.key === 'ns_red', s.duo.lastRefuse); await settle(200)
    // normals: recovery only
    const kN = await form(); await fresh(600); await tap(['j']); await swapInput(1, 0)
    s = await S(); const early = !!s.duo.swap
    await settle(); s = await S()
    check('during a normal\'s startup / active the press waits, and the swap comes out in its recovery', !early && s.key !== kN, { early, key: s.key })
    await step(40)
    // end of a streak (buffered)
    const kS = await form(); await fresh(900, { ax: 600 }); await tap(['d']); await step(2); await tap(['d']); await step(2)
    const st = await S(); await swapInput(1)
    const swapped = await untilSwap(40); await settle()
    check('pressed during a streak → the swap fires at its end', !!st.s?.streak && !!swapped && (await form()) !== kS, { streak: !!st.s?.streak, swap: !!swapped })
    await step(40)
  }

  if (want('carry')) {
    section('SHARED / ENDED STATE')
    await fresh(300, { energy: 70 }); await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); f.health = 900; f.comboCounter = 3; f.comboTimer = 90 })
    const b = await S(); await swapInput(); await untilSwap(); await settle(); const a = await S()
    check('health / meter / facing / x carry across the swap', a.health === 900 && Math.abs(a.energy - b.energy) < 4 && a.facing === b.facing && Math.abs(a.x - b.x) < 30, { hp: a.health, en: [b.energy, a.energy], x: [b.x, a.x] })
    await step(40)
    // Mirror ends, clones pop
    await fresh(500); await motion(['s', null, 's'], 'p'); await step(14)
    const m0 = await S()
    await step(20); await swapInput(); await untilSwap(); await step(3)
    const m1 = await S()
    check('the Mirror ends on a swap (both bodies pop)', !!m0.s.mirror && !m1.s.mirror, { before: !!m0.s.mirror, end: m1.s.lastMirrorEnd })
    await settle(); await step(40)
    await fresh(500); await page.keyboard.down('a'); await tap(['p']); await page.keyboard.up('a'); await step(4)
    const c0 = await S(); await swapInput(); await untilSwap(); await step(2); const c1 = await S()
    check('clones pop on a swap', (c0.s.clones.length > 0 || !!c0.s.cloneJob) && c1.s.clones.length === 0 && !c1.s.cloneJob, [c0.s.clones.length, c1.s.clones.length])
    await settle(); await step(40)
    // Dustin: trap stays + bait (cross-form)
    if ((await form()) !== 'ns_yellow') { await fresh(500); await swapInput(); await untilSwap(); await settle(); await step(40) }
    await fresh(600, { ax: 700 }); await motion(['s', ['s', 'a'], 'a'], 'j'); await settle()
    const t0 = await S(); await swapInput(); await untilSwap(); await settle()
    const t1 = await S()
    check('Dustin\'s trap stays on screen after swapping to Shane', t0.s.traps.length > 0 && t1.s.traps.length === t0.s.traps.length && t1.key === 'ns_red', [t0.s.traps.length, t1.s.traps.length, t1.key])
    const trapX = t1.s.traps[0]?.x
    if (trapX != null) {
      const hp0 = await page.evaluate(x => { const z = __harness.ninjaTest.raw('p2'); z.x = x - (z.w || 48) / 2 + 60; z.vx = -3; return z.health }, trapX)
      for (let i = 0; i < 30; i++) { await page.evaluate(() => { const z = __harness.ninjaTest.raw('p2'); z.x -= 4 }); await step(1); if ((await S('p2')).health < hp0) break }
      const hp1 = (await S('p2')).health
      await shot('cross_form_trap_bait')
      check('cross-form trap bait: Dustin\'s trap trips the foe while Shane is in', hp1 < hp0 && (await S()).key === 'ns_red', [hp0, hp1])
    }
    await settle(); await step(40)
    // REV pips lost
    await fresh(800, { ax: 300 }); if ((await form()) !== 'ns_yellow') { await swapInput(); await untilSwap(); await settle(); await step(40); await fresh(800, { ax: 300 }) }
    await call('set', 'p1', { rev: { t: 0, pips: 2 } }); await swapInput(); await untilSwap(); await settle()
    check('REV pips are lost on the swap', (await S()).s.rev.pips === 0)
    await step(40)
  }

  if (want('strike')) {
    section('SWAP-IN STRIKE + TAG BONUS')
    await fresh(70); const k0 = await form(); const hp0 = (await S('p2')).health; const st0 = (await S()).duo.strikes
    await swapInput(); await untilSwap(); for (let i = 0; i < 12; i++) { await step(1); if (i === 9) await shot('swap_in_strike') }
    const hp1 = (await S('p2')).health, d = await S()
    check('the swap-in strike lands 30 (blunt, small stagger)', hp0 - hp1 >= 20 && hp0 - hp1 <= 30 && d.duo.strikes === st0 + 1, { dmg: hp0 - hp1, strikes: [st0, d.duo.strikes] })
    check('tag bonus armed for the OTHER (outgoing) form, 3 s', d.duo.tag?.[k0] > 150, d.duo.tag)
    await settle(); await step(32)
    // swap back → the tagged form's next special gets +10%
    await fresh(260); await page.evaluate(k => { const f = __harness.ninjaTest.raw('p1'); f._duo.tag = { [k]: 180 } }, k0)
    await page.evaluate(() => { const z = __harness.ninjaTest.raw('p2'); z.x = 99999 })
    await swapInput(); await untilSwap(); await settle()
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); z.x = a.x + 240; z.health = z.maxHealth; z.hitstun = 0; a.comboCounter = 0 })
    const h2 = (await S('p2')).health; await motion(['s', ['s', 'd'], 'd'], 'j'); await settle(); const tagDmg = h2 - (await S('p2')).health
    await step(40); await fresh(240); await page.evaluate(() => { __harness.ninjaTest.raw('p1').comboCounter = 0 })
    const h3 = (await S('p2')).health; await motion(['s', ['s', 'd'], 'd'], 'j'); await settle(); const plain = h3 - (await S('p2')).health
    check('tag bonus: the other form\'s next special deals +10% (Ninja Beam)', plain > 0 && Math.abs(tagDmg / plain - 1.1) < 0.02, { tagDmg, plain })
  }

  if (want('ult')) {
    section('STORM AND STONE (tag ultimate)')
    await fresh(260, { energy: 99 }); await motion(['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd'], ['l', 'k']); await step(3)
    check('refused below the full meter (2 bars = the real max)', (await S()).move !== 'sTag' && (await S()).s?.sup?.kind !== 'sTag')
    await settle(200)
    await fresh(260, { energy: 100 }); const hp0 = (await S('p2')).health
    await motion(['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd'], ['l', 'k']); await step(2)
    const u0 = await S(); check('↓↘→↓↘→ + Special + Heavy starts Storm and Stone (full meter spent)', u0.s?.sup?.kind === 'sTag' && u0.energy < 10, { sup: u0.s?.sup?.kind, en: u0.energy })
    let authored = 0, hits = 0
    for (let i = 0; i < 100; i++) { await step(1); const u = (await S()).s?.sup; if (u?.kind === 'sTag') { authored = u.dmg; hits = u.hits } if (i === 30) await shot('tag_ultimate_tornado'); if (i === 56) await shot('tag_ultimate_meet') }
    await settle(200)
    const dmg = hp0 - (await S('p2')).health
    check('Storm and Stone: 9 hits, 420 authored (energy 5 × 42 = 210 + blunt 3 × 50 + 60 = 210)', authored === 420 && hits === 9, { authored, hits })
    check('… measured on S.P.D. Red (his own damage mods apply, as for every MSV1 super)', dmg > 380 && dmg <= 420, dmg)
    await fresh(260, { energy: 100 }); await motion(['s', null, 's'], 'p'); await step(16)
    await motion(['s', ['s', 'd'], 'd', 's', ['s', 'd'], 'd'], ['l', 'k']); await step(2)
    check('inside the Mirror the 2-bar slot stays the Mirror ultimate (no tag ult)', (await S()).s?.sup?.kind !== 'sTag', (await S()).s?.sup?.kind)
    await settle(200)
  }

  if (want('moves')) {
    section('NO EXISTING MOVE BROKEN')
    await fresh(60); await tap(['o']); await step(2)
    check('Grab alone still grabs (no ↓↓)', await page.evaluate(() => !!__harness.ninjaTest.raw('p2').isGrabbed) && !(await S()).duo.swap); await settle(); await step(60)
    await fresh(400); await motion(['s', null, 's'], 'j'); await step(2)
    check('↓↓ + Light WITHOUT Charge is still a crouch normal (no swap)', !(await S()).duo.swap && (await S()).key === 'ns_red', (await S()).move); await settle()
    { await fresh(400); const kH = await form(); await page.keyboard.down('p'); await step(30); await tap(['s']); await step(4); await tap(['s']); await step(2); await tap(['j']); await step(1); await page.keyboard.up('p')
      const sw = await untilSwap(30); await settle(); check('a human-speed input (Charge held 0.5 s first, ↓ ↓ 4 f apart, then J) swaps', !!sw && (await form()) !== kH, { swap: !!sw, from: kH, now: await form() }); await step(40); await toForm('ns_red') }
    await fresh(400); await page.keyboard.down('p'); await step(3); await page.keyboard.up('p'); await step(14)
    check('a Charge tap on its own does nothing (no swap, no Mirror)', !(await S()).duo.swap && !(await S()).s.mirror && (await S()).key === 'ns_red'); await settle()
    await fresh(400); await motion(['s', null, 's'], 'p'); await step(6)
    check('↓↓ + Charge is still the Ninja Mirror', !!(await S()).s.mirror && !(await S()).duo.swap); await settle(); await step(40)
    await fresh(400); await swapInput(); await untilSwap(); await settle(); await step(40)
    await fresh(400); await page.keyboard.down('s'); await tap(['s'], 1); await page.keyboard.up('s'); await step(1); await page.keyboard.down('s'); await page.keyboard.down('l'); await step(10)
    const bur = await S(); await page.keyboard.up('l'); await page.keyboard.up('s'); await settle(200)
    check('Dustin ↓↓ + Special is still Earth Burrow', !!bur.s?.burrow || bur.move === 'nsBurrow', bur.move)
  }

  if (want('pad')) {
    section('PAD: hold L2 + D-pad ↓↓ + Square / X')
    await page.evaluate(async () => {
      window.__pad = { index: 0, id: 'Fake pad (standard)', connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) }
      navigator.getGamepads = () => [window.__pad]; window.dispatchEvent(new Event('gamepadconnected'))
      const { inputSettings } = await import('./input.js'); inputSettings.p1Type = 'controller'
    })
    const B = (i, v) => page.evaluate(([i, v]) => { __pad.buttons[i].pressed = v; __pad.buttons[i].value = v ? 1 : 0 }, [i, v])
    await fresh(400); const k0 = await form()
    await B(6, true); await step(1); await B(13, true); await step(1); await B(13, false); await step(2); await B(13, true); await step(1); await B(13, false); await step(1); await B(2, true); await step(1); await B(2, false); await step(1); await B(6, false)
    await untilSwap(); await settle()
    check('pad hold L2 + ↓↓ + Square/X swaps', (await form()) !== k0, [k0, await form()])
    await page.evaluate(async () => { const { inputSettings } = await import('./input.js'); inputSettings.p1Type = 'keyboard' })
  }

  if (want('start')) {
    section('START AS YELLOW + HUD')
    await boot('windrangers', 'spd_red', { p1Skin: 'start_yellow' })
    const s = await S(); check('"Start as: Yellow" skin starts the round as Dustin', s.key === 'ns_yellow' && s.maxHealth === 1248, s.key)
    await shot('hud_dustin')
    await boot('ns_red', 'ns_yellow')
    const o = await S(), o2 = await S('p2')
    check('old ids still boot the plain forms (tests / replays): ns_red 1200, ns_yellow 1296, no duo', o.key === 'ns_red' && o.maxHealth === 1200 && o2.maxHealth === 1296 && !o.duo, [o.maxHealth, o2.maxHealth])
  }
} catch (e) { check('MSV1-MERGE test ran to completion', false, e.stack || e.message) }
check('MSV1-MERGE no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close?.()
console.log(`\n══════════════════════════════\n  MSV1-MERGE TEST: ${PASS} passed, ${FAIL} failed\n══════════════════════════════`)
process.exit(FAIL ? 1 : 0)
