// harness/beerus.test.mjs
// ---------------------------------------------------------------------------
// Beerus — full-kit build verification (real Chromium, real code path).
//   • sprite gate + glass-cannon stats + portrait (beerus_mugshot.png renders)
//   • movement/state: idle / run / jump / guard-ring / hurt / charge
//   • 5-part intro sequencing (intro1→…→intro5 → idle)
//   • 5 normals connect + damage (up launches, down_air spikes)
//   • 5 specials fire + connect (incl. the two mixed-sheet moves rendering their
//     projectile/effect art SEPARATE from Beerus's character sprite)
//   • Ki Ball ultimate: 3-phase freeze cinematic (charge→fire→impact), guaranteed
//     damage lands only at the impact beat, performed by the LIVE fighter reference
//   • fallback-box sweep: NO exercised action renders the 128² fallback (every action
//     resolves to a beerus_* sheet)
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

// Every action the sweep sees, so we can prove none rendered the 128² fallback.
const seenActions = new Map();   // action -> sheet

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cine = () => page.evaluate(() => window.__harness.beerusUltCine());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) {
  const s = (await stateF()).frame;
  await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 });
}
async function waitGrounded() {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
}
async function record() { const a = await p1(); if (a.action) seenActions.set(a.action, a.spriteSheet || null); return a; }
async function tap(key, hold = 1) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function prep(gap) {
  await waitGrounded();
  // wait until the fighter can actually START a move (canStart = !attacking && !currentMove),
  // else the first special press is silently dropped by the input gate.
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.resetUlt?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}

