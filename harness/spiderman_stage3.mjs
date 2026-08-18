// harness/spiderman_stage3.mjs — STAGE 3: Spider-Man's 5 specials.
//   Web Impact (neutral)  → cast spiderWebImpact + short-range web-puff projectile, connects
//   Web Throw (Fwd)       → cast spiderWebThrow + full-range web-ball projectile, connects
//   Dash Attack (Back)    → currentMove spiderDashAttack (spin-punch gap-closer), advances + connects
//   Handstand Flip (Up)   → currentMove spiderHandstand (anti-air launcher), connects
//   ★ Web-Throw COMBO CANCEL → during spiderCombo, after a clean hit, a Special edge CANCELS the string into
//     Web Throw (castMove flips to spiderWebBridge) — proven a REAL cancel, not two separate moves.
// Screenshots → harness/shots/spiderman_s3_*.
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `spiderman_s3_${name}.png`) }); return; }
  const padX = 200, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2.4), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `spiderman_s3_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
const refill = () => page.evaluate(() => { const p = window.__harness.p1(); if (p) window.__harness.setP1X(p.x); });
async function fullEnergy() { await page.evaluate(() => { window.__harness.boot?.(); }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── Web Impact (neutral Special) — quick short-range web puff ──
  console.log("\n── Web Impact (neutral Special) ──");
  {
    await setupAdjacent(58); await waitGrounded();
    const en0 = (await p1()).energy, hp0 = (await p2()).health;
    const r = await page.evaluate(() => window.__harness.p1SpecialDir(null));
    await waitFrames(2); const mv = await p1(); await crop("web_impact");
    check("neutral Special → castMove spiderWebImpact", (r?.cast === "spiderWebImpact") || mv.castMove === "spiderWebImpact", `cast=${r?.cast} castMove=${mv.castMove}`);
    check("Web Impact renders spiderman_webimpact_uniform", (mv.spriteSheet || "").includes("spiderman_webimpact_uniform"), `sheet=${mv.spriteSheet}`);
    check("Web Impact spends web-fluid (~16)", en0 - mv.energy >= 14 && en0 - mv.energy <= 18, `energy ${en0} → ${mv.energy}`);
    await waitFrames(16);
    const hp1 = (await p2()).health;
    check("Web Impact projectile connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await fullEnergy(); await waitFrames(3);

  // ── Web Throw (Fwd Special) — signature full-range web-ball ──
  console.log("\n── Web Throw (Fwd Special) ──");
  {
    await setupAdjacent(64); await waitGrounded();
    const en0 = (await p1()).energy, hp0 = (await p2()).health;
    const r = await page.evaluate(() => window.__harness.p1SpecialDir("F"));
    await waitFrames(2); const mv = await p1(); await crop("web_throw");
    check("Fwd Special → castMove spiderWebThrow", (r?.cast === "spiderWebThrow") || mv.castMove === "spiderWebThrow", `cast=${r?.cast} castMove=${mv.castMove}`);
    check("Web Throw renders spiderman_webthrow_uniform", (mv.spriteSheet || "").includes("spiderman_webthrow_uniform"), `sheet=${mv.spriteSheet}`);
    check("Web Throw spends web-fluid (~30)", en0 - mv.energy >= 28 && en0 - mv.energy <= 32, `energy ${en0} → ${mv.energy}`);
    await waitFrames(18);
    const hp1 = (await p2()).health;
    check("Web Throw projectile connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await fullEnergy(); await waitFrames(3);

  // ── Dash Attack (Back Special) — spin-punch gap-closer ──
  console.log("\n── Dash Attack (Back Special) ──");
  {
    await setupAdjacent(88); await waitGrounded();
    const x0 = (await p1()).x, hp0 = (await p2()).health;
    const r = await page.evaluate(() => window.__harness.p1SpecialDir("B"));
    await waitFrames(3); const mv = await p1(); await crop("dash_attack");
    check("Back Special → currentMove spiderDashAttack", (r?.move === "spiderDashAttack") || mv.currentMove === "spiderDashAttack", `move=${r?.move} currentMove=${mv.currentMove}`);
    check("Dash Attack renders spiderman_dashatk_uniform", (mv.spriteSheet || "").includes("spiderman_dashatk_uniform"), `sheet=${mv.spriteSheet}`);
    await waitFrames(14);
    const x1 = (await p1()).x, hp1 = (await p2()).health;
    check("Dash Attack advances forward (gap-closer)", Math.abs(x1 - x0) > 8, `x ${x0.toFixed(0)} → ${x1.toFixed(0)}`);
    check("Dash Attack connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await fullEnergy(); await waitFrames(3);

  // ── Handstand Flip Kick (Up Special) — anti-air launcher ──
  console.log("\n── Handstand Flip Kick (Up Special) ──");
  {
    await setupAdjacent(52); await waitGrounded();
    const hp0 = (await p2()).health;
    const r = await page.evaluate(() => window.__harness.p1SpecialDir("U"));
    await waitFrames(3); const mv = await p1(); await crop("handstand");
    check("Up Special → currentMove spiderHandstand", (r?.move === "spiderHandstand") || mv.currentMove === "spiderHandstand", `move=${r?.move} currentMove=${mv.currentMove}`);
    check("Handstand renders spiderman_handstand_uniform", (mv.spriteSheet || "").includes("spiderman_handstand_uniform"), `sheet=${mv.spriteSheet}`);
    await waitFrames(14);
    const hp1 = (await p2()).health;
    check("Handstand connects (launcher dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await fullEnergy(); await waitFrames(3);

  // ── ★ Web-Throw COMBO CANCEL: spiderCombo (hit) → Special → cancels into Web Throw (spiderWebBridge) ──
  console.log("\n── ★ Web-Throw combo-cancel bridge (spiderCombo → Special → Web Throw) ──");
  // (a) DETERMINISTIC assertion: drive the REAL updateSpidermanCommandCombat cancel path (spiderCombo mid-hit
  //     + Special edge → Web Throw). Authoritative; immune to headless frame-timing.
  await fullEnergy(); await setupAdjacent(60); await waitGrounded();
  const cc = await page.evaluate(() => window.__harness.spidermanComboCancel());
  check("★ Special during spiderCombo CANCELS the string (updateSpidermanCommandCombat returns true)", !!cc?.cancelled, `cancelled=${cc?.cancelled}`);
  check("★ cancel routes INTO Web Throw via the bridge pose (castMove spiderWebBridge)", cc?.castMove === "spiderWebBridge", `castMove=${cc?.castMove}`);
  check("★ cancel clears the combo (currentMove no longer spiderCombo)", cc?.currentMove !== "spiderCombo", `currentMove=${cc?.currentMove}`);
  check("★ cancel-Web-Throw spends web-fluid (~30, real special, not free)", cc && (180 - cc.energy) >= 28 && (180 - cc.energy) <= 32, `energy 180 → ${cc?.energy}`);

  // (b) BEST-EFFORT live keyboard repro for a screenshot (combo → Special → bridge); not asserted (timing).
  let comboSeen = false, bridged = false;
  for (let attempt = 0; attempt < 6 && !bridged; attempt++) {
    await fullEnergy(); await setupAdjacent(46); await waitGrounded();
    await page.keyboard.down("d"); await waitFrames(2);
    let mv = await p1();
    for (let r = 0; r < 6 && mv.currentMove !== "spiderCombo"; r++) { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); mv = await p1(); }
    if (mv.currentMove === "spiderCombo") comboSeen = true;
    for (let r = 0; r < 10 && !bridged; r++) {
      const q = await p1();
      if (q.castMove === "spiderWebBridge") { bridged = true; await crop("combo_cancel_bridge"); break; }
      await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await waitFrames(1);
    }
    await waitFrames(10); await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);
  }
  check("spiderCombo command normal reachable via keyboard (setup)", comboSeen, `seen=${comboSeen}`);
  if (bridged) console.log("     (live keyboard repro of the cancel captured a bridge-pose screenshot)");

  // ── DATA-LEVEL contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("spiderman")?.animationData || {});
  const keys = ["spiderWebImpact", "spiderWebThrow", "spiderWebBridge", "spiderDashAttack", "spiderHandstand"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("spiderman"));
  check("all 5 special poses wired to real spiderman sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/spiderman_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
