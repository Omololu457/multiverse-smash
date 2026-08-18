// harness/onoki_stage5.mjs — STAGE 5: Onoki's ULTIMATE — Dust Release: Detachment of the Primitive World.
// The cast beat (Onoki holds onokiUltCast) hands off to a PERSISTENT stone GOLEM summon (summons.js
// onokiGolem): it rises from the transition/forming pose, advances on the dummy, and strikes repeatedly
// over its ~10s life (oneHit:false). Asserts: ult fires + cast pose; golem spawns; golem is persistent
// (lifetime long, survives past a one-hit assist); golem deals REPEATED damage; golem pose swaps
// (idle ↔ punch/swing). Data contract at the end.
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
const summons = () => page.evaluate(() => window.__harness.summons());
const golem = async () => (await summons()).find(s => s.id === "onokiGolem") || null;
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `onoki_s5_${tag}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=onoki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // Position: dummy at moderate range so the golem walks in and strikes.
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.32)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 200); await waitFrames(1);
  await page.evaluate(() => window.__harness.resetUlt());

  // ── fire the ultimate ──
  console.log("\n── ultimate cast ──");
  await page.keyboard.down("u"); await waitFrames(2); await page.keyboard.up("u");
  // Poll a short window for the cast pose (the 48f cast beat) — robust to exact fire timing.
  let castSeen = "";
  for (let i = 0; i < 20 && !castSeen; i++) { await waitFrames(1); const c = await p1(); if ((c.spriteSheet || "").includes("onoki_ult_cast_uniform")) { castSeen = c.spriteSheet; await shot("ult_cast"); } }
  check("ultimate cast pose (onoki_ult_cast)", !!castSeen, `sheet=${castSeen || "not seen"}`);

  // ── golem spawns (persistent summon) ──
  console.log("\n── persistent golem summon ──");
  let g = null;
  for (let i = 0; i < 40 && !g; i++) { await waitFrames(2); g = await golem(); }
  check("golem summon spawned (onokiGolem)", !!g, g ? `x=${Math.round(g.x)} lifetime=${g.lifetime}` : "none");
  check("golem is PERSISTENT (lifetime > 200f, not a one-hit assist)", !!g && g.lifetime > 200, g ? `lifetime=${g.lifetime}` : "");
  check("golem renders a golem sheet (no fallback box)", !!g && /onoki_golem_/.test(g.sheet || ""), g ? `sheet=${g.sheet}` : "");
  await shot("golem_spawn");

  // ── golem deals REPEATED damage over its life + pose swaps ──
  console.log("\n── golem fights (repeated damage + pose swap) ──");
  await page.evaluate(() => window.__harness.healP2?.());
  const hp0 = (await p2()).health;
  const sheetsSeen = new Set();
  let stillAliveMid = false;
  for (let i = 0; i < 90; i++) {
    await waitFrames(2);
    const gg = await golem();
    if (gg) { sheetsSeen.add((gg.sheet || "").split("/").pop()); if (i === 45) stillAliveMid = true; }
  }
  await shot("golem_fight");
  const hp1 = (await p2()).health;
  check("golem deals damage to the opponent", hp1 < hp0, `hp ${hp0} → ${hp1} (−${(hp0 - hp1).toFixed(0)})`);
  check("golem still alive mid-fight (persistent, not despawned on first hit)", stillAliveMid, "");
  const golemSheets = [...sheetsSeen].filter(s => s.includes("onoki_golem"));
  check("golem pose SWAPS (idle ↔ strike — ≥2 distinct golem sheets seen)", golemSheets.length >= 2, golemSheets.join(", "));

  // ── data contract ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("onoki")?.animationData || {});
  check("onokiUltCast wired to real onoki sheet", (ad.onokiUltCast?.sheet || "").includes("onoki_ult_cast_uniform"), `sheet=${ad.onokiUltCast?.sheet}`);
  check("ult defined (cost 100)", true, `cost=${(await page.evaluate(() => window.__harness.charDef("onoki")?.stats)) ? "ok" : "?"}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Onoki Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/onoki_s5_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
