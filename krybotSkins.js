// Cosmetic-only adapters for the existing skin selection/persistence/LAN paths.
import { krybot } from './krybotData.js'
const TV = 'https://www.rangercentral.com/database/2005_spd/images/prspd-vi-krybots.jpg'
const DS = 'https://spritedatabase.net/file/18617'
const common = {
  unlockLevel: 0, spriteScale: krybot.spriteScale,
  regionMapping: './docs/skins/krybot/region_mapping.json',
  effectsPolicy: 'Body/portrait only. Original energy and explosion pixels/colors remain unchanged.',
  compatibility: 'Supplied ordinary-Krybot geometry and pivots retained. This is a palette adaptation, not replacement DS geometry or added weapons.',
}
function palette(id, name, tag, source) {
  return { ...common, id, name, source,
    portrait: `./assets/krybot/skins/${tag}/portrait.png`,
    animationData: Object.fromEntries(Object.entries(krybot.animationData).map(([key,def]) =>
      [key, { ...def, sheet: `./assets/krybot/skins/${tag}/${key}.png` }])) }
}
export const KRYBOT_SKINS = [
  { ...common, id:'default', name:'Default — Plug & Play',
    portrait:krybot.portrait, animationData:null,
    source:{version:'Power Rangers S.P.D.: Escape of the Five Fugitives, Plug & Play, supplied RGB sheet',
      url:'https://www.spriters-resource.com/plug_play/powerrangersspdescapeofthefivefugitives/asset/560349/',
      sha256:'f6f58db89dd5c19f62839ab89038c8ec1e8c21052c0468309c576cb609c78c14'},
    compatibility:'Original supplied pixels, unchanged; all gameplay body actions use the existing base strips.' },
  palette('krybot_tv','Television Palette','tv',{
    version:'Power Rangers S.P.D. (2005), ordinary silver-headed Krybot; television palette adapted to Plug & Play pixels',
    url:TV, corroboration:'https://entertainment.ha.com/itm/movie-tv-memorabilia/costumes/power-rangers-spd-bvs-entertainment-2005-group-of-5-krybot-costumes-and-2-accessories/a/7354-11280.s',
    officialClip:'https://www.youtube.com/watch?v=h_aUr_EmoaM',
    caveat:'Silver/black materials and orange circuitry are interpreted into the source ramps, not sampled as an exact calibrated costume color.'}),
  palette('krybot_super_legends_ds','Super Legends DS','ds',{
    version:'Power Rangers: Super Legends (Nintendo DS, 2007), regular ordinary-model enemy; archive uploaded 2014-05-04 by Grim',url:DS,
    image:'https://spritedatabase.net/files/ds/73/Sprite/Krybot.png',
    caveat:'Cyan sensor/circuitry and dark/silver finish only. No DS wrist blade, new panels or borrowed frames.'}),
  palette('krybot_super_legends_ds_red','Super Legends DS Red','ds_red',{
    version:'Power Rangers: Super Legends (Nintendo DS, 2007), red ordinary-model enemy; same archived game sheet, bottom-right palette reference',url:DS,
    image:'https://spritedatabase.net/files/ds/73/Sprite/Krybot.png',
    caveat:'Red finish and red sensor/chest accents mapped onto existing shoulder/chest/knee/boot pixels; dark cyan undertones. No new plate or aperture geometry.'}),
]

