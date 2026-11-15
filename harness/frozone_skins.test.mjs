// harness/frozone_skins.test.mjs — Frozone: Default + 10 skins (Alien X Cosmic Frost, Upgrade Cryo Circuit, Diamondhead
// Crystal Current, Big Chill Deep Freeze, Superman Arctic Hero, JJK Infinity Ice, JJK Rose Winter, Winning Valkyrie
// Victory Glide, Modern Polar Stealth, Opal Aurora).
//  A. registry: Default first & unchanged; 10 ids / tags / names / classifications + source fields; ids never contain
//     "cyborg" nor end in "AlienX"; every body strip + every supplied ice piece + portrait on disk; region audit present.
//  B. per skin: identical 600-frame authoritative trace vs Default (cosmetic only: timing, geometry, damage, Chill /
//     Freeze); every action renders unclipped with the same content box; visor / skin-tone / shadow pixels byte-identical,
//     alpha identical, costume recoloured; on-screen ice pieces drawn from the skin's own fx folder; procedural ice uses
//     the skin's ice ramp; light + dark stage captures.
//  C. mirrors: different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. skin choice persists across a reload.   E. image cache bounded (no per-frame allocation).
//  Captures → docs/frozone/skins/.        node harness/frozone_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { FROZONE_FX_COLORS } from '../frozoneSkins.js'
import { FROZONE_SKIN_TABLE } from '../frozoneSkinTable.js'
const ROOT = process.cwd(), OUT = 'docs/frozone/skins', KEY = 'frozone'; let pass = 0, fail = 0; const report = { skins: {} }
fs.mkdirSync(OUT, { recursive: true })
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins(KEY), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = Object.fromEntries(FROZONE_SKIN_TABLE.map(t => [t.id, [t.tag, t.name, !!t.crossover]]))
const NAMES = ['Cosmic Frost', 'Cryo Circuit', 'Crystal Current', 'Deep Freeze', 'Arctic Hero', 'Infinity Ice', 'Rose Winter', 'Victory Glide', 'Polar Stealth', 'Opal Aurora']
const FX = fs.readdirSync(path.join(ROOT, 'assets/frozone/fx')).filter(f => f.endsWith('.png') && f !== 'blank.png')
ok(list[0].id === 'default' && !list[0].animationData && list.length === 11 && NAMES.every(n => list.some(s => s.name.includes(n))), 'A. Default first, unchanged (base sheets), exactly the 10 named skins added', String(list.length))
for (const [id, [tag, name, inspired]] of Object.entries(WANT)) { const s = byId[id]; const miss = []
  for (const d of Object.values(s?.animationData || {})) if (d?.sheet && (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet)))) miss.push(d.sheet)
  for (const m of FX) if (!fs.existsSync(path.join(ROOT, `assets/frozone/skins/${tag}/fx/${m}`))) miss.push('fx/' + m)
  if (!fs.existsSync(path.join(ROOT, `assets/frozone/skins/${tag}/portrait.png`))) miss.push('portrait')
  const cls = !!s?.classification && (inspired ? s.inspired && !!s.crossover : !s.inspired && !s.crossover) && !!s?.source?.inspiration
  ok(s && s.recolorTag === tag && s.name === name && cls && s.effectsPolicy && s.regionMapping && s.spriteScale === list[0].spriteScale && !miss.length && FROZONE_FX_COLORS[tag]?.ice?.length === 4,
    `A. ${id}: "${name}" registered, classified (${inspired ? 'crossover-inspired' : 'original'}), sourced, every body strip + ${FX.length} ice pieces + portrait on disk`, JSON.stringify({ miss: miss.slice(0, 4), cls: s?.classification })) }
ok(list.every(s => !/cyborg/i.test(s.id) && (s.id === 'default' || s.id.startsWith('fz_')) && !s.id.endsWith('AlienX')), 'A. no skin id contains "cyborg" or ends in "AlienX" (shared Superman-eye / starfield gates stay off)')
const RM = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/frozone/region_mapping.json'), 'utf8')), pc = RM.pixel_counts || {}
ok(pc.main > 0 && pc.shade > 0 && pc.panel > 0 && pc.ice > 0 && pc.keep > 0 && pc.disc > 0 && pc.flash > 0, 'A. region audit: suit / panel / disc / ice / kept / flash roles all present', JSON.stringify(pc))
ok(fs.existsSync(path.join(ROOT, 'docs/frozone/skins_contact.png')), 'A. docs/frozone/skins_contact.png exists')
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/frozone/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__draws = []; const o = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...rest) { if (im?.src?.includes('/assets/frozone')) __draws.push(im.src.split('/assets/')[1]); return o.call(this, im, ...rest) }
    const old = Math.random; window.__fzRandom = []; Math.random = function () { const st = new Error().stack; if (/\/frozone\w*\.js/.test(st) && __fzRandom.length < 5) __fzRandom.push(st); return old() } })
  await page.goto(`${server.base}/index.html?harness=1&p1=${KEY}&p2=${KEY}&seed=24681`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.frozoneTest)
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async () => { const f = __harness.frozoneTest.raw()
    await Promise.all(Object.values(f._skinAnim || f.animationData).filter(d => d?.sheet).map(d => d.sheet).map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) })
  return page
}
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.frozoneTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1420; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 13: { light: true }, 24: { light: true }, 90: { special: true }, 170: { right: true, special: true }, 250: { down: true, special: true }, 330: { up: true, jump: true, special: true },
    410: { left: true, special: true }, 480: { right: true }, 484: { right: true }, 540: { jump: true, up: true }, 556: { jump: true, up: true } }
  const t = []; for (let i = 0; i < 600; i++) { writeRawControls(a, ev[i] || {}); if (i === 160 || i === 240 || i === 320 || i === 400) a.energy = 100; __harness.luffyTest.step(1)
    const s = a._frozone; t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, s && { ...s, cues: undefined }])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.frozoneTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData).filter(k => (f._skinAnim || f.animationData)[k]?.sheet)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
