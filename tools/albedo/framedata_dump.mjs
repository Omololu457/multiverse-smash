// Frame-data dump for the zero-diff check: every character's gameplay data + frame geometry, every skin's frame geometry,
// Ben/Albedo variant stats, and every Omnitrix form table (as Ben and as Albedo, every variant + every Albedo theme skin
// resolved to its base variant). USAGE: node tools/albedo/framedata_dump.mjs <repoRoot> > out.json   (deterministic)
import path from 'node:path'
const root = path.resolve(process.argv[2] || '.')
const imp = f => import(path.join(root, f))
const { characters } = await imp('characters.js'), S = await imp('skins.js'), F = await imp('fighters.js')
const geo = a => a && Object.fromEntries(Object.entries(a).map(([k, d]) => [k, d && Object.fromEntries(Object.entries(d).filter(([kk]) => kk !== 'sheet'))]))
const sheets = a => a && Object.fromEntries(Object.entries(a).map(([k, d]) => [k, d?.sheet ?? null]))
const out = { characters: {}, skins: {}, variantStats: F.BEN10_VARIANT_STATS, forms: {} }
for (const [k, c] of Object.entries(characters)) {
  out.characters[k] = JSON.parse(JSON.stringify({ stats: c.stats, basic_attacks: c.basic_attacks, specials: c.specials, ultimate: c.ultimate,
    transformations: c.transformations, frameData: c.frameData, moves: c.moves, geo: geo(c.animationData), sheets: sheets(c.animationData) }, (kk, v) => typeof v === 'function' ? 'fn' : v))
  out.skins[k] = (S.getSkins(k) || []).map(s => ({ id: s.id, geo: geo(S.getSkinAnimationData(k, s.id)), sheets: sheets(S.getSkinAnimationData(k, s.id)), spriteScale: s.spriteScale }))
}
const ids = { ben10: ['default', 'ben10Classic', 'ben10Prime'], albedo: ['default', 'ben10Classic', 'ben10Prime'] }
for (const key of ['ben10', 'albedo']) for (const id of ids[key]) for (const alien of Object.keys(F.BEN10_ALIEN_POOL)) {
  const f = { rosterKey: key, benExperimental: true, side: 'p1', health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x: 400, y: 300, w: 60, h: 110, facing: 1 }
  f._skinAnim = S.getSkinAnimationData(key, id); f._baseSkinAnim = f._skinAnim
  F.applyBen10VariantStats(f, id); F.setupBen10(f, [])
  try { F.applyAlien(f, alien) } catch (_) {}
  out.forms[`${key}|${id}|${alien}`] = JSON.parse(JSON.stringify({ stats: { mh: f.maxHealth, sp: f.speed, j: f.jumpForce, v: f._benVariant, dmg: f.damageMultiplier, def: f.defenseMultiplier },
    basic: f.basic_attacks, specials: f.specials, geo: geo(f._skinAnim), sheets: sheets(f._skinAnim) }, (kk, v) => typeof v === 'function' ? 'fn' : v))
}
process.stdout.write(JSON.stringify(out))
