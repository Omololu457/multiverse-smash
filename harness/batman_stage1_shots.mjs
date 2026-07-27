// harness/batman_stage1_shots.mjs — STAGE 1 visual evidence for Batman.
// Boots a match as p1=batman and captures idle / walk / run / jump / guard / hurt /
// intro / charge frames, asserting each resolves to a real batman_* sheet (no fallback box).
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
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `batman_s1_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=batman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// INTRO — start the match WITHOUT skipToBattle so the landing entrance plays; capture it.
await page.evaluate(() => window.__harness.start());
await waitFrames(6);
let a = await p1();
check("P1 is Batman", a.key === "batman", `key=${a.key}`);
check("renders as sprites", a.hasSpriteHandler, `hasSprites=${a.hasSpriteHandler}`);
check("intro → batman_intro_uniform", (a.spriteSheet || "").includes("batman_intro_uniform"), `action=${a.action} sheet=${a.spriteSheet} introPlaying=${a.introVariant}`);
await shot("intro");

// Now collapse the intro/countdown into the live battle loop.
await page.evaluate(() => window.__harness.skipToBattle());
await waitFrames(20);

// idle
await waitGrounded();
a = await p1();
check("idle → batman_idle_uniform", (a.spriteSheet || "").includes("batman_idle_uniform"), `sheet=${a.spriteSheet}`);
await shot("idle");

// walk (hold toward opponent — normal ground speed never crosses the run threshold)
await page.keyboard.down("d"); await waitFrames(8); a = await p1();
check("walk → batman_walk_uniform", (a.spriteSheet || "").includes("batman_walk_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);

// dash (double-tap d) → the run/dash cape-sweep sheet (batman_run_uniform, shared by run+dash)
await waitGrounded();
await page.keyboard.press("d"); await waitFrames(1); await page.keyboard.down("d"); await waitFrames(3); a = await p1();
check("dash/run → batman_run_uniform", (a.spriteSheet || "").includes("batman_run_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("run"); await page.keyboard.up("d"); await waitFrames(4);

// jump
await waitGrounded();
await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
await page.waitForFunction(() => window.__harness.p1().vy < -2 || !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(4); a = await p1();
check("jump → batman_jump_uniform", (a.spriteSheet || "").includes("batman_jump_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("jump");
await waitGrounded();

// guard (block = hold DOWN "s")
await page.keyboard.down("s"); await waitFrames(10); a = await p1();
check("guard → batman_guard_uniform", a.action === "guard" && (a.spriteSheet || "").includes("batman_guard_uniform"), `action=${a.action} sheet=${a.spriteSheet} blocking=${a.blocking}`);
await shot("guard"); await page.keyboard.up("s"); await waitFrames(4);

// charge (hold P)
await waitGrounded();
await page.keyboard.down("p"); await waitFrames(10); a = await p1();
check("charge → batman_charge_uniform", (a.spriteSheet || "").includes("batman_charge_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("charge"); await page.keyboard.up("p"); await waitFrames(4);

// hurt
await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(3); a = await p1();
check("hurt → batman_hit_uniform", a.action === "hurt" && (a.spriteSheet || "").includes("batman_hit_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("hurt");
await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/batman_s1_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
