// harness/alt_sukuna_stage4.mjs — STAGE 4: Alternate Sukuna's 3 directional specials (executeAltSukunaSpecial).
//   N = Fūga: Fire Arrow  → cast altSukunaBeam + a pale-gold arrow projectile that CONNECTS (dummy hp drops)
//   F = Spinning Lunge Kick → move altSukunaSpinkick (advancing) + CONNECTS
//   D = Cursed Grab       → cast grab + p2 grabbed → throw damage (hp drops)
// Driven deterministically via __harness.p1SpecialDir(dir). Screenshots → harness/shots/alt_sukuna_s4_*.
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
async function shot(name) { await page.screenshot({ path: path.join(OUT, `alt_sukuna_s4_${name}.png`) }); }
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function setupAdjacent(gap = 92) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.4);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=alt_sukuna`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── neutral: Fūga Fire Arrow (projectile) ──");
  await setupAdjacent(150);
  { const hp0 = (await p2()).health;
    const r = await specialDir(null);
    check("beam: cast → altSukunaBeam", (r.cast || r.move || "") === "altSukunaBeam", `cast=${r.cast} move=${r.move}`);
    await waitFrames(4); await shot("beam");
    await waitFrames(34);
    const hp1 = (await p2()).health;
    check("beam: projectile connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitFrames(20);

  console.log("\n── forward: Spinning Lunge Kick ──");
  await setupAdjacent(96);
  { const hp0 = (await p2()).health;
    const r = await specialDir("F");
    check("spinkick: move → altSukunaSpinkick", (r.move || r.cast || "") === "altSukunaSpinkick", `move=${r.move} cast=${r.cast}`);
    await waitFrames(5); await shot("spinkick");
    await waitFrames(24);
    const hp1 = (await p2()).health;
    check("spinkick: connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }
  await waitFrames(16);

  console.log("\n── down: Cursed Grab (command grab → throw) ──");
  await setupAdjacent(48);
  { const hp0 = (await p2()).health;
    const r = await specialDir("D");
    check("grab: cast → grab pose", (r.cast || r.move || "") === "grab", `cast=${r.cast} move=${r.move}`);
    await waitFrames(2);
    const grabbed = (await p2()).isGrabbed;
    await shot("grab");
    await waitFrames(40);   // let the throw resolve (updateGrab pop-and-drop)
    const hp1 = (await p2()).health;
    check("grab: p2 grabbed", grabbed === true, `isGrabbed=${grabbed}`);
    check("grab: throw connects (dmg)", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  }

  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("alt_sukuna")?.animationData || {});
  check("animationData.altSukunaBeam → alt_sukuna_beam sheet", (ad.altSukunaBeam?.sheet || "").includes("alt_sukuna_beam"), `sheet=${ad.altSukunaBeam?.sheet}`);
  check("animationData.altSukunaSpinkick → alt_sukuna_spinkick sheet", (ad.altSukunaSpinkick?.sheet || "").includes("alt_sukuna_spinkick"), `sheet=${ad.altSukunaSpinkick?.sheet}`);
  check("animationData.grab → real alt_sukuna_grab sheet (no longer light-reuse)", (ad.grab?.sheet || "").includes("alt_sukuna_grab"), `sheet=${ad.grab?.sheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