try {
  // ── SPRITE GATE + STATS ──────────────────────────────────────────────────
  await page.goto(`${base}/index.html?harness=1&p1=beerus`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // 5-part intro (start, don't skip) — assert all five stages play in order.
  section("intro — 5-part sequence in order → idle");
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
  const seen = [];
  for (const v of ["intro1", "intro2", "intro3", "intro4", "intro5"]) {
    const got = await page.waitForFunction(t => window.__harness.introState().p1Variant === t, v, { timeout: 6000, polling: 16 }).then(() => true).catch(() => false);
    if (got) {
      seen.push(v);
      // poll a few frames until the sprite handler's _actionDef reflects the flipped variant's sheet
      await page.waitForFunction(() => (window.__harness.p1().spriteSheet || "").includes("beerus_intro_"), null, { timeout: 2000, polling: 16 }).catch(() => {});
      seenActions.set(v, (await p1()).spriteSheet);
    }
  }
  check("intro plays all 5 stages in order", seen.length === 5, `seen=[${seen.join(",")}]`);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  section("sprite gate + glass-cannon stats");
  const g = await record();
  check("P1 is Beerus", g.key === "beerus", `key=${g.key}`);
  check("renders as sprites (hasSprites)", g.hasSpriteHandler, "");
  check("idle sheet = beerus_idle_u.png", (g.spriteSheet || "").includes("beerus_idle_u"), `sheet=${g.spriteSheet}`);
  check("spriteScale ≈ 1.7", Math.abs((g.spriteScale || 0) - 1.7) < 0.01, `spriteScale=${g.spriteScale}`);
  check("glass-cannon HP = 1000", g.maxHealth === 1000, `HP=${g.maxHealth}`);
  check("God-Ki pool = 170", g.maxEnergy === 170, `EN=${g.maxEnergy}`);

  // ── MOVEMENT / STATE ─────────────────────────────────────────────────────
  section("movement / state");
  await page.keyboard.down("d"); await waitFrames(14); await record(); await page.keyboard.up("d"); await waitFrames(4);
  check("run/walk uses beerus_run_u", (seenActions.get("run") || seenActions.get("walk") || "").includes("beerus_run_u"), "");
  await page.keyboard.down("w"); await waitFrames(3); await page.keyboard.up("w"); await waitFrames(4);
  await record();
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(30); const blk = await record(); await page.keyboard.up("s"); await waitFrames(4);
  check("guard ring holds final frame (idx 5)", blk.action === "guard" && blk.frameIndex === 5, `action=${blk.action} idx=${blk.frameIndex}`);
  await page.evaluate(() => window.__harness.hurtP1(28)); await waitFrames(3); const h = await record();
  check("hurt resolves", h.action === "hurt", `action=${h.action}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);
  await page.keyboard.down("p"); await waitFrames(22); const c = await record(); await page.keyboard.up("p"); await waitFrames(4);
  check("charge resolves", c.action === "charge", `action=${c.action}`);

  // ── NORMALS ──────────────────────────────────────────────────────────────
  section("normals — connect + damage");
  for (const [name, key, gap] of [["light", "j", 46], ["heavy", "k", 48], ["up (launcher)", "i", 44]]) {
    await prep(gap); const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); await record(); await page.keyboard.up(key); await waitFrames(20);
    const after = await p2();
    check(`${name} connects`, hp0 - after.health > 0, `−${(hp0 - after.health).toFixed(0)}`);
    if (key === "i") check("up-attack launches", after.grounded === false || after.vy < 0, `vy=${after.vy.toFixed(1)}`);
    await waitFrames(20);
  }
  await prep(44);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(40)); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await waitFrames(14);
    check("air connects", hp0 - (await p2()).health > 0, `−${(hp0 - (await p2()).health).toFixed(0)}`); }
  await waitGrounded(); await waitFrames(8);
  await prep(30);
  { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(46)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); await record(); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16);
    check("down_air spike connects", hp0 - (await p2()).health > 0, `−${(hp0 - (await p2()).health).toFixed(0)}`); }
  await waitGrounded(); await waitFrames(8);

  // ── SPECIALS ─────────────────────────────────────────────────────────────
  section("specials — fire + connect (mixed-sheet art separated from Beerus)");
  // Ki Blast (neutral)
  await prep(230);
  { const hp0 = (await p2()).health; await tap("l", 2); await waitFrames(4); await record(); await waitFrames(12);
    check("Ki Blast projectile art (ki_blast_fx)", (await projectiles()).some(p => (p.sheet || "").includes("beerus_ki_blast_fx")), "");
    await page.waitForFunction(hh => window.__harness.p2().health < hh, hp0, { timeout: 6000, polling: 16 }).catch(() => {});
    check("Ki Blast connects", hp0 - (await p2()).health > 0, ""); }
  // Downward (D)
  await prep(120);
  { const hp0 = (await p2()).health; await tap("s", 1); await tap("l", 2); await waitFrames(4); await record();
    await page.waitForFunction(hh => window.__harness.p2().health < hh, hp0, { timeout: 6000, polling: 16 }).catch(() => {});
    check("Downward Ki Blast connects", hp0 - (await p2()).health > 0, ""); }
  // Forward Push (D→F) — rings travel forward, separate from body
  await prep(430);
  { await page.evaluate(() => window.__harness.setP2Invuln(600)); await tap("s", 1); await tap("d", 1); await tap("l", 2); await waitFrames(3); await record(); await waitFrames(20);
    const pr = await projectiles(); const ax = (await p1()).x;
    const r1 = pr.find(p => (p.sheet || "").includes("beerus_push_ring1"));
    const r2 = pr.find(p => (p.sheet || "").includes("beerus_push_ring2"));
    check("both push rings travel forward, in front of Beerus", !!r1 && !!r2 && r1.x > ax && r2.x > ax, `r1=${!!r1} r2=${!!r2}`); }
  await prep(150);
  { const hp0 = (await p2()).health; await tap("s", 1); await tap("d", 1); await tap("l", 2);
    await page.waitForFunction(hh => window.__harness.p2().health < hh, hp0, { timeout: 6000, polling: 16 }).catch(() => {});
    check("Forward Push connects", hp0 - (await p2()).health > 0, ""); }
  // Outward (D→B) — self-nova
  await prep(85);
  { const hp0 = (await p2()).health; await tap("s", 1); await tap("a", 1); await tap("l", 2); await waitFrames(3); const o = await record();
    check("Outward self-nova pose", o.action === "outward", `action=${o.action}`); await waitFrames(16);
    check("Outward nova connects", hp0 - (await p2()).health > 0, `−${(hp0 - (await p2()).health).toFixed(0)}`); }
  // Hakai (U) — field at target
  await prep(200);
  { const hp0 = (await p2()).health; await tap("w", 1); await tap("l", 2); await waitFrames(4); const hk = await record();
    check("Hakai held pose", hk.action === "hakai", `action=${hk.action}`); await waitFrames(38);
    check("Hakai field at target (hakai_fx)", (await projectiles()).some(p => (p.sheet || "").includes("beerus_hakai_fx")), "");
    await page.waitForFunction(hh => window.__harness.p2().health < hh, hp0, { timeout: 6000, polling: 16 }).catch(() => {});
    check("Hakai connects (big payoff)", hp0 - (await p2()).health > 100, `−${(hp0 - (await p2()).health).toFixed(0)}`); }

  // ── ULTIMATE — 3-phase cinematic ────────────────────────────────────────
  section("Ki Ball ultimate — 3-phase freeze cinematic + live-fighter ref");
  await prep(150);
  const e0 = (await p1()).energy, uhp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(3);
  let uc = await cine();
  check("cinematic active, caster=beerus", uc.active && uc.casterKey === "beerus", `active=${uc.active} caster=${uc.casterKey}`);
  check("LIVE p1 spent ~150 energy (not a duplicate instance)", e0 - (await p1()).energy >= 140, `Δ=${(e0 - (await p1()).energy).toFixed(0)}`);
  check("caster is the p1-slot fighter", uc.casterSide === "p1", `side=${uc.casterSide}`);
  await waitFrames(30); uc = await cine();
  check("CHARGE phase — not struck, opponent undamaged", uc.phase === "charge" && !uc.struck && (await p2()).health === uhp0, `phase=${uc.phase} struck=${uc.struck}`);
  await record();
  await page.waitForFunction(() => { const s = window.__harness.beerusUltCine(); return !s.active || s.struck; }, null, { timeout: 8000, polling: 16 });
  uc = await cine();
  check("IMPACT at the impact beat (not premature)", uc.frame >= uc.impactFrame, `frame=${uc.frame} impact=${uc.impactFrame}`);
  await page.waitForFunction(() => window.__harness.beerusUltCine().active === false, null, { timeout: 8000, polling: 16 });
  check("Ki Ball big guaranteed damage", uhp0 - (await p2()).health > 200, `−${(uhp0 - (await p2()).health).toFixed(0)}`);
  const bx = (await p1()).x; await page.keyboard.down("d"); await waitFrames(10); await page.keyboard.up("d");
  check("control returns to live p1 (moves post-cinematic)", Math.abs((await p1()).x - bx) > 1, "");

  // ── PORTRAIT ─────────────────────────────────────────────────────────────
  section("portrait — beerus_mugshot.png wired + decodes");
  const portraitOk = await page.evaluate(async () => {
    const src = "./beerus_mugshot.png";
    const img = new Image(); img.src = src;
    try { await img.decode(); } catch (_) {}
    return { src, w: img.naturalWidth, h: img.naturalHeight };
  });
  check("portrait mugshot decodes (720²)", portraitOk.w > 0 && portraitOk.h > 0, `${portraitOk.w}x${portraitOk.h}`);
  const charSel = await page.evaluate(() => window.__harness.showCharSelect("dragon_ball", "training"));
  check("Beerus on the Dragon Ball select roster", (charSel.roster || []).includes("beerus"), `roster=${(charSel.roster || []).join(",")}`);

  // ── FALLBACK-BOX SWEEP ──────────────────────────────────────────────────
  section("fallback-box sweep — every exercised action resolves to a beerus_* sheet (no 128² fallback)");
  const bad = [...seenActions.entries()].filter(([a, s]) => !s || !s.includes("beerus"));
  check(`all ${seenActions.size} exercised actions use a beerus sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, s]) => `${a}:${s}`).join(" | ")}` : `actions=[${[...seenActions.keys()].join(",")}]`);

  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("FATAL", e);
  FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  BEERUS full-kit: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
