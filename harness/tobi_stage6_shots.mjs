// harness/tobi_stage6_shots.mjs — Stage 6 evidence for Tobi's NINE-TAILS ULTIMATE cinematic.
// Boots p1=tobi ALONGSIDE p2=obito. Proves:
//   (1) the freeze-cinematic activates and walks the full timeline (activate→rise→charge→fire→settle);
//   (2) the giant Nine-Tails Bijūdama deals the guaranteed cinematic-band damage (~360);
//   (3) DUPLICATE-RENDER GUARD — the real frozen caster is hidden (`_tobiKuramaHide`) the whole time
//       so it never double-renders next to the giant fox (the project's known "second body" bug class);
//   (4) ISOLATION — it's Tobi's OWN module/state: Obito's Juubi cinematic never activates and Obito's
//       `_kuramaHide` is never touched; the beast is the NINE-tails, NOT Obito's Ten-Tails.
// Usage: node harness/tobi_stage6_shots.mjs
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
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.tobiNineTailsUltCine());
const obitoCine = () => page.evaluate(() => window.__harness.obitoJuubiUltCine());
const shot = n => page.screenshot({ path: path.join(OUT, `tobi_s6_${n}.png`) });

await page.goto(`${base}/index.html?harness=1&p1=tobi&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);
await page.evaluate(() => window.__harness.fillEnergy?.());
await sleep(80);
ok((await page.evaluate(() => window.__harness.p1().key)) === "tobi", `p1 = tobi`);

const c0 = await cine();
ok(!c0.active, `cinematic not active before firing`);
const hp0 = (await p2()).health;

// fire the ultimate (U)
await page.keyboard.down("u"); await sleep(90); await page.keyboard.up("u");

// walk the phases
const seen = new Set();
let struck = false, maxFrame = 0, everActive = false;
let casterHiddenDuringBeast = true, beastFrames = 0;
let obitoCineEverActive = false, obitoHideEverSet = false;
for (let i = 0; i < 110; i++) {
  const c = await cine();
  if (c.active) {
    everActive = true; maxFrame = Math.max(maxFrame, c.frame); if (c.struck) struck = true;
    if (["rise","charge","fire"].includes(c.phase)) {
      beastFrames++;
      if (!c.casterHidden) casterHiddenDuringBeast = false;   // must stay hidden while the beast is on screen
      if (!seen.has(c.phase)) { seen.add(c.phase); await shot(c.phase); }
    }
    if ((await obitoCine()).active) obitoCineEverActive = true;                 // Obito's cine must NEVER fire
    const kh = await page.evaluate(() => window.__harness.tobiKuramaHide("p2"));
    if (kh?.kamuiHide) obitoHideEverSet = true;                                 // Obito's `_kuramaHide` must stay untouched
  } else if (everActive) break;
  await sleep(30);
}
ok(everActive, `Nine-Tails cinematic ACTIVATED (freeze-cinematic)`);
ok(seen.has("rise"), `beast RISE phase played + captured`);
ok(seen.has("charge"), `CHARGE phase played (Bijūdama forms) + captured`);
ok(seen.has("fire"), `FIRE phase played (Bijūdama detonates) + captured`);
ok(struck, `guaranteed hit registered (struck at impact)`);
ok(maxFrame > 150, `advanced through a full multi-phase timeline (maxFrame=${maxFrame})`);

// DUPLICATE-RENDER GUARD
ok(beastFrames > 0 && casterHiddenDuringBeast, `caster HIDDEN the whole beast sequence (_tobiKuramaHide) — no double-render (${beastFrames} frames checked)`);

// ISOLATION
ok(!obitoCineEverActive, `Obito's Juubi cinematic NEVER activated (separate module)`);
ok(!obitoHideEverSet, `Obito's own _kuramaHide never touched by Tobi's cinematic`);

// after: ended, un-hidden, damage
await page.waitForFunction(() => !window.__harness.tobiNineTailsUltCine().active, null, { timeout: 6000 }).catch(() => {});
const cEnd = await cine();
const hpEnd = (await p2()).health;
const dmg = hp0 - hpEnd;
const khEnd = await page.evaluate(() => window.__harness.tobiKuramaHide("p1"));
ok(!cEnd.active, `cinematic ENDED (combat resumes)`);
ok(!khEnd.hide, `caster UN-hidden after the cinematic (_tobiKuramaHide cleared)`);
ok(dmg >= 300 && dmg <= 400, `foe took the guaranteed cinematic-band damage (~360): dmg=${dmg}`);
await shot("after");

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail || errors.length ? 1 : 0);
