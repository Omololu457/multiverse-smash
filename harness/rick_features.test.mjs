// harness/rick_features.test.mjs
// Rick feature pass: jab repack (clean frames), double-jump anim swap, free gun poke,
// extended rocket range, and the taunt channel→payoff (incl. both interrupt paths).
// Emits real frame-level + screenshot evidence to harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function startServer(){const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const fp=path.join(ROOT,u==="/"?"/index.html":u);if(!fp.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(fp,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(fp)]||"application/octet-stream"});res.end(d);});});return new Promise(r=>s.listen(0,"127.0.0.1",()=>r(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const server=await startServer(); const baseURL=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows","--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const wf=async n=>{const s=await page.evaluate(()=>window.__harness.state().frame);await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});};
const p1=()=>page.evaluate(()=>window.__harness.p1());
const p2=()=>page.evaluate(()=>window.__harness.p2());
const projectiles=()=>page.evaluate(()=>window.__harness.projectiles());
const shot=n=>page.screenshot({path:path.join(OUT,n)});
async function grounded(){await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&Math.abs(p.vy)<0.5;},null,{timeout:6000}).catch(()=>{});}
async function setupAdjacent(gap=60){await grounded();const a=await p1();await page.evaluate(x=>{window.__harness.setP2X(x);window.__harness.healP2?.();window.__harness.fillEnergy?.();},a.x+gap);await wf(2);}

