// harness/billy_diag.mjs — CONCRETE input diagnosis for ghostface_billy.
// Answers: does movement work? does each attack CONNECT and do real damage/hitstun to an opponent?
// Reports exactly what responds to input. Usage: node harness/billy_diag.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((q,res)=>{ const u=decodeURIComponent(q.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless:true, args:["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport:{ width:1280, height:720 } });
page.on("pageerror", e => console.log("  PAGEERR:", e.message));
page.on("console", m => { const t=m.text(); if(/error|not a function|undefined is not/i.test(t)) console.log("  CONSOLE:", t); });
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const P1 = () => page.evaluate(() => window.__harness.p1());
const P2 = () => page.evaluate(() => window.__harness.p2());
const hold = async (k, ms) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };

await page.goto(`${base}/index.html?harness=1&p1=ghostface_billy&p2=jason`, { waitUntil:"load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await page.waitForFunction(() => window.__harness.state && window.__harness.state().frame > 8, null, { timeout:15000, polling:16 });

let p1 = await P1(), p2 = await P2();
console.log(`spawn: Billy x=${p1.x?.toFixed(0)} hp=${p1.health}  |  dummy(${p2.key}) x=${p2.x?.toFixed(0)} hp=${p2.health}`);
console.log(`Billy renders art? (has anim state, not a null fighter): ${!!p1.key}`);

// ── MOVEMENT ──
console.log("\n── MOVEMENT ──");
let x0 = p1.x; await hold("d", 300); p1 = await P1();
console.log(`  hold RIGHT (d): x ${x0.toFixed(0)} → ${p1.x.toFixed(0)}  Δ=${(p1.x-x0).toFixed(0)}  → ${Math.abs(p1.x-x0)>5?"MOVES ✅":"NO RESPONSE ❌"}`);
x0 = p1.x; await hold("a", 300); p1 = await P1();
console.log(`  hold LEFT (a):  x ${x0.toFixed(0)} → ${p1.x.toFixed(0)}  Δ=${(p1.x-x0).toFixed(0)}  → ${Math.abs(p1.x-x0)>5?"MOVES ✅":"NO RESPONSE ❌"}`);
let g0 = p1.grounded, y0 = p1.y; await page.keyboard.down("w"); await sleep(90); const air = await P1(); await page.keyboard.up("w");
console.log(`  JUMP (w): grounded ${g0} → ${air.grounded}, y ${y0.toFixed(0)} → ${air.y.toFixed(0)}  → ${(!air.grounded||air.y<y0-5)?"JUMPS ✅":"NO RESPONSE ❌"}`);
await sleep(600); // land

// ── close the distance so attacks are in range ──
p1 = await P1(); p2 = await P2();
let guard = 0;
while (Math.abs((await P1()).x - (await P2()).x) > 70 && guard++ < 20) { await hold("d", 120); }
p1 = await P1(); p2 = await P2();
console.log(`\nclosed distance: gap=${Math.abs(p1.x-p2.x).toFixed(0)}px  (Billy x=${p1.x.toFixed(0)}, dummy x=${p2.x.toFixed(0)})`);

// ── ATTACKS: does each CONNECT (dummy hp drops / hitstun)? ──
console.log("\n── ATTACKS (does it connect & do something to the dummy?) ──");
async function tryAttack(name, keys) {
  // re-close if drifted
  let g=0; while (Math.abs((await P1()).x - (await P2()).x) > 78 && g++ < 12) { await hold("d", 100); }
  const before = await P2();
  for (const k of keys) await page.keyboard.down(k);
  await sleep(70);
  for (const k of [...keys].reverse()) await page.keyboard.up(k);
  await sleep(220);
  const after = await P2();
  const dmg = (before.health - after.health);
  const hs = after.hitstun || 0;
  const connected = dmg > 0 || hs > 0;
  console.log(`  ${name.padEnd(22)} dummy hp ${before.health.toFixed(0)}→${after.health.toFixed(0)} (Δ${dmg>0?"-"+dmg.toFixed(0):"0"}), hitstun=${hs}  → ${connected?"CONNECTS ✅":"NO EFFECT ❌"}`);
  await sleep(250);
  return connected;
}
await tryAttack("light (j)", ["j"]);
await tryAttack("heavy (k)", ["k"]);
await tryAttack("upAttack (i)", ["i"]);
// SPECIAL: Fwd + special (Gutting Lunge) — bleed on connect
{
  let g=0; while (Math.abs((await P1()).x - (await P2()).x) > 78 && g++ < 12) { await hold("d", 100); }
  const eB = (await P1()).energy, hB = (await P2()).health;
  await page.keyboard.down("d"); await sleep(180); await page.keyboard.down("l"); await sleep(80); await page.keyboard.up("l"); await page.keyboard.up("d");
  await sleep(400);
  const eA = (await P1()).energy, hA = (await P2()).health;
  console.log(`  special Gutting Lunge   Dread ${eB.toFixed(0)}→${eA.toFixed(0)} (fired=${eA<eB-20}), dummy hp ${hB.toFixed(0)}→${hA.toFixed(0)} (Δ${(hB-hA)>0?"-"+(hB-hA).toFixed(0):"0"})  → ${(hB-hA)>0?"CONNECTS ✅":(eA<eB-20?"fired, whiffed/ranged":"NO FIRE ❌")}`);
}
await browser.close(); server.close();
