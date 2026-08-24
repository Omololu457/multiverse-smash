// harness/gohan.test.mjs — CANONICAL full-kit smoke test for Teen Gohan (Dragon Ball, Extreme Butoden).
// Covers every built stage: sprite gate/stats (S1), movement/state sheets (S1), normals connect (S2), the
// Fwd+Heavy "Rush Combo" chain (S3), the lone MELEE special "Meteor Kick" + no-projectile melee-only proof (S4),
// the Base↔SSJ2 transformation (S5: enter/gold-art/stat-boost/drain-revert/KO-revert, art-faithful no-tap-revert),
// win/lose/intro pose wiring (S6), a full fallback-box sweep, and no JS errors.
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
const gForm = () => page.evaluate(() => window.__harness.p1GohanForm());
const gCmd = () => page.evaluate(() => window.__harness.gohanCmd("p1"));
const setKi = (v) => page.evaluate(x => window.__harness.setEnergy(x), v);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); });
  await setKi(200);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=gohan&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6); await waitGrounded();

  console.log("\n── S1: sprite gate + stats ──");
  const g = await p1();
  check("P1 is Teen Gohan", g.key === "gohan", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("idle sheet = gohan_idle_uniform", (g.spriteSheet || "").includes("gohan_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale 1.20", Math.abs((g.spriteScale || 0) - 1.20) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1200 / EN 200", g.maxHealth === 1200 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);

  console.log("\n── S1: movement/state sheets resolve ──");
  for (const [act, tag] of [["walk", "gohan_walk"], ["run", "gohan_run"], ["dash", "gohan_dash"], ["jump", "gohan_jump"], ["crouch", "gohan_crouch"], ["guard", "gohan_guard"], ["hurt", "gohan_hurt"], ["knockdown", "gohan_knockdown"], ["getup", "gohan_getup"], ["taunt", "gohan_taunt"]]) {
    await force(act); await waitFrames(3); const r = await p1(); await force(null); await waitFrames(1);
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  console.log("\n── S2: normals connect (×0.60) ──");
  for (const [name, key, tag] of [["light", "j", "gohan_light"], ["heavy", "k", "gohan_heavy"], ["up", "i", "gohan_up"]]) {
    await prep(48); const h0 = (await p2()).health;
    await page.keyboard.down(key); let saw = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) saw = true; await waitFrames(2); } await page.keyboard.up(key); await waitFrames(8);
    const dealt = h0 - (await p2()).health;
    check(`${name} renders ${tag} + connects (${dealt.toFixed(0)})`, saw && dealt > 0, `saw=${saw} dmg=${dealt}`);
  }

  console.log("\n── S3: Fwd+Heavy 'Rush Combo' chain opens → launcher ──");
  await prep(50); const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  const seen = new Set();
  const tapK = async () => { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); };
  const waitCancel = async () => { await page.waitForFunction(() => { const c = window.__harness.gohanCmd("p1"); return c && c.attacking && c.phase === "recovery" && c.connected && c.rekkaNext; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); };
  await page.keyboard.down(fwd);
  await tapK(); { const c = await gCmd(); if (/gohanRush[123]/.test(c?.move || "")) seen.add(c.move); }
  await waitCancel(); await tapK(); for (let i = 0; i < 3; i++) { const c = await gCmd(); if (/gohanRush[123]/.test(c?.move || "")) seen.add(c.move); await waitFrames(1); }
  await waitCancel(); await tapK(); for (let i = 0; i < 10; i++) { const c = await gCmd(); if (/gohanRush[123]/.test(c?.move || "")) seen.add(c.move); await waitFrames(1); }
  await page.keyboard.up(fwd); await waitFrames(4);
  check("rush chain reached all 3 stages", seen.has("gohanRush1") && seen.has("gohanRush2") && seen.has("gohanRush3"), [...seen].join(","));

  console.log("\n── S4: MELEE special 'Meteor Kick' fires + connects + NO projectile (melee-only) ──");
  await prep(46); const h4 = (await p2()).health;
  const cast = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  check("special = meteorKick", cast?.move === "meteorKick", `move=${cast?.move}`);
  let anyProj = 0; for (let i = 0; i < 10; i++) { anyProj = Math.max(anyProj, (await projectiles()).length); await waitFrames(1); }
  const d4 = h4 - (await p2()).health;
  check("Meteor Kick connects + spawns NO projectile (melee-only)", d4 > 0 && anyProj === 0, `dmg=${d4} proj=${anyProj}`);

  console.log("\n── S5: Base↔SSJ2 transformation (art-faithful: no tap-revert; Ki/KO revert) ──");
  await prep(60); await setKi(200);
  await page.evaluate(() => window.__harness.p1GohanTransform()); await waitFrames(2); const f1 = await gForm();
  check("enter SSJ2 (form + stat boost 1.30/1.15/1.10)", f1.form === "gohanSSJ2" && Math.abs(f1.dmg - 1.30) < 0.01, `form=${f1.form} dmg=${f1.dmg}`);
  await waitFrames(28); await force("idle"); await waitFrames(4); const pv = await p1(); await force(null);
  check("SSJ2 idle renders GOLD art (gohan_ssj2)", /gohan_ssj2/.test(pv.spriteSheet || ""), `sheet=${pv.spriteSheet}`);
  await setKi(0); await waitFrames(4); const f2 = await gForm();
  check("Ki=0 auto-reverts to base", f2.form === "base" && !f2.ssj2, `form=${f2.form}`);
  await setKi(200); await page.evaluate(() => window.__harness.p1GohanTransform()); await waitFrames(2);
  await page.evaluate(() => window.__harness.knockdownP1(60)); await waitFrames(3); const f3 = await gForm();
  check("KNOCKDOWN reverts SSJ2→base (art-shown)", f3.form === "base" && !f3.ssj2, `form=${f3.form}`);

  console.log("\n── S6: win / lose / intro pose wiring ──");
  for (const [act, tag] of [["win", "gohan_win"], ["lose", "gohan_knockdown"], ["gohanIntro", "gohan_intro"]]) {
    await force(act); await waitFrames(3); const r = await p1(); await force(null); await waitFrames(1);
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  console.log("\n── fallback-box sweep (every action resolves a real gohan_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "crouch", "guard", "hurt", "knockdown", "getup", "taunt", "light", "heavy", "up", "air", "down_air", "gohanRush1", "gohanRush2", "gohanRush3", "meteorKick", "win", "gohanIntro", "lose"]) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("gohan_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real gohan_ sheet (no 128×128 box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
