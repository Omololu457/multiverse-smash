// harness/zoro_moveset.test.mjs — Roronoa Zoro moveset (phase 4): real keyboard input → real game.
// Measures startup (first active frame), block advantage (frames the attacker is free before the blocker),
// projectiles (Taka Nami one-at-a-time, Tatsu Maki multi-hit + drag + pool of 2), Oni Giri dash-through,
// Shishi Sonson counter, NAP regen, Santoryu twin tornado, Ashura (connect / whiff), Conqueror's Haki.
//   node harness/zoro_moveset.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
page.on('pageerror', e => errors.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const zs = (w = 'p1') => page.evaluate(w => __harness.zoroTest.state(w), w)
const ls = (w = 'p1') => page.evaluate(w => __harness.luffyTest.state(w), w)
const ev = (fn, arg) => page.evaluate(fn, arg)
async function tap(k, dir = null) { if (dir) await page.keyboard.down(dir); await page.keyboard.down(k); await step(1); await page.keyboard.up(k); if (dir) await page.keyboard.up(dir) }
// Rolling motion input: each entry is the set of direction keys HELD for `gap` frames (a string of keys,
// '' = neutral). The button is pressed while the LAST set is still held (like a real stick). P1 faces right.
async function motion(seq, button, gap = 2) {
  const held = new Set()
  for (const set of seq) {
    const want = new Set(set.split(''))
    for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k) }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k) }
    await step(gap)
  }
  await page.keyboard.down(button); await step(1); await page.keyboard.up(button)
  for (const k of held) await page.keyboard.up(k)
}
const QCF = ['s', 'sd', 'd'], QCB = ['s', 'sa', 'a'], DD = ['s', '', 's'], FF = ['d', '', 'd'], DP_UP = ['s', 'sd', 'd', 'dw'], QCF2 = ['s', 'sd', 'd', 's', 'sd', 'd']
// Fresh neutral: training reset, dummy behaviour, gap between bodies, full Spirit, facing each other.
async function reset({ gap = 70, dummy = 'stand', spirit = 100 } = {}) {
  await ev(([gap, dummy, spirit]) => {
    __harness.zoroTest.reset(); __harness.setDummyBehavior(dummy)
    const f = __harness.zoroTest.raw('p1'), o = __harness.zoroTest.raw('p2')
    o.x = f.x + f.w + gap; o.vx = 0; f.vx = 0; f.facing = 1; o.facing = -1
    __harness.zoroTest.spirit('p1', spirit)
  }, [gap, dummy, spirit])
  await step(4)
}
async function until(pred, max = 200) { for (let i = 0; i < max; i++) { if (await pred()) return i; await step(1) } return -1 }

