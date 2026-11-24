// megazord.test.mjs — MSV1-MEGAZORD: the Mighty Morphin Rangers' THUNDER MEGAZORD add-on ultimate (megazord.js, U + L).
// Run: node harness/megazord.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0
const ck = (name, cond, info = '') => { if (cond) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, info) } }

// ── A. module level ──
const { characters } = await import('../characters.js')
const M = await import('../megazord.js'); const { MMPR_SQUAD } = await import('../mmprSquad.js'); const { MZ_SHEETS } = await import('../megazordSprites.js')
ck('A. not a character: no roster entry / select tile', !characters[M.MZ_FORM] && !Object.values(characters).some(c => c?.rosterKey === M.MZ_FORM))
ck('A. the squad dial is unchanged (J K L O P = the five Rangers)', JSON.stringify(MMPR_SQUAD.forms) === JSON.stringify(['red_ranger_mmpr', 'mmpr_black', 'mmpr_pink', 'green_ranger', 'mmpr_white']))
ck('A. registered as a hidden squad add-on form', MMPR_SQUAD.formChar(M.MZ_FORM)?.hidden === true)
const MV = M.MZ_MOVES
ck('A. brief damage values', MV.mzLight.damage === 60 && MV.mzCLight.damage === 55 && MV.mzHeavy.damage === 80 && MV.mzCHeavy.damage === 85 && MV.mzAirLight.damage === 85 && MV.mzAirHeavy.damage === 85 &&
  MV.mzSlash.damage === 110 && MV.mzSlash.startup === 14 && MV.mzAirSaber.damage === 115 && MV.mzRising.damage === 100 && MV.mzRising.launcher && M.MZ.fire.dmg === 90 && MV.mzLunge.damage === 100 && MV.mzFinal.damage === 250)
ck('A. crouch heavy is a low', MV.mzCHeavy.hitLevel === 'low')
ck('A. 12 s, 600 armor, cost 100, chord window 3 f, charge 40 f, shock 60', M.MZ.timer === 720 && M.MZ.armor === 600 && M.MZ.cost === 100 && M.MZ.chord === 3 && M.MZ.charge === 40 && M.MZ.shock === 60)
ck('A. every strip is a real sheet + the R14 portrait', Object.values(M.MZ_ANIM).every(a => a.sheet && a.frames > 0 && a.frameWidth > 0) && !!MZ_SHEETS.portrait?.src)
ck('A. five captions in Ranger colours', M.CAPTIONS.length === 5 && M.CAPTIONS[0][0] === 'Tyrannosaurus Red Dragon Thunderzord Power!' && M.CAPTIONS[4][0] === 'Pterodactyl Firebird Thunderzord Power!')
{ const fs = await import('node:fs'); const src = fs.readFileSync(new URL('../megazord.js', import.meta.url), 'utf8')
  const code = src.replace(/\/\/.*$/gm, ''); ck('A. no Math.random / clock in the sim', !/Math\.random|performance\.now|Date\.now/.test(code)) }

