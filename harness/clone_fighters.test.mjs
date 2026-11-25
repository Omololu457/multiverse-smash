// harness/clone_fighters.test.mjs — CLONE FIGHTERS (cloneFighter.js): clones that fight as their own fighters, for Tobirama
// (water), Hashirama (wood), Naruto / Naruto Seventh / Sasuke / Sasuke Adult / Sasuke Sensei / Madara (shadow), in a real match.
//   node harness/clone_fighters.test.mjs [key]   → checks + screenshots in docs/clone_fighters/
// Per character, every pick through the REAL dispatch (↓↓↑ + Special stages the clones, the follow-up direction / Ultimate
// picks): the clone arrives → runs in (or stays for ranged / guard) → lands its hits → leaves; the caster stays free.
// Box sizes: a clone's hurtbox is the character's DRAWN size (not the shared 48×94). Susanoo: the summon works in Susanoo.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const OUT = 'docs/clone_fighters'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
const ONLY = process.argv[2] || null
const CHARS = [
  { key: 'tobirama', kind: 'water' }, { key: 'hashirama', kind: 'wood' }, { key: 'naruto', kind: 'smoke' }, { key: 'naruto_seventh', kind: 'smoke' },
  { key: 'sasuke', kind: 'smoke', authoredD: true }, { key: 'sasuke_adult', kind: 'smoke' }, { key: 'sasuke_sensei', kind: 'smoke' }, { key: 'madara', kind: 'smoke' },
].filter(c => !ONLY || c.key === ONLY)
const server = await serve()
const browser = await chromium.launch({ headless: true })
const errors = [], summary = []
let page
async function boot(p1) {
  if (page) await page.close()
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(p1 + ': ' + e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=kakashi`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.cloneChoreo, null, { timeout: 60000 })
  await page.evaluate(() => { __harness.rng.forceSeed(9); __harness.start({ mode: 'training' }); __harness.skipToBattle(); __harness.luffyTest.step(2) })
  for (let i = 0; i < 4; i++) { await page.evaluate(() => __harness.luffyTest.step(5)); await new Promise(r => setTimeout(r, 200)) }
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 60000 })
}
// one pick via the REAL dispatch: summon (motion + Special) → frames → pick (dir + Special / Ultimate); then run it out
async function run(dir, { gap = 260, frames = 280, setup = null } = {}) {
  return page.evaluate(async ([dir, gap, frames, setup]) => {
    const cf = await import('./cloneFighter.js'); cf.CF_TEST.log = []
    const T = __harness.luffyTest, raw = w => __harness.ninjaTest?.raw?.(w), C = __harness.cloneChoreo
    C.clear('p1'); C.clear('p2'); __harness.narutoChoreoClear?.()
    const p1 = raw('p1'), p2 = raw('p2')
    p1.x = 700; p2.x = 700 + gap; p1.facing = 1; p2.facing = -1; p2.health = p2.maxHealth; p1.energy = p1.maxEnergy || 200
    for (const f of [p1, p2]) { f.vx = 0; f.hitstun = 0; f.attacking = false; f.invulnTimer = 0; f.blocking = false; f.ultimateCooldown = 0 }
    T.step(6)
    let setupOk = null
    if (setup) setupOk = await (new Function('p1', 'T', 'H', `return (async () => { ${setup} })()`))(p1, T, __harness)
    p1.energy = p1.maxEnergy || 200
    const summoned = C.summon('p1'); T.step(10)
    const staged = !!p1._inChoreoFormation
    const picked = dir === 'SWARM' ? C.swarm('p1') : C.select(dir, 'p1')
    const hp0 = p2.health, rows = []
    let gone = 0, free = 0, maxHurtH = 0, maxHurtW = 0, authored = false
    for (let i = 0; i < frames; i++) {
      T.step(1)
      const st = C.fighters('p1')
      if (C.state('p1').active) authored = true
      if (!p1._choreoLock && !p1._inChoreoFormation) free++
      for (const s of st) if (s.hurt) { maxHurtH = Math.max(maxHurtH, s.hurt.h); maxHurtW = Math.max(maxHurtW, s.hurt.w) }
      rows.push(st.length)
      if (!st.length && !C.state('p1').active) { if ((gone = (gone || 0) + 1) > 45) break } else gone = 0   // let shots in flight land
    }
    return { setupOk, summoned, staged, picked, hp0, hpEnd: p2.health, log: cf.CF_TEST.log, free, n: rows.length, maxHurtH, maxHurtW, authored,
             drawH: Math.round(__harness.luffyTest.state('p1').draw.h || 0) }
  }, [dir, gap, frames, setup])
}
const DIRS = ['N', 'F', 'U', 'B', 'D', 'SWARM']
try {
  for (const C of CHARS) {
    console.log(`\n══ ${C.key} (${C.kind})`)
    await boot(C.key)
    const kit = await page.evaluate(async (k) => { const m = await import('./cloneFighter.js'); const P = m.cloneFighterProfile(k); return { kind: P.kind, sets: Object.fromEntries(Object.values(P.sets).map(s => [s.dir, { name: s.name, n: (s.clones || []).length, authored: s.authored || null, ranged: (s.clones || []).some(c => c.steps.every(st => (st.hits || []).every(h => h.projectile))) }])) } }, C.key)
    check(`profile element = ${C.kind}`, kit.kind === C.kind, kit.kind)
    for (const dir of DIRS) {
      const S = kit.sets[dir], r = await run(dir)
      const k = r.log.map(e => e.k), dmg = r.hp0 - r.hpEnd
      const hits = r.log.filter(e => e.k === 'hit').length, shots = r.log.filter(e => e.k === 'shot').length
      const label = `${dir.padEnd(5)} ${S.name}`
      if (S.authored) {
        check(`${label}: keeps the old authored move`, r.staged && r.authored && !k.includes('spawn'), { staged: r.staged, authored: r.authored })
        summary.push({ char: C.key, dir, set: S.name, authored: true, dmg }); continue
      }
      const ok = r.summoned && r.staged && k.filter(x => x === 'spawn').length === S.n && (hits + shots) >= 1 && dmg > 0 && k.includes('exit') && r.free > r.n * 0.75
      check(`${label}: ${S.n} clone(s) → ${hits} hits / ${shots} shots, dmg ${dmg}, left, caster free`, ok,
        ok ? '' : { staged: r.staged, events: k.join(','), dmg, free: r.free, n: r.n })
      if (dir === 'N') {
        // hurtbox from the DRAWN body (the real fighter's is 48×94), close to the caster's on-screen height
        check(`clone hurtbox = drawn size (${Math.round(r.maxHurtW)}×${Math.round(r.maxHurtH)}, caster drawn h ${r.drawH})`, r.maxHurtH > 110 && Math.abs(r.maxHurtH - r.drawH) <= r.drawH * 0.12)
      }
      summary.push({ char: C.key, dir, set: S.name, clones: S.n, hits, shots, dmg, frames: r.n })
    }
    // Susanoo: the summon + a pick still work in the character's Susanoo
    const SUS = {
      madara: `const a = await import('./abilities.js'); return a.enterMadaraSusanoo(p1) && (p1._madaraSusanoo > 0)`,
      sasuke: `H.setSusanoo(1, 'p1'); return p1._susanooStage > 0`,
      sasuke_sensei: `H.setEyeSet('susanoo', 'p1'); return p1._eyeSet === 'susanoo'`,
      sasuke_adult: `p1._adultSusanoStance = 1; return true`,
    }[C.key]
    if (SUS) {
      const r = await run('N', { setup: SUS })
      const hits = r.log.filter(e => e.k === 'hit').length
      check(`in Susanoo: summon + Assault still work`, r.setupOk && r.staged && r.log.some(e => e.k === 'spawn') && hits >= 1 && r.hp0 - r.hpEnd > 0, { setup: r.setupOk, staged: r.staged, hits, events: r.log.map(e => e.k).join(',') })
    }
    // screenshot mid-fight (Assault) with the training hitbox overlay on
    await page.evaluate(async () => {
      const C = __harness.cloneChoreo, raw = w => __harness.ninjaTest.raw(w), T = __harness.luffyTest
      C.clear('p1'); C.clear('p2'); __harness.narutoChoreoClear?.(); const p1 = raw('p1'), p2 = raw('p2'); p1.x = 640; p2.x = 900; p1.facing = 1; p2.facing = -1; p2.health = p2.maxHealth; p1.energy = 200
      for (const f of [p1, p2]) { f.vx = 0; f.hitstun = 0; f.attacking = false; f._madaraSusanoo && (f._madaraSusanoo = 1); f._susanooStage = 0 }
      T.step(30); C.summon('p1'); T.step(10); C.swarm('p1')
      for (let i = 0; i < 48; i++) T.step(1)
    })
    await page.screenshot({ path: `${OUT}/${C.key}_swarm.png` })
  }
} finally {
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ pass: PASS, fail: FAIL, errors, summary }, null, 2))
  console.log(`\n${PASS} passed, ${FAIL} failed${errors.length ? `, page errors: ${errors.slice(0, 3).join(' | ')}` : ''}`)
  await browser.close(); server.close?.()
  process.exit(FAIL ? 1 : 0)
}
