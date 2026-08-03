// harness/samurai_red_ranger.test.mjs
// CANONICAL full-kit test for the Samurai Red Ranger (Fire) — the single authoritative suite.
// Covers: registration/portrait · 5 normals + merged tap/hold up-attack + Toji-Rekka chain (base) ·
// Mega Mode transformation (darken→resolve tier-swap) + dual-render "two instances" guard ·
// ≥3 moves on the Mega tier · Flame Slash Mega-only gate (base no-op / Mega fires) ·
// Ultimate TIER-SCALING (base art+dmg vs Mega art+dmg). Run: node harness/samurai_red_ranger.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const section = (t) => console.log(`\n── ${t} ──`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [];
page.on("pageerror", e => jsErrors.push(String(e)));

const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const cine = () => page.evaluate(() => window.__harness.samuraiUltCine());
const sh = (a) => (a.spriteSheet || "");
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.setEnergy?.(160); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function sawMove(name, frames = 22) { for (let i = 0; i < frames; i++) { const a = await p1(); if (a.currentMove === name) return a.spriteSheet || true; await waitFrames(1); } return false; }
async function toMega() {
  await waitGrounded();
  await page.evaluate(() => window.__harness.setEnergy?.(160));
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(4);
}
async function fireUlt() {
  await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetFighterInput?.("p1"); window.__harness.setEnergy?.(160); });
  const a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 120); await waitFrames(2);
  const hp0 = (await p2()).health;
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.samuraiUltCine().active === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  let sheet = "", mega = null;
  for (let i = 0; i < 30; i++) { const c = await cine(); const a = await p1(); if (sh(a).includes("ultimate_uniform")) sheet = sh(a); if (c.mega != null) mega = c.mega; if (!c.active) break; await new Promise(r => setTimeout(r, 40)); }
  await page.waitForFunction(() => window.__harness.samuraiUltCine().active === false, null, { timeout: 6000, polling: 32 }).catch(() => {});
  await waitFrames(4);
  return { sheet, mega, dmg: hp0 - (await p2()).health };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=samurai_red_ranger`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);

  // ══ REGISTRATION + PORTRAIT ══
  section("registration + portrait");
  const portraitField = await page.evaluate(() => window.__harness.charPortrait?.("samurai_red_ranger"));
  check("portrait wired to samurai_ranger_portrait.png", portraitField === "./samurai_ranger_portrait.png", `portrait=${portraitField}`);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  check("P1 is Samurai Red Ranger (sprite path)", g.key === "samurai_red_ranger" && g.hasSpriteHandler, `key=${g.key}`);
  check("idle = samurai_ranger_idle_uniform", sh(g).includes("samurai_ranger_idle_uniform"), sh(g));
  check("spriteScale 1.85 · HP 1220 · EN 160", Math.abs((g.spriteScale || 0) - 1.85) < 0.01 && g.maxHealth === 1220 && g.maxEnergy === 160, `scale=${g.spriteScale} hp=${g.maxHealth} en=${g.maxEnergy}`);

  // Install the dual-render "two instances" tally for the Mega body sheet.
  await page.evaluate(() => {
    window.__samDual = { max: 0, cur: 0 };
    const proto = CanvasRenderingContext2D.prototype;
    if (!proto.__samPatched) {
      const orig = proto.drawImage;
      proto.drawImage = function (img, ...rest) { try { const s = (img && (img.currentSrc || img.src)) || ""; if (s.includes("samurai_ranger_mega_idle_uniform")) window.__samDual.cur++; } catch (e) {} return orig.call(this, img, ...rest); };
      proto.__samPatched = true;
      const raf = window.requestAnimationFrame.bind(window);
      const tick = () => { if (window.__samDual.cur > window.__samDual.max) window.__samDual.max = window.__samDual.cur; window.__samDual.cur = 0; raf(tick); };
      raf(tick);
    }
  });

  // ══ BASE NORMALS ══
  section("base normals (light/heavy/air/down_air)");
  for (const [name, key, gap, tag, dmgMin] of [["light", "j", 46, "combo_uniform", 15], ["heavy", "k", 46, "combo_2_uniform", 30]]) {
    await prep(gap); const hp0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(4); const rec = await p1(); await page.keyboard.up(key); await waitFrames(20);
    check(`${name} connects + sheet`, (hp0 - (await p2()).health) >= dmgMin && sh(rec).includes(tag), `dmg=${hp0 - (await p2()).health} sheet=${sh(rec)}`);
  }
  await prep(44); await page.evaluate(() => window.__harness.liftP1(40)); let hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); const airRec = await p1(); await page.keyboard.up("j"); await waitFrames(12);
  check("air connects + sheet", (hp0 - (await p2()).health) > 0 && sh(airRec).includes("samurai_ranger_air_uniform"), sh(airRec));
  await waitGrounded();
  await prep(30); await page.evaluate(() => window.__harness.liftP1(46)); hp0 = (await p2()).health;
  await page.keyboard.down("s"); await page.keyboard.down("j"); await waitFrames(4); const daRec = await p1(); await page.keyboard.up("j"); await page.keyboard.up("s"); await waitFrames(14);
  check("down_air connects + sheet", (hp0 - (await p2()).health) > 0 && sh(daRec).includes("samurai_ranger_downattack_uniform"), sh(daRec));

  // ══ MERGED UP-ATTACK (tap vs hold) ══
  section("merged up-attack (one input, two tiers)");
  await prep(42); let hpT = (await p2()).health;
  await page.keyboard.down("i"); await waitFrames(3); await page.keyboard.up("i");
  const tapSheet = await sawMove("samUpTap", 18); await waitFrames(18);
  const tapDmg = hpT - (await p2()).health;
  check("tap I → samUpTap (upattack_1)", !!tapSheet && String(tapSheet).includes("upattack_1_uniform"), `sheet=${tapSheet}`);
  await prep(42); let hpH = (await p2()).health;
  await page.keyboard.down("i"); const holdSheet = await sawMove("samUpHold", 18); await page.keyboard.up("i"); await waitFrames(22);
  const holdDmg = hpH - (await p2()).health;
  check("hold I → samUpHold (upattack_2) + out-damages tap", !!holdSheet && String(holdSheet).includes("upattack_2_uniform") && holdDmg > tapDmg, `holdSheet=${holdSheet} hold=${holdDmg} tap=${tapDmg}`);

  // ══ TOJI-REKKA COMMAND CHAIN + whiff interrupt ══
  section("flame command chain (Fwd+Heavy, cancel-on-hit)");
  await prep(38); const stages = new Set(); const chHp0 = (await p2()).health;   // start close so every stage stays in range
  const sampleC = async (n) => { for (let i = 0; i < n; i++) { const a = await p1(); if (a.currentMove) stages.add(a.currentMove); await waitFrames(1); } };
  await page.keyboard.down("d");                                            // hold forward (walk back into range between stages)
  await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await sampleC(6);
  for (let t = 0; t < 6; t++) { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await sampleC(6); }
  await waitFrames(8); await page.keyboard.up("d");
  const chainDmg = chHp0 - (await p2()).health;
  check("chain runs samRekka1→2→Fin + cumulative dmg", stages.has("samRekka1") && stages.has("samRekka2") && stages.has("samRekkaFin") && chainDmg > 45, `stages=[${[...stages]}] dmg=${chainDmg}`);
  // whiff interrupt: opener whiffs → no advance
  await prep(360); await page.keyboard.down("d"); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const w1 = await sawMove("samRekka1", 8); await waitFrames(6); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k");
  const w2 = await sawMove("samRekka2", 12); await page.keyboard.up("d");
  check("whiffed opener does NOT advance (cancel-on-hit)", !!w1 && !w2, "");

  // ══ FLAME SLASH — MEGA-ONLY GATE (base = no-op) ══
  section("Flame Slash gate: base form = no-op");
  await prep(60); const eB = (await p1()).energy;
  await page.keyboard.down("l"); await waitFrames(2); const baseSlash = await sawMove("flameSlash", 12); await page.keyboard.up("l"); await waitFrames(4);
  const baseBursts = (await projs()).filter(p => (p.sheet || "").includes("flameburst")).length;
  check("base Special does NOT fire Flame Slash (no cast, no energy, no bursts)", !baseSlash && Math.abs((await p1()).energy - eB) < 1 && baseBursts === 0, "");

  // ══ MEGA MODE TRANSFORMATION + tier-swap ══
  section("Mega Mode transformation + tier-swap");
  await page.evaluate(() => window.__harness.setEnergy?.(160));
  await page.keyboard.down("p"); await waitFrames(14); await page.keyboard.up("p");
  const started = await page.waitForFunction(() => window.__harness.p1().currentForm === "megaMode", null, { timeout: 3000, polling: 16 }).then(() => true).catch(() => false);
  const darken = await page.waitForFunction(() => { const p = window.__harness.p1(); return p.currentForm === "megaMode" && !p.hasSkinAnim; }, null, { timeout: 2000, polling: 16 }).then(() => true).catch(() => false);
  await page.waitForFunction(() => window.__harness.p1().hasSkinAnim === true, null, { timeout: 3000, polling: 16 }).catch(() => {});
  await waitFrames(4); const mega = await p1();
  check("transforms: morph has darken phase → resolves into Mega", started && darken && mega.currentForm === "megaMode" && mega.hasSkinAnim, `form=${mega.currentForm} skinAnim=${mega.hasSkinAnim}`);
  check("Mega damage multiplier 1.35 active", Math.abs((mega.damageMultiplier ?? mega.damageMult ?? 1) - 1.35) < 0.02, `mult=${mega.damageMultiplier ?? mega.damageMult}`);
  check("MEGA MOVE 1 — idle = mega_idle_uniform", sh(mega).includes("samurai_ranger_mega_idle_uniform"), sh(mega));
  // a mega normal
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); });
  let a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 46); await waitFrames(2); const mHp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); const mLight = await p1(); await page.keyboard.up("j"); await waitFrames(18);
  check("MEGA MOVE 2 — light = mega_combo_uniform + out-damages base", sh(mLight).includes("samurai_ranger_mega_combo_uniform") && (mHp0 - (await p2()).health) > 30, `sheet=${sh(mLight)} dmg=${mHp0 - (await p2()).health}`);
  await waitGrounded(); await page.keyboard.down("s"); await waitFrames(6); const mGuard = await p1(); await page.keyboard.up("s"); await waitFrames(3);
  check("MEGA MOVE 3 — guard = mega_guard_uniform", sh(mGuard).includes("samurai_ranger_mega_guard_uniform"), sh(mGuard));
  // dual-render "two instances" check
  await page.evaluate(() => { window.__samDual.max = 0; window.__samDual.cur = 0; }); await waitFrames(30);
  check("no dual-render (Mega body drawn ≤1×/frame)", (await page.evaluate(() => window.__samDual.max)) <= 1, `max=${await page.evaluate(() => window.__samDual.max)}`);

  // ══ FLAME SLASH fires in Mega + double-burst ══
  section("Flame Slash fires in Mega + double-burst");
  await page.evaluate(() => { window.__harness.clearProjectiles(); window.__harness.resetFighterInput?.("p1"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setEnergy?.(160); });
  a0 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a0.x + 340); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const megaSlash = await sawMove("flameSlash", 18);
  let maxBursts = 0; for (let i = 0; i < 28; i++) { const n = (await projs()).filter(p => (p.sheet || "").includes("flameburst")).length; if (n > maxBursts) maxBursts = n; await waitFrames(1); }
  check("Mega Flame Slash fires + double-burst (2 crescents)", !!megaSlash && String(megaSlash).includes("flameslash_uniform") && maxBursts >= 2, `sheet=${megaSlash} bursts=${maxBursts}`);

  // ══ ULTIMATE — TIER-SCALING (base vs Mega) ══
  section("ultimate tier-scaling (base art+dmg vs Mega art+dmg)");
  await page.evaluate(() => window.__harness.boot()); await waitFrames(6);
  const bu = await fireUlt();
  check("BASE ult: base strip + damage", bu.sheet.includes("samurai_ranger_ultimate_uniform") && bu.mega === false && bu.dmg > 0, `sheet=${bu.sheet} dmg=${bu.dmg}`);
  await page.evaluate(() => window.__harness.boot()); await waitFrames(6); await toMega();
  const mu = await fireUlt();
  check("MEGA ult: Mega strip + higher damage", mu.sheet.includes("samurai_ranger_mega_ultimate_uniform") && mu.mega === true && mu.dmg > bu.dmg, `sheet=${mu.sheet} base=${bu.dmg} mega=${mu.dmg}`);
  check("ultimate art + damage differ by tier", bu.sheet !== mu.sheet && mu.dmg > bu.dmg, `base=${bu.dmg} mega=${mu.dmg}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} SAMURAI RED RANGER full-kit: ${pass} passed, ${fail} failed`);
  console.log("════════════════════════════════════════════");
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
