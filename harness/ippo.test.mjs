// harness/ippo.test.mjs — CANONICAL full-kit smoke test for Ippo Makunouchi (Hajime no Ippo, JUS fan sheet).
// Covers every built stage: sprite gate/stats (S1), movement/state sheets (S1), normals connect (S2), the
// Fwd+Heavy "Y-Jabs" 2-stage chain (S3), the fixed-slot MELEE special kit + no-projectile proof (S4), the
// "Dempsey Roll" ULT (S5: weave→flurry, ~198 EFF, melee-only), win/lose pose wiring (S6), a full
// fallback-box sweep, and no JS errors. ★Ippo is a MELEE-ONLY boxer — no special/ult spawns a projectile.
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
const iCmd = () => page.evaluate(() => window.__harness.ippoCmd("p1"));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=ippo&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6); await waitGrounded();

  console.log("\n── S1: sprite gate + stats ──");
  const g = await p1();
  check("P1 is Ippo", g.key === "ippo", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("idle sheet = ippo_idle_uniform", (g.spriteSheet || "").includes("ippo_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale 2.1", Math.abs((g.spriteScale || 0) - 2.1) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1160 / EN 100", g.maxHealth === 1160 && g.maxEnergy === 100, `HP=${g.maxHealth} EN=${g.maxEnergy}`);

  console.log("\n── S1: movement/state sheets resolve ──");
  for (const [act, tag] of [["walk", "ippo_walk"], ["run", "ippo_walk"], ["dash", "ippo_walk"], ["jump", "ippo_jump"], ["fall", "ippo_fall"], ["crouch", "ippo_guard"], ["guard", "ippo_guard"], ["dodge", "ippo_dodge"], ["failed", "ippo_failed"], ["hurt", "ippo_hurt"], ["knockdown", "ippo_knockdown"], ["getup", "ippo_getup"]]) {
    await force(act); await waitFrames(3); const r = await p1(); await force(null); await waitFrames(1);
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  console.log("\n── S2: normals connect (×0.60) ──");
  for (const [name, key, tag] of [["light", "j", "ippo_light"], ["heavy", "k", "ippo_heavy"], ["up", "i", "ippo_up"]]) {
    await prep(46); const h0 = (await p2()).health;
    await page.keyboard.down(key); let saw = false; for (let i = 0; i < 5; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) saw = true; await waitFrames(2); } await page.keyboard.up(key); await waitFrames(8);
    const dealt = h0 - (await p2()).health;
    check(`${name} renders ${tag} + connects (${dealt.toFixed(0)})`, saw && dealt > 0, `saw=${saw} dmg=${dealt}`);
  }

  console.log("\n── S3: Fwd+Heavy 'Y-Jabs' 2-stage chain (finisher = pushback, NOT launch) ──");
  await prep(46); const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  const seen = new Set();
  const tapK = async () => { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); };
  const waitCancel = async () => { await page.waitForFunction(() => { const c = window.__harness.ippoCmd("p1"); return c && c.attacking && c.phase === "recovery" && c.connected && c.rekkaNext; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); };
  await page.keyboard.down(fwd);
  await tapK(); { const c = await iCmd(); if (/ippoJab[12]/.test(c?.move || "")) seen.add(c.move); }
  await waitCancel(); await tapK(); for (let i = 0; i < 10; i++) { const c = await iCmd(); if (/ippoJab[12]/.test(c?.move || "")) seen.add(c.move); await waitFrames(1); }
  await page.keyboard.up(fwd); await waitFrames(4);
  check("Y-Jab chain reached both stages (jab1 → jab2)", seen.has("ippoJab1") && seen.has("ippoJab2"), [...seen].join(","));

  console.log("\n── S4: MELEE specials fire + connect + NO projectile (melee-only) ──");
  let s4proj = 0;
  for (const [dir, move, tag] of [[null, "ippoGazelle", "ippo_gazelle"], ["F", "ippoHook", "ippo_hook"], ["U", "ippoUppercut", "ippo_upper"], ["D", "ippoBodyblow", "ippo_body"]]) {
    await prep(52); const h4 = (await p2()).health;
    const cast = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
    let saw = false; for (let i = 0; i < 12; i++) { const a = await p1(); if ((a.spriteSheet || "").includes(tag)) saw = true; s4proj = Math.max(s4proj, (await projectiles()).length); await waitFrames(1); }
    const d4 = h4 - (await p2()).health;
    check(`${move} fires + renders ${tag} + connects (${d4.toFixed(0)})`, cast?.move === move && saw && d4 > 0, `move=${cast?.move} saw=${saw} dmg=${d4}`);
    await waitGrounded();
  }
  check("no special spawned a projectile (melee-only boxer)", s4proj === 0, `proj=${s4proj}`);

  console.log("\n── S5: 'Dempsey Roll' ULT — weave→flurry, ~198 EFF, MELEE (no projectile) ──");
  await prep(170);   // out of melee range → sure-hit
  const hp0 = (await p2()).health;
  const snap = await page.evaluate(() => { const res = window.__harness.p1Ultimate(); const a = window.__harness.p1(); return { cast: !!res?.cast, castMove: res?.castMove || null }; });
  check("ult casts with weave pose FIRST", snap.cast && snap.castMove === "ippoDempseyWeave", `cast=${snap.cast} pose=${snap.castMove}`);
  const uSheets = new Set(); let uProj = 0;
  for (let i = 0; i < 44; i++) { const a = await p1(); if (a.spriteSheet) uSheets.add(a.spriteSheet); uProj = Math.max(uProj, (await projectiles()).length); await waitFrames(1); }
  check("ult swaps weave → flurry sheet", /ippo_dempsey_weave/.test([...uSheets].join(" ")) && /ippo_dempsey_flurry/.test([...uSheets].join(" ")), `sheets=${[...uSheets].join(" ")}`);
  check("ult spawns NO projectile (melee-only)", uProj === 0, `proj=${uProj}`);
  await waitFrames(30);
  const uDealt = hp0 - (await p2()).health;
  check(`ult payoff ~198 EFF (150–240), out of range`, uDealt >= 150 && uDealt <= 240, `dealt=${uDealt.toFixed(0)}`);

  console.log("\n── S6: win / lose pose wiring (real dedicated art) ──");
  for (const [act, tag] of [["win", "ippo_win"], ["lose", "ippo_lose"]]) {
    await force(act); await waitFrames(3); const r = await p1(); await force(null); await waitFrames(1);
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
  }

  console.log("\n── S6b: low-HP stagger — '(Heart Stopped)' repurposed → idleLow below 30% HP (cosmetic, threshold-gated) ──");
  await prep(90); await force(null); await page.evaluate(() => window.__harness.setP1Health(Math.round(1160 * 0.45))); await waitFrames(5);
  const hpHi = await p1();
  check("above 30% HP → normal idle (not staggered)", (hpHi.spriteSheet || "").includes("ippo_idle_uniform"), `hp=${hpHi.health} sheet=${hpHi.spriteSheet}`);
  await page.evaluate(() => window.__harness.setP1Health(Math.round(1160 * 0.20))); await waitFrames(5);
  const hpLo = await p1();
  check("below 30% HP → idleLow stagger (Heart-Stopped frames)", (hpLo.spriteSheet || "").includes("ippo_idlelow_uniform"), `hp=${hpLo.health} sheet=${hpLo.spriteSheet}`);
  check("stagger is COSMETIC (still ippo, not attacking, grounded — no stat/hitbox change)", hpLo.key === "ippo" && !hpLo.attacking && hpLo.grounded, `atk=${hpLo.attacking} grounded=${hpLo.grounded}`);
  await page.evaluate(() => window.__harness.setP1Health(Math.round(1160 * 0.45))); await waitFrames(5);
  const hpRe = await p1();
  check("recovering above 30% HP → back to normal idle (threshold is live, not latched)", (hpRe.spriteSheet || "").includes("ippo_idle_uniform"), `hp=${hpRe.health} sheet=${hpRe.spriteSheet}`);

  console.log("\n── fallback-box sweep (every action resolves a real ippo_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "jump", "fall", "crouch", "guard", "dodge", "failed", "hurt", "knockdown", "getup", "light", "heavy", "up", "air", "down_air", "crouchLight", "ippoJab1", "ippoJab2", "ippoGazelle", "ippoHook", "ippoUppercut", "ippoBodyblow", "ippoAirhook", "ippoDempseyWeave", "ippoDempseyFlurry", "win", "lose", "idleLow"]) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("ippo_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every action resolves a real ippo_ sheet (no 128×128 box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
