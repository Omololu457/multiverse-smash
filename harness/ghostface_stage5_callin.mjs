// harness/ghostface_stage5_callin.mjs — STAGE 5: the Call-In companion special + the 5 skin-gated pools.
// Verifies: (1) each identity's pool = exactly its 4 confirmed companions, (2) each identity pulls ONLY
// from its own pool (out-of-pool selection is rejected), (3) firing the Call-In (Neutral+Special) summons
// an in-pool companion + deals damage + costs Dread + sets a cooldown, (4) Roman's identity halves the
// cost AND the cooldown.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `ghostface_s5_${name}.png`) }); }
const arrEq = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(x => b.includes(x)) && b.every(x => a.includes(x));
const setSkin = s => page.evaluate(x => window.__harness.setSkin("p1", x), s);
const pool = () => page.evaluate(() => window.__harness.callInPool("p1"));

const EXPECT = {
  ghostfaceBilly:  ["sasuke", "itachi", "chrollo", "killua"],
  ghostfaceDebbie: ["beerus", "netero", "maki", "omniman"],
  ghostfaceRoman:  ["rick", "tobirama", "gojo", "hisoka"],
  ghostfaceJill:   ["sukuna", "goku_black", "gold_samurai_ranger", "vegeta"],
  ghostfaceAmber:  ["shinobu", "gon", "naruto", "zenitsu"],
};

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await wf(20);

// ── 1. Each identity's pool = exactly its 4 confirmed companions ──
console.log("\n── 1. Pool per identity (exact 4) ──");
const allSeen = [];
for (const [skin, exp] of Object.entries(EXPECT)) {
  await setSkin(skin); await wf(2);
  const pl = await pool();
  allSeen.push(...pl);
  check(`${skin} → [${exp.join(", ")}]`, arrEq(pl, exp), `got [${pl.join(", ")}]`);
}
// pools are mutually exclusive (no companion shared across identities)
check("all 5 pools are mutually exclusive (20 distinct companions)", new Set(allSeen).size === 20, `distinct=${new Set(allSeen).size}/20`);

// ── 2. Each identity pulls ONLY from its own pool (out-of-pool rejected) ──
console.log("\n── 2. Selection is pool-gated ──");
await setSkin("ghostfaceBilly"); await wf(2);
const acc = await page.evaluate(() => window.__harness.setCallInPartner("chrollo", "p1"));   // in Billy's pool
check("Billy accepts an in-pool pick (chrollo)", acc === "chrollo", `selected=${acc}`);
const rej = await page.evaluate(() => window.__harness.setCallInPartner("rick", "p1"));       // Roman's pool, NOT Billy's
check("Billy REJECTS an out-of-pool pick (rick) — selection unchanged", rej === "chrollo", `selected=${rej}`);
// switching identity re-defaults the partner to the new pool's first member
await setSkin("ghostfaceAmber"); await wf(2);
const amberDefault = await page.evaluate(() => window.__harness.callInPartner("p1"));
check("switching to Amber re-defaults partner into Amber's pool", EXPECT.ghostfaceAmber.includes(amberDefault), `partner=${amberDefault}`);

// ── 3. Firing the Call-In summons an in-pool companion + damage + cost + cooldown ──
console.log("\n── 3. Call-In fires: summon + damage + cost + cooldown ──");
async function fireCallIn(skin, partner) {
  await page.evaluate(() => { window.__harness.healP1(); window.__harness.healP2(); window.__harness.fillEnergy(); window.__harness.resetCallIn("p1"); });
  await setSkin(skin); await wf(2);
  if (partner) await page.evaluate(p => window.__harness.setCallInPartner(p, "p1"), partner);
  const e0 = (await p1()).energy, h0 = (await p2()).health;
  await page.keyboard.down("l"); await wf(3); await page.keyboard.up("l");   // NEUTRAL Special (no direction) = Call-In
  await wf(3);
  const cd = await page.evaluate(() => window.__harness.callInCd("p1"));
  const e1 = (await p1()).energy;
  await wf(54);                      // let the companion rush in + strike + vanish
  const h1 = (await p2()).health, last = await page.evaluate(() => window.__harness.lastCallInPartner("p1"));
  return { cost: Math.round(e0 - e1), dmg: Math.round(h0 - h1), cd, last };
}
const billyFire = await fireCallIn("ghostfaceBilly", "killua");
check("Call-In summons the selected in-pool companion (killua)", billyFire.last === "killua", `summoned=${billyFire.last}`);
check("Call-In spends Dread energy", billyFire.cost > 0, `cost=${billyFire.cost}`);
check("Call-In deals damage (companion strike lands)", billyFire.dmg > 0, `dmg=${billyFire.dmg}`);
check("Call-In sets a cooldown", billyFire.cd > 0, `cd=${billyFire.cd}`);
check("summoned companion is in Billy's pool", EXPECT.ghostfaceBilly.includes(billyFire.last), `summoned=${billyFire.last}`);
await shot("callin_billy");

// ── 4. Roman halves the cost AND cooldown ──
console.log("\n── 4. Roman modifier: cheaper + faster Call-In ──");
const defFire   = await fireCallIn("default", null);
const romanFire = await fireCallIn("ghostfaceRoman", "gojo");
check("Roman's Call-In costs LESS than default", romanFire.cost < defFire.cost && romanFire.cost > 0, `default=${defFire.cost} · roman=${romanFire.cost}`);
check("Roman's Call-In cooldown is SHORTER than default", romanFire.cd < defFire.cd && romanFire.cd > 0, `default=${defFire.cd} · roman=${romanFire.cd}`);
check("Roman summons from Roman's pool (gojo)", romanFire.last === "gojo" && EXPECT.ghostfaceRoman.includes(romanFire.last), `summoned=${romanFire.last}`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/ghostface_s5_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
