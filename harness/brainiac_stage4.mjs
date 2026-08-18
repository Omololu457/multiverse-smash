// harness/brainiac_stage4.mjs — STAGE 4: Brainiac's 5 directional specials (executeBrainiacSpecial).
//   N  = Energy Beam       → cast brainiacBeam + a beam projectile that CONNECTS (dummy hp drops)
//   F  = Energy Blade      → move brainiacBlade (advancing disjoint slash) + CONNECTS
//   D  = Tentacle Sweep    → move brainiacSweep (long low disjoint) + CONNECTS
//   B  = Electric Shield   → cast brainiacShield + defenseMultiplier RAISED (defensive buff, no hitbox)
//   U  = Levitation        → cast brainiacLevitate + P1 rises (vy<0) + air beam projectile
// Driven deterministically via __harness.p1SpecialDir(dir). Screenshots → harness/shots/brainiac_s4_*.
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `brainiac_s4_${name}.png`) }); }
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function setupAdjacent(gap = 92) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.4);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=brainiac`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── Neutral: Energy Beam (projectile) ──
  console.log("\n── neutral: Energy Beam ──");
  await setupAdjacent(120);
  { const hp0 = (await p2()).health;
    const r = await specialDir(null);
    check("beam: cast → brainiacBeam", (r.cast || r.move || "") === "brainiacBeam", `cast=${r.cast} move=${r.move}`);
    await waitFrames(3); await shot("beam");
    await waitFrames(30);
    const hp1 = (await p2()).health;
    check("beam: projectile connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitFrames(20);

  // ── Forward: Energy Blade (advancing slash) ──
  console.log("\n── forward: Energy Blade ──");
  await setupAdjacent(84);
  { const hp0 = (await p2()).health;
    const r = await specialDir("F");
    check("blade: move → brainiacBlade", (r.move || r.cast || "") === "brainiacBlade", `move=${r.move} cast=${r.cast}`);
    await waitFrames(4); await shot("blade");
    await waitFrames(22);
    const hp1 = (await p2()).health;
    check("blade: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitFrames(16);

  // ── Down: Tentacle Sweep (long low disjoint) ──
  console.log("\n── down: Tentacle Sweep ──");
  await setupAdjacent(120);
  { const hp0 = (await p2()).health;
    const r = await specialDir("D");
    check("sweep: move → brainiacSweep", (r.move || r.cast || "") === "brainiacSweep", `move=${r.move} cast=${r.cast}`);
    await waitFrames(5); await shot("sweep");
    await waitFrames(24);
    const hp1 = (await p2()).health;
    check("sweep: connects at long range (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitFrames(16);

  // ── Back: Electric Shield (defensive buff, no hitbox) ──
  console.log("\n── back: Electric Shield (defensive buff) ──");
  await setupAdjacent(90);
  { const def0 = (await p1()).defMult;
    const r = await specialDir("B");
    check("shield: cast → brainiacShield", (r.cast || r.move || "") === "brainiacShield", `cast=${r.cast} move=${r.move}`);
    await waitFrames(3); await shot("shield");
    const pp = await p1();
    check("shield: defenseMultiplier RAISED", pp.defMult > def0 + 0.01, `defMult ${def0} → ${pp.defMult}`);
    check("shield: buff flag active", pp.brainiacShield === true, `active=${pp.brainiacShield}`);
  }
  await waitFrames(16);

  // ── Up: Levitation (rise + air beam) ──
  console.log("\n── up: Levitation ──");
  await setupAdjacent(120);
  { const y0 = (await p1()).y;
    const r = await specialDir("U");
    check("levitate: cast → brainiacLevitate", (r.cast || r.move || "") === "brainiacLevitate", `cast=${r.cast} move=${r.move}`);
    await waitFrames(4); await shot("levitate");
    const pp = await p1();
    check("levitate: P1 rises (airborne / vy<0 or y decreased)", pp.vy < 0 || pp.y < y0 - 2 || !pp.grounded, `vy=${pp.vy} y ${y0}→${pp.y} grounded=${pp.grounded}`);
  }

  // ── DATA contract: all 5 special poses wired to real brainiac sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("brainiac")?.animationData || {});
  const keys = ["brainiacBeam", "brainiacBlade", "brainiacSweep", "brainiacShield", "brainiacLevitate"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("brainiac"));
  check("all 5 special poses wired to real brainiac sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));
  check("beam projectile sheet exists on disk", fs.existsSync(path.join(ROOT, "brainiac_beam_proj_uniform.png")), "");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Brainiac Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/brainiac_s4_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
