// harness/sanji_render_scenarios_p7.mjs — PHASE 7: INTRO / WIN 1-3 / LOSE / IDLE > 10 s + the HANDS RULE audit.
// Presentation only: the checks read which strip the renderer is showing and screenshot every pose.
import fs from 'node:fs'
export async function run(X) {
  const { page, step, shot, as, check, PHASE, fresh } = X
  const look = () => page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'), set = a._skinAnim || a.animationData
    return { action: a.spriteHandler?.currentAction || null, win: set?.win?.sheet || null, lose: set?.lose?.sheet || null, winVar: a._sjWinVar || 0, fa: a._forceAction || null, x: a.x } })

  // INTRO: walk-in (hands in pockets, R6) → light the cigarette (R1F2 + R7 drag) → idle.
  await fresh(400, 10)
  const walk = await page.evaluate(async () => {
    const m = await import('./sanji.js'), a = __harness.sanjiTest.raw('p1'), home = a.x, out = []
    a._introPlaying = true; a._introRevealFrame = 0; m.sanjiIntroStart(a)
    for (const t of [0, 24, 48, 72]) { a._introRevealFrame = t; m.updateSanjiIntro(a); out.push(Math.round(a.x - home)) }
    a._introPlaying = false; m.finalizeSanjiIntroPos(a); out.push(Math.round(a.x - home))
    const d = (await import('./sanjiData.js')).sanji
    return { out, seq: d.introSequence }
  })
  check('intro: walks in 200 px (hands in pockets) and lands exactly home', walk.out.join() === '-200,-133,-67,0,0' && walk.seq.join() === 'intro,sIntroLight', JSON.stringify(walk))
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'); a._introPlaying = true; a._introVariant = 'intro'; a._introRevealFrame = 30 })
  await step(1); await shot(`p${PHASE}-70-intro-walk`)
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'); a._introVariant = 'sIntroLight'; a._introRevealFrame = 80 })
  await step(3)
  const lit = await look()
  await shot(`p${PHASE}-71-intro-light`)
  check('intro step 2 plays the cigarette-lighting strip', lit.action === 'sIntroLight' || lit.action === 'intro', JSON.stringify(lit))
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'); a._introPlaying = false; a._introVariant = null }); await step(10)

  // WINS: 1 smoking (R7) · 2 kick flourish (R9 → R6) · 3 serving the cocktail (R8)
  const SHEET = { 1: '/win.png', 2: '/win2.png', 3: '/winGlass.png' }
  for (const v of [1, 2, 3]) {
    await page.evaluate(v => { const a = __harness.sanjiTest.raw('p1'); a._forceAction = 'win'; a._sjWinVar = v }, v)
    await step(2); await step(24); const r = await look()
    check(`win ${v} shows the ${SHEET[v].slice(1)} strip`, r.action === 'win' && (r.win || '').endsWith(SHEET[v]) && r.winVar === v, JSON.stringify(r))
    await shot(`p${PHASE}-${71 + v}-win${v}`)
  }
  await page.evaluate(() => { const a = __harness.sanjiTest.raw('p1'); a._forceAction = 'lose' }); await step(2); await step(40)
  { const r = await look(); check('lose: R7 kneel → lying knockdown strip', r.action === 'lose' && (r.lose || '').endsWith('/lose.png'), JSON.stringify(r)) }
  await shot(`p${PHASE}-75-lose`)
  await page.evaluate(() => { __harness.sanjiTest.raw('p1')._forceAction = null }); await step(3)
  check('round-end pose cleared → the variant is re-picked next round', (await look()).winVar === 0, JSON.stringify(await look()))
  const vh = await page.evaluate(async () => { const m = await import('./sanjiState.js'), seen = {}; let stable = true
    for (let hp = 1; hp <= 60; hp++) { const a = { health: hp * 17, energy: hp % 100, _sanji: { tick: hp * 991 } }, b = { ...a }
      const x = m.sanjiWinVariant(a), y = m.sanjiWinVariant(b); if (x !== y) stable = false; seen[x] = (seen[x] || 0) + 1 }
    return { stable, seen } })
  check('win variant: deterministic integer hash, all three poses reachable', vh.stable && Object.keys(vh.seen).length === 3, JSON.stringify(vh))

  // IDLE > 10 s: exhales smoke and settles his tie.
  await fresh(500, 10); await step(590)
  check('idle < 10 s: normal idle', (await look()).action === 'idle', JSON.stringify(await look()))
  await step(20)
  { const r = await look(); check('idle ≥ 10 s: the smoke-and-tie lounge strip', r.action === 'idleLong' && r.fa === 'idleLong', JSON.stringify(r)) }
  await shot(`p${PHASE}-76-idle-long`)
  await page.keyboard.down('d'); await step(4); await page.keyboard.up('d'); await step(2)
  check('any movement ends the lounge', (await look()).fa !== 'idleLong', JSON.stringify(await look()))

  // HANDS RULE audit (static, from the sprite ledger data): R1F5 — the only fist frame on the sheet — never drives a
  // strike; every frame except the credit text is used.
  const fr = JSON.parse(fs.readFileSync(new URL('../docs/sanji/frames.json', import.meta.url))).frames
  const strikes = await page.evaluate(async () => { const m = await import('./sanjiData.js'); return Object.entries(m.SANJI_MOVES).filter(([, d]) => (d.damage || 0) > 0 && !d.sj?.noHit).map(([k]) => k) })
  const fistUses = (fr.R1F5?.uses || []).filter(u => strikes.some(k => u === k || u === k + '_dj'))
  check('HANDS RULE: the punch frame R1F5 drives no strike (deflect pose only)', fistUses.length === 0 && (fr.R1F5?.uses || []).length > 0, JSON.stringify(fr.R1F5?.uses))
  const unused = Object.entries(fr).filter(([, v]) => !(v.uses || []).length).map(([k]) => k)
  check('every sheet frame is used (54/54; only the credit text is excluded)', Object.keys(fr).length === 54 && unused.length === 0, JSON.stringify({ n: Object.keys(fr).length, unused }))
}
