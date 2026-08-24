// harness/handler_stage4.mjs — STAGE 4: The Handler's SHIKIGAMI CAMEO SYSTEM (executeHandlerSpecial).
// Each directional special SUMMONS a Ten Shadows shikigami (the summon-motion = the cameo call):
//   N = Divine Dogs (dog rush) · F = Orochi (snake lunge) · B = Datto (rabbit swarm) ·
//   D = Max Elephant (heavy slam) · U = Nue (bird anti-air) · AIR = Toad (aerial drop).
// For each: fires the handlerSummon cast pose, spawns the right summons.js entity carrying its OWN
// resliced sheet (no fallback box), and CONNECTS on the dummy (×0.60-scaled — exact for the single-hit
// Orochi 60→36 / Toad 50→30). Deterministic via __harness.p1SpecialDir + summons(). Domain = deferred.
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
const summons = () => page.evaluate(() => window.__harness.summons());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `handler_s4_${name}.png`) }); return; }
  const padX = 220, padTop = r.h * 1.6, padBot = 40;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2.4), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `handler_s4_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  await page.evaluate(() => window.__harness.fillEnergy());
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
// Wait until a summon with `id` appears; return it (or null).
async function waitSummon(id, maxF = 26) { for (let f = 0; f < maxF; f++) { const s = (await summons()).find(x => x.id === id); if (s) return s; await waitFrames(1); } return null; }
// Wait until the dummy's health drops below hp0 (summon connected); return the drop.
async function waitHit(hp0, maxF = 80) { for (let f = 0; f < maxF; f++) { const h = (await p2()).health; if (h < hp0) return hp0 - h; await waitFrames(1); } return 0; }
// Wait until NO summons remain on the field (test isolation — long-lived summons from a prior slot,
// e.g. Datto's 120f swarm, must not pollute the next slot's damage read).
async function waitClearSummons(maxF = 180) { for (let f = 0; f < maxF; f++) { if ((await summons()).length === 0) return true; await waitFrames(2); } return false; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=handler`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // slot, dir, summonId, sheet, airborne, exactDrop (null = just connects)
  const SHIKIGAMI = [
    ["DivineDogs (N)", null, "handlerDivineDogs", "handler_shik_dog",      false, null],
    ["Orochi (F)",     "F",  "handlerOrochi",     "handler_shik_snake",    false, 36],
    ["Datto (B)",      "B",  "handlerDatto",      "handler_shik_rabbit",   false, null],
    ["MaxElephant (D)","D",  "handlerBansho",     "handler_shik_elephant", false, null],
    ["Nue (U)",        "U",  "handlerNue",        "handler_shik_nue",      false, null],
    ["Toad (AIR)",     null, "handlerToad",       "handler_shik_toad",     true,  30],
  ];

  for (const [name, dir, id, sheet, airborne, exact] of SHIKIGAMI) {
    console.log(`\n── ${name} ──`);
    await waitClearSummons();                       // isolate: no leftover summon from the prior slot
    await setupAdjacent(airborne ? 40 : 58);        // positions + heals p2 + fills energy
    await page.evaluate(() => window.__harness.healP2?.()); await waitFrames(1);  // re-heal after any clear-window chip
    if (airborne) { await page.evaluate(() => window.__harness.liftP1(70)); await waitFrames(1); }
    const hp0 = (await p2()).health;
    const res = await fireDir(dir);
    check(`${name}: fires handlerSummon cast`, res?.cast === "handlerSummon", `cast=${res?.cast}`);
    const s = await waitSummon(id);
    check(`${name}: spawns summon "${id}"`, !!s, s ? `x=${Math.round(s.x)} lifetime=${s.lifetime}` : "no summon");
    check(`${name}: summon carries its own sheet (${sheet})`, !!s && (s.sheet || "").includes(sheet), `sheet=${s?.sheet}`);
    await waitFrames(2); await crop(name.split(" ")[0]);
    const drop = await waitHit(hp0);
    check(`${name}: shikigami connects (dmg)`, drop > 0, `drop=${drop}`);
    if (exact != null) check(`${name}: damage is ×0.60-scaled (exact ${exact})`, drop === exact, `drop=${drop} expected ${exact}`);
    await waitGrounded(); await waitFrames(30);
  }

  // ── DATA contract: the 6 shikigami templates + shared cast pose ──
  console.log("\n── data contract ──");
  const cast = await page.evaluate(() => window.__harness.charDef("handler")?.animationData?.handlerSummon || null);
  check("shared summon cast pose (handlerSummon) wired to real handler sheet", !!cast && (cast.sheet || "").includes("handler_summon_uniform"), `sheet=${cast?.sheet}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Handler Stage 4: ${PASS} passed, ${FAIL} failed — shots in harness/shots/handler_s4_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
