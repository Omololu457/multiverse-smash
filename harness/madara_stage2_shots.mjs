// harness/madara_stage2_shots.mjs — Stage 2 evidence for Madara's normals.
// (1) benPose screenshots for light/heavy/up/air/air_heavy, asserting each renders its sheet.
// (2) Real-keyboard functional test: grounded Heavy → combo_1; air+Heavy → Susanoo-hand grab
//     (the new general air_heavy hook); down-air input → no-op (confirmed GAP).
// Usage: node harness/madara_stage2_shots.mjs
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

await page.goto(`${base}/index.html?harness=1&p1=madara&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(200);

// ── 1. Pose screenshots (deterministic render via benPose) ──
const EXP = {
  light:     "madara2_slap_uniform.png",
  heavy:     "madara2_combo_1_uniform.png",
  up:        "madara2_up_attack_uniform.png",
  air:       "madara2_air_combo_1_uniform.png",
  air_heavy: "madara2_susanoo_grab_air_uniform.png",
};
console.log("POSE RENDER (benPose):");
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a), pose);
  await sleep(160);
  const s = await page.evaluate(() => window.__harness.p1().spriteSheet);
  await page.screenshot({ path: path.join(OUT, `madara_s2_${pose}.png`) });
  ok(s && s.includes(sheet), `${pose} → ${s}`);
}
await page.evaluate(() => window.__harness.benPose(null));
await sleep(120);

// ── 2. Functional keyboard test (real input path) ──
// poll spriteSheet over a short window to catch the attack's active frames
const pollSheet = async (needle, ms = 600) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const s = await page.evaluate(() => ({ sheet: window.__harness.p1().spriteSheet, att: window.__harness.p1().attacking, grounded: window.__harness.p1().grounded }));
    if (s.sheet && s.sheet.includes(needle)) return s;
    await sleep(30);
  }
  return await page.evaluate(() => ({ sheet: window.__harness.p1().spriteSheet, att: window.__harness.p1().attacking, grounded: window.__harness.p1().grounded }));
};
console.log("FUNCTIONAL (real keys — Jump:W Heavy:K Down:S Light:J):");

// grounded Heavy → combo_1
await page.evaluate(() => { const p = window.__harness.p1 && window.__harness; }); // no-op focus guard
await page.keyboard.press("k");
let r = await pollSheet("madara2_combo_1_uniform.png");
ok(r.sheet.includes("combo_1"), `grounded Heavy → ${r.sheet}`);
await sleep(500);

// airborne air_heavy: jump, then Heavy while off the ground → Susanoo-hand grab
await page.keyboard.down("w"); await sleep(60); await page.keyboard.up("w");
await sleep(180); // rise off the ground
const air0 = await page.evaluate(() => window.__harness.p1().grounded);
await page.keyboard.press("k");
r = await pollSheet("madara2_susanoo_grab_air_uniform.png", 700);
ok(!air0 && r.sheet.includes("susanoo_grab_air"), `airborne Heavy → ${r.sheet} (wasAirborne=${!air0})`);
await sleep(600);

// down-air GAP: airborne Down+Light must NOT start an attack (no down_air move)
await page.keyboard.down("w"); await sleep(60); await page.keyboard.up("w");
await sleep(180);
await page.keyboard.down("s"); await page.keyboard.press("j"); await page.keyboard.up("s");
await sleep(120);
const da = await page.evaluate(() => ({ sheet: window.__harness.p1().spriteSheet, att: window.__harness.p1().attacking }));
ok(!(da.sheet || "").includes("down_air"), `down-air input → no down_air move (gap); sheet=${da.sheet} attacking=${da.att}`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
