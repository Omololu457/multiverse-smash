// harness/omega_ranger_stage5.mjs
// STAGE 5 evidence: Omega Ranger's 3 specials fire, connect, spend energy, render right sheets.
//   Gun (neutral Special) → energy bolt projectile + cast pose
//   Super Upper (Fwd+Special) → melee launcher (own move, not the up-normal)
//   Special Downward (Down+Special) → spinning-blade ground slam
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let pass = 0, fail = 0;
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function rec() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function shot(t) { await page.screenshot({ path: path.join(OUT, `omega_stage5_${t}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=omega_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── GUN (neutral Special) — projectile ───────────────────────────────
  console.log("\n── Gun: neutral Special → energy bolt projectile ──");
  await prep(150);
  let e0 = (await p1()).energy;
  let hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); const gcast = await rec(); await page.keyboard.up("l");
  await waitFrames(2);
  const pj = await projs();
  check("gun spawns omGunBolt projectile", pj.some(p => p.name === "omGunBolt"), `projs=${pj.map(p => p.name).join(",")}`);
  check("bolt uses gun_bolt sheet", pj.some(p => (p.sheet || "").includes("gun_bolt_uniform")), `sheet=${pj[0]?.sheet}`);
  check("gun cast pose = omGun", gcast.action === "omGun", `action=${gcast.action} sheet=${gcast.spriteSheet}`);
  await shot("gun");
  await waitFrames(28);   // let the bolt travel across to the dummy
  check("gun bolt connects (dmg > 0)", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`);
  check("gun spent energy (~30)", e0 - (await p1()).energy >= 25, `spent=${e0 - (await p1()).energy}`);

  // ── SUPER UPPER (Forward + Special) — melee launcher ─────────────────
  console.log("\n── Super Upper: Fwd+Special → rising uppercut launcher ──");
  await prep(40);
  e0 = (await p1()).energy; hp0 = (await p2()).health;
  await page.keyboard.down("d"); await waitFrames(3);            // stamp Forward into directionHistory
  await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l");   // TAP special once (launcher cancels on hit → don't hold or it re-casts)
  await waitFrames(2); const su = await rec(); await shot("super_upper"); await page.keyboard.up("d");
  await waitFrames(8);
  const suP2 = await p2();
  const suSpent = e0 - (await p1()).energy;
  check("Super Upper fires omSuperUpper", su.currentMove === "omSuperUpper" || su.action === "omSuperUpper", `move=${su.currentMove} action=${su.action}`);
  check("Super Upper sheet", (seen.get("omSuperUpper") || "").includes("super_upper_attack_uniform"), `sheet=${seen.get("omSuperUpper")}`);
  check("Super Upper connects", hp0 - suP2.health > 0, `dmg=${hp0 - suP2.health}`);
  check("Super Upper launches dummy", !suP2.grounded || suP2.vy < -1, `grounded=${suP2.grounded} vy=${suP2.vy}`);
  check("Super Upper spent energy once (~45, no double-cast)", suSpent >= 40 && suSpent <= 55, `spent=${suSpent.toFixed(1)}`);

  // ── SPECIAL DOWNWARD (Down + Special) — ground slam ──────────────────
  console.log("\n── Special Downward: Down+Special → spinning-blade slam ──");
  await prep(38);
  e0 = (await p1()).energy; hp0 = (await p2()).health;
  await page.keyboard.down("s"); await waitFrames(3);            // stamp Down into directionHistory
  await page.keyboard.down("l"); await waitFrames(4); const ds = await rec(); await shot("down_special"); await page.keyboard.up("l"); await page.keyboard.up("s");
  await waitFrames(12);
  check("Special Downward fires omDownSpecial", ds.currentMove === "omDownSpecial" || ds.action === "omDownSpecial", `move=${ds.currentMove} action=${ds.action}`);
  check("Special Downward sheet", (seen.get("omDownSpecial") || "").includes("specail_downward_attack_uniform"), `sheet=${seen.get("omDownSpecial")}`);
  check("Special Downward connects", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`);
  check("Special Downward spent energy (~40)", e0 - (await p1()).energy >= 35, `spent=${e0 - (await p1()).energy}`);

  console.log("\n── no fallback box ──");
  let boxes = 0; for (const [a, s] of seen) if (!s) { boxes++; console.log(`   ⚠ '${a}' null sheet`); }
  check("no 128² fallback box", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Stage 5: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
