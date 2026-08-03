// harness/ben_slot_log.mjs — DEFINITIVE per-press log for the Omnitrix slot-transform.
// Presses each slot combo (CHARGE + direction) INDIVIDUALLY, multiple times, and captures the
// instrumentation log emitted at the exact resolution point (game.js handleOmnitrixSwitch →
// selectAlienSlot). Proves a specific combo ALWAYS selects the same specific alien — no randomizer.
// Uses a loadout of 3 DISTINCT aliens so any random/cycle drift would be visible immediately.
// Run ALONE.  Requires the TEMP __BEN_SLOT_LOG instrumentation in game.js.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const slotLog = [];
page.on("console", m => { const t = m.text(); if (t.startsWith("[BEN-SLOT]")) slotLog.push(t); });

const st = () => page.evaluate(() => window.__harness.state());
const form = () => page.evaluate(() => window.__harness.benCmd("p1").form);
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { timeout: 20000, polling: 16 }); }
const DIR = { down: "s", left: "a", right: "d" };   // p1 controls: down=s, left=a, right=d ; charge=p
async function combo(dirKey) {
  await wf(52);   // clear SWITCH_COOLDOWN (45f)
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.keyboard.down("p"); await wf(1);
  await page.keyboard.down(dirKey); await wf(2); await page.keyboard.up(dirKey);
  await page.keyboard.up("p"); await wf(3);
  return form();
}

let pass = 0, fail = 0;
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

try {
  await page.goto(`${base}/index.html?harness=1&p1=ben10&p2=ben10`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 }); await page.mouse.click(640, 360);
  await page.evaluate(() => { globalThis.__BEN_SLOT_LOG = true; window.__harness.boot(); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});

  const L = await page.evaluate(() => window.__harness.benLoadout(["xlr8", "diamondhead", "feedback"]));
  const slots = L.aliens || [];
  const EXPECT = { down: slots[0], left: slots[1], right: slots[2] };   // slot0=↓ slot1=← slot2=→
  console.log(`Loadout (slot order): [${slots.join(", ")}]`);
  console.log(`Expected mapping:  CHARGE+↓ → ${EXPECT.down} | CHARGE+← → ${EXPECT.left} | CHARGE+→ → ${EXPECT.right}\n`);

  // Press EACH combo individually, REPS times each, from a neutral reset between — log every result.
  const REPS = 4;
  const results = { down: [], left: [], right: [] };
  for (const dir of ["down", "left", "right"]) {
    for (let i = 0; i < REPS; i++) {
      // enter from a DIFFERENT alien first so each press is a genuine switch, not a no-op
      await combo(DIR[dir === "down" ? "right" : "down"]);
      const got = await combo(DIR[dir]);
      results[dir].push(got);
    }
    const uniq = [...new Set(results[dir])];
    console.log(`CHARGE+${dir.padEnd(5)} ×${REPS} → [${results[dir].join(", ")}]`);
    check(`CHARGE+${dir} ALWAYS selects ${EXPECT[dir]} (${REPS}/${REPS}, no drift)`, uniq.length === 1 && uniq[0] === EXPECT[dir], `distinct=[${uniq.join(",")}]`);
  }

  // Interleaved sequence — proves no order-dependent state drift / stale randomizer between combos.
  console.log("\n── Interleaved sequence (down,left,right,left,down,right) ──");
  const seq = ["down", "left", "right", "left", "down", "right"];
  let seqOk = true;
  for (const dir of seq) { const got = await combo(DIR[dir]); const ok = got === EXPECT[dir]; if (!ok) seqOk = false; console.log(`  CHARGE+${dir.padEnd(5)} → ${got}  ${ok ? "✓" : "✗ EXPECTED " + EXPECT[dir]}`); }
  check("interleaved presses each hit their own slot alien (no cross-combo drift)", seqOk);

  console.log(`\n── Instrumentation log captured at the resolution point (game.js:selectAlienSlot call) ──`);
  slotLog.forEach(l => console.log("  " + l));
  check("resolution-point log shows omnitrix.index === pressed slot i on every fire (deterministic)",
    slotLog.length > 0 && slotLog.every(l => { const m = l.match(/slot i=(\d+) → omnitrix\.index=(\d+)/); return m && m[1] === m[2]; }),
    `${slotLog.length} fires logged`);
} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n════════ BEN SLOT-LOG: ${pass} passed, ${fail} failed ════════`);
  process.exit(fail ? 1 : 0);
}
