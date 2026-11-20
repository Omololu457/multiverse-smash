// harness/msv1_clones.test.mjs — MSV1-CLONES: the MSV1 anime clone choreography on Naruto / Sasuke / Madara / Tobirama /
// Hashirama, in a real match (index.html → startMatch → updateCurrentState + renderCurrentState every frame).
//   node harness/msv1_clones.test.mjs            → checks + frame strips in docs/msv1/clones/strips/
// For each character: one clone move with the choreography ON vs OFF (CC_TEST.off = the authored engine as it was):
// same hits, same damage, every hit exactly `lead` frames later; all five steps seen; element-correct pop / exit.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const STRIPS = 'docs/msv1/clones/strips', RAW = `${STRIPS}/_raw`; fs.mkdirSync(RAW, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${typeof d === 'string' ? d : JSON.stringify(d)}` : ''}`) }
const server = await serve()
const browser = await chromium.launch({ headless: true })
const errors = []
let page
async function boot(p1, p2 = 'kakashi') {
  if (page) await page.close()
  page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errors.push(p1 + ': ' + e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest && !!window.__harness?.cloneChoreo, null, { timeout: 30000 })
  await page.evaluate(() => { __harness.rng.forceSeed(9); __harness.start({ mode: 'training' }); __harness.skipToBattle() })
  await page.evaluate(() => __harness.luffyTest.step(2))
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 4; i++) { await page.evaluate(() => __harness.luffyTest.step(5)); await new Promise(r => setTimeout(r, 150)) }
}
// play one run; per frame: caster pose, every ghost (phase / visible / hidden / tilt / x,y), foe health, CC_FX kinds pushed
async function play(key, seq, off, shots = null) {
  return page.evaluate(async ([key, seq, off, shots]) => {
    const cc = await import('./clonechoreo.js'); cc.CC_TEST.off = off; cc.CC_FX.length = 0; cc.CC_TEST.log = []
    const T = __harness.luffyTest, raw = w => __harness.ninjaTest?.raw?.(w)
    const p1 = raw('p1'), p2 = raw('p2')
    p1.x = 700; p2.x = 900; p1.facing = 1; p2.facing = -1; p2.health = p2.maxHealth; p1.energy = p1.maxEnergy || 200
    for (const f of [p1, p2]) { f.vx = 0; f.hitstun = 0; f.attacking = false; f.invulnTimer = 0 }
    T.step(8)
    const hp0 = p2.health, rows = [], seen = []
    const naruto = key === 'naruto'
    const ok = naruto ? __harness.narutoSeq(seq) : __harness.cloneChoreo.seq(seq)
    const state = () => naruto ? __harness.narutoChoreo() : __harness.cloneChoreo.state('p1')
    let n0 = 0
    for (let i = 0; i < 140; i++) {
      T.step(1)
      for (; n0 < cc.CC_TEST.log.length; n0++) seen.push([i, cc.CC_TEST.log[n0].k, cc.CC_TEST.log[n0].kind || null])
      const st = state()
      const bodies = naruto ? (window.__ccBodies = null, null) : null
      const all = []
      const run = st.active
      // ghost bodies via the render feeds (phase / tilt are presentation fields on the bodies)
      const g = await import(naruto ? './narutoChoreography.js' : './cloneChoreography.js')
      const list = naruto ? g.getNarutoChoreoBodies() : g.getChoreoBodies()
      for (const b of list) all.push([b._ccPhase || null, !!b._ccHide, Math.round((b._ccTilt || 0) * 10) / 10, Math.round(b.x), Math.round(b.y), b._forceAction])
      rows.push({ i, act: run, cast: p1._forceAction || null, hp: p2.health, fired: st.firedBeats ? st.firedBeats.length : null, bodies: all })
      if (shots && shots.includes(i)) await new Promise(r => setTimeout(r, 0)), window.__shotReq = i
      if (!run && i > 12) break
    }
    cc.CC_TEST.off = false
    return { ok, hp0, rows, seen }
  }, [key, seq, off, shots])
}
const CHARS = [
  { key: 'naruto', seq: 'barrage', kind: 'smoke', lead: 10 },
  { key: 'sasuke', seq: 'amenotejikara', kind: 'smoke', lead: 6 },
  { key: 'madara', seq: 'pureAttack', kind: 'smoke', lead: 12, still: true },
  { key: 'tobirama', seq: 'pureAttack', kind: 'water', lead: 12 },
  { key: 'hashirama', seq: 'pureAttack', kind: 'wood', lead: 12 },
]
const hitFrames = rows => { const out = []; for (let i = 1; i < rows.length; i++) if (rows[i].hp < rows[i - 1].hp) out.push([rows[i].i, rows[i - 1].hp - rows[i].hp]); return out }
try {
  for (const C of CHARS) {
    console.log(`\n── ${C.key} (${C.seq}) ──`)
    await boot(C.key)
    await boot(C.key); const A = await play(C.key, C.seq, true)
    await boot(C.key); const B = await play(C.key, C.seq, false)
    const ha = hitFrames(A.rows), hb = hitFrames(B.rows)
    const dmgA = A.hp0 - A.rows[A.rows.length - 1].hp, dmgB = B.hp0 - B.rows[B.rows.length - 1].hp
    check(`${C.key}: the move starts (real engine) both ways`, A.ok && B.ok)
    check(`${C.key}: same total damage (${dmgA}) and same number of damage frames with the choreography`, dmgA === dmgB && ha.length === hb.length, { off: ha, on: hb })
    check(`${C.key}: every hit lands exactly +${C.lead} frames later (the lead-in), same amount each`, ha.every((h, k) => hb[k] && hb[k][0] - h[0] === C.lead && hb[k][1] === h[1]), { off: ha.map(h => h[0]), on: hb.map(h => h[0]) })
    const lenA = A.rows.filter(r => r.act).length, lenB = B.rows.filter(r => r.act).length
    check(`${C.key}: caster commitment grows by ${lenB - lenA} frames (≤ 12)`, lenB - lenA === C.lead && C.lead <= 12, { off: lenA, on: lenB })
    const kinds = B.seen.map(s => s[1])
    check(`${C.key}: 1 ring into the hand sign at the start`, B.seen[0]?.[1] === 'ring' && B.seen[0][0] <= 1, B.seen.slice(0, 2))
    const pops = B.seen.filter(s => s[1] === 'pop'), exits = B.seen.filter(s => s[1] === 'exit')
    check(`${C.key}: pops are ${C.kind} (${pops.length})`, pops.length > 0 && pops.filter(s => s[2] !== 'splash').every(s => s[2] === C.kind), pops.slice(0, 4))
    const phases = new Set(B.rows.flatMap(r => r.bodies.map(b => b[0])))
    check(`${C.key}: staggered fan-out seen`, phases.has('fan') && (() => { const first = {}; B.rows.forEach(r => r.bodies.forEach((b, k) => { if (b[0] === 'fan' && first[k] == null) first[k] = r.i })); const v = Object.values(first); return v.length < 2 || new Set(v).size > 1 })())
    check(`${C.key}: hold beat seen`, phases.has('hold'))
    const tilts = B.rows.flatMap(r => r.bodies.map(b => b[2]))
    check(C.still ? `${C.key}: clones stand upright and still (tilt 0)` : `${C.key}: the copy is broken (per-clone tilt ≠ 0)`, C.still ? tilts.every(t => t === 0) : tilts.some(t => t !== 0))
    check(`${C.key}: unison strike event`, kinds.includes('strike'))
    check(`${C.key}: exits are ${C.kind} (${exits.length})`, exits.length > 0 && exits.every(s => s[2] === C.kind), exits.slice(0, 4))
    if (C.key === 'tobirama' || C.key === 'hashirama') check(`${C.key}: the body is hidden while its ${C.kind} arrival cells play`, B.rows.some(r => r.bodies.some(b => b[0] === 'pop' && b[1])))
    // deterministic: the same run twice → identical trace
    await boot(C.key); const B2 = await play(C.key, C.seq, false)
    check(`${C.key}: same seed + same move → identical clone trace (positions / phases / damage)`, JSON.stringify(B2.rows.map(r => [r.hp, r.bodies, r.cast])) === JSON.stringify(B.rows.map(r => [r.hp, r.bodies, r.cast])))
    // frame strip: replay with screenshots at the step moments
    const marks = { sign: 1, pop: null, fan: null, hold: null, strike: null, exit: null }
    B.rows.forEach(r => r.bodies.forEach(b => { if (b[0] === 'pop' && marks.pop == null) marks.pop = r.i + 1; if (b[0] === 'fan' && marks.fan == null) marks.fan = r.i + 1; if (b[0] === 'hold' && marks.hold == null) marks.hold = r.i + 2 }))
    marks.strike = (B.seen.find(s => s[1] === 'strike') || [null])[0]; marks.exit = (B.seen.find(s => s[1] === 'exit') || [null])[0]
    if (marks.strike != null) marks.strike += 1; if (marks.exit != null) marks.exit += 3
    await boot(C.key)
    await page.evaluate(async ([key, seq]) => {
      const T = __harness.luffyTest, raw = w => __harness.ninjaTest?.raw?.(w), p1 = raw('p1'), p2 = raw('p2')
      p1.x = 700; p2.x = 900; p1.facing = 1; p2.facing = -1; p1.energy = p1.maxEnergy || 200; T.step(8)
      key === 'naruto' ? __harness.narutoSeq(seq) : __harness.cloneChoreo.seq(seq)
    }, [C.key, C.seq])
    let at = 0
    for (const [name, i] of Object.entries(marks)) {
      if (i == null) continue
      while (at < i) { await page.evaluate(() => __harness.luffyTest.step(1)); at++ }
      await page.screenshot({ path: `${RAW}/${C.key}_${String(at).padStart(3, '0')}_${name}.png` })
    }
    console.log('   marks', JSON.stringify(marks))
  }
  // ── persistent "," clones: Tobirama rises out of water, Hashirama grows, Madara pops in / leaves through dark smoke (not wood)
  for (const [key, kind] of [['tobirama', 'water'], ['hashirama', 'wood'], ['madara', 'smoke']]) {
    await boot(key)
    const r = await page.evaluate(async () => {
      const cc = await import('./clonechoreo.js'); cc.CC_TEST.log = []
      const n = __harness.spawnP1Clones(2); __harness.luffyTest.step(6)
      const pops = cc.CC_TEST.log.filter(e => e.k === 'pop').map(e => e.kind)
      const sm = await import('./summons.js'); sm.dispelShadowClones(__harness.ninjaTest.raw('p1')); __harness.luffyTest.step(4)
      return { n, pops, exits: cc.CC_TEST.log.filter(e => e.k === 'exit').map(e => e.kind) }
    })
    if (key !== 'hashirama') await page.screenshot({ path: `${RAW}/persist_${key}.png` })
    check(`${key}: persistent "," clones spawn through ${kind} (${r.n} clones)`, r.n >= 1 && r.pops.length === r.n && r.pops.every(k => k === kind), r)
    if (key !== 'hashirama') check(`${key}: …and leave through ${kind}`, r.exits.length === r.n && r.exits.every(k => k === kind), r.exits)
  }
  // ── everyone else on the shared engine is untouched: choreography ON vs OFF gives a byte-identical run
  for (const key of ['jiraiya', 'kakashi', 'minato']) {
    const seq = key === 'jiraiya' ? (await (async () => { await boot(key); return page.evaluate(() => __harness.cloneChoreo.kit('p1').seqKeys[0]) })()) : 'pureAttack'
    await boot(key); const A = await play(key, seq, true)
    await boot(key); const B = await play(key, seq, false)
    check(`${key} (${seq}): identical with the choreography on (no style → zero change), no clone FX events`, A.ok && JSON.stringify(A.rows) === JSON.stringify(B.rows) && B.seen.length === 0, { len: [A.rows.length, B.rows.length], fx: B.seen.length })
  }
  // ── Naruto's largest clone count: Kurama stage-2 formation (12 clones) — sim + render time per frame
  await boot('naruto')
  const perf = await page.evaluate(async () => {
    const T = __harness.luffyTest, raw = w => __harness.ninjaTest?.raw?.(w), p1 = raw('p1')
    const time = n => { const t0 = performance.now(); for (let i = 0; i < n; i++) T.step(1); return (performance.now() - t0) / n }
    p1.health = Math.round((p1.maxHealth || 1000) * 0.08); T.step(30)   // Kurama shroud is health-gated: settle into stage 5 first
    const stage = p1.shroudStage, base = time(40)
    __harness.narutoSummon(); T.step(2)
    const st = __harness.narutoChoreo(); const n = (st.bodies || []).length
    time(10); await new Promise(r => setTimeout(r, 300))   // let the clone / smoke sheets decode (first-load, not per-frame)
    const withClones = time(60)
    return { n, stage, base: +base.toFixed(2), withClones: +withClones.toFixed(2) }
  })
  check(`Naruto's largest clone count (Kurama stage 2 formation = ${perf.n} clones) keeps the frame inside 16.7 ms (sim + render)`, perf.n >= 12 && perf.withClones < 16.7, perf)
  await page.screenshot({ path: `${RAW}/naruto_kurama12_formation.png` })
  check('no page errors', errors.length === 0, errors.slice(0, 3))
} catch (e) { console.log('CRASH', e.stack); FAIL++ }
await browser.close(); server.close?.()
console.log(`\nMSV1-CLONES: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
