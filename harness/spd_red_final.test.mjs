// harness/spd_red_final.test.mjs — S.P.D. Red Ranger + Ranger framework FINAL CHECKS (brief Phase 12).
//   node harness/spd_red_final.test.mjs
// Static: START_COMMIT, no Math.random / gameRng in the Ranger code, real frame counts, labels never cut, the ledger
// covers every shipped asset, the framework doc names only real exports. Browser (the REAL game, frames stepped by
// hand): chroma key 100% (zero key-colour pixels in every shipped PNG), a DUMMY second Ranger profile teleports
// in-game with no new code, Ranger-vs-Ranger Judgment is INNOCENT in-game, the containment card absorbs exactly 50%,
// and a seeded match with charges spent + a containment active reproduces bit-identically (and a different seed
// diverges through the hash). The full in-game render suite is harness/spd_red_render_check.mjs 12.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8')
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }
const section = t => console.log(`\n── ${t} ──`)

// ── static ──
section('static')
const START = 'b75e05408f8f66f0429f63e6e646afe807e63d29'
const sc = fs.existsSync(path.join(ROOT, 'docs/spd_red/START_COMMIT.txt')) ? rd('docs/spd_red/START_COMMIT.txt').trim() : ''
check('docs/spd_red/START_COMMIT.txt exists (the undo point)', sc.startsWith(START), sc)
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
const CODE = ['rangers.js', 'spdRed.js', 'spdRedState.js', 'spdRedData.js', 'spdRedFx.js', 'spdRedSound.js', 'spdRedSprites.js', 'spdRedHarness.js']
const rnd = CODE.filter(f => /Math\.random|gameRng/.test(strip(rd(f))))
check('no Math.random / gameRng in any Ranger / S.P.D. Red module', rnd.length === 0, rnd.join(','))
const FJ = JSON.parse(rd('docs/spd_red/frames.json'))
check('real frame counts per row: 2 8 1 2 1 5 4 3 2 3 2 1 6 3 1 3 2 3', FJ.counts.join(' ') === '2 8 1 2 1 5 4 3 2 3 2 1 6 3 1 3 2 3', FJ.counts.join(' '))
const nFrames = Object.keys(FJ.frames).length
check('frames.json lists every frame (sum of counts = 52)', nFrames === FJ.counts.reduce((a, b) => a + b, 0) && nFrames === 52, nFrames)
const hit = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]
const labelBoxes = Object.values(FJ.labels).flatMap(l => l.boxes)
const cut = Object.entries(FJ.frames).filter(([, f]) => f.box[0] < 47 || labelBoxes.some(b => hit(b, f.box)))
check(`labels never cut into a sprite (${labelBoxes.length} label boxes vs ${nFrames} frame boxes; every frame x0 ≥ 47)`, labelBoxes.length >= 5 && cut.length === 0, cut.map(c => c[0]).join(','))
check('R11 label read as "A , B"', FJ.labels.R11?.text === 'A , B', FJ.labels.R11?.text)
check('poster credit band excluded (outside every frame box)', !Object.values(FJ.frames).some(f => hit(FJ.creditBand, f.box)))
const ledger = rd('docs/spd_red/SPRITE_LEDGER.md')
const assets = fs.readdirSync(path.join(ROOT, 'assets/spd_red')).filter(f => f.endsWith('.png'))
const ledgerMissFrames = Object.keys(FJ.frames).filter(k => !ledger.includes(`| ${k} |`))
const ledgerMissAssets = assets.filter(a => !ledger.includes(a.replace('.png', '')))
check(`ledger complete: all ${nFrames} frames have a row`, ledgerMissFrames.length === 0, ledgerMissFrames.join(','))
check(`ledger complete: all ${assets.length} shipped PNGs are named`, ledgerMissAssets.length === 0, ledgerMissAssets.join(','))
check('ledger records the source sheet hash', ledger.includes(FJ.sha256))
// the framework doc names only real exports
const R = rd('rangers.js'), exp = new Set([...R.matchAll(/export (?:function|const) (\w+)/g)].map(m => m[1]))
const doc = rd('docs/rangers/RANGER_FRAMEWORK.md')
const named = [...new Set([...doc.matchAll(/`([a-zA-Z]\w+)\(/g)].map(m => m[1]))]
const RANGER_FNS = named.filter(n => /anger|link|udgment|adge|orph|Ranger|verdict/i.test(n) && !/^(tickSpdRed|spdRed\w*|readRawControls|updateFacing)$/.test(n))
const ghost = RANGER_FNS.filter(n => !exp.has(n))
check(`framework doc: every rangers.js function it names exists (${RANGER_FNS.length})`, RANGER_FNS.length >= 10 && ghost.length === 0, ghost.join(','))
const fields = ['distPct', 'startup', 'travel', 'recovery', 'charges', 'recharge', 'crossup', 'air', 'vertical', 'tapWindow', 'gap', 'faceLockOnCross', 'airMomentumMax', 'meterMax', 'perHit', 'freeze', 'oncePerRound', 'rangerAlwaysInnocent']
const B0 = await import(path.join(ROOT, 'rangers.js'))
const missingDefaults = fields.filter(k => !(k in B0.BLINK_DEFAULTS) && !(k in B0.JUDGMENT_DEFAULTS))
check('framework doc: every profile field it documents is a real default', missingDefaults.length === 0 && fields.every(f => doc.includes(f)), missingDefaults.join(','))
check('framework doc: documents the profile-only Ranger hook (tickSpdRed hosts tickRanger)', /profile-only/i.test(doc) && doc.includes('spd_red_final.test.mjs'))

// ── browser ──
const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
async function boot(p1, p2, seed = null) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${server.base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest, null, { timeout: 30000 })
  await page.evaluate(s => { if (s != null) __harness.rng.forceSeed(s); __harness.start(); __harness.skipToBattle() }, seed)
  await page.evaluate(() => __harness.luffyTest.step(2))
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { timeout: 30000 })
  for (let i = 0; i < 6; i++) { await page.evaluate(() => __harness.luffyTest.step(5)); await new Promise(r => setTimeout(r, 250)) }
  const step = n => page.evaluate(n => __harness.luffyTest.step(n), n)
  const tap = async (keys, frames = 1) => { for (const k of keys) await page.keyboard.down(k); await step(frames); for (const k of keys) await page.keyboard.up(k) }
  const dtap = async (k, gap = 3) => { await tap([k]); await step(gap); await tap([k]) }
  return { page, errors, step, tap, dtap }
}

try {
  // 1. chroma key at 100%: no opaque pixel of either key colour survives in ANY shipped PNG
  section('chroma key (all shipped PNGs)')
  {
    const { page, errors } = await boot('spd_red', 'zoro')
    const res = await page.evaluate(async ([files, keys]) => {
      const out = []
      for (const f of files) {
        const img = new Image(); img.src = `./assets/spd_red/${f}`; await img.decode()
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
        const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data
        let key = 0, opaque = 0
        for (let i = 0; i < d.length; i += 4) { if (d[i + 3] === 0) continue; opaque++; if (keys.some(k => d[i] === k[0] && d[i + 1] === k[1] && d[i + 2] === k[2])) key++ }
        out.push([f, key, opaque])
      }
      return out
    }, [assets, FJ.chroma.keys])
    const dirty = res.filter(r => r[1] > 0), empty = res.filter(r => r[2] === 0)
    check(`chroma key 100%: 0 key-colour pixels left in all ${res.length} PNGs`, res.length === assets.length && dirty.length === 0, dirty.map(r => `${r[0]}:${r[1]}`).join(','))
    check('every PNG still has opaque art', empty.length === 0, empty.map(r => r[0]).join(','))
    check('ledger idle/run suit retention 100.0% (from the extractor)', Object.values(FJ.chroma.idleRun).every(v => v.pct === 100 && v.key_left === 0))
    check('no page errors', errors.length === 0, errors[0] || '')
    await page.close()
  }

  // 2. a DUMMY second Ranger: register a profile at runtime for an existing Ranger (MMPR Red) — NO new code — and it
  //    blinks in the live game (double-tap on sim frames, its own charge count, invulnerable travel, no crossup).
  section('dummy second Ranger (profile only, in-game)')
  {
    const { page, errors, step, dtap } = await boot('red_ranger_mmpr', 'zoro')
    await page.evaluate(async () => {
      const m = await import('./rangers.js')
      m.registerRangerProfile('red_ranger_mmpr', { team: 'TEST', badge: { color: '#2266ff' }, blink: { charges: 3, recharge: 60, crossup: false, distPct: 0.18 } })
      const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2')
      a.x = 500; z.x = 1300; a.facing = 1; z.facing = -1
    })
    await step(4)
    await dtap('d', 3)
    const seen = { blink: false, invuln: false, alpha0: false }
    let x0 = null
    for (let i = 0; i < 14; i++) {
      const s = await page.evaluate(async () => { const fx = await import('./spdRedFx.js'); const a = __harness.spdRedTest.raw('p1'); return { x: a.x, b: a._ranger?.blink?.phase || null, inv: a.invulnTimer || 0, alpha: fx.spdRedBodyAlpha(a), ch: a._ranger?.charges, bx: a._ranger?.blink?.x0 } })
      if (s.b && x0 == null) x0 = s.bx ?? s.x
      await step(1)
      if (s.b) seen.blink = true
      if (s.b === 'travel') { if (s.inv > 0 || s.alpha === 0) seen.invuln = s.inv > 0; if (s.alpha === 0) seen.alpha0 = true }
    }
    const st = await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'); return { x: a.x, ch: a._ranger?.charges, noDash: a.noDash, key: a.rosterKey } })
    check('dummy Ranger (red_ranger_mmpr + a runtime profile) blinks on a double-tap', seen.blink, JSON.stringify(seen))
    check('dummy: its OWN profile values (3 charges → 2 after one blink)', st.ch === 2, st.ch)
    check('dummy: travels its own distPct (0.18 × 1280 ≈ 230 px)', Math.abs((st.x - x0) - 0.18 * 1280) < 12, (st.x - x0).toFixed(1))
    check('dummy: body vanishes during travel (render alpha 0)', seen.alpha0)
    check('dummy: engine dash handed to the framework (noDash)', st.noDash === true)
    // crossup:false → stops in front of the foe
    await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); a.x = 700; z.x = 820; a.facing = 1; z.facing = -1 })
    await step(30); await dtap('d', 3); await step(14)
    const cx = await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); return { a: a.x, z: z.x } })
    check('dummy: crossup:false stops in FRONT of the foe', cx.a < cx.z, JSON.stringify(cx))
    check('no page errors', errors.length === 0, errors[0] || '')
    await page.close()
  }

  // 3. Ranger vs Ranger in-game: S.P.D. Red judging MMPR Red at 10% HP → INNOCENT; the card absorbs exactly 50%
  section('Judgment: Ranger vs Ranger (in-game) + 50% absorb')
  {
    const { page, errors, step } = await boot('spd_red', 'red_ranger_mmpr')
    await page.evaluate(() => { __harness.spdRedTest.reset(); const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); a.x = 600; z.x = 740; a.facing = 1; z.facing = -1; z.health = Math.floor(z.maxHealth * 0.10); a.energy = 10 })
    await page.evaluate(() => __harness.spdRedTest.judg('p1', { meter: 20 }))
    for (const k of ['j', 'k', 'l']) await page.keyboard.down(k); await step(1); for (const k of ['j', 'k', 'l']) await page.keyboard.up(k)
    let v = null; for (let i = 0; i < 40 && !v; i++) { await step(1); v = await page.evaluate(() => __harness.spdRedTest.raw('p1')._ranger?.judg?.verdict || null) }
    check('Ranger foe at 10% HP → INNOCENT (in-game, MMPR Red)', v === 'innocent', v)
    const abs = await page.evaluate(async () => { const m = await import('./rangers.js'); return m.getRangerProfile('spd_red').judgment.guilty.absorb })
    check('containment absorb is 50%', abs === 0.5, abs)
    check('no page errors', errors.length === 0, errors[0] || '')
    await page.close()
  }

  // 4. DETERMINISM: same seed + same frame-stepped input → bit-identical per-frame state, with both teleport charges
  //    spent, Rapid Fire (hash spread) and a GUILTY containment active. A different seed diverges.
  section('determinism (charges spent + containment active)')
  async function trace(seed) {
    const { page, errors, step, tap, dtap } = await boot('spd_red', 'zoro', seed)
    await page.evaluate(() => { __harness.spdRedTest.reset(); const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); a.x = 500; z.x = 1000; a.facing = 1; z.facing = -1; a.energy = 100 })
    await page.evaluate(async () => { const m = await import('./abilities.js'); window.__srProj = () => m.activeProjectiles })
    const H = await page.evaluate(() => {
      window.__srTrace = { h: 2166136261 >>> 0, frames: 0, spent: 0, contain: 0, bolts: [] }
      const T = window.__srTrace, orig = __harness.luffyTest.step
      const mix = s => { for (let i = 0; i < s.length; i++) { T.h ^= s.charCodeAt(i); T.h = Math.imul(T.h, 16777619) >>> 0 } }
      __harness.luffyTest.step = n => { for (let i = 0; i < n; i++) { orig(1)
        const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'), r = v => Math.round((v || 0) * 1e4) / 1e4
        for (const f of [a, z]) mix(JSON.stringify([r(f.x), r(f.y), f.health, r(f.energy), f._spdRed || null, f._ranger || null, f.currentAttack?.name || null]))
        for (const p of window.__srProj()) if (p.owner === a && !p.__srSeen) { p.__srSeen = 1; T.bolts.push(Math.round((p.vy || 0) * 1e4)) }
        T.frames++; if (a._ranger?.charges === 0) T.spent++; if (a._ranger?.judg?.contain > 0) T.contain++ } }
      return true
    })
    await dtap('d', 3); await step(16); await dtap('a', 3); await step(16)               // both charges spent
    await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); a.x = 300; z.x = 1200; a.facing = 1; z.facing = -1; a.vx = 0 })   // room for bolts in flight
    await step(2); await page.keyboard.down('l'); await step(30); await page.keyboard.up('l'); await step(30)   // Blaster → Rapid Fire (hash spread)
    await step(40)
    await page.evaluate(() => { const a = __harness.spdRedTest.raw('p1'), z = __harness.spdRedTest.raw('p2'); z.x = a.x + 140 * (a.facing || 1); z.health = Math.floor(z.maxHealth * 0.25); z.hitstun = 0 })
    await page.evaluate(() => __harness.spdRedTest.judg('p1', { meter: 20 }))
    for (const k of ['j', 'k', 'l']) await page.keyboard.down(k); await step(1); for (const k of ['j', 'k', 'l']) await page.keyboard.up(k)
    await step(60); await tap(['j']); await step(40)                                         // GUILTY → containment active, a jab on the card
    const T = await page.evaluate(() => window.__srTrace)
    const err = errors.slice(); await page.close()
    return { ...T, err }
  }
  const t1 = await trace(9191), t2 = await trace(9191), t3 = await trace(4242)
  check('trace exercised: both teleport charges spent (frames at 0 charges)', t1.spent > 0, t1.spent)
  check('trace exercised: a GUILTY containment was active', t1.contain > 0, t1.contain)
  check('trace exercised: Rapid Fire bolts in flight (hash spread)', t1.bolts.length >= 2, JSON.stringify(t1.bolts))
  check(`same seed → bit-identical per-frame state over ${t1.frames} frames`, t1.frames === t2.frames && t1.h === t2.h && JSON.stringify(t1.bolts) === JSON.stringify(t2.bolts), `${t1.h.toString(16)} vs ${t2.h.toString(16)}`)
  check('different seed → Rapid Fire spread differs (hash of match seed)', JSON.stringify(t1.bolts) !== JSON.stringify(t3.bolts), `${JSON.stringify(t1.bolts)} vs ${JSON.stringify(t3.bolts)}`)
  check('no page errors in the traces', [t1, t2, t3].every(t => t.err.length === 0), [t1, t2, t3].flatMap(t => t.err)[0] || '')
} catch (e) {
  check('final checks ran to completion', false, e.stack || e.message)
} finally {
  await browser.close(); server.close?.()
}
console.log(`\n════════════════════════════════════════\n  S.P.D. RED FINAL CHECKS: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`)
process.exit(FAIL ? 1 : 0)
