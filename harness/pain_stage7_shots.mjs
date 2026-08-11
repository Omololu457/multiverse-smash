// harness/pain_stage7_shots.mjs — Stage 7 evidence for Pain's Chibaku Tensei ultimate (freeze cinematic).
// Triggers the ult and verifies: cinematic activates → runs all phases (cast→rise→slam→settle) → the
// guaranteed damage lands ONCE at the SLAM beat (duplicate-render/damage guard for the known bug class)
// → the caster plays the arms-raised cast pose through the freeze → the cinematic ENDS and combat resumes.
// Usage: node harness/pain_stage7_shots.mjs
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
const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

await page.goto(`${base}/index.html?harness=1&p1=pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

const cine = () => page.evaluate(() => window.__harness.painUltCine?.() || null);
const state = () => page.evaluate(() => { const p = window.__harness.p1(), q = window.__harness.p2(); return { sheet: p.spriteSheet, p2hp: q?.health }; });

// energy + positioning
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.setP1Energy?.(210); const p=window.__harness.p1(); window.__harness.setP2X?.(p.x + (p.facing||1)*180); });
await sleep(80);
const hp0 = (await state()).p2hp;

console.log("CHIBAKU TENSEI ULTIMATE:");
// press Ultimate (u)
await page.keyboard.down("u"); await sleep(60); await page.keyboard.up("u");

// poll the cinematic across its whole life (~172f ≈ 2.9s)
const phasesSeen = new Set();
let everActive = false, struckSeen = false, castPoseSeen = false, shotRise = false, shotSlam = false;
for (let i = 0; i < 200; i++) {
  await sleep(20);
  const c = await cine();
  if (c?.active) {
    everActive = true;
    if (c.phase) phasesSeen.add(c.phase);
    if (c.struck) struckSeen = true;
    const s = await state();
    if (s.sheet && s.sheet.includes("pain_chibaku_cast")) castPoseSeen = true;
    if (c.phase === "rise" && !shotRise) { await page.screenshot({ path: path.join(OUT, "pain_s7_rise.png") }); shotRise = true; }
    if (c.phase === "slam" && !shotSlam) { await page.screenshot({ path: path.join(OUT, "pain_s7_slam.png") }); shotSlam = true; }
  } else if (everActive) {
    break;   // cinematic finished
  }
}
await sleep(200);
const after = await cine();
const hp1 = (await state()).p2hp;

ok(everActive, `ultimate activated the Chibaku Tensei cinematic`);
ok(["cast","rise","slam","settle"].every(p => phasesSeen.has(p)), `ran all phases: ${[...phasesSeen].join(",")}`);
ok(castPoseSeen, `caster plays the arms-raised cast pose through the freeze (pain_chibaku_cast)`);
ok(struckSeen, `damage beat fired (struck=true at SLAM)`);
const dropped = Math.round(hp0 - hp1);
ok(dropped > 120 && dropped < 320, `guaranteed devastation landed ONCE — p2 HP ${Math.round(hp0)}→${Math.round(hp1)} (dealt ${dropped}, single payoff ~216)`);
ok(after && after.active === false, `cinematic ENDED cleanly (combat resumes)`);

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,10).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
