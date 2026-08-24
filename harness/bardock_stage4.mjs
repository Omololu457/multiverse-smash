// harness/bardock_stage4.mjs
// STAGE 4 evidence: Bardock's small MELEE special kit (executeBardockSpecial). ★NO ranged/energy special
// exists on the sheet (BARDOCK_ASSET_MAP.md item 4) → none invented; the offensive special is MELEE.
// (1) WIRING — the two cast/attack actions point at real reslice'd sheets (no box).
// (2) REBELLION RUSH (neutral GROUND) — a committed dashing SWORD lunge: sets move bardockRebellion, renders
//     its sheet, LUNGES forward, CONNECTS damage on P2, and COSTS Ki. NO projectile (melee).
// (3) REBELLION RUSH (air) — airborne cast works.
// (4) KI CHARGE (Down) — the golden ki-orb as a resource build: casts bardockKiCharge, REFILLS Ki over the
//     window, deals NO damage. Answers the S0 ki-orb role = resource build.
// Screenshots → harness/shots/bardock_stage4_*.png. See BARDOCK_ASSET_MAP.md §S4.
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
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `bardock_stage4_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=bardock`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("bardock").animationData);

  console.log("\n── (1) wiring: special cast/attack actions → real bardock_ sheets (no box) ──");
  for (const [k, tag] of [["bardockRebellion", "bardock_rebellion_uniform"], ["bardockKiCharge", "bardock_kicharge_uniform"]])
    check(`${k} wired → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);

  console.log("\n── (2) Rebellion Rush (neutral GROUND) — dashing SWORD lunge: connects + lunges + costs Ki, NO projectile ──");
  await prep(70);
  const x0 = (await p1()).x; const h0 = (await p2()).health; const e0 = (await p1()).energy;
  const rres = await fireDir(null);
  check("Rebellion Rush sets move bardockRebellion", rres?.move === "bardockRebellion", `move=${rres?.move} cast=${rres?.cast}`);
  let sawSheet = false; for (let i = 0; i < 6; i++) { const a = await p1(); if ((a.spriteSheet || "").includes("bardock_rebellion_uniform")) sawSheet = true; await waitFrames(2); }
  await shot("rebellion");
  await waitFrames(10);
  const dealt = h0 - (await p2()).health; const lunged = (await p1()).x - x0; const spent = e0 - (await p1()).energy;
  const projSeen = await page.evaluate(() => (window.__harness.projectiles?.() || []).length);
  check("Rebellion Rush renders bardock_rebellion_uniform", sawSheet, "");
  check(`Rebellion Rush connects (P2 dmg ${dealt.toFixed(0)})`, dealt > 0, `dmg=${dealt}`);
  check(`Rebellion Rush lunges forward (Δx=${lunged.toFixed(0)})`, Math.abs(lunged) > 4, `Δx=${lunged}`);
  check(`Rebellion Rush costs Ki (Δ ${spent.toFixed(0)})`, spent > 0, `e0=${e0}`);
  check("Rebellion Rush spawns NO projectile (melee, not ranged)", projSeen === 0, `proj=${projSeen}`);
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (3) Rebellion Rush (air) — airborne cast works ──");
  await prep(70);
  await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(5);
  const ares = await fireDir(null);
  check("air Rebellion Rush sets move bardockRebellion", ares?.move === "bardockRebellion", `move=${ares?.move}`);
  await shot("rebellion_air");
  await waitGrounded(); await waitFrames(6);

  console.log("\n── (4) Ki Charge (Down) — golden ki-orb resource build: refills Ki, deals NO damage ──");
  await prep(150);
  await page.evaluate(() => window.__harness.setEnergy?.(40));   // drain so there is Ki to build
  await waitFrames(2);
  const eC0 = (await p1()).energy; const hC0 = (await p2()).health;
  const cres = await fireDir("D");
  check("Ki Charge casts bardockKiCharge", cres?.cast === "bardockKiCharge", `cast=${cres?.cast}`);
  await shot("kicharge");
  await waitFrames(40);   // let the gather window grant Ki
  const eC1 = (await p1()).energy;
  check(`Ki Charge REFILLS Ki (Δ +${(eC1 - eC0).toFixed(0)})`, eC1 > eC0 + 5, `e0=${eC0} e1=${eC1}`);
  check("Ki Charge deals NO damage to P2 (resource build, no hit)", (await p2()).health >= hC0 - 0.01, `p2 h0=${hC0} h1=${(await p2()).health}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
