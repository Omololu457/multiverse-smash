// harness/kakashi_stage5.mjs
// STAGE 5 evidence: Kakashi's TWO structurally-different Kuchiyose summons.
//   PAKKUN (Back+Special) — a LINGERING companion pug: persistent multi-hit assist that stays on the field.
//   NIN-DOGS (Fwd+Special) — a one-shot BURST: the 8-dog pack erupts, mauls briefly, then despawns.
// Verifies: each casts its own pose, spawns its own summon entity (own sheet), connects for damage, spends
// chakra — AND that they are structurally DIFFERENT (Pakkun lingers long after Nin-Dogs would be gone).
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
const summons = () => page.evaluate(() => window.__harness.summons());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `kakashi_stage5_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.clearSummons?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function waitSummon(id, maxF = 26) { for (let f = 0; f < maxF; f++) { const s = (await summons()).find(x => x.id === id); if (s) return s; await waitFrames(1); } return null; }
async function waitHit(hp0, maxF = 90) { for (let f = 0; f < maxF; f++) { const h = (await p2()).health; if (h < hp0) return hp0 - h; await waitFrames(1); } return 0; }
async function alive(id) { return !!(await summons()).find(x => x.id === id); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=kakashi`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const ad = await page.evaluate(() => window.__harness.charDef("kakashi").animationData);

  console.log("\n── (1) wiring: summon cast poses → real kakashi sheets ──");
  check("kakashiPakkunCast wired", (ad.kakashiPakkunCast?.sheet || "").includes("kakashi_pakkun_cast"), `sheet=${ad.kakashiPakkunCast?.sheet}`);
  check("kakashiNinDogsCast wired", (ad.kakashiNinDogsCast?.sheet || "").includes("kakashi_nindogs_cast"), `sheet=${ad.kakashiNinDogsCast?.sheet}`);

  console.log("\n── (2) NIN-DOGS (Fwd) — one-shot BURST: cast + pack summon + connect + SHORT-LIVED ──");
  await prep(120);
  let e0 = (await p1()).energy, h0 = (await p2()).health;
  const nres = await fireDir("F");
  check("Nin-Dogs casts kakashiNinDogsCast", nres?.cast === "kakashiNinDogsCast", `cast=${nres?.cast}`);
  const ns = await waitSummon("kakashiNinDogs");
  check("Nin-Dogs spawns the kakashiNinDogs pack summon", !!ns, ns ? `x=${Math.round(ns.x)} life=${ns.lifetime}` : "none");
  check("Nin-Dogs pack carries its own sheet (nindogs_pack)", !!ns && (ns.sheet || "").includes("kakashi_nindogs_pack"), `sheet=${ns?.sheet}`);
  await waitFrames(2); await shot("nindogs");
  const nDrop = await waitHit(h0);
  check(`Nin-Dogs pack connects (dmg ${nDrop.toFixed(0)})`, nDrop > 0, "");
  check(`Nin-Dogs spends ~40 chakra (${e0} → ${(await p1()).energy})`, e0 - (await p1()).energy >= 34, `Δ=${(e0 - (await p1()).energy).toFixed(0)} (cost 40 minus a few frames of regen)`);
  // burst = short duration (~66f): should be GONE well before Pakkun's lifespan
  for (let f = 0; f < 100; f++) { if (!(await alive("kakashiNinDogs"))) break; await waitFrames(1); }
  const nGone = !(await alive("kakashiNinDogs"));
  check("Nin-Dogs burst DESPAWNS quickly (short-lived, not a companion)", nGone, "still alive after ~100f");

  console.log("\n── (3) PAKKUN (Back) — LINGERING companion: cast + pug summon + connect + PERSISTS ──");
  await prep(70);
  e0 = (await p1()).energy; h0 = (await p2()).health;
  const pres = await fireDir("B");
  check("Pakkun casts kakashiPakkunCast", pres?.cast === "kakashiPakkunCast", `cast=${pres?.cast}`);
  const ps = await waitSummon("kakashiPakkun");
  check("Pakkun spawns the kakashiPakkun companion", !!ps, ps ? `x=${Math.round(ps.x)} life=${ps.lifetime}` : "none");
  check("Pakkun carries its own pug sheet (kakashi_pakkun)", !!ps && (ps.sheet || "").includes("kakashi_pakkun"), `sheet=${ps?.sheet}`);
  check("Pakkun has a LONG lifetime (lingering companion, ≥200f)", !!ps && ps.lifetime >= 200, `lifetime=${ps?.lifetime}`);
  await waitFrames(4); await shot("pakkun");
  const pDrop = await waitHit(h0, 120);
  check(`Pakkun companion connects (dmg ${pDrop.toFixed(0)})`, pDrop > 0, "");
  check(`Pakkun spends ~30 chakra (${e0} → ${(await p1()).energy})`, e0 - (await p1()).energy >= 25, `Δ=${(e0 - (await p1()).energy).toFixed(0)} (cost 30 minus a few frames of regen)`);
  // companion still on the field after 100 frames (a burst would be gone) → structurally different
  await waitFrames(100);
  check("Pakkun PERSISTS on the field (lingering, unlike the Nin-Dogs burst)", await alive("kakashiPakkun"), "despawned early");

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
