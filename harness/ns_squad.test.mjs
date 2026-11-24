// ns_squad.test.mjs — Ninja Storm Squad (nsSquad.js, squadCore.js): Shane / Dustin / Tori / Blake / Cam as ONE fighter with
// Ben's dial — ↓ ↓ then J/K/L/O/P; Mirror = ↓↓ + own button; ↓↓ + U = Burrow / Super Samurai / Mirror.
// Run: node harness/ns_squad.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0
const ck = (name, cond, info = '') => { if (cond) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, info) } }

// ── A. module level ───────────────────────────────────────────────────────────────────────────────────────────────
const { characters } = await import('../characters.js')
const SQ = await import('../nsSquad.js'); const KITS = (await import('../kits.js')).KITS
const { SKINS } = await import('../skins.js'); await import('../nsSquadSkins.js')
const FORMS = ['ns_red', 'ns_yellow', 'ns_blue', 'ns_navy', 'ns_green']
ck('A. roster has ns_squad "Ninja Storm Squad"', characters.ns_squad?.name === 'Ninja Storm Squad' && !characters.ns_squad.hidden)
ck('A. windrangers + ns_trio + the five forms fold into the squad (hidden picks, still valid ids)', ['windrangers', 'ns_trio', ...FORMS].every(k => characters[k]?.hidden === true))
ck('A. dial order J K L O P = Shane Dustin Tori Blake Cam', JSON.stringify(SQ.NS_SQUAD.forms) === JSON.stringify(FORMS))
const sk = SKINS.ns_squad || []
ck('A. skins: default + "Start as" ×4 + 5 squad themes', sk[0]?.id === 'default' && ['yellow', 'blue', 'navy', 'green'].every(c => sk.some(s => s.id === `ns_squad_start_${c}`)) && sk.filter(s => s.squadTheme).length === 5, sk.map(s => s.id).join(','))
ck('A. start-form parser', SQ.NS_SQUAD.startForm('default') === 'ns_red' && SQ.NS_SQUAD.startForm('ns_squad_start_green') === 'ns_green')
{ const fs = await import('node:fs')
  ck('A. portraits on disk', ['portrait', 'portrait__alienx', 'portrait__gold', 'portrait__shadow', 'portrait__neon', 'portrait__glitter'].every(n => fs.existsSync(new URL(`../assets/ns_squad/${n}.png`, import.meta.url)))) }
ck('A. Move List: 5 CALL rows + every ninja\'s specials', KITS.ns_squad?.specials?.filter(s => s.name.startsWith('CALL ')).length === 5 && KITS.ns_squad.specials.length >= 30, KITS.ns_squad?.specials?.length)

