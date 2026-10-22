// harness/spiderman_ai.mjs — PHASE 4: CPU AI signature layer.
// Spider-Man's AI (decideSpidermanSignatureMove, mirroring Homelander's) makes him USE his web kit:
// he throws web pokes at range (which apply WEBBED) and unloads Maximum Web at full meter. Verified by
// running an AI-vs-AI match and observing his web PROJECTILES + the opponent getting WEBBED — p1() in
// aiVsAi mode doesn't expose cast/currentMove, so projectiles() + spiderWebbed() are the signal. Also
// asserts determinism (same seed → identical outcome) and no errors.
import { chromium } from "playwright";
import http from "node:http"; import path from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

const run = (seed) => page.evaluate((s) => {
  const H = window.__harness; H.rng.forceSeed(s);
  H.aiVsAi.start({ p1: "spiderman", p2: "naruto", p1Diff: "impossible", p2Diff: "adaptive", matches: 1, speed: 1 });
  let webProjFrames = 0, oppWebbedFrames = 0; const projNames = new Set();
  for (let i = 0; i < 1500; i++) {
    H.aiVsAi.step(1);
    for (const p of H.projectiles()) { projNames.add(p.name); if (/spiderWeb/i.test(p.name)) webProjFrames++; }
    const wb = H.spiderWebbed("p2"); if (wb && wb.stacks > 0) oppWebbedFrames++;
  }
  return { webProjFrames, oppWebbedFrames, spiderProj: [...projNames].filter(n => /spider|web/i.test(n)), oppHp: Math.round((H.p2() || {}).health || 0) };
}, seed);

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!(window.__harness && window.__harness.aiVsAi && window.__harness.rng), null, { timeout: 15000 });

  console.log("\n── the CPU uses his web kit (AI-vs-AI, Spider-Man = impossible) ──");
  const r1 = await run(777);
  console.log(`  web-projectile frames=${r1.webProjFrames}, opponent-webbed frames=${r1.oppWebbedFrames}, web proj=${r1.spiderProj.join(",")}, oppHP=${r1.oppHp}`);
  check("the AI casts web specials (web projectiles appear)", r1.webProjFrames > 0, `frames=${r1.webProjFrames}`);
  check("its web hits land + apply WEBBED to the opponent", r1.oppWebbedFrames > 0, `webbed frames=${r1.oppWebbedFrames}`);
  check("the AI deals damage (opponent takes chip/web hits)", r1.oppHp < 1180, `oppHP=${r1.oppHp}`);

  console.log("\n── deterministic (same seed → identical; different seed → differs) ──");
  const r2 = await run(777);
  const r3 = await run(999);
  check("same seed → identical AI outcome", JSON.stringify(r1) === JSON.stringify(r2), `r1=${r1.webProjFrames}/${r1.oppWebbedFrames} r2=${r2.webProjFrames}/${r2.oppWebbedFrames}`);
  check("different seed → different AI outcome", JSON.stringify(r1) !== JSON.stringify(r3), "identical (suspicious)");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Spider-Man CPU AI: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
