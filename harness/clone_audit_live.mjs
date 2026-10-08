// harness/clone_audit_live.mjs — LIVE confirmation of the clone audit flags + worst-offender clips.
// Plays each sequence via the choreography engine (byte-identical playback to a real-input-triggered run;
// the real-input TRIGGER path is separately covered by test:clone-realinput) and records, per frame, each
// clone body's x/y/visible/action/facing + the target's health. Confirms: WALL-CLIP (clone x outside the
// [0,worldWidth] stage when a fighter is cornered), JITTER (x oscillation), and the one WRONG-FACING flag.
// Saves .webm clips of the worst wall-clip offenders.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLIPS = path.join(ROOT, "harness", "clips"); fs.mkdirSync(CLIPS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json", ".woff2": "font/woff2" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const WORLD = 3200;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

// Record per-frame clone positions (per SLOT). pureAttack/grab/swarm place clones around the TARGET, so to
// reproduce a wall-clip we corner the TARGET (p2) at the wall and keep the caster (p1) well inside.
async function playAndRecord(page, char, seqKey, atX) {
  const pos = await page.evaluate(x => { window.__harness.cloneChoreo.clear("p1"); window.__harness.setP2X(x); window.__harness.setP1X(x + 260); return { p1: Math.round(window.__harness.p1().x), p2: Math.round(window.__harness.p2().x) }; }, atX);
  await page.evaluate(sk => window.__harness.cloneChoreo.seq(sk, "p1"), seqKey);
  const perSlot = {};   // slot -> [x per sample]  (for honest per-clone jitter)
  let minX = 1e9, maxX = -1e9, sawVisible = false;
  for (let i = 0; i < 60; i++) {
    // re-pin the target at the wall each frame (the AI would otherwise walk off it)
    const st = await page.evaluate(x => { window.__harness.setP2X(x); return window.__harness.cloneChoreo.state("p1"); }, atX);
    for (const b of (st.bodies || [])) { if (b.visible) { sawVisible = true; minX = Math.min(minX, b.x); maxX = Math.max(maxX, b.x + 60); (perSlot[b.slot] ||= []).push(b.x); } }
    if (!st.active && i > 3) break;
    await sleep(22);
  }
  // jitter = max direction-reversals within ANY single slot's x stream
  let maxRev = 0;
  for (const xs of Object.values(perSlot)) { let rev = 0; for (let i = 2; i < xs.length; i++) { const a = Math.sign(xs[i] - xs[i - 1]), b = Math.sign(xs[i - 1] - xs[i - 2]); if (a && b && a !== b) rev++; } maxRev = Math.max(maxRev, rev); }
  return { pos, minX: minX === 1e9 ? null : Math.round(minX), maxX: maxX === -1e9 ? null : Math.round(maxX), sawVisible, maxRev };
}

async function boot(page, char) {
  await page.goto(`${base}/index.html?harness=1&p1=${char}&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.cloneChoreo && window.__harness.setP2X, null, { timeout: 15000 });
  await page.mouse.click(640, 360); await page.evaluate(() => window.__harness.boot()); await sleep(1100);   // let the round-start reposition settle
}

try {
  // ── A. WALL-CLIP confirmation: worst offenders with both fighters cornered at the LEFT wall (x≈20) ──
  console.log("\n── WALL-CLIP (fighters cornered at left wall x≈20; clones must stay within [0," + WORLD + "]) ──");
  const WORST = [["pain", "pureAttack"], ["pain", "swarm"], ["hashirama", "pureAttack"], ["hashirama", "swarm"], ["hiruzen", "pureAttack"]];
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  for (const [char, seqKey] of WORST) {
    await boot(page, char);
    const r = await playAndRecord(page, char, seqKey, 20);
    check(`${char}/${seqKey}: a clone spawned OFF-STAGE at the wall (confirms the flag)`, r.minX !== null && r.minX < 0, `caster@x=${r.pos.p1} minCloneX=${r.minX}`);
  }
  await ctx.close();

  // ── B. JITTER check: play 3 sequences at centre; a clone's x must not oscillate (reverse direction >2x) ──
  console.log("\n── JITTER (centre stage; clone x must not oscillate) ──");
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page2 = await ctx2.newPage();
  for (const [char, seqKey] of [["madara", "swarm"], ["itachi", "pureAttack"], ["hiruzen", "swarm"]]) {
    await boot(page2, char);
    const r = await playAndRecord(page2, char, seqKey, 1500);
    check(`${char}/${seqKey}: no per-clone position jitter`, r.maxRev <= 2, `maxSlotReversals=${r.maxRev}`);
  }
  await ctx2.close();

  // ── C. CLIPS: record the two worst wall-clip offenders (pain pincer + hashirama swarm) cornered at a wall ──
  console.log("\n── CLIPS ──");
  for (const [char, seqKey, name] of [["pain", "pureAttack", "pain_pincer_wallclip"], ["hashirama", "swarm", "hashirama_swarm_wallclip"]]) {
    const vctx = await browser.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir: CLIPS, size: { width: 960, height: 540 } } });
    const vpage = await vctx.newPage();
    await boot(vpage, char);   // boot already settles 1.1s past the round-start reposition
    await vpage.evaluate(x => { window.__harness.setP2X(x); window.__harness.setP1X(x + 260); }, 20);
    await sleep(40);
    await vpage.evaluate(sk => window.__harness.cloneChoreo.seq(sk, "p1"), seqKey);
    for (let i = 0; i < 40; i++) { await vpage.evaluate(x => window.__harness.setP2X(x), 20); await sleep(40); }   // keep target cornered during the clip
    const vp = await vpage.video().path().catch(() => null);
    await vctx.close();
    if (vp) { try { fs.renameSync(vp, path.join(CLIPS, `clone_audit_${name}.webm`)); console.log(`  clip: harness/clips/clone_audit_${name}.webm`); } catch (_) {} }
  }

  check("live audit completed", true, "");
} catch (e) { check("audit crashed", false, String(e && e.stack || e)); }
finally { console.log(`\nRESULT: ${pass} pass / ${fail} fail`); await browser.close(); server.close(); process.exit(0); }
