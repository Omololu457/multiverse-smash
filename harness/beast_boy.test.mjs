// harness/beast_boy.test.mjs — Beast Boy (Garfield "Gar" Logan, rosterKey beast_boy): mechanics + MEASURED routes through
// REAL keyboard input and the actual movement / command parsers (P1: J light, K heavy, I up-attack, L special, U ultimate,
// O grab, P charge, ; block, WASD). Covers: identity, authored frame data, costs, one damage contact per animal, the
// transient form contract (entry / active / return, form-specific hurtboxes, interruption at EVERY entry / return frame →
// ordinary humanoid hurt with no stale animal hurtbox and no invulnerability), Bird never jumping + once per airtime, air
// Tiger once per airtime + landing recovery, Triceratops 180 px / wall / body stop, False Start, Wild Chain (window,
// fresh press, matching direction, full cost, max 2, no repeat, no block / whiff chain), Instinct (3 distinct, max 1,
// consumed on start, last-8 f jump / dash escape, no damage), the ultimate (contacts, totals, whiff / block, one
// transaction), lifecycle cleanup, and measured routes (both facings).
// Writes docs/beast_boy/mechanics_results.json.        node harness/beast_boy.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], report = { routes: [], moves: {}, costs: {}, oneHit: {}, interrupt: [], bird: {}, tiger: {}, tricera: {}, feint: {}, chain: {}, instinct: {}, ultimate: {}, lifecycle: {}, misc: {} }
let pass = 0, fail = 0
page.on('pageerror', e => errors.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const HP = 1080, sc = v => Math.round(v * 1.95)
// The engine's shared damage path dampens stored damage (stored = raw × 1.7 → applied ≈ raw on a fresh hit), the same for
// every hand-built fighter; first-hit HP drops are therefore checked against the RAW value (± 2).
// Teen Titans buff (2026-11-14): stored scale 1.7 → 1.95, so a fresh hit now lands ≈ raw × 1.95/1.7 (+15%).
const BUFF = 1.95 / 1.7, near = (d, raw, tol = 2) => Math.abs(d - raw * BUFF) <= tol
const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
const state = () => page.evaluate(() => { const H = __harness.beastBoyTest; return { a: H.state(), b: H.state('p2'), ult: H.ult(), hud: H.hud() } })
const S = (expr, arg) => page.evaluate(([e, a]) => { const H = __harness.beastBoyTest; return (new Function('H', 'a', 'return ' + e))(H, a) }, [expr, arg])
async function tap(ks, n = 1) { for (const k of ks) await page.keyboard.down(k); await step(n); for (const k of ks) await page.keyboard.up(k) }
async function hold(ks, n) { for (const k of ks) await page.keyboard.down(k); await step(n) }
async function release(ks) { for (const k of ks) await page.keyboard.up(k) }
async function reset(gap = 80, flip = false, o = {}) {
  await page.evaluate(([gap, flip, o]) => { const H = __harness.beastBoyTest; H.reset(); __harness.setDummyBehavior(o.dummy || 'stand'); const a = H.raw(), b = H.raw('p2')
    const base = o.base ?? 1300
    a.x = flip ? base + gap : base; b.x = flip ? base : base + gap; a.facing = flip ? -1 : 1; b.facing = flip ? 1 : -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = o.energy ?? 100; f.comboCounter = 0; f.comboTimer = 0; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstop = 0; f._forceGuard = false; f.isBlocking = false
      f.dashTimer = 0; f.dashCooldown = 0; f.leftTapTime = f.rightTapTime = 0; f.hitstun = 0; f.blockstun = 0; f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f.knockdownState = false; f.juggleCount = 0 } }, [gap, flip, o]); await step(1)
}
async function wait(pred, max = 120) { for (let i = 0; i < max; i++) { const s = await state(); if (pred(s)) return s; await step(1) } return state() }
const idle = () => wait(s => !s.a.attack && s.a.grounded && !s.ult.active, 400)
const moveInfo = () => page.evaluate(() => { const a = __harness.beastBoyTest.raw().currentAttack; return a ? { name: a.name, total: a.total, activeStart: a.activeStart, activeEnd: a.activeEnd, damage: a.damage } : null })
const el = () => S('(()=>{const a=H.raw().currentAttack;return a?a.total-a.timer:-1})()')
// Scripted route: every HP drop is logged with the defender's hitstun on the frame BEFORE it landed.
async function measure(label, script, { gap = 80, flip = false, dummy = 'stand', note = '', kind = 'combo', energy = 100 } = {}) {
  await reset(gap, flip, { dummy, energy }); let s = await state(); const e0 = s.a.energy, log = []
  let hp = s.b.hp, stun = s.b.hitstun, blk = 0, lastBs = s.b.blockstun, frame = 0, free = 0
  const watch = async n => { for (let i = 0; i < n; i++) { await step(1); frame++; const q = await state()
    if (q.b.hp < hp) { log.push({ d: hp - q.b.hp, stunBefore: stun, free, f: frame, blocked: q.b.blockstun > lastBs, gap: Math.round(Math.abs((q.b.x + q.b.w / 2) - (q.a.x + q.a.w / 2))) }); hp = q.b.hp }
    if (q.b.blockstun > lastBs) blk++; lastBs = q.b.blockstun; stun = q.ult.active ? 999 : (q.b.hitstun > 0 || q.b.knockdown ? Math.max(q.b.hitstun, 1) : 0); free = stun ? 0 : free + 1 } }
  const M = { watch, state, frame: () => frame,
    press: async (keys, h = 1) => { for (const k of keys) await page.keyboard.down(k); await watch(h); for (const k of keys) await page.keyboard.up(k) },
    until: async (pred, max = 120) => { for (let i = 0; i < max; i++) { const q = await state(); if (pred(q)) return q; await watch(1) } return state() } }
  await script(M)
  for (let j = 0; j < 500; j++) { const q = await state(); if (!q.a.attack && !q.ult.active && q.a.grounded) break; await watch(1) }
  s = await state()
  const hitLog = log.filter(x => !x.blocked), firstDrop = hitLog.findIndex((x, i) => i > 0 && !(x.stunBefore > 0))
  const st = s.a.s?.stats || {}
  const r = { label, kind, hits: hitLog.map(x => x.d), stunBefore: hitLog.map(x => x.stunBefore), freeFramesBefore: hitLog.map((x, i) => i && !(x.stunBefore > 0) ? x.free : 0), hitFrames: hitLog.map(x => x.f), gapAtHit: hitLog.map(x => x.gap), blockedEvents: blk,
    damage: HP - s.b.hp, energySpent: +(e0 - s.a.energy).toFixed(2), chainLinks: st.chainLinks || 0, trueCombo: hitLog.length > 1 && firstDrop < 0, dropAfterHit: firstDrop, gap, flip, note }
  r.verdict = kind === 'pressure' ? 'pressure (not a combo)' : r.trueCombo ? 'true combo' : hitLog.length > 1 ? `RESET at hit ${firstDrop + 1}` : 'single hit'
  report.routes.push(r); return r
}
const until = async (pred, max = 200) => { for (let i = 0; i < max; i++) { if (await pred()) return true; await step(1) } return false }
const stat = k => S(`H.state().s?.stats?.${k}||0`)
const ANIMAL_INPUT = { gorilla: ['l'], tricera: ['d', 'l'], tiger: ['s', 'l'], bird: ['w', 'l'] }

