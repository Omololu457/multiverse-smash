// harness/sukuna_voice.test.mjs — Ryomen Sukuna voice-line wiring (audio-only; EN+JA dual pools, JA active).
// Proves: (1) BOTH language pool sets randomize + cover fully (JA 65 + EN 80 = 145 unique clips, no clip double-
// pooled within a language, every mp3 on disk); (2) pickSukunaVoice special behaviour — intro MERGES intro+taunt,
// JA castCleave (empty) FALLS BACK to the general cast pool; (3) live triggers fire (spy on playSfxFile) — intro
// at match start / offense(attacker)+hitReact(defender) via heavy connect / ★ Cleave "Open." cast via neutral
// Special / ★ Malevolent Shrine incantation on the Ultimate domain / lowHealth crossing 30%; (4) the language
// switch is live (setSukunaVoiceLang flips pickSukunaVoice EN↔JA); (5) no JS errors.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function idleReady() { await page.waitForFunction(() => { const p = window.__harness.p1(); return (p.grounded ?? true) && !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {}); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
const pool = (name, lang) => page.evaluate(([p, l]) => window.__harness.sukunaVoicePool(p, l), [name, lang]);
const pick = (name, n) => page.evaluate(([p, k]) => window.__harness.sukunaVoicePick(p, k), [name, n]);
const setLang = l => page.evaluate(x => window.__harness.sukunaVoiceLang(x), l);
const inPool = (log, arr) => log.some(f => arr.includes(f));
const suk = f => /^sukuna_new_/.test(f);
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb, o) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb, o); }; } }); }
async function ready(gap = 58) { await idleReady(); await page.evaluate(() => { window.__harness.resetOffenseVoice?.("p1"); window.__harness.resetOffenseVoice?.("p2"); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2); }

const POOLS = ["intro", "taunt", "offense", "cast", "castCleave", "castFlame", "castDomain", "hitReact", "lowHealth", "win"];
const EXPECT = { ja: 65, en: 80 };
try {
  await page.goto(`${base}/index.html?harness=1&p1=sukuna&p2=sukuna`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await installSpy();

  // ── (1) RAW POOL INTEGRITY, both languages ──
  section("raw pool integrity (JA + EN)");
  const allWired = new Set();
  for (const lang of ["ja", "en"]) {
    await setLang(lang);
    let total = 0;
    for (const p of POOLS) {
      const arr = (await pool(p, lang)) || [];
      arr.forEach(c => allWired.add(c)); total += arr.length;
      const allExist = arr.every(c => fs.existsSync(path.join(ROOT, c)));
      // JA.castCleave is intentionally empty (documented fallback) — accept 0 there, require content elsewhere.
      const okLen = (lang === "ja" && p === "castCleave") ? arr.length === 0 : arr.length > 0;
      check(`${lang}.${p} (${arr.length}) — on-disk + populated`, allExist && okLen, arr.length === 0 && !(lang === "ja" && p === "castCleave") ? "EMPTY" : "");
    }
    check(`${lang}: all ${EXPECT[lang]} clips across ${POOLS.length} pools`, total === EXPECT[lang], `total=${total}`);
    { const seen = {}; let dupe = null; for (const p of POOLS) for (const c of (await pool(p, lang)) || []) { if (seen[c]) dupe = c; seen[c] = true; } check(`${lang}: no clip double-pooled`, !dupe, dupe || ""); }
  }
  check("145 unique clips total (JA 65 + EN 80)", allWired.size === 145, `unique=${allWired.size}`);
  { let missing = []; for (const c of allWired) if (!fs.existsSync(path.join(ROOT, c))) missing.push(c); check("every referenced clip exists on disk", missing.length === 0, missing.slice(0, 3).join(",")); }

  // ── (2) pickSukunaVoice behaviour: simple pools + intro-merge + castCleave-fallback ──
  section("pickSukunaVoice: randomization + special routing");
  for (const lang of ["ja", "en"]) {
    await setLang(lang);
    // simple pools: pick ⊆ raw, covers all, randomizes
    for (const p of ["offense", "cast", "castFlame", "castDomain", "hitReact", "lowHealth", "win", "taunt"]) {
      const arr = await pool(p, lang);
      const s = await pick(p, 400); const uniq = new Set(s);
      const valid = s.every(x => arr.includes(x)); const covers = arr.every(c => uniq.has(c));
      const randOk = arr.length === 1 ? uniq.size === 1 : uniq.size > 1;
      check(`${lang}.${p} pick valid+covers+${arr.length === 1 ? "single" : "rand"}`, valid && covers && randOk, `distinct=${uniq.size}/${arr.length}`);
    }
    // intro MERGES intro+taunt
    { const merged = [...(await pool("intro", lang)), ...(await pool("taunt", lang))];
      const s = await pick("intro", 400); const uniq = new Set(s);
      check(`${lang}: pick("intro") draws from intro∪taunt (merged ${merged.length})`, s.every(x => merged.includes(x)) && merged.every(c => uniq.has(c)), `distinct=${uniq.size}/${merged.length}`); }
  }
  // JA castCleave (empty) FALLS BACK to JA.cast
  await setLang("ja");
  { const jaCast = await pool("cast", "ja"); const s = await pick("castCleave", 60);
    check("JA castCleave (empty) falls back to general cast pool", s.length > 0 && s.every(x => jaCast.includes(x)), s.slice(0, 2).join(",")); }
  // EN castCleave HAS its own clips (the "Open." 開 callout)
  await setLang("en");
  { const enCleave = await pool("castCleave", "en"); const s = await pick("castCleave", 60);
    check("EN castCleave uses its own ★ Cleave callout pool", s.every(x => enCleave.includes(x)) && enCleave.length > 0, enCleave.join(",")); }

  await setLang("ja");   // reset to default active language for live triggers

  // ── (3) LIVE: intro (JA active) ──
  section("live: intro");
  await clearSfx();
  await page.evaluate(() => window.__harness.start());
  const introMerged = [...(await pool("intro", "ja")), ...(await pool("taunt", "ja"))];
  await page.waitForFunction(ip => (window.__harness.__sound._sfxSpy || []).some(f => ip.includes(f)), introMerged, { timeout: 12000, polling: 16 }).catch(() => {});
  { const log = await sfxLog(); check("an intro/taunt clip fired at match start", inPool(log, introMerged), log.filter(suk).slice(0, 3).join(",")); }
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(16);
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); });
  await waitFrames(4);

  // ── (3) LIVE: offense + hitReact via heavy connect ──
  section("live: offense + hitReact (heavy connect)");
  await ready(56); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(16);
  { const log = await sfxLog();
    check("heavy connect fires an offense line (attacker)", inPool(log, await pool("offense", "ja")), log.filter(suk).join(","));
    check("mirror defender fires a hitReact line", inPool(log, await pool("hitReact", "ja")), ""); }

  // ── (3) LIVE: low-health (crossing 30%) — fires on the DEFENDER (P2). Run BEFORE the ultimate so the
  //     domain's chip damage doesn't consume the one-shot _lowHealthVoiceDone first (Yuji ordering). ──
  section("live: low-health bark (crossing 30%)");
  await ready(56);
  await page.evaluate(() => { const m = window.__harness.p2().maxHealth || 1120; window.__harness.damageP2(m - 280); });   // P2 → ~25% (≤30%)
  await page.evaluate(() => window.__harness.resetOffenseVoice?.("p1")); await clearSfx();
  await page.keyboard.down("k"); await waitFrames(8); await page.keyboard.up("k"); await waitFrames(12);
  { const log = await sfxLog(); check("low-HP Sukuna (defender) crossing 30% fires a lowHealth line", inPool(log, await pool("lowHealth", "ja")), log.filter(suk).join(",")); }

  // ── (3) LIVE: ★ Cleave "Open." cast via neutral Special ──
  section("live: ★ Cleave cast (neutral Special)");
  await ready(120); await page.evaluate(() => { window.__harness.resetOffenseVoice?.("p1"); window.__harness.fillEnergy?.(); }); await clearSfx();
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(8);
  // JA active → castCleave is empty → falls back to general `cast`; assert membership in the union.
  { const castUnion = [...(await pool("castCleave", "ja")), ...(await pool("cast", "ja"))];
    const log = await sfxLog(); check("neutral Special (Cleave) fires a cast line", inPool(log, castUnion), log.filter(suk).join(",")); }

  // ── (3) LIVE: ★ Malevolent Shrine incantation on the Ultimate domain ──
  section("live: ★ domain incantation (Ultimate)");
  await ready(60); await page.evaluate(() => { window.__harness.resetOffenseVoice?.("p1"); window.__harness.fillEnergy?.(); window.__harness.healP1?.(); }); await idleReady(); await clearSfx();
  await page.keyboard.down("u"); await waitFrames(4); await page.keyboard.up("u"); await waitFrames(10);
  { const log = await sfxLog(); check("Ultimate domain fires the Malevolent Shrine incantation (領域展開/伏魔御廚子)", inPool(log, await pool("castDomain", "ja")), log.filter(suk).join(",")); }

  // ── (4) LANGUAGE SWITCH is live ──
  section("language switch (JA ↔ EN)");
  await setLang("en");
  const enIntro = [...(await pool("intro", "en")), ...(await pool("taunt", "en"))];
  const enSamples = await pick("intro", 60);
  check("setSukunaVoiceLang('en') → pickSukunaVoice returns EN clips", enSamples.every(s => enIntro.includes(s)), enSamples.slice(0, 2).join(","));
  await setLang("ja");
  const jaSamples = await pick("intro", 60);
  check("switch back to 'ja' → pickSukunaVoice returns JA clips", jaSamples.every(s => introMerged.includes(s)), jaSamples.slice(0, 2).join(","));

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  SUKUNA voice: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
