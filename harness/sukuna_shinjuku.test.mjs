// harness/sukuna_shinjuku.test.mjs — MSV1-SUKUNA: Ryomen Sukuna (Shinjuku Arc, rosterKey sukuna_shinjuku) through REAL
// keyboard input and the live engine (P1: J light, K heavy, I up-attack, L special, U ultimate, O grab, P charge, ; block, WASD).
// Sections: moves · techniques · shrine · gojo · hazards · present. Writes docs/msv1/sukuna/test_results.json.
//   node harness/sukuna_shinjuku.test.mjs [--only=moves,techniques,shrine,gojo,hazards,present]
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { POWER } from '../sukunaShinjukuData.js'   // ×1.15 damage buff (parity with Gojo Shinjuku, user request): brief numbers × POWER
const pw = n => Math.round(n * POWER)
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean)
const want = k => !ONLY.length || ONLY.includes(k)
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = {}; let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.sukunaShinjukuTest, G = __harness.gojoShinjukuTest; return (new Function('H', 'G', 'a', 'return ' + e))(H, G, a) }, [expr, arg])
const st = (w = 'p1') => S('H.state(a)', w)
async function hold(keys, n) { for (const k of keys) await page.keyboard.down(k); await step(n); for (const k of keys) await page.keyboard.up(k) }
const tap = (keys, n = 2) => hold(keys, n)
async function seq(list) { for (const k of list) { await tap(Array.isArray(k) ? k : [k], 2); await step(1) } }
async function reset(o = {}) {
  await page.evaluate(o => { const H = __harness.sukunaShinjukuTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    const gap = o.gap ?? 80
    a.x = 1300; b.x = 1300 + gap; a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? f.maxEnergy; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0; f._forceGuard = false
      f.ultimateCooldown = 0; f._gsTechBurnout = 0 } }, o)
  await step(2)
}
const runUntilIdle = async (max = 120) => { for (let i = 0; i < max; i++) { const s = await st(); if (!s.attack && !s.hitstop) return i; await step(1) } return max }
const P2KEY = process.env.SKS_P2 || 'sukuna'

