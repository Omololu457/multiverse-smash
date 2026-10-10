// harness/kakashi_anbu_skins_live.mjs — verify the Kakashi (ANBU) recolor SKINS render: each swaps the body
// sheets to its __tag variant, and the Alien X skin shows the void-black body + runtime red SHARINGAN TOMOE.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PERR = 0; page.on("pageerror", e => { console.log("  PAGEERROR:", e.message); PERR++; });
const shot = n => page.screenshot({ path: path.join(OUT, `kanbuSkin_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
const p1sheet = () => page.evaluate(() => (window.__harness.p1() || {}).spriteSheet || null);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };
async function boot(url) { await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 }); }
async function toBattle() { await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.()); await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); await waitFrames(4); }
const setSkin = (side, id) => page.evaluate(([s, i]) => window.__harness.setSkin(s, i), [side, id]);

await boot(`${base}/index.html?harness=1&p1=kakashi_anbu&p2=naruto`);
await toBattle();

// ── each recolor skin swaps the body sheet to its __tag variant ──
for (const [id, tag] of [["kanbuBen10","ben10"],["kanbuAlbedo","albedo"],["kanbuAlienX","alienx"],["kanbuBloom","bloom"],["kanbuHokage","hokage"]]) {
  await setSkin("p1", id); await waitFrames(6);
  const sheet = await p1sheet();
  ok(new RegExp(`__${tag}\\.png$`).test(sheet || ""), `skin ${id} → body sheet ${sheet}`);
  await shot(tag);
}

// ── Alien X: skinId ends "AlienX" (gates both the starfield + the tomoe field) ──
await setSkin("p1", "kanbuAlienX"); await waitFrames(8);
const alienId = await page.evaluate(() => window.__harness.p1().skinId);
ok(/AlienX$/.test(alienId || ""), `Alien X skinId ends "AlienX" → tomoe field gates (${alienId})`);
await shot("alienx_tomoe");

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s), ${PERR} page error(s). shots in harness/shots/kanbuSkin_*.png`);
process.exit(FAILS || PERR ? 1 : 0);
