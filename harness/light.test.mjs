// harness/light.test.mjs  — LIGHT YAGAMI canonical suite (Stage 7 sign-off).
// Full-kit sanity: sprite gate + stats + real face portrait; a box-sweep across EVERY animationData sprite key
// (movement / normals / all special+ultimate cast poses / win / lose) proving none fall back to the 128×128
// procedural box; and functional spot-checks (a special spawns its summon, an ultimate lands guaranteed
// damage). The per-stage harnesses (light-stage1/2/4/56) remain the authoritative deep tests.
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
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=light`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const setEnergy = (v) => page.evaluate((e) => window.__harness.setEnergy(e), v);
const healP2 = () => page.evaluate(() => window.__harness.healP2?.());
const castDir = (dir) => page.evaluate((d) => window.__harness.p1SpecialDir(d), dir);
const fireUlt = (opts) => page.evaluate((o) => window.__harness.p1Ultimate(o), opts || {});
const projs = () => page.evaluate(() => window.__harness.projectiles());

try {
  await boot();
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats + portrait ──");
  const g = await p1();
  check("P1 is Light Yagami", g.key === "light", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.9", Math.abs((g.spriteScale || 0) - 1.9) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1080 / EN 200 (deep Kira pool)", g.maxHealth === 1080 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const def = await page.evaluate(() => window.__harness.charDef("light"));
  check("energyType kira", def?.traits?.energyType === "kira", `type=${def?.traits?.energyType}`);
  const portraitOK = fs.existsSync(path.join(ROOT, "light_portrait.png"));
  check("real face portrait file exists", portraitOK, "");
  check("win + lose pose keys defined", !!def?.animationData?.win && !!def?.animationData?.lose, "");

  console.log("\n── full-kit box-sweep (EVERY sprite key resolves a real light_ sheet) ──");
  const KEYS = ["idle", "walk", "run", "dash", "jump", "fall", "guard", "hurt", "knockdown",
                "light", "heavy", "crouchLight", "lightCast", "lightAirCast", "lightUltWrite", "lightScythe", "win", "lose"];
  const box = [];
  for (const k of KEYS) { await force(k); await waitFrames(2); const r = await p1(); if (!(r.spriteSheet || "").includes("light_")) box.push(`${k}:${r.spriteSheet || "null"}`); await force(null); await waitFrames(1); }
  check(`all ${KEYS.length} sprite keys resolve a real sheet (no fallback box)`, box.length === 0, box.join(" | "));

  console.log("\n── functional spot-checks ──");
  await setEnergy(200); await waitFrames(2);
  await castDir("U");   // Ryuk anti-air
  let ryuk = false; for (let i = 0; i < 14; i++) { if ((await projs()).some(p => (p.sheet || "").includes("light_ryuk"))) { ryuk = true; break } await waitFrames(1); }
  check("special (Up = Ryuk anti-air) spawns its summon", ryuk, "");
  await force(null); await waitFrames(30);

  await healP2(); await setEnergy(100); await waitFrames(2);
  const hpB = (await p2()).health ?? 0;
  const ur = await fireUlt({});
  check("ultimate casts (As Planned)", !!ur?.cast, "");
  await waitFrames(64);
  const hpA = (await p2()).health ?? 0;
  check("ultimate lands guaranteed damage (~204)", hpB - hpA > 100, `dmg=${hpB - hpA}`);
  await waitFrames(30);
  await page.screenshot({ path: path.join(OUT, "light_canonical_idle.png") });
  await force("win"); await waitFrames(4); await page.screenshot({ path: path.join(OUT, "light_canonical_win.png") });
  await force("lose"); await waitFrames(4); await page.screenshot({ path: path.join(OUT, "light_canonical_lose.png") }); await force(null);

  console.log("\n── no JS errors across the full kit ──");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n════ LIGHT YAGAMI canonical: ${pass} passed, ${fail} failed ════`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
