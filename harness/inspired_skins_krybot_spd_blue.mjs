// harness/inspired_skins_krybot_spd_blue.mjs — the 12 crossover/palette skins (6 Krybot, 6 S.P.D. Blue):
//  A. metadata: "— Inspired" naming, source + classification, frame data / timelines identical to the base (sheet only),
//     every sheet on disk with the SAME size + alpha as its base (pixels outside the palette regions untouched);
//     the whole roster's authored gameplay equals Codex's pre-skin baseline (docs/skins/krybot/gameplay_baseline.json)
//  B. Krybot, each skin: identical 520-frame authoritative trace vs default (normals, Covering Unit, ultimate, breach,
//     leap), every body action renders unclipped, Covering Unit + ultimate squad draw the OWNER's skin sheets,
//     bright + dark stage captures
//  C. S.P.D. Blue, each skin: identical 400-frame trace vs default (normals, baton, shot, barrier, pursuit), every action
//     renders, teleport ghost / blaster shot / barrier ring follow the skin, bright + dark captures
//  D. mirrors: Krybot Alien X vs Four Arms and SPD Red-palette vs Shadow keep both palettes (no P2 wash over a chosen
//     skin); a same-skin S.P.D. Blue mirror still gets the wash. E. KO → victory → rematch keeps both skins; session
//     survives a page reload. 0 page errors, 0 failed asset requests.
//   node harness/inspired_skins_krybot_spd_blue.mjs        (captures → docs/skins/{krybot,spd_blue}/inspired/)
import fs from 'node:fs'; import path from 'node:path'
import { chromium } from 'playwright'
import { serve, ROOT } from './ben10_test_utils.mjs'
import { characters } from '../characters.js'
import { getSkins } from '../skins.js'
import { execFileSync } from 'node:child_process'

let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m) } else { fail++; console.log('  ❌', m) } }
const KRY = { krybotAlienX: 'alienx', krybot_inspired_upgrade: 'upgrade', krybot_inspired_heatblast: 'heatblast',
  krybot_inspired_diamondhead: 'diamondhead', krybot_inspired_xlr8: 'xlr8', krybot_inspired_fourarms: 'fourarms' }
const BLUE = { spdBlueAlienX: 'alienx', spd_blue_inspired_upgrade: 'upgrade', spd_blue_inspired_diamondhead: 'diamondhead',
  spd_blue_inspired_heatblast: 'heatblast', spd_blue_inspired_spd_red: 'spd_red', spd_blue_inspired_shadow: 'shadow' }
const SHOT = { krybot: 'docs/skins/krybot/inspired', spd_blue: 'docs/skins/spd_blue/inspired' }
for (const d of Object.values(SHOT)) fs.mkdirSync(path.join(ROOT, d), { recursive: true })

// ── A. metadata / frame data / pixels ──
console.log('A. METADATA + FRAME DATA + PIXELS')
const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/skins/krybot/gameplay_baseline.json')))
let rosterSame = true
for (const [k, v] of Object.entries(base.roster)) for (const part of Object.keys(v))
  if (JSON.stringify(characters[k]?.[part]) !== JSON.stringify(v[part])) { rosterSame = false; console.log('    roster drift', k, part) }
