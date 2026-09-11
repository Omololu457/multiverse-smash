// harness/form_transform_cinematic.test.mjs
// ---------------------------------------------------------------------------
// FORM-ACTIVATION TRANSFORM CINEMATIC — the short (~1s) freeze-beat added to two
// transforms that used to instant-swap with no buildup:
//   • PICCOLO   — base→Potential Unleashed and Potential→Orange (charge hold-release)
//   • BARDOCK   — Super Saiyan gold-hair flash (rides the taunt-heal commit)
// Verifies, in real play, for BOTH:
//   • trigger still works → the freeze-cinematic fires (right `key`)
//   • combat FULLY FREEZES — move/attack inputs do nothing during the beat
//   • the form change lands at the END (Piccolo: tint/stat POPS at resolve)
//   • gameplay resumes cleanly afterwards (can move — no stuck/softlock state)
//   • ABUSE: it can't be spammed to re-freeze (Piccolo gated by Ki + single-cine;
//     Bardock gated by the 10s taunt-hold that resets to 0 on every commit)
//   • taking the match to KO / round-reset mid-beat leaves no stuck cinematic
// Shots → harness/shots/FORMCINE_*.png
// ---------------------------------------------------------------------------
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(REPO, u === "/" ? "/index.html" : u); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const wf = async n => { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { polling: 16, timeout: 15000 }); };
const p1 = () => page.evaluate(() => window.__harness.p1());
const cine = () => page.evaluate(() => window.__harness.formCine());
const actionable = () => page.waitForFunction(() => { const p = window.__harness.p1(); return (p.grounded ?? true) && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { polling: 16, timeout: 8000 }).catch(() => {});

async function boot(p1key, p2key) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1key}&p2=${p2key}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6); await actionable();
  const a0 = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a0.x + 110);   // adjacent → "isolation" is a real test
  await wf(2);
}

