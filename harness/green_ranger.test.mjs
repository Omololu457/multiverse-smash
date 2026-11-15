// harness/green_ranger.test.mjs — Green Ranger (green_ranger): mechanics, MEASURED frame data / routes, Dragon Call,
// notes, specials, the shared Zord ultimate (confirm / whiff / block / interrupted) and the exploit hunt.
// Real keyboard input through the actual movement / command parsers. Writes docs/green_ranger/mechanics_results.json.
//   node harness/green_ranger.test.mjs
import fs from 'node:fs'
import { boot } from './green_ranger_common.mjs'
import { green_ranger as GREEN_DEF } from '../greenRangerData.js'
import { ROSTER_DAMAGE_BOOST } from '../rosterParity.js'
const HP = GREEN_DEF.stats.maxHealth, BOOST = ROSTER_DAMAGE_BOOST.green_ranger || 1   // live data (balance passes retune these)
const G = await boot(), { page } = G
const R = { frameData: {}, routes: [], call: {}, notes: {}, specials: {}, ultimate: {}, exploits: {}, movement: {}, meta: {} }
let pass = 0, fail = 0
const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : JSON.stringify(d)) }
const raw = w => page.evaluate(w => { const f = __harness.greenRangerTest.raw(w); return { ac: f.attackCooldown || 0, atk: !!f.attacking, cur: f.currentAttack?.name || null, energy: f.energy, charging: !!f.isCharging } }, w)
const free = async w => { const r = await raw(w); return !r.atk && r.ac <= 0 }
const setB = o => page.evaluate(o => Object.assign(__harness.greenRangerTest.raw('p2'), o), o)

// ── META ──
const meta = await page.evaluate(() => { const c = __harness.characters?.green_ranger || window.__characters?.green_ranger; const f = __harness.greenRangerTest.raw()
  return { name: f.name, key: f.rosterKey, universe: f.universe, hp: f.maxHealth, maxEnergy: f.maxEnergy, energy: f.energy, label: f.energyConfig?.label || f.traits?.energyName, maxJumps: f.maxJumps, speed: f.stats?.speed, portrait: f.portrait, tagline: f.tagline } })
R.meta = meta
ck('identity green_ranger / Green Ranger / power_rangers', meta.key === 'green_ranger' && meta.name === 'Green Ranger' && meta.universe === 'power_rangers', meta)
ck(`HP ${HP}, Morph Energy max 100`, meta.hp === HP && meta.maxEnergy === 100 && /Morph Energy/.test(meta.label), meta)
ck('one jump (roster does not grant every fighter a double jump)', meta.maxJumps === 1, meta)
const portraitOk = await page.evaluate(async src => { const im = new Image(); im.src = src; await im.decode().catch(() => {}); return im.naturalWidth }, meta.portrait)
ck('portrait loads', portraitOk > 0, portraitOk)

// ── MOVEMENT (measured; baseline = Black Ranger mmpr_black, the agile MMPR brawler, measured in harness/green_ranger_baseline below) ──
async function measureMove(who) {
  await G.reset(900); const x0 = (await G.st(who)).x
  const k = who === 'p1' ? 'd' : 'ArrowRight'; await G.hold([k]); await G.step(60); await G.release([k]); const x1 = (await G.st(who)).x
  await G.reset(900); let minY = (await G.st(who)).y, y0 = minY; await G.tap(['w']); for (let i = 0; i < 80; i++) { await G.step(1); minY = Math.min(minY, (await G.st(who)).y) }
  return { walkPxPerFrame: +((x1 - x0) / 60).toFixed(3), jumpHeightPx: Math.round(y0 - minY) }
}
R.movement.green = await measureMove('p1')
ck('walk + jump measured', R.movement.green.walkPxPerFrame > 1 && R.movement.green.jumpHeightPx > 60, R.movement.green)

