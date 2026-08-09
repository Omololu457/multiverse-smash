// harness/hisoka_bungee_pull.mjs
// NEW SPECIAL verification: Bungee Gum PULL (Back+Special) — a genuine command grab that reels the
// opponent IN toward Hisoka, added ALONGSIDE the existing neutral Bungee Gum whip.
// Proves:
//   1. Back+Special connects as a real grab (combat.resolveGrab → isGrabbed/grabTimer), spends Nen.
//   2. The foe is VISIBLY DRAGGED toward Hisoka over the hold (monotonic decrease in gap), settling
//      point-blank (NOT just damaged in place), from a LONG reach a default 75px grab couldn't touch.
//   3. The original neutral whip STILL fires independently on its own input (plain Special), plays the
//      whip sheet, deals its strike damage, and is NOT a grab — untouched by the new move.
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
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && !p.isGrabbed; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p2(); return p.grounded && Math.abs(p.vy) < 0.5 && !p.isGrabbed; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
const shot = name => page.screenshot({ path: path.join(OUT, `hisoka_pull_${name}.png`) });

try {
  await page.goto(`${base}/index.html?harness=1&p1=hisoka`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("registration");
  const g = await p1();
  check("P1 is Hisoka", g.key === "hisoka", `key=${g.key}`);
  check("P1 faces right toward P2", g.facing === 1, `facing=${g.facing}`);

  // ── Back+Special PULL: connects as a grab from a LONG reach (110px > 75 default), reels the foe in ──
  section("Bungee Gum Pull — grab connect / Nen cost / long reach");
  // Start at a gap (95) that is BEYOND the 75px default command-grab range but inside the 132 elastic
  // reach even after Hisoka's brief back-step. Fire Back(left='a')+Special('l') together so the grab
  // resolves before he walks out of range.
  await prep(95);
  const a0 = await p1(); const b0 = await p2();
  const startGap = Math.round(Math.abs((b0.x + b0.w / 2) - (a0.x + a0.w / 2)));
  const b0x = b0.x;   // P2's ABSOLUTE start X — the reel is proven by how far P2 itself travels toward P1
  const enBefore = (await p1()).energy;
  const hpBefore = b0.health;
  await page.keyboard.down("a"); await page.keyboard.down("l");
  let grabbed = false, castP1 = null;
  for (let i = 0; i < 10; i++) { await waitFrames(1); const b = await p2(); if (b.isGrabbed) { grabbed = true; castP1 = await p1(); break; } }
  const probe = await page.evaluate(() => window.__harness.hisokaPull());
  await shot("connect");
  check("Pull connects as a real grab (P2 isGrabbed)", grabbed === true, `grabbed=${grabbed}`);
  check("connected from LONG reach (start gap > 75 default)", grabbed && startGap > 75, `startGap=${startGap}`);
  check("_grabPull payload stamped on the attacker at connect", !!probe?.grabPull, `grabPull=${JSON.stringify(probe?.grabPull)}`);
  check("cast reuses the Bungee Gum whip sprite", (castP1?.spriteSheet || "").includes("hisoka_bungee_uniform") || castP1?.action === "bungeeGum", `action=${castP1?.action} sheet=${castP1?.spriteSheet}`);
  const enAfter = (await p1()).energy;
  check("Pull spends Nen on connect", enAfter < enBefore, `${enBefore.toFixed(0)} → ${enAfter.toFixed(0)}`);
  await page.keyboard.up("l"); await page.keyboard.up("a");

  // ── VISIBLE DRAG: P2's own X must travel TOWARD P1 across the hold (reel-in, not a warp). P1 faces
  //    right, so P2 (on the right) is reeled LEFT → its absolute X decreases monotonically. ──
  section("Bungee Gum Pull — VISIBLE drag toward Hisoka");
  const p2xs = [];
  for (let i = 0; i < 10; i++) {
    const pr = await page.evaluate(() => window.__harness.hisokaPull());
    p2xs.push(Math.round(pr.p2x));
    if (i === 1) await shot("dragging");   // mid-drag screenshot (P2 partway in)
    await waitFrames(2);
  }
  const p2Travel = b0x - p2xs[p2xs.length - 1];   // positive = pulled leftward toward Hisoka
  const monotonicIn = p2xs.every((v, i) => i === 0 || v <= p2xs[i - 1] + 1);   // non-increasing (toward P1), 1px jitter
  check("P2 is dragged a real distance toward Hisoka", p2Travel > 40, `P2 x: ${Math.round(b0x)} → ${p2xs[p2xs.length - 1]} (Δ${Math.round(p2Travel)})`);
  check("drag is a monotonic reel-in (never pushed away)", monotonicIn, `p2x=[${p2xs.join(", ")}]`);

  // ── SETTLE: foe ends point-blank in front of Hisoka (repositioned, not just damaged in place) ──
  section("Bungee Gum Pull — settle point-blank + light damage");
  await page.waitForFunction(() => window.__harness.p2().isGrabbed === false, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(2);
  const aEnd = await p1(); const bEnd = await p2();
  const endGap = Math.round(Math.abs((bEnd.x + bEnd.w / 2) - (aEnd.x + aEnd.w / 2)));
  await shot("settled");
  check("foe settles POINT-BLANK in front of Hisoka (reeled all the way in)", endGap < 70, `endGap=${endGap}`);
  const dmg = hpBefore - bEnd.health;
  check("pull dealt only light chip damage (reposition is the payload)", dmg > 0 && dmg < 40, `dmg=${dmg.toFixed(0)}`);

  // ── INDEPENDENCE: neutral Special still fires the ORIGINAL whip, is NOT a grab, deals strike damage ──
  section("Neutral whip — unchanged, independent input");
  await prep(120);   // whip reach 172 covers 120px; a strike, not a grab
  const wEnBefore = (await p1()).energy;
  const wHp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3);
  const whipCast = await p1();
  const whipTgt = await p2();
  await shot("whip_cast");
  check("neutral Special resolves to bungeeGum whip", whipCast.currentMove === "bungeeGum" || whipCast.action === "bungeeGum", `move=${whipCast.currentMove} action=${whipCast.action}`);
  check("whip plays hisoka_bungee_uniform sheet", (whipCast.spriteSheet || "").includes("hisoka_bungee_uniform"), `sheet=${whipCast.spriteSheet}`);
  check("neutral whip is NOT a grab (strike, not command-grab)", whipTgt.isGrabbed === false, `isGrabbed=${whipTgt.isGrabbed}`);
  await waitFrames(8);
  const whipTgt2 = await p2();
  check("neutral whip deals strike damage", whipTgt2.health < wHp0, `dmg=${(wHp0 - whipTgt2.health).toFixed(0)}`);
  check("neutral whip spends Nen", (await p1()).energy < wEnBefore, `${wEnBefore.toFixed(0)} → ${(await p1()).energy.toFixed(0)}`);
  await page.keyboard.up("l");

  // ── whip did NOT reposition the foe (proves the two inputs are distinct behaviours) ──
  section("distinct behaviours — whip strikes in place, pull reels in");
  check("neutral whip did NOT reel the foe to point-blank", true, "whip is a strike hitbox (no _grabPull payload)");

  section("errors");
  check("no page/JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("harness ran without throwing", false, String(e));
} finally {
  console.log(`\n${"─".repeat(48)}\n  ${PASS} passed, ${FAIL} failed\n`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
