// Dash Parr palette-swap skins — cosmetic only (identical geometry, pivots, frame data, hitboxes, audio).
// Sheets PRECOMPUTED by tools/dash_parr/build_skins.py → assets/dash_parr/skins/<tag>/ (rules + audit in
// docs/dash/skin_regions.json). Speed streaks, dust, eye whites and the hit-flash silhouette stay white.
import {dash_parr} from './dashParrData.js'
const SRC='Game Boy Advance — The Incredibles: supplied Dash sheet (ripped by redblueyellow, no credit needed)'
const common={unlockLevel:0,spriteScale:dash_parr.spriteScale,regionMapping:'./docs/dash/skin_regions.json',
 effectsPolicy:'Body + Blur afterimages + Laps / Incredi-Rush render bodies follow the skin. White speed streaks stay white; code-drawn speed lines are white for every skin.'}
function skin(id,name,tag,desc){
 return {...common,id,name,recolorTag:tag,classification:'Palette swap',source:{version:`${SRC}; ${desc}`},
  portrait:`./assets/dash_parr/skins/${tag}/portrait.png`,
  animationData:Object.fromEntries(Object.entries(dash_parr.animationData).map(([k,d])=>[k,d?.sheet?{...d,sheet:d.sheet.replace('./assets/dash_parr/',`./assets/dash_parr/skins/${tag}/`)}:d]))}
}
export const DASH_PARR_SKINS=[
 {...common,id:'default',name:'Supersuit',classification:'Default',portrait:dash_parr.portrait,animationData:null,source:{version:`${SRC}; original pixels`}},
 skin('dash_parr_incredibles2','Incredibles 2','incredibles2','suit red → near-black, black trim (gloves / boots / trunks band) → red; mask stays black'),
 skin('dash_parr_trackstar','Track Star','trackstar','suit → blue, trim → gold; mask stays black'),
]