// ── B. live ─────────────────────────────────────────────────────────────────────────────────────────────────────
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
async function open(skin = 'default', p2 = 'luffy') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=ns_squad&p2=${p2}&seed=5`); await page.waitForFunction(() => window.__harness?.spdSquad, null, { timeout: 90000 })
  await page.evaluate(s => { __harness.bootSkin(s, 'default'); __harness.setDummyBehavior?.('stand') }, skin); await page.evaluate(() => __harness.luffyTest.step(10))
  return page
}
const E = (page, fn, a) => page.evaluate(fn, a), step = (page, n) => E(page, n => __harness.luffyTest.step(n), n)
const st = page => E(page, () => { const s = __harness.spdSquad.state('p1'), a = __harness.gojoShinjukuTest.raw('p1'), b = __harness.gojoShinjukuTest.raw('p2'), n = a._ninja || {}
  return { ...s, hp: a.health, max: a.maxHealth, spd: a.speed, sheet: (a._skinAnim || a.animationData)?.idle?.sheet, atk: a.attacking ? a.currentMove : null, combo: a.comboCounter || b.comboCount || 0,
    mirror: !!n.mirror, burrow: !!n.burrow, samurai: a._squad?.samurai || 0, np: n.np, ninja: !!a._ninja, nsDir: a._nsAssetDir || null } })
const tap = async (page, k, n = 2) => { await page.keyboard.down(k); await step(page, n); await page.keyboard.up(k); await step(page, 1) }
const dial = async (page, k, hold = 2) => { await tap(page, 's'); await tap(page, 's'); await page.keyboard.down(k); await step(page, hold); await page.keyboard.up(k); await step(page, 2) }
try {
  let page = await open(), s = await st(page)
  ck('B. starts as Shane with squad HP 1320, ninja engine live', s.form === 'ns_red' && s.key === 'ns_red' && s.max === 1320 && s.hp === 1320 && s.ninja, JSON.stringify(s))
  const KEYS = { ns_yellow: 'k', ns_blue: 'l', ns_navy: 'o', ns_green: 'p', ns_red: 'j' }
  const hp0 = s.hp
  for (const [form, k] of Object.entries(KEYS)) {
    await step(page, 45); await dial(page, k); s = await st(page)
    ck(`B. ↓↓ + ${k.toUpperCase()} → ${form} (own sheet, own kit), press swallowed`, s.form === form && s.key === form && !s.atk && s.hp === hp0 && (s.sheet || '').includes(`/${form}/`), JSON.stringify({ form: s.form, atk: s.atk, sheet: s.sheet }))
  }
  await dial(page, 'k'); s = await st(page); ck('B. swap cooldown: immediate re-dial refused', s.form === 'ns_red', s.form)
  await step(page, 45); await tap(page, 'j'); s = await st(page); ck('B. J without ↓↓ is a normal attack', s.form === 'ns_red' && !!s.atk, JSON.stringify(s))
  await step(page, 45); const r = await E(page, () => { const a = __harness.gojoShinjukuTest.raw('p1'); a.hitstun = 10; const ok = __harness.spdSquad.swap('p1', 'ns_yellow'); a.hitstun = 0; return ok })
  ck('B. no swap while in hitstun', !r)
  // Mirror = ↓↓ + the active ninja's own button
  await step(page, 60); await E(page, () => { __harness.gojoShinjukuTest.raw('p1')._ninja.np = 100 }); await dial(page, 'j'); s = await st(page)
  ck('B. Shane: ↓↓ + J (own button) = Ninja Mirror, no swap', s.form === 'ns_red' && s.mirror, JSON.stringify(s))
  await step(page, 400)
  // Cam: ↓↓ + U = Super Samurai Mode; a switch ends it
  await dial(page, 'p'); await step(page, 50); await E(page, () => { __harness.gojoShinjukuTest.raw('p1')._ninja.np = 100 }); await dial(page, 'u'); await step(page, 20); s = await st(page)
  const camSpd = s.spd
  ck('B. Cam: ↓↓ + U = Super Samurai Mode (timer running)', s.form === 'ns_green' && s.samurai > 200, JSON.stringify(s))
  await step(page, 30); await dial(page, 'k'); s = await st(page)
  ck('B. a switch ends Super Samurai Mode', s.form === 'ns_yellow' && s.samurai === 0, JSON.stringify(s))
  // Dustin: ↓↓ + U (held) = Earth Burrow, stays under while U is held
  await step(page, 50); await E(page, () => { __harness.gojoShinjukuTest.raw('p1')._ninja.np = 100 })
  await tap(page, 's'); await tap(page, 's'); await page.keyboard.down('u'); await step(page, 20); s = await st(page)
  ck('B. Dustin: ↓↓ + U held = Earth Burrow, still under after 20 f', s.form === 'ns_yellow' && s.burrow, JSON.stringify(s))
  await page.keyboard.up('u'); await step(page, 40); s = await st(page); ck('B. Dustin surfaces when U is released', !s.burrow, JSON.stringify(s))
  // mid-combo tag
  await E(page, () => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); a.x = 1200; b.x = 1262; a.facing = 1; b.facing = -1; b.health = b.maxHealth }); await step(page, 60)
  await page.keyboard.down('j'); await step(page, 2); await page.keyboard.up('j'); await step(page, 8)
  await tap(page, 's', 1); await tap(page, 's', 1); await page.keyboard.down('l'); await step(page, 1); await page.keyboard.up('l'); await step(page, 1)
  s = await st(page); const mid = s.form
  await page.keyboard.down('j'); await step(page, 2); await page.keyboard.up('j'); await step(page, 8); s = await st(page)
  ck('B. mid-combo tag-in: Dustin jab → Tori jab keeps the combo', mid === 'ns_blue' && s.combo >= 2, JSON.stringify({ mid, combo: s.combo }))
  await page.close()
  page = await open('ns_squad_start_navy'); s = await st(page)
  ck('B. "Start as: Navy" opens the round as Blake', s.form === 'ns_navy' && s.start === 'ns_navy', JSON.stringify(s))
  await page.close()
  for (const [id, wr, tr] of [['ns_squad_squad_gold', 'kintsugi', 'amulet'], ['ns_squad_squad_alienx', 'alienx', 'alienx']]) {
    const bad404 = []; page = await open(id); page.on('response', r => { if (r.status() >= 400 && /\.png/.test(r.url())) bad404.push(r.url()) })
    const seen = {}; s = await st(page); seen[s.form] = s.sheet
    for (const k of ['k', 'l', 'o', 'p']) { await step(page, 45); await dial(page, k); s = await st(page); seen[s.form] = s.sheet; await step(page, 30) }
    const ok = ['ns_red', 'ns_yellow'].every(f => (seen[f] || '').includes(`/windrangers/skins/${wr}/${f}/`)) && ['ns_blue', 'ns_navy', 'ns_green'].every(f => (seen[f] || '').includes(`/ns_trio/skins/${tr}/${f}/`))
    ck(`B. ${id}: every ninja wears their own pack's look through the swaps`, ok, JSON.stringify(seen))
    if (process.env.OUT) await page.screenshot({ path: `${process.env.OUT}/${id}.png` })
    await step(page, 5); ck(`B. ${id}: themed sheets all load (no 404)`, !bad404.length, bad404.slice(0, 3).join(' ')); await page.close()
  }
  const trace = async () => { const p = await open(); const t = []; for (const k of ['k', 'o', 'l', 'p']) { await step(p, 45); await dial(p, k); await tap(p, 'j'); t.push(JSON.stringify(await st(p))) } await p.close(); return t.join('|') }
  ck('B. deterministic (two identical runs)', await trace() === await trace())
  page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&p1=ns_squad&p2=naruto&seed=9`); await page.waitForFunction(() => window.__harness?.aiVsAi, null, { timeout: 90000 })
  const cpu = await page.evaluate(() => { window.requestAnimationFrame = () => 0; const x = __harness.aiVsAi.runToCompletion({ p1: 'ns_squad', p2: 'naruto', p1Diff: 'adaptive', p2Diff: 'adaptive', matches: 1, speed: 8 }, 600000); const m = JSON.parse(x.json).matches[0]; return { total: __harness.spdSquad.state("p1")?.total || 0, winner: m?.winner } })
  ck('B. CPU uses the dial (≥ 3 swaps in a match)', cpu.total >= 3, JSON.stringify(cpu))
  await page.close()
} finally { await browser.close(); server.close?.() }
ck('B. no page errors', !errors.length, errors.slice(0, 3).join(' | '))
console.log(`${pass} passed / ${fail} failed`); process.exit(fail ? 1 : 0)
