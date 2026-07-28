// harness/minato_stage5.mjs — STAGE 5: Reaper Death Seal + Rasengan variants.
//   Down+Special            → basic Rasengan ram
//   charge(hold P)+Down+Spc → Big Ball Rasengan (bigger)
//   charge(hold P)+Special  → REAPER DEATH SEAL (chakra AND real HP cost; devastating; NOT match-ending)
// Special = "l", charge = "p", down = "s". Standalone server (mirrors minato_stage4.mjs).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──────────────────────`);
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `minato_s5_${name}.png`) }); return; }
  const clip = { x: Math.max(0, Math.round(r.x - 220)), y: Math.max(0, Math.round(r.y - r.h * 1.4)), width: 560, height: Math.round(r.h + r.h * 1.4 + 40) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `minato_s5_${name}_crop.png`), clip });
}

await page.goto(`${base}/index.html?harness=1&p1=minato`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(30);

async function prep(gap = 60) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.healP1?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
async function pollMove(want, maxF = 20) { for (let f = 0; f < maxF; f++) { const m = (await p1()).currentMove; if (m === want) return true; await waitFrames(1); } return false; }

// ══ SANITY ══
{ const a = await p1(); check("P1 is Minato", (a.key || "").toLowerCase() === "minato", `key=${a.key}`); }

// ══ BASIC RASENGAN (Down+Special, no charge) ══
section("Rasengan (Down+Special)");
await prep(60);
{
  const before = (await p2()).health, en0 = (await p1()).energy;
  await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s");
  const posed = await pollMove("minatoRasengan");
  await crop("rasengan");
  await waitFrames(24);
  const dmg = before - (await p2()).health, en1 = (await p1()).energy;
  check("Rasengan cast pose (minatoRasengan)", posed, `move seen`);
  check("Rasengan dealt damage", dmg > 0, `Δhp=${dmg.toFixed(0)}`);
  check("Rasengan spent chakra", en1 < en0, `en ${en0.toFixed(0)} → ${en1.toFixed(0)}`);
}

// ══ BIG BALL RASENGAN (hold P + Down+Special) ══
section("Big Ball Rasengan (charge + Down+Special)");
await prep(60);
{
  const before = (await p2()).health;
  await page.keyboard.down("p"); await waitFrames(16);   // hold charge → isCharging
  const charging = (await p1()).isCharging;
  await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2);
  await page.keyboard.up("l"); await page.keyboard.up("s"); await page.keyboard.up("p");
  const posed = await pollMove("minatoBigBall");
  await crop("bigball");
  await waitFrames(28);
  const dmg = before - (await p2()).health;
  check("charge set isCharging", !!charging, `isCharging=${charging}`);
  check("Big Ball cast (minatoBigBall)", posed, `move seen`);
  check("Big Ball dealt (bigger) damage", dmg > 60, `Δhp=${dmg.toFixed(0)}`);
}

// ══ REAPER DEATH SEAL (hold P + Special) — dual cost + devastating + NOT match-ending ══
section("Reaper Death Seal (charge + Special) — chakra AND HP cost");
await prep(70);
{
  const p2before = (await p2()).health;
  const p1hp0 = (await p1()).health, en0 = (await p1()).energy;
  await page.keyboard.down("p"); await waitFrames(16);   // hold charge
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("p");
  // The Reaper summons a GIANT Shinigami (visualOnly) + grabs — verify the summon spawned.
  let summoned = false; for (let f = 0; f < 12 && !summoned; f++) { const pr = await page.evaluate(() => window.__harness.projectiles().map(p => p.name)); summoned = pr.includes("minatoShinigami"); await waitFrames(1); }
  await crop("reaper");
  await waitFrames(30);
  const p1hp1 = (await p1()).health, en1 = (await p1()).energy;
  const p2after = (await p2()).health;
  const selfCost = p1hp0 - p1hp1, dmg = p2before - p2after;
  check("Reaper summoned the giant Shinigami", summoned, `Shinigami projectile spawned`);
  check("Reaper spent CHAKRA", en1 < en0, `en ${en0.toFixed(0)} → ${en1.toFixed(0)} (−${(en0 - en1).toFixed(0)})`);
  check("Reaper cost REAL HP (self-sacrifice)", selfCost > 100, `p1 hp ${p1hp0.toFixed(0)} → ${p1hp1.toFixed(0)} (−${selfCost.toFixed(0)})`);
  check("Reaper dealt DEVASTATING damage", dmg > 200, `Δhp=${dmg.toFixed(0)}`);
  check("NOT match-ending — opponent SURVIVES from full", p2after > 0, `p2 hp=${p2after.toFixed(0)}`);
  check("NOT self-KO — Minato survives the sacrifice", p1hp1 > 0, `p1 hp=${p1hp1.toFixed(0)}`);
}

// ══ REAPER GATE — unavailable when HP too low (never self-KO / match-ending) ══
section("Reaper gate — refuses to fire below the HP threshold");
await prep(70);
{
  await page.evaluate(() => { const p = window.__harness.p1(); if (p) window.__harness.setP1Health?.(120); });
  const lowHp = (await p1()).health;
  const p2before = (await p2()).health;
  await page.keyboard.down("p"); await waitFrames(16);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("p");
  await waitFrames(20);
  const p1after = (await p1()).health, dmg = p2before - (await p2()).health;
  check("Reaper did NOT fire at low HP (no self-sacrifice)", Math.abs(p1after - lowHp) < 30, `p1 hp ${lowHp.toFixed(0)} → ${p1after.toFixed(0)}`);
}

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/minato_s5_*_crop.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
