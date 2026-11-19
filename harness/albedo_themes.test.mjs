// ALBEDO SKIN THEMES — node tests (feat/albedo-skin-themes).   node harness/albedo_themes.test.mjs
//   A. registry: 20 themes, full ROLE_COLOR swatches, honest source labels, 40 stable ids (kid / older), defaults preserved.
//   B. GAMEPLAY ZERO-DIFF: every theme skin runs the SAME scripted fight (transform, every held-direction special, ultimate,
//      Vow) as its appearance's base variant skin, frame by frame — for every one of the 24 forms across the 40 ids.
//   C. ISOLATION (both directions): no Albedo theme can reach Ben (any id, any form, cache key), Ben's ids / skins / stats
//      are untouched, the theme module never reads Ben's sheets, Ben's skins never change Albedo.
//   D. ENGINE: deterministic, alpha / size preserved, every form + appearance gets themed pixels under every theme (no
//      silent fallback), dark themes keep internal shading, no Math.random in any new file.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as F from '../fighters.js'
import * as A from '../abilities.js'
import * as C from '../combat.js'
import { physics } from '../physics.js'
import { characters } from '../characters.js'
import { getSkinAnimationData, getSkins } from '../skins.js'
import { ALBEDO_THEMES, ALBEDO_THEME_SKIN_IDS, albedoThemeSkinId, albedoThemeOfSkin, albedoBaseSkinId, albedoThemeForFighter } from '../albedoThemes.js'
import { ALBEDO_REGIONS, ALBEDO_FORM_KEYS } from '../albedoThemeRegions.js'
import { recolorAlbedoRGBA, albedoHash } from '../albedoThemeRecolor.js'
import { ALBEDO_THEME_MANIFEST } from '../albedoThemeManifest.js'
import { decodePNG } from '../tools/albedo/png.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
let passed = 0, failed = 0
const test = (name, fn) => { try { fn(); passed++; console.log('PASS', name) } catch (e) { failed++; console.error('FAIL', name, '\n  ', e.message.split('\n').slice(0, 6).join('\n   ')) } }
const hexOk = h => /^#[0-9a-f]{6}$/.test(h)