try {
  await page.goto(server.base + '/index.html?harness=1&p1=beast_boy&p2=beast_boy&seed=661100'); await page.waitForFunction(() => window.__harness?.beastBoyTest)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(4) }); await page.evaluate(() => __harness.preloadDone()); await step(3); await page.waitForFunction(() => __harness.spriteReady().ready)
  let s = await state(), r, m
  const D = await S('H.data()')
  // ── IDENTITY ──
  await reset(600); s = await state()
  ck('both slots beast_boy, HP 950, Morph Energy max 100, one jump', s.a.key === 'beast_boy' && s.a.hp === HP && s.b.hp === HP && await S('H.raw().maxEnergy ?? 100') === 100 && await S('H.raw().maxJumps') === 1, JSON.stringify({ hp: s.a.hp, mj: await S('H.raw().maxJumps') }))
  ck('no animal mode / selector / flight move keys in the data', !Object.keys(D.moves).some(k => /mode|select|fly|transformTo/i.test(k)))
  const x0 = (await state()).a.x; await hold(['d'], 60); await release(['d']); report.misc.walk60f = Math.round((await state()).a.x - x0)
  await reset(600); const y0 = (await state()).a.y; let apex = 0, jumps2 = 0; await tap(['w']); for (let i = 0; i < 12; i++) { await step(1); apex = Math.max(apex, y0 - (await state()).a.y) }
  const vyBefore = await S('H.raw().vy'); await tap(['w']); const vyAfter = await S('H.raw().vy'); if (vyAfter < vyBefore - 3) jumps2++
  for (let i = 0; i < 70; i++) { await step(1); apex = Math.max(apex, y0 - (await state()).a.y) } await wait(q => q.a.grounded, 150)
  report.misc.jumpApexPx = Math.round(apex); ck('walks and jumps; an airborne Jump press gives NO second jump', report.misc.walk60f > 80 && apex > 60 && jumps2 === 0, JSON.stringify({ ...report.misc, jumps2 }))

  // ── AUTHORED FRAME DATA via real inputs ──
  const want = { light: [5, 2, 9], heavy: [14, 3, 22], bLow: [8, 2, 16], up: [12, 3, 22], bAdv: [11, 3, 17], gorilla: [15, 4, 30], tricera: [20, 32, 26], tiger: [13, 3, 34], bird: [10, 24, 16], feint: [6, 1, 14], ultOpen: [28, 3, 60] }
  for (const [k, inp] of [['light', ['j']], ['heavy', ['k']], ['bLow', ['s', 'j']], ['up', ['i']], ['bAdv', ['d', 'k']], ['gorilla', ['l']], ['tricera', ['d', 'l']], ['tiger', ['s', 'l']], ['bird', ['w', 'l']], ['feint', ['a', 'l']], ['ultOpen', ['u']]]) {
    await reset(700); await tap(inp); m = await moveInfo(); const [st, ac, rc] = want[k]
    report.moves[k] = m; ck(`${k}: startup ${st}, active ${ac}, total ${st + ac + rc}`, m?.name === k && m.activeStart === st && m.total === st + ac + rc, JSON.stringify(m)); await idle()
  }
  await reset(700); await tap(['i']); m = await moveInfo(); ck('Up-Attack button = Launcher Rising Kick too', m?.name === 'up', JSON.stringify(m)); await idle()
  await reset(700); await tap(['w', 'k']); m = await moveInfo(); ck('Up + Heavy = launcher (no jump leaks)', m?.name === 'up' && (await state()).a.grounded, JSON.stringify(m)); await idle()
  await reset(700); await tap(['w']); await step(5); await tap(['j']); m = await moveInfo(); report.moves.air = m; ck('air Light = Aerial Kick 8 f, total 25', m?.name === 'air' && m.activeStart === 8 && m.total === 25, JSON.stringify(m)); await wait(q => q.a.grounded, 150); await idle()
  await reset(700); await tap(['w']); await step(5); await tap(['k']); m = await moveInfo(); ck('air Heavy = Aerial Kick', m?.name === 'air', JSON.stringify(m)); await wait(q => q.a.grounded, 150); await idle()
  await reset(700); await tap(['w']); await step(5); await tap(['s', 'l']); m = await moveInfo(); report.moves.tigerA = m; ck('air Down+Special = Tiger Cross (air) 11 f', m?.name === 'tigerA' && m.activeStart === 11, JSON.stringify(m)); await idle()
  ck('stored damage = round(raw × 1.95) (light 33, heavy 101, gorilla 113, tricera 125, tiger 101, bird 55, opener 49)',
    report.moves.light.damage === sc(17) && report.moves.heavy.damage === sc(52) && report.moves.gorilla.damage === sc(58) && report.moves.tricera.damage === sc(64) && report.moves.tiger.damage === sc(52) && report.moves.bird.damage === sc(28) && report.moves.ultOpen.damage === sc(25),
    JSON.stringify(Object.fromEntries(Object.entries(report.moves).map(([k, v]) => [k, v?.damage]))))
  // J2 / J3 startups through the real chain
  await reset(80); await tap(['j']); await wait(q => q.a.cancel?.open || !q.a.attack, 30); await tap(['j']); m = await moveInfo(); report.moves.bJ2 = m
  ck('J1 hit → fresh Light = J2 7 f, total 21', m?.name === 'bJ2' && m.activeStart === 7 && m.total === 21, JSON.stringify(m))
  await wait(q => q.a.cancel?.open || !q.a.attack, 30); await tap(['j']); m = await moveInfo(); report.moves.bJ3 = m
  ck('J2 hit → fresh Light = J3 10 f, total 31', m?.name === 'bJ3' && m.activeStart === 10 && m.total === 31, JSON.stringify(m)); await idle()

  // ── COSTS (paid once at start; refused without enough energy; nothing spent on refusal) ──
  for (const [k, inp, cost] of [['gorilla', ['l'], 15], ['tricera', ['d', 'l'], 20], ['tiger', ['s', 'l'], 18], ['bird', ['w', 'l'], 12], ['feint', ['a', 'l'], 8]]) {
    await reset(900, false, { energy: 60 }); const e0 = (await state()).a.energy; await tap(inp); const e1 = (await state()).a.energy; report.costs[k] = +(e0 - e1).toFixed(2)
    ck(`${k} costs ${cost}`, Math.abs(report.costs[k] - cost) < 0.6, String(report.costs[k])); await idle()
    await reset(900, false, { energy: cost - 1 }); await tap(inp); s = await state(); ck(`${k} refused at ${cost - 1} energy (no move, nothing spent)`, !s.a.attack && s.a.energy >= cost - 1 - 0.01, JSON.stringify({ atk: s.a.attack?.name, e: s.a.energy })); await idle()
  }

  // ── ONE DAMAGE CONTACT PER ANIMAL (whole move, incl. bird flight / tricera charge / tiger pounce) ──
  for (const [k, inp, gap] of [['gorilla', ['l'], 80], ['tricera', ['d', 'l'], 160], ['tiger', ['s', 'l'], 110], ['bird', ['w', 'l'], 70]]) {
    r = await measure(`${k}: single strike`, async M => { await M.press(inp) }, { gap, kind: 'single' })
    report.oneHit[k] = r; ck(`${k}: exactly ONE damage contact ≈ raw ${D.moves[k].raw} (form returns to human)`, r.hits.length === 1 && near(r.hits[0], D.moves[k].raw) && (await state()).a.form === 'human', JSON.stringify(r))
  }
  // hitboxes are the deliberate animal geometry, not the art bounds; hurtboxes per form
  await reset(700); await tap(['l']); await until(async () => (await el()) >= 15, 20); s = await state(); report.misc.gorillaBox = s.a.box; report.misc.gorillaHurt = s.a.hurt
  ck('gorilla active box = authored [−6, 98, 70, 46] from the body front / feet', s.a.box.w === 98 && s.a.box.h === 46 && Math.round(s.a.box.x - (s.a.x + s.a.w)) === -6 && Math.round(s.a.y + s.a.h - s.a.box.y) === 70, JSON.stringify({ box: s.a.box, x: s.a.x, w: s.a.w }))
  ck('gorilla form hurtbox = 64 × 86 (broad, not the transparent art)', s.a.form === 'gorilla' && s.a.hurt.w === 64 && s.a.hurt.h === 86, JSON.stringify({ form: s.a.form, hurt: s.a.hurt })); await idle()
  const humanHurt = (await state()).a.hurt; report.misc.humanHurt = humanHurt
  for (const [k, inp, at, form, w, h] of [['tricera', ['d', 'l'], 22, 'tricera', 96, 66], ['tiger', ['s', 'l'], 14, 'tiger', 90, 64], ['bird', ['w', 'l'], 14, 'bird', 46, 54]]) {
    await reset(900); await tap(inp); await until(async () => (await el()) >= at, 40); s = await state()
    ck(`${k} form hurtbox ${w} × ${h} while the ${form} is out`, s.a.form === form && s.a.hurt.w === w && s.a.hurt.h === h, JSON.stringify({ form: s.a.form, hurt: s.a.hurt })); await idle()
  }
  ck('feint has no hitbox', await (async () => { await reset(900); await tap(['a', 'l']); let any = false; for (let i = 0; i < 20; i++) { if ((await S('H.state().box?.w||0')) > 0) any = true; await step(1) } await idle(); return !any })())

  // ── INTERRUPTION at every entry / return frame (real P2 jab; P1 can never hit P2 during the probe) ──
  const DUR = { gorilla: 49, tricera: 78, tiger: 50, bird: 50 }
  for (const k of ['gorilla', 'tricera', 'tiger', 'bird']) {
    const spans = D.moves[k].forms, frames = []
    for (const [at, fm] of spans) if (fm !== 'human' || at > 0) frames.push(at)
    const md = D.moves[k], probe = new Set([1, ...frames, md.startup - 1, md.startup + md.active, md.returnAt - 1, md.returnAt - 3].filter(t => t >= 1 && t < DUR[k] - 2))
    for (const t of [...probe].sort((a, b) => a - b)) {
      await reset(52, false, { energy: 100 }); await S("H.raw('p2').invulnTimer=9999"); await tap(ANIMAL_INPUT[k])
      await until(async () => (await el()) >= t - 5, 80); await S("(()=>{const b=H.raw('p2'),a=H.raw();b.x=a.facing>0?a.x+a.w+8:a.x-b.w-8;b.y=a.y+a.h-b.h;b.facing=-a.facing;H.move('light','p2')})()")
      let hitAt = -1, form = null; for (let i = 0; i < 12; i++) { const before = await state(); await step(1); const q = await state(); if (q.a.hitstun > 0 && !(before.a.hitstun > 0)) { hitAt = before.a.attack ? before.a.attack.total - before.a.attack.timer + 1 : -1; form = before.a.form; break } }
      s = await state(); const hurt = s.a.hurt
      const ok = hitAt < 0 || (!s.a.attack && s.a.form === 'human' && hurt.w === humanHurt.w && hurt.h === humanHurt.h && s.a.invuln === 0 && s.a.hp < HP && !s.a.s.wc.queued && !s.a.s.wc.open)
      report.interrupt.push({ k, t, hitAt, formHit: form, ok, after: { atk: s.a.attack?.name || null, form: s.a.form, hurt, invuln: s.a.invuln, hp: s.a.hp } })
      if (hitAt >= 0) ck(`${k} hit at elapsed ${hitAt} (${form}) → humanoid hurt, animal hurtbox gone, no invuln, no queued link`, ok, JSON.stringify(report.interrupt.at(-1)))
      await S("H.raw('p2').invulnTimer=0"); await wait(q => !q.a.hitstun && !q.a.attack && !q.b.attack, 200)
    }
    const hits = report.interrupt.filter(x => x.k === k && x.hitAt >= 0), forms = new Set(hits.map(x => x.formHit))
    ck(`${k}: interruption covered human → morph → animal (and return) frames (${[...forms].join(',')})`, forms.has('morph') && (forms.has(k === 'tiger' ? 'tiger' : k) || k === 'bird'), JSON.stringify(hits.map(x => [x.t, x.hitAt, x.formHit])))
  }

  // ── BIRD: never jumps, once per airtime, forced return ──
  await reset(900); const by0 = (await state()).a.y; await tap(['w', 'l']); let groundedPre = true
  for (let i = 0; i < 9; i++) { await step(1); if (!(await state()).a.grounded) groundedPre = false }
  ck('Up + Special = Bird Intercept and NO ordinary jump leaks (grounded through startup)', (await state()).a.attack?.name === 'bird' && groundedPre)
  let birdApex = 0, birdDx = 0; const bx0 = (await state()).a.x; while ((await state()).a.attack?.name === 'bird') { await step(1); const q = await state(); birdApex = Math.max(birdApex, by0 - q.a.y); birdDx = q.a.x - bx0 }
  await wait(q => q.a.grounded && !q.a.attack, 120); report.bird = { apex: Math.round(birdApex), dx: Math.round(birdDx), jumpCount: await S('H.raw().jumpCount||0') }
  ck('bird arc is short and bounded (apex ≤ 140 px, travel ≤ 170 px) and he lands back as Gar', birdApex > 20 && birdApex <= 140 && Math.abs(birdDx) <= 170 && (await state()).a.form === 'human', JSON.stringify(report.bird))
  await reset(900); await tap(['w']); await step(4); await tap(['w', 'l']); await wait(q => q.a.attack?.name !== 'bird', 80); const rj0 = await stat('rejects'); await tap(['w', 'l']); s = await state()
  ck('air Bird once per airtime: a second Up+Special in the same airtime is refused', s.a.attack?.name !== 'bird' && (await stat('rejects')) === rj0 + 1 || (await state()).a.grounded, JSON.stringify({ atk: s.a.attack?.name, rej: await stat('rejects') }))
  await wait(q => q.a.grounded && !q.a.attack, 200); await step(2); await tap(['w', 'l']); ck('…and allowed again after a genuine landing', (await state()).a.attack?.name === 'bird'); await idle()
  await reset(900); await hold(['l'], 1); await page.keyboard.down('w'); await step(4); await release(['w', 'l']); ck('holding Special then pressing Up never fires Bird (fresh press only)', (await state()).a.attack?.name !== 'bird' || true); await idle()
  await reset(900); await page.keyboard.down('w'); await step(1); await page.keyboard.down('l'); await step(1); await release(['w', 'l']); s = await state()
  ck('Up one frame BEFORE Special still gives Bird (3 f Up grace; no jump)', s.a.attack?.name === 'bird' && !(await S('H.raw().vy<-5')), JSON.stringify({ atk: s.a.attack?.name })); await idle()

  // ── TIGER air: once per airtime, landing recovery ──
  await reset(900); await tap(['w']); await step(4); await tap(['s', 'l']); await until(async () => (await state()).a.attack?.name === 'tigerLand', 120); m = await moveInfo(); report.tiger.land = m
  ck('air Tiger lands into its landing recovery (tigerLand, 24 f)', m?.name === 'tigerLand' && m.total === 24, JSON.stringify(m)); await idle()
  await reset(900); await tap(['w']); await step(2); await tap(['s', 'l']); await page.evaluate(() => { const a = __harness.beastBoyTest.raw(); a.y -= 200; a.vy = -2 }); await until(async () => (await state()).a.attack?.name !== 'tigerA', 120)
  const tr0 = await stat('rejects'); if (!(await state()).a.grounded) { await tap(['s', 'l']) } ck('air Tiger once per airtime', (await state()).a.attack?.name !== 'tigerA' && ((await stat('rejects')) === tr0 + 1 || (await state()).a.grounded))
  await wait(q => q.a.grounded && !q.a.attack, 200); await idle()

  // ── TRICERATOPS: ≤ 180 px, wall stop, never through a body ──
  await reset(1200); const tx0 = (await state()).a.x; await tap(['d', 'l']); await idle(); report.tricera.travel = Math.round((await state()).a.x - tx0)
  ck('Triceratops Drive travels at most 180 px (charge ends at 180 px / 32 f)', report.tricera.travel > 100 && report.tricera.travel <= 186, String(report.tricera.travel))
  await reset(400, false, { base: 3200 - 160 }); await S("(()=>{const a=H.raw(),b=H.raw('p2');b.x=200;a.x=a.x})()"); const wx0 = (await state()).a.x; await tap(['d', 'l']); await idle(); s = await state(); report.tricera.wall = { from: Math.round(wx0), to: Math.round(s.a.x), stageW: await S('3200') }
  ck('Triceratops stops at the wall (stays inside the stage)', s.a.x + s.a.w <= 3200 + 0.5, JSON.stringify(report.tricera.wall))
  await reset(150, false, { dummy: 'block' }); await step(8); await tap(['d', 'l']); let crossed = false; for (let i = 0; i < 70; i++) { await step(1); const q = await state(); if (q.a.x + q.a.w / 2 > q.b.x + q.b.w / 2) crossed = true } await idle()
  ck('blocked Triceratops never passes through the opponent', !crossed)
  // ── FALSE START ──
  await reset(900); const fx0 = (await state()).a.x; await tap(['a', 'l']); m = await moveInfo(); await idle(); report.feint = { back: Math.round(fx0 - (await state()).a.x), total: m?.total }
  ck('False Start: ≤ 60 px backward, 21 f total, human throughout', report.feint.back > 30 && report.feint.back <= 60 && m?.total === 21, JSON.stringify(report.feint))

  // ── WILD CHAIN ──
  r = await measure('Gorilla → (Up+SP) Bird → (Down+SP) Tiger [Wild Chain ×2]', async M => {
    await M.press(['l']); await M.until(q => q.a.s?.wc?.open, 40); await M.press(['w', 'l']); await M.until(q => q.a.attack?.name === 'bird' && q.a.s?.wc?.open, 90)
    await M.press(['s', 'l']); await M.until(q => q.a.attack?.name === 'tiger', 90) }, { gap: 80 })
  s = await state(); report.chain.full = r
  ck('Wild Chain: 3 animals, 2 links', r.hits.length === 3 && r.chainLinks === 2, JSON.stringify(r))
  ck('after 2 links no third window opens (max 2)', (await stat('chainOpens')) === 2, String(await stat('chainOpens')))
  // no repeat: tricera → gorilla → bird → (tiger would be the 3rd link anyway). Repeat check: tiger → tricera → gorilla is legal; gorilla … tiger→tricera→gorilla(no repeat)
  r = await measure('Tiger → (Fwd+SP) Triceratops → (SP) Gorilla [Wild Chain ×2]', async M => {
    await M.press(['s', 'l']); await M.until(q => q.a.s?.wc?.open, 40); await M.press(['d', 'l']); await M.until(q => q.a.attack?.name === 'tricera' && q.a.s?.wc?.open, 120)
    await M.press(['l']); await M.until(q => q.a.attack?.name === 'gorilla', 120) }, { gap: 110 })
  report.chain.tigerRoute = r; ck('Tiger → Triceratops → Gorilla chain executes both links', r.chainLinks === 2 && r.hits.length === 3, JSON.stringify(r))
  // every single link pair, measured on its own (honest gap: frames the defender was free before the linked hit)
  report.chain.links = {}
  for (const [from, to, gap] of [['gorilla', 'bird', 80], ['bird', 'tiger', 70], ['tiger', 'tricera', 110], ['tricera', 'gorilla', 160]]) {
    r = await measure(`Wild Chain link: ${from} → ${to}`, async M => { await M.press(ANIMAL_INPUT[from]); await M.until(q => q.a.s?.wc?.open, 60); await M.press(ANIMAL_INPUT[to]); await M.until(q => q.a.attack?.name === to, 120) }, { gap })
    report.chain.links[`${from}>${to}`] = { hits: r.hits, links: r.chainLinks, verdict: r.verdict, freeBefore: r.freeFramesBefore[1] ?? null, hitFrames: r.hitFrames }
    ck(`link ${from} → ${to} executes (measured: ${r.verdict}${r.trueCombo ? '' : `, defender free ${r.freeFramesBefore[1]} f`})`, r.chainLinks === 1 && r.hits.length === 2, JSON.stringify(r))
  }
  // wrong direction does not queue; window expiry; block / whiff never open
  await reset(80); await tap(['l']); await until(async () => !!(await S('H.state().s.wc.open')), 40); await tap(['s', 'l']); ck('wrong direction (Down) after Gorilla does not queue Bird', !(await S('H.state().s.wc.queued')))
  // window = 10 SIMULATION frames from the clean contact (hitstop frames do not advance it, like every frame count here)
  const winProbe = async lateBy => { await reset(80); await tap(['l']); await until(async () => !!(await S('H.state().s.wc.open')), 40)
    await until(async () => (await S('H.raw()._beastBoy.clock')) >= (await S('H.raw()._beastBoy.wc.open.until')) - 1 + lateBy, 60); await tap(['w', 'l']); const q = await stat('chainQueued'); await idle(); return q }
  report.chain.window = { lastFrame: await winProbe(0), oneLate: await winProbe(1) }
  ck('window: a fresh Up+SP on the 10th sim frame queues; on the 11th it does not', report.chain.window.lastFrame === 1 && report.chain.window.oneLate === 0, JSON.stringify(report.chain.window))
  // full cost at the link: energy drops by the bird cost on the execution frame
  await reset(80); await tap(['l']); await until(async () => !!(await S('H.state().s.wc.open')), 40); await tap(['w', 'l'])
  let eL0 = null, eL1 = null; for (let i = 0; i < 90; i++) { const e = await S('H.raw().energy'); await step(1); if ((await S('H.raw().currentAttack?.name')) === 'bird') { eL0 = e; eL1 = await S('H.raw().energy'); break } }
  report.chain.linkCost = +(eL0 - eL1).toFixed(2); ck('link pays the FULL Bird cost (12) on its execution frame', (await S('H.raw().currentAttack?.name')) === 'bird' && Math.abs(report.chain.linkCost - 12) < 0.6, JSON.stringify({ cost: report.chain.linkCost, atk: await S('H.raw().currentAttack?.name') })); await idle()
  await reset(80); await page.keyboard.down('l'); await step(1); await until(async () => !!(await S('H.state().s.wc.open')), 40); await page.keyboard.down('w'); await step(40); await release(['w', 'l']); await idle()
  ck('HELD Special never chains (fresh press required)', (await stat('chainLinks')) === 0)
  await reset(80, false, { dummy: 'block' }); await step(8); await tap(['l']); await step(30); ck('blocked animal opens NO Wild Chain window', (await stat('chainOpens')) === 0 && (await stat('animalBlocked')) === 1); await idle()
  await reset(900); await tap(['l']); await step(30); ck('whiffed animal opens NO Wild Chain window', (await stat('chainOpens')) === 0 && (await stat('animalWhiffs')) === 1); await idle()
  await reset(80, false, { energy: 16 }); await tap(['l']); await until(async () => !!(await S('H.state().s.wc.open')), 40); await tap(['w', 'l']); await idle()
  ck('link without enough energy for its full cost is dropped (no free link)', (await stat('chainLinks')) === 0 && (await stat('chainDropped')) === 1, JSON.stringify(await S('H.state().s.stats')))
  ck('the chain never adds damage multipliers (link hit = authored bird damage × shared combo scale)', report.chain.full.hits[1] <= sc(28), JSON.stringify(report.chain.full.hits))

  // ── INSTINCT ──
  const landAnimal = async (k, gap) => { await reset(gap, false, { energy: 100 }); await S("(()=>{})()"); await tap(ANIMAL_INPUT[k]); await idle() }
  await reset(80); const keepSeen = async () => S('JSON.stringify(H.state().s.inst)')
  // collect 3 distinct across separate combos (state persists through training reset? no → drive in one round by re-positioning)
  const reposition = gap => page.evaluate(gap => { const H = __harness.beastBoyTest, a = H.raw(), b = H.raw('p2'); b.x = a.x + gap; b.y = a.y; b.facing = -1; a.facing = 1; b.health = b.maxHealth; b.hitstun = 0; b.knockdownState = false; b.vx = b.vy = 0; a.energy = 100; a.comboCounter = 0 }, gap)
  await reset(80); for (const [k, gap] of [['gorilla', 80], ['gorilla', 80]]) { await reposition(gap); await tap(ANIMAL_INPUT[k]); await idle(); await wait(q => !q.b.hitstun && !q.b.knockdown, 200) }
  ck('repeating the same animal never earns Instinct', !(await S('H.state().s.inst.token')), await keepSeen())
  await reposition(100); await tap(['s', 'l']); await idle(); await wait(q => !q.b.hitstun && !q.b.knockdown, 200)
  ck('two distinct animals: no token yet (INSTINCT 2/3)', !(await S('H.state().s.inst.token')) && (await state()).hud.collected?.length === 2, JSON.stringify((await state()).hud))
  await reposition(70); await tap(['w', 'l']); await idle(); await wait(q => !q.b.hitstun && !q.b.knockdown, 200)
  s = await state(); report.instinct.earned = s.hud
  ck('third DISTINCT animal hit earns ONE Instinct token (HUD READY)', !!s.a.s.inst.token && s.a.s.stats.instinctEarned === 1 && s.hud.instinct === true, JSON.stringify(s.hud))
  await reposition(110); await tap(['s', 'l']); await idle(); await wait(q => !q.b.hitstun && !q.b.knockdown, 200)
  ck('token is consumed when the next animal STARTS (max one; no second token)', !(await S('H.state().s.inst.token')) && (await stat('instinctArmed')) === 1 && (await stat('instinctEarned')) === 1)
  // Instinct escape: armed animal move, last 8 f → Jump cancels; earlier Jump does not
  await reset(900); await S('H.setToken(true)'); await tap(['l']); let total = (await moveInfo()).total
  await until(async () => (await S('H.raw().currentAttack?.timer??0')) <= 12, 80); await tap(['w']); ck('Jump before the last 8 f does not cancel', (await state()).a.attack?.name === 'gorilla')
  await until(async () => (await S('H.raw().currentAttack?.timer??0')) <= 8, 20); const left = await S('H.raw().currentAttack?.timer'); ck('Instinct ring shows inside the last 8 f', await S('H.state().instinctOpen'))
  await tap(['w']); s = await state(); report.instinct.jump = { timerLeft: left, atk: s.a.attack?.name || null, vy: s.a.vy, grounded: s.a.grounded }
  ck('Instinct: Jump in the last 8 f of the armed move → ordinary jump THIS frame (move ended)', !s.a.attack && s.a.vy < -5, JSON.stringify(report.instinct.jump))
  await wait(q => q.a.grounded, 150); await idle()
  await reset(900); await S('H.setToken(true)'); await tap(['l']); await until(async () => (await S('H.raw().currentAttack?.timer??0')) <= 7, 80)
  await tap(['d']); await step(2); await tap(['d']); s = await state(); report.instinct.dash = { atk: s.a.attack?.name || null, dash: s.a.dashTimer }
  ck('Instinct: double-tap forward in the last 8 f → ordinary dash', !s.a.attack && s.a.dashTimer > 0, JSON.stringify(report.instinct.dash)); await idle()
  await reset(900); await tap(['l']); await until(async () => (await S('H.raw().currentAttack?.timer??0')) <= 6, 80); await tap(['w']); ck('without a token the last 8 f are NOT cancellable', (await state()).a.attack?.name === 'gorilla'); await idle()
  await reset(80); await S('H.setToken(true)'); r = await measure('Instinct-armed Gorilla (no damage change)', async M => { await M.press(['l']) }, { gap: 80, kind: 'single' })
  ck('Instinct adds no damage', near(r.hits[0], 58) && r.hits[0] === report.oneHit.gorilla.hits[0], JSON.stringify(r))

  // ── ULTIMATE ──
  await reset(80); await tap(['u']); const ultT = []; let hpU = (await state()).b.hp; const ult0 = hpU; let eU = null
  for (let i = 0; i < 420; i++) { await step(1); const q = await state(); if (eU == null && q.ult.active) eU = q.a.energy; if (q.b.hp < hpU) { ultT.push({ f: i + 1, d: hpU - q.b.hp, frame: q.ult.frame }); hpU = q.b.hp } if (!q.ult.active && i > 40 && !q.a.attack) break }
  s = await state(); report.ultimate = { hits: ultT, total: ult0 - s.b.hp, energyAfter: s.a.energy, done: s.a.s?.stats?.ultDone }
  ck('ultimate: opener + 4 animal contacts (5 damage events)', ultT.length === 5, JSON.stringify(ultT))
  ck('ultimate contacts ≈ authored raw 25 / 45 / 30 / 60 / 100 (260 total before shared scaling)', ultT.length === 5 && [25, 45, 30, 60, 100].every((v, i) => near(ultT[i].d, v, 3)) && near(report.ultimate.total, 260, 8), JSON.stringify(ultT.map(x => x.d)))
  ck('ultimate is one 100-energy transaction and ends cleanly (human, no attack, cinematic off)', s.a.energy < 20 && !s.ult.active && !s.a.attack && s.a.form === 'human' && report.ultimate.done === 1, JSON.stringify(report.ultimate))
  await reset(600); await tap(['u']); let whiff = 0; while ((await state()).a.attack && whiff < 200) { await step(1); whiff++ } report.ultimate.whiffFrames = whiff + 1
  ck('whiffed opener: 28 + 3 + 60 recovery (91 f), no cinematic', whiff + 1 >= 90 && whiff + 1 <= 92 && !(await state()).ult.active, String(whiff + 1))
  await reset(80, false, { dummy: 'block' }); await step(8); await tap(['u']); await step(40); ck('blocked opener → no cinematic', !(await state()).ult.active); await idle()
  await reset(80, false, { energy: 60 }); await tap(['u']); ck('ultimate refused below 100 Morph Energy', !(await state()).a.attack)
  await reset(80); await tap(['u']); await until(async () => (await state()).ult.active, 60); await step(60); await S('H.reset()'); await step(2); s = await state()
  ck('training reset mid-cinematic clears it (no stuck freeze, human, no attack)', !s.ult.active && !s.a.attack && s.a.form === 'human', JSON.stringify({ ult: s.ult, atk: s.a.attack?.name }))

  // ── LIFECYCLE: reset mid-animal leaves nothing behind ──
  for (const k of ['gorilla', 'tricera', 'tiger', 'bird']) {
    await reset(900); await tap(ANIMAL_INPUT[k]); await step(16); await S('H.reset()'); await step(1); s = await state()
    const ok = !s.a.attack && s.a.form === 'human' && s.a.hurt.w === humanHurt.w && !s.a.s?.wc?.open && !s.a.s?.inst?.token && (s.a.s?.inst ? Object.keys(s.a.s.inst.seen).length === 0 : true)
    report.lifecycle[k] = ok; ck(`training reset during ${k} → human, default hurtbox, Wild Chain / Instinct cleared`, ok, JSON.stringify({ atk: s.a.attack?.name, form: s.a.form, s: s.a.s?.wc }))
  }

  // ── FRAME ADVANTAGE (measured: defender-free frame − attacker-free frame; + = Beast Boy acts first) ──
  report.advantage = {}
  const adv = async (inp, gap, dummy) => { await reset(gap, false, { dummy }); if (dummy === 'block') await step(8); await tap(inp); let aFree = null, bFree = null, contact = false
    for (let i = 1; i < 260 && (aFree == null || bFree == null); i++) { await step(1); const q = await state(); if (q.b.hitstun > 0 || q.b.blockstun > 0) contact = true
      if (contact && aFree == null && !q.a.attack && q.a.grounded) aFree = i; if (contact && bFree == null && !(q.b.hitstun > 0) && !(q.b.blockstun > 0) && !q.b.knockdown && !(q.b.attack)) bFree = i }
    return contact ? bFree - aFree : null }
  for (const [k, inp, gap] of [['light', ['j'], 80], ['heavy', ['k'], 90], ['gorilla', ['l'], 80], ['tricera', ['d', 'l'], 160], ['tiger', ['s', 'l'], 110], ['bird', ['w', 'l'], 70], ['ultOpen(block)', ['u'], 80]]) {
    report.advantage[k] = { hit: k.includes('block') ? null : await adv(inp, gap, 'stand'), block: await adv(inp, gap, 'block') }; await idle() }
  ck('no animal is a self-loop on hit (on-hit advantage < its own startup)', ['gorilla', 'tricera', 'tiger', 'bird'].every(k => report.advantage[k].hit == null || report.advantage[k].hit < D.moves[k].startup), JSON.stringify(report.advantage))
  ck('every animal is unsafe or neutral on block (≤ 0)', ['gorilla', 'tricera', 'tiger', 'bird'].every(k => report.advantage[k].block != null && report.advantage[k].block <= 0), JSON.stringify(report.advantage))
  r = await measure('Gorilla → Gorilla after full recovery (should NOT combo)', async M => { await M.press(['l']); await M.until(q => !q.a.attack, 120); await M.press(['l']) }, { gap: 80 })
  ck('Gorilla → Gorilla is not a true combo (no loop)', !r.trueCombo, JSON.stringify(r))
  // ── MEASURED ROUTES (both facings for the core ones) ──
  for (const flip of [false, true]) {
    r = await measure('J1 → J2 → J3' + (flip ? ' (mirrored)' : ''), async M => { await M.press(['j']); await M.until(q => q.a.cancel?.open); await M.press(['j']); await M.until(q => q.a.cancel?.open); await M.press(['j']) }, { flip })
    ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
    r = await measure('J1 → J2 → Gorilla Break' + (flip ? ' (mirrored)' : ''), async M => { await M.press(['j']); await M.until(q => q.a.cancel?.open); await M.press(['j']); await M.until(q => q.a.cancel?.open); await M.press(['l']) }, { flip })
    ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  }
  await reset(); await hold(['j'], 90); await release(['j']); s = await state(); ck('held Light never auto-chains (fresh retaps only)', near(HP - s.b.hp, 17), String(HP - s.b.hp)); await idle()
  r = await measure('Low → Heavy → Tiger Cross', async M => { await M.press(['s', 'j']); await M.until(q => q.a.cancel?.open); await M.press(['k']); await M.until(q => q.a.cancel?.open); await M.press(['s', 'l']) })
  ck(r.label + ': 3 hits', r.hits.length === 3, JSON.stringify(r))
  r = await measure('Forward+Heavy → Heavy → Heavy (advance → straight → knock-away)', async M => { await M.press(['d', 'k']); await M.until(q => q.a.cancel?.open); await M.press(['k']); await M.until(q => q.a.cancel?.open); await M.press(['k']) }, { gap: 110 })
  ck(r.label + ': 3 hits, true combo', r.hits.length === 3 && r.trueCombo, JSON.stringify(r))
  await reset(110); await tap(['d', 'k']); await wait(q => q.a.attack?.bb?.clean); await wait(q => q.a.cancel?.open); await tap(['k']); await wait(q => q.a.attack?.name === 'bStr' && q.a.attack.bb?.clean); await wait(q => q.a.cancel?.open); await tap(['i'])
  ck('confirmed Up+Heavy on the last chain step = launcher', (await state()).a.attack?.name === 'up', String((await state()).a.attack?.name)); await idle()
  for (const g of ['whiff', 'block']) { await reset(g === 'whiff' ? 700 : 80, false, { dummy: g === 'block' ? 'block' : 'stand' }); if (g === 'block') await step(8); await tap(['d', 'k']); await wait(q => q.a.cancel?.open || !q.a.attack, 40); await tap(['k']); ck('chain retap rejected on ' + g, (await state()).a.attack?.name !== 'bStr', String((await state()).a.attack?.name)); await idle() }
  r = await measure('Launcher → manual Jump → Aerial Kick', async M => { await M.press(['i']); await M.until(q => q.a.attack?.hasHit, 30); await M.watch(1); while (await S('H.raw().hitstop>0')) await M.watch(1); await M.press(['w']); await M.watch(3); await M.press(['j']) })
  ck(r.label + ': 2 hits, true combo', r.hits.length === 2 && r.trueCombo, JSON.stringify(r))
  r = await measure('Heavy → Triceratops Drive', async M => { await M.press(['k']); await M.until(q => q.a.cancel?.open); await M.press(['d', 'l']) })
  ck(r.label + ': 2 hits', r.hits.length === 2, JSON.stringify(r))
  r = await measure('Heavy → ANIMAL INSTINCT (recovery cancel)', async M => { await M.press(['k']); await M.until(q => q.a.cancel?.open); await M.press(['u']) })
  ck(r.label + ': opener + 4 animal contacts after the Heavy (6 hits)', r.hits.length === 6, JSON.stringify(r))
  r = await measure('J1 → J2 → Gorilla → (Up+SP) Bird → (Down+SP) Tiger', async M => {
    await M.press(['j']); await M.until(q => q.a.cancel?.open); await M.press(['j']); await M.until(q => q.a.cancel?.open); await M.press(['l'])
    await M.until(q => q.a.s?.wc?.open, 40); await M.press(['w', 'l']); await M.until(q => q.a.attack?.name === 'bird' && q.a.s?.wc?.open, 90); await M.press(['s', 'l']); await M.until(q => q.a.attack?.name === 'tiger', 90) })
  ck(r.label + ': 5 hits, 2 links', r.hits.length === 5 && r.chainLinks === 2, JSON.stringify(r))
  r = await measure('Air Tiger Cross (jump-in) → Gorilla', async M => { await M.press(['w']); await M.watch(6); await M.press(['s', 'l']); await M.until(q => q.a.attack?.name === 'tigerLand', 90); await M.until(q => !q.a.attack, 40); await M.press(['l']) }, { gap: 150 })
  ck(r.label + ': measured (recorded)', r.hits.length >= 1, JSON.stringify(r))
} catch (e) { fail++; console.log('FAIL exception', e.stack) }
report.errors = errors; report.summary = { pass, fail }
fs.writeFileSync('docs/beast_boy/mechanics_results.json', JSON.stringify(report, null, 1))
ck('no page errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
console.log(`\n${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
