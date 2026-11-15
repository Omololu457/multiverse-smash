// harness/violet_render_check.mjs — Violet Parr RENDER CHECK through the NORMAL launch path (real menus, no skipToBattle):
// title → Play → VS → difficulty → The Incredibles → Violet → skin → CPU pick → stage → match. Asserts both fighters and
// the HUD render (fighters drawn with sprite actions, HUD pixels present), no page errors, no black screen. Optional
// `--skin <id>` picks a skin; `--invisible` also enters Vanish in the match and checks the 35% invisible render.
// Usage: node harness/violet_render_check.mjs [--skin violet_inc2] [--invisible] [--shot docs/violet/render_<x>.png]
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null }
const SKIN = arg('--skin') || 'default', INVIS = process.argv.includes('--invisible'), SHOT = arg('--shot') || `docs/violet/render_${SKIN}${INVIS ? '_invisible' : ''}.png`
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], r404 = new Set(); let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() === 404) r404.add(r.url().replace(/^https?:\/\/[^/]+/, '')) })
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, c ? '' : d) }
const ms = () => page.evaluate(() => __harness.padMenuState())
const nav = o => page.evaluate(o => __harness.padNav(o), o)
async function confirmUntil(state) { for (let i = 0; i < 6 && (await ms()).gameState !== state; i++) { await nav({ confirm: true }); await page.waitForTimeout(350) } }
async function pickId(re) { for (const d of ['down', 'right', 'up', 'left']) for (let i = 0; i < 40; i++) { const s = await ms(); if (new RegExp(re, 'i').test(String(s.selId))) { await nav({ confirm: true }); await page.waitForTimeout(450); return true } await nav({ [d]: true }) } return false }
async function pickIdx(target, cols = 3) { for (let i = 0; i < 200; i++) { const s = await ms(); if (s.idx === target) { await nav({ confirm: true }); await page.waitForTimeout(600); return true }
  const r = Math.floor(s.idx / cols), c = s.idx % cols, tr = Math.floor(target / cols), tc = target % cols
  await nav({ [r < tr ? 'down' : r > tr ? 'up' : c < tc ? 'right' : 'left']: true }) } return false }
try {
  await page.goto(server.base + '/index.html?harness=1', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.state); await page.waitForTimeout(900)
  ck('violet is unlocked on a fresh account', await page.evaluate(() => __harness.charUnlocked('violet')) === true)
  await page.mouse.click(640, 400); await page.waitForTimeout(500)
  ck('menu: Play', await pickId('^play$')); ck('menu: VS', await pickId('^vs$')); ck('menu: difficulty', await pickId('^easy$'))
  const unis = await page.evaluate(() => __harness.luffyTest.universes()); const ui = unis.findIndex(u => u.id === 'the_incredibles')
  ck('universe list has The Incredibles', ui >= 0, JSON.stringify(unis.map(u => u.id)))
  ck('pick The Incredibles card', await pickIdx(ui) && (await ms()).gameState === 'selectCharacter', JSON.stringify(await ms()))
  let found = false
  for (let i = 0; i < 40 && !found; i++) { const d = await page.evaluate(() => __harness.selectDetail()); if (d?.key === 'violet') { found = true; break } await nav({ right: true }); await page.waitForTimeout(40) }
  const det = await page.evaluate(() => __harness.selectDetail())
  ck('select detail: Violet Parr', found && det?.name === 'Violet Parr', JSON.stringify(det))
  await nav({ confirm: true }); await page.waitForTimeout(600)
  let s = await ms()
  if (s.gameState === 'selectSkin') {
    const want = await page.evaluate(id => (window.__harness.violetTest?.skins() || []).findIndex(x => x.id === id), SKIN)
    if (SKIN !== 'default') { for (let i = 0; i < 20 && (await ms()).idx !== want && want > 0; i++) await nav({ right: true }) }
    await nav({ confirm: true }); await page.waitForTimeout(600)
  } else ck('skin select screen shown', SKIN === 'default', JSON.stringify(s))
  for (let i = 0; i < 8; i++) { s = await ms(); if (s.gameState === 'battle' || s.gameState === 'intro' || s.gameState === 'loading') break
    if (s.gameState === 'selectUniverse') { await nav({ confirm: true }); await page.waitForTimeout(500); continue }
    await nav({ confirm: true }); await page.waitForTimeout(500) }
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 60000 }); await page.waitForTimeout(900)
  await page.evaluate(() => __harness.setDummyBehavior?.('stand'))
  if (INVIS) {
    for (const k of ['s', 's']) { await page.keyboard.down(k); await page.waitForTimeout(40); await page.keyboard.up(k); await page.waitForTimeout(40) }
    await page.keyboard.down('s'); await page.waitForTimeout(30); await page.keyboard.down('l'); await page.waitForTimeout(60); await page.keyboard.up('l'); await page.keyboard.up('s'); await page.waitForTimeout(700)
  }
  await page.screenshot({ path: SHOT })
  const px = await page.evaluate(() => { const cv = document.querySelector('canvas'), c = cv.getContext('2d'), d = c.getImageData(0, 0, cv.width, cv.height).data
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { sum += d[i] + d[i + 1] + d[i + 2]; n++ } 
    const hud = c.getImageData(0, 0, cv.width, Math.round(cv.height * 0.14)).data; let hv = new Set(); for (let i = 0; i < hud.length; i += 4 * 13) hv.add((hud[i] >> 4) * 256 + (hud[i + 1] >> 4) * 16 + (hud[i + 2] >> 4))
    return { mean: sum / n / 3, hudColours: hv.size, w: cv.width, h: cv.height } })
  const vt = await page.evaluate(() => { const H = __harness.violetTest; if (!H) return null; const a = H.state(), b = H.state('p2'); return { a, b, ready: __harness.spriteReady() } })
  const p1 = vt?.a, p2 = vt?.b
  ck('match running with Violet as P1 and a CPU P2', p1?.key === 'violet' && !!p2?.key && p2.hp > 0, JSON.stringify({ p1: p1 && { key: p1.key, skin: p1.skin }, p2: p2 && p2.key }))
  ck('Violet sprite renders (sprite action resolved, sheet frames)', !!p1?.action && p1.ownStrip && !!vt?.ready?.ready, JSON.stringify(p1 && { act: p1.action, own: p1.ownStrip, ready: vt?.ready }))
  ck('opponent renders', !!p2?.action, JSON.stringify(p2 && p2.action))
  ck(`skin applied (${SKIN})`, SKIN === 'default' ? (p1?.skin || 'default') === 'default' : p1?.skin === SKIN, JSON.stringify(p1?.skin))
  ck('HUD drawn (health/energy bars present in the top band)', px.hudColours >= 12, JSON.stringify(px))
  ck('no black screen', px.mean > 18, JSON.stringify(px))
  if (INVIS) ck('invisible: Vanish active, invisible action + 35% alpha', p1?.inv && /^inv_|^vanish$/.test(p1.action) && Math.abs(p1.alpha - 0.35) < 1e-9, JSON.stringify(p1 && { inv: p1.inv, act: p1.action, alpha: p1.alpha }))
} catch (e) { fail++; console.log('FAIL exception', e.message) }
ck('no page errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
const v404 = [...r404].filter(u => /violet/i.test(u)); ck('no missing Violet assets (404)', v404.length === 0, JSON.stringify(v404))
console.log(`\nviolet render check [skin=${SKIN}${INVIS ? ', invisible' : ''}]: ${pass} passed, ${fail} failed  → ${SHOT}`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
