// harness/gwen.test.mjs — CANONICAL full-kit smoke test for Gwen Tennyson (Ben 10).
// Covers every stage: sprite gate/stats (S1), movement/state sheets (S1), normals connect (S2), the
// 6-slot mana specials incl. constructs (S4), the Mana Blade ULT (S5), on-connect FX impacts (S6),
// win/lose pose wiring (S7), a full fallback-box sweep, and no JS errors. S3 = no command chain (none on sheet).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate(act => window.__harness.forceAction(act, "p1"), a);
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
async function seeHit(nameFrag, maxF = 24) { for (let f = 0; f < maxF; f++) { const pr = await projectiles(); if (pr.some(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase()) && !(p.name || "").includes("_impact"))) return true; await waitFrames(1); } return false; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=gwen`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  const def = await page.evaluate(() => window.__harness.charDef("gwen"));
  const ad = def.animationData;

  console.log("\n── S1: sprite gate + stats ──");
  check("P1 is Gwen", g.key === "gwen", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 2.25", Math.abs((g.spriteScale || 0) - 2.25) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1120 / EN 200", g.maxHealth === 1120 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  check("universe ben10 / energyType mana", def.universe === "ben10" && def.traits?.energyType === "mana", `u=${def.universe} e=${def.traits?.energyType}`);

  console.log("\n── S1: movement/state sheets resolve ──");
  for (const [act, tag] of [["idle","gwen_idle"],["guard","gwen_guard"],["walk","gwen_walk"],["run","gwen_run"],["dash","gwen_dash"],["jump","gwen_jump"],["fall","gwen_jump"],["crouch","gwen_crouch"],["hurt","gwen_hurt"],["knockdown","gwen_knockdown"]]) {
    await force(act); await waitFrames(3); const r = await p1();
    check(`${act} → ${tag}_uniform`, (r.spriteSheet || "").includes(`${tag}_uniform`), `sheet=${r.spriteSheet}`);
    await force(null); await waitFrames(1);
  }

  console.log("\n── S2: normals connect (×0.60) ──");
  for (const [name, key, tag] of [["light","j","gwen_light"],["heavy","k","gwen_heavy"],["upAttack","i","gwen_up"]]) {
    await prep(50); const h0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(2);
    let saw = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) saw = true; await waitFrames(2); }
    await page.keyboard.up(key); await waitFrames(18);
    check(`${name} → ${tag}_uniform + connects`, saw && (await p2()).health < h0, `saw=${saw} Δ=${(h0 - (await p2()).health).toFixed(0)}`);
    await waitGrounded();
  }

  console.log("\n── S4: 6-slot mana specials ──");
  await prep(140); let h = (await p2()).health; let r = await fireDir(null);
  check("N Mana Bolt casts + connects", r?.cast === "gwenCast" && (await seeHit("gwenBolt")) , ""); await waitFrames(20); check("  bolt dmg", (await p2()).health < h, ""); await waitGrounded();
  await prep(88); h = (await p2()).health; r = await fireDir("F");
  check("F Crescent Slash (melee) fires", r?.move === "gwenCrescent", `move=${r?.move}`); await waitFrames(10); check("  crescent dmg", (await p2()).health < h, ""); await waitGrounded();
  await prep(120); r = await fireDir("U"); check("U Spike-Crown construct spawns", r?.cast === "gwenCast" && (await seeHit("gwenSpike")), ""); await waitGrounded();
  await prep(90); h = (await p2()).health; r = await fireDir("D");
  check("D Mana Sphere construct spawns + connects", (await seeHit("gwenSphere")), ""); await waitFrames(18); check("  sphere dmg", (await p2()).health < h, ""); await waitGrounded();
  await prep(110); h = (await p2()).health; r = await fireDir("B");
  check("B Blue Vortex spawns + connects", (await seeHit("gwenVortex")), ""); await waitFrames(24); check("  vortex dmg", (await p2()).health < h, ""); await waitGrounded();

  console.log("\n── S5: Mana Blade ULT (freeze-cinematic, ~198 EFF) ──");
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await waitFrames(1);
  const a2 = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a2.x + 150); await waitFrames(2);
  const uh0 = (await p2()).health; const ures = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ULT casts gwenBlade", ures?.cast === true && ures?.castMove === "gwenBlade", `cast=${ures?.cast} pose=${ures?.castMove}`);
  await waitFrames(90); const dealt = uh0 - (await p2()).health;
  check("ULT payoff ~198 EFF (170–230)", dealt >= 170 && dealt <= 230, `dealt=${dealt.toFixed(0)}`);
  await waitGrounded();

  console.log("\n── S6: on-connect FX impacts ──");
  await prep(70); await fireDir(null);
  let ripple = false; for (let f = 0; f < 26; f++) { if ((await projectiles()).some(p => (p.name || "").includes("gwenBolt_impact"))) ripple = true; await waitFrames(1); }
  check("Mana Bolt ripple impact blooms on connect", ripple, "");
  await waitGrounded();

  console.log("\n── S7: win/lose pose wiring ──");
  check("win → gwen_win_uniform", (ad.win?.sheet || "").includes("gwen_win_uniform"), `sheet=${ad.win?.sheet}`);
  check("lose → knockdown reuse", (ad.lose?.sheet || "").includes("gwen_knockdown_uniform"), `sheet=${ad.lose?.sheet}`);
  await force("win"); await waitFrames(3); check("win pose renders", ((await p1()).spriteSheet || "").includes("gwen_win_uniform"), ""); await force(null);
  await force("lose"); await waitFrames(3); check("lose pose renders", ((await p1()).spriteSheet || "").includes("gwen_knockdown_uniform"), ""); await force(null);
  check("portrait asset on disk", fs.existsSync(path.join(ROOT, "gwen_portrait.png")), "");

  console.log("\n── fallback-box sweep (every action resolves a real gwen_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle","guard","walk","run","dash","jump","fall","crouch","hurt","knockdown","light","heavy","up","air","down_air","crouchLight","gwenCast","gwenCrescent","gwenBlade","win","lose"]) {
    await force(act); await waitFrames(2); const rr = await p1();
    if (!(rr.spriteSheet || "").includes("gwen_")) boxHit.push(`${act}:${rr.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("no action falls back to the 128×128 box", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors across the full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
