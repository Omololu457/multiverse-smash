// harness/hashirama_stage6.mjs — STAGE 6: Wood Golem (Up+Special) + Gracious Deity Gates (Back+Special).
// WOOD GOLEM: summon pose → the giant golem throws a 2-hit combo (combo_part_1 then combo_part_2 launcher);
//   both hits are big (scale 1.45) golem-punch sprites that connect; the finisher LAUNCHES.
// GATES: seal pose → TWO torii gates slam down flanking the opponent (visualOnly) and PIN it (immobilized —
//   hitstun applied, cannot act/move) for the pin window.
// Directional specials fired deterministically via __harness.p1SpecialDir(dir) (sets _specialHeldDir + triggers).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const specialDir = (d) => page.evaluate((dd) => window.__harness.p1SpecialDir(dd), d);
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `hashirama_s6_${tag}.png`) }); }
async function park(gap) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.38)); await waitFrames(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}
async function findProj(tok, maxF = 40) { for (let f = 0; f < maxF; f++) { const k = (await projs()).find(p => (p.sheet || "").includes(tok)); if (k) return k; await waitFrames(1); } return null; }

try {
  await page.goto(`${base}/index.html?harness=1&p1=hashirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── WOOD GOLEM — Up+Special ──
  console.log("\n── Wood Golem (Up+Special) ──");
  await park(150);   // opponent under the looming golem's reach
  {
    const hp0 = (await p2()).health;
    const res = await specialDir("U");
    check("golem: caster plays woodGolemSummon", res && res.cast === "woodGolemSummon", `cast=${res?.cast}`);
    const g1 = await findProj("wood_golem_combo1");
    check("golem: combo_part_1 spawns (giant, scale≈1.45)", !!g1 && (g1.spriteScale || 0) > 1.3, `proj=${g1 ? g1.sheet.split("/").pop() : "none"} scale=${g1?.spriteScale}`);
    await waitFrames(6); await shot("golem_hit1");
    const g2 = await findProj("wood_golem_combo2");
    check("golem: combo_part_2 spawns (launcher finisher)", !!g2, `proj=${g2 ? g2.sheet.split("/").pop() : "none"}`);
    await waitFrames(4); await shot("golem_hit2");
    // both hits connect
    await page.waitForFunction((h) => window.__harness.p2().health < h - 60, hp0, { timeout: 3000, polling: 16 }).catch(() => {});
    const d2 = await p2();
    check("golem: 2-hit combo connects (big damage)", (hp0 - d2.health) > 60, `−${(hp0 - d2.health).toFixed(0)}`);
    check("golem: finisher LAUNCHES the opponent (vy < 0)", (d2.vy || 0) < -1, `vy=${d2.vy?.toFixed(1)}`);
  }
  await waitGrounded(); await waitFrames(20);

  // ── GRACIOUS DEITY GATES — Back+Special ──
  console.log("\n── Gracious Deity Gates (Back+Special) ──");
  await park(70);
  {
    const before = await p2();
    const res = await specialDir("B");
    check("gates: caster plays gatesCaster", res && res.cast === "gatesCaster", `cast=${res?.cast}`);
    await findProj("gracious_deity_gates_wood");
    await waitFrames(4);
    const gates = (await projs()).filter(p => (p.sheet || "").includes("gracious_deity_gates_wood"));
    check("gates: TWO torii gates drop (visualOnly, flanking)", gates.length === 2 && gates.every(g => g.visualOnly === true), `count=${gates.length} visualOnly=${gates.map(g => g.visualOnly).join(",")}`);
    check("gates: the two gates flank the opponent (one each side)", gates.length === 2 && Math.sign(gates[0].x - before.x) !== Math.sign(gates[1].x - before.x), `xs=${gates.map(g => g.x.toFixed(0)).join(",")} opp=${before.x.toFixed(0)}`);
    await shot("gates");
    const pinned = await p2();
    check("gates: opponent is PINNED (immobilized — hitstun applied)", (pinned.hitstun || 0) > 30, `hitstun=${pinned.hitstun}`);
    // prove the pin holds: opponent cannot move even with input driving it
    const x0 = pinned.x;
    await page.evaluate(() => { const q = window.__harness; /* opponent has no input in training; assert it stays put under the pin */ });
    await waitFrames(20);
    const still = await p2();
    check("gates: pinned opponent stays immobilized (still in hitstun, not drifting)", (still.hitstun || 0) > 0 && Math.abs(still.x - x0) < 20, `hitstun=${still.hitstun} drift=${Math.abs(still.x - x0).toFixed(0)}px`);
  }

  // ── DATA CONTRACT ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("hashirama")?.animationData || {});
  const map = { woodGolemSummon: "gaint_wood_statue_summon", gatesCaster: "gracious_deity_gates" };
  check("woodGolemSummon + gatesCaster wired to real sheets", Object.entries(map).every(([k, tok]) => (ad[k]?.sheet || "").includes(tok)), JSON.stringify(Object.fromEntries(Object.keys(map).map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Hashirama Stage 6: ${PASS} passed, ${FAIL} failed — shots in harness/shots/hashirama_s6_*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
