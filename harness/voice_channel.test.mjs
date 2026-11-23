// harness/voice_channel.test.mjs — ONE voice channel per character (sound.js playSfxFile), incl. the two gaps fixed
// 2026-11-23: (1) per-character voice layers (Omni-Man / Invincible / Teen Titans) now tag lines with the FIGHTER, so
// they share the channel with every other cue of that fighter; (2) an UNTAGGED clip from a character's own voice
// folder (intro / win lines, cues fired outside the fighter's update) joins the channel of the fighter last heard
// from that folder. Shared folders (announcer …) and OTHER characters are never cut.
//   node harness/voice_channel.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const server = await serve(), browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const page = await browser.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
await page.goto(server.base + '/index.html?harness=1&p1=raven&p2=robin&seed=5')
await page.waitForFunction(() => window.__harness?.omnimanViltrumTest)
try {
  const R = await page.evaluate(async () => {
    const { sound } = await import('./sound.js'); sound._gestured = true
    const { titanVo } = await import('./titansVoice.js')
    __harness.start(); const H = __harness.omnimanViltrumTest, a = H.raw(), b = H.raw('p2')
    const live = f => [...sound._activeSfx].some(e => String(e.audio.src).includes(f))
    const out = {}
    const RV = './assets/audio/titans/raven/', RB = './assets/audio/titans/robin/'
    // 1. engine cue owned by Raven (fighter object), then her voice layer's line → the first is cut (same channel)
    sound.stopAllSfx({ includePersistent: true })
    sound.playSfxFile(RV + 'tt_015.mp3', null, { owner: a })
    out.layerSharesChannel = (titanVo(a, 'ult'), !live('tt_015.mp3'))
    // 2. a Raven line, then an UNTAGGED clip from her folder (a win / intro line) → no overlap
    sound.stopAllSfx({ includePersistent: true }); sound.playSfxFile(RV + 'tt_015.mp3', null, { owner: a })
    sound.playSfxFile(RV + 'tt_066.mp3', null, { owner: null })
    out.untaggedJoins = !live('tt_015.mp3') && live('tt_066.mp3')
    // 3. … but Robin (another character) is never cut by Raven, tagged or untagged
    sound.stopAllSfx({ includePersistent: true }); sound.playSfxFile(RB + 'tt_005.mp3', null, { owner: b })
    sound.playSfxFile(RV + 'tt_015.mp3', null, { owner: a }); sound.playSfxFile(RV + 'tt_066.mp3', null, { owner: null })
    out.otherCharUntouched = live('tt_005.mp3')
    // 4. the announcer (shared folder) never joins a fighter's channel
    sound.stopAllSfx({ includePersistent: true }); sound.playSfxFile(RV + 'tt_015.mp3', null, { owner: a })
    sound.playSfxFile('./announcer_clips/announcer_001.mp3', null, { owner: null })
    out.announcerUntouched = live('tt_015.mp3')
    // 5. a new round forgets the folder → fighter mapping
    sound.stopAllSfx({ includePersistent: true }); out.mapCleared = sound._dirOwner.size === 0
    return out
  })
  ck("a Titan's voice-layer line shares the fighter's channel (cuts his / her own earlier line)", R.layerSharesChannel, JSON.stringify(R))
  ck('an untagged clip from the same character folder (intro / win line) cuts that character\'s line — no overlap', R.untaggedJoins, JSON.stringify(R))
  ck('another character is never cut', R.otherCharUntouched, JSON.stringify(R))
  ck('the announcer never joins a fighter channel', R.announcerUntouched, JSON.stringify(R))
  ck('stopAllSfx (new round / match) clears the folder map', R.mapCleared)
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
console.log(`\n  VOICE CHANNEL: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
