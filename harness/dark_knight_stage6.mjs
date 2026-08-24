// harness/dark_knight_stage6.mjs — STAGE 6: Batman NEW VARIANT (dark_knight) ULTIMATE = MECH SUIT.
// A QUICK inline freeze-cinematic SINGLE ATTACK (tailed-beast/Kurama feel, NOT a transform). Verifies:
// (1) the Ultimate casts the wireframe MATERIALIZE pose (dkMechWire), (2) the cinematic drives the mech
// poses (dkMechWire → dkMechIdle → dkMechAttack), (3) it deals a GUARANTEED scaled payoff (~204 EFF) to the
// foe (range-independent), (4) 100 Fury spent, (5) it POWERS DOWN — no lingering form (no _skinAnim, back to
// base Batman). Screenshots the materialize + strike for the clip.
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
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `dark_knight_s6_${name}.png`) }); return; }
  const padX = 200, padTop = r.h * 1.8, padBot = 40;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `dark_knight_s6_${name}_crop.png`), clip });
}
async function waitSheet(sheet, maxF = 30) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=dark_knight`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  console.log("\n── Mech Suit ultimate — quick cinematic single attack ──");
  await waitGrounded();
  // dummy adjacent-ish (the strike is guaranteed / range-independent, but keep it in view)
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + 90); await waitFrames(2);

  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  const spent = en0 - (await p1()).energy;   // read immediately (before the cinematic regens fury)
  check("Ultimate cast succeeds", res.cast === true, `cast=${res.cast}`);
  check("Phase 1 casts wireframe materialize (dkMechWire)", res.castMove === "dkMechWire", `castMove=${res.castMove}`);
  check("spends 100 Fury", spent >= 95, `spent=${spent.toFixed(0)}`);
  const wm = await waitSheet("dark_knight_mechwire", 6);
  check("materialize renders (dark_knight_mechwire)", (wm.spriteSheet || "").includes("dark_knight_mechwire"), `sheet=${wm.spriteSheet}`);
  await crop("materialize");
  const im = await waitSheet("dark_knight_mechidle", 26);
  check("looms as solid mech (dark_knight_mechidle)", (im.spriteSheet || "").includes("dark_knight_mechidle"), `sheet=${im.spriteSheet}`);
  const am = await waitSheet("dark_knight_mechattack", 30);
  check("strike renders (dark_knight_mechattack)", (am.spriteSheet || "").includes("dark_knight_mechattack"), `sheet=${am.spriteSheet}`);
  await crop("strike");
  await waitFrames(20);
  const hp1 = (await p2()).health;
  check("guaranteed payoff ~204 EFF (block-free)", (hp0 - hp1) >= 180 && (hp0 - hp1) <= 230, `−${(hp0 - hp1).toFixed(0)}`);

  console.log("\n── POWERS DOWN — no lingering form ──");
  await waitFrames(30);
  const g = await p1();
  check("NO timed form / _skinAnim (single attack, powered down)", g.dkRageSkin === false && g.currentForm !== "mech", `skin=${g.dkRageSkin} form=${g.currentForm}`);
  check("back to base — idle resolves base sheet", await page.evaluate(async () => { window.__harness.forceAction("idle","p1"); return true; }) && (await (async()=>{ await waitFrames(3); return (await p1()).spriteSheet||""; })()).includes("dark_knight_idle_uniform"), "");
  await page.evaluate(() => window.__harness.forceAction(null, "p1"));

  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("dark_knight")?.animationData || {});
  check("dkMechWire/dkMechIdle/dkMechAttack wired to real sheets + actionScale (loom)",
    (ad.dkMechWire?.sheet || "").includes("dark_knight_mechwire") && (ad.dkMechIdle?.sheet || "").includes("dark_knight_mechidle") && (ad.dkMechAttack?.sheet || "").includes("dark_knight_mechattack"), "");
  const def = await page.evaluate(() => window.__harness.charDef("dark_knight"));
  check("ultimate declared (Mech Suit, cost 100)", def?.ultimate?.cost === 100 && /Mech/i.test(def?.ultimate?.name || ""), `ult=${def?.ultimate?.name}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} dark_knight Stage 6: ${PASS} passed, ${FAIL} failed — shots in harness/shots/dark_knight_s6_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
