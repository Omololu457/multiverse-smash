// harness/megumi_skins.test.mjs — Megumi: Default + 10 skins (Natural Shadows, Cursed Rose, Infinity Frost, Alien X — Ten
// Constellations, Upgrade — Shadow Circuit, Ghostfreak — Pale Procession, Eclipse Gold, Abyssal Aquarium, Sakura After
// Dark, Opal Menagerie).
//  A. registry: Default first & unchanged; 10 ids / tags / names / classifications + source fields; ids never contain
//     "cyborg" nor end in "AlienX"; every strip + portrait on disk; alpha identical to Default; region audit present.
//  B. per skin: identical 600-frame authoritative trace vs Default (cosmetic only); every action renders unclipped with the
//     same content box; warm skin-tone pixels byte-identical to Default; uniform recoloured; summon strips untouched;
//     light + dark stage captures.
//  C. mirrors: different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. skin choice persists across a reload.
//  Captures → docs/skins/megumi/.        node harness/megumi_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { MEGUMI_FX_COLORS } from '../megumiSkins.js'
const ROOT = process.cwd(), OUT = 'docs/skins/megumi', KEY = 'megumi_fushiguro'; let pass = 0, fail = 0; const report = { skins: {} }
fs.mkdirSync(OUT, { recursive: true })
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins(KEY).filter(s => s.classification !== 'Creative'), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = { mg_natural_shadows: ['natural_shadows', 'Natural Shadows', false], mg_cursed_rose: ['cursed_rose', 'Cursed Rose', false],
  mg_infinity_frost: ['infinity_frost', 'Infinity Frost', true], mg_ten_constellations: ['ten_constellations', 'Alien X — Ten Constellations', true],
  mg_shadow_circuit: ['shadow_circuit', 'Upgrade — Shadow Circuit', true], mg_pale_procession: ['pale_procession', 'Ghostfreak — Pale Procession', true],
  mg_eclipse_gold: ['eclipse_gold', 'Eclipse Gold', false], mg_abyssal_aquarium: ['abyssal_aquarium', 'Abyssal Aquarium', false],
  mg_sakura_after_dark: ['sakura_after_dark', 'Sakura After Dark', false], mg_opal_menagerie: ['opal_menagerie', 'Opal Menagerie', false] }
ok(list[0].id === 'default' && !list[0].animationData && list.length === 11, 'A. Default first, unchanged (base sheets), exactly 10 skins added', String(list.length))
for (const [id, [tag, name, inspired]] of Object.entries(WANT)) { const s = byId[id]; const miss = []
  for (const d of Object.values(s?.animationData || {})) if (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet))) miss.push(d.sheet)
  if (!fs.existsSync(path.join(ROOT, `assets/megumi_fushiguro/skins/${tag}/portrait.png`))) miss.push('portrait')
  const cls = !!s?.classification && (inspired ? s.inspired && !!s.crossover && /inspired/i.test(s.classification) : !s.inspired && !s.crossover) && !!s?.source?.inspiration
  ok(s && s.recolorTag === tag && s.name === name && cls && s.effectsPolicy && s.regionMapping && s.spriteScale === list[0].spriteScale && !miss.length && MEGUMI_FX_COLORS[tag],
    `A. ${id}: "${name}" registered, classified (${inspired ? 'crossover-inspired' : 'original'}), sourced, every strip + portrait on disk`, JSON.stringify({ miss: miss.slice(0, 4), cls: s?.classification })) }
