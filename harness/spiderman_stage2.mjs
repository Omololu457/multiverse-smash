// harness/spiderman_stage2.mjs — STAGE 2: Spider-Man's 5 normals + Fwd+Heavy command normal (spiderCombo)
// + Ground Crawl evasive (Down+Special) with its kick-up exit.
// For each normal light(J)/heavy(K)/up(I)/air(J in air)/down_air(S+J in air): resolves the correct
// spiderman_*_uniform sheet AND connects on the dummy. Command normal: Fwd+Heavy → spiderCombo renders
// spiderman_cmdchain_uniform, currentMove="spiderCombo", multi-hit connects. Ground Crawl: Down+Special →
// castMove="spiderCrawl", i-frames engage, web-fluid spent, crawl-loop sheet renders. Kick-up: a Light/Heavy
// edge DURING the crawl fires spiderKickup (cancels crawl → launcher). Screenshots → harness/shots/spiderman_s2_*.
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `spiderman_s2_${name}.png`) }); return; }
  const padX = 110, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `spiderman_s2_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 56) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 18) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND normals: light / heavy / up ──
  console.log("\n── ground normals ──");
  for (const [name, key, sheet] of [["light", "j", "spiderman_light_uniform"], ["heavy", "k", "spiderman_heavy_uniform"], ["up", "i", "spiderman_up_uniform"]]) {
    await setupAdjacent();
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `action=${mv.spriteAction} sheet=${mv.spriteSheet}`);
    await crop(name);
    await page.keyboard.up(key); await waitFrames(20);
    const hp1 = (await p2()).health;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(12);
  }

  // ── AIR normals: air (J airborne) / down_air (S+J airborne) ──
  console.log("\n── air normals ──");
  await setupAdjacent(46);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j");
    const mv = await waitSheet("spiderman_air_uniform");
    check(`air: sprite → spiderman_air_uniform`, (mv.spriteSheet || "").includes("spiderman_air_uniform"), `action=${mv.spriteAction} sheet=${mv.spriteSheet}`);
    await crop("air");
    await page.keyboard.up("j"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(8);
  await setupAdjacent(30);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(54));
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
    const mv = await waitSheet("spiderman_downair_uniform");
    check(`down_air: sprite → spiderman_downair_uniform`, (mv.spriteSheet || "").includes("spiderman_downair_uniform"), `action=${mv.spriteAction} sheet=${mv.spriteSheet}`);
    await crop("downair");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`down_air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(8);

  // ── Fwd+Heavy COMMAND NORMAL: spiderCombo (9f Jump Attack Combo, multi-hit) ──
  console.log("\n── Fwd+Heavy command normal (spiderCombo) ──");
  let comboSheet = "", comboMove = "", comboDmg = 0;
  for (let attempt = 0; attempt < 8 && !(comboSheet.includes("spiderman_cmdchain_uniform") && comboMove === "spiderCombo" && comboDmg > 0); attempt++) {
    await setupAdjacent(50);
    const hp0 = (await p2()).health;
    await page.keyboard.down("d"); await waitFrames(3);   // hold forward toward the dummy
    let mv = await p1();
    for (let r = 0; r < 6 && mv.currentMove !== "spiderCombo"; r++) {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");
      mv = await waitSheet("spiderman_cmdchain_uniform", 10);
    }
    if (mv.currentMove === "spiderCombo") comboMove = mv.currentMove;
    if ((mv.spriteSheet || "").includes("spiderman_cmdchain_uniform")) { comboSheet = mv.spriteSheet; await crop("cmdchain"); }
    await waitFrames(20);
    const hp1 = (await p2()).health; comboDmg += Math.max(0, hp0 - hp1);
    await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);
  }
  check("command normal fires spiderCombo (currentMove)", comboMove === "spiderCombo", `move=${comboMove}`);
  check("spiderCombo → spiderman_cmdchain_uniform sprite", comboSheet.includes("spiderman_cmdchain_uniform"), `sheet=${comboSheet}`);
  check("spiderCombo connects (multi-hit dmg)", comboDmg > 0, `dmg=${comboDmg}`);

  // ── Ground Crawl evasive (Down+Special) ──
  console.log("\n── Ground Crawl evasive (Down+Special) ──");
  await setupAdjacent(80);
  await waitGrounded();
  const enBefore = (await p1()).energy;
  const cr = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
  await waitFrames(2);
  const crawl = await p1(); await crop("crawl");
  check("Down+Special → castMove spiderCrawl", cr?.cast === "spiderCrawl" || crawl.castMove === "spiderCrawl", `cast=${cr?.cast} castMove=${crawl.castMove}`);
  check("Ground Crawl renders spiderman_crawl_uniform", (crawl.spriteSheet || "").includes("spiderman_crawl_uniform"), `sheet=${crawl.spriteSheet}`);
  check("Ground Crawl engages i-frames (the evade)", (crawl.invulnTimer || 0) > 0, `invulnTimer=${crawl.invulnTimer}`);
  check("Ground Crawl spends web-fluid (cost 14)", enBefore - crawl.energy >= 12 && enBefore - crawl.energy <= 16, `energy ${enBefore} → ${crawl.energy}`);

  // ── Kick-up exit (Light/Heavy during the crawl → spiderKickup launcher) ──
  console.log("\n── Ground Crawl kick-up exit ──");
  let kickMove = "", kickSheet = "", kickDmg = 0;
  for (let attempt = 0; attempt < 6 && !(kickMove === "spiderKickup" && kickSheet.includes("spiderman_kickup_uniform")); attempt++) {
    await setupAdjacent(64); await waitGrounded();
    await page.evaluate(() => window.__harness.p1SpecialDir("D")); await waitFrames(2);
    const hp0 = (await p2()).health;
    await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k");
    const mv = await waitSheet("spiderman_kickup_uniform", 10);
    if (mv.currentMove === "spiderKickup") kickMove = mv.currentMove;
    if ((mv.spriteSheet || "").includes("spiderman_kickup_uniform")) { kickSheet = mv.spriteSheet; await crop("kickup"); }
    await waitFrames(16);
    const hp1 = (await p2()).health; kickDmg += Math.max(0, hp0 - hp1);
    await waitGrounded(); await waitFrames(4);
  }
  check("kick-up fires spiderKickup (currentMove) from the crawl", kickMove === "spiderKickup", `move=${kickMove}`);
  check("spiderKickup → spiderman_kickup_uniform sprite", kickSheet.includes("spiderman_kickup_uniform"), `sheet=${kickSheet}`);
  check("spiderKickup connects (launcher dmg)", kickDmg > 0, `dmg=${kickDmg}`);

  // ── DATA-LEVEL contract: all normals + command + crawl + kick-up wired to real spiderman sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("spiderman")?.animationData || {});
  const keys = ["light", "heavy", "up", "air", "down_air", "spiderCombo", "spiderCrawl", "spiderKickup"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("spiderman"));
  check("all normals + command + crawl + kick-up wired to real spiderman sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man Stage 2: ${PASS} passed, ${FAIL} failed — shots in harness/shots/spiderman_s2_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
