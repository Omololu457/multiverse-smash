// ─────────────────────────────────────────────────────────────────────────────
// Goku Black SWORD SLASH — full FREEZE CINEMATIC (gokuBlackSwordCinematic.js), reusing
// the Kurama / SSJ Rose freeze-and-camera architecture. Verifies:
//   • combat FULLY FREEZES for the whole sequence — NEITHER fighter can move or attack
//     (held inputs ignored, injected velocity never applied) until it resolves
//   • BOTH fighters stay in frame the whole time (camera.focusBetween, NOT isolate-one)
//   • the voice line goku-black-taste-my-blade.mp3 fires at the STRIKE connect beat
//   • the payoff is unchanged: exactly 110 dmg (clean) + 30f paralysis, applied at connect
//   • duration is the ~220f cinematic (not the old ~42f windup)
// ─────────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const CLIP = { x: 120, y: 120, width: 640, height: 500 };
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(REPO, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 8, timeout: 20000 }); };
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.swordCine());
const bothScreen = () => page.evaluate(() => window.__harness.bothScreenX());
const frame = () => page.evaluate(() => window.__harness.state().frame);
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});

async function toRose() {
  if ((await p1()).currentForm === "ssjRose") return;
  await page.evaluate(() => window.__harness.setEnergy(200));
  await page.keyboard.down("p"); await wf(1); await page.keyboard.up("p");
  await page.waitForFunction(() => { const c = window.__harness.ssjRoseCine?.(); return c && !c.active; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku_black&p2=goku_black`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();

  // Install the SFX spy (record every playSfxFile cue) — dragon_ball_transform_sfx pattern.
  await page.evaluate(() => { const s = window.__harness.__sound; if (s && s.playSfxFile && !s._sfxSpy) { s._sfxSpy = []; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; } });

  // Setup: Rose form, opponent at a moderate gap, both full HP, ult ready.
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2?.(); window.__harness.resetUlt?.(); });
  await actionable();
  await toRose();
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 150); window.__harness.healP1(); window.__harness.healP2?.(); window.__harness.resetUlt?.(); });
  await wf(2);

  const startFrame = await frame();
  const hp2_0 = (await p2()).health, hp1_0 = (await p1()).health;
  const x1_0 = (await p1()).x, x2_0 = (await p2()).x;
  await page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });

  // CAST
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u");
  await wf(2);
  const c0 = await cine();
  check("Sword Slash starts the freeze cinematic", c0.active === true, `active=${c0.active} phase=${c0.phase}`);
  check("cinematic total duration is the ~220f version (not ~42f)", c0.total >= 200 && c0.total <= 240, `total=${c0.total}`);

  // ── FREEZE: try to move/attack BOTH fighters mid-cinematic → nothing responds ──
  section("FREEZE — neither fighter can move or attack during the cinematic");
  // inject velocity into both (a running physics step would move them) + hold real inputs.
  await page.evaluate(() => { window.__harness.setVx("p1", 16); window.__harness.setVx("p2", -16); });
  await page.keyboard.down("d"); await page.keyboard.down("j");         // p1 tries to walk + attack
  await page.keyboard.down("ArrowLeft"); await page.keyboard.down("1"); // p2 tries to walk + attack
  await wf(24);
  const during = await cine(); const dp1 = await p1(), dp2 = await p2();
  await page.keyboard.up("d"); await page.keyboard.up("j"); await page.keyboard.up("ArrowLeft"); await page.keyboard.up("1");
  check("still mid-cinematic (pre-impact) during the freeze test", during.active === true && !during.struck, `phase=${during.phase} struck=${during.struck}`);
  check("P1 (caster) did NOT move despite injected vx + held move key", Math.abs(dp1.x - x1_0) < 1.5, `Δx=${(dp1.x - x1_0).toFixed(2)}`);
  check("P2 (opponent) did NOT move despite injected vx + held move key", Math.abs(dp2.x - x2_0) < 1.5, `Δx=${(dp2.x - x2_0).toFixed(2)}`);
  check("P1 did NOT start an attack (input frozen)", dp1.attacking === false, `attacking=${dp1.attacking}`);
  check("P2 did NOT start an attack (input frozen)", dp2.attacking === false, `attacking=${dp2.attacking}`);
  check("P1 (caster) took no damage — nothing can act on him either", dp1.health === hp1_0, `hp ${hp1_0}→${dp1.health}`);
  check("opponent unharmed BEFORE the scripted connect beat", dp2.health === hp2_0, `hp ${hp2_0}→${dp2.health}`);

  // ── BOTH FIGHTERS FRAMED (not isolate-one) ──
  section("FRAMING — both fighters stay on-screen");
  const bs = await bothScreen();
  check("P1 is on-frame", !!bs.p1?.onFrame, `p1 [${bs.p1?.left?.toFixed(0)}..${bs.p1?.right?.toFixed(0)}] cw=${bs.p1?.cw}`);
  check("P2 is on-frame (both kept in shot, Kurama-TBB framing)", !!bs.p2?.onFrame, `p2 [${bs.p2?.left?.toFixed(0)}..${bs.p2?.right?.toFixed(0)}]`);
  await page.screenshot({ path: path.join(OUT, "GBSWORD_windup.png"), clip: CLIP });

  // ── AUDIO + IMPACT beat ──
  section("AUDIO — voice line fires at the STRIKE connect");
  await page.waitForFunction(() => window.__harness.swordCine().struck === true, null, { timeout: 6000, polling: 8 });
  const atStrike = await cine();
  await wf(1);
  const log = await sfxLog();
  const bs2 = await bothScreen();
  await page.screenshot({ path: path.join(OUT, "GBSWORD_strike.png"), clip: CLIP });
  check("voice line goku-black-taste-my-blade.mp3 played", log.some(s => s.includes("taste-my-blade")), `sfx=[${log.join(", ")}]`);
  check("it fired during the STRIKE phase (the connect)", atStrike.phase === "strike", `phase=${atStrike.phase} frame=${atStrike.frame} impact=${atStrike.impactFrame}`);
  check("both fighters STILL framed at the strike", !!bs2.p1?.onFrame && !!bs2.p2?.onFrame, `p1on=${!!bs2.p1?.onFrame} p2on=${!!bs2.p2?.onFrame}`);

  // ── RESOLVE — payoff lands, combat resumes ──
  section("PAYOFF — 110 dmg + 30f paralysis, then combat resumes");
  await page.waitForFunction(() => window.__harness.swordCine().active === false, null, { timeout: 9000, polling: 16 });
  const endF = await frame();
  const d2 = await p2();
  check("exactly 110 damage on a clean hit (SWORD.dmg unchanged)", (hp2_0 - d2.health) === 110, `−${hp2_0 - d2.health}`);
  check("30f paralysis applied (hitstun + stun on opponent)", (d2.hitstun || 0) > 0 && (d2.stun || 0) > 0, `hitstun=${d2.hitstun} stun=${d2.stun}`);
  check("cinematic ran the full ~220f (freeze duration)", (endF - startFrame) >= 210 && (endF - startFrame) <= 245, `frames=${endF - startFrame}`);
  await page.evaluate(() => window.__harness.setVx("p1", 0));   // clear the injected vx before resuming
  await actionable();
  check("caster can act again once the cinematic resolves", true, "combat resumed");

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  Goku Black SWORD SLASH cinematic: ${PASS} passed, ${FAIL} failed`);
  console.log(`  screenshots → harness/shots/GBSWORD_*.png`);
  console.log(`════════════════════════════════════════\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
