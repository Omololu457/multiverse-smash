// harness/ghostface_swap_stage4.mjs — STAGE 4: roll the Companion SWAP out to ALL 20 pairings.
// For EACH of the 5 killer identities (5 checkpoints), and EACH of its 4 pool companions, drive a REAL
// CHARGE+cardinal combo and assert:
//   • the pool offers ONLY that identity's 4 companions,
//   • the combo swaps into the CORRECT companion (deterministic slot→pool[i]),
//   • the fighter really becomes them (rosterKey + a resolved sprite, not a box),
//   • the window does NOT freeze — the timer DECREMENTS over 30 real frames (the Itachi-class
//     "swapped-in char auto-activates a freeze form and strands the swap" regression, per companion),
//   • it auto-reverts cleanly back to Ghostface in the SAME killer skin.
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

// CHARGE+cardinal, edge-triggered → fire the swap. Keys: charge=p, down=s, left=a, right=d, up=w.
async function pressSwapCombo(dirKey) {
  await page.keyboard.down("p"); await waitFrames(1);
  await page.keyboard.down(dirKey); await waitFrames(4);
  const s = await gfSwap();
  await page.keyboard.up(dirKey); await page.keyboard.up("p");
  return s;
}
async function resetToGhostface(skin) {
  await page.evaluate(() => window.__harness.expireGfSwap());
  await waitFrames(3);
  await page.evaluate(s => { window.__harness.setSkin("p1", s); window.__harness.fillEnergy(); window.__harness.healP1?.(); }, skin);
  await waitFrames(2);
}

const IDENTITIES = [
  ["ghostfaceBilly",  ["sasuke", "itachi", "chrollo", "killua"]],
  ["ghostfaceDebbie", ["beerus", "netero", "maki", "omniman"]],
  ["ghostfaceRoman",  ["rick", "tobirama", "gojo", "hisoka"]],
  ["ghostfaceJill",   ["sukuna", "goku_black", "gold_samurai_ranger", "vegeta"]],
  ["ghostfaceAmber",  ["shinobu", "gon", "naruto", "zenitsu"]],
];
const SLOTKEYS = ["s", "a", "d", "w"];   // down / left / right / up → slot 0-3
const ARROWS = ["↓", "←", "→", "↑"];

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

for (const [skin, pool] of IDENTITIES) {
  console.log(`\n════ CHECKPOINT — ${skin} ════`);
  await resetToGhostface(skin);
  const g = await gfSwap();
  check(`pool = only ${skin}'s 4 companions`, JSON.stringify(g.pool) === JSON.stringify(pool), `pool=${JSON.stringify(g.pool)}`);
  const slotMap = g.slots.map(s => s.companion);
  check(`slots map ${ARROWS.join("/")} → ${pool.join("/")}`, JSON.stringify(slotMap) === JSON.stringify(pool), `slots=${JSON.stringify(slotMap)}`);

  for (let i = 0; i < pool.length; i++) {
    const want = pool[i];
    await resetToGhostface(skin);
    const s = await pressSwapCombo(SLOTKEYS[i]);
    const okSwap = s.active && s.target === want && s.rosterKey === want;
    check(`CHARGE+${ARROWS[i]} → ${want} (real swap)`, okSwap, okSwap ? "" : `got active=${s.active} target=${s.target} roster=${s.rosterKey}`);
    // becomes them visually (resolved sheet, not a procedural box) + unlimited resource
    const pv = await p1();
    check(`  ${want}: renders a real sprite + unlimited chakra`, pv.spriteReady && s.infiniteEnergy === true && s.energy === s.maxEnergy, `sheet=${pv.spriteSheet} inf=${s.infiniteEnergy} e=${s.energy}/${s.maxEnergy}`);
    // ANTI-FREEZE: the window must keep ticking (Itachi-class strand regression) — timer decrements, stays active
    const t0 = (await gfSwap()).timer; await waitFrames(30); const g1 = await gfSwap();
    check(`  ${want}: window ticks (no freeze/strand)`, g1.active && g1.timer < t0 && g1.timer > 0, `timer ${t0} → ${g1.timer} active=${g1.active}`);
    // clean auto-revert back to Ghostface in the same identity
    await page.evaluate(() => window.__harness.expireGfSwap()); await waitFrames(3);
    const rev = await gfSwap();
    check(`  ${want}: reverts to Ghostface (${skin} intact)`, rev.active === false && rev.rosterKey === "ghostface" && rev.skinId === skin, `active=${rev.active} roster=${rev.rosterKey} skin=${rev.skinId}`);
  }
  // one evidence shot per identity — swap into its slot-0 companion, mid-window
  await resetToGhostface(skin);
  await pressSwapCombo("s");
  await page.screenshot({ path: path.join(OUT, `ghostface_swap_s4_${skin}.png`) });
  await page.evaluate(() => window.__harness.expireGfSwap()); await waitFrames(3);
}

console.log("");
check("no JS page errors across all 20 pairings", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/ghostface_swap_s4_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
