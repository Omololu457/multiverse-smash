// harness/portrait_fit_shots.mjs — visual evidence for the portrait aspect-ratio fix.
// Captures the SKIN-SELECT grid (the screen that was stretching portraits) and the
// CHARACTER-SELECT roster (already cover-fit) for 3 chars with genuinely different
// native portrait aspect ratios:
//   hisoka  81x171  (0.47, very tall)   superman 44x50 (0.88)   beerus 720x720 (1.00 square)
// Run twice: `node harness/portrait_fit_shots.mjs before` then `... after`.
// Output → harness/shots/portrait_<label>_*.png
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LABEL = process.argv[2] || "shot";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function shot(name) { await page.screenshot({ path: path.join(OUT, `portrait_${LABEL}_${name}.png`) }); console.log("  shot:", `portrait_${LABEL}_${name}.png`); }

// char → universe (for the character-select roster filter)
const CHARS = [
  { key: "hisoka",   universe: "hunter_x_hunter" },
  { key: "superman", universe: "dc" },
  { key: "beerus",   universe: "dragon_ball" },
];

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

for (const c of CHARS) {
  // ── SKIN SELECT (the screen under test) ──
  const info = await page.evaluate(k => window.__harness.showSkinSelect(k, "p1", 0), c.key);
  await sleep(2200);   // let the async skin-portrait Images decode + a few draw frames land
  await shot(`skinselect_${c.key}`);
  console.log(`  ${c.key}: skins=${info.skins.length} (${info.skins.filter(s => s.portrait).length} with portrait)`);
}

for (const c of CHARS) {
  // ── CHARACTER SELECT (already cover-fit; captured for completeness / regression) ──
  await page.evaluate(u => window.__harness.showCharSelect(u, "training"), c.universe);
  await sleep(2200);
  await shot(`charselect_${c.universe}`);
}

console.log(errors.length ? `  PAGE ERRORS: ${errors.slice(0,3).join(" | ")}` : "  no page errors");
await browser.close(); server.close();