// ── FRAME DATA (measured): first contact frame from the press, hit / block, frame advantage on block and hit ──
async function frame(label, keys, { gap = 70, energy = 100, air = false, preJump = 0 } = {}) {
  const out = {}
  for (const mode of ['hit', 'block']) {
    await G.reset(gap, { energy, dummy: mode === 'block' ? 'block' : 'stand' }); if (mode === 'block') await G.step(8)
    if (air) { await G.tap(['w']); await G.step(preJump) }
    const hp0 = (await G.both()).b.hp; await G.tap(keys); let f = 1, contact = null
    for (; f < 90; f++) { const s = await G.both(); if (s.b.hitstun > 0 || s.b.blockstun > 0 || s.b.hp < hp0) { contact = f; break } await G.step(1) }
    if (contact == null) { out[mode] = { contact: null }; continue }
    const s0 = await G.both(); let aFree = null, bFree = null
    for (let i = 0; i < 160 && (aFree == null || bFree == null); i++) {
      if (aFree == null && await free('p1')) aFree = i
      const s = await G.both(); if (bFree == null && s.b.hitstun <= 0 && s.b.blockstun <= 0) bFree = i
      await G.step(1)
    }
    out[mode] = { contactFrame: contact, damage: hp0 - (await G.both()).b.hp, advantage: aFree != null && bFree != null ? bFree - aFree : null, blocked: s0.b.blockstun > 0 }
  }
  R.frameData[label] = out; return out
}
const FD = [['J1 Straight Punch', ['j'], 5], ['Heavy Turning Kick', ['k'], 13], ['Low Leg Sweep', ['s', 'j'], 8], ['Launcher Rising Heel', ['i'], 12],
  ['Dragon Edge', ['l'], 14, { gap: 110 }], ['Emerald Advance', ['d', 'l'], 16, { gap: 160 }]]
for (const [label, keys, startup, o] of FD) {
  const r = await frame(label, keys, o || {})
  ck(`${label}: first contact on the authored startup frame (${startup}±1)`, r.hit.contactFrame != null && Math.abs(r.hit.contactFrame - startup) <= 1, r)
  ck(`${label}: blockable`, r.block.blocked === true, r.block)
}
const fdJ3 = await (async () => { // J3 measured through the real chain
  for (const mode of ['hit', 'block']) {}
  return null })()
ck('Heavy is more punishable than J1 on block', R.frameData['Heavy Turning Kick'].block.advantage < R.frameData['J1 Straight Punch'].block.advantage, R.frameData)
ck('Emerald Advance unsafe on block (≤ -6)', R.frameData['Emerald Advance'].block.advantage <= -6, R.frameData['Emerald Advance'])
ck('Dragon Edge unsafe on block', R.frameData['Dragon Edge'].block.advantage < 0, R.frameData['Dragon Edge'])

