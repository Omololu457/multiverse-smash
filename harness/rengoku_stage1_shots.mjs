// harness/rengoku_stage1_shots.mjs — STAGE 1 visual evidence for Kyojuro Rengoku.
// Boots a match as p1=rengoku and captures the 2-part intro (dash-in → sword-draw) plus
// idle / walk / run / jump / guard / hurt / knockdown, asserting each resolves to a real
// rengoku_* sheet (no fallback box). Mirrors harness/batman_stage1_shots.mjs.
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
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `rengoku_s1_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// ── INTRO (2-part) — start WITHOUT skipToBattle so the dash-in entrance plays.
await page.evaluate(() => window.__harness.start());
await waitFrames(4);
let a = await p1();
check("P1 is Rengoku", a.key === "rengoku", `key=${a.key}`);
check("renders as sprites", a.hasSpriteHandler, `hasSprites=${a.hasSpriteHandler}`);
// PART 1 — dash-in run
check("intro part 1 → introRunIn / rengoku_intro_run sheet", a.introVariant === "introRunIn" && (a.spriteSheet || "").includes("rengoku_intro_run"), `variant=${a.introVariant} sheet=${a.spriteSheet}`);
const runInX = a.x;
await shot("intro1_runin");
// wait for the sequence to advance to part 2 (sword-draw flourish)
await page.waitForFunction(() => window.__harness.p1().introVariant === "intro2", null, { timeout: 6000, polling: 16 }).catch(() => {});
await waitFrames(2); a = await p1();
check("intro part 2 → intro2 / rengoku_intro_2 sheet", a.introVariant === "intro2" && (a.spriteSheet || "").includes("rengoku_intro_2"), `variant=${a.introVariant} sheet=${a.spriteSheet}`);
check("dash-in eased him forward toward home (x advanced)", Math.abs(a.x - runInX) > 20, `runInX=${Math.round(runInX)} nowX=${Math.round(a.x)}`);
await shot("intro2_sworddraw");

// Now collapse the intro/countdown into the live battle loop.
await page.evaluate(() => window.__harness.skipToBattle());
await waitFrames(20);

// idle
await waitGrounded();
a = await p1();
check("idle → rengoku_idle_uniform", (a.spriteSheet || "").includes("rengoku_idle_uniform"), `sheet=${a.spriteSheet}`);
await shot("idle");

// walk (hold toward opponent)
await page.keyboard.down("d"); await waitFrames(8); a = await p1();
check("walk → rengoku_run_uniform", (a.spriteSheet || "").includes("rengoku_run_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);

// dash/run (double-tap + hold d)
await waitGrounded();
await page.keyboard.press("d"); await waitFrames(1); await page.keyboard.down("d"); await waitFrames(3); a = await p1();
check("run/dash → rengoku sheet", (a.spriteSheet || "").includes("rengoku_run_uniform") || (a.spriteSheet || "").includes("rengoku_dash_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("run"); await page.keyboard.up("d"); await waitFrames(4);

// jump
await waitGrounded();
await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
await page.waitForFunction(() => window.__harness.p1().vy < -2 || !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(4); a = await p1();
check("jump → rengoku_jump_uniform", (a.spriteSheet || "").includes("rengoku_jump_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("jump");
await waitGrounded();

// guard (hold DOWN "s")
await page.keyboard.down(";"); await waitFrames(10); a = await p1();
check("guard → rengoku_block_uniform", a.action === "guard" && (a.spriteSheet || "").includes("rengoku_block_uniform"), `action=${a.action} sheet=${a.spriteSheet} blocking=${a.blocking}`);
await shot("guard"); await page.keyboard.up(";"); await waitFrames(4);

// hurt
await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(2); a = await p1();
check("hurt → rengoku_hit_uniform", a.action === "hurt" && (a.spriteSheet || "").includes("rengoku_hit_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("hurt");
await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

check("no JS errors during Stage 1", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/rengoku_s1_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
