// harness/vegeta_dark.test.mjs — CANONICAL full-kit smoke test for Dark Vegeta (Dragon Ball, akuma
// black-armor build). Covers every stage: sprite gate/stats + portrait (S1), movement/state sheets (S1),
// a normal connects (S2), the Fwd+Heavy "Villain's Rush" rekka → launcher (S3), the fixed-slot specials
// Ki Blast / Knife Slash / Sickle Throw (S4), the dark-aura transform + amplified ki blast (S5), win/lose +
// REAL dark-tendril intro wiring (S6), a full fallback-box sweep, and no JS errors. ★STANDALONE — the blue
// `vegeta` is untouched. See VEGETA_BLACK_ASSET_MAP.md.
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
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function prep(gap) {
  await waitGrounded();
  // ★GOTCHA (shared rekka pitfall): wait for the fighter to be fully idle before re-arming, else stale
  //   _cmdPrevHeavy / lingering recovery eats the next chain edge (rush2→rush3 cancel silently drops).
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1VegetaDarkRevert?.(); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegeta_dark&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  const cd = await page.evaluate(() => window.__harness.charDef("vegeta_dark"));
  const ad = cd.animationData;

  console.log("\n── S1: sprite gate + stats + portrait ──");
  check("P1 is Dark Vegeta", g.key === "vegeta_dark", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 2.1", Math.abs((g.spriteScale || 0) - 2.1) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1200 / EN 200", g.maxHealth === 1200 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  check("portrait wired → vegeta_dark_portrait.png", (cd.portrait || g.portrait || "").includes("vegeta_dark_portrait"), `portrait=${cd.portrait || g.portrait}`);
  check("HAS transform ladder base→darkAura→rose", JSON.stringify(cd.transformationOrder) === JSON.stringify(["base", "darkAura", "rose"]), JSON.stringify(cd.transformationOrder));
  check("blue `vegeta` is a SEPARATE roster entry (untouched)", !!(await page.evaluate(() => window.__harness.charDef("vegeta"))), "");

  console.log("\n── S1–S6: every action sheet resolves (no box) ──");
  const wants = {
    idle: "vegeta_dark_idle_uniform", idleCross: "vegeta_dark_idlecross_uniform", run: "vegeta_dark_dive_uniform",
    dash: "vegeta_dark_dive_uniform", jump: "vegeta_dark_dive_uniform", fall: "vegeta_dark_dive_uniform",
    guard: "vegeta_dark_idlecross_uniform", guardHit: "vegeta_dark_hurt_uniform", crouch: "vegeta_dark_crouchlight_uniform",
    hurt: "vegeta_dark_hurt_uniform", knockdown: "vegeta_dark_knockdown_uniform", getup: "vegeta_dark_getup_uniform",
    light: "vegeta_dark_light_uniform", heavy: "vegeta_dark_heavy_uniform", up: "vegeta_dark_up_uniform",
    air: "vegeta_dark_air_uniform", down_air: "vegeta_dark_air_uniform", crouchLight: "vegeta_dark_crouchlight_uniform",
    vegetaDarkRush1: "vegeta_dark_rush1_uniform", vegetaDarkRush2: "vegeta_dark_rush2_uniform", vegetaDarkRush3: "vegeta_dark_up_uniform",
    vdKiCast: "vegeta_dark_kicast_uniform", vdKnife: "vegeta_dark_knife_uniform", vdSickle: "vegeta_dark_sickle_uniform",
    vdAura: "vegeta_dark_aura_uniform",
    win: "vegeta_dark_win_uniform", lose: "vegeta_dark_knockdown_uniform", vdIntro: "vegeta_dark_intro_uniform",
  };
  for (const [k, tag] of Object.entries(wants)) check(`${k} → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);
  check("walk/run/dash borrow the dive (no valid run cycle on sheet)", (ad.walk?.sheet || "").includes("vegeta_dark_dive_uniform"), `sheet=${ad.walk?.sheet}`);
  check("up = own launcher; down_air reuses air; rush3 reuses up (documented)", (ad.up?.sheet || "") !== (ad.heavy?.sheet || "") && (ad.down_air?.sheet || "") === (ad.air?.sheet || "") && (ad.vegetaDarkRush3?.sheet || "") === (ad.up?.sheet || ""), "");

  console.log("\n── S2: a normal connects (light, via ×0.60) ──");
  await prep(48); let h0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(6);
  check(`light connects (P2 dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");

  console.log("\n── S3: Fwd+Heavy Villain's Rush rekka reaches the launcher finisher ──");
  await prep(40);
  const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  const seen = new Set();
  const rec = async () => { const m = (await page.evaluate(() => window.__harness.vegetaDarkCmd("p1")))?.move || ""; if (/^vegetaDarkRush[123]$/.test(m)) seen.add(m); };
  const tapK = async () => { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); };
  const waitCancel = async () => { await page.waitForFunction(() => { const c = window.__harness.vegetaDarkCmd("p1"); return c && c.attacking && c.phase === "recovery" && c.connected && c.rekkaNext; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); };
  await page.keyboard.down(fwd); await tapK(); await rec();
  await waitCancel(); await tapK(); for (let i = 0; i < 3; i++) { await rec(); await waitFrames(1); }
  await waitCancel(); await tapK(); for (let i = 0; i < 10; i++) { await rec(); await waitFrames(1); }
  await page.keyboard.up(fwd); await waitFrames(4);
  check("Villain's Rush reached vegetaDarkRush3 launcher finisher", seen.has("vegetaDarkRush1") && seen.has("vegetaDarkRush3"), [...seen].join(","));

  console.log("\n── S4: specials — Ki Blast (proj) / Knife Slash (melee) / Sickle Throw (proj) ──");
  await prep(150); h0 = (await p2()).health;
  const kb = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  check("neutral special casts Ki Blast (vdKiCast)", kb?.cast === "vdKiCast", `cast=${kb?.cast}`);
  let sawKi = false; for (let i = 0; i < 18; i++) { if ((await projectiles()).some(p => (p.name || "").includes("vdKiBlast"))) sawKi = true; await waitFrames(1); }
  check("Ki Blast spawns a projectile + connects", sawKi && h0 - (await p2()).health > 0, "");
  await waitGrounded();
  await prep(90); h0 = (await p2()).health;
  const kn = await page.evaluate(() => window.__harness.p1SpecialDir("F"));
  check("Fwd special = Knife Slash (vdKnife, melee)", kn?.move === "vdKnife" || kn?.cast === "vdKnife", `move=${kn?.move}`);
  await waitFrames(8);
  check(`Knife Slash connects (dmg ${((h0 - (await p2()).health)).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded();
  await prep(150); h0 = (await p2()).health;
  const sk = await page.evaluate(() => window.__harness.p1SpecialDir("B"));
  check("Back special casts Sickle Throw (vdSickle)", sk?.cast === "vdSickle", `cast=${sk?.cast}`);
  let sawSickle = false; for (let i = 0; i < 20; i++) { if ((await projectiles()).some(p => (p.name || "").includes("vdSickle"))) sawSickle = true; await waitFrames(1); }
  check("Sickle Throw spawns a projectile + connects", sawSickle && h0 - (await p2()).health > 0, "");
  await waitGrounded();

  console.log("\n── S5: dark-aura transform + amplified ki blast (item-2 payoff) ──");
  await prep(150);
  const okT = await page.evaluate(() => window.__harness.p1VegetaDarkEnter());
  const tf = await p1();
  check("charge-release enters dark-aura form (dmg ×1.35)", tf.currentForm === "vegetaDarkAura" && Math.abs(tf.damageMult - 1.35) < 0.02, `form=${tf.currentForm} dmg=${tf.damageMult} ok=${okT}`);
  let ampW = 0; const kb2 = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  for (let i = 0; i < 18; i++) { const a = (await projectiles()).filter(p => (p.name || "").includes("vdKiBlastAmped")); if (a.length) ampW = Math.max(ampW, ...a.map(p => p.w || 0)); await waitFrames(1); }
  check(`transformed Ki Blast fires the AMPLIFIED purple tier (w=${ampW} ≥ 70)`, ampW >= 70, `w=${ampW}`);
  await page.evaluate(() => window.__harness.p1VegetaDarkSetEnergy(0)); await waitFrames(3);
  check("Ki-empty auto-reverts to base (buffs cleared)", (await p1()).currentForm === "base", "");
  await page.evaluate(() => window.__harness.p1VegetaDarkRevert?.());

  console.log("\n── S6: win / lose / REAL dark-tendril intro render ──");
  await prep(60);
  await force("win"); await waitFrames(4); const win = await p1(); await force(null);
  check("win renders REAL arms-crossed vegeta_dark_win_uniform", (win.spriteSheet || "").includes("vegeta_dark_win_uniform"), `sheet=${win.spriteSheet}`);
  await force("lose"); await waitFrames(4); const lose = await p1(); await force(null);
  check("lose reuses vegeta_dark_knockdown_uniform", (lose.spriteSheet || "").includes("vegeta_dark_knockdown_uniform"), `sheet=${lose.spriteSheet}`);
  await force("vdIntro"); await waitFrames(4); const intro = await p1(); await force(null);
  check("intro renders REAL dark-tendril vegeta_dark_intro_uniform", (intro.spriteSheet || "").includes("vegeta_dark_intro_uniform"), `sheet=${intro.spriteSheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors across the full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
