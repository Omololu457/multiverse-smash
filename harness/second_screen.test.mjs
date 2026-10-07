// harness/second_screen.test.mjs — TWO-WINDOW verification of the opt-in companion second-screen.
// Boots the real game in one page (publisher ON via localStorage) + the real companion.html in a second
// page, same origin, and proves: (1) the companion RECEIVES meta+snapshot over BroadcastChannel and paints
// all 3 panels; (2) the link is ONE-WAY (a forged message FROM the companion cannot change game state);
// (3) the per-frame cost on the main window is negligible (frameMsAvg ON vs OFF + per-build micro-bench).
// Screenshots each panel. What it CANNOT test: a real physical 2nd monitor / OS display placement — stated.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json", ".woff2": "font/woff2" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const jsErrors = [];

async function bootGame(ctx, { companion }) {
  if (companion) await ctx.addInitScript(() => { try { localStorage.setItem("ms_second_screen", "1"); } catch (_) {} });
  const page = await ctx.newPage(); page.on("pageerror", e => jsErrors.push("GAME: " + e));
  await page.goto(`${base}/index.html?harness=1&debug=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.boot, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await sleep(600);
  return page;
}

try {
  // ── Page A: the GAME with the companion publisher enabled ──
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const game = await bootGame(ctx, { companion: true });

  // ── Page B: the real companion window (same origin → shares BroadcastChannel) ──
  const comp = await ctx.newPage(); comp.on("pageerror", e => jsErrors.push("COMPANION: " + e));
  await comp.goto(`${base}/index.html?view=companion`, { waitUntil: "load" });
  check("?view=companion redirects to the lightweight companion page", comp.url().endsWith("/companion.html"), comp.url());

  // Drive a move so the move-list highlight + snapshot carry live data, then let it settle.
  await game.evaluate(() => { try { window.__harness.narutoBarrage?.(); } catch (_) {} });
  await sleep(800);

  // ── (1) The companion RECEIVES data (dot goes live; idle screen hidden) ──
  const gotLive = await comp.waitForFunction(() => document.querySelector("#dot")?.classList.contains("live"), null, { timeout: 8000 }).then(() => true).catch(() => false);
  check("companion link goes LIVE (received snapshots over BroadcastChannel)", gotLive);

  // ── STAGE 3c: SPECTATOR panel paints timer + health + combo ──
  await comp.evaluate(() => document.querySelector('.tab[data-panel="spectator"]').click());
  // Wait for the roster META to arrive (a window opened mid-match syncs on the next ~0.5s meta resend).
  await comp.waitForFunction(() => [...document.querySelectorAll(".hp-name")].some(n => n.textContent === "Naruto"), null, { timeout: 5000 }).catch(() => {});
  await sleep(200);
  const spec = await comp.evaluate(() => {
    const clock = document.querySelector(".clock")?.textContent || "";
    const widths = [...document.querySelectorAll(".bar.hp>i")].map(i => parseFloat(i.style.width) || 0);
    const names = [...document.querySelectorAll(".hp-name")].map(n => n.textContent);
    return { clock, widths, names };
  });
  check("spectator shows a numeric round timer", /^\d+$/.test(spec.clock.trim()), `clock="${spec.clock}"`);
  check("spectator shows both fighters by display name", spec.names.includes("Naruto") && spec.names.includes("Sasuke"), spec.names.join(","));
  check("spectator health bars reflect real HP (width > 0)", spec.widths.length === 2 && spec.widths.every(w => w > 0), JSON.stringify(spec.widths));
  await comp.screenshot({ path: path.join(OUT, "SECONDSCREEN_spectator.png") });

  // ── STAGE 3a: LIVE MOVE LIST shows per-fighter moves with keyboard + gamepad inputs ──
  await comp.evaluate(() => document.querySelector('.tab[data-panel="movelist"]').click());
  await sleep(300);
  const ml = await comp.evaluate(() => {
    const cols = document.querySelectorAll(".ml-col");
    const names = [...document.querySelectorAll(".ml-name")].map(n => n.textContent);
    const moveRows = document.querySelectorAll(".ml-row").length;
    const kbChips = [...document.querySelectorAll(".chip:not(.pad):not(.seq)")].map(c => c.textContent).filter(Boolean);
    const padChips = [...document.querySelectorAll(".chip.pad")].map(c => c.textContent).filter(Boolean);
    const seqChips = document.querySelectorAll(".chip.seq").length;   // combo rows: a sequence, not per-button chips
    const moveRowsWithButtons = moveRows - seqChips;                  // non-combo move rows
    const sections = [...document.querySelectorAll(".ml-sec")].map(s => s.textContent);
    return { cols: cols.length, names, moveRows, moveRowsWithButtons, kbCount: kbChips.length, padCount: padChips.length, seqChips, sections: [...new Set(sections)], sampleKb: kbChips.slice(0, 3), samplePad: padChips.slice(0, 3) };
  });
  check("move list has a column per fighter", ml.cols === 2, `cols=${ml.cols}`);
  check("move list lists both fighters", ml.names.includes("Naruto") && ml.names.includes("Sasuke"), ml.names.join(","));
  check("move list has many move rows (Basics/Specials/Ultimate…)", ml.moveRows >= 10, `rows=${ml.moveRows}`);
  check("EVERY non-combo move shows a KEYBOARD input chip", ml.kbCount === ml.moveRowsWithButtons && ml.kbCount > 0, `kb=${ml.kbCount} moveRows=${ml.moveRowsWithButtons}`);
  check("EVERY non-combo move shows a GAMEPAD input chip", ml.padCount === ml.moveRowsWithButtons, `pad=${ml.padCount} moveRows=${ml.moveRowsWithButtons}`);
  check("combo rows show a sequence string", ml.seqChips >= 1, `seq=${ml.seqChips}`);
  console.log(`   move-list sample  kb=${JSON.stringify(ml.sampleKb)}  pad=${JSON.stringify(ml.samplePad)}`);
  check("sections include Specials + Ultimate", ml.sections.includes("Specials") && ml.sections.includes("Ultimate"), ml.sections.join(","));
  await comp.screenshot({ path: path.join(OUT, "SECONDSCREEN_movelist.png") });

  // ── STAGE 3b: TRAINING DASHBOARD (frame data / advantage / input history / last combo dmg) ──
  const trainOn = await game.evaluate(() => window.__harness.training?.().enabled);
  await comp.evaluate(() => document.querySelector('.tab[data-panel="training"]').click());
  await sleep(300);
  const tr = await comp.evaluate(() => {
    const cards = [...document.querySelectorAll(".card h3")].map(h => h.textContent);
    const hasDmg = !!document.querySelector(".big-dmg");
    const hasInputs = !!document.querySelector(".inp-hist");
    return { cards, hasDmg, hasInputs, note: document.querySelector("#panel-training .muted")?.textContent || "" };
  });
  check("training dashboard renders its cards (or a clear 'enter training' note)",
    (tr.cards.includes("Frame Data") && tr.cards.includes("Combo")) || /Training mode/i.test(tr.note), `trainOn=${trainOn} cards=${tr.cards.join("|")} note="${tr.note}"`);
  await comp.screenshot({ path: path.join(OUT, "SECONDSCREEN_training.png") });

  // ── (2) ONE-WAY proof: a forged message FROM the companion must NOT change game state ──
  const hp0 = await game.evaluate(() => window.__harness.p1().health);
  await comp.evaluate(() => { try { new BroadcastChannel("mv-companion").postMessage({ k: "snap", p1: { hp: 0, health: 0 }, hack: true }); } catch (_) {} });
  await sleep(300);
  const hp1 = await game.evaluate(() => window.__harness.p1().health);
  check("companion CANNOT write game state (forged channel message ignored by the game)", hp0 === hp1, `p1.health ${hp0} → ${hp1}`);

  // ── STAGE 5: PERFORMANCE — frameMsAvg with companion ON, per-build micro-bench, then OFF for comparison ──
  await sleep(1200);   // let the frame-ms ring buffer fill under the live publish
  const perfOn = await game.evaluate(() => window.__harness.perf());
  const bench = await game.evaluate(() => window.__harness.companionPerf(5000));
  check("companion confirmed ON for the measured run", perfOn.companionOn === true, JSON.stringify({ companionOn: perfOn.companionOn }));

  const ctxOff = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const gameOff = await bootGame(ctxOff, { companion: false });
  await sleep(1800);
  const perfOff = await gameOff.evaluate(() => window.__harness.perf());
  check("toggle OFF → companion not loaded (byte-identical path)", perfOff.companionOn === false, JSON.stringify({ companionOn: perfOff.companionOn }));

  const dOn = perfOn.frameMsAvg, dOff = perfOff.frameMsAvg, delta = dOn - dOff;
  console.log(`\n   PERF  frameMsAvg: OFF ${dOff.toFixed(3)}ms  ·  ON ${dOn.toFixed(3)}ms  ·  Δ ${delta.toFixed(3)}ms/frame  (samples on=${perfOn.frameMsSamples} off=${perfOff.frameMsSamples})`);
  console.log(`   PERF  per-snapshot build: ${bench.perBuildMs?.toFixed(4)}ms  ×10/sec = ${(bench.perBuildMs * 10).toFixed(3)}ms/sec added main-thread work\n`);
  check("per-snapshot build cost is sub-millisecond", bench.ok && bench.perBuildMs < 0.5, `perBuildMs=${bench.perBuildMs?.toFixed(4)}`);
  check("added per-frame cost is negligible (< 0.5ms vs ~16.6ms budget)", Math.abs(delta) < 0.5, `Δ=${delta.toFixed(3)}ms`);

  check("no JS errors on either window", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
} catch (e) {
  check("test crashed", false, String(e && e.stack || e));
} finally {
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
