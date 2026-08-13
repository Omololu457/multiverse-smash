// harness/universe_stages_verify.mjs — VERIFY the 8 new universe stages render (stage-select + in-match
// procedural landmark) and that each gap universe now ROUTES to its new home stage. Screenshots →
// harness/shots/universe_stages/. Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots", "universe_stages");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const pageErrors = [];
page.on("pageerror", e => pageErrors.push("JS: " + e.message));
// Track real asset 404s via response events (they carry the URL). Ignore the dev-server /api/health ping —
// the minimal test server here doesn't implement it (serve.mjs does); it's unrelated to stage assets.
page.on("response", r => { if (r.status() === 404 && !/api\/health/.test(r.url())) pageErrors.push("404: " + decodeURIComponent(r.url().replace(base, ""))); });

const stateF = () => page.evaluate(() => window.__harness.state());
const shot = (name) => page.screenshot({ path: path.join(OUT, name) });
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

// [stage name, representative char, universe]
const NEW = [
  ["Soul Society",       "ichigo",       "bleach"],
  ["Gotham Rooftops",    "batman",       "dc"],
  ["Woodsboro",          "ghostface",    "horror"],
  ["Heaven's Arena",     "killua",       "hunter_x_hunter"],
  ["Viltrumite Warzone", "omniman",      "invincible"],
  ["Command Center",     "omega_ranger", "power_rangers"],
  ["PK Academy",         "saiki",        "saiki_k"],
  ["Analysis Nexus",     "omololu",      "original"],
];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

async function boot() {
  await page.goto(`${base}/index.html?harness=1&p1=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
}

try {
  await boot();

  // ── A. IN-MATCH — set each stage live (battle bg reads matchConfig.selectedStage each frame) + screenshot ──
  console.log("── A. In-match procedural landmark render ──");
  for (const [name] of NEW) {
    const r = await page.evaluate(n => window.__harness.selectStageByName(n), name);
    await waitFrames(6);
    await shot(`match_${slug(name)}.png`);
    check(`${name}: selectable + rendered in-match`, !r.error && r.name === name && r.music === null, `music=${r.music} (expect null → procedural), err=${r.error || "none"}`);
  }

  // ── B. STAGE-SELECT screen — hover each new stage + screenshot ──
  console.log("\n── B. Stage-select screen ──");
  for (const [name] of NEW) {
    const r = await page.evaluate(n => window.__harness.showStageSelect(n), name);
    await waitFrames(4);
    await shot(`select_${slug(name)}.png`);
    check(`${name}: appears in stage-select (index ${r.index}/${r.total})`, !r.error && r.index >= 0, `${JSON.stringify(r)}`);
  }

  // ── C. HOME-STAGE ROUTING — each gap universe's char now routes to its new stage ──
  console.log("\n── C. Universe → home-stage routing ──");
  for (const [name, charKey, universe] of NEW) {
    const home = await page.evaluate(k => window.__harness.homeStageForKey(k), charKey);
    check(`${universe} (${charKey}) → home stage "${name}"`, home === name, `got "${home}"`);
  }

  check("no page/console errors during stage rendering", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  console.log(`\n${fails === 0 ? "✅" : "❌"} Universe stages: ${fails} failed check(s). Shots → harness/shots/universe_stages/`);
} catch (e) {
  console.log("  ⚠️ error:", e.message, e.stack); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
