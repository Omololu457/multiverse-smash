// harness/billy_shots.mjs — REAL in-game evidence that "Billy Ghostface" (ghostface_billy) is
// registered: (1) he appears in the character-select grid, (2) he's playable in a live match.
// Usage: node harness/billy_shots.mjs
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

// ── PART 1 — CHARACTER SELECT: Billy appears in the horror-universe grid ──
console.log("── character-select ──");
await page.goto(`${base}/index.html?harness=1`, { waitUntil:"load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
await page.mouse.click(640, 360);                     // dismiss title / enable audio
await sleep(250);
const roster = await page.evaluate(() => window.__harness.gotoCharacterSelect("horror"));
console.log("  horror grid roster:", JSON.stringify(roster));
ok(Array.isArray(roster) && roster.includes("ghostface_billy"), "ghostface_billy is in the character-select grid");
ok(Array.isArray(roster) && roster.includes("ghostface"), "original ghostface still present (untouched)");
await sleep(500);                                     // let the grid render
await page.screenshot({ path: path.join(OUT, "billy_select.png") });
console.log("  wrote harness/shots/billy_select.png");

// ── PART 2 — LIVE MATCH: Billy is playable (spawns, renders, attacks) ──
console.log("── live match ──");
await page.goto(`${base}/index.html?harness=1&p1=ghostface_billy&p2=jason`, { waitUntil:"load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
await page.mouse.click(640, 360);
// training mode → p2 is a STATIONARY dummy (no jumping), so the shot stays cleanly framed on both.
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await page.waitForFunction(() => window.__harness.state && window.__harness.state().frame > 8, null, { timeout:15000, polling:16 });
const p1 = await page.evaluate(() => window.__harness.p1());
ok(p1 && p1.key === "ghostface_billy", `p1 is ghostface_billy in the live match (key=${p1?.key})`);
ok(p1 && p1.health > 0 && p1.maxHealth === 1040, `Billy spawned with his stats (hp ${p1?.health}/${p1?.maxHealth})`);
// SPECIAL first, on a clean spawn (no cooldown): hold Fwd (d) to register direction, then Special (l).
const eBefore = await page.evaluate(() => window.__harness.p1().energy);
await page.keyboard.down("d"); await sleep(200);
await page.keyboard.down("l"); await sleep(80); await page.keyboard.up("l");
await sleep(60);
const eAfter = await page.evaluate(() => window.__harness.p1());
ok(eAfter && eAfter.key === "ghostface_billy", "still Billy after Special (no companion-swap side effect)");
ok(eAfter && eAfter.energy < eBefore - 20, `Special (Gutting Lunge) FIRED — spent Dread ${eBefore.toFixed(0)}→${eAfter?.energy?.toFixed(0)}`);
await page.keyboard.up("d");
await sleep(400);   // let the special recover
// now a light knife slash for the money shot on his real art
await page.keyboard.down("d"); await sleep(220); await page.keyboard.up("d");
await page.keyboard.down("j"); await sleep(70);
await page.screenshot({ path: path.join(OUT, "billy_match.png") });
await page.keyboard.up("j");
console.log("  wrote harness/shots/billy_match.png");

await browser.close(); server.close();
console.log(fail ? `\n❌ ${fail} check(s) failed` : "\n✅ all checks passed");
process.exit(fail ? 1 : 0);
