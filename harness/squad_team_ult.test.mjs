// squad_team_ult.test.mjs — the Ranger squads' TEAM ULTIMATES (squadUlt.js / squadUltFx.js): W + U together on a full meter.
//   S.P.D. Rangers → "S.P.D. JUDGMENT VOLLEY"   Mighty Morphin Rangers → "MORPHIN GRID: FIVE-POINT STAR"
// Run: node harness/squad_team_ult.test.mjs   (OUT=dir saves one frame per beat)
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0
const ck = (name, cond, info = '') => { if (cond) { pass++; console.log('PASS', name) } else { fail++; console.log('FAIL', name, info) } }

// ── A. static ──
const U = await import('../squadUlt.js')
ck('A. budget: S.P.D. 18 shots × 10 + 220 = 400 raw, MMPR 5 × 40 + 200 = 400 raw (Dino Z-Rex parity)', 18 * U.SPD_VOLLEY.shotRaw + U.SPD_VOLLEY.finalRaw === 400 && 5 * U.MMPR_STAR.relayRaw + U.MMPR_STAR.boltRaw === 400)
ck('A. full meter (100)', U.TEAM_ULT_COST === 100)
ck('A. S.P.D. shot poses exist on every form', (await import('../characters.js').then(m => Object.entries(U.SPD_SHOT).every(([k, a]) => m.characters[k]?.animationData?.[a]))))
for (const f of ['squadUlt.js', 'squadUltFx.js']) ck(`A. no Math.random / wall clock in ${f}`, !/Math\.random|performance\.now|Date\.now/.test(readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\/\/.*$/gm, '')))

// ── B. live ──
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []
const open = async (sq, skin = 'default') => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => window.requestAnimationFrame = () => 0)
  await page.goto(`${server.base}/index.html?harness=1&p1=${sq}&p2=naruto&seed=5`); await page.waitForFunction(() => window.__harness?.spdSquad, null, { timeout: 60000 })
  await page.evaluate(s => { __harness.bootSkin(s, 'default'); __harness.setDummyBehavior?.('stand') }, skin); await step(page, 20); return page
}
const step = (p, n) => p.evaluate(n => __harness.luffyTest.step(n), n)
const st = p => p.evaluate(async () => { const m = await import('/squadUlt.js'); const a = __harness.gojoShinjukuTest.raw('p1'), b = __harness.gojoShinjukuTest.raw('p2')
  return { ...m.getSquadUltStatus(), e: Math.round(a.energy || 0), hp2: Math.round(b.health), form: a.rosterKey, alpha: a._fxAlpha ?? null, atk: a.currentAttack?.name || null, ult: !!(a.currentAttack?.isUltimate || a.currentAttack?.category === 'ultimate'), y: Math.round(a.y), vy: a.vy, knock: !!b.knockdownState, teamUlts: __harness.spdSquad.state('p1')?.teamUlts } })
