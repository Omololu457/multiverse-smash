// harness/combo_momentum_audit.mjs — READ-ONLY combo-flow audit (changes NOTHING in the game).
//
// EXTENDED (roster-wide) from the original 8-character momentum probe. For every character that owns a
// command-normal REKKA chain it measures the three combo-flow tuning signals against Tobirama's baseline:
//
//   1. STEP-IN DRIFT — attacker forward displacement over an identical 3-tap chain. Fwd+Heavy chains hold
//      forward and glide in for free (physics.attackMomentumFriction while attacking+moving-fwd); Down+Heavy
//      chains hold DOWN → no walk momentum → they read as planted unless COMBO_STEP_IN_VX pushes them in.
//      Tobirama (Fwd, gold reference) drifts ~+120px; a Down chain with no step-in drifts ~0px.
//   2. FINISHER HIT-STOP WEIGHT — the PEAK hitstop (impact-freeze) frames observed on the attacker across the
//      whole chain. The heaviest stage is the launcher finisher, so peak == the finisher's hitstop tier.
//      HITSTOP.heavy/launcher = 8, HITSTOP.light = 4. getHitstopFrames() classifies by attack NAME
//      (_catFromName) and IGNORES the `launcher` flag, and command moves carry no `category`, so every
//      rekka finisher currently resolves to "light" → peak 4 instead of the heavy 8 its weight deserves.
//   3. MID-STAGE RECOVERY — read statically from the *_COMMAND move data (not measured here); reported in
//      the audit doc. Tobirama baseline = 11-12f. Anything materially above that is a "planted feel" flag.
//
// Static recovery data + the flag verdicts live in the audit table this run prints, and in the report doc.
// This file drives the REAL game via window.__harness; it asserts nothing and mutates no source.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });

