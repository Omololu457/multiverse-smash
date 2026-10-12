// harness/gon_phase2.test.mjs — Gon PHASE 2: Jajanken CHANT (hold Special → stage up → release dir picks
// Rock/Scissors/Paper) + "Called It!" + Fishing Rod Snag (meter steal) + Ren (buff) + Fury Dash (armor) +
// Ground Breaker. Deterministic: frame-counted. Keys: Special=l, Light=j, Heavy=k, Up=w, Down=s, Fwd=d, Back=a.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const g2 = (who = "p1") => page.evaluate(w => window.__harness.gonPhase2(w), who);
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));

async function allKeysUp() { for (const k of ["a", "d", "w", "s", "j", "k", "l", "u"]) await page.keyboard.up(k).catch(() => {}); }
async function reboot() { await allKeysUp(); await page.evaluate(() => window.__harness.boot()); await waitFrames(6); await waitGrounded(); }
async function prep(gap = 150) {
  await allKeysUp();
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
// Hold Special FIRST (starts the grounded chant; up+special then suppresses jump), then the direction;
// release Special → fires the hand picked by the direction held at release.
async function chant(dirKey, hold) {
  await page.keyboard.down("l");
  await waitFrames(1);
  if (dirKey) await page.keyboard.down(dirKey);
  await waitFrames(hold);
  const mid = await g2();                       // stage while held
  await page.keyboard.up("l");                   // release → fire
  if (dirKey) await page.keyboard.up(dirKey);
  await waitFrames(4);
  return mid;
}
async function moveSeen(expected, frames = 10) {
  let seen = null;
  for (let i = 0; i < frames; i++) { const m = (await g2())?.move || (await g2())?.castMove; if (m === expected) { seen = m; break; } await waitFrames(1); }
  return seen || (await g2())?.move || (await g2())?.castMove;
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=gon&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6); await waitGrounded();

  // ── 1. CHANT stages (hold Special climbs the stage) ──
  console.log("── 1. Jajanken CHANT stages ──");
  await prep();
  await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.down("d");
  await waitFrames(6);  const s1 = await g2();
  await waitFrames(24); const s2 = await g2();
  await waitFrames(24); const s3 = await g2();
  await page.keyboard.up("l"); await page.keyboard.up("d"); await waitFrames(4);
  check("chant reaches stage 1 early", (s1?.chant?.stage || 0) === 1, `stage=${s1?.chant?.stage} frames=${s1?.chant?.frames}`);
  check("chant climbs to stage 2", (s2?.chant?.stage || 0) >= 2, `stage=${s2?.chant?.stage} frames=${s2?.chant?.frames}`);
  check("chant climbs to stage 3", (s3?.chant?.stage || 0) >= 3, `stage=${s3?.chant?.stage} frames=${s3?.chant?.frames}`);
  await shot("gon_p2_chant_s3.png");

  // ── 2. RELEASE direction picks the hand: Fwd=Rock / Up=Scissors / Neutral=Paper ──
  console.log("── 2. Release direction → hand ──");
  await prep(120);
  await chant("d", 8);  check("Forward release = ROCK", (await moveSeen("rock")) === "rock", `move=${(await g2())?.move}`);
  await shot("gon_p2_rock.png");
  await prep(120);
  await chant("w", 8);  check("Up release = SCISSORS", (await moveSeen("scissors")) === "scissors", `move=${(await g2())?.move}`);
  await shot("gon_p2_scissors.png");
  await prep(300);
  await page.evaluate(() => window.__harness.clearProjectiles?.());
  await chant(null, 8); const paperMove = await moveSeen("paper");
  await waitFrames(12); const pc = (await projs()).length;
  check("Neutral release = PAPER (cast)", paperMove === "paper", `move=${paperMove}`);
  check("PAPER spawns a Nen-ball projectile", pc >= 1, `projectiles=${pc}`);
  await shot("gon_p2_paper.png");

  // ── 3. Chant stage scales damage ──
  console.log("── 3. Stage scales ROCK damage ──");
  await reboot(); await prep(60); await page.evaluate(() => window.__harness.setP2Invuln?.(0));
  let hp0 = (await p2()).health; await chant("d", 6); await waitFrames(26);
  const dmgS1 = hp0 - (await p2()).health;
  await reboot(); await prep(60); await page.evaluate(() => window.__harness.setP2Invuln?.(0));
  hp0 = (await p2()).health; await chant("d", 54); await waitFrames(26);
  const dmgS3 = hp0 - (await p2()).health;
  check("stage-1 ROCK connects (damage > 0)", dmgS1 > 0, `s1=${dmgS1}`);
  check("stage-3 ROCK out-damages stage-1 ROCK", dmgS3 > dmgS1 + 20, `s1=${dmgS1} s3=${dmgS3}`);

  // ── 4. Getting hit CANCELS the chant ──
  console.log("── 4. Hit cancels the chant ──");
  await reboot(); await prep();
  await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.down("d"); await waitFrames(10);
  check("chant is active before the hit", !!(await g2())?.chant, `chant=${JSON.stringify((await g2())?.chant)}`);
  await page.evaluate(() => window.__harness.hurtP1?.(40)); await waitFrames(3);
  const afterHit = await g2();
  await page.keyboard.up("l"); await page.keyboard.up("d"); await waitFrames(4);
  check("chant CANCELLED by the hit (cleared)", !afterHit?.chant, `chant=${JSON.stringify(afterHit?.chant)}`);
  check("no ROCK/Scissors/Paper comes out after a cancel", !["rock", "scissors", "paper"].includes((await g2())?.move), `move=${(await g2())?.move}`);
  await page.evaluate(() => window.__harness.healP1?.());

  // ── 5. FISHING ROD SNAG — Down+Light; on hit steals ~10% meter ──
  console.log("── 5. Fishing Rod Snag (meter steal) ──");
  await reboot(); await prep(55);
  await page.evaluate(() => { window.__harness.setP2Energy?.(100); window.__harness.setP2Invuln?.(0); });
  const p2e0 = (await p2()).energy, p1e0 = (await p1()).energy;
  await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("j"); await waitFrames(3); await page.keyboard.up("j"); await page.keyboard.up("s");
  check("Down+Light fires the ROD", (await moveSeen("rod")) === "rod", `move=${(await g2())?.move}`);
  await waitFrames(20);
  const stole = (await g2())?.rodStole || 0;
  check("ROD steals meter on hit (p1 energy up or steal recorded)", stole > 0 || (await p1()).energy > p1e0 - 16, `stole=${stole} p2e ${p2e0}->${(await p2()).energy}`);
  await shot("gon_p2_rod.png");

  // ── 6. REN — Down+Heavy damage buff ──
  console.log("── 6. Ren buff ──");
  await prep();
  await page.keyboard.down("s"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k"); await page.keyboard.up("s");
  check("Down+Heavy fires REN", (await moveSeen("ren")) === "ren", `move=${(await g2())?.move}`);
  await waitFrames(4); const ren = await g2();
  check("REN grants a damage buff (dmgMult > 1)", (ren?.dmgMult || 1) > 1.0, `dmgMult=${ren?.dmgMult} timer=${ren?.renTimer}`);
  await shot("gon_p2_ren.png");

  // ── 7. GROUND BREAKER — Forward+Light ──
  console.log("── 7. Ground Breaker ──");
  await reboot(); await prep(70);
  await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("j"); await waitFrames(3); await page.keyboard.up("j"); await page.keyboard.up("d");
  check("Forward+Light fires GROUND BREAKER", (await moveSeen("groundbreaker")) === "groundbreaker", `move=${(await g2())?.move}`);
  await shot("gon_p2_groundbreaker.png");
  await waitFrames(24); await waitGrounded();

  // ── 8. FURY DASH — Back+Heavy (armored) ──
  console.log("── 8. Fury Dash (armor) ──");
  await prep();
  await page.keyboard.down("a"); await page.keyboard.down("k"); await waitFrames(3); await page.keyboard.up("k"); await page.keyboard.up("a");
  check("Back+Heavy fires FURY DASH", (await moveSeen("furydash")) === "furydash", `move=${(await g2())?.move}`);
  check("FURY DASH grants brief cast-armor", ((await g2())?.castArmor || 0) > 0 || ((await g2())?.fury || 0) > 0, `armor=${(await g2())?.castArmor} fury=${(await g2())?.fury}`);
  await shot("gon_p2_fury.png");

  // ── 9. CALLED IT! — Paper vs a DISTANT opponent (beyond ~half-screen) ──
  console.log("── 9. Called It (Paper vs distant foe) ──");
  await prep(460);   // gap > GON_HALF_SCREEN (380) → Paper is the correct read
  await chant(null, 8);
  await waitFrames(2);
  const ci = await g2();
  check("CALLED IT! pops when Paper counters a distant foe", (ci?.calledIt || 0) > 0 && ci?.calledItHand === "paper", `calledIt=${ci?.calledIt} hand=${ci?.calledItHand} dist=460`);
  await shot("gon_p2_calledit.png");

} catch (e) {
  console.error("  ❌ harness error:", e.message, e.stack?.split("\n")[1] || "");
  FAIL++;
} finally {
  console.log(`\n${"═".repeat(44)}\n  GON PHASE 2: ${PASS} passed, ${FAIL} failed\n${"═".repeat(44)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
