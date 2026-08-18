// harness/boruto.test.mjs — CANONICAL Boruto Uzumaki (Naruto) suite (mirrors kiba.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–4: sprite gate / stats / portrait /
// credits attribution, movement/state, 5 normals + Low Sweep + aerial cancel string, 8 directional ninjutsu
// specials (Rasengan family / Shiden / Wind-Water / Palm Blast / Shadow Clone / Throw Weapon), the Kote
// Barrage ULTIMATE cinematic (live fighter, no dup instance), a STATIC sheet+portrait sweep, and a RUNTIME
// fallback-box sweep over every action. Per-stage harnesses (test:boruto-stage1..4) own live-timing detail.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
import { allAttributedKeys } from "../credits.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SWEEP (no browser) — registration integrity. ──
section("STATIC — animationData sheets + portrait exist; stats + attribution");
const boruto = characters.boruto;
const ad = boruto.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const missing = [];
for (const s of [...sheets, boruto.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (boruto_portrait.png)", (boruto.portrait || "").includes("boruto_portrait"), `portrait=${boruto.portrait}`);
check("stats HP1120/EN180/atk88/def80/spd96 + energyType chakra + versatile + scale1.5",
  boruto.stats.maxHealth === 1120 && boruto.stats.maxEnergy === 180 && boruto.stats.attack === 88 && boruto.stats.defense === 80 &&
  boruto.stats.speed === 96 && boruto.traits.energyType === "chakra" && boruto.traits.scaling === "versatile" && Math.abs(boruto.spriteScale - 1.5) < 0.01,
  JSON.stringify(boruto.stats));
check("ultimate = Kote Barrage (cost 100)", boruto.ultimate?.name === "Kote Barrage" && boruto.ultimate?.cost === 100, JSON.stringify(boruto.ultimate));
check("credits: boruto is attributed (project-adapted)", allAttributedKeys().has("boruto"), "");
// The full kit is wired to real sheets.
const kitKeys = ["idle", "walk", "run", "dash", "jump", "fall", "guard", "charge", "hurt", "hurt_air", "knockdown", "win", "intro",
  "light", "heavy", "up", "air", "down_air", "borutoLowSweep", "borutoAirCombo1", "borutoAirCombo2",
  "borutoRasengan", "borutoRasenganAir", "borutoVanishing", "borutoShiden", "borutoWindWater", "borutoPalmBlast", "borutoClone", "borutoThrowAir", "borutoKote"];
const unwired = kitKeys.filter(k => !(ad[k]?.sheet || "").includes("boruto"));
check(`all ${kitKeys.length} kit actions wired to real boruto sheets`, unwired.length === 0, unwired.join(", "));

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = a => page.evaluate(act => window.__harness.forceAction(act, "p1"), a);
async function setupAdjacent(gap = 46) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.42)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=boruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  section("sprite gate");
  const g = await p1();
  check("P1 is Boruto, renders as sprites", g.key === "boruto" && g.hasSpriteHandler, `key=${g.key} handler=${g.hasSpriteHandler}`);
  check("idle → boruto_idle_uniform", (g.spriteSheet || "").includes("boruto_idle_uniform"), `sheet=${g.spriteSheet}`);

  section("RUNTIME fallback-box sweep — every action resolves a real boruto_ sheet (no 128² box)");
  const boxHit = [];
  for (const act of kitKeys) {
    await force(act); await waitFrames(3); const r = await p1();
    if (!(r.spriteSheet || "").includes("boruto_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check(`every one of ${kitKeys.length} actions renders a real boruto_ sheet`, boxHit.length === 0, boxHit.join(" | "));

  section("live-connect smokes (per-stage harnesses own the detail)");
  // light normal connects
  await setupAdjacent(40);
  let hp0 = (await p2()).health;
  await page.keyboard.down("j"); for (let f = 0; f < 12 && !((await p1()).spriteSheet || "").includes("boruto_light_uniform"); f++) await waitFrames(1);
  await page.keyboard.up("j"); await waitFrames(20);
  check("light normal connects", (await p2()).health < hp0, `Δ=${(hp0 - (await p2()).health).toFixed(0)}`);

  // Rasengan (neutral Special) connects + spends energy
  await waitGrounded(); await setupAdjacent(46);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  hp0 = (await p2()).health;
  const rg = await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(24);
  check("Rasengan fires + connects", rg?.cast === "borutoRasengan" && (await p2()).health < hp0, `cast=${rg?.cast} Δ=${(hp0 - (await p2()).health).toFixed(0)}`);

  // Shiden (Fwd Special) connects
  await waitGrounded(); await setupAdjacent(52);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  hp0 = (await p2()).health;
  const sh = await page.evaluate(() => window.__harness.p1SpecialDir("F")); await waitFrames(22);
  check("Lightning Shiden fires + connects", sh?.move === "borutoShiden" && (await p2()).health < hp0, `move=${sh?.move} Δ=${(hp0 - (await p2()).health).toFixed(0)}`);

  // Ultimate — live fighter cinematic + guaranteed payoff
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && p.grounded; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await setupAdjacent(60);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  hp0 = (await p2()).health;
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  await waitFrames(2);
  check("Ultimate fires on the LIVE fighter (no dup instance)", ult?.cast === true && ult?.castMove === "borutoKote", `cast=${ult?.cast} pose=${ult?.castMove}`);
  await waitFrames(115);
  check("Ultimate deals the guaranteed cinematic payoff (~198 EFF band)", (hp0 - (await p2()).health) > 120, `Δ=${(hp0 - (await p2()).health).toFixed(0)} EFF`);

  section("no JS errors");
  check("no page errors across the canonical suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Boruto canonical suite: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
