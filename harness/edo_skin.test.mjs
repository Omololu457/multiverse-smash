// harness/edo_skin.test.mjs — MSV1-EDO: the premade "Edo Tensei" skin in the REAL game (headless Chromium).
//   node harness/edo_skin.test.mjs [--root DIR] [--sim-only] [--shots]
// Checks (render check + match test + parity):
//   1. manual pick: a fighter with skinId <key>_edoTensei draws its __edo sheets (loaded, no 404 fallback, no page errors)
//   2. Tobirama's Edo Tensei summoning SASUKE while P2 IS SASUKE: Tobirama's vessel wears the Edo skin, P2 keeps its own
//      (per instance); revert restores Tobirama's own skin state; an ineligible vessel (beerus) keeps the live tint
//   3. the blood layer reads an Edo body as "crack:edo" (cracks, no blood)
//   4. SIM PARITY: same forced seed, AI vs AI, default skin vs Edo skin → identical fighter state (skins are render-only)
//   --render [--keys a,b]: section 1 only (the per-commit render check)
//   5. --sim-only prints the Tobirama-ult AI-vs-AI snapshot (run against the clean start tree and this tree: must match)
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const argv = process.argv.slice(2)
const ROOT = argv.includes('--root') ? path.resolve(argv[argv.indexOf('--root') + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BOOT = argv.includes('--boot'), SIM_ONLY = argv.includes('--sim-only'), SHOTS = argv.includes('--shots'), RENDER = argv.includes('--render')
const KEYS = argv.includes('--keys') ? argv[argv.indexOf('--keys') + 1].split(',') : ['sasuke', 'gojo', 'red_ranger_mmpr']
const SHOT_DIR = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'docs', 'msv1', 'edo', 'screenshots')
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.json': 'application/json', '.wav': 'audio/wav', '.ogg': 'audio/ogg' }
const served = [], missing = []
const server = await new Promise(r => {
  const s = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? '/index.html' : u)
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end() }
    fs.readFile(f, (err, data) => {
      if (u.includes('__edo')) (err ? missing : served).push(u)
      if (err) { res.writeHead(404); return res.end() }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); res.end(data)
    })
  }); s.listen(0, '127.0.0.1', () => r(s))
})
const base = `http://127.0.0.1:${server.address().port}`
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d ? `  — ${d}` : ''}`) }
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] })
const errs = [], warns = []

async function openPage(p1, p2) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errs.push(String(e)))
  page.on('console', m => { if (m.text().includes('[edo]')) warns.push(m.text()) })
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.boot, null, { timeout: 30000 })
  await page.mouse.click(640, 360)
  return page
}
const frame = page => page.evaluate(() => window.__harness.state().frame)
async function waitFrames(page, n) { const s = await frame(page); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }) }
const fighter = (page, who) => page.evaluate(w => { const f = window.__harness.juice.bloodFighter(w); return { key: f.rosterKey, skinId: f.skinId || null, tag: f._recolorTag || null, edoActive: !!f._edoActive, edoSkinned: !!f._edoSkinned, vessel: f._edoVessel || null, idleSheet: (f._skinAnim || f.animationData)?.idle?.sheet || null } }, who)

async function simSnapshot(page, p1, p2, skin1, skin2, frames, setup) {
  return page.evaluate(([p1, p2, s1, s2, n, setup]) => {
    const H = window.__harness
    H.rng.forceSeed(9091)
    H.aiVsAi.start({ p1, p2, matches: 1, speed: 1 })
    if (s1) H.setSkin('p1', s1)
    if (s2) H.setSkin('p2', s2)
    if (setup === 'tobi') { H.edoBackup.setBackup('sasuke', 'p1'); H.setP1Energy?.(200) }
    const out = []
    for (let i = 0; i < n; i += 100) {
      H.aiVsAi.step(100)
      const s = w => { const p = H[w](); return [+p.x.toFixed(3), +p.y.toFixed(3), p.health, +(p.energy || 0).toFixed(3)] }
      out.push([s('p1'), s('p2'), H.juice.bloodFighter('p1')._edoActive ? 'EDO:' + H.juice.bloodFighter('p1')._edoVessel : ''])
    }
    const f1 = H.juice.bloodFighter('p1')
    return { trace: out, edoSeen: !!f1._edoActive || !!f1._edoStash, tag1: f1._recolorTag || null }
  }, [p1, p2, skin1, skin2, frames, setup])
}

try {
  if (BOOT) {
    // plain render check: boot a real match, draw 60 frames, the canvas has pixels, no page errors
    const page = await openPage('sasuke', 'gojo')
    await page.evaluate(() => window.__harness.boot()); await waitFrames(page, 60)
    const lit = await page.evaluate(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] + d[i + 1] + d[i + 2] > 30) n++; return n })
    check('match renders (canvas drawn)', lit > 500, `lit samples ${lit}`)
    check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
    console.log(`\n  RENDER CHECK: ${PASS} passed, ${FAIL} failed`)
    await page.close()
  } else if (SIM_ONLY) {
    const page = await openPage('tobirama', 'sasuke')
    const r = await simSnapshot(page, 'tobirama', 'sasuke', null, null, 3000, 'tobi')
    console.log(JSON.stringify(r.trace))
    await page.close()
  } else {
    // 1. manual Edo pick
    console.log(`── 1. manual Edo Tensei skin (${KEYS.join(', ')})`)
    for (const k of KEYS) {
      const page = await openPage(k, 'netero')
      await page.evaluate(() => window.__harness.boot()); await waitFrames(page, 4)
      const id = await page.evaluate(k => window.__harness.setSkin('p1', `${k}_edoTensei`), k)
      await waitFrames(page, 30)
      const f = await fighter(page, 'p1')
      check(`${k}: skin applied`, id === `${k}_edoTensei` && f.tag === 'edo' && /__edo\.png$/.test(f.idleSheet || ''), `${id} tag=${f.tag} idle=${f.idleSheet}`)
      const ok = await page.evaluate(src => new Promise(res => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = src }), '/' + f.idleSheet.replace(/^\.\//, ''))
      check(`${k}: Edo idle sheet loads`, ok)
      const mode = await page.evaluate(() => window.__harness.juice.bloodFluid('p1'))
      check(`${k}: blood layer reads crack:edo`, mode === 'crack:edo', String(mode))
      if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.locator('canvas').first().screenshot({ path: path.join(SHOT_DIR, `manual_${k}.png`) }) }
      await page.close()
    }
    if (!RENDER) {
    // 2. Tobirama Edo Tensei → sasuke, P2 = sasuke (default skin)
    console.log('── 2. Tobirama summons SASUKE vs a SASUKE opponent (per-instance)')
    {
      const page = await openPage('tobirama', 'sasuke')
      await page.evaluate(() => window.__harness.boot()); await waitFrames(page, 6)
      const before = await fighter(page, 'p1')
      await page.evaluate(() => { const H = window.__harness; H.resetFighterInput?.('p1'); H.setP1Energy?.(200); H.resetUlt?.(); H.edoBackup.setBackup('sasuke') })
      await waitFrames(page, 3)
      await page.keyboard.down('u'); await waitFrames(page, 3); await page.keyboard.up('u'); await waitFrames(page, 3)
      await page.evaluate(() => { window.__harness.edoBackup.skipCine(); window.__harness.resetFighterInput?.('p1') })
      await waitFrames(page, 20)
      const a = await fighter(page, 'p1'), b = await fighter(page, 'p2')
      check('Tobirama is the reanimated sasuke', a.edoActive && a.vessel === 'sasuke' && a.key === 'sasuke', JSON.stringify(a))
      check('…wearing the Edo Tensei skin (premade sheets, no live tint)', a.tag === 'edo' && a.edoSkinned && /__edo\.png$/.test(a.idleSheet || ''), a.idleSheet)
      check('P2 sasuke keeps its OWN (default) skin', b.key === 'sasuke' && !b.tag && !/__edo/.test(b.idleSheet || ''), JSON.stringify(b))
      const mode = await page.evaluate(() => window.__harness.juice.bloodFluid('p1'))
      check('reanimated body: cracks, no blood', mode === 'crack:edo', String(mode))
      if (SHOTS) { fs.mkdirSync(SHOT_DIR, { recursive: true }); await page.evaluate(() => { window.__harness.setP1Pos?.(520, null); window.__harness.setP2X?.(760) }); await waitFrames(page, 20); await page.locator('canvas').first().screenshot({ path: path.join(SHOT_DIR, 'tobirama_sasuke_vs_sasuke.png') }) }
      await page.evaluate(() => window.__harness.edoBackup.revert()); await waitFrames(page, 6)
      const c = await fighter(page, 'p1')
      check('revert restores Tobirama and his own skin state', c.key === 'tobirama' && c.tag === before.tag && !c.edoSkinned && !c.edoActive, JSON.stringify(c))
      // ineligible vessel keeps the live tint path
      await page.evaluate(() => { const H = window.__harness; H.healP1?.(); H.resetFighterInput?.('p1'); H.setP1Energy?.(200); H.resetUlt?.(); H.edoBackup.setBackup('beerus') })
      await waitFrames(page, 3)
      await page.keyboard.down('u'); await waitFrames(page, 3); await page.keyboard.up('u'); await waitFrames(page, 3)
      await page.evaluate(() => { window.__harness.edoBackup.skipCine(); window.__harness.resetFighterInput?.('p1') })
      await waitFrames(page, 10)
      const d = await fighter(page, 'p1')
      check('ineligible vessel (beerus): no Edo skin, live tint kept', d.vessel === 'beerus' && d.edoActive && !d.edoSkinned && !d.tag, JSON.stringify(d))
      await page.close()
    }
    // 4. sim parity: default skin vs Edo skin
    console.log('── 3. SIM PARITY: default vs Edo skin, same seed, AI vs AI 1500 frames')
    {
      const page = await openPage('sasuke', 'gojo')
      const r1 = await simSnapshot(page, 'sasuke', 'gojo', 'default', 'default', 1500)
      const r2 = await simSnapshot(page, 'sasuke', 'gojo', 'sasuke_edoTensei', 'gojo_edoTensei', 1500)
      const r3 = await simSnapshot(page, 'sasuke', 'gojo', 'default', 'default', 1500)
      check('baseline reproduces (same seed, same skins)', JSON.stringify(r1.trace) === JSON.stringify(r3.trace))
      check('Edo skins → identical fighter state every 100 frames', JSON.stringify(r1.trace) === JSON.stringify(r2.trace), r2.tag1)
      await page.close()
    }
    }
    check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '))
    check('no missing Edo sheet requested (no fallback used)', missing.length === 0 && warns.length === 0, [...missing.slice(0, 3), ...warns.slice(0, 2)].join(' | '))
    console.log(`  (Edo sheets served: ${served.length})`)
    console.log(`\n  MSV1-EDO SKIN: ${PASS} passed, ${FAIL} failed`)
  }
} finally { await browser.close(); server.close() }
process.exit(FAIL ? 1 : 0)
