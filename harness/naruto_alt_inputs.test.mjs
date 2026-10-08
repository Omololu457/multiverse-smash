// harness/naruto_alt_inputs.test.mjs — Part 2 Stage 6 (2026-09-26).
// Each of Naruto's directional Special moves gains an ADDITIONAL longer MOTION input that fires the SAME
// move; the original simple (hold-direction + Special) input is unchanged. For EACH move, verifies the OLD
// simple input AND the NEW motion input trigger the identical outcome. Motion inputs are fed deterministically
// into the real motion buffer (no keyboard-timing flakiness), then the REAL Special-press path fires.
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
const sleep = ms => new Promise(r => setTimeout(r, ms));
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.narutoFeedMotion, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };
const clear = () => P(() => window.__harness.narutoChoreoClear());
// OLD input: hold a direction + Special (brutality.p1Spec refills energy + fires via the real triggerSpecial)
const simple = (dir) => P((d) => window.__harness.brutality.p1Spec(d), dir);
// NEW input: feed the motion into the buffer, then press Special NEUTRAL (no held dir) so the motion-normalize fires it
const viaMotion = async (keys) => { await P((k) => window.__harness.narutoFeedMotion(k), keys); return P(() => window.__harness.brutality.p1Spec(null)); };
const seqNow = async () => { for (let i = 0; i < 14; i++) { const st = await P(() => window.__harness.narutoChoreo()); if (st.active) return st.sequence; await sleep(30); } return null; };
const projSoon = async (name) => { for (let i = 0; i < 10; i++) { const ps = await P(() => window.__harness.projectiles()); if (ps.some(p => (p.name || "") === name)) return true; await sleep(25); } return false; };
const formationSoon = async () => { for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.narutoChoreo()); if (st.formation) return true; await sleep(25); } return false; };

// [name, OLD held-dir, NEW motion keys, verify()]  — down=s forward=d back=a up=w  (p1 faces right)
const MOVES = [
  ["Uzumaki Barrage",          "D", ["s", "d", "s", "d"], async () => (await seqNow()) === "Uzumaki Barrage"],  // ↓→↓→ doubleQCF
  ["Dark Rasengan",            "B", ["s", "a", "s", "a"], () => projSoon("darkRasenganRings")],                  // ↓←↓← doubleQCB
  ["Kurama Chakra-Arm Strike", "F", ["a", "s", "d"],      () => projSoon("narutoChakraArmStrike")],              // ←↓→  hcf
  ["Summon formation",         "U", ["s", "w"],           () => formationSoon()],                                // ↓↑   chargeUp
];

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await boot();
  await sleep(400);

  for (const [name, oldDir, motionKeys, verify] of MOVES) {
    console.log(`\n── ${name} ── OLD: (hold-dir)+Special · NEW: motion+Special ──`);
    await clear(); await sleep(120);
    const o = await simple(oldDir);
    check(`OLD input fires ${name}`, o && o.ok === true && (await verify()), "");
    await sleep(700); await clear(); await sleep(120);
    const n = await viaMotion(motionKeys);
    check(`NEW motion input fires the SAME ${name}`, n && n.ok === true && (await verify()), "");
    await sleep(700);
  }

  // Directional ULTIMATE (STAGE 5): NEUTRAL = Nine-Tails (Kurama Avatar); DOWN and ↓←↓← (doubleQCB) are kept
  // as ALTERNATES → the same Nine-Tails. Two Thousand Combo moved to the summon→Ultimate swarm slot. Each
  // Kurama fire consumes the cinematic + a long recast, so the two routes are verified across two boots.
  const kuramaSoon = async () => { for (let i = 0; i < 14; i++) { const k = await P(() => window.__harness.kuramaUltCine()); if (k && k.active) return true; await sleep(45); } return false; };
  console.log("\n── Nine-Tails (Ultimate) — neutral = Kurama; ↓←↓← alternate = same Kurama ──");
  await page.keyboard.press("F3"); await sleep(80);   // infinite resources for the live ultimate press
  // Neutral Ultimate (no motion) = Nine-Tails (Kurama cinematic), NOT the clone choreography.
  await clear(); await sleep(150);
  await page.keyboard.down("u"); await sleep(50); await page.keyboard.up("u");
  check("neutral Ultimate = Nine-Tails (Kurama cinematic, real key)", await kuramaSoon(), "");
  const neutralChoreo = (await P(() => window.__harness.narutoChoreo())).active;
  check("neutral Ultimate does NOT start the clone choreography", neutralChoreo !== true, `choreoActive=${neutralChoreo}`);
  // Fresh boot (clears the first cinematic + recast), then the ↓←↓← motion alternate → the same Nine-Tails.
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await boot(); await sleep(300);
  await page.keyboard.press("F3"); await sleep(80); await clear(); await sleep(150);
  await P((k) => window.__harness.narutoFeedMotion(k), ["s", "a", "s", "a"]);
  await page.keyboard.down("u"); await sleep(50); await page.keyboard.up("u");
  check("ALTERNATE: ↓←↓← + Ultimate = Nine-Tails (Kurama cinematic)", await kuramaSoon(), "");
  const afterMotionUlt = (await P(() => window.__harness.narutoChoreo())).sequence || null;
  check("↓←↓← + Ultimate does NOT start the Two Thousand Combo choreography", afterMotionUlt !== "Two Thousand Combo", `choreo=${afterMotionUlt}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("test crashed", false, String(e && e.stack || e));
} finally {
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
