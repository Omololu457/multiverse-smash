// harness/playlist_panel_scroll.test.mjs — the Settings "NOW PLAYING" reorder panel must be SCROLLABLE
// so that after building & saving a large custom playlist you can review EVERY picked song, not just the
// first PLAYLIST_MAX_ROWS (=7). This is the fix for "I can't see all of the songs I picked after Save".
// Proves: a >7-track custom playlist windows the panel to ≤7 rows; scroll walks the true indices from
// 0 to the last song; max-scroll is length-7; saving resets the panel to the top.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const arrEq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.library && !!window.__harness.music, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await boot();

  console.log("\n── build & save a LARGE custom playlist (whole library) ──");
  await P(() => window.__harness.showSettings());
  await P(() => window.__harness.library.open());
  const total = await P(() => window.__harness.library.size());
  // Select EVERY song in the library by scanning the (windowed) builder viewport top-to-bottom and
  // toggling each file exactly once — then save so the menu playlist becomes the full custom list.
  await P(() => {
    // Walk the whole library via the builder viewport scroll and toggle each file exactly once.
    const seen = new Set();
    window.__harness.library.scrollBy(-999999);
    let guard = 0;
    while (guard++ < 400) {
      const r = window.__harness.library.scrollBy(0);
      for (const f of r.rows) { if (!seen.has(f)) { seen.add(f); window.__harness.library.toggle(f); } }
      const before = r.scroll;
      const after = window.__harness.library.scrollBy(120).scroll;   // < the ~238px (7×34) window so consecutive reads OVERLAP → no row skipped at any library size
      if (after === before) break;
    }
  });
  const picked = await P(() => window.__harness.library.selCount());
  check("selected the full library", picked === total, `picked=${picked} of ${total}`);

  const saved = await P(() => window.__harness.library.save());
  check("save returns to Settings", saved.state === "settings", `state=${saved.state}`);
  const order = await P(() => window.__harness.menuAudio().order);
  check("menu playlist now holds all picked songs", order.length === total, `order=${order.length}`);

  console.log("\n── the reorder panel is windowed but FULLY scrollable ──");
  const MAX_ROWS = 7;
  check("panel starts at the top after save", await P(() => window.__harness.music.panelScroll()) === 0, "");
  const vis0 = await P(() => window.__harness.music.panelVisibleIndices());
  check("panel shows ≤7 rows at once", vis0.length === MAX_ROWS, `rows=${vis0.length}`);
  check("first slice is indices 0..6", arrEq(vis0, [0, 1, 2, 3, 4, 5, 6]), vis0.join(","));

  const maxScroll = await P(() => window.__harness.music.panelMaxScroll());
  check("max scroll = length - 7", maxScroll === order.length - MAX_ROWS, `max=${maxScroll} len=${order.length}`);

  // Scroll one row down: the window advances by exactly one true index.
  const vis1 = await P(() => { window.__harness.music.panelScrollBy(1); return window.__harness.music.panelVisibleIndices(); });
  check("scroll +1 advances the window by one song", arrEq(vis1, [1, 2, 3, 4, 5, 6, 7]), vis1.join(","));

  // Scroll to the very bottom: the LAST song must be visible (the whole point of the fix).
  const visEnd = await P(() => { window.__harness.music.panelScrollBy(999); return window.__harness.music.panelVisibleIndices(); });
  check("scroll clamps at max (can't overscroll)", await P(() => window.__harness.music.panelScroll()) === maxScroll, "");
  check("the LAST picked song is reachable", visEnd[visEnd.length - 1] === order.length - 1, `lastVisible=${visEnd[visEnd.length - 1]} lastIdx=${order.length - 1}`);

  // Scroll back above the top clamps to 0.
  const visTop = await P(() => { window.__harness.music.panelScrollBy(-999); return window.__harness.music.panelVisibleIndices(); });
  check("scroll clamps at top", await P(() => window.__harness.music.panelScroll()) === 0 && visTop[0] === 0, visTop.join(","));

  console.log("\n── switching source resets the panel to the top ──");
  await P(() => window.__harness.music.panelScrollTo(5));
  await P(() => window.__harness.library.setSource("default"));
  check("source change snaps panel to top", await P(() => window.__harness.music.panelScroll()) === 0, "");

  check("no JS errors", jsErrors.length === 0, jsErrors.join(" | "));
} catch (e) {
  check("test crashed", false, String(e));
} finally {
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
