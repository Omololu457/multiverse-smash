// harness/starfire_skins.test.mjs — Starfire: Default + 10 skins (Blackfire-Inspired — Dark Sister, Alien X — Celestial
// Princess, Chromastone — Prism Heart, Upgrade — Living Circuit, Ghostfreak — Spectral Star, Pink Nova, Infinity Sky,
// Solar Empress, Aurora Glitter, Opal Supernova). Adapted from raven_skins.test.mjs; adds the eye-laser origin trace.
//  A. registry: Default first & unchanged; 10 ids / tags / names / classifications / research + source fields; ids never
//     contain "cyborg" nor end in "AlienX"; every sheet / fx / portrait / cut-in / icon / material strip on disk; build
//     audit: skin + outline pixels asserted unchanged.
//  B. per skin: identical 600-frame authoritative trace vs Default (cosmetic only); every action renders unclipped at the
//     same content box; her skin pixels byte-identical to Default in every strip; ball / explosion / laser art drawn from the
//     skin's own strips; the Star Sight beam origins are identical (eye geometry preserved); material skins draw their precomputed overlay (and ONLY phase 0 under Reduce Flashing);
//     light + dark stage captures.
//  C. mirrors: different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. skin choice persists across a reload.
//  Captures → docs/skins/starfire/.        node harness/starfire_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { STARFIRE_FX_COLORS } from '../starfireSkins.js'
const ROOT = process.cwd(), OUT = 'docs/skins/starfire'; let pass = 0, fail = 0; const report = { skins: {} }
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins('starfire'), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = { sf_dark_sister: ['darksister', 'Blackfire-Inspired — Dark Sister'], sf_alien_x_celestial: ['celestial', 'Alien X — Celestial Princess'],
  sf_prism_heart: ['prism', 'Chromastone — Prism Heart'], sf_living_circuit: ['circuit', 'Upgrade — Living Circuit'], sf_spectral_star: ['spectral', 'Ghostfreak — Spectral Star'],
  sf_pink_nova: ['pinknova', 'Pink Nova'], sf_infinity_sky: ['infinity', 'Infinity Sky'], sf_solar_empress: ['solar', 'Solar Empress'], sf_aurora_glitter: ['aurora', 'Aurora Glitter'],
  sf_opal_supernova: ['opal', 'Opal Supernova'] }
const MATERIAL = { celestial: 'stars', prism: 'iridescent', circuit: 'glitter', aurora: 'glitter', opal: 'iridescent' }
ok(list[0].id === 'default' && !list[0].animationData && list.length === 11, 'A. Default first, unchanged (base sheets), exactly 10 skins added', String(list.length))
for (const [id, [tag, name]] of Object.entries(WANT)) { const s = byId[id]; let files = true; const miss = []
  for (const d of Object.values(s?.animationData || {})) if (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet))) { files = false; miss.push(d.sheet) }
  for (const f of ['portrait.png', 'fx/ball_strip.png', 'fx/explosion_strip.png', 'fx/laser_cap0.png', 'fx/laser_cap1.png', 'fx/laser_body0.png', 'fx/laser_body1.png', 'cutscene/bust.png', 'cutscene/eye0.png', 'cutscene/eye1.png', 'cutscene/mouth0.png', 'cutscene/mouth1.png', 'cutscene/mouth2.png', 'icons/expressions.png'])
    if (!fs.existsSync(path.join(ROOT, `assets/starfire/skins/${tag}/${f}`))) { files = false; miss.push(f) }
  if (MATERIAL[tag]) { const n = MATERIAL[tag] === 'iridescent' ? 1 : 4; for (let k = 0; k < n; k++) if (!fs.existsSync(path.join(ROOT, `assets/starfire/skins/${tag}/mat/p${k}/idle.png`))) { files = false; miss.push('mat p' + k) } }
  const official = (s?.classification === 'Crossover-Inspired Palette' ? !!s.source?.url && !!s.crossover : s?.classification === 'Original' ? !s.crossover : !!s.source?.url) && !!s?.research && !!s?.source?.inspiration && !!s?.notes
  ok(s && s.recolorTag === tag && s.name === name && official && s.effectsPolicy && s.regionMapping && s.source?.version && s.spriteScale === list[0].spriteScale && files && STARFIRE_FX_COLORS[tag] && (s.material || null) === (MATERIAL[tag] || null),
    `A. ${id}: "${name}" registered, classified, sourced, every sheet / fx / cut-in / icon / material on disk`, JSON.stringify({ miss: miss.slice(0, 4), cls: s?.classification, mat: s?.material })) }
