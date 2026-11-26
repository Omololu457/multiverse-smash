// harness/msv1_story_render.mjs — MSV1-STORY RENDER CHECK + screenshots (docs/msv1/story/screenshots/).
//   node harness/msv1_story_render.mjs [outdir]
// Drives the real story flow (window.__harness.story) to each moment and captures it; fails on page errors / 404s.
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const OUT = process.argv[2] || 'docs/msv1/story/screenshots'; fs.mkdirSync(OUT, { recursive: true })
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { if (c) { PASS++; console.log('  ✅', n) } else { FAIL++; console.log('  ❌', n, d) } }
const server = await serve()
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errors = [], missing = []
page.on('pageerror', e => errors.push(e.message))
page.on('response', r => { if (r.status() === 404 && /story|portrait|data\//i.test(r.url())) missing.push(r.url()) })
const S = (f, ...a) => page.evaluate(([f, a]) => __harness.story[f](...a), [f, a])
const wait = ms => page.waitForTimeout(ms)
const shot = async (name, ok, d) => { await page.screenshot({ path: `${OUT}/${name}.png` }); check(`${name}.png`, ok, d) }
// advance dialogue until pred(info) holds (or the dialogue runs out)
async function until(pred, max = 400) {
  for (let i = 0; i < max; i++) { const x = await S('info'); if (pred(x)) { await S('finishLine'); return x } if (x.gameState !== 'storyScene' || x.stepType !== 'lines') return null; await S('confirm') }
  return null
}
const winBouts = async n => { for (let i = 0; i < n; i++) { await S('toNext'); await S('boutResult', 'p1', 0.6) } }

try {
  await page.goto(`${server.base}/index.html?harness=1`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.story, null, { timeout: 30000 })
  await S('resetSave'); await S('setSpeed', 'normal')
  // screenshots only: P1 stands idle while a shot waits in a live bout — keep it above 35 % so a CPU can't KO it mid-capture
  await page.evaluate(() => setInterval(() => { const i = __harness.story.info(); if (i.gameState === 'battle' && i.awaitingBout && !i.lastWinner && i.p1Health < i.p1Max * 0.35) __harness.topUpP1Health() }, 50))

  // mode select with the STORY tile
  await S('open', 'gojo_shinjuku'); await S('choose', 'back'); await wait(700)
  await shot('01_mode_select_story_tile', (await S('info')).gameState === 'gameplaySelect')

  // menu
  await S('open', 'gojo_shinjuku'); await S('begin', 0); await S('toNext'); await S('boutResult', 'p1', 0.8); await S('toNext')   // 01 cleared → checkpoint 02
  await S('open', 'gojo_shinjuku'); await wait(700)
  await shot('02_story_menu', (await S('menuItems')).some(x => x.id === 'continue'))

  // dialogue with portrait (Act 1 Opening, Gojo speaking)
  await S('begin', 1)
  let x = await until(i => i.speaker === 'gojo'); await wait(500)
  await shot('03_dialogue_portrait', !!x, JSON.stringify(x?.lineText))

  // tutorial hints at 01 + relay-free first bout
  await S('begin', 0); await S('toNext'); await page.evaluate(() => __harness.skipToBattle())
  await page.waitForFunction(() => __harness.story.info().hudShown, null, { timeout: 15000, polling: 100 }).catch(() => {}); await wait(1200)   // after Genos's entrance cinematic
  await shot('04_tutorial_hints', (await S('info')).encId === '01')
  await S('boutResult', 'p1', 0.8)

  // BOSS banner (05)
  await S('begin', 4); await wait(900)
  x = await S('info'); await shot('05_boss_banner', x.card?.boss === true, JSON.stringify(x.card))

  // mirror (05: gojo_shinjuku vs gojo_shinjuku)
  await S('toNext'); await page.evaluate(() => __harness.skipToBattle()); await wait(1400)
  x = await S('info'); await shot('06_rift_mirror', x.p2 === 'gojo_shinjuku' && x.p2Skin !== x.playerSkin, `${x.p2} ${x.p2Skin}`)
  await S('boutResult', 'p1', 0.6)

  // relay HUD (09, Naruto, opponent 2 / 7)
  await S('open', 'naruto'); await S('begin', 8); await winBouts(1); await S('toNext'); await page.evaluate(() => __harness.skipToBattle()); await wait(1400)
  x = await S('info'); await shot('07_relay_hud', x.oppIndex === 1 && x.oppCount === 7, `${x.oppIndex}/${x.oppCount}`)
  await S('boutResult', 'p1', 0.6)

  // rival exchange (04: Gojo vs Sukuna, R01)
  await S('open', 'gojo'); await S('begin', 3); await S('toNext'); await S('boutResult', 'p1', 0.6)
  x = await until(i => i.stepKind === 'entrance' && i.speaker === 'sukuna'); await wait(500)
  await shot('08_rival_exchange', !!x, JSON.stringify(x?.lineText))

  // template exchange (12: Goku vs Mayuri — Dragon Ball × Bleach)
  await S('open', 'goku'); await S('begin', 11)
  x = await until(i => i.stepKind === 'entrance' && !!i.lineText); await wait(500)
  await shot('09_template_exchange', !!x && x.oppIndex === 0, JSON.stringify([x?.speaker, x?.lineText]))

  // second-map switch (17: Mugen Train → Infinity Castle at Rengoku's 50%)
  await S('open', 'gojo_shinjuku'); await S('begin', 16); await S('toNext'); await page.evaluate(() => __harness.skipToBattle()); await wait(600)
  await S('setP2HealthFrac', 0.45)
  await page.waitForFunction(() => __harness.story.info().secondMapAlpha >= 1, null, { timeout: 10000, polling: 100 }).catch(() => {}); await wait(300)
  x = await S('info'); await shot('10_second_map_switch', x.secondMap && x.secondMapAlpha >= 1 && !!x.caption, JSON.stringify([x.secondMap, x.secondMapAlpha, x.caption]))
  await S('boutResult', 'p1', 0.6)

  // Isshiki speech (after 35)
  await S('open', 'gojo_shinjuku'); await S('begin', 34); await winBouts(3)
  x = await until(i => i.speaker === 'isshiki' && i.stepKind === 'scene'); await wait(500)
  await shot('11_isshiki_speech', !!x, JSON.stringify(x?.lineText))

  // fight 36 half-health caption (non-pausing)
  await S('begin', 35); await S('toNext'); await page.evaluate(() => __harness.skipToBattle()); await wait(6500)   // Isshiki's own entrance card + voice line finish first
  await S('setP2HealthFrac', 0.45)
  await page.waitForFunction(() => __harness.story.info().midCueFired, null, { timeout: 10000, polling: 100 }).catch(() => {}); await wait(500)   // after Isshiki's own entrance cinematic
  x = await S('info'); await shot('12_isshiki_half_caption', x.midCueFired && x.gameState === 'battle' && /answering out of time/.test(x.caption || ''), JSON.stringify({ c: x.caption, gs: x.gameState, fired: x.midCueFired, hud: x.hudShown, p1: x.p1Health, p2: x.p2Health, p2Max: x.p2Max, lw: x.lastWinner, aw: x.awaitingBout, enc: x.encId }))
  await S('boutResult', 'p1', 0.6)

  // final ending (personal Ending lines)
  x = await until(i => i.stepKind === 'ending' && !!i.lineText); await wait(500)
  await shot('13_final_ending', !!x && x.speaker === 'gojo_shinjuku', JSON.stringify(x?.lineText))

  // credits narration + the credits roll
  x = await until(i => i.stepKind === 'credits' && !!i.lineText); await wait(500)
  await shot('14_credits_narration', !!x && !x.speaker, JSON.stringify(x?.lineText))
  await S('toNext'); await wait(2500)
  x = await S('info'); await shot('15_credits_roll', x.inCredits && x.gameState === 'credits')
  await S('creditsFinish'); await wait(700)

  // secret entry on the story menu
  x = await S('info'); await shot('16_secret_entry', x.gameState === 'storyMenu' && (await S('menuItems')).some(i => i.id === 'secret') && x.save.secretUnlocked)

  // retry prompt after a loss
  await S('begin', 1); await S('toNext'); await S('boutResult', 'p2'); await S('toNext'); await wait(600)
  x = await S('info'); await shot('17_retry_prompt', x.stepType === 'retry')
  await S('confirm')

  // silent fighter: Nezuko intro (italic, no voice) + unsigned rift display (Nezuko vs Killua template at 15)
  await S('resetSave'); await S('open', 'nezuko'); await S('begin', 0); await wait(300)
  x = await until(i => i.speaker === 'nezuko'); await wait(500)
  await shot('18_silent_fighter_italic', !!x, JSON.stringify(x?.lineText))
  await S('begin', 14)
  x = await until(i => i.stepKind === 'entrance' && !i.speaker && !!i.lineText); await wait(500)
  await shot('19_rift_display_unsigned', !!x, JSON.stringify(x?.lineText))

  // text wraps at any resolution: a 104-character line at a phone-like and a 1080p viewport
  for (const [w, h, name] of [[640, 360, '20_wrap_640x360'], [1920, 1080, '21_wrap_1920x1080']]) {
    await page.setViewportSize({ width: w, height: h }); await wait(400)
    await S('resetSave'); await S('open', 'gojo'); await S('begin', 21)
    x = await until(i => (i.lineText || '').length > 100)   // 104-char Act 6 Opening line; await wait(600)
    await shot(name, !!x, JSON.stringify(x?.lineText))
  }
  await page.setViewportSize({ width: 1280, height: 720 })

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  check('no story / portrait 404s', missing.length === 0, missing.slice(0, 3).join(' | '))
} catch (e) { FAIL++; console.log('  ❌ FATAL', e.stack) }
finally {
  console.log(`\n${'═'.repeat(44)}\n  MSV1-STORY RENDER CHECK: ${PASS} passed, ${FAIL} failed\n${'═'.repeat(44)}`)
  await browser.close(); server.close()
  process.exit(FAIL ? 1 : 0)
}
