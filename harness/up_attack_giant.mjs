// harness/up_attack_giant.mjs — LIVE verification of Up-Attack GIANT-form handling, in the real game.
// Enters Adult Gon (a genuine giant: canJump=false + _canvasHeightFrac grows body & hurtbox), then
// fires the real Up-Attack and confirms the planted-giant rule:
//   • the GIANT attacker stays GROUNDED (no self-pop — contradicts a planted giant),
//   • the ENEMY is still launched upward.
// (The giant-TARGET resist rule is proven deterministically in up_attack_roster.test.mjs.)
// Screenshot → harness/shots/upattack_gon_giant.png

import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
let pass=0, fail=0; const check=(n,c,e="")=>{ console.log(`  ${c?"✅":"❌"} ${n}${e?"  — "+e:""}`); c?pass++:fail++; };
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const adult = () => page.evaluate(() => window.__harness.gonAdultForm("p1"));
const wf = async n => { const s=(await st()).frame; await page.waitForFunction(([a,c])=>window.__harness.state().frame>=a+c,[s,n],{timeout:20000,polling:16}); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=gon&p2=cell`, { waitUntil:"load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot()); await wf(8);

  // Enter Adult Gon (ultimate). Wait out the growth cinematic.
  await page.evaluate(() => window.__harness.fillEnergy());
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u"); await wf(3);
  await page.waitForFunction(() => !window.__harness.adultFormCine().active, null, { timeout:12000, polling:16 }).catch(()=>{});
  await wf(3);

  const form = await adult(), gs = await p1();
  check("Adult Gon active (giant form)", form.active === true, `active=${form.active}`);
  check("giant is planted (canJump=false)", form.canJump === false, `canJump=${form.canJump}`);
  check("giant sizing applied (_canvasHeightFrac set)", !!gs.canvasHeightFrac, `frac=${gs.canvasHeightFrac}`);

  // Stand the dummy point-blank and fire the real Up-Attack (held so it fires when actionable).
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + (a.w||60) - 8); });
  await wf(1);
  const before = await p1();
  check("giant grounded before Up-Attack", before.grounded === true);

  await page.keyboard.down("i");
  await page.waitForFunction(() => { const b=window.__harness.p2(); return b && (b.isLaunched || !b.grounded); }, null, { timeout:4000, polling:4 }).catch(()=>{});
  const ga = await p1(), gb = await p2();
  await page.keyboard.up("i");

  check("PLANTED GIANT stays GROUNDED after Up-Attack (no self-pop)", ga.grounded === true, `giant grounded=${ga.grounded} vy=${ga.vy?.toFixed?.(2)}`);
  check("enemy still LAUNCHED upward by the planted giant", gb.grounded === false || gb.isLaunched, `enemy grounded=${gb.grounded} vy=${gb.vy?.toFixed?.(2)} launched=${gb.isLaunched}`);
  await page.screenshot({ path: path.join(OUT, "upattack_gon_giant.png") }).then(()=>console.log("  📸 upattack_gon_giant.png"));
} catch (e) {
  check("giant harness ran without throwing", false, e.message);
} finally {
  await page.close(); await browser.close(); server.close();
}
console.log(`\n════════════════════════════════════════`);
console.log(`  UP-ATTACK GIANT (live): ${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════════════`);
process.exit(fail ? 1 : 0);
