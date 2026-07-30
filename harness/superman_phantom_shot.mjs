// harness/superman_phantom_shot.mjs — REAL in-match screenshots of Superman's Phantom Zone skin:
// idle + an attack + FLIGHT (the extra movement mode), confirming the void base + spectral overlay
// render and stay attached across poses.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const snap = () => page.evaluate(() => window.__harness.p1?.());

await page.goto(`${base}/index.html?harness=1&p1=superman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(300);
const applied = await page.evaluate(() => window.__harness.setSkin?.("p1", "supermanPhantomZone"));
await sleep(500);
console.log(`applied=${applied} sheet=${(await snap())?.spriteSheet}`);

await page.screenshot({ path: path.join(OUT, "superman_phantom_idle.png") });

// attack: heavy (k)
await page.keyboard.down("k"); await sleep(130);
await page.screenshot({ path: path.join(OUT, "superman_phantom_attack.png") });
const atkSheet = (await snap())?.spriteSheet;
await page.keyboard.up("k"); await sleep(500);

// flight: P-tap toggles flight for canFly chars; nudge right to get the fly pose, then screenshot
await page.keyboard.press("p"); await sleep(200);
await page.keyboard.down("d"); await sleep(220);
await page.screenshot({ path: path.join(OUT, "superman_phantom_flight.png") });
const flySnap = await snap();
await page.keyboard.up("d");
console.log(`attack sheet=${atkSheet}`);
console.log(`flight sheet=${flySnap?.spriteSheet} flightActive=${flySnap?.flightActive}`);
console.log("shots: harness/shots/superman_phantom_{idle,attack,flight}.png");
await browser.close(); server.close();
