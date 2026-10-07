// harness/second_screen.test.mjs — TWO-WINDOW verification of the opt-in companion (1v1 baseline, new
// player-slot UI). Boots the real game (publisher ON via localStorage) + the real companion page, same
// origin, and proves: the companion RECEIVES meta+snapshot over BroadcastChannel; the SPECTATOR view shows
// both players; a PLAYER FOCUS view prioritizes that player's move list + vitals (hp/ult/combo/advantage);
// the link is ONE-WAY (a forged message can't change game state); the per-frame cost is negligible
// (frameMsAvg ON vs OFF + per-build micro-bench). Screenshots. (4-player FFA is covered in the FFA test.)
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
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const game = await bootGame(ctx, { companion: true });

  // companion window, same origin → shares BroadcastChannel
  const comp = await ctx.newPage(); comp.on("pageerror", e => jsErrors.push("COMPANION: " + e));
  await comp.goto(`${base}/index.html?view=companion`, { waitUntil: "load" });
  check("?view=companion redirects to the lightweight companion page", comp.url().endsWith("/companion.html"), comp.url());

  await game.evaluate(() => { try { window.__harness.narutoBarrage?.(); } catch (_) {} });
  const gotLive = await comp.waitForFunction(() => document.querySelector("#dot")?.classList.contains("live"), null, { timeout: 8000 }).then(() => true).catch(() => false);
  check("companion link goes LIVE (received snapshots over BroadcastChannel)", gotLive);
  await comp.waitForFunction(() => [...document.querySelectorAll(".pbtn")].some(b => /Naruto/.test(b.textContent)), null, { timeout: 5000 }).catch(() => {});

  // ── Player picker built from the snapshot: SPECTATOR + P1 + P2 ──
  const picker = await comp.evaluate(() => [...document.querySelectorAll(".pbtn")].map(b => b.textContent));
  check("player picker shows SPECTATOR + P1 + P2", picker.some(t => /SPECTATOR/.test(t)) && picker.some(t => /^P1/.test(t)) && picker.some(t => /^P2/.test(t)), picker.join(" | "));

  // ── SPECTATOR view (default) — both players, timer, combo ──
  await comp.evaluate(() => [...document.querySelectorAll(".pbtn")].find(b => /SPECTATOR/.test(b.textContent)).click());
  await sleep(300);
  const spec = await comp.evaluate(() => ({
    clock: document.querySelector(".clock")?.textContent || "",
    cards: [...document.querySelectorAll(".sc-name")].map(n => n.textContent),
    widths: [...document.querySelectorAll(".spec-card .bar.hp>i")].map(i => parseFloat(i.style.width) || 0)
  }));
  check("spectator shows a numeric round timer (seconds)", /^\d+$/.test(spec.clock.trim()) && +spec.clock <= 90, `clock="${spec.clock}"`);
  check("spectator shows both fighters by name", spec.cards.some(c => /Naruto/.test(c)) && spec.cards.some(c => /Sasuke/.test(c)), spec.cards.join(","));
  check("spectator health bars reflect real HP", spec.widths.length === 2 && spec.widths.every(w => w > 0), JSON.stringify(spec.widths));
  await comp.screenshot({ path: path.join(OUT, "SECONDSCREEN_spectator.png") });

  // ── PLAYER FOCUS (P1) — move list + vitals, other fighter secondary ──
  await comp.evaluate(() => { try { window.__harness?.narutoBarrage?.(); } catch (_) {} });   // (no-op in companion; triggered on game below)
  await game.evaluate(() => { try { window.__harness.narutoBarrage?.(); } catch (_) {} });
  await comp.evaluate(() => [...document.querySelectorAll(".pbtn")].find(b => /^P1/.test(b.textContent)).click());
  await sleep(400);
  const focus = await comp.evaluate(() => {
    const name = document.querySelector(".focus-name")?.textContent || "";
    const vlabels = [...document.querySelectorAll(".stat-label")].map(s => s.textContent);
    const vchips = [...document.querySelectorAll(".vchip .vc-l")].map(s => s.textContent);
    const kb = [...document.querySelectorAll(".focus-moves .chip:not(.pad):not(.seq)")].length;
    const pad = [...document.querySelectorAll(".focus-moves .chip.pad")].length;
    const others = [...document.querySelectorAll(".mini-name")].map(n => n.textContent);
    const ultBar = !!document.querySelector(".bar.en");
    return { name, vlabels, vchips, kb, pad, others, ultBar };
  });
  check("P1 focus shows that player first (name = Naruto)", /Naruto/.test(focus.name), focus.name);
  check("P1 focus shows vitals: Health + Ultimate Meter bars", focus.vlabels.includes("Health") && focus.vlabels.includes("Ultimate Meter"), focus.vlabels.join(","));
  check("P1 focus shows Combo + Dash CD + Ult CD chips", focus.vchips.includes("Combo") && focus.vchips.includes("Dash CD") && focus.vchips.includes("Ult CD"), focus.vchips.join(","));
  check("P1 focus move list has keyboard + gamepad chips", focus.kb >= 10 && focus.pad >= 10, `kb=${focus.kb} pad=${focus.pad}`);
  check("P1 focus shows the OTHER fighter as secondary (Sasuke mini-card)", focus.others.some(o => /Sasuke/.test(o)), focus.others.join(","));
  await comp.screenshot({ path: path.join(OUT, "SECONDSCREEN_focus_p1.png") });

  // ── empty-slot state (P3 doesn't exist in 1v1) via a dedicated page ──
  const comp3 = await ctx.newPage();
  await comp3.goto(`${base}/companion.html?player=3`, { waitUntil: "load" });
  await sleep(900);
  const noslot = await comp3.evaluate(() => document.querySelector(".noslot-big")?.textContent || document.querySelector("#panel-noslot.active") ? (document.querySelector(".noslot-big")?.textContent || "active") : "");
  check("selecting an empty slot shows a clear 'no player in slot' state", /no player in slot 3/i.test(noslot), noslot);
  await comp3.close();

  // ── ONE-WAY proof ──
  const hp0 = await game.evaluate(() => window.__harness.p1().health);
  await comp.evaluate(() => { try { new BroadcastChannel("mv-companion").postMessage({ k: "snap", players: [{ pn: 1, hp: 0 }], hack: true }); } catch (_) {} });
  await sleep(300);
  const hp1 = await game.evaluate(() => window.__harness.p1().health);
  check("companion CANNOT write game state (forged channel message ignored)", hp0 === hp1, `p1.health ${hp0} → ${hp1}`);

  // ── PERF: frameMsAvg ON vs OFF + per-build micro-bench ──
  await sleep(1200);
  const perfOn = await game.evaluate(() => window.__harness.perf());
  const bench = await game.evaluate(() => window.__harness.companionPerf(5000));
  check("companion confirmed ON for the measured run", perfOn.companionOn === true, JSON.stringify({ companionOn: perfOn.companionOn }));
  const ctxOff = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const gameOff = await bootGame(ctxOff, { companion: false });
  await sleep(1800);
  const perfOff = await gameOff.evaluate(() => window.__harness.perf());
  check("toggle OFF → companion not loaded (byte-identical path)", perfOff.companionOn === false, JSON.stringify({ companionOn: perfOff.companionOn }));
  const dOn = perfOn.frameMsAvg, dOff = perfOff.frameMsAvg, delta = dOn - dOff;
  console.log(`\n   PERF  frameMsAvg: OFF ${dOff.toFixed(3)}ms · ON ${dOn.toFixed(3)}ms · Δ ${delta.toFixed(3)}ms/frame  ·  per-build ${bench.perBuildMs?.toFixed(4)}ms\n`);
  check("per-snapshot build is sub-millisecond", bench.ok && bench.perBuildMs < 0.5, `perBuildMs=${bench.perBuildMs?.toFixed(4)}`);
  check("added per-frame cost negligible (<0.5ms)", Math.abs(delta) < 0.5, `Δ=${delta.toFixed(3)}ms`);

  check("no JS errors on either window", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
} catch (e) { check("test crashed", false, String(e && e.stack || e)); }
finally { console.log(`\nRESULT: ${pass} pass / ${fail} fail`); await browser.close(); server.close(); process.exit(fail ? 1 : 0); }
