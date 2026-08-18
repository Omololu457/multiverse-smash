// harness/green_lantern.test.mjs — CANONICAL Green Lantern (Hal Jordan, DC) regression.
// STATIC every-sheet + portrait on-disk sweep · gate/stats/Willpower-label/dc/canFly · movement/state
// (incl. flight + honest reuses) · 5 normals connect · Fwd+Heavy glSpinKick command normal · Energy Beam
// (P-hold) + Flight (P-tap) on the dual-use charge button · 6 construct specials fire+spawn · the "Will
// Made Manifest" multi-construct ULT (casts + guaranteed ~198 from out of range + no-dup) · fallback-box
// sweep across the full animationData. Per-stage green_lantern_stage1..6 carry the fine-grained coverage.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function setup(gap = 100) { await waitGrounded(); const arena = await page.evaluate(() => window.__harness.arena()); await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.34)); await waitFrames(1); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2); await page.evaluate(() => window.__harness.fillEnergy?.()); }
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  // ── STATIC: every animationData sheet + the projectile sheets + portrait exist on disk ──
  console.log("\n── static asset sweep ──");
  const sheets = ["idle","run","jump","fall","flight","hurt","knockdown","light","heavy","up","air","spinkick","beam","fist","lion","blade","tentacle","spike","sphere","win"].map(s => `gl_${s}_uniform.png`);
  const missing = sheets.filter(s => !fs.existsSync(path.join(ROOT, s)));
  check("all gl_*_uniform sheets exist on disk", missing.length === 0, missing.join(", "));
  check("portrait gl_portrait.png exists", fs.existsSync(path.join(ROOT, "gl_portrait.png")), "");

  await page.goto(`${base}/index.html?harness=1&p1=green_lantern`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── gate / stats / traits ──
  console.log("\n── gate + stats ──");
  const g = await p1();
  check("P1 is Green Lantern (sprite handler)", g.key === "green_lantern" && g.hasSpriteHandler, `key=${g.key}`);
  check("idle → gl_idle_uniform", (g.spriteSheet || "").includes("gl_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("scale 1.4 / HP 1150 / EN 200", Math.abs((g.spriteScale||0)-1.4) < 0.01 && g.maxHealth === 1150 && g.maxEnergy === 200, `scale=${g.spriteScale} hp=${g.maxHealth} en=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("green_lantern"));
  check("dc / willpower / canFly / versatile", def?.universe === "dc" && def?.traits?.energyType === "willpower" && def?.traits?.canFly === true && def?.traits?.scaling === "versatile", `${def?.universe}/${def?.traits?.energyType}/${def?.traits?.canFly}`);
  check("ultimate = 'Will Made Manifest', cost 100", def?.ultimate?.name === "Will Made Manifest" && def?.ultimate?.cost === 100, `${JSON.stringify(def?.ultimate)}`);

  // ── movement / honest reuses ──
  console.log("\n── movement / state ──");
  for (const [act, sheet] of [["run","gl_run_uniform"],["jump","gl_jump_uniform"],["fall","gl_fall_uniform"],["fly","gl_flight_uniform"],["hurt","gl_hurt_uniform"],["knockdown","gl_knockdown_uniform"]]) {
    await force(act); await waitFrames(3); const mv = await p1(); await force(null); await waitFrames(1);
    check(`${act} → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `sheet=${mv.spriteSheet}`);
  }
  for (const [act, sheet] of [["walk","gl_run_uniform"],["dash","gl_run_uniform"],["guard","gl_idle_uniform"],["getup","gl_idle_uniform"]]) {
    await force(act); await waitFrames(3); const mv = await p1(); await force(null); await waitFrames(1);
    check(`${act} → ${sheet} (honest reuse)`, (mv.spriteSheet || "").includes(sheet), `sheet=${mv.spriteSheet}`);
  }

  // ── 5 normals connect ──
  console.log("\n── normals ──");
  for (const [name, key, sheet] of [["light","j","gl_light_uniform"],["heavy","k","gl_heavy_uniform"],["upAttack","i","gl_up_uniform"]]) {
    await setup(); const hp0 = (await p2()).health; await page.keyboard.down(key); const mv = await waitSheet(sheet);
    check(`${name} → ${sheet}`, (mv.spriteSheet||"").includes(sheet), `sheet=${mv.spriteSheet}`); await page.keyboard.up(key); await waitFrames(22);
    check(`${name} connects`, (await p2()).health < hp0, ``); await waitFrames(10);
  }
  { await setup(46); const hp0=(await p2()).health; await page.evaluate(()=>window.__harness.liftP1(40)); await page.keyboard.down("j"); await waitSheet("gl_air_uniform"); await page.keyboard.up("j"); await waitFrames(14); check("air connects", (await p2()).health < hp0, ``); await waitGrounded(); }

  // ── command normal ──
  console.log("\n── Fwd+Heavy command normal ──");
  { let fired="", dmg=0; for (let a=0;a<5 && !(fired && dmg>0);a++){ await setup(60); const hp0=(await p2()).health; await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); await page.keyboard.down("k"); const mv=await waitSheet("gl_spinkick_uniform",14); if((mv.spriteSheet||"").includes("gl_spinkick_uniform")) fired=mv.spriteSheet; await page.keyboard.up("k"); await waitFrames(20); dmg+=Math.max(0,hp0-(await p2()).health); await page.keyboard.up("d"); await waitGrounded(); }
    check("glSpinKick fires + connects", fired.includes("gl_spinkick_uniform") && dmg>0, `dmg=${dmg.toFixed(0)}`); }

  // ── charge button: P-tap flight, P-hold beam ──
  console.log("\n── flight + beam (charge button) ──");
  await setup(120); await waitGrounded();
  const f0=(await p1()).flightActive; await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p"); await waitFrames(3);
  check("P-tap toggles Flight", (await p1()).flightActive === true && f0 === false, ``);
  await page.keyboard.down("p"); await waitFrames(1); await page.keyboard.up("p"); await waitFrames(3); await waitGrounded();
  { await setup(120); const hp0=(await p2()).health; await page.keyboard.down("p"); await waitFrames(20); await page.keyboard.up("p"); let saw=false; for(let i=0;i<18&&!saw;i++){await waitFrames(1); if((await projs()).some(p=>p.name==="glBeam")) saw=true;} await waitFrames(10); check("P-hold Energy Beam spawns + connects", saw && (await p2()).health < hp0, ``); await waitGrounded(); }

  // ── 6 construct specials fire + spawn ──
  console.log("\n── construct specials ──");
  for (const [dir,name,gap] of [[null,"glFist",100],["F","glLion",130],["B","glBlade",150],["D","glTentacle",90]]) {
    await setup(gap); const hp0=(await p2()).health; const res=await fireDir(dir); let saw=false; for(let i=0;i<14&&!saw;i++){await waitFrames(1); if((await projs()).some(p=>p.name===name)) saw=true;} await waitFrames(18);
    check(`${name}: cast=glBeam + spawns + connects`, res.cast==="glBeam" && saw && (await p2()).health < hp0, `cast=${res.cast}`); await waitGrounded(); await waitFrames(3);
  }
  { await setup(440); const res=await fireDir("U"); let sp=null; for(let i=0;i<14&&!sp;i++){await waitFrames(1); sp=(await projs()).find(p=>p.name==="glSpike")||null;} check("glSpike: spawns + rises (anti-air)", res.cast==="glBeam" && !!sp && sp.vy<0, `vy=${sp?.vy}`); await waitGrounded(); }
  { await setup(440); await page.evaluate(()=>window.__harness.liftP1(70)); await waitFrames(1); const res=await fireDir(null); let sp=null; for(let i=0;i<14&&!sp;i++){await waitFrames(1); sp=(await projs()).find(p=>p.name==="glSphere")||null;} check("glSphere: spawns airborne + drops", res.cast==="glBeam" && !!sp && sp.vy>0, `vy=${sp?.vy}`); await waitGrounded(); }

  // ── ULTIMATE: guaranteed sure-hit + no-dup ──
  console.log("\n── ultimate: Will Made Manifest ──");
  await setup(150); const nBefore = await page.evaluate(() => window.__harness.state().fighters ?? 2);
  const en0=(await p1()).energy; const hp0=(await p2()).health;
  const res=await page.evaluate(()=>window.__harness.p1Ultimate()); const en1=(await p1()).energy;
  check("ult casts (glBeam pose) + spends ~100", res?.cast===true && res?.castMove==="glBeam" && Math.round(en0-en1)>=98, `cast=${res?.cast} en ${Math.round(en0)}→${Math.round(en1)}`);
  let fx=new Set(); for(let i=0;i<62;i++){await waitFrames(1); for(const p of await projs()) if(String(p.name).startsWith("glUlt_")) fx.add(p.name);}
  await waitFrames(20); const dealt=hp0-(await p2()).health;
  check("guaranteed payoff ~198 EFF from out of range", dealt>=170 && dealt<=230, `dealt=${dealt.toFixed(0)}`);
  check("constructs manifest during cinematic (≥3)", fx.size>=3, `saw=${[...fx].join(",")}`);
  const nAfter = await page.evaluate(() => window.__harness.state().fighters ?? 2);
  check("no duplicate fighter spawned (inline cinematic)", nAfter === nBefore, `before=${nBefore} after=${nAfter}`);

  // ── fallback-box sweep over the full animationData ──
  console.log("\n── fallback-box sweep ──");
  const box = [];
  for (const act of ["idle","walk","run","dash","jump","fall","fly","flyMove","guard","hurt","knockdown","getup","light","heavy","up","air","down_air","glSpinKick","glBeam"]) {
    await force(act); await waitFrames(2); const r = await p1(); const sh = r.spriteSheet || "";
    if (!/gl_[a-z]+_uniform/.test(sh)) box.push(`${act}:${sh||"null"}`); await force(null); await waitFrames(1);
  }
  check("every action resolves a real gl_ sheet (no 128² box)", box.length === 0, box.join(" | "));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Green Lantern CANONICAL: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
