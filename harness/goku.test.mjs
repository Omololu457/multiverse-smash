// harness/goku.test.mjs — CANONICAL full-kit smoke test for Goku (Dragon Ball, 4-form Extreme Butoden build).
// Covers every stage: sprite gate/stats + portrait (S1), movement/state sheets (S1), normals connect (S2),
// the Fwd+Heavy "Meteor Combination" rush chain (S3), the melee-only Dragon Fist special (S4), the
// base→SSJ→SSG→SSB transform ladder + per-form art-swap (S5), Base-only Kaioken (S6), win/lose wiring (S7),
// a full fallback-box sweep, and no JS errors. See GOKU_ASSET_MAP.md.
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
const setKi = (v) => page.evaluate(x => window.__harness.p1GokuSetEnergy(x), v);
const stepForm = () => page.evaluate(() => window.__harness.p1GokuStepForm());
const revertForm = () => page.evaluate(() => window.__harness.p1GokuRevert());
const gokuForm = () => page.evaluate(() => window.__harness.p1GokuForm());
const kaioken = () => page.evaluate(() => window.__harness.p1GokuKaioken());
const kaiState = () => page.evaluate(() => window.__harness.p1GokuKaiokenState());
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  const cd = await page.evaluate(() => window.__harness.charDef("goku"));
  const ad = cd.animationData;

  console.log("\n── S1: sprite gate + stats + portrait ──");
  check("P1 is Goku", g.key === "goku", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.1", Math.abs((g.spriteScale || 0) - 1.1) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1200 / EN 200", g.maxHealth === 1200 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  check("portrait wired → goku_portrait.png", (cd.portrait || g.portrait || "").includes("goku_portrait"), `portrait=${cd.portrait || g.portrait}`);

  console.log("\n── S1: movement/state + S2/S3/S4/S7 sheets resolve (no box) ──");
  const wants = {
    idle: "goku_base_idle_uniform", dash: "goku_base_dash_uniform", jump: "goku_base_jump_uniform",
    crouch: "goku_base_crouch_uniform", guard: "goku_base_guard_uniform", hurt: "goku_base_hurt_uniform",
    knockdown: "goku_base_knockdown_uniform", getup: "goku_base_getup_uniform",
    light: "goku_base_light_uniform", heavy: "goku_base_heavy_uniform", up: "goku_base_upAttack_uniform",
    air: "goku_base_airAttack_uniform", down_air: "goku_base_downAir_uniform", crouchLight: "goku_base_crouchLight_uniform",
    gokuRush1: "goku_base_rush1_uniform", gokuRush2: "goku_base_rush2_uniform", gokuRush3: "goku_base_rush3_uniform",
    dragonFist: "goku_base_heavy_uniform", win: "goku_base_win_uniform", lose: "goku_base_knockdown_uniform",
  };
  for (const [k, tag] of Object.entries(wants)) check(`${k} → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── S2: a normal connects (light, via ×0.60) ──");
  await prep(48); const h0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(6);
  check(`light connects (P2 dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");

  console.log("\n── S3: Fwd+Heavy rush reaches the launcher finisher ──");
  await prep(50);
  const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  const seen = new Set();
  const rec = async () => { const m = (await page.evaluate(() => window.__harness.gokuCmd("p1")))?.move || ""; if (/^gokuRush[123]$/.test(m)) seen.add(m); };
  const tapK = async () => { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); };
  const waitCancel = async () => { await page.waitForFunction(() => { const c = window.__harness.gokuCmd("p1"); return c && c.attacking && c.phase === "recovery" && c.connected && c.rekkaNext; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); };
  await page.keyboard.down(fwd); await tapK(); await rec();
  await waitCancel(); await tapK(); for (let i = 0; i < 3; i++) { await rec(); await waitFrames(1); }
  await waitCancel(); await tapK(); for (let i = 0; i < 10; i++) { await rec(); await waitFrames(1); }
  await page.keyboard.up(fwd); await waitFrames(4);
  check("rush chain reached gokuRush3 launcher", seen.has("gokuRush1") && seen.has("gokuRush3"), [...seen].join(","));

  console.log("\n── S4: Dragon Fist is the LONE special — melee, no projectile (Kamehameha cut) ──");
  await prep(50); await setKi(200);
  const cast = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  check("special fires Dragon Fist", cast?.move === "dragonFist", `move=${cast?.move}`);
  let anyProj = 0; for (let i = 0; i < 10; i++) { anyProj = Math.max(anyProj, (await projectiles()).length); await waitFrames(1); }
  check("Dragon Fist spawns no projectile (melee-only)", anyProj === 0, `maxProj=${anyProj}`);
  await waitGrounded();

  console.log("\n── S5: transform ladder base→ssj→ssg→ssblue + per-form art-swap ──");
  check("transformationOrder base→ssj→ssg→ssblue", JSON.stringify(cd.transformationOrder) === JSON.stringify(["base", "ssj", "ssg", "ssblue"]), JSON.stringify(cd.transformationOrder));
  await revertForm(); await setKi(200); await stepForm(); await page.evaluate(() => window.__harness.resetFighterInput?.("p1")); await waitFrames(16);
  check("SSJ art-swap → goku_ssj_idle_uniform", ((await p1()).spriteSheet || "").includes("goku_ssj_idle_uniform"), `sheet=${(await p1()).spriteSheet}`);
  await setKi(200); await stepForm(); await setKi(200); await stepForm(); const f3 = await gokuForm();
  check("reaches SSB (idx 3, dmg ×2)", f3.idx === 3 && Math.abs(f3.dmg - 2) < 0.02, `idx=${f3.idx} dmg=${f3.dmg}`);
  await revertForm(); await page.evaluate(() => window.__harness.resetFighterInput?.("p1")); await waitFrames(16);
  check("revert → base art", ((await p1()).spriteSheet || "").includes("goku_base_idle_uniform"), `sheet=${(await p1()).spriteSheet}`);

  console.log("\n── S6: Base-only Kaioken toggle ──");
  await revertForm(); while ((await kaiState()).level !== 0) await kaioken(); await waitFrames(2);
  await kaioken(); const k1 = await kaiState();
  check("Kaioken tier 1 (dmg ×1.3)", k1.level === 1 && Math.abs(k1.dmg - 1.3) < 0.02, `lvl=${k1.level} dmg=${k1.dmg}`);
  while ((await kaiState()).level !== 0) await kaioken();

  console.log("\n── S7: win/lose poses render ──");
  await prep(60);
  await force("win"); await waitFrames(4); const win = await p1(); await force(null);
  check("win renders goku_base_win_uniform", (win.spriteSheet || "").includes("goku_base_win_uniform"), `sheet=${win.spriteSheet}`);
  await force("lose"); await waitFrames(4); const lose = await p1(); await force(null);
  check("lose reuses goku_base_knockdown_uniform", (lose.spriteSheet || "").includes("goku_base_knockdown_uniform"), `sheet=${lose.spriteSheet}`);

  console.log("\n── fallback-box sweep: every action resolves a real goku_ sheet ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "crouch", "guard", "hurt", "knockdown", "getup", "light", "heavy", "up", "air", "down_air", "crouchLight", "win", "lose"]) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("goku_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
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
