// harness/transform_jutsu.test.mjs — canonical regression for TRANSFORMATION JUTSU across all 5
// Naruto-universe characters. Per char: Tier 1 Disguise (visual-only, kit unchanged) + Tier 2 Full Copy
// (rosterKey→opponent, copied move connects). Plus the NON-CONFLICT proof: Tier 2 uses only the _tj*
// namespace — it never sets Chrollo's Skill Hunter (_sh*) or the Ghostface swap (_gfSwap*) state.
// Motions: Tier1 = →↓← (HCB), Tier2 = ↓←→ (DBF) — both three-distinct-direction (no double-tap dash).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
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
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const tj = () => page.evaluate(() => window.__harness.p1TransformJutsu());
const flags = () => page.evaluate(() => window.__harness.p1SwapFlags());
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function motion(seq) { const d = seq.slice(0, -1), l = seq[seq.length - 1]; for (const k of d) await page.keyboard.press(k); await tap(l, 6); }   // hold Special longer so it's read once actionable
const T1 = ["d", "s", "a", "l"], T2 = ["s", "a", "d", "l"];

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

async function suite(charKey, oppKey) {
  section(`${charKey.toUpperCase()} (copies ${oppKey})`);
  await boot(charKey, oppKey);

  // Tier 1 — Disguise (visual only)
  await reset();
  const b = await tj();
  await motion(T1); await waitFrames(8);
  const a1 = await tj();
  check(`${charKey} Tier 1: disguise on, appearance changed, KIT UNCHANGED`,
        a1.active && a1.tier === 1 && a1.rosterKey === charKey && a1.spriteSheet !== b.spriteSheet && a1.lightDmg === b.lightDmg,
        `roster=${a1.rosterKey} dmg=${b.lightDmg}→${a1.lightDmg}`);

  // Tier 2 — Full Copy
  await reset();
  const b2 = await tj();
  await motion(T2); await waitFrames(8);
  const a2 = await tj(); const f = await flags();
  check(`${charKey} Tier 2: full copy → rosterKey=${oppKey}, kit copied`,
        a2.active && a2.tier === 2 && a2.rosterKey === oppKey && a2.lightDmg !== b2.lightDmg,
        `roster=${a2.rosterKey} dmg=${b2.lightDmg}→${a2.lightDmg}`);
  check(`${charKey} Tier 2: NON-CONFLICT — uses _tj* only (sh=${f.sh}, gfSwap=${f.gfSwap})`,
        f.tj === true && f.sh === false && f.gfSwap === false, JSON.stringify(f));
  // copied move connects
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
  const hp0 = (await p2()).health;
  await tap("l"); await waitFrames(6);
  const cast = (await projNames()).length > 0; await waitFrames(18);
  const dmg = hp0 - (await p2()).health;
  check(`${charKey} Tier 2: copied move connects`, dmg > 0 || cast, `Δhp=${dmg.toFixed(0)} cast=${cast}`);

  // Revert
  await page.evaluate(() => window.__harness.forceRevertTransformJutsu());
  await waitFrames(14);
  const r = await tj();
  check(`${charKey}: reverts to own identity`, r.active === false && r.rosterKey === charKey, `roster=${r.rosterKey}`);
}

await suite("naruto", "sasuke");
await suite("sasuke", "naruto");
await suite("itachi", "naruto");
await suite("tobirama", "sasuke");
await suite("minato", "sasuke");
await suite("hashirama", "naruto");   // rollout 2026-08-12 (naruto light 44 ≠ hashirama 46 → clean kit-copy proxy)

console.log(`\n${FAIL === 0 ? "✅" : "❌"} Transformation Jutsu (6 chars × 2 tiers + non-conflict): ${PASS} passed, ${FAIL} failed`);
await browser.close();
server.close();
process.exit(FAIL === 0 ? 0 : 1);
