// harness/green_ranger_skins.test.mjs — Green Ranger: Default + 10 crossover-inspired palette skins.
//  A. registry: Default first & unchanged, 10 ids / tags / identity packages, starfield id does NOT end "AlienX"
//     (so the shared full-body starfield overlay never fires; Green bakes its own suit-only stars), every sheet on disk.
//  B. per skin: identical authoritative trace vs Default (cosmetic only); every action renders unclipped with the same
//     content box as Default; the Zord ultimate draws the SHARED base Falconzord cells (tinted at runtime from a
//     one-time cache) with the skin's subtitle; readable on a light and a dark stage.
//  C. mirrors: different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. skin choice persists across a reload.
//  Captures → docs/skins/green_ranger/.        node harness/green_ranger_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { GREEN_SKIN_TABLE } from '../greenRangerSkinTable.js'
const ROOT = process.cwd(), OUT = 'docs/skins/green_ranger'; fs.mkdirSync(OUT, { recursive: true }); let pass = 0, fail = 0; const report = { skins: {} }
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins('green_ranger'), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = Object.fromEntries(GREEN_SKIN_TABLE.filter(s => s.tag).map(s => [s.id, s.tag]))
ok(list[0].id === 'default' && !list[0].animationData && list.length === 11 && Object.keys(WANT).length === 10, 'A. Default first, unchanged (base sheets), exactly 10 skins added', String(list.length))
for (const [id, tag] of Object.entries(WANT)) { const s = byId[id], t = GREEN_SKIN_TABLE.find(x => x.id === id); let files = true
  for (const d of Object.values(s?.animationData || {})) if (d?.sheet && (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet)))) files = false
  for (const fx of ['portrait.png', 'cutin.png', 'cells/pulseShot.png', 'cells/ringBurst.png', 'cells/callCircle0.png']) if (!fs.existsSync(path.join(ROOT, `assets/green_ranger/skins/${tag}/${fx}`))) files = false
  ok(s && s.recolorTag === tag && s.spriteScale === list[0].spriteScale && files && t.tagline && t.glyph && t.subtitle && t.entrance && t.victory && /inspired/i.test(s.name), `A. ${id}: registered, inspired-labelled, identity package, all sheets on disk`) }
ok(!Object.keys(WANT).some(k => k.endsWith('AlienX')), 'A. no Green id ends "AlienX" (shared full-body starfield overlay stays off)')
ok(!fs.existsSync(path.join(ROOT, 'assets/power_rangers/falconzord/skins')), 'A. no recoloured Falconzord files on disk (tint is a runtime cache)')
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/(green_ranger|power_rangers)/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__draws = []; window.__texts = []; const o = CanvasRenderingContext2D.prototype.drawImage, ft = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (s, ...r) { if (/greenRangerFx/.test(new Error().stack || '')) __texts.push(String(s)); return ft.call(this, s, ...r) }
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...r) { if (/greenRangerFx/.test(new Error().stack || '')) __draws.push(im?.src ? im.src.split('/assets/')[1] : 'canvas'); return o.call(this, im, ...r) } })
  await page.goto(`${server.base}/index.html?harness=1&p1=green_ranger&p2=green_ranger&seed=24680`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.greenRangerTest)
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async () => { const f = __harness.greenRangerTest.raw(); const { FALCON_CELLS } = await import('./falconzordSprites.js')
    await Promise.all([...Object.values(f._skinAnim || f.animationData).filter(d => d?.sheet).map(d => d.sheet), ...Object.values(FALCON_CELLS).map(c => c.src)].map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) })
  return page
}
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.greenRangerTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 13: { light: true }, 23: { light: true }, 120: { charge: true }, 121: { charge: true }, 200: { special: true }, 300: { right: true, heavy: true }, 318: { heavy: true }, 336: { heavy: true }, 450: { down: true, special: true }, 560: { left: true, special: true }, 640: { ultimate: true } }
  const t = []; for (let i = 0; i < 900; i++) { writeRawControls(a, ev[i] || {}); __harness.luffyTest.step(1)
    t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, a._greenRanger?.notes, a._greenRanger?.cooldown, !!a._zordUlt, __harness.greenRangerTest.ult().frame])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.greenRangerTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
const ULT = async (page, shot) => { await page.evaluate(() => { const H = __harness.greenRangerTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1450; a.facing = 1; b.facing = -1; a.energy = 100; __draws.length = 0; __texts.length = 0; __harness.luffyTest.step(1); H.move('gUlt') })
  for (let i = 0; i < 60; i++) { await page.evaluate(() => { __harness.luffyTest.step(1); __harness.luffyTest.step(0) }); if (i === 46) await page.screenshot({ path: shot }) }
  return page.evaluate(() => ({ draws: [...new Set(__draws)], texts: [...new Set(__texts)], cache: __harness.greenRangerTest.fxCache() })) }
try {
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); const baseU = await ULT(page, `${OUT}/default_ult.png`); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped)))
  ok(new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean)).size >= 6, 'B. trace is live (chain, call, specials, ultimate)', JSON.stringify([...new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean))]))
  ok(baseU.texts.includes('RANGER ZORD ASSAULT') && baseU.texts.includes('FALCONZORD') && baseU.draws.some(d => d.startsWith('power_rangers/falconzord/cells/')), 'B. Default ultimate: shared base Falconzord cells + title/subtitle', JSON.stringify(baseU))
  for (const [id, tag] of Object.entries(WANT)) {
    const T = GREEN_SKIN_TABLE.find(x => x.id === id)
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.greenRangerTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`) && !me.tint, `B. ${id}: applied (tag ${me.tag}), no runtime body tint`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 900-frame trace identical to Default (timing / geometry / damage / notes / ultimate)`, d === -1 ? '' : `frame ${d}\n${base.t[d]}\n${tr.t[d]}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    const U = await ULT(page, `${OUT}/${id}_ult.png`)
    ok(U.texts.includes('RANGER ZORD ASSAULT') && U.texts.includes(T.subtitle) && U.draws.includes('canvas') && U.cache > 0, `B. ${id}: ultimate shows "${T.subtitle}", Zord drawn from the tinted cache`, JSON.stringify({ texts: U.texts, n: U.draws.length, cache: U.cache }))
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); __harness.greenRangerTest.reset(); __harness.luffyTest.step(2) }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, subtitle: T.subtitle, zordCache: U.cache }
    await page.close()
  }
  for (const [a, b, same] of [['green_ranger_heatblast', 'green_ranger_limitless', false], ['green_ranger_ten_shadows', 'green_ranger_ten_shadows', true], ['default', 'default', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.greenRangerTest.raw(w); return { id: f.skinId, idle: (f._skinAnim || f.animationData)?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `C. same-skin mirror (${a}) → P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `C. ${a} vs ${b}: both own palettes`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` }); await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=green_ranger&p2=green_ranger`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'green_ranger_shrine', p2Skin: 'green_ranger_resonance', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'green_ranger_shrine' && restored.p1Skin === 'green_ranger_shrine' && restored.p2Skin === 'green_ranger_resonance', 'D. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing Green / Falconzord asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} catch (e) { fail++; console.log('FAIL exception', e.message.split('\n')[0]) }
finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