try {
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped).slice(0, 4)))
  ok(new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean)).size >= 7, 'B. trace is live (chain, Lance, Rush, Black Ice, Rise, Breaker, skate, jumps)', JSON.stringify([...new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean))]))
  for (const [id, [tag]] of Object.entries(WANT)) {
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.frozoneTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`), `B. ${id}: applied (tag ${me.tag})`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 600-frame trace identical to Default (timing / geometry / damage / ice untouched)`, d === -1 ? '' : `frame ${d}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    await page.evaluate(() => { const H = __harness.frozoneTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1520; a.energy = 100; __harness.luffyTest.step(1)
      H.move('fRush'); __harness.luffyTest.step(8); __draws.length = 0; __harness.luffyTest.step(14) })
    await page.waitForTimeout(80); await page.evaluate(() => { __draws.length = 0; __harness.luffyTest.step(1) })
    const dr0 = await page.evaluate(() => [...new Set(__draws)]); await page.screenshot({ path: `${OUT}/${id}_rush.png` })
    await page.evaluate(() => __harness.luffyTest.step(10)); await page.waitForTimeout(40); await page.evaluate(() => { __harness.luffyTest.step(1) })
    const dr = [...new Set([...dr0, ...await page.evaluate(() => [...new Set(__draws)])])], fx = dr.filter(x => x.includes('/fx/') && !x.endsWith('blank.png'))
    ok(fx.length >= 1 && fx.every(x => x.startsWith(`frozone/skins/${tag}/fx/`)), `B. ${id}: every supplied ice piece on screen drawn from the skin's own fx folder (${fx.length} parts)`, dr.join(','))
    const cols = await page.evaluate(async () => { const m = await import('./frozoneFx.js'); return m.colsOf(__harness.frozoneTest.raw()) })
    ok(JSON.stringify(cols.ice) === JSON.stringify(FROZONE_FX_COLORS[tag].ice), `B. ${id}: procedural ice uses the skin's ice ramp`, JSON.stringify(cols))
    await page.evaluate(() => __harness.luffyTest.step(60))
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); const H = __harness.frozoneTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1600; a.energy = 100; __harness.luffyTest.step(2); H.move('fBlackIce'); __harness.luffyTest.step(40); a.energy = 100 }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    const kept = await page.evaluate(async tag => { const f = __harness.frozoneTest.raw(), load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
      const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      const KEEP = new Set(['0,0,0', '64,56,40', '128,104,80', '96,80,56', '64,64,64', '128,128,128'])
      let keep = 0, changed = 0, strips = 0, recol = 0, alpha = 0; const files = new Set()
      for (const k of Object.keys(f.animationData)) { const b0 = f.animationData[k]?.sheet; if (b0) files.add(b0.split('/').pop()) }
      for (const file of files) { const [b, sk] = await Promise.all([load(`./assets/frozone/${file}`), load(`./assets/frozone/skins/${tag}/${file}`)]); if (!b || !sk) continue; strips++
        const B = px(b), S = px(sk); for (let i = 0; i < B.length; i += 4) { if (B[i + 3] !== S[i + 3]) alpha++; if (!B[i + 3]) continue
          const same = B[i] === S[i] && B[i + 1] === S[i + 1] && B[i + 2] === S[i + 2]
          if (KEEP.has(`${B[i]},${B[i + 1]},${B[i + 2]}`)) { keep++; if (!same) changed++ } else if (!same) recol++ } }
      return { strips, keep, changed, recol, alpha } }, tag)
    ok(kept.strips >= 30 && kept.keep > 1000 && kept.changed === 0 && kept.recol > 10000 && kept.alpha === 0, `B. ${id}: visor / skin-tone / shadow pixels identical, alpha identical, costume recoloured`, JSON.stringify(kept))
    const cache = await page.evaluate(() => { const H = __harness.frozoneTest, n0 = H.fxCache(); for (let i = 0; i < 120; i++) __harness.luffyTest.step(1); return [n0, H.fxCache()] })
    ok(cache[1] <= 24, `E. ${id}: Frozone image cache bounded (${cache[1]} entries)`, JSON.stringify(cache))
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, fxParts: fx.length, kept, cache }
    await page.close()
  }
  for (const [a, b, same] of [['fz_rose_winter', 'fz_infinity_ice', false], ['fz_opal_aurora', 'fz_opal_aurora', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.frozoneTest.raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `C. same-skin mirror (${a}) → P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `C. ${a} vs ${b}: both own palettes`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` })
    if (same) { const rnd = await page.evaluate(() => __fzRandom); ok(!rnd.length, 'no Math.random in frozone*.js', JSON.stringify(rnd)) }
    await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=${KEY}&p2=${KEY}`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'fz_arctic_hero', p2Skin: 'fz_victory_glide', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'fz_arctic_hero' && restored.p1Skin === 'fz_arctic_hero' && restored.p2Skin === 'fz_victory_glide', 'D. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing Frozone asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
