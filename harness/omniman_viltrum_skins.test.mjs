// harness/omniman_viltrum_skins.test.mjs — MSV1-OMNIMAN phase 5: the premade Omni-Man (Viltrumite) skins (ported from
// the Sukuna (Shinjuku) skins test) + his draw scale (the default skin now carries OMV_SCALE) + the head icons.
// Selector (skins.js list + every sheet / portrait / fx loads), match (the body wears it), the sim is unchanged by a skin,
// glitter phase follows the SIM clock, rematch / replay keep the skin, LAN match-setup carries it, and the companion
// (friend's browser via the host's client manifest) is allowed to fetch every skin file.
//   node harness/omniman_viltrum_skins.test.mjs
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { makeMatchSetup, encode, decode } from '../net/protocol.js'
import { isClientPath } from '../net/clientManifest.mjs'
let pass = 0, fail = 0; const ck = (n, ok, d = '') => { ok ? pass++ : fail++; console.log(ok ? 'PASS' : 'FAIL', n, ok ? '' : d) }
const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message)); await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const E = (fn, a) => page.evaluate(fn, a), step = n => E(n => __harness.luffyTest.step(n), n)
const report = {}
async function boot(skin = 'default', p2 = 'homelander', seed = 77) {
  await page.goto(server.base + `/index.html?harness=1&p1=omniman_viltrum&p2=${p2}&seed=${seed}`)
  await page.waitForFunction(() => window.__harness?.omnimanViltrumTest, null, { timeout: 30000 })
  await E(o => { __harness.rng?.forceSeed?.(o.seed); __harness.start({ p1Skin: o.skin }); __harness.skipToBattle(); __harness.luffyTest.step(2) }, { skin, seed })
}
const look = () => E(() => { const f = __harness.omnimanViltrumTest.raw('p1'); return { skin: f.skinId, idle: (f._skinAnim || f.animationData).idle.sheet, scale: f.spriteScale } })
try {
  await boot()
  // ── selector ──
  const sk = await E(async () => { const m = await import('./skins.js'); const L = m.SKINS.omniman_viltrum || []; const bad = []; let n = 0
    for (const s of L.slice(1)) { if (!s.id.startsWith('omv_')) continue
      const tag = s.id.slice(4), urls = new Set([s.portrait, ...(s.icons || []), ...Object.values(s.animationData).map(d => d?.sheet).filter(Boolean)])
      if (s.glitter) for (const p of [1, 2]) for (const d of Object.values(s.animationData)) if (d?.sheet?.includes('/skins/')) urls.add(d.sheet.replace(`/skins/${tag}/`, `/skins/${tag}/p${p}/`))
      for (const u of urls) { n++; const r = await fetch(u); if (!r.ok) bad.push(u) } }
    return { ids: L.map(s => s.id), names: L.map(s => s.name), glitter: L.filter(s => s.glitter).map(s => s.id), scales: [...new Set(L.map(s => s.spriteScale))], urls: n, bad } })
  report.skins = sk.names
  const mine = sk.ids.filter(i => i.startsWith('omv_'))
  const WANT = Number(process.env.OMV_SKINS || 22)   // 2026-11-23: + Show Accurate + Grand Regent (owner: real Viltrumite looks)
  ck(`selector: default + ${WANT} omv_* skins, Viltrumite Imperial Uniform first after the default, (none end in "AlienX" or contain "cyborg")`, sk.ids[0] === 'default' && (WANT === 0 || sk.ids[1] === 'omv_imperial') && mine.length === WANT && mine.every(i => !/AlienX$/.test(i) && !/cyborg/i.test(i)), JSON.stringify(sk.ids))
  ck(`every skin sheet, glint phase, portrait and head icon loads (${sk.urls} urls)`, !sk.bad.length, sk.bad.slice(0, 4).join(','))
  // ── match + sim unchanged ──
  const script = async skin => { await boot(skin); const out = []
    const keys = ['d', null, 'j', null, 'k', 'l', null, 'a', null, 'i', null, 'j']
    for (let i = 0; i < 150; i++) { const k = keys[Math.floor(i / 12) % keys.length]; if (k && i % 12 === 0) await page.keyboard.down(k); if (k && i % 12 === 4) await page.keyboard.up(k)
      await step(1); if (i % 8 === 0) out.push(await E(() => { const a = __harness.omnimanViltrumTest.raw('p1'), b = __harness.omnimanViltrumTest.raw('p2'); return [Math.round(a.x), Math.round(a.y), a.health, b.health, a.currentAttack?.name || '', Math.round(a.energy * 100)] })) }
    return { out, look: await look() } }
  const base = await script('default')
  ck('the default skin draws him at OMV_SCALE ×2 (it was ×1 through getSkins\' generic fallback) — every skin carries ×2', base.look.scale === 2 && sk.scales.length === 1 && sk.scales[0] === 2, JSON.stringify({ look: base.look, scales: sk.scales }))
  const pick = [mine[0], mine.find(i => sk.glitter.includes(i)), mine[Math.floor(mine.length / 2)], mine[mine.length - 1]].filter((v, i, a) => v && a.indexOf(v) === i)
  for (const id of pick) {
    const r = await script(id)
    ck(`${id}: the body wears it in a match (idle sheet from its folder)`, r.look.skin === id && r.look.idle.includes('/skins/' + id.slice(4) + '/'), JSON.stringify(r.look))
    ck(`${id}: same inputs → identical sim (positions, HP, moves, energy) vs default`, JSON.stringify(r.out) === JSON.stringify(base.out))
  }
  // ── glitter: phase = floor(sim clock / 8) mod 3 ──
  const gl = sk.glitter.find(i => i.startsWith('omv_'))
  if (gl) {
    await boot(gl, 'homelander', 5)
    await step(2); await new Promise(r => setTimeout(r, 2000))   // first draw queues every phase's sheets; a swap waits until the next phase has decoded (never blanks)
    const ph = []; for (let i = 0; i < 40; i++) { await step(1); await E(() => { __harness.renderFrame?.(); return 1 }); ph.push(await E(() => { const f = __harness.omnimanViltrumTest.raw('p1'); return [f._omv.clock, f._omvGlintPhase ?? null, (f._skinAnim?.idle?.sheet || '').replace(/.*skins\//, '')] })) }
    const okPhase = ph.filter(r => r[1] != null).every(r => r[1] === Math.floor(r[0] / 8) % 3) && new Set(ph.map(r => r[2])).size >= 2
    report.glitter = ph.slice(0, 12)
    ck(`${gl}: glint phase = floor(sim clock / 8) mod 3, the sheet folder follows it`, okPhase, JSON.stringify(ph.slice(0, 8)))
  }
  // ── head icons + effect palette follow the equipped skin ──
  const hi = await E(async () => { const m = await import('./omnimanViltrumSkins.js'); const f = __harness.omnimanViltrumTest.raw('p1')
    return { icon: m.omvSkinIcon(f, 1), pal: m.omvSkinPal(f).cape, def: m.OMV_DEFAULT_PAL.cape, skin: f.skinId } })
  ck('head icon + fx palette follow the equipped skin', hi.icon.includes('/skins/') && hi.pal !== hi.def, JSON.stringify(hi))
  // ── replay: the recording carries the skin; playback wears it ──
  const id = pick[pick.length - 1]
  await boot(id); await step(60)
  const rep = await E(() => __harness.replay.stopAndGet())
  report.replayMeta = rep ? { p1Char: rep.p1Char, p1Skin: rep.p1Skin } : null
  ck('replay: the recording stores p1Char / p1Skin', rep?.p1Skin === id && rep?.p1Char === 'omniman_viltrum', JSON.stringify(report.replayMeta))
  const played = await E(r => { const o = __harness.replay.play(r); __harness.luffyTest.step(3); const f = __harness.omnimanViltrumTest.raw('p1'); return { ok: o?.ok ?? !!o, skin: f.skinId, key: f.rosterKey } }, rep)
  ck('replay playback: P1 wears the same skin', played.skin === id && played.key === 'omniman_viltrum', JSON.stringify(played))
  await E(() => __harness.replay.stopPlayback?.())
  // ── rematch: the real results-screen / pause path (_doRematch) keeps the fighters and their skin ──
  await boot(id); await step(30)
  const re = await E(() => { __harness.ben10Reset('rematch'); __harness.luffyTest.step(3); const f = __harness.omnimanViltrumTest.raw('p1'); return { skin: f.skinId, key: f.rosterKey, idle: (f._skinAnim || f.animationData).idle.sheet } })
  ck('rematch (_doRematch) keeps the skin', re.skin === id && re.idle.includes('/skins/' + id.slice(4) + '/'), JSON.stringify(re))
  // ── LAN: the match-setup message carries the skin across the wire ──
  const msg = decode(encode(makeMatchSetup({ seed: 1, p1Char: 'omniman_viltrum', p1Skin: id, p2Char: 'homelander', p2Skin: 'default', stage: 'x', mode: 'vs', rounds: 3 })))
  const m = msg?.meta || msg?.payload || msg
  ck('LAN: match-setup round-trips p1Char / p1Skin', JSON.stringify(m).includes(id) && JSON.stringify(m).includes('omniman_viltrum'), JSON.stringify(m).slice(0, 200))
  // ── companion (a friend's browser through the host): every skin file is client content once tracked ──
  let files = []; try { files = execFileSync('git', ['ls-files', 'assets/omniman_viltrum/skins'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n').filter(Boolean) } catch (_) { }   // (informational; the scratch test tree is not a repo)
  const disk = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; e.isDirectory() ? walk(p) : disk.push(p) } }
  if (fs.existsSync('assets/omniman_viltrum/skins')) walk('assets/omniman_viltrum/skins')
  ck('companion: every skin file on disk is a client path the host serves', disk.length > 0 && disk.every(isClientPath), disk.filter(p => !isClientPath(p)).slice(0, 3).join(','))
  report.trackedSkinFiles = files.length; report.diskSkinFiles = disk.length
} catch (e) { console.log('ERROR', e.stack); fail++ }
ck('no page errors', !errs.length, errs.slice(0, 3).join(' | '))
fs.writeFileSync('docs/msv1/omniman/skins_results.json', JSON.stringify({ pass, fail, report }, null, 1))
console.log(`\n  OMNIMAN_VILTRUM SKINS: ${pass} passed, ${fail} failed`)
await browser.close(); server.close?.(); process.exit(fail ? 1 : 0)
