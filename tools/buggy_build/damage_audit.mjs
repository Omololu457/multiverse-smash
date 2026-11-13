// tools/buggy_build/damage_audit.mjs — ROSTER-WIDE damageType audit (Buggy Phase 3).
//   node tools/buggy_build/damage_audit.mjs
// Imports characters.js (+ ZORO_MOVES / LUFFY_MOVES) in Node and tags EVERY move of EVERY character:
//   · `n`  = the type of that character's shared normals (light / heavy / up / air / down_air / crouch / air heavy)
//   · `m`  = per-move tags for specials, the ultimate, Zoro's / Luffy's command moves and the grab
// plus PROJECTILE_TAGS for every literal spawnProjectile(…, "type") in the codebase.
// Sources, in order: the explicit `damageType` already on a move → OVERRIDES below (curated, canon reasoning in
// the comment) → BLADE_USERS (characters whose normals are weapon cuts) → keyword rules from damageTypes.js →
// default blunt (melee) / projectile (projectiles).
// Writes damageTags.js (data, imported by damageTypes.js) and docs/buggy/DAMAGE_TAGS.md. Metadata only — no frame
// data is touched (harness/buggy_framedata_diff.mjs).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const TAGS = path.join(ROOT, 'damageTags.js')
if (!fs.existsSync(TAGS)) fs.writeFileSync(TAGS, 'export const DAMAGE_TAGS = {}; export const PROJECTILE_TAGS = {}\n')
const { characters } = await import(pathToFileURL(path.join(ROOT, 'characters.js')))
const { keywordType } = await import(pathToFileURL(path.join(ROOT, 'damageTypes.js')))
const { ZORO_MOVES } = await import(pathToFileURL(path.join(ROOT, 'zoroData.js')))
const { LUFFY_MOVES } = await import(pathToFileURL(path.join(ROOT, 'luffyData.js')))

// Characters whose standard normals are blade / claw / weapon CUTS (everyone else's normals are blunt strikes).
const BLADE_USERS = {
  zoro: 'three-sword style', ichigo: 'Zangetsu', zaraki: 'nozarashi', zaraki_shikai: 'nozarashi', byakuya: 'Senbonzakura',
  yamamoto: 'Ryūjin Jakka', miwa: 'katana', toji: 'Split Soul Katana / Inverted Spear', maki: 'cursed tools (blades / polearm)',
  yuta: 'katana', samurai_red_ranger: 'Spin Sword', gold_samurai_ranger: 'Barracuda Blade', green_samurai_ranger: 'Forest Spear',
  red_ranger_mmpr: 'Power Sword', deathstroke: 'sword', jason: 'machete', ghostface: 'knife', ghostface_billy: 'knife',
  ghostface_exe: 'knife', zenitsu: 'Nichirin blade', rengoku: 'Nichirin blade', shinobu: 'stinger blade', inosuke: 'twin serrated blades',
  shisui_blade: 'tantō / kunai', sasuke_adult: 'Kusanagi', vilgax: 'sword', mayuri: 'Ashisogi Jizō', killua: 'Rhythm Echo claws',
  zoldyck: 'Rhythm Echo claws', vegeta_dark: 'knife / sickle',
}
// Curated per-move overrides (canon reasoning). Applied after any explicit damageType.
const OVERRIDES = {
  sukuna: { cleave: 'slash', dismantle: 'slash', ultimate: 'slash', domain: 'slash' },        // Shrine = cutting technique
  alt_sukuna: { cleave: 'slash', ultimate: 'slash', domain: 'slash' },
  rengoku: { chargedFlameStrike: 'slash', flameCounter: 'slash', ultimate: 'slash' },        // Flame BREATHING is a sword form
  zenitsu: { thunderClapStrike: 'slash', sixfold: 'slash', godspeed: 'slash', ultimate: 'slash' },   // Thunder Breathing iai draws
  inosuke: { beastSpin: 'slash', beastDash: 'slash', beastLunge: 'slash', ultimate: 'slash' },
  shinobu: { poisonThrust: 'slash', butterflyFlit: 'slash', ultimate: 'slash' },
  ichigo: { chargedSlash: 'slash', ultimate: 'energy' },                                     // Getsuga = energy wave; charged slash = the blade
  zaraki: { chargedDash: 'slash', hollowStrike: 'slash', yachiruAssist: 'blunt', ultimate: 'slash' },
  zaraki_shikai: { chargedDash: 'slash', hollowStrike: 'slash', yachiruAssist: 'blunt', ultimate: 'slash' },
  byakuya: { ultimate: 'slash' }, yamamoto: { ultimate: 'energy' }, miwa: { ultimate: 'slash' },
  toji: { splitSoulKatana: 'slash', rapidSwordSlashes: 'slash', chainOfMiles: 'slash', playfulCloud: 'blunt', flyHeads: 'blunt', ultimate: 'slash' },
  maki: { kunaiThrow: 'slash', nunchakuFlurry: 'blunt', powerCharge: 'blunt', ultimate: 'slash' },
  samurai_red_ranger: { flameSlash: 'slash', ultimate: 'slash' }, gold_samurai_ranger: { lightSlash: 'slash', ultimate: 'slash' },
  green_samurai_ranger: { forestSpear: 'slash', ultimate: 'slash' }, red_ranger_mmpr: { ultimate: 'slash' },
  omega_ranger: { ultimate: 'slash' },                                                        // Omega Saber
  deathstroke: { ultimate: 'slash' }, jason: { relentlessSlash: 'slash', macheteThrow: 'slash' },
  ghostface: { guttingLunge: 'slash', lowGut: 'slash', backstagePass: 'slash', ultimate: 'slash' },
  ghostface_billy: { guttingLunge: 'slash', lowGut: 'slash', ultimate: 'slash' },
  hisoka: { ultimate: 'slash' },                                                              // Bloodlust card flurry
  chrollo: { bladeLunge: 'slash', nenBolt: 'energy' },
  goku_black: { ultimate: 'energy' },                                                         // "Sword Slash" = a ki blade
  goku_rose: { scythe: 'energy', swordOfLight: 'energy' },
  vegeta_dark: { knifeSlash: 'slash', sickleThrow: 'slash' },
  meruem: { kingsLunge: 'blunt' },                                                            // tail / fist, not a blade
  vilgax: { rubyCrescents: 'energy', thrownSword: 'slash', ultimate: 'slash' },
  gwen: { crescentSlash: 'energy', ultimate: 'energy' },                                      // mana blade
  shisui_blade: { backstab: 'slash', kunai: 'slash', iaido: 'slash', rising: 'slash', feint: 'slash', ultimate: 'slash' },
  shisui_trinity: { backstab: 'slash' }, shisui_puppeteer: { backstab: 'slash' },
  sasuke_adult: { swordSwap: 'slash' }, kakashi: { weaponThrow: 'slash' },
  killua: { ultimate: 'energy' }, zoldyck: { ultimate: 'energy' },
  yuji: { ultimate: 'blunt' }, aoi_todo: { ultimate: 'blunt' },                               // Black Flash = a punch
  green_arrow: {},                                                                             // arrows PIERCE — tagged projectile (not a cut)
  superman: { kryptonianGrab: 'grab' }, homelander: { takeARide: 'grab' },
}
const NORMAL_MAP = { light: 'light', heavy: 'heavy', upAttack: 'up', airAttack: 'air', downAir: 'down_air', crouchLight: 'crouchLight', lowAttack: 'lowAttack', airHeavy: 'air_heavy', air_heavy: 'air_heavy' }

