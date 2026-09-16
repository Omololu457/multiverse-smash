// harness/new_voice_packs_verify.mjs — wiring + LIVE verification for the 2026-09-12 voice batch:
// Onoki (JA), Genos (EN), Albedo (Ben 10 villain, EN), and the two Superman VARIANT packs
// (superman_classic → MultiVersus, superman_new52 → Suicide Squad). Two layers:
//   (1) WIRING: pools resolve, every referenced .mp3 exists on disk, pools randomize; the Superman
//       variants draw from their OWN packs and are pairwise-DISJOINT from base + each other.
//   (2) LIVE: boot real matches; confirm an intro clip fires at match start and a taunt clip fires on
//       a strong connect (spy on sound.playSfxFile), with no page errors.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Voice clips were migrated from flat-root into voice/<char>/ dirs; resolve a bare
// filename to its on-disk path the same way sound.js _resolveSrc() does (manifest first).
const { VOICE_FILES } = await import(path.join(ROOT, "voiceFileManifest.js"));
const voicePath = f => (VOICE_FILES[f] || VOICE_FILES[f.replace(/^\.\//, "")] || f).replace(/^\.\//, "");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
async function ready() {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0 && (p.hitstun || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 46); await waitFrames(2);
}

// Boot a fresh page at a given matchup (the harness re-inits per goto).
async function boot(p1k, p2k) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1k}&p2=${p2k}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await installSpy();
}

// Resolve the expected clip SET for a char/pool. For onoki/genos/albedo use the pool hook; for a
// superman variant, sample the variant-aware pick to derive the effective pool.
async function poolFor(kind, pool, rosterKey) {
  if (kind === "onoki")  return page.evaluate(p => window.__harness.onokiVoicePool(p), pool);
  if (kind === "genos")  return page.evaluate(p => window.__harness.genosVoicePool(p), pool);
  if (kind === "albedo") return page.evaluate(p => window.__harness.albedoVoicePool(p), pool);
  // superman variant: sample 60 picks → the effective pool (drops nulls)
  const s = await page.evaluate(([p, rk]) => window.__harness.supermanVoicePick(p, 60, rk), [pool, rosterKey]);
  return [...new Set(s.filter(Boolean))];
}

// LIVE: prove an intro clip from `introPool` fires at start, and a taunt clip from `tauntPool` fires
// on a mirror heavy connect. Returns {intro:bool, taunt:bool}.
async function liveTriggers(p1k, p2k, introPool, tauntPool) {
  await boot(p1k, p2k);
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  await page.waitForFunction(pool => (window.__harness.__sound._sfxSpy || []).some(f => pool.includes(f)), introPool, { timeout: 12000, polling: 16 }).catch(() => {});
  const introLog = await sfxLog();
  const introOk = introLog.some(f => introPool.includes(f));
  await page.evaluate(() => window.__harness.skipToBattle?.());
  await waitFrames(4);
  await ready(); await clearSfx();
  { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
  await page.keyboard.down("k"); await waitFrames(6); await page.keyboard.up("k"); await waitFrames(14);
  const tauntLog = await sfxLog();
  const tauntOk = tauntLog.some(f => tauntPool.includes(f));
  return { introOk, tauntOk, introLog: introLog.filter(f => tauntPool.length && (introPool.includes(f) || /onoki_|genos_|albedo_|superman_/.test(f))), tauntLog };
}

try {
  // ── (1) WIRING: pools resolve + files on disk + randomize ──
  await boot("onoki", "onoki");
  section("wiring: pools resolve + files exist");
  const specs = [
    { kind: "onoki",  rk: "onoki",           pools: { intro: 2, taunt: 2, lowHealth: 1, win: 1 } },
    { kind: "genos",  rk: "genos",           pools: { intro: 1, taunt: 1 } },
    { kind: "albedo", rk: "albedo",          pools: { intro: 3, taunt: 8, lowHealth: 1, win: 2 } },
    { kind: "smvs",   rk: "superman_classic",pools: { intro: 3, taunt: 5, lowHealth: 1, win: 2 } },
    { kind: "sssqk",  rk: "superman_new52",  pools: { intro: 2, taunt: 5, lowHealth: 1, win: 2 } },
  ];
  const kindHook = { smvs: "superman", sssqk: "superman" };
  for (const s of specs) {
    for (const [pool, expect] of Object.entries(s.pools)) {
      const arr = await poolFor(kindHook[s.kind] ? "superman" : s.kind, pool, s.rk);
      const sizeOk = arr.length === expect;
      const onDisk = arr.every(f => fs.existsSync(path.join(ROOT, voicePath(f))));
      check(`${s.rk} ${pool} (${arr.length}/${expect}) — resolves + on-disk`, sizeOk && onDisk, arr.join(","));
    }
  }

  // Superman variant DIFFERENTIATION — base / classic(MVS) / new52(SSQK) must be pairwise disjoint.
  section("superman variants: pairwise-DISJOINT pools (audible differentiation)");
  for (const pool of ["intro", "taunt", "win"]) {
    const baseP = await poolFor("superman", pool, "superman");
    const mvs   = await poolFor("superman", pool, "superman_classic");
    const ssqk  = await poolFor("superman", pool, "superman_new52");
    const disj = (a, b) => a.every(x => !b.includes(x));
    const ok = disj(baseP, mvs) && disj(baseP, ssqk) && disj(mvs, ssqk) && mvs.length > 0 && ssqk.length > 0;
    check(`${pool}: base≠classic≠new52 (all disjoint, non-empty)`, ok, `base=${baseP.length} mvs=${mvs.length} ssqk=${ssqk.length}`);
  }

  // ── (2) LIVE triggers ──
  section("live: intro @ start + taunt @ strong connect");
  const onokiIntro = await poolFor("onoki", "intro"), onokiTaunt = await poolFor("onoki", "taunt");
  let r = await liveTriggers("onoki", "onoki", onokiIntro, onokiTaunt);
  check("onoki intro fires at match start", r.introOk, r.tauntLog.filter(f=>/onoki_/.test(f)).slice(0,3).join(","));
  check("onoki taunt fires on heavy connect", r.tauntOk, r.tauntLog.filter(f=>/onoki_/.test(f)).join(","));

  const genosIntro = await poolFor("genos", "intro"), genosTaunt = await poolFor("genos", "taunt");
  r = await liveTriggers("genos", "genos", genosIntro, genosTaunt);
  check("genos intro fires at match start", r.introOk, "");
  check("genos taunt fires on heavy connect", r.tauntOk, r.tauntLog.filter(f=>/genos_/.test(f)).join(","));

  const albIntro = await poolFor("albedo", "intro"), albTaunt = await poolFor("albedo", "taunt");
  r = await liveTriggers("albedo", "albedo", albIntro, albTaunt);
  check("albedo intro fires at match start", r.introOk, "");
  check("albedo taunt fires on heavy connect", r.tauntOk, r.tauntLog.filter(f=>/albedo_/.test(f)).join(","));

  const cIntro = await poolFor("superman", "intro", "superman_classic"), cTaunt = await poolFor("superman", "taunt", "superman_classic");
  r = await liveTriggers("superman_classic", "superman_classic", cIntro, cTaunt);
  check("superman_classic intro fires a MultiVersus clip", r.introOk && cIntro.every(f=>/superman_mvs_/.test(f)), "");
  check("superman_classic taunt fires a MultiVersus clip", r.tauntOk, r.tauntLog.filter(f=>/superman_mvs_/.test(f)).join(","));

  const nIntro = await poolFor("superman", "intro", "superman_new52"), nTaunt = await poolFor("superman", "taunt", "superman_new52");
  r = await liveTriggers("superman_new52", "superman_new52", nIntro, nTaunt);
  check("superman_new52 intro fires a Suicide-Squad clip", r.introOk && nIntro.every(f=>/superman_ssqk_/.test(f)), "");
  check("superman_new52 taunt fires a Suicide-Squad clip", r.tauntOk, r.tauntLog.filter(f=>/superman_ssqk_/.test(f)).join(","));

  section("no JS errors");
  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  NEW VOICE PACKS: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
