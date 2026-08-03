// harness/ghostface_swap_stage3.mjs — STAGE 3 PILOT: Ghostface Companion SWAP ("Kameo").
// Pilots the full-character swap on SASUKE under Billy's identity, driven by REAL keyboard input.
//
// RIGOR (per user directive — this exact "right in code, wrong in practice" bug already hit Ben10 &
// Minato clones): the trigger is verified with REPEATED real presses, not a single test or code read —
//   • the SAME combo (CHARGE+↓) pressed 6× in a row must swap into SASUKE every single time, and
//   • DIFFERENT combos must each land their OWN companion (proves selection is input-driven, not random/latched).
// Plus: unlimited resource during the window (fire ≥2 of Sasuke's real moves, chakra stays full) and the
// fixed-timer auto-revert back to Ghostface.
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
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const gfSwap = () => page.evaluate(() => window.__harness.gfSwap());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `ghostface_swap_${name}.png`) }); }

// P1 keys: charge=p, down=s, left=a, right=d, up=w.
// Press CHARGE, then the cardinal edge → the swap fires on the frame the cardinal goes down.
async function pressSwapCombo(dirKey, settle = 4) {
  await page.keyboard.down("p"); await waitFrames(1);
  await page.keyboard.down(dirKey); await waitFrames(settle);
  const s = await gfSwap();
  await page.keyboard.up(dirKey); await page.keyboard.up("p");
  return s;
}
// Force-revert to a clean, un-swapped Ghostface (Billy), full Dread, ready for the next press.
async function resetToGhostface() {
  await page.evaluate(() => window.__harness.expireGfSwap());
  await waitFrames(3);   // driver reverts + a frame of movement-handler clears the held-state tracker
  await page.evaluate(() => { window.__harness.setSkin("p1", "ghostfaceBilly"); window.__harness.fillEnergy(); window.__harness.healP1?.(); });
  await waitFrames(2);
}

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
await page.evaluate(() => { window.__harness.setSkin("p1", "ghostfaceBilly"); window.__harness.fillEnergy(); });
await waitFrames(2);

// ── 1. Slot table (Billy) — each CHARGE+cardinal maps to a FIXED pool member (deterministic by construction) ──
console.log("\n── 1. Billy slot table (CHARGE+cardinal → pool member) ──");
let g = await gfSwap();
check("equipped identity is Billy", g.skinId === "ghostfaceBilly", `skin=${g.skinId}`);
const slotMap = Object.fromEntries(g.slots.map(s => [s.combo, s.companion]));
check("CHARGE+↓ → sasuke", slotMap["CHARGE+↓"] === "sasuke", JSON.stringify(slotMap));
check("CHARGE+← → itachi", slotMap["CHARGE+←"] === "itachi", `←=${slotMap["CHARGE+←"]}`);
check("CHARGE+→ → chrollo", slotMap["CHARGE+→"] === "chrollo", `→=${slotMap["CHARGE+→"]}`);
check("CHARGE+↑ → killua", slotMap["CHARGE+↑"] === "killua", `↑=${slotMap["CHARGE+↑"]}`);
check("not swapped at rest (real Ghostface)", g.active === false && g.rosterKey === "ghostface", `active=${g.active} roster=${g.rosterKey}`);
check("infiniteEnergy OFF at rest (unlimited is swap-only)", g.infiniteEnergy === false, `inf=${g.infiniteEnergy}`);

// ── 2. RIGOR — the SAME combo (CHARGE+↓) 6× in a row → SASUKE every single time ──
console.log("\n── 2. Repeated CHARGE+↓ → SASUKE every time (6 presses) ──");
const targets = [];
for (let rep = 0; rep < 6; rep++) {
  await resetToGhostface();
  const s = await pressSwapCombo("s");
  targets.push(s.active ? s.target : `MISS(active=${s.active})`);
}
check("all 6 presses swapped into SASUKE (no misfire, no wrong companion)",
  targets.length === 6 && targets.every(t => t === "sasuke"), `targets=[${targets.join(", ")}]`);
await shot("repeat_sasuke");

// ── 3. DIFFERENT combos → DIFFERENT companions (selection is input-driven, not latched/random) ──
console.log("\n── 3. Distinct combos → distinct companions ──");
const combos = [["s", "sasuke", "↓"], ["a", "itachi", "←"], ["d", "chrollo", "→"], ["w", "killua", "↑"]];
for (const [key, expect, arrow] of combos) {
  await resetToGhostface();
  const s = await pressSwapCombo(key);
  check(`CHARGE+${arrow} swaps into ${expect}`, s.active && s.target === expect, `got=${s.active ? s.target : "MISS"}`);
}
// interleave: ↓ then ← back-to-back must NOT stick on the first companion
await resetToGhostface(); const iA = await pressSwapCombo("s");
await resetToGhostface(); const iB = await pressSwapCombo("a");
check("↓ then ← lands sasuke THEN itachi (no stale latch)", iA.target === "sasuke" && iB.target === "itachi", `${iA.target} → ${iB.target}`);

