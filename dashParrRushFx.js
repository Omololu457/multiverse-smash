// Dash Parr — INCREDI-RUSH, the cinematic ultimate (RENDER half). Reads dashParrRush.rushScene(); never writes sim state.
// One screen-space pass (cineRegistry.registerCineScreen, after the world, before the HUD):
//   1. a screen PUSH-IN (the finished world frame re-drawn scaled about the subject; the engine camera caps at ×1.15),
//      with a horizontal smear on whip-pans;
//   2. the FROZEN WORLD: saturation drained + a cold blue wash + vignette (the world is slowed to a crawl);
//   3. DASH IN FULL COLOUR on top (his engine sprite is hidden for the scene): afterimages of every hit still hanging
//      around the foe, zip streaks between hits, the strike pose, impact stars, the sprint with its ghost trail, the
//      sonic-boom rings;
//   4. screen FX: focus lines, impact frame (inverted), hit flashes, letterbox, title cut-in, hit counter, captions.
// The world → screen matrix is recorded by dashParrFx.drawDashParrUnder (world pass). Render-only noise = hash of the
// scene's frame counter; nothing here touches the simulation.
import {rushScene,dashRushPose} from './dashParrRush.js'
import {RUSH_SCENE as R,INCREDI_RUSH} from './dashParrData.js'
import {DASH_PARR_ANIM} from './dashParrSprites.js'
import {registerCineScreen} from './cineRegistry.js'

const S=2.5   // Dash's sprite scale (characters entry spriteScale × GLOBAL_SPRITE_SCALE)
let XF=null
export function setRushWorldXf(m){XF=m}
const cache=new Map()
function image(url){let im=cache.get(url);if(!im){im=new Image();im.src=url;cache.set(url,im)}return im}
// every strip the scene draws, loaded before the first frame needs it (default sheets now, the worn skin's at scene start)
const USED=['ultimate','heavy','flurry','run','low','win','idle']
const preload=f=>{try{for(const a of USED)image(sheetUrl(f,a))}catch(_){}}
export const preloadDashRush=preload   // dashParrFx calls it once the meter is nearly full (the worn skin's sheets)
if(typeof Image!=='undefined'){preload(null);image('./assets/dash_parr/portrait.png')}
const sheetUrl=(f,action)=>f?._recolorTag?`./assets/dash_parr/skins/${f._recolorTag}/${action}.png`:`./assets/dash_parr/${action}.png`
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
const ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u)}
const hash=(a,b=0)=>((Math.imul((a|0)*374761393+(b|0)*668265263,1274126177)>>>0)%10007)/10007
let scr=null,tintScr=null
function canvasOf(o,w,h){if(!o){const cv=document.createElement('canvas');o={cv,g:cv.getContext('2d')}}if(o.cv.width!==w||o.cv.height!==h){o.cv.width=w;o.cv.height=h}return o}

