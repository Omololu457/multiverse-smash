// harness/batman_skins.test.mjs — Batman (rebuilt): Default + 10 arsenal-wide skins (Blue Crusader, Gotham Beyond, White
// Knight, Arkham Bronze, Red Rain, Alien X Cosmic Knight, Upgrade Wayne Systems, Cursed Midnight, Glacier Stealth, Gilded
// Eclipse).
//  A. static: list order / ids (bm_ prefix, no "cyborg", never ending "AlienX"), every precomputed sheet present, and
//     every skin sheet has EXACTLY the default's size and alpha mask (zero geometry change) — checked with PIL.
//  B. per skin, through the real game: applied (tag, body sheet from the skin), identical authoritative trace vs Default
//     over a scenario running gadgets + an operation + KNIGHTFALL (cosmetic only), the fleet / explosion / portrait are
//     requested from the skin folder, no 404s, no page errors.
//  C. mirror with two different skins keeps both palettes.        node harness/batman_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { BATMAN_FX_COLORS } from '../batmanSkins.js'
const ROOT = process.cwd(); let pass = 0, fail = 0; const report = { skins: {} }
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins('batman')
const WANT = ['default', 'bm_blue_crusader', 'bm_gotham_beyond', 'bm_white_knight', 'bm_arkham_bronze', 'bm_red_rain', 'bm_alienx_cosmic_knight', 'bm_upgrade_wayne_systems', 'bm_cursed_midnight', 'bm_glacier_stealth', 'bm_gilded_eclipse']
ok(JSON.stringify(list.map(s => s.id)) === JSON.stringify(WANT), 'A. Default + exactly the 10 named skins, in order', JSON.stringify(list.map(s => s.id)))
ok(list.every(s => !/cyborg/i.test(s.id) && !s.id.endsWith('AlienX') && (s.id === 'default' || s.id.startsWith('bm_'))), 'A. ids: bm_ prefix, no "cyborg", none ends in "AlienX"')
ok(list[0].animationData === null && list.slice(1).every(s => Object.values(s.animationData).every(d => d.sheet.includes(`/skins/${s.recolorTag}/`))), 'A. Default uses base sheets; every skin action points at its own sheet')
ok(list.slice(1).every(s => BATMAN_FX_COLORS[s.recolorTag]?.hud?.length === 2 && BATMAN_FX_COLORS[s.recolorTag]?.fx?.length === 3 && BATMAN_FX_COLORS[s.recolorTag]?.smoke?.length === 2), 'A. every skin carries HUD / effect / smoke colours (arsenal-wide)')
const files = ['body.png', 'fleet.png', 'portrait.png', 'explosion.png'], miss = []
for (const s of list.slice(1)) for (const f of files) if (!fs.existsSync(path.join(ROOT, 'assets/batman/skins', s.recolorTag, f))) miss.push(`${s.recolorTag}/${f}`)
ok(miss.length === 0, 'A. all 40 precomputed sheets present (body / fleet / portrait / explosion per skin)', miss.join(', '))
const py = `
import sys, json
from PIL import Image
import numpy as np
tags = json.loads(sys.argv[1]); out = {}
base = {'body.png': 'assets/batman/body.png', 'fleet.png': 'assets/batman/fleet.png', 'portrait.png': 'assets/batman/portrait.png', 'explosion.png': 'assets/krybot/explosion.png'}
B = {k: np.array(Image.open(v).convert('RGBA')) for k, v in base.items()}
for t in tags:
  r = {}
  for k, b in B.items():
    s = np.array(Image.open(f'assets/batman/skins/{t}/{k}').convert('RGBA'))
    same = s.shape == b.shape and bool((s[..., 3] == b[..., 3]).all())
    changed = int(((s[..., :3] != b[..., :3]).any(-1) & (b[..., 3] > 0)).sum()) if s.shape == b.shape else -1
    r[k] = [same, changed]
  out[t] = r
print(json.dumps(out))`
const geo = JSON.parse(execFileSync('python3', ['-c', py, JSON.stringify(list.slice(1).map(s => s.recolorTag))], { cwd: ROOT }).toString())
for (const s of list.slice(1)) { const g = geo[s.recolorTag]; report.skins[s.id] = { geometry: g }
  ok(Object.values(g).every(([same, ch]) => same && ch > 0), `A. ${s.id}: every sheet same size + identical alpha mask (no geometry change), colours changed`, JSON.stringify(g)) }
