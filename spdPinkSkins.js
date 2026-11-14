// S.P.D. Pink Ranger appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio).
// Sheets are PRECOMPUTED by tools/spd_pink/build_skins.py → assets/spd_pink/skins/<tag>/ (masks in …/skins/masks/,
// region notes + per-file audit in docs/skins/spd_pink/region_mapping.json). No runtime recolouring.
// Creative crossover palettes (owner-authorised): colour schemes on Syd's unchanged pixels — not transformations,
// not canon Syd costumes, not other Rangers. The Alien X id ends in "AlienX" → the existing shared starfield draws on top.
// Iron Reserve's indicator is skin-independent (spdPinkFx.js STEEL); skins never change gameplay.
import {spd_pink} from './spdPinkData.js'
const SRC='https://www.spriters-resource.com/plug_play/powerrangersspdescapeofthefivefugitives/'
const common={unlockLevel:0,spriteScale:spd_pink.spriteScale,regionMapping:'./docs/skins/spd_pink/region_mapping.json',
 effectsPolicy:'Body, portrait, phase-step streak ghosts, Deltamax beam/muzzle and the Baton Reprisal ring follow the skin. Iron Reserve indicator stays steel for every skin; hit sparks stay neutral; the shared Zord (when it exists) keeps its own appearance.'}
// Baton Reprisal ring colours per skin (render-only; read by spdPinkFx.js).
export const SPD_PINK_FX_COLORS={default:['#ffb3d9','#ff3d96'],alienx:['#d8ffe4','#3fae6a'],diamondhead:['#a8fff2','#2fb8b0'],upgrade:['#8dffad','#1fd060'],
 heatblast:['#ffc070','#ff6a10'],chromastone:['#f0b8ff','#a43be0'],shadow:['#d6e0f0','#5a6c98']}
function skin(id,name,tag,source){
 return {...common,id,name,recolorTag:tag,classification:'Inspired Palette',inspired:true,source,
  portrait:`./assets/spd_pink/skins/${tag}/portrait.png`,
  animationData:Object.fromEntries(Object.entries(spd_pink.animationData).map(([k,d])=>[k,d?.sheet?{...d,sheet:d.sheet.replace('./assets/spd_pink/',`./assets/spd_pink/skins/${tag}/`)}:d]))}
}
const BEN10='Ben 10 franchise (Cartoon Network) — alien colour scheme only'
const alien=(id,name,tag,a,notes)=>skin(id,name,tag,{version:`${BEN10}: ${a}`,inspiration:a,url:SRC,
 caveat:`Crossover palette on the unchanged S.P.D. Pink pixels. ${notes} Not a transformation and not a canon Syd costume; no ${a} anatomy or effects added.`})
export const SPD_PINK_SKINS=[
 {...common,id:'default',name:'Default',classification:'Default',portrait:spd_pink.portrait,animationData:null,
  source:{version:'Power Rangers S.P.D.: Escape of the Five Fugitives (Plug & Play) — supplied Pink Ranger sheet, original pixels (ripped by the FRANKETE for TSR)',url:SRC}},
 alien('spdPinkAlienX','Alien X — Inspired','alienx','Alien X','Dark body panels, light trim, restrained green on the top suit highlight only; the existing shared Alien X starfield is drawn by the renderer.'),
 alien('spd_pink_inspired_diamondhead','Diamondhead — Inspired','diamondhead','Diamondhead','Cyan/teal panels, pale existing highlights. No crystal shards.'),
 alien('spd_pink_inspired_upgrade','Upgrade — Inspired','upgrade','Upgrade','Black/dark panels; the existing trim pixels turn green. No circuitry.'),
 alien('spd_pink_inspired_heatblast','Heatblast — Inspired','heatblast','Heatblast','Charcoal body with orange/red/gold existing accents. No flames.'),
 alien('spd_pink_inspired_chromastone','Chromastone — Inspired','chromastone','Chromastone','Purple-to-magenta body with contrasting pale lavender trim. No crystal protrusions.'),
 skin('spd_pink_inspired_shadow','SPD Shadow — Inspired Palette','shadow',
  {version:'Inspired by the S.P.D. Shadow Ranger colour scheme (Power Rangers S.P.D., 2005)',url:SRC,
   caveat:"Dark navy/charcoal suit with silver trim on existing regions only. Syd's own helmet, silhouette and identity; no canine features; not Doggie Cruger."}),
]
