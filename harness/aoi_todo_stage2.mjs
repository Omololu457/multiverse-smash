// harness/aoi_todo_stage2.mjs — STAGE 2: Aoi Todo's 5 basic normals + crouchLight (row_01 punch/kick bands).
// For light(J)/heavy(K)/upAttack(I)/air(J airborne)/downAir(S+J airborne)/crouchLight(S+J grounded):
//   (1) resolves the correct aoi_todo_*_uniform sheet (no 128² fallback box)
//   (2) CONNECTS on the adjacent dummy (p2 health drops)
// Allocation avoids double-booking the combo STRINGS (jab/cross, hook/uppercut, roundhouse) + spin-backfist/
// flying-kick/dive FX art, which are RESERVED for Stage 3 (rekka) / Stage 4 (specials). Elbow strike has no
// engine normal slot → deferred to the Stage 3 command-chain. down_air REUSES air (dive reserved for S4).
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `aoi_todo_s2_${name}.png`) }); return; }
  const padX = 130, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `aoi_todo_s2_${name}_crop.png`), clip });
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
  await page.goto(`${base}/index.html?harness=1&p1=aoi_todo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── ground normals ──");
  const ground = [
    ["light", "j", "aoi_todo_light_uniform"],
    ["heavy", "k", "aoi_todo_heavy_uniform"],
    ["upAttack", "i", "aoi_todo_up_uniform"],
  ];
  for (const [name, key, sheet] of ground) {
    await setupAdjacent();
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop(name);
    await page.keyboard.up(key); await waitFrames(26);
    const hp1 = (await p2()).health;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(14);
  }

  console.log("\n── crouch normal (Down+light → crouchLight via _setCrouchVariant) ──");
  await setupAdjacent(46);
  {
    const hp0 = (await p2()).health;
    await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("j");
    const mv = await waitSheet("aoi_todo_crouchlight_uniform");
    check(`crouchLight: sprite → aoi_todo_crouchlight_uniform`, (mv.spriteSheet || "").includes("aoi_todo_crouchlight_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("crouchLight");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(22);
    const hp1 = (await p2()).health;
    check(`crouchLight: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  console.log("\n── air normals ──");
  await setupAdjacent(50);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j");
    const mv = await waitSheet("aoi_todo_air_uniform");
    check(`air: sprite → aoi_todo_air_uniform`, (mv.spriteSheet || "").includes("aoi_todo_air_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("air");
    await page.keyboard.up("j"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  await setupAdjacent(34);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(54));
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
    const mv = await waitSheet("aoi_todo_air_uniform");
    check(`downAir: sprite → aoi_todo_air_uniform (reuse)`, (mv.spriteSheet || "").includes("aoi_todo_air_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("downAir");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`downAir: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(8);

  console.log("\n── data contract: every normal wired to a real aoi_todo_ sheet ──");
  const ad = await page.evaluate(() => window.__harness.charDef("aoi_todo")?.animationData || {});
  for (const k of ["light", "heavy", "up", "air", "down_air", "crouchLight"]) {
    check(`animationData.${k} → aoi_todo_ sheet`, (ad[k]?.sheet || "").includes("aoi_todo_"), `sheet=${ad[k]?.sheet}`);
  }
  check("down_air REUSES air sheet (flagged; dive reserved for S4)", (ad.down_air?.sheet || "") === (ad.air?.sheet || ""), `${ad.down_air?.sheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
