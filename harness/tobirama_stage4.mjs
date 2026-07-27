// harness/tobirama_stage4.mjs
// STAGE 4 evidence: Tobirama water + space-time specials (SPECIAL button, dir-branched).
//   N = Water Dragon (proc water projectile) · F = Forward Water Slash (built-in FX melee)
//   U = Rising Water (built-in FX launcher)  · D = Water Wall (proc barrier)
//   B = Darkness Jutsu (proc dark projectile) · Water Body-Flicker escape (hitstun reversal)
// Verifies each FIRES + CONNECTS (or repositions), the procedural FX projectiles spawn, and
// saves fighter-centered crops so the placeholder FX render is visible.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const check = (n, c, e = "") => { console.log(`  ${c ? "✅" : "❌"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) return;
  const padX = 150, padTop = r.h * 1.2, padBot = 40;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `tobirama_s4_${name}_crop.png`), clip });
}
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); if (window.__harness.p1()) window.__harness.resetUlt?.(); });
  await page.evaluate(() => { const p = window.__harness.p1(); if (p) window.__harness.setP1Energy?.(200); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── N — Water Dragon Jutsu (procedural water projectile) ──────────────
  console.log("\n── Water Dragon (Neutral+Special) ──");
  await prep(160);
  let hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  await waitFrames(18);
  let pr = await projs();
  const wd = pr.find(p => p.name === "tobiWaterDragon");
  check("Water Dragon projectile spawned", !!wd, `projectiles=${JSON.stringify(pr.map(p => p.name))}`);
  check("Water Dragon travels toward opponent", !!wd && wd.vx > 0, wd ? `vx=${wd.vx}` : "");
  await crop("waterDragon");
  await waitFrames(26);
  check("Water Dragon connects (dmg)", (await p2()).health < hp0, `hp0=${hp0} → ${(await p2()).health}`);

  // ── F — Forward Water Slash (built-in water-arc FX, melee) ────────────
  console.log("\n── Forward Water Slash (Fwd+Special) ──");
  await prep(70);
  hp0 = (await p2()).health;
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l");
  let mv = await p1();
  check("Water Slash = tobiWaterSlash", mv.action === "tobiWaterSlash" || mv.currentMove === "tobiWaterSlash", `action=${mv.action} move=${mv.currentMove}`);
  await crop("waterSlash");
  await page.keyboard.up("d"); await waitFrames(16);
  check("Water Slash connects (dmg)", (await p2()).health < hp0, `Δ=${hp0 - (await p2()).health}`);

  // ── Rising Water (built-in geyser FX, launcher) = Special while AIRBORNE (or Up+Special) ──
  console.log("\n── Rising Water (Air+Special) ──");
  await prep(44);
  hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP1(38));   // airborne (no horizontal drift) → Special = Rising Water
  await page.keyboard.down("l"); await waitFrames(4); await page.keyboard.up("l");
  mv = await p1();
  check("Rising Water = tobiRisingWater", mv.action === "tobiRisingWater" || mv.currentMove === "tobiRisingWater", `action=${mv.action} move=${mv.currentMove}`);
  await crop("risingWater");
  await waitFrames(16);
  check("Rising Water connects (dmg)", (await p2()).health < hp0, `Δ=${hp0 - (await p2()).health}`);

  // ── D — Water Wall (procedural barrier) ───────────────────────────────
  // Dummy placed FAR so the stationary wall persists (isn't consumed on an instant adjacent hit) —
  // lets us catch it in projectiles() + crop the FX. Then slide the dummy onto it to prove damage.
  console.log("\n── Water Wall (Down+Special) ──");
  await prep(150);
  hp0 = (await p2()).health;
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6);
  pr = await projs();
  const ww = pr.find(p => p.name === "tobiWaterWall");
  check("Water Wall barrier spawned", !!ww, `projectiles=${JSON.stringify(pr.map(p => p.name))}`);
  await crop("waterWall");
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + (a.facing >= 0 ? 60 : -60));   // slide dummy onto the wall
  await waitFrames(16);
  check("Water Wall damages a foe on contact", (await p2()).health < hp0, `Δ=${hp0 - (await p2()).health}`);
  await page.keyboard.up("s"); await waitFrames(6);

  // ── B — Darkness Jutsu (procedural dark projectile) ───────────────────
  console.log("\n── Darkness Jutsu (Back+Special) ──");
  await prep(150);
  hp0 = (await p2()).health;
  await page.keyboard.down("a"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(13);
  pr = await projs();
  const dk = pr.find(p => p.name === "tobiDarkness");
  check("Darkness orb spawned", !!dk, `projectiles=${JSON.stringify(pr.map(p => p.name))}`);
  check("Darkness travels toward opponent", !!dk && dk.vx > 0, dk ? `vx=${dk.vx}` : "");
  await crop("darkness");
  await page.keyboard.up("a"); await waitFrames(24);
  check("Darkness connects (dmg)", (await p2()).health < hp0, `Δ=${hp0 - (await p2()).health}`);

  // ── Water Body-Flicker escape (hitstun reversal) ──────────────────────
  console.log("\n── Water Body-Flicker escape (Special during hitstun) ──");
  await prep(60);
  await page.evaluate(() => { const p = window.__harness.p1(); if (p) window.__harness.setP1Energy?.(200); });
  const x0 = (await p1()).x;
  await page.evaluate(() => window.__harness.hurtP1(40));   // put P1 in hitstun
  await waitFrames(2);
  const stunned = await p1();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");   // reversal
  const after = await p1();
  await crop("waterFlicker");
  check("was in hitstun before escape", stunned.hitstun > 0, `hitstun=${stunned.hitstun}`);
  check("escape cleared hitstun", after.hitstun === 0, `hitstun=${after.hitstun}`);
  check("escape granted i-frames", (after.invulnTimer ?? 0) > 0 || after.action === "tobiWaterFlicker", `action=${after.action}`);
  check("escape repositioned backward (retreat)", after.x < x0 - 40, `x ${x0} → ${after.x}`);
  check("escape shows tobiWaterFlicker pose", after.action === "tobiWaterFlicker", `action=${after.action}`);

  console.log("\n── integrity ──");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 4: ${pass} passed, ${fail} failed — shots in harness/shots/tobirama_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
