// harness/clone_skin_and_static.mjs — BUG-FIX verification (two confirmed bugs from a screenshot):
//   BUG 1 — clones rendered the BASE skin, not the owner's active skin. A clone must be visually identical to
//           the real body (the swap / identity-concealment mechanic depends on it).
//   BUG 2 — clones acted AUTONOMOUSLY (advanced + lunge-struck on their own timers) while the player was
//           neutral, making them obviously distinguishable from the real body.
// Boots the real game as HASHIRAMA with the "Forest Sovereign" recolor skin and proves:
//   1. Each spawned clone's RESOLVED render sheet is the SKIN variant (…__forestsovereign.png), i.e. it
//      inherits the owner's active skin — NOT the base green sheet.
//   2. With NO player input, the clones HOLD position (do not advance/attack on their own) → static decoy.
//   3. No JS page errors. Screenshot → harness/shots/clone_skin_static_*.png (visual: owner + clones matching).
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
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  const clip = r ? { x: Math.max(0, Math.round(r.x - 260)), y: Math.max(0, Math.round(r.y - r.h * 0.6)), width: 620, height: Math.round(r.h * 1.8) } : undefined;
  if (clip) { if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x; if (clip.y + clip.height > 720) clip.height = 720 - clip.y; }
  await page.screenshot({ path: path.join(OUT, `clone_skin_static_${name}.png`), ...(clip ? { clip } : {}) });
}

await page.goto(`${base}/index.html?harness=1&p1=hashirama`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await waitFrames(30);

console.log("═══ Bug-fix verification: Hashirama + Forest Sovereign skin ═══");

// Apply the recolor skin to p1, then spawn clones.
const applied = await page.evaluate(() => window.__harness.setSkin?.("p1", "hashiramaForestSovereign"));
check("Forest Sovereign skin applied to the owner", applied === "hashiramaForestSovereign", `skinId=${applied}`);
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
await page.keyboard.press(","); await waitFrames(6);
await page.keyboard.press(","); await waitFrames(6);
await waitFrames(30);   // clones materialize (idle) + the skin-variant sheet decodes

// ── BUG 1: clones inherit the owner's skin ──
const rs = await page.evaluate(() => window.__harness.cloneRenderSheets());
console.log(`  owner skin=${rs.ownerSkin}  ownerSkinAnimIdle=${rs.ownerSkinAnimIdle}`);
console.log(`  clone render sheets: ${JSON.stringify(rs.clones)}`);
check("clones exist", rs.clones.length >= 1, `count=${rs.clones.length}`);
check("EVERY clone renders the owner's SKIN variant (…__forestsovereign.png), not the base sheet",
      rs.clones.length >= 1 && rs.clones.every(sh => /__forestsovereign\.png$/i.test(String(sh))), JSON.stringify(rs.clones));
check("clone sheet is NOT the plain base sheet (bug would show hashirama_idle_uniform.png)",
      rs.clones.every(sh => !/hashirama_idle_uniform\.png$/i.test(String(sh))));
await crop("skin_match");

// ── BUG 2: clones are STATIC with no player input ──
const before = (await page.evaluate(() => window.__harness.cloneSpots())).map(c => c.x);
await waitFrames(60);   // 1 full second, ZERO input
const after = (await page.evaluate(() => window.__harness.cloneSpots())).map(c => c.x);
const maxDrift = Math.max(0, ...before.map((x, i) => Math.abs((after[i] ?? x) - x)));
check("clones HOLD position with no player input (no autonomous movement)", maxDrift <= 4, `max drift=${maxDrift}px  before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
// none of the clones are mid-attack while the owner is neutral
const states = (await page.evaluate(() => window.__harness.cloneSpots())).map(c => c.state);
check("no clone is in a non-idle (active) state while the owner is neutral", states.every(st => st === "idle"), JSON.stringify(states));
await crop("static");

check("no JS page errors across the run", PAGE_ERRORS === 0);

console.log(`\n${FAIL === 0 && PAGE_ERRORS === 0 ? "✅" : "❌"}  clone_skin_and_static: ${PASS} passed, ${FAIL} failed — shots → harness/shots/clone_skin_static_*.png`);
await browser.close(); server.close();
process.exit(FAIL === 0 && PAGE_ERRORS === 0 ? 0 : 1);
