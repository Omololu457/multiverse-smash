// harness/invincible_shots.mjs — MSV1-INVINCIBLE phase 6 screenshots (deterministic: rAF off, sim stepped, every shot is
// a real rendered frame of the real game, moves driven by real key events). → docs/msv1/invincible/screenshots/ (or argv[2])
//   barrage · Invincible Punch burst · Zip · Can't Stay Down · Terminal Velocity takeoff / aim (marker) / fall / impact / crack
//   · the four Viltrumite skins in a match (viltrumite_<id>.png, composed into four_viltrumites.png by the caller)
//   node harness/invincible_shots.mjs [outDir]
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { serve } from './ben10_test_utils.mjs'
const OUT = process.argv[2] || 'docs/msv1/invincible/screenshots'; fs.mkdirSync(OUT, { recursive: true })
const server = await serve(), browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
const errs = []; page.on('pageerror', e => errs.push(e.message))
await page.addInitScript(() => window.requestAnimationFrame = () => 0)
const E = (fn, a) => page.evaluate(fn, a)
const step = n => E(n => __harness.luffyTest.step(n), n)
const shots = []
const st = () => E(() => __harness.invincibleTest.state('p1'))
async function shot(name) { await new Promise(r => setTimeout(r, 250)); await step(0)
  await page.screenshot({ path: path.join(OUT, `INVINCIBLE_${name}.png`) }); shots.push(name) }
async function boot(skin = 'default') {
  await page.goto(server.base + `/index.html?harness=1&p1=invincible&p2=homelander&seed=40517`)
  await page.waitForFunction(() => window.__harness?.invincibleTest, null, { timeout: 30000 })
  await E(s => { __harness.start({ p1Skin: s }); __harness.skipToBattle(); __harness.preloadDone?.(); __harness.luffyTest.step(4) }, skin)
  await new Promise(r => setTimeout(r, 1500)); await step(2)
  for (let i = 0; i < 20; i++) { const ok = await E(() => [...document.images].every(i => i.complete)); if (ok) break; await new Promise(r => setTimeout(r, 200)) }
}
async function place(gap = 80, o = {}) {
  await E(([gap, o]) => { const H = __harness.invincibleTest; H.reset(); __harness.setDummyBehavior('stand'); const a = H.raw(), b = H.raw('p2')
    a.x = o.x ?? 1300; b.x = a.x + a.w + gap; a.facing = 1; b.facing = -1
    for (const f of [a, b]) { f.health = f.maxHealth; f.energy = 200; f.vx = f.vy = 0; f.invulnTimer = 0; f.hitstun = 0; f.attacking = false; f.currentAttack = null
      f.attackCooldown = 0; f.knockdownState = false; f.ultimateCooldown = 0; f.comboCounter = 0 } }, [gap, o])
  await step(30)
}
const tap = async (keys, n = 1) => { for (const k of keys) await page.keyboard.down(k); await step(n); for (const k of [...keys].reverse()) await page.keyboard.up(k) }
const until = async (fn, max = 300) => { for (let i = 0; i < max; i++) { if (await E(fn)) return i; await step(1) } return -1 }
const S = () => E(() => __harness.invincibleTest.raw()._inv)
try {
  await boot()
  // BARRAGE: Jab, then mash Light — mid-flurry
  await place(20); await tap(['j']); await step(2)
  for (let i = 0; i < 8; i++) { await tap(['j']); await step(1) }
  await shot('barrage'); await step(60)
  // INVINCIBLE PUNCH: ↓↘→ + Special from 600 px — the burst on contact
  await place(600); await step(4)
  await tap(['s']); await tap(['s', 'd']); await tap(['d']); await tap(['d', 'l'])
  await until(() => (__harness.invincibleTest.raw()._inv?.stats.ipunchHits || 0) > 0, 40); await step(1); await shot('invincible_punch_burst'); await step(80)
  // ZIP: double-tap → (mid-zip, streaks)
  await place(1400, { x: 200 }); await step(4); await tap(['d']); await step(2); await tap(['d']); await step(3); await shot('zip'); await step(30)
  // CAN'T STAY DOWN: the KO hit leaves 1 HP → knockdown, "Not yet." → RESOLVE
  await place(20); await E(() => { __harness.invincibleTest.setHp(10); __harness.invincibleTest.hurt(200) })
  await until(() => !!__harness.invincibleTest.raw()._inv?.say, 120); await step(6); await shot('cant_stay_down')
  await until(() => (__harness.invincibleTest.raw()._inv?.resolve || 0) > 0, 160); await step(20); await shot('resolve'); await step(40)
  // TERMINAL VELOCITY: takeoff → aim (the marker) → fall → impact → crack
  await place(200); await tap(['u'], 2)
  await step(14); await shot('tv_1_takeoff')
  await until(() => __harness.invincibleTest.raw()._inv?.tv?.phase === 'aim', 60); await step(30); await shot('tv_2_aim_marker')
  await until(() => __harness.invincibleTest.raw()._inv?.tv?.phase === 'fall', 80); await step(4); await shot('tv_3_fall')
  await until(() => __harness.invincibleTest.raw()._inv?.tv?.phase === 'impact', 20); await step(2); await shot('tv_4_impact')
  await step(90); await shot('tv_5_crack')
  // the four Viltrumite looks, each in a match (idle, same spot)
  for (const id of ['viltrumite', 'mustache', 'rose', 'coronation']) {
    await boot('inv_' + id); await place(260); await step(10)
    const got = await E(() => { const f = __harness.invincibleTest.raw(); return [f.skinId, (f._skinAnim || f.animationData).idle.sheet] })
    if (!String(got[1]).includes(`/skins/${id}/`)) throw new Error(`skin ${id} not applied: ${got}`)
    await shot(`viltrumite_${id}`); console.log('skin', id, '→', got.join(' '))
  }
} catch (e) { console.log('ERROR', e.stack) }
console.log('shots:', shots.join(', ')); if (errs.length) console.log('PAGE ERRORS', errs.slice(0, 3))
await browser.close(); server.close?.()
