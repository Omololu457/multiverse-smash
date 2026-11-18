// ALBEDO MIRROR (2026-11-18): Albedo is Ben 10 with different art. These tests prove it.
//   node harness/albedo_mirror.test.mjs
//   A. AUDIT LINT: every gameplay "ben10" literal is paired with albedo (re-runs the docs/ben10/albedo/AUDIT.md grep).
//   B. MIRROR: for all 3 human variants × all 24 READY aliens, a ben10 fighter and an albedo fighter run the SAME scripted
//      fight (every held-direction special, the ultimate, Vow) against the same dummy. Every gameplay number (stats, form
//      state, Power, the dummy's HP / hitstun, projectile boxes) must match frame by frame.
//   C. RENDER: albedo's sheets are the __albedo paths (exist, same pixel size as Ben's), Ben's are untouched. That holds through
//      runtime frame-set swaps, and the table is cached (identical object frame to frame, no per-frame work).
//   D. EDGE: Ripjaws vs Ripjaws (Ben vs Albedo, both STORM TIDE floods) is symmetric when the sides swap.
//   E. DETERMINISM per device key: each scripted fight replays identically.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import { getSkinAnimationData, getSkins } from '../skins.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message.split('\n').slice(0, 6).join('\n   ')) } }

const READY = ['swampfire', 'heatblast', 'megawhatt', 'goop', 'xlr8', 'eyeguy', 'ghostfreak', 'alienx', 'brainstorm', 'terraspin',
  'wildvine', 'jetray', 'diamondhead_ov', 'upgrade_ov', 'humongousaur', 'feedback_ov', 'arcticguana', 'benwolf', 'bigchill',
  'ripjaws', 'rath', 'waterhazard', 'highbreed', 'wildmutt_ov']
const VARIANTS = ['default', 'ben10Classic', 'ben10Prime']

// ── A. audit lint ──────────────────────────────────────────────────────────────────────────────────────────────
const NOT_GAMEPLAY = /^(player\.js|roster\.js|kits\.js|sound\.js|theme\.js|arcade\.js|arlongSkins\.js|spdRedSkins\.js|omegaSkins\.js):/
test('A. audit lint: every gameplay "ben10" literal also handles albedo', () => {
  const re = `(===|!==|==|!=)\\s*["'\`]ben10["'\`]|["'\`]ben10["'\`]\\s*(===|!==|==|!=)|startsWith\\(["'\`]ben10|includes\\(["'\`]ben10["'\`]\\)|case ["'\`]ben10["'\`]|\\[["'\`]ben10["'\`]`
  const out = execSync(`grep -nE '${re.replace(/'/g, "'\\''")}' *.js || true`, { cwd: ROOT, encoding: 'utf8' })
  const bad = []
  for (const line of out.split('\n').filter(Boolean)) {
    if (NOT_GAMEPLAY.test(line)) continue
    const [file, ln] = line.split(':'); const n = +ln
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n')
    const near = src.slice(n - 1, n + 1).join('\n')                       // the line + the next (case pairs)
    if (!/albedo/.test(near)) bad.push(line.slice(0, 160))
  }
  assert.deepEqual(bad, [], 'unpaired ben10 checks:\n' + bad.join('\n'))
})

// ── fighters ───────────────────────────────────────────────────────────────────────────────────────────────────
const STAGE = { stageLeft: 0, stageWidth: 1600 }
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
function device(key, skinId, x, facing) {
  const f = { rosterKey: key, benExperimental: true, side: 'p1', health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300,
    w: 60, h: 110, groundY: 410, facing, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
    attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 }
  // = game.js applySkin's sprite fields (the only part of applySkin a Ben fighter reads)
  f._skinAnim = getSkinAnimationData(key, skinId); f._baseSkinAnim = f._skinAnim; f._recolorTag = null
  F.applyBen10VariantStats(f, skinId); F.setupBen10(f, [])
  return f
}
const dummy = (x = 560) => { const t = { rosterKey: 'goku', side: 'p2', health: 1000, maxHealth: 1000, energy: 0, maxEnergy: 100, x, y: 300, w: 60, h: 110,
  groundY: 410, facing: -1, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0, attackCooldown: 0, attacking: false,
  comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 }; t.y = 410 - t.h; return t }
