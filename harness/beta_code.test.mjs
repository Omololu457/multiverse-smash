// harness/beta_code.test.mjs — REDEFINED "beta" unlock code (GojoV1).
// Beta now = the SAME full unlock as DEV_CODE (all skins/features/Online/modes) PLUS a
// character-select filter restricting the roster to characters that actually have sprite
// art (hasSprites), derived LIVE from characters.js. DEV_CODE must be unchanged: everything
// unlocked, NO character filter. This test drives the real getUniverseList/getUniverseCharacters
// menu path (not a hardcoded expectation) via the __harness menuRoster/rosterSets/applyCode hooks.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");const OUT=path.join(ROOT,"harness","shots");fs.mkdirSync(OUT,{recursive:true});
const MIME={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".mp4":"video/mp4",".json":"application/json",".csv":"text/csv"};
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);
const server=await srv();const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({headless:true});const page=await b.newPage({viewport:{width:1280,height:720}});
const jsErrors=[];page.on("pageerror",e=>jsErrors.push(String(e)));
const sortJoin=a=>[...a].sort().join(",");

async function load(){ await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(80); }
const applyCode=c=>page.evaluate(c=>window.__harness.applyCode(c),c);
const menu=()=>page.evaluate(()=>window.__harness.menuRoster());
const sets=()=>page.evaluate(()=>window.__harness.rosterSets());

try{
  await load();

  // ── Ground truth: the live hasSprites set ──────────────────────────────────
  section("Ground truth — hasSprites roster derived live from characters.js");
  const gt=await sets();
  check("there are 7 sprite-having characters", gt.sprite.length===7, `sprite=${sortJoin(gt.sprite)}`);
  check("full non-hidden roster is much larger (filter is meaningful)", gt.all.length>gt.sprite.length+10, `all=${gt.all.length}`);
  const spriteSet=gt.sprite;

  // ── Baseline: NO code entered ──────────────────────────────────────────────
  section("Baseline (no code) — full roster, ONLINE locked");
  let m=await menu();
  check("no unlock flags set", m.beta===false && m.dev===false);
  check("full roster selectable (no filter)", sortJoin(m.selectable)===sortJoin(gt.all), `n=${m.selectable.length}`);
  check("ONLINE locked without a code", m.onlineLocked===true);
  const baseGojo2=await page.evaluate(()=>window.__harness.skinUnlocked("gojo","gojo2"));
  check("level-5 skin (gojo2) LOCKED at baseline (makes the beta skin check meaningful)", baseGojo2===false);

  // ── BETA code (GojoV1) ─────────────────────────────────────────────────────
  section("BETA code (GojoV1) — roster filtered to sprite-having ONLY + full unlock");
  const ba=await applyCode("GojoV1");
  check('applyCode("GojoV1") → "beta"', ba.result==="beta" && ba.beta===true && ba.dev===false, `res=${ba.result} beta=${ba.beta} dev=${ba.dev}`);
  m=await menu();
  check("selectable roster EQUALS the live hasSprites set", sortJoin(m.selectable)===sortJoin(spriteSet), `got=${sortJoin(m.selectable)}`);
  check("exactly 7 characters selectable", m.selectable.length===7, `n=${m.selectable.length}`);
  // Explicit exclusions — the procedural-box characters the task named must be gone.
  for(const gone of ["vegeta","tanjiro","rickPrime","piccolo","killua"])
    check(`'${gone}' (no sprites) is NOT selectable`, !m.selectable.includes(gone));
  // Explicit inclusions — the sprite characters must all be present.
  for(const has of ["gojo","sukuna","megumi","toji","naruto","sasuke","goku"])
    check(`'${has}' (has sprites) IS selectable`, m.selectable.includes(has));
  check("only sprite-having universes shown", sortJoin(m.universes)===sortJoin([...new Set(spriteSet.map(k=>({gojo:"jujutsu_kaisen",megumi:"jujutsu_kaisen",sukuna:"jujutsu_kaisen",toji:"jujutsu_kaisen",naruto:"naruto",sasuke:"naruto",goku:"dragon_ball"}[k])))]), `universes=${sortJoin(m.universes)}`);
  section("BETA — full unlock scope (same as dev): Online + level-gated features + skins");
  check("ONLINE unlocked under beta", m.onlineLocked===false);
  check("Tower feature unlocked under beta", m.towerUnlocked===true);
  check("level-gated extraSkins unlocked under beta", m.extraSkinsUnlocked===true);
  // Direct skin unlock: gojo2 is unlockLevel 5 — locked at base level, must be OPEN under beta.
  const betaGojo2=await page.evaluate(()=>window.__harness.skinUnlocked("gojo","gojo2"));
  check("level-5 skin (gojo2) unlocked under beta", betaGojo2===true);

  // ── DEV code (Omololu) — REGRESSION: everything unlocked, NO character filter ─
  section("DEV code (Omololu) REGRESSION — full unlock, NO character filtering");
  await load();   // fresh page → unlock flags reset
  let m0=await menu();
  check("fresh page has no unlocks", m0.beta===false && m0.dev===false);
  const da=await applyCode("Omololu");
  check('applyCode("Omololu") → "dev"', da.result==="dev" && da.dev===true && da.beta===false, `res=${da.result} dev=${da.dev} beta=${da.beta}`);
  m=await menu();
  check("DEV shows the FULL roster (NOT sprite-filtered)", sortJoin(m.selectable)===sortJoin(gt.all), `n=${m.selectable.length}`);
  check("DEV roster INCLUDES non-sprite characters (e.g. vegeta, tanjiro)", m.selectable.includes("vegeta") && m.selectable.includes("tanjiro"));
  check("DEV roster is strictly larger than the beta sprite set", m.selectable.length>7, `n=${m.selectable.length}`);
  check("DEV also unlocks ONLINE", m.onlineLocked===false);

  // ── The two are independent (beta didn't couple into dev, dev didn't filter) ─
  section("Independence — beta filters, dev does not; neither couples to the other");
  await load();
  await applyCode("GojoV1");
  const betaOnly=await menu();
  check("beta-only: filtered to 7", betaOnly.selectable.length===7 && betaOnly.dev===false);
  await load();
  await applyCode("Omololu");
  const devOnly=await menu();
  check("dev-only: unfiltered full roster", devOnly.selectable.length===gt.all.length && devOnly.beta===false);

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,4).join(" | "));
}catch(e){console.error("ERR",e);FAIL++;try{await page.screenshot({path:path.join(OUT,"BETA_ERR.png")});}catch{}}
finally{console.log(`\n════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════`);await b.close();server.close();process.exit(FAIL===0?0:1);}
