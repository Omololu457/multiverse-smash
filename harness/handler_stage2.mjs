// harness/handler_stage2.mjs — STAGE 2: The Handler's basic normals (carved from the single ground
// combo string) + standard-string membership.
// For light(J)/heavy(K)/upAttack(I)/air(J airborne)/downAir(S+J airborne):
//   (1) it resolves the correct handler_*_uniform sheet (no 128² fallback box)
//   (2) it CONNECTS on the adjacent dummy (p2 health drops)
//   (3) light damage is ×0.60-scaled (drop < the unscaled basic damage 40)
// Plus a data contract: every normal wired to a real handler sheet; air/down_air REUSE the light punch
// sheet (honest reuse — no aerial art); The Handler is registered in the STANDARD_STRING grammar so
// Light→Light→Heavy(launcher) = "punch→punch→blade-drawn strike".
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { STANDARD_STRING, standardStringKeys } from "../comboStandard.js";
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `handler_s2_${name}.png`) }); return; }
  const padX = 130, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `handler_s2_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 46) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.45);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=handler`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND normals: light / heavy / upAttack ──
  console.log("\n── ground normals ──");
  const ground = [
    ["light", "j", "handler_light_uniform", 40],
    ["heavy", "k", "handler_heavy_uniform", 78],
    ["upAttack", "i", "handler_up_uniform", 60],
  ];
  for (const [name, key, sheet, base0] of ground) {
    await setupAdjacent();
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop(name);
    await page.keyboard.up(key); await waitFrames(24);
    const hp1 = (await p2()).health; const drop = hp0 - hp1;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${drop.toFixed(0)})`);
    check(`${name}: damage ×0.60-scaled (drop < unscaled ${base0})`, drop > 0 && drop < base0, `drop=${drop.toFixed(0)} < ${base0}`);
    await waitFrames(14);
  }

  // ── AIR neutral: air (J while airborne) — REUSES the light punch sheet (no aerial art) ──
  console.log("\n── air normals (reuse light punch) ──");
  await setupAdjacent(42);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j");
    const mv = await waitSheet("handler_light_uniform");
    check(`air: sprite → handler_light_uniform (reuse)`, (mv.spriteSheet || "").includes("handler_light_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("air");
    await page.keyboard.up("j"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  // ── AIR down: downAir (S+J while airborne) — REUSES the light punch sheet ──
  await setupAdjacent(30);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(54));
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
    const mv = await waitSheet("handler_light_uniform");
    check(`downAir: sprite → handler_light_uniform (reuse)`, (mv.spriteSheet || "").includes("handler_light_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("downAir");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`downAir: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(8);

  // ── DATA-LEVEL contract: all 5 normals wired to real handler sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("handler")?.animationData || {});
  const keys = ["light", "heavy", "up", "air", "down_air"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("handler"));
  check("all 5 normals wired to real handler sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));
  check("air + down_air REUSE the light punch sheet (honest reuse)", ad.air?.sheet === ad.light?.sheet && ad.down_air?.sheet === ad.light?.sheet, `air=${(ad.air?.sheet||"").split("/").pop()} down_air=${(ad.down_air?.sheet||"").split("/").pop()} light=${(ad.light?.sheet||"").split("/").pop()}`);

  // ── STANDARD-STRING membership (Light→Light→Heavy launcher = the basic combo) ──
  console.log("\n── standard-string membership ──");
  check("handler ∈ STANDARD_STRING.added (registry)", STANDARD_STRING.added.includes("handler"), STANDARD_STRING.added.join(","));
  check("handler ∈ standardStringKeys()", standardStringKeys().includes("handler"), "");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Handler Stage 2: ${PASS} passed, ${FAIL} failed — shots in harness/shots/handler_s2_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