const timers = q => { if (q.hitstop > 0) q.hitstop--; else if (q.hitstun > 0) q.hitstun--; for (const k of ['attackCooldown', '_benPowerCommit', '_spriteCastTimer', 'invulnTimer', 'blockstun']) if (q[k] > 0) q[k]-- }
const ready = f => { f.attacking = false; f.currentAttack = null; f.attackCooldown = 0; f._benPowerCommit = 0; f.hitstun = 0; f.hitstop = 0; f.blockstun = 0 }
let FRAME = 0
function live(fs_, n = 1) {   // the live game order: form ticks → age/delete boxes → resolve
  for (let i = 0; i < n; i++) {
    FRAME++; A.updatePendingSpawns()
    for (const f of fs_) { physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f) }
    for (const f of fs_) if (f.omnitrix) A.tickBenAlienForm(f, {}, { p1: fs_[0], p2: fs_[1], ...STAGE, seed: 4242, frame: FRAME })
    C.updateProjectiles(A.activeProjectiles, STAGE.stageWidth)
    C.resolveProjectileHitsMulti(A.activeProjectiles, fs_)
    for (const f of fs_) timers(f)
  }
}
// gameplay snapshot: every own field except render / identity ones
const RENDER = new Set(['rosterKey', 'name', 'displayName', '_skinAnim', '_baseSkinAnim', '_recolorTag', 'animationData', 'portrait', 'skinTint', '_baseSkinTint',
  'tintStrength', 'color', 'omnitrix', 'basic_attacks', 'specials', 'currentAttack'])
const plain = v => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x === 'object' && x.rosterKey && k) ? `<fighter ${x === undefined ? '' : x.side}>` : (typeof x === 'function' ? 'fn' : x)))
function snap(f, t) {
  const o = {}
  for (const [k, v] of Object.entries(f)) if (!RENDER.has(k) && (typeof v !== 'object' || v === null)) o[k] = v
  const om = f.omnitrix ? { ...f.omnitrix } : null
  return plain({ f: o, omnitrix: om, normals: f.basic_attacks, specials: f.specials,
    dummy: { hp: t.health, hs: t.hitstun, bs: t.blockstun, x: Math.round(t.x * 1000), y: Math.round(t.y * 1000), slow: t._benSlow ?? null, ice: t._benIceImmuneUntil ?? null },
    boxes: A.activeProjectiles.map(p => ({ x: Math.round(p.x * 100), y: Math.round(p.y * 100), d: p.damage, l: p.lifetime, w: p.width ?? p.w, h: p.height ?? p.h })) })
}
// one scripted fight: transform, then every held-direction special, then the ultimate, then Vow — snapshots every frame
function script(key, skinId, alien) {
  A.activeProjectiles.splice(0, A.activeProjectiles.length); A.clearAbilityState(); FRAME = 0
  const f = device(key, skinId, 400, 1), t = dummy()
  assert(F.applyAlien(f, alien), `applyAlien ${alien}`); f.transformed = true; f.y = 410 - f.h
  const trace = [snap(f, t)]
  for (const dir of [null, 'F', 'D', 'B', 'U']) {
    ready(f); f.energy = 100; f._specialHeldDir = dir
    A.triggerSpecial(f, { p1: f, p2: t, ...STAGE, seed: 4242, frame: FRAME })
    for (let i = 0; i < 45; i++) { live([f, t]); trace.push(snap(f, t)) }
    t.health = 1000; t.x = 560; t.hitstun = 0
  }
  ready(f); f.energy = 100; A.triggerUltimate(f, { p1: f, p2: t, ...STAGE, seed: 4242, frame: FRAME })
  for (let i = 0; i < 240; i++) { live([f, t]); trace.push(snap(f, t)) }
  if (f.omnitrix) { f.omnitrix.vowActive = true; F.applyAlien(f, alien); trace.push(snap(f, t)) }
  return { trace, f }
}
function firstDiff(a, b, p = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = firstDiff(a[k], b[k], p + '.' + k); if (d) return d }
  }
  return `${p}: ben10 ${JSON.stringify(a)?.slice(0, 80)} vs albedo ${JSON.stringify(b)?.slice(0, 80)}`
}