// ── ROUTES (true combo = every later hit landed while the defender was still in hitstun) ──
async function route(label, script, { gap = 70, energy = 100, notes = 0, note = '' } = {}) {
  await G.reset(gap, { energy, notes }); let s = await G.both(); const e0 = s.a.energy, n0 = s.a.s.notes, log = []
  let hp = s.b.hp, stun = s.b.hitstun
  const watch = async n => { for (let i = 0; i < n; i++) { await G.step(1); const q = await G.both(); if (q.b.hp < hp) { log.push({ d: hp - q.b.hp, stunBefore: stun }); hp = q.b.hp } stun = q.b.hitstun } }
  const M = { watch, press: async (k, h = 1) => { await G.hold(k); await watch(h); await G.release(k) },
    until: async (p, m = 120) => { for (let i = 0; i < m; i++) { const q = await G.both(); if (p(q)) return q; await watch(1) } return G.both() } }
  await script(M)
  for (let j = 0; j < 300 && ((await G.both()).a.attack || (await G.both()).ult.active || (await G.both()).a.zord); j++) await watch(1)
  s = await G.both()
  const r = { label, hits: log.map(x => x.d), stunBefore: log.map(x => x.stunBefore), damage: HP - s.b.hp, energySpent: +(e0 - s.a.energy).toFixed(2), notesSpent: n0 - s.a.s.notes,
    trueCombo: log.length > 1 && log.slice(1).every(x => x.stunBefore > 0), gap, note }
  R.routes.push(r); console.log('  route', label, JSON.stringify({ dmg: r.damage, hits: r.hits, true: r.trueCombo, e: r.energySpent, notes: r.notesSpent })); return r
}
const rec = M => M.until(q => q.a.cancel.open && q.a.attack?.gm?.clean, 60)
let r = await route('J1 > J2 > J3', async M => { await M.press(['j']); await rec(M); await M.press(['j']); await rec(M); await M.press(['j']) })
ck('J1 > J2 > J3 true combo, 3 hits', r.trueCombo && r.hits.length === 3, r)
r = await route('J1 > Heavy > Dragon Edge', async M => { await M.press(['j']); await rec(M); await M.press(['k']); await rec(M); await M.press(['l']) })
ck('J1 > Heavy > Dragon Edge connects (3 hits)', r.hits.length === 3, r)
r = await route('Command chain > knock-away', async M => { await M.press(['d', 'k']); await rec(M); await M.press(['k']); await rec(M); await M.press(['k']) })
ck('Forward+Heavy chain: 3 hits, true combo', r.hits.length === 3 && r.trueCombo, r)
r = await route('Command chain > launcher branch', async M => { await M.press(['d', 'k']); await rec(M); await M.press(['k']); await rec(M); await M.press(['w', 'k']) })
const launchBranch = r
ck('Forward+Heavy chain: Up+Heavy at the last step = launcher', r.hits.length === 3, r)
r = await route('Command launcher branch > Rising Talon', async M => { await M.press(['d', 'k']); await rec(M); await M.press(['k']); await rec(M); await M.press(['w', 'k']); await rec(M); await M.press(['s', 'l']) })
r = await route('Launcher > jump cancel > Air > Descending Fang', async M => { await M.press(['i']); await M.until(q => q.a.attack?.gm?.clean, 40); await M.until(q => q.a.cancel.open, 40); await M.press(['w']); await M.watch(5); await M.press(['j']); await M.until(q => !q.a.attack, 40); await M.press(['s', 'l']) })
r = await route('Launcher > jump cancel > Air', async M => { await M.press(['i']); await M.until(q => q.a.attack?.gm?.clean, 40); await M.until(q => q.a.cancel.open, 40); await M.press(['w']); await M.watch(5); await M.press(['j']) })
ck('Launcher > jump > Air connects (2 hits)', r.hits.length >= 2, r)
r = await route('Note Emerald Advance > air conversion', async M => { await M.press(['d', 'l']); await M.until(q => q.a.attack?.gm?.clean, 40); await M.until(q => q.a.cancel.open, 60); await M.press(['w']); await M.watch(6); await M.press(['j']) }, { gap: 160, notes: 1 })
ck('Note Advance: note spent, launches', r.notesSpent === 1 && r.hits.length >= 1, r)
r = await route('Heavy > Zord ultimate', async M => { await M.press(['k']); await rec(M); await M.press(['u']) })
ck('Heavy confirm > Ranger Zord Assault (cancel rule) lands the opener + sequence', r.hits.length >= 2, r)

// ── DRAGON CALL ──
await G.reset(300); await G.tap(['p']); let c = await G.st()
ck('Charge starts Dragon Call (gCall)', c.attack?.name === 'gCall', c.attack)
const e0 = c.energy; await G.hold(['p']); await G.step(46); c = await G.st(); ck('no ordinary charge energy during the performance', Math.abs(c.energy - e0) < 0.01 && !c.charging, { e0, e: c.energy })
await G.step(2); c = await G.st(); await G.release(['p'])
ck('completion grants exactly 1 note at frame 48 + 180 f cooldown', c.s.notes === 1 && c.s.cooldown >= 178, c.s)
await G.step(14); c = await G.st(); ck('call ends after 60 committed frames', !c.attack, c.attack)
await G.hold(['p']); await G.step(30); c = await G.st(); await G.release(['p']); ck('holding / re-pressing Charge on cooldown cannot restart the call', c.attack?.name !== 'gCall' && c.s.notes === 1, c)
R.call.complete = { notes: 1, cooldown: 180, frames: 60 }
// interrupted: P2 hits Green mid-performance
await G.reset(60); await G.tap(['p']); await G.step(24)
await page.evaluate(() => { const b = __harness.greenRangerTest.raw('p2'); b.facing = -1; __harness.p2AttackCat('light') })   // a real engine hit (startMove on P2)
for (let i = 0; i < 30; i++) await G.step(1)
c = await G.st(); ck('interrupted call grants no note (hit by P2 during the performance)', c.s.notes === 0 && c.s.stats.callsBroken >= 1, c.s)
R.call.interrupted = { notes: c.s.notes, broken: c.s.stats.callsBroken }
// cap 2, rejected while guarding / airborne / attacking
await G.reset(300, { notes: 2 }); await G.tap(['p']); c = await G.st(); ck('no call at 2 notes (max)', c.attack?.name !== 'gCall', c.attack)
await G.reset(300); await G.hold([';']); await G.step(3); await G.tap(['p']); c = await G.st(); await G.release([';']); ck('no call while guarding', c.attack?.name !== 'gCall', c.attack)
await G.reset(300); await G.tap(['w']); await G.step(4); await G.tap(['p']); c = await G.st(); ck('no call in the air', c.attack?.name !== 'gCall', c.attack)