ok(rosterSame, `authored gameplay of all ${Object.keys(base.roster).length} baseline characters unchanged`)
// size + alpha comparison via Pillow (no PNG decoder in node_modules): returns the pairs that differ
const PY = 'import sys,json\nfrom PIL import Image\nbad=[]\nfor a,b in json.load(sys.stdin):\n  A=Image.open(a).convert("RGBA");B=Image.open(b).convert("RGBA")\n  if A.size!=B.size or A.getchannel("A").tobytes()!=B.getchannel("A").tobytes():bad.append(a)\nprint(json.dumps(bad))'
const alphaDiff = pairs => JSON.parse(execFileSync('python3', ['-c', PY], { cwd: ROOT, input: JSON.stringify(pairs) }).toString())
for (const [key, ids, dir] of [['krybot', KRY, 'krybot'], ['spd_blue', BLUE, 'spd_blue']]) {
  const list = getSkins(key), byId = Object.fromEntries(list.map(s => [s.id, s]))
  ok(list[0].id === 'default' && !list[0].animationData, `${key}: default skin first and unchanged (base sheets)`)
  ok(Object.keys(ids).every(id => byId[id]), `${key}: all 6 new skins registered (${list.length} total)`)
  for (const [id, tag] of Object.entries(ids)) {
    const s = byId[id]; if (!s) { ok(false, id + ' missing'); continue }
    const named = /Inspired/.test(s.name) && (s.classification === 'Crossover palette' || key === 'spd_blue')
    ok(named && s.source?.version && s.source?.url && s.classification && s.unlockLevel === 0, `${id}: "${s.name}" · ${s.classification} · source ✓`)
    let same = true, alphaSame = true; const pairs = []
    for (const [act, d] of Object.entries(characters[key].animationData)) {
      const { sheet, ...rest } = s.animationData[act] || {}; const { sheet: bs, ...brest } = d
      if (JSON.stringify(rest) !== JSON.stringify(brest)) { same = false; console.log('    frame-data drift', id, act) }
      if (!sheet?.includes(`/skins/${tag}/`) || !fs.existsSync(path.join(ROOT, sheet))) { alphaSame = false; console.log('    missing', sheet); continue }
      pairs.push([sheet.slice(2), bs.slice(2)])
    }
    const diff = alphaDiff(pairs); if (diff.length) { alphaSame = false; console.log('    alpha/size drift', diff.slice(0, 3)) }
    const files = pairs.length
    ok(same, `${id}: frame data / timelines / origins identical to base (sheet path only)`)
    ok(alphaSame && fs.existsSync(path.join(ROOT, s.portrait)), `${id}: ${files} sheets + portrait on disk, same size + alpha as base`)
  }
}
ok(getSkins('krybot').find(s => s.id === 'krybotAlienX') && getSkins('spd_blue').find(s => s.id === 'spdBlueAlienX'),
  'Alien X ids end in "AlienX" → shared drawAlienXStarfield overlay')

const server = await serve(), browser = await chromium.launch({ headless: true })
const errors = [], bad = []
async function open(p1, p2, p1Skin, p2Skin, api) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() >= 400 && /\/assets\//.test(r.url())) bad.push(r.url()) })
  page.on('requestfailed', r => { if (/\/assets\//.test(r.url())) bad.push(r.url()) })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__draws = []; const o = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...a) { if (im?.src?.includes('/assets/')) { const st = new Error().stack || ''; if (/krybotFx|spdBlueFx/.test(st)) __draws.push(im.src.split('/assets/')[1]) } return o.call(this, im, ...a) } })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}&seed=334455`, { waitUntil: 'load' })
  await page.waitForFunction(a => !!window.__harness?.[a], api)
  await page.evaluate(([a, b]) => { __harness.start({ p1Skin: a, p2Skin: b }); __harness.skipToBattle(); __harness.luffyTest.step(3) }, [p1Skin, p2Skin])
  await page.evaluate(() => __harness.preloadDone()); await page.evaluate(() => __harness.luffyTest.step(3))
  await page.waitForFunction(() => __harness.luffyTest.state()?.ready)
  await page.evaluate(async () => { for (const w of ['p1', 'p2']) { const f = w === 'p1' ? __harness.krybotTest?.raw() || __harness.spdBlueTest.raw() : __harness.krybotTest?.raw('p2') || __harness.spdBlueTest.raw('p2')
    await Promise.all(Object.values(f._skinAnim || f.animationData).map(d => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = d.sheet }))) } })
  return page
}
const poses = page => page.evaluate(async api => { const H = __harness[api], f = H.raw(), out = []; H.reset()
  for (const action of Object.keys(f._skinAnim || f.animationData)) { __harness.forceAction(action); __harness.luffyTest.step(1); await new Promise(r => setTimeout(r, 15)); __harness.luffyTest.step(0); out.push({ action, ...__harness.measureSprite() }) }
  __harness.forceAction(null); return out }, page.__api)
async function stages(page, key, id) {
  for (const [stage, tone] of [['World Tournament Arena', 'light'], ['Null Void', 'dark']]) {
    await page.evaluate(([s, api]) => { __harness.selectStageByName(s); __harness[api].reset(); __harness.luffyTest.step(2) }, [stage, page.__api])
    await page.waitForTimeout(60); await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(() => ['p1', 'p2'].map(w => __harness.measureSprite(w)))
    ok(m.every(s => s.contentH > 40 && !s.clipped), `${id}: readable on ${tone} stage (${stage}) h=${m.map(s => s.contentH).join('/')}`)
    await page.screenshot({ path: path.join(ROOT, SHOT[key], `${id}_${tone}.png`) })
  }
}

