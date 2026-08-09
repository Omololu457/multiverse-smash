// harness/yuji_intro_shot.mjs — captures the "ALT" solo intro (intro2, sheet yuji_intro_2_uniform)
// playing as ONE continuous sequence: three stills across its playback (early / mid / late).
// Context: the design-doc premise that intro_2 + intro_3 are two halves of one alt-costume intro was
// FALSE (frame-verified: intro_3 is a duplicate of the WIN pose; intro_2 is a complete standalone
// flourish→stance intro at the base palette). This proves intro2 plays whole on its own.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const cam = () => page.evaluate(() => window.__harness.camera?.());
const introState = () => page.evaluate(() => window.__harness.introState?.());

async function cropShot(name) {
  const p = await p1(); const c = await cam();
  let clip;
  if (p && c) { const sx = (p.x - c.x) * c.zoom + 640, sy = (p.y - c.y) * c.zoom + 360, pad = 90;
    const x0 = Math.max(0, sx - pad), y0 = Math.max(0, sy - pad - 50);
    clip = { x: x0, y: y0, width: Math.min(1280 - x0, 200), height: Math.min(720 - y0, 250) }; }
  await page.screenshot({ path: path.join(OUT, name), ...(clip ? { clip } : {}) });
}

await page.goto(`${base}/index.html?harness=1&p1=yuji&p2=yuji`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.showCharSelect("jujutsu_kaisen", "training"));
await sleep(200);

let pass = 0, fail = 0;
const check = (c, m) => { if (c) { pass++; console.log("  ✔", m); } else { fail++; console.log("  ✗ FAIL", m); } };

// Re-roll the intro until the random pool lands on intro2 (the ALT solo stance).
let got = null;
for (let i = 0; i < 30 && got !== "intro2"; i++) {
  await page.evaluate(() => window.__harness.start());
  await sleep(60);
  const f = await p1();
  got = f?.introVariant;
  if (got !== "intro2") { await page.evaluate(() => window.__harness.skipToBattle()); await sleep(30); }
}
console.log("landed intro variant:", got);
check(got === "intro2", `rolled the ALT intro (intro2), got ${got}`);

// Capture three stills across the playback → proves it plays as one continuous sequence.
const st0 = await introState();
await cropShot("yuji_intro2_a_early.png");
await sleep(160); await cropShot("yuji_intro2_b_mid.png");
await sleep(200); await cropShot("yuji_intro2_c_late.png");
console.log("introState:", JSON.stringify(st0));
check(st0?.p1Variant === "intro2" && st0?.p1Playing === true, "intro2 is the active, playing variant");
check(errors.length === 0, `no page errors (${errors.length})`);

console.log(`\nINTRO SHOT: ${pass} passed, ${fail} failed → harness/shots/yuji_intro2_{a_early,b_mid,c_late}.png`);
if (errors.length) console.log("ERRORS:", errors.slice(0, 4));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
