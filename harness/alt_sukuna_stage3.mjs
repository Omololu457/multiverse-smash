// harness/alt_sukuna_stage3.mjs — STAGE 3: Alternate Sukuna's Dismantle/Cleave command STRING.
// Fwd+Heavy opens altSukunaCleave1 (red crescent #1); a fresh Heavy during recovery cancels into
// altSukunaCleave2 (crescent #2 finisher) ONLY if the opener connected (cancel-on-hit). A whiff/block
// ends the string. Verifies: opener fires+connects+renders its sheet, cancel-on-hit follow-up adds damage
// + renders its sheet, whiff does NOT chain, neutral Heavy stays the `heavy` overhead normal.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function sample(n) { const acts = new Set(); const sheets = {}; for (let i = 0; i < n; i++) { const a = await p1(); if (a.action) { acts.add(a.action); if (a.spriteSheet) sheets[a.action] = a.spriteSheet; } await waitFrames(1); } return { acts, sheets }; }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); });
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
const shot = n => page.screenshot({ path: path.join(OUT, `alt_sukuna_s3_${n}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=alt_sukuna`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("Dismantle/Cleave string — Fwd+Heavy opener → cancel-on-hit → finisher");
  await prep(50);
  const hp0 = (await p2()).health;
  await page.keyboard.down("d");                          // hold forward
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // Heavy edge → altSukunaCleave1
  const s1 = await sample(8);
  await shot("cleave1");
  const hpAfterOpener = (await p2()).health;
  await waitFrames(3);                                    // drift into opener recovery
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // fresh Heavy edge → cancel into altSukunaCleave2
  const s2 = await sample(10);
  await shot("cleave2");
  await page.keyboard.up("d");
  const hpAfterChain = (await p2()).health;
  check("opener altSukunaCleave1 fires + connects", s1.acts.has("altSukunaCleave1") && hp0 - hpAfterOpener > 0, `−${(hp0 - hpAfterOpener).toFixed(0)} acts=[${[...s1.acts]}]`);
  check("opener renders alt_sukuna_cleave1 sheet", (s1.sheets["altSukunaCleave1"] || "").includes("alt_sukuna_cleave1"), `sheet=${s1.sheets["altSukunaCleave1"]}`);
  check("cancels into altSukunaCleave2 on hit", s2.acts.has("altSukunaCleave2"), `acts=[${[...s2.acts]}]`);
  check("finisher renders alt_sukuna_cleave2 sheet", (s2.sheets["altSukunaCleave2"] || "").includes("alt_sukuna_cleave2"), `sheet=${s2.sheets["altSukunaCleave2"]}`);
  check("finisher adds damage", hpAfterOpener - hpAfterChain > 0, `−${(hpAfterOpener - hpAfterChain).toFixed(0)} total −${(hp0 - hpAfterChain).toFixed(0)}`);

  section("whiff ends the string (no cancel without a hit)");
  await waitGrounded(); await waitFrames(8);
  await prep(320);                                        // dummy far away → opener whiffs
  const wp0 = (await p2()).health;
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // opener whiffs
  await waitFrames(4);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // re-press — should be ignored (no hit)
  const w = await sample(8);
  await page.keyboard.up("d");
  check("no cancel into altSukunaCleave2 after a whiff", !w.acts.has("altSukunaCleave2"), `acts=[${[...w.acts]}]`);
  check("opponent took no damage on the whiffed string", Math.abs(wp0 - (await p2()).health) < 1, `Δ=${(wp0 - (await p2()).health).toFixed(0)}`);

  section("neutral Heavy stays the `heavy` overhead normal (not the string)");
  await waitGrounded(); await waitFrames(6);
  await prep(50);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");   // neutral Heavy (no forward)
  const nh = await sample(6);
  check("neutral Heavy → heavy (not altSukunaCleave1)", nh.acts.has("heavy") && !nh.acts.has("altSukunaCleave1"), `acts=[${[...nh.acts]}]`);

  section("data contract");
  const ad = await page.evaluate(() => window.__harness.charDef("alt_sukuna")?.animationData || {});
  check("animationData.altSukunaCleave1 → alt_sukuna_cleave1 sheet", (ad.altSukunaCleave1?.sheet || "").includes("alt_sukuna_cleave1"), `sheet=${ad.altSukunaCleave1?.sheet}`);
  check("animationData.altSukunaCleave2 → alt_sukuna_cleave2 sheet", (ad.altSukunaCleave2?.sheet || "").includes("alt_sukuna_cleave2"), `sheet=${ad.altSukunaCleave2?.sheet}`);

  section("no JS errors");
  check("no page errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
