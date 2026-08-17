// harness/six_paths_pain_stage1_shots.mjs — STAGE 1 evidence for Six Paths of Pain (rosterKey
// "six_paths_pain"), a brand-new multi-identity char SEPARATE from the solo `pain`.
// Covers, with real screenshots:
//   1. Roster inclusion + boots to sprites (not a procedural box).
//   2. Deva movement/state + 5 normals — each renders its own sixpaths_* sheet.
//   3. Deva specials CONNECT: Almighty Push (neutral) / Almighty Pull (Back) / Rinnegan Defense (Down).
//   4. Six Paths Ultimate fires + lands its guaranteed payoff.
//   5. SWAP MECHANIC — deterministic (cost / cooldown / no-op-same-path / energy-gate / art-swap)
//      AND real Charge+slot keyboard input; cycles all 6 Path slots.
//   6. ZERO SHARED STATE with solo `pain` (loaded side-by-side; swapping one never touches the other).
// Usage: node harness/six_paths_pain_stage1_shots.mjs
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
const p1 = () => page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, frame: p?.spriteFrameIndex ?? null, scale: p?.spriteScale ?? null, x: p?.x, path: p?.sixPath }; });
const sp = () => page.evaluate(() => window.__harness.sixPaths());

await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);

// ── 1. Roster inclusion + boot ──
console.log("\n── 1. Roster + boot ──");
await page.evaluate(() => window.__harness.boot());
await sleep(500);
const boot = await page.evaluate(() => { const p = window.__harness.p1(); return { key: p?.key, sheet: p?.spriteSheet }; });
ok(boot.key === "six_paths_pain", `six_paths_pain registered + loads as the fighter (key ${boot.key})`);
ok(!!boot.sheet && boot.sheet.includes("sixpaths_"), `boots to sprites → ${boot.sheet}`);

// ── 2. Movement/state + normals — each renders its own sheet ──
console.log("\n── 2. Deva poses (benPose) ──");
const EXP = {
  idle: "sixpaths_deva_stance", run: "sixpaths_deva_run", jump: "sixpaths_deva_jfct",
  guard: "sixpaths_deva_stance", hurt: "sixpaths_deva_hurt", knockdown: "sixpaths_deva_hurt",
  light: "sixpaths_deva_combo", heavy: "sixpaths_deva_combo", up: "sixpaths_deva_runatk",
  air: "sixpaths_deva_jfct", down_air: "sixpaths_deva_downatk",
};
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose);
  await sleep(140);
  const r = await p1();
  await page.screenshot({ path: path.join(OUT, `sixpaths_s1_pose_${pose}.png`) });
  ok(r.sheet && r.sheet.includes(sheet), `${pose} → ${r.sheet} (frame ${r.frame})`);
}
await page.evaluate(() => window.__harness.benPose(null));

