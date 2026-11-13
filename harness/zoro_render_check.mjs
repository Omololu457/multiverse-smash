// harness/zoro_render_check.mjs — Roronoa Zoro RENDER CHECK (run before every Zoro commit).
//   node harness/zoro_render_check.mjs [phase]
// Boots the real game in Chromium, picks the fighters, starts a match and proves: no page error, no blank
// screen, both fighters + HUD render, every Zoro asset loads (no 404). From phase 2 Zoro is P1; later
// phases add scenario checks (Santoryu, Tatsu Maki, the Super, …). Screenshots → /tmp/ms-zoro-render/.
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve, ROOT } from './ben10_test_utils.mjs'

const PHASE = Number(process.argv[2] || 99)
const OUT = '/tmp/ms-zoro-render'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }

const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname) })
const sleep = ms => new Promise(r => setTimeout(r, ms))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })   // drive frames manually (deterministic)

const P1 = PHASE >= 2 ? 'zoro' : 'luffy', P2 = 'luffy'
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const shot = name => page.screenshot({ path: path.join(OUT, name + '.png') })
// Real keyboard motion input for P1 (a=left d=right s=down w=up, l=Special). null = a neutral frame. Facing right.
async function motion(seq, button) {
  for (const k of seq) { if (k) await page.keyboard.down(k); await page.evaluate(() => __harness.luffyTest.step(2)); if (k) await page.keyboard.up(k) }
  await page.keyboard.down(button); await page.evaluate(() => __harness.luffyTest.step(1)); await page.keyboard.up(button)
}
const zs = (w = 'p1') => page.evaluate(w => __harness.zoroTest ? __harness.zoroTest.state(w) : null, w)
const ls = (w = 'p1') => page.evaluate(w => __harness.luffyTest.state(w), w)
// Non-blank: the rendered canvas must contain many distinct colours in the play area and in the HUD strip.
const canvasStats = () => page.evaluate(() => {
  const c = document.querySelector('canvas'); const x = c.getContext('2d')
  const uniq = (sx, sy, w, h) => { const d = x.getImageData(sx, sy, w, h).data, s = new Set(); for (let i = 0; i < d.length; i += 16) s.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); return s.size }
  return { w: c.width, h: c.height, play: uniq(0, c.height * 0.3, c.width, c.height * 0.6), hud: uniq(0, 0, c.width, Math.round(c.height * 0.16)) }
})

