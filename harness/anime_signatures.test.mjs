// harness/anime_signatures.test.mjs — anime juice Phase 2: signature moves get their breakdown (animeSignatures.js).
// One real fighter per family, in the real game: the move's REAL runtime id starts it (animeJuiceTick sees currentMove /
// _spriteCastMove change), a fresh spark with the real id hits (animeJuiceOnSpark — the game's hook), then the render
// is captured at the start, the impact and the aftermath. Plus: Naruto's real Rasengan from input, the impact-frame queue,
// Reduce Flashing → dim (no colour flip), ben10 never matched, beam recoil (sigFeel) moves the caster.
//   node harness/anime_signatures.test.mjs   → docs/anime_juice/signatures/*.png
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n) } else { fail++; console.log('  ❌', n, String(d).slice(0, 900)) } }
const J = o => JSON.stringify(o)
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
const CASES = [
  ['spiritbomb', 'goku', 'ultimate', 'gokuSpiritBomb', 'ultimate'],
  ['beam', 'vegeta', 'galickGun', 'galickGun', 'special'],
  ['orb', 'naruto', 'rasengan', 'rasenganOrb', 'special'],
  ['gatling', 'luffy', 'lfGatling', 'lfGatling', 'special'],
  ['stretch', 'luffy', 'lfBazooka', 'lfBazooka', 'special'],
  ['waterdragon', 'tobirama', 'tobiWaterDragon', 'tobiWaterDragon', 'special'],
  ['firebreath', 'itachi', 'itachiFireball', 'itachiFireball', 'special'],
  ['rockline', 'madara', 'madaraWoodSpike', 'madaraWoodSpike', 'special'],
  ['iai', 'zoro', 'zOni', 'zOni', 'special'],
  ['energyslash', 'ichigo', 'ichigo_getsuga', 'ichigo_getsuga', 'special'],
  ['ice', 'frozone', 'fLance', 'frozone_lance', 'special'],
]
async function boot(p1) {
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=goku&seed=4242`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
  await page.evaluate(async () => {
    window.requestAnimationFrame = () => 0
    const AJ = await import('./animeJuice.js'), SG = await import('./animeSignatures.js'), { writeRawControls } = await import('./input.js')
    const H = __harness.enochTest, step = n => __harness.luffyTest.step(n), render = () => __harness.luffyTest.step(0)
    window.__A = { AJ, SG, H, step, render, writeRawControls, st: () => AJ.animeJuiceStatus().sig,
      setup: () => { H.reset(); __harness.setDummyBehavior?.('stand'); const a = H.raw(), b = H.raw('p2'); a.x = 760; b.x = 1010; a.facing = 1; b.facing = -1; for (const f of [a, b]) { f.energy = 0; f.health = f.maxHealth } writeRawControls(a, {}); step(3); AJ.animeJuiceReset(); return { a, b } },
      // advance the juice only (no sim) so the fighters hold still for the screenshot
      tick: n => { const a = H.raw(), b = H.raw('p2'); for (let i = 0; i < n; i++) AJ.animeJuiceTick(a, b, 50000 + (window.__fr = (window.__fr || 0) + 1)) ; render() } }
  })
}
const shot = name => page.screenshot({ path: `docs/anime_juice/signatures/${name}.png` })
let booted = null
for (const [fam, who, start, hitId, cat] of CASES) {
  if (booted !== who) { await boot(who); booted = who }
  const r = await page.evaluate(([fam, start, hitId, cat]) => { const { AJ, SG, st, setup, tick } = __A; const { a, b } = setup(); const out = {}
    out.fam = SG.sigFamily(a, start === 'ultimate' ? 'ultimate' : start, hitId, start === 'ultimate')
    if (start === 'ultimate') a.isUltimateActive = true; else { a.currentMove = start; a.attacking = true }
    AJ.animeJuiceTick(a, b, 40000); out.startFx = st().fx.slice(); out.live = st().live[0]
    return out }, [fam, start, hitId, cat])
  ok(`${fam}: ${who} ${start} → family "${fam}" + its start layer`, r.fam === fam && (r.startFx.length > 0 || fam === 'gatling') && r.live === fam, J(r))
  await page.evaluate(n => __A.tick(n), fam === 'spiritbomb' ? 36 : fam === 'rockline' ? 22 : 8); await shot(`${fam}_1_start`)
  const h = await page.evaluate(([hitId, cat]) => { const { AJ, SG, st, H, tick } = __A; const a = H.raw(), b = H.raw('p2'); SG.sigTakeImpacts()
    const n = cat === 'special' && hitId === 'lfGatling' ? 6 : 1
    for (let i = 0; i < n; i++) AJ.animeJuiceOnSpark({ x: b.x + 25, y: b.y + 45, category: cat, damage: 90, moveName: hitId, attackerSide: 'p1', blocked: false, _fresh: true }, a, b, 41000 + i * 4)
    const s = st(); return { fx: s.fx, decals: s.decals, hud: s.hud, imp: SG.sigTakeImpacts().length } }, [hitId, cat])
  ok(`${fam}: the hit plays its breakdown (fx ${h.fx.join('/')}, floor ${h.decals.join('/') || '—'}, impact frame ${h.imp})`, h.fx.length > 0 && (fam === 'gatling' || h.imp === 1), J(h))
  await page.evaluate(n => __A.tick(n), fam === 'iai' ? 18 : 5); await shot(`${fam}_2_hit`)
  if (h.decals.length) { await page.evaluate(() => __A.tick(70)); await shot(`${fam}_3_aftermath`) }
}

// the REAL Rasengan from input (no injected state)
await boot('naruto')
const RR = await page.evaluate(() => { const { step, setup, st, writeRawControls } = __A; const { a } = setup(); a.energy = 100
  writeRawControls(a, { special: true }); step(1); writeRawControls(a, {}); let seen = null
  for (let i = 0; i < 12; i++) { step(1); if (st().live[0]) { seen = { live: st().live[0], mv: a.currentMove, fx: st().fx }; break } } return seen })
ok('real input: Naruto Special → the Rasengan orb breakdown starts (live family "orb")', RR?.live === 'orb', J(RR))

const misc = await page.evaluate(async () => { const { AJ, SG, setup, st } = __A; const { juiceSettings } = await import('./juiceSettings.js'); const { a, b } = setup(); const r = {}
  juiceSettings.reduceFlashing = true; AJ.animeJuiceOnSpark({ x: b.x, y: b.y + 40, category: 'special', damage: 90, moveName: 'zOni', attackerSide: 'p1' }, { ...a, rosterKey: 'zoro' }, b, 60000)
  r.rf = st().hud; juiceSettings.reduceFlashing = false
  r.ben = SG.sigFamily({ rosterKey: 'ben10' }, 'kamehameha', 'gokuKamehameha', false)
  const caster = { rosterKey: 'vegeta', x: 600, w: 60, facing: 1, onGround: true, currentMove: 'galickGun' }, foe = { rosterKey: 'goku', x: 900, w: 60 }
  SG.sigFeel({ attackerSide: 'p1', category: 'special', moveName: 'galickGun' }, caster, foe, 70000, 3200); r.recoil = 600 - caster.x
  juiceSettings.animeFx = 'off'; SG.sigReset(); AJ.animeJuiceOnSpark({ x: b.x, y: b.y + 40, category: 'special', damage: 90, moveName: 'galickGun', attackerSide: 'p1' }, { ...a, rosterKey: 'vegeta' }, b, 61000); r.off = st().fx.length; juiceSettings.animeFx = undefined
  return r })
ok('Reduce Flashing: the iai colour flip becomes a soft dim', misc.rf.includes('dim') && !misc.rf.includes('flip'), J(misc))
ok('ben10 is never matched', misc.ben === null, J(misc))
ok(`beam recoil (sim feel): the caster slides back ${misc.recoil}px per beam hit`, misc.recoil > 0, J(misc))
ok('Anime FX off → no signature layer', misc.off === 0, J(misc))
ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
await browser.close(); server.close()
console.log(`\n  ANIME SIGNATURES: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
