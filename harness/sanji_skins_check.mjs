// harness/sanji_skins_check.mjs — Sanji's 10 alt-colour skins: every skin applies and draws its recoloured sheets,
// SURVIVES the Diable Jambe swap (the lit *_dj strips come in the skin's colours), the round reset and a match-end
// win pose, the skinned fire FX draw without error (incl. Kamabakka's glitter), and every recoloured file exists
// (no 404s). The default skin stays on the base sheets. Screenshots each skin with the leg lit.
//   node harness/sanji_skins_check.mjs
import { chromium } from 'playwright'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SH = '/tmp/ms-sanji-skins'; fs.mkdirSync(SH, { recursive: true })
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav' }
const miss = [], served = new Set()
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? '/index.html' : u); fs.readFile(f, (e, d) => { if (e) { if (u.includes('__')) miss.push(u); rs.writeHead(404); rs.end(); return } if (u.includes('/sanji/') && u.includes('__')) served.add(u); rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); rs.end(d) }) }); s.listen(0, () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(String(e)))
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m) } else { fail++; console.log('  ❌', m) } }
const frame = () => page.evaluate(() => __harness.net.frame())
async function wf(n) { const s = await frame(); await page.waitForFunction(([a, b]) => __harness.net.frame() >= a + b, [s, n], { timeout: 15000, polling: 8 }) }
const SKINS = { sanji_stealth: 'stealth', sanji_ifrit: 'ifrit', sanji_wedding: 'wedding', sanji_sangoro: 'sangoro', sanji_kamabakka: 'kamabakka',
  sanji_ichiji: 'ichiji', sanji_reiju: 'reiju', sanji_ben10: 'ben10', sanji_albedo: 'albedo', sanjiAlienX: 'alienx' }
// Every sheet the generator recolours must exist for every skin (fx_* plates / glass keep their colours).
const SRC = fs.readdirSync(path.join(ROOT, 'assets/sanji')).filter(f => f.endsWith('.png') && !f.includes('__') && !f.startsWith('fx_'))
for (const tag of Object.values(SKINS)) {
  const missing = SRC.filter(f => !fs.existsSync(path.join(ROOT, 'assets/sanji', f.replace(/\.png$/, `__${tag}.png`))))
  ok(missing.length === 0, `${tag}: all ${SRC.length} recoloured sheets on disk${missing.length ? ' — missing ' + missing.slice(0, 3).join(',') : ''}`)
}
try {
  await page.goto(`${base}/index.html?harness=1&p1=sanji&p2=zoro`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.sanjiTest && !!window.__harness?.net, null, { timeout: 15000 })
  await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {}); await wf(8)
  const list = await page.evaluate(() => (window.__harness.skinList?.('sanji') || []).map(s => s.id ?? s))
  if (list.length) ok(Object.keys(SKINS).every(id => list.includes(id)), `all 10 skins listed for Sanji (${list.length} incl. default)`)
  const sheetOf = () => page.evaluate(() => { const f = __harness.sanjiTest.raw('p1'); const a = f._skinAnim || f.animationData; return { idle: a.idle.sheet, collier: a.sCollier.sheet, mouton: a.sMouton.sheet, tag: f._recolorTag } })
  for (const [id, tag] of Object.entries(SKINS)) {
    console.log(`── ${id}`)
    await page.evaluate(() => __harness.sanjiTest.reset()); await wf(2)
    const applied = await page.evaluate(i => __harness.setSkin('p1', i), id); await wf(3)
    let s = await sheetOf()
    ok(applied === id && s.idle.endsWith(`idle__${tag}.png`) && s.tag === tag, `applied → ${s.idle}`)
    // Diable Jambe lit for real (the sIgnite move) → the *_dj strips, still in the skin's colours.
    await page.evaluate(async () => { const t = __harness.sanjiTest, f = t.raw('p1'), { startMove } = await import('./combat.js'), S = await import('./sanjiState.js')
      f.energy = 100; S.sanjiStartMove(f, 'sIgnite', startMove) })
    for (let i = 0; i < 80 && !((await page.evaluate(() => __harness.sanjiTest.raw('p1')._sanji?.dj)) > 0); i++) await wf(1)
    await wf(4); s = await sheetOf()
    ok(s.mouton.endsWith(`sMouton_dj__${tag}.png`) && s.collier.endsWith(`sCollier__${tag}.png`), `leg lit → ${s.mouton}`)   // the DJ set swaps 7 strips (Mouton, Côtelette, …)
    await page.screenshot({ path: path.join(SH, `${id}.png`) })
    // Round reset (douses the leg) → back to the skin's base strips.
    await page.evaluate(() => __harness.sanjiTest.reset()); await wf(4); s = await sheetOf()
    ok(s.mouton.endsWith(`sMouton__${tag}.png`) && s.idle.endsWith(`idle__${tag}.png`), `reset (leg doused) → ${s.mouton}`)
  }
  // Win pose keeps the skin (the win-variant sets retag too).
  await page.evaluate(() => { const f = __harness.sanjiTest.raw('p1'); f._forceAction = 'win'; f._sjWinVar = 3 })
  await page.evaluate(async () => { const S = await import('./sanjiState.js'); const f = __harness.sanjiTest.raw('p1'); f._skinAnim = S.sanjiAnimSet(f) })
  const win = await page.evaluate(() => __harness.sanjiTest.raw('p1')._skinAnim.win.sheet)
  ok(win.endsWith('winGlass__alienx.png'), `win variant 3 keeps the skin → ${win}`)
  await page.evaluate(() => { const f = __harness.sanjiTest.raw('p1'); f._forceAction = null; f._sjWinVar = 0 })
  // Default → base sheets (byte-identical behaviour for the default skin).
  await page.evaluate(() => __harness.setSkin('p1', 'default')); await page.evaluate(() => __harness.sanjiTest.reset()); await wf(3)
  const d = await sheetOf()
  ok(d.idle === './assets/sanji/idle.png' && d.collier === './assets/sanji/sCollier.png' && !d.tag, `default skin → base sheets (${d.idle})`)
  ok(served.size >= 20, `recoloured sheets actually fetched by the game (${served.size})`)
} catch (e) { console.error('EXCEPTION', e); fail++ }
ok(miss.length === 0, `0 recolor 404s (${miss.slice(0, 3).join(', ')})`)
ok(errs.length === 0, `0 page errors (${errs.slice(0, 2).join(' | ')})`)
console.log(`\n════════════════════════════════════════\n  SANJI SKINS: ${pass} passed, ${fail} failed  · shots → ${SH}\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(fail ? 1 : 0)
