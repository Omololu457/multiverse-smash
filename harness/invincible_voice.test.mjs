// harness/invincible_voice.test.mjs — Invincible (Mark Grayson) voice lines (audio-only), from "Invincible VS Invincible
// Voice Lines + Efforts". In a live match (sound.playSfxFile spied): the round intro (vs anyone / vs Omni-Man), attack
// grunts, Invincible Punch, Terminal Velocity, hurt / KO, Can't Stay Down "Not done yet!", the win line; every clip loads
// and is client content; his voice is ONE channel (owner) and a grunt never cuts a higher-priority line.
//   node harness/invincible_voice.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { isClientPath } from '../net/clientManifest.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const R = {}, errs = []
const server = await serve(), browser = await chromium.launch({ headless: true })
async function open(p2) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errs.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__vo = [] })
  await page.goto(server.base + `/index.html?harness=1&p1=invincible&p2=${p2}&seed=515`)
  await page.waitForFunction(() => window.__harness?.invincibleTest)
  await page.evaluate(async () => { const { sound } = await import('./sound.js'); const o = sound.playSfxFile.bind(sound)
    sound.playSfxFile = (f, fb, opts = {}) => { if (String(f).includes('/audio/invincible/')) __vo.push({ f, owner: opts.owner || null }); return o(f, fb, opts) } })
  return page
}
const toBattle = async page => {
  await page.evaluate(() => { __harness.start(); __harness.luffyTest.step(1) })
  for (let i = 0; i < 400; i++) { await page.evaluate(() => __harness.luffyTest.step(1)); const g = await page.evaluate(() => __harness.online.syncProbe2()); if (g?.g === 'battle' && g.cd <= 0) break }
  await page.evaluate(() => __harness.luffyTest.step(10))
}
try {
  const page = await open('homelander')
  const E = (fn, a) => page.evaluate(fn, a), step = n => E(n => __harness.luffyTest.step(n), n), take = () => E(() => __vo.splice(0))
  const V = await E(async () => (await import('./invincibleVoice.js')).INV_VOICE)
  R.pools = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, v.length]))
  const poolOf = {}; for (const [k, v] of Object.entries(V)) for (const [f] of v) (poolOf[f] ||= []).push(k)
  const pools = L => L.map(x => poolOf[x.f] || ['?']), has = (L, p) => L.some(x => poolOf[x.f]?.includes(p))
  const all = [...new Set(Object.values(V).flat().map(e => e[0]))]
  const bad = await E(async L => { const b = []; for (const u of L) { const r = await fetch(u); if (!r.ok) b.push(u) } return b }, all)
  ck(`every voice clip loads (${all.length} files)`, all.length > 120 && !bad.length, bad.slice(0, 3).join(','))
  ck('… and is client content the host serves (companion / LAN friend)', all.every(u => isClientPath(u.replace(/^\.\//, ''))))
  // intro vs a non-Omni foe
  await toBattle(page); let L = await take(); R.intro = pools(L)
  ck('intro (vs Homelander): a general intro line plays', has(L, 'intro') && !has(L, 'introOmni'), JSON.stringify(R.intro))
  ck('… on his own voice channel (owner = inv_p1)', L.length > 0 && L.every(x => x.owner === 'inv_p1'), JSON.stringify(L.map(x => x.owner)))
  const quiet = () => step(400).then(take)
  const reset = (o = {}) => E(async o => { const H = __harness.invincibleTest; H.reset(); (await import('./invincibleState.js')).invState(H.raw()).said.intro = true   // the round intro is tested above
    __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2'); a.x = 1100; b.x = a.x + (o.gap ?? 80); a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = f.maxEnergy; f.hitstun = 0; f.invulnTimer = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.ultimateCooldown = 0; f.knockdownState = false } }, o)
  const move = k => E(k => __harness.invincibleTest.move(k), k)
  const run = async n => { const out = []; for (let i = 0; i < n; i++) { await step(1); out.push(...await take()) } return out }
  // grunts
  await quiet(); await reset(); await step(2); await take(); await move('kUpper'); L = await run(20); R.upper = pools(L)
  ck('Uppercut: a heavy effort yell', has(L, 'effortHeavy'), JSON.stringify(R.upper))
  let jabs = 0; for (let i = 0; i < 6; i++) { await reset(); await step(20); await take(); await move('kJab'); jabs += (await run(20)).filter(x => poolOf[x.f]?.includes('effort')).length }
  R.jabGrunts = jabs
  ck('Jab: grunts sometimes, not every time (sim-clock roll)', jabs >= 1 && jabs <= 6, String(jabs))
  // specials
  await quiet(); await reset({ gap: 160 }); await step(2); await take(); const ip = await move('kIPunch'); L = await run(40); R.ipunch = pools(L)
  ck('Invincible Punch: he calls it ("Invincible!" …)', ip && has(L, 'ipunch'), JSON.stringify({ ip, L: R.ipunch }))
  await quiet(); await reset({ gap: 300 }); await step(2); await take(); const tv = await move('kTV'); L = await run(30); R.tv = pools(L)
  ck('Terminal Velocity: "I\'m ending this!" / "Incoming!" …', tv && has(L, 'super'), JSON.stringify({ tv, L: R.tv }))
  // hurt
  await quiet(); await reset(); await step(2); await take(); await E(() => __harness.invincibleTest.hurt(40)); L = await run(4); R.hurt = pools(L)
  ck('getting hit: a hurt grunt', has(L, 'hurt') || has(L, 'hurtBig'), JSON.stringify(R.hurt))
  await step(5); await take(); await E(() => __harness.invincibleTest.hurt(40)); L = await run(4)
  ck('… cooldown-limited (a second hit right after is silent)', !L.length, JSON.stringify(pools(L)))
  // priority: a grunt right after Terminal Velocity's call does not cut it
  const pr = await E(() => { const a = __harness.invincibleTest.raw(), b0 = __vo.length
    a._inv.cues.push('kTV'); __harness.luffyTest.step(1); a._inv.cues.push('kJab'); a._inv.cues.push('kUpper'); __harness.luffyTest.step(1); return __vo.slice(b0).map(x => x.f) })
  R.priority = pr.map(f => poolOf[f])
  ck('priority: grunts right after the Terminal Velocity call do not cut it', pr.length === 1 && poolOf[pr[0]].includes('super'), JSON.stringify(R.priority))
  // Can't Stay Down: the "Not yet." moment
  await quiet(); await reset(); await step(2); await take(); await E(() => { const H = __harness.invincibleTest; H.setHp(5); H.hurt(200) }); L = await run(10); R.csd = pools(L)
  const csd = await E(() => __harness.invincibleTest.raw()._inv.csd?.phase || null)
  ck("Can't Stay Down: \"Not done yet!\" with the bubble", csd && has(L, 'notYet'), JSON.stringify({ csd, L: R.csd }))
  // win
  await quiet(); await E(() => __harness.invincibleTest.raw()._inv.cues.push('winVoice')); await step(1); L = await take(); R.win = L.map(x => x.f)
  ck('win: the first win line plays', L.length === 1 && L[0].f === V.win[0][0], JSON.stringify(R.win))
  // KO
  await quiet(); await reset(); await E(() => { const H = __harness.invincibleTest; H.raw()._inv.csd = { phase: 'used', used: true } }); await step(2); await take()
  await E(() => { const a = __harness.invincibleTest.raw(); a.health = 0 }); L = await run(3); R.ko = pools(L)
  ck('KO: his KO scream', has(L, 'ko'), JSON.stringify(R.ko))
  await page.close()
  // intro vs Omni-Man
  const p2 = await open('omniman_viltrum'); await toBattle(p2); L = await p2.evaluate(() => __vo.splice(0)); R.introOmni = pools(L)
  ck('intro vs Omni-Man: his "Dad" line (first = "Just stop!", the "Dad. Stop." bubble)', L.length === 1 && L[0].f === V.introOmni[0][0], JSON.stringify(R.introOmni))
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.mkdirSync('docs/msv1/invincible', { recursive: true }); fs.writeFileSync('docs/msv1/invincible/voice_results.json', JSON.stringify({ pass, fail, R }, null, 1))
console.log(`\n  INVINCIBLE VOICE: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
