// harness/controller_menu.test.mjs — prove a CONTROLLER can drive the HOME/title + menu screens
// (item 3), that it survives the full round-trip (home → into a match → back to home), and that it
// does NOT hijack in-match input. Verifies four things:
//   (A) the REAL pad-poll path — fake navigator.getGamepads, assert edge + auto-repeat + confirm edge;
//   (B) home-screen navigation — START → MAIN MENU → GAMEPLAY SELECT, moving the selection with the
//       d-pad and selecting with Cross (via the __harness.padNav intent — same code path a real pad hits);
//   (C) entering a match then getting back — Options opens pause, pause→quit returns to the title; and
//       the menu layer is INERT during BATTLE (d-pad/Cross do nothing) while real keyboard still moves the
//       fighter (so fixing the menu didn't break in-match input);
//   (D) the results screen — Circle returns to the title.
// Writes harness/shots/controller_menu_home.png for eyeball confirmation.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = path.join(ROOT, "harness", "shots"); fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const H = fn => page.evaluate(fn);
const padNav = opts => page.evaluate(o => window.__harness.padNav(o), opts);
const padState = () => page.evaluate(() => window.__harness.padMenuState());
async function waitFrames(n) { const s = (await H(() => window.__harness.state().frame)); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=miwa&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.padNav, null, { timeout: 15000 });

  // ── (A) REAL pad-poll path: fake a connected pad, prove edge + auto-repeat + confirm edge ──
  section("(A) real gamepad poll — edge / repeat / confirm");
  const poll = await page.evaluate(() => {
    // Minimal standard-gamepad shape: 16 buttons + 2 sticks. DOWN=13, Cross=0.
    const mk = (down, cross) => ({ index: 0, connected: true, mapping: "standard", axes: [0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: (i === 13 && down) || (i === 0 && cross), touched: false, value: 0 })) });
    const orig = navigator.getGamepads.bind(navigator);
    let pad = mk(true, false);
    navigator.getGamepads = () => [pad];
    const a = window.__harness.padPollRaw();     // DOWN just pressed → fire
    const b = window.__harness.padPollRaw();     // DOWN still held (< repeat delay) → no fire
    pad = mk(false, true);
    const c = window.__harness.padPollRaw();      // Cross just pressed → confirm fire
    const d = window.__harness.padPollRaw();      // Cross still held → no fire
    pad = mk(false, false);
    const connectedWhileFaked = window.__harness.padConnected();
    window.__harness.padPollRaw();                // release all → clear edge latches
    navigator.getGamepads = orig;
    return { a, b, c, d, connectedWhileFaked };
  });
  check("d-pad DOWN fires on the press frame", poll.a?.down === true, JSON.stringify(poll.a));
  check("held DOWN does NOT re-fire before the repeat delay", poll.b?.down === false);
  check("Cross fires 'confirm' on its press frame", poll.c?.confirm === true, JSON.stringify(poll.c));
  check("held Cross does NOT re-fire", poll.d?.confirm === false);
  check("padConnected() reports the pad while one is present", poll.connectedWhileFaked === true);

  // ── (B) HOME-SCREEN NAVIGATION with the controller intents ──
  section("(B) home-screen navigation (START → MAIN MENU → GAMEPLAY SELECT)");
  check("boots on the START/title screen", (await padState()).gameState === "start");
  await padNav({ confirm: true });                          // Cross on START → PLAY
  check("Cross on title advances to MAIN MENU", (await padState()).gameState === "mainMenu");

  let st = await padState();
  check("main menu selection starts on PLAY", st.selId === "play", `selId=${st.selId}`);
  await padNav({ down: true });
  st = await padState();
  check("d-pad DOWN moves the selection off PLAY", st.selId !== "play", `selId=${st.selId}`);
  const afterDown = st.selId;
  await padNav({ up: true });
  st = await padState();
  check("d-pad UP moves back toward PLAY", st.selId !== afterDown, `selId=${st.selId}`);

  // Re-seat on PLAY and enter the mode-select screen.
  st = await padState();
  if (st.selId !== "play") await padNav({ up: true });
  await page.screenshot({ path: path.join(SHOTS, "controller_menu_home.png") });
  console.log("  📸 harness/shots/controller_menu_home.png  (main menu, controller-selected)");
  await padNav({ confirm: true });
  check("Cross on PLAY opens GAMEPLAY SELECT", (await padState()).gameState === "gameplaySelect");

  st = await padState();
  check("mode select starts on the first row (TRAINING)", st.selId === "training", `selId=${st.selId}`);
  await padNav({ down: true }); await padNav({ down: true });
  st = await padState();
  check("d-pad DOWN walks the mode list", st.idx === 2 && st.selId === "pvp", `idx=${st.idx} selId=${st.selId}`);

  // BACK out to the title via the on-screen BACK row (Circle), proving reverse navigation on a rect menu.
  await padNav({ back: true });
  check("Circle backs out of GAMEPLAY SELECT", (await padState()).gameState !== "gameplaySelect", (await padState()).gameState);

  // ── grid screen: move the cursor across the character-select card grid ──
  section("(B2) character-select GRID navigation");
  await H(() => window.__harness.showCharSelect("dragon_ball", "training"));
  const before = await padState();
  await padNav({ right: true });
  const afterR = await padState();
  check("controller moves the cursor on the card grid (RIGHT)", afterR.mouseX !== before.mouseX || afterR.idx !== before.idx, `x ${before.mouseX}→${afterR.mouseX} idx ${before.idx}→${afterR.idx}`);
  await padNav({ down: true });
  const afterD = await padState();
  check("controller moves DOWN a row on the card grid", afterD.mouseY !== afterR.mouseY || afterD.idx !== afterR.idx, `y ${afterR.mouseY}→${afterD.mouseY} idx ${afterR.idx}→${afterD.idx}`);

  // ── (C) ENTER A MATCH; menu layer inert in-battle; keyboard still moves the fighter; get back home ──
  section("(C) in a match: menu inert, keyboard works, Options→pause→quit→home");
  await H(() => window.__harness.boot());
  await waitFrames(4);
  check("in a live BATTLE", (await padState()).gameState === "battle");

  // Menu intents must be INERT during battle (d-pad + Cross do NOT change state / open menus).
  await padNav({ down: true, confirm: true });
  check("d-pad + Cross are ignored during BATTLE (no menu hijack)", (await padState()).gameState === "battle");

  // Real keyboard STILL drives the fighter (proves the menu layer didn't break in-match input).
  const x0 = await H(() => window.__harness.p1().x);
  await page.keyboard.down("d"); await waitFrames(14); await page.keyboard.up("d");
  const x1 = await H(() => window.__harness.p1().x);
  check("keyboard 'd' still moves P1 right in-match", x1 > x0 + 2, `x ${Math.round(x0)}→${Math.round(x1)}`);

  // Options (Start) opens the pause menu from a live match.
  await padNav({ start: true });
  check("Options opens the pause menu", (await padState()).gameState === "paused");

  // Navigate pause: resume→restartRound→profile→codex→trainingMode→quitToMenu, then confirm → TITLE.
  // (Profile + Codex were added to the pause menu — Part 1 #3/#4 — so QUIT is now 5 downs from RESUME.)
  for (let i = 0; i < 5; i++) await padNav({ down: true })
  const psel = await H(() => window.__harness.pauseSel());
  check("d-pad reaches QUIT TO MENU in pause", psel.item === "quitToMenu", `item=${psel.item}`);
  await padNav({ confirm: true });
  check("Cross on QUIT returns to the TITLE (round-trip home)", (await padState()).gameState === "start");

  // ── (D) results screen → title with the controller ──
  section("(D) results screen → title");
  await H(() => window.__harness.showVictory("p1"));
  check("on the results/VICTORY screen", (await padState()).gameState === "victory");
  await padNav({ back: true });
  check("Circle on results returns to the TITLE", (await padState()).gameState === "start");

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  CONTROLLER-MENU: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
