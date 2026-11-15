// harness/cyborg_skins.test.mjs — Cyborg: Default + 8 skins (Stark Circuit, War Machine, Blue Bomber, Autobot Vanguard,
// Alien X, Upgrade, Aurora Alloy, Disco Chrome).
//  A. registry: Default first & unchanged; 8 ids / tags / names / classifications / sources; ids never contain "cyborg"
//     (Superman's Cyborg-Superman eye gate) nor end in "AlienX" (unclipped shared starfield); every sheet / fx / portrait /
//     cut-in / icon / material strip on disk; build audit: Victor's skin pixels unchanged, impact pixels kept neutral.
//  B. per skin: identical 600-frame authoritative trace vs Default (cosmetic only); every action renders unclipped at the
//     same content box; Victor's human-skin pixels byte-identical to Default in every strip; weapon FX / projectiles drawn
//     from the skin's own strips; material skins draw their precomputed overlay (and ONLY phase 0 under Reduce Flashing);
//     light + dark stage captures.
//  C. mirrors: different skins keep native palettes; same-skin mirror gets the existing P2 wash.
//  D. skin choice persists across a reload.
//  Captures → docs/skins/cyborg/.        node harness/cyborg_skins.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { getSkins } from '../skins.js'
import { CYBORG_FX_COLORS } from '../cyborgSkins.js'
const ROOT = process.cwd(), OUT = 'docs/skins/cyborg'; let pass = 0, fail = 0; const report = { skins: {} }
const ok = (c, n, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const list = getSkins('cyborg'), byId = Object.fromEntries(list.map(s => [s.id, s]))
const WANT = { cy_stark_circuit: ['stark', 'Stark Circuit'], cy_war_machine: ['warmachine', 'War Machine'], cy_blue_bomber: ['bluebomber', 'Blue Bomber'], cy_autobot_vanguard: ['autobot', 'Autobot Vanguard'],
  cy_alien_x: ['alienx', 'Alien X'], cy_upgrade: ['upgrade', 'Upgrade'], cy_aurora_alloy: ['aurora', 'Aurora Alloy'], cy_disco_chrome: ['disco', 'Disco Chrome'] }
const MATERIAL = { alienx: 'stars', aurora: 'iridescent', disco: 'glitter' }
ok(list[0].id === 'default' && !list[0].animationData && list.length === 9, 'A. Default first, unchanged (base sheets), exactly 8 skins added', String(list.length))
for (const [id, [tag, name]] of Object.entries(WANT)) { const s = byId[id]; let files = true; const miss = []
  for (const d of Object.values(s?.animationData || {})) if (!d.sheet.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, d.sheet))) { files = false; miss.push(d.sheet) }
  for (const f of ['portrait.png', 'fx/missile_strip.png', 'fx/explosion_strip.png', 'fx/sonic_strip.png', 'cutscene/bust.png', 'cutscene/eye0.png', 'cutscene/eye1.png', 'cutscene/mouth0.png', 'cutscene/mouth1.png', 'cutscene/mouth2.png', 'icons/expressions.png'])
    if (!fs.existsSync(path.join(ROOT, `assets/cyborg/skins/${tag}/${f}`))) { files = false; miss.push(f) }
  if (MATERIAL[tag]) { const n = MATERIAL[tag] === 'iridescent' ? 1 : 4; for (let k = 0; k < n; k++) if (!fs.existsSync(path.join(ROOT, `assets/cyborg/skins/${tag}/mat/p${k}/idle.png`))) { files = false; miss.push('mat p' + k) } }
  const official = s?.classification === 'Inspired Palette' ? !!s.source?.url && !!s.crossover : s?.classification?.startsWith('Original')
  ok(s && s.recolorTag === tag && s.name.startsWith(name) && official && s.effectsPolicy && s.regionMapping && s.source?.version && s.spriteScale === list[0].spriteScale && files && CYBORG_FX_COLORS[tag] && (s.material || null) === (MATERIAL[tag] || null),
    `A. ${id}: "${name}" registered, classified, sourced, every sheet / fx / cut-in / icon / material on disk`, JSON.stringify({ miss: miss.slice(0, 4), cls: s?.classification, mat: s?.material })) }
