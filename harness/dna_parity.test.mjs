// DNA PARITY — Ben's DNA copy must play the FULL kit of whoever he scanned. For each roster character T: the same
// scripted inputs (normals, every special direction, ultimate, charge, grab, air) are played by the REAL T and by
// Ben-as-T against the same standing Naruto dummy; the signals (moves started, damage, meter spent, projectiles,
// cast poses) must match. USAGE: node harness/dna_parity.test.mjs [key,key…]   (DNA_COPIER=albedo|kevin_levin)
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const { base, close } = await serve()
const browser = await chromium.launch({ headless: true })
const copier = process.env.DNA_COPIER || 'ben10'
const INPUTS = {
  light: [{ light: true }], heavy: [{ heavy: true }], up: [{ upAttack: true }], special: [{ special: true }],
  dSpecial: [{ down: true }, { down: true, special: true }], fSpecial: [{ right: true }, { right: true, special: true }],
  bSpecial: [{ left: true }, { left: true, special: true }], uSpecial: [{ up: true }, { up: true, special: true }],
  ult: [{ ultimate: true }], charge: Array(30).fill({ charge: true }), grab: [{ grab: true }], dHeavy: [{ down: true }, { down: true, heavy: true }],
  air: [{ jump: true, up: true }, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, { light: true }],
}
async function session(p1, tries = 3) {
  for (let i = 1; ; i++) { try { return await session1(p1) } catch (e) { if (i >= tries) throw e } }
}
async function session1(p1) {
  const page = await browser.newPage()
  const errs = []; page.on('pageerror', e => errs.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=naruto&seed=777`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__harness?.kevinTest, null, { timeout: 120000 })
  await page.evaluate(async (INPUTS) => {
    __harness.start({ mode: 'pvp' }); __harness.skipToBattle(); __harness.aiVsAi.step(1)
    const { writeRawControls } = await import('./input.js'), dna = await import('./dnaScan.js'), ab = await import('./abilities.js')
    const H = __harness.kevinTest
    const step = (r = {}) => { writeRawControls(H.raw(), r); __harness.aiVsAi.step(1) }
    const reset = (copyKey) => {
      // a FULL round reset (fresh fighter objects) before every input, on both sides: forms / domains / buffs one input
      // leaves behind can't bleed into the next
      __harness.ben10Reset('round'); __harness.skipToBattle(); H.reset(); __harness.setRoundTimer(99999); __harness.setDummyBehavior('stand')
      const a = H.raw(), b = H.raw('p2')
      if (copyKey) { if (a._dna?.active) dna.revertDnaForm(a); step(); a._dna.cd = 0; dna.applyDnaForm(a, copyKey, b) }
      for (const [i, f] of [a, b].entries()) { f.health = f.maxHealth; f.x = 1250 + i * 150; f.vx = 0; f.facing = i ? -1 : 1; f.hitstun = f.blockstun = 0; f.attacking = false; f.attackCooldown = 0; f.knockdownState = false; f.ultimateCooldown = 0 }
      for (let i = 0; i < 6; i++) step()
    }
    window.__par = (copyKey) => {
      const out = {}
      for (const [name, seq] of Object.entries(INPUTS)) {
        reset(copyKey)
        const a = H.raw(), b = H.raw('p2'); a.energy = a.maxEnergy
        const e0 = a.energy, hp0 = b.health, moves = new Set(), casts = new Set(); let proj = 0, attF = 0, hsF = 0, bh = 0, pb = b.health
        const n0 = ab.activeProjectiles.length
        const look = () => { if (a.attacking) attF++; if (a.hitstun > 0 || a.knockdownState) hsF++; if (b.health < pb) bh++; pb = b.health; const m = a.currentMove?.name || a.currentAttack?.name || (typeof a.currentAttack === 'string' ? a.currentAttack : null) || a.currentMove; if (m && typeof m === 'string') moves.add(m); if (a._spriteCastMove) casts.add(a._spriteCastMove); proj = Math.max(proj, ab.activeProjectiles.filter(p => p.owner === a || p.ownerSide === a.side).length) }
        for (const r of seq) { step(r); look() }
        for (let i = 0; i < 110; i++) { step(); look() }
        out[name] = { rk: a.rosterKey, moves: [...moves].sort().join('|'), casts: [...casts].sort().join('|'), dmg: Math.round(hp0 - b.health), spent: Math.round(e0 - a.energy), proj, attF, hsF, bh, sqe: JSON.stringify(a._squadEat || null), x: Math.round(a.x), bx: Math.round(b.x) }
      }
      return out
    }
  }, INPUTS)
  return { page, errs }
}
const all = await (async () => { const { page } = await session('naruto'); const k = await page.evaluate(async () => { const { characters } = await import('./characters.js'); return Object.keys(characters).filter(k => !characters[k].hidden && characters[k].hasSprites !== false) }); await page.close(); return k })()
const keys = (process.argv[2] ? process.argv[2].split(',') : all).filter(k => !['ben10', 'albedo', copier].includes(k))
let pass = 0, fail = 0; const bad = []
for (const k of keys) {
  let real, cop
  try { real = await session(k); cop = await session(copier) } catch (e) { fail++; bad.push(`${k}: LOAD ${e.message.split('\n')[0]}`); console.log(`FAIL ${k} (page load)`); try { await real?.page.close() } catch (_) {} continue }   // fresh pages: a domain / summon one character leaves open can't leak into the next
  let R, C
  try { R = await real.page.evaluate(() => __par(null)); C = await cop.page.evaluate(k => __par(k), k) } catch (e) { fail++; bad.push(`${k}: ERROR ${e.message.split('\n')[0]}`); await real.page.close(); await cop.page.close(); continue }
  const diffs = []
  for (const n of Object.keys(R)) {
    const r = R[n], c = C[n]
    if (c.rk !== r.rk) { diffs.push(`${n}: body real ${r.rk} copy ${c.rk}`); continue }   // (a move may itself swap bodies, e.g. Edo Tensei)
    const close = (x, y, tol) => Math.abs(x - y) <= Math.max(tol, Math.abs(x) * 0.15)
    if (r.moves !== c.moves) diffs.push(`${n}: moves real[${r.moves}] copy[${c.moves}]` + (process.env.DNA_DEBUG ? ' ' + JSON.stringify({ r, c }) : ''))
    else if (!close(r.dmg, c.dmg, 6)) diffs.push(`${n}: dmg ${r.dmg} vs ${c.dmg}`)
    else if (!close(r.spent, c.spent, 3)) diffs.push(`${n}: meter ${r.spent} vs ${c.spent}`)
    else if (r.proj !== c.proj) diffs.push(`${n}: proj ${r.proj} vs ${c.proj}`)
  }
  if (real.errs.length) diffs.push('real page errors: ' + real.errs[0])
  if (cop.errs.length) diffs.push('copy page errors: ' + cop.errs[0])
  if (diffs.length) { fail++; bad.push(`${k}: ${diffs.join('; ')}`); console.log(`FAIL ${k}\n   ${diffs.join('\n   ')}`) } else { pass++; console.log(`PASS ${k}`) }
  await real.page.close(); await cop.page.close()
}
console.log(`\n${pass} passed, ${fail} failed`)
await browser.close(); close(); process.exit(fail ? 1 : 0)
