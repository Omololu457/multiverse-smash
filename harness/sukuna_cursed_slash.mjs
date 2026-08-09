// harness/sukuna_cursed_slash.mjs — prove Sukuna's NEW Cursed Slash (Up+Special): auto-targeting slash that
// resolves ON the opponent (no travelling collider), with a SHORT startup, and is genuinely BLOCKABLE.
// Evidence: (1) fires from Up+Special; (2) the slash FX (yuji_sukuna_slahs_effect.png) spawns as a
// stationary visualOnly sprite centered on the opponent (NOT a moving projectile); (3) short time-to-hit;
// (4) UNBLOCKED → ~full damage; (5) BLOCKED (forced guard) → chip only = a block genuinely STOPS it.
// Screenshots: connect + blocked.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function tap(k, n = 1) { await page.keyboard.down(k); await waitFrames(n); await page.keyboard.up(k); }

async function fireCursedSlash() {
  // wait until Sukuna is actually free (not still in the prior cast's cooldown) so the input registers
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.fillEnergy?.());
  // DOWN + SPECIAL → dirs end in D → Cursed Slash (grounded, no jump). Hold Down while pressing Special.
  await page.keyboard.down("s"); await waitFrames(1);
  await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l");
  await page.keyboard.up("s");
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=sukuna&p2=batman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start());
  await waitFrames(6);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(20);

  // ── (A) UNBLOCKED CONNECT — auto-targets & resolves on the opponent, no travel ──
  section("Cursed Slash — unblocked connect (auto-target, no travel)");
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 210);   // place opponent at RANGE (proves auto-track, not a poke)
  await waitFrames(2);
  const eHP0 = (await p2()).health, eX = (await p2()).x + (await p2()).w / 2;
  const t0 = (await st()).frame;
  await fireCursedSlash();
  // poll for the health change → measure time-to-hit
  await page.waitForFunction(h => window.__harness.p2().health < h, eHP0, { timeout: 4000, polling: 16 }).catch(() => {});
  const tHit = (await st()).frame - t0;
  // catch the FX while it's alive
  const fx = await projs();
  const slash = fx.find(p => p.name === "cursedSlash");
  const eHP1 = (await p2()).health;
  await page.screenshot({ path: path.join(SHOTS, "sukuna_cursed_slash_connect.png") });
  check("slash FX spawned as a visualOnly sprite (no independent collider)", !!slash && slash.visualOnly === true && !!slash.sheet, slash ? `sheet=${slash.sheet} visualOnly=${slash.visualOnly}` : "no cursedSlash proj");
  check("FX is stationary (vx≈0, vy≈0) — not a travelling projectile", !!slash && Math.abs(slash.vx) < 0.01 && Math.abs(slash.vy) < 0.01, slash ? `vx=${slash.vx} vy=${slash.vy}` : "");
  check("FX centered on the opponent's position (auto-targeted)", !!slash && Math.abs(slash.x - eX) < 30, slash ? `fxX=${slash.x?.toFixed(0)} oppCx=${eX.toFixed(0)}` : "");
  check("unblocked → ~full damage (~100)", (eHP0 - eHP1) >= 80, `−${(eHP0 - eHP1).toFixed(0)} hp`);
  check("short time-to-hit (≤14 frames from input → contact)", tHit > 0 && tHit <= 14, `${tHit} frames`);
  const dmgUnblocked = eHP0 - eHP1;

  // ── (B) BLOCKED — a held guard genuinely STOPS the full hit (chip only) ──
  section("Cursed Slash — BLOCKED (forced guard) stops it");
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(true); });
  await waitFrames(2);
  const bHP0 = (await p2()).health;
  const blockingAtFire = (await p2()).blocking;
  await fireCursedSlash();
  await waitFrames(12);
  const bHP1 = (await p2()).health;
  await page.screenshot({ path: path.join(SHOTS, "sukuna_cursed_slash_blocked.png") });
  const dmgBlocked = bHP0 - bHP1;
  check("opponent is holding guard at fire time", blockingAtFire === true, `blocking=${blockingAtFire}`);
  check("blocked → chip only (much less than unblocked)", dmgBlocked > 0 && dmgBlocked < dmgUnblocked * 0.5, `blocked −${dmgBlocked.toFixed(0)} vs unblocked −${dmgUnblocked.toFixed(0)}`);
  check("the block genuinely STOPPED the full hit (chip ≤ ~30)", dmgBlocked <= 35, `chip=${dmgBlocked.toFixed(0)}`);

  // ── (C) EXISTING SPECIALS NOT SHADOWED by the new D branch ──
  section("existing specials still fire (no shadowing)");
  // Flame Arrow = Forward+Special → a TRAVELLING flameArrow projectile (distinct from the stationary slash FX)
  await page.evaluate(() => { window.__harness.healP2?.(); window.__harness.setP2ForceBlock?.(false); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.keyboard.down("d"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await page.keyboard.up("d");
  await waitFrames(12);
  { const fa = (await projs()).find(p => p.name === "flameArrow"); check("Forward+Special still fires Flame Arrow (travelling projectile)", !!fa && !fa.visualOnly && Math.abs(fa.vx) > 1, fa ? `vx=${fa.vx}` : "no flameArrow"); }
  // Dismantle = Down,Back+Special → a travelling dismantle projectile (the D,B roll, distinct from single-D).
  // Dismantle spawns immediately and travels fast (speed 13) → push the opponent far and sample early so we
  // catch it mid-flight (before it connects + despawns).
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  { const a2 = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a2.x + 500); }
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.up("s");   // down
  await page.keyboard.down("a"); await waitFrames(2);                                 // then back (away from P2) → D,B roll
  await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l"); await page.keyboard.up("a");
  await waitFrames(4);
  { const dm = (await projs()).find(p => p.name === "dismantle"); check("Down,Back+Special still fires Dismantle (travelling projectile)", !!dm && !dm.visualOnly, dm ? `vx=${dm.vx}` : "no dismantle"); }

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n  📸 harness/shots/sukuna_cursed_slash_connect.png  +  _blocked.png`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  SUKUNA Cursed Slash: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
