// harness/select_stage4_verify.mjs
// ---------------------------------------------------------------------------
// Stage 4 verification for the character-select redesign.
//   A) UNTOUCHED features still render under the new styling:
//      A1 locked silhouettes + 🔒 glyph + unlock condition   A2 stat/move detail panel
//      A3 scroll behavior (largest universe → scroll to bottom, last row reachable)
//      A4 simultaneous P1(blue)+P2(red)+cursor(accent) — all three distinguishable at once
//   B) FULL-FLOW clip: both players browsing → hovering → locking in (filmstrip).
//   node harness/select_stage4_verify.mjs
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "select_stage4_out");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
async function frames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 10000, polling: 16 }).catch(() => {}); }

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });

// ── A1 locked silhouettes + glyph (Dragon Ball: only Goku unlocked in training) ──
await page.evaluate(() => window.__harness.showCharSelect("dragon_ball", "training"));
await frames(8);
await page.screenshot({ path: path.join(OUT, "A1_locked_silhouettes.png") });

// ── A2 detail panel + A3 scroll: use the LARGEST universe (all sprite chars via "all"-style)  ──
// Pick the biggest available universe from the scrollbar counts.
let biggest = { u: "naruto", n: 0 };
for (const u of ["dragon_ball", "naruto", "jujutsu_kaisen", "hunter_x_hunter", "demon_slayer", "dc", "power_rangers"]) {
  const r = await page.evaluate(uu => window.__harness.showCharSelect(uu, "training"), u);
  await frames(1);
  const b = await page.evaluate(() => window.__harness.activeGridScrollbar());
  if ((b?.count || 0) > biggest.n) biggest = { u, n: b.count };
}
await page.evaluate(uu => window.__harness.showCharSelect(uu, "training"), biggest.u);
await frames(6);
await page.evaluate(() => window.__harness.setCharHover(0));
await frames(6);
await page.screenshot({ path: path.join(OUT, "A2_detail_panel_top.png") });
const barTop = await page.evaluate(() => window.__harness.activeGridScrollbar());
// scroll to the bottom
await page.mouse.move(640, 340);
for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 400); await frames(1); }
await frames(3);
const barBot = await page.evaluate(() => window.__harness.activeGridScrollbar());
const rr = await page.evaluate(() => window.__harness.activeGridRects());
const last = rr[rr.length - 1];
await page.screenshot({ path: path.join(OUT, "A3_scrolled_bottom.png") });
console.log(`A3 scroll — ${biggest.u} (${biggest.n}): hasScroll=${barBot?.hasScroll} maxOffset=${barBot?.maxOffset} lastCardBottom=${Math.round(last.y + last.h)}`);

// ── A4 simultaneous P1 + P2 + cursor (all distinguishable) ──
await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
await frames(4);
await page.evaluate(() => window.__harness.confirmCharPick("p1", 0));   // P1 → card 0 (blue)
await frames(4);
await page.evaluate(() => window.__harness.confirmCharPick("p2", 1));   // P2 → card 1 (red)
await frames(4);
await page.evaluate(() => window.__harness.setCharHover(5));            // cursor hovering a 3rd card (accent)
await frames(8);
await page.screenshot({ path: path.join(OUT, "A4_p1_p2_cursor.png") });   // full frame — both rows visible

// ── B) FULL-FLOW clip: both players browse → hover → lock in ──
await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
await frames(6);
let n = 0;
const CLIP = { x: 0, y: 60, width: 1280, height: 320 };
const grab = async tag => page.screenshot({ path: path.join(OUT, `B_${String(++n).padStart(2, "0")}_${tag}.png`), clip: CLIP });

// P1 browses 0→1→2 then locks card 1 (Sasuke)
for (const i of [0, 1, 2]) { await page.evaluate(x => window.__harness.setCharHover(x), i); await frames(3); await grab(`p1_browse_${i}`); }
await page.evaluate(() => window.__harness.setCharHover(1)); await frames(4);
await page.evaluate(() => window.__harness.confirmCharPick("p1", 1)); await frames(2); await grab("p1_lock_flourish");
await frames(8); await grab("p1_locked");
// P2 browses 3→4→5 then locks card 4 (Minato)
for (const i of [3, 4, 5]) { await page.evaluate(x => window.__harness.setCharHover(x), i); await frames(3); await grab(`p2_browse_${i}`); }
await page.evaluate(() => window.__harness.setCharHover(4)); await frames(4);
await page.evaluate(() => window.__harness.confirmCharPick("p2", 4)); await frames(2); await grab("p2_lock_flourish");
await frames(10); await grab("both_locked");

console.log(errors.length ? `\n❌ ERRORS:\n${errors.join("\n")}` : `\n✅ no page errors — ${n} flow frames`);
console.log("Shots →", OUT);
await browser.close(); server.close(); process.exit(errors.length ? 1 : 0);
