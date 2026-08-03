// harness/green_samurai_ranger_stage2.mjs
// STAGE 2 evidence: Green Samurai Ranger's 5 normals connect + correct sheets, the SINGLE grounded
// up-attack launcher (Green has no merged tap/hold), and the Toji-Rekka command chain (samRekka1→2→Fin,
// cancel-on-hit) with a mid-chain interrupt (whiff breaks the string). Shots → harness/shots/green_stage2_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const seen = new Map();
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function record() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `green_stage2_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function sawMove(name, frames = 26) { for (let i = 0; i < frames; i++) { const a = await p1(); if (a.currentMove) seen.set(a.currentMove, a.spriteSheet || null); if (a.currentMove === name || a.action === name) return true; await waitFrames(1); } return false; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=green_samurai_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── ground normals connect + correct sheet ──");
  for (const [name, action, key, gap, sheetTag, dmgMin] of [
    ["light", "light", "j", 46, "forest_slash_uniform", 15],
    ["heavy", "heavy", "k", 46, "forest_lunge_uniform", 28],
  ]) {
    await prep(gap);
    const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); const mid = await record(); await shot(action); await page.keyboard.up(key); await waitFrames(22);
    const hp1 = (await p2()).health;
    check(`${name} connects (dmg ≥ ${dmgMin})`, hp0 - hp1 >= dmgMin, `dmg=${hp0 - hp1}`);
    check(`${name} sheet = ${sheetTag}`, (seen.get(action) || "").includes(sheetTag), `action=${mid.action} sheet=${seen.get(action)}`);
  }

  console.log("\n── single grounded up-attack launcher (Green = one tier, not merged) ──");
  await prep(42);
  let hp0 = (await p2()).health;
  await page.keyboard.down("i"); await waitFrames(4); const upRec = await record(); await shot("up"); await page.keyboard.up("i");
  await waitFrames(2);
  const upDmg = hp0 - (await p2()).health;
  check("up-attack connects (dmg > 0)", upDmg > 0, `dmg=${upDmg}`);
  check("up-attack sheet = forest_rising_uniform", (seen.get("up") || upRec.spriteSheet || "").includes("forest_rising_uniform"), `action=${upRec.action} sheet=${seen.get("up") || upRec.spriteSheet}`);
  const launched = await p2();
  check("up-attack launches dummy (rising)", !launched.grounded || launched.vy < -1, `grounded=${launched.grounded} vy=${launched.vy}`);
  await waitFrames(18);

  console.log("\n── air normals connect + correct sheet ──");
  await prep(44);
  await page.evaluate(() => window.__harness.liftP1(40));
  hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); const airRec = await record(); await shot("air"); await page.keyboard.up("j"); await waitFrames(14);
  check("air resolves to forest_aerial_uniform", (seen.get("air") || "").includes("forest_aerial_uniform"), `action=${airRec.action} sheet=${seen.get("air")}`);
  check("air connects (dmg > 0)", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`);
  await waitGrounded(); await waitFrames(8);

  await prep(30);
  await page.evaluate(() => window.__harness.liftP1(46));
  hp0 = (await p2()).health;
  await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4); const daRec = await record(); await shot("down_air"); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
  check("down_air resolves to forest_aerial_uniform", (seen.get("down_air") || "").includes("forest_aerial_uniform"), `action=${daRec.action} sheet=${seen.get("down_air")}`);
  check("down_air connects (dmg > 0)", hp0 - (await p2()).health > 0, `dmg=${hp0 - (await p2()).health}`);

  console.log("\n── Toji-Rekka command chain (Fwd+Heavy, cancel-on-hit) ──");
  await prep(50);
  const stages = new Set();
  const sample = async (n) => { for (let i = 0; i < n; i++) { const a = await p1(); if (a.currentMove) { stages.add(a.currentMove); seen.set(a.currentMove, a.spriteSheet || null); } await waitFrames(1); } };
  const chainHp0 = (await p2()).health;
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  await sample(6); await shot("rekka1");
  for (const tag of ["rekka2", "rekkaFin"]) {
    await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
    await sample(7); await shot(tag);
  }
  await waitFrames(10); await page.keyboard.up("d");
  const chainDmg = chainHp0 - (await p2()).health;
  check("chain stage 1 (samRekka1) fires on Fwd+Heavy", stages.has("samRekka1"), `stages=[${[...stages]}]`);
  check("chain advances to stage 2 (samRekka2) on re-tap after hit", stages.has("samRekka2"), `stages=[${[...stages]}]`);
  check("chain advances to finisher (samRekkaFin)", stages.has("samRekkaFin"), `stages=[${[...stages]}]`);
  check("samRekkaFin sheet = forest_launcher_uniform", (seen.get("samRekkaFin") || "").includes("forest_launcher_uniform"), `sheet=${seen.get("samRekkaFin")}`);
  check("full chain deals cumulative damage", chainDmg > 50, `total=${chainDmg}`);

  console.log("\n── mid-chain interrupt: whiff breaks the chain ──");
  await prep(360);
  const whiffHp0 = (await p2()).health;
  await page.keyboard.down("d");
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const w1 = await sawMove("samRekka1", 10);
  await waitFrames(6);
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const w2 = await sawMove("samRekka2", 14);
  await page.keyboard.up("d"); await waitFrames(6);
  check("whiffed opener still animates (samRekka1)", w1, "");
  check("chain does NOT advance after a whiff (no samRekka2)", !w2, "");
  check("whiffed chain dealt no damage", whiffHp0 - (await p2()).health === 0, `dmg=${whiffHp0 - (await p2()).health}`);

  console.log("\n── no 128² fallback box ──");
  let boxes = 0; for (const [a, s] of seen) { if (!s) { boxes++; console.log(`   ⚠ '${a}' null sheet`); } }
  check("every move rendered a real sheet", boxes === 0, `actions=${[...seen.keys()].join(",")}`);
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

  console.log(`\n${fail === 0 ? "✅" : "❌"} Green Stage 2: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
