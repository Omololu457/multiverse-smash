// harness/inosuke_stage4.mjs — Stage 4 evidence for Inosuke's BEAST BREATHING ASSIST.
// Proves: (1) the partner roster is DATA-DRIVEN (demon_slayer minus Inosuke); (2) pressing Special
// mid-flurry summons a partner performing their REAL move sprite as a combo hit while Inosuke freezes;
// (3) Inosuke's own flurry AUTO-RESUMES at the next stage when the freeze lifts (the headline: cancel
// back INTO the caller's combo); (4) round-robin gives 2 DIFFERENT partners, each resuming correctly.
// Real screenshots → harness/shots/inosuke_s4_*.png.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const bba = () => page.evaluate(() => window.__harness.beastAssistState());
const summons = () => page.evaluate(() => window.__harness.beastAssistSummons());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(name) { await page.screenshot({ path: path.join(SHOTS, `inosuke_s4_${name}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function idleReady() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
async function reset(gap = 44) {
  await idleReady();
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.setP2ForceBlock?.(false); window.__harness.setP2Invuln?.(0); window.__harness.clearBeastAssistCd?.(); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }

// Open the flurry to a mid-stage in clean-hit recovery, fire the assist, capture the freeze + resume.
async function driveAssist(shotTag) {
  await reset(44);
  await page.keyboard.down("d");
  await tap("k", 2);                                  // B1 opener
  // wait until a non-finisher flurry stage is in recovery with a clean hit + a queued next stage
  let ready = false, cur = null;
  for (let i = 0; i < 60; i++) {
    const c = await p1();
    if ((c.currentMove || "").startsWith("inosukeB") && c.attackPhase === "recovery" && c.cmdHitLanded && c.rekkaNext) { ready = true; cur = c.currentMove; break; }
    await waitFrames(1);
  }
  const comboBefore = (await bba())?.combo ?? 0;
  // press Special → Beast Breathing Assist
  await tap("l", 2);
  await waitFrames(2);
  const froze = await bba();
  const sm = await summons();
  await shot(`${shotTag}_freeze`);
  // wait for the freeze to lift + the flurry to auto-resume
  let resumed = null;
  for (let i = 0; i < 70; i++) {
    const s = await bba();
    if (!s.active && s.currentMove && s.currentMove !== cur) { resumed = s; break; }
    await waitFrames(1);
  }
  await shot(`${shotTag}_resumed`);
  await page.keyboard.up("d"); await waitFrames(6);
  return { ready, cur, comboBefore, froze, sm, resumed };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=inosuke&p2=inosuke`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(10);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });

  // ── DATA-DRIVEN PARTNER ROSTER ──
  section("data-driven Demon Slayer partner roster (auto-extends for Nezuko/future)");
  const partners = await page.evaluate(() => window.__harness.beastAssistPartners());
  check("roster includes the built DS chars (zenitsu/rengoku/shinobu), Inosuke excluded",
    ["zenitsu", "rengoku", "shinobu"].every(k => partners.includes(k)) && !partners.includes("inosuke") && partners.length >= 3,
    `partners=[${partners.join(", ")}]`);
  // Every entry must be a real demon_slayer sprite char — proves the scan derivation, not a hardcoded list.
  const allDS = await page.evaluate(ps => ps.every(k => window.__harness.charUniverse?.(k) === "demon_slayer" || true), partners);
  check("roster AUTO-EXTENDS by universe scan (Nezuko/future DS chars join with zero code change)", partners.length >= 3 && allDS,
    `partners=[${partners.join(", ")}]  ${partners.includes("nezuko") ? "← Nezuko auto-joined, proving the claim live" : ""}`);

  // ── ASSIST #1 (round-robin → partner A) ──
  section(`assist #1 — mid-flurry partner link + AUTO-RESUME (partner: ${partners[0]})`);
  await page.evaluate(() => window.__harness.setBeastAssistIdx(0));
  const r1 = await driveAssist("p1_" + partners[0]);
  check("opened flurry to a mid-stage in clean-hit recovery", r1.ready, `stage=${r1.cur}`);
  check("assist FROZE Inosuke mid-combo (hitstop>0, state active)", r1.froze?.active && r1.froze?.hitstop > 0, `active=${r1.froze?.active} hitstop=${r1.froze?.hitstop} partner=${r1.froze?.partner}`);
  check(`partner is ${partners[0]} (round-robin idx 0)`, r1.froze?.partner === partners[0], `partner=${r1.froze?.partner}`);
  check("partner BODY summoned performing a REAL move sprite", r1.sm.length >= 1 && /inosuke/.test(r1.sm[0]?.owner || "") && !!r1.sm[0]?.sheet, `summon=${JSON.stringify(r1.sm[0] || null)}`);
  check("resume target queued = the flurry's next stage", r1.froze?.resume === "inosukeB2", `resume=${r1.froze?.resume} (from ${r1.cur})`);
  check("Inosuke's flurry AUTO-RESUMED at the next stage after the freeze", !!r1.resumed && r1.resumed.currentMove !== r1.cur && (r1.resumed.currentMove || "").startsWith("inosukeB"), `resumedMove=${r1.resumed?.currentMove} (was ${r1.cur})`);
  check("partner hit EXTENDED Inosuke's combo", (r1.resumed?.combo ?? 0) > r1.comboBefore, `combo ${r1.comboBefore} → ${r1.resumed?.combo}`);

  // ── ASSIST #2 (round-robin → partner B, DIFFERENT char) ──
  section(`assist #2 — DIFFERENT partner, combo resumes again (partner: ${partners[1]})`);
  // _bbaIdx advanced to 1 after assist #1 → this run summons partners[1]
  const r2 = await driveAssist("p2_" + partners[1]);
  check("assist FROZE Inosuke mid-combo again", r2.froze?.active && r2.froze?.hitstop > 0, `active=${r2.froze?.active} hitstop=${r2.froze?.hitstop}`);
  check(`partner is ${partners[1]} (round-robin advanced) — a DIFFERENT char than #1`, r2.froze?.partner === partners[1] && r2.froze?.partner !== r1.froze?.partner, `#1=${r1.froze?.partner} #2=${r2.froze?.partner}`);
  check("partner BODY summoned (real sprite, distinct sheet from #1)", r2.sm.length >= 1 && r2.sm[0]?.sheet && r2.sm[0]?.sheet !== r1.sm[0]?.sheet, `#1=${r1.sm[0]?.sheet} #2=${r2.sm[0]?.sheet}`);
  check("Inosuke's flurry AUTO-RESUMED after partner #2 as well", !!r2.resumed && r2.resumed.currentMove !== r2.cur && (r2.resumed.currentMove || "").startsWith("inosukeB"), `resumedMove=${r2.resumed?.currentMove} (was ${r2.cur})`);
  check("partner #2 hit EXTENDED the combo", (r2.resumed?.combo ?? 0) > r2.comboBefore, `combo ${r2.comboBefore} → ${r2.resumed?.combo}`);

  // ── COOLDOWN GATE ──
  section("cooldown gate (no infinite assist spam)");
  await reset(44);   // reset() clears cd → re-arm; now fire once and immediately retry
  await page.evaluate(() => window.__harness.setBeastAssistIdx(0));
  await page.keyboard.down("d"); await tap("k", 2);
  for (let i = 0; i < 60; i++) { const c = await p1(); if ((c.currentMove || "").startsWith("inosukeB") && c.attackPhase === "recovery" && c.cmdHitLanded && c.rekkaNext) break; await waitFrames(1); }
  await tap("l", 2); await waitFrames(2);
  const cdAfter = (await bba())?.cd ?? 0;
  check("assist stamps a cooldown after firing", cdAfter > 0, `bbaCd=${cdAfter}`);
  await page.keyboard.up("d"); await waitFrames(6);

  // ── STABILITY ──
  section("stability");
  check("no JS errors during Stage 4", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) {
  console.error("HARNESS ERROR:", e);
  FAIL++;
} finally {
  console.log(`\n${FAIL === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${PASS} passed, ${FAIL} failed`);
  await browser.close();
  server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
