// harness/pain_gravity_global.mjs — Pain Almighty Push/Pull = GLOBAL range, ZERO damage, force-only.
// Proves: (1) Push at MAX map distance (opposite corners) → foe knocked AWAY, HP unchanged (0 dmg).
//         (2) Pull at MAX map distance → foe reeled TOWARD Pain, HP unchanged (0 dmg).
//         (3) Super Push STILL deals damage. (4) Chibaku Tensei STILL deals damage.
// Usage: node harness/pain_gravity_global.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };

await page.goto(`${base}/index.html?harness=1&p1=pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

const st = () => page.evaluate(() => { const p = window.__harness.p1(), q = window.__harness.p2(); return { p1x: p.x, p2x: q?.x, p2vx: q?.vx, p2hp: q?.health, gap: Math.abs((q?.x||0)-(p.x||0)), facing: p.facing||1 }; });
const facingRight = (await st()).facing === 1;
const AWAY = facingRight ? "a" : "d";
// place the fighters at OPPOSITE CORNERS of the 3200-wide arena (p1 clamps to the far left, p2 to the far right → ~1240px, the max map distance)
const cornerGap = async () => { await page.evaluate(() => { window.__harness.setP1X?.(0); window.__harness.setP2X?.(3000); }); await sleep(150); return await st(); };
const prep = async () => { await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.setP1Energy?.(210); }); await sleep(80); };

// ── 1. ALMIGHTY PUSH — global, zero damage, knock AWAY ──
await prep(); let b = await cornerGap();
console.log(`ALMIGHTY PUSH @ max distance (gap=${Math.round(b.gap)}px — old reach-190 would WHIFF here):`);
await page.keyboard.down("l"); await sleep(70); await page.keyboard.up("l");
// capture the knockback VELOCITY spike (definitive proof the force CONNECTED at 1240px) + displacement
let a = b, maxVx = 0; for (let i=0;i<30;i++){ await sleep(18); a = await st(); maxVx = Math.max(maxVx, Math.abs(a.p2vx||0)); if (a.gap > b.gap + 15 && maxVx > 8) break; }
await page.screenshot({ path: path.join(OUT, "pain_global_push.png") });
ok(maxVx > 8, `force CONNECTED at ${Math.round(b.gap)}px — knockback velocity applied (|p2.vx| peaked ${maxVx.toFixed(1)})`);
ok(a.gap > b.gap + 15, `foe knocked AWAY at max distance (gap ${Math.round(b.gap)}→${Math.round(a.gap)})`);
ok(Math.abs(a.p2hp - b.p2hp) < 0.5, `ZERO damage (HP ${Math.round(b.p2hp)}→${Math.round(a.p2hp)})`);

// ── 2. ALMIGHTY PULL — global, zero damage, reel TOWARD ──
await prep(); b = await cornerGap();
console.log(`ALMIGHTY PULL @ max distance (gap=${Math.round(b.gap)}px):`);
await page.keyboard.down(AWAY); await sleep(60); await page.keyboard.down("l"); await sleep(70); await page.keyboard.up("l"); await page.keyboard.up(AWAY);
await sleep(700); a = await st();
await page.screenshot({ path: path.join(OUT, "pain_global_pull.png") });
ok(a.gap < b.gap - 200, `foe reeled TOWARD Pain from max distance (gap ${Math.round(b.gap)}→${Math.round(a.gap)})`);
ok(Math.abs(a.p2hp - b.p2hp) < 0.5, `ZERO damage (HP ${Math.round(b.p2hp)}→${Math.round(a.p2hp)})`);

// ── 3. SUPER PUSH — STILL deals damage (unchanged) ──
await prep(); await page.evaluate(() => { const p=window.__harness.p1(); window.__harness.setP2X?.(p.x + (p.facing||1)*160); }); await sleep(80);
b = await st();
console.log(`SUPER ALMIGHTY PUSH (in-range, expect DAMAGE):`);
await page.keyboard.down("s"); await sleep(60); await page.keyboard.down("l"); await sleep(70); await page.keyboard.up("l"); await page.keyboard.up("s");
await sleep(500); a = await st();
ok(a.p2hp < b.p2hp - 20, `Super Push STILL deals damage (HP ${Math.round(b.p2hp)}→${Math.round(a.p2hp)}, dealt ${Math.round(b.p2hp-a.p2hp)})`);

// ── 4. CHIBAKU TENSEI — STILL deals damage (unchanged) ──
await prep(); await page.evaluate(() => { const p=window.__harness.p1(); window.__harness.setP2X?.(p.x + (p.facing||1)*180); }); await sleep(80);
b = await st();
console.log(`CHIBAKU TENSEI ULTIMATE (expect DAMAGE):`);
await page.keyboard.down("u"); await sleep(70); await page.keyboard.up("u");
a = b; for (let i=0;i<200;i++){ await sleep(20); a = await st(); if (a.p2hp < b.p2hp - 20) break; }
ok(a.p2hp < b.p2hp - 100, `Chibaku Tensei STILL deals damage (HP ${Math.round(b.p2hp)}→${Math.round(a.p2hp)}, dealt ${Math.round(b.p2hp-a.p2hp)})`);

console.log(`\n${pass} pass / ${fail} fail`);
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
