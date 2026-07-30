// harness/ben_slot_transform.test.mjs
// ISSUE-4 REBUILD PROOF — deliberate Omnitrix SLOT transform (replaces cycling).
// Each loadout slot has its OWN fixed CHARGE+input combo; pressing it morphs into that EXACT alien —
// from human OR from another alien — and pressing the same combo repeatedly NEVER drifts to a different
// alien (proves deliberate, not cycling/random). Data-driven slot count (reads the real loadout).
//   node harness/ben_slot_transform.test.mjs
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json"};
const server=await new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){res.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});res.end(d);});});s.listen(0,"127.0.0.1",()=>r(s));});
const base=`http://127.0.0.1:${server.address().port}`;
let pass=0,fail=0; const section=t=>console.log(`\n── ${t} ──`); const check=(n,c,e="")=>{console.log(`${c?"✓":"✗"} ${n}${e?"  — "+e:""}`);c?pass++:fail++;};
const browser=await chromium.launch({args:["--disable-background-timer-throttling","--disable-renderer-backgrounding","--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}}); const jsErr=[]; page.on("pageerror",e=>jsErr.push(String(e)));
const st=()=>page.evaluate(()=>window.__harness.state());
const form=()=>page.evaluate(()=>window.__harness.benCmd("p1").form);
async function wf(n){const s=(await st()).frame;await page.waitForFunction(([a,c])=>window.__harness.state().frame>=a+c,[s,n],{timeout:20000,polling:16});}
const DIR={down:"s",left:"a",right:"d"};
// Wait out the real per-switch recharge (SWITCH_COOLDOWN=45f) so back-to-back combos aren't gated,
// top up energy (live hook), then press CHARGE + direction (edge). Return the resulting form.
async function combo(dirKey){
  await wf(52);
  await page.evaluate(()=>window.__harness.fillEnergy?.());
  await page.keyboard.down("p"); await wf(1);
  await page.keyboard.down(dirKey); await wf(2); await page.keyboard.up(dirKey);
  await page.keyboard.up("p"); await wf(3);
  return form();
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness,null,{timeout:15000}); await page.mouse.click(640,360);
  await page.evaluate(()=>window.__harness.boot());
  await page.waitForFunction(()=>{const p=window.__harness.p1();return p&&p.spriteReady;},null,{timeout:15000,polling:32}).catch(()=>{});

  // Establish a known loadout = the real art-backed forms, in slot order.
  const L=await page.evaluate(()=>window.__harness.benLoadout(["xlr8","diamondhead","feedback"]));
  const slots=L.aliens||[];
  console.log(`Loadout (slot order): [${slots.join(", ")}]  (slot count = ${slots.length}, data-driven)`);
  // Fixed slot→combo mapping (cardinal): slot0=P+Down, slot1=P+Left, slot2=P+Right
  const MAP=[["down",slots[0]],["left",slots[1]],["right",slots[2]]].filter(m=>m[1]);

  // Chain that enters each slot FROM A DIFFERENT alien (so every step is a real switch, never a no-op):
  // start xlr8(0) → left→slot1 → right→slot2 → down→slot0. Proves all 3 combos map to the exact alien.
  section("Each slot combo → the EXACT alien (entered from a different alien)");
  { const order=[["left",slots[1]],["right",slots[2]],["down",slots[0]]].filter(m=>m[1]);
    for (const [dir,expect] of order){ const got=await combo(DIR[dir]); check(`CHARGE+${dir} → ${expect}`, got===expect, `got=${got}`); } }

  section("From HUMAN, a slot combo morphs DIRECTLY into that exact alien (deliberate, slot-only)");
  for (const [dir,expect] of MAP){
    await page.evaluate(()=>window.__harness.benForm("human")); await wf(1);
    const wasHuman=(await form())==="human";
    const got=await combo(DIR[dir]);
    check(`human → CHARGE+${dir} → ${expect}`, wasHuman && got===expect, `wasHuman=${wasHuman} got=${got}`);
  }

  section("Deliberate, NOT cycling — repeating a combo always lands the same alien");
  { const [dir,expect]=MAP[MAP.length-1]; const seen=new Set();
    for(let i=0;i<3;i++){ await combo(DIR[MAP[0][0]]); const g=await combo(DIR[dir]); seen.add(g); }
    check(`CHARGE+${dir} ×3 always → ${expect} (never drifts)`, seen.size===1 && seen.has(expect), `landed=[${[...seen].join(",")}]`);
  }

  section("Out-of-range slot combo is a no-op (no wrong-alien misfire)");
  { const before=await combo(DIR.right);   // land on slot 2 (feedback)
    await wf(52); await page.evaluate(()=>window.__harness.fillEnergy?.());
    await page.keyboard.down("p"); await wf(1); await page.keyboard.down("w"); await wf(2); await page.keyboard.up("w"); await page.keyboard.up("p"); await wf(3);
    const after=await form();
    check(`CHARGE+↑ (no slot 4 — only 3 forms) → no change`, before===after && before===slots[2], `${before}→${after}`);
  }

  check("no JS errors", jsErr.length===0, jsErr[0]||"");
} catch(e){ console.log("FATAL",e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════════════════════════════════════`);
  console.log(`  BEN SLOT-TRANSFORM: ${pass} passed, ${fail} failed`);
  console.log(`════════════════════════════════════════`);
  process.exit(fail?1:0);
}