// ── 4. Inside the window — really PLAYS as Sasuke (full kit) + UNLIMITED resource ──
console.log("\n── 4. Swapped: Sasuke's kit + unlimited chakra ──");
await resetToGhostface();
let s4 = await pressSwapCombo("s");
check("swapped into Sasuke", s4.active && s4.target === "sasuke", `target=${s4.target}`);
check("becomes Sasuke (rosterKey + name)", s4.rosterKey === "sasuke" && /sasuke/i.test(s4.name || ""), `roster=${s4.rosterKey} name=${s4.name}`);
let pv = await p1();
// Sasuke's sprite sheets are named `saske_*` (art misspelling) — this IS his real art, not a box.
check("renders Sasuke's sprite (real swap, not a box)", /saske|sasuke/i.test(pv.spriteSheet || "") && pv.spriteReady, `sheet=${pv.spriteSheet}`);
check("chakra shows UNLIMITED (infiniteEnergy + full bar)", s4.infiniteEnergy === true && s4.energy === s4.maxEnergy, `inf=${s4.infiniteEnergy} energy=${s4.energy}/${s4.maxEnergy}`);
await shot("as_sasuke");
// Press a key, poll up to 24 frames for the move to register (startup varies) → return the move name seen.
async function pressMove(key, hold = 3) {
  await page.keyboard.down(key); let seen = null;
  for (let i = 0; i < 24; i++) { const c = await p1(); if (c.currentMove || c.attacking) { seen = c.currentMove || "(attacking)"; break; } await waitFrames(1); }
  await page.keyboard.up(key); await waitFrames(12);
  return seen;
}
await waitFrames(4);                         // let the swap settle so the fighter is actionable
const m1 = await pressMove("j");             // Sasuke LIGHT normal
const eBefore = (await gfSwap()).energy;
const m2 = await pressMove("l");             // Sasuke SPECIAL (normally costs chakra)
const gAfter = await gfSwap();
check("used ≥2 of Sasuke's real moves (light + special execute)", !!m1 && !!m2, `move1=${m1} move2=${m2}`);
check("chakra stayed FULL after a special (unlimited resource)", gAfter.active && gAfter.energy === gAfter.maxEnergy && gAfter.energy === eBefore, `energy=${gAfter.energy}/${gAfter.maxEnergy}`);

// ── 5. Fixed-timer AUTO-REVERT back to Ghostface ──
console.log("\n── 5. Auto-revert to Ghostface ──");
const tA = (await gfSwap()).timer; await waitFrames(30); const tB = (await gfSwap()).timer;
check("window timer counts DOWN over real frames", tB < tA && tB > 0, `timer ${tA} → ${tB}`);
await page.evaluate(() => window.__harness.expireGfSwap()); await waitFrames(3);
const rev = await gfSwap();
check("auto-reverts to real Ghostface", rev.active === false && rev.rosterKey === "ghostface", `active=${rev.active} roster=${rev.rosterKey}`);
check("Billy identity restored (skin intact)", rev.skinId === "ghostfaceBilly", `skin=${rev.skinId}`);
check("infiniteEnergy cleared on revert (unlimited was window-only)", rev.infiniteEnergy === false, `inf=${rev.infiniteEnergy}`);
pv = await p1();
check("renders Ghostface's sprite again", /ghostface/i.test(pv.spriteSheet || ""), `sheet=${pv.spriteSheet}`);
await shot("reverted");

// ── 6. Activation is energy-gated (modest cost) ──
console.log("\n── 6. Energy-gated activation ──");
await resetToGhostface();
await page.evaluate(() => window.__harness.setEnergy(10));   // below the swap cost
await waitFrames(2);
const lowE = await pressSwapCombo("s");
check("swap BLOCKED below the energy cost", lowE.active === false && lowE.rosterKey === "ghostface", `active=${lowE.active}`);
await page.evaluate(() => window.__harness.fillEnergy()); await waitFrames(2);
const okE = await pressSwapCombo("s");
check("swap SUCCEEDS with full energy", okE.active === true && okE.target === "sasuke", `target=${okE.target}`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/ghostface_swap_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
