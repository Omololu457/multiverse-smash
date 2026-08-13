// harness/minato_clone_anim.test.mjs — verifies the ANIMATION-SWAP fix:
//   • the summon hand-sign (minatoCloneCast / shadow_clone_justu art) plays on MINATO (the caster),
//   • the spawned CLONE stands in its OWN idle body (minato_idle), NOT the summon gesture.
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
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const stateF = () => page.evaluate(() => window.__harness.state());
const cloneCount = () => page.evaluate(() => window.__harness.p1CloneCount());
const p1render = () => page.evaluate(() => window.__harness.renderInfo("p1"));
const clones = () => page.evaluate(() => window.__harness.summons().filter(s => s.id === "shadowClone"));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function shot(name) {
  const r = await page.evaluate(() => window.__harness.screenRect?.("p1")).catch(() => null);
  const clip = r ? { x: Math.max(0, Math.round(r.x - 240)), y: Math.max(0, Math.round(r.y - r.h)), width: 560, height: Math.round(r.h * 2 + 40) } : undefined;
  if (clip) { if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x; if (clip.y + clip.height > 720) clip.height = 720 - clip.y; }
  await page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) });
}

await page.goto(`${base}/index.html?harness=1&p1=minato`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(30);
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.dispelP1Clones?.(); });
await waitFrames(5);

console.log("── Shadow Clone spawn: caster gesture vs clone idle ──");
check("start 0 clones", (await cloneCount()) === 0, `count=${await cloneCount()}`);

// Spawn a clone with the STANDARDIZED "," key (was D→F; the minatoCloneCast gesture moved into
// summons.summonShadowClone so it still plays on the "," spawn).
await page.keyboard.press(",");
// Sample Minato's rendered pose DURING the cast window (a few frames in, gesture still playing).
await waitFrames(4);
const casterMid = await p1render();
check("CASTER (Minato) plays the summon gesture (minatoCloneCast)", String(casterMid?.action || "").toLowerCase() === "minatoclonecast", `action=${casterMid?.action}`);
check("caster gesture renders a real cell (not the 128² fallback box)", (casterMid?.dstH || 0) > 0 && (casterMid?.dstH || 0) < 128 * 1.6, `dstH=${casterMid?.dstH}`);
await shot("clone_anim_caster_gesture.png");

// Wait for the clone to reveal (poof frames) and confirm its BODY sheet.
await page.waitForFunction(() => window.__harness.p1CloneCount() >= 1, null, { timeout: 4000, polling: 32 }).catch(() => {});
await waitFrames(40);
const cl = await clones();
check("a clone exists", cl.length >= 1, `count=${cl.length}`);
check("CLONE body = Minato IDLE (standing), NOT the summon gesture", (cl[0]?.sheet || "").includes("minato_idle") && !(cl[0]?.sheet || "").includes("shadow_clone_justu"), `sheet=${cl[0]?.sheet}`);

// By now Minato's cast window has elapsed → he's back to idle (gesture is brief, not stuck).
const casterAfter = await p1render();
check("caster gesture is BRIEF (Minato returns to idle after ~16f)", String(casterAfter?.action || "").toLowerCase() !== "minatoclonecast", `action=${casterAfter?.action}`);
await shot("clone_anim_clone_standing.png");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots: clone_anim_caster_gesture.png, clone_anim_clone_standing.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
