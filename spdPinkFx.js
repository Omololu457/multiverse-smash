// S.P.D. Pink Ranger — render-only FX + audio cues. Reads sim state, never writes it.
// Supplied art only: streak ghosts (fx_streak0/1) for the phase step, muzzle star (fx_beam0).
// Iron Reserve + Baton Reprisal indicators reuse the existing drawBarrierRing (cosmetic geometry, not gameplay).
// The Iron Reserve indicator uses FIXED steel colours for every skin (mechanically identical, readable on
// light and dark stages); skin colours only tint the stance ring. No new costume geometry, no "nugget" sprite.
import {drawBarrierRing} from './barrierRingFx.js'
import {sound,SFX} from './sound.js'
import {SPD_PINK_FX_COLORS} from './spdPinkSkins.js'
import {IRON_RESERVE} from './spdPinkData.js'
const STEEL=['#eef2f8','#7d889c']
const cache=new Map()
function image(url){if(!cache.has(url)){const im=new Image();im.src=url;cache.set(url,im)}return cache.get(url)}
const art=(f,n)=>image(f._recolorTag?`./assets/spd_pink/skins/${f._recolorTag}/${n}.png`:`./assets/spd_pink/${n}.png`)
const SCALE=2.2/1.18
function blit(c,im,x,footY,dir,alpha){
 if(!im.complete||!im.naturalWidth)return
 const w=im.naturalWidth*SCALE,h=im.naturalHeight*SCALE
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha=alpha;c.translate(x,footY);if(dir<0)c.scale(-1,1);c.drawImage(im,-w/2,-h,w,h);c.restore()
}
export function drawSpdPinkFx(c,f){
 if(f?.rosterKey!=='spd_pink'||f.health<=0)return
 const s=f._spdPink,col=SPD_PINK_FX_COLORS[f._recolorTag]||SPD_PINK_FX_COLORS.default,a=f._groundTeleport?.action,dir=f.facing||1
 if(a){const x=a.phase==='windup'?a.x0+f.w/2:f.x+f.w/2;blit(c,art(f,a.phase==='transit'?'fx_streak1':'fx_streak0'),x-dir*6,f.y+f.h,a.dir,a.phase==='recovery'?0.18:0.42)}
 const at=f.attacking?f.currentAttack:null,t=at?at.total-at.timer:-1,clk=(s?.clock||0)
 const fistX=f.x+f.w/2+dir*f.w*0.55,fistY=f.y+f.h*0.38
 // Iron Reserve preparation: steel ring tightens on the lead hand across the 24f window.
 if(at?.name==='pPrep'&&t>=at.activeStart&&t<=at.activeEnd){const p=(t-at.activeStart)/(at.activeEnd-at.activeStart+1);drawBarrierRing(c,{cx:fistX,cy:fistY,r:30-p*18,t:clk*0.4,color:STEEL[0],glow:STEEL[1]})}
 // Stored charge: small steel ring on the lead hand + a pip over the head that drains with the 300f lifetime.
 if(s?.reserve){const k=s.reserve.timer/IRON_RESERVE.lifetime
  drawBarrierRing(c,{cx:fistX,cy:fistY,r:9,t:clk*0.3,color:STEEL[0],glow:STEEL[1]})
  c.save();const px=f.x+f.w/2,py=f.y-18;c.fillStyle='#11141a';c.fillRect(px-17,py-4,34,8);c.fillStyle=STEEL[0];c.fillRect(px-15,py-2,30*k,4)
  c.strokeStyle=STEEL[1];c.lineWidth=1;c.strokeRect(px-17.5,py-4.5,35,9);c.restore()}
 // Baton Reprisal ready window: skin-tinted ring in front of Syd (ready frames only).
 if(at?.name==='pStance'&&t>=at.activeStart&&t<=at.activeEnd)drawBarrierRing(c,{cx:f.x+f.w/2+dir*28,cy:f.y+f.h*0.45,r:22,t:clk*0.5,color:col[0],glow:col[1]})
 if(s?.muzzle>0)blit(c,art(f,'fx_beam0'),f.x+f.w/2+dir*70,f.y+f.h-82+8,dir,0.9)
}
export function playSpdPinkCues(f){const q=f?._spdPink?.cues;if(!q?.length)return
 for(const v of q)sound.play(v==='shot'?SFX.HIT_PROJECTILE:v==='counter'?(SFX.COUNTER_HIT||SFX.BLOCK):v==='prep'||v==='reserve'||v==='stance'||v==='iron'?SFX.BLOCK:SFX.WHIFF);q.length=0}
