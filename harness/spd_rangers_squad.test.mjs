// spd_rangers_squad.test.mjs — S.P.D. Rangers (spdSquad.js): the whole B-Squad + Omega as ONE fighter with Ben's dial.
//   ↓ ↓ then J/K/L/O/P/U → Red / Blue / Green / Yellow / Pink / Omega. Run: node harness/spd_rangers_squad.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0
const ck = (name, cond, info = '') => { if (cond) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, info) } }

// ── A. module level ───────────────────────────────────────────────────────────────────────────────────────────────
const { characters } = await import('../characters.js')
const SQ = await import('../spdSquad.js')
const { SKINS } = await import('../skins.js'); await import('../spdSquadSkins.js')
ck('A. roster has spd_rangers "S.P.D. Rangers"', characters.spd_rangers?.name === 'S.P.D. Rangers' && !characters.spd_rangers.hidden)
ck('A. the six Rangers fold into the squad (hidden as standalone picks)', ['spd_red', 'spd_blue', 'spd_green', 'spd_yellow', 'spd_pink', 'omega_ranger'].every(k => characters[k]?.hidden === true))
ck('A. dial order J K L O P U = Red Blue Green Yellow Pink Omega', JSON.stringify(SQ.SQUAD_FORMS) === JSON.stringify(['spd_red', 'spd_blue', 'spd_green', 'spd_yellow', 'spd_pink', 'omega_ranger']) && JSON.stringify(SQ.SQUAD_BUTTONS) === JSON.stringify(['light', 'heavy', 'special', 'grab', 'charge', 'ultimate']))
const sk = SKINS.spd_rangers || []
const TH = ['spd_rangersAlienX', 'spd_rangers_squad_edo', 'spd_rangers_squad_shadow', 'spd_rangers_squad_heatblast', 'spd_rangers_squad_diamondhead', 'spd_rangers_squad_upgrade']
ck('A. six squad themes registered (Alien X id ends "AlienX" → starfield overlay)', TH.every(id => sk.some(s => s.id === id)) && sk.find(s => s.id === TH[0]).id.endsWith('AlienX'))
{ const fs = await import('node:fs'); const { squadThemeAnim } = await import('../spdSquadSkins.js'); await import('../spdRedSkins.js'); let bad = []
  for (const t of ['alienx', 'edo', 'shadow', 'heatblast', 'diamondhead', 'upgrade']) for (const f of SQ.SQUAD_FORMS) { const r = squadThemeAnim(f, t); const miss = r ? [...new Set(Object.values(r.anim).map(a => a?.sheet).filter(Boolean))].filter(x => !fs.existsSync(new URL('../' + x.replace(/^\.\//, ''), import.meta.url))) : ['(none)']; if (miss.length) bad.push(`${f}/${t}:${miss[0]}`) }
  ck('A. every Ranger × theme resolves to sheets on disk (36 sets)', !bad.length, bad.slice(0, 3).join(' '))
  ck('A. theme portraits on disk', ['alienx', 'edo', 'shadow', 'heatblast', 'diamondhead', 'upgrade'].every(t => fs.existsSync(new URL(`../assets/spd_rangers/portrait__${t}.png`, import.meta.url)))) }
ck('A. skins: default + "Start as" for the other five', sk[0]?.id === 'default' && ['blue', 'green', 'yellow', 'pink', 'omega'].every(c => sk.some(s => s.id === `spd_rangers_start_${c}`)), sk.map(s => s.id).join(','))
ck('A. start-form parser', SQ.squadStartForm('default') === 'spd_red' && SQ.squadStartForm('spd_rangers_start_pink') === 'spd_pink' && SQ.squadStartForm('spd_rangers_start_omega') === 'omega_ranger')
ck('A. no Math.random / wall clock in the sim module', !/Math\.random|performance\.now|Date\.now/.test((await import('node:fs')).readFileSync(new URL('../spdSquad.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')))

// ── B. live ─────────────────────────────────────────────────────────────────────────────────────────────────────
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
async function open(skin = 'default', p2 = 'luffy') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=spd_rangers&p2=${p2}&seed=5`); await page.waitForFunction(() => window.__harness?.spdSquad, null, { timeout: 60000 })
  await page.evaluate(s => { __harness.bootSkin(s, 'default'); __harness.setDummyBehavior?.('stand') }, skin); await page.evaluate(() => __harness.luffyTest.step(10))
  return page
}
const E = (page, fn, a) => page.evaluate(fn, a), step = (page, n) => E(page, n => __harness.luffyTest.step(n), n)
const st = page => E(page, () => { const s = __harness.spdSquad.state('p1'), a = __harness.gojoShinjukuTest.raw('p1'), b = __harness.gojoShinjukuTest.raw('p2'); return { ...s, hp: a.health, max: a.maxHealth, spd: a.speed, sheet: (a._skinAnim || a.animationData)?.idle?.sheet, tag: a._recolorTag || null, atk: a.attacking ? a.currentAttack?.name : null, foeHp: b.health, combo: a.comboCounter } })
const tap = async (page, k, n = 2) => { await page.keyboard.down(k); await step(page, n); await page.keyboard.up(k); await step(page, 1) }
const dial = async (page, k) => { await tap(page, 's'); await tap(page, 's'); await page.keyboard.down(k); await step(page, 2); await page.keyboard.up(k); await step(page, 2) }
try {
  let page = await open(), s = await st(page)
  ck('B. starts as Red with squad HP 1320', s.form === 'spd_red' && s.key === 'spd_red' && s.max === 1320 && s.hp === 1320, JSON.stringify(s))
  const KEYS = { spd_blue: 'k', spd_green: 'l', spd_yellow: 'o', spd_pink: 'p', omega_ranger: 'u', spd_red: 'j' }
  let hp0 = s.hp
  for (const [form, k] of Object.entries(KEYS)) {
    await step(page, 45); await dial(page, k); s = await st(page)
    ck(`B. ↓↓ + ${k.toUpperCase()} → ${form} (own sheet, own kit), press swallowed`, s.form === form && s.key === form && !s.atk && s.hp === hp0, JSON.stringify({ form: s.form, atk: s.atk, sheet: s.sheet }))
    ck(`B. ${form}: Red's pace or better (speed ≥ 88)`, s.spd >= 88, String(s.spd))
  }
  // cooldown: an immediate second swap is refused
  await dial(page, 'k'); s = await st(page); ck('B. swap cooldown: immediate re-dial refused', s.form === 'spd_red', s.form)
  // plain button without ↓↓ attacks normally
  await step(page, 45); await tap(page, 'j'); s = await st(page); ck('B. J without ↓↓ is a normal jab', s.form === 'spd_red' && s.atk === 'light', JSON.stringify(s))
  // hitstun refusal
  await step(page, 45); const r = await E(page, () => { const a = __harness.gojoShinjukuTest.raw('p1'); a.hitstun = 10; const ok = __harness.spdSquad.swap('p1', 'spd_blue'); a.hitstun = 0; return ok })
  ck('B. no swap while in hitstun', !r)
  // mid-combo tag: Red jab connects → ↓↓K in recovery → Blue jab continues the combo
  await E(page, () => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); a.x = 1200; b.x = 1262; a.facing = 1; b.facing = -1; b.health = b.maxHealth }); await step(page, 45)
  await page.keyboard.down('j'); await step(page, 2); await page.keyboard.up('j'); await step(page, 8)
  await tap(page, 's', 1); await tap(page, 's', 1); await page.keyboard.down('k'); await step(page, 1); await page.keyboard.up('k'); await step(page, 1)
  s = await st(page); const mid = s.form
  await page.keyboard.down('j'); await step(page, 2); await page.keyboard.up('j'); await step(page, 6); s = await st(page)
  ck('B. mid-combo tag-in: Red jab → Blue jab keeps the combo (combo ≥ 2)', mid === 'spd_blue' && s.combo >= 2, JSON.stringify({ mid, combo: s.combo }))
  await page.close()
  // Start-as skin
  page = await open('spd_rangers_start_omega'); s = await st(page)
  ck('B. "Start as: Omega" opens the round as the Omega Ranger', s.form === 'omega_ranger' && s.start === 'omega_ranger', JSON.stringify(s))
  await page.close()
  // squad theme follows every swap; nothing 404s
  { const bad404 = []; page = await open('spd_rangers_squad_heatblast'); page.on('response', r => { if (r.status() >= 400 && /\.png/.test(r.url())) bad404.push(r.url()) })
    const seen = {}; s = await st(page); seen[s.form] = s.sheet
    for (const k of ['k', 'l', 'o', 'p', 'u']) { await step(page, 45); await dial(page, k); s = await st(page); seen[s.form] = s.sheet }
    const want = { spd_red: '/skins/heatblast/spd_red/', spd_blue: '/skins/heatblast/', spd_green: '/skins/heatblast/', spd_yellow: '/skins/heatblast/', spd_pink: '/skins/heatblast/', omega_ranger: '/skins/heatblast/omega_ranger/' }
    ck('B. "Squad: Heatblast" — all six Rangers wear it through the swaps', Object.entries(want).every(([f, w]) => (seen[f] || '').includes(w)), JSON.stringify(seen))
    if (process.env.OUT) await page.screenshot({ path: process.env.OUT + '/squad_heatblast_omega.png' })
    await step(page, 5); ck('B. themed sheets all load (no 404)', !bad404.length, bad404.slice(0, 3).join(' ')); await page.close() }
  // determinism: same inputs → same trace
  const trace = async () => { const p = await open(); const t = []; for (const k of ['k', 'o', 'u', 'p']) { await step(p, 45); await dial(p, k); await tap(p, 'j'); t.push(JSON.stringify(await st(p))) } await p.close(); return t.join('|') }
  ck('B. deterministic (two identical runs)', await trace() === await trace())
  // CPU uses the dial
  page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&p1=spd_rangers&p2=naruto&seed=9`); await page.waitForFunction(() => window.__harness?.aiVsAi, null, { timeout: 60000 })
  const cpu = await page.evaluate(() => { window.requestAnimationFrame = () => 0; const x = __harness.aiVsAi.runToCompletion({ p1: 'spd_rangers', p2: 'naruto', p1Diff: 'adaptive', p2Diff: 'adaptive', matches: 1, speed: 8 }, 600000); const m = JSON.parse(x.json).matches[0]; return { moves: Object.keys(m.fighters?.p1?.movesUsed || {}), total: __harness.spdSquad.state('p1')?.total || 0 } })
  const fam = new Set(cpu.moves.map(k => /^[bgypo][A-Z]/.test(k) ? k[0] : /^s[A-Z]/.test(k) ? 's' : null).filter(Boolean))
  ck('B. CPU uses the dial (≥ 3 swaps in a match, kit moves from ≥ 2 Rangers)', cpu.total >= 3 && fam.size >= 2, JSON.stringify({ total: cpu.total, fam: [...fam] }))
  await page.close()
} finally { await browser.close(); server.close?.() }
ck('B. no page errors', !errors.length, errors.slice(0, 3).join(' | '))
console.log(`${pass} passed / ${fail} failed`); process.exit(fail ? 1 : 0)
