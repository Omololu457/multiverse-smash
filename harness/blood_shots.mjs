// harness/blood_shots.mjs — MSV1-BLOOD screenshots in the REAL game (docs/msv1/blood/screenshots/):
// one fighter at each tier, slash vs blunt, a floor pool, an oil robot, an Edo Tensei crack, a Ranger suit.
//   node harness/blood_shots.mjs        (then tools/bloodmap/crop_shots.py crops + composes them)
// Training match vs a standing dummy; the dummy's health is held at the wanted level and real hits are fed through
// the same bloodHit() path the game uses (same module instance as the game's).
import { chromium } from 'playwright'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'docs/msv1/blood/screenshots/raw'); fs.mkdirSync(OUT, { recursive: true })
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.css': 'text/css', '.jpg': 'image/jpeg' }
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u === '/' ? '/index.html' : u); if (!f.startsWith(ROOT)) return res.writeHead(403).end(); fs.readFile(f, (e, d) => { if (e) return res.writeHead(404).end(); res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ headless: true })
const errs = []
const meta = {}
async function shot(name, p2, frac, hits, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', e => errs.push(`${name}: ${e.message}`))
  await page.goto(`${base}/index.html?harness=1&p1=${opts.p1 || 'netero'}&p2=${p2}`, { waitUntil: 'load' })
  await page.waitForFunction(() => window.__harness?.boot, null, { timeout: 30000 })
  await page.evaluate(() => { window.__harness.boot(); window.__harness.setDummyBehavior('stand') })
  await page.waitForTimeout(1500)
  const info = await page.evaluate(async ([frac, hits, still]) => {
    const H = window.__harness, B = await import('/battleBlood.js')
    H.juice.setBloodLevel('full')
    const f = H.juice.bloodFighter("p2"), p = H.juice.bloodFighter("p1")
    p.x = f.x - 420   // p1 out of the way
    const hold = () => { f.health = Math.max(1, Math.round(f.maxHealth * (1 - frac))) }
    hold(); window.__bloodHold = setInterval(hold, 16)
    for (let i = 0; i < hits.length; i++) {
      const [ry, type, dmg] = hits[i]
      B.bloodHit({ target: f, attacker: p, x: f.x + f.w * 0.5, y: f.y + f.h * ry, damage: dmg || 50, damageType: type, frame: H.state().frame + i })
    }
    return { key: f.rosterKey, fluid: H.juice.bloodFluid('p2') }
  }, [frac, hits, !!opts.still])
  await page.waitForTimeout(opts.wait || 2500)   // trickles grow in, drips fall
  const st = await page.evaluate(() => ({ blood: window.__harness.juice.blood(), rect: window.__harness.screenRect('p2'), cw: document.querySelector('canvas').width, ch: document.querySelector('canvas').height }))
  await page.locator('canvas').first().screenshot({ path: path.join(OUT, `${name}.png`) })
  meta[name] = { ...info, tier: st.blood.slots.p2?.tier, wounds: st.blood.slots.p2?.wounds, decals: st.blood.decals, decalKinds: st.blood.decalKinds, rect: st.rect, cw: st.cw, ch: st.ch }
  console.log(`  ${name.padEnd(18)} ${info.key} fluid ${info.fluid} tier ${meta[name].tier} wounds ${meta[name].wounds?.length} decals ${st.blood.decals}`)
  await page.close()
}
const ALL = [[0.08, 'blunt'], [0.12, 'slash'], [0.4, 'blunt'], [0.45, 'slash'], [0.5, 'projectile'], [0.75, 'slash'], [0.9, 'blunt']]
console.log('── tiers')
for (const [t, frac] of [[0, 0.04], [1, 0.16], [2, 0.35], [3, 0.57], [4, 0.85]]) await shot(`tier${t}`, 'aoi_todo', frac, frac < 0.08 ? [] : ALL.slice(0, 2 + t))
console.log('── slash vs blunt (tier 2)')
await shot('slash', 'aoi_todo', 0.35, [[0.12, 'slash'], [0.4, 'slash'], [0.5, 'slash'], [0.45, 'slash'], [0.75, 'slash']])
await shot('blunt', 'aoi_todo', 0.35, [[0.08, 'blunt'], [0.1, 'blunt'], [0.4, 'blunt'], [0.5, 'blunt'], [0.75, 'blunt']])
console.log('── floor pool (tier 4, standing still ~10 s)')
await shot('pool', 'aoi_todo', 0.93, ALL, { wait: 10000 })
console.log('── fluids')
await shot('oil_genos', 'genos', 0.92, ALL, { wait: 4000 })
await shot('edo_madara', 'madara', 0.92, ALL, { wait: 4000 })
await shot('ranger_spd_red', 'spd_red', 0.92, ALL, { wait: 3000 })
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1))
if (errs.length) console.log('page errors:', errs.slice(0, 5))
await browser.close(); server.close()
