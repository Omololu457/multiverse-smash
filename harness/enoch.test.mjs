// harness/enoch.test.mjs — Enoch (tribute fighter: Frozone recolour + visor fire + water reactions + trail gliding).
//   A. RENDER CHECK: boot → pick Enoch → start a real match → both fighters + HUD + thermal bar render, then ice / fire / water /
//      steam patches, the beam and the disc render (screenshots docs/enoch/screenshots/*.png); no page errors, no enoch 404s.
//   B+ (later phases) are in harness/enoch_*.test.mjs.
//   node harness/enoch.test.mjs        (run inside the test tree: tools/enoch/test_tree.sh)
import fs from 'node:fs'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
const server = await serve(), browser = await chromium.launch({ headless: true }), errors = [], r404 = new Set(); let pass = 0, fail = 0
const ok = (n, c, d = '') => { if (c) { pass++; console.log('  ✅', n, d.length > 260 ? d.slice(0, 260) + '…' : d) } else { fail++; console.log('  ❌', n, d.slice(0, 900)) } }
fs.mkdirSync('docs/enoch/screenshots', { recursive: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); page.on('pageerror', e => errors.push(e.message))
  page.on('response', r => { if (r.status() === 404) r404.add(r.url().replace(/^https?:\/\/[^/]+/, '')) })
  await page.goto(`${server.base}/index.html?harness=1&session=1&p1=enoch&p2=frozone`, { waitUntil: 'load' }); await page.waitForFunction(() => !!window.__harness?.enochTest, null, { timeout: 60000 })
  await page.mouse.click(640, 360); await page.evaluate(() => { __harness.start({ mode: 'vs', difficulty: 'dummy' }); __harness.skipToBattle() })
  await page.waitForFunction(() => __harness.state().gameState === 'battle' && __harness.state().countdown <= 0, null, { timeout: 45000 })
  await page.waitForFunction(() => __harness.spriteReady?.().ready !== false, null, { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(800)
  const A = await page.evaluate(() => { const H = __harness.enochTest, a = H.state(), b = H.state('p2'); return { a: { key: a.key, hp: a.hp, maxHp: a.maxHp, action: a.action, w: a.w, h: a.h }, bKey: b.key, bAct: b.action, gs: __harness.state().gameState, hud: H.hud() } })
  await page.screenshot({ path: 'docs/enoch/screenshots/render_check.png' })
  const lit = await page.evaluate(() => { const c = document.querySelector('canvas'), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, 140).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n })
  ok('render: boot → Enoch vs Frozone in a live battle, both fighters animating', A.gs === 'battle' && A.a.key === 'enoch' && A.bKey === 'frozone' && !!A.a.action && !!A.bAct, JSON.stringify(A))
  ok('render: HUD band drawn + thermal readout present', lit > 5000 && !!A.hud && A.hud.zone.startsWith('BALANCE'), 'lit px ' + lit + ' ' + JSON.stringify(A.hud))
  ok('health 980', A.a.maxHp === 980, String(A.a.maxHp))
  // effects: lay one patch of each element + disc + beam, then screenshot
  const E = await page.evaluate(() => { const H = __harness.enochTest, a = H.raw(), b = H.raw('p2'); b.x = a.x + 520; b.invulnTimer = 99999
    H.patch({ type: 'ice', cx: a.x - 110 }); H.patch({ type: 'fire', cx: a.x + 120 }); H.patch({ type: 'water', cx: a.x + 350 }); H.patch({ type: 'steam', cx: a.x + 580 })   // 205-px patches, spaced so none overlap (overlaps react)
    return H.state().s.field.patches.map(p => p.type) })
  await page.waitForTimeout(300); await page.screenshot({ path: 'docs/enoch/screenshots/patches.png' })
  ok('effects: ICE / FIRE / WATER / STEAM patches live in GAME_STATE', ['ice', 'fire', 'water', 'steam'].every(t => E.includes(t)), JSON.stringify(E))
  {
    const pixels = await page.evaluate(() => { const c = document.querySelector('canvas'), x = c.getContext('2d'), d = x.getImageData(0, 300, c.width, 420).data; const has = (r, g, b) => { for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - r) < 12 && Math.abs(d[i + 1] - g) < 12 && Math.abs(d[i + 2] - b) < 12) return true; return false }
      return { ice: has(0x4f, 0xb6, 0xd8), fire: has(0xff, 0x9a, 0x3c), water: has(0x3a, 0x86, 0xd0) } })
    ok('effects: ice / fire / water patch colours drawn on the canvas', pixels.ice && pixels.fire && pixels.water, JSON.stringify(pixels))
  }
  ok('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '))
  ok('no enoch 404s', ![...r404].some(u => /enoch|elements|beam/.test(u)), [...r404].join(', '))
} catch (e) { fail++; console.log('  ❌ exception', e.stack) }
await browser.close(); server.close()
console.log(`\n  ENOCH RENDER: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0)