ok(list.every(s => !/cyborg/i.test(s.id) && (s.id === 'default' || s.id.startsWith('sf_')) && !s.id.endsWith('AlienX')), 'A. no skin id contains "cyborg" or ends in "AlienX" (shared Superman-eye / starfield gates stay off)')
const RM = JSON.parse(fs.readFileSync(path.join(ROOT, OUT, 'region_mapping.json'), 'utf8')), AU = RM.audit || RM
ok(Object.keys(WANT).every(id => { const a = AU[WANT[id][0]]; return a && a.skinPixels > 0 && a.outlinePixels > 0 && a.eyePixels > 0 && a.recoloured > 0 && (!MATERIAL[WANT[id][0]] || a.materialPixels > 0) }), 'A. build audit: skin + outline pixels asserted unchanged, eye mask located (eye geometry fixed), regions recoloured, materials written (every skin)', JSON.stringify(Object.keys(AU)))
ok(fs.existsSync(path.join(ROOT, OUT, 'skins_contact.png')) && fs.existsSync(path.join(ROOT, 'docs/starfire/skins_contact.png')), 'A. docs/skins/starfire/skins_contact.png + docs/starfire/skins_contact.png exist')
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b, { reduce = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/starfire/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(r => { window.requestAnimationFrame = () => 0; window.__draws = []; const o = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...rest) { if (im?.src?.includes('/assets/starfire') && /starfireFx|combat|game|abilities|projectile/i.test(new Error().stack || '')) __draws.push(im.src.split('/assets/')[1]); return o.call(this, im, ...rest) } }, reduce)
  await page.goto(`${server.base}/index.html?harness=1&p1=starfire&p2=starfire&seed=24680`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.starfireTest)
  if (reduce) await page.evaluate(async () => { const { juiceSettings } = await import('./juiceSettings.js'); juiceSettings.reduceFlashing = true })
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async (MAT) => { const f = __harness.starfireTest.raw(), t = f._recolorTag, base = t ? `./assets/starfire/skins/${t}/` : './assets/starfire/'
    const extra = ['fx/explosion_strip.png', 'fx/ball_strip.png', 'fx/laser_body0.png', 'fx/laser_body1.png', 'fx/laser_cap0.png', 'fx/laser_cap1.png', 'icons/expressions.png'].map(x => base + x)
    if (t && MAT[t]) for (let k = 0; k < (MAT[t] === 'iridescent' ? 1 : 4); k++) extra.push(`./assets/starfire/skins/${t}/mat/p${k}/idle.png`, `./assets/starfire/skins/${t}/mat/p${k}/sfLaser.png`)
    await Promise.all([...Object.values(f._skinAnim || f.animationData).map(d => d.sheet), ...extra].map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) }, MATERIAL)
  return page
}
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.starfireTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 15: { light: true }, 30: { light: true }, 90: { special: true }, 160: { down: true, special: true }, 230: { left: true, special: true }, 300: { right: true, special: true }, 370: { up: true, special: true }, 440: { jump: true, up: true }, 452: { jump: true, up: true } }
  ev[500] = { charge: true }; ev[530] = { charge: true }
  const t = []; for (let i = 0; i < 600; i++) { writeRawControls(a, ev[i] || {}); __harness.luffyTest.step(1)
    t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, a._starfire?.live?.length, a._starfire?.lev ? 1 : 0, a._starfire?.stats, H.laser()?.segs])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.starfireTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
