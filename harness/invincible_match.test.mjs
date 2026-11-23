// harness/invincible_match.test.mjs — MSV1-INVINCIBLE phase 6: ONE match with everything in it.
// P1 Invincible (Mark Grayson) vs Homelander, driven ONLY by real key events (J light, K heavy, L special, U ultimate,
// P charge, WASD): take off → full speed away (sonic boom) → land → Jab + Barrage (mash) → Invincible Punch (↓↘→ + L)
// → Zip (→→) … until the meter holds a bar → TERMINAL VELOCITY (takeoff → aim with the marker → fall → impact).
// In that one match:
//   · determinism: the same seed + the same plan twice → identical sim trail (f._inv, positions, HP every 10 f)
//   · replay: the recording (seed + input deltas) plays back with ZERO desync and re-lives every event
//   · LAN: the same plan on a host page against a joiner page over the real relay → both sims identical on every
//     shared frame (positions, HP AND his sim state, incl. the Terminal Velocity marker), and both saw every event
//   · companion (a friend's browser through the host's client manifest): every Invincible file is client content
//   node harness/invincible_match.test.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { startLanServer } from '../net/lanServer.mjs'
import { isClientPath } from '../net/clientManifest.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const H16 = s => crypto.createHash('sha256').update(s || '').digest('hex').slice(0, 16)
const report = {}

// ── the plan: runs IN the page. adv(n) advances n sim frames (stepped, or waits for the live loop on LAN) ──
const PLAN = async (adv, rec) => {
  const T = __harness.invincibleTest, me = () => T.state('p1'), foe = () => T.state('p2')
  const key = (t, k) => document.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }))
  const tap = async (k, n = 2) => { key('keydown', k); await adv(n); key('keyup', k) }
  const ev = { seen: [], top: 0, booms: 0, barrageHits: 0, ipunch: 0, ipunchHits: 0, ipunchWhiff: 0, wallBounces: 0, zips: 0, tv: 0, tvDirect: 0, tvShock: 0, tvWhiff: 0, marker: null, loops: 0, energyLog: [] }
  const note = () => { const q = me(), s = q.s; if (!s) return q
    ev.top = Math.max(ev.top, Math.abs(q.vx || 0)); const t = s.stats || {}
    for (const k of ['booms', 'barrageHits', 'ipunch', 'ipunchHits', 'ipunchWhiff', 'wallBounces', 'zips', 'tv', 'tvDirect', 'tvShock', 'tvWhiff']) ev[k] = Math.max(ev[k], t[k] || 0)
    const ph = s.tv?.phase; if (ph && ev.seen[ev.seen.length - 1] !== ph) ev.seen.push(ph)
    if (ph === 'aim' && s.tv.x != null && ev.marker == null) ev.marker = s.tv.x
    rec?.(q); return q }
  const idle = async (max = 300) => { for (let i = 0; i < max; i++) { const q = note(); if (!q.attack && !q.s?.tv && !q.hitstun && !q.flying && q.grounded) return; await adv(1) } }
  const foeReady = async (max = 200) => { for (let i = 0; i < max; i++) { note(); const o = foe(); if (!o.hitstun && !o.knockdown && o.grounded && !o.invuln) return; await adv(1) } }
  const toward = () => foe().x > me().x ? 'd' : 'a'
  const walkTo = async (gap, max = 300) => { const k = toward(); key('keydown', k)
    for (let i = 0; i < max; i++) { const q = note(); if (Math.abs(foe().x - q.x) <= gap) break; await adv(1) } key('keyup', k); await adv(1) }
  // 1) take off, full speed AWAY from him (sonic boom), stop, come down
  await adv(2); await tap('p', 3)
  for (let i = 0; i < 30 && !me().flying; i++) { note(); await adv(1) }
  const away = foe().x > me().x ? 'a' : 'd'
  key('keydown', away); for (let i = 0; i < 30; i++) { note(); await adv(1) } key('keyup', away)
  for (let i = 0; i < 14; i++) { note(); await adv(1) }
  await tap('p', 3); await idle()
  // 2) real hits (at least one round, then until a bar is banked): Jab → Barrage (mash), Invincible Punch, a Zip
  for (let loop = 0; loop < 8 && (loop < 1 || me().energy < 100); loop++) {
    ev.loops = loop + 1
    await foeReady(); await idle(); await walkTo(70, 400)
    await tap('j', 2); for (let i = 0; i < 4; i++) { note(); await adv(1) }
    for (let m = 0; m < 10; m++) { await tap('j', 2); note(); await adv(2) }
    await idle(); await foeReady()
    // Invincible Punch from mid range: ↓ ↘ → + L
    ev.ipGap = Math.round(Math.abs(foe().x - me().x)); const f = toward(); key('keydown', 's'); await adv(1); key('keydown', f); await adv(1); key('keyup', 's'); await adv(1); await tap('l', 1); key('keyup', f)
    ev.ipState = JSON.stringify([me().attack?.name ?? null, me().s?.mv?.key ?? null, me().hitstun, me().grounded, foe().grounded, foe().knockdown, foe().invuln, Math.round(foe().x - me().x)])
    for (let i = 0; i < 60; i++) { note(); await adv(1) }
    await idle(); await foeReady()
    // Zip toward him (double-tap the direction)
    const z = toward(); await tap(z, 2); await adv(2); await tap(z, 2)
    for (let i = 0; i < 30; i++) { note(); await adv(1) }
    ev.energyLog.push(Math.round(me().energy))
    if (foe().hp <= 0) break
  }
  // 3) TERMINAL VELOCITY: Ultimate, hold toward him during the aim (the marker follows), let it land
  await idle(); await foeReady()
  ev.energyBeforeTv = Math.round(me().energy)
  await tap('u', 2)
  for (let i = 0; i < 260; i++) { const q = note(); if (i > 20 && !q.attack && !q.s?.tv) break; await adv(1) }
  for (let i = 0; i < 40; i++) { note(); await adv(1) }
  return ev
}
const PLAN_SRC = PLAN.toString()

