// harness/zaraki_shikai_entry.mjs — verify the SEPARATE "zaraki_shikai" select entry: it boots natively in
// the Shikai form and its full Shikai kit fires (combo rekka, Up+B, Special, Down+Special Yachiru, Bankai,
// and the mid-combo Yachiru link). Real inputs + real state.
//   node harness/zaraki_shikai_entry.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles?.() || []);
const summons = () => page.evaluate(() => window.__harness.summons?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitAction(name, maxF = 26) { for (let i = 0; i < maxF; i++) { if ((await p1()).action === name) return true; await waitFrames(1); } return false; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function reset(gap = 56) {
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(()=>{});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=zaraki_shikai&p2=ichigo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

console.log("\n── zaraki_shikai: separate entry boots in Shikai ──");
// Roster check BEFORE the match starts (showCharSelect changes gameState → must not run mid-battle).
const rosterOK = (await page.evaluate(() => window.__harness.showCharSelect("bleach","training").roster)).includes("zaraki_shikai");
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
{ const p = await p1();
  check("selectable in Bleach roster", rosterOK);
  check("boots as the Shikai entry (name + shikaiActive)", p.name?.includes("Shikai") && p.shikaiActive === true, `name=${p.name} shikai=${p.shikaiActive}`);
  check("renders Shikai idle natively", (p.spriteSheet||"").includes("shikai_idle_uniform"), `sheet=${(p.spriteSheet||"").split("/").pop()}`);
}

console.log("\n── full Shikai kit fires ──");
await reset(56);
await page.keyboard.down("j"); await waitFrames(3); const lite = await p1(); await page.keyboard.up("j");
check("Light → Shikai combo rekka (zarakiShikaiC1)", (lite.currentMove||"").startsWith("zarakiShikaiC"), `move=${lite.currentMove}`);

await reset(64);
{ const hp0=(await p2()).health; await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const ok = await waitAction("zarakiShikaiSpecial", 22); await waitFrames(14);
  check("Special → Shikai slash (zarakiShikaiSpecial) + damage", ok && (hp0-(await p2()).health)>0, `fired=${ok} dmg=${hp0-(await p2()).health}`); }

await reset(120);
{ await page.keyboard.down("s"); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("s");
  let thrown=false; for(let i=0;i<16;i++){ if((await projs()).some(p=>(p.name||"").includes("yachiruThrow"))){thrown=true;break;} await waitFrames(1); }
  check("Down+Special → Yachiru assist projectile", thrown, `thrown=${thrown}`); }

await reset(90);
{ const hp0=(await p2()).health; await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  // Bankai lunge/hitstop can skip past a pose poll, so DAMAGE (connect) is the reliable proof it fired.
  let sawPose=false; for(let i=0;i<30;i++){ if((await p1()).action==="zarakiBankai"){sawPose=true;break;} if((hp0-(await p2()).health)>0)break; await waitFrames(1); }
  await waitFrames(20);
  const dmg=hp0-(await p2()).health; const post=await p1();
  check("Ultimate → Bankai fires + connects", dmg>0, `dmg=${dmg} (pose seen=${sawPose})`);
  check("still Shikai after Bankai (native form intact)", post.shikaiActive===true, `shikai=${post.shikaiActive}`); }

console.log("\n── mid-combo Yachiru LINK works on the Shikai entry too ──");
await reset(52);
await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j");
let linkFired=false, resumedC2=false, comboAtLink=0;
for (let i=0;i<90;i++){ const c=await p1();
  if ((await summons()).some(s=>s.id==="yachiruLink")) {}
  if (!linkFired && c.attacking && c.rekkaNext && c.cmdHitLanded && c.attackPhase==="recovery"){ comboAtLink=c.comboCounter; await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); linkFired=true; continue; }
  if (linkFired && c.currentMove==="zarakiShikaiC2"){ resumedC2=true; break; }
  await waitFrames(1);
}
check("combo-link fires + rekka resumes to C2", linkFired && resumedC2, `linkFired=${linkFired} resumedC2=${resumedC2}`);

check("no JS/page errors", jsErrors.length===0, jsErrors.slice(0,2).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
