// harness/dark_knight.test.mjs — CANONICAL Batman NEW VARIANT (rosterKey "dark_knight", DC) suite.
// SEPARATE entry from the old `batman` (untouched). Single-entry registration + integrity + FULL-KIT gate
// across Stages 1–6: static sheet/portrait sweep, sprite gate / stats / "Fury" energyType, a RUNTIME
// fallback-box sweep over EVERY animationData action (no 128² box), honest-reuse assertions, and live
// spot-checks (a normal + a special connect, Rage Mode enters via Up+Special, Mech Suit ultimate enters).
// Built from a single 5120×2880 TRUE-ALPHA sheet via tools/reslice_dark_knight.py.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SWEEP (no browser) — every declared sheet + portrait is a real, non-empty file. ──
section("STATIC — every animationData sheet + portrait exists on disk");
const dk = characters.dark_knight;
const ad = dk.animationData;
check("dark_knight is a SEPARATE entry from old batman", !!dk && !!characters.batman && dk !== characters.batman && dk.rosterKey === "dark_knight" && dk.name === "Batman", `name=${dk?.name}`);
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
const missing = [];
for (const s of [...sheets, dk.portrait]) {
  const p = path.join(ROOT, s.replace("./", ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check("all animationData sheets + portrait exist on disk (>128B)", missing.length === 0, missing.join(" | "));
check("every sheet is a dark_knight_ file (no cross-char borrow)", sheets.every(s => s.includes("dark_knight_")), sheets.filter(s => !s.includes("dark_knight_")).join(" | "));

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function adjacent(gap = 56) { await grounded(); const arena = await page.evaluate(() => window.__harness.arena()); const midX = Math.round(arena.left + arena.width * 0.4); await page.evaluate(x => window.__harness.setP1X(x), midX); await wf(1); const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap); await wf(2); }
async function waitSheet(sheet, maxF = 22) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await wf(1); mv = await p1(); } return mv; }
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=dark_knight`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(5);

  section("sprite gate + stats + Fury");
  const g = await p1();
  check("P1 is dark_knight, renders as sprites", g.key === "dark_knight" && g.hasSpriteHandler, `key=${g.key}`);
  check("idle → dark_knight_idle_uniform", (g.spriteSheet || "").includes("dark_knight_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("HP 1150 / EN 100 / scale 0.9", g.maxHealth === 1150 && g.maxEnergy === 100 && Math.abs((g.spriteScale || 0) - 0.9) < 0.01, `HP=${g.maxHealth} EN=${g.maxEnergy} sc=${g.spriteScale}`);
  const def = await page.evaluate(() => window.__harness.charDef("dark_knight"));
  check("universe dc / energyType fury", def?.universe === "dc" && def?.traits?.energyType === "fury", `u=${def?.universe} e=${def?.traits?.energyType}`);
  check("ultimate declared (Mech Suit, 100)", def?.ultimate?.cost === 100 && /Mech/i.test(def?.ultimate?.name || ""), `ult=${def?.ultimate?.name}`);

  section("live spot-checks — a normal + a special connect");
  await adjacent(52); let hp0 = (await p2()).health;
  await page.keyboard.down("k"); await waitSheet("dark_knight_heavy_uniform"); await page.keyboard.up("k"); await wf(24);
  check("heavy connects", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  await grounded(); await wf(6);
  await adjacent(120); hp0 = (await p2()).health;
  const cres = await fireDir(null);
  check("neutral special = Crescent Chain (dkCrescent)", cres?.move === "dkCrescent", `move=${cres?.move}`);
  await wf(24);
  check("Crescent Chain connects", (await p2()).health < hp0, "");
  await grounded(); await wf(6);

  section("Rage Mode (Up+Special) + Mech Suit (Ultimate) enter");
  await adjacent(120); await page.evaluate(() => window.__harness.fillEnergy());
  const rg = await fireDir("U");
  check("Up+Special → dkRageTransform cast", rg?.cast === "dkRageTransform", `cast=${rg?.cast}`);
  await wf(4); check("rage ACTIVE", (await p1()).dkRage === true, "");
  await page.evaluate(() => window.__harness.p1DarkKnightRageExpire()); await wf(6);
  check("rage auto-reverts", (await p1()).dkRage === false, "");
  await grounded(); await page.evaluate(() => window.__harness.fillEnergy());
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  check("Ultimate → Mech Suit (dkMechWire materialize)", ult?.cast === true && ult?.castMove === "dkMechWire", `cast=${ult?.cast} m=${ult?.castMove}`);
  await wf(4); const mg = await p1();
  check("mech FORM active (currentForm mech)", mg.dkMech === true && mg.currentForm === "mech", `form=${mg.currentForm}`);
  await page.evaluate(() => window.__harness.p1DarkKnightMechExpire()); await wf(6);
  check("mech auto-reverts to base", (await p1()).dkMech === false && (await p1()).currentForm === "base", "");
  await grounded(); await wf(4);

  section("honest reuse assertions (flagged in characters.js)");
  check("run + dash REUSE walk", ad.run.sheet === ad.walk.sheet && ad.dash.sheet === ad.walk.sheet, "");
  check("jump + fall REUSE glide", ad.jump.sheet === ad.glide.sheet && ad.fall.sheet === ad.glide.sheet, "");
  check("guard + hurt + getup REUSE idle", ad.guard.sheet === ad.idle.sheet && ad.hurt.sheet === ad.idle.sheet && ad.getup.sheet === ad.idle.sheet, "");
  check("up REUSES heavy (no uppercut art)", ad.up.sheet === ad.heavy.sheet, "");
  check("down_air REUSES air", ad.down_air.sheet === ad.air.sheet, "");
  check("lose REUSES knockdown", ad.lose.sheet === ad.knockdown.sheet, "");
  check("win is its own repurposed pose", (ad.win.sheet || "").includes("dark_knight_win_uniform"), "");

  section("fallback-box sweep — EVERY animationData action renders a real dark_knight_ sheet (no 128² box)");
  const boxes = [];
  for (const act of Object.keys(ad)) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("dark_knight_")) boxes.push(`${act}:${r.spriteSheet || "null"}`); await force(null); await wf(1); }
  check(`all ${Object.keys(ad).length} actions resolve a real dark_knight_ sheet`, boxes.length === 0, boxes.join(" | "));

  section("old batman UNTOUCHED");
  const oldB = await page.evaluate(() => window.__harness.charDef("batman"));
  check("old batman still a separate DC entry with its own art", !!oldB && oldB.universe === "dc" && (oldB.animationData?.idle?.sheet || "").includes("batman_idle") && !(oldB.animationData?.idle?.sheet || "").includes("dark_knight"), "");

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally {
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} dark_knight CANONICAL: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close(); process.exit(FAIL ? 1 : 0);
}