const tags = {}, rows = []
let moveCount = 0
for (const [key, c] of Object.entries(characters)) {
  if (!c || key === 'buggy') continue
  const blade = !!BLADE_USERS[key]
  const n = blade ? 'slash' : 'blunt'
  const m = {}, ov = OVERRIDES[key] || {}
  const tag = (name, explicit, why) => {
    const t = explicit || ov[name] || keywordType(name) || (blade ? 'slash' : 'blunt')
    m[name] = t; moveCount++
    rows.push([key, name, t, explicit ? 'explicit' : ov[name] ? 'override' : keywordType(name) ? 'keyword' : blade ? 'blade user' : 'default', why || ''])
  }
  for (const [bk, md] of Object.entries(c.basic_attacks || {})) {
    if (bk === 'grab') { tag('grab', md?.damageType || 'grab', 'throw'); continue }
    const t = md?.damageType || n
    moveCount++; rows.push([key, `${bk} (normal)`, t, md?.damageType ? 'explicit' : blade ? 'blade user' : 'default', blade ? BLADE_USERS[key] : ''])
    if (md?.damageType && md.damageType !== n) m[NORMAL_MAP[bk] || bk] = md.damageType
  }
  for (const [sk, sd] of Object.entries(c.specials || {})) tag(sk, sd?.damageType, sd?.name || '')
  if (c.ultimate) {
    const nm = c.ultimate.name || ''
    const t = c.ultimate.damageType || ov.ultimate || keywordType(nm) || keywordType(c.ultimate.description) || (blade ? 'slash' : 'blunt')
    m.ultimate = t; moveCount++
    rows.push([key, 'ultimate', t, c.ultimate.damageType ? 'explicit' : ov.ultimate ? 'override' : (keywordType(nm) || keywordType(c.ultimate.description)) ? 'keyword' : blade ? 'blade user' : 'default', nm])
  }
  for (const [k, v] of Object.entries(ov)) if (!(k in m)) m[k] = v
  if (key === 'zoro') for (const [zk, zd] of Object.entries(ZORO_MOVES)) { const t = zd.damageType || 'slash'; m[zk] = t; moveCount++; rows.push([key, zk, t, zd.damageType ? 'explicit' : 'blade user', 'ZORO_MOVES']) }
  if (key === 'luffy') for (const [lk, ld] of Object.entries(LUFFY_MOVES)) { const t = ld.damageType || 'blunt'; m[lk] = t; moveCount++; rows.push([key, lk, t, ld.damageType ? 'explicit' : 'default', 'LUFFY_MOVES (rubber fists)']) }
  tags[key] = Object.keys(m).length ? { n, m } : { n }
}

