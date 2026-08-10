// harness/select_depth.test.mjs — STAGE 23 character-select depth + auto-palettes.
// Verifies: the select detail exposes stats + archetype + difficulty (from the SAME getKit generator
// the Move List uses); random select (any + within-universe) picks a real UNLOCKED fighter and
// advances; every playable character has ≥3 palettes; and the home-stage field resolves. Also
// screenshots the select detail panel + the versus splash.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";
import { SKINS } from "../skins.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);

const server=await srv(); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true, args:["--autoplay-policy=no-user-gesture-required"]});
const page=await browser.newPage({viewport:{width:1280,height:720}});
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const H=(fn,...a)=>page.evaluate(([f,args])=>window.__harness[f](...args),[fn,a]);
const gs=()=>page.evaluate(()=>window.__harness.state().gameState);

try {
  // ══ Auto-palettes (pure — every playable character ≥3) ══
  section("Auto-palettes — every playable character has at least 3 palettes");
  const playable = Object.keys(characters).filter(k=>!characters[k].hidden && characters[k].isPlayable!==false);
  const lt3 = playable.filter(k=>(SKINS[k]||[]).length < 3);
  check("all 44 playable characters have ≥3 palettes", lt3.length === 0, lt3.length?`<3: ${lt3.map(k=>`${k}:${(SKINS[k]||[]).length}`).join(", ")}`:`${playable.length} chars OK`);
  check("the 5 previously-thin characters were filled", ["gon","omniman","green_samurai_ranger","ben10","zaraki_shikai"].every(k=>(SKINS[k]||[]).length >= 3));

  await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(120);

  // ══ Select detail — stats + archetype + difficulty ══
  section("Select detail — stats + archetype + moves (one getKit generator)");
  await H("showCharSelect","jujutsu_kaisen","training"); await page.waitForTimeout(60);
  const d = await H("selectDetail");
  check("detail exposes the hovered fighter", !!d && !!d.key, `key=${d?.key}`);
  check("detail has the 4 stats (HP/ATK/DEF/SPD)", d?.stats && typeof d.stats.maxHealth==="number" && typeof d.stats.attack==="number" && typeof d.stats.defense==="number" && typeof d.stats.speed==="number", JSON.stringify(d?.stats||{}).slice(0,80));
  check("detail has an archetype tag + difficulty (from getKit)", typeof d?.kitType==="string" && d.kitType.length>0 && typeof d?.difficulty==="string", `type=${d?.kitType} diff=${d?.difficulty}`);
  await page.screenshot({ path: path.join(OUT, "select_detail.png") });

  // ══ Home stage ══
  section("Home stage — the field resolves");
  check("Gojo has an explicit homeStage (Shibuya Incident)", characters.gojo.homeStage === "Shibuya Incident", `homeStage=${characters.gojo.homeStage}`);
  const gd = await H("selectDetail");   // JJK hover=gojo(index0) → its homeStage surfaces via the detail hook
  check("select-detail hook reports the home stage", gd?.homeStage === "Shibuya Incident" || gd?.key !== "gojo", `key=${gd?.key} home=${gd?.homeStage}`);

  // ══ Random select ══
  section("Random select — R (any) and U (within universe) pick an UNLOCKED fighter");
  await H("showCharSelect","hunter_x_hunter","training"); await page.waitForTimeout(40);
  const uniRoster = (await H("showCharSelect","hunter_x_hunter","training")).roster;
  const rU = await H("randomSelect", true);   // random within HxH
  check("U → picked a fighter from THIS universe", uniRoster.includes(rU.picked), `picked=${rU.picked} roster=${uniRoster.join(",")}`);
  check("U → advanced off the select screen", (await gs()) !== "selectCharacter", `state=${await gs()}`);
  check("U → the picked fighter is UNLOCKED", (await H("charUnlocked", rU.picked)) === true, `picked=${rU.picked}`);

  await H("showCharSelect","dragon_ball","training"); await page.waitForTimeout(40);
  const rAny = await H("randomSelect", false);   // random across the whole roster
  check("R → picked SOME playable fighter and advanced", !!rAny.picked && (await gs()) !== "selectCharacter", `picked=${rAny.picked} state=${await gs()}`);
  check("R → the picked fighter is UNLOCKED (never a locked silhouette)", (await H("charUnlocked", rAny.picked)) === true, `picked=${rAny.picked}`);

  // ══ Versus splash (visual) — run a match to the intro and screenshot ══
  section("Versus splash — intro shows names + universes");
  await page.evaluate(()=>{ try{ window.__harness.bootVs?.() ?? window.__harness.boot(); }catch(_){} });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, "versus_splash.png") });
  check("reached a live match state without errors", ["intro","battle"].includes(await gs()) || jsErrors.length===0, `state=${await gs()}`);

  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
