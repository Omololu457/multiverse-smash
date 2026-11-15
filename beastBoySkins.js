// Beast Boy (beast_boy) appearance skins — cosmetic only (identical geometry, anchors, frame data, hitboxes, hurtboxes,
// audio, damage). Sheets are PRECOMPUTED by tools/beast_boy/build_skins.py → assets/beast_boy/skins/<tag>/ (palette spec
// tools/beast_boy/skins.json; per-form region audit docs/skins/beast_boy/region_mapping.json; review sheet
// docs/skins/beast_boy/skins_contact.png; mapping doc docs/skins/beast_boy/FORM_PALETTE_MAP.md). No runtime recolouring,
// no per-frame pixel scans, no new canvases. Every skin covers the humanoid, every morph transition, all four animals,
// reactions, defeat, the cut-in bust + mouth pieces, the menu portrait and the health-icon expressions.
// Decorative MATERIALS (Alien X stars, Galaxy Glitter sparkle, Opal Safari iridescence) are precomputed overlay strips at
// assets/beast_boy/skins/<tag>/mat/p<k>/<action>.png drawn by beastBoyFx.js inside the body's own draw rect (body pixels
// only by construction), with a static single-phase fallback under reduced effects.
// Ids are prefixed "bb_" and never end in "AlienX" (game.js's generic starfield gate) nor contain "cyborg".
// These are NOT canonical Beast Boy outfits: crossover palettes are colour schemes only; naturalistic skins use living-
// animal references (triceratops colours are speculative); the rest are original cosmetic designs (user-authorised).
import { beast_boy } from './beastBoyData.js'
import { BEAST_BOY_SKIN_TABLE } from './beastBoySkinTable.js'
const SHEET = 'Game Boy Advance — Teen Titans — Playable Characters — Beast Boy (supplied sheet), original pixels'
const common = { unlockLevel: 0, spriteScale: beast_boy.spriteScale, regionMapping: './docs/skins/beast_boy/region_mapping.json',
  effectsPolicy: 'Humanoid, all morph transitions, gorilla / triceratops / tiger / bird, hurt, defeat, cut-in bust + mouths, portrait and health icons follow the skin. Outlines, eye-whites, teeth and the tiger slash arcs stay neutral.' }
// Owner colours (HUD accent pair + material), render-only, read by beastBoyFx.js.
export const BEAST_BOY_FX_COLORS = { default: { hud: ['#3fd07a', '#c8ffd8'], material: null },
  ...Object.fromEntries(BEAST_BOY_SKIN_TABLE.map(t => [t.tag, { hud: t.hud, material: t.material }])) }
const retag = tag => Object.fromEntries(Object.entries(beast_boy.animationData).map(([k, d]) =>
  [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/beast_boy/', `./assets/beast_boy/skins/${tag}/`) } : d]))
export const BEAST_BOY_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: beast_boy.portrait, animationData: null, source: { version: SHEET } },
  ...BEAST_BOY_SKIN_TABLE.map(t => ({ ...common, id: t.id, name: t.name, recolorTag: t.tag, classification: t.classification,
    inspired: /Inspired/.test(t.classification), crossover: t.crossover, material: t.material?.kind || null,
    source: { version: t.crossover ? `${t.crossover} — colour scheme only` : 'Original cosmetic design (user-authorised)', inspiration: t.inspiration, refs: t.refs, base: SHEET,
      caveat: 'Colour interpretation on Gar Logan\'s unchanged pixels; not a canonical Beast Boy outfit.' },
    portrait: `./assets/beast_boy/skins/${t.tag}/portrait.png`, animationData: retag(t.tag) })),
]
