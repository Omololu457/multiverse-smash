// harness/dark_knight_stage6.mjs — STAGE 6: Batman NEW VARIANT (dark_knight) ULTIMATE = MECH SUIT.
// A 2-phase timed heavy-FORM (Kurapika/Baki architecture). Verifies: (1) the Ultimate casts the wireframe
// MATERIALIZE cinematic (dkMechWire), (2) enters the MECH FORM (dkMech + currentForm "mech", 100 Fury spent,
// dmg ×1.5 / def ×1.5 / spd ×0.85), (3) the BODY swaps to the giant mech — idle→dark_knight_mechidle,
// strikes→dark_knight_mechattack (via _skinAnim), (4) OFFENSE BUFF — a mech light hit deals MORE than base,
// (5) timer ticks down, (6) AUTO-REVERT — fast-forward → powers down, multipliers reset, _skinAnim cleared,
// art back to base. Screenshots of the materialize + mech form for the clip.
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
  const padX = 150, padTop = r.h * 1.35, padBot = 30;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `dark_knight_s6_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.40);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function waitSheet(sheet, maxF = 26) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(sheet)); f++) { await waitFrames(1); mv = await p1(); } return mv; }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);

async function lightHitDamage() {
  await setupAdjacent(60);
  const hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await waitFrames(22);
  const hp1 = (await p2()).health;
  return Math.max(0, hp0 - hp1);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=dark_knight`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── baseline light (no mech) ──
  console.log("\n── baseline ──");
  const baseDmg = await lightHitDamage();
  check("base light connects", baseDmg > 0, `dmg=${baseDmg}`);
  await waitGrounded(); await waitFrames(4);

  // ── ENTER Mech Suit (Ultimate) ──
  console.log("\n── enter Mech Suit (Ultimate) ──");
  await waitGrounded();
  await page.evaluate(() => window.__harness.fillEnergy());
  const en0 = (await p1()).energy;
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  check("Ultimate cast succeeds", res.cast === true, `cast=${res.cast}`);
  check("Phase 1 casts wireframe materialize (dkMechWire)", res.castMove === "dkMechWire", `castMove=${res.castMove}`);
  const wm = await waitSheet("dark_knight_mechwire");
  check("materialize sprite → dark_knight_mechwire", (wm.spriteSheet || "").includes("dark_knight_mechwire"), `sheet=${wm.spriteSheet}`);
  await crop("materialize");
  await waitFrames(3);
  let g = await p1();
  check("enters MECH FORM (dkMech + currentForm 'mech')", g.dkMech === true && g.currentForm === "mech", `dkMech=${g.dkMech} form=${g.currentForm}`);
  check("spends 100 Fury (minus a few frames' regen)", en0 - g.energy >= 95, `energy ${en0.toFixed(0)}→${g.energy.toFixed(0)}`);
  check("damage buff applied (×1.5)", Math.abs((g.damageMultiplier || 0) - 1.5) < 0.001, `dmgMult=${g.damageMultiplier}`);
  check("mech timer running (>0)", (g.dkMechTimer || 0) > 0, `timer=${g.dkMechTimer}`);
  check("body swapped (_skinAnim set)", g.dkRageSkin === true, `skin=${g.dkRageSkin}`);

  // ── Phase 2: giant mech body ──
  console.log("\n── Phase 2: mech body swap ──");
  await waitFrames(28);   // let the materialize cinematic finish → mech idle
  const im = await waitSheet("dark_knight_mechidle", 24);
  check("mech idle → dark_knight_mechidle", (im.spriteSheet || "").includes("dark_knight_mechidle"), `sheet=${im.spriteSheet}`);
  await crop("mech_idle");
  await force("light"); const lm = await waitSheet("dark_knight_mechattack");
  check("mech strike → dark_knight_mechattack", (lm.spriteSheet || "").includes("dark_knight_mechattack"), `sheet=${lm.spriteSheet}`);
  await crop("mech_attack"); await force(null); await waitFrames(2);

  // ── offense buff live ──
  console.log("\n── offense buff ──");
  const mechDmg = await lightHitDamage();
  check("still in mech form during buff test", (await p1()).dkMech === true, "");
  check("mech light HITS HARDER than base (×1.5)", mechDmg > baseDmg, `base=${baseDmg} mech=${mechDmg}`);

  // ── timer ticks ──
  const tA = (await p1()).dkMechTimer; await waitFrames(20); const tB = (await p1()).dkMechTimer;
  check("mech timer decrements over time", tB < tA, `timer ${tA} → ${tB}`);

  // ── AUTO-REVERT ──
  console.log("\n── auto-revert ──");
  const forced = await page.evaluate(() => window.__harness.p1DarkKnightMechExpire());
  check("fast-forward hook fired", forced === true, "");
  await waitFrames(6);
  g = await p1();
  check("mech ENDED (dkMech false + form base)", g.dkMech === false && g.currentForm === "base", `dkMech=${g.dkMech} form=${g.currentForm}`);
  check("buffs removed (dmgMult = 1)", Math.abs((g.damageMultiplier || 0) - 1) < 0.001, `dmgMult=${g.damageMultiplier}`);
  check("_skinAnim cleared (back to base body)", g.dkRageSkin === false, `skin=${g.dkRageSkin}`);
  const rm = await waitSheet("dark_knight_idle_uniform", 12);
  check("art restored to base idle after power-down", (rm.spriteSheet || "").includes("dark_knight_idle_uniform"), `sheet=${rm.spriteSheet}`);

  // ── data contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("dark_knight")?.animationData || {});
  check("dkMechWire/dkMechIdle/dkMechAttack wired to real sheets",
    (ad.dkMechWire?.sheet || "").includes("dark_knight_mechwire") && (ad.dkMechIdle?.sheet || "").includes("dark_knight_mechidle") && (ad.dkMechAttack?.sheet || "").includes("dark_knight_mechattack"), "");
  const def = await page.evaluate(() => window.__harness.charDef("dark_knight"));
  check("ultimate declared (Mech Suit, cost 100)", def?.ultimate?.cost === 100 && /Mech/i.test(def?.ultimate?.name || ""), `ult=${def?.ultimate?.name}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} dark_knight Stage 6: ${PASS} passed, ${FAIL} failed — shots in harness/shots/dark_knight_s6_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
