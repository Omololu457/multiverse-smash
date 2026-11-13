// harness/luffy_skins_check.mjs — Luffy's 9 alt-colour skins: every skin applies and draws its recoloured sheets (idle,
// the command strips, the portrait), SURVIVES a round reset, every recoloured file exists (no 404s), 0 page errors, and
// the default skin stays on the base sheets. Screenshots each skin to /tmp/ms-luffy-skins.
//   node harness/luffy_skins_check.mjs
import { chromium } from 'playwright'
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SH = '/tmp/ms-luffy-skins'; fs.mkdirSync(SH, { recursive: true })
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav' }
const miss = [], served = new Set()
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? '/index.html' : u); fs.readFile(f, (e, d) => { if (e) { if (u.includes('__')) miss.push(u); rs.writeHead(404); rs.end(); return } if (u.includes('/luffy/') && u.includes('__')) served.add(u); rs.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); rs.end(d) }) }); s.listen(0, () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(String(e)))
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m) } else { fail++; console.log('  ❌', m) } }
async function wf(n) { const s = await page.evaluate(() => __harness.net.frame()); await page.waitForFunction(([a, b]) => __harness.net.frame() >= a + b, [s, n], { timeout: 15000, polling: 8 }) }
const SKINS = { luffy_gear5: 'gear5', luffy_gear2: 'gear2', luffy_boundman: 'boundman', luffy_hancock: 'hancock', luffy_ace: 'ace',
  luffy_sabo: 'sabo', luffy_ben10: 'ben10', luffy_albedo: 'albedo', luffyAlienX: 'alienx' }
const SKIP = new Set(['fx_ring.png', 'source.png'])
const SRC = fs.readdirSync(path.join(ROOT, 'assets/sprites/luffy')).filter(f => f.endsWith('.png') && !f.includes('__') && !SKIP.has(f))
for (const tag of Object.values(SKINS)) {
  const missing = SRC.filter(f => !fs.existsSync(path.join(ROOT, 'assets/sprites/luffy', f.replace(/\.png$/, `__${tag}.png`))))
  ok(missing.length === 0, `${tag}: all ${SRC.length} recoloured sheets on disk${missing.length ? ' — missing ' + missing.slice(0, 3).join(',') : ''}`)
}
try {
  await page.goto(`${base}/index.html?harness=1&p1=luffy&p2=sanji`, { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.sanjiTest && !!window.__harness?.net, null, { timeout: 15000 })
  await page.mouse.click(640, 360)
  await page.evaluate(() => { __harness.start(); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {}); await wf(8)
  const list = await page.evaluate(() => (window.__harness.skinList?.('luffy') || []).map(s => s.id ?? s))
  if (list.length) ok(Object.keys(SKINS).every(id => list.includes(id)), `all 9 skins listed for Luffy (${list.length} incl. default)`)
  const sheetOf = () => page.evaluate(() => { const f = __harness.sanjiTest.raw('p1'); const a = f._skinAnim || f.animationData; return { key: f.rosterKey, idle: a.idle.sheet, cmd: a.lfCmd1?.sheet, light: a.light.sheet, tag: f._recolorTag } })
  for (const [id, tag] of Object.entries(SKINS)) {
    await page.evaluate(() => __harness.sanjiTest.reset()); await wf(2)
    const applied = await page.evaluate(i => __harness.setSkin('p1', i), id); await wf(3)
    let s = await sheetOf()
    ok(applied === id && s.key === 'luffy' && s.idle.endsWith(`/idle__${tag}.png`) && s.light.endsWith(`/light__${tag}.png`) && s.cmd?.endsWith(`/lfCmd1__${tag}.png`) && s.tag === tag, `${id} applied → ${s.idle}, ${s.cmd}`)
    await page.screenshot({ path: path.join(SH, `${id}.png`) })
    await page.evaluate(() => __harness.sanjiTest.reset()); await wf(4); s = await sheetOf()
    ok(s.idle.endsWith(`/idle__${tag}.png`), `${id} survives the round reset → ${s.idle}`)
  }
  await page.evaluate(() => __harness.setSkin('p1', 'default')); await wf(3)
  const d = await sheetOf()
  ok(d.idle === './assets/sprites/luffy/idle.png' && !d.tag, `default skin → base sheets (${d.idle})`)
  ok(served.size >= 9, `recoloured sheets actually fetched by the game (${served.size})`)
} catch (e) { console.error('EXCEPTION', e); fail++ }
ok(miss.length === 0, `0 recolor 404s (${miss.slice(0, 3).join(', ')})`)
ok(errs.length === 0, `0 page errors (${errs.slice(0, 2).join(' | ')})`)
console.log(`\n════════════════════════════════════════\n  LUFFY SKINS: ${pass} passed, ${fail} failed  · shots → ${SH}\n════════════════════════════════════════`)
await browser.close(); server.close(); process.exit(fail ? 1 : 0)
