import { MR_FORM_SKINS } from './mrIncredibleSkins.js'
import { MR_SKIN_TABLE } from './mrIncredibleSkinTable.js'
export function drawMrHud(ctx,canvas,p1,p2){
 for(const [i,f] of [p1,p2].entries()){
  if(f?.rosterKey!=='mr_incredible')continue
  const s=f._mrIncredible;if(!s||!(s.remaining>0||s.pending))continue
  const color=(MR_SKIN_TABLE.find(k=>k.id===f.skinId)||MR_SKIN_TABLE[0]).effect
  const x=i?canvas.width-285:24,y=126
  ctx.save();ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle='#111b';ctx.fillRect(x-5,y-17,270,50);ctx.fillStyle=color;ctx.font='bold 15px sans-serif'
  ctx.fillText('BACK IN MY PRIME',x,y);ctx.font='12px sans-serif'
  ctx.fillText(s.remaining>0?`${(s.remaining/60).toFixed(1)}s  •  Special reserve ${Math.floor(s.reserve)}`:'Returning to veteran…',x,y+18)
  ctx.fillRect(x,y+23,250*Math.max(0,s.remaining)/900,3);ctx.restore()
 }
}

const imageCache=new Map()
const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false
function cached(src){if(!imageCache.has(src)){const im=new Image();im.src=src;imageCache.set(src,im)}return imageCache.get(src)}
// World-space, cosmetic only. Static patterns are baked; reduced effects uses one quiet ring.
export function drawMrEffects(ctx,p1,p2){for(const f of [p1,p2]){
 if(f?.rosterKey!=='mr_incredible')continue
 const s=f._mrIncredible;if(!s)continue
 const a=f.currentAttack,t=a?a.total-a.timer:0
 const entry=s.entry>0,hit=a?.mr?.clean&&t<=a.activeEnd+8
 if(!entry&&!hit)continue
 const c=(MR_SKIN_TABLE.find(k=>k.id===f.skinId)||MR_SKIN_TABLE[0]).effect
 if(hit&&!reduced){const forms=MR_FORM_SKINS[f.skinId]||MR_FORM_SKINS.default,d=forms[s.visual||'veteran'][['miSpin','miImpact'].includes(a.mr.key)?'miArc':'miBurst'];if(d){const im=cached(d.sheet);if(im.complete&&im.naturalWidth){const idx=Math.min(d.frames-1,Math.max(0,Math.floor((t-a.activeEnd)/2)));ctx.drawImage(im,idx*128,0,128,112,f.x+f.w/2-64*1.8,f.y+f.h-100*1.8,128*1.8,112*1.8)}}}
 const x=f.x+f.w/2+(entry?0:(a.mr.dir||1)*65),y=f.y+f.h-(entry?52:50)
 ctx.save();ctx.strokeStyle=c;ctx.globalAlpha=entry?.32:.6;ctx.lineWidth=entry?3:2
 ctx.beginPath();ctx.ellipse(x,y,entry?46:22,entry?60:27,0,0,Math.PI*2);ctx.stroke();ctx.restore()
}}

export function drawMrUnder(ctx,p1,p2){for(const f of [p1,p2]){
 if(f?.rosterKey!=='mr_incredible'||!(f.onGround||f.grounded))continue
 const d=f._skinAnim?.miShadow;if(!d)continue;const im=cached(d.sheet)
 if(im.complete&&im.naturalWidth){ctx.save();ctx.globalAlpha=.38;ctx.drawImage(im,0,0,128,112,f.x+f.w/2-64*1.8,f.y+f.h-100*1.8,128*1.8,112*1.8);ctx.restore()}
}}