const meter = (p, v = 100) => p.evaluate(v => { __harness.gojoShinjukuTest.raw('p1').energy = v }, v)
const wu = async p => { await p.keyboard.down('w'); await p.keyboard.down('u'); await step(p, 1); await p.keyboard.up('w'); await p.keyboard.up('u'); await step(p, 1) }
try {
  for (const [sq, name, S] of [['spd_rangers', 'S.P.D. Judgment Volley', U.SPD_VOLLEY], ['mmpr_rangers', 'Five-Point Star', U.MMPR_STAR]]) {
    let p = await open(sq); await meter(p); await step(p, 2)
    const h0 = (await st(p)).hp2
    await wu(p); let s = await st(p)
    ck(`B. ${name}: W + U on a full meter starts it`, s.active && s.id === sq, JSON.stringify(s))
    ck(`B. ${name}: costs the full meter`, s.e <= 1, String(s.e))
    ck(`B. ${name}: the regular ultimate did not also fire`, !s.ult, JSON.stringify(s))
    ck(`B. ${name}: no jump taken from the W press`, s.y >= 300 && !(s.vy < -1), JSON.stringify(s))
    ck(`B. ${name}: the caster's own sprite hides (every Ranger is drawn by the scene)`, s.alpha === 0)
    const frames = []
    for (const b of [40, 100, 150, 200, 230, 260]) { await step(p, b - (frames.at(-1) || 2)); frames.push(b); if (process.env.OUT) await p.screenshot({ path: `${process.env.OUT}/${sq}_ult_${b}.png` }) }
    await step(p, S.total + 10 - 260); s = await st(p)
    ck(`B. ${name}: ends, the caster's sprite returns, the foe is knocked down`, !s.active && s.alpha === null && s.knock, JSON.stringify(s))
    const dmg = h0 - s.hp2
    ck(`B. ${name}: lands a team ultimate's damage (300–520 on Naruto)`, dmg >= 300 && dmg <= 520, String(dmg))
    ck(`B. ${name}: counted`, s.teamUlts === 1, String(s.teamUlts))
    await p.close()
    // determinism
    const run = async () => { const q = await open(sq); await meter(q); await step(q, 2); await wu(q); await step(q, 120); const r = await st(q); await step(q, 200); const r2 = await st(q); await q.close(); return JSON.stringify([r, r2]) }
    ck(`B. ${name}: deterministic (two identical runs)`, await run() === await run())
    // half meter: nothing, and no regular ult either (not enough meter)
    p = await open(sq); await meter(p, 40); await step(p, 2); await wu(p); s = await st(p)
    ck(`B. ${name}: refused without a full meter`, !s.active && s.e === 40, JSON.stringify(s))
    await p.close()
    // U alone: the active Ranger's own ultimate (unchanged)
    p = await open(sq); await meter(p); await step(p, 2); await p.keyboard.down('u'); await step(p, 2); await p.keyboard.up('u'); await step(p, 2); s = await st(p)
    ck(`B. ${name}: U alone still fires the Ranger's own ultimate`, !s.active && s.e < 100, JSON.stringify(s))
    await p.close()
  }
  // a squad theme carries into the scene (the generated Heatblast sheets are requested)
  { const p = await open('mmpr_rangers', 'mmpr_rangers_squad_heatblast'); await meter(p); await step(p, 2); await wu(p); await step(p, 120)
    const used = await p.evaluate(async () => { const { SQUADS } = await import('/squadCore.js'); const sq = SQUADS.mmpr_rangers, sk = __harness.gojoShinjukuTest.raw('p1').skinId
      return sq.forms.map(f => sq.skinAnim(sk, f)?.idle?.sheet || '') })
    ck('B. a squad theme (Heatblast) is worn by every Ranger in the scene', used.every(x => /heatblast/i.test(x)), used.join(' ')); await p.close() }
  // the CPU uses it
  for (const sq of ['spd_rangers', 'mmpr_rangers']) {
    const p = await browser.newPage(); p.on('pageerror', e => errors.push(e.message))
    await p.goto(`${server.base}/index.html?harness=1&p1=${sq}&p2=naruto&seed=9`); await p.waitForFunction(() => window.__harness?.aiVsAi, null, { timeout: 60000 })
    // count successful starts across two matches (the AI-vs-AI runner's pacing varies a little with machine load)
    const n = await p.evaluate(async sq => { const core = await import('/squadCore.js'), U = await import('/squadUlt.js'); let n = 0
      core.setTeamUlt({ cost: U.TEAM_ULT_COST, clear: U.clearSquadUlt, active: U.isSquadUltActive, start: (f, W, o) => { const ok = U.startSquadUlt(f, W, o); if (ok && f._squad?.id === sq) n++; return ok } })
      window.requestAnimationFrame = () => 0; __harness.aiVsAi.runToCompletion({ p1: sq, p2: 'naruto', p1Diff: 'adaptive', p2Diff: 'adaptive', matches: 2, speed: 8 }, 900000); return n }, sq)
    ck(`B. CPU ${sq} uses the team ultimate (≥ 1 over two matches)`, n >= 1, String(n)); await p.close()
  }
} finally { await browser.close(); server.close?.() }
ck('B. no page errors', !errors.length, errors.slice(0, 3).join(' | '))
console.log(`${pass} passed / ${fail} failed`); process.exit(fail ? 1 : 0)