// one frame of a Dash strip, feet/body origin at (x, footY); optional tint (afterimages)
function blit(c,f,action,i,x,footY,dir,alpha=1,tint=null,scale=S){
 const A=DASH_PARR_ANIM[action];if(!A)return
 const im=image(sheetUrl(f,action));if(!im.complete||!im.naturalWidth)return
 const k=((i%A.frames)+A.frames)%A.frames,fw=A.frameWidth,fh=A.frameHeight
 let src=im,sx=k*fw
 if(tint){tintScr=canvasOf(tintScr,fw,fh);const g=tintScr.g;g.globalCompositeOperation='source-over';g.globalAlpha=1;g.clearRect(0,0,fw,fh)
  g.drawImage(im,sx,0,fw,fh,0,0,fw,fh);g.globalCompositeOperation='source-atop';g.globalAlpha=0.75;g.fillStyle=tint;g.fillRect(0,0,fw,fh);src=tintScr.cv;sx=0}
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha*=alpha;c.translate(x,footY);if(dir<0)c.scale(-1,1)
 c.drawImage(src,sx,0,fw,fh,-A.originX*scale,-A.originY*scale,fw*scale,fh*scale);c.restore()
}
function star(c,x,y,r,rot,col,n=8){c.beginPath();for(let i=0;i<n*2;i++){const a=rot+i*Math.PI/n,rr=i%2?r*0.32:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fillStyle=col;c.fill()}
function glowLine(c,x1,y1,x2,y2,col,w,a=1){
 c.save();c.globalCompositeOperation='lighter';c.lineCap='round'
 c.globalAlpha=a*0.3;c.strokeStyle=col;c.lineWidth=w*2.8;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()
 c.globalAlpha=a*0.85;c.lineWidth=w;c.stroke()
 c.globalAlpha=a;c.strokeStyle='#ffffff';c.lineWidth=Math.max(1,w*0.35);c.stroke();c.restore()
}

// render-only smoothing of the push-in (module memory, never GAME_STATE)
const view={z:1,fx:0,fy:0,last:-1}

function draw(ctx,canvas){
 const c=rushScene()
 if(!c){view.last=-1;return false}
 if(!XF)return true
 if(view.last<0)preload(c.caster)
 const f=c.caster,t=c.target,W=canvas.width,H=canvas.height,u=H/720
 const k=c.f,real=c.real,stopU=c.stopMax>0?c.stop/c.stopMax:0,stopping=c.stop>0
 const toS=(x,y)=>({x:XF.a*x+XF.c*y+XF.e,y:XF.b*x+XF.d*y+XF.f})
 const p=dashRushPose(k),tc={x:t.x+(t.w||48)/2,y:t.y+(t.h||94)/2}
 const inImpact=k>=R.impact,impactAge=inImpact?real-c.impactAt:-1
 // ── 1. push-in target (zoom about a screen point) ──
 let Z=1,F=toS(tc.x,tc.y)
 if(k<R.hitAt[0]){Z=1+0.55*ease(k/22);F=toS(p.x,p.feet-50)}
 else if(k<R.runup){Z=1.6+(stopping?0.16*stopU:0);F=toS(tc.x,tc.y-10)}
 else if(k<R.run){Z=k<R.runup+8?1.3:1.7;F=toS(p.x+c.runDir*40,p.feet-50)}
 else if(k<R.impact){Z=1.2+0.3*ease((k-R.leap)/(R.impact-R.leap));const ip=dashRushPose(R.impact);F=toS(ip.x,ip.feet-50)}
 else if(k<R.impact+R.blast){Z=1.35+(stopping?0.4*stopU:0);F=toS(tc.x,tc.y)}
 else{Z=1+0.3*(1-ease((k-R.impact-R.blast)/18));F=toS(tc.x,tc.y)}
 if(view.last<0||real-view.last>2){view.z=Z;view.fx=F.x;view.fy=F.y}
 const punch=stopping&&c.stop===c.stopMax-1
 const zr=punch?1:0.3,fr=k>=R.run&&k<R.impact?0.5:0.22
 view.z+=(Z-view.z)*zr;view.fx+=(F.x-view.fx)*fr;view.fy+=(F.y-view.fy)*fr;view.last=real
 const z=view.z,fx=clamp(view.fx,W*0.2,W*0.8),fy=clamp(view.fy,H*0.25,H*0.75)
 const whip=!!p.zip&&k<R.run
 if(z>1.001||whip){
  scr=canvasOf(scr,W,H);scr.g.globalCompositeOperation='copy';scr.g.globalAlpha=1;scr.g.drawImage(canvas,0,0)
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.imageSmoothingEnabled=false
  const dx=fx*(1-z),dy=fy*(1-z)
  ctx.drawImage(scr.cv,0,0,W,H,dx,dy,W*z,H*z)
  if(whip){const sdir=(p.zip.x1>=p.zip.x0?-1:1)*W*0.012   // whip-pan smear
   for(let i=1;i<=3;i++){ctx.globalAlpha=0.22;ctx.drawImage(scr.cv,0,0,W,H,dx+sdir*i*2.2,dy,W*z,H*z)}ctx.globalAlpha=1}
 }
 // ── 2. the frozen world ──
 const desat=k<R.impact?clamp(k/10,0,1):0
 if(desat>0){
  ctx.globalCompositeOperation='saturation';ctx.globalAlpha=desat*0.88;ctx.fillStyle='hsl(0,0%,50%)';ctx.fillRect(0,0,W,H)
  ctx.globalCompositeOperation='multiply';ctx.globalAlpha=desat*0.6;ctx.fillStyle='#8fb0ff';ctx.fillRect(0,0,W,H)
  ctx.globalCompositeOperation='source-over'
  const vg=ctx.createRadialGradient(fx,fy,H*0.25,fx,fy,H*0.95);vg.addColorStop(0,'rgba(5,10,30,0)');vg.addColorStop(1,'rgba(5,10,30,0.65)')
  ctx.globalAlpha=desat;ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1
 }
 // ── 3. Dash, in colour, in world space ──
 ctx.save();ctx.setTransform(z,0,0,z,fx*(1-z),fy*(1-z));ctx.transform(XF.a,XF.b,XF.c,XF.d,XF.e,XF.f)
 drawWorld(ctx,c,f,t,k,real,p,stopping,stopU,impactAge)
 ctx.restore()
 // ── 4. screen FX ──
 drawScreen(ctx,c,W,H,u,k,real,p,stopping,stopU,impactAge,{x:fx,y:fy})
 return true
}

function drawWorld(c,sc,f,t,k,real,p,stopping,stopU,impactAge){
 const P=sc.plan,tf=sc.tFloor+(t.h||94),tcx=t.x+(t.w||48)/2,tcy=t.y+(t.h||94)/2
 // afterimages of every recent hit, still hanging around the foe (the "everywhere at once" read)
 if(k<R.run)for(let j=0;j<P.length;j++){const h=P[j],age=k-h.at;if(age<4||age>40)continue
  const footY=tf-((t.y+(t.h||94))<tf?(tf-(t.y+(t.h||94))):0)+h.dy
  blit(c,f,h.act,h.act==='flurry'?3:1,sc.tx+h.dx,footY,-h.side,0.55*(1-age/40),j%2?'#7fe0ff':'#ffe066')}
 // zip streak between positions: a glowing line + three tinted ghosts along it
 if(p.zip){const z=p.zip,u=p.zip.u,x0=z.x0,y0=z.y0-46,x1=z.x0+(z.x1-z.x0)*Math.min(1,u+0.35),y1=z.y0+(z.y1-z.y0)*Math.min(1,u+0.35)-46
  glowLine(c,x0,y0,x1,y1,'#ffd21f',10,0.85);glowLine(c,x0,y0+14,x1,y1+14,'#ff4a3a',5,0.6)
  for(let g=1;g<=3;g++){const v=Math.min(1,u+0.35)*g/3;blit(c,f,'run',real+g,z.x0+(z.x1-z.x0)*v,z.y0+(z.y1-z.y0)*v,z.x1>=z.x0?1:-1,0.25+0.12*g,'#ffffff')}}
 // the sprint: a long ghost trail + ground sparks + streaks behind him
 if(p.run){const d=sc.runDir,sp=Math.abs(p.speed||40)
  for(let g=8;g>=1;g--)blit(c,f,'run',real-g,p.x-d*g*sp*0.55,p.feet,d,0.42*(1-g/9),g%2?'#ffd21f':'#ff5a3a')
  c.save();c.globalCompositeOperation='lighter';c.lineCap='round'
  for(let i=0;i<14;i++){const y=p.feet-8-hash(real,i)*90,len=120+hash(real,i+40)*260,x=p.x-d*(30+hash(real,i+80)*60)
   c.globalAlpha=0.35+0.4*hash(real,i+9);c.strokeStyle=i%3?'#ffffff':'#ffd21f';c.lineWidth=1.5+hash(real,i+3)*3;c.beginPath();c.moveTo(x,y);c.lineTo(x-d*len,y);c.stroke()}
  for(let i=0;i<10;i++){const a=hash(real,i+200),x=p.x-d*(10+a*120),y=sc.floor-2-hash(real,i+300)*18*(1-a)
   c.globalAlpha=0.8*(1-a);c.fillStyle=i%2?'#ffe9a0':'#ff9a3a';c.fillRect(x,y,4,3)}
  c.restore()}
 // the starting stance: crackling yellow energy + kicked-up dust
 if(p.stance){c.save();c.globalCompositeOperation='lighter';c.strokeStyle='#ffe066';c.lineWidth=2
  for(let i=0;i<6;i++){const a=hash(real>>1,i)*Math.PI*2,r=40+hash(real>>1,i+20)*30,cx=p.x,cy=p.feet-44
   c.globalAlpha=0.7;c.beginPath();c.moveTo(cx+Math.cos(a)*r*0.4,cy+Math.sin(a)*r*0.5);c.lineTo(cx+Math.cos(a+0.3)*r*0.75,cy+Math.sin(a-0.2)*r*0.8);c.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);c.stroke()}
  c.globalAlpha=0.5;c.fillStyle='#d8c8a0';for(let i=0;i<8;i++){const a=hash(real,i+50);c.beginPath();c.arc(p.x-sc.runDir*(20+a*50),p.feet-4-a*10,3+a*6,0,Math.PI*2);c.fill()}
  c.restore()}
 // Dash himself
 if(p.vis){
  if(stopping&&k<R.impact){c.save();c.globalCompositeOperation='lighter';c.globalAlpha=0.5*stopU;c.fillStyle='#ffe066';c.beginPath();c.ellipse(p.x,p.feet-44,46,56,0,0,Math.PI*2);c.fill();c.restore()}
  blit(c,f,p.act,p.fr,p.x,p.feet,p.dir,1)
 }
 // the glint before he vanishes
 if(k>=12&&k<R.vanish+4){const a=1-Math.abs(k-R.vanish)/8;c.save();c.globalCompositeOperation='lighter';c.globalAlpha=clamp(a,0,1)
  star(c,p.x+p.dir*10,p.feet-78,26+10*a,k*0.2,'#ffffff',4);c.restore()}
 // impact star on every flurry contact (scaled by the hit's power)
 if(stopping&&k<R.runup){let i=-1;for(let j=0;j<P.length;j++)if(P[j].at===k)i=j
  if(i>=0){const h=P[i],ix=sc.tx+h.dx*0.45,iy=tf-(tf-(t.y+(t.h||94)))+h.dy-50,big=i===P.length-1,r=(big?70:34+i*2.6)*(0.7+0.5*stopU)
   c.save();c.globalCompositeOperation='lighter';c.globalAlpha=0.9;star(c,ix,iy,r,i*0.7,'#fff6c0',big?12:8);c.globalAlpha=0.7;star(c,ix,iy,r*0.55,i*0.7+0.3,'#ffb020',8)
   c.strokeStyle='#ffffff';c.lineWidth=3;c.globalAlpha=stopU;c.beginPath();c.arc(ix,iy,r*(1.6-stopU*0.6),0,Math.PI*2);c.stroke();c.restore()}}
 // SONIC BOOM: the impact point + Mach rings racing out along the run, a cone of shock lines, the foe's blast streak
 if(impactAge>=0){const d=sc.runDir,ix=tcx-d*10,iy=tcy
  const ip=dashRushPose(R.impact),hp={x:ip.x+d*34,y:ip.feet-52}
  c.save();c.globalCompositeOperation='lighter'
  if(impactAge<10){const a=1-impactAge/10;c.globalAlpha=a*0.75;c.fillStyle='#ffffff';c.beginPath();c.arc(hp.x,hp.y,34+impactAge*7,0,Math.PI*2);c.fill()
   c.globalAlpha=a*0.55;star(c,hp.x,hp.y,110+impactAge*16,0.3,'#fff3b0',14)}
  for(let i=0;i<4;i++){const age=impactAge-i*4;if(age<0||age>44)continue;const v=age/44
   c.globalAlpha=(1-v)*0.9;c.strokeStyle=i%2?'#bfe8ff':'#ffffff';c.lineWidth=(10-i*1.5)*(1-v)+2
   c.beginPath();c.ellipse(hp.x+d*(age*9+i*16),hp.y,26+age*3.2,70+age*7,0,0,Math.PI*2);c.stroke()}
  for(let i=0;i<16;i++){const a=(i/16-0.5)*1.3,L=(220+hash(i,7)*260)*clamp(impactAge/10,0,1),fade=clamp(1-(impactAge-8)/30,0,1)
   c.globalAlpha=fade*0.8;c.strokeStyle='#ffffff';c.lineWidth=2+hash(i,3)*3;c.beginPath();c.moveTo(hp.x+d*Math.cos(a)*40,hp.y+Math.sin(a)*40);c.lineTo(hp.x+d*Math.cos(a)*L,hp.y+Math.sin(a)*L);c.stroke()}
  if(k<R.impact+R.blast+6){const fade=clamp(1-(k-R.impact-R.blast)/6,0,1);glowLine(c,hp.x,hp.y,ix,iy,'#9fdcff',26,0.6*fade);glowLine(c,hp.x,hp.y-20,ix,iy-20,'#ffffff',8,0.7*fade)}
  // ground crack + dust where the foe lands
  if(k>=R.impact+R.blast-2){const v=clamp((k-R.impact-R.blast+2)/20,0,1);c.globalCompositeOperation='source-over';c.globalAlpha=0.6*(1-v);c.fillStyle='#e8dcc0'
   for(let i=0;i<10;i++){const a=hash(i,91);c.beginPath();c.arc(tcx+(a-0.5)*140*(0.5+v),sc.floor-8-hash(i,17)*40*v,8+a*16*(0.5+v),0,Math.PI*2);c.fill()}}
  c.restore()}
}

