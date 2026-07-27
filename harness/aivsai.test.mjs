// harness/aivsai.test.mjs
// ---------------------------------------------------------------------------
// Live in-game verification of the AI vs AI SPECTATOR / TESTING MODE, driven by
// a REAL Chromium instance via Playwright (same rig as the other harness tests).
//
// What it proves:
//   1. Two AI-controlled fighters actually fight — both slots take actions, land
//      hits, and a winner is decided (no human input anywhere).
//   2. The fast-forward speed control is engaged (gameLoop runs N logic ticks per
//      rendered frame at Nx).
//   3. Repeat-N runs back-to-back and finishes on its own.
//   4. The exported log (JSON + CSV) contains real move-by-move data: moves used
//      by BOTH fighters, damage-per-move, combo strings, and the match outcome.
//
// It ALSO writes the real exported log to harness/logs/ as an artifact so the
// move-by-move data can be inspected directly.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HEADED = process.env.HEADED === "1";
const LOGDIR = path.join(ROOT, "harness", "logs");
fs.mkdirSync(LOGDIR, { recursive: true });

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg",
  ".gif": "image/gif", ".mp3": "audio/mpeg", ".mp4": "video/mp4",
  ".json": "application/json", ".svg": "image/svg+xml", ".csv": "text/csv"
};
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    let filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found: " + urlPath); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, "127.0.0.1", () => resolve(server)));
}

let PASS = 0, FAIL = 0;
function check(name, cond, detail = "") {
  (cond ? PASS++ : FAIL++);
  console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
}
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
console.log(`static server → ${base}`);

const browser = await chromium.launch({
  headless: !HEADED,
  args: [
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    "--autoplay-policy=no-user-gesture-required"
  ]
});
const page = await browser.newPage();
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));
await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });

// Wait for the harness hook (and the new aiVsAi sub-object) to be installed.
await page.waitForFunction(() => window.__harness && window.__harness.aiVsAi, null, { timeout: 15000 });

const P1 = "netero", P2 = "beerus", MATCHES = 3, SPEED = 8;

