// harness/ai_master.test.mjs — MASTER CPU (aiMaster.js over the Impossible AI).
//  (1) plumbing: "master" = Impossible + controller.master; label; both difficulty pickers list it; other difficulties
//      never run the layer.
//  (2) it plays: AI-vs-AI matches (Master vs Impossible) for several fighters — the layer decides every match (acts, or
//      learns that the Impossible AI's own play pays better there and defers), and across the sample it lands real
//      moves, punishes, and the engine accepts its presses (few "no fire").
//  (3) deterministic: the same seeded Master match twice → identical result.
//   node harness/ai_master.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true })
let pass = 0, fail = 0
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${c ? '' : d}`) }
const errs = []

async function page(p1, p2, seed = 11) {
  const pg = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  pg.on('pageerror', e => errs.push(e.message))
  await pg.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await pg.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=${seed}`)
  await pg.waitForFunction(() => window.__harness?.aiVsAi, null, { timeout: 120000 })
  await pg.evaluate(() => { window.__harness.boot()
    // drawing off (as tools/ai_scout does) — the sim never reads the pixels; keeps this test fast
    const P = CanvasRenderingContext2D.prototype, big = c => c && c.width >= 640 && c.height >= 360
    for (const fn of ['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'clearRect', 'restore', 'save', 'putImageData', 'clip']) { const o = P[fn]; if (typeof o === 'function') P[fn] = function (...a) { return big(this.canvas) ? undefined : o.apply(this, a) } } })
  return pg
}

// ── (1) plumbing ──
{
  const pg = await page('goku', 'goku')
  const r = await pg.evaluate(async () => {
    const ai = await import('./ai.js'), ui = await import('./ui.js'), sp = await import('./spectator.js')
    const c = ai.createAIController('master'), d = ai.createAIController('impossible'); ai.setAIDifficulty(d, 'master'); const e = ai.createAIController('master'); ai.setAIDifficulty(e, 'easy')
    const canvas = document.querySelector('canvas')
    return { c: [c.difficulty, c.master], d: [d.difficulty, d.master], e: [e.difficulty, e.master], label: ai.getAIDifficultyLabel('master'),
      base: [ai.baseAiDifficulty('master'), ai.baseAiDifficulty('adaptive')], vsPicker: ui.getAIDifficultyRects(canvas).map(x => x.id), spect: sp.SPECTATOR_DIFFICULTIES }
  })
  ck('"master" runs the Impossible AI with the Master layer on', r.c[0] === 'impossible' && r.c[1] === true && r.d[0] === 'impossible' && r.d[1] === true, JSON.stringify(r))
  ck('switching away from master turns the layer off', r.e[0] === 'easy' && r.e[1] === false, JSON.stringify(r.e))
  ck('label + base difficulty mapping', r.label === 'Master' && r.base[0] === 'impossible' && r.base[1] === 'adaptive', JSON.stringify(r))
  ck('VS difficulty picker and AI-vs-AI difficulties both offer MASTER', r.vsPicker.includes('master') && r.spect.includes('master'), JSON.stringify(r))
  const imp = await pg.evaluate(() => { const h = window.__harness; h.aiVsAi.start({ p1: 'goku', p2: 'goku', p1Diff: 'impossible', p2Diff: 'adaptive', matches: 1 }); h.aiVsAi.step(1500); return h.aiVsAi.masterStats() })
  ck('Impossible / Adaptive never run the Master layer', imp.p1 === null && imp.p2 === null, JSON.stringify(imp))
  await pg.close()
}

// ── (2) it plays ──
const FIGHTERS = ['goku', 'sasuke_adult', 'spd_red', 'luffy', 'ichigo']
const tot = { actions: 0, landed: 0, noFire: 0, punish: 0, antiAir: 0, combo: 0 }
for (const k of FIGHTERS) {
  const pg = await page(k, k)
  const r = await pg.evaluate(k => { const h = window.__harness; h.rng.forceSeed(11)
    const out = h.aiVsAi.runToCompletion({ p1: k, p2: k, p1Diff: 'master', p2Diff: 'impossible', matches: 1 }, 400000)
    return { finished: out.finished, stats: h.aiVsAi.masterStats().p1 } }, k)
  const s = r.stats || {}
  const acts = (s.punish | 0) + (s.antiAir | 0) + (s.combo | 0) + (s.poke | 0) + (s.zone | 0) + (s.grab | 0)
  for (const f of ['landed', 'noFire', 'punish', 'antiAir', 'combo']) tot[f] += s[f] | 0
  tot.actions += acts
  ck(`${k}: Master match finishes, the layer acts and judges its choices (${acts} moves, ${s.landed} landed; payoff ${JSON.stringify(s.net)})`, r.finished && acts >= 3 && s.net && 'defer' in s.net, JSON.stringify(r))
  await pg.close()
}
ck(`across the sample its moves land (${tot.landed} of ${tot.actions})`, tot.landed >= 30 && tot.landed >= tot.actions * 0.3, JSON.stringify(tot))
ck(`across the sample it punishes (${tot.punish}) and uses anti-airs or combos (${tot.antiAir} / ${tot.combo})`, tot.punish > 0 && tot.antiAir + tot.combo > 0, JSON.stringify(tot))
ck(`the engine accepts its presses (${tot.noFire} of ${tot.actions} refused ≤ 30%)`, tot.actions > 0 && tot.noFire <= tot.actions * 0.3, JSON.stringify(tot))

// ── (3) deterministic ──
const runOnce = async () => { const pg = await page('sasuke_adult', 'sasuke_adult', 23); const r = await pg.evaluate(() => { const h = window.__harness
  h.rng.forceSeed(23)   // the URL seed doesn't reach AI-vs-AI matches; Impossible vs Impossible only repeats with a forced seed too
  const out = h.aiVsAi.runToCompletion({ p1: 'sasuke_adult', p2: 'sasuke_adult', p1Diff: 'master', p2Diff: 'impossible', matches: 1 }, 400000)
  return JSON.stringify({ frames: out.frames, wins: out.summary?.wins, stats: h.aiVsAi.masterStats().p1, log: h.aiVsAi.masterLog().p1 }) }); await pg.close(); return r }
const a = await runOnce(), b = await runOnce()
ck('the same seeded Master match plays out identically twice', a === b, `${a.slice(0, 200)} ≠ ${b.slice(0, 200)}`)

ck('no page errors', !errs.length, [...new Set(errs)].slice(0, 3).join(' | '))
console.log(`\n  AI MASTER: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
