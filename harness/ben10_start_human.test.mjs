// harness/ben10_start_human.test.mjs
// Loadout simplification pass, STAGE 2 — a match STARTS with Ben/Albedo in HUMAN form (not pre-
// transformed into loadout slot 1), with the advertised human stats (maxHealth 1250, not XLR8's 900),
// human normals + Hoverboard special work, and the CHARGE+direction transform still engages an alien.
import { chromium } from "playwright"; import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0;
const section = t => console.log(`\n── ${t} ──`);
const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--autoplay-policy=no-user-gesture-required"] });

async function verify(charKey) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const jsErr = []; page.on("pageerror", e => jsErr.push(String(e)));
  const p1 = () => page.evaluate(() => window.__harness.p1());
  const cmd = () => page.evaluate(() => window.__harness.benCmd("p1"));
  const st = () => page.evaluate(() => window.__harness.state());
  async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { timeout: 20000, polling: 16 }); }

  section(`${charKey.toUpperCase()} — starts HUMAN`);
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}&p2=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.spriteReady; }, null, { timeout: 15000, polling: 32 }).catch(() => {});
  await wf(3);

  // (1) Match-start state — read straight off the real boot path (no loadout rebuild yet).
  const s0 = await p1(); const c0 = await cmd();
  check("starts NOT transformed", s0.transformed === false, `transformed=${s0.transformed}`);
  check("activeAlien is null (human)", s0.activeAlien === null, `activeAlien=${s0.activeAlien}`);
  check("benCmd form = 'human'", c0.form === "human", `form=${c0.form}`);
  check("maxHealth = advertised 1250 (NOT XLR8's 900)", s0.maxHealth === 1250, `maxHealth=${s0.maxHealth}`);
  check("health is full at human maxHealth", s0.health === s0.maxHealth, `health=${s0.health}/${s0.maxHealth}`);

  // (2) Human normals fire while human.
  await page.keyboard.down("j"); await wf(2);
  const cAtk = await cmd();
  await page.keyboard.up("j"); await wf(10);
  check("human LIGHT normal fires (still human)", !!cAtk.attacking && cAtk.form === "human", `attacking=${cAtk.attacking} form=${cAtk.form}`);

  // (3) Human Hoverboard special fires while human (routes via executeBen10Special, activeAlien===null).
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await wf(14);
  await page.keyboard.down("l"); await wf(3);
  const cHov = await cmd();
  await page.keyboard.up("l"); await wf(10);
  check("human SPECIAL (Hoverboard) fires + stays human", (!!cHov.attacking || !!cHov.move) && cHov.form === "human", `move=${cHov.move} attacking=${cHov.attacking} form=${cHov.form}`);

  // (4) Set a known loadout, then CHARGE+Down must transform into slot 1 (xlr8) — mechanic unchanged.
  const L = await page.evaluate(() => window.__harness.benLoadout(["xlr8", "diamondhead", "feedback"]));
  check("loadout rebuilt (still starts human after rebuild)", (await cmd()).form === "human", `slots=${(L.aliens || []).join(",")}`);
  await wf(52);
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.keyboard.down("p"); await wf(1);
  await page.keyboard.down("s"); await wf(2); await page.keyboard.up("s");
  await page.keyboard.up("p"); await wf(3);
  const cT = await cmd(); const sT = await p1();
  check("CHARGE+Down transforms into slot 1 (xlr8)", cT.form === "xlr8" && sT.transformed === true, `form=${cT.form} transformed=${sT.transformed}`);

  check("no JS errors", jsErr.length === 0, jsErr.slice(0, 2).join(" | "));
  await page.close();
}

try {
  await verify("ben10");
  await verify("albedo");
} catch (e) { console.log("FATAL", e); fail++; }
finally {
  await browser.close(); server.close();
  console.log(`\n  BEN10/ALBEDO START-HUMAN: ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
