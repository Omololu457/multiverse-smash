// harness/controller_player_assign.test.mjs
// ---------------------------------------------------------------------------
// Regression for the "controller steals Player 1" bug: connecting a pad in a
// keyboard+controller PvP setup force-flipped P1 → controller (via the
// gamepadconnected auto-activate), binding the pad to P1 and locking the P1
// keyboard player out ("can't move/jump"), while the intended P2 controller
// slot got no pad.
//
// Correct behaviour (all verified here):
//   • PvP defaults P1=keyboard / P2=controller; a connecting pad binds to P2, NOT P1.
//   • Works regardless of order (choose PvP first, or plug the pad first).
//   • Setting P2=controller in Settings + plugging a pad → P1 stays keyboard.
//   • Cold keyboard/keyboard + plug pad (single-player) STILL auto-activates P1
//     (so "plug a pad → it drives a fighter" is preserved).
//   • A keyboard slot never binds a pad; the P1 keyboard player can still JUMP
//     while a controller is connected. And a pad actually drives its fighter.
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split("?")[0]);
    const fp = path.join(ROOT, u === "/" ? "/index.html" : u);
    if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end("nf"); return; } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

// Fake Gamepad API installed before any page script runs.
await page.addInitScript(() => {
  const mk = (i) => ({ index: i, id: "fakepad", connected: true, mapping: "standard", timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
  window.__pads = [];
  window.__padInit = (n) => { window.__pads = Array.from({ length: n }, (_, i) => mk(i)); };
  window.__padSet = (p, b, on) => { const btn = window.__pads[p].buttons[b]; btn.pressed = !!on; btn.value = on ? 1 : 0; };
  const orig = navigator.getGamepads ? navigator.getGamepads.bind(navigator) : () => [];
  navigator.getGamepads = () => (window.__pads && window.__pads.length ? window.__pads.slice() : orig());
});
const connect = (i) => page.evaluate((i) => { const ev = new Event("gamepadconnected"); Object.defineProperty(ev, "gamepad", { value: { index: i, id: "fakepad" } }); window.dispatchEvent(ev); }, i);
const types = () => page.evaluate(() => window.__harness.inputTypes());
const padOf = (pn) => page.evaluate((pn) => window.__harness.padBinding(pn), pn);
async function fresh(url = "") { await page.goto(`${base}/index.html?harness=1${url}`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness); }
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }).catch(() => {}); }