// ── A. registry ──────────────────────────────────────────────────────────────────────────────────────────────
test('A1. 20 themes, numbered 1..20, unique ids, full ROLE_COLOR swatches', () => {
  assert.equal(ALBEDO_THEMES.length, 20)
  assert.deepEqual(ALBEDO_THEMES.map(t => t.n), Array.from({ length: 20 }, (_, i) => i + 1))
  assert.equal(new Set(ALBEDO_THEMES.map(t => t.id)).size, 20)
  for (const t of ALBEDO_THEMES) for (const r of ['primary', 'secondary', 'accent', 'energy', 'energyCore', 'hair']) assert(hexOk(t[r]), `${t.id}.${r}`)
})
test('A2. sources labeled honestly (originals vs fan cosmetics)', () => {
  for (const t of ALBEDO_THEMES) {
    if (t.n <= 2) assert.equal(t.source, `Original Albedo palette; ${t.name}`)
    else assert.match(t.source, /^Fan cosmetic inspired by .+; not a canonical Albedo costume, no gameplay change$/, t.id)
  }
})
test('A3. 40 stable ids, both appearances × 20, all in Albedo\'s skin list; defaults preserved & unnumbered', () => {
  assert.equal(ALBEDO_THEME_SKIN_IDS.length, 40)
  const ids = getSkins('albedo').map(s => s.id)
  for (const id of ALBEDO_THEME_SKIN_IDS) assert(ids.includes(id), id)
  assert.deepEqual(ids.slice(0, 3), ['default', 'ben10Classic', 'ben10Prime'], 'defaults + Prime first, unchanged')
  assert.equal(albedoThemeOfSkin('default'), null); assert.equal(albedoThemeOfSkin('ben10Classic'), null)
  const names = getSkins('albedo').filter(s => s.albedoTheme).map(s => s.name)
  assert(names.includes('Kid — Red Singularity') && names.includes('Older — Red Singularity'), 'example names')
  assert.equal(albedoThemeSkinId('older', 'redSingularity'), 'albedoAlienX', 'reused existing id')
  assert.equal(albedoThemeSkinId('older', 'crimsonVictory'), 'albedoValkyrie', 'reused existing id')
  for (const s of getSkins('albedo').filter(s => s.albedoTheme)) assert(fs.existsSync(path.join(ROOT, s.portrait.replace(/^\.\//, ''))), 'portrait ' + s.portrait)
})

// ── B. gameplay zero-diff (machinery = harness/albedo_mirror.test.mjs) ───────────────────────────────────────
const STAGE = { stageLeft: 0, stageWidth: 1600 }
const CONTROLS = { left: 'a', right: 'd', up: 'w', down: 's', jump: 'w' }
function device(key, skinId, x, facing) {
  const f = { rosterKey: key, benExperimental: true, side: 'p1', health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x, y: 300,
    w: 60, h: 110, groundY: 410, facing, onGround: true, grounded: true, vx: 0, vy: 0, hitstun: 0, hitstop: 0, blockstun: 0,
    attackCooldown: 0, attacking: false, comboCounter: 0, damageMultiplier: 1, attackMultiplier: 1, defenseMultiplier: 1, jumpCount: 0, maxJumps: 2 }
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
function live(fs_, n = 1) {
  for (let i = 0; i < n; i++) {
    FRAME++; A.updatePendingSpawns()
    for (const f of fs_) { physics.moveFighter(f, {}, CONTROLS); physics.applyGravity(f) }
    for (const f of fs_) if (f.omnitrix) A.tickBenAlienForm(f, {}, { p1: fs_[0], p2: fs_[1], ...STAGE, seed: 4242, frame: FRAME })
    C.updateProjectiles(A.activeProjectiles, STAGE.stageWidth)
    C.resolveProjectileHitsMulti(A.activeProjectiles, fs_)
    for (const f of fs_) timers(f)
  }
}
const RENDER = new Set(['rosterKey', 'name', 'displayName', '_skinAnim', '_baseSkinAnim', '_recolorTag', 'animationData', 'portrait', 'skinTint', '_baseSkinTint',
  'tintStrength', 'color', 'omnitrix', 'basic_attacks', 'specials', 'currentAttack'])
const plain = v => JSON.parse(JSON.stringify(v, (k, x) => (x && typeof x === 'object' && x.rosterKey && k) ? `<fighter ${x.side}>` : (typeof x === 'function' ? 'fn' : x)))
function snap(f, t) {
  const o = {}
  for (const [k, v] of Object.entries(f)) if (!RENDER.has(k) && (typeof v !== 'object' || v === null)) o[k] = v
  return plain({ f: o, omnitrix: f.omnitrix ? { ...f.omnitrix } : null, normals: f.basic_attacks, specials: f.specials,
    dummy: { hp: t.health, hs: t.hitstun, bs: t.blockstun, x: Math.round(t.x * 1000), y: Math.round(t.y * 1000) },
    boxes: A.activeProjectiles.map(p => ({ x: Math.round(p.x * 100), y: Math.round(p.y * 100), d: p.damage, l: p.lifetime, w: p.width ?? p.w, h: p.height ?? p.h })),
    frames: Object.fromEntries(Object.entries(f._skinAnim || {}).map(([k, d]) => [k, d && { ...d, sheet: undefined }])) })   // frame geometry too
}
function script(skinId, alien) {
  A.activeProjectiles.splice(0, A.activeProjectiles.length); A.clearAbilityState(); FRAME = 0
  const f = device('albedo', skinId, 400, 1), t = dummy()
  const trace = [snap(f, t)]
  for (let i = 0; i < 30; i++) { live([f, t]); trace.push(snap(f, t)) }               // human frames first
  assert(F.applyAlien(f, alien), `applyAlien ${alien}`); f.transformed = true; f.y = 410 - f.h
  for (const dir of [null, 'F', 'D', 'B', 'U']) {
    ready(f); f.energy = 100; f._specialHeldDir = dir
    A.triggerSpecial(f, { p1: f, p2: t, ...STAGE, seed: 4242, frame: FRAME })
    for (let i = 0; i < 45; i++) { live([f, t]); trace.push(snap(f, t)) }
    t.health = 1000; t.x = 560; t.hitstun = 0
  }
  ready(f); f.energy = 100; A.triggerUltimate(f, { p1: f, p2: t, ...STAGE, seed: 4242, frame: FRAME })
  for (let i = 0; i < 240; i++) { live([f, t]); trace.push(snap(f, t)) }
  if (f.omnitrix) { f.omnitrix.vowActive = true; F.applyAlien(f, alien); trace.push(snap(f, t)) }
  F.revertToHuman?.(f); trace.push(snap(f, t))
  return trace
}
test('B0. variant numbers: every theme id = its appearance\'s base variant (HP, speed, jump, normals)', () => {
  for (const id of ALBEDO_THEME_SKIN_IDS) {
    const base = albedoBaseSkinId(id), a = device('albedo', id, 0, 1), b = device('albedo', base, 0, 1)
    assert.deepEqual(plain(a._benHumanStats), plain(b._benHumanStats), id)
    assert.equal(a._benVariant, b._benVariant, id)
    assert.deepEqual(plain(a.basic_attacks), plain(b.basic_attacks), id + ' normals')
    const ga = Object.fromEntries(Object.entries(a._skinAnim || characters.albedo.animationData).map(([k, d]) => [k, { ...d, sheet: 0 }]))
    const gb = Object.fromEntries(Object.entries(b._skinAnim || characters.albedo.animationData).map(([k, d]) => [k, { ...d, sheet: 0 }]))
    assert.deepEqual(ga, gb, id + ' human frame geometry (frames / sizes / anchors / timing)')
  }
})
const firstDiff = (a, b) => { for (let i = 0; i < a.length; i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return i; return -1 }
const baseTrace = {}
ALBEDO_THEME_SKIN_IDS.forEach((id, i) => {
  // 40 ids × 3 forms each, rotating → every form is covered under both appearances
  const forms = [ALBEDO_FORM_KEYS[i % 24], ALBEDO_FORM_KEYS[(i + 8) % 24], ALBEDO_FORM_KEYS[(i + 16) % 24]]
  test(`B. ${id} × ${forms.join('/')}: frame-identical to ${albedoBaseSkinId(id)}`, () => {
    for (const alien of forms) {
      const bk = albedoBaseSkinId(id) + '|' + alien
      const b = baseTrace[bk] ||= script(albedoBaseSkinId(id), alien), a = script(id, alien)
      assert.equal(a.length, b.length); const d = firstDiff(a, b); assert.equal(d, -1, `${alien}: first diff at frame ${d}`)
    }
  })
})

// ── C. isolation ─────────────────────────────────────────────────────────────────────────────────────────────
test('C1. no Albedo theme can attach to Ben (or anyone but albedo), for any id', () => {
  for (const id of ALBEDO_THEME_SKIN_IDS) for (const k of ['ben10', 'Ben10', 'goku', 'vilgax', undefined])
    assert.equal(albedoThemeForFighter({ rosterKey: k, skinId: id }), null, `${k} ${id}`)
  for (const id of ['default', 'ben10Classic', 'ben10Prime', 'ben10_crimson', 'ben10_azure']) {
    assert.equal(albedoBaseSkinId(id), id, 'Ben ids pass through'); assert.equal(albedoThemeForFighter({ rosterKey: 'albedo', skinId: id }), null)
  }
})
test('C2. Ben\'s skins, variant stats and frame data are unchanged (no theme skin, no __albedo sheet, same table)', () => {
  assert.deepEqual(getSkins('ben10').map(s => s.id), ['default', 'ben10Classic', 'ben10Prime', 'ben10_crimson', 'ben10_azure'])
  for (const s of getSkins('ben10')) for (const d of Object.values(s.animationData || characters.ben10.animationData)) assert(!/albedo/.test(d.sheet), d.sheet)
  for (const id of ['default', 'ben10Classic', 'ben10Prime']) {
    const b = device('ben10', id, 0, 1); assert.deepEqual(plain(b._benHumanStats), plain({ ...F.BEN10_VARIANT_STATS[id] }), id)
  }
  // an Albedo theme id handed to Ben (e.g. a corrupted save) is NOT mapped: Ben keeps the unchanged fallback (Alien Force)
  const b = device('ben10', 'albedoKidRubyOpal', 0, 1); assert.equal(b._benVariant, 'alienforce')
})
test('C3. Ben in a themed match: Ben\'s form tables never reference an Albedo-owned sheet; the manifest only lists Albedo files', () => {
  for (const alien of ALBEDO_FORM_KEYS) {
    const b = device('ben10', 'default', 400, 1); F.applyAlien(b, alien)
    for (const d of Object.values(b._skinAnim)) assert(!/__albedo/.test(d.sheet) && !ALBEDO_THEME_MANIFEST.strips[d.sheet.replace(/^\.\//, '')], `${alien} ${d.sheet}`)
  }
  for (const s of Object.keys(ALBEDO_THEME_MANIFEST.strips)) assert(/__albedo\.png$/.test(s), 'manifest lists only __albedo sheets: ' + s)
})
test('C4. every sheet Albedo can draw in any form (base + alternate tables) is in the theme manifest (no silent default)', () => {
  const missing = []
  for (const id of ['default', 'ben10Classic']) {
    const f = device('albedo', id, 400, 1)
    for (const d of Object.values(f._skinAnim || characters.albedo.animationData)) if (!ALBEDO_THEME_MANIFEST.strips[d.sheet.replace(/^\.\//, '')]) missing.push(d.sheet)
  }
  for (const alien of ALBEDO_FORM_KEYS) {
    const f = device('albedo', 'default', 400, 1); F.applyAlien(f, alien)
    for (const d of Object.values(f._skinAnim)) if (!ALBEDO_THEME_MANIFEST.strips[d.sheet.replace(/^\.\//, '')]) missing.push(d.sheet)
  }
  assert.deepEqual([...new Set(missing)], [])
})
test('C5. the theme modules never name Ben\'s raw art or write a Ben path; cache keys are namespaced "albedo|"', () => {
  for (const f of ['albedoThemes.js', 'albedoThemeRecolor.js', 'albedoThemeCache.js', 'albedoThemeRegions.js']) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
    assert(!/ben10_[a-z0-9_]+_uniform(__classic)?\.png/.test(src), f + ' names a Ben sheet')
  }
  assert(/return `albedo\|\$\{themeId\}/.test(fs.readFileSync(path.join(ROOT, 'albedoThemeCache.js'), 'utf8')), 'cache key namespace')
})

// ── D. engine ────────────────────────────────────────────────────────────────────────────────────────────────
const byForm = {}
for (const [s, f] of Object.entries(ALBEDO_THEME_MANIFEST.strips)) (byForm[f] ||= []).push(s)
const idleOf = f => byForm[f].find(s => /_idle_uniform__/.test(s)) || byForm[f][0]
test('D1. deterministic + alpha / size preserved (every form, 3 themes)', () => {
  for (const form of Object.keys(byForm)) {
    const src = decodePNG(path.join(ROOT, idleOf(form)))
    for (const t of [ALBEDO_THEMES[2], ALBEDO_THEMES[18], ALBEDO_THEMES[19]]) {
      const a = new Uint8ClampedArray(src.data), b = new Uint8ClampedArray(src.data)
      recolorAlbedoRGBA(a, src.width, src.height, form, t); recolorAlbedoRGBA(b, src.width, src.height, form, t)
      assert.deepEqual(Buffer.from(a), Buffer.from(b), `${form} ${t.id} deterministic`)
      for (let i = 3; i < a.length; i += 4) if (a[i] !== src.data[i]) assert.fail(`${form} alpha changed`)
    }
  }
})
test('D2. every appearance + form gets themed pixels under EVERY theme (no fallback to the default art)', () => {
  const low = []
  for (const form of Object.keys(byForm)) {
    const src = decodePNG(path.join(ROOT, idleOf(form)))
    let opaque = 0; for (let i = 3; i < src.data.length; i += 4) if (src.data[i]) opaque++
    for (const t of ALBEDO_THEMES) {
      const a = new Uint8ClampedArray(src.data); const { changed } = recolorAlbedoRGBA(a, src.width, src.height, form, t)
      if (changed / opaque < 0.08) low.push(`${form}/${t.id} ${(100 * changed / opaque).toFixed(1)}%`)
    }
  }
  assert.deepEqual(low, [])
})
test('D3. dark themes keep internal shading on dark-bodied / cosmic forms (Alien X, Ghostfreak, Upgrade, XLR8, Feedback)', () => {
  for (const form of ['alienx', 'ghostfreak', 'upgrade_ov', 'xlr8', 'feedback_ov']) {
    const src = decodePNG(path.join(ROOT, idleOf(form)))
    for (const t of ALBEDO_THEMES.filter(t => ['redSingularity', 'redlineVirus', 'scarletProtocol', 'falseEmperor'].includes(t.id))) {
      const a = new Uint8ClampedArray(src.data); recolorAlbedoRGBA(a, src.width, src.height, form, t)
      const lum = new Set(); for (let i = 0; i < a.length; i += 4) if (a[i + 3]) lum.add(Math.round((a[i] * 3 + a[i + 1] * 6 + a[i + 2]) / 10 / 8))
      assert(lum.size >= 5, `${form}/${t.id}: ${lum.size} luminance levels (flat silhouette)`)
    }
  }
})
test('D4. sparkle / star / glint placement is a pure sprite-local hash (no RNG) and sparse', () => {
  assert.equal(albedoHash(10, 20, 3), albedoHash(10, 20, 3))
  let stars = 0; for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) if (albedoHash(x, y, 3) % 131 < 2) stars++
  assert(stars > 100 && stars < 900, `star density ${stars}/40000`)
  for (const f of ['albedoThemes.js', 'albedoThemeRecolor.js', 'albedoThemeCache.js', 'albedoThemeRegions.js', 'albedoThemeManifest.js',
    'tools/albedo/png.mjs', 'tools/albedo/build_manifest.mjs', 'tools/albedo/render_frames.mjs', 'tools/albedo/gen_portraits.mjs'])
    assert(!/Math\.random\s*\(/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), 'Math.random() call in ' + f)
})
test('D5. reduced effects drops the stars / glints but keeps the palette', () => {
  const form = 'alienx', src = decodePNG(path.join(ROOT, idleOf(form))), t = ALBEDO_THEMES[2]
  const a = new Uint8ClampedArray(src.data), b = new Uint8ClampedArray(src.data)
  recolorAlbedoRGBA(a, src.width, src.height, form, t); recolorAlbedoRGBA(b, src.width, src.height, form, t, { reducedFx: true })
  let diff = 0; for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1]) diff++
  assert(diff > 0 && diff < 400, `star pixels removed: ${diff}`)
})
test('D6. regions documented per form; every region rule has a role + label', () => {
  for (const [form, R] of Object.entries(ALBEDO_REGIONS)) for (const r of R.rules) assert(r.role && (r.region || r.role === 'keep'), form)
})

console.log(`\nALBEDO THEMES: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
