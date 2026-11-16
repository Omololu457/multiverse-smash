// harness/enoch_combos.test.mjs — every combo in docs/enoch/COMBOS.md, performed in TRAINING with REAL raw inputs (motions as
// numpad digits, one frame per digit, buttons pressed the frame after the previous hit registered — a buffered player).
// A combo PASSES when every listed hit lands and the opponent never recovers between the first and the last hit (hitstun,
// launched, frozen or knocked down the whole time). Damage per combo is recorded in docs/enoch/combo_results.json.
//   node harness/enoch_combos.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 400 ? d.slice(0, 400) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1600)) } }
const results = {}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(server.base + `/index.html?harness=1&p1=enoch&p2=frozone&seed=81517`, { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
  await page.evaluate(() => { __harness.start({ mode: 'training' }); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
  await page.evaluate(async () => {
    const { writeRawControls } = await import('./input.js')
    const H = __harness.enochTest, step = n => __harness.luffyTest.step(n)
    // run one combo: steps = [{ wait: 'clean' | 'hit' | n, dirs: '236', btn: { special: true }, hold: { charge: true }, until: fn }]
    window.__combo = (name, setup, steps, maxFrames = 400) => {
      H.reset(); const a = H.raw(), b = H.raw('p2')
      for (const f of [a, b]) { f.health = f.maxHealth; f.vx = f.vy = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0; f.dashTimer = 0; f.dashCooldown = 0; f.attackCooldown = 0; f.knockdownState = false; f.isBlocking = false; f.invulnTimer = 0; f._supFrozen = 0; f.comboCounter = 0; f.energy = 100 }
      writeRawControls(a, {}); step(2); setup(a, b, H); step(1)
      const fw = () => a.facing === 1 ? 'right' : 'left', bk = () => a.facing === 1 ? 'left' : 'right'
      const D = d => ({ 1: { down: true, [bk()]: true }, 2: { down: true }, 3: { down: true, [fw()]: true }, 4: { [bk()]: true }, 5: {}, 6: { [fw()]: true } })[d]
      const log = [], hits = []; let frame = 0, prevHp = b.health, prevBursts = a._enoch?.stats?.bursts || 0, prevBeam = a._enoch?.stats?.beamHits || 0, firstHit = -1, lastHit = -1, gaps = 0, gapAt = []
      const started = []
      const tick = raw => { writeRawControls(a, raw); step(1); frame++
        { const k = a.currentAttack?.en?.key; if (k && started[started.length - 1]?.k !== k) started.push({ k, frame }) }
        const st = a._enoch?.stats || {}, burstNow = (st.bursts || 0) + (st.tides || 0) * 0
        if (b.health < prevHp) { hits.push({ frame, dmg: Math.round((prevHp - b.health) * 100) / 100, ds: (() => { const now = { ...(a._enoch?.stats || {}) }, d = Object.keys(now).filter(k => now[k] !== (window.__lastSt || {})[k]).map(k => k + '=' + now[k]).join(' '); window.__lastSt = now; return d })(), air: !(b.onGround || b.grounded), pt: (a._enoch?.field?.patches || []).map(p => p.type).join(','), by: [burstNow > prevBursts ? 'burst' : null, (a._enoch?.stats?.beamHits || 0) > prevBeam ? 'heatLens' : null].filter(Boolean).join('+') || (a._enoch?.ult ? 'super' : (a.currentAttack?.en?.key || a.currentAttack?.name || 'patch')) }); if (firstHit < 0) firstHit = frame; lastHit = frame }
        prevHp = b.health; prevBursts = burstNow; prevBeam = a._enoch?.stats?.beamHits || 0
        const free = !(b.hitstun > 0) && !!(b.onGround || b.grounded) && !(b._supFrozen > 0) && !b.knockdownState && !(b.hitstop > 0) && !(a._enoch?.ult)
        if (firstHit >= 0 && free) { gaps++; gapAt.push(frame) }
      }
      for (const st of steps) {
        let hold = st.hold || {}, n = 0
        const ready = () => st.cleanOf ? (a.currentAttack?.en?.key === st.cleanOf && !!a.currentAttack?.en?.clean) : st.wait === 'clean' ? !!(a.currentAttack?.en?.clean) : st.wait === 'hit' ? hits.length >= (st.hits || 1) : typeof st.wait === 'number' ? n >= st.wait : st.until ? st.until(a, b, H) : true
        while (!ready() && n < 120) { tick(hold); n++ }
        log.push({ step: st.label || JSON.stringify(st.btn || st.hold), waited: n, at: frame, attack: a.currentAttack?.name || null })
        for (const d of (st.dirs || '')) tick({ ...hold, ...D(d) })
        if (st.btn) tick({ ...hold, ...(st.dirs ? D(st.dirs[st.dirs.length - 1]) : {}), ...st.btn })
        if (st.after) for (let i = 0; i < st.after; i++) tick(hold)
      }
      for (let i = 0; i < maxFrames && (a.attacking || a._enoch?.ult); i++) tick({})
      for (let i = 0; i < 30; i++) tick({})
      // gaps counted only BETWEEN the first and last hit
      const realGaps = gapAt.filter(g => g > firstHit && g < lastHit).length
      const total = hits.reduce((t, h) => t + h.dmg, 0)
      return { name, hits, started, total: Math.round(total * 100) / 100, gaps: realGaps, log, variant: H.state().s.stats, thermal: H.state().s.th.v }
    }
  })
  const run = (name, setup, steps, want) => page.evaluate(([name, setup, steps]) => __combo(name, eval(setup), steps.map(s => ({ ...s, until: s.until ? eval(s.until) : undefined }))), [name, setup, steps])
    .then(r => { results[name] = r; const by = r.hits.map(h => h.by)
      ok(`${name}: ${want.join(' → ')} — every hit lands, no gap (${r.hits.length} hits, ${r.total} live)`, r.gaps === 0 && want.every(k => by.some(x => x.split('+').includes(k))), JSON.stringify({ hits: r.hits, gaps: r.gaps, log: r.log, total: r.total, started: r.started })); return r })

  // 1. Jab → Straight → Heavy → Ice Blast
  await run('C1', `(a,b,H)=>{a.x=1300;b.x=1300+a.w+18;a.facing=1;b.facing=-1;H.setThermal(0)}`, [
    { btn: { light: true }, label: 'Jab' }, { cleanOf: 'jab', btn: { light: true }, label: 'Straight' }, { cleanOf: 'straight', btn: { heavy: true }, label: 'Heavy (frost palm)' },
    { cleanOf: 'heavy', dirs: '236', btn: { special: true }, label: 'Ice Blast (↓↘→+S)' }], ['jab', 'straight', 'heavy', 'iceBlast'])
  // 2. Frost Floor → Heat Lens on the patch → burst → Straight → Heavy
  await run('C2', `(a,b,H)=>{a.x=1300;b.x=1300+a.w+70;a.facing=1;b.facing=-1;H.setThermal(0)}`, [
    { dirs: '252', btn: { special: true }, label: 'Frost Floor (↓↓+S)' }, { cleanOf: 'frostFloor', dirs: '656', btn: { special: true }, label: 'Heat Lens (→→+S) — FIRE on the ICE → burst' },
    { cleanOf: 'heatLens', btn: { light: true, right: true }, label: 'Straight (→+L)' }, { cleanOf: 'straight', btn: { heavy: true }, label: 'Heavy' }], ['frostFloor', 'heatLens', 'burst', 'straight', 'heavy'])
  // 3. Ice Glide past → Fire Glide → reaction → Steam Burst
  await run('C3', `(a,b,H)=>{a.x=1000;b.x=1400;a.facing=1;b.facing=-1;H.setThermal(0)}`, [
    { hold: { charge: true }, until: `(a,b)=>a.x > b.x + b.w + 40`, label: 'Ice Glide past (skates through)' },
    { hold: { charge: true, left: true }, until: `(a,b,H)=>H.state().s.glide?.dir===-1`, label: 'turn' },
    { hold: { charge: true }, btn: { heavy: true }, label: 'Fire Glide back over the ice (the trails react)' },
    { hold: { charge: true }, wait: 'hit', dirs: '236', btn: { special: true }, label: 'Steam Burst (↓↘→+S out of the glide)' }], ['burst', 'steamBurst'])
  // 4. Deep Freeze → Scorch Sweep → Tide Break
  await run('C4', `(a,b,H)=>{a.x=1300;b.x=1300+a.w+30;a.facing=1;b.facing=-1;H.setThermal(0)}`, [
    { dirs: '214', btn: { special: true }, label: 'Deep Freeze (↓↙←+S)' }, { cleanOf: 'deepFreeze', dirs: '214', btn: { heavy: true }, label: 'Scorch Sweep (↓↙←+H)' },
    { cleanOf: 'scorch', dirs: '656', btn: { heavy: true }, label: 'Tide Break (→→+H)' }], ['deepFreeze', 'scorch', 'tideBreak'])
  // 5. three patches → balance → Tide Break → Thermal Shock
  await run('C5', `(a,b,H)=>{a.x=1300;b.x=1300+a.w+60;a.facing=1;b.facing=-1;H.setThermal(0);H.lay({type:'ice',cx:b.x+b.w/2});H.lay({type:'fire',cx:b.x+b.w/2+330});H.lay({type:'water',cx:a.x-200})}`, [
    { dirs: '656', btn: { heavy: true }, label: 'Tide Break (→→+H)' }, { cleanOf: 'tideBreak', dirs: '236236', btn: { special: true }, label: 'Super (↓↘→↓↘→+S) = THERMAL SHOCK' }], ['tideBreak', 'super'], 400)
  ok('C5 is THERMAL SHOCK (balance), the meter locked for the super', (results.C5?.variant?.supers === 1), JSON.stringify(results.C5?.variant && { supers: results.C5.variant.supers, done: results.C5.variant.superDone }))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} catch (e) { fail++; console.log('  ❌ harness error', e.stack) }
finally {
  fs.mkdirSync('docs/enoch', { recursive: true }); fs.writeFileSync('docs/enoch/combo_results.json', JSON.stringify({ pass, fail, results }, null, 1) + '\n')
  console.log(`\n  ENOCH COMBOS: ${pass} passed, ${fail} failed`); await browser.close(); server.close(); process.exit(fail ? 1 : 0)
}
