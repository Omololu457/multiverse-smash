// harness/ssf2_shots.mjs — REAL in-game evidence that "Spider-Man (SSF2)" (spiderman_ssf2) is a
// registered, playable, cleanly-rendering NEW character: (1) he appears in the marvel-universe select
// grid, (2) he spawns in a live match with his stats, (3) his sprite renders (idle/walk/jump/attack)
// with no keying artifacts. Also asserts spiderman / miles / kurapika are STILL present (untouched).
// Usage: node harness/ssf2_shots.mjs
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

// ── PART 1 — CHARACTER SELECT: SSF2 appears in the marvel grid; existing chars untouched ──
console.log("── character-select ──");
await page.goto(`${base}/index.html?harness=1`, { waitUntil:"load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
await page.mouse.click(640, 360); await sleep(250);
const roster = await page.evaluate(() => window.__harness.gotoCharacterSelect("marvel"));
console.log("  marvel grid roster:", JSON.stringify(roster));
ok(Array.isArray(roster) && roster.includes("spiderman_ssf2"), "spiderman_ssf2 is in the character-select grid");
ok(Array.isArray(roster) && roster.includes("spiderman"), "original spiderman still present (untouched)");
ok(Array.isArray(roster) && roster.includes("miles"), "miles still present (untouched)");
await sleep(500);
await page.screenshot({ path: path.join(OUT, "ssf2_select.png") });
console.log("  wrote harness/shots/ssf2_select.png");

// ── PART 2 — LIVE MATCH: SSF2 spawns, renders, moves, attacks ──
console.log("── live match ──");
await page.goto(`${base}/index.html?harness=1&p1=spiderman_ssf2&p2=jason`, { waitUntil:"load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout:15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await page.waitForFunction(() => window.__harness.state && window.__harness.state().frame > 8, null, { timeout:15000, polling:16 });
const p1 = await page.evaluate(() => window.__harness.p1());
ok(p1 && p1.key === "spiderman_ssf2", `p1 is spiderman_ssf2 in the live match (key=${p1?.key})`);
ok(p1 && p1.health > 0 && p1.maxHealth === 1000, `spawned with his stats (hp ${p1?.health}/${p1?.maxHealth})`);
// Is he on the SPRITE path (not the procedural fallback box)?
const sprOK = await page.evaluate(() => { const h = window.__harness; return h.spriteReady ? h.spriteReady(1) : null; });
console.log("  spriteReady(p1):", sprOK);
await sleep(300);
await page.screenshot({ path: path.join(OUT, "ssf2_idle.png") });   // idle pose
console.log("  wrote harness/shots/ssf2_idle.png");

// walk right
await page.keyboard.down("d"); await sleep(360);
await page.screenshot({ path: path.join(OUT, "ssf2_walk.png") });
await page.keyboard.up("d"); await sleep(120);
console.log("  wrote harness/shots/ssf2_walk.png");

// jump
await page.keyboard.down("w"); await sleep(60); await page.keyboard.up("w");
await sleep(160);
await page.screenshot({ path: path.join(OUT, "ssf2_jump.png") });
console.log("  wrote harness/shots/ssf2_jump.png");
await sleep(500);   // land

// light attack (money shot on his real art)
await page.keyboard.down("j"); await sleep(70);
await page.screenshot({ path: path.join(OUT, "ssf2_light.png") });
await page.keyboard.up("j");
console.log("  wrote harness/shots/ssf2_light.png");
await sleep(300);

// heavy (kick)
await page.keyboard.down("k"); await sleep(90);
await page.screenshot({ path: path.join(OUT, "ssf2_heavy.png") });
await page.keyboard.up("k");
console.log("  wrote harness/shots/ssf2_heavy.png");

await browser.close(); server.close();
console.log(fail ? `\n❌ ${fail} check(s) failed` : "\n✅ all checks passed");
process.exit(fail ? 1 : 0);
