// harness/brainiac_stage5.mjs — STAGE 5: Brainiac's ULTIMATE "Sphere of Annihilation" (Energy Pillar barrage).
// An INLINE freeze-cinematic on the LIVE fighter (no duplicate instance). Verifies:
//   • p1Ultimate → cast=true, spends 100 Intellect, caster HOLDS the beam-fire cast pose (brainiacBeam)
//   • the pillar cinematic is ACTIVE (brainiacPillar().timer > 0) and the overlay actually DRAWS (renders++)
//   • the LIVE fighter renders its own sprite (no 128² box / no dup body)
//   • the guaranteed payoff CONNECTS at ULTIMATE tier (≥120 effective)
//   • the cinematic ends (timer → 0) and the fighter recovers
// Fired deterministically via __harness.p1Ultimate. Screenshots → harness/shots/brainiac_s5_*.png.
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
const fx = () => page.evaluate(() => window.__harness.brainiacPillar());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `brainiac_s5_${name}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=brainiac`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + 120); await waitFrames(2);
  const hp0 = (await p2()).health;
  const en0 = (await p1()).energy;

  console.log("\n── activation (deterministic p1Ultimate → live fighter) ──");
  const r = await page.evaluate(() => window.__harness.p1Ultimate());
  check("Sphere of Annihilation fires on the LIVE fighter (cast=true)", r?.cast === true, `cast=${r?.cast} castMove=${r?.castMove}`);
  check("caster holds the beam-fire cast pose (castMove = brainiacBeam)", r?.castMove === "brainiacBeam", `castMove=${r?.castMove}`);
  const en1 = (await p1()).energy;
  check("ultimate spent the 100 Intellect cost", (en0 - en1) >= 95, `energy ${en0} → ${en1} (−${(en0 - en1).toFixed(0)})`);

  await waitFrames(2);
  const c0 = await fx();
  check("pillar cinematic ACTIVE (timer > 0)", (c0?.timer || 0) > 0, `timer=${c0?.timer}`);
  check("pillar sheet loaded (brainiac_pillar_uniform)", c0?.bgLoaded === true, `bgLoaded=${c0?.bgLoaded}`);
  // The LIVE fighter must render its OWN cast-pose sprite (no procedural box, no duplicate body).
  let castSheet = false, box = false;
  for (let i = 0; i < 34 && !castSheet; i++) { const g = await p1(); const sh = g.spriteSheet || ""; if (sh.includes("brainiac_beam_uniform")) castSheet = true; if (!sh.includes("brainiac_")) box = true; await waitFrames(1); }
  const g0 = await p1();
  check("live fighter renders the beam cast sprite (no box / no dup body)", castSheet && !box, `castSheet=${castSheet} box=${box}`);
  check("still a single sprite handler on the caster (hasSpriteHandler)", g0.hasSpriteHandler === true, `hasSpriteHandler=${g0.hasSpriteHandler}`);

  console.log("\n── barrage erupting ──");
  await waitFrames(20); await shot("barrage");
  const cMid = await fx();
  check("cinematic still running mid-barrage (timer ticking down)", (cMid?.timer || 0) > 0 && (cMid?.timer || 999) < (c0?.timer || 0), `mid=${cMid?.timer} (from ${c0?.timer})`);
  check("pillar overlay ACTUALLY DREW (renders > 0)", (cMid?.renders || 0) > 0, `renders=${cMid?.renders}`);

  console.log("\n── detonation payoff ──");
  let landed = false; let hpAfter = hp0;
  for (let i = 0; i < 70 && !landed; i++) { hpAfter = (await p2()).health; if (hpAfter < hp0) landed = true; await waitFrames(1); if (i === 4) await shot("detonate"); }
  check("guaranteed pillar-detonation payoff CONNECTS (dummy takes damage)", landed, `hp ${hp0} → ${hpAfter} (−${(hp0 - hpAfter).toFixed(0)})`);
  check("payoff is ULTIMATE-tier (≥120 effective)", (hp0 - hpAfter) >= 120, `dmg=${(hp0 - hpAfter).toFixed(0)}`);

  console.log("\n── cinematic ends + fighter recovers ──");
  await page.waitForFunction(() => (window.__harness.brainiacPillar()?.timer || 0) === 0, null, { timeout: 8000, polling: 16 }).catch(() => {});
  const cEnd = await fx();
  check("cinematic ends (timer back to 0)", (cEnd?.timer || 0) === 0, `timer=${cEnd?.timer}`);
  await waitFrames(30); await waitGrounded();
  const gEnd = await p1();
  check("fighter recovers to a normal action after the ult", !(gEnd.spriteSheet || "").includes("box") && gEnd.hasSpriteHandler, `action=${gEnd.spriteAction} sheet=${gEnd.spriteSheet}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Brainiac Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/brainiac_s5_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