function caption(ctx,txt,x,y,size,fill,stroke,skew=-0.18,align='center',alpha=1){
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.transform(1,0,skew,1,0,0)
 ctx.font=`italic 900 ${Math.round(size)}px "Arial Black", Impact, Arial, sans-serif`;ctx.textAlign=align;ctx.textBaseline='middle'
 ctx.lineJoin='round';ctx.lineWidth=Math.max(3,size*0.16);ctx.strokeStyle=stroke;ctx.strokeText(txt,0,0);ctx.fillStyle=fill;ctx.fillText(txt,0,0);ctx.restore()
}
function emblem(ctx,x,y,r){   // the Incredibles "i" roundel (code-drawn)
 ctx.save();ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(x,y,r*1.15,r,0,0,Math.PI*2);ctx.fill()
 ctx.fillStyle='#ff8a00';ctx.beginPath();ctx.ellipse(x,y,r*0.98,r*0.84,0,0,Math.PI*2);ctx.fill()
 ctx.fillStyle='#111';ctx.fillRect(x-r*0.14,y-r*0.28,r*0.28,r*0.8);ctx.beginPath();ctx.arc(x,y-r*0.52,r*0.16,0,Math.PI*2);ctx.fill();ctx.restore()
}
function drawScreen(ctx,c,W,H,u,k,real,p,stopping,stopU,impactAge,F){
 // focus lines (anime speed lines toward the subject) on hits / the impact; horizontal streaks on the sprint
 const focusA=k>=R.hitAt[0]&&k<R.runup?(stopping?0.75:0.3):impactAge>=0&&impactAge<34?1-impactAge/34:k>=R.runup&&k<R.run&&p.stance?0.35:0
 if(focusA>0){ctx.save();ctx.fillStyle='#ffffff';const n=56,R0=Math.hypot(W,H)*0.62
  for(let i=0;i<n;i++){const a=(i/n)*Math.PI*2+hash(real>>1,i)*0.1,w=0.004+hash(real>>1,i+99)*0.012,r1=Math.min(W,H)*(0.24+hash(real>>1,i+7)*0.18)
   ctx.globalAlpha=focusA*(0.35+0.5*hash(real>>1,i+3));ctx.beginPath();ctx.moveTo(F.x+Math.cos(a-w)*R0,F.y+Math.sin(a-w)*R0);ctx.lineTo(F.x+Math.cos(a)*r1,F.y+Math.sin(a)*r1);ctx.lineTo(F.x+Math.cos(a+w)*R0,F.y+Math.sin(a+w)*R0);ctx.fill()}
  ctx.restore()}
 if(p.run){ctx.save();const d=c.runDir;ctx.globalCompositeOperation='lighter'
  for(let i=0;i<26;i++){const y=H*(0.14+hash(real,i)*0.72),len=W*(0.15+hash(real,i+30)*0.35),x=((hash(i,5)*W*2-real*W*0.09*d)%(W*1.6)+W*1.6)%(W*1.6)-W*0.3
   ctx.globalAlpha=0.18+0.3*hash(real,i+60);ctx.fillStyle=i%4?'#ffffff':'#ffd21f';ctx.fillRect(x,y,len,(1+hash(i,8)*2.5)*u)}
  ctx.restore()}
 // hit flashes + the IMPACT FRAME (2 inverted frames, then a white flash, then colour floods back)
 if(stopping&&k<R.runup&&c.stop===c.stopMax-1){ctx.save();ctx.globalAlpha=0.35;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);ctx.restore()}
 if(impactAge>=0&&impactAge<3){ctx.save();ctx.globalCompositeOperation='difference';ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H)
  ctx.globalCompositeOperation='saturation';ctx.fillStyle='hsl(0,0%,50%)';ctx.fillRect(0,0,W,H);ctx.restore()}
 else if(impactAge>=3&&impactAge<8){ctx.save();ctx.globalAlpha=0.6*(1-(impactAge-3)/5);ctx.fillStyle='#ffffff';ctx.fillRect(0,0,W,H);ctx.restore()}
 // letterbox
 const lb=k<R.end-12?ease(k/8):1-ease((k-(R.end-12))/12),bh=H*0.115*lb
 if(bh>0.5){ctx.fillStyle='#000';ctx.fillRect(0,0,W,bh);ctx.fillRect(0,H-bh,W,bh)}
 // title cut-in: a slanted red band slams in from the right, holds, and is torn away to the left
 if(k>=1&&k<34){const inU=ease((k-1)/7),outU=ease((k-25)/8),off=(1-inU)*W*1.1-outU*W*1.2,cy=H*0.7,bhh=H*0.14
  ctx.save();ctx.translate(off,0)
  ctx.fillStyle='#000';ctx.beginPath();ctx.moveTo(-20,cy-bhh*0.62);ctx.lineTo(W+20,cy-bhh*0.85);ctx.lineTo(W+20,cy+bhh*0.62);ctx.lineTo(-20,cy+bhh*0.85);ctx.fill()
  ctx.fillStyle='#c8102e';ctx.beginPath();ctx.moveTo(-20,cy-bhh*0.5);ctx.lineTo(W+20,cy-bhh*0.72);ctx.lineTo(W+20,cy+bhh*0.5);ctx.lineTo(-20,cy+bhh*0.72);ctx.fill()
  ctx.fillStyle='#ffb000';ctx.fillRect(-20,cy+bhh*0.5,W+40,3*u)
  ctx.globalAlpha=0.25;ctx.fillStyle='#ffffff';for(let i=0;i<10;i++)ctx.fillRect(((i*173+real*38)%(W+200))-100,cy-bhh*0.4+i*bhh*0.08,W*0.12,2*u);ctx.globalAlpha=1
  const px=W*0.17,pr=bhh*0.62,pim=image('./assets/dash_parr/portrait.png')
  ctx.save();ctx.beginPath();ctx.arc(px,cy,pr,0,Math.PI*2);ctx.fillStyle='#ffb000';ctx.fill();ctx.lineWidth=5*u;ctx.strokeStyle='#111';ctx.stroke();ctx.clip()
  if(pim.complete&&pim.naturalWidth){ctx.imageSmoothingEnabled=false;ctx.drawImage(pim,px-pr*1.05,cy-pr*0.95,pr*2.1,pr*2.1*pim.naturalHeight/pim.naturalWidth)}ctx.restore()
  emblem(ctx,px+pr*0.85,cy+pr*0.7,pr*0.32)
  caption(ctx,'INCREDI-RUSH',W*0.56,cy-bhh*0.06,bhh*0.62,'#ffffff','#111')
  caption(ctx,'DASH  ·  ALL-OUT SUPER SPEED',W*0.56,cy+bhh*0.4,bhh*0.16,'#ffd21f','#111',-0.18)
  ctx.restore()}
 // hit counter (pops on every contact)
 if(c.hits>0&&k<R.end-8){const pop=stopping&&k<R.run?1+0.35*stopU:1,big=k>=R.impact
  const x=W*0.05,y=H*0.24,sz=H*(big?0.1:0.075)*pop
  caption(ctx,String(c.hits),x,y,sz,big?'#ff3a2a':'#ffd21f','#111',-0.2,'left')
  caption(ctx,'HITS',x+sz*0.08,y+sz*0.62,H*0.03,'#ffffff','#111',-0.2,'left')}
 // the run-up: ON YOUR MARK… GET SET… GO!
 if(k>=R.runup+9&&k<R.run+10){const txt=k<R.runup+19?'ON YOUR MARK…':k<R.run?'GET SET…':'GO!',age=k<R.runup+19?k-R.runup-9:k<R.run?k-R.runup-19:k-R.run
  const sz=H*(txt==='GO!'?0.13:0.07)*(1+0.25*Math.max(0,1-age/5))
  caption(ctx,txt,W*0.5,H*0.24,sz,txt==='GO!'?'#ff3a2a':'#ffffff','#111',-0.2,'center',k>=R.run+6?1-(k-R.run-6)/4:1)}
 // SONIC BOOM!
 if(impactAge>=3&&k<R.impact+R.blast+8){const a=k<R.impact+R.blast?1:1-(k-R.impact-R.blast)/8,j=impactAge<16?(hash(real,1)-0.5)*14*u:0
  caption(ctx,'SONIC BOOM!',W*0.56+j,H*0.22+j,H*0.1*(1+0.4*Math.max(0,1-(impactAge-3)/6)),'#ffd21f','#111',-0.22,'center',a)}
}

registerCineScreen('dash_parr',draw)
