// S.P.D. Green Ranger — render-only FX + audio cues. Reads sim state, never writes it.
// Supplied art only: streak ghosts (fx_streak0/1) for the phase step, muzzle star (fx_beam0).
// Scan pulse + mark indicator reuse the existing drawBarrierRing (geometry independent of gameplay).
import {drawBarrierRing} from './barrierRingFx.js'
import {sound,SFX} from './sound.js'
import {spdGreenMarkTarget} from './spdGreenState.js'
import {SPD_GREEN_FX_COLORS} from './spdGreenSkins.js'
const cache=new Map()
function image(url){if(!cache.has(url)){const im=new Image();im.src=url;cache.set(url,im)}return cache.get(url)}
const art=(f,n)=>image(f._recolorTag?`./assets/spd_green/skins/${f._recolorTag}/${n}.png`:`./assets/spd_green/${n}.png`)
const SCALE=2.2/1.18
function blit(c,im,x,footY,dir,alpha){
 if(!im.complete||!im.naturalWidth)return
 const w=im.naturalWidth*SCALE,h=im.naturalHeight*SCALE
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha=alpha;c.translate(x,footY);if(dir<0)c.scale(-1,1);c.drawImage(im,-w/2,-h,w,h);c.restore()
}
export function drawSpdGreenFx(c,f){
 if(f?.rosterKey!=='spd_green'||f.health<=0)return
 const s=f._spdGreen,col=SPD_GREEN_FX_COLORS[f._recolorTag]||SPD_GREEN_FX_COLORS.default,a=f._groundTeleport?.action,dir=f.facing||1
 // Phase step: supplied streak ghost at the departure point, diagonal phase ghost while in transit.
 if(a){const x=a.phase==='windup'?a.x0+f.w/2:f.x+f.w/2;blit(c,art(f,a.phase==='transit'?'fx_streak1':'fx_streak0'),x-dir*6,f.y+f.h,a.dir,a.phase==='recovery'?0.18:0.42)}
 const at=f.attacking?f.currentAttack:null
 // Aura Read: pulse ring grows across the scan window (cosmetic radius, NOT the 350px gameplay range).
 if(at?.name==='gScan'){const t=at.total-at.timer,p=Math.max(0,Math.min(1,(t-at.activeStart)/(at.activeEnd-at.activeStart+1)))
  if(t>=at.activeStart&&t<=at.activeEnd)drawBarrierRing(c,{cx:f.x+f.w/2,cy:f.y+f.h*0.35,r:18+p*46,t:(s?.clock||0)*0.3,color:col[0],glow:col[1]})}
 // Mark indicator over the marked opponent's head, fades in its last second.
 const tgt=s?.mark?spdGreenMarkTarget(f):null
 if(tgt&&tgt.health>0){c.save();c.globalAlpha=Math.min(1,s.mark.timer/60);drawBarrierRing(c,{cx:tgt.x+tgt.w/2,cy:tgt.y-14,r:11,t:(s.clock||0)*0.25,color:col[0],glow:col[1]});c.restore()}
 if(s?.muzzle>0)blit(c,art(f,'fx_beam0'),f.x+f.w/2+dir*72,f.y+f.h-84+8,dir,0.9)
}
export function playSpdGreenCues(f){const q=f?._spdGreen?.cues;if(!q?.length)return;for(const v of q)sound.play(v==='shot'?SFX.HIT_PROJECTILE:v==='mark'||v==='scan'?SFX.BLOCK:SFX.WHIFF);q.length=0}
