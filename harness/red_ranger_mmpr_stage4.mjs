// harness/red_ranger_mmpr_stage4.mjs
// STAGE 4 evidence: Red Ranger MMPR's "Power Sword: Overhead Strike" ULTIMATE — a freeze cinematic.
// U with ≥100 energy → cinematic activates, the sword_up_attack (ultimate) sprite plays through a FROZEN
// combat, the guaranteed heavy burst lands at the STRIKE beat, energy is spent, then it ends + resumes.
// Screenshots → harness/shots/red_ranger_mmpr_stage4_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.powerSwordCine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `red_ranger_mmpr_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=red_ranger_mmpr`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // Position + full meter.
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a0 = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a0.x + 90);
  await waitFrames(2);
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  check("has ≥100 energy for the ultimate", en0 >= 100, `energy=${en0}`);

  console.log("\n── ultimate activates as a freeze cinematic ──");
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await waitFrames(3);
  const enFire = (await p1()).energy;
  const c1 = await cine();
  check("Power Sword cinematic ACTIVE", c1.active, `active=${c1.active} phase=${c1.phase}`);
  check("cinematic caster = red_ranger_mmpr", c1.casterKey === "red_ranger_mmpr", `casterKey=${c1.casterKey}`);
  check("ultimate cost spent (~100)", en0 - enFire >= 95 && en0 - enFire <= 105, `spent=${(en0 - enFire).toFixed(0)}`);

  console.log("\n── sword sprite plays through a FROZEN combat, STRIKE lands damage ──");
  // Sample through the cinematic: capture the ultimate sprite, prove BOTH fighters are frozen, and the
  // guaranteed damage at the STRIKE beat.
  let ultSheet = null, sawStrike = false, sawStruck = false, frozenOK = true, minHp = hp0;
  const p1x0 = (await p1()).x, p2x0 = (await p2()).x;
  let strikeShotDone = false;
  for (let f = 0; f < 90; f++) {
    const s = await cine(); const a = await p1(); const d = await p2();
    if (a.castMove === "ultimate" && a.spriteSheet) ultSheet = a.spriteSheet;
    if (s.phase === "strike") sawStrike = true;
    if (s.struck) sawStruck = true;
    if (d.health < minHp) minHp = d.health;
    // frozen: neither fighter drifts while the cinematic runs (input is paused)
    if (s.active && (Math.abs(a.x - p1x0) > 6 || Math.abs(d.x - p2x0) > 6)) { /* opponent gets knocked at strike — allow after struck */ if (!s.struck) frozenOK = false; }
    if (s.phase === "strike" && s.struck && !strikeShotDone) { await shot("strike"); strikeShotDone = true; }
    if (!s.active) break;
    await waitFrames(1);
  }
  check("caster rendered the ultimate sprite (sword_up_attack)", (ultSheet || "").includes("ultimate_uniform"), `sheet=${ultSheet}`);
  check("cinematic reached the STRIKE phase", sawStrike, "");
  check("STRIKE connect fired (struck) exactly at the impact beat", sawStruck, "");
  check("combat was FROZEN before the strike (no free drift)", frozenOK, "");
  check("ultimate dealt heavy guaranteed damage (≥ 120)", hp0 - minHp >= 120, `dmg=${hp0 - minHp}`);

  console.log("\n── cinematic ends + combat resumes ──");
  await page.waitForFunction(() => !window.__harness.powerSwordCine().active, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const cEnd = await cine();
  check("cinematic ENDED", !cEnd.active, `active=${cEnd.active}`);
  await shot("resumed");
  // combat resumes: p1 can move again
  await waitGrounded();
  const bx = (await p1()).x;
  await page.keyboard.down("d"); await waitFrames(10); await page.keyboard.up("d");
  const ax = (await p1()).x;
  check("combat RESUMED (fighter can move after the cinematic)", Math.abs(ax - bx) > 3, `moved=${(ax - bx).toFixed(1)}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Red Ranger MMPR Stage 4: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
