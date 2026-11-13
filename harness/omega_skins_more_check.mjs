// harness/omega_skins_more_check.mjs — Omega Ranger's 10 extra alt skins (omegaSkins.js / tools/gen_omega_more.py).
//   node harness/omega_skins_more_check.mjs
// Static: every wired sheet + mugshot has a `__<tag>` copy, same size + alpha, black outlines byte-identical.
// In-game: the 15 existing skins are untouched and in order, the 10 new ones are appended, each applies, every
// animation sheet it uses loads, nothing errors, Default restores the untagged art. Screenshots → /tmp/ms-omega-skins/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = '/tmp/ms-omega-skins'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }
const NEW = [['ben10', 'omegaBen10'], ['nova', 'omegaNova'], ['shadow', 'omegaShadow'], ['krybot', 'omegaKrybot'], ['gruumm', 'omegaGruumm'],
  ['magma', 'omegaMagma'], ['arctic', 'omegaArctic'], ['neon', 'omegaNeon'], ['holo', 'omegaHolo'], ['glitter', 'omegaGlitter']]
const OLD = ['default', 'omegaAlbedo', 'omegaValkyrie', 'omegaAlienX', 'omegaCrimson', 'omegaCobalt', 'omegaVerdant', 'omegaVanguard',
  'omegaAmethyst', 'omegaRose', 'omegaSlate', 'omegaSunburst', 'omegaObsidian', 'omegaIvory', 'omegaTeal', 'omegaSolar']

const py = `
import os, sys, json, colorsys
sys.path.insert(0, os.path.join(sys.argv[1], 'tools'))
import gen_omega_creative as G
from PIL import Image
R = sys.argv[1]; tags = sys.argv[2].split(',')
names = G.wired_sheets() + ['SPD_Omega_Ranger_mugshot.png']
missing, bad = [], []
for t in tags:
  for n in names:
    p = os.path.join(R, n[:-4] + '__' + t + '.png')
    if not os.path.exists(p): missing.append(p); continue
    a = Image.open(os.path.join(R, n)).convert('RGBA'); b = Image.open(p).convert('RGBA')
    if a.size != b.size: bad.append(n + ':size'); continue
    for pa, pb in zip(a.getdata(), b.getdata()):
      if pa[3] != pb[3]: bad.append(n + ':' + t + ':alpha'); break
      if pa[3] and pa[:3] != pb[:3]:
        h, sv, v = G.rgb_hsv(*pa[:3])
        if not any(sel(h, sv, v) for _, sel in G.REGIONS): bad.append(n + ':' + t + ':outside-regions'); break
print(json.dumps({'n': len(names), 'missing': len(missing), 'm': missing[:3], 'bad': len(bad), 'b': bad[:3]}))
`
const S = JSON.parse(execFileSync('python3', ['-c', py, ROOT, NEW.map(x => x[0]).join(',')]).toString())
check(`all 10 skins × ${S.n} sheets (29 wired + mugshot) generated`, S.missing === 0 && S.n === 30, S.m.join(','))
check('same size + alpha as the base; every pixel outside the armour/visor/emblem regions (outlines etc.) byte-identical', S.bad === 0, S.b.join(','))

const server = await serve()
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname) })
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
try {
  await page.goto(`${server.base}/index.html?harness=1&p1=omega_ranger&p2=zoro`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() }); await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 200)) }
  const ids = await page.evaluate(async () => (await import('./skins.js')).getSkins('omega_ranger').map(s => s.id))
  check('the existing 16 entries (Default + 15 skins) are untouched and in order', JSON.stringify(ids.slice(0, 16)) === JSON.stringify(OLD), ids.slice(0, 16).join(','))
  check('the 10 new skins are appended (26 total)', ids.length === 26 && NEW.every(([, id], i) => ids[16 + i] === id), ids.slice(16).join(','))
  for (const [tag, id] of NEW) {
    await page.evaluate(i => __harness.setSkin('p1', i), id)
    for (let i = 0; i < 4; i++) { await step(3); await new Promise(r => setTimeout(r, 200)) }   // let the new sheets decode (real time) so the screenshot shows the skin
    const r = await page.evaluate(async () => { const f = __harness.spdRedTest.raw('p1'), a = f._skinAnim || f.animationData
      const sheets = [...new Set(Object.values(a).map(d => d?.sheet).filter(Boolean))]
      const st = await Promise.all(sheets.map(u => fetch(u).then(x => x.status)))
      return { skinId: f.skinId, idle: a.idle?.sheet, n: sheets.length, bad: sheets.filter((u, i) => st[i] !== 200) } })
    await page.screenshot({ path: path.join(OUT, `omega-${tag}.png`) })
    check(`${id}: applies, idle + all ${r.n} sheets are the __${tag} art and load`, r.skinId === id && r.idle?.endsWith(`__${tag}.png`) && r.bad.length === 0, JSON.stringify(r).slice(0, 200))
  }
  await page.evaluate(() => __harness.setSkin('p1', 'default')); await step(3)
  const d = await page.evaluate(() => { const f = __harness.spdRedTest.raw('p1'); return (f._skinAnim || f.animationData).idle?.sheet })
  check('back to Default: untagged art', d && !d.includes('__'), d)
  await new Promise(r => setTimeout(r, 400))
  const mine = missing.filter(u => /omega/i.test(u))
  check('no Omega 404s', mine.length === 0, mine.slice(0, 4).join(', '))
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '))
} catch (e) { check('omega skins check ran to completion', false, e.stack || e.message) }
finally { await browser.close(); server.close?.() }
console.log(`\n════════════════════════════════════════\n  OMEGA EXTRA SKINS: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
process.exit(FAIL ? 1 : 0)
