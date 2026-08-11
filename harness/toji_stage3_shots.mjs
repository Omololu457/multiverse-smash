// harness/toji_stage3_shots.mjs — STAGE 3 evidence: sword specials.
// Split Soul Katana (Neutral Special) = ONE continuous 2-part sword combo (tojiSword1 → tojiSword2).
// Rapid Sword Slashes (Down Special)  = a stationary multi-hit katana flurry (tojiRapidSlash).
// Boots Toji vs a stationary dummy at close range, fires each, verifies pose sequence + real damage.
// Usage: node harness/toji_stage3_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const P1 = () => page.evaluate(() => window.__harness.p1());
const P2 = () => page.evaluate(() => window.__harness.p2());
const CMD = () => page.evaluate(() => window.__harness.tojiCmd());
const STATE = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await STATE()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function boot(gap = 92) {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(200);
  await page.evaluate((g) => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + g); }, gap);
  await sleep(60);
}

console.log("STAGE 3 — Toji sword specials\n");

// ── SPLIT SOUL KATANA (Neutral Special) — continuous 2-part sword combo ──
await boot(92);
let h0 = (await P2()).health;
const moves = new Set();
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
for (let i = 0; i < 40; i++) { const c = await CMD(); if (c?.move) moves.add(c.move); if (moves.has("tojiSword2")) break; await waitFrames(1); }
await waitFrames(20);
const seen = [...moves];
ok(moves.has("tojiSword1"), `Split Soul part 1 fires (tojiSword1) — moves: ${seen.join(", ")}`);
ok(moves.has("tojiSword2"), `Split Soul auto-chains to part 2 (tojiSword2) as ONE continuous special`);
ok((await P2()).health < h0, `Split Soul Katana connects (total dmg ${Math.round(h0-(await P2()).health)})`);
await page.screenshot({ path: path.join(OUT, "toji_s3_splitsoul.png") });

// screenshot part 1 mid-swing for the "drawing sword" beat
await boot(92);
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(4);
await page.screenshot({ path: path.join(OUT, "toji_s3_splitsoul_p1.png") });

// ── RAPID SWORD SLASHES (Down Special) — multi-hit flurry ──
await boot(80);
h0 = (await P2()).health;
await page.keyboard.down("s"); await waitFrames(1);
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
let sawFlurry = false; let hitTicks = 0; let lastHp = h0;
for (let i = 0; i < 50; i++) {
  const c = await CMD(); if (c?.move === "tojiRapidSlash") sawFlurry = true;
  const hp = (await P2()).health; if (hp < lastHp - 1) { hitTicks++; lastHp = hp; }
  await waitFrames(1);
}
await page.keyboard.up("s");
ok(sawFlurry, `Rapid Sword Slashes fires (tojiRapidSlash pose)`);
ok(hitTicks >= 3, `flurry deals MULTIPLE hits (${hitTicks} distinct damage ticks, total ${Math.round(h0-(await P2()).health)})`);
await page.screenshot({ path: path.join(OUT, "toji_s3_rapid.png") });

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
