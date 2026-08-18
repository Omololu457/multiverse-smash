// harness/mayuri_stage5.mjs — STAGE 5: NEMU (bespoke assist character).
// Self-contained on the Pain assist architecture (spawnAssistSummon + a visual FX projectile), summoned
// via Charge + direction. Verifies BOTH assist moves:
//   • ATTACK  (Charge+Down): Nemu's own summon (row_64) rushes the foe + a horizontal impact FX (row_65),
//     and CONNECTS for damage.
//   • UPPERCUT (Charge+Up): Nemu's rising summon (row_66) + a vertical rising FX (row_67), CONNECTS and
//     LAUNCHES the dummy.
// Fires deterministically via __harness.mayuriNemu(which) (drives the real selector), plus a live
// keyboard Charge+Up to prove the real input wiring. FX overlays checked via projectiles().
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
const summons = () => page.evaluate(() => window.__harness.summons());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `mayuri_s5_${tag}.png`) }); }
async function setup(gap = 90) {
  await waitGrounded();
  await page.evaluate(() => window.__harness.clearSummons?.());
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=mayuri`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── NEMU ATTACK (Charge+Down) ──
  console.log("\n── Nemu ATTACK (Charge+Down) ──");
  { await setup(88); const hp0 = (await p2()).health;
    const r = await page.evaluate(() => window.__harness.mayuriNemu("attack"));
    check("Nemu ATTACK fires (last = attack)", r?.last === "attack", `last=${r?.last} cd=${r?.nemuCd}`);
    await waitFrames(2);
    const sm = await summons(); const nemu = sm.find(s => (s.sheet || "").includes("mayuri_nemu_attack_uniform"));
    check("Nemu's own summon SPAWNED (row_64 body)", !!nemu, `summons=${sm.map(s => (s.sheet || "").split("/").pop()).join(",")}`);
    const pr = await projs(); const fxp = pr.find(p => p.name === "nemuFx_attack" && (p.sheet || "").includes("mayuri_nemu_attack_fx"));
    check("Nemu attack FX overlay spawned (row_65)", !!fxp, `projs=${pr.map(p => p.name).join(",")}`);
    let hit = false; for (let i = 0; i < 22; i++) { if ((await p2()).health < hp0) hit = true; if (i === 9) await shot("nemu_attack"); await waitFrames(1); }   // shot @ frame ~9: Nemu rushed in + striking
    check("Nemu ATTACK connects (dmg)", hit, `hp ${hp0} → ${(await p2()).health}`);
    await waitGrounded(); await waitFrames(6);
  }

  // ── NEMU UPPERCUT (Charge+Up) — launcher ──
  console.log("\n── Nemu UPPERCUT (Charge+Up, launcher) ──");
  { await setup(80); const hp0 = (await p2()).health;
    const r = await page.evaluate(() => window.__harness.mayuriNemu("uppercut"));
    check("Nemu UPPERCUT fires (last = uppercut)", r?.last === "uppercut", `last=${r?.last}`);
    await waitFrames(2);
    const sm = await summons(); const nemu = sm.find(s => (s.sheet || "").includes("mayuri_nemu_uppercut_uniform"));
    check("Nemu's uppercut summon SPAWNED (row_66 body)", !!nemu, `summons=${sm.map(s => (s.sheet || "").split("/").pop()).join(",")}`);
    const pr = await projs(); const fxp = pr.find(p => p.name === "nemuFx_uppercut" && (p.sheet || "").includes("mayuri_nemu_uppercut_fx"));
    check("Nemu uppercut FX overlay spawned (row_67)", !!fxp, `projs=${pr.map(p => p.name).join(",")}`);
    let hit = false, launched = false; for (let i = 0; i < 22; i++) { const b = await p2(); if (b.health < hp0) hit = true; if (b.isLaunched || (b.vy || 0) < -3) launched = true; if (i === 9) await shot("nemu_uppercut"); await waitFrames(1); }   // shot @ frame ~9: Nemu rising strike
    check("Nemu UPPERCUT connects (dmg)", hit, `hp ${hp0} → ${(await p2()).health}`);
    check("Nemu UPPERCUT launches the dummy", launched, `launched=${launched}`);
    await waitGrounded(); await waitFrames(6);
  }

  // ── REAL INPUT PATH: live Charge+Up fires Nemu (proves the real wiring, not just the hook) ──
  console.log("\n── real input: hold Charge (p) + tap Up (w) → Nemu ──");
  let spawned = false;
  for (let attempt = 0; attempt < 4 && !spawned; attempt++) {
    await setup(84);
    await page.evaluate(() => { const f = window.__harness.p1(); if (f) { f.nemuCd = 0; f._nemuHeld = {}; } window.__harness.clearSummons?.(); });
    await page.keyboard.down("p"); await waitFrames(3);              // hold Charge
    await page.keyboard.down("w"); await waitFrames(1);              // tap Up (fresh edge while Charge held)
    for (let i = 0; i < 14 && !spawned; i++) { const sm = await summons(); if (sm.some(s => (s.sheet || "").includes("mayuri_nemu_"))) spawned = true; await waitFrames(1); }
    await page.keyboard.up("w"); await page.keyboard.up("p"); await waitGrounded(); await waitFrames(4);
  }
  check("live Charge+Up summons Nemu (real input wiring works)", spawned, `spawned=${spawned}`);

  // ── DATA-LEVEL contract: Nemu's 4 sheets are real files ──
  console.log("\n── data contract ──");
  const sheetsOk = await page.evaluate(async () => {
    const files = ["mayuri_nemu_attack_uniform.png", "mayuri_nemu_attack_fx_uniform.png", "mayuri_nemu_uppercut_uniform.png", "mayuri_nemu_uppercut_fx_uniform.png"];
    const res = await Promise.all(files.map(f => fetch("./" + f).then(r => r.ok).catch(() => false)));
    return res.every(Boolean);
  });
  check("Nemu's 4 sprite/FX sheets are present (body + FX, attack + uppercut)", sheetsOk, "");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Mayuri Stage 5 (Nemu): ${PASS} passed, ${FAIL} failed — shots in harness/shots/mayuri_s5_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
