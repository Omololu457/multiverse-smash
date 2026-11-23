// harness/wr_skins.test.mjs — the windrangers (Ninja Storm MS_V1 Ranger Version) 10-skin pack, through the NORMAL flow:
// Power Rangers character select → windrangers → the skin-select screen (hover = preview, pick = the real confirm path)
// → startMatch with that skin → the body, the form swap, the clone and the FX all wear it; the sim is unchanged.
//   node harness/wr_skins.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const SHOTS = 'docs/windrangers_skins/screenshots'; fs.mkdirSync(SHOTS, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const errors = []
let page
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
async function open() {
  if (page) await page.close()
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=windrangers&p2=spd_red`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.ninjaTest, null, { timeout: 30000 })
}
async function match(skin, seed = 7) {
  await open()
  await page.evaluate(o => { __harness.rng.forceSeed(o.seed); __harness.start({ p1Skin: o.skin }); __harness.skipToBattle() }, { skin, seed })
  await step(2)
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await step(5); await new Promise(r => setTimeout(r, 120)) }
}
const look = () => page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); return { key: f.rosterKey, skin: f.skinId, wr: f._wrSkin || null, idle: (f._skinAnim || f.animationData).idle.sheet, sword: (f._skinAnim || f.animationData).sword.sheet, dir: f._nsAssetDir || null, color: f._nsColor || null, w: f.w, h: f.h } })
const swap = async () => { await page.evaluate(() => { const d = __harness.ninjaTest.raw('p1')._duo; d.cd = 0; d.want = 8 }); for (let i = 0; i < 40; i++) { await step(1); const k = await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); return f._duo?.swap ? null : f.rosterKey }); if (k && k !== 'ns_red') return k } return null }
// a fixed input script; returns the sim-visible numbers each frame (the skin must not change one of them)
async function script(skin) {
  await match(skin, 11)
  return page.evaluate(async () => {
    const T = __harness.ninjaTest, L = __harness.luffyTest, a = T.raw('p1'), z = T.raw('p2'), out = []
    const keys = [['j', 6], ['j', 6], ['k', 10], ['l', 30], ['i', 20], ['w', 12], ['j', 14], ['s', 2], ['s', 2], ['k', 40]]
    for (const [k, n] of keys) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: 'Key' + k.toUpperCase() })); L.step(1)
      window.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: 'Key' + k.toUpperCase() }))
      for (let i = 0; i < n; i++) { L.step(1); out.push([a.x | 0, a.y | 0, a.health, z.health | 0, z.x | 0, a.currentMove || '', a.w, a.h, a.attacking ? 1 : 0]) }
    }
    return out
  })
}

try {
  await open()
  // ── the NORMAL character select
  const sel = await page.evaluate(() => __harness.gotoCharacterSelect('power_rangers'))
  check('Power Rangers character select lists "Ninja Storm MS_V1 Ranger Version" (windrangers)', sel.includes('windrangers'), sel.filter(k => /ns_|ninja|wind/.test(k)))
  const sk = await page.evaluate(() => __harness.showSkinSelect('windrangers', 'p1', 0))
  const ids = sk.skins.map(s => s.id)
  check('skin-select screen: Start as Red + Start as Yellow + the 10 pack skins first (then the 20 ChatGPT-version skins, harness/wr_cgpt_skins.test.mjs) + the Edo Tensei skin = 33', ids.length === 33 && ids[0] === 'default' && ids[1] === 'start_yellow' && ids.slice(12, 32).every(i => i.startsWith('wr_cg_')) && ids[32] === 'windrangers_edoTensei', ids)
  const want = { wr_alienx: 'Alien X — Constellation Leak', wr_disco: 'Disco Ball in a Blackout', wr_valkyrie: 'Winning Valkyrie — Final Rotation', wr_ghostfreak: 'Ghostfreak — Split Seam', wr_feedback: 'Feedback — Live Wire', wr_divergent: 'JJK — Divergent Impact', wr_salaryman: 'JJK — Salaryman Overtime', wr_kintsugi: 'Kintsugi Aftershock', wr_pitcrew: 'Midnight Pit Crew', wr_woodblock: 'Woodblock Storm' }
  check('the 10 skin names, in brief order', JSON.stringify(sk.skins.slice(2, 12).map(s => [s.id, s.name])) === JSON.stringify(Object.entries(want)), sk.skins.slice(2).map(s => s.name))
  const http = await page.evaluate(async () => { const m = await import('./skins.js'); const bad = []; let n = 0; for (const s of m.SKINS.windrangers.slice(2, 12)) for (const u of [s.portrait, s.hudIcon, ...new Set(Object.values(s.animationData).map(a => a.sheet))]) { n++; const r = await fetch(u, { method: 'HEAD' }); if (!r.ok) bad.push(u) } return { n, bad } })
  check(`every preview portrait + strip the skins reference loads (HTTP 200, ${http.n} files)`, http.bad.length === 0, http.bad.slice(0, 4))
  for (let i = 2; i < 12; i++) {
    await page.evaluate(i => { __harness.showSkinSelect('windrangers', 'p1', i); __harness.setSkinHover(i) }, i)
    await step(3)
    const id = ids[i], tag = id.slice(3)
    await page.screenshot({ path: `${SHOTS}/select_${tag}.png` })
    const p = await page.evaluate(i => __harness.pickSkin(i), i)
    check(`select screen: hover + pick "${want[id]}" (preview shot select_${tag}.png)`, p?.id === id, p)
  }
  // ── every skin in a real match: body, both forms, clone, FX folder; alpha / geometry untouched
  const geo = await page.evaluate(async () => {
    const load = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src })
    const px = async src => { const im = await load(src); if (!im) return null; const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data }
    const out = {}
    for (const t of ['alienx', 'disco', 'valkyrie', 'ghostfreak', 'feedback', 'divergent', 'salaryman', 'kintsugi', 'pitcrew', 'woodblock']) for (const form of ['ns_red', 'ns_yellow']) for (const strip of ['idle', 'sword', 'swordDome', 'streakTail']) {
      const r = await px(`./assets/${form}/${strip}.png`), d = await px(`./assets/windrangers/skins/${t}/${form}/${strip}.png`)
      let alpha = 0, col = 0; if (!r || !d || r.length !== d.length) { out[`${t}/${form}/${strip}`] = 'missing'; continue }
      for (let i = 0; i < r.length; i += 4) { if ((r[i + 3] > 0) !== (d[i + 3] > 0)) alpha++; else if (r[i + 3] && (r[i] !== d[i] || r[i + 1] !== d[i + 1] || r[i + 2] !== d[i + 2])) col++ }
      const keep = t === 'alienx'   // the showcase keeps the Ranger's own suit: only the space slice (arm / shoulder / chest) changes; the red-only afterimage smear stays red
      if (alpha || (keep ? (['idle', 'sword'].includes(strip) && col < 40) : col < 200)) out[`${t}/${form}/${strip}`] = { alpha, col }
    }
    return out
  })
  check('all 10 skins × both forms keep every silhouette pixel-exact (alpha = supplied sprites) and recolour the body', Object.keys(geo).length === 0, geo)

  const base = await script('default')
  for (const id of Object.keys(want)) {
    const tag = id.slice(3)
    await match(id)
    const a = await look()
    check(`${tag}: picked skin reaches the fighter (Red body + FX folder wear it)`, a.skin === id && a.wr === tag && a.key === 'ns_red' && a.idle.includes(`/skins/${tag}/ns_red/`) && a.dir.endsWith(`${tag}/ns_red`), a)
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); a.x = 760; z.x = 960 }); await step(20)
    await page.screenshot({ path: `${SHOTS}/match_${tag}_red.png` })
    const k = await swap(); const b = await look()
    check(`${tag}: form swap → Yellow keeps the skin (Yellow strips + FX folder)`, k === 'ns_yellow' && b.idle.includes(`/skins/${tag}/ns_yellow/`) && b.dir.endsWith(`${tag}/ns_yellow`), b)
    await step(20); await page.screenshot({ path: `${SHOTS}/match_${tag}_yellow.png` })
    const cl = await page.evaluate(async () => { const s = await import('./windrangersSkins.js'); const f = __harness.ninjaTest.raw('p1'); return s.wrCloneAnim(f, 'guard')?.sheet || null })
    const hasClone = ['alienx', 'feedback', 'woodblock'].includes(tag)
    check(`${tag}: shadow clone ${hasClone ? 'uses its own clone strips' : 'wears the body skin'}`, hasClone ? /\/clone_ns_yellow\//.test(cl || '') : cl === null && b.sword.includes(`/skins/${tag}/`), cl)
  }
  // ── the sim is untouched: same seed + same inputs → identical positions / health / moves / hurtbox in every skin
  for (const id of ['wr_alienx', 'wr_valkyrie', 'wr_pitcrew', 'wr_woodblock']) {
    const run = await script(id)
    const diff = run.findIndex((r, i) => JSON.stringify(r) !== JSON.stringify(base[i]))
    check(`${id.slice(3)}: 230-frame input script gives identical x/y/health/moves/hurtbox to the default skin`, run.length === base.length && diff === -1, diff === -1 ? '' : { at: diff, skin: run[diff], def: base[diff] })
  }
  // ── move-linked touches draw (render-only): one screenshot per skin mid-move
  for (const [id, keys, wait, probe] of [['wr_alienx', ['d', 'k'], 8, 'sword'], ['wr_feedback', ['l'], 6, null], ['wr_valkyrie', ['w', 'j'], 8, null], ['wr_disco', [], 4, null], ['wr_divergent', ['j'], 9, null], ['wr_salaryman', ['k'], 9, null], ['wr_pitcrew', [], 0, 'blink'], ['wr_kintsugi', [], 0, null], ['wr_woodblock', [], 0, null], ['wr_ghostfreak', [], 0, null]]) {
    await match(id)
    await page.evaluate(() => { const a = __harness.ninjaTest.raw('p1'), z = __harness.ninjaTest.raw('p2'); a.x = 600; z.x = 700; a.facing = 1 }); await step(10)
    for (const k of keys) { await page.keyboard.down(k); await step(2) }
    for (const k of keys) await page.keyboard.up(k)
    await step(wait)
    const st = await page.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); return { move: f.currentMove || null, act: f._lastSpriteAction, fx: !!f._wrFx, t: f._wrFx?.t || 0 } })
    await page.screenshot({ path: `${SHOTS}/fx_${id.slice(3)}.png` })
    check(`${id.slice(3)}: skin FX layer runs in a match (render state on f._wrFx only)${keys.length ? ' — move ' + st.move : ''}`, st.fx && st.t > 0 && (!probe || probe !== 'sword' || /sword|gale|sGale/i.test((st.act || '') + (st.move || ''))), st)
  }
  // the skin FX memory never enters the sim snapshot
  const snap = await page.evaluate(() => JSON.stringify(__harness.ninjaTest.state('p1')).includes('_wrFx'))
  check('render memory (_wrFx) is not part of the ninja sim state', !snap)
  check('no page errors', errors.length === 0, errors.slice(0, 3))
} catch (e) { console.log('CRASH', e.stack); FAIL++ }
await browser.close(); server.close?.()
console.log(`\nWR SKINS: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
