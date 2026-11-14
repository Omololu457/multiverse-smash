import {spdBlueBarrierActive} from './spdBlueState.js'
import {drawBarrierRing} from './barrierRingFx.js'
import {sound,SFX} from './sound.js'
import {SPD_BLUE_BARRIER} from './spdBlueSkins.js'   // appearance skins: barrier colours (render-only)
const cache=new Map()
function image(url){if(!cache.has(url)){const im=new Image();im.src=url;cache.set(url,im)}return cache.get(url)}
export function drawSpdBlueFx(c,f){
 if(f?.rosterKey!=='spd_blue'||f.health<=0)return
 const tag=f._recolorTag,im=image(tag?`./assets/spd_blue/skins/${tag}/cells/phase0.png`:'./assets/spd_blue/cells/phase0.png'),a=f._groundTeleport?.action,bc=SPD_BLUE_BARRIER[tag]
 if(a){c.save();c.imageSmoothingEnabled=false;c.globalAlpha=0.28;const x=a.phase==='windup'?a.x0:f.x;if(im.complete&&im.naturalWidth)c.drawImage(im,x+f.w/2-44,f.y+f.h-123,88,123);c.restore()}
 if(spdBlueBarrierActive(f)||f._spdBlue?.pulse>0)drawBarrierRing(c,{cx:f.x+f.w/2+f.facing*24,cy:f.y+f.h*.5,r:f.h*.59,t:(f._spdBlue?.clock||0)*.12,color:bc?.[0]||'#78bdff',glow:bc?.[1]||'#287aff'})
}
export function playSpdBlueCues(f){const q=f?._spdBlue?.cues;if(!q?.length)return;for(const v of q)sound.play(v==='shot'?SFX.HIT_PROJECTILE:v==='block'?SFX.BLOCK:SFX.WHIFF);q.length=0}
