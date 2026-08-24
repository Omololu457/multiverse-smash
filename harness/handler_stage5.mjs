// harness/handler_stage5.mjs — STAGE 5 ULTIMATE: "Mahoraga" adaptation FORM (NEW engine).
// Proves the four beats the prompt asks to see:
//   (1) WEAK ENTRY — transforms into Mahoraga (renders mahoraga sheets), reduced dmg/def mults.
//   (2) ADAPTATION — the SAME opponent move dealt against Mahoraga does progressively LESS on repeat
//       (per-move damage-reduction ladder) — a real ramp, not a flat buff.
//   (3) GROWTH — adapting to a NEW distinct move raises _mahoragaDistinct → damage/defense climb + HP regen.
//   (4) AUTO-REVERT — the timed form counts down and reverts to The Handler.
// Deterministic via __harness.p1Ultimate / spawnEnemyBolt (same-named enemy projectile) / p2Attack /
// p1MahoragaExpire. Balance numbers are PROVISIONAL (flagged BALANCE_AUDIT.md).
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `handler_s5_${tag}.png`) }); }
// fire ONE enemy testBolt at Mahoraga and return the HP it removed (measured at the moment it lands)
async function boltDrop(dmg) {
  const before = (await p1()).health;
  await page.evaluate(d => window.__harness.spawnEnemyBolt({ damage: d }), dmg);
  for (let f = 0; f < 20; f++) { await waitFrames(1); const h = (await p1()).health; if (h < before) return before - h; }
  return 0;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=handler`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5); await waitGrounded();

  // ── (1) WEAK ENTRY ──
  console.log("\n── (1) weak entry (transform into Mahoraga) ──");
  await page.evaluate(() => window.__harness.fillEnergy());
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  check("Ultimate transforms → Mahoraga (cast)", !!ult?.cast, `cast=${ult?.cast} castMove=${ult?.castMove}`);
  await waitFrames(4);
  let g = await p1();
  check("_mahoragaActive true", g.mahoragaActive === true, `active=${g.mahoragaActive}`);
  check("renders Mahoraga sprites (_skinAnim swap)", (g.spriteSheet || "").includes("mahoraga"), `sheet=${g.spriteSheet}`);
  check("WEAK entry: damageMultiplier ≈ 0.70", Math.abs((g.dmgMult || 0) - 0.70) < 0.02, `dmgMult=${g.dmgMult}`);
  check("WEAK entry: defenseMultiplier ≈ 0.85", Math.abs((g.defMult || 0) - 0.85) < 0.02, `defMult=${g.defMult}`);
  check("form duration counting (timer > 0)", (g.mahoragaTimer || 0) > 0, `timer=${g.mahoragaTimer}`);
  await shot("entry");

  // ── (2) ADAPTATION LADDER (same move → less each repeat) ──
  console.log("\n── (2) adaptation: repeated SAME move deals less each time ──");
  await page.evaluate(() => window.__harness.setP1Health(1120));   // top up so drops are readable
  const drops = [];
  for (let i = 0; i < 5; i++) { drops.push(await boltDrop(100)); await waitFrames(6); }
  console.log(`   testBolt drops: [${drops.join(", ")}]`);
  check("1st hit lands full-ish damage", drops[0] > 0, `drop0=${drops[0]}`);
  check("2nd hit < 1st (adapting)", drops[1] < drops[0], `${drops[1]} < ${drops[0]}`);
  check("3rd hit < 2nd (ramping down)", drops[2] < drops[1], `${drops[2]} < ${drops[1]}`);
  check("late hit near-immune (≤ 30% of first)", drops[4] <= drops[0] * 0.3, `drop4=${drops[4]} vs 0.3×${drops[0]}=${(drops[0]*0.3).toFixed(0)}`);
  await shot("adapt");

  // ── (3) GROWTH (distinct-adapted → mults climb + regen) ──
  console.log("\n── (3) growth: adapting to more distinct moves strengthens Mahoraga ──");
  let gA = await p1();
  check("adapted ≥ 1 distinct move (testBolt)", (gA.mahoragaDistinct || 0) >= 1, `distinct=${gA.mahoragaDistinct}`);
  check("damage grew above weak entry (>0.70)", (gA.dmgMult || 0) > 0.70, `dmgMult=${gA.dmgMult}`);
  // adapt to a 2nd DISTINCT move (a melee 'light' from p2)
  await page.evaluate(() => { const a = window.__harness.arena(); window.__harness.setP1X(Math.round(a.left + a.width * 0.45)); });
  await waitFrames(1); const px = (await p1()).x;
  await page.evaluate(x => { window.__harness.setP2X(x); }, px + 46); await waitFrames(1);
  await page.evaluate(() => window.__harness.p2Attack());
  for (let f = 0; f < 24; f++) { await waitFrames(1); if (((await p1()).mahoragaDistinct || 0) >= 2) break; }
  const gB = await p1();
  check("distinct rose after a NEW move type", (gB.mahoragaDistinct || 0) >= 2, `distinct=${gB.mahoragaDistinct}`);
  check("damageMultiplier climbed further", (gB.dmgMult || 0) > (gA.dmgMult || 0), `${gA.dmgMult} → ${gB.dmgMult}`);
  // regen: with distinct>0, HP recovers over time when below max
  await page.evaluate(() => window.__harness.setP1Health(400)); await waitFrames(1);
  const hpLo = (await p1()).health; await waitFrames(40); const hpHi = (await p1()).health;
  check("adaptation HP regen (HP rises over time)", hpHi > hpLo, `hp ${hpLo} → ${hpHi}`);

  // ── (4) AUTO-REVERT ──
  console.log("\n── (4) timed auto-revert ──");
  const forced = await page.evaluate(() => window.__harness.p1MahoragaExpire());
  check("force near-expiry accepted", forced === true, `forced=${forced}`);
  for (let f = 0; f < 12; f++) { await waitFrames(1); if (!(await p1()).mahoragaActive) break; }
  const gR = await p1();
  check("auto-reverts to The Handler", gR.mahoragaActive === false, `active=${gR.mahoragaActive}`);
  check("renders Handler sprites again", !(gR.spriteSheet || "").includes("mahoraga"), `sheet=${gR.spriteSheet}`);
  check("multipliers restored to 1", Math.abs((gR.dmgMult || 0) - 1) < 0.02 && Math.abs((gR.defMult || 0) - 1) < 0.02, `dmg=${gR.dmgMult} def=${gR.defMult}`);
  await shot("revert");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Handler Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/handler_s5_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