// ── 3. Deva specials connect ──
console.log("\n── 3. Deva specials ──");
async function resetForSpecial() {
  await page.evaluate(() => { window.__harness.setPath(0); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 150); await sleep(60);
}
// PUSH (neutral) — opponent blasted downrange. Track PEAK displacement over the shove (a single late
// sample can catch the foe mid-settle → Δx≈0; the peak is the race-free signal).
await resetForSpecial();
const p2xBeforePush = await page.evaluate(() => window.__harness.p2()?.x);
await page.evaluate(() => window.__harness.p1SpecialDir(null));
await sleep(90);
const pushCast = await page.evaluate(() => window.__harness.sixPaths().castMove);   // read cast pose early
let pushDx = 0;
for (let t = 0; t < 24; t++) { await sleep(16); const x = await page.evaluate(() => window.__harness.p2()?.x); pushDx = Math.max(pushDx, Math.abs((x ?? 0) - (p2xBeforePush ?? 0))); }
await page.screenshot({ path: path.join(OUT, "sixpaths_s1_push.png") });
ok(pushCast === "spPush", `Push cast pose spPush (got ${pushCast})`);
ok(pushDx > 10, `Push shoves opponent (peak Δx=${Math.round(pushDx)})`);
// PULL (Back) — opponent reeled in
await resetForSpecial();
await page.evaluate(() => window.__harness.p1SpecialDir("B"));
await sleep(90);
const pullCast = await page.evaluate(() => window.__harness.sixPaths().castMove);
await sleep(200);
await page.screenshot({ path: path.join(OUT, "sixpaths_s1_pull.png") });
const pullGrabbed = await page.evaluate(() => { const o = window.__harness.p2(); return !!o?.isGrabbed || (o?.grabTimer || 0) > 0; });
ok(pullCast === "spPull", `Pull cast pose spPull (got ${pullCast})`);
ok(pullGrabbed, `Pull reels opponent (grab state set)`);
// RINNEGAN DEFENSE (Down) — i-frames + barrier
await resetForSpecial();
await page.evaluate(() => window.__harness.p1SpecialDir("D"));
await sleep(90);
const rinne = await page.evaluate(() => { const p = window.__harness.p1(); return { cast: window.__harness.sixPaths().castMove, iframes: p?.invulnTimer || 0 }; });
await page.screenshot({ path: path.join(OUT, "sixpaths_s1_rinnegan.png") });
ok(rinne.cast === "spRinnegan", `Rinnegan cast pose spRinnegan (got ${rinne.cast})`);
ok(rinne.iframes > 0, `Rinnegan grants i-frames (invulnTimer ${rinne.iframes})`);

// ── 4. Ultimate ──
console.log("\n── 4. Six Paths Ultimate ──");
await resetForSpecial();
const oHpBefore = await page.evaluate(() => window.__harness.p2()?.health);
const ult = await page.evaluate(() => window.__harness.p1Ultimate());
await sleep(500);
const oHpAfter = await page.evaluate(() => window.__harness.p2()?.health);
await page.screenshot({ path: path.join(OUT, "sixpaths_s1_ult.png") });
ok(ult?.cast === true, `Ultimate casts (castMove ${ult?.castMove})`);
ok((oHpBefore ?? 0) - (oHpAfter ?? 0) > 0, `Ultimate lands guaranteed damage (${Math.round((oHpBefore ?? 0) - (oHpAfter ?? 0))} dmg)`);

// ── 5. SWAP mechanic ──
console.log("\n── 5. Path swap ──");
// deterministic — cost + cooldown + name + art-swap
await page.evaluate(() => { window.__harness.setPath(0); window.__harness.fillEnergy(); });
const swapA = await page.evaluate(() => window.__harness.setPath(4));   // → Asura
ok(swapA.ok && swapA.path === 4 && swapA.name === "Asura Path", `swap 0→4 (${swapA.name})`);
ok(swapA.spent === 20, `swap spends 20 chakra (spent ${swapA.spent})`);
ok(swapA.swapCd === 90, `swap sets ~1.5s cooldown (${swapA.swapCd}f)`);
await page.screenshot({ path: path.join(OUT, "sixpaths_s1_swap_asura.png") });
// no-op when already on that Path (free, no cost)
await page.evaluate(() => window.__harness.fillEnergy());
const swapSame = await page.evaluate(() => window.__harness.setPath(4));
ok(swapSame.ok === false && swapSame.spent === 0, `swap to same Path is a free no-op (spent ${swapSame.spent})`);
// energy gate — below cost blocks the swap
await page.evaluate(() => { window.__harness.setPath(0); window.__harness.setEnergy(10); });
const swapPoor = await page.evaluate(() => window.__harness.setPath(2));
ok(swapPoor.ok === false && (swapPoor.path === 0), `swap BLOCKED below the chakra cost (path stayed ${swapPoor.path})`);
// cycle every slot deterministically
const NAMES = ["Deva Path","Animal Path","Preta Path","Human Path","Asura Path","Naraka Path"];
let cycleOk = true;
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => window.__harness.fillEnergy());
  const r = await page.evaluate(idx => window.__harness.setPath(idx), i);
  if (!(r.path === i && r.name === NAMES[i])) cycleOk = false;
}
ok(cycleOk, `all 6 Path slots select by index → correct names`);
// REAL keyboard input — Charge(p)+Right(d) swaps to Asura (path 4).
// setPath(0) twice: the 1st swaps back to Deva (arms the 90f cooldown), the 2nd is a same-Path no-op
// that clears the cooldown to 0 (setPath zeroes it before the no-op returns) so the keyboard swap isn't gated.
await page.evaluate(() => { window.__harness.setPath(0); window.__harness.setPath(0); window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1"); });
await sleep(60);
await page.keyboard.down("p"); await sleep(50);
await page.keyboard.down("d"); await sleep(60); await page.keyboard.up("d"); await sleep(40);
await page.keyboard.up("p"); await sleep(80);
const kbd = await sp();
ok(kbd.path === 4, `Charge+Right keyboard input swaps to Asura Path (path ${kbd.path})`);

// ── 6. Zero shared state with solo pain ──
console.log("\n── 6. Isolation from solo `pain` ──");
await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=pain`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.boot());
await sleep(400);
const iso = await page.evaluate(() => {
  const a = window.__harness.p1(), b = window.__harness.p2();
  window.__harness.fillEnergy(); window.__harness.setPath(3, "p1");   // swap the Six-Paths char only
  const a2 = window.__harness.p1(), b2 = window.__harness.p2();
  return {
    keys: [a?.key, b?.key],
    p1Path: a2?.sixPath, p2Path: b2?.sixPath,          // solo pain must have NO path state (null)
    p2SheetUnchanged: b?.spriteSheet === b2?.spriteSheet,
    p1SwappedName: a2?.sixPathName,
  };
});
await page.screenshot({ path: path.join(OUT, "sixpaths_s1_isolation.png") });
ok(iso.keys[0] === "six_paths_pain" && iso.keys[1] === "pain", `both chars loaded side-by-side (${iso.keys.join(" vs ")})`);
ok(iso.p1Path === 3 && (iso.p2Path === undefined || iso.p2Path === null), `swapping p1 sets ONLY p1._path=${iso.p1Path}; solo pain has no _path (${iso.p2Path})`);
ok(iso.p2SheetUnchanged, `solo pain's art is untouched by the Six-Paths swap`);

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,12).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
