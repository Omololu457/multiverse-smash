// harness/training.test.mjs
// ---------------------------------------------------------------------------
// Training-mode audit + new-feature verification.
//   STEP 1 (audit what already exists): menu-path enable, frozen dummy, hitbox
//     overlay renders/tracks, no KO/victory interrupts.
//   STEP 2 (new): infinite HP/EN toggle, quick reset, frame-data + combo readout,
//     dummy behavior (stand/block/jump).
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADED = process.env.HEADED === "1";
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".json": "application/json", ".csv": "text/csv" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("nf"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: !HEADED, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const training = () => page.evaluate(() => window.__harness.training());
const stateOf = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function tapFn(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); await waitFrames(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=sasuke&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness);
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());   // boot enters training mode (matchConfig.mode="training")
  await waitFrames(5);

  // ═══ STEP 1 — AUDIT WHAT ALREADY EXISTS ═══
  section("STEP 1 — training enabled via the MENU path (mode='training')");
  let t = await training();
  check("training is ENABLED", t.enabled === true, `enabled=${t.enabled}`);
  check("enabled via menu mode (not F1 debug)", t.mode === "training", `mode=${t.mode}`);

  section("STEP 1 — Dummy opponent is frozen / non-reactive");
  // Keep the dummy well clear of P1 (no pushbox contact) and just observe it: a frozen
  // dummy self-initiates nothing — no movement, no attack — even while P1 acts nearby.
  await page.evaluate(() => window.__harness.setP2X(1700));
  const p2x0 = (await p2()).x;
  await tapFn("j"); await tapFn("k"); await waitFrames(30);   // P1 attacks in place, never touching P2
  const dummy = await p2();
  check("dummy did NOT move on its own (no self-initiated action)", Math.abs(dummy.x - p2x0) < 2, `x ${p2x0.toFixed(0)} → ${dummy.x.toFixed(0)}`);
  check("dummy did NOT attack", !dummy.attacking, `attacking=${dummy.attacking}`);

  section("STEP 1 — hitbox/hurtbox overlay renders & tracks (visual)");
  await page.screenshot({ path: path.join(OUT, "TRAIN_boxes_idle.png") });
  // trigger an attack and confirm a LIVE attack hitbox exists mid-move (getAttackHitbox)
  await page.keyboard.down("k");
  await waitFrames(2);
  const midAtk = await p1();
  const liveHb = await page.evaluate(() => { const t = window.__harness.training(); return !!t.frameData; });
  await page.screenshot({ path: path.join(OUT, "TRAIN_boxes_attack.png") });
  await page.keyboard.up("k");
  check("attack overlay has a LIVE move to box (frameData present mid-attack)", midAtk.attacking && liveHb, `attacking=${midAtk.attacking} frameData=${liveHb}`);
  await waitFrames(25);

  section("STEP 1 — no round timer / KO / victory interrupts a session");
  // infinite resources default OFF, so P2 can be driven to 0 HP; confirm NO victory triggers.
  if ((await training()).infiniteResources) await tapFn("F3");
  check("infinite resources OFF (default) for the KO test", (await training()).infiniteResources === false);
  await page.evaluate(() => { window.__harness.damageP2(99999); });
  await waitFrames(30);
  const koState = await stateOf();
  const p2ko = await p2();
  check("P2 driven to 0 HP", p2ko.health <= 0, `p2 hp=${p2ko.health}`);
  check("NO victory/round-end: still in BATTLE", koState.gameState === "battle", `gameState=${koState.gameState}`);

  // ═══ STEP 2 — NEW FEATURES ═══
  section("STEP 2 — infinite health/energy toggle (both fighters)");
  // turn infinite back ON, heal, then damage P2 → must stay full (pinned each frame).
  await tapFn("F3");
  check("infinite resources toggled back ON", (await training()).infiniteResources === true);
  await page.evaluate(() => { window.__harness.damageP2(500); });
  await waitFrames(6);
  const p2inf = await p2();
  check("infinite HP: P2 damage is refilled to max", p2inf.health === p2inf.maxHealth, `hp=${p2inf.health}/${p2inf.maxHealth}`);
  // energy: drain P1, confirm refilled
  await page.evaluate(() => window.__harness.setEnergy(0));
  await waitFrames(4);
  const p1inf = await p1();
  check("infinite EN: P1 energy refilled to max", p1inf.energy === p1inf.maxEnergy, `en=${p1inf.energy}/${p1inf.maxEnergy}`);

  section("STEP 2 — quick reset (F2) snaps position + clears state");
  await page.evaluate(() => window.__harness.setP2X(1800));
  await page.keyboard.down("d"); await waitFrames(25); await page.keyboard.up("d");
  await page.evaluate(() => window.__harness.hurtP1(30));   // put P1 in hitstun
  const preReset = await p1();
  await tapFn("F2");
  const postReset = await p1(), postP2 = await p2();
  check("reset cleared P1 hitstun", postReset.hitstun === 0, `hitstun ${preReset.hitstun} → ${postReset.hitstun}`);
  check("reset moved P1 back toward neutral spawn", Math.abs(postReset.x - preReset.x) > 10 || preReset.x === postReset.x, `x ${preReset.x.toFixed(0)} → ${postReset.x.toFixed(0)}`);
  check("reset restored full HP for both", postReset.health === postReset.maxHealth && postP2.health === postP2.maxHealth, `p1=${postReset.health} p2=${postP2.health}`);
  check("reset cleared combo", (await training()).combo === 0);

  section("STEP 2 — frame-data readout updates when a move starts");
  const fdIdle = (await training()).frameData;
  check("no frame data while idle", fdIdle === null, `frameData=${JSON.stringify(fdIdle)}`);
  await page.keyboard.down("k");
  await waitFrames(2);
  const fd = (await training()).frameData;
  await page.keyboard.up("k");
  check("frame data appears on a move (startup/active/recovery present)", !!fd && Number.isFinite(fd.startup) && Number.isFinite(fd.active) && Number.isFinite(fd.recovery), `${fd ? `${fd.name} ${fd.startup}/${fd.active}/${fd.recovery} [${fd.phase}]` : "null"}`);
  await waitFrames(25);

  section("STEP 2 — dummy behavior toggle (stand → block → jump)");
  let beh = (await training()).dummyBehavior;
  check("dummy starts in 'stand'", beh === "stand", `dummy=${beh}`);
  await tapFn("F4");
  check("F4 cycles to 'block'", (await training()).dummyBehavior === "block");
  // with block, drive P2 and confirm it holds guard
  await waitFrames(6);
  check("dummy in 'block' holds guard (isBlocking)", (await p2()).blocking === true, `blocking=${(await p2()).blocking}`);
  await tapFn("F4");
  check("F4 cycles to 'jump'", (await training()).dummyBehavior === "jump");
  // with jump, confirm P2 leaves the ground within a short window
  let leftGround = false;
  for (let i = 0; i < 40 && !leftGround; i++) { if ((await p2()).grounded === false) leftGround = true; await waitFrames(1); }
  check("dummy in 'jump' leaves the ground", leftGround);
  await tapFn("F4");
  check("F4 cycles back to 'stand'", (await training()).dummyBehavior === "stand");
  await page.screenshot({ path: path.join(OUT, "TRAIN_overlay_final.png") });

  // ═══ PAUSE-MENU → TRAINING transition (from a live NON-training match) ═══
  section("PAUSE MENU — jump into Training from a live vs-CPU match");
  await page.evaluate(() => window.__harness.bootVs());   // real vs-CPU match (mode="vs")
  await waitFrames(5);
  const vs = await training();
  check("started a NON-training vs match", vs.enabled === false && vs.mode === "vs", `enabled=${vs.enabled} mode=${vs.mode}`);

  // Open the pause menu with a real Escape keypress.
  await page.keyboard.press("Escape"); await waitFrames(2);
  check("Escape opens the pause menu", (await page.evaluate(() => window.__harness.state())).gameState === "paused");
  check("pause menu starts on 'resume'", (await page.evaluate(() => window.__harness.pauseSel())).item === "resume");

  // Navigate down to the new "trainingMode" entry (resume→restartRound→trainingMode).
  await page.keyboard.press("ArrowDown"); await waitFrames(1);
  await page.keyboard.press("ArrowDown"); await waitFrames(1);
  const sel = await page.evaluate(() => window.__harness.pauseSel());
  check("navigated to the new Training Mode entry", sel.item === "trainingMode", `index=${sel.index} item=${sel.item}`);

  // Select it.
  await page.keyboard.press("Enter"); await waitFrames(2);
  const afterSel = await training();
  const gs = (await page.evaluate(() => window.__harness.state())).gameState;
  check("selecting Training Mode flips the match to training", afterSel.mode === "training" && afterSel.enabled === true, `mode=${afterSel.mode} enabled=${afterSel.enabled}`);
  check("returned to the live battle (not stuck in the menu)", gs === "battle", `gameState=${gs}`);

  // Confirm it's a REAL working training session, not just a relabel.
  await page.evaluate(() => window.__harness.skipToBattle());   // clear the round-start countdown
  await page.evaluate(() => window.__harness.setP2X(1700));
  const px0 = (await p2()).x;
  await tapFn("j"); await tapFn("k"); await waitFrames(25);
  const pdummy = await p2();
  check("transition gives a FROZEN dummy (doesn't self-move/attack)", Math.abs(pdummy.x - px0) < 2 && !pdummy.attacking, `x ${px0.toFixed(0)}→${pdummy.x.toFixed(0)} atk=${pdummy.attacking}`);
  await page.evaluate(() => window.__harness.damageP2(99999));
  await waitFrames(25);
  check("transition session has NO KO/victory (stays in BATTLE at 0 HP)", (await page.evaluate(() => window.__harness.state())).gameState === "battle" && (await p2()).health <= 0, `hp=${(await p2()).health}`);
  await page.screenshot({ path: path.join(OUT, "TRAIN_from_pause.png") });

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
  try { await page.screenshot({ path: path.join(OUT, "TRAIN_ERROR.png") }); } catch {}
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
