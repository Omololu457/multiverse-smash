// harness/morpher_callin.test.mjs — STAGE 4 canonical test for the Power Rangers "Morpher Call-In" team
// special. Covers: (1) dynamic exclude-self partner-selection logic, (2) call-in activation for multiple
// partner combinations each firing THAT partner's own real Ultimate, (3) the data-driven roster scaling
// with a mock 4th Ranger, (4) the Special+Ultimate combo input, (5) guards (non-Ranger / cooldown).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arrEq = (a, b) => a.length === b.length && a.every(x => b.includes(x)) && b.every(x => a.includes(x));

async function boot(p1 = "omega_ranger", p2 = "gojo") {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(150);
}
// Fire a call-in (direct) and run it to resolution; returns { fired, cinematic, ultFired, dmg }.
async function callIn(char, partner) {
  await boot(char, "gojo");
  const hp0 = await page.evaluate(() => window.__harness.p2().health);
  await page.evaluate(p => window.__harness.setCallInPartner(p, "p1"), partner);
  const fired = await page.evaluate(() => window.__harness.fireCallIn("p1"));
  let cinematic = false, ultFired = false;
  for (let i = 0; i < 90; i++) {                    // up to ~4.5s: dash-in + (cinematic|live) + vanish
    const st = await page.evaluate(() => window.__harness.callInStatus());
    if (st.cinematic) cinematic = true;
    if (st.ultFired) ultFired = true;
    if (!st.active) break;
    await sleep(50);
  }
  const hp1 = await page.evaluate(() => window.__harness.p2().health);
  return { fired, cinematic, ultFired, dmg: Math.round(hp0 - hp1) };
}

console.log("\n── 1. Partner-selection logic (dynamic, exclude-self) ──");
await boot("omega_ranger");
const rOmega = await page.evaluate(() => window.__harness.callInRoster("omega_ranger"));
const rRed   = await page.evaluate(() => window.__harness.callInRoster("samurai_red_ranger"));
const rGold  = await page.evaluate(() => window.__harness.callInRoster("gold_samurai_ranger"));
check("as Omega → partners = [Red, Gold] (self excluded)", arrEq(rOmega, ["samurai_red_ranger", "gold_samurai_ranger"]), rOmega.join(","));
check("as Red → partners = [Omega, Gold] (self excluded)", arrEq(rRed, ["omega_ranger", "gold_samurai_ranger"]), rRed.join(","));
check("as Gold → partners = [Omega, Red] (self excluded)", arrEq(rGold, ["omega_ranger", "samurai_red_ranger"]), rGold.join(","));
check("no roster ever contains the current character", !rOmega.includes("omega_ranger") && !rRed.includes("samurai_red_ranger") && !rGold.includes("gold_samurai_ranger"));

console.log("\n── 2. Call-in activation — each partner performs THEIR OWN real Ultimate ──");
// Call-in deploys each partner's REAL ult at the default CALLIN_DAMAGE_MULT (0.55): Gold/Red base 340 →
// ~187, Omega 240×0.60=144 → ~79. Damage differs by partner = proof it's the real per-char ult.
const cg = await callIn("omega_ranger", "gold_samurai_ranger");
check("Omega calls Gold → fires Gold's Light Finale (freeze cinematic)", cg.fired && cg.ultFired && cg.cinematic, `dmg=${cg.dmg}`);
check("  → deals Gold's scaled ULT damage (~187 = 340×0.55)", cg.dmg >= 178 && cg.dmg <= 196, `dmg=${cg.dmg}`);
const ro = await callIn("samurai_red_ranger", "omega_ranger");
check("Red calls Omega → fires Omega's Final Strike (live hitbox, NOT a cinematic)", ro.fired && ro.ultFired && !ro.cinematic, `dmg=${ro.dmg}`);
check("  → deals Omega's scaled ULT damage (~79 = 144×0.55)", ro.dmg >= 70 && ro.dmg <= 88, `dmg=${ro.dmg}`);
const gr = await callIn("gold_samurai_ranger", "samurai_red_ranger");
check("Gold calls Red → fires Red's Fire Smasher (freeze cinematic)", gr.fired && gr.ultFired && gr.cinematic, `dmg=${gr.dmg}`);
check("  → deals Red's scaled ULT damage (~187 = 340×0.55)", gr.dmg >= 178 && gr.dmg <= 196, `dmg=${gr.dmg}`);
check("call-in ultimates differ by partner (Gold/Red 187 vs Omega 79) — not a generic sequence", cg.dmg !== ro.dmg && Math.abs(cg.dmg - gr.dmg) < 20);

console.log("\n── 3. Data-driven scaling — a future Ranger auto-joins the pool ──");
await boot("omega_ranger");
const before = await page.evaluate(() => window.__harness.callInRoster("omega_ranger"));
const withMock = await page.evaluate(() => window.__harness.registerMockRanger("mock_ranger", "gold_samurai_ranger"));
const mockSelf = await page.evaluate(() => window.__harness.callInRoster("mock_ranger"));
const after = await page.evaluate(() => window.__harness.unregisterMockRanger("mock_ranger"));
check("mock Ranger absent before registration", !before.includes("mock_ranger"), before.join(","));
check("mock Ranger AUTO-appears in the partner list (no code change)", withMock.includes("mock_ranger"), withMock.join(","));
check("exclude-self applies to the mock too (absent from its own list)", !mockSelf.includes("mock_ranger"), mockSelf.join(","));
check("unregister removes it cleanly", !after.includes("mock_ranger"), after.join(","));

console.log("\n── 4. Input: SPECIAL + ULTIMATE combo ──");
await boot("gold_samurai_ranger");
await page.evaluate(() => window.__harness.setCallInPartner("omega_ranger", "p1"));
await page.keyboard.down("u"); await page.keyboard.down("l"); await sleep(80); await page.keyboard.up("l"); await page.keyboard.up("u");
await sleep(120);
const comboSt = await page.evaluate(() => window.__harness.callInStatus());
check("Special+Ultimate together starts the call-in", comboSt.active && comboSt.partner === "omega_ranger", `phase=${comboSt.phase}`);

console.log("\n── 5. Guards ──");
await boot("gojo", "omega_ranger");   // non-Ranger caster
const nonRanger = await page.evaluate(() => window.__harness.fireCallIn("p1"));
check("non-Ranger cannot call in", nonRanger === false);
await boot("omega_ranger");
await page.evaluate(() => window.__harness.setCallInPartner("gold_samurai_ranger", "p1"));
const first = await page.evaluate(() => window.__harness.fireCallIn("p1"));
const second = await page.evaluate(() => window.__harness.fireCallIn("p1"));   // one already active / on cooldown
check("cannot start a second call-in while one is active", first === true && second === false);

check("no JS page errors", jsErrors.length === 0, jsErrors[0] || "");
console.log(`\n${fail === 0 ? "✅" : "❌"} MORPHER CALL-IN: ${pass} passed, ${fail} failed`);
await browser.close(); server.close();
process.exit(fail === 0 ? 0 : 1);
