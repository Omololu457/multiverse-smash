// harness/spd_red_skins_check.mjs — S.P.D. Red Ranger alt skins (cosmetic only).
//   node harness/spd_red_skins_check.mjs
// Static: every `<sheet>__<tag>.png` exists for all 10 skins, same size + same alpha as the base, and ONLY the suit /
// trim ramps changed (outlines, visor, poster, gem byte-for-byte equal colours). In-game: each skin registers, applies,
// its body / Win-2 / idle-glint strips and Blaster bolt use the tagged sheets (all load, no 404), nothing errors, and
// switching back to Default restores the untagged art. Screenshots → /tmp/ms-spd-red-skins/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = '/tmp/ms-spd-red-skins'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }
const TAGS = ['green', 'yellow', 'pink', 'shadow', 'swat', 'battlizer', 'asquad', 'ben10', 'albedo', 'alienx']

// ── static (python + PIL does the pixel comparison) ──
const py = `
import os, sys, json
from PIL import Image
D = sys.argv[1]; tags = sys.argv[2].split(',')
SUIT = {(255,8,0),(222,8,0),(189,8,0),(181,0,0),(165,0,0),(132,0,0),(123,16,8),(107,0,0),(99,0,0)}
TRIM = {(247,255,231),(198,198,181),(148,148,140),(99,99,90),(49,49,41)}
base = sorted(f for f in os.listdir(D) if f.endswith('.png') and '__' not in f and f not in ('poster.png','gem.png','gem_cut.png'))
missing, bad = [], []
changed = 0
for t in tags:
  for f in base:
    p = os.path.join(D, f.replace('.png', '__' + t + '.png'))
    if not os.path.exists(p): missing.append(p); continue
    a = Image.open(os.path.join(D, f)).convert('RGBA'); b = Image.open(p).convert('RGBA')
    if a.size != b.size: bad.append(f + ':' + t + ':size'); continue
    for pa, pb in zip(a.getdata(), b.getdata()):
      if pa[3] != pb[3]: bad.append(f + ':' + t + ':alpha'); break
      if pa[3] == 0: continue
      if pa[:3] in SUIT or pa[:3] in TRIM:
        if pa[:3] != pb[:3]: changed += 1
      elif pa[:3] != pb[:3]: bad.append(f + ':' + t + ':' + str(pa[:3])); break
print(json.dumps({'base': len(base), 'missing': missing[:5], 'nmissing': len(missing), 'bad': bad[:5], 'nbad': len(bad), 'changed': changed}))
`
const S = JSON.parse(execFileSync('python3', ['-c', py, path.join(ROOT, 'assets/spd_red'), TAGS.join(',')]).toString())
check(`all ${TAGS.length} skins × ${S.base} sheets generated`, S.nmissing === 0 && S.base >= 50, `${S.nmissing} missing ${S.missing.join(',')}`)
check('recolours are exact palette maps: same size + alpha, only suit/trim ramps change (outlines, visor, poster, gem untouched)', S.nbad === 0 && S.changed > 100000, `${S.nbad} bad ${S.bad.join(',')} changed=${S.changed}`)

// ── in-game ──
const server = await serve()
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname) })
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const st = () => page.evaluate(() => { const f = __harness.spdRedTest.raw('p1'), a = f._skinAnim || f.animationData
  return { skinId: f.skinId, tag: f._recolorTag || null, idle: a?.idle?.sheet, win: a?.win?.sheet } })
try {
  await page.goto(`${server.base}/index.html?harness=1&p1=spd_red&p2=zoro`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() }); await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 200)) }
  const list = await page.evaluate(async () => (await import('./skins.js')).getSkins('spd_red').map(s => ({ id: s.id, name: s.name, portrait: s.portrait })))
  check('SKINS.spd_red: Default + 10 alt skins registered', list.length === 11 && list[0].id === 'default', list.map(s => s.id).join(','))
  check('Alien X skin id ends "AlienX" (engine starfield overlay)', list.some(s => s.id === 'spdRedAlienX'))
  const ports = await page.evaluate(urls => Promise.all(urls.map(u => fetch(u).then(r => r.status))), list.map(s => s.portrait))
  check('every skin portrait loads', ports.every(s => s === 200), ports.join(','))
  for (const s of list.slice(1)) {
    const tag = s.id === 'spdRedAlienX' ? 'alienx' : s.id.replace('spd_red_', '')
    await page.evaluate(() => __harness.spdRedTest.reset()); await step(2)
    await page.evaluate(i => __harness.setSkin('p1', i), s.id); await step(3)
    let r = await st()
    const okBody = r.tag === tag && r.idle?.endsWith(`idle__${tag}.png`)
    await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); a.x = 400; z.x = 1100; a.facing = 1; z.facing = -1; a.energy = 100 })
    await page.keyboard.down('l'); await step(1); await page.keyboard.up('l')
    let bolt = null
    for (let i = 0; i < 20 && !bolt; i++) { await step(1); bolt = await page.evaluate(async () => { const m = await import('./abilities.js'); const p = m.activeProjectiles.find(p => p.owner === __harness.spdRedTest.raw('p1')); return p ? p.sheet || p.moveData?.sheet || null : null }) }
    await page.screenshot({ path: path.join(OUT, `skin-${tag}.png`) })
    await page.evaluate(() => { const f = __harness.spdRedTest.raw('p1'); f._forceAction = 'win'; f._srWinVar = 2 }); await step(3)
    const w = await st()
    await page.evaluate(() => { const f = __harness.spdRedTest.raw('p1'); f._forceAction = null; f._srWinVar = 0 }); await step(3)
    await page.evaluate(() => __harness.spdRedTest.reset()); await step(30)   // standing still, no attack / bolt in flight
    await page.evaluate(() => __harness.spdRedTest.set('p1', { idleT: 700 })); await step(2)
    const g = await page.evaluate(() => { const f = __harness.spdRedTest.raw('p1'), a = f._skinAnim || f.animationData
      return { idle: a?.idle?.sheet, idleT: f._spdRed?.idleT, att: !!f.attacking, vx: f.vx, kd: !!f.knockdownState } })
    await page.evaluate(() => __harness.spdRedTest.set('p1', { idleT: 0 })); await step(2)
    check(`${s.name}: body, bolt, Win-2 and idle-glint use the __${tag} art`, okBody && bolt?.endsWith(`__${tag}.png`) && w.win?.endsWith(`win2__${tag}.png`) && g.idle?.endsWith(`idleGlint__${tag}.png`),
      JSON.stringify({ idle: r.idle, bolt, win: w.win, glint: g.idle }))
  }
  await page.evaluate(() => __harness.setSkin('p1', 'default')); await step(3)
  const d = await st()
  check('back to Default: untagged art', !d.tag && d.idle?.endsWith('/idle.png'), JSON.stringify(d))
  await new Promise(r => setTimeout(r, 500))
  const mine = missing.filter(u => /spd_red/.test(u))
  check('no S.P.D. Red 404s (every tagged sheet the game asked for exists)', mine.length === 0, mine.slice(0, 5).join(', '))
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
} catch (e) {
  check('skins check ran to completion', false, e.stack || e.message)
} finally { await browser.close(); server.close?.() }
console.log(`\n════════════════════════════════════════\n  S.P.D. RED SKINS: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
process.exit(FAIL ? 1 : 0)
