// harness/six_paths_pain.test.mjs — CANONICAL suite for Six Paths of Pain (rosterKey "six_paths_pain"),
// the six-body multi-identity character. Covers:
//   1. Boots to sprites (SpriteHandler, not the procedural box).
//   2. SWAP MATRIX — swaps through ALL 6 Paths; each re-points _path, art-swaps (_skinAnim), correct name.
//   3. FALLBACK-BOX SWEEP — on every Path, every rendered action resolves to that Path's own sheet
//      (never the 128² fallback box).
//   4. EACH PATH'S SIGNATURE KIT connects (Deva push+ult / Animal summon / Preta absorb / Human soul-rip /
//      Asura projectile / Naraka judgment + restore).
//   5. ZERO SHARED STATE with the solo `pain` character (loaded side-by-side).
// The per-stage harnesses (test:six-paths-s1..s5) remain authoritative for full per-move detail.
// Usage: node harness/six_paths_pain.test.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const p1 = () => page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, ready: p?.spriteReady, hasHandler: p?.hasSpriteHandler, x: p?.x, hp: p?.health }; });
const sp = () => page.evaluate(() => window.__harness.sixPaths());
const p2hp = () => page.evaluate(() => window.__harness.p2()?.health);
const projNames = () => page.evaluate(() => (window.__harness.projectiles?.() || []).map(p => p.name));
const summonIds = () => page.evaluate(() => (window.__harness.summons?.() || []).map(s => s.summonId || s.id));

const PATHS = [
  { i: 0, name: "Deva Path",   prefix: "sixpaths_deva" },
  { i: 1, name: "Animal Path", prefix: "sixpaths_chiku" },
  { i: 2, name: "Preta Path",  prefix: "sixpaths_gakido" },
  { i: 3, name: "Human Path",  prefix: "sixpaths_ningen" },
  { i: 4, name: "Asura Path",  prefix: "sixpaths_asura" },
  { i: 5, name: "Naraka Path", prefix: "sixpaths_naraka" },
];
const ACTIONS = ["idle", "run", "jump", "guard", "hurt", "knockdown", "light", "heavy", "up", "air", "down_air"];

await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(500);

// ── 1. Boots to sprites ──
console.log("\n── 1. Boot ──");
const boot = await p1();
ok(boot.hasHandler && boot.ready && boot.sheet?.includes("sixpaths_"), `boots onto the SpriteHandler (not a box) → ${boot.sheet}`);

// ── 2. Swap matrix — every Path ──
console.log("\n── 2. Swap matrix (all 6 Paths) ──");
for (const P of PATHS) {
  await page.evaluate(() => window.__harness.fillEnergy());
  const r = await page.evaluate(i => window.__harness.setPath(i), P.i);
  await sleep(60);
  const s = await sp();
  const isBase = P.i === 0;
  await page.evaluate(() => window.__harness.benPose(null)); await sleep(80);
  const sheet = (await p1()).sheet;
  ok(r.path === P.i && s.name === P.name, `swap → ${P.name}`);
  ok(isBase ? !s.skinAnim : s.skinAnim, `${P.name} art layer ${isBase ? "= base animationData" : "= _skinAnim override"}`);
  ok(sheet?.includes(P.prefix), `${P.name} idle renders its own body (${sheet})`);
}

// ── 3. Fallback-box sweep — every action on every Path resolves to that Path's own art ──
console.log("\n── 3. Fallback-box sweep (no 128² boxes) ──");
for (const P of PATHS) {
  await page.evaluate(() => window.__harness.fillEnergy());
  await page.evaluate(i => window.__harness.setPath(i), P.i);
  await sleep(60);
  let boxes = 0; const bad = [];
  for (const act of ACTIONS) {
    await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), act);
    await sleep(70);
    const sheet = (await p1()).sheet;
    if (!(sheet && sheet.includes(P.prefix))) { boxes++; bad.push(`${act}:${sheet}`); }
  }
  await page.evaluate(() => window.__harness.benPose(null));
  ok(boxes === 0, `${P.name} — all ${ACTIONS.length} actions render its own sheets${bad.length ? " (BAD: " + bad.join(", ") + ")" : ""}`);
}

