// harness/tobi_celestial_shot.mjs — Celestial Veil: capture idle AND an attack pose with the pastel-star
// procedural overlay live, + verify the pale base and soft overlay both render (elegant, not harsh).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass=0, fail=0; const ok=(c,m)=>{ (c?pass++:fail++); console.log(`  ${c?"PASS":"FAIL"} ${m}`); };
const p1 = () => page.evaluate(() => window.__harness.p1());

await page.goto(`${base}/index.html?harness=1&p1=tobi`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
await sleep(300);
// keep BOTH fighters framed on-screen (pushing p2 off to 99999 shifts the camera so far that Tobi
// renders off-canvas → the world-space overlay would be off-screen). A moderate gap keeps Tobi centred.
await page.evaluate(() => { window.__harness.setP1X?.(360); window.__harness.setP2X?.(680); window.__harness.setSkin?.("p1", "tobiCelestial"); window.__harness.healP1?.(); window.__harness.fillEnergy?.(); });
await sleep(200);
const bb = await page.evaluate(() => window.__harness.tobiCelestialFX("p1"));
console.log(`  Tobi on-screen bbox: x=${Math.round(bb.x)} y=${Math.round(bb.y)} w=${Math.round(bb.w)} h=${Math.round(bb.h)}`);
ok(((await p1()).skinId) === "tobiCelestial", `skin applied: ${(await p1()).skinId}`);

// let the stars drift/twinkle a bit, then IDLE full-canvas shot — read bbox at the SAME instant
await sleep(500);
const idleBox = await page.evaluate(() => { const f = window.__harness.tobiCelestialFX("p1"); return { x: f.x, y: f.y, w: f.w, h: f.h }; });
await page.screenshot({ path: path.join(OUT, "tobi_celestial_idle.png") });
fs.writeFileSync(path.join(OUT, "tobi_celestial_idle.box.json"), JSON.stringify(idleBox));
// ATTACK: hold a swing and shoot mid-animation
await page.keyboard.down("j"); await sleep(90);
const atkBox = await page.evaluate(() => { const f = window.__harness.tobiCelestialFX("p1"); return { x: f.x, y: f.y, w: f.w, h: f.h }; });
await page.screenshot({ path: path.join(OUT, "tobi_celestial_attack.png") });
fs.writeFileSync(path.join(OUT, "tobi_celestial_attack.box.json"), JSON.stringify(atkBox));
await page.keyboard.up("j");
ok(((await p1()).spriteSheet||"").includes("__celestial"), `attack pose renders __celestial (${((await p1()).spriteSheet||"").split("/").pop()})`);

// overlay actually executing (clock increments each draw → not a silent no-op)
const fx = await page.evaluate(() => window.__harness.tobiCelestialFX("p1"));
ok(fx.seeded && fx.stars > 0 && fx.nebulae > 0, `pastel overlay seeded (${fx.stars} stars, ${fx.nebulae} nebulae)`);
ok(fx.clock > 30, `overlay drawing live (clock=${fx.clock} frames rendered)`);

console.log(`\n${pass} PASS / ${fail} FAIL`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