// ── B. mirror ─────────────────────────────────────────────────────────────────────────────────────────────────
test('B0. albedo has the same three variant skin ids as Ben (→ the same BEN10_VARIANT_STATS rows)', () => {
  for (const id of VARIANTS) assert(getSkins('albedo').some(s => s.id === id), 'albedo skin ' + id)
  for (const id of VARIANTS) { const b = device('ben10', id, 0, 1), a = device('albedo', id, 0, 1)
    assert.deepEqual(plain(a._benHumanStats), plain(b._benHumanStats), id); assert.equal(a._benVariant, b._benVariant)
    assert.deepEqual(plain(a.basic_attacks), plain(b.basic_attacks), id + ' human normals') }
})
for (const v of VARIANTS) for (const alien of READY) {
  test(`B. mirror ${v} × ${alien}: identical gameplay numbers every frame`, () => {
    const b = script('ben10', v, alien), a = script('albedo', v, alien)
    assert.equal(a.trace.length, b.trace.length)
    for (let i = 0; i < b.trace.length; i++) { const d = firstDiff(b.trace[i], a.trace[i]); if (d) assert.fail(`frame ${i}: ${d}`) }
  })
}

// ── C. render ─────────────────────────────────────────────────────────────────────────────────────────────────
const pngSize = p => { const b = fs.readFileSync(path.join(ROOT, p.replace(/^\.\//, ''))); return [b.readUInt32BE(16), b.readUInt32BE(20)] }
const sheets = anim => [...new Set(Object.values(anim || {}).map(d => d?.sheet).filter(Boolean))]
test('C1. human: albedo variant sheets are __albedo files, the same size as Ben\'s; Ben\'s are untagged', () => {
  for (const id of VARIANTS) {
    const ba = getSkinAnimationData('ben10', id) || characters.ben10.animationData, aa = getSkinAnimationData('albedo', id) || characters.albedo.animationData
    assert.deepEqual(Object.keys(aa), Object.keys(ba), id + ' same actions')
    for (const k of Object.keys(ba)) {
      assert(!ba[k].sheet.includes('__albedo'), 'ben untagged ' + ba[k].sheet)
      assert.equal(aa[k].sheet, ba[k].sheet.replace(/\.png$/, '__albedo.png'), id + ' ' + k)
      assert.deepEqual(pngSize(aa[k].sheet), pngSize(ba[k].sheet), 'size ' + aa[k].sheet)
      const { sheet: _a, ...ga } = aa[k], { sheet: _b, ...gb } = ba[k]; assert.deepEqual(ga, gb, 'geometry ' + k)
    }
  }
})
test('C2. every READY alien: albedo form sheets = __albedo (exist, same size); Ben\'s untouched', () => {
  for (const alien of READY) {
    const b = device('ben10', 'default', 400, 1), a = device('albedo', 'default', 400, 1)
    F.applyAlien(b, alien); F.applyAlien(a, alien)
    const bs = sheets(b._skinAnim), as = sheets(a._skinAnim)
    assert(bs.length && bs.every(s => !s.includes('__albedo')), alien + ' ben untagged')
    assert.deepEqual(as, bs.map(s => s.replace(/\.png$/, '__albedo.png')), alien + ' albedo tagged')
    for (let i = 0; i < bs.length; i++) assert.deepEqual(pngSize(as[i]), pngSize(bs[i]), 'size ' + as[i])
  }
})
test('C3. every body strip any READY module references has a same-size __albedo twin (all alternate frame sets)', () => {
  const MOD = { diamondhead_ov: 'diamondhead', upgrade_ov: 'upgrade', feedback_ov: 'feedback', wildmutt_ov: 'wildmutt' }
  let n = 0
  for (const alien of READY) {
    const m = MOD[alien] || alien
    const files = fs.readdirSync(ROOT).filter(x => x === m + '.js' || (x.startsWith(m) && /Assets.*\.js$/.test(x)))
    const strips = new Set(files.flatMap(x => fs.readFileSync(path.join(ROOT, x), 'utf8').match(/ben10_[A-Za-z0-9_]+_uniform\.png/g) || []))
    for (const s of strips) { if (s.includes('__') || !fs.existsSync(path.join(ROOT, s))) continue
      const t = s.replace(/\.png$/, '__albedo.png'); assert(fs.existsSync(path.join(ROOT, t)), 'missing ' + t); assert.deepEqual(pngSize(t), pngSize(s), t); n++ }
  }
  assert(n > 900, `strips checked: ${n}`)
})
test('C4. runtime frame-set swaps stay recolored for albedo and plain for Ben (Heatblast Blue Flame, Megawhatt Drained, Humongousaur tiers, Ripjaws water)', () => {
  const S = f => f.omnitrix.formState
  const cases = [['heatblast', s => { s.blue = 30 }], ['megawhatt', s => { s.volt = 0; s.voltage = 0 }], ['humongousaur', s => { s.size.v = 100 }], ['ripjaws', null]]
  for (const [alien, poke] of cases) for (const key of ['ben10', 'albedo']) {
    A.clearAbilityState(); const f = device(key, 'default', 400, 1), t = dummy(); F.applyAlien(f, alien); f.transformed = true; f.y = 410 - f.h
    const before = f._skinAnim; if (poke) poke(S(f)); live([f, t], 3)
    const ss = sheets(f._skinAnim)
    assert(ss.every(s => key === 'albedo' ? s.endsWith('__albedo.png') : !s.includes('__albedo')), `${key} ${alien}: ${ss[0]}`)
    for (const s of ss) assert(fs.existsSync(path.join(ROOT, s.replace(/^\.\//, ''))), 'exists ' + s)
    if (alien === 'heatblast') assert.notEqual(f._skinAnim, before, 'heatblast swapped its table (test is live)')
  }
})
test('C5. cached: the albedo table is the SAME object frame after frame (no per-frame retag / allocation)', () => {
  A.clearAbilityState(); const f = device('albedo', 'default', 400, 1), t = dummy(); F.applyAlien(f, 'heatblast'); f.transformed = true
  live([f, t], 2); const seen = new Set()
  for (let i = 0; i < 120; i++) { live([f, t]); seen.add(f._skinAnim) }
  assert.equal(seen.size, 1, 'one table object across 120 frames')
  F.retagBenReadyArt(f); F.retagBenReadyArt(f); assert(sheets(f._skinAnim).every(s => !s.includes('__albedo__albedo')), 'never double-tagged')
  const src = fs.readFileSync(path.join(ROOT, 'fighters.js'), 'utf8'); const fn = src.slice(src.indexOf('export function retagBenReadyArt'), src.indexOf('export function retagBenReadyArt') + 900)
  assert(!/getImageData|createElement|putImageData/.test(fn), 'no pixel work in the retag')
})

// ── D. edge ───────────────────────────────────────────────────────────────────────────────────────────────────
test('D. Ripjaws vs Ripjaws (Ben vs Albedo): the fight is symmetric when the sides swap', () => {
  const run = (left, right) => {
    A.activeProjectiles.splice(0, A.activeProjectiles.length); A.clearAbilityState(); FRAME = 0
    const p = device(left, 'default', 500, 1), q = device(right, 'default', 800, -1)
    for (const f of [p, q]) { F.applyAlien(f, 'ripjaws'); f.transformed = true; f.y = 410 - f.h }
    const ctx = { p1: p, p2: q, ...STAGE, seed: 4242, frame: 0 }
    ready(p); p.energy = 100; A.triggerUltimate(p, ctx)
    const tr = []
    for (let i = 0; i < 300; i++) {
      if (i === 30) { ready(q); q.energy = 100; q._specialHeldDir = null; A.triggerSpecial(q, { ...ctx, p1: q, p2: p }) }
      live([p, q]); tr.push([p.health, q.health, Math.round(p.x), Math.round(q.x), !!p._benFlood, !!q._benFlood])
    }
    return tr
  }
  assert.deepEqual(run('albedo', 'ben10'), run('ben10', 'albedo'))
})

test('E. determinism per device key: the same scripted fight twice → identical traces (ben10 and albedo, every READY alien)', () => {
  for (const key of ['ben10', 'albedo']) for (const alien of READY) {
    const x = script(key, 'default', alien).trace, y = script(key, 'default', alien).trace
    for (let i = 0; i < x.length; i++) { const d = firstDiff(x[i], y[i]); if (d) assert.fail(`${key} ${alien} frame ${i}: ${d}`) }
  }
})

console.log(`\nALBEDO MIRROR: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
