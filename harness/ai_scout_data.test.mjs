// harness/ai_scout_data.test.mjs — AI SCOUT data (aiScoutData.js, from tools/ai_scout/scout.mjs) is complete, sane, and
// still matches the engine. (1) shape: every playable fighter is scouted, every landing move has sane numbers, scripts
// decode. (2) spot re-check in the REAL game with normal drawing on (the scout tool skips drawing for speed): a sample
// of fighters' moves are performed again from their stored script at their stored distance vs the standard dummy, and
// must hit for the stored damage with the stored startup (±1 f). If a fighter's moves change, re-run the scout tool.
//   node harness/ai_scout_data.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { AI_SCOUT } from '../aiScoutData.js'
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
let pass = 0, fail = 0
const ck = (n, c, d = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${c ? '' : d}`) }
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })

// ── (1) shape ──
const F = AI_SCOUT.fighters, keys = Object.keys(F)
await page.goto(server.base + '/index.html?harness=1&p1=goku&p2=naruto&seed=7')
await page.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 60000 })
const roster = await page.evaluate(async () => { const m = await import('./characters.js'); const C = m.characters; const h = window.__harness
  const ks = h.academy?.roster ? h.academy.roster() : Object.keys(C).filter(k => !C[k].hidden); return ks.filter(k => C[k]) })
const missing = roster.filter(k => !F[k])
ck(`every playable fighter is scouted (${keys.length} in the data, ${roster.length} on the roster)`, !missing.length, missing.join(' '))
const noLand = keys.filter(k => !F[k].moves.some(m => m.damage > 0))
ck('every fighter has moves that land', !noLand.length, noLand.join(' '))
const bad = []
for (const k of keys) for (const m of F[k].moves) {
  if (!(m.damage > 0)) continue
  if (!(m.startup >= 0 && m.startup < 400)) bad.push(`${k}/${m.name} startup ${m.startup}`)
  if (!Array.isArray(m.reach) || m.reach[0] > m.reach[1]) bad.push(`${k}/${m.name} reach ${m.reach}`)
  if (!Array.isArray(m.script) || !m.script.every(([c, n]) => typeof c === 'string' && n > 0 && [...c].every(x => Object.values(AI_SCOUT.codes).includes(x)))) bad.push(`${k}/${m.name} script`)
}
ck('every landing move has a sane startup, reach and decodable script', !bad.length, bad.slice(0, 6).join(' | '))
const totalLand = keys.reduce((a, k) => a + F[k].moves.filter(m => m.damage > 0).length, 0)
ck(`a real arsenal was measured (${totalLand} landing moves)`, totalLand > 900)

// ── (2) spot re-check, drawing ON ──
const SAMPLE = ['goku', 'sasuke_adult', 'kevin_levin', 'ghostface', 'ben10', 'spd_red', 'buggy', 'gojo']
const DECODE = Object.fromEntries(Object.entries(AI_SCOUT.codes).map(([f, c]) => [c, f]))
for (const key of SAMPLE.filter(k => F[k])) {
  const p = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  p.on('pageerror', e => errs.push(e.message))
  if (process.env.NO_DRAW) await p.addInitScript(() => { window.__noDraw = true })
  await p.goto(server.base + `/index.html?harness=1&p1=${key}&p2=${key === AI_SCOUT.foe ? key : AI_SCOUT.foe}&seed=7`)
  await p.waitForFunction(() => window.__harness?.gojoShinjukuTest, null, { timeout: 120000 })
  const moves = F[key].moves.filter(m => m.damage > 0 && !m.dupOf && m.cat !== 'grab').slice(0, 4)
  const got = await p.evaluate(({ moves, DECODE }) => {
    const h = window.__harness; h.boot(); h.setInputType?.(1, 'keyboard')
    if (window.__noDraw) { const P = CanvasRenderingContext2D.prototype, big = c => c && c.width >= 640 && c.height >= 360
      for (const fn of ['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'clearRect', 'restore', 'save', 'putImageData', 'clip']) { const o = P[fn]; P[fn] = function (...a) { return big(this.canvas) ? undefined : o.apply(this, a) } } }
    const ctl = h.controls().p1, held = {}
    const key = (k, d) => { if (!k || !!held[k] === !!d) return; held[k] = !!d; document.dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', { key: k, bubbles: true })) }
    const apply = codes => { const want = {}; for (const [c, f] of Object.entries(DECODE)) if (ctl[f]) want[ctl[f]] = want[ctl[f]] || codes.includes(c); for (const k of Object.keys(want)) key(k, want[k]) }
    const step = () => h.luffyTest.step(1)
    const P1 = () => h.gojoShinjukuTest.raw('p1'), P2 = () => h.gojoShinjukuTest.raw('p2')
    const out = []
    for (const m of moves) {
      apply(''); h.setDummyBehavior('stand'); key('f2', true); step(); step(); key('f2', false)
      // same settle as the scout tool: combo over, dummy free + grounded, attacker free + grounded
      const free2 = b => !(b.hitstun > 0 || b.blockstun > 0 || b.stun > 0 || b.knockdownState || b.isLaunched || b.hitstop > 0 || b.isGrabbed) && b.grounded !== false
      const free1 = a => !(a.attacking || a.currentAttack || a.attackCooldown > 0 || a.hitstop > 0 || a.hitstun > 0 || a.blockstun > 0 || a.isGrabbing) && a.grounded !== false
      const combo = () => { try { return h.beastAssistState('p1')?.combo || 0 } catch (_) { return 0 } }
      for (let i = 0; i < 150; i++) { if (combo() === 0 && free2(P2()) && free1(P1())) break; step() }
      h.setP1X(P2().x - (P1().w || 48) - m.reach[0]); step(); step(); step()
      let t = 0, hp = null, first = null, min = null
      for (const [c, n] of m.script) for (let i = 0; i < n; i++) { apply(c); step(); t++; const B = P2(); if (t >= m.at[0]) { if (hp == null) hp = min = B.health; if (B.health < min - 0.01) { if (first == null) first = t; min = B.health } } }
      apply('')
      for (let i = 0; i < 200; i++) { step(); t++; const B = P2(); if (hp == null) hp = min = B.health; if (B.health < min - 0.01) { if (first == null) first = t; min = B.health } }
      out.push({ name: m.name, damage: Math.round((hp - min) * 10) / 10, startup: first != null ? first - m.at[0] : null })
    }
    return out
  }, { moves, DECODE })
  for (let i = 0; i < moves.length; i++) {
    const m = moves[i], g = got[i]
    ck(`${key}: ${m.name} still hits like the data (startup ${m.startup}, damage ${m.damage})`, g.startup != null && Math.abs(g.startup - m.startup) <= 1 && Math.abs(g.damage - m.damage) <= Math.max(1, m.damage * 0.02), JSON.stringify(g))
  }
  await p.close()
}
ck('no page errors', !errs.length, [...new Set(errs)].slice(0, 3).join(' | '))
console.log(`\n  AI SCOUT DATA: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
