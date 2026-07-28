// harness/omniman_stage1_shots.mjs — STAGE 1 visual evidence for Omni-Man.
// Boots a match as p1=omniman and captures idle / run / jump / fall / guard / hurt / intro,
// asserting each resolves to the intended omni_man_* sheet (guard is a flagged idle fallback).
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
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `omniman_s1_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=omniman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

await page.evaluate(() => window.__harness.boot());
await waitFrames(3);

// ── IDLE ── (boot skips the intro, so gameplay is live; intro is forced LAST below)
await waitGrounded(); await waitFrames(6);
let a = await p1();
check("P1 is Omni-Man", a.key === "omniman", `key=${a.key}`);
check("renders as sprites (not box)", a.hasSpriteHandler === true, "");
check("idle → omni_man_idle", (a.spriteSheet || "").includes("omni_man_idle"), `sheet=${a.spriteSheet}`);
await shot("idle");

// ── GROUND MOVE (hold toward opponent) — Omni-Man has NO walk cycle; he glides in his idle-FLOAT
//    pose (Fix #3, replaced the old run_uniform lunge). walk/run/dash all resolve to the idle sheet. ──
await page.keyboard.down("d"); await waitFrames(16); a = await p1();
check("ground-move → idle-float (no walk cycle)", (a.spriteSheet || "").includes("omni_man_idle") && (a.action === "walk" || a.action === "run"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("run"); await page.keyboard.up("d"); await waitFrames(4);

// ── JUMP ──
await waitGrounded();
await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w");
await page.waitForFunction(() => window.__harness.p1().vy < -2 || !window.__harness.p1().grounded, null, { timeout: 4000, polling: 16 }).catch(() => {});
await waitFrames(3); a = await p1();
check("jump → omni_man_jump_uniform", (a.spriteSheet || "").includes("omni_man_jump_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("jump");
// ── FALL (descending portion of the arc) ──
await page.waitForFunction(() => window.__harness.p1().vy > 1, null, { timeout: 4000, polling: 16 }).catch(() => {});
a = await p1();
check("fall → omni_man_jump_uniform (apex frame)", (a.spriteSheet || "").includes("omni_man_jump_uniform"), `action=${a.action} vy=${a.vy?.toFixed?.(1)}`);
await shot("fall");
await waitGrounded();

// ── GUARD (hold down = block) — flagged idle fallback (no guard art) ──
await waitGrounded(); await waitFrames(4);
await page.keyboard.down("s"); await waitFrames(16); a = await p1();
// No guard strip → _resolveAction returns the literal "idle" pose while isBlocking stays true
// (Flash precedent). So prove the GUARD STATE is active and it renders the idle fallback sheet.
check("guard → blocking active, idle fallback (flagged: no guard art)", a.isBlocking === true && (a.spriteSheet || "").includes("omni_man_idle"), `isBlocking=${a.isBlocking} action=${a.action} sheet=${a.spriteSheet}`);
await shot("guard"); await page.keyboard.up("s"); await waitFrames(4);

// ── HURT ──
await page.evaluate(() => window.__harness.hurtP1(24)); await waitFrames(3); a = await p1();
check("hurt → omni_man_hit_uniform", a.action === "hurt" && (a.spriteSheet || "").includes("omni_man_hit_uniform"), `action=${a.action} sheet=${a.spriteSheet}`);
await shot("hurt");
await page.evaluate(() => window.__harness.healP1?.()); await waitFrames(4);

// ── INTRO (forced last — it latches _introPlaying, so it must not precede gameplay captures) ──
await waitGrounded();
await page.evaluate(() => window.__harness.forceIntro("intro"));
await waitFrames(4); a = await p1();
check("intro → omni_man_intro_uniform", (a.spriteSheet || "").includes("omni_man_intro_uniform"), `variant=${a.introVariant} sheet=${a.spriteSheet}`);
await shot("intro");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/omniman_s1_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
