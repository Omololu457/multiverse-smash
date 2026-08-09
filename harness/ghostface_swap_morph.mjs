// harness/ghostface_swap_morph.mjs — GAP B: the swap-in / swap-out plays a VISIBLE transformation
// animation (spec §3 "not an instant pop") that stays purely cosmetic — it must NOT hand the swap any
// i-frames (a prior balance decision: enter/revert are non-exploitable, still eat hitstun). Asserts:
//   • swap-IN spawns a smoke poof + a teleport fade (teleportFlash > 0),
//   • swap-IN grants NO invulnerability (invulnTimer stays 0 → no free defensive window),
//   • auto-revert also spawns a poof + fade (symmetric transform-out).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const snap = () => page.evaluate(() => window.__harness.p1Snap());
const gfSwap = () => page.evaluate(() => window.__harness.gfSwap());
const puffs = () => page.evaluate(() => window.__harness.clonePuffCount());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

const MOTION = { s: ["s", "d"], a: ["s", "a"], d: ["s", "a", "d"], w: ["s", "d", "a"] };
async function pressSwapCombo(dirKey) {
  for (const k of MOTION[dirKey]) { await page.keyboard.down(k); await waitFrames(1); await page.keyboard.up(k); await waitFrames(1); }
  await page.keyboard.down("o");                          // Grab = swap modifier (Backstage Pass swap branch)
  await page.keyboard.down("l"); await waitFrames(1); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("o");
  await page.waitForFunction(() => window.__harness.gfSwap()?.active, null, { timeout: 3000, polling: 16 }).catch(() => {});   // wait for the dash to EMERGE into the swap (poof/flash are freshest here)
}
async function resetToGhostface(skin) {
  await page.evaluate(() => window.__harness.expireGfSwap());
  await waitFrames(4);
  await page.evaluate(s => { window.__harness.setSkin("p1", s); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); }, skin);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.key === "ghostface" && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 200); await waitFrames(6);   // let the reset poof/flash decay
}

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

console.log("\n════ SWAP-IN transform animation ════");
await resetToGhostface("ghostfaceBilly");
const puffsBefore = await puffs();
await pressSwapCombo("s");                 // QCF → sasuke (slot 0)
const g = await gfSwap();
const inSnap = await snap();
const puffsAfterIn = await puffs();
check("swap actually fired (became sasuke)", g.active && g.rosterKey === "sasuke", `active=${g.active} roster=${g.rosterKey}`);
check("swap-IN spawned a smoke poof", puffsAfterIn > puffsBefore, `before=${puffsBefore} after=${puffsAfterIn}`);
check("swap-IN plays a teleport fade (teleportFlash > 0)", (inSnap.teleportFlash || 0) > 0, `teleportFlash=${inSnap.teleportFlash}`);
check("swap-IN grants NO i-frames (invulnTimer === 0)", (inSnap.invulnTimer || 0) === 0, `invulnTimer=${inSnap.invulnTimer}`);

console.log("\n════ SWAP-OUT (auto-revert) transform animation ════");
await waitFrames(20);                      // let the swap-in poof/flash fully decay
const puffsPreRevert = await puffs();
await page.evaluate(() => window.__harness.expireGfSwap());
await waitFrames(3);
const r = await gfSwap();
const outSnap = await snap();
const puffsAfterOut = await puffs();
check("auto-revert back to Ghostface", r.active === false && r.rosterKey === "ghostface", `active=${r.active} roster=${r.rosterKey}`);
check("swap-OUT spawned a smoke poof", puffsAfterOut > puffsPreRevert, `pre=${puffsPreRevert} after=${puffsAfterOut}`);
check("swap-OUT plays a teleport fade (teleportFlash > 0)", (outSnap.teleportFlash || 0) > 0, `teleportFlash=${outSnap.teleportFlash}`);
check("swap-OUT grants NO i-frames (invulnTimer === 0)", (outSnap.invulnTimer || 0) === 0, `invulnTimer=${outSnap.invulnTimer}`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