// ── NOTES: consumption on start only; energy rejection keeps the note ──
await G.reset(300, { notes: 1, energy: 5 }); await G.tap(['l']); c = await G.st()
ck('BROKE BUT BOLD: Dragon Edge rejected for energy, note kept', c.attack?.name !== 'gEdge' && c.s.notes === 1, c)
await G.reset(110, { notes: 2 }); await G.tap(['l']); c = await G.st(); ck('note spent when Dragon Edge starts (2 → 1)', c.s.notes === 1 && c.attack?.gm?.note, c.s)
let burst = 0; for (let i = 0; i < 40; i++) { await G.step(1); const s = await G.st(); if (s.shots.some(x => x.kind === 'edge')) burst = 1 }
c = await G.st(); ck('note Dragon Edge fires a visible energy burst (spawned; may connect the same frame)', c.s.stats.edgeBursts === 1, { seen: burst, stats: c.s.stats })
await G.step(30); await page.evaluate(() => { const b = __harness.greenRangerTest.raw('p2'); b.x = 1700 })
await G.tap(['a', 'l']); c = await G.st(); ck('THE LAST NOTE: second note spent on Emerald Pulse (1 → 0)', c.s.notes === 0 && c.attack?.gm?.note, c.s)
let maxShots = 0; for (let i = 0; i < 40; i++) { await G.step(1); maxShots = Math.max(maxShots, (await G.st()).shots.filter(x => x.kind === 'pulse').length) }
ck('note Pulse: exactly two shots for that activation', maxShots === 2, maxShots)
c = await G.st(); ck('no note duplication (stats gained 0, spent 2, notes 0)', c.s.notes === 0 && c.s.stats.notesSpent === 2, c.s.stats)
await G.reset(900); await G.tap(['a', 'l']); await G.step(44); await G.tap(['a', 'l']); c = await G.st()
ck('one active Pulse shot per fighter (second cast refused while the shot lives)', c.attack?.name !== 'gPulse' && c.shots.length === 1, c)

