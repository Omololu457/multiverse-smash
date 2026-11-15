// harness/spd_yellow_skins.test.mjs — S.P.D. Yellow: Default + 8 cosmetic skins (6 Inspired Palettes + 2 Original Cosmetics).
//  A. registry: Default first & unchanged, 8 ids/tags/classes/sources, no id ends "AlienX" (shared starfield would float
//     stars off-body), every sheet + portrait on disk, FX colours/material defined, no recoloured Megazord / coin art.
//  B. per skin: identical 600-frame authoritative trace vs Default (cosmetic only); every action renders unclipped with the
//     same content box; the DUPLICATE is drawn in the skin; the Ninja Megazord is drawn from base cells only; outline /
//     weapons / gloves / beams (mask regions 1, 4, 5) byte-identical to Default in every strip; materials draw only for
//     material skins and freeze under reduce-motion; light + dark stage captures.
//  C. mirrors: different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. skin choice persists across a reload.
//  Captures -> docs/skins/spd_yellow/.        node harness/spd_yellow_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { SPD_YELLOW_FX } from '../spdYellowSkins.js'
const ROOT = process.cwd(), OUT = 'docs/skins/spd_yellow'; let pass = 0, fail = 0; const report = { skins: {} }
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins('spd_yellow'), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = { spd_yellow_inspired_alienx: 'alienx', spd_yellow_inspired_upgrade: 'upgrade', spd_yellow_inspired_diamondhead: 'diamondhead', spd_yellow_inspired_heatblast: 'heatblast',
  spd_yellow_inspired_chromastone: 'chromastone', spd_yellow_inspired_bigchill: 'bigchill', spd_yellow_starlight: 'starlight', spd_yellow_opal: 'opal' }
ok(list[0].id === 'default' && !list[0].animationData && list.length === 9, 'A. Default first, unchanged (base sheets), exactly 8 skins added', String(list.length))
for (const [id, tag] of Object.entries(WANT)) { const s = byId[id]; let files = true
  for (const d of Object.values(s?.animationData || {})) if (d?.sheet && (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet)))) files = false
  if (!fs.existsSync(path.join(ROOT, `assets/spd_yellow/skins/${tag}/portrait.png`))) files = false
  const cls = tag === 'starlight' || tag === 'opal' ? 'Original Cosmetic' : 'Inspired Palette'
  ok(s && s.recolorTag === tag && s.classification === cls && s.effectsPolicy && s.regionMapping && s.source?.version && s.spriteScale === list[0].spriteScale && files && SPD_YELLOW_FX[tag], `A. ${id}: registered (${cls}), sourced, all sheets on disk, FX defined`) }
ok(!list.some(s => s.id.endsWith('AlienX')), 'A. no id ends "AlienX" (her Alien X uses its own suit-masked star material)')
ok(!fs.existsSync(path.join(ROOT, 'assets/power_rangers/ninja_megazord/skins')) && !fs.existsSync(path.join(ROOT, 'assets/spd_yellow/skins/alienx/coins')), 'A. no recoloured Megazord or coin art exists')
const MATS = Object.entries(WANT).filter(([, t]) => SPD_YELLOW_FX[t].material).map(([i]) => i)
ok(MATS.length === 5, 'A. five skins carry a decorative material (alienx/diamondhead/chromastone/starlight/opal)', MATS.join(','))
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/(spd_yellow|power_rangers)/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__draws = []; window.__marks = 0; const o = CanvasRenderingContext2D.prototype.drawImage, fr = CanvasRenderingContext2D.prototype.fillRect
    CanvasRenderingContext2D.prototype.fillRect = function (...r) { if (/drawBodyMaterial|drawMaterial/.test(new Error().stack || '')) __marks++; return fr.apply(this, r) }
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...r) { if (im?.src?.includes('/assets/') && /spdYellowFx/.test(new Error().stack || '')) __draws.push(im.src.split('/assets/')[1]); return o.call(this, im, ...r) } })
  await page.goto(`${server.base}/index.html?harness=1&p1=spd_yellow&p2=spd_yellow&seed=24680`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.spdYellowTest)
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready); await page.waitForTimeout(150)   // first Yellow draw requested every Megazord / FX image; let them decode
  await page.evaluate(async () => { const f = __harness.spdYellowTest.raw(); const { NINJA_CELLS } = await import('./ninjaMegazordSprites.js')
    await Promise.all([...Object.values(f._skinAnim || f.animationData).map(d => d?.sheet).filter(Boolean), ...Object.values(NINJA_CELLS).map(c => c.src)].map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) })
  return page
}
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.spdYellowTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 14: { light: true }, 26: { light: true }, 90: { down: true, special: true }, 140: { special: true }, 200: { left: true, special: true }, 260: { up: true, special: true }, 360: { right: true, heavy: true }, 430: { charge: true, special: true }, 436: { block: true }, 480: { right: true }, 484: { right: true } }
  const t = []; for (let i = 0; i < 600; i++) { writeRawControls(a, ev[i] || (i >= 140 && i < 172 ? { special: true } : {})); __harness.luffyTest.step(1)
    t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, a._falcon?.pips, a._falcon?.sortie?.age, a._spdYellow?.coins, a._spdYellow?.clone, a._ranger?.charges])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.spdYellowTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
