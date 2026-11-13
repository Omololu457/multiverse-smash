// harness/zoro_buggy_skins_check.mjs — Zoro's 8 alt-colour skins + Buggy's Big Top Glitter: every skin applies and draws
// its recoloured sheets; Zoro's skin SURVIVES the Santoryu stance (zsIdle / zsLight come in the skin's colours), the
// sheathe back to base and a round reset; Big Top keeps its colours through Buggy's part-detach masked rows. Every
// recoloured file exists (no 404s), 0 page errors, and the default skins stay on the base sheets.
// Screenshots each skin (Zoro in Santoryu) to /tmp/ms-zoro-buggy-skins.
//   node harness/zoro_buggy_skins_check.mjs
import { chromium } from 'playwright'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SH = '/tmp/ms-zoro-buggy-skins'; fs.mkdirSync(SH, { recursive: true })
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav' }
const miss = [], served = new Set()
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? '/index.html' : u); fs.readFile(f, (e, d) => { if (e) { if (u.includes('__')) miss.push(u); rs.writeHead(404); rs.end(); return } if (u.includes('__')) served.add(u); rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); rs.end(d) }) }); s.listen(0, () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m) } else { fail++; console.log('  ❌', m) } }
const ZORO = { zoro_newworld: 'newworld', zoro_enma: 'enma', zoro_ashura: 'ashura', zoro_kuina: 'kuina', zoro_perona: 'perona',
  zoro_ben10: 'ben10', zoro_albedo: 'albedo', zoroAlienX: 'alienx' }

// Every sheet each generator recolours must exist for every skin.
const files = dir => fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.png') && !f.includes('__') && !f.startsWith('fx_'))
const ZSRC = files('assets/zoro')
for (const tag of Object.values(ZORO)) {
  const missing = ZSRC.filter(f => !fs.existsSync(path.join(ROOT, 'assets/zoro', f.replace(/\.png$/, `__${tag}.png`))))
  ok(missing.length === 0, `zoro ${tag}: all ${ZSRC.length} recoloured sheets on disk${missing.length ? ' — missing ' + missing.slice(0, 3).join(',') : ''}`)
}
const BSRC = [...files('assets/buggy').map(f => 'assets/buggy/' + f), ...files('assets/buggy/parts').map(f => 'assets/buggy/parts/' + f)]
const bmiss = BSRC.filter(f => !fs.existsSync(path.join(ROOT, f.replace(/\.png$/, '__bigtop.png'))))
ok(bmiss.length === 0, `buggy bigtop: all ${BSRC.length} recoloured sheets on disk${bmiss.length ? ' — missing ' + bmiss.slice(0, 3).join(',') : ''}`)

async function open(p1, p2, api) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }), errs = []
  page.on('pageerror', e => errs.push(String(e)))
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(a => !!window.__harness?.[a] && !!window.__harness?.net, api, { timeout: 15000 })
  await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {})
  const wf = async n => { const s = await page.evaluate(() => __harness.net.frame()); await page.waitForFunction(([a, b]) => __harness.net.frame() >= a + b, [s, n], { timeout: 15000, polling: 8 }) }
  await wf(6)
  return { page, errs, wf }
}