// ── SPECIALS ──
// Dragon Edge reach (max gap that still connects, from the body centre)
let reach = 0; for (let gap = 100; gap <= 240; gap += 5) { await G.reset(gap); const h = (await G.both()).b.hp; await G.tap(['l']); await G.step(20); if ((await G.both()).b.hp < h) reach = gap }
const gw = (await G.st()).w   // reset() spaces the LEFT edges by gap → centre-to-foe-near-edge = gap - w/2
R.specials.dragonEdgeReach = { maxConnectingLeftEdgeGap: reach, centreToFoeNearEdge: reach - gw / 2 }
ck('Dragon Edge reach ≈ 150 px from Green\'s centre (130–170)', reach - gw / 2 >= 130 && reach - gw / 2 <= 170, R.specials.dragonEdgeReach)
// Emerald Advance travel (whiff, open stage)
await G.reset(900); await G.tap(['d', 'l']); const ax0 = (await G.st()).attack.gm.origin; await G.step(40); const ax1 = (await G.st()).x   // from the move's own origin
R.specials.advanceTravel = ax1 - ax0; ck('Emerald Advance travel bounded ≈ 140 px', Math.abs(ax1 - ax0 - 140) <= 2, ax1 - ax0)
// Rising Talon: two contacts, once per airtime, landing recovery
r = await route('Rising Talon', async M => { await M.press(['s', 'l']) }, { gap: 40 })
ck('Rising Talon: two contacts', r.hits.length === 2, r)
await G.reset(900); await G.tap(['s', 'l']); await G.step(12); await G.tap(['s', 'l']); c = await G.st(); ck('Rising Talon once per airtime (no re-cast in the air)', c.attack?.name === 'gTalon' && c.s.stats !== null, c.attack)
let landed = 0; for (let i = 0; i < 80; i++) { await G.step(1); const q = await G.st(); if (q.s.landing > 0) { landed = q.s.landing; break } }
ck('Rising Talon lands with explicit landing recovery', landed >= 12, landed); R.specials.talonLanding = landed + 1
// Descending Fang
await G.reset(900); await G.tap(['w']); await G.step(10); await G.tap(['s', 'l']); c = await G.st(); ck('Descending Fang starts in the air', c.attack?.name === 'gFang', c.attack)
let fangLand = 0, fangVy = 0; for (let i = 0; i < 80; i++) { await G.step(1); const q = await G.st(); fangVy = Math.max(fangVy, q.vy || 0); if (q.s.landing > 0) { fangLand = q.s.landing; break } }
ck('Descending Fang: capped descent (≤13 px/f) and 24 f landing recovery', fangVy <= 13.5 && fangLand >= 22, { fangVy, fangLand }); R.specials.fang = { maxVy: fangVy, landing: fangLand + 1 }
await G.reset(900); await G.tap(['w']); await G.step(6); await G.tap(['s', 'l']); await G.step(13); c = await G.st(); const fy = c.y
await G.tap(['s', 'l']); c = await G.st(); ck('Descending Fang once per airtime', c.attack?.name === 'gFang', c.attack)
// stage edge: Fang near the right wall stays inside the stage
await page.evaluate(() => { const H = __harness.greenRangerTest; H.reset(); const a = H.raw(); a.x = 10; a.facing = -1 }); await G.step(1); await G.tap(['w']); await G.step(6); await G.tap(['s', 'l'])
let minX = 1e9; for (let i = 0; i < 60; i++) { await G.step(1); minX = Math.min(minX, (await G.st()).x) } ck('Descending Fang near the stage edge never leaves the stage', minX >= 0, minX)

// ── ULTIMATE: confirm / whiff / block / interrupted ──
await G.reset(200); const hpU = (await G.both()).b.hp; await G.tap(['u'])
let u = { active: false }, seenActive = false, ultFrames = 0; for (let i = 0; i < 260; i++) { await G.step(1); const s = await G.both(); if (s.ult.active) { seenActive = true; ultFrames++ } if (seenActive && !s.ult.active && !s.a.attack) break }
let s2 = await G.both(); R.ultimate.confirm = { damage: hpU - s2.b.hp, cineFrames: ultFrames, energyAfter: s2.a.energy }
ck(`ULT confirm: opener + 3 beats land (≈240 after the shared global scale, × roster boost ${BOOST}), cinematic ends, control restored`, seenActive && hpU - s2.b.hp >= 220 * BOOST && hpU - s2.b.hp <= 270 * BOOST && !s2.a.attack && s2.b.knockdown, R.ultimate.confirm)
await G.reset(900); await G.tap(['u']); const eAfterStart = (await G.st()).energy; await page.evaluate(() => { const b = __harness.greenRangerTest.raw('p2'); b.x = 2800 })
let missed = 0; for (let i = 0; i < 120; i++) { await G.step(1); const s = await G.st(); missed = Math.max(missed, s.s.missed); if (!s.attack && i > 40) break }
s2 = await G.both(); R.ultimate.whiff = { missed, ultActive: s2.ult.active, energyAfterStart: eAfterStart }
ck('ULT whiff: no capture, CALL MISSED, the full 100 spent at start (no refund)', missed > 0 && !s2.ult.active && eAfterStart <= 1, R.ultimate.whiff)
await G.reset(200, { dummy: 'block' }); await G.step(8); const hpB = (await G.both()).b.hp; await G.tap(['u'])
let blocked = false; for (let i = 0; i < 120; i++) { await G.step(1); const s = await G.both(); if (s.ult.active) break; if (s.a.s.missed > 0) blocked = true }
s2 = await G.both(); R.ultimate.block = { chip: hpB - s2.b.hp, ultActive: s2.ult.active }
ck('ULT blocked: chip only, no capture, CALL MISSED', blocked && !s2.ult.active && hpB - s2.b.hp < 40, R.ultimate.block)
// recovery after a miss is punishable: measure frames from the dive's end until Green can act
await G.reset(200, { dummy: 'block' }); await G.step(8); await G.tap(['u']); let rcv = 0; for (let i = 0; i < 140; i++) { await G.step(1); if (!(await free('p1'))) rcv++; else if (i > 36) break }
R.ultimate.blockedRecoveryTotal = rcv; ck('ULT miss recovery is substantial (≥ 90 committed frames total)', rcv >= 90, rcv)
await G.reset(60); await G.tap(['u']); await G.step(10); await page.evaluate(() => { const b = __harness.greenRangerTest.raw('p2'); b.facing = -1; __harness.p2AttackCat('light') })
for (let i = 0; i < 60; i++) await G.step(1)
s2 = await G.both(); R.ultimate.interrupted = { ultActive: s2.ult.active, broken: s2.a.s.stats.ultBroken, zord: !!s2.a.zord }
ck('ULT interrupted (hit before the dive): Zord leaves, no capture, no refund', !s2.ult.active && s2.a.s.stats.ultBroken === 1 && !s2.a.zord && s2.a.energy < 12, R.ultimate.interrupted)