try {
  // ── 1. Choose PvP FIRST, then connect one pad ──────────────────────────────
  section("1) PvP chosen, THEN pad connects → pad binds to P2 (not P1)");
  await fresh();
  await page.evaluate(() => window.__padInit(1));
  const a0 = await page.evaluate(() => window.__harness.chooseModePvp());
  check("chooseMode('pvp') sets P1=keyboard, P2=controller", a0.p1 === "keyboard" && a0.p2 === "controller", JSON.stringify(a0));
  await connect(0); await page.waitForTimeout(60);
  let t = await types();
  check("after pad connects: P1 STAYS keyboard (not stolen)", t.p1 === "keyboard", `p1=${t.p1}`);
  check("after pad connects: P2 STAYS controller", t.p2 === "controller", `p2=${t.p2}`);
  check("pad bound to P2, not P1", (await padOf(2)) === 0 && (await padOf(1)) === null, `P1pad=${await padOf(1)} P2pad=${await padOf(2)}`);

  // ── 2. Connect pad FIRST, then choose PvP ──────────────────────────────────
  section("2) pad connects (cold kb/kb), THEN PvP chosen → single pad → P2");
  await fresh();
  await page.evaluate(() => window.__padInit(1));
  await connect(0); await page.waitForTimeout(30);
  const pre = await types();
  check("cold kb/kb + pad → P1 auto-activates controller (single-player default)", pre.p1 === "controller", `p1=${pre.p1}`);
  await page.evaluate(() => window.__harness.chooseModePvp());
  t = await types();
  check("PvP restores P1=keyboard for the single-pad case", t.p1 === "keyboard", `p1=${t.p1}`);
  check("PvP keeps P2=controller", t.p2 === "controller", `p2=${t.p2}`);
  check("pad bound to P2, not P1", (await padOf(2)) === 0 && (await padOf(1)) === null, `P1pad=${await padOf(1)} P2pad=${await padOf(2)}`);

  // ── 3. Settings: user sets P2=controller, then plugs pad ────────────────────
  section("3) Settings P2=controller, THEN pad connects → P1 not stolen");
  await fresh();
  await page.evaluate(() => window.__padInit(1));
  await page.evaluate(() => { window.__harness.setInputType(1, "keyboard"); window.__harness.setInputType(2, "controller"); });
  await connect(0); await page.waitForTimeout(60);
  t = await types();
  check("P1 stays keyboard, P2 stays controller", t.p1 === "keyboard" && t.p2 === "controller", JSON.stringify(t));
  check("pad bound to P2", (await padOf(2)) === 0 && (await padOf(1)) === null, `P1pad=${await padOf(1)} P2pad=${await padOf(2)}`);

  // ── 4. Two pads → pad/pad still allowed (P1 not forced back to keyboard) ────
  section("4) 2 pads + PvP → pad/pad (P1 may be controller)");
  await fresh();
  await page.evaluate(() => window.__padInit(2));
  await connect(0); await connect(1); await page.waitForTimeout(40);
  await page.evaluate(() => window.__harness.chooseModePvp());
  t = await types();
  check("2 pads: P1 controller, P2 controller (pad/pad preserved)", t.p1 === "controller" && t.p2 === "controller", JSON.stringify(t));
  check("distinct pads: P1→0, P2→1", (await padOf(1)) === 0 && (await padOf(2)) === 1, `P1pad=${await padOf(1)} P2pad=${await padOf(2)}`);

  // ── 5. IN-MATCH: keyboard P1 can JUMP while P2 is a connected controller ────
  section("5) keyboard player (P1) can still move/jump with a controller present");
  await fresh("&p1=naruto&p2=naruto");
  await page.evaluate(() => window.__padInit(1));
  await connect(0);
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => { window.__harness.setInputType(1, "keyboard"); window.__harness.setInputType(2, "controller"); });
  await waitFrames(6);
  await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 6000, polling: 16 }).catch(() => {});
  check("P1 keyboard slot binds NO pad", (await padOf(1)) === null, `P1pad=${await padOf(1)}`);
  const beforeY = (await page.evaluate(() => window.__harness.p1())).y;
  await page.keyboard.down("w"); await waitFrames(10); await page.keyboard.up("w");
  const p1jumped = await page.evaluate(([by]) => { const p = window.__harness.p1(); return !p.grounded || p.y < by - 4 || (p.vy || 0) < -1; }, [beforeY]);
  check("pressing P1's jump key (w) makes P1 jump — keyboard NOT blocked", p1jumped, "");

  // pad actually drives its fighter (single-player: pad on P1)
  await fresh("&p1=naruto&p2=naruto");
  await page.evaluate(() => window.__padInit(1));
  await connect(0);
  await page.evaluate(() => window.__harness.boot());
  await page.evaluate(() => { window.__harness.setInputType(1, "controller"); });
  await waitFrames(6);
  await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const by2 = (await page.evaluate(() => window.__harness.p1())).y;
  await page.evaluate(() => window.__padSet(0, 0, true)); await waitFrames(10); await page.evaluate(() => window.__padSet(0, 0, false));
  const padJumped = await page.evaluate(([by]) => { const p = window.__harness.p1(); return !p.grounded || p.y < by - 4 || (p.vy || 0) < -1; }, [by2]);
  check("pad button (X) makes its fighter jump — pad input works", padJumped, "");

  section("errors");
  check("no uncaught JS exceptions", jsErrors.length === 0, jsErrors.slice(0, 4).join(" | "));
} finally {
  await browser.close();
  server.close();
}
console.log(`\n════════\n  CONTROLLER PLAYER ASSIGN: ${PASS} passed, ${FAIL} failed\n════════`);
process.exit(FAIL ? 1 : 0);
