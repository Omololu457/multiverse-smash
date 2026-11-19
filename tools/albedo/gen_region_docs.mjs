// Writes docs/albedo/skins/<form>_REGIONS.md for every Albedo form + both human appearances + portraits, from the live
// region rules (albedoThemeRegions.js), the manifest stats, and the form's own frame table (which actions have dedicated
// art vs reuse another strip — recorded, never invented). USAGE: node tools/albedo/gen_region_docs.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALBEDO_REGIONS, ALBEDO_FORM_KEYS } from '../../albedoThemeRegions.js'
import { ALBEDO_THEME_MANIFEST } from '../../albedoThemeManifest.js'
import * as F from '../../fighters.js'
import { getSkinAnimationData } from '../../skins.js'
import { characters } from '../../characters.js'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = path.join(ROOT, 'docs/albedo/skins'); fs.mkdirSync(OUT, { recursive: true })
const MAT = { fire: 'Fire form: flame (energy) and white-hot core (core = energyCore) take different ramps from the rock body (primary).',
  crystal: 'Crystal form: the facet ramp is the source brightness → bright-to-dark facets survive; pure-white facet highlights are kept.',
  mechanical: 'Mechanical form: metal body (primary), plates (secondary), joints (accent) and circuit light (energy) stay distinct.',
  fur: 'Fur form: fur shades (primary / secondary) are separate from the Ultimatrix mark / eyes (energy).',
  cosmic: 'Dark / cosmic form: flat-black source → base colour + a graded 3px inner rim (limb separation); stars only on Red Singularity, interior pixels only.',
  spectral: 'Dark-bodied spectral form: the grey ramp is kept as the shading ramp (inner rim when the theme is dark); alpha untouched (fades / intangibility keep their curve).',
  ice: 'Ice form: ice hide and dark hide / cloak are separate ramps.', energy: 'Energy form: electric / glow regions are energy; the body suit is secondary.',
  armour: 'Armoured form: shell / plates / lenses separate.', slime: 'Slime form: the goo body is primary; the projector is accent.', organic: 'Organic form.',
  carapace: 'Carapace form.', shell: 'Shell form.', plant: 'Plant form.' }
const KEY_ACTIONS = ['idle', 'walk', 'light', 'heavy', 'hurt', 'knockdown']
function actionsOf(form) {
  let anim
  if (form === 'older') anim = characters.albedo.animationData
  else if (form === 'kid') anim = getSkinAnimationData('albedo', 'ben10Classic')
  else { const f = { rosterKey: 'albedo', benExperimental: true, side: 'p1', health: 950, maxHealth: 950, energy: 100, maxEnergy: 100, x: 0, y: 0, w: 60, h: 110, facing: 1 }
    f._skinAnim = null; F.applyBen10VariantStats(f, 'default'); F.setupBen10(f, []); F.applyAlien(f, form); anim = f._skinAnim }
  const idle = anim?.idle?.sheet
  return KEY_ACTIONS.map(a => { const d = anim?.[a]; return [a, !d ? 'MISSING (no art — not invented)' : (a !== 'idle' && d.sheet === idle ? 'reuses the idle strip (no dedicated art)' : 'own art')] })
}
const fmt = r => r.hex ? 'exact: ' + r.hex.map(h => '`' + h + '`').join(' ') : ['h', 's', 'v', 'y'].filter(k => r[k]).map(k => `${k} ${r[k][0]}–${r[k][1]}`).join(', ') + (r.shade ? `, shade ×${r.shade}` : '') + (r.rim ? ', inner rim' : '') + (r.flat ? ', flat' : '') + (r.squash ? `, squash ${r.squash}` : '')
const index = []
for (const form of Object.keys(ALBEDO_REGIONS)) {
  const R = ALBEDO_REGIONS[form], st = ALBEDO_THEME_MANIFEST.stats[form], vr = ALBEDO_THEME_MANIFEST.vref[form]
  const L = [`# ${R.label} — Albedo theme regions`, '', `Albedo-only. Source: Albedo's own \`__albedo\` sheets${st ? ` (${st.strips} strips, base + alternate tables)` : ' (portrait art)'}. ` +
    'Rules are first-match; unmatched pixels are kept. Each matched pixel takes its role\'s theme colour, ramped by its own brightness ÷ the rule\'s reference brightness (vref). Alpha is never changed.', '']
  if (R.material) L.push(MAT[R.material] || '', '')
  L.push('| # | region | role | match | vref | pixels (all strips) |', '|---|---|---|---|---|---|')
  R.rules.forEach((r, i) => L.push(`| ${i} | ${r.region || (r.role === 'keep' ? 'outline (kept)' : '')} | ${r.role} | ${fmt(r)} | ${vr ? vr[i] : '—'} | ${st ? st.px[i] : '—'} |`))
  if (!form.startsWith('portrait_')) {
    L.push('', '## Animation coverage (themed wherever the art exists)', '', '| action | art |', '|---|---|', ...actionsOf(form).map(([a, s]) => `| ${a} | ${s} |`))
  }
  const missing = []
  if (form === 'older') missing.push('No separate jacket trim / cuff colour in the art: the sleeve stripes are pure white `#ffffff`, the same entry as the eye whites and shoe soles, so they are KEPT white (a trim recolor would need new art to separate them). The accent role therefore has no region on the older sprite; the Ultimatrix watch shares the jacket reds and follows the primary.')
  if (form === 'kid') missing.push('Shoes are black + white soles shared with the outline / shirt whites: kept (no separate shoe region in the art).')
  if (form === 'highbreed') missing.push('No Ultimatrix green existed on Ben\'s Highbreed (the `__albedo` strips are identical copies), so there is no energy region.')
  if (form === 'heatblast' || form === 'megawhatt' || form === 'eyeguy' || form === 'arcticguana' || form === 'waterhazard' || form === 'wildmutt_ov') missing.push('Separate FX sheets (`*_fx_*`: beams, bursts, puffs) are not body strips and keep their colours — the same rule the original __albedo pass used, so they look the same for Ben and Albedo and never leak between owners.')
  if (missing.length) L.push('', '## Genuine gaps (recorded, not invented)', '', ...missing.map(m => '- ' + m))
  if (fs.existsSync(path.join(ROOT, 'docs/albedo/skins/img', `${form}_themes.png`))) L.push('', `![${form} — default + 20 themes, bright and dark stage](img/${form}_themes.png)`)
  fs.writeFileSync(path.join(OUT, `${form}_REGIONS.md`), L.join('\n') + '\n'); index.push(form)
}
console.log('region docs', index.length)
