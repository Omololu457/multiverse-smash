// harness/flash_stage1_shots.mjs — STAGE 1 visual evidence for The Flash.
// Boots a match as p1=flash and captures idle / run / jump / guard / hurt frames,
// asserting each resolves to a real flash_* sheet (no fallback box).
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
async function shot(name) { await page.screenshot({ path: path.join(OUT, `flash_s1_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=flash`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(20);

// idle
await waitGrounded();
let a = await p1();
check("P1 is Flash", a.key === "flash", `key=${a.key}`);
check("renders as sprites", a.hasSpriteHandler, "");
check("idle → flash_idle_uniform", (a.spriteSheet || "").includes("flash_idle_uniform"), `sheet=${a.spriteSheet}`);
await shot("idle");

// run (hold toward opponent)
await page.keyboard.down("d"); await waitFrames(18); a = await p1();
check("run → flash_run_uniform", (a.spriteSheet || "").includes("flash_run_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("run"); await page.keyboard.up("d"); await waitFrames(4);

// jump
await waitGrounded();
await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
await page.waitForFunction(() => window.__harness.p1().vy < -2 || !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(4); a = await p1();
check("jump → flash_jump_uniform", (a.spriteSheet || "").includes("flash_jump_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("jump");
await waitGrounded();

// guard (hold back = away from opponent). p2 is to the right, so hold left "a".
await page.keyboard.down("a"); await waitFrames(2); await page.keyboard.up("a"); // face away briefly
await waitGrounded();
await page.keyboard.down(";"); await waitFrames(14); a = await p1();
check("guard → flash_idle_uniform (fallback, flagged)", a.action === "guard" && (a.spriteSheet || "").includes("flash_idle_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("guard"); await page.keyboard.up(";"); await waitFrames(4);

// hurt
await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(3); a = await p1();
check("hurt → flash_hit_uniform", a.action === "hurt" && (a.spriteSheet || "").includes("flash_hit_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("hurt");
await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/flash_s1_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
