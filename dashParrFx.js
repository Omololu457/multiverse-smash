// Dash Parr — render-only FX + HUD + audio cue drain. Reads sim state, never writes it. Everything visual that is
// not gameplay (afterimage trail history, speed lines, jitter) lives here in module memory (WeakMap), OUT of
// GAME_STATE. Supplied art only: the strips / streak frames cut by tools/dash_parr/extract.py; lines are code-drawn.
import {DASH_PARR_ANIM} from './dashParrSprites.js'
import {DASH_PARR_MOVES,INCREDI_RUSH,MOMENTUM} from './dashParrData.js'
import {isDashParr,momentumTier} from './dashParrState.js'
import {playDashParrCue} from './dashParrSound.js'
const S=2   // sprite scale (characters entry spriteScale)
const cache=new Map()
function image(url){if(!cache.has(url)){const im=new Image();im.src=url;cache.set(url,im)}return cache.get(url)}
const sheetUrl=(f,action)=>f._recolorTag?`./assets/dash_parr/skins/${f._recolorTag}/${action}.png`:`./assets/dash_parr/${action}.png`
// Blit frame i of a strip with its feet/body-centre origin at (cx, footY).
function blitFrame(c,f,action,i,cx,footY,dir,alpha=1,scale=S){
 const A=DASH_PARR_ANIM[action];if(!A)return
 const im=image(sheetUrl(f,action));if(!im.complete||!im.naturalWidth)return
 const k=((i%A.frames)+A.frames)%A.frames
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha*=alpha;c.translate(cx,footY);if(dir<0)c.scale(-1,1)
 c.drawImage(im,k*A.frameWidth,0,A.frameWidth,A.frameHeight,-A.originX*scale,-A.originY*scale,A.frameWidth*scale,A.frameHeight*scale);c.restore()
}
// Render-only trail memory (never part of GAME_STATE).
const trails=new WeakMap()
function trail(f){let t=trails.get(f);if(!t){t=[];trails.set(f,t)}return t}

// Body alpha multiplier (game.js multiplies it into the shared body-alpha): the real sprite is hidden while Laps
// circles the target and while Incredi-Rush storms, because this module draws Dash at his render offsets instead.
export function dashParrBodyAlpha(f){
 if(!isDashParr(f))return 1
 const a=f.attacking?f.currentAttack:null,t=a?a.total-a.timer:-1
 if(a?.name==='laps'&&t>=a.activeStart&&t<=a.activeEnd)return 0
 if(a?.name==='rush'&&f._dashParr?.ult)return 0
 return 1
}