try {
  // ── 1. START + FAST-FORWARD ENGAGED ────────────────────────────────────────
  section("Start run + speed control");
  const started = await page.evaluate(({ p1, p2, matches, speed }) =>
    window.__harness.aiVsAi.start({ p1, p2, p1Diff: "impossible", p2Diff: "easy", matches, speed }),
    { p1: P1, p2: P2, matches: MATCHES, speed: SPEED });
  check("mode switched to aivsai", started.mode === "aivsai", `mode=${started.mode}`);
  check(`run configured for ${MATCHES} matches`, started.matchesTotal === MATCHES, `total=${started.matchesTotal}`);
  check(`speed set to ${SPEED}x`, started.speed === SPEED, `speed=${started.speed}`);

  const tpf = await page.evaluate(() => window.__harness.aiVsAi.ticksPerFrame());
  check("fast-forward engaged (gameLoop runs N ticks/frame)", tpf === SPEED, `ticksPerFrame=${tpf}`);

  // ── 2. RUN ALL N MATCHES TO COMPLETION ─────────────────────────────────────
  section("Simulate all matches");
  const result = await page.evaluate(() => window.__harness.aiVsAi.runToCompletion({}, 400000));
  check("run finished on its own (auto-repeat)", result.finished === true, `frames=${result.frames}`);
  check("export produced", !!(result.json && result.csv), result.json ? "json+csv present" : "MISSING");

  const log = JSON.parse(result.json);
  check("log schema tag present", log.schema === "multiverse-smash.spectator.v1", log.schema);
  check(`logged ${MATCHES} matches`, log.matches.length === MATCHES, `got ${log.matches.length}`);
  check("summary totals match", log.summary.totalMatches === MATCHES, JSON.stringify(log.summary.wins));

  // ── 3. BOTH AI FIGHTERS ACTUALLY FOUGHT ────────────────────────────────────
  section("Both AI fighters acted + move-by-move data");
  const m0 = log.matches[0];
  const p1Moves = Object.keys(m0.fighters.p1.movesUsed).length;
  const p2Moves = Object.keys(m0.fighters.p2.movesUsed).length;
  check("P1 AI used moves", p1Moves > 0, `${p1Moves} distinct moves`);
  check("P2 AI used moves", p2Moves > 0, `${p2Moves} distinct moves`);
  const p1Hits = m0.fighters.p1.hitsLanded, p2Hits = m0.fighters.p2.hitsLanded;
  check("hits landed in match 1", (p1Hits + p2Hits) > 0, `p1=${p1Hits} p2=${p2Hits}`);
  check("damage recorded per move", Object.keys(m0.fighters.p1.damageByMove).length +
        Object.keys(m0.fighters.p2.damageByMove).length > 0,
        `p1 moves→dmg: ${JSON.stringify(m0.fighters.p1.damageByMove)}`);

  const hitEvents = m0.events.filter(e => e.t === "hit");
  const moveEvents = m0.events.filter(e => e.t === "move");
  check("move-by-move event stream populated", hitEvents.length > 0 && moveEvents.length > 0,
        `${moveEvents.length} move + ${hitEvents.length} hit events`);
  check("hit events carry {move, damage, combo}", hitEvents.every(e => e.move && e.damage >= 0 && e.combo >= 0),
        `sample=${JSON.stringify(hitEvents[0])}`);

  // ── 4. OUTCOME + COMBOS ────────────────────────────────────────────────────
  section("Outcome + combo strings");
  const decisive = log.matches.every(m => m.outcome && ["p1", "p2", "draw"].includes(m.outcome.winner));
  check("every match has an outcome", decisive, log.matches.map(m => `${m.outcome?.winner}/${m.outcome?.method}`).join(", "));
  check("outcome names how it ended", log.matches.every(m => ["ko", "timeout", "double_ko"].includes(m.outcome.method)),
        log.matches.map(m => m.outcome.method).join(", "));
  const totalCombos = log.matches.reduce((n, m) => n + m.combos.length, 0);
  // Combos aren't guaranteed every run, but with an impossible-tier attacker they are overwhelmingly likely.
  check("combo strings recorded (≥2-hit)", totalCombos > 0, `${totalCombos} combos; sample=${JSON.stringify(log.matches.find(m => m.combos.length)?.combos?.[0] || null)}`);

  // ── 5. CSV SANITY ──────────────────────────────────────────────────────────
  section("CSV export");
  const csvLines = result.csv.trim().split("\n");
  check("CSV has header + rows", csvLines.length > 1, `${csvLines.length} lines`);
  check("CSV header is training-ready", csvLines[0].startsWith("match,frame,event,attacker,attacker_char"),
        csvLines[0]);

  // ── WRITE ARTIFACTS ────────────────────────────────────────────────────────
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const jsonPath = path.join(LOGDIR, `aivsai-${P1}-vs-${P2}-${stamp}.json`);
  const csvPath  = path.join(LOGDIR, `aivsai-${P1}-vs-${P2}-${stamp}.csv`);
  fs.writeFileSync(jsonPath, result.json);
  fs.writeFileSync(csvPath, result.csv);
  console.log(`\n📝 wrote log artifacts:\n   ${jsonPath}\n   ${csvPath}`);

  // Screenshot the summary screen as visual proof the mode ran end-to-end.
  const shot = path.join(LOGDIR, `aivsai-summary-${stamp}.png`);
  await page.screenshot({ path: shot });
  console.log(`   ${shot}`);

} catch (e) {
  console.log("  ❌ EXCEPTION:", e.message);
  FAIL++;
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${"=".repeat(50)}`);
console.log(`AI vs AI harness:  ${PASS} passed, ${FAIL} failed`);
console.log("=".repeat(50));
process.exit(FAIL === 0 ? 0 : 1);
