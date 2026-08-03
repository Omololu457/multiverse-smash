// harness/chrollo.test.mjs — CANONICAL full-kit test for Chrollo Lucilfer.
// Covers: registration/stats/portrait · movement/state · 5 normals · Blade Rush chain (+interrupt) ·
// 2 specials · distinct-move UNLOCK logic (mock sequence + dedup) · Skill Hunter FULL cycle on BOTH
// reversion paths (manual re-press + timer timeout) · duplicate-render "two instances" probe on the
// transform cinematic · fallback-box sweep · no-JS-error integrity. Opponent = Naruto (a rich kit to steal).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const seen = new Map();

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const sh = () => page.evaluate(() => window.__harness.shState("p1"));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function rec() { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
// Earn the Skill Hunter unlock via 3 distinct mock opponent hits, then activate + let the cinematic resolve.
async function earnAndActivate() {
  await page.evaluate(() => { window.__harness.shLandMove("light"); window.__harness.shLandMove("heavy"); window.__harness.shLandMove("up"); });
  await prep(120);
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => { const x = window.__harness.shState("p1"); return x.active && !x.cineActive; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=chrollo&p2=naruto`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── REGISTRATION / STATS / PORTRAIT ──
  section("registration + stats + portrait");
  const g = await rec();
  check("P1 is Chrollo", g.key === "chrollo", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.9", Math.abs((g.spriteScale || 0) - 1.9) < 0.001, `${g.spriteScale}`);
  check("HP 1080 / EN 130", g.maxHealth === 1080 && g.maxEnergy === 130, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  check("portrait wired to chrollo_portrait.png", (await page.evaluate(() => window.__harness.charPortrait("chrollo")) || "").includes("chrollo_portrait"), "");
  const cs = await page.evaluate(() => window.__harness.showCharSelect("hunter_x_hunter"));
  check("on the Hunter x Hunter roster", (cs.roster || []).includes("chrollo"), `roster=${(cs.roster || []).join(",")}`);
  await page.evaluate(() => window.__harness.boot()); await waitFrames(6);

  // ── MOVEMENT / STATE ──
  section("movement / state");
  await waitGrounded(); await waitFrames(6); const idle = await rec();
  check("idle → chrollo_idle_uniform", (idle.spriteSheet || "").includes("chrollo_idle_uniform"), `${(idle.spriteSheet||"").split("/").pop()}`);
  await page.keyboard.down("d"); await waitFrames(14); await rec(); await page.keyboard.up("d"); await waitFrames(4);
  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(3); await rec(); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__harness.p1().vy > 5, null, { timeout: 4000, polling: 16 }).catch(() => {}); await rec();
  await waitGrounded();
  await page.keyboard.down("s"); await waitFrames(14); await rec(); await page.keyboard.up("s"); await waitFrames(4);
  await page.evaluate(() => window.__harness.hurtP1(26)); await waitFrames(3); await rec(); await page.evaluate(() => window.__harness.healP1());
  check("run/jump/guard/hurt all resolve to chrollo sheets", ["walk", "jump", "guard", "hurt"].every(a => (seen.get(a) || "").includes("chrollo")), `[${["walk","jump","guard","hurt"].map(a=>a+":"+((seen.get(a)||"none").split("/").pop())).join(" ")}]`);

  // ── 5 NORMALS ──
  section("5 normals connect");
  for (const [name, key, gap] of [["light", "j", 46], ["heavy", "k", 52], ["up", "i", 48]]) {
    await prep(gap); const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); await rec(); await page.keyboard.up(key); await waitFrames(18);
    check(`${name} connects`, hp0 - (await p2()).health > 0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  }
  await prep(44); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(42)); await page.keyboard.down("j"); await waitFrames(3); await rec(); await page.keyboard.up("j"); await waitFrames(14); check("air connects", hp0 - (await p2()).health > 0, ""); }
  await waitGrounded();
  await prep(32); { const hp0 = (await p2()).health; await page.evaluate(() => window.__harness.liftP1(48)); await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(3); await rec(); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(16); check("down_air connects", hp0 - (await p2()).health > 0, ""); }
  await waitGrounded();

  // ── BLADE RUSH CHAIN (+ interrupt) ──
  section("Blade Rush chain — opener → cancel-on-hit → finisher, + whiff interrupt");
  await prep(44); let hp0 = (await p2()).health;
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2);
  await page.keyboard.up("k"); await page.keyboard.up("d");   // release forward too → re-taps are PURE rekka continues (never re-open a fresh Fwd+Heavy)
  const openActs = new Set(); const chainActs = new Set();
  // Blanket the opener's whole recovery with fresh neutral-Heavy EDGES (down 1f / up 1f) so one lands in
  // the rekka window regardless of the opponent's hitstun/spacing timing. Pure Heavy (no forward) = only
  // the rekka CONTINUE can fire, never a fresh opener.
  for (let i = 0; i < 18 && !chainActs.has("chComboFin"); i++) {
    await page.keyboard.down("k"); const a = await rec(); if (a.action) { openActs.add(a.action); chainActs.add(a.action); } await waitFrames(1);
    await page.keyboard.up("k"); await waitFrames(1);
  }
  const chainDmg = hp0 - (await p2()).health;
  // The finisher (chComboFin) is a 2-3 frame beat that per-iteration sampling can miss, so prove the
  // cancel-on-hit CHAIN by its damage: opener fires (chCombo1) AND total damage exceeds a lone opener
  // (~30) by the finisher's worth (~48) → the string continued. (chComboFin action-label also captured
  // when sampling aligns.) The whiff test below proves the string does NOT continue without a connect.
  check("opener chCombo1 fires + cancel-on-hit finisher lands", openActs.has("chCombo1") && chainDmg > 55, `open=[${[...openActs]}] chainDmg=−${chainDmg} finisherSeen=${chainActs.has("chComboFin")}`);
  check("chain damage exceeds a single opener (~30)", chainDmg > 55, `−${chainDmg}`);
  await waitGrounded();
  await prep(430); const wp0 = (await p2()).health;   // whiff → must NOT chain
  await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(4);
  const wActs = new Set(); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); for (let i = 0; i < 6; i++) { const a = await rec(); if (a.action) wActs.add(a.action); await waitFrames(1); }
  await page.keyboard.up("d");
  check("whiffed opener does NOT chain + deals no damage", !wActs.has("chComboFin") && Math.abs(wp0 - (await p2()).health) < 1, `acts=[${[...wActs]}] Δ=${(wp0-(await p2()).health).toFixed(0)}`);
  await waitGrounded();

  // ── SPECIALS ──
  section("specials — Nen Bolt projectile + Blade Lunge");
  await prep(150); const nH0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => window.__harness.p2().health < window.__harness.p2().maxHealth, null, { timeout: 3000, polling: 16 }).catch(() => {});
  check("Nen Bolt (neutral) connects via projectile", nH0 - (await p2()).health > 0, `−${(nH0 - (await p2()).health).toFixed(0)}`);
  await page.evaluate(() => window.__harness.clearProjectiles?.());
  await prep(90); const bH0 = (await p2()).health;
  await page.keyboard.down("s"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(8); await rec(); await page.keyboard.up("s");
  check("Blade Lunge (Down+Special) connects", bH0 - (await p2()).health > 0, `−${(bH0 - (await p2()).health).toFixed(0)}`);
  await waitGrounded();

  // ── DISTINCT-MOVE UNLOCK LOGIC (explicit mock sequence) ──
  section("Skill Hunter unlock logic — 3 DISTINCT moves (dedup)");
  await page.evaluate(() => window.__harness.boot()); await waitFrames(4);   // fresh (unlock resets)
  let s = await sh();
  check("fresh: locked, 0 distinct", !s.unlocked && s.distinct === 0, `distinct=${s.distinct}`);
  await page.evaluate(() => { window.__harness.shLandMove("light"); window.__harness.shLandMove("light"); });
  check("same move ×2 = 1 distinct (Set dedup)", (await sh()).distinct === 1, "");
  await page.evaluate(() => window.__harness.shLandMove("rasengan"));
  check("2 distinct → still locked", !(await sh()).unlocked, "");
  await page.evaluate(() => window.__harness.shLandMove("chidori"));
  s = await sh();
  check("3 distinct → unlocked", s.unlocked && s.distinct === 3, `distinct=${s.distinct}`);

  // ── SKILL HUNTER — full cycle, MANUAL-END path ──
  section("Skill Hunter — activation cinematic + copied form + MANUAL end");
  await earnAndActivate();
  s = await sh();
  check("copied form active, rosterKey=naruto", s.active && s.rosterKey === "naruto", `active=${s.active} key=${s.rosterKey}`);
  check("30s timer running", s.timer > 1500 && s.timer <= 1800, `timer=${s.timer}`);
  check("stolen ultimate is now Chrollo's", /kurama|rasen|bijuu|tailed|avatar/i.test(s.ultName || ""), `ult=${s.ultName}`);
  // DUPLICATE-RENDER PROBE: over N frames the copied body must draw exactly ONCE per frame.
  const f0 = (await stateF()).frame, d0 = await page.evaluate(() => window.__harness.sprDraws("p1"));
  await waitFrames(12);
  const f1 = (await stateF()).frame, d1 = await page.evaluate(() => window.__harness.sprDraws("p1"));
  const draws = d1 - d0, frames = f1 - f0;
  // ~1 draw per frame (allow ±2 for sampling phase). A true "two instances" bug would be ~2× frames.
  check("no duplicate render — ~1 draw/frame during copied form (not 2×)", Math.abs(draws - frames) <= 2 && draws < frames * 2 - 2, `draws=${draws} frames=${frames}`);
  // copied move connects
  await prep(56); let cH0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); const cm = await rec(); await page.keyboard.up("j"); await waitFrames(14);
  check("copied Naruto normal connects + uses a naruto sheet", cH0 - (await p2()).health > 0 && (cm.spriteSheet || "").includes("naruto"), `sheet=${(cm.spriteSheet||"").split("/").pop()}`);
  // MANUAL end (drain energy → the Ultimate press reverts instead of firing the stolen ult)
  await waitGrounded();
  await page.evaluate(() => window.__harness.setP1Energy(0));
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u"); await waitFrames(4);
  s = await sh();
  check("MANUAL end reverts to Chrollo", !s.active && s.rosterKey === "chrollo", `active=${s.active} key=${s.rosterKey}`);
  check("unlock consumed on revert", !s.unlocked && s.distinct === 0, `unlocked=${s.unlocked} distinct=${s.distinct}`);
  check("Chrollo renders his own sheet again", (await rec()).spriteSheet?.includes("chrollo"), "");

  // ── SKILL HUNTER — TIMEOUT reversion path ──
  section("Skill Hunter — TIMEOUT reversion path (timer → 0)");
  await earnAndActivate();
  check("re-activated after re-earning the unlock", (await sh()).active, "");
  await page.evaluate(() => window.__harness.shSetTimer(3));   // fast-forward to the edge of the 30s window
  await waitFrames(8);
  s = await sh();
  check("TIMEOUT auto-reverts to Chrollo", !s.active && s.rosterKey === "chrollo", `active=${s.active} key=${s.rosterKey}`);
  check("no giant/buff state leaked after timeout revert", !(await p1())._canvasHeightFrac, "");

  // ── FALLBACK-BOX SWEEP + INTEGRITY ──
  section("fallback-box sweep + integrity");
  const bad = [...seen.entries()].filter(([a, sheet]) => !sheet || (!sheet.includes("chrollo") && !sheet.includes("naruto")));
  check(`all ${seen.size} exercised actions use a chrollo (or copied-naruto) sheet`, bad.length === 0, bad.length ? `offenders=${bad.map(([a, sh]) => `${a}:${sh}`).join(" | ")}` : `[${[...seen.keys()].join(",")}]`);
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(46)}\n  CHROLLO full-kit: ${PASS} passed, ${FAIL} failed\n${"═".repeat(46)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