try {
  // ── B. KRYBOT ──
  console.log('B. KRYBOT')
  let ref = null
  for (const id of ['default', ...Object.keys(KRY)]) {
    const page = await open('krybot', 'krybot', id, 'default', 'krybotTest'); page.__api = 'krybotTest'
    const run = await page.evaluate(() => { const H = __harness.krybotTest, a = H.raw(), b = H.raw('p2'); H.reset(); a.x = 1300; b.x = 1372; a.facing = 1; b.facing = -1; a.energy = 100
      const trace = []; let helper = false, ult = false
      for (let i = 0; i < 520; i++) { if (i === 0) H.move('light'); if (i === 30) H.move('heavy'); if (i === 100) H.move('kCover'); if (i === 200) { a.energy = 100; H.move('ultimate') }
        if (i === 320) H.move('kBreach'); if (i === 400) { a.energy = 100; H.move('kLeap') }
        __harness.luffyTest.step(1); helper ||= !!a._krybot?.helper; ult ||= !!a._krybot?.super
        trace.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.hitstun, a.currentAttack, a._krybot, b.x, b.y, b.health, b.hitstun, H.state().shots])) }
      return { trace, helper, ult } })
    if (id === 'default') { ref = run.trace; ok(run.helper && run.ult, 'default: Covering Unit + ultimate exercised (reference trace)'); await page.close(); continue }
    ok(run.helper && run.ult && JSON.stringify(run.trace) === JSON.stringify(ref), `${id}: 520-frame trace identical to default (helper + ultimate exercised)`)
    const ps = await poses(page); ok(ps.length >= 30 && ps.every(p => p.contentH > 10 && !p.clipped), `${id}: all ${ps.length} body actions render unclipped`)
    const tag = KRY[id]
    await page.evaluate(() => { const H = __harness.krybotTest; H.reset(); H.raw().energy = 100; H.raw('p2').x = H.raw().x + 250; H.move('kCover'); __harness.luffyTest.step(35) })
    await page.waitForTimeout(50); await page.evaluate(() => { __draws.length = 0; __harness.luffyTest.step(0) })
    let d = await page.evaluate(() => [...new Set(__draws)]); ok(d.includes(`krybot/skins/${tag}/kBlaster.png`), `${id}: Covering Unit drawn in the owner's skin (${d.join(',')})`)
    await page.screenshot({ path: path.join(ROOT, SHOT.krybot, `${id}_helper.png`) })
    const hit = await page.evaluate(() => { const H = __harness.krybotTest; H.reset(); const a = H.raw(), b = H.raw('p2'); a.x = 1300; b.x = 1390; a.facing = 1; b.facing = -1; a.energy = 100; H.move('ultimate'); for (let i = 0; i < 75; i++) { __harness.luffyTest.step(1); if (a._krybot?.super?.age === 9) break } return !!a._krybot?.super })
    await page.waitForTimeout(60); await page.evaluate(() => { __draws.length = 0; __harness.luffyTest.step(0) })
    d = await page.evaluate(() => [...new Set(__draws)]); ok(hit && d.includes(`krybot/skins/${tag}/kBlaster.png`), `${id}: ultimate squad drawn in the owner's skin`)
    await page.screenshot({ path: path.join(ROOT, SHOT.krybot, `${id}_ultimate.png`) })
    await stages(page, 'krybot', id)
    await page.close()
  }

  // ── C. S.P.D. BLUE ──
  console.log('C. S.P.D. BLUE')
  ref = null
  for (const id of ['default', ...Object.keys(BLUE)]) {
    const page = await open('spd_blue', 'krybot', id, 'default', 'spdBlueTest'); page.__api = 'spdBlueTest'
    const run = await page.evaluate(() => { const H = __harness.spdBlueTest, a = H.raw(), b = H.raw('p2'); H.reset(); a.x = 1300; b.x = 1380; a.facing = 1; b.facing = -1; a.energy = 100
      const trace = []
      const plan = { 0: 'light', 30: 'heavy', 80: 'bChain', 140: 'bShot', 220: 'bBarrier', 290: 'bPursuit', 350: 'bLow' }
      for (let i = 0; i < 400; i++) { if (plan[i]) { a.energy = 100; H.move(plan[i]) } __harness.luffyTest.step(1)
        const st = H.state()
        trace.push(JSON.stringify([a.x, a.y, a.vx, a.vy, a.health, a.energy, a.hitstun, a.currentAttack, a._spdBlue, b.x, b.y, b.health, b.hitstun, st])) }
      return { trace } })
    if (id === 'default') { ref = run.trace; ok(ref.length === 400, 'default: reference trace (normals, baton, shot, barrier, pursuit)'); await page.close(); continue }
    ok(JSON.stringify(run.trace) === JSON.stringify(ref), `${id}: 400-frame trace identical to default`)
    const ps = await poses(page); ok(ps.length >= 31 && ps.every(p => p.contentH > 10 && !p.clipped), `${id}: all ${ps.length} body actions render unclipped`)
    const tag = BLUE[id]
    // Blaster shot: the projectile's sheet follows the skin (cosmetic field only).
    const shot = await page.evaluate(async () => { const H = __harness.spdBlueTest, a = H.raw(); H.reset(); a.energy = 100; H.move('bShot'); let s = null
      for (let i = 0; i < 40 && !s; i++) { __harness.luffyTest.step(1); s = __harness.projectiles().find(p => /spd_blue.*shot\.png/.test(p.sheet || ''))?.sheet || null }
      return s })
    if (shot !== null) ok(shot.includes(`/skins/${tag}/shot.png`), `${id}: blaster shot sheet → ${shot}`)
    else { const src = fs.readFileSync(path.join(ROOT, 'spdBlueState.js'), 'utf8'); ok(/skins\/\$\{f\._recolorTag\}\/shot\.png/.test(src) && fs.existsSync(path.join(ROOT, `assets/spd_blue/skins/${tag}/shot.png`)), `${id}: blaster shot sheet keyed by the skin tag (file on disk)`) }
    // Teleport ghost + barrier ring (render-only): force each state for one render step.
    await page.evaluate(() => { const H = __harness.spdBlueTest, a = H.raw(); H.reset(); a._groundTeleport = { tick: 0, prev: 0, lastDir: 0, lastAt: -1000, released: false, cooldown: 0, count: 1, action: { phase: 'windup', x0: a.x, age: 1 } }; __draws.length = 0; __harness.luffyTest.step(0) })
    await page.waitForTimeout(80); await page.evaluate(() => { __draws.length = 0; __harness.luffyTest.step(0) })
    const td = await page.evaluate(() => [...new Set(__draws)]); ok(td.includes(`spd_blue/skins/${tag}/cells/phase0.png`), `${id}: teleport ghost uses the skin (${td.join(',')})`)
    await page.screenshot({ path: path.join(ROOT, SHOT.spd_blue, `${id}_teleport.png`) })
    const ring = await page.evaluate(async () => { const H = __harness.spdBlueTest, a = H.raw(); delete a._groundTeleport; const { SPD_BLUE_BARRIER } = await import('./spdBlueSkins.js'); a.energy = 100; H.move('bBarrier'); for (let i = 0; i < 8; i++) __harness.luffyTest.step(1); return SPD_BLUE_BARRIER[a._recolorTag] })
    ok(Array.isArray(ring) && ring.length === 2, `${id}: barrier ring colours ${ring?.join(' / ')}`)
    await page.screenshot({ path: path.join(ROOT, SHOT.spd_blue, `${id}_barrier.png`) })
    await stages(page, 'spd_blue', id)
    await page.close()
  }

  // ── D. MIRRORS ──
  console.log('D. MIRRORS')
  for (const [key, a, b, api, same] of [['krybot', 'krybotAlienX', 'krybot_inspired_fourarms', 'krybotTest', false],
    ['spd_blue', 'spd_blue_inspired_spd_red', 'spd_blue_inspired_shadow', 'spdBlueTest', false], ['spd_blue', 'spd_blue_inspired_heatblast', 'spd_blue_inspired_heatblast', 'spdBlueTest', true]]) {
    const page = await open(key, key, a, b, api); page.__api = api
    await page.evaluate(() => __harness.luffyTest.step(0))
    const m = await page.evaluate(api => ['p1', 'p2'].map(w => { const f = __harness[api].raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, tint: f.tintColor || null } }), api)
    const own = m[0].id === a && m[1].id === b && m[0].idle !== undefined && m[1].idle?.includes('/skins/')
    if (same) ok(own && !m[0].tint && !!m[1].tint, `${key} same-skin mirror (${a}) → P2 still gets the mirror wash (${m[1].tint})`)
    else ok(own && !m[0].tint && !m[1].tint && m[0].idle !== m[1].idle, `${key} mirror ${a} vs ${b}: both palettes native, no wash`)
    await page.screenshot({ path: path.join(ROOT, SHOT[key], `mirror_${a}_vs_${b}.png`) })
    await page.close()
  }

  // ── E. KO → VICTORY → REMATCH → RELOAD (live loop) ──
  console.log('E. KO / REMATCH / RELOAD')
  for (const [key, a, b, api] of [['krybot', 'krybotAlienX', 'krybot_inspired_xlr8', 'krybotTest'], ['spd_blue', 'spdBlueAlienX', 'spd_blue_inspired_upgrade', 'spdBlueTest']]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
    await page.goto(`${server.base}/index.html?harness=1&session=1&p1=${key}&p2=${key}`, { waitUntil: 'load' }); await page.waitForFunction(api => !!window.__harness?.[api], api)
    await page.mouse.click(640, 360)
    await page.evaluate(([x, y]) => { __harness.start({ p1Skin: x, p2Skin: y, mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() }, [a, b])
    for (let round = 0; round < 3; round++) {
      if ((await page.evaluate(() => __harness.state())).gameState === 'victory') break
      await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
      await page.evaluate(api => { const H = __harness[api], A = H.raw(), B = H.raw('p2'); A.health = A.maxHealth; A.hitstun = 0; A.attackCooldown = 0; A.attacking = false; A.currentAttack = null; A.vx = 0
        B.health = 1; B.x = A.x + 78; B.y = A.y; B.vx = 0; B.vy = 0; B.onGround = true; B.invulnTimer = 0; B.hitstun = 120; B.isBlocking = false; B.attacking = false; B.currentAttack = null }, api)
      await page.keyboard.down('j'); await page.waitForTimeout(180); await page.keyboard.up('j'); await page.waitForTimeout(1500)
      await page.waitForFunction(api => __harness.state().gameState === 'victory' || (__harness.state().gameState === 'battle' && __harness[api].raw('p2').health > 1), api, { timeout: 45000 })
    }
    ok((await page.evaluate(() => __harness.state())).gameState === 'victory', `${key}: real jab KOs → victory screen`)
    await page.screenshot({ path: path.join(ROOT, SHOT[key], `victory.png`) })
    await page.waitForTimeout(1000); await page.keyboard.press('r')
    await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 20000 })
    const after = await page.evaluate(api => ['p1', 'p2'].map(w => { const f = __harness[api].raw(w); return { id: f.skinId, idle: f._skinAnim?.idle?.sheet, hp: f.health } }), api)
    ok(after[0].id === a && after[1].id === b && after.every(f => f.idle?.includes('/skins/') && f.hp > 0), `${key}: rematch keeps both skins (${after.map(f => f.idle).join(' | ')})`)
    await page.screenshot({ path: path.join(ROOT, SHOT[key], `rematch.png`) })
    const saved = await page.evaluate(() => __harness.session()); await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.session); await page.waitForTimeout(300)
    const restored = await page.evaluate(() => __harness.session())
    ok(saved.p1Skin === a && saved.p2Skin === b && restored.p1Skin === a && restored.p2Skin === b, `${key}: skin choice survives a page reload (${restored.p1Skin}, ${restored.p2Skin})`)
    await page.close()
  }
} catch (e) { console.error('EXCEPTION', e); fail++ }
ok(bad.length === 0, `0 failed asset requests (${[...new Set(bad)].slice(0, 3).join(', ')})`)
ok(errors.length === 0, `0 page errors (${errors.slice(0, 2).join(' | ')})`)
console.log(`\n════════════════════════════════════════\n  KRYBOT + SPD BLUE INSPIRED SKINS: ${pass} passed, ${fail} failed\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(fail ? 1 : 0)
