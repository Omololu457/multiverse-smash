// harness/red_ranger_mmpr_stage1.mjs
// STAGE 1 evidence: Red Ranger (Jason, MMPR) registration + base-tier movement/state + the
// 5-INTRO RANDOM POOL. Asserts the sprite gate / sheets / stats / scale, then DETERMINISTICALLY
// exercises all 5 intros (4 unmorphed sequences that append the shared morphFlash, + 1 standalone
// already-morphed intro that does NOT) by forcing the introSequencePool pick per boot.
// Screenshots land in harness/shots/red_ranger_mmpr_stage1_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function boot() { await page.goto(`${base}/index.html?harness=1&p1=red_ranger_mmpr`, { waitUntil: "load" }); await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360); }
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `red_ranger_mmpr_stage1_${tag}.png`) }); }

const EXPECTED_POOL = [
  ["introRunIn", "morphFlash"],
  ["introTeleport", "morphFlash"],
  ["introMorpher", "morphFlash"],
  ["introKnuckles", "morphFlash"],
  ["introMorphed"]
];
// Each intro variant's expected sheet-filename token (proves the RIGHT art renders per step).
const VARIANT_SHEET_TOKEN = {
  introRunIn: "intro_runin", introTeleport: "intro_teleport", introMorpher: "intro_morpher",
  introKnuckles: "intro_knuckles", morphFlash: "morph_flash", introMorphed: "intro_morphed"
};

