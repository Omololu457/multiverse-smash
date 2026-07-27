// harness/session_persist.test.mjs — SESSION PERSISTENCE across page reload (session.js + game.js).
// Proves: (1) selections (mode/universe/character/skin/stage), training toggles (Infinite HP-EN /
// dummy behavior) and GUEST unlock flags (BETA) are snapshotted to localStorage and RESTORED on a real
// page reload — landing on the exact non-match screen the player was on; (2) mid-match combat state is
// NEVER persisted — a reload during a battle drops to a clean main menu with no fighters/round state.
// Uses ?harness=1&session=1 to run the REAL per-frame persist + boot restore (plain ?harness disables
// the auto-hooks so the other 40+ suites are untouched — the code path exercised here is identical).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const sess = () => page.evaluate(() => window.__harness.session());
async function reload() { await page.goto(`${base}/index.html?harness=1&session=1`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness); await page.waitForTimeout(120); }

try {
  await reload();
  await page.evaluate(() => window.__harness.clearSession());   // fresh player (test isolation)

  // ── change a bunch of state (as a GUEST — no account created) ──
  section("change selections + training toggles + BETA (guest), then reload");
  await page.evaluate(() => window.__harness.applyCode("BETA"));   // guest unlock, no account
  const set = await page.evaluate(() => window.__harness.setSession({
    mode: "training", selectedUniverse: "dragon_ball", p1CharKey: "vegeta", p1Skin: "default",
    selectedStage: "Planet Namek", infiniteResources: true, dummyBehavior: "block",
    screen: "selectCharacter"
  }));
  check("state applied + snapshotted to localStorage", !!set.raw && set.raw.unlocks?.beta === true && set.raw.match?.p1CharKey === "vegeta", `raw=${JSON.stringify(set.raw?.match)}`);
  check("localStorage holds the guest BETA unlock + training toggle", set.raw.unlocks.beta === true && set.raw.training.infiniteResources === true && set.raw.training.dummyBehavior === "block");
  check("persisted screen is the non-match select screen", set.raw.screen === "selectCharacter", `screen=${set.raw.screen}`);
  await page.waitForTimeout(120); await page.screenshot({ path: path.join(OUT, "session_BEFORE_reload.png") });

  // ── RELOAD — everything must come back ──
  section("RELOAD → selections / training toggles / BETA / screen restored");
  await reload();
  const r = await sess();
  check("mode restored (training)", r.mode === "training", `mode=${r.mode}`);
  check("universe restored (dragon_ball)", r.selectedUniverse === "dragon_ball", `u=${r.selectedUniverse}`);
  check("character restored (vegeta)", r.p1CharKey === "vegeta", `p1=${r.p1CharKey}`);
  check("skin restored (default)", r.p1Skin === "default", `skin=${r.p1Skin}`);
  check("stage restored (Planet Namek)", r.selectedStage === "Planet Namek", `stage=${r.selectedStage}`);
  check("Infinite HP/EN toggle restored (true)", r.infiniteResources === true, `inf=${r.infiniteResources}`);
  check("dummy behavior restored (block)", r.dummyBehavior === "block", `dummy=${r.dummyBehavior}`);
  check("guest BETA unlock restored (survives reload w/o an account)", r.beta === true && r.dev === false, `beta=${r.beta} dev=${r.dev}`);
  check("landed on the exact non-match screen (character-select)", r.gameState === "selectCharacter", `gameState=${r.gameState}`);
  await page.waitForTimeout(200); await page.screenshot({ path: path.join(OUT, "session_AFTER_reload.png") });

  // ── mid-match combat state must NOT persist ──
  section("mid-match reload → clean main menu, NO combat state resumed");
  await page.evaluate(() => { window.__harness.boot(); });   // into a live battle
  await page.waitForTimeout(80);
  const inMatch = await sess();
  check("now in a live BATTLE", inMatch.gameState === "battle", `gameState=${inMatch.gameState}`);
  await page.evaluate(() => window.__harness.hurtP1?.(200));   // create combat state (damage)
  await page.waitForTimeout(120);
  const midSnap = await sess();
  check("persisted screen collapses a live match to MAIN_MENU (not 'battle')", midSnap.raw?.screen === "mainMenu", `screen=${midSnap.raw?.screen}`);
  await reload();
  const afterMatch = await sess();
  check("reload during a match lands on the clean main menu (no resume)", afterMatch.gameState === "mainMenu", `gameState=${afterMatch.gameState}`);
  const fighters = await page.evaluate(() => ({ p1: !!window.__harness.p1(), p2: !!window.__harness.p2() }));
  check("no fighters / round state carried over (fresh menu)", fighters.p1 === false && fighters.p2 === false, `p1=${fighters.p1} p2=${fighters.p2}`);
  // unlock + last selection still survive the mid-match reload (only the SCREEN was clamped to menu;
  // the character reflects the one the match used — boot() selected 'sasuke' — proving the last
  // selection persists while combat state does not). NB: starting a match resets the Infinite HP/EN
  // toggle to off by existing design (game.js), so it is legitimately false here.
  check("BETA + last selection still restored after the mid-match reload", afterMatch.beta === true && afterMatch.p1CharKey === "sasuke", `beta=${afterMatch.beta} p1=${afterMatch.p1CharKey}`);

  // ── clear action → truly fresh ──
  section("clearSession() → a truly fresh player on next reload");
  await page.evaluate(() => window.__harness.clearSession());
  await reload();
  const fresh = await sess();
  // (The first post-reload frame re-persists a DEFAULT snapshot, so `raw` is a clean default object —
  // what matters is that nothing meaningful was restored: no unlocks, no selections.)
  check("after clearSession + reload: no unlocks, no selection restored", fresh.beta === false && fresh.dev === false && !fresh.p1CharKey && !fresh.selectedUniverse, `beta=${fresh.beta} p1=${fresh.p1CharKey} u=${fresh.selectedUniverse}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Session persistence: ${PASS} passed, ${FAIL} failed — shots: session_BEFORE/AFTER_reload.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
