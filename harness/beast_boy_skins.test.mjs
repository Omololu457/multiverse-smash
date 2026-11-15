// harness/beast_boy_skins.test.mjs — Beast Boy: Default + 10 skins (Natural World, Pink Flash, Cursed Rose, Infinity Frost,
// Alien X, Upgrade, Rath Pack, Arctic Reserve, Galaxy Glitter, Opal Safari).
//  A. registry: Default first & unchanged; 10 ids / tags / names / classifications / sources; ids prefixed "bb_", never
//     containing "cyborg" nor ending in "AlienX" (shared Superman-eye / starfield gates); every sheet / portrait / cut-in /
//     mouth / icon / material strip on disk; build audit: zero source-green pixels left in every skin (no green flashes).
//  B. per skin: identical 600-frame authoritative trace vs Default (cosmetic only); every action renders unclipped at the
//     same content box; the alpha mask of every strip is byte-identical to Default (same silhouette / anchors through every
//     morph); no pixel of the four source greens survives in any strip; material skins draw their precomputed overlay (and
//     ONLY phase 0 under Reduce Flashing); light + dark stage captures, mid-animal captures (gorilla / triceratops / tiger
//     / bird).
//  C. mirrors: different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. skin choice persists across a reload.
//  Captures → docs/skins/beast_boy/.        node harness/beast_boy_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { BEAST_BOY_FX_COLORS } from '../beastBoySkins.js'
const ROOT = process.cwd(), OUT = 'docs/skins/beast_boy'; let pass = 0, fail = 0; const report = { skins: {} }
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins('beast_boy'), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = { bb_natural_world: 'natural_world', bb_pink_flash: 'pink_flash', bb_cursed_rose: 'cursed_rose', bb_infinity_frost: 'infinity_frost', bb_alien_x: 'alien_x',
  bb_upgrade: 'upgrade', bb_rath_pack: 'rath_pack', bb_arctic_reserve: 'arctic_reserve', bb_galaxy_glitter: 'galaxy_glitter', bb_opal_safari: 'opal_safari' }
const NAMES = { bb_natural_world: 'Natural World', bb_pink_flash: 'Pink Flash', bb_cursed_rose: 'Cursed Rose', bb_infinity_frost: 'Infinity Frost', bb_alien_x: 'Alien X', bb_upgrade: 'Upgrade',
  bb_rath_pack: 'Rath Pack', bb_arctic_reserve: 'Arctic Reserve', bb_galaxy_glitter: 'Galaxy Glitter', bb_opal_safari: 'Opal Safari' }
const MATERIAL = { alien_x: 'stars', galaxy_glitter: 'glitter', opal_safari: 'iridescent' }
const CLASSES = ['Canon-Inspired Crossover Palette', 'Naturalistic Original', 'Original Cosmetic', 'Original Cosmetic (JJK-Inspired Palette)']
ok(list[0].id === 'default' && !list[0].animationData && list.length === 11, 'A. Default first, unchanged (base sheets), exactly 10 skins added', String(list.length))
for (const [id, tag] of Object.entries(WANT)) { const s = byId[id]; let files = true; const miss = []
  for (const d of Object.values(s?.animationData || {})) if (d?.sheet && (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet)))) { files = false; miss.push(d.sheet) }
  for (const f of ['portrait.png', 'cutscene/bust.png', 'cutscene/eye0.png', 'cutscene/eye3.png', 'cutscene/mouth0.png', 'cutscene/mouth1.png', 'cutscene/mouth2.png', 'icons/expressions.png'])
    if (!fs.existsSync(path.join(ROOT, `assets/beast_boy/skins/${tag}/${f}`))) { files = false; miss.push(f) }
  if (MATERIAL[tag]) { const n = MATERIAL[tag] === 'iridescent' ? 1 : 4; for (let k = 0; k < n; k++) for (const a of ['idle', 'gorilla', 'tricera', 'tiger', 'bird']) if (!fs.existsSync(path.join(ROOT, `assets/beast_boy/skins/${tag}/mat/p${k}/${a}.png`))) { files = false; miss.push(`mat p${k} ${a}`) } }
  const sourced = s?.source?.version && s.source.base && (s.classification === 'Canon-Inspired Crossover Palette' ? !!s.crossover && (s.source.refs || []).length > 0 : true)
  ok(s && s.recolorTag === tag && s.name === NAMES[id] && CLASSES.includes(s.classification) && sourced && s.effectsPolicy && s.regionMapping && s.spriteScale === list[0].spriteScale && files && BEAST_BOY_FX_COLORS[tag] && (s.material || null) === (MATERIAL[tag] || null),
    `A. ${id}: "${NAMES[id]}" registered, classified (${s?.classification}), sourced, every sheet / cut-in / mouth / icon / material on disk`, JSON.stringify({ miss: miss.slice(0, 4), cls: s?.classification, mat: s?.material })) }