ok(list.every(s => !/cyborg/i.test(s.id) && (s.id === 'default' || s.id.startsWith('mg_')) && !s.id.endsWith('AlienX')), 'A. no skin id contains "cyborg" or ends in "AlienX" (shared Superman-eye / starfield gates stay off)')
const RM = JSON.parse(fs.readFileSync(path.join(ROOT, OUT, 'region_mapping.json'), 'utf8')), idleR = RM.pixelsPerRegion?.['idle.png'] || {}
ok(idleR.hair > 0 && idleR.uniform > 0 && idleR.skin > 0 && idleR.outline > 0 && RM.pixelsPerRegion['win.png']?.summon > 0, 'A. region audit: idle separates hair / uniform / skin / outline; win pose keeps Nue as an un-recoloured summon region', JSON.stringify(idleR))
ok(fs.existsSync(path.join(ROOT, 'docs/megumi/skins_contact.png')), 'A. docs/megumi/skins_contact.png exists')
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/megumi/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__draws = []; const o = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...rest) { if (im?.src?.includes('/assets/megumi')) __draws.push(im.src.split('/assets/')[1]); return o.call(this, im, ...rest) } })
  await page.goto(`${server.base}/index.html?harness=1&p1=${KEY}&p2=${KEY}&seed=24680`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.megumiTest)
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async () => { const f = __harness.megumiTest.raw()
    await Promise.all(Object.values(f._skinAnim || f.animationData).map(d => d.sheet).map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) })
  return page
}
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.megumiTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1420; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 15: { light: true }, 28: { light: true }, 90: { special: true }, 170: { right: true, special: true }, 250: { down: true, special: true }, 330: { up: true, jump: true, special: true },
    410: { left: true, special: true }, 500: { charge: true, right: true }, 501: { charge: true, right: true }, 540: { jump: true, up: true }, 556: { jump: true, up: true } }
  const t = []; for (let i = 0; i < 600; i++) { writeRawControls(a, ev[i] || {}); if (i === 160 || i === 240 || i === 400) a.energy = 100; __harness.luffyTest.step(1)
    t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, a._megumi?.summon, a._megumi?.route, a._megumi?.stats])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.megumiTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
try {
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped).slice(0, 4)))
  ok(new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean)).size >= 7, 'B. trace is live (chain, Dog, Toad, Rabbit, Nue, Serpent, Shadow Step, jumps)', JSON.stringify([...new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean))]))
  for (const [id, [tag]] of Object.entries(WANT)) {
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.megumiTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`), `B. ${id}: applied (tag ${me.tag})`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 600-frame trace identical to Default (timing / geometry / damage / summons untouched)`, d === -1 ? '' : `frame ${d}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    await page.evaluate(() => { const H = __harness.megumiTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1700; a.energy = 100; __draws.length = 0; __harness.luffyTest.step(1); H.move('mDog'); __harness.luffyTest.step(20) })
    await page.screenshot({ path: `${OUT}/${id}_dog.png` })
    const dr = await page.evaluate(() => [...new Set(__draws)])
    ok(dr.some(x => x.startsWith('megumi_fushiguro/summons/dog')) && !dr.some(x => x.includes(`/skins/`) && x.includes('/summons/')), `B. ${id}: shikigami drawn from the shared (un-reskinned) summon strips`, dr.join(','))
    await page.evaluate(() => __harness.luffyTest.step(40))
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); __harness.megumiTest.reset(); __harness.luffyTest.step(2) }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    const kept = await page.evaluate(async tag => { const f = __harness.megumiTest.raw(), load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
      const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      let warm = 0, changed = 0, strips = 0, recol = 0, alpha = 0; const seen = new Set()
      for (const k of Object.keys(f.animationData)) { const b0 = f.animationData[k]?.sheet; if (!b0 || seen.has(b0)) continue; seen.add(b0); const file = b0.split('/').pop()
        const [b, sk] = await Promise.all([load(b0), load(`./assets/megumi_fushiguro/skins/${tag}/${file}`)]); if (!b || !sk) continue; strips++
        const B = px(b), S = px(sk); for (let i = 0; i < B.length; i += 4) { if (B[i + 3] !== S[i + 3]) alpha++; if (!B[i + 3]) continue
          if (B[i] >= 120 && B[i] - B[i + 2] >= 45 && B[i + 1] >= 70) { warm++; if (B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2]) changed++ }
          else if (B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2]) recol++ } }
      return { strips, warm, changed, recol, alpha } }, tag)
    ok(kept.strips >= 40 && kept.warm > 1000 && kept.changed === 0 && kept.recol > 5000 && kept.alpha === 0, `B. ${id}: skin-tone pixels identical, alpha identical, costume recoloured`, JSON.stringify(kept))
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, kept }
    await page.close()
  }
  for (const [a, b, same] of [['mg_cursed_rose', 'mg_infinity_frost', false], ['mg_eclipse_gold', 'mg_eclipse_gold', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.megumiTest.raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `C. same-skin mirror (${a}) → P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `C. ${a} vs ${b}: both own palettes`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` }); await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=${KEY}&p2=${KEY}`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'mg_abyssal_aquarium', p2Skin: 'mg_ten_constellations', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'mg_abyssal_aquarium' && restored.p1Skin === 'mg_abyssal_aquarium' && restored.p2Skin === 'mg_ten_constellations', 'D. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing Megumi asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
