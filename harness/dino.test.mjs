// harness/dino.test.mjs — MSV1-DINO: the Dino Thunder Rangers (dinothunder) — Conner / Ethan / Kira / Trent as ONE fighter
// on the REAL game loop. Real inputs only for the swap: HOLD P + J/K/L/O picks Red/Blue/Yellow/White; double-tap P = next.
//   node harness/dino.test.mjs [section,section]     Keys: a/d/s/w move, j Light, k Heavy, l Special, o Grab, p Charge, u Ultimate
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const SHOTS = 'docs/msv1/dino/screenshots'; fs.mkdirSync(SHOTS, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
const section = t => console.log(`\n── MSV1-DINO ${t} ──`)
const ONLY = process.argv[2] || 'all'
const want = k => ONLY === 'all' || ONLY.split(',').includes(k)
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
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.ninjaTest, null, { timeout: 90000 })
  await page.evaluate(o => { __harness.rng.forceSeed(o.seed ?? 7); __harness.start({ p1Skin: o.p1Skin, p2Skin: o.p2Skin, mode: o.mode, difficulty: o.difficulty }); __harness.skipToBattle() }, o)
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 90000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 200)) }
}
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (w = 'p1') => page.evaluate(w => { const s = __harness.ninjaTest.state(w); const f = __harness.ninjaTest.raw(w); s.duo = f._duo ? JSON.parse(JSON.stringify(f._duo)) : null; s.maxJumps = f.maxJumps; s.name = f.name; s.sheet = f.animationData?.idle?.sheet; s.move = f.currentMove || null; s.atk = f.currentAttack?.name || null; s.speed = f.speed; s.x = f.x; s.y = f.y; s.facing = f.facing; s.vx = f.vx; s.inv = f.invulnTimer || 0; s.energy = f.energy; s.sup = f._ninja?.sup ? JSON.parse(JSON.stringify(f._ninja.sup)) : null; s.mirror = f._ninja?.mirror ? { ix: f._ninja.mirror.ix, t: f._ninja.mirror.t } : null; return s }, w)
const call = (fn, ...a) => page.evaluate(([fn, a]) => __harness.ninjaTest[fn](...a), [fn, a])
const raw = (w, fn) => page.evaluate(([w, src]) => (new Function('f', 'z', src))(__harness.ninjaTest.raw(w), __harness.ninjaTest.raw(w === 'p1' ? 'p2' : 'p1')), [w, fn])
const shot = name => page.screenshot({ path: `${SHOTS}/${name}.png` })
const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
// HOLD P, then the pick button
async function pick(btn, hold = 2) { await page.keyboard.down('p'); await step(hold); await tap([btn]); await step(1); await page.keyboard.up('p'); await step(1) }
async function dblP(gap = 4) { await tap(['p']); await step(gap); await tap(['p']); await step(1) }
async function fresh(dx = 400, o = {}) {
  await call('reset')
  await page.evaluate(([dx, o]) => {
    const T = __harness.ninjaTest, a = T.raw('p1'), z = T.raw('p2')
    a.x = o.ax ?? 900; z.x = a.x + dx; z.facing = -1; a.facing = 1
    for (const f of [a, z]) { f.invulnTimer = 0; f.knockdownState = false; f.hitstun = 0; f.blockstun = 0; f.health = f.maxHealth; f.vx = 0; f.vy = 0; f.energy = o.energy ?? 0; f.attacking = false; f.currentAttack = null; f.currentMove = null; f.comboCounter = 0 }
    if (a._duo) Object.assign(a._duo, { cd: 0, want: 0, swap: null, sdm: 0, speed: 0, skin: 0, camo: 0, evil: 0, corr: o.corr ?? 0, corrAcc: 0, tagAny: 0, lastHp: a.health, pAt: null, held: false })
    if (a._ninja) { a._ninja.mirror = null; a._ninja.sup = null; a._ninja.streak = null }
  }, [dx, o])
  await step(3)
  await call('np', 'p1', o.np ?? 100)
}
const settle = async (n = 120) => { for (let i = 0; i < n; i++) { await step(1); const s = await S(); if (!s.attacking && !(s.hitstun > 0) && !s.duo?.swap) break } }
async function untilSwap(max = 30) { for (let i = 0; i < max; i++) { const s = await S(); if (s.duo?.swap) return s; await step(1) } return null }
async function motion(seq, button) {
  let held = []
  for (const k of seq) { const w = k == null ? [] : [].concat(k); for (const x of held) if (!w.includes(x)) await page.keyboard.up(x); for (const x of w) if (!held.includes(x)) await page.keyboard.down(x); held = w; await step(2) }
  if (button) { for (const b of [].concat(button)) await page.keyboard.down(b); await step(1); for (const b of [].concat(button)) await page.keyboard.up(b) }
  for (const x of held) await page.keyboard.up(x)
}
const QCF = ['s', ['s', 'd'], 'd'], DD = ['s', null, 's']
async function toForm(btn) { await fresh(600); await pick(btn); await untilSwap(); await settle(); await step(100) }
// one special: damage dealt, moves seen, gem spent
async function special(dx, seq, button, frames = 70, pre = null) {
  await fresh(dx)
  if (pre) await raw('p1', pre)
  const b = await S(), z0 = (await S('p2')).health, moves = new Set()
  await motion(seq, button)
  let zMin = z0, npMin = b.s.np
  for (let i = 0; i < frames; i++) { const s = await S(); if (s.atk) moves.add(s.atk); npMin = Math.min(npMin, s.s.np); zMin = Math.min(zMin, (await S('p2')).health); await step(1) }
  return { moves: [...moves], dmg: z0 - zMin, np: Math.round(b.s.np - npMin) }
}

