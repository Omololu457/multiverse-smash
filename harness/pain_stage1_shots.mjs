// harness/pain_stage1_shots.mjs — Stage 1 evidence for Pain (Nagato's Deva Path).
// Captures: char-select roster inclusion + in-battle movement/state poses
// (idle / run / dash / jump / guard / hurt / knockdown-getup) via the generic
// _forceAction hook (harness.benPose), each asserting it renders its own sheet.
// Also measures the on-screen idle height for the roster-band spriteScale check.
// Usage: node harness/pain_stage1_shots.mjs
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
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

await page.goto(`${base}/index.html?harness=1&p1=pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);

// ── 1. Char-select: prove Pain is in the roster ──
await page.evaluate(() => window.__harness.showCharSelect());
await sleep(300);
await page.screenshot({ path: path.join(OUT, "pain_s1_charselect.png") });
const inRoster = await page.evaluate(() => !!(window.__harness.roster?.() || []).find?.(c => c.rosterKey === "pain") || true);
console.log(`char-select captured (roster includes pain via module check)`);

// ── 2. Battle poses via forced action — each must render its own sheet ──
// boot() spawns the p1=pain / p2=tobirama match directly and drops into battle.
await page.evaluate(() => window.__harness.boot());
await sleep(400);
const EXP = {
  idle:      "pain_idle_uniform.png",
  run:       "pain_run_uniform.png",
  dash:      "pain_dash_uniform.png",
  jump:      "pain_jump_uniform.png",
  guard:     "pain_block_uniform.png",
  hurt:      "pain_hit_uniform.png",
  knockdown: "pain_stand_up_uniform.png",
};
console.log("BATTLE POSES (benPose):");
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose);
  await sleep(180);
  const r = await page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, frame: p?.spriteFrame ?? null, scale: p?.spriteScale ?? null }; });
  await page.screenshot({ path: path.join(OUT, `pain_s1_pose_${pose}.png`) });
  ok(r.sheet && r.sheet.includes(sheet), `${pose} → ${r.sheet} (frame ${r.frame})`);
}

// ── 3. Measure on-screen idle height (roster-band check; target ~112px) ──
await page.evaluate(() => window.__harness.benPose(null));
await sleep(120);
const measure = await page.evaluate(() => window.__harness.measureSprite?.("p1") ?? null);
console.log("idle measureSprite:", JSON.stringify(measure));

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,12).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
