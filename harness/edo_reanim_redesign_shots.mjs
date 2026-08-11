// harness/edo_reanim_redesign_shots.mjs — evidence for the shipped Edo Tensei "undead" reanimation look.
// For each vessel: summon via Edo Tensei and assert it renders its BASE art (no pre-baked __reanim sheet) —
// the reanimated-corpse read is produced LIVE by EDO_REANIM_TINT (sickly pale green-gray ctx.filter, sprite.js)
// + drawEdoReanimOverlay (decay mottling + pronounced stitched seams, game.js), both gated on _edoActive.
// Output: harness/shots/edo_reanim_<vessel>.png (full) + _zoom.png (tight crop of the reanimated vessel).
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

const VESSELS = process.argv.slice(2).length ? process.argv.slice(2) : ["sasuke", "itachi", "minato"];
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

async function readyTobirama(vessel) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.setP1Energy?.(200); window.__harness.resetUlt?.(); window.__harness.healP1?.(); });
  await page.evaluate(v => window.__harness.edoBackup.setBackup(v), vessel);
  await waitFrames(2);
}
async function activate() {
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(3);
  await page.evaluate(() => { window.__harness.edoBackup.skipCine(); window.__harness.resetFighterInput?.("p1"); });
  await waitFrames(2); return p1();
}
async function revert() {
  await page.evaluate(() => { window.__harness.edoBackup?.revert?.(); window.__harness.healP1?.(); });
  await waitGrounded(); await waitFrames(4);
}
// Screen-space bbox of the summoned vessel (from _lastDraw* world coords through the live camera), padded.
async function vesselClip() {
  const b = await page.evaluate(() => {
    const p = window.__harness.p1();
    const cam = (typeof camera !== "undefined") ? camera : null;
    const cv = document.querySelector("canvas");
    if (!cam || p._lastDrawX == null) return null;
    const s = (wx, wy) => ({ x: (wx - cam.x) * cam.zoom + cv.width / 2, y: (wy - cam.y) * cam.zoom + cv.height / 2 });
    const tl = s(p._lastDrawX, p._lastDrawY);
    return { x: tl.x, y: tl.y, w: p._lastDrawW * cam.zoom, h: p._lastDrawH * cam.zoom };
  });
  const pad = 70;
  if (!b) return { x: 380, y: 320, width: 340, height: 280 };
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  return { x, y, width: Math.min(1280 - x, b.w + pad * 2), height: Math.min(720 - y, b.h + pad * 2) };
}
async function poseForShot() {
  await page.evaluate(() => { window.__harness.setP1Pos?.(560, null); window.__harness.setP2X?.(820); window.__harness.resetFighterInput?.("p1"); window.__harness.setP1Energy?.(190); });
  await waitGrounded(); await waitFrames(10);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  for (const vessel of VESSELS) {
    console.log(`\n── ${vessel} ──`);
    await revert();
    await readyTobirama(vessel);
    const s = await activate();
    if (!s.edoActive || s.edoVessel !== vessel) {
      check(`${vessel}: summons (skipped — not a valid vessel?)`, false, `edoActive=${s.edoActive} vessel=${s.edoVessel}`);
      await revert();
      continue;
    }
    await poseForShot();
    const clip = await vesselClip();
    await page.screenshot({ path: path.join(OUT, `edo_reanim_${vessel}.png`) });
    await page.screenshot({ path: path.join(OUT, `edo_reanim_${vessel}_zoom.png`), clip });
    check(`${vessel}: reanimated look renders BASE art (live tint, no __reanim sheet)`, s.edoActive && !(s.spriteSheet || "").includes("reanim"), `sheet=${s.spriteSheet}`);
    await revert();
  }

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Edo reanimation look: ${PASS} passed, ${FAIL} failed`);
  console.log(`   shots → harness/shots/edo_reanim_*.png / _zoom.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
