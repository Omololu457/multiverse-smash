// harness/syndrome_skins.test.mjs — Syndrome: Default + 12 WHOLE-ARSENAL skins (Winning Valkyrie, Man of Tomorrow,
// Celestial Conductor, Living Network, Crystal Engine, Furnace King, Cursed Rose, Infinity System, Spectral Parade,
// Rose-Gold Tyrant, Aurora Orchestra, Gilded Omnipotence).
//  A. registry: Default first & unchanged; 12 ids / tags / names / classifications + source fields; ids never contain
//     "cyborg" nor end in "AlienX"; every body strip + EVERY machine strip + portrait on disk; region audit present.
//  B. per skin: identical 600-frame authoritative trace vs Default (cosmetic only); every action renders unclipped with the
//     same content box; skin-tone + outline pixels byte-identical, alpha identical, costume AND machines recoloured; the
//     machines on screen are drawn from the skin's own machine strips (no default Omnidroid behind a skinned Syndrome);
//     light + dark stage captures.
//  C. mirrors: different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. skin choice persists across a reload.
//  Captures → docs/syndrome/skins/.        node harness/syndrome_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { SYNDROME_FX_COLORS } from '../syndromeSkins.js'
import { SYNDROME_SKIN_TABLE } from '../syndromeSkinTable.js'
const ROOT = process.cwd(), OUT = 'docs/syndrome/skins', KEY = 'syndrome'; let pass = 0, fail = 0; const report = { skins: {} }
fs.mkdirSync(OUT, { recursive: true })
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins(KEY), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = Object.fromEntries(SYNDROME_SKIN_TABLE.map(t => [t.id, [t.tag, t.name, !!t.crossover]]))
const NAMES = ['Winning Valkyrie', 'Man of Tomorrow', 'Celestial Conductor', 'Living Network', 'Crystal Engine', 'Furnace King', 'Cursed Rose', 'Infinity System', 'Spectral Parade', 'Rose-Gold Tyrant', 'Aurora Orchestra', 'Gilded Omnipotence']
const MACH = fs.readdirSync(path.join(ROOT, 'assets/syndrome/machines')).filter(f => f.endsWith('.png'))
ok(list[0].id === 'default' && !list[0].animationData && list.length === 13 && NAMES.every(n => list.some(s => s.name === n)), 'A. Default first, unchanged (base sheets), exactly the 12 named skins added', String(list.length))
for (const [id, [tag, name, inspired]] of Object.entries(WANT)) { const s = byId[id]; const miss = []
  for (const d of Object.values(s?.animationData || {})) if (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet))) miss.push(d.sheet)
  for (const m of MACH) if (!fs.existsSync(path.join(ROOT, `assets/syndrome/skins/${tag}/machines/${m}`))) miss.push('machines/' + m)
  if (!fs.existsSync(path.join(ROOT, `assets/syndrome/skins/${tag}/portrait.png`))) miss.push('portrait')
  const cls = !!s?.classification && (inspired ? s.inspired && !!s.crossover && /inspired/i.test(s.classification) : !s.inspired && !s.crossover) && !!s?.source?.inspiration
  ok(s && s.recolorTag === tag && s.name === name && cls && s.effectsPolicy && s.regionMapping && s.spriteScale === list[0].spriteScale && !miss.length && SYNDROME_FX_COLORS[tag],
    `A. ${id}: "${name}" registered, classified (${inspired ? 'crossover-inspired' : 'original'}), sourced, every body strip + ${MACH.length} machine strips + portrait on disk`, JSON.stringify({ miss: miss.slice(0, 4), cls: s?.classification })) }
ok(list.every(s => !/cyborg/i.test(s.id) && (s.id === 'default' || s.id.startsWith('sy_')) && !s.id.endsWith('AlienX')), 'A. no skin id contains "cyborg" or ends in "AlienX" (shared Superman-eye / starfield gates stay off)')
const RM = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/syndrome/region_mapping.json'), 'utf8')), idleR = RM.perStrip?.['idle.png'] || {}, shR = RM.perStrip?.['machines/shellLower.png'] || {}
ok(idleR.hair > 0 && idleR.cape > 0 && idleR.suitLight > 0 && idleR.suitDark0 > 0 && idleR.kept > 0 && shR.armor > 0, 'A. region audit: idle separates hair / cape / suit (light + dark) / kept (outline + face); Omnidroid shell = armor', JSON.stringify({ idleR, shR }))
ok(fs.existsSync(path.join(ROOT, 'docs/syndrome/skins_contact.png')), 'A. docs/syndrome/skins_contact.png exists')
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/syndrome/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__draws = []; const o = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...rest) { if (im?.src?.includes('/assets/syndrome')) __draws.push(im.src.split('/assets/')[1]); return o.call(this, im, ...rest) } })
  await page.goto(`${server.base}/index.html?harness=1&p1=${KEY}&p2=${KEY}&seed=24681`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.syndromeTest)
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async () => { const f = __harness.syndromeTest.raw()
    await Promise.all(Object.values(f._skinAnim || f.animationData).map(d => d.sheet).map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) })
  return page
}
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.syndromeTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1420; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 13: { light: true }, 24: { light: true }, 90: { special: true }, 170: { right: true, special: true }, 250: { down: true, special: true }, 330: { up: true, jump: true, special: true },
    410: { left: true, special: true }, 497: { charge: true }, 498: { charge: true }, 500: { charge: true, special: true }, 540: { jump: true, up: true }, 556: { jump: true, up: true } }
  const t = []; for (let i = 0; i < 600; i++) { writeRawControls(a, ev[i] || {}); if (i === 160 || i === 240 || i === 400 || i === 490) a.energy = 100; __harness.luffyTest.step(1)
    const s = a._syndrome; t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, s && { ...s, cues: undefined }])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.syndromeTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