ok(list.every(s => !/cyborg/i.test(s.id) && !s.id.endsWith('AlienX')), 'A. no skin id contains "cyborg" or ends in "AlienX" (shared Superman-eye / starfield gates stay off)')
const RM = JSON.parse(fs.readFileSync(path.join(ROOT, OUT, 'region_mapping.json'), 'utf8')), AU = RM.audit || RM
ok(Object.keys(WANT).every(id => { const a = AU[WANT[id][0]]; return a && a.skinPixels > 0 && a.impactKept > 0 && a.thruster > 0 }), 'A. build audit: skin pixels counted + asserted unchanged, impact kept neutral, thruster themed (every skin)', JSON.stringify(Object.keys(AU)))
ok(fs.existsSync(path.join(ROOT, OUT, 'skins_contact.png')), 'A. docs/skins/cyborg/skins_contact.png exists')
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], bad = []
async function open(a, b, { reduce = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\/cyborg/.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(r => { window.requestAnimationFrame = () => 0; window.__draws = []; const o = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...rest) { if (im?.src?.includes('/assets/cyborg') && /cyborgFx|combat|game|projectile/i.test(new Error().stack || '')) __draws.push(im.src.split('/assets/')[1]); return o.call(this, im, ...rest) } }, reduce)
  await page.goto(`${server.base}/index.html?harness=1&p1=cyborg&p2=cyborg&seed=24680`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.cyborgTest)
  if (reduce) await page.evaluate(async () => { const { juiceSettings } = await import('./juiceSettings.js'); juiceSettings.reduceFlashing = true })
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [a, b]); await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async (MAT) => { const f = __harness.cyborgTest.raw(), t = f._recolorTag, base = t ? `./assets/cyborg/skins/${t}/` : './assets/cyborg/'
    const extra = ['fx/explosion_strip.png', 'fx/sonic_strip.png', 'fx/missile_strip.png', 'icons/expressions.png'].map(x => base + x)
    if (t && MAT[t]) for (let k = 0; k < (MAT[t] === 'iridescent' ? 1 : 4); k++) extra.push(`./assets/cyborg/skins/${t}/mat/p${k}/idle.png`, `./assets/cyborg/skins/${t}/mat/p${k}/run.png`)
    await Promise.all([...Object.values(f._skinAnim || f.animationData).map(d => d.sheet), ...extra].map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src }))) }, MATERIAL)
  return page
}
const TRACE = async page => page.evaluate(async () => { const { writeRawControls } = await import('./input.js'); const H = __harness.cyborgTest; H.reset(); __harness.setDummyBehavior('stand')
  const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1400; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 100; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.comboCounter = 0 }
  const ev = { 5: { light: true }, 15: { light: true }, 28: { light: true }, 90: { special: true }, 160: { right: true, special: true }, 240: { up: true, jump: true, special: true }, 340: { down: true, special: true }, 420: { left: true, special: true }, 480: { jump: true, up: true }, 492: { jump: true, up: true } }
  for (let k = 520; k < 560; k++) ev[k] = { charge: true }
  const t = []; for (let i = 0; i < 600; i++) { writeRawControls(a, ev[i] || {}); __harness.luffyTest.step(1)
    t.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.currentAttack?.name, a.currentAttack?.timer, b.x, b.y, b.health, b.hitstun, a._cyborg?.heat, a._cyborg?.djUsed, a._cyborg?.stats])) }
  return { t } })