// Crossover palettes ("— Inspired"): cosmetic Ben 10 alien colour schemes on the SAME ordinary-Krybot pixels
// (tools/krybot/skins/build_inspired.py reuses build.py's anatomical masks + finite ramps). Not canon Krybot finishes.
// See docs/skins/CROSSOVER_PALETTE_RULES.md. The Alien X id ends in "AlienX" → game.js drawAlienXStarfield overlay.
const BEN10 = 'Ben 10 (Cartoon Network, 2005) / Ben 10: Alien Force — alien colour scheme only'
function inspired(id, name, tag, alien, notes) {
  return { ...palette(id, name, tag, { version: `${BEN10}: ${alien}`, inspiration: alien, url: TV,
    caveat: `Crossover palette mapped onto existing Krybot geometry. ${notes} No ${alien} anatomy, features or effects added.` }),
    classification: 'Crossover palette', inspired: true }
}
KRYBOT_SKINS.push(
  inspired('krybotAlienX', 'Alien X — Inspired', 'alienx', 'Alien X', 'Void-black/charcoal body, green sensors; the shared Alien X starfield is drawn by the renderer.'),
  inspired('krybot_inspired_upgrade', 'Upgrade — Inspired', 'upgrade', 'Upgrade', 'Black body; existing plates and circuitry glow green.'),
  inspired('krybot_inspired_heatblast', 'Heatblast — Inspired', 'heatblast', 'Heatblast', 'Charred-rock armor, magma undersuit, fire plates. No flame particles added.'),
  inspired('krybot_inspired_diamondhead', 'Diamondhead — Inspired', 'diamondhead', 'Diamondhead', 'Green-crystal armor colour only; no crystal shards or new edges.'),
  inspired('krybot_inspired_xlr8', 'XLR8 — Inspired', 'xlr8', 'XLR8', 'Speed-blue armor, black undersuit, white plates, green sensors. No tail or visor shape.'),
  inspired('krybot_inspired_fourarms', 'Four Arms — Inspired', 'fourarms', 'Four Arms', 'Red armor, white plates, yellow sensors. Still two arms — palette only.'),
)

// Second batch (user request routed via the S.P.D. Red session). Same masks + finite ramps (build_inspired.py).
const SPD = 'Power Rangers S.P.D. (2005)'
function themed(id, name, tag, classification, version, caveat) {
  return { ...palette(id, name, tag, { version, url: TV, caveat }), classification, inspired: true }
}
KRYBOT_SKINS.push(
  inspired('krybot_inspired_ben10', 'Ben 10 — Inspired', 'ben10', 'Ben Tennyson', 'Green-jacket armor, black undersuit, white plates, green sensors.'),
  inspired('krybot_inspired_albedo', 'Albedo — Inspired', 'albedo', 'Albedo', 'Pale-grey armor, red plates and sensors.'),
  themed('krybot_inspired_leader_blue', 'Squad Leader (Blue) — Inspired Palette', 'leaderblue', 'Original interpretation', `Squad-leader palette themed on ${SPD} Krybot commanders`,
    'ONLY the helmet shell + sensors are recoloured on the ordinary Krybot body (TV palette). This is NOT the Blue-Head model, whose different geometry still needs real art (NEEDS_ART.md).'),
  themed('krybot_inspired_leader_orange', 'Squad Leader (Orange) — Inspired Palette', 'leaderorange', 'Original interpretation', `Squad-leader palette themed on ${SPD} Krybot commanders`,
    'ONLY the helmet shell + sensors are recoloured on the ordinary Krybot body (TV palette). This is NOT the Orange-Head model, whose different geometry still needs real art (NEEDS_ART.md).'),
  themed('krybot_inspired_gruumm', "Gruumm's Elite Guard — Inspired", 'gruumm', 'Original interpretation', `Villain livery themed on ${SPD} (Emperor Gruumm)`, 'Purple armor, gold plates. Palette only — no Troobian armour shapes.'),
  themed('krybot_inspired_broodwing', "Broodwing's Arsenal — Inspired", 'broodwing', 'Original interpretation', `Arms-dealer livery themed on ${SPD} (Broodwing)`, 'Dark bat-purple, sickly green circuitry. No wings or bat features.'),
  themed('krybot_inspired_mora', "Mora's Toy Army — Inspired", 'mora', 'Original interpretation', `Toy livery themed on ${SPD} (Mora)`, 'Candy colours (pink helmet, mint armor, lemon plates). Palette only.'),
  themed('krybot_inspired_rust', 'Rust Bucket — Inspired', 'rust', 'Original interpretation', 'Original scrapyard livery', 'Rust armor, oxidised-bronze plates.'),
  themed('krybot_inspired_chrome', 'Chrome Krybot — Inspired', 'chrome', 'Original interpretation', 'Original mirror-silver livery', 'High-contrast silver ramp (dark troughs, bright speculars).'),
  themed('krybot_inspired_training', 'Delta Base Training Drone — Inspired', 'training', 'Original interpretation', `Test-target livery themed on ${SPD} (S.P.D. white/blue)`, 'White armor, S.P.D.-blue undersuit and plates.'),
  themed('krybot_inspired_glitter', 'Gala Glitter — Inspired', 'glitter', 'Original interpretation', 'Original glitter livery', 'Hot-pink chrome with baked glitter (fixed integer pixel hash — same method as the One Piece glitter skins, no RNG).'),
)
