// brutality_buggy_live.mjs — Buggy the Clown brutalities: live gore table + Academy reel + cinematic.
// For each winner, boots <winner> vs a victim, drives the REAL cinematic path (activate → live loop plays it out →
// victory handoff), asserts started/advanced/resolved + 0 pageerrors, and screenshots the payoff beat.
// Sharingan Uchiha.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const SHOTS = path.join(ROOT, "brutality_work", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let errs = []; page.on("pageerror", e => errs.push(`${e.message}`));
const SH = path.join(SHOTS, "buggy"); fs.mkdirSync(SH, { recursive: true });
const st = () => page.evaluate(() => window.__harness.state());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 8 }).catch(() => {}); }
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓", m); } else { fail++; console.log("  ✗", m); } };
const VICTIM = process.env.VICTIM || "sasuke";
const boot = async () => {
  await page.goto(`${base}/index.html?harness=1&p1=buggy&p2=${VICTIM}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
  await page.evaluate(() => window.__harness.start?.()); await page.evaluate(() => window.__harness.skipToBattle?.());
  await page.waitForFunction(() => window.__harness.state().countdown <= 0, null, { timeout: 8000, polling: 16 }).catch(() => {}); await wf(4)
}
try {
  // ── A) live gore table + routing ──
  console.log("\n── A) gore table ──"); await boot()
  const E = await page.evaluate(() => ({ elig: window.__harness.brutality.canTrigger("buggy"), moves: window.__harness.brutality.moves("buggy"),
    f: ["bFestival", "bBall", "bSuper", "buggy_hand", "heavy", "light"].map(m => [m, window.__harness.brutality.finisherFor("buggy", m)]) }))
  ok(E.elig, "buggy is BRUTALITY_ELIGIBLE")
  ok(E.moves.length === 5, `5 finisher entries: ${E.moves.join(",")}`)
  for (const [m, f] of E.f) console.log(`     ${m} → ${f.name} (${f.gore})${f.klassic ? " [klassic]" : ""}`)
  ok(E.f[3][1].gore === "barabara" && E.f[4][1].gore === "barabara" && E.f[0][1].gore === "barabara" && E.f[1][1].gore === "buggyball" && E.f[2][1].gore === "buggyball", "festival/ball/super resolve to the bespoke gores")
  // play each live finisher through the real trigger path + screenshot its beats
  for (const mv of ["bFestival", "bBall", "buggy_hand", "heavy"]) {
    await boot(); await page.evaluate(() => window.__harness.brutality.setBrutality(true))
    const before = errs.length
    const started = await page.evaluate(m => window.__harness.brutality.trigger("p1", true, m), mv)
    ok(started, `${mv}: live finisher started`)
    const f0 = (await st()).frame
    for (const at of [30, 62, 82, 110, 140]) {
      await page.waitForFunction(t => window.__harness.state().frame >= t, f0 + at, { timeout: 20000, polling: 4 }).catch(() => {})
      await page.screenshot({ path: path.join(SH, `live_${mv}_${at}.png`) }) }
    await page.waitForFunction(() => !window.__harness.brutality.activeFinisher(), null, { timeout: 9000, polling: 16 }).catch(() => {})
    ok(!(await page.evaluate(() => window.__harness.brutality.activeFinisher())), `${mv}: resolved`)
    ok(errs.length === before, `${mv}: 0 pageerrors (${errs.slice(before).slice(0, 2).join(" | ")})`)
  }
  // ── B) Academy: Brutalities section + WATCH reel ──
  console.log("\n── B) Academy ──"); await boot()
  await page.mouse.click(640, 360)
  const oc = await page.evaluate(() => window.__harness.academy.openChar("buggy"))
  console.log("     sections:", oc.sections.join(" · "))
  ok(oc.sections.some(x => x === "Brutalities(5)"), "Academy lesson page lists Brutalities(5)")
  await page.screenshot({ path: path.join(SH, "academy_page.png") })
  const rs = await page.evaluate(() => window.__harness.academy.startReel())
  ok(rs.ok && rs.total === 5, `WATCH BRUTALITIES reel started (total=${rs.total})`)
  const seen = new Set()
  for (let i = 0; i < 5; i++) {
    await page.waitForFunction(() => { const r = window.__harness.academy.reelState(); return r && r.playing && r.name }, null, { timeout: 12000, polling: 16 }).catch(() => {})
    const r = await page.evaluate(() => window.__harness.academy.reelState()); if (r?.name) seen.add(r.name)
    await wf(70); await page.screenshot({ path: path.join(SH, `reel_${i}.png`) })
    await page.waitForFunction(() => !window.__harness.brutality.activeFinisher(), null, { timeout: 9000, polling: 16 }).catch(() => {}); await wf(3)
  }
  ok(seen.size >= 4, `reel auto-played ${seen.size} distinct finishers [${[...seen].join(", ")}]`)
  const ex = await page.evaluate(() => window.__harness.academy.reelExit())
  ok(!ex.reel && ex.state === "academyChar", `exit → lesson page (${ex.state})`)
  // ── C) cinematic concept (FINISH-window timeout path) ──
  console.log("\n── C) cinematic ──"); await boot()
  ok(await page.evaluate(() => window.__harness.brutality.cineConcepts().includes("buggy")), "buggy has a cinematic concept")
  const trig = await page.evaluate(() => window.__harness.brutality.cineTrigger("p1"))
  ok(trig && trig.started, "cinematic activated")
  for (const at of [30, 60, 90, 112, 130, 156]) {
    await page.waitForFunction(t => { const s = window.__harness.brutality.cineStatus(); return !s.active || s.t >= t }, at, { timeout: 8000, polling: 4 }).catch(() => {})
    await page.screenshot({ path: path.join(SH, `cine_${at}.png`) }) }
  await page.waitForFunction(() => !window.__harness.brutality.cineStatus().active, null, { timeout: 8000, polling: 16 }).catch(() => {})
  ok(!(await page.evaluate(() => window.__harness.brutality.cineStatus().active)), "cinematic resolved")
  ok(errs.length === 0, `0 pageerrors overall (${errs.slice(0, 2).join(" | ")})`)
} catch (e) { console.error("EXCEPTION", e); fail++ }
console.log(`\nRESULT: ${pass}/${pass + fail} passed, ${fail} failed`); console.log("shots →", SH)
await browser.close(); server.close(); process.exit(fail ? 1 : 0)