const RENDER = async page => page.evaluate(async () => { const f = __harness.cyborgTest.raw(), out = []; for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 12)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) } __harness.forceAction(null); return out })
const SKIN_RGB = [[96, 16, 0], [152, 80, 0], [192, 104, 0], [248, 136, 8]]   // Victor's skin ramp in the supplied art
try {
  let page = await open('default', 'default'); const base = await TRACE(page), baseR = await RENDER(page); await page.close()
  ok(baseR.every(r => r.contentH > 20 && !r.clipped), 'B. Default: every action renders unclipped', JSON.stringify(baseR.filter(r => !(r.contentH > 20) || r.clipped).slice(0, 4)))
  ok(new Set(base.t.map(x => JSON.parse(x)[6]).filter(Boolean)).size >= 6, 'B. trace is live (chain, weapons, vent, thruster)')
  for (const [id, [tag]] of Object.entries(WANT)) {
    page = await open(id, 'default')
    const me = await page.evaluate(() => { const f = __harness.cyborgTest.raw(); return { id: f.skinId, tag: f._recolorTag, idle: f._skinAnim?.idle?.sheet } })
    ok(me.id === id && me.tag === tag && me.idle?.includes(`/skins/${tag}/`), `B. ${id}: applied (tag ${me.tag})`, JSON.stringify(me))
    const tr = await TRACE(page), d = base.t.findIndex((s, i) => s !== tr.t[i])
    ok(d === -1, `B. ${id}: 600-frame trace identical to Default (timing / geometry / damage / Heat untouched)`, d === -1 ? '' : `frame ${d}`)
    const R = await RENDER(page), mism = R.filter((r, i) => r.clipped || Math.abs(r.contentH - baseR[i].contentH) > 1 || Math.abs(r.contentW - baseR[i].contentW) > 1)
    ok(!mism.length, `B. ${id}: all ${R.length} actions render, same content box as Default`, JSON.stringify(mism.slice(0, 3)))
    // weapons + material: shot / missile / rack drawn from the skin's strips; material overlay drawn when the skin has one
    await page.evaluate(() => { const H = __harness.cyborgTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1560; a.energy = 100; __draws.length = 0; __harness.luffyTest.step(1); H.move('cMissile'); __harness.luffyTest.step(26) })
    await page.screenshot({ path: `${OUT}/${id}_missile.png` })
    await page.evaluate(() => __harness.luffyTest.step(40))
    await page.evaluate(() => { const H = __harness.cyborgTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1420; a.energy = 100; __harness.luffyTest.step(1); H.move('cMega'); __harness.luffyTest.step(27) })
    await page.screenshot({ path: `${OUT}/${id}_mega.png` }); await page.evaluate(() => __harness.luffyTest.step(30))
    const dr = await page.evaluate(() => [...new Set(__draws)])
    ok(dr.some(x => x.startsWith(`cyborg/skins/${tag}/fx/`)) && !dr.some(x => x.startsWith('cyborg/fx/')), `B. ${id}: weapon / explosion art drawn from the skin's own strips`, dr.filter(x => /fx\//.test(x)).join(','))
    if (MATERIAL[tag]) ok(dr.some(x => x.startsWith(`cyborg/skins/${tag}/mat/`)), `B. ${id}: ${MATERIAL[tag]} material overlay drawn (precomputed strip)`, dr.filter(x => /mat\//.test(x)).join(','))
    else ok(!dr.some(x => /\/mat\//.test(x)), `B. ${id}: no material overlay (palette only)`)
    for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
      await page.evaluate(s => { __harness.selectStageByName(s); __harness.cyborgTest.reset(); __harness.luffyTest.step(2) }, stage); await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
      const m = await page.evaluate(() => __harness.measureSprite('p1')); ok(m.contentH > 40 && !m.clipped, `B. ${id}: readable on ${tone} stage`, String(m.contentH)); await page.screenshot({ path: `${OUT}/${id}_${tone}.png` }) }
    const kept = await page.evaluate(async ([tag, SKIN]) => { const f = __harness.cyborgTest.raw(), load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
      const px = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
      let skin = 0, changed = 0, strips = 0, recol = 0
      for (const k of Object.keys(f.animationData)) { const b0 = f.animationData[k]?.sheet; if (!b0) continue; const file = b0.split('/').pop()
        const [b, sk] = await Promise.all([load(b0), load(`./assets/cyborg/skins/${tag}/${file}`)]); if (!b || !sk) continue; strips++
        const B = px(b), S = px(sk); for (let i = 0; i < B.length; i += 4) { if (!B[i + 3]) continue
          if (SKIN.some(c => c[0] === B[i] && c[1] === B[i + 1] && c[2] === B[i + 2])) { skin++; if (B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2] || B[i + 3] !== S[i + 3]) changed++ }
          else if (B[i] !== S[i] || B[i + 1] !== S[i + 1] || B[i + 2] !== S[i + 2]) recol++ } }
      return { strips, skin, changed, recol } }, [tag, SKIN_RGB])
    ok(kept.strips > 30 && kept.skin > 1000 && kept.changed === 0 && kept.recol > 1000, `B. ${id}: Victor's human-skin pixels identical to Default in every strip (armour recoloured)`, JSON.stringify(kept))
    report.skins[id] = { tag, traceIdentical: d === -1, actions: R.length, kept, fxDraws: dr.length }
    await page.close()
  }
  // reduced effects: only the static phase-0 overlay is ever drawn (no crossfade between phases)
  page = await open('cy_disco_chrome', 'default', { reduce: true })
  await page.evaluate(() => { __draws.length = 0; for (let i = 0; i < 200; i++) __harness.luffyTest.step(1) })
  const rd = await page.evaluate(() => [...new Set(__draws)].filter(x => x.includes('/mat/')))
  ok(rd.length > 0 && rd.every(x => x.includes('/mat/p0/')), 'B. Reduce Flashing: material falls back to the static phase-0 overlay', rd.join(',')); await page.close()
  for (const [a, b, same] of [['cy_stark_circuit', 'cy_war_machine', false], ['cy_upgrade', 'cy_upgrade', true]]) {
    page = await open(a, b); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => { const f = __harness.cyborgTest.raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }))
    if (same) ok(m[0].id === a && m[1].id === b && !m[0].tint && !!m[1].tint, `C. same-skin mirror (${a}) → P2 gets the existing mirror wash`, JSON.stringify(m))
    else ok(m[0].id === a && m[1].id === b && m[0].idle !== m[1].idle && !m[0].tint && !m[1].tint, `C. ${a} vs ${b}: both own palettes`, JSON.stringify(m))
    await page.screenshot({ path: `${OUT}/mirror_${a}_vs_${b}.png` }); await page.close() }
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=cyborg&p2=cyborg`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.session); await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start({ p1Skin: 'cy_aurora_alloy', p2Skin: 'cy_blue_bomber', mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }); await page.waitForTimeout(400)
  const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300); const restored = await page.evaluate(() => __harness.session())
  ok(saved.p1Skin === 'cy_aurora_alloy' && restored.p1Skin === 'cy_aurora_alloy' && restored.p2Skin === 'cy_blue_bomber', 'D. skin choice persists across a reload', JSON.stringify(restored)); await page.close()
  ok(!bad.length, 'no missing Cyborg asset requests', JSON.stringify(bad.slice(0, 5))); ok(!errors.length, 'no browser runtime errors', JSON.stringify(errors.slice(0, 3)))
} finally { report.passes = pass; report.failures = fail; fs.writeFileSync(`${OUT}/skins_results.json`, JSON.stringify(report, null, 2) + '\n'); console.log(pass, 'passed /', fail, 'failed'); if (fail) process.exitCode = 1; await browser.close(); server.close() }