const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--autoplay-policy=no-user-gesture-required'] })
const errs = []
try {
  // ════ single page: stepped (deterministic clock) ════
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errs.push(e.message))
  await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(server.base + '/index.html?harness=1&p1=invincible&p2=homelander&seed=60617')
  await page.waitForFunction(() => window.__harness?.invincibleTest && window.__harness?.replay)
  const once = () => page.evaluate(async src => {
    __harness.rng?.forceSeed?.(60617); __harness.start()
    for (let i = 0; i < 2400; i++) { const p = __harness.online.syncProbe2(); if (p && p.g === 'battle' && p.cd <= 0) break; __harness.luffyTest.step(1) }
    const FR = (k, v) => (k && v && typeof v === 'object' && v.spriteHandler) ? '@' + (v.side || v.rosterKey) : v
    const trail = []; let frames = 0
    const adv = async n => { for (let i = 0; i < n; i++) {
      __harness.luffyTest.step(1); frames++
      const q = __harness.invincibleTest.raw(), s = q._inv
      if (frames % 10 === 0 && s) { const o = __harness.invincibleTest.raw('p2'); trail.push(JSON.stringify([{ ...s, cues: undefined, fx: undefined }, q.x, q.y, q.vx, q.vy, q.health, q.energy, o.x, o.y, o.health], FR)) }
    } }
    const ev = await (eval('(' + src + ')'))(adv)
    for (let i = 0; i < 60; i++) await adv(1)
    const recd = __harness.replay.stopAndGet()
    const f = __harness.invincibleTest.raw(), o = __harness.invincibleTest.raw('p2')
    return { ev, trail: trail.join('|'), frames, rec: recd, end: { stats: f._inv?.stats, p1: [f.x, f.y, f.health, f.energy], p2: [o.x, o.y, o.health] } }
  }, PLAN_SRC)
  const A = await once(), B = await once()
  const E = A.ev
  report.events = E; report.frames = A.frames
  ck('one match: full flight speed (≥ 50 of 51.5) + sonic boom', E.top >= 50 && E.booms >= 1, JSON.stringify(E))
  ck('… Barrage (mashed off a Jab) landed its hits', E.barrageHits >= 6, JSON.stringify(E))
  ck('… Invincible Punch (↓↘→ + L) connected', E.ipunchHits >= 1, JSON.stringify(E))
  ck('… Zip (→→)', E.zips >= 1, JSON.stringify(E))
  ck('… TERMINAL VELOCITY on earned meter: takeoff → aim (marker placed) → fall → impact, DIRECT hit', E.energyBeforeTv >= 100 && JSON.stringify(E.seen.slice(0, 4)) === JSON.stringify(['takeoff', 'aim', 'fall', 'impact']) && E.marker != null && E.tvDirect >= 1, JSON.stringify(E))
  ck('determinism: same seed + same key plan twice → identical sim trail and end state', A.trail === B.trail && JSON.stringify(A.end) === JSON.stringify(B.end), `${H16(A.trail)} vs ${H16(B.trail)}`)
  report.trailHash = H16(A.trail)
  // ── replay of that match ──
  const rec = A.rec
  report.replay = rec ? { frames: rec.frameCount, deltas: rec.frames?.length, checkpoints: rec.states?.length, p1Char: rec.p1Char, seed: rec.seed } : null
  ck('replay: the match recording has the seed, Invincible, input deltas and state checkpoints', !!rec && rec.p1Char === 'invincible' && rec.frames?.length > 20 && rec.states?.length >= 3, JSON.stringify(report.replay))
  const pb = await page.evaluate(async r => {
    const ok = __harness.replay.play(r)
    for (let i = 0; i < 2400; i++) { const p = __harness.online.syncProbe2(); if (p && p.g === 'battle' && p.cd <= 0) break; __harness.luffyTest.step(1) }
    let maxS = {}; for (let i = 0; i < (r.frameCount || 0) + 40; i++) { __harness.luffyTest.step(1); const s = __harness.invincibleTest.raw()._inv?.stats || {}
      for (const k of ['booms', 'barrageHits', 'ipunchHits', 'zips', 'tvDirect']) maxS[k] = Math.max(maxS[k] || 0, s[k] || 0) }
    const st = __harness.replay.playbackState(); __harness.replay.stopPlayback?.()
    return { ok: ok?.ok ?? !!ok, st, maxS } }, rec)
  report.playback = pb
  ck('replay playback: ZERO desync on every checkpoint', pb.ok && pb.st.checks >= 3 && pb.st.desyncFrame === null && pb.st.matched === pb.st.checks, JSON.stringify(pb.st))
  ck('… and the playback re-lives the boom, Barrage, Invincible Punch, Zip and the Terminal Velocity hit', pb.maxS.booms >= 1 && pb.maxS.barrageHits >= 6 && pb.maxS.ipunchHits >= 1 && pb.maxS.zips >= 1 && pb.maxS.tvDirect >= 1, JSON.stringify(pb.maxS))
  await page.close()

  // ════ LAN: host + joiner over the real relay, the same plan on the host's keyboard ════
  const RELAY_PORT = 8798, relay = startLanServer({ port: RELAY_PORT, relay: true, log: () => {} }); await new Promise(r => relay.wss.once('listening', r))
  try {
    const open = async () => { const p = await browser.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => errs.push(e.message))
      await p.goto(server.base + `/index.html?harness=1&relay=${encodeURIComponent('ws://127.0.0.1:' + RELAY_PORT)}`, { waitUntil: 'load' })
      await p.waitForFunction(() => window.__harness?.online && window.__harness?.invincibleTest, null, { timeout: 20000 }); await p.mouse.click(640, 360); return p }
    const host = await open(), join = await open()
    await host.evaluate(() => __harness.online.hostStart()); await host.waitForFunction(() => !!__harness.online.hostCode(), null, { timeout: 8000 })
    const code = await host.evaluate(() => __harness.online.hostCode()); await join.evaluate(c => __harness.online.join(c), code)
    await host.waitForFunction(() => __harness.online.status() === 'ready', null, { timeout: 8000 })
    await host.evaluate(() => __harness.online.hostStartMatch('invincible', 'homelander', null))
    await join.waitForFunction(() => __harness.online.isActive(), null, { timeout: 8000 })
    const inBattle = () => { const p = __harness.online.syncProbe2(); return !!p && p.g === 'battle' && p.cd <= 0 }
    await host.waitForFunction(inBattle, null, { timeout: 60000 }); await join.waitForFunction(inBattle, null, { timeout: 60000 })
    const probe = p => p.evaluate(() => { const f = __harness.invincibleTest.raw(), o = __harness.invincibleTest.raw('p2'), s = f?._inv
      const FR = (k, v) => (k && v && typeof v === 'object' && v.spriteHandler) ? '@' + (v.side || v.rosterKey) : v
      return { frame: __harness.online.syncProbe()?.frame, k: JSON.stringify([f.x, f.y, f.health, o.x, o.y, o.health, s ? { ...s, cues: undefined, fx: undefined } : null], FR), stats: s?.stats || null, tvx: s?.tv?.x ?? null } })
    let sampling = true; const SH = [], SJ = []
    const sampler = (async () => { while (sampling) { const [a, b] = await Promise.all([probe(host), probe(join)]); SH.push(a); SJ.push(b); await new Promise(r => setTimeout(r, 12)) } })()
    const lanEv = await host.evaluate(async src => {
      const fr = () => __harness.online.syncProbe()?.frame ?? 0
      const adv = n => new Promise(res => { const t = fr() + n, w = () => fr() >= t ? res() : setTimeout(w, 4); w() })
      return (eval('(' + src + ')'))(adv)
    }, PLAN_SRC)
    await new Promise(r => setTimeout(r, 1500)); sampling = false; await sampler
    const mj = new Map(SJ.filter(s => s.frame != null).map(s => [s.frame, s])); let shared = 0, bad = 0, markerShared = 0, first = null
    for (const a of SH) { const b = mj.get(a.frame); if (!b || a.frame == null) continue; shared++; if (a.tvx != null) markerShared++
      if (a.k !== b.k) { bad++; if (!first) first = { frame: a.frame, h: a.k.slice(0, 700), j: b.k.slice(0, 700) } } }
    if (first) console.log('LAN-DIFF', JSON.stringify(first))
    const lastJ = SJ[SJ.length - 1]?.stats || {}
    report.lan = { events: lanEv, shared, mismatched: bad, markerShared, joinerStats: lastJ, samples: [SH.length, SJ.length] }
    ck('LAN: the same match on the host (boom, Barrage, Invincible Punch, Zip, Terminal Velocity direct hit)', lanEv.booms >= 1 && lanEv.barrageHits >= 6 && lanEv.ipunchHits >= 1 && lanEv.zips >= 1 && lanEv.tvDirect >= 1, JSON.stringify(lanEv))
    ck('… both sims identical on every shared frame (positions, HP and his full sim state, incl. the marker)', shared >= 20 && bad === 0 && markerShared >= 1, `shared=${shared} mismatched=${bad} markerFrames=${markerShared}`)
    ck('… the joiner\'s sim saw every event too', (lastJ.booms || 0) >= 1 && (lastJ.barrageHits || 0) >= 6 && (lastJ.ipunchHits || 0) >= 1 && (lastJ.zips || 0) >= 1 && (lastJ.tvDirect || 0) >= 1, JSON.stringify(lastJ))
    await host.close(); await join.close()
  } finally { await relay.close?.() }

  // ════ companion: a friend's browser loads everything through the host's client manifest ════
  const disk = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; e.isDirectory() ? walk(p) : disk.push(p) } }
  walk('assets/invincible'); for (const f of fs.readdirSync('.')) if (/^invincible\w*\.js$/.test(f)) disk.push(f)
  const notClient = disk.filter(p => !isClientPath(p))
  ck(`companion: every Invincible module + asset (${disk.length}) is a client path the host serves`, disk.length > 100 && !notClient.length, notClient.slice(0, 4).join(','))
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.writeFileSync('docs/msv1/invincible/match_results.json', JSON.stringify({ pass, fail, report }, null, 1))
console.log(`\n  INVINCIBLE ONE-MATCH: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
