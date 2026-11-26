import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
import { characters } from '../characters.js'
import { KITS } from '../kits.js'
import { getSkins } from '../skins.js'
import { SAMURAI_THEMES } from '../samuraiThemes.js'
import { SOURCED_ART } from '../credits.js'
import { SAMURAI_FORMS, SAMURAI_EXTRA_SHEETS, SAMURAI_ID, SAMURAI_ELEMENTS, SAMURAI_ZORDS } from '../samuraiData.js'

assert.deepEqual(characters[SAMURAI_ID].squadForms, SAMURAI_FORMS)
assert.deepEqual(getSkins(SAMURAI_ID).slice(6, 12).map(skin => skin.id), SAMURAI_THEMES.map(theme => theme.id))
assert.equal(characters[SAMURAI_ID].hidden, false)
assert.ok(SAMURAI_FORMS.every(key => characters[key].hidden && characters[key].hasSprites))
assert.ok([SAMURAI_ID, ...Object.keys(SAMURAI_ELEMENTS)].every(key => SOURCED_ART[key].artists.includes('NeoMar654')))
assert.ok(Object.values(SAMURAI_ZORDS).every(zord => KITS[SAMURAI_ID].specials.some(move => move.name === zord.name)))
await Promise.all(SAMURAI_EXTRA_SHEETS.map(path => access(new URL('../' + path, import.meta.url))))

