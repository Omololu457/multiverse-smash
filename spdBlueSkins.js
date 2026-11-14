// S.P.D. Blue Ranger appearance skins — cosmetic only (same geometry, pivots, frame data, hitboxes and audio).
// Sheets: tools/spd_blue/skins/build_inspired.py → assets/spd_blue/skins/<tag>/ (region masks in …/skins/masks/,
// mapping in docs/skins/spd_blue/region_mapping.json). Rules for crossover palettes: docs/skins/CROSSOVER_PALETTE_RULES.md.
// The Alien X id ends in "AlienX" → game.js drawAlienXStarfield draws the shared starfield on top.
import { spd_blue } from './spdBlueData.js'
const SRC = 'https://www.spriters-resource.com/plug_play/powerrangersspdescapeofthefivefugitives/'
const BEN10 = 'Ben 10 (Cartoon Network, 2005) / Ben 10: Alien Force — alien colour scheme only'
const common = { unlockLevel: 0, spriteScale: spd_blue.spriteScale, regionMapping: './docs/skins/spd_blue/region_mapping.json',
  effectsPolicy: 'Body, portrait, teleport ghost, blaster shot and barrier ring follow the skin. Baton blade, muzzle flash and the shared Falconzord stay unchanged.' }
// Barrier ring colours per skin (render-only; read by spdBlueFx.js).
export const SPD_BLUE_BARRIER = { alienx: ['#c8ffd8', '#2fbf6a'], upgrade: ['#8dffad', '#1fd060'], diamondhead: ['#a8ffe6', '#2fbf9a'],
  heatblast: ['#ffc070', '#ff6a10'], spd_red: ['#ff8a80', '#e01010'], shadow: ['#ffe39a', '#b8901c'],
  green: ['#9dffa0', '#21b552'], yellow: ['#fff59b', '#d6c21c'], pink: ['#ffb0d6', '#ff2a86'], swat: ['#b9c6d8', '#5a6c88'],
  asquad: ['#ff7a70', '#b80c0c'], ben10: ['#7dff7a', '#1aa31a'], albedo: ['#ff9a90', '#c81414'], omega: ['#9cc6ff', '#2a64e0'],
  nova: ['#d0a8ff', '#7a32d0'], nightpatrol: ['#8ffcff', '#00c8e0'], chrome: ['#f0f6ff', '#9aa6ba'], holo: ['#b8fff8', '#38c8c8'],
  gruumm: ['#ffd86a', '#8a2ac8'], katlab: ['#ffe9a0', '#d0a020'], glitter: ['#bfe0ff', '#4a8cff'] }
