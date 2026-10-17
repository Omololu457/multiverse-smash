// brutality_shisui_cine.mjs — review the CHOREOGRAPHED (two-actor + camera) brutality on shisui_fallen.
// Boots shisui_fallen vs sasuke, drives the real cinematic, captures each "shot" beat for visual review.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const SHOTS = path.join(ROOT, "brutality_work", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let errs = []; page.on("pageerror", e => errs.push(e.message));
const st = () => page.evaluate(() => window.__harness.state());
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };

await page.goto(`${base}/index.html?harness=1&p1=shisui_fallen&p2=sasuke`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.start?.());
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {});
const trig = await page.evaluate(() => window.__harness.brutality.cineTrigger("p1"));
ok(trig && trig.started && trig.wKey === "shisui_fallen", `activated (${JSON.stringify(trig)})`);

const SHOTS_AT = [[24, "shot1_zoom"], [57, "shot2_strike"], [96, "shot3_rush"], [140, "shot4_sword"], [162, "shot5_closeup"], [192, "shot6_collapse"]];
for (const [t, name] of SHOTS_AT) {
  await page.waitForFunction(tt => { const s = window.__harness.brutality.cineStatus(); return !s.active || s.t >= tt; }, t, { timeout: 8000, polling: 6 }).catch(() => {});
  const s = await page.evaluate(() => window.__harness.brutality.cineStatus());
  await page.screenshot({ path: path.join(SHOTS, `shisui_${name}.png`) });
  console.log(`  shot @t=${s.t} → shisui_${name}.png`);
}
await page.waitForFunction(() => !window.__harness.brutality.cineStatus().active, null, { timeout: 8000, polling: 16 }).catch(() => {});
ok(!(await page.evaluate(() => window.__harness.brutality.cineStatus().active)), "resolved");
ok(errs.length === 0, `0 pageerrors (${errs.slice(0, 3).join(" | ")})`);
console.log(`\nRESULT: ${pass}/${pass + fail} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