const server = await serve()
const errors = []
let browser
try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('pageerror', error => errors.push(error.message))
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('/assets/samurai_rangers/')) errors.push(response.url())
  })
  await page.addInitScript(() => { window.requestAnimationFrame = () => 0 })
  await page.goto(server.base + '/index.html?harness=1&p1=samurai_rangers&p2=luffy&seed=7')
  await page.waitForFunction(() => window.__harness?.spdSquad, null, { timeout: 45_000 })

  const step = frames => page.evaluate(frames => __harness.luffyTest.step(frames), frames)
  const status = () => page.evaluate(() => {
    const a = __harness.gojoShinjukuTest.raw('p1')
    const b = __harness.gojoShinjukuTest.raw('p2')
    return {
      key: a.rosterKey, skinId: a.skinId, hp: a.health, maxHp: a.maxHealth, foeHp: b.health, energy: a.energy, energyMax: a.maxEnergy,
      move: a.currentAttack?.name, mega: a._megaActive, morph: a._megaMorphTimer || 0,
      sheet: (a._skinAnim || a.animationData).idle.sheet, damage: a.damageMultiplier,
      x: a.x, y: a.y, vx: a.vx, kb: b.hitstun,
    }
  })
  const boot = async (skin = 'default') => {
    await page.evaluate(skin => { __harness.bootSkin(skin, 'default'); __harness.setDummyBehavior?.('stand') }, skin)
    await step(10)
  }
  const tap = async key => {
    await page.keyboard.down(key)
    await step(2)
    await page.keyboard.up(key)
    await step(2)
  }
  const dial = async key => {
    await tap('s')
    await tap('s')
    await tap(key)
  }
  const setup = (gap, energy) => page.evaluate(({ gap, energy }) => {
    const a = __harness.gojoShinjukuTest.raw('p1')
    const b = __harness.gojoShinjukuTest.raw('p2')
    Object.assign(a, { x: 850, facing: 1, health: 1117, energy, vx: 0 })
    Object.assign(b, { x: 850 + gap, facing: -1, health: b.maxHealth, invulnTimer: 0, vx: 0 })
  }, { gap, energy })
  const projectile = name => page.evaluate(name => __harness.projectiles().find(p => p.name === name), name)
  const assertRendered = async (form, themed = false) => {
    await page.waitForFunction(() => __harness.spriteReady()?.ready, null, { timeout: 4000, polling: 50 })
    const actual = await page.evaluate(() => {
      const fighter = __harness.gojoShinjukuTest.raw('p1')
      fighter.spriteHandler._lastRender = null
      __harness.luffyTest.step(0)
      const render = fighter.spriteHandler._lastRender
      return {
        sheet: __harness.spriteReady().sheet,
        drawn: !!render?.sheet?.naturalWidth,
        themed: render?.sheet instanceof HTMLCanvasElement,
      }
    })
    assert.deepEqual(actual, { sheet: form.sheet, drawn: true, themed }, form.key)
  }


  await boot()
  assert.equal((await status()).key, SAMURAI_FORMS[0])
  assert.equal((await status()).maxHp, 1739)
  await setup(800, 72)
  for (const [i, key] of ['k', 'l', 'o', 'p', 'u', 'j'].entries()) {
    await step(45)
    await dial(key)
    const form = await status()
    assert.equal(form.key, SAMURAI_FORMS[(i + 1) % SAMURAI_FORMS.length])
    assert.equal(form.hp, 1117)
    assert.equal(form.maxHp, 1739)
    assert.equal(form.energyMax, 160)
    assert.equal(form.move, undefined)
    assert.equal(form.mega, undefined)
    await assertRendered(form)
  }
  console.log('All six Rangers switch with shared health and meter.')
  for (const [index, skin] of getSkins(SAMURAI_ID).slice(0, 6).entries()) {
    await boot(skin.id)
    const opening = await status()
    assert.equal(opening.key, SAMURAI_FORMS[index])
    await assertRendered(opening)
  }
  const themed = SAMURAI_THEMES[1].id
  await boot(themed)
  console.log('Each Start as choice opens with the selected Ranger.')
  await step(45)
  await setup(800, 115)
  await page.keyboard.down('p')
  await step(16)
  await page.keyboard.up('p')
  await step(44)
  assert.equal((await status()).mega, true)
  for (const key of ['k', 'o', 'p']) {
    await step(45)
    const before = (await status()).energy
    await dial(key)
    const form = await status()
    assert.equal(form.mega, true, JSON.stringify(form))
    assert.equal(form.skinId, themed)
    assert.equal(form.morph, 0)
    assert.match(form.sheet, /samurai_rangers\/\w+_mega_idle\.png$/)
    assert.equal(form.damage, 1.35)
    await assertRendered(form, true)
    assert.ok(form.energy <= before && form.energy > before - 10, JSON.stringify(form))
  }
  await tap('p')
  assert.equal((await status()).mega, false)
  assert.match((await status()).sheet, /sky_base_idle\.png$/)
  console.log('Mega Mode preserves its art, damage and drain across tag-ins, then reverts to the active Ranger.')

  for (const [dialKey, key] of [['k', 'blue_samurai_ranger'], ['o', 'yellow_samurai_ranger'], ['p', 'pink_samurai_ranger']]) {
    await boot()
    await dial(dialKey)
    await setup(100, 145)
    const before = await status()
    assert.equal(before.key, key)
    const cfg = SAMURAI_ELEMENTS[key]
    await tap('l')
    const special = await projectile(cfg.special)
    assert.ok(special?.sheet?.includes('/' + cfg.asset + '_wave.png'), JSON.stringify(special))
    assert.ok((await status()).energy < before.energy)
    await step(26)
    assert.ok((await status()).foeHp < before.foeHp, JSON.stringify(await status()))
    await step(44)
    await setup(95, 145)
    await tap('u')
    const ultimate = await projectile(cfg.ultimate)
    assert.ok(ultimate?.damage > special.damage, JSON.stringify(ultimate))
    await step(27)
    assert.ok((await status()).foeHp < before.foeHp)
  }
  console.log('Blue, Yellow and Pink land their specials and their own neutral ultimates.')

  for (const [direction, id, gap] of [['w', 'battlewing', 196], ['d', 'tiger', 301], ['a', 'swordfish', 104], ['s', 'octo', 147]]) {
    await boot(themed)
    await setup(gap, 149)
    const before = await status()
    await page.keyboard.down(direction)
    await page.keyboard.down('u')
    await step(2)
    await page.keyboard.up('u')
    await page.keyboard.up(direction)
    const zord = await projectile(SAMURAI_ZORDS[id].name)
    assert.ok(zord?.sheet?.endsWith('/' + id + '.png'), JSON.stringify(zord))
    assert.ok(zord.spriteFrames > 1 && zord.spriteOnce)
    assert.ok((await status()).energy < 55)
    if (process.env.SAMURAI_SHOTS && id === 'swordfish') {
      await step(21)
      await page.screenshot({ path: process.env.SAMURAI_SHOTS + '/samurai-swordfish.png' })
    }
    await step(24)
    assert.ok((await status()).foeHp < before.foeHp, id + ': ' + JSON.stringify(await status()))
  }
  console.log('All four directional Megazords spend Symbol Power, animate and land hits.')

  const ffa = () => page.evaluate(() => __harness.ffaInfo().fighters)
  await page.evaluate(() => {
    __harness.ffaStart(3, ['samurai_rangers', 'luffy', 'yuji'])
    __harness.ffaSetX(0, 900)
    __harness.ffaSetX(1, 1000)
    __harness.ffaSetX(2, 1800)
  })
  await step(7)
  await dial('k')
  const ffaBefore = await ffa()
  assert.equal(ffaBefore[0].key, 'blue_samurai_ranger')
  await tap('l')
  await step(24)
  assert.ok((await ffa())[1].health < ffaBefore[1].health)
  console.log('Free-for-all switches Rangers and damages the nearest opponent with Water Slice.')

  await page.evaluate(async () => {
    const {
      SAMURAI_THEMES, samuraiThemeBody, samuraiThemeZord, samuraiThemeCard,
    } = await import('./samuraiThemes.js')
    const { characters } = await import('./characters.js')
    const { SAMURAI_FORMS, ELEMENT_MEGA_ART, SAMURAI_ZORDS, samuraiZordArt } = await import('./samuraiData.js')
    const images = new Map()
    const sources = [
      ...SAMURAI_FORMS.map(key => characters[key].animationData.idle.sheet),
      ...Object.values(ELEMENT_MEGA_ART).map(art => art.idle.sheet),
      ...Object.keys(SAMURAI_ZORDS).map(key => samuraiZordArt(key).sheet),
    ]
    await Promise.all(sources.map(async src => {
      const image = new Image()
      image.src = src
      images.set(src, image)
      await image.decode()
    }))
    function pixels(image) {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0)
      return ctx.getImageData(0, 0, canvas.width, canvas.height).data
    }
    function checkPaint(original, rendered, label) {
      if (original.naturalWidth !== rendered.naturalWidth || original.naturalHeight !== rendered.naturalHeight) {
        throw new Error(label + ' changed the sheet dimensions')
      }
      const a = pixels(original)
      const b = pixels(rendered)
      let changed = 0
      for (let i = 0; i < a.length; i += 4) {
        if (a[i + 3] !== b[i + 3]) throw new Error(label + ' changed the sprite silhouette')
        if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) changed++
      }
      if (changed < 40) throw new Error(label + ' did not visibly recolor the source')
    }
    const previews = new Set()
    for (const { id } of SAMURAI_THEMES) {
      for (const key of SAMURAI_FORMS) {
        const base = characters[key].animationData.idle.sheet
        const mega = ELEMENT_MEGA_ART[key]?.idle.sheet
        for (const src of mega ? [base, mega] : [base]) {
          const original = images.get(src)
          checkPaint(original, samuraiThemeBody({ skinId: id, rosterKey: key }, src, original), id + '/' + key)
        }
      }
      for (const key of Object.keys(SAMURAI_ZORDS)) {
        const sheet = samuraiZordArt(key).sheet
        const original = images.get(sheet)
        checkPaint(original, samuraiThemeZord({ sheet, owner: { skinId: id } }, original), id + '/' + key)
      }
      const card = samuraiThemeCard(id, characters, src => images.get(src))
      if (!card?.complete) throw new Error('Missing skin preview for ' + id)
      previews.add(card.toDataURL())
    }
    if (previews.size !== SAMURAI_THEMES.length) throw new Error('Theme previews must be distinct')
  })
  if (process.env.SAMURAI_SHOTS) {
    await page.evaluate(() => __harness.showSkinSelect('samurai_rangers', 'p1', 7))
    await step(5)
    await page.screenshot({ path: process.env.SAMURAI_SHOTS + '/samurai-creative-skins.png' })
  }
  console.log('All six themes visibly recolor every Ranger and Megazord without changing sheet dimensions or silhouettes.')


} finally {
  await browser?.close()
  server.close()
}
assert.deepEqual(errors, [])
