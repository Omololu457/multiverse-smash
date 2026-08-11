// harness/toji_stage4_shots.mjs — STAGE 4 evidence: Chain of a Thousand Miles / Inverted Spear of Heaven.
// ONE continuous 5-part special (Forward Special): tojiChain1→2→3→4→5 playing in sequence, long reach,
// finisher launches. Boots Toji vs a stationary dummy and verifies the full sequence fires + connects.
// Usage: node harness/toji_stage4_shots.mjs
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
async function boot(gap = 120) {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(200);
  await page.evaluate((g) => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + g); }, gap);
  await sleep(60);
}

console.log("STAGE 4 — Chain of a Thousand Miles / Inverted Spear of Heaven (5-part)\n");

// ── FORWARD SPECIAL — the continuous 5-part chain ──
await boot(120);
let h0 = (await P2()).health;
const moves = [];
await page.keyboard.down("d");                 // hold forward
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
for (let i = 0; i < 120; i++) { const c = await CMD(); if (c?.move && (!moves.length || moves[moves.length-1] !== c.move)) moves.push(c.move); if (moves.includes("tojiChain5")) break; await waitFrames(1); }
await page.keyboard.up("d");
const chain = moves.filter(m => /^tojiChain[1-5]$/.test(m));
ok(chain[0] === "tojiChain1", `Fwd+Special opens the chain (tojiChain1) — seq: ${chain.join(" → ")}`);
ok(["tojiChain2","tojiChain3","tojiChain4"].every(k => chain.includes(k)), `mid parts play in sequence (2→3→4)`);
ok(chain.includes("tojiChain5"), `chain runs to the Inverted Spear finisher (tojiChain5)`);
ok((await P2()).health < h0 - 40, `full 5-part chain deals real damage (total ${Math.round(h0-(await P2()).health)})`);
await page.screenshot({ path: path.join(OUT, "toji_s4_chain_end.png") });

// mid-chain screenshot (the far-reaching spear extension, part 2/3)
await boot(150);
await page.keyboard.down("d");
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
let shotDone = false;
for (let i = 0; i < 60; i++) { const c = await CMD(); if ((c?.move === "tojiChain2" || c?.move === "tojiChain3") && !shotDone) { await page.screenshot({ path: path.join(OUT, "toji_s4_chain_reach.png") }); shotDone = true; break; } await waitFrames(1); }
await page.keyboard.up("d");

// ── INTERRUPT: a hitstun interrupt STOPS the remaining chain ──
await boot(120);
await page.keyboard.down("d");
await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
await waitFrames(3);                            // let 1-2 parts start
await page.evaluate(() => { const p = window.__harness.p1(); p.hitstun = 40; p.attacking = false; p.currentAttack = null; });   // simulate getting hit mid-chain
const after = [];
for (let i = 0; i < 30; i++) { const c = await CMD(); if (c?.move && (!after.length || after[after.length-1] !== c.move)) after.push(c.move); await waitFrames(1); }
await page.keyboard.up("d");
ok(!after.includes("tojiChain5"), `a mid-chain interrupt STOPS the sequence (no finisher after interrupt; post-hit moves: ${after.filter(m=>/tojiChain/.test(m)).join(",")||"none"})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
