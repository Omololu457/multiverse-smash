// harness/transform_stage4_shots.mjs — TRANSFORMATION JUTSU Stage 4: rollout to Sasuke/Itachi/Tobirama/
// Minato (both tiers), via the SHARED system (data + one dispatcher call each). Per character: Tier 1
// Disguise (appearance-only, kit unchanged) and Tier 2 Full Copy (rosterKey→opponent, copied move connects).
// Motions: Tier1 = →↓← (HCB) for all; Tier2 = →↓→ (DP) except Minato = ←↓← (DPB, teleport-safe).
// Outputs harness/shots/transform_s4_<char>_tier{1,2}.png.
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

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const tj = () => page.evaluate(() => window.__harness.p1TransformJutsu());
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function motion(seq) { const d = seq.slice(0, -1), l = seq[seq.length - 1]; for (const k of d) await page.keyboard.press(k); await tap(l); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

const T1 = ["d", "s", "a", "l"];                       // →↓← HCB
const T2 = ["s", "a", "d", "l"];                    // ↓←→ DBF (distinct dirs, no dash)

async function boot(p1k, p2k) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1k}&p2=${p2k}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
}
async function reset(gap = 70) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.forceRevertTransformJutsu?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

async function suite(charKey, oppKey, t2seq) {
  console.log(`\n══════ ${charKey.toUpperCase()} (copying ${oppKey}) ══════`);
  await boot(charKey, oppKey);

  // ── Tier 1 Disguise ──
  await reset();
  const b = await tj();
  await motion(T1);
  await waitFrames(8);
  const a1 = await tj();
  await shot(`transform_s4_${charKey}_tier1.png`);
  check(`${charKey} T1: activated (disguise)`, a1.active && a1.tier === 1, `tier=${a1.tier}`);
  check(`${charKey} T1: appearance changed, rosterKey UNCHANGED (${charKey}), dmg unchanged`,
        a1.rosterKey === charKey && a1.spriteSheet !== b.spriteSheet && a1.lightDmg === b.lightDmg,
        `roster=${a1.rosterKey} sheet=${a1.spriteSheet} dmg=${b.lightDmg}→${a1.lightDmg}`);

  // ── Tier 2 Full Copy ──
  await reset();
  const b2 = await tj();
  await motion(t2seq);
  await waitFrames(8);
  const a2 = await tj();
  await shot(`transform_s4_${charKey}_tier2.png`);
  check(`${charKey} T2: activated (full copy) → rosterKey=${oppKey}`, a2.active && a2.tier === 2 && a2.rosterKey === oppKey, `tier=${a2.tier} roster=${a2.rosterKey}`);
  check(`${charKey} T2: kit copied (basic-attacks changed)`, a2.lightDmg !== b2.lightDmg, `${b2.lightDmg}→${a2.lightDmg}`);
  // copied move connects
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
  const hp0 = (await p2()).health;
  await tap("l"); await waitFrames(6);
  const cast = (await projNames()).length > 0;
  await waitFrames(18);
  const dmg = hp0 - (await p2()).health;
  check(`${charKey} T2: copied move connects (dmg or projectile)`, dmg > 0 || cast, `Δhp=${dmg.toFixed(0)} cast=${cast}`);

  await page.evaluate(() => window.__harness.forceRevertTransformJutsu());
}

try {
  await suite("sasuke", "naruto", T2);
  await suite("itachi", "naruto", T2);
  await suite("tobirama", "sasuke", T2);   // copy Sasuke (light 46 ≠ Tobirama 44) so the "kit changed" check has a real discriminator
  await suite("minato", "sasuke", T2);
  console.log(`\n${fails === 0 ? "✅" : "❌"} Transformation Jutsu rollout (4 chars × 2 tiers): ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
