// harness/clone_form_scaling_live.test.mjs — STAGE 6 LIVE integration proof, end-to-end through the real
// engine. Naruto's Kurama shroud is HEALTH-GATED (applyKuramaShroudSystem), so we trigger the form NATURALLY
// by driving his health and let the game recompute shroudStage, then verify the staged formation gathers
// MORE clones (4 → 8 → 12, capped) and the executed sequence deals SUBLINEARLY more damage in-form.
// (The multiplier LOGIC for every clone character's form flag is exhaustively unit-tested in
// clone_form_scaling.test.mjs; this file proves the wiring fires in a running match for a real caster.)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);

async function boot() {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.narutoChoreo && window.__harness.setP1HealthRaw, null, { timeout: 15000 });
  await page.mouse.click(640, 360); await P(() => window.__harness.boot()); await sleep(350);
}
// Drive Naruto's health to a fraction, let applyKuramaShroudSystem recompute, return the live shroudStage.
async function setShroudByHealth(frac) {
  await P(f => { const p1 = window.__harness.p1(); window.__harness.setP1HealthRaw(Math.round((p1.maxHealth || 1000) * f)); }, frac);
  await sleep(220);   // let the per-frame shroud system update shroudStage from the new health
  return (await P(() => window.__harness.p1Snap())).shroudStage;   // p1Snap exposes shroudStage (the plain p1() snapshot strips it)
}
// Stage a formation and return how many clone bodies it gathered.
async function summonCloneCount() {
  await P(() => window.__harness.narutoChoreoClear());
  await P(() => window.__harness.narutoSummon());
  await sleep(60);
  return (await P(() => window.__harness.narutoChoreo())).bodies?.length ?? 0;
}

try {
  await boot();

  // ── A. FORMATION CLONE COUNT scales with the shroud stage (4 → 8 → 12), capped ──
  console.log("\n── A. in-form Naruto gathers MORE clones (4 → 8 → 12, capped at 12) ──");
  const sg0 = await setShroudByHealth(1.0);   // full HP → shroud stage 0 (out of form)
  const n0 = await summonCloneCount();
  check("out of form (shroudStage 0): 4 clones", sg0 === 0 && n0 === 4, `shroudStage=${sg0} clones=${n0}`);

  const sg1 = await setShroudByHealth(0.50);  // 50% HP → shroud stage 2 (= form stage 1)
  const n1 = await summonCloneCount();
  check("in form (shroud 1-4): 8 clones (×2)", sg1 >= 1 && sg1 < 5 && n1 === 8, `shroudStage=${sg1} clones=${n1}`);

  const sg2 = await setShroudByHealth(0.05);  // 5% HP → shroud stage 5 (= form stage 2, highest)
  const n2 = await summonCloneCount();
  check("highest stage (shroud 5): 12 clones (×3)", sg2 === 5 && n2 === 12, `shroudStage=${sg2} clones=${n2}`);
  check("clone count never exceeds the cap (12)", n0 <= 12 && n1 <= 12 && n2 <= 12, `max=${Math.max(n0, n1, n2)}`);
  // (Tint/sprite carry is structural: makeGhostBody copies the caster's live shroudStage / _skinAnim / tint
  // onto every ghost, which renderHybridFighter then draws — the same Stage-0 inheritance the clones already use.)

  // ── B. SUBLINEAR damage: a full Barrage deals ~×1.4 more in-form (stage 1) than out of form ──
  console.log("\n── B. in-form damage scales SUBLINEARLY (~×1.4 at form stage 1) ──");
  const runBarrageDamage = async (frac) => {
    await setShroudByHealth(frac);
    await P(() => window.__harness.narutoChoreoClear());
    await P(() => { window.__harness.healP2(); window.__harness.setP2X(900); window.__harness.setP1X(640); });   // reset the dummy to full HP + fixed position
    const before = (await P(() => window.__harness.p2())).health;
    await P(() => window.__harness.narutoSeq("barrage"));
    for (let i = 0; i < 48; i++) { await P(() => window.__harness.setP2X(900)); await sleep(22); }   // pin the dummy (clones target its live position) while the ~78f run completes
    const after = (await P(() => window.__harness.p2())).health;
    return Math.round(before - after);
  };
  const d0 = await runBarrageDamage(1.0);    // out of form (×1.0)
  const d1 = await runBarrageDamage(0.50);   // form stage 1 (×1.4)
  check("Barrage dealt damage out of form", d0 > 0, `dmg=${d0}`);
  check("Barrage dealt MORE damage in form", d1 > d0, `out=${d0} in=${d1}`);
  const ratio = d0 > 0 ? d1 / d0 : 0;
  check("in-form damage is SUBLINEAR (ratio ≈ 1.4, between 1.2 and 1.7 — not ×2)", ratio >= 1.2 && ratio <= 1.75, `ratio=${ratio.toFixed(2)} (out=${d0} in=${d1})`);

  check("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { check("live test crashed", false, String(e && e.stack || e)); }
finally { console.log(`\nRESULT: ${pass} pass / ${fail} fail`); await browser.close(); server.close(); process.exit(fail ? 1 : 0); }
