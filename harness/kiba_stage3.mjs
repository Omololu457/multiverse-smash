// harness/kiba_stage3.mjs — STAGE 3: Kiba's GATSUGA (Fang Passing Fang), 2 distinct tiers.
// Uses the deterministic __harness.p1SpecialDir(dir) trigger:
//   neutral Special → kibaGatsugaWeak  (quick drill-rush, cost 22)
//   Forward Special → kibaGatsugaStrong (bigger: superArmor, further travel, ~2× energy, cost 42)
// For each tier: fires the right currentMove, renders the right kiba_gatsuga_*_uniform sheet, spends the
// expected energy, and CONNECTS on the dummy. Then asserts the tiers are genuinely distinct (different
// sheet + Strong costs more + Strong carries superArmor) and a data-contract check.
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
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `kiba_s3_${name}.png`) }); return; }
  const padX = 130, padTop = r.h * 1.4, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `kiba_s3_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 44) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function fireTier(dir, sheet, moveName, name) {
  await setupAdjacent();
  await page.evaluate(() => window.__harness.setEnergy(180)); await waitFrames(1);
  const e0 = (await p1()).energy, hp0 = (await p2()).health;
  const res = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  await waitFrames(2);
  let mv = await p1();
  for (let f = 0; f < 14 && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); }
  const eAfter = mv.energy;
  await crop(name);
  await waitFrames(24);
  const hp1 = (await p2()).health;
  return { move: res?.move, sheet: mv.spriteSheet || "", spent: Math.max(0, e0 - eAfter), dmg: Math.max(0, hp0 - hp1) };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=kiba`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── WEAK Gatsuga — neutral Special ──
  console.log("\n── Weak Gatsuga (neutral Special) ──");
  const weak = await fireTier(null, "kiba_gatsuga_weak_uniform", "kibaGatsugaWeak", "weak");
  check("neutral Special → currentMove kibaGatsugaWeak", weak.move === "kibaGatsugaWeak", `move=${weak.move}`);
  check("Weak → kiba_gatsuga_weak_uniform sprite", weak.sheet.includes("kiba_gatsuga_weak_uniform"), `sheet=${weak.sheet}`);
  check("Weak spends ~22 energy", weak.spent >= 18 && weak.spent <= 26, `spent=${weak.spent}`);
  check("Weak connects (dmg)", weak.dmg > 0, `dmg=${weak.dmg}`);
  await waitGrounded(); await waitFrames(6);

  // ── STRONG Gatsuga — Forward Special ──
  console.log("\n── Strong Gatsuga (Forward Special) ──");
  const strong = await fireTier("F", "kiba_gatsuga_strong_uniform", "kibaGatsugaStrong", "strong");
  check("Forward Special → currentMove kibaGatsugaStrong", strong.move === "kibaGatsugaStrong", `move=${strong.move}`);
  check("Strong → kiba_gatsuga_strong_uniform sprite", strong.sheet.includes("kiba_gatsuga_strong_uniform"), `sheet=${strong.sheet}`);
  check("Strong spends ~42 energy", strong.spent >= 36 && strong.spent <= 48, `spent=${strong.spent}`);
  check("Strong connects (dmg)", strong.dmg > 0, `dmg=${strong.dmg}`);

  // ── tiers are genuinely DISTINCT ──
  console.log("\n── tier distinction ──");
  check("Weak and Strong use DIFFERENT sheets", weak.sheet !== strong.sheet && strong.sheet.includes("strong"), `weak=${weak.sheet.split("/").pop()} strong=${strong.sheet.split("/").pop()}`);
  check("Strong costs MORE energy than Weak", strong.spent > weak.spent, `weak=${weak.spent} strong=${strong.spent}`);

  // ── data-level contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("kiba")?.animationData || {});
  const keys = ["kibaGatsugaWeak", "kibaGatsugaStrong"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("kiba_gatsuga"));
  check("both Gatsuga tiers wired to real kiba sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Kiba Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/kiba_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