// Projectile literals across the codebase.
const proj = {}
for (const f of fs.readdirSync(ROOT).filter(f => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8')
  for (const mt of src.matchAll(/spawnProjectile[A-Za-z]*\(\s*[A-Za-z_.$]+\s*,\s*["']([A-Za-z0-9_]+)["']/g)) proj[mt[1]] ||= keywordType(mt[1]) || 'projectile'
}
const PROJ_OVERRIDES = { susanoArrow: 'energy', susanooArrow: 'energy', byakuyaPetal: 'slash', yachiruThrow: 'blunt', oroSword: 'slash',
  bardockBladeWave: 'energy', madaraGunbaiSlashFx: 'energy', gold_light_slashwave: 'energy', forest_spear_wave: 'energy',
  mayuriSlash: 'slash', yujiSukunaSlash: 'slash', cursedSlash: 'slash', jasonMachete: 'slash', zarakiDashFx: 'slash',
  onokiRock: 'blunt', gonAdultRock: 'blunt', substitutionLog: 'blunt' }
Object.assign(proj, PROJ_OVERRIDES)
const sorted = Object.fromEntries(Object.entries(proj).sort(([a], [b]) => a.localeCompare(b)))

fs.writeFileSync(TAGS, `// damageTags.js — GENERATED by tools/buggy_build/damage_audit.mjs (do not hand-edit; re-run the audit).
// Roster-wide damageType tags: n = shared-normals type, m = per-move tags. PROJECTILE_TAGS = spawnProjectile types.
// Pure metadata read by damageTypes.js — never changes frame data.
export const DAMAGE_TAGS = ${JSON.stringify(tags)}
export const PROJECTILE_TAGS = ${JSON.stringify(sorted)}
`)

// ── docs/buggy/DAMAGE_TAGS.md ──
const count = (arr, i) => arr.reduce((o, r) => (o[r[i]] = (o[r[i]] || 0) + 1, o), {})
const byType = count(rows, 2), projByType = Object.values(sorted).reduce((o, t) => (o[t] = (o[t] || 0) + 1, o), {})
let md = `# Damage-type tags (Buggy Phase 3)

Generated by \`tools/buggy_build/damage_audit.mjs\` → \`damageTags.js\`, resolved at runtime by \`damageTypes.js\`.
Types: **slash** · **blunt** · **projectile** · **energy** · **grab**. Untagged → **blunt** (melee / damage calls) or
**projectile** (projectiles). Tags are metadata only: \`harness/buggy_framedata_diff.mjs\` proves every other
character's frame data (damage, startup, active, recovery, hitstun, range, stats) is byte-identical.

**What uses it:** Buggy's Bara Bara no Mi passive — a **slash** hit (melee, projectile or direct damage call) does 0
damage to Buggy. NOT immune to blunt, projectile (arrows / bullets / rocks), energy (beams, ki, explosions, fire,
lightning) or grab. **Haki** ignores the immunity: anything flagged \`haki: true\`, and **Roronoa Zoro once his
Conqueror's Haki passive has fired** (\`_zoro.hakiUsed\`).

**Resolution order:** explicit \`damageType\` on the attack/projectile/call → this table → keyword rules on the move
name → default.

Totals: ${Object.keys(tags).length} characters · ${moveCount} moves tagged (${Object.entries(byType).map(([k, v]) => `${k} ${v}`).join(', ')}) ·
${Object.keys(sorted).length} projectile types (${Object.entries(projByType).map(([k, v]) => `${k} ${v}`).join(', ')}).

## Blade users (normals = slash)

| Character | Weapon |
|---|---|
${Object.entries(BLADE_USERS).map(([k, w]) => `| ${k} | ${w} |`).join('\n')}

Every other character's shared normals (light / heavy / up / air / down-air / crouch) are **blunt**.

## Every move

| Character | Move | Type | Source | Note |
|---|---|---|---|---|
${rows.map(r => `| ${r.map(x => String(x).replace(/\|/g, '/')).join(' | ')} |`).join('\n')}

## Projectiles (spawnProjectile types)

| Projectile | Type |
|---|---|
${Object.entries(sorted).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

Runtime-built projectile names (template strings) fall back to the same keyword rules (\`keywordType\`).

## Buggy's own moves
Buggy's moves carry explicit tags in \`buggyData.js\` (knives / carve / fan / Festival / stabs = slash; kicks / Buggy
Ball / cannon wheel = blunt). Sources: \`light\`, \`bSlash\`, \`heavy\`, \`bLow\`, \`air\`, \`down_air\`, \`bWake\`, \`bFan\`,
\`bFestival\`, \`bStab\` = slash · \`bKick\`, \`up\`, \`bBall\` = blunt · \`grab\` = grab.
`
fs.writeFileSync(path.join(ROOT, 'docs/buggy/DAMAGE_TAGS.md'), md)
console.log(`tagged ${Object.keys(tags).length} characters · ${moveCount} moves ·`, byType, `· ${Object.keys(sorted).length} projectiles`, projByType)
