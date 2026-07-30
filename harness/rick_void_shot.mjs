// harness/rick_void_shot.mjs — REAL in-match screenshots of Rick's Void Form: idle + an attack pose,
// to confirm the black base + procedural starfield overlay both render and stay attached to the sprite.
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

await page.goto(`${base}/index.html?harness=1&p1=rick`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(300);
const applied = await page.evaluate(() => window.__harness.setSkin?.("p1", "rickVoidForm"));
await sleep(500);
const p1a = await page.evaluate(() => window.__harness.p1?.());
console.log(`applied=${applied} sheet=${p1a?.spriteSheet}`);
const fxIdle = await page.evaluate(() => { const f = window.__harness.p1raw?.() || null; return null; });

// idle shot
await page.screenshot({ path: path.join(OUT, "rick_voidform_idle.png") });

// attack: hold heavy (k) for a few frames, capture mid-swing
await page.keyboard.down("k");
await sleep(120);
await page.screenshot({ path: path.join(OUT, "rick_voidform_attack.png") });
await page.keyboard.up("k");

// report the recorded draw-rect + fx presence so we can confirm the overlay has data to track
const dbg = await page.evaluate(() => { const f = window.__harness.p1?.(); return { sheet: f?.spriteSheet, drawX: f?.drawX, drawW: f?.drawW }; });
console.log("shots: harness/shots/rick_voidform_{idle,attack}.png", JSON.stringify(dbg));
await browser.close(); server.close();
