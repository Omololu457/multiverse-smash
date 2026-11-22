// harness/gojo_shinjuku_present.test.mjs — MSV1-GOJO phases 8 + 9: presentation (intro / vs / win lines), CPU techniques,
// move list, and the 20 premade skins (every sheet loads, the body wears it in a match, the sim is unchanged, glitter
// phase follows the sim clock). Usage: node harness/gojo_shinjuku_present.test.mjs
import { chromium } from 'playwright'
import fs from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
let pass = 0, fail = 0
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${c ? '' : d}`) }
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const E = (fn, a) => page.evaluate(fn, a)
const report = {}
async function boot(p1, p2, skin = 'default', seed = 50223) {
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=${seed}`)
  await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 30000 })
  await E(o => { __harness.rng?.forceSeed?.(o.seed); __harness.start({ p1Skin: o.skin }); __harness.skipToBattle(); __harness.luffyTest.step(2) }, { skin, seed })
}
const say = (w = 'p1') => E(w => __harness.gojoShinjukuTest.raw(w)._gs?.say || null, w)

try {
  // ── intro / vs lines ──
  await boot('gojo_shinjuku', 'sukuna'); let s = await say()
  ck('vs Sukuna the intro line is "Nah, I\'d win."', s?.text === "Nah, I'd win." && s.kind === 'intro', JSON.stringify(s))
  await boot('gojo_shinjuku', 'naruto'); s = await say(); report.intro = s?.text
  ck('vs anyone else: one of his three intro lines', !!s?.text && s.kind === 'intro' && s.text !== "Nah, I'd win.", JSON.stringify(s))
  // ── win line ──
  await E(() => { const b = __harness.gojoShinjukuTest.raw('p2'); b.health = 0 }); await step(2); s = await say(); report.win = s?.text
  ck('when the foe goes down: a win line', s?.kind === 'win' && !!s.text, JSON.stringify(s))
  // ── move list ──
  const kit = await E(async () => { const m = await import('./kits.js'); const k = m.KITS.gojo_shinjuku; return k ? { sp: k.specials.length, su: k.supers.length, ult: k.ultimate.name, combos: k.combos.length } : null })
  ck('move list (kits.js) has his specials, supers, Unlimited Void and combos', kit && kit.sp >= 8 && kit.su === 2 && /UNLIMITED VOID/.test(kit.ult) && kit.combos >= 4, JSON.stringify(kit))
  // ── CPU uses techniques (hard), deterministic rhythm ──
  const cpuRun = async () => {
    await boot('naruto', 'gojo_shinjuku')
    await E(() => { const H = __harness.gojoShinjukuTest; __harness.setDummyBehavior('stand'); H.setCe(100, 'p2'); H.setEnergy(300, 'p2'); const a = H.raw('p1'), b = H.raw('p2'); a.x = 900; b.x = 1500 })
    const used = {}
    for (let i = 0; i < 900; i++) {
      const k = await E(() => { const H = __harness.gojoShinjukuTest; H.cpu('hard', 'p2'); __harness.luffyTest.step(1); const a = H.raw('p2').currentAttack; return a?.gs?.key || null })
      if (k) used[k] = (used[k] || 0) + 1
    }
    const st = await E(() => __harness.gojoShinjukuTest.state('p2').s.stats)
    return { moves: Object.keys(used).sort(), tp: st.teleports, blinks: st.blinks, hp1: await E(() => __harness.gojoShinjukuTest.raw('p1').health) }
  }
  const c1 = await cpuRun(), c2 = await cpuRun(); report.cpu = c1
  ck('CPU Gojo (hard) uses his techniques on his own (≥ 3 different, incl. Unlimited Void or a Blue)', c1.moves.length >= 3 && c1.moves.some(k => /gDomain|gLapse|gMaxBlue/.test(k)), JSON.stringify(c1))
  ck('CPU choices are deterministic (same seed → same moves, teleports, damage)', JSON.stringify(c1) === JSON.stringify(c2), JSON.stringify([c1, c2]))
  // ── skins ──
  const sk = await E(async () => { const m = await import('./skins.js'); const L = m.SKINS.gojo_shinjuku || []; const bad = []; let n = 0
    for (const s of L.slice(1)) { const urls = new Set([s.portrait, ...Object.values(s.animationData).map(d => d?.sheet).filter(Boolean)])
      for (const u of urls) { n++; const r = await fetch(u); if (!r.ok) bad.push(u) } }
    return { n: L.length, ids: L.map(s => s.id), names: L.map(s => s.name), urls: n, bad } })
  report.skins = sk.names
  const gs = sk.ids.filter(i => i.startsWith('gs_'))   // (the shared Edo Tensei premade skin is appended by its own system)
  ck('skin list: default + 20 gs_* skins, none end in "AlienX" or contain "cyborg"', sk.ids[0] === 'default' && gs.length === 20 && gs.every(i => !/AlienX$/.test(i) && !/cyborg/i.test(i)), JSON.stringify(sk.ids))
  ck(`every skin sheet + portrait loads (${sk.urls} urls)`, !sk.bad.length, sk.bad.slice(0, 4).join(','))
  // same input script, default vs four skins → identical sim numbers
  const script = async skin => { await boot('gojo_shinjuku', 'gojo_shinjuku', skin, 77); const out = []
    const keys = ['d', 'd', null, 'j', null, 'k', 'l', null, 'p', null, 'a', null, 'a']
    for (let i = 0; i < 160; i++) { const k = keys[Math.floor(i / 12) % keys.length]; if (k && i % 12 === 0) await page.keyboard.down(k); if (k && i % 12 === 4) await page.keyboard.up(k)
      await step(1); if (i % 8 === 0) out.push(await E(() => { const a = __harness.gojoShinjukuTest.raw('p1'), b = __harness.gojoShinjukuTest.raw('p2'); return [Math.round(a.x), Math.round(a.y), a.health, b.health, a.currentAttack?.name || '', a._gs.ce] })) }
    const look = await E(() => { const f = __harness.gojoShinjukuTest.raw('p1'); return { skin: f.skinId, idle: (f._skinAnim || f.animationData).idle.sheet } })
    return { out, look } }
  const base = await script('default')
  for (const id of ['gs_alienx_leak', 'gs_opal', 'gs_chromastone', 'gs_ink']) {
    const r = await script(id)
    ck(`${id}: the body wears it in a match (idle sheet from its folder)`, r.look.skin === id && r.look.idle.includes('/skins/' + id.slice(3) + '/'), JSON.stringify(r.look))
    ck(`${id}: same inputs → identical sim (positions, HP, moves, CE) vs default`, JSON.stringify(r.out) === JSON.stringify(base.out))
  }
  // glitter: phase = sim clock, not wall clock
  await boot('gojo_shinjuku', 'naruto', 'gs_sequin', 5)
  const ph = []; for (let i = 0; i < 30; i++) { await step(1); await E(() => { const c = document.querySelector('canvas'); return c && 1 }); ph.push(await E(() => { const f = __harness.gojoShinjukuTest.raw('p1'); return [f._gs.clock, f._gsGlintPhase ?? null, (f._skinAnim?.idle?.sheet || '').replace(/.*skins\//, '')] })) }
  const okPhase = ph.filter(r => r[1] != null).every(r => r[1] === Math.floor(r[0] / 8) % 3) && new Set(ph.map(r => r[2])).size >= 2
  ck('glitter skin: glint phase = floor(sim clock / 8) mod 3, sheet folder follows it', okPhase, JSON.stringify(ph.slice(0, 6)))
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.mkdirSync('docs/msv1/gojo', { recursive: true }); fs.writeFileSync('docs/msv1/gojo/present_results.json', JSON.stringify(report, null, 1))
console.log(`\n  GOJO_SHINJUKU PRESENT: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
