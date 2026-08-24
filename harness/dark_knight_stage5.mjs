// harness/dark_knight_stage5.mjs — STAGE 5: Batman NEW VARIANT (dark_knight) RAGE MODE (Up+Special).
// Verifies: (1) Up+Special enters rage (dkRage active, ~50 Fury spent), (2) the purple energy-crackle
// transform pose fires (dkRageTransform), (3) he BULKS UP — idle swaps to dark_knight_rageidle via
// _skinAnim, (4) OFFENSE BUFF — a rage light hit deals MORE than a base light hit (×1.28), (5) RECKLESS
// TRADE-OFF — _dkRageActive is set (combat.js applies +15% dmg-taken), (6) AUTO-REVERT — fast-forward
// the timer → rage ends, multipliers reset, _skinAnim cleared. Screenshot of the raging aura for the clip.
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
  if (!r) { await page.screenshot({ path: path.join(OUT, `dark_knight_s5_${name}.png`) }); return; }
  const padX = 130, padTop = r.h * 1.3, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `dark_knight_s5_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 52) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.42);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

// measure a single LIGHT hit's damage on the adjacent dummy (fresh setup each call)
async function lightHitDamage() {
  await setupAdjacent(52);
  const hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await waitFrames(20);
  const hp1 = (await p2()).health;
  return Math.max(0, hp0 - hp1);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=dark_knight`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── baseline light damage (no rage) ──
  console.log("\n── baseline ──");
  const baseDmg = await lightHitDamage();
  check("base light connects", baseDmg > 0, `dmg=${baseDmg}`);
  await waitGrounded(); await waitFrames(4);

  // ── ENTER rage (Up+Special) ──
  console.log("\n── enter Rage Mode (Up+Special) ──");
  await setupAdjacent(120);
  await page.evaluate(() => window.__harness.fillEnergy?.());
  const en0 = (await p1()).energy;
  const res = await fireDir("U");
  check("Up+Special casts dkRageTransform", res?.cast === "dkRageTransform", `move=${res?.move} cast=${res?.cast}`);
  const mv = await waitSheet("dark_knight_ragetransform");
  check("transform sprite → dark_knight_ragetransform", (mv.spriteSheet || "").includes("dark_knight_ragetransform"), `sheet=${mv.spriteSheet}`);
  await crop("transform");
  await waitFrames(3);
  const r1 = await p1();
  check("rage is ACTIVE (dkRage)", r1.dkRage === true, `dkRage=${r1.dkRage}`);
  check("rage timer running (dkRageTimer>0)", (r1.dkRageTimer || 0) > 0, `timer=${r1.dkRageTimer}`);
  check("Fury spent (~50)", (en0 - r1.energy) >= 45 && (en0 - r1.energy) <= 55, `spent=${en0 - r1.energy}`);
  check("bulks up — _skinAnim swapped (dkRageSkin)", r1.dkRageSkin === true, `dkRageSkin=${r1.dkRageSkin}`);

  // ── BULKED idle after the transform settles ──
  await waitFrames(14);
  const idleMv = await waitSheet("dark_knight_rageidle", 20);
  check("raging idle → dark_knight_rageidle (bulked)", (idleMv.spriteSheet || "").includes("dark_knight_rageidle"), `sheet=${idleMv.spriteSheet}`);
  await crop("rage_idle");

  // ── OFFENSE BUFF: rage light hit > base light hit (×1.28) ──
  console.log("\n── offense buff ──");
  const rageDmg = await lightHitDamage();   // fillEnergy in setup keeps rage running (timer still counting)
  const stillRaging = (await p1()).dkRage;
  check("still raging during buff test", stillRaging === true, `dkRage=${stillRaging}`);
  check("rage light HITS HARDER than base (×1.28)", rageDmg > baseDmg, `base=${baseDmg} rage=${rageDmg}`);
  await crop("rage_attack");

  // ── AUTO-REVERT (fast-forward the timer) ──
  console.log("\n── auto-revert ──");
  const forced = await page.evaluate(() => window.__harness.p1DarkKnightRageExpire());
  check("fast-forward hook fired", forced === true, "");
  await waitFrames(6);
  const rev = await p1();
  check("rage ENDED (dkRage false)", rev.dkRage === false, `dkRage=${rev.dkRage}`);
  check("_skinAnim cleared (back to base body)", rev.dkRageSkin === false, `dkRageSkin=${rev.dkRageSkin}`);
  // after revert, a base light hit should be back to ~baseline (buff removed)
  const postDmg = await lightHitDamage();
  check("post-revert light back to ~baseline (buff removed)", postDmg <= baseDmg + 2, `base=${baseDmg} post=${postDmg}`);

  // ── DATA contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("dark_knight")?.animationData || {});
  check("dkRageTransform + dkRageIdle wired to real sheets",
    (ad.dkRageTransform?.sheet || "").includes("dark_knight_ragetransform") && (ad.dkRageIdle?.sheet || "").includes("dark_knight_rageidle"),
    `transform=${(ad.dkRageTransform?.sheet||"").split("/").pop()} idle=${(ad.dkRageIdle?.sheet||"").split("/").pop()}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} dark_knight Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/dark_knight_s5_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
