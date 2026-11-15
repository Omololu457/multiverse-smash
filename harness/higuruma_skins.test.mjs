// harness/higuruma_skins.test.mjs — Hiromi Higuruma: Default + 10 skins (Midnight Counsel, White-Collar Verdict, Crimson
// Prosecutor, Gotham Counsel, Devil's Advocate, Limitless Litigation, Cursed Rose, Alien X — Cosmic Court, Upgrade — Digital
// Justice, Gilded Final Appeal). Adapted from robin_skins.test.mjs.
//  A. registry: Default first & unchanged; 10 ids / tags / names / classifications; every strip / portrait / material phase
//     on disk; ids never contain "cyborg" nor end in "AlienX"; build audit (region pixel counts) present.
//  B. per skin: identical 500-frame authoritative trace vs Default (cosmetic only); every action renders at the same content
//     box; natural skin pixels byte-identical to Default in every strip (costume recoloured); material skins draw their
//     precomputed overlay; light + dark stage captures.
//  C. Reduce Flashing → static phase-0 material. D. mirrors: different skins keep palettes; same skin → P2 wash.
//  E. skin choice persists across a reload.        node harness/higuruma_skins.test.mjs     → docs/skins/higuruma/
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { HIGURUMA_FX_COLORS } from '../higurumaSkins.js'
const ROOT = process.cwd(), OUT = 'docs/skins/higuruma'; let pass = 0, fail = 0; const report = { skins: {} }
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins('higuruma'), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = { hg_midnight_counsel: ['midnight_counsel', 'Midnight Counsel'], hg_white_collar_verdict: ['white_collar_verdict', 'White-Collar Verdict'],
  hg_crimson_prosecutor: ['crimson_prosecutor', 'Crimson Prosecutor'], hg_gotham_counsel: ['gotham_counsel', 'Gotham Counsel'], hg_devils_advocate: ['devils_advocate', "Devil's Advocate"],
  hg_limitless_litigation: ['limitless_litigation', 'Limitless Litigation'], hg_cursed_rose: ['cursed_rose', 'Cursed Rose'], hg_alien_x_cosmic_court: ['cosmic_court', 'Alien X — Cosmic Court'],
  hg_upgrade_digital_justice: ['digital_justice', 'Upgrade — Digital Justice'], hg_gilded_final_appeal: ['gilded_final_appeal', 'Gilded Final Appeal'] }
const MATERIAL = { cosmic_court: 'stars', digital_justice: 'circuit', gilded_final_appeal: 'glitter' }
const INSPIRED = new Set(['gotham_counsel', 'devils_advocate', 'limitless_litigation', 'cosmic_court', 'digital_justice'])
ok(list[0].id === 'default' && !list[0].animationData && list.length === 11, 'A. Default first, unchanged (base sheets), exactly 10 skins added', String(list.length))
for (const [id, [tag, name]] of Object.entries(WANT)) { const s = byId[id]; let files = true; const miss = []
  for (const d of Object.values(s?.animationData || {})) if (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet))) { files = false; miss.push(d.sheet) }
  for (const f of ['portrait.png', 'portrait_full.png']) if (!fs.existsSync(path.join(ROOT, `assets/higuruma/skins/${tag}/${f}`))) { files = false; miss.push(f) }
  if (MATERIAL[tag]) for (let k = 0; k < 4; k++) for (const st of ['idle', 'heavy', 'ultSword']) if (!fs.existsSync(path.join(ROOT, `assets/higuruma/skins/${tag}/mat/p${k}/${st}.png`))) { files = false; miss.push(`mat p${k} ${st}`) }
  const cls = INSPIRED.has(tag) ? !!s?.inspired && !!s.crossover && /inspired/i.test(s.classification) : !s?.inspired && !s?.crossover
  ok(s && s.recolorTag === tag && s.name === name && cls && s.source?.inspiration && s.effectsPolicy && s.regionMapping && s.spriteScale === list[0].spriteScale && files && HIGURUMA_FX_COLORS[tag] && (s.material || null) === (MATERIAL[tag] || null),
    `A. ${id}: "${name}" registered, classified, sourced, every strip / portrait / material on disk`, JSON.stringify({ miss: miss.slice(0, 4), cls: s?.classification, mat: s?.material, name: s?.name })) }
ok(list.every(s => !/cyborg/i.test(s.id) && (s.id === 'default' || s.id.startsWith('hg_')) && !s.id.endsWith('AlienX')), 'A. no skin id contains "cyborg" or ends in "AlienX" (shared Superman-eye / starfield gates stay off)')
const RM = JSON.parse(fs.readFileSync(path.join(ROOT, OUT, 'region_mapping.json'), 'utf8'))
ok(Object.keys(WANT).every(id => { const p = RM.skins?.[id]?.pixels; return p && ['suit0', 'suit1', 'suit2', 'shirt', 'tie', 'wood', 'metal', 'sword', 'fx'].every(k => p[k] > 0) }) && RM.regions?.never?.skin?.length > 0,
  'A. build audit: every costume / weapon region recoloured in every skin; skin, eyes and outline listed as never-recoloured', JSON.stringify(RM.skins?.hg_midnight_counsel))
