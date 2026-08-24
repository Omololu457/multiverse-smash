// harness/gotenks.test.mjs — CANONICAL full-kit smoke test for Gotenks (Super Saiyan, Extreme Butoden build).
// Covers every stage: sprite gate/stats + portrait (S1), movement/state sheets (S1), a normal connects (S2),
// the Fwd+Heavy "Kamikaze Barrage" rush chain (S3), the Ki Blast (procedural) + Ki Charge specials (S4), the
// Super Ghost Kamikaze Attack ULT (S5, ~198 EFF), win/lose wiring (S6), a full fallback-box sweep, and no JS
// errors. ★STANDALONE SS kit — no transform. See GOTENKS_ASSET_MAP.md.
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate(act => window.__harness.forceAction(act, "p1"), a);
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=gotenks&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  const cd = await page.evaluate(() => window.__harness.charDef("gotenks"));
  const ad = cd.animationData;

  console.log("\n── S1: sprite gate + stats + portrait ──");
  check("P1 is Gotenks", g.key === "gotenks", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.20", Math.abs((g.spriteScale || 0) - 1.20) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1200 / EN 200", g.maxHealth === 1200 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  check("portrait wired → gotenks_portrait.png", (cd.portrait || g.portrait || "").includes("gotenks_portrait"), `portrait=${cd.portrait || g.portrait}`);

  console.log("\n── S1/S2/S3/S4/S5/S6: every action sheet resolves (no box) ──");
  const wants = {
    idle: "gotenks_idle_uniform", dash: "gotenks_dash_uniform", jump: "gotenks_jump_uniform", fall: "gotenks_fall_uniform",
    crouch: "gotenks_crouch_uniform", guard: "gotenks_guard_uniform", guardHit: "gotenks_guardhit_uniform",
    hurt: "gotenks_hurt_uniform", knockdown: "gotenks_knockdown_uniform", getup: "gotenks_getup_uniform",
    taunt: "gotenks_taunt_uniform", dazed: "gotenks_dazed_uniform",
    light: "gotenks_light_uniform", heavy: "gotenks_heavy_uniform", up: "gotenks_up_uniform",
    air: "gotenks_air_uniform", down_air: "gotenks_air_uniform", crouchLight: "gotenks_crouchlight_uniform",
    gotenksRush1: "gotenks_rush1_uniform", gotenksRush2: "gotenks_rush2_uniform", gotenksRush3: "gotenks_rush3_uniform",
    gotenksKiBlast: "gotenks_kiblast_uniform", gotenksKiCharge: "gotenks_kicharge_uniform",
    gotenksGhostWind: "gotenks_ghostwind_uniform", gotenksGhostThrow: "gotenks_ghostthrow_uniform",
    win: "gotenks_taunt_uniform", lose: "gotenks_knockdown_uniform",
  };
  for (const [k, tag] of Object.entries(wants)) check(`${k} → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);
  // walk/run BORROW idle (no ground stride on the sheet)
  check("walk borrows idle", (ad.walk?.sheet || "").includes("gotenks_idle_uniform"), `sheet=${ad.walk?.sheet}`);

  console.log("\n── S2: a normal connects (light, via ×0.60) ──");
  await prep(48); const h0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(6);
  check(`light connects (P2 dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");

  console.log("\n── S3: Fwd+Heavy Kamikaze Barrage reaches the finisher ──");
  await prep(50);
  const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  const seen = new Set();
  const rec = async () => { const m = (await page.evaluate(() => window.__harness.gotenksCmd("p1")))?.move || ""; if (/^gotenksRush[123]$/.test(m)) seen.add(m); };
  const tapK = async () => { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); };
  const waitCancel = async () => { await page.waitForFunction(() => { const c = window.__harness.gotenksCmd("p1"); return c && c.attacking && c.phase === "recovery" && c.connected && c.rekkaNext; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); };
  await page.keyboard.down(fwd); await tapK(); await rec();
  await waitCancel(); await tapK(); for (let i = 0; i < 3; i++) { await rec(); await waitFrames(1); }
  await waitCancel(); await tapK(); for (let i = 0; i < 10; i++) { await rec(); await waitFrames(1); }
  await page.keyboard.up(fwd); await waitFrames(4);
  check("barrage chain reached gotenksRush3 finisher", seen.has("gotenksRush1") && seen.has("gotenksRush3"), [...seen].join(","));

  console.log("\n── S4: Ki Blast (procedural shard) + Ki Charge (resource build) ──");
  await prep(140); const hb0 = (await p2()).health;
  const kb = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  check("neutral special casts Ki Blast", kb?.cast === "gotenksKiBlast", `cast=${kb?.cast}`);
  let sawShard = false; for (let i = 0; i < 18 && !sawShard; i++) { if ((await projectiles()).some(p => (p.name || "").includes("gotenksKiBlast"))) sawShard = true; await waitFrames(1); }
  check("Ki Blast spawns a procedural shard", sawShard, "");
  await waitFrames(8); check(`Ki Blast connects (dmg ${((hb0 - (await p2()).health)).toFixed(0)})`, hb0 - (await p2()).health > 0, "");
  await waitGrounded();
  await prep(150); await page.evaluate(() => window.__harness.setEnergy?.(40)); await waitFrames(2);
  const ec0 = (await p1()).energy;
  const kc = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
  check("Down special casts Ki Charge", kc?.cast === "gotenksKiCharge", `cast=${kc?.cast}`);
  await waitFrames(40);
  check(`Ki Charge refills Ki (Δ +${(((await p1()).energy) - ec0).toFixed(0)})`, (await p1()).energy > ec0 + 5, "");

  console.log("\n── S5: Super Ghost Kamikaze ULT — guaranteed ~198 EFF ──");
  await prep(160); await page.evaluate(() => window.__harness.fillEnergy?.()); await waitFrames(2);
  const hu0 = (await p2()).health;
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ULT casts (gotenksGhostWind)", ult?.cast === true && ult?.castMove === "gotenksGhostWind", `cast=${ult?.cast} castMove=${ult?.castMove}`);
  let sawGhost = false; for (let i = 0; i < 20 && !sawGhost; i++) { if ((await projectiles()).some(p => (p.name || "").includes("gotenksGhost"))) sawGhost = true; await waitFrames(1); }
  check("ULT spawns kamikaze ghost projectiles", sawGhost, "");
  await waitFrames(46);
  const dealt = hu0 - (await p2()).health;
  check(`ULT payoff in top-ult band (~198 EFF; 150–240): ${dealt.toFixed(0)}`, dealt >= 150 && dealt <= 240, `dealt=${dealt}`);
  await waitGrounded();

  console.log("\n── S6: win/lose poses render ──");
  await prep(60);
  await force("win"); await waitFrames(4); const win = await p1(); await force(null);
  check("win renders gotenks_taunt_uniform (own taunt stopgap — no win art)", (win.spriteSheet || "").includes("gotenks_taunt_uniform"), `sheet=${win.spriteSheet}`);
  await force("lose"); await waitFrames(4); const lose = await p1(); await force(null);
  check("lose reuses gotenks_knockdown_uniform", (lose.spriteSheet || "").includes("gotenks_knockdown_uniform"), `sheet=${lose.spriteSheet}`);

  console.log("\n── fallback-box sweep: every action resolves a real gotenks_ sheet ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "crouch", "guard", "guardHit", "hurt", "knockdown", "getup", "taunt", "dazed", "light", "heavy", "up", "air", "down_air", "crouchLight", "win", "lose"]) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("gotenks_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("no fallback box on any action", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors across the full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
