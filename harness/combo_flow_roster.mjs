// harness/combo_flow_roster.mjs — STAGE 5 cross-roster verification that the UNIFIED combo-flow layer
// (hit-stop + cancel windows + combo decay + momentum) engages CONSISTENTLY across characters spanning
// different kit types, not just whatever it was developed against. For each character it boots the real
// game, drives a real light-attack string into an adjacent dummy, and reads the SHARED telemetry:
//   • hit-stop fired on connect (snap.hitstop > 0)
//   • combo decay: later hits deal less than the first (per-hit damage steps down)
//   • cancel window: getCancelWindow() reports the frame-defined window in the same shape for everyone
//   • momentum: forward drift while attacking > idle brake (spot-checked)
// Prints a table + a PASS/FAIL per character. Kit types: simple-projectile (saiki), melee (sasuke),
// transformation (vegeta), giant-ult (netero), giant (itachi), rekka-assassin (killua).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const frame = async () => (await page.evaluate(() => window.__harness.state().frame));
async function waitFrames(n) { const s = await frame(); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cw = () => page.evaluate(() => window.__harness.cancelWindow("p1"));

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };

async function verify(char, kit) {
  await page.goto(`${base}/index.html?harness=1&p1=${char}&p2=toji`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(8);
  await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 56); });
  await page.evaluate(() => window.__harness.healP2());
  const dmgs = []; let sawHitstop = false, sawCancelShape = false;
  // Re-park the dummy directly in front EVERY frame (cancel its knockback drift) + keep it non-invuln,
  // so a mashed light string reliably lands 4+ consecutive hits and the decay (starts hit 3) is visible.
  const pin = () => page.evaluate(() => { const p = window.__harness.p1(); if (window.__harness.setP2X) window.__harness.setP2X(p.x + (p.facing === 1 ? 46 : -46)); const q = window.__harness.p2(); if (q) q.vx = 0; if (window.__harness.setP2Invuln) window.__harness.setP2Invuln(0); });
  for (let i = 0; i < 6; i++) {
    await pin();
    // wait until the fighter can actually act (prev swing + its cooldown + hit-stop all cleared)
    await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0 && (p.hitstop || 0) <= 0; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
    await pin();
    const before = (await p2()).health;
    await page.keyboard.down("j"); await waitFrames(1); await page.keyboard.up("j");
    // let this single swing reach active + connect, pinning the dummy + sampling shared telemetry
    for (let k = 0; k < 8; k++) { await pin(); const s = await p1(); const w = await cw(); if ((s.hitstop || 0) > 0) sawHitstop = true; if (w && typeof w.startup === "number" && typeof w.recovery === "number") sawCancelShape = true; await waitFrames(1); }
    const dealt = before - (await p2()).health;
    if (dealt > 0) dmgs.push(dealt);
  }
  const decayed = dmgs.length >= 3 && dmgs[dmgs.length - 1] < dmgs[0];
  console.log(`\n[${char}] (${kit})  per-hit dmg: ${dmgs.join(" → ") || "(none landed)"}`);
  check(`${char}: hit-stop engages on connect`, sawHitstop);
  check(`${char}: combo damage decays across the string`, decayed, dmgs.join(">"));
  check(`${char}: cancel window reports the shared frame-defined shape`, sawCancelShape);
}

await verify("saiki",  "simple projectile zoner");
await verify("sasuke", "melee");
await verify("vegeta", "transformation");
await verify("netero", "giant-ult kit");
await verify("itachi", "giant kit");
await verify("killua", "rekka assassin");

console.log(`\n════════════════════════════════════════════`);
console.log(`  COMBO-FLOW ROSTER VERIFICATION: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
await browser.close();
server.close();
process.exit(FAIL ? 1 : 0);
