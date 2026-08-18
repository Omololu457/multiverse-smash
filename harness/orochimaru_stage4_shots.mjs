// harness/orochimaru_stage4_shots.mjs — Stage 4 form system: the 3 alternate forms (Host Body / White
// Snake / Serpent Sage), each sharing the shed-skin transition. Verifies the transform, the merged
// _skinAnim (form frames overlaid on a FULL copy of base), and — the headline — the FALLBACK CHAIN:
// every form's run (form art) + jump/hurt (base fallback) renders a REAL orochimaru sheet, never the
// 128² box. Also exercises the real Charge-TAP cycle path. Writes PNGs to /tmp/orochimaru_s4/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/orochimaru_s4"; fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const skin = (a) => page.evaluate((act) => window.__harness.oroSkinSheet(act, "p1"), a);
async function shot(name) {
  const r = await page.evaluate(() => window.__harness.screenRect?.("p1"));
  const cb = await page.locator("#gameCanvas").boundingBox();
  if (r && cb) { const pad = 70; const x = Math.max(0, cb.x + r.x - pad), y = Math.max(0, cb.y + r.y - pad * 1.8); const w = Math.min(cb.width - (r.x - pad), r.w + pad * 2), h = Math.min(cb.height - (r.y - pad * 1.8), r.h + pad * 2.6); try { await page.screenshot({ path: path.join(OUT, name + ".png"), clip: { x, y, width: Math.max(80, w), height: Math.max(80, h) } }); return; } catch (_) {} }
  await page.locator("#gameCanvas").screenshot({ path: path.join(OUT, name + ".png") });
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }
// render an action via _forceAction and return {sheet, box} — box true = the 128² fallback (no real sheet)
async function renderAction(act) {
  await force(act); await wf(3); const a = await p1();
  return { sheet: a.spriteSheet, box: !a.hasSpriteHandler || !a.spriteSheet };
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=orochimaru&p2=orochimaru`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  const FORMS = [
    ["host", "orochimaru_form_idle_uniform", "orochimaru_form_run_uniform"],
    ["white", "orochimaru_form_white_idle_uniform", "orochimaru_form_white_run_uniform"],
    ["serpent", "orochimaru_form_serpent_idle_uniform", "orochimaru_form_serpent_run_uniform"],
  ];
  for (const [id, idleTag, runTag] of FORMS) {
    section(`FORM: ${id}`);
    await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.orochimaruForm(null); window.__harness.forceAction(null); });
    await wf(2);
    const r = await page.evaluate(i => window.__harness.orochimaruForm(i), id);
    check(`transform → ${id} (form set + merged idle = form art)`, r.form === id && (r.skinIdle || "").includes(idleTag), `form=${r.form} idle=${r.skinIdle}`);
    // shed-skin transition renders
    await wf(3); const shedA = await p1(); await shot(`${id}_1_shed`);
    check(`shed-skin transition plays (orochimaru_shed)`, (shedA.spriteSheet || "").includes("orochimaru_shed"), `sheet=${shedA.spriteSheet}`);
    await wf(30);   // let the shed finish → settle to the form idle
    await force(null); await wf(3); const idleA = await p1(); await shot(`${id}_2_idle`);
    check(`form idle renders form art`, (idleA.spriteSheet || "").includes(idleTag), `sheet=${idleA.spriteSheet}`);

    // ── MERGED _skinAnim: form frames overlaid on a FULL base copy (no missing action) ──
    const sJump = await skin("jump"), sHurt = await skin("hurt"), sLight = await skin("light"), sRun = await skin("run"), sHeavy = await skin("heavy");
    check(`_skinAnim.run = form art (overlaid)`, (sRun || "").includes(runTag), `${sRun}`);
    check(`_skinAnim.jump = BASE fallback (not missing)`, (sJump || "").includes("orochimaru_jump_uniform"), `${sJump}`);
    check(`_skinAnim.hurt = BASE fallback`, (sHurt || "").includes("orochimaru_hurt_uniform"), `${sHurt}`);
    check(`_skinAnim.light/heavy = BASE fallback`, (sLight || "").includes("orochimaru_light_uniform") && (sHeavy || "").includes("orochimaru_heavy_uniform"), `light=${sLight} heavy=${sHeavy}`);

    // ── FALLBACK-CHAIN RENDER: run (form) + jump/hurt (base fallback) — NONE may render the 128² box ──
    await waitGrounded();
    const rRun = await renderAction("run"); await shot(`${id}_3_run`);
    check(`run renders (form art, no box)`, !rRun.box && (rRun.sheet || "").includes(runTag), `sheet=${rRun.sheet} box=${rRun.box}`);
    const rJump = await renderAction("jump"); await shot(`${id}_4_jump`);
    check(`jump renders (BASE fallback, no box)`, !rJump.box && (rJump.sheet || "").includes("orochimaru_jump_uniform"), `sheet=${rJump.sheet} box=${rJump.box}`);
    const rHurt = await renderAction("hurt"); await shot(`${id}_5_hurt`);
    check(`hurt renders (BASE fallback, no box)`, !rHurt.box && (rHurt.sheet || "").includes("orochimaru_hurt_uniform"), `sheet=${rHurt.sheet} box=${rHurt.box}`);
    await force(null);
  }

  section("real Charge-TAP cycle path (base → host → white → serpent → base)");
  await page.evaluate(() => { window.__harness.orochimaruForm(null); window.__harness.fillEnergy?.(); window.__harness.forceAction(null); });
  await wf(36);   // let the revert's shed cooldown clear so the FIRST tap registers
  const seq = [];
  for (let i = 0; i < 4; i++) {
    await page.keyboard.down("p"); await wf(2); await page.keyboard.up("p");
    await wf(34);   // shed + settle before the next tap
    seq.push((await page.evaluate(() => window.__harness.oroActiveForm("p1"))) || "base");
    await page.evaluate(() => window.__harness.fillEnergy?.());
  }
  check("Charge-TAP cycles host→white→serpent→base", seq.join(",") === "host,white,serpent,base", `seq=${seq.join(",")}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════ OROCHIMARU Stage 4: ${PASS} passed, ${FAIL} failed → ${OUT} ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
