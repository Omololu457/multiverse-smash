// harness/gotenks_stage5.mjs — STAGE 5: Gotenks's ULTIMATE "Super Ghost Kamikaze Attack" (executeGotenksUltimate).
// The sheet's confirmed signature finisher. INLINE freeze-cinematic on the LIVE fighter (no duplicate): arms-
// raised windup (gotenksGhostWind) → ghost-throw pose (gotenksGhostThrow) → a squad of REAL kamikaze GHOSTS
// (gotenks_ghost_uniform sprites) flies at the frozen foe and self-destructs. Asserts: (1) casts + spends 100
// meter, (2) cast pose resolves the windup then throw sheet (no box), (3) ghost projectiles spawn (real art),
// (4) lands GUARANTEED scaled damage (~198 EFF from 330 raw) OUT of melee range (sure-hit), (5) foe frozen.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `gotenks_stage5_${name}.png`) }); }
async function waitCast(move, maxF = 24) { let mv = await p1(); for (let f = 0; f < maxF && !((mv.spriteSheet || "").includes(move)); f++) { await waitFrames(1); mv = await p1(); } return mv; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=gotenks`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());   // boot() fills p1.energy to max
  await waitFrames(5);
  await waitGrounded();

  // Position the dummy OUT of melee range → proves the ult is a guaranteed sure-hit (range-independent).
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 160); await waitFrames(2);

  console.log("\n── ULTIMATE: Super Ghost Kamikaze Attack ──");
  const en0 = (await p1()).energy;
  const hp0 = (await p2()).health;
  // Cast + snapshot windup-sheet / hitstop / energy in ONE round-trip at the cast instant (the windup pose is
  // only 16 frames — fleeting vs page round-trip latency, so it must be sampled synchronously with the cast).
  const snap = await page.evaluate(() => {
    const res = window.__harness.p1Ultimate();
    const a = window.__harness.p1(), b = window.__harness.p2();
    return { cast: !!res?.cast, castMove: res?.castMove || null, sheet: a.spriteSheet || null, en: a.energy, oppHitstop: b.hitstop || 0 };
  });
  check("ult casts", snap.cast === true, `cast=${snap.cast}`);
  check("cast pose = gotenksGhostWind (arms-raised windup)", snap.castMove === "gotenksGhostWind", `castMove=${snap.castMove}`);
  check("spends ~100 meter", Math.round(en0 - snap.en) >= 98, `energy ${Math.round(en0)} → ${Math.round(snap.en)}`);
  check("target frozen at cast (hitstop > 0)", snap.oppHitstop > 0, `hitstop=${snap.oppHitstop}`);
  // NB: the arms-raised windup pose (gotenksGhostWind) is proven via castMove (above) + the data-contract sheet
  // wiring (below); its RENDER is only ~6 frames (windup ends at frame 16, first ~10 held by the impact hitstop)
  // so it races page round-trip latency — captured for visual sign-off instead of a flaky per-frame assertion.
  await waitFrames(4); await shot("windup");

  // Collect render sheets + projectiles across the rest of the cinematic — assert the throw pose + ghosts appear.
  const sheets = new Set(); let sawGhost = false, ghostHasSheet = false;
  for (let f = 0; f < 30; f++) {
    const mv = await p1(); if (mv.spriteSheet) sheets.add(mv.spriteSheet);
    const pr = await projectiles(); const g = pr.find(p => (p.name || "").includes("gotenksGhost"));
    if (g) { sawGhost = true; if (/gotenks_ghost_uniform/.test(g.sheet || "")) ghostHasSheet = true; }
    if (f === 14) await shot("ghosts");
    await waitFrames(1);
  }
  const S = [...sheets].join(" ");
  check("sprite swaps → gotenks_ghostthrow_uniform (ghost-command pose)", /gotenks_ghostthrow_uniform/.test(S), `sheets=${S}`);
  check("spawns kamikaze GHOST projectiles", sawGhost, "");
  check("ghost projectile carries real ghost art (gotenks_ghost_uniform)", ghostHasSheet, "");

  // let the 3 guaranteed beats resolve
  await waitFrames(56);
  const hp1 = (await p2()).health;
  const dealt = hp0 - hp1;
  check("guaranteed damage lands from out of melee range (sure-hit)", dealt > 0, `hp ${hp0} → ${hp1} (−${dealt.toFixed(0)})`);
  check("payoff in top-ult band (~198 EFF; 150–240)", dealt >= 150 && dealt <= 240, `dealt=${dealt.toFixed(0)}`);

  console.log("\n── data contract ──");
  const def = await page.evaluate(() => window.__harness.charDef("gotenks"));
  check("gotenksGhostWind wired to real gotenks sheet", (def?.animationData?.gotenksGhostWind?.sheet || "").includes("gotenks_ghostwind_uniform"), `sheet=${def?.animationData?.gotenksGhostWind?.sheet}`);
  check("ultimate = 'Super Ghost Kamikaze Attack', cost 100", def?.ultimate?.name === "Super Ghost Kamikaze Attack" && def?.ultimate?.cost === 100, `ult=${JSON.stringify(def?.ultimate)}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Gotenks Stage 5: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