try {
  await page.goto(server.base + `/index.html?harness=1&p1=sukuna_shinjuku&p2=${P2KEY}&seed=50223`); await page.waitForFunction(() => window.__harness?.sukunaShinjukuTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone?.()); await step(3)
  const D = await S('H.data()')
  let s = await st()
  ck('P1 is sukuna_shinjuku with the old Sukuna\'s HP 1240 / meter 210', s.key === 'sukuna_shinjuku' && s.maxHp === 1240 && s.maxEnergy === 210, JSON.stringify([s.key, s.maxHp, s.maxEnergy]))

  if (want('mobility')) {   // as fast as Satoru Gojo (Shinjuku): his teleport reach toward, his blink away (user request)
    const R = report.mobility = {}
    const raw = w => S('(() => { const f = H.raw(a); return { x: Math.round(f.x), w: f.w, facing: f.facing, inv: f.invulnTimer || 0, rush: f._sks?.stats.rushes, step: f._sks?.stats.steps, cd: { ...(f._sks?.cd || {}) } } })()', w)
    await reset({ gap: 1100 }); await step(10)
    const foe = await raw('p2'); let a0 = await raw()
    await tap(['d'], 1); await step(2); await tap(['d'], 1); await step(12)
    let a1 = await raw(); R.rush = { from: a0.x, to: a1.x, foe: foe.x }
    ck('→→ toward the foe (1100 px away): blur dash lands beside them (Gojo teleport reach)', a1.rush === 1 && Math.abs(a1.x - (foe.x - a1.w - 8)) <= 2, JSON.stringify(R.rush))
    ck('… cooldown = Gojo\'s teleport (48 f)', a1.cd.rush > 25 && a1.cd.rush <= 48, JSON.stringify(a1.cd))
    await reset({ gap: 100 }); await step(10)   // close start: the whole 512 px fits inside the camera's max-separation clamp
    a0 = await raw(); await tap(['a'], 1); await step(2); await tap(['a'], 1)
    let invSeen = false, mv = null; for (let i = 0; i < 16; i++) { await step(1); const r = await raw(); if (r.inv > 0) invSeen = true; mv = mv || await S('(() => { const m = H.raw()._sks.mv; return m ? { x0: m.x0, x1: m.x1 } : null })()') }
    a1 = await raw(); R.step = { from: mv?.x0, plannedTo: mv?.x1, to: a1.x, moved: mv ? mv.x0 - a1.x : null }
    ck('←← away: back-step 0.40 screen (Gojo blink reach 512 px; lands within 12 px of it)', a1.step === 1 && mv && mv.x0 - mv.x1 === 512 && R.step.moved >= 500, JSON.stringify(R.step))
    ck('… invulnerable while it travels', invSeen)
    await reset({ gap: 300 }); await step(10)
    await page.keyboard.down('s'); await step(1); await tap(['a'], 1); await step(2); await tap(['a'], 1); await step(10); await page.keyboard.up('s')
    ck('↓ in the motion → not a double-tap (Dismantle / ↓↓ motions stay clean)', (await raw()).step === 0)
  }

  if (want('shadows')) {   // TEN SHADOWS add-on: Megumi's shikigami as separate helpers, Sukuna's own body
    const R = report.shadows = {}
    const T = (w = 'p1') => S('(() => { const f = H.raw(a), t = f._sks?.ts; return t ? JSON.parse(JSON.stringify({ on: t.on, sum: t.sum.map(z => ({ k: z.k, t: z.t, x: z.x, br: z.br || null })), rab: t.rab ? t.rab.alive.filter(Boolean).length : 0, cd: t.cd, dom: t.dom, domUsed: t.domUsed, stats: t.stats, rej: t.lastReject || null })) : null })()', w)
    const foe = () => S('(() => { const o = H.raw("p2"); return { hp: o.health, x: Math.round(o.x), y: Math.round(o.y), vy: o.vy, hitstun: o.hitstun || 0, slow: o._benSlow ? o._benSlow.k : 0 } })()')
    const me = () => S('(() => { const f = H.raw(); return { hp: f.health, energy: f.energy, x: Math.round(f.x), alpha: f._sksAlpha || 0, anim: f.currentAttack?.name || null, key: f.currentAttack?.sks?.key || null } })()')
    const stance = async () => { await tap(['p'], 2); await step(2) }
    const cleanSet = async (o = {}) => { await reset(o); await step(4); if (!(await T())?.on) await stance() }
    // the stance toggle
    await reset({ gap: 200 }); await step(4)
    await stance(); let t = await T(); const hudOn = (await S('H.hud()')).tenShadows
    await stance(); const t2 = await T()
    ck('tap Charge → TEN SHADOWS stance on (HUD tag), tap again → off', t?.on === true && hudOn === true && t2?.on === false, JSON.stringify([t?.on, hudOn, t2?.on]))
    await seq(['s', 's']); await tap(['p'], 2); await step(10)
    ck('… ↓↓ + Charge is still Domain Amplification (no toggle)', (await st()).amp > 0 && !(await T()).on)
    const summon = async (keys, wait, o = {}) => { await cleanSet(o); const f0 = await foe(), m0 = await me(); await hold(keys, 2); let k = null
      let hs = 0; for (let i = 0; i < wait; i++) { await step(1); k = k || (await me()).key; hs = Math.max(hs, (await foe()).hitstun) }
      return { f0, f1: await foe(), m0, m1: await me(), t: await T(), key: k, hs } }
    // Weak + Down: Gama (ground tongue grab) — the foe is pulled in
    let r = await summon(['s', 'j'], 40, { gap: 150 }); R.gama = r
    ck('↓ + Light → Gama: tongue hits and DRAGS the foe in', r.key === 'kGama' && r.f1.hp < r.f0.hp && r.t.stats.pulls === 1 && r.f1.x < r.f0.x - 40, JSON.stringify({ key: r.key, hp: [r.f0.hp, r.f1.hp], x: [r.f0.x, r.f1.x], st: r.t.stats }))
    ck('… Sukuna uses his OWN hand-sign body (handSign sheet), the toad is a separate object', r.m1.anim !== null || r.key === 'kGama')
    // Strong: Nue — electric stun
    r = await summon(['k'], 50, { gap: 110 }); R.nue = r
    ck('Heavy → Nue: lightning burst, a long STUN (hitstun ≥ 40)', r.key === 'kNue' && r.f1.hp < r.f0.hp && r.t.stats.hits >= 1 && r.hs >= 40, JSON.stringify({ key: r.key, hp: [r.f0.hp, r.f1.hp], hs: r.hs, st: r.t.stats }))
    // Strong + Fwd: dogs — two hits
    r = await summon(['d', 'k'], 40, { gap: 200 }); R.dogs = r
    ck('→ + Heavy → Divine Dogs: white then black, TWO hits', r.key === 'kDogs' && r.t.stats.hits + r.t.stats.blocked === 2 && r.f1.hp < r.f0.hp, JSON.stringify({ key: r.key, st: r.t.stats, sum: r.t.sum }))
    // Strong + Up: Orochi — anti-air launcher
    await cleanSet({ gap: 160 }); let f0 = await foe(); await hold(['w', 'k'], 2); let up = false, key = null
    for (let i = 0; i < 40; i++) { await step(1); key = key || (await me()).key; const q = await foe(); if (q.vy < -5) up = true }
    let f1 = await foe(); R.orochi = { key, f0, f1, up }
    ck('↑ + Heavy → Orochi: grows out of the floor under them and LAUNCHES', key === 'kOrochi' && f1.hp < f0.hp && up, JSON.stringify(R.orochi))
    // Strong + Down: Datto — rabbits, see-through user, each eats one projectile
    await cleanSet({ gap: 400 }); await hold(['s', 'k'], 2); await step(12)
    const d0 = await T(), m0 = await me()
    await S('H.shoot({ speed: 10, damage: 40, lifetime: 200 })'); for (let i = 0; i < 50; i++) await step(1)
    const d1 = await T(), m1 = await me(); R.datto = { d0: d0.rab, d1: d1.rab, alpha: m0.alpha, st: d1.stats, hp: [m0.hp, m1.hp] }
    ck('↓ + Heavy → Datto: six rabbits, Sukuna semi-transparent', d0.rab === 6 && m0.alpha > 0 && m0.alpha < 1, JSON.stringify(R.datto))
    ck('… a rabbit eats a projectile (he takes nothing)', d1.stats.projBlocked === 1 && m1.hp === m0.hp && d1.rab === 5, JSON.stringify(R.datto))
    // Special: Divine Dog Totality (1 bar) — HIT branch
    r = await summon(['l'], 70, { gap: 160 }); R.totality = r
    ck('Special → Divine Dog: TOTALITY (1 bar): the HIT branch pins + claws', r.key === 'kTotality' && r.t.stats.konHits === 1 && r.m0.energy - r.m1.energy >= 100 - 30 && r.f0.hp - r.f1.hp > 100, JSON.stringify({ e: [r.m0.energy, r.m1.energy], hp: [r.f0.hp, r.f1.hp], st: r.t.stats }))
    r = await summon(['l'], 60, { gap: 900 }); R.totalityMiss = { st: r.t.stats, sum: r.t.sum }
    ck('… MISS branch: out of reach → it runs through and sinks (no hit)', r.key === 'kTotality' && r.t.stats.konHits === 0 && r.f1.hp === r.f0.hp, JSON.stringify(R.totalityMiss))
    // Special 2: Max Elephant — multi-hit water beam
    r = await summon(['d', 'l'], 90, { gap: 220 }); R.elephant = { key: r.key, st: r.t.stats, hp: [r.f0.hp, r.f1.hp] }
    ck('→ + Special → Max Elephant (1 bar): multi-hit water beam (≥ 3 hits)', r.key === 'kElephant' && r.t.stats.hits + r.t.stats.blocked >= 3 && r.f1.hp < r.f0.hp, JSON.stringify(R.elephant))
    // Super 1: Mahoraga
    r = await summon(['u'], 220, { gap: 400 }); R.mahoraga = { key: r.key, e: [r.m0.energy, r.m1.energy], st: r.t.stats, hp: [r.f0.hp, r.f1.hp], sum: r.t.sum }
    ck('Ultimate → MAHORAGA (full meter): rise, leap, land, crescent waves, sink', r.key === 'kMahoraga' && r.m1.energy < 60 && r.f1.hp < r.f0.hp && !r.t.sum.some(z => z.k === 'maho'), JSON.stringify(R.mahoraga))
    // Super 2: Chimera Shadow Garden — once per round, foe slowed
    await cleanSet({ gap: 400 }); await seq(['s', 's']); await tap(['u'], 2); await step(40)
    let g1 = await T(), fs1 = await foe(), hud = await S('H.hud()')
    ck('↓↓ + Ultimate → CHIMERA SHADOW GARDEN: active, the foe slowed', !!g1.dom && fs1.slow > 0 && fs1.slow < 1 && hud.garden > 0, JSON.stringify({ dom: g1.dom, slow: fs1.slow }))
    await S('H.setEnergy(210)'); await step(30); await seq(['s', 's']); await tap(['u'], 2); await step(4)
    ck('… once per round (a second cast is refused)', (await T()).stats.domains === 1, JSON.stringify((await T()).stats))
    for (let i = 0; i < 560; i += 40) await step(40)
    ck('… ends after 9 s', !(await T()).dom)
    // air: Gama air / Nue air
    await cleanSet({ gap: 120 }); await tap(['w'], 2); await step(6); await tap(['j'], 2); let ka = null; for (let i = 0; i < 10; i++) { await step(1); ka = ka || (await me()).key }
    await runUntilIdle(80); await step(20)
    await tap(['w'], 2); await step(6); await tap(['k'], 2); let kb = null; for (let i = 0; i < 10; i++) { await step(1); kb = kb || (await me()).key }
    ck('in the air: Light → Gama (air), Heavy → Nue (air blast)', ka === 'kGamaAir' && kb === 'kNueAir', JSON.stringify([ka, kb]))
    // rules: startup cancel, breakable, cooldown
    await cleanSet({ gap: 300 }); await S('H.move("kNue")'); await step(4); await S('(() => { const f = H.raw(); f.hitstun = 20 })()'); await step(30)
    let c = await T(); ck('a hit during the hand sign CANCELS the summon (no shikigami)', c.stats.cancelled === 1 && c.stats.summons === 0, JSON.stringify(c.stats))
    await cleanSet({ gap: 600 }); await hold(['w', 'k'], 2); await step(26)
    await S('H.shoot({ speed: 12, damage: 40, lifetime: 200 })'); for (let i = 0; i < 40; i++) await step(1)
    c = await T(); R.break = c.stats
    ck('a shikigami can be HIT: a projectile breaks Orochi', c.stats.broken >= 1, JSON.stringify(c.stats))
    await cleanSet({ gap: 600 }); await tap(['k'], 2); await step(28); await tap(['k'], 2); await step(2)
    c = await T(); ck('one Nue at a time; then a short cooldown', c.rej === 'out' || c.rej === 'cooldown', JSON.stringify({ rej: c.rej, cd: c.cd }))
    await step(110); c = await T(); ck('… cooldown ticks down to 0', !(c.cd.nue > 0), JSON.stringify(c.cd))
    // Mahoraga ADAPTS: the same projectile twice → the second does nothing (hp 4 → 3, adapted 1)
    await cleanSet({ gap: 700 }); await S('H.move("kMahoraga")'); await step(34)
    const mh = () => S('(() => { const z = H.raw()._sks.ts.sum.find(z => z.k === "maho"); return z ? { hp: z.hp, adapt: z.adapt.length } : null })()')
    await S('H.shoot({ speed: 14, damage: 10, lifetime: 200 })'); for (let i = 0; i < 24; i++) await step(1)
    const a1 = await mh(); await step(20)
    await S('H.shoot({ speed: 14, damage: 10, lifetime: 200 })'); for (let i = 0; i < 24; i++) await step(1)
    const a2 = await mh(), ts2 = await T(); R.adapt = { a1, a2, st: ts2.stats }
    ck('Mahoraga takes hits (4) and ADAPTS: the same projectile twice → the second does nothing', a1?.hp === 3 && a2?.hp === 3 && ts2.stats.adapted === 1, JSON.stringify(R.adapt))
    // HARD RULE: Megumi's body is never used — only his shikigami strips (summons/*) and the Megumi-free domain floor
    const src = fs.readFileSync('sukunaShinjukuShadowsFx.js', 'utf8')
    ck('HARD RULE: no Megumi body sprite is referenced (only MEGUMI_SUMMON_ANIM + the cut floor)', !/MEGUMI_ANIM\b/.test(src.replace(/MEGUMI_SUMMON_ANIM/g, '')) && !/megumi_fushiguro\/(?!summons)/.test(src) && /ten_shadows\/domainFloor\.png/.test(src))
  }

  if (want('moves')) {
    const R = report.moves = {}
    // A string 32 / 32 / 48
    await reset(); const hp0 = (await st('p2')).hp
    await tap(['j']); await step(9); s = await st(); const d1 = hp0 - (await st('p2')).hp
    R.A1 = d1; ck(`Light → A1 hits (32 ×${POWER} ±scaling)`, d1 >= pw(25) && d1 <= pw(34), d1)
    await tap(['j']); await step(10); const d2 = hp0 - (await st('p2')).hp - d1
    await tap(['j']); await step(14); const d3 = hp0 - (await st('p2')).hp - d1 - d2
    R.A = [d1, d2, d3]; ck('A string chains 3 hits on contact (32 / 32 / 48 before combo scaling)', d2 > 0 && d3 > 0 && d3 > d2, JSON.stringify(R.A))
    // startups via the timeline
    for (const [k, su] of [['kA1', 5], ['kB', 10], ['kC', 12]]) ck(`${k} startup ${su}f (authored)`, D.moves[k].startup === su, D.moves[k].startup)
    await reset(); await runUntilIdle(); const h1 = (await st('p2')).hp; await tap(['k']); await step(24); R.B = h1 - (await st('p2')).hp
    ck(`Heavy (B) 74 ×${POWER} blunt`, R.B >= pw(70) && R.B <= pw(76), R.B)
    await reset(); const h2 = (await st('p2')).hp; await tap(['i']); await step(20); s = await st('p2'); R.C = h2 - s.hp
    ck(`Up-Attack (C) 82 ×${POWER} launcher: damage + foe airborne`, R.C >= pw(78) && R.C <= pw(84) && (!s.grounded || s.vy < 0), JSON.stringify([R.C, s.grounded, s.vy]))
    await reset(); const h3 = (await st('p2')).hp; await hold(['s', 'k'], 2); await step(20); R.knee = h3 - (await st('p2')).hp
    ck(`Down + Heavy → Rising knee 76 ×${POWER}`, R.knee >= pw(72) && R.knee <= pw(78), R.knee)
    await reset(); const h4 = (await st('p2')).hp; await hold(['s', 'j'], 2); await step(24); s = await st(); R.dashAtk = h4 - (await st('p2')).hp
    ck(`Down + Light → dash attack 58 ×${POWER} (low)`, R.dashAtk >= pw(55) && R.dashAtk <= pw(60) && D.moves.kDashAtk.hitLevel === 'low', R.dashAtk)
    await reset({ gap: 70 }); await tap(['w'], 2); for (let i = 0; i < 120; i++) { await step(1); const q = await st(); if (q.vy > 0 && q.y > 250) break } const h5 = (await st('p2')).hp; await tap(['j']); await step(20); R.air = h5 - (await st('p2')).hp
    ck(`Jump attack 62 ×${POWER}`, R.air >= pw(58) && R.air <= pw(64), R.air)
    ck('every move tagged with a damageType', Object.values(D.moves).every(m => !!m.damageType), Object.entries(D.moves).filter(([, m]) => !m.damageType).map(([k]) => k).join(','))
  }

  if (want('techniques')) {
    const R = report.techniques = {}
    // DISMANTLE ↓← + L
    await reset({ gap: 600 }); let e0 = (await st()).energy, hp0 = (await st('p2')).hp
    await page.keyboard.down('s'); await step(2); await page.keyboard.down('a'); await step(2); await page.keyboard.up('s'); await tap(['l'], 2); await page.keyboard.up('a')
    s = await st(); R.disKey = s.attack?.sks?.key; ck('↓← + Special → Dismantle (the old Sukuna\'s input)', s.attack?.sks?.key === 'kDismantle', JSON.stringify(s.attack?.sks))
    ck('Dismantle costs 12', s.s.stats.spent === 12, s.s.stats.spent)
    for (let i = 0; i < 60; i++) await step(1)
    R.dis = hp0 - (await st('p2')).hp; ck(`Dismantle hits at 600px (65 % screen) for 55 ×${POWER}`, R.dis >= pw(52) && R.dis <= pw(56), R.dis)
    // out of range
    await reset({ gap: 900 }); hp0 = (await st('p2')).hp; await S("H.move('kDismantle')"); for (let i = 0; i < 70; i++) await step(1)
    ck('Dismantle does not reach 900px (65 % of 1280 = 832)', (await st('p2')).hp === hp0)
    // cuts a projectile
    await reset({ gap: 700 }); await S("H.shoot({ speed: 6, damage: 40, lifetime: 200 })"); await S("H.move('kDismantle')"); for (let i = 0; i < 40; i++) await step(1)
    s = await st(); R.cutProj = s.s.stats.cutProj; ck('Dismantle cuts a non-super projectile', s.s.stats.cutProj >= 1, JSON.stringify(s.s.stats))
    await reset({ gap: 700 }); await S("H.shoot({ speed: 6, damage: 40, lifetime: 200, super: true })"); await S("H.move('kDismantle')"); for (let i = 0; i < 40; i++) await step(1)
    s = await st(); ck('… but not a super projectile', s.s.stats.cutProj === 0, s.s.stats.cutProj)
    // fan (hold Special)
    await reset({ gap: 300 }); e0 = (await st()).energy; hp0 = (await st('p2')).hp
    await page.keyboard.down('s'); await step(2); await page.keyboard.down('a'); await step(2); await page.keyboard.up('s'); await page.keyboard.down('l'); await step(14); await page.keyboard.up('l'); await page.keyboard.up('a')
    s = await st(); R.fanKey = s.attack?.sks?.key
    for (let i = 0; i < 50; i++) await step(1)
    s = await st(); R.fanCost = e0 - s.energy; R.fanCuts = s.s.stats.cuts; R.fanDmg = hp0 - (await st('p2')).hp
    ck('hold Special → 3-slash fan, 24 energy total', R.fanCuts === 3 && s.s.stats.spent === 24, JSON.stringify([R.fanKey, R.fanCuts, s.s.stats.spent]))
    ck('fan: the centre cut hits (30 each)', R.fanDmg >= 25, R.fanDmg)
    // air Dismantle
    await reset({ gap: 250 }); await tap(['w'], 2); await step(8); await tap(['l'], 2); s = await st(); ck('air Special → air Dismantle (angled down)', s.attack?.sks?.key === 'kDisAir', s.attack?.sks?.key)
    await runUntilIdle(); await step(30)
    await reset({ gap: 250 }); await hold(['w', 'l'], 2); s = await st(); ck('↑ + Special → upward Dismantle', ['kDisUp', 'kDisAir'].includes(s.attack?.sks?.key), s.attack?.sks?.key)
    // CLEAVE neutral L
    await reset({ gap: 70 }); e0 = (await st()).energy; hp0 = (await st('p2')).hp; const mh = (await st('p2')).maxHp
    await tap(['l'], 2); s = await st(); ck('neutral Special → Cleave (the old Sukuna\'s input)', s.attack?.sks?.key === 'kCleave', s.attack?.sks?.key)
    for (let i = 0; i < 20; i++) await step(1)
    R.cleave = hp0 - (await st('p2')).hp; R.cleaveWant = Math.round((60 + 0.06 * mh) * POWER)
    ck(`Cleave = (60 + 6 % max HP) ×${POWER} (${R.cleaveWant} vs ${mh} HP)`, Math.abs(R.cleave - R.cleaveWant) <= 2, R.cleave)
    ck('Cleave costs 15', (await st()).s.stats.spent === 15, (await st()).s.stats.spent)
    // Cleave through armor
    await reset({ gap: 70 }); await page.evaluate(() => { const b = __harness.sukunaShinjukuTest.raw('p2'); b._bossArmor = true }); hp0 = (await st('p2')).hp
    await tap(['l'], 2); for (let i = 0; i < 14; i++) await step(1); s = await st()
    ck('Cleave ignores armor (hitstun applied through _bossArmor)', s.s.stats.armorCut >= 1 && (await st('p2')).hitstun > 0, JSON.stringify(s.s.stats))
    await page.evaluate(() => { delete __harness.sukunaShinjukuTest.raw('p2')._bossArmor })
    // Cleave whiff −10
    await reset({ gap: 300 }); await tap(['l'], 2); s = await st(); const tot0 = s.attack?.total; for (let i = 0; i < 14; i++) await step(1); s = await st()
    R.whiff = (s.attack?.total || 0) - tot0; ck('Cleave whiff adds 10 recovery', R.whiff === 10, R.whiff)
    // SPIDERWEB ↓↓ + L
    await reset({ gap: 140 }); e0 = (await st()).energy; hp0 = (await st('p2')).hp
    await seq(['s', 's']); await tap(['s', 'l'], 2); s = await st(); R.webKey = s.attack?.sks?.key
    for (let i = 0; i < 30; i++) await step(1)
    R.web = hp0 - (await st('p2')).hp
    ck(`↓↓ + Special → Spiderweb, 70 ×${POWER}`, R.webKey === 'kWeb' && R.web >= pw(66) && R.web <= pw(72), JSON.stringify([R.webKey, R.web]))
    ck('Spiderweb costs 18', (await st()).s.stats.spent === 18, (await st()).s.stats.spent)
    // low: a standing guard does not block it, a crouching one does
    await reset({ gap: 140, dummy: 'block' }); hp0 = (await st('p2')).hp; await S("H.move('kWeb')"); for (let i = 0; i < 30; i++) await step(1)
    R.webVsStand = hp0 - (await st('p2')).hp; ck('Spiderweb is LOW: beats a standing guard', R.webVsStand >= 60, R.webVsStand)
    // OTG
    await reset({ gap: 140 }); await page.evaluate(() => { const b = __harness.sukunaShinjukuTest.raw('p2'); b.knockdownState = true; b.knockdownTimer = 60; b.invulnTimer = 0 }); hp0 = (await st('p2')).hp; await S("H.move('kWeb')"); for (let i = 0; i < 20; i++) await step(1)
    ck('Spiderweb hits OTG (a downed foe)', (await st('p2')).hp < hp0, hp0 - (await st('p2')).hp)
    // FUGA → + L: hold levels
    for (const [hold_, lv, raw] of [[34, 1, 90], [64, 2, 140], [100, 3, 200]]) {
      await reset({ gap: 260 }); hp0 = (await st('p2')).hp; e0 = (await st()).energy
      await page.keyboard.down('d'); await step(1); await page.keyboard.down('l'); await step(hold_); await page.keyboard.up('l'); await page.keyboard.up('d')
      for (let i = 0; i < 60; i++) await step(1)
      s = await st(); const d = hp0 - (await st('p2')).hp
      R['fuga' + lv] = { d, lv: s.s.stats.fugaLv, cost: e0 - s.energy }
      ck(`→ + Special held ${hold_}f → Fuga level ${lv} (${raw} ×${POWER} + burn)`, s.s.stats.fugaLv === lv && d >= pw(raw) && d <= pw(raw) + 12, JSON.stringify(R['fuga' + lv]))
    }
    await reset({ gap: 260 }); await S("H.move('kFugaF', 'p1', { lv: 1 })"); for (let i = 0; i < 30; i++) await step(1)
    s = await st('p2'); ck('Fuga burns (status mark on the foe)', s.burn > 0, s.burn)
    const pt = await S('H.patches()'); R.patches = pt; ck('Fuga leaves a FIRE patch (elements.js)', (await st()).s.field.patches.some(p => p.type === 'fire'), JSON.stringify((await st()).s.field.patches))
    // hit during the gather cancels it
    await reset({ gap: 260 }); e0 = (await st()).energy; await S("H.move('kFugaG')"); await step(20)
    await page.evaluate(() => { __harness.sukunaShinjukuTest.raw().hitstun = 20 }); await step(2); s = await st()
    ck('hit during the gather → Fuga cancelled, energy lost', !s.attack && s.s.stats.fugaCancelled === 1 && s.s.arrows.length === 0 && s.s.stats.spent === 35 && s.s.stats.refunded === 0, JSON.stringify([s.s.stats.fugaCancelled, s.s.stats.spent]))
    // DOMAIN AMPLIFICATION ↓↓ + P
    await reset(); e0 = (await st()).energy; await seq(['s', 's']); await tap(['s', 'p'], 2); for (let i = 0; i < 10; i++) await step(1); s = await st()
    R.amp = s.amp; ck('↓↓ + Charge → Domain Amplification (3 s), 20 energy', s.amp > 160 && s.s.stats.spent === 20, JSON.stringify([s.amp, s.s.stats.spent]))
    const ok = await S("H.move('kDismantle')"); ck('Amplification locks Dismantle', !ok)
    ck('… and Cleave / Spiderweb / Fuga / World Slash', !(await S("H.move('kCleave')")) && !(await S("H.move('kWeb')")) && !(await S("H.move('kFugaG')")) && !(await S("H.move('kWorld')")))
    for (let i = 0; i < 185; i++) await step(1); s = await st(); ck('Amplification ends after 3 s, 10 s cooldown', s.amp === 0 && s.s.cd.amp > 580, JSON.stringify([s.amp, s.s.cd.amp]))
    ck('… cannot recast during the cooldown', !(await S("H.move('kAmp')")))
    // WORLD-CUTTING SLASH ↓↓ + U
    await reset({ gap: 300 }); hp0 = (await st('p2')).hp; e0 = (await st()).energy
    await seq(['s', 's']); await tap(['s', 'u'], 2); s = await st(); R.worldKey = s.attack?.sks?.key
    ck('↓↓ + Ultimate → World-Cutting Slash (2 bars = 200)', R.worldKey === 'kWorld' && s.s.stats.spent === 200, JSON.stringify([R.worldKey, s.s.stats.spent]))
    const caps = []; for (let i = 0; i < 100; i++) { await step(1); const c = (await st()).cues; for (const x of c) if (x === 'chantLine') caps.push(i) }
    R.world = hp0 - (await st('p2')).hp; ck(`World Slash lands for 380 ×${POWER}`, R.world >= pw(375) && R.world <= pw(385), R.world)
    await reset({ gap: 300, dummy: 'block' }); hp0 = (await st('p2')).hp; await S("H.move('kWorld')"); for (let i = 0; i < 100; i++) await step(1)
    ck('World Slash is unblockable', hp0 - (await st('p2')).hp >= 375, hp0 - (await st('p2')).hp)
    await reset({ gap: 300 }); hp0 = (await st('p2')).hp; await S("H.move('kWorld')"); for (let i = 0; i < 86; i++) await step(1); await page.evaluate(() => { __harness.sukunaShinjukuTest.raw('p2').invulnTimer = 20 }); for (let i = 0; i < 14; i++) await step(1)
    ck('… invulnerable frames still dodge it', (await st('p2')).hp === hp0)
    await reset({ gap: 300 }); e0 = (await st()).energy; await S("H.move('kWorld')"); await step(30); await page.evaluate(() => { __harness.sukunaShinjukuTest.raw().hitstun = 20 }); await step(2); s = await st()
    ck('hit during the chant → cancelled, half the bars refunded', !s.attack && s.s.stats.refunded === 100 && s.s.stats.worldCancelled === 1, JSON.stringify([s.s.stats.refunded, s.s.stats.worldCancelled]))
  }

  if (want('shrine')) {
    const R = report.shrine = {}
    await reset({ gap: 300 }); await page.evaluate(() => { __harness.sukunaShinjukuTest.raw().energy = 100 })
    await tap(['u'], 2); s = await st(); ck('Shrine needs a full meter', !(await S('H.domains()')).length)
    await reset({ gap: 300 }); await tap(['u'], 2); await step(2)
    const doms = await S('H.domains()'); s = await st(); R.dom = doms
    ck('Ultimate → Malevolent Shrine: domain rosterKey "sukuna", 15 s, whole map', doms.length === 1 && doms[0].rosterKey === 'sukuna' && doms[0].range === 1e5, JSON.stringify(doms))
    ck('meter drained to 0, 20 s ultimate cooldown', s.energy === 0 && s.ultimateCooldown >= 1190, JSON.stringify([s.energy, s.ultimateCooldown]))
    await step(10); s = await st('p2'); ck('foe is untouchable / frozen (old sure-hit branch)', s.untouchable, JSON.stringify(s))
    const hp0 = s.hp; for (let i = 0; i < 140 + 150; i++) await step(1); R.slash = hp0 - (await st('p2')).hp
    ck('the old sure-hit slashes run (14 raw → 8 after the engine\'s damage scaling, as for the old Sukuna)', R.slash >= 8, R.slash)
    for (let i = 0; i < 15 * 60; i++) { if (i % 60 === 0 && !(await S('H.domains()')).length) break; await step(1) }
    await step(4); s = await st(); R.emp = s.s.empUntil - s.s.clock
    ck('after the Shrine ends: Empowered Fuga window (≤ 3 s, polled every 60 f)', R.emp > 100 && R.emp <= 180, R.emp)
    await page.evaluate(() => { const H = __harness.sukunaShinjukuTest; const a = H.raw(), b = H.raw('p2'); a.energy = 210; b.x = a.x + 260; b.health = b.maxHealth; b.hitstun = 0 })
    const hpE = (await st('p2')).hp
    await page.keyboard.down('d'); await step(1); await tap(['l'], 2); await page.keyboard.up('d'); s = await st(); R.empKey = s.attack?.sks?.key
    for (let i = 0; i < 40; i++) await step(1); R.empDmg = hpE - (await st('p2')).hp
    ck('→ + Special in the window → Empowered Fuga, instant max (200 × 1.5 = 300)', R.empKey === 'kFugaE' && R.empDmg >= 290, JSON.stringify([R.empKey, R.empDmg]))
  }

  if (want('gojo') && P2KEY === 'gojo_shinjuku') {
    const R = report.gojo = {}
    const gojo = async (lv, ce = 100) => { await page.evaluate(([lv, ce]) => { const G = __harness.gojoShinjukuTest; G.setCe(ce, 'p2'); G.setInfinity(lv, 'p2') }, [lv, ce]); await step(1) }
    // Infinity stops his plain hits and techniques
    await reset({ gap: 80 }); await gojo(1); let hp0 = (await st('p2')).hp; await tap(['k']); await step(24)
    R.bVsL1 = hp0 - (await st('p2')).hp; ck('Infinity L1 stops a plain Heavy', R.bVsL1 === 0, R.bVsL1)
    await reset({ gap: 400 }); await gojo(1); hp0 = (await st('p2')).hp; await S("H.move('kDismantle')"); for (let i = 0; i < 40; i++) await step(1); let s = await st()
    R.disVsL1 = hp0 - (await st('p2')).hp; ck('Infinity L1 stops Dismantle (strike "stopped": no damage, no hitstun)', R.disVsL1 === 0 && s.s.stats.stopped >= 1, JSON.stringify([R.disVsL1, s.s.stats.stopped]))
    await reset({ gap: 70 }); await gojo(1); hp0 = (await st('p2')).hp; await S("H.move('kCleave')"); for (let i = 0; i < 20; i++) await step(1)
    ck('Infinity L1 stops Cleave', (await st('p2')).hp === hp0)
    // Domain Amplification passes every level
    R.amp = {}
    for (const lv of [1, 2, 3]) {
      await reset({ gap: 80 }); await S("H.move('kAmp')"); await runUntilIdle(); await gojo(lv); hp0 = (await st('p2')).hp
      await tap(['k']); await step(24); R.amp['L' + lv] = hp0 - (await st('p2')).hp
      ck(`Domain Amplification: Heavy lands through Infinity L${lv}`, R.amp['L' + lv] >= 60, R.amp['L' + lv])
    }
    // World-Cutting Slash ignores every level
    for (const lv of [1, 3]) {
      await reset({ gap: 300 }); await gojo(lv); hp0 = (await st('p2')).hp; await S("H.move('kWorld')"); for (let i = 0; i < 100; i++) { await step(1); if (i % 20 === 0) await gojo(lv) }
      R['worldL' + lv] = hp0 - (await st('p2')).hp; ck(`World-Cutting Slash lands through Infinity L${lv} (380)`, R['worldL' + lv] >= 375, R['worldL' + lv])
    }
    // CPU: Amplification only against Infinity, and only after a hit was stopped
    await reset({ gap: 450, energy: 120 }); await S("H.cpu('impossible')"); for (let i = 0; i < 200; i++) { await step(1); await S("H.cpu('impossible')") } s = await st()
    R.cpuNoInf = s.s.stats.amps; ck('CPU never uses Amplification while Infinity is off', s.s.stats.amps === 0, JSON.stringify(s.s.stats))
    await reset({ gap: 450, energy: 120 }); await gojo(1); for (let i = 0; i < 300; i++) { await step(1); await S("H.cpu('impossible')"); if (i % 30 === 0) await gojo(1, 100) } s = await st()
    R.cpuInf = { amps: s.s.stats.amps, stopped: s.s.stats.stopped }; ck('CPU uses Amplification after Infinity stops one of his hits', s.s.stats.amps >= 1 && s.s.stats.stopped >= 1, JSON.stringify(R.cpuInf))
    // DOMAIN CLASH: Shrine vs Unlimited Void
    await reset({ gap: 300 }); await page.evaluate(() => { const H = __harness.sukunaShinjukuTest; H.raw('p2').energy = 300; __harness.gojoShinjukuTest.setCe(100, 'p2') })
    await S("G.move('gDomain', 'p2')"); await step(10)
    await tap(['u'], 2); let g = null; for (let i = 0; i < 160; i++) { await step(1); g = await st('p2'); if (g.gs?.clash) break } R.clashStarted = !!g.gs?.clash
    ck('Shrine cast into an open Unlimited Void → domain clash', R.clashStarted, JSON.stringify(g.gs))
    for (let i = 0; i < 100; i++) { if (i % 2 === 0) await page.keyboard.down('l'); else await page.keyboard.up('l'); await step(1) } await page.keyboard.up('l'); await step(2)
    g = await st('p2'); const doms = await S('H.domains()'); R.clashWin = { last: g.gs?.lastClash, doms }
    ck('mashing Special wins the clash for Sukuna → HIS Shrine reopens (domain "sukuna", owner P1)', g.gs?.lastClash?.result === 'lose' && doms.some(d => d.rosterKey === 'sukuna' && d.owner === s.side), JSON.stringify(R.clashWin))
    await reset({ gap: 300 }); await page.evaluate(() => { const H = __harness.sukunaShinjukuTest; H.raw('p2').energy = 300; H.raw('p2')._gs && (H.raw('p2')._gs.cd.domain = 0); __harness.gojoShinjukuTest.setCe(100, 'p2') })
    await S("G.move('gDomain', 'p2')"); await step(10)
    await tap(['u'], 2); for (let i = 0; i < 160; i++) { await step(1); if ((await st('p2')).gs?.clash) break } for (let i = 0; i < 200; i++) await step(1); s = await st(); g = await st('p2'); R.clashLose = { last: g.gs?.lastClash, burnout: s.techBurnout }
    ck('losing the clash → 5 s technique burnout for Sukuna', g.gs?.lastClash?.result === 'win' && s.techBurnout > 200, JSON.stringify(R.clashLose))
    ck('… in burnout his techniques are refused', !(await S("H.move('kDismantle')")) && !(await S("H.move('kCleave')")))
  }

  if (want('hazards') && P2KEY === 'ns_yellow') {   // a real ninja's trap list (Dustin plants kunai traps into ninjaState.traps)
    const R = report.hazardsNinja = {}
    await reset({ gap: 300 }); await page.evaluate(() => { const H = __harness.sukunaShinjukuTest; const a = H.raw(), b = H.raw('p2'); const fl = a.y + a.h
      b._ninja.traps.push({ x: a.x + a.w + 110, feet: fl, life: 999, id: 901, armed: true }, { x: a.x + 900, feet: fl, life: 999, id: 902, armed: true }) })
    await S("H.move('kWeb')"); for (let i = 0; i < 20; i++) await step(1); const s = await st()
    R.web = { cleared: s.s.stats.trapsCleared, left: await page.evaluate(() => __harness.sukunaShinjukuTest.raw('p2')._ninja.traps.map(t => t.id)) }
    ck('Spiderweb destroys a kunai trap in range (and leaves the far one)', R.web.cleared === 1 && R.web.left.includes(902) && !R.web.left.includes(901), JSON.stringify(R.web))
  }
  if (want('hazards') && P2KEY === 'enoch') {   // Enoch's real elements.js field: an ICE DISC and an ice patch
    const R = report.hazardsEnoch = {}
    await reset({ gap: 300 }); await page.evaluate(() => { const H = __harness.sukunaShinjukuTest, E = __harness.enochTest; const a = H.raw()
      E.patch({ type: 'ice', cx: a.x + a.w + 100, width: 90, disc: true }, 'p2') })
    R.before = await S('H.patches()')
    await S("H.move('kWeb')"); for (let i = 0; i < 20; i++) await step(1); let s = await st()
    R.after = await S('H.patches()'); R.cleared = s.s.stats.patchesCleared
    ck('Spiderweb destroys Enoch\'s ice disc / ground patch in range', R.before.length === 1 && R.after.length === 0 && R.cleared === 1, JSON.stringify(R))
    await reset({ gap: 260 }); await page.evaluate(() => { const H = __harness.sukunaShinjukuTest, E = __harness.enochTest; const b = H.raw('p2')
      E.patch({ type: 'ice', cx: b.x + b.w / 2, width: 140 }, 'p2') })
    const hp0 = (await st('p2')).hp; await S("H.move('kFugaF', 'p1', { lv: 1 })"); for (let i = 0; i < 40; i++) await step(1); s = await st()
    R.react = { reactions: s.s.stats.reactions, field: s.s.field.patches.map(p => p.type), enoch: await S('H.patches()'), dmg: hp0 - (await st('p2')).hp }
    ck('Fuga on Enoch\'s ice → fire + ice reaction (ice consumed, water + steam laid)', R.react.reactions === 1 && R.react.field.includes('water') && R.react.field.includes('steam') && !R.react.enoch.some(p => p.type === 'ice'), JSON.stringify(R.react))
    ck('… the burst adds damage on top of the level-1 Fuga', R.react.dmg > 90, R.react.dmg)
  }

  if (want('combos') && P2KEY === 'sukuna') {
    const R = report.combos = {}
    const run = async (name, fn, minHits) => {
      await reset({ gap: 70 }); const hp0 = (await st('p2')).hp; let maxCombo = 0
      await fn(async n => { for (let i = 0; i < n; i++) { await step(1); maxCombo = Math.max(maxCombo, (await st()).combo) } })
      for (let i = 0; i < 60; i++) { await step(1); maxCombo = Math.max(maxCombo, (await st()).combo) }
      R[name] = { hits: maxCombo, damage: hp0 - (await st('p2')).hp }
      ck(`combo "${name}": ${R[name].hits} hits, ${R[name].damage} dmg`, maxCombo >= minHits, JSON.stringify(R[name]))
    }
    const press = async (keys, w) => { for (const k of keys) await page.keyboard.down(k); await w(2); for (const k of keys) await page.keyboard.up(k) }
    await run('Know your place (J J J K I)', async w => { await press(['j'], w); await w(7); await press(['j'], w); await w(8); await press(['j'], w); await w(10); await press(['k'], w); await w(13); await press(['i'], w); await w(16) }, 5)
    await run('Cut (J J → Cleave)', async w => { await press(['j'], w); await w(7); await press(['j'], w); await w(7); await press(['l'], w); await w(14) }, 3)
    await run('Web finish (J J J → ↓↓ + Special)', async w => { await press(['j'], w); await w(7); await press(['j'], w); await w(8); await press(['j'], w); await w(5); await press(['s'], w); await w(1); await press(['s'], w); await w(1); await press(['s', 'l'], w); await w(20) }, 4)
    await run('Heavy → Dismantle (K → ↓← + Special)', async w => { await press(['k'], w); await w(12); await page.keyboard.down('s'); await w(1); await page.keyboard.down('a'); await w(1); await page.keyboard.up('s'); await press(['l'], w); await page.keyboard.up('a'); await w(30) }, 2)
  }

  if (want('present')) {   // (also run with SKS_P2=gojo_shinjuku for the Gojo win line)
    await reset(); s = await st(); ck('intro bubble "Know your place."', JSON.stringify(s.s).includes('Know your place.') || s.s.said.intro, JSON.stringify(s.s.say))
    const D2 = await S('H.data()')
    await reset(); await page.evaluate(() => { const b = __harness.sukunaShinjukuTest.raw('p2'); b.health = 0 }); let said = null
    for (let i = 0; i < 6 && !said; i++) { await step(1); const q = await st(); if (q.s?.say?.kind === 'win') said = q.s.say.text }
    const wantWin = P2KEY === 'gojo_shinjuku' ? 'Stand proud. You were strong.' : 'Know your place, fool.'
    report.present = { win: said, p2: P2KEY }
    ck(`win line vs ${P2KEY}: "${wantWin}"`, said === wantWin, String(said))
  }
  console.log(`\nerrors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}`)
  ck('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { console.log('EXCEPTION', e.stack); fail++ }
console.log(`\nSUKUNA_SHINJUKU: ${pass} passed, ${fail} failed`)
fs.writeFileSync('docs/msv1/sukuna/test_results.json', JSON.stringify({ pass, fail, report }, null, 1))
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