try {
  await page.goto(`${server.base}/index.html?harness=1&p1=${P1}&p2=${P2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest, null, { timeout: 30000 })
  check('game boots (harness up, no page error at boot)', errors.length === 0, errors[0] || '')
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 6; i++) { await step(5); await new Promise(r => setTimeout(r, 250)) }   // let sheets decode (real time)
  const a = await ls('p1'), b = await ls('p2')
  check(`P1 spawned as ${P1}`, a?.key === P1, a?.key)
  check(`P2 spawned as ${P2}`, b?.key === P2, b?.key)
  check('both fighters alive with HP', a?.health > 0 && b?.health > 0, `${a?.health}/${b?.health}`)
  check('P1 sprite drawn (real draw rect)', a?.draw?.w > 20 && a?.draw?.h > 20, JSON.stringify(a?.draw))
  check('P2 sprite drawn (real draw rect)', b?.draw?.w > 20 && b?.draw?.h > 20, JSON.stringify(b?.draw))
  const cs = await canvasStats()
  check('not a blank screen (play area has many colours)', cs.play > 40, `uniq=${cs.play}`)
  check('HUD strip renders (many colours)', cs.hud > 20, `uniq=${cs.hud}`)
  await shot(`p${PHASE}-00-match`)

  // Every Zoro asset referenced by ZORO_ANIM / ZORO_FX must load.
  const assets = await page.evaluate(async () => {
    const m = await import('./zoroSprites.js'); const urls = [...Object.values(m.ZORO_ANIM).map(a => a.sheet), ...Object.values(m.ZORO_FX).map(f => f.sheet)]
    const res = await Promise.all(urls.map(u => fetch(u).then(r => [u, r.status])))
    return res
  })
  const bad = assets.filter(([, s]) => s !== 200)
  check(`all ${assets.length} Zoro sprite/FX sheets load`, bad.length === 0, bad.map(x => x.join(':')).join(', '))

  if (PHASE >= 2) {
    const z = await zs()
    check('Zoro has Spirit meter (maxEnergy 100, energyName Spirit)', z && z.maxEnergy === 100 && z.energyName === 'Spirit', JSON.stringify(z && { m: z.maxEnergy, n: z.energyName }))
    check('Zoro base stats (HP 1000)', z && z.maxHealth === 1000, z && z.maxHealth)
    check('Zoro idle uses his own sheet', (await ls()).spriteAction === 'idle', (await ls()).spriteAction)
  }
  if (PHASE >= 3) {
    await page.evaluate(() => __harness.zoroTest.reset())
    await page.evaluate(() => __harness.zoroTest.spirit('p1', 100))
    await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k')   // A+B (Special+Heavy, same frame)
    await step(14)
    let z = await zs()
    check('Santoryu active (A+B)', z.santoryu === true && z.santoryuTimer > 500, JSON.stringify({ s: z.santoryu, t: z.santoryuTimer }))
    await step(20); await shot(`p${PHASE}-01-santoryu`)
    z = await zs()
    check('Santoryu renders the mouth-sword stance sheet (R7F1 zsIdle)', /zsIdle\.png$/.test(z.idleSheet || ''), z.idleSheet)
    check('Santoryu buffs: +12% dmg', Math.abs(z.dmgMul - 1.12) < 1e-9, z.dmgMul)
    check('Santoryu cost 15 Spirit', z.energy <= 85 + 1 && z.energy >= 84, z.energy)
    await page.evaluate(() => __harness.zoroTest.set('p1', { santoryuTimer: 2 })); await step(3)
    z = await zs()
    check('Santoryu expires → base stance + 4s cooldown', !z.santoryu && z.santoryuCd > 230 && /\/idle\.png$/.test(z.idleSheet || ''), JSON.stringify({ s: z.santoryu, cd: z.santoryuCd, sheet: z.idleSheet }))
  }
  if (PHASE >= 4) {
    await page.evaluate(() => __harness.zoroTest.reset())
    await page.evaluate(() => { __harness.zoroTest.spirit('p1', 100); __harness.luffyTest.set('p2', { x: __harness.p1().x + 380 }) })
    await motion(['s', null, 's'], 'l')                                                                                               // ↓ ↓ + A
    await step(26); await shot(`p${PHASE}-02-tatsumaki`)
    let z = await zs()
    check('Tatsu Maki tornado spawned', z.projectiles.some(p => p.kind === 'tatsu'), JSON.stringify(z.projectiles))
    await step(40)
    check('no crash during Tatsu Maki', errors.length === 0, errors[0] || '')
    await page.evaluate(() => __harness.zoroTest.reset())
    await page.evaluate(() => { __harness.zoroTest.spirit('p1', 100); __harness.luffyTest.set('p2', { x: __harness.p1().x + 90 }) })
    await page.keyboard.down('l'); await page.keyboard.down('k'); await step(1); await page.keyboard.up('l'); await page.keyboard.up('k')   // Santoryu (A+B) unlocks ASHURA
    await step(24); await page.evaluate(() => __harness.zoroTest.spirit('p1', 100))
    await motion(['s', 'd', 's', 'd'], 'l')                                                                                           // ↓→↓→ + A
    await step(18); await shot(`p${PHASE}-03-ashura-aura`)
    z = await zs()
    check('Ashura super started', z.move === 'zAshura' || z.move === 'zAshuraMiss', z.move)
    await step(40); await shot(`p${PHASE}-04-ashura-cuts`)
    await step(120); await shot(`p${PHASE}-05-ashura-end`)
    const b2 = await ls('p2')
    check('Ashura connected (P2 took damage)', b2.health < 1000, b2.health)
    check('no crash during the Super', errors.length === 0, errors[0] || '')
    const cs2 = await canvasStats()
    check('still not blank after the Super', cs2.play > 40, `uniq=${cs2.play}`)
  }
  const other404 = [...new Set(missing.filter(m => !/zoro/i.test(m)))]
  if (other404.length) console.log(`  ℹ non-Zoro 404s (not part of this build): ${other404.slice(0, 6).join(', ')}${other404.length > 6 ? ' …' : ''}`)
  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  const zMissing = missing.filter(m => /zoro/i.test(m))
  check('no Zoro 404s', zMissing.length === 0, zMissing.join(', '))
} catch (e) {
  check('render check ran to completion', false, e.message.split('\n')[0])
  if (errors.length) console.log('  page errors:', errors.slice(0, 4).join(' | '))
} finally {
  await browser.close(); server.close()
}
console.log(`\nZORO RENDER CHECK (phase ${PHASE}): ${PASS} passed, ${FAIL} failed  → screenshots in ${OUT}`)
process.exit(FAIL ? 1 : 0)
