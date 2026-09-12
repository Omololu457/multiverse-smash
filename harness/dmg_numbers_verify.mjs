// harness/dmg_numbers_verify.mjs — FLOATING DAMAGE NUMBERS (Track A polish), LIVE proof.
// The popup system already existed; this pass added (a) TIER-SCALED font size that reuses the
// impact-FX palette/tiers (light 20 / heavy 26 / special 30 / ultimate 36, each bolder than a jab)
// and (b) COMBO-OFFSET stacking so a string's numbers fan out instead of piling on one pixel.
// This drives REAL key input, reads window.__harness.dmgNumbers() + .sparks(), and asserts:
//   • a landed hit's number size matches its spark's impact-FX tier,
//   • light < heavy in size,
//   • a combo string produces multiple numbers at DISTINCT, legibly-spaced x positions.
// Run: `node harness/dmg_numbers_verify.mjs`.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "dmg_num_out"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res) => { const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
const errs = []; page.on("pageerror", e => errs.push(String(e)));
let PASS=0, FAIL=0; const check=(n,c,d="")=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"}  ${n}${d?`  — ${d}`:""}`); };
const dmg    = () => page.evaluate(() => window.__harness.dmgNumbers());
const sparks = () => page.evaluate(() => window.__harness.sparks());
async function waitFrames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:15000,polling:16}).catch(()=>{}); }
async function recenter(gap){ const arena=await page.evaluate(()=>window.__harness.arena()); await page.evaluate(x=>window.__harness.setP1X(x),Math.round(arena.left+arena.width*0.45)); const a=await page.evaluate(()=>window.__harness.p1()); await page.evaluate(x=>window.__harness.setP2X(x),a.x+gap); await waitFrames(2); }
// press a key, poll until the damageNumbers array grows past `before`, return the NEW numbers + latest spark cat
async function landHit(key, before, timeoutFrames=44){
  await page.keyboard.down(key);
  let grew=null, cat=null;
  for(let i=0;i<timeoutFrames;i++){
    const cur=await dmg();
    if(cur.length>before){ grew=cur.slice(before); const sp=(await sparks()); cat=sp.length?sp[sp.length-1].category:null; break; }
    await waitFrames(1);
  }
  await page.keyboard.up(key);
  return { grew, cat };
}
const SIZE = { light:20, heavy:26, special:30, ultimate:36 };

