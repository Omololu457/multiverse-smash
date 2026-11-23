// harness/omniman_viltrum_match.test.mjs — MSV1-OMNIMAN phase 6: ONE match with everything in it.
// P1 Omni-Man (Viltrumite) vs Homelander, driven ONLY by real key events (J light, K heavy, L special, U ultimate,
// P charge, WASD): take off → full speed (sonic boom) → wall crash → Escape Velocity (every phase) → two Viltrum
// Decrees (meter) → THINK!. In that one match:
//   · determinism: the same seed + the same plan twice → identical sim trail (f._omv, positions, HP every 10 f)
//   · replay: the recording (seed + input deltas) plays back with ZERO desync and reproduces every event
//   · Escape Velocity: camera zoom, background (sky overlay gone) and audio (music duck released) return to normal;
//     no frame-time drop during the orbit (update + render cost per frame, orbit vs the rest of the match)
//   · LAN: the same plan on a host page against a joiner page over the real relay → both sims identical on every
//     shared frame (positions, HP AND his sim state), and both saw every event
//   · companion (a friend's browser through the host's client manifest): every Omni-Man file is client content
//   node harness/omniman_viltrum_match.test.mjs
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
  const T = __harness.omnimanViltrumTest, me = () => T.state('p1'), foe = () => T.state('p2')
  const key = (t, k) => document.dispatchEvent(new KeyboardEvent(t, { key: k, bubbles: true }))
  const tap = async (k, n = 2) => { key('keydown', k); await adv(n); key('keyup', k) }
  const DD = async btn => { key('keydown', 's'); await adv(2); key('keyup', 's'); await adv(2); key('keydown', 's'); await adv(1); await tap(btn, 2); key('keyup', 's') }
  const ev = { seen: [], top: 0, booms: 0, crash: 0, think: 0, thinkHits: 0, escape: 0, escapeHits: 0, decree: 0 }
  const note = () => { const q = me(), s = q.s; if (!s) return q
    ev.top = Math.max(ev.top, q.speed || 0); const t = s.stats || {}
    for (const k of ['booms', 'think', 'thinkHits', 'escapeHits']) ev[k] = Math.max(ev[k], t[k] || 0)
    ev.crash = Math.max(ev.crash, t.crashes || 0); ev.decree = Math.max(ev.decree, t.decree || t.decrees || 0)
    const ph = s.ev?.ph; if (ph && ev.seen[ev.seen.length - 1] !== ph) ev.seen.push(ph); rec?.(q); return q }
  const idle = async (max = 400) => { for (let i = 0; i < max; i++) { const q = note(); if (!q.attack && !q.s?.ev && !q.s?.rush && !q.s?.hold && !q.s?.crash && !q.hitstun && !q.flying) return; await adv(1) } }
  // walk = hold ONE direction until in range (never re-tapped: a double tap would be a dash)
  const walkTo = async (gap, max = 300) => { const q0 = me(), k = foe().x > q0.x ? 'd' : 'a'; key('keydown', k)
    for (let i = 0; i < max; i++) { const q = note(); if (Math.abs(foe().x - q.x) <= gap) break; await adv(1) } key('keyup', k); await adv(1) }
  // 1) take off, then full speed away from him into the left stage wall → sonic boom on the way, crash at the wall
  await adv(2); ev.startX = Math.round(me().x); await tap('p', 3)
  for (let i = 0; i < 30 && !me().flying; i++) { note(); await adv(1) }
  key('keydown', 'a'); for (let i = 0; i < 160; i++) { const q = note(); if (q.s?.crash > 0) break; await adv(1) } key('keyup', 'a')
  ev.crashAt = Math.round(me().x)
  await idle()
  // 2) ESCAPE VELOCITY (Ultimate) at grab range
  await walkTo(120, 600); for (let i = 0; i < 4; i++) { note(); await adv(1) }
  ev.energyBeforeEv = me().energy; ev.gapAtEv = Math.round(Math.abs(foe().x - me().x)); await tap('u', 2)
  for (let i = 0; i < 480; i++) { const q = note(); if (i > 30 && !q.attack && !q.s?.ev) break; await adv(1) }
  for (let i = 0; i < 90; i++) { note(); await adv(1) }   // knockdown + getup
  // 3) meter: Viltrum Decree ×2 (+25 % each when not hit), then THINK! (↓↓ + Special)
  for (let r = 0; r < 3 && me().energy < 100; r++) { await idle(); await DD('j'); for (let i = 0; i < 70; i++) { note(); await adv(1) } }
  await idle(); await walkTo(400, 600); ev.energyBeforeThink = me().energy
  await DD('l'); for (let i = 0; i < 360; i++) { const q = note(); if (i > 20 && !q.attack && !q.s?.rush && !q.s?.hold) break; await adv(1) }
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
  await page.goto(server.base + '/index.html?harness=1&p1=omniman_viltrum&p2=homelander&seed=60617')
  await page.waitForFunction(() => window.__harness?.omnimanViltrumTest && window.__harness?.replay)
  const once = () => page.evaluate(async src => {
    __harness.rng?.forceSeed?.(60617); __harness.start()
    // the REAL intro + countdown (not skipToBattle): the camera settles exactly as in a real match before battle frame 0
    for (let i = 0; i < 2400; i++) { const p = __harness.online.syncProbe2(); if (p && p.g === 'battle' && p.cd <= 0) break; __harness.luffyTest.step(1) }
    const FR = (k, v) => (k && v && typeof v === 'object' && v.spriteHandler) ? '@' + (v.side || v.rosterKey) : v   // fighter refs → their side
    const cv = document.querySelector('canvas'), cx = cv.getContext('2d')
    const sky = () => { const d = cx.getImageData(0, 0, cv.width, 40).data; let s = 0; for (let i = 0; i < d.length; i += 16) s += d[i] + d[i + 1] + d[i + 2]; return Math.round(s / (d.length / 16)) }
    const snd = (await import('./sound.js')).sound
    const trail = [], ms = { orbit: [], rest: [] }, look = { pre: null, orbit: null, post: null }
    let frames = 0, cur = null, prevPh = null, evEnd = null
    const rec = q => { cur = q }
    const adv = async n => { for (let i = 0; i < n; i++) {
      const t0 = performance.now(); __harness.luffyTest.step(1); const dt = performance.now() - t0; frames++
      const q = __harness.omnimanViltrumTest.raw(), s = q._omv
      ;(s?.ev?.ph === 'orbit' ? ms.orbit : ms.rest).push(dt)
      if (frames % 10 === 0 && s) { const o = __harness.omnimanViltrumTest.raw('p2'); trail.push(JSON.stringify([{ ...s, cues: undefined, fx: undefined }, q.x, q.y, q.vx, q.vy, q.health, q.energy, o.x, o.y, o.health], FR)) }
      const ph = s?.ev?.ph
      const now = () => ({ sky: sky(), zoom: __harness.camera?.()?.zoom ?? null, duck: snd._duckCount })
      if (!ph && !look.evStarted) look.pre = now()                      // the last frame BEFORE the ultimate
      if (ph) look.evStarted = true
      if (ph === 'orbit' && !look.orbit) look.orbit = now()
      if (ph === 'orbit') look.orbitMin = Math.min(look.orbitMin ?? 1e9, sky())
      if (prevPh && !ph && evEnd == null) evEnd = frames
      if (evEnd != null && frames === evEnd + 45 && !look.post) look.post = { ...now(), ev: s?.ev ?? null }
      prevPh = ph
    } }
    const ev = await (eval('(' + src + ')'))(adv, rec)
    for (let i = 0; i < 60; i++) await adv(1)
    const med = a => { const b = [...a].sort((x, y) => x - y); return b.length ? +b[Math.floor(b.length / 2)].toFixed(2) : null }
    const p95 = a => { const b = [...a].sort((x, y) => x - y); return b.length ? +b[Math.floor(b.length * 0.95)].toFixed(2) : null }
    const recd = __harness.replay.stopAndGet()
    const f = __harness.omnimanViltrumTest.raw(), o = __harness.omnimanViltrumTest.raw('p2')
    return { ev, trail: trail.join('|'), frames, look, ms: { orbitMed: med(ms.orbit), orbitP95: p95(ms.orbit), restMed: med(ms.rest), restP95: p95(ms.rest), orbitN: ms.orbit.length }, rec: recd,
      end: { stats: f._omv?.stats, p1: [f.x, f.y, f.health, f.energy], p2: [o.x, o.y, o.health] } }
  }, PLAN_SRC)
  const A = await once(), B = await once()
  const E = A.ev
  report.events = E; report.frames = A.frames; report.look = A.look; report.frameTime = A.ms
  ck('one match: full speed reached (≥ 56.5 of 57.2) + sonic boom', E.top >= 56.5 && E.booms >= 1, JSON.stringify(E))
  ck('… wall crash (≥ 70 % into the wall / camera edge)', E.crash >= 1, JSON.stringify(E))
  ck('… Escape Velocity: grab → ascent → orbit → ret → impact → settle, it connected', JSON.stringify(E.seen.slice(0, 6)) === JSON.stringify(['grab', 'ascent', 'orbit', 'ret', 'impact', 'settle']) && E.escapeHits >= 1, JSON.stringify(E))
  ck('… THINK! (after two Decrees built the bar) connected', E.think >= 1 && E.thinkHits >= 1, JSON.stringify(E))
  ck('determinism: same seed + same key plan twice → identical sim trail and end state', A.trail === B.trail && JSON.stringify(A.end) === JSON.stringify(B.end), `${H16(A.trail)} vs ${H16(B.trail)}`)
  report.trailHash = H16(A.trail)
  { const ta = A.trail.split('|'), tb = B.trail.split('|'); const i = ta.findIndex((x, j) => x !== tb[j])
    if (i >= 0) { const xa = JSON.parse(ta[i]), xb = JSON.parse(tb[i]); const d = []
      const cmp = (u, v, pth) => { if (JSON.stringify(u) === JSON.stringify(v)) return; if (u && v && typeof u === 'object' && typeof v === 'object') { for (const k of new Set([...Object.keys(u), ...Object.keys(v)])) cmp(u[k], v[k], pth + '.' + k) } else d.push([pth, u, v]) }
      cmp(xa, xb, ''); report.firstDiverge = { sample: i, frame: (i + 1) * 10, diffs: d.slice(0, 20) }; console.log('DIVERGE', JSON.stringify(report.firstDiverge).slice(0, 1500)) } }
  const L = A.look
  ck('Escape Velocity: background = sky overlay during the orbit, the stage back afterwards (top band brightness)', !!L.orbit && !!L.pre && !!L.post && L.orbitMin < L.pre.sky * 0.6 && Math.abs(L.post.sky - L.pre.sky) <= Math.max(30, L.pre.sky * 0.25) && L.post.ev == null, JSON.stringify(L))
  ck('… camera zoom returns to normal', !!L.post && (L.pre.zoom == null || Math.abs(L.post.zoom - L.pre.zoom) < 0.06), JSON.stringify([L.pre.zoom, L.orbit?.zoom, L.post.zoom]))
  ck('… audio: the music duck is held in the orbit and released after', !!L.orbit && !!L.post && L.orbit.duck > L.pre.duck && L.post.duck < L.orbit.duck, JSON.stringify([L.pre.duck, L.orbit.duck, L.post.duck]))
  ck('no frame-time drop during the orbit (median update+render ≤ 1.5 × the rest + 2 ms)', A.ms.orbitN > 20 && A.ms.orbitMed <= A.ms.restMed * 1.5 + 2, JSON.stringify(A.ms))
  // ── replay of that match ──
  const rec = A.rec
  report.replay = rec ? { frames: rec.frameCount, deltas: rec.frames?.length, checkpoints: rec.states?.length, p1Char: rec.p1Char, seed: rec.seed } : null
  ck('replay: the match recording has the seed, Omni-Man, input deltas and state checkpoints', !!rec && rec.p1Char === 'omniman_viltrum' && rec.frames?.length > 20 && rec.states?.length >= 3, JSON.stringify(report.replay))
  const pb = await page.evaluate(async r => {
    const ok = __harness.replay.play(r)
    for (let i = 0; i < 2400; i++) { const p = __harness.online.syncProbe2(); if (p && p.g === 'battle' && p.cd <= 0) break; __harness.luffyTest.step(1) }
    let maxS = {}; const snaps = {}; for (let i = 0; i < (r.frameCount || 0) + 40; i++) { __harness.luffyTest.step(1); const s = __harness.omnimanViltrumTest.raw()._omv?.stats || {}
      { const fr = __harness.online.syncProbe()?.frame, a = __harness.omnimanViltrumTest.raw(), b = __harness.omnimanViltrumTest.raw('p2'); if (fr != null && fr % 60 === 1) snaps[fr - 1] = [[a.x, a.y, a.health, a.energy], [b.x, b.y, b.health, b.energy], a._omv?.ev?.ph || null, a.currentAttack?.name || null] } for (const k of ['booms', 'crashes', 'think', 'thinkHits', 'escapeHits']) maxS[k] = Math.max(maxS[k] || 0, s[k] || 0) }
    const st = __harness.replay.playbackState(); __harness.replay.stopPlayback?.()
    const bad = (r.states || []).filter(c => c.f >= (st.desyncFrame ?? 1e9) - 60 && c.f <= (st.desyncFrame ?? -1)).map(c => ({ f: c.f, rec: [c.a, c.b], play: snaps[c.f] }))
    return { ok: ok?.ok ?? !!ok, st, maxS, bad } }, rec)
  if (pb.bad?.length) console.log('REPLAY-DIFF', JSON.stringify(pb.bad).slice(0, 1500))
  report.playback = pb
  ck('replay playback: ZERO desync on every checkpoint', pb.ok && pb.st.checks >= 3 && pb.st.desyncFrame === null && pb.st.matched === pb.st.checks, JSON.stringify(pb.st))
  ck('… and the playback re-lives the boom, crash, Escape Velocity and THINK!', pb.maxS.booms >= 1 && pb.maxS.crashes >= 1 && pb.maxS.escapeHits >= 1 && pb.maxS.thinkHits >= 1, JSON.stringify(pb.maxS))
  await page.close()

  // ════ LAN: host + joiner over the real relay, the same plan on the host's keyboard ════
  const RELAY_PORT = 8799, relay = startLanServer({ port: RELAY_PORT, relay: true, log: () => {} }); await new Promise(r => relay.wss.once('listening', r))
  try {
    const open = async () => { const p = await browser.newPage({ viewport: { width: 1280, height: 720 } }); p.on('pageerror', e => errs.push(e.message))
      await p.goto(server.base + `/index.html?harness=1&relay=${encodeURIComponent('ws://127.0.0.1:' + RELAY_PORT)}`, { waitUntil: 'load' })
      await p.waitForFunction(() => window.__harness?.online && window.__harness?.omnimanViltrumTest, null, { timeout: 20000 }); await p.mouse.click(640, 360); return p }
    const host = await open(), join = await open()
    await host.evaluate(() => __harness.online.hostStart()); await host.waitForFunction(() => !!__harness.online.hostCode(), null, { timeout: 8000 })
    const code = await host.evaluate(() => __harness.online.hostCode()); await join.evaluate(c => __harness.online.join(c), code)
    await host.waitForFunction(() => __harness.online.status() === 'ready', null, { timeout: 8000 })
    await host.evaluate(() => __harness.online.hostStartMatch('omniman_viltrum', 'homelander', null))
    await join.waitForFunction(() => __harness.online.isActive(), null, { timeout: 8000 })
    const inBattle = () => { const p = __harness.online.syncProbe2(); return !!p && p.g === 'battle' && p.cd <= 0 }   // the REAL intro + countdown on both devices
    await host.waitForFunction(inBattle, null, { timeout: 60000 }); await join.waitForFunction(inBattle, null, { timeout: 60000 })
    const probe = p => p.evaluate(() => { const f = __harness.omnimanViltrumTest.raw(), o = __harness.omnimanViltrumTest.raw('p2'), s = f?._omv
      const FR = (k, v) => (k && v && typeof v === 'object' && v.spriteHandler) ? '@' + (v.side || v.rosterKey) : v
      return { frame: __harness.online.syncProbe()?.frame, k: JSON.stringify([f.x, f.y, f.health, o.x, o.y, o.health, s ? { ...s, cues: undefined, fx: undefined } : null], FR), stats: s?.stats || null } })
    // sample both sides continuously while the host's plan runs
    let sampling = true; const SH = [], SJ = []
    const sampler = (async () => { while (sampling) { const [a, b] = await Promise.all([probe(host), probe(join)]); SH.push(a); SJ.push(b); await new Promise(r => setTimeout(r, 12)) } })()
    const lanEv = await host.evaluate(async src => {
      const fr = () => __harness.online.syncProbe()?.frame ?? 0
      const adv = n => new Promise(res => { const t = fr() + n, w = () => fr() >= t ? res() : setTimeout(w, 4); w() })
      return (eval('(' + src + ')'))(adv)
    }, PLAN_SRC)
    await new Promise(r => setTimeout(r, 1500)); sampling = false; await sampler
    const mj = new Map(SJ.filter(s => s.frame != null).map(s => [s.frame, s])); let shared = 0, bad = 0
    let first = null
    for (const a of SH) { const b = mj.get(a.frame); if (!b || a.frame == null) continue; shared++; if (a.k !== b.k) { bad++; if (!first) first = { frame: a.frame, h: a.k.slice(0, 700), j: b.k.slice(0, 700) } } }
    if (first) console.log('LAN-DIFF', JSON.stringify(first))
    const lastJ = SJ[SJ.length - 1]?.stats || {}
    report.lan = { events: lanEv, shared, mismatched: bad, joinerStats: lastJ, samples: [SH.length, SJ.length] }
    ck('LAN: the same match on the host (boom, crash, Escape Velocity, THINK!)', lanEv.booms >= 1 && lanEv.crash >= 1 && lanEv.escapeHits >= 1 && lanEv.thinkHits >= 1, JSON.stringify(lanEv))
    ck('… both sims identical on every shared frame (positions, HP and his full sim state)', shared >= 20 && bad === 0, `shared=${shared} mismatched=${bad}`)
    ck('… the joiner\'s sim saw every event too', (lastJ.booms || 0) >= 1 && (lastJ.crashes || 0) >= 1 && (lastJ.escapeHits || 0) >= 1 && (lastJ.thinkHits || 0) >= 1, JSON.stringify(lastJ))
    await host.close(); await join.close()
  } finally { await relay.close?.() }

  // ════ companion: a friend's browser loads everything through the host's client manifest ════
  const disk = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; e.isDirectory() ? walk(p) : disk.push(p) } }
  walk('assets/omniman_viltrum'); for (const f of fs.readdirSync('.')) if (/^omnimanViltrum\w*\.js$/.test(f)) disk.push(f)
  const notClient = disk.filter(p => !isClientPath(p))
  ck(`companion: every Omni-Man module + asset (${disk.length}) is a client path the host serves`, disk.length > 100 && !notClient.length, notClient.slice(0, 4).join(','))
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.writeFileSync('docs/msv1/omniman/match_results.json', JSON.stringify({ pass, fail, report }, null, 1))
console.log(`\n  OMNIMAN_VILTRUM ONE-MATCH: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
