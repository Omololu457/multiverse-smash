import fs from 'node:fs'
import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const browser=await chromium.launch({headless:true}),out=[]
try{
for(const opponent of ['goku','superman','luffy']){
 const page=await browser.newPage();await page.addInitScript(()=>window.requestAnimationFrame=()=>0);await page.goto(`http://localhost:8000/index.html?harness=1&p1=mr_incredible&p2=${opponent}&seed=8812`,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.__harness?.mrIncredibleTest);await page.evaluate(()=>{__harness.start();__harness.skipToBattle();__harness.luffyTest.step(1)});await page.evaluate(()=>__harness.preloadDone());await page.waitForFunction(()=>__harness.spriteReady().ready,null,{timeout:60000})
 const rows=await page.evaluate(async opponent=>{
 const {writeRawControls}=await import('./input.js'),H=__harness.mrIncredibleTest,step=()=>__harness.aiVsAi.step(1),a=H.raw(),b=H.raw('p2'),out=[]
 const setup=prime=>{H.reset();__harness.setDummyBehavior('stand');__harness.setRoundTimer(99999);for(const f of [a,b]){f.health=f.maxHealth;f.energy=100;f.x=f===a?1300:1365;f.y=400;f.groundY=500;f.onGround=f.grounded=true;f.vx=f.vy=0;f.hitstun=f.blockstun=f.hitstop=0;f.invulnTimer=0;f.attacking=false;f.currentAttack=null;f.currentMove=null;f.attackCooldown=0;f.knockdownState=false;f.knockdownTimer=0;f.isGrabbed=false;f.isBlocking=false;f._forceGuard=false;f.comboCounter=0;f.comboTimer=0;f.jumpCount=0;f.jumpHeld=false;f.juggleCount=0;f.isLaunched=false;f.dashTimer=f.dashCooldown=0;writeRawControls(f,{})}a.facing=1;b.facing=-1;if(prime){H.activate();for(let i=0;i<24;i++)step()}}
 for(const prime of [false,true]){
  for(const key of ['light','heavy','miRush','miSlam','miLift']){setup(prime);const hp=b.health,raw=H.data().moves[key].damage*(prime?1.3:1);H.move(key);for(let i=0;i<140;i++)step();out.push({opponent,prime,kind:'isolated',key,raw,actual:hp-b.health,defense:b.defenseMultiplier||1})}
  // A deliberately raised defense multiplier exercises the live division, not metadata.
  setup(prime);b.defenseMultiplier=1.25;const hp=b.health;H.move('heavy');for(let i=0;i<80;i++)step();out.push({opponent,prime,kind:'defense-probe',actual:hp-b.health,defense:1.25});b.defenseMultiplier=1
  for(const route of ['light_chain','launcher_air','heavy_rush','air_slam','power_lift_reset']){
   setup(prime);const hp=b.health,energy=a.energy,reserve=a._mrIncredible?.reserve||0,hits=[],moves=new Set();let old=hp,ph=0,at=0,prevStun=0,lastHit=-1
   for(let i=0;i<240;i++){
    let r={},A=a.currentAttack,clean=A?.mr?.clean&&!a.hitstop
    if(route==='light_chain'){
     if(ph===0){r.light=true;ph=1}
     else if(ph===1&&A?.name==='light'&&clean){r.light=true;ph=2}
     else if(ph===2&&A?.name==='miLight2'&&clean){r.light=true;ph=3}
    }else if(route==='launcher_air'){
     if(ph===0){r.upAttack=true;ph=1}
     else if(ph===1&&A?.launcher&&clean){r.up=r.jump=true;ph=2;at=i}
     else if(ph===2&&i-at===2){r.light=true;ph=3}
    }else if(route==='heavy_rush'){
     if(ph===0){r.heavy=true;ph=1}
     else if(ph===1&&clean){r.right=r.special=true;ph=2}
    }else if(route==='air_slam'){
     if(i===0)r.up=r.jump=true
     if(i===5){r.down=r.special=true;ph=1}
     if(ph===0&&clean){r.down=r.special=true;ph=1}
     else if(i===25&&ph===0&&!a.attacking){r.down=r.special=true;ph=1}
    }else if(route==='power_lift_reset'){
     if(ph===0){r.right=r.grab=true;ph=1}
     else if(ph===1&&!a.attackCooldown&&!b.isGrabbed&&i>45){r.light=true;ph=2}
    }
    writeRawControls(a,r);prevStun=b.hitstun;step();if(a.currentAttack)moves.add(a.currentAttack.name)
    if(b.health<old){hits.push({tick:i,damage:old-b.health,stunBefore:prevStun,gapFromPrevious:lastHit<0?null:i-lastHit,escapeWindow:prevStun<=0&&lastHit>=0});lastHit=i}old=b.health
   }
   out.push({opponent,prime,kind:'route',route,actual:hp-b.health,hits,moves:[...moves],energyCost:prime?reserve-(a._mrIncredible?.reserve||0):Math.round((energy-a.energy)*100)/100,phase:ph})
  }
 }
 return out
 },opponent);out.push(...rows);await page.close();console.log('PASS measured against live',opponent)
}
assert(out.filter(x=>x.kind==='isolated').every(x=>x.actual>0));
}finally{fs.writeFileSync('docs/mr_incredible/damage_routes.json',JSON.stringify(out,null,2));await browser.close()}