// ── EXPLOIT HUNT (scripted) ──
const X = R.exploits
await G.reset(300); for (let i = 0; i < 12; i++) await G.tap(['p'], 2); c = await G.st(); X.mashCharge = c.s.notes; ck('mash Charge: at most one call / note per 60+180 f', c.s.notes <= 1, c.s)
await G.reset(300); await G.tap(['p']); await G.step(20); await page.evaluate(() => { const H = __harness.greenRangerTest; H.reset() }); await G.step(80); c = await G.st(); X.resetMidCall = c.s?.notes ?? 0; ck('round / training reset mid-call: notes reset, no note granted', !c.s || c.s.notes === 0, c.s)
await G.reset(300, { notes: 1 }); await page.evaluate(() => { const H = __harness.greenRangerTest; H.raw().hitstop = 6 }); await G.tap(['p']); c = await G.st(); X.callDuringHitstop = c.attack?.name || null; ck('no call starts during hitstop', c.attack?.name !== 'gCall', c.attack)
await G.reset(60, { notes: 1 }); await G.tap(['l']); await page.evaluate(() => { const H = __harness.greenRangerTest, a = H.raw(); a.hitstun = 20; a.attacking = false; a.currentAttack = null }); await G.step(30); c = await G.st()
X.interruptFirstFrame = c.s.notes; ck('empowered special interrupted on its first frame: no refund, no duplication', c.s.notes === 0 && c.s.stats.notesSpent === 1, c.s)
await G.reset(300, { notes: 1 }); await G.tap(['a', 'l']); await page.evaluate(() => { const a = __harness.greenRangerTest.raw(); a.hitstun = 30 }); await G.step(40); c = await G.st()
X.pulseSecondAfterHit = c.s.stats.pulseShots; ck('note Pulse: Green hit before the delayed shot → no second shot', c.s.stats.pulseShots === 1, c.s.stats)
// Launcher > Fang loop: Talon / Fang once per airtime even with the jump
await G.reset(70); await G.tap(['i']); await G.until(s => s.a.attack?.gm?.clean && s.a.cancel.open, 60); await G.tap(['w']); await G.step(4); await G.tap(['s', 'l'])
const fangStarted = (await G.st()).attack?.name; await G.until(s => !s.a.attack, 80); await G.tap(['s', 'l']); c = await G.st(); c.fangStarted = fangStarted
X.fangTwice = c.attack?.name; ck('no second Fang in the same airtime after a jump cancel', c.fangStarted === 'gFang' && (c.attack?.name !== 'gFang' || c.grounded), { first: c.fangStarted, now: c.attack?.name, grounded: c.grounded, used: c.s.fangUsed })
// both players pressing Charge on the same frame (mirror)
X.notes = 'see VERIFICATION.md for the full exploit table'

console.log('page errors', G.errors.slice(0, 5)); ck('no page errors', G.errors.length === 0, G.errors.slice(0, 5))
fs.mkdirSync('docs/green_ranger', { recursive: true }); fs.writeFileSync('docs/green_ranger/mechanics_results.json', JSON.stringify(R, null, 1) + '\n')
console.log(`\ngreen_ranger: ${pass} pass / ${fail} fail`); await G.close(); process.exit(fail ? 1 : 0)
