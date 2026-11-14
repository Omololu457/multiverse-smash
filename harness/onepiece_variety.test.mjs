// harness/onepiece_variety.test.mjs — ONE PIECE VARIETY PASS (Luffy / Zoro / Sanji / Buggy / Arlong), S.P.D. Red's layer
// template. Real keyboard input through each fighter's own command parser:
//   Luffy: Forward+Light Kane · Down+Heavy Muchi (low knockdown) · Back+Heavy Rubber Hop (evade) · air Heavy Stamp ·
//          ↓↘→+Special Gatling (multi-hit) · ↓↙←+Special Bazooka · old Special directions unchanged
//   Zoro:  Back+Heavy Iai Backstep (evade) · air Heavy Air Cross · Up+Special Nigiri (anti-air launcher, invulnerable)
//   Sanji / Buggy / Arlong: air Heavy split (air Light keeps the quick aerial)
// Writes docs/rangers/onepiece_variety_results.json.     node harness/onepiece_variety.test.mjs
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),errors=[],out={};let pass=0,fail=0
const ck=(n,ok,d='')=>{ok?pass++:fail++;console.log(ok?'PASS':'FAIL',n,d)}
const API={luffy:'zoroTest',zoro:'zoroTest',sanji:'sanjiTest',buggy:'buggyTest',arlong:'arlongTest'}
async function session(key,body,p2=key){
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(key+': '+e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
 await page.goto(`${server.base}/index.html?harness=1&p1=${key}&p2=${p2}&seed=7311`);await page.waitForFunction(api=>window.__harness?.[api],API[key])
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(4)});await page.evaluate(()=>__harness.preloadDone?.());
 const api=API[key],step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n)
 const st=()=>page.evaluate(api=>{const H=__harness[api],a=H.raw(),b=H.raw('p2'),at=a.currentAttack;return{name:at?.name||null,dmg:at?.damage,lvl:at?.hitLevel||null,x:a.x,y:a.y,vy:a.vy,g:!!(a.onGround||a.grounded),inv:a.invulnTimer||0,e:a.energy,hpB:b.health,maxB:b.maxHealth,bx:b.x,by:b.y,bg:!!(b.onGround||b.grounded),kd:!!b.knockdownState}},api)
 const tap=async(ks,n=1)=>{for(const k of ks)await page.keyboard.down(k);await step(n);for(const k of ks)await page.keyboard.up(k)}
 const reset=async(gap=72)=>{await page.evaluate(([api,gap])=>{const H=__harness[api];H.reset();__harness.setDummyBehavior('stand');const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1300+gap;a.facing=1;b.facing=-1
  for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.vx=f.vy=0;f.hitstun=0;f.hitstop=0;f.invulnTimer=0;f.attacking=false;f.currentAttack=null;f.attackCooldown=0;f.knockdownState=false;f.comboCounter=0}},[api,gap]);await step(2)}
 const watch=async(n,fn)=>{for(let i=0;i<n;i++){await step(1);fn(await st())}}
 const qcf=async(btn='l')=>{await page.keyboard.down('s');await step(2);await page.keyboard.down('d');await step(1);await page.keyboard.up('s');await step(1);await tap([btn]);await page.keyboard.up('d')}
 const qcb=async(btn='l')=>{await page.keyboard.down('s');await step(2);await page.keyboard.down('a');await step(1);await page.keyboard.up('s');await step(1);await tap([btn]);await page.keyboard.up('a')}
 const jumpIn=async(btn)=>{await reset(60);const gy=(await st()).y;await tap(['w']);for(let i=0;i<120;i++){const z=await st();if(z.vy>0&&z.y>=gy-230)break;await step(1)}await tap([btn])}   // press on the way down, 230px above the ground
 const airPair=async(heavyKey)=>{await reset(700);await tap(['w']);await step(6);await tap(['k']);const h=(await st()).name;await reset(700);await tap(['w']);await step(6);await tap(['j']);const l=(await st()).name
  ck(`${key}: air Heavy = ${heavyKey}; air Light stays 'air'`,h===heavyKey&&l==='air',JSON.stringify({h,l}))
  await jumpIn('k');const hp=(await st()).hpB;let s;for(let i=0;i<40;i++){await step(1);s=await st();if(s.hpB<hp)break}
  ck(`${key}: air Heavy connects on a jump-in`,s.hpB<s.maxB,JSON.stringify({applied:s.maxB-s.hpB}));return s.maxB-s.hpB}
 try{await body({page,step,st,tap,reset,watch,qcf,qcb,airPair})}finally{await page.close()}
}
const res={}
try{
 // ─────────────── LUFFY ───────────────
 await session('luffy',async({step,st,tap,reset,watch,qcf,qcb,airPair,page})=>{const r=res.luffy={};let s
  await reset(72);await page.keyboard.down('d');await step(1);await tap(['j']);await page.keyboard.up('d');s=await st();const kane=s.name;await watch(40,()=>{});s=await st()
  ck('luffy: Forward+Light = lfKane (Gomu Gomu no Kane) and it connects',kane==='lfKane'&&s.hpB<s.maxB,JSON.stringify({kane,applied:s.maxB-s.hpB}));r.kane=s.maxB-s.hpB
  await reset(72);await tap(['j']);s=await st();ck('luffy: plain Light is still the jab',s.name==='light',String(s.name))
  await reset(140);await page.keyboard.down('s');await step(1);await tap(['k']);await page.keyboard.up('s');s=await st();const mu={name:s.name,lvl:s.lvl};let kd=false;await watch(45,z=>{kd=kd||z.kd});s=await st()
  ck('luffy: Down+Heavy = lfMuchi (Whip): low, long range (140px gap), knocks down',mu.name==='lfMuchi'&&mu.lvl==='low'&&kd&&s.hpB<s.maxB,JSON.stringify({...mu,kd,applied:s.maxB-s.hpB}));r.muchi=s.maxB-s.hpB
  await reset(72);await page.keyboard.down('s');await step(1);await tap(['j']);await page.keyboard.up('s');s=await st();ck('luffy: Down+Light keeps the quick Rubber Sweep (lfLow)',s.name==='lfLow',String(s.name))
  await reset(300);await page.keyboard.down('a');await step(1);await tap(['k']);await page.keyboard.up('a');s=await st();const x0=s.x;const hop={name:s.name,inv:s.inv};let minX=s.x;await watch(30,z=>{minX=Math.min(minX,z.x)});s=await st()
  ck('luffy: Back+Heavy = lfHop (Rubber Hop): ~90px back, invulnerable 5-6f, no damage',hop.name==='lfHop'&&hop.inv>=5&&x0-minX>=70&&x0-minX<=110&&s.hpB===s.maxB,JSON.stringify({...hop,moved:+(x0-minX).toFixed(1)}));r.hop=+(x0-minX).toFixed(1)
  r.stamp=await airPair('lfStamp')
  await reset(100);const e0=(await st()).e;await qcf();s=await st();const g={name:s.name};let drops=0,last=s.hpB;await watch(170,z=>{if(z.hpB<last){drops++;last=z.hpB}});s=await st()
  ck('luffy: ↓↘→+Special = lfGatling, ≥5 separate hits',g.name==='lfGatling'&&drops>=5,JSON.stringify({...g,hits:drops,applied:s.maxB-s.hpB,spent:+(e0-s.e).toFixed(1)}));r.gatling={hits:drops,applied:s.maxB-s.hpB}
  await reset(120);await qcb();s=await st();const bz={name:s.name,bx0:s.bx};await watch(90,()=>{});s=await st()
  ck('luffy: ↓↙←+Special = lfBazooka, connects and drives the foe away',bz.name==='lfBazooka'&&s.hpB<s.maxB&&s.bx-bz.bx0>20,JSON.stringify({...bz,applied:s.maxB-s.hpB,pushed:+(s.bx-bz.bx0).toFixed(1)}));r.bazooka=s.maxB-s.hpB
  await reset(120);await tap(['l']);s=await st();ck('luffy: neutral Special is still Stretch Piston',s.name==='lfPiston',String(s.name))
  await reset(120);await page.keyboard.down('a');await step(1);await tap(['l']);await page.keyboard.up('a');s=await st();ck('luffy: plain Back+Special is still Balloon Brace',s.name==='lfBrace',String(s.name))
  await reset(120);await page.keyboard.down('d');await step(3);await tap(['l']);await page.keyboard.up('d');s=await st();ck('luffy: plain Forward+Special is still Reel-In (never a ↓↘→ read)',s.name==='lfReel',String(s.name))
 })
 // ─────────────── ZORO ───────────────
 await session('zoro',async({step,st,tap,reset,watch,airPair,page})=>{const r=res.zoro={};let s
  await reset(300);await page.keyboard.down('a');await step(1);await tap(['k']);await page.keyboard.up('a');s=await st();const x0=s.x;const bs={name:s.name,inv:s.inv};let minX=s.x;await watch(30,z=>{minX=Math.min(minX,z.x)});s=await st()
  ck('zoro: Back+Heavy = zStep (Iai Backstep): ~90px back, invulnerable 5-6f, no damage',bs.name==='zStep'&&bs.inv>=5&&x0-minX>=70&&x0-minX<=110&&s.hpB===s.maxB,JSON.stringify({...bs,moved:+(x0-minX).toFixed(1)}));r.step=+(x0-minX).toFixed(1)
  await reset(72);await tap(['k']);s=await st();ck('zoro: neutral Heavy unchanged',s.name==='heavy',String(s.name))
  await reset(72);await page.keyboard.down('d');await step(1);await tap(['k']);await page.keyboard.up('d');s=await st();ck('zoro: Forward+Heavy still the wake-up reversal',s.name==='zWake',String(s.name))
  r.airCross=await airPair('zAirH')
  await reset(72);await page.keyboard.down('w');await tap(['l']);await page.keyboard.up('w');s=await st();const ni={name:s.name,inv:s.inv};let air=false;await watch(40,z=>{air=air||!z.bg});s=await st()
  ck('zoro: Up+Special = zNigiri: anti-air launcher (foe airborne), invulnerable 3-4f',ni.name==='zNigiri'&&ni.inv>=3&&air&&s.hpB<s.maxB,JSON.stringify({...ni,launched:air,applied:s.maxB-s.hpB}));r.nigiri=s.maxB-s.hpB
  await reset(300);await tap(['l']);s=await st();ck('zoro: neutral Special is still Taka Nami',s.name==='zTaka',String(s.name))
 })
 // ─────────────── SANJI / BUGGY / ARLONG: air Heavy split ───────────────
 // Buggy vs Buggy can't test a knife aerial: Bara Bara makes Buggy immune to SLASH damage (both his aerials are slashes),
 // so Buggy's aerials are measured against Zoro.
 for(const [key,h,p2] of [['sanji','sAirH'],['buggy','bAirH','zoro'],['arlong','aAirH']])await session(key,async({airPair})=>{res[key]={airHeavy:await airPair(h)}},p2||key)
 // ─────────────── LAYER 5: Buggy Back+Heavy Split Cut · Arlong Back+Light Shark Tail Sweep ───────────────
 await session('buggy',async({step,st,tap,reset,watch,page})=>{let s
  await reset(120);await page.keyboard.down('a');await step(1);await tap(['k']);await page.keyboard.up('a');s=await st();const og=()=>page.evaluate(()=>__harness.buggyTest.raw().currentAttack?.bg?.origin);const sp={name:s.name,x0:await og()};let minX=s.x,hitX=null;const hp0=s.hpB
  for(let i=0;i<40;i++){await step(1);const z=await st();if(sp.x0==null)sp.x0=await og();minX=Math.min(minX,z.x);if(hitX==null&&z.hpB<hp0)hitX=z.x}s=await st()
  ck('buggy: Back+Heavy = bSplit (Split Cut): body retreats 60px (±1) and the hand still connects from a 120px gap',sp.name==='bSplit'&&sp.x0!=null&&Math.abs((sp.x0-minX)-60)<=1.01&&hitX!=null&&s.hpB<s.maxB,JSON.stringify({...sp,moved:+(sp.x0-minX).toFixed(1),applied:s.maxB-s.hpB}))
  res.buggy.splitCut={applied:s.maxB-s.hpB,moved:+(sp.x0-minX).toFixed(1)}
  await reset(72);await tap(['k']);s=await st();ck('buggy: neutral Heavy unchanged',s.name==='heavy',String(s.name))
  await reset(72);await page.keyboard.down('d');await step(1);await tap(['k']);await page.keyboard.up('d');s=await st();ck('buggy: Forward+Heavy still the wake-up reversal',s.name==='bWake',String(s.name))
 },'zoro')
 await session('arlong',async({step,st,tap,reset,watch,page})=>{let s
  await reset(120);await page.keyboard.down('a');await step(1);await tap(['j']);await page.keyboard.up('a');s=await st();const tl={name:s.name,lvl:s.lvl};let kd=false;await watch(50,z=>{kd=kd||z.kd});s=await st()
  ck('arlong: Back+Light = aTail (Shark Tail Sweep): LOW, 120px gap, knocks down',tl.name==='aTail'&&tl.lvl==='low'&&kd&&s.hpB<s.maxB,JSON.stringify({...tl,kd,applied:s.maxB-s.hpB}))
  res.arlong.tailSweep=s.maxB-s.hpB
  await reset(72);await tap(['j']);s=await st();ck('arlong: plain Light is still the jab',s.name==='light',String(s.name))
  await reset(72);await page.keyboard.down('s');await step(1);await tap(['k']);await page.keyboard.up('s');s=await st();ck('arlong: Down+Heavy is still the saw launcher',s.name==='heavy',String(s.name))
 })
 // ─────────────── LAYER 6: Luffy Back+Light Ono (armored) · Zoro Back+Light Yakkodori · Sanji Back+Light Flanchet ───────────────
 const armorJab=(page,api)=>page.evaluate(async api=>{const {startMove}=await import('./combat.js');const b=__harness[api].raw('p2');b.hitstun=0;b.hitstop=0;b.attackCooldown=0;b.attacking=false;b.currentAttack=null;b.facing=-1;startMove(b,'light',{damage:16,startup:0,active:3,recovery:10,frameExact:true,rangeX:140,rangeY:80})},api)
 await session('luffy',async({step,st,tap,reset,page})=>{let s
  await reset(80);await page.keyboard.down('a');await step(1);await tap(['j']);await page.keyboard.up('a');s=await st();const on={name:s.name};await step(3);const hp0=(await page.evaluate(()=>__harness.zoroTest.raw().health));await armorJab(page,'zoroTest')
  let took=false,stun=false,kd=false,still=true,hit=false;const hpB0=(await st()).hpB
  for(let i=0;i<45;i++){await step(1);const z=await st();const r=await page.evaluate(()=>{const a=__harness.zoroTest.raw();return{hp:a.health,stun:a.hitstun||0}});if(r.hp<hp0)took=true;if(r.stun>0)stun=true;if(!hit&&z.name!=='lfOno')still=false;if(z.hpB<hpB0)hit=true;kd=kd||z.kd}
  s=await st();ck('luffy: Back+Light = lfOno (Gomu Gomu no Ono): rubber armor absorbs a jab, axe kick still lands and knocks down',on.name==='lfOno'&&took&&!stun&&still&&hit&&kd,JSON.stringify({...on,took,stun,uninterrupted:still,hit,kd,applied:s.maxB-s.hpB}))
  res.luffy.ono=s.maxB-s.hpB
 })
 for(const [key,mv,gap,label] of [['zoro','zYakko',150,'Yakkodori: long range (150px gap), shoves the foe away'],['sanji','sFlanchet',90,'Flanchet Shot: blasts the foe away']])
  await session(key,async({step,st,tap,reset,page})=>{let s
   await reset(gap);await page.keyboard.down('a');await step(1);await tap(['j']);await page.keyboard.up('a');s=await st();const m={name:s.name,bx0:s.bx};for(let i=0;i<75;i++)await step(1);s=await st()
   ck(`${key}: Back+Light = ${mv} (${label})`,m.name===mv&&s.hpB<s.maxB&&s.bx-m.bx0>40,JSON.stringify({...m,applied:s.maxB-s.hpB,pushed:+(s.bx-m.bx0).toFixed(1)}))
   res[key].backLight={applied:s.maxB-s.hpB,pushed:+(s.bx-m.bx0).toFixed(1)}
   await reset(72);await tap(['j']);s=await st();ck(`${key}: plain Light unchanged`,s.name===(key==='sanji'?'sCollier':'light'),String(s.name))
  })
 // ─────────────── LAYER 7: Arlong Charge+Forward Tough Hide Ram (armored) ───────────────
 await session('arlong',async({step,st,tap,reset,page})=>{let s
  await reset(110);const e0=(await st()).e;await tap(['d','p']);s=await st();const rm={name:s.name,spent:+(e0-s.e).toFixed(1),x0:s.x};await step(4);const hp0=await page.evaluate(()=>__harness.arlongTest.raw().health);await armorJab(page,'arlongTest')
  let took=false,stun=false,still=true,hit=false;const hpB0=(await st()).hpB
  for(let i=0;i<40;i++){await step(1);const z=await st();const r=await page.evaluate(()=>{const a=__harness.arlongTest.raw();return{hp:a.health,stun:a.hitstun||0}});if(r.hp<hp0)took=true;if(r.stun>0)stun=true;if(!hit&&z.name!=='aRam')still=false;if(z.hpB<hpB0)hit=true}
  s=await st();ck('arlong: Charge+Forward = aRam (Tough Hide Ram): costs 25, armor absorbs a jab, ram still lands',rm.name==='aRam'&&Math.abs(rm.spent-25)<0.5&&took&&!stun&&still&&hit,JSON.stringify({...rm,took,stun,uninterrupted:still,hit,applied:s.maxB-s.hpB,advanced:+(s.x-rm.x0).toFixed(1)}))
  res.arlong.ram=s.maxB-s.hpB
  await reset(300);await tap(['p']);s=await st();ck('arlong: neutral Charge is not the ram',s.name!=='aRam',String(s.name))
 })
 // ─────────────── LAYER 8: command throws — Luffy ↓↙←+Heavy Kazaguruma · Arlong Charge+Back Shark Grip ───────────────
 for(const [key,mv,doIt] of [['luffy','lfKaza','qcbH'],['arlong','aGrip','chargeBack']])
  await session(key,async({step,st,tap,reset,qcb,page})=>{let s
   const go=async()=>{if(doIt==='qcbH')await qcb('k');else await tap(['a','p'])}
   await reset(58);await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(8);await go();s=await st();const t={name:s.name};let kd=false;for(let i=0;i<40;i++){await step(1);kd=kd||(await st()).kd}s=await st()
   ck(`${key}: ${mv} command throw grabs a GUARDING foe and knocks down`,t.name===mv&&s.hpB<s.maxB&&kd,JSON.stringify({...t,kd,applied:s.maxB-s.hpB}))
   res[key].commandThrow=s.maxB-s.hpB
   await reset(240);await go();s=await st();const wn=s.name;for(let i=0;i<45;i++)await step(1);s=await st()
   ck(`${key}: whiffed ${mv} (out of reach) deals nothing`,wn===mv&&s.hpB===s.maxB,String(wn))
  })
 ck('no browser runtime errors',errors.length===0,JSON.stringify(errors.slice(0,4)))
}finally{res.passes=pass;res.failures=fail;fs.mkdirSync('docs/rangers',{recursive:true});fs.writeFileSync('docs/rangers/onepiece_variety_results.json',JSON.stringify(res,null,2)+'\n');console.log(pass,'passed /',fail,'failed');if(fail)process.exitCode=1;await browser.close();server.close()}