try {
  await page.goto(server.base + '/index.html?harness=1&p1=zoro&p2=luffy', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.zoroTest)
  await ev(() => { __harness.start(); __harness.skipToBattle() })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 200)) }
  const moves = await ev(async () => (await import('./zoroData.js')).ZORO_MOVES)

  console.log('\n── normals: dispatch + startup ──')
  const normals = [['Jab', 'j', null, 'light'], ['Slash (→+L)', 'j', 'd', 'zSlash'], ['Heavy slash', 'k', null, 'heavy'],
    ['Low thrust (↓+L)', 'j', 's', 'zLow'], ['Rising slash (Up-Attack)', 'i', null, 'up'], ['Wake-up reversal (→+H)', 'k', 'd', 'zWake']]
  for (const [name, k, dir, mv] of normals) {
    await reset({ gap: 40 })
    const hp0 = (await ls('p2')).health
    await tap(k, dir)
    const s = await ls()
    check(`${name} → ${mv}`, s.attack?.name === mv, s.attack?.name)
    const startup = await until(async () => (await ls()).phase === 'active', 60)
    check(`${name} startup ${moves[mv].startup}f`, startup + 1 === moves[mv].startup, `measured ${startup + 1}`)
    await until(async () => !(await ls()).attack, 120)
    const hp1 = (await ls('p2')).health
    check(`${name} connects (${moves[mv].damage} raw)`, hp1 < hp0, `${hp0}→${hp1}`)
  }
  await reset({ gap: 40 })
  await tap('k', 'd'); const inv = (await zs()).invuln
  check('Wake-up reversal grants 6 invulnerable frames', inv >= 5 && inv <= 6, inv)

  console.log('\n── block advantage (attacker free − blocker free, measured) ──')
  for (const [name, k, dir, mv, want] of [['Jab', 'j', null, 'light', 1], ['Slash', 'j', 'd', 'zSlash', -3], ['Heavy slash', 'k', null, 'heavy', -6], ['Wake-up reversal', 'k', 'd', 'zWake', -12]]) {
    await reset({ gap: 40, dummy: 'block' })
    await tap(k, dir)
    const blocked = await until(async () => (await ls('p2')).blockstun > 0, 60)
    let att = -1, def = -1
    for (let i = 0; i < 80 && (att < 0 || def < 0); i++) {
      const a = await ls(), d = await ls('p2')
      if (att < 0 && !a.attack) att = i
      if (def < 0 && !(d.blockstun > 0)) def = i
      await step(1)
    }
    check(`${name} blocked, advantage ${want > 0 ? '+' : ''}${want}`, blocked >= 0 && def - att === want, `measured ${def - att} (att free @${att}, blocker free @${def})`)
  }

  console.log('\n── chains (contact) ──')
  await reset({ gap: 30 })
  await tap('j'); await until(async () => (await ls()).attack?.hasHit, 30); await tap('j')
  check('Jab → Light = Slash on contact (press buffered through hitstop)', await until(async () => (await ls()).attack?.name === 'zSlash', 20) >= 0, (await ls()).attack?.name)
  await until(async () => (await ls()).attack?.hasHit, 30); await tap('k')
  check('Slash → Heavy slash on contact', await until(async () => (await ls()).attack?.name === 'heavy', 20) >= 0, (await ls()).attack?.name)

  console.log('\n── specials ──')
  await reset({ gap: 400 })   // 400 (was 300): at Toji speed he walks further during ↓↘→, keep the slash in flight for the checks below
  let e0 = (await zs()).energy
  await motion(QCF, 'l')
  let z = await zs()
  check('Taka Nami (↓↘→+A) starts, costs 10', z.move === 'zTaka' && e0 - z.energy === 10, `${z.move} ${e0}→${z.energy}`)
  await step(16); z = await zs()
  check('Taka Nami flying slash spawned', z.projectiles.filter(p => p.kind === 'taka').length === 1, JSON.stringify(z.projectiles))
  await until(async () => !(await ls()).attack, 60); await tap('l')
  check('only one Taka Nami at a time (re-cast refused, no cost)', (await zs()).projectiles.filter(p => p.kind === 'taka').length === 1)
  const hpT = (await ls('p2')).health; await until(async () => (await zs()).projectiles.length === 0, 120)
  check('Taka Nami hits at range', (await ls('p2')).health < hpT, `${hpT}→${(await ls('p2')).health}`)

  await reset({ gap: 60 })
  const x0 = (await ls()).x, ox = (await ls('p2')).x
  await motion(FF, 'l')
  check('Oni Giri (→→+A)', (await zs()).move === 'zOni', (await zs()).move)
  let passed = false
  for (let i = 0; i < 60; i++) { await step(1); const a = await ls(), b = await ls('p2'); if (a.x > b.x) { passed = true } }
  const hpO = (await ls('p2'))
  check('Oni Giri passes THROUGH and ends behind', passed && (await ls()).x > (await ls('p2')).x, `zoro ${x0}→${Math.round((await ls()).x)}, opp ${ox}→${Math.round((await ls('p2')).x)}`)
  check('Oni Giri connected', hpO.health < (await zs('p2')).maxHealth, hpO.health)

  await reset({ gap: 260 })
  e0 = (await zs()).energy
  await motion(DD, 'l')
  check('Tatsu Maki (↓↓+A) starts, costs 20', (await zs()).move === 'zTatsu' && e0 - (await zs()).energy === 20)
  await step(14); z = await zs()
  check('Tatsu Maki tornado spawned (1 in base stance)', z.projectiles.filter(p => p.kind === 'tatsu').length === 1, JSON.stringify(z.projectiles))
  const hpA = (await ls('p2')).health, oxA = (await ls('p2')).x
  let ticks = 0, lastHp = hpA
  for (let i = 0; i < 70; i++) { await step(1); const h = (await ls('p2')).health; if (h < lastHp) ticks++; lastHp = h }
  check('Tatsu Maki is multi-hit', ticks >= 3, `${ticks} ticks, ${hpA}→${lastHp}`)
  await reset({ gap: 260 })
  await motion(DD, 'l'); await until(async () => !(await ls()).attack, 60)
  await motion(DD, 'l'); await until(async () => !(await ls()).attack, 60)
  await motion(DD, 'l')
  z = await zs()
  check('Tatsu Maki pool max 2', z.projectiles.filter(p => p.kind === 'tatsu').length <= 2 && z.move !== 'zTatsu', `${z.projectiles.length} out, move ${z.move}`)

  await reset({ gap: 70 })
  await motion(QCB, 'l')
  check('Tora Gari (↓↙←+A)', (await zs()).move === 'zTora', (await zs()).move)
  await until(async () => !(await ls()).attack, 80)
  check('Tora Gari connects (lunge)', (await ls('p2')).health < (await zs('p2')).maxHealth, (await ls('p2')).health)

  // Shishi Sonson: stance, then the dummy's jab lands in the window → Zoro draws through.
  await reset({ gap: 50 })
  await motion(DP_UP, 'l')
  z = await zs(); const jumped = !(await ls()).onGround
  check('Shishi Sonson (↓↘→↗+A) stance, no jump', z.move === 'zShishi' && !jumped, `${z.move} airborne=${jumped}`)
  const y0 = (await ls()).y; await step(3)
  check('…and the held ↗ never becomes a jump during the stance', (await ls()).y === y0 && (await ls()).onGround, `y ${y0}→${(await ls()).y}`)
  await step(4)
  // P2's Jab is driven through the SHARED melee resolver (the training dummy's own swings aren't resolved
  // against P1): a real active strike overlapping Zoro inside the iai window → combat.resolveAttackHit.
  await ev(async () => {
    const c = await import('./combat.js'), d = await import('./luffyData.js'), o = __harness.zoroTest.raw('p2'), f = __harness.zoroTest.raw('p1')
    o.facing = -1; o.x = f.x + f.w + 6; c.startMove(o, 'light', d.LUFFY_MOVES.light); o.currentMove = 'light'
    const a = o.currentAttack; a.timer = a.total - a.activeStart   // first active frame
    c.resolveAttackHit(o, f, null, { stageWidth: 3200 })
  })
  const hit = await until(async () => (await zs()).move === 'zShishiStrike', 34)
  check('Shishi Sonson: a strike in the window → counter draw-through', hit >= 0, (await zs()).move)
  await until(async () => !(await ls()).attack, 60)
  check('Shishi Sonson counter connects (110 raw), Zoro untouched', (await ls('p2')).health < (await zs('p2')).maxHealth && (await zs()).health === (await zs()).maxHealth, `opp ${(await ls('p2')).health}, zoro ${(await zs()).health}`)
  await reset({ gap: 300 })
  await motion(DP_UP, 'l')
  const whiffLen = await until(async () => !(await ls()).attack, 120)
  check('Shishi Sonson whiff = long recovery', whiffLen >= 60, `${whiffLen}f`)

  // NAP: hold ↓+B 40 frames → sleeps, +15 Spirit; a hit wakes him.
  await reset({ gap: 300, spirit: 20 })
  await page.keyboard.down('s'); await page.keyboard.down('k'); await step(42); await page.keyboard.up('k'); await page.keyboard.up('s')
  z = await zs(); check('NAP after holding ↓+B 40 frames', z.move === 'zNap', z.move)
  const eN = z.energy, pass0 = z.z.passive
  const napLen = await until(async () => !(await ls()).attack, 120)
  const e1 = (await zs()).energy, passive = Math.floor((pass0 + napLen + 1) / 60)
  check('NAP regenerates 15 Spirit (+ the 1/s passive)', e1 - eN - passive === 15, `${eN}→${e1} over ${napLen}f (passive ${passive})`)

  console.log('\n── Santoryu ──')
  await reset({ gap: 260 })
  await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k')
  await until(async () => !(await ls()).attack, 40)
  z = await zs(); check('Santoryu on', z.santoryu)
  await ev(() => __harness.zoroTest.spirit('p1', 100))
  await motion(DD, 'l'); await step(14)
  z = await zs(); check('Santoryu: Tatsu Maki becomes a twin tornado (2-hit)', z.projectiles.filter(p => p.kind === 'tatsu').length === 2, JSON.stringify(z.projectiles.map(p => p.kind)))

  console.log('\n── Ashura ──')
  await reset({ gap: 300 })
  await motion(QCF2, 'l')
  check('Ashura locked outside Santoryu (falls back to Taka Nami)', (await zs()).move === 'zTaka', (await zs()).move)
  await reset({ gap: 300 })
  await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k')
  await until(async () => !(await ls()).attack, 40); await ev(() => __harness.zoroTest.spirit('p1', 100))
  await tap('u')
  check('Ashura (Ultimate button) starts in Santoryu', (await zs()).move === 'zAshura', (await zs()).move)
  await until(async () => (await zs()).move !== 'zAshura', 60)
  z = await zs(); check('Ashura whiff (first cut missed) → whiff recovery, Spirit spent', z.move === 'zAshuraMiss' && z.energy === 0, `${z.move} ${z.energy}`)
  await until(async () => !(await ls()).attack, 80); await step(2)
  const lock = await zs(); check('4s Spirit lockout after the super', lock.z.lockout > 200, lock.z.lockout)
  await step(70); check('no Spirit gain during the lockout', (await zs()).energy === 0, (await zs()).energy)

  await reset({ gap: 60 })
  await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k')
  await until(async () => !(await ls()).attack, 40); await ev(() => __harness.zoroTest.spirit('p1', 100))
  const hpS = (await ls('p2')).health
  await motion(QCF2, 'l')
  check('Ashura (↓↘→↓↘→+A) starts', (await zs()).move === 'zAshura', (await zs()).move)
  await until(async () => !(await ls()).attack, 160)
  const hpE = (await ls('p2')).health
  check('Ashura connected all cuts (big damage)', hpS - hpE > 120, `${hpS}→${hpE} (−${hpS - hpE})`)

  console.log("\n── Conqueror's Haki ──")
  await reset({ gap: 80 })
  await ev(() => { const f = __harness.zoroTest.raw('p1'); f.health = 240 }); await step(2)
  z = await zs(); const o = await ls('p2')
  check("Haki fires once under 25% HP", z.z.hakiUsed && z.z.haki > 0, JSON.stringify({ used: z.z.hakiUsed, haki: z.z.haki }))
  check('Haki stuns + pushes the opponent', o.hitstun > 30, `hitstun ${o.hitstun}`)
  await ev(() => { const f = __harness.zoroTest.raw('p1'); f.health = 200 }); await step(2)
  check('Haki is once per match', (await zs()).z.haki < 40)
} catch (e) {
  check('moveset test ran to completion', false, e.message.split('\n')[0])
} finally {
  if (errors.length) console.log('  page errors:', errors.slice(0, 3).join(' | '))
  check('no page errors', errors.length === 0)
  await browser.close(); server.close()
}
console.log(`\nZORO MOVESET: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