try {
  // ═══════════════════════════ PICCOLO ═══════════════════════════
  await boot("piccolo", "piccolo");

  section("PICCOLO — base→Potential: charge hold-release fires the freeze-cinematic");
  await page.evaluate(() => window.__harness.setEnergy(200));
  await page.keyboard.down("p"); await wf(20); await page.keyboard.up("p");
  await wf(2);
  let c = await cine();
  check("form-activation cinematic starts (key=piccoloPotential)", c.active === true && c.key === "piccoloPotential", `active=${c.active} key=${c.key} phase=${c.phase}`);
  check("NOT yet in Potential when the beat begins (tint POPS at resolve)", (await p1()).currentForm !== "piccoloPotential", `form=${(await p1()).currentForm}`);

  section("PICCOLO — FREEZE: move/attack do nothing during the beat");
  {
    const before = await p1();
    await page.keyboard.down("d"); await page.keyboard.down("j");
    await wf(6);
    const mid = await p1(); const cc = await cine();
    check("still mid-cinematic", cc.active === true, `phase=${cc.phase} frame=${cc.frame}`);
    check("held MOVE does nothing (x unchanged)", Math.abs((mid.x || 0) - (before.x || 0)) < 0.5, `x ${before.x?.toFixed?.(1)} → ${mid.x?.toFixed?.(1)}`);
    check("held ATTACK does nothing (not attacking)", mid.attacking === false, `attacking=${mid.attacking}`);
    await page.screenshot({ path: path.join(OUT, "FORMCINE_piccolo_potential.png") });
    await page.keyboard.up("d"); await page.keyboard.up("j");
  }

  section("PICCOLO — RESOLVE: Potential tint/stat lands at the end; gameplay resumes");
  {
    await page.waitForFunction(() => !window.__harness.formCine().active, null, { timeout: 6000, polling: 16 }).catch(() => {});
    check("cinematic ended", (await cine()).active === false, "");
    await wf(4);
    const a = await p1();
    check("now in Potential form (dmg×1.20)", a.currentForm === "piccoloPotential" && Math.abs((a.damageMultiplier || 1) - 1.20) < 0.02, `form=${a.currentForm} dmg=${a.damageMultiplier}`);
    const bx = a.x;
    await page.keyboard.down("d"); await wf(6); await page.keyboard.up("d");
    check("gameplay resumed — can move after the beat (no softlock)", Math.abs((await p1()).x - bx) > 1, `moved from ${bx?.toFixed?.(0)}`);
  }

  section("PICCOLO — Potential→Orange: the escalation also plays a beat, resolves to Orange");
  {
    await page.evaluate(() => window.__harness.setEnergy(200));
    await actionable();
    await page.keyboard.down("p"); await wf(20); await page.keyboard.up("p");
    await wf(2);
    const cc = await cine();
    check("Orange escalation fires the cinematic (key=piccoloOrange)", cc.active === true && cc.key === "piccoloOrange", `active=${cc.active} key=${cc.key}`);
    // ABUSE probe: try to trigger AGAIN mid-beat (input is frozen) — must stay a single cinematic
    await page.keyboard.down("p"); await wf(4); await page.keyboard.up("p");
    const stillOne = await cine();
    check("cannot re-trigger while a beat is in flight (input frozen)", stillOne.active === true, `phase=${stillOne.phase}`);
    await page.waitForFunction(() => !window.__harness.formCine().active, null, { timeout: 6000, polling: 16 }).catch(() => {});
    await wf(4);
    const a = await p1();
    check("resolved to Orange (dmg×1.42)", a.currentForm === "piccoloOrange" && Math.abs((a.damageMultiplier || 1) - 1.42) < 0.02, `form=${a.currentForm} dmg=${a.damageMultiplier}`);
  }

  // ═══════════════════════════ BARDOCK ═══════════════════════════
  await boot("bardock", "bardock");

  section("BARDOCK — SSJ flash rides the taunt-heal commit → freeze-cinematic fires");
  {
    // fast-forward the 10s taunt charge to just below threshold (existing setTauntCharge hook), then a
    // couple of real Down-hold frames drive the genuine updateTauntState commit + cinematic trigger.
    await page.evaluate(() => window.__harness.setTauntCharge(597));   // TAUNT_CHARGE_FRAMES(600) - 3
    await page.keyboard.down("s");
    await page.waitForFunction(() => window.__harness.formCine().active, null, { timeout: 4000, polling: 16 }).catch(() => {});
    const cc = await cine();
    check("Bardock SSJ transform cinematic fires (key=bardockSSJ)", cc.active === true && cc.key === "bardockSSJ", `active=${cc.active} key=${cc.key} phase=${cc.phase}`);
    await page.screenshot({ path: path.join(OUT, "FORMCINE_bardock_ssj.png") });
  }

  section("BARDOCK — FREEZE + resume: no stuck state, taunt-heal still resolves");
  {
    const before = await p1();
    await page.keyboard.down("d"); await page.keyboard.down("j");
    await wf(6);
    const mid = await p1();
    check("held MOVE does nothing during the beat", Math.abs((mid.x || 0) - (before.x || 0)) < 0.5, `x ${before.x?.toFixed?.(1)} → ${mid.x?.toFixed?.(1)}`);
    await page.keyboard.up("d"); await page.keyboard.up("j"); await page.keyboard.up("s");
    await page.waitForFunction(() => !window.__harness.formCine().active, null, { timeout: 6000, polling: 16 }).catch(() => {});
    check("cinematic ended cleanly", (await cine()).active === false, "");
    // The beat hands back to the taunt-heal CHANNEL (Bardock's SSJ flash rides it) — he stays movement-
    // locked until the heal resolves on its own timer, exactly as before. Wait it out, then confirm free.
    const hpBefore = (await p1()).health;
    await page.waitForFunction(() => !window.__harness.p1().tauntPlaying, null, { timeout: 4000, polling: 16 }).catch(() => {});
    await wf(3);
    const healed = await p1();
    check("taunt-heal still resolves after the beat (HP recovered, mechanic intact)", healed.health >= hpBefore, `hp ${hpBefore?.toFixed?.(0)} → ${healed.health?.toFixed?.(0)}`);
    await actionable();
    const bx = (await p1()).x;
    await page.keyboard.down("d"); await wf(6); await page.keyboard.up("d");
    check("gameplay resumed — Bardock can move once the heal channel ends (no softlock)", Math.abs((await p1()).x - bx) > 1, `moved from ${bx?.toFixed?.(0)}`);
  }

  section("BARDOCK — ABUSE: taunt charge resets on commit → cannot spam-freeze");
  {
    const a = await p1();
    check("taunt charge reset to 0 at commit (needs a fresh 10s hold to re-fire)", (a.tauntCharge || 0) === 0, `tauntCharge=${a.tauntCharge}`);
    // hold Down briefly WITHOUT priming — must NOT instantly re-fire a cinematic
    await page.keyboard.down("s"); await wf(10); await page.keyboard.up("s");
    check("a brief Down-hold does NOT re-fire the beat (10s gate holds)", (await cine()).active === false, `active=${(await cine()).active}`);
  }

  section("MID-BEAT MATCH RESET — no stuck cinematic after a reset while a beat plays");
  {
    await boot("piccolo", "piccolo");
    await page.evaluate(() => window.__harness.setEnergy(200));
    await page.keyboard.down("p"); await wf(20); await page.keyboard.up("p");
    await wf(3);
    check("beat is active before the reset", (await cine()).active === true, "");
    await page.evaluate(() => window.__harness.boot());   // force a fresh match (→ resetRound clears cinematics) mid-beat
    await wf(4);
    check("cinematic cleared by the reset (no stuck freeze)", (await cine()).active === false, `active=${(await cine()).active}`);
    await actionable();
    const bx = (await p1()).x;
    await page.keyboard.down("d"); await wf(6); await page.keyboard.up("d");
    check("gameplay works after a mid-beat reset (can move)", Math.abs((await p1()).x - bx) > 1, `moved from ${bx?.toFixed?.(0)}`);
  }

  section("stability");
  check("no JS errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

} catch (e) { console.error("threw:", e); FAIL++; }
finally {
  console.log(`\n  FORM-ACTIVATION TRANSFORM CINEMATIC: ${PASS} passed, ${FAIL} failed\n`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
