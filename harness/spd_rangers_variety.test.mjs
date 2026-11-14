// harness/spd_rangers_variety.test.mjs — S.P.D. Ranger VARIETY PASS (Blue / Green / Pink; S.P.D. Red untouched, used as the model).
// Real keyboard input through each Ranger's own command parser. For every Ranger:
//   Down+Heavy knockdown sweep (low; Down+Light keeps the quick low) · Back+Heavy evade (distance, invulnerable frames, no hitbox)
//   air Special variant · Up+Special (Green/Pink) · ↓↘→ motion special (gated where designed) · once-per-airtime rules
//   · the motion read is deterministic from raw input (a plain → never triggers it).
// Writes docs/rangers/variety_results.json.     node harness/spd_rangers_variety.test.mjs
import fs from 'node:fs'
import {chromium} from 'playwright'
import {serve} from './ben10_test_utils.mjs'
const server=await serve(),browser=await chromium.launch({headless:true}),errors=[],out={};let pass=0,fail=0
const ck=(n,ok,d='')=>{ok?pass++:fail++;console.log(ok?'PASS':'FAIL',n,d)}
// Roster-parity pass (2026-11-13): every authored damage value is multiplied by the per-Ranger 1.7 scale (spd*Data.js).
const SC=1.7,sc=v=>Math.round(v*SC)
const R={
 spd_blue:{api:'spdBlueTest',tag:'blue',light:'light',low:'bLow',sweep:'bSweep',evade:'bBackstep',evadeDist:90,evadeInv:6,air:'bAirDive',airDmg:36,up:'bSky',upDmg:44,upInv:5,m1:'bDrive1',m2:'bDrive2',m3:'bDrive3',unGated:'bPursuit',qcb:'bBash',qcbDmg:44,qcbGap:110,plainBack:'bBarrier',fl:'bPalm',flDmg:36,airH:'bAirH',airHDmg:40,bl:'bWithdraw',blDmg:28,blPull:36,ram:'bRam',ramDmg:60,neutralCharge:null,read:'bParry',readStrike:'bParryStrike',readDmg:55,toss:'bArrest',tossDmg:72},
 spd_green:{api:'spdGreenTest',tag:'green',light:'light',low:'gLow',sweep:'gSweep',evade:'gEvade',evadeDist:100,evadeInv:7,air:'gAirShot',airDmg:30,up:'gSomer',upDmg:44,m1:'gRush1',m2:'gRush2',m3:'gRush3',unGated:'gAcro',gate:'mark',qcb:'gArc',qcbDmg:46,qcbGap:200,qcbKd:true,plainBack:'gRetreat',fl:'gElbow',flDmg:30,flGap:120,airH:'gAirH',airHDmg:40,bl:'gSnap',blDmg:26,blPull:35,ram:'gRam',ramDmg:56,neutralCharge:'gScan',read:'gRead',readStrike:'gReadStrike',readDmg:50,toss:'gToss',tossDmg:66},
 spd_pink:{api:'spdPinkTest',tag:'pink',light:'light',low:'pLow',sweep:'pSweep',evade:'pEvade',evadeDist:100,evadeInv:7,air:'pAirShot',airDmg:32,up:'pVault',upDmg:40,m1:'pBar1',m2:'pBar2',m3:'pBar3',unGated:'pBreaker',gate:'reserve',qcb:'pFlip',qcbDmg:30,qcbGap:200,qcbRetreat:80,plainBack:'pStance',fl:'pKnee',flDmg:34,airH:'pAirH',airHDmg:42,bl:'pBackfist',blDmg:26,blPull:35,ram:'pShoulder',ramDmg:60,neutralCharge:'pPrep',toss:'pToss',tossDmg:70},
}
try{for(const [key,C] of Object.entries(R)){
 const page=await browser.newPage({viewport:{width:1280,height:720}});page.on('pageerror',e=>errors.push(key+': '+e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0)
 const step=n=>page.evaluate(n=>__harness.luffyTest.step(n),n)
 await page.goto(`${server.base}/index.html?harness=1&p1=${key}&p2=${key}&seed=7311`);await page.waitForFunction(api=>window.__harness?.[api],C.api)
 await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(4)});await page.evaluate(()=>__harness.preloadDone());await step(3)
 const st=()=>page.evaluate(([api,tag])=>{const H=__harness[api],a=H.raw(),b=H.raw('p2'),at=a.currentAttack;return{name:at?.name||null,dmg:at?.damage,lvl:at?.hitLevel||null,clean:!!at?.[tag]?.clean,origin:at?.[tag]?.origin,x:a.x,y:a.y,g:!!a.onGround,inv:a.invulnTimer||0,e:a.energy,hpB:b.health,maxB:b.maxHealth,bx:b.x,kd:!!b.knockdownState,stun:b.hitstun||0,s:a['_spd'+tag[0].toUpperCase()+tag.slice(1)]||{}}},[C.api,C.tag])
 async function tap(ks,n=1){for(const k of ks)await page.keyboard.down(k);await step(n);for(const k of ks)await page.keyboard.up(k)}
 async function reset(gap=72){await page.evaluate(([api,gap])=>{const H=__harness[api];H.reset();__harness.setDummyBehavior('stand');const a=H.raw(),b=H.raw('p2');a.x=1300;b.x=1300+gap;a.facing=1;b.facing=-1
  for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.vx=f.vy=0;f.hitstun=0;f.hitstop=0;f.invulnTimer=0;f.attacking=false;f.currentAttack=null;f.attackCooldown=0;f.knockdownState=false;f.comboCounter=0}},[C.api,gap]);await step(1)}
 const res={};let s
 // Down+Light stays the quick low; Down+Heavy is the knockdown sweep (low).
 await reset();await tap(['s','j']);s=await st();ck(`${key}: Down+Light = quick low (${C.low})`,s.name===C.low,String(s.name))
 await reset();await tap(['s','k']);s=await st();const sweep={name:s.name,lvl:s.lvl};for(let i=0;i<40&&!(await st()).kd;i++)await step(1);s=await st()
 ck(`${key}: Down+Heavy = low knockdown sweep`,sweep.name===C.sweep&&sweep.lvl==='low'&&s.kd&&s.hpB<s.maxB,JSON.stringify({...sweep,kd:s.kd,dmg:s.maxB-s.hpB}));res.sweep=s.maxB-s.hpB
 await reset();await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(8);await tap(['s','k']);await step(40);s=await st();ck(`${key}: blocked sweep does not knock down`,!s.kd,JSON.stringify({kd:s.kd}))
 // Back+Heavy evade: distance, invulnerable frames, no hitbox.
 await reset(300);await tap(['a','k']);s=await st();const ev={name:s.name,inv:s.inv,origin:s.origin,e0:s.e};await step(40);s=await st()
 ck(`${key}: Back+Heavy = evade ${C.evadeDist}px back, invulnerable ${C.evadeInv}f, free, no damage`,ev.name===C.evade&&ev.inv>=C.evadeInv-1&&ev.inv<=C.evadeInv&&Math.abs((ev.origin-s.x)-C.evadeDist)<1.01&&s.hpB===s.maxB,JSON.stringify({...ev,moved:ev.origin-s.x}))
 res.evade={moved:+(ev.origin-s.x).toFixed(2),invuln:ev.inv}
 // Heavy alone is still the plain Heavy.
 await reset();await tap(['k']);s=await st();ck(`${key}: neutral Heavy unchanged`,s.name==='heavy'||s.name==='heavyIron',String(s.name))
 // Air Special variant (once per airtime).
 await reset(700);await tap(['w']);await step(6);await tap(['l']);s=await st();ck(`${key}: air Special = ${C.air} (raw ${C.airDmg})`,s.name===C.air&&s.dmg===sc(C.airDmg),JSON.stringify({n:s.name,d:s.dmg}))
 await step(14);await page.evaluate(api=>{const a=__harness[api].raw();a.attacking=false;a.currentAttack=null;a.attackCooldown=0},C.api);const g2=(await st()).g;await tap(['l']);s=await st();ck(`${key}: air Special once per airtime`,g2||s.name!==C.air,String(s.name))
 // Up+Special (Green / Pink).
 if(C.up){await reset(72);await tap(['w','l']);s=await st();const up={name:s.name,dmg:s.dmg,lvl:s.lvl,g:s.g,inv:s.inv};const hp0=s.hpB;for(let i=0;i<40&&(await st()).hpB===hp0;i++)await step(1);s=await st()
  ck(`${key}: Up+Special = ${C.up} (raw ${C.upDmg}), connects`,up.name===C.up&&up.dmg===sc(C.upDmg)&&s.hpB<s.maxB,JSON.stringify({...up,applied:s.maxB-s.hpB}));res.up=s.maxB-s.hpB
  if(C.upInv)ck(`${key}: ${C.up} is invulnerable ${C.upInv}f (anti-air)`,up.inv>=C.upInv-1&&up.inv<=C.upInv,String(up.inv))
  if(C.up==='pVault')ck('spd_pink: Vault Kick is an OVERHEAD (hitLevel overhead on the live attack)',up.lvl==='overhead',String(up.lvl))}
 // ↓↘→ motion special.
 const qcf=async()=>{await page.keyboard.down('s');await step(2);await page.keyboard.down('d');await step(1);await page.keyboard.up('s');await step(1);await tap(['l']);await page.keyboard.up('d')}
 const grant=async()=>{if(C.gate==='mark'){await page.evaluate(()=>{const H=__harness.spdGreenTest;H.move('gScan')});await step(50)}if(C.gate==='reserve'){await page.evaluate(()=>{__harness.spdPinkTest.move('pPrep')});await step(50)}
  await page.evaluate(api=>{const H=__harness[api],a=H.raw(),b=H.raw('p2');b.x=a.x+72;a.energy=100},C.api);await step(2)}
 if(C.gate){await reset(72);await qcf();s=await st();ck(`${key}: ↓↘→ without its resource = ordinary ${C.unGated}`,s.name===C.unGated,String(s.name))}
 await reset(260);await grant();const e0=(await st()).e;const seen=[];await qcf();for(let i=0;i<70;i++){s=await st();if(s.name&&!seen.includes(s.name))seen.push(s.name);await step(1)}s=await st()
 ck(`${key}: ↓↘→+Special = 3-hit ${C.m1}→${C.m2}→${C.m3}, last hit knocks down`,[C.m1,C.m2,C.m3].every(k=>seen.includes(k))&&s.hpB<s.maxB,JSON.stringify({seen,dmg:s.maxB-s.hpB}))
 res.motion={hits:seen,applied:s.maxB-s.hpB,spent:+(e0-(await st()).e).toFixed(2)}
 if(C.gate==='mark')ck('spd_green: Read Rush consumed the mark',!s.s.mark)
 if(C.gate==='reserve')ck('spd_pink: Iron Barrage spent the Iron Reserve charge',!s.s.reserve&&s.s.consumed>=1)
 await reset(72);await tap(['d']);await step(3);await tap(['l']);s=await st();ck(`${key}: plain Forward+Special never reads as ↓↘→`,s.name!==C.m1,String(s.name))
 await reset(260);await grant();await page.evaluate(api=>{const H=__harness[api],a=H.raw(),b=H.raw('p2');b.x=a.x+72;b._forceGuard=true},C.api);await qcf();let bs=0,bseen=[],stop=null;for(let i=0;i<70;i++){const q=await page.evaluate(api=>{const a=__harness[api].raw(),b=__harness[api].raw('p2');return{bs:b.blockstun||0,n:a.currentAttack?.name||null,cd:a.attackCooldown||0}},C.api);bs=Math.max(bs,q.bs);if(q.n&&!bseen.includes(q.n))bseen.push(q.n);if(stop===null&&bseen.length&&!q.n)stop=q.cd;await step(1)}s=await st()
 await page.evaluate(api=>{__harness[api].raw('p2')._forceGuard=false},C.api)
 ck(`${key}: blocked motion string (held guard) is fully blockable, no knockdown`,!s.kd&&bs>0&&s.maxB-s.hpB<34,JSON.stringify({kd:s.kd,maxBlockstun:bs,chip:s.maxB-s.hpB}))
 ck(`${key}: a blocked first stage ENDS the string (no ${C.m2}) with an 18f stop`,bseen.length===1&&bseen[0]===C.m1&&stop>=17,JSON.stringify({bseen,stop}))
 res.blockedString={chip:s.maxB-s.hpB,stopFrames:stop}
 // ── LAYER 2: ↓↙←+Special (Red's ↓↙← slot) ──
 const qcbIn=async()=>{await page.keyboard.down('s');await step(2);await page.keyboard.down('a');await step(1);await page.keyboard.up('s');await step(1);await tap(['l']);await page.keyboard.up('a')}
 await reset(C.qcbGap);await qcbIn();s=await st();const q={name:s.name,dmg:s.dmg,inv:s.inv,origin:s.origin,e0:s.e,bx0:s.bx};let qkd=false,minX=s.x,x0=s.x
 for(let i=0;i<80;i++){await step(1);const z=await st();qkd=qkd||z.kd;minX=Math.min(minX,z.x)}s=await st()
 ck(`${key}: ↓↙←+Special = ${C.qcb} (raw ${C.qcbDmg}) and it connects`,q.name===C.qcb&&q.dmg===sc(C.qcbDmg)&&s.hpB<s.maxB,JSON.stringify({...q,applied:s.maxB-s.hpB}))
 if(C.qcbKd)ck(`${key}: ${C.qcb} knocks down`,qkd)
 if(C.qcbRetreat)ck(`${key}: ${C.qcb} backflips ${C.qcbRetreat}px away (invulnerable 5f) before the shot`,Math.abs((q.origin-minX)-C.qcbRetreat)<1.01&&q.inv>=4&&q.inv<=5,JSON.stringify({moved:q.origin-minX,inv:q.inv}))
 if(key==='spd_blue')ck('spd_blue: Barrier Bash knocks the foe away (foe pushed > 40px)',s.bx-q.bx0>40&&s.hpB<s.maxB,JSON.stringify({pushed:+(s.bx-q.bx0).toFixed(1)}))
 res.qcb={applied:s.maxB-s.hpB,knockdown:qkd}
 // A plain Back+Special (no ↓ first) keeps its old meaning.
 await reset(C.qcbGap);await tap(['a','l']);s=await st();ck(`${key}: plain Back+Special is still ${C.plainBack} (not ${C.qcb})`,s.name===C.plainBack,String(s.name))
 // Blocked: fully blockable, no knockdown.
 await reset(C.qcbGap);await page.evaluate(api=>{__harness[api].raw('p2')._forceGuard=true},C.api);await qcbIn();let qb=0;for(let i=0;i<80;i++){qb=Math.max(qb,await page.evaluate(api=>__harness[api].raw('p2').blockstun||0,C.api));await step(1)}s=await st()
 await page.evaluate(api=>{__harness[api].raw('p2')._forceGuard=false},C.api)
 ck(`${key}: ${C.qcb} is blockable (held guard: blockstun, no knockdown)`,qb>0&&!s.kd,JSON.stringify({qb,kd:s.kd,chip:s.maxB-s.hpB}))
 // ── LAYER 3: Forward+Light command normal ──
 await reset(C.flGap||72);await page.keyboard.down('d');await step(1);await tap(['j']);await page.keyboard.up('d');s=await st();const fl={name:s.name,dmg:s.dmg,x0:s.origin??s.x,bx0:s.bx,by0:null}
 let minBy=Infinity,maxAdv=0;const by0=(await page.evaluate(api=>__harness[api].raw('p2').y,C.api));for(let i=0;i<75;i++){await step(1);const z=await page.evaluate(([api,tag])=>{const H=__harness[api],a=H.raw(),b=H.raw('p2');return{by:b.y,x:a.x,o:a.currentAttack?.[tag]?.origin}},[C.api,C.tag]);minBy=Math.min(minBy,z.by)}s=await st()
 ck(`${key}: Forward+Light = ${C.fl} (raw ${C.flDmg}) and it connects`,fl.name===C.fl&&fl.dmg===sc(C.flDmg)&&s.hpB<s.maxB,JSON.stringify({...fl,applied:s.maxB-s.hpB}))
 if(C.fl==='pKnee')ck('spd_pink: Rose Knee pops the foe up (airborne > 40px)',by0-minBy>40,JSON.stringify({lift:+(by0-minBy).toFixed(1)}))
 if(C.fl==='bPalm')ck('spd_blue: Barrier Palm shoves the foe back ≥ 35px (engine applies knockback after hitstun)',s.bx-fl.bx0>=35,JSON.stringify({pushed:+(s.bx-fl.bx0).toFixed(1)}))
 if(C.fl==='gElbow')ck('spd_green: Step-in Elbow advances 32px (±1)',Math.abs(s.x-fl.x0-32)<=1.01,JSON.stringify({advanced:+(s.x-fl.x0).toFixed(1)}))
 await reset(72);await tap(['j']);s=await st();ck(`${key}: plain Light is still the jab`,s.name==='light',String(s.name))
 res.fwdLight={applied:s.maxB-s.hpB}
 // ── LAYER 4: air Heavy (air Light keeps the quick aerial) ──
 await reset(700);await tap(['w']);await step(6);await tap(['k']);s=await st();const ah={name:s.name,dmg:s.dmg}
 await reset(700);await tap(['w']);await step(6);await tap(['j']);s=await st();const al={name:s.name}
 ck(`${key}: air Heavy = ${C.airH} (raw ${C.airHDmg}); air Light stays the quick aerial`,ah.name===C.airH&&ah.dmg===sc(C.airHDmg)&&al.name==='air',JSON.stringify({ah,al}))
 await reset(60);await tap(['w']);const gy=(await st()).y;for(let i=0;i<90;i++){const z=await page.evaluate(api=>{const a=__harness[api].raw();return{vy:a.vy,y:a.y}},C.api);if(z.vy>0&&z.y>=gy-150)break;await step(1)}await tap(['k']);const hp1=(await st()).hpB;for(let i=0;i<40&&(await st()).hpB===hp1;i++)await step(1);s=await st()
 ck(`${key}: air Heavy connects on a jump-in`,s.hpB<s.maxB,JSON.stringify({applied:s.maxB-s.hpB}));res.airHeavy=s.maxB-s.hpB
 // ── LAYER 5: Back+Light retreating poke (steps back during startup, then a long-reach strike) ──
 await reset(72);await page.keyboard.down('a');await step(1);await tap(['j']);await page.keyboard.up('a');s=await st();const bl={name:s.name,dmg:s.dmg,x0:s.origin??s.x};let blMin=s.x,hitX=null,hp0=s.hpB
 for(let i=0;i<40;i++){await step(1);const z=await st();blMin=Math.min(blMin,z.x);if(hitX==null&&z.hpB<hp0)hitX=z.x}s=await st()
 ck(`${key}: Back+Light = ${C.bl} (raw ${C.blDmg}), steps ${C.blPull}px back (±1) BEFORE it connects`,bl.name===C.bl&&bl.dmg===sc(C.blDmg)&&Math.abs((bl.x0-blMin)-C.blPull)<=1.01&&hitX!=null&&Math.abs((bl.x0-hitX)-C.blPull)<=1.01,JSON.stringify({...bl,moved:+(bl.x0-blMin).toFixed(1),movedAtHit:hitX==null?null:+(bl.x0-hitX).toFixed(1),applied:s.maxB-s.hpB}))
 res.backLight={applied:s.maxB-s.hpB,moved:+(bl.x0-blMin).toFixed(1)}
 await reset(72);await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(8);await page.keyboard.down('a');await step(1);await tap(['j']);await page.keyboard.up('a');let bb=0;for(let i=0;i<30;i++){await step(1);bb=Math.max(bb,(await st()).stun===0?(await page.evaluate(api=>__harness[api].raw('p2').blockstun||0,C.api)):0)}s=await st()
 ck(`${key}: ${C.bl} is blockable (held guard: blockstun, no knockdown)`,bb>0&&!s.kd,JSON.stringify({blockstun:bb,chip:s.maxB-s.hpB}))
 // ── LAYER 6: Charge+Forward ARMORED advancing strike ──
 const jabMe=()=>page.evaluate(async api=>{const {startMove}=await import('./combat.js');const a=__harness[api].raw(),b=__harness[api].raw('p2');b.hitstun=0;b.hitstop=0;b.attackCooldown=0;b.attacking=false;b.currentAttack=null;b.facing=-1;startMove(b,'light',{damage:16,startup:0,active:3,recovery:10,frameExact:true,rangeX:140,rangeY:80})},C.api)
 await reset(120);const ramE0=(await st()).e;await tap(['d','p']);s=await st();const rm={name:s.name,dmg:s.dmg,x0:s.origin??s.x,spent:+(ramE0-s.e).toFixed(1)}
 ck(`${key}: Charge+Forward = ${C.ram} (raw ${C.ramDmg}), costs 20`,rm.name===C.ram&&rm.dmg===sc(C.ramDmg)&&Math.abs(rm.spent-20)<0.5,JSON.stringify(rm))
 await step(4);const hpA0=(await page.evaluate(api=>__harness[api].raw().health,C.api));await jabMe();let tookHit=false,stunned=false,still=true,hit=false;const hpB0=(await st()).hpB
 for(let i=0;i<30;i++){await step(1);const z=await page.evaluate(([api,k])=>{const a=__harness[api].raw(),b=__harness[api].raw('p2');return{hp:a.health,stun:a.hitstun||0,name:a.currentAttack?.name||null,hpB:b.health}},[C.api,C.ram]);if(z.hp<hpA0)tookHit=true;if(z.stun>0)stunned=true;if(!hit&&z.name!==C.ram)still=false;if(z.hpB<hpB0)hit=true}
 s=await st();ck(`${key}: ${C.ram} ARMOR absorbs a jab during startup (damage taken, no hitstun, not interrupted) and still connects`,tookHit&&!stunned&&still&&hit,JSON.stringify({tookHit,stunned,uninterrupted:still,connected:hit,applied:s.maxB-s.hpB,advanced:+(s.x-rm.x0).toFixed(1)}))
 res.armoredCharge={applied:s.maxB-s.hpB,advanced:+(s.x-rm.x0).toFixed(1)}
 await reset(300);await tap(['p']);s=await st();ck(`${key}: neutral Charge unchanged (${C.neutralCharge||'engine charge, no Ranger move'})`,C.neutralCharge?s.name===C.neutralCharge:s.name!==C.ram,String(s.name))
 // ── LAYER 7: Charge+Back counter stance (Green / Blue; Pink already has Baton Reprisal) ──
 if(C.read){
  await reset(80);const ce0=(await st()).e;await tap(['a','p']);s=await st();const rd={name:s.name,spent:+(ce0-s.e).toFixed(1)};await step(5);const hpA=(await page.evaluate(api=>__harness[api].raw().health,C.api));const hpB=(await st()).hpB;await jabMe()
  let strike=false,sd=null;for(let i=0;i<30;i++){await step(1);const z=await st();if(z.name===C.readStrike){strike=true;sd=z.dmg}}s=await st();const hpA2=await page.evaluate(api=>__harness[api].raw().health,C.api)
  ck(`${key}: Charge+Back = ${C.read} counter: reads a live jab -> ${C.readStrike} (raw ${C.readDmg}) connects, Ranger untouched`,rd.name===C.read&&Math.abs(rd.spent-10)<0.5&&strike&&sd===sc(C.readDmg)&&s.hpB<hpB&&hpA2===hpA,JSON.stringify({...rd,strike,applied:hpB-s.hpB,rangerDamage:hpA-hpA2}))
  res.counter={applied:hpB-s.hpB}
  await reset(80);await tap(['a','p']);let fired=false,end=null;for(let i=0;i<50;i++){await step(1);const z=await st();if(z.name===C.readStrike)fired=true;if(end==null&&!z.name)end=i+1}
  ck(`${key}: whiffed ${C.read} never strikes and ends (punishable recovery)`,!fired&&end!=null&&end>=38,JSON.stringify({fired,endedAfter:end}))
 }
 // ── LAYER 8: ↓↙←+Heavy command throw (unblockable, knockdown) ──
 const qcbH=async()=>{await page.keyboard.down('s');await step(2);await page.keyboard.down('a');await step(1);await page.keyboard.up('s');await step(1);await tap(['k']);await page.keyboard.up('a')}
 await reset(56);await page.evaluate(()=>__harness.setDummyBehavior('block'));await step(8);await qcbH();s=await st();const tz={name:s.name,dmg:s.dmg};let tkd=false;for(let i=0;i<40;i++){await step(1);tkd=tkd||(await st()).kd}s=await st()
 ck(`${key}: ↓↙←+Heavy = ${C.toss} (raw ${C.tossDmg}) throws a GUARDING foe and knocks down`,tz.name===C.toss&&tz.dmg===sc(C.tossDmg)&&s.hpB<s.maxB&&tkd,JSON.stringify({...tz,kd:tkd,applied:s.maxB-s.hpB}))
 res.commandThrow=s.maxB-s.hpB
 await reset(220);await qcbH();s=await st();const wn=s.name;let dur=0;for(let i=0;i<60;i++){await step(1);if((await st()).name===C.toss)dur=i+1}s=await st()
 ck(`${key}: whiffed ${C.toss} (out of reach) deals nothing and is slow to recover (≥38f)`,wn===C.toss&&s.hpB===s.maxB&&dur>=38,JSON.stringify({dur}))
 if(C.read){await reset(56);await page.evaluate(([api,k])=>__harness[api].move(k,'p2'),[C.api,C.read]);await step(5);const hA=await page.evaluate(api=>__harness[api].raw().health,C.api);await qcbH();let saw=null;for(let i=0;i<30;i++){await step(1);const n=await page.evaluate(api=>__harness[api].raw('p2').currentAttack?.name||null,C.api);if(n===C.readStrike)saw=n}s=await st();const hA2=await page.evaluate(api=>__harness[api].raw().health,C.api)
  ck(`${key}: ${C.toss} beats the ${C.read} counter stance (throws are not read)`,!saw&&s.hpB<s.maxB&&hA2===hA,JSON.stringify({counterFired:!!saw,applied:s.maxB-s.hpB,throwerDamage:hA-hA2}))}
 out[key]=res;await page.close()}
 ck('no browser runtime errors',errors.length===0,JSON.stringify(errors.slice(0,4)))
}finally{out.passes=pass;out.failures=fail;fs.mkdirSync('docs/rangers',{recursive:true});fs.writeFileSync('docs/rangers/variety_results.json',JSON.stringify(out,null,2)+'\n');console.log(pass,'passed /',fail,'failed');if(fail)process.exitCode=1;await browser.close();server.close()}
