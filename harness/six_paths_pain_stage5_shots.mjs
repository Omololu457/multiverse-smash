// harness/six_paths_pain_stage5_shots.mjs — STAGE 5 evidence for Six Paths of Pain: the two RICH Paths,
// ASURA / SHURADO (missile/rocket artillery) and NARAKA / JIGOKUDO (King of Hell). With screenshots:
//   ASURA:  swap → mech body; 5 normals render; neutral=Missile Punch / Fwd=Rocket Launcher /
//           Down=Super Missile each fire a real traveling projectile that connects for damage.
//   NARAKA: swap → Naraka body; 5 normals render; neutral=King of Hell JUDGMENT (giant head strike,
//           damage) / Down=King of Hell RESTORATION (heals Pain).
// Usage: node harness/six_paths_pain_stage5_shots.mjs
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
const p1 = () => page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, frame: p?.spriteFrameIndex ?? null, x: p?.x, hp: p?.health }; });
const sp = () => page.evaluate(() => window.__harness.sixPaths());
const p2hp = () => page.evaluate(() => window.__harness.p2()?.health);
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name));

await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

async function posesFor(prefix, tag) {
  const EXP = {
    idle: `${prefix}_stance`, run: `${prefix}_run`, jump: `${prefix}_jfct`,
    guard: `${prefix}_stance`, hurt: `${prefix}_hurt`, knockdown: `${prefix}_hurt`,
    light: `${prefix}_combo`, heavy: `${prefix}_combo`, up: `${prefix}_runatk`,
    air: prefix === "sixpaths_asura" ? "sixpaths_asura_air" : `${prefix}_jfct`,
    down_air: `${prefix}_downatk`,
  };
  for (const [pose, sheet] of Object.entries(EXP)) {
    await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose);
    await sleep(110);
    const r = await p1();
    ok(r.sheet && r.sheet.includes(sheet), `${tag} ${pose} → ${r.sheet} (f${r.frame})`);
  }
  await page.evaluate(() => window.__harness.benPose(null));
}

// ══════════════ ASURA / SHURADO ══════════════
console.log("\n══ ASURA / SHURADO ══");
await page.evaluate(() => window.__harness.fillEnergy());
let swap = await page.evaluate(() => window.__harness.setPath(4));
await sleep(200);
await page.screenshot({ path: path.join(OUT, "sixpaths_s5_swap_asura.png") });
ok(swap.ok && swap.path === 4 && swap.name === "Asura Path", `swap → Asura Path (${swap.name})`);
await page.evaluate(() => window.__harness.benPose(null)); await sleep(120);
ok((await p1()).sheet.includes("sixpaths_asura"), `idle renders the Asura body`);
await posesFor("sixpaths_asura", "asura");

const ASURA_SHOTS = [
  [null, "asuraMissile",      "Missile Punch"],
  ["F",  "asuraRocket",       "Rocket Launcher"],
  ["D",  "asuraSuperMissile", "Super Missile"],
];
for (const [dir, projname, label] of ASURA_SHOTS) {
  await page.evaluate(() => { window.__harness.setPath(4); window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1"); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 150);
  await sleep(60);
  const hp0 = await p2hp();
  await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  let fired = false;
  for (let t = 0; t < 24; t++) { await sleep(16); if ((await projNames()).includes(projname)) { fired = true; break; } }
  await sleep(360);
  await page.screenshot({ path: path.join(OUT, `sixpaths_s5_asura_${projname}.png`) });
  const hp1 = await p2hp();
  ok(fired, `${dir || "neutral"} → ${label} fires a projectile (${projname})`);
  ok((hp0 ?? 0) - (hp1 ?? 0) > 0, `  ${label} connects (${Math.round((hp0 ?? 0) - (hp1 ?? 0))} dmg)`);
}

// ══════════════ NARAKA / JIGOKUDO ══════════════
console.log("\n══ NARAKA / JIGOKUDO ══");
await page.evaluate(() => window.__harness.fillEnergy());
swap = await page.evaluate(() => window.__harness.setPath(5));
await sleep(200);
await page.screenshot({ path: path.join(OUT, "sixpaths_s5_swap_naraka.png") });
ok(swap.ok && swap.path === 5 && swap.name === "Naraka Path", `swap → Naraka Path (${swap.name})`);
await page.evaluate(() => window.__harness.benPose(null)); await sleep(120);
ok((await p1()).sheet.includes("sixpaths_naraka"), `idle renders the Naraka body`);
await posesFor("sixpaths_naraka", "naraka");

// King of Hell JUDGMENT (neutral) — giant head strike
await page.evaluate(() => { window.__harness.setPath(5); window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1"); });
{
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 150);
  await sleep(60);
  const hp0 = await p2hp();
  const judged0 = (await sp()).narakaJudged;
  await page.evaluate(() => window.__harness.p1SpecialDir(null));
  let headFx = false;
  for (let t = 0; t < 24; t++) { await sleep(16); if ((await projNames()).includes("narakaKingOfHell")) { headFx = true; break; } }
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, "sixpaths_s5_naraka_judgment.png") });
  const hp1 = await p2hp();
  const judged1 = (await sp()).narakaJudged;
  ok(headFx, `Judgment summons the King of Hell head FX`);
  ok((hp0 ?? 0) - (hp1 ?? 0) > 0 && judged1 - judged0 === 1, `Judgment devours for damage (${Math.round((hp0 ?? 0) - (hp1 ?? 0))} dmg)`);
}
// King of Hell RESTORATION (Down) — heal Pain from below max
await page.evaluate(() => { window.__harness.setPath(5); window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1"); window.__harness.setP1Health(500); });
await sleep(60);
{
  const hp0 = (await p1()).hp;
  const healed0 = (await sp()).narakaHealed;
  await page.evaluate(() => window.__harness.p1SpecialDir("D"));
  await sleep(80);
  const castPose = (await sp()).castMove;
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, "sixpaths_s5_naraka_restore.png") });
  const hp1 = (await p1()).hp;
  const healed1 = (await sp()).narakaHealed;
  ok(castPose === "spSummon", `Restoration cast pose spSummon (got ${castPose})`);
  ok(hp1 - hp0 > 50 && healed1 - healed0 === 1, `Restoration HEALS Pain (${Math.round(hp0)} → ${Math.round(hp1)})`);
}

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,12).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
