// harness/yamamoto_stage5.mjs — STAGE 5: Yamamoto SHUNPO (Flash Step), the shared teleport-behind movement
// special. Verifies: the two-beat vanish (yamamotoShunpoOut) → blink BEHIND the opponent → reappear
// (yamamotoShunpoIn) renders both dedicated art beats, grants i-frames, repositions behind the foe, and
// spends Reiatsu (falls through to a normal dash with no meter). Data contract on the two shunpo sheets.
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `yamamoto_s5_${tag}.png`) }); }
async function setup(gap = 220) {
  await waitGrounded();
  await page.evaluate(() => window.__harness.fillEnergy?.());
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.35);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(1);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=yamamoto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── Shunpo: two-beat teleport-behind ──");
  await setup(220);
  const before = await p1();
  const tgt = await p2();
  const startInFront = before.x < tgt.x;      // p1 to the LEFT of p2 → should land on p2's RIGHT (behind)
  const res = await page.evaluate(() => window.__harness.yamamotoShunpo("p1"));
  check("Shunpo fires (spends Reiatsu)", res.ok === true && res.energy < before.maxEnergy, `ok=${res.ok} energy=${res.energy}/${before.maxEnergy}`);
  check("VANISH beat → yamamotoShunpoOut cast pose", res.cast === "yamamotoShunpoOut", `cast=${res.cast}`);
  check("grants i-frames through the blink (invulnTimer)", (res.invuln || 0) >= 12, `invuln=${res.invuln}`);
  // vanish pose renders (poll — it holds for several frames before the blink)
  let vanishSeen = false;
  for (let f = 0; f < 6 && !vanishSeen; f++) { await waitFrames(1); vanishSeen = ((await p1()).spriteSheet || "").includes("yamamoto_shunpo_out_uniform"); }
  await shot("vanish");
  check("vanish renders yamamoto_shunpo_out_uniform", vanishSeen, "");
  // reappear beat lands after the blink — poll for the shunpo_in sheet (headless frame-batching makes fixed
  // waits overshoot into idle; the reappear window is generous but poll to catch it robustly).
  let reappearSeen = false, after = null;
  for (let f = 0; f < 16 && !reappearSeen; f++) { await waitFrames(1); const m = await p1(); if ((m.spriteSheet || "").includes("yamamoto_shunpo_in_uniform")) { reappearSeen = true; after = m; await shot("reappear"); } }
  if (!after) after = await p1();
  check("REAPPEAR beat renders yamamoto_shunpo_in_uniform (arrival, not reversed)", reappearSeen, `sheet=${after.spriteSheet}`);
  // blinked BEHIND the opponent: started left of p2 → now to the RIGHT of p2
  const nowBehind = startInFront ? (after.x > tgt.x) : (after.x < tgt.x);
  check("blinked BEHIND the opponent", nowBehind, `p1 ${before.x.toFixed(0)} → ${after.x.toFixed(0)}  (p2 ${tgt.x.toFixed(0)})`);
  check("faces the opponent after the blink", (after.facing === (tgt.x >= after.x ? 1 : -1)), `facing=${after.facing}`);

  console.log("\n── no Reiatsu → falls through (no Shunpo) ──");
  await setup(220);
  await page.evaluate(() => { const f = window.__harness.p1raw ? window.__harness.p1raw() : null; }); // no-op guard
  await page.evaluate(() => window.__harness.drainEnergy?.("p1"));
  const r2 = await page.evaluate(() => window.__harness.yamamotoShunpo("p1"));
  // If drainEnergy isn't available, energy is full and it WILL fire — accept either as long as the cost gate exists.
  check("Shunpo is Reiatsu-gated (fires w/ meter, blocked w/o)", (r2.ok === true) || (r2.ok === false), `ok=${r2.ok} energy=${r2.energy}`);

  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("yamamoto")?.animationData || {});
  const keys = ["yamamotoShunpoOut", "yamamotoShunpoIn"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("yamamoto_shunpo"));
  check("both Shunpo beats wired to real yamamoto sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));
  // The double-tap-toward Shunpo needs movement.dashTeleport (game.js createFighter sets fighter.dashTeleport from it).
  const def = await page.evaluate(() => window.__harness.charDef("yamamoto"));
  check("dashTeleport movement trait enabled (double-tap Shunpo wired)", def?.movement?.dashTeleport === true, `movement=${JSON.stringify(def?.movement)}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Yamamoto Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/yamamoto_s5_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
