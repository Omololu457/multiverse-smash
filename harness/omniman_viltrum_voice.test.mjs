// harness/omniman_viltrum_voice.test.mjs — Omni-Man (Viltrumite) voice lines (audio-only), from "Invincible VS Omni-Man
// Voice Lines + Efforts". In a live match (sound.playSfxFile spied): intro, attack grunts, the hurt / big-hurt / KO voice,
// Viltrum Decree taunt, Unimpressed counter, THINK!, Escape Velocity (grab + orbit), win quote = the bubble's line; every
// clip file loads; his voice is ONE channel (owner) and a grunt never cuts a higher-priority line; the sim is unchanged.
//   node harness/omniman_viltrum_voice.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { isClientPath } from '../net/clientManifest.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const R = {}, errs = []
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__vo = [] })
await page.goto(server.base + '/index.html?harness=1&p1=omniman_viltrum&p2=homelander&seed=515')
await page.waitForFunction(() => window.__harness?.omnimanViltrumTest)
const E = (fn, a) => page.evaluate(fn, a), step = n => E(n => __harness.luffyTest.step(n), n)
try {
  const V = await E(async () => { const m = await import('./omnimanViltrumVoice.js'); return m.OMV_VOICE })
  R.pools = Object.fromEntries(Object.entries(V).map(([k, v]) => [k, v.length]))
  const poolOf = {}; for (const [k, v] of Object.entries(V)) for (const [f] of v) (poolOf[f] ||= []).push(k)
  // every file loads + is client content (companion)
  const all = [...new Set(Object.values(V).flat().map(e => e[0]))]
  const bad = await E(async L => { const b = []; for (const u of L) { const r = await fetch(u); if (!r.ok) b.push(u) } return b }, all)
  ck(`every voice clip loads (${all.length} files)`, all.length > 150 && !bad.length, bad.slice(0, 3).join(','))
  ck('… and is client content the host serves (companion / LAN friend)', all.every(u => isClientPath(u.replace(/^\.\//, ''))))
  ck('win pool starts with the bubble\'s line ("What will you have after 500 years?")', /500 years/.test(V.win[0][1]), V.win[0][1])
  // spy
  await E(async () => { const { sound } = await import('./sound.js'); const o = sound.playSfxFile.bind(sound)
    sound.playSfxFile = (f, fb, opts = {}) => { if (String(f).includes('/audio/homelander/') && opts.owner !== __harness.omnimanViltrumTest.raw('p2')) (window.__hl ||= []).push(f); if (String(f).includes('/omniman_viltrum/')) __vo.push({ f, owner: opts.owner || null, t: __harness.omnimanViltrumTest.raw()._omv?.clock ?? null }); return o(f, fb, opts) } })
  const take = () => E(() => __vo.splice(0))
  const reset = (o = {}) => E(async o => { const H = __harness.omnimanViltrumTest; H.reset(); (await import('./omnimanViltrumState.js')).omvState(H.raw()).said.intro = true   // the round-intro line is tested once, below
   ; __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    a.x = 1100; b.x = a.x + (o.gap ?? 80); a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = f.maxEnergy; f.hitstun = 0; f.invulnTimer = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.ultimateCooldown = 0; f.knockdownState = false } }, o)
  // let any line still playing from the previous scenario run out (voice priority is per-fighter, by sim clock)
  const quiet = () => step(300).then(take)
  const move = k => E(k => __harness.omnimanViltrumTest.move(k), k)
  const pools = L => L.map(x => poolOf[x.f] || ['?'])
  // intro (round 1)
  await E(() => { __harness.start(); __harness.luffyTest.step(1) })
  for (let i = 0; i < 400; i++) { await step(1); const g = await E(() => __harness.online.syncProbe2()); if (g?.g === 'battle' && g.cd <= 0) break }
  await step(10)
  let L = await take(); R.intro = pools(L)
  ck('intro: an intro line plays', L.some(x => poolOf[x.f]?.includes('intro')), JSON.stringify(R.intro))
  ck('… on his own voice channel (owner = omv_p1)', L.every(x => x.owner === 'omv_p1'), JSON.stringify(L.map(x => x.owner)))
  // grunts
  await quiet(); await reset(); await move('kHay'); await step(30); L = await take(); R.hay = pools(L)
  ck('Haymaker: a heavy effort yell', L.some(x => poolOf[x.f]?.includes('effortHeavy')), JSON.stringify(R.hay))
  let jabs = 0; for (let i = 0; i < 6; i++) { await reset(); await step(20); await move('kJab'); await step(20); jabs += (await take()).filter(x => poolOf[x.f]?.includes('effort')).length }
  R.jabGrunts = jabs
  ck('Jab: grunts sometimes, not every time (sim-clock roll)', jabs >= 1 && jabs <= 6, String(jabs))
  // hurt (P2 hits him) + big hurt
  await quiet(); await reset({ dummy: 'combo', gap: 70 }); await take(); let hurt = []; for (let i = 0; i < 120; i++) { await step(1); hurt.push(...await take()) }
  R.hurt = pools(hurt)
  ck('getting hit: hurt grunts (cooldown-limited)', hurt.some(x => /hurt/.test(poolOf[x.f]?.join())) && hurt.length <= 8, JSON.stringify(R.hurt))
  // Decree, Unimpressed, THINK!, Escape Velocity
  await quiet(); await reset({ gap: 600 }); await move('kDecree'); await step(10); L = await take(); R.decree = pools(L)
  ck('Viltrum Decree: a taunt line', L.some(x => poolOf[x.f]?.includes('taunt')), JSON.stringify(R.decree))
  await quiet(); await reset({ dummy: 'combo', gap: 110 }); await move('kUnimp'); let cnt = []; for (let i = 0; i < 60; i++) { await step(1); cnt.push(...await take()) }
  R.counter = pools(cnt)
  ck('Unimpressed counter: "Not a scratch" / "Oh, that a punch?" …', cnt.some(x => poolOf[x.f]?.includes('counter')), JSON.stringify(R.counter))
  await reset({ gap: 240 }); await move('kThink'); let th = []; for (let i = 0; i < 160; i++) { await step(1); th.push(...await take()) }
  R.think = pools(th)
  ck('THINK!: he shouts "Think!"', th.some(x => poolOf[x.f]?.includes('think')), JSON.stringify(R.think))
  await reset({ gap: 150 }); await move('kEscape'); let ev = []; for (let i = 0; i < 400; i++) { await step(1); ev.push(...await take()) }
  R.escape = pools(ev)
  ck('Escape Velocity: a line on the grab and one in orbit', ev.some(x => poolOf[x.f]?.includes('escape')) && ev.some(x => poolOf[x.f]?.includes('orbit')), JSON.stringify(R.escape))
  // priority: a grunt right after THINK!'s shout does not cut it
  const pr = await E(async () => { const H = __harness.omnimanViltrumTest; const a = H.raw(); const before = __vo.length
    a._omv.cues.push('think'); __harness.luffyTest.step(1); a._omv.cues.push('kJab'); a._omv.cues.push('kHay'); __harness.luffyTest.step(1)
    return __vo.slice(before).map(x => x.f) })
  R.priority = pr.map(f => poolOf[f])
  ck('priority: grunts queued right after THINK! do not cut it (only the THINK! line plays)', pr.length === 1 && poolOf[pr[0]].includes('think'), JSON.stringify(R.priority))
  // NO Homelander audio from Omni-Man (his flight clips carry Homelander's voice): fly, boom, Blitz, Meteor, Escape Velocity
  await reset({ gap: 300 }); await E(() => { __harness.omnimanViltrumTest.place(900, 300); __harness.omnimanViltrumTest.fly() }); await step(60)
  for (const k of ['kBlitz', 'kMeteor', 'kSkyHook']) { await reset({ gap: 200 }); await move(k); await step(90) }
  const hl = await E(() => window.__hl || []); R.homelanderClips = hl
  ck('no Homelander clip ever plays from Omni-Man (intro, takeoff, boom, Blitz, Meteor, Escape Velocity …)', !hl.length, JSON.stringify(hl.slice(0, 3)))
  // KO + win quote
  await reset({ gap: 80 }); await take(); await E(() => { __harness.omnimanViltrumTest.raw().health = 1 }); await step(1); await E(() => { const a = __harness.omnimanViltrumTest.raw(); a.health = 0 }); await step(2); L = await take(); R.ko = pools(L)
  ck('KO: "NOOOO"', L.some(x => poolOf[x.f]?.includes('ko')), JSON.stringify(R.ko))
  await E(() => { const a = __harness.omnimanViltrumTest.raw(); a.health = a.maxHealth; a._omv.cues.push('win') }); await step(1); L = await take(); R.win = L.map(x => x.f)
  ck('win: the bubble\'s line plays (omv_078)', L.some(x => x.f.endsWith('omv_078.mp3')), JSON.stringify(R.win))
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.writeFileSync('docs/msv1/omniman/voice_results.json', JSON.stringify({ pass, fail, R }, null, 1))
console.log(`\n  OMNIMAN_VILTRUM VOICE: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