try {
  // ─────────────────────────────────────────────────────────────────────────
  // PART A — sprite gate + stats + movement/state
  // ─────────────────────────────────────────────────────────────────────────
  await boot();
  const seen = new Map();
  const record = async () => { const a = await p1(); if (a.action) seen.set(a.action, a.spriteSheet || null); return a; };
  await page.evaluate(() => window.__harness.start());
  await page.evaluate(() => window.__harness.skipToBattle());
  await waitFrames(6);

  console.log("\n── sprite gate + stats ──");
  const g = await record();
  check("P1 is Red Ranger MMPR", g.key === "red_ranger_mmpr", `key=${g.key}`);
  check("renders as sprites (hasSpriteHandler)", g.hasSpriteHandler, "");
  check("idle sheet = red_ranger_mmpr_idle_uniform", (g.spriteSheet || "").includes("red_ranger_mmpr_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.54", Math.abs((g.spriteScale || 0) - 1.54) < 0.01, `spriteScale=${g.spriteScale}`);
  check("maxHealth = 1200", g.maxHealth === 1200, `HP=${g.maxHealth}`);
  check("maxEnergy = 180", g.maxEnergy === 180, `EN=${g.maxEnergy}`);
  await waitFrames(4); await record(); await shot("idle");

  console.log("\n── movement / state ──");
  await page.keyboard.down("d"); await waitFrames(16); const rn = await record(); await shot("walk"); await page.keyboard.up("d"); await waitFrames(4);
  check("walk/run uses red_ranger_mmpr_walk/run_uniform", /red_ranger_mmpr_(walk|run)_uniform/.test(seen.get("run") || seen.get("walk") || ""), `action=${rn.action} sheet=${rn.spriteSheet}`);

  await waitGrounded();
  await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w"); await waitFrames(6); const jp = await record(); await shot("jump");
  check("jump uses red_ranger_mmpr_jump_uniform", (jp.spriteSheet || "").includes("red_ranger_mmpr_jump_uniform"), `action=${jp.action} sheet=${jp.spriteSheet}`);
  await waitGrounded();

  await page.evaluate(() => window.__harness.hurtP1(24)); await waitFrames(3); const h = await record(); await shot("hurt");
  check("hurt resolves to red_ranger_mmpr_hurt_uniform", h.action === "hurt" && (h.spriteSheet || "").includes("red_ranger_mmpr_hurt_uniform"), `action=${h.action} sheet=${h.spriteSheet}`);
  await page.evaluate(() => window.__harness.healP1()); await waitFrames(4);

  let boxes = 0; for (const [a, s] of seen) { if (!s) { boxes++; console.log(`   ⚠ action '${a}' had null sheet`); } }
  check("every movement action rendered a real sheet (no null/box)", boxes === 0, `actions=${[...seen.keys()].join(",")}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PART B — introSequencePool structure (data-level contract)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n── intro pool structure ──");
  const pool = await page.evaluate(() => window.__harness.charDef("red_ranger_mmpr")?.introSequencePool ?? null);
  check("introSequencePool present with 5 entries", Array.isArray(pool) && pool.length === 5, `pool=${JSON.stringify(pool)}`);
  check("pool matches expected sequences", JSON.stringify(pool) === JSON.stringify(EXPECTED_POOL), `pool=${JSON.stringify(pool)}`);
  const fourEndFlash = Array.isArray(pool) && pool.slice(0, 4).every(s => s.length === 2 && s[1] === "morphFlash");
  check("4 unmorphed sequences each append morphFlash", fourEndFlash, "");
  const standalone = Array.isArray(pool) && pool[4] && pool[4].length === 1 && pool[4][0] === "introMorphed" && !pool[4].includes("morphFlash");
  check("5th intro (introMorphed) is standalone — NO flash appended", standalone, `entry=${JSON.stringify(pool?.[4])}`);
  // every referenced variant has a real animationData sheet (no fallback box)
  const variantSheets = await page.evaluate(() => {
    const ad = window.__harness.charDef("red_ranger_mmpr")?.animationData || {};
    const keys = ["introRunIn", "introTeleport", "introMorpher", "introKnuckles", "morphFlash", "introMorphed"];
    return Object.fromEntries(keys.map(k => [k, ad[k]?.sheet ?? null]));
  });
  const allWired = Object.values(variantSheets).every(s => typeof s === "string" && s.includes("red_ranger_mmpr"));
  check("all 6 intro variants wired to real red_ranger_mmpr sheets", allWired, JSON.stringify(variantSheets));

  // ─────────────────────────────────────────────────────────────────────────
  // PART C — DETERMINISTIC per-intro playback (force each pool index in turn)
  //   Overriding Math.random before start() forces which sequence initIntroVariant picks,
  //   so we exercise ALL 5 intros — proving the 4 unmorphed ones transition through morphFlash
  //   and the standalone plays alone.
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n── each intro plays (deterministic pick) ──");
  for (let i = 0; i < EXPECTED_POOL.length; i++) {
    const expected = EXPECTED_POOL[i];
    await boot();
    // Force the pool pick: Math.floor(((i+0.5)/5) * 5) === i
    await page.evaluate((idx) => { const v = (idx + 0.5) / 5; Math.random = () => v; window.__harness.start(); }, i);
    // Sample across p1's intro; collect ordered consecutive-distinct variants. Capture each step's
    // sheet ONLY while the sprite is actually RENDERING that step (spriteAction === variant), so the
    // trailing post-intro idle doesn't bleed into the recorded art.
    const seq = []; const sheets = {};
    for (let f = 0; f < 80; f++) {
      const s = await p1();
      const v = s.introVariant;
      if (v && seq[seq.length - 1] !== v) seq.push(v);
      if (v && s.spriteAction === v && s.spriteSheet) sheets[v] = s.spriteSheet;   // real per-step render only
      await waitFrames(2);
    }
    await shot(`intro_${i}_${expected[0]}`);
    const matches = JSON.stringify(seq) === JSON.stringify(expected);
    check(`intro[${i}] plays sequence ${JSON.stringify(expected)}`, matches, `saw=${JSON.stringify(seq)}`);
    const flashReached = expected.length === 1 ? !seq.includes("morphFlash") : seq.includes("morphFlash");
    check(`intro[${i}] flash handling correct`, flashReached, expected.length === 1 ? "standalone → no flash" : "unmorphed → reached morphFlash");
    // Every step must have rendered ITS OWN art (correct sheet token), not a fallback / idle bleed.
    const artOK = expected.every(v => typeof sheets[v] === "string" && sheets[v].includes(VARIANT_SHEET_TOKEN[v]));
    check(`intro[${i}] every step rendered its OWN art`, artOK, JSON.stringify(Object.fromEntries(expected.map(v => [v, (sheets[v] || "MISSING").split("/").pop()]))));
  }

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${fail === 0 ? "✅" : "❌"} Red Ranger MMPR Stage 1: ${pass} passed, ${fail} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); fail++; }
finally { await browser.close(); server.close(); process.exit(fail === 0 ? 0 : 1); }