try {
  // Ippo: melee-only boxer (no projectiles) → isolates the game.js melee spawnDamageNumber path cleanly.
  await page.goto(`${base}/index.html?harness=1&p1=ippo&p2=ippo`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => window.__harness.setDummyBehavior?.("stand"));
  await waitFrames(6);
  const clean = async () => { await page.evaluate(()=>{ window.__harness.healP2?.(); window.__harness.clearProjectiles?.(); }); };

  check("dmgNumbers harness hook present", typeof (await dmg()) === "object");

  // ── LIGHT ──
  console.log("\n─── light hit ───");
  await clean(); await recenter(36); await waitFrames(2);
  let base0 = (await dmg()).length;
  let r = await landHit("j", base0);
  const lightNum = r.grew && r.grew[0];
  check("light: exactly ONE number per hit (no double-render)", r.grew && r.grew.length === 1, `count=${r.grew?.length}`);
  check("light: a damage number spawned", !!lightNum, lightNum?`text=${lightNum.text} size=${lightNum.fontSize}`:"none");
  check("light: number size matches its impact-FX tier", !!lightNum && lightNum.fontSize === SIZE[r.cat || "light"], `cat=${r.cat} size=${lightNum?.fontSize}`);
  const lightSize = lightNum?.fontSize || 0;
  await waitFrames(30);

  // ── HEAVY ── (ippo's heavy is Fwd+Heavy → hold forward while pressing k; retry for playwright jitter)
  console.log("\n─── heavy hit ───");
  let heavyNum=null, heavyCat=null;
  for (let attempt=0; attempt<5 && !heavyNum; attempt++) {
    await clean(); await recenter(34); await waitFrames(2);
    base0 = (await dmg()).length;
    await page.keyboard.down("d");
    r = await landHit("k", base0, 40);
    await page.keyboard.up("d");
    if (r.grew && r.grew[0]) { heavyNum = r.grew[0]; heavyCat = r.cat; }
    await waitFrames(20);
  }
  check("heavy: a damage number spawned", !!heavyNum, heavyNum?`text=${heavyNum.text} size=${heavyNum.fontSize} cat=${heavyCat}`:"none");
  check("heavy: number size matches its impact-FX tier", !!heavyNum && heavyNum.fontSize === (SIZE[heavyCat] || 22), `cat=${heavyCat} size=${heavyNum?.fontSize}`);
  check("heavy reads BIGGER than light", (heavyNum?.fontSize||0) > lightSize, `heavy=${heavyNum?.fontSize} light=${lightSize}`);
  await waitFrames(30);

  // ── SPECIAL ──
  console.log("\n─── special ───");
  await clean(); await recenter(40); await waitFrames(2);
  base0 = (await dmg()).length;
  r = await landHit("l", base0, 60);
  const spNum = r.grew && r.grew[0];
  check("special: a damage number spawned", !!spNum, spNum?`text=${spNum.text} size=${spNum.fontSize} cat=${r.cat}`:"none");
  check("special: reads larger than a light jab", (spNum?.fontSize||0) >= lightSize, `size=${spNum?.fontSize} light=${lightSize}`);
  await waitFrames(40);

  // ── ULTIMATE ── (Zaraki: his Bankai/Shikai ult is a MELEE isUltimate move → emits an 'ultimate'-tier
  // spark, unlike ippo's freeze-cinematic ult which deals damage without a categorized spark. Second
  // boot proves the top tier's size/color live.)
  console.log("\n─── ultimate (zaraki melee ult) ───");
  await page.goto(`${base}/index.html?harness=1&p1=zaraki&p2=zaraki`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => window.__harness.setDummyBehavior?.("stand"));
  await waitFrames(6);
  let ultNum=null, ultCat=null;
  for (let attempt=0; attempt<3 && !ultNum; attempt++) {
    await page.evaluate(()=>{ const p=window.__harness.p1(); window.__harness.setEnergy?.(p.maxEnergy||200); window.__harness.resetUlt?.(); window.__harness.healP2?.(); });
    await recenter(34); await waitFrames(2);
    base0 = (await dmg()).length;
    r = await landHit("u", base0, 200);
    if (r.grew && r.grew[0]) { ultNum = r.grew.find(n=>n.fontSize===SIZE.ultimate) || r.grew[0]; ultCat = r.cat; }
    await waitFrames(30);
  }
  check("ultimate: a damage number spawned", !!ultNum, ultNum?`text=${ultNum.text} size=${ultNum.fontSize} color=${ultNum.color}`:"none");
  check("ultimate: number is the ULTIMATE tier (36px, red #ef4444)", !!ultNum && ultNum.fontSize === SIZE.ultimate && ultNum.color === "#ef4444", `size=${ultNum?.fontSize} color=${ultNum?.color}`);
  check("ultimate reads BIGGER than a light jab", (ultNum?.fontSize||0) > lightSize, `ult=${ultNum?.fontSize} light=${lightSize}`);
  await waitFrames(20);

  // back to ippo for the combo-offset section
  await page.goto(`${base}/index.html?harness=1&p1=ippo&p2=ippo`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => window.__harness.setDummyBehavior?.("stand"));
  await waitFrames(6);

  // ── COMBO STACKING (offset legibility) ──
  // The fan is a function of the attacker's comboCounter at spawn time. Land the SAME jab at the SAME
  // spot (same spark x), but with an escalating combo count each time → the numbers must land at
  // DISTINCT, legibly-spaced x positions instead of piling on one pixel. This deterministically proves
  // the offset without fighting combo-window timing.
  console.log("\n─── combo string: offset stacking ───");
  const xs = [];
  for (const n of [1,2,3,4]) {
    await clean(); await recenter(36); await waitFrames(2);
    await page.evaluate(nn=>window.__harness.setCombo?.("p1", nn), n);
    base0 = (await dmg()).length;
    r = await landHit("j", base0);
    if (r.grew && r.grew[0]) xs.push(Math.round(r.grew[0].x));
    await waitFrames(18);
  }
  const distinct = new Set(xs).size;
  check("combo: a number landed at each combo count", xs.length === 4, `landed=${xs.length}`);
  check("combo: numbers occupy DISTINCT x positions (fanned, not stacked)", distinct >= 3, `xs=[${xs.join(",")}] distinct=${distinct}`);
  let maxGap = 0; for (let i=0;i<xs.length;i++) for (let j=i+1;j<xs.length;j++) maxGap=Math.max(maxGap, Math.abs(xs[i]-xs[j]));
  check("combo: fan spread is legibly wide (≥10px)", maxGap >= 10, `maxGap=${maxGap}`);
  await page.screenshot({ path: path.join(OUT, "combo_numbers.png") });

  check("no JS errors", errs.length === 0, errs[0] || "");
} catch (e) {
  console.log("FATAL", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  DAMAGE NUMBERS (Track A): ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
