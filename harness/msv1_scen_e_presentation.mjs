// MSV1 scenarios E — PRESENTATION: intro streak + "Ninja Storm, Ranger Form! Ha!", mirror-match / vs S.P.D. Red / win
// bubbles, sound cues (every sim cue has a synth for both ninjas), metadata (Move List, credits, roster, select screen).
import fs from 'node:fs'
export async function run(X) {
  const { step, S, call, shot, fresh, check, section } = X
  const page = () => X.page
  const bubble = w => page().evaluate(w => { const b = __harness.ninjaTest.raw(w)._nsBubble; return b && b.t > 0 ? b.text : null }, w)

  section('E1 intro: streak + "Ninja Storm, Ranger Form! Ha!"')
  // a real match start WITHOUT skipping the intro
  const ctx = await page().context().browser().newContext({ viewport: { width: 1280, height: 720 } })
  const pg = await ctx.newPage(); await pg.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await pg.goto(page().url()); await pg.waitForFunction(() => !!window.__harness?.ninjaTest, null, { timeout: 30000 })
  await pg.evaluate(() => __harness.start())
  let introSeen = false, introText = null
  for (let i = 0; i < 40; i++) {
    await pg.evaluate(() => __harness.luffyTest.step(1))
    const r = await pg.evaluate(() => { const f = __harness.ninjaTest.raw('p1'); return { intro: !!f?._introPlaying, fx: f?._nsIntroFx || 0, b: f?._nsBubble?.text || null } })
    if (r.intro) introSeen = true; if (r.b) introText = r.b
    if (r.intro && r.fx >= 8 && r.fx <= 14) { await pg.screenshot({ path: 'docs/msv1/screenshots/MSV1_intro_streak.png' }); break }
  }
  await new Promise(r => setTimeout(r, 300)); await pg.evaluate(() => __harness.luffyTest.step(1)); await pg.screenshot({ path: 'docs/msv1/screenshots/MSV1_intro_bubble.png' })
  check('match intro plays for the ninja (intro streak FX drawn)', introSeen, introSeen)
  check('intro bubble: "Ninja Storm, Ranger Form! Ha!"', introText === 'Ninja Storm, Ranger Form! Ha!', introText)
  // and it is actually DRAWN: white balloon pixels above Shane's head in the intro frame
  const px = await pg.evaluate(() => { const f = __harness.ninjaTest.raw('p1'), cv = document.querySelector('canvas'), x = cv.getContext('2d'); const d = x.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245) n++; return n })
  check('intro bubble is visibly drawn during the intro (white balloon pixels on screen)', px > 1500, px)
  await ctx.close()

  section('E2 match-up + win bubbles')
  const lines = await page().evaluate(async () => { const N = await import('./ninja.js'); return { r: N.NINJA_PROFILES.ns_red.quotes, y: N.NINJA_PROFILES.ns_yellow.quotes } })
  check('Shane vs Dustin: "Keep up, Dustin." / Dustin replies "Dude, I was born ready!"', lines.r.vs.ns_yellow.line === 'Keep up, Dustin.' && lines.y.vs.ns_red.line === 'Dude, I was born ready!' && lines.y.vs.ns_red.reply > 0)
  check('mirror-match lines exist for both (Shane vs Shane, Dustin vs Dustin)', !!lines.r.vs.ns_red?.line && !!lines.y.vs.ns_yellow?.line)
  check('vs S.P.D. Red lines exist for both', !!lines.r.vs.spd_red?.line && !!lines.y.vs.spd_red?.line)
  await X.boot('ns_red', 'ns_yellow')   // Shane = P1 regardless of what earlier scenarios left
  // live: round start in Shane vs Dustin → Shane's line at once, Dustin's reply on its cue
  await fresh(400, { ax: 600 }); await page().evaluate(() => { for (const w of ['p1', 'p2']) { const f = __harness.ninjaTest.raw(w); f._nsBubble = null; delete f._ninja } })   // a fresh round clock
  await step(2); const b1 = await bubble('p1')
  let reply = null; for (let i = 0; i < 80; i++) { await step(1); const b = await bubble('p2'); if (b && b !== 'Ninja Storm, Ranger Form! Ha!') { reply = b; break } }
  check('live: Shane says "Keep up, Dustin." at round start', b1 === 'Keep up, Dustin.', b1)
  check('live: Dustin replies "Dude, I was born ready!" on its cue', reply === 'Dude, I was born ready!', reply)
  await shot('bubbles_matchup')
  await page().evaluate(() => { __harness.ninjaTest.raw('p2').health = 0 }); await step(2)
  const wb = await bubble('p1')
  check('win bubble: "Air ninjas rule." when Shane takes the round', wb === 'Air ninjas rule.', wb)
  await shot('win_bubble')
  check('bubbles obey the ms_quip_bubbles setting (shared with Spider-Man)', fs.readFileSync('nsFx.js', 'utf8').includes("localStorage.getItem('ms_quip_bubbles') !== '0'"))

  section('E3 sounds: every sim cue has a WebAudio synth for both ninjas')
  const cues = ['absorb', 'barrier', 'blocked', 'cloneStrike', 'eruption', 'handSign', 'impact', 'mirror', 'reflect', 'rev', 'rumble', 'smokePop', 'streakHit', 'swap', 'tornado', 'trapClick', 'trapSet', 'zap',
    'beam', 'gale', 'kunai', 'quake', 'slashHit', 'tornadoHit', 'ultStart', 'superStart', 'special', 'swing', 'swingSword', 'tremor', 'streak', 'parry', 'counter', 'land', 'shot']
  const keys = await page().evaluate(async () => Object.keys((await import('./nsSound.js')).NS_SOUNDS))
  const miss = cues.flatMap(c => ['nsr_', 'nsy_'].map(p => p + c)).filter(k => !keys.includes(k))
  check(`all ${cues.length} cues × Shane (nsr_) / Dustin (nsy_) have a synth`, !miss.length, miss.join(','))
  const src = fs.readFileSync('sound.js', 'utf8')
  check('NS_SOUNDS is spread into sound.js SOUNDS (the SFX bus)', src.includes('...NS_SOUNDS,'))
  const noRand = ['nsSound.js', 'nsFx.js', 'ninja.js', 'ninjaCommand.js', 'nsSupers.js', 'nsData.js'].every(f => !/Math\.random\(/.test(fs.readFileSync(f, 'utf8')))
  check('no Math.random() anywhere in the MSV1 modules (noise = seeded LCG, gameplay = rangerHash)', noRand)

  section('E4 metadata: roster, select screen, Move List, credits')
  const meta = await page().evaluate(async () => {
    const C = (await import('./characters.js')).characters, K = (await import('./kits.js')), Cr = (await import('./credits.js'))
    const kit = K.CHARACTER_KITS || K.KITS || K.kits || K.default
    const cr = { ns_red: Cr.attributionForCharacter('ns_red'), ns_yellow: Cr.attributionForCharacter('ns_yellow') }
    const out = {}
    for (const k of ['ns_red', 'ns_yellow']) { const c = C[k]; out[k] = { name: c.name, universe: c.universe, sub: c.subUniverse, playable: c.isPlayable !== false && (!c.hidden || !!C.windrangers?.duoForms?.includes(k)), formOf: C.windrangers?.duoForms?.includes(k) ? 'windrangers' : null,   /* MSV1-MERGE: a hidden FORM, played through the duo */ portrait: !!c.portrait, bio: !!(c.bio || c.description), kit: !!(kit && kit[k] && kit[k].specials?.length), credit: !!(cr && cr[k]), creditText: cr && cr[k] ? JSON.stringify(cr[k]) + ' ' + (Cr.artistLineForCharacter(k) || '') : '' } }
    return out
  })
  for (const k of ['ns_red', 'ns_yellow']) {
    const m = meta[k]
    check(`${k}: on the roster under Power Rangers / Ninja Storm, playable (MSV1-MERGE: as a form of windrangers), portrait + bio`, m.universe === 'power_rangers' && m.sub === 'Ninja Storm' && m.playable && m.portrait && m.bio, m)
    check(`${k}: Move List (kits.js) has specials`, m.kit)
    check(`${k}: credits.js names Grim / spritedatabase.net / Super Legends (DS)`, m.credit && /Grim/.test(m.creditText) && /spritedatabase/.test(m.creditText) && /Super Legends/.test(m.creditText), m.creditText.slice(0, 120))
  }
  check('Dustin is never called "Tori" anywhere in the MSV1 modules', ['nsData.js', 'nsKit.js', 'ninja.js', 'nsFx.js', 'credits.js'].every(f => !/\bTori\b/.test(fs.readFileSync(f, 'utf8'))))
}
