// harness/motion_stage4_shots.mjs — STAGE 4 EVIDENCE: Flying Raijin Clones (Minato).
// Proves a clone spawns AT a REAL placed kunai mark, reusing the game's own mark-tracking data:
//   1. Throw a Flying Raijin kunai that WHIFFS → the game's onExpire→placeFlyingRaijinMark runs →
//      a real mark lands in fighter._frMarks (read back via the harness). Screenshot the mark glyph.
//   2. half-circle-forward (←↓→) + Special → Flying Raijin Clones: a clone materializes AT that mark's x
//      (asserted clone.x ≈ mark.x, NOT the beside-Minato spawn), consumes the mark, strikes.
// Outputs harness/shots/motion_s4_*.png. Run ALONE.
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
const frMarks = () => page.evaluate(() => window.__harness.p1FrMarks());
const clonesX = () => page.evaluate(() => window.__harness.summons().filter(s => s.id === "shadowClone").map(s => Math.round(s.x)));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function pressDirs(dirs) { for (const k of dirs) await page.keyboard.press(k); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

try {
  await page.goto(`${base}/index.html?harness=1&p1=minato`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);

  // Clean slate; move Minato LEFT for room, place the dummy BEYOND kunai range → the throw WHIFFS.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); window.__harness.clearP1FrMarks?.(); window.__harness.setP1Pos?.(300, null); });
  await waitFrames(2);
  const a0 = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a0.x + 1180);   // beyond the kunai's real reach → guaranteed whiff
  await waitFrames(2);

  // ── 1. REAL mark placement via a whiffing Flying Raijin kunai (neutral Special) ──
  console.log("\n── 1. Place a REAL kunai mark (neutral Special → kunai whiffs → game's onExpire places mark) ──");
  console.log(`  marks before: ${JSON.stringify(await frMarks())}`);
  await tap("l");                                       // neutral Special = Flying Raijin kunai throw
  const placed = await page.waitForFunction(() => window.__harness.p1FrMarks().length >= 1, null, { timeout: 6000, polling: 16 }).then(() => true).catch(() => false);
  const marks = await frMarks();
  const markX = marks[0]?.x;
  await shot("motion_s4_mark_placed.png");
  console.log(`  marks after whiff: ${JSON.stringify(marks)}`);
  check("a REAL Flying Raijin mark was placed by the kunai whiff (game's own onExpire)", placed && markX != null, `markX=${markX != null ? Math.round(markX) : "none"}`);

  // ── 2. Flying Raijin Clones — clone spawns AT that mark ──
  console.log("\n── 2. Flying Raijin Clones (←↓→ + Special) → clone materializes AT the placed mark ──");
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  // Bring the dummy next to the mark (keeps the scene compact + the arrival strike lands). Does NOT clear _frMarks.
  if (markX != null) { await page.evaluate(x => window.__harness.setP2X(x), markX - 70); await waitFrames(2); }
  await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });   // NOTE: does NOT clear _frMarks — the real mark persists
  const me = await p1(); const hp0 = (await p2()).health;
  await pressDirs(["a", "s", "d"]); await tap("l");   // ←↓→ (HCF) + Special
  await waitFrames(8);
  const cx = await clonesX();
  await shot("motion_s4_clone_at_mark.png");
  await waitFrames(24);
  const dmg = hp0 - (await p2()).health;
  const marksAfter = await frMarks();
  const besideSpawn = Math.round(me.x - 70);              // where an ORDINARY Minato clone would spawn (owner.x - facing*70)
  const atMark = cx.some(x => Math.abs(x - (markX - 30)) < 70);
  console.log(`  Minato.x=${Math.round(me.x)}, markX=${markX}, ordinary beside-spawn would be ≈${besideSpawn}`);
  console.log(`  spawned clone x-positions: [${cx.join(",")}]`);
  console.log(`  marks after: ${JSON.stringify(marksAfter)}, opponent Δhp=${dmg.toFixed(0)}`);
  check("clone spawned AT the real mark (not the beside-Minato position)", atMark && cx.every(x => Math.abs(x - besideSpawn) > 100), `clones=[${cx.join(",")}] markX≈${markX}`);
  check("the real mark was consumed on use", marksAfter.length === 0, `marks=${marksAfter.length}`);
  check("Flying Raijin Clones dealt damage", dmg > 0, `Δhp=${dmg.toFixed(0)}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} STAGE 4 evidence: ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
