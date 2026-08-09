// harness/miwa_stage1_shots.mjs — STAGE 1 evidence: Kasumi Miwa registration + movement/state.
// Verifies she boots as a REAL sprite (not a fallback box), each locomotion/state renders its own
// sheet, and the 4-intro random pool actually cycles across match starts. Writes shots to harness/shots/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function boot() {
  await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
}
async function shot(name) { await page.screenshot({ path: path.join(OUT, `miwa_s1_${name}.png`) }); }

// ── 1. REGISTRATION — boots as a real sprite (not a fallback box) ──
console.log("\n── 1. Registration + idle ──");
await boot();
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
let a = await p1();
check("Miwa is in the roster and loads", a && a.key === "miwa", `key=${a?.key}`);
check("idle renders a REAL sheet (not a fallback box)", a.spriteReady && /kasumi_idle/.test(a.spriteSheet || ""), `sheet=${a.spriteSheet}`);
await shot("idle");

// ── 2. LOCOMOTION — run / dash / jump / fall ──
console.log("\n── 2. Locomotion ──");
await page.evaluate(() => window.__harness.setP2X(1000));   // give room to the right
await page.keyboard.down("d"); await waitFrames(10); a = await p1();
check("run uses the run sheet", /kasumi_run/.test(a.spriteSheet || ""), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("run"); await page.keyboard.up("d"); await waitFrames(6);
// dash = double-tap right
await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.up("d"); await waitFrames(1); await page.keyboard.down("d"); await waitFrames(3);
a = await p1(); check("dash uses the dash sheet", /kasumi_dash/.test(a.spriteSheet || ""), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("dash"); await page.keyboard.up("d"); await waitFrames(8);
// jump
await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6);
a = await p1(); check("jump/fall uses the jump sheet", /kasumi_jump/.test(a.spriteSheet || ""), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("jump");
await page.waitForFunction(() => window.__harness.p1()?.grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});

// ── 3. STATE — guard (down/block) / hurt / knockdown ──
console.log("\n── 3. State (guard / hurt / knockdown) ──");
await page.evaluate(() => { window.__harness.healP1?.(); });
await page.keyboard.down("s"); await waitFrames(6); a = await p1();
check("down-held renders the GUARD block pose", /kasumi_guard/.test(a.spriteSheet || ""), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("guard"); await page.keyboard.up("s"); await waitFrames(4);
await page.evaluate(() => window.__harness.hurtP1?.(40)); await waitFrames(3); a = await p1();
check("hurt renders the hit sheet", /kasumi_hit/.test(a.spriteSheet || ""), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("hurt");
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.p1Knockdown?.(); }); await waitFrames(4); a = await p1();
check("knockdown renders the hit sheet (down/getup frames)", /kasumi_hit/.test(a.spriteSheet || ""), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("knockdown");
await page.evaluate(() => window.__harness.healP1?.());

// ── 4. INTRO POOL — 4 variants cycle across match starts ──
console.log("\n── 4. Intro pool (random-cycle across boots) ──");
const seen = new Set();
for (let i = 0; i < 8; i++) {
  await boot();
  await page.evaluate(() => window.__harness.start());   // NO skipToBattle → intro plays
  await waitFrames(8);
  const v = (await p1())?.introVariant;
  if (v) seen.add(v);
  const b = await p1();
  if (i < 4) { check(`intro boot ${i + 1}: plays an intro variant + real sheet`, !!v && /kasumi_intro/.test(b.spriteSheet || ""), `variant=${v} sheet=${b.spriteSheet}`); await shot(`intro_${i + 1}_${v}`); }
}
check("intro pool cycles ≥3 distinct variants over 8 starts", seen.size >= 3, `seen=${[...seen].join(", ")}`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
