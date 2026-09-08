// harness/ghostface_exe_swapjump.test.mjs
// Regression for the identity-swap MOVEMENT-GATE LEAK: a borrowed identity's giant/planted form
// (Sasuke's Susanoo sets canJump=false) must NOT leave jump/dash disabled after the involuntary
// revert — on Billy OR on the next borrowed identity. Verifies REAL-keyboard jump works in every
// identity across direct/indirect transition paths, for the default pair + 2 other skins.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".png":"image/png",".mp3":"audio/mpeg",".css":"text/css",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((rq,rs)=>{const u=decodeURIComponent(rq.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){rs.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){rs.writeHead(404).end();return;}rs.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});rs.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
let pass=0,fail=0; const check=(n,c,e="")=>{console.log(`${c?"✓":"✗"} ${n}${e?"  — "+e:""}`);c?pass++:fail++;};
const state=()=>page.evaluate(()=>window.__harness.state());
const p1=()=>page.evaluate(()=>window.__harness.p1());
const sw=()=>page.evaluate(()=>window.__harness.idSwapState("p1"));
async function wf(n){const s=(await state()).frame;await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:20000,polling:16});}
async function settle(){ await page.evaluate(()=>{ window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); });
  for(let i=0;i<120;i++){ const p=await p1(); if(p.grounded&&!p.attacking&&Math.abs(p.vy)<0.6&&(p.jumpCount||0)===0) return true; await wf(1); } return false; }
// REAL-keyboard grounded jump. Returns true iff the jump input produced lift.
async function jumps(){ if(!await settle()) return null; const b=await p1();
  await page.keyboard.down("w"); await wf(5); const m=await p1(); await page.keyboard.up("w"); await wf(2);
  const ok = m.vy<-1 || (!m.grounded && m.y<b.y-2);
  for(let i=0;i<80;i++){ const p=await p1(); if((await p1()).grounded) break; await wf(1); } return ok; }
async function swapVia(dir){ await page.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.resetFighterInput?.("p1");}); await wf(1);
  await page.evaluate(d=>window.__harness.p1SpecialDir(d), dir); await wf(3); return (await sw()).rosterKey; }
async function forceRevert(){ // expire the window, then WAIT for the revert to actually land (a freeze-cinematic ult defers the tick)
  for(let k=0;k<10;k++){ await page.evaluate(()=>window.__harness.idSwapForceTimer?.(1)); await wf(6); if(!(await sw()).active) return true; }
  return !(await sw()).active; }
async function fireUlt(){ await page.evaluate(()=>{window.__harness.fillEnergy?.();}); await wf(1);
  const r=await page.evaluate(()=>window.__harness.p1Ultimate());
  // let any inner freeze-cinematic / committed ult resolve so the fighter is actionable again before we revert
  for(let i=0;i<220;i++){ const p=await p1(); if(p.grounded && !p.attacking) break; await wf(1); }
  return r; }
