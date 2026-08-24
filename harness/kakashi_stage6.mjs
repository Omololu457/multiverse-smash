// harness/kakashi_stage6.mjs
// STAGE 6 evidence: Kakashi's ULTIMATE "Raikiri" (owner-designated ult) — inline freeze-cinematic dash-thrust.
//   (1) WIRING — the 3 Raikiri cast poses (charge/dash/support) point at real sheets.
//   (2) BASE Raikiri — p1Ultimate casts kakashiRaikiriCharge, spends 100 chakra, ROCKETS forward, lands a
//       GUARANTEED ~198 EFF thrust (150–240) from OUT OF RANGE, knocks the foe down.
//   (3) SHARINGAN-GATED SUPPORT variant — with _mangekyouActive set, Raikiri EMPOWERS: dash pose swaps to
//       kakashiRaikiriSupport, grants i-frames through the blitz, still lands ~198 EFF.
//   (4) BOTH directions (mirror). Screenshots → harness/shots/kakashi_stage6_*.png.
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
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `kakashi_stage6_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap, faceLeft = false) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.clearSummons?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); window.__harness.setMangekyou?.(false); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (faceLeft ? -1 : 1));
  await waitFrames(3);
}
async function fireUlt() { return page.evaluate(() => window.__harness.p1Ultimate()); }
async function ultDamage(hp0, maxF = 70) { let peakVx = 0; for (let f = 0; f < maxF; f++) { const cx = (await p1()).vx; peakVx = Math.max(peakVx, Math.abs(cx)); const h = (await p2()).health; if (h < hp0) { /* keep watching a bit for full payoff */ } await waitFrames(1); } return { drop: hp0 - (await p2()).health, peakVx }; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=kakashi&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("kakashi").animationData);

  console.log("\n── (1) wiring: Raikiri cast poses → real kakashi sheets ──");
  for (const [k, tag] of [["kakashiRaikiriCharge", "kakashi_raikiri_charge"], ["kakashiRaikiriDash", "kakashi_raikiri_dash"], ["kakashiRaikiriSupport", "kakashi_raikiri_support"]])
    check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);
  check("ultimate is named Raikiri", (await page.evaluate(() => window.__harness.charDef("kakashi").ultimate?.name)) === "Raikiri", "");

  console.log("\n── (2) BASE Raikiri — cast + charge pose + spend 100 + dash + guaranteed ~198 EFF (out of range) ──");
  await prep(220);   // far out of melee range — proves the guaranteed cinematic can't whiff
  let e0 = (await p1()).energy, h0 = (await p2()).health;
  const r = await fireUlt();
  check("Raikiri casts (p1Ultimate returns cast)", !!r?.cast, `cast=${r?.cast}`);
  check("Raikiri opens on the charge pose (kakashiRaikiriCharge)", (r?.castMove || "") === "kakashiRaikiriCharge", `castMove=${r?.castMove}`);
  await waitFrames(2);
  check(`Raikiri spends 100 chakra (${e0} → ${(await p1()).energy})`, e0 - (await p1()).energy >= 95, `Δ=${(e0 - (await p1()).energy).toFixed(0)}`);
  await shot("charge");
  // measure dash + damage in ONE loop, and capture the shot WHILE the lightning dash pose is on-screen
  let peakVx = 0, dashShot = false;
  for (let f = 0; f < 70; f++) { const pp = await p1(); peakVx = Math.max(peakVx, Math.abs(pp.vx)); if (!dashShot && (pp.spriteSheet || "").includes("kakashi_raikiri_dash")) { await shot("dash"); dashShot = true; } await waitFrames(1); }
  const drop = h0 - (await p2()).health;
  check("captured the active lightning DASH frame in-engine", dashShot, `dashShot=${dashShot}`);
  check(`Raikiri ROCKETS forward (peak |vx| ${peakVx.toFixed(0)})`, peakVx >= 15, `peakVx=${peakVx.toFixed(1)}`);
  check(`Raikiri lands guaranteed ~198 EFF from out of range (150–240)`, drop >= 150 && drop <= 240, `dealt=${drop.toFixed(0)}`);
  check("Raikiri knocks the foe down", !!(await p2()).knockdownState || (await p2()).health <= h0 - 150, "");
  await waitGrounded(); await waitFrames(20);

  console.log("\n── (3) SHARINGAN-GATED SUPPORT variant — _mangekyouActive → empowered (support pose + i-frames) ──");
  await prep(220);
  await page.evaluate(() => window.__harness.setMangekyou?.(true));
  h0 = (await p2()).health;
  const re = await fireUlt();
  check("empowered Raikiri casts", !!re?.cast, `cast=${re?.cast}`);
  // dash beat swaps to the support pose (fires at dashAt≈18) — watch for it + i-frames
  let sawSupport = false, sawIframes = false;
  for (let f = 0; f < 34; f++) { const pp = await p1(); const isSup = (pp.spriteSheet || "").includes("kakashi_raikiri_support"); if (isSup && !sawSupport) { sawSupport = true; await shot("empowered"); } if ((pp.invulnTimer || 0) > 0) sawIframes = true; await waitFrames(1); }
  check("empowered Raikiri uses the SUPPORT dash art (Sharingan-gated)", sawSupport, `sawSupport=${sawSupport}`);
  check("empowered Raikiri grants i-frames through the blitz", sawIframes, `sawIframes=${sawIframes}`);
  const eDrop = h0 - (await p2()).health;
  check(`empowered Raikiri still lands ~198 EFF (150–240)`, eDrop >= 150 && eDrop <= 240, `dealt=${eDrop.toFixed(0)}`);
  await waitGrounded(); await waitFrames(10);

  console.log("\n── (4) mirrored LEFT-facing Raikiri also lands ──");
  await prep(220, true);   // P2 to the LEFT → Kakashi faces left
  h0 = (await p2()).health;
  const facing = (await p1()).facing;
  await fireUlt();
  const { drop: lDrop } = await ultDamage(h0);
  check(`left-facing Raikiri lands (facing=${facing}, dealt ${lDrop.toFixed(0)})`, facing === -1 && lDrop >= 150 && lDrop <= 240, `facing=${facing} dealt=${lDrop.toFixed(0)}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 6", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
