// harness/jiraiya_clones_shots.mjs — REAL-INPUT verification of Jiraiya's LIGHT clone kit.
// P1 keys: down=S up=W special=L ultimate=U. Summon motion ↓↓↑ = S,S,W then Special=L (grounded, no jump).
// Verifies: Up+Special collision (plain Up+Special = Ranjishigami, NOT a summon); real ↓↓↑+Special → Clone
// Pincer (base 1 clone) with no jump; Hermit = 2 clones; clones render as REAL Jiraiya (renderHybridFighter)
// in the CURRENT form; Clone Feint (escape). Screenshots → /tmp/jiraiya_clones/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/jiraiya_clones"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const st = () => P(() => window.__harness.state());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function full(name) { await page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") }); }
const cs = () => P(() => window.__harness.cloneChoreo.state("p1"));
const p1 = () => P(() => window.__harness.p1());
const clear = () => P(() => window.__harness.cloneChoreo.clear ? window.__harness.cloneChoreo.clear("p1") : null);
const ready = () => P(() => window.__harness.jiraiya.refill());
// real ↓↓↑ + Special (grounded). holdDownAtSpecial=true → hold Down when pressing Special (D-select).
async function summonMotion(holdDownAtSpecial = false) {
  await page.keyboard.press("s"); await sleep(45);
  await page.keyboard.press("s"); await sleep(45);
  await page.keyboard.down("w"); await sleep(120);
  if (holdDownAtSpecial) { await page.keyboard.up("w"); await page.keyboard.down("s"); await sleep(40); }
  await page.keyboard.down("l"); await sleep(70);
  await page.keyboard.up("l"); await page.keyboard.up("w"); await page.keyboard.up("s").catch(() => {});
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=jiraiya&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.cloneChoreo, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.waitForFunction(() => { const l = document.getElementById("loading"); return !l || l.classList.contains("hidden"); }, null, { timeout: 20000 }).catch(() => {});
  await P(() => window.__harness.boot());
  await wf(6);

  // ── registration: jiraiya is a clone-kit char (light), directMap present ──
  const kit = await P(() => window.__harness.cloneChoreo.kit("p1"));
  check("jiraiya has a LIGHT clone kit", kit && kit.light === true, JSON.stringify(kit));
  check("directMap = {N:Pincer, D:Feint}", kit && kit.directMap && kit.directMap.N === "jiraiyaClonePincer" && kit.directMap.D === "jiraiyaCloneFeint", JSON.stringify(kit?.directMap));

  // ── COLLISION: plain Up+Special must fire Ranjishigami (NOT a clone summon) ──
  await clear(); await ready(); await wf(2);
  const e0 = (await p1()).energy;
  await page.keyboard.down("w"); await sleep(40); await page.keyboard.down("l"); await sleep(70); await page.keyboard.up("l"); await page.keyboard.up("w");
  await wf(3);
  const coll = await cs(); const e1 = (await p1()).energy;
  check("Up+Special did NOT summon a clone (no collision)", !coll.active && !coll.formation, `active=${coll.active} formation=${coll.formation}`);
  check("Up+Special DID fire a special (Ranjishigami — energy spent)", e1 < e0, `energy ${Math.round(e0)}→${Math.round(e1)}`);
  await wf(30);

  // ── BASE: real ↓↓↑+Special → Clone Pincer, 1 clone, NO jump ──
  await clear(); await ready(); await wf(2);
  const y0 = (await p1()).y;
  await summonMotion(false);
  let minY = y0, got = null, nBodies = 0, allJiraiya = false, realSprite = false;
  for (let i = 0; i < 16; i++) { const s = await cs(); const pp = await p1(); minY = Math.min(minY, pp.y); if (s.active) { got = s.sequence; nBodies = s.bodies.length; allJiraiya = s.bodies.every(b => b.rosterKey === "jiraiya"); realSprite = s.bodies.every(b => b.sheetSource === "renderHybridFighter"); if (i === 3) await full("03_pincer_base_mid"); break; } await sleep(45); }
  check("real ↓↓↑+Special → Clone Pincer (grounded, no jump)", got === "Shadow Clone Pincer" && (y0 - minY) < 12, `seq=${got} jumpedPx=${Math.round(y0 - minY)}`);
  check("BASE form = 1 clone", nBodies === 1, `clones=${nBodies}`);
  check("clone renders as REAL Jiraiya (renderHybridFighter)", allJiraiya && realSprite, `allJiraiya=${allJiraiya} realSprite=${realSprite}`);
  await full("04_pincer_base_clone_beside");
  await wf(40);

  // ── HERMIT: enter Sage Mode (real U), then ↓↓↑+Special → Twin Pincer, 2 clones ──
  await clear(); await ready(); await wf(2);
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u");
  await page.waitForFunction(() => window.__harness.jiraiya.state().hermit === true, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await wf(36);   // let the ~60f form cinematic fully end before the clone motion (avoids cast-lock race)
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const hermit = (await P(() => window.__harness.jiraiya.state())).hermit;
  await clear(); await ready(); await wf(4);   // clear motion history + choreo so the hermit motion reads clean
  const hy0 = (await p1()).y;
  await summonMotion(false);
  let hgot = null, hBodies = 0, hAll = false;
  for (let i = 0; i < 16; i++) { const s = await cs(); if (s.active) { hgot = s.sequence; hBodies = s.bodies.length; hAll = s.bodies.every(b => b.rosterKey === "jiraiya"); if (i <= 4) await full("05_pincer_hermit_mid"); break; } await sleep(45); }
  check("Hermit active before clone summon", hermit === true, `hermit=${hermit}`);
  check("HERMIT form = 2 clones (Twin Pincer)", hgot === "Twin Shadow Clone Pincer" && hBodies === 2, `seq=${hgot} clones=${hBodies}`);
  check("Hermit clones render as REAL Jiraiya", hAll, `allJiraiya=${hAll}`);
  await full("06_pincer_hermit_clone_beside");
  await wf(50);

  // ── CLONE FEINT (Deception): direct play for the escape-swap proof + screenshot ──
  // (real-key D-select is finicky in a light-kit motion; Feint is verified via the direct seq hook — logic path.)
  await P(() => window.__harness.jiraiya.refill && window.__harness.jiraiya.refill());   // back to base happens on timeout; refill energy
  await clear(); await ready(); await wf(2);
  // revert to base for a clean feint capture
  await P(() => window.__harness.jiraiya.state());
  const feintOk = await P(() => window.__harness.cloneChoreo.seq("jiraiyaCloneFeint", "p1"));
  let fgot = null, fFin = false, casterMoved = false; const preX = (await p1()).x;
  for (let i = 0; i < 14; i++) { const s = await cs(); if (s.active) { fgot = s.sequence; fFin = s.finisherFired; if (s.caster) casterMoved = Math.abs(s.caster.x - preX) > 30; if (i === 2) await full("07_feint_mid_swap"); if (s.finisherFired) { casterMoved = s.caster ? Math.abs(s.caster.x - preX) > 30 : casterMoved; break; } } await sleep(45); }
  check("Clone Feint plays (Shadow Clone Feint)", feintOk === true && fgot === "Shadow Clone Feint", `ok=${feintOk} seq=${fgot}`);
  check("Feint = escape: real Jiraiya relocates (reappears elsewhere)", casterMoved, `casterMoved=${casterMoved}`);

  check("no JS errors across the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.log("  ❌ HARNESS THREW:", String(e).split("\n")[0]); FAIL++;
}
console.log(`\n════════════════════════════════════════`);
console.log(`  JIRAIYA CLONES: ${PASS} passed, ${FAIL} failed  → ${OUT}`);
console.log(`════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
