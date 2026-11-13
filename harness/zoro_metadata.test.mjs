// harness/zoro_metadata.test.mjs — Roronoa Zoro phase 8 metadata + roster placement.
//   node harness/zoro_metadata.test.mjs
import { chromium } from 'playwright'
import { serve } from './ben10_test_utils.mjs'
let PASS = 0, FAIL = 0
const check = (n, c, d = '') => { (c ? PASS++ : FAIL++); console.log(`  ${c ? '✅' : '❌'} ${n}${d !== '' ? `  — ${d}` : ''}`) }

const { characters, characterList } = await import('../characters.js')
const z = characters.zoro
check('roster has exactly one Zoro (rosterKey zoro)', Object.values(characters).filter(c => c?.rosterKey === 'zoro').length === 1)
check('name "Zoro"', z.name === 'Zoro', z.name)
check('displayName "Roronoa Zoro"', z.displayName === 'Roronoa Zoro', z.displayName)
check('universe One Piece (one_piece, shared with Luffy)', z.universe === 'one_piece' && characters.luffy?.universe === 'one_piece')
check('difficulty 3', z.difficulty === 3, z.difficulty)
check('archetype "Swordsman / Stance Fighter"', z.archetype === 'Swordsman / Stance Fighter', z.archetype)
check('tagline "Nothing happened."', z.tagline === 'Nothing happened.', z.tagline)
check('bio', z.bio === "First mate of the Straw Hat Pirates. The Three-Sword Style Swordsman who swore to become the world's greatest. Terrible sense of direction, unbreakable resolve, and a habit of napping on the job.")
check('stats: HP 1000, Spirit 100', z.stats.maxHealth === 1000 && z.stats.maxEnergy === 100 && z.traits.energyName === 'Spirit')
check('portrait = Going Merry emblem', /assets\/zoro\/portrait\.png$/.test(z.portrait), z.portrait)
check('listed in characterList', characterList.some(c => c.rosterKey === 'zoro'))

const server = await serve(), browser = await chromium.launch({ headless: true }), page = await browser.newPage(), errors = []
page.on('pageerror', e => errors.push(e.message))
try {
  await page.goto(server.base + '/index.html?harness=1&p1=zoro&p2=luffy', { waitUntil: 'load' })
  await page.waitForFunction(() => !!window.__harness?.luffyTest)
  const one = (await page.evaluate(() => __harness.luffyTest.universes())).find(u => u.id === 'one_piece')
  check('select screen: "One Piece" universe holds Luffy + Zoro', one?.name === 'One Piece' && one.count === 2, JSON.stringify(one))
  const keys = await page.evaluate(() => __harness.gotoCharacterSelect('one_piece'))
  check('character select (One Piece) lists Zoro next to Luffy', keys.includes('zoro') && keys.includes('luffy') && Math.abs(keys.indexOf('zoro') - keys.indexOf('luffy')) === 1, keys.join(','))
} catch (e) { check('browser checks ran', false, e.message.split('\n')[0]) }
finally { check('no page errors', errors.length === 0, errors[0] || ''); await browser.close(); server.close() }
console.log(`\nZORO METADATA: ${PASS} passed, ${FAIL} failed`)
process.exit(FAIL ? 1 : 0)
