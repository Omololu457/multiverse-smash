// harness/clone_choreo_char.test.mjs — GENERIC per-character verifier for the clone-choreography engine.
// Usage: node harness/clone_choreo_char.test.mjs <rosterKey> [p2]
// Verifies for the given character: (Stage 0) clone ghost bodies render through renderHybridFighter with
// the character's OWN rosterKey (the visual-fidelity fix — real sprite, never a box); (Stage 2) all present
// sequences play clones→finisher and damage the foe, frame-deterministic; (Access) ↓↑+Special stages a
// formation, a Special direction selects each move and Ultimate-while-staged fires the swarm. Sequence
// display names are DERIVED from the engine (no hardcoding). Captures FORMATION + mid-run screenshots.
// Asserts NARUTO stays completely unaffected (his own module still fires; he is not in the generic roster).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const CHAR = (process.argv[2] || "tobirama").toLowerCase();
const P2   = (process.argv[3] || "sasuke").toLowerCase();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT  = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.cloneChoreo, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };
const clear = () => P(() => window.__harness.cloneChoreo.clear());
const SEQ_KEYS = ["pureAttack", "grab", "ranged", "defensive", "deception", "swarm"];
const SELECT_MAP = { N: "pureAttack", D: "deception", U: "defensive", B: "ranged", F: "grab" };
const UP = CHAR.toUpperCase();

