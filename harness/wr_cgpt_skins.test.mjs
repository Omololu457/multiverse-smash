// harness/wr_cgpt_skins.test.mjs — the 20 ChatGPT-version Ninja Storm skins on the MS_V1 Ranger (windrangers), through the
// NORMAL flow: skin-select screen (hover + pick) → startMatch with that skin → Shane wears the ChatGPT skin exactly, a form
// swap puts Dustin in his opposite colourway, the clone wears the active form's skin, the FX folder follows; the sim is
// unchanged (same inputs → same numbers as the default skin); LAN match-setup + replay carry the skin id.
//   node harness/wr_cgpt_skins.test.mjs
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { makeMatchSetup, encode, decode } from '../net/protocol.js'
import { isClientPath } from '../net/clientManifest.mjs'
const SHOTS = 'docs/wr_skins/screenshots'; fs.mkdirSync(SHOTS, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
const CG = JSON.parse(fs.readFileSync('tools/ns_cgpt/skins.json', 'utf8')).skins
const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const errors = []
let page
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
async function open() {
  if (page) await page.close()
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=windrangers&p2=spd_red`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.ninjaTest, null, { timeout: 30000 })
}
async function match(skin, seed = 7) {
  await open()
  await page.evaluate(o => { __harness.rng.forceSeed(o.seed); __harness.start({ p1Skin: o.skin }); __harness.skipToBattle() }, { skin, seed })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 120)) }
}
const look = () => page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); const A = f._skinAnim || f.animationData
  return { key: f.rosterKey, skin: f.skinId, wr: f._wrSkin || null, idle: A.idle.sheet, sword: A.sword.sheet, dir: f._nsAssetDir || null, color: f._nsColor || null, smoke: f._nsSmoke || null } })
const swap = async () => { await page.evaluate(() => { const d = __harness.ninjaTest.raw('p1')._duo; d.cd = 0; d.want = 8 })
  for (let i = 0; i < 40; i++) { await step(1); const k = await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); return f._duo?.swap ? null : f.rosterKey }); if (k === 'ns_yellow') return k } return null }
async function script(skin) {
  await match(skin, 11)
  return page.evaluate(async () => {
    const T = __harness.ninjaTest, L = __harness.luffyTest, a = T.raw('p1'), z = T.raw('p2'), out = []
    const keys = [['j', 6], ['j', 6], ['k', 10], ['l', 30], ['i', 20], ['w', 12], ['j', 14], ['s', 2], ['s', 2], ['k', 40]]
    for (const [k, n] of keys) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: 'Key' + k.toUpperCase() })); L.step(1)
      window.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: 'Key' + k.toUpperCase() }))
      for (let i = 0; i < n; i++) { L.step(1); out.push([a.x | 0, a.y | 0, a.health, z.health | 0, z.x | 0, a.currentMove || '', a.w, a.h, a.attacking ? 1 : 0]) }
    }
    return out
  })
}
try {
  // ── files: Shane = byte copies, Dustin = alpha-exact, suits clearly different
  let chk = ''; try { chk = execFileSync('python3', ['tools/wr_skins/cgpt_import.py', '--check'], { encoding: 'utf8' }) } catch (e) { chk = (e.stdout || '') + 'FAILED' }
  check('import check: Shane files = byte copies of the ChatGPT skins, Dustin alpha = his own sprites, every Shane/Dustin pair ΔE ≥ 40', /problems: 0/.test(chk) && !/FAILED/.test(chk), chk.trim().split('\n').slice(-3).join(' | '))
  const files = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; e.isDirectory() ? walk(p) : files.push(p) } }
  for (const s of CG) walk(`assets/windrangers/skins/cg_${s.tag}`)
  const notClient = files.filter(p => !isClientPath(p)).concat(['windrangersCgptSkins.js'].filter(p => !isClientPath(p)))
  check(`companion: all ${files.length} new skin files + windrangersCgptSkins.js are client paths`, files.length === 20 * 134 && !notClient.length, notClient.slice(0, 3))
  // ── select screen
  await open()
  const sk = await page.evaluate(() => __harness.showSkinSelect('windrangers', 'p1', 0))
  const ids = sk.skins.map(s => s.id), names = Object.fromEntries(sk.skins.map(s => [s.id, s.name]))
  const want = CG.map(s => 'wr_cg_' + s.tag)
  check('skin select: the 10 pack skins kept, then the 20 ChatGPT-version skins in ChatGPT order with their ChatGPT names', JSON.stringify(ids.slice(12, 32)) === JSON.stringify(want) && CG.every(s => names['wr_cg_' + s.tag] === s.name), ids.slice(12, 32).map(i => names[i]))
  const http = await page.evaluate(async () => { const m = await import('./skins.js'); const bad = []; let n = 0
    for (const s of m.SKINS.windrangers.filter(s => s.id.startsWith('wr_cg_'))) for (const u of [s.portrait, s.hudIcon, ...new Set(Object.values(s.animationData).map(a => a.sheet))]) { n++; const r = await fetch(u, { method: 'HEAD' }); if (!r.ok) bad.push(u) }
    return { n, bad } })
  check(`every preview portrait + strip loads (HTTP 200, ${http.n} files)`, http.n > 0 && !http.bad.length, http.bad.slice(0, 4))
  for (const i of [12, 21, 31]) {
    await page.evaluate(i => { __harness.showSkinSelect('windrangers', 'p1', i); __harness.setSkinHover(i) }, i); await step(3)
    await page.screenshot({ path: `${SHOTS}/select_${ids[i].slice(3)}.png` })
    const p = await page.evaluate(i => __harness.pickSkin(i), i)
    check(`select screen: hover + pick "${names[ids[i]]}"`, p?.id === ids[i], p)
  }
  // ── every skin in a match: Shane, swap → Dustin, clone, FX folder + colours
  const rows = (await import('../windrangersCgptSkins.js')).WR_CGPT_SKIN_ROWS
  for (const s of CG) {
    const id = 'wr_cg_' + s.tag, tag = 'cg_' + s.tag, R = rows.find(r => r.tag === tag)
    await match(id)
    const a = await look()
    const okA = a.skin === id && a.wr === tag && a.key === 'ns_red' && a.idle.includes(`/skins/${tag}/ns_red/`) && a.dir.endsWith(`${tag}/ns_red`) && a.color === R.formFx.ns_red && a.smoke === R.smoke.ns_red
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); a.x = 760; z.x = 960 }); await step(20)
    await page.screenshot({ path: `${SHOTS}/match_${tag}_shane.png` })
    const k = await swap(); const b = await look()
    const okB = k === 'ns_yellow' && b.idle.includes(`/skins/${tag}/ns_yellow/`) && b.dir.endsWith(`${tag}/ns_yellow`) && b.color === R.formFx.ns_yellow && b.smoke === R.smoke.ns_yellow
    await step(20); await page.screenshot({ path: `${SHOTS}/match_${tag}_dustin.png` })
    const cl = await page.evaluate(async () => { const m = await import('./windrangersSkins.js'); return m.wrCloneAnim(__harness.ninjaTest.raw('p1'), 'guard')?.sheet || null })
    check(`${s.name}: Shane wears the ChatGPT skin → swap → Dustin wears ${R.dustin}; clone + FX folder + wind / smoke colours follow`, okA && okB && cl === null && b.sword.includes(`/skins/${tag}/ns_yellow/`), { a, b, cl })
  }
  // ── the sim is untouched
  const base = await script('default')
  for (const id of ['wr_cg_alienx', 'wr_cg_heatblast', 'wr_cg_neon', 'wr_cg_lunar']) {
    const run = await script(id)
    const diff = run.findIndex((r, i) => JSON.stringify(r) !== JSON.stringify(base[i]))
    check(`${id.slice(6)}: 230-frame input script gives identical x/y/health/moves/hurtbox to the default skin`, run.length === base.length && diff === -1, diff === -1 ? '' : { at: diff })
  }
  // ── LAN match setup + replay carry the skin
  const m = decode(encode(makeMatchSetup({ seed: 1, p1Char: 'windrangers', p1Skin: 'wr_cg_neon', p2Char: 'spd_red', p2Skin: 'default', stage: 'x', mode: 'vs', rounds: 3 })))
  check('LAN: match setup round-trips windrangers + wr_cg_neon', JSON.stringify(m).includes('wr_cg_neon'), JSON.stringify(m).slice(0, 160))
  await match('wr_cg_neon'); await step(30)
  const rep = await page.evaluate(() => __harness.replay?.stopAndGet?.() || null)
  check('replay: the recording stores p1Skin wr_cg_neon', rep?.p1Skin === 'wr_cg_neon' && rep?.p1Char === 'windrangers', rep ? { p1Char: rep.p1Char, p1Skin: rep.p1Skin } : null)
  check('no page errors', errors.length === 0, errors.slice(0, 3))
} catch (e) { console.log('CRASH', e.stack); FAIL++ }
await browser.close(); server.close?.()
console.log(`\nWR CGPT SKINS: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
