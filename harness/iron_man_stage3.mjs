// harness/iron_man_stage3.mjs
// STAGE 3 evidence: Iron Man's Fwd+Heavy 3-stage "Repulsor Rush" command-chain rekka.
// (1) WIRING — ironManRush1/2/3 each point at a real reslice'd sheet (no box).
// (2) CHAIN — Fwd+Heavy opens ironManRush1 (dash-lunge punch); re-tap Heavy in recovery-after-connect cancels
//     into ironManRush2 (repulsor straight) → ironManRush3 (gauntlet-flare launcher). Cancel-on-hit; whiff ends it.
// (3) DAMAGE — the chain deals cumulative damage (all via GLOBAL_DAMAGE_SCALE ×0.60).
// (4) LAUNCH — ironManRush3 leaves P2 airborne/upward.
// (5) NEUTRAL — plain Heavy (no forward) stays the normal repulsor straight, not the chain.
// Screenshots → harness/shots/iron_man_stage3_*.png. See IRON_MAN_ASSET_MAP.md.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.ironManCmd("p1"));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `iron_man_stage3_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=iron_man`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("iron_man").animationData);

  console.log("\n── (1) wiring: rush stages → real iron_man_ sheets (no box) ──");
  for (const [k, tag] of [["ironManRush1", "iron_man_rush1_uniform"], ["ironManRush2", "iron_man_rush2_uniform"], ["ironManRush3", "iron_man_rush3_uniform"]])
    check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2)+(3)+(4) drive the Fwd+Heavy 3-stage rush → launcher ──");
  await prep(50);
  const ch0 = (await p2()).health;
  const facing = (await p1()).facing || 1;
  const fwd = facing === 1 ? "d" : "a";
  const seen = new Set(); let launchedFin = { grounded: true, vy: 0 };
  const record = async () => {
    const c = await cmd(); const mv = c?.move || "";
    if (/^ironManRush[123]$/.test(mv)) seen.add(mv);
    const b = await p2();
    if (mv === "ironManRush3") { if (!b.grounded || b.vy < -0.5) launchedFin = b; }
    return mv;
  };
  const tapK = async () => { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); };
  const waitCancelReady = async () => { await page.waitForFunction(() => { const c = window.__harness.ironManCmd("p1"); return c && c.attacking && c.phase === "recovery" && c.connected && c.rekkaNext; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); };

  await page.keyboard.down(fwd);
  await tapK();                          // Fwd+Heavy → ironManRush1 opener
  await record();
  await waitCancelReady(); await tapK(); // cancel into ironManRush2
  for (let i = 0; i < 3; i++) { await record(); await waitFrames(1); }
  await waitCancelReady(); await tapK(); // cancel into ironManRush3 launcher
  for (let i = 0; i < 12; i++) { await record(); await waitFrames(1); }
  await page.keyboard.up(fwd); await waitFrames(4); await shot("rush3");
  const chDealt = ch0 - (await p2()).health;

  check("chain opened ironManRush1", seen.has("ironManRush1"), [...seen].join(","));
  check("chain cancelled into ironManRush2", seen.has("ironManRush2"), [...seen].join(","));
  check("chain reached ironManRush3 finisher", seen.has("ironManRush3"), [...seen].join(","));
  check(`chain dealt cumulative damage (${chDealt.toFixed(0)})`, chDealt > 0, `dmg=${chDealt}`);
  check("ironManRush3 finisher launches P2 (airborne/upward)", !launchedFin.grounded || launchedFin.vy < -0.5, `grounded=${launchedFin.grounded} vy=${launchedFin.vy}`);

  console.log("\n── (5) neutral Heavy (no forward) stays the normal repulsor straight, not the chain ──");
  await prep(50);
  await page.keyboard.down("k"); await waitFrames(3); const nh = await p1(); await page.keyboard.up("k"); await waitFrames(6);
  check("neutral Heavy → iron_man_heavy_uniform (not rush)", (nh.spriteSheet || "").includes("iron_man_heavy_uniform"), `sheet=${nh.spriteSheet}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 3", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
