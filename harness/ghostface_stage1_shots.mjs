// harness/ghostface_stage1_shots.mjs — STAGE 1 visual evidence for Ghostface.
// Boots a match as p1=ghostface and captures idle / walk / run / jump / guard / hurt / normals,
// asserting each resolves to a real ghostface_* sheet (no procedural fallback box).
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
async function waitReady() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `ghostface_s1_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=ghostface`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

await page.evaluate(() => window.__harness.start());
await page.evaluate(() => window.__harness.skipToBattle());
await waitFrames(20);

// idle
await waitGrounded();
let a = await p1();
check("P1 is Ghostface", a.key === "ghostface", `key=${a.key}`);
check("renders as sprites (no box)", a.hasSpriteHandler, `hasSprites=${a.hasSpriteHandler}`);
check("idle → ghostface_idle_uniform", (a.spriteSheet || "").includes("ghostface_idle_uniform"), `sheet=${a.spriteSheet}`);
const elabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
check("energy label = Dread", (elabel || "").toLowerCase() === "dread", `label=${elabel}`);
await shot("idle");

// walk
await page.keyboard.down("d"); await waitFrames(8); a = await p1();
check("walk → ghostface_walk_uniform", (a.spriteSheet || "").includes("ghostface_walk_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);

// dash/run
await waitGrounded();
await page.keyboard.press("d"); await waitFrames(1); await page.keyboard.down("d"); await waitFrames(3); a = await p1();
check("dash/run → ghostface_walk_uniform", (a.spriteSheet || "").includes("ghostface_walk_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("run"); await page.keyboard.up("d"); await waitFrames(4);

// jump
await waitGrounded();
await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
await page.waitForFunction(() => window.__harness.p1().vy < -2 || !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(4); a = await p1();
check("jump → ghostface_jump_uniform", (a.spriteSheet || "").includes("ghostface_jump_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("jump");
await waitGrounded();

// guard (hold s)
await page.keyboard.down("s"); await waitFrames(10); a = await p1();
check("guard → ghostface_guard_uniform", a.action === "guard" && (a.spriteSheet || "").includes("ghostface_guard_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("guard"); await page.keyboard.up("s"); await waitFrames(4);

// light (j) — hold across a couple frames so the press registers on a frame edge, sample during the swing
await waitGrounded();
await page.keyboard.down("j"); await waitFrames(2); a = await p1();
check("light → ghostface_slash_uniform", (a.spriteSheet || "").includes("ghostface_slash_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("light"); await page.keyboard.up("j"); await waitFrames(20);

// heavy (k)
await waitReady();
await page.keyboard.down("k"); await waitFrames(3); a = await p1();
check("heavy → ghostface_charge_uniform", (a.spriteSheet || "").includes("ghostface_charge_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("heavy"); await page.keyboard.up("k"); await waitFrames(20);

// up attack (i)
await waitReady();
await page.keyboard.down("i"); await waitFrames(2); a = await p1();
check("up → ghostface_up_uniform", (a.spriteSheet || "").includes("ghostface_up_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("up"); await page.keyboard.up("i"); await waitFrames(20);

// hurt
await page.evaluate(() => window.__harness.hurtP1(20)); await waitFrames(3); a = await p1();
check("hurt → ghostface_hit_uniform", a.action === "hurt" && (a.spriteSheet || "").includes("ghostface_hit_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("hurt");
await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/ghostface_s1_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
