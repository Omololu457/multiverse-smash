// harness/naruto_summon_select.test.mjs — ADDITIVE summon-then-choose system + the 4 new sequences.
// Verifies: (baseline) Uzumaki Barrage's own Down+Special still fires it unchanged; (Stage 1) the summon
// input stages a clone FORMATION and a follow-up direction SELECTS a sequence per SELECT_MAP; (Stage 2)
// all 5 sequences play with clones rendered as real Naruto (rosterKey via renderHybridFighter); (Stage 3)
// each is reachable by simple input. Deterministic/frame-driven.
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
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.narutoSeq, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };
const clear = () => P(() => window.__harness.narutoChoreoClear());

const EXPECT = { barrage: "Uzumaki Barrage", twoThousand: "Two Thousand Combo", shuriken: "Shadow Clone Shuriken", substitution: "Substitution Escape", flank: "Clone Flank Strike" };
const SELECT = { N: "Uzumaki Barrage", D: "Two Thousand Combo", B: "Shadow Clone Shuriken", U: "Substitution Escape", F: "Clone Flank Strike" };

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await boot();
  await sleep(400);

  console.log("\n── BASELINE: Uzumaki Barrage direct trigger (Down+Special) UNCHANGED ──");
  const ok = await P(() => window.__harness.narutoBarrage());   // flag-based → starts next frame
  let bseq = null; for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.narutoChoreo()); if (st.active) { bseq = st.sequence; break; } await sleep(30); }
  check("Down+Special still fires Uzumaki Barrage", ok === true && bseq === "Uzumaki Barrage", `ok=${ok} seq=${bseq}`);
  await sleep(900); // let it finish

  await clear();
  console.log("\n── STAGE 2: each of the 5 sequences plays, clones render as Naruto ──");
  for (const [key, name] of Object.entries(EXPECT)) {
    await clear(); await sleep(40); // reset previous run
    // atomic: start the sequence and read its state in ONE evaluate (frame 0, guaranteed active)
    const r = await P((k) => { const ok = window.__harness.narutoSeq(k); const st = window.__harness.narutoChoreo(); return { ok, active: st.active, seq: st.sequence, nBodies: st.bodies ? st.bodies.length : 0, allNaruto: st.bodies ? st.bodies.every(b => b.rosterKey === "naruto") : false }; }, key);
    check(`${name}: starts + correct sequence`, r.ok === true && r.active === true && r.seq === name, JSON.stringify(r));
    check(`${name}: clone bodies render as Naruto`, r.nBodies >= 1 && r.allNaruto, `bodies=${r.nBodies} allNaruto=${r.allNaruto}`);
    await sleep(700);
  }

  console.log("\n── STAGE 1: SUMMON stages a formation, SELECT routes to each sequence ──");
  for (const [dir, name] of Object.entries(SELECT)) {
    await clear(); await sleep(40);
    await P(() => window.__harness.narutoSummon());
    await sleep(60);
    const fm = await P(() => window.__harness.narutoChoreo());
    if (dir === "N") check("SUMMON stages a clone formation (window open, ≥3 clones)", fm.formation === true && fm.window > 0 && fm.bodies.length >= 3 && fm.bodies.every(b => b.rosterKey === "naruto"), JSON.stringify({ formation: fm.formation, window: fm.window, n: fm.bodies?.length }));
    await P((d) => window.__harness.narutoSelect(d), dir);
    // poll for the chosen sequence to go active (select is processed next frame)
    let got = null;
    for (let i = 0; i < 12; i++) { const st = await P(() => window.__harness.narutoChoreo()); if (st.active) { got = st.sequence; break; } await sleep(30); }
    check(`SUMMON → SELECT(${dir}) → ${name}`, got === name, `got=${got}`);
    await sleep(700);
  }

  check("no JS errors across all sequences", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  check("test crashed", false, String(e && e.stack || e));
} finally {
  console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
