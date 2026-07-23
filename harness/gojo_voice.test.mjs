// harness/gojo_voice.test.mjs
// Gojo Satoru "Limitless (gojo2) skin" voice-pack wiring proof (audio-only; 122 Japanese
// gojoyoung_* clips across 6 pools). The whole point of this pack is that it is PER-SKIN:
// it plays ONLY when the Limitless skin is equipped, and base Gojo is untouched otherwise.
// So every live-trigger check is run TWICE — once with the gojo2 skin (young clip MUST fire)
// and once with the default skin (young clip must NOT fire) — to prove the override toggles.
//
// Parts:
//   (1) RANDOMIZER  — sample __harness.gojoVoicePick("gojo2", pool, N) for all 6 pools; assert
//                     genuine random spread + non-repeating order. Also prove the pick is SKIN-
//                     GATED: skinId "default"/null/other-char → all null (no global leak).
//   (2) ON-DISK     — all 122 named clips present (project mandate: files must be real, not TODO).
//   (3) SKIN-GATED LIVE TRIGGERS — intro / cast / hit-connect / hit-reaction / win, each proven
//                     to FIRE under gojo2 and stay SILENT under default.
//   (4) CAST FALLBACK — under gojo2 a named-technique cast (Blue) does NOT go silent: the base
//                     technique SFX still fires AND a generic young cast bark plays over it.
//   (5) STAGED TAUNT — Gojo ships no `taunt` action (dormant, like Netero/Saiki); prove the pool
//                     randomizes and the real commit hook fires the instant a taunt action is
//                     injected WHILE gojo2 is equipped — and stays silent under default.
// Run: node harness/gojo_voice.test.mjs
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GOJOYOUNG_VOICE } from "../gojoVoice.js";
import { characters } from "../characters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

let pass = 0, fail = 0;
const check = (name, cond, extra = "") => { console.log(`${cond ? "✓" : "✗"} ${name}${extra ? "  — " + extra : ""}`); cond ? pass++ : fail++; };
const info = (m) => console.log(`  · ${m}`);
const section = t => console.log(`\n── ${t} ──`);

