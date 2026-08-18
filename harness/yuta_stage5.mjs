// harness/yuta_stage5.mjs — STAGE 5: Yuta's ULTIMATE — "Rika's Invocation" (AI assist-ally, owner decision #8).
// The invocation cast (Yuta holds yutaUltCast) hands off to a PERSISTENT AI RIKA assist (summons.js rikaAssist):
// she emerges, advances on the dummy, and strikes repeatedly over her ~6s life (oneHit:false). Asserts: ult
// fires + cast pose; Rika spawns; Rika is persistent (long lifetime, not a one-hit assist); Rika deals REPEATED
// damage; Rika pose swaps (idle ↔ reach/screech). Deterministic via __harness.p1Ultimate. Balance note: per-hit
// damage is ×0.60-scaled (the Megumi-flagged summon shape must stay scaled).
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
const rika = async () => (await summons()).find(s => s.id === "rikaAssist") || null;
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `yuta_s5_${tag}.png`) }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=yuta`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // Position: dummy at moderate range so Rika walks in and strikes.
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.32)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 200); await waitFrames(1);
  await page.evaluate(() => window.__harness.setP1Energy(200));   // full Cursed Energy → afford the 100-cost ult

  // ── fire the ultimate ──
  console.log("\n── ultimate cast (Rika's Invocation) ──");
  const res = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ultimate casts (yutaUltCast)", res?.cast === true && res?.castMove === "yutaUltCast", `cast=${res?.cast} castMove=${res?.castMove}`);
  let castSeen = "";
  for (let i = 0; i < 20 && !castSeen; i++) { const c = await p1(); if ((c.spriteSheet || "").includes("yuta_ultcast_uniform")) { castSeen = c.spriteSheet; await shot("ult_cast"); } await waitFrames(1); }
  check("ultimate cast pose renders (yuta_ultcast)", !!castSeen, `sheet=${castSeen || "not seen"}`);

  // ── Rika spawns (persistent AI assist) ──
  console.log("\n── persistent Rika assist ──");
  let g = null;
  for (let i = 0; i < 40 && !g; i++) { await waitFrames(2); g = await rika(); }
  check("Rika assist spawned (rikaAssist)", !!g, g ? `x=${Math.round(g.x)} lifetime=${g.lifetime}` : "none");
  check("Rika is PERSISTENT (lifetime > 200f, not a one-hit assist)", !!g && g.lifetime > 200, g ? `lifetime=${g.lifetime}` : "");
  check("Rika renders a rika sheet (no fallback box)", !!g && /rika_/.test(g.sheet || ""), g ? `sheet=${g.sheet}` : "");
  await shot("rika_spawn");

  // ── Rika fights: repeated damage + pose swaps ──
  console.log("\n── Rika fights (repeated damage + pose swap) ──");
  await page.evaluate(() => window.__harness.healP2?.());
  const hp0 = (await p2()).health;
  const sheetsSeen = new Set();
  // No per-frame heal: let damage ACCUMULATE (P2 has 1150 HP, well above ~6×33) and count each fresh drop
  // as a distinct strike. Rika's interval is 50f → over ~220 frames she should land several hits.
  let stillAliveMid = false, hitCount = 0, lastHp = hp0;
  for (let i = 0; i < 110; i++) {
    await waitFrames(2);
    const gg = await rika();
    if (gg) { sheetsSeen.add((gg.sheet || "").split("/").pop()); if (i === 55) stillAliveMid = true; }
    const hp = (await p2()).health;
    if (hp < lastHp - 1) { hitCount++; }
    lastHp = hp;
  }
  await shot("rika_fight");
  const totalDmg = hp0 - (await p2()).health;
  check("Rika deals damage to the opponent", totalDmg > 0, `total −${totalDmg.toFixed(0)} over ${hitCount} drop(s)`);
  check("Rika lands MULTIPLE strikes (persistent striker, not one-hit)", hitCount >= 2, `distinct strikes=${hitCount}, total −${totalDmg.toFixed(0)}`);
  check("Rika still alive mid-fight (persistent)", stillAliveMid, "");
  const rikaSheets = [...sheetsSeen].filter(s => s.includes("rika_"));
  check("Rika pose SWAPS (idle ↔ reach/screech — ≥2 distinct rika sheets)", rikaSheets.length >= 2, rikaSheets.join(", "));

  // ── data contract ──
  console.log("\n── data contract ──");
  const def = await page.evaluate(() => window.__harness.charDef("yuta"));
  const ad = def?.animationData || {};
  check("yutaUltCast wired to real yuta sheet", (ad.yutaUltCast?.sheet || "").includes("yuta_ultcast_uniform"), `sheet=${ad.yutaUltCast?.sheet}`);
  check("ultimate defined: Rika's Invocation, cost 100", def?.ultimate?.name === "Rika's Invocation" && def?.ultimate?.cost === 100, `ult=${JSON.stringify(def?.ultimate || null)}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Yuta Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/yuta_s5_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