try {
  await boot('dinothunder', 'spd_red')
  if (want('roster')) {
    section('ONE ROSTER ENTRY')
    const meta = await page.evaluate(async () => { const c = (await import('./characters.js')).characters
      return { uni: c.dinothunder.universe, sub: c.dinothunder.subUniverse, name: c.dinothunder.displayName, arch: c.dinothunder.archetype, diff: c.dinothunder.difficulty, tag: c.dinothunder.tagline,
        hid: ['dt_red', 'dt_blue', 'dt_yellow', 'dt_white'].map(k => !!c[k].hidden), vis: !c.dinothunder.hidden, hp: c.dinothunder.stats.maxHealth, forms: c.dinothunder.duoForms,
        others: ['spd_red', 'ns_trio', 'windrangers', 'ben10'].every(k => !!c[k]) } })
    check('dinothunder: ONE visible Power Rangers / Dino Thunder character; the four forms are hidden', meta.uni === 'power_rangers' && meta.sub === 'Dino Thunder' && meta.vis && meta.hid.every(Boolean), meta)
    check('displayName / archetype / difficulty / tagline per the brief', meta.name === 'Dino Thunder Rangers' && meta.arch === 'Team / Form Swapper' && meta.diff === 5 && meta.tag === 'Dino Thunder, Power Up!', meta)
    check('forms Red → Blue → Yellow → White; ONE health pool 1248; S.P.D. Red / NS Trio / Wind Rangers / Ben untouched', JSON.stringify(meta.forms) === '["dt_red","dt_blue","dt_yellow","dt_white"]' && meta.hp === 1248 && meta.others, meta)
    const s0 = await S()
    check('starts as Conner (Red) on his own sheets, 1607 HP', s0.key === 'dt_red' && s0.duo?.form === 'dt_red' && s0.sheet?.includes('/dt_red/') && s0.maxHealth === 1607, { key: s0.key, sheet: s0.sheet, hp: s0.maxHealth })
    const sp = await page.evaluate(async () => { const c = (await import('./characters.js')).characters; return ['dt_red', 'dt_blue', 'dt_yellow', 'dt_white'].map(k => c[k].stats.speed) })
    const walk = v => 4.5 + (v - 78) / 20 * 5
    check('ground speed vs S.P.D. Red (7.0 px/f): Red ×1.10, Blue ×0.90, Yellow ×1.00, White ×1.05', [1.1, 0.9, 1.0, 1.05].every((m, i) => Math.abs(walk(sp[i]) - 7 * m) < 0.02), sp.map(walk))
  }
  if (want('swap')) {
    section('SWAP — hold P + J/K/L/O, double-tap P')
    for (const [btn, form] of [['k', 'dt_blue'], ['l', 'dt_yellow'], ['o', 'dt_white']]) {
      await fresh(600)
      const z0 = (await S('p2')).health
      await pick(btn); await untilSwap(); await settle()
      const s = await S(), L = s.duo.lastSwap || {}
      check(`hold P + ${btn.toUpperCase()} → ${form} (cost 15, 14 frames, ≥ 6 invulnerable, no attack thrown)`, s.key === form && s.duo.form === form && L.cost === 15 && L.frames === 14 && L.inv >= 6 && (await S('p2')).health === z0, { key: s.key, L })
      await step(100)
    }
    await toForm('o')
    await fresh(600); await pick('j'); await untilSwap(); await settle(); await step(100)
    check('hold P + J back to Conner', (await S()).key === 'dt_red')
    await fresh(600); await dblP(); await untilSwap(); await settle()
    check('double-tap P cycles Red → Blue', (await S()).key === 'dt_blue')
    await step(100); await fresh(600); await dblP(); await untilSwap(); await settle(); await step(100)
    await fresh(600); await dblP(); await untilSwap(); await settle(); await step(100)
    await fresh(600); await dblP(); await untilSwap(); await settle()
    check('… → Yellow → White → Red (wraps)', (await S()).key === 'dt_red')
    // cooldown: an immediate second swap is refused
    await fresh(600); await pick('k'); await untilSwap(); await settle(); await pick('l'); await step(10)
    const cd = await S()
    check('90-frame cooldown: an immediate second pick is refused', cd.key === 'dt_blue' && cd.duo.lastRefuse === 'cooldown', { key: cd.key, why: cd.duo.lastRefuse })
    // J under a held P never attacks
    await fresh(600); await page.keyboard.down('p'); await step(3); await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'); a._duo.cd = 999 })
    await tap(['j']); let atk = false; for (let i = 0; i < 12; i++) { if ((await S()).attacking) atk = true; await step(1) }
    await page.keyboard.up('p'); await step(2)
    check('while P is held J / K / L / O never attack (even when the swap is refused)', !atk)
    // gem gate
    const other = async () => { const k = (await S()).key; return k === 'dt_red' ? 'k' : 'j' }
    await step(100); await fresh(600, { np: 10 }); const k0 = (await S()).key; await pick(await other()); await step(20)
    check('needs 15 gem: refused with 10', (await S()).key === k0 && (await S()).duo.lastRefuse === 'gem', (await S()).duo.lastRefuse)
    // swap-in strike
    await fresh(70); const z0 = (await S('p2')).health; await pick(await other()); await untilSwap(); for (let i = 0; i < 20; i++) await step(1)
    const st = await S()
    check('swap-in strike 30 blunt lands up close; tag bonus armed (+10% next special within 3 s)', st.duo.strikes >= 1 && z0 - (await S('p2')).health > 0 && st.duo.tagAny > 0, { strikes: st.duo.strikes, dmg: z0 - (await S('p2')).health })
  }
  if (want('red')) {
    section('RED — Conner')
    await fresh(600)
    let r = await special(600, DD, 'l', 30)
    const sp = await S()
    check('SUPER SPEED ↓↓ + Special: 30 gem, 3 s, speed ×1.6', r.moves.includes('sSpeed') && r.np >= 29 && sp.duo.speed > 0, { r, speed: sp.duo.speed, walk: sp.speed })
    r = await special(160, QCF, 'k', 70)
    check('TYRANNO SLAM ↓↘→ + Heavy: 88 raw (× roster parity)', r.moves.includes('sSlam') && r.dmg >= 88 * 0.9, r)
    r = await special(300, ['d'], 'l', 60)
    check('PENALTY STRIKE → + Special: travels and hits (70 raw)', r.moves.includes('sPenalty') && r.dmg >= 70 * 0.9, r)
    r = await special(300, ['d'], 'l', 60, "f._duo.speed = 180")
    const pen = await S()
    check('… in Super Speed it crosses up (ends on the far side)', r.moves.includes('sPenalty') && Math.sign((await S('p2')).x - pen.x) < 0, { x: pen.x, z: (await S('p2')).x })
    r = await special(500, ['d', null, 'd'], null, 20)
    const da = await S()
    check('Dino Dash →→ travels ~45% of the screen', da.duo && Math.abs(da.x - 900) > 400, { moved: Math.round(da.x - 900) })
  }
  if (want('blue')) {
    section('BLUE — Ethan')
    await toForm('k')
    let r = await special(600, DD, 'l', 20)
    check('TRICERA SKIN ↓↓ + Special: 30 gem, 2 s', r.moves.includes('sSkin') && r.np >= 29 && (await S()).duo.skin > 0, r)
    // skin: 40% taken, no hitstun
    await fresh(80); await raw('p1', 'f._duo.skin = 120'); const h0 = (await S()).health
    await page.evaluate(() => __harness.ninjaTest.raw('p2').controls && 0); await raw('p2', "z.health=z.health")
    r = await special(110, QCF, 'k', 70)
    check('SHIELD QUAKE ↓↘→ + Heavy: 76 raw', r.moves.includes('sQuake') && r.dmg >= 76 * 0.9, r)
    r = await special(160, ['d'], 'k', 60)
    check('SHIELD RAM → + Heavy: 80 raw', r.moves.includes('sRam') && r.dmg >= 80 * 0.9, r)
    const dm = await page.evaluate(async () => { const m = await import('./dinoState.js'); const A = { _duo: { id: 'dinothunder', form: 'dt_blue', hs: 10 } }, T = { _duo: { id: 'dinothunder', skin: 60 } }, O = {}
      return { hs: m.dinoDamageMods(O, 100, { attacker: A }), hs3: m.dinoDamageMods(O, 100, { attacker: { _duo: { id: 'dinothunder', form: 'dt_blue', hs: 3 } } }), skin: m.dinoDamageMods(T, 100, { attacker: O }), none: m.dinoDamageMods(O, 100, { attacker: O }) } })
    check('HIGH SCORE +2%/hit capped +20%; TRICERA SKIN takes 40%; everyone else ×1', Math.abs(dm.hs - 120) < 1e-9 && Math.abs(dm.hs3 - 106) < 1e-9 && Math.abs(dm.skin - 40) < 1e-9 && dm.none === 100, dm)
  }
  if (want('yellow')) {
    section('YELLOW — Kira')
    await toForm('l')
    check('Kira double-jumps', (await S()).maxJumps === 2)
    let r = await special(220, QCF, 'l', 50)
    const z = await S('p2')
    check('PTERA SCREAM ↓↘→ + Special: 20 gem, 50 raw + stun', r.moves.includes('sScream') && r.np >= 19 && r.dmg >= 45, r)
    // projectile destruction
    await fresh(500)
    await page.evaluate(async () => { const z = __harness.ninjaTest.raw('p2'), a = __harness.ninjaTest.raw('p1'); const n = await import('./ninja.js')
      n.NINJA_API.world().projectileList().push({ owner: z, ownerId: z.side, name: 'dinoTestProj', x: a.x + 260, y: a.y + 40, vx: -3, vy: 0, w: 24, h: 24, width: 24, height: 24, radius: 12, damage: 40, hitstun: 12, knockbackX: 4, knockbackY: -2, lifetime: 120, color: '#f0f', isSpecial: true, age: 0 }) })
    await motion(QCF, 'l'); for (let i = 0; i < 40; i++) await step(1)
    check('… destroys a non-super projectile in the cone', ((await S()).duo.screamKills || 0) >= 1, (await S()).duo.screamKills)
    r = await special(200, QCF, 'l', 40, "f._duo.encore = { at: f._duo.t - 30, used: false, hits: 0 }")
    check('ENCORE: a second scream within 3 s stuns 50 frames', (await S()).duo.encore.hits === 1, (await S()).duo.encore)
  }
  if (want('white')) {
    section('WHITE — Trent')
    await toForm('o')
    let r = await special(600, DD, 'l', 30)
    const c = await S()
    check('CAMOUFLAGE ↓↓ + Special: 30 gem, 2.5 s, +20 Corruption', r.moves.includes('sCamo') && c.duo.camo > 0 && c.duo.corr >= 20, { r, camo: c.duo.camo, corr: c.duo.corr })
    await fresh(600, { np: 100 })
    await motion(DD, 'p'); for (let i = 0; i < 20; i++) await step(1)
    const m = await S()
    check('DRAGO CLONE ↓↓ + P: 50 gem, clone 30% away, Trent stays put, +20 Corruption', !!m.mirror && Math.abs(m.mirror.ix - 900) > 300 && Math.abs(m.x - 900) < 30 && m.duo.corr >= 20, { mirror: m.mirror, x: m.x, corr: m.duo.corr })
    await fresh(600, { corr: 95 }); await motion(DD, 'l'); for (let i = 0; i < 20; i++) await step(1)
    const ev = await S()
    check('CORRUPTION 100 → EVIL WHITE RANGER (6 s)', ev.duo.evil > 0, { corr: ev.duo.corr, evil: ev.duo.evil })
    await pick('j'); await step(10)
    check('… cannot swap out while evil', (await S()).key === 'dt_white' && (await S()).duo.lastRefuse === 'evil', (await S()).duo.lastRefuse)
  }
  if (want('modes')) {
    section('SUPER DINO MODE + Z-REX BLASTER')
    if ((await S()).key !== 'dt_red') { await step(100); await toForm('j') }
    await fresh(600, { energy: 100 })
    await page.keyboard.down('s'); await step(2); await page.keyboard.up('s'); await step(2); await page.keyboard.down('s'); await step(1); await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k'); await page.keyboard.up('s')
    for (let i = 0; i < 20; i++) await step(1)
    const sd = await S()
    check('↓↓ + Special + Heavy: SUPER DINO MODE 8 s for 1 bar', sd.duo.sdm > 400 && sd.energy <= 55, { sdm: sd.duo.sdm, energy: sd.energy })
    await pick('k'); await untilSwap(); await settle()
    check('… persists into Blue', (await S()).duo.sdm > 0)
    await step(100); await fresh(600); await raw('p1', 'f._duo.sdm = 300'); await pick('o'); await untilSwap(); await settle()
    check('… ends when Trent comes in', (await S()).duo.sdm === 0 && (await S()).duo.sdmEndedBy === 'trent')
    await step(100); await fresh(600, { energy: 100 })
    await page.keyboard.down('s'); await step(2); await page.keyboard.up('s'); await step(2); await page.keyboard.down('s'); await step(1); await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k'); await page.keyboard.up('s')
    for (let i = 0; i < 20; i++) await step(1)
    check('… Trent cannot enter Super Dino Mode', (await S()).duo.sdm === 0 && (await S()).energy >= 99)
    await step(100); await toForm('j')
    await step(100); await fresh(250, { energy: 100 }); const z0 = (await S('p2')).health
    const o0 = await page.evaluate(() => { const o = __harness.ninjaTest.raw('p2'); return { x: o.x, y: o.y } })
    await tap(['u']); await step(130)   // the cinematic: call → three arrivals → 3 · 2 · 1 (BOOM at 136)
    const mid = await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'), o = __harness.ninjaTest.raw('p2'), u = f._ninja?.sup; return { x: o.x, y: o.y, hp: o.health, phase: u?.phase, tx: u?.tx, cx: o.x + (o.w || 48) / 2 } })
    check('Z-Rex cinematic: the foe is frozen in place, untouched, through the build-up', mid.x === o0.x && mid.y === o0.y && mid.hp === z0 && mid.phase === 'count', mid)
    check('Z-Rex beam ends at the CENTRE of the foe', Math.abs(mid.tx - mid.cx) <= 1, mid)
    await step(150)   // BOOM → beam 6 × 40 → final blast 160 (move total 264)
    const zr = await S()
    check('Z-REX BLASTER (Ultimate, full meter): 400 raw', z0 - (await S('p2')).health >= 360 && zr.duo.ults === 1, { dmg: z0 - (await S('p2')).health })
  }
  if (want('cpu')) {
    section('CPU — swaps through the real input')
    await boot('spd_red', 'dinothunder', { mode: 'vs', difficulty: 'impossible', seed: 3 })
    const seen = new Set(); for (let i = 0; i < 40; i++) { await step(30); seen.add((await S('p2')).key) }
    const c = await S('p2')
    check('the CPU swaps Rangers through the real input (hold P + J/K/L/O or P P)', (c.duo.cpuSwaps || 0) >= 1 && seen.size >= 2, { swaps: c.duo.swaps, cpu: c.duo.cpuSwaps, forms: [...seen] })
    const run = async () => { await boot('spd_red', 'dinothunder', { mode: 'vs', difficulty: 'impossible', seed: 11 }); const out = []; for (let i = 0; i < 20; i++) { await step(30); const a = await S('p2'), z = await S(); out.push([a.key, a.x | 0, a.health | 0, z.health | 0].join(':')) } return out.join(' ') }
    const r1 = await run(), r2 = await run()
    check('same seed → identical 600-frame CPU match (forms, x, health)', r1 === r2, r1 === r2 ? '' : [r1.slice(0, 120), r2.slice(0, 120)])
  }
  if (want('win')) {
    section('WIN ART — MISSION ACCOMPLISHED (Blue / Yellow) + BOSS KILLED (result screen)')
    await boot('dinothunder', 'spd_red', { p1Skin: 'start_blue' })
    await fresh(120); await raw('p1', 'z.health = 1')
    await motion(QCF, 'k'); for (let i = 0; i < 90; i++) { await step(1); if (i % 10 === 0) await new Promise(r => setTimeout(r, 30)) }
    const w = await page.evaluate(() => ({ won: !!__harness.ninjaTest.raw('p1')._ninja?.wonSaid, t: __harness.ninjaTest.raw('p1')._dtWinT || 0, form: __harness.ninjaTest.raw('p1')._duo.form }))
    await shot('06_win_mission')
    check('Ethan KOs the foe → MISSION ACCOMPLISHED drawn over him', w.won && w.t > 30 && w.form === 'dt_blue', w)
    await page.evaluate(() => __harness.showVictory('p1')); for (let i = 0; i < 6; i++) { await step(1); await new Promise(r => setTimeout(r, 60)) }
    await shot('07_result_boss_killed')
    check('result screen reached (BOSS KILLED provider registered)', await page.evaluate(async () => (await import('./matchflow.js')).VICTORY_ART.length >= 1))
  }
  if (want('combos')) {
    section('COMBOS (measured vs S.P.D. Red; roster parity ×1.6 + combo scaling + his defense included)')
    await boot('dinothunder', 'spd_red')   // its own match (the win section above ends one)
    // press each step when the previous move connected (or after its active frames), like a player confirming
    const FK = { dt_red: 'j', dt_blue: 'k', dt_yellow: 'l', dt_white: 'o' }
    async function chain(form, steps, dx = 90, pre = null) {
      if ((await S()).key !== form) { await step(100); await toForm(FK[form]) }
      await fresh(dx, { energy: 100 }); if (pre) await raw('p1', pre)
      const z0 = (await S('p2')).health; let hits = 0
      for (const st of steps) {
        if (st === 'swapK' || st === 'swapL' || st === 'swapJ' || st === 'swapO') { await page.keyboard.down('p'); await step(1); await tap([st.slice(4).toLowerCase()]); await page.keyboard.up('p'); for (let i = 0; i < 16; i++) await step(1); continue }
        if (Array.isArray(st)) await motion(st[0], st[1]); else await tap([].concat(st))
        for (let i = 0; i < 40; i++) { await step(1); const a = await S(); if (a.attacking && a.atk && await page.evaluate(() => !!__harness.ninjaTest.raw('p1').currentAttack?.hasHit || !!__harness.ninjaTest.raw('p1').currentAttack?._contact)) { hits++; for (let k = 0; k < 3; k++) await step(1); break } if (!a.attacking && i > 6) break }
      }
      await step(steps.includes('u') ? 300 : 120)   // the Z-Rex cinematic runs 264 frames
      return { dmg: z0 - (await S('p2')).health, hits, combo: (await S()).duo.hs }
    }
    const out = {}
    out.red = await chain('dt_red', ['j', 'j', 'k', [['d'], 'l']])
    out.redSlam = await chain('dt_red', ['j', 'j', [QCF, 'k']])
    out.redSpeed = await chain('dt_red', ['j', 'j', 'k', [['d'], 'l']], 90, 'f._duo.speed = 180')
    out.blue = await chain('dt_blue', ['j', 'j', 'j', 'j', [['d'], 'k']])
    out.yellow = await chain('dt_yellow', ['j', 'j', 'j', 'j', [QCF, 'l']])
    out.white = await chain('dt_white', ['j', 'j', 'j', 'j'])
    out.whiteCamo = await chain('dt_white', ['j', 'j', 'j', 'j'], 90, 'f._duo.camo = 100')
    out.tag = await chain('dt_red', ['j', 'k', 'swapK', [['d'], 'k']])
    out.sdmBlue = await chain('dt_blue', ['j', 'j', 'j', 'j', [['d'], 'k']], 90, 'f._duo.sdm = 400')
    out.zrex = await chain('dt_red', ['j', 'k', 'u'])
    console.log('  COMBO-DATA ' + JSON.stringify(out))
    check('every form has a confirmed 3+ hit string', ['red', 'blue', 'yellow', 'white'].every(k => out[k].hits >= 3), out)
    check('Super Dino Mode / Camouflage buff the same string', out.sdmBlue.dmg > out.blue.dmg && out.whiteCamo.dmg > out.white.dmg, [out.sdmBlue.dmg, out.blue.dmg, out.whiteCamo.dmg, out.white.dmg])
    check('combos stay below 45% of S.P.D. Red\'s 1200 (no touch-of-death), Z-Rex string included', Object.values(out).every(r => r.dmg < 540), Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.dmg])))
  }
  if (ONLY.split(',').includes('skinleak') || ONLY.split(',').includes('skins')) {
    // SKIN LEAK TEST: a skinned team plays EVERY input of EVERY Ranger (normals, specials, supers, swaps, Super Dino Mode,
    // Drago Clone, Z-Rex) and every image the canvas draws is recorded; any Dino art drawn from the BASE folders is a leak
    section('TEAM SKINS — nothing drawn from the base art while a team skin is on')
    const FK = { dt_red: 'j', dt_blue: 'k', dt_yellow: 'l', dt_white: 'o' }
    const DDP = async b => { await motion(DD, null); await page.keyboard.down('p'); await step(1); await tap([b]); await page.keyboard.up('p') }
    const playAll = async form => {
      const seqs = [['j'], ['k'], ['l'], ['i'], [['d'], 'l'], [['d'], 'k'], [QCF, 'k'], [QCF, 'l'], [DD, 'l'], [DD, ['l', 'k']], [[...QCF, ...QCF], 'l'], ['u'],
        ['jumpL'], ['jumpK'], ['airDive'], ['dash'], ['clone'], ['swap']]
      for (const sq of seqs) {
        await fresh(110, { energy: 100 }); await raw('p1', 'f._duo.np = 100; f.ultimateMeter = 100; if (f.meter != null) f.meter = 100')
        const [a, b] = sq
        if (a === 'jumpL' || a === 'jumpK') { await tap(['w']); await step(6); await tap([a === 'jumpL' ? 'j' : 'k']) }
        else if (a === 'airDive') { await tap(['w']); await step(8); await motion([['s']], 'l') }
        else if (a === 'dash') { await tap(['d']); await step(2); await tap(['d']) }
        else if (a === 'clone') { await motion(DD, 'p') }
        else if (a === 'swap') { await pick(Object.values(FK).find(k => k !== FK[form])) }
        else if (b === undefined) await tap([a]); else await motion(a, b)
        await step(150)
        if ((await S()).key !== form) { await step(60); await toForm(FK[form]) }
      }
    }
    for (const tag of (process.env.DINO_LEAK_TAGS || 'valkyrie,sketch').split(',')) {
      await boot('dinothunder', 'spd_red', { p1Skin: 'dtk_' + tag })
      await page.evaluate(() => { window.__drawn = new Set(); const d = CanvasRenderingContext2D.prototype.drawImage
        window.__where = {}
        CanvasRenderingContext2D.prototype.drawImage = function (im, ...r) { if (im && im.src) { const u = decodeURIComponent(new URL(im.src).pathname); window.__drawn.add(u); if (/\/assets\/(dt_|dinothunder\/)/.test(u) && !u.includes('/skins/') && !window.__where[u]) window.__where[u] = (new Error().stack || '').split('\n').slice(2, 5).map(l => l.trim().replace(/\(?https?:\/\/[^/]+\//, '').replace(/\?v=[^:]*/, '')).join(' < ') } return d.call(this, im, ...r) } })
      for (const form of ['dt_red', 'dt_blue', 'dt_yellow', 'dt_white']) { if ((await S()).key !== form) await toForm(FK[form]); await playAll(form) }
      const drawn = await page.evaluate(() => [...window.__drawn]), where = await page.evaluate(() => window.__where)
      const dino = drawn.filter(u => /\/assets\/(dt_(red|blue|yellow|white)|dinothunder)\//.test(u))
      // allowed base art: the art with no Ranger in it (zord heads, GO!, gems, rings, emblems), the swap smoke (gem-colour FX,
      // byte-identical in every skin) and Trent's Drago Clone (the evil copy keeps its own charcoal / blood-red strips)
      const leaks = dino.filter(u => !u.includes(`/skins/${tag}/`) && !/\/assets\/dinothunder\/(emblem|yellow_emblem|blue_emblem|go\d|gem\d|ring\d|sparkle|[a-z]+Head)[_a-z]*\.png$/.test(u) && !/\/(smoke|smokeFade)\.png$/.test(u) && !u.includes('/dt_white/clone/'))
      const skinned = dino.filter(u => u.includes(`/skins/${tag}/`))
      console.log('  SKIN-DRAWN ' + tag + ' ' + JSON.stringify({ skinned: skinned.length, leaks }))
      check(`${tag}: every Ranger's moves, supers, swaps and Z-Rex draw from the skin (no base art)`, leaks.length === 0 && skinned.length > 20, { skinned: skinned.length, leaks: leaks.map(u => u + ' @ ' + (where[u] || '?')) })
    }
  }
  for (const grp of ['skins1', 'skins2', 'skins3', 'skins4']) if (ONLY.split(',').includes(grp) || ONLY.split(',').includes('skins')) {   // opt-in (needs the skin pack)
    // LINE-UP TEST: every team skin in the real engine — start as Conner, swap through all four with the real input; every form
    // draws from the skin's own premade folder; a line-up image (the four Rangers side by side) per skin
    const rows = (await (async () => { await boot('dinothunder', 'spd_red'); return page.evaluate(async () => (await import('./dinoSkinRows.js')).DINO_SKIN_ROWS.map(r => r.tag)) })())
    const g = Number(grp.slice(5)) - 1, tags = rows.slice(g * 4, g * 4 + 4)
    section(`TEAM SKINS ${g * 4 + 1}–${g * 4 + 4} (${tags.join(', ')})`)
    for (const tag of tags) {
      await boot('dinothunder', 'spd_red', { p1Skin: 'dtk_' + tag })
      const seen = {}
      for (const [btn, form] of [[null, 'dt_red'], ['k', 'dt_blue'], ['l', 'dt_yellow'], ['o', 'dt_white']]) {
        if (btn) { await fresh(600); await pick(btn); await untilSwap(); await settle(); await step(100) }
        await fresh(600); for (let i = 0; i < 3; i++) { await step(1); await new Promise(r => setTimeout(r, 20)) }
        const st = await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); return { key: f.rosterKey, sheet: (f._skinAnim || f.animationData)?.idle?.sheet, x: f.x, y: f.y, skin: f._dtSkin } })
        seen[form] = st
        if (form === 'dt_white') await shot(`skin_${tag}`)
      }
      const ok = Object.entries(seen).every(([form, st]) => st.key === form && st.skin === tag && st.sheet?.includes(`/skins/${tag}/${form}/`))
      check(`${tag}: all four Rangers wear it through real swaps (premade strips)`, ok, Object.fromEntries(Object.entries(seen).map(([k, v]) => [k, v.sheet])))
    }
  }
  if (want('shots')) {
    section('SCREENSHOTS (render check)')
    const real = async n => { for (let i = 0; i < n; i++) { await step(1); await new Promise(r => setTimeout(r, 16)) } }
    await boot('dinothunder', 'spd_red')
    await fresh(300); await real(3); await shot('01_red'); await page.keyboard.down('p'); await real(3); await shot('02_swap_strip'); await page.keyboard.up('p')
    for (const [b, n] of [['k', '03_blue'], ['l', '04_yellow'], ['o', '05_white']]) { await toForm(b); await fresh(300); await real(3); await shot(n) }
    await fresh(400, { np: 100 }); await motion(DD, 'p'); await real(24); await shot('08_drago_clone')
    await fresh(400); await motion(DD, 'l'); await real(14); await shot('09_camouflage')
    await toForm('l'); await fresh(260); await motion(QCF, 'l'); await real(20); await shot('10_ptera_scream')
    await toForm('j'); await fresh(600, { energy: 100 }); await raw('p1', 'f._duo.sdm = 300'); await real(6); await shot('11_super_dino_mode')
    await fresh(300, { energy: 100 }); await tap(['u']); await real(10); await shot('12_zrex_call'); await real(30); await shot('13_zrex_arrive'); await real(46); await shot('14_zrex_count'); await real(52); await shot('14b_zrex_whip'); await real(20); await shot('14c_zrex_slowmo_colours'); await real(16); await shot('14d_zrex_accelerate'); await real(10); await shot('15_zrex_impact'); await real(56); await shot('15b_zrex_blast_pullback')
    await fresh(300, { energy: 60 }); await motion([...QCF, ...QCF], 'l'); await real(30); await shot('16_raptor_rider')
    await boot('dinothunder', 'spd_red', { p1Skin: 'start_blue' }); await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'); a._introPlaying = true; a._dtIntroFx = 18 }); await real(1); await shot('17_intro_ride_in')
    check('screenshots written', fs.readdirSync(SHOTS).length >= 14)
  }
} catch (e) { console.error(e); FAIL++ }
check('no page errors', errors.length === 0, errors.slice(0, 5))
console.log(`\nMSV1-DINO: ${PASS} passed, ${FAIL} failed`)
await browser.close(); server.close?.()
process.exit(FAIL ? 1 : 0)
