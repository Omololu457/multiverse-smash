// harness/bardock.test.mjs — CANONICAL full-kit smoke test for Bardock (Dragon Ball, Extreme Butoden build).
// Covers every stage: sprite gate/stats + portrait (S1), movement/state sheets (S1), a normal connects (S2),
// the Fwd+Heavy "Blade Rush" SWORD chain (S3), the Rebellion Rush (MELEE, no projectile) + Ki Charge specials
// (S4), the Super Saiyan COSMETIC flash (S5 — taunt: gold then reverts, NOT a form), win/lose + REAL intro
// wiring (S6), a full fallback-box sweep, and no JS errors. ★MELEE-only + sword differentiator; no ranged
// special; SSJ = cosmetic only (no transform). See BARDOCK_ASSET_MAP.md.
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
  await page.goto(`${base}/index.html?harness=1&p1=bardock&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  const cd = await page.evaluate(() => window.__harness.charDef("bardock"));
  const ad = cd.animationData;

  console.log("\n── S1: sprite gate + stats + portrait ──");
  check("P1 is Bardock", g.key === "bardock", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.0", Math.abs((g.spriteScale || 0) - 1.0) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1200 / EN 200", g.maxHealth === 1200 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  check("portrait wired → bardock_portrait.png", (cd.portrait || g.portrait || "").includes("bardock_portrait"), `portrait=${cd.portrait || g.portrait}`);
  check("no ranged ULT (no beam/nova on the sheet — melee-only identity)", !cd.ultimate, `ultimate=${JSON.stringify(cd.ultimate)}`);
  check("no `transformations` system (SSJ is cosmetic)", !cd.transformations, "");

  console.log("\n── S1–S6: every action sheet resolves (no box) ──");
  const wants = {
    idle: "bardock_idle_uniform", dash: "bardock_dash_uniform", jump: "bardock_jump_uniform", fall: "bardock_fall_uniform",
    crouch: "bardock_crouch_uniform", guard: "bardock_guard_uniform", guardHit: "bardock_guardhit_uniform",
    hurt: "bardock_hurt_uniform", knockdown: "bardock_knockdown_uniform", getup: "bardock_getup_uniform",
    taunt: "bardock_ssjflash_uniform",
    light: "bardock_light_uniform", heavy: "bardock_heavy_uniform", up: "bardock_up_uniform",
    air: "bardock_air_uniform", down_air: "bardock_downair_uniform", crouchLight: "bardock_crouchlight_uniform",
    bardockRush1: "bardock_rush1_uniform", bardockRush2: "bardock_rush2_uniform", bardockRush3: "bardock_rush3_uniform",
    bardockRebellion: "bardock_rebellion_uniform", bardockKiCharge: "bardock_kicharge_uniform",
    win: "bardock_win_uniform", lose: "bardock_knockdown_uniform", bardockIntro: "bardock_intro_uniform",
  };
  for (const [k, tag] of Object.entries(wants)) check(`${k} → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);
  check("walk borrows idle (no ground stride)", (ad.walk?.sheet || "").includes("bardock_idle_uniform"), `sheet=${ad.walk?.sheet}`);
  check("heavy is the SWORD slash (differentiator); down_air its own diving-sword (not air reuse)", (ad.heavy?.sheet || "").includes("bardock_heavy_uniform") && (ad.down_air?.sheet || "") !== (ad.air?.sheet || ""), "");

  console.log("\n── S2: a normal connects (light, via ×0.60) ──");
  await prep(48); const h0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(6);
  check(`light connects (P2 dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");

  console.log("\n── S3: Fwd+Heavy Blade Rush SWORD chain reaches the launcher finisher ──");
  await prep(50);
  const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  const seen = new Set();
  const rec = async () => { const m = (await page.evaluate(() => window.__harness.bardockCmd("p1")))?.move || ""; if (/^bardockRush[123]$/.test(m)) seen.add(m); };
  const tapK = async () => { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); };
  const waitCancel = async () => { await page.waitForFunction(() => { const c = window.__harness.bardockCmd("p1"); return c && c.attacking && c.phase === "recovery" && c.connected && c.rekkaNext; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); };
  await page.keyboard.down(fwd); await tapK(); await rec();
  await waitCancel(); await tapK(); for (let i = 0; i < 3; i++) { await rec(); await waitFrames(1); }
  await waitCancel(); await tapK(); for (let i = 0; i < 10; i++) { await rec(); await waitFrames(1); }
  await page.keyboard.up(fwd); await waitFrames(4);
  check("Blade Rush reached bardockRush3 launcher finisher", seen.has("bardockRush1") && seen.has("bardockRush3"), [...seen].join(","));

  console.log("\n── S4: Rebellion Rush (MELEE, no projectile) + Ki Charge (resource build) ──");
  await prep(70); const hr0 = (await p2()).health;
  const rr = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  check("neutral special = Rebellion Rush (bardockRebellion)", rr?.move === "bardockRebellion", `move=${rr?.move}`);
  await waitFrames(10);
  check(`Rebellion Rush connects (dmg ${((hr0 - (await p2()).health)).toFixed(0)})`, hr0 - (await p2()).health > 0, "");
  check("Rebellion Rush spawns NO projectile (melee, not ranged)", (await projectiles()).length === 0, `proj=${(await projectiles()).length}`);
  await waitGrounded();
  await prep(150); await page.evaluate(() => window.__harness.setEnergy?.(40)); await waitFrames(2);
  const ec0 = (await p1()).energy;
  const kc = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
  check("Down special casts Ki Charge (golden ki-orb)", kc?.cast === "bardockKiCharge", `cast=${kc?.cast}`);
  await waitFrames(40);
  check(`Ki Charge refills Ki (Δ +${(((await p1()).energy) - ec0).toFixed(0)})`, (await p1()).energy > ec0 + 5, "");

  console.log("\n── S5: Super Saiyan COSMETIC flash (taunt: gold, then reverts — NOT a form) ──");
  await prep(120); const scale0 = (await p1()).spriteScale;
  await force("taunt"); await waitFrames(3);
  let sawGold = false; for (let i = 0; i < 6; i++) { if (((await p1()).spriteSheet || "").includes("bardock_ssjflash_uniform")) sawGold = true; await waitFrames(2); }
  check("SSJ flash renders the gold sheet", sawGold, "");
  await force("idle"); await waitFrames(4);
  check("reverts to BASE idle after the flash", ((await p1()).spriteSheet || "").includes("bardock_idle_uniform"), "");
  await force("heavy"); await waitFrames(3);
  check("combat kit stays BASE (heavy still base sword)", ((await p1()).spriteSheet || "").includes("bardock_heavy_uniform"), "");
  check("no stat change from the flash (scale)", Math.abs(((await p1()).spriteScale || 0) - scale0) < 0.001, "");
  await force(null); await waitFrames(2);

  console.log("\n── S6: win / lose / REAL intro render ──");
  await prep(60);
  await force("win"); await waitFrames(4); const win = await p1(); await force(null);
  check("win renders REAL arms-crossed bardock_win_uniform (no borrow)", (win.spriteSheet || "").includes("bardock_win_uniform"), `sheet=${win.spriteSheet}`);
  await force("lose"); await waitFrames(4); const lose = await p1(); await force(null);
  check("lose reuses bardock_knockdown_uniform", (lose.spriteSheet || "").includes("bardock_knockdown_uniform"), `sheet=${lose.spriteSheet}`);
  await force("bardockIntro"); await waitFrames(4); const intro = await p1(); await force(null);
  check("intro renders REAL adjust-stance bardock_intro_uniform", (intro.spriteSheet || "").includes("bardock_intro_uniform"), `sheet=${intro.spriteSheet}`);
  check("introPool → bardockIntro (real entrance, not idle placeholder)", JSON.stringify(cd.introPool) === JSON.stringify(["bardockIntro"]), `introPool=${JSON.stringify(cd.introPool)}`);

  console.log("\n── fallback-box sweep: every action resolves a real bardock_ sheet ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "crouch", "guard", "guardHit", "hurt", "knockdown", "getup", "taunt", "light", "heavy", "up", "air", "down_air", "crouchLight", "win", "lose", "bardockIntro"]) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("bardock_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
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