try {
  // ── ZORO ──
  console.log('ZORO')
  const Z = await open('zoro', 'sanji', 'zoroTest')
  const zs = () => Z.page.evaluate(() => { const f = __harness.zoroTest.raw('p1'); const a = f._skinAnim || f.animationData; return { idle: a.idle.sheet, light: a.light.sheet, tag: f._recolorTag, santo: !!f._zoro?.santoryu } })
  for (const [id, tag] of Object.entries(ZORO)) {
    console.log(`── ${id}`)
    await Z.page.evaluate(() => __harness.zoroTest.reset()); await Z.wf(2)
    const applied = await Z.page.evaluate(i => __harness.setSkin('p1', i), id); await Z.wf(3)
    let s = await zs()
    ok(applied === id && s.idle.endsWith(`/idle__${tag}.png`) && s.tag === tag, `applied → ${s.idle}`)
    // Santoryu for real (the form entry the A+B chord calls) → the stance set, still in the skin's colours.
    await Z.page.evaluate(async () => { const f = __harness.zoroTest.raw('p1'), Zs = await import('./zoroState.js'); f.energy = 100; __harness.zoroTest.set('p1', { santoryuCd: 0 }); Zs.enterSantoryu(f) })
    await Z.wf(4); s = await zs()
    ok(s.santo && s.idle.endsWith(`/zsIdle__${tag}.png`) && s.light.endsWith(`/zsLight__${tag}.png`), `Santoryu stance → ${s.idle}, ${s.light}`)
    await Z.page.screenshot({ path: path.join(SH, `${id}.png`) })
    await Z.page.evaluate(async () => { const f = __harness.zoroTest.raw('p1'), Zs = await import('./zoroState.js'); Zs.revertSantoryu(f, false) })
    await Z.wf(3); s = await zs()
    ok(!s.santo && s.idle.endsWith(`/idle__${tag}.png`), `sheathed → ${s.idle}`)
  }
  await Z.page.evaluate(() => __harness.zoroTest.reset()); await Z.wf(4)
  let s = await zs(); ok(s.idle.endsWith('/idle__alienx.png'), `round reset keeps the skin → ${s.idle}`)
  await Z.page.evaluate(() => __harness.setSkin('p1', 'default')); await Z.wf(3); s = await zs()
  ok(s.idle === './assets/zoro/idle.png' && !s.tag, `default skin → base sheets (${s.idle})`)
  await Z.page.evaluate(async () => { const f = __harness.zoroTest.raw('p1'), Zs = await import('./zoroState.js'); f.energy = 100; __harness.zoroTest.set('p1', { santoryuCd: 0 }); Zs.enterSantoryu(f) })
  await Z.wf(3); s = await zs(); ok(s.idle === './assets/zoro/zsIdle.png', `default skin Santoryu → base stance sheet (${s.idle})`)
  ok(Z.errs.length === 0, `zoro: 0 page errors (${Z.errs.slice(0, 2).join(' | ')})`)
  await Z.page.close()

  // ── BUGGY: Big Top Glitter ──
  console.log('BUGGY')
  const G = await open('buggy', 'zoro', 'buggyTest')
  await G.page.evaluate(() => __harness.buggyTest.reset()); await G.wf(2)
  const applied = await G.page.evaluate(() => __harness.setSkin('p1', 'buggy_bigtop')); await G.wf(3)
  let b = await G.page.evaluate(() => __harness.buggyTest.state('p1'))
  ok(applied === 'buggy_bigtop' && b.idleSheet?.endsWith('idle__bigtop.png'), `Big Top applied → ${b.idleSheet}`)
  await G.page.evaluate(() => __harness.buggyTest.hand('p1')); await G.wf(10)
  b = await G.page.evaluate(() => __harness.buggyTest.state('p1'))
  ok(b.idleSourceY > 0 && b.idleSheet?.endsWith('idle__bigtop.png'), `hand out → masked row (sourceY ${b.idleSourceY}) still Big Top`)
  ok(b.parts.some(p => p.type === 'buggy_hand'), 'detached hand live')
  await G.page.screenshot({ path: path.join(SH, 'buggy_bigtop.png') })
  const list = await G.page.evaluate(() => (window.__harness.skinList?.('buggy') || []).map(x => x.id ?? x))
  if (list.length) ok(list.includes('buggy_bigtop') && list.includes('buggyAlienX'), `Big Top listed with Buggy's other skins (${list.length})`)
  ok(G.errs.length === 0, `buggy: 0 page errors (${G.errs.slice(0, 2).join(' | ')})`)
  await G.page.close()
  ok(served.size >= 20, `recoloured sheets actually fetched by the game (${served.size})`)
} catch (e) { console.error('EXCEPTION', e); fail++ }
ok(miss.length === 0, `0 recolor 404s (${miss.slice(0, 3).join(', ')})`)
console.log(`\n════════════════════════════════════════\n  ZORO + BUGGY SKINS: ${pass} passed, ${fail} failed  · shots → ${SH}\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(fail ? 1 : 0)
