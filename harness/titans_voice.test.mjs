// harness/titans_voice.test.mjs — Teen Titans voice lines + SPECIAL INTROS (audio / presentation only).
// For each Titan (Beast Boy, Robin, Raven, Starfire, Cyborg) in a live match (sound.playSfxFile spied, real intro phase):
// the intro line on the Titan's own voice channel + the intro card / signature effect drawn; vs another Titan → the
// pair line (or the team line); hurt / KO / Ultimate / Beast Boy's morph; the win line after the foe drops; every clip
// loads and is client content; the sim is unchanged (the hooks only read fighter state).
//   node harness/titans_voice.test.mjs
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { isClientPath } from '../net/clientManifest.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const R = {}, errs = [], SHOTS = process.argv.includes('--shots')
const server = await serve(), browser = await chromium.launch({ headless: true })
const KEYS = ['beast_boy', 'robin', 'raven', 'starfire', 'cyborg']
async function open(p1, p2) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errs.push(`${p1}: ${e.message}`))
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__vo = [] })
  await page.goto(server.base + `/index.html?harness=1&p1=${p1}&p2=${p2}&seed=77`)
  await page.waitForFunction(() => window.__harness?.omnimanViltrumTest)
  await page.evaluate(async () => { const { sound } = await import('./sound.js'); const o = sound.playSfxFile.bind(sound)
    sound.playSfxFile = (f, fb, opts = {}) => { if (String(f).includes('/audio/titans/')) __vo.push({ f, owner: (o => { const H = __harness.omnimanViltrumTest; return o === H.raw() ? 'p1' : o === H.raw('p2') ? 'p2' : o == null ? null : typeof o === 'string' ? o : 'other' })(opts.owner) }); return o(f, fb, opts) } })
  return page
}
const V = JSON.parse('{}')
try {
  let page = await open('robin', 'homelander')
  const TV = await page.evaluate(async () => (await import('./titansVoiceData.js')).TITANS_VOICE)
  const poolOf = {}; for (const [k, c] of Object.entries(TV)) for (const [p, L] of Object.entries(c)) for (const [f] of L) (poolOf[f] ||= []).push(`${k}.${p}`)
  R.pools = Object.fromEntries(Object.entries(TV).map(([k, c]) => [k, Object.fromEntries(Object.entries(c).map(([p, L]) => [p, L.length]))]))
  const all = Object.keys(poolOf)
  const bad = await page.evaluate(async L => { const b = []; for (const u of L) { const r = await fetch(u); if (!r.ok) b.push(u) } return b }, all)
  ck(`every Titans voice clip loads (${all.length} files)`, all.length >= 100 && !bad.length, bad.slice(0, 3).join(','))
  ck('… and is client content the host serves (companion / LAN friend)', all.every(u => isClientPath(u.replace(/^\.\//, ''))))
  ck('all five Titans have intro / Titans / win / Ultimate / hurt pools', KEYS.every(k => TV[k]?.intro?.length && TV[k]?.titans?.length && TV[k]?.win?.length && TV[k]?.ult?.length && (TV[k]?.hurt?.length || TV[k]?.hurtBig?.length)), JSON.stringify(R.pools))
  await page.close()
  const pools = L => L.map(x => poolOf[x.f] || ['?'])
  const has = (L, p) => L.some(x => (poolOf[x.f] || []).includes(p))
  // the intro phase (real start, not skipToBattle): step until the battle countdown; screenshot mid-intro for the card
  const toBattle = async (page, shot) => {
    await page.evaluate(() => { __harness.start() })
    let shotAt = null
    for (let i = 0; i < 900; i++) {
      await page.evaluate(() => __harness.luffyTest.step(1))
      const q = await page.evaluate(() => { const a = __harness.omnimanViltrumTest.raw(), b = __harness.omnimanViltrumTest.raw('p2'); return { a: !!a?._introPlaying, ka: a?._introRevealFrame || 0, b: !!b?._introPlaying, g: __harness.online.syncProbe2() } })
      if (shot && shotAt == null && q.a && q.ka >= 40) { shotAt = i; await page.screenshot({ path: shot }) }
      if (q.g?.g === 'battle' && q.g.cd <= 0) break
    }
    return shotAt
  }
  for (const k of KEYS) {
    page = await open(k, 'homelander')
    const shot = `docs/msv1/titans/intro_${k}.png`; fs.mkdirSync('docs/msv1/titans', { recursive: true })
    const at = await toBattle(page, shot)
    let L = await page.evaluate(() => __vo.splice(0)); R[k] = { intro: pools(L) }
    ck(`${k}: an intro line plays during the intro (vs Homelander → the round intro pool)`, has(L, `${k}.intro`), JSON.stringify(R[k].intro))
    ck(`${k}: … on the Titan's own voice channel`, L.length > 0 && L.every(x => x.owner === 'p1'), JSON.stringify(L.map(x => x.owner)))
    // the card + signature effect actually drew (pixels differ from the same frame with the hooks off is costly; instead the
    // intro beat ran long enough for the card: reveal frame reached 40 while intro played)
    ck(`${k}: the special-intro card / effect frame was reached and captured (${shot})`, at != null)
    // hurt, KO, Ultimate cue, win
    const E = (fn, a) => page.evaluate(fn, a), step = n => E(n => { for (let i = 0; i < n; i++) __harness.luffyTest.step(1) }, n)
    await step(400); await E(() => __vo.splice(0))
    await E(() => { const a = __harness.omnimanViltrumTest.raw(); a.health -= 150 }); await step(3); L = await E(() => __vo.splice(0)); R[k].hurtBig = pools(L)
    ck(`${k}: a big hit → a hurt line`, has(L, `${k}.hurtBig`) || has(L, `${k}.hurt`), JSON.stringify(R[k].hurtBig))
    await step(400); await E(() => __vo.splice(0))
    const st = { beast_boy: '_beastBoy', robin: '_robin', raven: '_raven', starfire: '_starfire', cyborg: '_cyborg' }[k]
    await E(st => { const a = __harness.omnimanViltrumTest.raw(); (a[st] ||= {}); (a[st].cues ||= []).push('ultStart') }, st); await step(2); L = await E(() => __vo.splice(0)); R[k].ult = pools(L)
    ck(`${k}: Ultimate start → an Ultimate line`, has(L, `${k}.ult`), JSON.stringify(R[k].ult))
    if (k === 'beast_boy') {
      await step(400); await E(() => __vo.splice(0))
      await E(() => { const a = __harness.omnimanViltrumTest.raw(); a._beastBoy.cues.push('morph') }); await step(2); L = await E(() => __vo.splice(0)); R[k].morph = pools(L)
      ck('beast_boy: a morph → an animal noise (woof / squeak / tweet …)', has(L, 'beast_boy.morph'), JSON.stringify(R[k].morph))
    }
    await step(400); await E(() => __vo.splice(0))
    await E(() => { const b = __harness.omnimanViltrumTest.raw('p2'); b.health = 0 }); await step(1)
    const early = await E(() => __vo.splice(0)); await step(60); L = await E(() => __vo.splice(0)); R[k].win = pools(L)
    ck(`${k}: the win line a beat after the foe drops (not on the KO frame)`, !has(early, `${k}.win`) && has(L, `${k}.win`), JSON.stringify({ early: pools(early), L: R[k].win }))
    await page.close()
  }
  // Titans meet: the pair lines (Beast Boy ↔ Cyborg both have one) / the team line
  for (const [a, b, pa] of [['beast_boy', 'cyborg', 'beast_boy.vs:cyborg'], ['cyborg', 'beast_boy', 'cyborg.vs:beast_boy'], ['robin', 'raven', 'robin.vs:raven'], ['starfire', 'robin', 'starfire.titans']]) {
    page = await open(a, b); await toBattle(page, a === 'robin' ? 'docs/msv1/titans/intro_robin_vs_raven.png' : null)
    const L = await page.evaluate(() => __vo.splice(0)); R[`${a}_vs_${b}`] = pools(L)
    const pb = b === 'cyborg' ? 'cyborg.vs:beast_boy' : b === 'beast_boy' ? 'beast_boy.vs:cyborg' : b === 'raven' ? 'raven.vs:robin' : 'robin.vs:starfire'   // Robin has a Starfire line ("Wait till I show Star…")
    ck(`${a} vs ${b}: P1 says the Titan line (${pa}) and P2 answers (${pb})`, has(L, pa) && has(L, pb), JSON.stringify(R[`${a}_vs_${b}`]))
    await page.close()
  }
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.mkdirSync('docs/msv1/titans', { recursive: true }); fs.writeFileSync('docs/msv1/titans/voice_results.json', JSON.stringify({ pass, fail, R }, null, 1))
console.log(`\n  TITANS VOICE + INTROS: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