function skin(id, name, tag, classification, source) {
  return { ...common, id, name, recolorTag: tag, classification, inspired: true, source,
    portrait: `./assets/spd_blue/skins/${tag}/portrait.png`,
    animationData: Object.fromEntries(Object.entries(spd_blue.animationData).map(([k, d]) =>
      [k, d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/spd_blue/', `./assets/spd_blue/skins/${tag}/`) } : d])) }
}
const alien = (id, name, tag, a, notes) => skin(id, name, tag, 'Crossover palette',
  { version: `${BEN10}: ${a}`, inspiration: a, url: SRC, caveat: `Crossover palette on the unchanged S.P.D. Blue pixels. ${notes} No ${a} anatomy or effects.` })
export const SPD_BLUE_SKINS = [
  { ...common, id: 'default', name: 'Default', classification: 'Default', portrait: spd_blue.portrait, animationData: null,
    source: { version: 'Power Rangers S.P.D.: Escape of the Five Fugitives (Plug & Play) — supplied sheet, original pixels', url: SRC } },
  alien('spdBlueAlienX', 'Alien X — Inspired', 'alienx', 'Alien X', 'Void-black suit, white trim; the shared Alien X starfield is drawn by the renderer.'),
  alien('spd_blue_inspired_upgrade', 'Upgrade — Inspired', 'upgrade', 'Upgrade', 'Black suit with glowing green trim.'),
  alien('spd_blue_inspired_diamondhead', 'Diamondhead — Inspired', 'diamondhead', 'Diamondhead', 'Green-crystal suit colour only; no crystal shards.'),
  alien('spd_blue_inspired_heatblast', 'Heatblast — Inspired', 'heatblast', 'Heatblast', 'Magma suit, yellow-hot trim; no flame particles.'),
  skin('spd_blue_inspired_spd_red', 'SPD Red — Inspired Palette', 'spd_red', 'Team palette swap',
    { version: 'Same game: the S.P.D. Red Ranger sheet\'s exact 6-step red ramp (assets/spd_red) mapped onto Blue\'s 6-step blue ramp', url: SRC,
      caveat: 'Blue Ranger\'s pose set and kit in Red\'s colours — not the Red Ranger character.' }),
  skin('spd_blue_inspired_shadow', 'SPD Shadow — Inspired', 'shadow', 'Original interpretation',
    { version: 'Inspired by the S.P.D. Shadow Ranger colour scheme (Power Rangers S.P.D., 2005)', url: SRC,
      caveat: 'Charcoal-navy suit with badge-gold trim — an interpretation, not a sampled costume. Blue Ranger geometry only: no canine features, not presented as Doggie Cruger.' }),
  // S.P.D. squad colours — exact suit ramps sampled from the supplied Plug & Play Green / Yellow / Pink Ranger sheets.
  ...[['green', 'S.P.D. Green — Inspired Palette', 'Green'], ['yellow', 'S.P.D. Yellow — Inspired Palette', 'Yellow'], ['pink', 'S.P.D. Pink — Inspired Palette', 'Pink']]
    .map(([t, n, c]) => skin(`spd_blue_inspired_${t}`, n, t, 'Team palette swap', { version: `Same game: the supplied ${c} Ranger sheet's exact 6-step suit ramp mapped onto Blue's 6-step blue ramp`, url: SRC,
      caveat: `Blue Ranger's pose set and kit in the ${c} Ranger's colours — not the ${c} Ranger character.` })),
  ...[['swat', 'S.W.A.T. Mode — Inspired', 'Gunmetal suit and steel trim inspired by the S.P.D. S.W.A.T. armour. Palette only — no armour panels or helmet changes added.'],
      ['asquad', 'A-Squad (Rogue) — Inspired', 'Black suit, red trim — a rogue-squad interpretation. Not the A-Squad Rangers or their suits.'],
      ['omega', 'Omega Tribute — Inspired', 'White suit, blue trim. Colour tribute only.'],
      ['nova', 'Nova Tribute — Inspired', 'Silver suit, purple trim. Colour tribute only.'],
      ['nightpatrol', 'Delta Base Night Patrol — Inspired', 'Near-black suit, neon-cyan trim. Original livery.'],
      ['chrome', 'Chrome Deltamax — Inspired', 'High-contrast mirror-silver ramp. Original livery.'],
      ['holo', 'Holo-Training Sim — Inspired', 'Light cyan/teal hologram tones; the sprite stays fully opaque (palette only).'],
      ['gruumm', "Gruumm's Conquest — Inspired", 'Villain purple suit, gold trim. Not Gruumm or Troobian armour.'],
      ['katlab', "Kat's Lab Prototype — Inspired", 'Lab-white suit, gold trim. Original prototype livery.'],
      ['glitter', 'Sapphire Glitter — Inspired', 'Canon blue with baked glitter (fixed integer pixel hash — same method as the One Piece glitter skins, no RNG).']]
    .map(([t, n, c]) => skin(`spd_blue_inspired_${t}`, n, t, 'Original interpretation', { version: 'Original palette for this project, themed on Power Rangers S.P.D. (2005)', url: SRC, caveat: c })),
  alien('spd_blue_inspired_ben10', 'Ben 10 — Inspired', 'ben10', 'Ben Tennyson', 'Green-jacket suit, black trim.'),
  alien('spd_blue_inspired_albedo', 'Albedo — Inspired', 'albedo', 'Albedo', 'Pale-grey suit, red trim.'),
]