try {
  console.log(`\n════ CLONE-CHOREOGRAPHY VERIFY — ${UP} (p2=${P2}) ════`);
  await page.goto(`${base}/index.html?harness=1&p1=${CHAR}&p2=${P2}`, { waitUntil: "load" });
  await boot();
  await sleep(400);

  const roster = await P(() => window.__harness.cloneChoreo.roster());
  check(`${UP} has an authored clone-choreography kit`, Array.isArray(roster) && roster.includes(CHAR), JSON.stringify(roster));

  const kit = await P(() => window.__harness.cloneChoreo.kit());
  const isLight = !!(kit && kit.light);

  if (isLight) {
    // ── LIGHT KIT (Sasuke/Obito): 1-2 moves, DIRECT-trigger, NO formation. ──
    console.log(`\n── LIGHT KIT: ${kit.seqKeys.length} move(s), direct-trigger (↓↓↑ + Special), no formation ──`);
    check(`${UP} is a light kit (1-2 moves, no overload)`, kit.seqKeys.length >= 1 && kit.seqKeys.length <= 2, JSON.stringify(kit.seqKeys));
    const nameOf = {};
    for (const key of kit.seqKeys) {
      await clear(); await sleep(40);
      const hp0 = await P(() => window.__harness.p2State?.().health ?? null);
      const r = await P((k) => { const ok = window.__harness.cloneChoreo.seq(k); const st = window.__harness.cloneChoreo.state(); return { ok, active: st.active, seq: st.sequence, nBodies: st.bodies ? st.bodies.length : 0, allChar: st.bodies ? st.bodies.map(b => b.rosterKey) : [], srcOk: st.bodies ? st.bodies.every(b => b.sheetSource === "renderHybridFighter") : false }; }, key);
      nameOf[key] = r.seq;
      check(`${key} → "${r.seq}": clones render as REAL ${UP} (renderHybridFighter)`, r.ok && r.active && r.nBodies >= 1 && r.allChar.every(rk => rk === CHAR) && r.srcOk, JSON.stringify(r));
      let sawFinisher = false, maxFrame = 0, shot = true;
      for (let i = 0; i < 24; i++) { const st = await P(() => window.__harness.cloneChoreo.state()); if (!st.active) break; maxFrame = Math.max(maxFrame, st.frame); if (st.finisherFired) sawFinisher = true; if (shot && st.bodies?.some(b => b.visible)) { shot = false; await page.locator("canvas").first().screenshot({ path: path.join(OUT, `CLONE_${UP}_${key}.png`) }); } await sleep(55); }
      const hp1 = await P(() => window.__harness.p2State?.().health ?? null);
      check(`${key}: finisher fired, deterministic, foe took damage`, sawFinisher && maxFrame >= 15 && hp0 != null && hp1 != null && hp1 < hp0, `fin=${sawFinisher} maxFrame=${maxFrame} hp ${hp0}→${hp1}`);
    }
    console.log("\n── DIRECT INPUT: ↓↓↑ + Special (held dir) plays the move — and does NOT stage a formation ──");
    for (const [dir, key] of Object.entries(kit.directMap || { N: kit.seqKeys[0] })) {
      await clear(); await sleep(40);
      await P((d) => window.__harness.cloneChoreo.direct(d), dir);
      let got = null, wasFormation = false;
      for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.cloneChoreo.state()); if (st.formation) wasFormation = true; if (st.active) { got = st.sequence; break; } await sleep(30); }
      check(`DIRECT(${dir}) → ${nameOf[key]} (no formation staged)`, got === nameOf[key] && !wasFormation, `got=${got} formation=${wasFormation}`);
      await sleep(500);
    }
    // screenshot the primary move's clone for the fidelity proof
    await clear(); await sleep(40);
    await P((k) => window.__harness.cloneChoreo.seq(k), kit.seqKeys[0]); await sleep(60);
    await page.locator("canvas").first().screenshot({ path: path.join(OUT, `CLONE_${UP}_formation.png`) });

    console.log("\n── NARUTO UNAFFECTED ──");
    check("Naruto is NOT in the generic roster (keeps his own module)", !roster.includes("naruto"), "");
    await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
    await boot(); await sleep(300);
    await P(() => window.__harness.narutoChoreoClear());
    const nb = await P(() => window.__harness.narutoBarrage());
    let nseq = null; for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.narutoChoreo()); if (st.active) { nseq = st.sequence; break; } await sleep(30); }
    check("Naruto Uzumaki Barrage still fires unchanged", nb === true && nseq === "Uzumaki Barrage", `ok=${nb} seq=${nseq}`);
    check("no JS errors across the whole run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
    console.log(`\nRESULT (${UP}): ${pass} pass / ${fail} fail`);
    await browser.close(); server.close();
    process.exit(fail ? 1 : 0);
  }

  console.log("\n── STAGE 0 + 2: each sequence plays, clones render as the REAL character, foe takes damage ──");
  const nameOf = {};   // seqKey → display name (derived from the engine)
  for (const key of SEQ_KEYS) {
    await clear(); await sleep(40);
    const hp0 = await P(() => window.__harness.p2State?.().health ?? null);
    const r = await P((k) => { const ok = window.__harness.cloneChoreo.seq(k); const st = window.__harness.cloneChoreo.state(); return { ok, active: st.active, seq: st.sequence, rk: st.rosterKey, nBodies: st.bodies ? st.bodies.length : 0, allChar: st.bodies ? st.bodies.map(b => b.rosterKey) : [], srcOk: st.bodies ? st.bodies.every(b => b.sheetSource === "renderHybridFighter") : false }; }, key);
    if (!r.ok) { check(`${key}: present + starts`, false, JSON.stringify(r)); continue; }
    nameOf[key] = r.seq;
    const allChar = r.allChar.every(rk => rk === CHAR);
    check(`${key} → "${r.seq}": starts + clones render as REAL ${UP} (renderHybridFighter)`, r.active === true && r.nBodies >= 1 && allChar && r.srcOk, JSON.stringify(r));
    let sawFinisher = false, maxFrame = 0, shot = (key === "pureAttack");
    for (let i = 0; i < 26; i++) {
      const st = await P(() => window.__harness.cloneChoreo.state());
      if (!st.active) break;
      maxFrame = Math.max(maxFrame, st.frame);
      if (st.finisherFired) sawFinisher = true;
      if (shot && st.bodies?.some(b => b.visible)) { shot = false; await page.locator("canvas").first().screenshot({ path: path.join(OUT, `CLONE_${UP}_run.png`) }); }
      await sleep(55);
    }
    const hp1 = await P(() => window.__harness.p2State?.().health ?? null);
    check(`${key}: finisher fired, deterministic, foe took damage`, sawFinisher && maxFrame >= 20 && hp0 != null && hp1 != null && hp1 < hp0, `fin=${sawFinisher} maxFrame=${maxFrame} hp ${hp0}→${hp1}`);
    await sleep(150);
  }

  console.log("\n── FORMATION screenshot (clones flank the real character — visual-fidelity proof) ──");
  await clear(); await sleep(40);
  await P(() => window.__harness.cloneChoreo.summon()); await sleep(50);
  const fmState = await P(() => window.__harness.cloneChoreo.state());
  await P(() => window.__harness.cloneChoreo.formationHold()); await sleep(120);
  await page.locator("canvas").first().screenshot({ path: path.join(OUT, `CLONE_${UP}_formation.png`) });
  check("↓↑+Special stages a clone formation (window open, ≥3 clones, all the real character)", fmState.formation === true && fmState.window > 0 && fmState.bodies.length >= 3 && fmState.bodies.every(b => b.rosterKey === CHAR), JSON.stringify({ formation: fmState.formation, window: fmState.window, n: fmState.bodies?.length }));

  console.log("\n── ACCESS: SUMMON → SELECT(dir) routes to each sequence ──");
  for (const [dir, key] of Object.entries(SELECT_MAP)) {
    await clear(); await sleep(40);
    await P(() => window.__harness.cloneChoreo.summon()); await sleep(60);
    await P((d) => window.__harness.cloneChoreo.select(d), dir);
    let got = null;
    for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.cloneChoreo.state()); if (st.active) { got = st.sequence; break; } await sleep(30); }
    check(`SUMMON → SELECT(${dir}) → ${nameOf[key] || key}`, got === nameOf[key], `got=${got} expect=${nameOf[key]}`);
    await sleep(500);
  }

  console.log("\n── ACCESS: SUMMON → Ultimate → the Ultimate-Swarm ──");
  await clear(); await sleep(40);
  await P(() => window.__harness.cloneChoreo.summon()); await sleep(60);
  await P(() => window.__harness.cloneChoreo.swarm());
  let sw = null;
  for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.cloneChoreo.state()); if (st.active) { sw = st.sequence; break; } await sleep(30); }
  check(`SUMMON → Ultimate → ${nameOf.swarm}`, sw === nameOf.swarm, `got=${sw}`);
  await sleep(700);

  console.log("\n── NARUTO UNAFFECTED ──");
  check("Naruto is NOT in the generic roster (keeps his own module)", !roster.includes("naruto"), JSON.stringify(roster));
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await boot(); await sleep(300);
  await P(() => window.__harness.narutoChoreoClear());
  const nb = await P(() => window.__harness.narutoBarrage());
  let nseq = null; for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.narutoChoreo()); if (st.active) { nseq = st.sequence; break; } await sleep(30); }
  check("Naruto Uzumaki Barrage still fires unchanged", nb === true && nseq === "Uzumaki Barrage", `ok=${nb} seq=${nseq}`);

  check("no JS errors across the whole run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("test crashed", false, String(e && e.stack || e));
} finally {
  console.log(`\nRESULT (${UP}): ${pass} pass / ${fail} fail`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