try {
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped).slice(0, 4)))
  ok(new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean)).size >= 7, 'B. trace is live (chain, Duet, Spin, Turret, Velocipod, Hammerfall, Zero-Point, jumps)', JSON.stringify([...new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean))]))
  for (const [id, [tag]] of Object.entries(WANT)) {
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.syndromeTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`), `B. ${id}: applied (tag ${me.tag})`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 600-frame trace identical to Default (timing / geometry / damage / machines untouched)`, d === -1 ? '' : `frame ${d}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    await page.evaluate(() => { const H = __harness.syndromeTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; b.invulnTimer = 999; a.energy = 100; __harness.luffyTest.step(1)
      H.move('sDuet'); __harness.luffyTest.step(30); a.energy = 100; H.move('sTurret'); __harness.luffyTest.step(30); a.energy = 100; H.move('sHammer'); __harness.luffyTest.step(4); __draws.length = 0; __harness.luffyTest.step(24) })
    await page.waitForTimeout(80); await page.evaluate(() => { __draws.length = 0; __harness.luffyTest.step(1) })
    await page.screenshot({ path: `${OUT}/${id}_arsenal.png` })
    const dr = await page.evaluate(() => [...new Set(__draws)]), mach = dr.filter(x => x.includes('/machines/'))
    ok(mach.length >= 3 && mach.every(x => x.startsWith(`syndrome/skins/${tag}/machines/`)), `B. ${id}: every machine on screen drawn from the skin's own machine strips (${mach.length} parts)`, dr.join(','))
    await page.evaluate(() => __harness.luffyTest.step(60))
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); __harness.syndromeTest.reset(); __harness.luffyTest.step(2) }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    const kept = await page.evaluate(async tag => { const f = __harness.syndromeTest.raw(), load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
      const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      const SKIN = new Set(['222,181,165', '255,206,198', '255,239,222', '115,99,90', '222,181,132'])
      let skin = 0, changed = 0, strips = 0, recol = 0, alpha = 0, mrecol = 0; const files = new Set()
      for (const k of Object.keys(f.animationData)) { const b0 = f.animationData[k]?.sheet; if (b0) files.add(b0.split('/').pop()) }
      for (const m of ['droneHover', 'spOpen', 'gunOpen', 'vpSide', 'shellLower', 'claw', 'leg', 'eyeOpen', 'msRaise', 'mortarOpen', 'bomberHover', 'limbDiag']) files.add('machines/' + m + '.png')
      for (const file of files) { const [b, sk] = await Promise.all([load(`./assets/syndrome/${file}`), load(`./assets/syndrome/skins/${tag}/${file}`)]); if (!b || !sk) continue; strips++
        const B = px(b), S = px(sk); for (let i = 0; i < B.length; i += 4) { if (B[i + 3] !== S[i + 3]) alpha++; if (!B[i + 3]) continue
          const same = B[i] === S[i] && B[i + 1] === S[i + 1] && B[i + 2] === S[i + 2]
          if (SKIN.has(`${B[i]},${B[i + 1]},${B[i + 2]}`)) { skin++; if (!same) changed++ } else if (!same) { recol++; if (file.startsWith('machines/')) mrecol++ } } }
      return { strips, skin, changed, recol, mrecol, alpha } }, tag)
    ok(kept.strips >= 40 && kept.skin > 1000 && kept.changed === 0 && kept.recol > 20000 && kept.mrecol > 10000 && kept.alpha === 0, `B. ${id}: skin-tone pixels identical, alpha identical, costume AND machines recoloured`, JSON.stringify(kept))
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, machineParts: mach.length, kept }
    await page.close()
  }
  for (const [a, b, same] of [['sy_cursed_rose', 'sy_infinity_system', false], ['sy_gilded_omnipotence', 'sy_gilded_omnipotence', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.syndromeTest.raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `C. same-skin mirror (${a}) → P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `C. ${a} vs ${b}: both own palettes`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` }); await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=${KEY}&p2=${KEY}`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'sy_man_of_tomorrow', p2Skin: 'sy_celestial_conductor', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'sy_man_of_tomorrow' && restored.p1Skin === 'sy_man_of_tomorrow' && restored.p2Skin === 'sy_celestial_conductor', 'D. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing Syndrome asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
