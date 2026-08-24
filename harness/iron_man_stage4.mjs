// harness/iron_man_stage4.mjs — STAGE 4: Iron Man's TWO specials (executeIronManSpecial).
//   neutral = Charge→Blast (casts ironManBlast → spawns a procedural cyan repulsor BOLT projectile, connects at range)
//   Fwd     = Spider-leg strike (ironManSpiderLegs — self-contained SUIT-transform disjoint melee, connects adjacent)
// For each: (1) fires the right currentMove/_spriteCastMove, (2) resolves the right iron_man_* sheet (no 128² box),
// (3) CONNECTS on the dummy. Deterministic via __harness.p1SpecialDir. "Super" pose = Stage-5 ULT trigger.
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `iron_man_s4_${name}.png`) }); return; }
  const padX = 170, padTop = r.h * 1.4, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `iron_man_s4_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 56) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=iron_man`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── neutral = Charge→Blast (repulsor BOLT projectile) ──
  console.log("\n── Charge→Blast (neutral, projectile) ──");
  {
    await setupAdjacent(150);   // ranged: dummy further out so the bolt travels
    const hp0 = (await p2()).health;
    const res = await fireDir(null);
    check(`Blast: casts ironManBlast`, res?.cast === "ironManBlast", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("iron_man_blast_uniform");
    check(`Blast: sprite → iron_man_blast_uniform`, (mv.spriteSheet || "").includes("iron_man_blast_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("blast");
    let sawBolt = false;
    for (let f = 0; f < 18 && !sawBolt; f++) { await waitFrames(1); const pr = await projectiles(); sawBolt = pr.some(p => (p.name || "").includes("ironManRepulsor")); }
    check(`Blast: spawns an ironManRepulsor projectile`, sawBolt, "");
    await waitFrames(44);
    const hp1 = (await p2()).health;
    check(`Blast: bolt connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(8);
  }

  // ── Fwd = Spider-leg strike (self-contained suit disjoint) ──
  console.log("\n── Spider-leg strike (Fwd, suit disjoint) ──");
  {
    await setupAdjacent(60);
    const hp0 = (await p2()).health;
    const res = await fireDir("F");
    check(`Spider-legs: fires ironManSpiderLegs`, res?.move === "ironManSpiderLegs", `move=${res?.move} cast=${res?.cast}`);
    const mv = await waitSheet("iron_man_spiderlegs_uniform");
    check(`Spider-legs: sprite → iron_man_spiderlegs_uniform`, (mv.spriteSheet || "").includes("iron_man_spiderlegs_uniform"), `sheet=${mv.spriteSheet}`);
    await crop("spiderlegs");
    await waitFrames(28);
    const hp1 = (await p2()).health;
    check(`Spider-legs: connects (dmg)`, hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
    await waitGrounded(); await waitFrames(6);
  }

  // ── DATA-LEVEL contract: both special cast poses wired to real iron_man sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("iron_man")?.animationData || {});
  const keys = ["ironManBlast", "ironManSpiderLegs"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("iron_man"));
  check("both specials wired to real iron_man sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Iron Man Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/iron_man_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
