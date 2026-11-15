import { MR_MOVES, mrTimeline } from './mrIncredibleData.js'
import { MR_ANIM } from './mrIncredibleSprites.js'
import { MR_SKIN_TABLE } from './mrIncredibleSkinTable.js'
// Cached immutable paired form maps. Skin IDs never enter simulation decisions.
export const MR_FORM_SKINS=Object.fromEntries(MR_SKIN_TABLE.map(s=>[s.id,Object.fromEntries(Object.entries(MR_ANIM).map(([form,anims])=>[form,Object.fromEntries(Object.entries(anims).map(([k,a])=>[k,{...a,sheet:a.sheet.replace('/default/',`/${s.tag}/`)}]))]))]))
export const MR_SKINS=MR_SKIN_TABLE.map(s=>({...s,unlockLevel:0,spriteScale:1.8,recolorTag:s.tag,portrait:`./assets/mr_incredible/${s.tag}/veteran/portrait.png`,animationData:MR_FORM_SKINS[s.id].veteran,
 regionMapping:'./docs/mr_incredible/region_mapping.json',source:{version:'Supplied GBA The Incredibles sheets; ripped by Perseus',inspiration:s.name,caveat:'Cosmetic interpretation on original pixels; no new anatomy or poses.'}}))
// Precomputed visual alternatives use every useful authored roll/spin/slam group.
const variants=new Map()
for(const [skin,forms] of Object.entries(MR_FORM_SKINS))for(const [form,base] of Object.entries(forms)){
 const list=[];for(let n=0;n<4;n++){
  const spin=['miSpin','miRoll','miSpinGround','miRollFlash'][n],slam=['miSlam','miSlamAlt','miSlamFlash','miSlamAlt'][n]
  const retime=(a,m)=>({...a,frameTimeline:mrTimeline(a,m)})
  list.push({...base,miSpin:retime(base[spin],MR_MOVES.miSpin),miSlam:retime(base[slam],MR_MOVES.miSlam),getup:n===1?base.miRecovery:base.getup,hurt_air:n===2?base.miDefeatAir:base.hurt_air})
 }
 variants.set(skin+':'+form,list)
}
export function mrVisual(f){if(f?.rosterKey!=='mr_incredible')return;const skin=MR_FORM_SKINS[f.skinId]?f.skinId:'default',form=f._mrIncredible?.visual||'veteran';f._skinAnim=variants.get(skin+':'+form)[(f._mrIncredible?.serial||0)%4]}
