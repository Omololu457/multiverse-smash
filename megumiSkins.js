// Megumi Fushiguro (megumi_fushiguro) appearance skins — cosmetic only (identical geometry, pivots, frame data,
// hitboxes, audio, damage). Sheets are PRECOMPUTED by tools/megumi/build_skins.py → assets/megumi_fushiguro/skins/<tag>/
// (palette spec tools/megumi/skins.json, per-strip region audit docs/skins/megumi/region_mapping.json, review sheet
// docs/megumi/skins_contact.png). Regions per cell: outline / skin / fx / shadow / hair / uniform — never one global
// swap; skin tones, warm gold accents and the outer outline are never recoloured, and summon strips are not reskinned.
// No runtime recolouring, no per-frame pixel scans, no Math.random.
// Ids are prefixed "mg_", never END in "AlienX" (the shared game.js starfield would fill the whole cell rect) and never
// contain "cyborg" (Superman's Cyborg-Superman eye overlay matches any skinId containing it).
import { megumi_fushiguro as MG } from './megumiData.js'
import { MEGUMI_SKIN_TABLE } from './megumiSkinTable.js'
const SHEET = 'Megumi Fushiguro JUS-style sheet by xxniiroxx (supplied JPG), original pixels'
const common = { unlockLevel: 0, spriteScale: MG.spriteScale, regionMapping: './docs/skins/megumi/region_mapping.json',
  effectsPolicy: 'Body, portrait, cut-in, Shadow Step echoes and the HUD accent follow the skin. Skin tones, gold accents, the outline and the shikigami are never recoloured.' }
// Owner colours (HUD accent pair, Shadow Step echo tint), render-only, read by megumiFx.js.
export const MEGUMI_FX_COLORS = { default: { hud: ['#6a7cff', '#d8deff'], echo: '#20264a' },
  ...Object.fromEntries(MEGUMI_SKIN_TABLE.map(t => [t.tag, { hud: t.hud, echo: t.echo }])) }
const retag = tag => Object.fromEntries(Object.entries(MG.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/megumi_fushiguro/', `./assets/megumi_fushiguro/skins/${tag}/`) } : d]))
export const MEGUMI_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: MG.portrait, animationData: null, source: { version: SHEET } },
  ...MEGUMI_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: !!t.crossover, crossover: t.crossover, pattern: t.pattern || null,
    source: { version: t.crossover ? `${t.crossover} — colour scheme only (inspired, not official)` : 'Original custom cosmetic design',
      inspiration: t.inspiration, base: SHEET, caveat: "Colour interpretation on Megumi's unchanged pixels; no geometry, logo or stat change." },
    portrait: `./assets/megumi_fushiguro/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
