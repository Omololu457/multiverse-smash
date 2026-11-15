// harness/jump_on_up.test.mjs — input quick-wins Phase 4: "Jump on Up" per-player pad setting + clone-summon
// jump grace on the pad path. Real matches, fake standard pads, BOTH pads (P1 and P2), BOTH facing directions.
//   • default OFF on pads, persisted per player (survives a reload), keyboard untouched
//   • OFF: Up alone never jumps; Cross still jumps; ON: Up jumps (old behaviour)
//   • up-attack: "hold Up, then Square" = the same grounded launcher as a simultaneous Up+Square, no jump
//   • up-special (Yuji Pillar): "hold Up, then R1" = the same grounded Up-special as simultaneous Up+R1
//   • clone summon (↓↓↑ then R1, Tobirama): stages GROUNDED with Jump-on-Up ON (the grace, mirrored from keys)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json", ".ogg": "audio/ogg", ".webp": "image/webp" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const fp = path.join(ROOT, u === "/" ? "/index.html" : u); if (!fp.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(fp, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(fp)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
const B = { CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3, L1: 4, R1: 5, L2: 6, R2: 7, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

let page, errs;
const H = (fn, a) => page.evaluate(fn, a);
async function fr(n) { const s = await H(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function open(p1, p2, { keepStorage = false } = {}) {
  if (page) await page.close();
  page = await ctx.newPage(); errs = []; page.on("pageerror", e => errs.push(e.message));
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 20000 });
  if (!keepStorage) await H(() => { for (const pn of [1, 2]) window.__harness.ui.setJumpOnUp(pn, null) });
  await page.mouse.click(640, 360);
  await H(() => {
    const mk = i => ({ index: i, id: "DualSense Wireless Controller 054c", connected: true, mapping: "standard", axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
    window.__pads = [mk(0), mk(1)];
    navigator.getGamepads = () => window.__pads;
    window.__harness.boot();
    window.__harness.setInputType(1, "controller"); window.__harness.setInputType(2, "controller");
  });
  await page.keyboard.press("F3");   // training: infinite resources (summon / special costs)
  await fr(20);
}
// Frame-exact in-page sequencer: steps = [[{button: bool, ...}, frames], ...] applied on the game's own frame
// clock, while tracking the fighter's lift / first move / staged clone formation. No Node round-trips, so a
// ↓↓↑ motion lands inside its real-time window exactly as a human's would.
async function seq(pn, steps, tail = 0) {
  return H(([pn, steps, tail]) => new Promise(resolve => {
    const h = window.__harness, w = pn === 1 ? "p1" : "p2", pad = window.__pads[pn - 1];
    const y0 = h[w]().y; let minY = y0, move = null, attacked = false, staged = false; const ys = [];
    const plan = []; for (const [btns, n] of steps) for (let i = 0; i < n; i++) plan.push(btns); for (let i = 0; i < tail; i++) plan.push({});
    let idx = -1, last = h.state().frame, t0 = null, motionMs = null;
    const tick = () => {
      const f = h.state().frame;
      if (f !== last) {
        last = f; idx++;
        // being HIT (e.g. a stray dummy poke) is not a jump, so hurt frames don't count toward lift
        const s = h[w](); if (!/hurt|hit|knock|stun/i.test(s.action || "")) minY = Math.min(minY, s.y); ys.push(Math.round(s.y) + (s.action && s.action !== "idle" ? ":" + s.action : "")); if (s.attacking) attacked = true; if (!move && s.currentMove) move = s.currentMove;
        const c = h.cloneChoreo?.state(w); if (c && (c.formation || c.active)) staged = true;
        if (idx === 0) t0 = performance.now();
        if (motionMs == null && idx < plan.length && plan[idx]["5"]) motionMs = Math.round(performance.now() - t0);   // first ↓ → Special, wall-clock
        if (idx >= plan.length) { for (const b of pad.buttons) { b.pressed = false; b.value = 0 } pad.axes[1] = 0; return resolve({ lift: Math.round(y0 - minY), move, attacked, staged, ys: ys.join(","), motionMs }); }
        for (const b of pad.buttons) { b.pressed = false; b.value = 0 }
        pad.axes[1] = 0;
        for (const [k, v] of Object.entries(plan[idx])) { if (k === "stickUp") pad.axes[1] = v ? -1 : 0; else { pad.buttons[+k].pressed = !!v; pad.buttons[+k].value = v ? 1 : 0 } }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), [pn, steps, tail]);
}
const btn = (pn, i, v) => H(([pn, i, v]) => { const b = window.__pads[pn - 1].buttons[i]; b.pressed = v; b.value = v ? 1 : 0; }, [pn, i, v]);
const who = pn => pn === 1 ? "p1" : "p2";
const snap = pn => H(w => window.__harness[w](), who(pn));
async function releaseAll(pn) { for (const i of Object.values(B)) await btn(pn, i, false); }
async function settle(pn) {
  await releaseAll(pn);
  await page.waitForFunction(w => { const s = window.__harness[w](); return s.grounded && !s.attacking && Math.abs(s.vy || 0) < 0.5; }, who(pn), { timeout: 6000, polling: 16 }).catch(() => {});
  // …and the body has stopped moving vertically (a reposition can leave a few px of settle).
  let prevY = null, still = 0;
  for (let i = 0; i < 90 && still < 8; i++) { const y = (await snap(pn)).y; still = (prevY !== null && Math.abs(y - prevY) < 0.01) ? still + 1 : 0; prevY = y; await fr(1); }
  await fr(6);
}
// Face `dir` (+1 right / -1 left): put the tested fighter on the far side of the other one.
async function face(pn, dir) {
  await H(([pn, dir]) => { const h = window.__harness; const mid = h.arena().mid; const me = mid - dir * 160, foe = mid + dir * 160; if (pn === 1) { h.setP1X(me); h.setP2X(foe); } else { h.setP2X(me); h.setP1X(foe); } }, [pn, dir]);
  await fr(8);
  return (await snap(pn)).facing;
}
// Track lift (px above the start y) + first non-null move while running `n` frames.
async function watch(pn, n) {
  const y0 = (await snap(pn)).y; let minY = y0, move = null, attacked = false;
  for (let i = 0; i < n; i++) { const s = await snap(pn); minY = Math.min(minY, s.y); if (s.attacking) attacked = true; if (!move && s.currentMove) move = s.currentMove; await fr(1); }
  return { lift: Math.round(y0 - minY), move, attacked };
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const padGraceLift = {};
try {
  section("setting: default, toggle, persistence");
  await open("goku", "goku");
  check("P1 Jump on Up defaults OFF on a pad", (await H(() => window.__harness.ui.jumpOnUp(1))) === false);
  check("P2 Jump on Up defaults OFF on a pad", (await H(() => window.__harness.ui.jumpOnUp(2))) === false);
  await H(() => window.__harness.ui.setJumpOnUp(1, true));
  await open("goku", "goku", { keepStorage: true });
  check("P1 = ON survives a reload (saved per player)", (await H(() => window.__harness.ui.jumpOnUp(1))) === true);
  check("P2 still OFF (per-player, independent)", (await H(() => window.__harness.ui.jumpOnUp(2))) === false);
  await H(() => window.__harness.ui.setJumpOnUp(1, null));
  // Settings screen click toggles it.
  await H(() => window.__harness.showMenu("SETTINGS"));
  await fr(4);
  const R = await H(() => window.__harness.ui.settingsJumpRects());
  await page.mouse.click(R.p2.x + R.p2.w / 2, R.p2.y + R.p2.h / 2); await fr(3);
  check("clicking the Settings 'P2 Jump on Up (pad)' row toggles P2 ON", (await H(() => window.__harness.ui.jumpOnUp(2))) === true);
  await page.screenshot({ path: path.join(ROOT, "harness", "shots", "jump_on_up_settings.png") });
  await page.mouse.click(R.p2.x + R.p2.w / 2, R.p2.y + R.p2.h / 2); await fr(3);
  check("clicking again toggles P2 back OFF", (await H(() => window.__harness.ui.jumpOnUp(2))) === false);

  for (const pn of [1, 2]) for (const dir of [1, -1]) {
    const tag = `P${pn} pad, facing ${dir === 1 ? "right" : "left"}`;
    section(`${tag}: Up vs Cross (goku)`);
    await open("goku", "goku");
    check(`${tag}: facing set`, (await face(pn, dir)) === dir);
    await settle(pn);
    let r = await seq(pn, [[{ [B.UP]: true }, 30]]); await settle(pn);
    check(`${tag}: OFF — holding d-pad Up does NOT jump`, r.lift <= 2, `lift=${r.lift}px`);
    r = await seq(pn, [[{ stickUp: true }, 30]]); await settle(pn);
    check(`${tag}: OFF — stick Up does NOT jump`, r.lift <= 2, `lift=${r.lift}px ys=${r.ys}`);
    r = await seq(pn, [[{ [B.CROSS]: true }, 3]], 25); await settle(pn);
    check(`${tag}: OFF — Cross still jumps`, r.lift > 40, `lift=${r.lift}px`);
    await H(([pn]) => window.__harness.ui.setJumpOnUp(pn, true), [pn]);
    r = await seq(pn, [[{ [B.UP]: true }, 25]]); await settle(pn);
    check(`${tag}: ON — Up jumps (old behaviour available)`, r.lift > 40, `lift=${r.lift}px`);
    await H(([pn]) => window.__harness.ui.setJumpOnUp(pn, null), [pn]);

    section(`${tag}: up-attack (goku)`);
    await settle(pn);
    const sim = await seq(pn, [[{ [B.UP]: true, [B.SQUARE]: true }, 3]], 12); await settle(pn);
    check(`${tag}: simultaneous Up+Square = grounded launcher (baseline)`, sim.attacked && sim.lift <= 2, `move=${sim.move} lift=${sim.lift}`);
    const held = await seq(pn, [[{ [B.UP]: true }, 8], [{ [B.UP]: true, [B.SQUARE]: true }, 3]], 12); await settle(pn);
    check(`${tag}: OFF — hold Up THEN Square = the same grounded launcher, no jump`, held.attacked && held.lift <= 2 && held.move === sim.move, `move=${held.move} vs ${sim.move} lift=${held.lift}`);

    section(`${tag}: up-special (yuji Cursed-Energy Pillar)`);
    await open(pn === 1 ? "yuji" : "goku", pn === 2 ? "yuji" : "goku");
    await face(pn, dir); await settle(pn);
    const us0 = await seq(pn, [[{ [B.UP]: true, [B.R1]: true }, 3]], 14); await settle(pn); await fr(120);   // let the special's cooldown clear
    check(`${tag}: simultaneous Up+R1 = grounded up-special (baseline)`, us0.attacked && us0.lift <= 2, `move=${us0.move} lift=${us0.lift}`);
    const us1 = await seq(pn, [[{ [B.UP]: true }, 8], [{ [B.UP]: true, [B.R1]: true }, 3]], 14); await settle(pn);
    check(`${tag}: OFF — hold Up THEN R1 = the same grounded up-special, no jump`, us1.attacked && us1.lift <= 2 && us1.move === us0.move, `move=${us1.move} vs ${us0.move} lift=${us1.lift}`);

    section(`${tag}: clone summon ↓↓↑ then R1 (tobirama) — grace with Jump on Up ON`);
    await open(pn === 1 ? "tobirama" : "goku", pn === 2 ? "tobirama" : "goku");
    await face(pn, dir); await settle(pn);
    for (const on of [true, false]) {
      await H(([pn, on]) => { window.__harness.ui.setJumpOnUp(pn, on); window.__harness.cloneChoreo.clear(pn === 1 ? "p1" : "p2"); }, [pn, on]);
      await settle(pn);
      // ↓ ↓ ↑(held 4f — with ON this alone would jump) then R1 a few frames later: a brisk human input. NOTE the
      // grace window is the keyboard's 800ms WALL-CLOCK window (mirrored as-is), so a heavily loaded headless
      // browser running well under 60fps can stretch these frames past it; keep the motion brisk.
      // PRECONDITION: the whole ↓↓↑ + Special must land inside the 800ms WALL-CLOCK window (mirrored from the
      // keyboard). A loaded headless browser can run this game <21fps; such an attempt is not a valid sample,
      // so retry (≤6) until the motion took <790ms — the assertions below only ever judge a valid attempt.
      let r, attempts = 0;
      do {
        if (attempts) { await H(w => window.__harness.cloneChoreo.clear(w), who(pn)); await settle(pn); await fr(40); }
        r = await seq(pn, [[{ [B.DOWN]: true }, 1], [{}, 1], [{ [B.DOWN]: true }, 1], [{}, 1], [{ [B.UP]: true }, 4], [{ [B.UP]: true, [B.R1]: true }, 4]], 30);
        attempts++;
      } while (r.motionMs >= 790 && attempts < 6);
      check(`${tag}: Jump on Up ${on ? "ON" : "OFF"} — motion fit the 800ms window (valid sample)`, r.motionMs < 790, `${r.motionMs}ms, attempts=${attempts}`);
      check(`${tag}: Jump on Up ${on ? "ON" : "OFF"} — ↓↓↑ + R1 staged the formation`, r.staged);
      if (on) {
        // ON = Up jumps, so the keyboard's clone-summon grace now governs the pad too. Mirror check: the pad's
        // lift must equal the keyboard's on the same frame-exact sequence (measured once, P1 keyboard below).
        padGraceLift[`${pn}/${dir}`] = r.lift;
        check(`${tag}: Jump on Up ON — grace keeps it grounded through ↓↓↑ (≤40px, the keyboard harness's tolerance)`, r.lift <= 40, `lift=${r.lift}px`);
      } else check(`${tag}: Jump on Up OFF — did NOT jump at all`, r.lift <= 2, `lift=${r.lift}px`);
      await H(w => window.__harness.cloneChoreo.clear(w), who(pn)); await settle(pn); await fr(40);
    }
    await H(([pn]) => window.__harness.ui.setJumpOnUp(pn, null), [pn]);
    check(`${tag}: no page errors`, errs.length === 0, errs[0] || "");
  }

  section("pad clone grace == keyboard clone grace (same frame-exact ↓↓↑ + Special)");
  await open("tobirama", "goku");
  await H(() => window.__harness.setInputType(1, "keyboard"));
  await settle(1);
  let kbGrace, kbAttempts = 0;
  do {
  if (kbAttempts) { await H(() => window.__harness.cloneChoreo.clear("p1")); await settle(1); await fr(40); }
  kbGrace = await H(() => new Promise(resolve => {
    const h = window.__harness, k = (key, down) => document.dispatchEvent(new KeyboardEvent(down ? "keydown" : "keyup", { key, bubbles: true }));
    const plan = [["s", 1], [null, 1], ["s", 1], [null, 1], ["w", 4], ["w+l", 4]]; const flat = []; for (const [b, n] of plan) for (let i = 0; i < n; i++) flat.push(b); for (let i = 0; i < 30; i++) flat.push(null);
    const y0 = h.p1().y; let minY = y0, staged = false, idx = -1, last = h.state().frame, held = new Set(), t0 = null, motionMs = null;
    const tick = () => { const f = h.state().frame; if (f !== last) { last = f; idx++;
        if (idx === 0) t0 = performance.now();
        if (motionMs == null && flat[idx] === "w+l") motionMs = Math.round(performance.now() - t0);
        minY = Math.min(minY, h.p1().y); const c = h.cloneChoreo.state("p1"); if (c.formation || c.active) staged = true;
        if (idx >= flat.length) { for (const x of held) k(x, false); return resolve({ lift: Math.round(y0 - minY), staged, motionMs }); }
        const want = new Set(flat[idx] ? flat[idx].split("+") : []);
        for (const x of held) if (!want.has(x)) { k(x, false); held.delete(x) }
        for (const x of want) if (!held.has(x)) { k(x, true); held.add(x) } }
      requestAnimationFrame(tick) }; requestAnimationFrame(tick); }));
  kbAttempts++;
  } while (kbGrace.motionMs >= 790 && kbAttempts < 6);
  check("keyboard motion fit the 800ms window (valid sample)", kbGrace.motionMs < 790, `${kbGrace.motionMs}ms, attempts=${kbAttempts}`);
  check("keyboard ↓↓↑ + Special staged the formation", kbGrace.staged);
  const lifts = Object.values(padGraceLift);
  check(`pad grace lift == keyboard grace lift on every pad/facing (keyboard ${kbGrace.lift}px)`, lifts.length === 4 && lifts.every(l => Math.abs(l - kbGrace.lift) <= 1), JSON.stringify(padGraceLift));

  section("keyboard unchanged: P1 keyboard Up (W) still jumps");
  await open("goku", "goku");
  await H(() => window.__harness.setInputType(1, "keyboard"));
  await settle(1);
  await page.keyboard.down("w"); const kb = await watch(1, 20); await page.keyboard.up("w");
  check("keyboard W jumps regardless of the pad setting", kb.lift > 40, `lift=${kb.lift}px`);
} finally { await browser.close(); server.close(); }

console.log(`\n════════════════════════════════════════════`);
console.log(`  JUMP ON UP + PAD CLONE GRACE: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
