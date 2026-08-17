// harness/six_paths_pain_stage2_shots.mjs — STAGE 2 evidence for Six Paths of Pain: the ANIMAL /
// CHIKUSHODO Path. Covers, with real screenshots:
//   1. SWAP into the Animal Path — art-swaps to the red-ponytail chiku_* body (not Deva, not a box).
//   2. Chikushodo movement/state + 5 normals — each renders its own sixpaths_chiku_* sheet.
//   3. The SUMMON menagerie — neutral=Three-Headed Dog / Up=Giant Hawk / Back=Rhino / Down=Toad;
//      each spawns its creature summon (real art) and its rush connects for damage.
// Usage: node harness/six_paths_pain_stage2_shots.mjs
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
const p1 = () => page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, frame: p?.spriteFrameIndex ?? null }; });
const summonList = () => page.evaluate(() => (window.__harness.summons?.() || []).map(s => ({ id: s.summonId || s.id, sheet: s.sheet })));
const p2hp = () => page.evaluate(() => window.__harness.p2()?.health);

await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── 1. Swap into the Animal Path ──
console.log("\n── 1. Swap → Animal Path ──");
await page.evaluate(() => window.__harness.fillEnergy());
const swap = await page.evaluate(() => window.__harness.setPath(1));
await sleep(200);
const afterSwap = await page.evaluate(() => { const s = window.__harness.sixPaths(); const p = window.__harness.p1(); return { name: s.name, skinAnim: s.skinAnim, sheet: p.spriteSheet }; });
await page.screenshot({ path: path.join(OUT, "sixpaths_s2_swap_animal.png") });
ok(swap.ok && swap.path === 1 && swap.name === "Animal Path", `swap → Animal Path (${swap.name})`);
ok(afterSwap.skinAnim === true, `_skinAnim override active (Chikushodo art set)`);
await page.evaluate(() => window.__harness.benPose(null)); await sleep(150);
const idle = await p1();
ok(idle.sheet && idle.sheet.includes("sixpaths_chiku"), `idle renders the Chikushodo body → ${idle.sheet}`);

// ── 2. Chikushodo poses ──
console.log("\n── 2. Chikushodo poses (benPose) ──");
const EXP = {
  idle: "sixpaths_chiku_stance", run: "sixpaths_chiku_run", jump: "sixpaths_chiku_jfct",
  guard: "sixpaths_chiku_stance", hurt: "sixpaths_chiku_hurt", knockdown: "sixpaths_chiku_hurt",
  light: "sixpaths_chiku_combo", heavy: "sixpaths_chiku_combo", up: "sixpaths_chiku_runatk",
  air: "sixpaths_chiku_jfct", down_air: "sixpaths_chiku_downatk",
};
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose);
  await sleep(120);
  const r = await p1();
  await page.screenshot({ path: path.join(OUT, `sixpaths_s2_pose_${pose}.png`) });
  ok(r.sheet && r.sheet.includes(sheet), `${pose} → ${r.sheet} (frame ${r.frame})`);
}
await page.evaluate(() => window.__harness.benPose(null));

// ── 3. Summon menagerie ──
console.log("\n── 3. Summon menagerie ──");
const SUMMONS = [
  [null, "dog",   "Three-Headed Dog"],
  ["U",  "bird",  "Giant Hawk"],
  ["B",  "rhino", "Armored Rhino"],
  ["D",  "toad",  "Giant Toad"],
];
for (const [dir, key, label] of SUMMONS) {
  // prep: Animal Path, full energy, opponent healthy + in range, summon cooldown cleared (wait ~66f).
  await page.evaluate(() => { window.__harness.setPath(1); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); });
  const a = await page.evaluate(() => window.__harness.p1());
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 150);
  await sleep(1100);   // let the per-summon cooldown (60f) drain
  const hp0 = await p2hp();
  await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  // poll for the creature to spawn
  let spawned = null, spawnSheet = null;
  for (let t = 0; t < 30; t++) {
    await sleep(16);
    const ids = await summonList();
    const hit = ids.find(s => s.id === `chikuSummon_${key}`);
    if (hit) { spawned = hit.id; spawnSheet = hit.sheet; break; }
  }
  await sleep(360);   // let the rush connect
  await page.screenshot({ path: path.join(OUT, `sixpaths_s2_summon_${key}.png`) });
  const hp1 = await p2hp();
  ok(spawned === `chikuSummon_${key}`, `${dir || "neutral"} → ${label} summons (${spawned})`);
  ok(!!spawnSheet && spawnSheet.includes(`sixpaths_chiku_${key}`), `  ${label} renders its own art (${spawnSheet})`);
  ok((hp0 ?? 0) - (hp1 ?? 0) > 0, `  ${label} rush connects (${Math.round((hp0 ?? 0) - (hp1 ?? 0))} dmg)`);
}

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,12).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
