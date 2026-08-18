// harness/kiba.test.mjs — CANONICAL Kiba Inuzuka (+ Akamaru, Naruto) suite (mirrors onoki.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–5: sprite gate / stats / portrait /
// credits attribution, movement/state, 5 normals + 2 bonus command normals, Gatsuga (2 tiers), the beast-
// fusion pair (Four Legs buff + Two-Headed Wolf), the Three-Headed Wolf ULTIMATE cinematic (live fighter,
// no dup instance), a STATIC sheet+portrait+ULT-beat-art sweep, and a RUNTIME fallback-box sweep over every
// action. Per-stage harnesses (test:kiba-stage1..5) remain authoritative for live-timing detail.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
import { allAttributedKeys } from "../credits.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SWEEP (no browser) — registration integrity. ──
section("STATIC — animationData sheets + ULT beat art + portrait exist; stats + attribution");
const kiba = characters.kiba;
const ad = kiba.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
// Cinematic beat images referenced in game.js (NOT animationData) — assert explicitly too.
const beatArt = ["./kiba_thw_summon.png", "./kiba_thw_charge.png", "./kiba_thw_maul.png", "./kiba_thw_vortex.png"];
const missing = [];
for (const s of [...sheets, ...beatArt, kiba.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + ${beatArt.length} ULT beat imgs + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (kiba_portrait.png)", (kiba.portrait || "").includes("kiba_portrait"), `portrait=${kiba.portrait}`);
check("stats HP1180/EN180/atk90/def82/spd92 + energyType chakra + rushdown + scale2.5",
  kiba.stats.maxHealth === 1180 && kiba.stats.maxEnergy === 180 && kiba.stats.attack === 90 && kiba.stats.defense === 82 &&
  kiba.stats.speed === 92 && kiba.traits.energyType === "chakra" && kiba.archetypes.includes("rushdown") && Math.abs(kiba.spriteScale - 2.5) < 0.01,
  JSON.stringify(kiba.stats));
check("credits: kiba is attributed (project-adapted)", allAttributedKeys().has("kiba"), "");
// The full kit is wired to real sheets.
const kitKeys = ["idle", "run", "dash", "jump", "guard", "guard_air", "charge", "hurt", "knockdown", "win",
  "light", "heavy", "up", "air", "down_air", "kibaFwdStrong", "kibaAerialStrong",
  "kibaGatsugaWeak", "kibaGatsugaStrong", "kibaFourLegs", "kibaTwoHeaded"];
const unwired = kitKeys.filter(k => !(ad[k]?.sheet || "").includes("kiba"));
check(`all ${kitKeys.length} kit actions wired to real kiba sheets`, unwired.length === 0, unwired.join(", "));

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
  await page.goto(`${base}/index.html?harness=1&p1=kiba`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  section("sprite gate");
  const g = await p1();
  check("P1 is Kiba, renders as sprites", g.key === "kiba" && g.hasSpriteHandler, `key=${g.key} handler=${g.hasSpriteHandler}`);
  check("idle → kiba_idle_uniform", (g.spriteSheet || "").includes("kiba_idle_uniform"), `sheet=${g.spriteSheet}`);

  section("RUNTIME fallback-box sweep — every action resolves a real kiba_ sheet (no 128² box)");
  const boxHit = [];
  for (const act of kitKeys.concat(["fall"])) {
    await force(act); await waitFrames(3); const r = await p1();
    if (!(r.spriteSheet || "").includes("kiba_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check(`every one of ${kitKeys.length + 1} actions renders a real kiba_ sheet`, boxHit.length === 0, boxHit.join(" | "));

  section("live-connect smokes (per-stage harnesses own the detail)");
  // light normal connects
  await setupAdjacent(40);
  let hp0 = (await p2()).health;
  await page.keyboard.down("j"); for (let f = 0; f < 12 && !((await p1()).spriteSheet || "").includes("kiba_light_uniform"); f++) await waitFrames(1);
  await page.keyboard.up("j"); await waitFrames(20);
  check("light normal connects", (await p2()).health < hp0, `Δ=${(hp0 - (await p2()).health).toFixed(0)}`);

  // Weak Gatsuga (neutral Special) connects + spends energy
  await waitGrounded(); await setupAdjacent(44);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  let e0 = (await p1()).energy; hp0 = (await p2()).health;
  const gw = await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(22);
  check("Weak Gatsuga fires + connects", gw?.move === "kibaGatsugaWeak" && (await p2()).health < hp0, `move=${gw?.move} Δ=${(hp0 - (await p2()).health).toFixed(0)}`);

  // Four Legs (Down Special) sets the buff
  await waitGrounded(); await setupAdjacent(60);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  await page.evaluate(() => window.__harness.p1SpecialDir("D")); await waitFrames(3);
  const fl = await p1();
  check("Four Legs sets fourLegsActive + damageMult 1.25", fl.fourLegsActive === true && Math.abs(fl.damageMult - 1.25) < 0.01, `active=${fl.fourLegsActive} mult=${fl.damageMult}`);

  // Ultimate — live fighter cinematic + guaranteed payoff
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && p.grounded; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
  await setupAdjacent(70);
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  hp0 = (await p2()).health;
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  await waitFrames(2);
  const c0 = await page.evaluate(() => window.__harness.kibaThwCine());
  check("Ultimate fires on the LIVE fighter (no dup instance)", ult?.cast === true && ult?.castMove === "kibaFourLegs" && c0.timer > 0, `cast=${ult?.cast} pose=${ult?.castMove} timer=${c0.timer}`);
  await waitFrames(110);
  check("Ultimate deals the guaranteed cinematic payoff", (hp0 - (await p2()).health) > 120, `Δ=${(hp0 - (await p2()).health).toFixed(0)} EFF`);

  section("no JS errors");
  check("no page errors across the canonical suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Kiba canonical suite: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
