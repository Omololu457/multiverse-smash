// harness/blood.test.mjs — MSV1-BLOOD: progressive damage blood.
//   node harness/blood.test.mjs
// A. module rules (battleBlood.js on mock fighters): tiers / regions / damageTypes / spray / young / fluids /
//    drips / pools / smears / floor cap / fade / round drop / healing / Off-Low-Full / determinism of the digest
// B. in the real game: the sim is IDENTICAL with Blood Off / Low / Full (whole fighter objects, both sides),
//    the same seed reproduces the same blood digest (LAN / companion / replay all derive from the same state),
//    and blood actually grows in a real CPU match.
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'))
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.css': 'text/css' }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) return res.writeHead(403).end(); fs.readFile(f, (e, d) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
let pass = 0, fail = 0
const check = (n, c, d = '') => { if (c) { pass++; console.log('  ✅ PASS ', n, d ? `— ${d}` : '') } else { fail++; console.log('  ❌ FAIL ', n, d ? `— ${d}` : '') } }
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))

// ── A. module rules ─────────────────────────────────────────────────────────────────────────────────────
console.log('\n── A. blood rules (battleBlood.js) ──')
await page.goto(`${base}/__blank__`)
const A = await page.evaluate(async () => {
  const B = await import('/battleBlood.js')
  const out = {}
  let LV = 'full'; B.bloodSetLevelSource(() => LV)
  const mk = (key, side, hp = 1000) => ({ rosterKey: key, side, health: hp, maxHealth: 1000, facing: 1, x: 0, y: 0, w: 60, h: 100, grounded: true, vx: 0 })
  const tierAt = (frac) => { B.bloodMatchStart(1); const f = mk('goku', 'p1', 1000 - frac * 1000); B.bloodTick(f, 1, 100); return B.bloodStatus().slots.p1.tier }
  out.tiers = [0.10, 0.20, 0.40, 0.70, 0.90].map(tierAt)
  // regions + damageTypes
  // one fresh fighter per damageType (hits on the same slot grow one wound, so types are tested apart)
  const one = (t, y) => { B.bloodMatchStart(2); const g = mk('goku', 'p1', 900); B.bloodHit({ target: g, x: 30, y, damage: 40, damageType: t, frame: 5 }); return (B.bloodStatus().slots.p1?.wounds || []).join(' ') }
  out.types = { blunt: one('blunt', 6), slash: one('slash', 45), projectile: one('projectile', 85), energy: one('energy', 45), grab: one('grab', 45), haki: one('haki', 45) }
  // spray: heavy only, Full only
  B.bloodMatchStart(3); const h = mk('goku', 'p1', 900)
  const light = B.bloodHit({ target: h, x: 30, y: 40, damage: 30, damageType: 'blunt', frame: 5 })
  const sprays0 = B.bloodStatus().sprays
  const heavy = B.bloodHit({ target: h, x: 30, y: 40, damage: 120, damageType: 'blunt', frame: 9 })
  out.spray = { light, sprays0, heavy, sprays1: B.bloodStatus().sprays }
  LV = 'low'; B.bloodMatchStart(4); const l = mk('goku', 'p1', 900)
  B.bloodHit({ target: l, x: 30, y: 40, damage: 140, damageType: 'blunt', frame: 9 }); out.lowSpray = B.bloodStatus().sprays
  const lt = mk('goku', 'p1', 50); B.bloodTick(lt, 20, 100); out.lowTier = B.bloodStatus().slots.p1.tier
  LV = 'off'; B.bloodMatchStart(5); const o = mk('goku', 'p1', 50)
  out.offHit = B.bloodHit({ target: o, x: 30, y: 40, damage: 140, damageType: 'slash', frame: 9 }); B.bloodTick(o, 20, 100)
  out.offWounds = B.bloodStatus().slots.p1?.wounds.length || 0
  LV = 'full'
  // young: tier cap 2, no spray
  B.bloodMatchStart(6); const y = mk('ben10', 'p1', 50); B.bloodTick(y, 20, 100); B.bloodHit({ target: y, x: 30, y: 40, damage: 160, damageType: 'slash', frame: 30 })
  out.young = { tier: B.bloodStatus().slots.p1.tier, sprays: B.bloodStatus().sprays }
  // fluids
  out.fluids = Object.fromEntries(['goku', 'genos', 'krybot', 'cyborg', 'spd_red', 'windrangers', 'madara', 'gaara', 'vilgax', 'naruto'].map(k => [k, B.bloodFluidOf(mk(k, 'p1'))]))
  // round drop + healing
  B.bloodMatchStart(7); const rd = mk('goku', 'p1', 100); B.bloodTick(rd, 1, 100)
  const before = B.bloodStatus().slots.p1.tier
  B.bloodRoundStart(); rd.health = 1000; B.bloodTick(rd, 2, 100)
  out.round = { before, after: B.bloodStatus().slots.p1.tier, carry: B.bloodStatus().slots.p1.carry }
  B.bloodMatchStart(8); const he = mk('goku', 'p1', 100); B.bloodTick(he, 1, 100); const hb = B.bloodStatus().slots.p1.tier
  he.health = 500; B.bloodTick(he, 2, 100); out.heal = { before: hb, after: B.bloodStatus().slots.p1.tier }
  // floor: drips, pool, smear, cap, fade (drive a T4 fighter with a fake draw rect so world positions exist)
  B.bloodMatchStart(9)
  const fl = mk('goku', 'p1', 50); fl._lastDrawX = 100; fl._lastDrawY = 300; fl._lastDrawW = 120; fl._lastDrawH = 160
  for (const [yy, t] of [[8, 'slash'], [40, 'slash'], [60, 'pierce'], [90, 'slash']]) B.bloodHit({ target: fl, x: 30, y: yy, damage: 60, damageType: t, frame: 3 })
  // paint once so trickle ends exist (needs the map + an image-less clip: use a 1×1 canvas as the "sheet")
  for (let k = 0; k < 200 && !B.bloodMapReady('goku'); k++) await new Promise(r => setTimeout(r, 20))
  const map = await (await fetch('/data/bloodmaps/goku.json')).json()
  const key = Object.values(map.byAction).find(k => k.startsWith('assets') || k.includes('|')) ; const [sheet, sx, sy, w, hh, n] = key.split('|')
  const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = '/' + sheet })
  let drops = 0, maxDecals = 0, pools = 0, smears = 0
  for (let fr = 4; fr < 2400; fr++) {
    fl.vx = (fr > 1400 && fr < 1500) ? 2 : 0; if (fl.vx) fl.x += fl.vx
    fl._lastDrawX = 100 + fl.x
    if (fr % 6 === 0) B.bloodFrame(fl, { sheet, sourceX: +sx, sourceY: +sy, width: +w, height: +hh, frames: +n }, 0, 'idle', im, +sx, +sy, fr)
    B.bloodTick(fl, fr, 470); B.bloodTickWorld(fr)
    const st = B.bloodStatus(); drops = Math.max(drops, st.drops); maxDecals = Math.max(maxDecals, st.decals); pools = Math.max(pools, st.decalKinds.pool || 0); smears = Math.max(smears, st.decalKinds.smear || 0)
  }
  // cap: force many landings
  for (let fr = 2400; fr < 9000; fr++) { if (fr % 6 === 0) B.bloodFrame(fl, { sheet, sourceX: +sx, sourceY: +sy, width: +w, height: +hh, frames: +n }, 0, 'idle', im, +sx, +sy, fr); B.bloodTick(fl, fr, 470); B.bloodTickWorld(fr); maxDecals = Math.max(maxDecals, B.bloodStatus().decals) }
  out.floor = { drops, maxDecals, pools, smears, decalsNow: B.bloodStatus().decals }
  // fade: stop bleeding (heal fully) and let 30 s pass
  fl.health = 1000; for (let fr = 9000; fr < 9000 + 1900; fr++) { B.bloodTick(fl, fr, 470); B.bloodTickWorld(fr) }
  out.fade = B.bloodStatus().decals
  B.bloodRoundStart(); out.roundFloor = B.bloodStatus().decals
  // digest determinism: same inputs twice → same digest; different seed → different
  const run = (seed) => { B.bloodMatchStart(seed); const a = mk('goku', 'p1', 300), b = mk('naruto', 'p2', 600); for (let i = 0; i < 40; i++) { B.bloodHit({ target: i % 2 ? a : b, x: 30, y: (i * 13) % 100, damage: 20 + (i * 7) % 90, damageType: ['slash', 'blunt', 'projectile'][i % 3], frame: i * 9 }); B.bloodTick(a, i * 9, 100); B.bloodTick(b, i * 9, 100) } return B.bloodDigest() }
  out.digest = [run(11), run(11), run(12)]
  return out
})
check('tiers by damage taken: 10%→0, 20%→1, 40%→2, 70%→3, 90%→4', JSON.stringify(A.tiers) === '[0,1,2,3,4]', JSON.stringify(A.tiers))
const T = A.types
check('blunt to the head opens nose / mouth / brow', /^(nose|mouth|brow):blunt/.test(T.blunt), T.blunt)
check('slash to the body makes a cut', /^(chest|abdomen|side|upper|fore|hand):slash/.test(T.slash), T.slash)
check('projectile to the legs makes a puncture', /^(thigh|shin):pierce/.test(T.projectile), T.projectile)
check('energy scorches (little blood)', /:scorch:/.test(T.energy), T.energy)
check('grab makes no wound', T.grab === '', T.grab)
check('haki / other types count as blunt', /:blunt:/.test(T.haki), T.haki)
check('light hits never spray', A.spray.light === null && A.spray.sprays0 === 0, JSON.stringify(A.spray))
check('heavy hits spray (capped ≤ 12), wet sound flag set', A.spray.sprays1 > 0 && A.spray.sprays1 <= 12 && A.spray.heavy?.wet === true, JSON.stringify(A.spray))
check('Blood: Low → no spray, tier capped at 2', A.lowSpray === 0 && A.lowTier === 2, `spray=${A.lowSpray} tier=${A.lowTier}`)
check('Blood: Off → no wounds at all', A.offHit === null && A.offWounds === 0, `${A.offWounds}`)
check('young fighters: tier ≤ 2, no spray', A.young.tier <= 2 && A.young.sprays === 0, JSON.stringify(A.young))
const F = A.fluids
check('fluid types: human blood, machines oil, Rangers suit, Edo cracks, sand, alien colour',
  F.goku === 'blood' && F.naruto === 'blood' && F.genos === 'oil' && F.krybot === 'oil' && F.cyborg === 'oil' && F.spd_red === 'ranger' && F.windrangers === 'ranger' && F.madara === 'crack:edo' && F.gaara === 'sand' && F.vilgax.startsWith('alien'), JSON.stringify(F))
