// harness/naoya_stage3.mjs — STAGE 3: Naoya's command chain — Fwd+Heavy → naoyaCombo (row_08 "low combo
// string": a crouched jab series that sweeps into a spin kick). A SINGLE committed MULTI-HIT command normal.
// Asserts: Fwd+Heavy fires naoyaCombo (currentMove), renders naoya_combo_uniform, multi-hit connects on the
// dummy (dmg > a single light jab), and the data contract wires naoyaCombo to a real naoya sheet.
// Screenshots → harness/shots/naoya_s3_*_crop.png.
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `naoya_s3_${name}.png`) }); return; }
  const padX = 130, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `naoya_s3_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 50) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 12) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=naoya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── reference: a single LIGHT jab's damage, to prove the combo string out-hits one poke (multi-hit) ──
  console.log("\n── single-jab reference ──");
  await setupAdjacent();
  const lhp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await waitFrames(18);
  const lightDmg = lhp0 - (await p2()).health;
  check("single light jab connects", lightDmg > 0, `dmg=${lightDmg}`);
  await waitGrounded(); await waitFrames(6);

  // ── Fwd+Heavy COMMAND NORMAL: naoyaCombo (6f low combo string, multi-hit) ──
  console.log("\n── Fwd+Heavy command normal (naoyaCombo) ──");
  let comboSheet = "", comboMove = "", comboDmg = 0;
  for (let attempt = 0; attempt < 8 && !(comboSheet.includes("naoya_combo_uniform") && comboMove === "naoyaCombo" && comboDmg > 0); attempt++) {
    await setupAdjacent(46);
    const hp0 = (await p2()).health;
    await page.keyboard.down("d"); await waitFrames(3);   // hold forward toward the dummy
    let mv = await p1();
    for (let r = 0; r < 6 && mv.currentMove !== "naoyaCombo"; r++) {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");
      mv = await waitSheet("naoya_combo_uniform", 8);
    }
    if (mv.currentMove === "naoyaCombo") comboMove = mv.currentMove;
    if ((mv.spriteSheet || "").includes("naoya_combo_uniform")) { comboSheet = mv.spriteSheet; await crop("cmdchain"); }
    await waitFrames(24);
    const hp1 = (await p2()).health; comboDmg += Math.max(0, hp0 - hp1);
    await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);
  }
  check("command normal fires naoyaCombo (currentMove)", comboMove === "naoyaCombo", `move=${comboMove}`);
  check("naoyaCombo → naoya_combo_uniform sprite", comboSheet.includes("naoya_combo_uniform"), `sheet=${comboSheet}`);
  check("naoyaCombo connects (multi-hit dmg)", comboDmg > 0, `dmg=${comboDmg}`);
  check("naoyaCombo is a MULTI-hit string (out-damages a single jab)", comboDmg > lightDmg, `combo=${comboDmg} vs jab=${lightDmg}`);

  // ── DATA-LEVEL contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("naoya")?.animationData || {});
  check("naoyaCombo wired to a real naoya sheet", typeof ad.naoyaCombo?.sheet === "string" && ad.naoyaCombo.sheet.includes("naoya_combo"), `sheet=${ad.naoyaCombo?.sheet}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Naoya Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/naoya_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
