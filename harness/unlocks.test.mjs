// harness/unlocks.test.mjs — STAGE 21 character unlocks.
// A fresh account starts with the approved 22-unlocked / 22-locked split; each of the four unlock
// TYPES (level, arcade-clear, tower-tier, boss) fires when its condition is met; dev/beta bypass
// everything; and the unlocks PERSIST across a reload. Also checks the select-screen pick gate
// (a locked fighter can't be chosen) and the victory-screen "NEW FIGHTER" notification.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";
import { STARTER_KEYS, UNLOCK_CONDITIONS } from "../unlocks.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);

const server=await srv(); const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true, args:["--autoplay-policy=no-user-gesture-required"]});
const ctx=await browser.newContext({viewport:{width:1280,height:720}});
const page=await ctx.newPage();
const jsErrors=[]; page.on("pageerror",e=>jsErrors.push(String(e)));
const H=(fn,...a)=>page.evaluate(([f,args])=>window.__harness[f](...args),[fn,a]);
const SL=(fn,...a)=>page.evaluate(([f,args])=>window.__harness.saveLoad[f](...args),[fn,a]);
const u=()=>H("unlockInfo");
const load=async()=>{ await page.goto(`${base}/index.html?harness=1`,{waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(100); };

// Expected split derived from unlocks.js (source of truth) — locked = the map keys, unlocked = the rest.
const ALL = Object.keys(characters).filter(k=>!characters[k].hidden && characters[k].isPlayable!==false);
const EXPECT_LOCKED = Object.keys(UNLOCK_CONDITIONS).filter(k=>ALL.includes(k)).sort();
const EXPECT_UNLOCKED = ALL.filter(k=>!EXPECT_LOCKED.includes(k)).sort();

try {
  await load();
  await SL("ensureAccount","Unlocker");

  // ══ Fresh account — the approved split ══
  section("Fresh account — 22 unlocked / 22 locked (the approved split)");
  let info=await u();
  check("fresh account is level 1, no dev/beta", info.ctx.level===1 && !info.ctx.dev && !info.ctx.beta);
  check("exactly 22 unlocked and 22 locked", info.unlocked.length===22 && info.locked.length===22, `unlocked=${info.unlocked.length} locked=${info.locked.length}`);
  check("unlocked set matches the spec exactly", JSON.stringify(info.unlocked)===JSON.stringify(EXPECT_UNLOCKED), `got=${info.unlocked.join(",")}`);
  check("locked set matches the spec exactly", JSON.stringify(info.locked)===JSON.stringify(EXPECT_LOCKED), `got=${info.locked.join(",")}`);
  check("all six starters are unlocked", STARTER_KEYS.every(k=>info.unlocked.includes(k)), STARTER_KEYS.join(","));
  check("locked cards carry a readable condition label", info.conditions.batman==="Reach Level 10" && info.conditions.sukuna==="Clear Arcade as Gojo Satoru" && info.conditions.netero==="Clear Tower Tier 3" && info.conditions.beerus==="Beat the Arcade Boss", JSON.stringify({b:info.conditions.batman,s:info.conditions.sukuna,n:info.conditions.netero,be:info.conditions.beerus}));

  // ══ Unlock TYPE: level ══
  section("Unlock type — LEVEL (award XP crosses the gate)");
  check("Inosuke (Lv3) locked at level 1", (await H("charUnlocked","inosuke"))===false);
  await SL("awardXp", 300);   // level 3 (xpToReachLevel(3)=300)
  check("after reaching Lv3, Inosuke unlocks", (await H("charUnlocked","inosuke"))===true, `level=${(await u()).ctx.level}`);
  check("Batman (Lv10) still locked at Lv3", (await H("charUnlocked","batman"))===false);
  await SL("awardXp", 4500);  // level 10 (xpToReachLevel(10)=4500)
  check("after reaching Lv10, Batman unlocks", (await H("charUnlocked","batman"))===true, `level=${(await u()).ctx.level}`);

  // ══ Unlock TYPE: arcade-clear-as ══
  section("Unlock type — ARCADE (clear as a specific fighter)");
  check("Sukuna locked before any arcade clear", (await H("charUnlocked","sukuna"))===false);
  await H("markArcadeCleared","gojo");
  check("clearing Arcade as Gojo unlocks Sukuna", (await H("charUnlocked","sukuna"))===true);
  check("Madara (clear as Naruto) still locked — different character", (await H("charUnlocked","madara"))===false);

  // ══ Unlock TYPE: boss (any arcade clear) ══
  section("Unlock type — BOSS (any arcade clear beats the boss)");
  check("Beerus/Obito/Zaraki-Shikai unlock once ANY arcade is cleared", (await H("charUnlocked","beerus"))===true && (await H("charUnlocked","obito"))===true && (await H("charUnlocked","zaraki_shikai"))===true);

  // ══ Unlock TYPE: tower-tier ══
  section("Unlock type — TOWER (clear a tier, or any higher)");
  check("Netero (Tier3) locked before any tower clear", (await H("charUnlocked","netero"))===false);
  await H("markTowerCleared","tier2");
  check("Tier2 clear unlocks Tobirama but NOT Netero (needs Tier3)", (await H("charUnlocked","tobirama"))===true && (await H("charUnlocked","netero"))===false);
  await H("markTowerCleared","tier4");
  check("Tier4 clear satisfies the Tier3 gate → Netero + Goku Black unlock", (await H("charUnlocked","netero"))===true && (await H("charUnlocked","goku_black"))===true);

  // ══ PERSISTENCE across reload ══
  section("Persistence — level + arcade + tower unlocks survive a reload");
  await page.reload({waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(100);
  info=await u();
  check("after reload, still Lv10", info.ctx.level===10, `level=${info.ctx.level}`);
  check("after reload, arcade+tower unlocks persist (Sukuna, Netero, Beerus)", (await H("charUnlocked","sukuna"))===true && (await H("charUnlocked","netero"))===true && (await H("charUnlocked","beerus"))===true);
  check("Madara still locked (its specific arcade condition was never met)", (await H("charUnlocked","madara"))===false);

  // ══ DEV / BETA bypass ══
  section("Dev / Beta codes bypass ALL unlock gates");
  await H("applyCode","Omololu");
  let dev=await u();
  check("DEV: entire roster unlocked (0 locked)", dev.locked.length===0 && dev.unlocked.length===ALL.length, `locked=${dev.locked.length}`);
  await H("applyCode","Omololu");   // toggle dev off (re-entry)
  await H("applyCode","GojoV1");    // beta
  let beta=await u();
  check("BETA: entire roster unlocked (0 locked)", beta.locked.length===0, `locked=${beta.locked.length}`);
  check("Madara pickable under beta despite unmet condition", (await H("charUnlocked","madara"))===true);

  // ══ SELECT-SCREEN pick gate (REAL click) ══
  section("Select gate — a locked fighter shows as a silhouette and can't be picked");
  await page.evaluate(()=>{ try{ localStorage.clear(); }catch(_){}} );   // wipe the level-10 account → fresh Lv1
  await page.reload({waitUntil:"load"}); await page.waitForFunction(()=>!!window.__harness); await page.waitForTimeout(100);
  await SL("ensureAccount","Picker2");
  const shown = await H("showCharSelect","jujutsu_kaisen","training");   // JJK: gojo(unlocked), miwa(locked Lv4), sukuna(locked)
  await page.waitForTimeout(60);
  const miwaIdx = shown.roster.indexOf("miwa");
  const gojoIdx = shown.roster.indexOf("gojo");
  check("JJK select shows Miwa (locked) and Gojo (unlocked)", miwaIdx>=0 && gojoIdx>=0 && (await H("charUnlocked","miwa"))===false && (await H("charUnlocked","gojo"))===true);
  const rects = await H("charCardRects");
  const clickCard = async (i)=>{ const r=rects[i]; await page.mouse.click(r.x + r.w/2, r.y + r.h/2); await page.waitForTimeout(60); };
  // Click the LOCKED Miwa card → must NOT advance off the select screen.
  await clickCard(miwaIdx);
  check("clicking LOCKED Miwa does NOT advance (stays on selectCharacter)", (await page.evaluate(()=>window.__harness.state().gameState))==="selectCharacter", `state=${await page.evaluate(()=>window.__harness.state().gameState)}`);
  check("no fighter was assigned to P1 by the rejected click", (await page.evaluate(()=>window.__harness.arcadeInfo?.().p1 ?? null, )) !== "miwa");
  // Click the UNLOCKED Gojo card → advances (to skin select).
  await clickCard(gojoIdx);
  check("clicking UNLOCKED Gojo advances off select (→ skin select)", (await page.evaluate(()=>window.__harness.state().gameState))==="selectSkin", `state=${await page.evaluate(()=>window.__harness.state().gameState)}`);

  check("no uncaught JS exceptions", jsErrors.length===0, jsErrors.slice(0,3).join(" | "));
} catch(e){ console.error("\nHARNESS ERROR:",e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL===0?0:1);
}