const SKIN_RGB = [[240, 168, 128], [240, 248, 224]]   // Starfire's skin tones in the supplied art (never recoloured)
try {
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped).slice(0, 4)))
  ok(new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean)).size >= 6, 'B. trace is live (chain, bolt, orb, Star Sight, rush, sky, levitation)')
  for (const [id, [tag]] of Object.entries(WANT)) {
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.starfireTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`), `B. ${id}: applied (tag ${me.tag})`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 600-frame trace identical to Default (timing / geometry / damage / EYE-BEAM ORIGINS untouched)`, d === -1 ? '' : `frame ${d}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    // weapons + material: shot / missile / rack drawn from the skin's strips; material overlay drawn when the skin has one
    await page.evaluate(() => { const H = __harness.starfireTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1600; a.energy = 100; __draws.length = 0; __harness.luffyTest.step(1); H.move('sfBolt'); __harness.luffyTest.step(20) })
    await page.screenshot({ path: `${OUT}/${id}_bolt.png` })
    await page.evaluate(() => __harness.luffyTest.step(40))
    await page.evaluate(() => { const H = __harness.starfireTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.energy = 100; __harness.luffyTest.step(1); H.move('sfLaser'); __harness.luffyTest.step(16) })
    await page.screenshot({ path: `${OUT}/${id}_laser.png` }); await page.evaluate(() => __harness.luffyTest.step(30))
    const dr = await page.evaluate(() => [...new Set(__draws)])
    ok(dr.some(x => x.startsWith(`starfire/skins/${tag}/fx/ball`)) && dr.some(x => x.startsWith(`starfire/skins/${tag}/fx/explosion`)) && dr.some(x => x.startsWith(`starfire/skins/${tag}/fx/laser_body`)) && !dr.some(x => x.startsWith('starfire/fx/')), `B. ${id}: ball / explosion / laser art drawn from the skin's own strips`, dr.filter(x => /fx\//.test(x)).join(','))
    if (MATERIAL[tag]) ok(dr.some(x => x.startsWith(`starfire/skins/${tag}/mat/`)), `B. ${id}: ${MATERIAL[tag]} material overlay drawn (precomputed strip)`, dr.filter(x => /mat\//.test(x)).join(','))
    else ok(!dr.some(x => /\/mat\//.test(x)), `B. ${id}: no material overlay (palette only)`)
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); __harness.starfireTest.reset(); __harness.luffyTest.step(2) }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    const kept = await page.evaluate(async ([tag, SKIN]) => { const f = __harness.starfireTest.raw(), load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
      const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      let skin = 0, changed = 0, strips = 0, recol = 0
      for (const k of Object.keys(f.animationData)) { const b0 = f.animationData[k]?.sheet; if (!b0) continue; const file = b0.split('/').pop()
        const [b, sk] = await Promise.all([load(b0), load(`./assets/starfire/skins/${tag}/${file}`)]); if (!b || !sk) continue; strips++
        const B = px(b), S = px(sk); for (let i = 0; i < B.length; i += 4) { if (!B[i + 3]) continue
          if (SKIN.some(c => c[0] === B[i] && c[1] === B[i + 1] && c[2] === B[i + 2])) { skin++; if (B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2] || B[i + 3] !== S[i + 3]) changed++ }
          else if (B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2]) recol++ } }
      return { strips, skin, changed, recol } }, [tag, SKIN_RGB])
    ok(kept.strips > 30 && kept.skin > 1000 && kept.changed === 0 && kept.recol > 1000, `B. ${id}: her skin pixels identical to Default in every strip (costume / hair / metal recoloured)`, JSON.stringify(kept))
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, kept, fxDraws: dr.length }
    await page.close()
  }
  // reduced effects: only the static phase-0 overlay is ever drawn (no crossfade between phases)
  page = await open('sf_aurora_glitter', 'default', { reduce: true })
  await page.evaluate(() => { __draws.length = 0; for (let i = 0; i < 200; i++) __harness.luffyTest.step(1) })
  const rd = await page.evaluate(() => [...new Set(__draws)].filter(x => x.includes('/mat/')))
  ok(rd.length > 0 && rd.every(x => x.includes('/mat/p0/')), 'B. Reduce Flashing: material falls back to the static phase-0 overlay', rd.join(',')); await page.close()
  for (const [a, b, same] of [['sf_dark_sister', 'sf_solar_empress', false], ['sf_pink_nova', 'sf_pink_nova', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.starfireTest.raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `C. same-skin mirror (${a}) → P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `C. ${a} vs ${b}: both own palettes`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` }); await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=starfire&p2=starfire`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'sf_opal_supernova', p2Skin: 'sf_infinity_sky', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'sf_opal_supernova' && restored.p1Skin === 'sf_opal_supernova' && restored.p2Skin === 'sf_infinity_sky', 'D. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing Starfire asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
