// S.P.D. Green Ranger appearance skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio).
// Sheets are PRECOMPUTED by tools/spd_green/build_skins.py → assets/spd_green/skins/<tag>/ (masks in …/skins/masks/,
// region notes + per-file audit in docs/skins/spd_green/region_mapping.json). No runtime recolouring.
// Creative crossover palettes (owner-authorised): they are colour schemes on Bridge's unchanged pixels,
// not transformations, not other Rangers. The Alien X id ends in "AlienX" → the existing shared starfield draws on top.
import {spd_green} from './spdGreenData.js'
const SRC='https://www.spriters-resource.com/plug_play/powerrangersspdescapeofthefivefugitives/'
const common={unlockLevel:0,spriteScale:spd_green.spriteScale,regionMapping:'./docs/skins/spd_green/region_mapping.json',
 effectsPolicy:'Body, portrait, phase-step streak ghosts, Deltamax beam/muzzle and the scan/mark ring follow the skin. Hit sparks stay neutral; the shared Zord (when it exists) keeps its own appearance.'}
// Scan / mark ring colours per skin (render-only; read by spdGreenFx.js).
export const SPD_GREEN_FX_COLORS={default:['#9dffa0','#21b552'],alienx:['#d8ffe4','#3fae6a'],upgrade:['#8dffad','#1fd060'],
 diamondhead:['#a8fff2','#2fb8b0'],heatblast:['#ffc070','#ff6a10'],spd_blue:['#78bdff','#287aff'],shadow:['#d6e0f0','#5a6c98']}
function skin(id,name,tag,classification,source){
 return {...common,id,name,recolorTag:tag,classification,inspired:true,source,
  portrait:`./assets/spd_green/skins/${tag}/portrait.png`,
  animationData:Object.fromEntries(Object.entries(spd_green.animationData).map(([k,d])=>[k,d?.sheet?{...d,sheet:d.sheet.replace('./assets/spd_green/',`./assets/spd_green/skins/${tag}/`)}:d]))}
}
const BEN10='Ben 10 (Cartoon Network, 2005) / Ben 10: Alien Force — alien colour scheme only'
const alien=(id,name,tag,a,notes)=>skin(id,name,tag,'Crossover palette',{version:`${BEN10}: ${a}`,inspiration:a,url:SRC,
 caveat:`Crossover palette on the unchanged S.P.D. Green pixels. ${notes} Not a transformation; no ${a} anatomy or effects.`})
export const SPD_GREEN_SKINS=[
 {...common,id:'default',name:'Default',classification:'Default',portrait:spd_green.portrait,animationData:null,
  source:{version:'Power Rangers S.P.D.: Escape of the Five Fugitives (Plug & Play) — supplied Green Ranger sheet, original pixels (ripped by the FRANKETE for TSR)',url:SRC}},
 alien('spdGreenAlienX','Alien X — Inspired','alienx','Alien X','Charcoal/black suit, light trim, restrained green on the top suit highlight only; the shared Alien X starfield is drawn by the renderer.'),
 alien('spd_green_inspired_upgrade','Upgrade — Inspired','upgrade','Upgrade','Dark suit; the existing trim pixels glow bright green. No circuitry added.'),
 alien('spd_green_inspired_diamondhead','Diamondhead — Inspired','diamondhead','Diamondhead','Cyan/teal suit, pale highlights, deep cool shadows. No crystals.'),
 alien('spd_green_inspired_heatblast','Heatblast — Inspired','heatblast','Heatblast','Dark volcanic suit, warm orange/red trim. No flames.'),
 skin('spd_green_inspired_spd_blue','SPD Blue — Inspired Palette','spd_blue','Team palette swap',
  {version:"Same game: the S.P.D. Blue Ranger sheet's exact 6-step blue ramp mapped onto Green's 6-step green ramp",url:SRC,
   caveat:"Bridge Carson's own helmet, pose set, kit and identity in Blue's colours — not Sky Tate or the Blue Ranger."}),
 skin('spd_green_inspired_shadow','SPD Shadow — Inspired Palette','shadow','Original interpretation',
  {version:'Inspired by the S.P.D. Shadow Ranger colour scheme (Power Rangers S.P.D., 2005)',url:SRC,
   caveat:'Navy/charcoal suit, silver trim, existing regions only. No canine features; not Doggie Cruger.'}),
]
