// harness/rengoku_stage2_shots.mjs — STAGE 2 evidence for Rengoku's 5 basic normals.
// Connects light / heavy / up(launcher) / air / down_air on a dummy, asserting each resolves
// to its real rengoku_* sheet AND deals damage (health drop). Screenshots each connect.
// Mirrors the Zenitsu canonical test's normals section (adjacent/waitSheet/liftP1 helpers).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function adjacent(gap = 58) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function waitSheet(needle, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(needle)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `rengoku_s2_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=rengoku&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(6);

// ── GROUND NORMALS ──
console.log("\n── ground normals ──");
for (const [nm, key, sheet] of [["light", "j", "rengoku_foward_slash_uniform"], ["heavy", "k", "rengoku_down_attack_uniform"], ["upAttack", "i", "rengoku_up_attack_uniform"]]) {
  await adjacent(58); const hp0 = (await p2()).health;
  await page.keyboard.down(key); const mv = await waitSheet(sheet); await shot(nm); await page.keyboard.up(key); await waitFrames(20);
  check(`${nm} → ${sheet}`, (mv.spriteSheet || "").includes(sheet), `sheet=${mv.spriteSheet}`);
  check(`${nm} connects (dmg)`, (await p2()).health < hp0, `hp ${hp0}→${(await p2()).health}`);
}
// upAttack launcher — confirm it actually launches the target airborne
await adjacent(58); { await page.evaluate(() => window.__harness.setP2Invuln?.(0)); const g0 = (await p2()).grounded; await page.keyboard.down("i"); await waitSheet("rengoku_up_attack_uniform"); await page.keyboard.up("i"); await waitFrames(6); const p2a = await p2(); check("upAttack launches (target leaves ground / vy up)", (g0 && !p2a.grounded) || p2a.vy < -1, `wasGrounded=${g0} nowGrounded=${p2a.grounded} vy=${p2a.vy?.toFixed?.(2)}`); }

// ── AERIAL NORMALS ──
console.log("\n── aerial normals ──");
// air = airborne + light(j), no down. combo_air_1 opening segment.
await adjacent(52); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(44)); await page.keyboard.down("j"); const mv = await waitSheet("rengoku_combo_air_1_uniform"); await shot("air"); await page.keyboard.up("j"); await waitFrames(14);
  check("air → rengoku_combo_air_1_uniform (opening)", (mv.spriteSheet || "").includes("rengoku_combo_air_1_uniform"), `sheet=${mv.spriteSheet}`);
  check("air connects (dmg)", (await p2()).health < hp0, `hp ${hp0}→${(await p2()).health}`); }
// down_air = airborne + down(s) + light(j). descending spike.
await adjacent(30); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(50)); await page.keyboard.down("s"); await page.keyboard.down("j"); const mv = await waitSheet("rengoku_down_air_attack_uniform", 8); await shot("down_air"); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
  check("down_air → rengoku_down_air_attack_uniform", (mv.spriteSheet || "").includes("rengoku_down_air_attack_uniform"), `sheet=${mv.spriteSheet}`);
  check("down_air connects (dmg)", (await p2()).health < hp0, `hp ${hp0}→${(await p2()).health}`); }

// ── FALLBACK-BOX SWEEP: every normal → a real rengoku_* sheet (never null / 128² box) ──
console.log("\n── fallback-box sweep ──");
const sweep = { light: "rengoku_foward_slash_uniform", heavy: "rengoku_down_attack_uniform", up: "rengoku_up_attack_uniform", air: "rengoku_combo_air_1_uniform", down_air: "rengoku_down_air_attack_uniform" };
for (const [mv, sheet] of Object.entries(sweep)) {
  const wired = await page.evaluate(async m => { const mod = await import("./characters.js"); const d = mod.characters?.rengoku?.animationData?.[m]; return d ? d.sheet : null; }, mv);
  check(`${mv} animationData → ${sheet}`, (wired || "").includes(sheet), `wired=${wired}`);
}
check("no JS errors during Stage 2", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/rengoku_s2_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
