// harness/byakuya_stage4.mjs
// STAGE 4 evidence: Byakuya's specials (schema-exception Shunpo-swordsman kit).
//   GROUND: N=Senbonzakura Petal Cast (scatter projectile connects) / D=Straight Thrust (advancing melee) /
//           U=Utsusemi Re-form Overhead / F=Utsusemi Re-form Thrust (both TELEPORT to the foe then strike) /
//           B=Shunpo blink (retreat reposition + i-frames + alpha-fade).
//   AIR:    N=Jump Slash / F=Airborne Vault.
// Each fires via __harness.p1SpecialDir(dir); teleport-strikes must CLOSE distance + connect; Shunpo must
// reposition AWAY with i-frames. Screenshots → harness/shots/byakuya_s4_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const snap = () => page.evaluate(() => window.__harness.p1Snap());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const castDir = (d) => page.evaluate(dd => window.__harness.p1SpecialDir(dd), d);
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(name) { const r = await page.evaluate(() => window.__harness.screenRect("p1")); const clip = r ? { x: Math.max(0, Math.round(r.x - 200)), y: Math.max(0, Math.round(r.y - r.h)), width: Math.round(r.w + 400), height: Math.round(r.h * 2.2) } : null; if (clip) { if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x; if (clip.y + clip.height > 720) clip.height = 720 - clip.y; await page.screenshot({ path: path.join(OUT, `byakuya_s4_${name}.png`), clip }); } else await page.screenshot({ path: path.join(OUT, `byakuya_s4_${name}.png`) }); }
async function setup(gap = 90) { await waitGrounded(); const arena = await page.evaluate(() => window.__harness.arena()); const midX = Math.round(arena.left + arena.width * 0.40); await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap); await waitFrames(2); }
async function waitSheet(sheet, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=byakuya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── N: Senbonzakura Petal Cast (scatter projectile) ──
  console.log("\n── Neutral: Senbonzakura Petal Cast ──");
  await setup(120);
  { const r = await castDir(null);
    check("cast pose = byakuyaPetalCast", r?.cast === "byakuyaPetalCast", `cast=${r?.cast}`);
    // petals spawn staggered on frames ~9/12/15 → poll across the window (they may fly past & despawn fast)
    let sawPetal = false, seen = "";
    for (let i = 0; i < 16; i++) { const pl = await projs(); if (pl.some(p => (p.name || "").includes("byakuyaPetal"))) { sawPetal = true; seen = pl.map(p => p.name).join(","); if (i >= 4) break; } await waitFrames(1); }
    check("petal projectile(s) spawned", sawPetal, `projs seen=${seen}`);
    await shot("petalcast");
    const hp0 = (await p2()).health; await waitFrames(26); const hp1 = (await p2()).health;
    check("petals connect (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1}`);
  }
  await waitFrames(8);

  // ── D: Straight Thrust (advancing melee) ──
  console.log("\n── Down: Straight Thrust ──");
  await setup(56);
  { const hp0 = (await p2()).health;
    const r = await castDir("D");
    check("move = byakuyaThrust", (r?.move === "byakuyaThrust") || (r?.cast === "byakuyaThrust"), `move=${r?.move} cast=${r?.cast}`);
    await waitSheet("byakuya_thrust_uniform"); await shot("thrust");
    await waitFrames(22); const hp1 = (await p2()).health;
    check("Straight Thrust connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitFrames(8);

  // ── U / F: Utsusemi Re-form (teleport-strike branch) ──
  for (const [name, dir, sheet] of [["Up: Re-form Overhead", "U", "byakuya_reform_overhead_uniform"], ["Fwd: Re-form Thrust", "F", "byakuya_reform_thrust_uniform"]]) {
    console.log(`\n── ${name} (teleport-strike) ──`);
    await setup(230);   // FAR — the teleport must close the gap
    const a0 = await p1(); const d0 = Math.abs((await p2()).x - a0.x);
    const hp0 = (await p2()).health;
    const r = await castDir(dir);
    check(`${name}: vanish pose = byakuyaReformVanish`, r?.cast === "byakuyaReformVanish", `cast=${r?.cast}`);
    const mv = await waitSheet(sheet, 30);
    check(`${name}: strike sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `sheet=${mv.spriteSheet}`);
    const a1 = await p1(); const d1 = Math.abs((await p2()).x - a1.x);
    check(`${name}: teleport CLOSED the gap`, d1 < d0 - 40, `dist ${d0.toFixed(0)} → ${d1.toFixed(0)}`);
    await shot(dir === "U" ? "reform_overhead" : "reform_thrust");
    await waitFrames(20); const hp1 = (await p2()).health;
    check(`${name}: strike connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(8);
  }

  // ── B: Shunpo blink (retreat + i-frames + alpha-fade) ──
  console.log("\n── Back: Shunpo blink ──");
  await setup(70);
  { const a0 = await p1(); const d0 = Math.abs((await p2()).x - a0.x);
    const r = await castDir("B");
    check("Shunpo cast pose = byakuyaShunpoOut", r?.cast === "byakuyaShunpoOut", `cast=${r?.cast}`);
    const s = await snap();
    check("Shunpo grants i-frames (invulnTimer > 0)", (s?.invulnTimer || 0) > 0, `invuln=${s?.invulnTimer}`);
    await shot("shunpo");
    await waitFrames(10);
    const a1 = await p1(); const d1 = Math.abs((await p2()).x - a1.x);
    check("Shunpo repositioned AWAY (gap widened)", d1 > d0 + 40, `dist ${d0.toFixed(0)} → ${d1.toFixed(0)}`);
  }
  await waitFrames(8);

  // ── AIR: Jump Slash (neutral) + Airborne Vault (Fwd) ──
  for (const [name, dir, sheet] of [["air neutral: Jump Slash", null, "byakuya_jumpslash_uniform"], ["air Fwd: Airborne Vault", "F", "byakuya_airvault_uniform"]]) {
    console.log(`\n── ${name} ──`);
    await setup(46);
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(44)); await waitFrames(2);
    const r = await castDir(dir);
    check(`${name}: move → ${sheet.replace("byakuya_", "").replace("_uniform", "")}`, (r?.move || "").length > 0, `move=${r?.move} cast=${r?.cast}`);
    const mv = await waitSheet(sheet, 20);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `sheet=${mv.spriteSheet}`);
    await shot(dir === "F" ? "airvault" : "jumpslash");
    await waitFrames(14); const hp1 = (await p2()).health;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(6);
  }

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
