// mmpr_rangers_squad.test.mjs — Mighty Morphin Rangers (mmprSquad.js, squadCore.js): Red / Black / Pink / Green / White as ONE
// fighter with Ben's dial — ↓ ↓ then J/K/L/O/P. Plus MMPR Red parity (mmprParity.js). Run: node harness/mmpr_rangers_squad.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0
const ck = (name, cond, info = '') => { if (cond) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, info) } }

// ── A. module level ───────────────────────────────────────────────────────────────────────────────────────────────
const { characters } = await import('../characters.js')
const SQ = await import('../mmprSquad.js'); const KITS = (await import('../kits.js')).KITS
const { SKINS } = await import('../skins.js'); for (const m of ['mmprPinkSkins', 'mmprBlackSkins', 'greenRangerSkins', 'mmprWhiteSkins', 'mmprSquadSkins']) await import(`../${m}.js`)
const FORMS = ['red_ranger_mmpr', 'mmpr_black', 'mmpr_pink', 'green_ranger', 'mmpr_white']
ck('A. roster has mmpr_rangers "Mighty Morphin Rangers"', characters.mmpr_rangers?.name === 'Mighty Morphin Rangers' && !characters.mmpr_rangers.hidden)
ck('A. the five Rangers fold into the squad (hidden as standalone picks)', FORMS.every(k => characters[k]?.hidden === true))
ck('A. dial order J K L O P = Red Black Pink Green White', JSON.stringify(SQ.MMPR_SQUAD.forms) === JSON.stringify(FORMS) && JSON.stringify(SQ.MMPR_SQUAD.buttons) === JSON.stringify(['light', 'heavy', 'special', 'grab', 'charge']))
ck('A. Red parity: Black / Pink / Green / White move at Red\'s real pace (walk 130, dash 25.4, 2 jumps)', FORMS.slice(1).every(k => { const s = characters[k].stats; return s.speed >= 130 && s.dashSpeed >= 25.4 && s.maxJumps >= 2 && s.jumpPower >= 31 }))
ck('A. Red parity: shared normals on Red\'s frame data (Jab 4 f, Heavy 8 f), never weaker', FORMS.slice(1).every(k => { const b = characters[k].basic_attacks; return b.light.startup <= 4 && b.heavy.startup <= 8 && b.light.damage >= 45 && b.heavy.damage >= 88 }))
const sk = SKINS.mmpr_rangers || []
ck('A. skins: default + "Start as" for the other four', sk[0]?.id === 'default' && ['black', 'pink', 'green', 'white'].every(c => sk.some(s => s.id === `mmpr_rangers_start_${c}`)), sk.map(s => s.id).join(','))
ck('A. start-form parser', SQ.MMPR_SQUAD.startForm('default') === 'red_ranger_mmpr' && SQ.MMPR_SQUAD.startForm('mmpr_rangers_start_white') === 'mmpr_white')
const TH = ['mmpr_rangersAlienX', 'mmpr_rangers_squad_edo', 'mmpr_rangers_squad_heatblast', 'mmpr_rangers_squad_upgrade', 'mmpr_rangers_squad_diamondhead', 'mmpr_rangers_squad_ghostfreak']
ck('A. six squad themes registered (Alien X id ends "AlienX")', TH.every(id => sk.some(s => s.id === id)))
{ const fs = await import('node:fs'); const { mmprThemeAnim } = await import('../mmprSquadSkins.js'); let bad = []
  for (const t of ['alienx', 'edo', 'heatblast', 'upgrade', 'diamondhead', 'ghostfreak']) for (const f of FORMS) { const r = mmprThemeAnim(f, t); const miss = r ? [...new Set(Object.values(r.anim).map(a => a?.sheet).filter(Boolean))].filter(x => !fs.existsSync(new URL('../' + x.replace(/^\.\//, ''), import.meta.url))) : ['(none)']; if (miss.length) bad.push(`${f}/${t}:${miss[0]}`) }
  ck('A. every Ranger × theme resolves to sheets on disk (30 sets)', !bad.length, bad.slice(0, 3).join(' '))
  ck('A. theme portraits on disk', ['alienx', 'edo', 'heatblast', 'upgrade', 'diamondhead', 'ghostfreak'].every(t => fs.existsSync(new URL(`../assets/mmpr_rangers/portrait__${t}.png`, import.meta.url)))) }
ck('A. Move List: the dial + every Ranger\'s specials', KITS.mmpr_rangers?.specials?.filter(s => s.name.startsWith('CALL ')).length === 5 && KITS.mmpr_rangers.specials.length >= 25)
ck('A. no Math.random / wall clock in the squad engine', !/Math\.random|performance\.now|Date\.now/.test((await import('node:fs')).readFileSync(new URL('../squadCore.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')))

// ── B. live ─────────────────────────────────────────────────────────────────────────────────────────────────────
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
async function open(skin = 'default', p2 = 'luffy') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=mmpr_rangers&p2=${p2}&seed=5`); await page.waitForFunction(() => window.__harness?.spdSquad, null, { timeout: 60000 })
  await page.evaluate(s => { __harness.bootSkin(s, 'default'); __harness.setDummyBehavior?.('stand') }, skin); await page.evaluate(() => __harness.luffyTest.step(10))
  return page
}
const E = (page, fn, a) => page.evaluate(fn, a), step = (page, n) => E(page, n => __harness.luffyTest.step(n), n)
const st = page => E(page, () => { const s = __harness.spdSquad.state('p1'), a = __harness.gojoShinjukuTest.raw('p1'), b = __harness.gojoShinjukuTest.raw('p2'); return { ...s, hp: a.health, max: a.maxHealth, spd: a.speed, sheet: (a._skinAnim || a.animationData)?.idle?.sheet, tag: a._recolorTag || null, atk: a.attacking ? a.currentAttack?.name : null, foeHp: b.health, combo: a.comboCounter } })
const tap = async (page, k, n = 2) => { await page.keyboard.down(k); await step(page, n); await page.keyboard.up(k); await step(page, 1) }
const dial = async (page, k) => { await tap(page, 's'); await tap(page, 's'); await page.keyboard.down(k); await step(page, 2); await page.keyboard.up(k); await step(page, 2) }
try {
  let page = await open(), s = await st(page)
  ck('B. starts as Red with squad HP 1320 at Red\'s real pace', s.form === 'red_ranger_mmpr' && s.key === 'red_ranger_mmpr' && s.spd === 130 && s.max === 1320 && s.hp === 1320, JSON.stringify(s))
  const KEYS = { mmpr_black: 'k', mmpr_pink: 'l', green_ranger: 'o', mmpr_white: 'p', red_ranger_mmpr: 'j' }
  let hp0 = s.hp
  for (const [form, k] of Object.entries(KEYS)) {
    await step(page, 45); await dial(page, k); s = await st(page)
    ck(`B. ↓↓ + ${k.toUpperCase()} → ${form} (own sheet, own kit), press swallowed`, s.form === form && s.key === form && !s.atk && s.hp === hp0, JSON.stringify({ form: s.form, atk: s.atk, sheet: s.sheet }))
    ck(`B. ${form}: Red's real pace (speed 130)`, s.spd >= 130, String(s.spd))
  }
  // cooldown: an immediate second swap is refused
  await dial(page, 'k'); s = await st(page); ck('B. swap cooldown: immediate re-dial refused', s.form === 'red_ranger_mmpr', s.form)
  // plain button without ↓↓ attacks normally
  await step(page, 45); await tap(page, 'j'); s = await st(page); ck('B. J without ↓↓ is a normal jab', s.form === 'red_ranger_mmpr' && s.atk === 'light', JSON.stringify(s))
  // hitstun refusal
  await step(page, 45); const r = await E(page, () => { const a = __harness.gojoShinjukuTest.raw('p1'); a.hitstun = 10; const ok = __harness.spdSquad.swap('p1', 'mmpr_black'); a.hitstun = 0; return ok })
  ck('B. no swap while in hitstun', !r)
  // mid-combo tag: Red jab connects → ↓↓K in recovery → Blue jab continues the combo
  await E(page, () => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); a.x = 1200; b.x = 1262; a.facing = 1; b.facing = -1; b.health = b.maxHealth }); await step(page, 45)
  await page.keyboard.down('j'); await step(page, 2); await page.keyboard.up('j'); await step(page, 8)
  await tap(page, 's', 1); await tap(page, 's', 1); await page.keyboard.down('k'); await step(page, 1); await page.keyboard.up('k'); await step(page, 1)
  s = await st(page); const mid = s.form
  await page.keyboard.down('j'); await step(page, 2); await page.keyboard.up('j'); await step(page, 6); s = await st(page)
  ck('B. mid-combo tag-in: Red jab → Black jab keeps the combo (combo ≥ 2)', mid === 'mmpr_black' && s.combo >= 2, JSON.stringify({ mid, combo: s.combo }))
  await page.close()
  // Start-as skin
  page = await open('mmpr_rangers_start_white'); s = await st(page)
  ck('B. "Start as: White" opens the round as the White Ranger', s.form === 'mmpr_white' && s.start === 'mmpr_white', JSON.stringify(s))
  await page.close()
  // squad theme follows every swap; nothing 404s
  { const bad404 = []; page = await open('mmpr_rangers_squad_heatblast'); page.on('response', r => { if (r.status() >= 400 && /\.png/.test(r.url())) bad404.push(r.url()) })
    const seen = {}; s = await st(page); seen[s.form] = s.sheet
    for (const k of ['k', 'l', 'o', 'p']) { await step(page, 45); await dial(page, k); s = await st(page); seen[s.form] = s.sheet }
    const want = { red_ranger_mmpr: '/skins/heatblast/red_ranger_mmpr/', mmpr_black: 'heatblast', mmpr_pink: 'heatblast', green_ranger: 'heatblast', mmpr_white: 'heatblast' }
    ck('B. "Squad: Heatblast" — all five Rangers wear it through the swaps', Object.entries(want).every(([f, w]) => (seen[f] || '').includes(w)), JSON.stringify(seen))
    if (process.env.OUT) await page.screenshot({ path: process.env.OUT + '/mmpr_heatblast.png' })
    await step(page, 5); ck('B. themed sheets all load (no 404)', !bad404.length, bad404.slice(0, 3).join(' ')); await page.close() }
  // determinism: same inputs → same trace
  const trace = async () => { const p = await open(); const t = []; for (const k of ['k', 'o', 'l', 'p']) { await step(p, 45); await dial(p, k); await tap(p, 'j'); t.push(JSON.stringify(await st(p))) } await p.close(); return t.join('|') }
  ck('B. deterministic (two identical runs)', await trace() === await trace())
  // CPU uses the dial
  page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&p1=mmpr_rangers&p2=naruto&seed=9`); await page.waitForFunction(() => window.__harness?.aiVsAi, null, { timeout: 60000 })
  const cpu = await page.evaluate(() => { window.requestAnimationFrame = () => 0; const x = __harness.aiVsAi.runToCompletion({ p1: 'mmpr_rangers', p2: 'naruto', p1Diff: 'adaptive', p2Diff: 'adaptive', matches: 1, speed: 8 }, 600000); const m = JSON.parse(x.json).matches[0]; return { moves: Object.keys(m.fighters?.p1?.movesUsed || {}), total: __harness.spdSquad.state('p1')?.total || 0 } })
  ck('B. CPU uses the dial (≥ 3 swaps in a match)', cpu.total >= 3, JSON.stringify({ total: cpu.total, moves: cpu.moves.slice(0, 20) }))
  await page.close()
} finally { await browser.close(); server.close?.() }
ck('B. no page errors', !errors.length, errors.slice(0, 3).join(' | '))
console.log(`${pass} passed / ${fail} failed`); process.exit(fail ? 1 : 0)
