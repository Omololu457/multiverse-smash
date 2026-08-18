// harness/mayuri_stage4.mjs — STAGE 4: "Bankai: Konjiki Ashisogi Jizō" construct ULTIMATE.
// An inline freeze-cinematic on the LIVE fighter (Orochimaru pattern — no duplicate instance). Verifies:
//   • the LIVE caster triggers it (p1Ultimate → cast=true) and HOLDS the release-cast pose (mayuriBankaiCast
//     sheet on the real fighter — NOT a box, NOT a duplicate body) — the recurring cinematic-ult bug class;
//   • the construct cinematic runs (bankaiTimer counts down over ~84 frames);
//   • the guaranteed construct-crush payoff lands (dummy takes a big hit ~198 EFF);
//   • no JS errors, and the fighter RECOVERS to a normal state afterward (not stuck).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const fx = () => page.evaluate(() => window.__harness.mayuriFx("p1"));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `mayuri_s4_${tag}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=mayuri`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // Position the dummy adjacent (so the construct visibly crushes it on-screen) + fill the meter.
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + 120); await waitFrames(2);
  const hp0 = (await p2()).health;
  const en0 = (await p1()).energy;

  console.log("\n── activation (deterministic p1Ultimate → live fighter) ──");
  const r = await page.evaluate(() => window.__harness.p1Ultimate());
  check("Bankai ULTIMATE fires on the LIVE fighter (cast=true)", r?.cast === true, `cast=${r?.cast} castMove=${r?.castMove}`);
  check("caster holds the release-cast pose (castMove = mayuriBankaiCast)", r?.castMove === "mayuriBankaiCast", `castMove=${r?.castMove}`);
  const en1 = (await p1()).energy;
  check("ultimate spent the 100 reiatsu cost", (en0 - en1) >= 95, `energy ${en0} → ${en1} (−${(en0 - en1).toFixed(0)})`);

  await waitFrames(2);
  const c0 = await fx();
  check("construct cinematic ACTIVE (bankaiTimer > 0)", (c0?.bankaiTimer || 0) > 0, `bankaiTimer=${c0?.bankaiTimer}`);
  // The RECURRING BUG CLASS check: the LIVE fighter must render its OWN cast-pose sprite (no procedural
  // box, no duplicate body). It shows `idle` during the brief post-cast hitstop, then the release pose —
  // poll across the cinematic for the bankai cast strip on the real fighter.
  let castSheet = false, box = false;
  for (let i = 0; i < 34 && !castSheet; i++) { const g = await p1(); const sh = g.spriteSheet || ""; if (sh.includes("mayuri_bankai_cast_uniform")) castSheet = true; if (!sh.includes("mayuri_")) box = true; await waitFrames(1); }
  const g0 = await p1();
  check("live fighter renders the Bankai cast sprite (no box / no dup body)", castSheet && !box, `castSheet=${castSheet} box=${box}`);
  check("still a single sprite handler on the caster (hasSpriteHandler)", g0.hasSpriteHandler === true, `hasSpriteHandler=${g0.hasSpriteHandler}`);

  console.log("\n── construct assembling ──");
  await waitFrames(24); await shot("assemble");
  const cMid = await fx();
  check("cinematic still running mid-assembly (bankaiTimer ticking down)", (cMid?.bankaiTimer || 0) > 0 && (cMid?.bankaiTimer || 999) < (c0?.bankaiTimer || 0), `mid=${cMid?.bankaiTimer} (from ${c0?.bankaiTimer})`);

  console.log("\n── crush payoff ──");
  // Payoff scheduled at frame ~52; poll for the damage.
  let landed = false; let hpAfter = hp0;
  for (let i = 0; i < 60 && !landed; i++) { hpAfter = (await p2()).health; if (hpAfter < hp0) landed = true; await waitFrames(1); if (i === 4) await shot("crush"); }
  check("guaranteed construct-crush payoff CONNECTS (dummy takes damage)", landed, `hp ${hp0} → ${hpAfter} (−${(hp0 - hpAfter).toFixed(0)})`);
  check("payoff is ULTIMATE-tier (≥120 effective)", (hp0 - hpAfter) >= 120, `dmg=${(hp0 - hpAfter).toFixed(0)}`);

  console.log("\n── cinematic ends + fighter recovers ──");
  await page.waitForFunction(() => (window.__harness.mayuriFx("p1")?.bankaiTimer || 0) === 0, null, { timeout: 8000, polling: 16 }).catch(() => {});
  const cEnd = await fx();
  check("cinematic ends (bankaiTimer back to 0)", (cEnd?.bankaiTimer || 0) === 0, `bankaiTimer=${cEnd?.bankaiTimer}`);
  await waitFrames(30); await waitGrounded();
  const gEnd = await p1();
  check("caster RECOVERS to a normal state (not stuck attacking)", gEnd.attacking === false, `attacking=${gEnd.attacking}`);
  check("caster renders a real mayuri sheet after the ult (no box)", (gEnd.spriteSheet || "").includes("mayuri_"), `sheet=${gEnd.spriteSheet}`);
  await shot("recovered");

  // ── DATA-LEVEL contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("mayuri")?.animationData || {});
  check("Bankai cast pose wired to a real mayuri sheet", (ad.mayuriBankaiCast?.sheet || "").includes("mayuri_bankai_cast_uniform"), `sheet=${ad.mayuriBankaiCast?.sheet}`);

  check("no JS page errors during the cinematic", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Mayuri Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/mayuri_s4_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