check('between rounds wounds drop ONE tier', A.round.before === 4 && A.round.after === 3, JSON.stringify(A.round))
check('healing removes tiers with the health restored', A.heal.before === 4 && A.heal.after === 2, JSON.stringify(A.heal))
check('T3+ drips fall', A.floor.drops > 0, JSON.stringify(A.floor))
check('T4 standing still builds a pool', A.floor.pools > 0, JSON.stringify(A.floor))
check('walking through a pool leaves smeared steps', A.floor.smears > 0, JSON.stringify(A.floor))
check('floor decals hard-capped at 64', A.floor.maxDecals <= 64 && A.floor.maxDecals >= 20, JSON.stringify(A.floor))
check('floor blood fades away after ~20 s', A.fade === 0, `decals after 30 s idle = ${A.fade}`)
check('round start clears the floor', A.roundFloor === 0, `${A.roundFloor}`)
check('same events → same blood digest; other seed → different', A.digest[0] === A.digest[1] && A.digest[0] !== A.digest[2], A.digest.join(' '))

// ── B. in the real game ─────────────────────────────────────────────────────────────────────────────────
console.log('\n── B. in-game: sim identical with Blood Off / Low / Full, digest reproducible ──')
await page.goto(`${base}/index.html?harness=1`, { waitUntil: 'load' })
await page.waitForFunction(() => window.__harness && window.__harness.aiVsAi && window.__harness.juice?.blood, null, { timeout: 30000 })
const runMatch = (seed, lvl, frames) => page.evaluate(([s, lv, fr]) => {
  const H = window.__harness
  H.juice.setBloodLevel(lv)
  H.rng.forceSeed(s)
  H.aiVsAi.start({ p1: 'netero', p2: 'beerus', matches: 1, speed: 1 })
  let peak = 0
  for (let i = 0; i < fr; i += 50) { H.aiVsAi.step(50); const st = H.juice.blood(); for (const k in st.slots) peak = Math.max(peak, st.slots[k].wounds.length) }
  const skip = /^(_lastDraw|_bd|_juice|_hitFeel|_anim|_render|_spr|_draw)/
  const snap = who => { const p = H[who](); const seen = new WeakSet(); return JSON.stringify(p, (k, v) => { if (typeof v === 'function' || skip.test(k)) return undefined; if (v && typeof v === 'object') { if (seen.has(v)) return '[c]'; seen.add(v) } return v }) }
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0 } return h.toString(16) + ':' + s.length }
  return { p1: hash(snap('p1')), p2: hash(snap('p2')), hp: [H.p1().health, H.p2().health], digest: H.juice.bloodDigest(), peak, level: H.juice.blood().level }
}, [seed, lvl, frames])
const FR = 1500
const full1 = await runMatch(7777, 'full', FR), full2 = await runMatch(7777, 'full', FR)
const low = await runMatch(7777, 'low', FR), off = await runMatch(7777, 'off', FR)
check('sim hash identical: Full vs Low vs Off (whole fighter objects, both sides)', full1.p1 === low.p1 && full1.p1 === off.p1 && full1.p2 === low.p2 && full1.p2 === off.p2,
  `full=${full1.p1}/${full1.p2} low=${low.p1}/${low.p2} off=${off.p1}/${off.p2} hp=${full1.hp}`)
check('same seed → same blood digest (every screen derives it from the same sim)', full1.digest === full2.digest, `${full1.digest} ${full2.digest}`)
check('blood grows in a real CPU match', full1.peak > 0, `peak wounds=${full1.peak} hp=${full1.hp}`)
check('Blood: Off keeps no wounds in a real match', off.peak === 0, `${off.peak}`)
await page.evaluate(() => window.__harness.juice.setBloodLevel('full'))
check('no uncaught page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
console.log(`\nMSV1-BLOOD: ${pass} passed, ${fail} failed`)
await browser.close(); server.close()
process.exit(fail ? 1 : 0)
