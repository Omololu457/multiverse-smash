// harness/ghostface_swap_ab_shots.mjs — visual evidence for Gaps A+B: capture (1) the morph poof at the
// instant of swap-in, (2) the companion mid-swap wearing its _crew affiliation skin, and (3) Ghostface
// reverted in his killer identity. One shot set per identity to eyeball the crew tint on the borrowed body.
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
const MOTION = { s: ["s", "d"], a: ["s", "a"], d: ["s", "a", "d"], w: ["s", "d", "a"] };

async function resetToGhostface(skin) {
  await page.evaluate(() => window.__harness.expireGfSwap());
  await waitFrames(4);
  await page.evaluate(s => { window.__harness.setSkin("p1", s); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); }, skin);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.key === "ghostface" && p.grounded && !p.attacking; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 70); await waitFrames(8);
}

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

const SETS = [["ghostfaceBilly", "s", "sasuke"], ["ghostfaceRoman", "d", "gojo"], ["ghostfaceJill", "w", "vegeta"], ["ghostfaceAmber", "s", "shinobu"]];
for (const [skin, key, want] of SETS) {
  await resetToGhostface(skin);
  // fire the combo, grab the poof frame right as the swap lands
  for (const k of MOTION[key]) { await page.keyboard.down(k); await waitFrames(1); await page.keyboard.up(k); await waitFrames(1); }
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");
  await waitFrames(2);
  await page.screenshot({ path: path.join(OUT, `gf_swapAB_${skin}_poof.png`) });   // morph poof at swap-in
  await waitFrames(24);
  await page.screenshot({ path: path.join(OUT, `gf_swapAB_${skin}_${want}_crew.png`) });   // companion in crew skin
  console.log(`  📸 ${skin} → ${want} (poof + crew skin)`);
}

console.log("shots written to harness/shots/gf_swapAB_*");
await browser.close(); server.close();
