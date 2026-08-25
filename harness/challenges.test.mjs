// harness/challenges.test.mjs — personality-driven progression: guest-safe persistence,
// challenge completion → skin-reward unlock (persists), and confidence-gated recommendations.
// Covers Part 1 (personality + XP now persist for GUESTS), and Part 3 (challenge unlock
// persistence + the recommended-challenges fallback/personalization).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.challenges, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };

// High-Conscientiousness confident profile → should recommend the methodical challenges first.
const hiC = { C: { mu: 6.5, confidence: 85 }, O: { mu: 4, confidence: 85 }, E: { mu: 4, confidence: 85 }, A: { mu: 4, confidence: 85 }, N: { mu: 4, confidence: 85 } };
const hiE = { E: { mu: 6.5, confidence: 85 }, O: { mu: 4, confidence: 85 }, C: { mu: 4, confidence: 85 }, A: { mu: 4, confidence: 85 }, N: { mu: 4, confidence: 85 } };
const lowConf = { C: { mu: 6.5, confidence: 10 }, O: { mu: 4, confidence: 10 }, E: { mu: 4, confidence: 10 }, A: { mu: 4, confidence: 10 }, N: { mu: 4, confidence: 10 } };

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await boot();

  console.log("\n── Part 1: GUEST (no account) — personality + XP persistence ──");
  check("running as a guest (no account)", await P(() => window.__harness.library.hasAccount()) === false, "");
  // Fire strong personality evidence as a guest (standalone store) + earn XP via a challenge.
  await P(() => { for (let i = 0; i < 3; i++) window.__harness.personality.event("sidequest_no_reward"); });
  const before = await P(() => ({ prof: window.__harness.personality.get().summary.A, prog: window.__harness.challenges.guestProgress() }));
  check("guest personality accumulated (A confidence > 0)", before.prof.confidence > 0, `A.conf=${before.prof.confidence}`);
  await P(() => window.__harness.challenges.force("first_blood"));   // grants 50 XP
  const afterXp = await P(() => window.__harness.challenges.guestProgress());
  check("guest earned XP from a challenge", afterXp.xp > before.prog.xp, `${before.prog.xp} → ${afterXp.xp}`);

  console.log("\n── Part 3: challenge completion → skin reward unlock ──");
  const lockedBefore = await P(() => window.__harness.challenges.skinUnlocked("gon", "gon_crimson"));
  check("reward skin gon_crimson locked before its challenge", lockedBefore === false, `unlocked=${lockedBefore}`);
  // "finish_them" = win a match landing an Ultimate → rewards gon_crimson.
  const done = await P(() => window.__harness.challenges.recordMatch(true, { ultimatesUsed: 1, maxCombo: 2 }, "hunter_x_hunter"));
  check("winning-with-ultimate completes 'Finish Them'", done.some(d => d.id === "finish_them"), JSON.stringify(done.map(d => d.id)));
  check("reward skin gon_crimson now UNLOCKED", await P(() => window.__harness.challenges.skinUnlocked("gon", "gon_crimson")) === true, "");

  console.log("\n── challenge completion is idempotent (no double-grant) ──");
  const xpA = (await P(() => window.__harness.challenges.guestProgress())).xp;
  const again = await P(() => window.__harness.challenges.recordMatch(true, { ultimatesUsed: 1 }, "hunter_x_hunter"));
  const xpB = (await P(() => window.__harness.challenges.guestProgress())).xp;
  check("re-completing an already-done challenge grants nothing again", !again.some(d => d.id === "finish_them") && xpB === xpA, `${xpA} vs ${xpB}`);

  console.log("\n── franchise challenge (multi-match counter) ──");
  await P(() => { window.__harness.challenges.recordMatch(true, {}, "dragon_ball"); window.__harness.challenges.recordMatch(true, {}, "dragon_ball"); });
  const notYet = await P(() => window.__harness.challenges.complete("franchise_loyalty"));
  check("2 same-franchise wins does NOT complete the 3-win challenge", notYet === false, "");
  await P(() => window.__harness.challenges.recordMatch(true, {}, "dragon_ball"));
  check("3rd same-franchise win completes 'Franchise Loyalty'", await P(() => window.__harness.challenges.complete("franchise_loyalty")) === true, "");

  console.log("\n── confidence-gated recommendations (mirrors music personalization) ──");
  const recLow = await P((p) => window.__harness.challenges.recommended(p), lowConf);
  check("low-confidence profile → NOT personalized (default order)", recLow.personalized === false, `personalized=${recLow.personalized}`);
  const recC = await P((p) => window.__harness.challenges.recommended(p, 3), hiC);
  const recE = await P((p) => window.__harness.challenges.recommended(p, 3), hiE);
  check("high-Conscientiousness personalizes", recC.personalized === true, "");
  check("high-C recommends a methodical challenge first (technician/purist/perfectionist)", ["technician", "purist", "perfectionist"].includes(recC.challenges[0]), recC.challenges[0]);
  check("high-Extraversion recommends a different top challenge than high-C", recE.challenges[0] !== recC.challenges[0], `E:${recE.challenges[0]} vs C:${recC.challenges[0]}`);

  console.log("\n── recommendations never GATE — every challenge stays listed ──");
  const totalList = (await P(() => window.__harness.challenges.list())).length;
  check("full challenge list is complete regardless of profile", totalList >= 10, `n=${totalList}`);

  console.log("\n── PERSISTENCE across a full page reload (guest) ──");
  const preReload = await P(() => ({ done: window.__harness.challenges.completedN(), skin: window.__harness.challenges.skinUnlocked("gon", "gon_crimson"), xp: window.__harness.challenges.guestProgress().xp, aConf: window.__harness.personality.get().summary.A.confidence }));
  await page.reload({ waitUntil: "load" });
  await boot();
  const postReload = await P(() => ({ done: window.__harness.challenges.completedN(), skin: window.__harness.challenges.skinUnlocked("gon", "gon_crimson"), xp: window.__harness.challenges.guestProgress().xp, aConf: window.__harness.personality.get().summary.A.confidence, hasAccount: window.__harness.library.hasAccount() }));
  check("still a guest after reload", postReload.hasAccount === false, "");
  check("completed challenges survived reload", postReload.done === preReload.done && postReload.done > 0, `${preReload.done} → ${postReload.done}`);
  check("reward skin unlock survived reload", postReload.skin === true, "");
  check("guest XP survived reload", postReload.xp === preReload.xp && postReload.xp > 0, `${preReload.xp} → ${postReload.xp}`);
  check("guest personality profile survived reload", Math.abs(postReload.aConf - preReload.aConf) < 0.1 && postReload.aConf > 0, `A.conf ${preReload.aConf} → ${postReload.aConf}`);
  check("'Finish Them' still complete after reload", await P(() => window.__harness.challenges.complete("finish_them")) === true, "");

  console.log("\n── no JS errors ──");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error(e); fail++;
} finally {
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