// BEHIND the body: Blur-tier afterimage trail, Blur Dash streak ghosts, Laps loop, Rush storm.
export function drawDashParrUnder(c,f,opp){
 if(!isDashParr(f)||f.health<=0)return
 const s=f._dashParr,a=f.attacking?f.currentAttack:null,t=a?a.total-a.timer:-1,cx=f.x+f.w/2,foot=f.y+f.h,dir=f.facing||1
 const tr=trail(f),tier=momentumTier(f),fast=tier==='blur'||(a&&['blurDash','sidestep','panic','hydro'].includes(a.name))
 if(fast)tr.unshift({x:cx,y:foot,dir,act:a?.name==='hydro'?'hydro':'run',i:Math.floor((s?.clock||0)/4)});else tr.length=Math.max(0,tr.length-2)
 if(tr.length>6)tr.length=6
 for(let k=tr.length-1;k>=1;k--){const p=tr[k];blitFrame(c,f,p.act,p.i,p.x,p.y,p.dir,0.42*(1-k/7))}
 if(a?.name==='laps'&&t>=a.activeStart&&t<=a.activeEnd){
  const L=a.dp?.lapTarget||(opp?{x:opp.x,y:opp.y,w:opp.w||48,h:opp.h||94}:null)
  const ox=L?L.x+L.w/2:cx,oy=L?L.y+L.h:foot,ph=(t-a.activeStart)/8*Math.PI*2,r=(L?L.w/2:24)+34
  for(let g=3;g>=0;g--){const q=ph-g*0.45,x=ox+Math.cos(q)*r,back=Math.sin(q)<0,mv=-Math.sin(q)>=0?1:-1
   blitFrame(c,f,'laps',Math.floor((t+g)/2),x,oy-(back?6:0),mv,(g===0?1:0.3)*(back?0.55:1),back?S*0.92:S)}
  speedRing(c,ox,oy-40,r+8,ph)
 }
 const u=s?.ult
 if(a?.name==='rush'&&u&&opp){
  const st=t-INCREDI_RUSH.startup,ox=u.lx+(opp.w||48)/2,oy=u.ly+(opp.h||94)
  for(let g=0;g<5;g++){const q=st*0.55+g*1.26;blitFrame(c,f,g%2?'run':'flurry',st+g,ox+Math.cos(q)*(70+g*6),oy-8-Math.abs(Math.sin(q*1.3))*30,Math.cos(q)>0?-1:1,0.28)}
  if(u.pos)blitFrame(c,f,'ultimate',u.hits,ox+u.pos.dx,oy+u.pos.dy,-u.pos.side,1)
  speedRing(c,ox,oy-46,92,st*0.4)
 }
}
function speedRing(c,x,y,r,ph){
 c.save();c.strokeStyle='rgba(255,255,255,0.75)';c.lineWidth=2;c.lineCap='round'
 for(let k=0;k<10;k++){const q=ph+k*0.63,rr=r*(0.75+0.25*((k*7)%5)/4);c.globalAlpha=0.25+0.5*((k*3)%4)/3
  c.beginPath();c.arc(x,y,rr,q,q+0.35);c.stroke()}
 c.restore()
}
// IN FRONT of the body: speed lines on dashes / flurry fists, Blur-ready glint, sidestep flash.
export function drawDashParrFx(c,f){
 if(!isDashParr(f)||f.health<=0)return
 const s=f._dashParr,a=f.attacking?f.currentAttack:null,t=a?a.total-a.timer:-1,dir=f.facing||1,cx=f.x+f.w/2,foot=f.y+f.h
 c.save();c.lineCap='round'
 if(a&&(a.name==='blurDash'||a.name==='hydro'||a.name==='heavy')&&t>=a.activeStart-2&&t<=a.activeEnd+2){
  c.strokeStyle='rgba(255,255,255,0.85)';c.lineWidth=2
  for(let k=0;k<7;k++){const y=f.y+12+k*((a.name==='hydro'?f.h*0.4:f.h-20)/7)+(a.name==='hydro'?f.h*0.55:0),len=40+((k*37+t*11)%60)
   c.globalAlpha=0.35+((k*5)%3)*0.2;c.beginPath();c.moveTo(cx-dir*18,y);c.lineTo(cx-dir*(18+len),y);c.stroke()}
 }
 if(a?.name==='flurry'&&t>=a.activeStart&&t<=a.activeEnd){
  c.strokeStyle='rgba(255,255,255,0.9)';c.lineWidth=3
  for(let k=0;k<5;k++){const y=f.y+22+((k*13+t*7)%34),x0=cx+dir*10,len=22+((k*9+t*5)%26);c.globalAlpha=0.4+0.12*k
   c.beginPath();c.moveTo(x0,y);c.lineTo(x0+dir*len,y-4+((k+t)%3)*4);c.stroke()}
 }
 if(a?.name==='sidestep'&&t<=10){c.globalAlpha=0.5*(1-t/10);c.fillStyle='#fff';c.fillRect(f.x-6,f.y,f.w+12,f.h)}
 if(s?.blurReady){c.globalAlpha=0.6+0.4*Math.sin((s.clock||0)*0.4);c.fillStyle='#fff6a8';c.beginPath();c.arc(cx+dir*10,f.y+8,4,0,Math.PI*2);c.fill()}
 c.restore()
}
// Drain the sim's audio cue queue (sim pushes names; audio is presentation-only).
export function playDashParrCues(f){
 const s=f?._dashParr,q=s?.cues;if(!q?.length)return
 for(const v of q)playDashParrCue(v,f)
 q.length=0
 if(isDashParr(f)&&momentumTier(f)!=='jog'&&(f.onGround||f.grounded)&&Math.abs(f.vx||0)>=MOMENTUM.runMinSpeed&&(s.clock%9)===0)playDashParrCue('step',f)
}
// HUD — Momentum gauge directly under the energy bar (P1 left / P2 right). Tier colour + label.
const TIER={jog:['#7fb4ff','JOG'],sprint:['#ffb21f','SPRINT'],blur:['#ffffff','BLUR']}
// The energy panel sits at the bottom of the screen (ui.js enY = ch − 41, panel bottom ≈ ch − 22) → the gauge
// runs just below it, label at the gauge's outer end.
export function drawDashParrHud(c,cv,p1,p2,globalFrame=0){
 const cw=cv?.width||1280,ch=cv?.height||720,barW=Math.max(220,Math.min(420,cw*0.28)),pad=14
 const one=(f,flip)=>{
  if(!isDashParr(f))return
  const m=f._dashParr?.momentum||0,tier=momentumTier(f),[col,label]=TIER[tier]
  const w=barW*0.62,h=5,x=flip?cw-pad-70-w:pad+70,y=ch-DASH_HUD_BOTTOM
  c.save();c.fillStyle='rgba(0,0,0,0.6)';c.fillRect(x-1,y-1,w+2,h+2)
  c.fillStyle=tier==='blur'?(globalFrame%10<5?'#ffffff':'#ffe066'):col
  const fw=w*Math.max(0,Math.min(1,m/MOMENTUM.max));c.fillRect(flip?x+w-fw:x,y,fw,h)
  c.fillStyle='rgba(255,255,255,0.5)';for(const q of [MOMENTUM.sprintAt/MOMENTUM.max]){const qx=flip?x+w-w*q:x+w*q;c.fillRect(qx,y-1,1,h+2)}
  c.font='bold 9px Arial';c.textAlign=flip?'right':'left';c.textBaseline='middle';c.fillStyle=col;c.fillText(`MOMENTUM ${label}`,flip?x-6:x+w+6,y+h/2)
  c.restore()
 }
 one(p1,false);one(p2,true)
}
export const DASH_HUD_BOTTOM=17
export const DASH_RUSH_HITS=INCREDI_RUSH.hits
export {DASH_PARR_MOVES}
