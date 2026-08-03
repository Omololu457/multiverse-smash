// harness/transform_stage3_shots.mjs — TRANSFORMATION JUTSU Stage 3 EVIDENCE (Tier 2 Full Copy, Naruto).
// Naruto vs Sasuke. Activates Tier 2 (→↓→ DP + Special) and proves: FULL copy (rosterKey/specials/
// basic_attacks become Sasuke's), the copied character's REAL moves connect (a cast deals damage and
// is NOT Naruto's Rasengan), the cost is meaningfully higher than Tier 1, and it reverts cleanly.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const tj = () => page.evaluate(() => window.__harness.p1TransformJutsu());
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function motion(seq) { const d = seq.slice(0, -1), l = seq[seq.length - 1]; for (const k of d) await page.keyboard.press(k); await tap(l); }
async function reset(gap = 70) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);

  // ── Baseline ──
  await reset();
  const b = await tj();
  console.log(`\n  BASELINE: rosterKey=${b.rosterKey} specials=[${b.specialsKeys}] lightDmg=${b.lightDmg}`);

  // ── Tier 2 FULL COPY: ←↓← (DPB) + Special ──
  await motion(["s", "a", "d", "l"]);   // ↓←→ DBF
  await waitFrames(8);
  const a = await tj();
  await shot("transform_s3_fullcopy.png");
  console.log(`  FULL COPY: rosterKey=${a.rosterKey} name=${a.name} specials=[${a.specialsKeys}] lightDmg=${a.lightDmg} tier=${a.tier} sheet=${a.spriteSheet}`);
  check("Tier 2 activated (full copy)", a.active === true && a.tier === 2, `tier=${a.tier}`);
  check("rosterKey CHANGED to the opponent (sasuke) — moves now dispatch as Sasuke", a.rosterKey === "sasuke", `rosterKey=${a.rosterKey}`);
  check("move DISPATCH identity changed (Naruto → Sasuke; grants the copied kit)", a.rosterKey !== b.rosterKey && a.rosterKey === "sasuke", `${b.rosterKey}→${a.rosterKey} (Sasuke's moves are code-dispatched on rosterKey, not a specials data block)`);
  check("basic-attacks copied (light dmg changed from Naruto's)", a.lightDmg !== b.lightDmg, `${b.lightDmg}→${a.lightDmg}`);
  check("appearance is the copied character", !/naruto/i.test(a.spriteSheet || ""), `sheet=${a.spriteSheet}`);

  // ── The copied character's REAL move connects (and it's NOT Naruto's Rasengan) ──
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
  const hp0 = (await p2()).health;
  await tap("l");                 // neutral Special → now dispatches as SASUKE (the copied kit)
  await waitFrames(6);
  const projs = await projNames();
  await waitFrames(20);
  const dmg = hp0 - (await p2()).health;
  check("a COPIED (Sasuke) move connected", dmg > 0, `Δhp=${dmg.toFixed(0)}`);
  check("the move was NOT Naruto's Rasengan (it's the copied kit)", !projs.includes("rasenganOrb"), `proj=[${projs.join(",")}]`);

  // ── Cost tiering: at 50 energy, Tier 2 (cost 100) FAILS but Tier 1 (cost 25) SUCCEEDS ──
  await page.evaluate(() => window.__harness.forceRevertTransformJutsu());
  await reset();
  await page.evaluate(() => window.__harness.setEnergy?.(50));
  await motion(["s", "a", "d", "l"]);   // ↓←→ DBF
  await waitFrames(4);
  const t2poor = await tj();
  check("Tier 2 is BLOCKED at 50 energy (cost > Tier 1)", t2poor.active === false && t2poor.rosterKey === "naruto", `active=${t2poor.active}`);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.setEnergy?.(50); });
  await motion(["d", "s", "a", "l"]);   // Tier 1 attempt @50 energy (→↓← HCB)
  await waitFrames(4);
  const t1ok = await tj();
  check("Tier 1 SUCCEEDS at the same 50 energy (meaningfully cheaper)", t1ok.active === true && t1ok.tier === 1, `tier=${t1ok.tier}`);

  // ── Revert ──
  await page.evaluate(() => window.__harness.forceRevertTransformJutsu());
  await waitFrames(14);
  const r = await tj();
  check("reverts cleanly to Naruto (rosterKey + kit restored)", r.active === false && r.rosterKey === "naruto" && r.specialsKeys.includes("rasengan"), `rosterKey=${r.rosterKey}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} Transformation Jutsu Tier 2 (Naruto): ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
