// harness/vilgax_stage2.mjs — STAGE 2: Vilgax's normals (claw / tentacle-whip / dive).
// For light(J)/heavy(K)/upAttack(I)/crouchLight(S+J grounded)/air(J airborne)/downAir(S+J airborne):
//   (1) resolves the correct vilgax_*_uniform sheet (no 128² fallback box)
//   (2) CONNECTS on the adjacent dummy (p2 health drops)
// The B row is a claw→tentacle-whip sequence → SPLIT into two REAL poses (light=claw, heavy=tentacle-whip).
// This special-heavy sheet has only 2 ground + 1 aerial pose, so: up REUSES heavy (upward tentacle arc =
// launcher); crouchLight REUSES light; air = REAL Aerial-B dive; down_air REUSES air. S3 = none.
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `vilgax_s2_${name}.png`) }); return; }
  const padX = 110, padTop = r.h * 1.1, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `vilgax_s2_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 48) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.45);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=vilgax`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── GROUND normals: light / heavy / upAttack ──
  console.log("\n── ground normals ──");
  const ground = [
    ["light", "j", "vilgax_light_uniform"],     // claw swipe
    ["heavy", "k", "vilgax_heavy_uniform"],     // tentacle-whip arc
    ["upAttack", "i", "vilgax_heavy_uniform"],  // launcher — REUSE tentacle-whip
  ];
  for (const [name, key, sheet] of ground) {
    await setupAdjacent();
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop(name);
    await page.keyboard.up(key); await waitFrames(24);
    const hp1 = (await p2()).health;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(14);
  }

  // ── CROUCH normal: crouchLight (hold S + J) — auto-swapped from light by _setCrouchVariant (REUSES claw) ──
  console.log("\n── crouch normal ──");
  {
    await setupAdjacent(44);
    const hp0 = (await p2()).health;
    await page.keyboard.down("s"); await waitFrames(3); await page.keyboard.down("j");
    const mv = await waitSheet("vilgax_light_uniform");
    check(`crouchLight: sprite → vilgax_light_uniform (reuse claw)`, (mv.spriteSheet || "").includes("vilgax_light_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("crouchLight");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(24);
    const hp1 = (await p2()).health;
    check(`crouchLight: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitFrames(10);
  }

  // ── AIR neutral: air (J while airborne) — REAL Aerial-B dive ──
  console.log("\n── air normals ──");
  await setupAdjacent(44);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j");
    const mv = await waitSheet("vilgax_air_uniform");
    check(`air: sprite → vilgax_air_uniform (dive)`, (mv.spriteSheet || "").includes("vilgax_air_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("air");
    await page.keyboard.up("j"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`air: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  // ── AIR down: downAir (S+J while airborne) — REUSES the dive sheet ──
  await setupAdjacent(30);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(54));
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
    const mv = await waitSheet("vilgax_air_uniform");
    check(`downAir: sprite → vilgax_air_uniform (reuse dive)`, (mv.spriteSheet || "").includes("vilgax_air_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await crop("downAir");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
    const hp1 = (await p2()).health;
    check(`downAir: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(8);

  // ── DATA-LEVEL contract: all normals wired to real vilgax sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("vilgax")?.animationData || {});
  const keys = ["light", "heavy", "up", "air", "down_air", "crouchLight"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("vilgax"));
  check("all normals wired to real vilgax sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));
  check("up REUSES heavy tentacle-whip sheet", ad.up?.sheet === ad.heavy?.sheet, `up=${(ad.up?.sheet||"").split("/").pop()} heavy=${(ad.heavy?.sheet||"").split("/").pop()}`);
  check("air + down_air REUSE dive sheet", ad.air?.sheet === ad.down_air?.sheet && (ad.air?.sheet||"").includes("vilgax_air"), `air=${(ad.air?.sheet||"").split("/").pop()} down_air=${(ad.down_air?.sheet||"").split("/").pop()}`);
  check("crouchLight REUSES light claw sheet", ad.crouchLight?.sheet === ad.light?.sheet, `crouchLight=${(ad.crouchLight?.sheet||"").split("/").pop()} light=${(ad.light?.sheet||"").split("/").pop()}`);
  const bad = await page.evaluate(() => window.__harness.charDef("vilgax")?.basic_attacks || {});
  check("crouchLight in basic_attacks", typeof bad.crouchLight?.damage === "number", `crouchLight=${JSON.stringify(bad.crouchLight)}`);
  check("upAttack typed launcher", bad.upAttack?.type === "launcher", `upAttack=${JSON.stringify(bad.upAttack)}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Vilgax Stage 2: ${PASS} passed, ${FAIL} failed — shots in harness/shots/vilgax_s2_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