// ── B / C: through the real game ──
const server = await serve(), browser = await chromium.launch({ headless: true })
const SCEN = `(()=>{const H=__harness.batmanTest,a=H.raw(),b=H.raw('p2'),st=n=>__harness.luffyTest.step(n),t=[]
  H.reset(); a.x=1300; b.x=1400; a.facing=1; b.facing=-1; for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.vx=f.vy=0;f.hitstun=0;f.hitstop=0;f.comboCounter=0;f.comboTimer=0} st(1)
  const D=()=>JSON.stringify([a.x,a.y,a.health,a.energy,b.x,b.y,b.health,a.currentAttack?.name,a._batman&&{...a._batman,cues:undefined},H.ult()])
  H.move('bBatarang'); for(let i=0;i<70;i++){st(1);t.push(D())}
  H.move('cmdCarrier'); for(let i=0;i<300;i++){st(1);t.push(D())}
  a.energy=100; a.comboCounter=0; b.x=a.x+110; H.move('ultOpen'); for(let i=0;i<300;i++){st(1);t.push(D())}
  return t})()`
const LEGACY_404 = /\/batman_baterang_proj\.png/
async function run(p1Skin, p2Skin = 'default') {
  const page = await browser.newPage(), errors = [], r404 = [], reqs = []; page.on('pageerror', e => errors.push(e.message))
  page.on('request', q => reqs.push(q.url().replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, '')))
  // LEGACY_404: preloadManifest.js (shared, generated from abilities.js by tools/check_fx_manifest.mjs) still lists the
  // pre-rebuild batarang sheet that the roster wipe deleted; it is pre-existing and unrelated to the rebuild's own art.
  page.on('response', r => { if (r.status() === 404 && /batman/i.test(r.url()) && !LEGACY_404.test(r.url())) r404.push(r.url()) })
  await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(server.base + '/index.html?harness=1&p1=batman&p2=batman&seed=4242'); await page.waitForFunction(() => window.__harness?.batmanTest)
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [p1Skin, p2Skin]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.spriteReady().ready, null, { timeout: 60000 })
  const me = await page.evaluate(() => { const f = __harness.batmanTest.raw(), g = __harness.batmanTest.raw('p2'); return { id: f.skinId, tag: f._recolorTag || null, idle: (f._skinAnim || f.animationData).idle.sheet, p2: g.skinId, p2tag: g._recolorTag || null } })
  const trace = await page.evaluate(SCEN)
  for (let i = 0; i < 6; i++) { await page.evaluate(() => __harness.luffyTest.step(1)); await new Promise(r => setTimeout(r, 40)) }
  const req = reqs.filter(n => /batman|krybot\/explosion/.test(n))
  await page.close(); return { me, trace, req, errors, r404 }
}
const base = await run('default')
ok(base.errors.length === 0 && base.r404.length === 0, 'B. default: no errors / 404s', JSON.stringify([base.errors.slice(0, 2), base.r404.slice(0, 3)]))
for (const s of list.slice(1)) {
  const r = await run(s.id), t = s.recolorTag
  ok(r.me.id === s.id && r.me.tag === t && r.me.idle.includes(`/skins/${t}/`), `B. ${s.id}: applied (tag ${r.me.tag}, body sheet from the skin)`, JSON.stringify(r.me))
  const k = base.trace.findIndex((x, i) => x !== r.trace[i])
  ok(k === -1 && r.trace.length === base.trace.length, `B. ${s.id}: identical ${r.trace.length}-frame authoritative trace vs Default (gadget + Carrier + KNIGHTFALL; zero gameplay diff)`, k >= 0 ? `frame ${k}` : '')
  const want = ['fleet.png', 'explosion.png', 'portrait.png'].map(f => `assets/batman/skins/${t}/${f}`)
  ok(want.every(w => r.req.some(q => q.endsWith(w))), `B. ${s.id}: fleet, explosion and portrait drawn from the skin's own sheets`, JSON.stringify(r.req.filter(q => q.includes('skins')).slice(0, 8)))
  ok(r.errors.length === 0 && r.r404.length === 0, `B. ${s.id}: no page errors / 404s`, JSON.stringify([r.errors.slice(0, 2), r.r404.slice(0, 3)]))
  report.skins[s.id] = { ...report.skins[s.id], applied: r.me, frames: r.trace.length }
}
const m = await run('bm_red_rain', 'bm_glacier_stealth')
ok(m.me.tag === 'red_rain' && m.me.p2tag === 'glacier_stealth', 'C. mirror with two different skins keeps both palettes', JSON.stringify(m.me))
fs.writeFileSync('docs/batman/skins_results.json', JSON.stringify(report, null, 1))
console.log(`\n${pass} passed, ${fail} failed`); await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
