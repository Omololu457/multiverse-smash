// harness/tobirama_stage2.test.mjs — STAGE 2: Tobirama's 5 basic normals.
// For each of light(J)/heavy(K)/upAttack(I)/airAttack(J in air)/downAir(S+J in air):
//   (1) it resolves to the correct tobirama_*_uniform sheet (no 128² fallback box)
//   (2) it CONNECTS on the adjacent dummy (p2 health drops)
// Saves a fighter-centered crop of each active pose for visual evidence.
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
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `tobirama_s2_${name}.png`) }); return; }
  const padX = 90, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `tobirama_s2_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 60) { await waitGrounded(); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2); }

await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(5);

// GROUND normals: light / heavy / upAttack
const ground = [
  ["light", "j", "tobirama_low_kick_uniform"],
  ["heavy", "k", "tobirama_strongz_foward_attack_uniform"],
  ["upAttack", "i", "tobirama_up_kick_uniform"],
];
// Poll for the expected sheet over a few frames (robust vs the input-buffer/startup timing flake).
async function waitSheet(sheet, key, maxF = 16) {
  let mv = await p1();
  for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); }
  return mv;
}
for (const [name, key, sheet] of ground) {
  await setupAdjacent();
  const hp0 = (await p2()).health;
  await page.keyboard.down(key);
  const mv = await waitSheet(sheet, key);
  check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `action=${mv.action} sheet=${mv.spriteSheet}`);
  await crop(name);
  await page.keyboard.up(key); await waitFrames(20);
  const hp1 = (await p2()).health;
  check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  await waitFrames(16);
}

// AIR neutral: airAttack (J while airborne)
await setupAdjacent(46);
{
  const hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP1(40));
  await page.keyboard.down("j");
  const mv = await waitSheet("tobirama_super_up_kick_uniform", "j");
  check(`airAttack: sprite → tobirama_super_up_kick_uniform`, (mv.spriteSheet || "").includes("tobirama_super_up_kick_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
  await crop("airAttack");
  await page.keyboard.up("j"); await waitFrames(14);
  const hp1 = (await p2()).health;
  check(`airAttack: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
}
await waitGrounded(); await waitFrames(10);

// AIR down: downAir (S+J while airborne, above the dummy)
await setupAdjacent(30);
{
  const hp0 = (await p2()).health;
  await page.evaluate(() => window.__harness.liftP1(54));
  await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
  const mv = await p1();
  check(`downAir: sprite → tobirama_down_air_kick_uniform`, (mv.spriteSheet || "").includes("tobirama_down_air_kick_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
  await crop("downAir");
  await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
  const hp1 = (await p2()).health;
  check(`downAir: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
}

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/tobirama_s2_*_crop.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
