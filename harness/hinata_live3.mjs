// harness/hinata_live3.mjs — REAL-INPUT live verification for Hinata PHASE 3 (Juuhou Soshiken ult + skins).
// Proves: the ultimate fires via real `u`, plays the hhJuuhou cast, deals the project ult-band damage +
// drains the foe's chakra (Gentle Fist); and each recolor skin (Lavender/Slate/Azure) boots + renders.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".heic":"image/heic" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
const shot = n => page.screenshot({ path: path.join(OUT, `hinata3_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => { const f = window.__harness.p1() || {}; return { key: f.key, energy: Math.round(f.energy ?? -1), cast: f._spriteCastMove || f.currentMove || null, skin: f.skinId || null, sheet: (f.spriteSheet || f._lastSpriteSheet || null) }; });
const p2 = () => page.evaluate(() => { const f = window.__harness.p2() || {}; return { energy: Math.round(f.energy ?? -1), health: Math.round(f.health ?? -1) }; });
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };

await page.goto(`${base}/index.html?harness=1&p1=hinata&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); window.__harness.resetFighterInput?.("p1"); });
await waitFrames(4);
ok((await p1()).key === "hinata", "p1 is hinata");

// ── ULTIMATE — Juuhou Soshiken (guaranteed; opponent HP must drop ~198 + chakra drained) ──
await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.healP2?.(); });
await waitFrames(2);
const ub = await p1(); const hb = await p2();
await page.keyboard.down("u"); await waitFrames(16); await shot("01_juuhou_cast"); const midU = await p1(); await page.keyboard.up("u");
await waitFrames(70);   // let the guaranteed lion-fist beats land
const ua = await p1(); const ha = await p2();
console.log(`juuhou: p1 energy ${ub.energy}→${ua.energy} · p2 hp ${hb.health}→${ha.health} (Δ${ha.health - hb.health}) · p2 chakra ${hb.energy}→${ha.energy} (Δ${ha.energy - hb.energy}) · cast=${midU.cast}`);
ok(ua.energy < ub.energy, `Juuhou spent meter (Δ${ua.energy - ub.energy})`);
// _spriteCastMove isn't in the p1() snapshot whitelist — prove the cast via the rendered SHEET instead.
ok(/hinata_juuhou/.test(midU.sheet || ""), `plays the hhJuuhou cast sheet (got ${midU.sheet})`);
ok(ha.health < hb.health - 120, `Juuhou dealt big damage (${hb.health}→${ha.health})`);
ok(ha.energy < hb.energy, `Juuhou sealed the foe's chakra (${hb.energy}→${ha.energy})`);
await shot("02_after_ult");

// ── SKINS — each recolor boots + renders its __tag sheet ──
for (const [tag, id] of [["lavender", "lavender"], ["slate", "slate"], ["azure", "azure"]]) {
  const r = await page.evaluate(s => window.__harness.bootSkin?.(s, "default"), id);
  await waitFrames(6); await shot(`03_skin_${tag}`);
  const s = await p1();
  console.log(`skin ${tag}: skinId=${s.skin} sheet=${s.sheet}`);
  ok(s.skin === id && /__(purple|gray|blue)\.png/.test(s.sheet || ""), `${tag} skin renders its recolor sheet (${s.sheet})`);
}

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/hinata3_*.png`);
process.exit(FAILS ? 1 : 0);
