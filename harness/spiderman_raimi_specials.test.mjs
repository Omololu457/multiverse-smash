// harness/spiderman_raimi_specials.test.mjs — REAL in-game evidence that Spider-Man (Raimi)'s Stage-3/4
// web kit FIRES and behaves: Web Shot (neutral, procedural web-ball projectile) / Web Zip (Fwd, i-frame
// dive-kick gap-closer) / Spider-Sense Dodge (Back, FREE i-frame evade) / rising + low web-balls (U/D) /
// Web Cocoon ULT (shared web-net cinematic driven by _maxWebTimer → guaranteed scaled payoff). Drives the
// real dispatch via the generic p1Spec(dir)/p1Ult() probes (energy refilled + direction stamped), then reads
// live state (projectiles/invulnTimer/energy/health). Also screenshots each cast for visual QA.
// Usage: node harness/spiderman_raimi_specials.test.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
page.on("pageerror", e => console.log("  PAGEERR:", e.message));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let fail = 0; const ok = (c,m)=>{ console.log(`  ${c?"✅":"❌"} ${m}`); if(!c) fail++; };

console.log("── boot: spiderman_raimi vs jason ──");
await page.goto(`${base}/index.html?harness=1&p1=spiderman_raimi&p2=jason`, { waitUntil:"load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await page.waitForFunction(() => window.__harness.state && window.__harness.state().frame > 8, null, { timeout:15000, polling:16 });
const p1 = await page.evaluate(() => window.__harness.p1());
ok(p1 && p1.key === "spiderman_raimi", `p1 is spiderman_raimi (key=${p1?.key})`);
ok(p1 && p1.maxEnergy === 160, `web_fluid pool present (maxEnergy=${p1?.maxEnergy})`);

// helper: fire a special via the real dispatch, step frames for the scheduled projectile spawn, read state.
const spec = (dir) => page.evaluate(async (d) => {
  const h = window.__harness;
  const before = h.projectiles().length;
  const r = h.brutality.p1Spec(d);              // refills energy + stamps _specialHeldDir + triggerSpecial
  const atCast = h.p1();                         // read i-frames/energy AT cast (before they tick down)
  const eAfter = atCast.energy, invuln = atCast.invulnTimer;
  // advance ~16 frames so schedulePendingSpawn(wind) fires and the projectile exists on-field
  await new Promise(res => { let n=0; const id=setInterval(()=>{ if(++n>=16){clearInterval(id);res();} },16); });
  return { ok:r?.ok, move:r?.move, projBefore:before, projAfter:h.projectiles().length,
           energyAfter:eAfter, invuln, maxEnergy:atCast.maxEnergy,
           projs: h.projectiles().map(p=>({vx:Math.round(p.vx||0), vy:Math.round(p.vy||0)})) };
}, dir);

console.log("── neutral: Web Shot (procedural web-ball projectile) ──");
let r = await spec(null);
ok(r.ok === true, `neutral special fired (ok=${r.ok})`);
ok(r.projAfter > r.projBefore, `Web Shot spawned a projectile (${r.projBefore}→${r.projAfter})`);
ok(r.energyAfter < r.maxEnergy, `Web Shot spent web_fluid (energy ${r.energyAfter}/${r.maxEnergy})`);
await page.screenshot({ path: path.join(OUT, "raimi_webshot.png") });

console.log("── Fwd: Web Zip (i-frame dive-kick gap-closer) ──");
r = await spec("F");
ok(r.ok === true, `Fwd special fired (ok=${r.ok}, move=${r.move})`);
ok(r.invuln > 0, `Web Zip granted i-frames (invulnTimer=${r.invuln})`);
await page.screenshot({ path: path.join(OUT, "raimi_webzip.png") });

console.log("── Back: Spider-Sense Dodge (FREE i-frame evade) ──");
r = await spec("B");
ok(r.ok === true, `Back special fired (ok=${r.ok})`);
ok(r.invuln > 0, `Spider-Sense granted i-frames (invulnTimer=${r.invuln})`);
ok(r.energyAfter === r.maxEnergy, `Spider-Sense is FREE (energy stayed ${r.energyAfter}/${r.maxEnergy})`);
await page.screenshot({ path: path.join(OUT, "raimi_spidersense.png") });

console.log("── Up: rising web-ball ──");
r = await spec("U");
ok(r.ok === true && r.projAfter > r.projBefore, `Up Web Shot spawned a rising projectile (ok=${r.ok})`);
ok(r.projs.some(p => p.vy < 0), `a projectile rises (vy<0): ${JSON.stringify(r.projs)}`);

console.log("── Down: low Web Sweep ──");
r = await spec("D");
ok(r.ok === true && r.projAfter > r.projBefore, `Down Web Sweep spawned a low projectile (ok=${r.ok})`);

console.log("── ULT: Web Cocoon (shared web-net cinematic + guaranteed payoff) ──");
const ult = await page.evaluate(async () => {
  const h = window.__harness;
  const hpBefore = h.p2().health;
  const cast = h.brutality.p1Ult();               // refills energy + clears ult cd + triggerUltimate
  const t0 = h.spidermanMaxWeb().timer;           // _maxWebTimer (raimi reuses the shared overlay driver)
  // step ~26 frames to the middle of the cinematic (web-net growing over the frozen foe) for the money shot
  await new Promise(res => { let n=0; const id=setInterval(()=>{ if(++n>=26){clearInterval(id);res();} },16); });
  return { cast, timerAtCast:t0, hpBefore, midTimer:h.spidermanMaxWeb().timer, renders:h.spidermanMaxWeb().renders };
});
ok(ult.cast === true, `Web Cocoon ult cast (cast=${ult.cast})`);
ok(ult.timerAtCast > 0, `web-net cinematic engaged (_maxWebTimer=${ult.timerAtCast})`);
await page.screenshot({ path: path.join(OUT, "raimi_ult.png") });   // MID-cinematic — web-net cocoon overlay
// run the rest of the cinematic out (payoff at frame 52 of 84) and confirm the guaranteed damage landed
const hpAfter = await page.evaluate(async () => { await new Promise(res => { let n=0; const id=setInterval(()=>{ if(++n>=50){clearInterval(id);res();} },16); }); return window.__harness.p2().health; });
ok(ult.renders > 0, `web-net overlay actually rendered (renders=${ult.renders})`);
ok(hpAfter < ult.hpBefore, `ult dealt guaranteed damage (${ult.hpBefore}→${hpAfter})`);

await page.evaluate(() => { const e = window.__harness._pageErrors; }); // noop
await browser.close(); server.close();
console.log(fail ? `\n❌ ${fail} check(s) failed` : "\n✅ all Raimi special/ult checks passed");
process.exit(fail ? 1 : 0);
