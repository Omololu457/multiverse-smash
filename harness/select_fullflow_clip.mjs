// harness/select_fullflow_clip.mjs
// ---------------------------------------------------------------------------
// Stage 4 deliverable (clean re-capture): a full select flow — both players BROWSING,
// HOVERING, and LOCKING IN — driven over ACTUALLY-UNLOCKED cards (robust to roster-order
// drift). Filmstrip of the whole flow, not isolated single-card shots.
//   node harness/select_fullflow_clip.mjs
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "select_fullflow_out");
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

// Find a universe with the most UNLOCKED cards so the flow lands on real, pickable fighters.
let best = { u: "naruto", unlocked: [] };
for (const u of ["dragon_ball", "naruto", "jujutsu_kaisen", "hunter_x_hunter", "demon_slayer", "dc", "power_rangers", "bleach"]) {
  await page.evaluate(uu => window.__harness.showCharSelect(uu, "training"), u);
  await frames(1);
  const un = await page.evaluate(() => window.__harness.selectUnlockedIndices());
  if ((un?.length || 0) > best.unlocked.length) best = { u, unlocked: un };
}
const U = best.unlocked;
console.log(`Full-flow on "${best.u}" — unlocked card indices: [${U.join(", ")}]`);
await page.evaluate(uu => window.__harness.showCharSelect(uu, "training"), best.u);
await frames(6);

let n = 0;
const CLIP = { x: 0, y: 60, width: 1280, height: 340 };
const grab = async tag => page.screenshot({ path: path.join(OUT, `flow_${String(++n).padStart(2, "0")}_${tag}.png`), clip: CLIP });

// Pick two distinct unlocked cards for P1 and P2, plus a couple to browse across.
const p1Card = U[0];
const p2Card = U[Math.min(1, U.length - 1)] !== p1Card ? U[Math.min(1, U.length - 1)] : U[U.length - 1];
const browseP1 = U.slice(0, Math.min(3, U.length));
const browseP2 = U.slice(0).reverse().slice(0, Math.min(3, U.length));

// ── P1: browse → hover → lock ──
for (const i of browseP1) { await page.evaluate(x => window.__harness.setCharHover(x), i); await frames(3); await grab(`p1_browse${i}`); }
await page.evaluate(x => window.__harness.setCharHover(x), p1Card); await frames(4);
await page.evaluate(x => window.__harness.confirmCharPick("p1", x), p1Card); await frames(2); await grab("p1_lock_flourish");
await frames(8); await grab("p1_locked");

// ── P2: browse → hover → lock (P1's pick stays visible/distinguishable throughout) ──
for (const i of browseP2) { await page.evaluate(x => window.__harness.setCharHover(x), i); await frames(3); await grab(`p2_browse${i}`); }
await page.evaluate(x => window.__harness.setCharHover(x), p2Card); await frames(4);
await page.evaluate(x => window.__harness.confirmCharPick("p2", x), p2Card); await frames(2); await grab("p2_lock_flourish");
await frames(10); await grab("both_locked");

const finalState = await page.evaluate(() => window.__harness.state());
console.log(errors.length ? `\n❌ ERRORS:\n${errors.join("\n")}` : `\n✅ no page errors — ${n} flow frames (P1=card${p1Card}, P2=card${p2Card})`);
console.log("Shots →", OUT);
await browser.close(); server.close(); process.exit(errors.length ? 1 : 0);
