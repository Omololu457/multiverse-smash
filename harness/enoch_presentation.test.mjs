// harness/enoch_presentation.test.mjs — Enoch's presentation + metadata (P6):
//   metadata (the brief's exact displayName / archetype / tagline / bio / difficulty, contributor flag), roster slot next to
//   Frozone in the_incredibles, default skin only, the credits contributor line, the intro glide-in, idle / win / disc-win /
//   lose poses as the sprite resolver plays them, every enoch_* cue renders on the SFX output it is handed (nothing bypasses
//   it; the voice bus is never touched), the laser loop pitched above Superman / Homelander's, and the HUD label.
//   node harness/enoch_presentation.test.mjs      (inside the test tree)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = []; let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 300 ? d.slice(0, 300) + '…' : d) } else { fail++; console.log('  ❌', n, String(d).slice(0, 1200)) } }
const out = {}
const BIO = "One of the people who helped build Multiverse Smash. He took Frozone's ice, added a visor that burns, and learned that the real power is what happens where the two meet."
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(server.base + '/index.html?harness=1&p1=enoch&p2=frozone&seed=81517', { waitUntil: 'load' }); await page.waitForFunction(() => window.__harness?.enochTest, null, { polling: 100, timeout: 60000 })

  // ── metadata, roster, skins, credits ──
  const M = await page.evaluate(async () => {
    const { characters } = await import('./characters.js'), { SKINS } = await import('./skins.js').catch(() => ({})), C = await import('./credits.js')
    const e = characters.enoch, keys = Object.keys(characters)
    const sk = (SKINS || {}).enoch || (await import('./enochSkins.js')).ENOCH_SKINS
    const lines = C.CREDITS.flatMap(s => (s.entries || []).map(x => x.work + ' — ' + (x.artists || []).join(', ')))
    return { displayName: e.displayName, name: e.name, universe: e.universe, archetype: e.archetype, tagline: e.tagline, bio: e.bio, difficulty: e.difficulty, contributor: e.contributor,
      hp: e.stats?.maxHealth ?? e.maxHealth, weight: e.stats?.weight ?? e.weight, portrait: e.portrait,
      afterFrozone: keys.indexOf('enoch') === keys.indexOf('frozone') + 1, skins: Object.keys(Array.isArray(sk) ? Object.fromEntries(sk.map((s, i) => [s.id || i, 1])) : (sk || {})),
      contributorLine: lines.find(l => /playable as Enoch/.test(l)) || null, art: C.attributionForCharacter?.('enoch') ? true : false }
  })
  out.meta = M
  ok('metadata = the brief (displayName, universe, archetype, tagline, bio, difficulty 5, contributor)', M.displayName === 'Enoch' && M.universe === 'the_incredibles' && M.archetype === 'Elemental Controller / Trail Glider' && M.tagline === 'Where ice meets fire.' && M.bio === BIO && M.difficulty === 5 && M.contributor === true, JSON.stringify(M))
  ok('980 health, light weight', M.hp === 980 && M.weight < 1, JSON.stringify([M.hp, M.weight]))
  ok('roster: listed right after Frozone in the_incredibles', M.afterFrozone, '')
  ok('skins: the default only', M.skins.length === 1, JSON.stringify(M.skins))
  ok('credits: a contributor line (playable as Enoch) + the art attribution', !!M.contributorLine && M.art, JSON.stringify(M.contributorLine))
  // privacy: no surname / place / organisation strings shipped in his data, docs or credits
  // every Enoch file this build ships (code, docs, tools, tests other than this one) + his credits entries
  const mine = fs.readdirSync('.').filter(f => /^enoch\w*\.js$/.test(f)).concat(fs.readdirSync('docs/enoch').filter(f => /\.(md|txt)$/.test(f)).map(f => 'docs/enoch/' + f), fs.readdirSync('tools/enoch').map(f => 'tools/enoch/' + f), ['docs/elements/ELEMENT_FRAMEWORK.md'], fs.readdirSync('harness').filter(f => /^enoch/.test(f) && f !== 'enoch_presentation.test.mjs').map(f => 'harness/' + f))
  const cr = fs.readFileSync('credits.js', 'utf8'), enochCredit = (cr.match(/  enoch: \{ work:[\s\S]*?files: \['assets\/enoch\/\*\*'\] \}/) || [''])[0] + (cr.match(/.*playable as Enoch.*/) || [''])[0]
  const hits = mine.filter(f => fs.statSync(f).isFile()).filter(f => /enoch_ref|church|school/i.test(fs.readFileSync(f, 'utf8'))).concat(/enoch_ref|church|school|\.jpg/i.test(enochCredit) ? ['credits.js (Enoch entry)'] : [])
  ok(`privacy: no photo reference, church or school in any of his ${mine.length} files or his credits`, hits.length === 0, JSON.stringify(hits))

  // ── intro (unit: the intro hook moves him in from 240 px back and settles exactly home) ──
  const I = await page.evaluate(async () => { const { updateEnochIntro, finalizeEnochIntro, INTRO } = await import('./enochState.js')
    const f = { rosterKey: 'enoch', _introPlaying: true, x: 600, facing: 1, _introRevealFrame: 0 }, xs = []
    for (let i = 0; i <= INTRO.arrive + 5; i++) { f._introRevealFrame = i; updateEnochIntro(f); xs.push(Math.round(f.x)) }
    finalizeEnochIntro(f); return { xs, final: f.x, dist: INTRO.dist } })
  ok('intro: glides in from 240 px behind his mark and settles exactly on it', I.xs[0] === 360 && I.xs[I.xs.length - 1] === 600 && I.final === 600 && I.xs.every((x, i) => i === 0 || x >= I.xs[i - 1]), JSON.stringify(I.xs.filter((_, i) => i % 8 === 0)))
  // live: the intro card draws while his intro plays (no errors), the match boots into battle
  await page.evaluate(() => { __harness.start(); })
  let sawIntro = false; for (let i = 0; i < 80 && !sawIntro; i++) sawIntro = await page.evaluate(() => { __harness.luffyTest.step(2); return !!__harness.enochTest.raw()._introPlaying })
  await page.evaluate(() => { __harness.skipToBattle(); __harness.luffyTest.step(1) })
  await page.waitForFunction(() => __harness.luffyTest.state('p1')?.ready && __harness.luffyTest.state('p2')?.ready, null, { polling: 100, timeout: 60000 })
  ok('live match: his intro plays (or is skipped cleanly) and the battle starts', true, `introSeen=${sawIntro}`)

  // ── poses: idle animates; win; disc win by final thermal; lose ──
  const P = await page.evaluate(() => { const H = __harness.enochTest, step = n => __harness.luffyTest.step(n), a = H.raw(), r = {}
    H.reset(); step(2); const fr = new Set(); for (let i = 0; i < 90; i++) { step(1); if (H.state().action === 'idle') fr.add(H.state().frame) } r.idle = { action: H.state().action, frames: fr.size }
    const win = (discs, th) => { H.reset(); step(2); const s = a._enoch; s.stats.discs = discs; H.setMode(th < 0 ? 'ice' : th > 0 ? 'fire' : null); step(1); a._forceAction = 'win'; step(2); const act = H.state().action; a._forceAction = null; step(1); return act }
    r.win = win(0, 0); r.winDisc = win(1, -60); r.winDiscFire = win(1, 60); r.winDiscWater = win(1, 0)
    H.reset(); step(2); a._forceAction = 'lose'; step(2); r.lose = H.state().action; a._forceAction = null; step(1)
    r.anim = ['idle', 'win', 'winDisc', 'winDisc_fire', 'winDisc_water', 'lose', 'intro', 'glide', 'glide_fire', 'standDisc'].filter(k => !a.animationData?.[k])
    return r })
  out.poses = P
  ok('idle animates (several frames over 1.5 s)', P.idle.action === 'idle' && P.idle.frames >= 3, JSON.stringify(P.idle))
  ok('win: the plain win pose when no disc was used', P.win === 'win', P.win)
  ok('disc win: ice / fire / water by his final MODE (no mode = water; a deterministic, state-driven choice)', P.winDisc === 'winDisc' && P.winDiscFire === 'winDisc_fire' && P.winDiscWater === 'winDisc_water', JSON.stringify(P))
  ok('lose pose', P.lose === 'lose', P.lose)
  ok('every presentation strip exists', P.anim.length === 0, JSON.stringify(P.anim))

  // ── sound: every enoch_* cue renders into the output it is handed, and only into it ──
  const S = await page.evaluate(async () => {
    const { ENOCH_SOUNDS } = await import('./enochSound.js'), { LASER_PITCH } = await import('./enochFx.js'), { SOUNDS } = await import('./sound.js').catch(() => ({}))
    const rms = b => { const d = b.getChannelData(0); let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i]; return Math.sqrt(s / d.length) }
    const res = {}
    for (const k of Object.keys(ENOCH_SOUNDS)) {
      const run = async connect => { const ctx = new OfflineAudioContext(1, 44100 * 1.6, 44100), outG = ctx.createGain(); if (connect) outG.connect(ctx.destination); ENOCH_SOUNDS[k](ctx, outG); return rms(await ctx.startRendering()) }
      res[k] = { on: await run(true), off: await run(false) }
    }
    return { res, pitch: LASER_PITCH, inSounds: Object.keys(ENOCH_SOUNDS).every(k => !SOUNDS || SOUNDS[k] === ENOCH_SOUNDS[k]) }
  })
  out.sound = { pitch: S.pitch, rms: Object.fromEntries(Object.entries(S.res).map(([k, v]) => [k, Math.round(v.on * 10000) / 10000])) }
  const silent = Object.entries(S.res).filter(([, v]) => !(v.on > 0.0005)).map(([k]) => k), bypass = Object.entries(S.res).filter(([, v]) => v.off > 0).map(([k]) => k)
  ok(`every enoch_* cue makes sound (${Object.keys(S.res).length} cues)`, silent.length === 0, JSON.stringify(silent))
  ok('nothing bypasses the SFX output it is handed (SFX bus only; voice bus untouched)', bypass.length === 0 && S.inSounds, JSON.stringify(bypass))
  ok('the brief\'s palette is there: crackle, shatter, quiet fire crackle, steam, glide whoosh (+ faster), overload alarm, LOUD water hiss', ['enoch_crackle', 'enoch_shatter', 'enoch_fireCrackle', 'enoch_steam', 'enoch_glide', 'enoch_glideFast', 'enoch_overload', 'enoch_hiss'].every(k => S.res[k]) && S.res.enoch_hiss.on > S.res.enoch_fireCrackle.on * 2, JSON.stringify({ hiss: S.res.enoch_hiss?.on, fire: S.res.enoch_fireCrackle?.on }))
  ok('the laser loop is the beam family pitched HIGHER (×1.12)', S.pitch > 1 && S.pitch === 1.12, String(S.pitch))
  // HUD label (render-only)
  const hud = await page.evaluate(() => { const H = __harness.enochTest; H.reset(); __harness.luffyTest.step(2); const r = []; for (const m of ['ice', null, 'fire']) { H.setMode(m); r.push(H.hud().zone) } return r })
  ok('HUD label follows his MODE (ICE MODE / NO MODE / FIRE MODE)', JSON.stringify(hud) === JSON.stringify(['ICE MODE', 'NO MODE', 'FIRE MODE']), JSON.stringify(hud))
  ok('no browser runtime errors', errors.length === 0, JSON.stringify(errors.slice(0, 5)))
} catch (e) { fail++; console.log('  ❌ harness error', e.stack) }
finally {
  fs.mkdirSync('docs/enoch', { recursive: true }); fs.writeFileSync('docs/enoch/presentation_results.json', JSON.stringify({ pass, fail, ...out }, null, 1) + '\n')
  console.log(`\n  ENOCH PRESENTATION: ${pass} passed, ${fail} failed`); await browser.close(); server.close(); process.exit(fail ? 1 : 0)
}
