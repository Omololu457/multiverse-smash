// harness/tobirama_edo_nested.mjs — Stage 6 (updated): the NESTED ultimate-within-an-ultimate.
// With a cinematic-ultimate vessel (Flash → Flash Time), verify: (1) the vessel's OWN ultimate fires
// during the Edo Tensei window, (2) its cinematic plays normally, and (3) — the critical balance rule —
// the Edo Tensei window timer PAUSES while that inner cinematic resolves, then resumes.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // Reanimate the FLASH vessel (whose ultimate — Flash Time — is a freeze cinematic).
  await waitGrounded();
  await page.evaluate(() => { window.__harness.edoBackup.setBackup("flash"); window.__harness.setP1Energy(200); window.__harness.resetUlt(); window.__harness.healP1(); });
  await waitFrames(2);
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(3);
  await page.evaluate(() => { window.__harness.edoBackup.skipCine(); window.__harness.resetFighterInput?.("p1"); });
  await waitFrames(2);
  let a = await p1();
  check("reanimated the Flash vessel", a.edoActive && a.key === "flash", `key=${a.key}`);
  await page.evaluate(() => window.__harness.setP1Energy(200));   // fund the nested ultimate (window fuel IS energy now)
  const tStart = (await p1()).edoFuel;                            // capture the window meter AFTER funding

  // ── trigger the vessel's OWN ultimate (Flash Time) during the window ──
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); await waitFrames(2);
  const inCine = await page.evaluate(() => window.__harness.edoBackup.innerCineActive());
  const during = await p1();
  check("vessel's ultimate started its OWN cinematic (Flash Time)", inCine || during.flashTimeActive, `innerCine=${inCine} flashTime=${during.flashTimeActive}`);
  const tAtCineStart = during.edoFuel;

  // ── FUEL PAUSE: advance frames while the inner cinematic freezes the loop → edo fuel must NOT drain ──
  await waitFrames(40);
  const paused = await p1();
  const stillCine = await page.evaluate(() => window.__harness.edoBackup.innerCineActive());
  check("inner cinematic still running (freeze)", stillCine, `innerCine=${stillCine}`);
  check("Edo window fuel PAUSED during the nested cinematic", paused.edoFuel === tAtCineStart, `fuel ${tAtCineStart} → ${paused.edoFuel} (Δ should be 0)`);

  // ── RESUME: once the inner cinematic ends, the edo fuel drains again ──
  await page.waitForFunction(() => !window.__harness.edoBackup.innerCineActive(), null, { timeout: 8000, polling: 16 }).catch(() => {});
  const resumeBase = (await p1()).edoFuel;
  await waitFrames(20);
  const resumed = await p1();
  check("still the vessel, window still active", resumed.edoActive && resumed.key === "flash", `key=${resumed.key}`);
  check("Edo window fuel RESUMES draining after the inner cinematic", resumed.edoFuel < resumeBase, `fuel ${resumeBase} → ${resumed.edoFuel} (should drain)`);
  check("net: fuel only spent during live gameplay (not the freeze)", resumed.edoFuel < tStart, `start ${tStart} → now ${resumed.edoFuel}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Nested ultimate + timer-pause: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
