// harness/byakuya_stage3.mjs
// STAGE 3 evidence: Byakuya's 5 basic normals (FX-less content) + the row_20 crouch-swipe variant.
//   light = iai draw-cut (row_08 f7-12)   heavy = low blade sweep (row_09 f0-3)
//   up (launcher) = raised slash (row_50)  air = forward thrust (row_48)  down_air = diagonal slash (row_45)
//   crouchLight = crouching teal swipe (row_20) via the generic crouch-variant hook (hold Down + Light).
// Each normal: correct sprite sheet resolves AND it connects (P2 loses health). Screenshots → harness/shots.
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
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(name) { const r = await page.evaluate(() => window.__harness.screenRect("p1")); const clip = r ? { x: Math.max(0, Math.round(r.x - 130)), y: Math.max(0, Math.round(r.y - r.h * 0.9)), width: Math.round(r.w + 260), height: Math.round(r.h * 2) } : null; if (clip) { if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x; if (clip.y + clip.height > 720) clip.height = 720 - clip.y; await page.screenshot({ path: path.join(OUT, `byakuya_s3_${name}.png`), clip }); } else await page.screenshot({ path: path.join(OUT, `byakuya_s3_${name}.png`) }); }
async function setupAdjacent(gap = 50) { await waitGrounded(); const arena = await page.evaluate(() => window.__harness.arena()); const midX = Math.round(arena.left + arena.width * 0.45); await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2); }
async function waitSheet(sheet, maxF = 20) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=byakuya`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── ground normals (light / heavy / up-launcher) ──");
  for (const [name, key, sheet] of [["light", "j", "byakuya_light_uniform"], ["heavy", "k", "byakuya_heavy_uniform"], ["upAttack", "i", "byakuya_up_uniform"]]) {
    await setupAdjacent();
    const hp0 = (await p2()).health;
    await page.keyboard.down(key);
    const mv = await waitSheet(sheet);
    check(`${name}: sprite → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await shot(name);
    await page.keyboard.up(key); await waitFrames(22);
    const hp1 = (await p2()).health;
    check(`${name}: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    if (name === "upAttack") { const d2 = await p2(); check("upAttack launches (P2 airborne / vy<0)", !d2.grounded || d2.vy < -1, `grounded=${d2.grounded} vy=${(d2.vy || 0).toFixed(1)}`); }
    await waitFrames(12);
  }

  console.log("\n── air normal (J airborne) ──");
  await setupAdjacent(44);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(40));
    await page.keyboard.down("j");
    const mv = await waitSheet("byakuya_air_uniform");
    check("air: sprite → byakuya_air_uniform", (mv.spriteSheet || "").includes("byakuya_air_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await shot("air");
    await page.keyboard.up("j"); await waitFrames(16);
    const hp1 = (await p2()).health;
    check("air: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(10);

  console.log("\n── down_air normal (S+J airborne) ──");
  await setupAdjacent(28);
  {
    const hp0 = (await p2()).health;
    await page.evaluate(() => window.__harness.liftP1(56));
    await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3);
    const mv = await waitSheet("byakuya_downair_uniform");
    check("down_air: sprite → byakuya_downair_uniform", (mv.spriteSheet || "").includes("byakuya_downair_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await shot("downair");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
    const hp1 = (await p2()).health;
    check("down_air: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitGrounded(); await waitFrames(8);

  console.log("\n── crouch-variant: hold Down + Light → byakuya_crouchlight_uniform ──");
  await setupAdjacent(46);
  {
    const hp0 = (await p2()).health;
    await page.keyboard.down("s"); await waitFrames(4);   // enter crouch context
    await page.keyboard.down("j");
    const mv = await waitSheet("byakuya_crouchlight_uniform");
    check("crouchLight: sprite → byakuya_crouchlight_uniform", (mv.spriteSheet || "").includes("byakuya_crouchlight_uniform"), `action=${mv.action} sheet=${mv.spriteSheet}`);
    await shot("crouchlight");
    await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(22);
    const hp1 = (await p2()).health;
    check("crouchLight: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
