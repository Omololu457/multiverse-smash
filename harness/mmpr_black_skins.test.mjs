// harness/mmpr_black_skins.test.mjs — Black Ranger: Default + 6 Inspired Palette skins.
//  A. registry: Default first & unchanged, 6 ids/tags/sources, Alien X id ends "AlienX", every sheet on disk.
//  B. per skin: identical 700-frame authoritative trace vs Default (cosmetic only); every action renders unclipped at
//     the same content box as Default; blink afterimage follows the skin; the FALCONZORD IS NEVER RECOLOURED (only base
//     falconzord cells drawn); owner markers use the skin's FX colours; light + dark stage captures.
//  C. mirrors: different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. skin choice persists across a reload.
//  Captures → docs/skins/mmpr_black/.        node harness/mmpr_black_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { MMPR_BLACK_FX_COLORS } from '../mmprBlackSkins.js'
const ROOT = process.cwd(), OUT = 'docs/skins/mmpr_black'; let pass = 0, fail = 0; const report = { skins: {} }
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins('mmpr_black'), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = { mmprBlackAlienX: 'alienx', mmpr_black_inspired_upgrade: 'upgrade', mmpr_black_inspired_diamondhead: 'diamondhead', mmpr_black_inspired_heatblast: 'heatblast', mmpr_black_inspired_chromastone: 'chromastone', mmpr_black_inspired_ghostfreak: 'ghostfreak' }
ok(list[0].id === 'default' && !list[0].animationData && list.length === 7, 'A. Default first, unchanged (base sheets), exactly 6 skins added', String(list.length))
for (const [id, tag] of Object.entries(WANT)) { const s = byId[id]; let files = true
  for (const d of Object.values(s?.animationData || {})) if (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet))) files = false
  for (const fx of ['blink', 'portrait']) if (!fs.existsSync(path.join(ROOT, `assets/mmpr_black/skins/${tag}/${fx}.png`))) files = false
  ok(s && s.recolorTag === tag && s.classification === 'Inspired Palette' && s.effectsPolicy && s.regionMapping && s.source?.version && s.source?.url && s.spriteScale === list[0].spriteScale && files && MMPR_BLACK_FX_COLORS[tag], `A. ${id}: registered, classified, sourced, all sheets on disk, FX colours defined`) }
ok(Object.keys(WANT).filter(k => k.endsWith('AlienX')).length === 1, 'A. Alien X id ends "AlienX" → existing shared starfield overlay')
ok(!fs.existsSync(path.join(ROOT, 'assets/power_rangers/falconzord/skins')), 'A. no recoloured Falconzord art exists anywhere')
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/(mmpr_black|power_rangers)/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__draws = []; window.__strokes = []; const o = CanvasRenderingContext2D.prototype.drawImage, st = CanvasRenderingContext2D.prototype.stroke
    CanvasRenderingContext2D.prototype.stroke = function (...r) { if (/mmprBlackFx/.test(new Error().stack || '')) __strokes.push(String(this.strokeStyle)); return st.apply(this, r) }
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...r) { if (im?.src?.includes('/assets/') && /mmprBlackFx/.test(new Error().stack || '')) __draws.push(im.src.split('/assets/')[1]); return o.call(this, im, ...r) } })
  await page.goto(`${server.base}/index.html?harness=1&p1=mmpr_black&p2=mmpr_black&seed=24680`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.mmprBlackTest)
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async () => { const f = __harness.mmprBlackTest.raw(); const { FALCON_CELLS } = await import('./falconzordSprites.js')
    await Promise.all([...Object.values(f._skinAnim || f.animationData).map(d => d.sheet), f._recolorTag ? `./assets/mmpr_black/skins/${f._recolorTag}/blink.png` : './assets/mmpr_black/blink.png', ...Object.values(FALCON_CELLS).map(c => c.src)].map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) })
  return page
}
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.mmprBlackTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 14: { light: true }, 26: { light: true }, 90: { right: true, special: true }, 104: { heavy: true }, 200: { up: true, jump: true, special: true }, 300: { down: true, special: true }, 420: { special: true }, 520: { left: true, special: true }, 600: { right: true }, 604: { right: true }, 640: { right: true, heavy: true } }
  const t = []; for (let i = 0; i < 700; i++) { writeRawControls(a, ev[i] || {}); __harness.luffyTest.step(1)
    t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, a._falcon?.pips, a._falcon?.sortie?.age, a._mmprBlack?.pincer, a._ranger?.charges])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.mmprBlackTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
try {
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped)))
  ok(new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean)).size >= 6, 'B. trace is live (calls, chains, specials)')
  for (const [id, tag] of Object.entries(WANT)) {
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.mmprBlackTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`), `B. ${id}: applied (tag ${me.tag})`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 700-frame trace identical to Default (timing/geometry/damage untouched)`, d === -1 ? '' : `frame ${d}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    // blink afterimage + sweep sortie: skin art for Black, BASE art for the Falconzord, owner markers in skin colours
    await page.evaluate(() => { const H = __harness.mmprBlackTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1900; a.energy = 100; __draws.length = 0; __strokes.length = 0; __harness.luffyTest.step(1) })
    await page.keyboard.down('d'); await page.evaluate(() => __harness.luffyTest.step(1)); await page.keyboard.up('d'); await page.evaluate(() => __harness.luffyTest.step(2)); await page.keyboard.down('d'); await page.evaluate(() => __harness.luffyTest.step(1)); await page.keyboard.up('d')
    await page.evaluate(() => __harness.luffyTest.step(3)); await page.screenshot({ path: `${OUT}/${id}_blink.png` })
    await page.evaluate(() => { const H = __harness.mmprBlackTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1520; a.energy = 100; __harness.luffyTest.step(1); H.move('bCall', 'p1', { kind: 'sweep' }); __harness.luffyTest.step(16) })
    await page.screenshot({ path: `${OUT}/${id}_sortie.png` })
    await page.evaluate(() => __harness.luffyTest.step(10))
    const dr = await page.evaluate(() => [...new Set(__draws)]), strokes = await page.evaluate(() => [...new Set(__strokes)])
    const falcon = dr.filter(x => x.includes('falconzord'))
    ok(dr.some(x => x.includes(`mmpr_black/skins/${tag}/blink`)), `B. ${id}: blink afterimage drawn in the skin`, dr.join(','))
    ok(falcon.length > 0 && falcon.every(x => x.startsWith('power_rangers/falconzord/cells/')), `B. ${id}: Falconzord drawn from the base cells only (never recoloured)`, falcon.join(','))
    ok(strokes.includes(MMPR_BLACK_FX_COLORS[tag][0]), `B. ${id}: warning lane / pips use the skin's FX colour ${MMPR_BLACK_FX_COLORS[tag][0]}`, strokes.join(','))
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); __harness.mmprBlackTest.reset(); __harness.luffyTest.step(2) }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, falconCells: falcon.length }
    await page.close()
  }
  for (const [a, b, same] of [['mmpr_black_inspired_heatblast', 'mmpr_black_inspired_diamondhead', false], ['mmprBlackAlienX', 'mmprBlackAlienX', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.mmprBlackTest.raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `C. same-skin mirror (${a}) → P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `C. ${a} vs ${b}: both own palettes`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` }); await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=mmpr_black&p2=mmpr_black`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'mmpr_black_inspired_chromastone', p2Skin: 'mmpr_black_inspired_ghostfreak', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'mmpr_black_inspired_chromastone' && restored.p1Skin === 'mmpr_black_inspired_chromastone' && restored.p2Skin === 'mmpr_black_inspired_ghostfreak', 'D. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing Black/Falconzord asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
