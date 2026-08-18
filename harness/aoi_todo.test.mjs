// harness/aoi_todo.test.mjs — CANONICAL suite for Aoi Todo (JJK). Full-kit sign-off (Stage 7):
// registration/stats, a box-sweep over EVERY action (no 128² procedural fallback), win/lose poses, live
// smoke of a normal + command chain + a special + the Boogie Woogie cameo/swap/Black-Flash + the ultimate,
// and the Boogie-meter ECONOMY (summon costs meter, fake-clap is free). Per-stage harnesses remain authoritative.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const tstate = () => page.evaluate(() => window.__harness.todoState());
const clap = (dir) => page.evaluate(d => window.__harness.todoClap(d), dir);
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function setupAdjacent(gap = 56) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.clearSummons?.(); window.__harness.fillEnergy?.(); });
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=aoi_todo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("registration + stats");
  const g = await p1();
  check("P1 is Aoi Todo", g.key === "aoi_todo", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.9", Math.abs((g.spriteScale || 0) - 1.9) < 0.01, `${g.spriteScale}`);
  check("HP 1240 / EN 200", g.maxHealth === 1240 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("aoi_todo"));
  check("universe jujutsu_kaisen, energyType boogie", def?.universe === "jujutsu_kaisen" && def?.traits?.energyType === "boogie", `${def?.universe}/${def?.traits?.energyType}`);
  check("portrait on disk", fs.existsSync(path.join(ROOT, "aoi_todo_portrait.png")), "");

  section("box-sweep — every action resolves a real aoi_todo_ sheet (no 128² procedural box)");
  const actions = ["idle","walk","run","dash","crouch","jump","fall","guard","hurt","knockdown","getup",
                   "light","heavy","up","air","down_air","crouchLight",
                   "todoCombo1","todoCombo2","todoCombo3",
                   "todoGun","todoFireKick","todoWhip","todoSpin","todoArmor","todoDive","todoClap","win","lose"];
  const box = [];
  for (const act of actions) { await force(act); await waitFrames(2); const r = await p1(); if (!(r.spriteSheet || "").includes("aoi_todo_")) box.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await waitFrames(1); }
  check("all 29 actions resolve aoi_todo_ art (no box)", box.length === 0, box.join(" | "));

  section("win / lose poses");
  await force("win"); await waitFrames(3); const w = await p1(); await force(null);
  check("win → aoi_todo_win_uniform", (w.spriteSheet || "").includes("aoi_todo_win_uniform"), `${w.spriteSheet}`);
  await force("lose"); await waitFrames(3); const l = await p1(); await force(null);
  check("lose → aoi_todo_lose_uniform", (l.spriteSheet || "").includes("aoi_todo_lose_uniform"), `${l.spriteSheet}`);

  section("live smoke — normal + command chain + special connect");
  await setupAdjacent(50);
  let hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(18);
  check("light connects", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  await setupAdjacent(52);
  hp0 = (await p2()).health;
  const sres = await page.evaluate(() => window.__harness.p1SpecialDir("F"));
  check("special (Fire Kick) fires", sres?.move === "todoFireKick", `move=${sres?.move}`);
  await waitFrames(20);
  check("special connects", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  await waitGrounded();

  section("Boogie Woogie — cameo + swap + Black Flash (smoke)");
  await setupAdjacent(70);
  await clap("U"); await clap("D"); await waitFrames(2);
  let st = await tstate();
  check("both cameos summonable", st.yuji && st.gojo, `yuji=${st.yuji} gojo=${st.gojo}`);
  await setupAdjacent(80);
  await clap("F"); // enemy-swap arms Black Flash
  check("swap arms Black Flash", (await tstate()).blackFlash > 0, `${(await tstate()).blackFlash}`);

  section("Boogie-meter ECONOMY (the balance lever) — summon costs meter, fake-clap is FREE");
  await setupAdjacent(70);
  await page.evaluate(() => window.__harness.setEnergy(200));
  const e0 = (await p1()).energy ?? (await page.evaluate(() => window.__harness.p1().energy));
  await clap("U"); await waitFrames(1);            // summon Yuji — costs 45
  const e1 = await page.evaluate(() => window.__harness.p1().energy);
  check("summoning a cameo COSTS Boogie meter (~45)", (e0 - e1) >= 40 && (e0 - e1) <= 50, `${e0} → ${e1} (−${(e0 - e1).toFixed(0)})`);
  const e2a = await page.evaluate(() => window.__harness.p1().energy);
  await clap("B"); await waitFrames(1);            // fake clap — FREE
  const e2b = await page.evaluate(() => window.__harness.p1().energy);
  check("fake-clap bluff is FREE (no meter drain)", Math.abs(e2b - e2a) < 1, `${e2a} → ${e2b}`);
  // can't-afford: drain the meter, a summon whiffs (no cameo)
  await setupAdjacent(70);
  await page.evaluate(() => window.__harness.setEnergy(5));
  await clap("D");  // try to summon Gojo with 5 meter → whiffs
  check("a clap you can't afford whiffs (no cameo, meter-gated)", !(await tstate()).gojo, `gojo=${(await tstate()).gojo}`);

  section("ultimate — Maximum: Black Flash (guaranteed ~198 EFF)");
  await setupAdjacent(70);
  await page.evaluate(() => window.__harness.resetUlt());
  hp0 = (await p2()).health;
  const ures = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate casts", ures?.cast === true, `cast=${ures?.cast}`);
  await waitFrames(60);
  const dealt = hp0 - (await p2()).health;
  check("ultimate guaranteed ~198 EFF (185–215)", dealt >= 185 && dealt <= 215, `−${dealt.toFixed(0)}`);

  section("no JS errors");
  check("no page errors across the canonical suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
