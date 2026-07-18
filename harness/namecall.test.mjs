// harness/namecall.test.mjs
// ---------------------------------------------------------------------------
// Rick name-call wiring (NAMECALL_AUDIO): confirm rick_intro.mp3 fires when Rick
// is selected (P1 or P2), that unmapped characters are still silently skipped, and
// that adding Rick didn't disturb any other character's name-call sequence.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".svg":"image/svg+xml" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
function check(name, cond, detail = "") { (cond ? PASS++ : FAIL++); console.log(`  ${cond ? "✅ PASS" : "❌ FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`); }
function section(t) { console.log(`\n── ${t} ─────────────────────────────────`); }

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling","--disable-renderer-backgrounding","--disable-backgrounding-occluded-windows","--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

// Load a fresh match with the given P1/P2 chars, run start() (stays in INTRO so the
// name-call sequence is live), and return the built beats + state.
async function scenario(p1, p2) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.start());   // NOT boot → stays in INTRO
  const s0 = await page.evaluate(() => window.__harness.state().frame);
  await page.waitForFunction(f => window.__harness.state().frame >= f + 3, s0, { timeout: 8000, polling: 16 });
  return page.evaluate(() => ({ nc: window.__harness.namecall(), state: window.__harness.state() }));
}

try {
  // ── Rick on P1 ────────────────────────────────────────────────────────────
  section("Rick on P1 (vs unmapped Sasuke)");
  {
    const { nc, state } = await scenario("rick", "sasuke");
    check("name-call sequence is active", nc.active, `active=${nc.active}`);
    check("exactly ONE beat (only Rick — Sasuke unmapped, skipped)", nc.beats.length === 1, `beats=${JSON.stringify(nc.beats)}`);
    const b = nc.beats[0] || {};
    check("beat is Rick on the P1 side", b.side === "p1" && b.roster === "rick", `side=${b.side} roster=${b.roster}`);
    check("beat clip is rick_intro.mp3", b.clip === "rick_intro.mp3", `clip=${b.clip}`);
    check("in INTRO and the beat actually fired (clip requested → timer running)", state.gameState === "intro" && nc.timer > 0, `state=${state.gameState} timer=${nc.timer}`);
  }

  // ── Rick on P2 ────────────────────────────────────────────────────────────
  section("Rick on P2 (vs unmapped Sasuke)");
  {
    const { nc } = await scenario("sasuke", "rick");
    check("name-call active", nc.active);
    check("exactly ONE beat (only Rick)", nc.beats.length === 1, `beats=${JSON.stringify(nc.beats)}`);
    const b = nc.beats[0] || {};
    check("beat is Rick on the P2 side", b.side === "p2" && b.roster === "rick", `side=${b.side} roster=${b.roster}`);
    check("beat clip is rick_intro.mp3", b.clip === "rick_intro.mp3", `clip=${b.clip}`);
  }

  // ── Other characters' name-call is UNAFFECTED ─────────────────────────────
  section("Other characters unaffected by Rick's addition");
  {
    const { nc } = await scenario("gojo", "sasuke");
    check("Gojo still fires (unmapped Sasuke skipped)", nc.beats.length === 1 && nc.beats[0].side === "p1" && nc.beats[0].roster === "gojo" && nc.beats[0].clip === "gojo_namecall.mp3", `beats=${JSON.stringify(nc.beats)}`);
  }
  {
    const { nc } = await scenario("sasuke", "toji");
    check("fully-unmapped pair → NO beats, silently inactive (no crash)", nc.beats.length === 0 && nc.active === false, `beats=${JSON.stringify(nc.beats)} active=${nc.active}`);
  }

  // ── Both mapped → P1-then-P2 order, Rick composes with others ─────────────
  section("Rick + another mapped character → P1→P2 order");
  {
    const { nc } = await scenario("rick", "naruto");
    check("two beats", nc.beats.length === 2, `beats=${JSON.stringify(nc.beats)}`);
    check("order is P1 (Rick) then P2 (Naruto)", nc.beats[0]?.side === "p1" && nc.beats[0]?.roster === "rick" && nc.beats[1]?.side === "p2" && nc.beats[1]?.roster === "naruto", `beats=${JSON.stringify(nc.beats)}`);
  }

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
} finally {
  console.log(`\n════════════════════════════════════════`);
  console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