// Pools + membership sets straight from the module under test (single source of truth).
const POOLS = GOJOYOUNG_VOICE;
const POOL_NAMES = Object.keys(POOLS);                 // intro, taunt, cast, hitConnect, hitReact, win
const POOL_SET = Object.fromEntries(POOL_NAMES.map(p => [p, new Set(POOLS[p])]));
const YOUNG = /^gojoyoung_\d{3}_.*\.mp3$/;             // any young-pack clip
const inPool = (pool, f) => POOL_SET[pool].has(f);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; } }); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const clearSfx = () => page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
async function youngIn(pool) { return (await sfxLog()).filter(f => inPool(pool, f)); }
async function goto(q) { await page.goto(`${base}/index.html?harness=1&${q}`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
const setSkin = (side, skinId) => page.evaluate(([s, k]) => window.__harness.setSkin(s, k), [side, skinId]);

try {
  // ══ PART 1: RANDOMIZER + SKIN-GATE ═════════════════════════════════════════
  await goto("p1=gojo");
  section("randomizer — genuine random spread within each of the 6 young-pack pools");
  const SPEC = [
    { name: "intro", size: 10, minDistinct: 9 },
    { name: "taunt", size: 59, minDistinct: 45 },
    { name: "cast", size: 18, minDistinct: 16 },
    { name: "hitConnect", size: 12, minDistinct: 11 },
    { name: "hitReact", size: 6, minDistinct: 6 },
    { name: "win", size: 17, minDistinct: 15 },
  ];
  for (const s of SPEC) {
    const picks = await page.evaluate(p => window.__harness.gojoVoicePick("gojo2", p, 400), s.name);
    const distinct = new Set(picks);
    const allValid = picks.every(f => YOUNG.test(f) && inPool(s.name, f));
    check(`${s.name} (${s.size}) → ${distinct.size}/${s.size} distinct over 400 picks`, distinct.size >= s.minDistinct && allValid, allValid ? "" : `invalid pick e.g. ${picks.find(f => !inPool(s.name, f))}`);
  }
  // Non-repeating order on the big pools (not a fixed cycle).
  for (const nm of ["taunt", "win"]) {
    const seq = await page.evaluate(n => window.__harness.gojoVoicePick("gojo2", n, 30), nm);
    let changes = 0; for (let i = 1; i < seq.length; i++) if (seq[i] !== seq[i - 1]) changes++;
    check(`${nm} is randomized, not a fixed repeating cycle`, changes >= 20, `${changes}/29 adjacent changes`);
  }

  section("pick is SKIN-GATED — only the gojo2 skin resolves the young pack");
  const defPicks = await page.evaluate(() => window.__harness.gojoVoicePick("default", "intro", 20));
  check("default skin → all null (falls back to base Gojo, no young leak)", defPicks.every(x => x === null), `got ${JSON.stringify(defPicks.slice(0, 3))}`);
  const nullPicks = await page.evaluate(() => window.__harness.gojoVoicePick(null, "taunt", 20));
  check("null/unset skin → all null", nullPicks.every(x => x === null), `got ${JSON.stringify(nullPicks.slice(0, 3))}`);
  const badPool = await page.evaluate(() => window.__harness.gojoVoicePick("gojo2", "nope", 3));
  check("unknown pool name under gojo2 → null (no crash)", badPool.every(x => x === null), `got ${JSON.stringify(badPool)}`);

  // ══ PART 2: ON-DISK PRESENCE ═══════════════════════════════════════════════
  section("on-disk presence — all 122 named clips must be real files");
  const all = POOL_NAMES.flatMap(p => POOLS[p]);
  const missing = all.filter(f => !fs.existsSync(path.join(ROOT, f)));
  check(`all ${all.length} young-pack clips present on disk`, missing.length === 0, missing.length ? `missing: ${missing.slice(0, 5).join(", ")}` : "");
  check("exactly 122 clips wired", all.length === 122, `count=${all.length}`);

  // ══ PART 3: SKIN-GATED LIVE TRIGGERS ═══════════════════════════════════════
  // INTRO — boot with the skin applied BEFORE the intro plays (opts.p1Skin), twice.
  section("INTRO — young intro fires under gojo2, silent under default");
  async function introFired(skin) {
    await goto("p1=gojo");
    await installSpy(); await clearSfx();
    await page.evaluate(s => window.__harness.start(s === "default" ? {} : { p1Skin: s }), skin);
    await page.waitForFunction(() => window.__harness.introState().p1Playing, null, { timeout: 15000, polling: 16 }).catch(() => {});
    const skinId = await page.evaluate(() => window.__harness.p1()?.skinId ?? null);
    await page.waitForFunction(() => (window.__harness.__sound._sfxSpy || []).some(f => /^gojoyoung_/.test(f)), null, { timeout: 4000, polling: 16 }).catch(() => {});
    return { fired: (await youngIn("intro")).length > 0, skinId };
  }
  const introOn = await introFired("gojo2");
  check("boot applied the gojo2 skin to P1", introOn.skinId === "gojo2", `skinId=${introOn.skinId}`);
  check("gojo2 → an intro clip fires at the intro-play beat", introOn.fired);
  check("default → NO young intro clip (base Gojo unchanged)", !(await introFired("default")).fired);

  // Shared training-mode prep for the combat triggers.
  async function bootSkin(skin) {
    await goto("p1=gojo");
    await page.evaluate(() => window.__harness.boot());
    await page.evaluate(s => window.__harness.setSkin("p1", s), skin);
    await installSpy();
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.setP2Invuln?.(0); window.__harness.resetOffenseVoice("p1"); });
  }

  // CAST — neutral Special (Blue) first proves the skin-gate; then Hollow Purple (D→B) proves
  // the FALLBACK: its base technique SFX (gojo_hollow_purple.mp3) still fires AND a young cast
  // bark plays over it — a named cast is never silenced under Limitless, just embellished.
  section("CAST — young cast-flavor bark fires under gojo2, silent under default");
  async function blueCast(skin) {
    await bootSkin(skin);
    await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 300); window.__harness.fillEnergy(); });
    await waitFrames(2); await clearSfx();
    await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(6);
    return { young: (await youngIn("cast")).length > 0, log: await sfxLog() };
  }
  const castOn = await blueCast("gojo2");
  check("gojo2 → a young CAST clip fires on a special cast (Blue)", castOn.young, `log=${JSON.stringify(castOn.log)}`);
  const castOff = await blueCast("default");
  check("default → NO young cast clip on the same special", castOff.young === false, `log=${JSON.stringify(castOff.log.filter(f => /gojoyoung/.test(f)))}`);

  section("CAST FALLBACK — Hollow Purple keeps its base SFX AND gains a young bark (not silenced)");
  async function hollowPurpleCast(skin) {
    let young = false, baseSfx = false, lastLog = [];
    for (let i = 0; i < 5 && !(young && baseSfx); i++) {
      await bootSkin(skin);
      await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 300); window.__harness.fillEnergy(); window.__harness.resetFighterInput("p1"); });
      await waitFrames(2); await clearSfx();
      // D → B motion (P1 faces right → Back = left "a"), then Special. SFX fires after the charge.
      await page.keyboard.down("s"); await waitFrames(3); await page.keyboard.up("s");
      await page.keyboard.down("a"); await waitFrames(3);
      await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await page.keyboard.up("a");
      await waitFrames(48);   // ride out the Hollow Purple charge so the release SFX plays
      lastLog = await sfxLog();
      young = (await youngIn("cast")).length > 0;
      baseSfx = lastLog.includes("gojo_hollow_purple.mp3");
    }
    return { young, baseSfx, log: lastLog };
  }
  const hp = await hollowPurpleCast("gojo2");
  check("gojo2 → base Hollow Purple SFX still fires (named cast NOT silenced)", hp.baseSfx, `log=${JSON.stringify(hp.log)}`);
  check("gojo2 → a young cast bark ALSO fires over the Hollow Purple SFX", hp.young, `log=${JSON.stringify(hp.log)}`);

  // HIT-CONNECT — land a light on the dummy in range.
  section("HIT-CONNECT — young connect bark fires under gojo2, silent under default");
  async function connectFired(skin) {
    let fired = false, lastLog = [];
    for (let i = 0; i < 5 && !fired; i++) {
      await bootSkin(skin);
      await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 40); });
      await waitFrames(2); await clearSfx();
      await page.keyboard.down("j"); await waitFrames(5); await page.keyboard.up("j"); await waitFrames(14);
      lastLog = await sfxLog();
      fired = (await youngIn("hitConnect")).length > 0;
    }
    return { fired, log: lastLog };
  }
  const conOn = await connectFired("gojo2");
  check("gojo2 → a young HIT-CONNECT clip fires when an attack lands", conOn.fired, `log=${JSON.stringify(conOn.log)}`);
  const conOff = await connectFired("default");
  check("default → NO young hit-connect clip", conOff.fired === false, `log=${JSON.stringify(conOff.log.filter(f => /gojoyoung/.test(f)))}`);

  // HIT-REACTION — dummy attacks Gojo in range; Gojo (defender) takes the hit.
  section("HIT-REACTION — young reaction bark fires under gojo2, silent under default");
  async function reactFired(skin) {
    let fired = false, lastLog = [];
    for (let i = 0; i < 5 && !fired; i++) {
      await bootSkin(skin);
      await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 30); window.__harness.healP1(); });
      await waitFrames(2); await clearSfx();
      await page.evaluate(() => window.__harness.p2Attack());
      await waitFrames(18);
      lastLog = await sfxLog();
      fired = (await youngIn("hitReact")).length > 0;
    }
    return { fired, log: lastLog };
  }
  const reactOn = await reactFired("gojo2");
  check("gojo2 → a young HIT-REACTION clip fires when Gojo is hit", reactOn.fired, `log=${JSON.stringify(reactOn.log)}`);
  const reactOff = await reactFired("default");
  check("default → NO young hit-reaction clip", reactOff.fired === false, `log=${JSON.stringify(reactOff.log.filter(f => /gojoyoung/.test(f)))}`);

  // WIN — real vs match; KO the dummy while Gojo is the winner.
  section("WIN — young win line fires under gojo2, silent under default");
  async function winFired(skin) {
    await goto("p1=gojo");
    await page.evaluate(() => window.__harness.bootVs());
    await page.waitForFunction(() => window.__harness.state().gameState === "battle", null, { timeout: 8000, polling: 16 }).catch(() => {});
    await page.evaluate(s => window.__harness.setSkin("p1", s), skin);
    await installSpy();
    let fired = false;
    for (let r = 0; r < 3 && !fired; r++) {
      await page.waitForFunction(() => { const s = window.__harness.state(); const b = window.__harness.p2(); return s.gameState === "battle" && s.countdown === 0 && b && b.health > 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
      await page.evaluate(s => window.__harness.setSkin("p1", s), skin);   // re-assert across round resets
      await clearSfx();
      await page.evaluate(() => window.__harness.damageP2(99999));
      await waitFrames(30);
      fired = (await youngIn("win")).length > 0;
    }
    return fired;
  }
  check("gojo2 → a young WIN clip fires at victory", await winFired("gojo2"));
  check("default → NO young win clip (base Gojo unchanged)", !(await winFired("default")));

  // ══ PART 5: LIVE TAUNT — Gojo now ships a taunt action, enrolling him in the universal system ══
  // (hold-Down-10s → heal 50% of current HP if untouched). No injection: the real committed taunt
  // fires the 59-line young pool under gojo2, and heals under BOTH skins (mechanic universal, voice
  // skin-gated). This is the same system Rick/Goku Black use.
  section("TAUNT live — real committed taunt fires the 59 young lines + heals 50% (Rick/GB system)");
  async function commitTaunt(skin) {
    await goto("p1=gojo");
    await page.evaluate(() => window.__harness.boot());
    await page.evaluate(s => window.__harness.setSkin("p1", s), skin);
    await installSpy();
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    // Chip HP so the 50%-of-current heal is measurable; park P2 far + invuln so nothing interrupts.
    await page.evaluate(() => { window.__harness.healP1(); window.__harness.damageP1(600); const a = window.__harness.p1(); window.__harness.setP2X(a.x + 700); window.__harness.setP2Invuln?.(600); });
    const before = (await p1()).health;
    await clearSfx();
    await page.keyboard.down("s"); await waitFrames(2);
    await page.evaluate(() => window.__harness.setTauntCharge(599));   // fast-forward the 10s charge
    await waitFrames(3);
    const committed = (await p1()).tauntPlaying;
    // ride out the committed window so the heal resolves
    await page.waitForFunction(() => !window.__harness.p1().tauntPlaying, null, { timeout: 5000, polling: 16 }).catch(() => {});
    await page.keyboard.up("s");
    const after = (await p1()).health;
    return { young: (await youngIn("taunt")).length > 0, committed, before, after };
  }
  // Source-of-truth: base Gojo's animationData now defines `taunt` (the snapshot doesn't surface
  // animationData, but the module is the ground truth — and the live commit below confirms it works).
  const shipsTaunt = !!characters.gojo?.animationData?.taunt;
  check("Gojo NOW ships a taunt animationData (enrolled in the universal system)", shipsTaunt, `taunt sheet=${characters.gojo?.animationData?.taunt?.sheet}`);
  const tG = await commitTaunt("gojo2");
  check("gojo2 → the REAL taunt commits (no injection needed)", tG.committed, `before=${tG.before} after=${tG.after}`);
  check("gojo2 → a young taunt clip fires on the commit (the 59 lines now play)", tG.young);
  check("taunt heals ~50% of current HP (same reward as Rick/GB)", tG.after > tG.before && (tG.after - tG.before) >= Math.floor(tG.before * 0.4), `before=${tG.before} after=${tG.after}`);
  const tD = await commitTaunt("default");
  check("default → taunt still commits AND heals (mechanic is universal, not skin-gated)", tD.committed && tD.after > tD.before, `before=${tD.before} after=${tD.after}`);
  check("default → NO young taunt clip (voice stays skin-gated to Limitless)", tD.young === false);

  section("summary");
  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Gojo Limitless voice: ${pass} passed, ${fail} failed`);
} catch (e) {
  console.error("HARNESS ERROR:", e);
  fail++;
} finally {
  await browser.close();
  server.close();
  process.exit(fail === 0 ? 0 : 1);
}
