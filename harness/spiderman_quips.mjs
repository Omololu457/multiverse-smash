// harness/spiderman_quips.mjs — PHASE 4: the quip-bubble system (render-only comic shout balloons).
// A quip event pops a bubble above Spider-Man that actually DRAWS; the "Quip bubbles" setting turns it off;
// the bubble is timed and self-clears; no JS errors. Uses the real rAF render loop (bubbles draw in render()).
import { chromium } from "playwright";
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const my404 = []; page.on("response", r => { if (r.status() === 404 && /spiderman_quip/.test(r.url())) my404.push(r.url()); });
const H = (fn, ...a) => page.evaluate(([f, args]) => window.__harness[f](...args), [fn, a]);
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=spiderman&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── quip bubble pops + renders on an event ──");
  await H("setQuipBubbles", true);
  const r0 = (await H("spiderQuip")).renders;
  await H("spiderQuipEvent", "catch");          // fire a quip event
  await waitFrames(3);
  const q = await H("spiderQuip");
  check("event sets a timed quip bubble", !!q.bubble && q.bubble.t > 0, `bubble=${JSON.stringify(q.bubble)}`);
  check("the bubble actually renders (draw count rose)", q.renders > r0, `renders ${r0}→${q.renders}`);
  await page.screenshot({ path: path.join(ROOT, "harness", "shots", "spiderman_quip_bubble.png") }).catch(() => {});

  console.log("\n── big TAUNT bubble ──");
  await H("spiderQuipEvent", "taunt");
  await waitFrames(3);
  const qt = await H("spiderQuip");
  check("taunt event shows the big taunt bubble", !!qt.bubble && qt.bubble.key === "taunt", `bubble=${JSON.stringify(qt.bubble)}`);

  console.log("\n── the bubble is timed (self-clears) ──");
  await waitFrames(100);
  const qc = await H("spiderQuip");
  check("bubble clears after its lifetime", !qc.bubble || qc.bubble.t <= 0, `bubble=${JSON.stringify(qc.bubble)}`);

  console.log("\n── 'Quip bubbles' OFF suppresses the render ──");
  await H("setQuipBubbles", false);
  const rOff0 = (await H("spiderQuip")).renders;
  await H("spiderQuipEvent", "catch");
  await waitFrames(5);
  const rOff1 = (await H("spiderQuip")).renders;
  check("setting OFF → no quip draws", rOff1 === rOff0, `renders ${rOff0}→${rOff1}`);
  await H("setQuipBubbles", true);

  check("no quip-sprite 404s", my404.length === 0, my404.slice(0, 3).join(", "));
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man QUIP BUBBLES: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