ok(fs.existsSync(path.join(ROOT, 'docs/higuruma/skins_contact.png')), 'A. docs/higuruma/skins_contact.png exists')
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b, { reduce = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/higuruma/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__draws = []; const o = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...rest) { if (im?.src?.includes('/assets/higuruma')) __draws.push(im.src.split('/assets/')[1]); return o.call(this, im, ...rest) } })
  await page.goto(`${server.base}/index.html?harness=1&p1=higuruma&p2=higuruma&seed=24680`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.higurumaTest)
  if (reduce) await page.evaluate(async () => { const { juiceSettings } = await import('./juiceSettings.js'); juiceSettings.reduceFlashing = true })
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async MAT => { const f = __harness.higurumaTest.raw(), t = f._recolorTag, srcs = Object.values(f._skinAnim || f.animationData).map(d => d.sheet)
    if (t && MAT[t]) for (const d of Object.values(f._skinAnim)) for (let k = 0; k < 4; k++) srcs.push(`./assets/higuruma/skins/${t}/mat/p${k}/${d.sheet.split('/').pop()}`)
    await Promise.all(srcs.map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) }, MATERIAL)
  return page
}
// a fixed input script: chain, giant, lash, every special, jumps, ultimate
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.higurumaTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1380; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 15: { light: true }, 28: { light: true }, 80: { heavy: true }, 150: { right: true, heavy: true }, 200: { special: true }, 250: { right: true, special: true },
    320: { up: true, jump: true, special: true }, 380: { down: true, special: true }, 450: { left: true, special: true }, 455: {}, 470: { jump: true, up: true }, 480: { jump: true, up: true }, 492: { light: true } }
  const t = []; for (let i = 0; i < 500; i++) { if (i === 440) a.energy = 100; writeRawControls(a, ev[i] || {}); __harness.luffyTest.step(1)
    t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, a._higuruma?.caseFile, a._higuruma?.token, a._higuruma?.stats])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.higurumaTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
const SKIN_RGB = RM.regions.never.skin
try {
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped).slice(0, 4)))
  const names = new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean)); ok(names.size >= 8, 'B. trace is live (chain, giant, lash, every special, air)', [...names].join(','))
  for (const [id, [tag]] of Object.entries(WANT)) {
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.higurumaTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`), `B. ${id}: applied (tag ${me.tag})`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 500-frame trace identical to Default (timing / geometry / damage / Case File untouched)`, d === -1 ? '' : `frame ${d}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    await page.evaluate(() => { const H = __harness.higurumaTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1700; a.energy = 100; __draws.length = 0; __harness.luffyTest.step(1); H.move('heavy'); for (let i = 0; i < 24; i++) __harness.luffyTest.step(1) })
    await page.screenshot({ path: `${OUT}/${id}_giant.png` })
    const dr = await page.evaluate(() => [...new Set(__draws)])
    ok(dr.some(x => x.startsWith(`higuruma/skins/${tag}/heavy`)) && !dr.some(x => /^higuruma\/heavy\.png/.test(x)), `B. ${id}: giant gavel drawn from the skin's own strip`, dr.slice(0, 6).join(','))
    if (MATERIAL[tag]) ok(dr.some(x => x.startsWith(`higuruma/skins/${tag}/mat/`)), `B. ${id}: ${MATERIAL[tag]} material overlay drawn (precomputed strip)`, dr.filter(x => /mat\//.test(x)).join(','))
    else ok(!dr.some(x => /\/mat\//.test(x)), `B. ${id}: no material overlay (palette only)`)
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); __harness.higurumaTest.reset(); __harness.luffyTest.step(2) }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    const kept = await page.evaluate(async ([tag, SKIN]) => { const f = __harness.higurumaTest.raw(), load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
      const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      let skin = 0, changed = 0, strips = 0, recol = 0
      for (const k of Object.keys(f.animationData)) { const b0 = f.animationData[k]?.sheet; if (!b0) continue; const file = b0.split('/').pop()
        const [b, sk] = await Promise.all([load(b0), load(`./assets/higuruma/skins/${tag}/${file}`)]); if (!b || !sk) continue; strips++
        const B = px(b), S = px(sk); for (let i = 0; i < B.length; i += 4) { if (!B[i + 3]) continue
          if (SKIN.some(c => c[0] === B[i] && c[1] === B[i + 1] && c[2] === B[i + 2])) { skin++; if (B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2] || B[i + 3] !== S[i + 3]) changed++ }
          else if (B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2]) recol++ } }
      return { strips, skin, changed, recol } }, [tag, SKIN_RGB])
    ok(kept.strips >= 39 && kept.skin > 1000 && kept.changed === 0 && kept.recol > 1000, `B. ${id}: natural skin pixels identical to Default in every strip (costume recoloured)`, JSON.stringify(kept))
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, kept }
    await page.close()
  }
  page = await open('hg_gilded_final_appeal', 'default', { reduce: true })
  await page.evaluate(() => { __draws.length = 0; for (let i = 0; i < 200; i++) __harness.luffyTest.step(1) })
  const rd = await page.evaluate(() => [...new Set(__draws)].filter(x => x.includes('/mat/')))
  ok(rd.length > 0 && rd.every(x => x.includes('/mat/p0/')), 'C. Reduce Flashing: material falls back to the static phase-0 overlay', rd.join(',')); await page.close()
  for (const [a, b, same] of [['hg_crimson_prosecutor', 'hg_limitless_litigation', false], ['hg_cursed_rose', 'hg_cursed_rose', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.higurumaTest.raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `D. same-skin mirror (${a}) → P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `D. ${a} vs ${b}: both own palettes, no wash`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` }); await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=higuruma&p2=higuruma`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'hg_white_collar_verdict', p2Skin: 'hg_alien_x_cosmic_court', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'hg_white_collar_verdict' && restored.p1Skin === 'hg_white_collar_verdict' && restored.p2Skin === 'hg_alien_x_cosmic_court', 'E. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing Higuruma asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
