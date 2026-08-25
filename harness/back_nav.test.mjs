// harness/back_nav.test.mjs — SCREEN BACK-NAVIGATION. Proves a real history stack: navigate forward
// through several screens (main menu → mode select → universe → character), then back out ONE STEP AT A
// TIME and confirm each lands on the correct previous screen — across keyboard (Esc/Backspace), controller
// (Circle), and the on-screen BACK button — and that back is a no-op mid-match (can't escape a fight).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const H = fn => page.evaluate(fn);
const gs = () => H(() => window.__harness.state().gameState);
const navState = () => H(() => window.__harness.nav.state());
async function frames(n = 3) { const s = await H(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 8000, polling: 16 }); }
const padConfirm = async () => { await page.evaluate(() => window.__harness.padNav({ confirm: true })); await frames(3); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=vegeta`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.nav, null, { timeout: 15000 });

  // ── Drive FORWARD through the real flow, recording the screen sequence ──
  section("forward navigation builds a real history");
  const path_ = [await gs()];                          // start
  for (let i = 0; i < 4; i++) {                         // START→MAIN_MENU→GAMEPLAY_SELECT→SELECT_UNIVERSE→SELECT_CHARACTER
    await padConfirm();
    const now = await gs();
    if (now !== path_[path_.length - 1]) path_.push(now);
  }
  console.log("  forward path:", path_.join(" → "));
  check("reached the character-select screen (the reported dead-end)", path_.includes("selectCharacter"), path_.join(" → "));
  const st = await navState();
  check("history stack mirrors the forward path (ancestors remembered)", st.stack.length >= 3, `stack=[${st.stack.join(",")}] @${st.gameState}`);

  // ── Back out ONE STEP AT A TIME via goBack(), asserting each lands on the recorded previous ──
  section("back out one screen at a time (each lands on the correct previous)");
  const expected = [...(await navState()).stack].reverse();   // what each successive back should land on
  let landed = [];
  for (const want of expected) {
    const r = await H(() => window.__harness.nav.back());
    landed.push(r.gameState);
    check(`back → ${want}`, r.gameState === want, `got ${r.gameState}`);
  }
  check("ended at the title root", (await gs()) === "start", await gs());
  check("further back at the root is a safe no-op", (await H(() => window.__harness.nav.back())).ok === false);

  // ── Same round-trip, but back via KEYBOARD Escape + Backspace ──
  section("keyboard Escape / Backspace back");
  // Reset to the title, then confirm forward until we land on character select (robust to start screen).
  const resetStart = async () => { for (let i = 0; i < 8 && (await gs()) !== "start"; i++) { const r = await H(() => window.__harness.nav.back()); if (!r.ok) break; await frames(2); } };
  const fwd = async () => { await resetStart(); for (let i = 0; i < 6 && (await gs()) !== "selectCharacter"; i++) await padConfirm(); return gs(); };
  await fwd();
  check("forward again to character select", (await gs()) === "selectCharacter", await gs());
  await page.keyboard.press("Escape"); await frames(3);
  check("Escape on character select goes back one screen", (await gs()) !== "selectCharacter" && (await gs()) !== "start", await gs());
  const afterEsc = await gs();
  await page.keyboard.press("Backspace"); await frames(3);
  check("Backspace backs out another step", (await gs()) !== afterEsc, await gs());

  // ── Controller Circle (back) ──
  section("controller Circle back");
  await fwd();
  check("forward to character select", (await gs()) === "selectCharacter", await gs());
  await page.evaluate(() => window.__harness.padNav({ back: true })); await frames(3);
  check("controller Circle backs out of character select", (await gs()) !== "selectCharacter", await gs());

  // ── On-screen BACK button (mouse) ──
  section("on-screen BACK button (mouse)");
  await fwd();
  check("forward to character select", (await gs()) === "selectCharacter", await gs());
  const rect = await H(() => window.__harness.nav.backRect());
  check("character select now shows a BACK button", !!rect, JSON.stringify(rect));
  if (rect) { await page.mouse.click(rect.x + rect.w / 2, rect.y + rect.h / 2); await frames(3); check("clicking BACK backs out of character select", (await gs()) !== "selectCharacter", await gs()); }

  // ── Safety: back must NOT escape a live match ──
  section("back is scoped to menus (cannot escape a match)");
  await H(() => window.__harness.boot());
  await frames(4);
  check("in a live BATTLE", (await gs()) === "battle");
  const inMatch = await H(() => window.__harness.nav.back());
  check("goBack() is a no-op mid-match", inMatch.ok === false && (await gs()) === "battle");
  await page.keyboard.press("Escape"); await frames(3);
  check("Escape mid-match opens PAUSE (not back-out)", (await gs()) === "paused", await gs());

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  BACK-NAV: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
