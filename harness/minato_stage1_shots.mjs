// harness/minato_stage1_shots.mjs — STAGE 1 visual evidence for Minato Namikaze.
// Boots a match as p1=minato and captures idle / run / dash / jump / guard /
// hurt / knockdown / intro frames, asserting each resolves to a real
// minato_*_uniform sheet (no 128² fallback box). Mirrors tobirama_stage1_shots.mjs.
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
async function shot(name) {
  await page.screenshot({ path: path.join(OUT, `minato_s1_${name}.png`) });
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (r) {
    const padX = 60, padTop = r.h * 1.1, padBot = 30;
    const clip = {
      x: Math.max(0, Math.round(r.x - padX)),
      y: Math.max(0, Math.round(r.y - padTop)),
      width: Math.min(1280, Math.round(r.w + padX * 2)),
      height: Math.min(720, Math.round(r.h + padTop + padBot))
    };
    if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
    if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
    await page.screenshot({ path: path.join(OUT, `minato_s1_${name}_crop.png`), clip });
  }
}
const has = (a, s) => (a.spriteSheet || "").includes(s);

await page.goto(`${base}/index.html?harness=1&p1=minato`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(20);

// idle
await waitGrounded();
let a = await p1();
check("P1 is Minato", a.key === "minato", `key=${a.key}`);
check("renders as sprites (not box)", a.hasSpriteHandler, "");
check("idle → minato_idle_uniform", has(a, "minato_idle_uniform"), `sheet=${a.spriteSheet}`);
await shot("idle");

// run — any horizontal move plays the run cycle (walk maps to the same sheet).
await page.keyboard.down("d"); await waitFrames(20); a = await p1();
check("run → minato_run_uniform", (a.action === "run" || a.action === "walk") && has(a, "minato_run_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("run"); await page.keyboard.up("d"); await waitFrames(6);

// dash (Flying-Raijin flash blink) — double-tap TOWARD the opponent = teleport dash.
await waitGrounded();
// Explicit down/up per tap (with held frames) so the frame-polled input buffer catches BOTH taps
// within the double-tap window — a bare press() can go down+up between polls and be missed.
await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.up("d"); await waitFrames(2);
await page.keyboard.down("d");
await page.waitForFunction(() => window.__harness.p1().action === "dash", null, { timeout: 3000, polling: 8 }).catch(() => {});
a = await p1();
check("dash blink → minato_dash_uniform", a.action === "dash" && has(a, "minato_dash_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("dash"); await page.keyboard.up("d"); await waitFrames(8);

// jump
await waitGrounded();
await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
await page.waitForFunction(() => window.__harness.p1().vy < -2 || !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(4); a = await p1();
check("jump → minato_jump_uniform", has(a, "minato_jump_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("jump");
await waitGrounded();

// guard (hold down = block)
await page.keyboard.down("s"); await waitFrames(14); a = await p1();
check("guard → minato_block_uniform", a.action === "guard" && has(a, "minato_block_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("guard"); await page.keyboard.up("s"); await waitFrames(4);

// hurt
await page.evaluate(() => window.__harness.hurtP1(24)); await waitFrames(3); a = await p1();
check("hurt → minato_hit_uniform", a.action === "hurt" && has(a, "minato_hit_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("hurt");
await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

// knockdown (the hit strip resolves to the full sequence) — force it directly.
await page.evaluate(() => { window.__harness.knockdownP1?.(); }); await waitFrames(4); a = await p1();
check("knockdown → minato_hit_uniform", (a.action === "knockdown" || a.action === "hurt") && has(a, "minato_hit_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("knockdown");
await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

// intro (idle doubles as intro)
await page.evaluate(() => window.__harness.forceIntro("intro")); await waitFrames(6); a = await p1();
check("intro → minato_idle_uniform", has(a, "minato_idle_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("intro");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/minato_s1_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
