// harness/elastigirl_render_check.mjs — RENDER CHECK on the normal launch path (real mouse, no skipToBattle):
// boot → title → Play → VS → Easy → Pixar universe → Elastigirl → skin → CPU pick → stage → match. Confirms both
// fighters and the HUD render (canvas pixel probes over each fighter's drawn box and the HUD bars), no crash, no black
// screen, no page errors. Optional: --skin <idx> (skin card index), --ult (fire Family Raft and probe mid-raft),
// --tag <name> (screenshot suffix).   node harness/elastigirl_render_check.mjs [--skin 1] [--ult] [--tag x]
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i < 0 ? null : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true) }
const SKIN = +(opt('--skin') || 0), ULT = !!opt('--ult'), TAG = opt('--tag') || `skin${SKIN}`
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errors = []
let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message))
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, d) }
fs.mkdirSync('docs/elastigirl/render', { recursive: true })
const shot = n => page.screenshot({ path: `docs/elastigirl/render/${TAG}_${n}.png` })
const S = () => page.evaluate(() => __harness.state())
async function click(re) {
  const r = await page.evaluate(src => { const re = new RegExp(src), cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ down: true })
    for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 120; i++) { const s = __harness.padMenuState(); if (re.test(String(s.selId))) return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height }; __harness.padNav({ [d]: true }) }
    return null }, re)
  if (!r) throw Error('menu item not found: ' + re + ' ' + JSON.stringify(await page.evaluate(() => __harness.padMenuState())))
  await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(450); return r
}
// universe cards carry no ids: find the card index from the live (sorted) universe list, move the pad cursor there
async function pickUniverse(id) {
  const r = await page.evaluate(id => { const list = __harness.luffyTest.universes(), i = list.findIndex(u => u.id === id); if (i < 0) return { missing: true, list: list.map(u => u.id) }
    const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ right: true }); __harness.padNav({ left: true })
    const at = () => __harness.padMenuState().idx, nav = d => { const a = at(); __harness.padNav({ [d]: true }); return at() !== a }
    for (let k = 0; k < 30 && at() < i; k++) { const a = at(); if (!nav('down')) break; if (at() > i) { nav('up'); break } if (at() === a) break }
    for (let k = 0; k < 30 && at() < i; k++) if (!nav('right')) break
    for (let k = 0; k < 30 && at() > i; k++) if (!nav('left')) break
    const s = __harness.padMenuState(); return { ...s, i, name: list[i].name, count: list[i].count, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, id)
  if (r.missing || r.idx !== r.i) return { ...r, missing: true }
  await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(150); await page.mouse.click(r.cx, r.cy); await page.waitForTimeout(500); return r
}
async function findChar(key) {
  const path = []; for (let row = 0; row < 8; row++) { for (let c = 0; c < 8; c++) path.push(row % 2 ? 'left' : 'right'); path.push('down') }
  const seen = []
  for (const dir of path) {
    const r = await page.evaluate(dir => { __harness.padNav({ [dir]: true }); const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(), s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, dir)
    await page.mouse.move(r.cx, r.cy); await page.waitForTimeout(50); const d = await page.evaluate(() => __harness.selectDetail()); seen.push(d?.key); if (d?.key === key) return { ...r, seen }
  }
  return { seen, missing: true }
}
// pixel probe: fraction of non-background-ish pixels inside a canvas rect + mean luminance of the whole canvas
const probe = rects => page.evaluate(rects => {
  const cv = document.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.width, H = cv.height, all = cx.getImageData(0, 0, W, H).data
  let lum = 0; for (let i = 0; i < all.length; i += 4 * 97) lum += (all[i] + all[i + 1] + all[i + 2]) / 3
  const out = { lum: lum / (all.length / (4 * 97)), W, H, rects: [] }
  for (const r of rects) { const x = Math.max(0, Math.round(r.x)), y = Math.max(0, Math.round(r.y)), w = Math.max(1, Math.min(W - x, Math.round(r.w))), h = Math.max(1, Math.min(H - y, Math.round(r.h)))
    const d = cx.getImageData(x, y, w, h).data; const cols = new Set(); for (let i = 0; i < d.length; i += 4) cols.add((d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3)); out.rects.push({ ...r, colours: cols.size }) }
  return out }, rects)
// both fighters: roster key (generic accessor) + on-screen rect from the live camera (__harness.screenRect)
const fighterRects = () => page.evaluate(() => ['p1', 'p2'].map(w => { const s = __harness.luffyTest.state(w), r = __harness.screenRect(w); return { who: w, key: s?.key, rect: r } }))
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  await shot('01_title'); await page.mouse.click(640, 400); await page.waitForTimeout(500)
  await click('^play$'); await click('^vs$'); await click('^easy$')
  const uni = await pickUniverse('pixar'); ck('universe select lists "Pixar" (Elastigirl inside)', !uni.missing && uni.name === 'Pixar' && uni.count >= 1, JSON.stringify(uni))
  await page.waitForTimeout(400)
  const g = await findChar('elastigirl'); ck('Pixar roster lists elastigirl', !g.missing, JSON.stringify(g.seen.filter(Boolean).slice(0, 12)))
  const detail = await page.evaluate(() => __harness.selectDetail()); await shot('02_select')
  ck('select detail is Elastigirl', detail?.key === 'elastigirl', JSON.stringify({ key: detail?.key, name: detail?.name, hp: detail?.stats?.maxHealth }))
  await page.mouse.click(g.cx, g.cy); await page.waitForTimeout(600)
  const ss = await page.evaluate(() => __harness.padMenuState())
  if (ss.gameState === 'selectSkin') {
    const sk = await page.evaluate(i => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ right: true }); __harness.padNav({ left: true }); for (let k = 0; k < 30 && __harness.padMenuState().idx !== i; k++) __harness.padNav({ right: true }); const s = __harness.padMenuState(); return { ...s, cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }, SKIN)
    ck(`skin select offers skin #${SKIN}`, sk.idx === SKIN, JSON.stringify({ count: ss.count, idx: sk.idx }))
    await page.mouse.move(sk.cx, sk.cy); await page.waitForTimeout(200); await shot('03_skin'); await page.mouse.click(sk.cx, sk.cy); await page.waitForTimeout(700)
  }
  // CPU opponent: the next selectable card (any fighter)
  let st = await S()
  if (st.gameState === 'selectUniverse' || st.gameState === 'selectCharacter') {
    if (st.gameState === 'selectUniverse') await pickUniverse('pixar')
    const k = await findChar('elastigirl'); await page.mouse.click(k.cx, k.cy); await page.waitForTimeout(500)
    if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectSkin') { const c = await page.evaluate(() => { const cv = document.querySelector('canvas'), b = cv.getBoundingClientRect(); __harness.padNav({ right: true }); __harness.padNav({ left: true }); const s = __harness.padMenuState(); return { cx: b.left + s.mouseX * b.width / cv.width, cy: b.top + s.mouseY * b.height / cv.height } }); await page.mouse.move(c.cx, c.cy); await page.waitForTimeout(150); await page.mouse.click(c.cx, c.cy); await page.waitForTimeout(600) }
  }
  await page.waitForTimeout(400)
  if ((await page.evaluate(() => __harness.padMenuState())).gameState === 'selectStage') { await shot('04_stage'); await click('.*') }
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 60000 }); await page.waitForTimeout(800)
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  const fr = await fighterRects(); st = await S()
  ck('match running with Elastigirl as P1', st.gameState === 'battle' && fr[0].key === 'elastigirl', JSON.stringify(fr.map(f => f.key)))
  await shot('05_match')
  const pad = r => ({ x: r.x - r.w * 0.6, y: r.y - r.h * 0.15, w: r.w * 2.2, h: r.h * 1.2 })
  const pr = await probe([{ name: 'hudTop', x: 0, y: 0, w: 99999, h: 90 }, ...fr.map(f => ({ name: f.who, ...pad(f.rect) }))])
  ck('no black screen (mean canvas luminance > 12)', pr.lum > 12, pr.lum.toFixed(1))
  ck('HUD band renders (many colours in the top 90 px)', pr.rects[0].colours > 40, String(pr.rects[0].colours))
  // the CPU moves between samples: re-read its rect and probe in the same evaluate turn, best of 12 samples per fighter
  for (const who of ['p1', 'p2']) {
    let best = 0
    for (let i = 0; i < 12 && best <= 25; i++) {
      const c = await page.evaluate(who => { const r = __harness.screenRect(who), cv = document.querySelector('canvas'), cx = cv.getContext('2d')
        const x = Math.max(0, Math.round(r.x - r.w * 0.6)), y = Math.max(0, Math.round(r.y - r.h * 0.15)), w = Math.max(1, Math.min(cv.width - x, Math.round(r.w * 2.2))), h = Math.max(1, Math.min(cv.height - y, Math.round(r.h * 1.2)))
        const d = cx.getImageData(x, y, w, h).data, cols = new Set(); for (let k = 0; k < d.length; k += 4) cols.add((d[k] >> 3) << 10 | (d[k + 1] >> 3) << 5 | (d[k + 2] >> 3)); return cols.size }, who)
      best = Math.max(best, c); if (best <= 25) await page.waitForTimeout(120)
    }
    ck(`${who} fighter renders (sprite colours in its on-screen box)`, best > 25, String(best))
  }
  if (ULT) {
    await page.evaluate(() => { const H = __harness.elastigirlTest, a = H.raw(), b = H.raw('p2'); __harness.setRoundTimer?.(5400); a.energy = 100; b.x = a.x + 260 * (a.facing || 1); b.vx = 0; b.attacking = false; b.currentAttack = null; b.attackCooldown = 200 })
    const fired = await page.evaluate(() => __harness.elastigirlTest.move('eUlt'))
    let raft = false
    for (let i = 0; i < 80 && !raft; i++) { await page.waitForTimeout(30); raft = await page.evaluate(() => __harness.elastigirlTest.raw().currentAttack?.name === 'eRaft') }
    await page.waitForTimeout(250); await shot('06_ult_raft')
    const u = await page.evaluate(() => { const f = __harness.elastigirlTest.raw(); return { atk: f.currentAttack?.name, drawn: f._lastDstH || 0, skin: f.skinId || null, rect: __harness.screenRect('p1') } })
    const pu = await probe([{ name: 'hudTop', x: 0, y: 0, w: 99999, h: 90 }, { name: 'raft', x: u.rect.x - u.rect.w, y: u.rect.y, w: u.rect.w * 3, h: u.rect.h * 1.1 }])
    ck('ultimate: Family Raft started and the raft sprite is drawing', fired && raft && u.drawn > 0 && pu.rects[1].colours > 25, JSON.stringify({ ...u, colours: pu.rects[1].colours }))
    ck('ultimate: HUD + scene still render (no black screen)', pu.lum > 12 && pu.rects[0].colours > 40, JSON.stringify({ lum: pu.lum.toFixed(1), c: pu.rects[0].colours }))
    await page.waitForTimeout(1800); await shot('07_ult_after')
  }
  ck('no page errors', errors.length === 0, JSON.stringify(errors.slice(0, 4)))
} catch (e) { fail++; console.log('FAIL exception', e.message); try { await shot('99_exception') } catch (_) {} }
finally { console.log(`render check [${TAG}]: ${pass} passed, ${fail} failed`); await browser.close(); server.close?.(); process.exit(fail ? 1 : 0) }
