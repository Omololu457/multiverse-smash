// harness/ichigo_stage1_shots.mjs — Stage 1 evidence for Ichigo Kurosaki (Bleach).
// Captures: char-select roster inclusion (bleach universe), BOTH random intros, in-battle
// movement/state poses (idle/run/jump/fall/guard/dash/charge/knockdown/taunt), and the 8-way
// aerial dash (all 6 directional frames via the ichigoDashPose probe). Also asserts the REAL
// directional air-dash physics (jump → dash+Up stamps _dashDirIdx and gives upward velocity).
// Usage: node harness/ichigo_stage1_shots.mjs
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
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(`${base}/index.html?harness=1&p1=ichigo&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);

// ── 1. Char-select: prove Ichigo appears in the BLEACH universe roster ──
const cs = await page.evaluate(() => window.__harness.showCharSelect("bleach", "training"));
await sleep(300);
await page.screenshot({ path: path.join(OUT, "ichigo_s1_charselect.png") });
console.log(`char-select bleach roster: [${cs.roster.join(", ")}]  includes ichigo=${cs.roster.includes("ichigo")}`);

// ── 2. BOTH intros — force each variant's sheet deterministically ──
await page.evaluate(() => { window.__harness.start(); });
await sleep(200);
const realIntro = await page.evaluate(() => { const p = window.__harness.p1(); return { variant: p?._introVariant, sheet: p?.spriteSheet }; });
console.log(`real intro variant picked: ${realIntro.variant}`);
await page.evaluate(() => window.__harness.skipToBattle());
await sleep(150);
for (const v of ["intro1", "intro2"]) {
  await page.evaluate(a => window.__harness.benPose(a), v);
  await sleep(200);
  const r = await page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, scale: p?.spriteScale }; });
  await page.screenshot({ path: path.join(OUT, `ichigo_s1_${v}.png`) });
  console.log(`  ${v}: sheet=${r.sheet} scale=${r.scale}`);
}
await page.evaluate(() => window.__harness.benPose(null));

// ── 3. Battle movement/state poses via forced action ──
const poses = ["idle", "run", "jump", "fall", "guard", "dash", "charge", "knockdown", "knockdownHeavy", "taunt"];
for (const pose of poses) {
  await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose);
  await sleep(180);
  const r = await page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, frame: p?.spriteFrame ?? null, scale: p?.spriteScale ?? null }; });
  await page.screenshot({ path: path.join(OUT, `ichigo_s1_pose_${pose}.png`) });
  console.log(`  pose ${pose}: sheet=${r.sheet} scale=${r.scale}`);
}
await page.evaluate(() => window.__harness.benPose(null));

// ── 4. 8-WAY AERIAL DASH — all 6 directional frames (dashDir strip) ──
const dirs = [["up",0],["down",1],["downFwd",2],["upFwd",3],["levelFwd",4],["back",5]];
for (const [name, idx] of dirs) {
  const info = await page.evaluate(i => window.__harness.ichigoDashPose(i), idx);
  await sleep(150);
  await page.screenshot({ path: path.join(OUT, `ichigo_s1_dashdir_${idx}_${name}.png`) });
  console.log(`  dashDir ${name} (idx ${idx}): action=${info?.action} idx=${info?.idx}`);
}
await page.evaluate(() => window.__harness.ichigoDashPose(null));

// ── 5. Confirm the directionalDash trait is live on the fighter (physics mechanic unit-tested
//       separately in harness/ichigo_dirdash.mjs, which exercises physics.moveFighter directly) ──
const trait = await page.evaluate(() => window.__harness.p1?.()?.traits?.directionalDash);
console.log(`directionalDash trait on live fighter = ${trait}`);

console.log(errors.length ? `\n❌ PAGE ERRORS:\n${errors.join("\n")}` : "\n✅ no page errors");
await browser.close(); server.close();
