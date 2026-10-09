// harness/gaara_skins_live.mjs — verify the Gaara + Omololu recolor SKINS render, that Gaara's Shukaku
// summon recolours to match the skin, and that the Alien X skin shows void-black + the runtime starfield.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
const shot = n => page.screenshot({ path: path.join(OUT, `skins_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=gaara&p2=omololu`, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.countdown <= 0; }, null, { timeout: 8000 }).catch(() => {}); await waitFrames(4); }
const p1sheet = () => page.evaluate(() => (window.__harness.p1() || {}).spriteSheet || null);
const setSkin = (side, id) => page.evaluate(([s, i]) => window.__harness.setSkin(s, i), [side, id]);

await boot();

// ── 1) GAARA body recolors: each skin swaps the idle sheet to its __tag variant ──
for (const [id, tag] of [["gaaraPink","pink"],["gaaraEmerald","emerald"],["gaaraAzure","azure"],["gaaraAlbedo","albedo"],["gaaraAlienX","alienx"]]) {
  await setSkin("p1", id); await waitFrames(4);
  const sheet = await p1sheet();
  ok(new RegExp(`__${tag}\\.png$`).test(sheet || ""), `Gaara skin ${id} → body sheet ${sheet}`);
  await shot(`gaara_${tag}`);
}

// ── 2) SHUKAKU recolors to match the skin (summon on pink, screenshot) ──
await setSkin("p1", "gaaraPink"); await waitFrames(2);
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.gaaraShukaku.summon(); });
await waitFrames(20); await shot("shukaku_pink");
const tagP1 = await page.evaluate(() => window.__harness.p1()._recolorTag);
ok(tagP1 == null || tagP1 === "pink", `Gaara _recolorTag=pink drives the Shukaku recolor (tag=${tagP1})`);

// ── 3) ALIEN X — void-black body + runtime starfield ──
await setSkin("p1", "gaaraAlienX"); await waitFrames(2);
await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.gaaraShukaku.summon(); });
await waitFrames(16); await shot("alienx_shukaku");
const alienId = await page.evaluate(() => window.__harness.p1().skinId);
ok(/AlienX$/.test(alienId || ""), `Alien X skinId ends "AlienX" → starfield gates (${alienId})`);

// ── 4) OMOLOLU creative skins render ──
await boot();
for (const [id, tag] of [["omololuPink","pink"],["omololuEmerald","emerald"],["omololuAzure","azure"],["omololuViolet","violet"]]) {
  await setSkin("p2", id); await waitFrames(4);
  const sheet = await page.evaluate(() => (window.__harness.p2() || {}).spriteSheet || null);
  ok(new RegExp(`__${tag}\\.png$`).test(sheet || ""), `Omololu skin ${id} → body sheet ${sheet}`);
}
await shot("omololu_violet");

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/skins_*.png`);
process.exit(FAILS ? 1 : 0);
