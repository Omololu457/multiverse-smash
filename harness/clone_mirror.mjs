// harness/clone_mirror.mjs — MIRROR CLONES (Reading-B fix): clones now render through the owner's real sprite
// (replaying owner.spriteHandler._lastRender) AND rigidly track the owner, so they're frame-for-frame identical
// in every pose, not just size-matched in idle. Boots the real game as Naruto and proves:
//   1. The mirror render path is ACTIVE (getCloneMirrorRenderCount climbs) — clones use the real frame, not the
//      simplified CLONE_BODY_SETS draw.
//   2. Clones rigidly TRACK the owner: each holds a fixed offset (mirrorDx), so clone.x == owner.x + mirrorDx
//      as the owner moves — they move in lockstep (player-driven, not autonomous).
//   3. As the owner changes pose (idle → walk → attack), the clones follow. Screenshots capture each pose with
//      owner + clones in lockstep. Shots → harness/shots/clone_mirror_*.png
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PAGE_ERRORS = 0; page.on("pageerror", e => { PAGE_ERRORS++; console.log("  ⚠️  pageerror:", e.message); });
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const stateF = () => page.evaluate(() => window.__harness.state());
const metrics = () => page.evaluate(() => window.__harness.cloneRenderMetrics());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function shot(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  const clip = r ? { x: Math.max(0, Math.round(r.x - 320)), y: Math.max(0, Math.round(r.y - r.h * 0.7)), width: 680, height: Math.round(r.h * 2.0) } : undefined;
  if (clip) { if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x; if (clip.y + clip.height > 720) clip.height = 720 - clip.y; }
  await page.screenshot({ path: path.join(OUT, `clone_mirror_${name}.png`), ...(clip ? { clip } : {}) });
}
// each clone tracks the owner iff clone.x - owner.x ≈ its captured mirrorDx
const tracks = m => m.clones.length > 0 && m.clones.every(c => c.mirrorDx != null && Math.abs((c.x - m.owner.x) - c.mirrorDx) <= 2);

await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(40);
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
await page.keyboard.press(","); await waitFrames(6);
await page.keyboard.press(","); await waitFrames(30);

console.log("═══ Mirror clones — Naruto (idle → walk → attack) ═══");

// ── IDLE ──
let m0 = await metrics();
const renders0 = m0.mirrorRenders;
console.log(`  IDLE   owner action=${m0.owner.action} x=${m0.owner.x}  clones=${JSON.stringify(m0.clones.map(c => ({ x: c.x, dx: c.mirrorDx })))}  mirrorRenders=${m0.mirrorRenders}`);
check("mirror render path is ACTIVE (clones replay the owner's real frame)", m0.mirrorRenders > 0);
check("clones captured a fixed offset and track the owner (idle)", tracks(m0), JSON.stringify(m0.clones));
await shot("idle");

// ── WALK ── hold Right so the owner walks; clones must translate in lockstep
await page.keyboard.down("d"); await waitFrames(22);
let mW = await metrics();
console.log(`  WALK   owner action=${mW.owner.action} x=${mW.owner.x}  clones=${JSON.stringify(mW.clones.map(c => ({ x: c.x, dx: c.mirrorDx })))}`);
await shot("walk");
check("owner actually moved (walking)", mW.owner.x > m0.owner.x + 8, `x ${m0.owner.x} → ${mW.owner.x}`);
check("clones MOVED WITH the owner in lockstep (same offset)", tracks(mW), JSON.stringify(mW.clones));
check("owner is in a locomotion pose while walking", ["walk", "run", "dash"].includes(mW.owner.action), `action=${mW.owner.action}`);
await page.keyboard.up("d"); await waitFrames(20);   // let the owner fully settle out of the walk (vx → 0, action → idle)

// ── ATTACK ── owner attacks; clones mirror the attack frame (rendered via the real pipeline). Light is a fast
// jab, so sample the action over the first several frames and grab the shot on an attack frame.
const rBefore = (await metrics()).mirrorRenders;
await page.keyboard.down("j");   // hold the light input so it registers, and sample while the jab plays
let attackAction = null, mA = null;
for (let i = 0; i < 10; i++) {
  await waitFrames(1);
  mA = await metrics();
  const a = mA.owner.action;
  if (a && !["idle", "walk", "run", "dash"].includes(a)) { attackAction = a; await shot("attack"); break; }
}
await page.keyboard.up("j");
mA = mA || await metrics();
console.log(`  ATTACK owner action=${attackAction || mA.owner.action}  mirrorRenders=${mA.mirrorRenders}`);
if (!attackAction) await shot("attack");
check("owner entered an attack pose (mirrored by the clones)", !!attackAction, `action=${attackAction || mA.owner.action}`);
check("mirror kept rendering through the attack (clones show the same frame)", mA.mirrorRenders > rBefore);
check("clones still tracking during the attack", tracks(mA), JSON.stringify(mA.clones));

check("no JS page errors across the run", PAGE_ERRORS === 0);

console.log(`\n${FAIL === 0 && PAGE_ERRORS === 0 ? "✅" : "❌"}  clone_mirror: ${PASS} passed, ${FAIL} failed — shots → harness/shots/clone_mirror_*.png`);
await browser.close(); server.close();
process.exit(FAIL === 0 && PAGE_ERRORS === 0 ? 0 : 1);
