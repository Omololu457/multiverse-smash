// harness/kurapika_stage5.mjs — STAGE 5: Emperor Time ultimate (scarlet-eyed transformation).
//   • ULTIMATE at 100 Nen → enters Emperor Time: spends 100, buffs (dmg×1.30), whole-moveset Set B (__emperor)
//     sprite swap, a live ET-countdown timer.
//   • Timer counts down; force-expire → AUTO-REVERT to base + a post-revert VULNERABILITY (disorientation) window.
// Shots → harness/shots/kurapika_s5_*_crop.png.
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `kurapika_s5_${name}.png`) }); return; }
  const padX = 120, padTop = r.h * 1.3, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `kurapika_s5_${name}_crop.png`), clip });
}
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function waitSheet(sheet, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=kurapika`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── Emperor Time activation (ULTIMATE at 100 Nen) ──");
  await waitGrounded();
  await page.evaluate(() => window.__harness.fillEnergy());
  const en0 = (await p1()).energy;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  await waitFrames(3);
  let g = await p1();
  check("Ultimate cast succeeds", res.cast === true, `cast=${res.cast}`);
  check("enters Emperor Time (emperorActive + currentForm)", g.emperorActive === true && g.currentForm === "emperor", `active=${g.emperorActive} form=${g.currentForm}`);
  check("spends 100 Nen", en0 - g.energy >= 99, `energy ${en0.toFixed(0)}→${g.energy.toFixed(0)}`);
  check("damage buff applied (×1.30)", Math.abs((g.damageMultiplier || 0) - 1.30) < 0.001, `dmgMult=${g.damageMultiplier}`);
  check("ET-countdown timer running (>0)", g.emperorTimer > 0, `timer=${g.emperorTimer}`);
  await waitFrames(4); await crop("emperor_idle");

  console.log("\n── whole-moveset scarlet Set B (__emperor) sprite swap ──");
  await force("idle"); const im = await waitSheet("kurapika_idle_uniform__emperor");
  check("idle → __emperor sheet", (im.spriteSheet || "").includes("kurapika_idle_uniform__emperor"), `sheet=${im.spriteSheet}`);
  await force(null); await waitFrames(2);
  await force("light"); const lm = await waitSheet("kurapika_light_uniform__emperor");
  check("light → __emperor sheet", (lm.spriteSheet || "").includes("kurapika_light_uniform__emperor"), `sheet=${lm.spriteSheet}`);
  await crop("emperor_light"); await force(null); await waitFrames(2);

  console.log("\n── ET-countdown ticks down ──");
  const tA = (await p1()).emperorTimer;
  await waitFrames(20);
  const tB = (await p1()).emperorTimer;
  check("timer decrements over time", tB < tA, `timer ${tA} → ${tB}`);

  console.log("\n── auto-revert + canon post-revert VULNERABILITY (disorientation) ──");
  await page.evaluate(() => window.__harness.p1EmperorExpire());
  await waitFrames(4);
  g = await p1();
  check("auto-reverts at timer end (form back to base)", g.emperorActive === false && g.currentForm === "base", `active=${g.emperorActive} form=${g.currentForm}`);
  check("buff removed on revert (dmgMult = 1)", Math.abs((g.damageMultiplier || 0) - 1) < 0.001, `dmgMult=${g.damageMultiplier}`);
  check("post-revert VULNERABILITY window armed (canon memory-gap drawback)", g.emperorRevertVuln > 0, `vuln=${g.emperorRevertVuln}`);
  await crop("revert");
  const rm = await waitSheet("kurapika_idle_uniform.png", 10);
  check("art restored to base (non-__emperor) after revert", (rm.spriteSheet || "").includes("kurapika_idle_uniform.png") && !(rm.spriteSheet || "").includes("__emperor"), `sheet=${rm.spriteSheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Kurapika Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/kurapika_s5_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
