// harness/zoro_final.test.mjs — Roronoa Zoro phase 10 final checks.
//   1. Ledger complete: every source frame is used, the ripper credit is the ONLY exclusion, every animation frame
//      traces to an extracted source frame.
//   2. All gameplay state is GAME_STATE + deterministic: a forced-seed CPU-vs-CPU Zoro match reproduces bit-
//      identically (positions, HP, Spirit, the whole fighter._zoro state, his live attack and projectiles);
//      a different seed diverges. No Math.random / gameRng in the kit.
//   node harness/zoro_final.test.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'
import { serve, ROOT } from './ben10_test_utils.mjs'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }

console.log('\n── 1. sprite ledger ──')
const frames = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/zoro/frames.json'), 'utf8'))
const ledger = fs.readFileSync(path.join(ROOT, 'docs/zoro/SPRITE_LEDGER.md'), 'utf8')
const ids = Object.keys(frames.frames)
check('36 source frames extracted (R1 6 · R2 2 · R3 5 · R4 5 · R5 3 · R6 4 · R7 4 · R8 4 · R9 3)', ids.length === 36, ids.length)
const unused = ids.filter(id => !frames.frames[id].uses.length)
check('every frame is used by at least one animation / asset', unused.length === 0, unused.join(','))
check('the ONLY exclusion is the ripper credit text', JSON.stringify(Object.keys(frames.excluded)) === '["credit_text"]')
check('SPRITE_LEDGER.md lists every frame id', ids.every(id => ledger.includes(id)), ids.filter(id => !ledger.includes(id)).join(','))
check('ledger records the credit as "excluded, credit"', /excluded, credit/.test(ledger) && fs.existsSync(path.join(ROOT, 'docs/zoro/CREDITS.md')))
check('derived copies are ledgered as "derived copy"', /derived copy/i.test(ledger) && /Derived copies/.test(ledger))
const { ZORO_ANIM, ZORO_FX } = await import('../zoroSprites.js')
const sheets = [...Object.values(ZORO_ANIM).map(a => a.sheet), ...Object.values(ZORO_FX).map(f => f.sheet)]
check('every animation / FX sheet exists on disk', sheets.every(s => fs.existsSync(path.join(ROOT, s))), sheets.filter(s => !fs.existsSync(path.join(ROOT, s))).join(','))
check('docs/zoro/START_COMMIT.txt records the undo point', /e67ba2a8f2662ab629f9b5fcb85bb85301a6dfd8/.test(fs.readFileSync(path.join(ROOT, 'docs/zoro/START_COMMIT.txt'), 'utf8')))

console.log('\n── 2. GAME_STATE + determinism ──')
const strip = s => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
const kit = fs.readdirSync(ROOT).filter(f => /^zoro.*\.js$/.test(f))
check(`no Math.random / gameRng in the kit (${kit.length} zoro*.js)`, kit.every(f => !/Math\.random|gameRng/.test(strip(fs.readFileSync(path.join(ROOT, f), 'utf8')))))
const st = strip(fs.readFileSync(path.join(ROOT, 'zoroState.js'), 'utf8'))
check('zoro state lives on the fighter as plain JSON (fighter._zoro)', /f\._zoro \|\|= \{/.test(st))

const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
try {
  await page.goto(server.base + '/index.html?harness=1&p1=zoro&p2=luffy', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.aiVsAi && !!window.__harness?.zoroTest)
  const run = (seed, n) => page.evaluate(([s, n]) => {
    window.__harness.rng.forceSeed(s)
    window.__harness.aiVsAi.start({ p1: 'zoro', p2: 'luffy', matches: 1, speed: 1 })
    const moves = new Set()
    for (let i = 0; i < n; i += 10) { window.__harness.aiVsAi.step(10); const m = __harness.zoroTest.raw('p1').currentMove; if (m) moves.add(m) }
    const f = __harness.zoroTest.raw('p1'), o = __harness.zoroTest.raw('p2'), r4 = v => Math.round((v || 0) * 1e4) / 1e4
    return { moves: [...moves], snap: JSON.stringify({ z: [r4(f.x), r4(f.y), f.health, r4(f.energy), f._zoro, f.currentAttack, __harness.zoroTest.state('p1').projectiles], o: [r4(o.x), r4(o.y), o.health, r4(o.energy)] }) }
  }, [seed, n])
  const a = await run(9191, 1500), b = await run(9191, 1500), c = await run(5150, 1500)
  check('CPU Zoro actually plays his kit in the run', a.moves.length >= 3, a.moves.join(','))
  check('same seed → bit-identical Zoro state (incl. fighter._zoro, live attack, projectiles) after 1500 frames', a.snap === b.snap, a.snap === b.snap ? '' : 'diverged')
  check('different seed → diverges', a.snap !== c.snap)
} catch (e) { check('determinism run completed', false, e.message.split('\n')[0]) }
finally { check('no page errors', errors.length === 0, errors[0] || ''); await browser.close(); server.close() }
console.log(`\nZORO FINAL: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