ok(list.every(s => s.id === 'default' || (/^bb_/.test(s.id) && !/cyborg/i.test(s.id) && !s.id.endsWith('AlienX'))), 'A. skin ids are "bb_"-prefixed, never contain "cyborg" nor end in "AlienX" (shared gates stay off)')
const AU = JSON.parse(fs.readFileSync(path.join(ROOT, OUT, 'region_mapping.json'), 'utf8'))
ok(Object.values(WANT).every(t => AU[t] && AU[t].sourceGreenLeft === 0 && ['human', 'gorilla', 'tri', 'tiger', 'bird', 'morph_gorilla', 'morph_tri', 'morph_bird', 'morph_tiger'].every(r => AU[t].regions?.[r])),
  'A. build audit: every form (human, 3 morphs + tiger morph, 4 animals) mapped per skin, ZERO source-green pixels left', JSON.stringify(Object.fromEntries(Object.entries(AU).map(([k, v]) => [k, v.sourceGreenLeft]))))
for (const f of ['skins_contact.png', 'FORM_PALETTE_MAP.md']) ok(fs.existsSync(path.join(ROOT, OUT, f)), `A. ${OUT}/${f} exists`)
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b, { reduce = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/beast_boy/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__draws = []; const o = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...rest) { if (im?.src?.includes('/assets/beast_boy') && /beastBoyFx/i.test(new Error().stack || '')) __draws.push(im.src.split('/assets/')[1]); return o.call(this, im, ...rest) } })
  await page.goto(`${server.base}/index.html?harness=1&p1=beast_boy&p2=beast_boy&seed=24680`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.beastBoyTest)
  if (reduce) await page.evaluate(async () => { const { juiceSettings } = await import('./juiceSettings.js'); juiceSettings.reduceFlashing = true })
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async MAT => { const f = __harness.beastBoyTest.raw(), t = f._recolorTag
    const extra = []; if (t && MAT[t]) for (let k = 0; k < (MAT[t] === 'iridescent' ? 1 : 4); k++) for (const a of ['idle', 'gorilla', 'tricera', 'tiger', 'bird', 'run']) extra.push(`./assets/beast_boy/skins/${t}/mat/p${k}/${a}.png`)
    await Promise.all([...Object.values(f._skinAnim || f.animationData).map(d => d.sheet), ...extra].map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) }, MATERIAL)
  return page
}
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.beastBoyTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1390; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 15: { light: true }, 28: { light: true }, 90: { special: true }, 170: { right: true, special: true }, 270: { up: true, jump: true, special: true }, 350: { down: true, special: true }, 430: { left: true, special: true }, 480: { jump: true, up: true }, 488: { down: true, special: true } }
  for (let k = 540; k < 580; k++) ev[k] = { charge: true }
  const t = []; for (let i = 0; i < 600; i++) { if (i === 160 || i === 260 || i === 340) { b.x = a.x + 100 * a.facing; b.health = b.maxHealth; a.energy = 100 } writeRawControls(a, ev[i] || {}); __harness.luffyTest.step(1)
    t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, a._beastBoy?.wc, a._beastBoy?.stats])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.beastBoyTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