// ── 4. Each Path's signature kit connects ──
console.log("\n── 4. Signature kit per Path ──");
async function prep(pathI, dx = 90) {
  // fillEnergy BEFORE setPath — the swap itself costs 20 chakra and is energy-gated, so a drained bar
  // (e.g. right after the Ultimate) would silently block the swap and leave _path unchanged.
  await page.evaluate(i => { window.__harness.benPose(null); window.__harness.fillEnergy(); window.__harness.setPath(i); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); }, pathI);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + dx);
  await sleep(80);
}
// Deva — Almighty Push shoves + Ultimate damages
await prep(0);
const x0 = await page.evaluate(() => window.__harness.p2()?.x);
await page.evaluate(() => window.__harness.p1SpecialDir(null));
let maxDx = 0; for (let t = 0; t < 30; t++) { await sleep(16); const x = await page.evaluate(() => window.__harness.p2()?.x); maxDx = Math.max(maxDx, Math.abs((x ?? 0) - (x0 ?? 0))); }
ok(maxDx > 8, `Deva — Almighty Push shoves the foe (Δx=${Math.round(maxDx)})`);
await prep(0);
let h0 = await p2hp(); await page.evaluate(() => window.__harness.p1Ultimate()); await sleep(500);
ok((h0 ?? 0) - (await p2hp() ?? 0) > 0, `Deva — Six Paths Ultimate lands guaranteed damage`);
// Animal — a creature summons (assert via the persistent _lastChikuSummon + live list; oneHit summons
// despawn fast, so the persisted field is the race-free signal).
await prep(1); await sleep(1100);
let sawLive = false;
await page.evaluate(() => window.__harness.p1SpecialDir(null));
for (let t = 0; t < 40; t++) { await sleep(16); if ((await summonIds()).some(x => x?.startsWith("chikuSummon_"))) { sawLive = true; break; } }
const lastChiku = (await sp()).lastChiku;
ok(lastChiku === "dog" || sawLive, `Animal — Kuchiyose summons a creature (last=${lastChiku}, sawLive=${sawLive})`);
// Preta — shield absorbs + refunds
await prep(2);
await page.evaluate(() => window.__harness.p1SpecialDir(null)); await sleep(60);
const eCast = (await sp()).energy;
await page.evaluate(() => window.__harness.sixPathsTestBolt());
let absorbed = false, eAfter = eCast; for (let t = 0; t < 20; t++) { await sleep(16); const n = (await projNames()).filter(x => x === "sixPathsTestBolt").length; if (n === 0) { absorbed = true; eAfter = (await sp()).energy; break; } }
ok(absorbed && eAfter > eCast, `Preta — shield absorbs the projectile + refunds chakra`);
// Human — soul-rip connects
await prep(3, 80);
h0 = await p2hp(); const rip0 = (await sp()).ningendoRipped;
await page.evaluate(() => window.__harness.p1SpecialDir(null)); await sleep(360);
ok((h0 ?? 0) - (await p2hp() ?? 0) > 40 && (await sp()).ningendoRipped - rip0 === 1, `Human — Soul Rip connects hard`);
// Asura — a projectile fires + connects
await prep(4, 150);
h0 = await p2hp();
await page.evaluate(() => window.__harness.p1SpecialDir("F")); let fired = false;
for (let t = 0; t < 24; t++) { await sleep(16); if ((await projNames()).includes("asuraRocket")) { fired = true; break; } }
await sleep(340);
ok(fired && (h0 ?? 0) - (await p2hp() ?? 0) > 0, `Asura — Rocket Launcher fires + connects`);
// Naraka — judgment damages + restoration heals
await prep(5, 140);
h0 = await p2hp();
await page.evaluate(() => window.__harness.p1SpecialDir(null)); await sleep(340);
ok((h0 ?? 0) - (await p2hp() ?? 0) > 0, `Naraka — King of Hell Judgment damages`);
await page.evaluate(() => { window.__harness.setPath(5); window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1"); window.__harness.setP1Health(500); }); await sleep(60);
const hp0 = (await p1()).hp;
await page.evaluate(() => window.__harness.p1SpecialDir("D")); await sleep(340);
ok((await p1()).hp - hp0 > 50, `Naraka — Restoration heals Pain`);

// ── 5. Zero shared state with solo `pain` ──
console.log("\n── 5. Isolation from solo `pain` ──");
await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=pain`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.boot());
await sleep(400);
const iso = await page.evaluate(() => {
  const b0 = window.__harness.p2();
  window.__harness.fillEnergy(); window.__harness.setPath(4, "p1");
  const a = window.__harness.p1(), b = window.__harness.p2();
  return { keys: [a?.key, b?.key], p1Path: a?.sixPath, p2Path: b?.sixPath, p2SheetSame: b0?.spriteSheet === b?.spriteSheet };
});
ok(iso.keys[0] === "six_paths_pain" && iso.keys[1] === "pain", `both chars load side-by-side (${iso.keys.join(" vs ")})`);
ok(iso.p1Path === 4 && (iso.p2Path === undefined || iso.p2Path === null), `swap sets ONLY p1._path=${iso.p1Path}; solo pain has none (${iso.p2Path})`);
ok(iso.p2SheetSame, `solo pain's art untouched by the Six-Paths swap`);

console.log(`\n════════════════════════════════════════`);
console.log(`  SIX PATHS OF PAIN CANONICAL: ${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════════════`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,12).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
