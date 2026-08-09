// harness/tobi_stage1_shots.mjs — Stage 1 evidence for Tobi (masked Obito alias).
// (1) Boots p1=tobi ALONGSIDE p2=obito — proves the new module loads with zero page
//     errors while Obito is also live (early isolation smoke test).
// (2) benPose each movement/state/intro action; assert the rendered spriteSheet is the
//     right masked_man_*_uniform sheet AND that Tobi is a sprite (not the procedural box).
// (3) Screenshots for visual review.
// Usage: node harness/tobi_stage1_shots.mjs
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

await page.goto(`${base}/index.html?harness=1&p1=tobi&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── 0. Load / isolation smoke: both fighters exist, Tobi is a sprite ──
const meta = await page.evaluate(() => ({
  p1key: window.__harness.p1()?.key, p2key: window.__harness.p2()?.key,
  p1scale: window.__harness.p1()?.spriteScale
}));
ok(meta.p1key === "tobi" && meta.p2key === "obito", `co-loaded p1=${meta.p1key} p2=${meta.p2key}`);
ok(meta.p1scale >= 1.85 && meta.p1scale <= 1.95, `Tobi spriteScale=${meta.p1scale} (Uchiha-tier height)`);

// ── 1. Pose render (benPose) — assert each action renders its masked_man sheet ──
const EXP = {
  idle:      "masked_man_idle_uniform.png",
  walk:      "masked_man_run_uniform.png",
  run:       "masked_man_run_uniform.png",
  dash:      "masked_man_dash_uniform.png",
  dashCombo: "masked_man_dash_combo_uniform.png",
  jump:      "masked_man_jump_uniform.png",
  fall:      "masked_man_jump_uniform.png",
  guard:     "masked_man_block_uniform.png",
  intro:     "masked_man_intro_uniform.png",
  hurt:      "masked_man_hurt_uniform.png",
  hurt_air:  "masked_man_hurt_air_uniform.png",
  knockdown: "masked_man_knockdown_uniform.png",
  getup:     "masked_man_getup_uniform.png",
};
console.log("POSE RENDER (benPose):");
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a), pose);
  await sleep(140);
  const s = await page.evaluate(() => window.__harness.p1().spriteSheet);
  await page.screenshot({ path: path.join(OUT, `tobi_s1_${pose}.png`) });
  ok(s && s.includes(sheet), `${pose} → ${s}`);
}
await page.evaluate(() => window.__harness.benPose(null));
await sleep(120);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail || errors.length ? 1 : 0);