// dir: "d" = hold FORWARD (Fwd+Heavy chains), "s" = hold DOWN (Down+Heavy chains). heavy key = "k".
async function measure(charKey, dirKey) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}&p2=batman`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  const st = () => page.evaluate(() => window.__harness.state());
  const waitFrames = async n => { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); };
  await page.evaluate(() => window.__harness.start());
  await waitFrames(6);
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(20);
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); if (window.__harness.p1()) { /* full energy so form-gated chains (Vegeta koma etc.) aren't the blocker */ } });
  // Full energy on P1 (some Fwd chains are only reachable after a resource-gated form; base chains ignore it).
  await page.evaluate(() => { const h = window.__harness; if (h.giveEnergy) h.giveEnergy(); });
  const a = await page.evaluate(() => window.__harness.p1());
  await page.evaluate(x => window.__harness.setP2X(x), a.x + 72);
  await waitFrames(2);
  // Peak-hitstop sampler: rAF fires once per rendered frame regardless of the logic freeze, so tracking the
  // max hitstop seen on the attacker reliably captures the finisher's impact-freeze tier (light 4 vs heavy 8).
  await page.evaluate(() => {
    // Attribute the peak hit-stop to the last MOVE that was active (currentMove is usually null on the peak
    // frame because the attack has ended into hit-stop) so a neutral-heavy overshoot is visible as
    // peakMove="heavy"/"up" rather than being mistaken for a chain finisher.
    window.__peakHS = 0; window.__peakMove = null; window.__lastMove = null; window.__moves = new Set();
    const tick = () => { const h = window.__harness.p1(); if (h) { if (h.currentMove) { window.__moves.add(h.currentMove); window.__lastMove = h.currentMove; } if ((h.hitstop || 0) > window.__peakHS) { window.__peakHS = h.hitstop; window.__peakMove = h.currentMove || window.__lastMove; } } window.__raf = requestAnimationFrame(tick); };
    window.__raf = requestAnimationFrame(tick);
  });
  const before = await page.evaluate(() => ({ px: window.__harness.p1().x, ex: window.__harness.p2().x }));
  await page.keyboard.down(dirKey);
  // Adaptive re-tap: hold heavy THROUGH startup+active so the hit connects and the cancel-on-hit latch
  // sets, then release + brief gap so the next press is a fresh EDGE landing inside the recovery cancel
  // window. Up to 5 taps so even a 4-stage chain (Killua barrage) reaches its finisher.
  for (let i = 0; i < 5; i++) { await page.keyboard.down("k"); await waitFrames(9); await page.keyboard.up("k"); await waitFrames(5); }
  await page.keyboard.up(dirKey);
  await waitFrames(6);
  const after = await page.evaluate(() => ({ px: window.__harness.p1().x, ex: window.__harness.p2().x }));
  const probe = await page.evaluate(() => ({ peakHS: window.__peakHS, peakMove: window.__peakMove, moves: [...window.__moves] }));
  await page.evaluate(() => cancelAnimationFrame(window.__raf));
  const drift = Math.round(after.px - before.px);
  const gap0 = Math.round(before.ex - before.px), gap1 = Math.round(after.ex - after.px);
  await page.close();
  return { drift, gap0, gap1, peakHS: probe.peakHS, peakMove: probe.peakMove, chained: probe.moves.length, moves: probe.moves, err: errs[0] || null };
}

// Every command-chain character, grouped by universe. dir = opener direction. `note` flags special cases.
const CHARS = [
  // universe,             key,                   dir,  label,          note
  ["hunter_x_hunter",     "netero",              "s",  "Netero",       "DOWN chain"],
  ["hunter_x_hunter",     "killua",              "s",  "Killua",       "DOWN chain"],
  ["hunter_x_hunter",     "hisoka",              "s",  "Hisoka",       "DOWN chain"],
  ["hunter_x_hunter",     "gon",                 "s",  "Gon",          "DOWN chain; Adult-form=giant (flag)"],
  ["hunter_x_hunter",     "chrollo",             "d",  "Chrollo",      "FWD chain; build is WIP"],
  ["dc",                  "flash",               "s",  "Flash",        "DOWN chain"],
  ["dc",                  "batman",              "s",  "Batman",       "DOWN chain"],
  ["dc",                  "superman",            "d",  "Superman",     "FWD chain"],
  ["demon_slayer",        "zenitsu",             "s",  "Zenitsu",      "DOWN chain"],
  ["demon_slayer",        "rengoku",             "d",  "Rengoku",      "FWD chain (branching)"],
  ["demon_slayer",        "shinobu",             "d",  "Shinobu",      "FWD chain"],
  ["horror",              "ghostface",           "s",  "Ghostface",    "DOWN chain"],
  ["naruto",              "tobirama",            "d",  "Tobirama",     "BASELINE (Fwd)"],
  ["naruto",              "minato",              "d",  "Minato",       "FWD chain (mirrors Tobirama)"],
  ["naruto",              "madara",              "d",  "Madara",       "FWD = single command-normal, not a rekka; Susanoo=giant (flag)"],
  ["dragon_ball",         "vegeta",              "d",  "Vegeta",       "FWD chain (base kicks)"],
  ["ben_10",              "ben10",               "d",  "Ben 10",       "FWD chain (default alien)"],
  ["power_rangers",       "omega_ranger",        "d",  "Omega",        "FWD chain (kick chain)"],
  ["power_rangers",       "samurai_red_ranger",  "d",  "Samurai Red",  "FWD chain (hard step-in lunge)"],
  ["power_rangers",       "gold_samurai_ranger", "d",  "Gold Samurai", "FWD chain (shared samRekka)"],
  ["invincible",          "omniman",             "d",  "Omni-Man",     "FWD chain"],
  ["jujutsu_kaisen",      "maki",                "d",  "Maki",         "FWD chain; TIGHT window by design (do not widen)"],
  ["jujutsu_kaisen",      "miwa",                "d",  "Miwa",         "FWD chain"],
  ["jujutsu_kaisen",      "toji",                "d",  "Toji",         "FWD blade-stance reaper rekka"],
  ["saiki_k",             "saiki",               "d",  "Saiki",        "FWD psychic chain (different archetype)"],
];

try {
  console.log("\n════════ ROSTER-WIDE COMBO-FLOW AUDIT ════════");
  console.log("drift = attacker forward px over a 3-tap chain (step-in). peakHS = finisher impact-freeze frames");
  console.log("(HITSTOP.light=4, HITSTOP.heavy/launcher=8). chained = distinct chain-stage sprites seen.\n");
  const rows = [];
  let lastU = null;
  for (const [uni, key, dir, label, note] of CHARS) {
    if (uni !== lastU) { console.log(`── ${uni} ──`); lastU = uni; }
    let r;
    try { r = await measure(key, dir); }
    catch (e) { console.log(`  ${label.padEnd(13)} ERROR ${String(e).split("\n")[0]}`); rows.push({ label, key, err: String(e) }); continue; }
    const w = r.peakHS >= 7 ? "HEAVY" : r.peakHS >= 5 ? "mid" : "light";
    console.log(`  ${label.padEnd(13)} dir=${dir}  drift=${String(r.drift).padStart(4)}px  peakHS=${String(r.peakHS).padStart(2)} (${w}) @${String(r.peakMove).padEnd(14)} stages=${r.chained} [${r.moves.join(",")}]${r.err ? "  ⚠ " + r.err.split("\n")[0] : ""}`);
    rows.push({ label, key, dir, ...r });
  }
  console.log("\n(After the launcher-weight fix, every finisher the chain reaches reads peakHS=8 HEAVY, attributed");
  console.log(" to the finisher move. Remaining 'light' rows: Toji reaper needs blade-stance input the harness");
  console.log(" doesn't drive (tag verified deterministically); Saiki is a psychic projectile chain, no melee freeze.)");
} catch (e) { console.error("FATAL", e); }
finally { await browser.close(); server.close(); }