// ── B. live ──
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
async function open(skin = 'default', p2 = 'luffy') {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=mmpr_rangers&p2=${p2}&seed=5`); await page.waitForFunction(() => window.__harness?.spdSquad, null, { timeout: 90000 })
  await page.evaluate(s => { __harness.bootSkin(s, 'default'); __harness.setDummyBehavior?.('stand') }, skin); await page.evaluate(() => __harness.luffyTest.step(10))
  return page
}
const E = (page, fn, a) => page.evaluate(fn, a), step = (page, n) => E(page, n => __harness.luffyTest.step(n), n)
const st = page => E(page, async () => { const M = await import('./megazord.js'); const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2')
  return { mz: M.megazordStatus(a), key: a.rosterKey, form: a._squad?.form, hp: a.health, en: +(a.energy || 0).toFixed(2), x: a.x, y: a.y, w: a.w, h: a.h, atk: a.attacking ? a.currentAttack?.name : null, hs: a.hitstun || 0,
    ohp: b.health, ox: b.x, ohs: b.hitstun || 0, sheet: (a._skinAnim || a.animationData)?.idle?.sheet, total: a._mzTotal || 0, ends: a._mzEnds || {}, vuln: a._mzVuln || 0, grabbed: !!a.isGrabbed } })
const set = (page, o) => E(page, o => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); Object.assign(a, o.a || {}); Object.assign(b, o.b || {}) }, o)
const press = async (page, keys, n = 2) => { for (const k of keys) await page.keyboard.down(k); await step(page, n); for (const k of keys) await page.keyboard.up(k); await step(page, 1) }
const tap = (page, k, n = 2) => press(page, [k], n)
const refill = page => E(page, () => { const m = __harness.gojoShinjukuTest.raw('p1')._squad?.mz; if (m?.phase === 'mode') m.timer = 720 })
const CINE_END = 190
async function transform(page) { await set(page, { a: { energy: 100 } }); await press(page, ['u', 'l']); await step(page, CINE_END) }
const near = (page, d = 170) => set(page, { b: { health: 1000 } }).then(() => E(page, d => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); b.x = a.x + a.w + d - 48; b.facing = -1; a.facing = 1; b.vx = 0; b.hitstun = 0 }, d))
try {
  let page = await open(), s = await st(page)
  const hp0 = s.hp
  ck('B. starts as Red, no Megazord', s.form === 'red_ranger_mmpr' && !s.mz, JSON.stringify(s))
  await set(page, { a: { energy: 60 } }); await press(page, ['u', 'l']); s = await st(page)
  ck('B. refused without a full meter', !s.mz, JSON.stringify(s.mz))
  await step(page, 60); await set(page, { a: { energy: 100, hitstun: 12 } }); await press(page, ['u', 'l'], 1); s = await st(page)
  ck('B. refused in hitstun', !s.mz)
  await step(page, 60); await set(page, { a: { energy: 100 } }); await press(page, ['u', 'l']); s = await st(page)
  ck('B. U + L together → the cinematic, meter spent (100)', s.mz?.phase === 'cine' && s.en < 1, JSON.stringify(s))
  ck('B. call pose = the active Ranger\'s own (Red: morpher raise)', s.mz?.pose === 'introMorpher', s.mz?.pose)
  await step(page, 100); s = await st(page); ck('B. during the captions the Ranger is still on screen', s.key === 'red_ranger_mmpr' && s.mz.phase === 'cine')
  await step(page, 50); s = await st(page)
  ck('B. the Megazord has dropped in and kneels (R1)', s.key === M.MZ_FORM && s.mz.pose === 'kneel' && s.h === M.MZ.h, JSON.stringify(s.mz))
  await step(page, 14); s = await st(page); ck('B. rises into the R4 saber raise', s.mz.pose === 'raise', s.mz.pose)
  await step(page, 30); s = await st(page)
  ck('B. control returns: MEGAZORD MODE, 600 armor, 12 s', s.mz.phase === 'mode' && s.mz.armor === 600 && s.mz.timer > 690, JSON.stringify(s.mz))
  ck('B. bigger hurtbox (the camera zooms out to frame it)', s.w === M.MZ.w && s.h === M.MZ.h)
  // swaps are disabled
  await tap(page, 's'); await tap(page, 's'); await tap(page, 'k'); s = await st(page)
  ck('B. ↓↓ + K does not swap Rangers while the Megazord is out', s.key === M.MZ_FORM && s.form === 'red_ranger_mmpr', JSON.stringify({ key: s.key, form: s.form }))
  ck('B. swap() refuses with "locked"', await E(page, () => __harness.spdSquad.swap('p1', 'mmpr_black')) === false)
  // moves
  const moveRuns = {}
  for (const [name, keys, pre] of [['mzLight', ['j']], ['mzHeavy', ['k']], ['mzSlash', ['l']], ['mzCLight', ['s', 'j']], ['mzCHeavy', ['s', 'k']], ['mzRising', ['w', 'l']]]) {
    await step(page, 40); await refill(page); await near(page, 70); await step(page, 2)
    await press(page, keys, 2); await step(page, 1); s = await st(page); moveRuns[name] = s.atk
    await step(page, 40); const s2 = await st(page)
    ck(`B. ${name} (${keys.join('+').toUpperCase()}) runs and lands`, moveRuns[name] === name && s2.ohp < 1000, JSON.stringify({ atk: s.atk, ohp: s2.ohp }))
  }
  // health frozen + armor takes the hit + super armor
  await refill(page)
  await step(page, 30); await near(page, 40); s = await st(page); const hpFrozen = s.hp
  await E(page, () => { const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); b.attacking = false; b.attackCooldown = 0 })
  await E(page, () => __harness.gojoShinjukuTest.raw('p2').hitstun = 0)
  const hitRes = await E(page, async () => { const C = await import('./combat.js'); const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); const before = a.health; C.applyScaledDamage(a, 90, { attacker: b, move: 'test' }); return { before, after: a.health } })
  s = await st(page)
  ck('B. a hit goes to ARMOR; the Ranger\'s health is frozen', hitRes.after === hitRes.before && s.mz.armor < 600 && s.hp === hpFrozen, JSON.stringify({ hitRes, armor: s.mz.armor }))
  await set(page, { a: { hitstun: 15 } }); await step(page, 1); s = await st(page)
  ck('B. super armor: a normal hit\'s hitstun is shrugged', s.hs === 0, s.hs)
  const grab = await E(page, async () => { const C = await import('./combat.js'); const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); b.attackCooldown = 0; b.attacking = false; b.x = a.x - 40; return C.tryGrab ? C.tryGrab(b, a) : 'n/a' })
  s = await st(page); ck('B. cannot be grabbed', grab === false || grab === 'n/a' ? !s.grabbed : false, String(grab))
  // fireball (↓↘→ + L)
  await refill(page)
  await step(page, 40); await near(page, 600); await step(page, 2)
  await page.keyboard.down('s'); await step(page, 2); await page.keyboard.down('d'); await step(page, 2); await page.keyboard.up('s'); await step(page, 2); await page.keyboard.down('l'); await step(page, 2); await page.keyboard.up('l'); await page.keyboard.up('d'); await step(page, 1)
  s = await st(page); ck('B. ↓↘→ + L = THUNDER FIREBALL', s.atk === 'mzFire', s.atk)
  await step(page, 20); s = await st(page); ck('B. the fireball flies', s.mz.shots === 1, JSON.stringify(s.mz))
  await step(page, 70); s = await st(page); ck('B. it crosses the screen and hits (600 px away)', s.ohp < 1000 && s.mz.shots === 0, JSON.stringify({ ohp: s.ohp, shots: s.mz.shots }))
  // saber lunge (→→ + L): 50 % of the screen
  await refill(page)
  await step(page, 40); await near(page, 900); await step(page, 2); s = await st(page); const x0 = s.x
  await tap(page, 'd', 1); await step(page, 1); await page.keyboard.down('d'); await step(page, 1); await page.keyboard.down('l'); await step(page, 2); await page.keyboard.up('l'); await page.keyboard.up('d'); await step(page, 1)
  s = await st(page); ck('B. →→ + L = SABER LUNGE', s.atk === 'mzLunge', s.atk)
  await step(page, 30); s = await st(page); ck('B. the lunge travels ~50 % of the screen', s.x - x0 >= 600, Math.round(s.x - x0))
  // saber charge (↓↓ + L): 40 f, shock, then +50 % on the next saber
  await refill(page)
  await step(page, 40); await near(page, 300); await step(page, 2)
  await tap(page, 's', 1); await tap(page, 's', 1); await page.keyboard.down('l'); await step(page, 2); await page.keyboard.up('l'); await step(page, 1); s = await st(page)
  ck('B. ↓↓ + L = SABER CHARGE (charging)', s.atk === 'mzCharge' && s.mz.chargeT > 0, JSON.stringify(s.mz))
  const shock = await E(page, async () => { const C = await import('./combat.js'); const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); const before = b.health; C.applyScaledDamage(a, 50, { attacker: b, move: 'test' }); return before - b.health })
  ck('B. hitting the charging Megazord shocks the attacker', shock > 0, shock)
  await step(page, 60); s = await st(page); ck('B. charge completes → SABER CHARGED', s.mz.charged, JSON.stringify(s.mz))
  await near(page, 120); await set(page, { b: { health: 1000 } }); await step(page, 2); await tap(page, 'l'); await step(page, 30); s = await st(page)
  const charged = 1000 - s.ohp
  await step(page, 30); await near(page, 120); await set(page, { b: { health: 1000 } }); await step(page, 2); await tap(page, 'l'); await step(page, 30); s = await st(page)
  const plain = 1000 - s.ohp
  ck('B. the charged saber does +50 % (charged vs plain slash)', charged > plain * 1.35 && !s.mz.charged, JSON.stringify({ charged, plain }))
  // FINISHER: U + L again
  await refill(page)
  await step(page, 40); await near(page, 200); await set(page, { b: { health: 1000 } }); s = await st(page)
  await press(page, ['u', 'l']); s = await st(page)
  ck('B. U + L again = THUNDER SABER FINAL STRIKE', s.atk === 'mzFinal' && s.mz.finisher, JSON.stringify(s.mz))
  await step(page, 140); s = await st(page)
  ck('B. the finisher hits hard (≥ 150) and ends the mode', 1000 - s.ohp >= 150 && s.mz.phase === 'done' && s.mz.end === 'finisher', JSON.stringify({ dmg: 1000 - s.ohp, mz: s.mz }))
  ck('B. separation: back to the calling Ranger with the same health, normal size', s.key === 'red_ranger_mmpr' && s.hp === hp0 && s.h !== M.MZ.h, JSON.stringify({ key: s.key, hp: s.hp, hp0, h: s.h }))
  await step(page, 120); await set(page, { a: { energy: 100 } }); await press(page, ['u', 'l']); s = await st(page)
  ck('B. once per round', s.mz.phase === 'done' && s.total === 1, JSON.stringify(s.mz))
  await step(page, 60); await tap(page, 's'); await tap(page, 's'); await tap(page, 'k'); s = await st(page)
  ck('B. swapping is back after separation', s.form === 'mmpr_black', s.form)
  await page.close()

  // timer ends it; armor break
  page = await open(); await transform(page); await step(page, 740); s = await st(page)
  ck('B. the timer runs out → separation', s.mz.end === 'time' && s.key === 'red_ranger_mmpr', JSON.stringify(s.mz))
  await page.close()
  page = await open(); await transform(page)
  await E(page, async () => { const C = await import('./combat.js'); const H = __harness.gojoShinjukuTest, a = H.raw('p1'), b = H.raw('p2'); C.applyScaledDamage(a, 5000, { attacker: b, move: 'test' }) })
  await step(page, 2); s = await st(page)
  ck('B. ARMOR BREAK → the R13 collapse', s.mz.phase === 'break' && s.mz.pose === 'collapse', JSON.stringify(s.mz))
  await step(page, 50); s = await st(page)
  ck('B. after the collapse the Ranger is out and vulnerable (30 f)', s.mz.end === 'break' && s.key === 'red_ranger_mmpr' && s.vuln > 0 && s.hp === hp0, JSON.stringify({ end: s.mz.end, key: s.key, vuln: s.vuln, hp: s.hp }))
  await page.close()

  // input edge cases: U alone still fires the Ranger's own ultimate; U then L 2 f later still transforms; L alone still a special
  page = await open(); await set(page, { a: { energy: 100 } }); await tap(page, 'u', 6); await step(page, 3); s = await st(page)
  ck('B. U alone (full meter) still fires the Ranger\'s own ultimate', !s.mz && s.en < 100, JSON.stringify({ en: s.en, mz: s.mz }))
  await page.close()
  page = await open(); await set(page, { a: { energy: 100 } }); await page.keyboard.down('u'); await step(page, 2); await page.keyboard.down('l'); await step(page, 2); await page.keyboard.up('u'); await page.keyboard.up('l'); await step(page, 1); s = await st(page)
  ck('B. U then L 2 frames later → Megazord', s.mz?.phase === 'cine', JSON.stringify(s.mz))
  await page.close()
  page = await open(); await set(page, { a: { energy: 100 } }); await page.keyboard.down('l'); await step(page, 2); await page.keyboard.down('u'); await step(page, 2); await page.keyboard.up('u'); await page.keyboard.up('l'); await step(page, 1); s = await st(page)
  ck('B. L then U 2 frames later → Megazord (the special is cancelled, meter whole)', s.mz?.phase === 'cine' && s.en < 1, JSON.stringify({ mz: s.mz?.phase, en: s.en }))
  await page.close()
  const lAlone = async en => { const p = await open(); await set(p, { a: { energy: en } }); const t = []; await tap(p, 'l'); for (let i = 0; i < 6; i++) { const q = await st(p); t.push(JSON.stringify({ atk: q.atk, x: q.x, y: q.y, ohp: q.ohp, hs: q.ohs })); await step(p, 5) } await p.close(); return t.join('|') }
  { const full = await lAlone(100), none = await lAlone(99.99); ck('B. L alone with a full meter is exactly the Ranger\'s special (same as when the Megazord is unavailable)', full === none, full.slice(0, 200) + ' VS ' + none.slice(0, 200)) }

  // skins: the Megazord keeps its colours under every team skin; the calling Ranger is whoever is active
  const { SKINS } = await import('../skins.js'); const themed = (SKINS.mmpr_rangers || []).filter(x => x.id !== 'default' && !x.id.startsWith('mmpr_rangers_start_'))
  for (const sk of themed.slice(0, 2)) {
    page = await open(sk.id); await transform(page); s = await st(page)
    ck(`B. skin ${sk.id}: the Megazord keeps its original strips`, s.sheet === M.MZ_ANIM.idle.sheet, s.sheet)
    await page.close()
  }
  page = await open('mmpr_rangers_start_pink'); await transform(page); await step(page, 760); s = await st(page)
  ck('B. a Pink-started round transforms and separates back into Pink', s.mz.from === 'mmpr_pink' && s.key === 'mmpr_pink', JSON.stringify({ from: s.mz.from, key: s.key }))
  await page.close()

  // determinism
  const trace = async () => { const p = await open(); await transform(p); const t = []; for (const k of ['j', 'k', 'l']) { await near(p); await tap(p, k); await step(p, 30); t.push(JSON.stringify(await st(p))) } await p.close(); return t.join('|') }
  ck('B. deterministic (two identical runs)', await trace() === await trace())

  // CPU
  page = await browser.newPage(); page.on('pageerror', e => errors.push(e.message))
  await page.goto(`${server.base}/index.html?harness=1&p1=mmpr_rangers&p2=naruto&seed=9`); await page.waitForFunction(() => window.__harness?.aiVsAi, null, { timeout: 90000 })
  const cpu = await page.evaluate(() => { window.requestAnimationFrame = () => 0; const x = __harness.aiVsAi.runToCompletion({ p1: 'mmpr_rangers', p2: 'naruto', p1Diff: 'adaptive', p2Diff: 'adaptive', matches: 1, speed: 8 }, 600000); const m = JSON.parse(x.json).matches[0]; const a = __harness.gojoShinjukuTest.raw('p1'); return { total: a?._mzTotal || 0, ends: a?._mzEnds || {}, winner: m?.winner } })
  ck('B. the CPU calls the Thunder Megazord in a match', cpu.total >= 1, JSON.stringify(cpu))
  await page.close()
} finally { await browser.close(); server.close?.() }
ck('B. no page errors', !errors.length, errors.slice(0, 3).join(' | '))
console.log(`MEGAZORD: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