try {
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped)))
  ok(new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean)).size >= 6, 'B. trace is live (chains, gun, clone, swap, call)', JSON.stringify([...new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean))]))
  for (const [id, tag] of Object.entries(WANT)) {
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.spdYellowTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`), `B. ${id}: applied (tag ${me.tag})`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 600-frame trace identical to Default (timing/geometry/damage untouched)`, d === -1 ? '' : `frame ${d}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    // duplicate + Intercept on screen together
    await page.evaluate(() => { const H = __harness.spdYellowTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.energy = 100; b.energy = 100; __harness.luffyTest.step(1)
      window.__dbg = [H.move('yClone')]; __harness.luffyTest.step(32); a.energy = 100; window.__dbg.push(H.move('yCall', 'p1', { kind: 'yIntercept' }), JSON.stringify(H.state().hud), a._spdYellow?.rejectWhy, a.hitstun, a.attacking, a.currentAttack?.name); __harness.luffyTest.step(14); window.__dbg.push(a._falcon?.sortie?.kind); __draws.length = 0; __marks = 0; __harness.luffyTest.step(10) })
    await page.screenshot({ path: `${OUT}/${id}_clone_zord.png` }); const clk0 = await page.evaluate(() => __harness.spdYellowTest.raw()._spdYellow?.clock); await page.evaluate(() => { for (let i = 0; i < 90; i++) __harness.luffyTest.step(1) })   // render EVERY frame (step(n) renders once); Diamondhead's facet glint runs every 90 f
    const clk1 = await page.evaluate(() => __harness.spdYellowTest.raw()._spdYellow?.clock)
    const dr = await page.evaluate(() => [...new Set(__draws)]), marks = await page.evaluate(() => __marks)
    const zord = dr.filter(x => x.includes('ninja_megazord'))
    ok(dr.some(x => x.includes(`spd_yellow/skins/${tag}/`)), `B. ${id}: duplicate drawn in the skin`, dr.join(','))
    ok(zord.length > 0 && zord.every(x => x.startsWith('power_rangers/ninja_megazord/cells/')), `B. ${id}: Ninja Megazord drawn from base cells only`, zord.join(',') + ' dbg ' + JSON.stringify(await page.evaluate(() => window.__dbg)))
    const mat = SPD_YELLOW_FX[tag].material
    ok(mat ? marks > 0 : marks === 0, `B. ${id}: material ${mat || 'none'} -> ${marks} marks`, JSON.stringify({ marks, clk0, clk1 }))
    if (mat) { const calm = await page.evaluate(async () => { const { juiceSettings } = await import('./juiceSettings.js').catch(() => ({})); if (!juiceSettings) return null; const was = juiceSettings.reduceMotion; juiceSettings.reduceMotion = true
        const snap = []; for (let i = 0; i < 2; i++) { __marks = 0; for (let k = 0; k < 7; k++) __harness.luffyTest.step(1); snap.push(__marks) } juiceSettings.reduceMotion = was; return snap })
      report.skins[id + '_calm'] = calm; ok(calm == null || (calm[0] > 0 && calm[0] === calm[1]), `B. ${id}: reduce-motion fallback = static marks`, JSON.stringify(calm)) }
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); __harness.spdYellowTest.reset(); __harness.luffyTest.step(2) }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    const kept = await page.evaluate(async tag => { const f = __harness.spdYellowTest.raw(), load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
      const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      let keptPx = 0, changed = 0, suit = 0, suitChanged = 0, strips = 0
      for (const k of Object.keys(f.animationData)) { const base = f.animationData[k]?.sheet; if (!base) continue; const file = base.split('/').pop()
        const [b, sk, m] = await Promise.all([load(base), load(`./assets/spd_yellow/skins/${tag}/${file}`), load(`./assets/spd_yellow/skins/masks/${file}`)]); if (!b || !sk || !m) continue; strips++
        const B = px(b), S = px(sk), M = px(m); for (let i = 0; i < M.length; i += 4) { const r = Math.round(M[i] / 50); const diff = B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2] || B[i + 3] !== S[i + 3]
          if (r === 1 || r === 4 || r === 5) { keptPx++; if (diff) changed++ } else if (r === 2) { suit++; if (diff) suitChanged++ }
          if (B[i + 3] !== S[i + 3]) changed++ } }
      return { strips, keptPx, changed, suit, suitChanged } }, tag)
    ok(kept.strips > 30 && kept.keptPx > 0 && kept.changed === 0 && kept.suitChanged > kept.suit * 0.5, `B. ${id}: outline/weapons/gloves/beams + alpha identical, suit recoloured`, JSON.stringify(kept))
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, megazordCells: zord.length, materialMarks: marks, kept }
    await page.close()
  }
  for (const [a, b, same] of [['spd_yellow_inspired_heatblast', 'spd_yellow_starlight', false], ['spd_yellow_opal', 'spd_yellow_opal', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.spdYellowTest.raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `C. same-skin mirror (${a}) -> P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `C. ${a} vs ${b}: both own palettes`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` }); await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=spd_yellow&p2=spd_yellow`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'spd_yellow_starlight', p2Skin: 'spd_yellow_inspired_bigchill', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'spd_yellow_starlight' && restored.p1Skin === 'spd_yellow_starlight' && restored.p2Skin === 'spd_yellow_inspired_bigchill', 'D. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing S.P.D. Yellow / Megazord asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
