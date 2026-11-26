// harness/story_live.test.mjs — MSV1-STORY: the campaign in the real game (Playwright).
//   node harness/story_live.test.mjs
// Headless auto-win of the WHOLE campaign for a team slot (mmpr_rangers), gojo_shinjuku and nezuko (silent), through the real
// match-end path (forced KO winner → _checkMatchOver → story scene). Plus: relay carry, mirror, rival / template exchanges,
// second-map switch, Isshiki half-health caption, credits lock, secret unlock + S1, loss → retry, Skip Scene ×2, text speed,
// corrupt save, determinism of a seeded story fight, and replay of a story relay bout.
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { if (c) { PASS++; console.log('  ✅', n) } else { FAIL++; console.log('  ❌', n, d) } }
const section = t => console.log(`\n── ${t}`)
const server = await serve()
const browser = await chromium.launch({ headless: true, args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = []; page.on('pageerror', e => errors.push(e.message))
const S = (f, ...a) => page.evaluate(([f, a]) => __harness.story[f](...a), [f, a])
const wait = ms => page.waitForTimeout(ms)

// Play a whole campaign for `key`; returns observations.
async function campaign(key) {
  await S('resetSave'); await S('open', key)
  let info = await S('choose', 'new')
  const obs = { key, bouts: 0, seen: [], carryOk: true, carryBad: [], mirror: null, credits: null, creditsLocked: null, speech: 0, address: 0, ending: 0, endingT: [], secondMap: {}, caption: null, encs: new Set() }
  for (let g = 0; g < 600; g++) {
    const r = await S('toNext'); info = r.info
    obs.seen.push(...r.seen.map(x => ({ ...x, enc: info.encId })))
    if (info.stepType === 'fight' && info.awaitingBout) {
      obs.encs.add(info.encId)
      if (info.oppIndex > 0) { const want = Math.max(1, Math.round(info.p1Max * info.carryPct)); if (Math.abs(info.carryPct - 0.7) > 1e-9 || info.p1Health !== want) { obs.carryOk = false; obs.carryBad.push([info.encId, info.oppIndex, info.p1Health, want, info.carryPct]) } }
      if (info.p2 === key && !obs.mirror) obs.mirror = { p2Skin: info.p2Skin, p1Skin: info.playerSkin, enc: info.encId }
      if (['17', '21', '29'].includes(info.encId) && info.oppIndex === info.oppCount - 1) {   // final opponent → 50% → second map
        await page.evaluate(() => __harness.skipToBattle()); await S('setP2HealthFrac', 0.45); await wait(250)
        const i2 = await S('info'); obs.secondMap[info.encId] = { on: i2.secondMap, caption: i2.caption }
      }
      if (info.encId === '36') { await page.evaluate(() => __harness.skipToBattle()); await S('setP2HealthFrac', 0.45); await wait(250); const i2 = await S('info'); obs.caption = { text: i2.caption, fired: i2.midCueFired, gs: i2.gameState } }
      await S('boutResult', 'p1', 0.5); obs.bouts++; continue
    }
    if (info.inCredits) {
      const before = await S('creditsInfo')
      await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.keyboard.press('Backspace'); await page.mouse.click(130, 34); await wait(60)   // confirm / back keys / the BACK button
      const after = await S('creditsInfo')
      obs.creditsLocked = before.max > 0 && after.inCredits && after.gameState === 'credits'
      obs.credits = before; await S('creditsFinish'); continue
    }
    if (info.gameState === 'storyMenu') break
    if (info.stepType === 'retry') { obs.lost = true; await S('confirm') }
  }
  obs.speech = obs.seen.filter(x => x.kind === 'scene' && x.group === 'speech').length
  obs.address = obs.seen.filter(x => x.group === 'address')
  obs.defeat = obs.seen.filter(x => x.group === 'defeat').length
  obs.ending = obs.seen.filter(x => x.kind === 'ending' && x.text).length
  obs.creditsNarr = obs.seen.filter(x => x.kind === 'credits' && x.text).length
  obs.final = await S('info'); obs.menu = (await S('menuItems')).map(x => x.id)
  return obs
}

try {
  await page.goto(`${server.base}/index.html?harness=1`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.story, null, { timeout: 30000 })

  section('menu')
  await S('resetSave'); await S('open', 'gojo_shinjuku')
  let items = (await S('menuItems')).map(x => x.id)
  check('fresh save: NEW / TEXT SPEED / VOICE / CHANGE FIGHTER / BACK (no Continue, no secret)', JSON.stringify(items) === JSON.stringify(['new', 'speed', 'voice', 'fighter', 'back']), items.join(','))
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await wait(50)
  check('keyboard ↓ + Enter cycles the text speed (saved)', (await S('info')).save.textSpeed === 'fast')
  await S('setSpeed', 'normal')

  for (const key of ['mmpr_rangers', 'gojo_shinjuku', 'nezuko']) {
    section(`auto-win campaign — ${key}`)
    const o = await campaign(key)
    check(`${key}: all 36 encounters fought (114 bouts, no loss)`, o.encs.size === 36 && o.bouts === 114 && !o.lost, `encs=${o.encs.size} bouts=${o.bouts} lost=${!!o.lost}`)
    check(`${key}: relay health carries +20% (0.5 → 0.7 of max) at every later opponent`, o.carryOk, JSON.stringify(o.carryBad.slice(0, 3)))
    check(`${key}: intro (3) played once`, o.seen.filter(x => x.kind === 'intro' && x.text).length === 3)
    check(`${key}: Isshiki's 6-line speech after 35, then his defeat line at 36`, o.speech === 6 && o.defeat === 1, `speech=${o.speech} defeat=${o.defeat}`)
    check(`${key}: personal address only for an addressed fighter`, key === 'gojo_shinjuku' ? o.address.length === 1 && o.address[0].to === key : o.address.length === 0, JSON.stringify(o.address))
    check(`${key}: personal ending (4) + credits narration (6)`, o.ending === 4 && o.creditsNarr === 6, `ending=${o.ending} credits=${o.creditsNarr}`)
    check(`${key}: the credits roll ran and could not be left before the end`, !!o.credits && o.creditsLocked === true, JSON.stringify(o.credits))
    check(`${key}: second map switches at the final opponent's 50% (17 / 21 / 29) with its text line`, ['17', '21', '29'].every(e => o.secondMap[e]?.on && o.secondMap[e]?.caption), JSON.stringify(o.secondMap))
    check(`${key}: fight 36 half-health Isshiki caption fired (battle not paused)`, o.caption?.fired && /./.test(o.caption.text || '') && o.caption.gs === 'battle', JSON.stringify(o.caption))
    check(`${key}: mirror bout uses an alternate skin`, !o.mirror || o.mirror.p2Skin !== o.mirror.p1Skin, JSON.stringify(o.mirror))
    check(`${key}: save → highest 36, ending seen, campaign cleared, secret unlocked`, o.final.save.fighters[key]?.highest === 36 && o.final.save.fighters[key]?.endingSeen && o.final.save.secretUnlocked && o.final.save.campaignsCleared === 1, JSON.stringify(o.final.save.fighters[key]))
    check(`${key}: back on the story menu with the S1 entry`, o.final.gameState === 'storyMenu' && o.menu.includes('secret'), o.menu.join(','))
    if (key === 'gojo_shinjuku') {
      check('gojo_shinjuku: the address follows the 6 speech lines', (() => { const i = o.seen.findIndex(x => x.group === 'address'); return i > 5 && o.seen.slice(i - 6, i).every(x => x.group === 'speech') })())
      check('gojo_shinjuku: mirror at 05 (Rift Mirror)', o.mirror?.enc === '05', JSON.stringify(o.mirror))
      check('gojo_shinjuku: a rival exchange played', o.seen.some(x => x.entrance === 'rival' && x.text))
      check('gojo_shinjuku: a template exchange played', o.seen.some(x => x.entrance === 'template' && x.text))
    }
    if (key === 'nezuko') {
      check('nezuko (silent): her lines are italic / unvoiced; template lines unsigned', o.seen.filter(x => x.speaker === 'nezuko').every(x => x.italic || !x.text) && (o.seen.some(x => x.unsigned) || !o.seen.some(x => x.entrance === 'template')))
    }
  }

  section('secret exhibition S1')
  let info = await S('choose', 'secret')
  let r = await S('toNext')
  check('S1 vs Saitama at the Battle Royale Colosseum', r.info.p2 === 'saitama' && r.info.stage === 'Battle Royale Colosseum' && r.info.ai === 'master', `${r.info.p2} ${r.info.stage} ${r.info.ai}`)
  await S('boutResult', 'p1', 0.5); r = await S('toNext')
  check('S1 cleared → back to the story menu', r.info.gameState === 'storyMenu' && r.info.save.secretCleared === true)

  section('loss → retry from the encounter start at full health')
  await S('begin', 1); r = await S('toNext'); await S('boutResult', 'p1', 0.5); r = await S('toNext')
  check('02 relay: on opponent 2 with carried health', r.info.oppIndex === 1 && r.info.p1Health < r.info.p1Max)
  info = await S('boutResult', 'p2'); r = await S('toNext')
  check('loss → retry prompt', r.info.stepType === 'retry' && r.info.loss)
  info = await S('confirm')
  check('retry → opponent 1 again, full health, Before not repeated', info.oppIndex === 0 && (info.stepType === 'fight' || info.stepKind === 'entrance') && (info.stepType !== 'fight' || info.p1Health === info.p1Max))
  await S('open', 'gojo'); await S('begin', 3); r = await S('toNext'); await S('boutResult', 'p1', 0.5); r = await S('toNext')   // 04: alt_sukuna → SUKUNA (rival R01)
  check('04 opponent 2 is Sukuna via the rival entrance', r.info.p2 === 'sukuna' && r.seen.some(x => x.entrance === 'rival' && x.speaker === 'sukuna'))
  await S('boutResult', 'p2'); r = await S('toNext')
  check('loss vs a rival → the opponent\'s winning line, then the retry prompt', r.seen.some(x => x.kind === 'lossLine' && x.speaker === 'sukuna') && r.info.stepType === 'retry', JSON.stringify(r.seen))
  await S('confirm')

  section('Skip Scene needs two presses; text speed')
  await S('open', 'gojo'); await S('begin', 2); await S('finishLine')
  const a0 = await S('info')
  await page.keyboard.press('Escape'); await wait(40)
  const a1 = await S('info')
  check('one skip press only arms Skip Scene', a1.step === a0.step && a1.line === a0.line && a1.gameState === 'storyScene')
  await page.keyboard.press('Escape'); await wait(40)
  const a2 = await S('info')
  check('second press skips the dialogue up to the fight', a2.stepType === 'fight' && a2.awaitingBout, JSON.stringify([a2.stepType, a2.gameState]))
  await S('boutResult', 'p1', 0.5)
  const typedAt = async sp => { await S('setSpeed', sp); await S('open', 'gojo'); await S('begin', 2); await S('confirm'); await wait(200); return S('info') }
  const ti = await typedAt('instant'), ts = await typedAt('slow')
  check('instant text speed reveals the whole line; slow types it out', ti.lineText && ti.typed === ti.lineText.length && ts.lineText && ts.typed < ts.lineText.length, `instant ${ti.typed}/${ti.lineText?.length} slow ${ts.typed}/${ts.lineText?.length}`)
  await S('setSpeed', 'normal')

  section('spoken voice')
  await page.evaluate(() => { const A = window.Audio; window.__srcs = []; window.Audio = function (src) { window.__srcs.push(String(src)); return new A(src) } })
  await S('open', 'gojo'); await S('begin', 1)
  let vi = await S('info')
  for (let i = 0; i < 20 && !vi.speaker; i++) vi = await S('confirm')
  check('a speaker line asks for its clip', vi.speaker && /^\.\/story_voice\/[a-z_A-Z0-9]+\/[0-9a-f]{8}\.m4a$/.test(vi.voice || ''), JSON.stringify([vi.speaker, vi.voice]))
  const fetched = await page.evaluate(async u => { const r = await fetch(u); return { ok: r.ok, n: (await r.arrayBuffer()).byteLength } }, vi.voice)
  check('the clip is served (real audio)', fetched.ok && fetched.n > 1000, JSON.stringify(fetched))
  check('the clip belongs to the line\'s speaker', vi.voice.includes(`/story_voice/${vi.speaker}/`))
  const srcs = await page.evaluate(() => window.__srcs)
  check('the game actually starts that clip (Audio element created for it)', srcs.some(x => x.endsWith(vi.voice.slice(1))), srcs.slice(-3).join(' | '))
  await S('resetSave'); await S('open', 'nezuko'); await S('begin', 0)   // fresh save → her Intro plays
  let ni = await S('info'); for (let i = 0; i < 40 && ni.speaker !== 'nezuko'; i++) ni = await S('confirm')
  check('silent fighter (Nezuko) lines ask for no clip', ni.speaker === 'nezuko' && ni.voice === null, JSON.stringify([ni.speaker, ni.voice]))
  await S('open', 'gojo')
  let vm = (await S('menuItems')).find(x => x.id === 'voice')
  check('story menu has VOICE: ON by default', vm?.label === 'VOICE: ON', vm?.label)
  await S('choose', 'voice'); vm = (await S('menuItems')).find(x => x.id === 'voice')
  check('VOICE toggles OFF and is saved', vm?.label === 'VOICE: OFF' && (await S('info')).save.voice === false)
  await page.evaluate(() => { window.__srcs = [] }); await S('begin', 1)
  for (let i = 0; i < 8; i++) await S('confirm')
  check('with VOICE OFF no story clip is started', !(await page.evaluate(() => window.__srcs)).some(x => x.includes('story_voice/')))
  await S('choose', 'voice')

  section('corrupt save → clean start')
  const cs = await page.evaluate(() => { localStorage.setItem('msv1_story_save_v1', '{{{broken'); return __harness.story.reloadSave() })
  check('corrupt localStorage save → clean save', cs.secretUnlocked === false && Object.keys(cs.fighters).length === 0 && cs.v === 1)

  section('determinism — seeded story fight (relay opponent 2, carried health)')
  const run = seed => page.evaluate(s => {
    const H = __harness, st = H.story
    st.open('gojo_shinjuku'); st.begin(1)
    H.rng.forceSeed(s); st.toNext()                    // bout 1 (seeded) → win at 50%
    st.boutResult('p1', 0.5)
    H.rng.forceSeed(s); st.toNext()                    // bout 2 (seeded, relay carry)
    H.skipToBattle()
    H.aiVsAi.step(900)
    const f = who => { const p = H[who](); return { x: +p.x.toFixed(4), y: +p.y.toFixed(4), health: p.health, energy: +(p.energy || 0).toFixed(4) } }
    const i = st.info()
    return { p1: f('p1'), p2: f('p2'), opp: i.oppIndex, carry: i.carryPct, seed: H.rng.seed() }
  }, seed)
  const d1 = await run(5151), d2 = await run(5151), d3 = await run(8080)
  check('same seed → identical state after 900 frames of a story relay bout', JSON.stringify(d1) === JSON.stringify(d2), `${JSON.stringify(d1)} vs ${JSON.stringify(d2)}`)
  check('different seed → diverged', JSON.stringify({ a: d1.p1, b: d1.p2 }) !== JSON.stringify({ a: d3.p1, b: d3.p2 }))
  check('the run was the relay opponent with the carry applied', d1.opp === 1 && Math.abs(d1.carry - 0.7) < 1e-9)
  await page.evaluate(() => __harness.story.boutResult('p1', 0.5))

  section('replay of a story relay bout')
  const rec = await page.evaluate(() => {
    const H = __harness, st = H.story
    st.open('gojo_shinjuku'); st.begin(1); st.toNext(); st.boutResult('p1', 0.5); st.toNext()
    H.skipToBattle(); H.aiVsAi.step(420)
    return H.replay.stopAndGet()
  })
  check('the story bout was recorded (mode story, 1 round, relay carry stored)', rec && rec.mode === 'story' && rec.rounds === 1 && Math.abs(rec.storyCarry - 0.7) < 1e-9, JSON.stringify({ mode: rec?.mode, rounds: rec?.rounds, carry: rec?.storyCarry }))
  check('the replay validates', (await page.evaluate(r => __harness.replay.validate(r), rec)).ok === true)
  const pb = await page.evaluate(r => {
    const H = __harness, ok = H.replay.play(r)
    H.skipToBattle()
    const story = H.story.info()
    H.aiVsAi.step((r.frameCount || 400) + 40)
    return { ok, playback: H.replay.isPlayback(), ps: H.replay.playbackState(), storyActive: story.active }
  }, rec)
  check('play() accepted, playback active, story run not driven by the replay', pb.ok?.ok === true && !pb.storyActive, JSON.stringify(pb.ok))
  check('replay checkpoints matched (zero desync)', pb.ps && pb.ps.checks >= 1 && pb.ps.desyncFrame === null && pb.ps.matched === pb.ps.checks, JSON.stringify(pb.ps))
  await page.evaluate(() => __harness.replay.stopPlayback())

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
} catch (e) { FAIL++; console.log('  ❌ FATAL', e.stack) }
finally {
  console.log(`\n${'═'.repeat(44)}\n  MSV1-STORY LIVE: ${PASS} passed, ${FAIL} failed\n${'═'.repeat(44)}`)
  await browser.close(); server.close()
  process.exit(FAIL ? 1 : 0)
}