async function bootSkin(s){ await page.evaluate(x=>window.__harness.bootSkin(x), s); await wf(5); await page.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.resetFighterInput?.("p1");}); await wf(2); }
try{
  await page.goto(`${base}/index.html?harness=1&p1=ghostface_exe&p2=piccolo`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000});
  await page.mouse.click(640,360); await page.evaluate(()=>window.__harness.boot()); await wf(8);
  await page.evaluate(()=>{window.__harness.fillEnergy?.();window.__harness.resetFighterInput?.("p1");}); await wf(2);

  console.log("── DEFAULT PAIR (Billy → Sasuke / Deathstroke) ──");
  check("Billy jumps", await jumps()===true);

  // THE BUG PATH: Sasuke → Susanoo (canJump=false) → involuntary revert → jump must survive
  await swapVia("D");
  const sJ = await jumps(); check("Sasuke jumps (base form)", sJ===true);
  await swapVia("D"); await fireUlt(); const inSus=await sw(); const susStage=(await p1()).susanooStage;
  check("Sasuke Susanoo engaged (canJump=false WHILE active — intended)", inSus.canJump===false && susStage>0, `canJump=${inSus.canJump} susanoo=${susStage}`);
  await forceRevert();
  check("★ after Susanoo→revert: Billy canJump restored", (await sw()).canJump===true, `canJump=${(await sw()).canJump}`);
  check("★ after Susanoo→revert: Billy JUMPS (real key)", await jumps()===true);

  // indirect Billy → Sasuke → revert → Deathstroke
  await swapVia("D"); await forceRevert(); const dsKey=await swapVia("U");
  check("indirect: reached Deathstroke", dsKey==="deathstroke");
  check("Deathstroke jumps (after Sasuke→revert→DS)", await jumps()===true);
  check("Deathstroke canJump/noDash clean", (await sw()).canJump===true && (await sw()).noDash===false);
  await forceRevert();

  // other order: Billy → Deathstroke → revert → Sasuke
  const dK=await swapVia("U"); check("Billy → Deathstroke", dK==="deathstroke");
  check("Deathstroke jumps (direct from Billy)", await jumps()===true);
  await forceRevert(); const sK=await swapVia("D"); check("Deathstroke→revert→Sasuke", sK==="sasuke");
  check("Sasuke jumps (after Deathstroke→revert→Sasuke)", await jumps()===true);
  await forceRevert();

  // DIRECT attempt (Stage-1 finding): pressing the OTHER slot while swapped fires the BORROWED move,
  // it does NOT swap identities. Confirm it stays Sasuke AND jump still works.
  await swapVia("D"); await settle();
  await page.evaluate(()=>window.__harness.p1SpecialDir("U")); await wf(4);
  check("direct A→B not supported: still Sasuke after Up+Special", (await sw()).rosterKey==="sasuke", `id=${(await sw()).rosterKey}`);
  check("jump still works after direct-swap attempt", await jumps()===true);
  await forceRevert();

  // ── 2 OTHER SKINS ── (their pairs raise DIFFERENT form flags; the fix is a blanket movement-gate guard).
  // Exercise the kit with quick SPECIALS (not the ultimate — some borrowed ults, e.g. Hisoka's Bloodlust
  // Overdrive, are freeze-cinematics that halt the frame counter and can't be driven cleanly in-harness).
  // Specials raise the sustained form flags (overdrive / frame-trap / kira / plasma-charge …) — exactly the
  // "same class" of state to check for a movement-gate leak.
  async function exerciseSpecials(){ for(const d of [null,"D","F","B"]){ await page.evaluate(x=>window.__harness.p1SpecialDir(x), d); await wf(4); } }
  for (const [skin, A, B] of [["ghostfaceExeStu","hisoka","naoya"], ["ghostfaceExeAmber","light","vilgax"]]){
    console.log(`── SKIN ${skin} (${A} / ${B}) ──`);
    await bootSkin(skin);
    check(`${skin}: Billy jumps`, await jumps()===true);
    const a=await swapVia("D"); check(`${skin}: Down→${A}`, a===A, `got ${a}`);
    check(`${skin}: ${A} jumps (borrowed base form)`, await jumps()===true);
    await exerciseSpecials(); await forceRevert();
    check(`${skin}: ${A}→specials→revert: Billy jumps`, await jumps()===true);
    check(`${skin}: Billy canJump/noDash clean after ${A}`, (await sw()).canJump===true && (await sw()).noDash===false);
    const b=await swapVia("U"); check(`${skin}: Up→${B}`, b===B, `got ${b}`);
    check(`${skin}: ${B} jumps (borrowed base form)`, await jumps()===true);
    await exerciseSpecials(); await forceRevert();
    check(`${skin}: ${B}→specials→revert: Billy jumps`, await jumps()===true);
    check(`${skin}: Billy canJump/noDash clean after ${B}`, (await sw()).canJump===true && (await sw()).noDash===false);
  }

  check("no JS errors", errs.length===0, errs[0]||"");
}catch(e){ console.log("FATAL",String(e)); fail++; }
console.log(`\n════════════════════════════════════════`);
console.log(`  GHOSTFACE_EXE SWAP-JUMP: ${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close(); process.exit(fail?1:0);