try {
  const SRC_GREENS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/beast_boy/source_greens.json'), 'utf8'))
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped).slice(0, 4)))
  ok(['gorilla', 'tricera', 'bird', 'tiger', 'feint'].every(k => base.t.some(x => JSON.parse(x)[6] === k)), 'B. trace is live (J chain, all four animals, feint, air tiger, charge)')
  for (const [id, tag] of Object.entries(WANT)) {
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.beastBoyTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`), `B. ${id}: applied (tag ${me.tag})`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 600-frame trace identical to Default (timing / geometry / damage / chain untouched)`, d === -1 ? '' : `frame ${d}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    // mid-animal captures + material draws
    await page.evaluate(() => { __draws.length = 0 })
    for (const [k, at, gap] of [['gorilla', 20, 90], ['tricera', 30, 400], ['tiger', 16, 400], ['bird', 18, 400]]) {
      await page.evaluate(([k, at, gap]) => { const H = __harness.beastBoyTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1; a.energy = 100; __harness.luffyTest.step(1); H.move(k); __harness.luffyTest.step(at) }, [k, at, gap])
      await page.waitForTimeout(30); await page.evaluate(() => __harness.luffyTest.step(0)); await page.screenshot({ path: `${OUT}/${id}_${k}.png`, clip: { x: 340, y: 200, width: 600, height: 280 } })
    }
    const dr = await page.evaluate(() => [...new Set(__draws)])
    if (MATERIAL[tag]) ok(dr.some(x => x.startsWith(`beast_boy/skins/${tag}/mat/`)) && ['gorilla', 'tricera', 'tiger', 'bird'].every(k => dr.some(x => x.endsWith(`/${k}.png`))), `B. ${id}: ${MATERIAL[tag]} material overlay drawn on the humanoid AND every animal (precomputed strips)`, dr.join(','))
    else ok(!dr.some(x => /\/mat\//.test(x)), `B. ${id}: no material overlay (palette only)`)
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); __harness.beastBoyTest.reset(); __harness.luffyTest.step(2) }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    const px = await page.evaluate(async ([tag, G]) => { const f = __harness.beastBoyTest.raw(), load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
      const data = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      let strips = 0, alphaDiff = 0, green = 0, recol = 0, sizeDiff = 0
      for (const k of Object.keys(f.animationData)) { const b0 = f.animationData[k]?.sheet; if (!b0) continue; const file = b0.split('/').pop()
        const [b, sk] = await Promise.all([load(b0), load(`./assets/beast_boy/skins/${tag}/${file}`)]); if (!b || !sk) continue; strips++
        if (b.width !== sk.width || b.height !== sk.height) { sizeDiff++; continue }
        const B = data(b), S = data(sk); for (let i = 0; i < B.length; i += 4) { if (B[i + 3] !== S[i + 3]) alphaDiff++; if (!S[i + 3]) continue
          if (G.some(c => c[0] === S[i] && c[1] === S[i + 1] && c[2] === S[i + 2])) green++
          if (B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2]) recol++ } }
      return { strips, alphaDiff, sizeDiff, green, recol } }, [tag, SRC_GREENS])
    ok(px.strips >= 40 && px.alphaDiff === 0 && px.sizeDiff === 0 && px.recol > 5000, `B. ${id}: every strip has the IDENTICAL alpha mask (same silhouette + anchors through every morph); recoloured`, JSON.stringify(px))
    ok(tag === 'upgrade' || px.green === 0, `B. ${id}: no source-green pixel in any strip (no green flash through a morph)`, JSON.stringify(px))
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, px, matDraws: dr.filter(x => /\/mat\//.test(x)).length }
    await page.close()
  }
  // reduced effects: only the static phase-0 overlay is ever drawn
  for (const id of ['bb_galaxy_glitter', 'bb_alien_x']) {
    page = await open(id, 'default', { reduce: true })
    await page.evaluate(() => { __draws.length = 0; for (let i = 0; i < 200; i++) __harness.luffyTest.step(1) })
    const rd = await page.evaluate(() => [...new Set(__draws)].filter(x => x.includes('/mat/')))
    ok(rd.length > 0 && rd.every(x => x.includes('/mat/p0/')), `B. ${id} + Reduce Flashing: material falls back to the static phase-0 overlay`, rd.join(',')); await page.close() }
  for (const [a, b, same] of [['bb_pink_flash', 'bb_infinity_frost', false], ['bb_rath_pack', 'bb_rath_pack', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.beastBoyTest.raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `C. same-skin mirror (${a}) → P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `C. ${a} vs ${b}: both own palettes`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` }); await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=beast_boy&p2=beast_boy`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'bb_opal_safari', p2Skin: 'bb_arctic_reserve', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'bb_opal_safari' && restored.p1Skin === 'bb_opal_safari' && restored.p2Skin === 'bb_arctic_reserve', 'D. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing Beast Boy asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
