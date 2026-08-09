// harness/ghostface_swap_crewskin.mjs — GAP A: the Companion Swap must apply each companion's
// "joined the killer" _crew AFFILIATION skin for the full swap duration (spec §3), then restore
// Ghostface's own killer skin on revert. For ALL 20 pairings assert, live:
//   • during the swap: recolorTag === "crew" AND a recoloured skin-anim is applied (not the default art),
//   • the fighter really became the companion (rosterKey), and
//   • after auto-revert: Ghostface is back in the SUMMONING killer identity skin (recolorTag restored).
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const gfSwap = () => page.evaluate(() => window.__harness.gfSwap());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

// Companion SWAP now fires via the Backstage Pass SWAP branch: roll the motion (companion pre-pick), then
// hold GRAB while pressing Special. Opponent kept far (a forward motion can't walk into grab range, so the
// held Grab never fires a throw). The BP dash then emerges into the swap.
const MOTION = { s: ["s", "d"], a: ["s", "a"], d: ["s", "a", "d"], w: ["s", "d", "a"] };
async function pressSwapCombo(dirKey) {
  for (const k of MOTION[dirKey]) { await page.keyboard.down(k); await waitFrames(1); await page.keyboard.up(k); await waitFrames(1); }
  await page.keyboard.down("o");                          // Grab = "make this a swap"
  await page.keyboard.down("l"); await waitFrames(1); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("o");
  await waitFrames(18);                                   // let the Backstage Pass dash emerge into the swap
  return await gfSwap();
}
async function resetToGhostface(skin) {
  await page.evaluate(() => window.__harness.expireGfSwap());
  await waitFrames(3);
  await page.evaluate(s => { window.__harness.setSkin("p1", s); window.__harness.fillEnergy(); window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); }, skin);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.key === "ghostface" && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 200); await waitFrames(2);
}

const IDENTITIES = [
  ["ghostfaceBilly",  "billy",  ["sasuke", "itachi", "chrollo", "killua"]],
  ["ghostfaceDebbie", "debbie", ["beerus", "netero", "maki", "omniman"]],
  ["ghostfaceRoman",  "roman",  ["rick", "tobirama", "gojo", "hisoka"]],
  ["ghostfaceJill",   "jill",   ["sukuna", "goku_black", "gold_samurai_ranger", "vegeta"]],
  ["ghostfaceAmber",  "amber",  ["shinobu", "gon", "naruto", "zenitsu"]],
];
const SLOTKEYS = ["s", "a", "d", "w"];

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

for (const [skin, killerTag, pool] of IDENTITIES) {
  console.log(`\n════ ${skin} (${killerTag}) ════`);
  for (let i = 0; i < pool.length; i++) {
    const want = pool[i];
    await resetToGhostface(skin);
    // sanity: Ghostface starts in the killer identity skin (its own recolorTag)
    const g0 = await gfSwap();
    const s = await pressSwapCombo(SLOTKEYS[i]);
    const becameCompanion = s.active && s.rosterKey === want && s.target === want;
    check(`${skin} → ${want}: real swap`, becameCompanion, becameCompanion ? "" : `active=${s.active} roster=${s.rosterKey} target=${s.target}`);
    // GAP A: the companion wears its _crew affiliation skin for the swap's duration
    check(`  ${want}: _crew skin applied (recolorTag=crew + skinAnim present)`, s.recolorTag === "crew" && s.hasSkinAnim === true, `recolorTag=${s.recolorTag} hasSkinAnim=${s.hasSkinAnim}`);
    // AUTO-REVERT restores Ghostface in the summoning killer identity (its own recolorTag, NOT crew)
    await page.evaluate(() => window.__harness.expireGfSwap());
    await waitFrames(4);
    const r = await gfSwap();
    check(`  revert → Ghostface in ${skin} (recolorTag=${killerTag})`, r.active === false && r.rosterKey === "ghostface" && r.recolorTag === killerTag, `active=${r.active} roster=${r.rosterKey} recolorTag=${r.recolorTag}`);
  }
}

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
