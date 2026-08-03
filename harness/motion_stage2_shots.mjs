// harness/motion_stage2_shots.mjs — STAGE 2 EVIDENCE: existing Barrage vs new Uzumaki Barrage.
// Shows, with logs + screenshots, that the two Naruto "barrage" moves coexist and never interfere:
//   A. EXISTING clone Barrage — neutral Special with ≥2 clones → consumes clones, clone-orb barrage.
//   B. NEW Uzumaki Barrage — double-QCF (↓→↓→) + Special, CLONE-INDEPENDENT flurry + launcher.
//   C. BACK-TO-BACK no interference — with 2 clones out, a double-QCF fires Uzumaki WITHOUT eating
//      the clones; then a neutral Special still fires the existing clone Barrage (consumes them).
// Outputs harness/shots/motion_s2_*.png. Run ALONE.
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

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const clones = () => page.evaluate(() => window.__harness.p1CloneCount());
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function pressDirs(dirs) { for (const k of dirs) await page.keyboard.press(k); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

async function prep(gap = 70) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);

  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── A. EXISTING Barrage (neutral Special, ≥2 clones) ─────────");
  await prep();
  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  const aC0 = await clones(); const aHp0 = (await p2()).health;
  await tap("l");                                    // NEUTRAL Special (no motion) = clone Rasengan Barrage
  await waitFrames(10); await shot("motion_s2_existing_barrage.png");
  await waitFrames(20);
  const aDmg = aHp0 - (await p2()).health; const aC1 = await clones();
  console.log(`  clones ${aC0}→${aC1}, opponent Δhp=${aDmg.toFixed(0)}`);
  check("existing Barrage fired (multi-hit damage)", aDmg > 0, `Δhp=${aDmg.toFixed(0)}`);
  check("existing Barrage consumed the clones", aC1 === 0, `clones ${aC0}→${aC1}`);

  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── B. NEW Uzumaki Barrage (double-QCF, NO clones) ───────────");
  await prep();
  const bC0 = await clones(); const bHp0 = (await p2()).health; const bE0 = (await p1()).energy;
  await pressDirs(["s", "d", "s", "d"]); await tap("l");   // ↓→↓→ + Special
  await waitFrames(12); await shot("motion_s2_uzumaki_barrage.png");
  await waitFrames(28);
  const bDmg = bHp0 - (await p2()).health; const bDrop = bE0 - (await p1()).energy;
  console.log(`  clones before=${bC0}, opponent Δhp=${bDmg.toFixed(0)}, energy spent=${bDrop.toFixed(0)}`);
  check("Uzumaki Barrage fired with ZERO clones (clone-independent)", bC0 === 0 && bDmg > 0, `Δhp=${bDmg.toFixed(0)}`);
  check("Uzumaki paid its own meter cost (~60)", bDrop >= 55, `Δenergy=${bDrop.toFixed(0)}`);

  // ══════════════════════════════════════════════════════════════════════════
  console.log("\n── C. BACK-TO-BACK · no interference (clones present) ───────");
  await prep();
  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  const cClones0 = await clones();
  // C1: double-QCF fires Uzumaki — must NOT consume the clones.
  const c1Hp0 = (await p2()).health;
  await pressDirs(["s", "d", "s", "d"]); await tap("l");
  await waitFrames(14); await shot("motion_s2_coexist_uzumaki.png");
  await waitFrames(20);
  const cClones1 = await clones(); const c1Dmg = c1Hp0 - (await p2()).health;
  console.log(`  C1 double-QCF→Uzumaki: clones ${cClones0}→${cClones1} (must be unchanged), Δhp=${c1Dmg.toFixed(0)}`);
  check("Uzumaki did NOT cannibalize the clone route (clones survive)", cClones1 === cClones0 && cClones0 === 2, `clones ${cClones0}→${cClones1}`);

  // C2: now a NEUTRAL Special still fires the existing clone Barrage on the surviving clones.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });  // clear motion buffer so 'l' is a NEUTRAL press
  const c2Hp0 = (await p2()).health;
  await tap("l");                                    // NEUTRAL Special = clone Barrage on the surviving clones
  await waitFrames(10); await shot("motion_s2_coexist_barrage.png");
  await waitFrames(20);
  const cClones2 = await clones(); const c2Dmg = c2Hp0 - (await p2()).health;
  console.log(`  C2 neutral→existing Barrage: clones ${cClones1}→${cClones2}, Δhp=${c2Dmg.toFixed(0)}`);
  check("existing Barrage STILL works right after Uzumaki (consumes the clones)", cClones2 === 0 && c2Dmg > 0, `clones ${cClones1}→${cClones2}, Δhp=${c2Dmg.toFixed(0)}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} STAGE 2 evidence: ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
