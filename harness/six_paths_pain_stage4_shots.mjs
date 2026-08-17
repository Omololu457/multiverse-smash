// harness/six_paths_pain_stage4_shots.mjs — STAGE 4 evidence for Six Paths of Pain: the HUMAN /
// NINGENDO Path (lean kit — the ONE Soul-Rip command grab). Covers, with real screenshots:
//   1. SWAP into the Human Path — art-swaps to the long-orange-hair Ningendo body.
//   2. Ningendo movement/state + 5 normals — each renders its own sixpaths_ningen_* sheet.
//   3. SOUL RIP command grab: connects in range for heavy damage + blue-soul FX; BEATS BLOCK (it's a
//      grab); WHIFFS out of range; WHIFFS on an airborne foe (jump/spacing is the counterplay).
// Usage: node harness/six_paths_pain_stage4_shots.mjs
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
const p1 = () => page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, frame: p?.spriteFrameIndex ?? null, x: p?.x }; });
const sp = () => page.evaluate(() => window.__harness.sixPaths());
const p2hp = () => page.evaluate(() => window.__harness.p2()?.health);

await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── 1. Swap into the Human Path ──
console.log("\n── 1. Swap → Human Path ──");
await page.evaluate(() => window.__harness.fillEnergy());
const swap = await page.evaluate(() => window.__harness.setPath(3));
await sleep(200);
const afterSwap = await sp();
await page.screenshot({ path: path.join(OUT, "sixpaths_s4_swap_human.png") });
ok(swap.ok && swap.path === 3 && swap.name === "Human Path", `swap → Human Path (${swap.name})`);
ok(afterSwap.skinAnim === true, `_skinAnim override active (Ningendo art set)`);
await page.evaluate(() => window.__harness.benPose(null)); await sleep(150);
const idle = await p1();
ok(idle.sheet && idle.sheet.includes("sixpaths_ningen"), `idle renders the Ningendo body → ${idle.sheet}`);

// ── 2. Ningendo poses ──
console.log("\n── 2. Ningendo poses (benPose) ──");
const EXP = {
  idle: "sixpaths_ningen_stance", run: "sixpaths_ningen_run", jump: "sixpaths_ningen_jfct",
  guard: "sixpaths_ningen_stance", hurt: "sixpaths_ningen_hurt", knockdown: "sixpaths_ningen_hurt",
  light: "sixpaths_ningen_combo", heavy: "sixpaths_ningen_combo", up: "sixpaths_ningen_runatk",
  air: "sixpaths_ningen_jfct", down_air: "sixpaths_ningen_downatk",
};
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose);
  await sleep(120);
  const r = await p1();
  await page.screenshot({ path: path.join(OUT, `sixpaths_s4_pose_${pose}.png`) });
  ok(r.sheet && r.sheet.includes(sheet), `${pose} → ${r.sheet} (frame ${r.frame})`);
}
await page.evaluate(() => window.__harness.benPose(null));

// ── 3. Soul-Rip command grab ──
console.log("\n── 3. Soul Rip command grab ──");
async function prep({ block = false, air = false, farAway = false } = {}) {
  await page.evaluate(() => { window.__harness.setPath(3); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + (farAway ? 420 : 80));
  if (block) await page.evaluate(() => window.__harness.setP2Blocking(true));
  if (air) await page.evaluate(() => window.__harness.setP2Air());
  await sleep(60);
  return p2hp();
}
async function ripAndMeasure(shot) {
  const hp0 = await p2hp();
  const ripped0 = (await sp()).ningendoRipped;
  await page.evaluate(() => window.__harness.p1SpecialDir(null));
  await sleep(360);
  if (shot) await page.screenshot({ path: path.join(OUT, shot) });
  const hp1 = await p2hp();
  const ripped1 = (await sp()).ningendoRipped;
  return { dmg: Math.round((hp0 ?? 0) - (hp1 ?? 0)), ripCount: ripped1 - ripped0 };
}
// cast pose check
await prep();
await page.evaluate(() => window.__harness.p1SpecialDir(null));
await sleep(70);
const castPose = (await sp()).castMove;
ok(castPose === "spSoul", `Soul Rip cast pose spSoul (got ${castPose})`);
await sleep(300);
// in range, grounded → connects hard
await prep();
let r = await ripAndMeasure("sixpaths_s4_soul_connect.png");
ok(r.dmg > 40, `in range → Soul Rip connects hard (${r.dmg} dmg)`);
ok(r.ripCount === 1, `  soul-rip registered (${r.ripCount})`);
// BEATS BLOCK — it's a grab
await prep({ block: true });
r = await ripAndMeasure("sixpaths_s4_soul_block.png");
ok(r.dmg > 40 && r.ripCount === 1, `grab BEATS BLOCK — connects through guard (${r.dmg} dmg)`);
// WHIFFS out of range
await prep({ farAway: true });
r = await ripAndMeasure("sixpaths_s4_soul_whiff_range.png");
ok(r.dmg === 0 && r.ripCount === 0, `WHIFFS out of range (${r.dmg} dmg)`);
// WHIFFS on an airborne foe
await prep({ air: true });
r = await ripAndMeasure("sixpaths_s4_soul_whiff_air.png");
ok(r.dmg === 0 && r.ripCount === 0, `WHIFFS on an airborne foe — jump is the counterplay (${r.dmg} dmg)`);

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,12).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
