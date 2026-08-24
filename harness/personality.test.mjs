// harness/personality.test.mjs — CANONICAL test for the GAME PERSONALITY SYSTEM (personality.js).
// Covers: TIPI scoring (Gosling 2003), the scalar Bayesian/Kalman trait update, confidence falling
// out of sigma2, strength-graded evidence (strong moves more than weak), split-weight events, the
// single-event guardrail (k<1), the bounded event log, and the account-layer integration + a
// persistence round-trip across a page reload. Pure-engine checks run deterministically via
// window.__harness.personality; integration checks drive the per-account state.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const near = (a, b, tol = 0.05) => Math.abs(a - b) <= tol;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.personality, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await P(() => window.__harness.boot());

  console.log("\n── PURE ENGINE: TIPI scoring (Gosling 2003) ──");
  // All-neutral (every item = 4) → every trait resolves to the 4.0 midpoint.
  const tipiNeutral = await P(() => window.__harness.personality.scoreTipi([4, 4, 4, 4, 4, 4, 4, 4, 4, 4]));
  check("TIPI all-4 → every trait 4.0", ["O", "C", "E", "A", "N"].every(t => near(tipiNeutral[t], 4.0)), JSON.stringify(tipiNeutral));
  // Item1=7 (extraverted), item6=1 (reserved, reverse-scored) → E = (7 + (8-1))/2 = 7.
  const tipiE = await P(() => window.__harness.personality.scoreTipi([7, 4, 4, 4, 4, 1, 4, 4, 4, 4]));
  check("TIPI high-Extraversion → E=7.0", near(tipiE.E, 7.0), `E=${tipiE.E}`);
  // Item2=1 (not critical/quarrelsome, reversed → 7), item7=7 (sympathetic) → A = (7+7)/2 = 7.
  const tipiA = await P(() => window.__harness.personality.scoreTipi([4, 1, 4, 4, 4, 4, 7, 4, 4, 4]));
  check("TIPI high-Agreeableness → A=7.0", near(tipiA.A, 7.0), `A=${tipiA.A}`);

  console.log("\n── PURE ENGINE: confidence falls out of sigma2 (doc §3) ──");
  const c0 = await P(() => window.__harness.personality.confidence(4.0, 1.5));   // sigma2 == initial
  const cHalf = await P(() => window.__harness.personality.confidence(4.0, 0.75));
  const cHigh = await P(() => window.__harness.personality.confidence(4.0, 0.15));
  check("confidence at the raw prior = 0%", near(c0, 0, 0.11), `${c0}%`);
  check("confidence rises as sigma2 shrinks (0.75→50%)", near(cHalf, 50, 0.6), `${cHalf}%`);
  check("confidence high when sigma2 small (0.15→90%)", cHigh > 85, `${cHigh}%`);

  console.log("\n── PURE ENGINE: Bayesian update — strong evidence moves belief a lot, weak a little ──");
  // One STRONG A+ event from the 4.0 prior: k = 1.5/(1.5+0.3)=0.8333, mu = 4 + 0.8333*3 = 6.5, conf ≈ 83.3%.
  const sStrong = await P(() => window.__harness.personality.simulate({}, ["sidequest_no_reward"]));
  check("strong A+ event → A.mu ≈ 6.5", near(sStrong.A.mu, 6.5, 0.05), `mu=${sStrong.A.mu}`);
  check("strong A+ event → A.confidence ≈ 83.3%", near(sStrong.A.confidence, 83.3, 0.5), `conf=${sStrong.A.confidence}`);
  check("guardrail: one event can't fully overwrite (mu < z=7)", sStrong.A.mu < 7, `mu=${sStrong.A.mu}`);
  check("n_events incremented to 1", sStrong.A.n_events === 1, `n=${sStrong.A.n_events}`);
  // One WEAK E+ event. From the neutral 4.0 prior the extreme observation z=7 sits >2σ away, so the
  // doc's conflict-widening fires first (sigma2 1.5→1.65): k = 1.65/(1.65+2.0)=0.4521, mu = 4+0.4521*3 = 5.36.
  const sWeak = await P(() => window.__harness.personality.simulate({}, ["combat_aggressive"]));
  check("weak E+ event → E.mu ≈ 5.36 (incl. conflict-widening)", near(sWeak.E.mu, 5.36, 0.03), `mu=${sWeak.E.mu}`);
  check("strong moves the belief MORE than weak", (sStrong.A.mu - 4) > (sWeak.E.mu - 4), `strongΔ=${(sStrong.A.mu - 4).toFixed(2)} weakΔ=${(sWeak.E.mu - 4).toFixed(2)}`);

  console.log("\n── PURE ENGINE: split-weight event pushes two traits opposite ways (doc §1) ──");
  // exploration_wander → O(+, moderate) AND C(-, weak counter-weight).
  const sSplit = await P(() => window.__harness.personality.simulate({}, ["exploration_wander"]));
  check("exploration → O up AND C down", sSplit.O.mu > 4 && sSplit.C.mu < 4, `O=${sSplit.O.mu} C=${sSplit.C.mu}`);

  console.log("\n── PURE ENGINE: repeated same-direction evidence keeps raising confidence ──");
  const sRepeat = await P(() => window.__harness.personality.simulate({}, ["sidequest_no_reward", "sidequest_no_reward", "sidequest_no_reward"]));
  check("3× strong A+ → higher confidence than 1×", sRepeat.A.confidence > sStrong.A.confidence, `1x=${sStrong.A.confidence} 3x=${sRepeat.A.confidence}`);
  check("3× strong A+ → n_events = 3", sRepeat.A.n_events === 3, `n=${sRepeat.A.n_events}`);

  console.log("\n── ACCOUNT LAYER: neutral prior before a TIPI is taken ──");
  const g0 = await P(() => window.__harness.personality.get());
  check("account personality exists", !!g0, "");
  check("tipiComplete = false initially", g0.tipiComplete === false, "");
  check("neutral prior → all traits ≈ 4.0, 0% confidence", ["O", "C", "E", "A", "N"].every(t => near(g0.summary[t].mu, 4.0) && g0.summary[t].confidence <= 0.1), JSON.stringify(g0.summary));

  console.log("\n── ACCOUNT LAYER: TIPI seeds the prior ──");
  const gT = await P(() => window.__harness.personality.setTipi([7, 4, 4, 4, 4, 1, 4, 4, 4, 4]));
  check("setTipi → E prior ≈ 7.0", near(gT.E.mu, 7.0), `E=${gT.E.mu}`);
  const g1 = await P(() => window.__harness.personality.get());
  check("setTipi → tipiComplete = true", g1.tipiComplete === true, "");

  console.log("\n── ACCOUNT LAYER: a gameplay event updates + logs ──");
  const before = await P(() => window.__harness.personality.get());
  await P(() => window.__harness.personality.event("composure_under_loss"));
  const after = await P(() => window.__harness.personality.get());
  check("composure event lowers Neuroticism", after.summary.N.mu < before.summary.N.mu, `N ${before.summary.N.mu}→${after.summary.N.mu}`);
  check("event appended to the audit log", after.events === before.events + 1, `${before.events}→${after.events}`);

  console.log("\n── ACCOUNT LAYER: match outcome derives combat-style + composure evidence ──");
  await P(() => window.__harness.personality.setTipi([4, 4, 4, 4, 4, 4, 4, 4, 4, 4]));   // re-seed neutral so E/N have headroom (prior E=7 was at the ceiling)
  const preMatch = await P(() => window.__harness.personality.get());
  // Aggressive, 2-round win → combat_aggressive (E+) AND composure_under_loss (N-).
  const stats = { p1: { maxCombo: 5, specialsUsed: 3, ultimatesUsed: 1, perfectRounds: 1 }, totalRounds: 2 };
  await P((s) => window.__harness.personality.match(s, true), stats);
  const postMatch = await P(() => window.__harness.personality.get());
  check("aggressive win raises Extraversion", postMatch.summary.E.mu > preMatch.summary.E.mu, `E ${preMatch.summary.E.mu}→${postMatch.summary.E.mu}`);
  check("contested win lowers Neuroticism (composure)", postMatch.summary.N.mu < preMatch.summary.N.mu, `N ${preMatch.summary.N.mu}→${postMatch.summary.N.mu}`);

  console.log("\n── ACCOUNT LAYER: event log is bounded (cap 500) ──");
  const capLen = await P(() => { for (let i = 0; i < 700; i++) window.__harness.personality.event("combat_cautious"); return window.__harness.personality.get().events; });
  check("event log capped at 500 after 700 events", capLen === 500, `len=${capLen}`);

  console.log("\n── PERSISTENCE: state survives a page reload ──");
  const beforeReload = await P(() => window.__harness.personality.get());
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.personality, null, { timeout: 15000 });
  await P(() => window.__harness.boot?.());
  const afterReload = await P(() => window.__harness.personality.get());
  check("personality persisted across reload (tipiComplete kept)", afterReload && afterReload.tipiComplete === true, `tipi=${afterReload?.tipiComplete}`);
  check("trait beliefs persisted (E prior kept)", afterReload && near(afterReload.summary.E.mu, beforeReload.summary.E.mu, 0.2), `E ${beforeReload.summary.E.mu}→${afterReload?.summary.E.mu}`);

  console.log("\n── no JS errors ──");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error(e); fail++;
} finally {
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