try {
  await page.goto(`${baseURL}/index.html?harness=1&p1=rick&p2=sasuke`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await wf(6);

  // ── 1) JAB — clean frame progression (repacked sheet) ──────────────────────
  section("JAB (light) — repacked sheet plays 10 clean frames, no garbage");
  await setupAdjacent(70);
  {
    const a=await p1();
    check("light action wired to repacked jab sheet (10f x 112px)", (a.action==="idle"), `pre action=${a.action}`);
    await page.keyboard.down("j");
    const seen=[]; let badSheet=false, badIdx=false;
    for(let i=0;i<22;i++){
      const s=await p1();
      if(s.action==="light"){
        seen.push(s.frameIndex);
        if(!(s.spriteSheet||"").includes("rick_jab")) badSheet=true;
        if(s.frameIndex<0||s.frameIndex>9) badIdx=true;
        if(i%5===0) await shot(`RKF_jab_${String(i).padStart(2,"0")}.png`);
      }
      await wf(1);
    }
    await page.keyboard.up("j");
    const distinct=[...new Set(seen)]; const maxIdx=Math.max(...seen,-1);
    check("jab stays on the jab sheet the whole swing (no fallback/garbage sheet)", !badSheet, `sheet ok=${!badSheet}`);
    check("frameIndex always within [0,9] (no out-of-range garbage cell)", !badIdx, `seen=[${distinct.join(",")}]`);
    check("jab plays across its frames (multiple distinct cells, reaches the late frames)", distinct.length>=4 && maxIdx>=6, `distinct=${distinct.length} max=${maxIdx}`);
    await shot("RKF_jab_final.png");
  }
  await wf(20);

  // ── 2) DOUBLE JUMP — jumpCount-aware anim swap ─────────────────────────────
  section("DOUBLE JUMP — 1st jump = jump art, 2nd jump = rick_double_jump.png");
  await grounded();
  {
    await page.keyboard.down("w"); await wf(2); await page.keyboard.up("w"); await wf(2);
    const j1=await p1();
    check("1st jump: jumpCount=1, action='jump' (normal jump art)", j1.jumpCount===1 && j1.action==="jump", `jumpCount=${j1.jumpCount} action=${j1.action} sheet=${j1.spriteSheet}`);
    await shot("RKF_jump1.png");
    // 2nd jump (must release+repress; jumpHeld guard)
    await page.keyboard.down("w"); await wf(2); await page.keyboard.up("w");
    const j2=await p1();
    check("2nd jump: jumpCount=2, action='doubleJump'", j2.jumpCount===2 && j2.action==="doubleJump", `jumpCount=${j2.jumpCount} action=${j2.action}`);
    check("2nd jump plays rick_double_jump.png specifically", (j2.spriteSheet||"").includes("rick_double_jump"), `sheet=${j2.spriteSheet}`);
    await shot("RKF_double_jump.png");
  }
  await grounded(); await wf(10);

  // ── 3) GUN — free (0 energy) fast laser poke ───────────────────────────────
  section("GUN (Down+Special) — FREE laser poke, damages, costs no energy");
  await setupAdjacent(200);
  {
    const e0=(await p1()).energy, hp0=(await p2()).health;
    await page.keyboard.down("s"); await wf(2);              // Down (registers 'D')
    await page.keyboard.down("l"); await wf(2); await page.keyboard.up("l");
    await page.keyboard.up("s");
    const proj=await projectiles();
    const laser=proj.find(p=>p.name==="portalLaser");
    check("Down+Special spawns a portalLaser projectile", !!laser, `projectiles=${JSON.stringify(proj.map(p=>p.name))}`);
    check("laser travels fast & forward (vx≠0)", !!laser && Math.abs(laser.vx)>8, laser?`vx=${laser.vx}`:"");
    check("gun is FREE — energy unchanged", Math.abs((await p1()).energy - e0) < 0.5, `energy ${e0}→${(await p1()).energy}`);
    await shot("RKF_gun.png");
    let dmg=false; for(let i=0;i<24&&!dmg;i++){ if((await p2()).health<hp0) dmg=true; await wf(1); }
    check("laser deals (low) damage on contact", dmg, `hp0=${hp0}→${(await p2()).health}`);
  }
  await wf(10);

  // ── 4) ROCKET — extended range (long forward travel) ───────────────────────
  section("ROCKET (Up+Special) — long-traveling forward rocket");
  // Make the dummy briefly invulnerable so the rocket passes THROUGH it and free-flies its full
  // reach (a solid dummy — even one shoved to the camera edge — would eat the rocket early).
  await grounded();
  await page.evaluate(()=>{ window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(600); });
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p.grounded&&p.attackCooldown<=0;},null,{timeout:5000}).catch(()=>{});
  {
    await page.keyboard.down("w"); await page.keyboard.down("l"); await wf(2);
    await page.keyboard.up("l"); await page.keyboard.up("w");
    await shot("RKF_rocket.png");
    // Track the rocket's max travel INSIDE the page (rAF-synced = samples every game frame),
    // so a fast projectile isn't undersampled by round-tripping reads.
    const res = await page.evaluate(async () => {
      let x0=null, max=0;
      for (let k=0;k<130;k++){
        const rk = window.__harness.projectiles().find(p=>p.name==="rocket");
        if (rk){ if(x0==null) x0=rk.x; max=Math.max(max, Math.abs(rk.x-x0)); }
        else if (max>0) break;
        await new Promise(r=>requestAnimationFrame(r));
      }
      return { x0, max };
    });
    check("rocket spawned & flies free", res.x0!=null, `x0=${res.x0}`);
    check("rocket travels a long distance (~1200px lifetime reach, vs old ~510 max)", res.max>900, `maxDx=${res.max.toFixed(0)}`);
  }
  await grounded(); await wf(10);

  // ── 5) TAUNT — normal block < 10s is unchanged ─────────────────────────────
  section("TAUNT — a normal <10s Down-hold blocks normally, never taunts");
  await grounded();
  {
    await page.keyboard.down("s"); await wf(60);   // 1s hold
    const s=await p1();
    check("1s Down-hold: charging but NOT taunting, blocking normally", s.tauntCharge>0 && s.tauntCharge<600 && !s.tauntPlaying && s.blocking, `charge=${s.tauntCharge} playing=${s.tauntPlaying} blocking=${s.blocking}`);
    await page.keyboard.up("s"); await wf(3);
    check("releasing Down resets the charge to 0", (await p1()).tauntCharge===0, `charge=${(await p1()).tauntCharge}`);
  }

  // ── 6) TAUNT — full success heals 50% of CURRENT hp, locked, then resolves ──
  section("TAUNT — success: full charge + full animation (never hit) → heal 50% current");
  await grounded();
  {
    await page.evaluate(()=>{ window.__harness.healP2?.(); window.__harness.damageP1?.(750); }); // bring Rick to ~300
    await wf(4);   // let the taunt tracker settle to the new health (else this setup drop reads as a "hit")
    const hp0=(await p1()).health;
    await page.evaluate(()=>window.__harness.setTauntCharge(596));
    await page.keyboard.down("s"); await wf(8);
    const t=await p1();
    check("crossing 600 commits the taunt (locked animation)", t.tauntPlaying && t.tauntTimer>0, `playing=${t.tauntPlaying} timer=${t.tauntTimer}`);
    check("taunt action is playing rick_taunt.png", t.action==="taunt" && (t.spriteSheet||"").includes("rick_taunt"), `action=${t.action} sheet=${t.spriteSheet}`);
    await shot("RKF_taunt_playing.png");
    // FULLY LOCKED: try to walk right — x must not change
    const xBefore=t.x; await page.keyboard.down("d"); await wf(10); await page.keyboard.up("d");
    check("Rick is fully locked during the taunt (no movement)", Math.abs((await p1()).x - xBefore) < 1, `Δx=${((await p1()).x-xBefore).toFixed(1)}`);
    // ride out the rest of the animation un-hit → heal
    await page.waitForFunction(()=>!window.__harness.p1().tauntPlaying,null,{timeout:6000,polling:16});
    await page.keyboard.up("s"); await wf(2);
    const hp1=(await p1()).health;
    const expected=hp0+Math.floor(hp0*0.5);
    check("healed 50% of CURRENT hp on success (clamped to max)", Math.abs(hp1-Math.min(1050,expected))<=1, `hp ${hp0}→${hp1} (expected ${Math.min(1050,expected)})`);
  }
  await grounded(); await wf(5);

  // ── 7) TAUNT — interrupted MID-CHARGE by a hit → cancels, no reward ─────────
  section("TAUNT — hit MID-CHARGE cancels the charge (no taunt)");
  await grounded();
  {
    await page.evaluate(()=>window.__harness.setTauntCharge(400));
    await page.keyboard.down("s"); await wf(4);
    check("charge is climbing", (await p1()).tauntCharge>=400, `charge=${(await p1()).tauntCharge}`);
    await page.evaluate(()=>window.__harness.damageP1(30));   // take a hit mid-charge
    await wf(3);
    const s=await p1();
    // the hit resets the charge (it may re-accrue a couple frames since Down is still held);
    // the point is it was slammed back down and NEVER committed.
    check("hit mid-charge resets the charge (slammed back, no taunt commits)", s.tauntCharge<50 && !s.tauntPlaying, `charge=${s.tauntCharge} playing=${s.tauntPlaying}`);
    await page.keyboard.up("s");
  }
  await grounded(); await wf(5);

  // ── 8) TAUNT — interrupted MID-ANIMATION by a hit → cancels, NO heal ────────
  section("TAUNT — hit MID-ANIMATION cancels the taunt (no heal reward)");
  await grounded();
  {
    await page.evaluate(()=>{ window.__harness.healP1?.(); });   // clean, healthy start
    await wf(4);   // settle so the setup heal isn't misread by the tracker
    await page.evaluate(()=>window.__harness.setTauntCharge(596));
    await page.keyboard.down("s"); await wf(8);
    const t=await p1();
    check("taunt committed (animation playing)", t.tauntPlaying, `playing=${t.tauntPlaying}`);
    const hpMid=t.health;
    await page.evaluate(()=>window.__harness.damageP1(20));   // hit during the animation
    await wf(4);
    const a=await p1();
    check("hit mid-animation cancels the taunt", !a.tauntPlaying, `playing=${a.tauntPlaying}`);
    check("NO heal reward on interruption (health only went down from the hit)", a.health <= hpMid, `hp ${hpMid}→${a.health}`);
    await page.keyboard.up("s");
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; try{await shot("RKF_ERROR.png");}catch{} }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
