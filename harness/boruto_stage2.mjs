// harness/boruto_stage2.mjs — STAGE 2: Boruto's 5 basic normals + Low Sweep bonus + aerial cancel string.
// For each of light(J)/heavy(K)/upAttack(I)/air(J airborne)/downAir(S+J airborne):
//   (1) it resolves to the correct boruto_*_uniform sheet (no 128² fallback box)
//   (2) it CONNECTS on the adjacent dummy (p2 health drops)
// Then the command normals: GROUND Down+Heavy → borutoLowSweep (forced-knockdown sweep) and the AIR-Heavy
// cancel string borutoAirCombo1 → re-tap Heavy on hit → borutoAirCombo2 (spinning-dive spike). Finally a
// data-level contract that every normal + all 3 command normals are wired to real boruto sheets.
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `boruto_s2_${name}.png`) }); return; }
  const padX = 100, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `boruto_s2_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 52) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.45);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=boruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND normals: light / heavy / upAttack ──
  console.log("\n── ground normals ──");
  const ground = [
    ["light", "j", "boruto_light_uniform"],
    ["heavy", "k", "boruto_heavy_uniform"],
    ["upAttack", "i", "boruto_up_uniform"],
  ];
  for (const [name, key, sheet] of ground) {
    await setupAdjacent();
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop(name);
    await page.keyboard.up(key); await waitFrames(22);
    const hp1 = (await p2()).health;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(14);
  }

  // ── AIR neutral: air (J while airborne) ──
  console.log("\n── air normals ──");
  await setupAdjacent(46);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j");
    const mv = await waitSheet("boruto_air_uniform");
    check(`air: sprite → boruto_air_uniform`, (mv.spriteSheet || "").includes("boruto_air_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("air");
    await page.keyboard.up("j"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  // ── AIR down: downAir (S+J while airborne, above the dummy) ──
  await setupAdjacent(30);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(54));
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
    const mv = await waitSheet("boruto_downair_uniform");
    check(`downAir: sprite → boruto_downair_uniform`, (mv.spriteSheet || "").includes("boruto_downair_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("downAir");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`downAir: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(8);

  // ── GROUND Down+Heavy COMMAND NORMAL: borutoLowSweep (forced-knockdown sweep) ──
  console.log("\n── Down+Heavy command normal (borutoLowSweep) ──");
  let swSheet = "", swMove = "", swDmg = 0;
  for (let attempt = 0; attempt < 8 && !(swSheet.includes("boruto_lowsweep_uniform") && swMove === "borutoLowSweep" && swDmg > 0); attempt++) {
    await setupAdjacent(46);
    const hp0 = (await p2()).health;
    await page.keyboard.down("s"); await waitFrames(2);
    let mv = await p1();
    for (let r = 0; r < 6 && mv.currentMove !== "borutoLowSweep"; r++) {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");
      mv = await waitSheet("boruto_lowsweep_uniform", 10);
    }
    if (mv.currentMove === "borutoLowSweep") swMove = mv.currentMove;
    if ((mv.spriteSheet || "").includes("boruto_lowsweep_uniform")) { swSheet = mv.spriteSheet; await crop("lowsweep"); }
    await waitFrames(20);
    const hp1 = (await p2()).health; swDmg += Math.max(0, hp0 - hp1);
    await page.keyboard.up("s"); await waitGrounded(); await waitFrames(4);
  }
  check("Down+Heavy fires borutoLowSweep (currentMove)", swMove === "borutoLowSweep", `move=${swMove}`);
  check("borutoLowSweep → boruto_lowsweep_uniform sprite", swSheet.includes("boruto_lowsweep_uniform"), `sheet=${swSheet}`);
  check("borutoLowSweep connects (dmg)", swDmg > 0, `dmg=${swDmg}`);

  // ── AIR-Heavy CANCEL STRING: borutoAirCombo1 → re-tap Heavy on hit → borutoAirCombo2 ──
  console.log("\n── air-Heavy cancel string (borutoAirCombo1 → borutoAirCombo2) ──");
  let c1Sheet = "", c1Move = "", c1Dmg = 0, c2Seen = false, c2Sheet = "";
  for (let attempt = 0; attempt < 10 && !(c1Sheet.includes("boruto_aircombo1_uniform") && c1Move === "borutoAirCombo1" && c1Dmg > 0 && c2Seen); attempt++) {
    await setupAdjacent(44);
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(48)); await waitFrames(1);
    // opener
    await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");
    let mv = await waitSheet("boruto_aircombo1_uniform", 10);
    if (mv.currentMove === "borutoAirCombo1") c1Move = mv.currentMove;
    if ((mv.spriteSheet || "").includes("boruto_aircombo1_uniform")) { c1Sheet = mv.spriteSheet; await crop("aircombo1"); }
    // cancel into combo2 on a re-tap (only advances if the opener connected)
    for (let r = 0; r < 5 && !c2Seen; r++) {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");
      const mv2 = await waitSheet("boruto_aircombo2_uniform", 6);
      if ((mv2.spriteSheet || "").includes("boruto_aircombo2_uniform") || mv2.currentMove === "borutoAirCombo2") { c2Seen = true; c2Sheet = mv2.spriteSheet || ""; await crop("aircombo2"); }
    }
    await waitFrames(12);
    const hp1 = (await p2()).health; c1Dmg += Math.max(0, hp0 - hp1);
    await waitGrounded(); await waitFrames(4);
  }
  check("Air-Heavy fires borutoAirCombo1 (currentMove)", c1Move === "borutoAirCombo1", `move=${c1Move}`);
  check("borutoAirCombo1 → boruto_aircombo1_uniform sprite", c1Sheet.includes("boruto_aircombo1_uniform"), `sheet=${c1Sheet}`);
  check("air cancel string connects (dmg)", c1Dmg > 0, `dmg=${c1Dmg}`);
  check("re-tap cancels into borutoAirCombo2", c2Seen, `sheet=${c2Sheet}`);

  // ── DATA-LEVEL contract: all normals + all 3 command normals wired to real boruto sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("boruto")?.animationData || {});
  const keys = ["light", "heavy", "up", "air", "down_air", "borutoLowSweep", "borutoAirCombo1", "borutoAirCombo2"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("boruto"));
  check("all 5 normals + 3 command normals wired to real boruto sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Boruto Stage 2: ${PASS} passed, ${FAIL} failed — shots in harness/shots/boruto_s2_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
